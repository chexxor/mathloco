# Material — accessibility contract (domain 16)

Domain 16 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for contrast thresholds, an emphasis
ladder, and touch targets; NOT evidenced for an accessible name, a keyboard-focus mechanism, or a motion
preference.** The absence is not a gap in the fetch: `m2.material.io/design/usability/accessibility.html` was **reached
twice (m2 shell and twin) and returned no markdown** (`COVERAGE.md`), which is why every threshold here is
*stated elsewhere* — on `text-legibility.html`, `dark-theme.html`, `spacing-methods.html`,
`elevation.html`, `states.html`, `data-visualization.html` — and this domain's status is *stated elsewhere*,
not *absent*.

Two probes, run this session over all 22 digests, printed so the absences below are reproducible rather
than asserted:

- reduced motion: `python3 .design/tmp-refs/nq.py 'material-*' 'reduced motion|prefers-|dyslex|motion sickness|disable (the )?animation|without animation'` → **0 lines**. (The looser probe
  `'reduced|prefers-|media query|dyslex|motion sickness'` returns **5 lines**, and every one of them is about
  opacity, elevation, or prominence — the word, not the contract. That is why this file states the tight probe.)
- accessible name and focus mechanism: `python3 .design/tmp-refs/nq.py 'material-*' 'alt text|alt attribute|screen reader|assistive|aria |aria-|tab order|focus ring|focus indicator|focus-visible|keyboard focus'` → **0 lines**.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M16-a11y-01 | The threshold is stated as a **number pair against a named relationship** — text against its background — and the large-text bar is lower. | rule | `https://m2.material.io/design/color/text-legibility.html#wcag` | "The Web Content Accessibility Guidelines (WCAG 2.0) level AA requires a 4.5:1 color contrast between text and background for normal text, and 3:1 to large text." | none — the number is prose; the nearest mechanism they name is an external analyzer, "webaim.org" |
| M16-a11y-02 | Emphasis is an **opacity ladder of three**, and it is a property of the text, not a set of greys. | token | `https://m2.material.io/design/color/text-legibility.html#dark-text-on-light-backgrounds` | "High-emphasis text has an opacity of 87% ... Medium-emphasis text and hint text have opacities of 60% ... Disabled text has an opacity of 38%" | none — three bullets in a section whose header names the pair (#000000 on #FFFFFF) |
| M16-a11y-03 | A grey text is a defect with a mechanism: black at reduced opacity, and the hex must be re-derived when the surface changes. | behavior | `https://m2.material.io/design/color/text-legibility.html#using-text-opacity` | "Instead of using grey text and icons on top of colored backgrounds, create better contrast by displaying white or black text with reduced opacity." | none — and the sentence after it is a maintenance burden: "In this case, if the surface behind the text changes color, you must update the hex color as well." |
| M16-a11y-04 | Don't: an opaque grey is refused **on legibility**, not on style. | rule | `https://m2.material.io/design/color/text-legibility.html#dark-text-on-light-backgrounds` | "Don't: Avoid using opaque grey text that isn't legible on colored surfaces." | none |
| M16-a11y-05 | Icons are exempted from the legibility standard and asked for visibility instead — the bar is deliberately different per medium. | rule | `https://m2.material.io/design/color/text-legibility.html#icons-and-other-symbols` | "Icons and other elements don't need to meet WCAG legibility standards, but should be as visible as possible to indicate function or communicate information." | none |
| M16-a11y-06 | **CONTESTED.** The inactive-icon role has two published values on the same ground: `text-legibility` puts it at 60% and reserves 38% for *disabled*; `system-icons` puts it at 38% (#000000), the same number `text-legibility` uses for disabled. Both pages were fetched this session; see `iconography.md` row M7-icon-11 for the other side of the pair. | CONTESTED | `https://m2.material.io/design/color/text-legibility.html#icons-and-other-symbols` | "Active icons have an opacity of 87% ... Inactive icons have an opacity of 60% ... Disabled icons have an opacity of 38%" | none — neither page cites the other |
| M16-a11y-07 | A dark theme is defined by a **contrast number of its own**, chosen so the AA bar is cleared at the *lightest* elevation. | rule | `https://m2.material.io/design/color/dark-theme.html#properties` | "Dark surfaces and 100% white body text have a contrast level of at least 15.8:1 ... This ensures that body text passes WCAG's AA standard of at least 4.5:1 when applied to surfaces at the highest (and lightest) elevation." | none — the number is in a properties bullet, and a caution beside it restates it as a condition on a substitute surface |
| M16-a11y-08 | A saturated colour on a dark surface fails the same bar, so the theme desaturates rather than darkens. | rule | `https://m2.material.io/design/color/dark-theme.html#desaturated-colors-for-accessibility` | "A dark theme should avoid using saturated colors, as they don't pass WCAG's accessibility standard of at least 4.5:1 for body text against dark surfaces." | none |
| M16-a11y-09 | The touch target is a pair of numbers with a spacing third, and the reason it exists is a trade. | rule | `https://m2.material.io/design/layout/spacing-methods.html#touch-targets` | "To balance information density and usability, touch targets should be at least 48 x 48 dp with at least 8dp of space between targets." | none |
| M16-a11y-10 | **A target is not the visual size**, and the two numbers are published as a pair per density. | token | `https://m2.material.io/design/iconography/system-icons.html#icon-sizes` | "Icons of 24dp can use a touch target of 48dp. ... Dense icons of 20dp can use a touch target of 40dp." | none — their iOS exception is on a different page (`applying-density.html`, quoted in `controls-buttons.md` row M9-ctl-10) |
| M16-a11y-11 | Colour alone is refused as a meaning carrier, and the alternatives are named as graphic devices. | rule | `https://m2.material.io/design/communication/data-visualization.html#accessibility` | "To accommodate users who don't see color differences, you can use other methods to accentuate data, such as high-contrast shading, shape, or texture." | none |
| M16-a11y-12 | **Absence, in two parts:** no accessible name, no focus mechanism, and no motion preference appears anywhere in the 22 digests. The nearest statement names only the *input method* that begins a focus, never the indicator. | absence | `https://m2.material.io/design/interaction/states.html#focus` | "A focus state can only be on one element at a time." | none — the probes printed above return **0 lines each**; the nearest bound on the other half of the domain is a speed sentence on `speed.html`, quoted in `motion.md` row M6-mot-12 |

**Read against our system.** Ours states the same bars as **numbers with a named ground and a gate**, which
is the difference that matters: DESIGN.md's bar line — *"Bars, non-negotiable: **4.5** text (3.0 for text
at/below the `display-2` step), **3.0** for a boundary or graphic, **1.35** for "this is a separate layer",
**24px** minimum target, **44px** for every pressable block at phone widths"* — and `npm run check:contrast`,
which "reads the tokens out of `src/styles/global.css`" and prints every pair, plus `check:render` and
`check:ground` reading painted bytes.

- Rows 01–04 are the same rule we hold twice as hard. Ours never writes an opacity for text at all: the
  palette is role-named (`ink` 17.15 on paper, `ink-2` 6.84, `ink-3` 5.44) and each role is solved to clear
  4.5 **on every ground it is ever printed on** (D316's `ink-3` and `rule` re-solves). Their mechanism —
  black at reduced opacity — is the mechanism our system refuses, because it makes the number a function of
  the surface and then says the hex must be updated when the surface changes (row 03's second sentence).
  That is the one sentence in this corpus that argues *against* our palette, and it argues against it in the
  wrong direction: ours is the form that survives a surface change without a re-derivation.
- Row 05 is worth keeping as a **distinction**, not a number: their exemption of icons from the text bar is
  the same reason our system keeps two bars (4.5 text, 3.0 graphic) and applies the 3.0 bar to a hairline and
  a chip keyline rather than to a glyph. Our `check:line-art` already does the medium-specific check theirs
  implies: one original drawing, `role="img"` with a ≤12-word label and a caption, 622 bytes, 9 strokes.
- Rows 06 is why no opacity from this corpus may be imported, and rows 07–08 are why no dark-theme number
  may be imported either: our system has one dark band per screen (D89) and solves the same role pair twice
  (`accent` 5.77 on paper, `accent-on-ink` 5.69 on ink) instead of publishing one theme with a theme-wide
  constant.
- Rows 09–10 are the **closest match in this corpus to a gate we already have**: DESIGN.md's 24px/44px bars
  are asserted per declared control role by `check:render` (48 ±1) and D139's retirement of the 40px button
  step. Theirs are captions; ours is a measurement. If a row ever ranks this domain, it ranks it as
  *confirmation with a detector we already own*, not as a gap.
- Row 11 is the one idea our system has no surface for today (no chart, no legend, no axis anywhere: the
  census run this session `grep -rnE '\bchart\b|\blegend\b|\baxis\b|<canvas' src` → no matches; every
  `<svg>` in `src/` is an icon sprite, a platform mark, or the line-art figure). It is pre-loading material,
  not a ranked gap.
- Row 12 is the strongest evidence in this corpus for **keeping our own access rules rather than theirs**:
  ours makes `prefers-reduced-motion: reduce` mandatory and fails an ungarded `animation:` write; ours names
  focus per ground (`outline-accent` on paper 5.77, `outline-band-text` on the band 16.43, always
  `outline-2 outline-offset-2`) and refuses the invisible ring (`accent` on ink 2.97); ours qualifies every
  outbound anchor with an `sr-only` phrase written once in `src/lib/links.mjs` (**28 outbound anchors, 28
  qualified** @measured 2026-11-16 by `npm run check:ext-links`). None of that has a counterpart here at all,
  and the census of our own markup — 12 `aria-label`, 7 `aria-labelledby`, 13 `aria-hidden`, 1 `aria-live`,
  4 `role="status"`, 1 `role="alert"`, 1 `role="img"` @measured 2026-11-18 by `grep -roE 'aria-[a-z]+|role="' src` —
  is the artifact their corpus has no word for: the census `grep -roE 'aria-[a-z]+|role="[a-z]+"' src`
  @measured 2026-11-18 prints **12 `aria-label`, 7 `aria-labelledby`, 13 `aria-hidden`, 1 `aria-live`, and
  six `role=` writes** (4 `status` of which one is a comment, 1 `alert`, 2 `img` of which one is a comment).
  Their "only one focus/hover state per layout" rule (the quote in row 12, with its hover twin "Hover
  state can only be on one element at a time based on cursor position.") is the one sentence of this domain
  our system does **not** hold and could gate cheaply; it is
  also the sentence our hover-fill rule ("a hover always goes lighter") would collide with, so it belongs in
  §2 as a candidate, not in this file as a ruling.
