# Atlassian — elevation & surfaces

Domain 5 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-tokens.txt#Elevation`,
`https://atlassian.design/llms-components.txt` (blanket, modal-dialog, Select blocks),
`https://atlassian.design/components/modal-dialog/usage#Nesting`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A05-surf-01 | Elevation is first a **background layer**, and the layer has role names that describe what lives there. | token | `https://atlassian.design/llms-tokens.txt#Surface-Elevation` | "Surface elevation tokens define background layers:" | lint (closed set) |
| A05-surf-02 | The four surface roles are page, overlay, movable, grouped — and two of them are stated in one word each. | token | `https://atlassian.design/llms-tokens.txt#Surface-Elevation` | "elevation.surface.raised \| Movable elements" | none for the role choice |
| A05-surf-03 | A surface has a **hover and a press state of its own**, so a layer is a state machine, not a color. | token | `https://atlassian.design/llms-tokens.txt#Surface-Elevation` | "elevation.surface.overlay.hovered \| Overlay hover state" | lint |
| A05-surf-04 | The shadow is a **separate token family** from the surface it sits on. | token | `https://atlassian.design/llms-tokens.txt#Shadow-Elevation` | "Shadow elevation tokens define shadow styles:" | lint |
| A05-surf-05 | Shadow roles are only three, and one of them is a *behavior* rather than an object: overflow for scrolling content. | token | `https://atlassian.design/llms-tokens.txt#Shadow-Elevation` | "elevation.shadow.overflow \| Scrolling content" | none |
| A05-surf-06 | There is a perimeter variant for when overflow cannot be shown. | token | `https://atlassian.design/llms-tokens.txt#Shadow-Elevation` | "elevation.shadow.overflow.perimeter \| Overflow fallback" | none |
| A05-surf-07 | The surface prop is preferred over the background property, for one stated reason: surface awareness. The prop is typed as an **enum of surface tokens**, which is what makes the property unnecessary. | rule | `https://atlassian.design/llms-components.txt#Box-component` | "It's preferred you do not use `background` in `xcss` or `cssMap()` and instead use `props.backgroundColor` for surface awareness." | lint (the xcss contract refuses the property) |
| A05-surf-08 | An overlay sits above a named thing — a blanket over the page content — and only one is used at a time. | behavior | `https://atlassian.design/components/modal-dialog/usage#Nesting` | "Modal dialogs should appear above a blanket that covers the main page content. Use one at a time." | none |
| A05-surf-09 | The blanket has its own usage block, including tinting by context and explicit z-index layering. | pattern | `https://atlassian.design/llms-components.txt#@atlaskit/blanket-Package` | "Use appropriate tinting for context" | none |
| A05-surf-10 | A layer inside a layer is a stacking decision, and it is checked by z-index, not by a role. | pattern | `https://atlassian.design/llms-components.txt#@atlaskit/blanket-Package` | "Ensure proper z-index layering" | none |
| A05-surf-11 | **Absence:** no elevation *number* — the registry gives layers colors and shadow styles, never a z-index scale or a dp ladder. | absence | `https://atlassian.design/llms-tokens.txt#Elevation` | "Surface elevation tokens define background layers:" | none |

**Read against our system:** our elevation is binary and it is *two tokens plus a rule*: "hairline
means on the page, shadow means above it", and `shadow-e1`/`shadow-e2` ship unused because no modal
or dropdown exists in `src/`. Row 01/02 is the same split with four stops instead of two, and the
stops are named by what lives there — that naming is the reason our two shadow tokens carry no
meaning today. Row 07 is the strongest portable rule in this corpus: refuse the raw property, allow
only the role-bound prop — our analogue would be a detector that flags a raw background paint where
a surface role exists, which `check:contrast` only partly does (it catches paint, not layer).
Rows 05/06 have **no counterpart in our artifacts at all** and no rule refusing one: nothing on our
side says what a scrolling container should look like. Row 11 is where we are ahead: our system
names the *rule* (binary, with the ship-but-unused state recorded) while their scale never states
how many layers exist or what separates them.
