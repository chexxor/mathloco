# Event-data handoff — the file arrives; this repo reads it

The page that says **who writes `data/events.json`**, and what this repository may and may not do about it. It
sits beside `docs/spec/source-contract.md` (gate **G2**) and narrows one thing that file used to state: the
snapshot used to be written by a harvester run inside this repo. It is not any more.

One upstream project — `chexxor/social-event-publisher` — reads the club's platforms, decides what is published,
and puts the result into **this** repository as **one commit to one path**. This repository reads whatever that
path holds at the branch it builds from. Nothing here fetches a platform for event data, and **a gate that tells
a reader to fetch one is a defect in the gate**, not a instruction to the reader.

The far side owns the shape. Its contract is **`mathloco-sink.md`** in the `social-event-publisher` repository,
under that repository's own spec home, **v1.6 (2026-11-18)** with **ADR-0017** in that tree; its requirement ids
(`MH-FR-###`) are cited here rather than restated — a rule copied twice is a rule that drifts. Where the two
documents disagree about what this repo's build actually reads, **this repo's gate is the truth**: the far side
says so in its own closing paragraph, and the fixture section below is the test that turns a disagreement into a
red build instead of an argument.

## The path, the branch, and who deploys

| Claim | The rule | Whose call |
|---|---|---|
| The path | `data/events.json` — one file, one path; the sink refuses any other path, including one resolving outside `data/` | `MH-FR-003` |
| Branch during the testing period | **`staging`** | the operator, 2026-11-23 |
| Branch once it works | **`main`** | the operator, 2026-11-23 |
| A config that names no branch | the sink refuses and names the key; the branch is never defaulted, because `main` is what the site builds from and `staging` is the review branch | `MH-FR-002` |
| Commits per run | at most one; a run that would need two stops and reports | `MH-FR-016` |
| What a push buys here | a gate run, not a deploy — CI runs `npm run verify` on a push to `main` or `staging` and holds no Cloudflare credentials (`.github/workflows/ci.yml`) | this repo |
| Who deploys | the operator, from this workspace, via `npm run deploy`, which runs `verify` before any `wrangler` command | `AGENTS.md` §Non-negotiables, **D42** |

The consequence a session must not miss: **a handoff commit changes what a visitor sees only when this repo is
next built and deployed.** A green CI on a handoff commit means the file is shaped correctly. It does not mean
the new date is live, and it does not mean the old date was ever live anywhere else — the site has exactly one
event input, `src/lib/events.mjs`, and it reads the tracked file at build time.

## The shape, as this repo's own gate holds it

Top-level keys this repo accepts are `calendar`, `source`, `events`, `stalenessOkUntil`, `superseded`, and any
key beginning with `_` (`SNAPSHOT_KEYS` at `scripts/check-ics.mjs:109`, enforced by the `snapshot-keys` rule).
What the committed file actually carries @measured 2026-11-23 by `node -e` over `data/events.json` (Linux
native, Node 24.22.1): `_rule`, `calendar`, `_dropped`, `_runway`, `events`, `source`, `superseded` — three
top-level prose keys, all `_`-prefixed, all written by a human in this repo.

| Key | Required here by | Who authors it | What this repo does with it |
|---|---|---|---|
| `calendar` | `prodid` and `vtimezone` rules | carried from the file at the branch head; the publisher claims no `prodid` or timezone | `src/lib/ics.mjs` renders the feed from it |
| `source` | `url` and `fetchedAt` | the publisher authors `kind`, `url`, `fetchedAt`; everything else in the object travels byte-for-byte from the head (`MH-FR-026`) | the feed's provenance line, and the stamp every row's `DTSTAMP` must equal |
| `events` | every row rule | the publisher's rows, ordered by `start` then `uid` (`MH-FR-010`) | one array, two windows: `src/lib/event-window.mjs` splits it into upcoming and past at build time |
| `stalenessOkUntil` | optional | **this repo only** — a hatch is an explicit grant that a short runway is fine, and the publisher refuses to invent one (`MH-FR-011`) | the `runway` rule's hatch, and §"When a check goes red now" turns on it |
| `superseded` | demanded equal to the drop list the grouping produces (`superseded-log`) | computed by the publisher over the rows it writes | a record, checked against the renderer's own decision on every build |
| `_`-prefixed keys | allowed at the top level only | **this repo** — prose a reader wrote, never a field of the publisher's | carried byte-for-byte; nothing in this repo regenerates them |

**There is no `version` field in the file.** The version is a section of the far side's contract, and a version
maintained inside the data would be a second oracle no test can fail — which is also why `snapshot-keys` refuses
an unknown top-level key rather than tolerating one.

A row's fields are the sixteen named at `scripts/check-ics.mjs:352` — `uid`, `slug`, `summary`, `series`,
`seriesNote`, `start`, `end`, `timeConfirmed`, `venue`, `geo`, `blurb`, `url`, `image`, `sequence`, `status`,
`source` — and the seven the gate requires are `uid`, `slug`, `summary`, `status`, a non-negative integer
`sequence`, `source.feed` and `source.fetchedAt` (`:343`–`:347`). A row key beginning with `_` is prose and
passes; the committed rows carry `_summary`, `_series`, `_times`, `_reissues`, `_image`, `_status`, `_slug` and
`_dtstamp` alongside their fields @measured 2026-11-23 by the same probe. A field outside the sixteen fails
`sourced-rows` on this side and is refused before a byte is sent on that side (`MH-FR-005`), so a new field is a
change to **both** repositories — see the request section for what this repo will ask for and how it will not
smuggle it in.

## One harvest stamp, and why a moving one is a defect

The file carries **one** harvest instant, and every row it carries names that same instant in
`source.fetchedAt` (`MH-FR-023`). The shape is `YYYY-MM-DDTHH:MM:SSZ` with no fraction: a fraction is cut rather
than carried, because `src/lib/ics.mjs` throws at anything else inside the renderer, which would kill a build
before any validator could name a rule (`MH-FR-022`).

This repo already enforces the equality — the `dtstamp` rule compares each row's `DTSTAMP` with the file's stamp
— and the reason is not tidiness. A stamp that moves between builds re-notifies every subscriber that already
holds the feed, on every deploy. That is the same harm **D72** and **D225** exist to prevent, arriving through a
different door.

## A finished row travels; the gate that used to refuse it was wrong

The publisher carries a row that has finished rather than deleting it, and carries its `status`, because deleting
a row un-announces a date to every subscriber that already holds it (`MH-FR-012`; **D72** says the same thing
from this side). This repo's `check:ics` used to fail exactly that row: `stale-live-row` fired on a past-dated
`CONFIRMED` row and told the reader to re-run the harvester. Under the handoff that rule enforces a fetch-era
assumption — that this repo can and should re-read the platform — and it fires on a file that is correct.

The re-ruled rule, and the reasoning with its alternatives, is **D471**. What survives is the part that protects
a subscriber: a file whose single harvest stamp has run past its `stalenessOkUntil` hatch is a file nobody has
refreshed, and that still fails by name. A carried finished date does not.

## The two vendor fixtures are a test in this tree, not a sample

The far side's standard ships two files, and both were vendored into this repository on 2026-11-18 (one Contents
API commit each, `ADR-0017`'s amendment):

| File | What it is | What this repo must do with it |
|---|---|---|
| `data/fixtures/mathloco-snapshot.json` | the standard's shape, as its own suite pins it | must **pass** this repo's shape check |
| `data/fixtures/mathloco-snapshot-misshapen.json` | the same file with the shape broken on purpose | must **fail**, with the findings named |

A copy of a vendor's fixture is not a publication and does not make `data/events.json` two paths (`MH-FR-003`
still names one). What it buys is the differential: if the far side's standard and this repo's gate ever stop
agreeing, a build goes red in both repositories rather than one team discovering it in production. The
`@measured` blob ids the far side records for the two copies are `bc52bf4b3feea80896ea88b206c5d118a393aaf8` and
`442abd71b8ba6396773e967a0a5edbdfadb60e64`.

**The differential runs on every build.** `npm run check:handoff` (`scripts/check-handoff.mjs`, in the deploy set)
imports the rule set from `scripts/check-ics.mjs` — it does not copy it — and runs it over three files: the real
`data/events.json`, the standard's fixture, and the broken one. The standard's fixture must produce **0** findings,
the broken one must produce a finding naming **each** of its planted defects, and both blob ids are pinned in the
gate, so a fixture edited in this tree stops being the far side's test file and starts being a failure. Three of
`check:ics`'s rules are not run on the fixtures: `artifact` (a fixture has no shipped bytes) and `runway` plus
`stale-snapshot` (they read the wall clock, and a fixture's dates are frozen at vendoring time — its hatch expires
2026-12-01 — so running them would turn the gate red over a file nobody touched, which is the date-rot class
`D192` names). `check:handoff:selftest` plants the ways the **differential itself** goes quiet: repair one defect
in the broken file, swap it for a clean one, break the standard's file, break the published file, edit a fixture's
bytes.

@measured 2026-11-23 by `node scripts/check-handoff.mjs` (Linux native, Node 24.22.1): `data/events.json` **0**
findings, `mathloco-snapshot.json` **0** findings, `mathloco-snapshot-misshapen.json` **19** findings with all
**6** planted defects named (`renderable`, `sourced-rows` ×2, `raw-upstream-instant` ×2, `superseded-log`); the
selftest is **10 cases, 0 wrong**; the step costs **0.19s** and its selftest **0.43s**.

**What the differential caught on its first run, in this repository.** `check:ics`'s `uid-shape` rule read the
vendor fixture's zero-padded UUIDs (`00000000-0000-4000-8000-000000000006`) as time-derived, because stripping
punctuation leaves a 32-digit run and the rule tests for a 14-digit one. The fixture is the standard's canonical
shape, so the fixture was right and this repo's rule was wrong: a false positive that would have failed every
future fixture and every handoff row the publisher keys that way. Fixed the same day by exempting the 8-4-4-4-12
hex form from the digit-run test only — the three shapes the rule exists to catch (`20261105002000`,
`20261105T002000Z`, `2026-11-06T05:00:28Z`) are not UUID-shaped, and `check:ics:selftest` still reports **50
plantings, 0 undetected** after the change.

## What a built page renders today, and what the standard carries

The claim "nothing a visitor sees today is lost" cannot be made by reading `src/`: a field can be imported and
never painted, and a link can be painted from a file nobody thinks of as an event input. So the probe is
`design/event-field-parity.mjs` — it reads the **artifact** (`dist/client`, the built pages and the built
`/events.ics`) and answers, per field and per link, where the bytes came from. Its machine-readable output is
`design/event-field-parity.json`.

@measured 2026-11-23 by `node design/event-field-parity.mjs` over a fresh `npm run build` (Linux native, Node
24.22.1): **6** built pages, **8** snapshot rows, **7** published VEVENTs, **12** distinct external hrefs,
**4** of them per-date platform pages, and **6 of 7** VEVENTs whose `URL` property is a per-date platform page.

| Fact a surface shows | Where it appears today | What supplies it today | The standard's field | Verdict |
|---|---|---|---|---|
| the date | `/dates`, `/past`, the home row | `events.json` `start` | `start` | carried |
| the hour, and "time not set" | `/dates` | `start` + `timeConfirmed` (`displayTime` in `src/lib/event-item.mjs`) | `start`, `timeConfirmed` | carried |
| the end of the span | the feed only | `end` | `end` | carried |
| the venue line | `/dates` (page) and `LOCATION` (feed) | `venue.name/street/city`, `venue.raw` | `venue` | carried |
| the coordinates | `GEO` in the feed only | `geo` | `geo` | carried |
| the row art | `ATTACH` in the feed only | `image` | `image` | carried |
| the organizer's own description | nowhere — deliberately | `blurb` is **not** published (**D319**: the feed's body is authored in `src/lib/event-description.mjs`) | `blurb` | carried, and refused on purpose |
| the format word under the title | `/dates` | `seriesNote` (0 of 8 rows carry one today, so the slot is empty, not missing) | `seriesNote` | carried |
| the organizer's series name | nowhere | `series` — the page prints the club's own word via `publishedName` (**D339**) | `series` | carried, not painted |
| "Cancelled" | the feed's `STATUS` only | `status` | `status` | carried |
| the row heading | `/dates`, `/past`, `SUMMARY` | `summary` through `publishedName` | `summary` | carried |
| `uid`, `sequence`, `source` | the feed (`UID`, `SEQUENCE`) | same fields | carried | carried |
| **a link to the event on each platform it is published on** | **4 links across `/dates` and `/`, and 6 of 7 feed `URL` properties** | **`data/meetup-events.json`** (and `data/discord-events.json`, whose one row is expired) | **there is no such field** — the row carries one `url`, and it is the Mobilizon page | **missing on both sides** |

Two things that table settles, and neither is a guess:

1. **The row's own `url` reaches no page.** It appears in the feed for exactly **1 of 7** VEVENTs — the other
   **6** publish the per-date Meetup page, because `src/lib/ics.mjs:203` publishes `own ?? row.url` and `own` is
   `feedUrl(row, MEETUP_EVENTS)`. So the feed carries the same dependency the page does; this is not only a
   link-in-the-UI question.
2. **The per-date links come from a file this item deletes.** `signUpPaths()` in `src/lib/rsvp.mjs:440` matches a
   date+hour against `data/meetup-events.json` and `data/discord-events.json`; when nothing matches it falls back
   to the standing group URLs in `src/config.json` (`meetupGroup`, `discordInvite`, `facebookGroup`). Retiring
   those two files therefore costs **4 of the 5 dates painted on a page** their per-date link, and leaves every
   date with the standing group link instead. That fallback is already written and already ruled on
   (`docs/spec/source-contract.md` §1: a date only on Meetup is printed as booked, not confirmed).

The same two files are read by `scripts/check-rsvp-page.mjs`, `scripts/check-rsvp-preference.mjs` and
`scripts/check-ics.mjs` (`:41`, `feedUrl`), so retiring them re-rules three gates, not one. That is named here so
the gate work is scheduled rather than discovered.

## The change request: a per-platform link set

This is a request to `social-event-publisher`, written here rather than invented in this repository's copy of the
schema. The operator's words when the item was ruled: "in the ideal state, we have a link to the event for each
platform that the event is published on." Today the standard cannot express that, and neither can this repo's
gate — the row whitelist is sixteen fields and `url` is one string.

**What is asked for.** One added row field, an array, ordered, with a closed platform vocabulary:

```json
"links": [
  { "platform": "mobilizon", "url": "https://mobilizon.labradorius.com/events/bccd6c33-…" },
  { "platform": "meetup",    "url": "https://www.meetup.com/minneapolis-mathematics-book-club/events/317306783/", "seenAt": "2026-11-09T06:42:38Z", "open": true }
]
```

**The rules the field has to obey, and why each one is there.**

| Rule | Why |
|---|---|
| `platform` is a closed vocabulary this repo names (`meetup`, `discord`, `facebook`, `mobilizon`) | an open vocabulary means a fifth platform appears as a link with no label, no shape check and no `sr-only` qualifier (`newTabQualifier`, **D273**) |
| each `url` matches the shape its platform can have | this repo already refuses a wrong-shaped URL: `LINK_SHAPES` in `src/lib/rsvp.mjs`, enforced by `check:rsvp` |
| `open` (or an equivalent) says whether the platform's page is still accepting a response | a completed event page painted as a standing exit is a defect this repo already plants for — `check-rsvp-page.mjs`'s `a completed guild event painted as a standing link` |
| `seenAt` is one instant per read, in the same shape as `source.fetchedAt` | a link with no stamp is a claim nobody can age out; the 60-day stamp rule (`src/config.json`'s `URLs._rule`, **S019**, **D272**) exists because an off-site URL is a promise about a site this club does not control |
| no headcount, no attendee list, no member-derived string | **D258** (a headcount is a count of people read at an instant on a platform the club does not control) and **D265**/**D272** (the projection omits `going` and the page check fails a count that reaches a byte) |
| the row's existing `url` stays, and is the canonical page | `MH-FR-025` (the publisher names the feed and composes nothing) and **D398** (the feed and the page must not disagree about where the sign-up page is) |
| at most one entry per `platform` per row | two Meetup pages on one hour is a real state today (`matchPages` returns several and the row then labels each with the event's own title); a set that can repeat a platform makes "the Meetup link" ambiguous |

**What this repo will do with it, the day it lands.** `signUpPaths()` gets its destinations from the row instead
of from a second file, `data/meetup-events.json` and `data/discord-events.json` stop being inputs to anything,
`feedUrl()` collapses to the row's own entry, and `check:rsvp-page` compares the painted cluster against the row
rather than against a snapshot of someone's scrape. No new gate is needed: the cluster rule, the link-shape rule
and the `sr-only` rule already exist and simply change what they read.

**What happens if it is refused.** The per-date links leave the site and the standing group links stay — that
fallback is already the code path for a date with no platform page, so the failure is a smaller site, not a
broken one. The fact does **not** come back through a scraper, and it is not smuggled in as a `_`-prefixed key:
`MH-FR-006` carries those byte-for-byte, which would make this repo's prose an input to a rendering rule — the
exact inversion **D236** and **D319** refuse.


## When a check goes red now

| Finding | What it means under the handoff | What to do |
|---|---|---|
| `runway` | the file's stamp is older than its hatch, so nobody has refreshed it | the publisher's run is the act; renewing `stalenessOkUntil` is this repo's grant, and it must say why in the commit |
| `snapshot-keys`, `sourced-rows` | the file carries a key this repo's build does not know — the two whitelists have drifted apart | the differential fixture test says which side moved; a new field is a change to both repositories, agreed, never one side alone |
| `superseded-log` | the file's record of dropped rows disagrees with what the renderer is dropping right now | this repo's grouping decision is the one that changed, or the log was hand-edited; open both and read them |
| `dtstamp` | rows disagree about when they were harvested | a publisher defect (`MH-FR-023`); do not hand-edit a stamp to silence a gate |
| a date a visitor would call wrong | the file is a snapshot of someone else's read, at a branch, at a commit | find the handoff commit (`git log -- data/events.json`) before touching a page |

What none of these mean, any more: "run the harvester". There is no harvester in this repository, and a finding
text that says otherwise is a bug in the finding text.
