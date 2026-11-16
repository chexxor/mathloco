#!/usr/bin/env node
// communication-census.mjs — what the BUILT pages spend words on, and what they spend twice.
//
//   node design/communication-census.mjs              # census the dist that is on disk
//   node design/communication-census.mjs --json       # print the machine record instead of the table
//   CLAIM_BAR=0.28 node design/communication-census.mjs   # re-cluster at a looser bar
//
// Round 5 (communication). Reads `dist/client`, never `src/` — the visitor gets the artifact and every
// gate in `verify` reads the artifact, so the analysis and the gates have to describe one page.
//
// Per route it counts:
//   zones        — words the page spends on nav chrome, on the exit band, and on its own body. The nav
//                  and the band are standing cost on EVERY page; this is the number that says how much.
//   anchors      — every <a>: accessible words, href, internal/external, which zone it sits in.
//   claim groups — the page's sentences reduced to their salient words, then clustered across routes
//                  and inside a page. A cluster of size > 1 is ONE fact stated more than once.
//                  `check:content`'s near-duplicate rule needs a shared 4-word run, so it cannot see a
//                  paraphrase; a Jaccard bar on salient words can. The bar is printed, never hidden.
//   wayfinding   — body sentences that name a destination ("schedule", "chat", "ways in") the page
//                  also paints a link to. The medium places the link; the sentence restates the place.
//
// A claim needs >= MIN_SALIENT salient words to be a claim at all, so a page name ("Ways in") is not
// one. Both knobs are env vars so a reader can re-run the clustering at a different bar.
//
// The record lands in design/communication/report.json (tracked: round 5's prose cites it).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { builtPageFiles, onePage, localDay } from './dist-pages.mjs';

const ROOT = process.env.DIST || 'dist/client';
const OUT = process.env.OUT || 'design/communication/report.json';
const CLAIM_BAR = Number(process.env.CLAIM_BAR || 0.34);
const MIN_SALIENT = Number(process.env.MIN_SALIENT || 4);

const STOP = new Set(`a an the this that these those there they them it its of for to from in on and or is
are was were be been being do does did not no none very quite just with within without you your yours we
our us i me my mine he she one two more most other such as by into over under up down off than then when
where which who whom what how why if else all any each few little big small says said say tell told keep
kept could would should will shall may might must get got gotten put puts place places thing things
something everything anything someone anybody people person page site`
  .split(/\s+/));

const ROUTE_WORDS = ['schedule', 'dates', 'chat', 'join', 'ways in', 'calendar', 'subscribe', 'meetup', 'discord'];

// ---------------------------------------------------------------- the page reading
// Which routes exist, which file carries each, and what a page says at offset N all live in
// design/dist-pages.mjs, because design/communication-census.mjs (claims and anchors) and design/visitor-
// questions.mjs (answers) ask about one page in different units. A second copy of the zone logic is a second
// memory of the page, and the day the two disagree every number in the round-5 doc disagrees with itself.

function salient(s) {
  const words = s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(Boolean);
  return new Set(words.filter((w) => w.length >= 3 && !STOP.has(w)));
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

const pages = builtPageFiles(ROOT).map((p) => onePage(p.file, p.route));
if (!pages.length) throw new Error(`no built pages under ${ROOT} — run npm run build first`);

// ---------------------------------------------------------------- clusters
const claims = [];
for (const p of pages) for (const s of p.sentences) {
  const set = salient(s.text);
  if (set.size >= MIN_SALIENT) claims.push({ page: p.route, zone: s.zone, section: s.section, text: s.text, set });
}

const clusters = [];
for (const c of claims) {
  let hit = null;
  for (const g of clusters) {
    const best = Math.max(...g.members.map((x) => jaccard(x.set, c.set)));
    if (best >= CLAIM_BAR) { hit = { g, best }; break; }
  }
  if (hit) {
    hit.g.members.push(c);
    if (hit.best < hit.loosest) hit.loosest = hit.best;
  } else clusters.push({ members: [c], loosest: 1 });
}

const dup = clusters.filter((g) => g.members.length > 1).map((g) => {
  const perPage = {};
  for (const m of g.members) perPage[m.page] = (perPage[m.page] ?? 0) + 1;
  return {
    bar: CLAIM_BAR,
    weakestPair: g.loosest,
    fact: g.members.map((m) => ({ page: m.page, zone: m.zone, section: m.section, words: m.text })),
    routes: Object.keys(perPage),
    repeatedOnSamePage: Object.values(perPage).some((n) => n > 1),
  };
});
dup.sort((a, b) => (b.fact.length - a.fact.length) || a.routes[0].localeCompare(b.routes[0]));

// ---------------------------------------------------------------- wayfinding spend
const wayfinding = [];
for (const p of pages) {
  const labels = new Set(p.anchors.map((a) => a.label.toLowerCase().trim()));
  for (const s of p.sentences) {
    if (s.zone !== 'body') continue;
    const low = s.text.toLowerCase();
    const named = ROUTE_WORDS.filter((w) => low.includes(w));
    if (!named.length) continue;
    const linkNear = p.anchors.filter((a) => a.internal && Math.abs(a.at - s.at) < 400);
    if (!linkNear.length) continue;
    wayfinding.push({ page: p.route, section: s.section, words: s.text, named, hrefs: linkNear.map((a) => a.href), isLabelItself: labels.has(low) });
  }
}
const proseWayfinding = wayfinding.filter((w) => !w.isLabelItself);

// ---------------------------------------------------------------- report
const census = pages.map((p) => {
  const words = { 'nav-chrome': 0, 'exit-band': 0, body: 0 };
  for (const s of p.sentences) words[s.zone] += s.text.split(/\s+/).filter(Boolean).length;
  const anchors = { total: 0, internal: 0, external: 0, 'nav-chrome': 0, 'exit-band': 0, body: 0 };
  for (const a of p.anchors) {
    anchors.total++;
    anchors[a.internal ? 'internal' : 'external']++;
    anchors[a.zone]++;
  }
  const dest = new Map();
  for (const a of p.anchors) {
    const key = a.internal ? a.href : `ext:${new URL(a.href, 'https://x').hostname || a.href}`;
    const d = dest.get(key) ?? { href: key, n: 0, labels: [], zones: [] };
    d.n++;
    d.labels.push(a.label);
    d.zones.push(a.zone);
    dest.set(key, d);
  }
  const arrowAnchors = p.anchors.filter((a) => /\u2192|\u2190|\u2191/.test(a.label));
  return {
    route: p.route,
    bytes: p.raw.length,
    words,
    bodySentences: p.sentences.filter((s) => s.zone === 'body' && !s.heading).length,
    bodyWords: words.body,
    headings: p.headings.map((h) => h.text),
    anchors,
    anchorList: p.anchors.map((a) => ({ href: a.href, label: a.label, zone: a.zone })),
    destinations: [...dest.values()].sort((x, y) => y.n - x.n),
    arrowAnchors: arrowAnchors.map((a) => ({ href: a.href, label: a.label, internal: a.internal })),
    sentences: p.sentences.map((s) => ({ zone: s.zone, section: s.section, text: s.text, heading: s.heading === true })),
  };
});

const report = {
  measuredAt: localDay(),
  instrument: 'design/communication-census.mjs',
  artifact: ROOT,
  claimBar: CLAIM_BAR,
  minSalientWords: MIN_SALIENT,
  pages: census,
  duplicateClaims: dup,
  wayfindingProse: wayfinding,
  wayfindingProseCount: wayfinding.length,
  wayfindingProseReal: proseWayfinding.length,
};
report.measuredAt = localDay();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 1)}\n`);

// ---------------------------------------------------------------- printed table
function pct(n, of) { return of ? `${Math.round((1000 * n) / of) / 10}%` : '0%'; }

console.log(`\ncommunication census — ${ROOT}, measured ${report.measuredAt}, claim bar ${CLAIM_BAR} jaccard, >= ${MIN_SALIENT} salient words`);
for (const c of census) {
  console.log(`\n${c.route} — ${c.bytes} bytes, ${c.bodyWords} body words (${pct(c.bodyWords, c.words['nav-chrome'] + c.words['exit-band'] + c.words.body)} of the page's words), ${c.bodySentences} body sentences, ${c.anchors.total} anchors (${c.anchors.internal} internal / ${c.anchors.external} external)`);
  console.log(`  zones      nav chrome ${c.words['nav-chrome']}w · exit band ${c.words['exit-band']}w · body ${c.words.body}w`);
  console.log(`  headings   ${c.headings.join(' | ')}`);
  console.log(`  anchors    ${c.anchorList.map((a) => `${a.zone}:${a.label} -> ${a.href}`).join('\n             ')}`);
  const repeated = c.destinations.filter((d) => d.n > 1);
  console.log(`  tap spend    ${c.anchors.total} anchors -> ${c.destinations.length} destinations; ${repeated.length} of them painted more than once: ${repeated.map((d) => `${d.href} x${d.n} (${d.labels.join(' / ')})`).join(' | ')}`);
  console.log(`  arrows       ${c.arrowAnchors.length} anchor labels carry an arrow: ${c.arrowAnchors.map((a) => `${a.internal ? 'internal' : 'external'} "${a.label}"`).join(' | ')}`);
}

console.log(`\nduplicate claims (${dup.length}):`);
for (const d of dup) {
  console.log(`  ${d.fact.length} statements across ${d.routes.join(', ')} — weakest pair ${Math.round(d.weakestPair * 100) / 100}, same-page repeat ${d.repeatedOnSamePage ? 'yes' : 'no'}`);
  for (const f of d.fact) console.log(`    ${f.page} [${f.section}] ${f.words}`);
}

console.log(`\nwayfinding prose (${proseWayfinding.length} of ${wayfinding.length}): body sentences that name a destination and sit beside a link to it (isLabelItself = the "sentence" is the link's own words, which is not prose spending)`);
for (const w of proseWayfinding) console.log(`  ${w.page} [${w.section}] ${w.words} -- names ${w.named.join(', ')}; links ${w.hrefs.join(', ')}`);

console.log(`\nrecord written to ${OUT}`);

if (process.argv.includes('--dump')) {
  for (const c of census) {
    console.log(`\n=== ${c.route} ===`);
    for (const s of c.sentences) console.log(`  ${s.zone} [${s.section}] ${s.text}`);
  }
}
