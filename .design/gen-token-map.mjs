// gen-token-map.mjs — design-apply's worklist, generated from the markup rather than remembered.
//
// Every class write in a bucket the token block replaces (colour, type size, leading, radius,
// shadow, motion, icon size, font weight) must appear in the map with a target. Anything the map
// does not cover is printed as UNMAPPED and the script exits 1 — so the apply branch cannot
// silently "forget" a class, which is how `text-blue-600 on bg-blue-100` survived to production.
//
// Run: node .design/gen-token-map.mjs   ->  .design/token-map.md
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';
const files = [];
const walk = (d) => readdirSync(d).forEach((e) => (statSync(join(d, e)).isDirectory() ? walk(join(d, e)) : /\.(astro|svelte|html)$/.test(e) && files.push(join(d, e))));
walk(SRC);

// class writes: class="…" / class='…' / class:list={[…]} literal strings
const writes = new Map(); // token -> {count, where:Set}
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/class(?::list)?=(?:"([^"]*)"|'([^']*)'|\{\[[^\]]*\]\})/g)) {
    const body = (m[1] ?? m[2] ?? m[0]).replace(/\{[^}]*\}/g, ' ');
    for (const tok of body.split(/[\s,]+/).filter(Boolean)) {
      if (!/^[\w:\-[\]/.%!]+$/.test(tok)) continue;
      const bare = tok.replace(/^!/, '');
      const rec = writes.get(bare) ?? { count: 0, where: new Set() };
      rec.count++; rec.where.add(`${f}`);
      writes.set(bare, rec);
    }
  }
}

// --- the map. `re` matches a written class (after variant prefixes are stripped into `prefix`).
// target '' means "delete the write". Every entry carries WHY, because apply is a different session.
const MAP = [
  // ---------- colour: Tailwind palette -> named roles ----------
  { bucket: 'colour', re: /^text-gray-(900|800)$/, target: 'text-ink', note: '12.02 on paper; the shipped pair is gray-900 on white at 17.4 — legal but unnamed' },
  { bucket: 'colour', re: /^text-gray-(700|600)$/, target: 'text-ink-2', note: '7.02' },
  { bucket: 'colour', re: /^text-gray-500$/, target: 'text-ink-3', note: '5.21 — this is the meta/dated-line role' },
  { bucket: 'colour', re: /^hover:text-gray-500$/, target: 'hover:text-ink-2', note: '' },
  { bucket: 'colour', re: /^text-gray-50$/, target: 'text-band-text', note: 'it only appears on bg-book-gray, which becomes bg-ink: 10.19' },
  { bucket: 'colour', re: /^text-pink-400$/, target: 'text-gold-on-ink', note: 'the footer ∑. TRAP: plain `gold` on the ink footer measures 2.50 = FAIL; only gold-on-ink (5.80) crosses there' },
  { bucket: 'colour', re: /^text-green-500$/, target: 'text-ink-2', note: 'the Checkmark icon: 2.26 today (under the 3.0 graphic bar). The word beside it carries the meaning; the mark is decoration' },
  { bucket: 'colour', re: /^text-blue-600$/, target: 'text-ink', note: 'icon/label on paper. The hero CTA (blue-600 on blue-100 = 4.30) becomes primary/secondary grammar instead' },
  { bucket: 'colour', re: /^hover:text-blue-600$/, target: 'hover:text-gold', note: 'link hover: 4.82 on paper' },
  { bucket: 'colour', re: /^text-red-600$/, target: 'text-ink (notice word)', note: 'with inset-shadow-rule; caution variant uses gold (4.82). Never a fill' },
  { bucket: 'colour', re: /^bg-red-50$/, target: '', note: 'a notice has no fill: red-50 measures 1.09 vs white = flat' },
  { bucket: 'colour', re: /^bg-blue-600$/, target: 'bg-ink', note: 'primary fill, label text-band-text (10.19)' },
  { bucket: 'colour', re: /^hover:bg-blue-700$/, target: 'OPEN: needs a primary-hover fill token', note: 'round 6 measured the hover at 7.33 against band-text but ratify has no token for it — solve L in the renderer before use (fill vs ink must clear 1.35, label must stay ≥4.5)' },
  { bucket: 'colour', re: /^bg-blue-200$|^hover:bg-blue-200$/, target: 'hover:bg-tint', note: 'ink on tint = 10.96; never gold on tint (4.39)' },
  { bucket: 'colour', re: /^bg-blue-100$/, target: 'bg-tint', note: 'or delete with the CTA it fills' },
  { bucket: 'colour', re: /^bg-blue-50$/, target: 'bg-panel', note: 'a quiet fill, 1.04 vs paper — it is a tint, not a card' },
  { bucket: 'colour', re: /^bg-gray-50$/, target: 'bg-panel', note: '' },
  { bucket: 'colour', re: /^hover:bg-gray-50$/, target: 'hover:bg-panel', note: 'a keylined control may NOT sit on panel (rule 2.88) — check the neighbours' },
  { bucket: 'colour', re: /^bg-gray-100$/, target: 'bg-panel', note: '' },
  { bucket: 'colour', re: /^border-(gray-200|gray-300|blue-600)$/, target: 'inset-shadow-rule (delete the border)', note: 'a border adds 2px and breaks the height arithmetic (D98)' },
  { bucket: 'colour', re: /^focus-visible:outline-blue-600$/, target: 'focus-visible:outline-gold + focus-visible:outline-offset-2', note: '4.82 on paper; on the ink band use outline-band-text (10.19) — gold there is 2.50' },
  { bucket: 'colour', re: /^bg-book-gray$/, target: 'bg-ink', note: 'the one dark band, and the footer' },
  { bucket: 'colour', re: /^text-book-gray$|^bg-book-theme$|^text-book-theme$/, target: 'delete the write', note: '::selection goes to ink/paper inverted (the shipped white-on-#f59e0b is 2.15)' },

  // ---------- type ----------
  { bucket: 'type', re: /^text-xs$/, target: 'text-micro', note: '12 → 11.1px' },
  { bucket: 'type', re: /^text-sm$/, target: 'text-label', note: '14 → 13.3px' },
  { bucket: 'type', re: /^text-base$/, target: 'text-body', note: '16px, unchanged' },
  { bucket: 'type', re: /^text-(lg|xl)$/, target: 'text-lede', note: '18/20 → 19.2px' },
  { bucket: 'type', re: /^text-2xl$/, target: 'text-subhead', note: '24 → 23px' },
  { bucket: 'type', re: /^text-3xl$/, target: 'text-heading', note: '30 → 27.7px' },
  { bucket: 'type', re: /^text-4xl$/, target: 'text-display-1', note: '36 → 33.2px' },
  { bucket: 'type', re: /^text-5xl$/, target: 'text-display-2', note: '48 → 39.8px. The hero ramp INVERTS today (text-4xl sm:text-6xl lg:text-5xl xl:text-6xl): smaller at lg than at sm' },
  { bucket: 'type', re: /^text-6xl$/, target: 'text-display-3 (display-4 only with a narrow cap)', note: '60 → 47.8/57.3px; one display step per screen, and 57.3px needs a cap below 375 ("Mathematical" 367.6px vs 343px)' },
  { bucket: 'type', re: /^(sm:|md:|lg:|xl:)?leading-[\w.]+$/, target: '', note: 'the size token carries leading (58 of 71 writes already do); serif prose takes leading-prose' },
  { bucket: 'type', re: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/, target: 'PT Serif: 400 or 700 only; chrome may use 500/600/800 once Public Sans variable installs', note: 'PT Serif ships one weight today, so 30 weight writes render as 2 faces (measured ink coverage: 400 14.50%, 500 14.50%, 600-800 17.97%)' },

  // ---------- radius / shadow / elevation ----------
  { bucket: 'shape', re: /^rounded-(md|lg|xl)$/, target: 'rounded-control or rounded-card (both 6px)', note: 'radius has exactly two roles and both solve to 6px; the three shipped radii measured 1.38/1.41/1.41 apart = invisible' },
  { bucket: 'shape', re: /^rounded-full$/, target: 'delete with the spinner', note: 'the only rounded-full is the spinner, which Q4 A removes' },
  { bucket: 'shape', re: /^(hover:)?shadow-(sm|md|lg|xl)$/, target: '', note: 'all 17 shadow writes are decoration: shadow-md and shadow-lg share a .102 stop and measure 1.25 (bar 1.35). Only shadow-e1/e2 exist, and only for floating surfaces' },

  // ---------- motion ----------
  { bucket: 'motion', re: /^duration-\d+$/, target: 'duration-150 (colour/shadow) or duration-250 (movement)', note: '18 writes at 300ms for properties that are all colour or box-shadow' },
  { bucket: 'motion', re: /^ease-(in-out|in|out|linear)$/, target: 'ease-linear for colour, ease-out for movement', note: '12 ease-in-out writes; @theme now defaults to 150ms + linear' },

  // ---------- spacing / icon sizes ----------
  { bucket: 'space', re: /^(sm:|md:|lg:|xl:)?-?m[tblrxy]?-?(3\.5|1\.5|5)$/, target: 'gap-2 / gap-3 / mt-6', note: 'the 20px orphan (4 live writes) → 24; gap-3.5 (14) → 12; gap-1.5 (6) → 8' },
  { bucket: 'space', re: /^[wh]-(5|7|9|10|11)$/, target: 'the nearest S3 step (4=16px, 6=24px)', note: 'icon sizes off the grid' },
  { bucket: 'shape', re: /^(?:(?:sm|md|lg|xl|hover|focus|focus-visible):)?border(-(?:t|b|l|r|x|y))?(?:-[\w\d]+)?$/, target: 'inset-shadow-rule (or delete)', note: 'every border write goes: `border`, `border-b`, `border-b-2` (the spinner, deleted), `border-transparent` (dead button boilerplate on 8 CTAs — it paints nothing). A border adds 2px and breaks the height arithmetic' },
  { bucket: 'space', re: /^(md|lg|xl|sm):?(mb|mt)-(20|23)$/, target: 'mb-24 / mt-24 (96px)', note: 'the hero band gap: 80px and 92px are off the ladder (the ratified steps jump 64 → 96). Tailwind v4 makes ANY integer spacing valid, so the ladder cannot be enforced by what resolves — only by the enforce linter' },
  { bucket: 'motion', re: /^transition(-[\w]+)?$/, target: 'keep', note: 'the `@theme` default is now 150ms + linear, which is what every transition in src/ animates' },
];

// Spacing and icon sizes are arithmetic, not taste: a write is on-scale if its numeric step is.
// Auto-classifying them keeps the MAP short and the "unmapped" report honest — an off-scale step is
// a real gap needing a decision, an on-scale one is a keep.
const S3_STEPS = new Set(['0', '1', '2', '3', '4', '6', '8', '12', '16']);
const SECTION_STEPS = new Set(['10', '24', '32']);
const ICON_SIZES = new Set(['3', '4', '6', '8', '12', '16']);
const AUTO = [
  { bucket: 'space', re: /^(?:(?:sm|md|lg|xl|2xl):)?-?[pm][tblrxy]?-(\d+(?:\.\d+)?)$/, set: S3_STEPS, target: 'keep (on S3)', note: 'on the ratified 4px scale' },
  { bucket: 'space', re: /^(?:(?:sm|md|lg|xl|2xl):)?-?[pm][tblrxy]?-(\d+(?:\.\d+)?)$/, set: SECTION_STEPS, target: 'keep — section step', note: '40/96/128 are section-level; using them BETWEEN components is the same mistake as 20' },
  { bucket: 'space', re: /^gap-(\d+(?:\.\d+)?)$/, set: S3_STEPS, target: 'keep (on S3)', note: 'on the ratified 4px scale' },
  { bucket: 'space', re: /^[wh]-(\d+(?:\.\d+)?)$/, set: ICON_SIZES, target: 'keep', note: 'icon box on the S3 steps' },
];

const PREFIX = /^(?:[\w-]+:)+/;
const rows = []; const unmapped = [];
const autoHit = (tok) => {
  const bare = tok.replace(PREFIX, '');
  for (const a of AUTO) {
    const m = a.re.exec(bare) || a.re.exec(tok);
    if (m && a.set.has(m[1])) return { bucket: a.bucket, target: a.target, note: a.note };
  }
  return null;
};
for (const [tok, rec] of [...writes].sort((a, b) => b[1].count - a[1].count)) {
  const bare = tok.replace(PREFIX, '');
  const hit = MAP.find((m) => m.re.test(tok) || m.re.test(bare)) || autoHit(tok);
  if (hit) rows.push({ bucket: hit.bucket, tok, count: rec.count, target: hit.target, note: hit.note });
  else unmapped.push({ tok, count: rec.count });
}

// what buckets do we even care about? colour writes are the ones naming a palette hue
const PALETTE = /(bg|text|border|outline|ring|from|to|via|decoration|fill|stroke|accent|caret|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+|book-(gray|theme)/;
const TYPE = /^(?:(?:sm|md|lg|xl|2xl):)?(?:text-(?:xs|sm|base|lg|xl|[2-9]xl)|leading-[\w.]+|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black))$/;
const SHAPE = /^(?:(?:sm|md|lg|xl):)?(?:rounded(-[\w.]+)?|shadow(-[\w]+)?|border(-[\w-]+)?)$/;
const MOTION = /^(?:(?:hover|focus|focus-visible):)?(?:duration-\d+|ease-[\w-]+|transition(-[\w]+)?)$/;
const SPACE = /^(?:(?:sm|md|lg|xl):)?-?[pm][tblrxy]?-[\d.]+$/;
const ICON = /^[wh]-[\d.]+$/;
const inBucket = (t) => PALETTE.test(t) || TYPE.test(t) || SHAPE.test(t) || MOTION.test(t) || SPACE.test(t) || ICON.test(t);
const covered = (t) => MAP.some((m) => m.re.test(t) || m.re.test(t.replace(PREFIX, ''))) || !!autoHit(t);
const gaps = [...writes.keys()].filter((t) => inBucket(t) && !covered(t));

const byBucket = {};
for (const r of rows) (byBucket[r.bucket] ??= []).push(r);
const out = [];
out.push('# Token map — design-apply\'s worklist', '',
  'Generated by `node .design/gen-token-map.mjs` from the class writes in `src/`. Do not hand-edit;',
  'add a MAP row to the script instead. `target: (delete)` means the write goes away entirely.',
  '',
  `Class tokens scanned: ${writes.size} distinct / ${[...writes.values()].reduce((s, r) => s + r.count, 0)} writes.`,
  `Mapped: ${rows.reduce((s, r) => s + r.count, 0)} writes across ${rows.length} distinct tokens.`,
  `Unmapped writes in a replaced bucket: ${gaps.length ? gaps.join(', ') : 'none'}`,
  '');
for (const b of ['colour', 'type', 'shape', 'motion', 'space']) {
  const list = (byBucket[b] || []).filter((r) => r.target !== 'keep (on S3)');
  const keeps = (byBucket[b] || []).length - list.length;
  out.push(`## ${b}`, '',
    `(${keeps} write${keeps === 1 ? '' : 's'} already on the ratified scale — kept as written, not listed)`, '',
    '| written class | uses | becomes | why |', '|---|---|---|---|');
  for (const r of list) out.push(`| \`${r.tok}\` | ${r.count} | ${r.target === '' ? '**(delete)**' : `\`${r.target}\``} | ${r.note} |`);
  out.push('');
}
out.push('## Gaps the map found in the token block itself', '',
  '1. **No primary-hover fill token.** Round 6 measured the primary hover at 7.33 against `band-text`, and',
  '   `hover:bg-blue-700` maps to a value `@theme` does not define. Solve `L` in the renderer (label ≥ 4.5 on',
  '   the fill, fill vs `ink` ≥ 1.35) and add `--color-ink-hover` before any primary button gets a hover.',
  '2. **No focus-ring pair on the band.** `outline-gold` is legal on paper (4.82) and illegal on ink (2.50);',
  '   the band needs `outline-band-text`. Both pairs exist in the oracle, neither is asserted yet.',
  '3. **The footer ∑ is a coloured glyph on the dark band** (`text-pink-400`): gold at 2.50 there, so it must',
  '   take `gold-on-ink`. Cheap to get wrong because `gold` is the "accent" name in prose.',
  '');
writeFileSync('.design/token-map.md', out.join('\n'));
const bad = gaps.length;
console.log(`wrote .design/token-map.md: ${rows.length} mapped tokens, ${gaps.length} unmapped in a replaced bucket${bad ? `: ${gaps.join(', ')}` : ''}`);
process.exit(bad ? 1 : 0);
