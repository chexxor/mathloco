# Adobe Spectrum — token governance & versioning

Domain 18 of the fixed 18. Status: **ANSWERED, and this system is the far end of the fence: it is the
only one of the five whose naming, aliasing and version rules are *tested*, and it is also the one whose
version rule defaults to annotating rather than blocking.** Three token tiers (primitive / semantic /
component-specific), a taxonomy that gives a name its meaning by reading it left to right, an alias
chain that adds context without redefining a value, and then a repo whose tests assert unique names,
resolve aliases, detect orphan names after renames, publish a dated release timeline, and run a
"foundation drift" gate whose severity default is `warn`.

Probe that establishes the enforcement half (run this session against the fetched repo tree, which is
4,191 paths and `truncated: false`; every size below is read off that artifact, and none of these files
was opened):
`packages/tokens/test/checkUniqueTokenNames.js` 1,306 · `packages/tokens/test/checkAliasReferences.test.js`
1,695 · `packages/tokens/test/checkSetsUnique.js` 1,918 · `packages/tokens/test/checkRenamed.test.js`
1,213 · `packages/token-names/scripts/check-coverage.mjs` 2,216 · `packages/design-data/scripts/version-changelog.mjs`
2,260 · `packages/design-data/scripts/backfill-deprecated-versions.js` 10,431 · `packages/design-data-spec/rules/rules.yaml`
68,536 · `packages/tokens/CHANGELOG.md` 590,523 · `release-timeline/public/data/releases.json` 84,420 ·
`.github/workflows/changeset-lint.yml` 1,028 · `.github/workflows/tdiff-spectrum2.yml` 262. **Their
governance is enforced by name-resolution rules, not by value rules**: nothing in this list measures a
colour, a duration or a pixel, which is the same split our system makes between a name that means a
role and a value that is a fact.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| S18-token-01 | A token is defined as a **decision**, not a value: the reusable unit is the decision carried as data. | rule | `https://spectrum.adobe.com/foundations/design-data/design-tokens` | "Design tokens are reusable design decisions that help teams build and maintain consistent Spectrum experiences across products, platforms, and tools." | none stated (prose page) |
| S18-token-02 | The minimal contract is use case → value, and the name is the use case. | rule | `https://spectrum.adobe.com/foundations/design-data/design-tokens` | "At its simplest, a token connects a design use case to a value, allowing that decision to be reused consistently across tools, teams, products, and platforms." | none stated |
| S18-token-03 | The name is expected to be **readable as a decision**, and one example proves it in words rather than in a schema. | pattern | `https://spectrum.adobe.com/foundations/design-data/design-tokens` | "For example, accent-content-color-default expresses the decision: "Use this value when text content should be accentuated"." | none stated; the taxonomy that produces such names is `design-data/spec/taxonomy.md` (32,750 B, not fetched) |
| S18-token-04 | The governance vocabulary is three named principles, and each is a sentence about the *system*, not a value. | pattern | `https://spectrum.adobe.com/foundations/design-data/design-tokens` | "Clear...Systematic...Learnable" | none stated; the three headings appear as section heads in the page digest |
| S18-token-05 | Learnability is an explicit principle: the system is designed so a person can find and understand a decision. | rule | `https://spectrum.adobe.com/foundations/design-data/design-tokens` | "Design tokens are supported through documentation, guidance, and educational resources that help people identify, understand, and use them effectively." | none stated |
| S18-token-06 | **Semantic over primitive is a stated preference**, and the reason is resilience. | rule | `https://spectrum.adobe.com/foundations/design-data/design-tokens` | "Spectrum also prioritizes semantic design decisions over direct values whenever possible." | none stated on the page; the tier shape is `packages/design-data/fields/` (fields exist in the tree) |
| S18-token-07 | Primitive tokens exist but are declared intent-free, and that is why they are used only through an alias. | token | `https://spectrum.adobe.com/foundations/design-data/design-tokens` | "They represent raw design values and generally communicate little or no information about how those values should be used." | none stated |
| S18-token-08 | Component-specific tokens are **intentionally limited**, with the refusal stated rather than left to practice. | rule | `https://spectrum.adobe.com/foundations/design-data/design-tokens` | "Use them only for their intended component or implementation and avoid reusing them as general-purpose design decisions." | none stated |
| S18-token-09 | There is one canonical source of truth, and the published package is downstream of it. | pattern | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data/llms.txt` | "Spectrum design tokens in cascade format — the canonical source of truth for @adobe/spectrum-tokens" | the direction is stated twice in the repo index: `packages/tokens` is "Generated legacy output … Source of truth is packages/design-data" |
| S18-token-10 | **Lineage is a branch, not a version field:** Spectrum 2 on `main`, Spectrum 1 on `s1-legacy`. | rule | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/llms.txt` | "Spectrum 2 lives on main; Spectrum 1 lives on the s1-legacy branch." | branch names, in the repo index; `release-timeline/public/data/releases.json` (84,420 B) is the dated timeline of token releases |
| S18-token-11 | The taxonomy is a **sidecar so that renaming taxonomy does not bump the published package**, and orphan names after a rename are a named defect. | behavior | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/token-names/README.md` | "from the published token package so taxonomy changes don't bump @adobe/spectrum-tokens...The script asserts every key in names/*.json corresponds to an actual token in @adobe/spectrum-tokens — catching orphan entries after token renames." | **yes, for their format**: `packages/token-names/scripts/check-coverage.mjs` (2,216 B) plus `packages/token-names/test/coverage.test.js` (3,250 B) |
| S18-token-12 | The version contract is checked, in two places: a pinned foundation version against the latest tag, and a rule catalog against conformance fixtures. | pattern | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/.github/actions/validate/README.md` | "checks for foundation drift (the pinned foundationVersion vs. the foundation's latest tag)....validation rule catalog (rules/), and conformance fixtures (conformance/)." | **yes, but advisory by default**: the same README's input table gives `drift-mode` default `warn` — "annotate" — with `fail` (block the PR) opt-in; and the two accessibility rules are warnings too (S16-a11y-08) |

**Read against our system — this is the domain where we are *ahead* on one axis and behind on another.**

- Ahead, on **measurement**: nothing in their 4,191-path repo measures a value. Our deploy set measures
  the things that would break in our artifact — `scripts/check-contrast.mjs` (ratios against named grounds),
  the steps `check:scale` (`scripts/check-scale.mjs`) and `check:space` (`design/whitespace-survey.mjs`, named in `scripts/gate-run.mjs`). They govern
  names and lineage; we govern the shipped surface. That split is why their governance rows generate almost
  no GAP rows.
- Behind, on **one mechanism worth stealing whole**: `S18-token-11`'s orphan check is the same defect class
  our own corpus already admits — `check:decisions` fails on a `D###` citation with no entry, and
  `check:plan` fails on an `S###`/`MS##` citation with no entry. Their script is the token-name analogue of
  our id gate, and it is the reason our id gate is defensible rather than novel. Nothing to add; evidence
  that a rule we already have is a general rule.
- `S18-token-04 / 05 / 06` are **refusals** in our register: "prioritize semantic over primitive" is
  already our rule (DESIGN.md names colour roles per state and forbids a hue, D102; `src/styles/global.css`
  exposes `--radius-control`, `--shadow-e1`, never a raw value in a component). Adopting their tier
  *vocabulary* would import a naming scheme we do not use, and would not change one line of our CSS.
- `S18-token-09 / 10` are **DIVERGENT-KEEP** material: a single source of truth plus generated downstream
  output is how a five-token design system survives a rename. Ours is a single hand-written `@theme` block,
  and at our size (the `@theme` block in `src/styles/global.css`) a generator would be a machine wearing a
  convenience hat — the same argument our rig already makes against a formatter that rewrites files.
- The one genuinely open question for the operator, and it belongs to the ledger rather than to a detector:
  whether `DECISIONS.index.md` should grow an orphan check of its own shape (a tracked citation with no
  entry) or whether `check:decisions` already covers it. It does cover the citations; it does **not** cover
  the reverse (a decision recorded in the host-local file that never gained its index line). That is a
  gap in *our* governance, and it is one this corpus surfaced by comparison — recorded here rather than
  ranked, because fixing it touches the ledger, which this pass may not.

`NO EVIDENCE` in this domain: no fetched page states a deprecation policy, a semver rule, a
breaking-change definition, or how a token rename propagates to a product. `packages/tokens/CHANGELOG.md`
(590,523 B) and `release-timeline/**` exist and are dated, but neither was fetched, so their rules
are not carried — the existence is what the enforcement column needs, and nothing more.
