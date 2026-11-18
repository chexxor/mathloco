# Carbon — accessibility contract (names, roles, targets)

Domain 16 of the fixed 18. Status: **EVIDENCED**, with one recorded **NO EVIDENCE** inside it: their
pages name no minimum target size — grepping the 28 fetched pages for `touch target`, `tap target`,
`44px` returns nothing. The absence is the claim.

Pages reached: `…/foundations/accessibility`, `…/foundations/color/overview`,
`…/patterns/status-indicators`, `…/patterns/empty-states`, `…/patterns/search`,
`…/patterns/dialogs`, `…/components/breadcrumb/guidelines`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C16-a11y-01 | Their contract is a checklist with named standards: WCAG AA, Section 508, European standards. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/accessibility#carbon-and-accessibility` | "Carbon components follow the IBM Accessibility Checklist which is based on WCAG AA, Section 508, and European standards." | none — "checklist" here is a document, not a check |
| C16-a11y-02 | The bar is stated as sameness of experience, not as a score: "Give all users the same quality of experience". | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/accessibility#carbon-and-accessibility` | "Give all users the same quality of experience" | none |
| C16-a11y-03 | Contrast compliance is a property of the palette, not of the page: the themes are built to pass. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/accessibility#color-blind-users` | "Carbon color themes strive to comply with the WCAG 2.1 AA guidelines for contrast." | none |
| C16-a11y-04 | Contrast is justified by a demographic they name — vision degrades from about age 40, which is a very large group. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/accessibility#low-vision-users` | "Vision worsens gradually starting around age 40, and good contrast helps this very large demographic use your interface." | none |
| C16-a11y-05 | Reading order is a design requirement: the page must be read in a logical order by a screen reader. | behavior | `https://www.carbondesignsystem.com/building-blocks/foundations/accessibility#blind-users` | "Follow keyboard guidelines and test with a screen reader to ensure the page is read to the user in a logical order." | none |
| C16-a11y-06 | Status must never rely on color alone: at least two of color, shape, symbol, plus 3:1 against the page. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#relying-only-on-color-is-insufficient` | "status indicators should rely on at least two of the following elements: color, shape, or symbol." | none |
| C16-a11y-07 | Shape-only indicators must get outlines; symbol-bearing ones need not — the difference is stated. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#outlines` | "using outlines and pairing text with shape indicators is essential to enhance their accessibility, especially with lighter status colors such as orange and yellow in Carbon light themes." | none |
| C16-a11y-08 | Decorative images must be skipped, and the implementation is prescribed: empty `alt` preferred over `role="presentation"`. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states#accessibility` | "Web Content Accessibility Guidelines require that decorative images are given either an empty `alt` tag or their `role` is assigned `presentation`." | none |
| C16-a11y-09 | A form is an accessibility object: every text input needs a visible descriptive label, the form is wrapped in `<form>`, and requirements are announced before entering it. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#accessibility` | "A form must be wrapped in a `<form>` element." | none |
| C16-a11y-10 | Ordering is the top failure they name for screen-reader users: "The most significant challenge facing visually impaired users is form ordering." | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#accessibility` | "The most significant challenge facing visually impaired users is form ordering." | none |
| C16-a11y-11 | Timed dismissals are refused for critical messages (criterion 2.2.4) and noncritical notifications must be reducible (2.2.3). | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/notifications#accessibility` | "Users should be able to manage or limit noncritical notifications." | none |
| C16-a11y-12 | No minimum tap or target size appears in any page fetched — they scale their controls by density (24px extra-small menu rows upward) without ever stating a floor for a pointer. | absence | `https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines#height` | "Do match the height of the menu buttons and the menu" | none |

**Read against our system:** ours is stricter on two axes they leave open — a 24px minimum target and
44px at phone widths are numbers we hold and they do not state. Ours is *weaker* on C16-a11y-06/07:
no detector in our set requires a status signal to be carried by something other than colour, which
is the domain's only real gap against our artifacts.
