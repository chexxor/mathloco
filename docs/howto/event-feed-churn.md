# Runbook: the event feed moved (row gone, row back, wrong date, new art)

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/event-feed-churn.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

**Symptom:** "is this meetup still real", "the card has no image", "the schedule looks wrong",
"`check:ics` is green but the date is off", "the same event appeared twice", "a row left the feed",
"a carried row is dated in the past", "a `.ics` subscriber will keep a cancelled meetup".

> **Re-read on 2026-11-23 for the handoff era (**MS42**, **S092**, **D471**, **ADR-0010**).** This repository no
> longer fetches anything: `data/events.json` arrives as one commit from `social-event-publisher`
> (`docs/spec/event-data-handoff.md`), and the four fetchers this file told you to run are deleted. What still
> works is the diagnosis — the feed's churn, the UID-not-summary signature, the hand-authored cancellation, the
> art identity rule. What changed is **who performs the refresh**: the fetch is the publisher's act, and this
> repo's act is to read the handoff commit, rebuild, and deploy. A runbook that orders a fetch after MS42 is a
> bug in the runbook.

Written the day it happened, 2026-11-06 (Linux), from three live reads of the same URL inside one
session. D222/D223/D225 are the records; this file is the procedure.

## 0. Read the source before you say anything about it

```bash
curl -s -o /tmp/feed.ics -w 'http=%{http_code} bytes=%{size_download}\n' \
  https://mobilizon.labradorius.com/@minneapolis_math_book_group/feed/ics
grep -c 'BEGIN:VEVENT' /tmp/feed.ics
grep -E '^UID:' /tmp/feed.ics | sort          # UIDs, not summaries - see §2
grep -E '^(DTSTART|DTEND|DTSTAMP|SEQUENCE|STATUS|ATTACH|SUMMARY)' /tmp/feed.ics
grep -c TZID /tmp/feed.ics                    # shape claim: re-read, do not quote yesterday's
```

Fetch twice ~90s apart and `cmp` if you are about to call a shape stable. On 2026-11-06 the feed was
read three times and every read disagreed: 2,578 B / 2 rows (2026-11-04, bare `Z`, no `TZID`),
2,818 B / 2 rows (Nov 7 gone, Nov 21 under a new UID, `TZID=America/Chicago`), 4,184 B / 3 rows
(Nov 7 back under a **third** UID, end moved to 13:00). Any claim about the feed's **wire shape**
carries an expiry date — D169's "Z with no zone" defect stopped describing it in two days.

Mobilizon's event **pages** are an empty SPA shell (200, ~4.7 KB, no server-rendered `h1`/meta), so
the instance UI adds no confirmation. The feed is the contract (D73/D74).

## 1. Which claims are visible to a gate? None of the content ones.

`check:ics` (23 rules @measured 2026-11-23 by `npm run check:ics`, which prints the rule count) enforces
zone-on-instants, `DTSTAMP == source.fetchedAt`, UID shape, line folding, the **runway** (fails only when **no**
row sits within `RUNWAY_DAYS` = 21), the **stamp age** (`stale-snapshot`, **D471**: the file's single harvest
instant older than the same 21 days) and the `stalenessOkUntil` hatch. It never asks *is this row still true*. A
snapshot can publish a meetup the source dropped and stay green — that is what happened for 34 hours.

Before MS42 the ritual was the harvester's own read-only diff. There is no harvester here any more, so the ritual
is reading the handoff commit against the file it replaced:

```bash
git log --oneline -5 -- data/events.json     # the handoff commits, newest first
git show --stat HEAD -- data/events.json     # what the last one changed
node scripts/check-ics.mjs                   # what this repo's gate says about what arrived
```

A row that left the upstream feed is **not** deleted here (**D72**): the publisher carries it, and retiring it is
a hand-authored cancellation (§3) — which stays this repo's act, because the publisher refuses to invent a
retirement nobody authored (**MH-FR-011**, **D470**).

## 2. The signature to look for: a stable summary over a **changed UID**

Mobilizon 5.2.4 answers a date/time edit by **minting a new UID** and never raising the old row's
`SEQUENCE`. Diff `UID:` lines, not `SUMMARY:` lines — on 2026-11-06 the summary, venue and start time
were identical while the UID changed (`649bf59a…` -> `76a29f38…`). Consequences:

- a cancellation is **ours to author**, because the source will never send one;
- subscriber clients key on UID, so deleting a row leaves the old event in the calendar forever.

## 3. Authoring a cancellation (what no fetcher ever could do)

1. There is no `--write` to run any more (MS42). A cancellation is a **hand edit** to `data/events.json`, on the
   branch the publisher writes to, and it must survive the publisher's next run: the far side carries the rows it
   reads, so a cancellation this repo authors can be overwritten by a fresh read of a source that stopped
   announcing the row. Say so in the commit and check the next handoff commit for it.
2. Hand-edit `data/events.json` for the retired row: keep the old `uid`, set `"status": "CANCELLED"`,
   raise `"sequence": 1`, and re-stamp **both** `source.fetchedAt` and `source.dtstamp` on the *row*
   to the new top-level `fetchedAt`. `check:ics`'s `dtstamp` rule compares the row stamp to the
   top-level stamp; a stale row fails:
   `FAIL dtstamp: DTSTAMP 20261106T050028Z is not the harvest stamp 20261106T054603Z`.
3. Write `source.dtstamp` in **compact ICS form** (`20261106T054603Z`), not ISO (`2026-11-06T…Z`).
   ISO form also hid a time-derived UID from `uid-shape` (§5).
4. Slug collision: the **live** row keeps the natural slug (`2026-11-07-club-social`); the dead row gets
   the suffix (`2026-11-07-club-social-cancelled`). `upcomingEvents()` in `src/lib/events.mjs` drops
   `CANCELLED`, so the page shows one card while `/events.ics` still announces the retirement.
5. Add the provenance notes (`_status`, `_slug`, `_dtstamp`) so the next session can tell a hand edit
   from a field that arrived in a handoff commit.

Then:

```bash
npm run build && npm run check:ics && npm run check:ics:selftest
grep -c 'BEGIN:VEVENT' dist/client/events.ics
grep -E '^(UID:|STATUS:|DTSTART|SEQUENCE:)' dist/client/events.ics
```

## 4. Art: identity is the hash, not the filename or `?name=`

```bash
curl -s -o /tmp/x.png '<ATTACH url>' && sha256sum /tmp/x.png src/assets/photos/event-*.png
file /tmp/x.png                     # the ratio SLOT_ART needs, read off IHDR
```

- Two rows can share one poster: `event-2026-11-07-club-social.png` and
  `event-2026-11-21-club-social.png` are byte-identical (`1f54c290…`, 954x460). Renaming beat
  re-fetching once; when the same date is re-used, re-fetch and `cmp` (upstream can change).
- `SLOT_ART` in `src/components/Schedule.astro` has **no default ratio** (D168/D223): a default is a
  crop nobody ruled, and it was already false for the 1321x755 learning art. Each entry states its own
  file's `ratio`; a row with no entry paints **no box** (not a bug — D190).
- After adding an asset: `git status --porcelain --no-renames -- src/assets/photos/` **and**
  `git ls-files -s src/assets/photos/`. Every gate reads the worktree, so a green `verify` does not
  prove the PNG is committed, and rename detection can hide it.

## 5. When a selftest planting goes red

`check:ics:selftest` plants defects and fails if the gate says nothing. On 2026-11-06 it fired for a
real blind spot: `uid-shape`'s `/\d{14}/` cannot see a **glued ISO** timestamp, because the digits hide
behind `-` and `:`. The rule now strips punctuation:

```js
const TIME_SHAPE = /\d{14}|\d{8}T\d{6}Z?/;
if (TIME_SHAPE.test(u) || TIME_SHAPE.test(u.replace(/[-:]/g, '')))  // uid-shape
```

and a second planting (`iso-time-derived-UID`) covers the branch. 33 plantings, 0 undetected.
**Do not delete a failing planting** — fix the rule or anchor the planting. Same lesson one day earlier
(D220): `check:render:selftest` anchored on a `space-y-6` utility and broke when a spacing ruling
changed it; anchor on a stable handle (`data-art-cap="323"`).

## 6. Measure the page cost of a new row, do not extrapolate it

```bash
npm run build && npm run check:rhythm
git show HEAD:design/rhythm/report.json > /tmp/pre.json    # diff two tracked tables
```

Row cost is **that row's own plate plus its own blurb**: the second row cost +197px at 1240, the third
+316px (D224 correction). Two extra rows added ~500px of page and **0px** less empty run at
1440/1240/1024/640 — the empty *share* fell only because the denominator grew — while phones moved
the other way (-83px at 390, +24px at 320). The `edges`/`rows` drift guards must still read **0px/0px**.
`check:rhythm` and `check:space` refuse a stale `dist/` even for a note-only edit: `npm run build`
first (D144).

## 7. What is actually published where (say this before claiming anyone is misinformed)

```bash
git ls-tree -r --name-only main -- data src/lib/events.mjs src/components/Schedule.astro
curl -s -o /dev/null -w '%{http_code}\n' https://minneapolismathbookclub.com/schedule
curl -s -o /dev/null -w '%{http_code}\n' https://minneapolismathbookclub.com/events.ics
curl -s https://staging-minneapolis-math-book-club.chexxor.workers.dev/events.ics | grep -E '^(UID:|DTSTART)'
```

Measured 2026-11-06: `main` is 149 commits behind `staging` and has **no schedule feature**; the apex
and the production Worker answer **404** for `/schedule` and `/events.ics`. So the site is silent about
dates, and the only place a stale date ever published is the **Worker Preview**. A stale preview is a
real defect and not a member-facing incident — keep those separate in reports (D225 correction).

## 8. Cadence consequence for the operator

Every run of the publisher moves the top-level `fetchedAt`, and `dtstamp` forces every published `DTSTAMP` to
equal it, so **one handoff commit reads to every subscriber as an edit to every row** (**D225**). Cadence is
therefore still a product decision — it just belongs to the repository that fetches now. `harvest-cron-host.md`
keeps the measured option costs for hosting such a job; the job does not live here (MS42). A Worker cron is not
the answer for this repo — 10 ms CPU, **D150**. The runway and stamp-age gates only fire at build time, so they
are the backstop, not the schedule.
