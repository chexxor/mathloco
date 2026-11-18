# Atlassian — loading / empty / error states

Domain 15 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-components.txt` (Spinner, Skeleton,
ProgressBar, ProgressIndicator, ProgressTracker, EmptyState components),
`https://atlassian.design/components/empty-state/usage` (page),
`https://atlassian.design/llms-content.txt#Message-Design`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A15-state-01 | The loading channel is chosen by whether the duration is **known**: spinner for unknown, bar for known. | behavior | `https://atlassian.design/llms-components.txt#Spinner-component` | "Use for loading states of unknown duration" | none |
| A15-state-02 | A bar has an indeterminate state, so the two channels are one scale with a shared edge. | pattern | `https://atlassian.design/llms-components.txt#ProgressBar-component` | "Use indeterminate state for unknown duration" | lint (prop) |
| A15-state-03 | A spinner is a delay decision, not just an affordance. | behavior | `https://atlassian.design/llms-components.txt#Spinner-component` | "Consider delay before showing spinner" | none |
| A15-state-04 | A skeleton must mirror the real layout, so it is a promise about what is coming. | rule | `https://atlassian.design/llms-components.txt#Skeleton-component` | "Match skeleton structure to actual content layout" | none |
| A15-state-05 | A skeleton must not be announced as content — the shape is allowed, the meaning is not. | rule | `https://atlassian.design/llms-components.txt#Skeleton-component` | "Ensure skeleton content is not announced as actual content" | none |
| A15-state-06 | Every loading affordance has an announcement requirement. | rule | `https://atlassian.design/llms-components.txt#Spinner-component` | "Ensure spinner is announced to screen readers" | test (axe live-region) |
| A15-state-07 | A step counter is a different component from a bar, and a tracker is a different one again. | pattern | `https://atlassian.design/llms-components.txt#ProgressTracker-component` | "Use for multi-step workflows" | none |
| A15-state-08 | An empty state is defined by what it **says**, before what it looks like. | behavior | `https://atlassian.design/components/empty-state/usage` (page lede) | "An empty state appears when there is no data to display and describes what the user can do next." | none |
| A15-state-09 | The tone is chosen by which emptiness it is, and the three cases are named. | pattern | `https://atlassian.design/components/empty-state/usage#Content-guidelines` | "A general no-result state (such as no search results) might be more neutral, but still motivate by showing next steps." | none |
| A15-state-10 | The failure copy is written as a pair: an acceptable sentence and two rejects. | rule | `https://atlassian.design/llms-content.txt#5-Empty-State-Messages` | "Avoid: \"Nothing here\", \"No data found\"" | none |
| A15-state-11 | An error is a different channel from an empty state, and it must carry resolution. | rule | `https://atlassian.design/llms-content.txt#4-Error-Messages` | "Must include clear resolution steps" | none |
| A15-state-12 | An empty state may be re-used as an error, but only by following the error rules. | pattern | `https://atlassian.design/components/empty-state/usage#Related` | "Some error messages, such as not found errors, may also fit this component layout." | none |

**Read against our system:** our artifacts contain one deliberate empty state — an offline/platform
notice with an action, and a schedule band that can legitimately be empty — and **no loading
artifact at all**. Rows 01–07 therefore split two ways, and the split is the finding: as *pre-loading*
they are drafts (we have no spinner, no skeleton, no bar, and no rule that would refuse one), but
rows 04, 05, 10, 11 are **live** gaps, because the same sentences apply to the empty state we do ship:
nothing in our tree requires an empty state to name its next step (row 08/09), refuses the two reject
phrasings (row 10), or distinguishes "there is nothing here" from "something failed" (row 11). Row 12
is the cheapest steal in this corpus for us: one component, two rule sets, and the crossover is named.
