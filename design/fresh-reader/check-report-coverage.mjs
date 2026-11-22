#!/usr/bin/env node
// check-report-coverage.mjs — the round report carries every question the reader actually asked.
//
//   node design/fresh-reader/check-report-coverage.mjs [--round=1] [--report=…]   # exit 1 on a gap
//   node design/fresh-reader/check-report-coverage.mjs --selftest                 # plant each defect
//
// Why this exists: the deliverable of a round is "every question, verbatim and annotated", and the count
// in the report is written by hand while the questions live in another file. That is two answers to one
// question, and the failure mode is silent — a report that annotates 24 of 25 reads exactly like one that
// annotated 25. The gate re-derives the question list from the answer file with the SAME parser the
// harness used to number them (`grade.mjs`'s `extractQuestions`), then demands that the report quote each
// one, in order, character for character. A quote that has been tidied — a reader's hedged phrase replaced
// with a shorter one — is a different question, so a drift fails too.
//
// Pile C questions: the report must record them as asks, not answer them. That half is a rule the round's
// own text states; this gate checks coverage and fidelity, and prints the pile letters it finds so a
// reader can see which questions the delegate graded C.
import fs from "node:fs";
import path from "node:path";
import { extractQuestions } from "./grade.mjs";

const arg = (name, dflt) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || `--${name}=${dflt}`).split("=").slice(1).join("=");

/** The reader's questions, from the answer file. */
export function questionsOf(answerText) {
  return extractQuestions(answerText);
}

/** The quote blocks the report carries, in document order, with the question heading each sits under. */
export function quotesOf(reportText) {
  const out = [];
  let heading = null;
  let buf = null;
  for (const line of reportText.split("\n")) {
    const h = line.match(/^### (Q\d+) —/);
    if (h) { if (buf) out.push(buf); buf = null; heading = h[1]; continue; }
    if (/^> /.test(line)) { (buf ??= { heading, lines: [] }).lines.push(line.slice(2).trim()); continue; }
    if (buf && line.trim() === "") { out.push(buf); buf = null; continue; }
    if (buf && !/^> /.test(line)) { out.push(buf); buf = null; }
  }
  if (buf) out.push(buf);
  return out.map((q, i) => ({ heading: q.heading ?? `#${i + 1}`, text: q.lines.join(" ").replace(/\s+/g, " ") }));
}

/** @returns {{fails: string[], notes: string[]}} */
export function check(answerText, reportText) {
  const qs = questionsOf(answerText);
  const quotes = quotesOf(reportText);
  const fails = [];
  const notes = [];
  if (quotes.length === 0) fails.push("the report carries no `> ` quote block at all — nothing to compare with the answer file");
  if (qs.length !== quotes.length) fails.push(`the answer file asks ${qs.length} questions and the report quotes ${quotes.length} — a report that annotates fewer reads identical to one that annotated all`);
  const declared = reportText.match(/\*\*(\d+)\*\*\s*numbered lines in the answer file;\s*\*\*(\d+)\*\*\s*annotated here/);
  if (!declared) fails.push('the report never states its own counts in the form "**N** numbered lines in the answer file; **M** annotated here" — the contract wants the two counts printed, not implied');
  else {
    if (Number(declared[1]) !== qs.length) fails.push(`the report claims the answer file has ${declared[1]} questions; it has ${qs.length}`);
    if (Number(declared[2]) !== quotes.length) fails.push(`the report claims to annotate ${declared[2]}; it carries ${quotes.length} quotes`);
  }
  for (let i = 0; i < Math.min(qs.length, quotes.length); i++) {
    const want = qs[i].text.replace(/\s+/g, " ");
    const got = quotes[i].text;
    if (want !== got) {
      fails.push(`Q${i + 1} quote has drifted from the reader's words\n    answer file: ${want}\n    report:      ${got}`);
    }
    const sec = reportText.split(`### Q${i + 1} —`)[1] ?? "";
    if (!/- \*\*Pile:\*\*/.test(sec)) fails.push(`Q${i + 1} has no pile line (delegate / blind / union)`);
    if (!/What would fix it/.test(sec) && !/ASK A\d/.test(sec)) fails.push(`Q${i + 1} states no fix and no ask — an annotation without a next step is a description, not a review`);
  }
  const pileC = [...reportText.matchAll(/### (Q\d+)[^\n]*\n\n> [^\n]+\n\n- \*\*Pile:\*\*[^—\n]*→ union \*\*C\*\*/g)].map((m) => m[1]);
  notes.push(`questions: ${qs.length} · quotes: ${quotes.length} · union-pile-C questions: ${pileC.length ? pileC.join(", ") : "none"}`);
  const disagrees = [...reportText.matchAll(/\*\*DISAGREE\*\*/g)].length;
  notes.push(`questions marked DISAGREE in the report: ${disagrees}`);
  return { fails, notes };
}

const arg_ = arg;
if (process.argv.includes("--selftest")) {
  const HERE = "design/fresh-reader";
  const answer = fs.readFileSync(path.resolve(`${HERE}/round-1/pass-answer.md`), "utf8");
  const report = fs.readFileSync(path.resolve(`${HERE}/round-1-questions-2026-11-21.md`), "utf8");
  const cases = [];
  const ok = (name, cond, detail = "") => cases.push({ name, pass: !!cond, detail });
  const clean = check(answer, report);
  ok("control: the tracked round 1 report covers its answer file", clean.fails.length === 0, clean.fails.join(" | ").slice(0, 300));
  const dropped = report.replace(/### Q12 —[\s\S]*?(?=\n### Q13 —)/, "");
  ok("plants a question dropped from the report", check(answer, dropped).fails.some((f) => f.includes("annotates fewer")), check(answer, dropped).fails[0]?.slice(0, 90));
  const tidied = report.replace(/is that a missing space, or did something on the page break\?/, "is a space missing?");
  ok("plants a quote tidied into different words", check(answer, tidied).fails.some((f) => f.includes("drifted")));
  const counts = report.replace(/\*\*25\*\* numbered lines in the answer file; \*\*25\*\* annotated here/, "**25** numbered lines in the answer file; **24** annotated here");
  ok("plants a report whose own counts disagree with the answer file", check(answer, counts).fails.length > 0, check(answer, counts).fails[0]?.slice(0, 90));
  const noreport = report.replace(/- \*\*Pile:\*\* delegate[^>]*/, "- the reader had a point");
  ok("plants an annotation with no pile line", check(answer, noreport).fails.some((f) => f.includes("no pile line")), check(answer, noreport).fails.find((f) => f.includes("no pile line"))?.slice(0, 80));
  let bad = 0;
  for (const c of cases) { if (!c.pass) bad++; console.log(`${c.pass ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` (${c.detail})` : ""}`); }
  console.log(`check-report-coverage selftest: ${cases.length - bad}/${cases.length} — ${bad ? "FAILED" : "every planted defect is caught, and the tracked report is a clean control"}`);
  process.exit(bad ? 1 : 0);
}

const ROUND = arg_("round", "1");
const answerFile = path.resolve(arg_("answer", `design/fresh-reader/round-${ROUND}/pass-answer.md`));
const reportFile = path.resolve(arg_("report", `design/fresh-reader/round-${ROUND}-questions-*.md`));
const found = reportFile.includes("*") ? (fs.existsSync(path.dirname(reportFile)) ? fs.readdirSync(path.dirname(reportFile)).filter((f) => new RegExp(`^${path.basename(reportFile).replace(/[-]/g, "\\-").replace(/\*/g, ".*")}$`).test(f)).map((f) => path.join(path.dirname(reportFile), f)) : []) : [reportFile];
if (!fs.existsSync(answerFile)) { console.error(`no answer file at ${answerFile} — run pass.mjs first; a coverage check over a missing question list proves nothing`); process.exit(1); }
if (found.length !== 1) { console.error(`expected exactly one report for round ${ROUND}, found ${found.length} (${found.join(", ")}) — one report per round, or the count means nothing`); process.exit(1); }
const { fails, notes } = check(fs.readFileSync(answerFile, "utf8"), fs.readFileSync(found[0], "utf8"));
console.log(`check:report-coverage — round ${ROUND}: ${path.relative(".", answerFile)} against ${path.relative(".", found[0])}`);
for (const n of notes) console.log(`  ${n}`);
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
