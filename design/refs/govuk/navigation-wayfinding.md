# GOV.UK — navigation & wayfinding

Domain 13 of the fixed 18. Status: **EVIDENCED, and the evidence is unusually explicit about
*who owns the pattern*:** step-by-step navigation is a GDS-published object that a service team may
prototype but may not publish. That ownership boundary is the finding — a wayfinding pattern with a
publisher, a lifecycle, and a refusal to be customised.

Pages reached: `…/patterns/step-by-step-navigation/` (64,300 B), `…/patterns/interruption-pages/`,
`…/patterns/check-answers/`, `…/patterns/page-not-found-pages/`, `…/patterns/confirmation-pages/`,
`…/patterns/task-list-pages/` (410, archived).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G13-nav-01 | A journey is a **named object**: an end-to-end journey in logical steps, with links doing the completing. | rule | `https://design-system.service.gov.uk/patterns/step-by-step-navigation/#step-by-step-navigation` | "The step by step navigation pattern presents an end to end journey in logical steps, with links to content that helps users complete each step." | none |
| G13-nav-02 | A step and a task are different objects with different renderings: steps are numbered sections the user can expand, tasks are single links or lists. | pattern | `https://design-system.service.gov.uk/patterns/step-by-step-navigation/#steps-and-tasks` | "They appear in the pattern as numbered sections. The user can click on the step to expand it." | none |
| G13-nav-03 | Every content page in the journey carries a **return route to the standalone journey page**, in a fixed position. | behavior | `https://design-system.service.gov.uk/patterns/step-by-step-navigation/#how-it-works` | "Content pages that are part of the step by step navigation always have a link at the top that goes to the standalone step by step page." | none |
| G13-nav-05 | The pattern is refused when the order is not the user's: series-of-options journeys get nothing. | rule | `https://design-system.service.gov.uk/patterns/step-by-step-navigation/#when-not-to-use-it` | "when there's no logical or helpful order to complete the tasks - for example, when you're mostly presenting the user with a series of options" | none |
| G13-nav-06 | **Ownership is a gate on publishing:** a prototype is not a publishable artifact. | rule | `https://design-system.service.gov.uk/patterns/step-by-step-navigation/#how-it-works` | "You will not be able to publish step by step navigation you've created yourself on the live GOV.UK site: this pattern is for use in your prototype only." | none |
| G13-nav-07 | In a prototype the design must **not** be customised, because customising makes the prototype unrepresentative. | rule | `https://design-system.service.gov.uk/patterns/step-by-step-navigation/#prototyping` | "When you prototype a step by step journey, do not customise the design." | none |
| G13-nav-08 | The pattern is not shipped as code at all — and they name that exception, which is coverage information, not a claim. | behavior | `https://design-system.service.gov.uk/patterns/step-by-step-navigation/#prototyping` | "Unlike most other components and patterns in the Design System, we do not provide the code for step by step navigation in govuk-frontend." | none |
| G13-nav-09 | An interruption page gives the user a **way back**, in a fixed position at the top. | behavior | `https://design-system.service.gov.uk/patterns/interruption-pages/#how-it-works` | "The Interruption page includes a back link at the top of a page, to allow users to go back to the previous page they were on." | none |
| G13-nav-10 | Optional jump-back links are **grouped with the continue button**, and the link text names the act or the page. | pattern | `https://design-system.service.gov.uk/patterns/interruption-pages/#how-it-works` | "If it's helpful for users to jump back to another point in the journey, such as the start of a section, add a link and group it alongside the continue button." | none |
| G13-nav-11 | A review page uses its **title** as the locator for what the user must do next, because the submit control is at the end. | rule | `https://design-system.service.gov.uk/patterns/check-answers/#page-title` | "Use the page title to tell the user what they need to do - otherwise, they might miss the 'submit' button at the end of the page." | none |
| G13-nav-12 | Broken routes are a design duty with a stated test: every address, in letters and forms, must exist or redirect. | rule | `https://design-system.service.gov.uk/patterns/page-not-found-pages/#how-to-avoid-them` | "Test all links and buttons to make sure they work." | none |
| G13-nav-13 | A pattern can be **renamed and archived**, and the archived page states the new name and where history lives. | behavior | `https://design-system.service.gov.uk/patterns/task-list-pages/#this-page-has-been-archived` | "The task list pattern has been renamed to the Complete multiple tasks pattern and a new Task list component was published with updated guidance." | none |

**Read against our system — and this is the domain where their *ownership* idea is the transferable
one.** Ours publishes the join path, the bands, and the service navigation on the site itself, so rows
06 and 07 (`GDS`-only publication, "do not customise the design") do not apply as rules to us; what
they contribute is the *reason a pattern is frozen*: a published pattern is frozen because a
customisation makes the representation untrustworthy.

Three live gap candidates, all detector-shaped and all against surfaces we ship today:

- **Row 03** is a structural invariant we can state and check today: a page that is part of a journey
  carries a route back to the journey's spine, at the top. Our artifacts enforce link *semantics*
  (`check:ext-links` demands `rel` with `noopener` and forbids `target=_blank` on club routes) but
  nothing counts a return route per band. Detector: assert each rendered band contains at least one
  in-repo route; selftest plants a band with none. Cost: browser-set, not grep.
- **Row 05** is a copy-plus-structure rule our schedule band must answer: a list of alternatives has
  no implied order, so a numbered or "next step" framing over it is a defect.
- **Row 13** is governance, not wayfinding, and it is the cheapest versioning evidence in the whole
  corpus: a renamed pattern leaves a 410 page that names its replacement. Any rename in our tokens or
  our routes should produce the same artifact, and the detector for that is a grep against a list.

**Pruned to 12 claims per table (the cap), with the reason:** `G13-nav-04` is the relevance caveat on the journey pattern; the publishing gate on the same pattern is `G13-nav-06`, which is the stronger statement.
