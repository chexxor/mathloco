# Carbon — iconography

Domain 7 of the fixed 18. Status: **PARTIAL** — and the partiality is a doc-structure finding worth
keeping: `/building-blocks/foundations/icons` **redirects to `/icons/library`**, a 12,883,692-byte
catalogue of icon names (145,887 bytes of text) with no usage prose in the fetched document. So every
icon *rule* quoted here comes from a page that quotes one, not from the icons page. The overview
prose the entry point promises was not reachable by curl from this rig.

Pages reached: `…/patterns/status-indicators`, `…/components/button/guidelines`,
`…/components/tooltip/guidelines`, `…/foundations/icons` (→ `/icons/library`).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C7-icon-01 | An icon is a symbol for an idea, object or action, and its job is named: communicate fast, invite interactivity, draw attention. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#status-symbols` | "Icons are visual symbols that represent ideas, objects, or actions. They help communicate messages quickly, encourage interactivity, and highlight important information—like exclamation points for warnings, checkmarks for success, and question marks for help." | none |
| C7-icon-02 | Their icon set is deliberately narrow: only the widely recognized symbols ship in the library. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#status-symbols` | "To keep icons consistent across IBM products, we've included only the most widely recognized symbols in the icon library." | none |
| C7-icon-03 | A specific icon is reserved for a specific meaning (launch = new tab), and the destination must be legible in the label as well. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#content` | "The launch icon should be used on any call to action that launches the user into another tab" | none |
| C7-icon-04 | Icon-only controls must be named: an icon button's tooltip is a one- or two-word description of its function. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/tooltip/guidelines#text` | "Tooltips for icon-only components, like icon buttons, should provide a concise one- or two-word description of the button's function." | none — but the tooltip ships inside the component, which is why they say it |
| C7-icon-05 | The system pre-decides it for common components: most icon-bearing components already carry a tooltip, so adding one is a customization they do not recommend. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/tooltip/guidelines#when-to-use` | "By default, most components such as icon buttons, icon tabs, sliders, and copy buttons already have built-in tooltips, so there's no need to add one separately." | component CSS ships it |
| C7-icon-06 | A status icon may stand alone only if it clears non-text contrast; pairing it with a label is the recommended default. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#relying-only-on-color-is-insufficient` | "While icons alone can be effective if they meet non-text contrast requirements (3:1 contrast), pairing each icon with a label ensures that all users, including those with visual impairments, can understand the status at a glance." | none |
| C7-icon-07 | Decorative iconography is an accessibility instruction, not a style instruction: a decorative image carries no information and gets an empty `alt`. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states#accessibility` | "A decorative image is one that does not serve any practical or informational purpose, and is included to fill a visual void." | none |
| C7-icon-08 | Icon *semantics* changed at a documented scale, as a versioning event: about 150 icons became over 1600. | behavior | `https://www.carbondesignsystem.com/getting-started/migrating/guide/overview#changes-to-icons` | "we went from supporting around 150 icons to over 1600 as a result" | none — the migration guide is the governance record |

**Read against our system:** we have a platform-mark home (`src/lib/platform-marks.mjs`) and a
`choose-icons` skill; their C7-icon-02 (a deliberately small, recognizable set) and C7-icon-06 (an
icon may not carry meaning by colour alone) are the two rules our icon set has no stated equivalent
for. C7-icon-07 is the shape of a rule our `check:alt` already holds — worth naming as a `MATCH`.
