# GOV.UK — i18n / RTL

Domain 17 of the fixed 18. Status: **PARTIAL — one right-to-left *requirement* sentence exists; no
mechanism does.** This system is the only one of the five that treats multilingual services as a
*service-design* problem rather than a component prop, and it is also the one that stops at the
sentence: nothing in the 26 fetched pages states how a layout flips.

Probe that establishes the mechanism's absence (run this session across every fetched body digest):
`grep -rilE '\b(dir=|rtl|bidirectional|logical)' body/govuk-*.txt` → **one file, and it is not about
CSS**: the hits are prose about "an end to end journey in logical steps" and "when there's no logical
or helpful order". No `dir` attribute, no `rtl`, no mirrored-spacing rule, no logical properties
(`start`/`end`), no flipped-keyline rule appears anywhere. The right-to-left sentence is a
**requirement with a pointer elsewhere**, and the pointer is W3C, which is not one of the five sources
and was not fetched.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G17-i18n-01 | Multilingual access is a **component**, and its job is stated: choosing and switching a language, not translating one. | rule | `https://design-system.service.gov.uk/components/language-navigation/` | "The Language navigation component helps users choose and switch between languages when using a service." | none |
| G17-i18n-02 | The component is refused unless the *whole page* exists in the other language — a partial translation is a defect, not a fallback. | rule | `https://design-system.service.gov.uk/components/language-navigation/#when-not-to-use-this-component` | "Do not use this component unless you can provide all the same key information on a page in another language." | none |
| G17-i18n-03 | Language names are the language's **own** name, not the English translation of it — the recognisability claim is stated with the reason. | pattern | `https://design-system.service.gov.uk/components/language-navigation/#how-it-works` | "Use the native name of each language, such as Cymraeg for Welsh." | none |
| G17-i18n-04 | The component explicitly does **not** translate; the content work is named as a separate, ongoing obligation. | behavior | `https://design-system.service.gov.uk/components/language-navigation/#how-it-works` | "The component does not translate content. You'll need to create, test and maintain content for all the languages you offer your service in." | none |
| G17-i18n-05 | Switching language must not lose state: entered data persists, and re-asking is refused. | behavior | `https://design-system.service.gov.uk/components/language-navigation/#how-it-works` | "Make sure the user does not lose any data they've entered when they navigate to another language. Do not ask the user to re-enter information they've already given." | none |
| G17-i18n-06 | Placement is one decision for the whole service, in all languages — the same object our system fixes for `s48` targets. | pattern | `https://design-system.service.gov.uk/components/language-navigation/#placement-on-pages` | "Choose a single consistent location that works best for your users." | none |
| G17-i18n-07 | The consistency claim is carried across the journey, with the user behaviour that makes it matter: switching as a comprehension check. | pattern | `https://design-system.service.gov.uk/components/language-navigation/#placement-on-pages` | "Use the same placement throughout your service in all languages. … some users often switch languages throughout their journey as a way to check their understanding of a page." | none |
| G17-i18n-08 | Hidden text and ARIA labels are **part of the component**, and they are declared translatable obligations rather than strings. | behavior | `https://design-system.service.gov.uk/components/language-navigation/#ensure-hidden-text-and-attributes-are-in-the-correct-languages` | "The code in this component contains a navigation landmark and some hidden text to help users, including users of assistive technology. Make sure to translate these attributes as needed." | none |
| G17-i18n-09 | A dark ground gets a **modifier class** rather than a new colour: the pair is a role, not a hue. | token | `https://design-system.service.gov.uk/components/language-navigation/#language-navigation-on-dark-backgrounds` | "Use the govuk-language-navigation--inverse modifier class to show white links and text on a dark background" | none |
| G17-i18n-10 | The dark-ground rule carries a hard threshold **and** the criterion number — the one place in this domain where a contrast bar is testable. | rule | `https://design-system.service.gov.uk/components/language-navigation/#language-navigation-on-dark-backgrounds` | "Make sure all users can see the language navigation … the background colour must have a contrast ratio of at least 4.5:1 with white to meet WCAG 2.2 success criterion 1.4.3 Contrast (minimum), level AA" | none |
| G17-i18n-11 | Right-to-left is stated as a **requirement on components and layouts**, with an example language and no mechanism. | behavior | `https://design-system.service.gov.uk/components/language-navigation/#internationalisation-and-localisation` | "For some languages, you'll need to modify components to make sure text displays well and is understandable by users of assistive technologies. … you'll need to make changes to components and layouts." | none |
| G17-i18n-12 | **Absence:** no `dir`, no logical property, no mirrored spacing anywhere in the corpus; the system points outward instead, and the outward pointer is named. | absence | `https://design-system.service.gov.uk/components/language-navigation/#internationalisation-and-localisation` | "See W3C's introduction to internationalisation for more about some of the things you might need to consider." | none |

**Read against our system:**

1. The transferable grain is G17-i18n-02, 05 and 08 — three **state-preservation and completeness
   contracts** (partial translation refused, entered data preserved, hidden text is part of the
   component). Our system ships no language switch, so none of these is a gap today; they are the
   contract that a future one would have to keep.
2. G17-i18n-10 is the only contrast bar in this domain, and our system already carries a stricter one
   at the same number for pressable things (DESIGN.md line 66). Nothing here raises a bar.
3. G17-i18n-09 is the same role-not-hue model our palette runs on: an `--inverse` modifier for a dark
   ground, which is our `surface`-role behaviour, not a new colour. It is cited as confirmation that a
   second system enforces the *inverse pair as a role*, which is why it is in this file rather than in
   `color-roles-theming.md`.
4. **No row here may become a colour, a spacing, or a layout recommendation.** A corpus that names one
   RTL sentence with no mechanism cannot support "we should mirror our spacing" — that claim would be
   ours, not theirs, and the gap analysis refuses it (see `GAP-ANALYSIS.md`).
