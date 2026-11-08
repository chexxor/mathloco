// round17-options.mjs — the option table for grill round 17: the header bar, and the club name painted twice.
//
// The operator's brief (2026-11-08): "Matheapolis" appears in the header bar AND as the large text at the top of
// the first body section, which reads as a duplicate; and the header's type is too small, and the bar is not
// distinguishable from the page body on desktop, so its different purpose is not visible.
//
// What the tree measures before any option (`design/grill/header-measure.js` on the built page, 2026-11-08): the
// name is painted 4x on the landing page (nav mark, h1, footer link, footer small print) and 2x inside the first
// viewport at 1240; the nav identity item is 96.6x40 at 17.6px PT Serif; the h1 is 672x56 at 52.4px Public Sans;
// the header box is 1228x72 on the SAME painted ground as the page ([252,250,246]) with 96px of air below it to
// the top of the h1.
//
// SHAPE OF AN OPTION. `mutations` are exact string pairs against the BUILT page (round 16's model): a `from` that
// is not found throws, so an option cannot quietly price nothing when the markup moves under it. A type step is
// written as CSS through the ramp tokens (`css`), not as a class the build does not emit - round 16's lesson is
// that pricing a utility Tailwind never generated measures a missing rule (a `sm:text-display-4` option came back
// -16px while painting display-1). The runner then asserts the step ARRIVED, by measuring the rendered size
// against the token value read out of the built CSS.
//
// The rules these options run into, quoted from DESIGN.md - they are why this is a round and not an edit:
//   - "The nav is one row at every width, `flex-wrap: nowrap`, one type tier at every width": links at text-label,
//     16px gaps, targets 32px tall (16px line box + py-2). A second tier needs a ratified token -
//     `--breakpoint-nav-narrow` (370px) and the text-micro tier were retired in D117 - and "an arbitrary
//     min-[…]: / max-[…]: bracket in live markup is banned outright, because the gates read tokens and a bracket
//     writes nothing to any token".
//   - "Identity, not a locator: the club name in text-body serif at every width, never a display step (D112 - the
//     display step belongs to a screen's locator, never to a punchline)".
//   - the row needs 217px against 276 offered at the 320 floor (D100's probe); `check:render` fails a row that
//     stops fitting rather than letting it re-wrap.
//   - there is no border anywhere in `src/`: the ratified keyline is `inset-shadow-rule`, a 1px inset ring, and
//     `check:render` fails a painted 1px border/outline whose contrast is over 1.4, while `check:ground` fails a
//     keyline straddling two grounds. "Draw a line under the header" is therefore not an available device here.

export const RAMP_TOKENS = {
  label: ['--text-label', '--text-label--line-height'],
  body: ['--text-body', '--text-body--line-height'],
  lede: ['--text-lede', '--text-lede--line-height'],
  subhead: ['--text-subhead', '--text-subhead--line-height'],
};

// The built nav, exactly as Astro writes it (double quotes, one line, comments between the elements).
const HEADER_OPEN = '<header class="bg-paper">';
const NAV_MARK = '<a href="/" class="flex-shrink-0 whitespace-nowrap py-2 font-body text-body text-ink" aria-label="Matheapolis, home">Matheapolis</a>';
const NAV_LABEL = '<a href="/schedule" class="whitespace-nowrap py-2 text-label text-ink font-medium hover:text-gold" aria-label="Navigate to Schedule">Schedule</a>';
const LANE = '<div class="text-label uppercase tracking-wide mb-4"><span class="text-ink-3">Minneapolis math club</span></div>';
const H1 = '<h1 class="mt-1 text-display-1 tracking-tight font-extrabold text-ink sm:text-display-3">Matheapolis</h1>';

// A type step through the tokens, at the `sm:` flip the page already uses (640px is where the h1 steps
// display-1 -> display-3). Targeted by the nav's own aria-labels, so the identity item and the path labels
// cannot be confused for each other the way a `.mathloco-nav a` rule would confuse them.
const stepCss = ({ labels, mark }) => `<style>
@media (min-width:640px){
${labels ? `  nav a[aria-label^="Navigate to"]{font-size:var(${RAMP_TOKENS[labels][0]});line-height:var(${RAMP_TOKENS[labels][1]})}` : ''}
${mark ? `  nav a[aria-label="Matheapolis, home"]{font-size:var(${RAMP_TOKENS[mark][0]});line-height:var(${RAMP_TOKENS[mark][1]})}` : ''}
}
</style>`;

// A candidate GROUND is written as a namespaced token plus a class, never as an inline style: round 9's rule (D129)
// is that a candidate colour is not a role until the operator rules it, and a class is what would actually ship.
// The mutation drops `bg-paper` so the candidate class is the only ground on the bar; the runner then measures the
// bytes Firefox paints and derives the layer contrast and the role contrasts from them (round17.mjs, groundReport).
const groundCss = (name, value) => `<style>:root{--w-${name}:${value}}.bg-w-${name}{background-color:var(--w-${name})}</style>`;
const warmGround = (name, value) => ({
  where: 'Layout.astro `header`', from: HEADER_OPEN, to: `<header class="bg-w-${name}">`,
});

// ---- The colour half of the brief (operator, 2026-11-08): "I think we could use the amber/gold color, rather
// than that odd teal/aqua color." Every ground below is priced on the built page, so the answer is a photograph
// and a number, not an opinion about warmth.

// ---- The second half of the brief (operator, 2026-11-08, mid-round): "there is duplication between the 'How it
// works' section on the homepage and the very first section, 'We meet around a table…'". The probe now names the
// pairs on the artifact rather than on reading (`out.sentences.duplicatePairs`): three pairs fire on the shipped
// page, at Jaccard/overlap 0.444/1, 0.273/0.5 and 0.2/0.5 -
//   hero y248  "Dates go up on Meetup; most of the arguing happens in the chat between meetings."
//   band y2427 "A date and its place go up on Meetup; the discussion keeps running between meetings in the chat."
//   hero y407  "There is no syllabus, no reading list to keep up with, and no current focus." / "What the club is
//              pulling on is decided in its own chat, and some of the threads open there are further down this page."
//   section y872 "Threads that are open in the club's chat. This is not a syllabus and there is nothing to keep up with: …"
// Every option below is a DELETION of a whole sentence, never a rewording. That is a rule, not a convenience: the
// sentences are sourced (`src/content.json` `venues`, `membership`; the hero's clauses come from operator rulings in
// D239/D243/D248), and a mutation that writes new wording would price copy the operator has not ruled. A deletion can
// be measured; a reword has to be approved first. Where a deletion leaves a sentence grammatically stranded, the
// option says so instead of quietly rewriting it.
const HERO_LEDE_1_TAIL = ' Dates go up on Meetup; most of the arguing happens in the chat between meetings.';
const BAND_P1_TAIL = ' A date and its place go up on Meetup; the discussion keeps running between meetings in the chat.';
const HERO_LEDE_2_THREADS = 'What the club is pulling on is decided in its own chat, and some of the threads open there are further down this page. ';
const HERO_LEDE_2_SYLLABUS = 'There is no syllabus, no reading list to keep up with, and no current focus. ';
const SECTION_THREADS_OPENER = "Threads that are open in the club's chat. ";
const BAND_P2_HOMEWORK = 'Nobody hands you homework and there is no level to clear. ';

export const OPTIONS = [
  {
    label: 'shipped',
    title: 'the page as it is (the baseline every other row is priced against)',
    what: 'no mutation.',
    surfaces: 'Here so that "cheaper" and "bigger" have something to be measured against, and because this is the state the shipped gates green on.',
    gate: 'Green today: `npm run verify` 24 ok / 0 failed, and `check:render` passes the nav row (217px needed of 276 offered at 320).',
    mutations: [],
  },

  {
    label: 'chrome-ground',
    title: 'the header gets its own ground; nothing else moves',
    what: '`<header class="bg-paper">` → `<header class="bg-tint">`. Type, gaps, the h1 and the name count are untouched.',
    surfaces: 'One device, one token. This design language separates surfaces by GROUND, not by a drawn line - there is no border in `src/` at all, and a painted 1px hairline is a gate FAIL. `tint` is ratified as a hover fill that carries ink (10.96) and never gold (4.39 = FAIL), so using it as a persistent band extends a role rather than adding a colour: it needs a line in DESIGN.md and a `token-map` entry. Cheapest row in the round - one class.',
    gate: 'Passes `check:render` untouched (no nav, control or band rule is touched; `tint` is not a dark ground, so the one-dark-band rule is not reached). `check:ground` re-reads the page grounds and would report the second light band; a keyline across the edge is what would trip its straddle rule, and this option draws none.',
    mutations: [{ where: 'Layout.astro `header`', from: HEADER_OPEN, to: '<header class="bg-tint">' }],
  },

  {
    label: 'chrome-ground-warm',
    title: "the bar gets a warm ground: the tint's lightness and chroma, gold's hue",
    what: '`<header class="bg-paper">` → a candidate `--w-warm: oklch(95% .03 62)` — the same L and C as `tint`, hue moved from 152° (the ink family) to 62° (gold’s hue). Nothing else moves.',
    surfaces: 'The like-for-like answer to "swap the aqua for amber": identical weight, opposite temperature. It is not a new token in @theme, so it is priced as a `--w-*` candidate exactly as round 9 namespaces candidates (D129). What it does to the roles is what the record measures: ink still clears (10.81), but `gold` on it is 4.33 and `rule` is 2.70 — both under their bars, and worse than on tint (4.39 / 2.74). Warmth is not free in a palette whose only boundary role is `rule`.',
    gate: "The `tint` role extension is the same one `chrome-ground` needs (a DESIGN.md line + a `token-map` entry), plus a new candidate token the operator has to ratify or reject. No keyline is drawn, so `check:ground`'s straddle rule is not reached.",
    mutations: [warmGround('warm', 'oklch(95% .03 62)')],
    css: groundCss('warm', 'oklch(95% .03 62)'),
  },

  {
    label: 'chrome-ground-warm-band',
    title: 'a warm ground strong enough to see: oklch(93% .05 62)',
    what: 'The bar painted at L 93, C .05, hue 62 — warm enough to register as a band rather than a whisper.',
    surfaces: 'The chroma is over the 0.04 "chromatic" bar `check:color` reads from the census, so this is the first header ground on this site the census would call a colour (tint at C .03 sits under it: D129 measured 46.9% faint / 0.5% strong). The cost is on the roles: layer-vs-page 1.20 (still under the 1.35 layer bar), ink-3 4.35 - the meta tier drops under the 4.5 text bar - gold 4.03, rule 2.51.',
    gate: 'Any box inside this bar that carries a `rule` ring fails the straddle and under-bar rules of `check:render` (record 0018) the same way a tinted box does, at a worse number.',
    mutations: [warmGround('band', 'oklch(93% .05 62)')],
    css: groundCss('band', 'oklch(93% .05 62)'),
  },

  {
    label: 'chrome-ground-gold-fill',
    title: 'the bar painted with the gold token itself (priced to be refused)',
    what: '`<header class="bg-paper">` → a candidate `--w-goldband: var(--color-gold)` — `oklch(55% .12 62)`, the ratified gold, used as a surface.',
    surfaces: 'The literal version of "use the amber", priced because D88 already settled it once: gold is a mark in this system, not a ground — "gold as ink is brand-neutral; gold as a bright fill is not, and cannot be." The record prints what ink on that fill measures (2.50) so the refusal is a number rather than a rule citation.',
    gate: 'Ink text on it is 2.50 against the 4.5 text bar. The contrast oracle in `check:render` measures text against its painted ground, so the shipped gate is expected to FAIL this row - kept in the record for that reason.',
    mutations: [warmGround('goldband', 'var(--color-gold)')],
    css: groundCss('goldband', 'var(--color-gold)'),
  },

  {
    label: 'chrome-ink-warm',
    title: "the ground stays paper; the bar’s ink is warmed to gold's hue",
    what: 'The bar keeps `bg-paper`; a class `ink-warm` on the header re-declares `--color-ink`, `--color-ink-2`, `--color-ink-3` and `--color-rule` inside the bar at hue 62 instead of 152. Same lightness, same chroma, warmth instead of teal. No ground change.',
    surfaces: 'This is the direct answer to "that odd teal": the bar is not teal by accident, it is `ink`, and every ink in the palette sits at hue 152. Warmed ink on paper measures 12.37 (cool ink 12.02) - legibility is not the problem. The problem is D88: warm ink at L 32 C .045 H 62 lands 0.063 OKLab from UPS brown #351C15, inside the 0.135 commerce-brand zone. And the reserved join-path hues move closer to it: discord (35°) is 27° away and mobilizon (105°) is 43° away, under the >=47° separation `src/styles/global.css` writes for the path hues. Warming ink is a palette ruling, not a header tweak.',
    gate: 'Nothing in @theme changes; the override is a class the build would emit, scoped to the header. `check:render’s oracle reads warm ink on paper at 12.37, so this row is expected to pass the shipped gate.',
    mutations: [{ where: 'Layout.astro `header`', from: HEADER_OPEN, to: '<header class="bg-paper ink-warm">' }],
    css: '<style>.ink-warm{--color-ink:oklch(32% 0.045 62);--color-ink-2:oklch(45% 0.035 62);--color-ink-3:oklch(52% 0.028 62);--color-rule:oklch(65.5% 0.03 62)}</style>',
  },

  {
    label: 'chrome-ground-panel',
    title: 'the warm ground the palette already has: `panel`',
    what: '`<header class="bg-paper">` → `<header class="bg-panel">` — `oklch(97% .008 85)`, a ratified role, same hue as paper.',
    surfaces: 'Warmth with no new token and no new hue: `panel` is paper’s own hue, so the bar goes warmer rather than greener. It is also the weakest of the four grounds (1.04 against paper) and puts `rule` at 2.88, under the 3.0 graphic bar — DESIGN.md already says a tint was never doing the separation a ring does.',
    gate: 'No new token, so no DESIGN.md extension is needed — `panel` is already a ratified role. The rule that still applies is the one DESIGN.md writes for it: nothing `rule`-ringed may sit inside it.',
    mutations: [{ where: 'Layout.astro `header`', from: HEADER_OPEN, to: '<header class="bg-panel">' }],
  },

  {
    label: 'nav-name-gold',
    title: 'the ground stays paper; the bar’s name is painted gold',
    what: 'The nav identity item’s colour goes `ink` → `gold` through the token (`color:var(--color-gold)` on the nav’s own aria-label selector). No ground change.',
    surfaces: 'Gold where the palette already allows gold: on paper, at 4.82, over the 4.5 text bar. It answers "use the amber in the header" without touching a ground at all. The question it raises is a grammar one, not a contrast one — DESIGN.md assigns gold to "quiet action, notice word, caution keyline", and D112-line reasoning removed the gold `Math` from the mark because a coined word has no boundary to colour. The record shows the pixels; the ruling is about what gold means here.',
    gate: 'No token changes, no keyline changes. The contrast oracle in `check:render` reads it at rest (4.82 on paper), so this row is expected to pass the shipped gate.',
    mutations: [],
    css: `<style>nav a[aria-label="Matheapolis, home"]{color:var(--color-gold)}</style>`,
  },

  {
    label: 'chrome-ground-step',
    title: 'own ground AND a desktop type step: labels at body, the name at lede, from 640 up',
    what: 'Header on `bg-tint`; at ≥640 the path labels go text-label → **text-body** (13.3/16 → 17.6/24) and the identity item goes text-body → **text-lede** (17.6/24 → 21.1/28). Below 640 nothing moves, so the 320 floor and the 217px row arithmetic are untouched.',
    surfaces: 'The option that answers both halves of the brief: the ground says "this bar is chrome", the type says "chrome you can read at arm\'s length on a desktop". It is also the only option in the round that collides with a ratified rule, and the collision is the reason it is priced rather than applied.',
    gate: 'Three edits before this can ship, in this order: (1) re-ratify a nav tier **token** - DESIGN.md bans a `min-[…]:` bracket in live markup and `check:render` reads the tier boundary out of the token block (D117 retired `--breakpoint-nav-narrow`; a second tier is exactly the case it was retired for, so it comes back with a number and a reason); (2) teach the `check:render` tier probe the second tier, which today fails any nav mixing tiers in one viewport; (3) correct DESIGN.md\'s nav block, including "the club name in text-body serif at every width" - lede is not a display step, but "at every width" is the sentence that breaks. Then re-quote the 217px figure: it is the 320 number, and this option grows the row above 640 (measured in the record).',
    mutations: [{ where: 'Layout.astro `header`', from: HEADER_OPEN, to: '<header class="bg-tint">' }],
    css: stepCss({ labels: 'body', mark: 'lede' }),
    step: { labels: 'body', mark: 'lede' },
  },

  {
    label: 'nav-step-only',
    title: 'the desktop type step with no ground change (isolates which device does the work)',
    what: 'The same type step as `chrome-ground-step`; the header stays `bg-paper`.',
    surfaces: 'Prices the two devices apart. If this row alone makes the bar read as chrome, the palette stays untouched and the ground is not needed. If it does not, the delineation is a ground question and the type step is only about legibility - which is a different ruling with a different cost.',
    gate: 'The same three edits as `chrome-ground-step`, without the `tint` role extension.',
    mutations: [],
    css: stepCss({ labels: 'body', mark: 'lede' }),
    step: { labels: 'body', mark: 'lede' },
  },

  {
    label: 'name-lockup',
    title: 'the name and the descriptor become one object in the h1; the label lane above goes',
    what: 'The h1 becomes "Matheapolis" with "a Minneapolis math club" as a second line inside it at text-subhead (25.3/32); the uppercase label lane above the h1 is deleted. The nav mark is untouched.',
    surfaces: 'The duplicate the operator is pointing at is two mentions of one word with nothing tying them together. This makes the pair one object, so the hero stops being the same phrase at a different size and the small serif mark reads as chrome by contrast. It is the `subline` option already priced in `design/grill/copy-options.mjs` (+40/+40/+72/+88 of page height there), with the lane\'s job absorbed into the h1. The h1\'s accessible name becomes "Matheapolis, a Minneapolis math club" - the phrase `<title>`, `og:title` and `twitter:title` already carry, which is the coupling `npm run check:copy` guards (D248).',
    gate: 'Re-maps the slots `check:copy` couples: the descriptor stops being `const locator` and becomes part of the h1, so `slot-coupling` goes from three files to two and `lane-stays-undated` retires with the lane - the gate changes before the copy does. `check:render`\'s one-display-step rule still holds (the second line is a ramp step, not a display step), and the `text-subhead` step is already emitted by the build.',
    mutations: [
      { where: 'HeroSection.astro label lane', from: LANE, to: '' },
      { where: 'HeroSection.astro h1', from: H1, to: '<h1 class="mt-1 text-display-1 tracking-tight font-extrabold text-ink sm:text-display-3">Matheapolis<span class="block mt-1 font-semibold text-subhead tracking-normal">a Minneapolis math club</span></h1>' },
    ],
  },

  {
    label: 'descriptor-owns-display',
    title: 'the descriptor takes the display step; the name becomes the identity line above it',
    what: 'h1 = "A Minneapolis math club" at the display step; the name moves to the line above it in `font-body` at text-lede (21.1/28) serif. Nav unchanged.',
    surfaces: 'The D112-consistent reading of the brief: the display step belongs to a screen\'s *locator*, and today the display step is the name - the punchline. It also puts the searchable phrase in the h1, the one SEO lever this page has that a coined wordmark does not, and it makes the pun legible: the reader sees Minneapolis, then sees the word built out of it. The cost is the exact opposite of the lockup\'s: the coined name stops being the largest thing on the page, and a coined name has to be seen to be learned.',
    gate: 'Re-maps `check:copy`\'s three slots the other way (the lane becomes the name, the h1 becomes the descriptor) and confirms rather than breaks the display-step rule. `check:render`\'s longest-word fit table then binds a different word: display-3\'s fit is 309.3px of box against 276 at 320 and 346 at 390, and the longest word of the new h1 is "Minneapolis", not "Matheapolis" - so the phone fold has to be re-measured before this is called free.',
    mutations: [
      { where: 'HeroSection.astro label lane', from: LANE, to: '<div class="font-body text-lede text-ink">Matheapolis</div>' },
      { where: 'HeroSection.astro h1', from: H1, to: '<h1 class="mt-1 text-display-1 tracking-tight font-extrabold text-ink sm:text-display-3">A Minneapolis math club</h1>' },
    ],
  },

  {
    label: 'nav-glyph',
    title: 'the nav drops the wordmark and carries the drawn mark instead (priced to be refused)',
    what: 'The nav identity item becomes the shipped sphere mark, reused from the built page at a 24px box, `aria-label="Matheapolis, home"` unchanged. The wordmark text goes.',
    surfaces: 'The literal answer to "the name appears twice", priced because it is the option a reader suggests first and it dies on a measurement rather than on taste: D119 asserts only what a pixel can resolve at the size you measure at. The mark\'s thinnest stroke is declared in viewBox units; the record prints what that becomes in device px in a 24px nav box, beside the hero\'s number at its own box.',
    gate: '`check:render` measures `swDevice` for every shape of every `svg[data-mark]` and fails a stroke under 1px. DESIGN.md also names the nav item "the club\'s own name… in font-body at the text-body step", and this removes the only text the nav offers as a home affordance.',
    mutations: 'glyph', // the string, not an identifier: the runner fills this from the built page's own svg[data-mark]
  },
  {
    label: 'dup-dates-chat-band-goes',
    title: 'the Meetup-and-chat sentence stays in the hero; the join band loses its twin',
    what: 'The join band\'s first paragraph loses "A date and its place go up on Meetup; the discussion keeps running between meetings in the chat." The sourced venues line and its count stay.',
    surfaces: 'The pair the probe scores at 0.273 Jaccard / 0.5 overlap - the same statement in two surfaces 2,179px apart. The band keeps what only the band can carry: the sourced venue line (`src/content.json` venues, operator 2026-11-03) and the count of places used. The hero keeps the voice.',
    gate: '`where` is Schedule.astro, not the built page: the sentence is template text beside the `venues` slot, so the shipped edit is a template line and `npm run check:content` re-reads the slot it sits next to. `check:copy` does not read this sentence today; the new duplicate rule (below) would then hold the pair open.',
    mutations: [{ where: 'Schedule.astro join band, venues paragraph', from: BAND_P1_TAIL, to: '' }],
  },

  {
    label: 'dup-dates-chat-hero-goes',
    title: 'the same sentence, deleted from the other side',
    what: 'The hero\'s first lede loses "Dates go up on Meetup; most of the arguing happens in the chat between meetings."',
    surfaces: 'The same pair, priced from the other surface, so the choice is about which page-section owns the statement rather than about which pixels move. Deleting it from the hero takes the Meetup and chat affordances out of the first viewport at 1240 (the fold copy the probe counts), where the Join/Schedule controls sit directly below.',
    gate: '`where` is HeroSection.astro\'s first lede. The hero already links Meetup and /schedule below this paragraph, so the affordance survives the deletion; `check:content` still sees the Meetup link.',
    mutations: [{ where: 'HeroSection.astro first lede', from: HERO_LEDE_1_TAIL, to: '' }],
  },

  {
    label: 'dup-threads-hero-goes',
    title: 'the threads signpost stays where the threads are; the hero stops previewing them',
    what: 'The hero\'s second lede loses "What the club is pulling on is decided in its own chat, and some of the threads open there are further down this page."',
    surfaces: 'The strongest pair in the round: 0.444 Jaccard, overlap 1.0 - every content word of the shorter sentence is in the longer one. The "What we take up" section already says the threads come from the chat and are further down. The hero keeps its no-syllabus line, its "Bring a question" line and the old-name sentence.',
    gate: 'HeroSection.astro\'s second lede. `check:cadence` / `check:content` read the threads list, not this preview, so the slot the section reads is untouched. The `focus` slot above this paragraph is empty (operator ruling 2026-11-03), which is why this sentence exists at all - deleting it means the hero says nothing about subject matter, and the section becomes the only place that does.',
    mutations: [{ where: 'HeroSection.astro second lede', from: HERO_LEDE_2_THREADS, to: '' }],
  },

  {
    label: 'dup-threads-section-goes',
    title: 'the other direction: the section stops restating the chat, the hero keeps previewing',
    what: 'The "What we take up" opener loses "Threads that are open in the club\'s chat." and opens on "This is not a syllabus and there is nothing to keep up with: …".',
    surfaces: 'Priced because it is the tempting one (it shortens the section) and it is the one with a sourcing cost: that clause is the section\'s statement of WHERE the list comes from, and `src/content.json` `threads._rule` says the list is the chat\'s, undated by design. Removing it leaves an undated list whose provenance is one scroll further away.',
    gate: 'WhyJoinUs.astro. `check:content` treats an unsourced list as a claim, and the clause is the source sentence in the copy - the gate cannot see the difference between "no provenance in the copy" and "no provenance", so this option weakens the thing the gate is for even while passing it.',
    mutations: [{ where: 'WhyJoinUs.astro section opener', from: SECTION_THREADS_OPENER, to: '' }],
  },

  {
    label: 'dup-homework-band-goes',
    title: '"no homework" is said once, in the hero',
    what: 'The join band\'s second paragraph loses "Nobody hands you homework and there is no level to clear." leaving "If you would rather hear what is being argued about before you go, the chat invite is below."',
    surfaces: 'The third pair the probe fires (0.2 / 0.5): hero "There is no syllabus, no reading list to keep up with, and no current focus." vs the band\'s no-homework line and the section\'s "This is not a syllabus…". Three surfaces each reassure the reader about obligation, in three vocabularies - syllabus, homework, level to clear. Deleting the band\'s version leaves the sentence it hangs with grammatically whole.',
    gate: 'Schedule.astro join band. The reassurance the deleted line carries is a claim about the club (no homework, no level), so its removal takes a claim out of the page rather than inventing one - the safe direction under `check:content` (D92).',
    mutations: [{ where: 'Schedule.astro join band, second paragraph', from: BAND_P2_HOMEWORK, to: '' }],
  },

  {
    label: 'dedup-hero-trims',
    title: 'the hero says each thing once: three sentences out of the two ledes',
    what: 'The hero\'s first lede loses the Meetup/chat sentence, and the second lede loses both the no-syllabus sentence and the threads signpost. The band and the section keep their versions.',
    surfaces: 'The extreme version of "the hero introduces the group", and the one that changes the fold: the hero becomes name + one lede + the two controls. It is priced because a shorter hero is what the header round is also about - the bar is trying to be chrome while the hero is trying to be an introduction, and today both are long.',
    gate: 'HeroSection.astro, both ledes. The old-name sentence ("Formerly the Minneapolis Mathematics Book Club") stays in every option in this round: it is a migration artifact with a measured cost (+28 to +61px of page) and a stated keep-for-a-season rule, not a flourish. `lane-stays-undated` and the `check:copy` slot coupling are untouched - no option here moves the descriptor.',
    mutations: [
      { where: 'HeroSection.astro first lede', from: HERO_LEDE_1_TAIL, to: '' },
      { where: 'HeroSection.astro second lede', from: HERO_LEDE_2_SYLLABUS, to: '' },
      { where: 'HeroSection.astro second lede', from: HERO_LEDE_2_THREADS, to: '' },
    ],
  },

  {
    label: 'dedup-below-trims',
    title: 'the surfaces below the hero stop repeating it: band and section each lose their twin',
    what: 'The join band loses its Meetup/chat twin and its no-homework line; the "What we take up" opener loses its chat clause. The hero is untouched.',
    surfaces: 'The direction the operator\'s wording points at ("duplication between the How it works section and the very first section" - i.e. the later surfaces are the ones repeating). What the page keeps: the hero as the single place that introduces the club, the band as the sourced facts (venues, count, roster), the section as the threads. What it risks is the sourcing cost in `dup-threads-section-goes`, which this option includes.',
    gate: 'Schedule.astro and WhyJoinUs.astro. `check:content` re-reads `venues` and `membership`, both of which survive; the threads provenance is the exposure, and it is the reason this row is not the recommendation on its own.',
    mutations: [
      { where: 'Schedule.astro join band, venues paragraph', from: BAND_P1_TAIL, to: '' },
      { where: 'Schedule.astro join band, second paragraph', from: BAND_P2_HOMEWORK, to: '' },
      { where: 'WhyJoinUs.astro section opener', from: SECTION_THREADS_OPENER, to: '' },
    ],
  },
];

export const WIDTHS = [1240, 640, 390, 320];
export const SHOT_WIDTHS = [1240, 390];
