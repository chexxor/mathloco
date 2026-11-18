# Atlassian — overlay surfaces (dialog, popover, menu, tooltip)

Domain 14 of the fixed 18. Status: **EVIDENCED** — and this is the only one of the five systems with
a full overlay contract, which matters here because our artifacts ship two shadow tokens **with no
overlay to hang from**.

Artifacts reached: `https://atlassian.design/components/modal-dialog/usage` (page),
`https://atlassian.design/llms-components.txt` (Modal, ModalHeader, ModalTitle, ModalFooter,
ModalTransition, CloseButton, DropdownMenu, Popup, Tooltip, Blanket components).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A14-ov-01 | An overlay is for **one immediate task**, and it may not be used for information alone. | rule | `https://atlassian.design/components/modal-dialog/usage#Usage` | "Use a modal dialog to present an immediate task a user needs to perform." | none |
| A14-ov-02 | The overlay is acknowledged as invasive, in its own usage block. | rule | `https://atlassian.design/components/modal-dialog/usage#Usage` | "They can be invasive and should be used sparingly." | none |
| A14-ov-03 | The page is frozen while it is open — the reason dismissal gets four affordances. | behavior | `https://atlassian.design/components/modal-dialog/usage#Dismissing-modals` | "Users can't interact with the rest of the page until a modal is closed." | none |
| A14-ov-04 | Its title is required for a stated reason, and the title is a level h1 in the document outline. | rule | `https://atlassian.design/components/modal-dialog/usage#Labeling-modals` | "Modals must have a title so all users can understand what the modal is for." | test (axe dialog name) |
| A14-ov-05 | A close button is required, and the exception is not ours to assume. | rule | `https://atlassian.design/components/modal-dialog/usage#Dismissing-modals` | "A close button in the header should always be used, except in extremely rare circumstances." | test (axe) |
| A14-ov-06 | Dismissal has four named affordances, including pressing Esc and clicking the blanket. | pattern | `https://atlassian.design/components/modal-dialog/usage#Dismissing-modals` | "Selecting anywhere outside the modal (in the blanket)" | none |
| A14-ov-07 | Nesting overlays is refused, and the refusal names the failure mode. | rule | `https://atlassian.design/components/modal-dialog/usage#Nesting` | "Don’t use dialogs to trigger other dialogs, as this is inaccessible and confusing." | none |
| A14-ov-08 | A layer inside a layer may not open **at the same moment** as its parent — and one exception is named. | rule | `https://atlassian.design/llms-components.txt#Modal-component` | "Do not open a layer inside the modal at the same time as the modal (for example, a modal that opens with its DropdownMenu, Popup or Select menu already open)." | none |
| A14-ov-09 | A menu is bounded by item count and by nesting depth, both stated numerically. | pattern | `https://atlassian.design/llms-components.txt#DropdownMenu-component` | "Use for 5–15 items; navigation or command (action on selection)" | none |
| A14-ov-10 | A menu may not be built out of a popup; the role is named as not production-ready. | rule | `https://atlassian.design/llms-components.txt#Popup-component` | "Use DropdownMenu whenever possible. A Popup with role=\"menu\" is not a blessed, production-ready menu pattern." | none |
| A14-ov-11 | A tooltip carries no critical information and no interactive content, twice. | rule | `https://atlassian.design/llms-components.txt#Tooltip-component` | "Do not put critical info in tooltip—use labels, helper text, or inline message" | none |
| A14-ov-12 | A tooltip only exists on things you can focus. | rule | `https://atlassian.design/llms-components.txt#Tooltip-component` | "Use only on interactive elements (must be focusable for keyboard and screen readers)" | none |

**Read against our system:** our artifacts state the *absence* honestly — `shadow-e1`/`shadow-e2` are
ship-defined-but-unused, because "No modal or dropdown is in `src/` today". Every row here is therefore
a **pre-loading decision before we build it**, flagged as a draft in §2's separate section: none of it
may be ratified against a screen that does not exist. What is **not** pre-loading, and is a live gap
today, is the half of these rules that applies to overlays we already refuse to build: rows 01/02/10/12
are each one sentence that our DESIGN.md could carry today as a refusal ("an overlay is for a task, and
it gets a title, and a dismiss affordance"), which is cheaper than discovering it when the first modal
lands. Row 04 is the strongest of the pre-loading set because it is the one their test already fails
for them.
