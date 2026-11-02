# Design System

Ratified 2026-11-01 (`design-ratify`, phase 3). Decisions with their reasoning: `.notes/DECISIONS.md`
D82–D109 and `design/records/`. Machine record: `design/decisions.json` (42 keys). Every ratio below
was read back out of the Firefox renderer (`design/grill/contrast-oracle.mjs`), not computed from the
oklch by hand — where the two disagree, the renderer won and the older number is corrected in
`design/grill/contrast/gen-ratify-cfg.mjs`'s header.

Character: **playful — plurality made possible through mathematics.** Energy comes from contrast of
size, weight and colour used with intent, never from oversized-everything. Decided 2026-10-31 (round 1,
operator overrode the calm-editorial recommendation).

Tokens live in one place: `src/styles/global.css` → `@theme`. If a value is not in that block, it is
not a design value.

## Colour — named roles only

| Role | Value | Means | Measured |
|---|---|---|---|
| `paper` | `oklch(98.5% .006 85)` | the page ground | — |
| `panel` | `oklch(97% .008 85)` | a quiet fill, **not** a layer | 1.04 vs paper |
| `tint` | `oklch(95% .03 152)` | hover fill; carries ink | ink on tint 10.96 |
| `ink` | `oklch(32% .045 152)` | text, and the ground of the one dark band | 12.02 on paper |
| `ink-hover` | `oklch(40% .055 152)` | the primary button's hover fill | 7.33 under `band-text`, 1.39 over `ink` |
| `ink-2` | `oklch(45% .035 152)` | secondary text, chip label, cancelled title | 7.02 |
| `ink-3` | `oklch(52% .028 152)` | meta, the dated line, "time not set" | 5.21 |
| `rule` | `oklch(65.5% .03 152)` | the only boundary role | 3.01 on paper, 4.00 on ink |
| `gold` | `oklch(55% .12 62)` | quiet action, notice word, caution keyline | 4.82 text and keyline |
| `gold-on-ink` | `oklch(76% .06 84)` | same role on the dark band | 5.80 on ink |
| `band-text` | `oklch(93% .008 152)` | text on ink; also the primary button label | 10.19 on ink |
| `path-calendar` / `-meetup` / `-discord` / `-mobilizon` | `50/.11/205`, `47/.15/315`, `50/.14/35`, `50/.10/105` | one reserved hue per join path | 5.28 / 7.09 / 6.15 / 5.68 on paper |
| `path-*-tint` | `95% .03 <hue>` | chip track, deliberately flat | 1.12 vs paper |
| `path-*-on-ink` | `70/.11/205`, `72/.15/315`, `71/.14/35`, `69/.10/105` | the same four paths on the dark band | 4.91 / 4.74 / 4.59 / 4.57 |

**Never** use a Tailwind palette colour (`text-gray-600`, `bg-blue-100`, `text-red-600`) where a role
exists; use the role. **Never** add a signal hue: the system has no red and no amber, and severity is
carried by the notice's keyline and word (D102). **Never** put `gold` on a `tint` (4.39, under AA) —
tints carry ink, gold carries paper. **Never** put a keylined control on a `panel` (`rule` on panel =
2.88, under the 3.0 boundary bar). **Never** let a coloured fill express a state (every shipped state
fill measures 1.05–1.09 = flat).

Bars, non-negotiable: **4.5** text (3.0 for text at/below the `display-2` step), **3.0** for a boundary
or graphic, **1.35** for "this is a separate layer", **24px** minimum target, **44px** for the primary
path.

**A hover always goes lighter.** `ink` → `ink-hover`, `paper` → `tint`; a control that darkens on hover
next to one that lightens is two grammars. On the layer bar this is not cosmetic: at `L` 38 the hover
fill sits 1.29 from the resting fill, which is FLAT — the hover simply does not happen.

**Focus rings take one role per ground:** `outline-gold` on paper (4.82) and `outline-band-text` on the
dark band (10.19), always with `outline-2 outline-offset-2`. `gold` on the band is 2.50 = an invisible
keyboard ring, and the shipped artifact proved that failure mode twice (`focus:shadow-outline-blue` was
a Tailwind 2 name that generated nothing).

## Spacing — 4px grid, eight steps

| Tailwind step | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 |
|---|---|---|---|---|---|---|---|---|
| px | 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 |

Rows and lists sit on **12px padding, 8px gaps** ("comfy", round 6 Q4). Notice padding is 12/16.

**Never** use a step outside that set. The 20px orphan (`mt-5`, `sm:mt-5`: 5 writes) maps to **24** in
`design-apply`; `gap-3.5` (14px) → **12**, `gap-1.5` (6px) → **8**. If no step fits, change the scale,
do not write `p-[13px]`.

## Type — one face for content, one for chrome, 1.200 ramp

Round 8 (operator ruling, 2026-11-02): the reading ladder went up 10% and the chrome tier did not move.

| Token | Size | Line height | Use |
|---|---|---|---|
| `text-micro` | 11.1px | 16px | nav narrow tier, chip label, notice meta |
| `text-label` | 13.3px | 16px | nav links, buttons, meta, status word |
| `text-body` | 17.6px | 24px | body copy |
| `text-lede` | 21.1px | 28px | intro paragraph, card title |
| `text-subhead` | 25.3px | 32px *(derived)* | section heading |
| `text-heading` | 30.4px | 40px *(derived)* | page heading |
| `text-display-1…4` | 36.4 / 43.7 / 52.4 / 62.9px | 40 / 48 / 56 / 68px | **the locator** — one element per screen: the when/where line once real schedule work exists, the page `h1` until then |

Leading is carried by the size token — never write a bare `leading-*` next to a size (three such writes
survived in the island's states until round 8; `leading-6` is 24px, the token value, so deleting them moved
nothing and removed a write no gate read). Serif body copy reads at `leading-prose` (1.6).

**Every line box in that table is derived, and `node design/ratify-check.mjs` re-derives it from the sizes in
the block** (section 1f): the non-display steps take "next 4px multiple ≥ size × 1.2", the display steps take
the smallest 4px multiple ≥ size × 1.05, and each display line box must clear its measured ink depth
(`design/fonts/display-fit-chrome.json`, chrome face at weight 800 — clearance today **7 to 11px**). That gate
exists because of this round: 24px is 1.5 line spacing at a 16px body and **1.36** at 17.6px, so a size raise
that carries its leadings over by hand is a silent ratio change. `micro`/`label` are the exempt pair — their
16px line box is ratified (D100, round 6) so a control's height lands on the grid.

**Measure: a prose block never runs past `max-w-measure` (32em).** It is `em`, not `ch`, and that is a
measured correction: `ch` is the advance of the **"0" glyph**, not an average character, and PT Serif prose
averages **0.455 em** per character on the built page, so a "70ch" cap would have allowed ~93 real characters —
no cap at all. 32em ÷ 0.455 em ≈ 70 characters of serif prose; in the chrome face (0.612 em) the same 32em is
~52 characters, which is why the cap belongs on prose blocks rather than on every text block. Applied to the
two section-intro ledes (they sit in a 1164px box at 1240) and to the 404/chat ledes, where it replaces
`max-w-2xl` — a 672px cap that meant 77 characters at the old lede size and 70 at the new one, i.e. a rule
whose meaning moved with the ramp.

**Measured line length after round 8 (`npm run lines:measure`, reports in `.design/render/`):** the widest
prose line on the landing page is **69 characters** (was 76); the two section intros now sit in a **675px** box
at **69 and 64**; hero ledes are 67/69/49; card copy runs 29-38 at 1240, and at 320 the body box is **225-256px**
at 26-31 characters. Most prose on this site still sits **under** the 40-75 character band, because the boxes
are narrow — that is the standing finding, and it is the reason a size raise was safe here but a *wider box*
would not be.

**The two faces are 4% apart in x-height** (PT Serif 0.50 em, Public Sans 0.52 em,
`design/fonts/metrics.json`), so "the serif reads smaller" is not an x-height claim. What differs is the
advance: the serif averages **0.533 em** per character against chrome's **0.612 em** (`design/fonts/metrics.json`;
0.455 em measured on rendered sentences), so a bump to a content step costs fewer characters per line than
the same bump to a chrome step.

**One display step per screen: the screen's primary locator.** That is the one element answering "which
page is this, and when and where". Section `h2`s are `text-heading`, never a display step; a display
step never goes on a punchline, and never on two elements in one screen. Where the locator lives is
not permanent: **when a real dated line exists, the display step moves to it and the title steps down
to `text-heading`** (operator ruling 2026-11-01, D112 — the rule used to read "reserved for when/where",
which on a landing page whose event sections are switched off would have left the display step
reserved for content that does not exist, and flattened the title to 27.7px beside two 27.7px section
headings). Applied today: landing `h1` = `text-display-1` base / `text-display-2` at ≥sm, `h2`s and the
footer sum glyph = `text-heading`, 404 and chat `h1` = `text-display-1`.

**Never** use `text-display-4` (62.9px) below a 375 viewport without a cap. The fits are measured in the face
the title actually renders in — Public Sans Variable at the weight it writes, `design/fonts/display-fit-chrome.json`
(sizes read from the block; `ratify-check` fails if the specimen measures other sizes). Longest real word
("Minneapolis") at each step, against the hero boxes `check:render` measures (**276px** at a 320 viewport,
**346px** at 390, **672px** at 1240): display-1 **214.9px** fits; display-2 **258px** fits; display-3
**309.3px** fits only above ~310px of box; display-4 **371.3px** needs ~372px. The whole club name at display-4
is **868px** nowrap, which is why the share card (1200px canvas) carries it on one line and a 343px content
width never can. Weight is not cosmetic: the same string at 800 is wider than at 700 (club name 502.3 vs 496
at display-1). Faces: PT Serif (`font-body`) for content — **400 and 700 both load** — and Public Sans variable
for chrome, installed from `src/styles/fonts.css`. **Never** set `font-weight: 500/600` on serif text: PT Serif
has no variable build, so it renders regular or bold and the weight you wrote is the weight you do not get.

## Radius

`rounded-control` and `rounded-card`, both **6px** from one base. Chips are not pills: a chip is
carried by its hue keyline plus its word, and a second radius role with no measured need is a third
thing to enforce. **Never** use `rounded-lg`/`rounded-md` (Tailwind's ramp) on a control or card.

## Elevation — hairline means on the page, shadow means above it

| Token | Value | Use |
|---|---|---|
| `inset-shadow-rule` | `inset 0 0 0 1px` `rule` | every boundary on paper and on the band |
| `inset-shadow-gold` | `inset 0 0 0 1px` `gold` | the caution variant of a notice |
| `inset-shadow-path-*` | 1px of the path hue | chip and tag keylines |
| `shadow-e1` | `0 1px 2px rgba(32,57,39,.165)` | something that floats: a menu |
| `shadow-e2` | `0 2px 5px -1px …,.22 + 0 12px 28px -6px …,.30` | something that floats over content |

Level 1 measures **1.35** at the contact edge, level 2 **1.51** — both at or over the layer bar. The
stops are ink-tinted on purpose: a black stop wide enough to read at a wide blur paints a 2.10 grey
band.

**Never** use a `border` for a keyline — it adds 2px and silently breaks the control-height
arithmetic. **Never** put a shadow on a card, or on a hovered card: cards are part of the page.
**Never** use `shadow-sm/md/lg` (measured 1.25 = decoration).

## Controls — heights are derived, not chosen

`height = ceil4(measured line box) + 2 × an S3 pad`. Pads come only from the spacing scale.

Round 8 left these heights alone **because the chrome tier did not move**: `text-label` is still 13.3/16, so
the primary is still 48 and the secondary still 40, re-measured by `check:render` at three widths after the
ramp changed. That is the whole reason the reading ladder and the chrome tier are separate decisions — a
label step of 15/20 would make them 52/44 and re-open the nav fit, the notice's 48px one-line figure and the
card's bands (measured in `design/grill/round8/report.json`).

| Step | Height | Use |
|---|---|---|
| chip | 24px | chip / inline status (spacing exception must hold) |
| `s32` | 32px | quiet button, inline controls |
| `s40` | 40px | secondary button, a notice's retry |
| `s48` | 48px | primary button — the only step that clears the 44px AAA bar; it belongs to the join path |

**Never** let one component family render at three heights (the shipped CTA measured 50 / 58 / 62px
across breakpoints) and **never** ship a control under 24px (the shipped 404 links measured 19px).

## Buttons and chips

| Component | Construction | Measured |
|---|---|---|
| primary | `ink` fill, `band-text` label, 48px | 10.19, hover 7.33 |
| secondary | `paper` fill, `inset-shadow-rule`, `ink` label, 40px, hover fill `tint` | 12.02 / 10.96 |
| quiet | `gold` label, 32px standalone; **no keyline inside a notice** | 4.82 |
| chip | its own component, not a button: `ink-2` label on `path-*-tint`, `inset-shadow-path-*`, 24px | 6.27 label, 5.28–7.09 edge |

A box has exactly **one** boundary. A notice's action therefore takes the `quiet` label with no keyline
of its own — a second `rule` hairline 12px inside the notice's own keyline reads as a double border and
is illegal on a panel anyway (2.88). Because gold is also the caution colour, an in-notice action is
distinguished from the status word by an **underline at rest**, its lane, and its size — never by a
second colour.

## Notices, status words, freshness

- A notice = **word + keyline** on the page's own ground: edge `inset-shadow-rule` (3.01 paper / 4.00
  band), word `ink`, body `ink-2`, meta `ink-3`, padding 12/16. One-line notice **48px**, two-line body
  **64px**. Caution variant: `gold` keyline and word (4.82); on the band, `gold-on-ink` (5.80). No fill.
  `check:render` measures every `role="status"` / `role="alert"` block in the built page and fails on a
  fill, on an inset other than 1px, on a keyline contrast that is not the rule (**3.01 in both the
  specimen and the built page** — D116), on text under the 4.5 bar, or on a block under 48px.
- Status is a **word**: `Scheduled` / `Cancelled` / `Past` in the series lane when stacked, in its own
  24px chip column when wide (measured: a word reflows +0px, a chip costs +7px). Cancelled title goes to
  `ink-2`.
- "Time not set" is stated **in the date lane** where the clock would be (`ink-3`), never defaulted to
  12:00 am, and never rendered as a date.
- Freshness is **one dated line, always**, in the same slot on every surface: `ink-3`, tabular numerals,
  e.g. "Schedule copied 30 Oct 2026". No staleness alarm: the real harvested feed has gaps of 4, 10 and
  4 days, so any 7-day threshold fires in an ordinary month.

**Never** use strikethrough or colour as the only status cue. **Never** hide a cancelled event from the
page while `/events.ics` announces `STATUS:CANCELLED`. **Never** invent a threshold and call it
freshness.

## States: empty, loading, failed

- **Zero upcoming events converts.** It is not a sentence (104px, nothing to press) and it is never
  hidden (47px): status word, `text-lede` title, two-line body, a 48px primary, a 40px secondary, the
  dated line. The hero's "Next:" label changes to "Nothing scheduled" rather than disappearing, so an
  empty calendar is distinguishable from a broken page.
- **Loading is one 24px `role="status"` line, no motion.** No spinner, no skeleton (the shipped skeleton
  material measures 1.05 fill / 1.18 edge = a rectangle pretending to be content). Reserve the height so
  the page does not jump when content lands.
- **Applied in `DiscordSummary` (apply 4c): the pending block IS that line.** It is the notice grammar
  (`inset-shadow-rule`, no fill, word `ink`, body `ink-2`, meta `ink-3`), and `min-h-20` reserves the
  fixed part of whatever lands: dated line 16 + `space-y-6` 24 + a card header 40 = **80px**. Measured in
  the built page: 80px at 1240, 100px at 390 (the meta line wraps), 124px at 320; inset ring **3.01**
  against its ground, word at **12.02**. The deleted spinner painted 2px of `blue-600` — measured 4.98
  under the arithmetic path D116 replaced, and higher than that in painted bytes, which only strengthens
  the point: 2px of foreign hue is not the 1px `rule` ring the grammar names.
- **The pending sentence is also the JavaScript-off state.** It reads "The channel summaries have not
  loaded" and names the path out (Discord), so it is true whether or not the browser ever runs the fetch.
  That is how the error branch gets into the server-rendered HTML without the server calling the API.
- **Failure is the notice above with a 40px retry**, and the error branch must exist in the server-rendered
  HTML: a JavaScript-off visitor can otherwise never leave the loading branch.
- **Missing content is a designed state, never a build failure** (operator, 2026-11-01). A gate may fail a
  build when a feed is malformed; it must not fail one because the club has nothing scheduled. Empty
  sections get their own content instead.
- **Past events do not belong in the upcoming section.** Whether the site shows them at all is an open
  question for the post-design review; if it does, they live on a separate surface, never interleaved,
  and a past permalink keeps a `Past` status word rather than going 404.

## Layout rules that came out of the colour rounds

- **At most one dark band per screen**, ground = `ink`, text `band-text`. That is where the quote and
  interview cards live; cards inside it are flat with the same `rule` hairline (4.00 there). Today the
  one band is the footer, and the footer is the site's **exit**, so it carries paths, identity and date —
  never a slogan:
  - It must contain **pressable paths**. `check:render` fails a band with no link in it (D115); the band
    that used to sit here was a sentence with a pulsing glyph and zero links.
  - **No fill buttons on the band.** The primary control is an `ink` fill, and ink on ink is invisible,
    so band paths are links named by hue instead: `text-path-meetup-on-ink` (4.74) and
    `text-path-discord-on-ink` (4.59), the variants the token block solved for this ground.
  - **The focus ring on the band is `outline-band-text`.** Gold on ink measures 2.50 and is banned, and a
    headless screenshot cannot focus anything, so `check:render` cannot see a focus ring at all —
    `ratify-check` greps `Footer.astro` for the rings and fails if a gold one comes back.
  - **Targets**: band path links pad to 32px like the nav; a link inside a sentence keeps its 24px line
    box, and the gate floor for any band target is 24px.
  - **Identity, not a locator**: the club name in `text-body` serif at every width, never a display step
    (D112 — the display step belongs to a screen's locator, never to a punchline), with the ∑ glyph inline
    at the size of the word beside it, `gold-on-ink`, `aria-hidden`, and **static**.
  - **Small print** carries place and date only. No frequency (D92), and the old "All rights reserved"
    boilerplate went with the band it lived in.
- **Photo-free by construction**: no surface may require a photograph, because none of the club's
  existing images contains a person (D86/D94). The hero motif may be derived from the operator's own
  sphere diagram only.
- The nav is **one row at every width, `flex-wrap: nowrap`, one type tier at every width**: links at
  `text-label` with 16px gaps, targets 32px tall (16px line box + py-2). Shape is D100's; the tier
  boundary is not (D117). The mark is `MPLS Math Club`, 16px serif with "Math" in `gold` (4.82 on paper),
  it is the home path, and its `aria-label` carries the full club name. D100 rejected a 13px target, so do
  not shave the padding.
- **The label set is the mark plus `Chat`.** `Schedule` and `Members` were dropped on 2026-11-02 (D117):
  the build emits `index.html`, `chat/index.html` and `404.html` only, and `public/` has no redirect rules,
  so those two labels were links to the 404 page — on `main` as well as here. A nav item requires a page.
  Measured with the probe `check:render` runs at every width: the row **needs 171px** against a container
  that offers 276 at a 320 viewport and 256 at 300. `--breakpoint-nav-narrow` (370px) and the narrow
  `text-micro` nav tier went with the dead labels — a tier that fits everywhere is not a tier. An
  arbitrary `min-[…]:` / `max-[…]:` bracket in live markup is banned outright, because the gates read
  tokens and a bracket writes nothing to any token.
- **Headroom for the schedule page, measured:** `Schedule` is 57.6px at this tier, so adding it back puts
  the row at 245 — inside 276. A third path would not fit at the floor. One more path, not two, and the
  probe says so the moment it stops fitting.
- **The site's floor is 320px** (D114, operator ruling 2026-11-02), and `check:render` refuses to run a
  default width set that has dropped 320. What sets the floor changed with D117: it used to be the nav
  (3px of margin at 320); the nav now clears the floor by 105px, and the binding constraint is the hero
  primary control, which measures 48px at 310 and wraps to 64px at 300 — breaking the control grammar.
  Below the floor the gate says so rather than hiding it. Ask for the sub-floor widths any time with
  `RENDER_WIDTHS=1240,390,375,360,320,310,300 node design/render-gate.mjs /`.

## Copy

State the fact, name where it came from, give a path out, carry the date. **Never** state a frequency
("weekly", "every other week", "bimonthly") — the site publishes **series names and real dates** (D92),
and a fabricated "join us every week" survived two years in the shipped copy. **Never** put an
unbracketed invented fact in a specimen: `[YEAR]`, `[CADENCE]`, `[N]`, `[verbatim]` stay bracketed until
a source exists.

## Motion

| Kind | Duration | Easing |
|---|---|---|
| colour, shadow | `duration-150` | `linear` (this is the `@theme` default) |
| anything that moves | `duration-250` | `ease-out`, written explicitly |

Tailwind v4 has no `--duration-*` namespace (measured: `duration-color` resolves to nothing), so the
two steps are written as the numbers above. **Never** use `duration-300` or a 400ms tier. **Always**
guard animation with `prefers-reduced-motion: reduce` — and a guard inside a comment does not count.

**No keyframe animation ships in `src/` at all.** The footer's sum glyph used to pulse
`0.5s infinite linear alternate-reverse`, which has no tier here: 150ms and 250ms are both *transitions*,
and nothing in the grammar is infinite. A guarded infinite pulse is still decoration, so the operator
ruled it out with the rest of the old band (D115). `ratify-check` now fails on any `@keyframes` in live
`src/`, and separately fails any `animation:` write that has no `@media (prefers-reduced-motion)` guard —
so motion can come back only by taking a tier **and** its guard.

Weights: PT Serif ships two faces and both are imported (latin 400 + latin 700), so in serif text the
only legal weights are `400` and `700`. `500`/`600`/`800` are legal **only** in chrome (the sans stack),
where one variable file renders five distinct weights — measured 46 text runs on the landing page now
resolve through Public Sans Variable at 500/600/800 instead of a synthesised system-ui.

## The share card is one screen of the site, and the browser composes it

`public/book-club-social-share.jpg` (1200x630 — what `og:image` / `twitter:card` point at) is generated by
`scripts/make-social-share.mjs` (`npm run assets:social`). It is not hand-drawn art, and it has no
photograph: D86 rules stock crowd photography out ("shows people who have never attended"), D94 records
that no club photographs exist so the site is **photo-free by construction** — and the card used to be a
stock crowd shot with a scrim and `#f59e0b` type over it.

- **The token block is the palette.** `@theme` is copied verbatim into the card document, so the card
  cannot use a colour the site does not have, and it cannot drift when a token is retuned.
- **The ramp is the site's**, read out of the block, never typed into the script: kicker `text-label`
  uppercase, club name `text-display-4` (the one display step per screen, on the locator — D112), lede
  `text-heading` in PT Serif 400, focus line `text-micro` uppercase, paths row `text-lede`.
- **The paths row is the footer's grammar** (D115, D106): word plus hue, in `path-meetup-on-ink` /
  `path-discord-on-ink`, the domain in `gold-on-ink`, hairline `rule` between. No fill buttons on a band —
  `ink` on `ink` is invisible.
- **The mark is the operator's sphere diagram** (geometry from the ratified round-4 specimen, corrected on
  the operator's rulings of 2026-11-02 — see *Graphics* below). The two curves arriving at the meeting point
  carry `gold-on-ink`; `gold` on ink is 2.50 and banned.
- **firefox composes the pixels**, through the same `design/grill/page-measure.mjs` loop the gates use,
  and the generator refuses to write a card when `document.fonts.load()` reports any ratified face missing.
- **What the card does not say:** no cadence word ("monthly" in config vs "weekly" in the old hero is the
  operator's to settle, D26) and no date (D103 — a hand-regenerated card would claim an age it cannot
  compute).

Five measured consequences that changed the code, each one invisible to a source-level check:

1. An HTML `<span>` inside an `<svg>` is foreign content to SVG: firefox dropped every mark wrapped that
   way and painted only the rule and the first path. The row is HTML with inline SVGs now.
2. The ground is a painted `<div>`, not the body background: firefox's headless screenshot writes a
   4-channel PNG, and the body background came out alpha 0, so the card read as near-black (4,7,4).
3. Below ~24px no glyph pixel reaches full coverage, so colour **identity** is asserted by bytes only at
   ≥24px (title off by 1, lede off by 4) and by **pair contrast + hue** below it. Measured: the 19.2px
   Discord path's token pair is 4.60 while the brightest painted cluster is 4.27 — holding the pixels to
   4.5 would fail honest work, so the palette is held to the bar and the pixels to 85% of the pair.
4. Colour-cluster merging (40 RGB units) folds JPEG ringing into the reported colour and moved a gold
   word's hue reading 43 degrees; hue is read off the most chromatic pixels instead.
5. The planted control — the title line asked for in `NoSuchFace At All`, laid out and painted nowhere —
   measures 1200px against the real 776px. That is what calibrates the 1.5%-of-run drift tolerance which
   catches a screenshot taken before a webfont applied (the failure mode is a card that looks fine and is
   set in DejaVu).

`npm run check:social` re-measures the committed JPEG with no firefox and no regeneration, against the page
report the generator leaves in `design/card-page.json`. `npm run check:social:selftest` proves the checks
can fail: painted amber, a light ground, a title box with no ink in it, two runs at display size, and a
path word painted in the wrong hue all come back FAIL with the reason they were written for. Both run in
`verify`.

**The general rule (D118):** anything that ships as a **rendered artifact** — share card, favicon, og image,
a PDF, a flyer PNG — is invisible to `check:classes` and `check:render`, because it is not in `dist/`. It
needs its own pixel gate in `verify`, its numbers read off the committed file, and a selftest that proves
the gate can fail.

## Graphics — the club's own diagram, drawn, one source of truth

The site's graphic language is the club's diagram (D86): routes arriving at one point on a sphere. **No
stock people photography, ever** (D94: no photograph of this club exists, so a photo of strangers is a
false statement about who attends), and `ratify-check.mjs` enforces it structurally — no live source under
`src/` may import a raster. The only rasters in the repo are generated (`public/book-club-social-share.jpg`)
or third-party brand marks in `public/` that are never imported.

The mark lives in **one file**: `src/lib/brand-mark.mjs` exports `MARK` (viewBox 240x150 — the surface ring,
the two halves of the equator, the two routes, the two right-angle marks, the meeting point — with
per-shape stroke widths in **viewBox units**, a `role` per shape, a `face` on the equator halves and a
`dash` on the far one), `MARK_SHAPE_COUNT` and `MARK_COLOURS`. The hero and the share-card composer both
draw from that table; there is no second copy of the geometry, and a copy cannot be smuggled in because both
surfaces are measured against the table's shape count.

**What the drawing means** (three operator rulings, 2026-11-02, correcting an earlier reading of the source
figure): two lines leave a sphere's equator **parallel** — the right-angle marks are the construction that
says so — and **cross** at the pole, because the surface they are drawn on is curved. That is the club's
metaphor: mathematicians who start out parallel meet because of the surface they are on. It is not a circle
with a chord across it, and a mark that reads that way is a defect, not a style choice.

Rules for drawing it:

- **The surface has to be drawn curved, and the far half denoted differently from the near half.** A plain
  `<circle>` plus a straight chord reads as a flat disc; the cue that turns a ring into a sphere is the
  **tilted great circle**: two arcs sharing endpoints at the ring's widest points, bowing equal amounts up and
  down (semiminor 21 units against a 58-unit radius, 0.36r). The **far** arc is dashed (`dash: "5 4"` in
  viewBox units) and the **near** arc is solid — occlusion, the standard globe cue, and the one cue that costs
  no new colour and no fill. A dashed near half would draw the sphere inside out, so the gate checks which
  half is broken, not just that one is.
- **A dash is a claim about device pixels, not about a path attribute.** D119's floor applies to the gap as
  well as the stroke: at the smallest hero box (276px, scale 1.15) `5 4` lands as **6.0px on / 4.8px off**, at
  1240 (scale 1.55) as **7.8 / 6.2**. Both clear the ~1.5px fusion floor; a dash that fuses back into a line is
  the mark losing its sphere again while every count still passes.
- **Deferred, with its price measured: tonal shading.** A light-source shade would be a stronger depth cue
  than a dash, but it needs a **filled** shape (so the bar is D101's 1.35 layer contrast, not the 3.0 graphic
  line bar), gradient support in the share-card's SVG document, and a new colour role. Not built; revisit if
  the mark ever ships somewhere small enough that the dash stops surviving.
- **Deferred by the operator to the roadmap (low priority): what the surface *is*.** The sphere is correct
  geometry, but the operator has raised making the surface a place — the outline of Minnesota (two meridians
  through one state converging northward is the same theorem, and it is *our* surface), the cherry from the
  Cherry Bridge, or another Twin Cities icon. Any such change replaces the ring's geometry in the same table
  and must re-run `check:mark`, `check:render`, `check:social` and the shape-count coupling; a silhouette is
  only shippable if it still reads at the 276px phone box, which needs a measured overlap test against real
  boundary data rather than an opinion.

- **Colour by role, in literal classes**: `stroke-rule` (sphere), `stroke-ink` (routes), `stroke-gold`
  (accents, meeting dot), `fill-gold`. Tailwind generates CSS only for classes it sees in source, so the
  class string must be literal in the `.astro` file — a computed name paints nothing (D110). `ratify-check`
  asserts the literals stay coupled to `MARK_COLOURS`.
- **Intrinsic sizing, never a pixel box**: `<svg viewBox="0 0 240 150" class="w-full h-auto block">`. Any
  fixed height, or a lost `viewBox`, falls the box back to 300x150 — at the 320 floor that is wider than
  the viewport. The render gate compares the measured box ratio to the viewBox ratio.
- **A graphic is either named or explicitly hidden**: `role="img"` + `aria-label`, or `aria-hidden="true"`.
  A nameless mark is invisible to a screen reader and invisible to the gate.
- **Every shape is held to the 3.0 graphic bar (D101), measured per shape** — not "some ink in the box is
  strong enough". Line art has a second, harsher limit: a stroke under ~1.5 device px never contains a
  fully covered pixel, so it has no byte identity and its *painted* contrast is always below its token
  pair (D119). The gate holds both: the pair >= 3.0, and the device stroke >= 1px.

Measured consequence, kept in view rather than tuned away: at 320 the sphere's 1.3-unit stroke lands at
**1.49px** and its pixels top out near 2-3 against sand where the token pair is 3.01, while the routes
(1.61px, pair 12.02) and the gold (1.84px, pair 4.82) stay fully covered. So at phone width the mark reads
as routes arriving at a point without its context ring. `node design/mark-pixels.mjs <shot> <report>`
re-measures this; changing `MARK.shapes[*].sw` re-runs the card pipeline, not just the render gate.

**Meaning is measured from two sides** (2026-11-02): `npm run check:mark` asks two probes about the built
page, because the mark can be wrong in the table, wrong on the screen, or — the interesting case — the table
and the screen can disagree.

- `design/mark-geometry.mjs` reads the table *and* the painted pixels and asserts the semantics: a surface
  circle, exactly two lines, a curved equator, one dashed half and one solid half with the **broken one
  being the far one**, both starting stretches parallel in the table (52 units) **and** in the pixels (51.3),
  a real crossing, the pole dot on the painted ring (measured against the ring's own top rim, so the dot
  cannot certify its own position), and the right angles marked.
- `design/mark-pixels.mjs` counts how much of the box's ink clears the bar: at the corrected geometry,
  **718 px** at/over 3.0 in the 276px box and **1,538** in the 372px box (the M-B figures in D125 — 1,070 /
  2,038 — were measured against the *wrong* drawing and are not comparable; a re-ruling of line weight is
  cheap now that the geometry is right).
- The probe calibrates its own colour roles from the per-shape contrast numbers the page report carries
  (line pair 3.01, route pair 12.02, gold pair 4.82; neutral roles split at the geometric mean, warm roles by
  R−B ≥ 25). Guessing them from luminance classified the sphere ring as route ink and produced confident
  nonsense ("0 crossings", "0 gold pixels near the pole").

### Photograph slots and third-party marks (ruled 2026-11-02)

- **Photo slots are fixed-aspect and have a defined empty state.** A slot without a photo shows the drawn mark
  or nothing at all — never a grey void (`design/records/0010-missing-content-is-a-state.md`). Declared aspect:
  a `width`/`height` pair that agrees with the file, because Tailwind preflight's `img { height: auto }` makes an
  HTML height attribute inert, and a lazy image whose box is wrong reflows the page — measured on the one image
  the landing page ships: **2495px → 2607px, 112px** when it decoded.
  The reserved slots and their sizes are drawn to scale in `design/grill/round-10-photos.html`, and every box is a
  **measured grid column** rather than a drawn guess (`npm run round10` measures the drawing back and fails above
  1px): hero media column **372×564** at 1240 (below 1024px the hero is not a grid; the mark there is 346×216); a
  venue strip **1180×320** at 1240 / **346×230** at 390, where 1180 and 346 are the measured content widths; the join
  media column **526×165** today, proposed **526×316** because the copy column beside it makes that row 316 tall; and
  an event-card thumb **319×110** inside the measured **366.7×204.7** card, whose `p-6` leaves a 319×157 interior.
- **A third-party mark is never our brand colour, and it is named in our type before it is drawn.** Platforms are
  referred to by a link plus our own words ("Sessions are posted on Meetup"); the `path-*` hues are *wayfinding*
  colours of ours, not the platforms' palettes. If a mark appears at all it is the **official file, unmodified,
  in clearspace, next to the name it stands for** — a recoloured or re-drawn third-party mark is a different risk
  from a recoloured word, and it is the one the retrievable terms (Discord's) name explicitly. Meetup's own brand
  terms are **not retrievable from this rig** (JS shell / 403), so nobody may assert them from memory.
- **Attribution is one static line in the footer, not a component.** Specific wording, no boilerplate (D92):
  "Meetup and the Meetup logo are trademarks of Meetup, Inc. This site is the Minneapolis Mathematics Book
  Club's own; it is not Meetup's or Discord's." Cost measured: ~16px of a 131px footer.
- **Measured, so the trade-off is visible:** the Meetup png is **1.24%** of the desktop page's area (200×192) and
  **the most saturated colour on the site** (0.523% of pixels at hue 0–30°, mean chroma 0.226). Removing it takes
  the page's chromatic share from **3.77%** to about **3.25%**. The drabness therefore has to be answered by area
  and by true content — photographs and the surfaces that carry real facts — not by borrowing another company's red.

## Enforcement

```bash
node design/gen-token-map.mjs  # regenerate the apply worklist from src/; exit 1 = a class write has no mapping
node design/list-writes.mjs    # every live type/space/shape write in src/, counted — choose a batch by coverage
npm run check:design            # every design path a doc or script cites must resolve (audit-references --stale)
node design/ratify-check.mjs   # token block → Tailwind resolver + renderer contrast (exit 0 = all bars hold)
npm run check:classes           # every written class resolves to CSS — catches a token used as a class that does not exist
npm run check:render            # build, then measure dist/client in Firefox: control heights, measured contrast,
                                # one dark band and the paths inside it, keyline grammar, notice grammar,
                                # the nav's width probe, one display step, faces actually loaded, and the hero
                                # mark (shape count, box ratio vs viewBox, per-shape contrast, device stroke).
                                # Builds first unless --no-build; 4 firefox at once, one retry per cell.
npm run check:render:dist       # the same measurement on the dist that exists (--no-build): right after verify,
                                # or whenever a rebuild would undo the thing being measured
node design/render-gate-selftest.mjs   # mutate the built page five ways and require check:render to FAIL each
node design/mark-check.mjs      # npm run check:mark - both mark probes, at the two widths that bracket the
                                # box (320: 276px wide, scale 1.15; 1240: 372px, scale 1.55). Needs a built dist.
node design/color-survey.mjs    # npm run check:color - how much colour a page actually paints: % of pixels at
                                # chroma >= 0.04, mean chroma of that ink, and how many 30-degree hue families
                                # carry it. No pass/fail: it is the before-number a colour round argues from.
node design/mark-pixels.mjs <shot> <report> [--crop out.png]   # what the mark actually painted in its box, by
                                # colour cluster; --crop writes the box up 3x so you can look at what was clustered
npm run check:social:live       # run the card generator into a gitignored temp file and gate the fresh output —
                                # the producer itself, not the shipped artifact (D121). Needs firefox, so
                                # like check:render it is outside verify: run it beside check:render.
npm run check:social            # measure the committed share card's painted bytes against the page report
npm run check:social:selftest   # prove the share-card checks can still fail (seven synthetic cards)
npm run verify                  # the browser-free CI gate set (everything above except the pixel gates)
```

**These pixel gates are cheap, and they are the ones CI does not run.** Measured on the dev rig (Linux, 16 CPU,
Firefox 158.0.1, native): one page at one width **0.83–0.89s**, the 3x3 matrix **4.2s** at `RENDER_JOBS=4`
(7.6s serialized), `check:render` with its build **8.3s**, the render selftest **4.7s**,
`check:social:live` **1.3s** — the whole browser ritual is **~14s** (**D123**). `verify` stays browser-free
because the runner has no Firefox, which means `check:render`, `check:render:dist`,
`design/render-gate-selftest.mjs` and `check:social:live` currently run on human ritual before a deploy, not on
every PR. The recommendation is to install Firefox in CI and add a `verify:browser` chain — `check:render:dist`
after `verify`'s build, plus the selftests and the live card. Until someone does that, run them yourself before
suggesting a merge.

That `design/` tooling is **tracked**: record 0009 says design evidence ships with the repo, and only
`tmp-*`, `render/`, probe screenshots and candidate font files are ignored (they stay in `.design/`, the
scratch half — `design/README.md` states the two-directory rule and lists what is live tooling, what is
dated evidence, and what is one-shot history not to re-run). The rule this implies is that a probe which
outlives its session has to be committed — `design/decision-audit.mjs` was written in one session and
never committed, and it is simply gone now; the path above is kept only as the lesson. `check:render`,
`ratify-check` and the card gates are only runnable because their files are in the tree.

**Contrast numbers in this file are painted bytes, not arithmetic** (D116). Firefox returns computed
colours in author syntax (`oklch(0.71 0.14 35)`), and the first version of `check:render` converted those
through OKLab by hand — which measured a colour no screen shows and read every pair 0.1–0.3 low (band
text on ink 10.00 against a record of 10.19, `path-discord-on-ink` 4.47 against 4.59, which would have
failed a token that passes). The harness now paints each colour into a 1px canvas and reads the byte
back, which is why the harness and the oracle now agree exactly: rule on paper 3.01, ink on paper 12.02,
band text 10.19, meetup/discord on ink 4.74 / 4.59.

Two things these gates **cannot** catch, so enforce must be value-aware: Tailwind v4's dynamic spacing
scale makes `mt-23` (92px) resolve, and "the class exists" is not "the value is on the scale". That is
why `design/token-map.md` is generated from the writes rather than written by hand — it exits 1 if any
class in a replaced bucket has no mapping.

`check:render`, `design/render-gate-selftest.mjs` and `check:social:live` all need a browser, so none of
them is in `verify` — `verify` stays browser-free the way it excludes `check:discord` (a token) and
`check:ai` (a paid call). That is the gap CI still has: **the pixel gates and the card producer run on a
human's ritual, not on every pull request.** Closing it means installing a browser in the runner, which is
an operator call, not a delegate change (`.notes/NEXT.md`).

`design-enforce` (phase 5) adds the class-level linter: off-scale spacing, Tailwind colours where a role
exists, `border` keylines, `shadow-*` outside `e1/e2`, `duration-*` outside 150/250, and any frequency
word in event prose.

## Open threads that are not gates yet

- **The site is colour-sparse, and that is now measured rather than felt** (`design/color-survey.mjs`,
  2026-11-02, operator request). On the built pages, with a chroma bar of 0.04: the landing page paints
  **3.8%** chromatic pixels at 1240 (mean chroma of that ink 0.070) across 3 hue families, and **5.2%** at 320
  across **1** family. `/404` and `/chat` paint **0.5%**, each with **one** hue family — the green-ink family.
  The single most saturated thing on the landing page is **not ours**: 14,820 px of `rgb(237,28,64)` at
  C 0.226 is the **Meetup logo** in the Join-community CTA. A round is needed, and every hue it adds has to
  clear, on painted bytes: **3.0** as a graphic, **4.5** as text (**7.0** as body), **1.35** as a fill against
  its ground (D101/D116); **≥40°** of hue separation from the primary and from the reserved path hues (round
  3b); gold keeps its **0.135** minimum distance to every other colour (the Amazon/UMN gold zone, D88); any
  role the mark or a band uses needs an `-on-ink` variant, because the footer band inverts the ground; and the
  card re-runs through `assets:social` + `check:social` in the same commit.
  Photographs are the other lever and they are **blocked on a phone camera, not on code**: D94 forbids stock
  people photography (no photo of this club exists, so strangers are a false statement about who attends), and
  the accepted shot list — the board after a meeting, venues, hands and materials, the diagram artwork itself —
  is in `.notes/asset-sources.md`. Strip EXIF/GPS on commit; faces need the opt-in rule in
  `.notes/consent-and-data-policy.md`.
- **Round 9 (colour) is built and measured; the ruling is the operator's** (`npm run round9`, 2026-11-02 —
  specimen `design/grill/round-9.html`, numbers `design/grill/round9/report.json`, record `colourRound9` in
  `design/decisions.json`). What the scan settled, before any taste: the reserved hues leave **exactly one open
  window, 246–274°, 29° wide**, because round 3b's ≥40° rule is arithmetic on a wheel. The shipped palette
  breaks that rule itself — **gold ↔ path-discord is 27°** (gold ↔ gold-on-ink is 22°, fine: per-ground twins).
  And one colour can never do both jobs: for anything between paper and ink in luminance,
  contrast-on-paper × contrast-on-ink = **12.02**, and 4.5 × 3.0 = 13.5 > 12.02 — which is why every role has an
  `-on-ink` twin and why `MARK_COLOURS` is keyed per ground.
  Measured on painted pixels (two bars, because one bar hides one trap: **ink itself is chroma 0.045**, so the
  0.04 count includes every glyph; **0.08** sits above every neutral and is the colour a reader would call
  colour): as shipped **13.6% / 0.0% / 2 hue families**; colour-on-meaningful-things **12.7% / 0.4% / 5**;
  colour-as-area **12.9% / 0.5% / 6, but 46.9% faint**. That last one is the finding: the shipped
  `oklch(95% 0.03 …)` tints sit **under** the census bar, so a tinted field buys no measurable colour, and it
  costs gold its text bar — **gold on a tinted hero is 4.39** against 4.5 (4.82 on paper). The open-window
  accent (hue 266, L 55.5, C 0.06) is legal but tight — **4.56 on paper, 4.5 on ink**, both inside the noise of a
  font change — and its nearest commerce brand is **0.11**, dirtier than gold's 0.135. A warm accent needs the
  **R-4** re-arrangement (fold the gold twins, retire `path-mobilizon`, move discord) which costs **12 measured
  pairs**; retiring mobilizon alone, or moving gold+discord, does **not** open a warm window. The mark's four
  colourings measure the same coverage (8.10–8.15% of box; 3930–3973 px at the 1.5 device-px floor), so that
  choice is about the two lines staying two *things*, not about legibility.
  **Ruled 2026-11-02 (partial):** **H-A approved** — no new hue; the free win is spending colour on things that
  mean something. **K-B provisionally accepted** — one route line gold (`gold-on-ink` on dark grounds) "until we
  find something better"; hold the caveat that mark colouring is coverage-flat, so this buys distinctness, not
  legibility, and re-run `design/mark-pixels.mjs` before shrinking the mark further. **Still needing a ruling:**
  surface policy **S-A/S-B/S-C**; the **27° `gold ↔ path-discord`** twin (exception or fix); and whether the
  leading miss below rides this round or takes its own.
- **The page is thin, not wide — round 10 (area)** (`npm run check:space`, 2026-11-02, operator: "the landing page
  is still mostly whitespace"). At 1240 the built document is **2495px** tall (**2607px** once the lazy image
  decodes), **4.56%** of pixels differ from their own ground by the 0.05 same-colour bar, and **42%** of the page
  height sits in **8** empty runs ≥ 60px (biggest **217px**); at 390, **8.16%** painted and **35.7%** empty in
  **14** runs, and those runs move *inside* `section.bg-panel` between cards. Read per line, nothing is over-long —
  prose measures **29–38 characters per line** at every shipped width (`npm run lines:measure`), i.e. under the
  comfort band rather than over it — so this is **not** a line-length problem and no type ruling fixes it. The
  emptiness decomposes into **structure** (declared padding **256px** plus a **128px** header→main gap and a **96px**
  main→section gap; `section.bg-paper` alone wastes **170px** above its first line and **278px** below its last),
  **media** (the photo slots: hero **6.78%**, venue strip **12.2%** of the page), **content** (the two disabled event
  sections — the dates do not live in this repo, and D69 forbids making Meetup's feed an architecture input) and
  **copy** (the panel section's 866 characters are six generic cards). Two of the four are not code. Side finding,
  given the site rule "a hairline rule at most": the header band is **1240×72** with **1.0%** of its pixels differing
  from the page behind it and the footer is **1240×248** at **0.7%** — mass, not weight, is what breaks that rule
  today.
- **Body line spacing is now 1.36, and that is a ruling waiting to happen.** `text-body` 17.6px with the
  derived 24px line box is a ratio of 1.36; serif prose writes `leading-prose` (1.6 → 28.2px) and is fine, but
  6 writes carry the bare token (the island's three state sentences, the wordmark, the footer identity line,
  one `h4`). Published figures put 1.5 as the floor and 1.6 as the comfort number for body copy (research R1,
  2026-11-02: WCAG 2.2 SC 1.4.8 "space-and-a-half"; ODPHP *Health Literacy Online* §5.3; Butterick 120-145%),
  and SC 1.4.12 (AA) requires that a user's 1.5× line-spacing override cause no loss — which a
  padding-derived control height survives and a fixed `min-height` may not. Raising body to 28px (1.59) and
  lede to 32px (1.52) is the clean fix; measured cost is +4px per body line, so the island notice grows
  ~12px at 1240 (148 → ~160) and the share card's bands re-flow. Not applied: it changes what the operator
  chose in round 8, and the notice height 80px is D98's ratified one-line figure.
- **`ch` is not a character count** (see the Measure rule): if a future surface writes prose in the chrome
  face, `max-w-measure` gives it ~52 characters, not 70. Measure it with `npm run lines:measure` rather than
  assuming the cap did the job.

- Palette writes now survive only in **dormant** files: the four never-imported `src/components/icons/*.astro`
  (choose-icons deletes them, and `--color-book-gray` stays for them until then) and the two gated-off
  event components. Every live surface writes roles — `ratify-check` greps live `src/` for palette
  fills, `animate-*` and prose-plugin writes and fails on any, using the same DORMANT exclusion the
  worklist uses.
- **Model output no longer rides the prose plugin.** `DiscordSummary` used to write `prose prose-blue`:
  it coloured the summary through a class that is not a colour utility (so no gate could see the hue)
  and set 500/600 weights in a serif that ships 400 and 700. The ramp is written in tokens now —
  `text-lede font-bold` card title, `text-body font-bold` sub-headings,
  `text-body leading-prose text-ink-2 font-body` paragraphs and list items.
- **Faces are wired** (apply batch 4a): `Layout.astro` imports `@fontsource/pt-serif/latin-400.css` and
  `latin-700.css`, and `src/styles/fonts.css` declares the one Public Sans variable latin face
  (26,832 B, `wght 100 900`) against the vendor file, because the package's only entry point declares
  three subsets — 53,020 B of woff2 — for a decision that ratified one latin file. Measured in the
  render gate: all three faces report `loaded`, chrome runs resolve through Public Sans Variable, and
  the artifact ships 3 woff2 instead of the 10 the old `@fontsource/pt-serif` index pulled in (it was
  shipping cyrillic for English copy).
  The one thing this cannot yet do: `check:render` proves the faces load on a **built page**, so a moved
  vendor path fails the gate instead of silently rendering in the fallback stack.
- `shadow-e1` / `shadow-e2` are defined-but-unused until the first floating surface exists. No modal or
  dropdown is in `src/` today.
- Three of the four island defects found in round 7 (no reduced-motion guard, no height reservation,
  no JS-off escape from the loading branch, `{#if summary?.summary}` with no `{:else}`) are closed by
  apply 4c: the guard exists, `min-h-20` reserves, the pending block is the JS-off state, and both
  missing-summary branches now render a line.
- **What is not measurable yet:** the failed and empty branches render only after a real fetch, and
  `check:render` measures the server-rendered branch (there is no API on `file://`). They inherit the
  grammar that IS measured; numbers for them land the first time the gate runs against a deploy where
  `/api/discord-summary` answers.
- `UpcomingMeetups.astro` is **dormant and fictional**: it hard-codes "Saturday, 2:00 PM", "Local Library -
  Study Room B" and "Topic: Introduction to Group Theory" in palette classes, with no feed behind it at
  all. No page renders it, so no gate sees it — and it becomes a lie the day the event pipeline lands
  (queue item in `NEXT.md`). Per **D108**, when it does render, missing content is a state with designed
  content — never a blank, and never a build failure. The batch order and the states to build are in
  `design/token-plan.md`; the per-class worklist is `design/token-map.md`.
