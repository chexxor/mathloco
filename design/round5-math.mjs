// round5-math.mjs - the numbers round 5 quotes, computed from drift.json rather than typed by hand.
// Three axes were still open when the colour rounds preempted them (the operator redirected round 3 into
// brand distance): spacing sizes, font sizes + line height, durations. This computes how many of the site's
// own writes each candidate scale already fits, so the choice is made against evidence, and so design-ratify
// can re-run it if a later branch adds values.
import fs from 'node:fs';

const drift = JSON.parse(fs.readFileSync('design/drift.json', 'utf8'));
const fonts = JSON.parse(fs.readFileSync('design/fonts/metrics.json', 'utf8'));

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/* ---------- spacing ---------- */
const sp = drift.axes.spacing.values
  .filter((v) => typeof v.value === 'number' && v.value > 0)
  .map((v) => ({ px: v.value, n: v.count, tokens: v.tokens }));
const spTotal = sp.reduce((a, v) => a + v.n, 0);

const spacingCandidates = {
  'S1 six (8,12,16,24,32,48)': [8, 12, 16, 24, 32, 48],
  'S2 seven (4,8,12,16,24,32,48)': [4, 8, 12, 16, 24, 32, 48],
  'S3 eight (+64)': [4, 8, 12, 16, 24, 32, 48, 64],
  'S4 eight, powers of 2 (4,8,16,24,32,40,48,64)': [4, 8, 16, 24, 32, 40, 48, 64],
  'S5 seven, 1.5x rhythm (4,8,12,18,28,42,64)': [4, 8, 12, 18, 28, 42, 64],
};
const spacing = Object.entries(spacingCandidates).map(([name, scale]) => {
  let exact = 0, moved = 0;
  const moves = [];
  for (const v of sp) {
    if (scale.includes(v.px)) { exact += v.n; continue; }
    moved += v.n;
    const near = scale.reduce((a, b) => (Math.abs(b - v.px) < Math.abs(a - v.px) ? b : a));
    moves.push(`${v.px}->${near} (${v.n}x ${v.tokens.join(',')})`);
  }
  const travel = sp.reduce((a, v) => a + (scale.includes(v.px) ? 0 : v.n * Math.abs(scale.reduce((x, y) => (Math.abs(y - v.px) < Math.abs(x - v.px) ? y : x), 1e9) - v.px)), 0);
  return { name, scale, writes: spTotal, exact, pct: round((exact / spTotal) * 100, 1), moved, travelPx: travel, moves };
});

/* ---------- type ---------- */
const ty = drift.axes.typeSize.values.map((v) => ({ px: v.value, n: v.count, tokens: v.tokens }));
// the hero's responsive steps render 48 and 60 px; drift's typeSize axis counts base-variant tokens only,
// so add them from responsiveTypeRamps (each is one write).
for (const extra of [{ px: 48, n: 1 }, { px: 60, n: 2 }]) {
  if (!ty.some((v) => v.px === extra.px)) ty.push({ ...extra, tokens: ['lg:text-5xl / sm:text-6xl / xl:text-6xl'] });
}
const tyTotal = ty.reduce((a, v) => a + v.n, 0);

function ramp(base, ratio, steps) {
  return Array.from({ length: steps }, (_, i) => round(base * ratio ** i, 1));
}
const typeCandidates = {
  'T1 six (13.3,16,19.2,23,33.2,47.8)': [13.3, 16, 19.2, 23.0, 33.2, 47.8],
  'T2 eight (13.3,16,19.2,23,27.7,33.2,39.8,47.8)': [13.3, 16, 19.2, 23.0, 27.7, 33.2, 39.8, 47.8],
  'T3 nine (…+57.3 for the hero)': [13.3, 16, 19.2, 23.0, 27.7, 33.2, 39.8, 47.8, 57.3],
  'T4 seven starting 14.6 (1.225 for contrast)': [14.6, 17.9, 21.9, 26.8, 32.8, 40.2, 49.2],
};
const type = Object.entries(typeCandidates).map(([name, scale]) => {
  let exact = 0, travel = 0;
  const moves = [];
  for (const v of ty) {
    const near = scale.reduce((a, b) => (Math.abs(b - v.px) < Math.abs(a - v.px) ? b : a));
    if (near === v.px) exact += v.n;
    else moves.push(`${v.px}->${near} (Δ${round(near - v.px, 1)}, ${v.n}x)`);
    travel += v.n * Math.abs(near - v.px);
  }
  return { name, scale, writes: tyTotal, exact, pct: round((exact / tyTotal) * 100, 1), travelPx: round(travel, 1), moves };
});

// line height: 71 leading writes, and what they actually are
const ld = drift.axes.leading.values;
const implicit = ld.filter((v) => String(v.value).includes('--line-height')).reduce((a, v) => a + v.count, 0);
const explicit = ld.filter((v) => !String(v.value).includes('--line-height'));
const leading = {
  totalWrites: ld.reduce((a, v) => a + v.count, 0),
  implicitFromSize: implicit,
  pctImplicit: round((implicit / ld.reduce((a, v) => a + v.count, 0)) * 100, 1),
  explicit: explicit.map((v) => ({ value: v.value, count: v.count, tokens: v.tokens })),
};
// what Tailwind v4 pairs with the 1.200 ramp, and what a serif reading setting would add
const leadTable = [13.3, 16, 19.2, 23, 27.7, 33.2, 39.8, 47.8, 57.3].map((px) => ({
  px,
  tailwindDefault: { 13.3: 20, 16: 24, 19.2: 28, 23: 32, 27.7: 36, 33.2: 40, 39.8: 44, 47.8: 48, 57.3: 56 }[px],
  ratioTw: null,
}));
for (const r of leadTable) r.ratioTw = round(r.tailwindDefault / r.px, 2);
const serifReading = { at16: { tw: '24px (1.50)', proposed: '25.6px (1.60)', measure46chPx: null } };

/* ---------- durations ---------- */
const du = drift.axes.duration.values.map((v) => ({ value: v.value, count: v.count, tokens: v.tokens }));
const duTotal = du.reduce((a, v) => a + v.count, 0);
const ea = drift.axes.easing.values.map((v) => ({ value: v.value, count: v.count, tokens: v.tokens }));
const durations = {
  writes: duTotal,
  distinct: du.length,
  values: du,
  easing: ea,
  note: 'every transition in src/ animates colour or box-shadow; the only other animation is animate-spin on the Discord island loader. There is no modal, dropdown, or enter/exit transition in the codebase.',
  candidates: {
    'D1 two (150 colour/shadow, 250 movement)': [150, 250],
    'D2 three (150, 250, 400)': [150, 250, 400],
    'D3 one (300 as shipped today)': [300],
  },
};

/* ---------- fonts (bytes are file sizes on disk; metrics are in-browser) ---------- */
const faces = fonts.faces;
const bytes = JSON.parse(fs.readFileSync('design/fonts/bytes.json', 'utf8'));

console.log('SPACING — ' + spTotal + ' writes, ' + sp.length + ' distinct');
for (const s of spacing) console.log('  ' + s.name.padEnd(44) + ' fits ' + String(s.exact + '/' + s.writes).padEnd(8) + (s.pct + '%').padEnd(7) + 'moves ' + String(s.moved).padEnd(4) + 'travel ' + s.travelPx + 'px');
for (const s of spacing.slice(0, 3)) console.log('      ' + s.name + ': ' + s.moves.join(' | '));

console.log('\nTYPE — ' + tyTotal + ' writes, ' + ty.length + ' distinct rendered px (' + ty.map((v) => v.px).sort((a, b) => a - b).join(', ') + ')');
for (const t of type) console.log('  ' + t.name.padEnd(48) + ' fits ' + String(t.exact + '/' + t.writes).padEnd(8) + (t.pct + '%').padEnd(7) + 'travel ' + t.travelPx + 'px');
for (const t of type.slice(0, 3)) console.log('      ' + t.name + ': ' + t.moves.join(' | '));

console.log('\nLEADING — ' + leading.totalWrites + ' writes; ' + leading.implicitFromSize + ' (' + leading.pctImplicit + '%) come from the size token itself');
for (const e of leading.explicit) console.log('  explicit ' + String(e.value).padEnd(46) + e.count + 'x  ' + e.tokens.join(','));
console.log('  Tailwind v4 paired leading for the 1.200 ramp: ' + leadTable.map((r) => r.px + '→' + r.ratioTw).join('  '));

console.log('\nDURATION — ' + duTotal + ' writes, ' + durations.distinct + ' distinct');
for (const v of du) console.log('  ' + String(v.value).padEnd(56) + v.count + 'x  ' + v.tokens.slice(0, 4).join(','));
console.log('EASING');
for (const v of ea) console.log('  ' + String(v.value).padEnd(56) + v.count + 'x  ' + v.tokens.slice(0, 4).join(','));

console.log('\nFACES — metrics measured in Firefox 158 from the same woff2 files a self-hosted build would ship');
console.log('  ' + ['family', 'wt', 'xH', 'cap', '0adv', 'nav@14px', 'line@16px', 'tnum?'].map((s, i) => s.padEnd([20, 4, 5, 5, 6, 10, 10, 7][i])).join(''));
for (const f of faces) console.log('  ' + [f.family, f.weight, f.xHeight, f.capHeight, f.digitAdv, f.navPxAt14, f.bodyPxAt16, f.tnumChanges ? 'yes' : (f.digitsDefaultTabular ? 'default' : 'no')].map((s, i) => String(s).padEnd([20, 4, 5, 5, 6, 10, 10, 7][i])).join(''));
console.log('\nBYTES (latin subset woff2, @fontsource via jsdelivr, read from disk)');
for (const [k, v] of Object.entries(bytes)) console.log('  ' + k.padEnd(46) + v.toLocaleString() + ' B');

fs.writeFileSync('design/round5-math.json', JSON.stringify({ spacing, type, leading, leadTable, durations, faces, bytes }, null, 1));
console.log('\nwrote design/round5-math.json');
