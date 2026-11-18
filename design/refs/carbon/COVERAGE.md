# Carbon — coverage ledger

Source: **IBM Carbon Design System**, carbondesignsystem.com. Fetched 2026-11-17 from this rig
(Linux native, `curl -sS -m 30 -L`, bytes read off `curl -w "%{size_download}"` into
`.design/tmp-refs/` — the gitignored scratch half of `design/`, kept out of the gate set).

Machine entry point first: `/llms.txt` answered **200 at 30,912 B** and indexes
Foundations → Core components → Patterns → Data visualization → Getting started, naming
**128 page URLs** in total (counted off the fetched index). That index is what makes the
"not reached" reasons below enumerable rather than apologetic.

Carbon pages render as **static HTML** (curl reaches the prose — no rendering proxy needed, unlike
Material), so every quote in this system's domain files came from a local digest of a page fetched
once. Page footers carry "Last updated Sep 30, 2026" and "Copyright © 2026 IBM", which is what dates
this evidence.

## Quote normalisation

Stated once in `../README.md` § How this corpus is read. Specific to this system: the corpus is the
**27 fetched page digests** (`txt/carbon-*.txt`) plus `carbon-llms.txt` (the 30,912 B machine index) —
no page is quoted from memory, and a page whose digest is not on disk has no claim.

## Reached (date · URL · HTTP · bytes · effective URL)

| Date | URL asked | Code | Bytes | Effective URL (what the prose came from) |
|---|---|---|---|---|
| 2026-11-17 | `…/llms.txt` | 200 | 30,912 | machine index of 128 pages |
| 2026-11-17 | `/building-blocks/foundations/color` | 200 | 388,271 | `…/foundations/color/overview` |
| 2026-11-17 | `/building-blocks/foundations/typography` | 200 | 210,715 | `…/foundations/typography/overview` |
| 2026-11-17 | `/building-blocks/foundations/spacing` | 200 | 236,336 | `…/foundations/spacing/overview` |
| 2026-11-17 | `/building-blocks/foundations/motion` | 200 | 259,147 | `…/foundations/motion/overview` |
| 2026-11-17 | `/building-blocks/foundations/accessibility` | 200 | 240,720 | `…/foundations/accessibility/overview` |
| 2026-11-17 | `/building-blocks/foundations/icons` | 200 | 12,883,692 | `…/foundations/icons/library` (redirect) |
| 2026-11-17 | `/building-blocks/foundations/themes` | 200 | 212,918 | `…/foundations/themes/overview` |
| 2026-11-17 | `/building-blocks/foundations/2x-grid` | 200 | 304,885 | `…/foundations/2x-grid/overview` |
| 2026-11-17 | `/building-blocks/foundations/content` | 200 | 184,108 | `…/foundations/content` |
| 2026-11-17 | `/building-blocks/core/patterns/empty-states` | 200 | 378,793 | same |
| 2026-11-17 | `/building-blocks/core/patterns/dialogs` | 200 | 360,792 | same |
| 2026-11-17 | `/building-blocks/core/patterns/forms` | 200 | 494,876 | same |
| 2026-11-17 | `/building-blocks/core/patterns/status-indicators` | 200 | 378,387 | same |
| 2026-11-17 | `/building-blocks/core/patterns/loading` | 200 | 234,175 | same |
| 2026-11-17 | `/building-blocks/core/patterns/notifications` | 200 | 349,804 | same |
| 2026-11-17 | `/building-blocks/core/patterns/disabled-states` | 200 | 193,656 | same |
| 2026-11-17 | `/building-blocks/core/patterns/overflow-content` | 200 | 199,807 | same |
| 2026-11-17 | `/building-blocks/core/patterns/search` | 200 | 310,796 | same |
| 2026-11-17 | `/building-blocks/core/components/modal` | 200 | 377,761 | `…/modal/guidelines` |
| 2026-11-17 | `/building-blocks/core/components/popover` | 200 | 338,929 | `…/popover/guidelines` |
| 2026-11-17 | `/building-blocks/core/components/tooltip` | 200 | 281,691 | `…/tooltip/guidelines` |
| 2026-11-17 | `/building-blocks/core/components/button` | 200 | 720,981 | `…/button/guidelines` |
| 2026-11-17 | `/building-blocks/core/components/menu` | 200 | 403,723 | `…/menu/guidelines` |
| 2026-11-17 | `/building-blocks/core/components/data-table` | 200 | 435,622 | `…/data-table/guidelines` |
| 2026-11-17 | `/building-blocks/core/components/breadcrumb` | 200 | 252,045 | `…/breadcrumb/guidelines` |
| 2026-11-17 | `/getting-started/designing/design-resources` | 200 | 263,948 | same |
| 2026-11-17 | `/getting-started/migrating/guide` | 200 | 214,782 | `…/migrating/guide/overview` |

28 fetches, 0 non-200s. Provenance of the byte column: rows fetched through the scratch `get.sh`
append to `.design/tmp-refs/manifest.tsv` (which today holds the 27 Carbon page rows and the 4 Atlassian
page rows); the entry-point artifacts (`carbon-llms.txt`) were logged only as artifacts on disk, so their
size is read off `ls -l` of the fetched file (30,912 B for `carbon-llms.txt`, confirmed this session).
Both are the same measurement of the same artifact by two means; the row that would be wrong is a row
neither means produced. Text digests of each (HTML stripped, headings kept) sit beside this ledger in
`.design/tmp-refs/txt/`, 6.9 KB – 145.9 KB each.

## Sections reached, and why the rest were not

Reached sections are named in the domain files (`locator` column carries the heading). Of the 128
pages the index names, **28 were fetched**. The rest were not, for one of three recorded reasons:

| Not reached | Reason |
|---|---|
| `…/foundations/icons` usage guidance | `/foundations/icons` **redirects to `/icons/library`**, which is a catalogue of icon *names* (12.8 MB, 145.9 KB of text). The overview prose the index promises was not in the fetched document; icon rules are therefore only evidenced from the pages that quote them (status indicators, button, tooltip), and the icons-library page is recorded here as a **doc-structure finding**, not as absence of a rule. |
| `…/foundations/pictograms`, `…/foundations/carbon-for-ai` | Out of the 18-domain list; no domain of our system needs them. Not fetched. |
| Every `…/components/<name>/specifications` and `…/code` tab | The Specifications tabs are where Carbon puts px tables in a separate document. Where a component's guidelines page already states the pairing rule (button sizes, data-table row heights, menu item heights) the guidelines page is the locator. Fetching the spec tab as well would be a second byte-cost on the same claim, and the claims we carry do not need the tab's numbers. |
| `…/core/patterns/{common-actions,disclosures,filtering,fluid-styles,global-header,login,overview,read-only-states,text-toolbar}` | Not fetched. `disclosures` and `read-only-states` are named inside reached pages as the owner of a rule (popover trigger behaviour; read-only style); the reached page's own sentence is quoted instead, and the row is marked `PARTIAL` where the owner page would have been better. `login` and `global-header` have no domain in the fixed 18 that would use them. |
| `…/core/components/{accordion,badge,breadcrumb-duplicate,card,carousel,chart,code,combo,…}` — the remaining ~60 components | One component per domain would be volume, not judgment. The five components chosen (modal, popover, tooltip, button, menu, data-table, breadcrumb) are the ones that carry a rule our system has a token or a silence for. |
| `…/data-visualization/*` | No domain in the fixed 18 covers chart geometry; not fetched. |
| `…/getting-started/*` except two, `…/contributing/*`, tutorials, articles, blogs | Doc-about-docs. The two fetched (`design-resources`, `migrating/guide`) are the ones that carry the token-governance and versioning evidence. |

## Domain status (the 18, fixed in `../README.md`)

Every domain below is **EVIDENCED**; three are **PARTIAL**, and the partiality is named in the file
rather than smoothed away:

`color-roles-theming` · `typography-measure` · `spacing-rhythm` · `radius-shape` (PARTIAL — Carbon
states a corner radius only where a component needs one; no global radius scale page was found in the
index) · `elevation-surfaces` (Carbon answers with **layering**, not elevation — the divergence is the
finding) · `motion` · `iconography` (PARTIAL — see the icons redirect above) · `focus-keyboard` ·
`controls-buttons` · `forms-validation` · `feedback-notices-status` · `data-display` ·
`navigation-wayfinding` · `overlay-surfaces` · `loading-empty-error` · `accessibility-contract` ·
`i18n-rtl` (PARTIAL — three RTL rules found, in button, menu and search; no dedicated
localization page in the index) · `tokens-governance-versioning`.

**No domain in this system is `NO EVIDENCE`.** Where a domain is thin, the thinness is the row count
and the named partiality, not a missing file.

## What this system enforces about itself

Across the 28 pages fetched, Carbon names **no gate, no lint rule and no CI check** of its own rules:
the enforcement it offers is that the values *ship* — v11 colour tokens "are now shipped as CSS
Custom Properties", styles live in `@carbon/styles`, React components in `@carbon/react` — so a
project that does not install the package gets none of the rules. The one checklist-shaped artifact is
the motion page's **Evaluation checklist** (a human-passed list, quoted in
`carbon/motion.md`). This is recorded as evidence that **our** enforcement model — one rule, one
detector, each with a selftest that plants the defect — is the keeper, not theirs.
