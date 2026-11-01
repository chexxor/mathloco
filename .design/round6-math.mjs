// round6-math.mjs - the arithmetic behind the COMPONENTS round, all of it measured or solved.
//
// Three jobs:
//   1. read the SHIPPED control geometry back off the built artifact (measured in Firefox by
//      .design/grill/artifact-measure.mjs + controls-measure.js; the JSON is kept in
//      .design/grill/shipped-controls/ so the "before" column is evidence, not memory);
//   2. enumerate which control heights are actually reachable from the ratified S3 spacing steps and
//      the 4px grid, so "take heights from the spacing sizes" is arithmetic rather than a vibe;
//   3. solve the derived roles the dark band needs - a boundary, a raised surface, and path colours
//      that survive a dark ground - because the round-4 rule "the dark is ink, one band per screen"
//      means components get built ON the band, and the paper values do not cross it.
//
// WCAG bars: 4.5 normal text, 3.0 large text and non-text UI boundaries. Target size: SC 2.5.8
// Target Size (Minimum), Level AA = 24 by 24 CSS pixels; SC 2.5.5 Target Size (Enhanced), AAA = 44 by
// 44. Retrieved 2026-10-31 from https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
// and .../target-size-enhanced.html.
import fs from 'node:fs';

// ---------------------------------------------------------------- colour (same helpers as light-roles.mjs)
const lab = (s) => {
  if (s.startsWith('#')) {
    const v = [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    let l = v[0] * 0.4122214708 + v[1] * 0.5363325363 + v[2] * 0.0514459929;
    let m = v[0] * 0.2119034982 + v[1] * 0.6806995451 + v[2] * 0.1073969566;
    let s2 = v[0] * 0.0883024619 + v[1] * 0.2817188376 + v[2] * 0.6299787005;
    l = Math.cbrt(l); m = Math.cbrt(m); s2 = Math.cbrt(s2);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2,
            1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s2,
            0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s2];
  }
  const m = s.match(/^oklch\(([\d.]+)% ([\d.]+) (-?[\d.]+)\)$/);
  const L = +m[1] / 100, C = +m[2], H = +m[3] * Math.PI / 180;
  return [L, C * Math.cos(H), C * Math.sin(H)];
};
const lum = (s) => {
  const [L, A, B] = lab(s);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const ss = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return 0.2126 * (4.0767416621 * l - 3.307718152 * m + 0.2309699292 * ss)
       + 0.7152 * (-1.2684380046 * l + 2.6092572011 * m - 0.3413193965 * ss)
       + 0.0722 * (-0.0041960863 * l - 0.7034118309 * m + 1.707614701 * ss);
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); const [hi, lo] = x > y ? [x, y] : [y, x]; return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
const mark = (r, bar) => `${r.toString().padStart(6)} ${r >= bar ? 'PASS' : 'FAIL'}`;
const solveL = (C, H, against, target) => {
  const want = lab(against)[0] * 100;
  let best = null;
  for (let i = 0; i <= 1000; i++) {
    const L = i / 10;
    const r = ratio(`oklch(${L.toFixed(1)}% ${C} ${H})`, against);
    if (r >= target && (best === null || Math.abs(L - want) < Math.abs(best.L - want))) best = { L, ratio: r };
  }
  return best ?? { L: NaN, ratio: NaN };
};

const T = {
  paper: 'oklch(98.5% 0.006 85)',
  panel: 'oklch(97% 0.008 85)',
  ink: 'oklch(32% 0.045 152)',
  ink2: 'oklch(45% 0.035 152)',
  ink3: 'oklch(52% 0.028 152)',
  rule: 'oklch(65.5% 0.03 152)',
  goldInk: 'oklch(55% 0.12 62)',
  goldDark: 'oklch(76% 0.06 84)',
  bandText: 'oklch(93% 0.008 152)',
  paths: { cyan: 'oklch(50% 0.11 205)', plum: 'oklch(47% 0.15 315)', coral: 'oklch(50% 0.14 35)', olive: 'oklch(50% 0.10 105)' },
};
const hueOf = (c) => c.match(/(-?[\d.]+)\)$/)[1];

const solveDir = (C, H, against, target, above) => {
  const want = lab(against)[0] * 100;
  let best = null;
  for (let i = 0; i <= 1000; i++) {
    const L = i / 10;
    if (above !== undefined && (above ? L <= want : L >= want)) continue;
    const r = ratio(`oklch(${L.toFixed(1)}% ${C} ${H})`, against);
    if (r >= target && (best === null || Math.abs(L - want) < Math.abs(best.L - want))) best = { L, ratio: r };
  }
  return best ?? { L: NaN, ratio: NaN };
};

// ---------------------------------------------------------------- 1. what ships today
console.log('=== 1. SHIPPED CONTROLS (measured in Firefox 158 over dist/client, not inferred) ===');
const dir = new URL('./grill/shipped-controls/', import.meta.url).pathname;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const d = JSON.parse(fs.readFileSync(dir + f, 'utf8'));
  const rows = d.elements.map((e) => `${e.h}x${e.w} "${e.text.slice(0, 22)}"`);
  console.log(`\n${d.page} @ ${d.viewport[0]}px  heights ${JSON.stringify(d.distinctHeights)}  under24=${d.under24} under44=${d.under44}`);
  for (const e of d.elements) {
    console.log(`   h=${String(e.h).padStart(5)} w=${String(e.w).padStart(6)} pad=${(e.pad || '').padEnd(24)} ${e.fontSize}/${e.lineHeight} w${e.fontWeight} r=${e.radius} 24=${e.target24} 44=${e.target44} c=${e.contrast}  ${e.text.slice(0, 26)}`);
  }
  if (d.contrastFails.length) console.log('   AA text fails:', d.contrastFails.join(' | '));
}

// ---------------------------------------------------------------- 2. reachable heights
console.log('\n=== 2. CONTROL HEIGHTS REACHABLE FROM S3 (4,8,12,16,24,32,48,64) + the 4px grid ===');
// height = line box + 2*pad, and the line box has to be a multiple of 4 as well, or the baseline
// lands off the grid inside its own control. Chrome sizes ratified in round 5: 13.3 and 16.
const S3 = [4, 8, 12, 16, 24, 32, 48, 64];
const chrome = [{ name: 's-1 13.3px', size: 13.3 }, { name: 's0 16px', size: 16 }];
for (const c of chrome) {
  const opts = [];
  for (const lh of [1, 1.2, 1.25, 1.5, 1.75]) {
    const box = Math.round(c.size * lh / 4) * 4;               // line box snapped to the 4px grid
    if (box < c.size * 1.05) continue;                          // display floor from round 5
    for (const pad of S3) {
      const h = box + 2 * pad;
      if (h >= 24 && h <= 64 && h % 4 === 0) opts.push({ lh, box, pad, h });
    }
  }
  const byH = new Map();
  for (const o of opts) if (!byH.has(o.h)) byH.set(o.h, o);
  console.log(`\n${c.name}: heights reachable (line box snapped to 4px, padding from S3)`);
  for (const [h, o] of [...byH].sort((a, b) => a[0] - b[0])) {
    console.log(`   ${String(h).padStart(3)}px = ${o.box}px line box (leading ${o.lh}) + 2 x ${o.pad}px pad   ` +
      `${h >= 24 ? 'AA-target ok' : ''}${h >= 44 ? ' + AAA/44 ok' : (h < 44 ? ' below 44' : '')}`);
  }
}

// ---------------------------------------------------------------- 3. the dark band's derived roles
console.log('\n=== 3. DERIVED ROLES FOR THE ONE DARK BAND (solved to a bar, not eyeballed) ===');
const band = T.ink;
console.log(`band ground: ${band} (ink, not a surface; one band per screen)`);
console.log(`band text                      ${mark(ratio(T.bandText, band), 4.5)}   paper-ish text on the band`);
console.log(`gold numerals on band          ${mark(ratio(T.goldDark, band), 4.5)}`);
const bandRule = solveL(0.03, hueOf(band), band, 3.0);
console.log(`rule ON the band (solved 3.0)  oklch(${bandRule.L}% 0.03 ${hueOf(band)}) = ${bandRule.ratio}`);
const bandPanel = solveL(0.012, 152, band, 1.15);
console.log(`raised panel on the band       oklch(${bandPanel.L}% 0.012 152) vs band = ${bandPanel.ratio} (a layer, not a boundary - 1.1-1.3 is the visible-but-quiet band)`);
console.log(`   paper text on that panel    ${mark(ratio(T.bandText, `oklch(${bandPanel.L}% 0.012 152)`), 4.5)}`);
console.log(`   paper rule on that panel    ${mark(ratio(`oklch(${bandRule.L}% 0.03 152)`, `oklch(${bandPanel.L}% 0.012 152)`), 3.0)}   (does the same rule serve both?)`);
const panelDeep = solveDir(0.008, 85, T.paper, 1.12, false);
console.log(`panel deepened until it reads as a layer: oklch(${panelDeep.L}% 0.008 85) vs paper = ${panelDeep.ratio};  ink on it ${mark(ratio(T.ink, `oklch(${panelDeep.L}% 0.008 85)`), 4.5)}  gold-ink on it ${mark(ratio(T.goldInk, `oklch(${panelDeep.L}% 0.008 85)`), 4.5)}`);
const bandGoldRule = solveL(0.06, 84, band, 3.0);
console.log(`gold keyline on the band       oklch(${bandGoldRule.L}% 0.06 84) = ${bandGoldRule.ratio}   (and as text ${ratio(T.goldDark, band)})`);

console.log('\npath colours: the paper values do NOT cross to the dark ground -');
for (const [name, c] of Object.entries(T.paths)) {
  const H = hueOf(c), C = c.match(/^oklch\([\d.]+% ([\d.]+) /)[1];
  const onPaper = ratio(c, T.paper);
  const onBand = ratio(c, band);
  const text = solveDir(C, H, band, 4.5, true);                 // lighter than the band
  const keyline = ratio(`oklch(${text.L}% ${C} ${H})`, band);
  const fillDark = solveDir(0.05, H, band, 1.35, false);         // a recess, darker than the band
  const fillLight = solveDir(0.05, H, band, 1.35, true);         // a raised tint, lighter than the band
  console.log(`   ${name.padEnd(5)} paper-value ${c}: on paper ${mark(onPaper, 4.5)}  on band ${mark(onBand, 4.5)}`);
  console.log(`        band text+keyline oklch(${text.L}% ${C} ${H}) = ${text.ratio} as text, ${keyline} as a boundary`);
  console.log(`        recess fill oklch(${fillDark.L}% 0.05 ${H}) vs band ${fillDark.ratio}, carries that text at ${mark(ratio(`oklch(${text.L}% ${C} ${H})`, `oklch(${fillDark.L}% 0.05 ${H})`), 4.5)}`);
  console.log(`        raised fill oklch(${fillLight.L}% 0.05 ${H}) vs band ${fillLight.ratio}, carries bandText at ${mark(ratio(T.bandText, `oklch(${fillLight.L}% 0.05 ${H})`), 4.5)}  <- a filled chip on the band must carry NEUTRAL text, not the hue`);
}

// ---------------------------------------------------------------- 4. button variants
console.log('\n=== 4. VARIANT CONTRAST (each pairing measured, not asserted) ===');
const hoverInk = 'oklch(40% 0.055 152)';
const pairs = [
  ['primary: bandText on ink fill', T.bandText, T.ink, 4.5],
  ['primary hover: bandText on ink(40%)', T.bandText, hoverInk, 4.5],
  ['primary focus ring: gold-ink on paper', T.goldInk, T.paper, 3.0],
  ['primary focus ring: gold-on-dark on band', T.goldDark, band, 3.0],
  ['secondary: ink text on paper', T.ink, T.paper, 4.5],
  ['secondary keyline: ink vs paper', T.ink, T.paper, 3.0],
  ['secondary keyline: rule vs paper', T.rule, T.paper, 3.0],
  ['secondary fill: ink text on panel', T.ink, T.panel, 4.5],
  ['ghost: gold-ink text on paper', T.goldInk, T.paper, 4.5],
  ['ghost: gold-ink keyline on paper', T.goldInk, T.paper, 3.0],
  ['ghost hover: gold-ink on panel', T.goldInk, T.panel, 4.5],
  ['gold-ink on a tint (BANNED pairing)', T.goldInk, 'oklch(95% 0.03 152)', 4.5],
  ['ink on ink-tint chip', T.ink, 'oklch(95% 0.03 152)', 4.5],
  ['band: paper text on band panel', T.bandText, `oklch(${bandPanel.L}% 0.012 152)`, 4.5],
];
for (const [label, fg, bg, bar] of pairs) console.log(`   ${label.padEnd(42)} ${mark(ratio(fg, bg), bar)}  (bar ${bar})`);

console.log('\n   panel vs paper (is a card visible without a border?)', ratio(T.panel, T.paper),
  ' - a fill step needs ~1.1 to read as a layer; 3.0 only when the difference carries meaning');
console.log('   ink fill vs paper (does the primary button read as an object?)', ratio(T.ink, T.paper));

// ---------------------------------------------------------------- 5. tap targets vs shipped
console.log('\n=== 5. TARGET SIZE, SHIPPED vs THE TWO BARS ===');
console.log('   AA  SC 2.5.8 Target Size (Minimum)  = 24x24 CSS px');
console.log('   AAA SC 2.5.5 Target Size (Enhanced) = 44x44 CSS px');
const all = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(dir + f, 'utf8')).elements);
const uniq = [...new Map(all.map((e) => [`${e.text}|${e.h}|${e.w}`, e])).values()];
console.log(`   ${uniq.length} distinct shipped controls across index/chat/404 at 1240 and 375`);
for (const h of [...new Set(uniq.map((e) => e.h))].sort((a, b) => a - b)) {
  const set = uniq.filter((e) => e.h === h);
  console.log(`   h=${String(h).padStart(5)}  n=${set.length}  24=${set[0].target24} 44=${set[0].target44}  e.g. ${set.map((e) => e.text.slice(0, 20)).slice(0, 3).join(' / ')}`);
}
