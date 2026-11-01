import { readFileSync } from 'node:fs';
// Palette candidate arithmetic for design-grill round 2.
// Every role pair is measured with WCAG relative-luminance math through OKLCH -> linear sRGB,
// so "this colour is allowed here" is a number, not a taste claim.
const parse = (s) => {
  const o = s.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+(-?[\d.]+)\s*\)$/);
  if (o) {
    const L = parseFloat(o[1]) / 100, C = parseFloat(o[2]), H = parseFloat(o[3]) * Math.PI / 180;
    const a = C * Math.cos(H), b = C * Math.sin(H);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const sb = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.307718152 * m + 0.2309699292 * sb,
            -1.2684380046 * l + 2.6092572011 * m - 0.3413193965 * sb,
            -0.0041960863 * l - 0.7034118309 * m + 1.707614701 * sb];
  }
  const h = s.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (h) {
    let v = h[1]; if (v.length === 3) v = v.split('').map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  }
  throw new Error('unparsable: ' + s);
};
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const ratio = (a, b) => { const x = lum(parse(a)), y = lum(parse(b)); const [hi, lo] = x > y ? [x, y] : [y, x]; return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };

// gamut check: OKLCH outside sRGB renders as a clipped, flatter colour — worth knowing before
// a token is ratified.
// How far outside sRGB a token sits. A token that is out of gamut renders clipped and flatter
// than the number in the token, so this belongs next to the token, not hidden.
const gamutExcess = (s) => {
  const c = parse(s);
  return +Math.max(...c.map((v) => Math.max(0, -v, v - 1))).toFixed(3);
};
const inGamut = (s) => gamutExcess(s) <= 0.002;

const P1 = {
  paper:      'oklch(98.5% 0.006 85)',
  paperTint:  'oklch(96% 0.012 85)',
  ink:        'oklch(24% 0.02 265)',
  inkSoft:    'oklch(45% 0.02 265)',
  primary:    'oklch(55% 0.13 62)',
  primaryTint:'oklch(95% 0.035 75)',
  pathTeal:   'oklch(50% 0.11 190)',
  pathTealBg: 'oklch(95% 0.03 190)',
  pathPlum:   'oklch(47% 0.15 305)',
  pathPlumBg: 'oklch(95% 0.035 305)',
  pathRose:   'oklch(50% 0.15 25)',
  pathRoseBg: 'oklch(95% 0.035 25)',
  pathGrass:  'oklch(48% 0.11 150)',
  pathGrassBg:'oklch(95% 0.03 150)',
  band:       'oklch(23% 0.02 265)',
};
const P2 = { // chalkboard: one warm accent on a dark ground, cool neutral elsewhere
  paper:      'oklch(98% 0.008 80)',
  ink:        'oklch(25% 0.02 90)',
  primary:    'oklch(56% 0.13 65)',
  primaryTint:'oklch(95% 0.04 75)',
  chalk:      'oklch(93% 0.02 80)',
  board:      'oklch(30% 0.03 190)',
  pathTeal:   'oklch(48% 0.10 195)',
};
const P3 = { // today, disciplined: single blue, darkened until it clears AA
  paper:      'oklch(98.5% 0.002 247)',
  ink:        'oklch(21% 0.034 265)',
  primary:    'oklch(48% 0.16 255)',
  primaryTint:'oklch(95% 0.03 250)',
  amberLegacy:'#f59e0b',
};

const rows = [
  ['P1', 'ink on paper', P1.ink, P1.paper, 4.5],
  ['P1', 'inkSoft on paper', P1.inkSoft, P1.paper, 4.5],
  ['P1', 'primary as ink on paper', P1.primary, P1.paper, 4.5],
  ['P1', 'primary as ink on its tint', P1.primary, P1.primaryTint, 4.5],
  ['P1', 'ink on primary surface', P1.ink, P1.primary, 4.5],
  ['P1', 'paper on band', P1.paper, P1.band, 4.5],
  ['P1', 'primary on band', P1.primary, P1.band, 3],
  ['P1', 'pathTeal ink on paper', P1.pathTeal, P1.paper, 4.5],
  ['P1', 'pathTeal ink on its tint', P1.pathTeal, P1.pathTealBg, 4.5],
  ['P1', 'pathPlum ink on paper', P1.pathPlum, P1.paper, 4.5],
  ['P1', 'pathPlum ink on its tint', P1.pathPlum, P1.pathPlumBg, 4.5],
  ['P1', 'pathRose ink on paper', P1.pathRose, P1.paper, 4.5],
  ['P1', 'pathRose ink on its tint', P1.pathRose, P1.pathRoseBg, 4.5],
  ['P1', 'pathGrass ink on paper', P1.pathGrass, P1.paper, 4.5],
  ['P1', 'pathGrass ink on its tint', P1.pathGrass, P1.pathGrassBg, 4.5],
  ['P1', 'two path tints side by side (non-text 3.0)', P1.pathTealBg, P1.pathPlumBg, 3],
  ['P2', 'ink on paper', P2.ink, P2.paper, 4.5],
  ['P2', 'primary as ink on paper', P2.primary, P2.paper, 4.5],
  ['P2', 'ink on primary surface', P2.ink, P2.primary, 4.5],
  ['P2', 'chalk on board', P2.chalk, P2.board, 4.5],
  ['P2', 'primary on board', P2.primary, P2.board, 3],
  ['P2', 'pathTeal on paper', P2.pathTeal, P2.paper, 4.5],
  ['P3', 'ink on paper', P3.ink, P3.paper, 4.5],
  ['P3', 'primary as ink on paper', P3.primary, P3.paper, 4.5],
  ['P3', 'paper on primary', P3.paper, P3.primary, 4.5],
  ['P3', 'primary ink on tint', P3.primary, P3.primaryTint, 4.5],
  ['today', 'legacy amber as ink on white (shipped ::selection uses white on it)', '#f59e0b', '#ffffff', 4.5],
  ['today', 'white on legacy amber', '#ffffff', '#f59e0b', 4.5],
  ['today', 'ink on legacy amber', '#1a1a1c', '#f59e0b', 4.5],
  ['today', 'green-500 checkmark on white (measured 2.26)', 'oklch(72.3% 0.219 149.579)', '#ffffff', 3],
  ['today', 'blue-600 on blue-100 (measured 4.31)', 'oklch(54.6% 0.245 262.881)', 'oklch(93.2% 0.032 255.585)', 4.5],
];

const P = { ...P1, ...P2, ...P3 };
console.log('palette                                  role                                             ratio  need  verdict  inGamut');
for (const [pal, role, fg, bg, need] of rows) {
  const r = ratio(fg, bg);
  console.log(`${pal.padEnd(7)} ${role.padEnd(48)} ${String(r).padStart(6)}  ${need}   ${(r >= need ? 'PASS' : 'FAIL').padEnd(6)} ${inGamut(fg) && inGamut(bg) ? 'yes' : 'NO'}`);
}

const P4 = { // brass & slate: an instrument, not a manuscript
  paper: 'oklch(98% 0.004 240)', ink: 'oklch(26% 0.02 250)', inkSoft: 'oklch(48% 0.02 250)',
  primary: 'oklch(58% 0.11 80)', primaryTint: 'oklch(95% 0.03 85)', slate: 'oklch(45% 0.05 250)',
};
const P5 = { // gold brand + vermilion marginalia (annotation, cancellation, correction)
  paper: 'oklch(98.5% 0.006 85)', ink: 'oklch(24% 0.02 265)',
  goldInk: 'oklch(55% 0.13 62)', goldFloor: '#f59e0b',
  vermilion: 'oklch(52% 0.17 25)', vermilionTint: 'oklch(95% 0.035 25)',
};
const Q = { ...P4 };
const R = P5;
const more = [
  ['C', 'ink on paper (cool)', P4.ink, P4.paper, 4.5],
  ['C', 'inkSoft on paper', P4.inkSoft, P4.paper, 4.5],
  ['C', 'brass as ink on paper', P4.primary, P4.paper, 4.5],
  ['C', 'ink on brass floor', P4.ink, P4.primary, 4.5],
  ['C', 'brass on brass tint', P4.primary, P4.primaryTint, 4.5],
  ['C', 'slate as ink on paper', P4.slate, P4.paper, 4.5],
  ['D', 'gold as ink on paper', R.goldInk, R.paper, 4.5],
  ['D', 'ink on gold floor', R.ink, R.goldFloor, 4.5],
  ['D', 'vermilion as ink on paper', R.vermilion, R.paper, 4.5],
  ['D', 'vermilion as ink on its tint', R.vermilion, R.vermilionTint, 4.5],
  ['D', 'ink on vermilion floor', R.ink, R.vermilion, 4.5],
  ['D', 'gold on ink (band)', R.goldInk, R.ink, 3],
  ['D', 'goldFloor as band vs paper (non-text 3.0)', R.goldFloor, R.paper, 3],
  ['D', 'goldInk vs vermilionTint', R.goldInk, R.vermilionTint, 4.5],
];
for (const [pal, role, fg, bg, need] of more) {
  const r = ratio(fg, bg);
  console.log(`${pal.padEnd(7)} ${role.padEnd(48)} ${String(r).padStart(6)}  ${need}   ${(r >= need ? 'PASS' : 'FAIL').padEnd(6)} ${inGamut(fg) && inGamut(bg) ? 'yes' : 'NO'}`);
}
console.log('\nC/D tokens:');
for (const [name, pal] of Object.entries({ P4, P5 })) for (const [k, v] of Object.entries(pal)) {
  const e = gamutExcess(v);
  console.log(`  ${name} --color-${k.padEnd(11)} ${v}${e > 0.002 ? `   (out of sRGB by ${e})` : ''}`);
}

console.log('\ncandidate tokens per palette (OKLCH, as they would go into @theme; excess = how far outside sRGB, i.e. how clipped it renders):');
for (const [name, pal] of Object.entries({ P1, P2, P3 })) {
  console.log(`  ${name}`);
  for (const [k, v] of Object.entries(pal)) {
    const e = gamutExcess(v);
    console.log(`    --color-${k.padEnd(12)} ${v}${e > 0.002 ? `   (out of sRGB by ${e}; renders clipped)` : ''}`);
  }
}

// The golden-ratio type ramp, measured against the sizes the site already uses.
const drift = JSON.parse(readFileSync('.design/drift.json', 'utf8'));
const sizes = [...new Set(drift.axes.typeSize.values.map((v) => Number(v.value)).filter(Number.isFinite))].sort((a, b) => a - b);
console.log(`\ntype sizes in use (px): ${sizes.join(', ')}`);
for (const ratio of [1.125, 1.2, 1.25, 1.333, 1.5, 1.618]) {
  let best = null;
  for (const base of [12, 13, 14, 15, 16, 18]) {
    for (let k = -3; k <= 8; k++) {
      const steps = Array.from({ length: 12 }, (_, i) => base * Math.pow(ratio, i - 3));
      let fit = 0, moved = 0;
      for (const s of sizes) {
        const near = steps.reduce((a, b) => (Math.abs(b - s) < Math.abs(a - s) ? b : a), steps[0]);
        if (Math.abs(near - s) < 2) fit++;
        moved += Math.abs(near - s);
      }
      if (!best || fit > best.fit || (fit === best.fit && moved < best.moved)) best = { fit, moved: +moved.toFixed(1), base, k };
    }
  }
  console.log(`  ratio ${String(ratio).padEnd(6)} best fit ${best.fit}/${sizes.length} sizes, total moved ${best.moved}px (base ${best.base}px)`);
}
