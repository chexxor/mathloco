# Carbon — focus & keyboard

Domain 8 of the fixed 18. Status: **EVIDENCED**.

Pages reached: `…/foundations/color/overview`, `…/patterns/dialogs`,
`…/components/popover/guidelines`, `…/components/breadcrumb/guidelines`,
`…/patterns/search`, `…/foundations/accessibility`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C8-focus-01 | Focus is a visual spec, not a browser default: 2px border around the element. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#focus` | "In Carbon, the focus of an element is most commonly indicated by a 2px border around the element." | none — ships in the component CSS |
| C8-focus-02 | Focus is mandatory on every interactive element and must clear 3:1. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#focus` | "Focus states are required on all interactive elements and must pass 3:1 color contrast accessibility." | none |
| C8-focus-03 | When 3:1 cannot be met directly, they add a second border rather than a heavier one. | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#focus` | "Often times to achieve proper 3:1 contrast a `$focus-inset` border is used between the focus border and the element itself." | none |
| C8-focus-04 | Opening a dialog moves focus into it, and focus is **trapped** there until it closes; on close, focus returns to the invoker. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#focus` | "After a modal dialog closes, focus should return to the element that invoked the modal." | none — the React component implements it, nothing checks a hand-written page |
| C8-focus-05 | The first focus target is decided by what accepts input, not by the first element. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/modal/guidelines#focus` | "Once the modal is open, set the initial focus to the first location that accepts user input." | none |
| C8-focus-06 | Tab order is specified: body elements left-to-right/top-to-bottom, then primary, secondary, close. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#tab-order` | "First interactive element in the body area. … Proceed left to right and top to bottom through the rest of the body elements." | none |
| C8-focus-07 | Keyboard contract for a dialog: `ESC` closes, `Tab` moves, `Space`/`Enter` trigger. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#keyboard-navigation` | "ESC: close the dialog" | none |
| C8-focus-08 | A keyboard-visible failure they name: do not put first focus on the trigger button when the dialog has inputs. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#focus` | "Don't set the first focus on the dialog button if there are inputs or selection to be made in the dialog." | none |
| C8-focus-09 | An overlay control is keyboard-usable only if `Enter`/`Space` toggles its visibility. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/popover/guidelines#keyboard` | "When the popover control has focus Enter or Space activates the popover control and toggles the visibility of the popover content." | none |
| C8-focus-10 | Composite controls must be keyboard-navigable too: scope dropdowns and type-ahead suggestions get `Tab`, arrow keys, `Enter`, `Esc`. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/search#search` | "Users should be able to Tab into the input field of the search box to begin typing and press Enter to run the search query." | none |
| C8-focus-11 | Selection state survives a reload so the user does not have to tab through everything again. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/search#faceted-filtering` | "After a facet is selected or deselected, the focus state should be retained as the content reloads" | none |
| C8-focus-12 | Their accessibility test is a human ritual: "When possible, test all designs through a screen reader." | behavior | `https://www.carbondesignsystem.com/building-blocks/foundations/accessibility#low-vision-users` | "When possible, test all designs through a screen reader." | none — a named manual action, not a check |

**Read against our system:** `check:focus` exists on our side, so C8-focus-01/02 are `MATCH`-shaped
(ours may differ in width — the comparison belongs in the gap table, not here). C8-focus-04…08 are
contracts for a surface we do not ship yet (no modal in `src/`), which makes them
**pre-loading decisions before we build it**, not gaps. C8-focus-11 is a keyboard rule we have no
surface for either.
