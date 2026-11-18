# Atlassian — typography & measure

Domain 2 of the fixed 18. Status: **EVIDENCED** (and one recorded **absence**).

Artifacts reached: `https://atlassian.design/llms-tokens.txt#Typography`,
`https://atlassian.design/llms-a11y.txt#Typography-and-Readability`,
`https://atlassian.design/llms-content.txt`,
`https://atlassian.design/components/empty-state/usage`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A02-type-01 | Type size is **not a token**. The size, line height and weight ship as one shorthand token. | token | `https://atlassian.design/llms-tokens.txt#Font` | "There are no font size tokens; font size can only be modified via the `font` shorthand property." | lint (closed token set refuses a bare size) |
| A02-type-02 | Each size carries the **thing it is for**, in page terms: heading large is "Page titles", heading xxlarge is "Brand promotions". | token | `https://atlassian.design/llms-tokens.txt#Font` | "font.heading.large \| Page titles" | lint (name set); none for the *choice* |
| A02-type-03 | A scale step doubles as a role, and the roles are named by **use on the page**, not by ratio. | pattern | `https://atlassian.design/llms-tokens.txt#Font` | "font.body.small \| Secondary content" | none |
| A02-type-04 | Prefer the component over the token: text should be a `Text` primitive or a `Heading` component. | rule | `https://atlassian.design/llms-tokens.txt#Typography` | "Please prefer using the `Text` primitive or `Heading` component directly." | lint (props contract on native components) |
| A02-type-05 | Two floors exist for body text, and one of them is a warning about where it may be used. | rule | `https://atlassian.design/llms-a11y.txt#Typography-and-Readability` | "Use `font.body.small` sparingly (minimum 14px)" | none (a bullet; the contrast test does not read size) |
| A02-type-06 | Leading belongs to the role, not to the line: "at least 1.5" is stated for readability, and it is not a token. | rule | `https://atlassian.design/llms-a11y.txt#Typography-and-Readability` | "Maintain line height of at least 1.5 for readability" | none |
| A02-type-07 | Emphasis is a **weight token**, and each weight names its context: medium is for text with icons, semibold for emphasized text. | token | `https://atlassian.design/llms-tokens.txt#Font-Weights` | "font.weight.semibold \| 600 \| Emphasized text" | lint |
| A02-type-08 | Typeface is a role too, and brand typefaces are separate roles from UI typefaces. | token | `https://atlassian.design/llms-tokens.txt#Font-Family` | "font.family.brand.heading \| Brand headings" | lint |
| A02-type-09 | Heading hierarchy is a structural requirement, stated where the component ships. | rule | `https://atlassian.design/llms-a11y.txt#Typography-and-Readability` | "Use `Heading` component for proper heading hierarchy" | test (axe heading-level violations) |
| A02-type-10 | A notice's own heading level is a prop, and the hierarchy must survive being nested. | behavior | `https://atlassian.design/llms-components.txt#@atlaskit/flag-Package` | "Use h2 for title via `headingLevel` prop; maintain heading hierarchy" | none |
| A02-type-11 | Case is a rule, stated twice in two documents. | rule | `https://atlassian.design/components/empty-state/usage#Content-guidelines` | "Always use sentence case for titles and headings." | none |
| A02-type-12 | **Absence:** no line length, measure, or characters-per-line rule exists in any fetched artifact; the only length bound printed is in lines of a message, and it is per message type. | absence | `https://atlassian.design/llms-content.txt#Message-Length-Guidelines` | "General messages: Maximum 5 lines" | none |

**Read against our system:** we do the opposite of row 01 — our type ramp is nine steps of a 1.200
ratio held in the `@theme` block, so a size **is** a token and a line-height is carried by it. The
portable part is the other direction: their step is *named by what it is on the page* ("Page titles",
"Secondary content"), which is the same naming as our one display step per screen ("the screen's
primary locator"). Row 06 is a leading rule we state as a per-token value rather than a floor. Row
12 is where their corpus is thinner than ours: `check:space` measures our spacing and type on our
own scale, and DESIGN.md caps a prose block at `max-w-measure` (32em ≈ 70 serif characters); nothing
in Atlassian would catch a 120-character line. Their "Maximum 5 lines" is the nearest thing and is
a message bound, not a measure bound — the reason we keep our own rule and refuse theirs.
