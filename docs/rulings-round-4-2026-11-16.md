# Matheapolis — rulings on the round-4 delegate letter
Reviewer: external design read. Date: 2026-11-16.
Scope: the nine asks in the delegate's letter of 2026-11-15.
These are decisions, not measurements. Where a measurement is named below, the
delegate runs it; nothing here requires another review round to close.

## Standing rule for this document

A reviewer's claim about the artifact is worth what its instrument is worth. Five
sentences of the round-4 brief are withdrawn (§ "Withdrawn" at the end). Where the
letter and the brief disagree and the letter cites a reproducible instrument and a
path in the tree, the letter wins. Where the brief names a visual outcome and the
archive cannot supply the pixels, the archive wins and the outcome is rewritten.

---

## R1 — Link ceiling: option (a). Same-origin is not an exit.

**DECISION: (a).** `/schedule` at 6 absolute URLs outside `<footer>` meets the
criterion. Do not delete the calendar line, do not re-add band platforms to the
standing row, do not accept 7.

**Why.** `check:ext-links` already defines an outbound link as "an http(s):// host
that is not the site's own," and `/events.ics` is same-origin [^1]. One
vocabulary, already in the tree, already green. The brief's §6 parenthetical was the
defect, not the page.

**Second ask — the degenerate standing row: leave it degenerate.** A one-platform
standing row is the correct artifact for a page whose footer already paints Meetup and
Discord. Adding a second platform so that "never reorders" and "drops one" become
observable is instrumentation buying back its own coverage with a duplicate door. In
`check:rsvp-preference`, mark the two assertions conditional — skipped, with a printed
note naming the reason — rather than deleted, so a future two-platform row
re-activates them without a code change. Do not add URLs to a page for a gate.

**Replacement acceptance, replaces §6's parenthetical and §10's clause verbatim:**
> `/schedule` at 390px offers five row primaries (one per printed date, distinct
> event URLs), one standing platform whose URL the footer does not already paint,
> and one same-origin calendar route. Absolute URLs outside the `<footer>` element:
> 6. No page on the site exceeds 6 absolute URLs outside its own `<footer>`.

---

## R2 — Horizon plate: none of the four. Cap it at its own scan width.

**DECISION: reinstate D347.** One plate, captioned, painted at no more than its
source scan's intrinsic width — 698px for the 1910 Euler leaf [^1] —
centered or column-aligned, **not** full-bleed. D351's cap deletion is undone.

**Why none of (a)–(d).** The letter's option set is missing the only option that
satisfies both constraints at once, which is why the choice looked forced:

- (a) as shipped paints the leaf at 1.71× its scan to fill a 1192px column
  [^1]. On the one asset whose entire value is hairlines, that trades
  line quality for width. It also costs +721px on a 3153px page — 23% of the
  document — for a plate about the history of geometry, not about the club.
- (b) composes an exhibition, which my own §7.2 rejected in the same paragraph it
  asked for one plate.
- (c) loses the artifact that carries the site's identity.
- (d) reopens record 0023 and the alt/provenance rules for a licence.

Capping resolves the conflict record 0023 raised without the exhibition: honest
pixels, +~350px at 1240 instead of +721, identity intact.

**Instrument to add, not a gate:** `design/plates-price.mjs` already prints a
"full-bleed on the column" row. It needs a third row — "one plate, capped at
intrinsic scan width" — because that row's absence is what made (a)–(d) look
exhaustive. A probe, not a gate; no milestone.

**Replacement acceptance, replaces §7.2's "full-bleed" and §10's plate clause:**
> The horizon band holds exactly one plate with one caption, painted at no more than
> 1.0× its widest available source rung, and costs the page no more than 400px at
> 1240px wide.

---

## R3 — /chat above the fold: option (b) stands, and the pending state claims nothing.

**DECISION: accept the shipped fallback.** Do not take option (a). Renaming a page
and moving a heading to fix a fold is the tail wagging the dog, and the page's name
genuinely is "the summaries."

**Second ask — may the pending state claim anything about whether summaries loaded?**
No. A `prerender = true` page cannot know, so it must assert nothing, which is what
shipped [^1]. Do not add "loading" language; a static page that says
"loading" is lying with extra steps.

**The real defect is not design and must not be closed by design.** Summaries not
loading in preview is a deploy/credentials condition. Park a `PLAN.md` row with
trigger: **a preview deploy with the KV binding present, where `/chat` renders at
least one thread summary**. Until then R3 is closed as shipped.

---

## R4 — Meetup URLs: the group root survives, and the two-tier vocabulary is correct.

**DECISION: confirm the root as the standing survivor, as shipped.** My "make the
other a redirect" was unbuildable — both are Meetup's paths, and a Workers trigger
redirects hosts the Worker is attached to, not third-party ones [^1].
Withdrawn.

**Write this distinction down once, in `DESIGN.md`, because it will be re-flagged
otherwise:** a row's primary link goes to **that event's** Meetup URL, because the
visitor is deciding about a specific date. The standing/band link goes to the **group
root**, because the visitor is joining a thing that persists. Two purposes, two URLs,
not an inconsistency. Nothing to dedupe.

---

## R5 — The photograph: a `PLAN.md` row, with a two-clause trigger.

**DECISION: `PLAN.md`, §Milestones.** Not `roadmap-brand.md` — the errand needs
`check:plan`'s trigger enforcement, and a line beside surfaces it would re-measure is
a note, not a commitment.

**Trigger (both clauses, or the row does not un-park):**
1. The operator supplies a photograph of an actual Matheapolis meeting, ≥1600px on
   the long edge, 3:2, natural light, no filter.
2. The file is named per R7's rule — role and media identity, **no date in the
   filename**.

Nothing ships until both hold. A stock room stays forbidden; the brief's own words
are the ruling: "a stock room is worse than no room."

**Withdrawn:** "Open an issue and stop."

---

## R6 — Nav/footer: closed. Record the instrument, not the claim.

**DECISION: closed. Do not re-open.** Every built page carries 2 `<nav>` and
1 `<footer>` [^1].

**Record in the response, one line, so the class stops returning:**
> The round-3 finding was produced by a text extraction that drops `position: fixed`
> chrome; the artifact was never missing its nav. Claims about absence must be made
> against a byte census of the built HTML. The honest instruments are
> `npm run check:render:dist` (nav-fit and mark cells) and `node design/nav-fit.mjs`.

---

## R7 — Harvester naming rule, and who owns the sweep.

**The naming rule.** An asset mirrored from event media is named by **role + media
identity**, never by date:

    <role>-<mediaUid>.<ext>          e.g. social-8f3a2c.webp, study-2b71de.webp
    role ∈ { social, study }

And the harvester must classify reuse rather than silently reuse: when one media UID
appears against more than one event, the manifest records `reuseCount > 1` and sets
`standing: true`. A standing asset is by definition an illustration **of a format**,
not a photograph of a meeting, and may be described as such. A filename can then
never contradict a row, because no filename asserts a date.

**The sweep: the harvest side owns it, one commit, no new gate.** Delete the seven
`src/assets/photos/event-*.png` in the same commit that updates the three references
the letter names — the harvest step, `EventArt.astro`, `src/lib/event-art.ts`
[^1].

**Which gate goes red if it lands without them:** the build, and nothing else. That is
the correct answer, and it is also the test: **if the build stays green after the
deletion, nothing referenced them and the deletion was free.** Do not add a check to
make this feel guarded. If the build does go red, the reference list in the commit is
incomplete, and the red is the signal you wanted.

---

## R8 — Retire the vacuous criterion. Replace with one that decides something.

**DECISION: delete §10's "no image is painted on a date its filename contradicts."**
It is satisfied by having no filenames that bear dates [^1].

**Replacement, one sentence:**
> No image filename contains a date. An asset shared by more than one event is named
> by media UID and marked `standing: true` in the manifest.

That decides both halves of R7 — the harvester's convention and the future
photograph's naming — and it is checkable with a `find` for digits in a filename.

---

## R9 — Hero order: (a) as shipped, with one hoist. Then measure at 320 and stop.

**DECISION: (a), plus one change inside the fence.**

The answers-first order is accepted, and the trade it makes is the right one for a
returning member: date and door in one screen [^1]. But a first-time
visitor now meets an imperative — "Join Our Group" — before any sentence says what
the group is `[^1]`. That is the one part of the shipped order I would
not leave.

**The change, and it needs no new copy:** hoist the existing tagline line — the one
beginning "A book, a room, and whoever shows up" — so it sits directly under the H1
and **above** the meeting block. That single line is the shortest true answer to
"what is this," it is already on the page, it is already the site's best sentence, and
moving it changes order only: no type, no spacing, no colour, no new way in, so
D303 and the `check:space` ramp are untouched. If the line has been deleted since the
round-3 read, hoist the first sentence of the lede instead and say so in the commit.

**Then run the 320 probe once, and apply this pre-committed rule so no round 5 is
needed.** I cannot run it — I have no repo access — so the delegate runs
`node design/fold-answers.mjs --no-build` at **320x844** and reports the number:

| Result at 320x844 | Action | Item state |
|---|---|---|
| 0 of 5 answers past 844 **with** the hoist | ship as-is | closed |
| the hoist alone pushes an answer past 844 | keep the meeting block first at ≤359 only: `hidden xs:block` on the hoisted line, matching D-A's fallback pattern | closed |
| an answer was already past 844 at 320 **without** the hoist | the shipped order does not meet the criterion at DESIGN.md's floor; report the number and open a design row for option (c) restricted — the chip already answers "when," so the hero adds only the where-line above the lede | closed as "does not meet at 320, escalated" |

Do not fix the third case in this branch. Report it.

---

## Withdrawn from the round-4 brief — do not cite these again

1. §6's parenthetical "five primaries plus the calendar" and §10's "no more than six
   outbound links outside the footer" → replaced by R1's acceptance block.
2. §7.2's "full-bleed captioned break" → replaced by R2's.
3. §7.1 / §11 "open an issue and stop" → replaced by R5's `PLAN.md` row.
4. §10's "no image is painted on a date its filename contradicts" → replaced by R8's.
5. §0's "nav and footer are absent on all four pages" → closed by R6, and the
   instrument named there is the one to use if the class recurs.
6. §9b's "make the other a redirect" → unbuildable; deletion accepted per R4.

Everything else in the round-4 brief stands. The voice, the four routes, the palette,
the spacing ladder and the no-new-gates instruction are unchanged.

## One line still owed

The letter does not mention §9c — README still documenting `--color-book-gray` and
`--color-book-theme` as live and naming `minneapolismathbookclub.com` as canonical.
If it shipped, say so in the response. If not, it is a one-commit edit with no gate
and no milestone.
