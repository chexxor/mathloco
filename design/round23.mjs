#!/usr/bin/env node
// round23.mjs — grill round 23: the TAB framings for the ratified club logo, PRICED, not applied (2026-11-25).
//
//   npm run round23                       # every row, both grounds, 16/32/48/64 + the browser pair
//   node design/round23.mjs --only T1,T5 # a subset (writes a SUBSET record to .design/, never the tracked one)
//   node design/round23.mjs --widths 16  # a narrower width set (same subset rule)
//
// WHAT THIS ROUND OWEs THE OPERATOR. Round 22 priced which FACES a Byrne colouring could fill (D484); this round
// prices the other half of the goal: putting the ratified logo — row C's sphere with its two intersecting
// meridians (D483) — into the browser tab. The operator's own framing of the item asked for "square
// sphere-centred variant, full 240x150 letterbox, weight-scaled variants", and the row set in
// design/grill/round23-options.mjs is exactly that, each row priced in device pixels rather than argued about.
// Nothing here ships: colour is operator-ratified (D316) and a framing is the same kind of decision, so
// public/favicon.svg does not change in this commit. The artifact half is `logo-lands`, after the pick.
//
// THE FOUR PRICES, in the order a reader needs them.
//
//   FIT. Every row is solved through its own frame: the contain-scale a browser applies, the box the drawing
//   actually lands in, and the tab area it leaves blank. `plate` (240x150) at 16px is a 16x10 band with 96 blank
//   pixels; `sphere` (the ink box, 117.4u) is 16x16 with 0. That difference is not cosmetics — it is how many
//   viewBox units a device pixel is allowed to cover, which is the only lever a tab has left.
//
//   WEIGHT, and what it costs. A row with a device-px floor multiplies every stroke (and its dash) until the
//   thinnest line reaches that floor in the slot that decides the pick. Heavier lines are a different figure, so
//   the round prints the three consequences instead of asserting them: the DASH RUN PROFILE (is the rear arc still
//   dashed, or has it fused with the front arc and taken the logo's only depth cue with it), the SURVIVAL TABLE
//   (which of the eight shapes lands at all, and whether any pixel of it is fully covered), and the FRAME CLIP in
//   device px (what the framing amputates once the strokes swell past the frame that was measured at hero weight).
//
//   THE GATE, READ ALOUD. Each row is written as the artifact it would ship and run through the real
//   `scripts/check-favicon.mjs` as a subprocess, with its findings recorded VERBATIM. The round does not
//   reimplement the gate's rules and does not paraphrase them — one home per rule. Row T9 (row C as the hero
//   paints it) exists so the gate's own words get printed instead of argued about, and the round asserts the
//   direction of that verdict: as first priced it was REFUSED by the two-colour cap (D479), and after the cap was
//   re-derived into a structure rule (D494, S113) it is ADMITTED. The round exits 1 if that verdict flips in
//   EITHER direction — a record whose central price quietly stopped being true is worse than no record, and a
//   round that asserts a gate verdict has to re-derive the assertion whenever the gate is re-ruled (D495, S114).
//
//   TWO RASTERIZERS. A favicon is only ever rasterized by a browser, and librsvg (sharp) is not a browser. So the
//   two sizes that decide the pick are measured in a real firefox too, with a printed agreement line per row. The
//   crop of that shot is measured per shot, never typed (see logo-tab.mjs §6).
//
// THE CONTROL IS THE TAB AS SHIPPED, AND IT IS READ OFF THE TREE. Row I0 has no colour, geometry or size typed
// into this file: `public/favicon.svg` is parsed, its own document is measured, and its own gate run is its own
// control (D481 §c). The round also refuses, as a control, if the file that ships in a fresh `dist/` is not
// byte-identical to the file it is measuring — a tab gate that measures a source the build never copied is the
// D245 class of defect (production ran a stale artifact for a week while 22 gates stayed green).
//
// A round, not a gate (D269's reason, same class as check:area / check:rhythm / check:color): it prints numbers
// and never a verdict for `verify`, so in the deploy set it would cost a browser for no verdict. It DOES exit 1
// when the machinery itself broke.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { LOGO_SLOTS, LOGO_COLOURS } from '../src/lib/logo.mjs';
import { ROWS, TAB_WIDTHS, BROWSER_WIDTHS, GROUNDS, SURVIVAL_SLOTS, DASH_SLOTS, GOLD_HUES, GOLD_CHROMAS, GOLD_L_FLOOR, GOLD_ROLES } from './grill/round23-options.mjs';
// The colour arithmetic is imported, never re-implemented (the same rule logo-tab.mjs states for contrast).
import { contrastTriple, BARS, nearestBrand, SAME_COLOUR_BAR, dist, hueGap } from './grill/okcolor.mjs';
import { paletteTokens, declareCandidate } from './palette-tokens.mjs';
import {
  FIGURE, frameOf, weightFor, colourPlan, artifactSvg, fixtureSvg, fixtureLayout, featureSizes,
  frameClip, clipLoss, shapeSurvival, runProfile, browserFixture, raster, stats, hexOf, GROUND_TOKEN, WARM_TOKEN,
  xmlCommentFaults, stripComments,
} from './logo-tab.mjs';
import { distState, staleLine } from './dist-fresh.mjs';

const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] ?? dflt : dflt; };
const ONLY = flag('only', null)?.split(',').map((s) => s.trim().toUpperCase());
const WIDTHS = flag('widths', TAB_WIDTHS.join(',')).split(',').map(Number);
const SUBSET = ONLY != null || WIDTHS.join(',') !== TAB_WIDTHS.join(',');

const TMP = '.design/tmp-round23';
mkdirSync(TMP, { recursive: true });
const SHIPPED = 'public/favicon.svg';

// Row T9 claims to be "row C exactly as the hero paints it". That is checked against the shipped table rather than
// taken on trust from the options file: a row that restates the colouring is a row that can go stale against
// src/lib/logo.mjs without anything noticing (the same guard round 22 runs on its control rows).
for (const row of ROWS.filter((r) => r.colours === 'rowC')) for (const ground of GROUNDS) {
  const mine = colourPlan(row, ground), shipped = LOGO_COLOURS[ground];
  const off = LOGO_SLOTS.filter((s) => mine[s] !== shipped[s]);
  if (off.length) { console.error(`round23: row ${row.id} says colours "rowC" but differs from LOGO_COLOURS.${ground} on ${off.join(', ')}. The round would price a colouring the site does not ship.`); process.exit(1); }
}

// ---------- 0. guards ----------
// The dist guard exists here for one specific reason, and it is stated rather than inherited: the tab artifact is
// copied verbatim into dist/client/favicon.svg, so this round is only describing the shipped tab if that copy is
// this file. When dist/ is stale the comparison is refused rather than guessed, and the record says it was skipped.
const ST = distState();
if (!ST.fresh && !ST.allowed) { console.error(`round23: ${staleLine(ST)}`); process.exit(1); }

const DISPLAY_FACTOR = 8;   // the specimen shows each tab at true size and at 8x from ONE raster (never a re-render)
const shippedSrc = readFileSync(SHIPPED, 'utf8');
const distCopy = 'dist/client/favicon.svg';
let shippedCopy = { state: 'not measured — no dist/ build on disk', path: distCopy };
try {
  const d = readFileSync(distCopy, 'utf8');
  const h = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
  shippedCopy = { path: distCopy, state: d === shippedSrc ? 'identical' : 'DIFFERS from public/favicon.svg', srcSha: h(shippedSrc), distSha: h(d) };
} catch { /* no built copy to compare; the state above says so */ }

// ---------- 1. the incumbent, parsed out of the document that ships ----------
// Nothing about I0 is typed here: size, viewBox, corner radius, the two paints and the glyph all come from the file.
function parseIncumbent(svg) {
  const at = (re) => { const m = svg.match(re); return m ? m[1] : null; };
  const paints = [...new Set([...svg.matchAll(/\b(?:fill|stroke)\s*=\s*"([^"]+)"/g)].map((m) => m[1]).filter((v) => v !== 'none'))];
  const text = svg.match(/<text\b[^>]*>([^<]*)<\/text>/);
  const attrs = text ? Object.fromEntries([...text[0].matchAll(/(\w[\w-]*)="([^"]*)"/g)].map((m) => [m[1], m[2]])) : null;
  return {
    width: Number(at(/width="(\d+)"/)), height: Number(at(/height="(\d+)"/)),
    viewBox: at(/viewBox="([^"]+)"/), rx: at(/rx="([\d.]+)"/), paints,
    glyph: text ? { char: text[1], ...attrs } : null,
    shapesPainted: (svg.match(/<(rect|path|circle|text)\b/g) || []).length,
  };
}
const INC = parseIncumbent(shippedSrc);
if (INC.paints.length !== 2) {
  console.error(`round23: ${SHIPPED} paints ${INC.paints.length} colour(s) (${INC.paints.join(', ')}); the round expects the shipped two-colour tab. The incumbent is the control, so this round cannot proceed on a tab it cannot describe.`);
  process.exit(1);
}
const INC_GROUND = INC.paints[0];            // the ground rect is the first paint in the document as shipped
const INC_INK = INC.paints[1];

// The incumbent measured at a tab size: the SAME document with its own width/height rewritten to n (its viewBox
// stays, which is exactly what a browser does when it fits a 32-unit plate into a 16px slot). `rx` is dropped for
// the pixel reading only — a rounded corner is transparent canvas, and librsvg hands back its raw triple as if it
// were ink (logo-tab.mjs §4 measures a corner at RGB 42,0,0 alpha 6, whose contrast against paper is the
// ground pair's own 17.15). The gate always sees the document exactly as shipped, rx included.
const incumbentFixture = (n) => stripComments(shippedSrc)
  .replace(/width="\d+"/, `width="${n}"`).replace(/height="\d+"/, `height="${n}"`)
  .replace(/\s+rx="[\d.]+"/g, '');

// Does the document that ships PARSE? XML 1.0 §7.4 forbids `--` inside a comment, and a tab artifact is read by a
// parser, not by a colour-literal regex. Recorded as a price, with the parser's own words (see logo-tab.mjs §4b).
const docFaults = xmlCommentFaults(shippedSrc);
let docParse = { librsvg: 'OK — the document rasterizes' };
try { await sharp(Buffer.from(shippedSrc)).resize(16, 16).raw().toBuffer(); } catch (e) { docParse.librsvg = `REFUSED: ${e.message}`; }

// ---------- 1c. THE GOLD SOLVE (the operator's steer of 2026-11-25) ----------
// "the gold color that is an established theme color of the website should be used in the logo a bit more
// prominently" is an ask about a COLOUR, and a colour in this repo is either a token @theme declares (then its
// bytes are fixed and there is nothing to solve) or a colour the palette does not declare (then a round may price
// it as a CANDIDATE and must not ship it, D316). The site's warm family (hue 35.7) is declared, so rows G1/G2 cost
// no solve; a true gold (hue ~62-75) is not declared anywhere, so rows G3/G4 can only exist if this section solves
// what lightness a gold may take in each job it is asked to do, from the gate's own bar and the shipped grounds.
//
// WHY A SOLVE AND NOT A SWATCH. A gold's legal lightness is not one number: it depends on (a) which colour it must
// not be swallowed by — a line is judged against its ground, a PLATE is judged against the lines drawn over it —
// and (b) which bar applies: the tab gate's pair bar 4.5 (check:favicon rule 4) or the layer bar 1.35 a filled
// region is held to (D101). Round 21 found the same question inverts on a dark ground (its own note: the first run
// reported the BOTTOM of the window and called it "chosen", which produced "nearest brand: Amazon ink" for a
// yellow). So both ends are measured here and the role says which end the round takes:
//   hiFor = the PALEST lightness that still clears the bar;  loFor = the DEEPEST that still clears it.
// The chosen colour is the end the role needs, clamped to the gold-ness floor when the window reaches it, and
// flagged when it does not: that flag IS the answer to "can a gold be prominent in a tab", stated as arithmetic.
const TOKENS = paletteTokens();
const GOLD_BARS = { pair: BARS.text, region: BARS.layer };
const lWindow = (H, C, againstSpec, bar) => {
  const clears = [];
  for (let L = 5; L <= 99; L += 0.5) if (contrastTriple(`oklch(${L}% ${C} ${H})`, againstSpec) >= bar) clears.push(+L.toFixed(1));
  return clears;
};
const goldTable = [];      // every (role, ground, hue, chroma) the search space contains
const goldCandidates = {}; // role-ground -> the declared candidate, with its solve attached
for (const role of GOLD_ROLES) {
  const against = TOKENS[role.against];
  const solved = [];
  for (const H of GOLD_HUES) for (const C of GOLD_CHROMAS) {
    const wPair = lWindow(H, C, against.spec, GOLD_BARS.pair);
    const wRegion = lWindow(H, C, against.spec, GOLD_BARS.region);
    if (!wPair.length) {
      goldTable.push({ ...role, H, C, against: role.against, note: `no lightness 5..99 at hue ${H} C ${C} clears ${GOLD_BARS.pair} against ${role.against} (${against.spec})` });
      continue;
    }
    const lo = wPair[0], hi = wPair.at(-1);
    // The role's `take` in one line: gold-ness wants lightness, the bar may not allow it. Take the palest legal
    // when the window's pale end is what gold-ness needs; otherwise take the deepest legal, but not below the
    // floor if the window reaches the floor.
    const L = hi >= GOLD_L_FLOOR ? Math.max(lo, GOLD_L_FLOOR) : hi;
    const spec = `oklch(${L}% ${C} ${H})`;
    const nb = nearestBrand(spec, 1)[0];
    const row = {
      ...role, H, C, against: role.against, spec, L, lo, hi, window: `${lo}..${hi}`,
      ratioAgainst: +contrastTriple(spec, against.spec).toFixed(2),
      ratioVsOwnGround: +contrastTriple(spec, TOKENS[role.ground].spec).toFixed(2),
      regionWindow: wRegion.length ? `${wRegion[0]}..${wRegion.at(-1)}` : null,
      regionRatioAtChosenL: +contrastTriple(spec, against.spec).toFixed(2),
      readsAsGold: L >= GOLD_L_FLOOR, belowFloor: L < GOLD_L_FLOOR,
      nearestBrand: nb.brand, brandDist: nb.d, sameColourAsBrand: nb.d < SAME_COLOUR_BAR,
      distToAccent: dist(spec, TOKENS.accent.spec), hueGapToAccent: hueGap(spec, TOKENS.accent.spec),
    };
    goldTable.push(row);
    if (!row.sameColourAsBrand) solved.push(row);
  }
  // Preference order, stated rather than implicit: a gold that reads as gold; then the most colour in it; then the
  // one furthest from the site's own warm accent hue, so a new gold does not read as a second accent; then the
  // lightness the role's own `take` prefers.
  const chosen = solved.sort((a, b) =>
    (Number(b.readsAsGold) - Number(a.readsAsGold))
    || (b.C - a.C)
    || (b.hueGapToAccent - a.hueGapToAccent)
    || (a.role === 'plate' && a.ground === 'ink' ? b.L - a.L : a.role === 'line' && a.ground === 'paper' ? b.L - a.L : a.L - b.L))[0] ?? null;
  if (!chosen) {
    console.error(`round23: goldSolve found no candidate for role ${role.role} on ${role.ground} that clears ${GOLD_BARS.pair} against ${role.against} and stays ${SAME_COLOUR_BAR} from every brand colour. Rows G3/G4 would price a colour that does not exist.`);
    process.exit(1);
  }
  const cand = declareCandidate(`gold-${role.role}-${role.ground}`, chosen.spec, 'design/round23.mjs goldSolve');
  goldCandidates[`${role.role}-${role.ground}`] = { candidate: cand, solve: chosen };
}

// Rows G3/G4 name their colour as `candidate: null` / `ground: null` in the options file — the colour is the
// solve's output, so the runner injects the declared names here rather than the options file guessing them.
const specFor = (row) => {
  if (row.colours === 'goldLine') {
    const c = GROUNDS.map((g) => goldCandidates[`line-${g}`]?.candidate?.name);
    if (c.some((n) => !n)) throw new Error('round23: goldLine row has no solved candidate for every ground');
    return { ...row, candidate: Object.fromEntries(GROUNDS.map((g, i) => [g, c[i]])) };
  }
  if (row.colours === 'goldPlate') {
    const c = GROUNDS.map((g) => goldCandidates[`plate-${g}`]?.candidate?.name);
    if (c.some((n) => !n)) throw new Error('round23: goldPlate row has no solved candidate for every ground');
    return { ...row, ground: Object.fromEntries(GROUNDS.map((g, i) => [g, c[i]])) };
  }
  return row;
};

const runGate = (p) => {
  const r = spawnSync(process.execPath, ['scripts/check-favicon.mjs', p], { encoding: 'utf8' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  return { exit: r.status, findings: out.split('\n').filter((l) => l.startsWith('FAIL:')).map((l) => l.slice(5).trim()), headline: out.split('\n')[0] ?? '' };
};

// ---------- 2. every row: artifact through the gate, fixture through the rasterizer and the browser ----------
const rows = ROWS.filter((r) => !ONLY || ONLY.includes(r.id)).map(specFor);
const priced = [];
for (const row of rows) {
  const incumbent = !!row.incumbent;
  const frame = incumbent ? { w: INC.width, h: INC.height, x: 0, y: 0, dx: 0, dy: 0, why: `the document's own viewBox ${INC.viewBox}` } : frameOf(row);
  const weight = incumbent ? { k: 1, scale: +(INC.width / INC.width).toFixed(4), at: null, floorPx: null, swMin: null, swMax: null } : weightFor(row, frame, row.floorPx);
  const incFraming = incumbent ? `viewBox "${INC.viewBox}" as shipped` : row.frame + (row.pad != null ? ` pad ${row.pad}` : '');
  const entry = {
    id: row.id, label: row.label, incumbent,
    framing: incFraming,
    framingWhy: frame.why, byrne: row.byrne, reading: row.reading,
    weight: incumbent ? { note: 'no stroke: the incumbent is one text glyph, not eight shapes' } : weight,
    grounds: {},
  };
  for (const ground of GROUNDS) {
    const g = { ground, sizes: {}, browser: {}, survival: [], runs: [], clip: {} };
    const entryImages = [];
    // 2a. the ARTIFACT and the REAL GATE reading it.
    const gatePath = incumbent ? SHIPPED : `${TMP}/${row.id}.${ground}.svg`;
    if (!incumbent) writeFileSync(gatePath, artifactSvg(row, ground, weight.k));
    g.gate = runGate(resolve(gatePath));
    const plan = incumbent ? INC.paints : [...new Set(LOGO_SLOTS.map((s) => colourPlan(row, ground)[s]))];
    g.plan = incumbent ? { note: `as shipped: ground ${INC_GROUND}, glyph ${INC_INK}` } : { tokens: plan, hexes: plan.map(hexOf), distinct: plan.length };
    // The GOLD PRICE for this row on this ground. A gold row paints a candidate the solve declared a few lines
    // above, so the record carries the candidate's own bytes and the window it was solved from — a reader must be
    // able to see that the colour in the artifact is the colour the arithmetic chose, not one typed in the options
    // file. The warm rows carry the measured pairs instead, because their colours are shipped tokens and the price
    // is which end of the family each ground is allowed (accent 5.77 on paper / 2.97 on ink; accent-on-ink 3.01 /
    // 5.69 @measured 2026-11-25 by this run's `warm` block).
    if (row.colours === 'goldLine' || row.colours === 'goldPlate') {
      const gc = goldCandidates[`${row.colours === 'goldLine' ? 'line' : 'plate'}-${ground}`];
      g.gold = gc ? { candidate: gc.candidate.name, spec: gc.candidate.spec, bytes: gc.candidate.bytes, token: gc.candidate.token, declaredBy: gc.candidate.declaredBy, solve: gc.solve } : null;
    }
    if (row.colours === 'warm' || row.colours === 'splitWarm') {
      g.warm = plan.map((t) => {
        const pair = contrastTriple(TOKENS[t].spec, TOKENS[ground].spec);
        return { token: t, hex: hexOf(t), hue: TOKENS[t].H, vsGround: +pair.toFixed(2), clearsPairBar: pair >= GOLD_BARS.pair, clearsGraphicBar: pair >= BARS.graphic };
      });
    }
    // 2b. the FIXTURE at every tab size, and the DISPLAY PLATE for it.
    // The plate is the SAME svg string the counters just read, rasterized at 8x the tab size so a 16px tab is
    // legible on a screen. It is not a second drawing and it is not re-rendered by the specimen builder: the round
    // writes it in the same load that measures the row (D160 — a look question arrives as pictures from the same
    // load that made its numbers), and the builder only embeds the bytes. The record names the file, so a specimen
    // with a missing plate throws instead of showing a blank.
    for (const n of WIDTHS) {
      const L = incumbent ? { canvas: n, drawW: n, drawH: n, rect: { left: 0, top: 0, width: n, height: n }, blankPx: 0, scale: +(n / INC.width).toFixed(4) } : fixtureLayout(row, n);
      const svg = incumbent ? incumbentFixture(n) : fixtureSvg(row, ground, n, weight.k);
      const img = await raster(svg, n, incumbent ? INC_GROUND : hexOf(GROUND_TOKEN[ground]));
      const st = stats(img, incumbent ? INC_GROUND : hexOf(GROUND_TOKEN[ground]), incumbent ? [INC_INK] : g.plan.hexes);
      const plate = `${TMP}/plate-${row.id}-${ground}-${n}.png`;
      await sharp(Buffer.from(svg)).resize(n * DISPLAY_FACTOR, n * DISPLAY_FACTOR)
        .flatten({ background: incumbent ? INC_GROUND : hexOf(GROUND_TOKEN[ground]) })
        .png().toFile(plate);
      entryImages.push(plate);
      entry.sizes ??= {};
      g.sizes[n] = {
        canvas: L.canvas, drawW: +L.drawW.toFixed(2), drawH: +L.drawH.toFixed(2), rect: L.rect,
        blankPx: L.blankPx, blankPct: +((100 * L.blankPx) / (L.canvas * L.canvas)).toFixed(1),
        ...st,
        features: incumbent ? { glyphPctOfPlate: +((Number(INC.glyph['font-size']) ?? 0) / INC.width).toFixed(4) } : featureSizes(row, n, weight.k),
        clipUnits: incumbent ? null : frameClip(row, weight.k),
      };
    }
    // 2c. the same fixture in a real browser, at the two sizes that decide the pick.
    for (const n of BROWSER_WIDTHS) {
      const L = incumbent ? { canvas: n } : fixtureLayout(row, n);
      const svg = incumbent ? incumbentFixture(n) : fixtureSvg(row, ground, n, weight.k);
      const img = await browserFixture(svg, { width: L.canvas, height: L.canvas });
      const st = stats(img, incumbent ? INC_GROUND : hexOf(GROUND_TOKEN[ground]), incumbent ? [INC_INK] : g.plan.hexes);
      g.browser[n] = { canvas: L.canvas, box: [img.box.left, img.box.top, img.box.width, img.box.height], shot: `${img.shot.width}x${img.shot.height}`, ...st };
      const r2 = g.sizes[n];
      g.agreement ??= {};
      g.agreement[n] = r2 ? { anyPx: [r2.anyPx, st.anyPx], at3Px: [r2.at3Px, st.at3Px], maxContrast: [r2.maxContrast, st.maxContrast] } : null;
    }
    // 2d. shape-by-shape survival, and the two arcs' dash runs — mark instruments, not glyph ones.
    if (!incumbent) {
      for (const slot of SURVIVAL_SLOTS) g.survival.push(await shapeSurvival(row, ground, 16, weight.k, slot));
      for (const slot of DASH_SLOTS) for (const n of [16, 32]) g.runs.push({ n, slot, ...(await runProfile(row, ground, n, weight.k, slot)) });
      for (const n of [16, 32]) g.clip[n] = await clipLoss(row, ground, n, weight.k);
    } else g.note = 'survival/run/clip instruments are per-shape and the incumbent has no shapes: one glyph';
    g.plates = { factor: DISPLAY_FACTOR, files: Object.fromEntries(WIDTHS.map((n, i) => [n, entryImages[i]])) };
    entry.grounds[ground] = g;
  }
  priced.push(entry);
}

// ---------- 3. the two assertions this round exists to keep true ----------
// ---------- 3. the assertions this round exists to keep true ----------
// Each is checked against the rows THIS run asked for: a `--only` subset is a diagnostic and writes no tracked
// record, so a subset that leaves the incumbent out must not be reported as a broken control. A full run (the one
// that writes design/grill/round23/report.json) is held to every one of them.
const control = priced.find((r) => r.incumbent);
const problems = [];
if (!control) {
  if (rows.some((r) => r.incumbent)) problems.push('no incumbent row was priced — the round has no control, so no framing price is anchored to the artifact that ships (D481 §c).');
} else {
  if (control.grounds.paper.gate.exit !== 0) problems.push(`the shipped tab FAILS its own gate: ${control.grounds.paper.gate.findings.join(' | ')}`);
  const c16 = control.grounds.ink.sizes[16];
  if (!c16 || c16.at3Px === 0) problems.push('the shipped tab paints nothing measurable at 16px — the instrument is broken, not the tab.');
}
if (shippedCopy.state.startsWith('DIFFERS')) problems.push(`${SHIPPED} is not the tab that ships: ${shippedCopy.path} differs (${shippedCopy.srcSha} vs ${shippedCopy.distSha}). The control would measure a source the build never copied (D245).`);
// THE PRICE THIS ROUND WAS COMMISSIONED TO ESTABLISH, RE-DERIVED (D494, S113, and D495 for the rule that a
// priced round must re-derive a gate verdict it asserts). Round 23 was built to print the tab gate's refusal of
// row C in the gate's own words. On 2026-11-25 the gate was re-ruled: the "at most two colours" cap became a
// STRUCTURE rule (one plate; every other paint a line LOGO_COLOURS names for that plate) and rule 4 measures each
// line against its bar. So the assertion now runs the other way: row C in a tab is ADMITTED — exit 0, no finding —
// and this round exits 1 if the gate ever stops admitting it. What is asserted is the VERDICT, never a colour
// count: the count depends on the ground (row C is 6 literals on paper, 5 on ink, because the plate rect counts as
// one of them), and a count is exactly the kind of number a re-rule makes false.
const rowC = priced.find((r) => r.id === 'T9');
if (rows.some((r) => r.id === 'T9')) {
  if (!rowC) problems.push('row T9 (row C in a tab artifact) was requested and not priced — the gate verdict this round exists to record is missing from it.');
  else for (const ground of GROUNDS) {
    const gate = rowC.grounds[ground].gate;
    if (gate.exit !== 0 || gate.findings.length) {
      problems.push(`row T9 on ${ground} is no longer admitted by the tab gate: exit ${gate.exit}, findings ${gate.findings.join(' | ') || 'PASS'}. The round would be publishing a specimen that says the re-derived rules admit row C while the gate says otherwise — re-derive this round, do not reprint it (D494, D495).`);
    }
  }
}
// THE SURVIVING RULE, asserted with a detector rather than a quotation. D494 kept rule 5 — a reserved
// `--color-path-*` hue may NAME a line (that is Byrne's device, a colour is a line's name, D483) but may never be
// the PLATE — and row T9 proves the line half of it. Nothing in this round plants the plate half, so the round
// runs the gate's OWN selftest, whose planting `a reserved join-path hue as the PLATE` is the live control. A rule
// quoted in prose but never fired by an artifact is a rule nobody can check.
const selftest = spawnSync(process.execPath, ['scripts/check-favicon.mjs', '--selftest'], { encoding: 'utf8' });
const selfOut = `${selftest.stdout ?? ''}${selftest.stderr ?? ''}`.trim();
const selfLine = selfOut.split('\n').filter((l) => l.trim()).at(-1) ?? '';
if (selftest.status !== 0 || !/0 wrong/.test(selfLine)) {
  problems.push(`check:favicon's own detector is broken (exit ${selftest.status}: ${selfLine || 'no output'}), so this round cannot assert which of its rules still fire (D494).`);
}
// THE FOUR GOLD PRICES, asserted. Each line is a claim the specimen page and NEXT.md make about the gate, so a
// change in the gate or the palette has to fail this run rather than quietly change the specimen's wording.
// Re-derived against the seven-rule gate (D494): `strings` lists every rule the gate actually names for that row,
// because a row can be refused twice (G3 and G4 are refused by rule 2 AND rule 3) and requiring one finding to
// carry one fragment would make a more honest gate read as a broken assertion.
//   G1 the site's warm family on every line -> ADMITTED: two declared tokens, the pair clears 4.5. The prominent
//      warm that costs no token and no ruling.
//   G2 warm meridians on an ink body        -> ADMITTED: three paints, every one a line the logo names for its
//      plate, each clearing its bar. The count cap was the only thing refusing it (D494).
//   G3 a true gold line / G4 a gold plate   -> REFUSED twice each: the literal is not a token @theme renders
//      (rule 2), and it is not a line/ground the logo's table names (rule 3).
const GOLD_GATE = [
  ['G1', { exit: 0, strings: [], why: 'the gate accepts the warm family: two declared tokens, pair over 4.5' }],
  ['G2', { exit: 0, strings: [], why: 'the re-derived rule 3 accepts three paints: every line is one the logo names for its plate (D494)' }],
  ['G3', { exit: 1, strings: ['is not a token', 'not a line the logo names'], why: 'a solved gold literal is refused until @theme declares it (rule 2), and it is not a line LOGO_COLOURS names (rule 3)' }],
  ['G4', { exit: 1, strings: ['is not a token', 'not one of the grounds'], why: 'a gold PLATE is refused on the same two rules: the literal is not a token, and a plate must be one of the grounds LOGO_COLOURS is keyed to' }],
];
for (const [id, want] of GOLD_GATE) {
  if (!rows.some((r) => r.id === id)) continue;
  const r = priced.find((x) => x.id === id);
  if (!r) { problems.push(`row ${id} (the operator's gold steer) was requested and not priced.`); continue; }
  for (const ground of GROUNDS) {
    const gate = r.grounds[ground].gate;
    if (gate.exit !== want.exit) problems.push(`row ${id} on ${ground}: the gold steer's price changed — expected exit ${want.exit} (${want.why}), got ${gate.exit}: ${gate.findings.join(' | ') || 'PASS'}.`);
    for (const s of want.strings) if (!gate.findings.some((f) => f.includes(s))) problems.push(`row ${id} on ${ground}: exit ${gate.exit} but no finding names "${s}" (${gate.findings.join(' | ')}). The record states WHICH rule refuses this row, and that rule is not what fired.`);
  }
}

// ---------- 4. the record ----------
const report = {
  round: 23,
  measuredAt: new Date().toISOString(),
  ask: 'the third quarter of the Byrne logo item: put the ratified logo (row C, D483) in the tab. Operator framing of the ask: "square sphere-centred variant, full 240x150 letterbox, weight-scaled variants".',
  instrument: 'logo-tab.mjs (the tab instrument) + scripts/check-favicon.mjs run as a subprocess on every artifact, never reimplemented',
  tabSlot: { px: 16, source: 'MDN "Favicon" (fetched 2026-11-25): "Usually, a favicon is 16 x 16 pixels in size"' },
  widths: WIDTHS, browserWidths: BROWSER_WIDTHS,
  figure: FIGURE,
  plates: `each row x ground x tab size is rasterized once at ${DISPLAY_FACTOR}x the tab size (from the SAME svg string the pixel counters read) and written to .design/tmp-round23/plate-<id>-<ground>-<size>.png; design/grill/round23-build.mjs embeds those bytes and throws if one is missing`,
  incumbent: { source: SHIPPED, parsed: INC, groundHex: INC_GROUND, inkHex: INC_INK, shippedCopy, document: { xmlCommentFaults: docFaults, parse: docParse } },
  controls: {
    incumbentGateExit: control?.grounds.paper.gate.exit ?? null,
    rowCVerdict: rowC ? GROUNDS.map((g) => ({ ground: g, exit: rowC.grounds[g].gate.exit, findings: rowC.grounds[g].gate.findings, admitted: rowC.grounds[g].gate.exit === 0 })) : null,
    gateSelftest: { exit: selftest.status, line: selfLine, why: "the live control for the rules this round asserts: the re-derived rule admits row C line colours, and the selftest plants a reserved path hue as the PLATE and must still fail it (D494, D495)" },
    goldGate: GOLD_GATE.map(([id, want]) => {
      const r = priced.find((x) => x.id === id);
      return { id, expected: want, grounds: r ? GROUNDS.map((g) => ({ ground: g, exit: r.grounds[g].gate.exit, findings: r.grounds[g].gate.findings })) : 'not priced' };
    }),
  },
  gold: {
    steer: 'operator, 2026-11-25: "Regarding the logo, I feel like the gold color that is an established theme color of the website should be used in the logo a bit more prominently. Ensure some options you create to share with me consider that."',
    referents: {
      // `tokens` is the family as the tab is allowed to use it (one warm token per ground); `matrix` is every warm
      // token against every ground, because the cross pairs are the whole finding — accent is legal on paper and
      // BANNED on ink by the 3.0 graphic bar, which is why WARM_TOKEN is not a preference but a permission.
      // Recorded, not printed: design/grill/round23-build.mjs generates its gold section from this record, and a
      // builder that recomputed the contrast would be a second copy of the WCAG math (D282: one home per rule).
      warm: { what: "the site's own warm accent family, hue 35.7 — the family the role `gold` held before D316 renamed it", tokens: GROUNDS.map((g) => ({ ground: g, token: WARM_TOKEN[g], hex: hexOf(WARM_TOKEN[g]), spec: TOKENS[WARM_TOKEN[g]].spec, vsGround: +contrastTriple(TOKENS[WARM_TOKEN[g]].spec, TOKENS[g].spec).toFixed(2) })), costs: 'nothing: declared, shipped, and a two-paint tab the gate accepts (row G1)', matrix: { note: `every warm token against every ground at the tab bar ${GOLD_BARS.pair} and the graphic bar ${BARS.graphic}`, graphicBar: BARS.graphic, cells: GROUNDS.flatMap((ground) => GROUNDS.map((g) => WARM_TOKEN[g]).flatMap((token) => { const pair = contrastTriple(TOKENS[token].spec, TOKENS[ground].spec); return { token, ground, hex: hexOf(token), spec: TOKENS[token].spec, hue: TOKENS[token].H, vsGround: +pair.toFixed(2), clearsPairBar: pair >= GOLD_BARS.pair, clearsGraphicBar: pair >= BARS.graphic }; })) } },
      trueGold: { what: 'a true gold/ochre hue, 62-75 — declared by NO token today (the role `gold` was retired with its name and the palette round refused the amber read, D316)', costs: 'a new @theme token, which is the operator\'s act to take, so these rows are priced as declared CANDIDATES and are refused by check:favicon rule 2 as they stand' },
    },
    searchSpace: { hues: GOLD_HUES, chromas: GOLD_CHROMAS, lFloor: GOLD_L_FLOOR, lFloorSource: 'round 21\'s YELLOW_L_FLOOR (design/round21.mjs:131) — a STATED JUDGEMENT, not a ratified bar', bars: { pair: GOLD_BARS.pair, pairSource: 'scripts/check-favicon.mjs rule 4 (the text bar, applied to a 16px tab glyph)', region: GOLD_BARS.region, regionSource: 'D101: a filled region is a layer at 1.35, not a graphic line' } },
    table: goldTable,
    candidates: Object.fromEntries(Object.entries(goldCandidates).map(([k, v]) => [k, { name: v.candidate.name, spec: v.candidate.spec, bytes: v.candidate.bytes, token: v.candidate.token, declaredBy: v.candidate.declaredBy, role: v.solve.role, ground: v.solve.ground, against: v.solve.against, windowPair: v.solve.window, L: v.solve.L, ratioAgainst: v.solve.ratioAgainst, readsAsGold: v.solve.readsAsGold, belowFloor: v.solve.belowFloor }])),
  },
  rows: priced.map((r) => ({
    id: r.id, label: r.label, incumbent: r.incumbent, framing: r.framing, framingWhy: r.framingWhy,
    byrne: r.byrne, reading: r.reading, weight: r.weight, grounds: r.grounds,
  })),
};
const REPORT = SUBSET ? `${TMP}/report-subset.json` : 'design/grill/round23/report.json';
mkdirSync(resolve(REPORT, '..'), { recursive: true });
writeFileSync(REPORT, JSON.stringify(report, null, 1) + '\n');

// ---------- 5. print ----------
console.log(`BYRNE ROUND 23 — the TAB. ${rows.length} rows x 2 grounds; tab slot ${report.tabSlot.px}px (MDN); librsvg at ${WIDTHS.join('/')}, firefox at ${BROWSER_WIDTHS.join('/')}.`);
console.log(`figure: plate ${FIGURE.plate.w}x${FIGURE.plate.h}u, sphere span ${FIGURE.sphereSpanUnits}u, strokes ${FIGURE.minStrokeUnits}-${FIGURE.maxStrokeUnits}u, dot ${FIGURE.dotDiameterUnits}u, angle arm ${FIGURE.angleArmUnits}u, feet ${FIGURE.footSeparationUnits}u apart, equator dash ${FIGURE.equatorDash.join('/')}`);
console.log(`control: ${SHIPPED} parsed -> ${INC.width}x${INC.height} viewBox "${INC.viewBox}" rx ${INC.rx}, paints ${INC.paints.join(' + ')}, glyph "${INC.glyph?.char}" ${INC.glyph?.['font-family']} ${INC.glyph?.['font-size']}. built copy: ${shippedCopy.state}${shippedCopy.srcSha ? ` ${shippedCopy.srcSha}/${shippedCopy.distSha}` : ''}`);
console.log(`document: ${docFaults.length ? 'NOT WELL-FORMED XML — ' + docFaults.length + ' comment(s) carry "--" (XML 1.0 7.4): ' + docFaults.map((f) => f.snippet).join(' / ') : 'well-formed'} | librsvg: ${docParse.librsvg}`);

console.log('\n=== THE GATE, READ ALOUD (scripts/check-favicon.mjs on the artifact each row would ship) ===');
for (const r of priced) for (const ground of GROUNDS) {
  const g = r.grounds[ground];
  console.log(`${r.id} ${ground.padEnd(5)} exit ${g.gate.exit}  ${g.plan.note ?? `${g.plan.distinct} token(s): ${g.plan.tokens.join(', ')}`}  ${g.gate.findings.length ? 'REFUSED: ' + g.gate.findings.join(' || ') : 'PASSES all seven rules'}`);
}

console.log('\n=== GOLD (the operator\'s steer of 2026-11-25): the solved window for each job, then what was chosen ===');
console.log(`search space: hues ${GOLD_HUES.join('/')} x chroma ${GOLD_CHROMAS.join('/')} · gold-ness floor L ${GOLD_L_FLOOR} (round 21's stated judgement) · bars: pair ${GOLD_BARS.pair} (check:favicon rule 4), region ${GOLD_BARS.region} (D101 layer)`);
for (const t of goldTable) {
  if (t.note) { console.log(`${t.role.padEnd(5)} on ${t.ground.padEnd(5)} vs ${t.against.padEnd(5)} hue ${String(t.H).padStart(3)} C ${t.C}  ${t.note}`); continue; }
  console.log(`${t.role.padEnd(5)} on ${t.ground.padEnd(5)} vs ${t.against.padEnd(5)} hue ${String(t.H).padStart(3)} C ${t.C}  clears ${GOLD_BARS.pair} for L ${t.window} → take L ${t.L} (${t.spec}) measures ${t.ratioAgainst}${t.belowFloor ? `  BELOW the gold floor ${GOLD_L_FLOOR}: legal but reads as bronze/ochre` : '  reads as gold'}  nearest brand ${t.nearestBrand} d=${t.brandDist}${t.sameColourAsBrand ? ' SAME COLOUR (refused)' : ''}  vs accent d=${t.distToAccent} hue gap ${t.hueGapToAccent}deg  region window at ${GOLD_BARS.region}: ${t.regionWindow ?? 'none'}`);
}
for (const [k, v] of Object.entries(goldCandidates)) {
  const s = v.solve;
  console.log(`declared candidate ${k.padEnd(12)} ${v.candidate.name} = ${v.candidate.spec} -> #${v.candidate.bytes.map((b) => b.toString(16).padStart(2, '0')).join('')} (candidate, NOT a token) from window ${s.window}${s.belowFloor ? ' · below the gold floor' : ''}`);
}
console.log('warm family, measured (the referent that costs no token): ' + GROUNDS.map((g) => `accent vs ${g} ${contrastTriple(TOKENS.accent.spec, TOKENS[g].spec).toFixed(2)} / accent-on-ink ${contrastTriple(TOKENS['accent-on-ink'].spec, TOKENS[g].spec).toFixed(2)}`).join('  |  ') + `  (the 3.0 graphic bar bans accent on ink; the 4.5 tab bar is what each gold row is solved against)`);

console.log('\n=== FIT AND PAINT AT THE TAB SIZES (librsvg; blankPx = tab area the logo does not cover) ===');
for (const r of priced) for (const ground of GROUNDS) {
  const g = r.grounds[ground];
  console.log(`\n${r.id} ${r.framing} on ${ground}${r.weight.at ? `  weight k ${r.weight.k} for ${r.weight.floorPx}px at ${r.weight.at}` : '  (no weight tuning)'}`);
  for (const n of WIDTHS) {
    const s = g.sizes[n];
    console.log(`  ${String(n).padStart(2)}px  canvas ${s.canvas} draw ${s.drawW}x${s.drawH} @${s.rect.left},${s.rect.top}  blank ${s.blankPx}px (${s.blankPct}%)  any ${s.anyPx} at3 ${s.at3Px} (${s.coveragePct}%) full ${s.fullPx} max ${s.maxContrast}`);
    if (s.features.ringDiameterPx != null) console.log(`        ring ${s.features.ringDiameterPx} stroke ${s.features.strokeMinPx}-${s.features.strokeMaxPx} dot ${s.features.dotDiameterPx} arm ${s.features.angleArmPx} feet ${s.features.footSeparationPx} dash ${s.features.dashOnPx}/${s.features.dashOffPx}`);
    else console.log(`        glyph ${s.features.glyphPctOfPlate * 100}% of the plate`);
    if (s.clipUnits) console.log(`        frame clip ${s.clipUnits.left}/${s.clipUnits.right}/${s.clipUnits.top}/${s.clipUnits.bottom}u max ${s.clipUnits.max}u`);
  }
}

console.log('\n=== THE SAME FIXTURE IN A REAL BROWSER (firefox, headless; librsvg | browser) ===');
for (const r of priced) for (const ground of GROUNDS) {
  const g = r.grounds[ground];
  console.log(`${r.id} ${ground.padEnd(5)} ` + BROWSER_WIDTHS.map((n) => {
    const a = g.agreement?.[n]; const br = g.browser[n];
    return a ? `${n}px any ${a.anyPx[0]}|${a.anyPx[1]} at3 ${a.at3Px[0]}|${a.at3Px[1]} max ${a.maxContrast[0]}|${a.maxContrast[1]} box ${br.box.join(',')}` : `${n}px (no librsvg pair)`;
  }).join('   '));
}

console.log('\n=== SURVIVAL AT 16px: which of the eight shapes lands, shape by shape ===');
for (const r of priced.filter((x) => !x.incumbent)) for (const ground of GROUNDS) {
  const g = r.grounds[ground];
  console.log(`${r.id} ${ground.padEnd(5)} ` + g.survival.map((s) => `${s.slot} ${s.swDevice}px any${s.anyPx} at3=${s.at3Px} full=${s.fullPx}`).join(' | '));
}

console.log('\n=== THE DASH: the rear arc vs the front arc, walked along their own geometry ===');
for (const r of priced.filter((x) => !x.incumbent)) for (const ground of GROUNDS) {
  const g = r.grounds[ground];
  const rear = g.runs.filter((x) => x.slot === 'rear'), front = g.runs.filter((x) => x.slot === 'front');
  console.log(`${r.id} ${ground.padEnd(5)} ` + [16, 32].map((n) => {
    const a = rear.find((x) => x.n === n), b = front.find((x) => x.n === n);
    return `${n}px rear ${a.onInkPct}% ink ${a.runs} runs longest ${a.longestRunPx}px | front ${b.onInkPct}% ${b.runs} runs ${b.longestRunPx}px ${a.runs === 1 ? 'FUSED' : ''}`;
  }).join(' | '));
}

console.log('\n=== CLIP IN INK: pixels the framing pushes outside its own frame (the tab cannot show them) ===');
for (const r of priced.filter((x) => !x.incumbent)) for (const ground of GROUNDS) {
  const g = r.grounds[ground];
  console.log(`${r.id} ${ground.padEnd(5)} ` + [16, 32].map((n) => `${n}px spill ${g.clip[n].worstDevicePx}px pad ${g.clip[n].padPx} lost ${g.clip[n].clipLossPx}px (at3 ${g.clip[n].clipAt3Px})`).join(' | '));
}

console.log(`\nwrote ${REPORT}${SUBSET ? ' (SUBSET run — the tracked record at design/grill/round23/report.json was NOT overwritten)' : ''}; artifacts in ${TMP}/`);
if (problems.length) { console.error('MACHINERY: ' + problems.join('; ')); process.exit(1); }
console.log("CONTROLS HOLD: the shipped tab passes its own gate and paints at 16px, its built copy is byte-identical, the re-derived gate admits row C on both grounds, and the favicon gate's own detector still refuses a reserved path hue used as the plate.");
