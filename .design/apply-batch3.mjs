// apply-batch3.mjs — batch 3 of design-apply: palette -> named roles, and the control grammar.
//
// This is the batch where the site changes colour. Two things move together, deliberately:
//   1. Every palette write (gray-*, blue-*, red-*, pink-*, book-*) becomes a named role from @theme.
//   2. Every CTA becomes one of the two ratified control grammars, because a control's fill, label
//      size, pad, radius and focus ring are ONE arithmetic: height = measured line box + 2 x an S3
//      pad (DESIGN.md "Controls — heights are derived, not chosen"). Renaming only its colour would
//      leave `text-base` + py-3 + border-transparent producing the 50/58/62px triple the artifact
//      shipped, which is the thing the controls table exists to prevent.
//
// Control grammar, from DESIGN.md's Buttons table:
//   primary   bg-ink, label text-band-text, 48px  = text-label (16px line box) + 2 x py-4 (16)
//             hover:bg-ink-hover (measured: 7.33 under band-text, 1.39 over resting ink)
//   secondary bg-paper, inset-shadow-rule, label text-ink, 40px = 16 + 2 x py-3 (12), hover:bg-tint
//   focus     focus-visible:outline-2 + outline-offset-2 + outline-gold on paper (4.82)
//   The old secondary was `border border-gray-300` — a border adds 2px and breaks the height
//   arithmetic, so the keyline is an inset shadow (D98). `md:py-4 md:text-lg md:px-10` goes away:
//   one component family must not render at three heights.
//
// NOT in this batch (each has its own reason, all still open in .design/token-map.md):
//   * display writes (text-4xl and up) — batch 4 owns the ramp decision.
//   * DiscordSummary's error block (bg-red-50 / text-red-600) and empty block (bg-blue-50 /
//     text-gray-600) — those become the notice + empty state (D102/D108), not a colour swap.
//   * `prose prose-blue` — the typography plugin colours three element kinds through a class that is
//     not a colour utility; deleting prose-blue without writing the ramp in tokens would leave
//     Tailwind's own gray-700 prose defaults in place, i.e. the same palette in less visible clothing.
//   * the nav's one-row/nowrap narrow tier — a layout rebuild with a probe, batch 4.
//
// Run: node .design/apply-batch3.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry');

const PRIMARY = 'inline-flex items-center justify-center px-8 py-4 text-label font-semibold rounded-control text-band-text bg-ink hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold transition';

const TABLE = [
  // ---------- the page ground itself ----------
  ['src/layouts/Layout.astro', '  <body>', '  <body class="bg-paper text-ink">', 1,
    'the page has no background and no text colour write anywhere: it renders on the browser default white (measured: --color-paper oklch(98.5% .006 85) has never reached a pixel). Written as a class, not a CSS rule, so the map and check:classes can see it.'],
  ['src/layouts/Layout.astro', `      ::selection {
        background: var(--color-book-theme);
        color: white;
      }`, `      ::selection {
        /* paper on ink = 12.02, asserted in .design/grill/contrast/gen-ratify-cfg.mjs. The retired
           amber pair measured 2.06, under the 4.5 bar; the amber is delta-OKLab 0.019 from Amazon
           orange #FF9900 (D82/D88), which is why the token goes, not just this rule. */
        background: var(--color-ink);
        color: var(--color-paper);
      }`, 1,
    'the amber selection pair was the second place a theme colour rendered, and it disagreed with the rest of the site'],
  ['src/layouts/Layout.astro', `      @keyframes initAnimation {
        0% {
          transform: rotateY(0deg);
        }
        100% {
          transform: rotateY(-30deg);
        }
      }

`, '', 1, 'dead: no class in src/ references initAnimation'],
  ['src/layouts/Layout.astro', `      .ribbon {
        position: absolute;
        top: 0;
        right: 0;
        width: 150px;
        height: 30px;
        margin-right: -40px;
        margin-top: 20px;
        padding-top: 5px;
        transform: rotate(45deg); /* Standard syntax */
      }

`, '', 1, 'dead: no class="ribbon" anywhere in src/'],
  ['src/layouts/Layout.astro', `      .underline {
        background: linear-gradient(
          to top,
          var(--color-book-theme) 35%,
          transparent 35%
        );
        text-decoration: none;
      }`, `      /* The 404 page's link writes the \`underline\` utility. A GLOBAL class of the same name used
         to sit here: an amber highlighter bar with text-decoration: none, later in the cascade than
         the utility, so every "underline" on the site was painted amber and NOT underlined. It is the
         reason the class gate could not see the last amber write on the site — the appearance came
         from a <style> block, not a class. Utility wins now. */`, 1,
    'this was the last amber on the page, and it was invisible to check:classes because it was never a class write'],

  // ---------- navigation (colour only; the one-row/narrow-tier rebuild is batch 4) ----------
  ['src/components/Navigation.astro', 'class="bg-white"', 'class="bg-paper"', 1, 'the nav sits on the page ground; it is not a layer (1.04 vs paper) so it gets no keyline and no shadow'],
  ['src/components/Navigation.astro', 'class="text-2xl font-bold text-blue-600"', 'class="text-subhead font-bold text-ink"', 1,
    '24 -> 23px. The wordmark takes the text role, not a palette hue: gold is 4.82 as text and is also the caution colour, so painting the brand with it would make the accent mean two things at once.'],
  ['src/components/Navigation.astro', 'class="text-gray-900 hover:text-blue-600 font-medium"', 'class="text-label py-1 text-ink hover:text-gold font-medium"', 1,
    'nav links are the label tier (13.3) with gold on hover (4.82). py-1 is not decoration: at the label tier the link box is 16px, under the 24px minimum target, and 16 + 2 x 4 lands exactly on it'],

  // ---------- hero ----------
  ['src/components/HeroSection.astro', `class="text-blue-600">Monthly Meetups`, `class="text-ink-3">Monthly Meetups`, 1,
    'the kicker is meta, and ink-3 (5.21) is the meta role. The map\'s generic text-blue-600 row says ink; the instance is a label, so the role wins.'],
  ['src/components/HeroSection.astro', `class='text-blue-600'>Book Club`, `class='text-ink'>Book Club`, 1,
    'a headline gets its emphasis from the display step, not from a colour. gold here would measure 4.82 but would also borrow the caution colour for decoration'],
  ['src/components/HeroSection.astro', `class='w-full flex items-center justify-center px-8 py-3 text-base rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition md:py-4 md:text-lg md:px-10'`, `class='w-full flex items-center justify-center px-8 py-4 text-label font-semibold rounded-control text-band-text bg-ink hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold transition'`, 1,
    'the join path primary: 48px (16 + 2 x 16), band-text on ink (10.19), hover ink-hover (7.33), gold ring on paper. The artifact rendered 50px at sm and 58px at md for the same button. w-full/flex stay: this one sits in a stacked column under 640px.'],
  ['src/components/HeroSection.astro', `class='w-full flex items-center justify-center px-8 py-3 text-base rounded-md font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition md:py-4 md:text-lg md:px-10'`, `class='w-full flex items-center justify-center px-8 py-3 text-label font-semibold rounded-control text-ink bg-paper inset-shadow-rule hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold transition'`, 1,
    'the secondary grammar (12.02 label, 10.96 on hover fill), 40px. blue-600 on blue-100 measured 4.30 = a fail, which is why the secondary could not simply be renamed'],

  // ---------- WhyJoinUs ----------
  ['src/components/WhyJoinUs.astro', 'class="bg-gray-50 py-16"', 'class="bg-panel py-16"', 1, 'panel = a tint (1.04 vs paper), explicitly NOT a layer'],
  ['src/components/WhyJoinUs.astro', 'class="bg-white rounded-card p-6"', 'class="bg-paper rounded-card p-6"', 6,
    'cards are part of the page, so they take the page ground. No keyline: a `rule` hairline measured against a panel ground is 2.88, under the 3.0 graphic bar, so a boundary here would be illegal decoration'],
  ['src/components/WhyJoinUs.astro', 'class="text-heading font-extrabold text-gray-900 sm:text-4xl sm:leading-10"', 'class="text-heading font-extrabold text-ink sm:text-4xl sm:leading-10"', 1, 'ink (12.02)'],
  ['src/components/WhyJoinUs.astro', 'class="mt-4 text-lede leading-prose text-gray-600 font-body"', 'class="mt-4 text-lede leading-prose text-ink-2 font-body"', 1, 'ink-2 (7.02)'],
  ['src/components/WhyJoinUs.astro', 'class="ml-3 text-lede font-semibold text-gray-900"', 'class="ml-3 text-lede font-semibold text-ink"', 6, 'ink'],
  ['src/components/WhyJoinUs.astro', 'class="text-body leading-prose text-gray-600 font-body"', 'class="text-body leading-prose text-ink-2 font-body"', 6, 'ink-2'],
  ['src/components/WhyJoinUs.astro', 'class="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition md:py-4 md:text-lg md:px-10"', `class="${PRIMARY}"`, 1,
    'same primary grammar; font-semibold is legal because the label is chrome (sans), not serif'],

  // ---------- JoinCommunity ----------
  ['src/components/JoinCommunity.astro', 'class="bg-white py-16"', 'class="bg-paper py-16"', 1, 'page ground'],
  ['src/components/JoinCommunity.astro', 'class="mt-4 text-lede leading-prose text-gray-600 font-body"', 'class="mt-4 text-lede leading-prose text-ink-2 font-body"', 1, 'ink-2'],
  ['src/components/JoinCommunity.astro', 'class="mt-12 bg-blue-50 rounded-card overflow-hidden"', 'class="mt-12 bg-panel rounded-card overflow-hidden"', 1, 'panel: a tint, on the page ground, no keyline (a box has one boundary and this one is painted by its fill)'],
  ['src/components/JoinCommunity.astro', 'class="text-subhead font-semibold text-gray-900 mb-4"', 'class="text-subhead font-semibold text-ink mb-4"', 1, 'ink'],
  ['src/components/JoinCommunity.astro', 'class="space-y-4 text-body leading-prose text-gray-600"', 'class="space-y-4 text-body leading-prose text-ink-2"', 1, 'ink-2'],
  ['src/components/JoinCommunity.astro', 'class="flex-shrink-0 h-6 w-6 text-blue-600"', 'class="flex-shrink-0 h-6 w-6 text-ink"', 3,
    'a graphic needs 3.0 against the ground: blue-600 was 4.5 and passed, but the icon is not carrying information on its own — the word beside it is — so it takes the text role'],
  ['src/components/JoinCommunity.astro', 'class="text-body leading-prose text-gray-600 mb-6"', 'class="text-body leading-prose text-ink-2 mb-6"', 1, 'ink-2'],
  ['src/components/JoinCommunity.astro', 'class="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition"', `class="${PRIMARY}"`, 1,
    'this CTA had NO focus writes at all — a keyboard visitor got the browser default. It now carries the gold ring like every other control.'],
  ['src/components/JoinCommunity.astro', 'class="ml-2 -mr-1 w-5 h-5"', 'class="ml-2 -mr-1 w-4 h-4"', 1,
    'icon sizes come off the same 4px ladder: 20px is not a step; 16px sits with the 13.3px label it stands beside'],

  // ---------- 404 ----------
  ['src/pages/404.astro', 'class="text-blue-600">404', 'class="text-ink-3">404', 1, 'meta role'],
  ['src/pages/404.astro', 'class="text-4xl font-extrabold text-gray-900 mb-6"', 'class="text-4xl font-extrabold text-ink mb-6"', 1, 'ink; the display step waits for the batch-4 ramp'],
  ['src/pages/404.astro', 'class="text-lede leading-prose text-gray-600 mb-12 max-w-2xl mx-auto"', 'class="text-lede leading-prose text-ink-2 mb-12 max-w-2xl mx-auto"', 1, 'ink-2'],
  ['src/pages/404.astro', 'class="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition"', `class="${PRIMARY}"`, 1,
    '60px -> 48px, and the ring appears (this page shipped no focus writes either)'],
  ['src/pages/404.astro', 'class="inline-flex items-center justify-center px-8 py-4 border border-gray-300 text-lg font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"', `class="inline-flex items-center justify-center px-8 py-3 text-label font-medium rounded-control text-ink bg-paper inset-shadow-rule hover:bg-tint transition"`, 1,
    'secondary grammar, 40px. The 2px border is what made this button 62px while its sibling was 60px.'],
  ['src/pages/404.astro', 'class="text-label text-gray-500 mt-16"', 'class="text-label text-ink-3 mt-16"', 1, 'meta'],
  ['src/pages/404.astro', 'class="underline text-gray-700"', 'class="underline text-ink-2 hover:text-gold"', 1,
    'an inline link: colour plus the underline, never colour alone. The underline is now Tailwind\'s utility instead of the global amber highlighter of the same name.'],

  // ---------- chat ----------
  ['src/pages/chat.astro', 'class="text-blue-600">Community Chat', 'class="text-ink-3">Community Chat', 1, 'meta role'],
  ['src/pages/chat.astro', 'class="text-4xl font-extrabold text-gray-900 mb-12"', 'class="text-4xl font-extrabold text-ink mb-12"', 1, 'ink; display step waits for batch 4'],
  ['src/pages/chat.astro', 'class="mt-16 bg-blue-50 rounded-card p-8"', 'class="mt-16 bg-panel rounded-card p-8"', 1, 'panel'],
  ['src/pages/chat.astro', 'class="text-heading font-bold text-gray-900 mb-4"', 'class="text-heading font-bold text-ink mb-4"', 1, 'ink'],
  ['src/pages/chat.astro', 'class="text-lede leading-prose text-gray-600 mb-6 max-w-2xl mx-auto"', 'class="text-lede leading-prose text-ink-2 mb-6 max-w-2xl mx-auto"', 1, 'ink-2'],
  ['src/pages/chat.astro', 'class="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition"', `class="${PRIMARY}"`, 1, 'primary grammar, 48px, with the focus ring it never had'],
  ['src/pages/chat.astro', 'class="h-5 w-5 ml-2"', 'class="h-4 w-4 ml-2"', 1, 'icon size onto the ladder, matched to the label beside it'],

  // ---------- footer: the one dark band ----------
  ['src/components/Footer.astro', `class='bg-book-gray text-gray-50 py-12 flex flex-col justify-center items-center'`, `class='bg-ink text-band-text py-12 flex flex-col justify-center items-center'`, 1,
    'book-gray #1a1a1c was a 2024 template leftover; the band is `ink` (oklch 32% .045 152, the same hue family as the text) with band-text at 10.19'],
  ['src/components/Footer.astro', `class='text-3xl text-pink-400 love'`, `class='text-3xl text-gold-on-ink love'`, 1,
    'TRAP the map flagged: plain `gold` on the ink band measures 2.50 = an invisible glyph. Only gold-on-ink (5.80) crosses there.'],

  // ---------- the discord island (state blocks wait for batch 4) ----------
  ['src/components/DiscordSummary.svelte', 'class="bg-gray-50 rounded-card overflow-hidden border border-gray-200"', 'class="bg-panel rounded-card overflow-hidden inset-shadow-rule"', 1,
    'panel fill + one inset keyline (rule vs paper = 3.01). The border cost 2px of layout and was the last border keyline in src/.'],
  ['src/components/DiscordSummary.svelte', 'class="px-4 py-3 bg-gray-100 border-b border-gray-200"', 'class="px-4 py-3"', 1,
    'a box has exactly one boundary: the card already has its keyline, so the header strip keeps spacing (12/16) and drops both its fill and its border-b'],
  ['src/components/DiscordSummary.svelte', 'class="font-medium text-gray-800"', 'class="text-label font-medium text-ink"', 1,
    'a channel name is chrome: the label tier plus the ink role (7.02 -> 12.02)'],
  ['src/components/DiscordSummary.svelte', 'class="text-lede font-semibold text-gray-800 mb-4"', 'class="text-lede font-semibold text-ink mb-4"', 1, 'ink'],
  ['src/components/DiscordSummary.svelte', 'class="text-label text-gray-500"', 'class="text-label text-ink-3"', 1,
    'the dated line is the freshness role: ink-3, and the numbers stay tabular when the date component lands in batch 4'],

  // ---------- the three colour writes the first pass of this table missed ----------
  ['src/components/HeroSection.astro', `class='mt-1 text-4xl tracking-tight leading-10 font-extrabold text-gray-900 sm:leading-none sm:text-6xl lg:text-5xl xl:text-6xl'`, `class='mt-1 text-4xl tracking-tight leading-10 font-extrabold text-ink sm:leading-none sm:text-6xl lg:text-5xl xl:text-6xl'`, 1,
    'ink (12.02) on the page h1. The display writes stay: the ramp is batch 4, the colour is now.'],
  ['src/components/HeroSection.astro', `class='mt-3 text-lede leading-prose text-gray-500 sm:mt-6 font-body'`, `class='mt-3 text-lede leading-prose text-ink-2 sm:mt-6 font-body'`, 3,
    "the map's gray-500 row says ink-3 (meta, the dated line) and that is right at 11-13px. These three are 19.2px prose under a headline, so the instance takes ink-2 (7.02); gray-500 measured 4.6, one hair above the 4.5 bar."],
  ['src/components/JoinCommunity.astro', 'class="text-4xl font-extrabold text-gray-900 sm:text-5xl"', 'class="text-4xl font-extrabold text-ink sm:text-5xl"', 1, 'ink; the 36/48px display step is batch 4'],
];

const byFile = new Map();
for (const [file, from, to, n, why] of TABLE) {
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push({ from, to, n, why });
}
let failed = 0;
const whys = [];
for (const [file, rows] of byFile) {
  let text = readFileSync(file, 'utf8');
  for (const r of rows) {
    const hits = text.split(r.from).length - 1;
    if (hits !== r.n) {
      console.error(`FAIL ${file}: expected ${r.n}, found ${hits} for:\n${r.from.slice(0, 160)}`);
      failed++;
      continue;
    }
    text = text.split(r.from).join(r.to);
    whys.push(`${file}: ${r.why}`);
  }
  if (!DRY) writeFileSync(file, text);
  console.log(`${DRY ? 'would edit' : 'edited'} ${file} (${rows.length} rows)`);
}
if (failed) { console.error(`${failed} row(s) did not match`); process.exit(1); }
writeFileSync('.design/tmp-batch3-whys.txt', whys.join('\n') + '\n');
console.log(`\n${TABLE.length} rewrites applied${DRY ? ' (dry run)' : ''}; whys written to .design/tmp-batch3-whys.txt`);
