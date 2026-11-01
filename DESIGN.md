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
| `text-display-1…4` | 33.2 / 39.8 / 47.8 / 57.3px | 36 / 44 / 52 / 60px | **the WHEN**: dates, numerals, the next-meeting line |

Leading is carried by the size token — never write a bare `leading-*` next to a size. Serif body copy
reads at `leading-prose` (1.6). Display leading floor is 1.05; the four display line boxes land on the
4px grid and each clears its measured ink box.

**Never** use one display step per screen **plus** the dark band in the same screen at full volume —
one display step per screen, mirroring the one-band rule. **Never** put the display step on a
punchline: it is reserved for when/where. **Never** use `text-display-4` (57.3px) below a 375 viewport
without a cap: "Mathematical" measures 367.6px against 343px of content width. Faces: PT Serif
(`font-body`) for content — **only weight 400 is actually loaded today**, see "Not wired yet" — and
Public Sans variable for chrome, which is not installed yet. **Never** set `font-weight: 500/600` on
serif text: PT Serif has no variable build, so it renders regular or bold and the weight you wrote is
the weight you do not get.

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
  interview cards live; cards inside it are flat with the same `rule` hairline (4.00 there).
- **Photo-free by construction**: no surface may require a photograph, because none of the club's
  existing images contains a person (D86/D94). The hero motif may be derived from the operator's own
  sphere diagram only.
- The nav is **one row, `flex-wrap: nowrap`**, with a narrow tier below 360px (links at `text-micro`,
  gaps 8px → 262px needed, fits a 320 viewport's 288px and a 300's 268px). A label set that stops
  fitting is a probe failure, not a silent wrap.

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
guard animation with `prefers-reduced-motion: reduce` — the shipped artifact contains 0 occurrences of
that string.

Weights: PT Serif delivers **400 only** today (see “Not wired yet”), so in serif text the only legal
weights are `400` and `700`, and the `700` is synthesised until `@fontsource/pt-serif/700.css` is
imported. `500`/`600`/`800` are legal **only** in chrome (the sans stack), and only once a variable face
is installed — 30 weight writes in `src/` currently render as whatever the browser can synthesize.

## Enforcement

```bash
node .design/gen-token-map.mjs  # regenerate the apply worklist from src/; exit 1 = a class write has no mapping
node .design/ratify-check.mjs   # token block → Tailwind resolver + renderer contrast (exit 0 = all bars hold)
npm run check:classes           # every written class resolves to CSS — catches a token used as a class that does not exist
npm run verify                  # the full CI gate set
```

Two things these gates **cannot** catch, so enforce must be value-aware: Tailwind v4's dynamic spacing
scale makes `mt-23` (92px) resolve, and "the class exists" is not "the value is on the scale". That is
why `.design/token-map.md` is generated from the writes rather than written by hand — it exits 1 if any
class in a replaced bucket has no mapping.

`design-enforce` (phase 5) adds the class-level linter: off-scale spacing, Tailwind colours where a role
exists, `border` keylines, `shadow-*` outside `e1/e2`, `duration-*` outside 150/250, and any frequency
word in event prose.

## Not wired yet (lands in `design-apply`, phase 4)

- Markup still writes the old palette (`gray-*`, `blue-*`, `red-*`, `shadow-*`) and the retired
  `--color-book-*` tokens; the token block keeps those entries only until the class writes go away,
  because deleting a token before its class write does is what `check:classes` exists to catch.
- Faces: `PT Serif` **400** is installed and imported (`Layout.astro:9` → `@fontsource/pt-serif/index.css`,
  which declares exactly 4 faces, all `font-weight: 400`). **`700` ships in the package but is never
  imported**, so every `font-bold` / `font-semibold` / `font-extrabold` on serif text is currently a
  browser-synthesised bold. `--font-sans` names `"Inter var"`, which no dependency provides, so chrome
  falls back to `system-ui` (measured: x-height 0.48, cap 0.69 — `.design/fonts/metrics.json`). Public
  Sans is **not installed**: its variable latin file is 26,832 B for the whole weight axis
  (`.design/fonts/bytes.json`), which is the cheap way to get chrome weights below 700.
- `shadow-e1` / `shadow-e2` are defined-but-unused until the first floating surface exists. No modal or
  dropdown is in `src/` today.
- The four island defects found in round 7 (no reduced-motion guard, no height reservation, no
  JS-off escape from the loading branch, `{#if summary?.summary}` with no `{:else}`) are defects, not
  decisions, and ride along in that branch.
- `UpcomingMeetups.astro` has no `{:else}` either: an empty feed renders nothing at all. Per **D108**,
  missing content is a state with designed content — never a blank, and never a build failure. The
  batch order and the states to build are in `.design/token-plan.md`; the per-class worklist is
  `.design/token-map.md`.
