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
| **MS02** | The cutover: what this tree builds is what a stranger reads. `main` has not moved since 2026-10-30 and the newest production Worker version was created 2026-10-31T00:30:14Z, so 178 verified commits reach nobody (D245) | `npm run probe:live`: production's home title equals `dist/client/index.html`'s, `/schedule` and `/events.ics` answer **200 on both apexes** (cache-busted with a fresh query key), then `www` answers `301` to the apex with the query preserved, then the legacy apex's `/events.ics` answers `301` to the new feed, then the commit retiring the legacy route changes `check:deploy`'s declared trigger count in the same commit (D241); `npm run check:site-host` names one host (D261). **Ship step unblocked 2026-11-11 (S020)** — the per-event sign-up links MS12 required are in `verify` (S017, D256, re-gated by S019) | **blocked** — trigger: the operator pushes `staging` and moves `main` (D42, D124, S030); the tree itself is green. `qa/live-probe` merged into `staging` 2026-11-12 under ruling **A1**: the three conflicts (`AGENTS.md`, `DECISIONS.index.md`, `MILESTONES.md`) resolved by keeping `staging`'s rows and porting the branch's additions (`scripts/live-probe.mjs`, `scripts/check-tables.mjs`, `package.json`, `scripts/gate-run.mjs` merged clean) @measured 2026-11-12 by `git rev-list --count staging..qa/live-probe` = 0. `npm run probe:live` now runs from this tree |
| **MS03** | The header bar becomes chrome by decision, and the duplicated copy is settled. Measured (2026-11-08): the bar paints **no ground of its own** (layer contrast 1.00, OKLab distance 0); the inset rule ring paints **3.01**, `shadow-e2` **1.78** — the only structural device clearing the 1.35 layer bar — `shadow-e1` **1.25**, padding and a descriptor row **1.00**; sticky bars cover 2 boxes/48px at 1240, 1 box/72px at 390 (D251, D252, D253) | proof, not prose: the ruling recorded as an S-id; `npm run verify` green; `node design/grill/edge-probe.mjs` re-measures the chosen device against the 1.35 layer bar; `grep -c '"status": "open"' design/copy-duplicates.json` returns 0 | **closed** — applied 2026-11-09 under `S018`, superseded 2026-11-13 by **`S027`/`D295`** (operator ruling B1): the header now carries `inset-shadow-rule` and **no `bg-*` class**, so it is chrome by its ring alone (ring 3.01, layer contrast 1.00 @measured 2026-11-13 by `node design/round17.mjs --only shipped`; 5.00% of the 1240×72 band differs from the page ground — 2.78% ring, 2.22% ink @measured 2026-11-13 by `node design/header-band.mjs`); the band's Meetup/chat twin and the homework line are deleted; the hero signpost became the syllabus line; the threads list kept its sourcing clause; sticky is parked with its trigger |
| **MS04** | The commissioned senior UX/content read of `/`, `/schedule`, `/events.ics` on the staging Preview | the critique lands as eight numbered items, each quoting the string or markup it is about and classified deliberate choice or defect (a ruled item cites its D-id rather than re-litigating it), plus "what must be fixed before this replaces the live site" and a one-sentence verdict; `npm run check:plan` green, and each accepted item becomes a milestone row with a quoted string and a measurement | **closed** — exit gate met 2026-11-14: the read is answered item by item in the tracked `docs/reply-to-the-design-read-2026-11-14.md` (the working draft the audit ran against is `.notes/audit-response-2026-11-14.md`), and the accepted items became **MS15-MS19** with measurements — each one with a check in `scripts/gate-run.mjs`, not a probe that prints numbers (**S038**, **D314**). Opened 2026-11-13 under **S032**; parked the same day when the operator commissioned **MS14** (`/join`). The read used text and the repo, not pixels, so the five claims it marked **[check]** were measured here: 12.02 ink/paper, 4.82 gold on paper, 3.01 rule, 10.19 band text, 72 characters the widest prose line, 3.68 the old tab mark. The `preview:deploy` grant (D124) is no longer a blocker for the read; it is still the trigger for an *external* second opinion on the fixed artifact |
| **MS05** | Freshness runs unattended: something re-reads the club's calendar on a schedule, so a subscriber and the page cannot quietly disagree | the runner is a **Yunohost package** with a web GUI and maintenance docs (S017, D257), it runs the harvest daily, one audited run is recorded in `design/records/`, and the next harvest lands a reviewable commit. Until then the only detector is `check:ics`'s 21-day runway (D188), which asks *is a row near*, not *is that row still true* (D223) | **blocked** — trigger: the operator answers the letter's C-section (n8n workflow vs. systemd unit, and who registers the Mobilizon OAuth app). A bare systemd unit no longer satisfies this row (D257), and this seat has no shell on that host |
| **MS06** | The sources are described in one place before more code is written against them (gate G2) | `docs/spec/source-contract.md` exists and covers, per source — Mobilizon group feed, n8n, ntfy, Discord, Meetup: fields read, time semantics, what an edit does to a UID and SEQUENCE (D225: a date edit mints a new UID), who may correct a row, the disagreement rule | **queued** |
| **MS07** | The credential picture is written down before more credentials are minted | gate G3: `docs/threat-model.md` names every secret, its home, its blast radius, its rotation, and the rule that none is held or sent before the file exists | **queued** |
| **MS08** | The calendar of record is a decision on paper, not an accumulation of code (gate G4) | `docs/adr/0001-calendar-of-record.md`: the decision, the alternatives, the reversibility class, the revisit trigger — including the cross-publisher direction and its two collisions (a moved Mobilizon handle, D163's measured immutability; a date edit minting a new UID, D225) | **queued** |
| **MS09** | Payloads are proven offline before anything reaches a live account | gate G5: canned fixtures under `docs/fixtures/` plus a runner in `verify` that fails on any payload the contract forbids. The pattern already works: `check:ics:selftest` plants 33 defects and catches 33 | **queued** — blocks MS10 |
| **MS10** | The cadence writes, and is watched when it does not | the n8n job runs once with `RUN.dryRun: false`, then `node scripts/cadence-watch.mjs` reports the written rows (the re-read prints the date the plan chose); the error watcher is exercised with a planted failure before it is trusted, and a heartbeat check exists and has been seen firing | **blocked** — trigger: the operator sets `MOBILIZON_EMAIL`/`MOBILIZON_PASSWORD` and `NTFY_TOKEN` on the n8n host and grants the write; MS08 and MS09 must close first |
| **MS11** | The machinery is operated, not improvised | `CLAUDE_API_KEY` rotated and recorded (D58 — the Pages project that stored it is measured deleted; the key was never recorded as rotated); a token that can read zone DNS and rulesets minted, so the cutover's two numbers are read rather than inferred; a retry policy for the browser gate set so a probe that never posts is a retryable gap, not a crash | **queued** — `CLAUDE_API_KEY` **was** rotated on the live Worker 2026-11-09 (`npm run cf:secrets:list`, and the deploy log's "Updated secret: CLAUDE_API_KEY"); what is still owed is `npm run check:ai` green against it. The retry policy's un-park trigger is memory headroom (`free` above 40 GB available) |
| **MS12** | Sign-up is one click from every date the site prints: each `/schedule` row and the homepage next-date card links to **that event's own** Meetup page, Discord, and the club's Facebook group (S021); the cluster is a server-rendered island, so the platform a visitor keeps opening leads every later cluster (S022); a date with no sign-up page says so and offers the group join link. No headcount is printed anywhere (S019, D265) | `npm run check:rsvp` (Meetup snapshot age + URL shape, and the `PROBE_BLIND_KEYS` rule for `facebookGroup`) and `npm run check:rsvp-page` (every link printed on the built `/` and `/schedule` equals the resolver's answer for that date; every printed date is an open Mobilizon row; no count from `data/meetup-events.json` reaches the artifact; every cluster is inside the island whose chunk carries the preference key) green in `npm run verify`, plus `check:render` measuring the new control, plus `check:rsvp-preference` and its selftest in `npm run verify:browser` (D123), plus `check:rsvp-promise` and `check:rsvp-promise:selftest` (8 plantings + a clean control), which compare this row's own platform names with what `src/config.json` declares and with every `data-rsvp-platform` the built pages paint (S024, D287). MS02's ship step and the rebrand letter were blocked until this row closed (S017, D256, re-gated by S019) | **closed** — exit gate met 2026-11-11, re-gated 2026-11-12 (S021, S022, S024) and re-gated 2026-11-13 with the platform marks in (S026, D294): `check:rsvp` (50 cases), `check:rsvp-page:selftest` (43 cases, 42 plantings + clean control), `check:rsvp-promise:selftest` (9 cases) and `check:render:selftest` (24 mutations, 4 of them the marks) green @measured 2026-11-13 by `npm run check:rsvp:selftest`, `npm run check:rsvp-page:selftest`, `npm run check:rsvp-promise:selftest` and `npm run check:render:selftest`; `check:rsvp-page` plus `check:rsvp-promise` green against the built artifact: `/` paints 1 date / 1 cluster / **3** links and `/schedule` **5** dates / **5** clusters / **15** links — the schedule window prints **5** open dates @measured 2026-11-13 by `node scripts/check-schedule-window.mjs` (5 of 5 open rows, cap 8, 0 hidden), no headcount in the painted bytes; `check:render:dist` measures the cluster **32px** tall at 1240 on both surfaces and at 640 on `/schedule`, **68px** at 640 on the homepage card, **104px** at 390 and 320 on both, three labels at **13.3px** / **12.02** contrast @measured 2026-11-13 by `npm run check:render:dist` |
| **MS13** | The type surface a visitor actually runs is checked by a tool that can read it: every `.svelte` island and the TypeScript it reaches is type-checked inside `verify`, CI and the deploy hook — not left to whichever editor happens to have the Svelte LSP open | `npm run check:svelte` and `npm run check:svelte:selftest` (7 planted defect classes + 1 clean control, checked in one fixture run) green in `npm run verify`, and both listed by `node scripts/gate-run.mjs --list` (`S025`, D288) | **closed** — exit gate met 2026-11-12 @measured by `npm run verify`: **38 ok / 0 failed**, with `check:svelte` **6.43 s** and its selftest **2.77 s** inside a set whose max is `check` (`astro check`) at **22.54 s**, so the wall does not move; the one real error the sweep found in shipped UI — `src/components/DiscordSummary.svelte:51:15 ts(18047) 'data' is possibly 'null'` — is fixed and the gate reports **0 errors, 0 warnings** across **1699 files** @measured 2026-11-13 by `npm run check:svelte` |
| **MS14** | The homepage's one join action has a destination: `/join` is organized by the kinds of relationship the club actually offers — follow it (social: Meetup group, Facebook group), come to a specific meeting (rsvp: Meetup's per-date pages through `/schedule`), talk with us now (chat: Discord invite) — each group naming the platform that delivers it and what it gets the visitor, with the channel list as data so a second rsvp platform (Eventbrite) or a future dimension for other groups (MAA/AMS/SIAM) is added without a rewrite (S033, D303) | the built `/join` prints exactly `joinChannels()`: every channel's URL matches its platform's `LINK_SHAPES` entry and carries a stamp inside 60 days (or S021's human confirmation for `facebookGroup`), no channel dropped or invented, no heading for an empty kind — asserted by a gate with plantings and a clean control in `verify`, `design/gate-cost.json` re-frozen in the same commit; the homepage's primary carries `href="/join"` with its label and 48px geometry unchanged (`check:render:dist`); `/join` prints no date and `/schedule` is the only surface that prints one (D306 removed the homepage's next-date band and its cluster), asserted by `check:join`'s `join-date-painted`, `check:rsvp-page`'s homepage `dates: false` rule and `check:dated-surfaces`, which fails any page that starts printing a date without a ruling naming it; the nav carries the join page as its third label — `Dates · Chat · Ways in` (S034, D308) — and `check:render:dist` reports the row needing 257 of the 276px the 320 floor offers; every emitted page closes with the exit band, asserted by `check:page-exit` (D307); every claim traces to a source, so `check:content` is green | **active** — opened 2026-11-13 on the operator's instruction (one join action on the homepage, pointing at a page that gives the options); positioning in S033/D303, the two future dimensions parked with triggers |
| **MS15** | One name per page: the nav label, the `<title>`, the exit-band label and the page's own opening block agree, and the aliases the copy uses are counted rather than hidden (D309, S035) | `npm run check:naming` green against the built artifact (**5 pages, 0 FAILs**, alias census `/schedule` 6, `/chat` 4, `/join` 3, `/` 3) and `npm run check:naming:selftest` (**15 cases, 0 wrong**) both in `verify` @measured 2026-11-14 by `node scripts/check-naming.mjs --selftest`; the row carrying the labels still fits — `check:render:dist` reports **257 needed of 276** at the 320 floor @measured 2026-11-14 | **closed** — exit gate met 2026-11-14 with the band label (`Schedule` → `Dates`) and the `/schedule` eyebrow (`The calendar` → `Dates`) in the same commit as the gate. Parked with a trigger: `/schedule` → `/dates` needs the operator's letter, because `check:dated-surfaces`' RULED set, `check:ics`, the sitemap and the runbooks all name `/schedule` |
| **MS16** | The tab mark is the club's mark and the ratified palette at 16px: `public/favicon.svg` painted only from tokens, clearing the contrast bar, with a gate that can fail (D310, S035) | `npm run check:favicon` PASS — every fill a token, at most two colours, pair ≥ 4.5, no reserved `--color-path-*` hue — on **#203927 / #fcfaf6, 12.02** @measured 2026-11-14 by `node scripts/check-favicon.mjs`; `npm run check:favicon:selftest` **10 cases, 0 wrong** @measured 2026-11-14; both in `verify` | **closed** — exit gate met 2026-11-14: the mark shipped Tailwind's default `#3b82f6` with a `white` glyph (**3.68**, under the 4.5 bar) since the Init commit; ink on paper now, and the gate that caught it is in the deploy set |
| **MS17** | The nav carries the next date as chrome inside the `Dates` link, audited so it cannot disagree with the page of record (the read's item 2a; D311, S036) | `check:dated-surfaces` (**15-case selftest, 0 wrong**) fails a nav date that is not the first date `/schedule` prints, one written as bare prose, one on an element that is not the chip, and a chip on an empty calendar @measured 2026-11-14 by `node scripts/check-dated-surfaces.mjs --selftest`; `check:render:dist` measures **311 of 1164** at 1240 and **257 of 276** at the 320 floor where the chip is `hidden sm:inline` @measured 2026-11-14 | **closed** — exit gate met 2026-11-14. Parked with a trigger: the date on the mobile row needs a label set that frees more than 54px |
| **MS18** | `alt` says what the picture shows, the caption says where it came from, no alt runs past 18 words (the read's item 5; D312) | `npm run check:alt` (**9 alts, 4 pages, longest 16 words**) and `check:alt:selftest` (**9 cases, 0 wrong**) in `verify` @measured 2026-11-14; before the fix the hero alt was **29** words and the plates **30/28/32** @measured 2026-11-14 by `node -e "const s=require('child_process').execSync('git show HEAD:src/components/HorizonBand.astro').toString();console.log([...s.matchAll(/alt: '([^']*)'/g).map(m=>m[1].split(' ').length).join(' / ')))"` | **closed** — exit gate met 2026-11-14 with `figcaption` provenance on the hero and the three plates. Deliberately open: the seven event thumbs keep an honest role alt, because this seat cannot see the pixels (D92). Trigger: the operator names the descriptions or rules the art decorative |
| **MS19** | A schedule row is three zones — date rail, copy zone, plate — and its prose is capped at the measure (the read's item 4; D313) | `npm run check:row-geometry` green (**5 rows on 1 page**, each `data-head` + `data-copy-prose` with `max-w-measure` + cluster + plate, in order) and `check:row-geometry:selftest` **11 cases, 0 wrong**, both in `verify` @measured 2026-11-14; `node design/schedule-geometry.mjs --routes /schedule --widths 1240 1024 900 768 640 390 320` @measured 2026-11-14 (1240 `1164x196 / 1164x217`, copy `633x164`; 320 `276x570 / 276x616`, copy `244x293 / 244x317`); `node design/line-length.mjs /schedule 1240 1024 640 320 --no-build` prints **58** characters on the longest line inside the 512px cap at 1240; at 320 the lane is 244px and its longest line is **36** @measured 2026-11-14 | **closed** — exit gate met 2026-11-14 with the detector wired in the same commit (D314, S038); the date-in-the-rail alternative was measured and rejected (copy lane 291px at 1024 against a 323px plate) |

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
- **The sign-up cluster (MS12, S019, D265, D272-D277, S026/D294)** — every date the site prints carries its own
  sign-up cluster on the row that prints it: **Meetup first, Discord second, Facebook third** (S021, D280 —
  Facebook is probe-blind, so it is gated on URL shape plus a dated, named human confirmation rather than a
  status code). Labels name the platform and the verb — "Sign up on Meetup", "Join the Discord chat", "Join the
  Facebook group" — and there is no lead-in line. The cluster is **32px** tall at 1240 on both surfaces, **68px**
  at 640 on both (Facebook drops to its own line on a 532px lane), and **104px** at 390 and 320 on both surfaces,
  where the labels take their own lines
  (@measured 2026-11-13 by `npm run check:render:dist`, 4 routes × 4 widths, five rows on `/schedule`). It adds
  **+40px** to the homepage card at 1240 and **+76/+44/+44/+80/+116/+116px** at 1024/900/768/640/390/320; on a
  `/schedule` row it is **+40px** at 1240 and **+88/+116px** at 390/320, and **0** at 1024, 900, 768 and 640, where
  the plate rather than the lane is the tallest thing in the box
  (@measured 2026-11-13 by `node design/grill/strip-clusters.mjs` then `node design/schedule-geometry.mjs --dist .design/tmp-no-cluster`).
  Each label carries the platform's own glyph, drawn **once per page** in a sprite emitted by
  `src/components/SignUpLinks.astro` only for pages that claim a cluster, painted in `currentColor` (S026, D294):
  the sprite is 4,307 raw / 1,892 gzip and costs **+2,195 gzip** on the one-cluster `/` and **+2,207** on the
  five-cluster `/schedule`; inlining the three glyphs costs **+2,118** and **+2,305** — the sprite is **77 gzip**
  dearer on the homepage and **98 gzip** cheaper on the schedule. Repeating one cluster 1-8 times on a mark-stripped
  copy finds the crossover at **three clusters** (sprite 2,488 vs inline 2,522 gzip on a homepage-shaped page; at
  six, 2,566 vs 2,735) (@measured 2026-11-13 by `node design/mark-cost.mjs`; D294's "breaks even at two clusters"
  is superseded by D300). Five gates
  hold it: `check:rsvp` (snapshot age, URL shape, a 60-day stamp on every platform URL), `check:rsvp-page` (the
  painted cluster equals the resolver's answer for that date; no count reaches the artifact; every glyph the
  cluster points at is in the page's sprite), `check:rsvp-promise` (the row's named platforms == `src/config.json`
  == the `data-rsvp-platform` attributes the pages paint), `check:render` (the mark is 16px, drawn in the
  label's own colour, pointing at a symbol the sprite has), and `check:sprite-claim` (the sprite is claimed once per
  render off `Astro.locals`, never off the path, and only by the component that paints a mark — never by the
  layout; it also runs the claim's arithmetic: one sprite per render, a fresh one for a fresh render, no render
  skipped) (S026, D297); the multi-cluster case, which no live route printed when it was measured, was proven on a
  fixture page rendering the cluster twice: 3 defs + 6 refs on three requests in a row (@measured 2026-11-13 by
  `node design/sprite-claim.mjs`; `/schedule` now prints five clusters, so the case is live). Their selftests run 50, 43 (42 plantings + a clean
  control) and 9 cases, the render selftest 24 mutations, 4 of them about the marks, and the sprite-claim selftest
  6 plantings plus a clean control
  (@measured 2026-11-13 by `node scripts/check-rsvp.mjs --selftest`, `node scripts/check-rsvp-page.mjs --selftest`, `node scripts/check-rsvp-promise.mjs --selftest`, `node design/render-gate-selftest.mjs` and `node scripts/check-sprite-claim.mjs --selftest`).
  Meetup snapshot: 26 records read 2026-11-09, 16 open pages. Discord: the guild lists **0** scheduled events
  (@measured 2026-11-13 by `node scripts/discord-events.mjs`) while the committed mirror carries one read
  2026-11-11; under S031/D293 the mirror is a dated, human-authored record the build never fetches, so
  `check:rsvp`'s age rule is what keeps it honest.
- **Round 16 and round 17 measurement (D243, D251–D253)** — a display step can only be priced in a class the
  build emits; the header bar paints no ground; the Tailwind content scan reads the whole repo, and
  `check:css-utilities` reports the 92 utilities / 6,253 bytes / 12% of the stylesheet that no file in `src/`
  writes (@measured 2026-11-13; the 2026-11-09 baseline of 94 / 6,269 b is what the gate compares against,
  and `collapse` and `sticky` have since gone).

## What this file does not authorise

Nothing here authorises a merge or a push. `main`, `staging` → `main`, and every production deploy stay the
operator's (D42, D66, D124). Merging an approved item into `staging` needs the operator's grant; pushing
needs their hand.
