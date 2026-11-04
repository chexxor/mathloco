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
| **A2** | Put the two ruled plates on the real page: `ia-firstsixbooksofe00byrn-176-281` in PS-1 (372×564), `ia-cu31924031236171-122-176` in PS-3 (526×316); cut the `feature` card (D149-6) | **PS-1 done, 2026-11-03** (branch `pixels/hero-composition-r13`, **merged into local `staging` 2026-11-03**; `staging` is still unpushed, so CI has not seen any of it). The operator ruled **round-13 option C** — stacked column, plate = column − mark − gap = **376×307** — and it shipped as `src/assets/photos/hero.png`: Byrne IV.15, **56% of the leaf**, **752×614** (2x, so a 3px hairline misses half-pixels), built by `npm run plates` through `design/grill/plate-crop.mjs`, sha1 `308193c78a` identical to the crop the round measured. Measured after applying: page **4284 (+0) at 1240**, **5859 → 6173 (+314) at 390**; plate **376×307** / **358×292.3**; mark strokes **1.49–1.81px → 2.02–2.17px** (floor 1px, D119); page chroma ≥0.08 **0.014% → 0.274%** at 1240, **0.032%** at 390; `verify` 15 ok / 0 failed (20.4s, deploy cost +32% vs an 15.5s baseline), `verify:browser` 7 ok / 0 failed (**76.0s, −13%**), `check:ground`/`check:area` reports re-measured and committed. Record **0025** names the palette delta and the instrument catch: `check:mark` photographed a **fixed 1400px window**, the plate pushed the mark to **y=1421 at 320** (box bottom **1449.9 at 640**), and the gate reported "no ink in the measured box" for a correctly painted mark — it now asks the page its settled height (`grill/shot-height.mjs`), costing 3.8s → **7.92s**. **Still open in A2**, and all of it now measured **and photographed** in round 14 (`design/grill/round-14-page.html`, D165, record 0026): **PS-3** is still the text strip the ruling made it (C, not G) — option **C** of round 14 puts the 1910 Euler band in that empty stretch for **+192px** at 1240, chroma **0.260%** (below the shipped page's own 0.274%) and gate-green; the **phone** pays **+314px** for the plate, three answers photographed whole at 390 — (a) full 6173, (b) shorter **6075 (−98)**, (c) none **5859 (−314)**; **PS-4** art is ruled *yes if it suits the layout* and awaits a real event to attach to. Round 14 also found the mark's tokens are **ground-bound**: moved onto `bg-ink`, its gold paths read **2.5** against the 3.0 graphic bar (D101) and `check:render` fails the mark **twelve** times unless `--color-gold-on-ink` (5.80 on ink) is applied. And it confirmed **D149-6c is ruled but not executed** — the `feature` card is still in `src/content.json` and `WhyJoinUs.astro`; cutting it removes a block from a page whose measured problem is emptiness (9 runs over **25.1%** at 1240), so it wants to land with a composition ruling, not alone.
**A2's composition shipped 2026-11-04** (letters back: 1c, 2b, 3a; D168). The ruling was **not** any of the five
round-14 photographs but the third *new* option the archive forced: a **horizon band of three whole leaves**
(`src/components/HorizonBand.astro`, `data-slot="PS-5"`, `hidden lg:block`) between the reasons section and the
schedule — **1180x192 @y1825 at 1240**, **976x158 at 1024**, 0x0 from 640 down, each cell sized to its leaf's own
aspect so **no plate is cropped**. Why three: the archive's `/img/1024/` **rung** returns each scan's own width —
**688** (Byrne), **698** (the 1910 Euler leaf), **1024** (Euclid 1903, the 1922 radio leaf) — so a single leaf across
1176 CSS px is a **1.68x** upscale keeping a third of the drawing, not the 1.15x record 0026 claimed from the rung
name (D167; the corrected numbers are in record 0027). Leaves (each description quoted from the picture's own page, not
inferred): Euclid 1903 **leaf 297** (the solids — octahedron, dodecahedron, icosahedron), Slaught & Lennes 1910 **leaf
122** (arcs from two centres and a circle tangent to the four arcs; the colourless construction D149-2b asked for),
and the 1922 NBS radio text **leaf 514** (antenna current in radiotelephony). Also shipped: **phone stays (b)**,
and the **`feature` card is cut** (D149-6c) with its `content.ts` type, its `WhyJoinUs.astro` branch, and the gloss
that pointed readers at "the thread written out below". Measured at the shipped tree: page **4284 → 3889 at 1240**,
**6173 → 5176 at 390** (the card was ~1000px of phone scroll), painted **5.33% → 7.7%**, named colour **0.30%**
(≈14.5k px, i.e. unchanged in absolute pixels — the share rose only because the page shrank). The honest half: empty
runs **9/1075px → 10/1215px** — the band brings 128px of its own `py-16` and the cut left a **283px** hole inside the
reasons section, so the emptiness moved rather than closed (that is A3's, with a number now). Hero asset re-cropped with
the new cap rule: **752x614/493kB → 688x562/377kB**, sha `47518a39c1`, layout untouched. All gates green: `verify` 16 ok,
`verify:browser` 7 ok, `check:space`/`check:color`/`check:render`/`check:ground` re-measured. Record **0027**. | **PS-1 and PS-5 filled; PS-2 and PS-4 parked with triggers; A3 is next.** The composition is ruled and shipped (D168, record 0027); what remains in A2 is a venue photograph for PS-2 and a real event for PS-4, both parked with their un-parking triggers named below. Round 13 settled PS-1 (option C shipped). The page-scale question went to round 14: `npm run round14` measures five compositions of the whole built page at 1240/1024/640/390 and writes `design/grill/round-14-page.html` — **A** as shipped (4284, painted 5.33%, chroma 0.274%), **B** the Byrne leaf as a 1192×320 band opening the page (**+1135px** at 1240, chroma **5.034%** — 18× the shipped page — and a **1.16× upscale** of the 1024px archive ceiling), **C** the 1910 line-work band mid-page (**+192**, chroma **0.260%**), **D** one graphic per place with the mark in the ink footer (**+296**, needs `--color-gold-on-ink`), **E** the plate on a full-bleed ink spine (**+238**, chroma 0.338%). All five gate-green; the phone question measured three ways. Mechanism: the PS-1 column is `lg:flex` (**row**), so plate and mark compete for *width*. Corrected figures (D158): the review build's placeholder state is **RED — 7 mark FAILs at 1240** (mark **148.9×93.1**, scale 0.621, strokes 0.81/0.87px) — the eighth FAIL earlier sessions quoted was an instrument phantom, a `stroke-none` disc measured against the 1px floor. With the **real image** in the row as built the state is **green**: mark **188×118** (`check:space`) / **186×116.3** (`check:render`, whose viewport carries a scrollbar), thinnest stroke **1.02px** against the 1px floor — legal by 0.02px, plate **188×125** keeping 46% of a portrait leaf. So the question is what the column holds, not whether a gate goes red; the delegate's recommendation in the specimen is the stacked column at the leftover size (**plate 376×307, keeps 56%, mark 376×235, page +0**). Round 13 now photographs **both** questions, because a choice made from prose alone is a choice made blind (D160): the seven PS-1 columns cropped at one display scale, and the **Q2** pair - the schedule card as it stands vs with the 323x110 thumb, at 1240 and 390 - card **512x280.8** / **358x353.2**, content box **480** / **326** (the thumb fits with 157px and 3px), cost **+122px** of page, page colour **0.014% -> 0.044%** at chroma >= 0.08, `check:render` green in both states. Round 13 itself is frozen: PS-1 has no placeholder state left to mutate, so its runner now stops at step [1] (D166).
| **A3** | Re-measure rhythm on the page the art makes, then the operator rules **R6** | `npm run check:rhythm` re-run at 1240/640/390/320 against the A2 page — **it now has two specific targets** (D168): the **283px** hole left inside the reasons section by the `feature`-card cut, and the **128px** of `py-16` the horizon band brings with it (empty runs went 9/1075px -> 10/1215px at 1240 even as painted share rose 5.33% -> 7.7%); a record shows the table; **the operator's ruling recorded as a D-id** | not started — needs A2 |
| **A4** | **Round 11 — body line-spacing**: shipped `body 17.6/24` = 1.36 against DESIGN.md's published 1.5 floor, measured in the renderer, one round covering the same line-box geometry R6 touches | a round specimen the operator chooses from; the token change; `check:rhythm` re-run after it; ruling as a D-id | not started — deliberately after A3 |
| **A5** | D149-3c: move the notice-button keyline so it sits on **one** ground instead of straddling `paper` and `panel` — fix the placement, not the number | `npm run check:ground` reports no two-ground side for that hairline, and `check:ground:selftest` still passes | **done, merged into local `staging` 2026-11-03** with the queue (unpushed). 7 keylines, 3.01 on `paper` on both sides at all three widths, 0 straddles; `check:render` rule 4a + 2 new plantings (14 total, all caught). Record 0024, **D154** (now in `DECISIONS.index.md`) |
| **A6** | Events: publish `/events.ics` from data we author (D70 contract, D150 framing) — data file, build-time render, `check:ics` traps, `TZID=America/Chicago` + `VTIMEZONE`, `STATUS:CANCELLED`, staleness gate | `npm run check:ics` exists and **can fail** (a selftest plants each trap); the served `.ics` is byte-identical across two builds except `DTSTAMP`/`X-WR-…`; a real `curl` of the preview URL returns the two November events with the right wall-clock | **partly unblocked 2026-11-04:** the operator gave the group feed URL and it is harvested (D169) — **two VEVENTs, no RRULE, no TZID/VTIMEZONE**: Social `20261107T120000Z` at Angel Food Bakery (Saint Louis Park, `GEO` present) and `Parallel Learning for Mathematical Minds` `20261111T180000Z` at Kowalski's Market, 5327 Lyndale Ave S. Read as instants they are 06:00 and 12:00 CST, which is implausible, so the *wall clock* is the open input, not the URL. **Built on `events/publish-ics-feed`, 2026-11-04 (unmerged, D171-D174).** Exits met on this tree: `npm run check:ics` **can fail** — 13 rules, and `check:ics:selftest` plants 24 defects and catches 24 (both D72 traps, Mobilizon's `Z`-with-no-zone pattern, UID stability, DATE spans, VTIMEZONE offsets, artifact drift); `/events.ics` is prerendered from `data/events.json` (`dist/client/events.ics`, 3136 octets, 77 content lines) and both `check:ics` steps are in the deploy set; two builds in a row produce a byte-identical feed **including** `DTSTAMP`, because it derives from the committed `source.fetchedAt` and only moves when the harvest runs — stronger than the exit asked for; the two rows publish `TZID=America/Chicago` instants with a VTIMEZONE whose offsets the gate checks against the runtime tz database (D172/D174). Still needs inputs **1, 4, 5, 6** below, plus the preview-`curl` half of this exit, which needs the operator's grant to push `staging` (D124). |
| **A7** | The memory that travels: tracked `DECISIONS.index.md` + dangling-citation gate, tracked `MILESTONES.md` (this file), `check:figures` for measured numbers in `DESIGN.md`, gate-cost guard | `npm run check:decisions` and `check:figures` green inside `verify`; this file exists; cost guard prints against a baseline | **done, merged into local `staging` 2026-11-03** (unpushed) — the queue carried the review harness (D157) and D155–D164 with it |
| **A8** | Keeping a published calendar from going stale — M6's failure mode, **a silently stale schedule**: the harvest ritual, and a rule that says out loud when the snapshot holds nothing near | a ruling on **N** (how far ahead a date must exist) and on where the rule runs; then `npm run check:ics` FAILs below N with a message naming the command that fixes it (`node scripts/events-harvest.mjs`), plus an escape hatch for the gap between series | **open, parked 2026-11-04 with its trigger named.** The harvester exists and is dry-run by default; `check:ics` already *prints* the distance ("next is 2026-11-07 (3 day(s) away)") — prints are not gates. It un-parks itself: when both November rows pass (2026-11-12) the snapshot holds nothing upcoming and the landing schedule shows its empty state, which is the state this item exists to catch |
| **A9** | Mobilizon has no repeating events, so something has to make the next one: `integrations/mobilizon-cadence/` — an n8n workflow that reads the group's history, decides the next date for each of the two series, writes one `createEvent`, then re-reads the date to prove what it wrote (D175) | `node integrations/mobilizon-cadence/check.mjs` green (the artifact builds under its own invariants, 36 tests pass, and the live read-only plan agrees with the instance); **an n8n dry run prints the same two dates as `simulate.mjs`** (2026-11-21 and 2026-11-25 as measured 2026-11-04, Linux); the operator's ruling on the dedicated Mobilizon account, and `RUN.dryRun: false` + rebuild + re-import, close it | **built 2026-11-04 on `events/mobilizon-cadence-n8n`, unmerged, `dryRun: true` as shipped (D175–D180).** Nothing imported into n8n, no credential set, and cadence has never written an event. Four operator actions stand between here and a real write: set `MOBILIZON_EMAIL`/`MOBILIZON_PASSWORD` on the n8n host, import `n8n/cadence-workflow.json`, wire alerting to `21`/`22`, grant writes. Guide: `integrations/mobilizon-cadence/docs/operator-guide.md` |

### What A6 still needs from the operator (six inputs, as of 2026-11-03)

1. The series name: "MPLS Math Club - **Bimonthly** Social" carries the word D92 ruled out of our titles, and
   the pattern in the data says every two weeks. Proposed: `MPLS Math Club Social`, rhythm carried by the data.
   **Interim, on the branch:** the verbatim `SUMMARY` stays verbatim in the feed (a quotation, not our claim) and
   the page prints the row's own `series` field (`MPLS Math Club social`). The ruling still decides the published name.
2. ~~Which November dates and **wall-clock times** are real~~ — **answered 2026-11-04 (D174), veto still open.**
   The dates come from the feed; the hours come from the organizer's own entry (`.notes/roadmap-events.md`: 12:00 and
   18:00 typed, `120000Z`/`180000Z` answered) plus the event pages' meta descriptions as served 2026-11-04 ("Nov 7,
   2026, 12:00:00 PM - GMT"). Both rows now carry `timeConfirmed: true` and publish `-0600` instants; one boolean per
   row returns the honest all-day form if the operator says an hour is wrong.
   Kept, because it is the reason D172 exists: a wrong date is the costliest defect on this roadmap and a wrong *hour*
   is a close second — a pub-night event written as a UTC instant crosses midnight, and `upcoming()` then picks the
   wrong instance for "next".cond, because a pub-night event
   written as a UTC instant crosses midnight and the "next upcoming" comparison then picks the wrong instance.
3. ~~Harvest source~~ — **answered by fact, 2026-11-04**: the **group** feed
   (`/@minneapolis_math_book_group/feed/ics`) now returns the **same two `UID`s** the instance feed does (200, 2578
   bytes, `DTSTAMP:20261104T052417Z`), so there is no group-vs-instance choice to make. The earlier "0 VEVENTs" line
   in this table is stale and is corrected here (D169). What the feed does *not* give: a zone, or a recurrence rule.
4. Is the instance reachable from outside the LAN? A TLS handshake to the public address from inside the network
   does not prove it (NAT loopback). A phone on cellular settles it, and it decides whether a scheduled harvest
   can live in GitHub Actions or must live on the home server.
5. Whether `/schedule` returns as a page (its nav link is a dead fossil from D63), and whether RSVP back-flow
   stays out of scope.
6. When convenient: **cancel** an event and check whether the feed drops it or emits `STATUS:CANCELLED` — D72
   lists this as unverified upstream behaviour.

### Merge order for the branches awaiting a grant

**Re-measured 2026-11-04 — the previous version of this section was stale** (it listed `process/gates-that-remember`,
`pixels/one-ground-keylines`, `design/round12-art`, `pixels/hero-composition-r13` and round 14 as pending; all of them
are merged into local `staging`, which is itself still unpushed). Measured with
`git branch --no-merged staging` and `git merge-tree --write-tree --name-only staging <branch>` (D156: measure the
merge before proposing an order — a tree hash and no conflicts, no worktree change, no build):

| branch | item | merge into `staging` | what it costs |
|---|---|---|---|
| `events/publish-ics-feed` (6 commits) | **A6** — the event snapshot, `/events.ics`, `check:ics` + selftest, the harvester, the review `--no-events` mode, D171–D174 | **clean** (tree `44361ee8`) | two steps added to the deploy set (`check:ics` 0.15s, `check:ics:selftest` 0.26s) — deploy 13.9s → 17.1s (+23%), browser unchanged at 7 ok / 100.6s (+8%) |
| `docs/www-redirect-endstate` | docs/endstate notes | **clean** (tree `67ea36e0`, no conflict list) | prose only |

Order is therefore free: neither touches a file the other does. If both land, `verify` runs once on the result —
`events/publish-ics-feed` already ran green on its own head (`verify` 17 ok / 17.1s, `verify:browser` 7 ok / 100.6s).
Merging and any push stay the operator's (D66, D124).

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
