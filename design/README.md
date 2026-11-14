# design/ — the design system's tooling and evidence (tracked)

This directory holds the parts of the design pass that have to outlive the session that made them:
the scripts the gates run, the probes that produced a number `DESIGN.md` quotes, the preview specimens
the operator actually chose from, and the machine records the phases wrote. It is tracked on purpose —
`design/records/0009-design-evidence-is-tracked.md` is the ruling, and the counter-example is
`decision-audit.mjs`: written in one session, never committed, unrecoverable.

## the two directories

| path | tracked | holds |
| --- | --- | --- |
| `design/` | **yes** | live tooling (gates, harness, probes), one-shot history, and the evidence a doc cites |
| `.design/` | no — `.gitignore` ignores the whole directory (D286), so a new probe cannot write scratch that `git status` will offer as a commit | whatever a run regenerates: `tmp-*`, `render/` (the render gate's raw per-route/width reports), `rsvp-shot/` screenshots, `.probe-shot-*.png`, candidate `fonts/*.woff2` |

The test for a new file: **if a claim in `DESIGN.md` / `.notes/DECISIONS.md` cites it, or a script runs
it, it belongs here. If re-running a tool reproduces it and nobody cites the file itself, it belongs in
`.design/`.**

Why the dot still exists: phases 1-4 wrote into `.design/` (a hidden directory keeps 136 evidence files
out of `ls` and out of editor globs) and the ignore patterns were written against that path. The operator
then asked for the durable half to become a visible, tracked `design/` — so `design/` is now the tracked
half and `.design/` keeps only scratch. The tree shape inside `design/` (`grill/`, `fonts/`, `records/`,
`grill/contrast/`) was left identical to the old one, so relative imports and sibling paths inside the
harness still work; only the leading `.design/` changed.

**Scratch can still land inside `design/`.** `grill/page-measure.mjs` writes `.probe-shot-<w>.png`,
`.measured-*.html` and `rendered-*.html` *next to the file it probes*, so measuring a specimen under
`design/grill/` drops a screenshot there. `.gitignore` ignores those three by basename (no leading path)
so both locations stay clean. They are still scratch — do not commit them.

## live tooling — run these

| command | what it does | browser? |
| --- | --- | --- |
| `npm run verify` | the CI gate set; browser-free | no |
| `npm run review:render` (`scripts/review-render.mjs`) | **measure the state no shipped gate can reach**: plant the placeholder overlay (`src/content.local/`, gitignored), build, **assert the built page really carries `data-placeholder`** (a review build whose overlay silently failed would print PASS about a page that was never built), run the geometry gates (`check:render:dist check:space check:ground`; `--all` for the full set), then remove the overlay and rebuild in a `finally`. Every tracked artifact is redirected to `.design/tmp-review/` by `GROUND_OUT` / `AREA_OUT` / `GATE_LOG_DIR`, so a report that records cite can never describe a page that is not allowed to ship. This is how record 0024's worst straddle was found, and it is the loop A2/A3 run every round (measured: a full loop is **15.8s** when the render gate fails fast and **21.5s** with two gates green; the harness's own overhead is two builds, 3.6-5.0s each) | yes |
| `node design/dist-fresh.mjs` | is the `dist/` on disk the build THIS tree would make? Compares the newest mtime under `dist/client`+`dist/server` against the newest under `src/`, `public/` and the config files (0.03s, no browser). Every `--no-build` probe and `verify:browser` now refuses a stale dist: after a branch switch the gates otherwise measure the page the previous branch built — observed as 4 phantom keyline FAILs describing the defect the branch under review had removed | no |
| `npm run check:render` | build, then measure `dist/client` in Firefox: control geometry, painted contrast, bands, keylines, notices, nav fit, one display step, faces loaded, the hero mark. **Default width matrix 1240, 640, 390, 320** — 320 is mandatory (D114's floor: the gate refuses a default set that drops it) and 640 is the `sm:` flip that lands inside the phone band; the gate prints which breakpoints `src/` uses and names any flip the set does not measure (record 0022) | yes |
| `npm run check:render:dist` | the same measurement on the `dist` that is already there (`--no-build`) — right after `verify`, or when a rebuild would undo what you are testing | yes |
| `npm run check:css-utilities` | how much of the shipped stylesheet nobody wrote: lists utilities present in the built CSS with no occurrence in `src/`, their byte cost, and what appeared or vanished since `design/css-utility-baseline.json`. Report only - it never fails, because prose legitimately names classes. The number it made visible on 2026-11-08: 94 utilities, 6,307 bytes, 12% of the CSS a visitor downloads (D253) | no |
| `node design/render-gate.mjs [route…]` | the gate itself; it builds unless `--no-build`, runs its route × width matrix 4 ff at once (`RENDER_JOBS=1` to serialize), and retries a firefox that posted nothing once (`RENDER_ATTEMPTS`) | yes |
| `node design/render-gate-selftest.mjs` | mutate the built page twenty-four ways (9 mark, 3 control, 1 notice boundary, 2 inset ring, 1 leaked comment, 4 cluster, 4 platform mark), require `check:render` to FAIL each — proves the mark, control, cluster and ring checks can still fail @measured 2026-11-13: 24 cases, preflight confirms every anchor exists in the built page | yes |
| `node design/header-band.mjs <shot.png> <bandBottomRow>` | how much of the header band actually paints, counted in OKLab against the page ground. `check:render`'s `bands` section only sees elements with a `bg-*` class, and since S027 (D295) the header declares no ground, so this is the only instrument that reports the bar @measured 2026-11-13 (Linux native, Firefox 159.0, shot from `design/round17.mjs --only shipped`): the 1240x72 band differs from the paper in 5.00% of its pixels — ring 2.78%, ink 2.22% | no |
| `node design/mark-cost.mjs` | the platform sprite's real byte cost: builds the page with and without it, and with the glyphs inlined, in gzip. @measured 2026-11-14 by this probe (Linux native, Node 24.22.1): sprite 4,307 raw / 1,892 gzip, +2,192 gzip on `/`, +2,207 on `/schedule`; inlining +2,117/+2,307, so the sprite is 75 dearer on `/` and 100 cheaper on `/schedule`; a markless page that carried it (`/chat`) paid +2,200 — 41.0% of that page's 5,370 gzip bytes, and `/join` (markless by D304) would pay +2,152 — 64.5% of its 3,336. The measured crossover is **three clusters** on a page of this shape (D300, which superseded D294's arithmetic estimate of two); one sweep per page shape, because the crossover moves with the page | no |
| `npm run check:sprite-claim` / `:selftest` | does the sprite get claimed **per render** rather than per path (D297)? Reads `src/lib/platform-marks.mjs`, every `spriteFor` call site and the layout, then runs the claim's arithmetic on a throwaway copy of the module: one sprite per render, a fresh sprite for a fresh render, no render skipped. 0.03s, no server, no build; its selftest plants 6 defects (path key, process counter, claim that never says no, call site passing `Astro.url.pathname`, sprite with no claim, sprite moved into the layout) + a clean control @measured 2026-11-13 | no |
| `node design/sprite-claim.mjs [--base http://localhost:4321] [--requests 3]` | the live version of the same question: counts `<symbol id="pm-` defs against `<use href="#pm-` refs on every response of a server that is already running, and fails when a page paints marks with no sprite behind them. A probe, not a gate: every route is `prerender = true`, so the built artifact renders once per route and `dist`-reading gates cannot see a per-render claim go stale. Needs `npm run dev` (or any server rendering the real components) up first — Astro 7's `astro dev` is a daemon and will not start a second server, so point the probe at the one that exists @measured 2026-11-13 (Linux native): `/` and `/schedule` 3 defs + 3 refs on requests 1-3, `/chat` 0/0 | no |
| `npm run check:social` / `:selftest` / `:live` | the committed share card's painted bytes / synthetic failures / the producer run into a gitignored temp file | live: yes |
| `node design/ratify-check.mjs` | the ratified `@theme` block through the Tailwind resolver + renderer contrast; section 1f re-derives every line box in the type ramp from the sizes in the block (next 4px multiple ≥ size × 1.2, display ≥ size × 1.05, each display box clearing its measured ink depth) and fails if `design/grill/display-fit-chrome-measure.js` measured sizes the block does not ship — so a size raise cannot carry stale leadings over | no |
| `node design/gen-token-map.mjs` | regenerate `design/token-map.md` from the writes in `src/`; exit 1 = a class write has no mapping | no |
| `node design/list-writes.mjs` | every live type/space/shape class write, counted — pick a batch by coverage | no |
| `node design/grill/dist-measure.mjs dist/client <page> <measure.js> <width…>` | measure one built page at given widths (the harness behind `check:render`) | yes |
| `node design/grill/serve-measure.mjs dist/client <route> <measure.js> <w> <h> [shot.png]` | the same idea over **loopback HTTP** instead of `file://`, which is the only way an Astro island hydrates in headless Firefox (measured 2026-11-11 by `node design/grill/serve-measure.mjs dist/client / design/grill/cluster-measure.js 1240`, D281). `check:rsvp-preference` runs through it. Nothing on disk is mutated: the page is rewritten in memory | yes |
| `node design/grill/rsvp-card-shot.mjs [--routes / /schedule] [--widths 1240 390]` | **see the sign-up cluster**: two passes per page (ask the settled height, then shoot the whole document), locate every `[data-rsvp-cluster]` after the island has hydrated, and write a full-page shot plus a 2× crop of each cluster into `.design/rsvp-shot/`. The answer to "where is the RSVP widget" is a command, not a hand-taken screenshot @measured 2026-11-12 (Linux native, Firefox 159.0): `/` at 1240 paints the cluster at 192,2265 measuring **645x32**, at 390 at 32,3375 measuring **326x68**; `/schedule` at 1240 at 192,386 measuring **645x32**, at 390 at 32,545 measuring **326x68** | yes |
| `node design/grill/rsvp-card-geometry.mjs` | the in-page probe the shot wrapper uses: cluster boxes, per-label boxes, `data-surface` boxes and the painted text, posted after the island reports `data-rsvp-hydrated` (polls up to 8 s, because `client:visible` hydrates on intersection) | yes |
| `node design/grill/contrast-oracle.mjs <cfg.json>` | the renderer-side colour oracle over a config (`cd design/grill` first — it resolves config paths against its own directory) | yes |
| `node design/mark-pixels.mjs <shot.png> <report.json>` | what a drawn mark actually painted inside its box, by colour cluster, how many pixels clear the 1.5 and 3.0 bars, and what share of the ink is visible (`--json` for a machine-readable record) | no |
| `node design/mark-geometry.mjs <shot.png> <report.json>` | does the mark MEAN what the table says — a surface, exactly two lines that start parallel, a curved equator with the FAR half dashed, a real crossing, the pole on the painted ring, right angles marked — checked in the table **and** in the painted pixels. Exits 1 on a disagreement between the two | no |
| `npm run check:mark` | the two mark probes, at 320 and 1240, in one command (writes `.design/render/mark-<w>.png` and `_-<w>.json`). Needs a built dist; diagnostic, not in `verify` | yes |
| `npm run check:color` (`node design/color-survey.mjs`) | how much colour a built page actually paints. **Two-pass: it asks the page its own settled height, then shoots the whole page** — a fixed 2400px frame of a 2495px document put the `bg-ink` footer out of frame and reported a different page (record 0015). Reports chroma ≥ 0.04, chroma ≥ 0.08 ("colour a reader would name": `--color-ink` is C 0.045, so the first bar counts every glyph and every dark band), the faint 0.012–0.04 band, and 30° hue families. Exits 0 whatever it finds — it is the before-number for a colour round. Records land in `.design/tmp-color/` | yes |
| `npm run check:rhythm` (`node design/rhythm.mjs`) | the same page with each proposed vertical-rhythm option applied to a **copy** of `dist/client`, measured at 1440/1240/1024/640/390/320. The options live in `design/grill/rhythm-variants.mjs` — one module, so `npm run round15` photographs exactly these stylesheets: `edges` (hero 128/96→64/64, bands 64→48), `edges-rules` (same, with a hairline where the air was), `rows` (the reasons grid and the schedule rows), `band-sm` / `band-any` / `band-up` / `band-bleed` (how far the horizon shelf reaches, and where it sits), `all`. Deleted 2026-11-04 rather than tuned: `interior` (it tightened a six-card grid that had been gone for weeks and measured +184px taller / +532px emptier) and `slots` (it painted PS-1 and PS-3, which no longer hold air) — D193. Reports doc height, empty-run px and %, run count, biggest run, painted share, and emptiness split at-edges vs in-surface. The shipped artifact is never mutated; variant reports are cached in `.design/tmp-whitespace/` and keyed to a fingerprint of the shipped page, so a rebuild invalidates them (record 0015). Saves `design/rhythm/report.json`. `RHYTHM_VARIANTS=band-sm` (or `edges,rows`) measures a subset in seconds when the cache still matches the build, and writes to a gitignored path so the cited full table is never half-filled; an unknown option name exits 1 with the known list | yes |
| `npm run check:ground` (`node design/pixel-ground.mjs`) | what the built page **paints** as its ground, in 8-bit levels, and what each painted `rule` hairline measures **off those bytes** — the instrument D143 needs, because every other colour probe here reads computed colour *strings*, and a `background-image` (texture, gradient, photograph) appears in none of them. Two-pass like `check:color`: ask the page its settled height, then shoot the whole page. Finds hairlines by runs of 40+ pixels lying between two grounds (a hairline antialiases to a blend, so there is no selector for it), measures each against **both** neighbours, `check:ground` fails a hairline under the bar **and** a hairline whose two sides are different grounds with the weaker side under it (D149-3c, record 0018/0024). A run counts as a keyline only when its core carries the `--color-rule` bytes within 14 levels — the detector otherwise matches a line of `ink-3` small print (51px at y=2307 @1240), and a bar that can fire on typography is not a gate; rejected runs are reported (`runs`, `notKeyline`) and printed with `GROUND_VERBOSE=1`. Prints the token-space number beside the byte number so the two spaces cannot be confused, plus the flat-window span/sd that a grain is authored in. Saves `design/ground/report.json` (tracked — record 0020 cites it); screenshots and per-width detail in `.design/tmp-ground/`. Exits 1 if a painted hairline is under `BARS.graphic`. Record 0020 | yes |
| `npm run check:ground:selftest` | four plantings the ground probe must tell apart, on a **copy** of `dist`. Each assertion states the statistic the instrument can actually see @measured 2026-11-12 by `node design/pixel-ground.mjs --selftest` (Linux native, Firefox 159.0): (1) the same flat 64x64 window reports an excursion it did not on the clean page (sd 2.31 vs 0, span 7.67 vs 0); (2) a **symmetric grain behind a ring spreads the range of rings, it does not move the median** — planted hairlines measure 2.96..3.11 (spread 0.15) where the clean page measures 3.01..3.01 (spread 0), so the check compares spreads, not medians; (3) the page's own CSS-reported keyline does **not** move (3.01 four times both runs — that is the blindness this probe exists to close); (4) a grain planted on `body` alone **reaches 3 of the 11 ring faces and leaves 8 flat** (y=71: 6/13 vs 6/6; y=2077: 6/6 unchanged), measured per ring by the spans of the 5x5 block above and below it (`aboveSpan`/`belowSpan`) — a texture reads only where nothing paints it, so a ring inside a filled surface is not such a place (D143). Removing the byte path fails the first two; blinding the sampler fails all four (D118) | yes |
| `npm run lines:measure` / `:dist` | characters per line, measured off the built page's own line boxes at the shipped widths (`--no-build` for the dist that exists). A diagnostic, not a gate: it exits 0 whatever it finds, it is browser-only so it is not in `verify` | yes |
| `node design/round8.mjs [--crop]` | one design round in a command: generate the specimens, then measure characters-per-line per ramp, control heights, notice height, the display cap against the longest club name, and each mark candidate's painted coverage; saves `design/grill/round8/report.json` (`--crop` writes `zoom`-scaled PNG crops of each mark for eyeballing) | yes |
| `npm run round9` (`node design/round9.mjs`) | the colour round in one command: build the three specimens, measure each panel's PAINTED pixels (chroma ≥ 0.04 as `check:color` counts it, plus ≥ 0.08 as the level a reader would call colour, and the 0.01–0.04 "faint" band where the shipped tints live), resolve every planted contrast pair off the bytes the browser paints, run `mark-pixels.mjs` over the four mark colourings on both grounds, and check every specimen token against its spec; saves `design/grill/round9/report.json` and re-embeds the numbers into `round-9.html`. Exits 1 if a planted pair misses its bar — a specimen option that breaks a rule is supposed to be loud | yes |
| `npm run check:space` (`node design/whitespace-survey.mjs`) | how much of a built page paints anything, and how much of the vertical journey is empty: painted pixel share (delta-OKLab ≥ 0.05 against each pixel's own ground), empty runs ≥ 60px with the biggest ones, per-surface box + painted share + characters of copy, every drawing/photo-sized box at its COMPUTED size (with its HTML `attrs` printed beside it, so a contradicted
  attribute is visible rather than resolved), **the children of every container whose computed `display` is grid/flex**
  — those are the columns a photo slot would take, and matching on computed display is the only way to see the hero's
  `lg:grid lg:grid-cols-12` — the declared padding and inter-surface margin, the `position: fixed` elements excluded
  from the page-absolute walk (printed, never silently filtered), and the document height before/after images load.
  A box the page **names** (`data-slot`) is printed whatever its area rank and even under the 60px floor, marked `*`:
  PS-3 is 56px tall after the join actions left it, and a cut that hides the only box the site labels makes every
  comment about that box unfalsifiable (record 0024). Exits 0 whatever it finds — it is the before-number for a layout/content round. Records land in `.design/tmp-whitespace/` | yes |
| `npm run round10` (`node design/round10.mjs`) | the photographs round in one command: build `grill/round-10-photos.html` from the `check:space` reports (slot boxes and page diagrams drawn at a stated scale), then measure the DRAWING back in Firefox and exit 1 if any box is more than 1px off the number printed in its own `data-w`/`data-h`. The builder **fetches** slot geometry from the `check:space` reports and matches slots by the page's own `data-slot` label (`<div data-slot="PS-1">`) — it does not remember numbers, and a matcher that finds nothing **throws**, because a stale assumption that fails silently becomes prose. Adds no new site measurement — its risk is the diagram, so the diagram is what gets gated; saves `design/grill/round10/report.json` and re-embeds the check in the page | yes |
| `npm run round12` (`node design/round12.mjs`) | the public-domain **art** round in one command: fetch the shortlist from insideoutlibrary.com (only the paths its `robots.txt` allows — `/s/<subject>`, `/b/<book>`, `/p/<id>`, `/img/1024/`; typed `?q=` search is disallowed and is never fetched), crop each plate at the **real PS-slot size with 2× delivery**, measure the crop's painted bytes (mean L, ink, the two chroma bars, hue family, nearest palette-role hue, nearest brand colour), write a **self-contained** specimen (`grill/round-12-art.html`, crops embedded as data URIs so a fresh clone shows the same choices) and verify the drawing in Firefox — every box must be painted at the slot size it claims and delivered at 2×, else exit 1. Images stay scratch (`.design/tmp-art/`); `design/grill/round12/report.json` is the machine record. Record 0023 | yes |
| `npm run round13` (`node design/round14.mjs         design round 14 (A2): five whole-page compositions priced and photographed, then three more
                    after the archive's real scan widths turned out to be ~700px, not 1024 (D165, D166, D168).
                    `grill/round14-options.mjs` is the only place those compositions exist; `grill/round-instruments.mjs`
                    is the shared probe/crop/gate layer both rounds run on; `grill/round14/report.json` is the
                    machine record. Frozen once the composition shipped — the runner says so rather than pricing
                    a page that no longer exists.
round13.mjs`) | the **hero composition** round in one command: plant the review state, build, crop the two ruled plates at every candidate box, then measure seven compositions of the same built page (`dist/client/index.html` mutated per variant, restored in `finally`, a mutation that changes nothing throws) with the **existing** instruments — `check:space` for boxes, `check:render` for the mark's rules, `check:color` for what a plate costs the palette — plus a scan across the mark's one **vertical** stroke that reports the painted ink run and its **coverage** against what fully covering that shape's own token would read (`strokePaints`-style honesty: the gate's device-stroke number is arithmetic, and `vector-effect: non-scaling-stroke` is where arithmetic and paint disagree). It also measures the **Q2 pair**: the schedule card with the PS-4 thumb planted at its defined 323x110 and without it, at 1240 and 390, probed and photographed by `check:render`'s own probe (now reporting each notice's page-absolute x/y beside its size) so the picture and the ruling on the card's ring come from one load (D160). Writes `design/grill/round13/report.json`, then generates `grill/round-13-hero.html` from it (`grill/round13-build.mjs`, throws on a missing lookup). `npm run round13 -- stack-fill plate-owns-slot` measures a subset (**~46 s**, and it skips Q2 with a note the specimen prints, unless `--ps4` is passed); all seven plus the pair is ~4.5 min on a warm browser, ~6 min cold. A design round, not a gate, so it is not in `verify` | yes |
| `npm run round15` (`node design/round15.mjs`) | grill round 15 (R6): the landing page's vertical rhythm, priced **and photographed**. For each option in `grill/rhythm-variants.mjs` it runs `whitespace-survey.mjs --css <option> --label <label>` at six widths against a copy of `dist/client`, copies that same load's own full-page screenshot, downscales every shot to one factor (0.22) so the comparison is composition rather than size, and **throws on an option that changed nothing at every width** (a rule that lost to an inline style is not an answer) while recording a note for each width an option cannot reach (`band-bleed` is invisible below the 1280 container — which is why 1440 is in the set). Writes `grill/round15/report.json` (tracked), then `grill/round15-build.mjs` generates `grill/round-15-rhythm.html` from it, embedding the pages as base64 so the tracked specimen is self-contained (round 14's model). Runs `whitespace-survey` only: these options are one stylesheet each on unchanged components, so the render matrix cannot disagree with them; if an option graduates it goes through the normal gates as a real edit. 231s for 9 pages × 6 widths at load 16.4 (measured 2026-11-04, Linux); the screenshots are scratch (`.design/tmp-round15/page-*.png`), only `report.json` is tracked, and the builder refuses to generate a specimen with a missing photograph | yes |
| `node design/grill/okcolor.mjs --selftest` | the OKLab/OKLCH/contrast/hue-window/brand-distance maths one shared module, asserted against the numbers `DESIGN.md` and `.notes/DECISIONS.md` cite (paper–ink 12.02, gold 4.82, D88's 0.135, the 0.05 same-colour bar) **and** against the pixel-space form of the same distance (`oklabBytes`/`distLab`, so the survey's 0.05 pixel bar and the token drift bar are the same measurement). `color-survey.mjs`, `whitespace-survey.mjs`, `round9-palette.mjs`, `round9.mjs` and `round10-build.mjs` all import it, so a predictor and a survey cannot drift apart | no |
| `npm run round17` (`node design/round17.mjs`) | grill round 17 (A18): the header bar's ground, the club name painted twice, and the copy the page says twice. Mutates a **copy** of `dist/client` per option (29 options in `grill/round17-options.mjs`), measures each with `grill/header-measure.js` at 1240/640/390/320, runs the shipped render gate on each page (`--fast` skips it), and writes `grill/round17/report.json`. Each row also carries an **edgeReport** (`grill/edge-probe.mjs`: the bytes in the 11-row strip across the bar's bottom edge, measured against the paper in the same photograph - `maxBelow`, `paintsAnEdge`, `paintsALayer`) and, when the header is sticky, a **sticky** record (`grill/header-measure.js` scrolls to 600 and lists every text box the bar covers and by how many pixels). `grill/round17-edge-backfill.mjs --redo` recomputes the edge report for rows already in the record from their saved photographs, so a bug in the probe can be corrected without re-rendering 29 pages - which is how the RGBA-stride bug (Firefox posts 4-channel PNGs, the probe read 3) was fixed in one pass. Every row carries a **`groundReport`**: the header's painted bytes, their OKLab L/C/h, the layer contrast against the page's own ground, the OKLab distance from it, each role's contrast measured **on that ground**, the nav text as painted and its brand distance, and the hue gap to `gold` (D251). `--list` prints the option labels; `--only` (either `--only=x` or `--only x`) re-prices named rows and merges them into the existing record - one row is ~4 min, the whole round ~25. `grill/round17-build.mjs` then generates `grill/round-17-header.html` from that record, embedding the crops - edit the options module or the builder, never the HTML. A round, not a gate: not in `verify`. Its copy half is fed by `check:content`'s `near-duplicate-surface` rule and `design/copy-duplicates.json` (D250) | yes |
| `node design/audit-references.mjs --stale` | exits 1 if any doc or script cites a design path that does not exist — scratch files never count as citable sources, so a temp log cannot turn the gate red (`--scratch` opts them back in) | no |

Measured cost on this rig (16 CPUs, Linux, Firefox 159.0, native, 2026-11-03): one page at one width ≈ 0.9–3 s;
`check:render:dist` over its **12 cells** (4 widths × 3 routes) ≈ **35 s**; `verify:browser`, 7 steps each alone,
≈ **86 s**; the fourteen-mutation render selftest ≈ 12 s; `check:social:live` ≈ 1.4 s. Sequential runs of 9 cells
posted cleanly; one serialized run of 9 needed a retry, which is why a cell gets two attempts — the
harness's known flake is a firefox that starts and never posts — seen again 2026-11-03 at `/404 @390`, where the
cell passed standalone, so a red `check:render:dist` under load earns one solo re-run before anyone believes it.
`check:ground` had the same flake three times in six runs at this width set (twice at 390, once at 320) with no
retry at all, so it now takes `GROUND_ATTEMPTS` (default 2) like the render gate and prints the attempt number. The browser gates are cheap; what keeps
them out of `verify` is needing Firefox in the runner, which is an operator call (`.notes/NEXT.md`).

## the harness contract — four rules every probe here has to keep

1. **Measure the settled page.** `grill/render-measure.js` waits for the ratified faces to report `loaded`
   *before it reads a single rect*, not merely before it posts. It once did the latter, and the report was
   quietly wrong about position: at 320 the hero mark's box sits at y 1121.6 in the fallback stack and y 1014
   once PT Serif lands (108px of reflow at 320×1400), while firefox's screenshot always shows the settled page.
   Heights survived that bug — they come from px tokens — positions did not, and any probe that reads pixels at
   report coordinates was measuring empty paper. See `design/decisions.json` → `renderHarnessSettle`.
2. **Post with `fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body })` and include
   `done: true`.** Omitting `method: 'POST'` sends a body-less request and the run dies as
   `TIMEOUT: the page never posted`; one post per run, with errors accumulated in the report. A custom probe that
   never posts gets the same misleading timeout.
3. **A pixel probe needs coordinates that match the shot.** `window.scrollTo(0, 0)` is called before measuring
   and again before posting, and the report carries `scroll`, `innerW`, `innerH` so a probe can tell whether the
   PNG it is reading is the page it was promised. A shot that does not contain the thing being measured must
   fail loudly, not report zero ink.
4. **Read what the browser applies, not what the markup says.** A layout probe takes computed `width`/`height`/
   `background-color`, never HTML attributes or class strings: Tailwind preflight's `img { height: auto }` made an
   `<img width="200" height="80">` measure 2.4× smaller in area than it paints, and Astro leaves the source of a
   conditional `class={…}` inside the attribute, so class matching must compare whole tokens. And
   `position: fixed` rects are viewport-relative — exclude fixed content from any page-absolute walk and print how
   many elements were excluded, because a silent filter is how a measurement starts lying.
5. **A shot has to contain the page, and a width set has to contain the breakpoints.** Take the height from the
page's own settled report and use `grill/shot-height.mjs`'s `shotHeight()` — never an inline
`Math.min(cap, scrollHeight)`. Three probes carried their own 6000px cap and the home page grew to **6978px at a 320
viewport**, so every 320 number covered 6000px of a 6978px page while printing percentages of the frame: **815px of
emptiness and two thirds of the reader-named colour were missing at the floor width** (record 0021).
`shotHeight()` throws, naming the width, the real height and the cap. Same class at the horizontal axis:
`render-gate.mjs` prints which Tailwind tiers `src/` uses and names any flip its width set does not measure, because
320 → 390 → 1240 crossed none of them while `sm:` fired 23 times (record 0022).

## evidence — read these, they are dated

- `decisions.json` — the machine record of every ratified answer; `state.json` — the design-system skill's
  pipeline state, including which round-N specimen answered which round.
- `drift.json` — phase 1's census of every spacing/type/colour value the CSS computes, with counts.
- `token-map.md` — generated apply worklist (regenerate, never hand-edit).
- `card-page.json` — painted-bytes report for the committed share card, the input `check:social` compares
  the shipped JPEG against (regenerate with `npm run assets:social`).
- `records/NNNN-*.md` — the decision notes. **Dated**: each describes the code as it was at ratification,
  so a path inside one may already have moved (record 0010 names `src/consts.ts`; the flags now live in
  `src/config.json`). Fix the drift in a note beside it, not by rewriting the record.
- `grill/round-N.html` — the preview specimens, including `round-3.html` which was withdrawn and
  `round-4.html`, whose mark geometry `src/lib/brand-mark.mjs` copies: that specimen is where the club
  mark was ratified, so it is the mark's provenance. `grill/*/report.txt` and `grill/*/*.json` are what
  those specimens measured.
- `grill/round-8.html` (the type ramp, and the mark's line weight side by side) and
  `grill/round-8-mark.html` (the same marks laid out for `mark-pixels.mjs`) are **generated** — by
  `grill/round8-build.mjs` from `grill/round8-ramps.mjs`, the `@theme` block as shipped, and the sentences
  the built page actually rendered. Edit the builder or the candidate table, never the HTML; the specimen
  embeds the last measured numbers, so re-run the builder after `node design/round8.mjs` to refresh them.
- `grill/round-9.html` (colour: three surface policies, three hue sets, four mark colourings),
  `grill/round-9-census.html` (the same panels with nothing around them, which is what the pixel census crops)
  and `grill/round-9-mark.html` (one mark per row, clean ground beside it, for `mark-pixels.mjs`) are
  **generated** by `grill/round9-build.mjs` from `grill/round9-palette.mjs` — the hue-window scan, the accent
  search, the re-arrangement cost model and `WARM`, the set R-4 would open. Same rule: edit the builder or the
  palette module, never the HTML. Two things about this round's specimen are load-bearing:
  - candidate values are written `--c-*` (an accent from the currently open hue window) and `--w-*` (the warm
    set, which only exists if the palette is re-arranged). They are **provisional**; nothing may copy them into
    `@theme` until the operator rules, and the namespaces exist so a batch cannot mistake them for roles.
  - a `data-pair="label|fg|bg"` attribute is an assertion about what is PAINTED, not about what the policy slot
    is called. The measure script walks to the nearest painted ancestor and reads both colours back out of a
    1px canvas, so a label claiming `ink on tint` on an element that sits on paper is caught as a surface
    mismatch by `design/round9.mjs` — this round found three such labels, and each one was a bug in the
    specimen, not in the palette.
- `grill/round-13-hero.html` (the hero media column: what the plate and the mark each get) is **generated** by
  `grill/round13-build.mjs` from `grill/round13/report.json` — screenshots of the built page with the real plate
  inlined at the candidate box, and every number read out of that record. The option table is defined in
  `grill/round13-variants.mjs` (one entry per composition: what changes in the markup, the CSS, whether the mark
  moves). Options are lettered A, B, C… **from that table's order**, so an answer of "1c" stays readable after the
  table grows; deleting or reordering an entry re-letters the specimen, which is why the letters are never written
  into the variant ids. Edit the variants module or the builder, never the HTML. It carries two side-by-side blocks:
  the PS-1 column cropped from every option at one display scale (`STRIP`), and the schedule card with the thumb and
  without it at both widths — every question the round asks is photographed, because a choice made from prose alone is
  a choice made blind (D160).
- **Round 13's variant table mutates a page where PS-1 is a row.** Option C shipped on 2026-11-03 (record 0025),
  so `row-shipped` no longer describes the shipped page — the round still runs and still measures, but re-anchor it
  on the stacked column before reading its table as the current tree.
- `grill/round-15-rhythm.html` (the page's vertical rhythm: the same page under each option, whole, at one scale) is **generated** by `grill/round15-build.mjs` from `grill/round15/report.json`; the options are defined once in `grill/rhythm-variants.mjs`, which `design/rhythm.mjs` also prices — edit the module or the builder, never the HTML. Options are lettered A, B, C… from that table's order, and the letters are never written into the variant ids (round 13's rule). Photographed rows are the widest width, any ≥1024 width where an option is live, and 390 — D161: the phone row is not optional. D193.
- `grill/plate-crop.mjs` is the **one crop recipe**: `cropFor(key, w, h, {maxKeep})` decides which region of a
  quarantined plate a slot gets and how much of the leaf survives. `plate-probe.mjs     asks the archive how wide each licensed plate actually is and writes plate-widths.json (tracked) -
                    because /img/1024/ is a rung, not a width: 688 (Byrne), 698 (Euler 1910), 1024 (two others)
plate-widths.json   that measurement, with its date; the number every upscale claim in D167/record 0027 rests on
plate-crop.mjs      the one crop recipe (cover at the slot aspect, 2x, and `capWidth`: never write more columns
                    than the scan has, so no shipped asset contains interpolated pixels — D167)
scripts/plate-asset.mjs` (`npm run plates`)
  builds the shipped `src/assets/photos/hero.png` with it, and `design/round13.mjs` grows its review crops with
  it, so an asset and the specimen that claims to show it cannot drift (both sha1 `308193c78a` today). It replaced
  a private copy inside `round13.mjs` that had already diverged: the review crop and the built asset were two
  recipes for one plate, which is how a review ends up showing something the build does not ship.
- `grill/contrast/cfg-*.json` + `grill/contrast/out/` — the colour oracle's configs and outputs, including
  `cfg-ratify` (the palette as ratified).
- `fonts/` — face-selection and ramp evidence: `metrics.json`, `bytes.json`, `display-fit*.json`,
  `display-ink.json`, `nav-ink.json`, and the `.html` specimens those measures load. The candidate
  `.woff2` files are **not** here in the repo (re-fetchable from `@fontsource`; the ratified faces arrive
  as npm packages, which is what `src/styles/fonts.css` points at).
- `*-math.mjs` / `*-math.json` — the arithmetic `DESIGN.md` and the records quote (palette, primary
  candidates, light roles, brand distance vs the Amazon orange bar, rounds 5-7). Re-running them prints
  the same numbers the docs cite; that reproducibility is the point.

## one-shot history — kept to read, not to re-run

`apply-batch1.mjs`, `apply-batch2.mjs`, `apply-batch3.mjs`, `record-ratify.mjs`,
`resolve-candidates.mjs`. They rewrote source once, in a named batch, and are not idempotent. They stay
because "what exactly did batch 3 change, and with what reason?" is a review question, and the answer is
in the file (batch 3 even writes its own `why` column).

## after adding, renaming or deleting anything here

```bash
node design/audit-references.mjs --stale   # exits 1 if a doc or script cites a dead path
node design/audit-references.mjs -v        # who cites what: code refs (a run needs it) vs docs refs (a claim cites it)
```

Then update the path in every caller: `package.json` scripts, `DESIGN.md`'s Enforcement block, the
`design-*` skills under `.agents/skills/`, and `.notes/` (host-local: `NEXT.md`, `DECISIONS.md`, the
runbooks). `DESIGN.md`'s Enforcement block is the authority on which gates exist and what each measures.
