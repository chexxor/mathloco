# 0022 — "narrow" was one measurement, and the mark is biggest at 640, not 1240

Asked whether the design work so far applies at narrow viewports, the answer turned out to be **yes for the rules,
no for the measurement** — and the gap was not where it looked. This record is the audit and what changed. It rules
nothing about mobile *browsers*: the operator ruled that out of scope on 2026-11-03 (engine, device pixel ratio and
touch behaviour are not being chased). Viewports are in scope.

## What was already narrow-aware

Rulings, not just vibes: the **≥44px tap-target rule at 390** (DESIGN.md 187/192), `s32` explicitly *"not a phone
tap target"*, record 0016 being precisely the collision between a 40px design step and that 44px bar at 390, the
**320 floor** (D114) whose binding constraint is the hero primary control — 48px at 310, **wrapping to 64px at 300**
— and the hero-fit numbers (display-1 214.9px inside a 276px box at 320). Confirmed by grep: `src/` contains **no
`100vh`/`svh` unit and no UA sniffing**, so viewport resizing cannot move the layout.

Measured widths before this round:

| probe | widths |
|---|---|
| `check:render` (the enforced gate) | 1240, 390, 320 |
| `check:mark` | 320, 1240 |
| `check:color` | 1240, 320 |
| `check:space` / `check:area` / `check:rhythm` / `check:ground` | 1240, 390 |
| `lines:measure` | 1240, 390, 320 |

## The gap that mattered: the matrix crossed no breakpoint

`src/` uses Tailwind's tiers **`sm:` 23 times, `lg:` 16, `md:` 7**. Tailwind 4's defaults are rem-based
(`sm` = 40rem = 640px at a 16px root — and `global.css` sets no root font-size, so that conversion holds). The gate
matrix jumped **320 → 390 → 1240**, so it measured **no breakpoint transition at all**.

Two facts fell out:

1. **Inside 320–390 there is no breakpoint, so the layout is structurally identical** and the only risk is
   continuous fit. That risk is covered: the nav row needs **176px** against 276 at 320 and 256 at 300; the control
   grammar is width-independent (48px primary/secondary at 1240, 640, 390 — measured row by row); the floor at 320
   is real because the hero primary wraps at 300. More widths in that band would have bought nothing.
2. **640 is a narrow-viewport event, not a tablet one.** Phone landscape is 568–932 CSS px, so `sm:` fires inside
   the phone band — and nobody had measured it.

A sweep at `RENDER_WIDTHS=1240,1024,768,640,390,320,300` came back **green** (exit 0): the rules do hold at the
boundaries. What the sweep found was not a failure but an unnoticed change of shape.

## The mark is largest at 640

`design/mark-check.mjs` shipped with the comment *"1240 — the largest [hero box]"*. Measured: it is not. The hero is
single-column until `lg:` (1024), so from 640 to 1023 the mark fills the whole container; at 1240 the hero is a
12-column grid and the mark gets one column.

| width | hero mark box | scale | the 1.3-unit stroke, in device px | ink pixels | share of that ink at/over the 3.0 graphic bar | ink as % of box |
|---|---|---|---|---|---|---|
| 320 | 276×172.5 | 1.15 | **1.49** | 1989 | **36.1%** | 1.50% |
| 640 | **512×320** | **2.133** | **2.77** | 5725 | **58.7%** | 2.04% |
| 1240 | 372×232.5 | 1.55 | 2.02 | 3347 | 46.0% | 1.77% |

Read it as: **the mark is at its heaviest on a phone in landscape** — 1.37× the desktop scale, and 58.7% of its ink
clears the 3.0 bar there versus 36.1% at the 320 floor, where antialiasing eats two thirds of it (`mark-pixels.mjs`,
D101/D119). Geometry passes at all three widths (two lines, curved equator, dashed far half, crossing on the
surface, right angles marked). So the stroke-weight question that matters most is the 640 one, and it had never been
looked at.

## What changed in the gates

- **`check:render` default matrix → `1240,640,390,320`.** 320 stays mandatory (the gate refuses a default set that
  drops the floor). 768/1024 deliberately stayed out: not narrow, and every width costs a Firefox per route.
- **The gate now prints which breakpoints are in use and which it measures:**
  `breakpoints in use: sm(640)x23 lg(1024)x16 md(768)x7 | widths measured: 1240, 640, 390, 320 | FLIP WITH NO
  MEASURED WIDTH: lg(1024) md(768)`. The unmeasured ones are named rather than hidden; if a `md:`-only layout ever
  breaks, the line says why nobody saw it. A `--breakpoint-*` in the token block is read out of `global.css`, so a
  ratified breakpoint cannot go unmeasured by forgetting.
- **`check:mark` → 320, 640, 1240**, with the comment corrected.
- **`check:area`, `check:rhythm`, `check:ground` now include 320.** Doing that exposed a separate defect — a shared
  6000px shot cap that silently truncated the 6978px page at the floor — documented in record 0021 with the numbers
  it was hiding (815px of emptiness at 320).

## One doc number that no longer matches

DESIGN.md says the nav row **"needs 171px"**; the probe now reports **176** at every width (1240 through 300). The
margin story is unchanged (176 of 276 at the floor), but the quoted number is stale by 5px. Left for the doc owner
rather than edited here, since it is ratifying copy — flagged, not silently fixed.

## Reproduce

```bash
npm run check:mark                                   # 320, 640, 1240; stroke px and 3.0-bar coverage per box
RENDER_WIDTHS=1240,1024,768,640,390,320,300 npm run check:render   # the full boundary sweep, one firefox per cell
```

Related: record 0015 (a frame that does not contain the page reports a different page), 0016 (the 40-vs-44px control
collision at 390), 0019/0020 (ground, and pixels versus colour strings), 0021 (the floor row of the rhythm table),
D101, D114, D117, D119.
