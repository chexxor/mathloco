# Carbon — radius & shape

Domain 4 of the fixed 18. Status: **PARTIAL**. Carbon states a corner radius only where a specific
component needs one; the page index names no global radius scale, and grepping the 28 fetched pages
for `radius`, `corner`, `pill` returns one component rule plus one geometry discussion. The thinness
is the finding; it is not smoothed into a scale.

Pages reached: `…/components/popover/guidelines`, `…/patterns/status-indicators`,
`…/components/button/guidelines`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C4-shape-01 | Radius is decided per component and published as a number: popover corners are 2px, and straight corners are a named alternative with a trigger. | token | `https://www.carbondesignsystem.com/building-blocks/core/components/popover/guidelines#corners` | "A popover container has rounded corners by default and the corner radius is set to 2px." | none — the value ships in the component CSS |
| C4-shape-02 | The trigger for the alternative: connect the corner when the container must read as continuous with the layer under it. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/components/popover/guidelines#corners` | "Use straight corners when the popover structure contains a tab tip and is connected to a toolbar or header to keep clean lines between the popover and the layer underneath." | none |
| C4-shape-03 | Shape carries meaning: straight lines and 90° read as structure and order, curves as continuity and connection. | pattern | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#status-shapes` | "shapes with straight lines and 90 degree angles usually convey structure and order—like the grid." | none |
| C4-shape-04 | Reusing a learned shape is a hazard: "Using shapes incorrectly can disturb learned recognition patterns and confuse users". | rule | `https://www.carbondesignsystem.com/building-blocks/core/patterns/status-indicators#status-shapes` | "Using shapes incorrectly can disturb learned recognition patterns and confuse users, possibly hurting their overall experience." | none |
| C4-shape-05 | No pill, no radius ladder, no per-component radius token list was found on any of the 28 fetched pages. | absence | `https://www.carbondesignsystem.com/building-blocks/core/components/popover/guidelines#corners` | "A popover container has rounded corners by default and the corner radius is set to 2px." | none — the absence, not the quote, is the claim |

**Read against our system:** ours is a base radius (6px) with two roles and no pill, which is
*different* from theirs (2px, per component, no scale). Both are small; the transferable part is
C4-shape-02 — a corner is decided by whether the box must read as continuous with its ground, which
is the same sentence our hairline/shadow binary makes. C4-shape-04 belongs to our iconography domain
more than to radius, and we have nothing there today.
