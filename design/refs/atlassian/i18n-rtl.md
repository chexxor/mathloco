# Atlassian — i18n / RTL

Domain 17 of the fixed 18. Status: **PARTIAL, and the partiality is the finding**: nine localization
rules exist across four machine docs; exactly **one** right-to-left sentence exists in the whole
corpus, and it is a bullet with no mechanism. Nothing about mirroring, flipped spacing, or logical
properties was found anywhere (searched: `rtl`, `right to left`, `mirror`, `bidirect`, `direction`).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A17-i18n-01 | Right-to-left is **asserted as a requirement and never specified** — the only RTL statement in the corpus. | rule | `https://atlassian.design/llms-a11y.txt#Internationalization` | "Support right-to-left languages" | none |
| A17-i18n-02 | Localization is tested, which is the one thing their checklist adds to an RTL claim. | rule | `https://atlassian.design/llms-a11y.txt#Internationalization` | "Test with translated content" | none |
| A17-i18n-03 | Translatability decides the mechanism: hidden text, not an attribute. | rule | `https://atlassian.design/llms-a11y.txt#Internationalization` | "Use `VisuallyHidden` instead of `aria-label` for better translation support" | none |
| A17-i18n-04 | Option order is a localization rule: alphabetical ordering is refused **because it is not localizable**. | rule | `https://atlassian.design/llms-components.txt#Select-component` | "Avoid alphabetical ordering (not localizable); use logical order for translatable option lists" | none |
| A17-i18n-05 | Imagery carries a localization rule and a cultural one in the same sentence. | rule | `https://atlassian.design/llms-components.txt#EmptyState-component` | "Consider i18n for illustrations (e.g. culturally neutral imagery, translatable alt text)" | none |
| A17-i18n-06 | The same rule on the page, written as the failure mode. | rule | `https://atlassian.design/components/empty-state/usage#Illustrations` | "Using an image as a metaphor may not translate to all cultures and languages. When choosing imagery, consider internationalization." | none |
| A17-i18n-07 | Time format is a prop, not a locale sniff. | pattern | `https://atlassian.design/llms-components.txt#TimePicker-component` | "Use locale prop for time format localization (e.g. 12h vs 24h)" | lint (prop) |
| A17-i18n-08 | A hard-coded announcement string is a defect, named at the prop. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/button-Package` | "This should be localized when the product is displayed in a non-English locale." | lint (prop type) |
| A17-i18n-09 | Even navigation labels are localized data with stated defaults. | token | `https://atlassian.design/llms-components.txt#Dynamic-table-component` | "Labels for the previous and next buttons used in pagination. Defaults to \"Previous\" and \"Next\"." | lint |
| A17-i18n-10 | Their only bidirectional affordance is a **warning about** bidi, not a layout rule. | behavior | `https://atlassian.design/llms-components.txt#Code-component` | "Bidirectional characters change the order that text is rendered. This could be used to obscure malicious code." | none (a tooltip default) |
| A17-i18n-11 | Spelling is a locale choice with an explicit exception, and the exception is a people-rule. | rule | `https://atlassian.design/llms-content.txt#22-US-English` | "Developers should code in US English" | none |
| A17-i18n-12 | **Absence:** no mirroring, logical-property, flipped-spacing or RTL breakpoint rule exists in any fetched artifact. | absence | `https://atlassian.design/llms-a11y.txt#Internationalization` | "Support right-to-left languages" | none |

**Read against our system:** our artifacts are monolingual (English) and LTR, and nothing states that
this is a **decision** rather than an absence — the same register D102 used to refuse a signal hue.
Rows 04, 06, 08, 09 are live gaps for surfaces we ship (the filter option lists and the printed nav
labels are exactly the two things their rules cover). Row 01/12 together are the finding to carry
into `GAP-ANALYSIS.md`: Atlassian is **behind us** on RTL the way Carbon is behind on enforcement —
an asserted requirement with no mechanism — so an RTL ruling may not be copied from here, only from
our own evidence, and the ranking of any RTL gap must cite the sources that have a *mechanism*
(Material's bidirectionality page, if it yields one) rather than this sentence.
