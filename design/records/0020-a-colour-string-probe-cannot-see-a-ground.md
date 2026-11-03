# 0020 — a probe that reads colour strings cannot see a ground; the page's own keyline stayed 3.01 while the bytes moved

**Measured** 2026-11-03 on Linux (native), Firefox 159.0 (`firefox --version`), screenshots of `dist/client` over
`file://` (1:1, cache disabled), pixels through `sharp().raw()`. Built from `e974e4a` plus this item's commits, on
the branch named for this probe and R6 (a branch name is not a path — `design/audit-references.mjs` treats a
`design/...` literal in a record as a pointer, and correctly failed this file the first time it was written).

## Why this probe exists

D143 ruled a background pattern **ground**, not graphic. Its limits were written from a *scratch experiment*:
record 0019 measured a texture by generating pixels and counting them, not by measuring the shipped page. So the
ruling's amplitude ceiling (≤3 levels up from ground) was authored in a unit nothing on this rig measures, and
D143's own premise — that rendered pixels, not CSS declarations, are the authority — had no instrument behind it.

**The blindness, measured:** the whole render gate parses computed colour strings — `paintBytes()` in
`design/grill/render-measure.js` reads `getComputedStyle` colour text. A texture, a gradient or a photograph is a
`background-image`: it appears in **no** colour string. So it moves no number that `check:render` prints. The
proof is in the selftest row `css-never-moved`: with a 64x64 noise tile planted across the built page, the page's
own reported keyline contrast stayed **3.01 — byte-identical to the clean page** — while the same ring measured
**3.06** off the screenshot bytes. A gate that reports 3.01 cannot see a change that made the ring measure 3.06.

## What `design/pixel-ground.mjs` measures

- **the ground** — the colour of the largest connected region of the page whose RGB is within `GROUND_TOL` (8
  levels) of the token. It starts from the *most common* colour on the page (the page ground, not a panel) so it
  does not re-measure a component fill — the mistake record 0019 documents.
- **the ground's excursion, in 8-bit levels** — min..max of the ground window, and its sd. A grain is authored in
  exactly these numbers, and so is the paper→panel step (4 levels), which is why the whole-shot and the *flat
  window* numbers are both printed.
- **the hairline off bytes** — runs of 40+ pixels whose RGB lies between two grounds (a hairline antialiases to a
  blend, so this is the only way to find one blind). Each is measured against **both** neighbours; the stronger
  neighbour is the pair the ring is drawn on, the weaker one is reported as a named note, not a failure, because
  no ruling says which side is the official pair (record 0018's category).
- **the token-space instrument check** — `rule` on `paper` computed from token values, printed beside the byte
  number so a reader can tell the two spaces apart (record 0018: 3.01 on paper, 2.88 on panel).

## What the shipped page measures

| | @1240 | @390 |
|---|---|---|
| page height | 4196px | 5919px |
| ground | `252,250,246` (`--color-paper`), 44.3% of pixels exact, 88.5% within 8 levels | same colour, 38.9% exact, 84.3% within 8 levels |
| second surface | `248,245,239` (`panel`), 44.1% | `panel` 45.2% (it overtakes paper at this width) |
| ground excursion (whole shot) | span 7.7 levels, sd 2.67 | span 7.7, sd 2.66 |
| flat 64x64 window | **span 0 levels, sd 0.00** (x=208 y=0) | **span 0, sd 0.00** (x=192 y=0) |
| painted `rule` hairlines | 8 — min **3.01**, median 3.01, max 4.99 | 8 — min **3.01**, median 3.01, max 4.99 |
| bytes vs CSS on the same keyline | **0 difference on a flat page** (3.01 off bytes, 3.01 off tokens) | same |
| headroom before `rule` crosses `BARS.graphic` (3.0) | **NONE** — 3.01 is 0.01 over the bar; the ground sits 3 levels under 255 | same |
| rings with two grounds | 2 (y=3677, y=3724 — the notice buttons' keyline) | 2 (y=5414, y=5461) |

The flat window's `span 0, sd 0` is the baseline record 0019 needs: it is the number a grain moves, and today the
paper is a dead flat.

## Three findings the CSS probes could not have produced

1. **A page-level texture does not reach most of the page.** Planting the tile on `body` alone left every painted
   hairline at exactly **3.01**: an element that fills itself (`bg-paper`, `bg-panel`, a card, a button) paints
   *over* the body's `background-image`. The grain therefore reads only where nothing paints — the gaps between
   surfaces — which is a design consequence of D143, not an implementation detail. The selftest row
   `fills-hide-the-grain` keeps that fact honest.
2. **Amplitude calibration.** A ±4-level noise tile measures **span 7.7 levels, sd 2.29** in the flat window.
   D143's ceiling is **≤3 levels**, so a texture at the allowed amplitude is roughly **±1.5 levels** — about two
   dither steps. Record 0019's "sd 0.51" and this calibration are the same fact from two ends; before this
   measurement, "≤3 levels" was not implementable, because nothing said what tile produces it.
3. **A ring can sit between two grounds.** The notice buttons' keyline (len=136, at y=3677/3724 @1240 and
   y=5414/5461 @390) measures **3.01 against `paper` and 2.88 against `panel`** — because `paper → panel` is only
   4 levels apart, a hairline on the edge of a `panel` fill has a `panel` neighbour on one side and a `paper`
   neighbour on the other. 2.88 is under the bar. This is record 0018's category, now found on the live page rather
   than in a survey; the probe notes it and does not fail it, because which side is *the* pair is an operator call.

## What this does not decide

Whether to build the grain at all (D143 permits it, nobody has asked for it), and which side of a two-ground ring
is the official pair. The probe measures and names; it does not rule.

## Reproduce

```
npm run check:ground          # the numbers above, and design/ground/report.json
npm run check:ground:selftest # four plantings it must tell apart
```

The selftest rows: `sees-the-texture` (same flat window, planted sd 2.29 vs clean 0.00),
`moves-the-hairline` (3.06 vs 3.01 when the grain is behind the ring), `css-never-moved` (the reported keyline
stays 3.01 — the blindness), `fills-hide-the-grain` (planted on `body`, the ring stays 3.01). Removing the byte
path makes the first two fail; making the sampler blind makes all four fail — which is D118's requirement that a
probe be able to go wrong.

Related: record 0019 (how to measure a ground, and the two ways not to), 0018 (a hairline on a tint is under its
bar), 0015 (before/after pairs must measure the same window), D143 and its amendment, D118.
