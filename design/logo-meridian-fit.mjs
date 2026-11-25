// logo-meridian-fit.mjs — how straight can a meridian be, and what does the meeting angle cost?
//
//   node logo-meridian-fit.mjs            # the trade-off table for the logo's own sphere
//   node logo-meridian-fit.mjs --join 72  # one candidate, printed in path form
//   node logo-meridian-fit.mjs --exact    # the TRUE projected meridian, as path data
//
// SIXTH RULING (operator, 2026-11-24): "the curves from the equator to the north pole are not perfectly curved as
// they would when on a sphere. Can you fix that?" That retires the trade-off below as the thing that picks the
// curve — the curve is now the sphere's own, and what the trade-off table still answers is what the true curve
// COSTS, which is the second half of the same measurement. `--exact` emits the path data: the projected meridian
// is an affine image of the unit circle (conjugate semi-diameters A' and B' below), so one cubic per quarter
// ellipse with the standard k = 4(sqrt2-1)/3 control offset reproduces it to hundredths of a unit, and the script
// reports that error rather than asserting it.
//
// WHY THIS EXISTS. The fifth ruling on the logo (operator, 2026-11-24) moves the meeting point from the SOUTH
// pole to the NORTH pole. That is not a mirror of the old drawing: the fourth ruling (2026-11-23) pinned the two
// lines to the NEAR arc of the equator, and the near arc sits 19 units BELOW the centre, so the room between the
// join and the pole changes from 39 units to 77. The room is where the logo's two claims compete:
//
//   - "PARALLEL" wants a long straight run at a constant separation;
//   - "ON A CURVED SURFACE" wants the pair to follow a real meridian, which starts bending at once;
//   - "THEY CROSS" wants the two to arrive at the pole at an angle, not kiss into it.
//
// So the choice is a curve of trade-offs, and the honest way to pick a point on it is to measure the curve. This
// script computes the TRUE orthographic meridian of the sphere the logo already draws (ring r 58, equator
// semi-minor 21, so the axis stands 21.2 deg out of the screen plane), then fits the logo's two-part route
// (a straight vertical, then one cubic with a vertical departure, ending ON the ring) for each candidate length
// of straight run, and reports the deviation from the true meridian and the angle the mirrored pair meet at.
//
// It reads the sphere out of `src/lib/logo.mjs` rather than restating it, so a retune of the ring or the
// equator moves this table with it.
import { LOGO } from '../src/lib/logo.mjs';

const sphere = LOGO.shapes.find((s) => s.role === 'sphere' && s.tag === 'circle');
const arcs = LOGO.shapes.filter((s) => s.role === 'sphere' && s.tag === 'path');
const near = arcs.find((a) => a.face === 'front');
const { cx, cy, r } = sphere;
const num = (s) => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);

const bez = (p, t) => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
};
const pathToBez = (d) => { const n = num(d); return [[n[0], n[1]], [n[2], n[3]], [n[4], n[5]], [n[6], n[7]]]; };

// where the drawn near arc actually paints at the join column, and how far off horizontal it lies there
const nearB = pathToBez(near.d);
const atX = (b, x) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (bez(b, m)[0] < x) lo = m; else hi = m; }
  const t = (lo + hi) / 2, p = bez(b, t), q = bez(b, Math.min(1, t + 1e-4));
  return { y: p[1], deg: Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI };
};

// the routes' join columns, read out of the table (the first `L` of each route)
const routes = LOGO.shapes.filter((s) => s.role === 'route');
const joinX = routes.map((s) => { const n = num(s.d); return n[0]; });
const xJoin = Math.min(...joinX);                       // the left route's column
const P = atX(nearB, xJoin);

// the sphere's own tilt, read off the drawn ellipse: the apex a cubic paints is 0.75 of its control offset
const ctrl = num(near.d);
const bow = 0.75 * Math.abs(ctrl[3] - ctrl[1]);
const phi = Math.asin(bow / r);
const poleTrue = cy - r * Math.cos(phi);

// the true projected meridian, from the near-equator join to the pole, sampled every degree
const X0 = xJoin - cx, Z0 = -(P.y - cy);
const Y0 = Math.sqrt(Math.max(0, r * r - X0 * X0 - Z0 * Z0));            // the near side, toward the viewer
const Ph = [X0, Y0, Z0].map((v) => v / r);
const Nh = [0, Math.sin(phi), Math.cos(phi)];
const truePts = [];
for (let deg = 0; deg <= 90; deg++) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const m = [c * Ph[0] + s * Nh[0], c * Ph[1] + s * Nh[1], c * Ph[2] + s * Nh[2]];
  truePts.push([cx + r * m[0], cy - r * m[2]]);
}
const arrTrue = Math.abs(Math.atan2(-Ph[2], -Ph[0]) * 180 / Math.PI);

console.log(`sphere r ${r} at ${cx},${cy}; the drawn near arc paints y ${P.y.toFixed(3)} at x ${xJoin} and lies ${P.deg.toFixed(2)} deg off horizontal there`);
console.log(`equator semi-minor ${bow} = ${(bow / r).toFixed(4)} r -> the axis stands ${(phi * 180 / Math.PI).toFixed(2)} deg out of the screen plane`);
console.log(`a true projection puts the pole ${Math.round(r * Math.cos(phi))} units from the centre (y ${poleTrue.toFixed(2)}); the logo's convention puts it ON the ring at y ${cy - r}, ${Math.abs(poleTrue - (cy - r)).toFixed(2)} units further out`);
console.log(`the true meridian arrives at the pole ${arrTrue.toFixed(1)} deg off horizontal, so a mirrored pair would meet at ${(arrTrue <= 45 ? 2 * arrTrue : 180 - 2 * arrTrue).toFixed(0)} deg`);

const E = [cx, cy - r];                                  // the meeting point the gates hold: on the ring
const meetDeg = (th) => (th <= 45 ? 2 * th : 180 - 2 * th);

function fit(yj) {
  const pts = truePts.filter((p) => p[1] <= yj + 1e-9);
  if (pts.length < 4) return null;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1] || 1, ts = cum.map((v) => v / L);
  let best = null;
  for (let a = 2; a <= 50; a += 0.5) {
    for (let x2 = xJoin; x2 <= cx + 1; x2 += 0.5) {
      for (let y2 = cy - r - 10; y2 <= yj; y2 += 0.5) {
        const q = [[xJoin, yj], [xJoin, yj - a], [x2, y2], E];
        let e = 0, mx = 0;
        for (let i = 0; i < pts.length; i++) {
          const s = bez(q, ts[i]);
          const d = Math.hypot(s[0] - pts[i][0], s[1] - pts[i][1]);
          e += d * d; if (d > mx) mx = d;
        }
        const rms = Math.sqrt(e / pts.length);
        if (!best || rms < best.rms) best = { rms, mx, a, x2, y2 };
      }
    }
  }
  const th = Math.abs(Math.atan2(E[1] - best.y2, E[0] - best.x2) * 180 / Math.PI);
  const q = [[xJoin, yj], [xJoin, yj - best.a], [best.x2, best.y2], E];
  let mono = true, prev = Infinity, outside = false;
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const s = bez(q, t);
    if (s[1] > prev + 1e-9) mono = false;
    prev = s[1];
    if (Math.hypot(s[0] - cx, s[1] - cy) > r + 0.5) outside = true;
  }
  return { yj, run: P.y - yj, ...best, th, meet: meetDeg(th), mono, outside };
}

// ---- --exact: the sphere's own meridian, as path data -----------------------------------------------
// The projected meridian through the join column is a quarter of an ellipse centred on the sphere: relative to
// the centre it is cos a . A' + sin a . B', where A' is the join's own offset (a = 0) and B' is the projected
// axis (a = 90). One cubic over a quarter ellipse, with controls at k = 4(sqrt2-1)/3 of the conjugate
// semi-diameters, is the standard fit; its error is reported, not assumed.
if (process.argv.includes('--exact')) {
  const K = 4 * (Math.SQRT2 - 1) / 3;
  const A = [xJoin - cx, P.y - cy];                     // the foot's offset from the centre, in SVG y-down
  const B = [cx + r * Nh[0] - cx, -(r * Nh[2])];        // the projected axis: (0, -r cos phi)
  const P0 = [cx + A[0], cy + A[1]];
  const P1 = [P0[0] + K * B[0], P0[1] + K * B[1]];
  const P2 = [cx + B[0] + K * A[0], cy + B[1] + K * A[1]];
  const P3 = [cx + B[0], cy + B[1]];
  const q = [P0, P1, P2, P3];
  // Error against the analytic meridian, POINT FOR POINT at the same parameter: truePts is sampled every degree of
  // the meridian's own angle a, and the cubic's parameter t runs over the same quarter, so t = a/90. Comparing by
  // ARC-LENGTH fraction instead (the obvious thing) reported rms 3.46u for a fit that is exact to hundredths: the
  // two conjugate semi-diameters here are 32.2u and 54.1u long, so the point travels at very different speeds
  // along the ellipse and along the arc, and a speed mismatch reads as a shape error. What is being asked is
  // "does this cubic draw this ellipse", and that is a parameter-matched question.
  const n = truePts.length;
  let e = 0, mx = 0;
  for (let i = 0; i < n; i++) {
    const s = bez(q, i / (n - 1));
    const d = Math.hypot(s[0] - truePts[i][0], s[1] - truePts[i][1]);
    e += d * d; if (d > mx) mx = d;
  }
  // and the geometric distance, which is the number a reader can trust without knowing the parameterisation:
  // for each analytic sample, the nearest point on the drawn cubic.
  let gmx = 0;
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = 1;
    for (let k = 0; k < 40; k++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      const d1 = Math.hypot(bez(q, m1)[0] - truePts[i][0], bez(q, m1)[1] - truePts[i][1]);
      const d2 = Math.hypot(bez(q, m2)[0] - truePts[i][0], bez(q, m2)[1] - truePts[i][1]);
      if (d1 < d2) hi = m2; else lo = m1;
    }
    const s = bez(q, (lo + hi) / 2);
    gmx = Math.max(gmx, Math.hypot(s[0] - truePts[i][0], s[1] - truePts[i][1]));
  }
  const dep = Math.atan2(P1[1] - P0[1], P1[0] - P0[0]) * 180 / Math.PI;
  const arr = Math.atan2(P3[1] - P2[1], P3[0] - P2[0]) * 180 / Math.PI;
  // how the separation of the mirrored pair behaves: the logo's "parallel" claim now lives here, not in a
  // straight segment, so the number has to be measured and stated.
  const sepAt = (dy) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (bez(q, m)[1] > P0[1] - dy) lo = m; else hi = m; }
    return 2 * (cx - bez(q, (lo + hi) / 2)[0]);
  };
  let arc = 0;
  for (let i = 1; i < n; i++) arc += Math.hypot(truePts[i][0] - truePts[i - 1][0], truePts[i][1] - truePts[i - 1][1]);
  console.log(`exact projected meridian: rms ${Math.sqrt(e / n).toFixed(4)}u max ${mx.toFixed(4)}u off the analytic curve at the same parameter, ${gmx.toFixed(4)}u geometric (arc length ${arc.toFixed(1)}u)`);
  console.log(`  departs the near arc at ${Math.abs(dep).toFixed(2)}deg off horizontal (the arc there is ${P.deg.toFixed(2)}deg, so the drawn angle between them is ${(Math.abs(dep) - P.deg).toFixed(2)}deg); arrives at ${Math.abs(arr).toFixed(2)}deg -> the mirrored pair cross at ${(180 - 2 * Math.abs(arr)).toFixed(1)}deg`);
  console.log(`  the projected pole sits ${Math.hypot(B[0], B[1]).toFixed(2)}u from the centre (y ${P3[1].toFixed(2)}), which is sqrt(r^2 - b^2) = ${Math.sqrt(r * r - bow * bow).toFixed(2)} for the drawn equator's own semi-minor ${bow}`);
  for (const dy of [0, 5, 10, 15, 20, 30, 40, 50, 60]) console.log(`  ${String(dy).padStart(3)}u above the foot: separation ${sepAt(dy).toFixed(2)}u (${(100 * sepAt(dy) / sepAt(0)).toFixed(1)}% of the foot's)`);
  const f = (v) => String(+v.toFixed(2));
  console.log(`\n  d = M${f(P0[0])} ${f(P0[1])} C${f(P1[0])} ${f(P1[1])}, ${f(P2[0])} ${f(P2[1])}, ${f(P3[0])} ${f(P3[1])}`);
  console.log(`  mirror: M${f(2 * cx - P0[0])} ${f(P0[1])} C${f(2 * cx - P1[0])} ${f(P1[1])}, ${f(2 * cx - P2[0])} ${f(P2[1])}, ${f(2 * cx - P3[0])} ${f(P3[1])}`);
  console.log(`  dot / meet: ${f(P3[0])}, ${f(P3[1])}`);
  process.exit(0);
}

const only = process.argv.indexOf('--join');
const cands = only === -1
  ? [57, 62, 67, 72, 77, 82, 87].map((y) => fit(y)).filter(Boolean)
  : [fit(Number(process.argv[only + 1]))].filter(Boolean);
console.log('\nstraight run from the join, then one cubic to the ring:');
for (const c of cands) {
  console.log(`  join y ${c.yj}  run ${c.run.toFixed(1)}u  rms ${c.rms.toFixed(2)}u max ${c.mx.toFixed(2)}u off the true meridian` +
    `  arrival ${c.th.toFixed(1)}deg -> the pair meet at ${c.meet.toFixed(0)}deg  monotone ${c.mono}  leaves the ring: ${c.outside}`);
  console.log(`    d = M${xJoin} ${P.y.toFixed(0)} L${xJoin} ${c.yj} C${xJoin} ${(c.yj - c.a).toFixed(1)}, ${(2 * cx - c.x2 === c.x2 ? c.x2 : c.x2).toFixed(1)} ${c.y2.toFixed(1)}, ${E[0]} ${E[1]}` +
    `   (mirror: C${2 * cx - xJoin} ${(c.yj - c.a).toFixed(1)}, ${(2 * cx - c.x2).toFixed(1)} ${c.y2.toFixed(1)}, ${E[0]} ${E[1]})`);
}
