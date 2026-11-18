# Carbon — spacing & rhythm

Domain 3 of the fixed 18. Status: **EVIDENCED**.
Pages reached: `…/foundations/spacing/overview`, `…/foundations/2x-grid/overview`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C3-space-01 | Their base unit is an 8px square "mini unit"; every margin, padding, box and gutter is a multiple of it. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview#mini-unit` | "The basic unit of 2x Grid geometry is the 8-pixel square mini unit." | none |
| C3-space-02 | The spacing scale is 13 tokens, 2px → 160px, and it is built from multiples of two, four and eight. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview#spacing-scale` | "The Carbon spacing scale complements the 2x Grid and typography scale by using multiples of two, four, and eight." | none — `$spacing-01`…`$spacing-13` ship in `@carbon/styles` |
| C3-space-03 | Each scale step has its own token name; the number is the step, not the size. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview#spacing-scale` | "Each level of the spacing scale has its own token." | none |
| C3-space-04 | Padding is fixed regardless of breakpoint: 16px at all standard breakpoints; margins are fixed within a breakpoint even when columns are fluid. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview#padding` | "Padding is always a fixed multiple of mini units: 16 pixels at all standard breakpoints." | none |
| C3-space-05 | Type is aligned **to** the padding edge, never onto it — a rhythm rule stated as a pair of do/don't. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview#padding` | "Always place type against the padding. … Never place type on the padding." | none |
| C3-space-06 | Rhythm is made by dividing or multiplying by two; fluid grids divide, fixed grids multiply, and the two agree at breakpoints. | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview#2x-grid-fundamentals` | "The core concept of the 2x Grid is to divide or multiply by two, forming a visual rhythm." | none |
| C3-space-07 | Density is a decision with a named trigger: "For dense content, use mini units for further alignment and spatial guidance." | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview#decision-tree` | "For dense content, use mini units for further alignment and spatial guidance." | none |
| C3-space-08 | Form-field spacing is decided by context (page vs container) and stated in px: 40px input height, 32px between fields on a page, 24px or 16px inside panels. | token | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#spacing` | "Individual input fields default to a 40px height in product regardless of context." | none |
| C3-space-09 | Group spacing is defined *relative* to item spacing, not absolutely: 24px between items → 32px before a section; 32px → 40px. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#spacing` | "Spacing between groups should be adjusted in relationship to spacing between individual items." | none |
| C3-space-10 | One specific spacer is named for the last input → action boundary: 48px. | token | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#spacing` | "As a general rule, we recommend a 48px spacer between the last input and the button or button group." | none |
| C3-space-11 | They refuse to fix some rhythm: "Carbon does not have consolidated guidance around rules within forms (i.e. width, thickness, vertical margins)." | absence | `https://www.carbondesignsystem.com/building-blocks/core/patterns/forms#rules` | "Carbon does not have consolidated guidance around rules within forms" | none — and they say so, rather than leaving it to be inferred |

**Read against our system:** we have 8 steps on a 4px ladder, they have 13 on an 8px grid; ours is
tighter and every step is named in one `@theme`. C3-space-09 and C3-space-10 are the transferable
part: our scale has no **relational** step, so "what separates a section from a field" is ours to
derive rather than to pick. C3-space-11 is a system that admits its own silence — the same register
`DESIGN.md` already uses when it refuses a value.
