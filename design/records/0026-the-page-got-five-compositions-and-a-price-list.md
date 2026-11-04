# 0026 — the page got five compositions, and a price list for each

Measured 2026-11-03 on `pixels/page-composition-r14`, from `npm run round14`
(`design/grill/round14/report.json`, specimen `design/grill/round-14-page.html` — 287.2s for five options at four
widths plus the phone question, and the final run carried 18 embedded photographs, counted by the builder).

## Why this round exists

The operator asked, after round 13 shipped the hero plate: *"Why two graphics in one place? Can they go elsewhere?
I want to see more full-page sweeping-change ideas that make the landing page more interesting."* Round 13 settled
a column; a page-scale question cannot be ruled from a delta table, so the artifact is the page photographed —
five compositions of the same built page, at one display factor, side by side, each from the load that produced its
numbers (D160). Nothing in the round touches `src/`: it mutates `dist/client/index.html`, which is gitignored
scratch.

## What the shipped page is, before any composition

At 1240 (check:space): header 72 · hero 574 · `bg-panel` section **1606** · schedule section 713 · join section 811
· `bg-ink` footer 284 · page **4284**, painted **5.33%**, **9 empty runs over 25.1%** of the vertical space. The
emptiness is mid-page, not at the ends. That is the fact three of the five options are aimed at.

## The five compositions, measured

| | A as shipped | B drawing opens the page | C mid-page horizon | D one graphic per place | E plate on an ink spine |
|---|---|---|---|---|---|
| page @1240 | 4284 (+0) | **5419 (+1135)** | 4476 (+192) | 4580 (+296) | 4522 (+238) |
| page @1024 | 4374 | 5299 (+925) | 4530 (+156) | 4670 (+296) | 4424 (+50) |
| page @640 | 5293 | 5293 (+0) | 5384 (+91) | 5737 (+444) | 5625 (+332) |
| page @390 | 6173 | 6173 (+0) | 6221 (+48) | 6552 (+379) | 6387 (+214) |
| chroma ≥ 0.08 @1240 | 0.274% | **5.034%** | **0.260%** | 0.414% | 0.338% |
| chroma ≥ 0.08 @390 | 0.550% | 1.306% | 0.546% | 0.844% | 0.805% |
| painted @1240 | 5.33% | **13.03%** | 6.72% | 6.46% | 7.61% |
| images the page paints | 1 | 1 | 2 | **3** | 1 |
| mark box @1240 | 376×235 | 240 wide | 372×232.5 | 240 (in the footer) | 348 wide |
| `check:render` | green | green | green | green | green |

**Read the colour column as a budget, not a score.** One coloured slot is the ruling (D149-1b/2b) and the shipped
page spends 0.274% of pixels at chroma ≥ 0.08. Option B — a 1192×320 band of the Byrne leaf across the top — spends
**5.034%**, eighteen times the shipped page, because it is the widest window the page has ever opened on the loudest
plate. The 1910 line-work band (C) costs **nothing** on that axis (0.260%, below the shipped page's own number) while
raising painted area from 5.33% to 6.72%.

**Emptiness has to be compared in pixels, not percentages**, because a composition that grows the page also grows
the denominator. At 1240 the shipped page carries ~1075px of unmarked vertical space; B ~1263px, C ~1080px, D
~1223px, E ~1054px. B paints the most ink per screen (13.03%) and still has the most empty space, because it is
also the tallest page at desktop.

**The resolution ceiling is a real limit on ambition.** The archive ladder stops at **1024px** (record 0023:
600/800/1600/2048 all 404). A 1192px band is therefore a **1.16× upscale**, a 1176px band **1.15×**, and PS-1's
376px column plate is a **0.37× downscale** of the same scan (crisp). So option B is not only a colour decision: it
is a decision to fetch or scan a bigger source. Recorded per plate in the report's `plates` block.

**The mark can live at the foot, but not with its current tokens.** Option D moves the identity mark out of the
fold and into the `bg-ink` footer. Moving it with only its ink strokes repainted (to `band-text`) left its **gold**
paths reading **2.5** against ink — under the 3.0 graphic bar (D101) — and `check:render` failed the mark **twelve
times**. The system already has the answer: `--color-gold-on-ink` (5.80 on ink). With it, D is green. That is a
measured fact about the mark, not about the composition: **the mark is currently correct only on a light ground.**

## The phone question round 13's table hid

Round 13's ruling went with a table that said **+0px**, true at 1240; at 390 the plate costs **+314px** of scroll
(D161). Measured at 390 on the shipped page, three answers:

| | page @390 | vs shipped | painted | chroma ≥0.08 | gate |
|---|---|---|---|---|---|
| (a) the full plate (today) | 6173 | +0 | 10.38% | 0.550% | green |
| (b) a shorter plate (358×190) | **6075** | **−98** | 10.21% | 0.411% | green |
| (c) no plate, mark only | **5859** | **−314** | 9.77% | **0.032%** | green |

(c) buys back the whole cost and returns the page to its pre-plate colour census; (b) keeps the drawing in the
phone's story at a third of the cost. All three are green, so this is taste and scroll, not breakage — which is why
they are photographed whole at one scale rather than argued.

## Instrument lessons this round paid for (each is a decision or a pitfall entry)

1. **A stylesheet rule cannot out-specify an inline style.** Phone answer (b) first measured *byte-identical* to
   (a): the shipped `<img>` carries its aspect ratio as an inline style from Astro's asset pipeline. The runner now
   refuses to report a state whose measured page is indistinguishable from the shipped one.
2. **A grid that stops being a grid disappears from the survey's `regions`.** Option B sets `display:block`, so the
   hero grid vanished from the box list and the detail crop had nothing to cut. The crop now falls back to the
   `main` surface and says which box it used, in the caption.
3. **Design rounds need step-level retries, not just probe retries.** `check:color` hit the firefox
   never-posts flake once in ~20 steps and killed a 4-minute run at its 20th measurement. `grill/round-instruments.mjs`
   now wraps each survey step in a retry that recognises the flake and records a note.
4. **Round 13's base is gone, and it now says so at once.** `PhotoSlot` prefers a real file over placeholder mode, so
   PS-1 has no placeholder for round 13's variants to mutate. Rather than fail four minutes into a run with a
   message about a missing div, it stops at step [1] and points at round 14.
5. **The specimen was quietly missing its photographs, and only a count caught it.** The first build embedded **13**
   images where the report held **18**: the strip shot one width, and the widths came from `Object.keys(BASE.at)`,
   which iterate integer-like keys **ascending** — so `WIDTHS[0]` was **390**, not 1240, and every detail crop caption
   read "at 390" over a crop the runner had cut at 1240. The prose and the table looked complete; the evidence was
   a third of what it should be. The builder now takes the width order from `report.widths`, a crop carries the width
   it was cut at, the strip shoots **1240 and 390** for every option (D161: the phone is not optional), and the build
   **throws unless the embedded count equals `options × (1 crop + 2 widths) + phone states`** — 18 here.
6. **A gate that prints no summary is a flake, not a design result — and the retry has to wrap the shape check.**
   Option C's `check:render` lost its **@390** cell three times in one run and passed untouched in the next. The
   instruments now retry the whole gate step when the output lacks its summary line, instead of ending a 4-minute
   round at option 3 of 5.
7. **The instruments are shared now.** `design/grill/round-instruments.mjs` holds `probeRetry`, `cropBox`,
   `scaleTo`, `cropStats`, and the gate/colour/space runners both rounds call, so a round's verdict cannot drift
   from CI's.
