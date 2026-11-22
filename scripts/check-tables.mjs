#!/usr/bin/env node
// check-tables.mjs — every markdown table in the tracked prose has as many cells as its header.
//
// Why this exists (measured 2026-11-08): the `A15` row of `MILESTONES.md` carried **five** cells under a
// four-column header, and `A2` carried **three**. Both came from hand-resolved merge conflict cells, and both
// survived because a markdown row with the wrong cell count still *renders*: the extra or missing cell becomes an
// unnamed column at the right edge, so the defect is visible in the browser and invisible in a diff. One of them
// put a milestone's state prose in the **exit criterion** column — and `MILESTONES.md` is the tracked contract
// whose whole job is "what is the current milestone and how would I know it's finished" (D151).
//
// What it does not claim: that a `|` inside a cell is always a defect. It counts cells, so a cell that genuinely
// contains a pipe must escape it (`\|`) — which is the reason the escape exists. `--selftest` plants the two
// shapes this gate is for, and holds the clean forms the repo already contains, so the gate cannot be satisfied
// by never having a table.

import { readFileSync, readdirSync } from 'node:fs';

// D416: the round's two docs are tracked prose carrying tables that ARE the contract — an inventory row
// that loses a cell loses the line item it was mapping, and the claims ledger is how the operator finds
// their own hand back. Same authority as MILESTONES.md's rows: the separator row sets the width.
const FILES = [
  'MILESTONES.md',
  'DESIGN.md',
  'README.md',
  'AGENTS.md',
  'DECISIONS.index.md',
  'docs/communication-review-round-6-2026-11-16.md',
  'docs/reply-to-the-communication-review-round-6-2026-11-16.md',
  // D436 (round 7): the pair's inventory IS the contract — a row that loses a cell loses the line item it was
  // mapping, and the claims ledger is how the operator finds their own hand back. The letter doc's tables sit
  // inside a blockquote, which this auditor does not read, so the pair audits the reply's tables only.
  'docs/communication-review-round-7-2026-11-18.md',
  'docs/reply-to-the-communication-review-round-7-2026-11-18.md',
  // Round 8, same rule: the letter's tables sit inside a blockquote (every line starts `>`), which this
  // auditor does not read, so the pair audits the reply's inventory and claims ledger only — 53 inventory
  // rows and 8 ledger rows whose ids `node design/review-round-8-census.mjs --reply` also counts.
  'docs/communication-review-round-8-2026-11-18.md',
  'docs/reply-to-the-communication-review-round-8-2026-11-18.md',
  // MS40 P2 (2026-11-20): the two indexes that decide what a fresh clone can find. `docs/howto/README.md` is the
  // symptom -> runbook map - a row that loses a cell stops routing the symptom it names - and `docs/adr/README.md`
  // is the ADR set table, the one place the eight records are enumerated.
  'docs/howto/README.md',
  'docs/adr/README.md',
  // MS40 P3 (2026-11-20, D458): docs/README.md is the router - its rows ARE the map of the corpus, and a row
  // that loses a cell loses the "what it answers" or the "superseded by" that made the page findable.
  'docs/README.md',
];

// A hardcoded list is honest exactly as long as someone remembers to edit it - and the day it is forgotten,
// the auditor quietly narrows to last year's corpus (the same defect class as a gate with no script behind
// it). So the two homes that GROW on their own are covered by pattern instead of by memory: every fresh-reader
// round report and every design record is audited the round it lands, and the persona and the grading rule -
// whose vocabulary and pile tables ARE the enforcement contract - with them. D469, S091, 2026-11-22.
const PATTERNS = [
  ['design/fresh-reader', /^round-\d+-questions-.*\.md$/],
  ['design/fresh-reader', /^(persona|grading-rule)\.md$/],
  ['design/records', /^\d{4}-.*\.md$/],
];
for (const [dir, re] of PATTERNS) {
  let names;
  try { names = readdirSync(dir); } catch { continue; } // a directory absent from this clone audits nothing
  for (const f of names) if (re.test(f)) FILES.push(`${dir}/${f}`);
}

// Split a row on unescaped pipes only. `split('|')` on a cell containing `\|` invents a column.
function cells(line) {
  const out = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') {
      cur += '|';
      i++;
      continue;
    }
    if (ch === '|') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  // A well-formed row opens and closes with a pipe, which yields empty first/last fields.
  if (out.length && out[0].trim() === '') out.shift();
  if (out.length && out[out.length - 1].trim() === '') out.pop();
  return out;
}

const isRow = (l) => typeof l === 'string' && /^\s*\|/.test(l);
const isSeparator = (l) => isRow(l) && /^[\s:|-]+$/.test(l.replace(/\|/g, ' ')) && l.includes('-');

function audit(file, text) {
  const lines = text.split('\n');
  const problems = [];
  let tables = 0;
  let i = 0;
  while (i < lines.length) {
    if (!isRow(lines[i]) || !isSeparator(lines[i + 1])) {
      i++;
      continue;
    }
    // The separator row is the authority on width: it is what a renderer actually uses.
    const want = cells(lines[i + 1]).length;
    tables++;
    if (cells(lines[i]).length !== want) {
      problems.push({ file, line: i + 1, want, got: cells(lines[i]).length, kind: 'header', text: lines[i].slice(0, 70) });
    }
    let j = i + 2;
    while (j < lines.length && isRow(lines[j])) {
      const got = cells(lines[j]).length;
      if (got !== want) {
        problems.push({ file, line: j + 1, want, got, kind: 'row', text: lines[j].slice(0, 70) });
      }
      j++;
    }
    i = j;
  }
  return { problems, tables };
}

if (process.argv.includes('--selftest')) {
  // Each planting must FAIL, each clean form must pass. The plantings are the two real defects found by hand.
  const plantings = [
    ['extra cell (an A15-shaped hand-merged row)', '| id | goal | exit | state |\n|---|---|---|---|\n| **A9** | goal | exit | state | extra sentence that was inside the state cell |\n'],
    ['missing cell (an A2-shaped row, state lands in the exit column)', '| id | goal | exit | state |\n|---|---|---|---|\n| **A2** | goal | the whole state prose, and no state cell |\n'],
    ['header narrower than its own separator', '| id | goal |\n|---|---|---|\n| **A1** | goal | exit |\n'],
  ];
  const clean = [
    ['aligned separator with colons', '| :-- | :-- |\n|---|---|\n| a | b |\n'],
    ['escaped pipe inside a cell', '| a | b |\n|---|---|\n| `404` \\| `200` | both appear |\n'],
    ['bold and code spans containing dashes', '| a | b |\n|---|---|\n| **D241** — `[[routes]]` | `x --- y` |\n'],
    ['a table that ends at a blank line', '| a | b |\n|---|---|\n| 1 | 2 |\n\ntext after the table\n| c | d |\n|---|---|\n| 3 | 4 |\n'],
  ];
  let bad = 0;
  for (const [label, text] of plantings) {
    const { problems } = audit('selftest', text);
    if (problems.length === 0) {
      console.log(`FAIL planted-but-passed: ${label}`);
      bad++;
    } else {
      console.log(`ok  caught ${problems.length} defect(s): ${label} (${problems[0].kind}: want ${problems[0].want}, got ${problems[0].got})`);
    }
  }
  for (const [label, text] of clean) {
    const { problems } = audit('selftest', text);
    if (problems.length) {
      console.log(`FAIL clean-form-flagged: ${label} (${problems[0].kind} at line ${problems[0].line})`);
      bad++;
    } else {
      console.log(`ok  clean form passes: ${label}`);
    }
  }
  const planted = plantings.length;
  const forms = clean.length;
  if (bad) {
    console.log(`check:tables:selftest: FAIL — ${bad} of ${planted + forms} cases wrong (${planted} plantings, ${forms} clean forms)`);
    process.exit(1);
  }
  console.log(`check:tables:selftest: PASS — ${planted} plantings all caught, ${forms} clean forms all pass`);
  process.exit(0);
}

const problems = [];
let tables = 0;
for (const file of FILES) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // A file absent from a fresh clone is not a table defect.
  }
  const r = audit(file, text);
  problems.push(...r.problems);
  tables += r.tables;
}

if (problems.length === 0) {
  console.log(`check:tables: PASS — ${tables} tables across ${FILES.length} tracked files, every row matching its header's cell count`);
  process.exit(0);
}

const counts = problems.reduce((m, p) => ((m[p.kind] = (m[p.kind] ?? 0) + 1), m), {});
console.log(`check:tables: FAIL — ${problems.length} mismatched line(s) (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')})`);
for (const p of problems) {
  console.log(`  ${p.file}:${p.line} — header says ${p.want} columns, this ${p.kind} has ${p.got}`);
  console.log(`      ${p.text}…`);
}
console.log('  A row that renders fine and is wrong: an extra `|` invents an unnamed column at the right edge, and a');
console.log('  missing one moves the state prose into the exit-criterion column. A cell that must contain a pipe');
console.log('  escapes it as `\\|`. Prove the gate still bites with `npm run check:tables:selftest`.');
process.exit(1);
