# Material — forms & validation (domain 10)

Domain 10 of the fixed 18 (see `../README.md`). Status for this domain's actual subject: **NO EVIDENCE —
and that absence is the finding.** Material 2 does not answer form validation, and the absence is
established against an index rather than against memory:

- the sitemap's 83 `/design/` URLs (`material-design-urls.txt`, 83 lines) contain **no** page whose path
  names a form, field, input, validation, or error summary;
- the two closest candidates — `communication/data-formats.html` and `communication/offline-states.html` —
  were **probed this session and returned no markdown** (recorded in `COVERAGE.md`);
- `m3.material.io/sitemap.xml` (721,312 B) is the live successor and was **not ingested**, so nothing may
  be claimed about what it publishes (`PRIOR.md`).

What the system *does* say about the pieces of a form — helper text, an error helper's colour, which
components inherit a selected or disabled state, density on long forms — is below, with locators. Those
rows are **not** a validation contract, and the gap analysis treats them as such: they feed §0's `NO EVIDENCE`
cell and at most one pre-loading draft row, never a ranked `GAP`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M10-forms-01 | **The whole of this system's stance on a text field is which states it may inherit.** No rule about submitting, failing, or correcting one exists in the corpus. | absence | `https://m2.material.io/design/interaction/states.html#hover-inheritance` | "Hover states can be inherited by the following components: buttons, FABs, toggle buttons, selection controls, grid list items, list items, cards, chips, text fields, and icons." | none — the allow-list is prose; and no page in the 83-URL index is about a field's input at all |
| M10-forms-02 | A field gets **helper text**, and the helper's job is stated as the field's own contract: explain the input. | behavior | `https://m2.material.io/design/color/text-legibility.html#helper-text` | "Helper text gives context about a field's input, such as how the input will be used." | none |
| M10-forms-03 | Helper text may carry brand, but its legibility is a WCAG condition on it, not a style note. | rule | `https://m2.material.io/design/color/text-legibility.html#helper-text` | "It can adopt brand colors, but should be legible as determined by WCAG standards." | none |
| M10-forms-04 | An **error helper** exists as a typographic role, and it is specified as one hex at full opacity — the only error colour this corpus states, and it states no rule for when to use it. | token | `https://m2.material.io/design/color/text-legibility.html#helper-text` | "Default error helper text: This text uses a hex value of #B00020 at 100% opacity" | none — and `check:contrast`-equivalent: no contrast number is attached to that hex anywhere in the system |
| M10-forms-05 | Selection of text is a *legibility pair*, both directions. | rule | `https://m2.material.io/design/color/text-legibility.html#selected-text` | "Selected text should be legible against the selection color, and the selection color should contrast the background color." | none |
| M10-forms-06 | An alternative selection cue exists when colour cannot carry it — outline, motion, or an icon. | pattern | `https://m2.material.io/design/color/text-legibility.html#selected-text` | "Alternatively, you can display outlines, motion, checkmark icons, or other text treatments to indicate selected text." | none |
| M10-forms-07 | A disabled field does not answer, and that is the whole of its behaviour. | behavior | `https://m2.material.io/design/interaction/states.html#disabled-inheritance` | "Components can inherit a disabled state, such as toggle buttons, selection controls, text fields, icons, grid and list items, cards, chips, and buttons." | none |
| M10-forms-08 | Density is the one place a **form** is named as a layout subject, and the benefit is stated as scannability. | pattern | `https://m2.material.io/design/layout/applying-density.html#how-to-apply` | "By making more content available on-screen, increasing the density of lists, tables, and long forms makes information easier to scan, view, and compare." | none |
| M10-forms-09 | Density is refused where a form is a **focused task** — the picker/dropdown case. | rule | `https://m2.material.io/design/layout/applying-density.html#when-not-to-apply-density` | "Don't increase the density of components that involve focused tasks, such as interacting with a dropdown menu or picker." | none |
| M10-forms-10 | Leaving a screen that has lost its prior state is the closest thing this system says about a form's *outcome*: tell the user, in words. | behavior | `https://material.io/design/navigation/understanding-navigation.html#reverse-navigation` | "Provide clear messaging if a screen's prior state is no longer available, such as when information from a form has been cleared for privacy." | none |
| M10-forms-11 | **Absence, stated so it is not mistaken for a refusal:** the recovery path this system offers for a problem is a *help channel*, not a field-level correction. | absence | `https://material.io/design/communication/help-feedback.html#send-feedback` | "Users can submit comments, report bugs, and ask questions that are not already answered by the help content." | none — the help screen is a separate surface; nothing here says what happens to a submission that failed |

**Read against our system.** **We ship no form controls**, and the census run for this file (this session, @measured 2026-11-18):
`grep -rlE '<input|<form|<select|<textarea|required=' src` → **no matches**, exit code 1. The sibling systems'
files record a census taken earlier in the same session that found one hit — an image *filename* inside a
comment — on a tree the other agent was moving; today's run finds none, which is why the verdict below is
stated against this run and the older one is not quoted. Either way the census says the same thing about
our product: there is no control to validate.

What would be worth keeping when forms arrive, in one sentence each, and none of it is a decision:

- helper text states the field's own contract (row 02) — the cheapest transferable grain, because it is a
  sentence about *what the field is for*, which is the shape our notice grammar already uses elsewhere
  ("a notice = word + keyline", one boundary, no nested fill);
- the error helper is a **role**, not a hue with a name (row 04) — and our system has no signal hue at all
  (DESIGN.md's "no red and no amber, severity is carried by the notice's keyline and word"), so a `#B00020`
  may not be imported and a role named `error` would collide with that refusal;
- density on a form is a benefit, density on a picker is refused (rows 08–09) — the pair only makes sense
  against the accessibility refusal in `controls-buttons.md`, which is that a denser control does not meet
  the accessibility requirement and therefore must be opted into.

Nothing in this file may be ranked in §2's top table; its rows go to §2's "pre-loading decisions before we
build it" block, flagged as drafts, and §0 names this cell as `NO EVIDENCE`.
