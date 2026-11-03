# 0021 — vertical rhythm is three numbers that disagree, and R7's content round moved all three

The operator asked for "rhythm" to be documented — what it is and how it relates to the other open decisions —
because R6 has been carried as "measured, unruled" for several rounds and the table underneath it went stale
without anyone noticing. This record is that documentation. It rules nothing.

## What "rhythm" is here

Not musical rhythm, and not a spacing scale. **Rhythm is where the emptiness sits on the vertical journey**, and
R6 is the question "which of these five ways of moving it do we take, if any". `design/rhythm.mjs` applies each
option to a **copy** of `dist/client` and measures the result at 1240 and 390; the shipped artifact is never
mutated. The options:

| option | what it changes |
|---|---|
| `edges` | hero margins 128/96 → 64/64, section padding 64 → 48 — the declared at-edges air |
| `edges-rules` | the same trims, with a 1px `rule` at each band boundary instead of the lost air |
| `interior` | inside surfaces only: the six-card grid 64px in + 32px gaps → 40px in + 24px gaps |
| `slots` | PS-1 and PS-3 filled at their approved sizes (hatched stand-in, geometry only — no photograph shipped) |
| `all` | edges + interior + slots, to see the ceiling of the code-only option |

## Three numbers, and they disagree

`check:area` and `check:rhythm` print the same page through three lenses, and **a ruling that does not say which
one it is buying will be re-litigated later**:

- **document height** — how far a reader scrolls;
- **empty-run %** — how much of that journey is nothing at all (runs ≥ 60px);
- **painted %** — how much of it is something (delta-OKLab ≥ 0.05 against each pixel's own ground).

The clean case that proves the point is `slots`: at 1240 it removes **51px** of emptiness (25.3% → 24.1%) —
almost nothing — while raising painted share from **4.48% to 8.52%**, nearly double. A photo slot is not mostly
*emptiness*, it is mostly *something*. So "cut the emptiness" and "make the page read as full" are different
goals with different winners, and the emptiness lens alone would have picked `edges` over `slots`.

## The table, re-measured on the R7 page (siteFp `77d8dc87df`, 2026-11-03)

`@1240` — shipped: **4196px** tall, empty **1062px (25.3%)** in 8 runs, biggest 219px, painted **4.48%**, at-edges 668px.

| option | doc px | empty px (Δ, %) | runs | biggest | painted % | at-edges |
|---|---|---|---|---|---|---|
| edges | 4004 (−192) | 870 (−192, 21.7%) | 8 | 171 | 4.69 | 572 |
| edges-rules | 4007 (−189) | 873 (−189, 21.8%) | 8 | 172 | 4.69 | 575 |
| interior | 4292 (+96) | 1315 (**+253**, 30.6%) | 12 | 219 | 4.38 | 668 |
| slots | 4196 (+0) | 1011 (−51, 24.1%) | 8 | 171 | **8.52** | 617 |
| all | 4100 (−96) | 1072 (**+10**, 26.1%) | 12 | 124 | 8.72 | 521 |

`@390` — shipped: **5919px** tall, empty **1275px (21.5%)** in 12 runs, biggest 150px, painted **9.68%**, at-edges 641px.

| option | doc px | empty px (Δ, %) | runs | biggest | painted % | at-edges |
|---|---|---|---|---|---|---|
| edges | 5871 (−48) | 1227 (−48, 20.9%) | 12 | 144 | 9.76 | 545 |
| edges-rules | 5874 (−45) | 1230 (−45, 20.9%) | 12 | 145 | 9.75 | 548 |
| interior | 6000 (+81) | 1532 (**+257**, 25.5%) | 17 | 150 | 9.45 | 597 |
| slots | 5919 (+0) | 1271 (−4, 21.5%) | 12 | 150 | 9.94 | 634 |
| all | 6000 (+81) | 1480 (**+205**, 24.7%) | 17 | 137 | 9.80 | 499 |

## The finding: a content round invalidated the spacing question

The table R6 was recommended from measured a **2492px** page at 1240 with **41.5%** emptiness (390: 4127px, 36.8%).
R7's content round (`0f15df8`, the undated threads, the sourced membership line, the venues, the share-card band)
grew the page to **4196px** and dropped emptiness to **25.3%** at 1240 and **21.5%** at 390 — the emptiness problem
shrank by roughly 12–15 points without a single spacing value changing.

What that does to the recommendation, stated plainly because it reverses the delegate's earlier advice:

- **`edges` is no longer a win worth taking on its own.** It was recommended against 41.5% emptiness. Against the
  current page it removes **4.6% of the scroll height** at 1240 and **0.8%** at 390, and moves the emptiness ratio
  by 3.6 and 0.6 points. It also cuts the largest run from 219px to 171px at 1240 — the one number that still
  improved materially. Buying a tighter page for that is a taste call, and D138's asymmetry ("a bigger visible
  empty area must be re-confirmed") argues for not spending air that the current page does not visibly waste.
- **`interior` is refuted twice.** It *increases* emptiness in both widths on two different page shapes
  (+253px, +257px): shrinking the grid's inner padding and gaps turns one big cavity into several smaller ones
  that the ≥60px lens still counts, and adds 96–81px of height. Reject it on measurement, not preference.
- **`slots` is the only lever that changes what the page is made of** (painted 4.48% → 8.52% at 1240). It is also
  the one thing code cannot deliver: it needs the PS-1/PS-3 photographs (R3), and it now needs them at the size
  **D141 ruled** — PS-3 is `526x316`, not the `526x165` an earlier row carried. `design/rhythm.mjs` already plants
  316; the row's *comment* is what was stale.
- **`all` is not a ceiling any more** at 390: it is *worse* on emptiness (+205px) than the shipped page.

**Delegate recommendation:** defer the `edges` trim; keep `interior` rejected with the two measurements; treat
`slots` as the real rhythm lever and schedule it with R3, not as a code-only change. Re-measure after photographs
land — if they do, R6 may dissolve entirely, because its premise (a page that is mostly nothing) will no longer
exist.

## How rhythm relates to the other open items

| item | relation | consequence for the order of work |
|---|---|---|
| **R3 photographs** | `slots` *is* rhythm-by-photograph: the largest painted-share lever measured, with no emptiness win | rhythm's real decision waits on photos, not on a ruling about padding |
| **PS-1 / PS-3 sizes (D141)** | the `slots` row is only as good as the sizes it plants; PS-3 is now 316 tall | any future `slots` number must be read off the ruled sizes, and `check:space` reports what each reserved slot measures today |
| **R5 body line-spacing** | leading is line-box geometry, and line boxes *are* the at-edges rows `edges` measures (`body 17.6/24` = 1.36, `lede 21.1/28` = 1.33, both under DESIGN.md's 1.5 floor) | do R5 and rhythm in **one** measurement pass, or the second re-measures a phantom — this record's headline finding is what happens when they drift apart |
| **R2 colour** | paused by R6 in `design/state.json`; rhythm itself moves painted % only through area, not hue | `check:color`'s 0.014% reader-named colour is unmoved by every rhythm option — spacing cannot fix colour |
| **content rounds (R7)** | content changes page height and therefore every rhythm number | a rhythm ruling must cite a `siteFp`; `rhythm.mjs` keys its cache to one, which is how the staleness became visible at all |
| **D138 (emptiness asymmetry)** | adding visible emptiness needs re-confirmation; removing it does not | the bar for `edges` is "what does tighter buy", not "is it smaller" |
| **`check:ground` (record 0020)** | a photograph is ground under its own keyline; the byte probe is what can measure that | if `slots` is taken, the ground probe is the gate that will notice a photograph sitting under a hairline |

## The frame cap was hiding 815px of emptiness at the floor width

Before this round, `whitespace-survey.mjs`, `color-survey.mjs` and `pixel-ground.mjs` each carried their own
`Math.min(6000, doc.scrollHeight)` for the screenshot height. The home page is **6978px tall at a 320 viewport**,
so at the narrowest supported width every one of those probes measured **6000px of a 6978px page** — and printed
percentages of the frame it measured, not of the page. The missing 978px is the bottom of the last section plus
the whole `bg-ink` footer, which is the darkest surface on the page.

What that was worth, at 320:

| | as measured (capped at 6000) | as measured (full 6978) |
|---|---|---|
| empty runs ≥ 60px | 10 runs, **1074px (17.9%)** | 12 runs, **1495px (21.4%)** |
| painted share | 10.1% | 9.9% |
| colour a reader would name | 0.01% | 0.03% |

**815px of emptiness — 3.5 points of the ratio — were invisible at the narrowest width**, and the colour survey
under-reported reader-named colour by 3×. The 390 and 1240 rows were unaffected (5919px and 4196px), which is the
whole reason this survived: the cap only bit at the width nobody was checking. This is record 0015's failure class
(a fixed frame of a taller document puts the footer out of shot and reports a different page) rebuilt in three new
places, which is why the cap is now one module — `design/grill/shot-height.mjs` — that **throws** naming the width,
the real height and the cap instead of measuring less and calling it the page. Firefox on this rig produced the
6978px shot without complaint, so the cap was guarding against nothing.

## The floor row: @320 (measured after the cap fix)

`@320` — shipped: **6978px** tall, empty **1495px (21.4%)** in 12 runs, biggest **294px**, painted **9.9%**,
at-edges 696px.

| option | doc px | empty px (Δ, %) | runs | biggest | painted % |
|---|---|---|---|---|---|
| edges | 6930 (−48) | 1447 (−48, 20.9%) | 12 | **294 (unchanged)** | 9.97 |
| edges-rules | 6933 (−45) | 1450 (−45, 20.9%) | 12 | 294 | 9.96 |
| interior | 7162 (+184) | 1983 (**+488**, 27.7%) | **19** | 294 | 9.65 |
| slots | 6978 (+0) | 1448 (−47, 20.8%) | 12 | 294 | 10.13 |
| all | 7114 (+136) | 1888 (**+393**, 26.5%) | 19 | 294 | 9.94 |

The floor is where the rhythm argument actually has to be won, and it says the opposite of what desktop suggests:

- **the single worst cavity is at 320, not 1240**: biggest empty run **294px** vs 219px at 1240 and 150px at 390.
- **`edges` cannot reach it.** The trims cut 48px of total emptiness at this width and the biggest run stays
  exactly 294px. A padding change is a lever on many small cavities, not on one big one.
- **`interior` is refuted a third time, and hardest at the floor**: +488px of emptiness and **19** runs (vs 12).
  Squeezing the grid's inner padding at a width where the cards are already one column just manufactures cavities.
- **`slots` still helps here** (−47px empty, painted 9.9% → 10.13%) — PS-1/PS-3 exist at the floor even though
  PS-2/PS-4 are desktop-only.

So the R6 decision, if it is taken, should be argued against **294px at 320**, not against 25.3% at 1240 — the
desktop ratio is the least damaged number on the page.

## Reproduce

```bash
npm run check:rhythm                     # all six variants, three widths, ~53s (builds if dist is stale)
RHYTHM_VARIANTS=edges,slots npm run check:rhythm   # a subset, into a gitignored path so the cited table is never half-written
```

The table lands in `design/rhythm/report.json` (tracked, because this record cites it). `siteFp` in that file is
the fingerprint of the page it measured — **quote it when quoting a number.** Widths measured: 1240, 390, **320**
(added 2026-11-03 — the floor had no rhythm row at all until the cap bug above was fixed).

Related: record 0015 (measure the settled page, and the same window before/after), 0019 (ground, and what the
page is painted on), 0020 (the byte probe a photograph will need), D136/D137 (content is the page's shape), D138,
D141, D92.
