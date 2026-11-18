# Carbon — loading / empty / error states

Domain 15 of the fixed 18. Status: **EVIDENCED**.

Pages reached: `…/core/patterns/loading`, `…/core/patterns/empty-states`,
`…/core/patterns/dialogs`, `…/patterns/search`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C15-state-01 | A skeleton state is a *promise about what is coming*, and it is bounded: it appears only for a few seconds. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/loading#skeleton-states` | "They should only appear for only a few seconds, disappearing once components and content populate the page." | none |
| C15-state-02 | Skeletons are refused on action components and on overlays: "Never represent toast notifications, overflow menus, dropdown items, modals, and loaders with skeleton states." | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/loading#skeleton-states` | "Never represent toast notifications, overflow menus, dropdown items, modals, and loaders with skeleton states." | none |
| C15-state-03 | A loading indicator claims only "processing"; a progress indicator claims amount. The choice is made by duration. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/loading#loading-indicators` | "Unlike progress bars, loading indicators only signal that loading is occurring and do not give any indication of progress." | none |
| C15-state-04 | Full-screen vs inline is chosen by what is processing (the app, or one component), and full-screen pairs with a full-screen overlay. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/loading#full-screen-loading` | "If a user's action temporarily disables the application while processing occurs, use a loading indicator and a full-screen overlay." | none |
| C15-state-05 | Long jobs escalate channel, not size: past a few minutes, include a notification. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/loading#full-screen-loading` | "If the process is going to take more than a few minutes, consider including a notification." | none |
| C15-state-06 | Progressive loading has a defined first batch: skeleton containers, data text, non-data text — then images and interactions. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/loading#progressive-loading` | "The primary batch should show a page's basic structure (the skeleton state versions of the container-based components), data-based text … and non-data text." | none |
| C15-state-07 | Space reserved before load is stated geometrically: a 600 x 600 image may be a 600 x 600 area of white space until it loads. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/loading#progressive-loading` | "a 600 x 600px image can be shown as a 600 x 600px area of white space until the full image loads" | none |
| C15-state-08 | A "Load more" is a loading device and a pagination device at once, and it is the alternative to scrolling and fades. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/overflow-content#show-more-buttons` | "A \"Show more\" button is used in place of scrolling, gradients, or fades as they are more prominent and actionable." | none |
| C15-state-09 | The loading state is not allowed to look like the empty state by accident — it must read as the empty state *deliberately*, with helper text saying work is ongoing. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/search#include-a-loading-indicator` | "Your loading state should reflect your empty state with useful helper text signaling that the search is still ongoing." | none |
| C15-state-10 | A screen reader must be told when an app is loading, busy, stuck, or failed. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/loading#accessibility` | "A screen reader should notify a user if an application is loading, busy, gets stuck, or if a process fails." | none |
| C15-state-11 | Error copy has a formula in their words: explain why there is no data, then what the user can do, in plain language, no codes. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states#error-management-empty-states` | "Provide guidance about why there is no data, and either what the user can do to address the lack of data, or the circumstances under which the data would appear." | none |
| C15-state-12 | They name their own hole in this domain: "A pattern providing guidance for error states is currently being planned." | absence | `https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states#references` | "A pattern providing guidance for error states is currently being planned." | none — a system that prints its own gap |

**Read against our system:** our artifacts have an offline/platform notice (an empty state with an
action) and a schedule band that can legitimately be empty. C15-state-11 is the grammar our
`empty-states` skill states in prose; C15-state-01…03 and C15-state-10 are loading contracts nothing
in our tree says anything about — we have no loading artifact and no rule refusing one, so this domain
splits between **pre-loading** and one real gap: nothing on our side requires an empty state to name
its next step.
