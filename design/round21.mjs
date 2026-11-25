#!/usr/bin/env node
// round21.mjs — grill round 21: the Byrne-1847 colourings of the club logo, PRICED, not applied (2026-11-24).
//
//   node design/round21.mjs                       # every option, both grounds, three hero widths
//   node design/round21.mjs --only C,D            # a subset, for re-pricing one row
//   node design/round21.mjs --widths 320,1240     # a narrower width set
//
// WHY A ROUND AND NOT AN EDIT. Colour on this site is operator-ratified (D316: the 2026-11-14 read's hexes were
// adopted *as* the palette, and every candidate that missed a bar was refused rather than tuned). So the answer to
// "make the logo like Byrne's 1847 Euclid, in our palette" is a specimen with numbers, and the ruling stays the
// operator's. What this runner owes each option is the same three questions the logo gates already ask:
//
//   PAIRS   every shape's token against the ground it would sit on, off the token (design/grill/okcolor.mjs),
//           against the bar that shape is held to: a graphic line 3.0 (D101), a filled region a LAYER 1.35.
//   PAINT   the option painted into a COPY of the built page, measured by the two probes the logo gates grew out
//           of (logo-geometry.mjs, logo-pixels.mjs) at the three widths that bracket the logo's box.
//           This is the half that catches what token arithmetic cannot: a 1.4-unit stroke is 1.68 device px at 320,
//           so most of its pixels are half-covered blends, and a colour that clears 3.0 as a token can still fail
//           to land ink where the table draws it.
//   HUES    the round-3b reserved-hue geometry (>=40 deg) and the two bars logo-geometry now holds a repaint to:
//           roles >= 20 deg apart, each shape's painted hue within 30 deg of what its own token resolves to.
//
// The ink ground is measured too, because that is where the logo ships on a dark ground: the share card. Its own
// document (.design/tmp-card.html, written by scripts/make-social-share.mjs) is copied and recoloured, shot at
// 1200x630, and measured with the same pixel probe.
//
// A round, not a gate: it prints numbers and never a verdict, so in `verify` it would cost a build and a browser
// for no verdict (D269's reason, same class as check:area / check:rhythm / check:color). It DOES exit 1 when the
// machinery itself broke — a token that does not exist, a shape count that is not the table's — because a round
// that silently measures nothing is the green line on a broken page (D118).
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { LOGO, LOGO_SLOTS, LOGO_COLOURS, LOGO_SHAPE_COUNT } from '../src/lib/logo.mjs';
import { paletteTokens } from './palette-tokens.mjs';
import { contrastTriple, BARS, hueGap, nearestBrand, SAME_COLOUR_BAR } from './grill/okcolor.mjs';
import { OPTIONS, WASHES, YELLOW_HUES, YELLOW_CHROMAS } from './grill/round21-options.mjs';
import { distState, staleLine } from './dist-fresh.mjs';
import { lunePath } from './logo-faces.mjs';
import { recolourPage, recolourCard, labelsFor, hueOfPaint } from './grill/paint-logo.mjs';
import { shotHeight } from './grill/shot-height.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] ?? d : d; };
const WIDTHS = flag('widths', '320,640,1240').split(',').map(Number);
const ONLY = flag('only', null)?.split(',').map((s) => s.trim().toUpperCase());

const TMP = '.design/tmp-round21';
const DIST = resolve(TMP, 'dist');
mkdirSync(TMP, { recursive: true });

// ---------- 0. the artifact and the palette, both read from this tree ----------
const ST = distState();
if (!ST.fresh && !ST.allowed) { console.error(`round21: ${staleLine(ST)}`); process.exit(1); }
const TOKENS = paletteTokens();
const tok = (name) => {
  const t = TOKENS[name];
  if (!t) throw new Error(`round21-options.mjs names --color-${name}, which src/styles/global.css does not declare. Options: ${Object.keys(TOKENS).join(', ')}`);
  return t;
};
const GROUNDS = { paper: tok('paper'), ink: tok('ink') };

// The eight drawn shapes, in paint order, by SLOT — imported from src/lib/logo.mjs (LOGO_SLOTS), which is
// their ONE home. This file used to declare them twice (`SLOT_OF` here, `SLOTS` in design/grill/round21-options.mjs)
// next to a third copy in the shape table, and this is the round that prices the shipped colouring against the
// shipped table: a private copy is how a round measures a logo that no longer exists.
const shapeSlots = [...LOGO.shapes.map((s) => s.slot), LOGO.dot.slot];
if (shapeSlots.length !== LOGO_SHAPE_COUNT) throw new Error(`the logo declares ${shapeSlots.length} drawn shapes, LOGO_SHAPE_COUNT says ${LOGO_SHAPE_COUNT}`);
if (shapeSlots.some((s, i) => s !== LOGO_SLOTS[i]))
  throw new Error(`the drawn shapes carry slots ${shapeSlots.join(', ')} but LOGO_SLOTS names ${LOGO_SLOTS.join(', ')} — every zip below pairs a painted shape with the wrong colour declaration`);

// ---------- 0b. the CONTROL is whatever the site SHIPS today (D481 §c) ----------
// A colour round is a mutation test: every row is measured against the colouring the artifact actually wears, so a
// row that cannot reproduce it means the mutation is broken and no number in the round means anything. This used to
// be a hard-coded letter (`PAINTED[0]`, "option A, the incumbent"), which is a claim about the artifact written in
// the round that prices it — the same class of defect as a fixture that names the thing it is supposed to discover.
// Now the control row is FOUND, by asking which option reproduces `LOGO_COLOURS` on both grounds, so the round
// cannot quietly price a logo the site no longer has, and it cannot pass a round in which the shipped colouring is
// absent from the table at all.
const sameColouring = (o) => LOGO_SLOTS.every((s) => o.paper[s] === LOGO_COLOURS.paper[s] && o.ink[s] === LOGO_COLOURS.ink[s]);
const shipped = OPTIONS.filter(sameColouring);
if (shipped.length !== 1) throw new Error(`round21: ${shipped.length ? `options ${shipped.map((o) => o.id).join(', ')} all reproduce` : 'NO option reproduces'} the shipped colouring in src/lib/logo.mjs LOGO_COLOURS (${LOGO_SLOTS.map((s) => `${s}:${LOGO_COLOURS.paper[s]}/${LOGO_COLOURS.ink[s]}`).join(' ')}). There is no CONTROL row, so every painted number in this round is unanchored — add the shipped row to design/grill/round21-options.mjs or fix the table.`);
const CONTROL = { id: shipped[0].id, label: shipped[0].label, derivedFrom: 'LOGO_COLOURS in src/lib/logo.mjs', ruling: shipped[0].ruling ?? null };

// ---------- 1. PAIRS: every option, every shape, both grounds, off the token ----------
const pairs = [];
for (const o of OPTIONS) {
  for (const [ground, map] of [['paper', o.paper], ['ink', o.ink]]) {
    const g = GROUNDS[ground];
    for (const slot of LOGO_SLOTS) {
      const t = tok(map[slot]);
      const ratio = +contrastTriple(t.spec, g.spec).toFixed(2);
      pairs.push({ id: o.id, ground, slot, token: t.name, spec: t.spec, ratio, bar: BARS.graphic, pass: ratio >= BARS.graphic });
    }
  }
}

// The hue geometry a repaint has to survive. logo-geometry holds two ROLES >= 20 deg apart and each shape's
// painted hue within 30 deg of its own token; round 3b holds reserved path hues >= 40 deg apart.
const hueRows = [];
for (const o of OPTIONS) {
  for (const [ground, map] of [['paper', o.paper], ['ink', o.ink]]) {
    const used = [...new Set(LOGO_SLOTS.map((s) => map[s]))];
    let minGap = Infinity, pair = '';
    for (let i = 0; i < used.length; i++) for (let j = i + 1; j < used.length; j++) {
      // hueGap takes COLOURS, not hue numbers: it runs polar() on each argument. Passing `.H` here would hand it
      // a number, get NaN back, and print "min gap Infinity" for every option — a broken row that reads as a
      // wide separation. (@caught 2026-11-24 by the first run of this file.)
      const gp = hueGap(tok(used[i]).spec, tok(used[j]).spec);
      if (gp < minGap) { minGap = gp; pair = `${used[i]}/${used[j]}`; }
    }
    hueRows.push({ id: o.id, ground, colours: used.length, tokens: used.join(' '), minGap: used.length > 1 ? minGap : null, tightest: pair });
  }
}

// ---------- 2. the yellow hole, re-solved rather than remembered ----------
// D316 refused the read's amber at 1.95 on paper and 0.043 OKLab from Amazon orange. What was never printed is
// whether ANY yellow can clear the 3.0 graphic bar on this paper, and what it costs in lightness to get there.
//
// The window runs from near-black UPWARD: every dark colour clears 3.0 against light paper, so the bottom of the
// window is not the answer. The only yellow that is a YELLOW is the TOP of the window — the palest colour at that
// hue and chroma that still clears the bar. (The first run of this file reported the bottom and called it
// "chosen", which produced "nearest brand: Amazon ink" for a yellow — the arithmetic was right and the question
// was wrong.)
//
// YELLOW_L_FLOOR is a STATED JUDGEMENT, not a ratified bar: below about L 60 a hue-85 colour at chroma 0.1+ reads
// as ochre, olive or brown rather than as yellow, which is why Byrne's yellow had to be printed pale. Nothing in
// DESIGN.md sets it, so it is printed as a flag and the specimen shows the swatches — the operator chooses by
// looking, which is what a grill round is for.
const YELLOW_L_FLOOR = 60;
const yellow = [];
for (const H of YELLOW_HUES) for (const C of YELLOW_CHROMAS) {
  const clears = [];
  for (let L = 5; L <= 99; L += 0.5) if (contrastTriple(`oklch(${L}% ${C} ${H})`, GROUNDS.paper.spec) >= BARS.graphic) clears.push(L);
  if (!clears.length) { yellow.push({ H, C, window: null, note: 'no lightness clears 3.0 on paper at this chroma' }); continue; }
  const top = clears.at(-1);
  const spec = `oklch(${top}% ${C} ${H})`;
  const nb = nearestBrand(spec, 1)[0];
  yellow.push({
    H, C, window: `${clears[0]}..${top}`, top, spec,
    ratio: +contrastTriple(spec, GROUNDS.paper.spec).toFixed(2),
    readsAsYellow: top >= YELLOW_L_FLOOR,
    nearestBrand: nb.brand, brandDist: nb.d, sameColour: nb.d < SAME_COLOUR_BAR,
  });
}
// The best legal yellow, if one exists: pale enough to read as yellow, far enough from every brand colour, and
// still clearing the graphic bar. If this is null, "add Byrne's yellow" has no answer in this palette.
const legalYellow = yellow.filter((y) => y.window && y.readsAsYellow && !y.sameColour)
  .sort((a, b) => b.top - a.top || b.C - a.C)[0] ?? null;

// ---------- 3. the wash: what a FILLED region is held to ----------
const washes = [];
for (const w of WASHES) {
  const t = tok(w.token);
  const vsPaper = +contrastTriple(t.spec, GROUNDS.paper.spec).toFixed(2);
  washes.push({
    token: w.token, why: w.why, vsPaper, bar: BARS.layer,
    readsAsRegion: vsPaper >= BARS.layer,
    vsRouteInk: +contrastTriple(t.spec, GROUNDS.ink.spec).toFixed(2),
    note: vsPaper >= BARS.layer ? 'clears the layer bar: it would read as a region' : 'under 1.35: it reads as nothing, or as the ground itself',
  });
}
// Every palette tint is under the layer bar, so the honest follow-up is not "which tint" but "what would a wash
// cost": for each hue family already in the palette, the PALEST fill in that family that still reads as a region
// on paper, and how far that colour is from a brand colour. This is a price, not a proposal — it is not a token
// and nothing here adds one.
const washSolve = [];
for (const name of ['accent', 'path-mobilizon', 'path-calendar', 'rule', 'ink']) {
  const t = tok(name);
  let top = null;
  for (let L = 5; L <= 99; L += 0.5) if (contrastTriple(`oklch(${L}% ${t.C} ${t.H})`, GROUNDS.paper.spec) >= BARS.layer) top = L;
  if (top === null) { washSolve.push({ family: name, H: t.H, C: t.C, top: null, note: 'no lightness of this hue family reads as a region on paper' }); continue; }
  const spec = `oklch(${top}% ${t.C} ${t.H})`;
  const nb = nearestBrand(spec, 1)[0];
  washSolve.push({
    family: name, H: t.H, C: t.C, top, spec, tokenL: t.L,
    ratio: +contrastTriple(spec, GROUNDS.paper.spec).toFixed(2),
    nearestBrand: nb.brand, brandDist: nb.d, sameColour: nb.d < SAME_COLOUR_BAR,
  });
}

// ---------- 4. PAINT, paper ground: mutate a COPY of the built page, measure with the logo probes ----------
if (WIDTHS.length) {
  rmSync(DIST, { recursive: true, force: true });
  cpSync(resolve('dist/client'), DIST, { recursive: true });
}
const txt = (args) => {
  try { return execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180000 }); }
  catch (e) { return { __fail: true, stdout: String(e.stdout ?? ''), stderr: String(e.stderr ?? '') }; }
};

// Rewrite the hero logo's eight shape tags in paint order. The colour CLASSES are removed and an inline
// `style="stroke:var(--color-X)"` is added: inline needs no Tailwind generation (the utility for an unused
// token is not in the built sheet), and the var() resolves through the shipped @theme, so the painted bytes
// are the token's bytes and not a second colour invented for the specimen.
// A class is a COLOUR utility only if its suffix is a token this palette declares. `fill-none` and `stroke-none`
// are not colours, and dropping `fill-none` is not cosmetic: SVG's default fill is black, so the ring, both
// equator arcs and both meridians came back as black-filled blobs, the dash disappeared under the fill, and the
// control option A failed every painted check (@caught 2026-11-24 by the first run — the control failing is the
// proof the mutation was broken, not the colouring).
// The mutation itself lives in paint-logo.mjs — the ONE machinery every colour round plants with
// (recolourPage / recolourCard / labelsFor / hueOfPaint), imported here since 2026-11-24. The two traps it is
// written around are recorded there: a class counts as a colour only if its suffix is a DECLARED token, and
// dropping fill-none black-fills the logo — round 21 control row failed every painted check for exactly that
// reason (@caught 2026-11-24), which is proof the MUTATION was broken, not the colouring.
// The wash boundary now lives in ONE home: logo-faces.mjs, which is also where the logo's faces are
// defined and priced (grill round 22). Round 21's inline copy was deleted here on 2026-11-24 after the two
// functions were compared byte-for-byte on the same table (the paths are identical), so a face boundary is no
// longer typed out twice next to a third copy of the shape table.
// Paint order for a washed option puts the wash FIRST (it is inserted straight after <svg>), so a 9-shape report
// must be labelled ['wash', ring, rear, ...]. Labelling it with the 8-slot table instead would print the wash's
// 1.13 contrast under the name `ring` and shift every other role onto its neighbour's numbers.
// labelsFor (the paint order of a washed row) is imported from paint-logo.mjs.

const painted = [];
for (const o of OPTIONS) {
  if (ONLY && !ONLY.includes(o.id)) continue;
  const row = { id: o.id, label: o.label, paper: [], ink: [] };
  for (const w of WIDTHS) {
    const src = readFileSync(resolve('dist/client/index.html'), 'utf8');
    writeFileSync(resolve(DIST, 'index.html'), recolourPage(src, o.paper, o.fill ? [{ d: lunePath(), token: o.fill.token }] : [], TOKENS));
    const h0 = txt(['design/grill/dist-measure.mjs', DIST, '/', 'design/grill/render-measure.js', String(w), '1200']);
    if (h0.__fail) { row.paper.push({ width: w, error: 'height probe failed' }); continue; }
    const docH = JSON.parse(h0)?.doc?.scrollHeight;
    const shot = `${TMP}/hero-${o.id}-${w}.png`;
    const rep = `${TMP}/hero-${o.id}-${w}.json`;
    const json = txt(['design/grill/dist-measure.mjs', DIST, '/', 'design/grill/render-measure.js', String(w), String(shotHeight(docH, `round21 ${o.id} @ ${w}`)), shot]);
    if (json.__fail) { row.paper.push({ width: w, error: 'measure failed' }); continue; }
    writeFileSync(rep, json);
    const j = JSON.parse(json);
    const m = j.marks?.[0];
    // the two logo probes, run exactly as check:logo runs them
    const geo = txt(['logo-geometry.mjs', shot, rep]);
    const px = txt(['logo-pixels.mjs', shot, rep, '0', '--json']);
    const pxRec = px.__fail ? null : JSON.parse(px.split('\n').filter((l) => l.startsWith('{')).pop());
    row.paper.push({
      width: w, shot, rep,
      shapeCount: m?.count ?? null,
      strokes: (m?.shapes ?? []).map((s, i) => ({
        role: labelsFor(o.fill ? 1 : 0, m?.shapes?.length ?? 0)[i] ?? s.tag, tag: s.tag,
        contrast: s.strokeContrast ?? s.fillContrast, swDevice: s.swDevice,
        hue: hueOfPaint(s.stroke && s.stroke !== 'none' ? s.stroke : s.fill),
      })),
      geometry: geo.__fail ? { fail: true, out: (geo.stdout + geo.stderr).trim().split('\n').slice(0, 6).join(' | ') } : { ok: true },
      inkPixels: pxRec?.inkPixels ?? null, at30: pxRec?.at30 ?? null,
      at30Pct: pxRec?.inkPixels ? +((100 * pxRec.at30) / pxRec.inkPixels).toFixed(1) : null,
      strongest: pxRec?.strongest ?? null,
    });
    // a crop of the painted box, for the specimen the operator chooses from (D160: an option nobody can see
    // is an incomplete round)
    if (m) {
      await sharp(shot).extract({ left: Math.round(m.x - 6), top: Math.round(m.y - 6), width: Math.round(m.w + 12), height: Math.round(m.h + 12) })
        .png().toFile(`${TMP}/crop-${o.id}-paper-${w}.png`);
    }
  }
  painted.push(row);
}

// The report writes each shape's computed paint as an oklch() triple with L in 0..1 — "oklch(0.96 0.012 88)" —
// the same form logo-geometry's paintBytes() reads. Its HUE is the third number. (The first run ran an `rgb(...)`
// regex over it, got [0,0,0] back, and printed "H 0" for every shape.) This is the colour the browser RESOLVED
// for the token; logo-geometry's own line reports the median of the PIXELS, which is the painted fact.
// hueOfPaint is imported from paint-logo.mjs.

// ---------- 5. PAINT, ink ground: the share card's own document, recoloured ----------
// Measured with the SAME probes as the hero, which means measured with the same REPORT: logo-geometry and
// logo-pixels both read `marks[]` with per-shape `strokeContrast`, and that shape of report comes from
// design/grill/render-measure.js. scripts/social-card-measure.js reports its mark under a singular `mark` key
// with no per-shape contrast, so handing its output to logo-pixels crashed on `j.marks` being undefined
// (@caught 2026-11-24 by the first run). The card is a page like any other, so render-measure reads it; the
// card's own gate keeps its own instrument.
const CARD_HTML = resolve('.design/tmp-card.html');
if (!readFileSyncExists(CARD_HTML)) {
  console.error('note: .design/tmp-card.html is missing — run `npm run assets:social` first, and the ink ground will be token arithmetic only');
} else {
  const base = readFileSync(CARD_HTML, 'utf8');
  for (const row of painted) {
    const o = OPTIONS.find((x) => x.id === row.id);
    const html = recolourCard(base, o.ink, o.fill ? [{ d: lunePath(), token: o.fill.token }] : [], TOKENS);
    const f = `${TMP}/card-${o.id}.html`;
    writeFileSync(f, html);
    const png = `${TMP}/card-${o.id}.png`;
    rmSync(png, { force: true });
    const raw = txt(['design/grill/page-measure.mjs', f, 'design/grill/render-measure.js', '1200', '630', png]);
    if (raw.__fail) { row.ink.push({ error: 'card measure failed' }); continue; }
    const rep = `${TMP}/card-${o.id}.json`;
    writeFileSync(rep, raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const j = JSON.parse(readFileSync(rep, 'utf8'));
    const m = j.marks?.[0];
    const geo = txt(['logo-geometry.mjs', png, rep]);
    const px = txt(['logo-pixels.mjs', png, rep, '0', '--json']);
    const pxRec = px.__fail ? null : JSON.parse(px.split('\n').filter((l) => l.startsWith('{')).pop());
    row.ink.push({
      shot: png, rep, shapeCount: m?.count ?? null,
      strokes: (m?.shapes ?? []).map((s, i) => ({ role: labelsFor(o.fill ? 1 : 0, m?.shapes?.length ?? 0)[i] ?? s.tag, contrast: s.strokeContrast ?? s.fillContrast, swDevice: s.swDevice })),
      geometry: geo.__fail ? { fail: true, out: (geo.stdout + geo.stderr).trim().split('\n').slice(0, 6).join(' | ') } : { ok: true },
      inkPixels: pxRec?.inkPixels ?? null, at30: pxRec?.at30 ?? null,
      at30Pct: pxRec?.inkPixels ? +((100 * pxRec.at30) / pxRec.inkPixels).toFixed(1) : null,
      strongest: pxRec?.strongest ?? null,
    });
    if (m) await sharp(png).extract({ left: Math.round(m.x - 6), top: Math.round(m.y - 6), width: Math.round(m.w + 12), height: Math.round(m.h + 12) })
      .png().toFile(`${TMP}/crop-${o.id}-ink-1200.png`);
  }
}
function readFileSyncExists(p) { try { readFileSync(p); return true; } catch { return false; } }

// The card's mark is drawn with inline stroke="var(--color-X)" (scripts/make-social-share.mjs), so the
// recolour is a per-tag swap of that var, in the same paint order.
// The copy also gets `body { background: var(--color-ink) }`, and that is a mutation worth naming: the shipped
// card paints its ground with a SIBLING div (.ground, 1200x630, var(--color-ink)) and leaves <body> transparent
// — deliberately, because firefox's headless shot of this document comes out 4-channel with body alpha 0
// (scripts/make-social-share.mjs). render-measure discovers a logo's ground by walking its ANCESTORS, so on the
// untouched file it finds nothing and reports strokeContrast null for all eight shapes, which leaves
// logo-geometry unable to split the figure into roles. Declaring the same token on <body> changes no painted
// pixel (the div covers the frame exactly) and makes the per-shape contrast computable.
// recolourCard is imported from paint-logo.mjs, where the card's ground mutation is documented.

// ---------- 6. the record ----------
const report = {
  measuredAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  widths: WIDTHS, grounds: ['paper (the hero)', 'ink (the share card)'],
  bars: { graphic: BARS.graphic, layer: BARS.layer, text: BARS.text },
  source: 'Oliver Byrne, "The First Six Books of the Elements of Euclid, in Which Coloured Diagrams and Symbols Are Used Instead of Letters for the Greater Ease of Learners", London 1847 (printed by Charles Whittingham, Chiswick Press)',
  palette: Object.fromEntries(Object.entries(TOKENS).map(([k, v]) => [k, v.spec])),
  slots: LOGO_SLOTS,
  shipped: { slots: LOGO_SLOTS.map((s) => [s, LOGO_COLOURS.paper[s], LOGO_COLOURS.ink[s]]) },
  control: CONTROL,
  options: OPTIONS.map((o) => ({ id: o.id, label: o.label, byrne: o.byrne, reading: o.reading, paper: o.paper, ink: o.ink, fill: o.fill ?? null, control: o.id === CONTROL.id })),
  pairs, hues: hueRows, yellow, yellowFloor: YELLOW_L_FLOOR, legalYellow, washes, washSolve, painted,
};
mkdirSync('design/grill/round21', { recursive: true });
writeFileSync('design/grill/round21/report.json', JSON.stringify(report, null, 1) + '\n');

// ---------- 7. print ----------
console.log(`BYRNE ROUND 21 — ${OPTIONS.length} colourings x 2 grounds. Bars: graphic line ${BARS.graphic}, filled region ${BARS.layer}.`);
console.log('\n=== PAIRS: each shape\'s token against its ground (token arithmetic, okcolor) ===');
for (const o of OPTIONS) {
  for (const g of ['paper', 'ink']) {
    const rows = pairs.filter((p) => p.id === o.id && p.ground === g);
    console.log(`${o.id} ${g.padEnd(5)} ${rows.map((p) => `${p.slot}:${p.token} ${p.ratio}${p.pass ? '' : ' FAIL'}`).join('  ')}`);
  }
}
console.log('\n=== HUES: how many colours an option spends, and the tightest gap between them ===');
for (const h of hueRows) console.log(`${h.id} ${h.ground.padEnd(5)} ${String(h.colours).padStart(2)} colours  min gap ${h.minGap ?? '-'} deg (${h.tightest})  [logo-geometry needs >= 20]`);
console.log('\n=== the yellow hole: can any yellow clear 3.0 on this paper? ===');
for (const y of yellow) console.log(`hue ${String(y.H).padStart(3)} C ${y.C}  ${y.window ? `clears 3.0 for L ${y.window} — palest legal is L ${y.top} (${y.ratio})  ${y.readsAsYellow ? 'reads as yellow' : `L ${y.top} < ${YELLOW_L_FLOOR}: reads as ochre/brown`}  nearest brand ${y.nearestBrand} d=${y.brandDist}${y.sameColour ? ' SAME COLOUR' : ''}` : y.note}`);
console.log(legalYellow
  ? `best legal yellow: ${legalYellow.spec} (hue ${legalYellow.H} C ${legalYellow.C}, ${legalYellow.ratio} on paper, ${legalYellow.brandDist} from ${legalYellow.nearestBrand})`
  : 'NO legal yellow: nothing at a yellow hue is pale enough to read as yellow AND clears 3.0 AND sits outside 0.05 of a brand colour');
console.log('\n=== the wash: a filled lune is a LAYER (1.35), not a line (3.0) ===');
for (const w of washes) console.log(`${w.readsAsRegion ? 'ok  ' : 'no  '} ${w.token.padEnd(22)} vs paper ${String(w.vsPaper).padStart(5)} (bar ${BARS.layer})  vs ink ${w.vsRouteInk}  ${w.note}`);
console.log('what a wash would COST — the palest fill in each hue family that still reads as a region:');
for (const w of washSolve) console.log(`  ${w.family.padEnd(15)} hue ${String(w.H).padStart(6)} C ${w.C}  needs L <= ${w.top ?? '-'} (token is L ${w.tokenL})  ${w.spec ?? w.note}${w.top ? `  nearest brand ${w.nearestBrand} d=${w.brandDist}${w.sameColour ? ' SAME COLOUR' : ''}` : ''}`);
console.log('\n=== PAINT: the built page, recoloured in a copy, measured by the logo probes ===');
const ctrlRow = painted.find((r) => r.id === CONTROL.id);
const ctrlFail = !ctrlRow
  ? 'was never painted (its probe rows are missing)'
  : [...ctrlRow.paper.filter((p) => p.error).map((p) => `paper ${p.width}: ${p.error}`),
     ...ctrlRow.paper.filter((p) => !p.error && !p.geometry.ok).map((p) => `paper ${p.width}: logo-geometry FAIL`),
     ...ctrlRow.ink.filter((c) => c.error).map((c) => `card: ${c.error}`),
     ...ctrlRow.ink.filter((c) => !c.error && c.geometry && !c.geometry.ok).map(() => 'card: logo-geometry FAIL')];
console.log(`CONTROL row ${CONTROL.id} — the colouring src/lib/logo.mjs ships (${CONTROL.derivedFrom}${CONTROL.ruling ? `, ${CONTROL.ruling}` : ''}): ${ctrlFail.length ? ctrlFail.join('; ') : 'passes logo-geometry at every width and on the card'}. ${ctrlFail.length ? 'THE MUTATION IS BROKEN: the shipped colouring does not reproduce itself, so no painted row in this round is trustworthy.' : 'Every other row is a delta from this measured line, not from memory.'}`);
for (const row of painted) {
  console.log(`\n${row.id}${row.id === CONTROL.id ? ' (CONTROL — the shipped colouring)' : ''} ${row.label}`);
  for (const p of row.paper) {
    if (p.error) { console.log(`  paper ${p.width}: ${p.error}`); continue; }
    console.log(`  paper ${String(p.width).padStart(4)}  shapes ${p.shapeCount}  ink ${p.inkPixels} px  at/3.0 ${p.at30} (${p.at30Pct}% of its ink)  ${p.geometry.ok ? 'logo-geometry PASS' : 'logo-geometry FAIL'}`);
    console.log(`          ${p.strokes.map((s) => `${s.role} ${s.contrast}@${s.swDevice}px h${s.hue}`).join(' | ')}`);
    if (!p.geometry.ok) console.log(`          ${p.geometry.out}`);
  }
  for (const c of row.ink) {
    if (c.error) { console.log(`  ink: ${c.error}`); continue; }
    console.log(`  card        shapes ${c.shapeCount}  ink ${c.inkPixels} px  at/3.0 ${c.at30} (${c.at30Pct}% of its ink)  ${c.geometry?.ok ? 'logo-geometry PASS' : 'logo-geometry FAIL'}`);
    console.log(`          ${c.strokes.map((s) => `${s.role} ${s.contrast}@${s.swDevice}px`).join(' | ')}`);
    if (c.geometry && !c.geometry.ok) console.log(`          ${c.geometry.out}`);
  }
}
const broke = painted.some((r) => r.paper.some((p) => p.error) || r.ink.some((c) => c.error)) || ctrlFail.length > 0;
console.log(`\nwrote design/grill/round21/report.json; crops in ${TMP}/crop-<id>-<ground>-<w>.png`);
if (broke) { console.error('MACHINERY: at least one row failed to measure, or the CONTROL row (the shipped colouring) did not pass its own probes — the numbers above are incomplete'); process.exit(1); }
