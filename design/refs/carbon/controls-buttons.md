# Carbon — controls & buttons

Domain 9 of the fixed 18. Status: **EVIDENCED**.

Pages reached: `…/components/button/guidelines`, `…/components/menu/guidelines`,
`…/patterns/disabled-states`, `…/components/modal/guidelines`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C9-btn-01 | A button's label is the button: it must state the action. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#button-label` | "Button labels should clearly indicate the action of the button." | none |
| C9-btn-02 | Label grammar is specified as a formula, with named exceptions. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#button-label` | "To provide enough context, use the {verb} + {noun} content formula on buttons except in the case of common actions like \"Done\", \"Close\", \"Cancel\", \"Add\", or \"Delete\"." | none |
| C9-btn-03 | Alignment is decided even when there is room: label is left-aligned, never centered, "even if the button is wide". | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#label-alignment` | "Do not center align the label in a button, even if the button is wide." | none |
| C9-btn-04 | Seven sizes, and each one's use case is a pairing rule rather than a size preference: small pairs with 32px input fields, medium with 40px. | token | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#button-sizes` | "Use when buttons are paired with 40px medium sized input fields." | none |
| C9-btn-05 | Mixing sizes inside a group is refused. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#button-sizes` | "We do not recommend mixing different button sizes in button groups." | none |
| C9-btn-06 | Emphasis is a hierarchy rule with a numeric budget: one high-emphasis button per layout. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#a-single-high-emphasis-button` | "As a general rule, a layout should contain a single high-emphasis button that makes it clear that other buttons have less importance in the hierarchy." | none |
| C9-btn-07 | Two high-emphasis buttons in one group is the named failure. | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#multiple-button-emphasis` | "Do not use two high-emphasis buttons in a button group." | none |
| C9-btn-08 | A secondary button's job is the negative action of the primary: "the secondary button executes the set's negative action, like 'Cancel' or 'Back.'" | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#secondary-button` | "When used in a pair, the secondary button executes the set's negative action, like \"Cancel\" or \"Back.\"" | none |
| C9-btn-09 | Not every page has a primary action, and the test is stated: if the page's purpose is to be read or interacted with, use the lower buttons. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#not-every-page-needs-a-primary-button` | "Sometimes the primary purpose of the page is to interact with other components or read over content, rather than to trigger an action." | none |
| C9-btn-10 | Disabled is defined by dependency and returns by itself: "In a temporarily disabled scenario the component should never fully disappear from the user's view." | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/disabled-states#default-disabled` | "In a temporarily disabled scenario the component should never fully disappear from the user's view." | none |
| C9-btn-11 | The disabled style is a published number set: 50% opacity component, 25% opacity text, no hover change, `not-allowed` cursor. | token | `https://www.carbondesignsystem.com/building-blocks/core/patterns/disabled-states#style` | "Default disabled states are most commonly styled by a decrease in opacity with no hover state change and `not-allowed` cursor applied." | none |
| C9-btn-12 | A disabled control is worth announcing when it gates the flow: an inline warning that says how to re-enable it. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/disabled-states#additional-warning` | "The notification should describe how the user can enable or re-enable the disabled component." | none |

**Read against our system:** our controls are **derived** (`height = ceil4(line box) + 2 × S3 pad`,
48px pressable blocks, 24px minimum target) — theirs are **chosen from a scale**, so the comparison is
`DIVERGENT-KEEP` on size. What has no analogue on our side at all is C9-btn-06/07: an **emphasis
budget per screen**, which is the same shape as our "one display step per screen" rule but for actions
rather than type.
