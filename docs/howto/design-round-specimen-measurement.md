# A grill round's specimen measures something other than what it planted

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/design-round-specimen-measurement.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

Written after grill round 9 (colour, 2026-11-02), which spent most of its wall clock on **measurement bugs in the
specimen and the harness**, not on colour. Every claim below is a command that was run on this rig (native Linux,
node 22.23.4 via `source ~/.nvm/nvm.sh && nvm use`, Firefox driven by `design/grill/page-measure.mjs`).

The round itself is fine: `npm run round9` (`design/round9.mjs`) builds three specimens, measures them, writes
`design/grill/round9/report.json`, and re-embeds the numbers into `design/grill/round-9.html`. What follows is how
to tell a **specimen bug** from a **palette finding** before a number reaches the operator.

## The four failures that cost the most time, and the 20-second check for each

### 1. `TIMEOUT: the page never posted` / `RAW (not JSON):` (empty after the colon)

The browser-side probe must POST, not just set a mode. The harness answers with the *request it got*, so an empty
`RAW` line means a request arrived with **no body** — the classic cause is the fetch call written as:

```js
fetch(window.__MEASURE_ENDPOINT, { method: 'no-cors', body })   // WRONG: method is now "no-cors"
```

It has to be:

```js
fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body })   // right
```

Check without re-running the whole round:

```bash
node design/grill/page-measure.mjs design/grill/round-9-census.html design/grill/round9-measure.js 1240 600
```

If it prints a JSON object, the probe is fine and the bug is in the *caller* (usually a JSON parse of a stream
that has log lines before and after the object — `page-measure.mjs` prints progress around it, so slice from the
first `{` to the last `}`).

Related harness rules, learned the hard way in earlier rounds and still true:

- The probe must post **exactly once**. Errors belong in the report array, never in a second post.
- The probe is a plain IIFE, **not** an ES module — `page-measure.mjs` inlines it.
- Wait for `document.fonts.ready` (D127) or the geometry is measured pre-reflow.

### 2. A planted contrast pair reads `1` (or `0.99`, or `1.3`)

Ratio 1 means **foreground bytes == background bytes**. Nine times out of ten the palette is fine and the
specimen's `data-pair` attribute is lying. `data-pair="label|fg|bg"` is an assertion about **what is painted**,
not about what the policy slot is called. The two ways it goes wrong, both of which happened here:

- an element inherits its colour (`background:none;color:inherit`) and the attribute still names the slot's
  intended fill (`ink on ink`) while the browser paints `band-text on ink`;
- the pair names the section's ground (`ink on tint`) but the element sits outside that section, or paints its
  own fill (a secondary button has `background: paper`), so the walk-up finds a different surface.

`design/round9.mjs` catches this per **side**, not just on the ratio — declared token bytes vs painted bytes,
delta-OKLab >= `SAME_COLOUR_BAR` (0.05) — and prints `SURFACE n: ...` and exits 1. To see the raw resolution:

```bash
node design/grill/page-measure.mjs design/grill/round-9-census.html design/grill/round9-measure.js 1240 600 \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
      const j=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));
      for (const p of j.panels) for (const sl of p.slots)
        console.log(p.id, sl.slot, '|color', sl.color, '|own bg', sl.background, '|paintedOn', sl.paintedOn, sl.paintedOnBytes);
    });"
```

`own bg rgba(0, 0, 0, 0)` + `paintedOn` a different colour than the attribute names = specimen bug, fix the
builder, not the palette.

### 3. The specimen paints a colour nobody asked for, or a background that never paints

Two causes, both from generating HTML by string concatenation:

- **A missing `;` between interpolated declarations.** `style="${chip(path)}font-family:…"` where `chip()` returns
  `background:…;color:…` produces `color:var(--color-ink)font-family:…` — an **invalid value**, so CSS drops the
  whole declaration: no fill *and* no text colour, silently. Fix by making the helper return a **trailing `;`**,
  and check every generated file with:

  ```bash
  python3 - <<'PY'
  import io,re
  bad=0
  for f in ['round-9.html','round-9-census.html','round-9-mark.html']:
      s=io.open('design/grill/'+f,encoding='utf-8').read()
      for m in re.finditer(r'(var\([^)]*\)|inherit|#[0-9a-fA-F]{3,6}|transparent)(font-family|color:|background|border-left|box-shadow)', s):
          bad+=1; print(f, 'MALFORMED:', s[max(0,m.start()-60):m.end()+20].replace('\n',' '))
  print('malformed style concatenations:', bad)
  PY
  ```

- **A post-hoc style-rewrite pass fighting the markup.** `round8-build.mjs` stamps font/size/colour onto every
  element it can match, by reading that element's own `data-pair`. Carrying that into a colour round meant the
  pass **repainted the colours under measurement** (a join-path label became `band-text`, read 1.00 against ink).
  In `round9-build.mjs` there is no rewrite pass: the specimen CSS carries the type ramp once, and every planted
  element states its own colour. If you copy a round-8 builder, drop that pass.

### 4. A check reports success for things it never looked at

The first version printed `all 32 :root tokens round-trip` while resolving **4** of them, because a lookup missed
and the loop `continue`d. Any assertion loop must count what it checked and name what it skipped —
`round9.mjs` now reports `tokenChecked` / `tokenUnresolved` and exits 1 if the latter is non-empty.

The lookup itself was the bug: `round9-palette.mjs`'s `ROLES` is **camelCased** (`pathMeetupOnInk`), while CSS
names are kebab (`--color-path-meetup-on-ink`) and `data-pair` carries the bare name (`path-meetup-on-ink`). Three
spellings, one value. `THEME` + `themeSpec()` in the same module are now the single resolver (whole `@theme` by
authored name, candidates by `--c-*`/`--w-*`); anything that needs a colour spec imports `themeSpec` instead of
hand-rolling a prefix strip. Note the ordering rule: **candidate namespaces first**, so `--w-gold` resolves to
R-4's re-arranged warm gold and can never be conflated with the shipped `gold` — a conflation would report a
phantom drift.

## Field-name trap in the colour helpers

`oklchFromRgb()` in `design/grill/okcolor.mjs` returns `{ L, C, h }` — lowercase `h`. Destructuring `{ H }` yields
`undefined`, and the hue census printed `bands: NaN-NaN deg` while every other number looked plausible. If a
hue band or a separation number is `NaN`, look at the destructure before the maths.

## Authorised vs painted numbers

Firefox hands computed colours back in **author syntax** (`oklch(0.32 0.045 152)`), and WCAG luminance from
un-quantised channels is ~0.1 off on every pair (ink-on-paper reads 11.73 that way against the recorded 12.02).
The authority is the **byte**: paint the string through a 1px canvas and read it back (`paintBytes` in
`design/grill/render-measure.js`, copied into `round9-measure.js` with the reason attached). `round9.mjs` then
recomputes the same pair from the `@theme` token it names; the two agreeing is the evidence that the specimen is
painting the palette. A gap > 0.1 is reported as `DRIFT` and is either gamut clipping or a mislabel — the
per-side `SURFACE` check says which.

`okcolor.mjs --selftest` is what keeps the maths honest (paper-ink 12.02, gold 4.82, D88's 0.135, the 0.05
same-colour bar). Run it before trusting any predictor:

```bash
node design/grill/okcolor.mjs --selftest
```

## Census: why two chroma bars, and the trap in one

`design/color-survey.mjs`'s bar is chroma **0.04**, so panel numbers compare with the live page's. But `ink`
itself is `oklch(32% 0.045 152)` — at that bar **every anti-aliased glyph and the whole dark band count as
colour**, which measures ink, not colour. `round9.mjs` therefore also reports **>= 0.08** (above every neutral in
`@theme`: the share a reader would call colour) and the **0.01–0.04 "faint"** band. That is what surfaced round
9's actual finding: the shipped `oklch(95% 0.03 …)` tints sit *under* the survey bar, so a tinted field buys no
measurable colour (S-C: 46.9% faint, 0.5% strong).

The census crops each panel by its measured box, so a panel that renders 0-height (a selector that matched
nothing) silently contributes nothing. `round9.mjs` prints `WxH at x,y` per panel — check the boxes if a
percentage looks impossible, and note `page-measure`'s window height must be tall enough for the whole specimen
(`round9.mjs` sizes the second pass from the probe pass's `contentHeight`).

## Reuse, don't re-derive

- Mark coverage: **`design/mark-pixels.mjs`** (via a generated box JSON) — it knows a stroke under ~1.5 device px
  can never contain a fully covered pixel (D119). `round9.mjs` pads each box because the probe samples the ground
  from a strip beside it, and lays one mark per row so the strip is clean ground.
- Contrast on a live page: `design/grill/contrast-oracle.mjs` with a generated config.
- Colour presence on a live page: `npm run check:color`.
- Shared maths: `design/grill/okcolor.mjs`. A predictor that re-implements OKLab is a second source of truth, and
  this round's `round9-palette.mjs` imports it instead.

## Round 10 additions: measuring emptiness and layout claims (2026-11-02)

`design/whitespace-survey.mjs` (`npm run check:space`) and `design/round10.mjs` (`node design/round10.mjs`) add a
different kind of measurement — geometry rather than colour. Its first written notes described bugs that had not
actually been observed, so the section now separates **observed** from **defended hazard**. A pitfall note is
evidence: if you did not run it, write "would".

- **Observed: a photo or logo whose HTML box contradicts what it paints.** The landing page's
  `<img width="200" height="80">` renders **200×192** from an 834×799 file, because Tailwind preflight sets
  `img { height: auto }` and the height attribute is inert — 16,000px² claimed against 38,400px² painted (2.4×).
  `getBoundingClientRect()` is not the culprit (it reports the painted box); reading `width`/`height` **attributes**
  is. The probe reports both, labelled `attrs` and computed box, and reports `scrollHeight` beside the settled page
  height — which is how the 112px lazy-image reflow (2495 → 2607) got found and is now printed per route.
- **Hazard, defended: `position: fixed` rects are viewport-relative**, so one inside a page-absolute gap walk mixes
  coordinate spaces and can invent an empty run mid-page. This page has no fixed elements (`check:space` prints
  `position:fixed elements excluded from the page-absolute walk: none`); the filter exists for the day a sticky
  header arrives, and it prints its count because a silent filter is how a check starts lying.
- **Hazard, defended: substring class matching.** No built page here leaks conditional-class source (`grep` for it
  across `dist/client/**/*.html`: 0 hits), but class matching must compare whole tokens anyway
  (`cls === t || cls.startsWith(t + ' ') || cls.endsWith(' ' + t)`), because `includes()` also matches `bg-paper`
  inside `bg-paper-alt`-style names, and a count that is right by accident is not a count.
- **Two bars, named.** "painted" = delta-OKLab ≥ 0.05 between a pixel and its own ground (pixel-space form of the
  same bar `okcolor.mjs` uses for token drift — `oklabBytes`/`distLab`, with a selftest assertion that the two
  agree). "empty run" = rows in the block-flow walk with no painted pixel. 4.56% and 42% are not competing
  answers; they are different questions, and quoting one as the other is how a layout round goes wrong.
- **A specimen that draws the page must be measured back.** `round10.mjs` re-reads every box in the specimen and
  fails at > 1px from the number in its own `data-w`/`data-h`; it caught a `.page` frame missing
  `box-sizing: border-box` (2px tall, invisible in a browser). Its second run caught the more expensive kind of
  error: the slot boxes had been written from imagination, and none matched the page's columns. Measure the
  **children of every grid/flex container** — matched on **computed `display`**, because the hero's grid is
  `lg:grid lg:grid-cols-12` and a `.grid` class selector silently misses variant classes — and the real boxes appear:
  hero media 372×564, join media 526×165, feature cards 366.7×204.7, content width 1180 at 1240 / 346 at 390. Same
  principle as round 9's token drift check: the specimen is a claim, not a picture.

## Round 11 additions — the instrument lied about the *frame*, not the pixel (2026-11-02)

Three defects, none of which made a script exit non-zero. All three are now fixed and each has a printed
guard, because the failure mode was a plausible number, not an error. Full write-up:
`design/records/0015-a-crop-is-a-claim-about-the-page.md`.

- **Symptom: a before/after colour pair moves in the wrong direction, or a "colour" percentage is dominated by a
  hue you can't see.** Cause: `check:color` cropped a **fixed** 1600px (desktop) / 2100px (mobile) from the top,
  so the frame depended on the page's height and the ink footer — the page's largest colour area — was outside it
  at 1240. Fix: a first probe reads `doc.scrollHeight`, the screenshot crops `min(6000, pageH)`, and the line
  prints the frame next to the page height (`/ @ 1240x2492 — … of a 2492px page`). Rule: **a crop is a claim
  about the page, so print it.**
- **Symptom: page height differs between two reads of the same build.** Cause: the probe waited on
  `document.fonts.ready` only; a lazy `<img>` decodes later and made the landing page 2495 → 2607px. Fix: both
  `render-measure.js` and `whitespace-measure.js` force `loading="eager"` and `await img.decode()` before
  measuring or choosing a crop; a rejected decode is swallowed (`decode()` on a broken file must not kill the
  probe, and the render gate already checks faces separately). Rule: **"settled" includes images.**
- **Symptom: a measured option's cost flips sign between runs.** Cause: `design/rhythm.mjs` cached variant
  reports in `.design/tmp-whitespace/` keyed by **variant name only**; variant HTMLs are copies that cannot
  identify their source build, so a stale run was compared against a fresh baseline (it reported "+30px tall"
  for `slots`, which is actually "+0px"). Fix: every report written from a built page carries
  `siteFp = sha256(dist/client/index.html)`; a cache hit requires a fingerprint match, and the run prints
  `reusing` vs `measuring`. Rule: **a cached measurement is a claim about a build; fingerprint the build.**
- **Symptom: the headline percentage disagrees with what the page looks like.** Not a bug — a bar. The census's
  `chromatic` bar is C ≥ 0.04, and `--color-ink` is C 0.045, so dark ink counts: "12.6% chromatic" at 1240 is
  mostly the ink footer. The number that tracks the operator's complaint is **C ≥ 0.08, "colour a reader would
  name"** (0.02% desktop / 0.05% mobile after the third-party mark came off). Both bars print, with the caveat
  inline. Never quote the first without the second.
- **A consumer fetches a measurement; it does not remember it.** `round10-build.mjs` used to hard-code slot
  boxes. It now reads them from the `check:space` reports, matches slots on the page's own `data-slot` label
  (matching a Tailwind class is matching whatever the layout is called this week — and the report truncates
  `class`, so `lg:col-span-4` falls off the end), and **throws** when a matcher finds nothing. Re-derived
  numbers as of 2026-11-02, superseding the ones quoted above: hero media **376×564**, join media **532×128**,
  feature card **371×205**, widest container **1192 at 1240 / 358 at 390**. They move ~4px with scrollbar
  presence, which is why the ratio is the contract and the px is the shot list.
- **Before/after must use one instrument.** When the instrument changes, re-measure the *before*. The withdrawn
  22.5% → 13.7% pair in `.notes/DECISIONS.md` / `design/decisions.json` is kept, marked withdrawn, so it does
  not come back.

## Wall clock (this is what ate the session, and what to do about it)

The measurement set is ~25 minutes per pass, and every correction forced a full pass. Costs, measured on this
rig (Linux, Node 22.23.4, Firefox):

- `npm run verify` ~4 min (browser-free, 21 gates) — cheap, run it first and often.
- `check:color` ~1 min (two routes × two widths, each two-pass now — the frame pass doubles its cost).
- `check:space` ~1 min; `check:rhythm` ~6 min (6 variants × 2 widths, and every variant is a full page load).
- `round10` ~1 min; `round9` ~2 min; `check:render` ~2 min; `check:mark` ~1 min.

Cheapest wins, in order of minutes saved:
1. **`--no-build` variants.** After `verify`/`build`, run `check:render:dist` instead of `check:render`; the
   build is ~40s but the gate rebuilds every time.
2. **`RHYTHM_VARIANTS=slots npm run check:rhythm`** — measured **5 seconds** for a cached subset versus ~6
   minutes for all six options x two widths. Implemented 2026-11-02 in `design/rhythm.mjs`: it validates the
   option names (unknown name exits 1 and prints the list) and writes a subset run to
   `.design/tmp-rhythm/report-<labels>.json`, never into `design/rhythm/report.json`, so the table `DESIGN.md`
   cites is never half-filled. Use it for "what does the slots option cost", not for a comparison you intend to
   quote.
3. **Fingerprint caching already works**: re-running `check:rhythm` after only a *design-doc* edit reuses all
   12 runs. Trust it, and keep `dist` untouched between measurement runs (`design/rhythm.mjs` copies
   `dist/client` rather than mutating it — keep it that way or every cache invalidates).
4. **Batch the Firefox runs.** They cannot run concurrently on this rig's harness (one browser profile lock per
   measurement), so sequence them in a single shell invocation rather than four commands — it also keeps the
   page fingerprint identical across the set, which is what makes the cross-comparison valid.
5. **One instrument per comparison, decided before the change.** The most expensive mistake this session was
   measuring the "before" with the old crop and the "after" with the new one; the re-measure cost a full pass.
   Write the instrument down before touching the site.

## Round 14 additions (2026-11-04) — what bit when a composition actually shipped

- **Editing `src/` invalidates a design round's world.** `round13`/`round14` copy `dist/client/index.html` into
  `.design/tmp-roundNN/page.html` and patch *that*. Any source edit - even a README under `src/assets/` - means the
  scratch is measuring a page that no longer exists. Run `npm run build` first, and expect the tracked
  fingerprint-bearing reports (2026-11-04 named `space-survey.json`, `color-survey.json`, `render-gate.json`,
  `keyline-survey.json`, `ground/report.json`, `area-survey.json`; @measured 2026-11-20 the tracked reports that
  carry a `siteFp` key are `design/area/report.json`, `design/ground/report.json`,
  `design/grill/round14/report.json` and `design/grill/round18/report.json` - the class, not the list, is the
  lesson) to change with it: read the diff before you
  commit, and never revert it to make a diff look smaller.
- **A subset run rewrites the report with only the subset.** `npm run round14 -- shelf-lg shelf-all leaf-native`
  leaves `design/grill/round14/report.json` holding three options and no phone states. That is fine for iteration,
  wrong for a commit: either re-run full, or say in the commit message which subset it is.
- **A round's report can disagree with its own console.** Round 14's `delta` closure took `(a, w)` and was called
  with one argument, so `report.baseline.at[undefined]` was `undefined`, `?? 0` swallowed it, and the tracked JSON
  recorded each option's *full page height* as its delta (+4605 for a +321 change) while the console, which passed
  both arguments, was right. The specimen renders the JSON, so the picture was the lie. Fix: a baseline lookup that
  **throws** rather than defaulting to 0 (D166). Check: `node -e 'const r=require("./design/grill/round14/report.json");
  console.log(r.options.map(o=>[o.id,o.delta]))'` - if a delta looks like a page height, it is one.
- **`check:space` only records a `data-slot` box for a grid or flex child.** A new PS slot inside a plain `<div>`
  measures nothing, so it silently drops out of every round that ranks slots by `data-slot`. Give the parent `flex`
  (the component comments why) and confirm the row appears before believing the slot is empty or filled.
- **A CDN rung is not a width.** `/img/1024/` returns each scan's own width - 688 for the Byrne leaf, 698 for the
  1910 Euler leaf, 1024 for two others; `/img/1600|2048|full` are 404. Read the delivered file
  (`plateSource` -> `sharp().metadata()`) and have the asset writer print `output ... source ...` (`npm run plates`
  does). Upscale factors inferred from a rung name were wrong by 45% and one whole option was built on them (D167).
- **The review build measures a different page than the site.** `npm run review:render` plants
  `data-placeholder="hero"` and hides the plate; its `check:render` FAILs (seven mark strokes at 1240, D158's
  corrected count) are that *review state*, not the shipped page. Before quoting any `review:render` number, check
  the marker is planted (`grep -c data-placeholder dist/client/index.html` must be 0 in a normal build) and read the
  assertion the harness prints. `npm run plates` + `npm run build` then re-running the round is the way to prove a
  shipped asset matches the crop the round measured: same `design/grill/plate-crop.mjs`, and the sha1s must match.
