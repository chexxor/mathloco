# Photograph places (round 10, ruled 2026-11-02)

Drop a file here named after the slot and the site uses it. `src/components/PhotoSlot.astro` resolves
`<slot>.<ext>` by filename; when there is no file the call site renders its own empty state instead, so
adding a photo is a drop, not an edit — except that a photo now present requires an `alt` describing what
it shows, or the build throws.

Sizes are **measured from the built page** (`npm run check:space`, which walks grid/flex children by
computed `display`), not chosen. They are in CSS px at a 1240 viewport; the record is
`design/grill/round10/report.json` and the shot-list view is `design/grill/round-10-photos.html`
(`npm run round10` rebuilds and re-measures it).

| File | Slot | Place | Rendered box | Shoot at (3:2) |
|---|---|---|---|---|
| `hero.png` (**shipped 2026-11-03**: a Byrne 1847 plate, built by `npm run plates`) | PS-1 | hero media column, stacked plate-over-mark | column is **376x574**; the mark paints **376x235**, the plate takes what is left: **376x307** (574 − 235 − 32 of `mb-8`) | a real meeting photo replaces it at **376x307** - **752x614** at least (2x, so a 3px hairline does not land on half-pixels), landscape, and it costs **+0px** of page at 1240 and **+314px** at 390 |
| `join.<ext>` | PS-3 | join card media column, above the buttons | 532x128 at 1240 / 310x245 at 390 | 532x128 (4.15:1 - a wide band; a taller photo grows the card by the difference) |
| `venue.<ext>` | PS-2 | *proposed* full-width strip, not built | would be 1192x320 at 1240, 358x230 at 390 | 1192x320 (3.73:1, hard crop from 4:3) |
| `event-<slug>.<ext>` | PS-4 | *proposed* event-card thumb, not built | card is 371x205, interior after `p-6` is 323x157 | 323x110 |

**How a plate gets here**: `npm run plates` (`scripts/plate-asset.mjs`) re-crops a quarantined plate from
`design/assets/photos/<key>.png` through `design/grill/plate-crop.mjs` — the same recipe `npm run round13`
measured for its review specimens — and writes `src/assets/photos/hero.png`. Nothing is copied by hand, so the
page and the specimen cannot show different crops: both are sha1 `308193c78a` today. A 493kB png in the repo is
a cost worth naming: `src/assets/` is gitignored apart from this directory, so this file is the one binary this
repo tracks, and it is the size the design gate's numbers depend on.

PS-2 and PS-4 are definitions only: they need a venue photograph and a real schedule to hang on, and
shipping either empty would be a 320px void.

Round 13 measured the only card the schedule section renders today - its no-source notice, not the future event
card - and photographed it with and without a thumb: the card is **512x280.8** at 1240 with a **480px** content box,
and **358x353.2** at 390 with **326px**, so the 323px thumb fits at phone width with **3px** to spare; planting it
costs **+122px** of card and page at both widths and leaves `check:render` green. `@measured 2026-11-03 by
round13` (`design/grill/round13/report.json`; the before/after pictures are in `design/grill/round-13-hero.html`, D160).

Rules that come with a shot (all ruled, see `design/records/0013`):
- **No stock people.** Only photographs of this club, its venue, and its materials.
- A slot's aspect ratio is declared in CSS. Tailwind's preflight (`img { height: auto }`) makes an HTML
  `height` attribute inert, and an undeclared ratio reflows the document on decode — measured here as a
  112px jump.
- Every photo gets an `alt` in the club's own words. Never assert something the frame does not support.
