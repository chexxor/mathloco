# GOV.UK — forms & validation

Domain 10 of the fixed 18. Status: **EVIDENCED, and this is the densest behaviour contract in the
whole five-system corpus.** GOV.UK publishes validation as a *sequence* — when to validate, what to
refuse, what to keep, where to put the error, how to announce it, and how to word it — with outright
refusals (HTML5 validation, `required`, validating mid-field). Nothing here is a component API; it is
the decision trail a form must follow.

Pages reached: `…/patterns/validation/` (61,259 B), `…/components/error-message/` (99,821 B),
`…/components/error-summary/` (132,631 B).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G10-form-01 | Validation is framed as *refusal plus repair*: tell the user what went wrong **and how to fix it**. | rule | `https://design-system.service.gov.uk/patterns/validation/#validation` | "If there's a validation error, tell the user what's gone wrong and how to fix it." | none |
| G10-form-02 | Errors are the last resort: the pattern begins by demanding fewer of them. | rule | `https://design-system.service.gov.uk/patterns/validation/#when-to-use-this-pattern` | "But minimise your chances of needing to show an error message in the first place by: … making sure your questions are well designed" | none |
| G10-form-03 | Acceptance is *forgiving by grammar* — ignore stray characters rather than failing on them. | rule | `https://design-system.service.gov.uk/patterns/validation/#how-it-works` | "Use validation to ignore unwanted characters, unless it would make the information too unclear for you to use." | none |
| G10-form-05 | **Do not validate mid-field.** The validation point is the continue/submit boundary, not the field. | rule | `https://design-system.service.gov.uk/patterns/validation/#when-to-tell-the-user-about-validation-errors` | "Do not validate when the user moves away from a field." | none |
| G10-form-07 | Server-side validation is unconditional; client-side validation is an optimisation that can fail. | behavior | `https://design-system.service.gov.uk/patterns/validation/#client-side-and-server-side-validation` | "You'll always need to carry out server side validation, even if you use client side validation." | none |
| G10-form-08 | **Refusal:** native browser validation is banned because its error presentation cannot be made consistent. | rule | `https://design-system.service.gov.uk/patterns/validation/#turn-off-html5-validation` | "To turn off HTML5 validation, add 'novalidate' to your form tags." | none |
| G10-form-09 | **Refusal:** `required` on inputs is banned, and the reason is an open question they flag as research. | rule | `https://design-system.service.gov.uk/patterns/validation/#turn-off-html5-validation` | "Do not add 'required' to your input fields." | none |
| G10-form-10 | On failure, **re-render the page with the user's answers in it** — the error is shown in context, not alone. | behavior | `https://design-system.service.gov.uk/patterns/validation/#how-to-tell-the-user-about-validation-errors` | "show them the page again, with the form fields as the user filled them in" | none |
| G10-form-11 | Never clear a field to show an error: keep passing *and* failing answers. | rule | `https://design-system.service.gov.uk/components/error-message/#keep-failing-answers` | "Do not clear any form fields when showing the Error message component. Keep both passing and failing answers." | none |
| G10-form-12 | The error appears in **two places at once**: beside the field and in a page-level summary. | rule | `https://design-system.service.gov.uk/components/error-summary/#when-a-user-makes-an-error` | "When a user makes an error, you must show both an error summary and an Error message component next to each answer that contains an error." | none |
| G10-form-15 | An error message must reuse the question's own words so the pairing is obvious. | rule | `https://design-system.service.gov.uk/components/error-message/#wording` | "Error messages should directly include language from the question or fieldset label." | none |
| G10-form-16 | **An error is not a permission.** Eligibility failures are a different page, with different content. | rule | `https://design-system.service.gov.uk/components/error-message/#when-not-to-use-this-component` | "Do not use error messages to tell a user that they are not eligible or do not have permission to do something." | none |

**Read against our system — measured, not remembered.** The domain is **unshipped here**. `grep -rnoE
'<input|<form|<select|<textarea|required=|checkbox|radio' src --include='*.astro' --include='*.ts'
--include='*.svelte'` (run this session) returns **one** line, and it is a filename inside a comment
(`src/components/HorizonBand.astro:74`, `horizon-radio1922.png`). There is no form gate in the step list
(`node scripts/gate-run.mjs --list` prints no `check:form`). So every row in this table is a *draft*
gap, not a ranked one: a detector proposed here has nothing to fail today, and `GAP-ANALYSIS.md` keeps
unshipped-domain drafts in their own titled section for that reason.

Two parts of this domain are nonetheless live now, and they are the two that survive the absence:

- **Row 16 (an error is not a permission)** applies to the failure state we *do* ship — the RSVP feed
  branch. Our artifacts require the error branch to be present in server-rendered HTML (DESIGN.md:417:
  "The error branch must exist in the server-rendered HTML: a JavaScript-off visitor can otherwise never
  leave the loading branch."), and they require the retry inside a notice to be a **quiet label** rather
  than a block control. GOV.UK's contribution is the half our rule does not state: *what the copy of that
  branch may promise* — it may not read as a validation error, and it must name what to do next.
  Detector candidate: a copy detector on the error branch that fails if it is worded as a validation
  message (grep-class against a fixture, cheapest of the three candidates below).
- **Rows 10/11 (keep the answers, re-render in context)** are the same shape as our loading→content
  contract: reserve the height so nothing jumps, and never blank what is already there. Ours states the
  reserve ("Reserve the height so the page does not jump when content lands", DESIGN.md:401); theirs
  states the don't-blank. Neither is a form, so both are steal-exactly lines for §4 rather than gap rows.

**Pruned to 12 claims per table (the cap), with the reason:** `G10-form-04` is the named cause behind `G10-form-03`; `G10-form-06` is the exception bar on `G10-form-05`; `G10-form-13` and `G10-form-14` are summary-link mechanics under `G10-form-12`; `G10-form-17` is a copy rule whose failure mode `G10-form-15` already states.
