// mark-faces.mjs — the ONE home for the mark's FACES: the regions its drawn curves bound, built out of the
// curves themselves (grill round 22, 2026-11-24; D484).
//
// WHY THIS FILE EXISTS. `src/lib/brand-mark.mjs` draws eight shapes, all of them LINES, and the mark's gates
// (design/mark-geometry.mjs, design/mark-pixels.mjs, check:render, check:social) all measure lines. Byrne's 1847
// colouring colours *regions* as well as lines, and the operator asked for that too (seventh ruling, D483:
// "but also show me options for coloring faces of the shape also in the Byrne style"). A region is not a line:
// it has an area, it is held to the LAYER bar (1.35, D101) rather than the graphic-line bar (3.0), and — the
// consequence round 21 did not price — once a region exists it is a GROUND for every line drawn over it.
//
// So a face has to be *defined* before it can be priced, and it cannot be defined by typing coordinates. Every
// boundary below is derived from `MARK`'s own path data and its own circle: the lune ends exactly where the
// meridian ink ends, because its lower edge is a sub-cubic of the near arc found by bisection plus a de Casteljau
// split; the north and south faces use the ring's own radius and the equator's own endpoints. A hand-typed region
// is a second drawing of the mark, which is the defect this repo already has a rule against (one home per rule),
// and a wash that stops 2 units short of the ink is a visible seam a report would call "painted".
//
// THE THREE REGIONS THE DRAWING ACTUALLY HAS, and what they are called on the sphere. This is the part a
// colour round usually skips, and it is the part that decides whether a face is *named* or merely *painted*:
//
//   north  bounded by the near (solid) equator arc and the ring's UPPER semicircle. The equator's near arc is
//          the visible half of a great circle and the ring is the limb (also a great circle, the one facing the
//          viewer), so this face is a **spherical lune**: two great semicircles meeting at the two points where
//          the equator crosses the limb, (62,78) and (178,78). It contains the projected pole, the two meridians
//          and the right-angle notation, so it is the face the mark's claim lives on.
//   south  bounded by the same near arc and the ring's LOWER semicircle. Also a spherical lune, and the two
//          lunes TILE the visible hemisphere exactly — no overlap, no gap — which is why they are the honest
//          pair for a Byrne two-area colouring.
//   lune   bounded by the two meridian cubics and the near arc's sub-cubic between the two feet. On the sphere
//          that is a **spherical triangle**: two meridian arcs and an equator arc, so its angles at the feet are
//          right angles — which is exactly what the two right-angle marks in the drawing SAY — and by Girard's
//          theorem its area is the pole angle in radians times r². The notation is not decoration: read as a
//          statement about the figure, it fixes the area of the region Byrne would have filled.
//   disc   the ring's interior, which for an orthographic projection IS the near hemisphere: what a viewer can
//          see of a sphere is one hemisphere, so "colour the near hemisphere" means "colour the disc".
//
// The last two lines are not asserted from memory. `faceAreas()` computes each region twice — a **projected**
// area by dense sampling plus the shoelace formula, and a **spherical** area from the sphere this drawing
// implies (read off the same numbers `design/mark-meridian-fit.mjs` reads: the equator's semi-minor b = 21 =
// 0.3621 r, so the axis stands 21.23 deg out of the screen plane) — and `assertAreas()` refuses the round if the
// two disagree past 2%. A face whose stated geometry does not survive its own measurement is the defect this
// repo calls a claim without a probe.
import { MARK } from '../src/lib/brand-mark.mjs';

// The ring is a shape in the table, not a key on it: read it by slot so a change to the circle moves the faces
// with it rather than leaving this file holding a second radius.
const RING = MARK.shapes.find((s) => s.slot === 'ring');
if (!RING || RING.tag !== 'circle') throw new Error('mark-faces: the table declares no <circle> in the `ring` slot, so the silhouette the faces are bounded by does not exist');
const R = RING.r, CX = RING.cx, CY = RING.cy;

// ---------- cubic machinery (moved verbatim out of design/round21.mjs, which now imports this) ----------
export const cubicPoints = (d) => {
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
  if (n.length !== 8) throw new Error(`expected one M..C.. cubic (8 numbers), got ${n.length} in: ${d}`);
  return [[n[0], n[1]], [n[2], n[3]], [n[4], n[5]], [n[6], n[7]]];
};
export const fmt = (p) => `${+p[0].toFixed(2)} ${+p[1].toFixed(2)}`;
export const cubic = (p) => `C${fmt(p[1])} ${fmt(p[2])} ${fmt(p[3])}`;
export const reverseCubic = (p) => [p[3], p[2], p[1], p[0]];

// de Casteljau split of one cubic at parameter t -> [sub 0..t, sub t..1]
export const splitCubic = (pts, t) => {
  const left = [pts[0]], right = [pts[3]];
  let cur = pts;
  for (let r = 1; r < 4; r++) {
    const nx = [];
    for (let i = 0; i < cur.length - 1; i++) {
      nx.push([cur[i][0] + (cur[i + 1][0] - cur[i][0]) * t, cur[i][1] + (cur[i + 1][1] - cur[i][1]) * t]);
    }
    left.push(nx[0]); right.unshift(nx.at(-1));
    cur = nx;
  }
  return [left, right];
};

const xAt = (pts, t) => { const u = 1 - t; return u ** 3 * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t ** 3 * pts[3][0]; };
const yAt = (pts, t) => { const u = 1 - t; return u ** 3 * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t ** 3 * pts[3][1]; };
const solveT = (pts, target, axis = xAt) => { let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (axis(pts, mid) < target) lo = mid; else hi = mid; } return (lo + hi) / 2; };

// A circular arc of the ring, as quarter-circle cubics with the standard 4(sqrt2-1)/3 control offset, in screen
// angles measured the way the ring is actually drawn: 180deg is its leftmost point (62,78), 0deg its rightmost
// (178,78), 270deg its top (120,20), 90deg its bottom (120,136). The ring is the ONE place the silhouette lives,
// so a face boundary that needs the limb uses this rather than a re-typed radius.
const K = 4 * (Math.SQRT2 - 1) / 3;
const arcCubics = (a0, a1) => {
  const segs = [];
  for (let a = a0; a < a1; a += 90) {
    const s = a, e = Math.min(a + 90, a1);
    const rad = (deg) => (deg * Math.PI) / 180;
    const p0 = [CX + R * Math.cos(rad(s)), CY + R * Math.sin(rad(s))];
    const p3 = [CX + R * Math.cos(rad(e)), CY + R * Math.sin(rad(e))];
    const c1 = [CX + R * (Math.cos(rad(s)) - K * Math.sin(rad(s))), CY + R * (Math.sin(rad(s)) + K * Math.cos(rad(s)))];
    const c2 = [CX + R * (Math.cos(rad(e)) + K * Math.sin(rad(e))), CY + R * (Math.sin(rad(e)) - K * Math.cos(rad(e)))];
    segs.push([p0, c1, c2, p3]);
  }
  return segs;
};
// A chain of cubics, WITHOUT its own move. A face is one closed chain, so the arc has to join the curve it is
// appended to at the current point; a second `M` in the middle would be a jump, and a jump inside a "closed" face
// is a region whose measured area is not the region its name claims. `joinAt` is what makes that a named failure
// instead of a shoelace over a shape nobody drew.
const arcChain = (a0, a1) => arcCubics(a0, a1).map((s) => cubic(s)).join(' ');
const arcStart = (a0) => {
  const rad = (deg) => (deg * Math.PI) / 180;
  return [CX + R * Math.cos(rad(a0)), CY + R * Math.sin(rad(a0))];
};
const joinAt = (from, to, what) => {
  const d = Math.hypot(from[0] - to[0], from[1] - to[1]);
  if (d > 0.5) throw new Error(`mark-faces: the ${what} would jump ${d.toFixed(2)} viewBox units from ${fmt(from)} to ${fmt(to)} — a face boundary must be continuous, so this face is not the region it names`);
  return fmt(to);
};

// ---------- the faces, each as a closed path built from the table's own curves ----------
//
// THE LUNE. The left route forward (foot -> pole), the right route REVERSED (pole -> foot), and the near arc's
// sub-cubic between the two feet. The endpoints are CHECKED after the fact: the sub-arc must start and end at the
// route feet and the two routes must share the pole.
export function lunePath() {
  const routes = MARK.shapes.filter((s) => s.role === 'route').map((s) => cubicPoints(s.d));
  if (routes.length !== 2) throw new Error(`the table declares ${routes.length} route cubics; the lune needs exactly 2`);
  const [left, right] = routes;
  if (left[3][0] !== right[3][0] || left[3][1] !== right[3][1]) {
    throw new Error(`the two routes end at ${left[3]} and ${right[3]} — no shared pole, so the lune cannot close`);
  }
  const arcShape = MARK.shapes.find((s) => s.role === 'sphere' && s.tag === 'path' && s.face === 'front');
  if (!arcShape) throw new Error('the table declares no front (near) equator arc — the lune would have no lower edge');
  const P = cubicPoints(arcShape.d);
  const t1 = solveT(P, left[0][0]), t2 = solveT(P, right[0][0]);   // the arc's parameters at the two route FEET
  const mid = splitCubic(P, Math.min(t1, t2))[1];
  const sub = splitCubic(mid, (Math.max(t1, t2) - Math.min(t1, t2)) / (1 - Math.min(t1, t2)))[0];
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const [a, , , d] = sub;
  const [lo, hi] = near(a, left[0]) <= near(a, right[0]) ? [a, d] : [d, a];
  if (near(lo, left[0]) > 0.5 || near(hi, right[0]) > 0.5) {
    throw new Error(`the near arc's sub-cubic runs ${fmt(lo)} -> ${fmt(hi)} but the route feet are at ${fmt(left[0])} and ${fmt(right[0])} — the wash would not meet the ink`);
  }
  // forward: left foot -> pole -> right foot -> (arc reversed) right foot -> left foot
  return `M${fmt(left[0])} ${cubic(left)} ${cubic(reverseCubic(right))} ${cubic(reverseCubic([sub[3], sub[2], sub[1], sub[0]]))} Z`;
}

// THE NORTH FACE: the near arc reversed (from the ring's right crossing to its left crossing along the arc that
// bows down) plus the ring's upper semicircle (180deg -> 360deg, through the top). A lune on the sphere.
export function northPath() {
  const front = MARK.shapes.find((s) => s.role === 'sphere' && s.face === 'front');
  if (!front) throw new Error('no front equator arc: the north face has no lower edge');
  const F = cubicPoints(front.d);
  joinAt(F[0], arcStart(180), 'north face (near arc end -> limb at 180deg)');
  return `M${fmt(F[3])} ${cubic(reverseCubic(F))} ${arcChain(180, 360)} Z`;
}

// THE SOUTH FACE: the near arc forward plus the ring's lower semicircle (0deg -> 90deg -> 180deg, through the
// bottom). The second lune; together with the north face it tiles the visible hemisphere.
export function southPath() {
  const front = MARK.shapes.find((s) => s.role === 'sphere' && s.face === 'front');
  if (!front) throw new Error('no front equator arc: the south face has no upper edge');
  const F = cubicPoints(front.d);
  joinAt(F[3], arcStart(0), 'south face (near arc end -> limb at 0deg)');
  return `M${fmt(F[0])} ${cubic(F)} ${arcChain(0, 180)} Z`;
}

// THE NEAR HEMISPHERE: for an orthographic projection the ring's interior IS the near hemisphere.
export const discPath = () => `M${CX - R} ${CY} ${arcCubics(180, 360).map((s) => cubic(s)).join(' ')} ${arcCubics(0, 180).map((s) => cubic(s)).join(' ')} Z`;

// ---------- the sphere this drawing implies, and the two ways to measure a face ----------
const SAMPLES = 240;                                    // per cubic; the areas converge to <0.01% of the disc
const flatten = (d) => {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const pts = [];
  let i = 0;
  if (nums.length < 2) throw new Error(`path has no move: ${d}`);
  const moves = d.match(/\bM/g)?.length ?? 0;
  if (moves !== 1) throw new Error(`a face must be ONE closed chain; this path carries ${moves} moves: ${d.slice(0, 100)}`);
  pts.push([nums[i++], nums[i++]]);                                    // the current point, as SVG sees it
  // A `C` in these paths carries SIX numbers (two control points and the end point): cubic() emits three points
  // because a segment's FIRST point is the current point. The first version read eight numbers per segment, so
  // flatten walked off the chain, produced NaN coordinates and printed "projected area NaN" for every face
  // instead of naming the bug (@caught 2026-11-24 by the first run of faceAreas).
  while (i < nums.length) {
    if (i + 6 > nums.length) throw new Error(`face path ends in a partial cubic (${nums.length - i} numbers left): ${d.slice(0, 100)}`);
    const seg = [pts[pts.length - 1], [nums[i], nums[i + 1]], [nums[i + 2], nums[i + 3]], [nums[i + 4], nums[i + 5]]];
    i += 6;
    for (let s = 1; s <= SAMPLES; s++) {
      const t = s / SAMPLES, u = 1 - t;
      pts.push([
        u ** 3 * seg[0][0] + 3 * u * u * t * seg[1][0] + 3 * u * t * t * seg[2][0] + t ** 3 * seg[3][0],
        u ** 3 * seg[0][1] + 3 * u * u * t * seg[1][1] + 3 * u * t * t * seg[2][1] + t ** 3 * seg[3][1],
      ]);
    }
  }
  return pts;
};
const shoelace = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; s += x1 * y2 - x2 * y1; }
  return Math.abs(s) / 2;
};

// The sphere, read off the drawing exactly as design/mark-meridian-fit.mjs reads it: the equator's own cubic pair
// bows 21 units, so its semi-minor is b = 21 and the axis stands arccos(b/r) = 68.77deg away from the viewing
// direction (21.23deg out of the screen plane). Two consequences used below:
//   - the limb (the ring) is a great circle facing the viewer, and the equator is a great circle, so the visible
//     face splits into two spherical LUNES whose angles are phi and 180-phi with phi = arccos(b/r); a lune of
//     angle a has area 2a r^2;
//   - the two meridians are the sphere's own (sixth ruling), so the lune face is a spherical triangle whose feet
//     are RIGHT angles and whose area is the pole's angle: its spherical excess is the angle between the two
//     meridian planes, which is the feet' difference in longitude.
const frontShape = MARK.shapes.find((s) => s.role === 'sphere' && s.face === 'front');
const B = (() => {                                                    // the equator's semi-minor, from the arc itself
  const apexY = yAt(cubicPoints(frontShape.d), 0.5);
  return Math.abs(apexY - CY);
})();
const PHI = Math.acos(B / R);                                        // radians; the south lune's angle
const FEET = MARK.shapes.filter((s) => s.role === 'route').map((s) => s.d.match(/-?\d+(\.\d+)?/g).map(Number).slice(0, 2));
const nHat = [0, -Math.sqrt(1 - (B / R) ** 2), B / R];               // the axis: screen x, screen y, toward-viewer
const aHat = [1, 0, 0];                                              // the equator's right crossing (178,78)
const bHat = [0, nHat[2], -nHat[1]];                                 // n x a: the near apex direction, unit
const footLon = ([x, y]) => {                                        // a foot's longitude on the sphere
  const dx = x - CX, dy = y - CY;
  const z2 = R * R - dx * dx - dy * dy;
  if (z2 <= 0) throw new Error(`foot (${x},${y}) is outside the ring's silhouette, so it is not on the visible sphere`);
  const p = [dx, dy, Math.sqrt(z2)];
  return Math.atan2(p[0] * bHat[0] + p[1] * bHat[1] + p[2] * bHat[2], p[0] * aHat[0] + p[1] * aHat[1] + p[2] * aHat[2]);
};
const LON = FEET.map(footLon);
const DELTA_LON = Math.abs(LON[0] - LON[1]);                         // the meridian angle at the pole

export const FACES = [
  {
    name: 'lune', term: 'spherical triangle (two meridians + the equator arc between their feet)',
    where: 'between the two meridians, on the visible face — the mark\'s own "area"',
    d: lunePath(),
    spherical: { kind: 'Girard excess', excessDeg: +(DELTA_LON * 180 / Math.PI).toFixed(2), areaR2: +DELTA_LON.toFixed(4), note: 'both foot angles are 90deg, which is what the two right-angle marks in the drawing state, so the excess is the pole angle alone' },
  },
  {
    name: 'north', term: 'spherical lune (near equator semicircle + the limb\'s upper semicircle)',
    where: 'everything above the near arc: the pole, both meridians, the right-angle marks',
    d: northPath(),
    spherical: { kind: 'lune', angleDeg: +((Math.PI - PHI) * 180 / Math.PI).toFixed(2), areaR2: +(2 * (Math.PI - PHI)).toFixed(4), note: 'bounded by two great semicircles meeting where the equator crosses the limb, (62,78) and (178,78)' },
  },
  {
    name: 'south', term: 'spherical lune (near equator semicircle + the limb\'s lower semicircle)',
    where: 'between the near arc and the bottom of the silhouette',
    d: southPath(),
    spherical: { kind: 'lune', angleDeg: +(PHI * 180 / Math.PI).toFixed(2), areaR2: +(2 * PHI).toFixed(4), note: 'the north and south lunes tile the visible hemisphere exactly: their angles sum to 180deg' },
  },
  {
    name: 'disc', term: 'the near hemisphere (what an orthographic view of a sphere shows)',
    where: 'the whole ring interior',
    d: discPath(),
    spherical: { kind: 'hemisphere', angleDeg: 180, areaR2: +(2 * Math.PI).toFixed(4), note: 'a projection shows exactly one hemisphere, so colouring the near hemisphere means colouring the disc' },
  },
];

// A face as a POLYGON, for anything that has to ask "is this point in this region?" — round 22 uses it to work
// out, geometrically rather than by opinion, which of the drawn lines lie OVER a filled face and therefore have
// to clear the graphic bar against the FILL instead of against the page.
export const facePolygon = (name) => flatten(faceBy(name).d);

export const faceBy = (name) => { const f = FACES.find((x) => x.name === name); if (!f) throw new Error(`mark-faces: no face named "${name}". Faces: ${FACES.map((f) => f.name).join(', ')}`); return f; };

// projected areas, in viewBox units and as a share of the ring's disc; spherical areas from the geometry above
export function faceAreas() {
  const discArea = Math.PI * R * R;
  const out = [];
  for (const f of FACES) {
    const area = shoelace(flatten(f.d));
    const sphFrac = f.spherical.areaR2 / (4 * Math.PI);
    out.push({
      name: f.name, term: f.term, where: f.where,
      areaUnits: +area.toFixed(1),
      pctOfDisc: +(100 * area / discArea).toFixed(2),
      pctOfRingCubic: +(100 * area / (R * R)).toFixed(2),          // vs the ring's r^2, the naive square
      sphericalFracPct: +(100 * sphFrac).toFixed(2),
      spherical: f.spherical,
      // foreshortening: projected area divided by the area the same region has ON the SPHERE, both in square
      // viewBox units. A projection can only shrink area, so this must land in (0, 1]; the disc is the calibration
      // point (a hemisphere projects to a disc, so it must read 0.50), and a face that reads > 1 is a path that is
      // not the region it names.
      sphereAreaUnits: +(f.spherical.areaR2 * R * R).toFixed(1),
      foreshorten: +(area / (f.spherical.areaR2 * R * R)).toFixed(4),
    });
  }
  return out;
}

// The assertions that make the geometry above load-bearing rather than descriptive.
export function assertAreas(areas, tol = 0.02) {
  const problems = [];
  const by = Object.fromEntries(areas.map((a) => [a.name, a]));
  const d = by.disc;
  if (Math.abs(d.areaUnits - Math.PI * R * R) > tol * Math.PI * R * R)
    problems.push(`the disc face measures ${d.areaUnits} viewBox units, the ring declares pi r^2 = ${(Math.PI * R * R).toFixed(1)} — the arc cubics do not draw the circle`);
  const northPlusSouth = by.north.areaUnits + by.south.areaUnits;
  if (Math.abs(northPlusSouth - d.areaUnits) > tol * d.areaUnits)
    problems.push(`north (${by.north.areaUnits}) + south (${by.south.areaUnits}) = ${northPlusSouth.toFixed(1)} but the disc is ${d.areaUnits} — the two faces do not tile the visible face`);
  for (const a of areas) {
    if (!(a.foreshorten > 0 && a.foreshorten <= 1 + tol))
      problems.push(`${a.name}: projected area ${a.areaUnits} against its spherical area ${a.sphereAreaUnits} reads ${a.foreshorten} — outside (0, 1], so a projection would have had to ENLARGE the region, which means the path is not the face it names`);
  }
  const disc = by.disc;
  if (Math.abs(disc.foreshorten - 0.5) > tol)
    problems.push(`the disc face's foreshortening is ${disc.foreshorten}, not 0.5: a hemisphere projects to a disc, so pi r^2 / 2 pi r^2 is the calibration every other face is read against`);
  if (by.lune.areaUnits >= by.north.areaUnits) problems.push('the lune is not inside the north face');
  if (by.north.areaUnits >= d.areaUnits) problems.push('the north face is not inside the disc');
  return problems;
}

export const FACE_GEOMETRY = {
  r: R, cx: CX, cy: CY,
  equatorSemiMinor: +B.toFixed(3),
  axisOutOfScreenPlaneDeg: +(90 - PHI * 180 / Math.PI).toFixed(2),
  axisFromViewingDirectionDeg: +(PHI * 180 / Math.PI).toFixed(2),
  footLongitudesDeg: LON.map((l) => +(l * 180 / Math.PI).toFixed(2)),
  poleAngleDeg: +(DELTA_LON * 180 / Math.PI).toFixed(2),
  feet: FEET,
  samplesPerCubic: SAMPLES,
  arcFitConstant: +K.toFixed(6),
};
