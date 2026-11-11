# Source contract — what each source promises, and what the site may say about it

**Gate G2** (`.notes/PLAN.md` §Gates). This file is the reason stage S2 ("the calendar is true") is entered:
no adapter, harvester, cadence job or page reads a source in a way this contract does not name. Writing the
contract first is the point — the failure mode this plan exists to prevent is code that re-derives a fact
every session has already measured.

Every claim below is either a command run in this repo or a citation to a decision id. Where a source is not
yet wired, the contract says so in the same breath as the rule that will govern it.

Three questions a source must answer before any surface may read it:

1. **Which fields do we read** — and which do we deliberately not read?
2. **What is the time semantics** — is a value an instant, or a wall clock somebody typed?
3. **What happens when the source disagrees with another source, or with itself?**

---

## 1. The disagreement rule (one rule, every surface)

The site carries two calendars: Mobilizon's group feed, harvested into `data/events.json`, and Meetup's
public event pages, read into `data/meetup-events.json`. Measured on 2026-11-09: the Mobilizon snapshot holds
**4 rows** (3 open, 1 cancelled), the Meetup page lists **26 events, 16 still open**. Counting is not
comparing; the rule that decides what a page prints is this:

- **Mobilizon is the record.** Date, hour, venue, status — what a visitor is *told* comes from the record
  (D70: the URL and the row shape are the durable part, the writer is separable; D73: the public site never
  fetches Mobilizon at request time, so Mobilizon being down costs editing, not serving).
- **Meetup is the sign-up.** It decides whether an *RSVP action exists* for a date, and supplies the per-event
  link a row points at (D259: a schedule row links to the event, not to the group).
- **A date only on Meetup is printed as booked, not as confirmed.** It gets the Meetup title (with any
  frequency word stripped — D92: the site publishes series names and real dates, never a frequency), no
  venue, and a line saying where it came from. Meetup's ACTIVE rows carry `venueName: null` in every row of
  the snapshot read on 2026-11-09, so a venue taken from Meetup would be a blank pretending to be a fact.
- **A date cancelled on the record is never printed on a page**, but `/events.ics` still publishes it with its
  UID and a raised SEQUENCE so a subscriber's client retires its copy (D223, D104). Deleting a row is the
  wrong fix twice over: the page would silently forget a plan, and the subscriber would keep one.
- **Headcounts are never printed, anywhere.** `going.totalCount` is a count of people, read at an instant,
  on a platform the club does not control (D258). It is kept in the snapshot so the harvester's own console
  can report it, and it is dropped before any surface sees it: `meetupView()` in `src/lib/rsvp.mjs` is a
  whitelist projection that omits `going` (D265, D272), and `scripts/check-rsvp-page.mjs` reads the built
  bytes and fails if a count appears in text or in an attribute. Two ends, one rule — a projection nobody
  can bypass and a page check that does not trust the projection.
- **What a source is silent about stays silent.** The harvest never deletes a row and never invents copy
  (`scripts/events-harvest.mjs` header, D236); a page prints "time not set" rather than an hour nobody
  confirmed (D169, D172).

## 2. Time semantics

| source | what the wire gives | what the snapshot stores | what a page may print |
|---|---|---|---|
| Mobilizon group feed | Mobilizon 5.2.4 emits `DTSTART` with a bare `Z` and no `TZID`/`VTIMEZONE` (measured, `scripts/events-harvest.mjs` header) | the **wall clock the harvest saw**, plus `source.rawStart`/`rawEnd`, and `timeConfirmed: false` | "time not set" until a human confirms the hour |
| Mobilizon, confirmed rows | the same, after a human rules the hour | `timeConfirmed: true` | the hour, with the venue line quoted from `venue.raw` |
| Meetup event page | an ISO instant with an offset in the group's zone (`-05:00` / `-06:00` in the 2026-11-09 read) | `date` and `time` as the wall clock in that zone | the hour of a date that the record also lists, or the Meetup date alone |
| `/events.ics` (the site's own output) | instants carrying `TZID=America/Chicago` + a `VTIMEZONE` (D72) | derived from the snapshot; `DTSTAMP` derives from the committed `source.fetchedAt`, not the build clock | n/a — this is the site speaking, not a source |

**`today` is always computed in the club's zone.** `todayInZone('America/Chicago')` uses the runtime's tz
database, never the build host's clock (D188): the same commit built on a UTC runner and a UTC-6 laptop must
not disagree about whether tonight's event is still upcoming.

**The match key is date + wall-clock `HH:MM`.** When the record's hour is unconfirmed, a Meetup event matches
that date only if exactly one Meetup event is on it — matching a date to an arbitrary event would attach a
sign-up link to the wrong meeting.

## 3. Identity, edits, and what an edit does to a row

- **Mobilizon `UID`** is the row key. Measured (D225): editing a date in Mobilizon **mints a new UID** rather
  than bumping a SEQUENCE. So the harvest reports a vanished UID as a note instead of deleting the row, and a
  human decides whether the old date should be published as `STATUS:CANCELLED`. `check:ics` asserts a 21-day
  runway (D188) — the detector asks "is a row near", not "is that row still true" (D223); MS05 is what closes
  that gap.
- **`SEQUENCE`** increments when a mechanical field on an existing UID changes (`summary`, `start`, `end`,
  `venueRaw`, `geo`, `blurb`, `url`, `image`, `status` — `scripts/events-harvest.mjs`'s `MECHANICAL` list),
  because UID+SEQUENCE is how a subscriber learns its copy is stale (RFC 5545 §3.8.7 region).
- **Meetup `id`/`token`** is the event key, carried in the URL. Both forms answer 200 (measured 2026-11-09:
  numeric `316305147` and alphanumeric `tqswbvykcdbwb`). The shape is machine-validated by
  `MEETUP_URL_SHAPE` in `src/lib/rsvp.mjs` — the only place the pattern is written, so the reader and the
  gate cannot drift (the D238 split: a limit implemented twice is a limit that drifts).
- **Ids in this repo are never renumbered** (`S###`, `MS##`, `Q###`, `D###`, `S` rulings, milestone rows). A
  superseded decision gets a new id; the old one stays, because ~600 tracked citations resolve through it.

## 4. Per source: read, not read, and who may correct

| source | fields read | fields deliberately not read | who may correct a row | how the correction is proven |
|---|---|---|---|---|
| **Mobilizon group feed** `https://mobilizon.labradorius.com/@minneapolis_math_book_group/feed/ics` (read anonymously; D236 measured that no credential is needed for the read) | `UID`, `DTSTART`, `DTEND`, `SUMMARY`, `LOCATION`, `STATUS`, `DTSTAMP` | nothing in the feed is published beyond the snapshot's fields; the DESCRIPTION is quoted only where the site prints a quotation | the organizer edits Mobilizon; the delegate runs `npm run events:harvest` and the diff is reviewed | the harvest prints `+`/`~`/`=` per UID; a changed row is a commit |
| **Meetup group event pages** `https://www.meetup.com/minneapolis-mathematics-book-club/events/` | `id`, `url`, `title`, `dateTime`, `endTime`, `status`, venue name when present; `going.totalCount` is stored in the snapshot but is **never rendered** | **`rsvps` member names** — a roster is not a statistic (`.notes/consent-and-data-policy.md` rule 4: attendance is never published; being named anywhere on the site is a separate, affirmative opt-in) | nobody hand-edits `data/meetup-events.json`; re-reading the page is the correction | `npm run check:rsvp` fails if the snapshot is outside its window (§5), if an event URL does not match `MEETUP_URL_SHAPE` (written once, in `src/lib/rsvp.mjs`), or if a configured platform link is unstamped, stale, or last answered 4xx/5xx |
| **Discord API** (`https://discord.com/api/v10`, identifiable UA per Discord's bot policy) | channel list and recent messages for the summary island | anything requiring a member identity; the site reads public channel content only | the club's moderators, in Discord — not this repo | the summary is recomputed and cached 24h per isolate and 24h in KV (`src/lib/discord.ts`); `npm run check:cache` exercises both paths |
| **n8n cadence** (a **write** path, hosted on the YunoHost box; not yet wired) | n/a — this repo does not read it | n/a | the operator grants the write (MS10 is blocked on that grant) | a dry run first, then `cadence-watch`; a payload is proven offline before it reaches a live account (G5, MS09) |
| **ntfy** (alert channel, self-hosted) | n/a — it carries alerts, never event data | n/a | the alert author, in the n8n workflow | `probe-ntfy.mjs` re-asks `GET /v1/version` on every `check.mjs` run so the deny-all fact cannot rot |
| **The Anthropic API** (a transformation, not a source) | the club's own chat digest | no club fact is asserted from it | n/a | the model's output is presented as a summary of messages the page can point at, never as a fact about the club |

**Sources that do not exist**, measured, so nobody re-derives them: Meetup has no readable feed for this
group — `/events/ics/`, `/events/calendar/ics/` and `/events/atom/` all answer 404, and `robots.txt`
disallows the atom/rss/xml paths, `/api/`, `/mu_api/` and `/gql*` (D258, D264). The group's `/events/` page is
not disallowed and answers 200 without a Cloudflare challenge.

## 5. Age windows

| what | inside the window | outside it |
|---|---|---|
| `data/meetup-events.json` | ≤ 14 days (`SNAPSHOT_FRESH_DAYS`, `src/lib/rsvp.mjs`) | > 14 days: `check:rsvp` fails the build. One threshold, one failure, one fix: `node scripts/meetup-events.mjs --write` |
| `data/events.json` | any (the record is the record) | `check:ics`'s 21-day runway for a *near* row (D188) |
| a configured platform URL | a `_verified` stamp ≤ 60 days old (`LINK_STAMP_DAYS`) whose recorded status is not 4xx/5xx | no stamp, a stamp older than 60 days, or a stamp that last answered 4xx/5xx: `check:rsvp` fails; `npm run check:rsvp:links` re-measures it |
| a headcount | never printed | n/a — there is no mechanism that prints one (`meetupView()` drops `going`; `check-rsvp-page.mjs` fails a count in the painted bytes) |

The 28-day "expired" tier this table used to carry is deleted (D272): two numbers that both stop the build
are one rule wearing two names. A stale *sign-up link* is worse than an absent one: D223's failure class is a
fact kept published after its source stopped supporting it, and a row that says "Details and sign-up" about a
page retired last month is that failure wearing a string. The cluster's dated snapshot stamp
(`data-rsvp-snapshot`, `data-rsvp-age`) is what makes a hole visible instead of silent (DESIGN.md, "States").

## 6. What this contract does not authorise

- Any new Cloudflare binding, Worker, D1 table, cron or zone rule (G4 first; the plan is permanently free,
  D32).
- Any write to a live account before the fixture harness proves the payload offline (G5).
- Any credential held or sent before `docs/threat-model.md` exists (G3, MS07).
- Publishing a headcount in any form. `data/meetup-events.json` still carries `going` for the harvester's own
  audit, and the render path is closed at both ends (D258 as the reasoning, D265 and D272 as the ruling).
