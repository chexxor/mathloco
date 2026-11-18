# Atlassian — radius & shape

Domain 4 of the fixed 18. Status: **EVIDENCED** (complete: the radius scale is printed in the
registry, so no partiality here — unlike Carbon's, where the scale page does not exist).

Artifacts reached: `https://atlassian.design/llms-tokens.txt#Border-Radius`,
`https://atlassian.design/llms-styling.txt`,
`https://atlassian.design/llms-tokens.txt#Border-Width`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A04-radius-01 | A radius scale exists globally, has a base, and the base is **not the smallest step**. | token | `https://atlassian.design/llms-tokens.txt#Border-Radius` | "Border radius tokens define corner curvature. Base is `radius.small`" | lint (closed set) |
| A04-radius-02 | Each step names the object it rounds, and the objects are component classes: badges, labels, buttons and inputs, cards, modals. | token | `https://atlassian.design/llms-tokens.txt#Border-Radius` | "radius.medium \| 6px \| 0.375rem \| Buttons and inputs" | lint |
| A04-radius-03 | The modal step is larger than the card step, so radius tracks layer, not size alone. | token | `https://atlassian.design/llms-tokens.txt#Border-Radius` | "radius.xlarge \| 12px \| 0.75rem \| Modals/large containers" | none for the pairing |
| A04-radius-04 | The largest step carries an adverb of restraint in the scale itself. | rule | `https://atlassian.design/llms-tokens.txt#Border-Radius` | "radius.xxlarge \| 16px \| 1rem \| Largest containers (sparingly)" | none for the adverb; lint for the value |
| A04-radius-05 | A full round is **one number, deliberately absurd**: 9999px, so the value never has to be right. | token | `https://atlassian.design/llms-tokens.txt#Border-Radius` | "radius.full \| 9999px \| 624.9375rem \| Circular elements" | lint |
| A04-radius-06 | Border thickness is a scale too, and two of its steps are *states*: selected and focused. | token | `https://atlassian.design/llms-tokens.txt#Border-Width` | "border.width.focused \| 2px \| 0.125rem \| Focus states" | lint |
| A04-radius-07 | A rejected radius is diagnosed by the value: if it fails, it was never legal. | pattern | `https://atlassian.design/llms-styling.txt#Common-issues` | "If a CSS value is failing, that value is not allowed, you typically require a token value" | lint (typescript contract) |
| A04-radius-08 | **Absence:** no shape language beyond radius — no rule about corner treatment per layer, and no radius role names for surfaces. | absence | `https://atlassian.design/llms-tokens.txt#Border-Radius` | "Border radius tokens define corner curvature." | none |

**Read against our system:** our radius is one base (6px), two roles, and **no pill**. Row 05 is the
divergence to keep, not to steal: `radius.full` at 9999px is a shape decision we have already refused
(a pill on a button makes the control read as a chip; D-scope of the radius ruling), and their own
scale says the step above it is "sparingly" — i.e. they too treat the maximal round as an exception.
Rows 02/03 do travel as a *reasoning* pattern: they bind a radius to the object class and make the
overlay's radius larger than the card's, which is the same "hairline means on the page, shadow means
above it" split our system uses for elevation — we keep one radius for both layers, they separate
them. Row 06 answers a silence we have: our focus indicator carries a color but no width role, so
`border.width.focused` is the closest thing in any of the five systems to a token our focus rule
would need (a GAP row in §2). Row 07 is the enforcement register we should note in §3: their model
makes legality a *type* error at write time rather than a gate at ship time.
