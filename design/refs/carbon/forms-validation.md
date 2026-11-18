# Carbon — forms & validation

Domain 10 of the fixed 18. Status: **EVIDENCED** — and this is the domain where our system is silent
in the loudest way (see `check-*.mjs` inventory in `GAP-ANALYSIS.md` §0).

Pages reached: `…/core/patterns/forms`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C10-form-01 | A form is a group of related input controls, and it has one job: gather information with as little fuss as possible. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#overview` | "Forms are meant to gather information and guide people with as little fuss as possible." | none |
| C10-form-02 | Ask for nothing the user did not have to give: "Respect the user's GDPR and other privacy regulations by only asking for information that is absolutely necessary." | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#respect-the-user` | "Respect the user's GDPR and other privacy regulations by only asking for information that is absolutely necessary." | none |
| C10-form-03 | A label is one to three words, sentence-style, no trailing colon — and it is not helper text. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#labels` | "Do not use colons after label names." | none |
| C10-form-04 | Required/optional is decided by the **majority**, not per field: if most fields are required, only the optional ones get marked. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#optional-vs-mandatory` | "If the majority of the fields are required, mark only the optional field labels with (optional)." | none |
| C10-form-05 | Validation happens before submission and fires when the field loses focus. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#errors-and-validation` | "We recommend validating the user's data before form submission. This type of real-time, inline validation (a.k.a. client-side validation) should happen as soon as the field loses focus." | none |
| C10-form-06 | An error message states the problem in the user's own terms: a length failure reads "Password must be at least 16 characters." | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#errors-and-validation` | "the text should read something like, \"Password must be at least 16 characters.\"" | none |
| C10-form-07 | Error messages clear themselves once the criteria are met. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#errors-and-validation` | "Inline error messages should disappear when the form criteria is met." | none |
| C10-form-08 | Server-side failures get a notification **and** an inline message; the two are different channels with one cause. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#errors-and-validation` | "use an inline notification as well as inline error messaging wherever possible to help users make the fix" | none |
| C10-form-09 | Prevent the error before naming it: prefer selection controls and bound inputs over free text. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/modal/guidelines#validation` | "Decrease the chances of invalid data by using selection controls and bound entry controls components that provide users with specific input choices" | none |
| C10-form-10 | A dialog validates before it closes and stays open, marking the offending entry. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs#validation` | "Validate a user's entries before the dialog is closed. If any entry is invalid then the dialog should remain open with the entry marked with an error state and include an inline error message." | none |
| C10-form-11 | Structure of a long form is chosen from three named devices (progressive disclosure, accordion, multistep + progress indicator), and one of them is refused inside dialogs. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#accordion-forms` | "As a general rule, this technique should not be used in dialog forms." | none |
| C10-form-12 | Single-column is the default, with a source named: multicolumn forms are more prone to misinterpretation. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#columns` | "Carbon generally recommends single-column forms, simply because multicolumn forms are more prone to misinterpretation." | none |

**Read against our system:** this domain's evidence is unusually strong because Carbon is the only
source here that states the *behavior contract* (C10-form-05…09) rather than the look. Our repo has
an RSVP join flow with fields and no detector for any of these five behaviors, so the gap is in the
plan's §2, and each row names its own possible detector.
