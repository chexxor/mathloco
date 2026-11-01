# 0002 — Colour is oklch, and the browser is the oracle

**Situation.** Tailwind v4 (no `tailwind.config.*`, no `components.json`) means theme keys live in one
`@theme` block. Contrast for an oklch value does not exist until something converts it to sRGB, and this
repo already had two calculators (`.design/light-roles.mjs`, `.design/palette-math.mjs`) that hand-convert
oklab→XYZ.

**Decision.** All colour tokens are written as `oklch()`. Ratios are asserted with
`.design/grill/contrast-oracle.mjs` + `contrast-probe.js`, which hands each expression to the renderer
(a canvas `fillStyle` uses the same parser and gamut mapping a visitor gets) and runs the WCAG arithmetic
on the channels it produced. `node .design/ratify-check.mjs` parses the values **out of
`src/styles/global.css`** and re-measures them, so the token file is the input to its own assertion.

**What it means.** One number is authoritative, and a nudge to a token cannot silently stop clearing its
bar. It also corrected the record: hand math said `path-calendar` = 5.47 on paper and 1.97 on the band;
the renderer says **5.28** and **2.28**. The hand math agrees to 0.02 for plum, coral and olive and is
0.19 off for cyan, because `oklch(50% .11 205)` lands on the sRGB gamut edge (`#007481`, red channel 0)
and it does no gamut mapping. No decision moved; the numbers did.

**Worth revisiting if** a non-browser consumer needs the palette (a PDF, an email template) — then the
sRGB hexes have to be pinned in the token file as well, because they are currently a rendering result.
