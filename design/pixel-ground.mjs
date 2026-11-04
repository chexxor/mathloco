// pixel-ground.mjs — what the page's GROUND actually is, in painted bytes, and what is still legal on it.
//
//   npm run build && npm run check:ground                 # "/" at 1240 and 390
//   node design/pixel-ground.mjs --routes / --widths 1240 390
//   node design/pixel-ground.mjs --selftest               # prove this instrument can see a background-image
//
// Why this exists (D143, record 0019): every contrast number `check:render` prints comes out of
// `design/grill/render-measure.js`'s `paintBytes()`, which parses a computed colour **string**. A
// `background-image` — a paper texture, a gradient, a photograph — never appears in that string, so it moves
// no number that gate prints. Measured: the page probes said the notice ring was **3.01** on a page whose
// pixels measured **3.03–3.06**. That gap is invisible today, and it is exactly the gap a texture or a
// photograph lives in — so "is there room under the ground for a grain?" and "does this photograph break the
// text on top of it?" were both unanswerable.
//
// What it measures, per route × width, off firefox's own screenshot of the settled page:
//
//   ground        - the painted colour nearest the `paper` token, NOT the histogram mode (on a textured page
//                   the tile splits the histogram and the mode lands on the panel tint — that is what it did
//                   the first time this was probed)
//   excursion     - how far the ground's own pixels move, in 8-bit levels: span and sd. This is the unit a
//                   grain is authored in, and the unit `paper -> panel` is stated in (a 4-level step).
//   flat ground   - what share of the page is within GROUND_TOL levels of that ground. A texture barely moves
//                   it; a photograph collapses it. That is the number that makes "texture vs photograph" one
//                   comparison instead of two arguments.
//   hairlines     - every horizontal 1px line of mid-tone pixels 40px+ long that has ground two rows above
//                   and two below, and its contrast measured against the pixels on BOTH sides. A ring sits on
//                   a boundary, so it has two neighbours — inside the box and outside it — and DESIGN.md's
//                   ground definition says a contrast number is a PAIR. The bar is applied to BOTH sides:
//                   the operator ruled on 2026-11-03 that a keyline may not straddle two grounds and that the
//                   fix is the placement, not the number (D149-3c), which is the ruling record 0018 was asking
//                   for. A ring with a tint on one side is therefore a FAIL here, not a note: `--color-rule`
//                   reads 3.01 on paper and 2.88 on `panel`, so the pair the ring is drawn across is already
//                   under the 3.0 graphic bar on its weaker side.
//   headroom      - from the measured hairline, how many levels the ground may move in each direction before
//                   that hairline crosses BARS.graphic. This is the answer the texture ruling needs.
//   token check   - the same pair computed in token space beside what the bytes say. The probe's first run
//                   measured rule-on-panel at 2.88 against record 0018's token-space 2.88: an instrument is
//                   only trustworthy if it reproduces a number that was settled another way.
//   the join      - the same pair as the page's own report states it (the CSS-string number) beside the number
//                   the bytes say, and the delta between them. A non-zero delta is the proof that the old
//                   instrument was blind to something.
//
// It EXITS 1 on two things, both of them already bars in this repo: a `rule` hairline measured off painted
// bytes under BARS.graphic (3.0, D101/D143), and a hairline whose two sides are different grounds with the
// weaker side under that bar (D149-3c). Neither is a new ruling.
//
// Records land in .design/tmp-ground/ (scratch: screenshots, per-width detail). The tracked artifact is
// design/ground/report.json, because a design record has to be able to cite a number that still exists.
// Both paths move by env var (`GROUND_OUT`, `GROUND_SCRATCH`): a REVIEW build — one with placeholders planted —
// must never overwrite the tracked report, because that report is the evidence for a page that is allowed to
// ship, and a review page is not (the harness that does this is `npm run review:render`).
import { execFileSync } from 'node:child_process';
import { shotHeight } from './grill/shot-height.mjs';
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

import { parseOklch, tripleToBytes, luminanceBytes, contrastBytes, BARS } from './grill/okcolor.mjs';

const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest');
const argList = (flag, dflt) => {
  const i = args.indexOf(flag);
  if (i < 0) return dflt;
  const out = [];
  for (let k = i + 1; k < args.length && !args[k].startsWith('--'); k++) out.push(args[k]);
  return out;
};
const routes = argList('--routes', ['/']);
const widths = argList('--widths', ['1240', '390', '320']).map(Number);
const JSONOUT = args.includes('--json');
// Tracked by default; an override is always a gitignored scratch path (`AGENTS.md`: a `.design/` file must
// match an ignore pattern, and `tmp-*` does). Printed loudly at the end so an override cannot be forgotten.
const OUT = process.env.GROUND_OUT || 'design/ground';
const SCRATCH = process.env.GROUND_SCRATCH || '.design/tmp-ground';

if (!existsSync(resolve('dist/client/index.html'))) {
  console.error('dist/client/index.html missing — run npm run build first');
  process.exit(1);
}
// ...and that build has to be this tree's. A branch switch leaves `dist/` holding the page the previous
// branch built, and bytes measured off it describe code that is no longer here (design/dist-fresh.mjs).
import { distState, staleLine } from './dist-fresh.mjs';
const STALE = distState();
if (!STALE.fresh && !STALE.allowed) { console.error(`check:ground: ${staleLine(STALE)}`); process.exit(1); }
mkdirSync(SCRATCH, { recursive: true });
const SITE_FP = createHash('sha1').update(readFileSync(resolve('dist/client/index.html'))).digest('hex').slice(0, 10);

// How far a pixel may sit from the ground and still be called ground. The scratch probe used 8 RGB levels and
// record 0019's whole argument is in levels, so levels are the unit here. Note this is NOT the survey's
// delta-OKLab >= 0.05 same-colour bar: `check:area` deliberately sits ABOVE a 3-level grain (which is why the
// grain leaves its numbers alone), so a ground measure in the same units as the grain has to be tighter.
// The two are complementary, and saying so is the point — conflating them is how record 0015's bad pair happened.
const GROUND_TOL = 8;
const MIN_RUN = 40;          // a hairline shorter than this is more likely an anti-aliased glyph edge

/** The bytes a token paints, straight out of `src/styles/global.css` — so a token change moves this probe. */
const tokenBytes = (name) => {
  const css = readFileSync(resolve('src/styles/global.css'), 'utf8');
  const m = css.match(new RegExp(`--color-${name}:\\s*oklch\\(([^)]+)\\)`));
  if (!m) { console.error(`--color-${name} not found in src/styles/global.css`); process.exit(1); }
  return tripleToBytes(parseOklch(`oklch(${m[1]})`));
};
const PAPER = tokenBytes('paper');
const PANEL = tokenBytes('panel');
const INK = tokenBytes('ink');
const TOKENS = { paper: PAPER, panel: PANEL, tint: tokenBytes('tint'), ink: INK };
const RULE_TOKEN = parseOklch(`oklch(${readFileSync(resolve('src/styles/global.css'), 'utf8').match(/--color-rule:\s*oklch\(([^)]+)\)/)[1]})`);
// The `rule` colour in bytes, so a painted run can be asked whether it IS the keyline. It has to be asked:
// the detector finds any 1px-tall, 40px-long run that is neither the ground nor near it, and that includes a
// line of `ink-3` small print — at 1240 a 51px run at y=2307 whose core is flat [93,110,97] (= --color-ink-3)
// with ground two rows above and below, because the paper->panel step is 4 levels and the neighbour tolerance
// is 12. The bar this gate enforces belongs to the keyline token, so only a run carrying that token's bytes
// carries the bar. Everything else is counted and named, never silently dropped.
const RULE_BYTES = tripleToBytes(RULE_TOKEN);
/** Which token a painted pixel sits on, so every measured number arrives already named. */
const classify = (c) => {
  let best = 'unknown', d = Infinity;
  for (const [n, t] of Object.entries(TOKENS)) {
    const dd = Math.hypot(c[0] - t[0], c[1] - t[1], c[2] - t[2]);
    if (dd < d) { d = dd; best = n; }
  }
  return d <= 10 ? best : `off-palette(${c.join(',')})`;
};

const name = (r) => (r === '/' ? '' : r.replace(/^\//, '_').replace(/\//g, '-'));

/** One harness run: firefox's screenshot of the settled page, plus the page's own report.
 *
 * A firefox that starts and never posts is this harness's known flake (`design/README.md`: it was chased at
 * `/404 @390` in `check:render`). `check:render` gives each cell two attempts for exactly that reason; this
 * gate had one, and three cells in series meant one dead cell redded a run that had nothing to report.
 * Three of the first six runs in the keyline round died that way, so the retry moves here. A retry is not a
 * pass: the attempt count is printed, and a cell that only passes on the second attempt is still visible.
 */
const ATTEMPTS = Number(process.env.GROUND_ATTEMPTS ?? 2);
const shoot = (distDir, route, w, h, shot) => {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let out;
    try {
      out = execFileSync(process.execPath, [
        'design/grill/dist-measure.mjs', distDir, route, 'design/grill/render-measure.js',
        String(w), String(h), ...(shot ? [shot] : []),
      ], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    } catch (err) {
      if (attempt === ATTEMPTS) throw err;
      console.log(`  note: ${route} @ ${w} posted nothing on attempt ${attempt}/${ATTEMPTS} - retrying`);
      continue;
    }
    const lines = out.split('\n');
    const start = lines.findIndex((l) => l.trim() === '{');
    if (start >= 0) {
      try { return JSON.parse(lines.slice(start).join('\n')); } catch { /* fall through to the retry */ }
    }
    if (attempt === ATTEMPTS) return null;
    console.log(`  note: ${route} @ ${w} posted no report on attempt ${attempt}/${ATTEMPTS} - retrying`);
  }
  return null;
};

/**
 * Read one shot. Returns the ground, its excursion, the hairlines and the flat-ground share.
 * `want` overrides which token counts as the ground (the selftest needs to point at `panel`).
 */
async function measureShot(shot, want = PAPER, windowHint = null) {
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };
  const hist = new Map();
  for (let i = 0; i < data.length; i += C) {
    const k = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  let ground = null, best = Infinity;
  for (const k of hist.keys()) {
    const c = k.split(',').map(Number);
    const d = Math.hypot(c[0] - want[0], c[1] - want[1], c[2] - want[2]);
    if (d < best) { best = d; ground = c; }
  }
  const near = (p, q, tol) => Math.abs(p[0] - q[0]) <= tol && Math.abs(p[1] - q[1]) <= tol && Math.abs(p[2] - q[2]) <= tol;
  const total = W * H;
  let n = 0, lo = 999, hi = -999, sum = 0, sum2 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = px(x, y);
    if (!near(p, ground, GROUND_TOL)) continue;
    n++;
    const d = (p[0] + p[1] + p[2]) / 3 - (ground[0] + ground[1] + ground[2]) / 3;
    lo = Math.min(lo, d); hi = Math.max(hi, d); sum += d; sum2 += d * d;
  }
  const sd = n ? Math.sqrt(Math.max(0, sum2 / n - (sum / n) ** 2)) : 0;
  // Horizontal 1px hairlines. The ground-neighbour test is load-bearing: without it this matches
  // anti-aliased text edges, which is exactly what it did the first time.
  const gl = luminanceBytes(ground);
  const lum = luminanceBytes;
  const isLine = (x, y) => { const l = lum(px(x, y)); return l < 0.8 * gl && l > 0.1 * gl; };
  const lines = [];
  for (let y = 2; y < H - 2; y++) {
    let run = 0;
    for (let x = 0; x < W; x++) {
      const ok = isLine(x, y) && !near(px(x, y), ground, 45) && near(px(x, y - 2), ground, 12) && near(px(x, y + 2), ground, 12);
      if (ok) run++;
      else { if (run >= MIN_RUN) lines.push([y, x - run, run]); run = 0; }
    }
    if (run >= MIN_RUN) lines.push([y, W - run, run]);
  }
  const cs = [];
  const recs = [];
  for (const [y, x0, len] of lines) {
    const mid = x0 + Math.floor(len / 2);
    const core = px(mid, y), above = px(mid, y - 2), below = px(mid, y + 2);
    const cUp = contrastBytes(core, above), cDn = contrastBytes(core, below);
    // A ring sits on a BOUNDARY, so it has two neighbours: inside the box and outside it. DESIGN.md's ground
    // definition says a contrast number is a pair, so both pairs get measured. Which side the ring is drawn
    // ON is not decidable from pixels, so the bar is applied to the stronger side and the weaker side is
    // reported by name — failing it would invent a ruling that was never made.
    const own = Math.max(cUp, cDn), other = Math.min(cUp, cDn);
    const ownGround = cUp >= cDn ? above : below, otherGround = cUp >= cDn ? below : above;
    const distRule = Math.hypot(core[0] - RULE_BYTES[0], core[1] - RULE_BYTES[1], core[2] - RULE_BYTES[2]);
    recs.push({
      y, x: x0, len, core,
      rule: distRule <= 14,
      own: +own.toFixed(2), other: +other.toFixed(2), ownGround: classify(ownGround), otherGround: classify(otherGround),
    });
    cs.push(own);
  }
  // Only the runs that carry the keyline token are measured against the graphic bar. The rest are reported.
  const ruleRecs = recs.filter((r) => r.rule);
  const notKeyline = recs.filter((r) => !r.rule);
  cs.length = 0;
  for (const r of ruleRecs) cs.push(r.own);
  cs.sort((a, b) => a - b);
  // which hairline is the weakest one — the one every ground decision has to be argued against
  let weakest = 0;
  for (let i = 1; i < ruleRecs.length; i++) if (ruleRecs[i].own < ruleRecs[weakest].own) weakest = i;
  // How far the GROUND may move before the weakest hairline crosses the graphic bar. Solving the WCAG pair
  // for the ground's luminance: (gl + 0.05) / (hl + 0.05) = bar  ->  gl = bar * (hl + 0.05) - 0.05, then
  // convert that luminance back to an approximate 8-bit level. Both directions, because a grain can only go
  // up on this palette and the reader needs to see that the DOWN direction is already spent.
  const headroom = (bar) => {
    if (!ruleRecs.length) return null;
    const w = ruleRecs[weakest];
    const hl = lum(px(w.x + Math.floor(w.len / 2), w.y));
    const target = bar * (hl + 0.05) - 0.05;      // the ground luminance at which this hairline hits the bar
    const levelAt = (L) => { const v = 1.055 * Math.max(0, L) ** (1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, v)) * 255); };
    // down = how many levels the ground may still DARKEN before the bar is crossed (record 0019 measured this
    // as zero: one level and 3.01 became 2.96). Lightening only ever helps a dark line, so its ceiling is the
    // top of the range, not the bar: record 0019's "rendered paper sits three levels under clipping".
    return { down: levelAt(gl) - levelAt(target), clip: 255 - Math.max(...ground) };
  };
  // The grain number, in the unit record 0019 quotes (a flat window's sd, in 8-bit levels). A whole-shot sd
  // is about the paper->panel tint step, not about the ground, so: take a window that is one colour, and
  // report THAT. `windowHint` lets a caller re-measure the same window in another shot, which is what makes a
  // before/after pair a pair instead of two pages (record 0015).
  const SZ = 64;
  let win = windowHint;
  if (!win) {
    outer: for (let y = 0; y + SZ < H; y += 16) {
      for (let x = 0; x + SZ < W; x += 16) {
        if (!near(px(x, y), ground, 3)) continue;
        let same = 0;
        for (let dy = 0; dy < SZ; dy += 2) for (let dx = 0; dx < SZ; dx += 2) if (near(px(x + dx, y + dy), ground, 2)) same++;
        if (same >= (SZ / 2) ** 2 * 0.99) { win = { x, y, size: SZ }; break outer; }
      }
    }
  }
  let flat = null;
  if (win) {
    const vals = [];
    for (let dy = 0; dy < win.size; dy++) for (let dx = 0; dx < win.size; dx++) {
      const c = px(win.x + dx, win.y + dy); vals.push((c[0] + c[1] + c[2]) / 3);
    }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const wsd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    flat = { ...win, span: +(Math.max(...vals) - Math.min(...vals)).toFixed(2), sd: +wsd.toFixed(2) };
  }
  return {
    width: W, height: H, ground, groundExact: hist.get(ground.join(',')) || 0,
    distinct: hist.size, groundPx: n, groundPct: +(100 * n / total).toFixed(2),
    spanLo: lo, spanHi: hi, span: hi - lo, sd: +sd.toFixed(2), flat,
    hairlines: ruleRecs.length, runs: lines.length,
    // Runs that are 1px tall and 40px long but are NOT the keyline token — small-print text, an underline.
    // Named so the count above can be argued about, and so a future false failure is traceable to a line.
    notKeyline: notKeyline.map((r) => `core ${r.core.join(',')} (${classify(r.core)}) ${r.own}/${r.other} at y=${r.y} x=${r.x} len=${r.len}`),
    hairlineMin: cs.length ? +cs[0].toFixed(2) : null,
    hairlineMedian: cs.length ? +cs[Math.floor(cs.length / 2)].toFixed(2) : null,
    hairlineMax: cs.length ? +cs[cs.length - 1].toFixed(2) : null,
    // every ring whose weaker side sits under the graphic bar — record 0018's category
    weakSides: ruleRecs.filter((r) => r.other < BARS.graphic)
      .map((r) => `${r.own} on ${r.ownGround} / ${r.other} against ${r.otherGround} (y=${r.y} x=${r.x} len=${r.len})`),
    // ...and the subset of those that is a STRADDLE: the ring's two neighbours are different tokens, so the
    // ring is drawn across a boundary. D149-3c bans this and render-gate.mjs asserts the same thing from
    // computed CSS, which is the pair-of-pairs check (bytes catch what a stylesheet hides; CSS catches what
    // a branch that never renders cannot show a screenshot).
    straddles: ruleRecs.filter((r) => r.other < BARS.graphic && r.ownGround !== r.otherGround)
      .map((r) => `${r.own} on ${r.ownGround} / ${r.other} against ${r.otherGround} (y=${r.y} x=${r.x} len=${r.len})`),
    weakest: ruleRecs.length ? ruleRecs[weakest] : null,
    // Every painted hairline with BOTH of its grounds, so a summary number never has to be argued about
    // later. `hairlineMax 4.99` is meaningless on its own; the pair list says which edge that is and what
    // it is drawn between.
    pairs: ruleRecs,
    headroom: headroom(BARS.graphic),
    surfaces: [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([k, v]) => ({ rgb: k.split(',').map(Number), pct: +(100 * v / total).toFixed(1) })),
    nearestTokens: { paper: PAPER, panel: PANEL, ink: INK },
  };
}

/**
 * The page's own claim about its hairlines, straight from the DOM report (the CSS-string number).
 * Two sources, in this order: a notice's `keylineContrast`, and failing that any `isRule` ring's `inside`.
 * The second is not a loosening — it is what a page with a schedule in it actually has. The notice grammar
 * appears on the landing page only when the calendar holds no upcoming date (the section's empty state), so
 * a probe that insisted on a notice went blind on exactly the builds that carry events; the `li` rings the
 * schedule rows draw are the same `--color-rule` keyline, measured the same way.
 */
const claimedKeylines = (report) => {
  const fromNotices = (report?.notices ?? []).map((nt) => nt.keylineContrast);
  const fromRings = (report?.rings ?? []).filter((r) => r.isRule).map((r) => r.inside);
  return [...fromNotices, ...fromRings].filter((c) => typeof c === 'number').sort((a, b) => a - b);
};

const fails = [];
const records = [];
for (const route of routes) {
  for (const w of widths) {
    const shot = `${SCRATCH}/ground-${name(route) || 'root'}-${w}.png`;
    const probe1 = shoot('dist/client', route, w, 1200, '');
    const pageH = shotHeight(Number(probe1?.doc?.scrollHeight ?? 0), `${route} @ ${w}`);
    const report = shoot('dist/client', route, w, pageH, shot);
    if (!report) { console.error(`${route} @ ${w}: the page never posted — no measurement`); process.exit(1); }
    const m = await measureShot(shot, PAPER);
    const claimed = claimedKeylines(report);
    const delta = (m.hairlineMin !== null && claimed.length) ? +(m.hairlineMin - claimed[0]).toFixed(2) : null;
    const file = `${SCRATCH}/${name(route) || 'root'}-${w}.json`;
    writeFileSync(file, JSON.stringify({ route, siteFp: SITE_FP, width: w, pageH, shot, groundTol: GROUND_TOL, ...m, claimedKeylineContrast: claimed, bytesMinusCss: delta }, null, 1));
    records.push({ route, width: w, ...m, claimed, delta });

    console.log(`${route} @ ${w}x${pageH} (doc ${report.doc?.scrollHeight ?? '?'}px, shot ${m.width}x${m.height}, siteFp ${SITE_FP})`);
    console.log(`  ground ${m.ground.join(',')} nearest --color-paper — ${m.groundExact} px exact (${(100 * m.groundExact / (m.width * m.height)).toFixed(1)}% of the page), ${m.groundPct}% within ${GROUND_TOL} levels`);
    console.log(`  ground excursion: span ${m.spanLo.toFixed(1)}..+${m.spanHi.toFixed(1)} levels (${m.span.toFixed(1)}), sd ${m.sd} levels — the unit a grain is authored in (paper -> panel is a 4-level step)`);
    if (m.flat) console.log(`  flat ${m.flat.size}x${m.flat.size} window at x=${m.flat.x} y=${m.flat.y}: span ${m.flat.span} levels, sd ${m.flat.sd} — record 0019 measured the grain the palette holds at span 0->3, sd 0.00->0.51`);
    console.log(`  surfaces: ${m.surfaces.map((s) => `${s.rgb.join(',')} ${s.pct}%`).join('  ')} | distinct colours ${m.distinct}`);
    if (m.hairlines) {
      console.log(`  rule hairlines painted: ${m.hairlines} — against the ground each is drawn on: min ${m.hairlineMin} median ${m.hairlineMedian} max ${m.hairlineMax}${m.notKeyline.length ? ` (${m.notKeyline.length} other 1px runs at this width were rejected as not the keyline token)` : ''}`);
      console.log(`  weakest: ${m.weakest.own} at y=${m.weakest.y} x=${m.weakest.x} len=${m.weakest.len}, on ${m.weakest.ownGround} (other side: ${m.weakest.other} against ${m.weakest.otherGround})`);
      console.log(`  the page's own report says the same keyline is ${claimed.join(', ') || 'unreported'} (computed CSS) — bytes minus CSS: ${delta === null ? 'n/a' : delta}`);
      const tok = Object.entries(TOKENS).find(([, t]) => classify(t) === m.weakest.ownGround);
      if (tok) console.log(`  instrument check: rule-on-${m.weakest.ownGround} measures ${m.weakest.own} off bytes; token space predicts ${contrastBytes(tripleToBytes(RULE_TOKEN), tok[1])} (record 0018's table: 3.01 on paper, 2.88 on panel)`);
      for (const ws of m.weakSides) {
        const straddle = m.straddles.includes(ws);
        console.log(`  ${straddle ? 'FAIL' : 'NOTE'} a ring has a second ground behind it: ${ws} — ${straddle ? 'a keyline may not straddle two grounds (D149-3c): the weaker side is already under the 3.0 bar (record 0018)' : 'record 0018\u2019s category: both sides clear the bar, so the pair is legal'}`);
      }
      for (const s of m.straddles) fails.push(`${route} @ ${w}: a rule hairline straddles two grounds — ${s} — the weaker side is under the ${BARS.graphic.toFixed(1)} graphic bar (D149-3c, record 0018): move the box onto one ground, or take the keyline off a tint`);
      if (process.env.GROUND_VERBOSE) for (const nk of m.notKeyline) console.log(`  rejected run: ${nk}`);
      console.log(`  headroom before the hairline crosses ${BARS.graphic}: ${m.headroom.down > 0 ? `${m.headroom.down} more levels of ground darkening available` : 'NONE - the ground is already at or past the limit'}; lightening is bounded only by clipping, and this ground sits ${m.headroom.clip} levels under 255`);
      if (m.hairlineMin < BARS.graphic) fails.push(`${route} @ ${w}: a rule hairline measures ${m.hairlineMin} against the ground it is drawn on, under the ${BARS.graphic} graphic bar (D101, D143)`);
      if (delta !== null && Math.abs(delta) > 0.05) console.log(`  NOTE bytes and CSS disagree by ${delta}: something painted under that ring moved the pixels and not the stylesheet (record 0019's blind spot, now visible)`);
    } else {
      console.log(`  rule hairlines painted: none at this width`);
    }
    console.log(`  json: ${file}`);
    console.log('');
  }
}

// The tracked artifact: every width's headline numbers in one file, in the shape design/area and design/rhythm
// use. Records cite these numbers, so the numbers have to exist after the scratch directory goes (D100).
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/report.json`, JSON.stringify({
  measuredAt: new Date().toISOString(), siteFp: SITE_FP, widths, groundTol: GROUND_TOL, bars: BARS,
  rows: records.map((r) => ({
    route: r.route, width: r.width, ground: r.ground, groundExact: r.groundExact, groundPct: r.groundPct,
    span: r.span, sd: r.sd, flat: r.flat, surfaces: r.surfaces, distinct: r.distinct,
    hairlines: r.hairlines, runs: r.runs, notKeyline: r.notKeyline,
    hairlineMin: r.hairlineMin, hairlineMedian: r.hairlineMedian, hairlineMax: r.hairlineMax,
    weakest: r.weakest, weakSides: r.weakSides, straddles: r.straddles, headroom: r.headroom,
    pairs: r.pairs,
    claimedKeylineContrast: r.claimed, bytesMinusCss: r.delta,
  })),
}, null, 1));
console.log(`wrote ${OUT}/report.json — re-run npm run check:ground after any change to a ground or a keyline.`
  + (process.env.GROUND_OUT ? ` NOTE GROUND_OUT=${process.env.GROUND_OUT} is set: the TRACKED report was not updated.` : ''));

// ---------------------------------------------------------------------------
// --selftest: prove the instrument can see a background-image at all (D118).
// A probe nobody can blind is not an instrument. This builds a texture the CSS-string probes cannot see and
// requires (1) the SAME flat window reports an excursion it did not on the clean page, (2) a ring's measured
// contrast MOVES when the grain is behind it, (3) the page's own report of that keyline does NOT move — the
// counterfactual for the blindness — and (4) the ring does NOT move when the grain is planted on `body` alone,
// because anything that fills itself paints over the page ground. It mutates a COPY of dist; the shipped
// artifact is never touched.
// ---------------------------------------------------------------------------
/** the number a ring is judged by in a selftest row (its contrast against its own ground) */
const m2 = (r) => (r.hairlineMedian === null || r.hairlineMedian === undefined ? null : r.hairlineMedian);

if (SELFTEST) {
  const copy = `${SCRATCH}/selftest-dist`;
  rmSync(copy, { recursive: true, force: true });
  execFileSync('cp', ['-r', 'dist/client', copy]);
  const page = `${copy}/index.html`;
  const clean = readFileSync(page, 'utf8');
  // a 64x64 tile of +-4-level noise, in the amplitude range record 0019 says the palette holds
  const W = 64, buf = Buffer.alloc(W * W * 3);
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < W * W; i++) {
    const d = Math.round((rnd() - 0.5) * 8);
    const clamp = (v) => Math.max(0, Math.min(255, v));
    buf[i * 3] = clamp(PAPER[0] + d); buf[i * 3 + 1] = clamp(PAPER[1] + d); buf[i * 3 + 2] = clamp(PAPER[2] + d);
  }
  const tile = await sharp(buf, { raw: { width: W, height: W, channels: 3 } }).png().toBuffer();
  const url = `url(data:image/png;base64,${tile.toString('base64')})`;
  const w = 1240, route = '/';
  const base = records.find((r) => r.route === '/' && r.width === w);
  // measure the SAME flat window in every shot, else "before" and "after" are different windows (record 0015)
  const shotFor = async (css) => {
    writeFileSync(page, clean.replace('</head>', `<style>${css}</style></head>`));
    const probe1 = shoot(copy, route, w, 1200, '');
    const pageH = shotHeight(Number(probe1?.doc?.scrollHeight ?? 0), `${route} @ ${w} (selftest)`);
    const report = shoot(copy, route, w, pageH, `${SCRATCH}/selftest.png`);
    return { report, m: await measureShot(`${SCRATCH}/selftest.png`, PAPER, base.flat) };
  };
  // planted ON EVERY PAINTED SURFACE (the page ground plus anything that fills itself): the grain sits behind
  // the ring, so the ring's local contrast must move. A narrower selector was tried first and correctly
  // measured nothing, because the ring's neighbours are a component's own fill, not the section behind it.
  const surfaces = 'body,header,main,section,footer,[class*="bg-paper"],[class*="bg-panel"],[class*="bg-tint"]';
  const onSurfaces = await shotFor(`${surfaces}{background-image:${url};background-repeat:repeat}`);
  // planted on the page BODY: anything that paints its own fill covers the grain. Not a failure — it is the
  // design consequence of D143's paper texture, and the reason a page grain reads only in the gaps.
  const onBody = await shotFor(`body{background-image:${url};background-repeat:repeat}`);
  const claimed2 = claimedKeylines(onSurfaces.report);
  const checks = [
    ['sees-the-texture', !!(onSurfaces.m.flat && base.flat) && onSurfaces.m.flat.sd > base.flat.sd + 0.2,
      `same ${base.flat?.size}x${base.flat?.size} window at x=${base.flat?.x} y=${base.flat?.y}: sd ${onSurfaces.m.flat?.sd} vs clean ${base.flat?.sd}, span ${onSurfaces.m.flat?.span} vs ${base.flat?.span}`],
    ['moves-the-hairline', m2(onSurfaces.m) !== null && m2(base) !== null && Math.abs(m2(onSurfaces.m) - m2(base)) > 0.01,
      `ring against its own ground: planted ${m2(onSurfaces.m)} vs clean ${m2(base)}`],
    ['css-never-moved', claimed2.length && base.claimed.length && claimed2[0] === base.claimed[0],
      `the page's own keyline number: planted ${claimed2.join(',')} vs clean ${base.claimed.join(',')} — identical, which is the blindness this probe exists to close`],
    ['fills-hide-the-grain', m2(onBody.m) !== null && m2(base) !== null && Math.abs(m2(onBody.m) - m2(base)) <= 0.01,
      `planted on body instead: the ring stays ${m2(onBody.m)} vs clean ${m2(base)} — an element that paints its own fill covers the grain, so a page texture reads only where nothing paints (D143)`],
  ];
  let bad = 0;
  for (const [name2, ok, detail] of checks) {
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${name2.padEnd(20)} ${detail}`);
    if (!ok) bad++;
  }
  rmSync(copy, { recursive: true, force: true });
  console.log(bad ? `\npixel-ground selftest: ${bad} of ${checks.length} MISSED — the instrument cannot see a background-image, so every ground number above is a CSS guess` : `\npixel-ground selftest: ${checks.length}/${checks.length} as designed`);
  process.exit(bad ? 1 : 0);
}

if (JSONOUT) console.log(JSON.stringify({ siteFp: SITE_FP, groundTol: GROUND_TOL, records }, null, 1));
if (fails.length) {
  console.log('FAIL');
  for (const f of fails) console.log(`  ${f}`);
  console.log('\nA hairline under its bar off painted bytes is a real boundary that has stopped reading. The number');
  console.log('check:render printed came from computed CSS, so it cannot see what moved it (record 0019).');
  process.exit(1);
}
console.log(`No hairline is under ${BARS.graphic} off bytes. Records: ${SCRATCH}/ — re-run after anything paints behind the page.`);
