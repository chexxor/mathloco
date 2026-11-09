# Milestones — the tracked projection of `.notes/PLAN.md` §Milestones

This is the part of the roadmap that survives a fresh clone. `.notes/` is gitignored, so `PLAN.md` is
host-local; this file is the mirror a bare checkout can read, and `npm run check:plan` fails if the two
disagree on a milestone id or a status. That is deliberate: a plan the tracked projection does not match is
a plan the other machine does not have (D151 is why every item states its exit criteria).

**Status vocabulary** (anything else fails the gate): `active`, `next`, `paused`, `queued`, `blocked`,
`closed`. A `paused` or `blocked` row must name the trigger that un-parks it — a deferral without a trigger
is not parked, it is lost (D148).

**Ids are stable.** `MS##` is never renumbered. The old queue ids map here, and a citation to an old id
still resolves.

| old id | became |
|---|---|
| A1, A2, A5, A7 | MS01's predecessors — closed work, listed under "Closed work" below |
| A3 (R6 rhythm), A4 (body leading) | closed: D214/D220, D224 |
| A6, A8 | MS05, MS06 (the feed publishes; freshness and the contract do not yet run unattended) |
| A9 (n8n cadence) | MS08, MS09, MS10 |
| A10, A12, A13, A14, A15 | closed: D227–D234, D235, D238, D239, D240–D243, D248 |
| A11 (harvest cadence) | MS05 |
| A16 (the cutover) | MS02 |
| A17 (the commissioned critique) | MS04 |
| A18 (round 17: the header ground, the duplicated copy) | MS03 |
| G1–G3, R7 | closed gates/rounds: D144, D145, D146, D141–D143 |

## Milestones

| MS## | milestone — what "done" looks like | exit gate (the command or ruling that proves it) | status |
|---|---|---|---|
| **MS01** | The planning system is live and machine-checked: `PLAN.md`, `QUESTIONS.md`, `SESSIONS.md`, a queue-free `NEXT.md`, and this projection | `npm run check:plan` and `check:plan:selftest` in the `verify` set, green; `NEXT.md` names the current MS and carries no queue; this table's statuses equal the plan's | **closed** — exit gate met 2026-11-09: `npm run verify` 27 ok / 0 failed with `check:plan` and `check:plan:selftest` green (13 plantings detected, control clean); the projection's statuses equal the plan's |
| **MS02** | The cutover: what this tree builds is what a stranger reads. `main` has not moved since 2026-10-30 and the newest production Worker version was created 2026-10-31T00:30:14Z, so 178 verified commits reach nobody (D245) | `npm run probe:live`: production's home title equals `dist/client/index.html`'s, `/schedule` and `/events.ics` answer **200 on both apexes** (cache-busted with a fresh query key), then `www` answers `301` to the apex with the query preserved, then the legacy apex's `/events.ics` answers `301` to the new feed, then the commit retiring the legacy route changes `check:deploy`'s declared trigger count in the same commit (D241); `npm run check:site-host` names one host (D261). **Ship step blocked until MS12 closes** (S017, D256) | **active** — the plan's current milestone. Its first step is the operator's merge of `qa/live-probe` (no conflicted paths, measured `git merge-tree` 2026-11-09): `probe:live` is not in this tree, so MS02's gate instrument lives on an unmerged branch |
| **MS03** | The header bar becomes chrome by decision, and the duplicated copy is settled. Measured (2026-11-08): the bar paints **no ground of its own** (layer contrast 1.00, OKLab distance 0); the inset rule ring paints **3.01**, `shadow-e2` **1.78** — the only structural device clearing the 1.35 layer bar — `shadow-e1` **1.25**, padding and a descriptor row **1.00**; sticky bars cover 2 boxes/48px at 1240, 1 box/72px at 390 (D251, D252, D253) | proof, not prose: the ruling recorded as an S-id; `npm run verify` green; `node design/grill/edge-probe.mjs` re-measures the chosen device against the 1.35 layer bar; `grep -c '"status": "open"' design/copy-duplicates.json` returns 0 | **closed** — applied 2026-11-09 under `S018`: the header is `bg-paper inset-shadow-rule` (ring 3.01 on paper, bar unchanged 1228x72, ground 1.00, re-measured on the shipped artifact — D262); the band's Meetup/chat twin and the homework line are deleted; the hero signpost became the syllabus line; the threads list kept its sourcing clause; sticky is parked with its trigger |
| **MS04** | The commissioned senior UX/content read of `/`, `/schedule`, `/events.ics` on the staging Preview | the critique lands in `.notes/SESSIONS.md` as eight numbered items, each quoting the string or markup it is about and classified deliberate choice or defect (a ruled item cites its D-id rather than re-litigating it), plus "what must be fixed before this replaces the live site" and a one-sentence verdict; `npm run check:plan` green, and each accepted item becomes a milestone row with a quoted string and a measurement | **queued** — its baseline is MS02's measured production state |
| **MS05** | Freshness runs unattended: something re-reads the club's calendar on a schedule, so a subscriber and the page cannot quietly disagree | the runner is a **Yunohost package** with a web GUI and maintenance docs (S017, D257), it runs the harvest daily, one audited run is recorded in `design/records/`, and the next harvest lands a reviewable commit. Until then the only detector is `check:ics`'s 21-day runway (D188), which asks *is a row near*, not *is that row still true* (D223) | **blocked** — trigger: the operator answers the letter's C-section (n8n workflow vs. systemd unit, and who registers the Mobilizon OAuth app). A bare systemd unit no longer satisfies this row (D257), and this seat has no shell on that host |
| **MS06** | The sources are described in one place before more code is written against them (gate G2) | `docs/spec/source-contract.md` exists and covers, per source — Mobilizon group feed, n8n, ntfy, Discord, Meetup: fields read, time semantics, what an edit does to a UID and SEQUENCE (D225: a date edit mints a new UID), who may correct a row, the disagreement rule | **queued** |
| **MS07** | The credential picture is written down before more credentials are minted | gate G3: `docs/threat-model.md` names every secret, its home, its blast radius, its rotation, and the rule that none is held or sent before the file exists | **queued** |
| **MS08** | The calendar of record is a decision on paper, not an accumulation of code (gate G4) | `docs/adr/0001-calendar-of-record.md`: the decision, the alternatives, the reversibility class, the revisit trigger — including the cross-publisher direction and its two collisions (a moved Mobilizon handle, D163's measured immutability; a date edit minting a new UID, D225) | **queued** |
| **MS09** | Payloads are proven offline before anything reaches a live account | gate G5: canned fixtures under `docs/fixtures/` plus a runner in `verify` that fails on any payload the contract forbids. The pattern already works: `check:ics:selftest` plants 33 defects and catches 33 | **queued** — blocks MS10 |
| **MS10** | The cadence writes, and is watched when it does not | the n8n job runs once with `RUN.dryRun: false`, then `node scripts/cadence-watch.mjs` reports the written rows (the re-read prints the date the plan chose); the error watcher is exercised with a planted failure before it is trusted, and a heartbeat check exists and has been seen firing | **blocked** — trigger: the operator sets `MOBILIZON_EMAIL`/`MOBILIZON_PASSWORD` and `NTFY_TOKEN` on the n8n host and grants the write; MS08 and MS09 must close first |
| **MS11** | The machinery is operated, not improvised | `CLAUDE_API_KEY` rotated and recorded (D58 — the Pages project that stored it is measured deleted; the key was never recorded as rotated); a token that can read zone DNS and rulesets minted, so the cutover's two numbers are read rather than inferred; a retry policy for the browser gate set so a probe that never posts is a retryable gap, not a crash | **queued** — `CLAUDE_API_KEY` **was** rotated on the live Worker 2026-11-09 (`npm run cf:secrets:list`, and the deploy log's "Updated secret: CLAUDE_API_KEY"); what is still owed is `npm run check:ai` green against it. The retry policy's un-park trigger is memory headroom (`free` above 40 GB available) |
| **MS12** | An RSVP page the site can defend: `/rsvp` names each upcoming event, links to that event's Meetup page, and prints attendance only as a dated snapshot | `npm run check:attendance` green and `node scripts/live-probe.mjs` shows `/rsvp` answering **200** with every count carrying its `asOf` date; MS02's ship step and the rebrand letter are blocked until this row closes (S017, D256) | **next** — it is the gate MS02's deploy waits on |

## Closed work, and the numbers that came out of it

Kept short; the reasoning is in `.notes/DECISIONS.md` and the artifacts in `design/`.

- **The art round and the hero plate (A1, A2)** — 13 public-domain plates drawn at the real slot sizes and
  measured for colour; the Byrne leaf cropped to the ruling (PS-1 option C: plate 376×307, 56% of the leaf,
  752×614 at 2x so a 3px hairline does not miss half-pixels). The horizon band of three whole leaves
  (`data-slot="PS-5"`) shipped as the composition ruling (D167, D168, record 0027): page **4284 → 3889 at
  1240**, **6173 → 5176 at 390** (the cut `feature` card was ~1000px of phone scroll), painted **5.33% →
  7.7%**, empty runs **9/1075px → 10/1215px** — the emptiness moved rather than closed, which became A3's
  number. PS-4 took the club's own event art capped at the slot's measured 323px (D190): renders 323×156 at
  1240 and 390, 256×123 at 320, uncropped. PS-2 stays parked for a venue photograph.
- **Rhythm (A3, R6, D214/D220)** — `rows` + `edges` taken, `band-sm` refused. Measured as a pair, not
  summed: 1440 4028 → 3708px (−320) and 1210 → 921px of empty run (−289); empty share 30.8% → 25.7%;
  painted 8.41% → 9.13%. Both now price at 0px in the sweep as drift guards.
- **Body leading (A4, D224)** — `body 17.6/24` (1.36 against the published 1.5 floor), measured as a whole-page
  re-run: 1240 3905px / 24.4% in 9 runs / 9.92% painted.
- **Keylines (A5, D154)** — one ground per keyline: 7 keylines, 3.01 on paper on both sides at all three
  widths, 0 straddles.
- **The feed (A6, D171–D188)** — `/events.ics` prerendered from `data/events.json`; `check:ics` is 15 rules
  and `check:ics:selftest` 33 plantings with 0 undetected; the runway is 21 days with a dated hatch field;
  two builds in a row produce a byte-identical feed including `DTSTAMP`.
- **Memory that travels (A7)** — `DECISIONS.index.md`, this file, `check:figures` for measured numbers in
  `DESIGN.md`, and the gate-cost guard.
- **The page split (A10, D227–D234)** — `/schedule` became a real page: homepage 4221 → 3180px at 1240
  (−24.7%), 5707 → 4725 at 390; `/schedule` is 1329px at 1240. Card and row at 1240 are both 1164×188 with a
  112×96 leaf, a 633×152 copy lane and a 323×156 plate.
- **The escape-sequence gate (A12, D235)** — `/schedule` painted the eight characters `club\u2019s` at every
  width through a green `verify`; `check:escapes` now reads built page text, `<meta>` and the attributes a
  screen reader speaks, plus the rendered-text context of every `.astro`/`.svelte` source, and its selftest
  plants the class in 13 shapes and holds 11 clean forms.
- **The schedule window (A13, D238)** — `HORIZON_WEEKS = 8`, `MAX_ROWS = 8`, one module the page and a gate
  both read, and the page says what it left out.
- **Join voice (A14, D239)** — the hero introduces the club, not the next date; the promise about how the
  room feels appears zero times in `dist/`; the empty-calendar state is verified by a planted all-CANCELLED
  snapshot, not by reading.
- **The rename (A15, D240–D243, D248)** — Matheapolis on every surface the site owns; the descriptor is one
  phrase in three slots ("Minneapolis math club"), which is what `check:copy` guards; the Meetup slug and
  the Mobilizon handle are asserted untouchable (`ORG_OF_RECORD`). Nav row measured at **217px** (was 176),
  so a `Schedule` nav item no longer fits at 320.
- **Gate and instrument work (G1–G3, D144–D146)** — a green gate run leaves every step's output on disk; a
  ground probe reads painted bytes; the width set measures the breakpoints `src/` actually uses.
- **Round 16 and round 17 measurement (D243, D251–D253)** — a display step can only be priced in a class the
  build emits; the header bar paints no ground; the Tailwind content scan reads the whole repo, and
  `check:css-utilities` reports the 94 utilities / 6,307 bytes / 12% of the stylesheet that no file in `src/`
  writes.

## What this file does not authorise

Nothing here authorises a merge or a push. `main`, `staging` → `main`, and every production deploy stay the
operator's (D42, D66, D124). Merging an approved item into `staging` needs the operator's grant; pushing
needs their hand.
