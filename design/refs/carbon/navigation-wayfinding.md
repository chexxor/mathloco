# Carbon — navigation & wayfinding

Domain 13 of the fixed 18. Status: **EVIDENCED**.

Pages reached: `…/components/breadcrumb/guidelines`, `…/components/menu/guidelines`,
`…/patterns/search`, `…/patterns/overflow-content`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C13-nav-01 | Breadcrumbs answer "where am I in the hierarchy" and are always secondary; they never replace primary navigation. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/breadcrumb/guidelines#when-not-to-use` | "Breadcrumbs are always treated as secondary and should never entirely replace the primary navigation." | none |
| C13-nav-02 | Its trigger is structural: hierarchy of more than two levels. Below that it is clutter. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/breadcrumb/guidelines#when-to-use` | "Breadcrumbs are effective in products and experiences that have a large amount of content organized in a hierarchy of more than two levels." | none |
| C13-nav-03 | A multistep process is a different artifact: use a progress indicator instead of a breadcrumb. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/breadcrumb/guidelines#when-not-to-use` | "If you are taking users through a multistep process use a progress indicator instead." | none |
| C13-nav-04 | Placement is fixed: top-left, under the header and navigation, above the page title. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/breadcrumb/guidelines#placement` | "Breadcrumbs are placed in the top left portion of the page." | none |
| C13-nav-05 | Current page is excluded by default, and if included it is last and inert. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/breadcrumb/guidelines#page-link` | "If the current page is included in a breadcrumb trail, it is always the last text listed and is not an interactive link." | none |
| C13-nav-06 | Overflow has a fixed policy: keep first and last two, fold the middle into an overflow menu, and never wrap. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/breadcrumb/guidelines#overflow-content` | "Breadcrumbs should never wrap onto a second line." | none |
| C13-nav-07 | Menu order is a rule with two forces: meaningful sequence (order of operations) and most-used-first. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines#ordering-and-grouping` | "To aid discoverability, arrange menu items in a meaningful sequence that aligns with the order of operations." | none |
| C13-nav-08 | Menu length has numbers attached: no more than 12 items in an overflow/context menu, under 5 in a menu button. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines#number-of-items-within-a-menu` | "keep the list length manageable by including no more than 12 items to help users scan through items easily without having to scroll." | none |
| C13-nav-09 | Grouping is triggered by volume and drawn with divider lines. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines#ordering-and-grouping` | "When there is a significant amount of menu items, it's advisable to group them into sections, separated by divider lines." | none |
| C13-nav-10 | Nesting depth is refused: multiple levels of submenus make the experience harder to navigate. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines#submenus` | "Avoid multiple levels of nesting when it comes to submenus." | none |
| C13-nav-11 | A repeated word across sibling items is a signal to restructure, not to repeat: if a term appears in more than two items, drop it from the item label. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines#actions-associated-with-a-shared-label` | "When a term appears in more than two menu items in the same group, consider eliminating the recurring term in the submenu label" | none |
| C13-nav-12 | A truncated label may not stand alone: ellipsis truncation requires an overflow menu on hover instead of a browser tooltip. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/overflow-content#ellipses-alone` | "This type of truncation requires an overflow menu on hover instead of a browser tooltip." | none |

**Read against our system:** our nav is one screen with a fixed set of bands, so C13-nav-01…06 are
mostly **pre-loading decisions before we build it** (there is no hierarchy to breadcrumb). The two
that are not: C13-nav-08 (an explicit item budget — our nav band has no cap stated anywhere) and
C13-nav-12 (truncation without a way to get the rest), which our side currently has no rule against.
