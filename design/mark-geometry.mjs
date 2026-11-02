// mark-geometry.mjs — does the drawn mark actually say "two parallel lines meet on a curved surface"?
//
//   node design/mark-geometry.mjs <shot.png> <render-json> [--index 0] [--table <module.mjs>] [--json]
//
// e.g.
//   node design/grill/dist-measure.mjs dist/client / design/grill/render-measure.js 320 1400 .design/render/mark-320.png
//   node design/mark-geometry.mjs .design/render/mark-320.png .design/render/_-320.json
//
// WHY THIS EXISTS. `check:render` proves the mark ARRIVES (shape count, box ratio, per-shape contrast, device
// stroke width) and `mark-pixels.mjs` proves how much of it LANDS (coverage). Neither can see what it *says*.
// The mark shipped for two days saying "several routes arriving at one point" when the club's figure says "two
// lines that are parallel, meeting because the surface is curved" — and the drawing did not contain a single
// parallel pair, contained a line the source does not have, and omitted the equator that establishes the
// parallelism (src/lib/brand-mark.mjs, corrected 2026-11-02). That is a meaning bug, and it survived a ratified
// specimen, a shape-count gate and two pixel gates, because nothing measured it.
//
// It is decidable in pixels. "Parallel" is a constant separation between two strokes over a stretch; "meet" is
// that separation collapsing to one crossing; "on a curved surface" is that crossing sitting at the ring's
// radius from the ring's centre rather than inside it. All three are measured here, off the built page.
//
// WHAT IT READS. Two things, and it compares them rather than trusting either:
//   1. the GEOMETRY TABLE (src/lib/brand-mark.mjs, or `--table path` to test another reading of the mark —
//      which is how the control run proves this probe can fail: point it at the pre-fix table from git);
//   2. the PAINTED PIXELS inside the mark's box in a screenshot of the built page, split into the three roles
//      by colour cluster (dark = routes, warm = gold accents/pole, light = surface and equator) the way
//      scripts/check-social-card.mjs and mark-pixels.mjs cluster.
// A table that says parallel and a page that paints converging lines is exactly the drift this repo keeps
// finding, so a mismatch is a failure, not a note.
//
// Exit 0 = every check passed. Exit 1 = at least one failed: unlike `lines:measure` (a diagnostic that reports
// whatever it finds), this one has a verdict, because a mark that misstates the club's own diagram is a defect.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const argv = process.argv.slice(2);
process.stdout.on('error', () => process.exit(0));      // this report gets piped into `head`; a closed pipe is not a crash
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1] ?? d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--index' && argv[i - 1] !== '--table');
const [shot, jsonFile] = positional;
const idx = Number(flag('index', positional[2] ?? '0'));
const tablePath = argv.includes('--table') ? resolve(flag('table')) : resolve('src/lib/brand-mark.mjs');
const JSONOUT = argv.includes('--json');
if (!shot || !jsonFile) {
  console.error(`usage: node design/mark-geometry.mjs <shot.png> <render-json> [--index 0] [--table other-mark.mjs] [--json]`);
  process.exit(2);
}
for (const f of [shot, jsonFile, tablePath]) if (!existsSync(f)) { console.error(`no such file: ${f}`); process.exit(2); }

const { MARK } = await import(tablePath);
const j = JSON.parse(readFileSync(jsonFile, 'utf8'));
const m = (j.marks || [])[idx];
if (!m) { console.error(`${jsonFile} reports no measured mark at index ${idx}`); process.exit(1); }

// ---------- the table: read the figure out of the geometry, do not assume it ----------
const num = (s) => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);
const sphere = MARK.shapes.find((s) => s.role === 'sphere' && s.tag === 'circle');
const chords = MARK.shapes.filter((s) => s.role === 'sphere' && s.tag === 'path');
const routes = MARK.shapes.filter((s) => s.role === 'route');
const marks2 = MARK.shapes.filter((s) => s.role === 'accent');
const fails = [];
const rows = [];
const check = (name, ok, detail) => { rows.push([ok, name, detail]); if (!ok) fails.push(`${name}: ${detail}`); };

check('the surface', !!sphere, sphere ? `<circle> r ${sphere.r} at ${sphere.cx},${sphere.cy}` : 'no role:"sphere" <circle> — the mark draws no curved surface');
check('two lines, exactly', routes.length === 2, `${routes.length} role:"route" shape(s). The figure is TWO lines; a third line through the middle is the defect the 2026-11-02 correction removed (it turned the pair into an arrow)`);
check('the equator exists', chords.length >= 1, chords.length ? '' : 'no role:"sphere" <path> — without the reference line the two lines cannot be seen as parallel, which is the mark\'s whole claim');
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

// a straight vertical first segment is what "parallel" means in this figure: both lines leave the equator at
// right angles, so both are vertical, so they are parallel to each other until the surface curves them together
const stretch = routes.map((r) => {
  const n = num(r.d);
  const vertical = n.length >= 4 && n[0] === n[2] && n[3] > n[1];
  return vertical ? { x: n[0], y0: n[1], y1: n[3] } : null;
});
check('both lines are straight where they start', stretch.every(Boolean), stretch.map((s, i) => s ? `route ${i + 1}: x ${s.x} from y ${s.y0} to ${s.y1}` : `route ${i + 1}: its first segment is not "L" with a constant x — it begins converging, so nothing in the figure is parallel`).join(' | '));
if (stretch.every(Boolean)) {
  const band = [Math.max(...stretch.map((s) => s.y0)) + 2, Math.min(...stretch.map((s) => s.y1)) - 2];
  const sep = Math.abs(stretch[1].x - stretch[0].x);
  check('the two starting stretches are parallel', sep > 0 && band[1] > band[0], `separation ${sep} units over y ${band[0]}..${band[1]}`);
}
// where do they end up? the last coordinate pair of each path is its arrival point
const end = routes.map((r) => { const n = num(r.d); return { x: n[n.length - 2], y: n[n.length - 1] }; });
check('the two lines cross', end.length === 2 && end[0].x === end[1].x && end[0].y === end[1].y, `route ends ${end.map((e) => `${e.x},${e.y}`).join(' and ')}`);
if (sphere && end.length === 2) {
  const d = Math.hypot(end[0].x - sphere.cx, end[0].y - sphere.cy);
  check('they cross ON the surface', Math.abs(d - sphere.r) <= 1, `the crossing is ${d.toFixed(1)} units from the sphere centre, its radius is ${sphere.r} — ${Math.abs(d - sphere.r) <= 1 ? 'on it' : `inside it by ${(sphere.r - d).toFixed(1)} units, which is a point in space, not a meeting on the surface`}`);
  check('the pole dot marks the crossing', MARK.dot.cx === end[0].x && MARK.dot.cy === end[0].y, `dot at ${MARK.dot.cx},${MARK.dot.cy} vs crossing ${end[0].x},${end[0].y}`);
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
const scale = m.scale ?? (m.w / MARK.vbW);
const X = (vx) => m.x + vx * scale;
const Y = (vy) => m.y + vy * scale;
const x0 = Math.max(0, Math.round(m.x)), x1 = Math.min(width - 1, Math.round(m.x + m.w));
const y0 = Math.max(0, Math.round(m.y)), y1 = Math.min(height - 1, Math.round(m.y + m.h));

// cluster the ink the way the card verifier does, then pick three ANCHORS by what they are: the highest-contrast
// cluster is the route ink, the warmest is the gold, the lightest that still has real contrast is the surface
// line. Anti-aliasing means most pixels are blends, so pixels are classified by nearest anchor, not by cluster
// identity — the first version of this probe compared cluster identity and found zero crossings.
const inks = [];
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = at(x, y); if (dist3(c, ground) > 24) inks.push([x, y, c]); }
const clusters = [];
for (const [, , c] of inks) {
  const hit = clusters.find((cl) => dist3(cl.c, c) < 40);
  if (hit) { hit.n++; hit.sum = hit.sum.map((v, i) => v + c[i]); hit.c = hit.sum.map((v, i) => v / hit.n); } else clusters.push({ c: [...c], sum: [...c], n: 1 });
}
clusters.sort((a, b) => b.n - a.n);

// ROLES ARE CALIBRATED FROM THE PAGE, NOT GUESSED. The report already carries what each shape's stroke paints
// against its ground (`check:render` measures that per shape), and the shapes arrive in TABLE order: HeroSection
// renders MARK.shapes in order, then the pole dot. Zip the two and every role has a MEASURED reference contrast;
// separate the two neutral roles at the geometric mean of their ratios. Guessing instead failed twice: nearest
// cluster identity found no crossings at phone width (a 1.6px stroke is mostly anti-aliased blends), and a
// luminance cut read the SURFACE stroke as route ink, because a pair of 3.01 is luminance 0.28 — the ring IS
// dark-ish. The fix is not a better guess, it is to take the numbers the page reports.
const rp = m.shapes || [];
const roleOfShape = (s) => (s.role === 'route' ? 'route' : s.role === 'accent' ? 'gold' : 'line');
const refs = { line: [], route: [], gold: [] };
if (rp.length === MARK.shapes.length + 1) {
  MARK.shapes.forEach((s, i) => { const k = rp[i].strokeContrast ?? rp[i].fillContrast; if (k) refs[roleOfShape(s)].push(k); });
  const dk = rp[MARK.shapes.length].fillContrast ?? rp[MARK.shapes.length].strokeContrast;
  if (dk) refs.gold.push(dk);
}
const medOf = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const kLine = medOf(refs.line), kRoute = medOf(refs.route), kGold = medOf(refs.gold);
if (!kLine || !kRoute) {
  console.error(`${jsonFile} reports ${rp.length} shape(s) against a table of ${MARK.shapes.length} — the painted contrasts cannot be matched to the table's roles, so the figure cannot be split into its roles`);
  process.exit(1);
}
const warmCut = 25;                                    // R-B: the gold family is the only warm paint in the mark
const neutralCut = Math.sqrt(kLine * kRoute);           // midpoint in log space between surface pair and route pair
const roleAt = (c) => {
  const k = contrast(c, ground);
  if (k < 1.4) return null;
  if (c[0] - c[2] >= warmCut) return 'gold';
  return k < neutralCut ? 'line' : 'route';
};
// what each role actually painted (median of its own pixels) — for the header line, so a reader can see the
// calibration is the page's, and spot a role with almost no pixels in it
const seen = { line: [], route: [], gold: [] };
for (const [, , c] of inks) { const r = roleAt(c); if (r) seen[r].push(c); }
const anchor = (role, ref) => {
  const a = seen[role];
  const c = a.length ? a.sort((p, q) => contrast(p, ground) - contrast(q, ground))[a.length >> 1] : null;
  return `${role} ${c ? c.join(',') : '-'} (ref pair ${ref}, ${a.length} px)`;
};

// runs of ink belonging to one role along a device row
function runs(vy, role) {
  const y = Math.round(Y(vy));
  if (y < y0 || y > y1) return [];
  const out = []; let run = null;
  for (let x = x0; x <= x1; x++) {
    const c = at(x, y);
    if (dist3(c, ground) > 24 && roleAt(c) === role) { if (run) run.x1 = x; else run = { x0: x, x1: x }; }
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
    if (dist3(c, ground) > 24 && roleAt(c) === role) { if (run) run.y1 = y; else run = { y0: y, y1: y }; }
    else if (run) { out.push(run); run = null; }
  }
  if (run) out.push(run);
  return out.map((r) => ({ y0: r.y0, y1: r.y1, cy: (r.y0 + r.y1) / 2, h: r.y1 - r.y0 + 1 }));
}
const toUnits = (px) => px / scale;                     // differences only: a device offset needs ux/uy below
const ux = (px) => (px - m.x) / scale;                  // device px -> viewBox units, absolutely
const uy = (py) => (py - m.y) / scale;

if (!inks.length) { console.error('no ink in the measured box — the shot does not contain the mark (see mark-pixels.mjs header for the window-height trap)'); process.exit(1); }
console.log(`mark "${m.name}" box ${m.w}x${m.h} at ${m.x},${m.y} (scale ${scale}) in a ${width}x${height} shot; ${inks.length} ink pixels, ${clusters.length} colour clusters`);
console.log(`  role calibration, from the page's own per-shape numbers: ${anchor('line', kLine)} | ${anchor('route', kRoute)} | ${anchor('gold', kGold)}; neutral cut at pair ${neutralCut.toFixed(2)}, warm cut at R-B ${warmCut}`);

// 1. the surface reads as CURVED: down the figure's vertical centre line, the surface-colour ink must cross twice
// INSIDE the ring, at roughly equal distances above and below the centre — that pair of bows is the ellipse, and
// it is the only thing in the figure that says "sphere" rather than "disc". A straight chord gives one crossing at
// the centre height at most, which is how the first correction failed this test.
if (sphere) {
  // Dashes mean the centre column may land in a gap, so the bow is measured across a fan of columns near the
  // centre and taken as the deepest crossing each side produces — the apex of each arc sits within a couple of
  // units of the centre line, so a fan of +/-8 units sees it whatever the dash phase happens to be.
  const cols = [-8, -4, 0, 4, 8].map((dx) => runsAtX(sphere.cx + dx, 'line').map((r) => uy(r.cy)));
  const inner = cols.flat().filter((y) => Math.abs(Math.abs(y - sphere.cy) - sphere.r) > 0.2 * sphere.r);
  const above = inner.filter((y) => y < sphere.cy).map((y) => sphere.cy - y);
  const below = inner.filter((y) => y > sphere.cy).map((y) => y - sphere.cy);
  const bowA = above.length ? Math.max(...above) : 0, bowB = below.length ? Math.max(...below) : 0;
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

// 2. parallel, painted: the two route crossings hold one separation down the starting stretch
if (stretch.every(Boolean)) {
  const band = [Math.max(...stretch.map((s) => s.y0)) + 2, Math.min(...stretch.map((s) => s.y1)) - 2];
  const step = Math.max(2, Math.round((band[1] - band[0]) / 6));
  const seps = [], posn = [];
  for (let vy = band[0]; vy <= band[1]; vy += step) {
    const narrow = runs(vy, 'route').filter((r) => r.w <= Math.max(2, 3 * scale));
    if (narrow.length >= 2) { seps.push(toUnits(narrow[narrow.length - 1].cx - narrow[0].cx)); posn.push(narrow.map((r) => toUnits(r.cx).toFixed(1)).join(',')); }
    else posn.push(`only ${narrow.length} route crossing(s) found`);
  }
  const spread = seps.length ? Math.max(...seps) - Math.min(...seps) : Infinity;
  check('the painted lines hold their separation', seps.length >= 3 && spread <= 1.5, seps.length ? `separations ${seps.map((s) => s.toFixed(1)).join(' / ')} units (spread ${spread.toFixed(2)}) over y ${band[0]}..${band[1]}; crossings ${posn.join(' | ')}` : `too few clean crossings: ${posn.join(' | ')}`);
  const mean = seps.length ? seps.reduce((a, b) => a + b, 0) / seps.length : 0;
  check('the painted separation matches the table', Math.abs(mean - Math.abs(stretch[1].x - stretch[0].x)) <= 1.5, `painted ${mean.toFixed(1)} units vs table ${Math.abs(stretch[1].x - stretch[0].x)}`);
}
// 3. meet, painted: the separation collapses as the surface curves
if (sphere) {
  const near = (vy) => runs(vy, 'route').filter((r) => Math.abs(ux(r.cx) - sphere.cx) <= sphere.r * 0.8);
  const probe = [0.55, 0.75, 0.9].map((f) => {
    const vy = sphere.cy + sphere.r * f;
    const r = near(vy);
    const sep = r.length >= 2 ? toUnits(r[r.length - 1].cx - r[0].cx) : null;
    return { vy, n: r.length, sep };
  });
  const s = probe.map((p) => p.sep).filter((x) => x !== null);
  const collapsing = s.length >= 2 && s.every((v, i) => i === 0 || v < s[i - 1]);
  check('the two lines converge to one crossing', collapsing, probe.map((p) => `y ${p.vy}: ${p.n} crossing(s), separation ${p.sep === null ? '-' : p.sep.toFixed(1)}`).join(' | '));
  // 4. the pole: the gold blob sits at the ring's radius from the ring's centre, measured, not asserted.
  // The ring's horizontal extent AT its own centre height gives centre and radius; the vertical radius comes from
  // the TOP rim, because the bottom rim is where the pole dot is drawn — measuring the bottom rim would measure
  // the dot twice and let "is the pole on the surface" pass by construction.
  const ringRow = runs(sphere.cy, 'line');
  const down2 = runsAtX(sphere.cx, 'line').map((r) => uy(r.cy));
  const top = down2.filter((y) => Math.abs((sphere.cy - y) - sphere.r) <= 0.25 * sphere.r);
  const goldRuns = [];
  for (let vy = sphere.cy + sphere.r - 6; vy <= sphere.cy + sphere.r + 6; vy += 1) goldRuns.push(...runs(vy, 'gold').map((r) => ({ cx: ux(r.cx), cy: vy })));
  if (ringRow.length >= 2 && top.length && goldRuns.length) {
    const cxU = ux((ringRow[0].x0 + ringRow[ringRow.length - 1].x1) / 2);
    const rU = toUnits((ringRow[ringRow.length - 1].x1 - ringRow[0].x0) / 2);
    const cyU = sphere.cy;                            // the row the ring was measured across IS its centre height
    const rV = cyU - Math.min(...top);
    const gx = goldRuns.reduce((a, b) => a + b.cx, 0) / goldRuns.length;
    const gyy = goldRuns.reduce((a, b) => a + b.cy, 0) / goldRuns.length;
    const d = Math.hypot(gx - cxU, gyy - cyU);
    check('the ring is drawn round', Math.abs(rU - rV) <= 1.5, `measured radius ${rU.toFixed(1)} units across, ${rV.toFixed(1)} up to the top rim — a squashed ring reads as a disc in perspective, not a sphere`);
    check('the pole sits on the surface', Math.abs(gx - cxU) <= 3 && Math.abs(d - rU) <= 3, `painted ring: centre ${cxU.toFixed(1)},${cyU.toFixed(1)}, radius ${rU.toFixed(1)}; the gold at the bottom centres at ${gx.toFixed(1)},${gyy.toFixed(1)} — ${d.toFixed(1)} units from the centre, ${Math.abs(d - rU) <= 3 ? 'on the surface' : `${(rU - d).toFixed(1)} units inside it, which reads as a point in space rather than a meeting on the surface`}`);
  } else check('the pole sits on the surface', false, `ring crossings: ${ringRow.length} across, ${top.length} top rim; gold pixels near the pole: ${goldRuns.length} — cannot measure where the lines meet`);
}

// ---------- report ----------
for (const [ok, name, detail] of rows) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
if (JSONOUT) console.log(JSON.stringify({
  mark: m.name, box: { x: m.x, y: m.y, w: m.w, h: m.h, scale },
  table: tablePath.replace(process.cwd() + '/', ''),
  checks: rows.map(([ok, name, detail]) => ({ ok, name, detail })),
  roles: { surfacePair: kLine, routePair: kRoute, goldPair: kGold, neutralCut: +neutralCut.toFixed(2), pixelCounts: { line: seen.line.length, route: seen.route.length, gold: seen.gold.length } },
}));
if (fails.length) { console.error(`MARK GEOMETRY: ${fails.length} failure(s)\n  ${fails.join('\n  ')}`); process.exit(1); }
console.log('MARK GEOMETRY: PASS — two lines that start parallel, cross at the pole, and the pole is on the surface');
