# 0013 — A third party's mark is not your brand colour, and a page's emptiness is a measurable thing

**Date: 2026-11-02** (round 10, grill). Describes the code as it was then; the measurements re-run with
`npm run check:space` and `npm run round10`.

**Situation.** Two operator rulings in one message: "the landing page is still mostly whitespace", and "remove
or greatly reduce the Meetup logo, and make sure trademarked items are properly labelled" (with H-A approved,
K-B accepted for now, and PH-B chosen). The tempting answer to the first was "add colour" — the round that had
just been measured was about colour. Measuring first showed the two questions were coupled in the opposite
direction from the guess.

**What the measurements said.**

- Emptiness is its own quantity. `design/whitespace-survey.mjs` (`npm run check:space`) reports, on the built page
  at 1240: document **2495px** tall (2607px once the lazy image decodes), **4.56%** of pixels differing from their
  own ground by the 0.05 same-colour bar, and **42%** of the page height sitting in 8 empty runs ≥ 60px (biggest
  217px). At 390: 8.16% painted, 35.7% empty in 14 runs. The two numbers answer different questions and neither is
  "colour".
- The page is **thin, not wide**: read per line, no surface is over-long — `main` 468 characters over 564px,
  `section.bg-panel` 866 over 853px, the footer 131 over 248px, and `npm run lines:measure` puts prose at 29–38
  characters per line — below comfort, not over it. Round 8's
  line-length ruling neither caused the emptiness nor can cure it.
- The loudest colour on the page was **not ours**: the Meetup png paints **1.24%** of the desktop page and holds
  the highest mean chroma in the system (0.226, 0.523% of pixels at hue 0–30°). Removing it lowers the page's
  chromatic share from **3.77%** to about **3.25%** — so the two rulings pull against each other, and the gap has
  to be paid for by area and true content (photo slots worth 6.78% and 12.2% of the page; real facts in place of
  six generic cards), not by keeping another company's red.

**Decision.**

1. **Name platforms in our type; do not paint with their marks.** A link plus our own words. The `path-*` hues
   stay as our own wayfinding colours. If a mark is shown at all it is the official file, unmodified, in
   clearspace, next to the name it stands for — a **recoloured or re-drawn** third-party mark is a different risk
   from a recoloured word, and it is the one behaviour that Discord's retrievable terms name explicitly
   ("exclusive property", permission required, no implication of sponsorship, don't "recolour").
2. **Meetup's terms are UNVERIFIED from this rig**, not absent: `meetup.com/brand` serves a JavaScript shell and
   `/terms/` and `help.meetup.com` return 403. Nobody may assert them from memory; the conservative behaviour
   follows from the nominative-use factors (identify the thing, use only as much as that requires — "the words but
   not the font or symbol" — imply no endorsement), which is a tertiary summary, not primary law.
3. **Label it in one static footer line**, specific wording, no component (a component invites conditional logic
   Cost measured: ~16px added to a footer that is already 248px tall and paints 0.7%.
4. **PH-B: reserve the photo places now**, drawn to scale from the page's measured geometry
   (`design/grill/round-10-photos.html`), each with a declared aspect ratio and a defined empty state. The one
   image the page ships reflowed the document **112px** (2495 → 2607) when it decoded, because its
   `width`/`height` attributes contradict the file and preflight's `img { height: auto }` makes the height
   attribute inert — that is why aspect is a rule rather than a preference.

**Consequence.** `npm run check:space` and `npm run round10` exist: emptiness gets an after-number the same way
colour got one, and a specimen that draws the page is measured back so the diagram cannot lie. Removing the png
is now a queue item with a known cost (0.52 points of chromatic share) rather than a taste argument.
