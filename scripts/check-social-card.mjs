// Pixel checks for `public/book-club-social-share.jpg` — the image `og:image` / `twitter:card` point at.
// Shared by the generator (`npm run assets:social`, which checks what it just wrote) and the gate
// (`npm run check:social`, which checks the committed artifact with no firefox and no regeneration).
//
// Why painted bytes and not the recipe (D116): the card's colours are correct at author-syntax time and
// then get converted, gamut-mapped, quantised to 8 bits and JPEG-compressed. A card whose numbers are right
// in the source and wrong on the feed is a failed card. So this file never looks at the recipe: it reads the
// JPEG's pixels, clusters the ink in each band, and asserts what actually painted clears the bar. Nothing
// here is satisfied by "the composer mentioned a token" — an off-token hue that wanders into a text band
// fails, and so does a card that renders in a fallback face.
//
// What a share card is, design-wise: one screen of the site, shown at ~1200 in a feed and often a quarter
// that. So the checks are the site's checks — one dark band (D93), one display step per screen (D112), text
// at the 4.5 bar (D101), drawn marks at 3.0, paths named by word plus hue on the band (D106/D115), and the
// retired amber absent (D82/D88).
import fs from 'node:fs';
import sharp from 'sharp';
import { MARK, MARK_SHAPE_COUNT } from '../src/lib/brand-mark.mjs';

export const W = 1200;
export const H = 630;

// sRGB -> WCAG relative luminance, on bytes that were actually painted.
const lum = ([r, g, b]) => {
  const f = (v) => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const contrast = (a, b) => {
  const [L1, L2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (L1 + 0.05) / (L2 + 0.05);
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// hue angle and chroma straight off the bytes, for "is this the hue the grammar says it is".
const hueOf = ([r, g, b]) => {
  const m = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (m - mn < 6) return null;
  const d = m - mn;
  const deg = m === r ? ((g - b) / d) % 6 : m === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((deg * 60) + 360) % 360;
};
const chromaOf = (c) => (Math.max(...c) - Math.min(...c)) / 255;
// shortest way round the hue circle — a raw difference mod 360 reports 167 for a 13 degree gap
const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// The retired amber (`--color-book-theme`, #f59e0b): delta-OKLab 0.019 from Amazon orange, 2.06 as text on
// paper, asserted absent from @theme — and the published card used to paint it. Any appearance fails.
const RETIRED = [245, 158, 11];

// The drawn mark: the club's mark, in the hero and on the card. Its GEOMETRY lives in
// `src/lib/brand-mark.mjs` (the same table `src/components/HeroSection.astro` draws from), so this
// verifier and that composer cannot disagree about where the meeting point is. What lives here is only
// where the mark sits ON THE CARD, in canvas px — the one number that is the card's, not the mark's.
export const MOTIF = { left: 700, top: 190, width: 420, vbW: MARK.vbW, vbH: MARK.vbH };
const mscale = MOTIF.width / MOTIF.vbW;
const dotX = MOTIF.left + MARK.meet.x * mscale;   // the meeting point, from the mark table
const dotY = MOTIF.top + MARK.meet.y * mscale;
const dotR = MARK.dot.r * mscale;

// Bands to measure, in canvas px. The composer centres its runs inside these same boxes.
// min: text bar 4.5 (D101), graphic bar 3.0. washout 'fail' means that run has to survive a feed
// thumbnail, so a majority of its ink sitting under the bar is a failure rather than a note.
// words: runs inside this band that the path-hue grammar (D106) says must be a specific hue — checked
// against the hue the browser itself paints for the token that run asked for, so no hue is hardcoded here.
export const BANDS = [
  { name: 'kicker', y0: 76, y1: 100, min: 4.5 },
  { name: 'title', y0: 120, y1: 196, min: 4.5, washout: 'fail' },
  { name: 'lede', y0: 210, y1: 252, min: 4.5 },
  { name: 'invite', y0: 262, y1: 282, min: 4.5 },
  {
    // min 3.0 at band level because this row legitimately contains 1px hairline rules (`--color-rule`,
    // measured 4.00 on ink) whose bar is the graphic bar, not the text bar. Each word is held to 4.5
    // individually by the `words` pass below.
    name: 'paths', y0: 494, y1: 530, min: 3.0,
    words: ['path-meetup', 'path-discord', 'path-domain'],
  },
  { name: 'motif-dot', x0: Math.round(dotX - dotR - 5), x1: Math.round(dotX + dotR + 5), y0: Math.round(dotY - dotR - 5), y1: Math.round(dotY + dotR + 5), min: 3.0 },
  { name: 'motif-paths', x0: MOTIF.left + 8, x1: MOTIF.left + MOTIF.width - 8, y0: MOTIF.top + 8, y1: Math.round(MOTIF.top + MOTIF.vbH * mscale) - 8, min: 3.0 },
];

// Ink, for these purposes, is a pixel whose WCAG ratio against the ground is >= 2.0. An euclidean
// threshold was the first attempt and it lies on a dark ground: JPEG dithering 30 units off (4,7,4) is easy
// to hit, and the whole canvas then counts as ink.
const INK_RATIO = 2.0;

export async function checkCard(file, { page = null } = {}) {
  const lines = [];
  let ok = true;
  const fail = (m) => { ok = false; lines.push(`  FAIL  ${m}`); };
  const pass = (m) => lines.push(`  ok    ${m}`);
  const note = (m) => lines.push(`  NOTE  ${m}`);

  const img = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = img.info;
  const px = img.data;
  if (width !== W || height !== H) fail(`${width}x${height}, want ${W}x${H}`);
  else pass(`${width}x${height} ${channels}ch, ${Math.round(fs.statSync(file).size / 1024)} KB`);

  const at = (x, y) => {
    const i = (y * width + x) * channels;
    return [px[i], px[i + 1], px[i + 2]];
  };

  const scan = (x0, x1, y0, y1) => {
    const buckets = new Map();
    const inks = [];
    let seen = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const c = at(x, y);
      if (contrast(c, g) < INK_RATIO) continue;
      seen++;
      inks.push(c);
      const k = ((c[0] >> 3) << 16) | ((c[1] >> 3) << 8) | (c[2] >> 3);
      const e = buckets.get(k) ?? [0, 0, 0, 0];
      e[0] += c[0]; e[1] += c[1]; e[2] += c[2]; e[3]++;
      buckets.set(k, e);
    }
    const clusters = [...buckets.values()]
      .filter((e) => e[3] >= 5)
      .map((e) => { const c = [e[0] / e[3], e[1] / e[3], e[2] / e[3]]; return { c, n: e[3], ratio: contrast(c, g) }; })
      .sort((a, b) => b.n - a.n);
    const out = [];
    for (const bkt of clusters) {
      if (out.length >= 10) break;   // the paths band legitimately paints band-text, two service hues and
      if (out.some((cl) => dist(cl.c, bkt.c) < 40)) continue;   // the JPEG rings between them
      out.push(bkt);
    }
    return { seen, clusters: out, inks };
  };

  // ---- the ground. The card is one dark band (D93); if the modal colour is not dark, it is a photo again.
  // The bucket colour is the MEAN of its raw pixels — reconstructing it from the quantisation key is how
  // this check briefly read the ground as (4,7,4) on a file that was (32,57,38).
  const hist = new Map();
  let sampled = 0;
  for (let y = 0; y < height; y += 3) for (let x = 0; x < width; x += 3) {
    const c = at(x, y);
    const k = ((c[0] >> 3) << 16) | ((c[1] >> 3) << 8) | (c[2] >> 3);
    const e = hist.get(k) ?? [0, 0, 0, 0];
    e[0] += c[0]; e[1] += c[1]; e[2] += c[2]; e[3]++;
    hist.set(k, e);
    sampled++;
  }
  const win = [...hist.values()].sort((a, b) => b[3] - a[3])[0];
  const g = [win[0] / win[3], win[1] / win[3], win[2] / win[3]].map(Math.round);
  if (page?.painted?.ground) {
    const want = page.painted.ground;
    const d = Math.max(...g.map((v, i) => Math.abs(v - want[i])));
    if (d > 6) fail(`the card's ground is ${g.join(',')} but firefox painted ${want.join(',')} for that token (off by ${d}) — the PNG->JPEG step is changing colour`);
    else pass(`ground ${g.join(',')} is the token firefox painted (${want.join(',')}, off by ${d})`);
  }
  if (lum(g) > 0.25) fail(`the card's ground is light (${g.join(',')}), want a dark band`);
  else pass(`ground ${g.join(',')} — ${((win[3] / sampled) * 100).toFixed(0)}% of the canvas, luminance ${lum(g).toFixed(3)}`);

  // ---- retired amber, anywhere on the canvas.
  let amber = 0;
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) if (dist(at(x, y), RETIRED) < 28) amber++;
  if (amber) fail(`${amber} sampled pixel(s) within 28 of the retired amber #f59e0b`);
  else pass('no pixel near the retired amber (#f59e0b and its JPEG neighbourhood)');

  // ---- calibration for the drift test, from a control the card page plants: the same line asked for in a
  // family that does not exist. If this delta is small, the drift test cannot see a substitution at all.
  const probe = page?.runs?.find((r) => r.band === 'fallback-probe');
  const title = page?.runs?.find((r) => r.band === 'title');
  if (probe && title) {
    const d = Math.abs(probe.width - title.width);
    lines.push(`  ok    planted control: the same line in ${probe.face} measures ${probe.width}px vs ${title.width}px in ${title.face} — a substitution would move the run ${d}px`);
  }

  // ---- the ramp: one display step per screen (D112), and the card is one screen.
  const shown = (page?.runs ?? []).filter((r) => BANDS.some((b) => b.name === r.band));
  const big = shown.filter((r) => r.sizeInt >= 40);
  if (big.length !== 1) fail(`${big.length} runs at display size on the card (${big.map((r) => `${r.band} ${r.size}`).join(', ')}) — D112 allows one, and it belongs to the locator`);
  else if (big[0].band !== 'title') fail(`the display step is on ${big[0].band} — on the card the locator is the club's name`);
  else pass(`one display step (${big[0].size}, ${big[0].face} ${big[0].weight}) on the club name; the rest of the ramp: ${shown.filter((r) => r.band !== 'title').map((r) => `${r.band} ${r.size}`).join(', ')}`);

  // ---- every band.
  for (const b of BANDS) {
    const x0 = b.x0 ?? 0, x1 = b.x1 ?? width, y0 = b.y0, y1 = b.y1;
    const run = page?.runs?.find((r) => r.band === b.name);
    const { seen, clusters } = scan(x0, x1, y0, y1);
    if (seen < 30) { fail(`${b.name}: only ${seen} ink pixels in its box — the text did not render, or a webfont had not applied when the screenshot was taken`); continue; }
    if (!clusters.length) { fail(`${b.name}: no ink cluster big enough to read a colour off`); continue; }

    // Face-substitution check: the ink extent in the pixels vs the layout box the page reported. firefox
    // screenshots at load; if a webfont applies afterwards, the run is set in a fallback face at different
    // widths, and that is a wrong card that looks fine. Tolerance is 1.5% of the run, calibrated against
    // the planted control above (a real substitution moved that run 118px; anti-aliasing moves the ends by
    // 1-5px).
    if (run) {
      let rlo = Infinity, rhi = -Infinity;
      for (let y = y0; y < y1; y++) for (let x = Math.max(0, run.x0 - 6); x < Math.min(width, run.x1 + 6); x++) {
        if (contrast(at(x, y), g) >= INK_RATIO) { if (x < rlo) rlo = x; if (x > rhi) rhi = x; }
      }
      const shotW = rhi - rlo + 1, pageW = run.width || run.x1 - run.x0, drift = Math.abs(shotW - pageW);
      if (drift > Math.max(3, pageW * 0.015)) fail(`${b.name}: ink spans ${shotW}px, the page laid the run out at ${pageW}px (${run.face} ${run.size}/${run.weight}) — the screenshot is set in a different face than the layout, so it was taken before the webfont applied, or the run overflowed its box`);
      else pass(`${b.name}: ink ${shotW}px wide vs page run ${pageW}px in ${run.face} ${run.size}/${run.weight} (drift ${drift})`);
    }

    // Colour of the run. The cluster furthest from the ground is the run's own colour, because every
    // anti-aliased pixel is a blend between the run and the ground. Byte-identity against what firefox
    // painted for the token is asserted only where the type is big enough to contain fully-covered pixels:
    // measured on this card, 27.7px serif reaches it (off by 4) and 16px never does (strongest pixel 205,226,211
    // against a token that paints 228,233,229). Below 24px a byte assertion would measure stroke width, not
    // palette, so the pixel assertion there is contrast, and hue is checked where a hue exists.
    const fill = clusters.reduce((m, c) => (c.ratio > m.ratio ? c : m));
    const detail = clusters.map((cl) => `${cl.c.map((v) => v.toFixed(0)).join(',')} ${cl.ratio.toFixed(2)}${cl.c !== fill.c ? '' : ' <fill>'} (n${cl.n})`).join(' | ');
    if (page?.painted?.[b.name] && (run?.sizeInt ?? 0) >= 24) {
      const want = page.painted[b.name];
      const got = fill.c.map(Math.round);
      const d = Math.max(...got.map((v, i) => Math.abs(v - want[i])));
      if (d > 8) fail(`${b.name}: the strongest colour in the box is ${got.join(',')} but firefox painted ${want.join(',')} for the colour this run asked for (${run?.color}) — off by ${d}, so the screenshot and the JPEG disagree about colour`);
      else pass(`${b.name}: fill ${got.join(',')} is firefox's own paint for this run (${want.join(',')}, off by ${d})`);
    } else if (page?.painted?.[b.name]) {
      note(`${b.name}: ${run?.size} type never reaches full coverage — strongest pixel ${fill.c.map((v) => v.toFixed(0)).join(',')} vs the token's paint ${page.painted[b.name].join(',')}, so its colour is judged by contrast and hue, not bytes`);
    }
    if (fill.ratio < b.min) fail(`${b.name}: its strongest ink reads ${fill.ratio.toFixed(2)} against the ground — bar is ${b.min} [${detail}]`);
    else pass(`${b.name}: strongest ink ${fill.ratio.toFixed(2)} vs ground (bar ${b.min}) — ${detail}`);

    // Washout: the share of a run's ink that sits under the bar because of anti-aliasing. Failed only where
    // the design says the run has to survive a thumbnail.
    const weak = clusters.filter((cl) => cl.ratio < b.min).reduce((a, c) => a + c.n, 0);
    if (weak / seen > 0.5) {
      const msg = `${b.name}: ${((weak / seen) * 100).toFixed(0)}% of its ink sits below ${b.min} (partial coverage at ${run?.size ?? '?'} — anti-aliasing dominates this run)`;
      if (b.washout === 'fail') fail(msg + ' — this run has to survive the thumbnail');
      else note(msg);
    }

    // The path-hue grammar (D106): on a dark band, hue names the service. For each word the band declares,
    // the expected hue is the hue the browser itself paints for the colour that word asked for — nothing is
    // hardcoded — and the observed hue is the most chromatic ink in that word's own box.
    for (const w of b.words ?? []) {
      const wr = page?.runs?.find((r) => r.band === w);
      const wantBytes = page?.painted?.[w];
      if (!wr || !wantBytes) { fail(`${w}: the page reported no box or no painted colour for it — the band cannot be checked`); continue; }
      const wb = scan(Math.max(0, wr.x0 - 2), Math.min(width, wr.x1 + 2), y0, y1);
      if (wb.seen < 12) { fail(`${w}: only ${wb.seen} ink pixels in its own box — the word did not paint`); continue; }
      // Hue is read off the most chromatic PIXELS, not off the colour clusters: the cluster merge radius
      // (40 RGB units) deliberately folds JPEG ringing into the colour it reports, and measured here that is
      // exactly what moved a gold word's hue reading 43 degrees (gold core 195,174,134 merged into a
      // green-leaning 163,172,147 blend). Chroma-ordered means stay on the token's own side of the blend.
      const inks = wb.inks.sort((a, b2) => chromaOf(b2) - chromaOf(a));
      const top = inks.slice(0, Math.max(5, Math.round(inks.length * 0.05)));
      const mean = [0, 1, 2].map((i) => top.reduce((s, c) => s + c[i], 0) / top.length);
      const gotHue = hueOf(mean);
      const wantHue = hueOf(wantBytes);
      const brightest = wb.clusters.reduce((m, c) => (c.ratio > m.ratio ? c : m));
      if (gotHue === null || wantHue === null) { fail(`${w}: no chromatic ink to read a hue off (most chromatic pixel ${mean.map((v) => v.toFixed(0)).join(',')})`); continue; }
      const gap = hueGap(gotHue, wantHue);
      // Two-part contrast for a word, because painted pixels and colour pairs answer different questions:
      //   pair    - contrast(tokenPaint, ground) from the browser's own colour conversion. This is the D101
      //             bar, and it is what the palette has to satisfy.
      //   coverage- the brightest ink actually in the JPEG. Thin strokes at 19.2px never reach full
      //             coverage (measured: the Discord path's token pair is 4.60, the brightest painted pixel
      //             cluster is 4.27), so the pixel number is held to 85% of the pair — anti-aliasing is a
      //             rendering consequence, a wrong colour is a design error, and only the second one should
      //             fail. A gate that demanded 4.5 of the pixels here would be a gate that fails honest work.
      const pair = contrast(wantBytes, g);
      const msg = `${w}: asked for ${wr.color} (firefox paints ${wantBytes.join(',')}, hue ${wantHue.toFixed(0)} deg, pair ${pair.toFixed(2)}) — most chromatic ink ${mean.map((v) => v.toFixed(0)).join(',')} at hue ${gotHue.toFixed(0)} deg (gap ${gap.toFixed(0)}), brightest painted ink ${brightest.ratio.toFixed(2)}`;
      if (gap > 25) fail(`${msg} — a different hue than the path grammar says (D106)`);
      else if (pair < 4.5) fail(`${msg} — the token pair itself is under the 4.5 text bar (D101)`);
      else if (brightest.ratio < pair * 0.85) fail(`${msg} — brightest ink is under 85% of its own token pair (${(brightest.ratio / pair * 100).toFixed(0)}%), which is more washout than anti-aliasing explains`);
      else pass(msg);
    }
  }

  // ---- the drawn mark (D120): two failures live here and only a per-shape check tells them apart.
  //   missing shape   - an <svg> drops children it treats as foreign content, silently; measured on this
  //                     card (D118 lesson 1). The band-level ink measure would still pass, because one
  //                     painted path is enough ink in the box. So the DOM count is checked against
  //                     MARK_SHAPE_COUNT — the same table the hero's mark is drawn from.
  //   under the bar   - a shape painted under the 3.0 graphic bar (D101): a colour that clears paper and
  //                     not ink, or a token retune. The colour is the browser's own paint for the author
  //                     syntax that shape asked for (D116), compared against the JPEG's own ground.
  if (page?.mark) {
    if (page.mark.count !== MARK_SHAPE_COUNT) {
      fail(`the mark reports ${page.mark.count} shape(s) in the document, the geometry table has ${MARK_SHAPE_COUNT} — a shape went missing (SVG treats an unknown element's subtree as foreign content and drops it without a word, D118)`);
    } else pass(`mark "${page.mark.name}": ${page.mark.count}/${MARK_SHAPE_COUNT} shapes in the document, box ${page.mark.box.width}x${page.mark.box.height} at ${page.mark.box.x0},${page.mark.box.top}`);
    for (const s of page.mark.shapes ?? []) {
      const c = s.paintedStroke ?? s.paintedFill;
      if (!c) { fail(`mark shape <${s.tag}>: neither stroke (${s.stroke}) nor fill (${s.fill}) painted — the shape is invisible`); continue; }
      const r = contrast(c, g);
      const chan = s.paintedStroke ? 'stroke' : 'fill';
      const at = `${s.tag} ${s.strokeWidth} units, ${chan}`;
      if (r < 3.0) fail(`mark shape <${at}>: ${c.join(',')} reads ${r.toFixed(2)} against the ground, under the 3.0 graphic bar (D101) — asked for stroke ${s.stroke}, fill ${s.fill}`);
      else pass(`mark shape <${at}>: ${c.join(',')} at ${r.toFixed(2)} vs ground (bar 3.0)`);
    }
  } else {
    note('the page report carries no mark — shape count and per-shape contrast are SKIPPED (run npm run assets:social to make one)');
  }

  return { ok, lines, ground: g, bytes: fs.statSync(file).size };
}

// A gate that cannot fail is a gate that quietly stops working, so these synthetic cards are checked the
// same way the real one is. Most cases are built from pixels (sharp) rather than from the composer; the
// two mark cases and the hue case doctor the generator's page report instead, because those assertions are
// about what the document claimed. Each case must come back FAIL with the named reason.
// `npm run check:social:selftest`.
export async function selfTest() {
  const flat = async (file, rgb) => { await sharp({ create: { width: W, height: H, channels: 3, background: rgb } }).jpeg().toFile(file); };
  const cases = [];
  const made = [];   // unlinked at the end, not per case: cases 3 and 4 read the same blank card
  const tmp = (n) => `.design/tmp-card-${n}.jpg`;

  // 1. the retired amber, painted on purpose.
  const amberFile = tmp('amber');
  await sharp({ create: { width: W, height: H, channels: 3, background: [32, 57, 38] } })
    .composite([{ input: await sharp({ create: { width: 300, height: 60, channels: 3, background: [245, 158, 11] } }).jpeg().toBuffer(), left: 100, top: 100 }])
    .jpeg().toFile(amberFile);
  made.push(amberFile);
  cases.push(['painted amber', amberFile, null, /retired amber/]);

  // 2. a light ground: the card is one dark band (D93), so this must fail even though it is perfectly legible.
  const lightFile = tmp('light');
  await flat(lightFile, [250, 249, 245]);
  made.push(lightFile);
  cases.push(['light ground', lightFile, null, /ground is light|only 0 ink pixels|want a dark band/]);

  // 3. a run that never painted: the page claims a box in the right place, the pixels show nothing there.
  const blankFile = tmp('blank');
  await flat(blankFile, [32, 57, 38]);
  made.push(blankFile);
  const blankPage = {
    painted: { ground: [32, 57, 39], title: [228, 233, 229] },
    runs: [{ band: 'title', x0: 70, x1: 846, width: 776, sizeInt: 57.3, face: 'Public Sans Variable', size: '57.3px', weight: '800', color: 'oklch(0.93 0.008 152)' }],
  };
  cases.push(['title box with no ink in it', blankFile, blankPage, /only 0 ink pixels|no ink pixels in its box/]);

  // 4. two display steps on one card (D112). Page-side, so the pixels do not matter for this assertion.
  const twoRamp = {
    painted: { ground: [32, 57, 39], title: [228, 233, 229], kicker: [228, 233, 229] },
    runs: [
      { band: 'kicker', x0: 70, x1: 203, width: 133, sizeInt: 57.3, face: 'Public Sans Variable', size: '57.3px', weight: '800', color: 'oklch(0.93 0.008 152)' },
      { band: 'title', x0: 70, x1: 846, width: 776, sizeInt: 57.3, face: 'Public Sans Variable', size: '57.3px', weight: '800', color: 'oklch(0.93 0.008 152)' },
    ],
  };
  cases.push(['two runs at display size', blankFile, twoRamp, /display step|display size on the card/]);

  // 5. the subtlest check of all: a path word painted in the wrong hue. Needs the real card's pixels and the
  // page report the generator left behind (design/card-page.json), because the assertion is "the ink in
  // this word's box is the hue the browser paints for the token that word asked for". The page object is
  // doctored so the word claims a hue the pixels do not show.
  const reportFile = 'design/card-page.json';
  if (!fs.existsSync(reportFile)) {
    ok = false;
    lines.push('  FAIL  selftest "wrong path hue": no design/card-page.json — run `npm run assets:social` first; without the page report this assertion cannot be exercised at all');
  } else {
    const real = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const wrongHue = JSON.parse(JSON.stringify(real));
    const word = (wrongHue.painted['path-discord'] = [70, 95, 205]);   // blurple, not the token's red-orange
    cases.push(['path word in the wrong hue', 'public/book-club-social-share.jpg', wrongHue, /different hue than the path grammar/]);
    void word;

    // 6. a mark shape missing from the document. This is the failure mode that produced D118 lesson 1: SVG
    // treats an unknown element's subtree as foreign content and drops it without a word, and every
    // box-level ink measure stays green because one painted path is enough ink in the box.
    if (!real.mark) { console.error('the page report has no mark — selftest 6/7 cannot be exercised'); }
    else {
      const dropped = JSON.parse(JSON.stringify(real));
      dropped.mark.shapes = dropped.mark.shapes.slice(0, MARK_SHAPE_COUNT - 1);
      dropped.mark.count = dropped.mark.shapes.length;
      cases.push(['mark missing a shape', 'public/book-club-social-share.jpg', dropped, /shape went missing/]);

      // 7. a mark shape painted under the graphic bar (3.0, D101). Same box, same count, same everything —
      // one stroke's colour moved a hair towards the ground. Pixels alone cannot see which shape did it.
      const faint = JSON.parse(JSON.stringify(real));
      faint.mark.shapes[0].paintedStroke = [46, 62, 50];      // ~1.1 against the card's ink ground
      cases.push(['mark shape under the graphic bar', 'public/book-club-social-share.jpg', faint, /under the 3.0 graphic bar/]);
    }
  }

  const lines = [];
  let ok = true;
  for (const [name, file, page, want] of cases) {
    const r = await checkCard(file, { page });
    const hit = r.lines.filter((l) => l.includes('FAIL'));
    const matched = hit.some((l) => want.test(l));
    if (!hit.length) { ok = false; lines.push(`  FAIL  selftest "${name}": the card came back CLEAN — this check cannot fail, so it is not a check`); }
    else if (!matched) { ok = false; lines.push(`  FAIL  selftest "${name}": failed, but not for the reason designed for (${want}): ${hit[0]}`); }
    else lines.push(`  ok    selftest "${name}": fails as designed — ${hit.find((l) => want.test(l)).slice(6, 130)}`);
  }
  for (const f of made) { try { fs.unlinkSync(f); } catch {} }
  return { ok, lines };
}

// `npm run check:social` - the committed artifact only. No firefox, no regeneration, ~1s.
if (process.argv[1] && process.argv[1].endsWith('check-social-card.mjs')) {
  if (process.argv.includes('--selftest')) {
    const r = await selfTest();
    console.log('\n== can these checks fail? (synthetic cards) ==');
    console.log(r.lines.join('\n'));
    if (!r.ok) { console.error('SELFTEST: FAIL'); process.exit(1); }
    console.log('SELFTEST: PASS');
    process.exit(0);
  }
  const file = process.argv[2] ?? 'public/book-club-social-share.jpg';
  // The page report the generator left behind (design/card-page.json) is what makes the offline gate
  // stronger than "no amber, and the ink is bright": the colour-pair and path-hue assertions need to know
  // what colour each run asked for. Without it those assertions are skipped, so the absence is reported.
  let page = null;
  if (fs.existsSync('design/card-page.json')) page = JSON.parse(fs.readFileSync('design/card-page.json', 'utf8'));
  const stale = page && fs.statSync(file).mtimeMs > fs.statSync('design/card-page.json').mtimeMs + 1000;
  const r = await checkCard(file, { page });
  console.log(page ? (stale ? '\n  NOTE  design/card-page.json is older than the JPEG - the colour-pair and hue assertions may describe a different card. Re-run npm run assets:social.' : '\n  page report: design/card-page.json (colour pairs and path hues are asserted)') : '\n  NOTE  no design/card-page.json - colour-pair and path-hue assertions are SKIPPED. Run npm run assets:social to make one.');
  console.log(`\n== painted pixels of ${file} ==`);
  console.log(r.lines.join('\n'));
  if (!r.ok) { console.error('SOCIAL CARD: FAIL'); process.exit(1); }
  console.log('SOCIAL CARD: PASS');
}
