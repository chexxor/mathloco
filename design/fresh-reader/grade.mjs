#!/usr/bin/env node
// grade.mjs — a grader that is not the party that changed the site.
//
//   node design/fresh-reader/grade.mjs --round=1 [--delegate=design/fresh-reader/round-1/grading-delegate.md]
//   node design/fresh-reader/grade.mjs --selftest          # offline, no model call
//   nohup timeout 900 node design/fresh-reader/grade.mjs --round=1 > .design/tmp-grade.log 2>&1 &
//
// Why this exists: the delegate is the party that builds and changes the site, and if the same party
// also sorts the reader's questions into piles, the pile the operator acts on is chosen by the party
// with an interest in it. The reference rig learned this from its own completion audit
// (`social-event-publisher`, `.notes/research/fresh-reader/grade.mjs`) and moved pile A into a blind
// session. Here it lands that way from round 1: two graders, and the count is conservative —
// **a question is pile A if either grader puts it in A** — so the interested party cannot shop for a
// lenient pile. Disagreements are printed one per line and never averaged.
//
// What it hands the grader: the questions (numbered by this script, one line each), the built pages'
// own words, the tracked decision lines (DECISIONS.index.md, generated — one line per durable
// decision), and nothing else. Not the pictures, not the delegate's answers, not this repository's
// source, not the delegate's grading. Pile B is decided against the generated index lines rather than
// against file paths, because this grader has no tools and cannot open a path; that deviation from the
// reference rig is written into grading-rule.md so the record does not have to be remembered.
//
// The script owns the counting and the quoting; the judgement stays with the graders. A grader that
// answers fewer ids than it was given is a FAILURE, not a partial result: a total taken from a partial
// sort is the same mistake as a test suite that silently got smaller.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { changelogVersion } from "./changelog-version.mjs";

const HERE = "design/fresh-reader";
const PILES = ["A", "B", "C", "X"];

/** Quote only the marker-delimited rule; whole-line markers, same reason as the persona. */
export function readRule(raw) {
  const beginAt = raw.match(/^<<<RULE-BEGIN>>>$/m);
  const endAt = raw.match(/^<<<RULE-END>>>$/m);
  if (!beginAt) throw new Error("no `<<<RULE-BEGIN>>>` on a line of its own");
  if (!endAt) throw new Error("no `<<<RULE-END>>>` on a line of its own");
  if (endAt.index < beginAt.index + beginAt[0].length) throw new Error("`<<<RULE-END>>>` sits before `<<<RULE-BEGIN>>>` — the markers are the wrong way round");
  const rule = raw.slice(beginAt.index + beginAt[0].length, endAt.index).trim();
  if (rule.length < 400) throw new Error(`the rule between the markers is ${rule.length} characters, under the 400 floor — a rule this short is a bad extraction, not a short rule`);
  return rule;
}

/** The reader's questions, numbered by this script. The answer file quotes the persona verbatim, so the
 *  parse starts after the persona block: a numbered line inside the persona's instructions is not data. */
export function extractQuestions(text) {
  const cut = text.lastIndexOf("# --- end of persona ---");
  const body = cut >= 0 ? text.slice(cut) : text;
  const out = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(\d{1,3})[.)]\s+(.*\S)/);
    if (m) out.push({ n: out.length + 1, asPrinted: Number(m[1]), text: m[2].trim() });
    else if (out.length && /^\s{2,}\S/.test(line) && !/^\s*#/.test(line)) out[out.length - 1].text += ` ${line.trim()}`;
  }
  return out;
}

/** Parse "Q12: B: reason" lines.
 *  @returns {{grades: Map<number,string>, problems: string[], restatements: string[]}}
 *
 *  A question line seen TWICE with the SAME pile is a restatement, not a second grader: round 1's own
 *  `grading-blind.md` echoed every question with its pile letter under `# --- parsed ---`, so re-reading
 *  the file with a parser that treated any repeat as a defect printed 25 problems over a valid round and
 *  `--union-only` exited 1 on its own output. A repeat that DISAGREES with itself is still a problem -
 *  that is a grader that sorted one question two ways, and it must not be averaged away. */
export function parseGrading(out, expected) {
  const grades = new Map();
  const problems = [];
  const restatements = [];
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*Q(\d{1,3})\s*[:.\-]\s*([ABCX])\b/i);
    if (!m) continue;
    const id = Number(m[1]);
    const pile = m[2].toUpperCase();
    if (!expected.includes(id)) problems.push(`Q${id} was never asked`);
    else if (grades.has(id) && grades.get(id) !== pile) problems.push(`Q${id} graded twice with DIFFERENT piles (${grades.get(id)} then ${pile})`);
    else if (grades.has(id)) restatements.push(`Q${id} restated (${pile} again, same pile — not a second grader)`);
    else grades.set(id, pile);
  }
  for (const id of expected) if (!grades.has(id)) problems.push(`Q${id} never graded`);
  return { grades, problems, restatements };
}

/** The conservative union. Never averaged: A wins if either grader says A. */
export function union(delegate, blind) {
  const rows = [];
  for (const id of new Set([...delegate.keys(), ...blind.keys()])) {
    const d = delegate.get(id), b = blind.get(id);
    const pile = d === "A" || b === "A" ? "A" : (d ?? b);
    rows.push({ id, delegate: d ?? "-", blind: b ?? "-", pile, disagree: !!d && !!b && d !== b });
  }
  return rows.sort((x, y) => x.id - y.id);
}

const arg = (name, dflt) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || `--${name}=${dflt}`).split("=").slice(1).join("=");

// `import.meta.main` matters here: a selftest block at module scope that fires on `--selftest` in
// process.argv will hijack any *importer* that happens to carry that flag — check-report-coverage.mjs
// imports extractQuestions, and a grade.mjs that runs its own selftest and calls process.exit would
// end the importer's run before the importer asked a single question.
if (import.meta.main && process.argv.includes("--selftest")) {
  const cases = [];
  const ok = (name, cond, detail = "") => cases.push({ name, pass: !!cond, detail });
  const real = fs.readFileSync(path.resolve(`${HERE}/grading-rule.md`), "utf8");
  let rule = "";
  try { rule = readRule(real); } catch (e) { cases.push({ name: "control: the tracked rule extracts", pass: false, detail: e.message }); }
  ok("control: the tracked rule extracts over the floor", rule.length > 400, `${rule.length} characters`);
  ok("control: the rule defines all four piles", PILES.every((p) => new RegExp(`Pile ${p} `, "i").test(rule)), PILES.filter((p) => !new RegExp(`Pile ${p} `, "i").test(rule)).join(","));
  ok("plants a missing BEGIN", (() => { try { readRule(real.replace(/^<<<RULE-BEGIN>>>$/m, "x")); return false; } catch { return true; } })());
  ok("plants a missing END", (() => { try { readRule(real.replace(/^<<<RULE-END>>>$/m, "x")); return false; } catch { return true; } })());
  ok("plants inverted markers", (() => { try { readRule(real.replace(/^<<<RULE-END>>>$/m, "@@T@@").replace(/^<<<RULE-BEGIN>>>$/m, "@@E@@").replace(/@@T@@/, "<<<RULE-BEGIN>>>").replace(/@@E@@/, "<<<RULE-END>>>")); return false; } catch { return true; } })());
  const noX = real.replace(/^Pile X - .*$/m, "");
  let threw = false;
  try { readRule(noX); } catch { threw = true; }
  ok("plants a rule whose extraction is no longer a rule (its pile X is gone)", threw || !/Pile X /.test(readRule(noX)), "a grader handed a rule missing a pile sorts into three piles and still prints four totals");
  ok("reads the grading rule's changelog version", (() => { const v = changelogVersion(real); return !!v && Number(v.version) >= 1; })(), changelogVersion(real) ? `version ${changelogVersion(real).version}, round ${changelogVersion(real).round}` : "no rows");
  const ids = [1, 2, 3];
  const full = parseGrading("Q1: A: the page says it\nQ2: C: needs a decision\nQ3: B: an index line answers it", ids);
  ok("control: a complete answer parses 3 of 3", full.grades.size === 3 && full.problems.length === 0, full.problems.join("; "));
  const partial = parseGrading("Q1: A: yes\nQ2: A: yes", ids);
  ok("plants a grader that skipped a question", partial.problems.some((p) => p.includes("Q3 never graded")), partial.problems.join("; "));
  const junk = parseGrading("Q1: maybe: I think so\nQ2: A: yes\nQ3: A: yes", ids);
  ok("plants an unusable pile letter", junk.grades.size === 2 && junk.problems.includes("Q1 never graded"), `parsed ${junk.grades.size}`);
  const dupe = parseGrading("Q1: A: x\nQ1: B: y\nQ2: A: x\nQ3: A: x", ids);
  ok("plants the same question graded twice", dupe.problems.some((p) => p.includes("Q1 graded twice")));
  const extra = parseGrading("Q1: A: x\nQ2: A: x\nQ3: A: x\nQ9: A: invented", ids);
  ok("plants a grade for a question that was never asked", extra.problems.some((p) => p.includes("Q9 was never asked")));
  const echoed = parseGrading("Q1: A: x\nQ2: B: y\nQ3: C: z\nQ1: A | the question text restated", ids);
  ok("parses a restated line once (the round file echoes its own parsed rows)", echoed.grades.size === 3 && echoed.problems.length === 0 && echoed.restatements.length === 1, `${echoed.problems.join("; ")}${echoed.restatements.length ? ` / ${echoed.restatements[0]}` : ""}`);
  const flip = parseGrading("Q1: A: x\nQ2: B: y\nQ3: C: z\nQ1: C | same question, other pile", ids);
  ok("plants a grader that sorted one question two ways", flip.problems.some((p) => p.includes("DIFFERENT piles")), flip.problems.join("; ") || "no problem printed");
  const u = union(new Map([[1, "B"], [2, "C"], [3, "A"]]), new Map([[1, "A"], [2, "C"], [3, "B"]]));
  ok("the union puts a question in A if either grader does", u.find((r) => r.id === 1)?.pile === "A");
  ok("the union lists a disagreement rather than averaging it", u.find((r) => r.id === 1)?.disagree === true && u.find((r) => r.id === 2)?.disagree === false);
  const qs = extractQuestions("# --- the persona ---\n1. made up inside the persona\n# --- end of persona ---\n1. What time does it start?\n   continued on the next line\n2. Where is it?");
  ok("the parse starts after the quoted persona block", qs.length === 2 && qs[0].text.startsWith("What time") && qs[0].text.includes("continued"), `${qs.length} questions`);
  let bad = 0;
  for (const c of cases) { if (!c.pass) bad++; console.log(`${c.pass ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` (${c.detail})` : ""}`); }
  console.log(`grade.mjs selftest: ${cases.length - bad}/${cases.length} — ${bad ? "FAILED" : "every planted defect is caught"}`);
  process.exit(bad ? 1 : 0);
}

// Imported or executed? An earlier version of this file ran its main body at module scope, so
// `import("grade.mjs")` from a test spent a REAL model call before the test could ask a question —
// measured 2026-11-22: importing it cost 1,648.4s and one whole grading pass. The pure helpers above
// are exported for tests; everything from here down runs only when this file is the entry point.
async function run() {
const ROUND = arg("round", "1");
const RULE_FILE = path.resolve(`${HERE}/${arg("rule", "grading-rule.md")}`);
const PASS_FILE = path.resolve(arg("pass", `${HERE}/round-${ROUND}/pass-answer.md`));
const CAPTURE = path.resolve(arg("capture", `.design/fresh-reader/round-${ROUND}`));
const MODEL = arg("model", "qwen3.8-flash-next-iq3_s");
const INDEX = arg("index", "DECISIONS.index.md");
const OUT_DIR = path.resolve(arg("out", `${HERE}/round-${ROUND}`));

if (!fs.existsSync(RULE_FILE)) { console.error(`no grading rule at ${RULE_FILE}: the pile a question lands in has to come from a written rule, not from a mood`); process.exit(1); }
let RULE;
const RAW_RULE = fs.readFileSync(RULE_FILE, "utf8");
try { RULE = readRule(RAW_RULE); } catch (e) { console.error(`grading rule ${RULE_FILE}: ${e.message} — refusing to grade by a rule it cannot quote`); process.exit(1); }
if (!fs.existsSync(PASS_FILE)) { console.error(`no pass answer at ${PASS_FILE} — run pass.mjs first`); process.exit(2); }

const questions = extractQuestions(fs.readFileSync(PASS_FILE, "utf8"));
if (!questions.length) { console.error(`${PASS_FILE} carries no numbered questions — there is nothing to grade (and a reader that asked none is a finding, not a clean round)`); process.exit(1); }
const ids = questions.map((q) => q.n);

// --union-only: combine a grading that already ran with the delegate's own, without another model
// call. The union is arithmetic, and arithmetic that costs 27 minutes gets quietly skipped.
if (process.argv.includes("--union-only")) {
  const blindFile = path.resolve(arg("blind", path.join(OUT_DIR, "grading-blind.md")));
  // The delegate's own grading is a round artifact, and round 1 wrote it as `delegate-grading.txt`; the
  // default used to name a file that never existed, so the one command that re-takes the union failed on a
  // round that was complete.
  const delFile = path.resolve(arg("delegate", path.join(OUT_DIR, "delegate-grading.txt")));
  for (const f of [blindFile, delFile]) if (!fs.existsSync(f)) { console.error(`--union-only needs both graders' files; missing ${f}`); process.exit(1); }
  const blind = parseGrading(fs.readFileSync(blindFile, "utf8"), ids);
  const del = parseGrading(fs.readFileSync(delFile, "utf8"), ids);
  const pbs = [...blind.problems.map((p) => `blind: ${p}`), ...del.problems.map((p) => `delegate: ${p}`)];
  const notes = [...blind.restatements, ...del.restatements];
  const rows = union(del.grades, blind.grades);
  const uFile = path.resolve(arg("out-file", path.join(OUT_DIR, "grading-union.md")));
  fs.writeFileSync(uFile, [
    `# the union of the two graders — round ${ROUND}`,
    `# rule: a question is pile A if EITHER grader puts it in A (design/fresh-reader/grading-rule.md, version 1).`,
    `# Never averaged, never re-graded by the party with an interest in the outcome; disagreements are one line each.`,
    `# inputs: ${blindFile} (the blind pi session) and ${delFile} (the delegate — the party that changes this site)`,
    `# totals: ${PILES.map((p) => `${p}:${rows.filter((r) => r.pile === p).length}`).join(" ")} over ${rows.length} questions; ${rows.filter((r) => r.disagree).length} disagreement(s)`,
    ...(pbs.length ? [`# PROBLEMS: ${pbs.join("; ")}`] : []),
    ...(notes.length ? [`# note: ${notes.length} restated line(s) parsed once each: ${notes[0]}${notes.length > 1 ? `, …` : ""}`] : []),
    "",
    ...rows.map((r) => `Q${r.id}: delegate ${r.delegate} / blind ${r.blind} -> ${r.pile}${r.disagree ? "  DISAGREE" : ""}`),
  ].join("\n"));
  console.log(`union: ${rows.length} questions, ${rows.filter((r) => r.pile === "A").length} pile A, ${rows.filter((r) => r.disagree).length} disagreement(s) -> ${uFile}`);
  if (notes.length) console.log(`  note: ${notes.length} restated line(s) counted once (a repeat with the same pile is not a second grader)`);
  for (const r of rows) if (r.disagree) console.log(`  DISAGREE Q${r.id}: delegate ${r.delegate} / blind ${r.blind}`);
  process.exit(pbs.length ? 1 : 0);
}

const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), `fresh-reader-grade-${process.pid}-`));
const handed = [];
const put = (name, contents) => { fs.writeFileSync(path.join(SCRATCH, name), contents); handed.push(name); };
put("questions.txt", `The reader was shown the pages below and asked for questions. Here they are, in the order they gave them, numbered by me.\n\n${questions.map((q) => `${q.n}. ${q.text}`).join("\n")}\n`);
const wordsDir = path.join(CAPTURE, "words");
if (fs.existsSync(wordsDir)) for (const f of fs.readdirSync(wordsDir).sort()) put(f, fs.readFileSync(path.join(wordsDir, f), "utf8"));
else console.error(`note: no word files under ${wordsDir} — the grader is being asked to grade without the pages, so every pile it returns is a guess`);
let indexBytes = 0;
if (INDEX !== "none" && fs.existsSync(path.resolve(INDEX))) {
  const idx = fs.readFileSync(path.resolve(INDEX), "utf8");
  indexBytes = idx.length;
  put("decisions.txt", `What this project has already settled for itself, one line each. This is not on the pages.\n\n${idx}\n`);
} else {
  console.error(`note: no decision index handed over (index=${INDEX}) — pile B cannot be decided by this grader, and the record will say so`);
}

const TASK = [
  `There are ${questions.length} questions in questions.txt. Grade every one of them.`,
  "Answer with one line per question and nothing else, in this exact shape:",
  "  Q<n>: <A|B|C|X>: <one short line naming what in the material you were handed made you choose it>",
  `Every number from 1 to ${questions.length} exactly once. Use the pile letters from your instructions,`,
  "and if you genuinely cannot tell, say so in that line and choose the pile your rule says to choose then.",
].join(" ");

const args = ["-p", "--no-context-files", "--no-skills", "--no-prompt-templates", "--no-extensions", "--no-mcp", "--no-tools", "--no-session", "--model", MODEL, "--system-prompt", RULE, "--"];
for (const f of handed) args.push(`@${f}`);
args.push(TASK);

const started = Date.now();
const res = spawnSync("pi", args, { cwd: SCRATCH, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const wall = ((Date.now() - started) / 1000).toFixed(1);
const out = `${res.stdout ?? ""}${res.stderr && res.status !== 0 ? `\nstderr: ${res.stderr}` : ""}`;
const { grades, problems, restatements } = parseGrading(out, ids);

let delegateRows = null;
const delegateFile = arg("delegate", "") ? path.resolve(arg("delegate", "")) : "";
if (delegateFile && fs.existsSync(delegateFile)) {
  const d = parseGrading(fs.readFileSync(delegateFile, "utf8"), ids);
  delegateRows = union(d.grades, grades);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, "grading-blind.md");
const rv = changelogVersion(RAW_RULE);
const pv = changelogVersion(fs.existsSync(path.resolve(`${HERE}/persona.md`)) ? fs.readFileSync(path.resolve(`${HERE}/persona.md`), "utf8") : "");
const counts = PILES.map((p) => `${p}:${[...grades.values()].filter((v) => v === p).length}`).join(" ");
fs.writeFileSync(outFile, [
  `# blind grader — round ${ROUND}`,
  `# model: ${MODEL} — a MODEL, not a human; os: Linux native; node ${process.version}`,
  `# cwd: ${SCRATCH} (outside the repository) — exit ${res.status}, ${wall}s wall`,
  `# rule: ${RULE_FILE}, only the text between its markers, quoted verbatim as the system prompt (${RULE.length} characters) — reproduced below`,
  `# rule changelog version: ${rv ? rv.version : "NOT STAMPED (the rule file has no changelog row)"} (## Changelog row for round ${rv ? rv.round : "?"}); rule body sha256/16 ${crypto.createHash("sha256").update(RULE).digest("hex").slice(0, 16)}`,
  `# persona changelog version this round read against: ${pv ? pv.version : "unknown"} (persona.md ## Changelog, round ${pv ? pv.round : "?"}) — the grader was NOT handed the persona, only the questions it produced`,
  `# material handed over: ${handed.length} files — questions.txt (${questions.length} questions from ${path.basename(PASS_FILE)}), ${fs.existsSync(wordsDir) ? fs.readdirSync(wordsDir).length : 0} page word files, decision index ${indexBytes} bytes`,
  `# NOT handed over: the pictures (this grader reads words, so where a question is answered only by a colour or a position the delegate's grading is final), the delegate's answers, this repository's source`,
  `# blind grader's own counts: ${counts}; unanswered: ${ids.length - grades.size} of ${ids.length}`,
  ...(problems.length ? [`# PROBLEMS (this grading is not a total): ${problems.join("; ")}`] : []),
  ...(restatements.length ? [`# note: ${restatements.length} line(s) repeated with the same pile, parsed once each — a restatement is not a second grader`] : []),
  "",
  `# --- the grading rule quoted as the system prompt, verbatim ---`,
  RULE,
  "# --- end of rule ---",
  "",
  out,
  "",
  "# --- parsed --- (each row commented out, so re-reading this file is not read as a second grading of its own round)",
  ...questions.map((q) => `# Q${q.n} pile=${grades.get(q.n) ?? "-"} | ${q.text}`),
  ...(delegateRows ? ["", "# --- union with the delegate (A if either says A; disagreements listed, never averaged) ---", ...delegateRows.map((r) => `Q${r.id}: delegate ${r.delegate} / blind ${r.blind} -> ${r.pile}${r.disagree ? "  DISAGREE" : ""}`)] : ["", "# (no --delegate= file given: the union with the delegate's own grading is taken in the round report)"]),
].join("\n"));
fs.rmSync(SCRATCH, { recursive: true, force: true });

console.log(`round ${ROUND} grading: exit ${res.status}, ${wall}s, ${grades.size}/${ids.length} questions graded (${counts}) -> ${outFile}`);
if (restatements.length) console.log(`  note: ${restatements.length} restated line(s) counted once`);
if (problems.length) for (const p of problems) console.error(`  ${p}`);
if (delegateRows) console.log(`union with delegate: ${delegateRows.filter((r) => r.pile === "A").length} pile A of ${delegateRows.length}, ${delegateRows.filter((r) => r.disagree).length} disagreement(s)`);
// a partial sort is not a total: refuse to call it one.
process.exit(res.status === 0 && problems.length === 0 ? 0 : 1);
}
if (import.meta.main) await run();
