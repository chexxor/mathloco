# 0014 — A pitfall note is evidence, and a slot box is a column you measured

**Date: 2026-11-02** (round 10, correction pass). Describes the code and the notes as they were then; everything
quoted here was re-run at this commit (`npm run check:space`, `npm run round10`, `npm run verify`).

**Situation.** Round 10 shipped two things in one motion: an instrument (`design/whitespace-survey.mjs`) and the
notes about what it found. Some of the notes were written from the shape of the problem rather than from a run —
including the four photo-slot boxes the operator was being asked to approve, a "measured" footer height, a header
character count, a trap involving an element the site does not have, and a mechanism attributed to
`getBoundingClientRect()` that it does not have. Nothing failed a gate. That is the point: **the gates were green
around numbers that were not true**, because gates check the site, not the prose about the site.

**What the run actually said.** The slot boxes were the expensive one, because they were about to become a shot
list. Measuring the children of every grid/flex container on the built page gives:

| What | Measured | What the note had claimed |
|---|---|---|
| hero media column @1240 | **372 × 564** (holds a 372 × 232.5 mark) | 372 × 564 — right, for the wrong reason (it was the mark's *neighbour* guessed as a column) |
| join media column @1240 | **526 × 165** holding a 200 × 192 png | "join card cell 200 × 192 → 420 × 268" — the 420 × 268 existed nowhere |
| feature card @1240 | **366.7 × 204.7**, interior 319 × 157 after `p-6` | "event thumb 367 × 120" — a thumb sized off the card's *outer* box, which would have overflowed its own padding |
| content width @1240 / @390 | **1180 / 346** | 1228 / 378 — plausible, wrong, and 48px of it would never have rendered |
| painted share @1240 | **4.56%** of pixels, **42%** of height in 8 empty runs | 5.48% / 41.5% |
| footer @1240 | **1240 × 248** carrying 131 characters, painting **0.7%** | "1240 × 131" — a character count promoted into a height |

Two claims described bugs that never happened: a `position: fixed` `#skip-link` "found at y 1173" (the site has no
skip link and **no fixed elements at all** — the survey now prints `position:fixed elements excluded from the
page-absolute walk: none`), and Astro leaking conditional-class source into `class` attributes (0 hits across the
three built pages). Both hazards are real *in general* and both defences stay — the filter, and whole-token class
matching — but they are written as hazards, not as things that happened here.

**Decision.**

1. **A pitfall or runbook entry states what was run.** If it was not observed, it is labelled **hazard, defended**
   with the check that shows it is not currently biting (`fixed: none`, `grep`: 0 hits). "Would" is allowed; a fake
   observed value is not.
2. **A slot box is a measured container, not a drawing.** `design/grill/whitespace-measure.js` now reports the
   children of every container whose **computed** `display` is grid/flex. Match on computed display, not class: the
   hero's grid is `lg:grid lg:grid-cols-12`, and a `.grid` selector silently misses Tailwind variant classes — which
   is how the largest slot on the page stayed invisible for a whole round.
3. **Every proposed size must name the measured neighbour it came from.** PS-2's 1180 is the content width; PS-3's
   316 is the height the copy column beside it already makes; PS-4's 319 × 110 comes from the card's interior after
   its own padding. A size with no named neighbour is a taste call wearing a number.
4. **`npm run check:space` is a script now** (`node design/whitespace-survey.mjs`). Docs had been citing it as one
   for a day; the cheapest way for a document to become a lie is to name a command that does not exist.

**Consequence.** The numbers in `DESIGN.md`, `.notes/NEXT.md`, `roadmap-brand.md`, `asset-sources.md`,
`decisions.json` (`areaAndWhitespace`, `photoSlots`) and record 0013 are the ones from this run. The open question
for the operator is unchanged in kind but not in size: PS-3 is not "a small cell that could grow", it is a
**526 × 165 column holding a 200 × 192 png** — 1.24% of the page today, 5.4% if it fills the row that already
exists. And the site's largest unbroken field is the **248px footer at 0.7% painted**, not the hero.
