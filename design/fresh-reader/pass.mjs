#!/usr/bin/env node
// pass.mjs — one blind read of the built site by a fresh `pi` session, through the persona in
// design/fresh-reader/persona.md.
//
//   node design/fresh-reader/pass.mjs --print-persona     # 0.05s, offline: exactly what a pass quotes
//   node design/fresh-reader/pass.mjs --selftest          # the planted failures this must catch
//   nohup timeout 1500 node design/fresh-reader/pass.mjs --round=1 > .design/tmp-pass.log 2>&1 &
//
// The third one is a model call over a material set of images, not a loop: budget it generously and
// run it in the background rather than inside one tool call (the timeout guess, S069). The number of
// images per pass is printed by `capture.mjs` and recorded in the answer file, so the budget is a
// guess against a known set rather than a fresh guess each round.
//
// Why the session is blind, and how:
//   - it starts in a scratch directory under /tmp, never in this repository, because pi discovers
//     AGENTS.md and the project skills from the working directory upward — rooted here it would read
//     our own plans, our DESIGN.md, and the very vocabulary the persona is kept free of;
//   - --no-tools, so it cannot open a file, run a command, or reach the repository: only what it was
//     handed;
//   - --no-session, so nothing is written into the repo;
//   - --model qwen3.8-flash-next-iq3_s: the host's own local model, served over loopback at
//     127.0.0.1:8080, declared `input: ["text","image"]` in ~/.pi/agent/models.json. That is a model,
//     not a human, and the answer file says so — "a stranger who has never been to the club" and "the
//     model that can see pixels" are two different readers and the record has to name which answered.
//     No provider credential and no internet is involved; the whole pass stays on this machine.
//
// What it hands the reader: for every built page at every width in the capture, the first screen, then
// the rest of that page cut into screen-sized pieces, and that page's own words. It does NOT hand the
// `-full.png` strips (a 13,000px strip is not a glance — the reference rig's own round review said so),
// and it does not hand this repository anything at all.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { changelogVersion } from "./changelog-version.mjs";

const HERE = "design/fresh-reader";
const BEGIN = "<<<PERSONA-BEGIN>>>";
const END = "<<<PERSONA-END>>>";
// The floor is not politeness: the first extraction in the reference rig returned 7 characters because
// a substring search found the prose that talks about the markers, and a 7-character "persona" produced
// a pass that ran, answered, and proved nothing.
export const PERSONA_FLOOR = 2000;

// Family 1: this project's own design vocabulary, counted in our own prose (the table in persona.md
// carries the counts). Family 3: words about this exercise. Neither may appear between the markers.
export const FAMILY1 = ["keyline", "band", "token", "tier", "role", "island", "gate", "specimen", "glyph", "lede", "census", "hollow", "provenance", "ledger", "artifact", "register", "registry", "control", "exemption", "ruling", "milestone", "decision", "spec", "plate", "sprite", "fold", "ink", "mark", "primary", "secondary", "reader", "visitor", "class", "Matheapolis"];
// Family 2: the tools this reader does not have. These MAY appear, but only on a line that says the
// reader lacks them — the operator's constraint, enforced in the direction that matters: an edit that
// hands the reader a spreadsheet, or that deletes the paragraph saying they have none, must fail.
export const FAMILY2 = ["spreadsheet", "excel", "csv", "database", "terminal", "command line", "script", "source code", "source", "developer tool", "console", "view source", "extension", "plugin", "api"];
const NEGATION = /\b(never|no |not |without|lack|do not|don.t|have no|isn.t|absent)\b/i;

/** Quote only the marker-delimited body. Markers are matched as WHOLE lines: the file has to be able
 *  to talk about its own markers, and a substring search finds that prose instead of the delimiter. */
export function extractPersona(raw) {
  const beginAt = raw.match(/^<<<PERSONA-BEGIN>>>$/m);
  const endAt = raw.match(/^<<<PERSONA-END>>>$/m);
  if (!beginAt) throw new Error(`no \`${BEGIN}\` on a line of its own`);
  if (!endAt) throw new Error(`no \`${END}\` on a line of its own`);
  if (endAt.index < beginAt.index + BEGIN.length) throw new Error(`\`${END}\` sits before \`${BEGIN}\` — the markers are the wrong way round`);
  return raw.slice(beginAt.index + BEGIN.length, endAt.index).trim();
}

/** The changelog version a round was read against, read from the table OUTSIDE the markers.
 *  A question count is only comparable across rounds if the file records which reader produced it:
 *  persona.md's own editing rule 2 says the round's report prints the changelog version beside its
 *  question count, so the version is stamped here, at the run, rather than reconstructed by hand
 *  afterwards from a table that has since gained a row. The reading itself lives in
 *  changelog-version.mjs, shared with grade.mjs. */
const personaVersion = changelogVersion;

/** @returns string[] problems; empty means the persona is legal */
export function lintPersona(body) {
  const problems = [];
  const lines = body.split("\n");
  const find = (list, label) => {
    for (const w of list) {
      const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      lines.forEach((l, i) => {
        if (!re.test(l)) return;
        if (label === "family2" && NEGATION.test(l)) return;
        problems.push(`${label}: \`${w}\` at body line ${i + 1}${label === "family2" ? ` (a tool word on a line that does not say the reader lacks it)` : ""}`);
      });
    }
  };
  find(FAMILY1, "our vocabulary");
  find(["persona", "blind", "grader", "pile", "round", "critique", "design system"], "a word about this exercise");
  find(FAMILY2, "family2");
  if (body.length < PERSONA_FLOOR) problems.push(`the quoted body is ${body.length} characters, under the ${PERSONA_FLOOR}-character floor — an extraction that came back short is the P322 failure class, not a short persona`);
  if (/^## /m.test(body)) problems.push("the body contains a markdown heading — a meta-section has drifted inside the markers and would be quoted at the reader (P322)");
  if (!/\bspreadsheet\b/i.test(body)) problems.push("nothing in the body says this reader has no spreadsheet — the paragraph naming what the reader lacks is the operator's constraint, and deleting it silently widens the reader");
  if (!/calendar/i.test(body) || !/contacts/i.test(body) || !/discord/i.test(body)) problems.push("the body no longer names calendar, contacts and Discord — the reader's software is what the measurement is taken against");
  return problems;
}

const arg = (name, dflt) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || `--${name}=${dflt}`).split("=").slice(1).join("=");

if (import.meta.main && process.argv.includes("--selftest")) {
  const cases = [];
  const ok = (name, cond, detail = "") => cases.push({ name, pass: !!cond, detail });
  const real = fs.readFileSync(path.resolve(`${HERE}/persona.md`), "utf8");
  let body = "";
  try { body = extractPersona(real); } catch (e) { body = ""; cases.push({ name: "control: the tracked persona extracts", pass: false, detail: e.message }); }
  ok("control: the tracked persona extracts a body over the floor", body.length > PERSONA_FLOOR, `${body.length} characters`);
  ok("control: the tracked persona lints clean", lintPersona(body).length === 0, lintPersona(body).join("; "));
  ok("plants a missing BEGIN", (() => { try { extractPersona(real.replace(/^<<<PERSONA-BEGIN>>>$/m, "x")); return false; } catch { return true; } })());
  ok("plants a missing END", (() => { try { extractPersona(real.replace(/^<<<PERSONA-END>>>$/m, "x")); return false; } catch { return true; } })());
  ok("plants inverted markers", (() => { try { extractPersona(real.replace(/^<<<PERSONA-END>>>$/m, "@@TMP@@").replace(/^<<<PERSONA-BEGIN>>>$/m, "@@END-MOVED@@").replace(/@@TMP@@/, BEGIN).replace(/@@END-MOVED@@/, END)); return false; } catch { return true; } })());
  ok("plants one of our own nouns in the body", lintPersona(`${body}\nA keyline runs under the heading.`).some((p) => p.includes("keyline")));
  ok("plants a short body (a truncated extraction)", lintPersona("You use a calendar. Not enough to measure anything.").some((p) => p.includes("under the")));
  ok("plants a spreadsheet capability", lintPersona(`${body}\nYou keep the list in a spreadsheet with columns you sort.`).some((p) => p.includes("spreadsheet")));
  ok("plants the deletion of the paragraph naming what the reader lacks", lintPersona(body.replace(/You do not have a spreadsheet[\s\S]*?worth asking about\./, "")).some((p) => p.includes("has no spreadsheet")));
  ok("plants a meta-section inside the markers", lintPersona(`## Changelog\n${body}`).some((p) => p.includes("drifted inside")));
  ok("plants a calendar-less reader", lintPersona(body.replace(/calendar/gi, "planner")).some((p) => p.includes("calendar, contacts and Discord")));
  ok("reads a changelog row and names its version", (() => { const v = personaVersion(real); return !!v && Number(v.version) >= 1; })(), personaVersion(real) ? `version ${personaVersion(real).version}, round ${personaVersion(real).round}` : "no rows");
  ok("plants a persona with no changelog row (the round could not say which reader answered)", personaVersion(real.replace(/^\|\s*1\s*\|.*$/m, "")) === null);
  fs.writeFileSync(path.resolve(`${HERE}/.tmp-no-changelog.md`), real.replace(/^\|\s*1\s*\|.*$/m, ""));
  const noLogRun = spawnSync(process.execPath, [path.resolve(`${HERE}/pass.mjs`), "--round=1", "--persona=.tmp-no-changelog.md", "--capture=/definitely/not/here"], { encoding: "utf8" });
  fs.rmSync(path.resolve(`${HERE}/.tmp-no-changelog.md`), { force: true });
  ok("a persona with no changelog row stops the run before the capture is read", noLogRun.status === 1 && /changelog/.test(noLogRun.stderr) && !/no capture|ENOENT/.test(noLogRun.stderr), `exit ${noLogRun.status}: ${(noLogRun.stderr || "").trim().split("\n")[0]}`);
  // the stop has to come BEFORE any capture or model work: an undefined reader must cost nothing.
  const early = spawnSync(process.execPath, [path.resolve(`${HERE}/pass.mjs`), "--print-persona", "--persona=nope.md", "--capture=/definitely/not/here"], { encoding: "utf8" });
  ok("a missing persona file stops the run before the capture directory is read", early.status === 1 && /no persona file/.test(early.stderr) && !/no capture|ENOENT/.test(early.stderr), `exit ${early.status}: ${(early.stderr || "").trim().split("\n")[0]}`);
  let bad = 0;
  for (const c of cases) { if (!c.pass) bad++; console.log(`${c.pass ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` (${c.detail})` : ""}`); }
  console.log(`pass.mjs selftest: ${cases.length - bad}/${cases.length} — ${bad ? "FAILED" : "every planted defect is caught, and the tracked persona passes as a clean control"}`);
  process.exit(bad ? 1 : 0);
}

// Everything from here down spends real work — it reads the capture and spawns a model. The exported
// helpers above (`extractPersona`, `lintPersona`) have to stay importable, or testing the extraction
// is itself a model call (that is exactly how one round of this rig lost 1,648s in grade.mjs).
async function run() {
// Guard order: persona first, capture second. A run with no defined reader must stop before it spends
// a capture, a spawn, or a model call — a question count from an undefined reader measures nothing.
// Those refusals exit 1, not 2: a missing persona file, a bad marker pair, a banned project noun and a
// too-short quoted body are failures of the run, and should not look identical to a usage error.
const PERSONA_FILE = path.resolve(`${HERE}/${arg("persona", "persona.md")}`);
if (!fs.existsSync(PERSONA_FILE)) {
  console.error(`no persona file at ${PERSONA_FILE}: the pass refuses to run without one, because a count taken from an undefined reader is not a measurement`);
  process.exit(1);
}
const raw = fs.readFileSync(PERSONA_FILE, "utf8");
let PERSONA;
try {
  PERSONA = extractPersona(raw);
} catch (e) {
  console.error(`persona file ${PERSONA_FILE}: ${e.message} — refusing to run rather than guess which half of the file is the reader (P322)`);
  process.exit(1);
}
const CHANGELOG_ENTRY = personaVersion(raw);
if (!CHANGELOG_ENTRY) {
  console.error(`persona file ${PERSONA_FILE} has no changelog row: persona.md's editing rule 2 requires one per change, and a round that cannot name the changelog version it read against cannot be compared with the next one — refusing to run rather than record an unattributable question count`);
  process.exit(1);
}
const problems = lintPersona(PERSONA);
if (problems.length) {
  console.error(`persona file ${PERSONA_FILE} would hand the reader this project's own words or change what the reader is:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
if (process.argv.includes("--print-persona")) {
  console.log(PERSONA);
  process.exit(0);
}

const ROUND = arg("round", "1");
const CAPTURE = path.resolve(arg("capture", `.design/fresh-reader/round-${ROUND}`));
const MODEL = arg("model", "qwen3.8-flash-next-iq3_s");
const OUT_DIR = path.resolve(arg("out", `${HERE}/round-${ROUND}`));
if (!fs.existsSync(CAPTURE)) {
  console.error(`no capture directory at ${CAPTURE} — run \`node design/fresh-reader/capture.mjs --round=${ROUND}\` first (the persona check above already passed, so the reader is defined; it is the material that is missing)`);
  process.exit(2);
}
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(CAPTURE, "manifest.json"), "utf8"));
} catch (e) {
  console.error(`capture manifest at ${CAPTURE}/manifest.json is unreadable (${e.message}) — re-run capture.mjs; a pass over a material set this script cannot enumerate is a pass nobody can reproduce`);
  process.exit(2);
}

const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), `fresh-reader-pass-${process.pid}-`));
const handed = [];
const copy = (from, as) => { fs.copyFileSync(from, path.join(SCRATCH, as)); handed.push(as); };
for (const p of manifest.pages) {
  copy(path.join(CAPTURE, "words", `${p.slug}.txt`), `${p.slug}-${p.width}.txt`);
  copy(path.join(CAPTURE, p.firstScreen), `${p.slug}-${p.width}-first.png`);
  // The tiling's first piece is the same stretch of page as the viewport shot, and round 1 handed the
  // reader both: 12 of its 44 images were duplicates of the top of a page, paid for in a pass that
  // already cost 1,483.2s. The viewport shot is the honest "what a person sees before scrolling", so it
  // is the one handed over; the tiling after it starts at y = vh, so coverage is still complete.
  for (const seg of p.pieces.filter((s) => s.y > 0)) copy(path.join(CAPTURE, seg.file), `${p.slug}-${p.width}-${path.basename(seg.file)}`);
}

const TASK = [
  "I have never been to this club. Somebody sent me a link, and these are the pages it led to.",
  "The material is arranged this way: for each page, at each size, the first picture is what a person",
  "sees before scrolling at all, and the pictures after it are the rest of that page in pieces the size",
  "of a screen. The text file with the same name holds that page's own words.",
  "Look at the pictures first and say what stands out. If that does not tell you what the page is for,",
  "say so, and read the words from the top.",
  "Run nothing and press nothing. Where you would have pressed, typed or scrolled, say that in words.",
  "Then give me ONE numbered list of every question that came to you while doing that, in the order the",
  "pages put it in front of you, and name which page each question came from.",
  "Do not answer your own questions, and do not summarise the pages back to me.",
].join(" ");

const args = [
  "-p", "--no-context-files", "--no-skills", "--no-prompt-templates", "--no-extensions",
  "--no-mcp", "--no-tools", "--no-session", "--model", MODEL, "--system-prompt", PERSONA, "--",
];
for (const f of handed) args.push(`@${f}`);
args.push(TASK);

const started = Date.now();
const res = spawnSync("pi", args, { cwd: SCRATCH, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const wall = ((Date.now() - started) / 1000).toFixed(1);
const answer = `${res.stdout ?? ""}${res.stderr && res.status !== 0 ? `\nstderr: ${res.stderr}` : ""}`;

// A measurement, not a gate: how many of our own words the reader picked up from the pages.
const pickedUp = FAMILY1.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(answer));

fs.mkdirSync(OUT_DIR, { recursive: true });
// The count goes IN the file, not only on the console: the round report has to state how many questions
// the reader produced, and a report that counts its own headings while the answer file counts nothing is
// two answers to one question.
const QCOUNT = (answer.match(/^\s*\d+[.)]\s+/gm) || []).length;
const outFile = path.join(OUT_DIR, `pass-answer.md`);
fs.writeFileSync(outFile, [
  `# blind reader pass — round ${ROUND}`,
  `# model: ${MODEL} (the host's own local model over loopback at 127.0.0.1:8080) — a MODEL, not a human.`,
  `#   "a volunteer who has never been to this club" is the persona; the thing that answered it is this model.`,
  `# os: Linux native (no wsl, no docker); node ${process.version}`,
  `# command: pi ${args.slice(0, args.indexOf("--system-prompt")).join(" ")} --system-prompt <the persona, quoted once below, ${PERSONA.length} chars> ${args.slice(args.indexOf("--system-prompt") + 2, -1).join(" ")} <task, ${TASK.length} chars>`,
  `# cwd: ${SCRATCH} (outside the repository) — exit ${res.status}, ${wall}s wall`,
  `# persona changelog version: ${CHANGELOG_ENTRY.version} (${path.relative(process.cwd(), PERSONA_FILE) || PERSONA_FILE}, ## Changelog row for round ${CHANGELOG_ENTRY.round})`,
  `#   body sha256/16 ${crypto.createHash("sha256").update(PERSONA).digest("hex").slice(0, 16)} — the block quoted below is that body verbatim, so a later reader can`,
  `#   prove which words the reader was given rather than trust the label above it`,
  `# persona: ${PERSONA_FILE}, only the text between its \`${BEGIN}\` and \`${END}\` markers, quoted verbatim`,
  `#   as the system prompt (${PERSONA.length} characters, lint clean). It is reproduced below so this file`,
  `#   records who answered, not merely who is claimed to have answered — the file is edited between rounds.`,
  `# material handed over: ${handed.length} files — ${handed.filter((f) => f.endsWith(".png")).length} images,`,
  `#   ${handed.filter((f) => f.endsWith(".txt")).length} page word files; the -full.png strips were NOT handed over`,
  `#   (a whole-page strip is not a glance). Method per capture.mjs: first screen at ${manifest.widths.map((w) => `${w.w}x${w.vh}`).join(", ")},`,
  `#   then the whole-document shot cut into ${manifest.widths.map((w) => w.vh).join("/")}px pieces, cropped with ${manifest.cropWith};`,
  `#   the piece at y=0 is not handed over (it is the first screen again), so the reader saw each top once`,
  `# capture manifest: ${path.join(CAPTURE, "manifest.json")} (${manifest.pages.length} page x width cells, document heights ${manifest.pages.map((p) => `${p.route}@${p.width}=${p.docHeight}`).join(" ")})`,
  `# our own vocabulary appearing in the reader's answer (a measurement, not a failure): ${pickedUp.length} word(s)${pickedUp.length ? ` — ${pickedUp.join(", ")}` : ""}`,
  `# questions: ${QCOUNT} numbered lines follow the persona block (counted by the same regex the runner prints)`,
  "",
  `# --- the persona quoted as the system prompt, verbatim, ${PERSONA.length} characters ---`,
  PERSONA,
  "# --- end of persona ---",
  "",
  answer,
].join("\n"));
fs.rmSync(SCRATCH, { recursive: true, force: true });

const questions = QCOUNT;
console.log(`round ${ROUND} pass: exit ${res.status}, ${wall}s wall, ${handed.filter((f) => f.endsWith(".png")).length} images handed over, ${questions} numbered questions, ${pickedUp.length} of our words picked up -> ${outFile}`);
if (res.status !== 0) console.error(answer.slice(-2000));
process.exit(res.status === 0 ? 0 : 1);
}
if (import.meta.main) await run();
