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
const { INSTANCE, CREDENTIALS, RUN, SERIES, ALERT } = config;
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
  tell: "09 Tell a person?",
  notify: "23 Notify on ntfy",
  loud: "24 Fail loudly",
};

// Which nodes get which node-level settings, stated once as data (D195).
//
// `onError: "continueErrorOutput"` is the property that makes an error output *exist*. The wires below point
// every fallible stage's error output at `21`, and the vendor docs are blunt about the pairing
// (`n8n-error-handling-official/references/NODE_ERROR_OUTPUTS.md`, read 2026-11-05): wire without the property
// means "the slot never fires, and the handler is unreachable"; the default is `stopWorkflow`. That was this
// artifact's silent fault until 2026-11-05 - the error path was drawn, and could never run.
//
// `retryOnFail` is deliberately NOT on every network node, which is where this rig overrides the vendor
// default (their REVIEW_CHECKLIST flags any network node without it):
//   - 06 Create event: no retry. Mobilizon 5.2.4 has no idempotency key and no conditional create, and the
//     engine retries on *all* errors - including a 500 returned after the row was written. A retried create is
//     a duplicate on the club's calendar, and the plan's dedupe read happens a day later, not a second later.
//   - 03 Sign in: no retry. A wrong password would be offered three times per run to an authenticated endpoint
//     on a YunoHost box with fail2ban in front of it; a credential mistake is a one-time human event.
//   - 02 and 07 (idempotent reads) and 23 (the alert itself): retry. Re-sending is harmless there, and a
//     transient blip should not page a person. Values are the vendor's documented defaults (3 tries, 5000ms).
const ON_ERROR = ["cfg", "history", "signIn", "plan", "gate", "create", "audit", "report"].map((k) => NAMES[k]);
const RETRY = ["history", "audit", "notify"].map((k) => NAMES[k]);
const RETRY_SETTING = { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 };

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
    onError: "continueErrorOutput",
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
    onError: "continueErrorOutput",
    ...RETRY_SETTING,
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
    // No retry here, and the reason is the host rather than the API: three offers of a wrong password per run,
    // to an authenticated endpoint behind YunoHost's fail2ban. See the RETRY block above.
    onError: "continueErrorOutput",
  },
  {
    // The rules. One item per series, each carrying its own decision and (if it decided to write) the exact
    // variables it will send - so "what did it decide" and "what will it send" are one reviewable object.
    id: "cadence-plan", name: NAMES.plan, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [-40, -160],
    parameters: { mode: "runOnceForAllItems", jsCode: expand(READ("nodes/04-plan.js"), NAMES.plan) },
    onError: "continueErrorOutput",
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
    onError: "continueErrorOutput",
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
    // No retry: a create has no idempotency key on this instance (see the RETRY block above). The audit node,
    // one step later, is what proves whether the write landed.
    onError: "continueErrorOutput",
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
    onError: "continueErrorOutput",
    ...RETRY_SETTING,
  },
  {
    id: "cadence-report", name: NAMES.report, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [760, -160],
    parameters: { mode: "runOnceForAllItems", jsCode: expand(READ("nodes/08-report.js"), NAMES.report) },
    onError: "continueErrorOutput",
  },
  {
    // Failure path. Every stage that can throw points its error output here, and this is the only node in the
    // workflow that reads `$json.error`. It says *which* stage broke, because a red dot on a canvas is not an
    // alert. The text lives in `nodes/21-report-error.js` like the other reasoning nodes: it needs the shared
    // `alertBody` from `lib/core.mjs`, and a message shape copied into three places is a message nobody can
    // learn to read.
    id: "cadence-err-path", name: NAMES.errPath, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [60, 180],
    parameters: { mode: "runOnceForAllItems", jsCode: expand(READ("nodes/21-report-error.js"), NAMES.errPath) },
  },
  {
    // A plan that *alerts* (a rename, a clock mismatch, every row cancelled) does not throw - it reports. But a
    // reported alert still has to reach a person, so it is folded into the same failure shape.
    id: "cadence-err-plan", name: NAMES.errPlan, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [340, 180],
    parameters: { mode: "runOnceForAllItems", jsCode: expand(READ("nodes/22-report-problem.js"), NAMES.errPlan) },
  },
  {
    // The one branch that decides whether a run is worth a notification. The decision itself is made in the
    // reasoning nodes (`notifyNeeded`), so this node is a wire, not a rule - and the condition compares the
    // **string** form to keep the parameter block identical to the one above, which is the block whose shape
    // depends on the n8n version (IF v2). A boolean block would be a second shape to re-verify on import.
    id: "cadence-tell", name: NAMES.tell, type: "n8n-nodes-base.if", typeVersion: n8nTarget.if,
    position: [520, 120],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [{
          id: "reporter-wants-to-notify", leftValue: "={{ String($json.notifyNeeded) }}", filterType: "string",
          operator: { type: "string", operation: "equals" }, rightValue: "true",
        }],
        combinator: "and",
        options: {},
      },
      options: { branchMode: "matchingBranch" },
    },
  },
  {
    // The delivery. One POST to the alert server's **root** with the whole message as a JSON body, which is the
    // form ntfy documents for tools that cannot set headers per request - and it keeps this node in the same
    // `specifyBody: "json"` shape as every other HTTP node here, so there is one body style to review.
    // The URL is written literally (like the Mobilizon endpoint) so `verify-import.mjs` can hold it to the
    // host allow-list; the token is not: `$env` reads it on the n8n host, so no secret enters this file (D177).
    // `neverError: false` is the point - an alert that fails to publish must turn the execution red. A channel
    // that silently drops messages is the failure this node exists to prevent (D194).
    id: "cadence-notify", name: NAMES.notify, type: "n8n-nodes-base.httpRequest", typeVersion: n8nTarget.httpRequest,
    position: [720, 120],
    parameters: {
      method: "POST", url: ALERT.rootUrl, sendQuery: false,
      options: {
        response: { response: { neverError: false } },
        headers: [...HEADERS_PUBLIC, { name: "Authorization", value: `={{ 'Bearer ' + $env.${ALERT.tokenEnv} }}` }],
        batching: { enabled: false },   // a notification that failed is reported once, not hammered five times
      },
      sendBody: true, specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.ntfy) }}",
    },
    // Retry the send (see the RETRY block): a dropped alert is the failure this node exists to prevent, and a
    // duplicated message costs one glance. **No onError here**, unlike every other network node: a failed send
    // must throw and end the run, not route into `21`, which would read an absent `error` field and compose a
    // second, wrong message about a failure that is really "the alert did not arrive". This is also the node
    // the ON_ERROR list deliberately omits - the pair (wired error output, onError) is only meaningful when
    // something downstream can act on it.
    ...RETRY_SETTING,
  },
  {
    // Loudness, re-declared after the error path became reachable. See nodes/24-fail-loudly.js: a wired error
    // output makes an error "handled", so the execution stops looking like a failure - and this workflow's
    // stated alarm is a red execution. Its own error output is left unwired on purpose, which is the one shape
    // a future workflow-level error workflow still catches.
    id: "cadence-loud", name: NAMES.loud, type: "n8n-nodes-base.code", typeVersion: n8nTarget.code,
    position: [920, 120],
    parameters: { mode: "runOnceForAllItems", jsCode: expand(READ("nodes/24-fail-loudly.js"), NAMES.loud) },
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
  // The report's output goes two ways: into the alert reporter (22), and into the delivery gate. Both 21 and 22
  // emit the same shape, and neither is downstream of the other, so a clean run can never reach the error
  // reporter and throw there.
  [NAMES.report]: {
    main: [[{ node: NAMES.errPlan, type: "main", index: 0 }, { node: NAMES.tell, type: "main", index: 0 }]],
    error: [[{ node: NAMES.errPath, type: "main", index: 0 }]],
  },
  // A run that wrote something, and a run that refused, are two different things to say, so they arrive at the
  // gate as two items and can produce two messages. The error path does not pass the gate: a stage that threw
  // is always worth a message.
  [NAMES.errPlan]: { main: [[{ node: NAMES.tell, type: "main", index: 0 }]] },
  [NAMES.errPath]: { main: [[{ node: NAMES.notify, type: "main", index: 0 }]] },
  [NAMES.tell]: { main: [[{ node: NAMES.notify, type: "main", index: 0 }], []] },
  // The delivery is never the last word: 24 turns the run back to red when a reporter said something is wrong.
  // 24's own error output is unwired - an unwired throw is what a workflow-level error workflow catches.
  [NAMES.notify]: { main: [[{ node: NAMES.loud, type: "main", index: 0 }]] },
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

// No request may point anywhere but the two configured hosts, and only one node may use the second: the
// Mobilizon instance, and the alert server. The allow-list is written out per node on purpose - "it also calls
// one other host" is the kind of change that should have to argue with a check.
for (const n of nodes.filter((x) => x.type === "n8n-nodes-base.httpRequest")) {
  const u = new URL(n.parameters.url);
  if (n.name === NAMES.notify) {
    if (u.origin !== new URL(ALERT.rootUrl).origin) problems.push(`${n.name}: url points at ${u.origin}, not ${ALERT.rootUrl}`);
    if (u.pathname !== "/") problems.push(`${n.name}: path is ${u.pathname}; ntfy JSON publish must POST to the server root`);
  } else if (u.origin !== new URL(INSTANCE.baseUrl).origin) problems.push(`${n.name}: url points at ${u.origin}, not ${INSTANCE.baseUrl}`);
  else if (u.pathname !== INSTANCE.graphqlPath) problems.push(`${n.name}: path is ${u.pathname}, not the path 5.2.4 serves (${INSTANCE.graphqlPath})`);
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
// by shape, not prefix: the config's own comment explains what an ntfy token looks like, and that comment is
// injected into 01 Config. A value is the finding, not the word.
if (/\btk_[A-Za-z0-9]{16,}/.test(json0)) problems.push("an ntfy token value appears in a node - it belongs in $env, never in the workflow");

// The error reporter is reachable only through error outputs. If a main edge ever pointed at it, a clean run
// would arrive with no `$json.error` and throw - which reads as a mysterious second failure.
for (const [from, ports] of Object.entries(connections)) {
  for (const list of ports.main ?? []) for (const c of list ?? []) {
    if (c.node === NAMES.errPath) problems.push(`${from} feeds the error reporter from its main output`);
  }
}

// Every node that can fail has its error output wired to the reporter, and the reporters only feed delivery.
// A node added later without an error output fails silently in a scheduled run - the one failure mode this
// whole graph exists to avoid.
const wired = new Set(Object.entries(connections).filter(([, p]) => p.error?.length).map(([from]) => from));
// Two exemptions, both stated: the delivery node has no downstream that could report its own failure, and a
// failed send must turn the execution red rather than arrive at `21`, which would find no error field and
// throw a second, unrelated message over the first. The gate is exempt for the same reason - its condition
// reads a field its own upstream composed, so an error there is a graph bug, not a run failure.
const noErrorPort = new Set([NAMES.errPath, NAMES.errPlan, NAMES.notify, NAMES.tell, NAMES.loud]);
for (const n of nodes) {
  if (n.type === "n8n-nodes-base.scheduleTrigger") continue;
  if (noErrorPort.has(n.name)) continue;
  if (!wired.has(n.name)) problems.push(`${n.name} has no error output wired to ${NAMES.errPath}`);
}

// A wired error output is only half of it, and the half that was missing until 2026-11-05 is the node
// property: without `onError: "continueErrorOutput"` the slot never fires, the handler is unreachable, and the
// default `stopWorkflow` halts the run (vendor NODE_ERROR_OUTPUTS, "Error wire set, onError not configured").
// Checked from the ON_ERROR list rather than inferred, because the *inverse* is equally bad: the same reference
// calls "`onError` set, error output not wired" one of the worst silent-failure modes in n8n - the error is
// discarded and the run reports success.
const ON_ERROR_SET = new Set(ON_ERROR);
for (const n of nodes) {
  if (n.onError !== undefined && n.onError !== "continueErrorOutput") {
    problems.push(`${n.name} sets onError: ${JSON.stringify(n.onError)} - this graph's error outputs only mean continueErrorOutput`);
  }
  if (ON_ERROR_SET.has(n.name) && !wired.has(n.name)) problems.push(`${n.name} is listed in ON_ERROR but its error output is not wired`);
  if (wired.has(n.name) && n.onError !== "continueErrorOutput") problems.push(`${n.name} has a wired error output but no onError: "continueErrorOutput" - the branch cannot fire, and a failure would stop the run instead of alerting`);
  if (n.onError === "continueErrorOutput" && !wired.has(n.name)) problems.push(`${n.name} sets onError: continueErrorOutput but wires nothing - the error is discarded and the execution looks successful`);
}
// The retry policy is a per-node decision this rig made on purpose (see the ON_ERROR/RETRY block), so an
// accidental addition to a write node is a calendar bug, not a robustness improvement.
const RETRY_SET = new Set(RETRY);
for (const n of nodes) {
  if (RETRY_SET.has(n.name) && n.retryOnFail !== true) problems.push(`${n.name} is listed in RETRY but has no retryOnFail - it would alert on a transient blip`);
  if (!RETRY_SET.has(n.name) && n.retryOnFail === true) problems.push(`${n.name} retries but is not in RETRY - on ${NAMES.create} that means a duplicate event on the club's calendar`);
  if (n.retryOnFail === true) {
    if (n.maxTries !== RETRY_SETTING.maxTries || n.waitBetweenTries !== RETRY_SETTING.waitBetweenTries) {
      problems.push(`${n.name} retries with ${n.maxTries}/${n.waitBetweenTries}ms, not the single policy in RETRY_SETTING`);
    }
  }
}
// The reporters end a *reasoning* path: what may follow them is the delivery chain and nothing else. Anything
// else is a second failure path - the shape that made a clean run reach the error reporter once already.
const afterReporters = new Set([NAMES.notify, NAMES.tell]);
for (const terminal of [NAMES.errPath, NAMES.errPlan]) {
  const ports = connections[terminal];
  const out = ports ? Object.values(ports).flat().flat().filter(Boolean).map((c) => c.node) : [];
  const stray = out.filter((name) => !afterReporters.has(name));
  if (stray.length) problems.push(`${terminal} feeds ${stray.join(", ")} - it may only feed delivery`);
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

// ------------------------------------------------------- the alert channel (D194)
// A workflow that can fail but cannot tell anyone is the failure this generator exists to prevent, so the
// channel is checked like the date rules are - as data, before anything runs.
if (!ALERT) problems.push("series.config.mjs exports no ALERT - the workflow has reporters and no delivery");
else {
  let root = null;
  try { root = new URL(ALERT.rootUrl); } catch { problems.push(`ALERT.rootUrl is not a URL: "${ALERT.rootUrl}"`); }
  if (root) {
    if (root.protocol !== "https:") problems.push(`ALERT.rootUrl is ${root.protocol} - a token must not cross a plain-HTTP hop`);
    if (root.host !== ALERT.host) problems.push(`ALERT.rootUrl host ${root.host} != ALERT.host ${ALERT.host}`);
    // ntfy documents it twice: JSON publishing must POST to the server root, not to the topic URL.
    if (root.pathname !== "/") problems.push(`ALERT.rootUrl path is "${root.pathname}" - JSON publish must go to the root`);
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(ALERT.topic ?? "")) problems.push(`ALERT.topic "${ALERT.topic}" is not an ntfy topic id ([A-Za-z0-9_-]{1,64})`);
  // The YunoHost package grants anonymous write-only access to topics matching `up*` for its iOS upstream flow
  // (measured from the package's scripts/install 2026-11-04). A topic starting with those two letters would be
  // writable by every stranger who can reach the host.
  if (/^up/i.test(ALERT.topic ?? "")) problems.push(`ALERT.topic "${ALERT.topic}" starts with "up", which the ynh package grants to anonymous writers`);
  if (!/^[A-Z][A-Z0-9_]*$/.test(ALERT.tokenEnv ?? "")) problems.push(`ALERT.tokenEnv must be an environment-variable NAME, got "${ALERT.tokenEnv}"`);
  if (ALERT.tokenEnv === CREDENTIALS.emailEnv || ALERT.tokenEnv === CREDENTIALS.passwordEnv) problems.push("ALERT.tokenEnv collides with a Mobilizon credential name");
  for (const [k, v] of Object.entries(ALERT.priority ?? {})) {
    if (!Number.isInteger(v) || v < 1 || v > 5) problems.push(`ALERT.priority.${k} = ${v} is outside the documented 1 (min) to 5 (max)`);
  }
  const notify = nodes.find((n) => n.name === NAMES.notify);
  if (!notify) problems.push("no delivery node - the reporters compose messages nothing will send");
  else {
    if (notify.parameters.url !== ALERT.rootUrl) problems.push(`${NAMES.notify} posts to "${notify.parameters.url}", not ALERT.rootUrl`);
    if ((notify.parameters.options?.response?.response?.neverError ?? false) !== false) problems.push(`${NAMES.notify} has neverError: true - a dropped alert would look like a successful run`);
    if (notify.parameters.options?.headers?.some((h) => /tk_[A-Za-z0-9]/.test(h.value ?? ""))) problems.push(`${NAMES.notify} carries an ntfy token literal - it belongs in $env.${ALERT.tokenEnv}`);
    const out = (connections[NAMES.notify] ?? {}).main?.flat().filter(Boolean) ?? [];
    // Exactly one edge, and it goes to the loud node. The delivery is never the end of a path, because a run
    // whose error was "handled" by an error output is not recorded as a failure (vendor ERROR_WORKFLOWS) - and
    // this workflow's stated alarm is a red execution.
    if (out.length !== 1 || out[0].node !== NAMES.loud) {
      problems.push(`${NAMES.notify} must feed exactly one node, ${NAMES.loud} (found ${out.map((c) => c.node).join(", ") || "nothing"}) - without it a handled failure stops looking like a failure`);
    }
    if ((connections[NAMES.loud] ?? {}).main?.flat().filter(Boolean).length) problems.push(`${NAMES.loud} must be terminal: anything downstream of a deliberate throw is dead code`);
    const loud = nodes.find((n) => n.name === NAMES.loud);
    if (loud.onError !== undefined) problems.push(`${NAMES.loud} must not set onError: its throw is the one unwired failure a future workflow-level error workflow can still catch`);
  }
  // Every stage that can throw must be able to reach the delivery node, and so must the clean-run report.
  const adj = new Map();
  for (const [from, byPort] of Object.entries(connections)) {
    for (const list of Object.values(byPort)) for (const arr of list ?? []) for (const c of arr ?? []) {
      if (!adj.has(from)) adj.set(from, new Set());
      adj.get(from).add(c.node);
    }
  }
  const reaches = (from, to) => {
    const seen = new Set([from]); const q = [from];
    while (q.length) { const cur = q.shift(); if (cur === to) return true;
      for (const nxt of adj.get(cur) ?? []) if (!seen.has(nxt)) { seen.add(nxt); q.push(nxt); } }
    return false;
  };
  const mustDeliver = [...Object.entries(connections).filter(([, ports]) => ports.error).map(([from]) => from), NAMES.report];
  for (const from of mustDeliver) {
    if (!reaches(from, NAMES.notify)) problems.push(`${from} can fail (or report) but no path reaches ${NAMES.notify}`);
  }
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
