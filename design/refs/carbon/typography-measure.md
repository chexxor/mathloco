# Carbon — typography & measure

Domain 2 of the fixed 18. Status: **EVIDENCED for scale/weights; PARTIAL for measure** — Carbon
generates its ramp from a formula and names no line-length cap; the search for one
(`line length`, `characters per line`, `measure`) returned nothing on the four type/layout pages
fetched. The absence is recorded as a row, not filled from memory.

Pages reached: `…/foundations/typography/overview`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C2-type-01 | The type ramp is a formula, not a hand-picked list. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview#type-tokens-and-sets` | "The IBM type scale is built on a single equation. … The formula assumes that y₀=12 px." | none — the resulting sizes ship as type tokens |
| C2-type-02 | The formula is printed. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview#type-tokens-and-sets` | "Xn = Xn-1 + {INT[(n-2)/4] + 1} \* 2" | none |
| C2-type-03 | Type tokens bundle size **and** weight **and** leading: one token, three properties. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview#type-tokens-and-sets` | "Type tokens are pre-set configurations of typographic elements such as font size, weight, or leading (line height) that are specifically calibrated for use alongside IBM Plex in product." | none |
| C2-type-04 | Two type sets — productive (`-01` styles) and expressive (`-02`) — split "task" from "show". | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview#type-tokens-and-sets` | "These type styles are excellent for long form reading and scanning, but would be distracting if used in product." | none |
| C2-type-05 | Weight is capped for reading: semibold is for headers, not long text. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview#typeface-ibm-plex` | "We suggest using IBM Plex Light, Regular, and SemiBold for digital experiences. The semibold weight is ideal for section headers, but should not be used for long text." | none |
| C2-type-06 | Heading hierarchy comes from token names (`$productive-heading-03`), and the form heading is the largest size in the form hierarchy. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#layout` | "IBM Product UI often uses the `$productive-heading-03` token for this purpose if the form is within a container or a dialog." | none |
| C2-type-07 | Body copy size is decided by pairing with a control, not chosen freely: large button pairs with 14px body, expressive large with 16px. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines#button-sizes` | "This is the most common button size in software products. Pairs with 14px body copy." | none |
| C2-type-08 | Sentence-style capitalization is the rule for all text, except proper nouns. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/content#capitalization` | "Use sentence-style capitalization for headings, titles, labels, banners, and similar elements, unless noted otherwise." | none |
| C2-type-09 | Labels have a word budget: one to three words, and they are not helper text. | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#labels` | "Labels are not helper text; be succinct. Use one to three words only." | none |
| C2-type-10 | A component's label type token is fixed by component size (small breadcrumb = `$label-01`, medium = `$body-compact-01`). | token | `https://www.carbondesignsystem.com/building-blocks/core/components/breadcrumb/guidelines#sizing` | "The small breadcrumb uses the `$label-01` type token, while the medium breadcrumb uses the `$body-compact-01` type token." | none |
| C2-type-11 | No measure cap is stated anywhere in the type, content or grid pages fetched; their line control is the **column** (fluid grid, gutter 32px), not a character count. | absence | `https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview#gutters` | "The margin around each grid box matches its padding, for a total gutter of 32 pixels." | none |

**Read against our system:** C2-type-03 matches our decision to carry leading with the size token.
C2-type-04 is a two-register type system we do not have and do not need at one screen per page.
C2-type-11 is the interesting direction: we cap a prose block at `max-w-measure` (32em) and they do
not — our rule is ahead of theirs, so it is evidence to keep, not a gap.
