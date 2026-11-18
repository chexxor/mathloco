# Atlassian — color roles & theming

Domain 1 of the fixed 18. Status: **EVIDENCED**.

Artifacts reached: `https://atlassian.design/llms-tokens.txt` (the registry),
`https://atlassian.design/llms-a11y.txt`,
`https://atlassian.design/llms-styling.txt`,
`https://atlassian.design/components/modal-dialog/usage`,
`https://atlassian.design/llms-components.txt` (the lozenge and section-message blocks).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A01-color-01 | Every paint decision is a token call, and the registry is a closed set: you may not add a value. | rule | `https://atlassian.design/llms-tokens.txt#Tokens-list` | "You must ONLY use tokens listed in this document, do not make up values." | lint (`@atlaskit/eslint-plugin-design-system`, `design-token usage`; the same doc states it as a must) |
| A01-color-02 | Color is named by **role group**, and each group carries its own state suffixes: background/text/icon/border × `hovered`, `pressed`. | token | `https://atlassian.design/llms-tokens.txt#Background-Colors` | "Background colors define the base layer of components and surfaces:" | lint (the closed token set; the state names are part of the name, not a value) |
| A01-color-03 | Severity is a **role**, not a hue: `danger`, `information`, `discovery`, `neutral`, `input`, `brand` each own a background and a bold variant. | token | `https://atlassian.design/llms-tokens.txt#Background-Colors` | "Critical information backgrounds" (usage cell of `color.background.danger`) | lint (closed set) |
| A01-color-04 | Meaning beats match: pick the token whose **name** is right even when its color is not what you wanted. | rule | `https://atlassian.design/llms-tokens.txt#Semantic-Tokens` | "Always prefer the semantically correct token name, even if the color doesn't match exactly." | lint |
| A01-color-05 | Hardcoded paint is refused because it breaks a theme, not because it looks wrong. | rule | `https://atlassian.design/llms-tokens.txt#Dark-Mode-Support` | "Never use hardcoded color values as they will break dark mode support." | lint |
| A01-color-06 | Foreground and background are chosen as a **pair**, and the pair exists to clear a contrast ratio. | behavior | `https://atlassian.design/llms-tokens.txt#Token-Pairing` | "You should match foreground and background color, eg. for dark background colors, we have a … to better achieve contrast ratios." | lint (pairing is not checkable by their ruleset; the ratio below is) |
| A01-color-07 | The contrast contract is numeric and split by text size. | rule | `https://atlassian.design/llms-a11y.txt#Color-and-Contrast` | "Ensure 4.5:1 contrast ratio for normal text" | test (`checkColorContrast(page)` in `@af/accessibility-testing`) |
| A01-color-08 | Large text gets the looser ratio, and "large" is defined in type terms, not px. | rule | `https://atlassian.design/llms-a11y.txt#Color-and-Contrast` | "Ensure 3:1 contrast ratio for large text (18pt+ or 14pt+ bold)" | test |
| A01-color-09 | A disabled role is a role you must not use for meaning. | token | `https://atlassian.design/llms-a11y.txt#Color-and-Contrast` | "color.text.disabled - Disabled text (avoid for critical information)" | none (a bullet in prose; the ratio test does not read the *name*) |
| A01-color-10 | Severity must survive a colorless rendering: the label carries it, the icon decorates it. | rule | `https://atlassian.design/components/modal-dialog/usage#Indicating-severity` | "Don't rely on color alone to indicate severity. Provide an accessible label for the warning and error icons." | test (axe violations on missing labels); no rule on the pairing itself |
| A01-color-11 | Focus is a color role with a width role, and both are named for the state. | token | `https://atlassian.design/llms-tokens.txt#Border-Width` | "border.width.focused \| 2px \| 0.125rem \| Focus states" | lint (closed set) |
| A01-color-12 | They name the same rule twice in different registers — status labels insist on the text label as well as the color. | rule | `https://atlassian.design/llms-components.txt#@atlaskit/lozenge-Package` | "Do not rely on color alone; always pair with an accurate text label" | none for the pairing; lint only for the values |

**Read against our system:** our palette is role-named and pair-named against a ground
(`-on-ink` twins), and `check:contrast` fails a paint literal in `src/` outside
`src/styles/global.css`. Rows 01, 05, 06, 07, 08 are the same idea at a different scale — theirs
is a closed registry plus a measured ratio, ours is a closed `@theme` block plus a measured ratio
against a *named* ground. Row 04 is the rule we lack words for: we refuse a wrong role by
`check:contrast` (the pair fails) but never say "prefer the semantically correct name", so a
correct-contrast-wrong-meaning paint passes us silently. Rows 10, 12 are a **`CONTESTED`-free
duplicate inside their own corpus** (two documents, one rule), which matters because our detector
model would count it twice. Row 11 answers our `border.width`-equivalent: we have no focus
width token at all, only a color, so 11 is a GAP row.
