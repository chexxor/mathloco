# Carbon — feedback / notices & status

Domain 11 of the fixed 18. Status: **EVIDENCED**, and this system is the one that splits the domain
into two named layers — a **status** vocabulary (severity) and a **notification** delivery model
(kind × duration × disruptiveness). That split is the part worth keeping.

Pages reached: `…/core/patterns/status-indicators`, `…/core/patterns/notifications`,
`…/patterns/disabled-states`, `…/foundations/color/overview`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C11-status-01 | Severity is a three-level scale defined by what the user must do, not by colour. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#severity-levels` | "Use these indicators when immediate user action is required due to a system irregularity, malfunction, or potentially destructive action." | none |
| C11-status-03 | Status must be carried by at least three of four elements — symbol, shape, colour, type. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#visual-guidance` | "There are four basic elements that comprise Carbon status indicators. … And for WCAG compliance, at least three of these elements must be present." | none |
| C11-status-04 | Colour alone is insufficient; contrast must clear 3:1 both within the indicator and against the page. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#relying-only-on-color-is-insufficient` | "While color can be useful, it must be paired with text or other visual cues." | none |
| C11-status-05 | The test they publish for it is grayscale legibility: "If the contrast is sufficient, even in grayscale, users should still be able to differentiate statuses without relying solely on color." | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#relying-only-on-color-is-insufficient` | "If the contrast is sufficient, even in grayscale, users should still be able to differentiate statuses without relying solely on color." | none |
| C11-status-06 | Their status palette names the emotion of each hue, including the two outliers (gray = not started, purple = undefined). | token | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#status-color-palette` | "Typically, red represents danger or error, orange represents a serious warning, yellow represents a regular warning, green represents normal or success, and blue represents passive notifications" | none |
| C11-status-07 | A palette exists that exists **only** to fix the contrast of yellow and orange, and is refused everywhere else. | token | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#extended-status-palettes` | "Do not use this palette in any other context or layout." | none |
| C11-status-08 | Shape carries learned meaning, so a shape may not be re-pointed (traffic: hexagon = stop, upside triangle = yield). | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#status-shapes` | "For example in traffic and wayfinding, hexagons mean stop, and upside triangles means yield." | none |
| C11-notif-01 | Delivery is a matrix: status (informational/success/warning/error) × type (inline, toast, actionable, callout, banner, panel, modal) with named duration for each. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/notifications#notification-types` | "Persist until the message is resolved or dismissed by user and may include a ghost button action" | none |
| C11-notif-02 | Disruptiveness must match urgency, and there are exactly two visual styles with a mixing ban. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/notifications#notification-priority` | "Toast and inline notifications can use different styles, but you should never mix styles within the variations." | none |
| C11-notif-04 | Never time a critical message: some users need more time, and the criterion is named (WCAG 2.2.4). | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/notifications#accessibility` | "Don't use notifications that dismiss on a timer for critical or emergency messages." | none |
| C11-notif-05 | Noncritical notifications must be reducible by the user, and why: control over distraction. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/notifications#accessibility` | "Users should be able to manage or limit noncritical notifications." | none |
| C11-notif-06 | Copy is a contract: no jargon, next steps required, and a system-generated message needs more context than a task-generated one. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/patterns/notifications#notification-message` | "Do not leave users without next steps." | none |

**Read against our system:** our side carries severity **without a signal hue** — a notice's keyline
and word do the job. C11-status-06 is therefore a `DIVERGENT-KEEP`: they name hues, we refuse them,
and the reason we keep ours is already ruled (D102). C11-status-03/04/05 are the three-element and
grayscale tests our contrast gate does not currently run. C11-notif-01 is a delivery model we have
one instance of (the offline/platform notice) and no vocabulary for.

**Pruned to 12 claims per table (the cap), with the reason:** `C11-status-02` is the low end of the same severity scale `C11-status-01` defines; `C11-notif-03` is the blocking-cost statement that `overlay-surfaces.md` carries for the modal.
