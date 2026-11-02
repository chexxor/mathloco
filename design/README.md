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
| `npm run check:render` | build, then measure `dist/client` in Firefox: control geometry, painted contrast, bands, keylines, notices, nav fit, one display step, faces loaded, the hero mark | yes |
| `npm run check:render:dist` | the same measurement on the `dist` that is already there (`--no-build`) — right after `verify`, or when a rebuild would undo what you are testing | yes |
| `node design/render-gate.mjs [route…]` | the gate itself; it builds unless `--no-build`, runs its route × width matrix 4 ff at once (`RENDER_JOBS=1` to serialize), and retries a firefox that posted nothing once (`RENDER_ATTEMPTS`) | yes |
| `node design/render-gate-selftest.mjs` | mutate the built page five ways, require `check:render` to FAIL each — proves the mark checks can still fail | yes |
| `npm run check:social` / `:selftest` / `:live` | the committed share card's painted bytes / synthetic failures / the producer run into a gitignored temp file | live: yes |
| `node design/ratify-check.mjs` | the ratified `@theme` block through the Tailwind resolver + renderer contrast | no |
| `node design/gen-token-map.mjs` | regenerate `design/token-map.md` from the writes in `src/`; exit 1 = a class write has no mapping | no |
| `node design/list-writes.mjs` | every live type/space/shape class write, counted — pick a batch by coverage | no |
| `node design/grill/dist-measure.mjs dist/client <page> <measure.js> <width…>` | measure one built page at given widths (the harness behind `check:render`) | yes |
| `node design/grill/contrast-oracle.mjs <cfg.json>` | the renderer-side colour oracle over a config (`cd design/grill` first — it resolves config paths against its own directory) | yes |
| `node design/mark-pixels.mjs <shot.png> <report.json>` | what a drawn mark actually painted inside its box, by colour cluster, how many pixels clear the 1.5 and 3.0 bars, and what share of the ink is visible (`--json` for a machine-readable record) | no |
| `npm run lines:measure` / `:dist` | characters per line, measured off the built page's own line boxes at the shipped widths (`--no-build` for the dist that exists). A diagnostic, not a gate: it exits 0 whatever it finds, it is browser-only so it is not in `verify` | yes |
| `node design/round8.mjs [--crop]` | one design round in a command: generate the specimens, then measure characters-per-line per ramp, control heights, notice height, the display cap against the longest club name, and each mark candidate's painted coverage; saves `design/grill/round8/report.json` (`--crop` writes `zoom`-scaled PNG crops of each mark for eyeballing) | yes |
| `node design/audit-references.mjs --stale` | exits 1 if any doc or script cites a design path that does not exist — scratch files never count as citable sources, so a temp log cannot turn the gate red (`--scratch` opts them back in) | no |

Measured cost on this rig (16 CPUs, Linux, Firefox 158.0.1, native): one page at one width ≈ 0.9 s; the
3 × 3 matrix serialized ≈ 7.8 s, at `RENDER_JOBS=4` ≈ 4.2 s; `check:render` with its build ≈ 8.3 s; the
five-mutation render selftest ≈ 4.7 s; `check:social:live` ≈ 1.3 s. Four sequential 9-cell runs (36 cells)
posted cleanly; one serialized run of 9 needed a retry, which is why a cell gets two attempts — the
harness's known flake is a firefox that starts and never posts. The browser gates are cheap; what keeps
them out of `verify` is needing Firefox in the runner, which is an operator call (`.notes/NEXT.md`).

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
