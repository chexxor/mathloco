# GOV.UK Design System — coverage ledger

Source: **GOV.UK Design System**, `design-system.service.gov.uk`. Fetched 2026-11-17 from this rig
(Linux native, `curl -sS -m 30 -L`, bytes read off `curl -w "%{size_download}"` into
`.design/tmp-refs/`, the gitignored scratch half of `design/`).

**The topic's domain is dead, and the working one is not a guess.** `design-system.gov.uk` does not
resolve from this rig (`curl: Could not resolve host`); `design-system.service.gov.uk` answers 200 and
its home page is 51,674 B on disk. The fallback clause in the topic ("its GitHub repo tree as the
fallback entry point") was therefore not needed as a fallback — but the repo tree was fetched anyway,
because it is the only **enumerable** index here and it is what makes "what we did not fetch" a
measured statement rather than an impression.

**Machine entry point first: there isn't one, and that is the finding.** `https://design-system.service.gov.uk/llms.txt`
answers **404 at 44,108 B**, and those 44,108 B are byte-for-byte the site's own 404 page: the file
on disk hashes `b6b9dda15581622b3a7742ada1470af1`, and a fresh probe of a path that has never existed
(`…/patterns/ask-users-for/`) hashes the same at the same 44,108 B. So the site does not 404 silently —
it ships a page, which is why an unguarded fetch of a guessed URL would have filled a domain file with
cookie-banner prose. What *is* machine-readable is `/sitemap.xml` (200, 16,385 B, real XML, 190
`<loc>` entries) and the repo tree (`api.github.com/repos/alphagov/govuk-design-system/git/trees/HEAD?recursive=1`,
200, 384,177 B, 1,241 entries, `truncated: false`) — the two indexes that made the not-reached list
possible.

**Quote normalisation** is stated once, in `../README.md` § How this corpus is read; what is specific
here is *which files are the corpus*: the 26 `body/govuk-*.txt` digests (nav-stripped text of each
fetched page), and deliberately **not** `govuk-llms.txt` — that file is the site's 404 page, and a
checker that let it in would let cookie-banner prose answer a design question.

## Reached (date · URL · HTTP · bytes)

26 rows are in `.design/tmp-refs/manifest.tsv` (the machine record `get.sh` appended); the 5 artifacts
were logged as files on disk, so their sizes are read off `ls -l`, confirmed this session. Every
prose claim below cites one of these rows.

| Date | URL | Code | Bytes | What it gave us |
|---|---|---|---|---|
| 2026-11-17 | `https://design-system.service.gov.uk/` | 200 | 51,674 | artifact `govuk-home.html` — the site's own statement of what it is |
| 2026-11-17 | `https://design-system.service.gov.uk/sitemap.xml` | 200 | 16,385 | artifact `govuk-sitemap.xml` — real XML, 190 `<loc>`s; the index of everything reachable |
| 2026-11-17 | `https://design-system.service.gov.uk/llms.txt` | 404 | 44,108 | artifact `govuk-llms.txt` — **the 404 page**, md5 `b6b9dda1…`; see finding above |
| 2026-11-17 | `https://design-system.service.gov.uk/get-started/` | 200 | 49,533 | artifact `govuk-getstarted.html` |
| 2026-11-17 | `https://design-system.service.gov.uk/styles/colour/` | 200 | 98,560 | artifact `govuk-colour.html` — functional colour roles, tint/shade variants |
| 2026-11-17 | `https://api.github.com/repos/alphagov/govuk-design-system` | 200 | 7,526 | artifact `govuk-repo-meta.json` — the repo exists; corroborates the site |
| 2026-11-17 | `https://api.github.com/repos/alphagov/govuk-design-system/git/trees/HEAD?recursive=1` | 200 | 384,177 | artifact `govuk-repo-tree.json` — 122 `src/**/index.md` content pages; the enumerable index |
| 2026-11-17 | `…/patterns/validation/` | 200 | 61,259 | the whole forms/validation contract |
| 2026-11-17 | `…/patterns/confirmation-pages/` | 200 | 66,603 | transaction completion, bookmarked return |
| 2026-11-17 | `…/patterns/problem-with-the-service-pages/` | 200 | 98,767 | unexpected failure, stored answers, resume |
| 2026-11-17 | `…/patterns/page-not-found-pages/` | 200 | 71,716 | 404 as a design decision |
| 2026-11-17 | `…/patterns/interruption-pages/` | 200 | 68,320 | the panel that pauses a journey; its own contributed history |
| 2026-11-17 | `…/patterns/service-unavailable-pages/` | 200 | 131,502 | deliberate closure, shutter pages |
| 2026-11-17 | `…/styles/spacing/` | 200 | 69,701 | responsive + static spacing scales, negative units, override classes |
| 2026-11-17 | `…/styles/type-scale/` | 200 | 58,328 | type scale points, line-height multiple of 5px, vertical rhythm |
| 2026-11-17 | `…/get-started/new-type-scale/` | 200 | 50,567 | the v6.0.0 type-scale change, a deprecated scale point |
| 2026-11-17 | `…/get-started/focus-states/` | 200 | 52,406 | focus state colour/width values as Sass roles, WCAG 2.2 SC 1.4.11 |
| 2026-11-17 | `…/styles/layout/` | 200 | 117,272 | two-thirds layout, 75 characters per line, 1020px max width |
| 2026-11-17 | `…/styles/images/` | 200 | 68,039 | alt text, illustration rules, the icon refusal |
| 2026-11-17 | `…/styles/headings/` | 200 | 62,223 | heading tag vs visual class, caption-above-heading |
| 2026-11-17 | `…/styles/page-template/` | 200 | 178,713 | the boilerplate page, `.govuk-frontend-supported` class |
| 2026-11-17 | `…/components/table/` | 200 | 136,313 | caption element, `scope`, the small-screen text class and its version gate |
| 2026-11-17 | `…/components/button/` | 200 | 105,227 | default/start/secondary/warning/inverse/disabled, button group, 4.5:1 |
| 2026-11-17 | `…/components/error-summary/` | 200 | 132,631 | error summary linking rules, keyboard focus, change-log rows |
| 2026-11-17 | `…/components/error-message/` | 200 | 99,821 | hidden `Error:` prefix, wording rules, keep failing answers |
| 2026-11-17 | `…/components/language-navigation/` | 200 | 102,117 | the multi-language component, including the one RTL sentence |
| 2026-11-17 | `…/community/component-lifecycle-statuses/` | 200 | 54,105 | trial → stable in 6 months, deprecation policy |
| 2026-11-17 | `…/accessibility/` | 200 | 47,595 | the admission that using the system is not accessibility |
| 2026-11-17 | `…/patterns/step-by-step-navigation/` | 200 | 64,300 | steps/tasks structure, and the refusal to publish it outside GDS |
| 2026-11-17 | `…/patterns/task-list-pages/` | **410** | 44,537 | **archived page**: "The task list pattern has been renamed to the Complete multiple tasks pattern…" — governance evidence, not a miss |
| 2026-11-17 | `…/patterns/check-answers/` | 200 | 95,989 | review-before-submit, two-thirds layout, summary cards |
| 2026-11-17 | `…/components/notification-banner/` | 200 | 90,684 | notice placement vs `h1`, the validation-error refusal, `role="region"` |
| 2026-11-17 | `…/components/summary-list/` | 200 | 195,257 | `<dl>` semantics, row actions, hidden link text |

26 manifest rows: 25 at 200, one at 410 (recorded, not retried). Total downloaded across those rows: **2,323,992 B**. Plus 5 artifacts (51,674 + 16,385 + 44,108 + 49,533 + 98,560 = 260,260 B) and the 2 GitHub rows (391,703 B). No row was fetched twice; the 404 probes of `…/patterns/ask-users-for/` etc. were thrown away except one kept as `html/govuk-404-probe.html` to prove the md5 identity.

## Sections reached, and why the rest were not

The sitemap and the repo tree agree on the content set: **122 `src/**/index.md` pages**. 26 of them
were fetched. What was not, and why:

| Not reached | Reason |
|---|---|
| The other ~96 `src/**/index.md` pages | They are the same three shapes: component usage pages (Nunjucks macros + code tabs), `…/history/` pages, and `…/nunjucks/` pages. Every domain that needed a *behaviour contract* got its owner page (validation, error summary/message, confirmation, interruption, three failure-page patterns, step-by-step, check-answers). The rest are code tabs and per-component variants of rules already stated on a fetched page. |
| Every `components/<name>/history/` page | The change-log rows that carry governance evidence (focus moved automatically, `role="alert"` moved nested, guidance on matching question language) are already printed at the bottom of the fetched component pages. History pages are narration of the same rows. |
| Every `components/<name>/nunjucks/` page | Macro reference, not a design rule; the macro calls are in the fetched usage pages. |
| `styles/clear-language/`, `patterns/design-principles/`, `patterns/support-journey/`, `patterns/before-starting/`, `get-started/development-principles/` | **These URLs do not exist here.** Seven probes of them all returned the same 44,108 B 404 page, and the repo tree contains no such path. The GOV.UK *Design System* site has always been a services-how-to site; the "how to think about design" guidance lives in the **Service Manual** on a different domain, which is not one of the five sources and was not fetched. Recorded so nobody re-probes them. |
| `accessibility/accessibility-strategy/`, `accessibility/address-issues/` | The overview page fetched here names both and states the claim we need ("Using the GOV.UK Design System in a service does not immediately make that service accessible"). The strategy page would add process narration, not a design rule. |
| `community/contribution-criteria/`, `community/continuous-research/`, `community/roadmap/` | Governance narration. The lifecycle-statuses page fetched here carries the versioning rule that matters (trial → stable in 6 months, deprecation). |
| `get-started/extending-and-modifying-components/`, `prototyping/`, `production/` | Setup prose for agencies installing `govuk-frontend`. The one rule we need from this family — extended components must use the published focus values rather than numeric ones — is stated on the focus-states page that was fetched. |
| GOV.UK Frontend source (`alphagov/govuk-frontend`) | Not opened. Therefore **no claim is made about the compiled CSS, the Sass map contents, or the breakpoint variables**; the claims are about the documented class names, the documented Sass functions, and the documented numbers. |
| The `…/components/panel/` and `…/components/details/` pages | The interruption panel's behaviour (a panel with a button the user must press) is stated on the interruption-pages pattern page that was fetched; the Panel component page would add the variant's code. |
| `styles/lists/`, `styles/links/`, `styles/paragraphs/`, `styles/section-break/`, `styles/font-override-classes/`, `styles/typeface/` | The fetched set already states the measure rule (layout), the type scale (type-scale), the heading hierarchy (headings), and the image/icon rules (images). Those six pages are markup mechanics of the same rules; fetching them would double the byte cost for rows we already have. |

## Domain status (the 18, fixed in `../README.md`)

EVIDENCED: `color-roles-theming` · `typography-measure` · `spacing-rhythm` · `iconography` ·
`focus-keyboard` · `controls-buttons` · `forms-validation` · `feedback-notices-status` ·
`data-display` · `navigation-wayfinding` · `loading-empty-error` · `accessibility-contract` ·
`tokens-governance-versioning` — 13.

PARTIAL (evidence exists, mechanism does not): `i18n-rtl` — one right-to-left **requirement** sentence
and a translation rule, no mirroring, no logical properties, no `dir` anywhere in 26 pages.

THIN / absence-shaped: `radius-shape` — the only radius statement in the corpus is one sentence about
illustrations; `elevation-surfaces` — no elevation scale, a `surface-*` colour role group, and an
explicit refusal of shadows in illustrations; `overlay-surfaces` — the Interruption panel is the only
overlay-like mechanism, no modal/dialog guidance beyond one parenthetical.

**NO EVIDENCE: `motion`.** The words `motion`, `animation`, `transition` appear in **zero** guidance
sentences across the 26 fetched pages (searched across all body digests; the only hit for that
pattern family is an unrelated sentence about photography). GOV.UK Frontend ships no motion guidance
to consumers — this system is the one of the five that is furthest behind on motion, and the finding
is the absence of coverage, not a refusal. See `motion.md` for the probe that establishes it.

## Where this system enforces, and where it is behind us

- **Enforcement it ships: none that a consumer can run.** No lint config, no style rule plugin, no
  token registry file, no test harness named on any fetched page. Its mechanism is a **class library
  and Sass functions** (`govuk-!-margin-9`, `@include govuk-font($size: 19)`,
  `govuk-functional-colour("focus")`) — install-and-obey, not check-and-fail.
- It **admits** the limit in writing: "Using the GOV.UK Design System in a service does not
  immediately make that service accessible. You'll need additional research, design, development and
  testing work…" That sentence is the strongest argument in this whole corpus for keeping *our*
  detector-per-rule model rather than importing theirs.
- It states hard thresholds where we are softer: WCAG 2.2 SC 1.4.3 at a named contrast ratio for
  buttons on dark backgrounds, SC 1.4.11 for focus states, "no more than 75 characters per line",
  a 1020px max page width, a 640px breakpoint, `4.5:1`.
- It refuses things outright, in the register our refusals need: "Do not copy the specific
  hexadecimal (hex) colour values", "Do not use HTML5 validation", "Do not add `required` to your
  input fields", "Avoid using icons in most cases", "Disabled buttons have poor contrast… avoid them
  if possible", "Do not customise the design" for step-by-step prototypes.
- It is **behind** us on: motion (nothing), elevation (nothing beyond a colour role group), empty
  states (nothing at all — searched `empty state`, `no results`, `nothing to show`: zero hits),
  touch-target size (no number anywhere in the fetched set), and reduced motion (nothing). Our
  artifacts name all of those except empty states, and name the target sizes.
