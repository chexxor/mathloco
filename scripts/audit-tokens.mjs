#!/usr/bin/env node
// audit-tokens.mjs — the token audit the round-3 read (§9, commit 1) asked for, as a REPORT, not a gate.
//
//   npm run audit:tokens                      # src/ + dist/client
//   npm run audit:tokens -- --widths 390      # (no browser: the numbers come from the shipped bytes)
//
// It prints:
//   1. every hex, rgb()/rgba() and oklch() literal in src/ and in the shipped stylesheet, with file:line
//   2. how many distinct background colours the artifact paints, and how many distinct text colours
//   3. every margin/padding/gap value in the shipped CSS that is not on DESIGN.md's eight-step ladder
//   4. every outline-suppressing rule, and the focus-ring census (which interactive elements carry their own)
//   5. the measured contrast of every text colour against the ground its own markup puts it on
//
// Why this is not in `verify` (S043, D328, and the rule add-a-gate states: a check outside the runner needs
// its reason written down): every rule it *reports* already has a detector. `check:contrast` fails a paint
// literal outside the token file and a pair under its bar; `check:scale` fails an off-ladder spacing step;
// `check:focus` fails a suppressed outline and a missing global ring. A probe that reports numbers a gate
// already fails would add a build-adjacent run and no new detection, and a probe that exits non-zero on
// numbers DESIGN.md has not ruled would block ships on measurements nobody has decided about. This one
// always exits 0 and prints the table the reviewer asked for.
//
// Cost @measured 2026-11-15 by `npm run audit:tokens` (Linux native, Node 24.22.1): 0.09s, no browser, no build.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { contrastTriple, parseOklch, rgbTripleFromBytes } from '../design/grill/okcolor.mjs';

const args = process.argv.slice(2);
const SRC = resolve(args.includes('--src') ? args[args.indexOf('--src') + 1] : 'src');
const DIST = resolve(args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist/client');

// DESIGN.md "the 4px grid" (D95): the eight steps check:scale enforces.
const LADDER = [4, 8, 12, 16, 24, 32, 48, 64];

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== 'node_modules') walk(p, out); continue; }
    out.push(p);
  }
  return out;
};

const isSource = (p) => /\.(css|astro|svelte|ts|mjs)$/.test(p);
const read = (p) => readFileSync(p, 'utf8');

const LITERAL = /(?<!&)#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\([^)]*\)|oklch\([^)]*\)/g;

/** Comments removed, newlines kept, so a line number still means the line it was found on. `&#169;` is not a
 *  colour and a doc comment quoting `#FF9900` is not a paint value; both used to be counted. */
const stripCommentsKeepLines = (text) => text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

// ---------- 1. literals ----------
const literals = [];
for (const p of walk(SRC, []).filter(isSource)) {
  const rel = p.replace(process.cwd() + '/', '');
  const lines = stripCommentsKeepLines(read(p)).split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(LITERAL)) {
      literals.push({ file: rel, line: i + 1, value: m[0], kind: m[0].startsWith('#') ? 'hex' : m[0].startsWith('oklch') ? 'oklch' : 'rgb' });
    }
  });
}

// ---------- the shipped stylesheet, tokenised into rules ----------
const cssFiles = [];
if (existsSync(DIST)) {
  // `.rel.css` is the render harness's own rewritten copy (design/grill/dist-measure.mjs); counting it twice
  // would make every number in this report a double.
  for (const p of walk(DIST, [])) if (p.endsWith('.css') && !p.endsWith('.rel.css')) cssFiles.push(p);
}
const css = cssFiles.map(read).join('\n');

/** Rules as {selector, body}, descending INTO @layer and @media blocks: Astro's bundle puts every utility
 *  inside `@layer components;@layer utilities{...}`, so a flat scan sees one 38KB block and reports two rules. */
const rulesOf = (text) => {
  const out = [];
  const walkChunk = (chunk, stack) => {
    let i = 0;
    while (i < chunk.length) {
      const brace = chunk.indexOf('{', i);
      if (brace < 0) break;
      const head = chunk.slice(i, brace).trim();
      const close = findClose(chunk, brace);
      const body = chunk.slice(brace + 1, close);
      if (head.startsWith('@')) walkChunk(body, stack.concat(head));
      else out.push({ selector: head.replace(/\s+/g, ' '), body, media: stack.slice() });
      i = close + 1;
    }
  };
  walkChunk(text, []);
  return out;
};
function findClose(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return text.length;
}
const rules = rulesOf(css);

const decl = (body, name) => [...body.matchAll(new RegExp(`\\b${name}\\s*:\\s*([^;{}]+)`, 'g'))].map((m) => m[1].trim());
const tokenOf = (v) => { const m = /var\(--color-([a-z0-9-]+)\)/.exec(v); return m ? m[1] : null; };

const grounds = new Map(); // token -> how many rules paint it
const textTokens = new Map();
for (const r of rules) {
  for (const v of [...decl(r.body, 'background-color'), ...decl(r.body, 'background')]) {
    const t = tokenOf(v) || v;
    grounds.set(t, (grounds.get(t) || 0) + 1);
  }
  for (const v of decl(r.body, 'color')) {
    const t = tokenOf(v) || v;
    textTokens.set(t, (textTokens.get(t) || 0) + 1);
  }
}

// ---------- 3. off-ladder spacing ----------
const spacing = new Map(); // value -> count
for (const r of rules) {
  for (const name of ['margin', 'padding', 'gap', 'margin-top', 'padding-top', 'column-gap', 'row-gap']) {
    for (const v of decl(r.body, name)) {
      for (const num of v.matchAll(/(\d+(?:\.\d+)?)(px|rem)/g)) {
        const px = parseFloat(num[1]) * (num[2] === 'rem' ? 16 : 1);
        if (!LADDER.includes(px) && px !== 0) spacing.set(`${px}px`, (spacing.get(`${px}px`) || 0) + 1);
      }
    }
  }
}

// ---------- 4. outlines ----------
const suppress = [];
for (const p of walk(SRC, []).filter((f) => /\.(css|astro|svelte)$/.test(f)) ) {
  const rel = p.replace(process.cwd() + '/', '');
  read(p).split('\n').forEach((line, i) => {
    if (/outline\s*:\s*(none|0|transparent)|outline-style\s*:\s*none/i.test(line) && !/\/\*|^\s*\*?\/?\s*$/.test(line)) {
      suppress.push(`${rel}:${i + 1}  ${line.trim()}`);
    }
  });
}
const ringRules = rules.filter((r) => /:focus-visible/.test(r.selector) && /outline/.test(r.body));
const htmlFiles = walk(DIST, []).filter((p) => p.endsWith('.html'));
let controls = 0, ownRing = 0;
for (const p of htmlFiles) {
  const h = read(p);
  controls += (h.match(/<(a|button)\b/g) || []).length;
  ownRing += (h.match(/class="[^"]*focus-visible:outline[^"]*"/g) || []).length;
}

// ---------- 5. text colour vs the ground its markup puts it on ----------
const tokens = {};
for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(oklch\([^)]*\))/g)) {
  try { tokens[m[1]] = parseOklch(m[2]); } catch { /* `oklch(37.1% 0 none)` is not a ratio-bearing colour */ }
}
const pairs = new Map(); // "ink on paper" -> count
for (const p of htmlFiles) {
  for (const m of read(p).matchAll(/class="([^"]*)"/g)) {
    const cls = m[1];
    const bg = (cls.match(/\bbg-([a-z0-9-]+)/) || [])[1];
    const fg = (cls.match(/\btext-([a-z0-9-]+)/) || [])[1];
    if (!bg || !fg || !tokens[bg] || !tokens[fg]) continue;
    const key = `${fg} on ${bg}`;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  }
}

// ---------- print ----------
console.log('=== 1. paint literals ===');
const srcLiterals = literals;
console.log(`${srcLiterals.length} literal paint value(s) in src/ after comments are stripped; ${cssFiles.length} shipped stylesheet(s) carry ${(css.match(LITERAL) || []).length} literal(s).`);
for (const l of srcLiterals.slice(0, 40)) console.log(`  ${l.file}:${l.line}  ${l.kind}  ${l.value}`);
console.log('  (check:contrast rule 7 is the detector for any of these outside src/styles/global.css)');

console.log('\n=== 1b. colours in the shipped stylesheet that no token wrote ===');
const paletteRules = rules.filter((r) => /(?:gray|blue|red|green|amber|rose)-\d/.test(r.selector + r.body));
const proseRules = rules.filter((r) => /--tw-prose/.test(r.selector + r.body));
const srcText = walk(SRC, []).map(read).join('\n');
const proseInHtml = htmlFiles.filter((p) => read(p).includes('class="prose')).length;
console.log(`  Tailwind default-palette rules in the shipped CSS: ${paletteRules.length}; src/ writes none of those class names: ${srcText.match(/(?:gray|blue|red|green|amber|rose)-\d/g) === null}`);
console.log(`  @tailwindcss/typography rules shipped: ${proseRules.length}; built pages that use the prose class: ${proseInHtml} of ${htmlFiles.length}`);

console.log('\n=== 2. grounds and text colours in the shipped stylesheet ===');
console.log(`distinct background colours: ${grounds.size}`);
for (const [t, n] of [...grounds].sort((a, b) => b[1] - a[1])) console.log(`  ${String(t).padEnd(14)} ${n} rule(s)`);
console.log(`distinct text colours: ${textTokens.size}`);
for (const [t, n] of [...textTokens].sort((a, b) => b[1] - a[1])) console.log(`  ${String(t).padEnd(14)} ${n} rule(s)`);

console.log('\n=== 3. spacing values in the shipped CSS not on DESIGN.md\u2019s ladder (4 8 12 16 24 32 48 64) ===');
if (!spacing.size) console.log('  none');
for (const [v, n] of [...spacing].sort((a, b) => b[1] - a[1])) console.log(`  ${v.padEnd(8)} ${n} occurrence(s)`);

console.log('\n=== 4. outlines ===');
console.log(`outline-suppressing rules in src/: ${suppress.length}`);
for (const s of suppress) console.log(`  ${s}`);
console.log(`focus-visible rules in the shipped CSS: ${ringRules.length}`);
for (const r of ringRules.slice(0, 6)) console.log(`  ${r.selector} { ${r.body} }`);
console.log(`interactive elements in the artifact: ${controls}; carrying their own ring utility: ${ownRing}; covered by the global rule: ${controls - ownRing}`);

console.log('\n=== 5. every text colour against the ground its own markup gives it ===');
const rows = [...pairs].map(([key, n]) => { const [fg, , bg] = key.split(' '); return { fg, bg, n, ratio: contrastTriple(tokens[fg], tokens[bg]) }; })
  .sort((a, b) => a.ratio - b.ratio);
for (const r of rows) console.log(`  ${(r.fg + ' on ' + r.bg).padEnd(24)} ${String(r.ratio).padStart(5)}  ${r.n} element(s)  ${r.ratio < 4.5 ? 'legibility bar (4.5) NOT met' : r.ratio < 3 ? 'boundary bar (3.0) met, text bar not' : 'clears 4.5'}`);
console.log(`\n${rows.length} distinct text/ground pairs in the artifact; ${rows.filter((r) => r.ratio < 4.5).length} under 4.5 (each of those is a non-text or band pair DESIGN.md names, not a body-text pair).`);
console.log('\n=== 6. the round-3 read\u2019s eight hex tokens, measured ===');
// The read's §9 table gives hex values. What the fence is: check:contrast rule 7 bans a paint literal outside
// the token file, so a hex cannot be pasted into src/styles/global.css; the equivalent oklch() triple is what
// ships. Both columns are printed here so the comparison is a diff rather than an argument.
const PROPOSED = [
  ['--paper', '#FAF6EC'], ['--paper-raised', '#FFFCF3'], ['--ink', '#17130C'], ['--ink-muted', '#5C5546'],
  ['--rule', '#DFD6C2'], ['--accent', '#A2432A'], ['--accent-strong', '#7E3320'], ['--accent-wash', '#F0E2D0'],
  ['--amber', '#E9A63F'],
];
for (const [name, hex] of PROPOSED) {
  const t = rgbTripleFromBytes([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  const onPaper = tokens.paper ? contrastTriple(t, tokens.paper) : null;
  const onInk = tokens.ink ? contrastTriple(t, tokens.ink) : null;
  console.log(`  ${name.padEnd(15)} ${hex}  oklch(${t.L}% ${t.C.toFixed(4)} ${t.H})  on shipped paper ${onPaper}  on shipped ink ${onInk}`);
}
console.log('\naudit:tokens is a report. It exits 0 whatever it prints; the detectors are check:contrast, check:scale and check:focus.');
