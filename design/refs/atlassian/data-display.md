# Atlassian — data display (tables, lists, status labels)

Domain 12 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-components.txt` (the `@atlaskit/table-tree`
package's Cell and tree components, `@atlaskit/dynamic-table` loading labels, Lozenge component,
Tabs component).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A12-data-01 | A table is for data and **never** for layout — the refusal is stated as a component rule. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/table-tree-Package` | "Use for structured tabular data only—never for layout" | none |
| A12-data-02 | Indentation is bounded, and the reason is a named user class. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/table-tree-Package` | "Avoid heavy indentation—affects scannability and screen magnification users" | none |
| A12-data-03 | Truncation is refused where wrapping is possible. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/table-tree-Package` | "Prefer wrapping over truncation for accessibility" | none |
| A12-data-04 | Column headers are a language rule, not a styling rule. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/table-tree-Package` | "Clearly label column headers with simple language" | none |
| A12-data-05 | A table has an accessible name requirement. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/table-tree-Package` | "Provide an accessible name for the table" | test (axe table-header rules) |
| A12-data-06 | An expandable row may not also be interactive — one affordance per row. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/table-tree-Package` | "Allow expand-on-click only when the row has no interactive elements (buttons, dropdowns)" | none |
| A12-data-07 | The hierarchy puts the important thing outside, so expansion is rare by construction. | pattern | `https://atlassian.design/llms-components.txt#@atlaskit/table-tree-Package` | "Place important information at top-level so users rarely need to expand" | none |
| A12-data-08 | A loading table names its spinner, in a prop whose default is a sentence. | token | `https://atlassian.design/llms-components.txt#@atlaskit/dynamic-table-Package` | "Accessible name for loading states spinner. Can be used for internationalization. Default is \"Loading table\"." | lint (prop default) |
| A12-data-09 | A status label is chosen by **meaning**, and the alternative component is named by meaning too. | rule | `https://atlassian.design/llms-components.txt#Lozenge-component` | "Only migrate a lozenge to Tag when the label is purely categorisation or descriptive metadata (topics, attributes, groupings)." | none |
| A12-data-10 | A status label truncates, and truncation is the accessibility defect named twice. | rule | `https://atlassian.design/llms-components.txt#Lozenge-component` | "Do not use for long text—lozenge is not focusable and truncation at ~200px is not accessible" | none |
| A12-data-11 | Status labels are a bounded set of words with casing rules, and the casing rule names AI output. | rule | `https://atlassian.design/llms-components.txt#Lozenge-component` | "Use sentence case for labels, including AI-generated labels: \"In progress\" or \"Off track\", not \"In Progress\" or \"IN PROGRESS\"." | none |
| A12-data-12 | Tabs exist to keep related content on one page, and their bound is a count. | rule | `https://atlassian.design/llms-components.txt#Tabs-component` | "Limit the number of tabs to avoid overcrowding" | none |

**Read against our system:** our data display is the schedule band — a list of dates and a count —
plus a table-shaped attendance summary. Rows 02, 03, 04, 05 are the four things our schedule does or
fails **today**: nothing in our artifacts requires a table's accessible name, prefers wrapping over
truncation for a date row, bounds label language, or refuses a table used for layout. Row 01 is the
refusal our Svelte islands would silently break (islands used as layout containers). Row 09/10/11 are
the status-label register our attendance/RSVP states use; row 11 in particular states the casing
rule in the register a generated label would fail — which matters here because the schedule strings
in our tree are partly generated. Row 06 and 07 are `pre-loading` candidates only if we add a
collapsible row; today we have none, so they are recorded as evidence about a domain we don't have.
