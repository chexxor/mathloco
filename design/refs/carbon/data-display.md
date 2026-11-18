# Carbon — data display (tables, lists, empty states)

Domain 12 of the fixed 18. Status: **EVIDENCED**.

Pages reached: `…/components/data-table/guidelines`, `…/patterns/empty-states`,
`…/patterns/search`, `…/patterns/loading`, `…/components/breadcrumb/guidelines`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C12-data-01 | Row height is a density decision with a named trigger at each step; medium is the default "when no specific density or spacing requirements exist". | token | `https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines#header-and-row-height` | "Use as the default and most commonly used size. Use when no specific density or spacing requirements exist." | none |
| C12-data-02 | Every band of a table matches the row height — header, toolbar, batch bar, pagination — and the exception is published. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines#pagination-height` | "The pagination height should always match the row height of the data table to maintain visual alignment and consistency." | none |
| C12-data-03 | Extra-large rows are justified by content, not by preference: only when data is expected to run two lines deep. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines#header-and-row-height` | "Extra large row heights are only recommended if your data is expected to have 2 lines of content in a single row." | none |
| C12-data-04 | Alignment across a layout is held by consistent component sizes, and mixing row heights is the named failure. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines#header-and-row-height` | "Don't mix row heights for the table and header rows." | none |
| C12-data-05 | A table's columns need a gutter mode chosen per density (wide, narrow, condensed), and it warns against blending into neighbours. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines#placement` | "care should be taken to avoid any unintentional relationships with other UI elements." | none |
| C12-data-06 | Zebra striping exists but only as a variant, not as a default. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines#anatomy` | "Rows can be selectable, expandable, and modified to show alternating zebra stripe background colors." | none |
| C12-data-07 | An empty state explains **what will be there**, then gives the one next step. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states#no-data-empty-states` | "Be specific about what will be available in the space when data is there." | none |
| C12-data-08 | One action per empty state, chosen by importance: "Don't cover multiple options in one empty state." | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states#dont` | "Don't cover multiple options in one empty state. If there are multiple things a user can do, pick the most important and keep the focus on that action." | none |
| C12-data-09 | An empty state never ends the road: "As a general rule, don't lead the user into a dead end." | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states#dont` | "As a general rule, don't lead the user into a dead end. If there are useful next steps, include them." | none |
| C12-data-10 | Empty states have three named kinds — no data, user action, error management — and the third has its own contract (why, plus what the user can do, in plain language, no codes). | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states#error-management-empty-states` | "Error messages should be expressed in plain language (no codes), precisely indicate the problem, and constructively suggest a solution." | none |
| C12-data-11 | A zero-result search is not a special case: the count is always shown, including zero. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/search#display-the-number-of-results` | "Always include the number of search results, including for searches with no results." | none |
| C12-data-12 | The loading state must look like the empty state on the way to being the filled state: "Your loading state should reflect your empty state with useful helper text signaling that the search is still ongoing." | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/search#include-a-loading-indicator` | "Your loading state should reflect your empty state with useful helper text signaling that the search is still ongoing." | none |

**Read against our system:** the schedule page is a list-with-dense-geometry artifact (`check:row-geometry`
exists on our side), so C12-data-02/03/04 belong to the §1 contradicted table more than to gaps.
C12-data-07…09 are an empty-state grammar our `empty-states` skill holds in prose and no gate holds
in code — the gap in this domain is the **detector**, not the rule.
