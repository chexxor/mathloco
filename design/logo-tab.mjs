// logo-tab.mjs — the instrument for the TAB artifact: the ratified logo drawn from the shipped table, rendered
// at tab sizes, and measured in pixels. Grill round 23 (2026-11-24) is its first reader; `logo-lands` is the second.
//
// WHY A SEPARATE INSTRUMENT EXISTS. Every logo probe in this repo measures the logo at HERO widths (320/640/1240
// device px, `logo-geometry.mjs`, `logo-pixels.mjs`) or on the share card (1200x630). The tab is a
// 16x16 slot (MDN's glossary on favicons: "Usually, a favicon is 16 x 16 pixels"), and at 16px a 1.4-unit stroke
// in a 240-unit plate is 0.09 device px — an order of magnitude under the 1 device px line floor the render gate
// states (D119's ~1.5px "no fully covered pixel" figure is a description of thin coverage, not an enforceable
// floor — S112). So "check:logo PASS at 320" says nothing
// about the tab, and `check:favicon` only reads colour literals — it has never looked at a pixel. This file is the
// instrument that does: it builds an SVG document out of `LOGO` + `LOGO_COLOURS` at a stated FRAMING, rasterizes
// it at 16/32/48/64 device px, and asks which of the eight shapes actually lands.
//
// THE TWO DOCUMENTS ONE CANDIDATE PRODUCES, and why both are needed:
//   - the ARTIFACT: what would ship as public/favicon.svg. width/height are the frame's own size, the colours are
//     hex bytes the tokens resolve to (`check:favicon` compares those bytes against @theme), and there is no
//     transform: the artifact is the drawing, not a screenshot of it.
//   - the FIXTURE: the same candidate baked at one tab size — viewBox 0 0 N N, a ground rect, and the logo inside a
//     `translate(...) scale(s)` that is exactly the contain-fit + centre a browser applies. Measuring the fixture
//     measures what a tab shows, including the blank bands a non-square plate wastes.
//
// WHY HEX AND NOT oklch() IN THE RASTERIZED COPY: sharp's SVG loader (librsvg) does not resolve CSS custom
// properties or the oklch() function, so a fixture carrying `var(--color-…)` would paint the page ground and the
// round would measure nothing. The bytes are therefore taken from `design/palette-tokens.mjs` — the same reader
// `check:social` uses to ask "is this colour one @theme declares" — so the fixture paints the token's bytes, not
// a second colour. The ARTIFACT also carries those bytes, which is what `check:favicon` rules on today.
import { writeFileSync, readFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { LOGO, LOGO_SLOTS, LOGO_COLOURS } from '../src/lib/logo.mjs';
import { colourEntry, declareCandidate } from './palette-tokens.mjs';
import { ROWS as TAB_ROWS } from './grill/round23-options.mjs';   // imports only src/lib/logo.mjs, so this adds no cycle
import { contrastBytes } from './grill/okcolor.mjs';   // the ONE contrast implementation in this repo

// Colour names resolve through `palette-tokens.colourEntry`: a shipped @theme token first, then a candidate the
// running round declared. A candidate is a colour the round MEASURES and PRINTS and does not ship (round 23's gold
// steer, D316), and its bytes come from the same token→bytes path a token's do — which is the point of putting the
// registry in the palette module rather than here (D485 re-states why a second conversion is a trap).
const hexStr = (e) => `#${e.bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
export const hexOf = (name) => hexStr(colourEntry(name));
export const GROUND_TOKEN = { paper: 'paper', ink: 'ink' };
// The lightest line colour each ground can carry, for the single-colour plan: the hero draws the surface `ink` on
// paper and `band-text` on ink, which is what LOGO_COLOURS already says for the ring slot.
export const SURFACE_TOKEN = { paper: 'ink', ink: 'band-text' };
// The warm accent family, keyed per ground, because the measured pairs say one token cannot serve both grounds
// (@measured 2026-11-25 by npm run round23, `goldFamily` in design/grill/round23/report.json): `accent` is 5.77 on
// paper and 2.97 on ink — the ink figure is BELOW the 3.0 graphic bar (D101) that every logo line is held to, so a
// plan that used `accent` on both grounds would ship an invisible ring on a dark tab. `accent-on-ink` is 3.01 on
// paper and 5.69 on ink. This is not a preference, it is which end of the family each ground is allowed.
export const WARM_TOKEN = { paper: 'accent', ink: 'accent-on-ink' };
// The sphere's own body — its outline and the equator — against the shapes that NAME a line (the two meridians,
// the two right-angle marks, the meeting point). `splitWarm` colours the first group with the ground's surface
// token and the second with the warm token, which is the plan that asks the tab gate's two-colour rule head-on.
export const SURFACE_SLOTS = ['ring', 'rear', 'front'];
export const NAMING_SLOTS = LOGO_SLOTS.filter((s) => !SURFACE_SLOTS.includes(s));

// Which colour a spec's GROUND is. `spec.ground` is absent for every row that uses the palette's own grounds; a
// gold-plate row names a declared candidate, either one name for both grounds or a per-ground pair (the lightness
// a gold plate may take against `ink` lines and the one it may take against `paper` lines are different colours,
// so the solve produces a pair). Asserted rather than defaulted: a row that means to paint a gold ground and gets
// the paper one measures a row that does not exist.
export function groundEntry(spec, ground) {
  const g = spec?.ground;
  if (g == null) return colourEntry(GROUND_TOKEN[ground]);
  return colourEntry(typeof g === 'string' ? g : named(spec, 'ground', ground));
}
export const groundHex = (spec, ground) => hexStr(groundEntry(spec, ground));
export const named = (spec, field, ground) => {
  const v = spec[field];
  if (v == null) throw new Error(`logo-tab: colour plan "${spec.colours ?? 'rowC'}" needs spec.${field} (a token or declared-candidate name, or { paper, ink })`);
  const name = typeof v === 'string' ? v : v[ground];
  if (!name) throw new Error(`logo-tab: spec.${field} has no entry for the "${ground}" ground: ${JSON.stringify(v)}`);
  return name;
};

// ---------- 1. the figure's own measurements, solved off the table (never typed) ----------
const numPairs = (d) => { const n = d.match(/-?\d+(\.\d+)?/g).map(Number); const p = []; for (let i = 0; i + 1 < n.length; i += 2) p.push([n[i], n[i + 1]]); return p; };
export function inkBox() {
  const pts = [];
  for (const s of LOGO.shapes) {
    if (s.tag === 'circle') pts.push([s.cx - s.r, s.cy - s.r], [s.cx + s.r, s.cy + s.r]);
    else pts.push(...numPairs(s.d));
  }
  pts.push([LOGO.dot.cx - LOGO.dot.r, LOGO.dot.cy - LOGO.dot.r], [LOGO.dot.cx + LOGO.dot.r, LOGO.dot.cy + LOGO.dot.r]);
  const pad = Math.max(...LOGO.shapes.map((s) => s.sw)) / 2;   // half a stroke overhang on every side
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad };
}
export const INK_BOX = inkBox();

export const FIGURE = {
  plate: { w: LOGO.vbW, h: LOGO.vbH },
  ring: { cx: LOGO.shapes[0].cx, cy: LOGO.shapes[0].cy, r: LOGO.shapes[0].sw && LOGO.shapes[0].r },
  inkBox: INK_BOX,
  sphereSpanUnits: 2 * LOGO.shapes[0].r,
  minStrokeUnits: Math.min(...LOGO.shapes.map((s) => s.sw)),
  maxStrokeUnits: Math.max(...LOGO.shapes.map((s) => s.sw)),
  dotDiameterUnits: 2 * LOGO.dot.r,
  // the two right-angle marks: each is two 6-unit arms (M99.9 98 L99.9 92 L94 91) — the arm length is the feature
  angleArmUnits: (() => { const d = LOGO.shapes.find((s) => s.slot === 'angleL').d.match(/-?\d+(\.\d+)?/g).map(Number); return +Math.max(Math.abs(d[1] - d[3]), Math.abs(d[4] - d[2]), Math.abs(d[2] - d[4])).toFixed(2); })(),
  equatorDash: LOGO.shapes.find((s) => s.slot === 'rear').dash.split(' ').map(Number),
  footSeparationUnits: +Math.abs(LOGO.shapes.find((s) => s.slot === 'right').d.match(/-?\d+(\.\d+)?/g)[0] - LOGO.shapes.find((s) => s.slot === 'left').d.match(/-?\d+(\.\d+)?/g)[0]).toFixed(2),
};

// ---------- 2. framing: which viewBox the drawing is seen through ----------
// dx/dy translate the logo inside the frame; they are how a plate is centred in a square slot.
export function frameOf(spec) {
  const f = spec.frame;
  if (f === 'plate') return { x: 0, y: 0, w: LOGO.vbW, h: LOGO.vbH, dx: 0, dy: 0, why: 'the drawing exactly as the hero draws it, non-square' };
  if (f === 'plateSquare') { const s = Math.max(LOGO.vbW, LOGO.vbH); return { x: 0, y: 0, w: s, h: s, dx: 0, dy: (s - LOGO.vbH) / 2, why: `the whole plate in a ${s}-unit square slot` }; }
  if (f === 'sphere') return { x: +INK_BOX.x.toFixed(2), y: +INK_BOX.y.toFixed(2), w: +INK_BOX.w.toFixed(2), h: +INK_BOX.h.toFixed(2), dx: 0, dy: 0, why: 'the ink bounding box of the whole figure — the sphere fills the tab' };
  if (f === 'spherePad') {
    const m = +(INK_BOX.w * (spec.pad ?? 0.1)).toFixed(2);
    return { x: +(INK_BOX.x - m).toFixed(2), y: +(INK_BOX.y - m).toFixed(2), w: +(INK_BOX.w + 2 * m).toFixed(2), h: +(INK_BOX.h + 2 * m).toFixed(2), dx: 0, dy: 0, why: `the ink box padded ${((spec.pad ?? 0.1) * 100).toFixed(0)}% so the figure does not touch the tab edge` };
  }
  throw new Error(`logo-tab: unknown frame "${f}"`);
}
export const FRAME = frameOf;

// The stroke multiplier a framing needs so its THINNEST stroke reaches a device-px floor at a target tab size.
// scale = device px per viewBox unit; a sw-unit stroke lands at sw*scale device px.
export const scaleAt = (frame, n) => Math.min(n / frame.w, n / frame.h);
// `floorPx: null` means "no tab tuning" (row N0): the figure keeps its hero weights and k is exactly 1, so the row
// measures the drawing rather than a redraw of it. Solving for a floor is what the other rows do.
export function weightFor(spec, frame, floorPx) {
  const n = spec.weightAt;
  const s = scaleAt(frame, n);
  const k = floorPx == null ? 1 : floorPx / (FIGURE.minStrokeUnits * s);
  return { k: +k.toFixed(3), scale: +s.toFixed(4), at: n, floorPx, swMin: +(FIGURE.minStrokeUnits * k).toFixed(2), swMax: +(FIGURE.maxStrokeUnits * k).toFixed(2) };
}

// ---------- 3. colour plan (row C as shipped, or the tab reduction a 2-colour gate accepts) ----------
export function colourPlan(spec, ground) {
  const plan = spec.colours ?? 'rowC';
  if (plan === 'rowC') return { ...LOGO_COLOURS[ground] };
  if (plan === 'single') return Object.fromEntries(LOGO_SLOTS.map((s) => [s, SURFACE_TOKEN[ground]]));
  // The ratified PAIR: the whole logo drawn in the ground on the other side of the band. Two colours in total
  // (ground + lines), which is what `check:favicon` rule 3 ("a logo is one ground and one glyph") allows, and the
  // pair is the one D316 ratified.
  if (plan === 'pair') return Object.fromEntries(LOGO_SLOTS.map((s) => [s, GROUND_TOKEN[ground] === 'paper' ? 'ink' : 'paper']));
  // The gold steer (operator, 2026-11-25): "the gold color that is an established theme color of the website should
  // be used in the logo a bit more prominently". "gold" has TWO referents in this repo and a plan names which one it
  // means rather than letting a reader guess: `warm`/`splitWarm` use the site's own warm accent family (hue 35.7,
  // the family the role `gold` held before D316 renamed it) and cost NO new token; `goldLine`/`goldPlate` use a true
  // gold hue (~62-75) which no token declares today, so they can only be priced as a declared candidate.
  if (plan === 'warm') return Object.fromEntries(LOGO_SLOTS.map((s) => [s, WARM_TOKEN[ground]]));
  if (plan === 'splitWarm') return Object.fromEntries(LOGO_SLOTS.map((s) => [s, SURFACE_SLOTS.includes(s) ? SURFACE_TOKEN[ground] : WARM_TOKEN[ground]]));
  if (plan === 'goldLine') return Object.fromEntries(LOGO_SLOTS.map((s) => [s, named(spec, 'candidate', ground)]));
  // The GROUND is the gold. The lines take the lightest colour the ground on the other side of the band allows,
  // exactly as `pair` does, so the only new colour in the row is the plate itself.
  if (plan === 'goldPlate') return Object.fromEntries(LOGO_SLOTS.map((s) => [s, GROUND_TOKEN[ground] === 'paper' ? 'ink' : 'paper']));
  throw new Error(`logo-tab: unknown colour plan "${plan}"`);
}


// A shape as the shipped artifact would carry it: no transform, no class, literal hex, and `fill="none"` on every
// stroked shape — SVG's default fill is black, and dropping it is how round 21's control row broke (D481).
// A dash is part of the drawing, so it scales with the weight multiplier exactly as the stroke does. The logo
// declares no per-shape dash correction (`LOGO.shapes[]` carries `dash: '5 4'` on the rear arc and nothing else
// — checked @measured 2026-11-25: `grep -n dashK src/lib/logo.mjs` answers nothing), so there is exactly one
// multiplier here. Dropping it, or inventing a second one, is how a "same figure, heavier line" candidate silently
// becomes a different figure.
export const dashTag = (dash, k) => ` stroke-dasharray="${dash.split(' ').map((v) => +(v * k).toFixed(2)).join(' ')}"`;
function shapeTag(s, colour, k) {
  const sw = +(s.sw * k).toFixed(3);
  const dash = s.dash ? dashTag(s.dash, k) : '';
  return s.tag === 'circle'
    ? `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="none" stroke="${colour}" stroke-width="${sw}"${dash}/>`
    : `<path d="${s.d}" fill="none" stroke="${colour}" stroke-width="${sw}"${dash}/>`;
}
// ---------- 4. the two documents ----------
const RX_FRACTION = 6 / 32;   // the incumbent's rx 6 in a 32-unit viewBox: --radius-control as a fraction of width
export function shapeList(spec, ground, k, onlySlots) {
  const map = colourPlan(spec, ground);
  const slots = LOGO.shapes.filter((s) => (onlySlots ?? LOGO_SLOTS).includes(s.slot));
  const tags = slots.map((s) => shapeTag(s, hexOf(map[s.slot]), k));
  const dotColour = hexOf(map.dot);
  tags.push(`<circle cx="${LOGO.dot.cx}" cy="${LOGO.dot.cy}" r="${LOGO.dot.r}" fill="${dotColour}" stroke="none"/>`);
  return tags;
}

// The ARTIFACT: what would ship. Intrinsic width/height = the frame's size; the logo sits at its own coordinates.
export function artifactSvg(spec, ground, k) {
  const f = frameOf(spec);
  const body = shapeList(spec, ground, k).map((t) => `  ${t}`).join('\n');
  const rx = +(RX_FRACTION * f.w).toFixed(2);
  const inner = f.dx || f.dy ? `<g transform="translate(${f.dx} ${f.dy})">\n${body.split('\n').map((l) => `  ${l}`).join('\n')}\n</g>` : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.w}" height="${f.h}" viewBox="${f.x} ${f.y} ${f.w} ${f.h}">\n  <rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="${rx}" fill="${groundHex(spec, ground)}"/>\n${inner}\n</svg>\n`;
}

// The FIXTURE's own layout, computed in the ONE place every reader of a fixture shares: the contain-scale a
// browser applies, the box the drawing lands in, where that box sits in the canvas, and (for the clip probe) how
// much extra canvas the frame needs. Anything that maps a viewBox point to a fixture pixel must use this, or the
// two readers disagree by the padding.
//
// THE ORIGIN, AND THE DEFECT IT CLOSED (found 2026-11-25 while reconciling the artifact raster with the fixture
// raster). The shapes in `LOGO` live in the logo's own coordinate space (x 61.3-178.7 for the sphere's ink box),
// while a `sphere`/`spherePad` frame starts at that box's corner, not at 0. The first version of this layout
// centred the FRAME but translated by only `dx`/`dy`, so for every frame with a non-zero origin the drawing was
// shifted by the origin and most of it fell outside the canvas. @measured 2026-11-25 (Linux native, Node 24.22.1,
// node reading both rasters of row T1/paper at the 16px slot): artifact 186 pixels differ from the ground, fixture
// 90 — the fixture was counting half a sphere, and every round-23 pixel figure for a sphere-framed row was a
// measurement of a clipped drawing. Rows whose frame starts at 0 (plate, plateSquare) matched exactly, which is why
// the defect hid. `origin` here is the canvas coordinate of the frame's own corner, and `transform` is the one
// string both the emitter and the path-walker use, so a point can no longer be mapped two ways.
export function fixtureLayout(spec, n, padPx = 0) {
  const f = frameOf(spec);
  const scale = scaleAt(f, n);
  const drawW = f.w * scale, drawH = f.h * scale;
  const canvas = n + 2 * padPx;
  const ox = padPx + (n - drawW) / 2, oy = padPx + (n - drawH) / 2;
  // A logo-space point p lands at ox + scale * (p + dx - f.x): the frame's corner maps to the canvas box, and the
  // frame's own dx/dy (used by `plateSquare` to centre the plate) rides inside it.
  const tx = (f.dx ?? 0) - f.x, ty = (f.dy ?? 0) - f.y;
  return {
    frame: f, scale, drawW, drawH, canvas, ox, oy, tx, ty,
    transform: `translate(${ox.toFixed(3)} ${oy.toFixed(3)}) scale(${scale.toFixed(6)})${tx || ty ? ` translate(${tx.toFixed(3)} ${ty.toFixed(3)})` : ''}`,
    rect: { left: Math.floor(ox), top: Math.floor(oy), width: Math.round(drawW), height: Math.round(drawH) },
    // The tab area the logo does NOT cover — the band a non-square plate leaves to the browser's own chrome.
    blankPx: Math.max(0, n * n - Math.round(drawW * drawH)),
  };
}

// ---------- 4b. is the document even parseable? (found while building round 23, 2026-11-25) ----------
// XML 1.0 §7.4: the string `--` MUST NOT appear inside a comment. `public/favicon.svg` carried
// "rx 6 is --radius-control" in its own explanatory comment, so the site's tab artifact is not well-formed XML.
// Measured @measured 2026-11-25 (Linux native): sharp/librsvg refuses the file outright — "Input buffer has corrupt
// header: glib: XML parse error: ... Comment must not contain '--' (double-hyphen)" — and headless firefox, given
// the file as the top-level document, paints its XML-error page (255,255,224 at (16,16) and (32,32)) where the
// comment-stripped copy and a one-character copy paint the ink plate (23,19,12). `check:favicon` compares colour
// LITERALS with a regex, so it cannot see this class at all: the tab gate was green on a document a parser refuses.
// A fixture built by hand is immune (this file emits no comments), but a fixture copied out of a shipped document
// inherits the defect, so the copy strips comments and says why. The ARTIFACT handed to the gate is never touched.
export const xmlCommentFaults = (svg) => [...svg.matchAll(/<!--[\s\S]*?-->/g)]
  .map((m) => m[0])
  .filter((c) => c.slice(4, -3).includes('--'))
  .map((c) => ({ snippet: c.slice(4, Math.min(64, c.length - 3)).replace(/\s+/g, ' ').trim() }));
export const stripComments = (svg) => svg.replace(/<!--[\s\S]*?-->/g, '');

// The FIXTURE: the same candidate baked at N device px, with the contain-fit + centre a browser applies baked in.
// TWO DELIBERATE DIFFERENCES from the artifact, both measurement decisions:
//   - the ground rect is SQUARE, with no `rx`. The ARTIFACT keeps the rounding (`--radius-control`, as the
//     incumbent ships it); the FIXTURE exists to count ink, and a rounded corner is transparent canvas. Measured
//     @measured 2026-11-25 by .design/tmp-sharp-probe.mjs (Linux native, sharp/librsvg): the corner pixel of a
//     16px fixture whose plate carries rx 3 comes back as raw RGB 42,0,0 at alpha 6 — a nearly-empty pixel that
//     any contrast counter reads as DARK INK (its WCAG contrast against paper is 17.15, the ground pair's own
//     number). Corner chrome was being counted as logo ink. Flattening the ground over the whole canvas is the
//     honest reading: a pixel outside the plate is not the logo.
//   - `padPx` widens the CANVAS without changing the scale, so the ink a framing pushes past the frame edge is
//     visible to the counter instead of being cut by the viewport. That is what `clipLoss` measures.
export function fixtureSvg(spec, ground, n, k, onlySlots, padPx = 0) {
  const L = fixtureLayout(spec, n, padPx);
  const body = shapeList(spec, ground, k, onlySlots).map((t) => `    ${t}`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.canvas}" height="${L.canvas}" viewBox="0 0 ${L.canvas} ${L.canvas}">\n  <rect x="0" y="0" width="${L.canvas}" height="${L.canvas}" fill="${groundHex(spec, ground)}"/>\n  <g transform="${L.transform}">\n${body}\n  </g>\n</svg>\n`;
}

// ---------- 5. rasterize and count ----------
// `flattenGround`: librsvg leaves every pixel the drawing does not cover TRANSPARENT, and `raw()` hands back the
// un-premultiplied triple of a pixel with no coverage at all (see the probe cited above). Flattening onto the
// fixture's own ground makes "a pixel that differs from the ground" mean what it says. The fixture already paints
// the whole canvas, so this is belt-and-braces for any caller that hands in a document that does not.
// Raster an ARTIFACT at the slot it is drawn in. An artifact carries width/height equal to its plate (e.g. the
// T1 sphere's 117.44 x 117.46u), so handing it straight to sharp makes librsvg paint a 117px document which sharp
// then downsamples to 16 - and downsampling a line that was already fully covered at 117px keeps bytes a browser
// painting the same document directly at 16 would never produce. @measured 2026-11-25 (Linux native, Node 24.22.1,
// node -e comparing the two paths for row T1/paper): artifact-as-carried 54 fully covered pixels vs the fixture
// round 23 measures, and a browser, paint 19 @ 16px. So the slot dimensions are written into the document BEFORE
// the raster, exactly as a tab does, and the viewBox stays untouched so the geometry is the same drawing.
export const slotSized = (svg, n) =>
  svg.replace(/\bwidth="([\d.]+)"\s+height="([\d.]+)"/, `width="${n}" height="${n}"`);
export const rasterArtifactAt = async (svg, n, flattenGround) => raster(slotSized(svg, n), n, flattenGround);
export const raster = async (svg, n, flattenGround) => {
  let img = sharp(Buffer.from(svg)).resize(n, n);
  if (flattenGround) img = img.flatten({ background: flattenGround });
  const r = await img.raw().toBuffer({ resolveWithObject: true });
  return { ...r.info, data: r.data };
};
// Contrast comes from `design/grill/okcolor.mjs` (the WCAG luminance on painted bytes, D101) and is NOT re-implemented
// here. A local copy of the colour transform is exactly the defect okcolor.mjs exists to prevent — "a bar quoted as
// 4.82 from one file and 4.78 from another is a ruling nobody can re-check" — and an early draft of this file did
// carry its own `lum`, with a stray `0.07152 * 0` term in it (every number right, the line reading as if green had a
// second coefficient). Removed: the bar a tab row is judged on must be the same arithmetic `check:render` and every
// grill round state.
export const contrastRGB = contrastBytes;

// groundBytes: the hex the fixture paints; inkHexes: every colour the candidate declares.
//  anyPx  = a pixel that differs from the ground at all (something landed)
//  at3Px  = a pixel at/over the 3.0 graphic bar (D101) — the logo's own bar
//  fullPx = a pixel within 6 RGB units of a declared ink byte (the fully-covered case D119 counts on)
export function stats(img, groundHex, inkHexes) {
  const g = hex2rgb(groundHex), inks = inkHexes.map(hex2rgb);
  let anyPx = 0, at3 = 0, full = 0, max = 0;
  for (let i = 0; i < img.data.length; i += img.channels) {
    const p = [img.data[i], img.data[i + 1], img.data[i + 2]];
    const c = contrastRGB(p, g);
    if (c > 1.02) anyPx++;
    if (c >= 3.0) at3++;
    if (c > max) max = c;
    if (inks.some((ic) => Math.hypot(p[0] - ic[0], p[1] - ic[1], p[2] - ic[2]) <= 6)) full++;
  }
  const box = img.width * img.height;
  return { boxPx: box, anyPx, at3Px: at3, fullPx: full, coveragePct: +((100 * at3) / box).toFixed(2), maxContrast: +max.toFixed(2) };
}
export const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// A shape on its own at the same size and ground: does it land at all, and does it ever reach full coverage?
export async function shapeSurvival(spec, ground, n, k, slot) {
  const s = scaleAt(frameOf(spec), n);
  const map = colourPlan(spec, ground);
  const one = slot === 'dot' ? LOGO.dot : LOGO.shapes.find((x) => x.slot === slot);
  if (!one) throw new Error(`logo-tab: no shape for slot "${slot}"`);
  const colour = hexOf(map[slot]);
  const svg = fixtureSvg({ ...spec }, ground, n, k, [slot]);
  const gh = groundHex(spec, ground);
  const img = await raster(svg, n, gh);
  const st = stats(img, gh, [colour]);
  // For a stroked shape the question is "how wide is its line"; for the pole dot, which is a FILL, the equivalent
  // is its own diameter. A row where the dot's diameter is 1.09 device px has a dot that is one pixel.
  const swDevice = slot === 'dot' ? +(2 * one.r * s).toFixed(3) : +((one.sw ?? 0) * k * s).toFixed(3);
  return { slot, swDevice, ...st, drawn: slot === 'dot' ? 'fill' : 'stroke' };
}

// Flatten a path (cubic or line) into points, the same way round 22 samples the logo's own geometry.
export function samplePath(d, samples = 200) {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const cmds = [...d.matchAll(/[MLC]/g)].map((m) => m[0]);
  const pts = [[nums[0], nums[1]]];
  let i = 2;
  for (let c = 1; c < cmds.length; c++) {
    if (cmds[c] === 'L') { pts.push([nums[i++], nums[i++]]); continue; }
    const p0 = pts[pts.length - 1], c1 = [nums[i++], nums[i++]], c2 = [nums[i++], nums[i++]], p3 = [nums[i++], nums[i++]];
    for (let t = 1; t <= samples; t++) {
      const u = 1 - t / samples;
      pts.push([u ** 3 * p0[0] + 3 * u * u * (t / samples) * c1[0] + 3 * u * (t / samples) ** 2 * c2[0] + (t / samples) ** 3 * p3[0],
        u ** 3 * p0[1] + 3 * u * u * (t / samples) * c1[1] + 3 * u * (t / samples) ** 2 * c2[1] + (t / samples) ** 3 * p3[1]]);
    }
  }
  return pts;
}
// Walk a shape's own geometry through the fixture's pixels and report how the ink is BROKEN UP: the longest
// contiguous run and the number of runs. This is the dash question measured in device px — a rear arc whose run
// equals the front arc's has fused into a line, and the logo's only depth cue is gone at that size.
export async function runProfile(spec, ground, n, k, slot) {
  // The pixel mapping is the layout's transform, not a re-derivation of it: this walker and the emitter must land
  // on the same pixel, and the first version of this line mapped a logo-space point without the frame origin, so
  // for every sphere-framed row it walked a point the fixture never painted (see fixtureLayout above).
  const L = fixtureLayout(spec, n);
  const s = L.scale, ox = L.ox, oy = L.oy, tx = L.tx, ty = L.ty;
  const one = LOGO.shapes.find((x) => x.slot === slot);
  if (!one || one.tag !== 'path') return null;
  const gh = groundHex(spec, ground);
  const img = await raster(fixtureSvg({ ...spec }, ground, n, k, [slot]), n, gh);
  const g = hex2rgb(gh);
  const ink = hex2rgb(hexOf(colourPlan(spec, ground)[slot]));
  let runs = 0, longest = 0, cur = 0, on = 0, full = 0;
  for (const [x, y] of samplePath(one.d, 400)) {
    const px = Math.round((x + tx) * s + ox), py = Math.round((y + ty) * s + oy);
    if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
    const c = img.data[(py * img.width + px) * img.channels];
    const p = [c, img.data[(py * img.width + px) * img.channels + 1], img.data[(py * img.width + px) * img.channels + 2]];
    const lit = contrastRGB(p, g) >= 3.0;
    if (Math.hypot(p[0] - ink[0], p[1] - ink[1], p[2] - ink[2]) <= 6) full++;
    if (lit) { on++; cur++; longest = Math.max(longest, cur); } else if (cur) { runs++; cur = 0; }
  }
  if (cur) runs++;
  return { samples: 400, onInk: on, onInkPct: +((100 * on) / 400).toFixed(1), runs, longestRunSamples: longest, longestRunPx: +(longest / 400 * pathLength(one.d)).toFixed(2), fullCoveredSamples: full };
}
export const pathLength = (d) => { const p = samplePath(d, 400); let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };

// ---------- 5b. what the framing CUTS, and what it costs in device px ----------
// A `sphere` frame is the ink bounding box measured at the HERO weights (pad = half the thickest stroke). Weight
// every stroke by k and each shape's outer edge moves out by (sw_i*k - sw_i)/2 — past the frame, and past the
// viewport that contains it. So the tab silently amputates the outside of the ring. This is derived from the
// table (each shape's own extent and its own stroke), not typed:
//   spill_units(side) = max over shapes of (frame edge - (shape extent - sw_i*k/2)), floored at 0.
// The dot is a fill, so it contributes no half-stroke.
const shapeExtent = (s) => {
  if (s.tag === 'circle') return { minX: s.cx - s.r, maxX: s.cx + s.r, minY: s.cy - s.r, maxY: s.cy + s.r };
  const pts = numPairs(s.d);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};
export function frameClip(spec, k) {
  const f = frameOf(spec);
  const out = { left: 0, right: 0, top: 0, bottom: 0 };
  const items = [...LOGO.shapes.map((s) => ({ e: shapeExtent(s), half: (s.sw ?? 0) * k / 2 })),
    { e: shapeExtent(LOGO.dot), half: 0 }];
  for (const it of items) {
    out.left = Math.max(out.left, f.x - (it.e.minX - it.half));
    out.right = Math.max(out.right, (it.e.maxX + it.half) - (f.x + f.w));
    out.top = Math.max(out.top, f.y - (it.e.minY - it.half));
    out.bottom = Math.max(out.bottom, (it.e.maxY + it.half) - (f.y + f.h));
  }
  const r2 = (v) => +Math.max(0, v).toFixed(2);
  return { left: r2(out.left), right: r2(out.right), top: r2(out.top), bottom: r2(out.bottom), max: r2(Math.max(out.left, out.right, out.top, out.bottom)) };
}

// The MEASURED version of the same figure: raster the same fixture on a canvas padded by ceil(worst spill) device
// px at the SAME scale, and count the lit pixels that lie in the band outside the frame's own rect. Those are the
// pixels the tab cannot show. `clipLossPx` is the answer to "how much of the drawing does this framing throw away",
// counted in ink rather than argued from units.
export async function clipLoss(spec, ground, n, k) {
  const clip = frameClip(spec, k);
  const L = fixtureLayout(spec, n);
  const worstDevice = clip.max * L.scale;
  if (worstDevice < 0.2) return { ...clip, worstDevicePx: +worstDevice.toFixed(2), padPx: 0, clipLossPx: 0, clipAt3Px: 0 };
  const padPx = Math.ceil(worstDevice) + 1;
  const gh = groundHex(spec, ground);
  const big = await raster(fixtureSvg(spec, ground, n, k, undefined, padPx), L.canvas + 2 * padPx, gh);
  const rect = fixtureLayout(spec, n, padPx).rect;
  let outside = 0, outsideAt3 = 0;
  const g = hex2rgb(gh);
  for (let y = 0; y < big.height; y++) for (let x = 0; x < big.width; x++) {
    if (x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height) continue;
    const i = (y * big.width + x) * big.channels;
    const p = [big.data[i], big.data[i + 1], big.data[i + 2]];
    const c = contrastRGB(p, g);
    if (c > 1.02) outside++;
    if (c >= 3.0) outsideAt3++;
  }
  return { ...clip, worstDevicePx: +worstDevice.toFixed(2), padPx, clipLossPx: outside, clipAt3Px: outsideAt3 };
}

// The figure's own features, converted to device px at a tab size — the numbers a reader can actually picture.
export function featureSizes(spec, n, k) {
  const s = scaleAt(frameOf(spec), n);
  const [dashOn, dashOff] = FIGURE.equatorDash;
  return {
    scale: +s.toFixed(4),
    ringDiameterPx: +(FIGURE.sphereSpanUnits * s).toFixed(2),
    strokeMinPx: +(FIGURE.minStrokeUnits * k * s).toFixed(2),
    strokeMaxPx: +(FIGURE.maxStrokeUnits * k * s).toFixed(2),
    dotDiameterPx: +(FIGURE.dotDiameterUnits * s).toFixed(2),
    angleArmPx: +(FIGURE.angleArmUnits * k * s).toFixed(2),
    footSeparationPx: +(FIGURE.footSeparationUnits * s).toFixed(2),
    dashOnPx: +(dashOn * k * s).toFixed(2),
    dashOffPx: +(dashOff * k * s).toFixed(2),
  };
}

// ---------- 6. the second instrument: the same fixture in a real browser ----------
// librsvg (sharp) and a browser are different rasterizers, and this round's artifact is rasterized by a BROWSER —
// a favicon is never seen by librsvg. So the sizes that decide the answer are measured twice, and the two readings
// are printed side by side rather than averaged. The page has no margin and no background of its own (the fixture
// carries its own ground rect), the viewport is bigger than the fixture because firefox clamps tiny windows, and
// the shot is cropped to the fixture's own box so the crop cannot invent or erase a pixel.
const VIEWPORT = 200;
// THE PAGE GIVES THE CANVAS A SENTINEL COLOUR, and the crop is the bounding box of everything that is NOT it.
// The first version of this read the shot's own top-left pixel as "the browser canvas", which is only true while
// the fixture happens not to touch the origin. Measured @measured 2026-11-25 by .design/tmp-crop-probe.mjs, a 16x16
// fixture lands at (0,1) — one pixel BELOW the origin, so the top-left pixel was browser canvas and the box came
// back 16x16; a 32x32 fixture lands at (0,0), so the top-left pixel was the FIXTURE'S GROUND and the scan counted
// every one of the 200x200 white canvas pixels as "not the background": the instrument reported a 200x200 box and
// refused its own crop. A crop derived from a guess about where the fixture sits is a crop that works at one size
// and invents pixels at another. So the canvas colour is declared, not inferred: the body paints SENTINEL,
// `svg{display:block}` so the fixture sits on a known edge, and the box is the bounding box of every pixel more
// than BG_EPS from SENTINEL — still measured per shot, never typed.
const SENTINEL = '#ff00ff';
const BG_EPS = 4;
// The sentinel must be a colour no candidate can paint, or the crop would silently eat a pixel of the drawing.
// Asserted against the two colours the fixture actually carries rather than assumed from a palette glance.
function assertSentinel(...hexes) {
  const s = hex2rgb(SENTINEL);
  for (const h of hexes) {
    const d = Math.max(...hex2rgb(h).map((c, j) => Math.abs(c - s[j])));
    if (d < 64) throw new Error(`logo-tab: SENTINEL ${SENTINEL} is within ${d} of a colour the fixture paints (${h}); the crop would drop a drawn pixel. Pick a sentinel no token renders near.`);
  }
}
// `want` is {width,height} from `fixtureLayout(...).canvas`, NOT a square `n`: a row whose frame is the full
// 240x150 plate still gets a square CANVAS (the ground rect covers the whole tab), so the box the browser scan
// finds is the canvas on both axes and its size is `canvas x canvas` whatever the drawing inside it is. The band
// the logo does not cover is reported separately as `blankPx`, never folded into the crop.
export function fixtureBox(buf, width, height, channels, want) {
  const [wn, wh] = Array.isArray(want) ? want : [want.width, want.height];
  const bg = hex2rgb(SENTINEL);
  let minX = width, minY = height, maxX = -1, maxY = -1, lit = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const d = Math.max(Math.abs(buf[i] - bg[0]), Math.abs(buf[i + 1] - bg[1]), Math.abs(buf[i + 2] - bg[2]));
    if (d > BG_EPS) { lit++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const w = maxX - minX + 1, h = maxY - minY + 1;
  if (w !== wn || h !== wh) {
    throw new Error(`logo-tab: the fixture box measured ${w}x${h} at (${minX},${minY}) in a ${width}x${height} shot against sentinel ${SENTINEL}, want ${wn}x${wh} — the crop cannot be trusted, so this reading is refused rather than rounded.`);
  }
  return { left: minX, top: minY, width: w, height: h, litPx: lit };
}
export async function browserFixture(svg, want) {
  const prof = mkdtempSync(path.join(os.tmpdir(), 'tabprof-'));
  const page = path.join(prof, 'p.html');
  const shot = path.join(prof, 'm.png');
  // The guard reads the document about to be shot, not the caller's intention: if a candidate ever paints a colour
  // near the sentinel the crop would silently eat a drawn pixel and the row would measure a quieter figure than it
  // ships.
  assertSentinel(...new Set([...svg.matchAll(/\b(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((m) => m[1])));
  writeFileSync(page, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:${SENTINEL}}svg{display:block}</style>${svg}`);
  try {
    await new Promise((res, rej) => {
      const p = spawn('firefox', ['--headless', '--no-remote', '--profile', prof, `--window-size=${VIEWPORT},${VIEWPORT}`, '--screenshot', shot, `file://${page}`], { stdio: ['ignore', 'ignore', 'pipe'] });
      const killer = setTimeout(() => p.kill('SIGKILL'), 30000);
      p.on('exit', (code) => {
        clearTimeout(killer);
        if (code === 0) res();
        else rej(new Error(`logo-tab: firefox exited ${code}`));
      });
      p.on('error', (e) => { clearTimeout(killer); rej(e); });
    });
    const full = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
    const box = fixtureBox(full.data, full.info.width, full.info.height, full.info.channels, want);
    const img = await sharp(shot).extract(box).raw().toBuffer({ resolveWithObject: true });
    return { ...img.info, data: img.data, shot: { width: full.info.width, height: full.info.height }, box };
  } finally {
    rmSync(prof, { recursive: true, force: true });
  }
}

// ---------- 7. the CLI: the artifact's ONE generator, and the check that it still regenerates ----------
// WHY THE EMITTER LIVES IN THE INSTRUMENT rather than in a script of its own: the tab glyph is the same drawing
// the hero paints, and the only thing that makes a 16px tab trustworthy is that it came out of the same table the
// hero does. A second file that hand-copies the geometry is the D190 class (a table typed by hand drifting from
// the table the code solves), and D485 is what happens when a document is assembled by copying: the shipped tab
// carried a comment its own parser refuses. So the artifact is generated here, from LOGO + LOGO_COLOURS, and the
// check is "run the generator again and compare bytes" — a defect in either the drawing or the document reds it.
//
//   npm run tab:emit T1 --ground paper --out .design/tmp-tab/favicon.svg
//   npm run tab:verify public/favicon.svg
//   npm run tab:measure public/favicon.svg --widths 16,32,48,64
//   npm run check:tab:selftest
//
// THE SHIP GUARD. Nothing tab-shaped ships before the operator's framing pick (Operator ToDo 36) and the face
// pick (ToDo 35): D316 makes colour the operator's act, and a framing is the same kind of decision (round 23's
// header says so out loud). Writing public/favicon.svg therefore requires BOTH --pick <the option letter the
// operator chose> and --ruling <the D### that records it>. A scratch path needs neither, because a specimen is
// not a ship. The guard is a function so the selftest can plant the refusal without touching the shipped file.
export const SHIPPED_TAB = 'public/favicon.svg';
export function shipGuard(outPath, pick, ruling) {
  if (path.resolve(outPath) !== path.resolve(SHIPPED_TAB)) return null;
  if (!pick || !ruling) {
    return `refusing to write ${SHIPPED_TAB}: the tab glyph is the operator's pick (ToDo 36) and a ship needs the ruling that records it. Pass --pick <the option the operator chose> --ruling <D###>. The specimen goes to .design/ instead (D316: colour is the operator's act; D42/D124: nothing ships on a delegate's say-so).`;
  }
  return null;
}

// Rows G3/G4 declare their colour as `null` in the options file because the gold is the SOLVE's output. The solve
// is committed in the round record, so the emitter reads the record rather than re-deriving a gold in a second
// place: the record reproduces its own colour, and the candidate goes through `declareCandidate`, which is the
// same token->bytes path a shipped token uses and refuses a name that shadows one (D485's unit trap, D316's rule
// that inventing a token is the operator's act).
const GOLD_RECORD = 'design/grill/round23/report.json';
export function withSolvedGold(row) {
  if (row.colours !== 'goldLine' && row.colours !== 'goldPlate') return row;
  if (row.candidate || row.ground) return row;
  let rec;
  try { rec = JSON.parse(readFileSync(GOLD_RECORD, 'utf8')); }
  catch (e) { throw new Error(`logo-tab: row ${row.id} prices a gold the round solves, and ${GOLD_RECORD} is not readable (${e.message})`); }
  const cands = rec?.gold?.candidates;
  if (!cands) throw new Error(`logo-tab: ${GOLD_RECORD} has no gold.candidates, so row ${row.id} has no colour to paint. Run npm run round23 to re-solve it.`);
  const role = row.colours === 'goldLine' ? 'line' : 'plate';
  const names = {};
  for (const g of ['paper', 'ink']) {
    const c = cands[`${role}-${g}`];
    if (!c?.spec) throw new Error(`logo-tab: ${GOLD_RECORD} carries no gold solve for role ${role} on the ${g} ground, which row ${row.id} needs.`);
    const name = c.name ?? `gold-${role}-${g}`;
    declareCandidate(name, c.spec, 'design/logo-tab.mjs (the gold solve carried from the round 23 record)');
    names[g] = name;
  }
  return row.colours === 'goldLine' ? { ...row, candidate: names } : { ...row, ground: names };
}

export function tabRow(id) {
  const r = TAB_ROWS.find((x) => x.id === id);
  if (!r) throw new Error(`logo-tab: no tab row "${id}". The framings this instrument knows: ${TAB_ROWS.map((x) => x.id).join(', ')}.`);
  if (r.incumbent) throw new Error(`logo-tab: row ${id} is the tab as it ships (the summand glyph), not a framing to emit — it is read off public/favicon.svg at run time, never generated (D481 §c).`);
  return r;
}

// The provenance line is part of the artifact. XML 1.0 §7.4 forbids `--` inside a comment and the shipped tab
// broke it (D485), so the emitter asserts its own comment rather than trusting a hand-written one — the class of
// defect this instrument exists to prevent is the one it caused once.
export function provenanceComment(row, ground, w, pick, ruling) {
  const s = `logo-tab artifact: row ${row.id} (${row.frame} framing, ${row.colours} colour plan), ground ${ground}, weight k=${w.k} (thinnest stroke ${w.swMin} device px at ${w.at}px), drawn from src/lib/logo.mjs by design/logo-tab.mjs${pick && ruling ? `, operator pick ${pick} under ruling ${ruling}` : ', specimen only: no operator pick yet'}${row.colours.startsWith('gold') ? ', gold from design/grill/round23/report.json' : ''}`;
  if (s.includes('--')) throw new Error(`logo-tab: the provenance comment would contain a double hyphen, which XML 1.0 §7.4 forbids inside a comment (the defect D485 found in the shipped tab): "${s}"`);
  return `<!-- ${s} -->`;
}

export function parseProvenance(svg) {
  const m = svg.match(/<!--\s*logo-tab artifact:[\s\S]*?-->/);
  if (!m) return null;
  const s = m[0];
  return {
    raw: s,
    row: (s.match(/row ([A-Za-z0-9]+) \(/) || [])[1] ?? null,
    ground: (s.match(/ground (paper|ink),/) || [])[1] ?? null,
    k: (s.match(/weight k=([0-9.]+)/) || [])[1] ?? null,
    pick: (s.match(/operator pick ([A-Za-z0-9.]+) under/) || [])[1] ?? null,
    ruling: (s.match(/ruling (D[0-9]+)/) || [])[1] ?? null,
  };
}

// A hand-copied tab can carry any comment it likes; it cannot carry the table. The artifact must paint exactly
// the shapes the shipped logo declares: LOGO.shapes.length stroked shapes and one filled pole dot. Derived from
// the table, never typed.
export const EXPECTED_STROKED = LOGO.shapes.length;
export const EXPECTED_FILLED = 1;
export function shapeCountFindings(svg, label = 'the artifact') {
  const stroked = [...svg.matchAll(/<(?:circle|path)\b[^>]*\bfill="none"[^>]*\bstroke="#[0-9a-f]{6}"/g)].length;
  const filled = [...svg.matchAll(/<(?:circle|path)\b[^>]*\bfill="#[0-9a-f]{6}"[^>]*\bstroke="none"/g)].length;
  const out = [];
  if (stroked !== EXPECTED_STROKED) out.push(`${label} paints ${stroked} stroked shape(s); src/lib/logo.mjs declares ${EXPECTED_STROKED} — the artifact's geometry disagrees with the table the hero draws from`);
  if (filled !== EXPECTED_FILLED) out.push(`${label} paints ${filled} filled shape(s); the logo has exactly one (the pole dot) — a tab missing the meeting point is a different figure`);
  return out;
}

// A tab glyph is drawn on a plate and the 16x16 slot scales the plate to FIT, so the effective scale is
// 16 / (the plate's longer side). This is the same scaleAt the round measures with, applied to the artifact's
// own viewBox rather than to a row spec, so it works on a document the instrument did not generate.
export function artifactFrame(svg) {
  const vb = (svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/) || []).slice(1).map(Number);
  return { x: vb[0], y: vb[1], w: vb[2] || 0, h: vb[3] || 0, scale16: vb[2] && vb[3] ? scaleAt({ w: vb[2], h: vb[3] }, 16) : 0 };
}

// D119's bite, MEASURED rather than proxied. DESIGN.md states the two rules the render gate holds for line art:
// "the pair >= 3.0, and the device stroke >= 1px", and describes ~1.5 device px as the point below which a
// stroke "never contains a fully covered pixel". Round 23 counted the pixels themselves at the 16px slot for all
// 15 framings x 2 grounds @measured 2026-11-25 by `npm run round23` (Linux native, Node 24.22.1,
// design/grill/round23/report.json; `fullPx` = pixels within 6 RGB units of the declared ink byte; each pair is
// paper then ink, librsvg then firefox): N0 0.18px -> 0/0 then 0/0; T4 0.75px -> 0/0 then 0/0; T2 1.00px -> 4/2
// then 4/2; T1 1.50px -> 54/55 then 59/57; T3 2.50px -> 125/124 then 123/120. (The first round-23 run quoted
// 3/3, 19/18 and 59/60 for T2/T1/T3: the fixture centred the FRAME but translated by only dx/dy, so every frame
// with a non-zero origin drew the logo shifted out of the slot and the instrument was counting a clipped drawing.
// `fixtureLayout` now returns tx = dx - f.x, ty = dy - f.y and fixtureSvg and runProfile use that one mapping;
// after the fix all 28 row x ground readings agree exactly between the artifact raster and the fixture raster.)
// So 1.5 is a description of when coverage gets thin, not the floor a gate can enforce: taken as a rule it
// refuses T2, which both rasterizers prove has bytes. What this instrument ENFORCES is the floor the render gate
// already states (1 device px), and the byte count in rule 7 below is the measurement that makes "no byte
// identity" a fact about the artifact instead of an extrapolation from a stroke-width literal.
export const TAB_LINE_FLOOR_PX = 1.0; // DESIGN.md: "the gate holds both: the pair >= 3.0, and the device stroke >= 1px"
export function lineFloorFindings(svg, label = 'the artifact') {
  const f = artifactFrame(svg);
  const sws = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => +m[1]);
  if (!f.scale16 || !sws.length) return [];
  const px = Math.min(...sws) * f.scale16;
  if (px >= TAB_LINE_FLOOR_PX - 0.001) return [];
  return [`${label}'s thinnest line is ${px.toFixed(2)} device px in the 16x16 tab slot (${Math.min(...sws)}u drawn on a ${f.w}x${f.h}u plate); the render gate states ${TAB_LINE_FLOOR_PX} device px as the floor a line can be read at (DESIGN.md, D119 as measured in S112), so this tab paints a line with no byte identity — tighten the frame or raise the weight (${label.replace(/\s+/g, ' ')})`];
}

// Rule 7, the measurement under the floor: raster the artifact at the slot it is actually drawn in (16px, MDN,
// quoted in round 23's record) and count the pixels that reach the declared ink byte. A glyph whose every line
// is a half-covered blend has zero of these, and no stroke-width arithmetic in the document's text can say so.
// The incumbent is the control here too: the shipped summand paints 1 fully covered pixel (librsvg) / 5 (firefox)
// at 16px @measured 2026-11-25 by `npm run round23`, so "a tab glyph must have at least one real byte" is a bar
// the tab already clears, not one invented for the candidates.
export const TAB_FULL_PIXEL_MIN = 1;
export async function byteIdentityFindings(svgPath, svg) {
  const ground = (svg.match(/<rect[^>]*\bfill="(#[0-9a-f]{6})"/) || [])[1];
  const paints = [...new Set([...svg.matchAll(/\b(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((m) => m[1]))];
  const inks = paints.filter((p) => p !== ground);
  if (!inks.length) return [`${svgPath} paints no ink at all: every colour literal in it is the ground (${ground}) — an empty mark`];
  let img, st;
  try {
    img = await rasterArtifactAt(svg, 16, ground ?? paints[0]);
    st = stats(img, ground ?? paints[0], inks);
  } catch (e) {
    return [`${svgPath} could not be rasterized at the 16px tab slot: ${e.message}`];
  }
  if (st.fullPx >= TAB_FULL_PIXEL_MIN) return [];
  return [`${svgPath} paints ${st.fullPx} fully covered ink pixel(s) in the 16x16 tab slot (${st.anyPx} pixels differ from the ground at all, max painted contrast ${st.maxContrast}): no line of this glyph reaches its declared byte, so the tab has no byte identity — the D119 limit measured on this document rather than inferred from its stroke-width literals (${svgPath.replace(/\s+/g, ' ')})`];
}

// Where two documents differ, said in a way a reader can act on. A line the generator does not write is not the
// same defect as a line it writes differently, and the naive index reports "line 0 differs — undefined vs
// undefined" for the first, which is the bug this helper exists to remove.
export function byteDiff(expected, actual) {
  const a = expected.split('\n'), b = actual.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    if (a[i] === undefined) return `line ${i + 1} is a line the instrument does not generate: "${b[i].trim()}"`;
    if (b[i] === undefined) return `line ${i + 1} is missing from the artifact; the instrument writes "${a[i].trim()}"`;
    return `line ${i + 1} differs — generated "${a[i].trim()}", artifact "${b[i].trim()}"`;
  }
  return 'the octets differ somewhere a line comparison cannot see';
}

// The verdict function (add-a-gate anatomy 1): pure over the document's bytes, so the selftest can plant defects
// without touching the shipped file.
export async function tabFindings(svgPath) {
  let svg;
  try { svg = readFileSync(svgPath, 'utf8'); }
  catch { return [`${svgPath} does not exist — the tab has no generated artifact`]; }
  const findings = [];

  // 1. a renderer must accept it (D485: four colour rules printed PASS on a document librsvg refuses).
  try { await sharp(Buffer.from(svg)).metadata(); }
  catch (e) { findings.push(`${svgPath} is not a document a renderer will load: ${e.message}`); }

  // 2. no comment a parser refuses, and no comment at all other than the provenance one.
  const faults = xmlCommentFaults(svg);
  if (faults.length) findings.push(`${svgPath} carries ${faults.length} comment(s) containing a double hyphen, which XML 1.0 §7.4 forbids: ${faults.map((f) => `"${f.snippet}"`).join(', ')} (D485)`);

  // 3. the document says what it is.
  const prov = parseProvenance(svg);
  if (!prov) {
    findings.push(`${svgPath} carries no provenance line naming the logo-tab row, ground and weight it was generated from — a tab glyph nobody can regenerate is a tab glyph nobody can check (the hand-copy class D485 found)`);
  } else if (!prov.row || !prov.ground || prov.k == null) {
    findings.push(`${svgPath}'s provenance line is unparseable: it must name row, ground and weight. Found: ${prov.raw.replace(/\s+/g, ' ').trim()}`);
  } else {
    let row;
    try { row = tabRow(prov.row); } catch (e) { findings.push(e.message); }
    if (row) {
      if (!['paper', 'ink'].includes(prov.ground)) findings.push(`${svgPath} names ground "${prov.ground}", which is not one of the two grounds this instrument paints (paper, ink)`);
      else {
        const w = weightFor(row, frameOf(row), row.floorPx ?? null);
        if (Math.abs(w.k - Number(prov.k)) > 1e-9) {
          findings.push(`${svgPath} declares weight ${prov.k} but row ${prov.row} solves to ${w.k}: the artifact was hand-edited, not generated (row ${prov.row} weights to reach ${row.floorPx ?? 'no'} device px at ${row.weightAt}px)`);
        }
        // 4. regenerate and compare bytes. This is the rule that survives any pick: whatever row the operator
        //    chooses, the shipped tab must be the bytes the instrument produces for that row.
        const expected = provenanceComment(withSolvedGold(row), prov.ground, w, prov.pick, prov.ruling) + '\n' + artifactSvg(withSolvedGold(row), prov.ground, Number(prov.k));
        if (expected !== svg) {
          findings.push(`${svgPath} does not regenerate from design/logo-tab.mjs for row ${prov.row} on ${prov.ground}: ${byteDiff(expected, svg)} (the artifact is not the drawing the table declares)`);
        }
        // 5. the geometry the document carries, independent of the comment.
        findings.push(...shapeCountFindings(svg, svgPath));
        // 6. the drawing is legible in the slot it is drawn for (D119, the stated device-stroke floor).
        findings.push(...lineFloorFindings(svg, svgPath));
        // 7. and that is checked by counting the pixels, not by trusting the rule above.
        findings.push(...await byteIdentityFindings(svgPath, svg));
      }
    }
  }
  return findings;
}

// Read the artifact as a browser sees it: rasterized at the tab sizes, with the line widths the document's own
// stroke literals land at, and the ink counted in device pixels.
export async function measureArtifact(svgPath, widths = [16, 32, 48, 64]) {
  const svg = stripComments(readFileSync(svgPath, 'utf8'));
  const vb = (svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/) || []).slice(1).map(Number);
  const frame = { w: vb[2] || 1, h: vb[3] || 1 };
  const sws = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => +m[1]);
  const paints = [...new Set([...svg.matchAll(/\b(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((m) => m[1]))];
  const ground = (svg.match(/<rect[^>]*\bfill="(#[0-9a-f]{6})"/) || [])[1] ?? paints[0];
  const inks = paints.filter((p) => p !== ground);
  const rows = [];
  for (const n of widths) {
    const img = await rasterArtifactAt(svg, n, ground);
    const st = stats(img, ground, inks);
    const scale = scaleAt(frame, n);
    rows.push({
      width: n, scale: +scale.toFixed(4),
      strokeMinPx: sws.length ? +(Math.min(...sws) * scale).toFixed(2) : null,
      strokeMaxPx: sws.length ? +(Math.max(...sws) * scale).toFixed(2) : null,
      ...st,
    });
  }
  return {
    path: svgPath, frame, paints, ground,
    pairContrast: inks.length ? inks.map((i) => ({ ink: i, vsGround: +contrastRGB(hex2rgb(i), hex2rgb(ground)).toFixed(2) })) : [],
    rows,
  };
}

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12);

export async function main(argv = process.argv.slice(2)) {
  // flag values are read by their bare name: opt('ground') answers `--ground paper`.
  const opt = (name, dflt = null) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
  if (argv.includes('--selftest')) return selftest();
  if (argv.includes('--rows')) {
    for (const r of TAB_ROWS) console.log(`${r.id}  ${r.frame ?? '(incumbent)'}  ${r.colours ?? '(as shipped)'}  k=${r.floorPx == null ? 1 : weightFor(r, frameOf(r), r.floorPx).k}  ${r.label}`);
    return 0;
  }
  if (argv.includes('--emit')) {
    const id = opt('emit');
    if (!id) throw new Error(`logo-tab: --emit needs a row id. The framings this instrument knows: ${TAB_ROWS.map((x) => x.id).join(', ')} (I0 is the tab as it ships and is never generated). Run --rows to see them.`);
    const row = tabRow(id);
    const ground = opt('ground', 'paper');
    if (!['paper', 'ink'].includes(ground)) throw new Error(`logo-tab: --ground must be paper or ink, got "${ground}"`);
    const pick = opt('pick'), ruling = opt('ruling');
    const out = opt('out', path.join('.design', 'tmp-tab', `favicon-${row.id}-${ground}.svg`));
    const guard = shipGuard(out, pick, ruling);
    if (guard) { console.error(`logo-tab: ${guard}`); return 1; }
    const w = weightFor(row, frameOf(row), row.floorPx ?? null);
    const svg = provenanceComment(withSolvedGold(row), ground, w, pick, ruling) + '\n' + artifactSvg(withSolvedGold(row), ground, w.k);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, svg);
    const paints = [...new Set([...svg.matchAll(/\b(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((m) => m[1]))];
    console.log(`wrote ${out}  row ${row.id} on ${ground}  k=${w.k}  plate ${frameOf(row).w}x${frameOf(row).h}u  paints ${paints.join(' / ')}`);
    const gate = spawnSync(process.execPath, ['scripts/check-favicon.mjs', out], { encoding: 'utf8' });
    const outText = `${gate.stdout ?? ''}${gate.stderr ?? ''}`.trim();
    console.log(`check:favicon on it (exit ${gate.status}): ${outText.split('\n').join('\n  ')}`);
    return 0;
  }
  if (argv.includes('--verify')) {
    const p = opt('verify', SHIPPED_TAB);
    const f = await tabFindings(p);
    if (!f.length) { console.log(`PASS: ${p} regenerates from design/logo-tab.mjs byte for byte, parses, and paints the shapes the logo table declares`); return 0; }
    f.forEach((x) => console.log(`FAIL: ${x}`));
    return 1;
  }
  if (argv.includes('--measure')) {
    const p = opt('measure', SHIPPED_TAB);
    const widths = (opt('widths', '16,32,48,64') || '').split(',').map(Number);
    const m = await measureArtifact(p, widths);
    console.log(`${m.path}: plate ${m.frame.w}x${m.frame.h}u, paints ${m.paints.join(' / ')}, ground ${m.ground}`);
    console.log(`  pair contrast: ${m.pairContrast.map((c) => `${c.ink} vs ground = ${c.vsGround}`).join(', ') || 'single colour'}`);
    for (const r of m.rows) {
    console.log(`  @${r.width}px  scale ${r.scale}u/px  stroke ${r.strokeMinPx ?? 'none (no stroked shape)'}-${r.strokeMaxPx ?? ''} device px  any ${r.anyPx} px  at3 ${r.at3Px} px  full ${r.fullPx} px  coverage ${r.coveragePct}%  max contrast ${r.maxContrast}`);
    // `null < 1.0` is true in JS, so a document with no stroked shape at all (the shipped summand is a FILL) would
    // be reported as "too thin" by a null comparison. The floor is a rule about lines; a glyph with no lines is
    // not a glyph whose lines are thin, and rule 7 is what measures its bytes instead.
    if (r.strokeMinPx !== null && r.strokeMinPx < TAB_LINE_FLOOR_PX) console.log(`    under the ${TAB_LINE_FLOOR_PX} device px line floor (DESIGN.md, D119): the thinnest line is thinner than the gate allows at this size`);
    if (r.fullPx < TAB_FULL_PIXEL_MIN) console.log(`    measured: ${r.fullPx} fully covered ink pixels at this size — the glyph has no byte identity here (D119)`);
    }
    return 0;
  }
  console.log('logo-tab: nothing to do. Use --emit <row> [--ground paper|ink] [--out path] [--pick X --ruling D###], --verify <path>, --measure <path> [--widths 16,32,48,64], --rows or --selftest.');
  return 1;
}

// THE SELFTEST (add-a-gate anatomy 3): every case is a mutation of a document the instrument itself generated,
// and each one must be NAMED by the verdict. The control is a clean emission, so a green run means the detector
// is not merely always green. Scratch lives in .design/ (gitignored); the shipped tab is read but never written.
async function selftest() {
  const dir = path.join('.design', 'tmp-tab-selftest');
  mkdirSync(dir, { recursive: true });
  const emit = (id, ground) => {
    const row = tabRow(id);
    const w = weightFor(row, frameOf(row), row.floorPx ?? null);
    const body = provenanceComment(withSolvedGold(row), ground, w, null, null) + '\n' + artifactSvg(withSolvedGold(row), ground, w.k);
    const p = path.join(dir, `tab-${id}-${ground}.svg`);
    writeFileSync(p, body);
    return { p, body };
  };
  const cases = [];
  const add = (name, p, expect) => cases.push([name, p, expect]);
  const add2 = (name, body, expect) => { const p = path.join(dir, name.replace(/[^A-Za-z0-9._-]/g, '_')); writeFileSync(p, body); cases.push([name, p, expect]); };

  // controls: the instrument's own output must be clean on every framing that clears the line floor, on both
  // grounds, in both colour plans, and with the gold candidates read from the committed solve.
  const cPaper = emit('T1', 'paper'), cInk = emit('T1', 'ink');
  add('control: T1 (1.5 device px at 16) on paper', cPaper.p, []);
  add('control: T1 on ink', cInk.p, []);
  add2('control: T3 (the heavy end, 2.5 device px)', emit('T3', 'paper').body, []);
  add2('control: T2 (exactly on the 1.0 device px floor, measured 4 full pixels at 16 on paper)', emit('T2', 'paper').body, []);
  add2('control: T5 (whole plate letterboxed, 240x150)', emit('T5', 'paper').body, []);
  add2('control: T8 (every line one colour)', emit('T8', 'ink').body, []);
  add2('control: G1 (the site\'s warm accent, no new token)', emit('G1', 'paper').body, []);
  add2('control: G3 (gold line, candidate from the round record)', emit('G3', 'paper').body, []);
  add2('control: G4 (gold plate, candidate from the round record)', emit('G4', 'ink').body, []);

  // the shipped tab: the instrument reads it and refuses it, because it is a glyph no generator can reproduce.
  add('the shipped summand glyph has no provenance to verify', SHIPPED_TAB, ['no provenance']);

  // plantings, each one the defect class the rule exists to catch.
  add2('a hand-edited stroke width', cPaper.body.replace(/stroke-width="[\d.]+"/, 'stroke-width="2.4"'), ['does not regenerate']);
  add2('a provenance line whose weight is a lie', cPaper.body.replace(/weight k=[\d.]+/, 'weight k=2.000'), ['solves to']);
  add2('the provenance comment stripped', stripComments(cPaper.body), ['no provenance']);
  add2('a provenance naming a row that does not exist', cPaper.body.replace('row T1 (', 'row ZZ ('), ['no tab row']);
  // The D485 planting is the exact string the shipped tab carried: a token name written with its `--` prefix.
  add2('a comment carrying a token name (D485)', cPaper.body + '\n<!-- rx 6 is --radius-control -->\n', ['double hyphen']);
  add2('the meeting point deleted by hand', cPaper.body.replace(/<circle cx="[\d.]+" cy="[\d.]+" r="[\d.]+" fill="#[0-9a-f]{6}" stroke="none"\/>/, ''), ['filled shape', 'does not regenerate']);
  // The legibility plantings are not mutations: they are the instrument's own output for rows that cannot be
  // read at 16 device px. Naming them as cases is what turns "T2 is lighter" into a gate finding, and it is
  // the price the operator is choosing between (ToDo 36): a lighter glyph is a glyph with no bytes.
  add2('legibility: N0, the hero weights with no tab tuning', emit('N0', 'ink').body, ['thinnest line is', 'D119', 'fully covered ink pixel']);
  add2('legibility: T4, weighted for 32px and read at 16', emit('T4', 'paper').body, ['thinnest line is', 'D119', 'fully covered ink pixel']);
  // The byte-count rule is planted by itself, not through the arithmetic: every stroke widened to 0.5u is a line
  // the document still calls a line, and the raster is what says it has no bytes.
  add2('byte identity: every stroke halved, counted in pixels', cPaper.body.replace(/stroke-width="[\d.]+"/g, 'stroke-width="0.5"'), ['fully covered ink pixel', 'thinnest line is']);
  add2('byte identity: ink painted in the ground colour (an empty mark)', cPaper.body.replace(/(fill|stroke)="#[0-9a-f]{6}"/g, (_whole, kind) => `${kind}="${cPaper.body.match(/<rect[^>]*\bfill="(#[0-9a-f]{6})"/)[1]}"`), ['no ink at all']);

  // the ship guard, planted both ways without ever writing the shipped file.
  const before = sha(SHIPPED_TAB);
  const refused = shipGuard(SHIPPED_TAB, null, null);
  const allowed = shipGuard(SHIPPED_TAB, '36a', 'D491');
  const unchanged = sha(SHIPPED_TAB) === before;
  console.log(`ship guard: without a pick -> ${refused ? 'refused' : 'ALLOWED (WRONG)'}; with pick 36a under D491 -> ${allowed ? 'refused (WRONG)' : 'allowed'}; ${SHIPPED_TAB} bytes ${unchanged ? 'untouched' : 'MODIFIED (WRONG)'}`);
  const guardOk = !!refused && allowed === null && unchanged;

  // an emit aimed at the shipped path without a ruling must refuse, and must not touch the file.
  const emitExit = await main(['--emit', 'T1', '--ground', 'paper', '--out', SHIPPED_TAB]);
  const stillSame = sha(SHIPPED_TAB) === before;

  // the measure instrument: it must print real numbers for the artifact it generated, and name the line floor.
  const mLegit = await measureArtifact(cPaper.p, [16]);
  const mUntuned = await measureArtifact(emit('N0', 'ink').p, [16]);
  // The incumbent as a CONTROL for the byte rule (D481 §c): the shipped summand is a FILL, so it has no
  // stroke-width literal at all. `null < 1.0` is true in JS, so a measure that compares the stroke minimum
  // without naming its own nullity would report "too thin" for a glyph that has no lines to be thin. The
  // incumbent must clear the measured byte bar (1 fully covered pixel at 16 @measured 2026-11-25 by
  // npm run round23) or the bar is one the tab itself fails, which makes it not a bar.
  const mIncumbent = await measureArtifact(SHIPPED_TAB, [16]);
  const incumbentOk = mIncumbent.rows[0].strokeMinPx === null && mIncumbent.rows[0].fullPx >= TAB_FULL_PIXEL_MIN;
  console.log(`measure incumbent @16px: no stroke literal (${mIncumbent.rows[0].strokeMinPx}), ${mIncumbent.rows[0].fullPx} fully covered pixel(s), ${mIncumbent.rows[0].coveragePct}% coverage`);
  if (!incumbentOk) wrong++;

  let wrong = 0;
  for (const [name, p, expect] of cases) {
    const got = await tabFindings(p);
    // a planting must be named; every phrase the case expects must appear somewhere in the findings (one
    // defect can be reported by two rules, and requiring both in one sentence would be a typo waiting to fail).
    const ok = expect.length === 0 ? got.length === 0 : expect.every((e) => got.some((f) => f.includes(e)));
    if (!ok) wrong++;
    console.log(`${ok ? 'ok   ' : 'WRONG'} ${name.padEnd(50)} ${got.join(' | ') || 'PASS'}`);
  }
  console.log(`measure @16px: T1/paper ${mLegit.rows[0].strokeMinPx}-${mLegit.rows[0].strokeMaxPx} device px, ${mLegit.rows[0].fullPx} full px, ${mLegit.rows[0].coveragePct}% coverage; N0/ink ${mUntuned.rows[0].strokeMinPx}-${mUntuned.rows[0].strokeMaxPx} device px, ${mUntuned.rows[0].fullPx} full px, ${mUntuned.rows[0].coveragePct}% coverage`);
  if (mLegit.rows[0].at3Px < 1) { wrong++; console.log('WRONG measure: the instrument reports no ink in a document it painted'); }
  // The floor's number is quoted from the finding itself, so a change in the stated floor cannot leave a
  // planting expecting the old one.
  if (mLegit.rows[0].fullPx < TAB_FULL_PIXEL_MIN || mUntuned.rows[0].fullPx >= TAB_FULL_PIXEL_MIN) { wrong++; console.log('WRONG measure: the measured byte count does not match the verdicts'); }
  if (!guardOk) wrong++;
  if (emitExit !== 1 || !stillSame) { wrong++; console.log('WRONG ship guard: the CLI wrote or accepted ' + SHIPPED_TAB + ' without a ruling'); }
  let badThrow = 0;
  try { tabRow('ZZ'); } catch (e) { badThrow = /no tab row "ZZ"/.test(e.message) ? 1 : 0; }
  try { tabRow('I0'); } catch (e) { badThrow += /is the tab as it ships/.test(e.message) ? 1 : 0; }
  if (badThrow !== 2) { wrong++; console.log('WRONG row guard: an unknown id or the incumbent row did not name itself'); }
  else console.log('ok   row guard: "ZZ" and the incumbent row I0 both refused by name');

  rmSync(dir, { recursive: true, force: true });
  console.log(`\n${cases.length + 4} tab-artifact cases, ${wrong} wrong`);
  return wrong ? 1 : 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main().then((code) => process.exit(code)).catch((e) => { console.error(`logo-tab: ${e.message}`); process.exit(1); });
