# Material — loading, empty & error states (domain 15)

Domain 15 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for the empty state and for a
placeholder while content loads, NOT evidenced for an error page or an offline state** — and the
absence is measured against the index, not remembered: `communication/offline-states.html` and
`communication/data-formats.html` were **probed 2026-11-18 and returned no markdown** (recorded in
`COVERAGE.md`), and `m3.material.io/sitemap.xml` (721,312 B) is named-but-not-ingested. The corpus's
honest contribution to the error half is one sentence about an unavailable *action*.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M15-load-01 | An empty state is **defined by what the item cannot show**, not by a screen that happens to be blank. | rule | `https://m2.material.io/design/communication/empty-states.html#content` | "Empty states occur when an item's content can't be shown. ... For example, they can include a list without list items, or a search that returns no results." | none |
| M15-load-02 | The off cases are expected and get designed anyway, and the reason given is the reader's confusion. | rule | `https://m2.material.io/design/communication/empty-states.html#content` | "Although these states aren't typical, they should be designed to prevent confusion." | none |
| M15-load-03 | The minimum empty state is **two parts, one of them inert**. | pattern | `https://m2.material.io/design/communication/empty-states.html#displaying-an-empty-state` | "The most basic empty state consists of a non-interactive image and a text tagline." | none |
| M15-load-04 | A tagline that reads as a call to action is a defect, because the tagline cannot answer a tap. | rule | `https://m2.material.io/design/communication/empty-states.html#displaying-an-empty-state` | "Don't use a tagline worded like a call to action, as empty tags aren't interactive and don't respond when tapped." | none — the refusal is prose under a Don't label; nothing tests a tagline's interactivity |
| M15-load-05 | The tagline must convey the screen's purpose **without appearing actionable**, which is the same sentence as row 04 from the other side. | rule | `https://m2.material.io/design/communication/empty-states.html#displaying-an-empty-state` | "Conveys the purpose of the screen, without appearing actionable" | none |
| M15-load-06 | Starter content is an alternative to empty, and it is owned by the user from the first minute. | behavior | `https://m2.material.io/design/communication/empty-states.html#starter-content` | "screens which would otherwise be empty can be populated with starter content. ... Give users the ability to delete and replace starter content." | none |
| M15-load-07 | Educational content must be **dismissable and brief**, and it is refused as an onboarding surface. | rule | `https://m2.material.io/design/communication/empty-states.html#educational-content` | "Make it possible to dismiss or skip this content. ... This should not be a place to onboard the user to the entire app." | none |
| M15-load-08 | A near miss is answered with the **best match**, in the open, and the mechanism is a re-spelled query. | behavior | `https://m2.material.io/design/communication/empty-states.html#best-match` | "If nothing exactly matches a user's query, content that contains the best match to the query can be displayed, by returning results for a query spelled slightly differently." | none |
| M15-load-09 | A loading state is **a place for brand**, and its job is stated as reassurance: you are still in this app. | behavior | `https://m2.material.io/design/color/color-usage.html#brand` | "A placeholder UI is displayed while screen content loads. ... Including a brand color here assures users that they are still in the app as it loads." | none |
| M15-load-10 | A progress indicator ties the function of the app to the brand — the same reassurance on a different surface. | pattern | `https://m2.material.io/design/color/color-usage.html#brand` | "Progress indicators are a subtle but powerful place to incorporate brand color, as they tie the function of the app to the brand." | none |
| M15-load-11 | An empty chart states **what to expect** when data arrives, and it may be animated. | pattern | `https://m2.material.io/design/communication/data-visualization.html#empty-states` | "Empty graphs and charts can display content that suggests what to expect when data is available. ... Characterful animations enhance an otherwise empty graph." | none |
| M15-load-12 | **Absence:** this system has no error page and no offline state. The nearest statement is about an action that is not available, and the fix named is to remove the thing rather than explain the failure. | absence | `https://m2.material.io/design/interaction/states.html#fab` | "If the action represented in the FAB is unavailable, the FAB should not appear in the composition." | none — and `communication/offline-states.html` was probed and returned no markdown (`COVERAGE.md`), so nothing may be claimed about what an offline screen looks like |

**Read against our system.** Ours states all three of these as designed states with numbers and gates
(DESIGN.md's "States: empty, loading, failed" section): *"**Zero upcoming events converts.** It is not a
sentence (104px, nothing to press) and it is never hidden (47px)"*, *"**Loading is one 24px
`role="status"` line, no motion.** No spinner, no skeleton (the shipped skeleton material measures 1.05
fill / 1.18 edge = a rectangle pretending to be content). Reserve the height so the page does not jump
when content lands."*, and *"**Missing content is a designed state, never a build failure**"*.

- Rows 01–02 are the same rule we hold with a detector: `check:content` refuses a build that ships the
  retired hard-coded strings or a bracketed placeholder, and `check:render` measures every
  `role="status"`/`role="alert"` block in the built page and fails on a fill, an inset other than 1px,
  a keyline under the 3.0 graphic bar, text under 4.5, or a block under 48px. Theirs is a sentence about
  confusion; ours is the sentence plus the measurement that makes confusion a build failure.
- Rows 03–05 are the closest thing in this corpus to our own notice grammar, and they disagree with it in
  a way worth reading: theirs is an **image plus an inert tagline**; ours is a word plus a keyline and a
  pressable primary (a 48px block plus a second path out), because our empty state is a *decision point*
  for a visitor deciding whether to come to a meeting, not a gallery with nothing in it. Their refusal —
  a tagline must not read as a call to action — is the reason our empty state ships a real control rather
  than a sentence styled like one (D139's "It is not a sentence (104px, nothing to press)").
- Rows 06–08 are the transferable grain and the cheapest: **the alternative to empty must be dismissable,
  and it must not be onboarding.** Our site has no starter content, but it has the same refusal in the
  other direction — DESIGN.md's *"Name a gap the site cannot fill, in the open"* with its three shipped
  sentences — DESIGN.md's *"There is no syllabus, no reading list to keep up with, and no current focus."* — which is an
  empty state stated in prose with no control at all. Row 08's best-match mechanism has no counterpart in
  our product (no search control; the census in `navigation-wayfinding.md`).
- Rows 09–10 are **not** worth taking: our system refuses a coloured fill as a state (every shipped state
  fill measures 1.05–1.18 = flat) and has no signal hue, so a brand-coloured placeholder is a defect here
  by D102. Recorded so a future round does not re-argue it.
- Row 11 is the one number-free idea our system does hold but has no surface for: our schedule's empty
  state converts with a status word and a dated line, i.e. it states what to expect, and it does so without
  motion — theirs buys it with an animation, which our motion grammar forbids (no tier above 250ms, no
  `@keyframes` in live `src/`).
- Row 12 is the finding that makes our failure branch better than anything in this corpus: ours is *"Failure
  is the notice above with a retry"*, the retry is a quiet label inside one boundary, and *"The pending
  sentence is also the JavaScript-off state"*, which is how the error branch gets into server-rendered HTML
  at all. Nothing here reaches that: their answer to an unavailable thing is to hide it, and hiding a failed
  fetch is exactly the defect class D364's byte-census rule exists to keep out of the report.
