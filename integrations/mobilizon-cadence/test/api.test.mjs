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
} from "../n8n-api.mjs";
import { CADENCE, PROBE } from "../verify-import.mjs";

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
  await assert.rejects(() => idOrName(api, "cadence"), /near matches/);
});

test("both artifacts are reachable by name, so the probe is not a second-class file", () => {
  assert.equal(artifacts.cadence.doc.name, CADENCE.name);
  assert.equal(artifacts.probe.doc.name, PROBE.name);
  for (const art of Object.values(artifacts)) {
    assert.ok(art.file.endsWith(".json"));
    assert.ok(Array.isArray(art.doc.nodes) && art.doc.nodes.length > 0);
  }
});
