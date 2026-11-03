# 0023 — Public-domain book art is a colour decision, not a neutral placeholder

Measured 2026-11-03 on the post-R7 page. Instrument: `design/grill/round12-build.mjs` (fetch → crop at the
real slot size → measure the crop's bytes) verified by `design/round12.mjs` (`npm run round12`);
specimen `design/grill/round-12-art.html`; machine record `design/grill/round12/report.json`.

## Why this round exists

The photo slots (PS-1 372×564, PS-3 526×316, PS-4 319×110, PS-2 1180×320 — PH-B, record
`design/grill/round-10-photos.html`) have been blocked on one thing: **the club has no photographs**
(`.notes/asset-sources.md`: its entire public visual record, four event images read 2026-10-30, contains
no people). The operator asked for placeholder art from the historical image archive saved in
`.notes/asset-sources.md` — **insideoutlibrary.com**, illustrations cut out of public-domain books.

The assumption worth testing was that a placeholder is neutral until the real photo arrives. It is not:
the archive's strongest material is **coloured**, and this site's defining measured defect is colour
(**0.02%** of the page at chroma ≥ 0.08, `design/color-survey.mjs`). So art in a PS slot is the largest
colour decision available, and the Meetup logo (`design/records/0013-a-third-partys-mark-is-not-your-brand-colour.md`)
is what happens when borrowed colour silently becomes the most saturated thing on the page.

## What the source is, and how it was read (all fetched 2026-11-03)

- About page, quoted: *"Every picture is checked against its library's rights statement before it is
  admitted (public domain, the Public Domain Mark, or no known copyright restrictions), so there is no
  permission to ask, no credit required, and commercial use is included."* Counts printed there:
  **2,110,614 pictures from 59,407 books** (the 2026-10-29 note in `asset-sources.md` said 1.8M and
  printed a contradictory 15,314 — treat counts as approximate, re-read them at use).
- `robots.txt`: `Allow: /`, **`Disallow: /*?q=`** and `/api/`. So typed/semantic search URLs are **not**
  for automated agents, and none were fetched. What was fetched: the curated **`/s/<subject>`** pages,
  `/explore`, `data/chips.json` (the site's own **227-subject index**, each entry carrying a `prompt` —
  the site's own suggested phrasing — and a `top` list of picture ids), two operator-supplied pages
  (`/b/firstsixbooksofe00byrn`, `/p/ia-principlesunderl00unit-514-212`), and `/img/1024/<id>.webp`
  renders (the ladder is **200 / 400 / 1024**; 600/800/1600/2048 return 404 — measured).
- Picture pages carry the book title, author, printer, year, leaf, and a `/b/<bookid>` page — the
  provenance trail `asset-sources.md` asks for, one line per asset.

## The slots, and what actually fits them

Crop = subject-aware (`attention`) cover fit at the slot aspect, delivered at 2×. "Adds" = what a full box
of it contributes to the whole page's chroma ≥ 0.08 share at 1240 (page = 1240×4196, today **0.02%**).

| slot | candidate | keeps | crop named colour | adds to page |
|---|---|---|---|---|
| PS-1 | Byrne Euclid leaf 176-281 | 96% | 9.94% | **+0.401%** |
| PS-1 | Byrne leaf 40-33 | 85% | 4.67% | +0.188% |
| PS-1 | Byrne leaf 99-147 (loud) | 95% | 65.25% | **+2.631%** |
| PS-1 | *Opusculum geographicum* 1590 (armillary) | 100% | 3.11% | +0.125% |
| PS-3 | Byrne leaf 111-168 (quietest) | 99% | 4.66% | +0.149% |
| PS-3 | Byrne leaf 37-26 | 98% | 10.70% | +0.342% |
| PS-3 | NBS *principles underlying radio* 1922 | 78% | **0%** | 0 |
| PS-3 | Kepler *Harmonices mundi* 1619 | 100% | 9.42% | +0.301% |
| PS-3 | Ball *Mathematical recreations* labyrinth 1920 | 94% | 0% | 0 |
| PS-4 | Byrne leaf 123-184 | 93% | 4.81% | +0.032% |
| PS-4 | Euclid 1903 (colourless) | 99% | 0% | 0 |

**PS-2 (1180×320) cannot be filled from this archive at all.** The largest render served is 1024px wide,
and the widest plate measured keeps 93% of itself in that aspect while still needing a 15% upscale. PS-2
stays a real-photograph slot (shot list 2: venues, shoot wide and level). **Do instead:** if a strip is
ever wanted from the archive, compose it from several plates rather than upscaled one.

## The finding: Byrne's colour sits on top of our palette roles

The 1847 Byrne Euclid (operator-supplied; 134 pictures) is the most on-theme material found — Euclid,
*for the use of learners*, in flat colour, drawn with lines/arcs/right angles like our own mark. It is
also the loudest. Measured on the crops:

- its **red-orange** family sits at mean hue **36-38°** with chroma **0.15-0.18** — that is **0-3° from
  `path-discord` (35°)**, i.e. next to indistinguishable from a reserved wayfinding hue, and inside the
  zone `design/brand-distance.mjs` flags as commerce colour;
- its **yellow** sits at mean hue **76-81°**, chroma 0.12-0.15, **1-8° from `gold-on-ink` (84°)** and
  ~20° from `gold` (62) — and one plate's mean yellow measures **0.047 from Walmart yellow**, inside the
  0.05 "reads as the same colour" threshold this repo already uses;
- its blue is the only well-behaved family: mean hue 242-259°, **46-54° from `path-calendar` (205)** — clear.

**Desaturation is not a safe escape.** The measured ladder (PS-3 crop, % of the plate's own saturation):

| plate | 100% | 75% | 50% | 25% |
|---|---|---|---|---|
| Byrne 37-26 | 10.70% named, H36 C0.179 *commerce* | 10.16%, H37 C0.144 | 9.00%, H38 C0.105 | **0%** |
| Byrne 176-281 | 12.81%, H81 C0.121, brand 0.047 | 9.28%, H79 C0.103 | 3.71%, **H35 C0.096** | **0%** |

Two things follow. It holds "colour a reader would call colour" all the way down to ~50%, then falls off a
cliff between 50% and 25%; and lowering saturation **moves the collision** — 176-281's mean hue walks from
81° to 35°, landing exactly on `path-discord`, because in mixed stroke the mean hue travels further than
the chroma does. **Do instead:** choose the plate by its measured colour, not by fading it after the fact.

## What this means for the placeholder decision

Three positions are now measurable, and the choice is the operator's:

1. **Colourless plates** (NBS radio waveform, Euclid 1903, Ball's labyrinth): add **0** to the census, no
   collision, no brand adjacency — they hold the "we need something here" line without touching the
   palette argument.
2. **Quiet Byrne** (111-168, 123-184, 40-33): +0.03–0.19% page named colour — under the Meetup logo's
   measured 0.48%, and colour spent on *content*, which is what DESIGN.md asks colour to be paid in.
3. **Loud Byrne** (99-147 in PS-1): **+2.63%**, ~5× the Meetup logo's footprint. That may be the honest
   answer to "the site is drab", but it makes the plate the page's dominant colour and should come with a
   rule about what else may be coloured near it — especially `path-discord` and `gold`.

Undersized by one instrument: this model **cannot view images** (`read` on a `.jpg` returns "Current model
does not support images", re-confirmed 2026-11-03), and the local vision endpoint
(`design/vision-ask.py`, LM Studio on 127.0.0.1:1234) was not running. So no aesthetic claim is made here:
every number above is a pixel measurement, and the pick is the operator's, from the specimen.
