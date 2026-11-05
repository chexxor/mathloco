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
| `hero.png` (**shipped 2026-11-03**: a Byrne 1847 plate, built by `npm run plates`) | PS-1 | hero media column, stacked plate-over-mark | column is **376x574**; the mark paints **376x235**, the plate takes what is left: **376x307** (574 − 235 − 32 of `mb-8`) | a real meeting photo replaces it at **376x307** - **688x562** (the scan's own width; 752x614 would be interpolated - D167) (2x, so a 3px hairline does not land on half-pixels), landscape, and it costs **+0px** of page at 1240 and **+314px** at 390 |
| `horizon-euclid1903.png` (**shipped 2026-11-04**) | PS-5 | the horizon band: first of three leaves, between the reasons section and the schedule, `hidden lg:block` | PS-5 is **1180x192 @y1825 at 1240** and **976x158 at 1024**; this cell is **383 CSS px wide, 134 tall** (the leaf's own aspect, so it is not cropped) | nothing: the file is **768x268** from a 1024x357 scan |
| `horizon-euler1910.png` (**shipped 2026-11-04**) | PS-5 | middle leaf | same band | nothing: **698x351**, and the file is capped at the scan's 698 rather than stretched to 768 (D167) |
| `horizon-radio1922.png` (**shipped 2026-11-04**) | PS-5 | last leaf | same band | nothing: **768x358** from a 1024x478 scan |
| `join.<ext>` | PS-3 | join card media column, above the buttons | 532x128 at 1240 / 310x245 at 390 | 532x128 (4.15:1 - a wide band; a taller photo grows the card by the difference) |
| `venue.<ext>` | PS-2 | *proposed* full-width strip, not built | would be 1192x320 at 1240, 358x230 at 390 | 1192x320 (3.73:1, hard crop from 4:3) |
| `event-<slug>.<ext>` (**one shipped 2026-11-04**: `event-2026-11-07-club-social.png`, the club's own event art - D190) | PS-4 | event-card thumb, inside the schedule row; the row is `flex flex-col` so the survey can see the box | **323x156 @y2421 at 1240**, **323x156 @y3317 at 390**, **256x123** at 320 — capped at 323 CSS px in `.event-slot` because these rows are full-width strips: uncapped, the 954px file rendered **1132x546** at 1240 (+558px of page, 11.28% of its pixels in one img) | nothing: the box is the file's **own 954/460 aspect**, uncropped (D168). The old 323x110 definition would have cut 30% of its height |

**How a plate gets here**: `npm run plates` (`scripts/plate-asset.mjs`) re-crops a quarantined plate from
`design/assets/photos/<key>.png` through `design/grill/plate-crop.mjs` — the one recipe the review rounds measure
their specimens with — and writes the file the page imports. Nothing is copied by hand, so the page and the specimen
cannot show different crops. Today: hero `47518a39c1` (**377kB**, was 493kB before the crop learned to cap at the
scan's width - D167), band `d675cd3072` (229kB), `b9dfc94519` (231kB), `7b63b01db0` (298kB), and the event art
(127kB, the only file here that is not ours). That is **1.46MB** of tracked binary (was 1.33MB before D190), and
`src/assets/` is gitignored apart from this directory, so these five files are the binaries this repo tracks and
the size the design gates' numbers depend on; `check:space` re-reads them at every run (the hero paints
**372x304**, 2.06% of the page's pixels).

**The three band leaves, and where they come from.** Provenance below is **quoted** from each picture's own page
(`insideoutlibrary.com/p/<id>`), which is the only form of it this file accepts - D92.

**How an id's two numbers read:** `ia-<book>-297-210` is **leaf 297**, picture 210 of that scan. Quote the page's own
"leaf N" label. Every "p. 210 / p. 176 / p. 212" claim this file carried an hour earlier was read off the *second*
number, and the three figure descriptions written from those guesses plus the book titles were **inferred, not read** -
they shipped into `alt` attributes, where a screen reader would have read them aloud as fact. Corrected here, in the
file that carried them.

- `horizon-euclid1903.png` - *The elements of Euclid for the use of schools and colleges; comprising the first six
  books and portions of the eleventh and twelfth books* (Euclid, ed. Todhunter & Simson; London; New York, Macmillan,
  1903), **leaf 297**. The page's text beside the picture: "Octahedron. Dodecahedron. Icosahedron. 30. A parallelepiped
  is a solid figure contained by six quadrilateral figures, of which every opposite two are parallel." So this is near
  the end of the book - the solid figures - and not a plane figure at all. Internet Archive, Public Domain Mark 1.0,
  "Free to use for anything". https://insideoutlibrary.com/p/ia-elementsofeuclid1903eucl-297-210
- `horizon-euler1910.png` - Slaught & Lennes, *Plane geometry, with problems and applications* (Boston, Allyn and
  Bacon, 1910), **leaf 122**, Cornell University Library scan, Public Domain Mark 1.0. Page text: "with center O
  tangent to the four arcs as shown. Suggestion. Take X so that DX = XB. With centers A and B and radius AX draw arcs
  meeting at O. Complete the construction and prove that the figure has the required properties."
  **`horizon-euler1910` is our slot key** from D149-2b (the colourless construction that ruling asked for); it is not
  a claim that Euler drew anything. https://insideoutlibrary.com/p/ia-cu31924031236171-122-176
- `horizon-radio1922.png` - *The principles underlying radio communication* (United States. National Bureau of
  Standards; Ould, R. S.; U.S. Army Signal Corps; Washington, Govt. Print. Off., 1922), **leaf 514**, Public Domain
  Mark 1.0. Page text: "Antenna Current in radiotelephony Transmitting the Sound of a as in father. Modulates a
  radio-frequency Wave which can be received with Simple Detector ... Beat Reception is Required." Chosen as the third
  leaf because the club reads for pleasure as well as for credentialing, and record 0023 measured this leaf at 0%
  named colour, native 1024x478. https://insideoutlibrary.com/p/ia-principlesunderl00unit-514-212

PS-2 is a definition only: it needs a venue photograph, and the archive is books, not rooms.
PS-4 is filled for the one row that has art. A row with no art renders **no box at all** - the wrapper is
conditional, so the un-photographed row keeps the geometry it had, and a designed absence is the absence of a
box rather than an empty one (DESIGN.md "States").

**The event art (PS-4), and what we may say about it.** `event-2026-11-07-club-social.png` is
**the club's own image**, mirrored from the organizer's own media rather than linked:
`https://mobilizon.labradorius.com/media/1f54c290ca5eaeb84354d3351f6a00f4e0e079fbe5cd1bb93c51a4423e52c70c.png?name=bimonthly_social.png`
(curl 200, `image/png`, **954x460**, **127,098 bytes**, fetched 2026-11-04) - mirrored so the site cannot 404 on a
visitor over a file it does not serve (ruling 10(a), D190).

- **Provenance is content-addressed, not remembered:** `sha256sum` of the mirrored file is
  `1f54c290ca5eaeb84354d3351f6a00f4e0e079fbe5cd1bb93c51a4423e52c70c`, which is the path segment Mobilizon serves it
  under. Re-verify with `sha256sum src/assets/photos/event-2026-11-07-club-social.png` and compare against the URL in
  `data/events.json`'s `image` field. A filename can be re-pointed at other bytes; a hash cannot.
- **Which rows have art (measured 2026-11-04, `integrations/mobilizon-cadence/fixtures/group-history-2026-11-04.json`):**
  the 2026-11-07 row carries `bimonthly_social.png`; the three May/June rows carry a different file,
  `Math_Book_Club_Header.png` (`2550d5ea…`), and the 2026-11-11 Parallel Learning row has `picture: null`. So the
  `SLOT_ART` map in `src/components/Schedule.astro` being keyed by slug is not decoration - art is a property of the
  row, and the parallel-learning row has none to attach.
- **Rights line - PROPOSED, not ratified:** "the club's own event art, used with the organizer's permission."
  The ruling chose the mirror; the terms are the operator's to state, so this line is marked as a proposal in the
  file that ships it. Do not let it read as settled until the operator says the words.
- **The `alt` states only the file's role** ("The club's own event image for this social") because nobody here
  read the frame - the session's model takes no images - and D170 forbids an alt inferred from a picture nobody
  saw. The organizer's own sentence, when it arrives, replaces it verbatim. It is the only `alt` on this site that
  describes a file rather than a picture, and that is deliberate rather than lazy.
- **And the source has no caption to quote, which is why the ask goes to a person.** That row's GraphQL `picture` is
  `{name: "bimonthly_social.png", url: ..., uuid: "c9110656-24d2-435e-b1c1-99a59d77690b"}` - a filename, not a
  sentence - and the event page (a **4,755-byte** SSR shell, fetched 2026-11-04) has **no `alt` attribute anywhere**,
  only `og:image`. D170 says quote the picture's page; there is nothing there, so this stays an open ask
  (`.notes/to-mobilizon/answer-2026-11-04-late.md`, §5).

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
