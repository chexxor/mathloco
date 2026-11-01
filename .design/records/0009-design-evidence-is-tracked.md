# 0009 — The design evidence is tracked; the font binaries and harness scratch are not

**Situation.** `design-ratify` writes `DESIGN.md` (tracked) and these records, which cite measurement
outputs — contrast tables, per-width geometry JSON, the specimen HTML the operator chose from. The repo's
other notes live in `.notes/`, which is gitignored, so they do not travel to another machine. Until now
`.design/` was untracked and the operator's ruling on it had been deferred since 2026-10-31. Ratify cannot
write a tracked file that points at untracked evidence.

**Decision (delegate, on the operator's blanket "accept whatever you decide").** Track the evidence: the
probes and generators, the machine records (`decisions.json`, `state.json`, `drift.json`), the specimens,
and the contrast/geometry outputs — **109 files, 0.9 MB**, next to a repo that already tracks a 1.7 MB
hero jpg. Do not track: `.design/fonts/*.woff2` (~770 KB of *candidate* faces — rejected options plus
scratch copies of the ratified ones), `.design/grill/.probe-shot-*.png` (~2 MB the harness rewrites on
every run), and `.design/tmp-*`.

**What it means.** A fresh machine can re-run `node .design/ratify-check.mjs`, `probe-run.sh`,
`artifact-measure.mjs` and the contrast oracle against the same configs, and get the same table the
operator chose from. The exception has a trap: the specimens `@font-face` from `../fonts/*.woff2`, so on a
fresh clone they render in fallback and a "CLEAN" probe proves nothing about typography — that is why
`.design/grill/verify-specimen.js` exists (distinct width/x-height per declared family = the faces
loaded). Restore the three faces the specimens actually need from the npm packages:

```bash
npm i -D @fontsource/pt-serif @fontsource/public-sans        # design-apply installs these for real
cp node_modules/@fontsource/pt-serif/files/pt-serif-latin-400-normal.woff2 .design/fonts/
cp node_modules/@fontsource/pt-serif/files/pt-serif-latin-700-normal.woff2 .design/fonts/
# public-sans-latin-wght-normal.woff2 comes from the same layout once the package is installed
```

**Worth revisiting if** the evidence base grows past what a clone should carry (then keep the generators
and the configs, and commit only the `.txt` summaries), or if `.notes/` ever gets tracked — at which point
DECISIONS.md and these records should be cross-referenced rather than duplicated.
