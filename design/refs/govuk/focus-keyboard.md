# GOV.UK — focus & keyboard

Domain 8 of the fixed 18. Status: **EVIDENCED, with values and a WCAG criterion number.** This is the
one domain where GOV.UK states a focus mechanism precisely enough to be compared against our rings, and
it states *why* the mechanism is shaped that way (one colour cannot clear both a dark and a light ground).

Pages reached: `…/get-started/focus-states/`, `…/styles/layout/`, `…/components/error-summary/`,
`…/patterns/validation/`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G8-focus-01 | Focus is defined as a *kind of person*, before it is defined as a style. | rule | `https://design-system.service.gov.uk/get-started/focus-states/#focus` | "Some people use keyboards or other devices to navigate through a page by jumping from one interactive element to the next." | none |
| G8-focus-02 | The focus treatment is a **pair** (yellow ground + black border) chosen to clear one named criterion on **any** background. | rule | `https://design-system.service.gov.uk/get-started/focus-states/#understanding-focus-state-styles` | "Focus states in the GOV.UK Design System use a combination of yellow and black, along with a thick bottom border … success criterion 1.4.11 Non-text contrast, level AA on any background colour used on GOV.UK." | none — the criterion is cited, nothing here measures it |
| G8-focus-03 | The reason the pair exists: the two halves clear opposite grounds. | rule | `https://design-system.service.gov.uk/get-started/focus-states/#understanding-focus-state-styles` | "The yellow has a high contrast with dark backgrounds and the thick black border has a high contrast against light backgrounds." | none |
| G8-focus-04 | There are **two focus grammars**, and which one applies is decided by whether the element has a border or background. | pattern | `https://design-system.service.gov.uk/get-started/focus-states/#form-input-focus-state-style` | "When form inputs are focused, they have a yellow outline and a thick black border. If the element already has a border, the border gets thicker." | none |
| G8-focus-05 | A focus style that merely *looks like* a link inherits the link's focus grammar. | pattern | `https://design-system.service.gov.uk/get-started/focus-states/#link-focus-state-style` | "Other components and elements that look like links use the link focus state style." | none |
| G8-focus-06 | The width of the ring is a **token role**, and using it instead of a number is mandated. | token | `https://design-system.service.gov.uk/get-started/focus-states/#make-other-focusable-elements-accessible` | "Use these values in your components instead of numeric values for the background, text and widths." | none |
| G8-focus-07 | Extended components must inherit the published focus values — an extension that ships its own ring is the defect they name. | rule | `https://design-system.service.gov.uk/get-started/focus-states/#making-focus-states-accessible-for-extended-and-modified-components` | "If you've extended or modified components in the GOV.UK Design System, you can use GOV.UK styles to make the focus states of these components accessible." | none |
| G8-focus-08 | Keyboard focus is *moved for you* by the library, and they document that it moved automatically. | behavior | `https://design-system.service.gov.uk/components/error-summary/#when-a-user-makes-an-error` | "show an Error summary component at the top of the page, and move keyboard focus to it" | test (they state a JAWS failure that the move fixed, and ship nothing to re-run it) |
| G8-focus-09 | Hidden elements must become visible **on focus**, which is the affordance a keyboard user needs when the visual design hides content. | pattern | `https://design-system.service.gov.uk/styles/layout/#hide-elements-and-keep-them-accessible-to-screen-readers` | "If the element is focusable, such as a link, you can make it become visible when receiving keyboard focus using govuk-visually-hidden-focusable." | none |
| G8-focus-10 | Error text is announced by prefixing the **document title**, so the announcement happens at load rather than at the error. | behavior | `https://design-system.service.gov.uk/patterns/validation/#how-to-tell-the-user-about-validation-errors` | "add 'Error: ' to the beginning of the page <title> so screen readers read it out as soon as possible" | none |
| G8-focus-11 | A hidden prefix is a **translatable string** with an explicit exception for other languages. | behavior | `https://design-system.service.gov.uk/components/error-message/#wording` | "If your error message is written in another language, you can change the prefix as needed, as shown in this example." | none |
| G8-focus-12 | **Absence:** no focus order rule, no tab sequence rule, no visible-keyboard-only (`:focus-visible`) rule, and no touch-target number appears in any fetched page. | absence | `https://design-system.service.gov.uk/get-started/focus-states/#focus` | "Focus states let users know which element they're currently on and is ready to be interacted with." | none |

**Read against our system.** Ours states the *role per ground* rule with measured pairs (DESIGN.md:79:
"Focus rings take one role per ground: `outline-accent` on paper (5.77) and `outline-band-text` on the
dark band (16.43), always with `outline-2 outline-offset-2`"). GOV.UK reaches the same conclusion by a
different route — one colour plus a border thick enough to survive the opposite ground — and states the
criterion number (1.4.11) that our bars imply but never name.

Three live candidates for the gap analysis, all detector-shaped:

- Their G8-focus-03/02 pair is the **claim our ring rule should carry and does not**: a ring must clear
  its bar on *both* grounds, and a single-hue ring is only legal on one. Ours measures per ground and
  bans the pair that reads 2.97; nothing fails a ring that was never measured against a dark ground.
- Their G8-focus-08 is a **behavior contract with a mechanism** (`govuk-frontend` JS moves focus). Our
  artifacts have a form-adjacent state (`check:form` exists in the gate set per `DESIGN.md`) but no
  rule that focus must be *moved to* the summary when an error appears — a detector candidate that
  needs a browser, so its cost must be priced as a browser step, not a grep.
- Their G8-focus-10 (title prefix announcement) is a **one-line markup contract** we are silent about
  and could carry for free on any form page we ever ship.
