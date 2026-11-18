# GOV.UK — loading, empty & error states

Domain 15 of the fixed 18. Status: **EVIDENCED for three failure page types; NO EVIDENCE for empty
data.** GOV.UK separates failure by *cause* — a 404 (the page does not exist), a 500 (something
unexpected broke), a 503 (the service was closed on purpose) — and gives each a page, a copy contract,
and a duration policy. It never treats the case of "no data yet".

Pages reached: `…/patterns/page-not-found-pages/`, `…/patterns/problem-with-the-service-pages/`,
`…/patterns/service-unavailable-pages/`, `…/components/button/` (the spinner sentence), site home.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G15-state-01 | Failure states are **named by HTTP class and by cause**, and the design answer is one page per class. | rule | `https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/#problem` | "Tell the user there is something wrong with the service. These are also known as 500 and internal server error pages." | none |
| G15-state-02 | One page serves all unexpected failures; a distinct page per cause is the defect. | rule | `https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/#when-to-use-it` | "Use this page when there is an unexpected problem with the service. Use the same page for all unexpected problems." | none |
| G15-state-03 | **Duration is a decision:** a brief fault stays a problem page; a lasting one closes the service and changes the page. | rule | `https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/#when-to-use-it` | "Only display the page for a short time. If a problem cannot be fixed quickly, close the service and use a Service unavailable page." | none |
| G15-state-04 | Deliberate closure is its own page type, with its own name in plain words. | rule | `https://design-system.service.gov.uk/patterns/service-unavailable-pages/#service-unavailable` | "Tell the user a service is unavailable on purpose. These are also known as 503 and shutter pages." | none |
| G15-state-05 | A closure page is a **placeholder with an update obligation**, written before the update is known. | behavior | `https://design-system.service.gov.uk/patterns/service-unavailable-pages/#how-to-use-it` | "Have a general page in case you need to close a service and do not have time to update the page. As soon as you know when the service will be available, update the page." | none |
| G15-state-06 | Absence of a page is a designed object with its own name and its own avoidance policy. | rule | `https://design-system.service.gov.uk/patterns/page-not-found-pages/#page-not-found` | "A page not found tells someone we cannot find the page they were trying to view. They are also known as 404 pages." | none |
| G15-state-07 | Route integrity is a duty across **every medium**, not only the site. | rule | `https://design-system.service.gov.uk/patterns/page-not-found-pages/#how-to-avoid-them` | "Make sure any web addresses in your service, letters, forms and on GOV.UK are for pages that exist or redirect to pages that exist." | none |
| G15-state-08 | A failure page must state what happened to the user's answers; the answers survive the failure. | behavior | `https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/#what-to-include` | "Store previously entered information for a reasonable amount of time so users can resume a journey with re-populated information when the service becomes available again." | none |
| G15-state-09 | Slow is not silent: give the user information about what is happening, before the control that can double-fire. | behavior | `https://design-system.service.gov.uk/components/button/#preventing-double-clicks` | "In the case of slow connections, aim to give the user information about what's happening, for example, by showing a loading spinner or a modal, before using data-prevent-double-click." | none |
| G15-state-10 | **Absence:** no empty-data state, no zero-result state, no skeleton or placeholder-for-absent-content exists in any fetched page. | absence | `https://design-system.service.gov.uk/#patterns` | "Help users complete common tasks like entering names and addresses, filling in forms and creating accounts." | none |
| G15-state-11 | A service-wide problem is announced *apart* from the failure page, by a notice, in a named colour, with a named reason. | pattern | `https://design-system.service.gov.uk/components/notification-banner/#neutral` | "Use a 'neutral' blue notification banner if the user needs to know about a problem with the service as a whole." | none |
| G15-state-12 | Even a component's own **archive page** is a designed object: it names the replacement and where the history lives. | behavior | `https://design-system.service.gov.uk/patterns/task-list-pages/#this-page-has-been-archived` | "You can also check for previous versions of this page in the UK Government Web Archive." | none |

**Read against our system — this is the domain where we are ahead on empty and they are ahead on
failure.**

- Ours owns the empty-data contract their corpus never reaches: "Missing content is a designed state,
  never a build failure" (DESIGN.md:403, operator ruling 2026-11-01), and the shipped version of it —
  "Zero upcoming events converts" (DESIGN.md:394) with the band converting "with its status word and
  dated line" (DESIGN.md:396). Row 10 is therefore the *system* that is behind, and it belongs in §3.
- Ours owns the loading contract too, and forbids their suggestion: loading is "one 24px
  `role="status"` line, no motion. No spinner, no skeleton" (DESIGN.md:400-401), justified by a
  measurement (the shipped skeleton material measured 1.05 fill / 1.18 edge = a rectangle pretending to
  be content). Row 09 allows a spinner; our rule forbids one. That is a `CONTESTED` row for §1 with our
  side carrying the evidence.
- Rows 03 and 05 are the halves our artifacts do not state, against a surface we ship today: the feed
  branch has an error state (DESIGN.md:417 requires it in server-rendered HTML) and a quiet-label retry
  (DESIGN.md:416), but nothing says **how long** a transient branch may be shown, or that a permanent
  closure changes the page's identity. Two detector candidates follow directly — a duration assertion on
  the transient branch (browser-class), and a copy assertion that a permanent failure must not read as a
  retry invitation (grep-class against a fixture).
