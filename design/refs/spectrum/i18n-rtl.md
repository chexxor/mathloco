# Adobe Spectrum — i18n / RTL

Domain 17 of the fixed 18. Status: **ANSWERED, and the most quantitative i18n evidence in the corpus.**
Spectrum is the only one of the five that states text expansion as a *number per field length* (an
IBM-derived table from 10 characters to 300% down to 70+ characters at 130%), that states the typographic
consequence (line-height and interline spacing change per writing system), and that states mirroring as a
rule set with named exceptions. Nothing here states a mechanism: no `dir`, no logical properties, no
build check appears in any fetched page — the only mechanism sentence in the corpus is one component page
saying its own layout mirrors.

Probe that establishes the mechanism's absence (run this session, on this rig): `grep -rilE
'\b(dir=|writing-mode|logical propert|border-inline|margin-inline|start:|end:)' txt/spectrum-*.txt` →
**no matches** (exit 1) across all 68 corpus digests; and `grep -inE 'mirror|bidirection|rtl'
spectrum-tree-paths.txt` over the 4,191 repo paths → **one match, and it is not about mirroring**:
`tools/component-options-editor/test/codemirror-test.html` (6,185 B) is an editor-library fixture. So the
rule set is prose on two site pages plus one per-component sentence, and no manifest of flip-rules exists
anywhere; the exception list is the part that would have to be encoded to be enforceable at all.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| S17-i18n-01 | The goal is stated as equity, not as translation: usable, relevant, meaningful **across the globe**. | rule | `https://spectrum.adobe.com/foundations/inclusivity/internationalization` | "The aim of international design is to create experiences that are equally usable, relevant, and meaningful across the globe to amplify the voices of global users." | none stated |
| S17-i18n-02 | Expansion is quantified per length band, and short strings are the most dangerous: 300% at ≤10 characters. | pattern | `https://spectrum.adobe.com/foundations/inclusivity/internationalization` | "When translating content to different languages, the length of the translated text is likely going to be very different — sometimes up to 300% longer than the original one." | none stated — the band table below the quote survives the digest as three columns (characters, max. estimated expansion, likely mapping) running from 10 characters at 300% for buttons/pickers/tabs to 70+ at 130% for longer paragraphs, with no rule attached to any row |
| S17-i18n-03 | The band table is sourced, and its point is predictive: fewer characters, more expansion. | pattern | `https://spectrum.adobe.com/foundations/inclusivity/internationalization` | "IBM Globalization Guidelines reported an interesting correlation between the number of characters in a text field and the amount of text expansion." | none stated — the cited study is IBM's, not one of the five sources, and was not fetched |
| S17-i18n-04 | Layouts are required to **flow**, not to fit: length and nature of content are the variable. | rule | `https://spectrum.adobe.com/foundations/inclusivity/internationalization` | "It's vital to create layouts that can efficiently flow with the textual content of different length and nature." | none stated |
| S17-i18n-05 | Non-Latin scripts need **type adjustments**, named as two dials: line-height and interline spacing. | rule | `https://spectrum.adobe.com/foundations/inclusivity/internationalization` | "To ensure good readability, it's important to adjust the line-height value of paragraphs to create some extra breathing room between lines, and when necessary, increase interline spacing between characters." | none stated |
| S17-i18n-06 | Text inside an image is a defect for this system, and the workaround is stated: lines, not words. | rule | `https://spectrum.adobe.com/foundations/inclusivity/internationalization` | "As a rule of thumb, embedding text within icons, illustrations, and images can potentially lead to headaches when the content needs to be localized" | none stated |
| S17-i18n-07 | Colour carries no stable meaning across cultures, so it cannot be the sole status signal. | rule | `https://spectrum.adobe.com/foundations/inclusivity/internationalization` | "In general, no color can be assumed to have a consistent meaning across cultures." | none stated |
| S17-i18n-08 | The remedy for that is the same one the accessibility domain reaches: pair colour with text or another clue. | rule | `https://spectrum.adobe.com/foundations/inclusivity/internationalization` | "colors should not be the only indicator of a specific status or use case. It's always better to integrate with textual or other visual clues." | none stated |
| S17-i18n-09 | Mirroring is required, and it is defined: components move to the opposite side. | rule | `https://spectrum.adobe.com/foundations/inclusivity/bi-directionality` | "Digital experiences for these languages should be mirrored to follow the same right-to-left reading pattern." | none stated |
| S17-i18n-10 | **Time is never mirrored**, at both scales: the component and the icon. | rule | `https://spectrum.adobe.com/foundations/inclusivity/bi-directionality` | "Components that are used to represent the concept of time should not be mirrored...Icons that refer to the passage of time (e.g., clock icon) should not be mirrored in right-to-left interfaces." | none stated |
| S17-i18n-11 | Two glyphs are **never** mirrored, in the same absolute voice. | rule | `https://spectrum.adobe.com/foundations/inclusivity/bi-directionality` | "Checkmarks are never mirrored...Slashes are never mirrored in right-to-left interfaces." | none stated |
| S17-i18n-12 | The only mechanism statement in the corpus is per-component, and it is specific: alignment flips too. | behavior | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/popover.md` | "For RTL (right-to-left) languages, the layout of the popover is mirrored. Text is right-aligned and buttons are left-aligned." | component guideline prose; `s2-docs/web/rsp/components/popover.md` (5,287 B) — no mirroring manifest exists in the repo tree (probe above) |

**Read against our system, and why almost none of this is eligible for a GAP row.** We are a
single-language page (English) with no locale switch and no RTL surface: there is no translated string
whose length we must survive, and no direction in which our layout must flip. What is eligible is the
*transferable invariant* rather than the mechanism — two of these rows survive that filter:

- **S17-i18n-02 (band table)** is the only i18n statement in the corpus that would still apply if we
  ever accepted a locale, and it is the cheapest to honour today: our join page has fixed-width fields
  (a date, a platform name, an email label) whose content length is unknown at build time. The detector
  shape would be "no fixed width on a string-bearing box", which we can measure today without shipping
  a locale.
- **S17-i18n-07 / 08** restate the rule our colour roles already carry ("no signal hue", D102, and one
  named role per state). They are evidence that our existing colour gate is *culturally* incomplete, not
  that we need a new one — a colour gate cannot fix meaning, only pair it with text.
- **S17-i18n-10 / 11 / 12** are refused outright: they are about a direction we do not ship, and refusing
  them is a decision in our register, not a gap.

`NO EVIDENCE` in this domain: no page in this corpus states an RTL testing strategy, an `intl()` or
locale API, a font stack per script, or a bidirectional-punctuation rule — the CJK/Arabic pages name the
problem, not the fix.
