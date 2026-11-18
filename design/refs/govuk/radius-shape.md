# GOV.UK — radius & shape

Domain 4 of the fixed 18. Status: **NO EVIDENCE for a corner scale; the only radius statement in
26 fetched pages is one sentence about illustrations.** GOV.UK Frontend ships rounded corners in its
compiled CSS, but the Design System site never states a radius scale, never names a radius role, and
never says when to use which corner. Recorded as the absence of coverage, not as a refusal.

Probe that establishes the absence (run across every fetched body digest this session):
`grep -inE 'radius|corner' design-tmp/body/govuk-*.txt` → **one** hit, the sentence quoted below.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G4-shape-01 | Shape consistency is required **between illustrations**, which is the only place their corpus speaks about corners at all. | rule | `https://design-system.service.gov.uk/styles/images/#illustration` | "If you're creating multiple illustrations for a service, use consistent colours, line widths and border radiuses across them all." | none |
| G4-shape-02 | Corners are treated as an illustration property, not a UI property — the UI surface has no shape vocabulary. | absence | `https://design-system.service.gov.uk/styles/images/#illustration` | "border radiuses" | none |
| G4-shape-03 | No radius role, no radius scale, no pill/circle rule appears in any fetched page, including the component pages that would carry one (button, table, panel-adjacent patterns). | absence | `https://design-system.service.gov.uk/components/button/` | "Use the button component to help users carry out an action like starting an application or saving their information." | none |
| G4-shape-04 | Their visual language is deliberately flat: no shadow vocabulary and no corner vocabulary, so depth is expressed with colour alone. | pattern | `https://design-system.service.gov.uk/styles/images/#illustration` | "Use flat blocks of colour." | none |

**Read against our system:** our radius is one base (6px, two roles, no pill), so on the question
"how round is a box" this system is simply **silent** — it cannot corroborate, contradict, or
compete with our ruling, and nothing here may be cited in `GAP-ANALYSIS.md` as a radius recommendation.
Row 01 is still the transferable idea, one floor up: **consistency across a family of objects** is
their rule, and that is the same idea our `check:radius` would need if we ever shipped more than two
roles — today the second role is unused, so the detector has nothing to fail.

The one honest use of this domain in the gap analysis is as evidence that a *missing* shape vocabulary
is survivable: GOV.UK ships a public, accessible, government service with no stated corner scale and
no detector for one. Whether that is a virtue or an absence of coverage is not answered here, and any
row about it must say so.
