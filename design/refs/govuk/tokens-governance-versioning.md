# GOV.UK — tokens, governance, versioning

Domain 18 of the fixed 18. Status: **EVIDENCED, and it is the strongest governance evidence in the
whole corpus.** This system is the only one of the five that publishes a *date-stamped* release
statement, a **trial → stable → deprecated** lifecycle with a time bound, and a **version gate on a
single class**. That is the model our own ledger runs on: a decision that ages, and a rule that says
when a thing stops being true.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G18-gov-01 | The system's own front page is a **versioned release event with a date**, not a feature list: the version number and the day are the headline. | token | `https://design-system.service.gov.uk/#releases` | "15 October 2026: We've released GOV.UK Frontend v6.6.0" | none — a published statement, nothing checks a consumer |
| G18-gov-02 | Versioning is driven by an external event (a brand refresh) and the response is *several versions*, so a consumer's pin is a decision. | behavior | `https://design-system.service.gov.uk/#releases` | "In June 2025, GOV.UK started to refresh the brand across its products and services. To support this, we've released several versions of GOV.UK Frontend to help teams update their services." | none |
| G18-gov-03 | The lifecycle begins with **trial status**, and the trigger is named: components that may not meet their own contribution criteria. | rule | `https://design-system.service.gov.uk/community/component-lifecycle-statuses/#trial` | "We use trial status when we release components (or variants of components) that might not meet all our contribution criteria." | none |
| G18-gov-04 | Trial has a **time bound and an exit condition**: six months, and no negative feedback. That is a rule with a clock, which is what our own gates are. | rule | `https://design-system.service.gov.uk/community/component-lifecycle-statuses/#trial` | "Components that have been in trial status for 6 months will move to stable status if we do not receive any negative feedback." | none |
| G18-gov-05 | Trial is not permanent: a component can be **deprecated at the end of the period** rather than promoted. | pattern | `https://design-system.service.gov.uk/community/component-lifecycle-statuses/#trial` | "become deprecated after the trial period" | none |
| G18-gov-06 | Deprecation has a *reason grammar*: things are dropped because they stop adapting to user needs, research and technologies — not because they look wrong. | rule | `https://design-system.service.gov.uk/community/component-lifecycle-statuses/#deprecation` | "deprecates components that do not adapt to evolving user needs, current research and technologies" | none |
| G18-gov-07 | A scale point can be **deprecated and removed at a named version**, which is a token that aged and its removal is dated. | token | `https://design-system.service.gov.uk/get-started/new-type-scale/#type-scale-changes` | "Deprecated as a scale point and removed in GOV.UK Frontend version 6.0.0 and later" | none |
| G18-gov-08 | The opt-in mechanism for that change was a **feature flag**, and the guidance is to delete the flag variable, not to migrate it. | token | `https://design-system.service.gov.uk/get-started/new-type-scale/#remove-the-govuk-new-typography-scale-feature-flag` | "The updated type scale was first introduced as an 'opt in' feature under a feature flag. You no longer need to use the $govuk-new-typography-scale Sass variable and should remove it." | none |
| G18-gov-09 | A single utility class carries its **own version floor** — the smallest possible version gate, stated in the component it belongs to. | token | `https://design-system.service.gov.uk/components/table/#responsive-tables` | "The CSS class govuk-table--small-text-until-tablet is only available in version 5.2 of GOV.UK Frontend and later." | none |
| G18-gov-10 | Colour is deliberately **not pinned**: taking the published palette means taking the newest one at every update. | rule | `https://design-system.service.gov.uk/styles/colour/#assign-colours-using-govuk-functional-colour` | "This means that your service will always use the most recent colour palette whenever you update." | none |
| G18-gov-11 | The flip side is stated as a cost: markup copied out of the docs is **hand-maintained** at every release. | behavior | `https://design-system.service.gov.uk/styles/page-template/#html` | "If you use HTML you'll need to update it manually when new versions are released." | none |
| G18-gov-12 | A pattern can be **renamed**, and the old page stays as a redirect-with-a-sentence rather than a 404 — governance leaves its own trace. | behavior | `https://design-system.service.gov.uk/patterns/task-list-pages/#this-page-has-been-archived` | "The task list pattern has been renamed to the Complete multiple tasks pattern and a new Task list component was published with updated guidance." | none — the 410 page itself is the artifact |

**Read against our system:**

1. **Their governance is the model ours already runs on, and ours is ahead of theirs on the
   mechanism.** Their rules are sentences with dates; ours are the same shape as *enforcement*:
   `check:decisions` fails on a `D###` citation with no entry, `check:figures` fails a measurement
   stamp older than 60 days, and ids are append-only. Nothing in this corpus ships a check; G18-gov-04
   ("6 months") is the closest thing to a clock any of the five states, and even that clock is prose.
2. G18-gov-10 and G18-gov-01 are the two rows that decide a thing about our palette: a system that
   refuses to pin a colour is only coherent if the consumer never writes the value down — which is why
   G1-color-05 ("Do not copy the specific hexadecimal (hex) colour values") is a *refusal of our own
   worst failure mode*, and ours already satisfies it (the palette is named, not borrowed).
3. G18-gov-07/08/09 are the version-gate family. Our analogue is the decision register: ids are never
   renumbered, and a superseded ruling points at its replacement. Where they gate a *class*, we gate a
   *claim* — `check:figures` refuses a number whose probe is older than 60 days, which is a stronger
   version of the same idea than a version floor on one CSS class.
4. G18-gov-12 is the transferable one, and it is the only honest use of a 410: an archived page names
   the replacement in its own body. Our equivalent is already a rule (a parked deferral names its
   trigger; a `paused` milestone row with no resume trigger fails the plan check). Recording that they
   do it in prose, and we do it in a gate, belongs in §3 `DIVERGENT-KEEP`, not in a gap.
