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
| `event-<slug>.<ext>` (**seven shipped**: `event-2026-11-07-club-social.png`, `event-2026-11-11-parallel-learning.png`, `event-2026-11-21-club-social.png` from round 10, plus the four MS04 rows `event-2026-11-25-common-denominator-study-session.png`, `event-2026-12-05-matheapolis-bimonthly-social.png`, `event-2026-12-09-common-denominator-study-session.png`, `event-2026-12-19-matheapolis-bimonthly-social.png` - D190, D223, D225) | PS-4 | event-card thumb, inside the schedule row; the row is `flex flex-col` so the survey can see the box | **323x185** twice and **323x156** three times at 1240; at 320 the slot box is **256x146** twice and **256x123** three times @measured 2026-11-13 by `node design/whitespace-survey.mjs --routes /schedule --widths 1240 320` while the image painted inside it measures **244x139** and **244x118** @measured 2026-11-14 by `node design/schedule-geometry.mjs --routes /schedule --widths 320` — five rows on `/schedule`, five boxes, two distinct files. The two probes measure different boxes (the `div[data-slot="PS-4"]` wrapper and the `<img>` inside it) and disagree by 12px at 320; the cause is not established here, so quote the probe with the box it reads (see `.notes/PITFALLS.md`). Capped at 323 CSS px in `.event-slot` because these rows are full-width strips: uncapped, the 954px file rendered **1132x546** at 1240 (+558px of page, 11.28% of its pixels in one img) @measured 2026-11-06 by check:space | nothing: each box is its **file's own aspect** (1321/755 and 954/460), uncropped (D168, D223). The old 323x110 definition would have cut 30% of the social's height |

**The boxes, as of MS04** @measured 2026-11-13 by `node design/whitespace-survey.mjs --routes /schedule --widths 1240 320` (Linux native, Node 24.22.1): five rows print, each with art — two study-session thumbs at **323x185** (2.72% of the page each) and three social thumbs at **323x156** (2.30% each), **270,221px²** of the page painted by event art in total. At 320 the same slot boxes are 256x146 and 256x123; the images painted inside them are 244x139 and 244x118 @measured 2026-11-14 by `node design/schedule-geometry.mjs --routes /schedule --widths 320`. The figures this row carried before (`323x184.6` once, `323x155.8` twice) counted three rows, which is what the page printed on 2026-11-06; the page prints five now.

**How a plate gets here**: `npm run plates` (`scripts/plate-asset.mjs`) re-crops a quarantined plate from
`design/assets/photos/<key>.png` through `design/grill/plate-crop.mjs` — the one recipe the review rounds measure
their specimens with — and writes the file the page imports. Nothing is copied by hand, so the page and the specimen
cannot show different crops. Today: hero `47518a39c1` (**377kB**, was 493kB before the crop learned to cap at the
scan's width - D167), band `d675cd3072` (229kB), `b9dfc94519` (231kB), `7b63b01db0` (298kB) — those four ids are **sha1**
prefixes (`sha1sum src/assets/photos/hero.png src/assets/photos/horizon-*.png`), not git blob ids and not sha256; say
the algorithm every time one is quoted. Then the seven event thumbs: four socials at 127,098 B each (byte-identical,
sha256 `1f54c290…`) and three study sessions at 93,921 B each (byte-identical, sha256 `0e26aa4894…`) — eleven PNGs,
**1,953,253 bytes** of tracked binary. @measured 2026-11-13 by `ls -l src/assets/photos/*.png`. (This line said
**1.46MB** for five files and then **1,384,117** for six; the sum of the files actually on disk contradicts both, so
the sum is what ships.) `src/assets/` is gitignored apart from this
directory, so these files are the binaries this repo tracks and the size the design gates' numbers depend on;
`check:space` re-reads them at every run (the hero paints
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
PS-4 is filled for every row `/schedule` prints today - **five rows, seven files**, because two posters cover them.
A row with no art renders **no box at all** - the
wrapper is conditional, so the un-photographed row keeps the geometry it had, and a designed absence is the
absence of a box rather than an empty one (DESIGN.md "States"). The `STATUS:CANCELLED` row is the current example:
it has no `SLOT_ART` entry and `upcomingEvents()` drops it, so its slug names no file and paints no box anywhere.

**The event art (PS-4), and what we may say about it.** Both files are **the club's own images**, mirrored from the
organizer's own media rather than linked: the site never 404s on a visitor over a file it does not serve
(ruling 10(a), D190).

| File | Upstream | Measured on the file |
|---|---|---|
| `event-2026-11-07-club-social.png` | `https://mobilizon.labradorius.com/media/1f54c290ca5eaeb84354d3351f6a00f4e0e079fbe5cd1bb93c51a4423e52c70c.png?name=bimonthly_social.png` (the same media the 2026-11-21 row serves; fetched 2026-11-04, refetched and `cmp`-verified 2026-11-06) | **954x460**, 127,098 bytes, `sha256 1f54c290ca5eaeb84354d3351f6a00f4e0e079fbe5cd1bb93c51a4423e52c70c` |
| `event-2026-11-21-club-social.png` | `https://mobilizon.labradorius.com/media/1f54c290ca5eaeb84354d3351f6a00f4e0e079fbe5cd1bb93c51a4423e52c70c.png?name=bimonthly_social.png` (fetched 2026-11-04, refetched 2026-11-06) | **954x460**, 127,098 bytes, `sha256 1f54c290ca5eaeb84354d3351f6a00f4e0e079fbe5cd1bb93c51a4423e52c70c` |
| `event-2026-11-11-parallel-learning.png` | `https://mobilizon.labradorius.com/media/0e26aa48943e22b6b77facd39b069b15caeef101a260c3d884d58f039cf7e3ec.png?name=parallel_studies.png` (fetched and re-fetched 2026-11-06) | **1321x755**, 93,921 bytes, `sha256 0e26aa48943e22b6b77facd39b069b15caeef101a260c3d884d58f039cf7e3ec` |
| `event-2026-11-25-common-denominator-study-session.png` | `https://mobilizon.labradorius.com/media/0e26aa48943e22b6b77facd39b069b15caeef101a260c3d884d58f039cf7e3ec.png?name=parallel_studies.png` | **1321x755**, 93,921 bytes, sha256 as above — `cmp`-identical to the 2026-11-11 file |
| `event-2026-12-05-matheapolis-bimonthly-social.png` | `https://mobilizon.labradorius.com/media/1f54c290ca5eaeb84354d3351f6a00f4e0e079fbe5cd1bb93c51a4423e52c70c.png?name=bimonthly_social.png` | **954x460**, 127,098 bytes, sha256 as above — `cmp`-identical to the 2026-11-07 file |
| `event-2026-12-09-common-denominator-study-session.png` | `https://mobilizon.labradorius.com/media/0e26aa48943e22b6b77facd39b069b15caeef101a260c3d884d58f039cf7e3ec.png?name=parallel_studies.png` | **1321x755**, 93,921 bytes — `cmp`-identical to the 2026-11-11 file |
| `event-2026-12-19-matheapolis-bimonthly-social.png` | `https://mobilizon.labradorius.com/media/1f54c290ca5eaeb84354d3351f6a00f4e0e079fbe5cd1bb93c51a4423e52c70c.png?name=bimonthly_social.png` | **954x460**, 127,098 bytes — `cmp`-identical to the 2026-11-07 file |

All four MS04 mirrors were fetched on 2026-11-13 and `cmp`-verified against the file they were named for
(`curl -sL <media url> > .design/tmp-art-verify/social.png; cmp -s .design/tmp-art-verify/social.png
src/assets/photos/event-2026-12-05-matheapolis-bimonthly-social.png`) — identity checked by hashing the fetch, never
by the filename.

- **Provenance is content-addressed, not remembered:** in both cases `sha256sum` of the mirrored file **is** the path
  segment Mobilizon serves it under, and re-fetching the URL in `data/events.json`'s `image` field gives bytes
  `cmp` reports identical (`cmp /tmp/pl-recheck.png src/assets/photos/event-2026-11-11-parallel-learning.png`,
  2026-11-06). A filename can be re-pointed at other bytes; a hash cannot. Re-verify with
  `sha256sum src/assets/photos/event-*.png`.
- **The posters repeat, and the file identity is the hash.** Four rows serve the social's media (`1f54c290…`) and
  three serve the study session's (`0e26aa4894…`), so seven PNGs here come from two upstream files. `cmp` reports each
  group identical; the build hashes each group to **one asset URL**, so a visitor downloads two images however many
  rows print (`event-2026-11-07-club-social.Bx3seRvs_Z1djt4s.webp` three times and
  `event-2026-11-11-parallel-learning.M0sOoDoF_GhAIn.webp` twice in `dist/client/schedule/index.html`).
  The repo pays the duplicate twice over in name only: `git hash-object` returns a single blob
  (`0135e3ba5fa422cad3d7011ede56d025a6bf8b1a` for the four socials, `3c6983792be276c2e00b3c100bcb8f1cc1d2e124` for the
  three study sessions), so the tracked bytes are stored once. @measured 2026-11-13 by `git hash-object`.
  Naming follows the row, not the bytes: the slug is the filename key (`event-<slug>.png`, D190), so when the
  organizer re-issued the 2026-11-07 social under a fresh UID (D225), the live row kept the natural slug and the file
  it names, and the retired row carries the `-cancelled` suffix. After the 2026-11-13 harvest that dead key is
  `2026-11-21-club-social-cancelled`: the UID that held it until then (649bf59a) came back in the feed as a Nov 21
  meeting and took the natural key `2026-11-21-club-social`, so the suffix moved to the UID that went quiet (D299).
  Whether the
  same poster should be *shown* twice on one page is asked of the operator; the wiring ships what the source supplies.
- **Which rows have art (re-read live 2026-11-13, `https://mobilizon.labradorius.com/@minneapolis_math_book_group/feed/ics`):**
the feed is **6,912 octets, 5 VEVENTs**, and every one carries an `ATTACH` - only two media hashes appear in it.
The 2026-11-11 snapshot's lesson still holds: the 2026-11-11 row gained `parallel_studies.png` the 2026-11-04
snapshot did not have (`picture: null` then), so art is a property of the row that can arrive after the row does.
That is why the `SLOT_ART` map lives in `src/lib/event-art.ts` keyed by slug (it left `Schedule.astro` when the
schedule grew a second surface - two files holding the same table is two calendars), and why adding a row means
adding an entry, not editing a template.
- **A `?name=` in a media URL is a label, not identity.** The same `1f54c290…` media was served as
  `?name=bimonthly_social.png` on two dates; a URL-only diff would call that a new image. Compare hashes, and note
  that `curl`'s cache here keys on the URL, so a changed `?name=` silently re-downloads identical bytes.
- **Rights line - PROPOSED, not ratified:** "the club's own event art, used with the organizer's permission."
  The ruling chose the mirror; the terms are the operator's to state, so this line is marked as a proposal in the
  file that ships it. Do not let it read as settled until the operator says the words.
- **Each `alt` states only the file's role** ("The club's own event image for this social" / "...for this study
  session") because nobody here read the frames - the session's model takes no images - and D170 forbids an alt
  inferred from a picture nobody saw. The organizer's own sentence, when it arrives, replaces it verbatim. These
  are the only `alt`s on this site that describe a file rather than a picture, and that is deliberate rather than lazy.
- **And the source has no caption to quote, which is why the ask goes to a person.** Mobilizon's `picture` objects
  are `{name, url, uuid}` - filenames, not sentences - and the event page (a **4,755-byte** SSR shell, fetched
  2026-11-04; re-fetched 2026-11-06 at ~4.7kB with no server-rendered `h1` or `alt` anywhere) has no caption to
  quote. D170 says quote the picture's page; there is nothing there, so this stays an open ask
  (`.notes/to-mobilizon/answer-2026-11-04-late.md`, §5).

Round 13 measured the only card the schedule section rendered **then** - its no-source notice, not a future event
card, a state the page no longer has (D223) - and photographed it with and without a thumb: the card is **512x280.8** at 1240 with a **480px** content box,
and **358x353.2** at 390 with **326px**, so the 323px thumb fits at phone width with **3px** to spare; planting it
costs **+122px** of card and page at both widths and leaves `check:render` green. `@measured 2026-11-03 by
round13` (`design/grill/round13/report.json`; the before/after pictures are in `design/grill/round-13-hero.html`, D160).

Rules that come with a shot (all ruled, see `design/records/0013`):
- **No stock people.** Only photographs of this club, its venue, and its materials.
- A slot's aspect ratio is declared in CSS. Tailwind's preflight (`img { height: auto }`) makes an HTML
  `height` attribute inert, and an undeclared ratio reflows the document on decode — measured here as a
  112px jump.
- Every photo gets an `alt` in the club's own words. Never assert something the frame does not support.
