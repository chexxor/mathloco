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
| `.design/` | no — `.gitignore` names every pattern in it | whatever a run regenerates: `tmp-*`, `render/` (the render gate's raw per-route/width reports), `.probe-shot-*.png`, candidate `fonts/*.woff2` |

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
| `node design/dist-fresh.mjs` | is the `dist/` on disk the build THIS tree would make? Compares the newest mtime under `dist/client`+`dist/server` against the newest under `src/`, `public/` and the config files (0.03s, no browser). Every `--no-build` probe and `verify:browser` now refuses a stale dist: after a branch switch the gates otherwise measure the page the previous branch built — observed as 4 phantom keyline FAILs describing the defect the branch under review had removed | no |
| `npm run check:render` | build, then measure `dist/client` in Firefox: control geometry, painted contrast, bands, keylines, notices, nav fit, one display step, faces loaded, the hero mark. **Default width matrix 1240, 640, 390, 320** — 320 is mandatory (D114's floor: the gate refuses a default set that drops it) and 640 is the `sm:` flip that lands inside the phone band; the gate prints which breakpoints `src/` uses and names any flip the set does not measure (record 0022) | yes |
| `npm run check:render:dist` | the same measurement on the `dist` that is already there (`--no-build`) — right after `verify`, or when a rebuild would undo what you are testing | yes |
| `node design/render-gate.mjs [route…]` | the gate itself; it builds unless `--no-build`, runs its route × width matrix 4 ff at once (`RENDER_JOBS=1` to serialize), and retries a firefox that posted nothing once (`RENDER_ATTEMPTS`) | yes |
| `node design/render-gate-selftest.mjs` | mutate the built page five ways, require `check:render` to FAIL each — proves the mark checks can still fail | yes |
| `npm run check:social` / `:selftest` / `:live` | the committed share card's painted bytes / synthetic failures / the producer run into a gitignored temp file | live: yes |
| `node design/ratify-check.mjs` | the ratified `@theme` block through the Tailwind resolver + renderer contrast; section 1f re-derives every line box in the type ramp from the sizes in the block (next 4px multiple ≥ size × 1.2, display ≥ size × 1.05, each display box clearing its measured ink depth) and fails if `design/grill/display-fit-chrome-measure.js` measured sizes the block does not ship — so a size raise cannot carry stale leadings over | no |
| `node design/gen-token-map.mjs` | regenerate `design/token-map.md` from the writes in `src/`; exit 1 = a class write has no mapping | no |
| `node design/list-writes.mjs` | every live type/space/shape class write, counted — pick a batch by coverage | no |
| `node design/grill/dist-measure.mjs dist/client <page> <measure.js> <width…>` | measure one built page at given widths (the harness behind `check:render`) | yes |
| `node design/grill/contrast-oracle.mjs <cfg.json>` | the renderer-side colour oracle over a config (`cd design/grill` first — it resolves config paths against its own directory) | yes |
| `node design/mark-pixels.mjs <shot.png> <report.json>` | what a drawn mark actually painted inside its box, by colour cluster, how many pixels clear the 1.5 and 3.0 bars, and what share of the ink is visible (`--json` for a machine-readable record) | no |
| `node design/mark-geometry.mjs <shot.png> <report.json>` | does the mark MEAN what the table says — a surface, exactly two lines that start parallel, a curved equator with the FAR half dashed, a real crossing, the pole on the painted ring, right angles marked — checked in the table **and** in the painted pixels. Exits 1 on a disagreement between the two | no |
| `npm run check:mark` | the two mark probes, at 320 and 1240, in one command (writes `.design/render/mark-<w>.png` and `_-<w>.json`). Needs a built dist; diagnostic, not in `verify` | yes |
| `npm run check:color` (`node design/color-survey.mjs`) | how much colour a built page actually paints. **Two-pass: it asks the page its own settled height, then shoots the whole page** — a fixed 2400px frame of a 2495px document put the `bg-ink` footer out of frame and reported a different page (record 0015). Reports chroma ≥ 0.04, chroma ≥ 0.08 ("colour a reader would name": `--color-ink` is C 0.045, so the first bar counts every glyph and every dark band), the faint 0.012–0.04 band, and 30° hue families. Exits 0 whatever it finds — it is the before-number for a colour round. Records land in `.design/tmp-color/` | yes |
| `npm run check:rhythm` (`node design/rhythm.mjs`) | the same page with each proposed vertical-rhythm option applied to a **copy** of `dist/client`, measured at 1240 and 390: `edges` (hero margins, section padding), `edges-rules` (same, with a 1px rule at each band boundary), `interior` (gaps inside surfaces), `slots` (PS-1/PS-3 filled at approved sizes), `all`. Reports doc height, empty-run px and %, run count, biggest run, painted share, and emptiness split at-edges vs in-surface. The shipped artifact is never mutated; variant reports are cached in `.design/tmp-whitespace/` and keyed to a fingerprint of the shipped page, so a rebuild invalidates them (record 0015). Saves `design/rhythm/report.json`. `RHYTHM_VARIANTS=slots` (or `slots,edges`) measures a subset in seconds when the cache still matches the build, and writes to a gitignored path so the cited full table is never half-filled; an unknown option name exits 1 with the known list | yes |
| `npm run check:ground` (`node design/pixel-ground.mjs`) | what the built page **paints** as its ground, in 8-bit levels, and what each painted `rule` hairline measures **off those bytes** — the instrument D143 needs, because every other colour probe here reads computed colour *strings*, and a `background-image` (texture, gradient, photograph) appears in none of them. Two-pass like `check:color`: ask the page its settled height, then shoot the whole page. Finds hairlines by runs of 40+ pixels lying between two grounds (a hairline antialiases to a blend, so there is no selector for it), measures each against **both** neighbours, and fails only the stronger pair — the weaker side is named as a note, because which side is *the* pair is an operator call (record 0018). Prints the token-space number beside the byte number so the two spaces cannot be confused, plus the flat-window span/sd that a grain is authored in. Saves `design/ground/report.json` (tracked — record 0020 cites it); screenshots and per-width detail in `.design/tmp-ground/`. Exits 1 if a painted hairline is under `BARS.graphic`. Record 0020 | yes |
| `npm run check:ground:selftest` | four plantings the ground probe must tell apart, on a **copy** of `dist`: the same flat 64x64 window must report an excursion it did not on the clean page (sd 2.29 vs 0.00); a ring with the grain behind it must move (3.06 vs 3.01); the page's own CSS-reported keyline must **not** move (3.01 both times — that is the blindness); and a grain planted on `body` alone must **not** move the ring, because anything that fills itself paints over the page ground. Removing the byte path fails the first two; blinding the sampler fails all four (D118) | yes |
| `npm run lines:measure` / `:dist` | characters per line, measured off the built page's own line boxes at the shipped widths (`--no-build` for the dist that exists). A diagnostic, not a gate: it exits 0 whatever it finds, it is browser-only so it is not in `verify` | yes |
| `node design/round8.mjs [--crop]` | one design round in a command: generate the specimens, then measure characters-per-line per ramp, control heights, notice height, the display cap against the longest club name, and each mark candidate's painted coverage; saves `design/grill/round8/report.json` (`--crop` writes `zoom`-scaled PNG crops of each mark for eyeballing) | yes |
| `npm run round9` (`node design/round9.mjs`) | the colour round in one command: build the three specimens, measure each panel's PAINTED pixels (chroma ≥ 0.04 as `check:color` counts it, plus ≥ 0.08 as the level a reader would call colour, and the 0.01–0.04 "faint" band where the shipped tints live), resolve every planted contrast pair off the bytes the browser paints, run `mark-pixels.mjs` over the four mark colourings on both grounds, and check every specimen token against its spec; saves `design/grill/round9/report.json` and re-embeds the numbers into `round-9.html`. Exits 1 if a planted pair misses its bar — a specimen option that breaks a rule is supposed to be loud | yes |
| `npm run check:space` (`node design/whitespace-survey.mjs`) | how much of a built page paints anything, and how much of the vertical journey is empty: painted pixel share (delta-OKLab ≥ 0.05 against each pixel's own ground), empty runs ≥ 60px with the biggest ones, per-surface box + painted share + characters of copy, every drawing/photo-sized box at its COMPUTED size (with its HTML `attrs` printed beside it, so a contradicted
  attribute is visible rather than resolved), **the children of every container whose computed `display` is grid/flex**
  — those are the columns a photo slot would take, and matching on computed display is the only way to see the hero's
  `lg:grid lg:grid-cols-12` — the declared padding and inter-surface margin, the `position: fixed` elements excluded
  from the page-absolute walk (printed, never silently filtered), and the document height before/after images load. Exits 0 whatever it finds — it is the before-number for a layout/content round. Records land in `.design/tmp-whitespace/` | yes |
| `npm run round10` (`node design/round10.mjs`) | the photographs round in one command: build `grill/round-10-photos.html` from the `check:space` reports (slot boxes and page diagrams drawn at a stated scale), then measure the DRAWING back in Firefox and exit 1 if any box is more than 1px off the number printed in its own `data-w`/`data-h`. The builder **fetches** slot geometry from the `check:space` reports and matches slots by the page's own `data-slot` label (`<div data-slot="PS-1">`) — it does not remember numbers, and a matcher that finds nothing **throws**, because a stale assumption that fails silently becomes prose. Adds no new site measurement — its risk is the diagram, so the diagram is what gets gated; saves `design/grill/round10/report.json` and re-embeds the check in the page | yes |
| `node design/grill/okcolor.mjs --selftest` | the OKLab/OKLCH/contrast/hue-window/brand-distance maths one shared module, asserted against the numbers `DESIGN.md` and `.notes/DECISIONS.md` cite (paper–ink 12.02, gold 4.82, D88's 0.135, the 0.05 same-colour bar) **and** against the pixel-space form of the same distance (`oklabBytes`/`distLab`, so the survey's 0.05 pixel bar and the token drift bar are the same measurement). `color-survey.mjs`, `whitespace-survey.mjs`, `round9-palette.mjs`, `round9.mjs` and `round10-build.mjs` all import it, so a predictor and a survey cannot drift apart | no |
| `node design/audit-references.mjs --stale` | exits 1 if any doc or script cites a design path that does not exist — scratch files never count as citable sources, so a temp log cannot turn the gate red (`--scratch` opts them back in) | no |

Measured cost on this rig (16 CPUs, Linux, Firefox 159.0, native, 2026-11-03): one page at one width ≈ 0.9–3 s;
`check:render:dist` over its **12 cells** (4 widths × 3 routes) ≈ **35 s**; `verify:browser`, 7 steps each alone,
≈ **86 s**; the twelve-mutation render selftest ≈ 12 s; `check:social:live` ≈ 1.4 s. Sequential runs of 9 cells
posted cleanly; one serialized run of 9 needed a retry, which is why a cell gets two attempts — the
harness's known flake is a firefox that starts and never posts — seen again 2026-11-03 at `/404 @390`, where the
cell passed standalone, so a red `check:render:dist` under load earns one solo re-run before anyone believes it. The browser gates are cheap; what keeps
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
