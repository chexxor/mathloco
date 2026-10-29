# The Design Tree

Design decisions depend on each other in the same order for every project. Follow this order. Don't try to work it out again.

Each arrow means the decision below can't be made until the one above it is settled. A question is ready when everything above it is settled. Ask all the ready questions in one round.

```
                        +-------------+
                        |   PRODUCT   |  R1
                        |  CHARACTER  |
                        +------+------+
          +------------+-------+--------+------------+
          v            v       v        v            v
      +-------+  +---------+ +------+ +------+  +--------+
      |SPACING|  |  TYPE   | |COLOR | |RADIUS|  | EASING |   R2
      | grid  |  |  scale  | |format| | base |  |        |
      +---+---+  +----+----+ +--+---+ +--+---+  +---+----+
          |           |         |        |          |
          v           v         v        |          v
      +-------+  +---------+ +--------+  |     +--------+
      |spacing|  |  font   | | color  |  |     |duration|   R3
      | sizes |  |  sizes  | | roles  |  |     | values |
      +---+---+  +----+----+ +---+----+  |     +---+----+
          +-----------+----------+-------+---------+
                             v
                    +-----------------+
                    |   COMPONENTS    |  R4
                    | height, density |
                    +--------+--------+
                             v
                    +-----------------+
                    |    PATTERNS     |  R5
                    | empty, loading, |
                    | error, shadows  |
                    +-----------------+
```

R1 to R5 are the rounds. Each round asks everything on its row.

## The decisions

### R1. Product character
**Decides**: what kind of product this is. One of: dense and productive, calm and editorial, playful and consumer, or premium and restrained.
**Affects**: the defaults for spacing density, animation speed and corner radius.
**Default**: guess from the codebase and ask the user to confirm. Tables and data-heavy screens suggest dense and productive. Large images and long text suggest calm and editorial.
**Note**: this is the only decision the code can't answer.

### R2. Spacing grid
**Decides**: whether spacing is built on multiples of 4px or 8px.
**Default**: 4px. It fits more existing values and still allows 8px steps. Only recommend 8px when `drift.json` shows the code already uses mostly multiples of 8.

### R2. Type scale
**Decides**: how much bigger each font size is than the one below it: 1.125×, 1.200×, 1.250× or 1.333×.
**Default**: 1.200 for dense apps, 1.250 for marketing pages. Quote how many current sizes each option fits, from `drift.json`.

### R2. Color format
**Decides**: whether color tokens are written in HSL or OKLCH.
**Default**: OKLCH on Tailwind v4. HSL on v3, and always HSL when `components.json` exists, to match the `hsl(var(--x))` format shadcn/ui uses.

### R2. Corner radius
**Decides**: one base radius. The small and large sizes are 2px either side of it.
**Default**: the radius the code already uses most.

### R2. Easing
**Decides**: the easing curves for things entering and leaving the screen.
**Default**: `ease-out` for entering, `ease-in` for leaving.

### R3. Spacing sizes
**Decides**: which multiples of the grid are allowed. Needs the spacing grid.
**Default**: 6 to 8 sizes.

### R3. Font sizes and line height
**Decides**: how many font sizes there are, and how line height changes with size. Needs the type scale.
**Default**: 6 sizes. Line height gets tighter as text gets bigger.

### R3. Color roles
**Decides**: what each named color role means in this product: `primary`, `muted`, `accent`, `destructive`. Needs the color format.
**Default**: when `components.json` exists, use shadcn/ui's role names as they are.
**Note**: this decision is what makes color maintainable. A Tailwind color like `text-blue-600` has to be changed in every file that uses it. A role like `text-primary` is changed in one place.

### R3. Durations
**Decides**: two or three animation durations, each tied to a kind of interaction. Needs the easing.
**Default**: 150ms for hover and press, 250ms for dropdowns and tooltips, 400ms for modals and page changes.

### R4. Components
**Decides**: control heights, how dense components are, and which variants exist (like primary, secondary and ghost buttons). Needs every R2 and R3 decision.
**Default**: take control heights from the spacing sizes. Don't create a second set of sizes.

### R5. Patterns
**Decides**: how empty, loading and error states look, and what shadows mean. Needs the components decision.
**Default**: shadows show how far something sits above the page. Three levels.

## Rules

1. Don't ask a question until everything it depends on is settled.
2. After each answer, check which later questions it affects. An answer can remove options from a later round.
3. When `drift.json` shows one value covering 90% or more of a category, treat that question as settled and show it for the user to confirm instead of asking.
4. The phase ends when every question is answered, not when you have enough to get started.
