# Material — elevation & surfaces (domain 5)

Domain 5 of the fixed 18 (see `../README.md`). Status: **EVIDENCED** — two pages:
`material.io/design/environment/elevation.html` (**the twin**: the same path on the m2 host returned the
soft-200 shell this session, so every locator here is the twin's URL) and
`m2.material.io/design/color/dark-theme.html`. The **shadow recipes** are not in this file because they are not in this
corpus: `m2.material.io/design/environment/light-shadows.html` and `m2.material.io/design/environment/surfaces.html` returned the shell,
and `PRIOR.md` quarantines every shadow number.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M5-elev-01 | Elevation is defined as a **distance between surfaces**, not as a shadow. | rule | `https://material.io/design/environment/elevation.html#elevation` | "Elevation is the relative distance between two surfaces along the z-axis." | none |
| M5-elev-02 | The default depiction is a shadow, and the unit is a device unit that has no web equivalent stated anywhere. | token | `https://material.io/design/environment/elevation.html#measuring-elevation` | "The distance from the front of one Material surface to the front of another is measured along the z-axis in density-independent pixels (dps) and depicted (by default) using shadows." | none |
| M5-elev-03 | Elevation is published as a **per-component ladder** — each component family gets a number, and two families get a range. | token | `https://material.io/design/environment/elevation.html#component-elevation-values` | "Nav drawer: 16dp ... App bar: 4dp ... Card: 1dp to 8dp ... FAB: 6dp ... Button: 2dp to 8dp ... Dialog: 24dp" | none — a caption list beside a figure |
| M5-elev-04 | A component has a **resting** elevation and moves from it on input or a system event. | behavior | `https://material.io/design/environment/elevation.html#resting-elevation` | "Resting elevations are starting elevation values given to components by default." | none |
| M5-elev-05 | The offset is invariant per component type, so the lift is a property of the family rather than of the instance. | behavior | `https://material.io/design/environment/elevation.html#changing-elevation` | "Dynamic elevation offsets are the same across each type of component." | none |
| M5-elev-06 | Platform changes the ladder, and the reason is the *other* cue available on that platform. | rule | `https://material.io/design/environment/elevation.html#resting-elevation-and-environment` | "resting elevations on desktop are shallower because other cues, like hover states, communicate when a component is interactive. ... For example, cards at 0dp elevation on desktop are outlined with a stroke." | none |
| M5-elev-07 | The separation an edge asserts is a **contrast requirement**, not a shadow value. | rule | `https://material.io/design/environment/elevation.html#surface-edges` | "Edges must create sufficient contrast between surfaces (by meeting or exceeding accessible contrast ratios) for them to be seen as separate from one another." | none — and no number is attached to it, so nothing in their system could check it |
| M5-elev-08 | Overlap asserts *that* two surfaces differ, and explicitly does **not** assert by how much. | rule | `https://material.io/design/environment/elevation.html#surface-overlap` | "When a surface overlaps another surface, either partially or completely, it indicates that the two surfaces occupy different elevations (but not the degree, or amount, of difference between them)." | none |
| M5-elev-09 | A lift may not collide, and the fix is to move the other component out of the way. | behavior | `https://material.io/design/environment/elevation.html#elevation-interference` | "When a component moves between its resting elevation and dynamic elevation offset, it shouldn't collide with other components." | none |
| M5-elev-10 | In a dark theme elevation stops being a shadow and becomes a **surface lightness ladder** with ten published values. | token | `https://m2.material.io/design/color/dark-theme.html#elevation` | "Elevation overlay transparencies range from 0% for the lowest level to 16% for the highest level." | none — the table beside it is prose transcribed into the digest, not a file |
| M5-elev-11 | Lightness is read against an implied light source, which is what makes the ladder a *model* rather than a palette. | rule | `https://m2.material.io/design/color/dark-theme.html#higher-elevation-lighter-surface` | "The higher a surface's elevation (raising it closer to an implied light source), the lighter that surface becomes." | none |
| M5-elev-12 | **No shadow recipe exists in this corpus.** The system states that shadows depict elevation, and the page that carried the numbers returned the shell. | absence | `https://material.io/design/environment/elevation.html#the-elevation-system` | "Material Design displays elevation using shadows." | none — `m2.material.io/design/environment/light-shadows.html` returned the soft-200 shell (md5 `617b93271e5fae4f99bf0aef64d43582`); no x/y offset, blur, spread or alpha appears on any of the 22 pages |

**Read against our system.** Ours is **binary by ruling**, and the ruling names what each device means
(DESIGN.md: *"hairline means on the page, shadow means above it"*) — `inset-shadow-rule` (`inset 0 0 0 1px`)
on every boundary, `shadow-e1` only for *"something that floats"*, `shadow-e2` for *"something that floats
over content"*, and *"**Never** put a shadow on a card, or on a hovered card: cards are part of the page"*.

- Row 03 is the ladder ours refuses to have: theirs is ten elevation levels keyed to component families,
  ours is two, and ours are **measured** rather than declared — level 1 measures 1.25 against the 1.35
  layer bar, which is why DESIGN.md says level 1 "does not make a surface read as a layer; level 2 does"
  @measured 2026-11-08 by round17's edge probe. Nothing in their system measures anything.
- Row 06 is the closest thing in this corpus to a rule we already hold: a flat card on the desktop ground,
  edged by a stroke instead of a shadow. Ours ships exactly that, one step further — the hairline is a
  **pair** (`rule` clearing 3.0 on every ground it is ever drawn on) and `check:ground` and `check:render`
  both fail a hairline under the bar. §4 candidate.
- Rows 07–08 are the part of their model that survives the missing shadow recipes: elevation is defined by
  *edge contrast and overlap*, not by blur values. That is the same definition our binary makes, and ours
  is the one with a detector (`check:ground` fails a ring whose two sides are different grounds).
- Rows 03's `Dialog: 24dp` and `Nav drawer: 16dp` are the pre-loading rows: DESIGN.md says `shadow-e1`/`e2`
  are ship-defined-but-unused because *"No modal or dropdown is in `src/` today"*. Any GAP row built on them
  belongs in §2's "pre-loading decisions before we build it" block, as a draft, not a ratification.
