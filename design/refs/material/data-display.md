# Material — data display (tables, lists, empty states) (domain 12)

Domain 12 of the fixed 18 (see `../README.md`). Status: **EVIDENCED, and almost entirely about *charts***
— `m2.material.io/design/communication/data-visualization.html` (17,817 B) is the only page here that speaks about
displaying data, and it speaks about graphs, not tables or lists. The word "table" appears in it only
inside density prose (`applying-density.html`) and chart-annotation prose. What our system ships is
**lists and dated rows**, so the transferable grain is the legibility rules, not the chart taxonomy.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M12-data-01 | **CONTESTED inside one page.** The zero baseline is stated against the x-axis in prose and the baseline is defined on the y-axis in the same section. | CONTESTED | `https://m2.material.io/design/communication/data-visualization.html#baseline-value` | "Bar charts should always start at the x-axis baseline value of zero. ... The baseline value is the starting value on the y-axis." | none — and nothing in the system resolves which axis carries the start value |
| M12-data-02 | A common baseline is a *comparison* affordance: because charts share a baseline, differences are readable from length. | pattern | `https://m2.material.io/design/communication/data-visualization.html#bar-and-pie-charts` | "Bar charts express quantities through a bar's length, using a common baseline ... Because all three of these charts share the same baseline of possible values, it's easier to compare value differences based on bar length." | none |
| M12-data-04 | A chart type is refused for a **specific misreading**, and the misreading is named. | rule | `https://m2.material.io/design/communication/data-visualization.html#bar-and-pie-charts` | "Don't use multiple pie charts to show changes over time." | none — the reason follows as a caption: "It's difficult to compare the difference in size across each slice of the pie." |
| M12-data-05 | Overlapping series is refused for an occlusion reason. | rule | `https://m2.material.io/design/communication/data-visualization.html#area-charts` | "Don't use overlapped area charts as it obscures data values and reduces readability." | none |
| M12-data-06 | Colour may not be the only carrier of meaning. | rule | `https://m2.material.io/design/communication/data-visualization.html#color-indicates-meaning` | "Don't use color alone to indicate meaning." | none |
| M12-data-07 | The access route for a colour-carried fact is named as a **list of alternatives**, which is what makes it implementable. | rule | `https://m2.material.io/design/communication/data-visualization.html#accessibility` | "To accommodate users who don't see color differences, you can use other methods to accentuate data, such as high-contrast shading, shape, or texture." | none |
| M12-data-08 | Text labels can remove a legend entirely, which is the same affordance a list gets from its own words. | pattern | `https://m2.material.io/design/communication/data-visualization.html#accessibility` | "Applying text labels to data also helps clarify its meaning, while eliminating the need for a legend." | none |
| M12-data-09 | An empty graph is allowed to show what to expect, and it is stated as a licence rather than a recipe. | pattern | `https://m2.material.io/design/communication/data-visualization.html#empty-states` | "Empty graphs and charts can display content that suggests what to expect when data is available." | none |
| M12-data-10 | Axis labels and legends are both bounded, in words. | rule | `https://m2.material.io/design/communication/data-visualization.html#axes-and-labels` | "Don't overload the chart with numerous axis labels." | none |
| M12-data-11 | Text in a graphic has an orientation rule, with the alternative spelled out. | rule | `https://m2.material.io/design/communication/data-visualization.html#text-orientation` | "Text labels should be placed horizontally on the chart so that they are easy to read." | none |
| M12-data-12 | A thing meant to be explored has to be sized for interaction, not for reading. | rule | `https://m2.material.io/design/communication/data-visualization.html#level-of-shape-detail` | "Data intended for close exploration should be represented by shapes that are suitable for interaction (in terms of touch target size and related affordances)." | none |
| M12-data-13 | A small display gets a **simplified version**, not a scaled one — and this is the only responsive-data rule in the corpus. | rule | `https://m2.material.io/design/communication/data-visualization.html#small-displays` | "Charts displayed on wearables (or other small screens) should be a simplified version of the mobile or desktop chart." | none |

**Read against our system.** What we ship in this domain is the schedule row, the thread list, and the
dated line — and we hold them to **gated** rules theirs has no analogue for:

- `check:row-geometry` requires every date row in the artifact to be two zones in order, with the date
  sentence wrapped in `<time datetime>` matching the row's `data-date`, and the emitted `--container-measure`
  inside DESIGN.md's 40–75 character band (D313, D397); `check:threads` requires the home page to paint
  exactly `min(cap, items)` bullets and to link "the rest of the list" when the set is larger (cap 6, 9 in
  `content.json`, 6 painted, 3 reachable @measured 2026-11-14 by `node scripts/check-threads.mjs`).
- Row 07 is the one rule in this file whose *shape* our system already enforces harder: our status is a
  **word** (`Scheduled` / `Cancelled` / `Past`) plus a keyline, and DESIGN.md refuses the colour-only
  version outright — *"**Never** use strikethrough or colour as the only status cue"*. Same rule, ours with
  a gate, theirs with a sentence.
- Row 09 is the empty-state grain for `loading-empty-error`: their version is a **licence** ("can display")
  and ours is a conversion — zero upcoming events becomes the notice grammar with a status word, a
  `text-lede` title, a 48px primary and a second path. Ours is already the stronger claim, so nothing here
  becomes a GAP row.
- Rows 01–02 and 04–06 and 10–13 are about charts, a domain we do not ship. The establishing probe (this session,
  @measured 2026-11-18): `grep -rnE '\bchart\b|\blegend\b|\baxis\b|<canvas' src` → **no matches**; and every
  `<svg>` in `src/` is an icon sprite, a platform mark, or the one line-art figure — 10 occurrences across
  8 files, all `aria-hidden` decorative or `role="img"` labelled drawings, none of them a data graphic. Any
  GAP row from those rows is a **draft** in §2's pre-loading block, and its exit criterion is the first time
  a data graphic is proposed for `src/`.
