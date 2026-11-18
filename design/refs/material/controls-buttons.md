# Material — controls & buttons (domain 9)

Domain 9 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for the state grammar of a control,
NOT evidenced for its size** — the corpus gives a control a *touch target* and a *default type and colour*,
never a height, a padding, or a hit-area rule for a web page. `m2.material.io/design/interaction/states.html` is the owner
of the state grammar; `m2.material.io/design/layout/applying-density.html` owns the target rule and the density refusals;
`m2.material.io/design/material-theming/overview.html` carries the button's default values.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M9-ctl-01 | A press is defined by **intent and input method**, not by a visual change. | behavior | `https://m2.material.io/design/interaction/states.html#pressed` | "A pressed state communicates a user-initiated tap or click by a cursor, keyboard, or voice input method." | none |
| M9-ctl-02 | The press signal is its own device — a ripple, animated its own way — and a press is unique in a layout, which makes press state a **global fact** about the page. | pattern | `https://m2.material.io/design/interaction/states.html#pressed` | "A ripple overlay signifies a pressed state. ... Pressed states appear and disappear using a ripple animation. ... There may only be a single pressed state at a time in a layout." | none |
| M9-ctl-04 | Disabled is a *communication*, and the mechanism is de-emphasis. | rule | `https://m2.material.io/design/interaction/states.html#disabled` | "A disabled state communicates when a component or element isn't interactive, and should be deemphasized in a UI." | none |
| M9-ctl-05 | Disabled is one number relative to the enabled state. | token | `https://m2.material.io/design/interaction/states.html#disabled` | "Disabled states are displayed at 38% opacity of the enabled state." | none |
| M9-ctl-06 | A disabled control must not respond, but a cursor may still be over it — the two are separated. | behavior | `https://m2.material.io/design/interaction/states.html#disabled-behavior` | "Disabled components don't change state when tapped or hovered over." | none |
| M9-ctl-07 | Inheritance is an enumerated **allow-list and a refusal list**, and the refusal list names whole components. | rule | `https://m2.material.io/design/interaction/states.html#disabled-state-inheritance` | "Disabled states cannot be inherited by: floating action buttons (FABs), bottom and side sheets, dialogs, menus, tooltips, and alerts, or navigational components (such as app bars, tabs, bottom navigation and steppers)." | none — the lists are prose on a page; nothing in their system keeps a component off the list |
| M9-ctl-08 | Hover may be carried by **elevation** instead of an overlay, for two named families. | behavior | `https://m2.material.io/design/interaction/states.html#hover` | "Some components, such as buttons or cards, can inherit elevation to signify a hover state." | none |
| M9-ctl-09 | Hover is also layout-unique. | rule | `https://m2.material.io/design/interaction/states.html#hover` | "There can only be one hover state at a time in a layout." | none |
| M9-ctl-10 | The target rule is stated per density, and iOS is carved out as an exception. | rule | `https://m2.material.io/design/layout/applying-density.html#touch-targets` | "the touch target for default density components should be at least 48 x 48 dp, with at least 8dp of space between each target. ... on iOS, 44 x 44 dp is the recommended touch target." | none |
| M9-ctl-11 | **A denser control is an accessibility trade the user has to agree to.** This is the corpus's sharpest control rule. | rule | `https://m2.material.io/design/layout/applying-density.html#accessibility` | "Users must opt in to high density component experiences because higher density components do not meet accessibility requirements." | none — the opt-in is a pattern in a figure caption ("A pattern for users to opt in to a denser component experience"); nothing enforces that a product offers it |
| M9-ctl-12 | Density is a **numbered scale on a component**, and it may not be allowed to break the component. | token | `https://m2.material.io/design/layout/applying-density.html#density-scale` | "The density scale is numbered, starting at 0 for a component's default density." | none; the refusal beside it is "Don't select a number from the density scale that breaks your component." |
| M9-ctl-13 | A control's default type is published as a full attribute set — colour, type, and shape in one breath. | token | `https://m2.material.io/design/material-theming/overview.html#default-and-customized-values` | "The text is 14pt, Roboto, Medium, and all caps" | none — a prose bullet in a docs page |

**Read against our system.** Ours derives the control's size instead of stating its states:
DESIGN.md's `height = ceil4(measured line box) + 2 × an S3 pad`, four named height steps (chip 24, `s32`
32, `s40` for boxes **not** buttons, `s48` for every pressable block), D139 retiring the 40px button step
so primary and secondary are one height and differ **by fill**, and the markup rule that a pressable block
declares `data-control="primary|secondary"` because *"the rules do not read a class string, because they
cannot be trusted to"*.

- Rows 01–02 and 09 are the state-grammar half of our control, and ours states it **per role** and gates it:
  `check:render` asserts the height per declared role (48 ±1) and fails a control painting a control's paint
  with no declared role. Their uniqueness rules (rows 02, 09) are the one idea our system does not hold at
  all and could: nothing we ship asserts that only one hover or one pressed thing exists on a page, and we
  have a hover-fill rule ("a hover always goes lighter") that would collide with a second hovered control.
- Row 11 is a refusal worth keeping in our register voice: our system already refuses density-adjacent
  compression by refusing to move off the ladder, and it refuses a coloured fill as a state. Their version
  — density costs accessibility, so the user opts in — is the reason a compact table view must be opt-in,
  and it is the reason our schedule row's padding is not negotiable.
- Row 13's all-caps button label is close to our chrome tier but not to our case: uppercase exists in our
  system only in the **micro** tier (DESIGN.md's share-card grammar: kicker `text-label` uppercase, focus
  line `text-micro` uppercase), while every label a visitor navigates or presses is sentence-case —
  `Dates`, `Chat`, `Ways in`. That is not a cosmetic choice here: the nav's fit is priced in pixels
  (`m2.material.io/design/nav-fit.mjs` prints mark 97, `Dates` 36, `Chat` 29, `Ways in` 47 against a 276px container at
  the 320 floor), so an all-caps tier would move every one of those numbers and re-open the fit. Recorded,
  not proposed.
- Row 07's refusal list is the transferable grain: a whole component (a sheet, an app bar, a dialog) must
  not inherit an interaction state. Our nav and our ink band are exactly those wholes, and today nothing
  forbids a hover class on them.
