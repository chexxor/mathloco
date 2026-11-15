#!/usr/bin/env node
// check-contrast.mjs — the palette's bars, asserted from the token file itself.
//
//   npm run check:contrast                # the shipped @theme
//   node scripts/check-contrast.mjs --selftest
//   node scripts/check-contrast.mjs --theme <css> [--src <dir>]   # point at a fixture (what --selftest does)
//
// Why this exists (2026-11-14, the commissioned read section 3 + the operator ruling D316): the repo
// states its contrast bars in prose (DESIGN.md) and proves them once, in a browser, during a design
// round. Between rounds nothing re-checks them. A token is a number in a file; a number in a file can be
// nudged by anyone, and `check:classes` only proves a class *resolves* — `gap-5` shipped under a green
// gate for exactly that reason (DESIGN.md pitfall register). The 2026-11-14 palette round changed 22
// tokens in one commit; this gate is what keeps them true afterwards.
//
// Seven rules, all arithmetic from design/grill/okcolor.mjs (the repo's one OKLab implementation, D101),
// with the pair table and the solving record imported from design/grill/palette-remap.mjs (D316) so the
// probe that chose the palette and the gate that defends it cannot disagree:
//   1. FORM — every `--color-*` in @theme is an oklch() triple. No hex, no named colour, no color-mix.
//   2. PROVENANCE — the set of colour tokens in @theme is exactly the set palette-remap.mjs solved, and
//      each shipped value paints the same bytes the record says. An invented token is a finding.
//   3. BARS — every pair in PAIRS clears its bar: text 4.5, graphic/boundary 3.0, layer 1.35, and a
//      "flat" pair (a tint) must STAY under 1.35 or it is a layer, not a tint.
//   4. BANS — the pairs the grammar forbids (accent on ink, accent on a tint, ink on the hover fill)
//      must still be UNDER their bar. A ban whose number rises above the bar is a stale ban, not a rule.
//   5. HUE — the reserved hues (ink, accent, every join path) are >= 40 degrees apart (round 3b). Two
//      reserved hues 24 degrees apart are one channel, and a visitor cannot tell them apart.
//   6. BRAND — an accent-family token sits >= 0.135 delta-OKLab from every commerce brand colour (D88).
//      The 2026-11-14 accent measures 0.091 from Target red: a RECORDED deviation, escalated to the
//      operator (ask N4), not a waiver. The gate fails if an accent token drifts CLOSER to a brand than
//      the number written in BRAND_ALLOW below — a deviation is allowed once, at a stated size.
//   7. NO AD-HOC COLOUR — no hex or rgb()/rgba() literal anywhere in src/ outside src/styles/global.css.
//      A paint literal outside the token file is a colour the palette round never measured.
//
// Cost @measured 2026-11-14 by this step (Linux native, Node 24.22.1): 0.12s gate, 0.16s selftest.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  contrastTriple, parseOklch, tripleToBytes, hueGap, nearestBrand, BARS, SAME_COLOUR_BAR,
} from '../design/grill/okcolor.mjs';
import { ADOPTED, PAIRS, BANNED } from '../design/grill/palette-remap.mjs';

const ROOT = path.resolve(import.meta.dirname, '..'); // this file lives in scripts/

// role -> the closest OKLab distance recorded when the palette was adopted (D316), and the escalation
// that has to settle it. The nearest hue-35.7 candidate that clears 0.135 is #915848 (5.27 on paper),
// printed by `node design/grill/palette-remap.mjs --solve`; moving it is the operator's call.
const BRAND_ALLOW = {
  accent: { d: 0.091, brand: 'Target red #CC0000', why: "D316 adopted the read's accent; the bar is D88's 0.135 — escalated as ask N4" },
  'accent-strong': { d: 0.071, brand: 'UMN maroon #98021E', why: 'the hover fill inherits the accent hue (S038); same escalation' },
  'accent-on-ink': { d: 0.082, brand: 'Amazon deep orange #E47911', why: 'the accent as the band paints it (D116); same escalation' },
};

const themeBlock = (css) => {
  const m = /@theme\s*\{([\s\S]*?)\n\}/.exec(css);
  if (!m) throw new Error('no @theme block — the token file is not the token file');
  return m[1];
};

// Every `--color-*` declaration in @theme with its raw value.
const colourTokens = (block) => {
  const out = {};
  for (const m of block.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};

const stripComments = (text) =>
  text.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SOURCES = ['.astro', '.svelte', '.ts', '.js', '.mjs', '.css'];

function walk(dir, hits, skip) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (skip(p)) continue;
    const isDir = statSync(p).isDirectory();
    if (isDir) {
      // src/assets is binary PNGs; nothing else in src/ is a directory worth skipping
      if (name !== 'assets') walk(p, hits, skip);
      continue;
    }
    if (!SOURCES.includes(path.extname(name))) continue;
    const text = stripComments(readFileSync(p, 'utf8'));
    for (const m of text.matchAll(/(?<=["'\s(=:])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) hits.push(`${p}: ${m[0]}`);
    for (const m of text.matchAll(/\brgba?\(\s*[\d.]+/g)) hits.push(`${p}: ${m[0]}...`);
  }
  return hits;
}

function findings(themePath, srcDir) {
  const out = [], notes = [];
  let css;
  try {
    css = readFileSync(themePath, 'utf8');
  } catch {
    return { out: [`no token file at ${themePath} — nothing to check`], notes: [], tokens: {} };
  }
  let block;
  try { block = themeBlock(css); } catch (e) { return { out: [e.message], notes: [], tokens: {} }; }

  const tokens = colourTokens(block);

  // 1. form
  for (const [role, raw] of Object.entries(tokens)) {
    try { parseOklch(raw); }
    catch { out.push(`--color-${role} is ${raw}: a colour token must be an oklch() triple (D101 — every bar is computed from it)`); }
  }

  // 2. provenance: the shipped set == the solved set, byte for byte
  const roles = new Set(Object.keys(tokens));
  const solved = new Set(Object.keys(ADOPTED));
  for (const role of roles)
    if (!solved.has(role)) out.push(`--color-${role} has no solving record in design/grill/palette-remap.mjs — an invented colour is an unmeasured colour`);
  for (const role of solved)
    if (!roles.has(role)) out.push(`design/grill/palette-remap.mjs solved ${role} but @theme does not ship it`);
  for (const role of solved) {
    if (!roles.has(role)) continue;
    try {
      const a = tripleToBytes(parseOklch(ADOPTED[role][0])).join(',');
      const b = tripleToBytes(parseOklch(tokens[role])).join(',');
      if (a !== b) out.push(`--color-${role} paints ${tokens[role]} but the palette record says ${ADOPTED[role][0]} (probe and token disagree: ${a} vs ${b})`);
    } catch { /* form already reported */ }
  }

  // 3. bars, computed from what the file actually says
  for (const [what, a, b, kind] of PAIRS) {
    if (!tokens[a] || !tokens[b]) continue;
    let got;
    try { got = contrastTriple(tokens[a], tokens[b]); } catch { continue; }
    const bar = kind === 'layer' || kind === 'flat' ? BARS.layer : BARS[kind];
    const ok = kind === 'flat' ? got < bar : got >= bar;
    if (!ok) out.push(`${what}: ${got} ${kind === 'flat' ? 'must stay under' : 'below'} the ${bar} ${kind} bar (DESIGN.md contrast table)`);
  }

  // 4. bans that are justified by illegibility must stay illegible
  for (const [what, a, b, bar, kind, why] of BANNED) {
    if (kind !== 'under' || !a || !tokens[a] || !tokens[b]) continue;
    const got = contrastTriple(tokens[a], tokens[b]);
    if (got >= bar) out.push(`${what} now measures ${got}, above the ${bar} bar — the ban is stale (it exists because the pair reads as one surface: ${why})`);
  }

  // 5. reserved hues
  const reserved = {};
  for (const role of Object.keys(tokens)) {
    if (role === 'ink' || role === 'accent' || (role.startsWith('path-') && !role.endsWith('-tint') && !role.endsWith('-on-ink')))
      reserved[role] = tokens[role];
  }
  const keys = Object.keys(reserved);
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      try {
        const g = hueGap(reserved[keys[i]], reserved[keys[j]]);
        if (g < 40) out.push(`reserved hues ${keys[i]} and ${keys[j]} are ${g} degrees apart (round 3b requires 40) — a visitor sees one channel, not two`);
      } catch { /* form already reported */ }
    }

  // 6. brand distance, accent family only (the grounds are reported, not gated)
  for (const [role, raw] of Object.entries(tokens)) {
    if (!role.startsWith('accent')) continue;
    let t;
    try { t = parseOklch(raw); } catch { continue; }
    const near = nearestBrand(t, 1)[0];
    const allow = BRAND_ALLOW[role];
    if (near.d >= 0.135) continue;
    if (allow && near.d >= allow.d - 0.004) {
      // the deviation is on the record: printed every run so the escalation is never invisible,
      // but it does not make the gate red. It goes red if the token moves CLOSER than the record.
      notes.push(`  note  --color-${role} is ${near.d} from ${near.brand}, inside D88's 0.135 bar — recorded deviation, escalated: ${allow.why}`);
    } else {
      out.push(`--color-${role} is ${near.d} from ${near.brand}, closer than the ${allow ? allow.d : 0.135} the palette record allows (D88)`);
    }
  }
  for (const [what, a, b, , kind, why] of BANNED) {
    if (kind !== 'report' || !a || !tokens[a] || !tokens[b]) continue;
    notes.push(`  note  banned pair ${what} measures ${contrastTriple(tokens[a], tokens[b])} (grammar, not legibility: ${why})`);
  }
  for (const role of ['ink', 'paper']) {
    if (!tokens[role]) continue;
    try {
      const near = nearestBrand(parseOklch(tokens[role]), 1)[0];
      notes.push(`  note  --color-${role} nearest brand ${near.brand} at ${near.d}${near.d < SAME_COLOUR_BAR ? ' (inside the 0.05 same-colour bar)' : ''}`);
    } catch { /* ignore */ }
  }

  // 7. no paint literals outside the token file
  const literals = walk(srcDir, [], (p) => path.basename(p) === 'global.css');
  if (literals.length)
    out.push(`paint literal outside the token file: ${literals.slice(0, 6).join(', ')}${literals.length > 6 ? ` (+${literals.length - 6} more)` : ''}`);

  return { out, notes, tokens };
}

if (process.argv.includes('--selftest')) {
  const dir = path.join(ROOT, '.design', 'tmp-contrast-selftest');
  mkdirSync(dir, { recursive: true });
  const realTheme = path.join(ROOT, 'src/styles/global.css');
  const real = readFileSync(realTheme, 'utf8');
  const swap = (role, value) => real.replace(new RegExp(`--color-${role}:\\s*[^;]+;`), `--color-${role}: ${value};`);

  // a fixture src tree: a copy of the token file plus one page that paints a hex
  const srcFixture = path.join(dir, 'src-fixture');
  mkdirSync(srcFixture, { recursive: true });
  writeFileSync(path.join(srcFixture, 'global.css'), real);
  writeFileSync(path.join(srcFixture, 'Bad.astro'), '<div style="color:#ff0000">x</div>\n');

  // Each planting is written to its own fixture file: the gate always reads a FILE, so a selftest that
  // handed it a string would be testing a different code path from the one `npm run check:contrast` uses.
  const plant = (n, css) => { const p = path.join(dir, `theme-${n}.css`); writeFileSync(p, css); return p; };
  const cases = [
    ['clean control: the shipped token file', realTheme, path.join(ROOT, 'src'), null],
    ['a muted step lightened off the 4.5 bar', plant('ink3', swap('ink-3', 'oklch(60% 0.03 86)')), path.join(ROOT, 'src'), 'ink-3 on paper'],
    ['the hairline from the read pasted in as the rule', plant('rule', swap('rule', 'oklch(91% 0.02 88)')), path.join(ROOT, 'src'), 'rule on paper'],
    ['a tint promoted to a layer', plant('panel', swap('panel', 'oklch(87% 0.02 91.5)')), path.join(ROOT, 'src'), 'panel vs paper'],
    ['the accent dropped off the band', plant('onink', swap('accent-on-ink', 'oklch(50% 0.10 35.7)')), path.join(ROOT, 'src'), 'accent-on-ink on ink'],
    ['the hover fill lightened under its own label', plant('strong', swap('accent-strong', 'oklch(72% 0.109 35.35)')), path.join(ROOT, 'src'), 'band-text on accent-strong'],
    ['a path hue parked next to the accent', plant('hue', swap('path-discord', 'oklch(52% 0.15 30)')), path.join(ROOT, 'src'), 'degrees apart'],
    ['an accent that is Target red', plant('target', swap('accent', 'oklch(54.6% 0.195 22.9)')), path.join(ROOT, 'src'), 'Target red'],
    ['a brand collision deeper than the recorded one', plant('drift', swap('accent', 'oklch(53% 0.19 23)')), path.join(ROOT, 'src'), 'closer than the 0.091'],
    ['a colour invented with no solving record', plant('invented', real.replace('--color-rule:', '--color-alert: oklch(60% 0.15 25);\n  --color-rule:')), path.join(ROOT, 'src'), 'no solving record'],
    ['a token written as a hex', plant('hex', swap('ink', '#17130c')), path.join(ROOT, 'src'), 'oklch() triple'],
    ['a banned pair made legible', plant('ban', swap('accent', 'oklch(75% 0.10 35.7)')), path.join(ROOT, 'src'), 'ban is stale'],
    ['a hex in a style attribute', realTheme, srcFixture, 'paint literal'],
  ];

  let wrong = 0;
  for (const [name, theme, src, must] of cases) {
    const themePath = typeof theme === 'string' && theme.startsWith('oklch') ? realTheme : theme;
    const { out } = findings(themePath, src);
    const ok = must === null ? out.length === 0 : out.some((f) => f.includes(must));
    if (!ok) wrong++;
    console.log(`${ok ? 'ok    ' : 'WRONG '} ${name.padEnd(46)} ${out.length ? out[0] : 'no findings'}`);
  }


  if (process.argv.includes('--keep')) console.log(`fixtures kept in ${dir}`);
  else rmSync(dir, { recursive: true, force: true });
  console.log(wrong ? `\n${wrong} planted defect(s) the contrast gate did not name.` : '\nall plantings named, clean control passed.');
  process.exit(wrong ? 1 : 0);
}

const themeArg = process.argv.indexOf('--theme');
const srcArg = process.argv.indexOf('--src');
const themePath = themeArg >= 0 ? process.argv[themeArg + 1] : path.join(ROOT, 'src/styles/global.css');
const srcDir = srcArg >= 0 ? process.argv[srcArg + 1] : path.join(ROOT, 'src');

const { out, notes, tokens } = findings(themePath, srcDir);
console.log(`contrast gate over ${themePath} (${Object.keys(tokens).length} colour tokens, ${PAIRS.length} asserted pairs)`);
for (const f of out) console.log(`  FAIL  ${f}`);
console.log(notes.join('\n'));
console.log(out.length
  ? `\n${out.length} finding(s).`
  : '  ok    every pair clears its bar, every reserved hue is 40+ apart, no paint literal outside the token file');
process.exit(out.length ? 1 : 0);
