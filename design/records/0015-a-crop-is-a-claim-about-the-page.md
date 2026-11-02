# 0015 — A crop is a claim about the page, and a cached number is a claim about a build

**Date: 2026-11-02** (round 10 / colour-survey correction). Describes the tooling as it was then; every number
quoted was re-run at this commit (`npm run check:color`, `npm run check:space`, `npm run check:rhythm`).

**Situation.** The colour survey had been reporting that the landing page paints **3.8%** chromatic pixels at 1240
and **5.2%** at 320, and that number was quoted in `DESIGN.md`, in `design/decisions.json` and in the queue as the
measurement behind "the site is drab". Removing the third-party Meetup mark was supposed to *reduce* colour. It
measured as raising chromatic share from **7.4%** to **12.6%**. That is impossible, so the instrument got
interrogated rather than the result being explained away.

**What was actually wrong — three defects, all silent.**

1. **A fixed crop.** `design/color-survey.mjs` shot a **2400px** frame (1400px at ≤390) of a page that is
   **2495–2607px** tall. The `bg-ink` footer band sat out of frame, and ink is `oklch(32% 0.045 152)` — chroma
   0.045, above the survey's own 0.04 bar — so the "most colourful" thing in the census is the dark ground, and the
   crop had cut ~139,000 px of it. At 320 the frame showed about **a third** of a ~4,500px page. The fix is a
   two-pass shoot, the same shape `design/whitespace-survey.mjs` already used: ask the page its own height, then
   shoot that, and **print the page height beside the frame size** so a future reader can see whether the census was
   the page or a slice of it.
2. **The crop was chosen before the page had finished.** A `loading="lazy"` image decodes after first paint and the
   document grows: 2495px → **2607px** here. So even a height read from `scrollHeight` was provisional, and the
   112px that arrived late was exactly the footer band again. The probes (`design/grill/render-measure.js`,
   `design/grill/whitespace-measure.js`) already waited for the webfonts to settle (D127) — the fix is that
   "settled" includes images: force `loading` to eager (changing it moves no geometry) and `await img.decode()`
   before anything is measured or any crop is chosen.
3. **A cached variant number outlived the page it described.** `npm run check:rhythm` measures each proposed spacing
   option in a copy of `dist/client` and caches the report in `.design/tmp-whitespace/`. After the mark was removed
   the shipped row moved to 4127px at 390 while the cached variant rows still said 4062 — the printed table was
   subtracting a fresh baseline from stale variants and looking plausible. Now the report carries a fingerprint of
   the *shipped* page's bytes (`siteFp`), and a variant report is reused only if that stamp matches: the variant
   copies cannot identify their own source build, because they are copies.

4. **A specimen that remembers its own numbers, and looks them up by styling class.**
   `design/grill/round10-build.mjs` hard-coded the photo-slot boxes. They had already moved (372×564 → **376×564**,
   526×165 → **532×128**) because the page changed under the round: removing the third-party image changed the
   join column's height from 165 to 128 — that column's height *was* the image — and a lazy image's box is also a
   scrollbar's box. Re-deriving the boxes from the `check:space` report exposed a second error: the two columns of
   the join card had been labelled backwards, which is how "**the row is 316 tall because the copy column beside
   it makes it so**" got written into `DESIGN.md`. It was the media column that was 316 tall, because it held a
   192px image. Matching by class string was also fragile: the probe truncates `class`, so `lg:col-span-4` fell off
   the end of the recorded value and a matcher that "worked" during development was finding nothing.
   The fix: **the page names its own places** (`<div data-slot="PS-1">`), the probe reports that name, and the
   specimen matches on it — and a matcher that finds nothing **throws**, so a stale assumption fails the build
   instead of turning into a plausible sentence.

**The measurement, restated.** With a whole-page crop and settled images, and before/after run through the *same*
instrument: at 1240 the page is **11.3%** chromatic at the 0.04 bar before the demotion and **12.6%** after — but
**10.8 / 12.6 points of that is the ink ground**, and the number that means what "drab" means is chroma ≥ 0.08,
colour a reader would name: **0.49% → 0.02%** at 1240 and **1.06% → 0.05%** at 320, of which **0.48 and 1.04 points
were one other company's red**. The old 3.8% and the new 12.6% are not two facts about the page; they are two facts
about the frame.

**The rule.**

- **A pixel census names its frame, and the frame is the page.** Ask the page its height; shoot that; print both.
  A hard-coded viewport height is a claim that the page is that tall.
- **"Settled" means faces *and* images.** A lazy image is a pending layout change, and it tends to land exactly
  where the bottom of the frame was.
- **Any cached measurement carries a fingerprint of the thing it measured.** A variant copy cannot name its source,
  so the fingerprint goes on the source, not the copy.
- **A consumer of a measurement fetches it; it does not remember it.** And it matches on a name the source
  publishes, never on a styling class: a class is whatever the layout happens to be called this week.
- **A height claim names the neighbour that produced it.** "This row is 316 tall" is only usable if you know which
  column made it — otherwise a layout change turns the sentence into a lie about free space.
- **Before/after must be the same instrument.** If the instrument changes, re-measure the before. Two numbers from
  two frames is not a delta — and a delta that is physically impossible ("removing colour raised colour") is the
  signal to interrogate the instrument, not the page.
