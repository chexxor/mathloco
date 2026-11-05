#!/usr/bin/env node
/**
 * build-alerter.mjs - generates `n8n/error-watcher.json`: the **workflow-level error workflow** for the
 * cadence and the heartbeat (operator ruling 2026-11-05, "build a workflow-level error workflow now"; D206).
 *
 *   node integrations/mobilizon-cadence/build-alerter.mjs          # write the artifact
 *   node integrations/mobilizon-cadence/build-alerter.mjs --check  # validate, write nothing, exit 1 on a problem
 *
 * Why it exists, and why it is a separate workflow. Every fallible stage in the cadence now has its error
 * output wired to `21 Report error path`, and that has a consequence the vendor reference states flatly
 * (`n8n-error-handling-official/references/ERROR_WORKFLOWS.md`): an error that leaves a wired output is
 * *handled* - "even if the handler does nothing" - so it is not recorded as a failure and the instance's
 * error-workflow machinery never fires for it. What a watcher still catches is precisely what per-node wiring
 * cannot see:
 *
 *   - a whole-run timeout,
 *   - a crash between nodes,
 *   - an error in a node someone added without wiring its output,
 *   - a trigger that never activated,
 *   - and the one throw this repo leaves unhandled deliberately: `24 Fail loudly`.
 *
 * That last one is why the duplicate rule exists. `24` throws *after* `23 Notify on ntfy` delivered, so a
 * linked watcher would otherwise send a second notification for one incident. `core.mjs` `LOUD_THROW` is the
 * marker it matches, asserted from both sides by `test/watchers.test.mjs` (D194: a second message for one
 * incident is how a channel goes unread).
 *
 * Why it is so small. The same vendor file's first anti-pattern for error workflows is "make external API
 * calls that can themselves fail", and the reason is that an error workflow runs synchronously inside the run
 * that just failed - and if the error workflow itself fails, n8n does not re-trigger, so the original error
 * disappears. So this graph touches exactly one host (the alert server), holds no credential of its own (the
 * token is read from `$env` by name, D177), injects `lib/core.mjs` for the message shape but **not** the
 * cadence config, and ends at the send. `checkAlerter()` is the argument, and it is written as a function so
 * `test/watchers.test.mjs` can break it on purpose.
 *
 * What it does not do: it is not linked from anywhere in the repo. `settings.errorWorkflow` holds an *id*,
 * which belongs to the instance, so linking is an instance action (the cadence's Settings -> Error Workflow picker,
or MCP `update_workflow`) rather than a byte in a reviewed
 * artifact - a hardcoded id would point at whatever workflow happened to occupy that id on this box, which is
 * the "silently swallows every alert" failure the generator already refuses.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expand, literal } from "./lib/inject.mjs";

const here = import.meta.url;
const CHECK = process.argv.includes("--check");
const OUT = new URL("./n8n/error-watcher.json", import.meta.url);

const config = await import(new URL("./series.config.mjs", import.meta.url).href);
const { INSTANCE, ALERT, RETENTION } = config;

export const ALERTER_NAME = "Mobilizon cadence - error watcher (alert on unhandled failure)";
export const WATCH_NAMES = {
  trigger: "A0 Error Trigger",
  compose: "A1 Compose the alert",
  tell: "A2 Tell a person?",
  notify: "A3 Notify on ntfy",
  fallback: "A4 Notify on the fallback",
};

const INJECTABLE = { core: "./lib/core.mjs" };

export function buildAlerter() {
  const source = readFileSync(new URL("./nodes/31-error-alert.js", import.meta.url), "utf8");
  const withAlert = literal(source, "ALERTCFG", ALERT, WATCH_NAMES.compose);
  const jsCode = expand(withAlert, WATCH_NAMES.compose, INJECTABLE, new URL("./", here));

  const nodes = [
    {
      // The node n8n fires when a *different* workflow fails unhandled. It takes no parameters (measured
      // 2026-11-05 against this instance: `search_nodes` returns n8n-nodes-base.errorTrigger v1, and
      // `get_node_types` gives an empty params interface), and its source declares `maxNodes: 1`, so a second
      // one is not a style problem - it is invalid. `checkAlerter()` enforces exactly one.
      id: "watch-trigger", name: WATCH_NAMES.trigger, type: "n8n-nodes-base.errorTrigger", typeVersion: 1,
      position: [-760, -160], parameters: {},
    },
    {
      id: "watch-compose", name: WATCH_NAMES.compose, type: "n8n-nodes-base.code", typeVersion: 2,
      position: [-560, -160], parameters: { mode: "runOnceForAllItems", jsCode },
    },
    {
      // The only branch in this graph, and it exists for one reason: cadence's deliberate throw. Same IF v2
      // string-compare shape as the cadence's `09 Tell a person?`, i.e. the same block whose shape depends on
      // the n8n version - so there is one shape to re-verify on import, not two.
      id: "watch-tell", name: WATCH_NAMES.tell, type: "n8n-nodes-base.if", typeVersion: 2,
      position: [-360, -160],
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [{
            id: "watcher-wants-to-notify", leftValue: "={{ String($json.notifyNeeded) }}", filterType: "string",
            operator: { type: "string", operation: "equals" }, rightValue: "true",
          }],
          combinator: "and",
          options: {},
        },
        options: { branchMode: "matchingBranch" },
      },
    },
    {
      // One POST to the alert server's root, exactly the shape cadence's `23` uses, and for the same reasons:
      // ntfy takes a JSON body only at the root, `$env` supplies the token so no secret enters this file, and
      // `neverError: false` means a delivery that failed turns *this* run red instead of looking fine.
      id: "watch-notify", name: WATCH_NAMES.notify, type: "n8n-nodes-base.httpRequest", typeVersion: 4,
      position: [-160, -160],
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
    [WATCH_NAMES.trigger]: { main: [[{ node: WATCH_NAMES.compose, type: "main", index: 0 }]] },
    [WATCH_NAMES.compose]: { main: [[{ node: WATCH_NAMES.tell, type: "main", index: 0 }]] },
    [WATCH_NAMES.tell]: { main: [[{ node: WATCH_NAMES.notify, type: "main", index: 0 }], []] },
  };

  // The second channel, off by default (ALERT.fallback is null in series.config.mjs, D206). The vendor's named
  // mitigation for the recursion trap is "use a different channel than the monitored workflows", and this is
  // the shape for it: A3's error output wired to a fallback sender, with the `onError` property that makes the
  // output exist. Both halves or neither - which is what `checkAlerter()` fails a build for.
  if (ALERT.fallback) {
    const fb = ALERT.fallback;
    if (fb.kind !== "discord") throw new Error(`ALERT.fallback.kind is ${JSON.stringify(fb.kind)}; only "discord" (an incoming webhook POST) is implemented here`);
    nodes.push({
      id: "watch-fallback", name: WATCH_NAMES.fallback, type: "n8n-nodes-base.httpRequest", typeVersion: 4,
      position: [-160, 60],
      parameters: {
        method: "POST", url: `={{ $env.${fb.urlEnv} }}`, sendQuery: false,
        options: {
          response: { response: { neverError: false } },
          headers: [{ name: "content-type", value: "application/json" }],
          batching: { enabled: false },
        },
        sendBody: true, specifyBody: "json",
        // Read the words off A1 by name, not off the error item: what an error output carries differs between
        // versions, and a fallback that reads nothing is a fallback that sends nothing.
        jsonBody: `={{ JSON.stringify($('${WATCH_NAMES.compose}').item.json.fallbackBody) }}`,
      },
      retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    });
    // A3 must carry the property for its error output to exist at all (D195's lesson, learned the hard way).
    nodes.find((n) => n.name === WATCH_NAMES.notify).onError = "continueErrorOutput";
    connections[WATCH_NAMES.notify] = { error: [[{ node: WATCH_NAMES.fallback, type: "main", index: 0 }]] };
  }

  return {
    name: ALERTER_NAME,
    nodes,
    connections,
    settings: {
      executionOrder: "v1",
      timezone: INSTANCE.timezone ?? "America/Chicago",
      // The same four flags the other artifacts declare (D201): this box's packaged default keeps no
      // successful run at all, and a watcher whose runs are unreadable is a watcher nobody can audit.
      ...RETENTION,
      // Deliberately absent: `errorWorkflow` here would mean this workflow's own failure calls itself, and
      // n8n does not re-trigger an error workflow on its own failure. Nothing watches the watcher; that is
      // what the weekly heartbeat is for (D205).
    },
    meta: { templateCredsSetupCompleted: false },
    tags: ["mobilizon", "cadence", "alerting"],
  };
}

/**
 * The watcher's own invariants, as a function so a test can break them on purpose.
 * Returns [] for a watcher this repo would ship; otherwise the reasons it is not one.
 */
export function checkAlerter(wf) {
  const problems = [];
  const nodes = wf.nodes ?? [];
  const nodeNames = new Set(nodes.map((n) => n.name));
  const json = JSON.stringify(wf);
  const byName = new Map(nodes.map((n) => [n.name, n]));

  // 1. Exactly one Error Trigger, and it is the start of everything.
  const triggers = nodes.filter((n) => /trigger/i.test(n.type));
  if (triggers.length !== 1) problems.push(`the watcher holds exactly one trigger, found ${triggers.length}`);
  const et = triggers[0];
  if (et && et.type !== "n8n-nodes-base.errorTrigger") problems.push(`${et.name}: ${et.type} - this workflow is started by n8n's failure machinery, nothing else`);
  if (et && (et.typeVersion ?? 1) !== 1) problems.push(`${et.name}: typeVersion ${et.typeVersion}; this instance serves errorTrigger v1 (measured 2026-11-05 via the instance's own get_node_types)`);
  if (et && !(wf.connections?.[et.name]?.main ?? []).flat().filter(Boolean).length) problems.push(`${et.name}: its main output goes nowhere, so the watcher composes nothing and tells nobody`);
  // A watcher that can also be started by hand or by a clock is a watcher that can *think* it saw a failure.
  for (const n of triggers.filter((t) => t !== et)) problems.push(`${n.name}: a second trigger type in an error workflow is a second start path`);

  // 2. One host, and it is not the monitored one. An alerter that calls the thing being monitored is a worse
  //    instrument: the outage that broke the run also blinds the report about it.
  const http = nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest");
  const expectSends = ALERT.fallback ? 2 : 1;
  if (http.length !== expectSends) problems.push(`the watcher holds ${expectSends} request node(s)${ALERT.fallback ? " (ntfy + the configured fallback)" : ""}, found ${http.length}`);
  for (const n of http) {
    const u = String(n.parameters.url ?? "");
    if (n.name === WATCH_NAMES.notify) {
      let parsed = null;
      try { parsed = new URL(u); } catch { problems.push(`${n.name}: url is not a URL`); }
      if (parsed) {
        if (parsed.origin !== new URL(ALERT.rootUrl).origin) problems.push(`${n.name}: ${parsed.origin} is not the alert server ${ALERT.rootUrl}`);
        if (parsed.pathname !== "/") problems.push(`${n.name}: path ${parsed.pathname} - ntfy takes a JSON body at the server root only`);
        if (parsed.protocol !== "https:") problems.push(`${n.name}: ${parsed.protocol} - a token must not cross a plain-HTTP hop`);
      }
    } else if (!u.includes(`$env.${ALERT.fallback?.urlEnv}`)) {
      problems.push(`${n.name}: its URL is not "$env.${ALERT.fallback?.urlEnv}" - a webhook URL is a secret and belongs in the n8n environment (D177)`);
    }
    if (n.parameters.sendQuery) problems.push(`${n.name}: sendQuery is on - a token in a query string is a token in an access log`);
    if ((n.parameters.options?.response?.response?.neverError ?? false) !== false) problems.push(`${n.name}: neverError would turn a failed alert into a successful run`);
    if (!n.parameters.sendBody || n.parameters.specifyBody !== "json") problems.push(`${n.name}: body is not JSON`);
    if (n.retryOnFail !== true) problems.push(`${n.name}: no retryOnFail - a transient blip would lose the only notification this workflow exists to send`);
    for (const h of n.parameters.options?.headers ?? []) {
      if (/tk_[A-Za-z0-9]{16,}/.test(String(h.value ?? ""))) problems.push(`${n.name}: an ntfy token value in a header - it belongs in $env.${ALERT.tokenEnv}`);
    }
  }
  if (new URL(ALERT.rootUrl).host === new URL(INSTANCE.baseUrl).host) problems.push("ALERT and INSTANCE are the same host - the watcher would be watching itself");
  // Which surfaces must be absent, and why: the watcher's *requests* are the argument (checked above, host by
  // host), and what else must not appear is anything that would make it a second holder of a Mobilizon secret
  // or a second writer. `lib/core.mjs` is shared code and legitimately names cadence's helpers, so the check
  // is on secrets and write vocabulary, not on every word the planner uses.
  for (const forbidden of [INSTANCE.baseUrl, config.CREDENTIALS?.emailEnv, config.CREDENTIALS?.passwordEnv, "mutation ", "query CadenceRead"]) {
    if (forbidden && json.includes(forbidden)) problems.push(`the watcher mentions "${forbidden}" - it must carry nothing that could reach or authenticate to the monitored instance`);
  }

  // 3. No credential block anywhere, and the token read by name only.
  for (const n of nodes) {
    if (n.credentials && Object.keys(n.credentials).length) problems.push(`${n.name}: carries an n8n credential block - the watcher authenticates with $env.${ALERT.tokenEnv}, by name (D177)`);
  }
  if (!json.includes(`$env.${ALERT.tokenEnv}`)) problems.push(`the delivery node no longer reads $env.${ALERT.tokenEnv}`);

  // 4. The gate: exactly one IF, comparing the composer's own word, with the false branch empty.
  const ifs = nodes.filter((n) => n.type.endsWith(".if"));
  if (ifs.length !== 1) problems.push(`the watcher holds one gate (the duplicate rule), found ${ifs.length}`);
  for (const g of ifs) {
    const c = g.parameters?.conditions?.conditions?.[0] ?? {};
    if (!String(c.leftValue ?? "").includes("notifyNeeded")) problems.push(`${g.name}: it is not comparing the composer's notifyNeeded`);
    if (c.rightValue !== "true") problems.push(`${g.name}: compares against ${JSON.stringify(c.rightValue)}, not "true"`);
    if (g.parameters?.options?.branchMode !== "matchingBranch") problems.push(`${g.name}: branchMode must be matchingBranch or a non-matching item goes nowhere`);
    const outs = wf.connections?.[g.name]?.main ?? [];
    if ((outs[1] ?? []).filter(Boolean).length) problems.push(`${g.name}: its false branch is wired - a suppressed duplicate must reach nothing`);
  }

  // 5. The duplicate rule has to exist in the code, and match the marker the cadence throws with.
  const compose = byName.get(WATCH_NAMES.compose);
  if (!compose?.parameters?.jsCode) problems.push(`${WATCH_NAMES.compose} has no jsCode - the injection did not happen`);
  else {
    const code = compose.parameters.jsCode;
    if (!code.includes("errorAlertFields")) problems.push(`${WATCH_NAMES.compose} no longer builds its message through core.mjs' errorAlertFields - the wording would drift from the rehearsal`);
    // The exact conjunction, not just the word: a gate that reads `channelReady` alone still mentions the
    // duplicate in its output object and would send the second message anyway.
    if (!code.includes("channelReady && !f.duplicate")) {
      problems.push(`${WATCH_NAMES.compose} no longer gates the send on the duplicate rule (D194) - the gate must be channelReady && !f.duplicate`);
    }
    // The channel travels as one literal, and the literal must be *this* repo's channel - otherwise the
    // watcher is pointing at some other host or topic that no config here describes.
    const m = /const ALERTCFG = (\{[\s\S]*?\n\});/.exec(code);
    if (!m) problems.push(`${WATCH_NAMES.compose} has no "const ALERTCFG = {...}" literal from series.config.mjs`);
    else {
      let parsed = null;
      try { parsed = JSON.parse(m[1]); } catch (e) { problems.push(`${WATCH_NAMES.compose}: the ALERT literal does not parse: ${e.message}`); }
      if (parsed && JSON.stringify(parsed) !== JSON.stringify(ALERT)) {
        problems.push(`${WATCH_NAMES.compose}'s ALERT literal is not series.config.mjs' ALERT (${JSON.stringify(parsed?.rootUrl)} vs ${ALERT.rootUrl}) - rebuild the artifact`);
      }
    }
    try { new Function("$", "$json", code); } catch (e) { problems.push(`${WATCH_NAMES.compose}: the Code node does not parse: ${e.message}`); }
  }

  // 6. Error-output halves: both or neither (the D195 lesson, applied to the watcher itself).
  const wired = new Set(Object.entries(wf.connections ?? {}).filter(([, p]) => (p.error ?? []).flat().filter(Boolean).length).map(([from]) => from));
  for (const n of nodes) {
    if (n.onError !== undefined && n.onError !== "continueErrorOutput") problems.push(`${n.name}.onError is ${JSON.stringify(n.onError)} - this graph only uses continueErrorOutput`);
    if (wired.has(n.name) && n.onError !== "continueErrorOutput") problems.push(`${n.name}: error output wired with no onError - the branch can never fire`);
    if (n.onError === "continueErrorOutput" && !wired.has(n.name)) problems.push(`${n.name}: onError with nothing wired - the error is dropped and the run looks successful`);
  }
  if (ALERT.fallback) {
    if (!wired.has(WATCH_NAMES.notify)) problems.push(`ALERT.fallback is configured but ${WATCH_NAMES.notify}'s error output is not wired - the fallback is decoration`);
    if (!nodes.some((n) => n.name === WATCH_NAMES.fallback)) problems.push("ALERT.fallback is configured but the fallback node is missing");
  } else if (wired.size) {
    problems.push("an error branch exists with no fallback configured - it would swallow the send failure and leave the run looking clean");
  }

  // 7. Settings: the same retention argument as every other artifact (D201), and never a self-link.
  if (wf.settings?.executionOrder !== "v1") problems.push("settings.executionOrder is not v1");
  if (!wf.settings?.timezone) problems.push("settings.timezone is unset - the trigger's hour would follow the instance default and move when the box is rebuilt");
  for (const [k, want] of Object.entries(RETENTION)) {
    if (wf.settings?.[k] !== want) problems.push(`settings.${k} is ${JSON.stringify(wf.settings?.[k])}, must be ${JSON.stringify(want)} (D201)`);
  }
  if (wf.settings?.errorWorkflow) problems.push("settings.errorWorkflow points the watcher at an error workflow - n8n does not re-trigger an error workflow on its own failure, so this is a loop that reports nothing");

  // 8. Names resolve; nothing feeds the trigger.
  for (const [from, ports] of Object.entries(wf.connections ?? {})) {
    if (!nodeNames.has(from)) problems.push(`connections reference ${from}, which is not a node`);
    for (const list of Object.values(ports)) for (const arr of list ?? []) for (const c of arr ?? []) {
      if (!nodeNames.has(c.node)) problems.push(`${from} -> ${c.node}: no such node`);
      if (c.node === WATCH_NAMES.trigger) problems.push(`${c.node} is fed by ${from} - an Error Trigger starts this workflow, nothing feeds it`);
    }
  }
  for (const m of json.matchAll(/\$\('([^']+)'\)/g)) {
    if (!nodeNames.has(m[1])) problems.push(`$('${m[1]}') names a node that does not exist`);
  }
  return problems;
}

/** The watcher's channel, resolved the same way every other artifact resolves it. */
const CHANNEL = ALERT;

const isMain = process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
if (isMain) {
  const workflow = buildAlerter();
  const problems = checkAlerter(workflow);
  const json = JSON.stringify(workflow, null, 2);

  if (CHECK) {
    let onDisk = null;
    try { onDisk = readFileSync(OUT, "utf8"); }
    catch { problems.push(`${OUT.pathname} does not exist - run: node integrations/mobilizon-cadence/build-alerter.mjs`); }
    if (onDisk !== null && onDisk !== json + "\n") {
      problems.push(`${OUT.pathname} is stale: not what build-alerter.mjs produces. Rebuild and commit it.`);
    }
  }

  if (problems.length) {
    console.error(`cadence error watcher build blocked:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }

  if (CHECK) {
    console.log(`cadence error watcher ok: ${workflow.nodes.length} nodes, one Error Trigger, one host (${CHANNEL.host})${CHANNEL.fallback ? " plus the configured fallback" : " and no fallback"}, no credential, no self-link`);
  } else {
    writeFileSync(OUT, json + "\n");
    console.log(`built ${OUT.pathname}: ${workflow.nodes.length} nodes, ${json.split("\n").length} lines of JSON`);
    console.log('link it from the cadence: open the cadence -> Settings -> Error Workflow -> pick this watcher (the id belongs to the instance, D206)');
  }
}
