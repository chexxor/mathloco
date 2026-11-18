# GOV.UK — typography & measure

Domain 2 of the fixed 18. Status: **EVIDENCED, and it is the only system of the five that states a
line-length rule as a number.** Their type scale is a *point ladder* (80 · 48 · 36 · 27 · 24 · 19 · 16)
where the line height is carried by the point rather than derived from it, and their measure rule is
"no more than 75 characters per line".

Pages reached: `…/styles/type-scale/`, `…/get-started/new-type-scale/`, `…/styles/headings/`,
`…/styles/layout/`, `…/styles/spacing/` (for the shared 5px rhythm statement).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G2-type-01 | The scale is a named object, and it is the substrate for every typographic style — not a per-component size. | token | `https://design-system.service.gov.uk/styles/type-scale/#type-scale` | "The type scale is a collection of font sizes and line heights that underpin all of the typographic styles on GOV.UK." | none |
| G2-type-02 | New styles must be **snapped to an existing point**; inventing a size is the defect they name. | rule | `https://design-system.service.gov.uk/styles/type-scale/#type-scale` | "When creating new components, always start by using the existing typography styles. If you need to create a new style, align it with one of the points on the type scale." | none |
| G2-type-03 | Rhythm is arithmetic, not tuned: the line height is a multiple of the scale's base unit. | rule | `https://design-system.service.gov.uk/styles/type-scale/#how-it-works` | "Like the spacing scale, every point on the type scale uses a line height in a multiple of 5px." | none |
| G2-type-05 | The scale's responsive axis is keyed to one named breakpoint, not to a viewport ladder. | token | `https://design-system.service.gov.uk/styles/type-scale/#responsive-behaviour` | "The scale for 'large screens' is used when the screen is wider than the tablet breakpoint (640px)." | none |
| G2-type-06 | They publish the output unit choice and the reason: relative units so the type survives zoom. | pattern | `https://design-system.service.gov.uk/styles/type-scale/#how-it-works` | "GOV.UK Frontend outputs CSS in relative units like em or rem." | none |
| G2-type-07 | A point is a **role pair**: one scale point serves a heading style and a body style at once. | token | `https://design-system.service.gov.uk/styles/type-scale/#large-screens` | "govuk-heading-s, govuk-body" | none |
| G2-type-08 | Two points are declared exceptional rather than forbidden — the scale has roles that are *available but not for use*. | pattern | `https://design-system.service.gov.uk/styles/type-scale/#large-screens` | "Only used in exceptional circumstances" | none |
| G2-type-09 | **Measure rule, stated as a number.** Two-thirds of a 1020px page is the character limit. | rule | `https://design-system.service.gov.uk/styles/layout/#layout` | "That stops lines of text getting so long that the page becomes difficult to read on desktop devices. This would usually mean no more than 75 characters per line." | none |
| G2-type-10 | The measure is achieved by a layout fraction, and the fraction is a recommendation, not the only option. | pattern | `https://design-system.service.gov.uk/styles/layout/#layout` | "For most types of page, we recommend using either a 'two-thirds' or a 'two-thirds and one-third' layout." | none |
| G2-type-12 | Heading *semantics* and heading *appearance* are separated, and the separation is mandatory. | rule | `https://design-system.service.gov.uk/styles/headings/#use-heading-tags` | "Apply a heading class, such as govuk-heading-l, to style them visually. Style headings consistently to create a clear content structure throughout your service." | none |
| G2-type-13 | Breaking the heading hierarchy for visual emphasis is allowed but only after accessibility testing — a named gate on a subjective move. | rule | `https://design-system.service.gov.uk/styles/headings/#heading-hierarchy` | "If you do change the heading hierarchy in a similar way, it needs to go through accessibility testing before use." | test (an accessibility test they require, but do not ship) |
| G2-type-14 | A scale point can be **deprecated and removed in a version**, and the change is documented per point with the old number. | token | `https://design-system.service.gov.uk/get-started/new-type-scale/#changes-weve-made` | "Deprecated as a scale point and removed in GOV.UK Frontend version 6.0.0 and later" | none |

**Read against our system:** their 5px-multiple line heights and our 4px ladder with size-token
leading answer the same question differently — theirs is *one grid unit shared by type and space*,
ours is *leading carried by the type token and space drawn from a separate ladder*. That is
`DIVERGENT-KEEP`, not a gap: our rule ("leading comes from the size token") is what makes our
`check:space` model able to say "this line box is S3 of the ladder" at all.

The live gaps are two. Row 09/11 is the one hard number in the corpus that our `max-w-measure` role
is answerable against — ours caps a prose block at 32em ≈ 70 serif characters, theirs caps at 75
characters on a two-thirds of 1020px page, and both are stated as *why* (scannability, magnifier
users), which makes it a comparison rather than a swap. Row 07/14 is governance: our ramp is nine
steps with **one display step per screen**, and nothing in our artifacts says what happens to a step
when a screen is retuned — GOV.UK's answer is a dated version boundary plus a deprecated point, and
that is the shape our type-scale versioning ruling would have to take.

**Pruned to 12 claims per table (the cap), with the reason:** `G2-type-04` is the legibility narration behind the arithmetic of `G2-type-03`; `G2-type-11` restates the measure rule for short-answer forms, which `G2-type-09` states once with the number.
