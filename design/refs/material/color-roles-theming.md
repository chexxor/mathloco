# Material — color roles & theming (domain 1)

Domain 1 of the fixed 18 (see `../README.md`). Status: **EVIDENCED**, through four pages:
`m2.material.io/design/color/color-usage.html`, `m2.material.io/design/color/dark-theme.html`, `m2.material.io/design/color/text-legibility.html`,
`m2.material.io/design/material-theming/overview.html`. The palette pages themselves (`the-color-system`,
`applying-color-to-ui`) were reached and returned the shell — see `COVERAGE.md`. No hue from this
system is proposed anywhere: the corpus has no colour authority over us, and the palette is unreachable
anyway (`PRIOR.md`).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M1-col-01 | Emphasis is a **contrast** property, not a size or a weight: an element reads as important because it contrasts with its surroundings. | rule | `https://m2.material.io/design/color/color-usage.html#hierarchy` | "When an element's color contrasts with its surroundings, that element stands out, so users can tell it's important." | none — prose on a docs page; nothing in any product checks it |
| M1-col-02 | Colour attention is rationed: limiting colour everywhere else is what makes the areas that do receive colour legible. | rule | `https://m2.material.io/design/color/color-usage.html#limiting-color` | "By limiting the use of color in your app, the areas that do receive color gain more attention, such as text, images, and individual elements like buttons." | none |
| M1-col-03 | A colour's meaning is a product-wide invariant: the same colour must mean the same thing when the context changes. | rule | `https://m2.material.io/design/color/color-usage.html#consistency-and-context` | "Color should be used consistently in a product, so that certain colors always mean the same thing, even if the context changes." | none |
| M1-col-04 | Locale is a colour hazard, stated: red-for-alerts is not true in every culture. | rule | `https://m2.material.io/design/color/color-usage.html#consistency-and-context` | "Attention should also be given to colors with local or cultural significance." | none |
| M1-col-05 | A brand colour and a semantic colour may not be the same colour. | rule | `https://m2.material.io/design/color/color-usage.html#meaning` | "Since red is a brand color, don't also use it to convey an error state." | none — the refusal is a sentence, and nothing fails if a product ignores it |
| M1-col-06 | A state change must be signalled in more than colour, because a colour delta can be missed. | rule | `https://m2.material.io/design/color/color-usage.html#state` | "It's best to indicate a change of state in more than one way, such as by displaying an icon or moving the location of an element." | none |
| M1-col-07 | Emphasis can be bought by changing shape and colour together, and that combination is reserved for selection or immediate attention. | pattern | `https://m2.material.io/design/color/color-usage.html#color-and-shape` | "Visual emphasis is given to an element that changes both color and shape at the same time." | none |
| M1-col-08 | A dark theme is specified as four named properties — Contrast, Depth, Desaturation, Limited color — each with a number. | token | `https://m2.material.io/design/color/dark-theme.html#properties` | "Dark surfaces and 100% white body text have a contrast level of at least 15.8:1" | none — the ratio is quoted, never computed by anything |
| M1-col-09 | Desaturation is a **per-ground** requirement, not a style preference: saturated hues fail 4.5:1 against dark surfaces. | rule | `https://m2.material.io/design/color/dark-theme.html#desaturated-colors-for-accessibility` | "A dark theme should avoid using saturated colors, as they don't pass WCAG's accessibility standard of at least 4.5:1 for body text against dark surfaces." | none |
| M1-col-10 | A brand surface in a dark theme is built by compositing the brand over the named ground, and the ground is named as a hex. | pattern | `https://m2.material.io/design/color/dark-theme.html#accessibility-and-contrast` | "To create branded dark surfaces, overlay the primary brand color at a low opacity over the recommended dark theme surface color (#121212)." | none |
| M1-col-11 | A theme is a set of attribute values per element, published as a table of defaults beside the custom values. | pattern | `https://m2.material.io/design/material-theming/overview.html#default-and-customized-values` | "Buttons have the following attributes and default values, with customizations for this example indicated in bold." | none — the table is prose; the machine artifact is Figma, not a file |
| M1-col-12 | Their theming mechanism is advertised as a design-to-code bridge with explicit values, and it is the strongest claim this system makes about governance. | pattern | `https://m2.material.io/design/material-theming/overview.html#what-is-material-theming` | "These tools allow easy switching between design and code workflows by providing specific values for all customizable attributes." | none stated — no token file, no lint, no gate on any fetched page |

**Read against our system:** rows 01–03 and 05 are the model our own colour roles already commit to, and
ours is stricter: our palette is named by role with `-on-ink` twins (a number quoted without its ground is
not a fact), and `check:contrast` fails any paint literal in `src/` outside `src/styles/global.css`. Row
05 is a refusal our system already holds in a stronger form — we carry **no signal hue at all**, so there
is no brand red to collide with an error state (the severity of a notice is carried by its keyline and word).
Row 08 is the same shape as our `-on-ink` claim (a ratio stated against a named surface) and is the closest
thing in this corpus to a rule our `check:contrast` enforces. Row 11–12 are where this system is **behind**
us: it publishes default values as prose tables and no machine file, so a rename inside their own system
is a hunt, whereas ours is a single `@theme` block a gate reads.
