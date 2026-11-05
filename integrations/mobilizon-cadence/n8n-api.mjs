#!/usr/bin/env node
/**
 * n8n-api.mjs - carry **these bytes** onto the instance over n8n's public REST API, then read them back.
 *
 *   node integrations/mobilizon-cadence/n8n-api.mjs status                    # what the instance holds, by name
 *   node integrations/mobilizon-cadence/n8n-api.mjs verify <id|name>          # the live copy vs the reviewed artifact
 *   node integrations/mobilizon-cadence/n8n-api.mjs push [cadence|probe|watcher|heartbeat]
 *   node integrations/mobilizon-cadence/n8n-api.mjs update <id> [cadence|probe|watcher|heartbeat]
 *   node integrations/mobilizon-cadence/n8n-api.mjs link <watched id|name> <watcher id|name>
 *   node integrations/mobilizon-cadence/n8n-api.mjs activate <id|name]        # only if the live copy verifies
 *   node integrations/mobilizon-cadence/n8n-api.mjs deactivate <id|name>
 *
 * Why this file exists (D203; operator rulings 2026-11-05 "2a" and "4a"). Two doors reach this instance and they
 * do different jobs:
 *
 *   - **REST carries the artifact.** The reviewed `n8n/cadence-workflow.json` is the thing under review, so the
 *     thing that must land on the canvas is its bytes, not a re-telling of them. `POST /api/v1/workflows` takes
 *     required `{name, nodes, connections, settings}` - the same top-level shape as the artifact. That contract is
 *     not remembered from memory: it is read off **this instance's own OpenAPI**, served unauthenticated at
 *     `GET /api/v1/docs/swagger-ui-init.js` (measured 2026-11-05: `n8n Public API` 1.1.1, 107 paths; the spec is
 *     embedded in that JS, and `/api/v1/docs/*` itself answers 200 SPA-HTML for anything).
 *   - **MCP runs and reads** (`.notes/runbooks/n8n-runtime-loop.md`, D197/D201). This instance's public API has no
 *     manual-run endpoint (`/workflows/{id}/run` is not in its 107 paths), so firing a dry run and reading its
 *     execution stays on the MCP door. And MCP's creation path is SDK code, not JSON: creating through MCP would
 *     mean re-authoring the artifact - a second copy of the config in the repo, which is the D184 failure this
 *     design refuses.
 *
 * What it refuses, and where each refusal is proven (test/api.test.mjs):
 *   - it never activates a copy that has not verified: `activateIfVerified` fetches the live document, runs the
 *     same checker as `verify-import.mjs`, and refuses on any fatal or drift. Activating an unverified copy puts a
 *     schedule on a live calendar.
 *   - it never creates a second workflow with the same name: `push` looks the name up first and points at `update`
 *     instead (the operator guide's duplicate warning is real).
 *   - the body that goes on the wire is the artifact minus the fields the spec marks `readOnly` - and the test
 *     asserts the two lists agree, so a new server-owned field cannot quietly become an instruction.
 *
 * Credentials: `$N8N_API_KEY` in the shell. The name is tracked, the value never is (D177); on the operator's box
 * the value lives in `.notes/n8n-public-api-token` (host-local, 0600). If it answers 401, the key is stale rather
 * than the API disabled - `/api/v1/ping` 404s while real routes 401 (D198).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyDocument, fingerprint, CADENCE, PROBE, BASELINES, baselineFor } from "./verify-import.mjs";

// Re-exported so a caller (the tests, a future CI step) judges a live copy through exactly the door the CLI
// verbs judge through - one comparison, not two that can drift.
export { verifyDocument, fingerprint };

const here = fileURLToPath(new URL(".", import.meta.url));
const config = await import(new URL("./series.config.mjs", import.meta.url).href);
const BASE = (process.env.N8N_URL ?? "https://n8n.labradorius.com").replace(/\/$/, "");
const API = "/api/v1";

/** Fields the live spec marks `readOnly`, or otherwise owns. Sending them is at best ignored and at worst accepted
 *  as an instruction arriving from outside the review - `active: true` here would schedule an unverified workflow
 *  at the moment of import, and the artifact's `tags` is a list of *names* while the API's is a list of objects.
 *
 *  The last three are not in the spec at all. They came back on a `GET /workflows/{id}`, and the first live
 *  `PUT /workflows/{id}` (the link, 2026-11-05) answered
 *  `400 request/body Unrecognized key(s) in object: 'versionCounter', 'sourceWorkflowId', 'parentFolder'` - the
 *  price of sending a live document back to the door. Anything the door hands out that it does not accept back
 *  belongs here, so a round trip stays possible without anyone re-reading the 400. */
export const SERVER_OWNED = new Set([
  "id", "active", "activeVersionId", "createdAt", "updatedAt", "isArchived", "versionId", "triggerCount",
  "nodeGroups", "staticData", "projectId", "parentFolderId", "meta", "tags", "shared", "activeVersion", "description",
  "versionCounter", "sourceWorkflowId", "parentFolder",
]);

/** The top-level keys the door's own schema accepts in a create/update body (@measured 2026-11-05 from the
 *  instance's spec: `createWorkflow` / `updateWorkflow` requestBody). The door rejects anything outside a list like
 *  this without saying what it wanted, so the list is checked here - before the call, with the keys named. */
export const BODY_ALLOWED = new Set([
  "name", "nodes", "connections", "settings", "pinData", "staticData", "tags", "meta", "parentFolderId",
  "projectId", "nodeGroups", "active", "description",
]);

/**
 * The settings keys this door accepts - read off **the instance's own** spec
 * (`components/schemas/workflowPublicDto.generated/properties/settings`, n8n 2.45.7 / Public API 1.1.1,
 * @measured 2026-11-05 with `.notes/bin/n8n-openapi.mjs save`).
 *
 * Why the list lives here: the first live `POST /api/v1/workflows` answered
 * `400 request/body/settings Unrecognized key(s) in object: 'savePreExecutionData'` - a key D201 had put in
 * `RETENTION`, which every artifact was therefore carrying, and the push failed for all four at once. A strict door
 * is a gift, but only if the strictness is known before the call: this turns that 400 into a message naming the
 * key and the accepted set, with nothing half-written on the canvas. A key the door cannot carry cannot live in
 * the artifact either - file, wire and canvas are one set of bytes (D203) - which is why the fix was to drop it
 * from `series.config.mjs`, not to filter it here.
 */
export const SETTINGS_ALLOWED = new Set([
  "availableInMCP", "binaryMode", "callerIds", "callerPolicy", "credentialResolverId", "customTelemetryTags",
  "errorWorkflow", "executionOrder", "executionTimeout", "redactionPolicy", "saveDataErrorExecution",
  "saveDataSuccessExecution", "saveExecutionProgress", "saveManualExecutions", "timeSavedMode",
  "timeSavedPerExecution", "timezone",
]);

export const artifacts = Object.fromEntries(BASELINES.map((b) => [b.key, { doc: b.doc, file: b.file, build: b.build }]));

/** Which baseline a live copy is supposed to match, resolved from its own name. Refusing an unknown name is the
 *  point: the old `name === PROBE.name ? PROBE : CADENCE` would have checked the error watcher's bytes against
 *  the cadence's safety invariants and called a clean watcher drift (D206). */
export function expectedFor(doc) {
  const b = baselineFor(doc?.name ?? "");
  if (!b) {
    throw new Error(`no reviewed artifact is named ${JSON.stringify(doc?.name)}. Known: ${BASELINES.map((x) => `${x.key} = ${x.doc.name}`).join(", ")} - a copy on the canvas with a name this repo does not know is a copy someone made by hand (D184)`);
  }
  return b.doc;
}

/** The body that goes on the wire: the reviewed document minus the server-owned fields. Everything that decides
 *  behaviour - every node, wire, condition and setting - is untouched.
 *
 *  `fromInstance` distinguishes two things that look identical and are not: an artifact on disk that declares
 *  `active: true` is smuggling a schedule onto the wire and is refused outright, while a copy read back from the
 *  door carries its own running state - and read-one-field-change-send-back is the only round trip `link` and a
 *  live `update` have. Measured 2026-11-05: the first attempt to link the *watcher* died on this very check,
 *  because a published watcher is active and `GET /workflows/{id}` says so. The strip list removes `active` in
 *  both cases, so activation stays a separate, explicit command either way. */
export function importBody(artifact, { fromInstance = false } = {}) {
  if (artifact.active === true && !fromInstance) {
    throw new Error("importBody: the artifact declares active:true - activation is a separate, explicit command (activateIfVerified), never a side effect of an import (D209)");
  }
  // Strict about `settings` before the POST, because the instance is: an unknown key is a 400 that names nothing
  // useful at the far end, and by then a workflow may already have been created.
  const unknownSettings = Object.keys(artifact.settings ?? {}).filter((k) => !SETTINGS_ALLOWED.has(k));
  if (unknownSettings.length) {
    throw new Error(
      `importBody: settings keys this n8n build cannot carry: ${unknownSettings.join(", ")}. ` +
        `The door accepts ${SETTINGS_ALLOWED.size}: ${[...SETTINGS_ALLOWED].sort().join(", ")}. ` +
        "Drop the key from the artifact rather than filtering it here (D203).",
    );
  }
  const body = {};
  for (const [k, v] of Object.entries(artifact)) if (!SERVER_OWNED.has(k)) body[k] = v;
  const extra = Object.keys(body).filter((k) => !BODY_ALLOWED.has(k));
  if (extra.length) {
    throw new Error(
      `importBody: body keys this n8n build does not accept: ${extra.join(", ")}. ` +
        `The body schema takes: ${[...BODY_ALLOWED].sort().join(", ")}. ` +
        "If the door handed these back on a GET, add them to SERVER_OWNED rather than sending them home again.",
    );
  }
  return body;
}

/** A thin REST client. `fetchImpl` is injectable so the tests never touch the network. */
export function makeApi({ fetchImpl = fetch, base = BASE, key = process.env.N8N_API_KEY } = {}) {
  const call = async (method, path, body, extraHeaders = {}) => {
    const res = await fetchImpl(`${base}${API}${path}`, {
      method,
      headers: { "content-type": "application/json", ...(key ? { "X-N8N-API-KEY": key } : {}), ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* an HTML body means a proxy answered, not the API */ }
    if (!res.ok) {
      const why = res.status === 401
        ? "the key is not validating - stale, deleted, or minted before an instance-secret rotation (D198). Re-mint it: Settings -> n8n API -> Create, then export N8N_API_KEY=..."
        : !json && /<\s*(html|!doctype)/i.test(text)
          ? "an HTML body answered: a proxy, not the API (the YunoHost SSO did exactly this until 2026-11-05, D196)"
          : res.status === 404
            ? "no such route. Unknown paths under /api/v1 404 while the SPA 200s elsewhere - check the path against the instance's own spec at GET /api/v1/docs/swagger-ui-init.js"
            : text.slice(0, 300);
      throw new Error(`${method} ${API}${path} -> ${res.status}: ${why}`);
    }
    if (!json) throw new Error(`${method} ${API}${path} -> ${res.status} but the body is not JSON: a proxy or the SPA fallback answered, not the API`);
    return json;
  };
  return {
    listWorkflows: (query = "") => call("GET", `/workflows${query}`),
    getWorkflow: (id) => call("GET", `/workflows/${encodeURIComponent(id)}`),
    // Idempotency-Key, derived from the artifact's own fingerprint: n8n documents retrying a POST with the same
    // key (docs.n8n.io "Idempotency", read 2026-11-05). A timed-out import POST is exactly the case where a
    // blind retry would leave two copies on the canvas, which is the duplicate this file already refuses.
    createWorkflow: (body, idempotencyKey = fingerprint(body)) => call("POST", "/workflows", body, { "idempotency-key": idempotencyKey }),
    updateWorkflow: (id, body) => call("PUT", `/workflows/${encodeURIComponent(id)}`, body),
    activate: (id) => call("POST", `/workflows/${encodeURIComponent(id)}/activate`),
    deactivate: (id) => call("POST", `/workflows/${encodeURIComponent(id)}/deactivate`),
    archive: (id) => call("POST", `/workflows/${encodeURIComponent(id)}/archive`),
  };
}

/** `?name=` is a contains-match on this API, so filtering is a narrowing step and equality is done here. */
export async function findByName(api, name) {
  const page = await api.listWorkflows(`?name=${encodeURIComponent(name)}&excludePinnedData=true`);
  const all = page.data ?? [];
  return { exact: all.filter((w) => w.name === name), all };
}

/** An id or a name, resolved the long way round: an unknown id simply misses, and a name may match several. */
export async function idOrName(api, arg) {
  if (!arg) throw new Error("missing a workflow id or name");
  // A repo key is a name this repo controls, so resolve it to the reviewed name first: `verify heartbeat` means the
  // reviewed heartbeat, and a typo (`heatbeat`) falls through to the ordinary near-match refusal rather than a
  // silent null. Ids still work, and they are what the near-match messages print for exactly this reason.
  const name = artifacts[arg] ? artifacts[arg].doc.name : arg;
  try {
    const w = await api.getWorkflow(arg);
    if (w?.id) return w;
  } catch { /* not an id (or not found by id): fall through to the name search */ }
  const { exact, all } = await findByName(api, name);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new Error(`${exact.length} workflows are named exactly "${name}" - use the id`);
  if (all.length) throw new Error(`no exact match for "${name}"; near matches: ${all.map((w) => `${w.id} ${w.name}`).join(" | ")}`);
  return null;
}

/** Run the transport checker over a live copy and summarise it. Same function `verify-import.mjs` runs on a
 *  hand-downloaded export, so "verified" means one thing in this repo. `ctx` carries what only a live call can
 *  know - today, the name behind `settings.errorWorkflow` (D206) - so the checker can say *who* is watching
 *  rather than reporting a link as an unexplained difference. */
export function report(doc, expected, log = console.log, ctx = {}) {
  const res = verifyDocument(doc, expected, ctx);
  const counts = { fatal: 0, drift: 0, warn: 0, note: 0 };
  for (const f of res.findings) counts[f.sev]++;
  for (const f of res.findings) log(`  ${f.sev.toUpperCase().padEnd(5)} ${f.where}: ${f.what}`);
  const clean = counts.fatal + counts.drift === 0;
  log(`  ${counts.fatal} fatal, ${counts.drift} drift, ${counts.warn} warn, ${counts.note} note - ${clean ? "the reviewed artifact" : "NOT the reviewed artifact"}`);
  return { ...res, counts, clean };
}

/** The name behind a linked error workflow, so a link can be judged rather than merely printed (D206): pointing at
 *  the reviewed watcher is expected, pointing at a workflow this repo does not review is drift. A watcher whose id
 *  no longer resolves is the other half - the cadence is then watching nothing. */
export async function ctxFor(api, doc) {
  const id = doc?.settings?.errorWorkflow;
  if (!id) return {};
  try {
    const w = await api.getWorkflow(id);
    return { errorWorkflowName: w?.name ?? null, errorWorkflowLookedUp: true };
  } catch {
    return { errorWorkflowName: null, errorWorkflowLookedUp: true };
  }
}

/** The duplicate guard, as a function so a test can plant a same-named workflow and require the refusal. */
export async function planPush(api, art) {
  const { exact } = await findByName(api, art.doc.name);
  if (exact.length) {
    return { create: false, existing: exact[0], why: `"${art.doc.name}" already exists as ${exact[0].id} (${exact[0].activeVersionId ? "ACTIVE" : "inactive"}) - updating it rather than creating a second copy` };
  }
  return { create: true };
}

/** Activate, but never an unverified copy. Returns rather than exiting, so the refusal is testable. */
export async function activateIfVerified(api, arg, log = console.log) {
  const w = await idOrName(api, arg);
  if (!w) return { activated: false, why: `no workflow matching "${arg}"` };
  const doc = await api.getWorkflow(w.id);
  const expected = expectedFor(doc);
  log(`verifying the live copy before activating ${w.id} "${doc.name}":`);
  const r = report(doc, expected, log, await ctxFor(api, doc));
  if (!r.clean) return { activated: false, why: "the live copy is not the reviewed artifact - fix it in the repo, rebuild, update, re-verify (D184)" };
  if (doc.name === CADENCE.name) {
    log(config.RUN.dryRun
      ? "  note: series.config.mjs says dryRun:true - an activated cadence computes, reports and writes nothing (the shipped posture)"
      : "  WARNING: series.config.mjs says dryRun:false - activating this copy schedules real writes to Mobilizon");
  }
  if (doc.name === artifacts.watcher.doc.name) {
    log("  note: a watcher has no schedule of its own - nothing fires until a watched workflow names it in settings.errorWorkflow (the link command, or Settings -> Error Workflow)");
  }
  await api.activate(w.id);
  return { activated: true, id: w.id };
}

/**
 * Point one workflow's `settings.errorWorkflow` at another (D206).
 *
 * This is the half the artifact cannot carry: the value is an **instance-local id**, so a committed id would be
 * wrong on the next box, and a committed *name* is not what the field takes. Both halves are verified before the
 * write - the watcher, because wiring the cadence to a scratch workflow would look like alerting and be nothing,
 * and the watched copy, because `expectedFor` refuses a copy this repo does not recognise. A workflow pointed at
 * itself is how a watcher ends up watching nothing: n8n does not re-trigger on an error workflow's own failure.
 */
export async function linkWorkflow(api, watchedArg, watcherArg, log = console.log) {
  const watched = await idOrName(api, watchedArg);
  if (!watched) return { linked: false, why: `no workflow matching "${watchedArg}"` };
  const watcher = await idOrName(api, watcherArg);
  if (!watcher) return { linked: false, why: `no workflow matching "${watcherArg}"` };
  if (watcher.id === watched.id) {
    return { linked: false, why: "a workflow cannot watch itself - n8n does not re-trigger on an error workflow's own failure, so a self-link is silence with a setting attached (D206)" };
  }
  const wdoc = await api.getWorkflow(watcher.id);
  log(`verifying the watcher before anything points at it (${wdoc.name}):`);
  const r = report(wdoc, expectedFor(wdoc), log, await ctxFor(api, wdoc));
  if (!r.clean) return { linked: false, why: `the copy named "${wdoc.name}" is not the reviewed watcher - fix it in the repo, rebuild, update, re-verify (D184)` };
  if (!wdoc.activeVersionId) {
    // Measured 2026-11-05, first live attempt: the body is accepted, then the door answers
    // `400 The selected error workflow has no published version.` An artifact imported through this API arrives
    // unpublished, and n8n will not point a workflow's failures at a version that does not exist yet.
    return { linked: false, why: `"${wdoc.name}" has no published version, so n8n refuses to point anything's failures at it. Publish it first: POST /workflows/{id}/publish, which this API documents as the successor to /activate ("in n8n v1, this action was termed activating"). For a watcher that is not a second kind of action - it has no schedule, so publishing it fires nothing on its own.` };
  }
  const doc = await api.getWorkflow(watched.id);
  expectedFor(doc);                       // refuses to re-wire a copy this repo does not recognise
  if (String(doc.settings?.errorWorkflow ?? "") === String(watcher.id)) {
    // Running this twice is how someone checks they got it right, so the second run must not bump the version
    // counter for nothing: the instance already holds exactly what was asked for.
    log(`already linked: ${doc.id} "${doc.name}" -> error workflow ${watcher.id} "${watcher.name}" - nothing written`);
    return { linked: true, unchanged: true, id: doc.id, name: doc.name, watcher: watcher.id, watcherName: wdoc.name, got: doc.settings.errorWorkflow };
  }
  const body = importBody({ ...doc, settings: { ...(doc.settings ?? {}), errorWorkflow: watcher.id } }, { fromInstance: true });
  await api.updateWorkflow(watched.id, body);
  const after = await api.getWorkflow(watched.id);
  const got = after.settings?.errorWorkflow;
  return { linked: got === watcher.id, id: watched.id, name: doc.name, watcher: watcher.id, watcherName: wdoc.name, got };
}

const pickArtifact = (arg) => {
  if (arg === undefined || arg === "cadence") return artifacts.cadence;
  const a = artifacts[arg];
  if (!a) throw new Error(`unknown artifact "${arg}" - this repo reviews: ${Object.keys(artifacts).join(", ")} (the name is the fourth field of the usage block)`);
  return a;
};

/** The artifact on disk must be what the generators produce today - otherwise the file this command imports is not
 *  the file check.mjs tested (the same drift rule build-workflow.mjs applies to itself). */
function artifactOnDisk(art) {
  const onDisk = JSON.parse(readFileSync(resolve(here, art.file), "utf8"));
  if (JSON.stringify(onDisk) !== JSON.stringify(art.doc)) {
    throw new Error(`${art.file} is not what the baseline in verify-import.mjs describes - run build-workflow.mjs / build-probe.mjs, then check.mjs`);
  }
  return onDisk;
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const api = makeApi();

  if (cmd === "status") {
    const page = await api.listWorkflows("?excludePinnedData=true");
    console.log(`${(page.data ?? []).length} workflow(s) at ${BASE}`);
    for (const w of page.data ?? []) {
      const b = baselineFor(w.name);
      console.log(`  ${w.id}  ${(w.activeVersionId ? "ACTIVE" : "inactive").padEnd(9)} ${(b ? `${b.key} artifact` : "not ours").padEnd(16)} ${w.name}`);
    }
    return;
  }

  if (cmd === "verify") {
    const w = await idOrName(api, args[1]);
    if (!w) throw new Error(`no workflow matching "${args[1]}"`);
    const doc = await api.getWorkflow(w.id);
    const expected = expectedFor(doc);
    console.log(`live copy ${w.id} "${doc.name}" against ${expected.name}:`);
    process.exit(report(doc, expected, console.log, await ctxFor(api, doc)).clean ? 0 : 1);
  }

  if (cmd === "push" || cmd === "update") {
    const art = cmd === "push" ? pickArtifact(args[1]) : pickArtifact(args[2]);
    artifactOnDisk(art);
    const body = importBody(art.doc);
    let saved;
    if (cmd === "push") {
      const plan = await planPush(api, art);
      if (!plan.create) {
        console.log(plan.why);
        console.log(`  node integrations/mobilizon-cadence/n8n-api.mjs update ${plan.existing.id} ${art.key}`);
        console.log("  (refusing to leave two same-named workflows on the canvas - the guide's warning, enforced)");
        process.exit(1);
      }
      saved = await api.createWorkflow(body);
    } else {
      const target = await idOrName(api, args[1]);
      if (!target) throw new Error(`no workflow matching "${args[1]}"`);
      if (target.active) {
        // Saying it, because what is unmeasured is the consequence: a PUT with *different* bytes into a workflow
        // that is firing may change what fires immediately, or only at the next publish. Measured 2026-11-05 with
        // identical bytes on the ACTIVE watcher: `versionCounter` and `activeVersionId` were unchanged, so a
        // no-change update is a no-op on the instance. Different bytes are not measured, so the safe order for a
        // workflow that is live is: update, then re-verify, then decide whether to re-publish.
        console.log(`  NOTE ${target.id} is ACTIVE - this PUT replaces the copy a running schedule is using. Re-verify after it; do not assume the firing version moved (unmeasured for changed bytes).`);
      }
      saved = await api.updateWorkflow(target.id, body);
    }
    console.log(`${cmd === "push" ? "created" : "updated"} ${saved.id} "${saved.name}" - ${saved.activeVersionId ? "ACTIVE" : "inactive: nothing fires until you activate it"}`);
    console.log("read back and checked against the reviewed artifact:");
    const savedDoc = await api.getWorkflow(saved.id);
    const r = report(savedDoc, art.doc, console.log, await ctxFor(api, savedDoc));
    process.exit(r.clean ? 0 : 1);
  }

  if (cmd === "link") {
    const r = await linkWorkflow(api, args[1], args[2]);
    if (r.linked && r.unchanged) return; // exit 0: the answer to "is it linked?" was already yes
    if (r.linked) {
      console.log(`linked ${r.id} "${r.name}" -> error workflow ${r.watcher} "${r.watcherName}"`);
      console.log("  read back from the instance, so this is what the canvas now holds (D206)");
    } else { console.log(`refused: ${r.why}`); process.exit(1); }
    return;
  }

  if (cmd === "activate") {
    const r = await activateIfVerified(api, args[1]);
    if (r.activated) console.log(`activated ${r.id}`);
    else { console.log(`refused: ${r.why}`); process.exit(1); }
    return;
  }

  if (cmd === "deactivate") {
    const w = await idOrName(api, args[1]);
    if (!w) throw new Error(`no workflow matching "${args[1]}"`);
    await api.deactivate(w.id);
    console.log(`deactivated ${w.id}`);
    return;
  }

  console.log(`usage: node integrations/mobilizon-cadence/n8n-api.mjs status
       verify <id|name>                read the live copy, check it against the reviewed artifact
       push [cadence|probe|watcher|heartbeat]
                                     import the artifact - it lands inactive - and verify what came back
       update <id|name> [cadence|probe|watcher|heartbeat]
                                     replace an existing copy with the reviewed bytes
       link <watched> <watcher>       set one workflow's error workflow to another, after both verify (D206)
       activate <id|name>              only after the live copy verifies (it refuses otherwise)
       deactivate <id|name>

<id|name> takes a workflow id, its exact canvas name, or one of the four repo keys (cadence, probe, watcher,
heartbeat) - a key resolves to the reviewed name, so it cannot select a hand-made copy that merely sounds alike.
On n8n 2.x "activate" is the public API's publish ("in n8n v1, this action was termed activating"): an imported
workflow has no published version until this runs, and until it does it cannot be named as an error workflow.

Needs N8N_API_KEY in the shell (Settings -> n8n API -> Create; the value never enters the repo, D177). Reading and
checking is safe. \`activate\` is the one command that puts a schedule on the instance.`);
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  main().catch((e) => { console.error(`n8n-api: ${e.message}`); process.exit(1); });
}
