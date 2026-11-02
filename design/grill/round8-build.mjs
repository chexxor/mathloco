#!/usr/bin/env node
// round8-build.mjs — generate the round-8 type specimen from the ramp module, the token block and the
// site's own text. Run: node design/grill/round8-build.mjs
//
//   design/grill/round-8.html        the operator's preview (open it; this is where the choice happens)
//   design/grill/round-8-mark.html   the same mark question at candidate line weights, laid out for
//                                    pixel measurement (mark-pixels.mjs reads its screenshot + report)
//
// Why generated rather than hand-written (the design-grill skill requires a no-build HTML preview the
// operator opens directly): every number in the specimen has to come from the same source the measure
// script asserts against and the same source `apply` would write. A hand-written specimen drifts — the
// last one that was typed by hand is the reason `design/fonts/display-fit.json` had to be re-measured in
// the face the title actually renders in.
//
// Sources it reads, so the specimen cannot invent the system:
//   - src/styles/global.css   the colour roles and the shipped ramp (via round8-ramps.mjs)
//   - src/styles/fonts.css    the chrome @font-face body
//   - src/lib/brand-mark.mjs  the mark geometry, with candidate stroke widths layered on
//   - .design/render/linelength-_-1240.json  the REAL strings the landing page renders, so no specimen
//     text is invented (the design-grill rule: placeholder text hides lines that run too long)
import { readFileSync, writeFileSync } from 'node:fs';
import { MARK, MARK_COLOURS } from '../../src/lib/brand-mark.mjs';
import { candidates, shipped, STEPS } from './round8-ramps.mjs';

const need = (p) => { try { return readFileSync(p, 'utf8'); } catch { throw new Error(`round8-build needs ${p}`); } };

// ---- real text, taken from what the landing page actually rendered at 1240 (line-length.mjs wrote it)
const runsFile = '.design/render/linelength-_-1240.json';
let runs;
try { runs = JSON.parse(need(runsFile)).runs; }
catch { console.error(`${runsFile} missing — run: node design/line-length.mjs / --no-build  (the specimen quotes the site's own sentences, so the probe has to have run)`); process.exit(1); }
const pick = (tag, fsPx, minChars = 0) => {
  const r = runs.find((x) => x.tag === tag && x.fs === fsPx && x.chars >= minChars && !x.nested);
  if (!r) throw new Error(`no ${tag} run at ${fsPx} in ${runsFile} — the specimen's real text has to come from the built page`);
  return r.t;
};
const TEXT = {
  h1: pick('h1', '39.8px', 10),
  h2: pick('h2', '27.7px', 10),
  lede: pick('p', '19.2px', 90),
  lede2: runs.filter((x) => x.tag === 'p' && x.fs === '19.2px' && !x.nested && x.chars > 60)[1]?.t ?? pick('p', '19.2px', 60),
  body: pick('p', '16px', 90),
  body2: runs.filter((x) => x.tag === 'p' && x.fs === '16px' && !x.nested && x.chars > 60 && x.t !== pick('p', '16px', 90))[0]?.t ?? pick('p', '16px', 60),
  label: pick('a', '13.3px', 10),
  focus: pick('p', '19.2px', 40),
};

// ---- colour roles, read out of the token block (never re-typed)
const css = need('src/styles/global.css');
const colourLines = [...css.matchAll(/(--color-[a-z0-9-]+):\s*([^;/]+);/g)].map((m) => `  ${m[1]}: ${m[2].trim()};`);
const S = shipped();
const paperHex = (() => { const m = /--color-paper:\s*([^;]+);/.exec(css); return m ? m[1].trim() : '#fcfaf6'; })();

// ---- the chrome face, copied from src/styles/fonts.css (depth from design/grill/ is the same as from
// src/styles/, so the relative url is unchanged). PT Serif is copied from its package for the same reason.
const FACES = `
@font-face { font-family: 'Public Sans Variable'; font-style: normal; font-display: block; font-weight: 100 900;
  src: url('../../node_modules/@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2') format('woff2-variations'); }
@font-face { font-family: 'PT Serif'; font-style: normal; font-display: block; font-weight: 400;
  src: url('../../node_modules/@fontsource/pt-serif/files/pt-serif-latin-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'PT Serif'; font-style: normal; font-display: block; font-weight: 700;
  src: url('../../node_modules/@fontsource/pt-serif/files/pt-serif-latin-700-normal.woff2') format('woff2'); }`;

const CHROME = "'Public Sans Variable', sans-serif";
const CONTENT = "'PT Serif', Georgia, serif";

// ---- the mark, at candidate line weights. sw lives in viewBox units (240 wide), so what lands on the
// screen is sw x (box / 240): at the 320 hero box (measured 276px) that is x1.15, at the 1240 box
// (measured 372px) x1.55, on the share card (measured 420px) x1.75. `device: true` means the candidate
// asks for NON-SCALING strokes: the number is device px at every width, which is a different grammar
// (the mark would be the same weight on a phone and on a desktop instead of scaling with its box).
const MARK_SETS = [
  { name: 'M-A', why: 'as shipped', sw: { sphere: 0.9, route: 1.4, accent: 1.6 } },
  { name: 'M-B', why: 'sphere 0.9 -> 1.3 units: the phone-width sphere lands at 1.50px device instead of 1.03px', sw: { sphere: 1.3, route: 1.4, accent: 1.6 } },
  { name: 'M-C', why: 'everything +25% in viewBox units: the whole mark gets a heavier line at every width', sw: { sphere: 1.13, route: 1.75, accent: 2.0 } },
  { name: 'M-D', why: 'device-px strokes (non-scaling): the mark weighs the same at 320, 1240 and on the card', sw: { sphere: 1.4, route: 1.8, accent: 2.0 }, device: true },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const markSVG = (set, boxW, id) => {
  const scale = boxW / MARK.vbW;
  const paint = MARK_COLOURS.paper;
  const shapes = MARK.shapes.map((s) => {
    const nsc = set.device ? ' vector-effect="non-scaling-stroke"' : '';
    const sw = set.sw[s.role] ?? s.sw;
    const attrs = s.tag === 'circle' ? `cx="${s.cx}" cy="${s.cy}" r="${s.r}"` : `d="${s.d}"`;
    return `    <${s.tag} ${attrs} fill="none" stroke="var(--${'color'}-${paint[s.role]})" stroke-width="${sw}"${nsc} data-role="${s.role}" data-sw="${sw}"/>`;
  }).join('\n');
  const dot = MARK.dot;
  return `<svg data-mark="${id}" data-markset="${set.name}" data-box="${boxW}" viewBox="0 0 ${MARK.vbW} ${MARK.vbH}" width="${boxW}" height="${(MARK.vbH * scale).toFixed(1)}" role="img" aria-label="the club's mark, ${set.name}">
${shapes}
    <circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="var(--color-${paint[dot.role]})" stroke="none" data-role="${dot.role}" data-sw="0"/>
  </svg>`;
};

// ---- type blocks: one per candidate, styled only by that candidate's numbers
const typeBlock = (cand) => {
  const s = cand.sizes;
  const st = (k, face) => `font-family:${face};font-size:${s[k].size}px;line-height:${s[k].lead}px`;
  return `
<div class="cand" data-cand="${cand.name}">
  <div class="cand-head"><b>${cand.name}</b> ${esc(cand.title)} — <i>${esc(cand.intent)}</i>
    <span class="sizes">${STEPS.map((k) => `${k} ${s[k].size}/${s[k].lead}`).join(' · ')}</span></div>
  <div class="pair">
    <div class="wide" data-box="672">
      <h1 style="${st('display-2', CHROME)};font-weight:800">${esc(TEXT.h1)}</h1>
      <h2 style="${st('heading', CHROME)};font-weight:800">${esc(TEXT.h2)}</h2>
      <p style="${st('lede', CONTENT)}">${esc(TEXT.lede)}</p>
      <p style="${st('body', CONTENT)}">${esc(TEXT.body)}</p>
    </div>
    <div class="narrow" data-box="228">
      <p style="${st('body', CONTENT)}">${esc(TEXT.body)}</p>
      <p class="focus" style="${st('lede', CONTENT)}">${esc(TEXT.focus)}</p>
      <div class="ctrl primary" data-ctrl="primary" style="font-family:${CHROME};font-size:${s.label.size}px;line-height:${s.label.lead}px;font-weight:600">${esc(TEXT.label)}</div>
      <div class="ctrl secondary" data-ctrl="secondary" style="font-family:${CHROME};font-size:${s.label.size}px;line-height:${s.label.lead}px;font-weight:500">Community chat</div>
    </div>
  </div>
</div>`;
};

const noticeBlock = (cand) => {
  const s = cand.sizes;
  return `<div class="notice" data-notice="${cand.name}">
    <div class="word" style="font-family:${CHROME};font-size:${s.label.size}px;line-height:${s.label.lead}px;font-weight:600">Loading</div>
    <div class="title" style="font-family:${CHROME};font-size:${s.lede.size}px;line-height:${s.lede.lead}px;font-weight:600">Getting the channel summaries</div>
    <div class="body" style="font-family:${CONTENT};font-size:${s.body.size}px;line-height:${s.body.lead}px">The channel summaries have not loaded. They are written by our bot from recent channel history.</div>
  </div>`;
};

const capBlock = (cand) => {
  const s = cand.sizes;
  const caps = ['display-1', 'display-2', 'display-3', 'display-4'];
  return `<div class="caps" data-caps="${cand.name}">${caps.map((k) => `
    <div class="caprow">
      <div class="capbox" data-capbox="276" data-step="${k}"><span style="font-family:${CHROME};font-weight:800;font-size:${s[k].size}px;line-height:${s[k].lead}px">${esc(TEXT.h1)}</span></div>
      <div class="capbox" data-capbox="346" data-step="${k}"><span style="font-family:${CHROME};font-weight:800;font-size:${s[k].size}px;line-height:${s[k].lead}px">${esc(TEXT.h1)}</span></div>
    </div>`).join('')}
  </div>`;
};

const cands = candidates();

// The measured numbers, embedded so the operator chooses next to the measurements rather than next to my
// arithmetic. One round behind by construction: round8.mjs builds the specimen and then measures it, so
// re-run the builder after a measurement round to refresh these (`node design/grill/round8-build.mjs`).
function measuredSection() {
  let rep;
  try { rep = JSON.parse(readFileSync('design/grill/round8/report.json', 'utf8')); }
  catch { return `<h2 class="q">Measured numbers</h2><p class="note">Not measured yet — run <code>node design/round8.mjs</code>, then re-run <code>node design/grill/round8-build.mjs</code> to embed them here.</p>`; }
  const T = rep.type, band = (n) => n < 40 ? 'under 40 ch' : n > 75 ? 'OVER 75 ch' : 'in band';
  const prose = (c, col) => T.runs.filter((r) => r.name === c && r.col === col && r.tag === 'p')
    .map((r) => `${r.fs} ${r.maxLineChars}ch ${band(r.maxLineChars)} (${r.lines} lines)`).join('; ');
  const ctrl = (c) => T.controls.filter((x) => x.cand === c).map((x) => `${x.kind} ${x.h}px`).join(' ');
  const note = (c) => { const n = T.notices.find((x) => x.cand === c); return n ? `${n.h}px tall, body ${n.bodyLines} lines` : ''; };
  const cap = (c) => T.caps.filter((x) => x.cand === c && x.boxW === '276').map((x) => `${x.step} word ${x.maxWordPx}px ${x.fits ? 'fits' : 'FAILS'}`).join(' · ');
  const mrows = (rep.coverage || []).map((k) => `<tr><td>${k.set}</td><td>${k.box.w}</td><td>${k.shapes.map((s) => `${s.role} ${s.swDevice}px${s.nonScaling ? '*' : ''}`).join('<br>')}</td><td>${k.inkPct}%</td><td>${k.at30}</td><td>${(100 * k.at30 / k.inkPixels).toFixed(1)}%</td></tr>`).join('');
  return `
<h2 class="q">Measured (report ${esc(rep.measuredAt || '')} — re-run the builder after a measurement round to refresh)</h2>
<table class="m">
<tr><th></th><th>hero 672px box (prose)</th><th>card 228px box (prose)</th><th>controls</th><th>notice</th><th>display cap at 276px</th></tr>
${cands.map((c) => `<tr><td><b>${c.name}</b></td><td>${prose(c.name, '672')}</td><td>${prose(c.name, '228')}</td><td>${ctrl(c.name)}</td><td>${note(c.name)}</td><td>${cap(c.name)}</td></tr>`).join('')}
</table>
<p class="note">Capacity (box / advance) is an upper bound: CSS breaks at the last whole word, so the fitted
number is what the reader sees. At the shipped 16px the arithmetic and the browser agree within 1 character;
at the bigger candidates the slack grows to 8 because one un-fittable word costs more pixels.</p>
<table class="m">
<tr><th>mark set</th><th>box</th><th>device strokes</th><th>ink in box</th><th>px at/over 3.0</th><th>% of ink</th></tr>
${mrows}
</table>
<p class="note">* = non-scaling stroke (the same device width at every box). The 276px box is the measured
hero box at a 320 viewport, 372px at 1240; the share card draws this same table at a measured 420px box.</p>`;
}
const shell = (title, body, extraCss = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root {
${colourLines.join('\n')}
}
${FACES}
* { box-sizing: border-box; }
body { margin: 0; background: ${paperHex}; color: var(--color-ink); font-family: ${CONTENT}; }
h1, h2, p { margin: 0 0 12px 0; }
.wrap { max-width: 1240px; margin: 0 auto; padding: 24px 16px 96px; }
h1.q { font-family: ${CHROME}; font-weight: 800; font-size: 27.7px; line-height: 36px; }
h2.q { font-family: ${CHROME}; font-weight: 800; font-size: 23px; line-height: 28px; margin-top: 32px; }
.note { font-family: ${CHROME}; font-size: 13.3px; line-height: 16px; color: var(--color-ink-2); max-width: 70ch; }
.cand, .caps, .notices { border: 0; padding: 16px 0; border-bottom: 1px solid var(--color-rule); }
.cand-head { font-family: ${CHROME}; font-size: 13.3px; line-height: 20px; margin-bottom: 12px; color: var(--color-ink-2); }
.cand-head .sizes { display: block; color: var(--color-ink-3); font-size: 12px; }
.pair { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
.wide { width: 100%; max-width: 672px; }
.narrow { width: 228px; flex: 0 0 auto; }
.ctrl { display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; }
.ctrl.primary { padding: 16px 32px; background: var(--color-ink); color: var(--color-band-text); }
.ctrl.secondary { padding: 12px 32px; background: ${paperHex}; color: var(--color-ink); box-shadow: inset 0 0 0 1px var(--color-rule); }
.notice { box-shadow: inset 0 0 0 1px var(--color-rule); border-radius: 6px; padding: 12px 16px; min-height: 80px; max-width: 346px; margin-bottom: 16px; }
.notice .word { text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
.notice .title { margin-bottom: 4px; }
.caprow { display: flex; gap: 16px; margin-bottom: 8px; }
.capbox { width: 276px; overflow: hidden; flex: 0 0 auto; }
.capbox[data-capbox="346"] { width: 346px; }
.capbox span { display: block; }
table.m { border-collapse: collapse; font-family: ${CHROME}; font-size: 13.3px; line-height: 18px; margin: 12px 0; }
table.m th, table.m td { border: 1px solid var(--color-rule); padding: 6px 8px; text-align: left; vertical-align: top; }
table.m th { font-weight: 600; }
.marks { display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start; }
.markcell { font-family: ${CHROME}; font-size: 12px; color: var(--color-ink-2); }
${extraCss}
</style></head><body><div class="wrap">
${body}
</div></body></html>`;

// ================= operator-facing specimen =================
const questions = `
<h2 class="q">What the measurements say before any option</h2>
<ol class="note">
  <li>Body copy on this site runs <b>29-38 characters per line</b> at every shipped width (measured:
    median 30.1 ch at 1240, 29.0 at 390, ~24 at 320; <code>node design/line-length.mjs</code>). That is
    <b>under</b> the 40-75 ch reading band, so nothing here blocks a size increase on line-length grounds —
    the site's lines are already short.</li>
  <li>The exception is at 1240: two <code>lede</code> paragraphs run <b>69-76 ch</b> across a 1164px box.
    Bigger type there runs further past the band unless the prose box gets a cap.</li>
  <li>"The serif reads smaller than the chrome" is <b>not</b> an x-height story on this pair: PT Serif
    x-height 0.50 em, Public Sans 0.52 em (4% apart, <code>design/fonts/metrics.json</code>). The serif is
    <i>narrower</i> (0.533 vs 0.612 em per average char), so it buys longer lines at the same size —
    a bump to the content step costs fewer characters than the same bump to a chrome step.</li>
  <li>Control heights are derived, not chosen: <code>height = line box + 2 x pad</code>, so a label change
    moves 48/40. Each option's control heights are printed under its buttons, and the specimen measures
    what actually landed.</li>
  <li>The display step has a measured cap rule. Where a candidate's display step cannot fit its longest
    word in the 276px phone box, the cap column flags it.</li>
</ol>

<h2 class="q">Q1. The ramp — four ways to be bigger, each shown in the faces the site actually renders</h2>
<p class="note">The wide column is the hero's 672px content box at 1240; the narrow column is the 228px card
box at 320. Same real sentences in every column, taken off the built landing page.</p>
${cands.map(typeBlock).join('\n')}

<h2 class="q">Q2. The notice (the island's pending state) at each ramp — D98's 48px one-line figure</h2>
<p class="note">min-height 80px, padding 12/16, word + title + two-line body. Bigger body type changes how
many lines the body takes inside the same box.</p>
${cands.map(noticeBlock).join('\n')}

<h2 class="q">Q3. The display cap at each ramp — the club name at every display step</h2>
<p class="note">Left box 276px (the measured hero box at a 320 viewport), right 346px (at 390). A step whose
longest word does not fit its box is a step the cap rule forbids below 375 without a cap.</p>
${cands.map(capBlock).join('\n')}
`;

writeFileSync('design/grill/round-8.html', shell(
  'Round 8 — the type ramp, and the mark line weight',
  `<h1 class="q">Round 8: bigger type, and the mark's line weight</h1>
<p class="note">Generated by <code>node design/grill/round8-build.mjs</code> from <code>round8-ramps.mjs</code>,
the <code>@theme</code> block, <code>src/lib/brand-mark.mjs</code>, and the sentences the built landing page
actually rendered. Numbers you read below are measured by <code>round8-measure.js</code> in the same browser
the gates use; the printed numbers are the specimen's own measurements, not the builder's guesses.</p>
<h2 class="q">Q4. The measure at wide widths — a cap, or leave the lines long</h2>
<p class="note">Measured on the shipped page: the two section intro paragraphs (<code>text-lede</code>) run
<b>69 and 76 characters</b> across a 1164px box at 1240 — over the reading band even today. Bigger type moves
them further over unless the box gets a cap. A cap of about 70 characters is ~660px at the candidate lede
size, which is what the hero column already is (672px). The narrow columns need nothing: at 320 the body
box is 228px and the line is 28 characters, which is short, not long.</p>

<h2 class="q">Q5. The mark's line weight — same round, because the card draws the same table</h2>
<p class="note">At the 320 hero box (measured 276px, scale 1.15) the sphere's 0.9-unit stroke lands at
<b>1.03px</b> and its pixels never clear the 3.0 graphic bar; the routes (1.61px) and the gold accents
(1.84px) do. The measured options below are drawn from <code>src/lib/brand-mark.mjs</code> with candidate
<code>sw</code>, and the coverage is counted from the pixels the specimen painted — not from my arithmetic.</p>
<div class="marks">
${MARK_SETS.map((set) => `
<div class="markcell">
  <div><b>${set.name}</b> — ${esc(set.why)}</div>
  ${markSVG(set, 276, `preview-${set.name}-276`)}
  ${markSVG(set, 372, `preview-${set.name}-372`)}
</div>`).join('')}
</div>

${questions}
${measuredSection()}`));

// ================= the mark's pixel specimen =================
// One mark per row, each with clean paper to its left, inside the first 2000px of a 1240-wide window,
// because page-measure's screenshot is the viewport and mark-pixels.mjs clusters the pixels inside the box
// the report names.
writeFileSync('design/grill/round-8-mark.html', shell(
  'Round 8 — mark line weights, for pixel measurement',
  `<h1 class="q">Mark line weights — measured, not looked at</h1>
${MARK_SETS.map((set) => `
<div class="markcell" data-markcell="${set.name}">
  <div>${set.name} — ${esc(set.why)}</div>
  ${markSVG(set, 276, `${set.name}-276`)}
  ${markSVG(set, 372, `${set.name}-372`)}
</div>`).join('\n')}`,
  // ONE mark per row, each with clean paper to its left, because mark-pixels.mjs samples the GROUND from
  // a 10px strip immediately beside the box: lay two marks out side by side and the strip for the right
  // hand one lands in the left hand one's ink, and that box then reports "no ink" (measured — the first
  // version of this specimen did exactly that and reported 0% coverage for every 372px box).
  `
.markcell { margin-bottom: 32px; padding-left: 28px; }
.markcell svg { display: block; margin: 8px 0 0; }`));

console.log(`wrote design/grill/round-8.html (${(cands.length)} ramps) and design/grill/round-8-mark.html (${MARK_SETS.length} mark weights)`);
console.log(`shipped ramp read from src/styles/global.css: ${STEPS.map((k) => `${k} ${S[k].size}/${S[k].lead}`).join(' · ')}`);
for (const c of cands) console.log(`${c.name}: controls primary ${c.controls.primary}px secondary ${c.controls.secondary}px`);
export { MARK_SETS };
