# Design System

Ratified 2026-11-01 (`design-ratify`, phase 3). Decisions with their reasoning: `.notes/DECISIONS.md`
D82–D109 and `.design/records/`. Machine record: `.design/decisions.json` (42 keys). Every ratio below
was read back out of the Firefox renderer (`.design/grill/contrast-oracle.mjs`), not computed from the
oklch by hand — where the two disagree, the renderer won and the older number is corrected in
`.design/grill/contrast/gen-ratify-cfg.mjs`'s header.

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

| Token | Size | Line height | Use |
|---|---|---|---|
| `text-micro` | 11.1px | 16px | nav narrow tier, chip label, notice meta |
| `text-label` | 13.3px | 16px | nav links, buttons, meta, status word |
| `text-body` | 16px | 24px | body copy |
| `text-lede` | 19.2px | 28px | intro paragraph, card title |
| `text-subhead` | 23px | 28px *(derived)* | section heading |
| `text-heading` | 27.7px | 36px *(derived)* | page heading |
| `text-display-1…4` | 33.2 / 39.8 / 47.8 / 57.3px | 36 / 44 / 52 / 60px | **the locator** — one element per screen: the when/where line once real schedule work exists, the page `h1` until then |

Leading is carried by the size token — never write a bare `leading-*` next to a size. Serif body copy
reads at `leading-prose` (1.6). Display leading floor is 1.05; the four display line boxes land on the
4px grid and each clears its measured ink box.

**One display step per screen: the screen's primary locator.** That is the one element answering "which
page is this, and when and where". Section `h2`s are `text-heading`, never a display step; a display
step never goes on a punchline, and never on two elements in one screen. Where the locator lives is
not permanent: **when a real dated line exists, the display step moves to it and the title steps down
to `text-heading`** (operator ruling 2026-11-01, D112 — the rule used to read "reserved for when/where",
which on a landing page whose event sections are switched off would have left the display step
reserved for content that does not exist, and flattened the title to 27.7px beside two 27.7px section
headings). Applied today: landing `h1` = `text-display-1` base / `text-display-2` at ≥sm, `h2`s and the
footer sum glyph = `text-heading`, 404 and chat `h1` = `text-display-1`.

**Never** use `text-display-4` (57.3px) below a 375 viewport without a cap. Two measured fits, because
the face matters and the older number was taken in the wrong one: in **PT Serif** "Mathematical"
measures 367.6px against 343px of content width, and in the chrome face the strings that actually sit
at display size leave 4.8px of margin at display-4 (longest word 338.2px) against 2 lines and 98px at
display-2 — `.design/fonts/display-fit-chrome.json`, Public Sans Variable at weight 800, since 800 is
measurably wider than 700 (458.0 vs 452.4 for the club name at display-1). Faces: PT Serif
(`font-body`) for content — **400 and 700 both load** — and Public Sans variable for chrome, installed
from `src/styles/fonts.css`. **Never** set `font-weight: 500/600` on serif text: PT Serif has no
variable build, so it renders regular or bold and the weight you wrote is the weight you do not get.

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
  `RENDER_WIDTHS=1240,390,375,360,320,310,300 node .design/render-gate.mjs /`.

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
- **The mark is the operator's sphere diagram** (geometry from the ratified round-4 specimen). The two
  curves arriving at the meeting point carry `gold-on-ink`; `gold` on ink is 2.50 and banned.
- **firefox composes the pixels**, through the same `.design/grill/page-measure.mjs` loop the gates use,
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
report the generator leaves in `.design/card-page.json`. `npm run check:social:selftest` proves the checks
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

The mark lives in **one file**: `src/lib/brand-mark.mjs` exports `MARK` (viewBox 240x150, the sphere, three
routes, two accent segments, the meeting point, per-shape stroke widths in **viewBox units**),
`MARK_SHAPE_COUNT` and `MARK_COLOURS`. The hero and the share-card composer both draw from that table;
there is no second copy of the geometry, and a copy cannot be smuggled in because both surfaces are
measured against the table's shape count.

Rules for drawing it:

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

Measured consequence, kept in view rather than tuned away: at 320 the sphere's 0.9-unit stroke lands at
**1.03px** and its pixels top out near 1.7-2.6 against sand where the token pair is 3.01, while the routes
(1.61px, pair 12.02) and the gold (1.84px, pair 4.82) stay fully covered. So at phone width the mark reads
as routes arriving at a point without its context ring. `node .design/mark-pixels.mjs <shot> <report>`
re-measures this; changing `MARK.shapes[*].sw` re-runs the card pipeline, not just the render gate.

## Enforcement

```bash
node .design/gen-token-map.mjs  # regenerate the apply worklist from src/; exit 1 = a class write has no mapping
node .design/ratify-check.mjs   # token block → Tailwind resolver + renderer contrast (exit 0 = all bars hold)
npm run check:classes           # every written class resolves to CSS — catches a token used as a class that does not exist
npm run check:render            # build, then measure dist/client in Firefox: control heights, measured contrast,
                                # one dark band and the paths inside it, keyline grammar, notice grammar,
                                # the nav's width probe, one display step, faces actually loaded, and the hero
                                # mark (shape count, box ratio vs viewBox, per-shape contrast, device stroke)
node .design/render-gate-selftest.mjs   # mutate the built page five ways and require check:render to FAIL each
node .design/mark-pixels.mjs <shot> <report>   # what the mark actually painted in its box, by colour cluster
npm run check:social:live       # run the card generator into a gitignored temp file and gate the fresh output —
                                # the producer itself, not the shipped artifact (D121). Needs firefox, so
                                # like check:render it is outside verify: run it beside check:render.
npm run check:social            # measure the committed share card's painted bytes against the page report
npm run check:social:selftest   # prove the share-card checks can still fail (seven synthetic cards)
npm run verify                  # the full CI gate set
```

That `.design/` tooling is **tracked**: record 0009 says design evidence ships with the repo, and only
`tmp-*`, `render/` and font scratch are ignored. The rule it implies is that a probe which outlives its
session has to be committed — `.design/decision-audit.mjs` was written in one session and never committed,
and it is simply gone now. `check:render`, `ratify-check` and the card gates are only runnable because
their files are in the tree.

**Contrast numbers in this file are painted bytes, not arithmetic** (D116). Firefox returns computed
colours in author syntax (`oklch(0.71 0.14 35)`), and the first version of `check:render` converted those
through OKLab by hand — which measured a colour no screen shows and read every pair 0.1–0.3 low (band
text on ink 10.00 against a record of 10.19, `path-discord-on-ink` 4.47 against 4.59, which would have
failed a token that passes). The harness now paints each colour into a 1px canvas and reads the byte
back, which is why the harness and the oracle now agree exactly: rule on paper 3.01, ink on paper 12.02,
band text 10.19, meetup/discord on ink 4.74 / 4.59.

Two things these gates **cannot** catch, so enforce must be value-aware: Tailwind v4's dynamic spacing
scale makes `mt-23` (92px) resolve, and "the class exists" is not "the value is on the scale". That is
why `.design/token-map.md` is generated from the writes rather than written by hand — it exits 1 if any
class in a replaced bucket has no mapping.

`check:render`, `.design/render-gate-selftest.mjs` and `check:social:live` all need a browser, so none of
them is in `verify` — `verify` stays browser-free the way it excludes `check:discord` (a token) and
`check:ai` (a paid call). That is the gap CI still has: **the pixel gates and the card producer run on a
human's ritual, not on every pull request.** Closing it means installing a browser in the runner, which is
an operator call, not a delegate change (`.notes/NEXT.md`).

`design-enforce` (phase 5) adds the class-level linter: off-scale spacing, Tailwind colours where a role
exists, `border` keylines, `shadow-*` outside `e1/e2`, `duration-*` outside 150/250, and any frequency
word in event prose.

## Open threads that are not gates yet

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
  `.design/token-plan.md`; the per-class worklist is `.design/token-map.md`.
