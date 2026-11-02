# 0012 — A colour measurement counts what the browser paints, on the surface it claims

**Date: 2026-11-02** (round 9, grill). Describes the code as it was then; re-read
`.notes/runbooks/design-round-specimen-measurement.md` before rebuilding a round's harness.

**Situation.** The operator asked for more colour ("it's still such a drab website without color"). Answering
that needed numbers about colour, and every obvious way to get them was wrong in a way that looked like a
finding:

- Ratios computed from the author's `oklch()` values — even from the browser's *computed* value — are not the
  pixel. OKLab math on an un-quantised colour drifts from the gamut-mapped, 8-bit-quantised sRGB the page
  actually paints.
- A panel's background can be *declared* and never painted. One concatenation missing a `;`
  (`background:var(--color-panel)font-family:…`) makes the whole declaration invalid, so the element has no
  fill **and** — because the same string carried the `color:` — no colour. A rule with no background is a
  visible 1px hairline; the specimen looked right and the census was fiction.
- A pair labelled with the policy slot rather than the painted surface reads **1.00**. Three did: a link that
  carried `data-pair="…|…|ink"` on the `<a>` whose own colour came from a child, and "chip ink on chip" where
  the chip's fill was `background:none` so what painted was text-on-band.
- A check can pass on nothing. The token-vs-render drift loop looked up `--w-gold` against a `--color-`-prefixed
  table, missed, and `continue`d — printing "all 32 tokens round-trip" while comparing 4.

**Decision.** Three rules, now enforced by `design/round9.mjs` rather than remembered:

1. **Contrast is computed from bytes the browser painted** — each side read back through a 1px canvas
   (`render-measure.js`'s method), not from the author value.
2. **Every `data-pair` names the surfaces that element paints**, and the driver verifies it: each side's painted
   bytes are compared with the bytes of the token its label names (delta-OKLab, the same **0.05** threshold used
   since the ramp round for "visibly the same colour"), and a mismatch is a `SURFACE` failure and exit 1.
   Unresolved tokens are counted and named (`tokenChecked`, `tokenUnresolved`) — a check must say what it
   skipped.
3. **A census reports two chroma bars.** `0.04` is what `check:color` counts, so round numbers compare with the
   live page — but **`ink` itself is `oklch(32% 0.045 152)`**, so at that bar the "colour" count is every glyph
   plus the dark band. `0.08` sits above every neutral in `@theme` and is the colour a reader would call colour;
   `0.01–0.04` is reported separately as *faint*, which is where the shipped `oklch(95% 0.03 …)` tints live.

**What it bought.** The trap in the shipped system became a measurement instead of an opinion: colour-as-area
paints **46.9% faint and 0.5% strong**, and putting a heading in `gold` over a tinted field measures **4.39**
against the 4.5 text bar where the same colour on paper is 4.82 — so "use more tint" costs a real contrast
failure that a screenshot would have hidden. Colour where it means something moves hue families 2 → 5 and the
reader-visible share 0.0% → 0.4%, free.

**Trap for the next round.** The specimen's numbers describe the specimen. Panel percentages are comparable to
the live page's in *kind*, not in size; the site-level after-number comes from `npm run check:color` after the
apply batch, and `round9` is not in `verify` (it needs firefox and a built `dist` for the page sentences). When
a measurement contradicts arithmetic, chase the measurement — that is how three specimen bugs got caught in one
sitting.
