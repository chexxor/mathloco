#!/usr/bin/env node
// round22.mjs — grill round 22: the Byrne FACE colourings of the club logo, PRICED, not applied (2026-11-24).
//
//   node design/round22.mjs                     # every row, both grounds, three hero widths
//   node design/round22.mjs --only F1,F4        # a subset (writes a SUBSET record to .design/, never the tracked one)
//   node design/round22.mjs --widths 640        # a narrower width set (same guard: a subset record, never the tracked one)
//
// WHAT THIS ROUND OWES THE OPERATOR. The seventh ruling on this logo (D483) took Byrne row C for the LINES and
// asked, in the same sentence, for "options for coloring faces of the shape also in the Byrne style". Round 21
// priced lines; this round prices regions. Nothing here ships — colour is operator-ratified (D316) — so every
// number below is a price, and the specimen at design/grill/round-22-faces.html is what the pick is made from.
//
// THE FOUR PRICES, in the order a reader needs them:
//
//   AREA, measured twice. Each face is measured PROJECTED (dense sampling + shoelace over a boundary built from
//   the logo's own curves) and ON THE SPHERE this drawing implies (Girard for the triangle, 2·angle·r² for the
//   lunes). `assertAreas` refuses the round if the two disagree past 2%, if the two lunes do not tile the visible
//   face, or if the disc's foreshortening is not 0.50 — a face whose stated geometry does not survive its own
//   measurement is a claim without a probe.
//
//   THE TWO-BAR SQUEEZE. A fill is a LAYER (1.35, D101) against its ground. But a fill is also a GROUND for every
//   line drawn over it, and a line is held to the graphic bar (3.0). Which lines are over which face is not an
//   opinion: it is measured by sampling each shape's own geometry against each face's polygon (inside, or within
//   1.2 viewBox units of its edge). For every hue family the palette already declares, the round solves the
//   LIGHTNESS WINDOW that survives both bars at once, and prints its edges. The window is the finding.
//
//   SHAPE COUNT. This logo's gates count shapes: logo-geometry.mjs zips the painted report against the
//   table and accepts exactly `table + 1` (the pole dot, which is painted but not in the table). A planted face
//   makes 9, and both logo probes refuse. That refusal is printed VERBATIM as the cost of shipping a face, because
//   "the gates went red" and "the gates need re-ruling" are different decisions and only the second is a
//   design choice (D479: a gate is re-derived, never bypassed).
//
//   PAINT. Every row is planted in a COPY of the built page and measured by the probes `check:logo` runs, at
//   320/640/1240, plus the share card's own document at 1200x630. Token arithmetic cannot see a half-covered
//   blend; the pixel probe can. The CONTROL row is the shipped colouring with nothing filled, FOUND by matching
//   `LOGO_COLOURS` (D481 §c), and if it does not pass its own probes the round exits 1 — a mutation that cannot
//   reproduce the artifact measures nothing.
//
// A round, not a gate (D269's reason, same class as check:area / check:rhythm / check:color): it prints numbers
// and never a verdict, so in `verify` it would cost a build and a browser for no verdict. It DOES exit 1 when the
// machinery itself broke.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { LOGO, LOGO_SLOTS, LOGO_COLOURS, LOGO_SHAPE_COUNT } from '../src/lib/logo.mjs';
import { paletteTokens, declareCandidate } from './palette-tokens.mjs';
import { contrastTriple, BARS, hueGap, nearestBrand, SAME_COLOUR_BAR, dist } from './grill/okcolor.mjs';
import { FACES, FACE_GEOMETRY, faceAreas, assertAreas, faceBy, facePolygon } from './logo-faces.mjs';
import { ROWS, LINES, FAMILIES, GOLD_FAMILY, GOLD_HUES, GOLD_CHROMAS } from './grill/round22-options.mjs';
import { recolourPage, recolourCard, labelsFor, hueOfPaint } from './grill/paint-logo.mjs';
import { distState, staleLine } from './dist-fresh.mjs';
import { shotHeight } from './grill/shot-height.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] ?? d : d; };
const WIDTHS = flag('widths', '320,640,1240').split(',').map(Number);
const ONLY = flag('only', null)?.split(',').map((s) => s.trim().toUpperCase());
// THE SUBSET GUARD (the shape design/round23.mjs:71 has had since round 23 landed; round 22 did not, which meant a
// `--only F6` run would have OVERWRITTEN the tracked committed record with a partial one and a later `check:logo`-style
// reader could not tell the difference). A run that is not the full row set and the full width set writes its record to
// .design/ scratch, so the tracked record is only ever written by a run that measured everything the specimen claims.
const FULL_WIDTHS = '320,640,1240';
const SUBSET = ONLY != null || WIDTHS.join(',') !== FULL_WIDTHS;

const TMP = '.design/tmp-round22';
const DIST = resolve(TMP, 'dist');
mkdirSync(TMP, { recursive: true });

// ---------- 0. guards ----------
const ST = distState();
if (!ST.fresh && !ST.allowed) { console.error(`round22: ${staleLine(ST)}`); process.exit(1); }
const TOKENS = paletteTokens();
const tok = (name) => {
  const t = TOKENS[name];
  if (!t) throw new Error(`round22: --color-${name} is not declared in src/styles/global.css. Options: ${Object.keys(TOKENS).join(', ')}`);
  return t;
};
const GROUNDS = { paper: tok('paper'), ink: tok('ink') };

// The CONTROL is derived, not named. The rows' line maps are IMPORTED from the shipped table, so the guard is on
// the import itself: if `LINES` no longer equals LOGO_COLOURS the whole round prices a logo the site does not have.
const linesAreShipped = LOGO_SLOTS.every((s) => LINES.paper[s] === LOGO_COLOURS.paper[s] && LINES.ink[s] === LOGO_COLOURS.ink[s]);
const shipped = ROWS.filter((r) => r.faces.length === 0 && linesAreShipped);
if (shipped.length !== 1) throw new Error(`round22: ${shipped.length ? `rows ${shipped.map((r) => r.id).join(', ')} all` : 'NO row'} reproduce the shipped line colouring in src/lib/logo.mjs LOGO_COLOURS. There is no CONTROL, so no face price in this round is anchored to the artifact — D481 §c.`);
const CONTROL = shipped[0];

// ---------- 1. AREA: every face, measured twice ----------
const areas = faceAreas();
const geomProblems = assertAreas(areas);
if (geomProblems.length) { console.error('round22: the face geometry this round prices does not survive its own assertions:\n  ' + geomProblems.join('\n  ')); process.exit(1); }
const areaBy = Object.fromEntries(areas.map((a) => [a.name, a]));

// ---------- 2. WHICH LINES LIE OVER WHICH FACE (measured, not asserted) ----------
// A fill changes the bar a line is held to only where the line actually sits on the fill. So each shape's own
// geometry is sampled and tested against each face's polygon: strictly inside, or within 1.2 viewBox units of the
// face's edge (half a 1.4-unit stroke plus slack — a line whose ink straddles the boundary is half on it).
const SAMPLES = 160, ON_EDGE = 1.2;
const sampleShape = (slot) => {
  const sh = slot === 'dot' ? LOGO.dot : LOGO.shapes.find((s) => s.slot === slot);
  if (!sh) throw new Error(`round22: no shape in the table for slot "${slot}"`);
  if (sh.tag === 'circle') {
    const pts = [[sh.cx, sh.cy]];
    for (let i = 0; i < SAMPLES; i++) { const a = 2 * Math.PI * i / SAMPLES; pts.push([sh.cx + sh.r * Math.cos(a), sh.cy + sh.r * Math.sin(a)]); }
    return pts;
  }
  const nums = sh.d.match(/-?\d+(\.\d+)?/g).map(Number);
  const cmds = [...sh.d.matchAll(/[MLC]/g)].map((m) => m[0]);
  const pts = [[nums[0], nums[1]]];
  let i = 2;
  for (let c = 1; c < cmds.length; c++) {
    if (cmds[c] === 'L') { pts.push([nums[i++], nums[i++]]); continue; }
    const p0 = pts[pts.length - 1], c1 = [nums[i++], nums[i++]], c2 = [nums[i++], nums[i++]], p3 = [nums[i++], nums[i++]];
    for (let s = 1; s <= SAMPLES; s++) {
      const t = s / SAMPLES, u = 1 - t;
      pts.push([u ** 3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p3[0],
        u ** 3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p3[1]]);
    }
  }
  return pts;
};
const inPoly = (pt, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const distToPoly = (pt, poly) => {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i];
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((pt[0] - ax) * dx + (pt[1] - ay) * dy) / L2)) : 0;
    best = Math.min(best, Math.hypot(pt[0] - (ax + t * dx), pt[1] - (ay + t * dy)));
  }
  return best;
};
const polygons = Object.fromEntries(FACES.map((f) => [f.name, facePolygon(f.name)]));
const coverage = {};
for (const f of FACES) {
  coverage[f.name] = {};
  for (const slot of LOGO_SLOTS) {
    const pts = sampleShape(slot), poly = polygons[f.name];
    let inside = 0, on = 0;
    for (const p of pts) { if (inPoly(p, poly)) inside++; else if (distToPoly(p, poly) <= ON_EDGE) on++; }
    const frac = +((inside + on) / pts.length).toFixed(3);
    coverage[f.name][slot] = { frac, inside: +(inside / pts.length).toFixed(3), onEdge: +(on / pts.length).toFixed(3) };
  }
}
// A shape that even touches the fill is drawn ON it, so it owes the fill the graphic bar.
const overSlots = (face) => LOGO_SLOTS.filter((s) => coverage[face][s].frac >= 0.25);

// ---------- 3. the two-bar window, per hue family, per face, per ground ----------
// For a family the palette already has, the lightness window in which a fill (a) reads as a region against its
// ground (>= 1.35) and (b) leaves every line drawn over it legible against the FILL (>= 3.0). The candidate the
// rows paint is the window MIDPOINT — the point furthest from both bars, which is the safest place in a window
// that is usually only a few tenths of a lightness wide.
// A family is either a hue the palette ALREADY declares (a token name, resolved through @theme) or a hue it does
// not (rows F6-F9's gold, the operator's steer of 2026-11-25). A candidate family carries no `tokenL` because there
// is no token to compare with, and its lightness is NOT the window mid: gold-ness is a property of how a hue READS,
// so the round takes the floor-clamped end (see `take` below) and flags the case where the window never reaches it.
const familyOf = (name) => {
  const fam = FAMILIES[name];
  if (fam) return { family: name, H: fam.H, C: fam.C, tokenL: null, tokens: [], candidate: true, floor: fam.floor };
  const t = tok(name);
  return { family: name, H: t.H, C: t.C, tokenL: t.L, tokens: [name], candidate: false };
};
function bandFor(H, C, ground, overTokens) {
  const ok = [];
  for (let L = 1; L <= 99; L += 0.5) {
    const spec = `oklch(${L}% ${C} ${H})`;
    if (contrastTriple(spec, ground.spec) < BARS.layer) continue;
    let minLine = Infinity;
    for (const t of overTokens) minLine = Math.min(minLine, contrastTriple(t.spec, spec));
    if (minLine >= BARS.graphic) ok.push(L);
  }
  if (!ok.length) return null;
  return { lo: ok[0], hi: ok.at(-1), mid: ok[Math.floor((ok.length - 1) / 2)], n: ok.length };
}
// Each face row paints its fill per GROUND, the way LOGO_COLOURS carries a pair per ground: a pale wash that reads
// on paper is invisible on the card, and a dark one that reads on the card is a hole in the hero.
const faceSolve = {};      // face -> ground -> { spec, ratio, minLine, nearest, token, newToken }
for (const f of FACES) {
  faceSolve[f.name] = {};
  const over = overSlots(f.name);
  for (const [ground, g] of Object.entries(GROUNDS)) {
    const overTokens = over.map((s) => tok(LINES[ground][s]));
    const rep = { over, rows: {} };
    for (const name of [...new Set(ROWS.flatMap((r) => r.faces.map((fc) => fc.family)))]) {
      const fam = familyOf(name);
      const b = bandFor(fam.H, fam.C, g, overTokens);
      if (!b) { rep.rows[name] = { family: name, H: fam.H, C: fam.C, band: null, note: `no lightness of hue ${fam.H} C ${fam.C} both reads as a region on ${ground} AND keeps ${over.map((s) => LINES[ground][s]).join(',')} legible` }; continue; }
      // WHICH LIGHTNESS THE ROUND TAKES. For a declared family that is the window mid, the point furthest from both
      // bars. For a gold it is the lightness at which the hue reads as gold (round 21's stated floor), clamped into
      // the window: the palest legal lightness at or above the floor when the window reaches it, otherwise the pale
      // end it can reach, FLAGGED as below the floor. That flag is the steer's price stated as arithmetic — a gold
      // face can be pushed below the lightness where hue 75 still reads as gold, and the round prints which faces
      // that happens to instead of quietly picking a browner colour and calling it gold.
      const atOrAbove = b.hi >= fam.floor;
      const L = fam.candidate ? (atOrAbove ? Math.max(b.lo, fam.floor) : b.hi) : b.mid;
      const spec = `oklch(${L}% ${fam.C} ${fam.H})`;
      const nb = nearestBrand(spec, 1)[0];
      const reuse = Object.entries(TOKENS).map(([n, t]) => [n, dist(spec, t.spec)]).sort((a, b2) => a[1] - b2[1])[0];
      const cand = fam.candidate
        ? declareCandidate(`gold-face-${f.name}-${ground}`, spec, 'design/round22.mjs faceSolve')
        : null;
      rep.rows[name] = {
        family: name, H: fam.H, C: fam.C, tokenL: fam.tokenL, band: b, L, spec,
        take: fam.candidate
          ? (atOrAbove
            ? `L ${L} — the gold-ness floor ${fam.floor} sits inside the window, so the round takes the DEEPEST lightness that still reads as gold (the window's own low end L ${b.lo} is already deeper than the floor; the mid L ${b.mid} would be a paler, quieter region for no gain)`
            : `L ${L} — the PALEST end of the window: the gold-ness floor ${fam.floor} is out of reach, so this face is bronze/ochre, not gold`)
          : `L ${b.mid} — the window mid`,
        goldFloor: fam.candidate ? fam.floor : null,
        readsAsGold: fam.candidate ? L >= fam.floor : null,
        belowFloor: fam.candidate ? L < fam.floor : null,
        candidate: cand ? cand.name : null,
        candidateSpec: cand ? cand.spec : null,
        candidateBytes: cand ? cand.bytes : null,
        vsGround: +contrastTriple(spec, g.spec).toFixed(2),
        minLineOver: +Math.min(...over.map((s) => contrastTriple(tok(LINES[ground][s]).spec, spec))).toFixed(2),
        nearestBrand: nb.brand, brandDist: nb.d, sameAsBrand: nb.d < SAME_COLOUR_BAR,
        nearestToken: reuse[0], nearestTokenDist: reuse[1], reuses: reuse[1] < SAME_COLOUR_BAR ? reuse[0] : null,
      };
    }
    faceSolve[f.name][ground] = rep;
  }
}
// The families the rows do NOT pick, priced anyway: the window exists or it does not, and that is the fact a
// future round would otherwise have to re-derive.
const census = [];
for (const [name, t] of Object.entries(TOKENS)) {
  const row = { token: name, spec: t.spec, H: t.H, C: t.C, L: t.L };
  for (const [ground, g] of Object.entries(GROUNDS)) {
    const r = +contrastTriple(t.spec, g.spec).toFixed(2);
    row[ground] = { vsGround: r, readsAsRegion: r >= BARS.layer };
  }
  census.push(row);
}
const censusTally = {
  paper: census.filter((c) => c.paper.readsAsRegion).length,
  ink: census.filter((c) => c.ink.readsAsRegion).length,
  total: census.length,
  paperFails: census.filter((c) => !c.paper.readsAsRegion).map((c) => `${c.token} ${c.paper.vsGround}`),
};

// ---------- 3b. THE GOLD MATRIX: every hue/chroma pair the search space offers, per face, per ground ----------
// The rows F6-F9 each take ONE pair (the one round 23's tab solve preferred). This table prices the other three, so
// the answer to "could a gold face exist that is not the colour the rows paint?" is arithmetic in the record rather
// than a claim in prose — and specifically whether any pair escapes the brand collision the chosen pair lands in on
// paper (Amazon yellow #FFB300, delta-OKLab 0.032 against the 0.05 same-colour bar, D316). Solve only: no paint, no
// token declared, because a candidate the round does not paint would be a colour with a name and no measurement.
const goldMatrix = [];
for (const fn of FACES) for (const ground of ['paper', 'ink']) {
  const overTokens = faceSolve[fn.name][ground].over.map((s) => tok(LINES[ground][s]));
  for (const H of GOLD_HUES) for (const C of GOLD_CHROMAS) {
    const b = bandFor(H, C, GROUNDS[ground], overTokens);
    if (!b) { goldMatrix.push({ face: fn.name, ground, H, C, note: `no lightness 1..99 at hue ${H} C ${C} reads as a region on ${ground} AND keeps ${faceSolve[fn.name][ground].over.join(',')} legible` }); continue; }
    const L = b.hi >= GOLD_FAMILY.floor ? Math.max(b.lo, GOLD_FAMILY.floor) : b.hi;
    const spec = `oklch(${L}% ${C} ${H})`;
    const nb = nearestBrand(spec, 1)[0];
    goldMatrix.push({
      face: fn.name, ground, H, C, band: b, L, spec,
      readsAsGold: L >= GOLD_FAMILY.floor, belowFloor: L < GOLD_FAMILY.floor,
      vsGround: +contrastTriple(spec, GROUNDS[ground].spec).toFixed(2),
      minLineOver: +Math.min(...overTokens.map((t) => contrastTriple(t.spec, spec))).toFixed(2),
      nearestBrand: nb.brand, brandDist: nb.d, sameAsBrand: nb.d < SAME_COLOUR_BAR,
      chosen: H === GOLD_FAMILY.H && C === GOLD_FAMILY.C,
    });
  }
}
const goldCollisions = goldMatrix.filter((m) => m.sameAsBrand).map((m) => `${m.face}/${m.ground} hue ${m.H} C ${m.C} -> ${m.nearestBrand} d=${m.brandDist}`);

// ---------- 4. each row: the colours it would paint, the tokens it would cost ----------
const priced = ROWS.map((r) => {
  const row = { id: r.id, label: r.label, byrne: r.byrne, reading: r.reading, faces: r.faces.map((fc) => String(fc.face)), control: r.id === CONTROL.id, grounds: {} };
  for (const ground of ['paper', 'ink']) {
    const fills = r.faces.map((fc) => {
      const s = faceSolve[fc.face]?.[ground]?.rows[fc.family];
      if (!s) throw new Error(`round22: row ${r.id} fills "${fc.face}" in family ${fc.family} on ${ground}, which has no band. Fix the row or price the failure, do not paint it.`);
      return { face: fc.face, family: fc.family, spec: s.spec, L: s.L, token: s.reuses ?? (s.candidate ? `NEW CANDIDATE ${s.candidate} (@theme declares no gold)` : `NEW ${fc.family}-wash`), ...s };
    });
    const newTokens = fills.filter((f) => !f.reuses).length;
    let faceGap = null, facePair = '';
    for (let i = 0; i < fills.length; i++) for (let j = i + 1; j < fills.length; j++) {
      const gp = hueGap(fills[i].spec, fills[j].spec), dd = dist(fills[i].spec, fills[j].spec);
      if (faceGap === null || gp < faceGap.gap) faceGap = { gap: gp, dist: dd };
      facePair = `${fills[i].face}/${fills[j].face}`;
    }
    row.grounds[ground] = { fills, newTokens, faceGap: faceGap ? { pair: facePair, gap: +faceGap.gap.toFixed(1), labDist: faceGap.dist, distinctName: faceGap.dist >= SAME_COLOUR_BAR } : null };
  }
  return row;
});
const tokenCost = (r) => {
  const set = new Set(LOGO_SLOTS.map((s) => LINES.paper[s]));
  for (const f of r.grounds.paper.fills) set.add(f.reuses ?? `NEW:${f.family}`);
  const inkSet = new Set(LOGO_SLOTS.map((s) => LINES.ink[s]));
  for (const f of r.grounds.ink.fills) inkSet.add(f.reuses ?? `NEW:${f.family}`);
  return { paper: set.size, ink: inkSet.size, newOnPaper: r.grounds.paper.newTokens, newOnInk: r.grounds.ink.newTokens };
};

// ---------- 5. PAINT ----------
if (WIDTHS.length) {
  rmSync(DIST, { recursive: true, force: true });
  cpSync(resolve('dist/client'), DIST, { recursive: true });
}
const txt = (args) => {
  try { return execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180000 }); }
  catch (e) { return { __fail: true, stdout: String(e.stdout ?? ''), stderr: String(e.stderr ?? '') }; }
};
const refusalOf = (res) => (res.__fail ? (res.stdout + res.stderr).trim().split('\n').filter((l) => l.includes('table of') || l.includes('refuses') || l.includes('reports')).slice(0, 2).join(' | ') : null);

const painted = [];
for (const r of priced) {
  if (ONLY && !ONLY.includes(r.id)) continue;
  const row = { id: r.id, paper: [], ink: [] };
  const fillsFor = (ground) => r.grounds[ground].fills.map((f) => ({ d: faceBy(f.face).d, token: f.reuses ?? f.spec }));
  for (const w of WIDTHS) {
    const src = readFileSync(resolve('dist/client/index.html'), 'utf8');
    writeFileSync(resolve(DIST, 'index.html'), recolourPage(src, LINES.paper, fillsFor('paper'), TOKENS));
    const h0 = txt(['design/grill/dist-measure.mjs', DIST, '/', 'design/grill/render-measure.js', String(w), '1200']);
    if (h0.__fail) { row.paper.push({ width: w, error: 'height probe failed' }); continue; }
    const docH = JSON.parse(h0)?.doc?.scrollHeight;
    const shot = `${TMP}/hero-${r.id}-${w}.png`;
    const rep = `${TMP}/hero-${r.id}-${w}.json`;
    const json = txt(['design/grill/dist-measure.mjs', DIST, '/', 'design/grill/render-measure.js', String(w), String(shotHeight(docH, `round22 ${r.id} @ ${w}`)), shot]);
    if (json.__fail) { row.paper.push({ width: w, error: 'measure failed' }); continue; }
    writeFileSync(rep, json);
    const j = JSON.parse(json), m = j.marks?.[0];
    const geo = txt(['logo-geometry.mjs', shot, rep]);
    const px = txt(['logo-pixels.mjs', shot, rep, '0', '--json']);
    const pxRec = px.__fail ? null : JSON.parse(px.split('\n').filter((l) => l.startsWith('{')).pop());
    row.paper.push({
      width: w, shot, rep, shapeCount: m?.count ?? null,
      shapes: (m?.shapes ?? []).map((s, i) => ({
        role: labelsFor(fillsFor('paper').length, m?.shapes?.length ?? 0)[i] ?? s.tag, tag: s.tag,
        contrast: s.strokeContrast ?? s.fillContrast, swDevice: s.swDevice,
        hue: hueOfPaint(s.stroke && s.stroke !== 'none' ? s.stroke : s.fill),
      })),
      geometry: geo.__fail ? { fail: true, out: refusalOf(geo) ?? (geo.stdout + geo.stderr).trim().split('\n').slice(0, 3).join(' | ') } : { ok: true },
      pixels: px.__fail ? { fail: true, out: refusalOf(px) ?? (px.stdout + px.stderr).trim().split('\n')[0] } : { ok: true },
      inkPixels: pxRec?.inkPixels ?? null, at30: pxRec?.at30 ?? null,
      at30Pct: pxRec?.inkPixels ? +((100 * pxRec.at30) / pxRec.inkPixels).toFixed(1) : null,
      strongest: pxRec?.strongest ?? null,
    });
    if (m) await sharp(shot).extract({ left: Math.round(m.x - 6), top: Math.round(m.y - 6), width: Math.round(m.w + 12), height: Math.round(m.h + 12) })
      .png().toFile(`${TMP}/crop-${r.id}-paper-${w}.png`);
  }
  painted.push(row);
}

const CARD_HTML = resolve('.design/tmp-card.html');
const cardAvailable = existsSync(CARD_HTML);
if (!cardAvailable) console.error('note: .design/tmp-card.html is missing — run `npm run assets:social` first, and the ink ground will be token arithmetic only');
else {
  const base = readFileSync(CARD_HTML, 'utf8');
  for (const row of painted) {
    const r = priced.find((x) => x.id === row.id);
    const fills = r.grounds.ink.fills.map((f) => ({ d: faceBy(f.face).d, token: f.reuses ?? f.spec }));
    const f = `${TMP}/card-${r.id}.html`;
    writeFileSync(f, recolourCard(base, LINES.ink, fills, TOKENS));
    const png = `${TMP}/card-${r.id}.png`;
    rmSync(png, { force: true });
    const raw = txt(['design/grill/page-measure.mjs', f, 'design/grill/render-measure.js', '1200', '630', png]);
    if (raw.__fail) { row.ink.push({ error: 'card measure failed' }); continue; }
    const rep = `${TMP}/card-${r.id}.json`;
    writeFileSync(rep, raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const j = JSON.parse(readFileSync(rep, 'utf8')), m = j.marks?.[0];
    const geo = txt(['logo-geometry.mjs', png, rep]);
    const px = txt(['logo-pixels.mjs', png, rep, '0', '--json']);
    const pxRec = px.__fail ? null : JSON.parse(px.split('\n').filter((l) => l.startsWith('{')).pop());
    row.ink.push({
      shot: png, rep, shapeCount: m?.count ?? null,
      shapes: (m?.shapes ?? []).map((s, i) => ({ role: labelsFor(fills.length, m?.shapes?.length ?? 0)[i] ?? s.tag, contrast: s.strokeContrast ?? s.fillContrast, swDevice: s.swDevice })),
      geometry: geo.__fail ? { fail: true, out: refusalOf(geo) ?? (geo.stdout + geo.stderr).trim().split('\n').slice(0, 3).join(' | ') } : { ok: true },
      pixels: px.__fail ? { fail: true, out: refusalOf(px) ?? (px.stdout + px.stderr).trim().split('\n')[0] } : { ok: true },
      inkPixels: pxRec?.inkPixels ?? null, at30: pxRec?.at30 ?? null,
      at30Pct: pxRec?.inkPixels ? +((100 * pxRec.at30) / pxRec.inkPixels).toFixed(1) : null,
      strongest: pxRec?.strongest ?? null,
    });
    if (m) await sharp(png).extract({ left: Math.round(m.x - 6), top: Math.round(m.y - 6), width: Math.round(m.w + 12), height: Math.round(m.h + 12) })
      .png().toFile(`${TMP}/crop-${r.id}-ink-1200.png`);
  }
}

// ---------- 6. the record ----------
const report = {
  measuredAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  widths: WIDTHS, grounds: ['paper (the hero)', 'ink (the share card)'],
  bars: { graphic: BARS.graphic, layer: BARS.layer },
  source: 'Oliver Byrne, "The First Six Books of the Elements of Euclid, in Which Coloured Diagrams and Symbols Are Used Instead of Letters for the Greater Ease of Learners", London 1847',
  ask: 'the second half of the seventh ruling on this logo (D483): "but also show me options for coloring faces of the shape also in the Byrne style"',
  faceGeometry: FACE_GEOMETRY,
  areas,
  coverage,
  faceSolve,
  census, censusTally,
  shapeCountPrice: { tableShapes: LOGO.shapes.length, LOGO_SHAPE_COUNT, acceptedReportLength: LOGO.shapes.length + 1, note: 'logo-geometry.mjs zips the painted report against the table and accepts exactly table+1 (the pole dot). A planted face makes 9 and both logo probes refuse: the refusal text is recorded per row in painted[].' },
  control: { id: CONTROL.id, derivedFrom: 'LOGO_COLOURS in src/lib/logo.mjs' },
  lines: LINES,
  gold: {
    steer: 'operator, 2026-11-25: "Regarding the logo, I feel like the gold color that is an established theme color of the website should be used in the logo a bit more prominently. Ensure some options you create to share with me consider that."',
    family: GOLD_FAMILY,
    rows: ROWS.filter((r) => r.faces.some((fc) => FAMILIES[fc.family])).map((r) => r.id),
    candidates: Object.fromEntries(FACES.flatMap((fn) => ['paper', 'ink'].map((ground) => {
      const row = Object.entries(faceSolve[fn.name][ground].rows).find(([, s2]) => s2.candidate);
      return row ? [`${fn.name}-${ground}`, { candidate: row[1].candidate, spec: row[1].spec, bytes: row[1].candidateBytes, L: row[1].L, band: row[1].band, take: row[1].take, readsAsGold: row[1].readsAsGold, belowFloor: row[1].belowFloor, vsGround: row[1].vsGround, minLineOver: row[1].minLineOver, nearestBrand: row[1].nearestBrand, brandDist: row[1].brandDist, nearestToken: row[1].nearestToken, nearestTokenDist: row[1].nearestTokenDist }] : null;
    }).filter(Boolean))),
    warmNote: 'the site\'s declared warm family is `--color-accent` at hue 35.7, so row F1/F2/F8\'s red is already the closest thing to the site\'s "gold" that costs no token and no ruling; rows F6/F7/F9 price a hue @theme does not declare, which costs a new token and the gates that read it.',
    matrix: goldMatrix,
    brandCollisions: goldCollisions,
  },
  rows: priced.map((r) => ({ id: r.id, label: r.label, byrne: r.byrne, reading: r.reading, faces: r.faces, control: r.control, tokenCost: tokenCost(r), grounds: r.grounds })),
  painted,
};
const REPORT = SUBSET ? `${TMP}/report-subset.json` : 'design/grill/round22/report.json';
mkdirSync(resolve(REPORT, '..'), { recursive: true });
writeFileSync(REPORT, JSON.stringify(report, null, 1) + '\n');

// ---------- 7. print ----------
console.log(`BYRNE ROUND 22 — ${ROWS.length} face rows x 2 grounds. Bars: filled region ${BARS.layer}, graphic line ${BARS.graphic}.`);
console.log('\n=== AREA: the faces the drawing actually bounds, measured twice ===');
for (const a of areas)
  console.log(`${a.name.padEnd(6)} ${String(a.areaUnits).padStart(8)} u  ${String(a.pctOfDisc).padStart(6)}% of the visible face  |  on the sphere ${String(a.sphericalFracPct).padStart(6)}%  foreshortening ${a.foreshorten}  ${a.term}`);
console.log(`geometry: r ${FACE_GEOMETRY.r}, ring (${FACE_GEOMETRY.cx},${FACE_GEOMETRY.cy}), equator semi-minor ${FACE_GEOMETRY.equatorSemiMinor}, axis ${FACE_GEOMETRY.axisOutOfScreenPlaneDeg} deg out of the screen plane, pole angle ${FACE_GEOMETRY.poleAngleDeg} deg`);
console.log('assertions: disc = pi r^2, north + south tile the disc, lune inside north inside disc, every face foreshortens into (0,1], disc foreshortening = 0.50 — all pass.');
console.log('\n=== WHICH LINES SIT ON WHICH FACE (sampled off each shape\'s own geometry; >= 0.25 = on the fill) ===');
for (const f of FACES) {
  const over = overSlots(f.name);
  console.log(`${f.name.padEnd(6)} over: ${over.join(', ') || '(none)'}  |  ${LOGO_SLOTS.map((s) => `${s} ${coverage[f.name][s].frac}`).join(' ')}`);
}
console.log('\n=== CENSUS: how many of the declared tokens already read as a REGION (' + BARS.layer + ') on each ground ===');
console.log(`${censusTally.paper} of ${censusTally.total} on paper · ${censusTally.ink} of ${censusTally.total} on ink`);
console.log(`the ones that do NOT read as a region on paper: ${censusTally.paperFails.join(', ')}`);
console.log('\n=== THE TWO-BAR WINDOW: a fill must read against its ground AND keep the lines over it legible ===');
for (const f of FACES) for (const ground of ['paper', 'ink']) {
  const rep = faceSolve[f.name][ground];
  console.log(`${f.name} on ${ground} — lines that must survive it: ${rep.over.map((s) => `${s}=${LINES[ground][s]}`).join(' ')}`);
  for (const [name, s] of Object.entries(rep.rows)) {
    if (!s.band) { console.log(`   ${name.padEnd(15)} ${s.note}`); continue; }
    console.log(`   ${name.padEnd(15)} hue ${String(s.H).padStart(6)} C ${s.C}  window L ${s.band.lo}..${s.band.hi} (${s.band.n} legal steps${s.tokenL === null ? ', no token declares this hue' : `, token is L ${s.tokenL}`})  takes ${s.take}  ${s.spec}  vs ${ground} ${s.vsGround}  worst line over it ${s.minLineOver}  nearest brand ${s.nearestBrand} d=${s.brandDist}${s.sameAsBrand ? ' SAME COLOUR' : ''}  ${s.reuses ? `reuses --color-${s.reuses}` : s.candidate ? `CANDIDATE ${s.candidate}${s.readsAsGold ? ' (reads as gold)' : ' (BELOW the gold-ness floor L ' + s.goldFloor + ')'}` : 'NEEDS A NEW TOKEN'}`);
  }
}
console.log('\n=== THE GOLD STEER (operator, 2026-11-25): the face rows that price a hue @theme does not declare ===');
console.log(`family: hue ${GOLD_FAMILY.H} chroma ${GOLD_FAMILY.C} — ${GOLD_FAMILY.source}. gold-ness floor L ${GOLD_FAMILY.floor} (${GOLD_FAMILY.floorSource}). Rows: ${report.gold.rows.join(', ')}.`);
for (const [k, c] of Object.entries(report.gold.candidates))
  console.log(`   ${k.padEnd(14)} ${c.spec} -> ${c.bytes.join(',')}  window L ${c.band.lo}..${c.band.hi}  ${c.belowFloor ? `BELOW the floor at L ${c.L}` : `reads as gold at L ${c.L}`}  vs ground ${c.vsGround}  worst line over it ${c.minLineOver}  nearest brand ${c.nearestBrand} d=${c.brandDist}  nearest token --color-${c.nearestToken} d=${c.nearestTokenDist}`);
console.log('   warm alternative that costs nothing: --color-accent (hue 35.7) is the family the role `gold` held before D316 renamed it — rows F1, F2 and F8 already price it as a face.');
console.log('   every hue/chroma pair the search space offers, per face and ground (the chosen pair is marked *):');
for (const m of report.gold.matrix)
  console.log(`     ${m.face.padEnd(6)} ${m.ground.padEnd(6)} ${m.chosen ? '*' : ' '} hue ${String(m.H).padStart(2)} C ${m.C}  window L ${m.band ? `${m.band.lo}..${m.band.hi}` : '—'}  ${m.band ? `${m.spec} ${m.belowFloor ? `BELOW floor L ${m.L}` : `gold at L ${m.L}`}  vs ground ${m.vsGround}  worst line ${m.minLineOver}  brand ${m.nearestBrand} d=${m.brandDist}${m.sameAsBrand ? ' SAME COLOUR' : ''}` : m.note}`);
if (report.gold.brandCollisions.length) console.log(`   SAME-COLOUR COLLISIONS under ${SAME_COLOUR_BAR} delta-OKLab (D316): ${report.gold.brandCollisions.join(' | ')}`);
console.log('\n=== EACH ROW: what it paints, and what it costs in tokens ===');
for (const r of priced) {
  const c = tokenCost(r);
  console.log(`\n${r.id}${r.control ? ' (CONTROL — the shipped colouring, nothing filled)' : ''} ${r.label}`);
  console.log(`   Byrne: ${r.byrne}`);
  console.log(`   reading: ${r.reading}`);
  console.log(`   tokens: paper ${c.paper} distinct (${c.newOnPaper} new) · ink ${c.ink} distinct (${c.newOnInk} new)`);
  for (const ground of ['paper', 'ink']) {
    const g = r.grounds[ground];
    for (const f of g.fills) console.log(`   ${ground.padEnd(5)} fill ${f.face.padEnd(6)} ${f.spec}  ${String(areaBy[f.face].pctOfDisc).padStart(6)}% of the visible face  vs ground ${f.vsGround}  worst line over it ${f.minLineOver}  ${f.token}`);
    if (g.faceGap) console.log(`   ${ground.padEnd(5)} faces ${g.faceGap.pair}: hue gap ${g.faceGap.gap} deg, OKLab ${g.faceGap.labDist} ${g.faceGap.distinctName ? '(distinct names)' : `(SAME COLOUR under ${SAME_COLOUR_BAR}: one name, not two)`}`);
  }
}
console.log('\n=== PAINT: planted in a copy of the built page, measured by the logo probes ===');
const ctrlRow = painted.find((r) => r.id === CONTROL.id);
const ctrlFail = !ctrlRow ? 'was never painted (its probe rows are missing)'
  : [...ctrlRow.paper.filter((p) => p.error).map((p) => `paper ${p.width}: ${p.error}`),
  ...ctrlRow.paper.filter((p) => !p.error && !p.geometry.ok).map((p) => `paper ${p.width}: logo-geometry FAIL ${p.geometry.out}`),
  ...ctrlRow.paper.filter((p) => !p.error && !p.pixels.ok).map((p) => `paper ${p.width}: logo-pixels FAIL ${p.pixels.out}`),
  ...ctrlRow.ink.filter((c) => c.error).map((c) => `card: ${c.error}`),
  ...ctrlRow.ink.filter((c) => !c.error && !c.geometry?.ok).map((c) => `card: logo-geometry FAIL ${c.geometry?.out}`)];
console.log(`CONTROL row ${CONTROL.id} (derived from LOGO_COLOURS in src/lib/logo.mjs): ${ctrlFail.length ? ctrlFail.join('; ') : 'passes logo-geometry and logo-pixels at every width and on the card'}. ${ctrlFail.length ? 'THE MUTATION IS BROKEN: the shipped colouring does not reproduce itself, so no face price in this round is trustworthy.' : 'Every face row is a delta from this measured line.'}`);
for (const row of painted) {
  console.log(`\n${row.id}${row.id === CONTROL.id ? ' (CONTROL)' : ''}`);
  for (const p of row.paper) {
    if (p.error) { console.log(`  paper ${p.width}: ${p.error}`); continue; }
    console.log(`  paper ${String(p.width).padStart(4)}  shapes ${p.shapeCount}  ink ${p.inkPixels} px  at/3.0 ${p.at30} (${p.at30Pct}% of its ink)  geometry ${p.geometry.ok ? 'PASS' : 'REFUSED'}  pixels ${p.pixels.ok ? 'PASS' : 'REFUSED'}`);
    console.log(`          ${p.shapes.map((s) => `${s.role} ${s.contrast}@${s.swDevice}px h${s.hue}`).join(' | ')}`);
    if (!p.geometry.ok) console.log(`          GEOMETRY: ${p.geometry.out}`);
    if (!p.pixels.ok) console.log(`          PIXELS: ${p.pixels.out}`);
  }
  for (const c of row.ink) {
    if (c.error) { console.log(`  ink: ${c.error}`); continue; }
    console.log(`  card        shapes ${c.shapeCount}  ink ${c.inkPixels} px  at/3.0 ${c.at30} (${c.at30Pct}% of its ink)  geometry ${c.geometry?.ok ? 'PASS' : 'REFUSED'}  pixels ${c.pixels?.ok ? 'PASS' : 'REFUSED'}`);
    console.log(`          ${c.shapes.map((s) => `${s.role} ${s.contrast}@${s.swDevice}px`).join(' | ')}`);
    if (c.geometry && !c.geometry.ok) console.log(`          GEOMETRY: ${c.geometry.out}`);
    if (c.pixels && !c.pixels.ok) console.log(`          PIXELS: ${c.pixels.out}`);
  }
}
const broke = painted.some((r) => r.paper.some((p) => p.error) || r.ink.some((c) => c.error)) || ctrlFail.length > 0 || !cardAvailable;
console.log(`\nwrote ${REPORT}${SUBSET ? ' (SUBSET run — the tracked record at design/grill/round22/report.json was NOT overwritten)' : ''}; crops in ${TMP}/crop-<id>-<ground>-<w>.png`);
console.log(`SHAPE-COUNT PRICE: ${report.shapeCountPrice.acceptedReportLength} painted shapes is all logo-geometry.mjs accepts (table ${report.shapeCountPrice.tableShapes} + the pole dot). A row that fills a face reports 9.`);
if (broke) { console.error('MACHINERY: at least one row failed to measure, the card document was missing, or the CONTROL row did not pass its own probes — the numbers above are incomplete'); process.exit(1); }
