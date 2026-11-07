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

**Ground** is the plain word for the surface a colour sits on: the colour *behind* a word, a ring, a button or a
fill. `paper` is the page's ground, `ink` is the ground inside the one dark band, `panel` is a card's ground.
Every contrast number in this file is a **pair** — a role against the ground it is painted on — and a number
quoted without its ground is not a fact. That is why the palette carries `-on-ink` twins (D116) and why a tint
(`panel`, 1.04 against `paper`) is not a layer (the layer bar is 1.35).

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
or graphic, **1.35** for "this is a separate layer", **24px** minimum target, **44px** for every pressable
block at phone widths (D139: the bar belongs to the tap, not only to the primary).

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

Rows and lists sit on **8px row padding, 16px between rows, 24px above a list, 32px between grid columns** (R6 /
D214, applied 2026-11-05; this replaced round 6 Q4's "comfy" pair of 12px padding with 24/32/48 gaps). Notice
padding is 12/16 - R6 ruled rows, not notices.

**Section air is one step at every width, not a responsive ramp:** **48px** (`py-12`) on every landing-page band -
reasons, the horizon shelf, the schedule, the join section - and **64px** (`mt-16 mb-16`) at the page's own top and
bottom edges. Round 6's ramp (48/32 base, 48/48 at `sm`, 128/96 at `md`) is gone: the operator ruled one number, and
the phone pays the same trim as the desktop (D214).

**What that bought, measured as a pair rather than assumed** - the two `design/rhythm/report.json` rows in git, same
instrument, same six widths (the page then carried **one** upcoming row; today it carries two, see "Vertical rhythm
is ruled and applied"): **−320px of document height and −289px of empty run at 1440/1240, −320/−260 at 1024,
−192/−137 at 640, −176/−113 at 390, −176/−114 at 320**; at 1240 the empty share falls **30.8% → 25.7%** and painted
rises **8.41% → 9.13%**, one whole empty run disappears at every width, and the biggest run falls **196px → 148px**.
@measured 2026-11-05 by `npm run check:rhythm` (D220 - it also records why the pair is 8px better than the sum of
the two options, and why 320/390 *gained* hero air and still got shorter).

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
| `inset-shadow-gold` | `inset 0 0 0 1px` `gold` | the caution variant of a notice, and the only edge that is legal on a tint |
| `inset-shadow-path-*` | 1px of the path hue | chip and tag keylines |
| `shadow-e1` | `0 1px 2px rgba(32,57,39,.165)` | something that floats: a menu |
| `shadow-e2` | `0 2px 5px -1px …,.22 + 0 12px 28px -6px …,.30` | something that floats over content |

Level 1 measures **1.35** at the contact edge, level 2 **1.51** — both at or over the layer bar. The
stops are ink-tinted on purpose: a black stop wide enough to read at a wide blur paints a 2.10 grey
band.

**A keyline is a PAIR, and `rule` is solved for two grounds, not for all of them.** `--color-rule`
measures **3.01** on `paper`, **4.00** on the `ink` band, **2.88** on `panel` and **2.74** on `tint` — so
on a tint it sits under the 3.0 graphic bar it was solved to clear. That is a measurement, not a
taste call, and it is why the table says "on paper and on the band" rather than "everywhere".
@measured 2026-11-03 by check:ground and check:render

A ring is drawn ON A BOUNDARY, so it has two neighbours: the fill inside it (its own background, or
whatever shows through an unfilled box) and the ground it stands on. The operator's ruling
(D149-3c, 2026-11-03) is **a keyline may not straddle two grounds, and the fix is the placement, not
the number**. What that means when choosing a token:

- a `rule`-ringed box sits on `paper` or inside the band — never inside a `bg-panel` or `bg-tint`
  region, and never carrying a `panel` or `tint` fill of its own;
- a control that paints its own fill is ringed only where that fill **equals the ground it stands on**.
  `bg-paper inset-shadow-rule` is the shipped secondary for exactly that reason, and it was a defect
  the moment it moved inside the tinted join card;
- a box on a tint carries **no** `rule` ring. If it needs an edge, the edge is the caution variant
  (`inset-shadow-gold`: 4.61 on `panel`, 4.82 on `paper`, both over the 4.5 text bar) and the state has
  to actually be a caution — that is what the grammar means, and using gold to rescue a `rule` ring
  would be colour as decoration;
- `panel` is 1.04 against `paper` (a tint, not a layer: the layer bar is 1.35), so a tint was never
  doing the separation a ring does. Taking the ring off a tinted box costs no readable edge.

`check:render` measures both sides of every inset ring on all three routes and fails a straddle or a
ring under the bar; `check:ground` fails the same pair off painted bytes, where a background image
could move the pixels and not the stylesheet. `design/records/0018-a-hairline-on-a-tint-is-under-its-
own-bar.md` is the finding; `design/records/0024-*` is the fix.

**Never** use a `border` for a keyline — it adds 2px and silently breaks the control-height
arithmetic. **Never** put a shadow on a card, or on a hovered card: cards are part of the page.
**Never** use `shadow-sm/md/lg` (measured 1.25 = decoration).

## Controls — heights are derived, not chosen

`height = ceil4(measured line box) + 2 × an S3 pad`. Pads come only from the spacing scale.

Round 8 left these heights alone **because the chrome tier did not move**: `text-label` is still 13.3/16, so
the primary is still 48 (the secondary was 40 then — D139 retired that step the following round), re-measured by
`check:render` at three widths after the ramp changed. That is the whole reason the reading ladder and the chrome
tier are separate decisions — a label step of 15/20 would make them 52/44 and re-open the nav fit, the notice's
48px one-line figure and the card's bands (measured in `design/grill/round8/report.json`).

**D139 (2026-11-03) retired 40px for buttons.** `check:render` carried two rules that cannot both hold for a
`inset-shadow-rule` control — the height rule demanded 40 and the tap rule demanded >=44 at 390 — and the
control that tripped neither was invisible only because the probe truncates a class string
(`design/records/0016-*`). Ruled: the **44 bar wins**, so primary and secondary are the **same height** and
differ by **fill**, not by size. `s40` survives as a **box** height (a notice, a schedule row's own padding) and
is no longer a button step.

| Step | Height | Use |
|---|---|---|
| chip | 24px | chip / inline status (spacing exception must hold) |
| `s32` | 32px | quiet button, inline controls — **not** a phone tap target: anything pressable at 390 must clear 44 |
| `s40` | 40px | **boxes, not buttons** (D139): a notice's own height, a row's padding. No pressable block sits here |
| `s48` | 48px | **every pressable block on the join path** — primary and secondary; the only step that clears the 44px AAA bar |

**Never** let one component family render at three heights (the shipped CTA measured 50 / 58 / 62px
across breakpoints) and **never** ship a control under 24px (the shipped 404 links measured 19px).

### A control names its role in the markup (D140)

Pressable blocks carry **`data-control="primary"`** or **`data-control="secondary"`**. `check:render` asserts
the height **per declared role** (48 +/-1) and fails any control with a control's paint (`bg-ink` or
`inset-shadow-rule`) that declares **no** role. The rules do not read a class string, because they cannot
be trusted to: the probe truncates it, and a control's grammar changed when a utility class was added at the
front (record 0016 measured 3 shipped 40px tap targets the gate was blind to for exactly that reason). This
is D116's rule — the specimen and the built page must report the same thing — applied to a control, and
`design/records/0009-*`'s rule for a slot: **the source publishes a name; a measurement matches the name.**

An in-sentence path stays a **link**, not a control: "a link inside a sentence keeps its 24px line". That is
how a block gets a second way out without a second button.

## Buttons and chips

| Component | Construction | Measured |
|---|---|---|
| primary | `ink` fill, `band-text` label, 48px | 10.19, hover 7.33 |
| secondary | `paper` fill, `inset-shadow-rule`, `ink` label, **48px** (D139 — same height as primary; the difference is the fill), hover fill `tint`, and **on `paper` only** — a ringed control inside a tinted card straddles two grounds (D149-3c) | 12.02 / 10.96 |
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
  **64px**. Caution variant: `gold` keyline and word (4.82 on paper, 4.61 on a tint); on the band,
  `gold-on-ink` (5.80). No fill.
  **A notice's ground is `paper` or the band.** On a tint the `rule` edge reads 2.88, under the graphic
  bar, so a notice is not drawn on `panel` at all: either the block moves to a paper ground, or the
  state is the caution variant, which is a real claim (the gold grammar means "something is off") and
  not a way to buy an edge. `WhyJoinUs.astro`'s empty-thread list is that case: the whole section is a
  tint, there is no paper to move it onto, and an empty list is a fact about the page's wiring rather
  than about the club.
  `check:render` measures every `role="status"` / `role="alert"` block in the built page and fails on a
  fill, on an inset other than 1px, on a keyline contrast that is not the rule (**3.01 in both the
  specimen and the built page** — D116), on text under the 4.5 bar, or on a block under 48px.
- **A notice is one boundary** (operator ruling, 2026-11-03). The ring around a notice is the only edge in it,
  so nothing inside a notice may carry its own fill or its own ring: an action in a notice is an **inline link**
  (a sentence with a link in it) or a **quiet label** — `text-label font-medium text-ink`, underline at
  `decoration-rule`, `min-h-8` (32px), visible focus ring, **no** fill, **no** keyline, **no** `data-control`.
  A block control inside a notice is two boxes, one drawn twice: the Discord island shipped exactly that
  (`Try again` and `Read Discord` were `bg-paper inset-shadow-rule` boxes inside the notice's `inset-shadow-rule`).
  `check:render` fails a `role="status"`/`role="alert"` block containing any `a`/`button` that paints a fill, an
  inset ring, or declares a control role (`design/grill/render-measure.js` reports `actions` per notice).
  Outside a notice, the 48px block roles above still apply — this rule is about edges, not about size.
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
  hidden (47px): status word, `text-lede` title, two-line body, a 48px primary, a second path (a 48px
  secondary or an inline link, D139), the dated line. An empty calendar stays distinguishable from a broken
  page **on the surface that shows a calendar**: the schedule band converts to that grammar, with its status
  word and dated line. The hero used to carry the signal in its label lane ("Next: Sat, Nov 7" becoming
  "Nothing scheduled"); since 2026-11-07 the hero opens with a locator about the club and no date at all, so
  there is no lane to convert (D239) — the requirement survived the move, it just lives where the calendar is.
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
- **Failure is the notice above with a retry**, and the retry inside a notice is a **quiet label**, not a block
  control (one boundary, 2026-11-03, which supersedes the "48px retry" half of D139 — D139's ruling that the
  two block roles are one height stands, and a retry outside a notice is still a 48px control). A quiet label
  is 32px, underlined, no fill, no ring, focus-visible ring on. The error branch must exist in the
  server-rendered HTML: a JavaScript-off visitor can otherwise never leave the loading branch.
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
  boundary is not (D117). The mark is the club's own name — `Matheapolis` since the 2026-11-07 rename, `MPLS Math Club`
  before it — in `font-body` at the `text-body` step, ink, no accent: the old gold `Math` inside the mark depended on
  "Math" being a word inside the mark, and a coined single word has no word boundary to colour. (The gold `∑` summand
  stays, and only on the ink band, where `gold-on-ink` is the hue the contrast oracle allows.) It is the home path, and
  its `aria-label` carries the name. D100 rejected a 13px target, so do
  not shave the padding.
- **The label set is the mark plus `Chat`.** `Schedule` and `Members` were dropped on 2026-11-02 (D117):
  the build emits `index.html`, `chat/index.html` and `404.html` only, and `public/` has no redirect rules,
  so those two labels were links to the 404 page — on `main` as well as here. A nav item requires a page.
  Measured with the probe `check:render` runs at every width @measured 2026-11-07 by check:render: the row **needs 217px** against a container
  that offers 276 at a 320 viewport. (The line said **176px** from 2026-11-03, when the mark was `MPLS Math Club`; the
  rename is the only thing that has changed in the row since, but the delta is not attributed to it — re-run the probe
  before quoting a nav figure. A doc figure a probe contradicts is a doc bug; quote the probe's line.) `--breakpoint-nav-narrow` (370px) and the narrow
  `text-micro` nav tier went with the dead labels — a tier that fits everywhere is not a tier. An
  arbitrary `min-[…]:` / `max-[…]:` bracket in live markup is banned outright, because the gates read
  tokens and a bracket writes nothing to any token.
- **Headroom for the schedule page, re-measured and now negative:** `Schedule` is 57.6px at this tier, so adding it
  back puts the row at **~291** (217 + 57.6 + a 16px gap) — **over** the 276px a 320 viewport offers by ~15px. The old
  line here said "inside 276 by ~26px", and it stopped being true when the row grew to 217 @measured 2026-11-07 by
  check:render. So a `Schedule` nav item is not free at the floor: it needs a shorter label, a smaller tier, or the
  floor itself re-argued. One more path, not two, and the probe says so the moment it stops fitting.
- **The site's floor is 320px** (D114, operator ruling 2026-11-02), and `check:render` refuses to run a
  default width set that has dropped 320. What sets the floor changed with D117: it used to be the nav
  (3px of margin at 320); the nav now clears the floor by 59px (needs 217, offered 276), and the binding constraint is the hero
  primary control, which measures 48px at 310 and wraps to 64px at 300 — breaking the control grammar.
  Below the floor the gate says so rather than hiding it. Ask for the sub-floor widths any time with
  `RENDER_WIDTHS=1240,640,390,375,360,320,310,300 node design/render-gate.mjs /`. The **default** set is
  `1240, 640, 390, 320` (D146): 320 is mandatory, and 640 is the `sm:` flip that lands inside the phone-landscape
  band. The gate prints which breakpoints `src/` uses and names any flip the set does not measure.

## A date is one object: leaf · copy · plate (ruled 2026-11-07, D231)

The schedule has **two surfaces and one shape**. The homepage prints one date — the next open one — inside the
join band; `/schedule` prints every open date. Both draw it the same way, in this order:

- **leaf** — month, day number, weekday, stacked, `bg-tint` **fill**, `EventLeaf.astro`. It is `aria-hidden`:
  the same date is spelled out in prose beside it, and a screen reader should hear a date once.
- **copy lane** — `min-w-0 flex-1`. `min-w-0` is load-bearing: without it a long venue string sets the lane's
  minimum width and the plate is pushed out of the row instead of the text wrapping.
- **plate** — the event's own art, right-aligned on `sm:` and up, capped at **323px** by the single
  `.event-slot` rule in `EventArt.astro` (D173). One image per band, and never a placeholder beside real art
  (D152/D154/D224).

Rules that are not decoration:

- **One boundary per component.** The row/card's one edge is the `inset-shadow-rule` inset ring; the leaf inside
  it is a **fill**, never a second keyline. A keylined leaf inside a keylined row puts two boundaries in one
  component, and `check:render` measures both sides of every ring and fails a keyline that straddles two grounds
  (D149-3c).
- **"There are more dates" is drawn, not said** (D229). Under the homepage card sit up to two 4px-tall inset-ring
  hairlines, inset 16px and 32px, 8px below the card and 4px apart. No gradient fade, no "see more" button, no
  carousel. The count stays in the **link text** (`All 3 dates →`), which is where assistive tech reads it; the
  deck itself is `aria-hidden`.
- **The plate cap is one number, read from the drawing code.** `node design/schedule-geometry.mjs` parses the
  323px out of `EventArt.astro`'s scoped style rather than remembering it, so a cap change cannot leave a probe
  reporting a number nothing decides (same reasoning as the route lists in D230).
- **The stamp under a date is the feed's stamp, not the build's** (D232). `copiedOn()` formats the snapshot's own
  `source.fetchedAt`, which is what every published `DTSTAMP` in `/events.ics` derives from, so the page and a
  subscriber's calendar client cannot name different days. `builtOn()` belongs to the empty state, where the
  build date is the honest fact.
- **Singular on the preview, plural on the page.** The compact band says "the next date"; `/schedule` says "these
  dates". An hour the organizer has not settled prints **"time not set"** (`timeSpan`, D169/D172) — never a
  guessed one.

Measured, at one viewport on both surfaces @measured 2026-11-07 by `node design/schedule-geometry.mjs`: at 1240
the homepage card and a schedule row are both **1164x188**, with a **112x96** leaf, a **633x152** copy lane and a
**323x156** plate whose right edge sits 24px inside the keyline; at 390 they are 346x516 and 346x492 with the same
**112x96** leaf and a plate capped to the column (**314x151**). Page-level cost of putting the list on its own
page @measured 2026-11-07 by `npm run check:space`: homepage **4221 → 3180px at 1240**, **5707 → 4725 at 390**,
**6463 → 5297 at 320**, and `/schedule` **1329px at 1240** with two empty runs totalling 211px (15.9% of the page).
Those page numbers come from a two-pass survey (it re-opens the page in a viewport as tall as the document, so
there is no scrollbar and a capped plate lands on the cap); a single-pass probe of the same build reports a taller
page and a narrower plate, and that is a viewport difference, not a regression — see D234 before comparing them.

## Copy

State the fact, name where it came from, give a path out, carry the date. **Never** state a frequency
("weekly", "every other week", "bimonthly") — the site publishes **series names and real dates** (D92),
and a fabricated "join us every week" survived two years in the shipped copy. **Never** put an
unbracketed invented fact in a specimen: `[YEAR]`, `[CADENCE]`, `[N]`, `[verbatim]` stay bracketed until
a source exists. **In markup text write the character, never an escape:** `club’s`, not `club\u2019s`; HTML has no
`\uXXXX` syntax, so an escape written between tags is painted as those eight characters and it did ship on
`/schedule`. Inside a JavaScript string or a JSON file the escape is correct and decodes — which is why the rule
is enforced by a gate that reads rendered text (`npm run check:escapes`), not by a grep for backslashes.

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

`public/matheapolis-social-share.jpg` (1200x630 — what `og:image` / `twitter:card` point at) is generated by
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
`src/` may import a raster. The only rasters in the repo are generated (`public/matheapolis-social-share.jpg`)
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

### The horizon band: PS-5, and why it is three plates rather than one wide one (ruled 2026-11-04, shipped)
- The operator's ruling on the round-14 specimen was **1c** — not the Byrne band, not the single 1910 horizon, but
  the third new option: a full-width plate band lower on the page (D168). It ships as `HorizonBand.astro` between the
  reasons section and the schedule: `data-slot="PS-5"`, three plates on `bg-paper`, `hidden lg:block` until the phone
  band is ruled (D161), plates 16px apart sharing a baseline. **Measured: 1180x192 @y1825 at 1240, 976x158 at 1024,
  0x0 from 640 down** (`check:space` records it as a flex child, which is why the wrapper carries `flex` — the survey
  only records a `data-slot` box that is a grid or flex child).
- **Each cell is one leaf at the leaf's own aspect (2.87 / 1.99 / 2.14), so no plate in this slot is cropped.** That
  is deliberate and it is the whole reason the slot is three pictures: the archive's widest rung returns each scan's
  **own** width — 688 for the Byrne leaf, 698 for the 1910 Euler leaf, 1024 for the two others (D167) — so a single
  leaf across a 1176 CSS px band is a **1.68x** upscale that keeps about a third of the drawing. Record 0023's
  instruction, executed: compose the strip from several plates rather than stretch one.
- The three leaves are Euclid 1903 **leaf 297** (the octahedron, dodecahedron and icosahedron drawn as solids),
  Slaught & Lennes 1910 **leaf 122** (arcs cut from two centres with a circle tangent to the four arcs — the colourless
  construction D149-2b asked for; `euler1910` is our slot key, not a claim about Euler) and the 1922 National Bureau of
  Standards radio text **leaf 514** (antenna current in radiotelephony, a modulated radio-frequency wave received with
  a simple detector). All colourless (0% named colour), all Public Domain Mark 1.0 per each picture's own page, and
  **every description above is quoted from that page**: the first versions of these three sentences were inferred from
  book titles and id numbers, and they shipped into `alt` attributes before the pages were read (D92).
- **What it cost, measured 2026-11-04 (`check:space`, `check:color`):** painted **5.33% → 7.7%** and page
  **4284 → 3889 at 1240**; phone page **6173 → 5176 at 390** — but the shrink is mostly the "Steps you can undo" card
  coming out on the same ruling (D149-6c), not the band. Named colour is **0.30% at 1240 / 0.65% at 390** (was
  0.274% / 0.550%): in absolute pixels that is ~14.5k either way, so the band added no colour and the *share* rose
  only because the denominator shrank. And the honest bad half: empty runs went **9 runs / 1075px → 10 runs /
  1215px** at 1240 — the band brings 128px of its own `py-16` and the cut left a **283px** hole inside the reasons
  section, so the emptiness moved rather than closed. That hole is A3's rhythm question, now with a number on it —
  and R6 (D214, applied 2026-11-05) closed it: re-measured at 1240 the band brings **96px** of `py-12`, the reasons
  section's inside emptiness is **186px**, and the largest hole inside a surface on the page is now **274px in the
  join section** @measured 2026-11-06 by `npm run check:space` (D220; it read **273px** on 2026-11-05, and the 1px
  is not worth chasing - what matters is that it is three times a band's air and sits inside a surface).
  Padding cannot reach a hole like that; it is
  the next rhythm question, not R6's.

### Photograph slots and third-party marks (ruled 2026-11-02, applied)

- **A reserved place is a component: `src/components/PhotoSlot.astro`.** Drop
  `src/assets/photos/<slot>.<ext>` and the call site uses it; until then the call site renders its own
  **usable** empty state — the hero column keeps the drawn mark, the join column keeps the join path. A grey box
  labelled "photo coming" is a production note wearing a visitor's clothes (`design/records/0010-missing-content-is-a-state.md`).
  A photo that exists **requires an `alt` describing what it shows**, or the build throws: an invented alt is the
  same defect as an invented photograph, and nothing renders it visually.
  The **review** state (placeholder mode, reachable only from `src/content.local/`) draws the measured box with
  `inset-shadow-gold` and **no fill**: a `rule` ring over a `tint` fill measures 2.74 inside / 3.01 or 2.88 outside,
  which is a keyline straddling two grounds (D149-3c, record 0024), and inside a `bg-panel` region a `rule` ring is
  illegal at any placement (2.88 on both sides). Gold reads 4.82 on paper, 4.61 on panel, one ground each side.
  No browser gate can see this state on the shipped page, so it has to be right by construction; the review-build
  recipe (`src/content.local/` + `check:render:dist`) is in record 0024.
- **The aspect ratio is declared in CSS, never left to the file.** Tailwind preflight's `img { height: auto }`
  makes an HTML height attribute inert — the png this page shipped asked for `200x80` and rendered **200×192** —
  and a lazy image whose box is undeclared reflows the page: measured **2495px → 2607px, 112px**, which is also
  why a measurement has to let the images settle before it chooses a crop.
- **The reserved sizes are measured columns, not drawn guesses, and the specimen looks them up rather than
  remembering them** (`npm run round10` fails if a matcher finds no such slot on the built page, and measures the
  drawing back to within 1px; the numbers come from `npm run check:space`, which walks grid/flex children by
  computed `display`, and the page labels its own places with `data-slot` so a specimen is not matching a slot to
  a Tailwind class). At 1240 the hero media column (`data-slot="PS-1"`) is **376x574** and it is **full**: the column stacks —
  plate above, mark below, one property, `lg:flex-col` — and the plate's box is subtraction rather than a chosen
  ratio, so the column is exactly used: **307 = 574 − 235 (mark at full column width) − 32 (`mb-8`)**. The mark
  therefore keeps its full width (**372x232.5** as `check:render` sees it, 376x235 as `check:space` does) and its
  thinnest stroke lands at **2.02–2.17px** against D119's 1px floor. @measured 2026-11-03 by check:space / check:render Filling the column the other way — plate and
  mark as siblings competing for one column — put the mark at **188x118** and its stroke at **1.02px**, legal by
  two hundredths and invisible as a plate (188x125 keeps 46% of a portrait leaf); that is why the round ruled the
  stack. Cost, measured: the page does not grow at desktop (**4284 → 4284**) but grows **+314px at 390**, where the
  hero is not a grid and the plate adds its own height; the page's chroma >= 0.08 share goes **0.014% → 0.274%**
  at 1240, against **+2.63%** for the loud Byrne leaf record 0023 priced. The plate shipped is **56% of the Byrne
  1847 Euclid IV.15 leaf** at **688x562** for a **376x307** CSS box — 2x where the scan allows it and capped at the
  scan's own width where it does not (the Byrne scan is 688 wide, so a 752px file would have been interpolated
  pixels: D167). Built by `npm run plates` from the same crop the rounds measured (sha1 `47518a39c1`), because the
  recipe is one module, `design/grill/plate-crop.mjs`, so a review crop and a shipped asset cannot drift.
  @measured 2026-11-03 by check:space / check:render / check:color / round13 (record 0025); asset bytes and sha
  @measured 2026-11-04 by npm run plates (record 0027)
  A side-effect worth knowing before anything else moves down the page: `check:mark` photographed a **fixed**
  1400px window, and the plate pushed the mark to **y=1421 at 320** and to a box bottom of **1449.9 at 640**, so
  the gate reported "no ink in the measured box" for a correctly painted mark. It now asks the page its settled
  height (`grill/shot-height.mjs`) and shoots at that; `check:mark` costs 3.8s → **7.92s** for the pair of widths.
  @measured 2026-11-03 by check:mark
  Join media column **532×56** at 1240 (one paragraph) inside a grid row that is **326** tall; **310×85** at 390,
  **240×113** at 320. It used to be **532×128** / **310×245** of call-to-action, which is what made round 10 call
  a photo there "a ~152px *growth*, not a reclamation"; the two join actions now stand outside the tinted card
  (D149-3c), so at 1240 a plate at the reserved ratio fits inside a row the copy column already sets, while at
  390 the grid is one column and a plate is still a growth (~107px). The call-to-action renders whether the photo
  does or not.
  *Proposed*: a venue strip **1192×320** at 1240 / **358×230** at 390, where 1192 and 358 are the widest containers
  the page reports, and an event-card thumb **323×110** inside the measured **371×205** card whose `p-6` leaves a
  **323×157** interior. The px figures move by ~4px depending on whether the document fits the window (a scrollbar
  takes width), so **the ratio is the contract and the px is the shot list** — the shot list per slot is
  `src/assets/photos/README.md`. A slot's height claim must name which neighbour made it: an earlier version of
  this section said the join row was "316 tall because the copy column beside it makes it so", and the columns were
  labelled backwards — the 316 was the media column, because it was holding a 192px image.
- **A third-party mark is never our brand colour, and it is named in our type before it is drawn.** Platforms are
  referred to by a link plus our own words ("Sessions are posted on Meetup, where the calendar and the sign-up
  live"); the `path-*` hues are *wayfinding* colours of ours, not the platforms' palettes. If a mark appears at all
  it is the **official file, unmodified, in clearspace, next to the name it stands for** — a recoloured or re-drawn
  third-party mark is a different risk from a recoloured word, and it is the one the retrievable terms (Discord's)
  name explicitly. Meetup's own brand terms are **not retrievable from this rig** (JS shell / 403), so nobody may
  assert them from memory. Applied: the Meetup png is out of `public/` and out of the join card.
- **Attribution is one static line in the footer, not a component.** Written: "Meetup and Discord are trademarks of
  their owners. This site is the club's own — not sponsored or endorsed by either." It is capped at
  `max-w-measure` like any prose block.
- **Measured, so the trade-off is visible** (`npm run check:color`, whole-page crop, settled images — see the
  instrument note under Enforcement). Before, at 1240: **0.49%** of the page was colour a reader would name
  (chroma ≥ 0.08) and **0.48 points of that was Meetup's red** — i.e. **96% of the site's visible colour belonged
  to another company**. After the demotion: **0.02%** at 1240 and **0.05%** at 320. At 320 before: **1.06%**, of
  which **1.04** was that red. So the drabness was never caused by too little of *our* colour being available; it
  is caused by area and content, and the answer is photographs and surfaces that carry real facts — not borrowing
  another company's red.

## Enforcement

```bash
node design/gen-token-map.mjs  # regenerate the apply worklist from src/; exit 1 = a class write has no mapping
node design/list-writes.mjs    # every live type/space/shape write in src/, counted — choose a batch by coverage
npm run check:design            # every design path a doc or script cites must resolve (audit-references --stale)
node design/ratify-check.mjs   # token block → Tailwind resolver + renderer contrast (exit 0 = all bars hold)
npm run check:classes           # every written class resolves to CSS — catches a token used as a class that does not exist
npm run check:render            # build, then measure dist/client in Firefox: control heights, measured contrast,
                                # one dark band and the paths inside it, keyline grammar, the PAIR of every inset
                                # ring (inside and outside, which is how a straddle is caught), notice grammar,
                                # the nav's width probe, one display step, faces actually loaded, and the hero
                                # mark (shape count, box ratio vs viewBox, per-shape contrast, device stroke).
                                # Builds first unless --no-build; 4 firefox at once, one retry per cell.
npm run check:render:dist       # the same measurement on the dist that exists (--no-build): right after verify,
                                # or whenever a rebuild would undo the thing being measured
node design/render-gate-selftest.mjs   # mutate the built page fourteen ways (8 mark, 3 control, 1 notice
                                # boundary, 2 inset ring) and require check:render to FAIL each one — D118,
                                # applied to a pixel gate
node design/mark-check.mjs      # npm run check:mark - both mark probes, at the two widths that bracket the
                                # box (320: 276px wide, scale 1.15; 1240: 372px, scale 1.55). Needs a built dist.
node design/color-survey.mjs    # npm run check:color - how much colour a page actually paints. Two-pass: it asks
                                # the page its own settled height, then shoots the WHOLE page (a fixed 2400px frame
                                # of a 2495px document hid the ink footer and reported a different page). Reports
                                # chroma >= 0.04, chroma >= 0.08 ("colour a reader would name" - ink is C 0.045, so
                                # the first bar counts every glyph), faint 0.012-0.04, and 30-degree hue families.
                                # No pass/fail: it is the before-number a colour round argues from.
npm run check:space             # where emptiness is: per-surface painted share, chars/1000px, empty rows above and
                                # below the first/last line, declared padding vs where paint starts, the biggest
                                # copy-to-copy gaps, every media box, and the grid/flex CHILD columns a photo slot
                                # would take (matched by computed display, so a lg:grid that only exists at 1024px
                                # is not missed). position:fixed elements are excluded and the count is printed.
npm run check:rhythm            # the same page with each proposed spacing option applied to a COPY of dist, measured
                                # at 1240, 390 and 320: edges / edges+rules / interior / slots / all. Writes
                                # design/rhythm/report.json. Nothing here mutates the shipped artifact.
npm run check:ground            # what the page PAINTS as its ground (largest region near --color-paper) in 8-bit
                                # levels, a flat 64x64 window's span/sd, and what each painted `rule` hairline measures
                                # off screenshot bytes - the only gate that can see a background-image, since every
                                # other colour number here is parsed from a computed colour STRING and a texture or
                                # photograph appears in none of them (D143, record 0020). Fails a hairline under 3.0
                                # against the ground it is drawn on, AND a hairline whose two sides are different
                                # grounds with the weaker side under the bar — a keyline may not straddle two
                                # grounds (D149-3c, record 0018); the placement is the fix, not the number.
                                # A run counts as a keyline only if its core carries the --color-rule bytes (within
                                # 14 levels): the detector otherwise matches a line of ink-3 small print, and a bar
                                # that can fire on typography is not a gate (record 0024). Rejected runs are named
                                # in the report, and GROUND_VERBOSE=1 prints them. Two attempts per cell, like
                                # check:render, because the harness's firefox-that-never-posts flake reddened a run
                                # that had nothing to report. Writes design/ground/report.json.
npm run check:ground:selftest   # four plantings the ground probe must tell apart, on a COPY of dist: the same flat
                                # window must move, a ring behind a grain must move, the page's own CSS number must
                                # NOT move (the blindness), and a body-only grain must NOT move the ring - fills
                                # paint over the page ground, so a page texture reads only in the gaps (record 0020).
node design/mark-pixels.mjs <shot> <report> [--crop out.png]   # what the mark actually painted in its box, by
                                # colour cluster; --crop writes the box up 3x so you can look at what was clustered
npm run check:social:live       # run the card generator into a gitignored temp file and gate the fresh output —
                                # the producer itself, not the shipped artifact (D121). Needs firefox, so
                                # like check:render it is outside verify: run it beside check:render.
npm run check:social            # measure the committed share card's painted bytes against the page report
npm run check:social:selftest   # prove the share-card checks can still fail (seven synthetic cards)
npm run verify                  # the browser-free CI gate set (everything above except the pixel gates)
```

**These pixel gates are the ones CI does not run, and they are no longer cheap — the cost is now stated, not
assumed.** @measured 2026-11-03 by `npm run verify:browser` — re-run it to refresh these. Measured on the dev rig (Linux, 16 CPU, Firefox 159.0, native, 2026-11-03): one page at one width
**0.9–3s**, `check:render:dist` over its **12 cells** (4 widths × 3 routes) **36.6s**, `check:mark` **3.8s**,
`check:space` **9.3s**, `check:ground` **8.7s** and `check:ground:selftest` **15.7s**, the render selftest **12.3s**,
`check:social:live` **1.5s** — `npm run verify:browser` end to end is **87.8s** (it was 44.7s before the width sets
grew, D146). Every step's full output is written even when it passes, under `.design/tmp-gate-logs/` (**D144**), so a
green run leaves the evidence rather than the word "ok". `verify` stays browser-free
because the runner has no Firefox, which means `check:render`, `check:render:dist`,
`check:mark`, `check:space`, `check:ground`, `check:ground:selftest`, `design/render-gate-selftest.mjs` and
`check:social:live` currently run on human ritual before a deploy, not on
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

- **A background pattern is ground, not a graphic — operator ruling 2026-11-03, nothing built.** Asked whether a
  barely-noticeable paper texture belongs under the page, the answer measured (record
  `design/records/0019-a-ground-texture-has-zero-headroom.md`): the ceiling is the boundary role, not
  legibility. The `rule` hairline sits at **3.01** against a 3.0 bar, so a ground that goes **one 8-bit level
  darker** is already under its own bar (2.96), while body text survives ±40 levels; rendered paper is
  `252,250,246`, three levels from clipping. Only a **light-only** grain (token ground as the floor, ≤3 levels
  up, σ ≈ 0.5) fits, and it leaves the area metrics alone — painted **4.48 → 4.49%** at 1240, **9.68 → 9.84%** at
  390, empty-run unchanged — because it sits under the survey's 0.05 same-colour bar. It may not go on `panel`
  (`rule` there is 2.88) or on the ink band without its own specimen.
  **Ruled:** it is *ground*, so the 3.0 graphic bar is not its bar; what bounds it is everything painted on top
  of it. **Blocked on, in order:** (1) the pixel-ground probe — `design/grill/render-measure.js` `paintBytes()`
  parses a computed colour *string*, so a `background-image` moves **no** contrast number `check:render` prints
  (it said 3.01 on a page whose pixels measured 3.03–3.06), and the same blindness will cover the PS-1 hero
  photograph; the card checks already sample real PNG bytes with `sharp().raw()`. (2) The photo decision: grain
  under a chalkboard photograph is mud. (3) R6 rhythm. Note also `paper → panel` is a **4-level** step, so a
  grain spanning 3–4 levels is the same size as the site's only tint step.

- **The site is colour-sparse, and that is now measured rather than felt** (`design/color-survey.mjs`,
  2026-11-02, operator request). **The first version of these numbers was a crop, not a page** — the survey shot a
  fixed 2400px frame of a 2495px document (and 1400px of a ~4500px one at 320), which put the `bg-ink` footer band
  out of frame and reported **3.8%** chromatic. It now shoots the settled whole page. At 1240 (**1240×2607** before
  the mark demotion, **1240×2492** after): **11.3%** / **12.6%** of pixels clear the 0.04 chroma bar — but
  **10.8 / 12.6 points of that is the ink ground itself** (`--color-ink` is C 0.045, so every glyph and the footer
  band count). The number that means what "drab" means is **chroma ≥ 0.08 — colour a reader would name: 0.49%**
  before, **0.02%** after; at 320 it is **1.06% → 0.05%**. Gold paints **0.01–0.03%** of the page. `/404` and
  `/chat` are worse: one hue family each, the green-ink family.
  Until 2026-11-02 the single most saturated thing on the landing page was **not ours**: 14,820 px of
  `rgb(237,28,64)` at C 0.226 was the **Meetup logo** in the Join-community CTA — 96% of the site's reader-visible
  colour. That is removed (see "Photograph slots and third-party marks"), which is why the remaining colour budget
  has to be spent on area and real content. A round still has to clear, on painted bytes: **3.0** as a graphic,
  **4.5** as text (**7.0** as body), **1.35** as a fill against its ground (D101/D116); **≥40°** of hue separation from the primary and from the reserved path hues (round
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
  legibility, and re-run `design/mark-pixels.mjs` before shrinking the mark further. **Ruled 2026-11-02 (rest of
  the round):** surface policy **S-B** — colour where it means something; `S-C` (colour as area) rejected because
  its area measured **46.9% faint tint and 0.5% strong**, a wash the census cannot even see as colour, and area is
  now carried by photographs instead. The **27° `gold ↔ path-discord`** twin is ruled a **defect to fix**, in its own
  measured round (the fix re-homes `path-discord` into the only open window, 246–274°, and moves 12 measured pairs).
  **Body line spacing gets its own round** (round 11), because it moves geometry the rest of the system depends on.
- **Vertical rhythm is ruled and applied** (round 15; ruled **D214**, landed 2026-11-05, and the pair's own number is
  **D220**). `npm run check:rhythm` prices each option by applying it as CSS to a **copy** of `dist/client`
  (`.design/tmp-whitespace/dist-<option>/`) and measuring there — the shipped artifact is never mutated, a cached
  variant report is invalidated when the built page's fingerprint changes, and the options live in one module
  (`design/grill/rhythm-variants.mjs`) so the gate table and the photographed specimen cannot drift (D160).
  Shipped now: **1240 4221px, 22.6% of the height in 9 empty runs (biggest 148px), 10.28% painted**; 1024 **4275px /
  24.6%**; 640 **5151px / 22.0%**; 390 **5707px / 16.1% in 9 runs**, 14.06% painted; 320 **6463px / 19.9% in 11
  runs** @measured 2026-11-06 by `npm run check:rhythm`. (Those are the numbers with **three** art-bearing rows in
  the schedule; the R6 pair above was measured when the page had one row and no event art. The two rows the 2026-11-06
  harvest added are **+513px of page at 1240** — **+197px** for the second, **+316px** for the third, the difference
  being each row's own plate and blurb — and they changed **no** empty-run pixels at desktop: 953px in 9 runs,
  biggest 148px, identical at 1 row, 2 rows and 3 rows. So the empty *share* fell 25.7% → 24.4% → 22.6% only because
  the denominator grew, while painted area rose 9.13% → 9.92% → 10.28%. Content fills the page; it does not fill the
  gaps. On a phone it is not that clean: the third row **removed 84px of empty run at 390** and **added 24px at 320**,
  where the biggest hole grew 230px → 252px. @measured 2026-11-06 by this table against its predecessor in git.)
  The two ruled options stay in the table and now measure
  **0px height / 0px empty at all six widths**, which is the drift guard: if a band or a row re-inflates, `edges` or
  `rows` starts buying pixels again and the table says so on its face. Measured and **still unruled**:
  **`band-up`** (the horizon shelf moved under the hero: **+0px height, −26 to −29px empty**, unchanged by the new rows),
  **`band-bleed`** (**+25px at 1440**, 0px everywhere else), **`band-any`** (the shelf at every width: **+524/+81 at 640,
  +356/+111 at 390, +491/+79 at 320** — the same shape as `band-sm`, which D214 refused) @measured 2026-11-06 by
  `npm run check:rhythm`. The emptiness now splits **650px at a surface's own edges** (padding and line leading)
  against **303px between elements inside surfaces**, where padding cannot reach; at 320 that inverts — **568**
  against **717** — so on a phone the majority of the emptiness is interior and no amount of band padding fixes it
  @measured 2026-11-06 by `npm run check:rhythm`. (That pair is the report row's per-surface totals: **edges** = Σ
  `emptyTop + emptyBottom`, **interior** = Σ `gapsInside` − edges, so 1240 is 650 against 953 − 650 and 320 is 568
  against 1285 − 568; recompute it from `design/rhythm/report.json` rather than re-deriving it by hand.) (The 2026-11-02 figures this bullet used to carry — **2492px**,
  **41.5%**, `interior`, `slots` — described a six-card grid that has been gone for weeks and a page whose slots were
  empty; deleted rather than carried, per the house rule. `design/rhythm/report.json` is the table.)
- **The page is thin, not wide — round 10 (area)** (`npm run check:space`, 2026-11-02, operator: "the landing page
  is still mostly whitespace"). Measured on the settled, whole-page crop **after** the mark demotion: at 1240 the
  built document is **2492px** tall, **4.30%** of pixels differ from their own ground by the 0.05 same-colour bar,
  and **41.5%** of the page height sits in **8** empty runs ≥ 60px (biggest **217px**); at 390 it is **4127px**,
  **7.70%** painted and **36.8%** empty in **14** runs, and those runs move *inside* `section.bg-panel` between
  cards. (The first figures quoted **2495px / 4.56% / 42%** on the pre-demotion page, and they were shot before the
  lazy image decoded — the crop clipped 112px of footer. Both are superseded here.) Read per line, nothing is
  over-long — prose measures **29–38 characters per line** at every shipped width (`npm run lines:measure`), i.e.
  under the comfort band rather than over it — so this is **not** a line-length problem and no type ruling fixes it.
  The emptiness decomposes into **structure** (declared padding **256px** plus a **128px** header→main gap and a
  **96px** main→section gap; `section.bg-paper` wastes **74px** above its first line and **96px** below its last,
  and the copy gaps run to **288px**), **media** (the photo slots: hero column ~2.9% painted by the mark, the join
  column 165px tall holding nothing but a button now), **content** (the two disabled event sections — and the
  operator has ruled the schedule's source must be **phone-editable**, Mobilizon or an ICS feed, not a repo file:
  see `.notes/roadmap-events.md`) and **copy** (the panel section's **866** characters are six generic cards, and
  the largest copy gap on the page follows the "Current Focus" line). Two of the four are not code. Side finding,
  given the site rule "a hairline rule at most": the header band is **1240×72** with **1.0%** of its pixels
  differing from the page behind it (18 characters in it), and the footer is **1240×284** at **1.9%** — the single
  largest unbroken field on the page. Mass, not weight, is what breaks that rule today, which is why the attribution
  line went into the footer rather than being another band.
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
  `check:render` measures the server-rendered branch (there is no API on `file://`). They inherit the grammar
  that IS measured; numbers for them land the first time the gate runs against a deploy where
  `/api/discord-summary` answers. **The cost of that blind spot is now concrete:** the island's two controls
  (`Try again`, `Read Discord`) sat at 40px behind a hard-coded `h-10` while the control rules ran over `/chat`
  and never saw them — the probe posted 4 clickable elements for that route, none of them the island's
  (D139/D140, `design/records/0016-*`, `design/records/0017-*`). They are 48 and carry a role **by the rule, not
  by a test.** Closing the gap means measuring a SERVED page — run the probe against `wrangler dev` or a preview
  URL so the island hydrates. That is its own ruling, queued in `.notes/NEXT.md`.
- `UpcomingMeetups.astro` and `PastEvents.astro` are **deleted** (2026-11-03). The first hard-coded "Saturday,
  2:00 PM", "Local Library - Study Room B" and "Topic: Introduction to Group Theory" in palette classes with no
  feed behind it, and no page rendered it, so no gate ever saw it. The schedule surface is now
  `src/components/Schedule.astro`, whose three states are all designed — **D108**: missing content is a state with
  designed content, never a blank and never a build failure. The retired strings themselves are now gated:
  `check:content` (`scripts/check-content.mjs`) fails a build that ships any of them again, a cadence word with no
  named source (D92), a request-time number from `Math.random()` (D136), or a bracketed placeholder. Its sibling
  `check:escapes` (`scripts/check-escapes.mjs`) fails an escape sequence that reaches a reader — in built page
  text, in a `<meta>` description, in a `alt`/`title`/`aria-label` a screen reader speaks, or in the rendered-text
  context of an `.astro`/`.svelte` source; it excludes `dist/client/events.ics`, where a backslash is what
  RFC 5545 requires. The batch
  order and the states to build are in `design/token-plan.md`; the per-class worklist is `design/token-map.md`.
