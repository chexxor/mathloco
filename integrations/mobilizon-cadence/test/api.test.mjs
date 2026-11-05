/**
 * test/api.test.mjs - the REST door's safety properties, proven offline.
 *
 * `n8n-api.mjs` is the only file in this directory that can write to the n8n instance, so it is the one whose
 * refusals have to be executed rather than read. Everything here runs against a fake `fetch`: no network, no
 * credentials, and a planted instance whose copy is *not* the reviewed one.
 *
 * The contract it is written against is not remembered from memory: it is this instance's own OpenAPI, read
 * 2026-11-05 from `GET /api/v1/docs/swagger-ui-init.js` (`n8n Public API` 1.1.1; `POST /workflows` requires
 * name, nodes, connections, settings; `id`, `active`, `activeVersionId`, `meta`, `tags` are `readOnly`). The
 * first test is the one that keeps that honest: it asserts that every field the artifact carries which the API
 * does not accept is on the strip list, so a field added to the generator later cannot ride onto the instance
 * uninvited.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  importBody, makeApi, planPush, activateIfVerified, idOrName, SERVER_OWNED, artifacts,
  linkWorkflow, expectedFor, SETTINGS_ALLOWED, BODY_ALLOWED, report,
} from "../n8n-api.mjs";
import { CADENCE, PROBE, WATCHER, HEARTBEAT } from "../verify-import.mjs";

/** A stand-in instance: records every call, answers from a script you hand it. */
function fakeInstance(responses = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const method = init.method ?? "GET";
    const path = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/api\/v1/, "");
    calls.push({ method, path, body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers });
    const clean = path.split("?")[0];               // the query is a filter, not a route
    const key = `${method} ${clean.replace(/\/[^/]+\/(activate|deactivate|archive)$/, "/:verb")}`;
    const spec = responses[key] ?? { status: 200, json: { data: [] } };
    const text = spec.json !== undefined ? JSON.stringify(spec.json) : (spec.text ?? "");
    return {
      ok: spec.status < 400,
      status: spec.status ?? 200,
      text: async () => text,
    };
  };
  return { calls, api: makeApi({ fetchImpl, key: "tk_test-never-a-real-key" }) };
}

test("a settings key this build cannot carry stops the push before the door does", () => {
  // What the instance answers is `400 request/body/settings Unrecognized key(s) in object: 'savePreExecutionData'`
  // - the same 400 for all four artifacts, and silent about which config line to fix. Checked here, it names the
  // key and the accepted set, and nothing has been created on the canvas yet.
  assert.throws(
    () => importBody({ ...CADENCE, settings: { ...CADENCE.settings, savePreExecutionData: false } }),
    /savePreExecutionData.*The door accepts 17/s,
  );
});

test("every artifact this repo ships is inside the settings the live door accepts", () => {
  // The list is grounded in the instance's own spec: @measured 2026-11-05 via `.notes/bin/n8n-openapi.mjs save`,
  // `components/schemas/workflowPublicDto.generated/properties/settings`. Without this, a retention flag added to
  // `series.config.mjs` that the public DTO does not know stays invisible until a live push fails everywhere.
  for (const art of Object.values(artifacts)) {
    for (const k of Object.keys(art.doc.settings ?? {})) {
      assert.ok(SETTINGS_ALLOWED.has(k), `${art.key}: settings.${k} is not a key this n8n build accepts`);
    }
  }
});

test("what goes on the wire is the reviewed artifact, and every server-owned field is stripped", () => {
  for (const art of [CADENCE, PROBE]) {
    const body = importBody(art);
    // The four fields the live spec marks required, present and identical.
    for (const k of ["name", "nodes", "connections", "settings"]) {
      assert.deepEqual(body[k], art[k], `${art.name}: ${k} must reach the instance unchanged`);
    }
    // Behaviour-deciding settings ride along, including the retention flags a dry run is unreadable without.
    assert.equal(body.settings.executionOrder, "v1");
    assert.equal(body.settings.timezone, art.settings.timezone);
    assert.equal(body.settings.saveManualExecutions, true, "the instance default on this box is manual=false, so the flag has to be sent (D201)");
    assert.equal(body.nodes.length, art.nodes.length);
    // Everything the artifact carries that the API owns is on the strip list - no exceptions, no surprises.
    const dropped = Object.keys(art).filter((k) => !(k in body));
    for (const k of dropped) assert.ok(SERVER_OWNED.has(k), `${art.name}: ${k} was dropped but is not declared server-owned`);
    // And nothing writable was dropped by accident.
    assert.deepEqual(dropped.sort(), Object.keys(art).filter((k) => SERVER_OWNED.has(k)).sort());
    assert.ok(!("active" in body) || body.active !== true);
  }
});

test("a copy read back from the door can be sent back to it - the round trip the link depends on", () => {
  // Measured 2026-11-05: `GET /workflows/{id}` on n8n 2.45.7 answers with `versionCounter`, `sourceWorkflowId` and
  // `parentFolder` too, and the first live `PUT` answered
  // `400 request/body Unrecognized key(s) in object: 'versionCounter', 'sourceWorkflowId', 'parentFolder'`.
  // Rewriting one setting means reading a live document and sending most of it back, so whatever the door hands out
  // but will not accept has to be dropped on the way out.
  const live = structuredClone(WATCHER);
  Object.assign(live, {
    id: "w1", versionId: "v9", active: false, triggerCount: 0, parentFolderId: "p1",
    versionCounter: 3, sourceWorkflowId: null, parentFolder: null,
    tags: [{ name: "x" }], createdAt: "2026-11-05T00:00:00Z", updatedAt: "2026-11-05T00:00:00Z",
  });
  live.settings.availableInMCP = true;
  const body = importBody(live);
  for (const k of ["id", "versionId", "active", "triggerCount", "versionCounter", "sourceWorkflowId", "parentFolder",
    "parentFolderId", "tags", "createdAt", "updatedAt"]) {
    assert.ok(!(k in body), `${k} came from the door and must not be sent back to it`);
  }
  assert.ok(Object.keys(body).every((k) => BODY_ALLOWED.has(k)), "every key that does ride is in the body schema");
  assert.equal(body.nodes.length, WATCHER.nodes.length, "the round trip still carries the reviewed nodes");
});

test("a body key the door's schema does not know stops the call with the schema named", () => {
  assert.throws(
    () => importBody({ ...CADENCE, someFutureField: 1 }),
    /someFutureField.*The body schema takes/s,
  );
});

test("an artifact that arrived with active:true is refused before the wire, not on it", () => {
  const tampered = structuredClone(CADENCE);
  tampered.active = true;
  assert.throws(() => importBody(tampered), /active:true/);
});

test("a 401 is reported as a key problem, not as a dead API (D198)", async () => {
  const { api } = fakeInstance({ "GET /workflows": { status: 401, json: { message: "Unauthorized" } } });
  await assert.rejects(() => api.listWorkflows(), /401.*re-mint/i);
});

test("an HTML body is called what it is: a proxy or the SPA fallback, not the API", async () => {
  const { api } = fakeInstance({ "GET /workflows": { status: 200, text: "<!doctype html><html>...</html>" } });
  await assert.rejects(() => api.listWorkflows(), /not JSON/);
});

test("create carries an Idempotency-Key derived from the artifact, so a retried import cannot duplicate it", async () => {
  const { calls, api } = fakeInstance({ "POST /workflows": { status: 200, json: { id: "abc1234567", name: CADENCE.name } } });
  const body = importBody(CADENCE);
  await api.createWorkflow(body);
  await api.createWorkflow(body);
  const keys = calls.map((c) => c.headers["idempotency-key"]);
  assert.equal(keys.length, 2);
  assert.match(keys[0], /^[0-9a-f]{12,}$/);
  assert.equal(keys[0], keys[1], "the same bytes must produce the same key, or a retry is a second workflow");
});

test("push never creates a second workflow with the reviewed name", async () => {
  const existing = { id: "gTPNPCgjU7L0fwiZ", name: CADENCE.name, activeVersionId: null };
  const { api } = fakeInstance({ "GET /workflows": { status: 200, json: { data: [existing] } } });
  const plan = await planPush(api, artifacts.cadence);
  assert.equal(plan.create, false);
  assert.equal(plan.existing.id, existing.id);
  assert.match(plan.why, /already exists/);
});

test("a name that only *contains* the reviewed name is not treated as the reviewed workflow", async () => {
  const lookalike = { id: "x1", name: `${CADENCE.name} (copy from the editor)`, activeVersionId: "v" };
  const { api } = fakeInstance({ "GET /workflows": { status: 200, json: { data: [lookalike] } } });
  const plan = await planPush(api, artifacts.cadence);
  assert.equal(plan.create, true, "a lookalike must not block the real import, and must not be mistaken for it");
});

test("activate is refused when the live copy has moved off the artifact - and no activate call is made", async () => {
  // The exact drift the checker exists for: someone toggled the trigger's timezone in the editor.
  const drifted = structuredClone(CADENCE);
  drifted.id = "w1";
  drifted.settings.timezone = "Etc/UTC";
  const { calls, api } = fakeInstance({
    "GET /workflows/w1": { status: 200, json: drifted },
    "GET /workflows": { status: 200, json: { data: [{ id: "w1", name: CADENCE.name }] } },
    "POST /workflows/:verb": { status: 200, json: { ok: true } },
  });
  const quiet = () => {};
  const r = await activateIfVerified(api, "w1", quiet);
  assert.equal(r.activated, false, "an unverified copy must not be put on a schedule");
  assert.equal(calls.filter((c) => c.method === "POST").length, 0, "refusal means no POST at all");
});

test("activate proceeds when the live copy is the reviewed artifact", async () => {
  const faithful = { ...structuredClone(CADENCE), id: "w1" };
  const { calls, api } = fakeInstance({
    "GET /workflows/w1": { status: 200, json: faithful },
    "GET /workflows": { status: 200, json: { data: [{ id: "w1", name: CADENCE.name }] } },
    "POST /workflows/:verb": { status: 200, json: { ok: true } },
  });
  const r = await activateIfVerified(api, "w1", () => {});
  assert.equal(r.activated, true);
  assert.ok(calls.some((c) => c.method === "POST" && c.path.endsWith("/activate")));
});

test("a name lookup that could mean two workflows stops rather than picking one", async () => {
  const two = [
    { id: "a1", name: "Mobilizon cadence" },
    { id: "b2", name: "mobilizon cadence" },
  ];
  const { api } = fakeInstance({ "GET /workflows": { status: 200, json: { data: two } } });
  await assert.rejects(() => idOrName(api, CADENCE.name), /2 workflows are named exactly|near matches/);
});

test("a repo key names the reviewed workflow, so `verify heartbeat` cannot select the wrong canvas copy", async () => {
  const { api } = fakeInstance({
    "GET /workflows": { status: 200, json: { data: [
      { id: "w1", name: WATCHER.name },
      { id: "h1", name: HEARTBEAT.name },
      { id: "x9", name: "Mobilizon cadence experiment" },   // someone's hand copy; must never be selected by a key
    ] } },
  });
  assert.equal((await idOrName(api, "watcher")).id, "w1");
  assert.equal((await idOrName(api, "heartbeat")).id, "h1");
  await assert.rejects(() => idOrName(api, "heatbeat"), /near matches|no exact match/);
});

test("both artifacts are reachable by name, so the probe is not a second-class file", () => {
  assert.equal(artifacts.cadence.doc.name, CADENCE.name);
  assert.equal(artifacts.probe.doc.name, PROBE.name);
  for (const art of Object.values(artifacts)) {
    assert.ok(art.file.endsWith(".json"));
    assert.ok(Array.isArray(art.doc.nodes) && art.doc.nodes.length > 0);
  }
});

// ------------------------------------------------------------------ four artifacts, and the link (D206)

test("all four reviewed artifacts are reachable by name, so the watcher and heartbeat are not second-class files", () => {
  assert.deepEqual(Object.keys(artifacts).sort(), ["cadence", "heartbeat", "probe", "watcher"]);
  for (const art of Object.values(artifacts)) {
    assert.ok(art.file.endsWith(".json"));
    assert.ok(Array.isArray(art.doc.nodes) && art.doc.nodes.length > 0);
    assert.equal(expectedFor(art.doc).name, art.doc.name, `${art.key} must resolve from its own canvas name`);
    // The rule that keeps a dry run readable applies to every artifact that runs on this box (D201).
    assert.equal(importBody(art.doc).settings.saveManualExecutions, true, `${art.key}: the packaged default is false`);
  }
});

test("a copy named something this repo does not know is an error, not the cadence by default", () => {
  // The bug this closes: `name === PROBE.name ? PROBE : CADENCE` checked the watcher's bytes against the
  // cadence's safety invariants and reported a clean watcher as drift.
  assert.throws(() => expectedFor({ name: "Mobilizon cadence - edited in the UI" }), /no reviewed artifact is named/);
  assert.throws(() => expectedFor({ name: "Mobilizon cadence - edited in the UI" }), /cadence = /);
});

/** A mutable fake: `linkWorkflow` reads the workflow back, and a static script cannot show a write taking effect. */
function mutableInstance(store) {
  const calls = [];
  const ok = (json) => ({ ok: true, status: 200, text: async () => JSON.stringify(json) });
  const fetchImpl = async (url, init = {}) => {
    const method = init.method ?? "GET";
    const path = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/api\/v1/, "");
    const id = (path.match(/^\/workflows\/([^?]+)/) ?? [])[1];
    calls.push({ method, path, body: init.body ? JSON.parse(init.body) : undefined });
    if (method === "GET" && id && store[id]) return ok(store[id]);
    if (method === "GET") return ok({ data: Object.values(store) });
    if (method === "PUT" && id && store[id]) {
      const body = JSON.parse(init.body);
      for (const k of ["id", "active", "versionId", "activeVersionId", "createdAt", "updatedAt"]) {
        if (k in body) throw new Error(`the wire body still carries ${k}`);
      }
      store[id] = { ...store[id], ...body, id };
      return ok(store[id]);
    }
    return { ok: false, status: 404, text: async () => JSON.stringify({ message: "not found" }) };
  };
  return { calls, api: makeApi({ fetchImpl, key: "tk_test-never-a-real-key" }), store };
}

// A copy as the door returns it. `activeVersionId` is present because a published copy has one; the guard in
// linkWorkflow refuses to point failures at a copy that has never been published, so a fixture without it would
// be testing that guard rather than the link.
const live = (doc, id) => ({
  ...structuredClone(doc), id, active: false, versionId: "v1", activeVersionId: "av1",
  updatedAt: "2026-11-05T00:00:00.000Z",
});

test("link writes only the error-workflow id into the watched copy's settings, and reads it back", async () => {
  const f = mutableInstance({ W1: live(CADENCE, "W1"), W2: live(artifacts.watcher.doc, "W2") });
  const r = await linkWorkflow(f.api, "W1", "W2", () => {});
  assert.equal(r.linked, true, `the id did not survive the round trip (got ${JSON.stringify(r.got)})`);
  const put = f.calls.find((c) => c.method === "PUT");
  assert.equal(put.body.settings.errorWorkflow, "W2");
  // Everything that decides behaviour is still the reviewed bytes: a settings write must not be a re-telling.
  assert.deepEqual(put.body.nodes, CADENCE.nodes);
  assert.deepEqual(put.body.connections, CADENCE.connections);
  assert.equal(put.body.settings.executionOrder, CADENCE.settings.executionOrder);
  assert.equal(put.body.name, CADENCE.name);
});

test("link refuses a self-watch, an unverified watcher, and a watched copy it does not recognise - and never PUTs", async () => {
  const self = mutableInstance({ W1: live(CADENCE, "W1") });
  const a = await linkWorkflow(self.api, "W1", "W1", () => {});
  assert.equal(a.linked, false);
  assert.match(a.why, /cannot watch itself/);
  assert.ok(!self.calls.some((c) => c.method === "PUT"), "a self-link was written anyway");

  const dirty = mutableInstance({ W1: live(CADENCE, "W1"), W2: live(artifacts.watcher.doc, "W2") });
  dirty.store.W2.nodes[0].parameters.jsCode += "\n// someone edited this on the canvas";
  const b = await linkWorkflow(dirty.api, "W1", "W2", () => {});
  assert.equal(b.linked, false);
  assert.match(b.why, /not the reviewed watcher/);
  assert.ok(!dirty.calls.some((c) => c.method === "PUT"), "the cadence was pointed at a hand-edited watcher");

  // A watcher that is on the canvas but has never been published cannot be named an error workflow: the door
  // answers that with `400 The selected error workflow has no published version.` (measured 2026-11-05, on the
  // first live link). Refusing here is what turns that 400 into an instruction.
  const unpub = mutableInstance({ W1: live(CADENCE, "W1"), W2: live(artifacts.watcher.doc, "W2") });
  delete unpub.store.W2.activeVersionId;
  const c = await linkWorkflow(unpub.api, "W1", "W2", () => {});
  assert.equal(c.linked, false);
  assert.match(c.why, /no published version/);
  assert.ok(!unpub.calls.some((x) => x.method === "PUT"), "an unpublished watcher was made an error workflow anyway");

  const unknown = mutableInstance({ W1: live(CADENCE, "W1"), W2: live(artifacts.watcher.doc, "W2"), W3: { ...live(CADENCE, "W3"), name: "cadence - copy 2" } });
  await assert.rejects(() => linkWorkflow(unknown.api, "W3", "W2", () => {}), /no reviewed artifact is named/);
  assert.ok(!unknown.calls.some((c) => c.method === "PUT"), "a hand-named copy was re-wired by this tool");
});

test("linking an already-linked cadence writes nothing", async () => {
  const f = mutableInstance({ W1: live(CADENCE, "W1"), W2: live(artifacts.watcher.doc, "W2") });
  f.store.W1.settings.errorWorkflow = "W2";
  const out = [];
  const r = await linkWorkflow(f.api, "W1", "W2", (s) => out.push(s));
  assert.equal(r.linked, true, JSON.stringify(out));
  assert.equal(r.unchanged, true, "a second link reported a change it did not make");
  assert.ok(!f.calls.some((c) => c.method === "PUT"),
    "the second link bumped the version counter for nothing - a person re-runs this to check they got it right");
});

test("a linked error workflow is judged by what it resolves to, not left as an unexplained difference", () => {
  const WATCHER = artifacts.watcher.doc;
  const linked = structuredClone(CADENCE);
  linked.settings.errorWorkflow = "W2";
  // `report` is what `verify` and `link` run; the ctx is what those commands build from the instance's own list.
  const say = (ctx) => {
    const lines = [];
    const r = report(linked, CADENCE, (s) => lines.push(s), ctx);
    return { r, lines: lines.join("\n") };
  };

  // The reviewed watcher: a note, because the link is supposed to be there and no artifact can carry it.
  const ours = say({ errorWorkflowName: WATCHER.name });
  assert.equal(ours.r.clean, true, ours.lines);
  assert.match(ours.lines, /the reviewed watcher/);

  // Some other workflow - possibly a hand-made copy holding a plaintext token (D206).
  const foreign = say({ errorWorkflowName: "someone's scratch workflow" });
  assert.equal(foreign.r.clean, false, foreign.lines);
  assert.match(foreign.lines, /a workflow this repo does not review/);

  // An id this mode cannot ask about (an offline verify): say so, do not invent a verdict.
  const unknown = say({});
  assert.equal(unknown.r.clean, true, unknown.lines);
  assert.match(unknown.lines, /cannot ask the instance/);

  // A live verify asked, and the instance has no such workflow: the link points nowhere.
  const dangling = say({ errorWorkflowName: null, errorWorkflowLookedUp: true });
  assert.equal(dangling.r.counts.warn, 1, dangling.lines);
  assert.match(dangling.lines, /no workflow on this instance answers to that id/);
});

test("a copy the instance says is ACTIVE can still be read, changed and sent back", () => {
  // Measured 2026-11-05: this check killed the first attempt to link the watcher, because a published watcher is
  // active and `GET /workflows/{id}` reports that. A tool that cannot round-trip a live copy cannot maintain one.
  const running = { ...structuredClone(artifacts.watcher.doc), id: "W2", active: true, activeVersionId: "av1", versionCounter: 4 };
  const body = importBody(running, { fromInstance: true });
  assert.ok(!("active" in body), "the wire body re-declares running state, which is the server's to set");
  assert.ok(!("versionCounter" in body) && !("activeVersionId" in body));
  assert.deepEqual(body.nodes, artifacts.watcher.doc.nodes);
  // The same bytes from a file on disk are a different question, and the answer is still no.
  assert.throws(() => importBody({ ...artifacts.watcher.doc, active: true }), /declares active:true/);
});

test("link works when the watcher is published (active), which is the state a working link requires", async () => {
  const f = mutableInstance({ W1: live(CADENCE, "W1"), W2: live(artifacts.watcher.doc, "W2") });
  f.store.W2.active = true;                       // published watchers are active on n8n 2.x
  const r = await linkWorkflow(f.api, "W1", "W2", () => {});
  assert.equal(r.linked, true, "the link died on the active-copy check the round trip needs to survive");
  assert.equal(f.store.W1.settings.errorWorkflow, "W2");
});
