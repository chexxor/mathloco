#!/usr/bin/env node
/**
 * verify-import.mjs - is the workflow running in n8n the workflow this repo reviewed?
 *
 *   node integrations/mobilizon-cadence/verify-import.mjs <file exported from n8n>
 *   node integrations/mobilizon-cadence/verify-import.mjs --selftest      # the plantings must be caught
 *   node integrations/mobilizon-cadence/verify-import.mjs --fingerprint <file>
 *
 * Why (D184). `build-workflow.mjs` proves the artifact's invariants *before* it is imported, and
 * `test/workflow.test.mjs` executes its Code nodes. Neither says anything about what comes back out of n8n
 * afterwards, and every remaining risk in this integration lives in that gap: n8n rewrites the `IF` condition
 * block on import (the operator guide used to say "open 05 and confirm it by eye"), it may upgrade node
 * typeVersions, it drops `settings.timezone` on some import paths - which moves the 09:00 trigger to the
 * instance default - and if anyone edits the config inside the n8n editor, there are then two configs and the
 * tests describe neither. The docs also state that exports carry credential names and IDs
 * (docs.n8n.io, "Export and import"), so an attached credential is visible here rather than invisible.
 *
 * How to use it: in n8n, Workflow menu → **Download**, save the file, then run this against it. It picks its
 * own baseline from the document's name, so the probe export is verified against the probe artifact.
 *
 * It also **runs** the exported copy: its reasoning nodes execute here against
 * `fixtures/group-history-2026-11-04.json` (no credential, no network, and no way to write - `06`/`07` are HTTP
 * nodes the harness never calls), and that plan is compared with the artifact's plan. That answers the question
 * the operator actually has — "what would the installed copy do?" — in the same words `simulate.mjs` prints,
 * so the comparison is two sentences instead of two JSON files.
 *
 * Severity: FATAL = do not activate (a safety property is gone). DRIFT = something differs from the reviewed
 * artifact; fix it in the repo and re-import. WARN = n8n normalised something this script cannot read with
 * confidence; it says exactly what to look at. NOTE = expected (your alerting node, for instance).
 *
 * Nothing here contacts n8n or Mobilizon: n8n.labradorius.com answers 302 to the YunoHost SSO from this seat
 * (measured 2026-11-04), so the round trip is done by the operator's hands and by this file.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runCodeNode, runCodeChain } from "./lib/sandbox.mjs";
import { checkProbe } from "./build-probe.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const config = await import(new URL("./series.config.mjs", import.meta.url).href);
const { INSTANCE, CREDENTIALS, RUN } = config;

export const CADENCE = JSON.parse(readFileSync(here + "n8n/cadence-workflow.json", "utf8"));
export const PROBE = JSON.parse(readFileSync(here + "n8n/env-probe.json", "utf8"));

// The names the safety invariants are written against. If a name changes in the artifact, this file must
// change with it - which is the point: they are load-bearing, not incidental.
const N = {
  cfg: "01 Config", read: "02 Read the series history", signIn: "03 Sign in",
  plan: "04 Plan & decide", gate: "05 Stop if nothing to write",
  create: "06 Create event", audit: "07 Audit the date", report: "08 Report",
  errPath: "21 Report error path", errPlan: "22 Report a problem",
};

const NODE_IGNORE = new Set(["id", "position", "meta", "webhookId", "notes", "notesInFlow"]);

export const fingerprint = (wf) => {
  const canon = JSON.stringify({
    name: wf.name,
    nodes: (wf.nodes ?? []).map((n) => {
      const clean = {};
      for (const [k, v] of Object.entries(n)) if (!NODE_IGNORE.has(k)) clean[k] = v;
      return clean;
    }).sort((a, b) => a.name.localeCompare(b.name)),
    connections: edges(wf).sort(),
    settings: wf.settings ?? {},
  });
  return createHash("sha256").update(canon).digest("hex").slice(0, 12);
};

/** Every edge in the graph as one comparable string. */
export function edges(wf) {
  const out = [];
  for (const [from, ports] of Object.entries(wf.connections ?? {})) {
    for (const [port, lists] of Object.entries(ports ?? {})) {
      (lists ?? []).forEach((list, index) => {
        for (const c of list ?? []) out.push(`${from} -[${port}:${index}]-> ${c.node} (${c.type ?? "?"})`);
      });
    }
  }
  return out;
}

const byName = (wf) => new Map((wf.nodes ?? []).map((n) => [n.name, n]));

/** Normalize an IF v2 condition block to what it *means*. Returns null when the shape is not v2 - an honest
 *  "I cannot read this", not a silent pass. */
export function readGate(node) {
  const c = node?.parameters?.conditions;
  const list = Array.isArray(c) ? c : c?.conditions;
  if (!Array.isArray(list) || !list.length) return null;
  const first = list[0] ?? {};
  const left = first.leftValue ?? first.value1;
  const right = first.rightValue ?? first.value2;
  const op = typeof first.operator === "object" ? first.operator.operation : first.operator;
  if (left === undefined || right === undefined || op === undefined) return null;
  return {
    left: String(left), right: String(right), op: String(op),
    count: list.length,
    combinator: (Array.isArray(c) ? "and" : c?.combinator) ?? "and",
    branchMode: node?.parameters?.options?.branchMode ?? null,
    version: node?.typeVersion ?? null,
  };
}

/** Header lists arrive in more than one shape across n8n versions; compare what they send, not how. */
function headerSet(node) {
  const h = node?.parameters?.options?.headers ?? node?.parameters?.headersParameters ?? node?.parameters?.headers;
  if (!h) return [];
  const pairs = Array.isArray(h) ? h.map((x) => [x.name, x.value]) : Object.entries(h);
  return pairs.map(([k, v]) => `${String(k).toLowerCase()}=${String(v)}`).sort();
}

/** Deep, leaf-wise diff. Long strings (a Code node body) are compared by bytes and reported as lengths. */
function* diff(a, b, path = "") {
  if (a === b) return;
  if (typeof a === "string" || typeof b === "string") {
    if (typeof a === "string" && typeof b === "string" && Math.max(a.length, b.length) > 400) {
      if (a !== b) yield { path, kind: "text", expected: `${a.length} chars`, got: `${b.length} chars`, firstDiff: firstDiff(a, b) };
      return;
    }
    if (a !== b) yield { path, kind: "value", expected: a, got: b };
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) { yield { path, kind: "shape", expected: a, got: b }; return; }
    if (a.length !== b.length) yield { path: `${path}.length`, kind: "value", expected: a.length, got: b.length };
    for (let i = 0; i < Math.max(a.length, b.length); i++) yield* diff(a[i], b[i], `${path}[${i}]`);
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      // n8n writes cosmetic node annotations inside `parameters` as well as at the node root, so they are
      // ignored at any depth - everything else a node carries is fair game.
      if (k === "notes" || k === "notesInFlow") continue;
      yield* diff(a[k], b[k], path ? `${path}.${k}` : k);
    }
    return;
  }
  if (a !== b) yield { path, kind: "value", expected: a, got: b };
}

function firstDiff(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return JSON.stringify({ at: i, expected: a.slice(Math.max(0, i - 30), i + 40), got: b.slice(Math.max(0, i - 30), i + 40) });
}

const mask = (s) => {
  const t = String(s);
  return /^(eyJ|Bearer |Basic )/.test(t) || t.length > 60 ? `${t.slice(0, 8)}…(${t.length} chars, masked)` : t;
};

/**
 * The check itself. Returns findings (severity, where, what, means) plus the two fingerprints and what the
 * exported copy would do.
 */
export function verifyDocument(got, expected = CADENCE) {
  const F = [];
  const add = (sev, where, what, means) => F.push({ sev, where, what, means });

  // ---- shape
  if (!got || !Array.isArray(got.nodes)) return { findings: [{ sev: "fatal", where: "file", what: "not a workflow document (no nodes array)", means: "n8n's Download gives one object with nodes and connections" }], fingerprintGot: "-", fingerprintExpected: fingerprint(expected) };
  if (Array.isArray(got)) return verifyDocument(got[0], expected);

  const fpGot = fingerprint(got), fpExp = fingerprint(expected);
  const same = fpGot === fpExp;

  // ---- the properties that decide whether a write is possible, read from the exported bytes themselves
  const gotNodes = byName(got);
  const gateNode = gotNodes.get(N.gate);
  const exportedCfg = runExportedConfig(got);
  const exportsWouldWrite = exportedCfg ? exportedCfg.RUN?.dryRun === false : null;

  if (same) add("note", "fingerprint", "identical to the reviewed artifact", "the round trip lost nothing; this is the answer you want");

  // ---- name
  if (got.name !== expected.name) add("drift", "name", `${JSON.stringify(got.name)} vs ${JSON.stringify(expected.name)}`, "a renamed copy in the workflow list is a copy someone made by hand");

  // ---- node sets
  const expNames = new Set((expected.nodes ?? []).map((n) => n.name));
  const gotNames = new Set(got.nodes.map((n) => n.name));
  for (const n of expNames) if (!gotNames.has(n)) add("fatal", n, "the node is gone from the running copy", expected.nodes.find((x) => x.name === n).type + " - the chain has a hole where it was");
  const into = new Map();
  for (const [from, ports] of Object.entries(got.connections ?? {})) {
    for (const [port, lists] of Object.entries(ports ?? {})) for (const list of lists ?? []) for (const c of list ?? []) {
      if (!into.has(c.node)) into.set(c.node, []);
      into.get(c.node).push({ from, port });
    }
  }
  const alertAdditions = new Set();
  for (const n of gotNames) {
    if (expNames.has(n)) continue;
    const feeders = into.get(n) ?? [];
    const alertOnly = feeders.length > 0 && feeders.every((f) => f.from === N.errPath || f.from === N.errPlan);
    const outEdges = (got.connections?.[n]?.main ?? []).flat().length;
    if (alertOnly && !outEdges) {
      alertAdditions.add(n);
      add("note", n, `added node, fed only by ${feeders.map((f) => f.from).join(", ")}`, "that is alerting, which the guide asks for - expected, and it does not touch the chain");
    } else if (alertOnly) add("warn", n, "added node feeds something downstream", "an alert terminal should be the end of a path; check it does not route back into the chain");
    else add("drift", n, `added node, fed by ${feeders.map((f) => f.from || "(nothing)").join(", ") || "nothing"}`, "the reviewed artifact has 11 nodes; anything else needs a reason and a rebuild in the repo, not an edit in the editor");
  }

  // ---- per-node, for the nodes that exist in both
  for (const name of expNames) {
    if (!gotNames.has(name)) continue;
    const a = expected.nodes.find((x) => x.name === name), b = gotNodes.get(name);

    if (a.type !== b.type) add("fatal", name, `type ${b.type} instead of ${a.type}`, "a different node: the parameters are not the same parameters");
    if ((a.typeVersion ?? 0) !== (b.typeVersion ?? 0)) {
      const sev = (b.typeVersion ?? 0) > (a.typeVersion ?? 0) ? "warn" : "fatal";
      add(sev, name, `typeVersion ${b.typeVersion} instead of ${a.typeVersion}`,
        sev === "warn"
          ? "n8n upgraded the node on import. The artifact names the lowest version that carries what is used, so this is usually safe - but for an IF node it means the condition block was rewritten, so the gate check below is the one that matters."
          : "older than the artifact was built for: parameters may not exist yet in that version");
    }
    if (b.credentials && Object.keys(b.credentials).length) {
      add("fatal", name, `carries n8n credential(s): ${Object.keys(b.credentials).join(", ")}`, "D177 authenticates inside the run; an attached credential is a second, untracked auth path (and exports carry credential names and IDs)");
    }
    if (b.disabled) add("fatal", name, "disabled", "a disabled node in the chain silently breaks the run - and this one was not disabled in the reviewed artifact");

    // headers and the IF block get their own comparison; drop them from the generic diff so nothing double-reports
    const stripFor = (o) => {
      const c = structuredClone(o);
      for (const k of NODE_IGNORE) delete c[k];
      // these four are each checked explicitly above, with a message written for the case, so the generic
      // diff must not report them a second time
      delete c.typeVersion; delete c.credentials; delete c.disabled;
      if (c.parameters?.options?.headers) delete c.parameters.options.headers;
      if (c.parameters?.conditions) delete c.parameters.conditions;
      return c;
    };
    for (const d of diff(stripFor(a), stripFor(b), name)) {
      const isCode = /jsCode$/.test(d.path);
      const isUrl = /\.url$/.test(d.path);
      const isBody = /jsonBody$/.test(d.path);
      const isNeverError = /neverError$/.test(d.path);
      const sev = isCode ? "fatal" : (isUrl || isBody || isNeverError) ? "fatal" : "drift";
      if (isCode) {
        const runA = name === N.cfg ? runExportedConfig(expected) : null;
        const runB = name === N.cfg ? runExportedConfig(got) : null;
        // `runAt` is a clock the node stamps when it runs, so it always differs between two executions; the
        // question is whether the *decisions* differ, so the volatile field is excluded and the rest is listed.
        const cfgDiff = runA && runB
          ? [...diff(runA, runB, "config")].filter((d) => !/\.runAt$/.test(d.path)).slice(0, 3)
          : [];
        add(sev, d.path, `the Code node's text differs (${d.expected} -> ${d.got})`,
          name === N.cfg
            ? `this node is the injected copy of series.config.mjs. ${cfgDiff.length ? `Running both, they disagree on: ${cfgDiff.map((c) => `${c.path} (${JSON.stringify(c.expected)} -> ${JSON.stringify(c.got)})`).join("; ")}.` : "Running both gives the same object, so the difference is formatting or a comment."} Two configs is the failure the guide warns about: fix series.config.mjs and re-import.`
            : "the rules live in lib/ and nodes/, and the tests execute the generated text. A Code node edited in the n8n editor is a rule no test has ever run.");
      } else {
        add(sev, d.path, `${JSON.stringify(mask(d.expected))} -> ${JSON.stringify(mask(d.got))}`,
          isUrl ? "every request must go to the one configured instance at the path 5.2.4 serves"
            : isBody ? "the GraphQL document travels from 01 Config; a body typed into an HTTP node has no home in the repo"
              : isNeverError ? "neverError: true turns a refused write into a run that looks successful"
                : "differs from the reviewed artifact");
      }
    }

    const ha = headerSet(a), hb = headerSet(b);
    if (JSON.stringify(ha) !== JSON.stringify(hb)) {
      const lost = ha.filter((h) => !hb.includes(h)), gained = hb.filter((h) => !ha.includes(h));
      add("fatal", `${name}.headers`, `sent headers differ: -[${lost.join(" ")}] +[${gained.join(" ")}]`, "the Authorization header is this run's session token, and content-type is what makes Mobilizon answer JSON");
    }

    if (a.type.endsWith(".if")) {
      const ga = readGate(a), gb = readGate(b);
      const uncertain = exportsWouldWrite ? "fatal" : "warn";
      const sem = (g) => (g ? JSON.stringify({ left: g.left, right: g.right, op: g.op, count: g.count, combinator: g.combinator }) : null);
      if (!gb) {
        add(uncertain, `${name}.conditions`, "the condition block is in a shape this script cannot read",
          exportsWouldWrite
            ? "writes are ON and the gate is the only thing between a dry run and a write - read the node in the UI before activating"
            : "harmless while dryRun is true (nothing can be written anyway); read the node in the UI before turning writes on");
      } else if (sem(ga) !== sem(gb)) {
        add("fatal", `${name}.conditions`, `gate reads ${JSON.stringify(gb)}; the artifact says ${JSON.stringify(ga)}`,
          "this IF node is the write switch: it must route only action == \"create\" into 06, and everything else to its false branch (08 Report)");
      } else if (gb.branchMode !== ga.branchMode || gb.version !== ga.version) {
        add(uncertain, `${name}.conditions`, `same comparison, different block shape (branchMode ${ga.branchMode} -> ${gb.branchMode}, typeVersion ${ga.version} -> ${gb.version})`,
          "n8n rewrote the block. The rule still reads the same, but which branch a non-matching item takes is exactly what a rewrite can move - open the node once and confirm non-matching items go to the false branch (08 Report).");
      }
    }
  }

  // ---- connections
  const ea = new Set(edges(expected)), eb = new Set(edges(got));
  for (const e of ea) if (!eb.has(e)) {
    add("fatal", e, "this edge is missing in the running copy", /-\[error:/.test(e)
      ? "the error output is how a failed stage reaches 21 Report error path - without it a scheduled failure is a red dot nobody sees"
      : "the chain is broken here");
  }
  for (const e of eb) if (!ea.has(e)) {
    const toCreate = e.includes(`-> ${N.create} `);
    const toAlert = [...alertAdditions].some((n) => e.includes(`-> ${n} `));
    if (toAlert) continue;                       // the edge that makes your alerting node an alert: expected
    add(toCreate ? "fatal" : "drift", e, "an edge the reviewed artifact does not have",
      toCreate ? "only 05 may start a write; a second path into 06 bypasses the dry-run switch"
        : "unexpected wiring - if it is your alerting node it should be fed by 21 or 22 and end there");
  }

  // ---- settings: the quiet ones that change behaviour without changing any node
  const sa = expected.settings ?? {}, sb = got.settings ?? {};
  for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
    if (sa[k] === sb[k]) continue;
    if (k === "timezone") add("fatal", `settings.timezone`, `${JSON.stringify(sb[k])} vs ${JSON.stringify(sa[k])}`, "the trigger's 09:00 is in this zone: leave it to the instance default and the run moves hours without anyone touching a node");
    else if (k === "executionOrder") add("fatal", k, `${JSON.stringify(sb[k])} vs ${JSON.stringify(sa[k])}`, "the v0 order evaluates expressions differently than every test in this directory assumes");
    else if (/^saveData|^savePre/.test(k)) add("note", k, `${JSON.stringify(sb[k])} vs ${JSON.stringify(sa[k])}`, "execution retention: node 03's request body carries a password, so pruning is a host job (docs/security.md)");
    else add("warn", `settings.${k}`, `${JSON.stringify(sb[k])} vs ${JSON.stringify(sa[k])}`, "a workflow setting nobody set in the repo");
  }

  if (got.pinData && Object.keys(got.pinData).length) {
    add("fatal", "pinData", `pinned data on ${Object.keys(got.pinData).join(", ")}`, "a pinned item makes every later run answer from that snapshot - including a stale calendar read");
  }
  if (got.active) add("note", "active", "this copy is activated", "it is firing on the schedule whether or not you verified it");

  // ---- safety properties, asserted on the exported bytes rather than inferred from the diff.
  // Which properties apply depends on which artifact this document claims to be: the cadence's are about
  // writes, the probe's are about being unable to make one (checkProbe is the same argument its build uses).
  const isCadence = expected.name === CADENCE.name;
  const isProbe = expected.name === PROBE.name;
  if (isProbe) {
    for (const p of checkProbe(got)) add("fatal", "probe", p, "this document claims to be the read-only probe; its own build invariants say why it must stay that way");
  }
  const intoCreate = (into.get(N.create) ?? []);
  if (isCadence && (intoCreate.length !== 1 || intoCreate[0].from !== N.gate)) {
    add("fatal", N.create, `${intoCreate.length} inbound edge(s): ${intoCreate.map((i) => i.from).join(", ") || "none"}`, "exactly one edge may start a write, and it must come from the gate");
  }
  for (const n of got.nodes) {
    for (const c of (got.connections?.[n.name]?.main ?? []).flat() ?? []) {
      if (isCadence && c?.node === N.errPath) add("fatal", `${n.name} -> ${N.errPath}`, "the error reporter is fed from a main output", "a clean run would arrive there with no error and throw - a mysterious second failure");
    }
    const u = n.parameters?.url;
    if (u) {
      try {
        const parsed = new URL(u);
        if (parsed.origin !== new URL(INSTANCE.baseUrl).origin) add("fatal", `${n.name}.url`, parsed.origin, `only ${INSTANCE.baseUrl} may be called`);
        if (isCadence && parsed.pathname !== INSTANCE.graphqlPath) add("fatal", `${n.name}.url`, `path ${parsed.pathname}`, `5.2.4 serves ${INSTANCE.graphqlPath} on this instance (probed 2026-11-04)`);
      } catch { add("fatal", `${n.name}.url`, "not a URL", "the artifact uses the absolute endpoint literally"); }
    }
  }
  if (isCadence) {
    for (const t of [N.errPath, N.errPlan]) {
      const p = got.connections?.[t];
      const downstream = ((p?.main ?? []).flat()).filter(Boolean).filter((c) => !alertAdditions.has(c.node));
      const viaError = ((p?.error ?? []).flat()).length;
      if (downstream.length || viaError) {
        add("drift", t, `not a terminal node (feeds ${downstream.map((c) => c.node).join(", ") || "an error branch"})`,
          "the two reporters end a path; anything downstream of them that is not your alerting node is a second failure path");
      }
    }
    const json = JSON.stringify(got.nodes);
    for (const shape of ['"password"', '"accessToken":', '"Basic ', '"Bearer ey', "eyJ"]) {
      if (json.includes(shape)) add("fatal", "nodes", `${shape} appears as a literal`, "no credential may exist in the workflow JSON: node 03 reads the names of two environment variables (D177)");
    }
    if (!json.includes(`$env.${CREDENTIALS.passwordEnv}`)) add("fatal", "03 Sign in", `it no longer reads $env.${CREDENTIALS.passwordEnv}`, "the password's only permitted home is the n8n environment");
  }

  // ---- the exported copy, **executed**. Not a second way to catch a changed rule - the Code text is
  // compared byte for byte above. It is the answer to a different question: "what would the copy that is
  // actually installed do?", printed in the same words `simulate.mjs` prints, so the operator compares two
  // sentences rather than two JSON files. Seeded from the saved calendar, so it needs no network.
  const runExp = planOf(expected), runGot = planOf(got);
  if (runExp.error) {
    add("warn", "execution", `the reviewed artifact did not run in this harness: ${runExp.error}`,
      "that is the artifact or the harness, not your import - re-run build-workflow.mjs and check.mjs before reading anything else here");
  } else if (runGot.error) {
    add("fatal", "execution", `the exported copy did not run: ${runGot.error}`,
      "the chain inside n8n would fail the same way at 09:00 - an expression pointing at a node that is not there, or a Code node that no longer parses");
  } else if (JSON.stringify(runExp.plan) !== JSON.stringify(runGot.plan)) {
    add("fatal", "execution",
      `run against the same saved calendar the two copies plan differently: exported ${JSON.stringify(runGot.plan)} vs artifact ${JSON.stringify(runExp.plan)}`,
      "the reasoning lives in Code nodes whose text is compared above, so if the text matches and the plans do not, the two runs straddled a clock change - re-run once before believing this");
  } else if (runGot.skipped.length !== runExp.skipped.length) {
    add("drift", "execution", `nodes outside the executed chain differ: ${JSON.stringify(runGot.skipped)} vs ${JSON.stringify(runExp.skipped)}`,
      "a node that fell out of the main chain stops being exercised by a dry run");
  }

  return {
    findings: F,
    fingerprintGot: fpGot,
    fingerprintExpected: fpExp,
    identical: same,
    wouldWrite: exportsWouldWrite,
    exportedRun: exportedCfg?.RUN ?? null,
    runs: { expected: runExp.plan, got: runGot.plan, report: runGot.report, error: runGot.error ?? runExp.error ?? null },
  };
}

/**
 * Run a copy's reasoning nodes against the saved calendar and report what they decide. `06`/`07` are HTTP
 * nodes, so the write leg never runs here - which is the point: this answers "what would it plan" with no
 * credential and no possibility of a write.
 */
let fixtureCache = null;
function planOf(wf) {
  try {
    fixtureCache ??= JSON.parse(readFileSync(`${here}fixtures/group-history-2026-11-04.json`, "utf8"));
    const seed = {
      [N.read]: [{ json: { data: { group: fixtureCache.data.group } } }],
      // the login envelope 5.2.4 actually returns (probed 2026-11-04): `accessToken`, and the actor list
      // under `user.actors` - the plan node refuses to guess an organizer, so it has to be shaped right
      [N.signIn]: [{ json: { data: { login: { accessToken: "not-a-real-token", user: { id: "1", actors: [{ id: "3", preferredUsername: "chexxor", domain: null }] } } } } }],
    };
    const { emitted, ran, skipped } = runCodeChain(wf, seed);
    return {
      error: null, ran, skipped,
      plan: (emitted[N.plan] ?? []).map((i) => ({
        action: i.json.action ?? null, seriesKey: i.json.seriesKey ?? null, reason: i.json.reason ?? null,
        beginsOn: i.json.candidate?.beginsOn ?? null, endsOn: i.json.candidate?.endsOn ?? null,
      })),
      report: emitted[N.report]?.[0]?.json ?? null,
    };
  } catch (e) { return { error: e.message, ran: [], skipped: [], plan: [], report: null }; }
}

/** Execute the document's own `01 Config` node and return the config *that copy carries*. This is how a
 *  config edited inside n8n becomes a fact rather than a suspicion. */
function runExportedConfig(wf) {
  const node = byName(wf).get(N.cfg);
  if (!node?.parameters?.jsCode) return null;
  try {
    const out = runCodeNode(node.parameters.jsCode, {});
    const item = Array.isArray(out) ? out[0] : out;
    return item?.json ?? null;
  } catch { return null; }
}

// ------------------------------------------------------------------- CLI
// Imported (test/import.test.mjs plants defects and calls verifyDocument) the CLI stays asleep.
const isMain = process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
if (isMain) {
const args = process.argv.slice(2);
if (args.includes("--selftest")) {
  const r = spawnSync(process.execPath, ["--test", here + "test/import.test.mjs"], { stdio: "inherit" });
  console.log(r.status === 0
    ? "import check green: an unmodified export matches, every planted defect is caught, and n8n's own export noise is not a finding."
    : "import check FAILED: the checker no longer notices something it should.");
  process.exit(r.status ?? 1);
}
if (args.includes("--help") || !args.length) {
  console.log(`usage: node integrations/mobilizon-cadence/verify-import.mjs <workflow exported from n8n>
       --selftest      run test/import.test.mjs: plant defects in a copy of the artifact and prove the
                      checker notices each one, and prove n8n's own export noise is NOT a finding
       --fingerprint   print the two hashes only

Read-only: this never talks to n8n and never touches the instance. Run it after every import, after any edit
made in the n8n editor, and once more before RUN.dryRun is set to false.

In n8n: Workflow menu -> Download. The baseline is chosen from the document's name, so a probe export is
verified against n8n/env-probe.json. The artifact itself is a valid input: it must verify against itself.`);
  process.exit(args.includes("--help") ? 0 : 2);
}

const file = args.find((a) => !a.startsWith("--"));
let doc;
try { doc = JSON.parse(readFileSync(file, "utf8")); }
catch (e) { console.error(`${file}: ${e.message}`); process.exit(2); }
const target = Array.isArray(doc) ? doc[0] : doc;
const expected = target?.name === PROBE.name ? PROBE : CADENCE;

const res = verifyDocument(target, expected);
if (args.includes("--fingerprint")) {
  console.log(`expected ${res.fingerprintExpected}  exported ${res.fingerprintGot}  ${res.identical ? "identical" : "differs"}`);
  process.exit(res.identical ? 0 : 1);
}
const order = { fatal: 0, drift: 1, warn: 2, note: 3 };
const counts = { fatal: 0, drift: 0, warn: 0, note: 0 };
for (const f of res.findings) counts[f.sev]++;

console.log(`cadence import check - ${file}`);
console.log(`baseline   ${expected.name}`);
console.log(`expected   ${res.fingerprintExpected}    exported   ${res.fingerprintGot}${res.identical ? "   (identical)" : ""}`);
if (res.exportedRun) {
  const repo = RUN.dryRun ? "writes nothing" : "WOULD WRITE";
  const got = res.wouldWrite ? "WOULD WRITE" : "writes nothing";
  console.log(`as exported, this copy ${got}; the repo's series.config.mjs says dryRun=${RUN.dryRun} (${repo})`);
}
if (res.runs?.error) {
  console.log(`executed: the copy did not run - ${res.runs.error}`);
} else if (res.runs?.got?.length) {
  console.log(`executed here against fixtures/group-history-2026-11-04.json (no credential, no network, no write):`);
  for (const p of res.runs.got) console.log(`  ${N.plan} -> ${p.action}  ${p.seriesKey}  ${p.beginsOn} .. ${p.endsOn}  (${p.reason})`);
  if (res.runs.report?.summary) console.log(`  ${N.report}: ${String(res.runs.report.summary).split("\n")[0]}`);
  console.log(`compare that with: node integrations/mobilizon-cadence/simulate.mjs  (the same rules, live calendar)`);
}
console.log();
for (const f of res.findings.sort((a, b) => order[a.sev] - order[b.sev])) {
  console.log(`${f.sev.toUpperCase().padEnd(5)} ${f.where}`);
  console.log(`      ${f.what}`);
  console.log(`      ${f.means}`);
}
if (!res.findings.length) console.log("no findings");
const blocked = counts.fatal + counts.drift;
console.log(`\n${counts.fatal} fatal, ${counts.drift} drift, ${counts.warn} warn, ${counts.note} note`);
console.log(blocked
  ? `not the reviewed artifact: fix it in the repo (build-workflow.mjs), re-import, export again, re-run this.`
  : `this copy carries every safety property the artifact was built with${res.wouldWrite ? " - and as exported, it WILL write" : " - and as exported it writes nothing"}`);
process.exit(blocked ? 1 : 0);
}
