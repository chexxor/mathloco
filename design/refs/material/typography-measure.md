# Material — typography & measure (domain 2)

Domain 2 of the fixed 18 (see `../README.md`). Status: **EVIDENCED** — three pages:
`m2.material.io/design/typography/the-type-system.html`, `m2.material.io/design/typography/understanding-typography.html`,
and (reached through the twin) `material.io/design/typography/language-support.html`. The scale is stated
as named categories with sizes, letter-spacing and case; the numbers are in prose and tables.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M2-type-01 | Their type scale is a closed set of thirteen named categories, not a ratio. | token | `https://m2.material.io/design/typography/the-type-system.html#type-scale` | "The type scale is a combination of thirteen styles that are supported by the type system." | none — the scale is a page; the machine artifact is a generator, not a token file |
| M2-type-02 | Hierarchy inside the scale is carried by weight, size, letter-spacing and case at once. | pattern | `https://m2.material.io/design/typography/the-type-system.html#example-type-scale` | "Hierarchy is communicated through differences in font weight (Light, Medium, Regular), size, letter spacing, and case." | none |
| M2-type-03 | The web unit is `rem`, and the conversion is stated against the browser default. | token | `https://m2.material.io/design/typography/the-type-system.html#font-size-units` | "Web browsers calculate the REM (the root em size) based on the root element size. The default for modern web browsers is 16px, so the conversion is SP_SIZE/16 = rem." | none |
| M2-type-04 | Headlines are for short, important text, and the expressive-font permission is granted by role, not by size. | rule | `https://m2.material.io/design/typography/the-type-system.html#headlines` | "Headlines are the largest text on the screen, reserved for short, important text or numerals." | none |
| M2-type-05 | Body text may not use an expressive font — a refusal stated against the role. | rule | `https://m2.material.io/design/typography/the-type-system.html#body` | "Don't use expressive fonts for body text." | none |
| M2-type-06 | Type sits on a 4dp baseline grid and the line-height must be divisible by 4 to keep it. | pattern | `https://m2.material.io/design/typography/understanding-typography.html#4dp-grid` | "Regardless of pt / sp size, a text's baseline must sit on the 4dp grid. Line-height must be a value divisible by 4 to maintain the grid." | none — no build step measures a line-height |
| M2-type-07 | Distances are measured **from the baseline**, not from a bounding box, and the reason is stated. | pattern | `https://m2.material.io/design/typography/understanding-typography.html#measurement-from-the-baseline` | "Reference baselines for vertical alignment, instead of bounding boxes. This produces more accurate implementation across design software and platforms." | none |
| M2-type-08 | Their measure is a character count, with a second rule for wide lines. | token | `https://m2.material.io/design/typography/understanding-typography.html#line-length` | "The ideal line length is 40-60 characters per line for English body text." | none |
| M2-type-09 | A long line is not allowed to stay at the same leading — the leading moves with the measure. | rule | `https://m2.material.io/design/typography/understanding-typography.html#line-length` | "In areas with wider line lengths, such as desktop, longer lines that contain up to 120 characters will need an increased line height from 20sp to 24sp." | none |
| M2-type-10 | Numbers in a table are a typographic role: tabular figures, so values stay optically aligned. | pattern | `https://m2.material.io/design/typography/understanding-typography.html#tabular-figures` | "Use tabular figures (also known as monospaced numbers), rather than proportional digits, in tables or places where values may change often." | none |
| M2-type-11 | Paragraph spacing is a multiple of the type size, bounded on both sides. | rule | `https://m2.material.io/design/typography/understanding-typography.html#paragraph-spacing` | "Keep paragraph spacing in the range between .75x and 1.25x of the type size." | none |
| M2-type-12 | A script can be too tall or too dense for the Latin scale, and the fix is line height and weight, not a new size. | rule | `https://material.io/design/typography/language-support.html#tall-script-considerations` | "Noto supports tall scripts used in South and Southeast Asian and Middle Eastern languages, including Arabic, Hindi, and Thai. Use regular weight, as medium weight is unavailable in Noto." | none |

**Read against our system:** ours is a 1.200 ramp of nine steps with leading carried **by the size token**,
and a prose block capped at `max-w-measure` — so their model is the same shape (roles, not a ratio) reached
from the other side: a closed named set, an explicit character-count measure, and a leading rule that moves.
Row 07 is the divergence worth naming: they bind type to a 4dp baseline multiple, we bind leading to the
size token; the shared invariant is that leading is a function of size, and ours states it once. Row 09
measures in characters (40–60, up to 120 with more leading); ours measures in em (32em ≈ 70 serif
characters) — the same intent, one unit cheaper to enforce. Row 11 is a rule we are SILENT on and should
not be: a schedule page that shows numbers needs the digits to align optically.
