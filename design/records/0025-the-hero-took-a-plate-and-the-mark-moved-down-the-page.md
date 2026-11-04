# 0025 — the hero took a plate, and the mark moved down the page

Ruled and applied 2026-11-03. Round 13 (`design/grill/round13/report.json`, specimen
`design/grill/round-13-hero.html`) measured seven ways to fill PS-1; the operator chose **option C - stacked
column, plate takes what the mark does not need** - and confirmed the schedule-card question as *"art, if it
suits the layout"* (the round's `ps4` pair measures the fit; the composition itself is still open).

## What shipped, and what the column is now

`PS-1` is a `lg:flex-col` column: plate above, mark below, `mb-8` between. The plate's box is not a chosen
ratio - it is subtraction, so the column is exactly full:

```
307 = 574 (PS-1 at 1240) − 235 (mark at full column width) − 32 (mb-8)
```

`@measured 2026-11-03 by check:space`: PS-1 **376x574.1** (was 376x574.1 - the column did not move); plate
**376x307** at x=840, y=200.1; mark **372x232.5** at 832,538.7 (check:render's probe, which sees a 372-wide
column because of the scrollbar; check:space says 376).

The file is `src/assets/photos/hero.png`: **56% of the Byrne 1847 Euclid IV.15 leaf** (`byrne-1847-euclid-iv15`,
Internet Archive `ia-firstsixbooksofe00byrn-176-281`), built by `npm run plates` (`scripts/plate-asset.mjs`) at
**752x614** - 2x of 376x307, because at 1x the 3px hairlines land on half-pixels (D119). Astro serves it as
webp (`hero.*.webp`, `natW 752`). The crop recipe is one module, `design/grill/plate-crop.mjs`, so the asset and
the specimen cannot drift: both are sha1 `308193c78a`, byte-identical.

## What it costs

| | before (mark alone) | after (option C) | how |
| --- | --- | --- | --- |
| page height @1240 | 4284 | **4284 (+0)** | `check:space` |
| page height @390 | 5859 | **6173 (+314)** | `check:space` |
| plate renders @390 | - | 358x292.3 | `check:space` media |
| mark box @320 / @640 | 276x172.5 / 512x320 | same boxes, **moved to y=1421 / y=1129.9** | `check:mark` |
| mark's thinnest stroke @1240 | 1.49-1.81px | **2.02-2.17px** (floor is 1px, D119) | `check:render` |
| page chroma >= 0.08 @1240 | 0.014% | **0.274%** | `check:color` |
| page chroma >= 0.08 @390 | - | 0.032% | `check:color` |
| painted mark coverage @1240 | 0.909 (row) | **1.003** | round 13 paint probe |

**Palette delta, stated plainly (D149-1b/2b asked for it):** the plate takes the page from 0.014% of pixels at
chroma >= 0.08 to **0.274%** at 1240 - one coloured slot, as ruled. The loud alternative record 0023 priced
(`euclid-elements-book1-def10-text`, 54% of its leaf) was **+2.63%**: this Byrne leaf at the same treatment is
~10x cheaper on that axis because the leaf is a fine engraving on cream, not a field of saturated wash. Round 13
also priced 3:2 (0.254%) against fill (0.297%), which is why the extra 57px of plate was not worth a debate.

**Mobile cost, which the specimen's page column did not show:** the hero stops being a grid below 1024, so the
plate adds its own height to the scroll - **+314px at 390** (the round's CSS-only mutation measured +386). The
ruling was made on a desktop specimen. Whether the phone should carry the full plate, a shorter one, or none is
an open question with three answers that should arrive as photographs (D160).

## The catch: a gate that photographs a fixed-height window lost the mark

`check:mark` went red the moment the plate landed:

```
the mark's vertical centre (y=1421) is outside the 1400-tall shot.
... ring crossings: 2 across, 1 top rim; gold pixels near the pole: 0 — cannot measure where the lines meet
```

The mark was painted correctly. Its *position* moved: the plate sits above it, so at 320 the mark's centre is at
y=1421 and at 640 its box bottom is at 1449.9 - both outside the 1400px window `mark-check.mjs` had hardcoded
("window heights match the render gate's"), and a shot that stops above the ink reports no ink. That is record
0015's failure class - a fixed frame around a taller document, reporting a different page - re-created in a gate
the widths round had not visited.

Fixed by the repo's existing rule, not a new constant: `mark-check.mjs` now asks the page its settled height and
shoots at `shotHeight(h, …)` (`grill/shot-height.mjs`, cap 9000, refuses rather than truncates). Cost, measured:
`check:mark` 3.8s -> **7.92s** (one extra probe per width, plus taller shots); `verify:browser` landed at
**76.0s vs an 87.8s baseline (-13%)** despite that.

## Still open after this item

- **PS-3** (the join column's 532x56 strip): the operator chose C, not G, so it stays a text strip for now. Its
  measured shape - one line, 532x56 at 1240 - is unchanged from round 12.
- **PS-4** (schedule cards): art ruled *yes if it suits the layout*; the pair measured a 323x110 thumb fitting
  with 157px spare at 1240 and 3px at 390, +122px of card, no contrast or gate change. No event has a date, so
  there is nothing to attach it to yet.
- **Round 13's variants are now stale as a description of the tree**: they mutate a base where PS-1 is a row.
  The next round re-anchors with C as the incumbent.
