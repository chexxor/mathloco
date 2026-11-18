# Adobe Spectrum — accessibility contract

Domain 16 of the fixed 18. Status: **ANSWERED ON THE WRONG SIDE OF THE FENCE — this is the only one of
the five that declares accessibility as a machine-readable *contract*, and it is also the one that admits
the contract is advisory.** The accessibility chapter is a spec chapter in the data repo, not a page on the
site: it defines fields (`role`, `intents`, `focusable`, `keyboardIntents`, `wcag`, and the state-level
`announce` / `communicates` / `blocksInteraction`), a canonical vocabulary per field, and then says the
mapping to ARIA/iOS/Android lives in other repos. Its two rules are **warning severity**, and their
implementation is named as a future phase.

Probe that establishes the severity claim (run this session, on the fetched spec markdown):
`tail -c 900 txt/spectrum-md-a11y-spec.txt` prints the SPEC-rules table and the line "Both rules are
`warning` severity — they do not block validation." with rule ids **SPEC-030 accessibility-empty** and
**SPEC-031 accessibility-wcag-missing** — and `grep -iE 'contrast|a11y|accessib' spectrum-tree-paths.txt`
over the 4,191 repo paths returns 11 matches, none of them a contrast-ratio gate. So the contract has
fields and a schema, and nothing that measures what the fields claim.

The site's assistive-technology page (`/foundations/inclusivity/assistive`) answered 200 with a **13 B
digest** and `kagi_extract` returned nothing — so every row below is from the spec markdown, the grays
page, or a component page, never from the page whose topic this domain is. That is recorded in
`COVERAGE.md` as reached-but-empty, and it is why the row list carries no claim about assistive
technology as such.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| S16-a11y-01 | Accessibility is a **declared vocabulary on the component**, at the foundation layer — intent, not platform API. | rule | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md` | "A component's accessibility declaration expresses intent — its semantic role, interaction purposes, focus behavior, and applicable WCAG criteria — without encoding platform-specific APIs." | schema only: the object "MUST conform to accessibility.schema.json (schema added in Phase 7.3)" — the schema was not fetched |
| S16-a11y-02 | The mapping to a platform is **someone else's job**, and the spec names whose: adapter repos. | rule | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md` | "Platform adapter repos translate this vocabulary to ARIA attributes, iOS UIAccessibility traits, Android AccessibilityNodeInfo properties, and other platform contracts." | none stated |
| S16-a11y-03 | Keyboard focus is one declared boolean with three answers, and the internal-focus case names the pattern. | token | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md` | "Components that manage focus internally (radio groups, toolbars, tree views) use the roving tabindex pattern — one child is focusable at a time." | field declared in the schema; nothing checks that a declared component actually receives focus |
| S16-a11y-04 | The keyboard vocabulary ships **default keys**, and the spec marks them informative rather than binding. | pattern | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md` | "The "Default key(s)" column is informative. Platform adapters determine actual key bindings; the foundation layer declares intent only." | none stated |
| S16-a11y-05 | WCAG criteria are carried **per component** as criterion number + conformance level, and the button example carries two. | token | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md` | "Applicable WCAG 2.x success criteria" | field shape only; the example entry is `{ "criterion": "1.4.3", "level": "AA", "title": "Contrast (Minimum)" }` in the same file |
| S16-a11y-06 | A state transition can declare the sentence a screen reader says, and the spec sets length and phrasing for it. | behavior | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md` | "Phrasing SHOULD be concise (under 10 words) and describe the transition, not the resulting state." | none stated — neither state-level field has a rule attached |
| S16-a11y-07 | A state can declare that it **blocks all interaction**, and the spec says what the adapter must set in response. | behavior | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md` | "A boolean declaring whether this state prevents all user interaction with the component." | none stated |
| S16-a11y-08 | **The enforcement is advisory:** the system's only two accessibility rules are warnings, and their implementation is a named future phase. | rule | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md` | "Both rules are warning severity — they do not block validation." | warning-severity rules SPEC-030 / SPEC-031 in `packages/design-data-spec/rules/rules.yaml` (68,536 B, in the repo tree, not fetched); "implemented in the SDK in Phase 7.4" — i.e. not implemented in this repo's state |
| S16-a11y-09 | **Absence of a standard, stated:** nobody has decided what the non-text bar covers per-part. | absence | `https://spectrum.adobe.com/foundations/color/grays` | "There are no current WCAG or W3C guidelines about if every fill and stroke in every component of every state needs to be 3:1 in contrast." | none stated — the absence is the reason no blanket 3:1 gate is possible |
| S16-a11y-10 | The non-text bar exists **with its exemptions listed**, which is the shape a gate must copy to be honest. | rule | `https://spectrum.adobe.com/foundations/color/grays` | "The World Wide Web Consortium (W3C) also requires active, non-text components to have a minimum of 3:1 in contrast against adjacent colors. Some elements are exempt from this (like disabled items, decorative items, user-set items, or logotypes)." | none stated — no ratio gate anywhere in the repo tree |
| S16-a11y-11 | Colour is refused as a sole signal **by the component that carries it**: a status light must be labelled. | rule | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/status-light.md` | "Status lights should always include a label. Color alone is not enough to communicate the status." | none stated on the page; `s2-docs/web/rsp/components/status-light.md` is guideline prose, and `validate-guidelines.js` (2,726 B) exists in the tree but was not run |
| S16-a11y-12 | **Absence in the contract:** focus behaviour is not required, and the spec says what that leaves undecided. | absence | `https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md` | "When absent, focus behavior is unspecified at the foundation layer." | none stated — the field is optional ("Required | No") |

**Read against our system.** Ours is the opposite shape: no declared accessibility *contract* at all, and
instead one measured contract — `scripts/check-contrast.mjs` (in the deploy set) computes ratios against
named grounds, and `scripts/check-focus.mjs` (14 cases, with its own selftest) checks that focus rings
exist per ground. What Spectrum has that we do not: **the announcement half** — a state declaring the
sentence an assistive technology says when it is entered (`announce`), and a state declaring that it
blocks interaction. Our loading line is `role="status"` with no announced transition, and our error branch
is server-rendered text with no state semantics. What we have that Spectrum does not: the measurement.
Their fields would let a product *say* it is accessible; our gate makes it provable for the few pairs it
knows. Any GAP row from here is therefore "add the semantic contract", never "adopt their number".
