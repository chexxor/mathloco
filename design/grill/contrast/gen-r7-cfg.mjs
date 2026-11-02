// gen-r7-cfg.mjs - regenerate contrast/cfg-r7.json (the round-7 PATTERNS colour question set).
// Generated, not hand-written (same reason as gen-r6-cfg.mjs): the banned pairs stay in the table as
// explicit red lines, and the shipped-state values are copied out of the BUILT css rather than
// remembered - `grep -o -- "--color-red-600:[^;]*" dist/client/_astro/Layout.*.css`.
import { writeFile } from 'node:fs/promises';

const tokens = {
  // ---- ratified light roles (rounds 4 and 6) ----
  paper: 'oklch(98.5% 0.006 85)', panel: 'oklch(97% 0.008 85)', tint: 'oklch(95% 0.03 152)',
  ink: 'oklch(32% 0.045 152)', ink2: 'oklch(45% 0.035 152)', ink3: 'oklch(52% 0.028 152)',
  rule: 'oklch(65.5% 0.03 152)', goldInk: 'oklch(55% 0.12 62)', goldDark: 'oklch(76% 0.06 84)',
  bandText: 'oklch(93% 0.008 152)', band: 'oklch(32% 0.045 152)',
  p1: 'oklch(50% 0.11 205)', p3: 'oklch(50% 0.14 35)', p2: 'oklch(47% 0.15 315)', p4: 'oklch(50% 0.10 105)',
  // ---- shipped Tailwind v4 palette, read out of the built css (dist/client/_astro/Layout.*.css) ----
  white: '#ffffff', red50: 'oklch(97.1% .013 17.38)', red600: 'oklch(57.7% .245 27.325)',
  blue50: 'oklch(97% .014 254.604)', blue100: 'oklch(93.2% .032 255.585)', blue600: 'oklch(54.6% .245 262.881)',
  gray50: 'oklch(98.5% .002 247.839)', gray100: 'oklch(96.7% .003 264.542)', gray200: 'oklch(92.8% .006 264.531)',
  gray500: 'oklch(55.1% .027 264.364)', gray600: 'oklch(44.6% .03 256.802)', gray800: 'oklch(27.8% .033 256.848)',
  // ---- round-7 signal candidates (the naive ones are kept so the red lines stay visible) ----
  sigRedNaive: 'oklch(52% 0.15 25)',        // 10deg from the coral PATH hue (round-7-math scan)
  sigRedLegal: 'oklch(52% 0.15 355)',       // the only warm hue the scan found with a >=0.12 brand distance
  sigRedTint: 'oklch(95% 0.03 355)',
  sigAmberNaive: 'oklch(52% 0.14 70)',      // 8deg from gold, and out of gamut at that chroma
  sigBlueLegal: 'oklch(52% 0.10 255)',      // legal on the bars, 0.066 from Amazon link blue
  webErrDefault: '#DC2626',
};

const T = (name, fg, bg, bar = 4.5) => ({ kind: 'text', name, fg, bg, bar });
const K = (name, fg, bg) => ({ kind: 'keyline', name, fg, bg, bar: 3 });
const L = (name, fill, ground, bar = 1.35) => ({ kind: 'layer', name, fill, ground, bar });
const O = (name, top, onto, label, bar = 4.5) => ({ kind: 'over', name, top, onto, label, bar });
const S = (name, top, onto, label, bar = 1.35) => ({ kind: 'shadow', name, top, onto, label, bar });

const pairs = [
  // ---------- the SHIPPED pattern set, class values resolved from the built css ----------
  T('SHIPPED Discord error: red-600 on red-50', '@red600', '@red50'),
  T('SHIPPED error text on white (no box)', '@red600', '@white'),
  T('SHIPPED empty channels: gray-600 on blue-50', '@gray600', '@blue50'),
  T('SHIPPED freshness line: gray-500 on white', '@gray500', '@white'),
  T('SHIPPED hero CTA "View Schedule": blue-600 on blue-100', '@blue600', '@blue100'),
  T('SHIPPED hero CTA text on white (no fill)', '@blue600', '@white'),
  T('SHIPPED channel header: gray-800 on gray-100', '@gray800', '@gray100'),
  T('SHIPPED channel body: gray-700-ish on gray-50 -> gray-600', '@gray600', '@gray50'),
  K('SHIPPED spinner arc: blue-600 on white', '@blue600', '@white'),
  K('SHIPPED card edge: gray-200 on gray-50', '@gray200', '@gray50'),
  K('SHIPPED header edge: gray-200 on gray-100', '@gray200', '@gray100'),
  K('SHIPPED card edge on white: gray-200', '@gray200', '@white'),
  L('SHIPPED error box: red-50 vs white', '@red50', '@white'),
  L('SHIPPED empty box: blue-50 vs white', '@blue50', '@white'),
  L('SHIPPED summary card: gray-50 vs white', '@gray50', '@white'),
  L('SHIPPED card header: gray-100 vs gray-50', '@gray100', '@gray50'),
  T('web error default #DC2626 on white as text', '@webErrDefault', '@white'),

  // ---------- Q1: what severity is made of, on paper, with tokens that already exist ----------
  T('notice word (ink) on paper', '@ink', '@paper'),
  T('notice body (ink-2) on paper', '@ink2', '@paper'),
  T('notice meta (ink-3) on paper', '@ink3', '@paper', 4.5),
  K('notice keyline: rule on paper', '@rule', '@paper'),
  K('notice keyline: rule on panel (red line)', '@rule', '@panel'),
  T('caution word: gold-ink on paper', '@goldInk', '@paper'),
  K('caution hairline: gold-ink on paper', '@goldInk', '@paper'),
  T('GOLD on a tint fill (red line)', '@goldInk', '@tint'),
  T('notice body ink on a tint fill', '@ink', '@tint'),
  T('notice body ink-2 on a tint fill', '@ink2', '@tint'),
  L('tint notice fill vs paper', '@tint', '@paper'),
  L('panel notice fill vs paper', '@panel', '@paper'),
  K('rule on tint', '@rule', '@tint'),

  // ---------- Q1: the signal-hue options, measured ----------
  T('naive failure red (hue 25) as text', '@sigRedNaive', '@paper'),
  T('legal warm signal (hue 355) as text', '@sigRedLegal', '@paper'),
  K('legal warm signal (hue 355) as keyline', '@sigRedLegal', '@paper'),
  T('legal warm signal on its own tint', '@sigRedLegal', '@sigRedTint'),
  L('legal warm signal tint vs paper', '@sigRedTint', '@paper'),
  T('naive warning amber (hue 70, out of gamut)', '@sigAmberNaive', '@paper'),
  T('legal cool signal (hue 255) as text', '@sigBlueLegal', '@paper'),
  T('path coral as text on paper (what a red would be confused with)', '@p3', '@paper'),
  T('path plum as text on paper (what hue 355 sits nearest)', '@p2', '@paper'),

  // ---------- Q6: what a shadow actually does to the page ----------
  // top is the shadow colour AT FULL NOMINAL ALPHA, which is an upper bound: the blur spreads that
  // alpha over its radius, so the real contact reading is lower than what is printed here.
  S('SHIPPED shadow-lg / shadow-md contact (alpha .102)', 'rgba(0,0,0,0.102)', '@paper', '@ink'),
  S('black at .13 (the solve)', 'rgba(0,0,0,0.13)', '@paper', '@ink'),
  S('ink-tinted .165 (the solve)', 'rgba(32,57,39,0.165)', '@paper', '@ink'),
  S('ink-tinted .22 (elevation)', 'rgba(32,57,39,0.22)', '@paper', '@ink'),
  S('ink-tinted .30 (heavy, floating)', 'rgba(32,57,39,0.3)', '@paper', '@ink'),
  S('shipped hover card: shadow-lg under a white card on blue-50', 'rgba(0,0,0,0.102)', '@blue50', '@gray800'),

  // ---------- Q5: status grammar inside a row ----------
  T('cancelled title: ink-2', '@ink2', '@paper'),
  T('cancelled title: ink-3', '@ink3', '@paper'),
  T('cancelled word on panel fill', '@ink2', '@panel'),
  T('time-not-set word: ink-3 on paper', '@ink3', '@paper'),
  T('time-not-set word: gold-ink on paper', '@goldInk', '@paper'),
  T('band: stale notice band-text on band', '@bandText', '@band'),
  K('band: rule hairline on band (round 6)', '@rule', '@band'),
];

const solves = [
  { label: 'legal warm signal hue 355, text on paper', C: 0.15, H: 355, against: '@paper', target: 4.5, near: 52 },
  { label: 'legal warm signal hue 355, keyline on paper', C: 0.15, H: 355, against: '@paper', target: 3.0, near: 62 },
  { label: 'legal warm signal hue 355 on its tint', C: 0.15, H: 355, against: '@sigRedTint', target: 4.5, near: 52 },
  { label: 'naive failure red hue 25, text on paper', C: 0.15, H: 25, against: '@paper', target: 4.5, near: 52 },
  { label: 'legal cool signal hue 255, text on paper', C: 0.10, H: 255, against: '@paper', target: 4.5, near: 52 },
  { label: 'ink-3 muted, text on paper', C: 0.028, H: 152, against: '@paper', target: 4.5, near: 52 },
  { label: 'rule as a notice keyline on paper', C: 0.03, H: 152, against: '@paper', target: 3.0, near: 65.5 },
  { label: 'rule darkened for a panel fill', C: 0.03, H: 152, against: '@panel', target: 3.0, near: 65.5 },
];

const cfg = { page: 'blank', width: 1240, tokens, pairs, solves };
await writeFile(new URL('./cfg-r7.json', import.meta.url), JSON.stringify(cfg, null, 1));
console.log(`wrote cfg-r7.json: ${Object.keys(tokens).length} tokens, ${pairs.length} pairs, ${solves.length} solves`);
