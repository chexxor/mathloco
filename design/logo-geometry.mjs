// logo-geometry.mjs — does the drawn logo actually say "two parallel lines meet on a curved surface"?
//
//   node logo-geometry.mjs <shot.png> <render-json> [--index 0] [--table <module.mjs>] [--json]
//
// e.g.
//   node design/grill/dist-measure.mjs dist/client / design/grill/render-measure.js 320 1400 .design/render/logo-320.png
//   node logo-geometry.mjs .design/render/logo-320.png .design/render/_-320.json
//
// WHY THIS EXISTS. `check:render` proves the logo ARRIVES (shape count, box ratio, per-shape contrast, device
// stroke width) and `logo-pixels.mjs` proves how much of it LANDS (coverage). Neither can see what it *says*.
// The logo shipped for two days saying "several routes arriving at one point" when the club's figure says "two
// lines that are parallel, meeting because the surface is curved" — and the drawing did not contain a single
// parallel pair, contained a line the source does not have, and omitted the equator that establishes the
// parallelism (src/lib/logo.mjs, corrected 2026-11-02). That is a meaning bug, and it survived a ratified
// specimen, a shape-count gate and two pixel gates, because nothing measured it.
//
// It is decidable in pixels. "Parallel" is a constant separation between two strokes over a stretch; "meet" is
// that separation collapsing to one crossing; "on a curved surface" is that crossing sitting at the ring's
// radius from the ring's centre rather than inside it. All three are measured here, off the built page.
//
// WHAT IT READS. Two things, and it compares them rather than trusting either:
//   1. the GEOMETRY TABLE (src/lib/logo.mjs, or `--table path` to test another reading of the logo —
//      which is how the control run proves this probe can fail: point it at the pre-fix table from git);
//      2. the PAINTED PIXELS inside the logo's box in a screenshot of the built page. Colour decides whether a
//      pixel is INK at all (distance from the sampled ground); GEOMETRY decides which declared shape it belongs
//      to, because colour cannot separate a thin dark stroke from a light one — see the attribution block below.
// A table that says parallel and a page that paints converging lines is exactly the drift this repo keeps
// finding, so a mismatch is a failure, not a note.
//
// Exit 0 = every check passed. Exit 1 = at least one failed: unlike `lines:measure` (a diagnostic that reports
// whatever it finds), this one has a verdict, because a logo that misstates the club's own diagram is a defect.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { oklchFromRgb, oklchToRgb } from './grill/okcolor.mjs';   // the repo's one OKLab implementation (D101)

const argv = process.argv.slice(2);
process.stdout.on('error', () => process.exit(0));      // this report gets piped into `head`; a closed pipe is not a crash
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1] ?? d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--index' && argv[i - 1] !== '--table');
const [shot, jsonFile] = positional;
const idx = Number(flag('index', positional[2] ?? '0'));
const tablePath = argv.includes('--table') ? resolve(flag('table')) : resolve('src/lib/logo.mjs');
const JSONOUT = argv.includes('--json');
if (!shot || !jsonFile) {
  console.error(`usage: node logo-geometry.mjs <shot.png> <render-json> [--index 0] [--table other-logo.mjs] [--json]`);
  process.exit(2);
}
for (const f of [shot, jsonFile, tablePath]) if (!existsSync(f)) { console.error(`no such file: ${f}`); process.exit(2); }

const { LOGO } = await import(tablePath);
const j = JSON.parse(readFileSync(jsonFile, 'utf8'));
const m = (j.marks || [])[idx];
if (!m) { console.error(`${jsonFile} reports no measured logo at index ${idx}`); process.exit(1); }

// ---------- the table: read the figure out of the geometry, do not assume it ----------
const num = (s) => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);
const sphere = LOGO.shapes.find((s) => s.role === 'sphere' && s.tag === 'circle');
const chords = LOGO.shapes.filter((s) => s.role === 'sphere' && s.tag === 'path');
const routes = LOGO.shapes.filter((s) => s.role === 'route');
const marks2 = LOGO.shapes.filter((s) => s.role === 'accent');
const fails = [];
const rows = [];
const check = (name, ok, detail) => { rows.push([ok, name, detail]); if (!ok) fails.push(`${name}: ${detail}`); };

check('the surface', !!sphere, sphere ? `<circle> r ${sphere.r} at ${sphere.cx},${sphere.cy}` : 'no role:"sphere" <circle> — the logo draws no curved surface');
check('two lines, exactly', routes.length === 2, `${routes.length} role:"route" shape(s). The figure is TWO lines; a third line through the middle is the defect the 2026-11-02 correction removed (it turned the pair into an arrow)`);
check('the equator exists', chords.length >= 1, chords.length ? '' : 'no role:"sphere" <path> — without the reference line the two lines cannot be seen as parallel, which is the logo\'s whole claim');
// How each equator arc is drawn, read off the geometry rather than trusted from a field: which way it bows
// (controls above the endpoints = away from a viewer sitting above the equator = the FAR side) and whether it is
// broken. Needed by both the table checks and the painted ones, so it is computed once, here.
const bows = chords.map((c) => {
  const n = num(c.d);
  // Read the path as (x,y) PAIRS, not as a bag of numbers: the first version of this line took max|n - y| over
  // every remaining number, which measured the arc's horizontal reach (100 units for a 58-unit radius) and made
  // the curvature check pass by arithmetic instead of by the drawing being curved. This is the offset of the
  // CONTROL points off the endpoints; the apex a cubic actually reaches is 0.75 of it, and the apex the page
  // PAINTS is measured separately, in pixels, below.
  const y0 = n[1];
  const ys = [];
  for (let k = 2; k + 1 < n.length; k += 2) ys.push(n[k + 1]);
  return ys.length ? Math.max(...ys.map((y) => Math.abs(y - y0))) : 0;
});
const faces = chords.map((c, i) => {
  const n = num(c.d);
  const ys = [];
  for (let k = 2; k + 1 < n.length; k += 2) ys.push(n[k + 1]);
  const up = ys.length ? ys.reduce((a, y) => a + (y < n[1] ? -1 : 1), 0) < 0 : null;
  return { i, face: c.face ?? null, dash: c.dash ?? null, up, bow: bows[i] };
});
// and it must be CURVED: a straight chord across a <circle> reads as a disc with a line on it. The bow is the
// whole sphere cue (operator ruling, 2026-11-02: "the circle of that image does not look like a sphere… the one I
// made before had an equator line that was curved to show it").
if (sphere) {
  const bow = Math.min(...bows);
  check('the equator is drawn curved', bow >= 0.2 * sphere.r, `the equator path(s) bow ${bows.map((b) => b.toFixed(0)).join(', ')} units off their endpoints (r ${sphere.r}; want at least ${0.2 * sphere.r}) — ${bow >= 0.2 * sphere.r ? 'that is the ellipse that makes the ring read as a sphere' : 'at that bow the figure reads as a disc with a line on it'}`);
  // and the two halves of that ellipse are NOT drawn the same way: the far half is broken, the near half is
  // unbroken. That is occlusion — the sphere hides the part of its own great circle that is behind it — and it
  // is the cue the operator asked for by name ("the rear side of the equator should be denoted differently from
  // the front side"). Checked three ways here so one trick cannot satisfy it; the pixels are checked separately.
  const dashed = faces.filter((f) => f.dash), solid = faces.filter((f) => !f.dash);
  check('the far half is denoted differently from the near half', dashed.length === 1 && solid.length === 1, `${dashed.length} dashed and ${solid.length} solid equator arc(s) — one of each is the point: that is what separates "a circle with a line on it" from "a sphere with a great circle on it"`);
  if (dashed.length === 1 && solid.length === 1) {
    check('the broken half is the FAR half', dashed[0].up === true && solid[0].up === false, `the dashed arc bows ${dashed[0].up ? 'up, away from a viewer above the equator (the far side)' : 'down, toward the viewer (the near side)'} and the solid arc bows ${solid[0].up ? 'up (far)' : 'down (near)'} — dashes on the near half would draw the sphere inside out`);
    check('the far half is drawn at all', !!dashed[0].dash, `dash "${dashed[0].dash}" in viewBox units — an omitted far arc would also "look different", and it is not the same thing: the circle would stop being a great circle`);
  }
}

// ---- path utilities: the checks below need the CURVE, not the numbers in the string -------------------
const pathSegs = (d) => {
  const out = []; let x = 0, y = 0;
  for (const chunk of (d.match(/[MLC][^MLC]*/gi) || [])) {
    const cmd = chunk[0].toUpperCase();
    const n = (chunk.slice(1).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (cmd === 'C') {
      for (let i = 0; i + 5 < n.length; i += 6) {
        out.push({ k: 'C', p: [[x, y], [n[i], n[i + 1]], [n[i + 2], n[i + 3]], [n[i + 4], n[i + 5]]] });
        x = n[i + 4]; y = n[i + 5];
      }
    } else {
      for (let i = 0; i + 1 < n.length; i += 2) {
        if (cmd === 'L') out.push({ k: 'L', p: [[x, y], [n[i], n[i + 1]]] });
        x = n[i]; y = n[i + 1];
      }
    }
  }
  return out;
};
const bez = (p, t) => { const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t; return [a * p[0][0] + b * p[1][0] + c * p[2][0] + e * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + e * p[3][1]]; };
const poly = (d, per = 60) => { const sg = pathSegs(d); const pts = []; sg.forEach((s, i) => { for (let j = i ? 1 : 0; j <= per; j++) { const t = j / per; pts.push(s.k === 'L' ? [s.p[0][0] + (s.p[1][0] - s.p[0][0]) * t, s.p[0][1] + (s.p[1][1] - s.p[0][1]) * t] : bez(s.p, t)); } }); return pts; };
// distance from a point to a polyline. Point-for-point comparison would let a path that is the right SHAPE but
// parameterised differently (the controls slid along the curve) fail, and would let a path sampled at different
// rates pass; nearest-point distance asks the question actually being asked: does this ink lie on that curve.
const distToPoly = (p, pl) => {
  let best = Infinity;
  for (let i = 0; i + 1 < pl.length; i++) {
    const ax = pl[i][0], ay = pl[i][1], bx = pl[i + 1][0], by = pl[i + 1][1];
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2)) : 0;
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return best;
};
const xAtY = (pl, y) => { for (let i = 0; i + 1 < pl.length; i++) { const ay = pl[i][1], by = pl[i + 1][1]; if (by !== ay && (ay - y) * (by - y) <= 0) return pl[i][0] + ((y - ay) / (by - ay)) * (pl[i + 1][0] - pl[i][0]); } return null; };

// ---- the sphere's own meridian, derived from the ring and the equator THIS table draws -----------------
// SIXTH RULING (operator, 2026-11-24): "the curves from the equator to the north pole are not perfectly curved as
// they would when on a sphere." That is decidable, and it is decided here rather than by eye. A circle of radius r
// drawn with semi-minor b states its own projection: the axis stands asin(b/r) out of the screen plane, and then
// the meridian through a given foot on the near arc is fully determined. So the expected curve is computed from
// the logo's own numbers (r 58, b 21 -> 21.23°) and the drawn path is measured against it. Same math as
// logo-meridian-fit.mjs, duplicated on purpose: a gate that has to be reminded to run a probe is a gate
// that passes when nobody remembers.
const solidArc = chords.find((c) => !c.dash);
const bEq = sphere && solidArc ? 0.75 * bows[chords.indexOf(solidArc)] : 0;   // a cubic's apex is 0.75 of its control offset
const tilt = sphere && bEq ? Math.asin(Math.min(1, bEq / sphere.r)) : 0;
const poleDist = sphere ? Math.sqrt(sphere.r * sphere.r - bEq * bEq) : 0;     // where the PROJECTED pole must sit
const nearPoly = solidArc ? poly(solidArc.d, 200) : [];
const arcYat = (xv) => { for (let i = 0; i + 1 < nearPoly.length; i++) { const ax = nearPoly[i][0], bx = nearPoly[i + 1][0]; if (bx !== ax && (ax - xv) * (bx - xv) <= 0) return nearPoly[i][1] + ((xv - ax) / (bx - ax)) * (nearPoly[i + 1][1] - nearPoly[i][1]); } return null; };
const arcAngAt = (xv) => { const a = arcYat(xv), b = arcYat(xv + 0.5); return a === null || b === null ? null : Math.atan2(b - a, 0.5) * 180 / Math.PI; };
const meridianPts = (fx, fy) => {
  const X0 = fx - sphere.cx, Z0 = -(fy - sphere.cy);
  const Y0 = Math.sqrt(Math.max(0, sphere.r * sphere.r - X0 * X0 - Z0 * Z0));      // the near side, toward the viewer
  const Ph = [X0, Y0, Z0].map((v) => v / sphere.r), Nh = [0, Math.sin(tilt), Math.cos(tilt)];
  const pts = [];
  for (let deg = 0; deg <= 90; deg++) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const q = [c * Ph[0] + s * Nh[0], c * Ph[1] + s * Nh[1], c * Ph[2] + s * Nh[2]];
    pts.push([sphere.cx + sphere.r * q[0], sphere.cy - sphere.r * q[2]]);
  }
  return pts;
};

// WHICH WAY IS "TOWARD THE POLE"? Read it off the table, do not assume it. The logo met at the SOUTH pole until
// the operator's fifth ruling (2026-11-24) moved the meeting point to the north one, and a probe that hard-codes
// either answer stops measuring the figure and starts measuring its own assumption: it would fail the drawing the
// repo shipped for three weeks and pass a drawing that runs away from the meeting point. So the sign comes from
// where LOGO.meet sits relative to the sphere's centre, and every vertical probe below uses it.
const poleUp = !!(sphere && LOGO.meet && LOGO.meet.y < sphere.cy);
// "PARALLEL" used to be carried by a straight vertical segment, and the sixth ruling removed that segment: a true
// meridian starts bending at once. What survives is the thing the right-angle marks actually claim — the two lines
// leave the reference circle in the SAME direction, which is what makes them parallel where they start. So the
// departure tangent of each route is measured, and the two must agree.
const dep = routes.map((r) => {
  const sg = pathSegs(r.d);
  if (!sg.length) return null;
  const dx = sg[0].p[1][0] - sg[0].p[0][0], dy = sg[0].p[1][1] - sg[0].p[0][1];
  if (!dx && !dy) return null;
  return { x: sg[0].p[0][0], y: sg[0].p[0][1], deg: Math.atan2(dy, dx) * 180 / Math.PI, toward: poleUp ? dy < 0 : dy > 0 };
});
const dirGap = (a, b) => { const d = Math.abs(a - b) % 180; return d > 90 ? 180 - d : d; };
const arcAng = dep.length === 2 ? arcAngAt(dep[0].x) : null;
check('both lines leave the equator in the same direction', dep.length === 2 && dep.every((d) => d && d.toward) && dirGap(dep[0].deg, dep[1].deg) <= 2,
  dep.map((d, i) => d ? `route ${i + 1} departs (${d.x},${d.y}) at ${Math.abs(d.deg).toFixed(2)}deg off horizontal, ${d.toward ? 'toward' : 'AWAY FROM'} the pole at y ${LOGO.meet?.y}` : `route ${i + 1}: no usable first segment`).join(' | ') +
  (arcAng !== null ? ` — the near arc at that column lies ${arcAng.toFixed(2)}deg off horizontal, so the angle between them as drawn is ${(180 - Math.abs(dep[0].deg - arcAng)).toFixed(2)}deg, which is this projection's foreshortening of a right angle (the right-angle marks follow the two tangents for exactly that reason)` : ''));
// The stretch over which the pair still read as parallel, measured off the table itself: the surface curves them
// together from the first unit, so "parallel" is a distance, not a segment. Walk from the foot toward the pole and
// stop where the separation has moved 1.5 units — the same tolerance the painted check has to hold.
const polyL = routes.length === 2 ? poly(routes[0].d, 240) : [];
const polyR = routes.length === 2 ? poly(routes[1].d, 240) : [];
const sepAt = (y) => { const a = xAtY(polyL, y), b = xAtY(polyR, y); return a === null || b === null ? null : Math.abs(b - a); };
let bandEnd = dep.length === 2 ? dep[0].y : 0, sepFoot = null;
if (dep.length === 2) {
  sepFoot = sepAt(dep[0].y + (poleUp ? -0.5 : 0.5));
  for (let k = 1; k <= 120; k++) {
    const y = dep[0].y + (poleUp ? -k : k);
    const s = sepAt(y);
    if (s === null || Math.abs(s - sepFoot) > 1.5) break;
    bandEnd = y;
  }
}
const band = [Math.min(dep.length === 2 ? dep[0].y : 0, bandEnd) + 1, Math.max(dep.length === 2 ? dep[0].y : 0, bandEnd) - 1];
if (dep.length === 2 && sepFoot !== null) {
  const held = Math.abs(bandEnd - dep[0].y);
  check('the two starting stretches are parallel', sepFoot > 0 && band[1] > band[0], `separation ${sepFoot.toFixed(2)} units at the foot, held within 1.5 units for ${held.toFixed(1)} units (y ${band[0]}..${band[1]}), then the surface takes them: ${[10, 20, 30, 40].map((k) => `${k}u ${sepAt(dep[0].y + (poleUp ? -k : k))?.toFixed(1)}u`).join(', ')}`);
}
// the sixth ruling, as a gate: the drawn path must BE the projected meridian, not resemble it.
if (sphere && bEq && dep.length === 2 && dep.every((d) => d.x === d.x)) {
  const dev = routes.map((r, i) => { const an = meridianPts(dep[i].x, dep[i].y); return Math.max(...poly(r.d, 120).map((p) => distToPoly(p, an))); });
  const worst = Math.max(...dev);
  check('the two lines are the sphere\u2019s own meridians', worst <= 0.5, `the drawn paths sit a maximum of ${dev.map((v) => v.toFixed(2)).join(' and ')} units off the orthographic projection of the meridian through their own feet (ring r ${sphere.r}, equator semi-minor ${bEq.toFixed(2)}, so the axis stands ${(tilt * 180 / Math.PI).toFixed(2)}deg out of the screen plane). ${worst <= 0.5 ? 'The curve is the sphere\u2019s, not an approximation of it.' : 'that is an approximation of a meridian, not one'}`);
}
// where do they end up? the last coordinate pair of each path is its arrival point
const end = routes.map((r) => { const n = num(r.d); return { x: n[n.length - 2], y: n[n.length - 1] }; });
check('the two lines cross', end.length === 2 && end[0].x === end[1].x && end[0].y === end[1].y, `route ends ${end.map((e) => `${e.x},${e.y}`).join(' and ')}`);
if (sphere && end.length === 2) {
  // The crossing used to be held to the RING (|d - r| <= 1), which was only right for a sphere standing with its
  // axis in the screen plane. This one is tilted 21.23deg out of it, so its pole projects INSIDE the silhouette,
  // at sqrt(r^2 - b^2) from the centre. The old tolerance would have failed the true figure by 3.94 units, and the
  // old figure satisfied the old gate by being 3.94 units wrong: the expectation now comes from the same ellipse
  // that draws the equator, so the two cannot disagree about where the pole is.
  const d = Math.hypot(end[0].x - sphere.cx, end[0].y - sphere.cy);
  const side = Math.sign(end[0].y - sphere.cy) === (poleUp ? -1 : 1);
  check('they cross at the pole this sphere projects', Math.abs(d - poleDist) <= 1 && side, `the crossing is ${d.toFixed(2)} units from the sphere centre; the drawn equator's semi-minor ${bEq.toFixed(2)} puts the projected pole at sqrt(r^2 - b^2) = ${poleDist.toFixed(2)} (${poleUp ? 'above' : 'below'} the centre) — ${Math.abs(d - poleDist) <= 1 && side ? 'that is where the surface says the pole is' : `off by ${(d - poleDist).toFixed(2)} units, which is a point in space rather than the pole of the sphere being drawn`}`);
  check('the pole dot logos the crossing', LOGO.dot.cx === end[0].x && LOGO.dot.cy === end[0].y, `dot at ${LOGO.dot.cx},${LOGO.dot.cy} vs crossing ${end[0].x},${end[0].y}`);
}
check('the right angles are marked', marks2.length === 2, `${marks2.length} role:"accent" path(s). The source figure labels the two right angles where the lines leave the equator; that is the construction that makes them parallel, and it is the part a reader cannot infer from ink alone`);

// ---------- the pixels ----------
const px = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = px.info;
const buf = px.data;
const at = (x, y) => [buf[(y * width + x) * channels], buf[(y * width + x) * channels + 1], buf[(y * width + x) * channels + 2]];
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const contrast = (a, b) => { const [L1, L2] = [lum(a), lum(b)].sort((x, y) => y - x); return +(((L1 + 0.05) / (L2 + 0.05)).toFixed(2)); };
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const gy = Math.round(m.y + m.h / 2);
const strip = [];
for (let x = Math.max(0, m.x - 12); x < Math.max(0, m.x - 2); x++) if (x >= 0 && x < width) strip.push(at(x, gy));
const ground = strip.length ? strip.reduce((best, c) => (strip.filter((o) => dist3(o, c) < 12).length > strip.filter((o) => dist3(o, best) < 12).length ? c : best), strip[0]) : null;
const scale = m.scale ?? (m.w / LOGO.vbW);
const X = (vx) => m.x + vx * scale;
const Y = (vy) => m.y + vy * scale;
const x0 = Math.max(0, Math.round(m.x)), x1 = Math.min(width - 1, Math.round(m.x + m.w));
const y0 = Math.max(0, Math.round(m.y)), y1 = Math.min(height - 1, Math.round(m.y + m.h));

// cluster the ink the way the card verifier does, then pick three ANCHORS by what they are: the highest-contrast
// cluster is the route ink, the warmest is the accent, the lightest that still has real contrast is the surface
// line. Anti-aliasing means most pixels are blends, so pixels are classified by nearest anchor, not by cluster
// identity — the first version of this probe compared cluster identity and found zero crossings.
const inks = [];
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = at(x, y); if (dist3(c, ground) > 24) inks.push([x, y, c]); }
const clusters = [];
for (const [, , c] of inks) {
  const hit = clusters.find((cl) => dist3(cl.c, c) < 40);
  if (hit) { hit.n++; hit.sum = hit.sum.map((v, i) => v + c[i]); hit.c = hit.sum.map((v) => v / hit.n); } else clusters.push({ c: [...c], sum: [...c], n: 1 });
}
clusters.sort((a, b) => b.n - a.n);

// ROLES ARE CALIBRATED FROM THE PAGE, NOT GUESSED. The report already carries what each shape's stroke paints
// against its ground (`check:render` measures that per shape), and the shapes arrive in TABLE order: HeroSection
// renders LOGO.shapes in order, then the pole dot. Zip the two and every role has a MEASURED reference contrast;
// separate the two neutral roles at the geometric mean of their ratios. Guessing instead failed twice: nearest
// cluster identity found no crossings at phone width (a 1.6px stroke is mostly anti-aliased blends), and a
// luminance cut read the SURFACE stroke as route ink, because a pair of 3.01 is luminance 0.28 — the ring IS
// dark-ish. The fix is not a better guess, it is to take the numbers the page reports.
//
// THE WARM TEST USED TO BE `R - B >= 25`, and the 2026-11-14 palette broke it (D316): `rule` is now
// oklch(60% 0.04 86.6), a warm tan whose every painted pixel measures R-B 38, so the RING was classified as the
// accent and the pole check had no ring to measure it against (@measured 2026-11-14 by this probe, 320px run:
// ring column ink 164,154,132 = R-B 32). The report carries each shape's paint as an oklch() triple, so the two
// hues that matter are read off the page too, and the cut is the midpoint between them. Hue survives blending:
// accent at 30% of paper is still H 45.0, rule at 50% is still H 86.9 (node design/grill/okcolor.mjs).
const rp = m.shapes || [];
const roleOfShape = (s) => (s.role === 'route' ? 'route' : s.role === 'accent' ? 'accent' : 'line');
const refs = { line: [], route: [], accent: [] };
const paint = { line: null, route: null, accent: null };         // the exact bytes each role paints, from the report
const paintBytes = (spec) => {
  const n = String(spec || '').match(/-?\d+(\.\d+)?/g);
  if (!n || n.length < 3) return null;
  const L = Number(n[0]) > 1 ? Number(n[0]) / 100 : Number(n[0]);   // the report writes 0.6, the token writes 60%
  return oklchToRgb(L, Number(n[1]), Number(n[2])).bytes;
};
if (rp.length === LOGO.shapes.length + 1) {
  LOGO.shapes.forEach((s, i) => {
    const role = roleOfShape(s);
    const k = rp[i].strokeContrast ?? rp[i].fillContrast;
    if (k) refs[role].push(k);
    const spec = rp[i].stroke && rp[i].stroke !== 'none' ? rp[i].stroke : rp[i].fill;
    const b = paintBytes(spec);
    if (b && !paint[role]) paint[role] = b;
  });
  const dot = rp[LOGO.shapes.length];                             // the pole dot is not in the table; it is painted
  const dk = dot.fillContrast ?? dot.strokeContrast;
  if (dk) refs.accent.push(dk);
  const db = paintBytes(dot.fill && dot.fill !== 'none' ? dot.fill : dot.stroke);
  if (db && !paint.accent) paint.accent = db;
}
const medOf = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const kLine = medOf(refs.line), kRoute = medOf(refs.route), kAccent = medOf(refs.accent);
if (!kLine || !kRoute) {
  console.error(`${jsonFile} reports ${rp.length} shape(s) against a table of ${LOGO.shapes.length} — the painted contrasts cannot be matched to the table's roles, so the figure cannot be split into its roles`);
  process.exit(1);
}
const ang = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };
const pol = (c) => oklchFromRgb(c[0], c[1], c[2]);
if (!paint.line || !paint.accent) {
  console.error(`${jsonFile} reports no paint for the surface line (${paint.line}) or the accent (${paint.accent}) — the figure cannot be split into its roles, so a hue cut would be a guess`);
  process.exit(1);
}
const hLine = pol(paint.line).h, hAccent = pol(paint.accent).h;
if (ang(hLine, hAccent) < 20) {
  console.error(`the surface line (${paint.line.join(',')} H ${hLine.toFixed(1)}) and the accent (${paint.accent.join(',')} H ${hAccent.toFixed(1)}) are ${ang(hLine, hAccent).toFixed(1)} degrees apart — the logo's roles cannot be told apart by hue, so this probe cannot tell the ring from the pole. Two roles that paint the same colour are the same role.`);
  process.exit(1);
}
check('the roles are told apart by hue', ang(hLine, hAccent) >= 20, `the surface line paints ${paint.line.join(',')} (H ${hLine.toFixed(1)}) and the accent paints ${paint.accent.join(',')} (H ${hAccent.toFixed(1)}) — ${ang(hLine, hAccent).toFixed(1)}deg apart. ${ang(hLine, hAccent) >= 20 ? 'A reader can tell the ring from the pole.' : 'Two roles that paint the same colour are the same role: the logo would carry one figure, not two.'}`);

// ---------- WHICH DECLARED SHAPE IS EACH INK PIXEL ON? ----------
// This used to be decided by colour, and the sixth ruling is what broke it. A 1.4-unit route stroke is 1.68
// device px at 320, so most of its pixels are half-covered blends: route ink (24,20,13) at 50% of paper
// (250,246,236) is (137,133,124), which sits 24 RGB units from the SURFACE line's own bytes (139,127,101) and
// 207 from the route's. The classifier's rule — "not dark enough to be a route, so it is the surface line" —
// therefore read the meridians as equator ink: the bow fan found meridian pixels 45.1 units above the centre,
// called that the far arc's apex (it is 21.0), and failed three painted checks on a logo drawn correctly
// (@measured 2026-11-24 by this probe, 320 run). While the routes were straight vertical segments at x 94/146
// they never entered the fan, so the defect stayed hidden for three weeks.
// So roles are separated by GEOMETRY: the table says where each shape is drawn, and a pixel belongs to the
// nearest declared shape within its own stroke band. This does not certify a blank logo — every check below
// still demands ink at that place, and a shape the page fails to paint has none.
const DOT = -2;
const shapeGeom = LOGO.shapes.map((s) => ({
  role: roleOfShape(s),
  pl: s.tag === 'circle'
    ? Array.from({ length: 241 }, (_, k) => { const a = k / 240 * 2 * Math.PI; return [s.cx + s.r * Math.cos(a), s.cy + s.r * Math.sin(a)]; })
    : poly(s.d, 240),
  band: (s.sw ?? 0) / 2 + 1 / scale,                   // half the stroke, plus one device px of antialias slack
}));
const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
const own = new Int16Array(bw * bh).fill(-1);
const ownD = new Float32Array(bw * bh).fill(Infinity);
const stamp = (vx, vy, idx, pad) => {
  const cxp = X(vx), cyp = Y(vy), rp = Math.ceil(pad * scale);
  for (let py = Math.max(y0, Math.floor(cyp - rp)); py <= Math.min(y1, Math.ceil(cyp + rp)); py++)
    for (let px = Math.max(x0, Math.floor(cxp - rp)); px <= Math.min(x1, Math.ceil(cxp + rp)); px++) {
      const d = Math.hypot(px + 0.5 - cxp, py + 0.5 - cyp) / scale;
      const k = (py - y0) * bw + (px - x0);
      if (d <= pad && d < ownD[k]) { ownD[k] = d; own[k] = idx; }
    }
};
shapeGeom.forEach((g, i) => { for (const p of g.pl) stamp(p[0], p[1], i, g.band); });
// the pole dot is FILLED, and it is not in LOGO.shapes — HeroSection paints LOGO.dot after them (line 446ff)
if (LOGO.dot) stamp(LOGO.dot.cx, LOGO.dot.cy, DOT, LOGO.dot.r + 1 / scale);   // one stamp at the centre covers the disc
const ownerIdx = (x, y) => (x < x0 || x > x1 || y < y0 || y > y1) ? -1 : own[(y - y0) * bw + (x - x0)];
const ownerRole = (x, y) => { const i = ownerIdx(x, y); return i === -1 ? null : i === DOT ? roleOfShape(LOGO.dot) : shapeGeom[i].role; };

// what each role actually painted (median of its own pixels) — for the header line, so a reader can see the
// calibration is the page's, and spot a role with almost no pixels in it
const seen = { line: [], route: [], accent: [] };
const inkOn = shapeGeom.map(() => []);
const dotInk = [];
for (const [x, y, c] of inks) {
  const i = ownerIdx(x, y);
  if (i === DOT) { seen[roleOfShape(LOGO.dot)].push(c); dotInk.push(c); }
  else if (i >= 0) { seen[shapeGeom[i].role].push(c); inkOn[i].push(c); }
}
const anchor = (role, ref) => {
  const a = seen[role];
  const c = a.length ? a.sort((p, q) => contrast(p, ground) - contrast(q, ground))[a.length >> 1] : null;
  return `${role} ${c ? c.join(',') : '-'} (ref pair ${ref}, ${a.length} px)`;
};

// EVERY SHAPE PAINTS INK ON ITS OWN PATH, IN THE HUE ITS OWN REPORT DECLARES. The colour-based role split used
// to catch a repainted shape by accident — paint the ring in the accent hue and it measured in the wrong place.
// Attribution is geometric now, so that accident is gone and the test has to be said out loud or it stops
// existing. HUE, not contrast: the strokes are 1.3-1.4 units (1.68-3.0 device px), so most pixels are blends and
// a shape's contrast depends on how thickly it landed, while hue survives blending (this file's D316 note: accent
// at 30% of paper is still H 45.0, rule at 50% is still H 86.9). The MEDIAN pixel is used because shapes cross:
// the meridians cross the far arc, the right-angle marks sit beside the route feet, and the pole dot overlaps the
// ring's top rim — at those junctions a handful of pixels belong to the other shape's colour, and a max would
// read them (@measured 2026-11-24: the ring's own path carries the dot's 5.77 and the far arc's carries the
// route's 16.69). What this does NOT catch is two roles at the same hue — the hue-gap check above covers that.
// The bar is 30deg because the noise is 3deg and the roles are 50deg apart: median painted hue lands within
// 3.4deg of the bytes the report declares for every shape at 320, 640 and 1240 (@measured 2026-11-24 by this
// probe: line H86 vs 86, route H82 vs 81, accent H39 vs 36 at the widest run), and the surface and accent hues
// are 50.4deg apart. A bar at 30 catches a repainted role and never fires on antialiasing.
const declaredBytes = (r) => paintBytes(r && r.stroke && r.stroke !== 'none' ? r.stroke : r && r.fill);
const medHue = (a) => { const s = a.map((c) => pol(c).h).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const offPaint = [], hueSeen = [];
for (const [i, arr] of inkOn.entries()) {
  const b = declaredBytes(rp[i]), h = b === null ? null : pol(b).h, got = medHue(arr);
  if (got === null) { offPaint.push(`${shapeGeom[i].role} #${i}: no ink at all on its own path`); continue; }
  hueSeen.push(`${shapeGeom[i].role}#${i} H${got.toFixed(0)}${b === null ? ' (undeclared)' : ` vs ${h.toFixed(0)}`} x${arr.length}`);
  if (b === null || arr.length < 8 || ang(got, h) > 30) offPaint.push(`${shapeGeom[i].role} #${i}: median ink on its own path is H ${got.toFixed(1)} (${arr.length} px) but the report declares ${b ? b.join(',') + ' H ' + h.toFixed(1) : 'nothing'}`);
}
if (LOGO.dot) {
  const b = declaredBytes(rp[LOGO.shapes.length]), h = b === null ? null : pol(b).h, got = medHue(dotInk);
  if (got === null) offPaint.push('the pole dot: no ink inside it');
  else {
    hueSeen.push(`dot H${got.toFixed(0)} vs ${h === null ? '?' : h.toFixed(0)} x${dotInk.length}`);
    if (b === null || dotInk.length < 8 || ang(got, h) > 30) offPaint.push(`the pole dot: median ink inside it is H ${got.toFixed(1)} (${dotInk.length} px) but the report declares ${b ? b.join(',') + ' H ' + h.toFixed(1) : 'nothing'}`);
  }
}
check('every shape paints ink where the table draws it, in its declared hue', offPaint.length === 0, (offPaint.length ? offPaint.join(' | ') + ' || ' : '') + `median painted hue on each shape's own path: ${hueSeen.join(' ')}`);

// runs of ink belonging to one role along a device row
function runs(vy, role) {
  const y = Math.round(Y(vy));
  if (y < y0 || y > y1) return [];
  const out = []; let run = null;
  for (let x = x0; x <= x1; x++) {
    const c = at(x, y);
    if (dist3(c, ground) > 24 && ownerRole(x, y) === role) { if (run) run.x1 = x; else run = { x0: x, x1: x }; }
    else if (run) { out.push(run); run = null; }
  }
  if (run) out.push(run);
  return out.map((r) => ({ x0: r.x0, x1: r.x1, cx: (r.x0 + r.x1) / 2, w: r.x1 - r.x0 + 1 }));
}
// the same, down a column — that is how the equator's bow is measured
function runsAtX(vx, role) {
  const x = Math.round(X(vx));
  if (x < x0 || x > x1) return [];
  const out = []; let run = null;
  for (let y = y0; y <= y1; y++) {
    const c = at(x, y);
    if (dist3(c, ground) > 24 && ownerRole(x, y) === role) { if (run) run.y1 = y; else run = { y0: y, y1: y }; }
    else if (run) { out.push(run); run = null; }
  }
  if (run) out.push(run);
  return out.map((r) => ({ y0: r.y0, y1: r.y1, cy: (r.y0 + r.y1) / 2, h: r.y1 - r.y0 + 1 }));
}
const toUnits = (px) => px / scale;                     // differences only: a device offset needs ux/uy below
const ux = (px) => (px - m.x) / scale;                  // device px -> viewBox units, absolutely
const uy = (py) => (py - m.y) / scale;

if (!inks.length) { console.error('no ink in the measured box — the shot does not contain the logo (see logo-pixels.mjs header for the window-height trap)'); process.exit(1); }
console.log(`logo "${m.name}" box ${m.w}x${m.h} at ${m.x},${m.y} (scale ${scale}) in a ${width}x${height} shot; ${inks.length} ink pixels, ${clusters.length} colour clusters`);
console.log(`  role attribution, off the table's own geometry: ${anchor('line', kLine)} | ${anchor('route', kRoute)} | ${anchor('accent', kAccent)}; surface H ${hLine.toFixed(1)}, accent H ${hAccent.toFixed(1)} (${ang(hLine, hAccent).toFixed(1)}deg apart), ink = 24 RGB units from the sampled ground`);

// 1. the surface reads as CURVED: down the figure's vertical centre line, the surface-colour ink must cross twice
// INSIDE the ring, at roughly equal distances above and below the centre — that pair of bows is the ellipse, and
// it is the only thing in the figure that says "sphere" rather than "disc". A straight chord gives one crossing at
// the centre height at most, which is how the first correction failed this test.
// bowA / bowB are hoisted: the pole check below needs the PAINTED semi-minor to predict where the painted pole
// must sit, which is the same projection the table check uses, read off the pixels instead of the table.
let bowA = 0, bowB = 0;
if (sphere) {
  // Dashes mean the centre column may land in a gap, so the bow is measured across a fan of columns near the
  // centre and taken as the deepest crossing each side produces — the apex of each arc sits within a couple of
  // units of the centre line, so a fan of +/-8 units sees it whatever the dash phase happens to be.
  const cols = [-8, -4, 0, 4, 8].map((dx) => runsAtX(sphere.cx + dx, 'line').map((r) => uy(r.cy)));
  const inner = cols.flat().filter((y) => Math.abs(Math.abs(y - sphere.cy) - sphere.r) > 0.2 * sphere.r);
  const above = inner.filter((y) => y < sphere.cy).map((y) => sphere.cy - y);
  const below = inner.filter((y) => y > sphere.cy).map((y) => y - sphere.cy);
  bowA = above.length ? Math.max(...above) : 0; bowB = below.length ? Math.max(...below) : 0;
  check('the surface is drawn curved', bowA >= 0.2 * sphere.r && bowB >= 0.2 * sphere.r && Math.abs(bowA - bowB) <= 3, `crossing the centre at ${cols.flat().map((v) => v.toFixed(1)).join(', ')} units (centre ${sphere.cy}, r ${sphere.r}) — the two arcs bow ${bowA.toFixed(1)} up and ${bowB.toFixed(1)} down off the sphere's centre, ${Math.abs(bowA - bowB) <= 3 ? 'mirror images of each other, which is one ellipse seen at an angle' : 'not mirrored, so that is not a great circle'}; ${bowA >= 0.2 * sphere.r && bowB >= 0.2 * sphere.r ? 'a bow that deep is what reads as a sphere' : `a bow under ${0.2 * sphere.r} units reads as a disc with a line on it`}`);

  // PAINTED occlusion: near each arc's apex, how long is the longest unbroken run of surface-colour ink? A solid
  // arc near its apex spans tens of units; a broken one spans one dash. Measured, because a table that declares a
  // dash and a page that paints a solid arc (a renderer that drops stroke-dasharray, a scale so small the dashes
  // fuse) is exactly the drift this probe exists to catch.
  const dashed = faces.filter((f) => f.dash), solid = faces.filter((f) => !f.dash);
  if (dashed.length === 1 && solid.length === 1) {
    // The band is centred on the APEX EACH ARC PAINTS (bowA above, bowB below, measured just above), not on the
    // table's control offset: a cubic's apex sits at 0.75 of its control offset, and scanning two units off the
    // apex of an arc that never gets that far finds nothing but paper.
    const band = (apex) => {
      let widest = 0, count = 0, inkPx = 0;
      for (let vy = apex - 2; vy <= apex + 2; vy++) {
        const rr = runs(vy, 'line').filter((r) => Math.abs(ux(r.cx) - sphere.cx) <= 0.55 * sphere.r);
        inkPx += rr.reduce((a, r) => a + r.w, 0);
        if (rr.length) { count = Math.max(count, rr.length); widest = Math.max(widest, toUnits(Math.max(...rr.map((r) => r.x1 - r.x0 + 1)))); }
      }
      return { widest, count, inkPx };
    };
    const far = band(sphere.cy - bowA), near = band(sphere.cy + bowB);
    // What "differently" has to mean, in numbers: the far half's longest unbroken run is ONE DASH long (the
    // declared on-length plus the stroke's own width, with slack for antialiasing), while the near half's run is
    // several dashes long. Stated as a bare "long enough" threshold the check passed on the wrong thing: 15 units
    // is not a property of the drawing, it is a number I made up.
    const dashOn = parseFloat(String(dashed[0].dash).trim().split(/[ ,]+/)[0]) || 0;
    const okFar = far.widest >= 1.5 && far.count >= 2 && dashOn && far.widest <= dashOn * 1.6 + 2;
    const okNear = near.widest >= 2 * far.widest && near.inkPx >= far.inkPx;
    check('the two halves paint differently', okFar && okNear,
      `near arc (apex ${bowB.toFixed(1)} units below the centre): longest unbroken run ${near.widest.toFixed(1)} units, ${near.inkPx}px of line ink across its apex band. Far arc (apex ${bowA.toFixed(1)} above): longest run ${far.widest.toFixed(1)} units in ${far.count} piece(s), ${far.inkPx}px of ink. Declared dash on-length ${dashOn} units, so a far run of at most ${(dashOn * 1.6 + 2).toFixed(1)} is one dash long. ${okFar && okNear ? 'One unbroken line and a row of dashes: the occlusion cue is on the screen, not only in the table.' : 'the pixels do not show one broken half and one unbroken half'}`);
  }
}

// 2. parallel, painted: over the stretch the TABLE itself calls parallel, the painted crossings must hold that
// separation and match the table row by row. The band comes from the table, not from a fixed number of units: a
// true meridian curves from its first unit (sixth ruling), so "parallel" is a DISTANCE over which the separation
// moves less than the noise, and that distance is a property of the drawing, not of the probe.
if (sepFoot !== null && band[1] > band[0]) {
  const step = Math.max(1, Math.round((band[1] - band[0]) / 6));
  const seps = [], pairs = [], posn = [];
  for (let vy = band[0]; vy <= band[1]; vy += step) {
    const narrow = runs(vy, 'route').filter((r) => r.w <= Math.max(2, 3 * scale));
    if (narrow.length >= 2) {
      const s = toUnits(narrow[narrow.length - 1].cx - narrow[0].cx);
      seps.push(s); pairs.push([vy, s, sepAt(vy)]);
      posn.push(narrow.map((r) => toUnits(r.cx).toFixed(1)).join(','));
    } else posn.push(`only ${narrow.length} route crossing(s) found`);
  }
  const spread = seps.length ? Math.max(...seps) - Math.min(...seps) : Infinity;
  check('the painted lines hold their separation', seps.length >= 3 && spread <= 1.5, seps.length ? `separations ${seps.map((s) => s.toFixed(1)).join(' / ')} units (spread ${spread.toFixed(2)}) over y ${band[0]}..${band[1]} — the stretch the table's own geometry calls parallel; crossings ${posn.join(' | ')}` : `too few clean crossings: ${posn.join(' | ')}`);
  const dev = pairs.filter((p) => p[2] !== null).map((p) => Math.abs(p[1] - p[2]));
  const worst = dev.length ? Math.max(...dev) : Infinity;
  check('the painted separation matches the table', dev.length >= 3 && worst <= 1.5, `painted vs table row by row: ${pairs.map((p) => `y${p[0]} ${p[1].toFixed(1)}/${p[2].toFixed(1)}`).join(' ')} — worst ${worst.toFixed(2)} units apart`);
}
// 3. meet, painted: the separation collapses as the surface curves
if (sphere) {
  const near = (vy) => runs(vy, 'route').filter((r) => Math.abs(ux(r.cx) - sphere.cx) <= sphere.r * 0.8);
  const probe = [0.55, 0.75, 0.9].map((f) => {
    const vy = sphere.cy + (poleUp ? -1 : 1) * sphere.r * f;
    const r = near(vy);
    const sep = r.length >= 2 ? toUnits(r[r.length - 1].cx - r[0].cx) : null;
    return { vy, n: r.length, sep };
  });
  const s = probe.map((p) => p.sep).filter((x) => x !== null);
  const collapsing = s.length >= 2 && s.every((v, i) => i === 0 || v < s[i - 1]);
  check('the two lines converge to one crossing', collapsing, probe.map((p) => `y ${p.vy}: ${p.n} crossing(s), separation ${p.sep === null ? '-' : p.sep.toFixed(1)}`).join(' | '));
  // 4. the pole: the accent dot sits at the ring's radius from the ring's centre, measured, not asserted.
  // The ring's horizontal extent AT its own centre height gives centre and radius; the vertical radius comes from
  // the rim OPPOSITE the pole, because the pole rim is where the dot is drawn — measuring that rim would measure
  // the dot twice and let "is the pole on the surface" pass by construction. Which rim is opposite is read off the
  // table (poleUp above), so the anti-self-certification survives the fifth ruling moving the dot to the top.
  const ringRow = runs(sphere.cy, 'line');
  const down2 = runsAtX(sphere.cx, 'line').map((r) => uy(r.cy));
  const dotRim = poleUp ? -1 : 1;                     // +1 = the dot hangs below the centre, -1 = above it
  const rim = (side) => down2.filter((y) => Math.abs(Math.abs(y - sphere.cy) - sphere.r) <= 0.25 * sphere.r && Math.sign(y - sphere.cy) === side);
  const anti = rim(-dotRim);                          // the rim the dot is NOT on
  const accentRuns = [];
  for (let vy = sphere.cy + dotRim * sphere.r - 6; vy <= sphere.cy + dotRim * sphere.r + 6; vy += 1) accentRuns.push(...runs(vy, 'accent').map((r) => ({ cx: ux(r.cx), cy: vy })));
  if (ringRow.length >= 2 && anti.length && accentRuns.length) {
    // Both radii are measured to the stroke's CENTRE LINE. The first version took the ring's outer edges across
    // the middle row, which is the outer diameter, and compared it with the vertical run's centre — a bias of
    // half a stroke plus antialiasing, 1.8 units at 320 on a 1.3-unit stroke (@measured 2026-11-24: 58.8 across
    // vs 57.0 down), which read as a squashed ring on a round one.
    const cxU = ux((ringRow[0].cx + ringRow[ringRow.length - 1].cx) / 2);
    const rU = toUnits((ringRow[ringRow.length - 1].cx - ringRow[0].cx) / 2);
    const cyU = sphere.cy;                            // the row the ring was measured across IS its centre height
    const rV = Math.max(...anti.map((y) => Math.abs(cyU - y)));
    // Where the painted pole has to be: the ring's painted radius rU and the equator's painted semi-minor bU are
    // two measurements of the same tilt, so the pole must sit sqrt(rU^2 - bU^2) from the painted centre. Holding it
    // to rU instead (the old rule) asserted an axis lying in the screen plane, which the drawn ellipse contradicts.
    const bU = (bowA + bowB) / 2;
    const expect = Math.sqrt(Math.max(0, rU * rU - bU * bU));
    const gx = accentRuns.reduce((a, b) => a + b.cx, 0) / accentRuns.length;
    const gyy = accentRuns.reduce((a, b) => a + b.cy, 0) / accentRuns.length;
    const d = Math.hypot(gx - cxU, gyy - cyU);
    check('the ring is drawn round', Math.abs(rU - rV) <= 1.5, `measured radius ${rU.toFixed(1)} units across, ${rV.toFixed(1)} ${dotRim > 0 ? 'up' : 'down'} to the ${dotRim > 0 ? 'top' : 'bottom'} rim (the rim the pole dot is NOT on) — a squashed ring reads as a disc in perspective, not a sphere`);
    check('the pole sits on the surface', Math.abs(gx - cxU) <= 3 && Math.abs(d - expect) <= 3, `painted ring: centre ${cxU.toFixed(1)},${cyU.toFixed(1)}, radius ${rU.toFixed(1)}; painted equator bows ${bowA.toFixed(1)} up and ${bowB.toFixed(1)} down, so the projected pole sits sqrt(r^2 - b^2) = ${expect.toFixed(1)} from the centre; the accent dot at the ${dotRim > 0 ? 'bottom' : 'top'} centres at ${gx.toFixed(1)},${gyy.toFixed(1)} — ${d.toFixed(1)} units from the centre, ${Math.abs(d - expect) <= 3 ? 'on the surface' : `${(d - expect).toFixed(1)} units off it, which reads as a point in space rather than a meeting on the surface`}`);
  } else check('the pole sits on the surface', false, `ring crossings: ${ringRow.length} across, ${anti.length} on the ${dotRim > 0 ? 'top' : 'bottom'} rim; accent pixels near the pole: ${accentRuns.length} — cannot measure where the lines meet`);
}

// ---------- report ----------
for (const [ok, name, detail] of rows) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
if (JSONOUT) console.log(JSON.stringify({
  mark: m.name, box: { x: m.x, y: m.y, w: m.w, h: m.h, scale },
  table: tablePath.replace(process.cwd() + '/', ''),
  checks: rows.map(([ok, name, detail]) => ({ ok, name, detail })),
  roles: { surfacePair: kLine, routePair: kRoute, accentPair: kAccent, attribution: 'nearest declared shape, stroke band + 1 device px', surfaceHue: +hLine.toFixed(1), accentHue: +hAccent.toFixed(1), hueGap: +ang(hLine, hAccent).toFixed(1), pixelCounts: { line: seen.line.length, route: seen.route.length, accent: seen.accent.length } },
}));
if (fails.length) { console.error(`LOGO GEOMETRY: ${fails.length} failure(s)\n  ${fails.join('\n  ')}`); process.exit(1); }
console.log('LOGO GEOMETRY: PASS — two lines that start parallel, cross at the pole, and the pole is on the surface');
