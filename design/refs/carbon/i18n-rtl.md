# Carbon — i18n / RTL

Domain 17 of the fixed 18. Status: **PARTIAL** — three RTL rules found, in three different pages,
and no localization page in the entry point's index. That is enough to establish that they treat
mirroring as a **component-level property** rather than as a document-level one, which is the
transferable idea.

Pages reached: `…/components/button/guidelines`, `…/components/menu/guidelines`,
`…/core/patterns/search`, `…/foundations/content`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C17-rtl-01 | Mirroring is stated per component and includes alignment of the parts: the whole button flips, label right, icon left. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#internationalization-rtl` | "For right-to-left (RTL) languages, the entire button is mirrored horizontally. The label is right-aligned and the icon is left-aligned." | none |
| C17-rtl-02 | Mirroring carries function, not just geometry: the caret direction **and the keyboard shortcuts** flip with it. | behavior | `https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines#right-to-left-rtl` | "For RTL (right-to-left) languages, the entire menu is mirrored horizontally, including the direction of the caret and keyboard shortcuts." | none |
| C17-rtl-03 | A control with no label still has to read in another language: the search box flips, and the icon is the part that is safe across scripts. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/search#localize-the-search-field` | "For languages that read right to left, flip the layout of the search box as shown in the next example." | none |
| C17-rtl-04 | The icon is asserted as script-neutral: "The search icon is recognized and acceptable across languages and countries." | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/search#localize-the-search-field` | "The search icon is recognized and acceptable across languages and countries." | none |
| C17-rtl-05 | Translation is a cost already priced into their label rule: exceptions exist where button length "could … negatively impact translation". | rule | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#button-label` | "There are exceptions to this rule for situations in which button length could cause problems in compact UIs or negatively impact translation" | none |
| C17-rtl-06 | Word count is a translation lever they name: labels are one to three words. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#labels` | "Labels are not helper text; be succinct. Use one to three words only." | none |
| C17-rtl-07 | Language and terminology are governed as a **resource** ("Language and grammar", "Terminology", "Punctuation", "Numbers"), not as tokens — a whole subsystem we do not have and would not express the same way. | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/content#content-foundations` | "Terminology management promotes the consistent use of standardized terms across IBM." | none |
| C17-rtl-08 | No `lang` attribute, no `dir` attribute, no CSS logical-property rule appears in any of the 28 fetched pages. | absence | `https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines#right-to-left-rtl` | "For RTL (right-to-left) languages, the entire menu is mirrored horizontally" | none — the *absence of an implementation rule* is the claim; they state the effect, not how to code it |

**Read against our system:** our copy is English and single-direction, so no row here is a gap in what
ships. The two that change our future cost are C17-rtl-08 (any physical `left:`/`right:` padding in
`src/styles/global.css` is a decision that will not survive a second script) and C17-rtl-05/06 — a
label built as `{verb} + {noun}` with a word budget is the only label grammar that survives
translation, and ours has no stated grammar at all.
