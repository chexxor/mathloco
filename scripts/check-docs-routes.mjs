#!/usr/bin/env node
// check:docs-routes - every tracked page under docs/ has exactly one row in the index that owns it, and
// no index row points at a file that does not exist.
//
// Why (D458): `docs/` grew three homes in three days - 15 dated letters, 17 how-to pages, an ADR set - and
// nothing said which of them still speaks. The router (`docs/README.md`) is the answer a fresh clone reads,
// and a router nobody enforces is a page that goes stale the first time a letter lands: `check:plan` compares
// milestone *status*, `check:decisions` checks ids, and `design/audit-references.mjs` resolves path literals
// but never asks whether a file is indexed at all. So the router's own exit criterion - "every docs/*.md
// appears in the router exactly once" - is a gate here, not a intention.
//
// The rule the tree forced (measured while writing this): "exactly one row" holds for the **router**, whose
// rows are documents. It cannot hold for `docs/howto/README.md`, which is a symptom -> runbook map, where one
// runbook is legitimately named by up to **4** different symptoms @measured 2026-11-20 by this gate's own
// parse (`design-round-specimen-measurement.md` 4 rows, `rendered-numbers-from-a-built-page.md` 3,
// `pages-to-workers-migration.md` and `n8n-runtime-loop.md` 2). Demanding one row there would have been
// answered by deleting the second symptom, which is the gate destroying the thing it checks. So:
//   - the router:  **exactly one** subject row per owned document (two rows = two claims that can disagree);
//   - the sub-indexes: **at least one** row per owned document;
//   - everywhere: every path a row's *routing cell* names has to be a tracked file. A prose code-span in the
//     symptom text is not a routing promise and is left to design/audit-references.mjs, which reads whole files.
//
//   node scripts/check-docs-routes.mjs            the gate
//   node scripts/check-docs-routes.mjs --selftest plant each defect, require each to fail
//   node scripts/check-docs-routes.mjs --show     print what the gate is reading

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));

// Which index owns which files, and which cell of a row routes to the file. Explicit, because guessing the
// routing column from a header name silently retargets the gate when somebody reorders a table.
const INDEXES = [
  {
    file: 'docs/README.md',
    label: 'the router',
    routing: { kind: 'cell', at: 0 },
    owns: (d) => d !== 'docs/README.md' && !isRunbook(d) && !isAdr(d),
    mode: 'once',
  },
  {
    file: 'docs/howto/README.md',
    label: 'the runbook index',
    routing: { kind: 'cell', at: 1 },
    owns: (d) => d.startsWith('docs/howto/') && d !== 'docs/howto/README.md',
    mode: 'any',
  },
  {
    file: 'docs/adr/README.md',
    label: 'the ADR index',
    routing: { kind: 'number', at: 0 },
    owns: (d) => d.startsWith('docs/adr/') && d !== 'docs/adr/README.md',
    mode: 'any',
  },
];
const isRunbook = (d) => d.startsWith('docs/howto/') && d !== 'docs/howto/README.md';
const isAdr = (d) => d.startsWith('docs/adr/') && d.match(/^docs\/adr\/\d{4}-/) !== null;

// Host-local homes are not promises to a clone; they are marked as such in the row that routes to them.
const HOSTLOCAL = /^(\.notes|\.design|\.ai-work|\.pi|\.wrangler)\//;

// Split a row on unescaped pipes (same rule as scripts/check-tables.mjs: split('|') on a cell containing
// `\|` invents a column, and an invented column invents a routing target).
function cells(line) {
  const out = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '|'; i++; continue; }
    if (ch === '|') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  if (out.length && out[0].trim() === '') out.shift();
  if (out.length && out[out.length - 1].trim() === '') out.pop();
  return out.map((c) => c.trim());
}
const isRow = (l) => typeof l === 'string' && /^\s*\|/.test(l);
const isSeparator = (l) => isRow(l) && /^[\s:|-]+$/.test(l.replace(/\|/g, ' ')) && l.includes('-');

// Data rows only: a header row is the line a separator follows, and it is skipped.
function dataRows(text) {
  const lines = text.split('\n');
  const rows = [];
  let i = 0;
  while (i < lines.length) {
    if (isRow(lines[i]) && isSeparator(lines[i + 1])) { i += 2; continue; }
    if (isRow(lines[i])) {
      while (i < lines.length && isRow(lines[i])) {
        rows.push({ line: i + 1, text: lines[i], cells: cells(lines[i]) });
        i++;
      }
      continue;
    }
    i++;
  }
  return rows;
}

// A routing cell's targets. Only what comes **before the first `(`** counts: these tables put the target
// first and its explanation in a parenthetical inside the same cell, and the explanation names commands,
// gates and other people's files - none of which is what the row promises to route you to. Whole-file
// literal checking is design/audit-references.mjs's job, and it reads the parentheticals there.
function targets(cellText, dir) {
  const head = cellText.split('(')[0];
  const raws = [...head.matchAll(/`([^`\s|]+)`/g)].map((m) => m[1]);
  const out = [];
  for (const raw of raws) {
    if (HOSTLOCAL.test(raw)) { out.push({ raw, kind: 'host-local' }); continue; }
    if (/[<>*]/.test(raw)) { out.push({ raw, kind: 'pattern' }); continue; }
    // Resolve against the index's own directory first (a runbook index says `db-target-and-migrations.md`),
    // then against the repo root (it also says `integrations/mobilizon-cadence/check.mjs`).
    const cand = dir === '' ? [raw] : [`${dir}/${raw}`, raw];
    out.push({ raw, kind: 'path', candidates: cand });
  }
  return out;
}

// One index's rows -> how many rows route to each file, plus the phantom targets found on the way.
// `every` is the whole tracked tree: an index row may legitimately route outside docs/ (the runbook index
// sends a symptom to `design/README.md`), and "does this path exist?" is answered against the tree, not
// against the quadrant.
function routeRows(rows, idx, every, tracked) {
  const fail = [];
  const counts = new Map();
  let hostLocal = 0, patterns = 0;
  const dir = idx.file.replace(/\/[^/]*$/, '');
  for (const r of rows) {
    const cell = r.cells[idx.routing.at];
    if (cell === undefined) {
      fail.push(`${idx.file}:${r.line} has no routing cell ${idx.routing.at + 1} - the row is narrower than its own table, so its target is unknown`);
      continue;
    }
    const hit = new Set();
    if (idx.routing.kind === 'number') {
      const n = (cell.match(/\b(\d{4})\b/) || [])[1];
      if (n) {
        for (const t of tracked) if (t.startsWith(`docs/adr/${n}-`)) hit.add(t);
      }
    }
    for (const t of targets(cell, dir)) {
      if (t.kind === 'host-local') { hostLocal++; continue; }
      if (t.kind === 'pattern') { patterns++; continue; }
      const found = t.candidates.find((c) => every.has(c));
      if (!found) {
        fail.push(`${idx.file}:${r.line} routes to \`${t.raw}\`, which is not a tracked file - spell it from the repo root, drop it if it moved, or say "host-local" beside it if a clone cannot have it`);
        continue;
      }
      if (found.endsWith('.md')) hit.add(found);
    }
    for (const f of hit) counts.set(f, (counts.get(f) || 0) + 1);
  }
  return { fail, counts, hostLocal, patterns };
}

function verdict({ tracked, every, indexTexts }) {
  const fail = [];
  let routed = 0, hostLocal = 0, patterns = 0;

  for (const idx of INDEXES) {
    const text = indexTexts[idx.file];
    if (text === undefined) {
      fail.push(`${idx.file} is missing from the tree - ${idx.label} is what makes docs/ navigable; restore it or rewrite the index set in scripts/check-docs-routes.mjs`);
      continue;
    }
    const rows = dataRows(text);
    if (!rows.length) {
      fail.push(`${idx.file} has no parseable table rows - ${idx.label} cannot be audited, so nothing is known routed; fix the table or the routing column`);
      continue;
    }
    const r_ = routeRows(rows, idx, every, tracked);
    fail.push(...r_.fail);
    hostLocal += r_.hostLocal; patterns += r_.patterns;
    const counts = r_.counts;

    for (const d of tracked) {
      if (!idx.owns(d)) continue;
      const n = counts.get(d) || 0;
      if (n === 0) {
        fail.push(`${d} has no row in ${idx.file} - add it there with its date and what it answers, or ${idx.label} is a wall to a fresh clone`);
      } else if (n > 1 && idx.mode === 'once') {
        fail.push(`${d} has ${n} rows in ${idx.file} - one document, one row: two rows are two claims about the same letter, and only one of them gets corrected`);
      }
      if (n > 0) routed++;
    }
  }
  return { fail, routed, hostLocal, patterns };
}

function listTrackedDocs(all = false) {
  const cmd = all ? 'git ls-files' : 'git ls-files docs';
  try {
    return execSync(cmd, { cwd: root.slice(0, -1) }).toString().split('\n').filter((f) => f.endsWith('.md') || all);
  } catch {
    // No git (a source tarball): the tree itself is the best answer, and docs/ is never ignored here.
    if (!all) {
      const out = [];
      const walk = (d, prefix) => {
        for (const e of readdirSync(root + d, { withFileTypes: true })) {
          if (e.isDirectory()) walk(`${d}/${e.name}`, prefix);
          else if (e.name.endsWith('.md')) out.push(`${prefix}/${e.name}`);
        }
      };
      walk('docs', 'docs');
      return out;
    }
    return execSync('git ls-files docs', { cwd: root.slice(0, -1) }).toString().split('\n').filter((f) => f.endsWith('.md'));
  }
}

function runGate() {
  const tracked = listTrackedDocs();
  if (!tracked.length) {
    console.error('check:docs-routes: no tracked files under docs/ - the gate reads `git ls-files docs`; that is not a clean run, it is a blind one');
    return 1;
  }
  const every = new Set(listTrackedDocs(true));
  const indexTexts = {};
  for (const idx of INDEXES) {
    if (existsSync(root + idx.file)) indexTexts[idx.file] = readFileSync(root + idx.file, 'utf8');
  }
  const { fail, routed, hostLocal, patterns } = verdict({ tracked, every, indexTexts });
  if (fail.length) {
    console.error(`check:docs-routes: ${fail.length} problem(s)`);
    for (const f of fail) console.error('  - ' + f);
    return 1;
  }
  console.log(`check:docs-routes: ok - ${tracked.length} tracked docs, ${routed} routed by ${INDEXES.length} indexes, ${hostLocal} host-local targets marked, ${patterns} patterns`);
  return 0;
}

function readIndexes() {
  const indexTexts = {};
  for (const idx of INDEXES) if (existsSync(root + idx.file)) indexTexts[idx.file] = readFileSync(root + idx.file, 'utf8');
  return indexTexts;
}

// Each planting is a defect in the shape the corpus actually has, and the gate must NAME it.
// Each planting names the index it mutates, because a mutation aimed at the wrong page is a planting that
// passes for the wrong reason.
const PLANTINGS = [
  ['a routed document with no row (the router loses the author\u2019s letter)', 'docs/README.md', (b) => b.replace(/^.*the-authors-vision-2026-11-19\.md.*$/m, '')],
  ['a row whose target does not exist (an index path edited into a wall)', 'docs/README.md', (b) => b.replace(/^\| `docs\/howto\/README\.md`/m, `| \`docs/howto/README${'-moved'}.md\``)],
  ['the same document routed twice (two rows, two claims)', 'docs/README.md', (b) => { const m = b.match(/^\| `docs\/spec\/source-contract\.md`.*$/m); return b + '\n' + m[0] + '\n'; }],
  ['a runbook the index stopped routing', 'docs/howto/README.md', (b) => b.split('\n').filter((l) => !l.includes('`email-routing-matheapolis.md`')).join('\n')],
  ['an index whose tables stopped parsing (the silent-pass case)', 'docs/README.md', (b) => b.replace(/\|/g, ' ')],
];

function runSelftest() {
  const tracked = listTrackedDocs();
  const every = new Set(listTrackedDocs(true));
  const base = readIndexes();
  if (!tracked.length || Object.keys(base).length !== INDEXES.length) {
    console.error('check:docs-routes:selftest: needs the real indexes and the tracked docs as its control - refusing to grade itself against nothing');
    return 1;
  }
  const clean = verdict({ tracked, every, indexTexts: base });
  if (clean.fail.length) {
    console.error('check:docs-routes:selftest: the real corpus already fails the gate - fix it before trusting a selftest:');
    for (const f of clean.fail) console.error('  - ' + f);
    return 1;
  }
  let caught = 0;
  for (const [label, file, mutate] of PLANTINGS) {
    const mutated = { ...base, [file]: mutate(base[file]) };
    const { fail } = verdict({ tracked, every, indexTexts: mutated });
    if (fail.length) { caught++; console.log(`  caught: ${label} -> ${fail[0]}`); }
    else console.error(`  NOT caught: ${label}`);
  }
  if (caught !== PLANTINGS.length) {
    console.error(`check:docs-routes:selftest: ${caught}/${PLANTINGS.length} plantings caught - the gate is blind to ${PLANTINGS.length - caught} defect class(es).`);
    return 1;
  }
  console.log(`check:docs-routes:selftest: ok - ${caught} plantings caught, control clean (${tracked.length} tracked docs)`);
  return 0;
}

if (process.argv.includes('--selftest')) process.exit(runSelftest());
if (process.argv.includes('--show')) {
  const tracked = listTrackedDocs();
  for (const idx of INDEXES) {
    const t = existsSync(root + idx.file) ? readFileSync(root + idx.file, 'utf8') : '';
    console.log(`== ${idx.file} (${idx.label}) owns ${tracked.filter(idx.owns).length} of ${tracked.length} tracked docs; ${dataRows(t).length} data rows`);
  }
  process.exit(0);
}
process.exit(runGate());
