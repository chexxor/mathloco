# Material — tokens, governance & versioning (domain 18)

Domain 18 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for what a theme *is* and for three
design-tool mechanisms; NOT evidenced for a token file, a lint, a gate, or a version.** This domain's own
finding is the corpus's: it is a **deprecated fork**. Every one of the 22 digests opens with the same two
sentences, and the probe over all 22 digests for a date, a migration, or a changelog returns nothing but
that banner:

- `python3 .design/tmp-refs/nq.py 'material-*' 'no longer maintained|deprecat|migrat|changelog|release note|last updated|successor'` → **18 lines, every one of them the identical banner**
  ("Material 2 is no longer maintained."; the other four of the 22 digests carry the same banner inside a
  longer segment). No deprecation date, no migration for their own numbers, no pointer from a 4dp default to
  whatever the successor chose.
- `python3 .design/tmp-refs/nq.py 'material-*' 'design token|token file|custom propert|SCSS|JSON variable'` → **0 lines**.
- `python3 .design/tmp-refs/nq.py 'material-*' 'design token|token file|custom propert|SCSS|JSON variable'` → **0 lines**.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M18-tok-01 | Theming is defined as a **systematic customization**, which is the same word as "a token system" from the other side. | pattern | `https://m2.material.io/design/material-theming/overview.html#what-is-material-theming` | "Material Theming is the ability to systematically customize Material Design to better reflect your product's brand." | none |
| M18-tok-02 | The theme is a **three-step pipeline across two media**, mock and code, and the pipeline is the whole governance model. | behavior | `https://m2.material.io/design/material-theming/overview.html#using-material-theming` | "Material Theming consists of three main actions: customizing your theme, applying it across your design mocks, and using it in code." | none — three prose actions; nothing checks that a mock and a build agree |
| M18-tok-03 | The tools' job is to publish **a specific value for every customizable attribute**, which is what a token file would do. | rule | `https://m2.material.io/design/material-theming/overview.html#what-is-material-theming` | "These tools allow easy switching between design and code workflows by providing specific values for all customizable attributes." | none — the values are printed in tables and bullets, and no consumer resolves them |
| M18-tok-04 | A component's defaults are published as a **complete attribute set in prose**: colour, type, and shape in one breath. | token | `https://m2.material.io/design/material-theming/overview.html#default-and-customized-values` | "By default, contained buttons have the following default values: ... The color is #6200EE ... The text is 14pt, Roboto, Medium, and all caps ... The corners have a rounded radii of 4dp" | none — and the published text label of the same block prints `#FFFFFFF`, a seven-character hex, in three rows of the table beside this sentence |
| M18-tok-05 | There is a **baseline theme usable as-is**, and that is what makes a fork possible rather than necessary. | rule | `https://m2.material.io/design/material-theming/overview.html#what-is-material-theming` | "Material Design comes designed with a built-in, baseline theme that can be used as-is, straight out of the proverbial box." | none |
| M18-tok-06 | A theme is not a palette: it touches **every surface including components**, so one change moves a button. | pattern | `https://m2.material.io/design/material-theming/overview.html#theming-in-practice` | "When you begin changing aspects of your UI, such as color and typography, Material Theming tools apply your design vision throughout your user experience." | none |
| M18-tok-07 | **Absence:** the artifact that a theme would be is never published. The word for it in their own text is "a Material Theme", and nothing in the corpus is a file, a format, or a resolver. | absence | `https://m2.material.io/design/material-theming/overview.html#what-is-material-theming` | "Customizing these values creates a Material Theme for your product." | none — and the token probe above returns 0 lines |
| M18-tok-08 | Mechanism one: a **design tool**, and it is the only thing that carries their layout numbers. | token | `https://m2.material.io/design/layout/understanding-layout.html#resources` | "The Material Design Kit on Figma includes templates for working with the breakpoint, column grid, and margin guidance described above." | none — a Figma kit cannot fail a build |
| M18-tok-09 | Mechanism two: **Illustrator files** for the icon grid. | token | `https://m2.material.io/design/iconography/system-icons.html#icon-design-templates` | "Create your own system and product icons with these Adobe Illustrator files including the 24dp icon grid." | none — no SVG, no sprite, no licence statement on any fetched page |
| M18-tok-10 | Mechanism three: a **generator**, and it is the only published tool that produces code. | token | `https://m2.material.io/design/typography/the-type-system.html#type-scale-generator` | "Powered by Google Fonts, the type scale generator is a tool for creating type scales and corresponding code." | none — output is whatever the tool emits; no schema, no version |
| M18-tok-11 | **Absence, and this is the versioning finding:** the system declares itself unmaintained in a banner and publishes no date, no migration, and no successor pointer. | absence | `https://m2.material.io/design/shape/about-shape.html` | "Material 2 is no longer maintained. ... Upgrade to Material 3, the latest version of Material Design." | none — and the probe above finds no other version statement in 22 digests; `m3.material.io/sitemap.xml` (721,312 B) is named in `COVERAGE.md` and not ingested |
| M18-tok-12 | **CONTESTED, structural:** governance is **per page, not per system**. Four pages each carry their own implementation-status caption — shape, density, bidirectionality, dark theme — and the tables under those captions answer differently for the same platform. | CONTESTED | `https://m2.material.io/design/shape/about-shape.html#implementation` | "Shapes implementation across supported platforms is indicated below. ... Density support for each platform is indicated below. ... Implementation support for bidirectionality for each platform is indicated below. ... Dark theme implementation support for each platform is indicated below." | none — four captions in four files, no shared status model; the values are in the tables beneath them and are not quotable (a quote may not contain a pipe), so the disagreement is stated here against the digest lines and can be re-read in any of the four |

**Read against our system.** Ours is the opposite shape, and the difference is the reason this domain exists:
DESIGN.md line 12 — *"Tokens live in one place: `src/styles/global.css` → `@theme`. If a value is not in that
block, it is not a design value."* — and one block, one file, one home. Theirs is three tools plus prose.

- Our `@theme` block **is** their governance model, with the parts theirs lacks: the retired values stay
  documented inside the block with the id that retired them (`/* ---- RETIRED (D316): --color-book-gray …
  gone in this commit … */`, and `--breakpoint-nav-narrow` retired under D117 with the arithmetic that made
  it unnecessary), so a value's disappearance has a reason attached at the place the value used to live.
  Their equivalent is a banner at the top of a page and a fork nobody dated.
- **They are behind us on every axis this domain measures**: no token file, no lint, no gate, no version
  statement, no migration. That is the corpus's cleanest evidence for keeping our own enforcement model
  rather than importing theirs, and it is why the `enforcement` column reads `none` in all twelve rows.
- **We are behind them on one**: they name the *job* of a theme — publish a value for every customizable
  attribute, apply it through the whole UI including components (rows 03 and 06). Our block has one home per
  value and one id per decision, but nothing that enumerates the attributes a control can take. Our
  closest instrument is `check:scale` (**47 source files, 51 distinct spacing utilities, 0 off-ladder**
  @measured 2026-11-17 by `node scripts/check-scale.mjs`), which audits the writes that exist rather than
  enumerating the values that could. Row 02's three-step pipeline is the transferable grain: mock → code is
  our `m2.material.io/design/token-map.md` (generated from the writes, exits 1 if a replaced bucket has no mapping) and
  `m2.material.io/design/gen-token-map.mjs`, which is the same pipeline with a failing exit.
- Row 04's seven-character `#FFFFFFF` is a **corpus defect worth one line**: a published default that cannot
  parse is the same class of defect our `check:classes` exists for ("a token used as a class that does not
  exist"), and it is why no default value from this system may be copied into a proposal.
- Row 12 is the governance divergence to record, not to resolve: per-page platform status is what a forked
  docs site produces; one registry with a migration model is what Atlassian publishes (see
  `atlassian/tokens-governance-versioning.md`). §2's tokens rows come from there, not from here.
