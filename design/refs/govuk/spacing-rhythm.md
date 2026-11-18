# GOV.UK — spacing & rhythm

Domain 3 of the fixed 18. Status: **EVIDENCED, with a published scale.** GOV.UK ships **two** scales
over one unit ladder — responsive and static — indexed by *unit number* rather than by name, and it
publishes negative units and override classes so a consumer can reach the ladder without owning it.

Page reached: `https://design-system.service.gov.uk/styles/spacing/` (69,701 B); the 5px rhythm
statement is on `…/styles/type-scale/`; the layout wrapper spacing is on `…/styles/layout/`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G3-space-01 | There are exactly two spacing scales, and which one applies is a decision, not an accident. | rule | `https://design-system.service.gov.uk/styles/spacing/#spacing` | "The Design System uses two different spacing scales - responsive and static." | none |
| G3-space-02 | The responsive scale is keyed to one breakpoint and the small end of the ladder is deliberately frozen. | rule | `https://design-system.service.gov.uk/styles/spacing/#responsive-spacing` | "The spacing for 'large screens' is used when the screen is wider than the tablet breakpoint (640px). Spacing for the smallest units (0-3) stays the same for all screen sizes." | none |
| G3-space-03 | The static scale is not a second ladder — it is defined as the large-screen half of the first. | pattern | `https://design-system.service.gov.uk/styles/spacing/#static-spacing` | "The static spacing scale stays the same for all screen sizes, and uses the same spacing as 'large screens' in the responsive spacing scale." | none |
| G3-space-04 | The unit ladder is indexed by **number**, so a step is addressed as a unit, and out-of-range is not expressible. | token | `https://design-system.service.gov.uk/styles/spacing/#using-the-static-spacing-helper` | "For the static spacing scale, use the govuk-spacing function." | none |
| G3-space-05 | Negative steps exist on the same ladder and are addressed by a negative unit number. | token | `https://design-system.service.gov.uk/styles/spacing/#using-the-static-spacing-helper` | "For negative spacing, use a negative spacing unit number." | none |
| G3-space-06 | A published worked value: unit 6 is 30px on large screens and 20px on small ones. | token | `https://design-system.service.gov.uk/styles/spacing/#using-the-responsive-spacing-helper` | "For example, to apply spacing unit 6 for 30px padding on large screens and 20px on small screens, use:" | none |
| G3-space-07 | Direction is a parameter of the helper, not a new token per edge. | pattern | `https://design-system.service.gov.uk/styles/spacing/#using-the-responsive-spacing-helper` | "You can also add an argument to apply margin or padding in a single direction." | none |
| G3-space-08 | **Override classes** are the escape hatch, and the escape hatch is namespaced with a marker (`govuk-!-`). | rule | `https://design-system.service.gov.uk/styles/spacing/#overriding-spacing` | "Occasionally, you might need to make minor adjustments like adding or removing spacing to elements of your design. You can use the spacing override classes for this." | none (the class naming convention is the mechanism; nothing checks its use) |
| G3-space-09 | The marker's meaning is stated: an override is a *deviation* the library cannot own. | pattern | `https://design-system.service.gov.uk/styles/spacing/#responsive-spacing-override-classes` | "The responsive spacing override classes start with: govuk-!-, followed by either margin- or padding-, and then a spacing unit number." | none |
| G3-space-10 | Zero is a first-class step: "remove all margins at all screen sizes" is a unit, not a `0px` literal. | token | `https://design-system.service.gov.uk/styles/spacing/#responsive-spacing-override-classes` | "govuk-!-margin-0 to remove all margins at all screen sizes" | none |
| G3-space-11 | Vertical page padding is a *named wrapper class* resolved at runtime, with a fallback when it cannot be. | pattern | `https://design-system.service.gov.uk/styles/layout/#how-the-page-wrappers-work` | "If you're not using the Breadcrumbs component or Back link component in your design, add the correct amount of vertical padding above the content by adding one of the following to your <main> element:" | none |
| G3-space-13 | **Absence:** the scale publishes no named roles (no "gutter", "stack", "block-gap"); every step is a number, and the meaning of a step is carried by where it is used. | absence | `https://design-system.service.gov.uk/styles/spacing/#spacing` | "Spacing unit" | none |

**Read against our system:** we name the ladder (`S0…S7`, 4 8 12 16 24 32 48 64) and forbid steps
outside it; GOV.UK numbers the ladder (0…9 plus negatives) and forbids nothing, which is why their
scale has an override class and ours does not need one — a named step *is* the decision. Two things
here are worth stealing exactly:

- Row 02/03: **the small end of a scale frozen, the large end stepped.** Our ladder is uniform across
  breakpoints; theirs freezes units 0-3 because a 5px difference at 60px reads as a change and at
  15px reads as noise. That is a re-measure question for our spacing probe, not a rule to copy.
- Row 13 is the divergence to keep: their spacing carries **no semantics**, so their spacing cannot be
  audited for intent — only for being on the ladder. Ours names roles, which is what makes
  `check:space` able to demand a *composition* rule rather than a membership rule.
- Row 05: our artifacts do not mention negative spacing at all; theirs uses it as a composition
  device (pulling a block out of the vertical flow). That is a live gap for whatever we align.

**Pruned to 12 claims per table (the cap), with the reason:** `G3-space-12` separates width from vertical rhythm inside the wrapper contract that `G3-space-11` already states.
