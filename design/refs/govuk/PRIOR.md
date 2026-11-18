# GOV.UK — PRIOR.md (quarantine)

Anything we know about the GOV.UK Design System **without a locator on a page fetched this session**
lives here. Everything in this file is marked `UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS`: it may
point at where to look, and it may not be quoted, counted, ranked, or cited in `GAP-ANALYSIS.md`.

| Item | Why it is here |
|---|---|
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the contents of any **Sass map** in `govuk-frontend` (the colour palette under `$palette`, the spacing map, the type-scale map) | The Frontend repo was not opened. Every colour and spacing number we carry is the one printed as prose or as a documented class/function on a fetched page; the compiled layer was not read and would not be the authority here anyway. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the **breakpoint variables** behind the responsive scales (`$govuk-page-width`, `$govuk-tablet-breakpoint`, `$govuk-mobile-breakpoint`) | The fetched pages state the *behaviour* ("the spacing for 'large screens' is used when the screen is wider than the tablet breakpoint") and, in one place, a 640px figure. The variable names and their values are in the Frontend source, which was not fetched. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the **Panel** and **Details** component pages | The interruption panel's *behaviour* is stated on the interruption-pages pattern page that was fetched. The Panel component page would add the variant's markup and its own change log, not a rule we lack. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the **Service Manual** (how to think about a service: design principles, clear language, task journeys) | That content lives on a different domain (`man.gov.uk`-family), is not one of the five sources, and was not fetched. Seven probes of `design-system.service.gov.uk/patterns/design-principles/` and friends all returned the same 44,108 B 404 page — so the sentence "GOV.UK says X about design principles" is not available here at all, and `COVERAGE.md` records that so nobody re-probes it. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — any **touch-target or hit-area number** for GOV.UK controls | Nothing in the 26 fetched pages states a target size. The absence is recorded as an absence (`controls-buttons.md`, `accessibility-contract.md`); a *rule* may exist on a page that was not fetched, and this line is where that possibility stays. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — any claim that GOV.UK passes an **accessibility audit** (AXE, DAF, Accessibilty Support team reports) | The fetched accessibility page states the strategy and the admission ("Using the GOV.UK Design System in a service does not immediately make that service accessible"); the audit reports themselves are linked, not fetched, and a passing audit would be someone else's claim on someone else's build. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the **`llms-full.txt`-equivalent**: whether a single machine-readable doc exists for the whole site | `llms.txt` answers 404 with the site's own 404 page (md5 `b6b9dda15581622b3a7742ada1470af1`, identical to a fresh probe of a path that has never existed). Whether such a file exists elsewhere is unknown from here. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the **`govuk-release` schedule** (whether a v6.7.0 exists after the fetched 15 October 2026 release) | The home page fetched today names v6.6.0. The change history pages were not fetched, so the release *lineage* is not carried — only the dated statement is. |

**Rule for anyone extending this file:** a line moves out of here only when it acquires a fetched
locator and a ≤40-word verbatim quote in the same commit.
