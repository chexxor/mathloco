# Material — iconography (domain 7)

Domain 7 of the fixed 18 (see `../README.md`). Status: **EVIDENCED** — two pages:
`m2.material.io/design/iconography/system-icons.html` (the owner of the grid, the metrics and the colour rules) and
`m2.material.io/design/color/text-legibility.html` (the only other place icon opacity is stated — and it states a
different number, which is why this file carries CONTESTED rows). `iconography/product-icons` and
`iconography/animated-icons` were not opened (reason in `COVERAGE.md`): product icons are not a set a
web product can license or ship, and animated icons would open a motion-into-iconography question this
round does not ask.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M7-icon-01 | An icon's size is a **square canvas**, stated once per family. | token | `https://m2.material.io/design/iconography/system-icons.html#icon-sizes` | "System icons are displayed as 24 x 24 dp." | none |
| M7-icon-02 | Inside the canvas there is a **live area**, and the reason for it is a web-page reason: content that scrolls under a bar. | pattern | `https://m2.material.io/design/iconography/system-icons.html#layout` | "Icon content should remain inside of the live area, which is the region of an image that is unlikely to be hidden from view (such as when sidebars appear upon scrolling)." | none |
| M7-icon-03 | The live area is bounded by named increments, so the drawing area is 20dp inside a 24dp box. | token | `https://m2.material.io/design/iconography/system-icons.html#layout` | "Icon content is limited to the 20dp x 20dp live area, with 2dp of padding around the perimeter." | none |
| M7-icon-04 | Weight is constant across the whole icon, curves included. | token | `https://m2.material.io/design/iconography/system-icons.html#stroke` | "System icons use a consistent stroke width of 2dp, including curves, angles, and both interior and exterior strokes." | none |
| M7-icon-05 | Legibility at small sizes is bought by shape, not by size. | pattern | `https://m2.material.io/design/iconography/system-icons.html#clarity` | "Icon shapes are bold and geometric. ... They have a symmetrical and consistent look, ensuring readability and clarity, even at small sizes." | none |
| M7-icon-06 | Refusals on weight, form and dimension, all against legibility: no delicate thin strokes, no gestural organic shapes, no tilt, rotation or dimensional icons. | rule | `https://m2.material.io/design/iconography/system-icons.html#clarity` | "Don't use delicate, thin stroke weights. ... Don't use gestural or loose organic shapes. ... Don't tilt, rotate, or make icons appear dimensional." | none; the refusals are prose bullets on the page |
| M7-icon-08 | Sub-pixel placement is a defect with a named mechanism: integer coordinates. | behavior | `https://m2.material.io/design/iconography/system-icons.html#clarity-pixel-perfection` | "To avoid distorting an icon, position icons "on pixel" by making the X and Y coordinates into integers, without decimals." | none — and a browser does this on its own, which is why the rule is stated for a design tool |
| M7-icon-09 | The target is bigger than the icon, and the two numbers are published as a pair per density. | token | `https://m2.material.io/design/iconography/system-icons.html#icon-sizes` | "Icons of 24dp can use a touch target of 48dp. ... Dense icons of 20dp can use a touch target of 40dp." | none |
| M7-icon-10 | Icon colour on a ground is an **opacity of the ink**, not a chosen hue. | token | `https://m2.material.io/design/iconography/system-icons.html#icons-on-light-backgrounds` | "The standard opacity for an active icon with focused state on a light background is 87% (#000000)." | none |
| M7-icon-11 | **CONTESTED.** `system-icons` puts an inactive icon on a light ground at 38%; `text-legibility` puts the same role at 60% and reserves 38% for *disabled*. Both pages were fetched this session. | CONTESTED | `https://m2.material.io/design/iconography/system-icons.html#icons-on-light-backgrounds` | "An inactive icon, which is lower in the visual hierarchy, should have an opacity of 38% (#000000)." | none — the disagreement is in the published system, and neither page cites the other |
| M7-icon-12 | **CONTESTED, structural.** Only `system-icons` splits an active icon into focused and unfocused (100% / 70% on dark); `text-legibility`'s ladder has no unfocused tier at all. | CONTESTED | `https://m2.material.io/design/iconography/system-icons.html#icons-on-dark-backgrounds` | "An active with unfocused state is 70%." | none |
| M7-icon-13 | **Absence:** no icon artifact a web product can consume. Their published grid is an Illustrator file. | absence | `https://m2.material.io/design/iconography/system-icons.html#icon-design-templates` | "Create your own system and product icons with these Adobe Illustrator files including the 24dp icon grid." | none — an Illustrator grid cannot fail a build; no SVG sprite, no icon set, and no licence statement appears on any fetched page |

**Read against our system.** We ship exactly one icon-like family — the chip's path keylines and the
sum glyph — and DESIGN.md's rule for marks is a **measured one**: `check:favicon` asserts every fill is a
token, at most two colours in the mark, the pair clears 4.5, and no reserved `--color-path-*` hue appears
in it.

- Rows 04–06 and 08 are a legibility-through-shape contract we do not state and could not gate today: our `check:line-art`
  already holds the one original drawing to `currentColor` strokes, **nothing filled**, and under 1200 bytes —
  the same shape as their 2dp constant stroke and unfilled geometry, arrived at from the other direction.
- Row 09 is the same invariant our system carries in px and gates: *"24px minimum target, 44px for every
  pressable block at phone widths"* (D139), asserted per declared control role by `check:render`. Ours is
  the one with a detector; theirs is a caption.
- Rows 11–12 are the reason no opacity number from this corpus may be imported: the system disagrees with
  itself, and our palette does the same job as a **pair against a named ground** with `-on-ink` twins —
  a percentage of black with no ground named is not a fact our `check:contrast` could solve.
- Row 13 is where they are **behind** us: their icon mechanism is a design-tool file, so an icon that
  drifts is invisible; ours is a token and a gate that fails a named colour in the mark.
