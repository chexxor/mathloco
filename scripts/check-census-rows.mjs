#!/usr/bin/env node
// check-census-rows.mjs — every census row that makes the site SAY a sentence names where that sentence comes from.
//
//   node scripts/check-census-rows.mjs                    # verdict over design/review-round-8-census.mjs
//   node scripts/check-census-rows.mjs <path>             # over another census file
//   node scripts/check-census-rows.mjs --json             # machine form
//   node scripts/check-census-rows.mjs --selftest         # plant each defect the rule exists to catch
//
// WHY THIS GATE EXISTS (S084, D457; the defect it closes is S082, D454). A census row is not a note: a
// `want: 'present'` row makes a sentence
// load-bearing for as long as the row stands, and the round that wrote the row is usually not the round reading
// it. In the round-8 census, rows asserted sentences for pages without ever naming who put those sentences there —
// one of them named a hero sentence a later session then had to price as the author's or the seat's, and it took a
// **visitor** noticing the sentence to open that question at all. This gate makes the census answer, per row, in
// machine-checkable form: who put this sentence on this page?
//
// THE RULE (`unsourced-census-row`). A row that (a) wants the string PRESENT, (b) is a prose row — no `kind:`, or
// `kind: 'plain'` — (c) whose needle runs to four words or more, and (d) carries no `declined:` field, must carry
// `author:` in one of four forms:
//
//   content:<slot.path>   the string is painted from src/content.json; the slot must exist and hold the string
//   source:<src path>     the string is written in that file; the file must exist and hold the string
//   generated:<src path>  the artifact composes the string — a count, a date, a number off a list's length
//   D### / S###           an operator ruling or planning ruling ordered it
//
// Three exemptions, stated so the next round can argue with them:
//   - a row that wants a string ABSENT: its authority is the deletion event, which lives in DECISIONS and in the
//     row's own `why`, and `check:decisions` already fails a `D###` that does not exist;
//   - a row carrying `declined:`: the row already names the ruling and the gates that hold the stance, which is
//     what the census header promises a DECLINED row carries (`id: 'J3'` is that case);
//   - a short needle, or `kind: 'heading' | 'metric' | 'source' | 'href'`: a label or a count, not a sentence the
//     site is committed to saying.
//
// A `content:` or `source:` citation is checked, not trusted: at least one 4-word window of the row's needle has
// to appear in the cited file or slot. An `author:` naming a file that does not contain the sentence is a false
// citation, and a false citation is worse than none — it reads like provenance.
//
// NOT in this gate: whether the sentence is any good. That is the operator's call, at the review round.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CENSUS = 'design/review-round-8-census.mjs';
const JSON_OUT = process.argv.includes('--json');
const SELFTEST = process.argv.includes('--selftest');
const argPath = process.argv.slice(2).find((a) => !a.startsWith('--'));

const MIN_WORDS = 4; // a needle shorter than this is a label, not a sentence

/** Normalize for comparison: regex escapes in a `re: true` needle, curly quotes, dashes, whitespace. */
function norm(s) {
  return s
    .replace(/\\(.)|\\n/g, (_m, c) => (c === 'n' ? ' ' : c))
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Contiguous windows of the needle, >= MIN_WORDS words each, longest first (the first match wins). */
function windows(needle) {
  const words = needle.split(' ').filter(Boolean);
  const out = [];
  for (let len = words.length; len >= MIN_WORDS; len--) {
    for (let i = 0; i + len <= words.length; i++) out.push(words.slice(i, i + len).join(' '));
    if (out.length > 400) break; // a 60-word needle already produced hundreds; the longest came first
  }
  return out;
}

/** Read a file, or null. A gate that crashes on a missing file tells the next session nothing. */
function readSafe(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/** Parse the census file's row lines. A row line carries `id:` and `needle:`; the selftest plantings carry `plant:`. */
export function parseRows(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const id = (line.match(/\{\s*id:\s*'([A-Za-z0-9]+)'/) || [])[1];
    if (!id || /plant:/.test(line)) continue;
    const needle = (line.match(/needle:\s*'((?:[^'\\]|\\.)*)'/) || [])[1];
    if (needle === undefined) continue;
    rows.push({
      id,
      line,
      want: (line.match(/want:\s*'(present|absent)'/) || [])[1],
      kind: (line.match(/kind:\s*'([a-z]+)'/) || [])[1] || 'plain',
      route: (line.match(/route:\s*'([^']*)'/) || [])[1],
      author: (line.match(/author:\s*'([^']*)'/) || [])[1],
      declined: (line.match(/declined:\s*'([^']*)'/) || [])[1],
      needle,
      words: norm(needle).split(' ').filter(Boolean).length,
    });
  }
  return rows;
}

/** Resolve a dotted slot path like `turnout.value` inside the parsed content source. */
function slotValue(content, path) {
  let node = content;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object' || !(part in node)) return null;
    node = node[part];
  }
  return typeof node === 'string' ? node : null;
}

/**
 * The verdict: every prose row that wants a sentence present must name a real home for it.
 * Pure over text + the content source + a path-existence probe, so the selftest plants defects in the
 * census text without touching the tree.
 */
export function verdict(text, { content, fileExists }) {
  const findings = [];
  const rows = parseRows(text);
  const prose = rows.filter(
    (r) => r.want === 'present' && r.kind === 'plain' && r.words >= MIN_WORDS && !r.declined,
  );
  const cite = (id, msg) => findings.push({ rule: 'unsourced-census-row', id, msg });

  for (const r of prose) {
    const needle = norm(r.needle);
    const wins = windows(needle);
    const a = r.author;

    if (!a) {
      cite(
        r.id,
        `row ${r.id} makes ${r.route} say "${needle.slice(0, 60)}" for as long as the row stands and names no ` +
          "authority for it: add author: 'content:<slot>' | 'source:<file>' | 'generated:<file>' | 'D###'",
      );
      continue;
    }

    const slot = a.match(/^content:([A-Za-z0-9_.[\]]+)$/);
    const file = a.match(/^(source|generated):(src\/[^']+)$/);

    if (slot) {
      const v = slotValue(content, slot[1]);
      if (v === null) cite(r.id, `row ${r.id} cites content:${slot[1]} and src/content.json has no such slot`);
      else if (!wins.some((w) => norm(v).includes(w)))
        cite(r.id, `row ${r.id} cites content:${slot[1]} but that slot holds no ${MIN_WORDS}-word window of the row's string — a false citation`);
    } else if (file) {
      const [, form, path] = file;
      if (!fileExists(path)) cite(r.id, `row ${r.id} cites ${form}:${path} and that file does not exist`);
      else if (form === 'source') {
        const bodyRaw = readSafe(path);
        if (bodyRaw === null) cite(r.id, `row ${r.id} cites source:${path} but the file cannot be read`);
        else {
          const body = norm(bodyRaw);
          if (!wins.some((w) => body.includes(w)))
            cite(r.id, `row ${r.id} cites source:${path} but that file holds no ${MIN_WORDS}-word window of the row's string — a false citation`);
        }
      }
    } else if (!/^[DS]\d{3}$/.test(a)) {
      cite(r.id, `row ${r.id} has author: '${a}' — not one of content:<slot>, source:<src path>, generated:<src path>, D###/S###`);
    }
  }
  return { rows, prose, findings };
}

function runVerdict(text) {
  const raw = readSafe('src/content.json');
  if (raw === null) return { fatal: 'src/content.json cannot be read - the gate cannot check a content: citation without it' };
  try {
    return verdict(text, { content: JSON.parse(raw), fileExists: (p) => existsSync(join('.', p)) });
  } catch (e) {
    return { fatal: `src/content.json does not parse: ${e.message}` };
  }
}

/* ------------------------------------------------------------------ selftest */

/** Swap one field inside one row line, leaving every other row (and every planting) untouched. */
function editRow(id, fn) {
  return (t) =>
    t
      .split(/\r?\n/)
      .map((l) => (new RegExp(`\\{\\s*id: '${id}',`).test(l) && /needle:/.test(l) ? fn(l) : l))
      .join('\n');
}

const setAuthor = (v) => editRow('J2', (l) => l.replace(/author: '[^']*'/, `author: '${v}'`));

/** Each planting mutates the census text and names the finding the gate must produce. */
const PLANTINGS = [
  { name: 'a present prose row with author: removed', edit: editRow('J2', (l) => l.replace(/author: '[^']*',\s*/, '')), mustInclude: 'names no authority' },
  { name: 'a present prose row citing a slot that does not exist', edit: setAuthor('content:join.nothere'), mustInclude: 'has no such slot' },
  { name: 'a present prose row citing a file that does not exist', edit: setAuthor('source:src/pages/nope.astro'), mustInclude: 'that file does not exist' },
  { name: 'a present prose row citing a real file that does not hold the sentence', edit: setAuthor('source:src/pages/past.astro'), mustInclude: 'no 4-word window' },
  { name: "an author: value in none of the four forms", edit: setAuthor('because it reads well'), mustInclude: 'not one of content:<slot>' },
  { name: 'a generated: citation for a sentence the artifact composes', edit: setAuthor('generated:src/pages/chat.astro'), mustClean: ['J2'] },
  { name: 'a ruling citation as the authority', edit: setAuthor('D449'), mustClean: ['J2'] },
  { name: 'a content: citation whose slot exists but does not hold the sentence', edit: setAuthor('content:cost.value'), mustInclude: 'no 4-word window' },
  {
    // J3 wants a string present and carries `declined:` — the row states the ruling and the gates that hold the
    // stance, so it is exempt. The exemption must be real, so stripping it has to be seen.
    name: 'a declined present-row, stripped of the ruling it carries',
    edit: editRow('J3', (l) => l.replace(/, declined:.*$/, ' }')),
    mustInclude: 'names no authority',
  },
  { name: 'a declined present-row left alone', edit: editRow('J3', (l) => l.replace(/\{\s*id: 'J3',/, "{ id: 'J3', author: 'D409',")), mustClean: ['J3'] },
];

function selftest() {
  const src = readSafe(argPath || CENSUS);
  if (src === null) {
    console.log(`FAIL cannot read ${argPath || CENSUS}`);
    process.exit(1);
  }
  let fail = 0;
  const clean = runVerdict(src);
  if (clean.fatal) {
    console.log(`FAIL ${clean.fatal}`);
    process.exit(1);
  }
  if (clean.findings.length) {
    console.log(`FAIL clean control: ${clean.findings.length} finding(s) on an unmodified census`);
    for (const f of clean.findings) console.log(`  ${f.msg}`);
    fail++;
  } else {
    console.log(`ok   clean control: ${clean.prose.length} prose rows that want a sentence present, every one carries an author`);
  }
  for (const p of PLANTINGS) {
    const mutated = p.edit(src);
    if (mutated === src) {
      console.log(`FAIL ${p.name}: the planting found nothing to change - the case is dead`);
      fail++;
      continue;
    }
    const v = runVerdict(mutated);
    if (v.fatal) {
      console.log(`FAIL ${p.name}: ${v.fatal}`);
      fail++;
      continue;
    }
    if (p.mustClean) {
      const dirty = v.findings.filter((f) => p.mustClean.includes(f.id));
      if (dirty.length) {
        console.log(`FAIL ${p.name}: expected clean, got ${dirty.map((f) => f.msg).join('; ')}`);
        fail++;
      } else console.log(`ok   ${p.name}: accepted, as it must be`);
      continue;
    }
    const hit = v.findings.find((f) => f.msg.includes(p.mustInclude));
    if (hit) console.log(`ok   ${p.name}: names it - ${hit.msg.slice(0, 88)}`);
    else {
      const seen = v.findings.map((f) => `${f.id}: ${f.msg}`).join(' | ') || '(none)';
      console.log(`FAIL ${p.name}: planted and not seen. Findings: ${seen}`);
      fail++;
    }
  }
  console.log(`\nselftest: ${PLANTINGS.length + 1} cases, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

/* ------------------------------------------------------------------ main */
const text = readSafe(argPath || CENSUS);
if (text === null) {
  console.error(`check-census-rows: cannot read ${argPath || CENSUS}`);
  process.exit(1);
}

const result = runVerdict(text);
if (result.fatal) {
  console.error(`check-census-rows: ${result.fatal}`);
  process.exit(1);
}

if (SELFTEST) selftest();

const { rows, prose, findings } = result;
const declinedRows = rows.filter((r) => r.declined).length;
const authored = prose.filter((r) => r.author).length;
if (JSON_OUT) {
  console.log(JSON.stringify({ rows: rows.length, prose: prose.length, declinedRows, authored, findings }, null, 2));
} else {
  console.log(`census rows: ${rows.length} (${declinedRows} carry a ruling in declined: and are exempt); prose rows that want a sentence present: ${prose.length}; with author: ${authored}`);
  for (const f of findings) console.log(`  ${f.rule}  ${f.id}  ${f.msg}`);
  console.log(findings.length ? `\nFAIL ${findings.length} census row(s) assert a sentence with no named authority` : 'ok — every prose row that makes the site say a sentence names where it comes from');
}
process.exit(findings.length ? 1 : 0);
