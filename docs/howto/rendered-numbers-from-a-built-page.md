# Getting rendered numbers out of a built page (Firefox, no browser automation)

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/rendered-numbers-from-a-built-page.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

Symptoms this covers: "the class gate passed but the page is wrong", "a control is 42px not 40px",
"the design says one band per screen and I see two", "`check:render` timed out - the page never posted",
"a font never reports `loaded`", "every height looks like the fallback stack".

Measured environment for everything below: **native Linux/x64, Firefox 158.0.1, Node 22.23.4** (`nvm
use`). Tool names and process-death semantics differ on Windows - re-measure there before reusing a
number.

## The three tools, in the order to reach for them

| want | run |
|---|---|
| does every written class resolve to CSS? | `npm run check:classes` |
| does the token block still produce the utilities and contrast pairs DESIGN.md claims? | `node design/ratify-check.mjs` |
| what did the **built page** actually render at a real width? | `npm run check:render` (build + measure), or one page: `node design/grill/dist-measure.mjs dist/client / design/grill/render-measure.js 1240 1400` |
| a colour/metric pair that does not exist as a page yet | `node design/grill/page-measure.mjs <specimen.html> <measure.js> [w] [h]` |

`dist-measure.mjs` is a thin wrapper over `page-measure.mjs`: it copies the built page next to itself
with every absolute URL rewritten to relative, runs the measure script inside Firefox, and deletes its
own copy (`page-measure` deletes its `.measured-*` copy). Raw numbers land in `.design/render/`
(gitignored).

## What cost time, and the answer

1. **Do not serve `dist/` over loopback http for this.** Tried: a node static server +
   `firefox --headless --screenshot http://127.0.0.1:PORT/`. Measured - Firefox issues `GET /` and then
   never requests the CSS/JS/image subresources; the run sits until the harness timeout kills the
   browser (`TIMEOUT: the page never posted`). The URL-rewriting copy is the working path.
2. **Astro emits every asset URL absolute** - `/_astro/...` in `href`/`src`/`srcset` **and**
   `url(/_astro/...)` inside the built CSS. A `file://` page resolves `/` at the filesystem root, so a
   naive copy of `dist/client/index.html` loads with no CSS and no `@font-face`: every number is the
   fallback stack's. `dist-measure` rewrites both, in two steps, because the CSS copy lives **inside**
   `_astro/`: `url(/_astro/x.woff2)` -> `url(./x.woff2)` (not `url(./_astro/x.woff2)`, which 404s), and a
   public-dir url -> `url(../x.png)`.
3. **`document.fonts.ready` is not a wait.** Measured on this rig it resolves ~46 ms in with the faces
   still `loading`. Ask for each face by name first: `document.fonts.load('400 16px "PT Serif"')`, then
   `document.fonts.ready`. Bounded by a timer so a page that never settles still posts.
4. **Snapshot `document.fonts` inside the report, not at script-eval time.** At eval every face reads
   `unloaded`, which made a passing run look like a font failure.
5. **A face that 404s fails silently.** It renders in the fallback stack and every height/measure in the
   gate stays plausible, so the gate now FAILS when a ratified family is not `loaded`, and
   `ratify-check` asserts the chrome face's file exists at the ratified byte size. That is what turns a
   moved `node_modules/` path into a red gate instead of a design that quietly changed.
6. **Computed colours come back in author syntax** - `oklch(0.32 0.045 152)`, not `rgb()`. A parser that
   only handles `rgb()` silently returns `null` contrast, which reads as "no keylines on this page" and
   "no contrast violations". `render-measure.js` converts oklch through OKLab to linear sRGB.
7. **`outline-width` computes to `3px` even when `outline-style: none`,** and
   `text-decoration-thickness: from-font` computes to a number on every element. Gate both on their
   `*-style` / `*-line` being non-none, or every text element looks like a 3px keyline.
8. **A `--screenshot` run needs a fresh profile** (`mkdtemp`), or Firefox says "already in use", exits 0,
   and nothing arrives. `page-measure.mjs` already does this.
9. **A fixed port plus a retry is a race.** The retry's server binds, the first attempt's page posts its
   numbers into it, and you debug a Firefox you never re-ran. Bind **port 0** (`net.Server` has `.address()`
   once listening — a `Bun.serve`-shaped assumption broke here), and name every temp file after **both** route
   and width, or parallel runs overwrite each other's page and you measure one HTML twice at two widths.
10. **`execSync` with no `stdio` option** prints the child's stderr into your output and throws a message
    truncated to 73 chars, so a measurement failure looks like the *parent* is broken. The gate now captures
    the child's last lines and keeps them in the report.

### Measure the matrix, don't loop over routes

The old gate ran **one width** across **three routes**, one Firefox at a time, and `npm run check:render` cost
**11.5s**. Measured on this rig (Linux, 16 CPUs, 94G):

| what | cost |
|---|---|
| one page at one width (`design/grill/dist-measure.mjs`) | 0.83–0.89s |
| the 3x3 matrix serialized | 7.6s |
| the 3x3 matrix at `RENDER_JOBS=4` | **4.2s** |
| `astro build` | 3.8s |
| `check:render` (build + matrix) | **8.3s** |
| `check:render:dist` (matrix only) | **4.2s** |
| the render selftest (5 mutations, each measured) | **4.7s** |
| `check:social:live` (produce a card, then gate it) | **1.3s** |
| the whole browser ritual, end to end | **~14s** |

Firefox cold start (~0.8s) dominates, and it is constant — so the matrix parallelizes and the build does not.
Measure before you schedule work around a cost you have not timed: "several minutes" sat in `NEXT.md` and was
wrong by 10x (**D123**). Keep the build in the script that claims to prove the shipped artifact
(`check:render`); make the speed option explicit (`check:render:dist`). The selftest must pass `--no-build`, or
the rebuild it triggers restores the mutation it just made and it passes by measuring an unmutated page.

If you loop over routes yourself anyway, two things silently produce nothing: the probe **skips a route whose
`.measured-*.html` is missing** and prints only `path: index.html`, which looks like an empty copy rather than
a skip; and **a width under ~320 can make a route measure nothing legitimately**, because the hero's
`min-w-[320px]` container refuses to shrink and Firefox then renders no page (`{}` x3, and the gate's complaint
was `hero draws the club mark at every width (measured 0)` — the mark was fine, the browser was sulking). Loop
**widths** inside a route; the gate already sweeps four (`RENDER_WIDTHS=320,390,768,1240`).

## Band counting, if you are wondering why a CTA counted as a band

`inkDark(bg) && width >= 0.35 * viewport` is not enough: at 390 the primary CTAs go full-bleed and every
one of them reads as a band. A band is a region, so interactive elements (`a`, `button`, `summary`,
`input`, `select`, `textarea`) are excluded. That is what makes "one dark band per screen" measurable
instead of noisy.

## Two more traps, found while measuring the nav (apply 4d, D113)

- **A headless page pays for a scrollbar, and it moves a layout claim by ~12px.** The nav decision
  (D100) says a 320 viewport leaves 288px and a 300 leaves 268; measured in the artifact the container
  offers **276 at 320** and **256 at 300**. That alone made a tier boundary at "360" wrong by 6px.
  Measure `container.clientWidth`, not `viewport - padding`, and note that a page too short to scroll
  measures the scrollbar-free number (/404 and /chat: 288 at 320, vs 276 on the tall landing page) —
  so quote the *tallest* page as the tight case.
- **`row.scrollWidth` clamps to `clientWidth`.** A needed-vs-available probe built on it prints
  "346 of 346" on an overflowing row and lies about the margin. Sum each leaf's own `scrollWidth`
  (text extent, immune to flex-shrink) and add the row's computed `columnGap * (n - 1)`. That is what
  `design/grill/render-measure.js` now does, and it is how the 320 margin turned out to be 3px
  rather than the 14px the clamped number implied.
- Recipe for a width sweep without paying for a rebuild each time:
  `npm run build && RENDER_WIDTHS=1240,390,375,360,320,310,300 node design/render-gate.mjs / --no-build`
  (measured: 7 widths x one route in **3.4 s**, four firefox at a time; raw JSON lands in `.design/render/`).
  `--no-build` is the flag for any repeat measurement — the gate builds by default now, so a bare
  `node design/render-gate.mjs` re-runs `npm run build` (≈3.8 s) first.
- **A firefox that posts nothing is this harness's flake, and the gate retries it.** Measured: one
  serialized run of 9 cells needed a retry (the run still passed); four parallel runs of 9 (36 cells)
  needed none. The symptom is `TIMEOUT: the page never posted` and a 30 s hole in the wall clock, so a
  cell now gets two attempts (`RENDER_ATTEMPTS=1` to disable) and the FAIL text carries the child's last
  two stderr lines. Do not "fix" a flake by lowering a bar; the retry is what keeps the gate trustworthy.
- **Sub-floor widths report real defects, which is the point of allowing them.** That 300 sweep fails the
  device-stroke check: the mark's sphere is 0.9 viewBox units, which lands at **0.96px** at a 300 viewport
  (at 320 it is 1.03px). So the ring has no headroom at the floor — see the open line-weight question in
  `.notes/NEXT.md`; the lever is `MARK.shapes[*].sw` in `src/lib/brand-mark.mjs`, and changing it re-runs
  the share-card pipeline because the card draws the same table.

## Contrast: measure the byte, never the arithmetic (apply 4e, D116)

Firefox returns computed colours in **author syntax** (`oklch(0.71 0.14 35)`). The first version of
`render-measure.js` converted those through OKLab in JS and fed un-quantised linear channels to WCAG
luminance. That measures a colour no screen shows, and it read **every** pair low:

| pair | arithmetic path | painted bytes (= the record) |
|---|---|---|
| band-text on ink | 10.00 | 10.19 |
| ink on paper | 11.73 | 12.02 |
| rule ring on paper | 2.99 | 3.01 |
| gold on paper | 4.70 | 4.82 |
| `path-discord-on-ink` on ink | **4.47** | **4.59** |

The last one nearly caused a token re-solve against a false failure. Recipe that is ground truth without
writing any colour math:

```js
const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1;
const c2d = cvs.getContext('2d', { willReadFrequently: true });
c2d.fillStyle = '#00e600';          // sentinel: an unparseable assignment leaves this in place
c2d.fillStyle = colorString;
if (String(c2d.fillStyle) === '#00e600') return null;   // browser rejected the colour
c2d.fillRect(0, 0, 1, 1);
const d = c2d.getImageData(0, 0, 1, 1).data;            // the pixel the display would get
```
A 1px canvas with only solid fills is not tainted, so `getImageData` is allowed on `file://`. Memoise per
colour string — a page reports the same handful of tokens hundreds of times.

**Rule:** if a `check:render` contrast disagrees with the oracle's record, the harness is wrong, not the
token.

## Gate greps must strip comments, and must match both quote styles (apply 4e)

- `ratify-check`'s motion/state greps went **red on prose**: my own comment in `Layout.astro` contains the
  string `animation:`. Fix: strip `/* */`, `//` line comments and `<!-- -->` before running any "is this
  still written" grep, exactly as the class scanner strips HTML comments.
- The first version of those greps matched only `class="..."`. This repo writes both `class="..."` and
  `class='...'`, so a single-quoted `animate-spin` or palette fill would have passed a green gate. Match
  `class=["'][^"']*...`.
- Both failures are the same failure mode as counting `prefers-reduced-motion` inside a comment: **a grep
  that cannot tell documentation from markup gets re-weakened by the next session**, because it looks like
  a false positive to whoever hits it.

## When the artifact is a flat image, not a page (apply 4g, D118/D119)

Symptoms: "the card looks fine and the palette is wrong", "half my elements vanished", "the ground reads
(4,7,4)", "the hue is 40 degrees off", "the ink width is 2459px", "a word clears the bar on the page and
fails in the file".

Same loop as everything else here (`page-measure.mjs` → page posts JSON to loopback → firefox's screenshot
is the artifact), five new traps:

1. **An HTML element inside `<svg>` is foreign content.** Marks wrapped in `<span>` inside the SVG painted
   as nothing — Firefox kept the rule and the first path, dropped the rest, and reported no error.
   Diagnosis: the page report listed the run widths, the pixels had no ink where they should be.
   Fix: compose with HTML, inline the `<svg>` marks inside the HTML elements.
2. **The screenshot's body background can come out alpha 0.** The page reported `background-color:
   oklch(32% 0.045 152)` on `body`; the PNG's dominant colour was (4,7,4) — the backdrop showing through.
   Fix: a painted `<div class="ground">`. Confirm with a raw histogram of the file before blaming the token.
3. **Quantising a histogram key loses the value.** `key = [r>>3, g>>3, b>>3].join()` reconstructed as
   `k*8` reports `value/8`, so every reported colour was ~8 units low. Keep the members and average them.
4. **Colour-cluster merging corrupts hue.** Bucketing at 40 RGB units folded JPEG ringing into the gold
   domain word and moved its hue reading **43 degrees** (asked 39, reported 82) — close to wrongly failing
   a hue check. Read hue off the *most chromatic pixels* in the element's own box, not off a merged cluster.
5. **`scrollWidth` lies when an element can wrap.** A title given `white-space: nowrap` measured a 2,459px
   box (measured after a font swap mid-report) and the width check "passed" against a 1,140px canvas. For
   geometry that must be honest, measure `Range.getBoundingClientRect()` — and plant a **deliberate
   substitution control**: the same line asked for in a family that exists nowhere (`NoSuchFace At All`)
   measures 1,200px vs the real 776px, so a drift tolerance can be set from evidence (1.5% of the run) and
   still catch the real race, which is firefox screenshotting before a webfont applies.

Reading painted bytes back for *colour identity* has a size floor — see D119. Assert bytes at ≥24px;
below that, assert the pair (browser-converted) and the hue, and hold the pixels to 85% of their own pair.

Commands that show all of this working:

```bash
npm run assets:social          # compose, screenshot, convert, then measure the file it wrote
npm run check:social:live      # the same, into a gitignored temp file: the producer as a gate (needs firefox)
npm run check:social           # re-measure the committed JPEG, no browser
npm run check:social:selftest  # seven synthetic cards, each must FAIL with its own reason
```

## A drawn graphic (the club mark) went missing, invisible, or squashed

The hero and the share card both draw from one table, `src/lib/brand-mark.mjs`; `svg[data-mark]` is the
hook both surfaces expose so the harness can find the mark and count its shapes. Symptoms and probes:

| symptom | what to run |
|---|---|
| a shape is missing but the box looks fine | `node design/grill/dist-measure.mjs dist/client / design/grill/render-measure.js 1240 1400` then read `marks[0].count` — it must equal `MARK_SHAPE_COUNT`. SVG drops the subtree of any child it treats as **foreign content** (a stray `<g data-tokens>` did exactly this on the card): no error, no console line, the box still measures, and box-level ink checks stay green because the *other* shapes still paint ink. |
| a stroke paints nothing | the same report's `shapes[].stroke/fill`. An **unmapped colour role** means Tailwind emitted no rule and the shape inherits `stroke: none`. Roles must be literal class strings in the `.astro` file (D110) — `ratify-check` asserts the literals stay coupled to `MARK_COLOURS`. |
| a shape is too faint to see, or "it passed the bar and still looks weak" | `node design/mark-pixels.mjs <shot> <report.json> [--crop out.png]` — it clusters what is actually inside the box and reports each cluster's contrast against the sampled ground; `--crop` writes the box up 3x so you can look at what you clustered. Line art has a coverage ceiling: a ~1px stroke of a 3.01-pair colour paints pixels no stronger than ~2.6 (the sphere at 320 is exactly this). The pair is the palette's number; the pixels are the screen's. |
| the mark's box is the wrong shape | `check:render` compares the measured box ratio to the **viewBox** ratio. Inline `<svg>` must size itself intrinsically — `viewBox` + `class="w-full h-auto block"`, never a pixel height — because a lost ratio falls back to 300x150, wider than the 320 floor. |
| a stroke lands under 1px on screen | `check:render` reports `sw <units>u = <px>` per shape and fails under 1 device px: nothing is fully covered, so the stroke has no byte identity to compare (D119). |
| is the mark invisible to assistive tech | the report carries `role` and the accessible name; a mark must be `role="img"` + `aria-label`, or explicitly `aria-hidden="true"`. The landing page must draw a mark **at all** (D108) — an empty hero column is a defect, not a blank. |

**Height matters for crops, and a probe reading a bad pairing lies.** At 320px the hero's box is 276x173 at
**y=954**, so a 568-tall shot clips the mark — and `mark-pixels.mjs` used to report "0/95508 box pixels are ink
(0.0%)", which reads like a design defect and is really a missing sample. Now the harness refuses to measure
what the window does not contain (`dist-measure.mjs` fails the cell when Firefox writes no PNG — which happens
under ~300px, where the `min-w-[320px]` container refuses to shrink and the browser renders nothing), and the
probe exits 1 naming the height and the window. Pass a window taller than the mark's bottom edge (1400 does),
and read the JSON the run wrote. Naming, ground truth: **`dist-measure.mjs` prints its report to stdout** (so
redirect it — `> .design/tmp-hero-320.json`), while **`render-gate.mjs` writes raw reports under
`.design/render/` named `<route-slug>-<width>.json`**, where the slug turns each `/` into `_`: `/` at 320 is
`_-320.json`, `/404` at 390 is `_404-390.json`, `/chat` at 390 is `_chat-390.json`.

What the crop buys, measured (Linux, 320px): 1,837 of 48,198 box pixels are ink — **3.8% coverage** — and the
ink is 72% the two route lines and their arrowheads. Faintest clusters land at 1.23, 1.72 and 2.63 even though
the sphere's token pair is 3.01: a ~1px stroke never fully covers a pixel, so antialiasing caps what those bytes
can be (**D119**'s floor, in pixels). The strongest cluster in the box is `35,60,42` at **11.53**. That is the
whole difference between "this fails WCAG 1.4.11" and "this reads thin": at phone width the mark is the routes
arriving without their context ring. Untuned, and queued (**D121**, `NEXT.md`). The same sweep at 300px turns
it into a failure — `RENDER_WIDTHS=300 node design/render-gate.mjs --no-build` reports
`hero/shape[0] ... sw 0.9u = 0.96px < 1px`, because the mark scales with the column. The lever is
`MARK.shapes[*].sw` in `src/lib/brand-mark.mjs`, and it moves the share card's pixels too: re-run
`assets:social`, `check:social`, `check:social:live`, `check:social:selftest`.

**A crop of the box is the cheapest way to look at what you clustered** (`--crop`, up 3x nearest):

```bash
node design/grill/dist-measure.mjs dist/client / design/grill/render-measure.js 320 1400 .design/tmp-hero-320.png
node design/mark-pixels.mjs .design/tmp-hero-320.png .design/tmp-hero-320.json --crop .design/tmp-hero-320-crop.png
```

Name the crop `.design/tmp-*` — it is scratch; the probe's numbers are the record. Asking a vision model about
one corroborated the bytes (the thin circle degrades most; the meeting dot and the route strokes survive best at
the small size) and added one false detail (it claimed the circle was "cropped at the top", when the box sat
fully inside the shot). On a quantized local model, vision corroborates a pixel read; it does not replace one.

**Proving these checks can fail** (do it after editing the mark or the probe):

```bash
node design/render-gate-selftest.mjs            # mutates dist/client/index.html five ways, restores in finally
node design/render-gate-selftest.mjs "painted"  # a substring picks one case; each case is a firefox run
```

Two traps, both found by writing it: **injecting a Tailwind class into built HTML does nothing** — the CSS
was generated by scanning source at build time, so a mutation must use an inline `style` or an SVG
presentation attribute (`stroke="#f7f5f1"`); and **the hero's ground is sand, not ink** — a dark green
stroke is the strongest thing on that surface, not the faintest, so a "painted into the ground" case has to
pick the ground it is actually sitting on. Card-side equivalents of the same two cases live in
`check:social:selftest` (a shape removed from the page report; a shape painted at 1.11 against the ink).

## "Is this type too big for its box" / "how many characters per line" / "what does a size change cost"

Asked and measured 2026-11-02 (`18d6d49`, grill round 8). The probe is new, so this is the only place the
symptom is indexed.

```bash
npm run lines:measure            # build, then characters-per-line on / at 1240, 390, 320
npm run lines:measure:dist       # same on the dist that exists
node design/round8.mjs           # one design round: specimen + cpl per ramp + control heights + cap + mark coverage
```

Three things this measurement will get wrong if you do not know them:

1. **`box px / average advance` is a capacity, not a line.** CSS breaks at the last whole *word*, so the
   capacity is an upper bound and the slack is the width of the word that did not fit. At the shipped 16px in
   a 672px box the arithmetic and the browser agree within **2 characters**; at 18px the same arithmetic is
   **8 characters** optimistic, because a word costs more px at a bigger size. Never recommend a ramp from the
   arithmetic alone — read the fitted count off the built page (`design/grill/line-length-measure.js` groups
   glyphs into lines by distinct `Range.getClientRects()` tops, word-anchored so a mid-word rect cannot start a
   line).
2. **A width that changes a size token changes geometry somewhere else in the same commit.** Measure the
   consequences, do not reason about them: control height is `label line box + 2 x pad` (measured:
   `label 13.3/16` -> **48/40**, `label 15/20` -> **52/44**), so a *chrome* step moves every control, while a
   *content* step does not. Then re-measure the notice height, the nav fit, and the share card (the card copies
   the site's ramp and the mark table, so `assets:social` + `check:social` + `check:social:live` +
   `check:social:selftest` all re-run).
3. **A specimen that lays several marks out in a row poisons `mark-pixels.mjs`** — it samples the ground from a
   strip inside the measured box, and in a side-by-side row that strip lands on the *neighbour's* ink, which is
   how a 372px box reported "0% coverage". Stack one mark per row with clear margin and grow the viewport.

For line weight, `mark-pixels.mjs` now counts **how many pixels clear the bar**, not just the faintest cluster
(`--json` for a record per mark): pixels at/over 1.5 and at/over 3.0, and what share of the drawn ink is above
the bar. That is the number that made the line-weight question decidable: the shipped mark puts **890** px at or
over 3.0 in the measured 276px hero box; sphere-only +44% puts **1070**; all strokes +25% puts **1129**; fixed
device-width strokes put **1085** at 276 but only **1559** at the 372px desktop box against shipped **1722** —
i.e. non-scaling strokes pay for the phone by thinning the desktop, which is only visible if you measure both
boxes.

## Changing the mark's shape (2026-11-02, D126/D127) — one command, and one sanity check that catches a lying report

The mark is one table (`src/lib/brand-mark.mjs`) drawn by the hero and the share card. Change it, then:

```bash
npm run build
npm run assets:social          # the committed card is built FROM the table: skip this and check:social is right to fail
npm run check:social && npm run check:social:selftest && npm run check:social:live
npm run check:mark             # geometry semantics + painted coverage, at 320 (scale 1.15) and 1240 (1.55)
node design/render-gate-selftest.mjs   # the mutations are generated from MARK, so they follow the shape
npm run check:render:dist && npm run verify
```

`design/mark-geometry.mjs` is the probe that asks *what the drawing means*, in the table and in the pixels:
surface circle, exactly two lines, a curved equator, one dashed and one solid half with the **broken one being
the far one**, parallel starting stretches in both, a real crossing, the pole on the **painted** ring, right
angles marked. `design/mark-pixels.mjs` asks how much of the ink clears the bar. Neither is in `verify`
(browser); `check:mark` is the wrapper.

**Before trusting any pixel probe, check a landmark.** Reports and screenshots can describe different layouts,
because `getBoundingClientRect()` is measured when the script runs and firefox paints after the webfonts land.
This one is 30 seconds and would have saved the hour:

```bash
node design/grill/dist-measure.mjs dist/client / design/grill/render-measure.js 320 1400 .design/render/x.png > .design/render/x.json
node -e 'import("sharp").then(async ({default:sharp})=>{const j=JSON.parse(require("fs").readFileSync(".design/render/x.json","utf8")).marks[0];
const i=await sharp(".design/render/x.png").raw().toBuffer({resolveWithObject:true});const{width:w,channels:c}=i.info,d=i.data;
let m=[1e9,1e9,-1,-1],n=0;for(let y=Math.round(j.y);y<j.y+j.h;y++)for(let x=Math.round(j.x);x<j.x+j.w;x++){const k=(y*w+x)*c;
if(d[k]-d[k+2]>=25&&d[k]<245){n++;m=[Math.min(m[0],x),Math.min(m[1],y),Math.max(m[2],x),Math.max(m[3],y)]}}
console.log("box",j.x,j.y,j.w,j.h,"scale",j.scale,"| warm px",n,"bbox",m.join(","));})'
```

The warm (gold) bounding box must sit within ~2px of where the geometry table + scale put it. If it is off by
tens of px, the report is pre-reflow: fix the harness (measure after `document.fonts` settles), do not widen the
probe's tolerance. Measured size of the trap: 108px at 320×1400, 34px at 320×4800, 0px at 1240 — a desktop-only
workflow never sees it.

## "How much colour does this page paint?" (2026-11-02, D128)

`npm run check:color` (or `node design/color-survey.mjs --routes / /404 /chat --widths 1240 320`) rasterises
the built page and prints: % of pixels at OKLCH chroma ≥ 0.04, mean chroma of that ink, and how many 30° hue
families carry it (a family counts at ≥ 300 px, so the mark's gold shows up). It exits 0 whatever it finds — it
is the before-number for a colour round, and the after-number is free. To find *what* is painting a band, scan
the shot for pixels in that hue/chroma range and print their bounding box and top colours; that is how the
"loudest colour on the landing page is the Meetup logo" finding was located (rgb 237,28,64, 14,820 px).

## 2026-11-03 — four new ways this goes wrong, and the command for each

### "The percentage does not match what I see on the page" → the shot was truncated

A probe that clamps the screenshot height (`Math.min(6000, doc.scrollHeight)`) measures **less than the page** and
reports percentages **of the frame it measured**. The home page is **6978px at a 320 viewport**, so every 320 number
from `check:space`, `check:color` and `check:ground` covered 6000px: emptiness read 17.9% where the page's figure is
21.4%, and the `bg-ink` footer was not in the frame at all. Fix: `design/grill/shot-height.mjs` — `shotHeight(doc)`
**throws**, naming the width, the real height and the cap, so the cap can be raised deliberately.

```bash
# how tall is the page at each width? (the number every area/colour % is a fraction of)
node -e 'const {launch}=require("playwright");(async()=>{const b=await launch({browser:"firefox"});for(const w of [1240,640,390,320]){const p=await b.newPage({viewport:{width:w,height:900}});await p.goto("file://'$PWD'/dist/index.html");console.log(w,await p.evaluate(()=>document.documentElement.scrollHeight));await p.close()}await b.close()})()'
```

### "Does this width break the layout?" → enumerate the flips, then measure them

The default matrix (320 → 390 → 1240) crossed **no** breakpoint while `sm:` fired 23 times, and there is no breakpoint
at all between 320 and 390. So measure the **switch points**, not evenly spaced widths:

```bash
grep -rhoE '[[:space:],:](sm|md|lg|xl|2xl):' src/ | tr -d ' ,:' | sort | uniq -c   # which flips exist
RENDER_WIDTHS=1240,1024,768,640,390,320,300 npm run check:render:dist             # the sweep across each one (~90s)
```

`check:render` now prints `breakpoints in use … | widths measured: … | FLIP WITH NO MEASURED WIDTH: …`. Defaults are
`1240, 640, 390, 320`; 320 stays mandatory (D114). Phone landscape is 568-932 CSS px, so **640 is the phone-landscape
layout** — and it is where the hero mark is **largest** (512×320 at scale 2.133, stroke 2.77 device px, 58.7% of its
ink clearing the 3.0 graphic bar), which is why `check:mark` measures 320/640/1240.

### "Does X change what the page actually paints?" → plant it, then find where the pixels moved

Do not reason about the CSS box model; paint several candidates in one boot and **localize** each:

```bash
node design/pixel-ground.mjs                 # ground, its excursion, and every painted rule hairline, off bytes
node design/pixel-ground.mjs --selftest      # four plantings it must tell apart, on a COPY of dist
```

Ground facts that cost four wrong guesses to learn (record 0020): a `background-image` appears in **no** computed
colour string, so every other number here is blind to it; the shipped paper is dead flat (**span 0, sd 0.00**), so a
grain has nowhere to go — `rule` on `paper` measures **3.01** with **zero** headroom; a ±4-level tile calibrates to
**span 7.7**, so D143's "≤3 levels" ≈ **±1.5 levels**; and a grain on `body` moves **nothing** inside the content,
because every self-filling element paints over the page ground — **a page texture reads only in the gaps**.

### "I need the output of a gate that passed" → it is on disk now (D144)

```bash
ls .design/tmp-gate-logs/browser/            # set "browser" = verify:browser's 7 steps
ls .design/tmp-gate-logs/deploy/             # set "deploy" = verify's 13 steps (and check:deploy)
cat .design/tmp-gate-logs/browser/manifest.txt          # step, exit code, seconds, command
GATE_STEPS=check:render:selftest npm run verify:browser   # re-run ONE step, after its build steps
```

One flake to expect: `check:render:selftest` at 390 failed once in four full runs under a full browser chain
(Firefox 159.0, 16 CPUs, each step running `alone`). Re-run the step before treating it as a regression; the log of
the passing re-run sits beside the failing one.
