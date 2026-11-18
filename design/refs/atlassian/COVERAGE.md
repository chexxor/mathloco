# Atlassian — coverage ledger

Source: **Atlassian Design System (ADS)**, atlassian.design. Fetched 2026-11-17 from this rig
(Linux native, `curl -sS -m 30 -L`; bytes read off `curl -w "%{size_download}"` into
`.design/tmp-refs/`, the gitignored scratch half of `design/`).

**Machine entry point first, and it is first-class.** `https://atlassian.design/llms.txt` answered
**200 at 5,781 B** and is not prose — it is an index of five sub-indexes plus the tooling that hangs
off them: `llms-tokens.txt`, `llms-primitives.txt`, `llms-styling.txt`, `llms-components.txt`,
`llms-a11y.txt`, `llms-content.txt`, `llms-full.txt`. Its own words are the governance claim:
"Single source of truth for design decisions". Six of the seven were fetched; `llms-full.txt` was
not, for a reason recorded below. The six fetched sub-indexes total **643,817 B** on disk. **This is the only one of the five reference systems that names an
enforcement artifact of its own** (two ESLint plugins, an accessibility test package, a codemod CLI)
— which is why this system, and not Carbon or Spectrum, is the one we compare our gate model against.

## Quote normalisation

Stated once in `../README.md` § How this corpus is read. Specific to this system: the corpus is the
**six digests `get.sh` appended to `manifest.tsv`** (`txt/atlassian-*.txt`) plus the **five machine
artifacts fetched at 18:58** (`atlassian-llms.txt`, `-tokens`, `-primitives`, `-styling`, `-components`,
sizes read off `ls -l`) — 11 digests in total, and `atlassian-sitemap.xml` is **not** among them as prose
evidence: it renders a page, not a sitemap (the finding is recorded above).

## Reached (date · URL · HTTP · bytes · effective URL)

| Date | URL asked | Code | Bytes | What the prose came from |
|---|---|---|---|---|
| 2026-11-17 | `https://atlassian.design/llms.txt` | 200 | 5,781 | the machine index |
| 2026-11-17 | `https://atlassian.design/llms-tokens.txt` | 200 | 16,707 | token registry: color roles, font/spacing/radius/elevation/opacity scales |
| 2026-11-17 | `https://atlassian.design/llms-primitives.txt` | 200 | 24,580 | primitives, `xcss` contract, breakpoint table |
| 2026-11-17 | `https://atlassian.design/llms-styling.txt` | 200 | 5,882 | the styling standard and its lint rule names |
| 2026-11-17 | `https://atlassian.design/llms-components.txt` | 200 | 546,596 | 55 packages, each with Usage / Content / Accessibility guideline blocks |
| 2026-11-17 | `https://atlassian.design/llms-a11y.txt` | 200 | 20,929 | WCAG contract, focus/keyboard rules, the testing harness |
| 2026-11-17 | `https://atlassian.design/llms-content.txt` | 200 | 29,123 | message design, length limits, language standard |
| 2026-11-17 | `https://atlassian.design/components/modal-dialog/usage` | 200 | 489,924 | the modal pattern page (prose, not the package index) |
| 2026-11-17 | `https://atlassian.design/components/empty-state/usage` | 200 | 492,741 | the empty-state pattern page |
| 2026-11-17 | `https://atlassian.design/components/modal-dialog/examples` | 200 | 702,066 | fetched, then not quoted: the usage page and the package index carry the rules |
| 2026-11-17 | `https://atlassian.design/components/empty-state/examples` | 200 | 636,855 | fetched, then not quoted, same reason |
| 2026-11-17 | `https://atlassian.design/sitemap.xml` | 200 | 232,226 | **doc-structure finding, not a sitemap**: the body opens `<!DOCTYPE html><html data-theme="dark:dark light:light motion:motion shape:shape spacing:spacing typography:typography"` and contains **zero `<loc>` elements** — the endpoint answers 200 with a rendered page, so the site's own index is unparseable and the `llms.txt` family is the only enumerable one. The attribute list is itself evidence: their doc site is themed by the same role names (`motion`, `shape`, `spacing`, `typography`) our system names. |

12 fetches, 0 non-200s. Provenance of the byte column, stated as two means exactly as in
`../carbon/COVERAGE.md`: the six rows whose URL is a page or a machine doc fetched **through** `get.sh` — the four
component pages and the two machine docs (`llms-a11y.txt`, `llms-content.txt`) — are rows
`get.sh` appended to `.design/tmp-refs/manifest.tsv`, which today holds those 6 Atlassian rows
plus 27 Carbon rows; the five machine artifacts and the sitemap were logged as artifacts on disk,
so their sizes are read off `ls -l` of the fetched file
artifacts on disk, so their sizes are read off `ls -l` of the fetched file
(`atlassian-llms.txt` 5,781 B, `-tokens` 16,707 B, `-primitives` 24,580 B,
`-styling` 5,882 B, `-components` 546,596 B, `atlassian-sitemap.xml` 232,226 B, confirmed this
session). A row neither means produced is a row nobody measured.

## Sections reached, and why the rest were not

Reached sections are named by the `locator` column of the domain files. Of what the index
enumerates:

| Not reached | Reason |
|---|---|
| `https://atlassian.design/llms-full.txt` | The index describes it as "The complete ADS documentation including all other sets and this file" — a superset of the six sub-indexes already fetched at 623,472 B combined. Fetching it would be a second byte-cost on claims the sub-indexes already gave, and it would make "which document a claim came from" ambiguous. |
| The other ~53 `components/<pkg>/usage` pages | The package index carries the same Usage / Content / Accessibility blocks for all 55 packages, and it is the fetched artifact. Only two pattern pages were fetched as *pages* — `modal-dialog/usage` and `empty-state/usage` — because those two carry prose the index does not (dismissal affordances, focus order, tone-by-state, illustration i18n). One component per domain would be volume, not judgment; the packages quoted are the ones carrying a rule our system has a token or a silence for. |
| Every `components/<pkg>/code` and `examples` page | Code tabs are implementations, not rules. Both `examples` pages that were fetched are recorded above as fetched-but-not-quoted. |
| `/foundations/*`, `/tokens`, `/libraries/*`, `/tooling/*` site pages | The machine doc for each is the richer source and was fetched once (`llms-tokens.txt`, `llms-styling.txt`); the site pages render the same registry with the same numbers. |
| The design-tokens JSON registry (`@atlaskit/tokens` internals, design-tokens-toolkit shaped) | Not fetched — the npm package was not opened. Therefore **no claim is made about the shape of the token file**, only about the `token()` call convention the fetched docs show. |
| `/content/*` individual guideline pages (e.g. `content/designing-messages`) | `llms-content.txt` carries them, and cites each page as its own Source. The page-level URL is therefore inside a fetched artifact, not behind it. |
| `get-started/*`, `blog/*`, `changelog` pages | Doc-about-docs and release narration. The version/governance evidence carried here is the deprecation note, the `early-access` status labels, and the codemod CLI, all in fetched artifacts. |
| `https://atlassian.design/sitemap.xml` as an *index* | Fetched and unusable as an index (finding recorded above). |

## Domain status (the 18, fixed in `../README.md`)

All 18 domains are **EVIDENCED** except one, and the exception is the finding, not a gap in effort:

`color-roles-theming` · `typography-measure` · `spacing-rhythm` · `radius-shape` ·
`elevation-surfaces` · `motion` · `iconography` · `focus-keyboard` · `controls-buttons` ·
`forms-validation` · `feedback-notices-status` · `data-display` · `navigation-wayfinding` ·
`overlay-surfaces` · `loading-empty-error` · `accessibility-contract` ·
**`i18n-rtl` (PARTIAL: nine localization rules found across four machine docs; exactly one
right-to-left sentence in the whole corpus — "Support right-to-left languages", a bullet with no
mechanism; no mirroring, logical-property or flipped-spacing rule anywhere)** ·
`tokens-governance-versioning`.

**No domain in this system is `NO EVIDENCE`.** Thinness here is a row count with a named reason, not
a missing file.

## What this system enforces about itself — and where it is behind us

Atlassian is the **only** source of the five that ships detectors, and naming them is the point of
this ledger:

- **Two ESLint plugins**, configured as `extends: ['plugin:@atlaskit/design-system/recommended', 'plugin:@atlaskit/ui-styling-standard/recommended']`, with rule names printed in the styling standard: "No Styled Components", "No Dynamic Styles", "No Global Styles", "No Nested Selectors", "Design Token Usage". The standard then says a suppression is forbidden ("Do not ever `@ts-ignore` or `@ts-expect-error` these.") — i.e. their lint has no skip, which is the same property our selftests demand of our gates.
- **An accessibility test harness**: `@af/accessibility-testing`, axe-core, `@sa11y/jest`, an `IS_A11Y_AUDIT_ENABLED=true` audit flag, and a `checkColorContrast(page)` visual-regression call. That is a *test*, and it is the closest thing in any of the five systems to our detector-plus-selftest model.
- **A codemod CLI** (`@hypermod/cli`) for token migrations, so a renamed token is a machine move, not a hunt.

Where Atlassian is **behind** us, recorded as evidence rather than flattery: it states
"Consider touch target sizes" and "Consider icon size for touch targets" and never a number; it
states "Ensure appropriate touch target sizes" and never a threshold; it has no line-length or
reading-measure rule anywhere; and its reduced-motion contract is a media-query allowance plus a
hook (`isReducedMotion()`) with no requirement that a component *demonstrate* it. Ours names 24px
minimum target and 44px at phone widths, caps a prose block at `max-w-measure`, and requires the
reduced-motion path. An "Consider…" bullet is a rule nobody can fail — which is exactly the defect
our `check-*` model exists to catch.
