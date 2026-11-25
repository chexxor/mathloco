// logo-tab.mjs — the instrument for the TAB artifact: the ratified logo drawn from the shipped table, rendered
// at tab sizes, and measured in pixels. Grill round 23 (2026-11-24) is its first reader; `logo-lands` is the second.
//
// WHY A SEPARATE INSTRUMENT EXISTS. Every logo probe in this repo measures the logo at HERO widths (320/640/1240
// device px, `logo-geometry.mjs`, `logo-pixels.mjs`) or on the share card (1200x630). The tab is a
// 16x16 slot (MDN's glossary on favicons: "Usually, a favicon is 16 x 16 pixels"), and at 16px a 1.4-unit stroke
// in a 240-unit plate is 0.09 device px — two orders of magnitude below the logo's own line-weight floor (D119:
// a stroke thinner than ~1.5px never contains a fully-covered pixel). So "check:logo PASS at 320" says nothing
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
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { LOGO, LOGO_SLOTS, LOGO_COLOURS } from '../src/lib/logo.mjs';
import { colourEntry } from './palette-tokens.mjs';
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
export function fixtureLayout(spec, n, padPx = 0) {
  const f = frameOf(spec);
  const scale = scaleAt(f, n);
  const drawW = f.w * scale, drawH = f.h * scale;
  const canvas = n + 2 * padPx;
  const ox = padPx + (n - drawW) / 2, oy = padPx + (n - drawH) / 2;
  return {
    frame: f, scale, drawW, drawH, canvas, ox, oy,
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
  const tf = `translate(${L.ox.toFixed(3)} ${L.oy.toFixed(3)}) scale(${L.scale.toFixed(6)})${L.frame.dx || L.frame.dy ? ` translate(${L.frame.dx} ${L.frame.dy})` : ''}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.canvas}" height="${L.canvas}" viewBox="0 0 ${L.canvas} ${L.canvas}">\n  <rect x="0" y="0" width="${L.canvas}" height="${L.canvas}" fill="${groundHex(spec, ground)}"/>\n  <g transform="${tf}">\n${body}\n  </g>\n</svg>\n`;
}

// ---------- 5. rasterize and count ----------
// `flattenGround`: librsvg leaves every pixel the drawing does not cover TRANSPARENT, and `raw()` hands back the
// un-premultiplied triple of a pixel with no coverage at all (see the probe cited above). Flattening onto the
// fixture's own ground makes "a pixel that differs from the ground" mean what it says. The fixture already paints
// the whole canvas, so this is belt-and-braces for any caller that hands in a document that does not.
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
  const f = frameOf(spec); const s = scaleAt(f, n);
  const L = fixtureLayout(spec, n);
  const ox = L.ox, oy = L.oy;
  const dx = f.dx ?? 0, dy = f.dy ?? 0;
  const one = LOGO.shapes.find((x) => x.slot === slot);
  if (!one || one.tag !== 'path') return null;
  const gh = groundHex(spec, ground);
  const img = await raster(fixtureSvg({ ...spec }, ground, n, k, [slot]), n, gh);
  const g = hex2rgb(gh);
  const ink = hex2rgb(hexOf(colourPlan(spec, ground)[slot]));
  let runs = 0, longest = 0, cur = 0, on = 0, full = 0;
  for (const [x, y] of samplePath(one.d, 400)) {
    const px = Math.round((x + dx) * s + ox), py = Math.round((y + dy) * s + oy);
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
