# Atlassian — accessibility contract (names, roles, targets)

Domain 16 of the fixed 18. Status: **EVIDENCED**. This is the only system of the five that states an
accessibility **verification** model, so it is the one our own detector model is comparable to.

Artifacts reached: `https://atlassian.design/llms-a11y.txt` (all sections listed in its own
headings), `https://atlassian.design/llms-components.txt` (VisuallyHidden, Icon, Button
components).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A16-a11y-01 | They state a compliance target, and it is a version and a level, not an aspiration. | rule | `https://atlassian.design/llms-a11y.txt#WCAG-21-AA-Compliance` | "The Atlassian Design System is built to meet WCAG 2.1 AA standards, ensuring:" | test (their axe suite) |
| A16-a11y-02 | Names must exist for icon-only controls, and the mechanism is hidden DOM text, not an attribute. | behavior | `https://atlassian.design/llms-components.txt#VisuallyHidden-component` | "Use when meaning is clear visually but not to assistive technology" | test (axe) |
| A16-a11y-03 | Hidden text beats an attribute when the phrase must be announced whole. | rule | `https://atlassian.design/llms-components.txt#VisuallyHidden-component` | "Prefer over aria-label in some cases when screen readers need to translate or announce full phrasing" | none |
| A16-a11y-04 | Hidden text has a length constraint in the same breath as its purpose. | rule | `https://atlassian.design/llms-components.txt#VisuallyHidden-component` | "Balance clarity with brevity—avoid overwhelming screen reader users" | none |
| A16-a11y-05 | A status region is chosen by urgency, and repetition is refused. | pattern | `https://atlassian.design/llms-a11y.txt#Announcements-and-Live-Regions` | "Avoid announcing the same message repeatedly" | none |
| A16-a11y-06 | Live regions live in the DOM permanently, so announcement is structural, not conditional. | rule | `https://atlassian.design/llms-a11y.txt#Announcements-and-Live-Regions` | "Keep live regions in the DOM for consistent announcements" | none |
| A16-a11y-07 | A disabled control needs an alternative, not a state. | rule | `https://atlassian.design/llms-a11y.txt#Buttons-and-Pressable-Elements` | "Never disable buttons without providing alternatives" | none |
| A16-a11y-08 | Their touch-target rule has **no number** — the number is missing where ours exists. | rule | `https://atlassian.design/llms-components.txt#Icon-component` | "Consider icon size for touch targets" | none |
| A16-a11y-09 | Verification is automated and shipped as a package: axe violations and measured contrast. | test | `https://atlassian.design/llms-a11y.txt#Automated-Testing` | "expect(results).toHaveNoViolations();" | test |
| A16-a11y-10 | The audit can be switched on for a whole test run, which is how they make it cheap. | pattern | `https://atlassian.design/llms-a11y.txt#Automated-Testing` | "IS_A11Y_AUDIT_ENABLED=true" | test |
| A16-a11y-11 | Their manual checklist is human-passed and has no planted defect — nine rows, including reduced motion and 400% zoom. | pattern | `https://atlassian.design/llms-a11y.txt#Manual-Testing-Checklist` | "Test with reduced motion preferences" | none |
| A16-a11y-12 | Their fix patterns name the defect class, then hand the fix to a component. | pattern | `https://atlassian.design/llms-a11y.txt#ADS-Fix-Patterns-for-Accessibility-Violations` | "**Common Issues**: Missing labels, unassociated form controls, missing descriptions" | test |

**Read against our system:** ours is stronger on **targets and thresholds** (a 24px minimum target,
44px at phone widths, contrast measured per named ground by `check:contrast`) and stronger on
**verification shape** (every `check-*` ships a `check-*:selftest` that plants the defect it exists
to catch, so a green run proves the detector fires). Theirs is stronger on **the list of what can go
wrong**: rows 02/03/04 (hidden text vs attribute, and its length), 05/06 (announcement channels), and
11 (the nine-item manual pass, including reduced motion and zoom) are all things our artifacts never
name. Row 08 is recorded as a place they are behind: "Consider…" cannot fail, and ours can. Row 11
is the same defect class ours refuses by construction — a checklist nobody can prove was run — and
that is a §3 `DIVERGENT-KEEP` with a reason, not a gap.
