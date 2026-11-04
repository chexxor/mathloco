/**
 * The transport layer, tested by breaking it.
 *
 *   node --test integrations/mobilizon-cadence/test/import.test.mjs
 *   node integrations/mobilizon-cadence/verify-import.mjs --selftest    # same thing, one command
 *
 * Layers 1 and 2 (`core.test.mjs`, `workflow.test.mjs`) prove what the artifact contains. This file proves the
 * thing that decides whether any of it applies to the workflow actually running in n8n: that
 * `verify-import.mjs` **notices** when the exported copy is not the reviewed one. Without these plantings,
 * "the import check passed" is a sentence about a script that never fails.
 *
 * Two directions are asserted, because an instrument that cries wolf gets ignored:
 *   - every defect that would matter must be caught (fatal/drift), and
 *   - the ordinary noise n8n adds to an export (ids, version ids, timestamps, rewritten positions) must
 *     produce **nothing**, as must the one addition the operator guide asks for (an alerting node on 21/22).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyDocument, CADENCE, PROBE, readGate, fingerprint } from "../verify-import.mjs";
import { checkProbe, buildProbe } from "../build-probe.mjs";
import { runCodeChain } from "../lib/sandbox.mjs";

const clone = () => structuredClone(CADENCE);
const blocked = (r) => r.findings.filter((f) => f.sev === "fatal" || f.sev === "drift");
const hits = (r, needle, sev = "fatal") =>
  r.findings.filter((f) => f.sev === sev && `${f.where} ${f.what} ${f.means}`.includes(needle));
const node = (wf, name) => wf.nodes.find((n) => n.name === name);

// ---------------------------------------------------------------- the honest baseline

test("the committed artifact verifies against itself", () => {
  const r = verifyDocument(clone(), CADENCE);
  assert.equal(r.identical, true, "fingerprints differ - the artifact on disk is not what the checker loaded?");
  assert.deepEqual(blocked(r), [], blocked(r).map((f) => `${f.sev} ${f.where}: ${f.what}`));
  assert.equal(r.wouldWrite, false, "dryRun=true as shipped must read back as writes-off");
  assert.deepEqual(r.runs.got.map((p) => [p.action, p.seriesKey, p.beginsOn]),
    [["would_create", "mpls-social", "2026-11-21T18:00:00Z"], ["would_create", "parallel-learning", "2026-11-26T00:00:00Z"]],
    "the checker's own execution of the artifact must agree with simulate.mjs and with Layer 2");
});

test("n8n's own export noise is not a finding (ids, timestamps, moved nodes)", () => {
  const wf = clone();
  wf.id = "9d1f0b2c-0000-4a11-8f2f-0f0f0f0f0f0f";
  wf.versionId = "5b0f4a6e-1111-4c8f-9a1d-2f2f2f2f2f2f";
  wf.hash = "c0ffee";
  wf.createdAt = "2026-11-04T15:00:00.000Z";
  wf.updatedAt = "2026-11-04T15:00:01.000Z";
  wf.parentFolderId = null;
  wf.active = false;
  wf.activeVersion = null;
  wf.tags = [{ id: "1", name: "mobilizon", createdAt: "2026-11-04T15:00:00.000Z" }];
  wf.nodes.forEach((n, i) => {
    n.id = `n8n-generated-${i}`;
    n.position = [n.position[0] + 120, n.position[1] + 40];
    n.meta = { values: {} };
    n.parameters = { ...n.parameters, notesInFlow: false };
  });
  const r = verifyDocument(wf, CADENCE);
  assert.deepEqual(blocked(r), [], blocked(r).map((f) => `${f.sev} ${f.where}: ${f.what}`));
});

test("the alerting node the guide asks for is a note, not a failure", () => {
  const wf = clone();
  wf.nodes.push({
    id: "alert-1", name: "23 Tell me", type: "n8n-nodes-base.discord", typeVersion: 3, position: [420, 320],
    parameters: { webhookUrl: "https://discord.example/x", content: "={{ $json.summary }}" },
  });
  wf.connections["21 Report error path"] = { main: [[{ node: "23 Tell me", type: "main", index: 0 }]] };
  wf.connections["22 Report a problem"] = { main: [[{ node: "23 Tell me", type: "main", index: 0 }]] };
  const r = verifyDocument(wf, CADENCE);
  assert.deepEqual(blocked(r), [], blocked(r).map((f) => `${f.sev} ${f.where}: ${f.what}`));
  assert.ok(hits(r, "23 Tell me", "note").length === 1, JSON.stringify(r.findings));
  assert.match(JSON.stringify(hits(r, "23 Tell me", "note")), /21 Report error path, 22 Report a problem/);
});

// ------------------------------------------------------- the write path's safety, broken one at a time

test("an unwired error output is caught, because a red dot is not an alert", () => {
  const wf = clone();
  delete wf.connections["06 Create event"].error;
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "06 Create event").length >= 1, "the missing error edge must be reported");
  assert.match(JSON.stringify(r.findings), /21 Report error path/);
});

test("a gate that no longer routes on `create` is fatal", () => {
  const wf = clone();
  node(wf, "05 Stop if nothing to write").parameters.conditions.conditions[0].rightValue = "would_create";
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "gate reads").length === 1, JSON.stringify(r.findings));
});

test("a second path into the write node is fatal, and named", () => {
  const wf = clone();
  wf.connections["Trigger every morning"].main[0].push({ node: "06 Create event", type: "main", index: 0 });
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "exactly one edge may start a write").length === 1);
  assert.ok(hits(r, "-> 06 Create event").length >= 1, "the extra edge itself is reported too");
});

test("a config edited inside n8n shows up as a config difference, not a shrug", () => {
  const wf = clone();
  const cfg = node(wf, "01 Config");
  const before = cfg.parameters.jsCode;
  assert.ok(before.includes("dryRun: true"), "the artifact should carry the injected default");
  cfg.parameters.jsCode = before.replace("dryRun: true", "dryRun: false");
  const r = verifyDocument(wf, CADENCE);
  assert.equal(r.wouldWrite, true, "the checker must read the exported copy's own RUN.dryRun");
  assert.ok(hits(r, "Two configs").length === 1, JSON.stringify(blocked(r)));
  assert.match(JSON.stringify(r.findings), /config\.RUN\.dryRun/);
});

test("a request pointed at another path on the host is fatal", () => {
  const wf = clone();
  node(wf, "02 Read the series history").parameters.url = "https://mobilizon.labradorius.com/graphql";
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "/api/v1").length >= 1);
});

test("a request pointed at another host is fatal", () => {
  const wf = clone();
  node(wf, "06 Create event").parameters.url = "https://evil.example/api/v1";
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "evil.example").length >= 1);
});

test("an attached credential is fatal - exports carry credential names", () => {
  const wf = clone();
  node(wf, "06 Create event").credentials = { httpHeaderAuth: { id: "7", name: "Mobilizon (do not do this)" } };
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "second, untracked auth path").length === 1);
});

test("a lost settings.timezone is fatal, because it moves the trigger hour", () => {
  const wf = clone();
  wf.settings.timezone = "Europe/Berlin";
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "the trigger's 09:00 is in this zone").length === 1);
});

test("a lost executionOrder is fatal", () => {
  const wf = clone();
  wf.settings.executionOrder = "v0";
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "executionOrder").length >= 1);
});

test("pinned data is fatal: the run would answer from a stale snapshot", () => {
  const wf = clone();
  wf.pinData = { "02 Read the series history": [{ json: { data: { group: null } } }] };
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "pinned").length >= 1 || hits(r, "stale calendar read").length >= 1, JSON.stringify(r.findings));
});

test("a missing node is fatal by name", () => {
  const wf = clone();
  wf.nodes = wf.nodes.filter((n) => n.name !== "07 Audit the date");
  delete wf.connections["06 Create event"].main;
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "the node is gone").length === 1);
  assert.ok(hits(r, "07 Audit the date").length >= 2, "its edges are reported too");
});

test("a Code node edited in the editor is fatal: no test has ever run that text", () => {
  const wf = clone();
  const plan = node(wf, "04 Plan & decide");
  plan.parameters.jsCode += "\n// a human tweaked this at 09:05";
  const r = verifyDocument(wf, CADENCE);
  assert.ok(hits(r, "no test has ever run").length === 1);
});

test("an IF block n8n rewrote is a warning while dry run, fatal once writes are on", () => {
  const rewritten = clone();
  const g = node(rewritten, "05 Stop if nothing to write");
  g.typeVersion = 1;
  g.parameters.conditions = [{ value1: g.parameters.conditions.conditions[0].leftValue, value2: "create", operator: "equals" }];
  delete g.parameters.options;
  const dry = verifyDocument(rewritten, CADENCE);
  assert.ok(hits(dry, "different block shape", "warn").length === 1, JSON.stringify(dry.findings));
  assert.equal(hits(dry, "different block shape", "fatal").length, 0, "nothing can be written in a dry run, so this is not fatal yet");

  const writing = clone();
  writing.nodes.find((n) => n.name === "01 Config").parameters.jsCode =
    node(writing, "01 Config").parameters.jsCode.replace("dryRun: true", "dryRun: false");
  const g2 = node(writing, "05 Stop if nothing to write");
  g2.typeVersion = 1;
  g2.parameters.conditions = [{ value1: g2.parameters.conditions.conditions[0].leftValue, value2: "create", operator: "equals" }];
  delete g2.parameters.options;
  const r = verifyDocument(writing, CADENCE);
  assert.ok(hits(r, "different block shape", "fatal").length === 1, "with writes on, the same ambiguity must stop the run");
});

test("readGate reads both v1 and v2 condition blocks, and refuses a third shape", () => {
  const g = node(clone(), "05 Stop if nothing to write");
  assert.equal(readGate(g).right, "create");
  assert.equal(readGate({ parameters: { conditions: [{ value1: "={{ a }}", value2: "create", operator: "equals" }] } }).op, "equals");
  assert.equal(readGate({ parameters: { conditions: [] } }), null, "an empty block is not a gate");
  assert.equal(readGate({ parameters: {} }), null);
});

test("a node version n8n upgraded is a warning, not a failure", () => {
  const wf = clone();
  for (const n of wf.nodes) if (n.type === "n8n-nodes-base.httpRequest") n.typeVersion = 5;
  const r = verifyDocument(wf, CADENCE);
  assert.deepEqual(blocked(r), []);
  assert.equal(hits(r, "n8n upgraded the node on import", "warn").length, 4);
});

test("a node renamed inside n8n breaks the copy's own run, and that is reported as a run failure", () => {
  const wf = clone();
  wf.connections["01 Setup"] = wf.connections["01 Config"];      // keep the graph otherwise intact: it is the
  delete wf.connections["01 Config"];                            // *expression* that must break
  wf.connections["Trigger every morning"].main[0][0].node = "01 Setup";
  wf.nodes.find((n) => n.name === "01 Config").name = "01 Setup";
  const r = verifyDocument(wf, CADENCE);
  const exec = r.findings.filter((f) => f.where === "execution");
  assert.equal(exec.length, 1, JSON.stringify(blocked(r)));
  assert.match(exec[0].what, /node "01 Config" did not run/, "the failure is quoted, not summarised away");
});

// ------------------------------------------------------------- the export, executed rather than compared

const FIXTURE = JSON.parse(readFileSync(new URL("../fixtures/group-history-2026-11-04.json", import.meta.url), "utf8"));
/** The two HTTP reads a run would have received. `accessToken`, not `sessionToken` — the login envelope
 *  measured on 5.2.4 on 2026-11-04. */
const seed = () => ({
  "02 Read the series history": [{ json: { data: { group: FIXTURE.data.group } } }],
  "03 Sign in": [{ json: { data: { login: { accessToken: "not-a-real-token", user: { id: "1", actors: [{ id: "3", preferredUsername: "chexxor", domain: null }] } } } } }],
});
const withExportNoise = (wf) => {
  wf.nodes.forEach((n, i) => { n.id = `n8n-generated-${i}`; n.position = [i * 220, 40]; n.meta = { values: {} }; n.parameters.notesInFlow = false; });
  return wf;
};

test("the export is not only identical, it still runs: the club's rows in, the two planned dates out", () => {
  const run = runCodeChain(withExportNoise(clone()), seed());
  assert.deepEqual(run.skipped, ["21 Report error path"],
    "only the error reporter sits outside the main chain; if a node moved there, the dry run would stop exercising it");
  assert.deepEqual(
    run.emitted["04 Plan & decide"].map((i) => [i.json.action, i.json.candidate.beginsOn, i.json.candidate.endsOn]),
    [["would_create", "2026-11-21T18:00:00Z", "2026-11-21T20:00:00Z"],   // Sat 21 Nov 12:00-14:00 America/Chicago
     ["would_create", "2026-11-26T00:00:00Z", "2026-11-26T02:00:00Z"]],  // Wed 25 Nov 18:00-20:00 America/Chicago
    "same two instants `simulate.mjs` prints from the live read");
  const report = run.emitted["08 Report"][0].json;
  assert.equal(report.ok, true);
  assert.equal(report.written, 0, "an exported copy, executed, writes nothing");
  assert.match(report.summary, /2 series, 0 event\(s\) written/);
  assert.deepEqual(run.emitted["22 Report a problem"], [{ json: { ok: true, summary: "no alerts to report" } }],
    "a clean dry run reaches the alert reporter and finds nothing to alert on");
});

test("flip dryRun in the export and execute it: the plan node emits `create`, so the gate is the only thing left", () => {
  const wf = withExportNoise(clone());
  const cfg = wf.nodes.find((n) => n.name === "01 Config");
  cfg.parameters.jsCode = cfg.parameters.jsCode.replace("dryRun: true", "dryRun: false");
  const run = runCodeChain(wf, seed());
  assert.deepEqual(run.emitted["04 Plan & decide"].map((i) => i.json.action), ["create", "create"],
    "this is the moment verify-import.mjs calls fatal: the edge into 06 becomes live");
  assert.match(run.emitted["08 Report"][0].json.summary, /created 2026-11-21/);
  // Stated limit, not a gap to hide: the harness stops at HTTP nodes, so `06 Create event` never ran and
  // `08 Report` had no audit to check. The write and the audit-after-write are exercised in
  // test/workflow.test.mjs with seeded 06/07 items; nothing here can reach a network.
  assert.equal(run.emitted["08 Report"][0].json.written, 0, "no write happened, because no HTTP node ran");
});

// ------------------------------------------------------------- the probe: read-only, by construction

test("the probe artifact is a probe", () => {
  assert.deepEqual(checkProbe(buildProbe()), []);
});

test("the committed probe file is the probe build-probe.mjs builds today", () => {
  // The guide tells the operator to import this file by name, so a stale copy on disk is a different
  // instrument than the one checkProbe vouches for. check.mjs rebuilds with --check; this pins it here too.
  assert.equal(fingerprint(PROBE), fingerprint(buildProbe()),
    "n8n/env-probe.json is stale - run node integrations/mobilizon-cadence/build-probe.mjs");
});

test("the probe cannot register an OAuth application", () => {
  // Asking whether the route is live is read-only only while the request stays incomplete. A probe that
  // sends a registration parameter would mint a client_id/client_secret on the instance.
  const scoped = buildProbe();
  const apps = scoped.nodes.find((n) => n.name === "P5 Mobilizon on the OAuth app route");
  apps.parameters.bodyParameters.parameters.entries.push({ name: "scope", value: "write:event:create" });
  assert.match(JSON.stringify(checkProbe(scoped)), /can register an OAuth client/);

  const jsonBody = buildProbe();
  jsonBody.nodes.find((n) => n.name === "P5 Mobilizon on the OAuth app route").parameters.specifyBody = "json";
  assert.match(JSON.stringify(checkProbe(jsonBody)), /url-encoded\/form body/);

  // The route answers 400 by design, so a probe that lets that become a failed execution reports nothing.
  const loud = buildProbe();
  loud.nodes.find((n) => n.name === "P5 Mobilizon on the OAuth app route").parameters.options.response.response.neverError = false;
  assert.match(JSON.stringify(checkProbe(loud)), /neverError must be on/);

  // A fourth request is no longer the three this file argues about.
  const extra = buildProbe();
  extra.nodes.push(structuredClone(extra.nodes.find((n) => n.name === "P2 Mobilizon on the apex")));
  assert.match(JSON.stringify(checkProbe(extra)), /exactly three requests/);
});

test("the probe's read-only argument fires when it is broken", () => {
  const p = buildProbe();
  p.nodes[0].type = "n8n-nodes-base.scheduleTrigger";
  assert.match(JSON.stringify(checkProbe(p)), /only manualTrigger is allowed/);

  const leak = buildProbe();
  leak.nodes[1].parameters.jsCode = leak.nodes[1].parameters.jsCode.replace("wantedPresent: WANTED.filter(present)", "secret: $env[WANTED[0]]");
  assert.match(JSON.stringify(checkProbe(leak)), /\$env appears in what the node returns/);

  const mutate = buildProbe();
  mutate.nodes[3].parameters.jsonBody = JSON.stringify({ query: "mutation { createEvent { uuid } }" });
  const found = checkProbe(mutate);
  assert.match(JSON.stringify(found), /not the literal \{ __typename \} read/);
  assert.match(JSON.stringify(found), /word mutation/);

  const credentialed = buildProbe();
  credentialed.nodes[3].credentials = { httpHeaderAuth: { id: "1", name: "Mobilizon" } };
  assert.match(JSON.stringify(checkProbe(credentialed)), /credential block/);
});
