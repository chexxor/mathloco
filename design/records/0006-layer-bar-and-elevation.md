# 0006 — The layer bar is 1.35, and a shadow states layer order

**Situation.** Three separate arguments in the grill turned on "can the eye see this as its own surface".
Measured against paper: panel 1.04, tint 1.10, chip track 1.10, a deepened panel 1.12, a chip track at its
limit 1.31, the shipped `shadow-lg`/`shadow-md` 1.25–1.26. Layered: a hue-tinted band recess 1.35, a
primary hover 1.39.

**Decision (round 6 Q5, round 7 Q6 — operator took the recommendation both times).** **1.35** is the line.
Below it a fill is a tint, not a layer, so it must not be used to mean "separate". Elevation therefore
means one thing only: hairline = part of the page, shadow = above the page. Two levels, stops solved in
the renderer so the contact edge clears the bar (`.165` ink-tinted or `.13` black): level 1 measures 1.35,
level 2 1.51. Ink-tinted because a black stop wide enough to read at a wide blur paints a 2.10 grey band.
Cards never get a shadow.

**Delegate call in ratify.** The two elevation tokens ship **defined-but-unused** — nothing in `src/`
floats (no modal, no dropdown). They are solved maths; re-deriving them against the bar is the expensive
part, and `design-enforce` forbids other `box-shadow` writes, so an unused token cannot rot into use.

**Worth revisiting if** a third level is ever needed for stacked floating surfaces (a menu over a dialog),
which would need a solved stop pair, not a scaled one — and note the trap this exists to prevent: deepening
a panel until it *looks* layered (L 94.7) still measures 1.12 and costs two extra tokens (a second `gold`,
a second `rule`).
