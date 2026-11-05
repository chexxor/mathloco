#!/usr/bin/env node
/**
 * n8n-api.mjs - carry **these bytes** onto the instance over n8n's public REST API, then read them back.
 *
 *   node integrations/mobilizon-cadence/n8n-api.mjs status                    # what the instance holds, by name
 *   node integrations/mobilizon-cadence/n8n-api.mjs verify <id|name>          # the live copy vs the reviewed artifact
 *   node integrations/mobilizon-cadence/n8n-api.mjs push [cadence|probe]      # import it (inactive), verify what came back
 *   node integrations/mobilizon-cadence/n8n-api.mjs update <id> [cadence|probe]
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
import { verifyDocument, fingerprint, CADENCE, PROBE } from "./verify-import.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const config = await import(new URL("./series.config.mjs", import.meta.url).href);
const BASE = (process.env.N8N_URL ?? "https://n8n.labradorius.com").replace(/\/$/, "");
const API = "/api/v1";

/** Fields the live spec marks `readOnly`, or otherwise owns. Sending them is at best ignored and at worst accepted
 *  as an instruction arriving from outside the review - `active: true` here would schedule an unverified workflow
 *  at the moment of import, and the artifact's `tags` is a list of *names* while the API's is a list of objects. */
export const SERVER_OWNED = new Set([
  "id", "active", "activeVersionId", "createdAt", "updatedAt", "isArchived", "versionId", "triggerCount",
  "nodeGroups", "staticData", "projectId", "parentFolderId", "meta", "tags", "shared", "activeVersion", "description",
]);

export const artifacts = {
  cadence: { doc: CADENCE, file: "n8n/cadence-workflow.json" },
  probe: { doc: PROBE, file: "n8n/env-probe.json" },
};

/** The body that goes on the wire: the reviewed document minus the server-owned fields. Everything that decides
 *  behaviour - every node, wire, condition and setting - is untouched. */
export function importBody(artifact) {
  // Checked before the strip list, not after: `active` is server-owned precisely because a caller must not set it,
  // and silently dropping an `active: true` would hide the fact that something asked for a live schedule.
  if (artifact.active === true) throw new Error("importBody: the artifact declares active:true - activation is a separate, explicit command (activateIfVerified)");
  const body = {};
  for (const [k, v] of Object.entries(artifact)) if (!SERVER_OWNED.has(k)) body[k] = v;
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
  try {
    const w = await api.getWorkflow(arg);
    if (w?.id) return w;
  } catch { /* not an id (or not found by id): fall through to the name search */ }
  const { exact, all } = await findByName(api, arg);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new Error(`${exact.length} workflows are named exactly "${arg}" - use the id`);
  if (all.length) throw new Error(`no exact match for "${arg}"; near matches: ${all.map((w) => `${w.id} ${w.name}`).join(" | ")}`);
  return null;
}

/** Run the transport checker over a live copy and summarise it. Same function `verify-import.mjs` runs on a
 *  hand-downloaded export, so "verified" means one thing in this repo. */
export function report(doc, expected, log = console.log) {
  const res = verifyDocument(doc, expected);
  const counts = { fatal: 0, drift: 0, warn: 0, note: 0 };
  for (const f of res.findings) counts[f.sev]++;
  for (const f of res.findings) log(`  ${f.sev.toUpperCase().padEnd(5)} ${f.where}: ${f.what}`);
  const clean = counts.fatal + counts.drift === 0;
  log(`  ${counts.fatal} fatal, ${counts.drift} drift, ${counts.warn} warn, ${counts.note} note - ${clean ? "the reviewed artifact" : "NOT the reviewed artifact"}`);
  return { ...res, counts, clean };
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
  const expected = doc.name === PROBE.name ? PROBE : CADENCE;
  log(`verifying the live copy before activating ${w.id} "${doc.name}":`);
  const r = report(doc, expected, log);
  if (!r.clean) return { activated: false, why: "the live copy is not the reviewed artifact - fix it in the repo, rebuild, update, re-verify (D184)" };
  if (doc.name === CADENCE.name) {
    log(config.RUN.dryRun
      ? "  note: series.config.mjs says dryRun:true - an activated cadence computes, reports and writes nothing (the shipped posture)"
      : "  WARNING: series.config.mjs says dryRun:false - activating this copy schedules real writes to Mobilizon");
  }
  await api.activate(w.id);
  return { activated: true, id: w.id };
}

const pickArtifact = (arg) => (arg === "probe" ? artifacts.probe : artifacts.cadence);

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
      const known = w.name === CADENCE.name ? "cadence artifact" : w.name === PROBE.name ? "probe artifact" : "not ours";
      console.log(`  ${w.id}  ${(w.activeVersionId ? "ACTIVE" : "inactive").padEnd(9)} ${known.padEnd(16)} ${w.name}`);
    }
    return;
  }

  if (cmd === "verify") {
    const w = await idOrName(api, args[1]);
    if (!w) throw new Error(`no workflow matching "${args[1]}"`);
    const doc = await api.getWorkflow(w.id);
    const expected = doc.name === PROBE.name ? PROBE : CADENCE;
    console.log(`live copy ${w.id} "${doc.name}" against ${expected.name}:`);
    process.exit(report(doc, expected).clean ? 0 : 1);
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
        console.log(`  node integrations/mobilizon-cadence/n8n-api.mjs update ${plan.existing.id} ${args[1] ?? "cadence"}`);
        console.log("  (refusing to leave two same-named workflows on the canvas - the guide's warning, enforced)");
        process.exit(1);
      }
      saved = await api.createWorkflow(body);
    } else {
      const target = await idOrName(api, args[1]);
      if (!target) throw new Error(`no workflow matching "${args[1]}"`);
      saved = await api.updateWorkflow(target.id, body);
    }
    console.log(`${cmd === "push" ? "created" : "updated"} ${saved.id} "${saved.name}" - ${saved.activeVersionId ? "ACTIVE" : "inactive: nothing fires until you activate it"}`);
    console.log("read back and checked against the reviewed artifact:");
    const r = report(await api.getWorkflow(saved.id), art.doc);
    process.exit(r.clean ? 0 : 1);
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
       push [cadence|probe]            import the artifact - it lands inactive - and verify what came back
       update <id|name> [cadence|probe] replace an existing copy with the reviewed bytes
       activate <id|name>              only after the live copy verifies (it refuses otherwise)
       deactivate <id|name>

Needs N8N_API_KEY in the shell (Settings -> n8n API -> Create; the value never enters the repo, D177). Reading and
checking is safe. \`activate\` is the one command that puts a schedule on the instance.`);
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  main().catch((e) => { console.error(`n8n-api: ${e.message}`); process.exit(1); });
}
