# Material — radius & shape (domain 4)

Domain 4 of the fixed 18 (see `../README.md`). Status: **EVIDENCED** — three pages:
`m2.material.io/design/shape/about-shape.html`, `m2.material.io/design/iconography/system-icons.html`,
`m2.material.io/design/material-theming/overview.html`. The four `shape/applying-shape-to-ui`,
`shape/shape-hierarchy`, `shape/shape-as-expression`, `shape/shape-motion` pages were **not opened**
(reason in `COVERAGE.md`); they are applications of the rule stated here, and opening them would have
risked a second radius opinion in a system that already carries two (see the CONTESTED row).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M4-shape-01 | A surface's shape is its **default identity**: a rectangle with one named corner value. | token | `https://m2.material.io/design/shape/about-shape.html#about-shape` | "Material surfaces have a rectangular shape by default, with 4dp rounded corners." | none — a sentence; no radius token anywhere in the system |
| M4-shape-02 | Shape is a state carrier, and the carrying must be identical everywhere the state occurs. | rule | `https://m2.material.io/design/shape/about-shape.html#state` | "When using shape to indicate a state change, use it consistently with that state, in every instance it occurs." | none |
| M4-shape-03 | A shape that could mean two things is a defect, and the fix named is a reinforcing label. | rule | `https://m2.material.io/design/shape/about-shape.html#communicating-meaning` | "Text or icons can help reinforce that meaning when the shape of a surface alone could be ambiguous." | none |
| M4-shape-04 | The refusal is stated against meaning, not against style: ambiguity is the reason. | rule | `https://m2.material.io/design/shape/about-shape.html#shape-and-meaning` | "Don't use shapes in ways that create ambiguous meaning." | none — the counter-example is a picture of a Cancel button whose arrow points forward |
| M4-shape-05 | Shape has two consequences at once — recognisability and usability — and the second is ergonomic. | pattern | `https://m2.material.io/design/shape/about-shape.html#shaping-components` | "Shape both helps users identify components and affects how usable they are." | none |
| M4-shape-06 | A shape may not destroy the affordance it sits on. | rule | `https://m2.material.io/design/shape/about-shape.html#shaping-components` | "Don't use shapes that interfere with a component's ability to receive user input." | none |
| M4-shape-07 | A shape may not make two component families read as one. | rule | `https://m2.material.io/design/shape/about-shape.html#shaping-components` | "Don't use shapes that make components unrecognizable." | none |
| M4-shape-08 | **CONTESTED inside the system.** `about-shape` puts the default corner at 4dp on a surface; `system-icons` puts the default corner at 2dp on an icon. Both pages were fetched the same session, so the disagreement is theirs, not ours. | CONTESTED | `https://m2.material.io/design/iconography/system-icons.html#corners` | "Corner radiuses are 2dp by default." | none — and nothing in the system states which of the two governs a web component |
| M4-shape-09 | The icon corner range is published, bounded. | token | `https://m2.material.io/design/iconography/system-icons.html#corner-radius` | "The recommended corner radius values are between 0dp and 4dp." | none |
| M4-shape-10 | Radius and stroke are coupled: below a stroke threshold the radius is forced to a single value. | token | `https://m2.material.io/design/iconography/system-icons.html#corner-radius` | "If the stroke is 2dp or less, the corner radius must be 1dp." | none |
| M4-shape-11 | A component's shape is part of its **theme**, stated beside its colour and type as one default value set. | token | `https://m2.material.io/design/material-theming/overview.html#default-and-customized-values` | "The corners have a rounded radii of 4dp" | none — the list is prose in a docs page |
| M4-shape-12 | **There is no machine-readable shape artifact.** Their published mechanism is a generator and a table of per-component ranges that renders only as a caption. | absence | `https://m2.material.io/design/shape/about-shape.html#shape-customization-tool` | "A table of shape value ranges indicates recommended value ranges for each component." | none — the tool runs in the design layer, so it cannot fail a build; `PRIOR.md` quarantines the ranges themselves |

**Read against our system.** Ours has **two radius roles and one base** (DESIGN.md: `rounded-control`
and `rounded-card`, both 6px), and a refusal that is unusually specific: *"Chips are not pills"* plus
*"**Never** use `rounded-lg`/`rounded-md` (Tailwind's ramp) on a control or card"*. Theirs has **no
roles at all** — a default per family, a per-component range, and a generator.

- Their 4dp default and our 6px are not a contradiction: theirs is a default, ours is a role boundary
  (which things may be rounded at all). What this file contributes is the **shape-as-state** rule (rows
  02–07), and we are SILENT on it — no gate asks whether a shape ever carries a state, and we have no
  shape-carried state to carry. That makes it a DIVERGENT-KEEP candidate rather than a gap.
- The CONTESTED row matters for ranking: a naive reading of this corpus would say "Material's radius is
  4dp" and import one number where our system has two roles. Corpus rows that disagree inside one
  system never promote to a single number, which is why §2 does not carry a radius GAP row.
- Row 12 is where they are **behind** us on enforcement in the strictest sense: their shape mechanism
  is a tool that produces design values, and there is no file a build can read. Ours is one `@theme`
  line and a gate that fails a radius outside the two roles.
