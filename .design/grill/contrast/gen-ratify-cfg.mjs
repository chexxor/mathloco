// gen-ratify-cfg.mjs — regenerate contrast/cfg-ratify.json: the colour assertions for the RATIFIED
// token block in src/styles/global.css.
//
// Why this exists (and why it reads the CSS rather than restating it): the grill solved every colour
// against a bar in the renderer, and ratify wrote those numbers into @theme. The failure mode after
// that point is drift — a token gets nudged by eye three months later and silently stops clearing its
// bar. So the token values in this config are PARSED OUT OF src/styles/global.css. The config cannot
// disagree with the artifact, and editing a token changes the assertion input.
//
// `expect` on every row is the ratio the grill measured. node .design/ratify-check.mjs asserts the
// renderer still returns it (±0.15) and that the verdict matches the decision — including the rows
// that are SUPPOSED to fail, which stay in the table as visible red lines (same reason as
// gen-r6-cfg.mjs and gen-r7-cfg.mjs).
//
// Run: node .design/grill/contrast/gen-ratify-cfg.mjs
//      node .design/grill/contrast-oracle.mjs contrast/cfg-ratify.json   # no --out: it writes contrast/out/
import { readFile, writeFile } from 'node:fs/promises';

const CSS = new URL('../../../src/styles/global.css', import.meta.url);
const css = await readFile(CSS, 'utf8');

// --- parse the @theme block: colour roles, elevation stops, and the legacy entries still in there.
const theme = css.slice(css.indexOf('@theme {'), css.lastIndexOf('}'));
const decl = (prop) => {
  const m = theme.match(new RegExp(`--${prop}:([^;]*);`));
  return m ? m[1].trim() : null;
};
const colour = (name) => {
  const v = decl(`color-${name}`);
  if (!v) throw new Error(`--color-${name} is not in the @theme block`);
  return v;
};
// a shadow token's first stop, as a colour the renderer can composite
const shadowStop = (name) => {
  const v = decl(name);
  if (!v) throw new Error(`--${name} is not in the @theme block`);
  const m = v.match(/rgba\([^)]*\)/);
  if (!m) throw new Error(`--${name} has no rgba() stop to composite: ${v}`);
  return m[0];
};

const PATHS = {
  calendar: 'oklch(50% 0.11 205)',
  meetup: 'oklch(47% 0.15 315)',
  discord: 'oklch(50% 0.14 35)',
  mobilizon: 'oklch(50% 0.10 105)',
};

const tokens = {
  paper: colour('paper'), panel: colour('panel'), tint: colour('tint'),
  ink: colour('ink'), inkHover: colour('ink-hover'), ink2: colour('ink-2'), ink3: colour('ink-3'),
  rule: colour('rule'), gold: colour('gold'), goldOnInk: colour('gold-on-ink'),
  bandText: colour('band-text'), band: colour('ink'), // D89: the band ground IS ink
  e1stop: shadowStop('shadow-e1'), e2stop: shadowStop('shadow-e2'),
};
for (const p of Object.keys(PATHS)) {
  tokens[`p_${p}`] = colour(`path-${p}`);
  tokens[`p_${p}_tint`] = colour(`path-${p}-tint`);
  tokens[`p_${p}_onink`] = colour(`path-${p}-on-ink`);
}

// Shipped Tailwind v4 palette, copied out of the built CSS (same values gen-r7-cfg.mjs read out of
// dist/client/_astro/Layout.*.css). Kept so the retired pairs stay assertable after apply deletes
// them from markup: they document WHY the token block has no red and no blue.
Object.assign(tokens, {
  white: '#ffffff',
  red50: 'oklch(97.1% .013 17.38)', red600: 'oklch(57.7% .245 27.325)',
  blue100: 'oklch(93.2% .032 255.585)', blue600: 'oklch(54.6% .245 262.881)',
  shippedShadowStop: '#0000001a', // read out of the built CSS: `grep -o "shadow-lg[^}]\{0,120\}" dist/client/_astro/Layout.*.css`
});

// `expect` = the ratio the grill measured (null = the grill never measured this exact pair, so the
// assertion is the verdict alone). `must` = the verdict the DECISION requires: pass | fail |
// layered | flat. Rows with expect null are new pairs the ratified set implies; the renderer still
// has to clear the bar, and its number becomes the record for them.
const R = (kind, name, a, b, bar, expect, must, note) => ({ kind, name, bar, expect, must, note, ...(kind === 'layer' ? { fill: a, ground: b } : { fg: a, bg: b }) });
const T = (name, fg, bg, expect, must = 'pass', note) => R('text', name, fg, bg, 4.5, expect, must, note);
const K = (name, fg, bg, expect, must = 'pass', note) => R('keyline', name, fg, bg, 3.0, expect, must, note);
const L = (name, fill, ground, expect, must, note) => R('layer', name, fill, ground, 1.35, expect, must, note);
const S = (name, top, onto, label, expect, must, note) => ({ kind: 'shadow', name, top, onto, label, bar: 1.35, expect, must, note });

// Two numbers were CORRECTED here rather than copied, and the correction is the point of this file:
// the token-plan table carried `path-calendar on paper = 5.47` and `paper path hue on the band =
// 1.97`, both traceable to the hand-rolled oklab->XYZ math in .design/light-roles.mjs (run it: it
// prints 5.47 for cyan). That math agrees with the renderer to 0.02 for plum, coral and olive and is
// 0.19 off for cyan, because oklch(50% .11 205) lands on the sRGB gamut edge (#007481 — red channel
// pinned at 0) and the hand math does no gamut mapping. That is exactly the gap contrast-probe.js
// exists to close, so the renderer numbers (5.28 text/keyline on paper, 2.28 on the band) are the
// record. Both still clear/fail their bars, so no decision moves — only the number does.
const pairs = [
  // ---- adopted text roles on paper (round 4, D89) ----
  T('ink on paper', '@ink', '@paper', 12.02),
  T('ink-2 on paper (secondary text, chip label, cancelled title)', '@ink2', '@paper', 7.02),
  T('ink-3 on paper (meta, dated line, "time not set")', '@ink3', '@paper', 5.21),
  T('gold as text (quiet action, notice word)', '@gold', '@paper', 4.82),
  T('gold on a panel fill (notice on panel)', '@gold', '@panel', 4.61),
  T('ink on tint (secondary hover fill) — tints carry INK', '@ink', '@tint', 10.96),
  T('ink-2 on tint', '@ink2', '@tint', null),
  // apply landed these three: every text role on a `panel` fill, because the site puts meta and
  // channel headers on panel and the ratio drops slightly against paper. Measured 2026-11-01.
  T('ink on a panel fill', '@ink', '@panel', 11.51),
  T('ink-2 on a panel fill (a channel header row)', '@ink2', '@panel', 6.73),
  T('ink-3 on a panel fill (the dated line on a quiet fill)', '@ink3', '@panel', 4.99),

  // ---- the primary hover fill (DESIGN.md recorded 7.33 and no value; apply solved it) --------
  T('primary hover: band-text on the ink-hover fill', '@bandText', '@inkHover', 7.33, 'pass', 'the number round 6 measured and ratify never wrote down'),
  L('primary hover fill vs the resting ink fill', '@inkHover', '@ink', 1.39, 'layered', 'the BINDING bar here is 1.35, not 4.5: at L 36 the fill vs ink is 1.18 = the hover is invisible'),

  // ---- focus rings: one role per ground (the ring is a boundary, so bar 3.0) ------------------
  K('focus ring on paper: gold', '@gold', '@paper', 4.82),
  K('focus ring on the band: band-text', '@bandText', '@band', 10.19),

  // ---- the ink band (D89: at most one per screen, ground = ink) ----
  T('band-text on the band', '@bandText', '@band', 10.19),
  T('gold-on-ink on the band', '@goldOnInk', '@band', 5.8),

  // ---- join paths, paper side and band side (round 2 + D99) ----
  T('path-calendar on paper', '@p_calendar', '@paper', 5.28),
  T('path-meetup on paper', '@p_meetup', '@paper', 7.07),
  T('path-discord on paper', '@p_discord', '@paper', 6.14),
  T('path-mobilizon on paper', '@p_mobilizon', '@paper', 5.68),
  T('path-calendar-on-ink on the band', '@p_calendar_onink', '@band', 4.91),
  T('path-meetup-on-ink on the band', '@p_meetup_onink', '@band', 4.74),
  T('path-discord-on-ink on the band', '@p_discord_onink', '@band', 4.59),
  T('path-mobilizon-on-ink on the band', '@p_mobilizon_onink', '@band', 4.57),
  K('path keyline on paper (chip edge)', '@p_calendar', '@paper', 5.28, 'pass', 'round 6 measured this family at 5.28-6.15 on paper'),
  K('path keyline on the band', '@p_discord_onink', '@band', 4.59),
  L('chip track vs paper — FLAT on purpose, the hue keyline + word carry it', '@p_meetup_tint', '@paper', 1.1, 'flat'),
  T('chip label ink-2 on a chip track', '@ink2', '@p_meetup_tint', null),

  // ---- boundaries: ONE rule role, two grounds (D99) ----
  K('rule on paper', '@rule', '@paper', 3.01),
  K('rule on the band', '@rule', '@band', 4.0),
  K('notice: rule keyline on paper', '@rule', '@paper', 3.01),
  K('caution notice: gold keyline on paper', '@gold', '@paper', 4.82),
  K('caution notice on the band: gold-on-ink keyline', '@goldOnInk', '@band', 5.8),

  // ---- fills and elevation against the 1.35 layer bar ----
  L('panel vs paper', '@panel', '@paper', 1.04, 'flat', 'a tint, not a layer'),
  L('tint vs paper', '@tint', '@paper', 1.1, 'flat', 'a hover fill, not a layer'),
  S('elevation level 1 contact edge', '@e1stop', '@paper', '@ink', null, 'layered', 'solved to clear the bar (D105)'),
  S('elevation level 2 first stop', '@e2stop', '@paper', '@ink', null, 'layered', 'solved to clear the bar (D105)'),

  // ---- BANNED, asserted to keep failing (each is why a token exists or does not) ----
  T('BANNED gold on a tint', '@gold', '@tint', 4.39, 'fail', 'under AA: tints carry ink, gold carries paper'),
  K('BANNED rule as a keyline on a panel', '@rule', '@panel', 2.88, 'fail', 'under the 3.0 boundary bar'),
  K('BANNED paper path hue used on the band', '@p_calendar', '@band', 2.28, 'fail', 'why path-*-on-ink exists'),
  T('BANNED gold as text on the band', '@gold', '@band', null, 'fail', 'why gold-on-ink exists'),
  K('BANNED focus ring: gold on the band', '@gold', '@band', 2.5, 'fail', 'why the band takes outline-band-text (10.19)'),
  T('FIXED ::selection: paper on ink (was white on book-theme amber)', '@paper', '@band', 12.02, 'pass', 'Layout.astro: the shipped amber pair is 2.15'),
  T('RETIRED shipped Discord error: red-600 on red-50', '@red600', '@red50', 4.36, 'fail', 'under AA (D102)'),
  T('RETIRED shipped hero CTA: blue-600 on blue-100', '@blue600', '@blue100', 4.3, 'fail', 'under AA (D102)'),
  S('RETIRED shipped shadow-lg stop', '@shippedShadowStop', '@paper', '@ink', 1.25, 'flat', 'decoration: under the layer bar (D105)'),
  L('RETIRED shipped error fill red-50 vs white', '@red50', '@white', 1.09, 'flat', 'D102'),
  T('RETIRED shipped amber as text (book-theme #f59e0b)', '#f59e0b', '@paper', 2.15, 'fail', 'D82/D88: template leftover'),
];

const cfg = { page: 'blank', width: 1240, tokens, pairs, solves: [] };
for (const p of pairs) if (p.expect === undefined) p.expect = null;
await writeFile(new URL('./cfg-ratify.json', import.meta.url), JSON.stringify(cfg, null, 1));
console.log(`wrote cfg-ratify.json: ${Object.keys(tokens).length} tokens (parsed from src/styles/global.css), ${pairs.length} pairs`);
