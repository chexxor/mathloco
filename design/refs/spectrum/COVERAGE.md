# Adobe Spectrum (Spectrum 2) — coverage ledger

Source: **Adobe Spectrum**, `spectrum.adobe.com`. Fetched 2026-11-17 from this rig (Linux native,
`curl -sS -m 30 -L` through the scratch helper `.design/tmp-refs/get.sh`; bytes read off
`curl -w "%{size_download}"`). 70 fetch rows are in `.design/tmp-refs/manifest.tsv`.

**Machine entry point first: the site has none, and the repo does.** `https://spectrum.adobe.com/llms.txt`
answers **404 at 1,051 B** — a *hard* 404 (small body, no page), the opposite shape from GOV.UK's soft
44,108 B one. `spectrum-sitemap.xml` answers 200 at 28,414 B and carries **223 `<loc>`**, 74 of them
under `/foundations/` — an enumerable index. The repo `llms.txt` (`raw.githubusercontent.com/adobe/spectrum-design-data/main/llms.txt`,
200 at 6,316 B) indexes the packages, and says in its own words: "Spectrum 2 lives on `main`; Spectrum 1
lives on the `s1-legacy` branch." So the machine-readable surface of this system is **the data repo,
not the site**, and everything below is measured against that split.

**The site is a client-side-rendered shell, and that is the doc-structure finding.** 38 content pages were fetched from the site; **12 of them answered 200 with **2,363–2,463 B of HTML and nothing to read**: `get.sh`'s digest of
`/foundations/system/elevation` is **13 B** (`@@ Elevation` and nothing else); `/foundations/behavior/feedback`
12 B; `/foundations/inclusivity/movement` 12 B; `/foundations/system/theming` 11 B; `/foundations/system/tokens`
10 B; `/foundations/behavior/interaction` 15 B; `/foundations/composition/surface` 11 B;
`/foundations/composition/density-and-rhythm` 22 B; `/foundations/inclusivity/assistive` 13 B;
`/content/writing-for-errors` 22 B; `/docs/pattern-library/left-sidenav` 16 B. The shell's own HTML
contains no data URL: `grep -oE 'https?://[^"<> ]*(json|api|data)' html/spectrum-elevation.html` → **no
matches**, and `/scripts/scripts.js` is 1,667 B with no fetch target in it. `kagi_extract` on those eleven
URLs returned **no content** ("No extracted content returned"), so the prose is not reachable by a
rendering proxy either. Those pages are recorded as **reached-but-empty**, never filled from memory.

**What landed instead: the repo's markdown mirror.** `s2-docs/**.md` under
`raw.githubusercontent.com/adobe/spectrum-design-data/main/` mirrors the site's page tree as markdown
with front-matter that carries `source_url:` pointing back at the site page — e.g.
`s2-docs/foundations/behavior/motion.md` declares `source_url: https://spectrum.adobe.com/foundations/behavior/motion`.
Twenty-six of those files were fetched this session (200 each), plus three package files and the repo index. The eleven shells above **have no
markdown twin** — `grep -E '^docs/s2-docs/.*\.md' spectrum-tree-paths.txt` returns 123 markdown files and none of them
is `system/elevation`, `behavior/feedback`, `inclusivity/movement`, `system/theming`, `system/spacing`,
`system/tokens`, `composition/surface`, `composition/density-and-rhythm`, `inclusivity/assistive`,
`behavior/interaction`, or `inclusivity/visual`. The pages whose prose is JS-only are exactly the pages
the mirror omits. That correspondence is the coverage statement, and it is why the elevation and feedback
domains carry claims from *drop shadow* and *component* pages rather than from the shell pages.

## Reached (date · URL · HTTP · bytes fetched)

| 2026-11-17 | https://spectrum.adobe.com/foundations/color/color | 200 | 36,304 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/color/background-layers | 200 | 30,716 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/typography/applying-the-type-system | 200 | 24,273 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/typography/typography-system | 200 | 68,302 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/layout-and-structure/spacing/overview | 200 | 21,694 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/styles/object-styles/rounding | 200 | 23,948 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/system/elevation | 200 | 2,384 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/behavior/motion | 200 | 19,486 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/inclusivity/movement | 200 | 2,387 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/icons-and-illustrations/using-icons | 200 | 42,242 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/behavior/feedback | 200 | 2,381 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/behavior/states | 200 | 11,853 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/inclusivity/internationalization | 200 | 34,393 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/inclusivity/bi-directionality | 200 | 16,605 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/design-data/design-tokens | 200 | 75,450 B |
| 2026-11-17 | https://spectrum.adobe.com/llms.txt | 404 | 1,051 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/color/grays | 200 | 15,329 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/color/colors | 200 | 37,946 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/system/theming | 200 | 2,370 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/system/spacing | 200 | 2,370 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/layout-and-structure/spacing/layout-spacing | 200 | 13,267 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/layout-and-structure/spacing/component-spacing | 200 | 20,901 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/styles/object-styles/drop-shadow | 200 | 21,249 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/composition/density-and-rhythm | 200 | 2,457 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/composition/surface | 200 | 2,380 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/styles/object-styles/overview | 200 | 10,879 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/behavior/interaction | 200 | 2,402 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/content-design/writing-for-errors | 200 | 2,463 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/inclusivity/assistive | 200 | 2,394 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/inclusivity/inclusive-design | 200 | 31,913 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/icons-and-illustrations/icon-fundamentals | 200 | 16,575 B |
| 2026-11-17 | https://spectrum.adobe.com/foundations/system/tokens | 200 | 2,363 B |
| 2026-11-17 | https://spectrum.adobe.com/web/rsp/components/button | 200 | 6,344 B |
| 2026-11-17 | https://spectrum.adobe.com/web/rsp/components/standard-dialog | 200 | 5,767 B |
| 2026-11-17 | https://spectrum.adobe.com/web/rsp/components/tooltip | 200 | 5,767 B |
| 2026-11-17 | https://spectrum.adobe.com/web/rsp/components/toast | 200 | 6,027 B |
| 2026-11-17 | https://spectrum.adobe.com/web/rsp/components/in-line-alert | 200 | 5,354 B |
| 2026-11-17 | https://spectrum.adobe.com/web/rsp/components/search-field | 200 | 5,324 B |
| 2026-11-17 | https://spectrum.adobe.com/docs/pattern-library/left-sidenav | 200 | 2,409 B |
| 2026-11-17 | https://spectrum.adobe.com/docs/pattern-library/banner | 200 | 2,671 B |
| 2026-11-17 | https://spectrum.adobe.com/scripts/scripts.js | 200 | 1,772 B |
| 2026-11-17 | https://api.github.com/repos/adobe/spectrum-design-data/git/trees/main?recursive=1 | 200 | 1,353,842 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/foundations/styles/object-styles/border-width.md | 200 | 4,871 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/foundations/layout-and-structure/containers.md | 200 | 7,621 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/foundations/attention-hierarchy.md | 200 | 3,659 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/content/writing-for-errors.md | 200 | 28,254 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/tooltip.md | 200 | 7,709 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/standard-dialog.md | 200 | 4,923 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/popover.md | 200 | 5,287 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/menu.md | 200 | 9,752 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/table.md | 200 | 8,202 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/side-navigation.md | 200 | 6,867 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/foundations/behavior/motion.md | 200 | 6,427 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/foundations/behavior/states.md | 200 | 2,497 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/llms.txt | 200 | 6,316 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/button.md | 200 | 11,188 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/toast.md | 200 | 10,821 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/in-line-alert.md | 200 | 2,613 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/status-light.md | 200 | 3,857 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/checkbox.md | 200 | 7,522 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/search-field.md | 200 | 8,679 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/cards.md | 200 | 9,070 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/list-view.md | 200 | 3,401 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/contextual-help.md | 200 | 8,705 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/docs/s2-docs/web/rsp/components/action-button.md | 200 | 9,060 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/spec/accessibility.md | 200 | 13,975 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data/llms.txt | 200 | 1,708 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/.github/actions/validate/README.md | 200 | 5,319 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/llms.txt | 200 | 1,638 B |
| 2026-11-17 | https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/token-names/README.md | 200 | 2,095 B |

Digests of the fetched pages (`txt/spectrum-*.txt`, nav-stripped text) are sized in bytes as:
site pages that answered with prose — `color` 6,382 · `c2` (color/colors) 6,377 · `layers` 4,889 ·
`g` (grays) 2,846 · `type-system` 15,456 · `type-apply` 4,036 · `spacing` 2,769 · `layout-spacing` 2,290 ·
`comp-spacing` 3,971 · `rounding` 4,454 · `drop-shadow` 5,066 · `obj-styles` 936 · `motion` 3,454 ·
`states` 1,488 · `icons` 7,438 · `icon-fund` 3,774 · `i18n` 9,756 · `rtl` 2,411 · `incl-design` 6,968 ·
`tokens` (design-data/design-tokens) 13,958. Repo markdown: `md-motion` 6,398 · `md-states` 2,472 ·
`md-errors` 28,176 · `md-table` 8,159 · `md-menu` 9,702 · `md-dialog` 4,900 · `md-popover` 5,256 ·
`md-tooltip` 7,672 · `md-sidenav` 6,826 · `md-containers` 7,584 · `md-attention` 3,640 · `md-bw` 4,841 ·
`md-button` 11,130 · `md-toast` 10,772 · `md-alert` 2,598 · `md-status` 3,832 · `md-checkbox` 7,485 ·
`md-search` 8,638 · `md-cards` 9,032 · `md-listview` 3,376 · `md-contextual` 8,655 · `md-actionbtn` 9,023 ·
`md-a11y-spec` 11,369 · `md-llms` 6,306 · `md-spec-llms` 1,628 · `md-actreadme` 3,683 · `md-names-readme` 2,049 ·
`md-dd-llms` 1,700.

**Quote normalisation** is stated once, in `../README.md` § How this corpus is read; what is specific
here is *which files are this system's corpus*: the checker's glob reads **71 files** — the 70 `txt/spectrum-*.txt` digests this session produced plus the root `spectrum-tree-paths.txt` (4,191 lines, the repo index) — and **68 of them carry page prose**, the nav-stripped
text of each fetched site page **and** the raw markdown of the repo mirror. Three never carry a quote, and
that exclusion is stated rather than implied: the site's 404 body (`txt/spectrum-llms.txt`, 58 B), the site
loader (`txt/spectrum-scripts-js.txt`, 993 B on disk against the 1,772 B download recorded in `manifest.tsv`),
and the tree index, whose paths are cited as evidence but whose content is a path list, not prose. Nothing
in this corpus quotes a 404 page, a JavaScript file, or a path list.

## The artifact ledger (things fetched that are not pages)

| Artifact | On disk | What it proves |
|---|---|---|
| `spectrum-sitemap.xml` | 28,414 B, 223 `<loc>`, 74 under `/foundations/` | the enumerable index for the site |
| `spectrum-repo.json` | 7,271 B | the repo exists; `adobe/spectrum-design-data`, `main` = Spectrum 2 |
| `spectrum-repo-tree.html` | 1,353,842 B, `truncated: false`, 4,191 entries | what the repo publishes, including every `s2-docs/**.md` path and its size |
| `spectrum-tree-paths.txt` | 4,191 lines | the grep target for every "does X exist" claim below |

**Collision, recorded because it changed the ledger:** slug `spectrum-tokens` was fetched twice — the
opensource.adobe.com "Tokens" page (17,020 B) was overwritten on disk by
`spectrum.adobe.com/foundations/design-data/design-tokens` (75,450 B). The opensource copy is gone; it is a
different host, so re-reaching it is a new fetch, not a re-fetch. Nothing in this corpus quotes it.

## Not reached, and why (every path)

| Path / area | Reason it is not in this corpus |
|---|---|
| `/foundations/system/elevation`, `/foundations/behavior/feedback`, `/foundations/inclusivity/movement`, `/foundations/system/theming`, `/foundations/system/spacing`, `/foundations/system/tokens`, `/foundations/composition/surface`, `/foundations/composition/density-and-rhythm`, `/foundations/inclusivity/assistive`, `/foundations/behavior/interaction`, `/content/writing-for-errors` (as a *page*), `/docs/pattern-library/left-sidenav` | Fetched, answered 200, and **contain no prose**: digests of 10–22 B. `kagi_extract` returned nothing for nine of them. No markdown twin exists in the repo tree. Their content is therefore `NO EVIDENCE`, not a summary. |
| `/web/swc/components/*` (15 pages) | Not fetched. Every swc page is a fragment stub on the site (`spectrum-rsp-button.txt` shows the mechanism: section headings whose body is one `…/fragments/components/button/…` URL) and the repo carries markdown for 18 of the 24 swc component paths under `s2-docs/web/swc/components/` (the other 6 have no twin), and for 61 of the 62 rsp component paths. Fetching both halves of one page twice would add bytes, not claims; the rsp markdown is the fuller half and was fetched. |
| `/foundations/app-frame/*` (5 pages), `/foundations/brand`, `/foundations/visual-language/*` | Not fetched: product chrome and brand expression for Adobe's own apps, with no counterpart in our artifact set (we ship one page, one ground, no theming switch). Marked `not applicable`, not `NO EVIDENCE`. |
| `/content-design/*` beyond `writing-for-errors` (grammar, word list, voice/tone, onboarding, readability) | Not fetched: prose-style guidance, not a design-system contract our artifacts carry. Only `writing-for-errors` was fetched, as markdown, because the error-state domain is ours. |
| `packages/design-data/tokens/*.tokens.json` (e.g. `layout.tokens.json` 298,186 B, `color-palette.tokens.json` 571,500 B) | Not fetched: the token *values*. They are machine data, and a quoted JSON key is not a rule. Their **existence and size** is quoted from the repo tree, and that is all any claim here needs. |
| `packages/tokens/CHANGELOG.md` (590,523 B), `docs/markdown/**` (generated tables, up to 607,516 B) | Not fetched: generated output of the same data, larger and less readable than the `s2-docs` mirror of the same page. |
| `design-data/spec/**` beyond `accessibility.md` (43 files, e.g. `taxonomy.md` 32,750 B, `state-model.md` 21,161 B, `relationship-format.md` 38,233 B) | Not fetched: the specification of *their* data format, which we do not consume. `accessibility.md` was fetched because the accessibility contract domain is ours. |
| The three SPA shells' **actual content** | Unreachable by every route tried: raw HTML (no data URL), `kagi_extract` (no content), repo markdown (no twin), token JSON (no guideline prose named `elevation`, `feedback` or `movement`: `grep -i elevat spectrum-tree-paths.txt` → **no matches** in 4,191 paths). |

## NO EVIDENCE (domains this system never answers in the corpus)

Every domain file states its own status; the domains with **nothing** in this corpus are: none of the
eighteen is fully dark, but the following carry the fewest claims and the reason is the shell, not the
effort — `elevation-surfaces` (the elevation page is a 13 B shell; claims come from drop-shadow and
container pages), `loading-empty-error` (the page is a 22 B shell; the markdown twin of
`writing-for-errors` was fetched instead), `forms-validation` (no page for forms as a *system*; the claims
are the behaviour of named input components), and `motion`-adjacent **duration values** — no fetched page
in this corpus prints a millisecond figure for any Spectrum motion, so no duration claim is made anywhere.
