#!/usr/bin/env node
// palette-remap.mjs — the probe that solved the 2026-11-14 palette round (the commissioned read's §3,
// operator ruling: adopt the read's hexes *as* the palette, mapped onto the existing role names). D316, S038.
//
//   node design/grill/palette-remap.mjs            # print the adopted tokens and every pair they measure
//   node design/grill/palette-remap.mjs --solve    # show the lightness window each role could have taken
//
// Why a solver and not a paste: the read's table gives nine hexes and four of them are roles this repo
// has already solved to a bar. `--rule #DFD6C2` measures 1.34 against paper, under the 3.0 boundary bar
// (D99) and even under the 1.35 "separate layer" bar: a hairline that is 1.34 from its own ground is not
// a line, it is a smudge. `--amber #E9A63F` is 0.043 OKLab from Amazon orange #FF9900, inside this repo's
// own 0.05 same-colour bar (D88), and 1.95 against paper — a band, not a tint — so it is not adopted.
// The hexes are adopted where they clear the bars and re-solved where they do not, and every number
// printed here comes from design/grill/okcolor.mjs, the repo's one OKLab implementation (D101).
//
// The four join-path hues need re-homing too, and that is not cosmetic: round 3b reserves each path hue
// at >=40 degrees from every reserved hue. The new ink sits at hue 81.4, so mobilizon's olive (105) is
// now 24 degrees from the ink — a tint of the ink, not a separate channel. And the new accent sits at
// 35.7, which is discord's hue (35) almost exactly. Two rules, one resolution: move the paths that
// collided, keep the paths that did not.
import { contrastTriple, polar, hueGap, nearestBrand, tripleToBytes, asTriple, BARS, SAME_COLOUR_BAR, hueWindows } from './okcolor.mjs';

// The read's values, verbatim (docs/design-critique-2026-11-14.md §3).
export const READ = {
  paper: '#FAF6EC', 'paper-raised': '#FFFCF3', ink: '#17130C', 'ink-muted': '#5C5546',
  rule: '#DFD6C2', accent: '#A2432A', 'accent-strong': '#7E3320', 'accent-wash': '#F0E2D0', amber: '#E9A63F',
};

// The adopted palette, in the same order @theme writes it. `adopted` = the read's hex, byte for byte;
// `solved` = the hue was kept and the lightness (or the hue) moved to clear a bar this repo already has.
const ADOPTED_ = {
  paper: ['oklch(97.35% 0.0139 88.7)', 'adopted #FAF6EC'],
  panel: ['oklch(99.09% 0.0123 91.5)', 'adopted #FFFCF3'],
  tint: ['oklch(91.92% 0.0285 74.3)', 'adopted accent-wash #F0E2D0'],
  ink: ['oklch(18.92% 0.0149 81.4)', 'adopted #17130C'],
  'ink-2': ['oklch(45.17% 0.0252 85.9)', 'adopted ink-muted #5C5546'],
  'ink-3': ['oklch(50.5% 0.03 86)', 'solved: the read has no third text step; the lightest warm step that clears 4.5 on paper, panel AND tint'],
  rule: ['oklch(60% 0.04 86.6)', "solved: the read's #DFD6C2 measures 1.34 on paper, under the 3.0 boundary bar"],
  accent: ['oklch(50.57% 0.1321 35.7)', 'adopted #A2432A (the role `gold` held)'],
  'accent-on-ink': ['oklch(66% 0.10 35.7)', 'solved: the accent on the new band measures 2.97, an invisible ring'],
  'accent-strong': ['oklch(42.22% 0.109 35.35)', 'adopted #7E3320 — the hover-fill role `ink-hover` held'],
  'band-text': ['oklch(96% 0.012 88)', 'solved: the lightest paper-white that keeps margin on the new ink'],
  'path-calendar': ['oklch(51% 0.11 205)', 'hue kept (205); lightness solved for the new ground'],
  'path-meetup': ['oklch(49% 0.15 315)', 'hue kept (315); lightness solved'],
  'path-discord': ['oklch(52% 0.15 262)', "hue moved 35 -> 262: the accent occupies 35.7 (round 3b's 40-degree rule)"],
  'path-mobilizon': ['oklch(51% 0.11 145)', 'hue moved 105 -> 145: the ink occupies 81.4, 24 degrees from 105'],
  'path-calendar-tint': ['oklch(93% 0.03 205)', 'chip track, deliberately flat'],
  'path-meetup-tint': ['oklch(93% 0.03 315)', 'chip track, deliberately flat'],
  'path-discord-tint': ['oklch(93% 0.03 262)', 'chip track, deliberately flat'],
  'path-mobilizon-tint': ['oklch(93% 0.03 145)', 'chip track, deliberately flat'],
  'path-calendar-on-ink': ['oklch(64% 0.11 205)', "the band's own lightness: one step (L 64) for all four paths"],
  'path-meetup-on-ink': ['oklch(64% 0.15 315)', "the band's own lightness: one step (L 64) for all four paths"],
  'path-discord-on-ink': ['oklch(64% 0.15 262)', "the band's own lightness: one step (L 64) for all four paths"],
  'path-mobilizon-on-ink': ['oklch(64% 0.11 145)', "the band's own lightness: one step (L 64) for all four paths"],
};

// The pairs that must clear a bar. `text` = 4.5, `graphic` = 3.0 for a boundary or keyline,
// `layer` = 1.35 for "this is a separate surface", `flat` = must STAY under 1.35 (a tint is not a layer).
const PAIRS_ = [
  ['ink on paper', 'ink', 'paper', 'text'],
  ['ink on panel', 'ink', 'panel', 'text'],
  ['ink-2 on paper', 'ink-2', 'paper', 'text'],
  ['ink-2 on tint', 'ink-2', 'tint', 'text'],
  ['ink-3 on paper', 'ink-3', 'paper', 'text'],
  ['ink-3 on tint', 'ink-3', 'tint', 'text'],
  ['accent on paper', 'accent', 'paper', 'text'],
  ['band-text on ink', 'band-text', 'ink', 'text'],
  ['accent-on-ink on ink', 'accent-on-ink', 'ink', 'text'],
  ['ink on tint', 'ink', 'tint', 'text'],
  ['band-text on accent-strong', 'band-text', 'accent-strong', 'text'],
  ['rule on paper', 'rule', 'paper', 'graphic'],
  ['rule on tint', 'rule', 'tint', 'graphic'],
  ['rule on panel', 'rule', 'panel', 'graphic'],
  ['rule on ink', 'rule', 'ink', 'graphic'],
  ['accent-strong on paper', 'accent-strong', 'paper', 'graphic'],
  ['accent-strong vs ink', 'accent-strong', 'ink', 'layer'],
  ['panel vs paper', 'panel', 'paper', 'flat'],
  ['tint vs paper', 'tint', 'paper', 'flat'],
  ['path-calendar on paper', 'path-calendar', 'paper', 'text'],
  ['path-meetup on paper', 'path-meetup', 'paper', 'text'],
  ['path-discord on paper', 'path-discord', 'paper', 'text'],
  ['path-mobilizon on paper', 'path-mobilizon', 'paper', 'text'],
  ['path-calendar-on-ink on ink', 'path-calendar-on-ink', 'ink', 'text'],
  ['path-meetup-on-ink on ink', 'path-meetup-on-ink', 'ink', 'text'],
  ['path-discord-on-ink on ink', 'path-discord-on-ink', 'ink', 'text'],
  ['path-mobilizon-on-ink on ink', 'path-mobilizon-on-ink', 'ink', 'text'],
  ['calendar tint vs paper', 'path-calendar-tint', 'paper', 'flat'],
  ['meetup tint vs paper', 'path-meetup-tint', 'paper', 'flat'],
  ['discord tint vs paper', 'path-discord-tint', 'paper', 'flat'],
  ['mobilizon tint vs paper', 'path-mobilizon-tint', 'paper', 'flat'],
  // A chip is `ink-2` on its own path tint with a `rule` ring (DESIGN.md "Buttons and chips"), so the
  // chip ground pair is a text pair and the chip edge is a graphic pair. These were not in the table
  // because round 4 solved them against the old tints.
  ['chip label on calendar tint', 'ink-2', 'path-calendar-tint', 'text'],
  ['chip label on meetup tint', 'ink-2', 'path-meetup-tint', 'text'],
  ['chip label on discord tint', 'ink-2', 'path-discord-tint', 'text'],
  ['chip label on mobilizon tint', 'ink-2', 'path-mobilizon-tint', 'text'],
  ['chip edge on calendar tint', 'rule', 'path-calendar-tint', 'graphic'],
  ['chip edge on meetup tint', 'rule', 'path-meetup-tint', 'graphic'],
  ['chip edge on discord tint', 'rule', 'path-discord-tint', 'graphic'],
  ['chip edge on mobilizon tint', 'rule', 'path-mobilizon-tint', 'graphic'],
];

// Pairs the design grammar deliberately forbids. Two kinds, and the difference matters to the gate:
//   'under'  — the pair is banned BECAUSE it is illegible, so the number must stay under the bar. If it
//              rises above the bar the ban's justification has changed and the ban has to be re-written.
//   'report' — the pair is banned by grammar (a tint carries ink, not the accent), and the number is
//              evidence, not a test. `check:render` is what catches a page that uses it anyway.
const BANNED_ = [
  ['accent on ink (ring on the band)', 'accent', 'ink', 3.0, 'under', 'the band takes accent-on-ink instead (D116)'],
  ['accent on tint', 'accent', 'tint', 4.5, 'report', 'tints carry ink; the accent carries paper (D102)'],
  ['ink on accent-strong', 'ink', 'accent-strong', 4.5, 'under', 'the hover fill is a dark fill: its label is band-text'],
  ['amber on paper (the read fills-only value)', null, null, 4.5, 'report', 'not adopted: 1.95 is a band, and it is 0.043 from Amazon orange'],
];

export const ADOPTED = ADOPTED_;
export const PAIRS = PAIRS_;
export const BANNED = BANNED_;
const S = Object.fromEntries(Object.entries(ADOPTED_).map(([k, [s]]) => [k, s]));
export const tokenSpec = (role) => S[role];
export const pairRatio = (a, b) => contrastTriple(S[a], S[b]);
export const hexOf = (spec) => `#${tripleToBytes(asTriple(spec)).map((v) => v.toString(16).padStart(2, '0')).join('')}`;

if (import.meta.main && process.argv.includes('--solve')) {
  const cases = [
    ['rule on paper >= 3.0', 86.6, 0.04, 'paper', 3.0],
    ['rule on tint >= 3.0', 86.6, 0.04, 'tint', 3.0],
    ['ink-3 on paper >= 4.5', 86, 0.03, 'paper', 4.5],
    ['accent-on-ink on ink >= 4.5', 35.7, 0.10, 'ink', 4.5],
    ['band-text on ink >= 4.5', 88, 0.012, 'ink', 4.5],
    ['band-text on accent-strong >= 4.5', 88, 0.012, 'accent-strong', 4.5],
    ['path-calendar on paper >= 4.5', 205, 0.11, 'paper', 4.5],
    ['path-discord on paper >= 4.5', 262, 0.15, 'paper', 4.5],
    ['path-mobilizon on paper >= 4.5', 145, 0.11, 'paper', 4.5],
    ['path-meetup on paper >= 4.5', 315, 0.15, 'paper', 4.5],
  ];
  for (const [what, H, C, ground, bar] of cases) {
    const clears = [];
    for (let L = 5; L <= 99; L += 0.1) if (contrastTriple(`oklch(${L.toFixed(1)}% ${C} ${H})`, S[ground]) >= bar) clears.push(L);
    console.log(`${what.padEnd(38)} clears L ${clears[0].toFixed(1)}..${clears.at(-1).toFixed(1)}  (chosen: ${ADOPTED[what.split(' ')[0]]?.[0] ?? '-'})`);
  }
  const reserved = { ink: S.ink, accent: S.accent, calendar: S['path-calendar'], meetup: S['path-meetup'], discord: S['path-discord'], mobilizon: S['path-mobilizon'] };
  const w = hueWindows(reserved, 40);
  console.log('\nhue geometry after the remap (min gap 40 deg):');
  for (const [k, v] of Object.entries(reserved)) console.log(`  ${k.padEnd(10)} hue ${polar(v).H}`);
  console.log(`  free windows for a FUTURE path hue: ${w.windows.map((x) => `${x.from}-${x.to} (${x.width}deg)`).join(', ')}`);
  const keys = Object.keys(reserved);
  let tight = 0;
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const g = hueGap(reserved[keys[i]], reserved[keys[j]]);
      if (g < 40) tight++;
      console.log(`  gap ${keys[i]}/${keys[j]}: ${g}`);
    }
  console.log(tight ? `${tight} reserved hue(s) inside the 40-degree band — FAIL` : 'all reserved hues >= 40 degrees apart');
  process.exit(tight ? 1 : 0);
}

// The printed report is guarded by import.meta.main so scripts/check-contrast.mjs can import the tables
// without running a report (and without the probe's exit code becoming the gate's exit code).
if (import.meta.main) {
  console.log('adopted tokens (spec = the bytes @theme writes):');
  for (const [k, [spec, why]] of Object.entries(ADOPTED_))
    console.log(`  ${k.padEnd(22)} ${spec.padEnd(26)} ${hexOf(spec)}  ${why}`);

  console.log('\npairs that must clear a bar:');
  let bad = 0;
  for (const [what, a, b, barKind] of PAIRS_) {
    const got = contrastTriple(S[a], S[b]);
    const bar = barKind === 'layer' || barKind === 'flat' ? BARS.layer : BARS[barKind];
    const ok = barKind === 'flat' ? got < bar : got >= bar;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what.padEnd(34)} ${String(got).padStart(6)}  ${barKind === 'flat' ? 'must stay under' : 'bar'} ${bar}`);
  }
  console.log('\npairs the grammar forbids (reported, not failed):');
  for (const [what, a, b, bar, why] of BANNED_) {
    const got = a ? contrastTriple(S[a], S[b]) : contrastTriple(READ.amber, READ.paper);
    console.log(`  ban ${what.padEnd(42)} ${String(got).padStart(6)}  below ${bar} — ${why}`);
  }
  console.log('\nbrand distance (D88 bar 0.135; same-colour bar 0.05):');
  for (const k of ['accent', 'accent-strong', 'ink', 'paper']) {
    const near = nearestBrand(S[k], 1);
    console.log(`  ${k.padEnd(14)} nearest ${near[0].brand.padEnd(24)} ${near[0].d}${near[0].d < SAME_COLOUR_BAR ? '  SAME COLOUR' : ''}`);
  }
  console.log(`  amber (not adopted) nearest ${nearestBrand(READ.amber, 1)[0].brand} ${nearestBrand(READ.amber, 1)[0].d}`);
  console.log(`\n${bad} pair(s) below bar.`);
  process.exit(bad ? 1 : 0);
}
