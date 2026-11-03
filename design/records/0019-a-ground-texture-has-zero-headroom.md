# 0019 — a ground texture has no headroom in this palette; the hairline is the binding constraint

Asked: could a barely-noticeable paper texture sit under the page, since paper is where the mathematics
happens. Answer measured on this rig (Linux, native; Node from `.nvmrc`; firefox via
`design/grill/dist-measure.mjs`), 2026-11-03, branch `content/humanity-round-7`.

## What the numbers were before touching anything

Token arithmetic (`.design/tmp-paper/budget.mjs`, oklch → sRGB → WCAG off `src/styles/global.css`):

| pair | ratio | bar |
| --- | --- | --- |
| `rule` on `paper` | 2.99 | 3.0 |
| `rule` on `panel` | 2.86 | 3.0 |
| body text `ink-2` on `paper` | 6.96 | 4.5 |
| muted `ink-3` on `paper` | 5.15 | 4.5 |

My reimplementation lands 0.01–0.02 under the shipped probes. Off firefox's own screenshot
(`.design/tmp-paper/pixels.mjs`, which finds horizontal 1px lines and measures them against the pixels two
rows above and below), the two notice rings on `/` at 1240 measure **exactly 3.01**. So the site's only
boundary role clears its bar by **0.01**, and `rule` on a tint is already illegal (record 0018).

## The binding constraint, in the unit a texture is authored in

Solving for how far the local ground may move before each bar is crossed (`budget.mjs`):

| role | survives ground excursion |
| --- | --- |
| `rule` hairline | **+40 levels up, 0 levels down** — one level darker and 3.01 becomes 2.96, i.e. under the bar |
| muted text `ink-3` | +40 up, −15 down |
| body text `ink-2` | ±40 (legibility is not the limit) |

And firefox renders the paper ground at **252,250,246** — three levels under clipping to 255. So a texture
built the obvious way, centred on the ground, takes the hairline below its own bar. The only version this
palette can hold is **light-only**: the token ground stays the floor and the grain goes up, at most ~3 levels
because the red channel clips at 255.

## What light-only grain costs and buys, measured

Tiles built off the *rendered* ground (not the token — see the gotcha below), 256×256, `sharp` png:

| tile | offsets | sd | max ΔOKLab from ground | bytes | seam step vs interior column step |
| --- | --- | --- | --- | --- | --- |
| token-base grain, amp 4 | +0..+4 | 0.69 levels | 0.012 | 14,964 | 0.41 vs 0.38 |
| rendered-base grain, amp 3 | +0..+3 (mode at +2) | 0.51 levels | ~0.009 | 11,638 | — |

Applied to the built page as `.bg-paper { background-image: url(...) }` and re-measured:

- inside the flattest 200×200 ground window: **sd 0.00 → 0.51 levels, span 0 → 3 levels**, worst adjacent-pixel
  luminance step 2.7% of the ground
- notice ring, measured off the screenshot: **3.01 → min 3.03, median 3.06, max 3.06** — light-only grain
  never weakens the boundary, it strengthens it slightly
- `distinct colours` in the shot 1454 → 1622
- `npm run check:area` (whole page): painted **4.48% → 4.49%** at 1240 and **9.68% → 9.84%** at 390;
  empty-run% **25.3% → 25.3%** and **21.5% → 21.5%**; reader-named colour unchanged. A grain under the
  survey's ink bar (`INK_BAR = 0.05` delta-OKLab, `design/whitespace-survey.mjs`) does **not** fake the
  emptiness metrics — which is the reason to pick the below-the-bar amplitude rather than a louder one: the
  numbers keep meaning *content*.

## Three gotchas found by doing it

1. **Every page contrast number is blind to a texture.** `design/grill/render-measure.js` `paintBytes()`
   parses a colour *string* (the computed `background-color`), so a `background-image` — a grain **or a
   photograph** — moves no contrast number the gate prints. Same page, grain on, `check:render` still said
   `inset 1px contrast 3.01` for every notice while the screenshot showed 3.03–3.06. The machinery to fix it
   already exists in the repo: `scripts/check-social-card.mjs` decodes the actual PNG with `sharp().raw()`
   and samples the card's ground off pixels. The page probes need that, or the hero photograph will be just
   as unfalsifiable as the grain.
2. **Author the tile off the rendered ground, not the token.** The token `paper` oklch(98.5% .006 85)
   converts to 251,251,244 in my maths and firefox paints **252,250,246**; a tile whose base came from a
   third conversion (246,243,237) produced a page where 35% of the viewport sat a visible 4 levels under the
   sections. The measured spread between "token math" and "what the browser paints" is 0–6 levels, which is
   the entire size of the texture I would want to ship.
3. **`paper` → `panel` is a 4-level step** (252,250,246 → 248,245,239, 35% of the 1240×1400 viewport, ratio
   1.04 — DESIGN.md: a tint, not a layer). A grain whose span is 3–4 levels is the same size as that step, so
   the card tint stops reading as a sheet and starts reading as noise. Whatever gets ratified must be
   clearly *under* 4 levels of span, or the tint step has to be re-solved first.

## What this does not settle

Whether grain of sd ≈ 0.5 levels is *worth shipping*: the numbers give the ceiling and the cost (11–15 KB
for a 256 tile, one extra request, cached), not the taste. That needs the usual route — a specimen the
operator chooses by looking, at real page scale, not a swatch — and it collides with the pending photo
decision, because a textured ground under a chalkboard photograph is mud. Sequencing it after the
PS-1/PS-3 photos and the R6 rhythm ruling is cheaper than redoing it twice.
