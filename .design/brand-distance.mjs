// brand-distance.mjs - is a colour "the Amazon colours"? Measured, not vibes.
//
// Distance in OKLab is a reasonable perceptual proxy: two colours with a small delta are the same colour to a human
// at a glance, which is exactly how brand association happens. The operator's objection - "indigo and gold looks exactly
// like Amazon" - is testable, because Amazon's palette is published and the shipped amber token can be compared to it.

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
const polar = ([L, A, B]) => ({ L, C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 });
const lab = (s) => s.startsWith('#') ? hex2oklab(s) : (() => {
  const m = s.match(/^oklch\(([\d.]+)% ([\d.]+) (-?[\d.]+)\)$/);
  const L = +m[1] / 100, C = +m[2], H = +m[3] * Math.PI / 180;
  return [L, C * Math.cos(H), C * Math.sin(H)];
})();
const dist = (a, b) => { const x = lab(a), y = lab(b); return +Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]).toFixed(3); };
const hueGap = (a, b) => { let d = Math.abs(lab(a) && polar(lab(a)).H - polar(lab(b)).H) % 360; return Math.round(Math.min(d, 360 - d)); };

const brands = {
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

const candidates = {
  'shipped amber (book-theme token)': 'oklch(76.9% 0.165 70.1)',
  'gold-ink, deep ochre': 'oklch(55% 0.12 62)',
  'gold-leaf, champagne': 'oklch(84% 0.095 86)',
  'antique gold': 'oklch(62% 0.10 78)',
  'gold-on-dark (band numerals)': 'oklch(82% 0.10 80)',
  'P1 pigment indigo (withdrawn by the operator)': 'oklch(42% 0.11 262)',
  'P2 graphite (Amazon navy?)': 'oklch(30% 0.02 262)',
  'D1 chalkboard green-black': 'oklch(32% 0.045 152)',
  'D2 warm sumi / iron-gall ink': 'oklch(28% 0.015 60)',
  'D3 UMN maroon': 'oklch(38% 0.13 27)',
  'D4 petrol': 'oklch(35% 0.055 195)',
  'paper (warm parchment)': 'oklch(98.5% 0.006 85)',
};

console.log('colour                                   OKLCH L    C     H    nearest brand colours (delta-OKLab; < 0.05 reads as the same colour)');
for (const [name, c] of Object.entries(candidates)) {
  const p = polar(lab(c));
  const near = Object.entries(brands).map(([b, h]) => [b, dist(c, h)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
  console.log(`${name.padEnd(40)} ${String(Math.round(p.L * 100)).padStart(3)}  ${p.C.toFixed(3)}  ${String(Math.round(p.H)).padStart(3)}   ` +
    near.map(([b, d]) => `${d.toFixed(3)} ${b}`).join(' | '));
}

console.log('\n=== the pairing the operator objected to, and the alternatives, as pairs ===');
const pairs = [
  ['objection: P1 indigo + shipped amber', 'oklch(42% 0.11 262)', 'oklch(76.9% 0.165 70.1)'],
  ['objection: P2 graphite + shipped amber', 'oklch(30% 0.02 262)', 'oklch(76.9% 0.165 70.1)'],
  ['A chalkboard green + gold-leaf', 'oklch(32% 0.045 152)', 'oklch(84% 0.095 86)'],
  ['B warm sumi + gold-leaf', 'oklch(28% 0.015 60)', 'oklch(84% 0.095 86)'],
  ['C warm sumi + deep ochre', 'oklch(28% 0.015 60)', 'oklch(55% 0.12 62)'],
  ['D UMN maroon + UMN gold (institutional, local)', 'oklch(38% 0.13 27)', '#FFCD0B'],
  ['E petrol + gold-leaf', 'oklch(35% 0.055 195)', 'oklch(84% 0.095 86)'],
  ['reference: Amazon navy + Amazon orange', '#232F3E', '#FF9900'],
  ['reference: IKEA blue + IKEA yellow', '#0051A5', '#FFD100'],
  ['reference: UCLA blue + UCLA gold (collegiate, not commerce)', '#00558C', '#FFD100'],
  ['reference: UMN maroon + UMN gold', '#98021E', '#FFCD0B'],
];
for (const [label, a, b] of pairs) {
  const pa = polar(lab(a)), pb = polar(lab(b));
  const closest = Object.entries(brands).map(([n, h]) => [n, dist(a, h) + dist(b, h)]).sort((x, y) => x[1] - y[1])[0];
  console.log(`${label.padEnd(46)} hue gap ${String(hueGap(a, b)).padStart(3)}  pair-similarity to ${closest[0]}: ${closest[1].toFixed(3)}`);
}

console.log('\n=== how close the shipped amber really is to the commerce oranges ===');
for (const [n, h] of Object.entries(brands)) {
  if (!/orange|yellow|gold/.test(n)) continue;
  console.log(`  ${n.padEnd(28)} delta ${dist('oklch(76.9% 0.165 70.1)', h).toFixed(3)}   hue gap ${hueGap('oklch(76.9% 0.165 70.1)', h)}  chroma gap ${Math.abs(polar(lab('oklch(76.9% 0.165 70.1)')).C - polar(lab(h)).C).toFixed(3)}`);
}
for (const [n, h] of Object.entries(brands)) {
  if (!/orange|yellow|gold/.test(n)) continue;
  console.log(`  gold-leaf instead -> ${n.padEnd(28)} delta ${dist('oklch(84% 0.095 86)', h).toFixed(3)}   hue gap ${hueGap('oklch(84% 0.095 86)', h)}  chroma gap ${Math.abs(polar(lab('oklch(84% 0.095 86)')).C - polar(lab(h)).C).toFixed(3)}`);
}

console.log('\n=== AA roles for the new dark candidates (text on paper / paper on fill / fill as text / on own tint) ===');
const paper = 'oklch(98.5% 0.006 85)';
const lum = (c) => { const [L, A, B] = lab(c); const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return 0.2126 * (4.0767416621 * l - 3.307718152 * m + 0.2309699292 * s) + 0.7152 * (-1.2684380046 * l + 2.6092572011 * m - 0.3413193965 * s) + 0.0722 * (-0.0041960863 * l - 0.7034118309 * m + 1.707614701 * s); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); const [hi, lo] = x > y ? [x, y] : [y, x]; return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
const pathHues = { teal: 'oklch(50% 0.11 190)', plum: 'oklch(47% 0.15 305)', rose: 'oklch(50% 0.15 25)', grass: 'oklch(48% 0.11 150)' };
for (const [name, c] of Object.entries(candidates)) {
  if (!['D1 chalkboard green-black', 'D2 warm sumi / iron-gall ink', 'D3 UMN maroon', 'D4 petrol'].includes(name)) continue;
  const tint = c.replace(/^oklch\(([\d.]+)% ([\d.]+) (-?[\d.]+)\)$/, 'oklch(95% 0.03 $3)');
  const near = Object.entries(pathHues).map(([k, v]) => [k, hueGap(c, v)]).sort((a, b) => a[1] - b[1])[0];
  console.log(`${name.padEnd(32)} paper-on-fill ${String(ratio(paper, c)).padStart(5)}  fill-as-text ${String(ratio(c, paper)).padStart(5)}  on-tint ${String(ratio(c, tint)).padStart(5)}  nearest path hue: ${near[0]} ${near[1]}deg`);
}
for (const [name, g] of Object.entries({ 'gold-leaf on paper as text': 'oklch(84% 0.095 86)', 'deep ochre on paper as text': 'oklch(55% 0.12 62)' })) {
  console.log(`${name.padEnd(32)} ratio ${ratio(g, paper)}   ink-on-gold-fill ${ratio('oklch(24% 0.02 265)', g)}`);
}
console.log(`\ngold-leaf as a band fill with dark ink on it: ${ratio('oklch(24% 0.02 265)', 'oklch(84% 0.095 86)')}`);
console.log(`gold-leaf vs paper as a boundary (non-text 3.0): ${ratio('oklch(84% 0.095 86)', paper)}`);
console.log(`deep ochre as a keyline on paper (non-text 3.0): ${ratio('oklch(55% 0.12 62)', paper)}`);

console.log('\n=== on-dark gold values: how much commerce yellow can be removed while keeping AA on a dark ground ===');
const darks = { 'graphite oklch(30% 0.02 262)': 'oklch(30% 0.02 262)', 'sumi oklch(28% 0.015 60)': 'oklch(28% 0.015 60)', 'chalkboard oklch(32% 0.045 152)': 'oklch(32% 0.045 152)' };
const golds = ['oklch(84% 0.095 86)', 'oklch(80% 0.075 82)', 'oklch(76% 0.06 84)', 'oklch(72% 0.075 78)', 'oklch(66% 0.10 70)', 'oklch(55% 0.12 62)'];
for (const g of golds) {
  const near = Object.entries(brands).map(([n, h]) => [n, dist(g, h)]).sort((a, b) => a[1] - b[1])[0];
  const row = Object.entries(darks).map(([dn, d]) => `${dn.split(' ')[0]} ${ratio(g, d)}`).join('   ');
  const p = polar(lab(g));
  console.log(`${g.padEnd(22)} L${Math.round(p.L * 100)} C${p.C.toFixed(3)} H${Math.round(p.H)}  |  ${row}  |  nearest brand ${near[1].toFixed(3)} ${near[0]}`);
}

console.log('\n=== path-hue sets that stay >=40deg from a chosen primary ===');
const primaries = { chalkboard: 'oklch(32% 0.045 152)', sumi: 'oklch(28% 0.015 60)', maroon: 'oklch(38% 0.13 27)', petrol: 'oklch(35% 0.055 195)' };
const sets = {
  'current set (teal 190 / plum 305 / rose 25 / grass 150)': { teal: 190, plum: 305, rose: 25, grass: 150 },
  'set B (cyan 205 / plum 315 / coral 35 / olive 105)': { cyan: 205, plum: 315, coral: 35, olive: 105 },
  'set C (teal 185 / violet 320 / rust 45 / lime 110)': { teal: 185, violet: 320, rust: 45, lime: 110 },
};
for (const [pn, pv] of Object.entries(primaries)) {
  const ph = polar(lab(pv)).H;
  const line = Object.entries(sets).map(([sn, s]) => {
    const gaps = Object.values(s).map((h) => { let d = Math.abs(h - ph) % 360; return Math.min(d, 360 - d); });
    const within = Object.entries(s).map(([k, h]) => { const g = [k, Math.min(Math.abs(h - ph) % 360, 360 - Math.abs(h - ph) % 360)]; return g; }).filter((g) => g[1] < 40);
    return `${sn.split(' ')[0]} min ${Math.round(Math.min(...gaps))}deg${within.length ? ` (collides: ${within.map((w) => `${w[0]} ${Math.round(w[1])}`).join(', ')})` : ''}`;
  });
  console.log(`${pn.padEnd(11)} hue ${String(Math.round(ph)).padStart(3)}  ` + line.join('  |  '));
}
