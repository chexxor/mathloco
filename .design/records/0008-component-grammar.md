# 0008 — Components are ours: three buttons, one chip, one notice, one boundary per box

**Situation.** No `components.json`, no shadcn, no headless-UI dependency; the shipped site has one
component family rendering at three heights (50 / 58 / 62px), two 19px-high links on the 404 page, and a
CTA whose text-to-fill contrast is 4.30. Round 6 asked what a control is made of; round 7 asked what a
state is made of.

**Decision (operator took A in both rounds).** Three buttons — primary (`ink` fill + `band-text` label,
48px), secondary (`paper` fill + `inset-shadow-rule` + `ink`, 40px, hover `tint`), quiet (`gold` label,
32px) — and **chips are their own component**, not a button variant. One notice component on three grounds.
Heights come from `ceil4(line box) + 2 × an S3 pad`, so 24 / 32 / 40 / 48 are arithmetic, and keylines are
**inset shadows, never borders** (a border adds 2px and breaks the arithmetic).

**Delegate call in ratify (operator: "accept whatever you decide"): a box has exactly one boundary.** A
notice's action takes the `quiet` **label** with no keyline of its own, at the 40px step. The alternative
(`secondary`) would put a second `rule` hairline 12px inside the notice's own keyline — legal on paper
(3.01) but illegal on a panel (2.88), and it reads as a double border. Because `gold` is also the caution
colour, an in-notice action is separated from the status word by an **underline at rest**, its lane and its
size, never by a second hue. Same ruling retired the "keylined notice sitting on a panel" combination
entirely.

**What it means.** No component library gets installed to fix the shipped defects — the parts are markup
plus tokens, and every state reuses the notice grammar (four of the five island defects are then
one-component fixes).

**Worth revisiting if** interactive complexity grows past what hand markup holds (focus management in a
real menu/dialog) — then a headless primitive is worth adding, but it must be restyled to these roles,
not adopted with its own palette.
