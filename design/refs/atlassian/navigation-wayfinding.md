# Atlassian — navigation & wayfinding

Domain 13 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-components.txt` (Breadcrumbs and
BreadcrumbsItem, Tabs, Pagination components, the NavigationSystem package),
`https://atlassian.design/llms-a11y.txt#Skip-Links`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A13-nav-01 | A trail supplements navigation; it never replaces it. | rule | `https://atlassian.design/llms-components.txt#Breadcrumbs-component` | "Use for orientation; supplement main nav, do not replace it" | none |
| A13-nav-02 | The trail is ordered from the top of the hierarchy to where you are, and every step is a link. | pattern | `https://atlassian.design/llms-components.txt#Breadcrumbs-component` | "Hierarchy from top to current; each item is a link" | none |
| A13-nav-03 | Where the trail sits is stated against the page title — a typography/nav collision point. | behavior | `https://atlassian.design/llms-components.txt#Breadcrumbs-component` | "Place top left, above page title; use when user lands from external or on large/hierarchical sites" | none |
| A13-nav-04 | Density is bounded in the same sentence as the exception. | rule | `https://atlassian.design/llms-components.txt#Breadcrumbs-component` | "Do not overwhelm; in-app avoid topmost level unless sidebar is collapsed" | none |
| A13-nav-05 | The current item is not a link — the affordance changes with position. | pattern | `https://atlassian.design/llms-components.txt#BreadcrumbsItem-component` | "Use href for navigable items; omit href for the current page" | lint (prop type) |
| A13-nav-06 | The separator is decorative visually and silent for assistive tech; its contrast is still required. | rule | `https://atlassian.design/llms-components.txt#Breadcrumbs-component` | "Ensure separator contrast; separators are not announced to screen readers" | test (axe contrast) |
| A13-nav-07 | A collapsed trail is one item with a label that is a sentence. | pattern | `https://atlassian.design/llms-components.txt#Breadcrumbs-component` | "Collapsed state = single item (e.g. \"Show more breadcrumbs\")" | none |
| A13-nav-08 | A trail that is not the main nav declares itself, and the reason is assistive-tech noise. | rule | `https://atlassian.design/llms-components.txt#Breadcrumbs-component` | "Use isNavigation={false} when breadcrumbs are not main nav (e.g. search results) to reduce assistive tech noise" | lint (prop) |
| A13-nav-09 | Items are named by the page they point at. | rule | `https://atlassian.design/llms-components.txt#Breadcrumbs-component` | "Use page or section titles for items" | none |
| A13-nav-10 | A tab set is bounded by count and ordered consistently, stated twice. | rule | `https://atlassian.design/llms-components.txt#Tabs-component` | "Use consistent tab ordering and grouping" | none |
| A13-nav-11 | A skip link is a component of the navigation system, with two named targets. | pattern | `https://atlassian.design/llms-a11y.txt#Skip-Links` | "Skip to main content" | none |
| A13-nav-12 | Navigation lives inside landmark structure. | rule | `https://atlassian.design/llms-components.txt#Breadcrumbs-component` | "Use appropriate ARIA landmarks" | test (axe landmark rules) |

**Read against our system:** our nav is one printed band (`src/components/Navigation.astro`) with a
fixed set of labels, and DESIGN.md states nav width but no trail. Rows 05, 07, 09 answer the one
question our schedule pages raise and no artifact answers: **how a date that is "today" sits in a
list of dates** — theirs is the rule that the current item drops the link affordance and a collapsed
trail becomes one labelled item. Rows 01, 03 are `DIVERGENT-KEEP` candidates: our tree has no trail
to supplement, and adding one is a pre-loading decision (draft, not a ratification). Rows 06, 12 are
live gaps for the nav we do ship — a separator's contrast and the landmark structure of our band are
both unstated, and `check:contrast` measures paint, not separator semantics. Row 08 is a shape our
search-results page (if built) would need: declare when a list is not the main nav.
