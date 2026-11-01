// round7-math.mjs - the arithmetic behind the PATTERNS round (empty / error / freshness / status / shadow).
//
// Two rungs, deliberately:
//   * this file does the SEARCHING (hue maps, alpha solves, gap arithmetic) with the hand oklab math,
//     which D101 measured agrees with the renderer to ~0.1 ratio points - enough to narrow a space;
//   * every number that ends up IN A DECISION is then re-measured by the renderer oracle
//     (contrast-oracle.mjs + contrast/cfg-r7.json), because oklch->sRGB gamut mapping is not in this file.
// Anything printed here that is also quoted in round-7.html is tagged RECHECK-IN-RENDERER.
//
//   node .design/grill/round7-math.mjs
const hex2oklab = (h) => {
  const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  let l = v[0] * 0.4122214708 + v[1] * 0.5363325363 + v[2] * 0.0514459929;
  let m = v[0] * 0.2119034982 + v[1] * 0.6806995451 + v[2] * 0.1073969566;
  let s = v[0] * 0.0883024619 + v[1] * 0.2817188376 + v[2] * 0.6299787005;
  l = Math.cbrt(l); m = Math.cbrt(m); s = Math.cbrt(s);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
};
// oklch -> linear sRGB. out-of-gamut is reported, not silently clipped: a clipped channel is a colour
// a browser will gamut-map differently, so a clipped candidate is a bad candidate.
function oklch2rgb(L, C, Hdeg) {
  const H = Hdeg * Math.PI / 180, A = C * Math.cos(H), B = C * Math.sin(H);
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B, m_ = L - 0.1055613458 * A - 0.0638541728 * B, s_ = L - 0.0894841775 * A - 1.291485548 * B;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const r = 4.0767416621 * l - 3.307718152 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6092572011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034118309 * m + 1.707614701 * s;
  const og = [r, g, b].some((v) => v < -0.001 || v > 1.001);
  const gam = (v) => { const c = Math.min(1, Math.max(0, v)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
  return { r: gam(r), g: gam(g), b: gam(b), og, lin: [r, g, b] };
}
const lumRGB = (c) => 0.2126 * (c.r <= 0.04045 ? c.r / 12.92 : ((c.r + 0.055) / 1.055) ** 2.4)
                    + 0.7152 * (c.g <= 0.04045 ? c.g / 12.92 : ((c.g + 0.055) / 1.055) ** 2.4)
                    + 0.0722 * (c.b <= 0.04045 ? c.b / 12.92 : ((c.b + 0.055) / 1.055) ** 2.4);
const ok = (L, C, H) => oklch2rgb(L / 100, C, H);
const ratio = (a, b) => { const x = lumRGB(a), y = lumRGB(b); const hi = Math.max(x, y), lo = Math.min(x, y); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

// ---- ratified roles (round 4 / round 6, as written in .design/grill/round-6.html) ----
const R = {
  paper: { L: 98.5, C: 0.006, H: 85 }, panel: { L: 97, C: 0.008, H: 85 }, ink: { L: 32, C: 0.045, H: 152 },
  ink2: { L: 45, C: 0.035, H: 152 }, ink3: { L: 52, C: 0.028, H: 152 }, rule: { L: 65.5, C: 0.03, H: 152 },
  goldInk: { L: 55, C: 0.12, H: 62 }, band: { L: 32, C: 0.045, H: 152 }, bandText: { L: 93, C: 0.008, H: 152 },
};
const col = (r) => ok(r.L, r.C, r.H);
const PAPER = col(R.paper), INK = col(R.ink);
const hueGap = (a, b) => { let d = Math.abs(a - b) % 360; return Math.round(Math.min(d, 360 - d)); };
const polar = ([L, A, B]) => ({ L, C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 });
const labOf = (c) => (typeof c === 'string' && c.startsWith('#')) ? hex2oklab(c) : (() => {
  const H = c.H * Math.PI / 180; return [c.L / 100, c.C * Math.cos(H), c.C * Math.sin(H)]; })();
const dist = (a, b) => { const x = labOf(a), y = labOf(b); return +Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]).toFixed(3); };

const brands = {
  'Amazon orange #FF9900': '#FF9900', 'Amazon yellow #FFB300': '#FFB300', 'Amazon deep orange #E47911': '#E47911',
  'Amazon navy #232F3E': '#232F3E', 'Amazon link blue #0066C3': '#0066C3',
  'IKEA blue #0051A5': '#0051A5', 'IKEA yellow #FFD100': '#FFD100',
  'Walmart blue #0071CE': '#0071CE', 'Walmart yellow #FFC220': '#FFC220',
  'BestBuy blue #0046BE': '#0046BE', 'UPS brown #351C15': '#351C15', 'UPS gold #FFB500': '#FFB500',
  'FedEx orange #FF6200': '#FF6200', 'PayPal deep blue #003081': '#003081', 'Stripe indigo #635BFF': '#635BFF',
  'Target red #CC0000': '#CC0000', 'eBay blue #0645D2': '#0645D2',
  'UMN maroon #98021E': '#98021E', 'UMN gold #FFCD0B': '#FFCD0B', 'UCLA blue #00558C': '#00558C',
  'Michigan maize #FFCB05': '#FFCB05', 'Berkeley blue #003262': '#003262', 'Caltech orange #FF6E00': '#FF6E00',
  'Error-red web default #DC2626': '#DC2626', 'Facebook blue #1877F2': '#1877F2', 'Discord blurple #5865F2': '#5865F2',
};

// =====================================================================
// A. IS THERE A LEGAL SIGNAL HUE?  (for a warning / failure colour)
//    Bars: 4.5 as text on paper, 3.0 as a keyline on paper, in-gamut at C,
//    >= 40deg from ink(152) gold(62) and every path hue (205 315 35 105),
//    and >= 0.05 delta-OKLab from every brand colour (D88's mechanism).
// =====================================================================
const anchors = { ink: 152, gold: 62, cyan: 205, plum: 315, coral: 35, olive: 105 };
console.log('=== A. signal-hue scan: for each hue, the lightest L nearest 52 that clears 4.5 on paper ===');
console.log('hue  C     L    rendered  text  keyline  out-of-gamut  nearest brand (delta)  min hue gap to a role/hue in use');
const scan = [];
for (let H = 0; H < 360; H += 5) {
  for (const C of [0.15, 0.10, 0.06]) {
    let best = null;
    for (let L = 30; L <= 75; L += 0.5) {
      const c = ok(L, C, H);
      if (c.og) continue;
      if (ratio(c, PAPER) >= 4.5 && (!best || Math.abs(L - 52) < Math.abs(best.L - 52))) best = { L, c };
    }
    if (!best) continue;
    const cand = { L: best.L, C, H };
    const gaps = Object.entries(anchors).map(([k, h]) => [k, hueGap(H, h)]);
    const minGap = Math.min(...gaps.map((g) => g[1]));
    const near = Object.entries(brands).map(([n, h]) => [n, dist(cand, h)]).sort((x, y) => x[1] - y[1])[0];
    scan.push({ H, C, ...cand, hexv: hex(best.c), text: ratio(best.c, PAPER), key: ratio(best.c, PAPER), minGap, near });
    if (minGap >= 40 && near[1] >= 0.05) {
      console.log(`${String(H).padStart(3)}  ${C.toFixed(2)}  ${String(best.L).padStart(4)}  ${best.c ? hex(best.c) : ''}  ${ratio(best.c, PAPER).toFixed(2)}   (text 4.5 met)   in-gamut      ${near[1].toFixed(3)} ${near[0].padEnd(30)} ${minGap}deg (${gaps.sort((a, b) => a[1] - b[1])[0][0]})  <<< LEGAL`);
    }
  }
}
console.log('\n--- the hues a naive designer would reach for, measured against the same bars ---');
for (const [name, c] of [['failure red hue 25 C .15', { L: 52, C: 0.15, H: 25 }], ['failure red hue 5 C .15', { L: 52, C: 0.15, H: 5 }], ['failure red hue 355 C .15', { L: 52, C: 0.15, H: 355 }], ['warning amber hue 70 C .14', { L: 52, C: 0.14, H: 70 }], ['signal plum hue 300 C .13', { L: 48, C: 0.13, H: 300 }], ['signal teal hue 195 C .11', { L: 48, C: 0.11, H: 195 }], ['shipped Tailwind red-600', { L: 57.7, C: 0.245, H: 27.325 }], ['gold-ink (already in the system)', R.goldInk], ['ink (already in the system)', R.ink], ['rule (already in the system)', R.rule]]) {
  const cRGB = ok(c.L, c.C, c.H);
  const gaps = Object.entries(anchors).map(([k, h]) => [k, hueGap(c.H, h)]).sort((a, b) => a[1] - b[1]);
  const near = Object.entries(brands).map(([n, h]) => [n, dist(c, h)]).sort((x, y) => x[1] - y[1])[0];
  console.log(`${name.padEnd(32)} L${String(c.L).padStart(5)} C${c.C.toFixed(3)} H${String(Math.round(c.H)).padStart(3)}  ${hex(cRGB)}  text-on-paper ${ratio(cRGB, PAPER).toFixed(2)}${cRGB.og ? '  OUT-OF-GAMUT' : ''}  min hue gap ${String(gaps[0][1]).padStart(3)}deg (${gaps[0][0]})  nearest brand ${near[1].toFixed(3)} ${near[0]}`);
}

// =====================================================================
// B. SHADOWS: does a shadow cross the 1.35 LAYER bar round 6 established?
//    A shadow is a translucent fill composited on the ground it falls on, so the
//    `layer` arithmetic applies unchanged.
// =====================================================================
console.log('\n=== B. shadow arithmetic (layer bar 1.35 vs the ground it sits on) ===');
// channels are 0..1 throughout, because ratio()/hex() both expect 0..1
const comp = (top, onto) => ({
  r: top.r * top.a + onto.r * (1 - top.a),
  g: top.g * top.a + onto.g * (1 - top.a),
  b: top.b * top.a + onto.b * (1 - top.a),
});
const PAPER255 = { r: 250 / 255, g: 248 / 255, b: 246 / 255 };  // paper oklch(98.5% .006 85) renders #fcfaf6 (round-6 oracle)
const BLACK = { r: 0, g: 0, b: 0 };
const inkHex = hex(col(R.ink));                // the ink colour, for an ink-tinted shadow
const inkRGB = col(R.ink);
function needAlpha(inkC, ground, bar = 1.35) {
  for (let a = 0.01; a <= 1; a += 0.005) {
    const c = comp({ ...inkC, a }, ground);
    if (ratio(c, ground) >= bar) return +a.toFixed(3);
  }
  return null;
}
for (const [nm, ic] of [['black', BLACK], [`ink ${inkHex}`, inkRGB]]) {
  console.log(`${nm} shadow on paper: alpha needed at the contact edge to read as a LAYER (1.35) = ${needAlpha(ic, PAPER255)}`);
}
const shipped = [['shadow-lg stop 1 (Tailwind v4, 0 10px 15px -3px #0000001a)', 0x1a / 255], ['shadow-md stop 1 (0 4px 6px -1px #0000001a)', 0x1a / 255], ['hover:shadow-lg, same alpha', 0x1a / 255]];
for (const [nm, a] of shipped) {
  const c = comp({ ...BLACK, a }, PAPER255);
  console.log(`SHIPPED ${nm.padEnd(52)} alpha ${a.toFixed(3)}  composite ${hex(c)}  layer vs paper ${ratio(c, PAPER255)}  verdict ${ratio(c, PAPER255) >= 1.35 ? 'LAYERED' : 'FLAT (decoration)'}`);
}
for (const a of [0.10, 0.16, 0.22, 0.30, 0.38]) {
  const cB = comp({ ...BLACK, a }, PAPER255), cI = comp({ ...inkRGB, a }, PAPER255);
  console.log(`  alpha ${a.toFixed(2)}  black -> ${hex(cB)} layer ${ratio(cB, PAPER255)}   ink-tinted -> ${hex(cI)} layer ${ratio(cI, PAPER255)}  ink-text-on-it ${ratio(col(R.ink), cI)}`);
}
console.log('  (a shadow that DOES clear 1.35 at its contact edge is a ~30% black band - that is a hard edge, not an elevation.)');

// =====================================================================
// C. NOTICE HEIGHT ARITHMETIC - the notice is a container, but it must still
//    sit on the 4px grid so a stack of notices lines up with the 32/40/48 ladder.
//    height = snapped line box + 2 x an S3 pad (D98, unchanged).
// =====================================================================
console.log('\n=== C. notice container heights from the same arithmetic as D98 ===');
const S3 = [4, 8, 12, 16, 24, 32, 48, 64];
const lineBox = (px, lh) => Math.ceil((px * lh) / 4) * 4;
const ramp = { 's-1 13.3': [13.3, 1.2], 's0 16': [16, 1.5], 's1 19.2': [19.2, 1.4] };
for (const [nm, [fs, lh]] of Object.entries(ramp)) {
  const lb = lineBox(fs, lh);
  console.log(`${nm.padEnd(10)} line box ${lb}  ->  heights ${S3.map((p) => lb + 2 * p).join(', ')}`);
}
console.log('  a two-line notice body (2 x 24) = 48 + 2 pads: ' + S3.map((p) => 48 + 2 * p).join(', '));

// =====================================================================
// D. FRESHNESS: what may a staleness notice CLAIM, on the real feed shape?
//    Real dates harvested 2026-10-30 (D90): 2026-11-07T18:00Z, 2026-11-12T00:00Z,
//    2026-11-21T18:00Z, 2026-11-26T00:00Z - and Mobilizon's public feed is upcoming-only.
// =====================================================================
console.log('\n=== D. gap arithmetic on the four real harvested dates (D90) ===');
const dates = ['2026-11-07T18:00Z', '2026-11-12T00:00Z', '2026-11-21T18:00Z', '2026-11-26T00:00Z'].map((s) => Date.parse(s));
const days = (ms) => Math.round(ms / 86400000);
const gaps = dates.slice(1).map((d, i) => days(d - dates[i]));
for (let i = 0; i < gaps.length; i++) console.log(`  gap ${i + 1}: ${gaps[i]} days`);
console.log(`  largest gap in this sample: ${Math.max(...gaps)} days; spread of the whole visible month: ${days(dates.at(-1) - dates[0])} days`);
for (const t of [7, 10, 14, 21, 30]) console.log(`  a "nothing scheduled within ${t} days" claim would have to appear on ${gaps.filter((g) => g > t).length} of ${gaps.length} real gaps in this one real month`);
console.log('  (the feed is upcoming-only, so "the newest event date is in the past" IS computable at build time; "how long since the last pull" is NOT computable in a prerendered page at all.)');
