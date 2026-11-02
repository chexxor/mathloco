// light-roles.mjs - a LIGHT theme in the G1 gold rule, for both darks (A chalkboard, B sumi).
//
// Why a script: the round-3b specimens put the darks as big bands, which is a dark theme wearing a light page. The
// operator asked for what a light theme actually looks like - and in a light theme the "primary" is mostly *ink*, not a
// surface. So every role that will be rendered on paper needs its own ratio, and the ones that fail have to be fixed in
// the value, not waved at.
//
// WCAG bars used: 4.5 normal text, 3.0 large text (>=24px or >=18.66px bold) and non-text UI (rules, focus rings, chips).

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

const PAPER = 'oklch(98.5% 0.006 85)';
const PANEL = 'oklch(97% 0.008 85)';

const themes = {
  'A chalkboard green-black': {
    ink: 'oklch(32% 0.045 152)',
    inkSecondary: 'oklch(45% 0.035 152)',
    inkMuted: 'oklch(52% 0.028 152)',
    rule: 'oklch(78% 0.02 152)',
    tint: 'oklch(95% 0.03 152)',
    bandText: 'oklch(93% 0.008 152)',
    bandNumerals: 'oklch(76% 0.06 84)',
    paths: { cyan: 'oklch(50% 0.11 205)', plum: 'oklch(47% 0.15 315)', coral: 'oklch(50% 0.14 35)', olive: 'oklch(50% 0.10 105)' },
  },
  'B warm sumi / iron-gall': {
    ink: 'oklch(28% 0.015 60)',
    inkSecondary: 'oklch(44% 0.012 60)',
    inkMuted: 'oklch(52% 0.01 60)',
    rule: 'oklch(80% 0.01 60)',
    tint: 'oklch(95% 0.02 60)',
    bandText: 'oklch(93% 0.008 85)',
    bandNumerals: 'oklch(76% 0.06 84)',
    paths: { teal: 'oklch(50% 0.11 190)', plum: 'oklch(47% 0.15 305)', rose: 'oklch(50% 0.15 25)', grass: 'oklch(48% 0.11 150)' },
  },
};

const GOLD_INK = 'oklch(55% 0.12 62)';

for (const [name, t] of Object.entries(themes)) {
  console.log(`\n=== ${name} ===`);
  console.log(`ink on paper                    ${mark(ratio(t.ink, PAPER), 4.5)}   (body copy, headings)`);
  console.log(`ink as a boundary vs paper      ${mark(ratio(t.ink, PAPER), 3)}   (keylines, icons)`);
  console.log(`ink-secondary on paper          ${mark(ratio(t.inkSecondary, PAPER), 4.5)}   (lede, card copy)`);
  console.log(`ink-muted on paper              ${mark(ratio(t.inkMuted, PAPER), 4.5)}   (meta: dates, venue, captions)`);
  console.log(`ink-muted large                 ${mark(ratio(t.inkMuted, PAPER), 3)}   (same value, >=24px only)`);
  console.log(`rule vs paper                   ${mark(ratio(t.rule, PAPER), 3)}   (card edge - below 3 means the edge is decorative only)`);
  console.log(`rule vs panel                   ${mark(ratio(t.rule, PANEL), 3)}   (edge on a raised panel)`);
  console.log(`ink on tint (a filled chip)     ${mark(ratio(t.ink, t.tint), 4.5)}`);
  console.log(`gold-ink on paper               ${mark(ratio(GOLD_INK, PAPER), 4.5)}   (links, "add to calendar", hairline marks)`);
  console.log(`gold-ink as a keyline           ${mark(ratio(GOLD_INK, PAPER), 3)}`);
  console.log(`gold-ink on tint                ${mark(ratio(GOLD_INK, t.tint), 4.5)}   (a gold mark sitting on a tinted chip)`);
  console.log(`band: paper-ish text on ink     ${mark(ratio(t.bandText, t.ink), 4.5)}   (the one dark band per screen)`);
  console.log(`band: gold numerals on ink      ${mark(ratio(t.bandNumerals, t.ink), 4.5)}   (the date - G1's on-dark gold)`);
  console.log(`band edge vs paper              ${mark(ratio(t.ink, PAPER), 3)}   (the band itself is its own boundary)`);
  for (const [p, c] of Object.entries(t.paths)) {
    const tint = `oklch(95% 0.03 ${c.match(/(-?[\d.]+)\)$/)[1]})`;
    console.log(`path ${p.padEnd(6)} text on paper  ${mark(ratio(c, PAPER), 4.5)}   on its own chip ${mark(ratio(c, tint), 4.5)}   chip fill vs paper ${ratio(tint, PAPER).toFixed(2)} (a fill, not a line - 3.0 only if the fill itself carries meaning)`);
  }
}

console.log('\n=== shared checks ===');
console.log(`paper vs pure white               ${ratio(PAPER, '#ffffff')}  (a warm paper next to a white card - visible? needs ~1.05-1.1 to read as a layer, and 3.0 only if the difference carries meaning)`);
console.log(`panel vs paper                    ${ratio(PANEL, PAPER)}  (raised surface, same rule as above)`);
console.log(`gold-ink focus ring vs paper      ${mark(ratio(GOLD_INK, PAPER), 3)}   and vs ink  ${mark(ratio(GOLD_INK, themes['A chalkboard green-black'].ink), 3)}`);
console.log(`gold-ink vs gold-on-dark numerals ${ratio(GOLD_INK, 'oklch(76% 0.06 84)')}  (two golds in one component: is the difference legible? needs 3.0 if they encode different things)`);

// --- solver: the lightness that makes a hue hit a target ratio, so failures get fixed in the value, not excused ---
// Scan, don't bisect: contrast is not monotonic across the whole 0-100 range once the candidate crosses the ground's
// own lightness, and the answer we want is "the most subtle value that still clears the bar", which is the passing
// lightness closest to the ground.
const groundL = (c) => lab(c)[0] * 100;
const solveL = (C, H, against, target) => {
  const want = groundL(against);
  let best = null;
  for (let i = 0; i <= 1000; i++) {
    const L = i / 10;
    const r = ratio(`oklch(${L.toFixed(1)}% ${C} ${H})`, against);
    if (r >= target && (best === null || Math.abs(L - want) < Math.abs(best.L - want))) best = { L, ratio: r };
  }
  return best ?? { L: NaN, ratio: NaN };
};

console.log('\n=== fixing the two failures ===');
for (const [name, t] of Object.entries(themes)) {
  const hInk = t.ink.match(/(-?[\d.]+)\)$/)[1];
  const hGold = '62';
  console.log(`\n${name}`);
  for (const target of [3.0, 4.5]) {
    const r = solveL(0.03, hInk, PAPER, target);
    console.log(`  rule on paper at target ${target}: oklch(${r.L}% 0.03 ${hInk}) = ${r.ratio}  (${r.note})`);
  }
  const g = solveL(0.12, hGold, t.tint, 4.5);
  console.log(`  gold text on a tinted chip at 4.5: oklch(${g.L}% 0.12 ${hGold}) = ${g.ratio}  (${g.note})`);
  const gfaint = solveL(0.12, hGold, PAPER, 4.5);
  console.log(`  gold text on paper at 4.5:         oklch(${gfaint.L}% 0.12 ${hGold}) = ${gfaint.ratio}  (already the token, so the token is fine - only its pairing on a tint fails)`);
  const panel = solveL(0.008, 85, PAPER, 1.12);
  console.log(`  panel vs paper at ~1.12:           oklch(${panel.L}% 0.008 85) = ${panel.ratio}  (a step big enough to read as a layer without a border)`);
  const ringOnInk = solveL(0.06, 84, t.ink, 3.0);
  console.log(`  gold focus ring on the dark band:  oklch(${ringOnInk.L}% 0.06 84) = ${ringOnInk.ratio}  (band numerals are ${ratio(t.bandNumerals, t.ink)}, so one gold serves both)`);
}
