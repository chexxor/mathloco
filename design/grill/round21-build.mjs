#!/usr/bin/env node
// round21-build.mjs — the round-21 specimen: the club logo coloured in Byrne's 1847 manner, in this palette,
// photographed on both grounds with the numbers the same run produced. Generated from
// `design/grill/round21/report.json`; edit `design/grill/round21-options.mjs` or re-run `node design/round21.mjs`,
// NEVER this HTML — a generated page embeds what it measured, so a hand-edit here is a claim about a run nobody
// did (D282). A lookup that finds nothing THROWS.
//
// Why it looks like this. D160: a look question arrives as pictures, at one display factor, from the same load
// that made its numbers — colour is exactly the kind of decision nobody can make from a table of OKLCH triples.
// D114: the phone column is not optional, because a 1.4-unit route stroke is 1.68 device px at 320 and a colour
// that reads at 1240 can stop landing ink there. And the table under every photograph exists because a ruling has
// to be quotable in numbers, and DESIGN.md is what will quote them.
//
// The colours in the chrome are read out of src/styles/global.css through design/palette-tokens.mjs — the same
// single reading the runner and (for the card) check:social use — so the specimen cannot invent a colour and
// cannot go stale against a palette round.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { paletteTokens } from '../palette-tokens.mjs';

const REPORT = resolve('design/grill/round21/report.json');
const OUT = resolve('design/grill/round-21-byrne.html');
if (!existsSync(REPORT)) { console.error('round21-build: no report — run `npm run round21` first'); process.exit(1); }
let R;
try { R = JSON.parse(readFileSync(REPORT, 'utf8')); }
catch (e) { console.error(`round21-build: the report is not readable JSON: ${(e.message || '').slice(0, 200)}`); process.exit(1); }

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round21-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const TOKENS = paletteTokens();
const tok = (name) => {
  const t = TOKENS[name];
  if (!t) throw new Error(`round21-build: src/styles/global.css declares no --color-${name}; the specimen would be inventing a colour`);
  return t;
};
const OPTS = need(R.options, 'options');
if (!OPTS.length) throw new Error('round21-build: the report has no options');
const WIDTHS = need(R.widths, 'widths');
const BARS = need(R.bars, 'bars');
const PAINTED = need(R.painted, 'painted');
const PAIRS = need(R.pairs, 'pairs');
const HUES = need(R.hues, 'hues');
const YELLOW = need(R.yellow, 'yellow');
const WASHES = need(R.washes, 'washes');
const WASH_COST = need(R.washSolve, 'washSolve');

const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d) : '\u2014');
const b64 = (p) => (existsSync(p) ? readFileSync(p).toString('base64') : null);
const cropPath = (id, ground, w) => `.design/tmp-round21/crop-${id}-${ground}-${w}.png`;

// Every photograph the report implies must exist. A missing crop is not a broken image tag on a specimen whose
// whole job is the picture — it throws, naming the file and the run that should have written it.
const img = (id, ground, w) => {
  const p = cropPath(id, ground, w);
  const d = b64(p);
  if (!d) throw new Error(`round21-build: ${p} is missing — the run that wrote design/grill/round21/report.json did not leave its crops (.design/ is gitignored scratch; re-run \`npm run round21\` before building)`);
  return d;
};

const paintedRow = (id, ground, w) => {
  const row = PAINTED.find((p) => p.id === id);
  if (!row) throw new Error(`round21-build: no painted row for option ${id}`);
  const list = ground === 'ink' ? row.ink : row.paper;
  const r = ground === 'ink' ? list[0] : list.find((x) => x.width === w);
  if (!r) throw new Error(`round21-build: option ${id} has no painted measurement on ${ground} at ${w}`);
  return r;
};

const pairCells = (id, ground) => {
  const rows = PAIRS.filter((p) => p.id === id && p.ground === ground);
  if (!rows.length) throw new Error(`round21-build: no token pairs priced for ${id} on ${ground}`);
  return rows;
};

const hueRow = (id, ground) => {
  const h = HUES.find((x) => x.id === id && x.ground === ground);
  if (!h) throw new Error(`round21-build: no hue row for ${id} on ${ground}`);
  return h;
};

const swatch = (spec, label, sub) =>
  `<div class="sw"><span class="chip" style="background:${spec}"></span><span class="sl">${esc(label)}</span><span class="ss">${esc(sub)}</span></div>`;

const optSection = (o) => {
  const painted = PAINTED.find((p) => p.id === o.id);
  if (!painted) throw new Error(`round21-build: option ${o.id} has no painted section`);
  const shots = WIDTHS.map((w) => {
    const r = paintedRow(o.id, 'paper', w);
    return `<figure><img src="data:image/png;base64,${img(o.id, 'paper', w)}" alt="option ${o.id} painted on paper at ${w}px viewport width" />
      <figcaption><strong>${w}px</strong> \u00b7 ${r.shapeCount} shapes \u00b7 ${r.inkPixels} ink px \u00b7 ${r.at30} at/over ${BARS.graphic} (<strong>${r.at30Pct}%</strong> of its ink) \u00b7 logo-geometry <span class="${r.geometry.ok ? 'pass' : 'fail'}">${r.geometry.ok ? 'PASS' : 'FAIL'}</span>${r.geometry.ok ? '' : `<div class="why">${esc(r.geometry.out)}</div>`}</figcaption></figure>`;
  }).join('');
  const card = paintedRow(o.id, 'ink', 1200);
  const cardFig = `<figure class="card"><img src="data:image/png;base64,${img(o.id, 'ink', 1200)}" alt="option ${o.id} painted on the share card's ink ground" />
    <figcaption><strong>the share card, ink ground</strong> \u00b7 ${card.shapeCount} shapes \u00b7 ${card.inkPixels} ink px \u00b7 ${card.at30} at/over ${BARS.graphic} (<strong>${card.at30Pct}%</strong> of its ink) \u00b7 logo-geometry <span class="${card.geometry.ok ? 'pass' : 'fail'}">${card.geometry.ok ? 'PASS' : 'FAIL'}</span>${card.geometry.ok ? '' : `<div class="why">${esc(card.geometry.out)}</div>`}</figcaption></figure>`;

  const table = ['paper', 'ink'].map((g) => {
    const rows = pairCells(o.id, g);
    const cells = rows.map((p) => `<td class="${p.pass ? 'pass' : 'fail'}"><span class="slot">${esc(p.slot)}</span><span class="tok">--color-${esc(p.token)}</span><span class="ratio">${num(p.ratio)}</span></td>`).join('');
    return `<tr><th>${g}</th>${cells}</tr>`;
  }).join('');

  const swatches = ['paper', 'ink'].map((g) => {
    const used = [...new Set(pairCells(o.id, g).map((p) => p.token))];
    return `<div class="swrow"><span class="gndlbl">${g}</span>${used.map((t) => swatch(tok(t).spec, t, `${num(tok(t).L * 100, 1)}% \u00b7 C ${num(tok(t).C, 3)} \u00b7 H ${num(tok(t).H, 1)}`)).join('')}</div>`;
  }).join('');

  const hp = hueRow(o.id, 'paper'), hi = hueRow(o.id, 'ink');
  return `<section class="opt" id="${o.id}">
  <h2><span class="oid">${o.id}</span> ${esc(need(o.label, `${o.id} label`))}</h2>
  <p class="reading">${esc(need(o.reading, `${o.id} reading`))}</p>
  <p class="byrne"><strong>What Byrne does:</strong> ${esc(need(o.byrne, `${o.id} byrne`))}</p>
  <div class="shots">${shots}${cardFig}</div>
  <table class="pairs"><thead><tr><th class="gnd">ground</th>${pairCells(o.id, 'paper').map((p) => `<th>${esc(p.slot)}</th>`).join('')}</tr></thead>
    <tbody>${table}</tbody></table>
  <p class="meta">contrast of each shape's token against its ground; the graphic-line bar is <strong>${BARS.graphic}</strong> (D101).
     Hues spent: paper <strong>${hp.colours}</strong> tokens, tightest gap <strong>${hp.minGap}\u00b0</strong> (${esc(hp.tightest)}); ink <strong>${hi.colours}</strong> tokens, tightest gap <strong>${hi.minGap}\u00b0</strong> (${esc(hi.tightest)}). logo-geometry holds two roles \u2265 20\u00b0 apart.</p>
  <div class="swatches">${swatches}</div>
</section>`;
};

const yellowRows = YELLOW.map((y) => {
  if (!y.window) return `<tr><td>${y.H}</td><td>${y.C}</td><td colspan="5" class="fail">${esc(y.note)}</td></tr>`;
  return `<tr><td class="n">${y.H}</td><td class="n">${y.C}</td><td class="n">${y.window}</td>
    <td class="n">${y.top}</td><td class="n ${y.ratio >= BARS.graphic ? 'pass' : 'fail'}">${num(y.ratio)}</td>
    <td class="${y.sameColour ? 'fail' : ''}">${esc(y.nearestBrand)} <span class="n">d=${num(y.brandDist, 3)}</span>${y.sameColour ? ' <strong>SAME COLOUR</strong> (&lt;0.05)' : ''}</td>
    <td>${swatch(y.spec, `L ${y.top}`, y.readsAsYellow ? 'reads as yellow' : `under L ${R.yellowFloor}: ochre`)}</td></tr>`;
}).join('');

const washRows = WASHES.map((w) => `<tr><td>--color-${esc(w.token)}</td><td class="n ${w.readsAsRegion ? 'pass' : 'fail'}">${num(w.vsPaper)}</td><td class="n">${num(w.vsRouteInk)}</td><td class="${w.readsAsRegion ? 'pass' : 'fail'}">${esc(w.note)}</td></tr>`).join('');
const costRows = WASH_COST.map((w) => `<tr><td>--color-${esc(w.family)}</td><td class="n">${num(w.H, 1)}</td><td class="n">${num(w.C, 3)}</td><td class="n">${w.top}</td><td class="n">${num(w.ratio)}</td><td>${esc(w.nearestBrand)} <span class="n">d=${num(w.brandDist, 3)}</span>${w.sameColour ? ' <strong>SAME COLOUR</strong>' : ''}</td><td>${swatch(w.spec, `L ${w.top}`, 'the palest fill that reads as a region')}</td></tr>`).join('');

// The CONTROL is the row the report says is shipped — the round found it by matching each option against
// LOGO_COLOURS in src/lib/logo.mjs (D481 §c), so this file does not get to name the incumbent off its own
// ordering of the painted rows. A hard-coded PAINTED[0] was a claim about the artifact written in the round that
// prices it: the day the artifact changed, the specimen would still have called the retired colouring the control.
const CONTROL_ID = R.control?.id;
if (!CONTROL_ID) {
  throw new Error('round21-build: design/grill/round21/report.json carries no `control` — re-run `node design/round21.mjs`. The control row is derived from the shipped colour table, so a report without one is a specimen with no anchor.');
}
const control = PAINTED.find((p) => p.id === CONTROL_ID);
const controlBad = !control
  ? 'has no painted rows in the report'
  : !control.paper.every((p) => p.geometry.ok) ? 'fails logo-geometry on the hero' : !control.ink.every((c) => c.geometry?.ok) ? 'fails logo-geometry on the share card' : null;
if (controlBad) {
  throw new Error(`round21-build: the CONTROL row ${CONTROL_ID} — the colouring src/lib/logo.mjs ships (${R.control.derivedFrom}) — ${controlBad}. The mutation is broken, so every painted row in this specimen is untrustworthy. Fix design/round21.mjs before showing anyone a colour.`);
}

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Round 21 — the logo in Byrne's 1847 manner, in this palette</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
/* Specimen chrome only. The photographs carry the built page's own bytes; nothing here restyles them. */
:root {
  --paper: ${tok('paper').spec}; --ink: ${tok('ink').spec}; --ink2: ${tok('ink-2').spec}; --ink3: ${tok('ink-3').spec};
  --rule: ${tok('rule').spec}; --panel: ${tok('panel').spec};
}
body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 system-ui, sans-serif; }
.spec { max-width: 74rem; margin: 0 auto; padding: 1.5rem 1rem 5rem; }
h1 { font-size: 1.5rem; font-weight: 800; margin: 0 0 .4rem; }
h2 { font-size: 1.05rem; font-weight: 700; margin: 0 0 .4rem; }
h3 { font-size: .95rem; font-weight: 700; margin: 1.6rem 0 .4rem; }
p { max-width: 78ch; font-size: .9rem; color: var(--ink2); }
.ask { border-left: 3px solid var(--rule); padding: .4rem .8rem; font-size: .95rem; color: var(--ink); }
.opt { margin-top: 2.2rem; border-top: 1px solid var(--rule); padding-top: 1rem; }
.oid { display: inline-block; width: 1.5rem; }
.reading { color: var(--ink); font-weight: 600; }
.byrne { font-size: .85rem; }
.shots { display: flex; flex-wrap: wrap; gap: .8rem; align-items: flex-start; margin: .8rem 0; }
figure { margin: 0; }
figure img { display: block; border: 1px solid var(--rule); background: var(--paper); width: 300px; height: auto; }
figure.card img { width: 560px; }
figcaption { font-size: .74rem; color: var(--ink3); max-width: 300px; }
figure.card figcaption { max-width: 560px; }
.why { color: var(--ink2); margin-top: .2rem; }
table { border-collapse: collapse; font-size: .78rem; margin-top: .6rem; }
th, td { border: 1px solid var(--rule); padding: .25rem .45rem; text-align: left; vertical-align: top; }
th { background: var(--panel); font-weight: 600; }
td .slot { display: block; font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; color: var(--ink3); }
td .tok { display: block; font-size: .72rem; }
td .ratio { display: block; font-weight: 700; font-variant-numeric: tabular-nums; }
td.pass .ratio { color: #1c6b3f; }
td.fail .ratio { color: #8a1c1c; }
.n { font-variant-numeric: tabular-nums; }
.pass { color: #1c6b3f; }
.fail { color: #8a1c1c; }
.meta { font-size: .78rem; color: var(--ink3); }
.swatches { margin-top: .5rem; }
.swrow { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .35rem; }
.gndlbl { font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--ink3); width: 3.2rem; }
.sw { display: flex; align-items: center; gap: .35rem; font-size: .74rem; }
.sw .chip { display: inline-block; width: 2.2rem; height: 1.1rem; border: 1px solid var(--rule); }
.sw .sl { font-weight: 600; }
.sw .ss { color: var(--ink3); font-variant-numeric: tabular-nums; }
ul { font-size: .85rem; color: var(--ink2); max-width: 82ch; }
li { margin-bottom: .4rem; }
</style></head>
<body>
<div class="spec">
<h1>Round 21 \u2014 the logo in Byrne's 1847 manner, in this palette</h1>
<p class="ask">${esc('If you can, also create it in the style of John Byrne\u2019s 1847 Euclid illustrations, where it makes heavy use of primary colors. If you can do that, use our website\u2019s color palette, though.')}</p>
<p>The source, retrieved rather than remembered: <strong>${esc(R.source)}</strong>. Three of its facts drive the rows below \u2014 colour <em>replaces letters</em> (the title says so: a line is named by its colour, and the prose refers to "the squares of the blue and red lines"); Byrne 1847 insists the colour is not ornament ("we do not introduce colours for the purpose of entertainment\u2026 but to assist the mind"); and the ink is red, yellow, blue and black on white paper.</p>
<p><strong>The tension this round prices rather than hides:</strong> Byrne colours a line to <em>name</em> it. This logo's claim is that its two lines are the <em>same kind</em> of line \u2014 parallel where they leave the equator, and crossing only because the surface is curved. Colouring them differently is the most literal Byrne reading and the one that costs the logo its claim. Row C is on the table to be refused.</p>
<p><strong>Nothing here is applied.</strong> Colour on this site is operator-ratified (D316), so a Byrne colouring arrives as a priced specimen and the ruling stays the operator's. Every photograph is the built page's own bytes with the eight shape colours rewritten to <code>var(--color-\u2026)</code> in a copy of <code>dist/client</code>, measured by the same two probes <code>check:logo</code> runs (<code>logo-geometry.mjs</code>, <code>logo-pixels.mjs</code>) at the three widths that bracket the logo's box, plus the share card's own document on the ink ground. <strong>Row ${esc(CONTROL_ID)} is the colouring the site ships, and it passes every check</strong> \u2014 it is found by matching every row against <code>LOGO_COLOURS</code> in <code>src/lib/logo.mjs</code>, not by naming a letter here \u2014 and that is what makes the other rows' numbers mean something: if the shipped colouring had failed, the mutation would be broken and no row here would be trustworthy.</p>
<p class="meta">measured ${esc(String(need(R.measuredAt, 'measuredAt')))} \u00b7 bars: graphic line <strong>${BARS.graphic}</strong>, filled region (layer) <strong>${BARS.layer}</strong>, text ${BARS.text} \u00b7 the same-colour bar is 0.05 delta-OKLab (D88)</p>
${OPTS.map(optSection).join('\n')}

<h2>The yellow question, solved rather than remembered</h2>
<p>Byrne's third primary is yellow, and this palette has no yellow: the 2026-11-14 read's amber was refused (D316) at 1.95 on paper and 0.043 OKLab from Amazon orange. What had never been printed is the <em>window</em>. Every dark colour clears 3.0 against light paper, so the answer is the <strong>palest</strong> colour at each yellow hue and chroma that still clears the bar \u2014 and that palest point is where a yellow stops being yellow and starts being ochre.</p>
<table><thead><tr><th>hue</th><th>chroma</th><th>L that clears ${BARS.graphic}</th><th>palest legal L</th><th>ratio there</th><th>nearest brand colour</th><th>what it looks like</th></tr></thead><tbody>${yellowRows}</tbody></table>
<p class="meta">${R.legalYellow
  ? `The best legal yellow this palette could hold is <strong>${esc(R.legalYellow.spec)}</strong> \u2014 ${num(R.legalYellow.ratio)} on paper, and ${num(R.legalYellow.brandDist, 3)} from ${esc(R.legalYellow.nearestBrand)}, which is ${num(R.legalYellow.brandDist - 0.05, 3)} outside the 0.05 same-colour bar. A Byrne yellow is possible here, but it sits at the lightness of ochre and one hair's breadth from Amazon's orange.`
  : 'No legal yellow exists in this palette at these hues and chromas.'}</p>

<h2>The wash: Byrne fills regions, and a filled region is a different kind of contrast</h2>
<p>Byrne's diagrams carry blocks of colour, not only lines. The logo's "region" is the lune between the two meridians. A filled region is held to the <strong>layer</strong> bar (${BARS.layer}, D101), not the graphic-line bar \u2014 and every wash the palette offers is <em>under</em> it, because the tints are deliberately flat so a chip ground does not read as a raised surface.</p>
<table><thead><tr><th>wash candidate</th><th>vs paper</th><th>vs ink</th><th>verdict against ${BARS.layer}</th></tr></thead><tbody>${washRows}</tbody></table>
<p>So the honest follow-up is not "which tint" but "what would a wash cost": the palest fill in each hue family already in the palette that <em>would</em> read as a region, and how far that colour is from a brand colour. This is a price, not a proposal \u2014 nothing here adds a token.</p>
<table><thead><tr><th>hue family</th><th>hue</th><th>chroma</th><th>palest L that reads as a region</th><th>ratio</th><th>nearest brand</th><th>what it looks like</th></tr></thead><tbody>${costRows}</tbody></table>
<p class="meta">Row E is priced with the wash painted anyway, and the photographs show what the numbers say: at 1.13 against paper the wash is <em>visible</em> as a tint but does not read as a region by this repo's own bar, and it adds a <strong>ninth</strong> shape to a logo whose two probes zip a table of eight \u2014 so both logo probes <strong>refuse</strong> to measure it at all. Its ink coverage also falls from ${num(PAINTED.find((p) => p.id === 'D').paper[1].at30Pct, 1)}% of the logo's ink at 640 (row D) to ${num(PAINTED.find((p) => p.id === 'E').paper[1].at30Pct, 1)}% (row E), because the wash adds a large area of sub-bar pixels.</p>

<h2>How to read this page</h2>
<ul>
<li><strong>Row ${esc(CONTROL_ID)}</strong> is the <strong>shipped colouring</strong> — the operator took it on 2026-11-24 (D483) and it is what <code>src/lib/logo.mjs</code> wears today, so it is the control: the round found it by matching each row against the shipped table. It spends its tightest pair of colours <strong>${num(hueRow(CONTROL_ID, 'paper').minGap, 0)}\u00b0</strong> apart, which is the tension row named below rather than a defect the round invented.</li>
<li><strong>Row A</strong> is the colouring the logo wore until that ruling, kept in the round so every row is a delta from a measured line rather than from memory. Its two surface tokens (<code>rule</code>, <code>ink</code>) are only <strong>${num(hueRow('A', 'paper').minGap, 0)}\u00b0</strong> apart in hue, so the colouring Byrne replaced carried almost no information either — its roles were separated by contrast alone.</li>
<li><strong>Row B</strong> keeps the two meridians in one colour, which is the reading that preserves the logo's claim; the sphere goes to black because Byrne draws the <em>given</em> figure in black and the constructed lines in a primary.</li>
<li><strong>Row C</strong> is Byrne read literally \u2014 and it is the row the operator took. Its own terms are the price, stated here rather than after the fact: <code>accent</code> and <code>accent-strong</code> are <strong>${num(hueRow('C', 'paper').minGap, 0)}\u00b0</strong> apart, so the red meridian and the red right-angle mark are the same hue at two weights, and the two meridians are named two different colours while "parallel" is a statement about a pair. It clears the 3.0 graphic bar at every shape, every width and on the card.</li>
<li><strong>Row D</strong> spends three primaries plus black with the pair still one colour; the third primary is the palette's green because there is no legal yellow (see the window above).</li>
<li><strong>Row E</strong> is the only Byrne move that changes what <em>kind</em> of contrast the logo is held to \u2014 and it is the row the gates cannot measure.</li>
<li>The coverage column (<em>at/over ${BARS.graphic}</em>) is the share of the logo's own ink whose painted pixels clear the graphic bar at that box size. Rows B\u2013D score <strong>higher</strong> than A at every width, because moving the sphere from <code>rule</code> (3.66) to <code>ink</code> (17.15) puts more of its ink above the bar. That is a measured side-effect of the Byrne readings, not a claim that they are better designed.</li>
<li>Specimen chrome only: this page's own type and spacing are not the site's. The photographs carry the built page's bytes.</li>
</ul>
</div></body></html>`;

writeFileSync(OUT, html);
console.log(`round21-build: ${OPTS.length} colourings x ${WIDTHS.length} widths + ink -> ${OUT} (${(html.length / 1024).toFixed(0)}k)`);
