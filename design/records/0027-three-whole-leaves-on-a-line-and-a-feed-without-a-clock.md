# Record 0027 — three whole leaves on a line, and a feed without a clock

Date: 2026-11-04. Branch `pixels/page-composition-r14`. A2, the composition ruling (D168).

## What the operator ruled

The round-14 letter (five photographed compositions, D165) went back answered in letters, and the answer was **none
of the five**:

1. **1c** — the third *new* option in the specimen's "what the archive changed" block: a full-width plate band lower
   on the page, composed from **several leaves** rather than one upscaled one.
2. **2b** — the phone keeps the shipped hero state (option (b) of the three photographed phone answers).
3. **3a** — cut the "Steps you can undo" card now (executing D149-6c, which had been ruled in June and never done).

The operator also supplied the A6 feed URL.

## Why "one wide band" died first

Record 0023 said the honest way to fill a wide band is several plates, not one stretched. Round 14's header asserted
the archive ladder "tops out at 1024px" and priced options C and B as a 1.15x/1.16x upscale. That inference came from
the **rung name**, not the bytes. Probed 2026-11-03 by fetching each candidate through `plateSource` and reading it
with sharp, and now reproducible: `node design/plate-probe.mjs` writes **`design/plate-widths.json`** (tracked,
`@measured 2026-11-04`) rather than scratch, because a measurement that only exists in a temporary file is how the
next session ends up inferring a limit from a name again:

| leaf | native delivered | aspect |
|---|---|---|
| Byrne Euclid IV.15 (1847) | **688x1004** | 0.69 |
| Euclid for schools (1903), leaf 297 | 1024x357 | 2.87 |
| Slaught & Lennes plane geometry (1910), leaf 122 | **698x350** | 2.00 |
| radio text (1922), leaf 514 | 1024x478 | 2.14 |
| NBS bulletin (1922), p. 105 | 578x747 | 0.77 |
| Whiting arithmetic (1909), p. 223 | 686x354 | 1.94 |

`/img/1600/`, `/img/2048/` and `/img/full/` are 404. So a single leaf across a **1176 CSS px** band is a **1.68x**
upscale that keeps about **34%** of the drawing — and the shipped hero, written at 2x of a 376px box from a 688px
scan, had been shipping **752 columns of which 64 were interpolated**. Both claims in record 0026 and D165 that
inferred a limit from the rung name are corrected here, in the record that contradicts them (the repo rule).

The instrument fix that follows (D167): `cropFor(buf, w, h, { scale = 2, capWidth })` — never write more columns than
the source has. The hero file went **752x614 / 493kB / `308193c78a`** → **688x562 / 377kB / `47518a39c1`**: −24% bytes,
displayed box and geometry untouched (D161's stack is about the box, not the file). The 1910 leaf lands at **698x351**
rather than a stretched 768.

## The three horizon options, as the round measured them (2026-11-03/04, before the ship)

From `npm run round14 -- shelf-lg shelf-all leaf-native` (the round's own output; page height, painted share, gate
result and per-plate boxes come from `check:space`/`check:render`/`check:color` inside the round):

| option | what it is | page delta @1240 | @1024 | @640 | @390 | painted @1240 | gate |
|---|---|---|---|---|---|---|---|
| **F `shelf-lg`** | three leaves, one row, `hidden lg:block` | **+321** | +321 | +0 | +0 | 5.33% -> **7.47%** | green (mark 376x235, min stroke 2.02px) |
| **G `shelf-all`** | same, but stacked on phone too | +321 | +321 | **+173** | **+132** | 7.47% | green |
| **H `leaf-native`** | one 1910 leaf at native size | +321 | +321 | +244 | +244 | 6.15% | green |

Three plates paint **0%** of the page at chroma >= 0.08 (measured: `plate-shelf-euclid1903 384x134 chroma>=0.08 0%`),
which is why this composition buys visual interest without touching the colour spend that round 14 priced — and why
option B's **5.034%** Byrne band was a different decision entirely, not a louder version of the same one.

**Why the tracked report does not contain these three options:** the subset run that measured them was the run that
exposed the delta-arity bug (the report recorded `+4605` where the console said `+321`), and by the time the closure
was fixed the composition had shipped, so the runner's guard now correctly refuses to price a second band. The report
and specimen in git are therefore the **five-option run** of the pre-ship page, and this table is the record of the
three options that were actually chosen from. That is a gap worth knowing about, not papering over: if a future
session needs those three re-measured, it re-runs them against *the current* page in a new round, where +321 will no
longer be the number.

## What shipped

`src/components/HorizonBand.astro`, inserted between the reasons section and the schedule:

- `data-slot="PS-5"`, three `<Image>` plates on `bg-paper`, `hidden lg:block` (D161: no phone composition is ruled,
  so it is desktop-only until one is), plates 16px apart sharing a baseline (`align-items: flex-end`).
- **Each cell is the leaf's own aspect — 2.87 / 1.99 / 2.14 — so nothing is cropped.** This slot is the only one in
  the repo where the box is derived from the picture rather than the picture from the box, and that is deliberate:
  every other slot crops, and the two times a wrong crop was caught, it was caught by *looking* at the specimen
  (the Byrne band dropping Book I's construction, record 0023; the 1910 leaf's four circles, this round).
- Leaves, and the mistake that had to be corrected in this same record: the first provenance sentences — "p. 210:
  Book VI figures on a right triangle", "p. 176: the 60-degree construction, four circles and an equilateral triangle",
  "p. 212: a three-electrode audion as an oscillation generator" — were **inferred** from the book titles and the second
  number in each id. Reading the picture pages: the ids are **leaf 297 / leaf 122 / leaf 514**, and what the leaves show
  is the octahedron-dodecahedron-icosahedron, an arc construction with "center O tangent to the four arcs", and "Antenna
  Current in radiotelephony … Modulates a radio-frequency Wave which can be received with Simple Detector". All three
  pages say **Public Domain Mark 1.0, "Free to use for anything"** (Internet Archive; the 1910 scan is Cornell). The
  invented sentences were live in `alt` attributes for about an hour. Fix: alt and provenance are **quoted** from the
  picture page, and a book title is not evidence about a drawing (D92).
- The card cut: the `feature` object out of `src/content.json`, its type out of `src/lib/content.ts` (with a note so
  nobody re-adds it as a slot), its render branch out of `WhyJoinUs.astro`, and the threads-list gloss that told
  readers the thread was "written out below" lost its pointer.

## What it cost, measured on the shipped tree (`check:space`, `check:color`, `check:render`)

| | before (2026-11-03) | after (2026-11-04) |
|---|---|---|
| page @1240 | 4284px | **3889px** |
| page @1024 | 4284px | 3943px (band at 976x158) |
| page @640 | 5293px | 4578px |
| page @390 | 6173px | **5176px** (the card was ~1000px of phone scroll) |
| painted @1240 | 5.33% | **7.7%** |
| named colour @1240 | 0.274% | 0.30% (**≈14.5k px either way**) |
| empty runs @1240 | 9 / 1075px | **10 / 1215px** |
| PS-5 | — | **1180x192 @y1825** @1240, 976x158 @1024, 0x0 ≤640 |

Two things in that table are worth more than the win:

1. **Colour share rose while colour didn't.** 0.274% → 0.30% is the shorter page, not new ink: the absolute count is
   the same ~14.5k pixels. Any future claim about chroma *share* has to name the denominator.
2. **The emptiness moved instead of closing.** Painted share went up 44%, page height went down 400px, and the
   unmarked space still got *bigger* in absolute terms: the band brings 128px of its own `py-16`, and removing the
   card left a **283px** hole inside the reasons section. That is A3's rhythm question, now with two named numbers
   attached to it.

`check:space` initially reported **no PS-5 row at all**: the survey records a `data-slot` box only when the element is
a grid or flex child, and PS-5's parent was a plain block. The wrapper carries `flex` for that reason alone, and the
component says so in a comment.

## The feed, harvested (A6)

`https://mobilizon.labradorius.com/@minneapolis_math_book_group/feed/ics` → 200, 2578 bytes, **two VEVENTs, no
RRULE, no TZID, no VTIMEZONE**:

- `MPLS Math Club - Bimonthly Social` — `DTSTART:20261107T120000Z`/`140000Z`, Angel Food Bakery, 8100 Minnetonka Blvd,
  Saint Louis Park, `GEO:44.9498412;-93.3824443`.
- `Parallel Learning for Mathematical Minds` — `20261111T180000Z`/`200000Z`, Kowalski's Market, 5327 Lyndale Ave S,
  Minneapolis, `GEO:44.9057455;-93.2878163`.

Read as instants those are **06:00** and **12:00 CST** — a bakery social at six in the morning. The roadmap's open
input #3 ("group feed returns 0 VEVENTs while the instance feed carries 5") is now false: the group feed returns those
same two `UID`s. So A6's remaining question is not where the events live but **what time they start**, and the site
must publish `TZID=America/Chicago` + `VTIMEZONE` regardless (D70's contract, D169). The word "Bimonthly" in the first
title stays D92's problem: the title we publish comes from our data, not the feed.

## What is still open

- **PS-2** (venue strip): still needs a venue photograph — archive plates are books, not places. Trigger: a real
  venue shot exists, or the JP2 probe finds a source above 1024px.
- **PS-4** (event-card thumb): art is ruled *yes if it suits the layout*; it awaits a real event to attach to, which
  is now one feed-answer away (A6).
- **PS-3** (join media column): round 14's option C put the 1910 leaf there; that proposal is superseded — the leaf
  shipped in PS-5 instead, and PS-3 stays the text strip D149-3c made it.
- **Round 14 is frozen.** The runner refuses any option that would insert a second band, because pricing a page that
  no longer exists is how a specimen starts lying.
