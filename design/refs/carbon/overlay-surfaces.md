# Carbon — overlay surfaces (dialog, popover, menu, tooltip)

Domain 14 of the fixed 18. Status: **EVIDENCED**, and it is the densest domain in this system: Carbon
decides overlays by **disruptiveness matched to urgency**, which is exactly the axis our system
declares (hairline vs shadow) but never enumerates.

Pages reached: `…/core/patterns/dialogs`, `…/components/modal/guidelines`,
`…/components/popover/guidelines`, `…/components/tooltip/guidelines`,
`…/components/menu/guidelines`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C14-overlay-01 | A dialog is for focusing attention on a short task, and it is refused for content unrelated to the current workflow. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#when-not-to-use-a-dialog` | "Don't use if the content is unrelated to the current workflow." | none |
| C14-overlay-02 | Dialogs are user-initiated; a system-generated interruption is a different artifact (a toast). | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#dialogs-should-be-user-initiated` | "If the system is autogenerating an alert that is not a consequence of a user's action, but a response to processes happening in the background, then a toast notification should be used instead." | none |
| C14-overlay-03 | Two structural refusals on the modal itself: no nesting, no full-page modals. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#dont-nest-modals` | "Don't nest modals" | none |
| C14-overlay-04 | Modal size is chosen from four responsive sizes, and the overflow rule is content-driven: scroll the body, hold header and footer fixed. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#scrolling` | "the body section should scroll vertically with the header and footer remaining fixed in place." | none |
| C14-overlay-05 | When the largest modal is not enough, the answer is a full page, not a bigger modal. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/modal/guidelines#max-heights` | "If the large modal height is still not enough space then a full page might be needed instead." | none |
| C14-overlay-06 | A dialog's content budget is a time budget in disguise: avoid components that hide choices (accordions, tabs) and keep the journey direct and short. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#avoid-components-that-hide-information` | "Time spent in a modal should be minimal and only information needed to complete the task should be included." | none |
| C14-overlay-07 | A dialog must not leak the user out of it: links away are refused. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#avoid-components-that-will-direct-the-user-away-from-the-dialog` | "Avoid components like links that will take the user away from the current context and the task at hand." | none |
| C14-overlay-08 | A popover's width is capped in grid columns, and the escape hatch is a named switch: over four columns, use a modal. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/popover/guidelines#container` | "If your popover exceeds four columns in width, use a modal instead." | none |
| C14-overlay-09 | Nesting overlays is refused outright, with the reason: confusing interactions and accessibility issues. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/popover/guidelines#nesting` | "Avoid nesting popovers or placing popovers within other popovers." | none |
| C14-overlay-10 | A tooltip is not persistent, so it may never hold task-critical information; helper text is the alternative. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/tooltip/guidelines#provide-critical-information` | "Since a tooltip disappears when a user hovers away, do not include pertinent information for the user to complete their task." | none |
| C14-overlay-11 | Interactive elements inside a tooltip are refused, with the mechanism named: tooltips never receive focus. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/tooltip/guidelines#include-interactive-elements` | "Interactive elements in tooltips are inaccessible for some users and are hard to use for all users since tooltips do not receive focus." | none |
| C14-overlay-12 | Overlay states are named as two, not three: on (hover **and** focus) and closed; default is hidden and inactive. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/tooltip/guidelines#states` | "The tooltip component has two states: on (hover and focus) and closed." | none |

**Read against our system:** `shadow-e1`/`shadow-e2` are ship-defined but unused, and `DESIGN.md` says
why ("No modal or dropdown is in `src/` today"). Every row here is therefore
**pre-loading decisions before we build it** — the plan flags them as drafts, not ratifications. The
one that is *not* pre-loading is C14-overlay-12: our motion set animates colour on hover with no
stated state vocabulary, and theirs names the states.
