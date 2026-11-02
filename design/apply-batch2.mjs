// apply-batch2.mjs — batch 2 of design-apply: the near-exact renames.
//
// Scope, and why it stops there. This batch moves CONTENT text, radius and spacing onto the ratified
// tokens where the visual delta is a couple of pixels: text-base→body (0), text-sm→label (-0.7),
// text-lg/xl→lede (+1.2 / -0.8), text-2xl→subhead (-1), text-3xl→heading (-2.3), rounded-lg→card
// (8→6), and the off-ladder spacing steps (20→24, 80→96, 92→dropped). It deliberately does NOT touch:
//   * display writes (text-4xl and up) — the hero ramp INVERTS today (36 → 60 → 48 → 60) and "which
//     display step per screen" is a decision, not a rename. That is batch 4 with the rest of the ramp.
//   * controls — a button's label size, pad and radius are ONE arithmetic (height = line box + 2 x
//     S3 pad). Renaming `text-base` on a CTA in this batch would move its height by 2.7px and leave
//     the pad wrong until batch 3, i.e. a knowingly broken intermediate state. The control grammar
//     lands as one unit in batch 3.
//   * colour — batch 3.
// Adding `leading-prose` is part of this batch because the size token and the serif leading are one
// decision (DESIGN.md: leading is carried by the size token; serif prose reads at 1.6).
//
// Discipline: every row must match its `from` string EXACTLY `n` times in that file, or the script
// dies naming the row. A silent partial application is how a rename batch becomes a mystery diff.
//
// Run: node design/apply-batch2.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry');

const TABLE = [
  // ---- spacing: off-ladder steps onto the ratified ladder (20px orphan, 80/92 orphans) ----
  ['src/components/HeroSection.astro', 'md:mt-32 md:mb-20 xl:mt-23 xl:mb-24', 'md:mt-32 md:mb-24', 1,
    '80px and 92px are off the ladder (it jumps 64 → 96 → 128); md:mt-32/md:mb-24 already govern xl, so the xl writes were only there to be off-ladder'],
  ['src/components/HeroSection.astro', 'mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl font-body', 'mt-3 text-lede leading-prose text-gray-500 sm:mt-6 font-body', 3,
    'the 16→20→18→20 oscillation collapses to one step (19.2), the 20px gap becomes 24, and serif prose takes leading-prose'],
  ['src/components/HeroSection.astro', 'mt-5 sm:mt-8 sm:flex', 'mt-6 sm:mt-8 sm:flex', 1,
    '20px → 24px (S3 has no 20)'],
  ['src/components/HeroSection.astro', "'text-base uppercase tracking-wide mb-4'", "'text-label uppercase tracking-wide mb-4'", 1,
    'the kicker is a chrome label, not body copy: 16 → 13.3'],
  ['src/components/HeroSection.astro', "'rounded-lg overflow-hidden'", "'rounded-card overflow-hidden'", 1,
    'radius has two roles, both 6px; 8px is Tailwind\'s ramp'],

  ['src/components/WhyJoinUs.astro', 'text-3xl leading-9 font-extrabold text-gray-900 sm:text-4xl sm:leading-10', 'text-heading font-extrabold text-gray-900 sm:text-4xl sm:leading-10', 1,
    '30 → 27.7 with the same 36px line box; the sm:text-4xl step waits for the batch-4 ramp'],
  ['src/components/WhyJoinUs.astro', 'mt-4 text-xl leading-7 text-gray-600 font-body', 'mt-4 text-lede leading-prose text-gray-600 font-body', 1,
    '20 → 19.2; leading-7 (28) becomes the serif prose rule (1.6 × 19.2 = 30.7)'],
  ['src/components/WhyJoinUs.astro', 'bg-white rounded-lg p-6', 'bg-white rounded-card p-6', 6,
    'card radius: 8 → 6. Colour waits for batch 3 (bg-white is not paper).'],
  ['src/components/WhyJoinUs.astro', 'ml-3 text-xl font-semibold text-gray-900', 'ml-3 text-lede font-semibold text-gray-900', 6,
    'card title = lede in the role table; 20 → 19.2'],
  ['src/components/WhyJoinUs.astro', 'class="text-gray-600 font-body"', 'class="text-body leading-prose text-gray-600 font-body"', 6,
    'the card body had no size write at all (it inherited 16px and 1.5); naming it body makes the step explicit and takes the serif leading'],

  ['src/components/JoinCommunity.astro', 'mt-4 text-xl text-gray-600 font-body', 'mt-4 text-lede leading-prose text-gray-600 font-body', 1,
    'lede, 20 → 19.2, serif leading'],
  ['src/components/JoinCommunity.astro', 'mt-12 bg-blue-50 rounded-lg overflow-hidden', 'mt-12 bg-blue-50 rounded-card overflow-hidden', 1,
    'panel radius 8 → 6; the fill is batch 3'],
  ['src/components/JoinCommunity.astro', 'text-2xl font-semibold text-gray-900 mb-4', 'text-subhead font-semibold text-gray-900 mb-4', 1,
    '24 → 23, line box 28 either way'],
  ['src/components/JoinCommunity.astro', 'space-y-4 text-gray-600', 'space-y-4 text-body leading-prose text-gray-600', 1,
    'list items were unsized; named body + serif leading'],
  ['src/components/JoinCommunity.astro', 'class="text-gray-600 mb-6"', 'class="text-body leading-prose text-gray-600 mb-6"', 1,
    'same: unsized prose gets the step and the serif leading'],

  ['src/components/Footer.astro', "class='text-xl text-center mb-4'", "class='text-lede text-center mb-4'", 1,
    '20 → 19.2. The ∑ glyph keeps its size write until the batch-4 ramp: it is the identity mark (D96), not a heading.'],

  ['src/components/DiscordSummary.svelte', 'class="text-sm text-gray-500"', 'class="text-label text-gray-500"', 1,
    'the bot/freshness line is meta = label (14 → 13.3); colour is batch 3'],
  ['src/components/DiscordSummary.svelte', 'text-lg font-semibold text-gray-800 mb-4', 'text-lede font-semibold text-gray-800 mb-4', 1,
    '18 → 19.2'],
  ['src/components/DiscordSummary.svelte', 'bg-gray-50 rounded-lg overflow-hidden border border-gray-200', 'bg-gray-50 rounded-card overflow-hidden border border-gray-200', 1,
    'card radius 8 → 6; the border is batch 3 (keylines are inset shadows)'],
  ['src/components/DiscordSummary.svelte', 'bg-red-50 rounded-lg p-8 text-center', 'bg-red-50 rounded-card p-8 text-center', 1,
    'radius only. This block becomes a real notice state in batch 4 (D102/D108).'],
  ['src/components/DiscordSummary.svelte', 'bg-blue-50 rounded-lg p-8 text-center', 'bg-blue-50 rounded-card p-8 text-center', 1,
    'radius only. This block becomes the empty state in batch 4 (D108).'],

  ['src/pages/404.astro', 'class="text-base uppercase tracking-wide mb-4"', 'class="text-label uppercase tracking-wide mb-4"', 1,
    'chrome kicker'],
  ['src/pages/404.astro', 'text-lg text-gray-600 mb-12 max-w-2xl mx-auto', 'text-lede leading-prose text-gray-600 mb-12 max-w-2xl mx-auto', 1,
    'lede + serif leading'],
  ['src/pages/404.astro', 'class="text-sm text-gray-500 mt-16"', 'class="text-label text-gray-500 mt-16"', 1,
    'meta = label'],

  ['src/pages/chat.astro', 'class="text-base uppercase tracking-wide mb-4"', 'class="text-label uppercase tracking-wide mb-4"', 1,
    'chrome kicker'],
  ['src/pages/chat.astro', 'text-3xl font-bold text-gray-900 mb-4', 'text-heading font-bold text-gray-900 mb-4', 1,
    '30 → 27.7 (the same 36px line box)'],
  ['src/pages/chat.astro', 'text-lg text-gray-600 mb-6 max-w-2xl mx-auto', 'text-lede leading-prose text-gray-600 mb-6 max-w-2xl mx-auto', 1,
    'lede + serif leading'],
  ['src/pages/chat.astro', 'mt-16 bg-blue-50 rounded-xl p-8', 'mt-16 bg-blue-50 rounded-card p-8', 1,
    '12px radius is not a role; card = 6px'],
];

const byFile = new Map();
for (const [file, from, to, n, why] of TABLE) {
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push({ from, to, n, why });
}

let failed = 0;
for (const [file, rows] of byFile) {
  let text = readFileSync(file, 'utf8');
  for (const r of rows) {
    const hits = text.split(r.from).length - 1;
    if (hits !== r.n) {
      console.error(`FAIL ${file}: expected ${r.n} occurrence(s) of\n  ${r.from}\nfound ${hits}. Nothing was written for this row.`);
      failed++;
      continue;
    }
    text = text.split(r.from).join(r.to);
  }
  if (!DRY) writeFileSync(file, text);
  console.log(`${DRY ? 'would edit' : 'edited'} ${file} (${rows.length} rows)`);
}
if (failed) { console.error(`${failed} row(s) did not match — no file was written for those rows`); process.exit(1); }
console.log(`\n${TABLE.length} renames applied${DRY ? ' (dry run)' : ''}`);
