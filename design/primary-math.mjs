// Primary-colour candidates, measured against the constraint the operator set:
// gold stays an accent, the primary must not read as e-commerce, and the four path hues
// already carry meaning so the primary must not be confusable with them.
import { readFileSync } from 'node:fs';

const parse = (s) => {
  const o = s.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)(?:\s+(-?[\d.]+))?\s*\)$/);
  if (o) {
    const L = parseFloat(o[1]) / 100, C = parseFloat(o[2]), H = (o[3] ? parseFloat(o[3]) : 0) * Math.PI / 180;
    const a = C * Math.cos(H), b = C * Math.sin(H);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const sb = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.307718152 * m + 0.2309699292 * sb,
            -1.2684380046 * l + 2.6092572011 * m - 0.3413193965 * sb,
            -0.0041960863 * l - 0.7034118309 * m + 1.707614701 * sb];
  }
  const h = s.match(/^#([0-9a-fA-F]{6})$/);
  if (h) return [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  throw new Error('unparsable: ' + s);
};
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const ratio = (a, b) => { const x = lum(parse(a)), y = lum(parse(b)); const [hi, lo] = x > y ? [x, y] : [y, x]; return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
// OKLCH coordinates so hue angle and chroma are available: hue = meaning, chroma = how "commercial"
// a fill reads (saturated fills are the commerce signal; pigment fills are quieter).
const ok = (s) => { const m = s.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)(?:\s+(-?[\d.]+))?\s*\)$/); return m ? { L: +m[1], C: +m[2], H: m[3] ? +m[3] : 0 } : null; };
const hueGap = (a, b) => { let d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

const paper = 'oklch(98.5% 0.006 85)';
const ink = 'oklch(24% 0.02 265)';
const goldInk = 'oklch(55% 0.13 62)';     // the deep gold that is allowed to be text (4.83 on paper)
const goldFloor = 'oklch(76.9% 0.165 70.1)'; // #f59e0b exactly: ink can sit on it (8.09) but it fails as text
const goldAntique = 'oklch(62% 0.10 78)'; // desaturated gold: the pigment reading rather than the sale-badge reading
const paths = { teal: 'oklch(50% 0.11 190)', plum: 'oklch(47% 0.15 305)', rose: 'oklch(50% 0.15 25)', grass: 'oklch(48% 0.11 150)' };

const candidates = {
  'P1 pigment indigo (continuity with the shipped blue, lower chroma)': 'oklch(42% 0.11 262)',
  'P2 ink graphite (near-neutral primary)':                             'oklch(30% 0.02 262)',
  'P3 malachite / ink green (chalkboard)':                              'oklch(43% 0.09 152)',
  'P4 deep teal (petrol)':                                              'oklch(45% 0.10 196)',
  'P5 oxblood / claret':                                                'oklch(42% 0.13 25)',
  'P6 web blue today, for comparison':                                  'oklch(54.6% 0.245 262.881)',
};

console.log('candidate                                                   paper-on-fill  fill-as-ink  fill-on-tint  ink-on-fill  chroma  hue  nearest-path-hue  gap-to-gold');
for (const [name, fill] of Object.entries(candidates)) {
  const tint = fill.replace(/^oklch\(([\d.]+)% ([\d.]+) (-?[\d.]+)\)$/, 'oklch(95% 0.03 $3)');
  const o = ok(fill);
  const closest = Object.entries(paths).map(([k, v]) => [k, hueGap(o.H, ok(v).H)]).sort((a, b) => a[1] - b[1])[0];
  const cols = [
    ratio(paper, fill),                       // text on the primary as a fill (button, band)
    ratio(fill, paper),                       // primary used as text/label
    ratio(fill, tint),                        // primary label on its own pale tint
    ratio(ink, fill),                         // dark ink on the primary fill
  ];
  console.log(`${name.padEnd(58)} ${String(cols[0]).padStart(8)}  ${String(cols[1]).padStart(9)}  ${String(cols[2]).padStart(10)}  ${String(cols[3]).padStart(8)}  ${String(o.C).padStart(6)}  ${String(o.H).padStart(4)}  ${closest[0]} ${String(closest[1]).padStart(3)}deg  ${hueGap(o.H, ok(goldInk).H)}deg`);
}

console.log('\n=== the e-commerce pairing, measured as hue and chroma ===');
for (const [label, a, b] of [['shipped today: blue-600 + amber', 'oklch(54.6% 0.245 262.881)', goldFloor],
                             ['lapis + gold leaf reading: pigment indigo + deep gold', 'oklch(42% 0.11 262)', goldInk],
                             ['pigment indigo + antique gold', 'oklch(42% 0.11 262)', goldAntique],
                             ['graphite + deep gold', 'oklch(30% 0.02 262)', goldInk]]) {
  const x = ok(a), y = ok(b);
  console.log(`${label.padEnd(52)} hue gap ${String(hueGap(x.H, y.H)).padStart(3)}deg  chroma ${x.C} + ${y.C}  contrast between the two: ${ratio(a, b)}`);
}

console.log('\n=== gold in each candidate role ===');
for (const [role, fg, bg, need] of [
  ['deep gold as text on paper', goldInk, paper, 4.5],
  ['deep gold as text on its tint', goldInk, 'oklch(95% 0.03 78)', 4.5],
  ['ink on bright gold floor', ink, goldFloor, 4.5],
  ['ink on antique gold floor', ink, goldAntique, 4.5],
  ['deep gold on graphite fill (accent on primary)', goldInk, 'oklch(30% 0.02 262)', 3],
  ['deep gold on pigment indigo fill', goldInk, 'oklch(42% 0.11 262)', 3],
  ['antique gold on graphite fill', goldAntique, 'oklch(30% 0.02 262)', 3],
  ['bright gold vs paper as a boundary (non-text)', goldFloor, paper, 3],
  ['antique gold vs paper as a boundary (non-text)', goldAntique, paper, 3],
  ['deep gold vs bright gold (same hue family, must be tellable apart)', goldInk, goldFloor, 3],
  ['gold-for-dark L78 C0.11 on graphite fill (text needs 4.5)', 'oklch(78% 0.11 78)', 'oklch(30% 0.02 262)', 4.5],
  ['gold-for-dark L82 C0.10 on graphite fill', 'oklch(82% 0.10 80)', 'oklch(30% 0.02 262)', 4.5],
  ['gold-for-dark L82 C0.10 as a rule on graphite (non-text 3.0)', 'oklch(82% 0.10 80)', 'oklch(30% 0.02 262)', 3],
  ['gold-for-dark L82 C0.10 on pigment-indigo fill', 'oklch(82% 0.10 80)', 'oklch(42% 0.11 262)', 4.5],
  ['gold-ink as a keyline against paper (non-text 3.0)', goldInk, paper, 3],
  ['bright gold keyline against graphite (non-text 3.0)', goldFloor, 'oklch(30% 0.02 262)', 3],
  ['pale gold chip vs paper (a field must read as a field)', 'oklch(95% 0.03 78)', paper, 1.2],
]) console.log(`${role.padEnd(56)} ${String(ratio(fg, bg)).padStart(6)}  need ${need}  ${ratio(fg, bg) >= need ? 'PASS' : 'FAIL'}`);

console.log('\n=== how much chromatic colour each built page carries today ===');
const drift = JSON.parse(readFileSync('design/drift.json', 'utf8'));
const byPage = new Map();
for (const pair of drift.renderedPairs) {
  for (const f of pair.files) {
    if (!byPage.has(f)) byPage.set(f, { surfaces: new Set(), chromatic: new Set() });
    const rec = byPage.get(f);
    rec.surfaces.add(pair.background);
    const o = ok(pair.background);
    if (o && o.C >= 0.02) rec.chromatic.add(pair.background);
  }
}
for (const [f, rec] of byPage) {
  console.log(`  ${f.padEnd(22)} surfaces ${String(rec.surfaces.size).padStart(2)}  chromatic ${String(rec.chromatic.size).padStart(2)}  ${[...rec.chromatic].join(' ')}`);
}
console.log('\n=== chroma ranking of every colour the build resolves (what is actually loud) ===');
const seen = new Map();
for (const v of drift.axes.color.values) if (v.resolved && v.resolved.startsWith('oklch')) seen.set(v.resolved, (seen.get(v.resolved) || 0) + (v.count || v.uses || 0));
for (const pair of drift.renderedPairs) if (pair.background.startsWith('oklch')) seen.set(pair.background, (seen.get(pair.background) || 0) + pair.uses);
seen.set(goldFloor, 2);
const ranked = [...seen.entries()].map(([c, n]) => ({ c, n, ...ok(c) })).sort((a, b) => b.C - a.C);
for (const r of ranked) console.log(`  C ${String(r.C).padStart(6)}  hue ${String(r.H).padStart(7)}  ${String(r.n).padStart(3)}x  ${r.c}`);
const over = ranked.filter((r) => r.C > 0.16);
console.log(`\nchroma budget test (fills above C 0.16 read as commerce): ${over.length} of ${ranked.length} resolved tokens are over budget, ` + over.map((r) => r.c).join(' '));
