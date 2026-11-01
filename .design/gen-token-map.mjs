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
// Per-FILE counts matter, not just a total: the same class can be live in one file and dormant in
// another, and "how much of this bucket is left to apply" must not count dormant writes.
const writes = new Map(); // token -> {count, files:Map<file,count>}
for (const f of files) {
  // HTML comments are stripped before scanning: the hero keeps a commented-out "Next meetup" block,
  // and counting its classes as live writes inflated the worklist by 5 tokens and made "applied"
  // unreachable - a write inside a comment is not a write.
  const text = readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, ' ');
  for (const m of text.matchAll(/class(?::list)?=(?:"([^"]*)"|'([^']*)'|\{\[[^\]]*\]\})/g)) {
    const body = (m[1] ?? m[2] ?? m[0]).replace(/\{[^}]*\}/g, ' ');
    for (const tok of body.split(/[\s,]+/).filter(Boolean)) {
      if (!/^[\w:\-[\]/.%!]+$/.test(tok)) continue;
      const bare = tok.replace(/^!/, '');
      const rec = writes.get(bare) ?? { count: 0, files: new Map() };
      rec.count++; rec.files.set(f, (rec.files.get(f) ?? 0) + 1);
      writes.set(bare, rec);
    }
  }
}

// --- the map. `re` matches a written class (after variant prefixes are stripped into `prefix`).
// target '' means "delete the write". Every entry carries WHY, because apply is a different session.
// A row whose bucket is not in BUCKETS would never print yet would still mark its write "covered",
// so the write would vanish from the worklist unmapped. Asserted below.
const BUCKETS = ['colour', 'type', 'shape', 'motion', 'space'];
const MAP = [
  // ---------- colour: Tailwind palette -> named roles ----------
  { bucket: 'colour', re: /^text-gray-(900|800)$/, target: 'text-ink', note: '12.02 on paper; the shipped pair is gray-900 on white at 17.4 — legal but unnamed' },
  { bucket: 'colour', re: /^text-gray-(700|600)$/, target: 'text-ink-2', note: '7.02' },
  { bucket: 'colour', re: /^text-gray-500$/, target: 'text-ink-3', note: '5.21 — this is the meta/dated-line role. Instance beats row: the hero\'s three 19.2px lede paragraphs take ink-2 (7.02), because prose is not meta (apply batch 3)' },
  { bucket: 'colour', re: /^hover:text-gray-500$/, target: 'hover:text-ink-2', note: '' },
  { bucket: 'colour', re: /^text-gray-50$/, target: 'text-band-text', note: 'it only appears on bg-book-gray, which becomes bg-ink: 10.19' },
  { bucket: 'colour', re: /^text-pink-400$/, target: 'text-gold-on-ink', note: 'the footer ∑. TRAP: plain `gold` on the ink footer measures 2.50 = FAIL; only gold-on-ink (5.80) crosses there' },
  { bucket: 'colour', re: /^text-green-500$/, target: 'text-ink-2', note: 'the Checkmark icon: 2.26 today (under the 3.0 graphic bar). The word beside it carries the meaning; the mark is decoration' },
  { bucket: 'colour', re: /^text-blue-600$/, target: 'text-ink', note: 'icon/label on paper. The hero CTA (blue-600 on blue-100 = 4.30) becomes primary/secondary grammar instead' },
  { bucket: 'colour', re: /^hover:text-blue-600$/, target: 'hover:text-gold', note: 'link hover: 4.82 on paper' },
  { bucket: 'colour', re: /^text-red-600$/, target: 'text-ink (notice word)', note: 'with inset-shadow-rule; caution variant uses gold (4.82). Never a fill' },
  { bucket: 'colour', re: /^bg-red-50$/, target: '', note: 'a notice has no fill: red-50 measures 1.09 vs white = flat' },
  { bucket: 'colour', re: /^bg-blue-600$/, target: 'bg-ink', note: 'primary fill, label text-band-text (10.19)' },
  { bucket: 'colour', re: /^hover:bg-blue-700$/, target: 'hover:bg-ink-hover', note: 'the gap is CLOSED: `--color-ink-hover` = oklch(40% .055 152) — band-text on it 7.33 (bar 4.5), it vs resting `ink` 1.39 (layer bar 1.35), measured in the renderer (.design/grill/contrast/cfg-hover-sweep.json, Firefox 158.0.1, Linux/x64)' },
  { bucket: 'colour', re: /^bg-blue-200$|^hover:bg-blue-200$/, target: 'hover:bg-tint', note: 'ink on tint = 10.96; never gold on tint (4.39)' },
  { bucket: 'colour', re: /^bg-blue-100$/, target: 'bg-tint', note: 'or delete with the CTA it fills' },
  { bucket: 'colour', re: /^bg-blue-50$/, target: 'bg-panel', note: 'a quiet fill, 1.04 vs paper — it is a tint, not a card' },
  { bucket: 'colour', re: /^bg-gray-50$/, target: 'bg-panel', note: '' },
  { bucket: 'colour', re: /^hover:bg-gray-50$/, target: 'hover:bg-panel', note: 'a keylined control may NOT sit on panel (rule 2.88) — check the neighbours' },
  { bucket: 'colour', re: /^bg-gray-100$/, target: 'bg-panel', note: '' },
  { bucket: 'colour', re: /^border-(gray-200|gray-300|blue-600)$/, target: 'inset-shadow-rule (delete the border)', note: 'a border adds 2px and breaks the height arithmetic (D98)' },
  { bucket: 'colour', re: /^focus-visible:outline-blue-600$/, target: 'focus-visible:outline-gold + focus-visible:outline-offset-2', note: '4.82 on paper; on the ink band use outline-band-text (10.19) — gold there is 2.50 (both pairs now asserted in .design/grill/contrast/gen-ratify-cfg.mjs)' },
  // @tailwindcss/typography paints its own palette through a class that is NOT a Tailwind colour
  // utility, so the PALETTE regex below cannot see it and `prose-blue` was invisible to the gate.
  { bucket: 'colour', re: /^prose-\w+$/, target: 'delete with `prose` (write the ramp in tokens)', note: '`prose-blue` retints every heading/list/link in Tailwind blue — a palette colour where a role exists, banned by DESIGN.md. The block it styles is three element kinds (h4/p/ul), so the ramp is written directly instead' },
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
  { bucket: 'type', re: /^(?:(?:sm|md|lg|xl):)?leading-prose$/, target: 'keep (ratified leading)', note: 'the serif prose rule (1.6) is a token, not a duplicate of the size step — this write stays' },
  { bucket: 'type', re: /^leading-[\w.]+$/, target: '', note: 'a bare leading-* next to a size write duplicates what the size token already carries; the size token names the line box (variant prefixes are tested after stripping)' },
  { bucket: 'type', re: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/, target: 'chrome (sans stack): 400-800 all real; serif: 400 or 700 only', note: 'apply 4a installed Public Sans variable latin (wght 100-900) and imported PT Serif latin 400+700, so chrome weight writes now render as distinct weights (measured: 46 runs on the landing page at 500/600/800). A 500/600 write on SERIF text is still the regular face or the real bold, nothing in between — the only serif weight writes left are inside the typography-plugin ramp in DiscordSummary' },

  // ---------- radius / shadow / elevation ----------
  { bucket: 'shape', re: /^rounded-(md|lg|xl)$/, target: 'rounded-control or rounded-card (both 6px)', note: 'radius has exactly two roles and both solve to 6px; the three shipped radii measured 1.38/1.41/1.41 apart = invisible' },
  { bucket: 'shape', re: /^rounded-full$/, target: 'delete with the spinner', note: 'the only rounded-full is the spinner, which Q4 A removes' },
  { bucket: 'shape', re: /^(hover:)?shadow-(sm|md|lg|xl)$/, target: '', note: 'all 17 shadow writes are decoration: shadow-md and shadow-lg share a .102 stop and measure 1.25 (bar 1.35). Only shadow-e1/e2 exist, and only for floating surfaces' },

  // ---------- motion ----------
  { bucket: 'motion', re: /^duration-\d+$/, target: 'duration-150 (colour/shadow) or duration-250 (movement)', note: 'all 18 writes pair the bare `transition` utility; the only hover states in src/ change colour or box-shadow (6 hover:shadow-lg, 6 hover:bg-*, 6 hover:text-*), and no transform/opacity transition exists, so 150ms is the default and movement must opt in at 250' },
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
// AUTO rules are derived from the token block itself, not remembered: a class that names a ratified
// token is already applied, and the map must say so instead of calling it an unmapped write. If the
// parse finds too few names, the token file moved or renamed — fail loudly, because the alternative
// is the map quietly treating the whole token system as un-mapped writes.
const css = readFileSync('src/styles/global.css', 'utf8');
const tokenNames = (prefix) => new Set([...css.matchAll(new RegExp(`^\\s*--${prefix}([a-z0-9-]+)\\s*:`, 'gm'))]
  .map((m) => m[1]).filter((n) => !n.includes('--line-height')));
const TEXT_NAMES = tokenNames('text-');
const COLOR_NAMES = tokenNames('color-');
const RADIUS_NAMES = tokenNames('radius-');
const SHADOW_NAMES = new Set([...tokenNames('shadow-'), ...tokenNames('inset-shadow-')]);
const LEADING_NAMES = tokenNames('leading-');
if (COLOR_NAMES.size < 15 || TEXT_NAMES.size < 9) {
  throw new Error(`token parse found ${COLOR_NAMES.size} colours / ${TEXT_NAMES.size} type steps in src/styles/global.css — the @theme block moved or renamed.`);
}

const AUTO = [
  { bucket: 'space', re: /^(?:(?:sm|md|lg|xl|2xl):)?-?[pm][tblrxy]?(?:x|y)?-(\d+(?:\.\d+)?)$/, set: S3_STEPS, target: 'keep (on S3)', note: 'on the ratified 4px scale' },
  { bucket: 'space', re: /^(?:(?:sm|md|lg|xl|2xl):)?-?[pm][tblrxy]?(?:x|y)?-(\d+(?:\.\d+)?)$/, set: SECTION_STEPS, target: 'keep — section step', note: '40/96/128 are section-level; using them BETWEEN components is the same mistake as 20' },
  { bucket: 'space', re: /^gap[x-y]?-(\d+(?:\.\d+)?)$/, set: S3_STEPS, target: 'keep (on S3)', note: 'on the ratified 4px scale' },
  { bucket: 'space', re: /^[wh]-(\d+(?:\.\d+)?)$/, set: ICON_SIZES, target: 'keep', note: 'icon box on the S3 steps' },
  // already on the token block: these names come from the file, so a token rename shows up here as a
  // write that is no longer covered.
  { bucket: 'type', re: /^text-([\w-]+)$/, set: TEXT_NAMES, target: 'keep (ratified step)', note: 'names a @theme type step' },
  { bucket: 'type', re: /^leading-([\w-]+)$/, set: LEADING_NAMES, target: 'keep (ratified leading)', note: 'serif prose leading is a token, not a size step' },
  { bucket: 'colour', re: /^text-([\w-]+)$/, set: COLOR_NAMES, target: 'keep (ratified role)', note: 'names a @theme colour role' },
  { bucket: 'colour', re: /^(?:bg|border|outline|ring|fill|stroke|decoration|shadow|inset-shadow)-([\w-]+)$/, set: COLOR_NAMES, target: 'keep (ratified role)', note: 'names a @theme colour role' },
  { bucket: 'shape', re: /^rounded-([\w-]+)$/, set: RADIUS_NAMES, target: 'keep (ratified radius)', note: 'radius has two roles, both 6px' },
  { bucket: 'shape', re: /^(?:shadow|inset-shadow)-([\w-]+)$/, set: SHADOW_NAMES, target: 'keep (ratified elevation)', note: 'elevation comes from @theme' },
];

// Files that are DORMANT — gated off by src/config.json, a stub, or never imported — and slated for
// replacement rather than restyling. Restyling invented content launders fiction: the roadmap note
// (.notes/roadmap-events.md) says flipping showUpcomingEvents on would "publish fiction about a real
// club". The four icons/*.astro files are a different kind of dormant: no file in src/ imports them
// (grep for `icons/` finds nothing), so they ship nothing, and choose-icons will replace them. Their
// writes are reported in their own section so they stay a visible decision instead of being silently
// counted as "applied".
const DORMANT = [
  'src/components/UpcomingMeetups.astro',
  'src/components/PastEvents.astro',
  'src/components/icons/Instagram.astro',
  'src/components/icons/Linkedin.astro',
  'src/components/icons/Medium.astro',
  'src/components/icons/Twitter.astro',
];

// A MAP row whose bucket name is not a bucket would never print, yet would still count as "covered",
// so the write would vanish from the worklist without being mapped. Fail loudly instead.
for (const m of MAP) {
  if (!BUCKETS.includes(m.bucket)) {
    throw new Error(`MAP row /${m.re.source}/ has bucket "${m.bucket}"; buckets are ${BUCKETS.join(', ')}.`);
  }
}

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
const liveCount = (rec) => [...rec.files].reduce((s, [f, n]) => s + (DORMANT.includes(f) ? 0 : n), 0);
const dormantCount = (rec) => [...rec.files].reduce((s, [f, n]) => s + (DORMANT.includes(f) ? n : 0), 0);
const dormantRows = [];
for (const [tok, rec] of [...writes].sort((a, b) => b[1].count - a[1].count)) {
  if (dormantCount(rec) > 0) dormantRows.push({ tok, count: dormantCount(rec), files: [...rec.files.keys()].filter((f) => DORMANT.includes(f)) });
}
for (const [tok, rec] of [...writes].sort((a, b) => b[1].count - a[1].count)) {
  const live = liveCount(rec);
  if (live === 0) continue;                     // dormant-only: reported in its own section
  const bare = tok.replace(PREFIX, '');
  const hit = MAP.find((m) => m.re.test(tok) || m.re.test(bare)) || autoHit(tok);
  if (hit) rows.push({ bucket: hit.bucket, tok, count: live, target: hit.target, note: hit.note });
  else unmapped.push({ tok, count: live });
}

// what buckets do we even care about? colour writes are the ones naming a palette hue
const PALETTE = /(bg|text|border|outline|ring|from|to|via|decoration|fill|stroke|accent|caret|shadow|prose)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d+)?\b/;
const TYPE = /^(?:(?:sm|md|lg|xl|2xl):)?(?:text-(?:xs|sm|base|lg|xl|[2-9]xl)|leading-[\w.]+|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black))$/;
const SHAPE = /^(?:(?:sm|md|lg|xl):)?(?:rounded(?:-[\w.]+)?|shadow(?:-[\w]+)?|border(?:-[\w-]+)?)$/;
const MOTION = /^(?:(?:hover|focus|focus-visible):)?(?:duration-\d+|ease-[\w-]+|transition(-[\w]+)?)$/;
const SPACE = /^(?:(?:sm|md|lg|xl):)?-?[pm][tblrxy]?-[\d.]+$/;
const ICON = /^[wh]-[\d.]+$/;
const inBucket = (t) => PALETTE.test(t) || TYPE.test(t) || SHAPE.test(t) || MOTION.test(t) || SPACE.test(t) || ICON.test(t);
const covered = (t) => MAP.some((m) => m.re.test(t) || m.re.test(t.replace(PREFIX, ''))) || !!autoHit(t);
const gaps = [...writes.keys()].filter((t) => {
  const rec = writes.get(t);
  return liveCount(rec) > 0 && inBucket(t) && !covered(t);
});

const byBucket = {};
for (const r of rows) (byBucket[r.bucket] ??= []).push(r);
const out = [];
out.push('# Token map — design-apply\'s worklist', '',
  'Generated by `node .design/gen-token-map.mjs` from the class writes in `src/`. Do not hand-edit;',
  'add a MAP row to the script instead. `target: (delete)` means the write goes away entirely.',
  `A write that already names a @theme token is listed as "keep (ratified …)" — the token names are`,
  `parsed from src/styles/global.css (${COLOR_NAMES.size} colours, ${TEXT_NAMES.size} type steps, ${RADIUS_NAMES.size} radii, ${SHADOW_NAMES.size} elevations), so a token rename shows up here as a write that stopped being covered.`,
  '',
  `Class tokens scanned: ${writes.size} distinct / ${[...writes.values()].reduce((s, r) => s + r.count, 0)} writes, of which ${dormantRows.reduce((s, r) => s + r.count, 0)} are in a DORMANT file (see the last section).`,
  `Live writes mapped: ${rows.reduce((s, r) => s + r.count, 0)} across ${rows.length} distinct tokens.`,
  `Unmapped writes in a replaced bucket: ${gaps.length ? gaps.join(', ') : 'none'}`,
  '');
for (const b of BUCKETS) {
  const list = (byBucket[b] || []).filter((r) => r.target !== 'keep (on S3)');
  const keeps = (byBucket[b] || []).length - list.length;
  out.push(`## ${b}`, '',
    `(${keeps} write${keeps === 1 ? '' : 's'} already on the ratified scale — kept as written, not listed)`, '',
    '| written class | uses | becomes | why |', '|---|---|---|---|');
  for (const r of list) out.push(`| \`${r.tok}\` | ${r.count} | ${r.target === '' ? '**(delete)**' : `\`${r.target}\``} | ${r.note} |`);
  out.push('');
}
out.push('## DORMANT files — deliberately NOT restyled', '',
  'Gated off by `src/config.json` (`sections.showUpcomingEvents` / `showPastEvents` are both `false` in',
  'the artifact and prod agrees — see `.notes/roadmap-events.md`), empty stubs, or never imported (the',
  'four `icons/*.astro` files: no `icons/` import exists in `src/`, so they ship nothing). The event',
  'components hold invented placeholder copy; restyling fiction makes it look ratified, so apply leaves',
  'them alone — the roadmap says real schedule work REPLACES the component rather than enabling it, and',
  'choose-icons replaces the icons wholesale. Either way their writes stay a visible decision here.', '',
  '| written class | dormant uses | file |', '|---|---|---|');
for (const r of dormantRows) out.push(`| \`${r.tok}\` | ${r.count} | ${r.files.join(', ')} |`);
out.push('');
out.push('## Token-block gaps this map found — status', '',
  '1. **Primary-hover fill — CLOSED.** `--color-ink-hover: oklch(40% .055 152)`. Measured in the renderer',
  '   (`.design/grill/contrast/cfg-hover-sweep.json`, Firefox 158.0.1, Linux/x64): `band-text` on it = 7.33',
  '   (bar 4.5) and it vs resting `ink` = 1.39 (layer bar 1.35). Sweeping L 36–48 the label bar is never the',
  '   binding one (8.67 → 5.16); the layer bar is: FLAT below L 39. Asserted in `gen-ratify-cfg.mjs`.',
  '2. **Focus ring on the band — CLOSED.** `outline-gold` 4.82 on paper / 2.50 on ink (FAIL); the band takes',
  '   `outline-band-text` (10.19). Both pairs + the banned gold-on-ink ring are now asserted rows.',
  '3. **Footer ∑ glyph — mapped, not yet applied**: `text-pink-400` → `text-gold-on-ink` (5.80 on the band);',
  '   plain `gold` there is 2.50. Cheap to get wrong because "accent" in prose means `gold`.',
  '4. **`prose-blue` was invisible to this gate** — the typography plugin colours through a class that is not',
  '   a Tailwind colour utility, so the palette regex missed it. Now in a bucket, with a target.',
  '');
writeFileSync('.design/token-map.md', out.join('\n'));
const bad = gaps.length;
console.log(`wrote .design/token-map.md: ${rows.length} mapped tokens, ${gaps.length} unmapped in a replaced bucket${bad ? `: ${gaps.join(', ')}` : ''}`);
process.exit(bad ? 1 : 0);
