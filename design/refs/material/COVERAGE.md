# Material (Material 2) — coverage ledger

Source: **Material Design, the Material 2 site** — `m2.material.io`, with `material.io` as its twin.
Fetched 2026-11-18 from this rig (Linux native; `curl -sS -m 30 -L` for the host artifacts, `kagi_extract`
with timeout 10 for the page prose, because the prose is not in the HTML — see the shell finding below).
Bytes are read off `curl -w "%{size_download}"` into `.design/tmp-refs/` (the gitignored scratch half of
`m2.material.io/design/`); for the `kagi_extract` rows the **byte column is digest bytes on disk**, not wire size.

**The Material 2 host is a soft-200 shell server, and that is the reason half of this ledger is empty.**
`https://m2.material.io/this/path/does/not/exist-9f3a` (a path that has never existed) answers **200 at
67,614 B, md5 `617b93271e5fae4f99bf0aef64d43582`** — byte-identical to `https://m2.material.io/`, to
`/design/guidelines-overview`, to `/design/color/the-color-system.html`, to `m2.material.io/llms.txt`, and
to a `.md`-twin probe of a docs path. The shell's own `<head>` script adds `noindex` "dynamically,
pre-emptively", which is the Angular PWA's way of saying *this page exists only after XHR fills it*.
Consequences, stated once and used everywhere below:

- **No URL on that host is distinguishable by content.** A fetch of a guessed path cannot be detected by
  status or size, so every "not reached" reason in this ledger is a `kagi_extract` returning **no markdown
  content**, not an HTTP status.
- `kagi_extract` is therefore the only reader that gets the prose at all — and it gets it for **most**
  paths, because it renders the XHR. Where it also returns nothing, the page is genuinely client-rendered
  beyond its reach, and that is recorded as "no markdown", never as a 404.

**Machine entry point first: there is none, and its absence is measurable.** `m2.material.io/llms.txt`
answers 200 with the shell (md5 above) — there is no llms file. `robots.txt` answers 200 at 55 B.
`sitemap.xml` answers 200 at **33,544 B with 368 `<loc>`, every one of them a `material.io` URL, 83 of
them under `/design/`** (saved as `material-sitemap.xml` and `material-design-urls.txt`, 83 lines). That
83-line list is this system's only enumerable index, and it is what makes "what we did not fetch" a
counted statement instead of an impression. `m3.material.io/sitemap.xml` answers 200 at **721,312 B** —
Material 3, the live successor, deliberately **named and not ingested**: every m2 page opens with
"Material 2 is no longer maintained. Upgrade to Material 3", so the corpus is a deprecated fork, and
ingesting the successor would be a second, larger pass.

## Digest rule (stated once; the checker's normalisation is in `../README.md`)

Digests are `body/material-<slug>.txt`, produced by `kagi_extract` (markdown). Prose is verbatim.
Stripped: the site nav tree (identical on every page), image lines and image URLs, audio-control noise
(`volume_off Mute Unmute`), "Read more" lead-in duplicates (the fuller paragraph is kept), related-article
link blocks, "Contents" and "Up next" lists, footer links, and the `_menu_ / _search_ / _close_` UI noise.
Curly apostrophes and curly double quotes are normalized to ASCII. Table rows are kept as written
(markdown pipes), which is why **no quote in a domain file may contain a pipe** — table values are quoted
as prose sentences (the caption beside the table) or joined with the documented `...` elision, never by
copying a cell.

## Reached (date · URL · code · bytes)

45 rows carry the date 2026-11-18 in `.design/tmp-refs/manifest.tsv`; 22 of them are content-bearing
pages (digest bytes on disk), 23 are probes recorded so nobody re-runs them.

| Date | URL | Code | Bytes | What it gave us |
|---|---|---|---|---|
| 2026-11-18 | `m2.material.io/design/color/color-usage.html` | 200 | 4,789 | hierarchy, brand, meaning, state — the colour *usage* contract |
| 2026-11-18 | `m2.material.io/design/color/dark-theme.html` | 200 | 10,956 | the dark-theme property set, the 0%→16% elevation-overlay table, state overlays |
| 2026-11-18 | `m2.material.io/design/color/text-legibility.html` | 200 | 3,552 | WCAG thresholds, the 87/60/38% text-opacity ladder, helper text (form-adjacent) |
| 2026-11-18 | `m2.material.io/design/color/the-color-system.html` | 200 | 67,614 | **shell** — no prose; the palette page is out of reach |
| 2026-11-18 | `m2.material.io/design/color/applying-color-to-ui.html` | 200 | 67,614 | **shell** — no prose |
| 2026-11-18 | `material.io/design/color/the-color-system.html` | 200 | 0 | twin probe, **no markdown returned** |
| 2026-11-18 | `material.io/design/usability/accessibility.html` | 200 | 0 | twin probe, **no markdown returned** |
| 2026-11-18 | `m2.material.io/design/typography/the-type-system.html` | 200 | 3,779 | the thirteen-style scale, units and the rem conversion |
| 2026-11-18 | `m2.material.io/design/typography/understanding-typography.html` | 200 | 8,456 | baseline grid, line length, tabular figures, alignment, system fonts |
| 2026-11-18 | `material.io/design/typography/language-support.html` | 200 | 7,815 | the three script categories (English-like / Tall / Dense), Noto guidance, per-language table |
| 2026-11-18 | `m2.material.io/design/layout/understanding-layout.html` | 200 | 8,334 | body/navigation/app-bar regions, the breakpoint table, 40–60 character measure |
| 2026-11-18 | `m2.material.io/design/layout/responsive-layout-grid.html` | 200 | 5,833 | columns, gutters, margins, the breakpoint system |
| 2026-11-18 | `m2.material.io/design/layout/spacing-methods.html` | 200 | 5,198 | 8dp/4dp grids, padding, dimensions, keylines, containers, touch targets |
| 2026-11-18 | `m2.material.io/design/layout/applying-density.html` | 200 | 6,281 | the density scale, when not to densify, the iOS touch-target exception |
| 2026-11-18 | `m2.material.io/design/environment/elevation.html` | 200 | 67,614 | **shell** — the m2 path returned no prose; the twin below did |
| 2026-11-18 | `material.io/design/environment/elevation.html` | 200 | 12,652 | **the twin answered**: elevation, resting/dynamic elevations, the default-value table |
| 2026-11-18 | `m2.material.io/design/environment/light-shadows.html` | 200 | 67,614 | **shell** — no shadow recipe anywhere |
| 2026-11-18 | `m2.material.io/design/environment/surfaces.html` | 200 | 67,614 | **shell** — the Surfaces parent page |
| 2026-11-18 | `m2.material.io/design/motion/the-motion-system.html` | 200 | 7,666 | the four transition patterns, 92%→100% and 80%→100% scales, per-platform status |
| 2026-11-18 | `m2.material.io/design/motion/speed.html` | 200 | 5,775 | durations by area, exits shorter than entrances, the four easings with CSS curves |
| 2026-11-18 | `m2.material.io/design/interaction/states.html` | 200 | 15,862 | the eleven states, the overlay model, per-state opacity tables, inheritance lists |
| 2026-11-18 | `m2.material.io/design/usability/bidirectionality.html` | 200 | 8,698 | mirroring rules, what is not mirrored, localization |
| 2026-11-18 | `material.io/design/navigation/understanding-navigation.html` | 200 | 7,394 | **twin answered**: lateral / forward / reverse navigation, destination-count selection table |
| 2026-11-18 | `material.io/design/communication/help-feedback.html` | 200 | 4,083 | **twin answered**: help placement, the two named icons, help tooltips, help writing |
| 2026-11-18 | `m2.material.io/design/iconography/system-icons.html` | 200 | 9,952 | the 24dp grid, live area, 2dp stroke, corner radii, icon opacities |
| 2026-11-18 | `m2.material.io/design/shape/about-shape.html` | 200 | 4,551 | the default 4dp corner, shape as identity/state/brand, shape and usability |
| 2026-11-18 | `m2.material.io/design/communication/empty-states.html` | 200 | 2,979 | empty states, starter content, educational content, best match |
| 2026-11-18 | `m2.material.io/design/communication/data-visualization.html` | 200 | 17,817 | chart selection, the zero baseline, chart typography, empty graphs, behavior |
| 2026-11-18 | `m2.material.io/design/material-theming/overview.html` | 200 | 3,717 | Material Theming, its three actions, the default-value tables (`#6200EE`, 14pt, 4dp) |
| 2026-11-18 | `material.io/design/guidelines-overview` | 200 | 67,614 | **shell**, same bytes/md5 as the m2 home page |
| 2026-11-18 | `m2.material.io/` , `/design/guidelines-overview`, `/design/foundation-overview` | 200 | 67,614 | the shell, three times; artifacts `material-home.html`, `material-guidelines.html`, `m2io-guidelines.html`, `m2-llms.txt`, `m2-mdtwin.html`, `probe-nonsense.html`, `material-color.html`, `material2-color.html` all carry md5 `617b93271e5fae4f99bf0aef64d43582` |
| 2026-11-18 | `m2.material.io/sitemap.xml` | 200 | 33,544 | 368 `<loc>`, all `material.io`, 83 under `/design/` — the index |
| 2026-11-18 | `m2.material.io/robots.txt` | 200 | 55 | no design prose |
| 2026-11-18 | `m3.material.io/sitemap.xml` | 200 | 721,312 | Material 3, the live successor — **named, not ingested** |
| 2026-11-18 | `m3.material.io/components/buttons/overview` | 200 | 63,208 | client-rendered: its kagi digest is **3 bytes**. Never quoted. |

## Sections reached, and why the rest were not

The sitemap's 83 `/design/` URLs are the whole published set. **22 reached with prose**; the other 61 and
why:

| Not reached | Reason |
|---|---|
| `communication/confirmation-acknowledgement.html`, `communication/onboarding.html`, `communication/launch-screen.html`, `communication/imagery.html` | Not opened. They are Communication siblings of the two pages that were (empty states, help & feedback); the domains that needed a contract got those two. Confirming a completed transaction is a domain of the failure-page systems (GOV.UK, Carbon), not of Material 2. |
| `communication/data-formats.html`, `communication/offline-states.html` | **Probed, no markdown returned** (2026-11-18, recorded above). These were the two best candidates for the forms/validation and loading/error domains, and both are unreachable through the renderer — so those cells stay NO EVIDENCE rather than being guessed. |
| `communication/writing.html` | Reached, **no markdown** (shell). Writing guidance is the reason the empty-state tagline rule is quoted from the empty-states page instead. |
| `navigation/search.html`, `navigation/navigation-transitions.html` | Not opened. The owner page (`understanding-navigation`) was reached through the twin and states the three navigational directions and the component-selection rule; search-specific behaviour would add the control, not the direction contract. |
| `usability/accessibility.html` | Reached twice, **no markdown** (m2 shell and twin). This is why the accessibility domain quotes its thresholds from text-legibility, dark-theme, states and data-visualization rather than from an accessibility page — and it is why the domain's status is *stated elsewhere*, not *absent*. |
| `motion/understanding-motion.html`, `motion/choreography.html`, `motion/customization.html` | Not opened. The two pages that carry the numbers (the-motion-system, speed) were reached; choreography and customization would add composition of the same atoms. |
| `interaction/gestures.html`, `interaction/selection.html` | Not opened. `states.html` (15,862 B) is the owner of the state vocabulary, the overlay model and the inheritance lists; the two gestures pages are input-method narration. |
| `layout/component-behavior.html`, `layout/pixel-density.html` | Not opened; the grid/measure pages that carry numbers were reached. |
| `shape/applying-shape-to-ui.html`, `shape/shape-hierarchy.html`, `shape/shape-as-expression.html`, `shape/shape-motion.html`, `shape/shape-motion` | Not opened. `about-shape.html` states the default shape and the two constraints on changing it; the other four are applications of it. Recorded here because radius is a domain where our own rule is single-valued, and a second radius opinion would be a CONTESTED row we would need. |
| `iconography/product-icons.html`, `iconography/animated-icons.html` | Not opened. `system-icons.html` is the owner of the grid, metrics and colour rules, and is the icon set a web product can actually use. |
| `platform-guidance/*` (13 pages) | Android/iOS-specific platform narration (bars, fingerprint, haptics, notifications, permissions, slices, split-screen, swipe-to-refresh, text-selection toolbar, widget, navigating-between-apps, android-icons, cross-platform adaptation). Not portable to an Astro/Svelte island web product; the one cross-platform claim we carry is stated on `system-icons.html` and on `the-motion-system.html`'s status table. |
| `machine-learning/*` (4 pages) | Out of scope for a design-system corpus: ML interaction patterns. |
| `material-studies/*` (9 pages) | Case studies of real apps. Narration, not rules; they are where an agent would find a picture of a finished app and no number to compare. |
| `material-theming/implementing-your-theme.html` | Not opened. `overview.html` states the three actions and the default values; the implementing page is the platform API side. |
| `m2.material.io/design/introduction`, `m2.material.io/design/foundation-overview`, `m2.material.io/design/guidelines-overview`, `m2.material.io/design/environment` | The overview surfaces answer the **shell** wherever they were probed (`m2.material.io/` and `/design/guidelines-overview` in the artifacts table above; `foundation-overview` and `m2.material.io/design/environment` were never opened). Nothing in this corpus quotes an overview page. |
| Every `m2.material.io/components/*` page (not in the 83, but in the nav) | Component pages are the component library (a different product surface from the 83 guidelines URLs) and are client-rendered like the m3 pages; the m3 buttons probe (digest 3 B) is the evidence of that. No component-page claim is made anywhere in this system's files. |

## Domain status (the 18, fixed in `../README.md`)

EVIDENCED: `color-roles-theming` · `typography-measure` · `spacing-rhythm` · `radius-shape` ·
`elevation-surfaces` · `motion` · `iconography` · `focus-keyboard` · `controls-buttons` ·
`feedback-notices-status` (help & feedback + states + colour-meaning) · `data-display` ·
`navigation-wayfinding` (through the twin) · `overlay-surfaces` · `loading-empty-error` ·
`accessibility-contract` (thresholds stated on four pages, no accessibility page reachable) ·
`i18n-rtl` (bidirectionality + language support) · `tokens-governance-versioning` — **17**.

**NO EVIDENCE: `forms-validation`** — the one domain Material 2 does not answer. The 83-URL index contains
no forms, input, validation or error-summary page; the two closest candidates (`communication/data-formats.html`,
`communication/offline-states.html`) were probed and returned no markdown. Form-adjacent rules do exist
(helper text, error helper hex, which components may inherit a selected/disabled state, density on long forms)
and those rows are in the file with their locators; the validation *contract* — what a failed submission shows,
where the message goes, how the user recovers — is not stated anywhere in this system.

CONTESTED rows exist in two domains — `iconography` and `accessibility-contract` — where `system-icons.html`
and `text-legibility.html` give different opacities for the same icon role (60% vs 38% inactive on light;
100%/70%/50% vs 87%/60%/38% on dark). Both pages were fetched; the disagreement is in the system, not in the
digests. See those files for the rows.

## Where this system enforces, and where it is behind us

- **Nothing here is enforceable by a consumer.** No lint config, no style-rule plugin, no token file, no
  test harness appears on any of the 22 pages. Their mechanisms are a **Figma kit** ("The Material Design Kit
  on Figma includes templates for working with the breakpoint, column grid, and margin guidance"),
  **Adobe Illustrator files** for the icon grid, and a **type scale generator** powered by Google Fonts.
  Every rule is prose the consumer is expected to have read. That is the corpus's cleanest evidence for
  keeping *our* detector-per-rule model rather than importing theirs, and it is why the `enforcement` column
  reads `none` almost everywhere in this system's files.
- It is **behind us on versioning where it is behind most visibly**: the corpus is a deprecated fork. Every
  page opens with "Material 2 is no longer maintained. Upgrade to Material 3" and publishes no deprecation
  date, no migration for its own numbers, and no pointer from a 4dp default to whatever the successor chose.
  Our system names one home for values and appends ids; this system forks itself and leaves the old half
  published.
- It is **behind us on reduced motion**: no fetched page says anything about a reduced-motion preference,
  and the motion system's own status table lists Web as Unavailable.
- It is **ahead of us** (i.e. worth stealing) on: elevation as a named per-component ladder with resting and
  dynamic values, the state-overlay ladder (hover < selected < focus/activated < pressed), the four named
  transition patterns, the density scale with an explicit "do not densify alerts or pickers" refusal, and
  touch targets stated as *touch target ≠ visual size* (a 24dp icon in a 48dp target).
