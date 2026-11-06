/**
 * The two watchmen, tested as artifacts: `n8n/error-watcher.json` (D206) and `n8n/heartbeat.json` (D205).
 *
 *   node --test integrations/mobilizon-cadence/test/watchers.test.mjs
 *
 * Same rule as `test/workflow.test.mjs`: these do not read the JS sources, they execute the `jsCode` inside the
 * generated files with the same sandbox n8n will use, and they plant counterfactuals into each builder's own
 * checker (`checkAlerter`, `checkHeartbeat`) so the argument is proven to fire, not merely to pass.
 *
 * What is worth the coverage here is what only these two files can catch:
 *   - the watcher recognises cadence's deliberate throw and stays quiet (one message per incident, D194);
 *   - the watcher survives a payload shape it has never seen (a watcher that throws on a surprise failed to
 *     watch - the vendor file flags payload drift between versions as a real risk);
 *   - the heartbeat sends whether or not anything happened, and its hour is written in parameters this
 *     instance actually reads (D207 - the cadence shipped an unread `triggerAt` for its whole life);
 *   - neither artifact can reach a Mobilizon write or hold a credential.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runCodeNode } from "../lib/sandbox.mjs";
import { LOUD_THROW } from "../lib/core.mjs";
import { checkAlerter, ALERTER_NAME, WATCH_NAMES } from "../build-alerter.mjs";
import { checkHeartbeat, HEARTBEAT_NAME, BEAT_NAMES } from "../build-heartbeat.mjs";
import { verifyDocument, HEARTBEAT, WATCHER } from "../verify-import.mjs";

const root = fileURLToPath(new URL(".", import.meta.url)) + "../";
const FIXTURE = JSON.parse(readFileSync(root + "fixtures/group-history-2026-11-04.json", "utf8"));

let watcher, beat;
before(() => {
  for (const b of ["build-alerter.mjs", "build-heartbeat.mjs", "build-workflow.mjs"]) {
    execFileSync(process.execPath, [root + b], { cwd: root, stdio: "pipe" });
  }
  watcher = JSON.parse(readFileSync(root + "n8n/error-watcher.json", "utf8"));
  beat = JSON.parse(readFileSync(root + "n8n/heartbeat.json", "utf8"));
});

const node = (wf, name) => {
  const n = wf.nodes.find((x) => x.name === name);
  assert.ok(n, `no node named ${name} in "${wf.name}". names: ${wf.nodes.map((x) => x.name).join(", ")}`);
  return n;
};
const runCode = (wf, name, itemsByName) => runCodeNode(node(wf, name).parameters.jsCode, itemsByName);
const firstJson = (out) => (Array.isArray(out) ? out : [out])[0]?.json;

// The Error Trigger's own mock payload, read off the node's source (`ErrorTrigger.node.ts`, fetched 2026-11-05):
// pressing Execute Workflow on an error workflow hands it exactly this. Two consequences, both recorded in
// D206: a manual run DOES give a testable payload (correcting the line the runbook carried), and the real
// payload is this shape - so a test written against anything else is testing a fiction.
const errorPayload = (over = {}) => ({
  execution: {
    id: "231", url: "https://n8n.labradorius.com/workflow/7/executions/231", retryOf: "230",
    error: { message: "Example Error Message", stack: "Stacktrace", timestamp: 1762300000000, description: " Mobilizon answered 502" },
    lastNodeExecuted: "02 Read the series history", mode: "trigger",
  },
  workflow: { id: "7", name: "Mobilizon cadence - keep the next meeting scheduled" },
  ...over,
});

// ------------------------------------------------------------------ the error watcher

test("the watcher is one Error Trigger, one gate, one send - and it is not watching itself", () => {
  assert.equal(watcher.name, ALERTER_NAME);
  assert.deepEqual(watcher.nodes.map((n) => n.name),
    [WATCH_NAMES.trigger, WATCH_NAMES.compose, WATCH_NAMES.tell, WATCH_NAMES.notify]);
  assert.equal(node(watcher, WATCH_NAMES.trigger).type, "n8n-nodes-base.errorTrigger");
  // The false branch of the gate must be empty: a suppressed duplicate reaches nothing.
  const falsy = (watcher.connections[WATCH_NAMES.tell]?.main ?? [])[1] ?? [];
  assert.equal(falsy.filter(Boolean).length, 0, "the gate's false branch is wired, so a suppressed duplicate would still send");
  // Only the alert server, and never the monitored host.
  const urls = watcher.nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest").map((n) => n.parameters.url);
  assert.deepEqual(urls, ["https://ntfy.labradorius.com/"]);
  assert.ok(!JSON.stringify(watcher).includes("mobilizon.labradorius.com"), "the watcher carries the monitored instance's host - it could be taken down by the thing it watches");
  assert.ok(!watcher.settings.errorWorkflow, "the watcher points at an error workflow: n8n does not re-trigger on an error workflow's own failure, so this is silence");
  assert.deepEqual(checkAlerter(watcher), [], "the shipped watcher must satisfy its own build invariants");
});

test("the watcher turns a real failure payload into one high-priority message with both links", () => {
  const out = firstJson(runCode(watcher, WATCH_NAMES.compose, { [WATCH_NAMES.trigger]: [{ json: errorPayload() }] }));
  assert.equal(out.duplicate, false);
  assert.equal(out.notifyNeeded, true);
  assert.equal(out.alertTitle, `${errorPayload().workflow.name} failed at ${errorPayload().execution.lastNodeExecuted}`);
  assert.match(out.alertDetail, /open it\s+https:\/\/n8n\.labradorius\.com\/workflow\/7\/executions\/231/);
  assert.match(out.alertDetail, /execution  231 \(retry of 230\)/);
  assert.match(out.alertDetail, /at\s+20\d\d-\d\d-\d\dT/);
  // The ntfy body: high priority, warning tag, and tapping it opens the failed run rather than the site.
  assert.equal(out.ntfy.priority, 4);
  assert.deepEqual(out.ntfy.tags, ["warning"]);
  assert.equal(out.ntfy.click, errorPayload().execution.url);
  assert.equal(out.ntfy.topic, "mathloco-cadence");
});

test("cadence's deliberate throw is recognised, composed, and NOT sent twice (D194/D206)", () => {
  const payload = errorPayload({
    execution: { ...errorPayload().execution, error: { message: `${LOUD_THROW}. The alert was sent; the run is kept red on purpose (24 Fail loudly).\n08 Report: whatever` } },
  });
  const out = firstJson(runCode(watcher, WATCH_NAMES.compose, { [WATCH_NAMES.trigger]: [{ json: payload }] }));
  assert.equal(out.duplicate, true);
  assert.equal(out.notifyNeeded, false, "cadence already delivered this incident's alert from 23 - a second message for one incident is what makes a channel unread");
  assert.ok(out.suppressedWhy, "the suppression has to be stated in the log, so 'the watcher ran and chose not to speak' is readable after the fact");
  assert.ok(out.ntfy, "the composition is still produced, only the send is withheld");
});

test("a payload shape it has never seen produces a message, not a second failure", () => {
  for (const weird of [{}, null, { execution: null }, { execution: { error: {} } }, { workflow: { name: "x" } }]) {
    const out = firstJson(runCode(watcher, WATCH_NAMES.compose, { [WATCH_NAMES.trigger]: [{ json: weird ?? {} }] }));
    assert.ok(out.alertTitle && out.alertDetail, `the watcher must always compose something, failed on ${JSON.stringify(weird)}`);
    assert.equal(out.duplicate, false);
  }
});

test("checkAlerter catches the shapes that make a watcher decorative", () => {
  const clone = () => structuredClone(watcher);
  const cases = [
    ["no Error Trigger", (w) => { w.nodes = w.nodes.filter((n) => n.name !== WATCH_NAMES.trigger); }],
    ["a schedule trigger too", (w) => { w.nodes.push({ id: "x", name: "A9 Cron", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1, parameters: {} }); }],
    ["the send points at the monitored host", (w) => { node(w, WATCH_NAMES.notify).parameters.url = "https://mobilizon.labradorius.com/api/v1"; }],
    ["the token is a literal", (w) => { node(w, WATCH_NAMES.notify).parameters.options.headers.find((h) => h.name === "Authorization").value = "Bearer tk_abcdefghij123456"; }],
    ["a credential block attached", (w) => { node(w, WATCH_NAMES.notify).credentials = { httpHeaderAuth: { id: "1", name: "ntfy" } }; }],
    ["an onError with nothing wired", (w) => { node(w, WATCH_NAMES.notify).onError = "continueErrorOutput"; }],
    ["settings.errorWorkflow set", (w) => { w.settings.errorWorkflow = "some-id"; }],
    ["retention left to the instance default", (w) => { w.settings.saveDataSuccessExecution = "none"; }],
    ["the gate compares something else", (w) => { node(w, WATCH_NAMES.tell).parameters.conditions.conditions[0].rightValue = "false"; }],
    ["the composer lost the duplicate rule", (w) => { node(w, WATCH_NAMES.compose).parameters.jsCode = node(w, WATCH_NAMES.compose).parameters.jsCode.replace("const notifyNeeded = channelReady && !f.duplicate;", "const notifyNeeded = channelReady;"); }],
    ["the composer's channel literal is stale", (w) => { node(w, WATCH_NAMES.compose).parameters.jsCode = node(w, WATCH_NAMES.compose).parameters.jsCode.replace("ntfy.labradorius.com", "other.example.com"); }],
  ];
  for (const [label, mutate] of cases) {
    const w = clone(); mutate(w);
    const found = checkAlerter(w);
    assert.ok(found.length, `checkAlerter missed: ${label}`);
  }
  // And the shipped document is the only one that passes - otherwise the plantings are the only real tests.
  assert.deepEqual(checkAlerter(clone()), []);
});

// ----------------------------------------------------------------------- the heartbeat

test("the heartbeat is weekly, unconditional, public-read, and holds no credential", () => {
  assert.equal(beat.name, HEARTBEAT_NAME);
  assert.deepEqual(beat.nodes.map((n) => n.name),
    [BEAT_NAMES.trigger, BEAT_NAMES.cfg, BEAT_NAMES.read, BEAT_NAMES.note, BEAT_NAMES.notify]);
  const iv = (node(beat, BEAT_NAMES.trigger).parameters.rule.interval ?? [])[0] ?? {};
  assert.equal(iv.field, "weeks");
  assert.ok(!Object.prototype.hasOwnProperty.call(iv, "triggerAt"), "an unread triggerAt means the note arrives at midnight while the document claims 09:00 (D207)");
  assert.deepEqual(iv.triggerAtDay, [1], "Monday");
  assert.equal(iv.triggerAtHour, 9);
  assert.equal(beat.settings.timezone, "America/Chicago");
  // No gate, no error handling: the send is unconditional, and a failure stays red for the watcher to catch.
  assert.equal(beat.nodes.filter((n) => n.type.endsWith(".if")).length, 0);
  assert.ok(!beat.nodes.some((n) => n.onError !== undefined), "a heartbeat that swallows an error is how a dead scheduler starts looking alive");
  // The read carries no Authorization header; the send reads the token from $env by name.
  const readHeaders = node(beat, BEAT_NAMES.read).parameters.options.headers.map((h) => h.name);
  assert.ok(!readHeaders.some((h) => /authorization/i.test(h)), "the heartbeat's calendar read is authenticated - it should not need the password");
  assert.ok(JSON.stringify(node(beat, BEAT_NAMES.notify).parameters).includes("$env.NTFY_TOKEN"));
  assert.ok(!JSON.stringify(beat.nodes.map((n) => n.parameters.options?.headers ?? {})).includes("MOBILIZON_"), "some request in the heartbeat sends the Mobilizon password");
  assert.deepEqual(checkHeartbeat(beat), [], "the shipped heartbeat must satisfy its own build invariants");
});

test("the heartbeat reports the rows that exist, and says it is the proof of life", () => {
  const cfg = firstJson(runCode(beat, BEAT_NAMES.cfg));
  // Pin the clock. H1 stamps `runAt: now.toISOString()`, so an unpinned case asserts against the wall clock:
  // this one went red on its own at 05:00Z on 2026-11-06 (00:00 America/Chicago) because `daysOut` for the
  // fixture's Nov 7 row is 2 only while the run day is Nov 5 (D192 names exactly this - a planted date that
  // stops sitting on the side of today its case assumes; D226 records the day it fired). 15:00Z is 09:00 in
  // the heartbeat's own zone and hour.
  cfg.runAt = "2026-11-05T15:00:00Z";
  const seeded = { [BEAT_NAMES.cfg]: [{ json: cfg }], [BEAT_NAMES.read]: [{ json: { data: { group: FIXTURE.data.group } } }] };
  assert.ok(cfg.query.readSeriesHistoryVars.preferredUsername, "H1 is the source node: it exports the calendar read's document and vars, and nothing else");
  assert.equal(Object.keys(cfg).sort().join(","), "ALERT,HEARTBEAT,SERIES,groupActor,query,runAt", "H1 exporting a write document is how a read-only workflow stops being read-only");
  const out = firstJson(runCode(beat, BEAT_NAMES.note, seeded));
  assert.equal(out.kind, "heartbeat", "with two rows ahead of 2026-11-05 the note is quiet: priority 2, drawer only");
  assert.equal(out.ntfy.priority, 2);
  assert.equal(out.rows.length, 2);
  const social = out.rows.find((r) => r.series === "mpls-social");
  assert.equal(social.nextDate, "2026-11-07");
  assert.equal(social.daysOut, 2);
  assert.match(out.summary, /proof of life/);
  assert.ok(!JSON.stringify(out).includes('"action"'), "the heartbeat must not carry plan-shaped decisions - that would be a second planner (it reports rows, not intentions)");
});

test("an empty calendar makes the weekly note loud, in the same words as A8's runway rule", () => {
  const cfg = firstJson(runCode(beat, BEAT_NAMES.cfg));
  // Six weeks past the fixture's newest row: nothing upcoming at all.
  cfg.runAt = "2026-12-20T14:00:00Z";
  const out = firstJson(runCode(beat, BEAT_NAMES.note, {
    [BEAT_NAMES.cfg]: [{ json: cfg }],
    [BEAT_NAMES.read]: [{ json: { data: { group: FIXTURE.data.group } } }],
  }));
  assert.equal(out.kind, "problem");
  assert.equal(out.ntfy.priority, 4, "no upcoming row is the failure the heartbeat exists to notice early");
  assert.deepEqual(out.empty.sort(), ["mpls-social", "parallel-learning"]);
  assert.match(out.summary, /NOTHING scheduled after/);
  assert.match(out.alertTitle, /NO UPCOMING ROW/);
});

test("the heartbeat's read is unwrapped, not trusted (a GraphQL error is HTTP 200 here)", () => {
  const cfg = firstJson(runCode(beat, BEAT_NAMES.cfg));
  assert.throws(
    () => runCode(beat, BEAT_NAMES.note, {
      [BEAT_NAMES.cfg]: [{ json: cfg }],
      [BEAT_NAMES.read]: [{ json: { errors: [{ message: "unauthenticated" }] } }],
    }),
    /unauthenticated/,
    "a GraphQL error arriving as a 200 must end the run red, so the watcher is told about a dead read",
  );
});

test("checkHeartbeat catches the shapes that make a heartbeat decorative", () => {
  const clone = () => structuredClone(beat);
  const cases = [
    ["the unread triggerAt parameter, i.e. midnight", (w) => { (node(w, BEAT_NAMES.trigger).parameters.rule.interval ?? [])[0].triggerAt = "09:00"; }],
    ["the hour moved out from under the config", (w) => { (node(w, BEAT_NAMES.trigger).parameters.rule.interval ?? [])[0].triggerAtHour = 3; }],
    ["a gate that could skip a week", (w) => { w.nodes.push({ id: "x", name: "H9 Tell a person?", type: "n8n-nodes-base.if", typeVersion: 2, parameters: {} }); }],
    ["an onError on the read", (w) => { node(w, BEAT_NAMES.read).onError = "continueErrorOutput"; }],
    ["neverError on the send", (w) => { node(w, BEAT_NAMES.notify).parameters.options.response.response.neverError = true; }],
    ["an Authorization header on the public read", (w) => { node(w, BEAT_NAMES.read).parameters.options.headers.push({ name: "Authorization", value: "={{ 'Bearer ' + 'x' }}" }); }],
    ["a second credential reachable", (w) => { node(w, BEAT_NAMES.notify).parameters.options.headers.push({ name: "x", value: "={{ $env.MOBILIZON_PASSWORD }}" }); }],
    ["the config node exposes a write document", (w) => { node(w, BEAT_NAMES.cfg).parameters.jsCode += " createEvent: 1,"; }],
    ["the composer re-plans instead of reporting", (w) => { node(w, BEAT_NAMES.note).parameters.jsCode += "\nplanSeries({ series: [], config: null });"; }],
    ["retention left to the packaged default", (w) => { w.settings.saveManualExecutions = false; }],
    ["an error-workflow id baked into the generated bytes", (w) => { w.settings.errorWorkflow = "x"; }],
  ];
  for (const [label, mutate] of cases) {
    const w = clone(); mutate(w);
    assert.ok(checkHeartbeat(w).length, `checkHeartbeat missed: ${label}`);
  }
  assert.deepEqual(checkHeartbeat(clone()), []);
});

/**
 * The same document, asked as two different questions.
 *
 * `checkHeartbeat` was written for the bytes a builder emits, and one of its invariants is provenance: no
 * generated artifact may carry an error-workflow id, because the id belongs to whichever instance the file lands
 * on (D207). A live verify reuses that checker for every other invariant - read-only, unconditional, no second
 * planner - and on 2026-11-05 that reuse produced a false fatal on the instance minutes after `link heartbeat
 * watcher` succeeded: the linked heartbeat is exactly what D206 asks for, reported as "NOT the reviewed
 * artifact". So the provenance rule is scoped to the builder, and a live copy is provenance-checked by the
 * fingerprint next door instead.
 */
test("a linked heartbeat passes its own invariants live, and the same bytes still fail as an artifact", () => {
  const linked = structuredClone(beat);
  linked.settings.errorWorkflow = "dTvHkp7CmEyVNxgf";                 // what `n8n-api.mjs link` writes on the instance
  assert.ok(checkHeartbeat(linked).length, "the builder must still refuse to generate an artifact carrying an id");
  assert.deepEqual(
    checkHeartbeat(linked, { live: true }),
    [],
    "a live copy with a link is not a broken heartbeat - refusing it would argue with D206",
  );
});

test("verifyDocument reads a linked live heartbeat as the reviewed artifact, not a fatal", () => {
  const linked = structuredClone(beat);
  linked.settings.errorWorkflow = "dTvHkp7CmEyVNxgf";
  const v = verifyDocument(linked, HEARTBEAT, { errorWorkflowName: WATCHER.name, errorWorkflowLookedUp: true });
  const bad = v.findings.filter((f) => f.sev === "fatal" || f.sev === "drift" || f.sev === "warn");
  assert.deepEqual(bad, [], JSON.stringify(bad, null, 1));
  assert.ok(v.findings.some((f) => f.sev === "note" && f.where === "settings.errorWorkflow"), "the link is still said out loud, as a note");
});
