# Material — navigation & wayfinding (domain 13)

Domain 13 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for a direction vocabulary and a
component-selection rule, NOT evidenced for anything a web page can implement** — the owner page is
reachable only through the twin (`material.io/design/navigation/understanding-navigation.html`; the
`m2.material.io` path answers the 67,614 B shell), and `navigation/search.html` and
`navigation/navigation-transitions.html` were **not opened** (reason in `COVERAGE.md`). Where this file
says "platform-owned", that is the corpus's own words, not an inference about browsers.

Locator note: every row's locator is a URL printed in `COVERAGE.md`, which the checker accepts
(`https://material.io/…` is that page's twin-host row, reached 2026-11-18 at 7,394 digest bytes).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M13-nav-01 | Navigation is a **defined act**, and naming it is what makes the rest of the domain decidable. | pattern | `https://material.io/design/navigation/understanding-navigation.html#types-of-navigation` | "Navigation is the act of moving between screens of an app to complete tasks. ... It's enabled through several means: dedicated navigation components, embedding navigation behavior into content, and platform affordances." | none |
| M13-nav-02 | The set of directions is **closed at three**, and the directions are read off the information architecture, not off the screen. | rule | `https://material.io/design/navigation/understanding-navigation.html#navigational-directions` | "Based on your app's information architecture, a user can move in one of three navigational directions:" | none — the three are named in bold runs in a bullet list; nothing resolves them |
| M13-nav-03 | Lateral is **same-level** movement. | rule | `https://material.io/design/navigation/understanding-navigation.html#lateral-navigation` | "Lateral navigation refers to movement between screens at the same level of hierarchy." | none |
| M13-nav-04 | Forward is consecutive-level, sequential-flow, or **direct** movement, and it is embedded in content rather than in a component. | behavior | `https://material.io/design/navigation/understanding-navigation.html#forward-navigation` | "While lateral navigation uses dedicated navigation components, forward navigation is often embedded into a screen's content through a variety of components." | none |
| M13-nav-05 | A control advances a flow by **three of its own properties**, not by a class of control. | behavior | `https://material.io/design/navigation/understanding-navigation.html#methods-of-forward-navigation` | "Buttons can provide a clear affordance to advance in a flow through their label, placement, and visual emphasis." | none |
| M13-nav-06 | The component is chosen by **how many destinations there are**, and the answer differs per device. | rule | `https://material.io/design/navigation/understanding-navigation.html#destinations-and-hierarchy` | "Apps with two or more top-level destinations can provide lateral navigation through a navigation drawer, bottom navigation bar, or tabs." | none — the counts (5+, 3-5, 2+) are in a table beside the sentence; no gate reads them |
| M13-nav-07 | The drawer rung. | token | `https://material.io/design/navigation/understanding-navigation.html#destinations-and-hierarchy` | "Navigation drawers are appropriate for five or more top-level destinations, and can be used across device sizes for a consistent navigation experience." | none |
| M13-nav-08 | The bar rung is **mobile-only** and caps at five. | token | `https://material.io/design/navigation/understanding-navigation.html#destinations-and-hierarchy` | "Bottom navigation bars provide access to 3-5 top-level destinations on mobile devices." | none |
| M13-nav-09 | The tab rung opens at two and works at **any** level. | token | `https://material.io/design/navigation/understanding-navigation.html#destinations-and-hierarchy` | "Tabs can be used at any level of an app's hierarchy to present two or more peer sets of data across screen sizes." | none |
| M13-nav-10 | Reverse navigation has two forms, and one of them is a **promise about state**, not about a link. | behavior | `https://material.io/design/navigation/understanding-navigation.html#considerations` | "Return users to their prior screen position and state ... to speed up information recall and task resumption. ... Provide clear messaging if a screen's prior state is no longer available" | none — and the sentence's own example is a form cleared for privacy, i.e. their state promise is stated where a web page's is not |
| M13-nav-11 | Upward movement is required of every child screen, and its mechanism is **the platform's**. | rule | `https://material.io/design/navigation/understanding-navigation.html#upward-navigation` | "Upward navigation should be implemented for all child screens in an app and follow platform guidance. ... Platform conventions determine the exact behavior of reverse navigation within an app." | none — and the web form is named as an Android/web "Up action", a component this corpus never reaches |
| M13-nav-12 | **Absence:** search is named as an affordance and stated in one sentence, and no search page was reached; there is no rule here for what a site's own search does with no results. | absence | `https://material.io/design/navigation/understanding-navigation.html#methods-of-forward-navigation` | "Search allows users to quickly access screens anywhere within an app's information architecture." | none — `navigation/search.html` is in the 83-URL index but was not opened (`COVERAGE.md`); the empty-query contract this system does state lives in `loading-empty-error.md` under Best Match |

**Read against our system.** Ours has **four labels, one row, `flex-wrap: nowrap`, and no search**:
DESIGN.md's *"The nav is one row at every width, `flex-wrap: nowrap`, one type tier at every width"*
with the label set the mark plus `Dates`, `Chat` and `Ways in`, and the fit priced in pixels
(`node design/nav-fit.mjs --no-build` @measured 2026-11-14: the row needs 257 of 276 at the 320 floor).
The census run for this file (this session, @measured 2026-11-18, un-piped so the exit code is the grep's):
`grep -rlE '<input|<form|<select|<textarea|required=' src` → **no matches, exit 1**, and `grep -rn 'role="search"' src`
→ no matches. The word *search* appears in `src/` only in comments and metadata prose about **search engines**
(`Layout.astro`, `Footer.astro`, `index-rules.mjs`, `config.json`'s title/description slots) — so there is
no control here that answers a query, and rows 06–09 of this system's selection table have no surface to
land on today.

- Rows 01–05 are the vocabulary our system does not have and could use: our nav is one flat row of
  labels with no hierarchy in it (the site emits 6 routes and the row is already at 257 of 276 px),
  so *our* answer to "how many destinations" is the same shape as theirs — a count decides the component,
  and we are the 2-or-more rung by a measurement, not by choice. What transfers is the **refusal** in
  row 06: at four labels the row needed 280 of 276, and `flex-nowrap` means an overflow is a failed
  probe, not a wrap (DESIGN.md's fourth-label bullet, D117). Their number is a component rule; ours is
  the same rule priced.
- Row 10 is the strongest transferable sentence in this file: *"return users to their prior screen
  position and state"* and *"provide clear messaging if a screen's prior state is no longer available"*
  are the two halves of a **state promise** our site makes nowhere. Our nav's date chip (D311) is the
  only place we state a prior fact about the schedule, and `check:dated-surfaces` keeps it equal to the
  first date `/dates` prints — so we already have the messaging half for one fact and nothing for the
  rest.
- Row 11 is where they are **behind** us in the useful direction and ahead in the honest one: the
  mechanism is the platform's, and for a web page that platform is the browser's history, which we
  refuse to depend on. Our exit band (D307, `check:page-exit`: **6 built pages, 6 with the band**,
  at least two paths out) is the explicit, in-page version of their upward navigation — a fact, not
  a button.
- Row 12 is a `NO EVIDENCE`-adjacent cell: the search *affordance* is stated, the empty-result contract
  is on another page (`communication/empty-states.html`, in `loading-empty-error.md` row 12). Nothing
  here licenses a rule about a search we do not have.
