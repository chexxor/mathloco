# Atlassian — focus & keyboard

Domain 8 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-tokens.txt#Focus-Management`,
`https://atlassian.design/llms-tokens.txt#Border-Width`,
`https://atlassian.design/llms-a11y.txt` (Keyboard Navigation, Buttons and Pressable Elements,
Common Accessibility Issues),
`https://atlassian.design/components/modal-dialog/usage#Setting-focus`,
`https://atlassian.design/llms-components.txt` (DropdownMenu, Spotlight components).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A08-focus-01 | A focus indicator is a recipe with four parts: width, colour token, offset, and a `:focus-visible` selector. | behavior | `https://atlassian.design/llms-tokens.txt#Focus-Management` | "outline: `2px solid ${token('color.border.focused')}`," | lint (the token value is closed; the selector is checked by their nested-selector rules) |
| A08-focus-02 | A pointer-only focus is **explicitly removed**, so two states are named, not one. | behavior | `https://atlassian.design/llms-tokens.txt#Focus-Management` | "'&:focus:not(:focus-visible)': { outline: 'none', }" | none |
| A08-focus-03 | Suppressing focus is the defect they name, in the anti-pattern column. | rule | `https://atlassian.design/llms-a11y.txt#Avoid-These-Patterns` | "Don't hide focus indicators" | test (axe); the ❌/✅ pair is the shape of their selftest |
| A08-focus-04 | The width role exists **for the state**, so focus is not styled with a general border width. | token | `https://atlassian.design/llms-tokens.txt#Border-Width` | "border.width.focused \| 2px \| 0.125rem \| Focus states" | lint |
| A08-focus-05 | Tab order is a requirement, stated before any component rule. | rule | `https://atlassian.design/llms-a11y.txt#Keyboard-Navigation` | "Ensure logical tab order" | test (axe keyboard rules) |
| A08-focus-06 | Focus trapping and focus **return** are both named as responsibilities of the dialog. | rule | `https://atlassian.design/llms-a11y.txt#Keyboard-Navigation` | "Return focus when dialogs close" | none automated |
| A08-focus-07 | The order inside a modal is enumerated, and the last step returns to the trigger. | behavior | `https://atlassian.design/components/modal-dialog/usage#Setting-focus` | "Modal trigger : When the modal is closed, focus should return to the element that triggered the modal." | none |
| A08-focus-08 | When a focusable close button does not exist, focus starts on the title, and when that does not exist, on the container. | pattern | `https://atlassian.design/components/modal-dialog/usage#Setting-focus` | "If the modal doesn’t have a close button, focus should start on the title." | none |
| A08-focus-09 | An open menu holds focus, and opening by keyboard puts it on the first item. | rule | `https://atlassian.design/llms-components.txt#DropdownMenu-component` | "Focus lock when open; keyboard open should focus first item" | none |
| A08-focus-10 | In an overlay, a menu must be told the parent, for focus and voicing reasons. | behavior | `https://atlassian.design/llms-components.txt#DropdownMenu-component` | "In modal use shouldRenderToParent for focus and voicing" | lint (prop) |
| A08-focus-11 | The dismiss control is the **first focusable element** of a spotlight. | rule | `https://atlassian.design/llms-components.txt#Spotlight-component` | "Dismiss control must be first focusable element" | none |
| A08-focus-12 | A shortcut shown in a tooltip is invisible to assistive tech, so an alternative is mandatory. | rule | `https://atlassian.design/llms-components.txt#Tooltip-component` | "Keyboard shortcuts shown in tooltip are not exposed to assistive tech—provide an alternative (e.g. panel, dialog)" | none |

**Read against our system:** our artifacts make focus visible (a focus style is required on controls,
`check:ics`-adjacent gates exist in the deploy set) but say nothing about **return of focus**,
nothing about the order inside an overlay, and nothing about a focus *width*. Rows 02, 06, 07, 08
form one contract our tree has no half of: an overlay that opens must place focus, and closing must
put it back where it came from. Because no modal or dropdown is in `src/` today, rows 07/08/10/11 go
into the "pre-loading decisions before we build it" section as drafts, while rows 01/04 (a focus ring
with a named width token) and 03 (a planted defect for "focus suppressed") are live gaps for the
controls that do exist today. Row 03 is also the closest artifact in any of the five systems to our
own selftest idiom — their ❌/✅ pairs are planted defects, and they are the only source that prints
one.
