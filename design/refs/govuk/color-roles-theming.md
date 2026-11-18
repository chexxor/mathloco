# GOV.UK — colour roles & theming

Domain 1 of the fixed 18. Status: **EVIDENCED — and this is the closest thing in any of the five
systems to our own role vocabulary.** GOV.UK publishes colour as *purposes* (`link`, `error`,
`success`, `focus`, `focus-text`, `hover`, `brand`, `border`, `input-border`, `surface-*`), reached
through a function rather than a name, and it refuses hex literals outright. It is a **role system
with an install mechanism and no detector** — our system is the same role system with a detector.

Page reached: `https://design-system.service.gov.uk/styles/colour/` (98,560 B, artifact `govuk-colour.html`).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G1-color-01 | The palette is a closed set; picking a colour outside it is a defect, not a choice. | rule | `https://design-system.service.gov.uk/styles/colour/#colour` | "Always use the GOV.UK colour palette." | none |
| G1-color-02 | Contrast is stated as a WCAG 2.2 criterion with the criterion number, not as a vibe. | rule | `https://design-system.service.gov.uk/styles/colour/#colour-contrast` | "You must make sure that the contrast ratio of text and interactive elements in your service meets Web Content Accessibility Guidelines (WCAG 2.2) success criterion 1.4.3 Contrast (minimum) level AA." | none (the criterion is a standard they point at, nothing here runs it) |
| G1-color-03 | Colour is addressed by purpose; the function assigns the value so the consumer never holds one. | rule | `https://design-system.service.gov.uk/styles/colour/#assign-colours-using-govuk-functional-colour` | "The GOV.UK Design System has a set of functional colours for essential page elements." | none |
| G1-color-04 | The reason roles exist is stated, and it is the same reason ours exist: predictability of interaction. | rule | `https://design-system.service.gov.uk/styles/colour/#assign-colours-using-govuk-functional-colour` | "These help apply colours across the Design System in a way that makes interactions predictable and consistent to users." | none |
| G1-color-05 | **Refusal:** a hex literal in consumer CSS is a defect because it freezes the palette. | rule | `https://design-system.service.gov.uk/styles/colour/#assign-colours-using-govuk-functional-colour` | "Do not copy the specific hexadecimal (hex) colour values." | none — the same refusal our `check:contrast` turns into a failing exit code |
| G1-color-07 | A role may not be borrowed outside its purpose; the web palette is the escape hatch and it is named. | rule | `https://design-system.service.gov.uk/styles/colour/#assign-colours-using-govuk-functional-colour` | "Only use the variables in the context they're designed for. In all other cases, you should reference the GOV.UK web palette directly." | none |
| G1-color-08 | The error role has one purpose and one name; there is no severity ladder of hues. | token | `https://design-system.service.gov.uk/styles/colour/#error-state` | "Use this colour for error messages" | none |
| G1-color-10 | Focus is a colour **role pair** — surface and text — plus a width token, which is the shape our focus contract needs. | token | `https://design-system.service.gov.uk/styles/colour/#focus-state` | "Only use this colour to indicate which element is focused on. For example, when a user tabs to an element with their keyboard." | none |
| G1-color-11 | Hover is a role with a named use, and it is the *input* hover — the pair our hover contract must answer for. | token | `https://design-system.service.gov.uk/styles/colour/#hover-state` | "Use this colour for input hover states" | none |
| G1-color-12 | Surfaces get a role group of their own (`surface-background`, `surface-text`, `surface-border`) — three names, no ramp. | token | `https://design-system.service.gov.uk/styles/colour/#surface` | "surface-border" | none |
| G1-color-13 | Variant naming is a **derived-axis grammar** (`tint-25`, `shade-50`) off a group's primary, which is a different model from a hand-picked ramp. | pattern | `https://design-system.service.gov.uk/styles/colour/#govuk-web-palette` | "govuk-colour("red", $variant: "tint-25") will return 'Red tint 25%', which is a variant of red with a tint of 25%" | none |
| G1-color-14 | Theming is not a switch: it is one inverse role for text on dark grounds plus per-component `--inverse` modifier classes. | pattern | `https://design-system.service.gov.uk/styles/colour/#text` | "Use this colour for text on dark backgrounds" | none |

**Read against our system:** three things here are worth naming rather than importing.
(1) Their functional roles are *purpose-keyed and function-served*; ours are role-named tokens read
from one `@theme` block — same decision, opposite mechanism (theirs hides the value, ours prints it,
which is what makes ours checkable at all). (2) They have an **error** and a **success** colour role
where we have no signal hue at all (D102 refuses one and carries severity in a keyline and a word);
that is a genuine CONTESTED pair, not a gap. (3) Their `surface-*` triple is the vocabulary for a
floating surface — a background, its text, and its border — and our `shadow-e1`/`e2` are defined but
unused because no floating surface ships, so nothing in our `@theme` says "a surface that is above
the page still has a role name". Row 13 is the one place where their grammar is *worse* for us than
nothing: we have no ramp to derive, and a tint/shade grammar over our palette is exactly the thing
`check:contrast` exists to refuse.

**Pruned to 12 claims per table (the cap), with the reason:** `G1-color-09` restates the error-role rule for the success role; `G1-color-06` is the versioned consequence of the hex refusal, which `G1-color-05` already carries. Both were read, not dropped blindly.
