# Atlassian — iconography

Domain 7 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-components.txt` (Icon component, IconTile
component, the icon-button blocks inside `@atlaskit/button`, Lozenge component),
`https://atlassian.design/llms-tokens.txt`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A07-icon-01 | Icon size is a **closed two-step scale**, and the default is the larger step. | token | `https://atlassian.design/llms-components.txt#Icon-component` | "There are two icon sizes available: - `medium` - 16px. (default). - `small` - 12px." | lint (the `size` prop is typed to that enum) |
| A07-icon-02 | Consistency of icon style and size is stated as its own rule, separate from choosing the icon. | rule | `https://atlassian.design/llms-components.txt#Icon-component` | "Maintain consistent icon style and size" | none |
| A07-icon-03 | The step is chosen by context, and the doc never says which context takes which step. | pattern | `https://atlassian.design/llms-components.txt#Icon-component` | "Use appropriate icon sizes for different contexts" | none |
| A07-icon-04 | An icon must survive a screen reader, i.e. it ships with a label or it is decorative. | rule | `https://atlassian.design/llms-components.txt#Icon-component` | "Provide appropriate alt text or labels for icons" | test (axe missing-label violations) |
| A07-icon-05 | Decorative is a **setting**, not a code comment: an empty label marks it. | pattern | `https://atlassian.design/llms-components.txt#DateLabel-component` | "Set to `''` to mark the icon as decorative (when the label text alone is sufficient)." | lint (prop enum) |
| A07-icon-06 | The label's default is a contextual word per appearance — calendar, warning, danger — so severity travels in the name. | token | `https://atlassian.design/llms-components.txt#DateLabel-component` | "Defaults to a contextual string based on the `appearance`: - `neutral` → `'Calendar'` - `warning` → `'Warning'` - `danger` → `'Danger'`" | lint (prop default) |
| A07-icon-07 | Icon contrast is its own rule, separate from text contrast. | rule | `https://atlassian.design/llms-components.txt#Icon-component` | "Ensure sufficient color contrast for icon visibility" | test (`checkColorContrast`) |
| A07-icon-08 | Touch size of an icon is a **consideration, never a number** — the number is missing in the artifact. | rule | `https://atlassian.design/llms-components.txt#Icon-component` | "Consider icon size for touch targets" | none |
| A07-icon-09 | Filled versus outlined is a **status language**, with the default named. | rule | `https://atlassian.design/llms-components.txt#Lozenge-component` | "Don't overuse filled icons; use outlined icons as the default and filled icons only to signal critical or important status." | none |
| A07-icon-10 | An icon inside an action must be labelled when the action is critical. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Avoid using icons without labels in critical actions" | none |
| A07-icon-11 | Ambiguity is resolved with words, not with a second icon. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Use a link button with a text label when the icon alone would be ambiguous" | none |
| A07-icon-12 | An icon is not a container: no icon goes inside a tooltip. | rule | `https://atlassian.design/llms-components.txt#Tooltip-component` | "No interactive or visual content inside (no links/buttons/icons)—use Popup or Modal" | none |

**Read against our system:** `choose-icons` is one of our skills, so icon work is a known round here;
DESIGN.md and the skills do not state an icon *size* rule, an icon role, or a filled/outlined
language. Rows 01 and 09 are the two that would change our next icon round most: a two-step size
scale with a stated default, and a status language that puts meaning in the glyph weight rather than
in a hue — which is exactly the register our system already chose for severity (a notice's keyline
and word, no signal hue, D102). Row 06 is the same idea as our `-on-ink` twins: the accessible name
carries the meaning, so the paint never has to. Rows 08 and 03 are recorded as **behind us**: they
say "Consider…", our artifacts name 24px minimum target and 44px at phone widths, so their sentence
would fail nothing and ours fails a 23px tap. Row 12 answers a silence we have: nothing in our
artifacts says what may live inside a small affordance.
