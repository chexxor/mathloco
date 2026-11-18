# design/refs/ — an external reference corpus, and the one thing we compare against

This directory holds **evidence about five other design systems**, not a design system of our own.
Nothing here changes what this repo ships: `src/styles/global.css`'s `@theme` block, `DESIGN.md`, and
`scripts/check-*.mjs` are untouched by everything in this tree. The output of the whole pass is
[`GAP-ANALYSIS.md`](GAP-ANALYSIS.md) — a ranked plan of what we are silent about, contradicted on, or
reinventing worse. It is a plan, not a change.

## What our system is

Ours is a **role-named, single-file token system with a gate per rule**. Tokens live in exactly one
home — DESIGN.md line 12: *"Tokens live in one place: `src/styles/global.css` → `@theme`. If a value
is not in that block, it is not a design value."* — and the vocabulary is roles, not hexes and not
Tailwind palette colours: DESIGN.md *"**Never** use a Tailwind palette colour (`text-gray-600`,
`bg-blue-100`, `text-red-600`) where a role exists … never write a hex — `check:contrast` fails any
paint literal in `src/` outside `src/styles/global.css`"*. Colour is decided as **pairs against a
named ground** ("a number quoted without its ground is not a fact"), which is why the palette carries
`-on-ink` twins, and it has **no signal hue** (D102): severity is carried by a notice's keyline and
word. Space is a **4px ladder of eight steps** (4 8 12 16 24 32 48 64) with *"**Never** use a step
outside that set"*; type is a **1.200 ramp of nine steps** with leading carried by the size token and
**one display step per screen** (*"the screen's primary locator"*); a prose block caps at
`max-w-measure` (32em ≈ 70 serif characters); radius is one base (6px, two roles, no pill); elevation
is binary — DESIGN.md *"hairline means on the page, shadow means above it"*, with `shadow-e1`/`e2`
ship-defined-but-unused because *"No modal or dropdown is in `src/` today"*. Controls are **derived,
not chosen**: `height = ceil4(measured line box) + 2 × an S3 pad`, one boundary per box, 48px for
every pressable block, 24px minimum target, 44px at phone widths. Motion is two steps — 150ms linear
for colour/shadow, 250ms ease-out for movement — no tier above it, no keyframes in live `src/`, and
`prefers-reduced-motion: reduce` is mandatory. The **enforcement model is the point**: the deploy set
is 71 steps (`node scripts/gate-run.mjs --list`), and a rule without a detector is not carried —
*"A check without a selftest is an assertion, not a detector"* (AGENTS.md), where each `check-<thing>`
ships a `check-<thing>:selftest` that plants the defect it exists to catch. Finally, **claims carry
their date and their probe** — DESIGN.md: *"A measured number in tracked prose carries its date and
its probe"*, enforced by `check:figures`. Character, which no reference system gets to move:
*"playful — plurality made possible through mathematics"*.

## Transferability matrix

One row per source. Decided from the entry points fetched in Phase 1 (`@measured 2026-11-17`, bytes
read off `curl -w "%{size_download}"` into `.design/tmp-refs/`, the scratch half of `design/`).
A cell marked **to settle** is a cell Phase 1 will fill from fetched text, not a claim made now.

| System (working entry point) | Runtime it is written for | Token format it publishes | Portable to Astro + Tailwind 4 + Svelte islands | Explicitly **not** portable |
|---|---|---|---|---|
| **Material** — m2.material.io (Material 2) + m3.material.io (Material 3) | Cross-platform: Android / iOS / Flutter / web; each guideline page carries a **Platform → Protocol** table (e.g. CSS `cubic-bezier(0.4, 0.0, 0.2, 1)`). `m2.material.io` is an **Angular PWA shell**: `/`, `/design/guidelines-overview` and `/design/color/the-color-system.html` are byte-identical (md5 `617b93271e5fae4f99bf0aef64d43582`, 67,614 B), so the prose arrives by XHR and only a rendering proxy (Kagi Extract) reaches it | **No machine entry point exists** — `m2.material.io/llms.txt` answers 200 with the shell (there is no llms file), `robots.txt` 200 at 55 B, and the token probe (`design token\|token file\|custom propert\|SCSS\|JSON variable`) over its 24 digests returns **0 lines**: their published mechanisms are a Figma kit, Illustrator icon-grid files and a Google Fonts type-scale generator, so Material 2 states numbers in prose and ships nothing a build can read | Behavior contracts and interaction *rules* — the motion system, elevation-as-surface, empty/offline states, bidirectionality. Docs structure (its own doc tree is a finding) | Component code and platform APIs (Android `Interpolator`s, iOS `CAMediaTimingFunction`); dynamic/tonal colour built from a source colour — our palette is role-based and measured against named grounds; its elevation scale (0–5 dp) answers a runtime we don't have |
| **IBM Carbon** — carbondesignsystem.com | React + Web Components + Carbon Elements (npm `@carbon/elements`); a v10 → v11 migration is a documented event | A **machine entry point exists**: `/llms.txt` answers 200 at 30,912 B and indexes Foundations → Components → Patterns → Data Visualization; **to settle** for its token JSON/SCSS form (`@carbon` packages) | Docs structure and behavior contracts: the Patterns layer (`dialogs`, `forms`, `empty-states`, `status-indicators`, `loading`, `disabled-states`, `read-only-states`) is a *pattern* layer, i.e. rules about states and overlays we are silent about | The React component itself; IBM Plex and the IBM Design Language colour; the 2x Grid geometry (we are on a 4px ladder, not an 8px base grid with 2x-derived spacing) |
| **Atlassian** — atlassian.design | React/TypeScript (`@atlaskit/tokens`, `@atlaskit/primitives`), design-tokens-toolkit-shaped JSON | **Machine-readable, first-class**: `/llms.txt` 200 / 5,781 B indexes sub-indexes — `llms-tokens.txt` 16,707 B, `llms-primitives.txt` 24,580 B, `llms-styling.txt` 5,882 B, `llms-components.txt` 546,596 B — and names *"Single source of truth for design decisions"* with colour, typography, spacing, radius, elevation token groups | Token **namespacing and governance** (a token registry with a migration/version model), and the eslint standard `@atlaskit/eslint-plugin-ui-styling-standard` — the shape of our own enforcement | React components; its colour ramps and brand palette (someone else's hues); its density/`@atlaskit/flex` layout engine; a token file we cannot import into Tailwind 4's `@theme` without a resolver |
| **Adobe Spectrum** — spectrum.adobe.com + opensource.adobe.com/spectrum-design-data | Platform-agnostic *values* (Adobe products); the design-data site is a token registry with per-component JSON (`accordion.json`, `button.json`, …) | **JSON per component** in a public repo (`Adobe/spectrum-design-data`, GitHub API answers 200 at 7,271 B); `/llms.txt` 404s at spectrum.adobe.com (a doc-structure finding, not a failure) | Values-as-data (a registry, a governance model), and its **semantic-role** naming — Spectrum is deliberately role-shaped ("focus, overlay"), which is the same idea we already use | Its palette and hue ramp (Adobe's brand); its component-specific token files (a component-per-token model we do not have); the illustrated-message/illustration language |
| **GOV.UK Design System** — design-system.service.gov.uk (**the topic's `design-system.gov.uk` does not resolve; this is the domain**) | HTML + SCSS for the **UK government prototype kit and production CSS**; a service, not an app framework | SCSS with **named classes and `rem`-based type scale**; no token JSON — the site publishes guidance plus code snippets; `/llms.txt` 404s (44,108 B of the site's own 404 page), `/sitemap.xml` answers 200 at 16,385 B | Behavior contracts we are weakest on: forms, validation, error summaries, "Recover from validation errors", confirmation pages, step-by-step navigation, page-not-found, service-unavailable — all *documented* non-decisions and decisions in a domain we have no ruling for | Its palette (the government green/blue is a brand we would refuse outright); its `govuk-frontend` class library; its accessibility advice keyed to a runtime we don't have (agency-run services) |

## The 18 domains — fixed now, never extended

color roles & theming · typography & measure · spacing & rhythm · radius & shape · elevation &
surfaces · motion · iconography · focus & keyboard · controls & buttons · forms & validation ·
feedback/notices & status · data display (tables, lists, empty states) · navigation & wayfinding ·
overlay surfaces (dialog, popover, menu, tooltip) · loading/empty/error states · accessibility
contract (names, roles, targets) · i18n/RTL · tokens governance & versioning

## How this corpus is read

- Every claim in a domain file carries a locator (`source: <url>#<heading>`) and a verbatim quote of
  ≤ 40 words. No quote, no claim. Two sources disagreeing inside one system is a `CONTESTED` row.
- A domain a system never answers is `NO EVIDENCE` in that system's `COVERAGE.md` — never filled from
  memory. Anything known-but-unlocatable goes in that system's `PRIOR.md`, marked
  `UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS`.
- **Quote normalisation, stated once and applied identically on both sides.** A quote verifies when its
  text appears in a fetched digest after: curly quotes and en/em dashes map to ASCII (`’`→`'`, `”`→`"`,
  `—`→`-`); all whitespace collapses to one space (so a quote may span a soft line break); a space before
  `,.!?:;)]}"'` is dropped; backticks and markdown escape characters are dropped (inline code spans are
  stripped in the digest, so they are not part of the text); a space on either side of a hyphen collapses
  to the hyphen (a markdown bullet and an em dash become the same character); and a run of three or more
  dots is an **elision**, so a quote may be two verbatim spans joined where a sentence was dropped —
  every elided span still has to appear verbatim, in order. The checker is
  `.design/tmp-refs/verify-quotes.py` (gitignored scratch): **996 claim rows** across all five systems
  as of this pass (`@measured 2026-11-18` by that checker, run per system: govuk 191 + carbon 195 +
  atlassian 209 + spectrum 186 + material 215), 0 hard misses, 0 quotes over 40 words, 0 no-quote rows,
  0 locators that are not a fetched URL. The same pass earlier printed 597 rows over Carbon, Atlassian
  and GOV.UK only (`@measured 2026-11-17`), which is why an older file may quote a smaller total.
  Each system's `COVERAGE.md` points back here rather than restating the rules.
- Where a system **states** a rule and ships **no detector** for it, that is recorded — it is
  evidence that our enforcement model, not theirs, is the thing worth keeping.

## Two hazards this pass had to design around

1. **The topic named a dead domain.** `design-system.gov.uk` does not resolve from this rig (curl:
   `Could not resolve host`); the working domain is `design-system.service.gov.uk` — its home page is
   51,674 B and its sitemap 16,385 B. The fifth source is that site, so the "fall back to the GitHub
   repo tree" clause was **not needed as a fallback** — but the repo tree was fetched anyway, for a
   different reason: it is the only *enumerable* index on this site (`api.github.com/repos/alphagov/govuk-design-system/git/trees/HEAD?recursive=1`, 200, **384,177 B**, 1,241 entries, `truncated: false`, 122 `src/**/index.md` content pages). The repo meta (`…/govuk-design-system`, 200, 7,526 B) corroborates that the repo behind the site exists. What the tree makes possible is a measured not-reached list rather than an impression — see `<system>/COVERAGE.md` for GOV.UK.
2. **`check:decisions` reads every tracked file.** `scripts/decision-index.mjs --check` walks
   `git ls-files` and fails on a `D###` citation with no entry in `.notes/DECISIONS.md`. So §5 of
   GAP-ANALYSIS.md proposes refusals with **placeholder ids** (`DRAFT·<slug>`), never a bare
   `D###`: a proposed id that parses like a real one turns `verify` red on the branch, which is the
   wrong price for a decision nobody has ruled.

## Layout

| Path | What |
|---|---|
| `README.md` | this file: our system, the matrix, the domain list, the hazards |
| `<system>/COVERAGE.md` | what was fetched, its bytes, what it contained, what could not be reached and why |
| `<system>/<domain>.md` | one domain, one normalized table: `id · claim · kind · locator · quote · enforcement` |
| `<system>/PRIOR.md` | ungrounded knowledge, quarantined |
| `GAP-ANALYSIS.md` | §0 method + coverage ledger · §1 contradicted-in-our-house · §2 ranked gaps ≤25 with detectors · §3 why we diverge · §4 what to steal exactly · §5 what to refuse, in our register |
