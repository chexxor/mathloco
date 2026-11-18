# Atlassian — feedback / notices & status

Domain 11 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-components.txt` (Banner, Flag, SectionMessage,
InlineMessage, Lozenge components), `https://atlassian.design/llms-content.txt#6-Message-Design`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A11-msg-01 | A notice is **routed by what the user must do**, and the routing sentence is repeated across four packages. | pattern | `https://atlassian.design/llms-components.txt#Flag-component` | "Use Banner for critical/system messages; Inline message when action is required; Modal for immediate action" | none |
| A11-msg-02 | The largest channel has a content condition, not a size condition. | rule | `https://atlassian.design/llms-components.txt#Banner-component` | "Use only for critical messaging: loss of data/functionality or important site-wide information" | none |
| A11-msg-03 | Only one at a time, and the page is pushed down — a layout consequence of the notice. | behavior | `https://atlassian.design/llms-components.txt#Banner-component` | "Show one banner at a time and push content down" | none |
| A11-msg-04 | The section channel is defined by three named causes. | rule | `https://atlassian.design/llms-components.txt#SectionMessage-component` | "Use when: destructive consequences, action needed to proceed, connectivity or auth issues" | none |
| A11-msg-05 | Tone is a script per severity, printed identically in two packages. | pattern | `https://atlassian.design/llms-components.txt#InlineMessage-component` | "Error: explain and next step; use \"we\" not \"you\"" | none |
| A11-msg-06 | The same script's other three lines, in the flag's own voice. | pattern | `https://atlassian.design/llms-components.txt#Flag-component` | "Warning: before action, empathy, offer alternative" | none |
| A11-msg-07 | Success is a duration rule: confirm, then leave. | rule | `https://atlassian.design/llms-components.txt#Flag-component` | "Confirm outcome then get out of the way for success messages" | none |
| A11-msg-08 | Blame is refused with the two phrasings. | rule | `https://atlassian.design/llms-components.txt#SectionMessage-component` | "Avoid blame—use \"we're having trouble\" not \"you're having issues\"" | none |
| A11-msg-09 | A notice may not end the path. | rule | `https://atlassian.design/llms-components.txt#SectionMessage-component` | "Avoid dead ends—always indicate how to proceed" | none |
| A11-msg-10 | A notice's length is bounded in lines, and the reason is accessibility. | rule | `https://atlassian.design/llms-components.txt#InlineMessage-component` | "Keep content to a maximum of five lines (truncation is not accessible)" | none |
| A11-msg-11 | Dismissal is a state machine with two refusals. | rule | `https://atlassian.design/llms-components.txt#Flag-component` | "Do not stack dismissible and non-dismissible flags" | none |
| A11-msg-12 | Severity has a shape language as well as a word, and the shape is named per severity. | token | `https://atlassian.design/llms-content.txt#4-Error-Messages` | "Use red diamond icon with exclamation mark" | none |

**Read against our system:** our notices carry severity by **keyline and word, with no signal hue**
(D102), so rows 05–08 and 12 are the register we already own in a different medium — they are
`DIVERGENT-KEEP` candidates, not gaps, and row 12 in particular is a hue-shaped system we refused.
Rows 01/02/04 are the routing our tree does implicitly: an offline/platform notice exists and nothing
says when it becomes a bigger channel. Row 09 is a live GAP for our existing empty and offline states:
the sentence is six words, states the defect class, and no detector in the deploy set fails a notice
with no next step. Row 10 is our own idiom in another unit — we bound a prose block in **characters**
(`max-w-measure`) and never bound a notice in lines; stealing it would put two units on one rule, so
it is listed as a divergence rather than a steal.
