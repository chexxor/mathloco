#!/usr/bin/env node
// round22-build.mjs — the round-22 specimen: Byrne FACE colourings of the club mark, priced on both grounds with
// the numbers the same run produced. Generated from `design/grill/round22/report.json`; edit
// `design/grill/round22-options.mjs` or re-run `node design/round22.mjs`, NEVER this HTML — a generated page embeds
// what it measured, so a hand-edit here is a claim about a run nobody did (D282). A lookup that finds nothing THROWS.
//
// Why it looks like this. D160: a look question arrives as pictures, at one display factor, from the same load that
// made its numbers — a region's colour is exactly the kind of decision nobody can make from a table of OKLCH
// triples, and this round is about regions. D114: the phone column is not optional, because a 1.4-unit route stroke
// is 1.68 device px at 320 and a fill that reads at 1240 can swallow the lines there. The table under every
// photograph exists because a ruling has to be quotable in numbers, and DESIGN.md is what will quote them.
//
// The colours in the chrome are read out of src/styles/global.css through design/palette-tokens.mjs — the same
// single reading the runner and check:social's palette-currency rule use — so the specimen cannot invent a colour
// and cannot go stale against a palette round.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { paletteTokens } from '../palette-tokens.mjs';
import { FACES } from '../mark-faces.mjs';

const REPORT = resolve('design/grill/round22/report.json');
const OUT = resolve('design/grill/round-22-faces.html');
if (!existsSync(REPORT)) { console.error('round22-build: no report — run `npm run round22` first'); process.exit(1); }
let R;
try { R = JSON.parse(readFileSync(REPORT, 'utf8')); }
catch (e) { console.error(`round22-build: the report is not readable JSON: ${(e.message || '').slice(0, 200)}`); process.exit(1); }

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round22-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const TOKENS = paletteTokens();
const tok = (name) => {
  const t = TOKENS[name];
  if (!t) throw new Error(`round22-build: src/styles/global.css declares no --color-${name}; the specimen would be inventing a colour`);
  return t;
};
const ROWS = need(R.rows, 'rows');
if (!ROWS.length) throw new Error('round22-build: the report has no rows');
const WIDTHS = need(R.widths, 'widths');
const BARS = need(R.bars, 'bars');
const PAINTED = need(R.painted, 'painted');
const AREAS = need(R.areas, 'areas');
const COVERAGE = need(R.coverage, 'coverage');
const SOLVE = need(R.faceSolve, 'faceSolve');
const CENSUS = need(R.census, 'census');
const TALLY = need(R.censusTally, 'censusTally');
const GEOM = need(R.faceGeometry, 'faceGeometry');
const SHAPE_PRICE = need(R.shapeCountPrice, 'shapeCountPrice');
const LINES = need(R.lines, 'lines');
if (!LINES.paper || !LINES.ink) throw new Error('round22-build: the report\'s `lines` must carry both grounds');

const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d) : '\u2014');
const b64 = (p) => (existsSync(p) ? readFileSync(p).toString('base64') : null);
const cropPath = (id, ground, w) => `.design/tmp-round22/crop-${id}-${ground}-${w}.png`;
const faceOf = (name) => {
  const f = FACES.find((x) => x.name === name);
  if (!f) throw new Error(`round22-build: design/mark-faces.mjs declares no face "${name}" — the report prices a region the geometry file does not bound`);
  return f;
};
const areaOf = (name) => {
  const a = AREAS.find((x) => x.name === name);
  if (!a) throw new Error(`round22-build: no area measured for face "${name}" — the round measures every face it prices`);
  return a;
};

// Every photograph the report implies must exist. A missing crop is not a broken image tag on a specimen whose
// whole job is the picture — it throws, naming the file and the run that should have written it.
const img = (id, ground, w) => {
  const p = cropPath(id, ground, w);
  const d = b64(p);
  if (!d) throw new Error(`round22-build: ${p} is missing — the run that wrote design/grill/round22/report.json did not leave its crops (.design/ is gitignored scratch; re-run \`npm run round22\` before building)`);
  return d;
};

const paintedRow = (id, ground, w) => {
  const row = PAINTED.find((p) => p.id === id);
  if (!row) throw new Error(`round22-build: no painted row for ${id}`);
  const list = ground === 'ink' ? row.ink : row.paper;
  if (!list || !list.length) throw new Error(`round22-build: ${id} has no painted measurement on ${ground} — the round measured nothing for it`);
  const r = ground === 'ink' ? list[0] : list.find((x) => x.width === w);
  if (!r) throw new Error(`round22-build: ${id} has no painted measurement on ${ground} at ${w}`);
  return r;
};
const cell = (r, ok) => `<span class="${ok ? 'pass' : 'fail'}">${ok ? 'PASS' : 'FAIL'}</span>`;

// ---------- the four price tables ----------
const areaRows = AREAS.map((a) => `<tr>
  <td><strong>${esc(a.name)}</strong><span class="sub">${esc(faceOf(a.name).where ?? '')}</span></td>
  <td class="n">${num(a.areaUnits, 1)}</td><td class="n">${num(a.pctOfDisc)}</td>
  <td class="n">${num(a.sphereAreaUnits, 1)}</td><td class="n">${num(a.sphericalFracPct)}</td>
  <td class="n">${num(a.foreshorten, 4)}</td><td>${esc(a.term)}</td></tr>`).join('');

const coverageRows = FACES.map((f) => {
  const cells = Object.entries(COVERAGE[f.name]).map(([slot, c]) =>
    `<td class="${c.frac >= 0.25 ? 'on' : 'off'}"><span class="slot">${esc(slot)}</span><span class="n">${num(c.frac, 3)}</span></td>`).join('');
  const over = Object.entries(COVERAGE[f.name]).filter(([, c]) => c.frac >= 0.25).map(([s]) => s);
  return `<tr><td><strong>${esc(f.name)}</strong></td>${cells}<td>${over.length ? esc(over.join(', ')) : '<em>none</em>'}</td></tr>`;
}).join('');

const censusRows = CENSUS.map((c) => `<tr><td>--color-${esc(c.token)}</td>
  <td class="n">${num(c.L * 100, 1)}% \u00b7 C ${num(c.C, 3)} \u00b7 H ${num(c.H, 1)}</td>
  <td class="n ${c.paper.readsAsRegion ? 'pass' : 'fail'}">${num(c.paper.vsGround)}</td>
  <td class="n ${c.ink.readsAsRegion ? 'pass' : 'fail'}">${num(c.ink.vsGround)}</td>
  <td class="${c.paper.readsAsRegion && c.ink.readsAsRegion ? 'both' : 'one'}">${
    c.paper.readsAsRegion && c.ink.readsAsRegion ? 'a region on both grounds'
      : c.paper.readsAsRegion ? 'a region only on paper'
      : c.ink.readsAsRegion ? 'a region only on ink' : 'reads as a chip, not a region'}</td></tr>`).join('');

const swatch = (spec, label, sub) =>
  `<div class="sw"><span class="chip" style="background:${spec}"></span><span class="sl">${esc(label)}</span><span class="ss">${esc(sub)}</span></div>`;

const windowTables = FACES.map((f) => {
  const blocks = ['paper', 'ink'].map((ground) => {
    const rep = SOLVE[f.name]?.[ground];
    if (!rep) throw new Error(`round22-build: face ${f.name} has no solve on ${ground}`);
    const rows = Object.entries(rep.rows).map(([name, s]) => {
      if (!s.band) return `<tr><td>--color-${esc(name)}</td><td class="n">${num(s.H, 1)}</td><td class="n">${num(s.C, 3)}</td><td colspan="6" class="fail">${esc(s.note)}</td></tr>`;
      return `<tr><td>--color-${esc(name)}</td>
        <td class="n">${num(s.H, 1)}</td><td class="n">${num(s.C, 3)}</td>
        <td class="n">${s.band.lo}\u2013${s.band.hi} <span class="sub">${s.band.n} legal L steps</span></td>
        <td>${swatch(s.spec, `L ${s.band.mid}`, s.reuses ? `reuses --color-${s.reuses} (d=${num(s.nearestTokenDist, 3)})` : `NEW token \u00b7 nearest existing --color-${s.nearestToken} d=${num(s.nearestTokenDist, 3)}`)}</td>
        <td class="n ${s.vsGround >= BARS.layer ? 'pass' : 'fail'}">${num(s.vsGround)}</td>
        <td class="n ${s.minLineOver >= BARS.graphic ? 'pass' : 'fail'}">${num(s.minLineOver)}</td>
        <td>${esc(s.nearestBrand)} <span class="n">d=${num(s.brandDist, 3)}</span>${s.sameAsBrand ? ' <strong>SAME COLOUR</strong> (&lt;0.05)' : ''}</td></tr>`;
    }).join('');
    return `<h4>${ground} \u2014 lines that must survive the fill: ${rep.over.length ? esc(rep.over.map((s) => `${s} = --color-${LINES[ground][s]}`).join(', ')) : '<em>none drawn over it</em>'}</h4>
      <table><thead><tr><th>hue family</th><th>hue</th><th>chroma</th><th>legal L window</th><th>the fill at the window mid</th><th>vs ${ground}</th><th>worst line over it</th><th>nearest brand colour</th></tr></thead><tbody>${rows}</tbody></table>`;
  }).join('');
  return `<h3>${esc(f.name)}</h3>${blocks}`;
}).join('');

const rowSection = (r) => {
  const painted = PAINTED.find((p) => p.id === r.id);
  if (!painted) throw new Error(`round22-build: row ${r.id} has no painted section`);
  const shots = WIDTHS.map((w) => {
    const p = paintedRow(r.id, 'paper', w);
    return `<figure><img src="data:image/png;base64,${img(r.id, 'paper', w)}" alt="row ${r.id} painted on paper at ${w}px viewport width" />
      <figcaption><strong>${w}px</strong> \u00b7 ${p.shapeCount} shapes \u00b7 ${p.inkPixels} ink px \u00b7 ${p.at30} at/over ${BARS.graphic} (<strong>${p.at30Pct}%</strong> of its ink) \u00b7 mark-geometry ${cell(p, p.geometry?.ok)} \u00b7 mark-pixels ${cell(p, p.pixels?.ok)}${p.geometry?.ok ? '' : `<div class="why">${esc(p.geometry.out)}</div>`}${p.pixels?.ok ? '' : `<div class="why">${esc(p.pixels.out)}</div>`}</figcaption></figure>`;
  }).join('');
  const c = paintedRow(r.id, 'ink', 1200);
  const cardFig = `<figure class="card"><img src="data:image/png;base64,${img(r.id, 'ink', 1200)}" alt="row ${r.id} painted on the share card's ink ground" />
    <figcaption><strong>the share card, ink ground</strong> \u00b7 ${c.shapeCount} shapes \u00b7 ${c.inkPixels} ink px \u00b7 ${c.at30} at/over ${BARS.graphic} (<strong>${c.at30Pct}%</strong> of its ink) \u00b7 mark-geometry ${cell(c, c.geometry?.ok)} \u00b7 mark-pixels ${cell(c, c.pixels?.ok)}${c.geometry?.ok ? '' : `<div class="why">${esc(c.geometry.out)}</div>`}${c.pixels?.ok ? '' : `<div class="why">${esc(c.pixels.out)}</div>`}</figcaption></figure>`;

  const fillsTable = ['paper', 'ink'].map((ground) => {
    const g = r.grounds[ground];
    if (!g) throw new Error(`round22-build: row ${r.id} has no ${ground} pricing`);
    if (!g.fills.length) return `<tr><th>${ground}</th><td colspan="5"><em>nothing filled — this is the control's line colouring only</em></td></tr>`;
    return `<tr><th>${ground}</th>${g.fills.map((f) => `<td>
      <span class="slot">${esc(f.face)} \u00b7 ${num(areaOf(f.face).pctOfDisc)}% of the visible face</span>
      <span class="tok">${f.reuses ? `--color-${f.reuses}` : `NEW \u2014 ${esc(f.family)} wash at L ${f.band.mid}`}</span>
      <span class="swinline">${swatch(f.spec, f.spec, `vs ${ground} ${num(f.vsGround)} \u00b7 worst line over it ${num(f.minLineOver)}`)}</span></td>`).join('')}</tr>`;
  }).join('');

  const gaps = ['paper', 'ink'].map((ground) => {
    const g = r.grounds[ground];
    if (!g.faceGap) return '';
    return `<li>${ground}: the two fills (${esc(g.faceGap.pair)}) are <strong>${num(g.faceGap.gap, 1)}\u00b0</strong> apart in hue, delta-OKLab <strong>${num(g.faceGap.labDist, 3)}</strong> \u2014 ${g.faceGap.distinctName ? 'two names, which is what Byrne\'s colour-as-name asks for' : `<strong>the same colour</strong> under the 0.05 bar (${g.faceGap.labDist}): one name doing the work of two`}</li>`;
  }).join('');

  return `<section class="opt" id="${r.id}">
  <h2><span class="oid">${r.id}</span>${r.control ? ' <span class="ctl">CONTROL</span>' : ''} ${esc(need(r.label, `${r.id} label`))}</h2>
  <p class="reading">${esc(need(r.reading, `${r.id} reading`))}</p>
  <p class="byrne"><strong>What Byrne does:</strong> ${esc(need(r.byrne, `${r.id} byrne`))}</p>
  <div class="shots">${shots}${cardFig}</div>
  <table class="fills"><thead><tr><th class="gnd">ground</th>${(r.grounds.paper.fills.length ? r.grounds.paper.fills : [null, null]).map(() => '<th>filled face</th>').join('')}</tr></thead><tbody>${fillsTable}</tbody></table>
  <p class="meta">tokens on the hero: <strong>${r.tokenCost.paper}</strong> distinct, <strong>${r.tokenCost.newOnPaper}</strong> new \u00b7 on the card: <strong>${r.tokenCost.ink}</strong> distinct, <strong>${r.tokenCost.newOnInk}</strong> new. Lines are row C's, imported from <code>src/lib/brand-mark.mjs</code>, unchanged in every row of this round.</p>
  ${gaps ? `<ul class="gaps">${gaps}</ul>` : ''}
</section>`;
};

// The shape-count price: the probes' own words, quoted out of the run that was refused, not paraphrased here.
const refusals = [...new Set(PAINTED.flatMap((p) => [
  ...p.paper.map((x) => (!x.geometry?.ok ? x.geometry?.out : null)),
  ...(p.ink ?? []).map((x) => (!x.geometry?.ok ? x.geometry?.out : null)),
]).filter(Boolean))];
const refusedIds = [...new Set(PAINTED.filter((p) => !p.paper.every((x) => x.geometry?.ok) || !(p.ink ?? []).every((x) => x.geometry?.ok)).map((p) => p.id))];

// The CONTROL is the row the report says is shipped — the round found it by matching the imported line maps against
// MARK_COLOURS in src/lib/brand-mark.mjs (D481 §c), so this file does not get to name the incumbent off its own
// ordering of the painted rows.
const CONTROL_ID = R.control?.id;
if (!CONTROL_ID) {
  throw new Error('round22-build: design/grill/round22/report.json carries no `control` — re-run `node design/round22.mjs`. The control row is derived from the shipped colour table, so a report without one is a specimen with no anchor.');
}
const control = PAINTED.find((p) => p.id === CONTROL_ID);
const controlBad = !control
  ? 'has no painted rows in the report'
  : !control.paper.every((p) => p.geometry?.ok) ? 'fails mark-geometry on the hero'
  : !(control.ink ?? []).every((c) => c.geometry?.ok) ? 'fails mark-geometry on the share card' : null;
if (controlBad) {
  throw new Error(`round22-build: the CONTROL row ${CONTROL_ID} — the colouring src/lib/brand-mark.mjs ships (${R.control.derivedFrom}) — ${controlBad}. The mutation is broken, so every face price in this specimen is untrustworthy. Fix design/round22.mjs before showing anyone a colour.`);
}

const covAt = (id, w) => {
  const p = paintedRow(id, 'paper', w);
  return num(p.at30Pct, 1);
};

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Round 22 \u2014 Byrne faces for the club mark: priced, not applied</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
/* Specimen chrome only. The photographs carry the built page's own bytes; nothing here restyles them. */
:root {
  --paper: ${tok('paper').spec}; --ink: ${tok('ink').spec}; --ink2: ${tok('ink-2').spec}; --ink3: ${tok('ink-3').spec};
  --rule: ${tok('rule').spec}; --panel: ${tok('panel').spec};
}
body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 system-ui, sans-serif; }
.spec { max-width: 78rem; margin: 0 auto; padding: 1.5rem 1rem 5rem; }
h1 { font-size: 1.5rem; font-weight: 800; margin: 0 0 .4rem; }
h2 { font-size: 1.1rem; font-weight: 700; margin: 1.6rem 0 .4rem; }
h3 { font-size: .95rem; font-weight: 700; margin: 1.2rem 0 .3rem; }
h4 { font-size: .82rem; font-weight: 600; margin: .7rem 0 .25rem; color: var(--ink2); }
p { max-width: 82ch; font-size: .9rem; color: var(--ink2); }
.ask { border-left: 3px solid var(--rule); padding: .4rem .8rem; font-size: .95rem; color: var(--ink); }
.opt { margin-top: 2.2rem; border-top: 1px solid var(--rule); padding-top: 1rem; }
.oid { display: inline-block; width: 1.8rem; }
.ctl { display: inline-block; font-size: .68rem; text-transform: uppercase; letter-spacing: .06em; border: 1px solid var(--rule); padding: 0 .35rem; margin-right: .4rem; color: var(--ink2); }
.reading { color: var(--ink); font-weight: 600; }
.byrne { font-size: .85rem; }
.shots { display: flex; flex-wrap: wrap; gap: .8rem; align-items: flex-start; margin: .8rem 0; }
figure { margin: 0; }
figure img { display: block; border: 1px solid var(--rule); background: var(--paper); width: 300px; height: auto; }
figure.card img { width: 560px; }
figcaption { font-size: .74rem; color: var(--ink3); max-width: 300px; }
figure.card figcaption { max-width: 560px; }
.why { color: var(--ink2); margin-top: .2rem; font-size: .72rem; }
table { border-collapse: collapse; font-size: .76rem; margin-top: .5rem; }
th, td { border: 1px solid var(--rule); padding: .25rem .45rem; text-align: left; vertical-align: top; }
th { background: var(--panel); font-weight: 600; }
td .slot { display: block; font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; color: var(--ink3); }
td .tok { display: block; font-size: .74rem; font-weight: 600; }
td.on { background: color-mix(in oklab, var(--rule) 22%, transparent); }
.n { font-variant-numeric: tabular-nums; }
.sub { display: block; font-size: .68rem; color: var(--ink3); }
.pass { color: #1c6b3f; font-weight: 700; }
.fail { color: #8a1c1c; font-weight: 700; }
.both { color: #1c6b3f; } .one { color: var(--ink2); }
.meta { font-size: .78rem; color: var(--ink3); }
.sw { display: flex; align-items: center; gap: .35rem; font-size: .72rem; }
.sw .chip { display: inline-block; width: 2.4rem; height: 1.1rem; border: 1px solid var(--rule); flex: none; }
.sw .sl { font-weight: 600; font-variant-numeric: tabular-nums; }
.sw .ss { color: var(--ink3); font-variant-numeric: tabular-nums; }
.swinline { margin-top: .3rem; }
.gaps { font-size: .8rem; color: var(--ink2); max-width: 84ch; margin: .4rem 0; }
ul { font-size: .85rem; color: var(--ink2); max-width: 86ch; }
li { margin-bottom: .4rem; }
blockquote { border-left: 3px solid var(--rule); margin: .5rem 0; padding: .4rem .8rem; font: .78rem/1.45 ui-monospace, monospace; color: var(--ink2); white-space: pre-wrap; }
</style></head>
<body>
<div class="spec">
<h1>Round 22 \u2014 Byrne faces for the club mark: priced, not applied</h1>
<p class="ask">${esc(need(R.ask, 'ask'))}</p>
<p>The source, retrieved rather than remembered: <strong>${esc(need(R.source, 'source'))}</strong>. What its own words license here is the second half of the ruling: Byrne names <em>regions</em> by colour exactly as he names lines — the prose speaks of "the squares of the blue and red lines" — and his fills are flat, which is why they print cheaply and why a palette tint is the wrong tool for one.</p>
<p><strong>Nothing here is applied.</strong> Colour on this site is operator-ratified (D316), so a face colouring arrives as a priced specimen and the pick stays the operator's. Every photograph is the built page's own bytes with the eight shape colours rewritten to <code>var(--color-\u2026)</code> and the filled region added, in a copy of <code>dist/client</code>, measured by the same two probes <code>check:mark</code> runs (<code>design/mark-geometry.mjs</code>, <code>design/mark-pixels.mjs</code>) at ${WIDTHS.join(' / ')} px plus the share card's own document at 1200\u00d7630. <strong>Row ${esc(CONTROL_ID)} is the colouring the site ships, with nothing filled, and it passes every check</strong> \u2014 found by matching the rows' line maps against <code>MARK_COLOURS</code> in <code>src/lib/brand-mark.mjs</code>, not by naming a letter here \u2014 so every other number below is a delta from a measured line.</p>
<p class="meta">measured ${esc(String(need(R.measuredAt, 'measuredAt')))} \u00b7 bars: filled region (layer) <strong>${BARS.layer}</strong>, graphic line <strong>${BARS.graphic}</strong> (D101) \u00b7 the same-colour bar is 0.05 delta-OKLab (D88) \u00b7 faces and their areas: <code>design/mark-faces.mjs</code> \u00b7 rows: <code>design/grill/round22-options.mjs</code></p>

<h2>1. Area: the faces this drawing actually bounds, measured twice</h2>
<p>A face has an area, and it is measured two ways: <strong>projected</strong> (dense sampling and a shoelace over a boundary built from the mark's own curves) and <strong>on the sphere</strong> this drawing implies (Girard's excess for the triangle between the meridians, $2\\cdot\\text{angle}\\cdot r^2$ for the lunes above and below the near equator arc). The two agree to under 2%, and the round refuses if they do not: a region named by a colour should at least be named by a geometry. The important sentence in this table is the last row's: filling "the sphere" and filling "the disc" are the same act.</p>
<table><thead><tr><th>face</th><th>projected u</th><th>% of visible face</th><th>on the sphere u</th><th>% of sphere</th><th>foreshortening</th><th>what it is on the sphere</th></tr></thead><tbody>${areaRows}</tbody></table>
<p class="meta">geometry read off the shipped table: r ${GEOM.r}, ring (${GEOM.cx},${GEOM.cy}), equator semi-minor ${GEOM.equatorSemiMinor}, the sphere's axis ${GEOM.axisOutOfScreenPlaneDeg}\u00b0 out of the screen plane (so ${GEOM.axisFromViewingDirectionDeg}\u00b0 from the viewing direction), pole angle ${GEOM.poleAngleDeg}\u00b0. Assertions <code>assertAreas</code> runs: disc = \u03c0r\u00b2; north + south tile the disc; lune \u2282 north \u2282 disc; every face foreshortens into (0,1]; the disc's foreshortening is 0.50 \u2014 all pass.</p>

<h2>2. Which lines sit on which face (sampled, not asserted)</h2>
<p>A fill changes the bar a line is held to <em>only where the line actually lies on the fill</em>. So each shape's own geometry is sampled and tested against each face's polygon \u2014 strictly inside, or within 1.2 viewBox units of its edge (half a 1.4-unit stroke plus slack). A fraction \u2265 0.25 counts as drawn on it, and the third price is that a line drawn on a fill owes that fill the graphic bar (${BARS.graphic}), not the page.</p>
<table><thead><tr><th>face</th>${Object.keys(COVERAGE[FACES[0].name]).map((s) => `<th>${esc(s)}</th>`).join('')}<th>lines over the fill</th></tr></thead><tbody>${coverageRows}</tbody></table>

<h2>3. Census: how many colours the palette already has read as a <em>region</em></h2>
<p>A filled area is a LAYER (1.35, D101), not a graphic line (3.0). This is the finding that changes the ask: <strong>${TALLY.paper} of ${TALLY.total}</strong> declared tokens clear the layer bar against paper, and <strong>${TALLY.ink} of ${TALLY.total}</strong> clear it against ink. On the card almost every colour the palette has already reads as a region; on paper the pale ones do not, and they are exactly the tokens named "tint" \u2014 ${esc(TALLY.paperFails.join(', '))}. Round 21's "every palette tint is under the layer bar" is true on paper and false on the card, so the face question is asymmetric by ground: a wash that reads on the hero is invisible on the card and a fill that reads on the card is a hole in the hero.</p>
<table><thead><tr><th>token</th><th>oklch</th><th>vs paper</th><th>vs ink</th><th>verdict against ${BARS.layer}</th></tr></thead><tbody>${censusRows}</tbody></table>

<h2>4. The two-bar window: what a legal face costs per hue family</h2>
<p>For every hue family this palette already declares, at that family's own chroma, the round solves the <strong>lightness window</strong> in which a fill (a) clears ${BARS.layer} against its ground and (b) leaves every line drawn over it at ${BARS.graphic} against the <em>fill</em>. The upper edge is set by the ground, the lower edge by the lightest line token over the face. The mid of that window is what each row paints below, because it is the point furthest from both bars.</p>
${windowTables}

<h2>5. The rows, painted</h2>
${ROWS.map(rowSection).join('\n')}

<h2>6. The shape-count price, in the probes' own words</h2>
<p>This mark's gates count shapes. <code>design/mark-geometry.mjs</code> zips the painted report against the table and accepts exactly <strong>${SHAPE_PRICE.acceptedReportLength}</strong> \u2014 the table's ${SHAPE_PRICE.tableShapes} plus the pole dot, which is painted but not in the table. A filled face is a ninth shape, and both mark probes refuse to measure it at all. ${refusedIds.length ? `Rows ${esc(refusedIds.join(', '))} were refused in this run:` : 'No row in this run was refused, because the runner plants the face for the pixel probe and reports the refusal rather than hiding it:'}</p>
${refusals.length ? refusals.map((q) => `<blockquote>${esc(q)}</blockquote>`).join('\n') : '<p class="meta">(no refusal text in this report \u2014 every row measured, so the price below is the standing rule rather than a fresh quote)</p>'}
<p><strong>What this means for the ruling.</strong> "The gates went red" and "the gates need re-ruling" are different decisions, and only the second is a design choice (D479: a gate is re-derived, never bypassed). Shipping a face therefore means a new shape role in <code>src/lib/brand-mark.mjs</code>'s table, and <code>check:mark</code> and <code>check:social</code> re-derived against it \u2014 which is a milestone, not a colour change. That is priced here so the choice is made with the cost on the table, not discovered after the pick.</p>

<h2>7. Coverage, the number that survives every row</h2>
<p>The <em>at/over ${BARS.graphic}</em> column is the share of the mark's own ink whose painted pixels clear the graphic bar at that box size. Row ${esc(CONTROL_ID)} is the baseline: <strong>${covAt(CONTROL_ID, 640)}%</strong> at 640. ${ROWS.filter((r) => r.id !== CONTROL_ID && paintedRow(r.id, 'paper', 640).at30Pct !== null).map((r) => `${r.id} ${covAt(r.id, 640)}%`).join(' \u00b7 ')}. A fill that reads as a region also adds a large area of sub-bar pixels, so coverage is where a "nicer" face can quietly make the mark's own lines less legible.</p>

<h2>8. How to read this page, and what the delegate recommends</h2>
<ul>
<li><strong>Row ${esc(CONTROL_ID)}</strong> is the shipped colouring with nothing filled \u2014 the control, and the only row the site's own gates can measure today without re-ruling them.</li>
<li><strong>Rows F1\u2013F5</strong> each fill one or two of the faces the drawing really bounds. F1 fills the spherical triangle between the two meridians (${num(areaOf('lune').pctOfDisc)}% of the visible face); F2 the south lune (${num(areaOf('south').pctOfDisc)}%); F3 the north lune (${num(areaOf('north').pctOfDisc)}%); F5 the near hemisphere, which <em>is</em> the disc (100%); F4 two disjoint regions, which is the literal Byrne sentence \u2014 two colours so the prose can point at either without a letter.</li>
<li><strong>The squeeze, stated plainly.</strong> A face has to be far enough from the ground to read as a region and far enough from the lightest line drawn on it to keep that line legible. The windows in \u00a74 are only a few tenths of a lightness wide, and their midpoints sit at ${num(Math.min(...FACES.flatMap((f) => ['paper', 'ink'].map((g) => SOLVE[f.name][g].rows ? Math.max(...Object.values(SOLVE[f.name][g].rows).filter((s) => s.band).map((s) => s.vsGround)) : 0)).filter((x) => Number.isFinite(x))), 2)} at their most ${'far'} from the ground. A legal Byrne wash here is a <em>quiet</em> region, not Byrne's saturated block: Byrne's flatness is what made his fills cheap to print, and this palette's flatness is what keeps a chip ground from reading as raised. Both are flat, for opposite reasons.</li>
<li><strong>What each row costs in tokens</strong>: every row re-uses row C's eight line colours unchanged, and adds ${Math.min(...ROWS.filter((r) => r.id !== CONTROL_ID).map((r) => r.tokenCost.newOnPaper))}\u2013${Math.max(...ROWS.filter((r) => r.id !== CONTROL_ID).map((r) => r.tokenCost.newOnPaper))} new hero token(s) and ${Math.min(...ROWS.filter((r) => r.id !== CONTROL_ID).map((r) => r.tokenCost.newOnInk))}\u2013${Math.max(...ROWS.filter((r) => r.id !== CONTROL_ID).map((r) => r.tokenCost.newOnInk))} on the card, unless the solve lands within 0.05 delta-OKLab of a token the palette already has, in which case the row re-uses it \u2014 printed per fill above.</li>
<li><strong>The delegate's ranked recommendation is not on this page.</strong> It belongs to the session report and <code>.notes/NEXT.md</code>, where it carries its pros, cons and the measurement that would change it; a specimen prices, it does not argue.</li>
<li>The measurement that would change the ranking: the operator's own eye on the photographs at ${WIDTHS[0]}px, where a 1.4-unit route stroke is 1.68 device px and a fill can swallow the lines it is supposed to name. Numbers price a region; they cannot decide which one the club's mark is.</li>
<li>Specimen chrome only: this page's own type and spacing are not the site's. The photographs carry the built page's bytes.</li>
</ul>
</div></body></html>`;

writeFileSync(OUT, html);
console.log(`round22-build: ${ROWS.length} face rows x ${WIDTHS.length} widths + ink -> ${OUT} (${(html.length / 1024).toFixed(0)}k)`);
