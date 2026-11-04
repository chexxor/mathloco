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
| **A1** | The art round's specimen: 13 public-domain plates drawn at real slot sizes, measured for colour, with the four operator-supplied books named | **done on `staging`, 2026-11-03** — the operator granted the merge; `design/round12-art` is in `staging` at `64e66fe` and `verify` there reports 13 ok / 0 failed. `main` stays the operator's. The 13 plates are in `design/assets/photos/` with their terms, and `npm run plates:measure` prints every candidate's palette delta | **awaiting review** — branch `design/round12-art` (4 commits) |
| **A2** | Put the two ruled plates on the real page: `ia-firstsixbooksofe00byrn-176-281` in PS-1 (372×564), `ia-cu31924031236171-122-176` in PS-3 (526×316); cut the `feature` card (D149-6) | **PS-1 done, 2026-11-03** (branch `pixels/hero-composition-r13`, unmerged). The operator ruled **round-13 option C** — stacked column, plate = column − mark − gap = **376×307** — and it shipped as `src/assets/photos/hero.png`: Byrne IV.15, **56% of the leaf**, **752×614** (2x, so a 3px hairline misses half-pixels), built by `npm run plates` through `design/grill/plate-crop.mjs`, sha1 `308193c78a` identical to the crop the round measured. Measured after applying: page **4284 (+0) at 1240**, **5859 → 6173 (+314) at 390**; plate **376×307** / **358×292.3**; mark strokes **1.49–1.81px → 2.02–2.17px** (floor 1px, D119); page chroma ≥0.08 **0.014% → 0.274%** at 1240, **0.032%** at 390; `verify` 15 ok / 0 failed (20.4s, deploy cost +32% vs an 15.5s baseline), `verify:browser` 7 ok / 0 failed (**76.0s, −13%**), `check:ground`/`check:area` reports re-measured and committed. Record **0025** names the palette delta and the instrument catch: `check:mark` photographed a **fixed 1400px window**, the plate pushed the mark to **y=1421 at 320** (box bottom **1449.9 at 640**), and the gate reported "no ink in the measured box" for a correctly painted mark — it now asks the page its settled height (`grill/shot-height.mjs`), costing 3.8s → **7.92s**. **Still open in A2:** PS-3 stays a text strip (the ruling was C, not G); the **phone** pays **+314px** of scroll for the plate, which the desktop specimen did not show — three answers, and they should arrive as pictures (D160); **PS-4** art is ruled *yes if it suits the layout* and awaits a real event to attach to; and round **14** must re-anchor the composition rounds on the stacked page, because round 13's table still mutates a row | not started — needs A1's merge grant, **and one composition ruling, which now has a specimen to answer with**: `npm run round13` measures seven options on the built page with the real plate in it, and writes `design/grill/round-13-hero.html`. Mechanism: the PS-1 column is `lg:flex` (**row**), so plate and mark compete for *width*. Corrected figures (D158): the review build's placeholder state is **RED — 7 mark FAILs at 1240** (mark **148.9×93.1**, scale 0.621, strokes 0.81/0.87px) — the eighth FAIL earlier sessions quoted was an instrument phantom, a `stroke-none` disc measured against the 1px floor. With the **real image** in the row as built the state is **green**: mark **188×118** (`check:space`) / **186×116.3** (`check:render`, whose viewport carries a scrollbar), thinnest stroke **1.02px** against the 1px floor — legal by 0.02px, plate **188×125** keeping 46% of a portrait leaf. So the question is what the column holds, not whether a gate goes red; the delegate's recommendation in the specimen is the stacked column at the leftover size (**plate 376×307, keeps 56%, mark 376×235, page +0**). Round 13 now photographs **both** questions, because a choice made from prose alone is a choice made blind (D160): the seven PS-1 columns cropped at one display scale, and the **Q2** pair - the schedule card as it stands vs with the 323x110 thumb, at 1240 and 390 - card **512x280.8** / **358x353.2**, content box **480** / **326** (the thumb fits with 157px and 3px), cost **+122px** of page, page colour **0.014% -> 0.044%** at chroma >= 0.08, `check:render` green in both states. Awaiting both rulings (mark fixed vs plate fixed vs mark moves out; art in PS-4 or none) |
| **A3** | Re-measure rhythm on the page the art makes, then the operator rules **R6** | `npm run check:rhythm` re-run at 1240/640/390/320 against the A2 page; a record shows the table; **the operator's ruling recorded as a D-id** | not started — needs A2 |
| **A4** | **Round 11 — body line-spacing**: shipped `body 17.6/24` = 1.36 against DESIGN.md's published 1.5 floor, measured in the renderer, one round covering the same line-box geometry R6 touches | a round specimen the operator chooses from; the token change; `check:rhythm` re-run after it; ruling as a D-id | not started — deliberately after A3 |
| **A5** | D149-3c: move the notice-button keyline so it sits on **one** ground instead of straddling `paper` and `panel` — fix the placement, not the number | `npm run check:ground` reports no two-ground side for that hairline, and `check:ground:selftest` still passes | **done on branch `pixels/one-ground-keylines`** — awaiting review + merge grant. 7 keylines, 3.01 on `paper` on both sides at all three widths, 0 straddles; `check:render` rule 4a + 2 new plantings (14 total, all caught). Record 0024, **D154** (now in `DECISIONS.index.md`) |
| **A6** | Events: publish `/events.ics` from data we author (D70 contract, D150 framing) — data file, build-time render, `check:ics` traps, `TZID=America/Chicago` + `VTIMEZONE`, `STATUS:CANCELLED`, staleness gate | `npm run check:ics` exists and **can fail** (a selftest plants each trap); the served `.ics` is byte-identical across two builds except `DTSTAMP`/`X-WR-…`; a real `curl` of the preview URL returns the two November events with the right wall-clock | blocked on operator inputs (below) |
| **A7** | The memory that travels: tracked `DECISIONS.index.md` + dangling-citation gate, tracked `MILESTONES.md` (this file), `check:figures` for measured numbers in `DESIGN.md`, gate-cost guard | `npm run check:decisions` and `check:figures` green inside `verify`; this file exists; cost guard prints against a baseline | **done on branch `process/gates-that-remember`** — awaiting merge grant |

### What A6 still needs from the operator (six inputs, as of 2026-11-03)

1. The series name: "MPLS Math Club - **Bimonthly** Social" carries the word D92 ruled out of our titles, and
   the pattern in the data says every two weeks. Proposed: `MPLS Math Club Social`, rhythm carried by the data.
2. Which November dates are real: an every-two-weeks pattern from **Sat 7 Nov** gives **7, 21 / Dec 5, 19**; the
   Wednesday series gives **11, 25 / Dec 9, 23**; D92's own record quotes November as **7, 12, 21, 26**. One of
   those is wrong, and a wrong date is the costliest defect on this roadmap.
3. Harvest source: the **group** feed (`/@minneapolis_math_book_group/feed/ics`) returns **0 VEVENTs** while the
   **instance** feed carries 5 — so either the events move into the group, or we harvest the instance feed and
   filter. Which?
4. Is the instance reachable from outside the LAN? A TLS handshake to the public address from inside the network
   does not prove it (NAT loopback). A phone on cellular settles it, and it decides whether a scheduled harvest
   can live in GitHub Actions or must live on the home server.
5. Whether `/schedule` returns as a page (its nav link is a dead fossil from D63), and whether RSVP back-flow
   stays out of scope.
6. When convenient: **cancel** an event and check whether the feed drops it or emits `STATUS:CANCELLED` — D72
   lists this as unverified upstream behaviour.

### Merge order for the branches awaiting a grant

`process/gates-that-remember` (A7) first: it is what puts `MILESTONES.md` and `DECISIONS.index.md` under the repo
at all, so every other branch's clock-in ritual currently fails on a fresh clone. `pixels/one-ground-keylines`
(A5) is independent of A1 and of A7's files. `design/round12-art` (A1) touches no site markup. A2 needs A1 merged.
`pixels/hero-composition-r13` (round 13, D158/D160) is stacked on all four, so one merge of it lands the whole queue; measured
2026-11-03 with `git merge-tree --write-tree --name-only staging pixels/hero-composition-r13` (a tree hash, no conflict),
and that tree ran `verify` 15 ok / 18.3s and `verify:browser` 7 ok / 72.2s. Re-run after D160's three commits (branch 24
ahead): still no conflict, tree `b9aed084`. Those gate figures belong to the 21-commit tree; the current head is green on
its own (`verify` 15 ok / 16.6s, `verify:browser` 7 ok / 102.8s).

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
