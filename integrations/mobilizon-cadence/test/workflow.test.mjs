/**
 * The generated artifact, tested as an artifact.
 *
 *   node --test integrations/mobilizon-cadence/test/*.test.mjs
 *
 * These tests do not read the JS source files - they read `n8n/cadence-workflow.json` and *execute the Code
 * nodes' `jsCode` exactly as n8n will*, with a fake `$()`. That proves the thing a review of `lib/` and
 * `nodes/` cannot: that the text which lands inside the importable file is the text that behaves. If a
 * here-string in the build mangles a template literal, or an injection goes missing, a unit test on
 * `lib/core.mjs` still passes and this one does not.
 *
 * It is also where the safety invariants live: no credential baked in, no URL outside the one host, no node
 * that can swallow an error, and a dry run that cannot reach the write.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { runCodeNode } from "../lib/sandbox.mjs";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url)) + "../";
const wfPath = root + "n8n/cadence-workflow.json";

let wf;
before(() => {
  // Build from source first, so the artifact under test is always the current one.
  execFileSync(process.execPath, [root + "build-workflow.mjs"], { cwd: root, stdio: "pipe" });
  wf = JSON.parse(readFileSync(wfPath, "utf8"));
});

const node = (name) => {
  const n = wf.nodes.find((x) => x.name === name);
  assert.ok(n, `no node named ${name}. names: ${wf.nodes.map((x) => x.name).join(", ")}`);
  return n;
};
const codeOf = (name) => {
  const n = node(name);
  assert.match(n.type, /^n8n-nodes-base\.code/, `${name} is not a Code node`);
  assert.ok(n.parameters.jsCode, `${name} has no jsCode - the injection did not happen`);
  return n.parameters.jsCode;
};

/** Run a Code node's body. The harness itself lives in `lib/sandbox.mjs`, because two callers must agree on
 *  it: this file (the generated artifact) and `verify-import.mjs` (a workflow exported back out of n8n). A
 *  harness bug cannot make both of them agree if there is only one harness. */
const runCode = (name, itemsByName) => runCodeNode(codeOf(name), itemsByName);

const FIXTURE = JSON.parse(readFileSync(root + "fixtures/group-history-2026-11-04.json", "utf8"));
const historyItem = () => [{ json: { data: { group: FIXTURE.data.group } } }];
// The shape node 03 really emits: Mobilizon's own response envelope. `accessToken`, not `sessionToken` -
// measured against 5.2.4 on 2026-11-04 (`login(email,password) -> { accessToken refreshToken user }`).
const signInItem = () => [{
  json: { data: { login: { accessToken: "session-token-not-a-real-one", user: { id: "1", actors: [{ id: "3", preferredUsername: "chexxor", domain: null }] } } } },
}];
const configItems = () => { const out = runCode("01 Config"); return Array.isArray(out) ? out : [out] };
const plansFrom = () => runCode("04 Plan & decide", {
  "01 Config": configItems(),
  "02 Read the series history": historyItem(),
  "03 Sign in": signInItem(),
});

// ------------------------------------------------------------------- shape

test("the workflow is one linear chain of the expected nodes", () => {
  assert.deepEqual(wf.nodes.map((n) => n.name), [
    "Trigger every morning", "01 Config", "02 Read the series history", "03 Sign in",
    "04 Plan & decide", "05 Stop if nothing to write", "06 Create event", "07 Audit the date",
    "08 Report", "21 Report error path", "22 Report a problem", "09 Tell a person?", "23 Notify on ntfy",
    "24 Fail loudly",
  ]);
  // The delivery chain, named: every reporter has somewhere to go, and the delivery node is the end of a path.
  assert.deepEqual((wf.connections["21 Report error path"].main[0] ?? []).map((c) => c.node), ["23 Notify on ntfy"],
    "a stage that threw must reach the delivery node without passing a condition that could drop it");
  assert.deepEqual((wf.connections["22 Report a problem"].main[0] ?? []).map((c) => c.node), ["09 Tell a person?"]);
  assert.deepEqual((wf.connections["09 Tell a person?"].main[0] ?? []).map((c) => c.node), ["23 Notify on ntfy"]);
  assert.deepEqual((wf.connections["23 Notify on ntfy"].main[0] ?? []).map((c) => c.node), ["24 Fail loudly"],
    "the delivery is never the end of a path: a failure n8n considers handled is not recorded as a failure, so the red execution has to be re-declared (nodes/24-fail-loudly.js)");
  assert.equal((wf.connections["24 Fail loudly"]?.main ?? []).flat().filter(Boolean).length, 0,
    "24 is terminal; wiring it back into a reporter would let a failed send produce a second, false alert");
  assert.equal(wf.connections["24 Fail loudly"]?.error, undefined,
    "24's throw is deliberately unwired - it is the one failure a future workflow-level error workflow can still catch");
  assert.equal(wf.settings.executionOrder, "v1");
  assert.equal(wf.settings.timezone, "America/Chicago", "the trigger's 09:00 has to mean the club's hour");
  // Retention is not decoration: the YunoHost package ships save-on-success=none and manual=false, and the
  // workflow's own settings are the only thing that overrides them per-workflow (measured A/B on the live
  // instance 2026-11-05, D201). Without these, a dry run returns an execution id and reads back "not found".
  assert.equal(wf.settings.saveManualExecutions, true, "a manual dry run with no stored execution is a dry run nobody read");
  for (const k of ["saveDataErrorExecution", "saveDataSuccessExecution"]) {
    assert.equal(wf.settings[k], "all", `settings.${k} must stay "all" - the run data is the only evidence a dry run produced`);
  }
  assert.equal(wf.settings.errorWorkflow, undefined, "the workflow-level error workflow is parked with a trigger (D195); a dangling id here swallows every alert silently");
  assert.ok(!wf.pinData || Object.keys(wf.pinData).length === 0, "pinned data would make a production run answer from a stale snapshot");
  for (const [from, ports] of Object.entries(wf.connections)) {
    for (const [port, lists] of Object.entries(ports)) {
      for (const list of lists) for (const c of list ?? []) {
        assert.ok(wf.nodes.some((n) => n.name === c.node), `${from} -> ${c.node} names a node that does not exist`);
      }
    }
  }
});

test("every wired error output has its onError property, and retry is only on the idempotent calls", () => {
  // Both halves or neither. The artifact shipped for weeks with the wire and not the property, which is the
  // half n8n needs: without it the slot never fires, the handler is unreachable, and the default stopWorkflow
  // halts the run (vendor n8n-error-handling-official/NODE_ERROR_OUTPUTS.md, read 2026-11-05). D195.
  const wiredError = new Set(Object.entries(wf.connections).filter(([, p]) => (p.error ?? []).flat().filter(Boolean).length).map(([f]) => f));
  const expectWired = [
    "01 Config", "02 Read the series history", "03 Sign in", "04 Plan & decide",
    "05 Stop if nothing to write", "06 Create event", "07 Audit the date", "08 Report",
  ];
  assert.deepEqual([...wiredError].sort(), [...expectWired].sort(), "the set of fallible stages is a decision, not an accident");
  for (const name of expectWired) {
    assert.equal(node(name).onError, "continueErrorOutput", `${name}: a wired error output without onError is an unreachable branch`);
  }
  for (const name of ["Trigger every morning", "09 Tell a person?", "21 Report error path", "22 Report a problem", "23 Notify on ntfy", "24 Fail loudly"]) {
    assert.equal(node(name).onError, undefined, `${name} must not route its own failure anywhere - stated reason in build-workflow.mjs`);
    assert.equal(wiredError.has(name), false, `${name} must not have an error output wired`);
  }
  const retry = wf.nodes.filter((n) => n.retryOnFail === true).map((n) => n.name);
  assert.deepEqual(retry, ["02 Read the series history", "07 Audit the date", "23 Notify on ntfy"],
    "retry is per-node on purpose: 06 has no idempotency key on Mobilizon 5.2.4, so a retried write is a duplicate on the club's calendar; 03 would offer a wrong password to a fail2ban front");
  for (const n of wf.nodes.filter((x) => x.retryOnFail === true)) {
    assert.deepEqual([n.maxTries, n.waitBetweenTries], [3, 5000], `${n.name}: one retry policy in the graph (the vendor's documented defaults)`);
  }
});

test("requests go to exactly two hosts - Mobilizon and the alert server - and only the delivery node may use the second", () => {
  const ALERT = configItems()[0].json.ALERT;
  assert.ok(ALERT, "01 Config does not carry ALERT - the reporters would compose messages nothing can send");
  const http = wf.nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest");
  assert.equal(http.length, 5, "read, sign in, create, audit, notify");
  for (const n of http) {
    assert.equal(n.parameters.sendQuery, false, `${n.name}: a query string is where a token lands in an access log`);
    if (n.name === "23 Notify on ntfy") continue;   // asserted against ALERT below, not against the API host
    assert.equal(new URL(n.parameters.url).origin, "https://mobilizon.labradorius.com", n.name);
    assert.equal(new URL(n.parameters.url).pathname, "/api/v1", `${n.name} points at a path this instance 404s`);
    assert.equal(n.parameters.options.response.response.neverError, false, `${n.name}: swallowing an HTTP error hides a failed write`);
    assert.match(n.parameters.jsonBody, /^=\{\{ JSON\.stringify\(/, `${n.name}: the document must travel on the item, not be retyped here`);
  }
  const notify = node("23 Notify on ntfy");
  assert.equal(notify.parameters.url, ALERT.rootUrl, "the delivery node's endpoint comes from series.config.mjs");
  assert.equal(new URL(notify.parameters.url).host, ALERT.host);
  assert.equal(new URL(notify.parameters.url).pathname, "/", "ntfy takes JSON publishes at the root, not at a topic path");
  assert.match(notify.parameters.jsonBody, /^=\{\{ JSON\.stringify\(\$json\.ntfy\) \}\}$/,
    "the message body is composed by a reasoning node, so the wire holds no rule of its own");
  assert.deepEqual(notify.parameters.options.batching, { enabled: false }, "a send that failed is reported once, not hammered");
  for (const n of http.filter((x) => x.name !== "23 Notify on ntfy")) {
    assert.notEqual(new URL(n.parameters.url).host, ALERT.host, `${n.name} may not call the alert server`);
  }
});

test("three requests carry an Authorization header - the two writes and the alert - and no secret is baked in", () => {
  const json = JSON.stringify(wf.nodes);
  // Mobilizon 5.2.4 takes a session bearer from the login mutation; n8n credential blocks would be a second,
  // untracked auth path.
  assert.deepEqual(wf.nodes.filter((n) => n.credentials && Object.keys(n.credentials).length).map((n) => n.name), []);
  const authed = wf.nodes.filter((n) => (n.parameters.options?.headers ?? []).some((h) => h.name === "Authorization"));
  assert.deepEqual(authed.map((n) => n.name), ["06 Create event", "07 Audit the date", "23 Notify on ntfy"]);
  for (const n of authed.filter((x) => x.name !== "23 Notify on ntfy")) {
    const h = n.parameters.options.headers.find((x) => x.name === "Authorization");
    assert.match(h.value, /^\=\{\{ 'Bearer ' \+\ \$\('03 Sign in'\)\.item\.json\.data\.login\.accessToken \}\}$/, `${n.name} must reuse this run's session token`);
  }
  // The alert token follows the same rule as the password: read from the n8n environment **by name**, so no
  // secret enters this file, the repo, or the config item every node can see (D177, D194).
  const notifyAuth = node("23 Notify on ntfy").parameters.options.headers.find((h) => h.name === "Authorization");
  assert.match(notifyAuth.value, /^=\{\{ 'Bearer ' \+ \$env\.NTFY_TOKEN \}\}$/, "the ntfy token must come from the environment, by name");
  // the password is reachable only through the environment, never as a value
  assert.match(node("03 Sign in").parameters.jsonBody, /\$env\.MOBILIZON_EMAIL/);
  assert.match(node("03 Sign in").parameters.jsonBody, /\$env\.MOBILIZON_PASSWORD/);
  for (const shape of ['"password"', '"accessToken":', '"Basic ', '"Bearer ey', "eyJ"]) {
    assert.ok(!json.includes(shape), `${shape} must not appear as a literal in the workflow`);
  }
  // An ntfy token, by *shape* rather than by prefix: `series.config.mjs` explains the prefix in a comment, and
  // that comment is injected into 01 Config on purpose, so "tk_" alone is not the finding - a value is.
  assert.ok(!/\btk_[A-Za-z0-9]{16,}/.test(json), "an ntfy token value appears in the workflow - it belongs in $env.NTFY_TOKEN");
  // the public read carries no credential, which is what lets simulate.mjs run with none
  assert.ok(!node("02 Read the series history").parameters.options.headers.some((h) => h.name === "Authorization"));
});

test("the workflow's copy of the config is the repo's config, and the create gate is the only write switch", () => {
  const got = configItems()[0].json;
  for (const key of ["INSTANCE", "CREDENTIALS", "RUN", "SERIES"]) {
    assert.ok(JSON.stringify(got[key]).length > 2, `${key} was not injected`);
  }
  const repo = readFileSync(root + "series.config.mjs", "utf8");
  assert.ok(got.SERIES.length >= 2);
  assert.deepEqual(got.SERIES.map((s) => s.key), (repo.match(/key: "([a-z-]+)"/g) ?? []).map((m) => m.slice(6, -1)));
  assert.equal(got.RUN.dryRun, true, "the shipped default is dry run; `create` is a deliberate edit");
  assert.deepEqual(Object.keys(got.query).sort(), ["auditDateWindow", "createEvent", "readSeriesHistory", "readSeriesHistoryVars", "signIn"]);
  assert.ok(got.query.readSeriesHistory.includes("organizedEvents"));

  const gate = node("05 Stop if nothing to write");
  const c = gate.parameters.conditions.conditions[0];
  assert.equal(c.leftValue, "={{ $('04 Plan & decide').item.json.action }}");
  assert.equal(c.rightValue, "create");
  assert.equal(gate.parameters.options.branchMode, "matchingBranch");
  // exactly one edge can reach the write node
  const intoCreate = Object.entries(wf.connections).flatMap(([from, ports]) =>
    Object.entries(ports.main ?? []).flatMap(([idx, list]) => (list ?? []).filter((c2) => c2.node === "06 Create event").map(() => from)));
  assert.deepEqual(intoCreate, ["05 Stop if nothing to write"], "only the gate may start a write");
});

// ------------------------------------------------------------------ planning

test("the plan node, as n8n will run it, schedules Nov 21 and Nov 25 and writes nothing", () => {
  const items = plansFrom();
  assert.equal(items.length, 2, "one item per series");
  const [social, parallel] = items.map((i) => i.json);

  assert.equal(social.seriesKey, "mpls-social");
  assert.equal(social.action, "would_create", "a dry run must never report `create`");
  assert.equal(social.candidate.date, "2026-11-21");
  assert.equal(social.candidate.beginsOn, "2026-11-21T18:00:00Z");
  assert.equal(social.candidate.endsOn, "2026-11-21T20:00:00Z");
  assert.equal(social.createVars.physicalAddress.street, "8100 Minnetonka Boulevard");
  assert.equal(social.createVars.physicalAddress.id, undefined, "a copied address id would make the two events share one row");
  assert.equal(social.createVars.picture.mediaUuid, "c9110656-24d2-435e-b1c1-99a59d77690b");
  assert.ok(social.notes.some((n) => n.startsWith("TIMEZONE:")), "the Etc/UTC row has to be visible in the report");
  assert.deepEqual(social.auditVars.preferredUsername, "minneapolis_math_book_group");
  assert.equal(social.auditVars.after, "2026-11-20T06:00:00Z", "the audit window is a day either side, in the series zone");
  assert.equal(social.auditVars.before, "2026-11-22T06:00:00Z");

  assert.equal(parallel.seriesKey, "parallel-learning");
  assert.equal(parallel.action, "would_create");
  assert.equal(parallel.candidate.date, "2026-11-25");
  assert.equal(parallel.candidate.endsOn, "2026-11-26T02:00:00Z");
});

test("the plan node refuses to guess rather than inventing an organizer or a date", () => {
  const base = { "01 Config": configItems(), "02 Read the series history": historyItem() };
  assert.throws(() => runCode("04 Plan & decide", { ...base, "03 Sign in": [{ json: { data: { login: { accessToken: "t", user: { actors: [] } } } } }] }),
    /owns 0 local actors/);
  assert.throws(() => runCode("04 Plan & decide", { ...base, "03 Sign in": [{ json: { data: { login: { accessToken: "t", user: { actors: [{ id: "3", domain: null }, { id: "9", domain: null }] } } } } }] }),
    /owns 2 local actors/);
  // a GraphQL error with HTTP 200 - measured behaviour of this instance - must not become an empty plan
  assert.throws(() => runCode("04 Plan & decide", { ...base, "03 Sign in": [{ json: { data: { login: null }, errors: [{ message: "Impossible to authenticate" }] } }] }),
    /Impossible to authenticate/);
  assert.throws(() => runCode("04 Plan & decide", { ...base, "02 Read the series history": [{ json: { data: {} } }], "03 Sign in": signInItem() }),
    /no group for/);
});

// ----------------------------------------------------------------- the audit

test("the report node accepts a clean run and names both series, both dates and the audit", () => {
  const plans = plansFrom();
  const created = plans.map((p) => ({ json: { data: { createEvent: { uuid: `made-${p.json.seriesKey}`, url: `https://mobilizon.labradorius.com/e/${p.json.seriesKey}`, id: "9", ...p.json.createVars, draft: false } } } }));
  const audits = plans.map((p) => ({
    json: { data: { group: { organizedEvents: { elements: [{
      uuid: `made-${p.json.seriesKey}`, url: "u", title: p.json.createVars.title,
      beginsOn: p.json.candidate.beginsOn, endsOn: p.json.candidate.endsOn, draft: false,
    }] } } } },
  }));
  const got = runCode("08 Report", { "04 Plan & decide": plans, "06 Create event": created, "07 Audit the date": audits });
  assert.equal(got.json.ok, true);
  assert.equal(got.json.written, 2);
  assert.match(got.json.summary, /2026-11-21/);
  assert.match(got.json.summary, /2026-11-25/);
  assert.match(got.json.summary, /audit: ok \(1 row\(s\) on the date\)/);
  assert.match(got.json.summary, /TIMEZONE: the anchor row declares Etc\/UTC/);
});

test("the report node fails the execution when the audit finds two events on one date", () => {
  const plans = plansFrom();
  const mine = { json: { data: { createEvent: { uuid: "mine", url: "u1", id: "1", ...plans[0].json.createVars, draft: false } } } };
  const human = { uuid: "human", url: "u2", title: plans[0].json.createVars.title, beginsOn: "2026-11-21T13:00:00Z", draft: false };
  assert.throws(
    () => runCode("08 Report", {
      "04 Plan & decide": plans,
      "06 Create event": [mine],
      "07 Audit the date": [{ json: { data: { group: { organizedEvents: { elements: [mine.json.data.createEvent, human] } } } } }],
    }),
    /the audit disagrees[\s\S]*2 rows for this series/,
  );
});

test("the report node fails the execution when the write claimed success but the event is not there", () => {
  const plans = plansFrom();
  assert.throws(
    () => runCode("08 Report", {
      "04 Plan & decide": plans,
      "06 Create event": [{ json: { data: { createEvent: { uuid: "ghost", url: "u", id: "1", ...plans[0].json.createVars, draft: false } } } }],
      "07 Audit the date": [{ json: { data: { group: { organizedEvents: { elements: [] } } } } }],
    }),
    /is not in the group's list/,
  );
});

test("a run where every series skipped is a normal night, not an error", () => {
  const plans = plansFrom().map((p) => ({ json: { ...p.json, action: "skip", reason: "max_future_reached", note: "two dates ahead already" } }));
  const got = runCode("08 Report", { "04 Plan & decide": plans });   // create/audit never ran
  assert.equal(got.json.ok, true);
  assert.equal(got.json.written, 0);
  assert.match(got.json.summary, /nothing to do/);
  assert.match(got.json.summary, /max_future_reached/);
});

// --------------------------------------------------------------- the alerts

test("the alert reporter turns a plan-level alert into the failure shape a notification can use", () => {
  const alert = { seriesKey: "mpls-social", action: "alert", reason: "no_rows_for_series", note: "a rename, probably" };
  // 01 Config is seeded because that is where the channel config lives; the case where it is absent is asserted
  // separately, in the error reporter's test.
  const got = runCode("22 Report a problem", { "01 Config": configItems(), "04 Plan & decide": [{ json: alert }] });
  assert.equal(got[0].json.ok, false);
  assert.equal(got[0].json.alertTitle, "cadence paused: mpls-social");
  assert.match(got[0].json.summary, /^CADENCE PROBLEM: mpls-social: no_rows_for_series/);
  const clean = runCode("22 Report a problem", { "01 Config": configItems(), "04 Plan & decide": [{ json: { seriesKey: "mpls-social", action: "would_create" } }] });
  assert.equal(clean[0].json.ok, true);
  // D194: a run with nothing to report must be silent. Cadence runs every morning, and a message that means
  // "nothing happened" is the thing that makes the messages that matter unread.
  assert.equal(clean[0].json.notifyNeeded, false, "a clean dry run must not send anything");
  assert.equal(clean[0].json.ntfy, null);
  assert.equal(clean[0].json.alertChannel, "mathloco-cadence", "the log still says which channel exists");
  // A stop *is* worth a message: same shape as a thrown error, at the same priority, so a person learns one
  // vocabulary for "something needs you".
  assert.equal(got[0].json.notifyNeeded, true);
  assert.equal(got[0].json.ntfy.topic, "mathloco-cadence");
  assert.equal(got[0].json.ntfy.priority, 4, "problem = 4 (high) per the measured ntfy priority table");
  assert.deepEqual(got[0].json.ntfy.tags, ["warning"]);
  assert.equal(got[0].json.ntfy.title, "cadence paused: mpls-social");
  assert.match(got[0].json.ntfy.message, /no_rows_for_series/);
});

test("24 Fail loudly keeps a handled failure red, and stays quiet when nothing was wrong", () => {
  // n8n treats an error that came out a wired error output as *handled* - so the run is no longer recorded as a
  // failure, and a workflow-level error workflow will not fire for it either (vendor ERROR_WORKFLOWS.md). This
  // node is how the workflow's own alarm, a red execution, survives that fix.
  const problem = [{ json: { ok: false, alertTitle: "cadence failed at read", summary: "ETIMEDOUT" } }];
  assert.throws(
    () => runCode("24 Fail loudly", { "21 Report error path": problem }),
    /cadence failed, and the alert was sent[\s\S]*21 Report error path: cadence failed at read/,
    "the thrown text must repeat the reporter's words, so the log and the ntfy message say one thing",
  );
  assert.throws(
    () => runCode("24 Fail loudly", { "22 Report a problem": [{ json: { ok: false, alertTitle: "cadence paused: x", summary: "no_rows" } }] }),
    /cadence paused: x/,
  );
  const clean = runCode("24 Fail loudly", { "22 Report a problem": [{ json: { ok: true, alertTitle: "", summary: "" } }] });
  assert.equal((Array.isArray(clean) ? clean : [clean])[0].json.ok, true, "a clean run must not throw here");
  // A dry run that alerted nobody still must not look broken.
  const quiet = runCode("24 Fail loudly", {});
  assert.equal((Array.isArray(quiet) ? quiet : [quiet])[0].json.loudness, "nothing to keep red");
});

test("the error reporter says which stage broke, because a red dot is not an alert", () => {
  const got = runCode("21 Report error path", {
    "01 Config": configItems(),
    "02 Read the series history": [{ json: { error: { message: "ETIMEDOUT", name: "Error" } } }],
    "06 Create event": [{ json: { error: { message: "nope" } } }],
    "08 Report": [{ json: { error: { message: "the audit disagrees" } } }],
  });
  assert.equal(got[0].json.ok, false);
  assert.deepEqual(got[0].json.failedAt, ["read", "write", "report"]);
  assert.equal(got[0].json.alertTitle, "cadence failed at read+write+report");
  assert.match(got[0].json.summary, /ETIMEDOUT/);
  // and it refuses to pretend, if the graph changes and no stage reports an error
  assert.throws(() => runCode("21 Report error path", { "02 Read the series history": [{ json: {} }] }), /out of date/);
  assert.equal(got[0].json.notifyNeeded, true, "a thrown stage is always worth a message - it does not pass a gate");
  assert.equal(got[0].json.ntfy.priority, 4);
  // The degraded case, stated rather than papered over: if 01 Config is what failed there is no config item,
  // so there is no channel. The reporter says so in its own output instead of throwing a second time.
  const blind = runCode("21 Report error path", {
    "03 Sign in": [{ json: { error: { message: "sign-in refused" } } }],
  });
  assert.equal(blind[0].json.notifyNeeded, false);
  assert.equal(blind[0].json.alertChannel, "none configured");
  assert.equal(blind[0].json.ntfy, null);
  assert.match(blind[0].json.summary, /sign-in refused/, "the failure is still described, even when it cannot be sent");
});
