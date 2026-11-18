# GOV.UK — feedback/notices & status

Domain 11 of the fixed 18. Status: **EVIDENCED, with a placement rule and a severity refusal.** This is
the domain where our system already has a grammar (a notice's keyline and word carry severity, D102) and
GOV.UK has a *queue*: which message gets a banner, where the banner sits, how many are allowed, and what
a banner may never be used for.

Pages reached: `…/components/notification-banner/` (90,684 B), `…/patterns/confirmation-pages/` (66,603 B),
`…/patterns/problem-with-the-service-pages/` (98,767 B), `…/patterns/check-answers/` (95,989 B),
`…/components/error-summary/`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G11-notice-01 | A notice is defined by *irrelevance to the page*: it is for what the user needs to know that is not about this task. | rule | `https://design-system.service.gov.uk/components/notification-banner/#why-this-component-cannot-be-used-as-an-error-banner` | "Use a notification banner to tell the user about something they need to know about, but that's not directly related to the page content." | none |
| G11-notice-02 | Banners are scarce **on evidence**, and the evidence is a failure mode: people often miss them. | rule | `https://design-system.service.gov.uk/components/notification-banner/#sparingly` | "Use notification banners sparingly. There's evidence that people often miss them, and using them too often is likely to make this problem worse." | none |
| G11-notice-04 | A notice is **page-width-matched**: its width is the text's width, not the viewport's. | pattern | `https://design-system.service.gov.uk/components/notification-banner/#placement` | "The notification banner should be the same width as the page's other content, such as components, headings and body text." | none |
| G11-notice-05 | One banner per page; combining is the default, and when they cannot combine, priority decides which survives. | rule | `https://design-system.service.gov.uk/components/notification-banner/#number-of-banners` | "Avoid showing more than one notification banner on the same page. Instead, combine the messages in a single notification banner. If the messages are too different to combine, only show the highest priority notification banner." | none |
| G11-notice-06 | **A banner may never be a validation error** — the state vocabulary is exclusive, and the alternative is named. | rule | `https://design-system.service.gov.uk/components/notification-banner/#relationship-to-error-summary` | "use an Error message component and Error summary component instead" | none |
| G11-notice-07 | A service-wide problem gets a named colour *and* a named reason, in one sentence. | pattern | `https://design-system.service.gov.uk/components/notification-banner/#neutral` | "Use a 'neutral' blue notification banner if the user needs to know about a problem with the service as a whole." | none |
| G11-notice-08 | A notice may report the outcome of a **previous page**, which is the only cross-page feedback they name. | pattern | `https://design-system.service.gov.uk/components/notification-banner/#why-this-component-cannot-be-used-as-an-error-banner` | "telling the user about the outcome of something they've just done on a previous page (for example, confirming that an email has been sent)" | none |
| G11-notice-09 | Completion is a sentence plus the next thing to expect; the reassurance and the locator are one object. | rule | `https://design-system.service.gov.uk/patterns/confirmation-pages/#confirmation-pages` | "Confirmation pages reassure users that they have completed a transaction and helps them understand what to expect next." | none |
| G11-notice-10 | A completion page is a **keepable artifact**: people bookmark it as a receipt, and the return must be handled. | behavior | `https://design-system.service.gov.uk/patterns/confirmation-pages/#returning` | "Some users will bookmark the confirmation page as a form of receipt. You should allow them to return to the page, whenever possible." | none |
| G11-notice-11 | Inside a coloured completion panel, interactive elements are declared **inaccessible by default**, with the threshold to clear. | rule | `https://design-system.service.gov.uk/patterns/confirmation-pages/#the-green-confirmation-panel` | "If you choose to add links, buttons or other interactive elements in the green confirmation panel, they will not be accessible." | none |
| G11-notice-13 | Failure has a **duration policy**: a brief fault is a problem page, a lasting one closes the service. | rule | `https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/#when-to-use-it` | "Only display the page for a short time." | none |
| G11-notice-14 | A failure page must state what happened to the user's answers, and the answers must survive the outage. | behavior | `https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/#what-to-include` | "Store previously entered information for a reasonable amount of time so users can resume a journey with re-populated information when the service becomes available again." | none |

**Read against our system — and this is a domain where we are *ahead* on the state and behind on the
queue.** Ours already has the notice grammar that their rules would otherwise force: severity is
carried by the notice's keyline and word (DESIGN.md:58, D102 — "the system has no red and no amber, and
severity is carried by the notice's keyline and word"), and the shipped notice is a named object
(DESIGN.md:400: "It is the notice grammar (`inset-shadow-rule`, no fill, word `ink`, body `ink-2`, meta
`ink-3`)"). Rows 01/06/09 are therefore `DIVERGENT-KEEP`: we reach the same exclusions by construction
rather than by rule.

Four live gap candidates, all detector-shaped:

- **Row 05** (one notice per page, priority decides) has no analogue in our artifacts. Our system can
  already *build* two notices on the schedule band, and nothing fails that. Detector: count notice
  roots per rendered band, fail above one; selftest plants a second notice beside the first.
- **Row 04** (width matched to the text) is checkable in the browser set we already run, against the
  measure cap we already own.
- **Rows 13/14** (failure duration and answer survival) map onto the failure state we ship for the
  feeds — the retry-as-quiet-label rule (DESIGN.md:416) is the same register; what is missing is any
  statement of *how long* a transient branch may show, which is a `GAP` against a timer, not against
  paint.
- **Row 10** (a keepable completion) is the finding worth carrying about our own site: a page whose
  content changes with the feed is bookmarkable and silently stale. GOV.UK's answer is "handle the
  return"; our artifacts answer the same problem elsewhere with a dated line (DESIGN.md:396: "with its
  status word and dated line"). That pair is §4 material — steal the *act*, not the sentence.

**Pruned to 12 claims per table (the cap), with the reason:** `G11-notice-03` answers the same question as `G11-notice-01` from the other side; `G11-notice-12` is the submit-copy rule that `controls-buttons.md` carries as `G9-btn-01`; `G11-notice-15` is the check-answers structure that `navigation-wayfinding.md` carries.
