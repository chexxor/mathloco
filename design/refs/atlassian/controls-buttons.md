# Atlassian — controls & buttons

Domain 9 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-components.txt` (the `@atlaskit/button` package's
five component blocks: Button, IconButton, LinkButton, IconButtonToggle, ButtonGroup),
`https://atlassian.design/llms-components.txt#FormFooter-component`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A09-button-01 | One primary action per section, and one CTA per area — stated twice, in two registers. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Limit to one primary button per section" | none |
| A09-button-02 | A control is an action; navigation is a link, and the reason is assistive-tech behavior. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Use buttons for actions; use links for navigation (different semantics and assistive tech behavior)" | none (a different component exists for each, so lint sees the choice) |
| A09-button-03 | A label starts with the verb and names the object; their example is the anti-pattern pair. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Start with the verb and specify what's being acted on" | none |
| A09-button-04 | A label carries no punctuation — a rule a detector can fail by string match. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Don't use punctuation in button labels" | none |
| A09-button-05 | Case is a rule. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Use sentence case" | none |
| A09-button-06 | Generic verbs are named as failures by name. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Avoid generic terms like \"Submit\" or \"Click here\"" | none |
| A09-button-07 | Length of a label is bounded in words. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Keep text concise (1-3 words ideal)" | none |
| A09-button-08 | A destructive action gets its own appearance, and the appearance is the carrier of severity. | pattern | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Use danger buttons sparingly for destructive actions" | lint (the `type`/`appearance` prop enum) |
| A09-button-09 | Disabled is a state they prefer to avoid, twice. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Avoid disabling buttons where possible" | none |
| A09-button-10 | An icon button must be labelled, and the label is rendered as hidden content — so the name is in the DOM. | pattern | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "Always provide a meaningful label; it is rendered as visually hidden content for assistive technologies" | test (axe) |
| A09-button-11 | Grouping has a negative half: unrelated actions are not grouped. | rule | `https://atlassian.design/llms-components.txt#ButtonGroup-component` | "Don't group unrelated actions together" | none |
| A09-button-12 | In a form footer the primary action's **position** is fixed, and dismissal is part of the footer. | behavior | `https://atlassian.design/llms-components.txt#FormFooter-component` | "Primary button on the right; include Cancel for dismissal" | none |

**Read against our system:** our controls are **derived, not chosen** — `height = ceil4(measured
line box) + 2 × an S3 pad`, one boundary per box, 48px for every pressable block, 24px minimum target.
Nothing in Atlassian answers that: no button height formula, no padding formula, and their only
stated size is a component default. **We are ahead on geometry, they are ahead on language.** Rows
01, 03–06, 11, 12 are the eight rules our artifacts state no version of, and each is detector-shaped
(a label grammar is greppable in a template): the closest thing our tree has is prose in the
`empty-states` skill and the inline-message tone register, and neither fails a "Submit" button. Row
02 is the register our Svelte islands already obey implicitly (links navigate, buttons act) but never
state. Row 09 belongs in §3 with our own contradicting decision if we have one; today we have no
rule at all, so it is a GAP row.
