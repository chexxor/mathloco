#!/usr/bin/env node
// check-copy-contract.mjs - every section of a built page has a contract, and the contract's reader is the page's reader.
//
//   npm run check:copy-contract                 # the built pages against design/copy-contract.json
//   npm run check:copy-contract:selftest         # plant each defect this gate exists to catch; each must go red
//   node scripts/check-copy-contract.mjs --print-sections   # which sections the build carries, and which have no row
//   node scripts/check-copy-contract.mjs --print-hollow     # the worklist: shipped sentences carrying no reader-usable fact
//   node scripts/check-copy-contract.mjs --list-rules
//
// WHY A GATE AND NOT A NOTE. The communication reviews (rounds 6, 7, 8 - docs/communication-review-round-8-2026-11-18.md
// and docs/reply-to-the-communication-review-round-8-2026-11-18.md) answered a copy letter one line item at a time:
// each line became a census row priced by an instrument, then CLOSED (re-word it) or DECLINED (a ruling holds it).
// Every detector in that loop measures the SHAPE of a sentence - its word count, whether it repeats another
// section's words (check:content's near-duplicate rule and design/copy-duplicates.json), how many anchors it
// spends (design/link-ceiling.mjs), whether it has a source (check:content), whether it paints a date
// (check:dated-surfaces), whether an escape reaches the reader (check:escapes). None of them asks who the
// sentence is written FOR, or what a reader can DO once they have read it. So a sentence can pass every rule in
// verify while changing nothing a reader can do or believe - "Whether the room is your kind of room is not
// something a page can tell you." passes all of them, and it is the page's own states that make the site read as
// fluff. This gate is the missing detector: it fails on the CLASS, not on one line someone noticed.
//
// THE CONTRACT. A section is a function of three inputs, recorded in design/copy-contract.json: `audience`
// (which reader this section is written for), `goal` (what that reader can do, or believe, when they leave it),
// `style` (the voice register it is written in). One home, so a section's purpose is a fact the tree reads rather
// than a memory in whoever made the last line edit.
//
// WHAT IT DOES NOT DO, AND SAYS SO:
// - it does not rewrite copy. A hollow sentence is printed as a worklist; the fix is an edit to the component or
//   to the slot in src/content.json (D415: an operator-granted claim ships in a slot so the author can correct it
//   there). An invented replacement is D92's defect, not this gate's fix.
// - it does not decide the author's vision. vision.letter must exist; a letter that calls itself sent while still
//   carrying bracketed slots fails (DESIGN.md's Copy rule keeps brackets until a source exists). An UNSENT letter
//   prints and exits 0 - the ask is parked with its trigger in PLAN.md, not decided here.
// - it does not read schedule ROWS as sections. "<li data-surface=\"row\">" furniture is coupling, not copy
//   (D273: two rows printing the same sentence is one string rendered twice), so rows are counted and named and
//   never demand their own contract.
// - it does not read the nav or the exit band. Both are standing chrome on every page (D307, D407), so their copy
//   belongs to the band's own rule, not to five page contracts.
//
// The page read is design/dist-pages.mjs, the one reading every probe that asks what a page SAYS shares, so a
// section count and a sentence count cannot describe two different pages.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onePage, builtPageFiles } from '../design/dist-pages.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv.find((a) => a.startsWith('--root='))?.slice('--root='.length) ?? join(HERE, '..');
const CONTRACT = 'design/copy-contract.json';

/** ---------- the vocabulary the record defines ---------- */

function vocabulary(record) {
  return {
    audiences: Object.keys(record?.audiences ?? {}),
    styles: Object.keys(record?.styles ?? {}),
  };
}

/** ---------- the page read: route -> sections -> prose ---------- */

/** Spans of schedule-row furniture, matched by li nesting depth, not by a remembered count (D117's rule). */
function rowSpans(html) {
  const spans = [];
  const open = /<li\b[^>]*data-surface="row"[^>]*>/gi;
  let m = open.exec(html);
  while (m) {
    let depth = 1;
    const tag = /<(\/?)li\b[^>]*>/gi;
    tag.lastIndex = m.lastIndex;
    let t = tag.exec(html);
    while (t) {
      if (t[1] === '/') { depth--; if (depth === 0) break; }
      else depth++;
      t = tag.exec(html);
    }
    spans.push({ from: m.index, to: t ? t.index + t[0].length : html.length });
    open.lastIndex = spans[spans.length - 1].to;
    m = open.exec(html);
  }
  return spans;
}

/** Spans of anchor labels and of figure captions: both are furniture, not prose a reader reads as a sentence. */
function labelSpans(text) {
  const out = [...text.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map((m) => ({ from: m.index, to: m.index + m[0].length }));
  for (const m of text.matchAll(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/gi)) out.push({ from: m.index, to: m.index + m[0].length });
  return out;
}

/** One built route -> its headings, each with the body prose under it and the anchors beside that prose. */
function readPage(file, route) {
  const page = onePage(file, route);
  const rows = rowSpans(page.raw);
  const labels = labelSpans(page.text);
  const sections = new Map();
  for (const h of page.headings) {
    sections.set(h.text, { heading: h.text, row: rows.some((s) => h.at >= s.from && h.at < s.to), spans: labels, sentences: [], anchors: [] });
  }
  for (const s of page.sentences) {
    if (s.heading || s.zone !== 'body') continue;
    const sec = sections.get(s.section);
    if (!sec) continue;
    sec.sentences.push(s);
  }
  for (const a of page.anchors) {
    if (a.zone !== 'body') continue;
    const sec = sections.get(a.section);
    if (sec) sec.anchors.push(a);
  }
  return { route, file, sections: [...sections.values()] };
}

function readPages(distRoot) {
  return builtPageFiles(distRoot).map((p) => readPage(p.file, p.route));
}

/** ---------- the hollow detector: the falsifiable class ---------- */

/** The ratified nouns a reader can act on or believe: time, place, price, platform, thing to carry, action. */
const FACT_RE = new RegExp([
  '\\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|noon|midnight|morning|evening|afternoon)\\b',
  '\\b\\d{1,2}(:\\d{2})?\\s*(am|pm)\\b',
  '\\b(minneapolis|twin cities|saint paul|coffee shop|coffee|bakery|bakeries|brewery|breweries|cafe|market|table|lounge|chat)\\b',
  '\\b(meetup|discord|facebook|booking|eventbrite)\\b',
  '\\b(free|price|cost|rent|ticket)\\b',
  '\\b(social|socials|study session|study sessions)\\b',
  '\\b(textbook|textbooks|problem set|problem sets|project|projects|question|questions|notebook|notebook|paper|papers|proof|proofs|puzzle|puzzles|lecture|talk)\\b',
  '\\b(host|hosts|member|members|people|person|crowd|turnout|attendee|attendees|someone|somebody|anyone|nobody)\\b',
  '\\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|forty|hundred)\\b',
  '\\b(walk in|walked in|come|comes|coming|bring|brings|bringing|buy|bought|ask|asks|asked|sign up|signed up|signing up|join|joins|joined|following|follow|follows|pick|pick a|picked|read|reads|reading|write|write to|wrote|call|called|turn up|turned up|work through|find a table|show up|shows up)\\b',
].join('|'), 'i');

/** A sentence whose subject is the surface itself, or the machinery that writes it. */
const SURFACE_RE = /(^|\W)(this (page|site|section|list|band|card|figure)|the page|a page|this section|the list|the band|the feed|the summary|no summary|our bot|the bot|the drawing|the drawings|the plate|the plates|the caption|the site|this site|the channel|the record|the file)(\W|$|'s)/i;

/** A sentence whose whole point is that something is missing. */
const ABSENCE_RE = /\b(no |no,|none|nothing|never|not something|no longer|there is no|we have no|without)\b/i;

/** Normalise a sentence so a ruled signature survives a harvest's date stamp (D250's rule, same shape). */
function norm(s) {
  return s.toLowerCase()
    .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g, '<month>')
    .replace(/\b\d+(st|nd|rd|th)?\b/g, '<n>')
    .replace(/\b(yesterday|today|tomorrow)\b/g, '<age>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Prose worth judging: a section's body sentences, minus furniture spans, minus fragments. */
function prose(sentences, spans) {
  const inLabel = (at) => spans.some((s) => at >= s.from && at < s.to);
  const sentence = (s) => /^["'“““0-9A-Z(]/.test(s.text) && /[.!?]$/.test(s.text.trim());
  const ats = [...new Set(sentences.map((s) => s.at))].sort((a, b) => a - b);
  const nextAt = (at) => {
    for (const a of ats) if (a > at) return a;
    return Number.MAX_SAFE_INTEGER;
  };
  return sentences
    .filter((s) => s.text.split(/\s+/).length >= 5 && !inLabel(s.at) && sentence(s))
    .map((s) => ({ text: s.text, at: s.at, until: nextAt(s.at) }));
}

/** Does a sentence change what a reader can do or believe? fact, path, or nothing. */
function classify(sentence, anchors) {
  if (FACT_RE.test(sentence.text)) return 'fact';
  if (anchors.some((a) => a.at >= sentence.at && a.at < sentence.until)) return 'path';
  return null;
}

/** The worklist: sentences carrying no fact and no path out, minus the ones a ruling already owns. */
function hollow(sections, ruled) {
  const hits = [];
  const matched = ruled.map(() => false);
  for (const sec of sections) {
    for (const s of prose(sec.sentences, sec.spans ?? [])) {
      if (classify(s, sec.anchors)) continue;
      const n = norm(s.text);
      let owned = false;
      for (let i = 0; i < ruled.length; i++) {
        const sig = String(ruled[i].signature ?? '').toLowerCase().trim();
        if (sig && n.includes(sig)) { owned = true; matched[i] = true; break; }
      }
      if (owned) continue;
      hits.push({ route: sec.route, section: sec.heading, sentence: s.text, why: describe(n) });
    }
  }
  const stale = [];
  for (let i = 0; i < ruled.length; i++) {
    if (!matched[i]) stale.push(ruled[i]);
  }
  return { hits, stale };
}

function describe(n) {
  const kinds = [];
  if (SURFACE_RE.test(n)) kinds.push('its subject is the surface, or the machinery that writes it');
  if (ABSENCE_RE.test(n)) kinds.push('it says something is missing');
  if (!kinds.length) kinds.push('it names no place, time, price, person, platform, thing to carry, or action');
  return kinds.join('; ');
}

/** ---------- the verdict: pure over data, so the selftest can plant ---------- */

function verdict({ record, pages, letter }) {
  const findings = [];
  const vocab = vocabulary(record);
  const rows = (record?.pages ?? []).flatMap((p) => (p.sections ?? []).map((s) => ({ ...s, route: p.route, pageAudience: p.audience })));

  // R1 - the site's one vision must be a letter that exists, before any section claims to serve it.
  if (record?.vision?.letter && !letter) {
    findings.push(`vision-letter-missing - ${record.vision.letter} is named by ${CONTRACT} and is not on disk, so every contract row's audience is the delegate's guess rather than the author's`);
  }
  if (!record?.vision?.letter) {
    findings.push(`vision-letter-unset - ${CONTRACT} carries no vision.letter, so the site has one vision nobody wrote and every section's reader is unowned`);
  }

  // R2 - a letter shipped as the author's while still carrying bracketed slots is a shipped placeholder.
  if (letter && record?.vision?.status === 'sent') {
    const open = letter.match(/\[[^\]]{3,}\]/g) ?? [];
    if (open.length) {
      findings.push(`vision-letter-shipped-while-unfilled - ${record.vision.letter} says status: sent and still carries ${open.length} bracketed slot(s): ${open.slice(0, 3).map((x) => x.replace(/\s+/g, ' ')).join(' | ')} (DESIGN.md's Copy rule keeps brackets until a source exists, so an unfilled letter cannot stand in for the author's vision)`);
    }
  }

  for (const page of pages) {
    const have = rows.filter((r) => r.route === page.route);
    const want = page.sections.filter((s) => !s.row);
    // R3 - a section nobody decided a reader or a goal for.
    for (const s of want) {
      if (!have.some((r) => r.section === s.heading)) {
        findings.push(`section-uncontracted - ${page.route} carries the section "${s.heading}" and ${CONTRACT} has no row for it, so the copy under that heading is a line edit with no reader and no goal (write a row: audience, goal, style)`);
      }
    }
    // R4 - a row whose section the build no longer makes.
    for (const r of have) {
      if (!want.some((s) => s.heading === r.section)) {
        findings.push(`contract-stale - ${page.route} carries no section "${r.section}" and ${CONTRACT} still has a row for it, so the contract names a page the build does not make (move or delete the row with the section)`);
      }
    }
  }

  // R5 - a row is a function of all three inputs, and the page has one reader unless the shift is declared.
  for (const r of rows) {
    for (const field of ['audience', 'goal', 'style']) {
      const v = r[field];
      if (!v || !String(v).trim()) {
        findings.push(`contract-field-missing - the row ${r.route} / "${r.section}" carries no ${field}, so that section is not yet a function of (text style + target audience + section goal)`);
        continue;
      }
      if (field === 'audience' && !vocab.audiences.includes(String(v))) {
        findings.push(`contract-audience-unknown - the row ${r.route} / "${r.section}" names the reader "${v}", which ${CONTRACT}'s audiences vocabulary does not define (define the reader, or the row names one nobody declared)`);
      }
      if (field === 'style' && !vocab.styles.includes(String(v))) {
        findings.push(`contract-style-unknown - the row ${r.route} / "${r.section}" names the register "${v}", which ${CONTRACT}'s styles vocabulary does not define`);
      }
    }
    if (r.audience && r.pageAudience && r.pageAudience !== r.audience) {
      const why = String(r.shiftWhy ?? '').trim();
      if (why.split(/\s+/).length < 4) {
        findings.push(`audience-shift-undeclared - ${r.route} writes the page for "${r.pageAudience}" and the section "${r.section}" for "${r.audience}" with no shiftWhy, so one page speaks to two readers in one voice (say why the reader changes, or name one reader)`);
      }
    }
  }

  // R6 - the worklist of hollow sentences may not get longer, and a ruling that owns none is stale.
  const sections = pages.flatMap((p) => p.sections.filter((s) => !s.row).map((s) => ({ ...s, route: p.route })));
  const found = hollow(sections, record?.hollowRuled ?? []);
  const bar = Number(record?.hollow?.count ?? 0);
  if (found.hits.length > bar) {
    findings.push(`hollow-count-worse - the built pages carry ${found.hits.length} sentence(s) that carry no fact a reader can use and no path out, against ${CONTRACT}'s recorded ${bar}; the ${found.hits.length - bar} newer one(s) are: ${found.hits.slice(bar, bar + 5).map((f) => `"${f.sentence}" in ${f.route} / ${f.section}`).join(' | ')} (the fix: the sentence carries a place, a time, a price, a person, a path, or an action - or it is deleted)`);
  }
  for (const s of found.stale) {
    findings.push(`hollow-rule-stale - ${CONTRACT}'s hollowRuled entry "${s.signature}" matches no sentence on the built pages, so the exemption is a signature for a defect that is not there (the round-7 trap: a needle that never matched its defect is a green light that was never a detector)`);
  }
  return findings;
}

/** ---------- main ---------- */

const args = process.argv.slice(2);
const DIST = join(ROOT, 'dist/client');
const SELF = args.includes('--selftest');
const LIST = args.includes('--list-rules');
const SECTIONS = args.includes('--print-sections');
const HOLLOW = args.includes('--print-hollow');

if (!existsSync(join(ROOT, CONTRACT))) {
  console.log(`${CONTRACT} missing - the record of which reader each section is written for. Write it (audiences, styles, pages[].sections[] with audience/goal/style, hollow.count, vision.letter) before this gate has anything to check.`);
  process.exit(1);
}
const raw = readFileSync(join(ROOT, CONTRACT), 'utf8');
let record;
try {
  record = JSON.parse(raw);
} catch (err) {
  console.log(`${CONTRACT} does not parse: ${err.message} - the record is a gate input, so a syntax error here is the whole check: fix the JSON before the copy contract means anything.`);
  process.exit(1);
}
const pages = readPages(DIST);
const letter = record?.vision?.letter && existsSync(join(ROOT, record.vision.letter)) ? readFileSync(join(ROOT, record.vision.letter), 'utf8') : null;

if (LIST) {
  console.log('check-copy-contract rules:');
  for (const n of ['vision-letter-missing', 'vision-letter-unset', 'vision-letter-shipped-while-unfilled', 'section-uncontracted', 'contract-stale', 'contract-field-missing', 'contract-audience-unknown', 'contract-style-unknown', 'audience-shift-undeclared', 'hollow-count-worse', 'hollow-rule-stale']) console.log(`  ${n}`);
  process.exit(0);
}

if (SECTIONS) {
  const have = (record?.pages ?? []).flatMap((p) => (p.sections ?? []).map((s) => `${p.route} / ${s.section}`));
  for (const p of pages) {
    console.log(`${p.route} - ${p.sections.length} heading(s); ${p.sections.filter((s) => s.row).length} are schedule-row furniture (D273), the rest want a contract row`);
    for (const s of p.sections) {
      const judged = prose(s.sentences, s.spans ?? []);
      console.log(`  ${s.row ? 'ROW ' : 'BODY'} "${s.heading}" - ${judged.length} prose sentence(s), ${s.anchors.length} body anchor(s), ${have.includes(`${p.route} / ${s.heading}`) ? 'contracted' : 'NO CONTRACT'}`);
    }
  }
  process.exit(0);
}

const sections = pages.flatMap((p) => p.sections.filter((s) => !s.row).map((s) => ({ ...s, route: p.route })));
if (HOLLOW) {
  const found = hollow(sections, record?.hollowRuled ?? []);
  console.log(`hollow sentences on the built pages: ${found.hits.length} (bar: ${record?.hollow?.count ?? 'unset'})`);
  for (const f of found.hits) console.log(`  ${f.route} / ${f.section} - ${f.why} - "${f.sentence}"`);
  for (const s of found.stale) console.log(`  RULE "${s.signature}" matches nothing - stale exemption`);
  process.exit(0);
}

const findings = SELF ? null : verdict({ record, pages, letter });
if (SELF) {
  runSelftest({ record, pages, letter });
  process.exit(0);
}
if (findings.length) {
  console.log(`FAIL - ${findings.length} finding(s)`);
  for (const f of findings) console.log(`  - ${f}`);
  process.exit(1);
}
const contracted = (record?.pages ?? []).reduce((n, p) => n + (p.sections ?? []).length, 0);
const furniture = pages.reduce((n, p) => n + p.sections.filter((s) => s.row).length, 0);
const found = hollow(sections, record?.hollowRuled ?? []);
console.log(`check:copy-contract - ${pages.length} built page(s), ${sections.length} body section(s), ${contracted} contract rows, ${furniture} row headings exempt as furniture`);
const vocab = vocabulary(record);
console.log(`readers: ${vocab.audiences.join(', ')} - registers: ${vocab.styles.join(', ')}`);
console.log(`the author's vision: ${record?.vision?.letter ?? 'unset'} (status ${record?.vision?.status ?? 'unset'})`);
console.log(`hollow sentences: ${found.hits.length} against a recorded bar of ${record?.hollow?.count ?? 0}`);
for (const f of found.hits) console.log(`  - ${f.route} / ${f.section} ${f.why}: "${f.sentence}"`);
console.log(`PASS - every section of every built page has a contract naming a reader this record defines, and the hollow-sentence worklist has not got longer`);
process.exit(0);

/** ---------- the selftest: plant each defect the gate exists to catch, in memory ---------- */

function runSelftest(base) {
  const clone = (o) => structuredClone(o);
  const cases = [];

  function plant(name, rec, pgs, lt, want) {
    const got = verdict({ record: rec, pages: pgs, letter: lt });
    const fired = got.filter((f) => want.every((w) => f.startsWith(w)));
    cases.push({ name, fired: [...new Set(got.map((f) => f.split(' - ')[0]))], caught: fired.length > 0, want: want.join('|'), sample: got.find((f) => want.some((w) => f.startsWith(w))) ?? '' });
  }

  // the clean control first: the shipped tree, unchanged, must be clean
  const clean = verdict({ record: base.record, pages: base.pages, letter: base.letter });
  cases.push({ name: 'clean control - the shipped tree', fired: [...new Set(clean.map((f) => f.split(' - ')[0]))], caught: clean.length === 0, want: 'none', sample: clean[0] ?? '' });

  // 1 - a section with no row
  {
    const rec = clone(base.record);
    const victim = (rec.pages[0].sections ?? []).pop();
    plant('a contract row deleted (section-uncontracted)', rec, base.pages, base.letter, ['section-uncontracted']);
    void victim;
  }
  // 2 - a row whose section the build does not make
  {
    const rec = clone(base.record);
    if (rec.pages[0].sections?.length) rec.pages[0].sections[0].section = 'A Heading The Build Never Prints';
    plant('a row renamed away from the section (contract-stale)', rec, base.pages, base.letter, ['contract-stale']);
  }
  // 3 - a row missing one of the three inputs
  {
    const rec = clone(base.record);
    if (rec.pages[0].sections?.length) rec.pages[0].sections[0].goal = '';
    plant('a row that carries no goal (contract-field-missing)', rec, base.pages, base.letter, ['contract-field-missing']);
  }
  // 4 - a row naming a reader the vocabulary does not define
  {
    const rec = clone(base.record);
    if (rec.pages[0].sections?.length) rec.pages[0].sections[0].audience = 'the-person-who-is-probably-here-on-business';
    plant('a row naming a reader nobody declared (contract-audience-unknown)', rec, base.pages, base.letter, ['contract-audience-unknown']);
  }
  // 5 - the page's reader changed mid-page with no declared shift
  {
    const rec = clone(base.record);
    const p0 = rec.pages[0];
    if (p0.sections?.length > 1) { p0.sections[1].audience = 'a-returning-member'; delete p0.sections[1].shiftWhy; }
    plant('an undeclared audience shift inside one page (audience-shift-undeclared)', rec, base.pages, base.letter, ['audience-shift-undeclared']);
  }
  // 6 - the letter shipped as the author's while a slot is still bracketed
  {
    const rec = clone(base.record);
    rec.vision = { ...(rec.vision ?? {}), status: 'sent' };
    plant("an unfilled letter shipped as the author's vision (vision-letter-shipped-while-unfilled)", rec, base.pages, base.letter, ['vision-letter-shipped-while-unfilled']);
  }
  // 7 - the letter deleted outright
  {
    const rec = clone(base.record);
    rec.vision = { ...(rec.vision ?? {}), letter: 'docs/' + 'the-letter-does-not-exist' + '.md' };
    plant('the vision letter missing (vision-letter-missing)', rec, base.pages, null, ['vision-letter-missing']);
  }
  // 8 - a hollow sentence added to a contracted section: the worklist gets longer
  {
    const pgs = clone(base.pages);
    const at = 1e9;
    const target = pgs.flatMap((p) => p.sections.filter((s) => !s.row)).find((s) => s.sentences.length);
    const before = hollow(pgs.flatMap((p) => p.sections.filter((s) => !s.row).map((s) => ({ ...s, route: p.route }))), base.record?.hollowRuled ?? []).hits.length;
    target.sentences.push({ at, text: 'This page also explains what it is not for, and the list of what it holds changes.' });
    const after = hollow(pgs.flatMap((p) => p.sections.filter((s) => !s.row).map((s) => ({ ...s, route: p.route }))), base.record?.hollowRuled ?? []).hits.length;
    plant('a hollow sentence nobody registered (hollow-count-worse)', base.record, pgs, base.letter, ['hollow-count-worse']);
    cases[cases.length - 1].sample += ` (count ${before} -> ${after})`;
  }
  // 9 - an exemption whose needle matches nothing: the round-7 trap
  {
    const rec = clone(base.record);
    rec.hollowRuled = [...(rec.hollowRuled ?? []), { signature: 'a signature for a sentence that is on no page', ruled: 'the planted exemption, not a real ruling', why: 'planted by the selftest' }];
    plant('an exemption whose needle matches no sentence (hollow-rule-stale)', rec, base.pages, base.letter, ['hollow-rule-stale']);
  }

  console.log('check:copy-contract:selftest - each planting must produce its named finding; the control must be clean');
  let bad = 0;
  for (const c of cases) {
    const ok = c.caught;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'MISS'} ${c.name} - wanted ${c.want}${c.fired.length ? `, fired ${c.fired.join(', ')}` : ', nothing fired'}${c.sample ? ` :: ${c.sample.slice(0, 160)}` : ''}`);
  }
  console.log(`${cases.length - bad} of ${cases.length} cases ok`);
  process.exit(bad ? 1 : 0);
}
