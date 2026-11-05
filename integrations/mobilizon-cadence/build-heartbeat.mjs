#!/usr/bin/env node
/**
 * build-heartbeat.mjs - generates `n8n/heartbeat.json`: the **weekly heartbeat** (operator ruling 2026-11-05,
 * "weekly heartbeat can be built now"; D205).
 *
 *   node integrations/mobilizon-cadence/build-heartbeat.mjs          # write the artifact
 *   node integrations/mobilizon-cadence/build-heartbeat.mjs --check  # validate, write nothing, exit 1 on a problem
 *
 * The hole it closes is not a failing node, it is the absence of one. Every message this project sends means
 * "something happened" - that is D194's rule, chosen deliberately - so a quiet week and a dead scheduler look
 * identical from a phone. The only detector that exists today is A8's runway gate (`check:ics`, N = 21 days,
 * D188), and that is a deploy-time check on the *site's* snapshot, so the honest latency on "n8n stopped
 * running" is about three weeks. One message a week makes the silence itself the signal, and it cuts that to
 * seven days.
 *
 * It is not a bare ping. It makes the same public read cadence makes (no credential - the same document
 * `simulate.mjs` runs from a laptop) and prints, per series, the next date the calendar holds and how far out
 * it is. Past `HEARTBEAT.runwayDays` the note goes priority 4 and says what to run, which makes the heartbeat
 * the early half of A8's rule instead of a third opinion on it.
 *
 * Two things it deliberately is not:
 *   - **not a planner** - it never calls `planSeries`; it reports the rows that exist, so it can never disagree
 *     with the cadence about what the calendar says;
 *   - **not conditional** - there is no `Tell a person?` gate, and `checkHeartbeat()` fails the build if one is
 *     added. A heartbeat that can be skipped is indistinguishable from the failure it exists to detect.
 *
 * If its read fails, the run goes red and stays red: no `onError`, no error branch. A dead heartbeat read is a
 * finding, and with the error watcher linked (`n8n/error-watcher.json`) it reaches a person within a minute of
 * the weekly run rather than up to a week later.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expand } from "./lib/inject.mjs";

const here = import.meta.url;
const CHECK = process.argv.includes("--check");
const OUT = new URL("./n8n/heartbeat.json", import.meta.url);

const config = await import(new URL("./series.config.mjs", import.meta.url).href);
const { INSTANCE, CREDENTIALS, SERIES, ALERT, HEARTBEAT, RETENTION } = config;

export const HEARTBEAT_NAME = "Mobilizon cadence - weekly heartbeat (proof of life and the runway)";
export const BEAT_NAMES = {
  trigger: "H0 Weekly trigger",
  cfg: "H1 Config",
  read: "H2 Read the calendar",
  note: "H3 Compose the weekly note",
  notify: "H4 Notify on ntfy",
};

const INJECTABLE = { config: "./series.config.mjs", core: "./lib/core.mjs", queries: "./lib/queries.mjs" };
const gqlBody = (exprQuery, exprVars) => `={{ JSON.stringify({ query: ${exprQuery}, variables: ${exprVars} }) }}`;
const ENDPOINT = `${INSTANCE.baseUrl.replace(/\/$/, "")}${INSTANCE.graphqlPath}`;

export function buildHeartbeat() {
  const nodes = [
    {
      // Weeks, not days: one run a week is the whole product. The parameter *names* are load-bearing and were
      // measured, not remembered - this instance's Schedule Trigger v1 takes triggerAtDay / triggerAtHour /
      // triggerAtMinute, and there is no `triggerAt` string (D207). `checkHeartbeat()` refuses a `triggerAt`,
      // because an unread parameter sits in the document looking like an hour that never happens.
      id: "beat-trigger", name: BEAT_NAMES.trigger, type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1,
      position: [-760, -160],
      parameters: {
        rule: {
          interval: [{
            field: "weeks",
            weeksInterval: HEARTBEAT.everyWeeks,
            triggerAtDay: [HEARTBEAT.weekday],
            triggerAtHour: HEARTBEAT.hour,
            triggerAtMinute: HEARTBEAT.minute,
          }],
        },
      },
    },
    {
      id: "beat-config", name: BEAT_NAMES.cfg, type: "n8n-nodes-base.code", typeVersion: 2,
      position: [-560, -160],
      parameters: { mode: "runOnceForAllItems", jsCode: expand(readFileSync(new URL("./nodes/40-heartbeat-config.js", import.meta.url), "utf8"), BEAT_NAMES.cfg, INJECTABLE, new URL("./", here)) },
    },
    {
      // The public read. No Authorization header, because none is needed (measured 2026-11-04) and a heartbeat
      // that held a secret would be a second place the club's password can leak.
      id: "beat-read", name: BEAT_NAMES.read, type: "n8n-nodes-base.httpRequest", typeVersion: 4,
      position: [-360, -160],
      parameters: {
        method: "POST", url: ENDPOINT, sendQuery: false,
        options: {
          response: { response: { neverError: false } },
          headers: [{ name: "content-type", value: "application/json" }, { name: "accept", value: "application/json" }],
        },
        sendBody: true, specifyBody: "json",
        jsonBody: gqlBody(`$('${BEAT_NAMES.cfg}').item.json.query.readSeriesHistory`, `$('${BEAT_NAMES.cfg}').item.json.query.readSeriesHistoryVars`),
      },
      retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,   // an idempotent read; a blip should not eat the week's note
    },
    {
      id: "beat-note", name: BEAT_NAMES.note, type: "n8n-nodes-base.code", typeVersion: 2,
      position: [-160, -160],
      parameters: { mode: "runOnceForAllItems", jsCode: expand(readFileSync(new URL("./nodes/41-heartbeat-note.js", import.meta.url), "utf8"), BEAT_NAMES.note, INJECTABLE, new URL("./", here)) },
    },
    {
      id: "beat-notify", name: BEAT_NAMES.notify, type: "n8n-nodes-base.httpRequest", typeVersion: 4,
      position: [40, -160],
      parameters: {
        method: "POST", url: ALERT.rootUrl, sendQuery: false,
        options: {
          response: { response: { neverError: false } },
          headers: [
            { name: "content-type", value: "application/json" },
            { name: "accept", value: "application/json" },
            { name: "Authorization", value: `={{ 'Bearer ' + $env.${ALERT.tokenEnv} }}` },
          ],
          batching: { enabled: false },
        },
        sendBody: true, specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.ntfy) }}",
      },
      retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    },
  ];

  const connections = {
    [BEAT_NAMES.trigger]: { main: [[{ node: BEAT_NAMES.cfg, type: "main", index: 0 }]] },
    [BEAT_NAMES.cfg]: { main: [[{ node: BEAT_NAMES.read, type: "main", index: 0 }]] },
    [BEAT_NAMES.read]: { main: [[{ node: BEAT_NAMES.note, type: "main", index: 0 }]] },
    [BEAT_NAMES.note]: { main: [[{ node: BEAT_NAMES.notify, type: "main", index: 0 }]] },
  };

  return {
    name: HEARTBEAT_NAME,
    nodes,
    connections,
    settings: {
      executionOrder: "v1",
      timezone: INSTANCE.timezone ?? "America/Chicago",
      ...RETENTION,
    },
    meta: { templateCredsSetupCompleted: false },
    tags: ["mobilizon", "cadence", "heartbeat"],
  };
}

/**
 * The heartbeat's invariants, as a function so a test can break them on purpose.
 * Returns [] for a heartbeat this repo would ship; otherwise the reasons it is not one.
 */
export function checkHeartbeat(wf) {
  const problems = [];
  const nodes = wf.nodes ?? [];
  const nodeNames = new Set(nodes.map((n) => n.name));
  const json = JSON.stringify(wf);

  // 1. One trigger, weekly, at the hour the config names - and written in the parameter names this instance
  //    actually reads (D207: the cadence's own trigger carried an unread `triggerAt` from its first commit).
  const triggers = nodes.filter((n) => /trigger/i.test(n.type));
  if (triggers.length !== 1) problems.push(`the heartbeat has exactly one trigger, found ${triggers.length}`);
  for (const t of triggers) {
    if (t.type !== "n8n-nodes-base.scheduleTrigger") problems.push(`${t.name}: ${t.type} - the heartbeat is a scheduled job`);
    const iv = (t.parameters?.rule?.interval ?? [])[0] ?? {};
    if (Object.prototype.hasOwnProperty.call(iv, "triggerAt")) {
      problems.push(`${t.name}: it sets "triggerAt", which Schedule Trigger v1 does not read (measured 2026-11-05 against the node source and this instance's own type definitions) - the run would land at the default, midnight, while the document claims otherwise`);
    }
    if (iv.field !== "weeks") problems.push(`${t.name}: field is ${JSON.stringify(iv.field)}, must be "weeks"`);
    if (iv.weeksInterval !== HEARTBEAT.everyWeeks) problems.push(`${t.name}: weeksInterval is ${iv.weeksInterval}, config says ${HEARTBEAT.everyWeeks}`);
    const days = Array.isArray(iv.triggerAtDay) ? iv.triggerAtDay : [];
    if (!days.includes(HEARTBEAT.weekday)) problems.push(`${t.name}: triggerAtDay ${JSON.stringify(days)} does not include the configured weekday ${HEARTBEAT.weekday}`);
    if (iv.triggerAtHour !== HEARTBEAT.hour) problems.push(`${t.name}: triggerAtHour is ${JSON.stringify(iv.triggerAtHour)}, config says ${HEARTBEAT.hour}`);
    if (iv.triggerAtMinute !== HEARTBEAT.minute) problems.push(`${t.name}: triggerAtMinute is ${JSON.stringify(iv.triggerAtMinute)}, config says ${HEARTBEAT.minute}`);
    if (!wf.settings?.timezone) problems.push(`${t.name}: settings.timezone is unset, so this hour is the instance default and moves when the box is rebuilt`);
  }

  // 2. Two requests, to two named hosts, one of them unauthenticated and read-only.
  const http = nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest");
  if (http.length !== 2) problems.push(`the heartbeat holds exactly two requests (the calendar read, the ntfy send), found ${http.length}`);
  for (const n of http) {
    let u = null;
    try { u = new URL(n.parameters.url); } catch { problems.push(`${n.name}: url is not a URL`); }
    if (!u) continue;
    if (n.name === BEAT_NAMES.notify) {
      if (u.origin !== new URL(ALERT.rootUrl).origin) problems.push(`${n.name}: ${u.origin} is not the alert server ${ALERT.rootUrl}`);
      if (u.pathname !== "/") problems.push(`${n.name}: path ${u.pathname} - ntfy takes a JSON body at the root only`);
      if (!String(JSON.stringify(n.parameters)).includes(`$env.${ALERT.tokenEnv}`)) problems.push(`${n.name}: it does not read $env.${ALERT.tokenEnv} - the token's only permitted home (D177)`);
    } else {
      if (u.origin !== new URL(INSTANCE.baseUrl).origin) problems.push(`${n.name}: ${u.origin} is not the configured instance`);
      if (u.pathname !== INSTANCE.graphqlPath) problems.push(`${n.name}: path ${u.pathname}, not ${INSTANCE.graphqlPath} (what 5.2.4 serves)`);
      for (const h of n.parameters.options?.headers ?? []) {
        if (/authorization|cookie|x-api-key/i.test(h.name)) problems.push(`${n.name}: header ${h.name} - the heartbeat reads a public document and holds no credential`);
      }
    }
    if (n.parameters.sendQuery) problems.push(`${n.name}: sendQuery is on`);
    if (!n.parameters.sendBody || n.parameters.specifyBody !== "json") problems.push(`${n.name}: body is not JSON`);
    if ((n.parameters.options?.response?.response?.neverError ?? false) !== false) problems.push(`${n.name}: neverError would make a failed read look like a good week`);
    if (n.retryOnFail === true && (n.maxTries !== 3 || n.waitBetweenTries !== 5000)) problems.push(`${n.name}: retry is not the single policy (3 tries / 5000ms)`);
  }
  // The read-only argument (D183's shape, applied here). The naive version - "the word createEvent must not
  // appear anywhere" - cannot work: this workflow injects lib/core.mjs and lib/queries.mjs, which are shared
  // with the cadence and legitimately define its write helpers. What is checkable, and what actually decides
  // whether this workflow can write, is the surface: which documents the config node exposes, what the read
  // node's body references, and which environment names any node can reach.
  const cfgNodeForSurface = nodes.find((n) => n.name === BEAT_NAMES.cfg);
  const cfgCode = cfgNodeForSurface?.parameters?.jsCode ?? "";
  for (const writeKey of ["createEvent:", "signIn:", "auditDateWindow:"]) {
    if (cfgCode.includes(writeKey)) problems.push(`${BEAT_NAMES.cfg} exposes ${writeKey} - the heartbeat's read node could be pointed at a write document, and this workflow must not hold one`);
  }
  if (!/readSeriesHistory:/.test(cfgCode)) problems.push(`${BEAT_NAMES.cfg} does not expose the public read document`);
  const readNode = nodes.find((n) => n.name === BEAT_NAMES.read);
  const body = String(readNode?.parameters?.jsonBody ?? "");
  if (!/readSeriesHistory/.test(body) || /createEvent|signIn/.test(body)) problems.push(`${BEAT_NAMES.read}'s body does not reference the read document and nothing else`);
  // Which env names are reachable from any expression in this workflow. Exactly one is allowed.
  for (const m of json.matchAll(/\$env\.([A-Z0-9_]+)/g)) {
    if (m[1] !== ALERT.tokenEnv) problems.push(`an expression reads $env.${m[1]} - the heartbeat's only credential is $env.${ALERT.tokenEnv} (the Mobilizon password stays in the cadence, D177)`);
  }
  for (const n of nodes) {
    if (n.credentials && Object.keys(n.credentials).length) problems.push(`${n.name}: carries an n8n credential block`);
  }

  // 3. No gate, no branch, no error path: every run that reaches the send sends, and every failure stays red.
  const ifs = nodes.filter((n) => n.type.endsWith(".if"));
  if (ifs.length) problems.push(`${ifs.map((n) => n.name).join(", ")}: a gate in the heartbeat would let a week pass without a note, which is the failure it exists to detect`);
  for (const [from, ports] of Object.entries(wf.connections ?? {})) {
    if ((ports.error ?? []).flat().filter(Boolean).length) problems.push(`${from}: an error branch - a failed heartbeat must end red so the error watcher sees it`);
  }
  for (const n of nodes) {
    if (n.onError !== undefined) problems.push(`${n.name}: onError is set - the heartbeat has no handler, and swallowing an error here is how a dead scheduler starts looking alive`);
  }
  const notify = nodes.find((n) => n.name === BEAT_NAMES.notify);
  if (notify) {
    const out = (wf.connections?.[BEAT_NAMES.notify]?.main ?? []).flat().filter(Boolean);
    if (out.length) problems.push(`${BEAT_NAMES.notify} is terminal: downstream of the send is dead code`);
    if ((wf.connections?.[BEAT_NAMES.notify]?.error ?? []).flat().filter(Boolean).length) problems.push(`${BEAT_NAMES.notify}: its error output is wired - a heartbeat that fails to deliver must go red, not compose a second message`);
  }

  // 4. The reasoning node is the shared code, not a copy.
  const note = nodes.find((n) => n.name === BEAT_NAMES.note);
  if (!note?.parameters?.jsCode) problems.push(`${BEAT_NAMES.note} has no jsCode - the injection did not happen`);
  else {
    const code = note.parameters.jsCode;
    for (const need of ["heartbeatReport", "heartbeatLines", "alertBody", "unwrap"]) {
      if (!code.includes(need)) problems.push(`${BEAT_NAMES.note} no longer uses ${need} from lib/core.mjs - the weekly note would drift from simulate.mjs --heartbeat`);
    }
    // The injected `lib/core.mjs` *defines* planSeries, so the finding is a call, not the word.
    if (code.split("function planSeries(").join("").includes("planSeries(")) {
      problems.push(`${BEAT_NAMES.note} calls planSeries - the heartbeat reports the rows that exist; a second planner is a second opinion on one calendar`);
    }
    try { new Function("$", "$json", code); } catch (e) { problems.push(`${BEAT_NAMES.note}: the Code node does not parse: ${e.message}`); }
  }
  const cfgNode = nodes.find((n) => n.name === BEAT_NAMES.cfg);
  if (!cfgNode?.parameters?.jsCode?.includes("readSeriesHistory")) problems.push(`${BEAT_NAMES.cfg} does not expose the read document`);

  // 5. Settings, and every name resolves.
  if (wf.settings?.executionOrder !== "v1") problems.push("settings.executionOrder is not v1");
  for (const [k, want] of Object.entries(RETENTION)) {
    if (wf.settings?.[k] !== want) problems.push(`settings.${k} is ${JSON.stringify(wf.settings?.[k])}, must be ${JSON.stringify(want)} (D201)`);
  }
  if (wf.settings?.errorWorkflow) problems.push("settings.errorWorkflow is set in a generated artifact - the id belongs to the instance, so linking is an instance action (Settings -> Error Workflow), never a byte here");
  for (const [from, ports] of Object.entries(wf.connections ?? {})) {
    if (!nodeNames.has(from)) problems.push(`connections reference ${from}, which is not a node`);
    for (const list of Object.values(ports)) for (const arr of list ?? []) for (const c of arr ?? []) {
      if (!nodeNames.has(c.node)) problems.push(`${from} -> ${c.node}: no such node`);
    }
  }
  for (const m of json.matchAll(/\$\('([^']+)'\)/g)) {
    if (!nodeNames.has(m[1])) problems.push(`$('${m[1]}') names a node that does not exist`);
  }
  if (new Set(SERIES.map((s) => s.groupActor)).size > 1) problems.push("series span more than one group; the heartbeat reads one group per run");
  return problems;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
if (isMain) {
  const workflow = buildHeartbeat();
  const problems = checkHeartbeat(workflow);
  const json = JSON.stringify(workflow, null, 2);

  if (CHECK) {
    let onDisk = null;
    try { onDisk = readFileSync(OUT, "utf8"); }
    catch { problems.push(`${OUT.pathname} does not exist - run: node integrations/mobilizon-cadence/build-heartbeat.mjs`); }
    if (onDisk !== null && onDisk !== json + "\n") {
      problems.push(`${OUT.pathname} is stale: not what build-heartbeat.mjs produces. Rebuild and commit it.`);
    }
  }

  if (problems.length) {
    console.error(`cadence heartbeat build blocked:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }

  if (CHECK) {
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][HEARTBEAT.weekday];
    console.log(`cadence heartbeat ok: ${workflow.nodes.length} nodes, every ${HEARTBEAT.everyWeeks} week(s) ${dayName} ${String(HEARTBEAT.hour).padStart(2, "0")}:${String(HEARTBEAT.minute).padStart(2, "0")} ${wf_tz()}, public read only, no gate, no credential`);
  } else {
    writeFileSync(OUT, json + "\n");
    console.log(`built ${OUT.pathname}: ${workflow.nodes.length} nodes, ${json.split("\n").length} lines of JSON`);
    console.log(`it sends every week whether or not anything happened - that is the point (D205)`);
  }
}
function wf_tz() { return config.INSTANCE.timezone ?? "America/Chicago"; }
