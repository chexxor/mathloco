#!/usr/bin/env node
// DECISIONS.index.md - the tracked half of a gitignored memory.
//
// Why this exists (D151): `.notes/DECISIONS.md` holds the durable decisions and their *why*, and it is
// gitignored - so a fresh clone, or the other host, has the citations and none of the things they point
// at. Measured 2026-11-03: 101 tracked files make 610 `D###` citations into one file that is not in the
// repo, and the most-cited id (`D101`) appears 38 times. A decision id that resolves to nothing is worse
// than no id at all: it looks like a citation and behaves like a rumour.
//
// So: the log stays host-local (it's a journal, and its prose is long), and this script publishes a
// one-line-per-decision index into the repo, and gates the citations.
//
//   node scripts/decision-index.mjs            regenerate the index (fails if the log is missing)
//   node scripts/decision-index.mjs --check    what CI runs: the index must match the log when the log
//                                              is present, and no tracked file may cite an id that the
//                                              index does not define
//
// The ids are append-only. Renumbering is forbidden: the citations are in tracked code and comments, and
// a renumber silently re-points all of them at a different decision.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const LOG = '.notes/DECISIONS.md';
const INDEX = 'DECISIONS.index.md';
const check = process.argv.includes('--check');

// --- read the log (it may legitimately be absent: fresh clone, CI, other host) -----------------------
let log = null;
if (existsSync(root + LOG)) log = readFileSync(root + LOG, 'utf8');

// Entry shapes actually found in the log (it grew over five weeks, so it is inconsistent on purpose):
//   ## D1 — Title
//   ## D92. Title (attribution, date)
//   ## D68 (2026-10-31): two jobs, three planes - and nothing upstream of your own data
//   ## D70: fix the interface, defer the writer
//   ## D124 amendment. Who moves an approved item into `staging` ...
//   - D124 (**proposed, pending the operator's ruling ...**)
// The id is what is durable; the separator around it is not. An amendment line merges into the same id and
// is marked in the index, because a decision that was amended twice is not a different decision.
function parse(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    let m = /^#{2,6}\s+D(\d+)\b(.*)$/.exec(line) || /^[-*]\s+\*{0,2}D(\d+)\b\*{0,2}\s*[:\u2014\u2013]?\s*(.*)$/.exec(line);
    if (!m) continue;
    const e = splitTitle(Number(m[1]), m[2]);
    merge(out, e.id, e.title, e.when);
  }
  return out;
}
function splitTitle(id, rest) {
  let title = rest.replace(/^\s*(amendment)?[.\u2014\u2013:\s-]+/i, '').trim();
  let when = null;
  // A leading parenthetical is metadata in some of these: "(2026-10-31):" or "(operator, 2026-11-03)".
  const pm = /^\(([^)]*)\)\s*[:\u2014-]?\s*/.exec(title);
  if (pm) {
    const dm = /(\d{4}-\d{2}-\d{2})/.exec(pm[1]);
    if (dm) when = dm[1];
    title = title.slice(pm[0].length).trim();
  }
  const dm = /(\d{4}-\d{2}-\d{2})/.exec(title);
  if (dm) when = when || dm[1];
  return { id, title, when };
}
// A decision can be amended in place (D143 has an amendment); keep the first title, note the amendment.
function merge(map, id, title, when) {
  const have = map.get(id);
  if (!have) return void map.set(id, { id, title, when, amendments: 0 });
  if (have.title !== title) have.amendments++;
  if (!have.when && when) have.when = when;
}

const entries = log ? parse(log) : null;

// --- the index itself -------------------------------------------------------------------------------
function render() {
  const ids = [...entries.keys()].sort((a, b) => a - b);
  const lines = [
    '# Decision index - generated, do not edit',
    '',
    'One line per durable decision. The **reasoning** lives in `.notes/DECISIONS.md`, which is',
    'gitignored (host-local): this file is the part that travels, so that a citation in tracked',
    'code resolves to something on a fresh clone. Regenerate with `node scripts/decision-index.mjs`;',
    '`npm run check:decisions` keeps it honest and fails on a citation with no entry.',
    '',
    '**Ids are append-only. Never renumber one** - the citations are baked into tracked code comments,',
    'and a renumber silently re-points every one of them at a different decision.',
    '',
  ];
  for (const id of ids) {
    const e = entries.get(id);
    const title = e.title.replace(/\s+/g, ' ').replace(/\|/g, '\\|');
    lines.push(`- **D${id}**${e.when ? ` (${e.when})` : ''} — ${title}${e.amendments ? ` — _amended in place_` : ''}`);
  }
  const gaps = [];
  for (let i = 1, last = ids[ids.length - 1]; i <= last; i++) if (!entries.has(i)) gaps.push('D' + i);
  lines.push('', `Defined: ${ids.length} (D1-D${ids[ids.length - 1]}). Unused ids: ${gaps.length ? gaps.join(', ') : 'none'}.`);
  return lines.join('\n') + '\n';
}

// --- citations: every D### mentioned in a tracked file ----------------------------------------------
// Honest limitation: `D1`..`D9` also occur as the Cloudflare product name ("the D1 binding"). Those count
// as candidate citations. It costs an inflated count, not a wrong verdict: the gate fires on an id with no
// entry, and every small id in this repo is defined.
//
// An encoded payload is not a citation, though. The generated specimens (`design/grill/round-12-art.html`,
// `round-13-hero.html`) embed screenshots as base64, and a 3 MB blob contains the letter D followed by
// digits by chance — one-, two- and three-digit ids that fire the gate on a file citing nothing. So data
// URIs and any long base64 run are removed before matching. Cheap, and it keeps the D-one-vs-binding
// trade the comment above accepts.
const B64 = /data:[a-z0-9.+-]+\/?[a-z0-9.+-]*;base64,[A-Za-z0-9+/=]+/gi;
const B64RUN = /"[A-Za-z0-9+/=]{80,}"|'[A-Za-z0-9+/=]{80,}'|[A-Za-z0-9+/]{200,}={0,2}/g;
function citations() {
  const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const by = new Map(); // id -> [file, ...]
  for (const f of files) {
    if (f === INDEX) continue; // the index defines ids; it must not count as citing them
    let text;
    try {
      text = readFileSync(root + f, 'utf8');
    } catch {
      continue; // deleted-but-listed, or a symlink; not worth failing the gate over
    }
    for (const m of text.replace(B64, ' ').replace(B64RUN, ' ').matchAll(/\bD(\d{1,3})\b/g)) {
      const id = Number(m[1]);
      if (!by.has(id)) by.set(id, []);
      const list = by.get(id);
      if (!list.includes(f)) list.push(f);
    }
  }
  return by;
}

const cites = citations();
const citeCount = [...cites.values()].reduce((a, v) => a + v.length, 0);

if (!check) {
  if (!entries) {
    console.error(`decision-index: ${LOG} is missing on this host, so the index cannot be regenerated.`);
    console.error(`decision-index: the index on disk stays as it is; \`--check\` still validates citations against it.`);
    process.exit(2);
  }
  const out = render();
  const prev = existsSync(root + INDEX) ? readFileSync(root + INDEX, 'utf8') : null;
  if (out === prev) {
    console.log(`decision-index: up to date - ${entries.size} decisions, ${cites.size} distinct ids cited by ${citeCount} files.`);
  } else {
    writeFileSync(root + INDEX, out);
    console.log(`decision-index: rewrote ${INDEX} (${entries.size} decisions). Diff it.`);
  }
  process.exit(0);
}

// --check
let bad = 0;
if (entries) {
  const want = render();
  const have = existsSync(root + INDEX) ? readFileSync(root + INDEX, 'utf8') : null;
  if (have !== want) {
    console.error('decision-index: ' + INDEX + ' is stale against ' + LOG + '.');
    // Name the difference, do not just announce it.
    const idsDisk = new Set([...(have || '').matchAll(/^- \*\*D(\d+)\*\*/gm)].map((m) => Number(m[1])));
    const missing = [...entries.keys()].filter((id) => !idsDisk.has(id));
    const extra = [...idsDisk].filter((id) => !entries.has(id));
    if (missing.length) console.error('  missing from the index: ' + missing.map((i) => 'D' + i).join(', '));
    if (extra.length) console.error('  in the index but not in the log (renumbered? deleted?): ' + extra.map((i) => 'D' + i).join(', '));
    if (!missing.length && !extra.length) console.error('  same ids, different text - regenerate it.');
    console.error('  fix: node scripts/decision-index.mjs');
    bad++;
  }
} else {
  console.log('decision-index: ' + LOG + ' not present on this host - skipping the log-vs-index comparison, still checking citations against the index.');
}

const defined = new Set();
if (existsSync(root + INDEX)) for (const m of readFileSync(root + INDEX, 'utf8').matchAll(/^- \*\*D(\d+)\*\*/gm)) defined.add(Number(m[1]));
if (entries) for (const id of entries.keys()) defined.add(id);

const dangling = [...cites.entries()].filter(([id]) => !defined.has(id)).sort((a, b) => a[0] - b[0]);
if (dangling.length) {
  console.error('decision-index: ' + dangling.length + ' cited decision ids have no entry:');
  for (const [id, files] of dangling.slice(0, 20)) console.error(`  D${id} cited by ${files.length} file(s): ${files.slice(0, 4).join(', ')}${files.length > 4 ? ' …' : ''}`);
  console.error('  Either the log entry is missing (write it) or the id is a typo (fix the citation).');
  bad++;
}

if (!bad) {
  console.log(`decision-index: ok - ${defined.size} decisions defined, ${cites.size} distinct ids cited by ${citeCount} files, none dangling.`);
}
process.exit(bad ? 1 : 0);
