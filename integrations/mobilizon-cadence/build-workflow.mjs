#!/usr/bin/env node
/**
 * build-workflow.mjs - generates `n8n/cadence-workflow.json` from the sources in this directory.
 *
 *   node integrations/mobilizon-cadence/build-workflow.mjs          # write the artifact
 *   node integrations/mobilizon-cadence/build-workflow.mjs --check  # validate, write nothing, exit 1 on a problem
 *
 * Why a generator at all: n8n stores a workflow as one JSON document, and the parts worth reviewing - the
 * GraphQL documents and the date rules - already exist as reviewable files here. Pasting them into the n8n
 * editor forks them immediately, and three copies of the date rules (the Code node, `simulate.mjs`, the tests)
 * is the exact failure this project cannot afford. So the workflow is built, and the tests execute the built
 * text rather than the source text it came from.
 *
 * The checks at the bottom are not decoration. Each corresponds to a way an n8n workflow fails quietly:
 *   - a Code node that references an undeclared name throws at *execution* time, not import time, so a typo
 *     shows up as a red dot days later;
 *   - two injections declaring the same top-level name in one Code node throw "Identifier has already been
 *     declared" - also at execution time;
 *   - `$('Node name')` pointing at a node that does not exist resolves to undefined and plans nothing;
 *   - `neverError: true` on an HTTP node turns a refused write into a run that looks successful.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const OUT = new URL("./n8n/cadence-workflow.json", import.meta.url);
const CHECK = process.argv.includes("--check");

const READ = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

/** The Code-node sources are ordinary `.js` with injection markers; the imports they would need in Node are
 *  exactly the files being injected, so `export` is the only word that has to go. */
const STRIP = (src) =>
  src.replace(/^export (const|function|class|let|var)\s/gm, "$1 ")
     .replace(/^export\s*\{[^}]*\}\s*$/gm, "")
     .trim();

const INJECTABLE = {
  config: "./series.config.mjs",
  core: "./lib/core.mjs",
  queries: "./lib/queries.mjs",
};

/** Replace each `// @inject <name>` line with the named file's body, rejecting a body that would not parse,
 *  that collides with another injection, or that still contains ESM syntax the sandbox has no use for. */
function expand(nodeSource, nodeLabel) {
  const injectedNames = [];
  const body = nodeSource.replace(/^\/\/ @inject (\w+)\s*$/gm, (_m, what) => {
    const file = INJECTABLE[what];
    if (!file) throw new Error(`${nodeLabel}: unknown @inject "${what}" (known: ${Object.keys(INJECTABLE).join(", ")})`);
    const src = STRIP(READ(file));
    if (/^\s*(import|export)\s/m.test(src)) throw new Error(`${nodeLabel}: injected ${file} still has ESM syntax`);
    for (const m of src.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/gm)) injectedNames.push([m[1], file]);
    return src;
  });
  const seen = new Set();
  for (const [name, file] of injectedNames) {
    if (seen.has(name)) throw new Error(`${nodeLabel}: "${name}" declared by two injections - a Code node would throw "already declared"`);
    seen.add(name);
  }
  try { new Function("$", body); } catch (e) {
    throw new Error(`${nodeLabel}: the generated Code node does not parse: ${e.message}`);
  }
  return body;
}

// ------------------------------------------------------------------ the graph
// `n8nTarget` is the one place to change when the instance updates. typeVersions older than the instance are
// fine; newer ones import as "node not installed", so these are the lowest versions that carry the features
// used here (JSON body + expressions in httpRequest v4, `IF` v2 conditions, Schedule Trigger v1).
const n8nTarget = { httpRequest: 4, code: 2, if: 2, scheduleTrigger: 1 };

const config = await import(new URL("./series.config.mjs", import.meta.url).href);
const { INSTANCE, CREDENTIALS, RUN, SERIES } = config;
const ENDPOINT = `${INSTANCE.baseUrl.replace(/\/$/, "")}${INSTANCE.graphqlPath}`;

const NAMES = {
  schedule: "Trigger every morning",
  cfg: "01 Config",
  history: "02 Read the series history",
  signIn: "03 Sign in",
  plan: "04 Plan & decide",
  gate: "05 Stop if nothing to write",
  create: "06 Create event",
  audit: "07 Audit the date",
  report: "08 Report",
  errPath: "21 Report error path",
  errPlan: "22 Report a problem",
};

/** One expression shape for every GraphQL call: the document and its variables travel on the item, so the
 *  HTTP nodes hold no API text of their own and cannot drift from `lib/queries.mjs`. */
const gqlBody = (exprQuery, exprVars) =>
  `={{ JSON.stringify({ query: ${exprQuery}, variables: ${exprVars} }) }}`;

const FROM01 = `$('${NAMES.cfg}').item.json`;
const FROM03 = `$('${NAMES.signIn}').item.json`;
const FROM04 = `$('${NAMES.plan}').item.json`;
const BEARER = `={{ 'Bearer ' + ${FROM03}.data.login.accessToken }}`;
const HEADERS_PUBLIC = [
  { name: "content-type", value: "application/json" },
  { name: "accept", value: "application/json" },
];
const HEADERS_AUTHED = [...HEADERS_PUBLIC, { name: "Authorization", value: BEARER }];

const nodes = [
  {
    id: "cadence-schedule", name: NAMES.schedule, type: "n8n-nodes-base.scheduleTrigger", typeVersion: n8nTarget.scheduleTrigger,
    position: [-760, -160],
    // 09:00 in the workflow's own timezone (settings.timezone below), not the instance default - so the hour
    // means what a person reading this line thinks it means. The trigger is the only start; "Execute workflow"
    // in the editor runs the same path, which is how a dry run is tested.
    parameters: { rule: { interval: [{ field: "days", triggerAt: "09:00", daysInterval: 1 }] } },
  },
  {
    // Head of the chain. It emits ONE item with the config and the documents, so the plan is deterministic,
    // reviewable in one place, and a dry-run flip is one line in `series.config.mjs` rather than a six-node
    // editing session.
    id: "cadence-config", name: NAMES.cfg, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [-580, -160],
    parameters: { mode: "runOnceForAllItems", jsCode: expand(READ("nodes/01-config.js"), NAMES.cfg) },
  },
  {
    // Public read: a group's event list needs no token on Mobilizon 5.2.4 (measured 2026-11-04), so this node
    // carries no credential at all. Least privilege by construction, and it is the same request `simulate.mjs`
    // makes with zero credentials.
    id: "cadence-history", name: NAMES.history, type: "n8n-nodes-base.httpRequest", typeVersion: n8nTarget.httpRequest,
    position: [-400, -160],
    parameters: {
      method: "POST", url: ENDPOINT, sendQuery: false,
      options: { response: { response: { neverError: false } }, headers: HEADERS_PUBLIC },
      sendBody: true, specifyBody: "json",
      jsonBody: gqlBody(`${FROM01}.query.readSeriesHistory`, `${FROM01}.query.readSeriesHistoryVars`),
    },
  },
  {
    // The only credentialed request, and the only place the password is ever sent. It reads the two values
    // straight from n8n's environment, so the secret is not in the workflow JSON, not in the repo, and not in
    // the config item that every downstream node can see. Mobilizon 5.2.4 offers no long-lived API token and
    // no OAuth client registration (probes in lib/queries.mjs), which is why the workflow signs in per run.
    id: "cadence-signin", name: NAMES.signIn, type: "n8n-nodes-base.httpRequest", typeVersion: n8nTarget.httpRequest,
    position: [-220, -160],
    parameters: {
      method: "POST", url: ENDPOINT, sendQuery: false,
      options: {
        response: { response: { neverError: false } },
        headers: HEADERS_PUBLIC,
        // A refused sign-in should not be retried eight times against an authentication endpoint.
        batching: { enabled: false },
      },
      sendBody: true, specifyBody: "json",
      jsonBody: gqlBody(
        `${FROM01}.query.signIn`,
        `{ email: $env.${CREDENTIALS.emailEnv}, password: $env.${CREDENTIALS.passwordEnv} }`,
      ),
    },
  },
  {
    // The rules. One item per series, each carrying its own decision and (if it decided to write) the exact
    // variables it will send - so "what did it decide" and "what will it send" are one reviewable object.
    id: "cadence-plan", name: NAMES.plan, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [-40, -160],
    parameters: { mode: "runOnceForAllItems", jsCode: expand(READ("nodes/04-plan.js"), NAMES.plan) },
  },
  {
    id: "cadence-gate", name: NAMES.gate, type: "n8n-nodes-base.if", typeVersion: n8nTarget.if,
    position: [140, -160],
    parameters: {
      // `create` is the only action that reaches the write node. A dry run makes the plan say `would_create`,
      // which falls to the false branch - so the dry-run switch is a config line, not a wiring change.
      // This condition block is the one part of the document whose shape depends on the n8n version (IF v2).
      // Importing it into a different n8n version is fine - open the node once and n8n rewrites the block -
      // which is why README (Import) says to check this node first after an import.
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [{
          id: "action-is-create", leftValue: `={{ ${FROM04}.action }}`, filterType: "string",
          operator: { type: "string", operation: "equals" }, rightValue: "create",
        }],
        combinator: "and",
        options: {},
      },
      options: { branchMode: "matchingBranch" },
    },
  },
  {
    id: "cadence-create", name: NAMES.create, type: "n8n-nodes-base.httpRequest", typeVersion: n8nTarget.httpRequest,
    position: [340, -260],
    parameters: {
      method: "POST", url: ENDPOINT, sendQuery: false,
      options: {
        // neverError stays false on purpose: if this request fails the execution must go red, because a red
        // execution is what makes a possible duplicate impossible to miss. Batching retries make a transient
        // network failure self-healing; the plan's dedupe read is what makes a retry safe.
        response: { response: { neverError: false } },
        headers: HEADERS_AUTHED,
      },
      sendBody: true, specifyBody: "json",
      jsonBody: gqlBody(`${FROM01}.query.createEvent`, `${FROM04}.createVars`),
    },
  },
  {
    // Read the date back from the instance. Not a convenience: this is the only evidence, short of a human,
    // that the event the plan described is the event that exists - and that nothing else is on that date.
    id: "cadence-audit", name: NAMES.audit, type: "n8n-nodes-base.httpRequest", typeVersion: n8nTarget.httpRequest,
    position: [540, -260],
    parameters: {
      method: "POST", url: ENDPOINT, sendQuery: false,
      options: { response: { response: { neverError: false } }, headers: HEADERS_AUTHED },
      sendBody: true, specifyBody: "json",
      jsonBody: gqlBody(`${FROM01}.query.auditDateWindow`, `${FROM04}.auditVars`),
    },
  },
  {
    id: "cadence-report", name: NAMES.report, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [760, -160],
    parameters: { mode: "runOnceForAllItems", jsCode: expand(READ("nodes/08-report.js"), NAMES.report) },
  },
  {
    // Failure path. Every stage that can throw points its error output here, and this is the only node in the
    // workflow that reads `$json.error`. It says *which* stage broke, because a red dot on a canvas is not an
    // alert - see README (Alerting).
    id: "cadence-err-path", name: NAMES.errPath, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [60, 180],
    parameters: {
      mode: "runOnceForAllItems",
      jsCode: `// Generated by build-workflow.mjs - the failure reporter. Inlined because it is a dozen lines, and
// it is the only place in this workflow that reads the sandbox's error field.
const stages = [
  ["read", "${NAMES.history}"], ["sign in", "${NAMES.signIn}"], ["plan", "${NAMES.plan}"],
  ["write", "${NAMES.create}"], ["audit", "${NAMES.audit}"], ["report", "${NAMES.report}"],
];
const failed = [];
for (const [label, nodeName] of stages) {
  let item = null;
  try { item = $(nodeName).item; } catch (e) { continue; }   // that stage did not run
  if (item && item.json && item.json.error) failed.push([label, item.json.error]);
}
if (!failed.length) throw new Error('the error branch ran but no stage reported an error - this reporter is out of date');
const first = failed[0][1];
const who = failed.map(([label]) => label).join("+");
return [{ json: {
  ok: false,
  failedAt: failed.map(([label]) => label),
  alertTitle: 'cadence failed at ' + who,
  alertDetail: String(first.message || first).slice(0, 900),
  summary: 'CADENCE PROBLEM: ' + who + ' failed - ' + String(first.message || first).slice(0, 300),
} }];`,
    },
  },
  {
    // A plan that *alerts* (a rename, a clock mismatch, every row cancelled) does not throw - it reports. But a
    // reported alert still has to reach a person, so it is folded into the same failure shape.
    id: "cadence-err-plan", name: NAMES.errPlan, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [340, 180],
    parameters: {
      mode: "runOnceForAllItems",
      jsCode: `// Generated by build-workflow.mjs - a plan that alerts does not throw, so its alert is carried to the same
// place a thrown error goes.
const plans = $('${NAMES.plan}').all().map((i) => i.json).filter((p) => p.action === 'alert');
if (!plans.length) return [{ json: { ok: true, summary: 'no alerts to report' } }];
const lines = plans.map((p) => p.seriesKey + ": " + (p.reason || "alert") + " - " + (p.note || ""));
return [{ json: {
  ok: false,
  failedAt: ['plan'],
  alertTitle: 'cadence paused: ' + plans.map((p) => p.seriesKey).join(', '),
  alertDetail: lines.join('\\n').slice(0, 900),
  summary: 'CADENCE PROBLEM: ' + lines.join('\\n'),
} }];`,
    },
  },
];

const connections = {
  [NAMES.schedule]: { main: [[{ node: NAMES.cfg, type: "main", index: 0 }]] },
  // A config failure has no downstream symptom, so it gets a report too. In `21`, reading `$(01 Config)`
  // will itself fail and fall back to "(could not read the config)" - stated in that node's comment.
  [NAMES.cfg]: { main: [[{ node: NAMES.history, type: "main", index: 0 }]], error: [[{ node: NAMES.errPath, type: "main", index: 0 }]] },
  [NAMES.history]: { main: [[{ node: NAMES.signIn, type: "main", index: 0 }]], error: [[{ node: NAMES.errPath, type: "main", index: 0 }]] },
  [NAMES.signIn]: { main: [[{ node: NAMES.plan, type: "main", index: 0 }]], error: [[{ node: NAMES.errPath, type: "main", index: 0 }]] },
  [NAMES.plan]: { main: [[{ node: NAMES.gate, type: "main", index: 0 }]], error: [[{ node: NAMES.errPath, type: "main", index: 0 }]] },
  [NAMES.gate]: { main: [[{ node: NAMES.create, type: "main", index: 0 }], [{ node: NAMES.report, type: "main", index: 0 }]], error: [[{ node: NAMES.errPath, type: "main", index: 0 }]] },
  [NAMES.create]: { main: [[{ node: NAMES.audit, type: "main", index: 0 }]], error: [[{ node: NAMES.errPath, type: "main", index: 0 }]] },
  [NAMES.audit]: { main: [[{ node: NAMES.report, type: "main", index: 0 }]], error: [[{ node: NAMES.errPath, type: "main", index: 0 }]] },
  // the report's output continues into the alert reporter. Both 21 and 22 are terminals and both emit the same
  // failure shape: 21 for a stage that threw, 22 for a plan that decided to stop. Neither is downstream of the
  // other, so a clean run can never reach the error reporter and throw there.
  [NAMES.report]: { main: [[{ node: NAMES.errPlan, type: "main", index: 0 }]], error: [[{ node: NAMES.errPath, type: "main", index: 0 }]] },
};

const workflow = {
  name: "Mobilizon cadence - keep the next meeting scheduled",
  nodes,
  connections,
  settings: {
    executionOrder: "v1",
    timezone: INSTANCE.timezone ?? "America/Chicago",
    // Named explicitly rather than defaulted: the sign-in node's request body contains a password, and
    // execution data is where it would be retained. docs/security.md weighs this against the need to read a
    // scheduled dry run after the fact; the mitigation chosen was host-level pruning, not turning data off.
    saveDataErrorExecution: "all",
    saveDataSuccessExecution: "all",
    savePreExecutionData: false,
  },
  meta: { templateCredsSetupCompleted: false },
  tags: ["mobilizon", "events", "cadence"],
};

// ------------------------------------------------------------------- checking

const problems = [];
const nodeNames = new Set(nodes.map((n) => n.name));

for (const [from, byPort] of Object.entries(connections)) {
  if (!nodeNames.has(from)) problems.push(`connections reference a node that does not exist: ${from}`);
  for (const items of Object.values(byPort)) {
    for (const arr of items) for (const c of arr ?? []) {
      if (!nodeNames.has(c.node)) problems.push(`${from} -> ${c.node}: no such node (n8n imports the file, then reports "node not found")`);
    }
  }
}

// Any $('Name') in generated code or expressions must name a node that exists.
for (const n of nodes) {
  for (const m of JSON.stringify(n.parameters).matchAll(/\$\('([^']+)'\)/g)) {
    if (!nodeNames.has(m[1])) problems.push(`${n.name}: references unknown node "${m[1]}"`);
  }
}
// The error reporter reaches stages by *variable*, which the pattern above cannot see; check those by hand.
for (const m of nodes.find((n) => n.name === NAMES.errPath).parameters.jsCode.matchAll(/\["([a-z ]+)", "([^"]+)"\]/g)) {
  if (!nodeNames.has(m[2])) problems.push(`${NAMES.errPath}: stage "${m[1]}" names unknown node "${m[2]}"`);
}

// Every Code node must parse standalone. The injected ones are parsed in expand(); the inline ones are here.
for (const n of nodes.filter((x) => x.type === "n8n-nodes-base.code")) {
  try { new Function("$", "$json", n.parameters.jsCode); } catch (e) {
    problems.push(`${n.name}: Code node does not parse: ${e.message}`);
  }
}

// The config node must carry the documents the HTTP nodes ask it for.
const cfgNode = nodes.find((n) => n.name === NAMES.cfg);
for (const key of ["readSeriesHistory", "readSeriesHistoryVars", "signIn", "createEvent", "auditDateWindow"]) {
  if (!cfgNode.parameters.jsCode.includes(`${key}:`)) problems.push(`${NAMES.cfg} does not expose query "${key}"`);
}

// No request may point anywhere but the configured Mobilizon instance; no request may swallow an error.
for (const n of nodes.filter((x) => x.type === "n8n-nodes-base.httpRequest")) {
  const u = new URL(n.parameters.url);
  if (u.origin !== new URL(INSTANCE.baseUrl).origin) problems.push(`${n.name}: url points at ${u.origin}, not ${INSTANCE.baseUrl}`);
  if (u.pathname !== INSTANCE.graphqlPath) problems.push(`${n.name}: path is ${u.pathname}, not the path 5.2.4 serves (${INSTANCE.graphqlPath})`);
  if (n.parameters.sendQuery) problems.push(`${n.name}: a query string is where a token ends up in an access log`);
  if (!n.parameters.sendBody || n.parameters.specifyBody !== "json") problems.push(`${n.name}: body is not JSON`);
  if (n.parameters.options?.response?.response?.neverError) problems.push(`${n.name}: neverError hides GraphQL failures`);
}

// Secrets: the sign-in body must read env *names*, never values, and no credential may be baked in.
for (const key of ["emailEnv", "passwordEnv"]) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(CREDENTIALS[key] ?? "")) problems.push(`CREDENTIALS.${key} must be an environment-variable NAME, not a value (got ${JSON.stringify(CREDENTIALS[key])})`);
}
const json0 = JSON.stringify(nodes);
if (/password\s*:\s*"(?!\$)/.test(json0)) problems.push("a password literal appears in a node");
if (!json0.includes(`$env.${CREDENTIALS.passwordEnv}`)) problems.push(`the sign-in node does not read $env.${CREDENTIALS.passwordEnv}`);
for (const shape of ['"password"', '"accessToken":', '"Basic ', '"Bearer ey', "eyJ"]) {
  if (json0.includes(shape)) problems.push(`${shape} must not appear as a literal in the workflow`);
}

// The error reporter is reachable only through error outputs. If a main edge ever pointed at it, a clean run
// would arrive with no `$json.error` and throw - which reads as a mysterious second failure.
for (const [from, ports] of Object.entries(connections)) {
  for (const list of ports.main ?? []) for (const c of list ?? []) {
    if (c.node === NAMES.errPath) problems.push(`${from} feeds the error reporter from its main output`);
  }
}

// Every node that can fail has its error output wired to the reporter, and the two reporters are terminals.
// A node added later without an error output fails silently in a scheduled run - the one failure mode this
// whole graph exists to avoid.
const wired = new Set(Object.entries(connections).filter(([, p]) => p.error?.length).map(([from]) => from));
for (const n of nodes) {
  if (n.type === "n8n-nodes-base.scheduleTrigger") continue;
  if (n.name === NAMES.errPath || n.name === NAMES.errPlan) continue;
  if (!wired.has(n.name)) problems.push(`${n.name} has no error output wired to ${NAMES.errPath}`);
}
for (const terminal of [NAMES.errPath, NAMES.errPlan]) {
  const ports = connections[terminal];
  if (ports && (ports.main?.length || ports.error?.length)) problems.push(`${terminal} must be a terminal - it feeds the alert, not another node`);
}

// The gate is the only write switch: it must compare the plan node's `action` against exactly "create".
{
  const gate = nodes.find((n) => n.name === NAMES.gate);
  const conds = gate.parameters.conditions.conditions;
  if (conds.length !== 1) problems.push(`${NAMES.gate} should hold exactly one condition, found ${conds.length}`);
  const c = conds[0] ?? {};
  if (c.rightValue !== "create") problems.push(`${NAMES.gate} no longer compares against "create" (got ${JSON.stringify(c.rightValue)})`);
  if (!String(c.leftValue).includes(NAMES.plan) || !String(c.leftValue).includes(".action")) problems.push(`${NAMES.gate} is not reading the plan node's action`);
  if (gate.parameters.options.branchMode !== "matchingBranch") problems.push(`${NAMES.gate} must route non-matching items to its false branch`);
}

// A dry run must be unable to reach a write: the plan node is the only thing that can name the action.
if (RUN.dryRun === true && !READ("nodes/04-plan.js").includes("planSeries")) {
  problems.push("the plan node no longer routes the decision through core.mjs, so dryRun is no longer enforced");
}

// The one structural assumption the linear graph makes.
const groups = [...new Set(SERIES.map((s) => s.groupActor))];
if (groups.length > 1) problems.push(`series span ${groups.length} groups; the chain reads one group per run (see ${NAMES.cfg})`);

// Every series must be plannable: the fields core.mjs needs, or the run alerts at 09:00 and nobody is watching.
for (const s of SERIES) {
  for (const f of ["key", "title", "groupActor", "everyDays", "timezone"]) {
    if (s[f] === undefined) problems.push(`series "${s.key ?? "(unnamed)"}" is missing ${f}`);
  }
  if (!Number.isInteger(s.everyDays) || s.everyDays < 1) problems.push(`series "${s.key}" everyDays must be a positive integer`);
  if (s.weekdaySnap !== null && s.weekdaySnap !== undefined && !(s.weekdaySnap >= 0 && s.weekdaySnap <= 6)) problems.push(`series "${s.key}" weekdaySnap must be 0..6 or null`);
}

const json = JSON.stringify(workflow, null, 2);

// Artifact drift. The tests execute what these sources *would* produce; the thing you import into n8n is the
// file on disk. If those two ever differ, the reviewed artifact is not the tested one - which is the one way
// this design could ship a rule no test ran. Same rule `check:ics` applies to the built feed.
if (CHECK) {
  let onDisk = null;
  try { onDisk = readFileSync(OUT, "utf8"); }
  catch { problems.push(`${OUT.pathname} does not exist - run: node integrations/mobilizon-cadence/build-workflow.mjs`); }
  if (onDisk !== null && onDisk !== json + "\n") {
    problems.push(`${OUT.pathname} is stale: it is not what these sources produce. Run node integrations/mobilizon-cadence/build-workflow.mjs and commit the result.`);
  }
}

if (problems.length) {
  console.error(`cadence build blocked:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

if (CHECK) {
  console.log(`cadence workflow ok: ${nodes.length} nodes, ${SERIES.length} series, dryRun=${RUN.dryRun}, endpoint ${ENDPOINT}`);
} else {
  writeFileSync(OUT, json + "\n");
  console.log(`built ${OUT.pathname}: ${nodes.length} nodes, ${SERIES.length} series, endpoint ${ENDPOINT}`);
  console.log(`dryRun is ${RUN.dryRun}; horizon ${RUN.horizonDays}d; ${json.split("\n").length} lines of JSON`);
  console.log(`the sign-in node reads $env.${CREDENTIALS.emailEnv} and $env.${CREDENTIALS.passwordEnv} - set them on the n8n host, not in the workflow`);
}
