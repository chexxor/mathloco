# GOV.UK — controls & buttons

Domain 9 of the fixed 18. Status: **EVIDENCED, as a *button vocabulary* rather than a control
geometry.** GOV.UK names five button roles (default / start / secondary / warning / inverse) plus a
disabled state and a group, states the wording contract, and refuses several uses outright. What it
never states is a size, a padding, or a hit-area number.

Page reached: `https://design-system.service.gov.uk/components/button/` (105,227 B).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G9-btn-01 | A button is defined by what it *does*, and its text must name that action. | rule | `https://design-system.service.gov.uk/components/button/#use-the-button-component` | "Use the button component to help users carry out an action like starting an application or saving their information." | none |
| G9-btn-02 | Button text is sentence case and verb-first — a wording contract, not a style tip. | rule | `https://design-system.service.gov.uk/components/button/#wording` | "Write button text in sentence case, describing the action it performs." | none |
| G9-btn-03 | The primary action has a **position**, and the position is a decision about where the eye lands. | pattern | `https://design-system.service.gov.uk/components/button/#default-buttons` | "Align the primary action button to the left edge of your form." | none |
| G9-btn-04 | One page gets **one** primary call to action; a second is a defect with a stated consequence. | rule | `https://design-system.service.gov.uk/components/button/#default-buttons` | "Avoid using multiple default buttons on a single page. Having more than one main call to action reduces their impact, and makes it harder for users to know what to do next." | none |
| G9-btn-05 | Secondary buttons are rationed by page *complexity*, not by hierarchy: simplify or split before adding another. | rule | `https://design-system.service.gov.uk/components/button/#secondary-buttons` | "Pages with too many calls to action make it hard for users to know what to do next. Before adding lots of secondary buttons, try to simplify the page or break the content down across multiple pages." | none |
| G9-btn-06 | A start button is **not a form control**: it submits nothing, so it is a link tag dressed as a button. | pattern | `https://design-system.service.gov.uk/components/button/#start-buttons` | "Start buttons do not usually submit form data, so use a link tag instead of a button tag." | none |
| G9-btn-07 | A warning button is a **consequence gate**: it exists only for irreversible actions, and it is scarce by design. | rule | `https://design-system.service.gov.uk/components/button/#warning-buttons` | "Only use warning buttons for actions with serious destructive consequences that cannot be easily undone by a user." | none |
| G9-btn-08 | The irreversible act gets **two steps**: a normal control first, the warning control as the confirmation. | behavior | `https://design-system.service.gov.uk/components/button/#warning-buttons` | "When letting users carry out an action like this, it's a good idea to include an additional step which asks them to confirm it." | none |
| G9-btn-09 | **Colour may not carry the severity alone** — the same refusal our palette already makes, in the register we use. | rule | `https://design-system.service.gov.uk/components/button/#warning-buttons` | "Do not only rely on the red colour of a warning button to communicate the serious nature of the action." | none |
| G9-btn-10 | On a dark ground the button carries an explicit contrast threshold and a criterion number. | rule | `https://design-system.service.gov.uk/components/button/#buttons-on-dark-backgrounds` | "the white button and background colour must have a contrast ratio of at least 4.5:1 to meet WCAG 2.2 success criterion 1.4.3 Contrast (minimum), level AA." | none |
| G9-btn-11 | A disabled button is **discouraged**, with the reason: the state it encodes is invisible to some users. | rule | `https://design-system.service.gov.uk/components/button/#disabled-buttons` | "Disabled buttons have poor contrast and can confuse some users, so avoid them if possible." | none |
| G9-btn-13 | Double-click on a destructive control is treated as a **defect with a server-side half**; the client affordance is conditional on JavaScript. | behavior | `https://design-system.service.gov.uk/components/button/#preventing-double-clicks` | "This feature will prevent double clicks for users that have JavaScript enabled, however you should also think about the issue server-side to protect against attacks." | none |

**Read against our system.** Our controls are *derived*: height comes from the measured line box plus
a step of the spacing ladder, every pressable block on the join path is `s48` (DESIGN.md:309:
"every pressable block on the join path - primary and secondary; the only step that clears the 44px
AAA bar"), and the bars are 24px minimum target / 44px at phone widths (DESIGN.md:66-67). GOV.UK
states none of that geometry. So on size this system is **behind us**, and no row here may be ranked
as a gap we should close with a number borrowed from them.

What transfers is the **vocabulary and the refusals**, in four lines:

- Rows 04/05: one primary per page, and secondary controls rationed by page complexity. Our artifacts
  count controls but do not cap calls-to-action per band — that is a detector-shaped gap
  (count `data-control` blocks per band, fail above one primary).
- Row 09 is a *convergent* refusal: we have no red and no amber at all (DESIGN.md:58, D102), so their
  "do not rely on the red colour" is satisfied by construction in our system — a row that must appear
  in §3 (divergence) rather than §2 (gaps).
- Rows 07/08 are the strongest contract here for a product we ship: a **destructive act needs a
  confirmation step, and the control that performs it must be visually distinct from the ordinary one**.
  Our system carries a caution keyline (`accent` family) and a chip, so the shape exists; whether every
  destructive control in `src/` carries it is a grep, and the selftest is a planted destructive button
  with no keyline.
- Row 14 is a trap: it is a research claim about a hue improving an outcome. It is evidence that a
  colour can be *measured* for effect, and it is **not** a licence to add a hue — our register refuses
  signal hues, and importing green would break D102.

**Pruned to 12 claims per table (the cap), with the reason:** `G9-btn-14` is research narration behind a colour decision already in `G9-btn-10`; `G9-btn-12` is a grouping pattern our system has no surface for (no button groups exist in `src/`).
