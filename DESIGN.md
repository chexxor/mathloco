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
(`panel`, 1.05 against `paper`) is not a layer (the layer bar is 1.35).

The table below is the 2026-11-14 palette (D316): the commissioned read's hexes (docs/design-critique-2026-11-14.md
§3) mapped onto these role names, re-solved wherever a role's own bar disagreed. Every number is printed by
`npm run check:contrast`, which reads the tokens out of `src/styles/global.css` and runs them through
`design/grill/okcolor.mjs` @measured 2026-11-14 — the same arithmetic the renderer agreed with to ±0.15 in the
rounds that chose them (D101), and the same file `design/grill/palette-remap.mjs` used to solve them.

| Role | Value | Means | Measured |
|---|---|---|---|
| `paper` | `oklch(97.35% .0139 88.7)` `#faf6ec` | the page ground | — |
| `panel` | `oklch(99.09% .0123 91.5)` `#fffcf3` | a quiet fill, **not** a layer | 1.05 vs paper |
| `tint` | `oklch(91.92% .0285 74.3)` `#f0e2d0` | hover fill, chip ground; carries ink | ink on tint 14.53 |
| `ink` | `oklch(18.92% .0149 81.4)` `#17130c` | text, and the ground of the one dark band | 17.15 on paper |
| `accent-strong` | `oklch(42.22% .109 35.35)` `#7e3320` | the primary button's hover fill (the role `ink-hover` held) | 7.83 under `band-text`, 2.10 over `ink` |
| `ink-2` | `oklch(45.17% .0252 85.9)` `#5c5546` | secondary text, chip label, cancelled title | 6.84 |
| `ink-3` | `oklch(50.5% .03 86)` `#6c6451` | meta, the dated line, "time not set" | 5.44 paper, 5.72 panel, 4.61 tint |
| `rule` | `oklch(60% .04 86.6)` `#8b7f65` | the only boundary role | 3.66 paper, 3.85 panel, 3.10 tint, 4.69 ink |
| `accent` | `oklch(50.57% .1321 35.7)` `#a2432a` | quiet action, notice word, focus ring, caution keyline | 5.77 text and keyline |
| `accent-on-ink` | `oklch(66% .10 35.7)` `#c77b67` | the accent as the band may paint it | 5.69 on ink |
| `band-text` | `oklch(96% .012 88)` `#f5f1e9` | text on ink; also the primary button label | 16.43 on ink |
| `path-calendar` / `-meetup` / `-discord` / `-mobilizon` | `51/.11/205`, `49/.15/315`, `52/.15/262`, `51/.11/145` | one reserved hue per join path | 4.90 / 6.27 / 5.23 / 5.09 on paper |
| `path-*-tint` | `93% .03 <hue>` | chip track, deliberately flat | 1.12–1.15 vs paper |
| `path-*-on-ink` | `64/.11/205`, `64/.15/315`, `64/.15/262`, `64/.11/145` | the same four paths on the dark band | 5.78 / 5.15 / 5.41 / 5.77 |

Two things the round had to change rather than adopt. The read's `--rule #dfd6c2` measures **1.34** against
paper — under the 3.0 boundary bar and under the 1.35 layer bar, so it is not a line, it is a smudge; `rule` is
the same hue family solved to clear 3.0 on every ground it is ever drawn on. The read's `--amber #e9a63f` is
**not adopted**: 1.95 against paper is a band, not a tint, and it is 0.043 OKLab from Amazon orange, inside this
repo's own 0.05 same-colour bar (D88). And the hues moved: the new ink sits at hue 81.4, so mobilizon's olive
(105) was 24 degrees from it — one channel, not two — and discord's orange (35) was the accent's hue. Discord
takes its own brand's blue (262), 134 degrees from the accent and 57 from the calendar. `check:contrast` prints
every gap and fails one under 40 degrees (round 3b).

**Never** use a Tailwind palette colour (`text-gray-600`, `bg-blue-100`, `text-red-600`) where a role
exists; use the role, and never write a hex — `check:contrast` fails any paint literal in `src/` outside
`src/styles/global.css`. **Never** add a signal hue: the system has no red and no amber, and severity is
carried by the notice's keyline and word (D102). **Never** put `accent` on a `tint` — the pair reads (4.89),
which is exactly why it is a grammar rule rather than a legibility one: tints carry ink, the accent carries
paper (D102). **Never** put `accent` on `ink` (2.97): an invisible ring, and the band takes `accent-on-ink`
instead (D116). The round-4 rule that a keylined control may never sit on a `panel` is **retired** — `rule`
against the new panel measures 3.85, above the 3.0 boundary bar (D316). **Never** let a coloured fill express
a state (every shipped state fill measures 1.05–1.18 = flat).

Bars, non-negotiable: **4.5** text (3.0 for text at/below the `display-2` step), **3.0** for a boundary
or graphic, **1.35** for "this is a separate layer", **24px** minimum target, **44px** for every pressable
block at phone widths (D139: the bar belongs to the tap, not only to the primary).

**A hover always goes lighter.** `ink` → `accent-strong`, `paper` → `tint`; a control that darkens on hover
next to one that lightens is two grammars. On the layer bar this is not cosmetic: round 6 measured a hover
fill sitting 1.29 from the resting fill, which is FLAT — the hover simply does not happen. Legibility is not
the binding bar for the hover fill either: `band-text` clears 4.5 across `L` 42..79 at this hue, so the layer
bar decides the lightness, and 42.22 clears it with room (2.10).

**One hue on a control: the accent family** (S038). A control may carry `accent`, `accent-strong` or
`accent-on-ink` and no other hue — the join-path hues belong to a path, not to a button.

**Focus rings take one role per ground:** `outline-accent` on paper (5.77) and `outline-band-text` on the
dark band (16.43), always with `outline-2 outline-offset-2`. `accent` on the band is 2.97 = an invisible
keyboard ring, and the shipped artifact proved that failure mode twice (`focus:shadow-outline-blue` was
a Tailwind 2 name that generated nothing).

**The one open colour question.** `accent` is 0.091 OKLab from Target red and `accent-strong` 0.071 from UMN
maroon, both inside D88's 0.135 "not a commerce brand" bar; the adopted ink is 0.046 from Amazon ink, inside
the 0.05 same-colour bar @measured 2026-11-14 by `node scripts/check-contrast.mjs`. The gate prints these as
notes and fails if a token drifts *closer* than the recorded number. Moving the accent to the nearest
hue-35.7 candidate that clears 0.135 (`#915848`, 5.27 on paper) is the operator's call, not a delegate's.

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

**Measured line length (`npm run lines:measure`, reports in `.design/render/`):** the widest prose line on the
landing page is **72 characters** @measured 2026-11-14 by `node design/line-length.mjs / 1240 1440 --no-build`
(it was 76 before round 8's ramp and 69 after it — the number moves with the boxes, so it is re-taken, not
remembered): the two hero ledes sit in **672px/675px** boxes at **71 and 72**, the Meetup/Discord paragraph in a
**563px** box at **72**, and the probe's own verdict line reads `outside the 40-75 ch band: none` at both
widths. Card copy runs 29-38 at 1240, and at 320 the body box is **225-256px** at 26-31 characters (round 8,
`design/records/0021-vertical-rhythm-is-three-numbers-that-disagree.md`). Most prose on this site still sits **under** the 40-75 character band, because the boxes
are narrow — that is the standing finding, and it is the reason a size raise was safe here but a *wider box*
would not be. **The schedule row's prose was the uncapped exception** (D313): `data-copy-prose` now carries
`max-w-measure`, so the wrapper — inheriting 16px — caps at **512px** and the paragraph inside it lands on the cap;
longest measured row line **58 characters** at 1240 (a venue line at 17.6px in that 512px box); at 320 the lane is
244px, so the longest line inside it is **36** characters (the date sentence) and the venue lines break at **27** —
the "42 at 320" this doc carried is the page-wide figure, not a line inside a row
@measured 2026-11-14 by `node design/line-length.mjs /schedule 1240 1024 640 320 --no-build`. The `/schedule` "Add to a calendar" paragraph, also capped, sits in a
**563px** box at **72** characters.

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
headings). Applied today: landing `h1` = `text-display-1` base / `text-display-3` at ≥sm, `h2`s and the
footer sum glyph = `text-heading`, 404 and chat `h1` = `text-display-1`. The step to display-3 is the rename's
(A15): one 11-letter word at display-2 holds 250.5px of a 672px column at 1240 and at display-3 holds 300.4px,
and the page costs +8px at 640 and nothing at 1240, 390 or 320 @measured 2026-11-08 by `npm run round16`; the
`sm:` bound is what keeps the 320 box (276px) from wrapping a 300px name. **A display step can only be priced in a
class the build emits.** Tailwind generates the utilities its scanner saw in `src/`, so an option that retypes a
utility no source file uses removes a rule and adds none: `sm:text-display-4` measured **−16px** at 640 with the
wordmark at 208.7px of ink, i.e. what display-1 paints — a shrink reported as a growth. `design/round16.mjs` now
throws when an option adds a class token the built CSS does not contain.

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
| `inset-shadow-rule` | `inset 0 0 0 1px` `rule` | every boundary, on paper, on a panel, on a tint and on the band |
| `inset-shadow-accent` | `inset 0 0 0 1px` `accent` | the caution variant of a notice, and the only edge that is legal on a tint |
| `inset-shadow-path-*` | 1px of the path hue | chip and tag keylines |
| `shadow-e1` | `0 1px 2px rgba(23,19,12,.165)` | something that floats: a menu |
| `shadow-e2` | `0 2px 5px -1px …,.22 + 0 12px 28px -6px …,.30` | something that floats over content |

Those are the token's numbers, not the page's: they are the stops composited at full alpha in
`design/grill/contrast/gen-ratify-cfg.mjs` (the `S('elevation level 1 contact edge', ...)` lines).
Read off the pixels Firefox actually paints under a 72px header, level 1 measures **1.25** at its
darkest row below the bar - **under** the 1.35 layer bar - and level 2 measures **1.78**, because its two
stops overlap at the contact edge. Level 1 does not make a surface read as a layer; level 2 does. Any
future "this shadow makes it a layer" claim has to be measured on the render, not on the token.
@measured 2026-11-08 by round17's edge probe (`design/grill/edge-probe.mjs`, the 11-row strip at the bar's bottom edge)
The stops are ink-tinted on purpose: a black stop wide enough to read at a wide blur paints a 2.10 grey
band.

**The header is chrome by its ring alone** (S027, D295 — operator ruling B1, 2026-11-13). `Navigation.astro`
's `<header>` carries **no** `bg-*` class: its computed background was the page paper (layer contrast **1.00**,
OKLab distance 0 @measured 2026-11-13 by `node design/round17.mjs --only shipped`), so `bg-paper` painted nothing
and only invited a reader to think the bar has a surface of its own. The one device separating it is the
`inset-shadow-rule` ring at **3.66** on paper @measured 2026-11-14 by `npm run check:contrast`. How much of the band actually differs from the page @measured
2026-11-13 by `node design/header-band.mjs .design/tmp-round17/shot-shipped-1240.png 71` (Linux native,
Firefox 159.0): **5.00%** of the 1240×72 band — 2.78% the ring's two rows, 2.22% the nav ink. `check:render`'s
`bands` section only sees elements with a `bg-*` class, so once a surface declares no ground this probe is the
instrument that still reports it.

**A keyline is a PAIR, and D316 re-solved `rule` for every ground, not just two.** The old `rule` measured
**3.01** on `paper`, **4.00** on the `ink` band, **2.88** on `panel` and **2.74** on `tint` @measured 2026-11-03
by check:ground and check:render — which is why round 4 banned a keylined control on a panel. The adopted rule
(`oklch(60% .04 86.6)`, `#8b7f65`) clears **3.66** paper, **3.85** panel, **3.10** tint, **4.69** ink
@measured 2026-11-14 by `npm run check:contrast`, so the ban is retired and a ring may sit on any ground the
palette has.

A ring is drawn ON A BOUNDARY, so it has two neighbours: the fill inside it (its own background, or
whatever shows through an unfilled box) and the ground it stands on. The operator's ruling
(D149-3c, 2026-11-03) is **a keyline may not straddle two grounds, and the fix is the placement, not
the number**. What that means when choosing a token:

- a `rule`-ringed box may now sit on `paper`, `panel`, `tint` or inside the band — the boundary role clears
  3.0 on all four (D316). It still may not *straddle* two different grounds: a ring has two neighbours and
  the weaker side is what the reader sees (D149-3c);
- a control that paints its own fill is ringed only where that fill **equals the ground it stands on**.
  `bg-paper inset-shadow-rule` is the shipped secondary for exactly that reason;
- a box on a tint that needs a caution edge takes `inset-shadow-accent`: **5.77** on paper and **4.89** on a
  tint @measured 2026-11-14 by `npm run check:contrast`, both over the 4.5 text bar — and the state has to
  actually be a caution, because using the accent to rescue a missing ring would be colour as decoration;
- `panel` is 1.05 against `paper` (a tint, not a layer: the layer bar is 1.35), so a tint was never doing the
  separation a ring does. Taking the ring off a tinted box costs no readable edge.

`check:render` measures both sides of every inset ring on every route the build emits and fails a straddle or a
ring under the bar (`design/emitted-routes.mjs` derives the set, so a new page is measured without being added to a
list; the literal `['/', '/404', '/chat']` this sentence used to name went stale the day `/schedule` landed);
`check:ground` fails the same pair off painted bytes, where a background image could move the pixels and not the
stylesheet. `design/records/0018-a-hairline-on-a-tint-is-under-its-own-bar.md` is the finding; `design/records/0024-*`
is the fix.

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
| primary | `ink` fill, `band-text` label, 48px | 16.43, hover 7.83 |
| secondary | `paper` fill, `inset-shadow-rule`, `ink` label, **48px** (D139 — same height as primary; the difference is the fill), hover fill `tint`, and **on `paper` only** — a ringed control inside a tinted card straddles two grounds (D149-3c) | 17.15 label, 3.66 ring, 14.53 hover |
| quiet | `accent` label, 32px standalone; **no keyline inside a notice** | 5.77 |
| chip | its own component, not a button: `ink-2` label on `path-*-tint`, `inset-shadow-path-*`, 24px | 5.95–6.09 label, 3.18–3.25 edge |

Every number in that table is a token pair, @measured 2026-11-14 by `node design/grill/palette-remap.mjs` — the
same table `npm run check:contrast` prints, and the same one the gate fails on.

A box has exactly **one** boundary. A notice's action therefore takes the `quiet` label with no keyline
of its own — a second `rule` hairline 12px inside the notice's own keyline reads as a double border. Because
the accent is also the caution colour, an in-notice action is
distinguished from the status word by an **underline at rest**, its lane, and its size — never by a
second colour.

## Notices, status words, freshness

- A notice = **word + keyline** on the page's own ground: edge `inset-shadow-rule` (3.66 paper / 3.85 panel /
  3.10 tint / 4.69 band @measured 2026-11-14 by `node design/grill/palette-remap.mjs`), word `ink`, body
  `ink-2`, meta `ink-3`, padding 12/16. One-line notice **48px**, two-line body **64px**. Caution variant:
  `accent` keyline and word (5.77 on paper, 4.89 on a tint); on the band, `accent-on-ink` (5.69). No fill.
  **A notice may sit on any ground whose ring does not straddle two grounds** (D149-3c). Round 4 banned a
  keylined notice on `panel` because `rule` measured 2.88 there; D316 re-solved `rule` to clear 3.0 on paper,
  panel, tint and band, so that ban is **retired** and the straddle is what the gate checks. `WhyJoinUs.astro`'s
  empty-thread list is the case the caution grammar exists for: the whole section is a tint, there is no paper
  to move it onto, and an empty list is a fact about the page's wiring rather than about the club.
  `check:render` measures every `role="status"` / `role="alert"` block in the built page and fails on a
  fill, on an inset other than 1px, on a keyline under the 3.0 graphic bar (the token pair is 3.66 on paper;
  the harness reads painted bytes, never the authored triple — D101/D116), on text under the 4.5 bar, or on a
  block under 48px.
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
- Freshness is **one line, one register**, in the same slot on every surface: `ink-3`, tabular numerals, and the
  wording comes from `provenanceStamp()` in `src/lib/provenance.mjs` — **relative inside 30 days** ("last read 11
  days ago"), **absolute beyond** ("Copied from the club’s own calendar on Nov 13, 2026") (D322, 2026-11-14). A
  surface ruled date-free passes `allowDate: false` and still gets the age form of the same rule.
  `npm run check:provenance` fails a page that computes its own age outside that module: **43 source files, 5 built
  pages, threshold 30 days** @measured 2026-11-14 by `node scripts/check-provenance.mjs`. No staleness alarm: the
  real harvested feed has gaps of 4, 10 and 4 days, so any 7-day threshold fires in an ordinary month.

**Never** use strikethrough or colour as the only status cue. A date the club stopped announcing is retired **in the
file** — `STATUS:CANCELLED` with a raised `SEQUENCE`, the only mechanism RFC 5545 gives a client for dropping a date
it already holds (D72, D225, D370) — and **not painted on the page** (D223: a page of upcoming dates that shows a
finished evening is a lie with a friendly face). What used to be a single "**Never** hide a cancelled event from the
page while `/events.ics` announces `STATUS:CANCELLED`" line is restated here because the shipped design and that gate
rule contradict it: the page never paints one, and the file says it. `CANCELLED` is the retirement mechanism, not a
claim that the club called a meeting off — the source stops announcing old rows rather than cancelling them, so the
note beside any hand-authored cancellation says what is **not** claimed (D370). **Never** invent a threshold and call
it freshness.

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
  the built page: 80px at 1240, 100px at 390 (the meta line wraps), 124px at 320; inset ring **3.66**
  against its ground, word at **17.15** @measured 2026-11-14 by `npm run check:contrast` (D316). The deleted spinner painted 2px of `blue-600` — measured 4.98
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
  interview cards live; cards inside it are flat with the same `rule` hairline (4.69 there, @measured 2026-11-14 by
  `node design/grill/palette-remap.mjs`). Today the
  one band is the footer, and the footer is the site's **exit**, so it carries paths, identity and date —
  never a slogan:
  - It must contain **pressable paths**. `check:render` fails a band with no link in it (D115); the band
    that used to sit here was a sentence with a pulsing glyph and zero links.
  - **No fill buttons on the band.** The primary control is an `ink` fill, and ink on ink is invisible,
    so band paths are links named by hue instead: `text-path-meetup-on-ink` (5.15) and
    `text-path-discord-on-ink` (5.41), the variants the token block solved for this ground (D316).
  - **The focus ring on the band is `outline-band-text`.** `accent` on ink measures 2.97 and is banned, and a
    headless screenshot cannot focus anything, so `check:render` cannot see a focus ring at all —
    `ratify-check` greps `Footer.astro` for the rings and fails if an `outline-accent` one comes back.
  - **Targets**: band path links pad to 32px like the nav; a link inside a sentence keeps its 24px line
    box, and the gate floor for any band target is 24px.
  - **Identity, not a locator**: the club name in `text-body` serif at every width, never a display step
    (D112 — the display step belongs to a screen's locator, never to a punchline), with the ∑ glyph inline
    at the size of the word beside it, `accent-on-ink`, `aria-hidden`, and **static**.
  - **Small print** carries place, date, and the facts the map above it needs qualifying — the calendar
    clause (round-5 communication read A5, D369) and one clause of attribution (D366, restated under
    "Attribution is one static line"). It carried place and date only until those two landed; no frequency
    (D92), and the old "All rights reserved" boilerplate went with the band it lived in.
  - **Every page the build emits ends with this band** (D307, 2026-11-14). `check:render` enforces the band's rules
    for a page that has one, and nothing asked whether a page has one at all: `/chat`, `/join` and `/404` ended on
    their last paragraph, so a visitor arriving from a shared link had the nav above and nothing below. `check:page-exit`
    walks the routes read off `dist/client` (`design/emitted-routes.mjs`, never a remembered list, D117) and requires
    the band, on the ratified ground, offering at least two paths out — 5 built pages, 5 with the band
    @measured 2026-11-14 by `npm run check:page-exit`. A route that is genuinely exempt has to say so here and in the
    gate's own list, not by omission.
- **Photo-free by construction**: no surface may require a photograph, because none of the club's
  existing images contains a person (D86/D94). The hero motif may be derived from the operator's own
  sphere diagram only.
- The nav is **one row at every width, `flex-wrap: nowrap`, one type tier at every width**: links at
  `text-label` with 16px gaps, targets 32px tall (16px line box + py-2). Shape is D100's; the tier
  boundary is not (D117). The mark is the club's own name — `Matheapolis` since the 2026-11-07 rename, `MPLS Math Club`
  before it — in `font-body` at the `text-body` step, ink, no accent: the old accent-coloured `Math` inside the mark depended on
  "Math" being a word inside the mark, and a coined single word has no word boundary to colour. (The `∑` summand
  stays, and only on the ink band, where `accent-on-ink` is the hue the contrast oracle allows.) It is the home path, and
  its `aria-label` carries the name. D100 rejected a 13px target, so do
  not shave the padding.
- **The label set is the mark plus `Dates`, `Chat` and `Ways in`.** `Schedule` and `Members` were dropped on
  2026-11-02 (D117): the build then emitted `index.html`, `chat/index.html` and `404.html` only, and `public/` has
  no redirect rules, so those two labels were links to the 404 page — on `main` as well as here. A nav item requires
  a page, and each label now has one: the schedule page landed 2026-11-07, the join page 2026-11-13 (MS14). At the
  320 floor the row **needs 257px** against a container that offers **276** — 19px of slack — and every number in it
  is a measurement, not arithmetic: mark 97, `Dates` 36, `Chat` 29, `Ways in` 47, three 16px gaps
  @measured 2026-11-14 by `node design/nav-fit.mjs --no-build` (Linux native, Firefox 159.0, faces settled, the same
  needed-vs-available arithmetic `check:render` runs). Earlier lines here said **176px** (2026-11-03, when the mark
  was `MPLS Math Club`) and **217px** (2026-11-07, two labels); both were true of the row that existed then and are
  kept as history, not as a figure to quote. `--breakpoint-nav-narrow` (370px) and the narrow `text-micro` nav tier
  went with the dead labels — a tier that fits everywhere is not a tier. An arbitrary `min-[…]:` / `max-[…]:` bracket
  in live markup is banned outright, because the gates read tokens and a bracket writes nothing to any token.
- **A fourth label is paid for, not squeezed in.** `design/nav-fit.mjs` prices every candidate against the floor,
  one word per row @measured 2026-11-14 (Linux native, Firefox 159.0): `Join` 24, `Visit` 28, `Meet` 32, `Attend` 42,
  `Ways in` 47, `Connect` 52, `Meet us` 50, `Get here` 54, `Say hello` 57, `Come along` 74, `Get involved` 77. With
  `Schedule` kept, `Ways in` needs 280 — **4px over** the floor, and `flex-nowrap` means that becomes a failed probe,
  not a wrap. `Attend` fits by 1px and is not shippable. So the join label is paid for by shortening the schedule
  label: `Schedule` (59) → `Dates` (36) buys 23px and leaves 19px of slack, the same slack `Join` would have had, for
  a label that says what the page is. `Dates · Chat · Attend` fits by 24px, so the swap is not a one-off rescue: it is
  the row shape that has room for a third path. If the operator prefers `Join`, it is one line in
  `src/components/Navigation.astro` and the gate re-measures it the next run — the probe prints both rows side by
  side, so the choice is visible rather than argued.
- **The nav may carry the next date, subordinate to the label, and only where the row has room for it** (D311,
  2026-11-14). The chip is a `data-nav-date` span inside the same anchor, taken from the same
  `scheduleWindow(upcoming(), todayIn())` call the schedule page makes, `hidden xs:inline` (D329 lifted the tier from
  `sm` to `--breakpoint-xs: 380px`) because the row carrying the chip needs **314px** and the 320 floor offers
  **276** — 38px over — @measured 2026-11-15 by `node design/nav-fit.mjs --no-build`, while the shipped row without
  it needs **257 of 276**; at 390 the row with the chip needs **306 of 346**, so the chip paints from 380 up and the
  round-3 read's criterion 5 ("visible at 390px") is met @measured 2026-11-15 by `npm run check:render:dist`. A date in the
  nav is chrome, not a dated surface: `check:dated-surfaces` fails a chip whose date is not the first date
  `/schedule` prints, and a chip when the page prints no date.
- **One name per page** (D309, 2026-11-14): the nav label is the page's name, and the `<title>` stem, the exit-band
  label and the page's own opening block must carry that word. `npm run check:naming` is the detector; aliases in
  prose ("When We Meet", "All 5 dates →") are counted and reported, not failed, because they do a different job.
- **The site's floor is 320px** (D114, operator ruling 2026-11-02), and `check:render` refuses to run a
  default width set that has dropped 320. What sets the floor changed with D117: it used to be the nav
  (3px of margin at 320); the nav clears the floor by 19px (needs 257, offered 276) @measured 2026-11-14 by
  `node design/nav-fit.mjs --no-build`, and the binding constraint is the hero
  primary control, which measures 48px at 310 and wraps to 64px at 300 — breaking the control grammar.
  Below the floor the gate says so rather than hiding it. Ask for the sub-floor widths any time with
  `RENDER_WIDTHS=1240,640,390,375,360,320,310,300 node design/render-gate.mjs /`. The **default** set is
  `1240, 640, 390, 320` (D146): 320 is mandatory, and 640 is the `sm:` flip that lands inside the phone-landscape
  band. The gate prints which breakpoints `src/` uses and names any flip the set does not measure.

## A date is one object: leaf · copy · plate (ruled 2026-11-07, D231)

The schedule has **one dated surface**. Until 2026-11-14 the homepage printed the next open date inside its join
band and drew it with the same three parts; that card (and the sign-up cluster inside it) was removed on the
operator's `/join` objective — "`/schedule` stays the only surface that prints dates" — recorded as **D306** and
enforced by `check:dated-surfaces`, which fails any built page that prints a date without a ruling. The homepage now
points at this page and prints none; the row below is what `/schedule` prints, in this order:

- **leaf** — month, day number, weekday, stacked, `bg-tint` **fill**, `EventLeaf.astro`. It is `aria-hidden`:
  the same date is spelled out in prose beside it, and a screen reader should hear a date once.
- **copy lane** — `min-w-0 flex-1`, and inside it three groups (D313, 2026-11-14): `data-head` is the date said as a
  sentence and the title; `data-copy-prose` is the series and venue lines, capped at `max-w-measure`; the sign-up
  cluster is the way out. `min-w-0` is load-bearing: without it a long venue string sets the lane's minimum width
  and the plate is pushed out of the row instead of the text wrapping.
- **plate** — the event's own art, right-aligned on `lg:` and up, capped at **323px** by the single
  `.event-slot` rule in `EventArt.astro` (D173). One image per band, and never a placeholder beside real art
  (D152/D154/D224).
- **The row goes horizontal only when the lane can hold it.** 112 (leaf) + 48 (the two `lg:gap-6`) + 323 (the plate
  cap) = **483px** before the copy lane gets a character, so the flip sits at `lg` (1024), not `sm` (640): the row
  is horizontal only when the lane is **at least as wide as the plate beside it** — **417px at 1024**, and the
  `sm`-flip counterfactual measures **325 at 900, 225 at 800, 193 at 768, 125 at 700, 65 at 640**, i.e. narrower
  than the 323px cap at every width below 1024 @measured 2026-11-11 by `node design/schedule-geometry.mjs` on
  `dist/client` and on a copy with the flip moved (`cp -r dist/client .design/tmp-sm-flip && sed -i 's/lg:flex-row/sm:flex-row/' .design/tmp-sm-flip/schedule/index.html`). A 65px lane is not a copy lane, and when S019/D272 put
  the sign-up cluster in it the RSVP label wraps inside it on a landscape phone. Stacking is not a fallback: it is
  the layout the width can hold, and `check:render` measures 640 (stacked) and 1240 (horizontal), so both sides of
  the flip are measured. A line this section used to carry — 309px at 900, 177 at 768, 49 at 640 — was arithmetic
  that subtracted `lg:gap-6` at widths where the markup's `gap-4` applies; it is deleted because the probe
  contradicts it, not because the rule changed.

Rules that are not decoration:

- **One boundary per component.** The row/card's one edge is the `inset-shadow-rule` inset ring; the leaf inside
  it is a **fill**, never a second keyline. A keylined leaf inside a keylined row puts two boundaries in one
  component, and `check:render` measures both sides of every ring and fails a keyline that straddles two grounds
  (D149-3c).
- **"There are more dates" is said once, in the link** (D229, revised by D306). The homepage used to draw a deck of
  up to two 4px hairline edges under its preview card; the card and the deck went together, because a deck under a
  pointer is a picture of dates the page no longer shows. What survives is the part that was always the accessible
  one: the **link text** (`Next 8 dates →`), which is where assistive tech reads the count.
- **The reach of the file is said where the file is offered, and it is generated** (round-5 communication read B2,
  q18, D371). `/schedule`'s lede names the window the published `/events.ics` carries — first `DTSTART`, last
  `DTSTART`, how many rows — and every row's `DESCRIPTION` carries the **identical** sentence, both from
  `windowSentence(feedWindow(…))`. It is never hand-written, because a date in prose is a claim that expires with
  the next harvest; `check:ics`'s `calendar-window` rule derives the window from the file's own `DTSTART`s and
  `check:schedule-window` compares the page's sentence against the same generator, so a sentence the rows do not
  support goes red rather than shipping. One sentence in two places rather than two sentences is deliberate: the
  page and the file naming one window twice in different words is a near-duplicate `check:content` would have to be
  signed off for no new fact.
- **The plate cap is one number, read from the drawing code.** `node design/schedule-geometry.mjs` parses the
  323px out of `EventArt.astro`'s scoped style rather than remembering it, so a cap change cannot leave a probe
  reporting a number nothing decides (same reasoning as the route lists in D230).
- **The stamp under a date is the feed's stamp, not the build's** (D232). `copiedOn()` formats the snapshot's own
  `source.fetchedAt`, which is what every published `DTSTAMP` in `/events.ics` derives from, so the page and a
  subscriber's calendar client cannot name different days. `builtOn()` belongs to the empty state, where the
  build date is the honest fact.
- **An hour the organizer has not settled prints "time not set"** (`timeSpan`, D169/D172) — never a guessed one.
- **The sign-up cluster is a quiet label, never a control** (S019, D272). Under each printed date sits one cluster
  of links, ordered **Meetup, Discord, Facebook**: `text-label font-medium text-ink`, underline at
  `decoration-rule`, `min-h-8` (32px), focus ring — no fill, no keyline, no `data-control`. A row is already one
  boundary (D220), so a 48px block control inside it is two boxes drawn twice (D149-3c). A platform the club
declares in `src/config.json` is painted on **every** printed date; a platform whose entry is empty is painted
nowhere, and `npm run check:rsvp-page` proves both directions from the built bytes rather than from the
component's silence. The box is **32px** tall wherever the lane holds all three labels on one line — 1240 and 640 on
`/schedule` — and **104px** at 390 and 320 where each label takes its own (two 4px `gap-y-1` rows between three
32px line boxes). Height × width @measured 2026-11-14 by `npm run check:render:dist` (Linux native, Firefox 159.0,
PASS, **5 routes × 4 widths**): `/schedule` 32x645, 32x544, 104x314, 104x244 for 1240/640/390/320 — the homepage's
half of this line (32x633, 68x532, 104x314, 104x244) is history with its card (D306). Its links render the label tier **13.3px** at **17.15** contrast on paper (D316), and the gate asserts all three,
because `check:render:selftest` plants a fill, a ring, a lost `min-h-8` and a `data-control` promotion, each of
which must go red.
- **The order is a permutation, never a filter** (S022, D281). The server paints Meetup, Discord, Facebook; the
  browser leads with the platform this visitor last opened (`localStorage`, `PREF_KEY` in `src/lib/rsvp.mjs`), and
  every cluster on the page follows. Nothing is hidden, dimmed or removed, and a JavaScript-off visitor, a crawler
  and a screen reader all get the canonical order the gate asserts. The mechanism costs bytes @measured 2026-11-12
  by `node design/grill/island-cost.mjs` (Linux native): the four island tags on `/`, `/schedule` and `/chat` are
  **1927 gzip**, the inline island-runtime scripts **5763 gzip**, and the lazily fetched `SignUpLinksCluster` chunk
  **1235 gzip** on the two pages that carry a cluster; against an identical copy of the same build with the island
  mechanism removed the three pages weigh **+815 gzip** in total. The cluster markup a JS-off visitor sees is
  **2142 gzip** and is byte-identical either way.
- **The platform mark is a glyph, drawn once per page** (S026, D294). Each link carries a 16px `<use>` into a
  hidden `<symbol>` sprite whose path data lives in one place, `src/lib/platform-marks.mjs` — the only home of the
  glyph shapes, so the render gate and the byte gate can compare the same ids. The sprite is emitted by
  `src/components/SignUpLinks.astro` for the render that claims a cluster — `spriteFor(Astro.locals)` claims one
  sprite per render, never per path, because a claim keyed on `Astro.url.pathname` lives in a module loaded once
  per process, so the second request for `/` would paint three `<use>` refs and no symbols (D297) — and **not** by
  the layout, because a page that paints no mark should ship no glyph bytes: the counterfactual on `/chat` is
  **+2,201 gzip**, 41.0% of that page's 5,372 gzip bytes @measured 2026-11-13 by `node design/mark-cost.mjs`
  (Linux native, Node 24.22.1, gzip of the built page). @measured 2026-11-14 by `node design/mark-cost.mjs`:
  `/` and `/join` paint no mark and ship **no sprite at all** (`index.html: no sprite element found in the built
  page`), `/chat` the same, and `/schedule` is the one page that draws glyphs — the sprite is 4,307 raw / 1,892
  gzip, **+2,207 gzip** there against **+2,304** for inlining the three glyphs, so the sprite saves **97** on the
  page that has clusters. The crossover is measured, not divided out: the probe repeats one cluster 1-8 times on a
  mark-stripped copy and compares gzip — sprite cheaper from **3 clusters** on (2,542 vs 2,564 at 3 on a
  schedule-shaped page), dearer at 1 (2,489 vs 2,416). D294's "breaks even at two clusters"
  divided a gzip-deduplicated total by the cluster count and is superseded by **D300**; the parked row in
  `PLAN.md` §Parked is closed by that measurement.
  The one-sprite-per-render rule was measured on a fixture that renders
  the cluster twice: 3 `<symbol>` defs, 6 `<use>` refs, three requests in a row @measured 2026-11-13 by
  `node design/sprite-claim.mjs` (fixture deleted after the run; D297).
  The glyph is painted in `currentColor`, so a mark is the ink of the label it belongs to and turns accent with it on
  hover; a mark that carried its own brand colour would be a second colour rule, which the named-roles section
  forbids.

Measured, at every shipped viewport @measured 2026-11-14 by `node design/schedule-geometry.mjs
--routes /schedule --widths 1240 1024 900 768 640 390 320` on `dist/client` (Linux native, Firefox 159.0). One row per printed date,
and the window prints **five** open dates @measured 2026-11-13 by `node scripts/check-schedule-window.mjs`
(5 of 5 open rows, 2026-11-13 + 8 weeks, cap 8, hidden 0), so `/schedule` has five rows to measure — two shapes,
because the art differs (socials 323x156, study sessions 323x185).

Rows are printed in date order; the five shipped rows take two shapes because their art differs. `/schedule`'s
column below gives the **social** row first and the **study-session** row second where they differ.

| width | `/schedule` row | its copy lane |
| --- | --- | --- |
| 1240 | 1164x196 / 1164x217 | 633x164 (both) |
| 1024 | 948x232 (all five) | 417x200 |
| 900 | 840x480 / 840x509 | 792x164 (both) |
| 768 | 708x480 / 708x509 | 660x164 (both) |
| 640 (stacked) | 580x516 / 580x545 | 532x200 |
| 390 | 346x576 / 346x632 | 314x265 / 314x293 |
| 320 | 276x594 (first row) / 276x616 | 244x317 (both) |

The first row at 320 is **594** where every other social row is 570: the zone word `Central` on the first date
wraps to a second line inside a 244px lane @measured 2026-11-14 by `node design/schedule-geometry.mjs
--routes /schedule --widths 1240 1024 640 390 320` — **+24px on that row, +24px on the page (4032 → 4056)**, and
**0** at 1240, 1024, 640 and 390. That is the price of naming the zone once (D327), and it is the only row that
pays it.

The homepage card this table used to carry a column for (1164x228 at 1240, 276x626 at 320) is history with the card
(D306). The shape is gated, not remembered: `npm run check:row-geometry` (17-case selftest, 0 wrong, both steps in
`verify`) reads every emitted row's `data-head`, its `max-w-measure` prose wrapper, the plate after the copy zone,
the row's `<time datetime>` against its `data-date` handle, and the emitted `--container-measure` against the 40-75 band, and it failed on the audit's question — before it
existed, deleting the head or the cap changed nothing any gate could see (D314, S038). The desktop rows did not move when the row became three zones (D313); **900 and 768 are 28px taller** than
the 2026-11-13 table recorded (452→480, 481→509) because the row's prose now wraps inside `max-w-measure` instead of
running the full 792px column.

The leaf is **112x96** in every box. The plate is the cap **323** wide down to 390, where the column is narrower
than the cap and it paints **314x151** (study sessions **314x179**; at 320, **244x118** and **244x139**); at 1240 it
paints **323x156** for the socials and **323x185** for the study sessions, with its right edge 24px inside the
keyline. **The plate's painted height belongs to the event's art, not to the rule** — the 323 cap is the rule, 156
and 185 are these dates' images, and the box heights above move when the schedule does.

What the sign-up cluster costs, measured by running the same probe against a copy of the built page with every
cluster stripped @measured 2026-11-13 by `node design/grill/strip-clusters.mjs` then
`node design/schedule-geometry.mjs --dist .design/tmp-no-cluster --widths 1240 1024 900 768 640 390 320` (the two
runs are kept side by side in `.design/tmp-geometry-2026-11-13.txt` and
`.design/tmp-geometry-nocluster-2026-11-13.txt`, both on the five-row build): on `/schedule` the strip adds **+40/+0/+0/+0/+0/+88/+116px** for
1240→320 (per-row socials: 196→156, 232→232, 452→452, 452→452, 516→516, 576→488, 570→454): at 1024 and below the
plate, not the lane, is the tallest thing in the box, so the cluster costs nothing there until the column gets
narrow. Three platforms therefore cost **40px** of a desktop row and **88-116px** on a phone.
Page totals
@measured 2026-11-14 by `node design/whitespace-survey.mjs --routes / /schedule --widths 1240 390 320` (`npm run
check:space` runs the same tool on `/` only): homepage **2938px at 1240** (painted 9.0%), **4048 at 390**, **4684 at
320** — **153px shorter at 1240** than the card build this section used to quote (3091px, 10.2%), which is the date
card and its deck; `/schedule` **1835px at 1240** (painted 15.1%), **3760 at 390**, **3928 at 320**. The captions the
three horizon plates now carry are part of that: the band measures **236px** tall at 1240 against the **194px** of
its tallest plate alone @measured 2026-11-14 by the same survey — a caption is a line of `--micro` type under a
figure, and D312 decided it should be there. `/schedule` is 565px taller than the one-row build it replaced, which is
the four new rows, not a layout change. The list-to-its-own-page saving measured in the 2026-11-07 pass was
**4221 → 3180px at 1240**; the homepage has been edited since, so read that pair as history and the numbers above
as the state.
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

**Name a gap the site cannot fill, in the open** (round-5 communication read A4, D368): the page says so in
its own words — "There is no syllabus, no reading list to keep up with, and no current focus." on `/`,
"…is not something a page can tell you." on `/`, "The club has no front desk and no phone number; the chat
is where you ask." on `/join`. A gap the reader can see and a gap the page does not know it has are **different
defects**, and only the second is worth finding; `node design/visitor-questions.mjs` keeps them apart as
DECLINED vs UNANSWERED (3 declined in the open, 7 unanswered @measured 2026-11-16 by that probe). Refusing is
never a substitute for a source: an ungrounded contact, price or room description would be a claim (D92).

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
  `path-discord-on-ink`, the domain in `accent-on-ink`, hairline `rule` between. No fill buttons on a band —
  `ink` on `ink` is invisible.
- **The mark is the operator's sphere diagram** (geometry from the ratified round-4 specimen, corrected on
  the operator's rulings of 2026-11-02 — see *Graphics* below). The two curves arriving at the meeting point
  carry `accent-on-ink` (5.69); `accent` on ink is 2.97 and banned (D316).
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
   Discord path's token pair is 5.41 on the band while the brightest painted cluster in the JPEG lands below it
   (the pair-vs-pixels gap was measured 4.60 / 4.27 on the pre-D316 card) — holding the pixels to
   4.5 would fail honest work, so the palette is held to the bar and the pixels to 85% of the pair.
4. Colour-cluster merging (40 RGB units) folds JPEG ringing into the reported colour and moved an accent
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

**The tab mark now has that gate (D310).** `public/favicon.svg` had none, and it showed: the mark shipped
Tailwind's default `#3b82f6` ground with a `white` glyph — a colour in no token and a pair measuring **3.68**
against the 4.5 text bar, in the tree since the Init commit and untouched by the design round @measured
2026-11-14 by `node design/grill/okcolor.mjs` (the repo's one OKLab implementation). It now paints
`--color-ink` (#17130c) ground with a `--color-paper` (#faf6ec) glyph, **17.15** @measured 2026-11-14 by
`node design/grill/palette-remap.mjs`, the same pair the band and
`::selection` use, and `rx 6` is `--radius-control`. `npm run check:favicon` asserts four things from the
committed bytes: every fill is a token, at most two colours in the mark, the pair clears 4.5, and no
`--color-path-*` hue appears in it (round 3b reserves those hues for channels the visitor leaves for).
`check:favicon:selftest` plants each of those defects — a named colour, a Tailwind hex, a 3.66 pair, three
hues, a channel hue, an empty mark, a missing file — with three clean controls @measured 2026-11-14 by the
selftest: **10 cases, 0 wrong**; the gate runs in **0.18s**, its selftest **0.18s**, both in `verify`.

## Graphics — the club's own diagram, drawn, one source of truth

The site's graphic language is the club's diagram (D86): routes arriving at one point on a sphere. **No
stock people photography, ever** (D94: no photograph of this club exists, so a photo of strangers is a
false statement about who attends). The rule is about **photographs of people**, not about pixels: round 10
(2026-11-02) ruled in historical plates, so eleven PNGs under `src/assets/photos/` are live in the artifact
(hero, three horizon leaves, seven event thumbs), each one built by `npm run plates` from a quarantined scan
and each one's provenance written in that directory's README. What `ratify-check.mjs` checks is the
structural version of that: **every raster a live source imports comes from `src/assets/photos/`** — an image
imported from anywhere else is an unprovenanced file in the artifact @measured 2026-11-14 by
`node design/ratify-check.mjs`. The rule used to be stated as "no live source under `src/` may import a
raster", which that tool has been reporting as a FAILURE against `HorizonBand.astro` ever since the plates
shipped — a check asserting something the tree contradicts is an assertion, not a detector (D282's class).
Note also: `ratify-check.mjs` is a **design-round tool, not a step in `verify`**, so nothing runs it on a
ship commit; `check:classes`, `check:design` and `check:favicon` are the tracked enforcement today.

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

- **Colour by role, in literal classes**: `stroke-rule` (sphere), `stroke-ink` (routes), `stroke-accent`
  (accents, meeting dot), `fill-accent`. Tailwind generates CSS only for classes it sees in source, so the
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
**1.49px** and its pixels top out near 2-3 against the ring's ground where the token pair is 3.66, while the routes
(1.61px, pair 17.15) and the accent (1.84px, pair 5.77) stay fully covered. So at phone width the mark reads
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
  (line pair 3.66, route pair 17.15, accent pair 5.77; neutral roles split at the geometric mean, warm roles by
  R−B ≥ 25). Guessing them from luminance classified the sphere ring as route ink and produced confident
  nonsense ("0 crossings", "0 accent pixels near the pole").

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
  An `alt` is **at most 12 words and says what the picture shows**; the citation (book, year, leaf) goes in the
  `<figcaption>` under it, and a plate that carries nothing the page does not already print is declared
  `data-decorative="true"` with `alt=""` — a decision on the page, not a gap (D324, 2026-11-14, superseding D312's
  18-word cap and the five event plates' "The club's own event image for this social", 8 words about the file rather
  than the picture). `npm run check:alt` reads every `.html` in the artifact and fails a missing alt, an undeclared
  empty alt, an alt over 12 words, an alt that names the file's role, a citation in an alt with no caption, and an
  `<img>` with no intrinsic size: **2 described alts, 0 declared-decorative plates, longest 12 words, 5 built pages**, word counts `10x1 12x1` @measured 2026-11-16 by `npm run check:alt`. The **4 alts and 5 plates** this
  bullet carried on 2026-11-14 counted things that are no longer on the page: three of the alts were horizon leaves,
  and D347 kept one of them on 2026-11-15; the five decorative plates were the event art, and **D359**'s sweep of
  2026-11-16 deleted it. What ships now is two `<img>` on the home page — the hero plate and one horizon leaf — and
  no event asset at all.
  The **review** state (placeholder mode, reachable only from `src/content.local/`) draws the measured box with
  `inset-shadow-accent` and **no fill**: a `rule` ring over a `tint` fill puts the ring on two grounds at once
  (D149-3c, record 0024 measured 2.74 inside / 3.01 outside on the pre-D316 palette; `rule` now reads 3.10 on
  tint and 3.66 on paper, so the straddle is the only half of that rule left standing). The accent reads 5.77 on
  paper and 6.07 on panel @measured 2026-11-14 by `npm run check:contrast`, and with no fill the ring has one
  ground on both sides.
  No browser gate can see this state on the shipped page, so it has to be right by construction; the review-build
  recipe (`src/content.local/` + `check:render:dist`) is in record 0024.
- **No image filename contains a date, and an asset shared by more than one event is named by media UID and
  marked `standing: true` in the manifest** (the operator's rulings letter of 2026-11-16, R8, **D360**, and
  **D359**'s naming rule, which supersedes D190's `event-<slug>.<ext>` key). This sentence replaces the round-4 brief's
  criterion "no image is painted on a date its filename contradicts", which was **vacuous**: it was satisfied by
  having no filenames that bear dates, so it decided nothing and could not be failed. What ships today satisfies the
  half that matters in the stronger way — seven mirrored `src/assets/photos/event-*.png` were deleted in D359's
  sweep, so `src/assets/photos/` carries four PNGs and **no event asset at all** — and it decides the future half:
  an asset a re-mirror would name is `<role>-<mediaUid>.<ext>` (`social`, `study`), and `npm run events:harvest` prints
  the reuse count that sets `standing: true` rather than leaving it to a comment (media `1f54c2` serves 5 rows,
  media `0e26aa` serves 3 @measured 2026-11-16 by `npm run events:harvest`). It is checkable with a `find` for digits
  in a filename — but that census **over-reports here**: `find src/assets/photos -name '*[0-9]*'` prints 3 of the
  4 PNGs @measured 2026-11-16, and every digit run in them is a book year (Euclid 1903, Euler 1910, the 1922 radio
  text) under D167's provenance keys, not a meeting date, so what decides is that **no filename names a row** a date
  could contradict. What ships: 5 built pages carrying **2 `<img>` in total**, both on `/` (the hero plate and one
  horizon leaf) @measured 2026-11-16 by `find dist/client -name '*.html' -exec grep -o '<img' {} \;`.
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
- **Attribution is one static line, and it is not the same line on every page.** The exit band carries one
   clause — "Meetup and Discord are the platforms’ own names." — beside the two platform names it paints,
   and `/join`, the page that talks about the platforms, carries the full pair in its small print: "Meetup
   and Discord are trademarks of their owners. This site is the club’s own — not sponsored or endorsed by
   either." Neither block is a component, and both stay capped at `max-w-measure` like any prose block
   (round-5 communication read A2, 2026-11-16, **D366**). What this replaces: the pair used to live in the band,
   so one fact pair printed **10 statements** — the census calls the pair TWO clusters of 5 statements across
   the five emitted pages, and `node design/communication-price.mjs` prices deleting them per route at
   **19 · 19 · 17 · 19** and **26 · 27 · 25 · 26** gzip octets on `/404`, `/chat`, `/join`, `/schedule`
   (@measured 2026-11-16, record `design/communication/price.json` clusters #1 and #2); a reader met the
   same disclaimer on `/404`, which is the page that needs no disclaimer at all.
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
npm run check:scale             # every margin/padding/gap step written in src/ is one of the eight above:
                                # 45 source files, 52 distinct spacing utilities, 0 off-ladder @measured 2026-11-14
                                # by `node scripts/check-scale.mjs` (its 12-case selftest plants gap-5, mt-23, py-10,
                                # mt-7, gap-3.5, p-[13px] and a responsive-prefix case, plus a comment quoting the
                                # defect that must NOT fire). `check:classes` proves a class *resolves*; this is the
                                # gate that proves it is on the scale.
npm run check:outline           # one h1 per built page and no skipped level: 5 pages, every ladder starting at h1
                                # @measured 2026-11-14 by `node scripts/check-outline.mjs` (12-case selftest)
npm run check:ext-links         # every anchor that leaves the site: rel carries noopener, it opens a new tab, the
                                # "opens in a new tab" words are sr-only, no platform is named twice in one
                                # accessible name, and no club route is painted target=_blank — 33 outbound anchors,
                                # 33 qualified @measured 2026-11-14 by `node scripts/check-ext-links.mjs` (15 cases)
npm run check:provenance        # every "how current is this" line goes through `provenanceStamp()` in
                                # `src/lib/provenance.mjs`: relative inside 30 days, absolute beyond (D322). 43
                                # source files, 5 built pages @measured 2026-11-14 by `node scripts/check-provenance.mjs`
npm run check:line-art          # every `<figure data-line-art>` is a captioned `role="img"` drawing under 1200
                                # bytes, strokes currentColor, nothing filled: the one original drawing on the site,
                                # `/chat "undoable-steps"`, 622 bytes, 9 strokes @measured 2026-11-14 by
                                # `node scripts/check-line-art.mjs`
npm run check:threads           # the home page paints exactly min(cap, items) thread bullets and, when the set is
                                # larger, links "the rest of the list" to /chat#threads — cap 6, 9 in content.json,
                                # 6 painted, 3 reachable @measured 2026-11-14 by `node scripts/check-threads.mjs`
npm run verify                  # the browser-free CI gate set (everything above except the pixel gates)
```

**Claims about absence are made against a byte census of the built HTML, not a text extraction** (the operator's
rulings letter of 2026-11-16, R6, **D364**, closing round 4's nav/footer item): "The round-3 finding was produced by
a text extraction that drops `position: fixed` chrome; the artifact was never missing its nav. Claims about absence
must be made against a byte census of the built HTML. The honest instruments are `npm run check:render:dist` (nav-fit
and mark cells) and `node design/nav-fit.mjs`." Every built page carries 2 `<nav>` and 1 `<footer>`, so the class of
finding that reported a missing nav was an instrument's blindness rather than an artifact's defect — and `check:space`
saying "position: fixed elements are excluded and the count is printed" is the same trap from the other side.

**These pixel gates are the ones CI does not run, and they are no longer cheap — the cost is now stated, not
assumed.** @measured 2026-11-14 by `npm run verify:browser` (Linux native, 16 CPU, Firefox 159.0, load 2.9 →
9.0/16cpu; re-run it to refresh these): `check:render:dist` over its **20 cells** (4 widths × 5 routes: `/`,
`/schedule`, `/join`, `/chat`, `/404`) **8.94s**, `check:mark` **7.63s**, `check:space` **8.37s**, `check:ground`
**8.82s** and `check:ground:selftest` **16.19s**, the render selftest **46.06s** (it grew as the mark, cluster and
ring plantings landed — 24 cases, record 0022/0024), `check:social:live` **1.42s**, `check:rsvp-preference`
**8.15s** with its selftest **15.01s** — `npm run verify:browser` end to end is **122.4s of work** (it was 87.8s at
three routes and 44.7s before the width sets grew, D146; the browser `workSecs` baseline in
`design/gate-cost.json` is what the 2x cost guard compares against, D269). Every step's full output is written
even when it passes, under `.design/tmp-gate-logs/` (**D144**), so a green run leaves the evidence rather than the
word "ok". `verify` stays browser-free
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
back, which is why the harness and the oracle measure the same thing. The numbers the round-4 palette printed
through both — rule on paper 3.01, ink on paper 12.02, band text 10.19, meetup/discord on ink 4.74 / 4.59 — are
that palette's; the table at the top of this file is the current one (D316).

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

## Surface grammar: headings, links, the thread list, drawings (ruled 2026-11-14)

These are the rules the second commissioned read (docs/design-critique-2026-11-14.md) asked for that this repo
accepted, each with the gate that keeps it true.

- **Nothing sits above a page's first heading.** The eyebrow is gone; where it carried meaning it became a
  subtitle *under* the h1 (S040, D309). `check:naming` plants an eyebrow above the h1 and a section h2 that is
  another page's h1; `check:outline` (12 cases) fails a second h1, a page starting at h2, an h1 → h3 jump, an
  empty heading and a heading whose only content is an image. Shipped: **5 built pages, every ladder starting at
  h1 and never skipping a level** @measured 2026-11-14 by `node scripts/check-outline.mjs`.
- **A link that leaves the site says so, once.** `rel="noopener noreferrer"`, an arrow, and
  `, opens in a new tab` in an `sr-only` span — the words are written once, in `src/lib/links.mjs`, and derived
  from the label so a label that already names the platform does not name it twice (S041, D317). **24 outbound
  anchors, 24 carrying the qualifier, 24 held to the rules** @measured 2026-11-16 by `npm run check:ext-links`
  (the 33 this bullet carried on 2026-11-14 counted the four standing platforms each schedule row used to repeat;
  D342 moved them out of the row, and a count that only ever grows by repetition is the reason the count is printed
  rather than ruled).
- **Two tiers of outbound link, and they are not the same decision** (the operator's rulings letter of 2026-11-16,
  R4, **D361**). A row's primary link goes to **that event's** page — the way out for a visitor deciding about one
  specific date. The standing row's link and the exit band's go to the **group root** — joining a thing that persists,
  which is not a question about a date. Two purposes, two URLs, **not an inconsistency and nothing to dedupe**: a
  page that pointed both tiers at one URL would be answering "how do I come to this date" with "join the club".
  `signUpPaths()` is where the first tier comes from and `splitPaths().standing` is where the second comes from,
  so the two are computed from different calls and a future reader cannot mistake a mismatch for a defect.
- **The link ceiling, as accepted** (the operator's rulings letter of 2026-11-16, R1, **(a)** — same-origin is not
  an exit, and the ceiling is not bought back by adding a door to a page). The acceptance, verbatim, replaces the
  round-4 brief's §6 parenthetical and its §10 clause:

  > `/schedule` at 390px offers five row primaries (one per printed date, distinct event URLs), one standing
  > platform whose URL the footer does not already paint, and one same-origin calendar route. Absolute URLs
  > outside the `<footer>` element: 6. No page on the site exceeds 6 absolute URLs outside its own `<footer>`.

  The instrument is the built artifact, not a source read: count `<a href="http…">` anchors outside each page's
  own `<footer>` in `dist/client` @measured 2026-11-16 over the 5 built pages — `/schedule` 6, `/join` 3, `/chat`
  2, `/` 2, `/404` 1, so the page's ceiling is met and `/schedule` is the page that defines it.
- **Spacing steps are audited, not remembered.** Tailwind v4's dynamic scale makes `mt-23` resolve, so
  "the class exists" was never "the value is on the ladder" — `/join` shipped `gap-5` under a green `check:classes`
  (S042). `check:scale`: **45 source files, 52 distinct spacing utilities, 0 off-ladder** @measured 2026-11-14 by
  `node scripts/check-scale.mjs`.
- **The homepage thread list is capped at six, with the remainder linked** (S042, D320). The cap lives in
  `WhyJoinUs.astro` as `const VISIBLE = 6`; `check:threads` reads that number rather than restating it, and fails
  a page that paints more, paints fewer without a reason, promises the rest with no link, aims the link anywhere
  other than `/chat#threads`, or links to an anchor the `/chat` page does not have. **cap 6, 9 in content.json, 6
  painted, 3 reachable** @measured 2026-11-14 by `node scripts/check-threads.mjs`. The columns break at `md`
  (768), not at the read's 900: the list measures **720x273** at 768 with each column **344px** wide, **852x273** at
  900 with each **410px**, and **592x434** in a single column below the flip @measured 2026-11-15 by
  `node design/whitespace-survey.mjs --routes / --widths 1024 900 768 640 390 320` — the two columns save 161px of
  page height exactly where the read wanted them switched off, and `--breakpoint-900` does not exist in this repo.
- **A thread's gloss is standing copy, not a duplicate to fold** (round-5 communication read A1, 2026-11-16). The six thread glosses each print twice — the home page's *What we take up* list is the **signpost** and `/chat`'s *What the club is pulling on* list is the **thread** — and both read the one `threads` field in `src/content.json`, so one edit moves both surfaces and neither can drift (same one-home rule as D361's two tiers of link). Cost of the duplication, @measured 2026-11-16 by `node design/communication-price.mjs` (record `design/communication/price.json`, clusters #4–#9 at this artifact): **363 characters, 158 gzip bytes on `/chat`**, per-gloss deltas 29 · 34 · 28 · 25 · 24 · 18 — the probe's figures move when the band's own copy moves (the round quoted 363 characters / 157 gzip, and D366's band clause moved it to 158), so the number comes from the probe, not from this line. `node design/communication-census.mjs` prints those six as clusters of 2 statements across `/` ↔ `/chat`. Folding was refused: option (a) — print the name alone on `/chat` — costs 0 bytes but leaves that page's thread list a bare list of names, and the operator has not accepted that. Kept as **deliberate standing copy**, like D218's provenance pair: 12 statements of 6 facts, and `npm run check:threads` (cap 6, 9 in `content.json`, 6 painted, 3 reachable) is what keeps the two surfaces in step. The measurement that would change the ranking is printed by the census either way: whether `/chat`'s own summaries already re-state a gloss.
- **A drawing the club owns is drawn, not borrowed** (D323). One figure, `data-line-art`, hairlines only,
  `currentColor`, no fill, under 1200 bytes, `role="img"` with a ≤ 12-word label and a caption. `/chat
  "undoable-steps"`: **622 bytes, 9 strokes** @measured 2026-11-14 by `node scripts/check-line-art.mjs`.
- **A date is an element, and the zone is named once** (D327, the read §5.1). Every row's date sentence sits
  inside `<time datetime="YYYY-MM-DD">` carrying exactly the value the row's `data-date` handle carries, and the
  **first** row `/schedule` prints appends ` Central` — the feed's own `DTSTART;TZID=America/Chicago` is where the
  word comes from (D188), and one word on one row is the whole cost. `check:row-geometry` (17 cases) fails a loose
  date, a `<time>` whose value disagrees with `data-date`, a page that names no zone, a zone named on the second
  row, and a zone repeated **5 page(s) → 1, 5 rows → 1** @measured 2026-11-14 by `node scripts/check-row-geometry.mjs`.
- **Source syntax never reaches a reader as prose.** Astro templates have no `//` comment and do not render a
  brace-comment, so a `//` line between tags is page text and an attribute written after a closed element is page
  text too. `check:escapes` catches both in the artifact and at the source (D325): nine comment lines painted on
  `/` and five rows of `/schedule` painting `class=rounded-control event-art />` were both found this way
  @measured 2026-11-14 by `npm run build` plus `node scripts/check-escapes.mjs`.

## Open threads that are not gates yet

- **A background pattern is ground, not a graphic — operator ruling 2026-11-03, nothing built.** Asked whether a
  barely-noticeable paper texture belongs under the page, the answer measured (record
  `design/records/0019-a-ground-texture-has-zero-headroom.md`): the ceiling is the boundary role, not
  legibility. The `rule` hairline sat at **3.01** against a 3.0 bar, so a ground that went **one 8-bit level
  darker** was already under its own bar (2.96) @measured 2026-11-03 by `design/grill/round17`'s ground probe;
  D316 gives the boundary role 3.66 of headroom on paper, so the ceiling is now 0.66 rather than 0.01, while body
  text survives ±40 levels; rendered paper is
  `252,250,246`, three levels from clipping. Only a **light-only** grain (token ground as the floor, ≤3 levels
  up, σ ≈ 0.5) fits, and it leaves the area metrics alone — painted **4.48 → 4.49%** at 1240, **9.68 → 9.84%** at
  390, empty-run unchanged — because it sits under the survey's 0.05 same-colour bar. `panel` is no longer
  excluded by the ring number (D316: `rule` on panel is 3.85), and the ink band still needs its own specimen.
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
  3b); the accent keeps its **0.135** minimum distance to every other colour (the Amazon/UMN zone, D88 — D316
  records where the adopted accent sits inside that bar and `check:contrast` fails only if a token drifts
  *closer* than the recorded number); any
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
  broke that rule itself — **gold ↔ path-discord is 27°** on the round-9 palette — and D316 closes it: the accent
  sits at 35.7° and discord moved to 262°, 134° apart, with the smallest reserved gap 46° @measured 2026-11-14 by
  `node design/grill/palette-remap.mjs`.
  And one colour can never do both jobs: for anything between paper and ink in luminance,
  contrast-on-paper × contrast-on-ink = **12.02** on the round-4 palette, and 4.5 × 3.0 = 13.5 > 12.02 — which is
  why every role has an `-on-ink` twin and why `MARK_COLOURS` is keyed per ground. D316 moves that product to
  **17.15**, so the arithmetic no longer forces a twin by itself; the twins stay because the gate asserts them
  and a per-ground table is the only way to say which hue a role may take (D116).
  Measured on painted pixels (two bars, because one bar hides one trap: **ink itself is chroma 0.045**, so the
  0.04 count includes every glyph; **0.08** sits above every neutral and is the colour a reader would call
  colour): as shipped **13.6% / 0.0% / 2 hue families**; colour-on-meaningful-things **12.7% / 0.4% / 5**;
  colour-as-area **12.9% / 0.5% / 6, but 46.9% faint**. That last one is the finding: the shipped
  `oklch(95% 0.03 …)` tints sit **under** the census bar, so a tinted field buys no measurable colour, and it
  costs the accent of that round its text bar — **4.39 on a tinted hero** against 4.5 (4.82 on paper). The open-window
  accent (hue 266, L 55.5, C 0.06) is legal but tight — **4.56 on paper, 4.5 on ink**, both inside the noise of a
  font change — and its nearest commerce brand is **0.11**, dirtier than the accent's 0.135. A warm accent needs the
  **R-4** re-arrangement (fold the accent twins, retire `path-mobilizon`, move discord) which costs **12 measured
  pairs**; retiring mobilizon alone, or moving accent+discord, does **not** open a warm window. The mark's four
  colourings measure the same coverage (8.10–8.15% of box; 3930–3973 px at the 1.5 device-px floor), so that
  choice is about the two lines staying two *things*, not about legibility.
  **Ruled 2026-11-02 (partial):** **H-A approved** — no new hue; the free win is spending colour on things that
  mean something. **K-B provisionally accepted** — one route line in the accent (`accent-on-ink` on dark grounds) "until we
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
  given the site rule "a hairline rule at most": the header band is **1240×72** and **5.00%** of its pixels differ
  from the page behind it — 2.78% the inset ring's two rows, 2.22% the nav ink (4,462 of 89,280) @measured
  2026-11-13 by `node design/header-band.mjs .design/tmp-round17/shot-shipped-1240.png 71`; the **1.0%** this
  sentence carried was shot before the inset ring was part of the bar, so it is superseded, not corrected. The
  survey's own per-surface row reads the header as **1.3%** painted rows @measured 2026-11-13 by
  `node design/whitespace-survey.mjs --routes /` (a row counts as painted at ≥40 ink px, so a 1px ring does not
  register there), and the footer as **1240×284** at **1.7%** painted rows — the single largest unbroken field on
  the page. Mass, not weight, is what breaks that rule today, which is why the attribution
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
