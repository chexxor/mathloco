# Carbon — elevation & surfaces

Domain 5 of the fixed 18. Status: **EVIDENCED, by answering a different question than ours.**
Carbon's answer to "what is above what" is **layering** — a named ladder of surface values — and the
fetched pages carry no elevation scale, no shadow ramp and no z vocabulary. That disagreement is the
finding, and it is recorded as such rather than mapped onto our `shadow-e1`/`shadow-e2`.

Pages reached: `…/foundations/color/overview`, `…/foundations/themes/overview`,
`…/components/popover/guidelines`, `…/patterns/status-indicators`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C5-elev-01 | Surfaces are addressed by role-group: stacked backgrounds get their own token group, and it includes the layering tokens. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#core-tokens` | "Stacked backgrounds (includes layering tokens)" | none |
| C5-elev-02 | The ladder is stated per theme: light themes alternate White/Gray 10 per layer; dark themes step one lighter per layer. | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#layering-model` | "In the dark themes, layers become one step lighter with each added layer." | none |
| C5-elev-03 | The number of layers is bounded by the theme's own cycle (three layers named for the White theme). | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#light-themes` | "The second layer uses White and the third layer used Gray 10." | none |
| C5-elev-04 | A component's container color is picked **from the layer ladder**, never off-palette: popover ships in `$layer-01`, `$layer-02`, or `$background-inverse`. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/popover/guidelines#container` | "Popovers are most commonly used in these three different container colors—`$layer-01`, `$layer-02`, and `$background-inverse`." | none |
| C5-elev-05 | Inverting a ground is a deliberate act for attention, and it is pre-baked for some components. | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#high-contrast-moments` | "Some high contrast moments are baked into the themes by using the inverse tokens, like the tooltip component." | none |
| C5-elev-06 | Inverse theming can be applied inline to one region of a page. | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#high-contrast-moments` | "Other times high contrast moments can be achieved through applying inline theming for instances like a dark UI Shell Header with a light theme page." | none |
| C5-elev-07 | They refuse one depth move outright: never go darker than the ground outside high-contrast mode. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#high-contrast-moments` | "Do not apply components that are darker than the background unless using high-contrast mode." | none |
| C5-elev-08 | A `shadow` token group is not in their core token list; the group that carries depth is called **layering**, and it is a colour group, not a shadow scale. | absence | `https://www.carbondesignsystem.com/building-blocks/foundations/color/overview#core-tokens` | "Some core tokens are part of an additional token group called layering tokens. These tokens are used to implement the layering model onto components." | none |

**Read against our system:** we say *hairline means on the page, shadow means above it*; they say
*above it means the next layer value, and shadow means nothing in the token vocabulary*. Two
different answers to the same question, so this domain is `DIVERGENT-KEEP`-shaped, not a gap —
except in one direction: their C5-elev-04 rule (a container's surface must come from the ladder) is
a constraint our system can currently satisfy by accident, because no modal or dropdown is in `src/`
today and the ladder has no roles for a surface that floats.
