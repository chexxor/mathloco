# Material — spacing & rhythm (domain 3)

Domain 3 of the fixed 18 (see `../README.md`). Status: **EVIDENCED** — three pages:
`m2.material.io/design/layout/spacing-methods.html`, `m2.material.io/design/layout/understanding-layout.html`,
`m2.material.io/design/layout/responsive-layout-grid.html`. The system's spacing model is a **grid multiple, not a
ladder**: there is no named set of spacing values to choose from, there is a statement that every
component sits on an 8dp square. That shape difference is the finding, and it is visible here because
every number in this file is a grid multiple rather than a token.

Probe that establishes the absence of a machine artifact (this session, across the 22 digests):
`python3 .design/tmp-refs/nq.py 'material-*' '\.css|px\b|token|ladder'` → the only `px` hits are
`#B00020`, `100% opacity`, and unit-conversion prose; no page publishes a spacing file.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M3-space-01 | Their spacing is a **grid multiple every component must sit on**, not a set of values a designer picks. | token | `https://m2.material.io/design/layout/spacing-methods.html#8dp-grid` | "All components align to an 8dp square baseline grid for mobile, tablet, and desktop." | none — a sentence on a page; no file states the grid |
| M3-space-02 | The sub-grid is where the fine grain lives, and it is scoped to icons and type, not to layout. | token | `https://m2.material.io/design/layout/spacing-methods.html#4dp-grid` | "Icons, type, and some elements within components can align to a 4dp grid." | none |
| M3-space-03 | Padding is the space between elements, and it is bounded to the same two increments as the grid. | token | `https://m2.material.io/design/layout/spacing-methods.html#padding` | "Padding is an alternative spacing method to keylines and is measured in increments of 8dp or 4dp." | none |
| M3-space-04 | A second alignment mechanism exists for what cannot sit on the grid, and it is defined from the screen edge rather than from a column. | pattern | `https://m2.material.io/design/layout/spacing-methods.html#keylines` | "Keylines are an alignment tool that enables consistent placement of elements outside of the layout grid." | none |
| M3-space-05 | Component dimensions are published as named numbers per component — a per-role dimension, not a derived one. | token | `https://m2.material.io/design/layout/spacing-methods.html#dimensions` | "Status bar height: 24dp ... App bar height: 56dp ... List item height: 88dp" | none — a caption list; nothing measures a height |
| M3-space-06 | The touch target carries the usability requirement and is separated from the visual size of the thing pressed. | rule | `https://m2.material.io/design/layout/spacing-methods.html#touch-targets` | "To balance information density and usability, touch targets should be at least 48 x 48 dp with at least 8dp of space between targets." | none; the same rule appears again on `applying-density` with an iOS exception, so it is stated twice in the system |
| M3-space-07 | The stated reason for the 8dp increment is rhythm across the **screen**, not the component. | pattern | `https://m2.material.io/design/layout/understanding-layout.html#material-measurements` | "Components are sized in 8dp increments, ensuring a consistent visual rhythm across each screen." | none |
| M3-space-08 | Margins are a per-breakpoint number and the set of breakpoints is enumerated by name. | token | `https://m2.material.io/design/layout/understanding-layout.html#body-region` | "At extra small breakpoints margins have a value of 16dp." | none |
| M3-space-09 | Past a body width the margin stops scaling and the body becomes fluid — the layout owns the cap, not the text. | token | `https://m2.material.io/design/layout/understanding-layout.html#body-region` | "When the width of the body reaches 840dp, margins increase to a maximum width of 200dp." | none |
| M3-space-10 | Gutter width is a breakpoint-keyed number, and it moves with the screen. | token | `https://m2.material.io/design/layout/responsive-layout-grid.html#gutters` | "On mobile, at a breakpoint of 360 dp, this layout grid uses 16dp gutters ... On a tablet, at a breakpoint of 600 dp, this layout grid uses 24dp gutters." | none |
| M3-space-11 | A refusal on the grid: gutters may not become the column. | rule | `https://m2.material.io/design/layout/responsive-layout-grid.html#customizing-gutters` | "Don't make gutters too large or the same width as the columns." | none — and the consequence is stated as a layout effect, not measured: "Oversized gutters won't leave enough room for content and may prevent a layout from appearing unified." |
| M3-space-12 | **There is no machine-readable spacing artifact in this system.** Their published tool is a design-tool kit, which is why every number above is prose. | absence | `https://m2.material.io/design/layout/understanding-layout.html#resources` | "The Material Design Kit on Figma includes templates for working with the breakpoint, column grid, and margin guidance described above." | none — a Figma kit cannot fail a build; a spacing scale held in a design tool is invisible to anything shipping code |

**Read against our system.** Ours is a **closed ladder of eight** (DESIGN.md's 4px grid: 4 8 12 16 24 32
48 64) with the refusal stated both ways: *"**Never** use a step outside that set"* and *"If no step fits,
change the scale, do not write `p-[13px]`"*. Theirs is an open ladder — any multiple of 4 — so it admits
values ours rejects (`12dp`, `20dp`, `160dp` are all legal multiples) and it never has to answer "which
step is this", which is exactly the question `check:scale` asks of every write in `src/` (45 source files,
52 distinct spacing utilities, 0 off-ladder @measured 2026-11-14 by `node scripts/check-scale.mjs`).

Two real divergences, not gaps:

- **Air does not scale with the screen here; it does in their grid.** Their margins and gutters are
  breakpoint-keyed (16dp → 32dp → 200dp); ours is *one number at every width* — DESIGN.md's ruling that
  "Section air is one step at every width, not a responsive ramp" (D214), and as of S061/D427 the three
  below-fold bands carry 32px with 8px inside them. Their system would make our phone pay less air than
  our desktop; ours makes both pay the same. Ours is a deliberate divergence (a ramp was considered and
  the operator ruled one number), so nothing here is a GAP row — it is §3 material.
- **Their 48dp target has no unit equivalence for a web page** (dp ≠ px, and the conversion is stated
  nowhere in the fetched corpus), so the number cannot be imported; it can only be compared against our
  own bar, which is stated in px and enforced: 24px minimum target, 44px for every pressable block at
  phone widths, and `check:render` asserts control heights **per declared role**, not per class string.
  Their touch-target rule is the closest thing in this corpus to our rule, and ours is the only one with
  a detector behind it.
