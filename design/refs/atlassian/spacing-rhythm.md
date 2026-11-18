# Atlassian — spacing & rhythm

Domain 3 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-tokens.txt#Spacing`,
`https://atlassian.design/llms-primitives.txt`,
`https://atlassian.design/llms-components.txt` (lozenge, empty-state blocks),
`https://atlassian.design/components/empty-state/usage#Behavior`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A03-space-01 | A spacing scale has a **base step named in the scale's own name**: the base is `space.100`, i.e. the step number counts in hundredths of the base. | token | `https://atlassian.design/llms-tokens.txt#Spacing` | "Spacing tokens maintain consistent spacing. Base is `space.100`" | lint (closed set; the naming is part of the name) |
| A03-space-02 | The scale is 14 steps, 0 → 80px, and each step's *usage* cell is a density word, not a role. | token | `https://atlassian.design/llms-tokens.txt#Spacing` | "space.025 \| 2px \| 0.125rem \| Compact UI" | lint |
| A03-space-03 | Density is declared in tiers across the scale: Compact / Less dense / Large / Largest UI. | pattern | `https://atlassian.design/llms-tokens.txt#Spacing` | "space.800 \| 64px \| 4rem \| Largest UI" | none |
| A03-space-04 | Negative spacing is **in the scale**, with its own naming and its own usage words. | token | `https://atlassian.design/llms-tokens.txt#Negative-Spacing` | "Negative spacing tokens negate parent whitespace:" | lint |
| A03-space-05 | The negative step has a primitive named for it, so overlap is a component, not a magic margin. | pattern | `https://atlassian.design/llms-primitives.txt#Bleed` | "`Bleed`: Controls negative whitespace" | lint (props contract) |
| A03-space-06 | In primitives, spacing is passed as a **bare token name**, and `token()` is for the CSS call sites only. | pattern | `https://atlassian.design/llms-primitives.txt#Best-Practices` | "Use direct token strings in Primitive props (e.g., `space=\"space.200\"`), but use `token()` elsewhere" | lint (props contract refuses other values) |
| A03-space-07 | Layout widths are stated against a **named column grid**: 464px wide is six columns, 304px narrow is four. | behavior | `https://atlassian.design/components/empty-state/usage#Behavior` | "The default width, wide , is 464px. This is based on six columns in the cozy grid system." | none |
| A03-space-08 | The grid system has a **name and a density** ("cozy"), which means another density exists. | pattern | `https://atlassian.design/components/empty-state/usage#Behavior` | "Use this for empty states in containers smaller than the default width." | none |
| A03-space-09 | A component's spacing is a prop with two settings, and the roomier one states the height it produces. | token | `https://atlassian.design/llms-components.txt#@atlaskit/lozenge-Package` | "`spacious` increases padding and sets the lozenge height to 32px." | lint (enum prop) |
| A03-space-10 | Style values are bounded by a permitted-subset contract, so a spacing literal is refused at the prop boundary. | pattern | `https://atlassian.design/llms-components.txt#Box-component` | "Apply a subset of permitted styles powered by Atlassian Design System design tokens." | lint (the xcss type contract) |
| A03-space-11 | **Absence:** no rhythm rule — nothing in any fetched artifact says when to use one step rather than the next, or forbids mixing tiers on one screen. | absence | `https://atlassian.design/llms-tokens.txt#Spacing` | "Spacing tokens maintain consistent spacing." | none |

**Read against our system:** theirs is 14 steps with two directions and density words; ours is an
eight-step 4px ladder with *"**Never** use a step outside that set"* and a `check:space` that
measures it. Two things travel here and one does not:

- **Travels (GAP-shaped):** rows 04/05 — we have no negative step in our ladder and no rule refusing
  an ad-hoc negative margin; theirs makes overlap a named thing. Row 07/08 — their widths are
  justified by a *grid they can name*, which is the reason we should be able to name our own column
  logic; DESIGN.md states max width and nav width without an underlying grid.
- **Does not travel:** their 8px-ish base and density tiers answer their density model
  (compact → cozy → large UI), which is not our ladder; adopting their scale would replace a set our
  gates already measure. Their `space.100`-base naming is worth stealing as a *name* only
  (`§4` candidate), not as a scale.
