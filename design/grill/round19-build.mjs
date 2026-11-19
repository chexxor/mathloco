#!/usr/bin/env node
// round19-build.mjs — the round-19 specimen: every treatment of the home page's date, photographed at three
// widths, with the numbers the same loads produced. Generated from `design/grill/round19/report.json`; edit the
// report or `design/grill/round19-options.mjs`, NEVER this HTML — a generated page embeds the numbers it measured,
// so a hand-edit is a claim about a build nobody ran. A lookup that finds nothing THROWS.
//
// D160 is the reason this file looks the way it does: a look question arrives as pictures, at one display factor,
// from the same load that made its numbers — the operator chooses by looking, and the table under the photographs
// exists because a ruling has to be able to quote a number, and DESIGN.md is what will quote it. D161 is the
// reason the phone columns are not optional: a desktop delta is a lie about the phone, and D114 makes 320
// mandatory because the nav row runs out of box there before the copy does.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORT = resolve('design/grill/round19/report.json');
const OUT = resolve('design/grill/round-19-freshness.html');
if (!existsSync(REPORT)) { console.error('round19-build: no report — run `npm run round19` first'); process.exit(1); }
let R;
try { R = JSON.parse(readFileSync(REPORT, 'utf8')); }
catch (e) { console.error(`round19-build: the report is not readable JSON: ${(e.message || '').slice(0, 200)}`); process.exit(1); }

const THEMED = readFileSync(resolve('src/styles/global.css'), 'utf8');
const tok = (name) => {
  const m = THEMED.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`round19-build: --color-${name} is not in the token block — the specimen would be inventing a colour`);
  return m[1].trim();
};
const C = {
  paper: tok('paper'), panel: tok('panel'), ink: tok('ink'), ink2: tok('ink-2'), ink3: tok('ink-3'),
  rule: tok('rule'), tint: tok('tint'), accent: tok('accent'),
};

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round19-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const OPTS = need(R.options, 'options');
if (!OPTS.length) throw new Error('round19-build: the report has no options');
const WIDTHS = need(R.widths, 'widths');
if (!WIDTHS.length) throw new Error('round19-build: the report records no widths');
const BASE = need(R.baseline, 'baseline');

const at = (o, w) => need(o.at[w], `${o.id} @${w}`);
const num = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d) : '\u2014');
const sgn = (v) => (typeof v === 'number' ? `${v > 0 ? '+' : ''}${v}` : '\u2014');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const b64 = (p) => (p && existsSync(p) ? readFileSync(p).toString('base64') : null);

const box = (b) => (b ? `${b.w}\u00d7${b.h}` : '\u2014');
const yOf = (b) => (b ? `${b.y}` : '\u2014');
// The BLOCK's own box is the honest delta: the document height repeats across loads of identical bytes (the
// baseline page came in 3925 and 3985 in one run), so a page-height delta smaller than that load spread is no
// evidence of a variant's cost, and the runner prints every sample rather than averaging one fluke in.
const pageOf = (j) => (j && !j.error ? j.doc?.height : null);
const samplesOf = (j) => (j && !j.error ? (j.pageHeights ?? []) : []);
// The spread, in one sentence the operator can quote: the SAME bytes came in two heights in one run, so the
// page height is load-to-load noise and only the block's own box is a cost. Generated, never hand-written.
const spreadSentence = () => {
  const per = WIDTHS.map((w) => ({ w, hs: samplesOf(at(BASE, w)), s: spreadOf(at(BASE, w)) }));
  const worst = per.reduce((a, b) => ((b.s ?? -1) > (a.s ?? -1) ? b : a), per[0]);
  if (!(worst.s > 0) || worst.hs.length < 2) return '';
  return ` The page height is <strong>load-to-load noise, not a variant's cost</strong>: the shipped baseline's identical bytes came in ${worst.hs.join('px and ')}px in one run, a ${worst.s}px spread at ${worst.w}, so a page-height delta under that spread is no evidence of anything \u2014 the number that prices a variant is the block's own box, in the column beside it.`;
};
const spreadOf = (j) => (j && !j.error ? j.pageSpread : null);
const blockOf = (j) => (j && !j.error ? j.hero?.h : null);
const delta = (o, w) => {
  const a = blockOf(at(o, w)), b = blockOf(at(BASE, w));
  if (a == null || b == null) return null;
  return a - b;
};
const cellWord = (j) => (j && j.error ? `UNMEASURED (${j.error})` : 'measured');

// The strip the operator reads first: what ships now, and what the rows below are deltas from.

const rows = OPTS.map((o) => {
  const cells = WIDTHS.map((w) => {
    const j = at(o, w);
    if (!j || j.error) {
      return `<div class="cell"><em>${esc(cellWord(j || { error: 'no row' }))}</em></div>`;
    }
    const img = b64(j.shot);
    const d = delta(o, w);
    return `<div class="cell">
      ${img ? `<img src="data:image/png;base64,${img}" width="560" alt="the page's top at ${w}px wide under treatment ${o.id}" />` : '<em>no screenshot</em>'}
      <div class="fig">@${w} · block ${box(j.hero)} at y=${yOf(j.hero)} (${sgn(d)}px vs baseline) · line ${box(j.stamp)} · page ${pageOf(j)}px over ${spreadOf(j) ?? 0}px of load spread</div>
    </div>`;
  }).join('');
  const figs = WIDTHS.map((w) => {
    const j = at(o, w);
    if (!j || j.error) return `<tr><td>${w}</td><td colspan="5">UNMEASURED</td></tr>`;
    return `<tr><td>${w}</td>
      <td class="n">${box(j.hero)}</td><td class="n">${sgn(delta(o, w))}</td>
      <td class="n">${j.stamp ? box(j.stamp) : 'absent'}</td>
      <td class="n">${j.chip && j.chip.display !== 'none' ? `${j.chip.w}\u00d7${j.chip.h}` : 'hidden below 380'}</td>
      <td class="n">${(j.navRows?.length ? `${j.navRows[j.navRows.length - 1].box.w}\u00d7${j.navRows[j.navRows.length - 1].box.h}` : null) ?? '\u2014'}</td>
      <td class="n">${j.navRight ?? '\u2014'} \u00b7 ${typeof j.navRight === 'number' && j.navRows?.length ? `${j.navRows[j.navRows.length - 1].box.x + j.navRows[j.navRows.length - 1].box.w - j.navRight >= 0 ? '+' : ''}${j.navRows[j.navRows.length - 1].box.x + j.navRows[j.navRows.length - 1].box.w - j.navRight}px` : '\u2014'}</td>
      <td class="n">${j.navWrap ?? '\u2014'}</td>
      <td class="n">${j.navLines ?? '\u2014'}</td>
      <td class="n">${pageOf(j)} \u00b1${spreadOf(j) ?? 0}</td></tr>`;
  }).join('');
  return `<section id="${o.id}" class="mt-4">
    <h2 class="mt-2">${esc(o.name)}</h2>
    <div class="cols ${WIDTHS.map(() => 'flex-1 min-w-0').join(' ')}">${cells}</div>
    <table class="mt-2"><thead><tr><th>width</th><th>date block</th><th>block vs baseline</th><th>register line</th><th>nav date chip</th><th>nav row box (outer)</th><th>nav row ink \u00b7 room in it</th><th>row wrap</th><th>lines of links</th><th>page px \u00b1 load spread</th></tr></thead>
    <tbody>${figs}</tbody></table>
    <p class="mt-1 text-body leading-prose">${esc(need(o.claim, `${o.id} claim`))}</p>
    <p class="mt-1 text-label text-ink-3">${o.ruled ? `ruled: ${esc(o.ruled)}` : 'not ruled yet — this row is on the table for the operator to choose'}</p>
  </section>`;
}).join('');

const contrastRows = Object.entries(need(R.contrasts, 'contrasts'))
  .filter(([k]) => k !== 'bar')
  .map(([k, v]) => {
    const bar = need(R.contrasts, 'contrasts').bar?.text ?? 4.5;
    return `<tr><td>${esc(k)}</td><td class="n">${num(v)}</td><td class="n">${bar}</td><td>${v >= bar ? 'passes' : 'fails'} the ratified text bar</td></tr>`;
  }).join('');

const chips = WIDTHS.map((w) => {
  const j = at(OPTS.find((o) => o.id === 'register-chip'), w) ?? at(BASE, w);
  if (!j) return `@${w} UNMEASURED`;
  const ink = j.navRight, lines = j.navLines, wrap = j.navWrap;
  const rows = j.navRows ?? [];
  // The OUTER row is the constraint: a nowrap flex row sizes its own box to its content, so the inner row's
  // room is 0 by construction and proves nothing. The outer row's box is what the page's content width gives
  // it, and ink past that box is an overflow a visitor would see.
  const bound = rows.length ? rows[rows.length - 1] : null;
  const room = (bound && typeof ink === 'number' && bound.box) ? bound.box.x + bound.box.w - ink : null;
  const fit = room == null ? 'not measured'
    : room >= 0 ? `holds one line of links with ${room}px of room left in the box the page gives it`
    : `runs ${-room}px past the box the page gives it, and the row ships ${wrap} — so an overflowing label set is a failed width probe, not a silent re-wrap`;
  return `@${w} the outer row's box is ${bound?.box?.w}\u00d7${bound?.box?.h} at x=${bound?.box?.x}, its ink reaches ${ink}px over ${lines} line(s) \u2014 ${fit}`;
}).join('; ');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Round 19 — how the home page's date says where it came from</title>
<style>
  body { background:${C.paper}; color:${C.ink}; font-family: system-ui, sans-serif; margin: 24px; }
  h1 { font-size: 26px; }
  h2 { font-size: 18px; }
  .mt-1, .mt-2, .mt-4 { margin-top: 8px; }
  .cols { display: flex; gap: 12px; }
  .cell { border: 1px solid ${C.rule}; padding: 8px; }
  img { display: block; }
  .fig { font-size: 12px; color:${C.ink2}; }
  table { border-collapse: collapse; font-size: 13px; width: 100%; }
  th { text-align: left; border: 1px solid ${C.rule}; font-size: 12px; }
  td { border: 1px solid ${C.rule}; padding: 3px 6px; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
</style></head>
<body>
<h1>Round 19 — the home page's date, and how loudly it says where it came from</h1>
<p class="mt-2 text-body">The operator's word was that the date on the home page does not read as maintained data. Three rulings make "dynamic" a claim this tree cannot make rather than one it declines: the schedule is a derived snapshot nobody fetches at request time (D73), every route is prerendered (design/README.md), and the motion tiers stop at 250ms with no pulse (D115, MS35's check:reduced-motion). What the page can honestly carry is the register it already runs — the feed's own read date, in D322's wording (D232's stamp). So this round prices WHERE that line sits and HOW LOUD the date is, in the two vocabularies the design system owns.</p>
<p class="mt-1 text-body leading-prose">Every row is a byte delta on the shipped page, photographed by the same Firefox load that produced its numbers, after the ratified faces settled. The screenshot is firefox's own and is taken at load, so it is the layout proof rather than a font proof (page-measure.mjs's note). Baseline row: <strong>${esc(BASE.name)}</strong>${R.baselineCarriesStamp ? ' — the shipped page with this item\u2019s register line removed' : ' — the shipped page as it stands'}. <strong>The photographs are the built page and carry the built sheet; this specimen page's own type and spacing are specimen-only</strong> — it loads no site CSS, so read colour and measure layout off the shots, not off the rows of prose beneath them. <strong>Every number on this page is a reading of \`design/grill/round19/report.json\`</strong> \u2014 written by \`npm run round19\` at ${esc(String(R.measuredAt ?? 'unrecorded'))}, re-rendered by \`node design/grill/round19-build.mjs\`; the record is the truth and this page is generated from it.${spreadSentence()}</p>
${rows}
<section id="contrast" class="mt-4">
  <h2>The colour half, as ratios</h2>
  <table><thead><tr><th>pair</th><th>ratio</th><th>bar</th><th>verdict</th></tr></thead><tbody>${contrastRows}</tbody></table>
  <p class="mt-1">Token arithmetic against the same oracle the contrast gate uses; check:contrast asserts pairs and does not adjudicate which one a date takes, so a colour row is the operator\u2019s to choose. The tint ground against paper is a layer pair, not a text pair: its own bar is BARS.layer.</p>
</section>
<section id="nav" class="mt-4">
  <h2>The nav's date chip, and the row it has to fit</h2>
  <p class="mt-1">${esc(chips)}. D311\u2019s number for this element is history; the row above is what this load measured. The chip is not hidden above 380 either way: the built sheet ships \"@media (width>=380px){.xs\\:inline{display:inline}}\" against --breakpoint-xs: 380px (src/styles/global.css:48), so what the chip column can change is the 320 floor and nothing above it. The row measured here is the flex row walked up from the Dates link, not the max-width wrapper the page's <nav> element is.</p>
</section>
<section id="notes" class="mt-4">
  <h2>How to read the table</h2>
  <ul>${(R.notes ?? []).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
</section>
</body></html>`;

writeFileSync(OUT, html);
console.log(`round19-build: ${OPTS.length} treatments x ${WIDTHS.length} widths -> ${OUT} (${(html.length / 1024).toFixed(0)}k)`);
const missing = OPTS.flatMap((o) => WIDTHS.filter((w) => { const j = at(o, w); return !j || j.error; }).map((w) => `${o.id} @${w}`));
if (missing.length) { console.log(`unmeasured: ${missing.join(', ')}`); }
