# Atlassian — forms & validation

Domain 10 of the fixed 18. Status: **EVIDENCED**. This is the richest validation corpus of the five.

Artifacts reached: `https://atlassian.design/llms-components.txt` (the `@atlaskit/form` package's
Form, Field, Fieldset, Legend, HelperMessage, ErrorMessage, CharacterCounterField components; the
`@atlaskit/checkbox`, `@atlaskit/radio`, `@atlaskit/select`, `@atlaskit/textarea` packages).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A10-form-01 | A validation failure has a **named place**: the message lives in a wrapper, under the control. | pattern | `https://atlassian.design/llms-components.txt#ErrorMessage-component` | "Use within MessageWrapper when field validation fails" | lint (component props) |
| A10-form-02 | The message must be actionable, and its position is stated separately from its content. | rule | `https://atlassian.design/llms-components.txt#ErrorMessage-component` | "Place below the form control" | none |
| A10-form-03 | A control is **never removed to hide it**; validation carries the reason. | rule | `https://atlassian.design/llms-components.txt#Checkbox-component` | "Do not use disabled if the control must stay in tab order; use validation and error message so screen reader users hear why and how to proceed" | none (prose rule) |
| A10-form-04 | The same rule, stated for the submit control, with the same reason. | rule | `https://atlassian.design/llms-components.txt#Form-component` | "Never disable the submit button—use validation and instructions so users know how to proceed" | none |
| A10-form-05 | A label is visible and associated; a placeholder is not a label, and the reason is that it disappears. | rule | `https://atlassian.design/llms-components.txt#Select-component` | "Use a visible label for the field—do not use placeholder as the only label (placeholder disappears and is not accessible)" | test (axe missing-label) |
| A10-form-06 | The exception to the label rule is named, and it is an exception, not an absence. | pattern | `https://atlassian.design/llms-components.txt#Form-component` | "Always include a visible label (exception: search fields)" | none |
| A10-form-07 | Required is marked, in one glyph, in the control's own line. | pattern | `https://atlassian.design/llms-components.txt#Form-component` | "Mark required fields with asterisk (*)" | lint (a component exists for the asterisk) |
| A10-form-08 | Validation is inline and its instruction accompanies it. | pattern | `https://atlassian.design/llms-components.txt#Form-component` | "Use inline validation with clear instructions" | none |
| A10-form-09 | A field's length is chosen against its content, which is the only length rule in their form language. | rule | `https://atlassian.design/llms-components.txt#Form-component` | "Match field length to intended content length" | none |
| A10-form-10 | Choice lists are ordered by likelihood, and the ordering rule names the failure mode. | rule | `https://atlassian.design/llms-components.txt#Radio-component` | "List options in logical order (most likely to least likely)" | none |
| A10-form-11 | A default is chosen for safety, and a high-risk option is never preselected. | rule | `https://atlassian.design/llms-components.txt#Radio-component` | "Never preselect high-risk options for payment, privacy, or security" | none |
| A10-form-12 | Numeric choices may neither overlap nor skip, and an unset state is an option, not a blank. | rule | `https://atlassian.design/llms-components.txt#Radio-component` | "Avoid overlapping or skipping numeric choices" | none |

**Read against our system:** our tree has one form-shaped surface today — the RSVP/attendance
capture and the schedule filter controls — and DESIGN.md states nothing about validation, labels,
required marks, or where an error message goes. Rows 01–08 are the eight-part contract of the one
domain where every one of the five sources has rules and we have none: **a control stays, the reason
is stated, the reason sits under the control, and the state of "not yet valid" is a visible thing,
not a hidden control**. Row 03/04 pair is the strongest steal in this corpus because it is one
sentence long, names why, and is the exact defect our `empty-states`-adjacent gates would call a
dead end. Row 11 is a rule we cannot adopt as prose but can adopt as a gate (a default that changes
something destructive). Row 10/12 answer our filter controls specifically: nothing in our artifacts
says how an option list is ordered or what happens when no option is chosen.
