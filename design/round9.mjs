#!/usr/bin/env node
// round9.mjs — the COLOUR round: measure first, then ask.
//
//   node design/round9.mjs
//   node design/round9.mjs --window 320,2400
//
// Writes .design/tmp-color/round9/ (scratch screenshots) and design/grill/round9/report.json (the record a
// ruling cites), then rebuilds design/grill/round-9.html so the operator reads each choice next to the numbers
// measured off the very specimen they are looking at.
//
// Three measurements, because the round asks three different pixel questions:
//   CENSUS  how much colour a colour POLICY actually puts on screen — chromatic share, mean chroma, hue
//           families — per panel, off the screenshot, using the same thresholds as `npm run check:color`
//           (chroma >= 0.04, 30-degree bands), so a panel number and the live page's 3.8% are the same quantity
//   MARK    how much of the mark survives at the 3.0 graphic bar under each colouring, per ground, through the
//           existing design/mark-pixels.mjs probe
//   PAIRS   every planted contrast pair, off the browser's COMPUTED bytes — plus a cross-check that the bytes
//           the browser resolved for each token match the spec value, which is how an out-of-gamut candidate
//           stops being a guess
//
// Exit 1 if a planted pair misses its bar or a token's rendered bytes sit further than the same-colour threshold
// from its spec: either means the specimen is lying, and an operator choosing from a lying specimen is worse off
// than an operator choosing from none.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import {
  contrastBytes, oklchFromRgb, tripleToBytes, rgbTripleFromBytes, dist, BARS, SAME_COLOUR_BAR,
} from './grill/okcolor.mjs';
import { ROLES, WARM, THEME, CANDIDATES, themeSpec, paletteOptions, accentExtras, accentCandidates } from './grill/round9-palette.mjs';

const argv = process.argv.slice(2);
const flagAt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] ?? d : d; };
const WINDOW = flagAt('window', null);
const TMP = '.design/tmp-color/round9';
mkdirSync(TMP, { recursive: true });
mkdirSync('design/grill/round9', { recursive: true });

// page-measure prints one pretty-printed JSON object per POST (the probe may post a heartbeat and then the
// result), so take the LAST complete top-level object rather than the first brace pair in the stream.
const lastJson = (text) => {
  const lines = text.split('\n');
  let best = null;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] !== '{') continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (lines[j] !== '}') continue;
      try { best = JSON.parse(lines.slice(i, j + 1).join('\n')); } catch { /* not a JSON block; keep looking */ }
      i = j;
      break;
    }
  }
  if (!best) throw new Error(`no JSON block in output:\n${text.slice(0, 800)}`);
  return best;
};
const jrun = (args, label) => {
  let out;
  try {
    out = execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180000 });
  } catch (e) {
    console.error(String(e.stdout ?? '') + String(e.stderr ?? ''));
    throw new Error(`${label ?? args.join(' ')} failed`);
  }
  return lastJson(out);
};
const txt = (args, label) => {
  try { return execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000 }); }
  catch (e) { console.error(String(e.stdout ?? '') + String(e.stderr ?? '')); throw new Error(`${label ?? args.join(' ')} failed`); }
};

// ---------- 1. generate the specimens ----------
console.log(txt(['design/grill/round9-build.mjs'], 'round9-build').trim());

// ---------- 2. measure (two passes: firefox --screenshot captures the WINDOW, so ask how tall it has to be) ----
// A retry, not a retry-loop: the harness's POST channel is the flaky part (see round9-measure.js), and a
// measurement that arrives with no panels is a lost post, not an empty specimen. The specimen's own panel count
// is what the retry is checked against.
function measure(html, shot, w, h, expectPanels) {
  let last = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    last = measureOnce(html, shot, w, h);
    if (last.error) throw new Error(`${html}: page threw: ${last.error}`);
    if (((last.panels?.length ?? 0) + (last.marks?.length ?? 0)) >= expectPanels && last.facesLoaded) return last;
    console.error(`measure ${html}: attempt ${attempt} returned ${last.panels?.length ?? 0} panels, facesLoaded=${last.facesLoaded} — retrying`);
  }
  return last;
}
const measureOnce = (html, shot, w, h) => jrun(['design/grill/page-measure.mjs', html, 'design/grill/round9-measure.js', String(w), String(h), shot], `measure ${html}`);
// how many things the specimen is supposed to contain: panels, and drawn marks inside them
const panelCount = (html) => (readFileSync(html, 'utf8').match(/data-panel=|data-mark="/g) ?? []).length;
const [W0, H0] = (WINDOW ?? '1240,900').split(',').map(Number);
const CENSUS_HTML = 'design/grill/round-9-census.html';
const MARK_HTML = 'design/grill/round-9-mark.html';

const probeC = measure(CENSUS_HTML, `${TMP}/probe-census.png`, W0, 600, panelCount(CENSUS_HTML));
if (!probeC.facesLoaded) console.error('FATAL: webfonts did not load — panel heights would be fallback metrics and the census rows wrong');
const censusH = WINDOW ? H0 : Math.max(900, probeC.contentHeight + 8);
const census = measure(CENSUS_HTML, `${TMP}/census.png`, W0, censusH, probeC.panels.length);
if (census.dpr !== 1) throw new Error(`devicePixelRatio is ${census.dpr}, not 1 — the census counts screenshot pixels as CSS pixels, so a scaled shot silently multiplies every share`);
if (census.vw !== W0) console.error(`warning: viewport reported ${census.vw} css px for a requested ${W0}`);

// ---------- 3. census the painted pixels inside each panel ----------
const shot = await sharp(`${TMP}/census.png`).raw().toBuffer({ resolveWithObject: true });
const { width: imgW, height: imgH, channels: ch } = shot.info;
if (imgW !== W0 || imgH !== censusH) console.error(`note: shot is ${imgW}x${imgH} for a ${W0}x${censusH} window (fonts/scrollbars); panels below y=${imgH} census nothing`);
const rowBytes = imgW * ch;
const CHROMA_MIN = 0.04;   // the same bar `npm run check:color` uses, so the numbers compare
const BAND = 30;
// A second, harder bar, because the first one has a trap in it: `ink` is oklch(32% 0.045 152), so at chroma
// 0.04 EVERY anti-aliased glyph and the whole dark band counts as "colour". That measures ink, not colour.
// 0.08 sits above ink and every neutral in @theme, so the share under it is the colour a reader would call colour.
const STRONG_MIN = 0.08;
const SATURATION_MIN = 0.15;
function censusBox(b) {
  const x0 = Math.max(0, Math.min(Math.round(b.x), imgW - 1));
  const y0 = Math.max(0, Math.min(Math.round(b.y), imgH - 1));
  const x1 = Math.min(imgW, x0 + Math.round(b.w));
  const y1 = Math.min(imgH, y0 + Math.round(b.h));
  const bands = new Map(); const sat = new Map();
  let n = 0, chromaPx = 0, chromaSum = 0, strongPx = 0, faint = 0, white = 0, black = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const o = (y * imgW + x) * ch;
      const r = shot.data[o], g = shot.data[o + 1], bl = shot.data[o + 2];
      n += 1;
      const { L, C, h } = oklchFromRgb(r, g, bl);
      if (C >= CHROMA_MIN) {
        chromaPx += 1; chromaSum += C;
        const k = Math.floor(((h + 360) % 360) / BAND) * BAND;
        bands.set(k, (bands.get(k) ?? 0) + 1);
      } else if (C > 0.01) faint += 1;
      if (C >= STRONG_MIN) strongPx += 1;
      if (Math.min(r, g, bl) >= 245) white += 1;
      if (Math.max(r, g, bl) <= 12) black += 1;
      if (C >= SATURATION_MIN) { const k = `${r},${g},${bl}`; sat.set(k, (sat.get(k) ?? 0) + 1); }
    }
  }
  const pct = (v) => +((100 * v) / Math.max(1, n)).toFixed(2);
  return {
    px: n, chromaticPct: +((100 * chromaPx) / Math.max(1, n)).toFixed(1),
    strongPct: +((100 * strongPx) / Math.max(1, n)).toFixed(1),
    meanChroma: chromaPx ? +(chromaSum / chromaPx).toFixed(3) : 0,
    faintPct: pct(faint), whitePct: pct(white), blackPct: pct(black),
    // a family counts at >= 300 px, the same absolute floor `check:color` uses — a share threshold would hide
    // exactly the small deliberate splashes this question is about
    hueFamilies: [...bands.entries()].filter(([, c]) => c >= 300).length,
    bands: [...bands.entries()].filter(([, c]) => c >= 300).sort((a, b2) => b2[1] - a[1])
      .map(([k, c]) => ({ hueFrom: k, pct: pct(c) })),
    mostSaturated: [...sat.entries()].map(([k, count]) => {
      const [r, g, b] = k.split(',').map(Number); const c = oklchFromRgb(r, g, b);
      return { rgb: [r, g, b], px: count, chroma: +c.C.toFixed(3), hue: Math.round(c.h) };
    }).sort((a, b2) => b2.chroma - a.chroma || b2.px - a.px).slice(0, 3),
  };
}

// ---------- 4. every planted pair, off the bytes the browser would actually paint ----------
// The measure script reads each colour back out of a 1px canvas (render-measure.js's method), so the ratio is
// computed on gamut-mapped, quantised sRGB - the pixel - not on the author's oklch. This file then recomputes
// the same pair from the TOKEN it was planted with, and a disagreement over 0.1 gets reported: that gap is what
// gamut-clipping and 8-bit quantisation cost, and it is how a candidate that is legal in oklch but not on a
// screen gets caught before anyone rules on it.
const rgbBytes = (css) => { const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(css ?? ''); return m ? [+m[1], +m[2], +m[3]] : null; };
const pairs = [];
const surface = [];   // the specimen planted a different colour than its data-pair declares
for (const p of census.panels) for (const q of p.pairs) {
  if (!q.fgBytes || !q.bgBytes) continue;
  const ratio = +contrastBytes(q.fgBytes, q.bgBytes).toFixed(2);
  const bar = q.bar ?? (/graphic|marker|rule|rail|track|slot/i.test(q.label ?? '') ? BARS.graphic : BARS.text);
  const ft = themeSpec(q.fgToken), bt = themeSpec(q.bgToken);
  const specRatio = ft && bt ? +contrastBytes(tripleToBytes(ft), tripleToBytes(bt)).toFixed(2) : null;
  // Check each SIDE, not just the ratio. A ratio disagreement can mean gamut clipping or a mislabelled element;
  // this says which. Section 6 already proves the token itself round-trips, so a side that is more than
  // SAME_COLOUR_BAR away from its token means the element is simply not painted from that token — which is what
  // happened here (a pair claiming `ink on tint` on an element sitting on the page's paper), and it would have
  // been read as a palette failure.
  for (const [side, tok, name, painted] of [['fg', ft, q.fgToken, q.fgBytes], ['bg', bt, q.bgToken, q.bgBytes]]) {
    if (!tok) continue;
    const d = +dist(rgbTripleFromBytes(painted), rgbTripleFromBytes(tripleToBytes(tok))).toFixed(3);
    if (d >= SAME_COLOUR_BAR) surface.push({ panel: p.id, label: q.label, side, named: name, painted, want: tripleToBytes(tok), delta: d });
  }
  pairs.push({
    panel: p.id, label: q.label, ground: q.ground, slot: q.slot, fgToken: q.fgToken, bgToken: q.bgToken,
    fg: q.fgBytes, bg: q.bgBytes, ratio, bar, specRatio, pass: ratio >= bar,
    // the token math and the painted bytes are two independent computations of the same pair
    disagree: specRatio != null && Math.abs(specRatio - ratio) > 0.1 ? { painted: ratio, token: specRatio } : null,
  });
}

// ---------- 5. the mark, measured through the existing pixel probe, on both grounds ----------
const probeM = measure(MARK_HTML, `${TMP}/probe-mark.png`, W0, 600, panelCount(MARK_HTML));
const markH = WINDOW ? H0 : Math.max(900, probeM.contentHeight + 8);
const marks = measure(MARK_HTML, `${TMP}/mark.png`, W0, markH, probeM.marks.length);
// design/mark-pixels.mjs is the probe the mark gates grew out of, and the one that knows a stroke thinner than
// ~1.5 device px never contains a fully-covered pixel (D119) — which is exactly the question a two-colour mark
// raises. It takes boxes in its own shape, so adapt, and pad each one: it samples the GROUND from a strip just
// left of the box, and the specimen lays one mark per row with clean ground beside it (round 8: two marks side
// by side made the right-hand one's ground its neighbour's ink, and it reported "no ink").
const pxJson = `${TMP}/mark-boxes.json`;
writeFileSync(pxJson, JSON.stringify({
  marks: marks.marks.map((m) => ({
    name: m.name, set: m.set, x: m.x - 8, y: m.y - 8, w: m.w + 16, h: m.h + 16, scale: m.scale ?? 1,
    shapes: m.shapes.map((s) => ({ role: s.role, tag: s.tag, sw: s.sw, swDevice: s.swDevice, nonScaling: false })),
  })),
}, null, 2));
const markReport = [];
for (let i = 0; i < marks.marks.length; i += 1) {
  const m = marks.marks[i];
  const o = txt(['design/mark-pixels.mjs', `${TMP}/mark.png`, pxJson, String(i), '--json'], `mark-pixels ${m.name}`);
  const rec = JSON.parse(o.split('\n').filter((l) => l.startsWith('{')).pop());
  const g = /ground sampled beside it:\s*([\d,]+)/.exec(o);
  markReport.push({
    id: m.name, set: m.set, ground: m.ground, boxW: m.boxW, scale: m.scale,
    painted: m.shapes.map((s) => `${s.role}:${s.token}`).join(' '),
    strokes: m.shapes.map((s) => `${s.role}:${s.token} sw ${s.sw} -> ${s.swDevice}px`),
    groundRgb: g ? g[1].split(',').map(Number) : null,
    inkPixels: rec.inkPixels, inkPct: rec.inkPct, at15: rec.at15, at30: rec.at30,
    at30Pct: rec.inkPct ? +(100 * rec.at30 / Math.max(1, rec.inkPixels)).toFixed(1) : 0,
    strongest: rec.strongest, clusters: rec.clusters,
  });
}

// ---------- 6. does the renderer agree with the spec? ----------
// Names resolve through `themeSpec` in the palette module — the same table the specimen was built from — so a
// shipped role, a `--c-*` accent and a `--w-*` warm candidate all come back as the value the specimen painted.
const drift = [];
const unresolved = [];
let checked = 0;
for (const [name, tok] of Object.entries(census.tokens ?? {})) {
  // the probe walks every custom property on :root; only the colour namespaces mean anything as a colour, and
  // reading `var(--radius)` into `color` leaves the probe's previous value in place — which would be compared
  // against a spec it was never painted from.
  if (!/^--(color|c|w)-/.test(name)) continue;
  const spec = themeSpec(name);
  const got = tok?.bytes ?? rgbBytes(tok?.css);
  if (!got) continue;
  if (!spec) { unresolved.push(name); continue; }
  checked += 1;
  // dist() is defined on OKLCH triples, so the browser's bytes get converted into one rather than compared as
  // RGB distance: an RGB difference of 20 near the top of the ramp and 20 in the darks are not the same
  // perceived difference, and every other separation number in this repo is OKLab.
  const d = +dist(spec, rgbTripleFromBytes(got)).toFixed(4);
  if (d >= SAME_COLOUR_BAR) drift.push({ token: name, spec: `oklch(${spec.L}% ${spec.C} ${spec.H})`, want: tripleToBytes(spec), got, oklabDelta: d });
}

// ---------- 7. the before-number, for comparison ----------
const survey = existsSync('.design/tmp-color/survey-_-1240.json')
  ? JSON.parse(readFileSync('.design/tmp-color/survey-_-1240.json', 'utf8')) : null;

const report = {
  measuredAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  window: `${W0}x${censusH}`, shot: `${TMP}/census.png`, dpr: census.dpr,
  chromaBar: CHROMA_MIN, band: BAND, familyFloorPx: 300,
  before: survey ? {
    route: survey.route, width: survey.width, chromaticPct: survey.chromaticPct, meanChroma: survey.meanChroma,
    hueFamilies: survey.hueFamilies, mostSaturated: survey.top?.[0] ?? survey.bands?.[0] ?? null,
  } : null,
  panels: census.panels.map((p) => ({ id: p.id, policy: p.policy, box: { x: p.x, y: p.y, w: p.w, h: p.h }, ...censusBox(p) })),
  pairs, marks: markReport, tokens: census.tokens, drift, tokenChecked: checked, tokenUnresolved: unresolved,
  surfaceMislabels: surface,
  // what the browser resolved under each planted element. This round's failure mode was a specimen that CLAIMED
  // a surface it did not paint (a label saying `ink on tint` on an element sitting on paper), so the raw slot
  // resolution is kept in the record, not just the ratios derived from it.
  slots: census.panels.flatMap((p) => (p.slots ?? []).map((s) => ({ panel: p.id, ...s }))),
};
writeFileSync('design/grill/round9/report.json', JSON.stringify(report, null, 2));

console.log(`\n=== census: painted pixels inside each panel (chroma >= ${CHROMA_MIN}, ${BAND}-degree bands, family floor 300 px) ===`);
for (const p of report.panels) {
  console.log(`${p.id.padEnd(8)} ${String(p.box.w)}x${String(p.box.h)} at ${p.box.x},${p.box.y}  px ${p.px.toLocaleString().padStart(8)}  chromatic ${String(p.chromaticPct).padStart(5)}%  >=${STRONG_MIN} ${String(p.strongPct).padStart(5)}%  meanC ${p.meanChroma}  families ${p.hueFamilies}  faint ${String(p.faintPct).padStart(5)}%  white ${String(p.whitePct).padStart(5)}%  black ${String(p.blackPct).padStart(5)}%`);
  console.log(`         bands: ${p.bands.map((b) => `${b.hueFrom}-${b.hueFrom + BAND} deg ${b.pct}%`).join(', ') || 'none'}`);
  if (p.mostSaturated.length) console.log(`         loudest:   ${p.mostSaturated.map((s) => `rgb(${s.rgb}) C${s.chroma} ${s.px}px`).join(' | ')}`);
  if (p.y + p.box.h > imgH) console.log(`         ^ panel runs past the ${imgH}px shot: its lower part is not in the census`);
}
if (report.before) console.log(`live page before (/ @ ${report.before.width}): ${report.before.chromaticPct}% chromatic, meanC ${report.before.meanChroma}, ${report.before.hueFamilies} families`);

console.log('\n=== planted pairs, off the bytes the browser paints (token math in brackets when the token is known) ===');
for (const p of pairs) console.log(`${p.pass ? 'ok  ' : 'FAIL'} ${String(p.ratio).padStart(6)} / ${String(p.bar).padEnd(4)} ${p.ground.padEnd(6)} ${(p.fgToken ?? '?').padEnd(24)} on ${(p.bgToken ?? '?').padEnd(22)} [${p.specRatio ?? '-'}]${p.disagree ? ' DRIFT ' + JSON.stringify(p.disagree) : ''}  ${p.label}`);
const badCalc = pairs.filter((p) => p.disagree);
if (badCalc.length) for (const p of badCalc) console.error(`DRIFT ${p.label}: painted ${p.disagree.painted} vs token math ${p.disagree.token}`);

console.log('\n=== the mark, as painted (design/mark-pixels.mjs) ===');
for (const m of report.marks) {
  console.log(`${m.set.padEnd(4)} ${m.ground.padEnd(6)} ${m.boxW}px box (scale ${m.scale})  ground rgb(${m.groundRgb})  ink ${String(m.inkPct).padStart(5)}% of box (${m.inkPixels} px)`);
  console.log(`      at/1.5 ${m.at15}  at/3.0 ${m.at30} = ${m.at30Pct}% of its ink  strongest cluster rgb(${m.strongest?.c}) @${m.strongest?.contrast}`);
  console.log(`      ${m.painted}`);
}

console.log(`\n=== token vs rendered bytes (same-colour threshold ${SAME_COLOUR_BAR}) ===`);
console.log(`${checked} colour token(s) checked against spec: ${drift.length ? '' : 'all round-trip inside the same-colour threshold'}`);
if (unresolved.length) console.error(`UNRESOLVED (no spec by that name, so NOT checked): ${unresolved.join(' ')}`);

const failed = pairs.filter((p) => !p.pass);
txt(['design/grill/round9-build.mjs'], 'round9-build (embed)');
console.log(`\nwrote design/grill/round9/report.json; design/grill/round-9.html now embeds these numbers`);
if (failed.length) console.error(`${failed.length} planted pair(s) below their bar (FAIL lines above)`);
if (drift.length) console.error(`${drift.length} token(s) render further than ${SAME_COLOUR_BAR} from spec: ${drift.map((d) => `${d.token} ${d.spec} -> rgb(${d.got}) expected rgb(${d.want}) delta-OKLab ${d.oklabDelta}`).join('; ')}`);
if (surface.length) console.error(`SURFACE ${surface.length}: the specimen planted a colour other than the one its pair names: ${surface.map((s) => `${s.panel}/${s.label} ${s.side} named ${s.named} rgb(${s.want}) painted rgb(${s.painted}) delta ${s.delta}`).join('; ')}`);
process.exit(drift.length || failed.length || badCalc.length || unresolved.length || surface.length ? 1 : 0);
