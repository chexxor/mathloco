// okcolor.mjs — the colour arithmetic this repo states its bars in, in ONE place.
//
//   import { oklchFromRgb, oklchToRgb, ratioOf, dist, hueGap, BRANDS } from './okcolor.mjs';
//   node design/grill/okcolor.mjs --selftest      # the numbers the decisions cite, re-derived
//
// Why this exists: three probes each carried their own copy of the OKLab math — `design/color-survey.mjs`
// (the painted-byte census), `design/grill/round7-math.mjs` (the hue scan) and `design/brand-distance.mjs`
// (the brand-distance metric that produced gold's 0.135 bar, D88). Three copies of a colour transform is how
// a palette round ends up arguing with itself: a bar quoted as 4.82 from one file and 4.78 from another is a
// ruling nobody can re-check. The transform is also the one place where a silent bug is invisible, because
// every output still looks like a plausible ratio.
//
// So: this file is the single implementation, and `--selftest` re-derives the numbers the decisions quote and
// exits 1 if any of them drifts. Those expected values are the ones written in DESIGN.md and D88/D101/D116 —
// measured by the RENDERER (contrast-oracle / check:render), not by this file, so the tolerance is the same
// ±0.15 `ratify-check` uses: this arithmetic is allowed to be an approximation of the renderer, never a
// replacement for it (D101: colour decisions are computed by the renderer; a hand calc narrows the space).
//
// Two colour spaces, deliberately:
//   * OKLab / OKLCH (Björn Ottosson's transform, the one @theme writes its tokens in) for distance and hue;
//   * WCAG relative luminance on sRGB for the contrast bars, because that is what the oracle measures.
// Out-of-gamut is REPORTED, never silently clipped: a clipped channel is a colour a browser will gamut-map
// differently, so a clipped candidate is a bad candidate (round-7's lesson, kept from round7-math.mjs).

// ---------- sRGB <-> OKLab (Ottosson) ----------
export const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

// painted pixel (0..255) -> {L, C, h}: the census in color-survey.mjs reads chroma and hue this way.
export function oklchFromRgb(r, g, b) {
  const lin = [srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)];
  const l = Math.cbrt(0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]);
  const m = Math.cbrt(0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]);
  const s = Math.cbrt(0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const C = Math.hypot(A, B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

// painted pixel (0..255) -> OKLab [L, a, b] in the SAME units as labTriple() above (L in 0..1), which is the
// scale the 0.05 same-colour bar is stated in. Per-pixel work (a whole page's worth) wants the cartesian form:
// no atan2, no polar round-trip. The selftest asserts this agrees with dist() on the token pair.
export function oklabBytes(r, g, b) {
  const c = oklchFromRgb(r, g, b), h = (c.h * Math.PI) / 180;
  return [c.L, c.C * Math.cos(h), c.C * Math.sin(h)];
}
export const distLab = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// oklch triple -> {r,g,b} in 0..1 (and 0..255 on request), with the out-of-gamut flag set rather than hidden.
export function oklchToRgb(L, C, Hdeg) {
  const H = (Hdeg * Math.PI) / 180, A = C * Math.cos(H), B = C * Math.sin(H);
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const r = 4.0767416621 * l - 3.307718152 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6092572011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034118309 * m + 1.707614701 * s;
  const og = [r, g, b].some((v) => v < -0.001 || v > 1.001);
  const gam = (v) => Math.min(1, Math.max(0, v));
  const enc = (v) => { const c = gam(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
  const rgb = [enc(r), enc(g), enc(b)];
  return { r: rgb[0], g: rgb[1], b: rgb[2], og, lin: [r, g, b], bytes: rgb.map((v) => Math.round(v * 255)) };
}

// ---------- the token form the @theme block writes ----------
// `oklch(98.5% 0.006 85)` and `oklch(98.5% .006 85)` both parse; anything else throws, because a silently
// unparseable token would make a candidate table describe a colour the page does not paint.
export function parseOklch(spec) {
  const m = /^oklch\(\s*([\d.]+)%\s+([\d.]+|\.?[\d.]+)\s+(-?[\d.]+)\s*\)$/.exec(String(spec).trim());
  if (!m) throw new Error(`not an oklch() triple: ${spec}`);
  return { L: Number(m[1]), C: Number(m[2]), H: Number(m[3]), spec: String(spec).trim() };
}
export const asTriple = (v) => (typeof v === 'string' ? (v.startsWith('#') ? rgbTripleFromBytes(hex2rgb(v)) : parseOklch(v)) : v);
export function rgbTripleFromBytes([r, g, b]) {
  const { L, C, h } = oklchFromRgb(r, g, b);
  return { L: +(L * 100).toFixed(2), C: +C.toFixed(4), H: +h.toFixed(2), spec: `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}` };
}
export const tripleToBytes = (t) => oklchToRgb(t.L / 100, t.C, t.H).bytes;

// ---------- WCAG contrast (the bar the oracle measures: D101, D116) ----------
export function luminanceBytes([r, g, b]) {
  const f = (v) => srgbToLinear(v / 255);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export const contrastBytes = (a, b) => {
  const x = luminanceBytes(a), y = luminanceBytes(b);
  return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2));
};
// contrast between two triples (any mix of oklch() specs and hex), as the token table wants it
export const contrastTriple = (a, b) => contrastBytes(tripleToBytes(asTriple(a)), tripleToBytes(asTriple(b)));

// ---------- OKLab distance and hue gap (the metric D88's 0.135 bar and round 3b's 40° bar are stated in) ----------
export function labTriple(t) {
  const x = asTriple(t), H = (x.H * Math.PI) / 180;
  return [x.L / 100, x.C * Math.cos(H), x.C * Math.sin(H)];
}
export const dist = (a, b) => { const x = labTriple(a), y = labTriple(b); return +Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]).toFixed(3); };
export const polar = (t) => { const [L, A, B] = labTriple(t); return { L, C: Math.hypot(A, B), H: +(((Math.atan2(B, A) * 180) / Math.PI + 360) % 360).toFixed(1) }; };
export const hueGap = (a, b) => {
  let d = Math.abs(polar(a).H - polar(b).H) % 360;
  return Math.round(Math.min(d, 360 - d));
};

// The brand palette `design/brand-distance.mjs` measures against (D88's origin: "indigo and gold looks
// exactly like Amazon" is testable). Kept here so a candidate round and that file cannot disagree; the
// selftest asserts the two cited distances still come out.
export const BRANDS = {
  'Amazon navy #232F3E': '#232F3E', 'Amazon ink #141A24': '#141A24', 'Amazon orange #FF9900': '#FF9900',
  'Amazon yellow #FFB300': '#FFB300', 'Amazon deep orange #E47911': '#E47911', 'Amazon link blue #0066C3': '#0066C3',
  'IKEA blue #0051A5': '#0051A5', 'IKEA yellow #FFD100': '#FFD100',
  'Walmart blue #0071CE': '#0071CE', 'Walmart yellow #FFC220': '#FFC220',
  'BestBuy blue #0046BE': '#0046BE', 'UPS brown #351C15': '#351C15', 'UPS gold #FFB500': '#FFB500',
  'FedEx orange #FF6200': '#FF6200', 'PayPal deep blue #003081': '#003081', 'Stripe indigo #635BFF': '#635BFF',
  'Target red #CC0000': '#CC0000', 'eBay blue #0645D2': '#0645D2',
  'UMN maroon #98021E': '#98021E', 'UMN gold #FFCD0B': '#FFCD0B',
  'UCLA blue #00558C': '#00558C', 'UCLA gold #FFD100': '#FFD100',
  'Michigan maize #FFCB05': '#FFCB05', 'Michigan navy #00274C': '#00274C',
  'Berkeley blue #003262': '#003262', 'Caltech orange #FF6E00': '#FF6E00',
};
export const nearestBrand = (t, n = 3) =>
  Object.entries(BRANDS).map(([b, h]) => ({ brand: b, d: dist(t, h) })).sort((x, y) => x.d - y.d).slice(0, n);

// ---------- the bars, from DESIGN.md (D101 / D116) ----------
export const BARS = { text: 4.5, body: 7.0, graphic: 3.0, layer: 1.35, displayText: 3.0 };
// `brand-distance.mjs`'s own stated reading of delta-OKLab, used here as the separation bar for two things
// that must not read as the same colour (the mark's two lines, a new accent vs a role in use).
export const SAME_COLOUR_BAR = 0.05;

// ---------- the reserved-hue geometry (round 3b's >=40 degree rule) ----------
// Returns the bands a NEW hue is forbidden to sit in, and the windows that remain, for a set of reserved
// hues. Pure arithmetic on hue angles — no vision model, so the result is checkable by hand.
export function hueWindows(reserved, minGap = 40) {
  const banned = Object.entries(reserved).map(([name, t]) => {
    const h = polar(t).H;
    return { name, hue: h, from: (h - minGap + 360) % 360, to: (h + minGap) % 360, wraps: h + minGap >= 360 || h - minGap < 0 };
  });
  // walk the wheel in 1-degree steps and keep the runs that are in no banned band
  const inBan = (deg) => banned.find((b) => (b.wraps ? (deg >= b.from || deg <= b.to) : deg >= b.from && deg <= b.to));
  const free = [];
  for (let d = 0; d < 360; d++) if (!inBan(d)) free.push(d);
  // collapse into windows, wrapping the wheel once
  const windows = [];
  for (const d of free) {
    const last = windows[windows.length - 1];
    if (last && d === last.to + 1) last.to = d; else windows.push({ from: d, to: d });
  }
  if (windows.length > 1 && windows[0].from === 0 && windows[windows.length - 1].to === 359) {
    const tail = windows.pop();
    windows[0] = { from: tail.from, to: windows[0].to };
  }
  return {
    minGap, banned: banned.sort((a, b) => a.hue - b.hue),
    freeDegrees: free.length,
    windows: windows.map((w) => ({ ...w, width: ((w.to - w.from + 360) % 360) + 1 })).sort((a, b) => b.width - a.width),
  };
}

// ---------- selftest: the numbers the decisions quote, re-derived here ----------
if (process.argv.includes('--selftest')) {
  const css = (await import('node:fs')).readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');
  const tok = (name) => { const m = new RegExp(`--color-${name}:\\s*([^;/]+);`).exec(css); if (!m) throw new Error(`no --color-${name}`); return parseOklch(m[1].trim()); };
  const P = tok('paper'), I = tok('ink'), R = tok('rule'), G = tok('gold'), GI = tok('gold-on-ink'), BT = tok('band-text');
  const PD = tok('path-discord'), PDO = tok('path-discord-on-ink');
  const rows = [
    // [what, measured-here, expected (the value DESIGN.md / D116 / D88 quote), tolerance]
    ['ink on paper', contrastTriple(I, P), 12.02, 0.15],
    ['rule on paper', contrastTriple(R, P), 3.01, 0.06],
    ['gold on paper', contrastTriple(G, P), 4.82, 0.06],
    ['gold-on-ink on ink', contrastTriple(GI, I), 5.80, 0.15],
    ['band-text on ink', contrastTriple(BT, I), 10.19, 0.15],
    ['path-discord-on-ink on ink', contrastTriple(PDO, I), 4.59, 0.15],
    ['gold distance to Target red (D88: 0.135)', dist(G, '#CC0000'), 0.135, 0.005],
    ['ink distance to Amazon navy (round 7: 0.063)', dist(I, '#232F3E'), 0.063, 0.005],
    ['gold to path-discord hue gap (round 3b)', hueGap(G, PD), 27, 1],
    // the pixel-side helper must be the same metric as the token-side one, or a census and a contrast table
    // are measuring different things while both calling it 0.05
    // The tolerance is wider than the others on purpose: a rendered sRGB byte pair is not the authored
    // triple (gamut mapping + 8-bit quantisation), which is the round-9 lesson, so the two metrics are
    // allowed to differ by ~0.003 while still calling the same pair "the same colour" at 0.05.
    ['paper<->ink pixel distance == token distance',
     distLab(oklabBytes(...tripleToBytes(P)), oklabBytes(...tripleToBytes(I))), dist(P, I), 0.005],
  ];
  let bad = 0;
  for (const [what, got, want, tol] of rows) {
    const ok = Math.abs(got - want) <= tol;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what.padEnd(42)} here ${String(got).padStart(6)}  cited ${String(want).padStart(6)}  tol ±${tol}`);
  }
  // the arithmetic is a predictor, not the oracle: it must agree with the renderer within the tolerance, and
  // say so loudly when it does not (D101).
  console.log(bad ? `\n${bad} of ${rows.length} cited numbers do not reproduce — this file's arithmetic has drifted from the renderer.` : `\n${rows.length}/${rows.length} cited colour numbers reproduce from one implementation.`);
  process.exit(bad ? 1 : 0);
}
