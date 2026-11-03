# Milestones — tracked

This is the **tracked** queue header. `.notes/NEXT.md` is the working, per-session view (host-local, so it
can be messy); this file is the part that survives a fresh clone or the other machine, and it exists so a
session on a bare checkout can answer "what is the current milestone and how would I know it's finished"
without the notes.

**The rule that makes it useful (D151): every item states its exit criteria.** A milestone item without an
exit criterion is a topic, not a task. An exit criterion names the command that proves it, or the ruling that
closes it. "Improve the schedule" is a topic; "`/events.ics` serves from committed data and
`npm run check:ics` fails on a missing `DTSTAMP`" is an item.

- Ids here are stable and referenced from `.notes/NEXT.md`; they are not renumbered.
- Nothing on this list authorizes a merge or a push. Merging into `staging` needs the operator's grant, and
  pushing needs the operator's hand (D66, D124 amendment).

## Current milestone — accepted by the operator 2026-11-03 (D150)

| # | item | exit criteria (what proves it) | state |
|---|---|---|---|
| **A1** | The art round's specimen: 13 public-domain plates drawn at real slot sizes, measured for colour, with the four operator-supplied books named | operator reviews `design/grill/round-12-art.html` and grants or refuses the merge of the branch it lives on | **awaiting review** — branch `design/round12-art` (4 commits) |
| **A2** | Put the two ruled plates on the real page: `ia-firstsixbooksofe00byrn-176-281` in PS-1 (372×564), `ia-cu31924031236171-122-176` in PS-3 (526×316); cut the `feature` card (D149-6) | `npm run check:content` green with no new placeholder; `check:color`, `check:ground`, `check:area` re-run and their reports committed; a design record names the delta each plate costs the palette | not started — blocked on A1's merge grant |
| **A3** | Re-measure rhythm on the page the art makes, then the operator rules **R6** | `npm run check:rhythm` re-run at 1240/640/390/320 against the A2 page; a record shows the table; **the operator's ruling recorded as a D-id** | not started — needs A2 |
| **A4** | **Round 11 — body line-spacing**: shipped `body 17.6/24` = 1.36 against DESIGN.md's published 1.5 floor, measured in the renderer, one round covering the same line-box geometry R6 touches | a round specimen the operator chooses from; the token change; `check:rhythm` re-run after it; ruling as a D-id | not started — deliberately after A3 |
| **A5** | D149-3c: move the notice-button keyline so it sits on **one** ground instead of straddling `paper` and `panel` — fix the placement, not the number | `npm run check:ground` reports no two-ground side for that hairline, and `check:ground:selftest` still passes | not started |
| **A6** | Events: publish `/events.ics` from data we author (D70 contract, D150 framing) — data file, build-time render, `check:ics` traps, `TZID=America/Chicago` + `VTIMEZONE`, `STATUS:CANCELLED`, staleness gate | `npm run check:ics` exists and **can fail** (a selftest plants each trap); the served `.ics` is byte-identical across two builds except `DTSTAMP`/`X-WR-…`; a real `curl` of the preview URL returns the two November events with the right wall-clock | blocked on operator inputs (below) |
| **A7** | The memory that travels: tracked `DECISIONS.index.md` + dangling-citation gate, tracked `MILESTONES.md` (this file), `check:figures` for measured numbers in `DESIGN.md`, gate-cost guard | `npm run check:decisions` and `check:figures` green inside `verify`; this file exists; cost guard prints against a baseline | **done on branch `process/gates-that-remember`** — awaiting merge grant |

### What A6 still needs from the operator

1. Which dates are real: the instance held **Nov 3 (Tuesday)** and Fridays in May/June; you said **Sat Nov 7**
   and then corrected the event on the instance (verified in the feed: it now reads Nov 7). And D92's record
   quotes November as **7, 12, 21, 26** while an every-two-weeks pattern gives **7, 11, 21, 25**.
2. The series name: "MPLS Math Club - **Bimonthly** Social" carries the word D92 ruled out of our titles.
3. Harvest source: the **group** feed (`/@minneapolis_math_book_group/feed/ics`) returns an empty calendar
   while the **instance** feed carries the events — so either the events move into the group, or we harvest
   the instance feed and filter, and I need to know which you want.
4. Whether `/schedule` returns as a page, and whether RSVP back-flow stays out of scope.

## Parked, with the trigger that un-parks it (D148)

| parked | un-park trigger |
|---|---|
| ground-grain texture (R7b) | a specimen exists **and** the hairline has headroom — `check:ground` says `3.01` against a `3.0` bar today, i.e. none |
| the `gold ↔ path-discord` 27° re-home | the operator rules it an exception rather than a defect, or a new hue is proposed — **the defect stays open until then** |
| surface-policy application (S-A/S-B/S-C) | a page needs a surface decision that the policy would change |
| served-page render probe (`check:render:served`) | a change to `/chat` island hydration, or a probe that needs a live URL |
| 768/1024 boundary sweep | a `md:`/`lg:` breakpoint in `src/` changes, or a reported layout bug at tablet width |
| mark surface identity (R1) | the operator picks it up — low priority by their word |

## Closed milestones

- **R7** — home page says what the club does; a notice is one boundary; a browser step gets a wave to itself.
  Merged into `staging` as `d71ba32` (D141/D142/D143).
- **G1–G3** — a green gate run leaves its evidence; a ground probe reads painted bytes; the width set measures
  the breakpoints `src/` uses. Merged into `staging` as `7fd040b` (D144/D145/D146).
- **A7** (above) — awaiting the merge grant, not the work.
