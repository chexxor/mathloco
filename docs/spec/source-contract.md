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

### 4b. Candidate sources the operator has named — not wired, and nothing reads them yet

The operator keeps a list of **free online math events** to aggregate (opened 2026-11-15: "Add this to a list
of free online math events to aggregate: https://momath.org/volumes/"). The list itself — one row per
publisher, each with its measured wire shape and its terms — lives beside the plan in
`.notes/roadmap-events.md` §"the operator's list: free online math events to aggregate", which is host-local,
so **this table is the part that travels**: a fresh clone learns that the candidate exists, what it would
promise, and that no code may read it before this contract names it.

| candidate | fields it would give | fields deliberately not read | who may correct it | how a correction is proven |
|---|---|---|---|---|
| **MoMath `Volumes`, the MoMath book club** — `momath.org/volumes/` (the museum's fuller list is `momath.org/calendar/`, header `Events (Eastern Time Zone)`) | nothing today. If it is ever wired: the series name, the date and wall clock **as declared in Eastern**, the `( online )` marker, and the publisher's own link | no club fact is asserted from it; no registrant data (its register form collects a name and a street address — a roster is not a statistic, and this row would inherit the consent rule in rule 4); no paraphrase of its blurb | MoMath's own staff, on MoMath | a dated stamp on the configured URL, re-measured, in the same 60-day window `check:rsvp` already applies to a configured platform link |

#### The question the list has to answer, measured

The ask is a *list to aggregate*, so one row per publisher is only useful against four questions: does it
name **upcoming** events, does it say **free**, does it say **online**, and is it **machine-readable** — plus
whether its own terms allow the read. Every number below was fetched from this seat on 2026-11-15 (Linux
native, Node 24.22.1 `fetch`, UA `Mozilla/5.0 (X11; Linux; Firefox 149)`, redirects followed; the two rows
marked `curl` are curl with the same UA, because those hosts answer differently to the two instruments).
A rejection names the measurement that rejected it; a host that failed DNS is `unreachable from this seat`,
not `no feed`.

| publisher | upcoming | free | online | machine-readable | its own terms | verdict |
|---|---|---|---|---|---|---|
| **MoMath `Volumes`** — `momath.org/volumes/` | 1 session printed: `Tuesday, December 1 6:30 pm to 7:30 pm ET ( online )` | yes — `free event registration`, `free registration to the April Volumes` | yes — `( online )`, `online-only event` | **no**: `/volumes/feed/` 200/716 `application/rss+xml` is `Comments on: Volumes`; `/feed/` 200/54,620 is the site's posts RSS, 0 event rows | `robots.txt` 200: `User-agent: *`, `Allow: /`; the AI-train bots (`ClaudeBot`, `CCBot`, `Diffbot`) are `Disallow: /` — we do not train | **AGGREGATE** (the operator named it) |
| **MoMath `calendar`** — `momath.org/calendar/` (also `/upcoming-events/`, `/events/`) | the page's own header `Events (Eastern Time Zone)` | **15** `Free!` markers | **35** `( online )` markers, against **37** `( in person )` | **no**: `/calendar/ics/` → 404/43,119 of HTML (a soft 404, not a feed), `/events/ics/` the same, `calendar/?ical=1` answers 200/99,635 of HTML with 0 `BEGIN:CALENDAR` | same `robots.txt`, allowed | **AGGREGATE — and it subsumes the row above**: `Volumes` is one of its rows, so one source answers the ask twice as wide |
| **NYAS events calendar** — `nyas.org/events-calendar/` (from `nyas.org/events/`, a 301) | dated rows (`Nov 18, 2026`, …) | **no, for a visitor**: the only free is `Free for Members` (**25** rows); the page says `Become a member today and get free access to select events` | yes — the categories are `All / Hybrid / Virtual / In-Person` | **no**: `/events/feed/` 200/707 (comments RSS), `sitemap.rss` 200/20,677 is a posts feed with 0 event rows, `/events/?feed=ics` → 404 | `robots.txt` 200/157: only `/wp-admin/` disallowed | **ASK — free means member-only**; a `free` column would be a lie, and the list's rule (D323's precedent: an unaffordable option stays parked rather than published) is the same one |
| **Julia Computing events** — `juliacomputing.com/events/` | 18 `Upcoming` rows (`Nov 18, 2026, 12:00 PM • Webinar …`) | **the page never says free** — 0 occurrences of the word in its text; the affordance is `Register for the Webinar` | yes — **51** `webinar` mentions, `Webinar` on every row | **no** (no ICS/RSS in the wire; robots is `User-agent: *`, `Disallow:` — all allowed) | allowed | **ASK — online and dated, price unstated**; the list says `free`, so this row cannot join until a human reads the registration page |
| **Eventbrite — city/math search** — `eventbrite.com/d/united-states--minneapolis/math--events/` | 69 dated rows | yes — the page offers a `Price Free` filter | yes — the page offers `Search for online events` | yes in principle (`/d/…/ics/` answers a 301) | **its `robots.txt` (200/7,559) disallows the very paths we would read: `/rss/`, `/events/rss/`, `/events/atom/`, `*&calendar*`** | **REJECT on terms** — the publisher forbids the read; D69 already ruled Meetup's feeds off for the same reason, and one rule at two publishers is two letters |
| **AMS `meetings`** — `ams.org/meetings/` | sectional-meeting pages | unstated | only **6** `online` mentions page-wide, mostly the privacy copy | **no**: `rss.xml` 404; the calendar is a hand-maintained HTML page | `robots.txt` 200/2,676 | **REJECT for this list — no machine-readable route from this seat** (`curl` 200/98,842 and Node `fetch` 403, same UA: a bot-gated publisher, so a harvester would be fighting the gate, not reading a schedule) |
| **Joint Mathematics Meetings** — `jointmathematicsmeetings.org` (the SCIMAP site; `scimap.org` is a 2,015-byte stub) | — | — | — | **unresolvable from this seat**: `curl` → 302, Node `fetch` → 403, `jmm-api/meetings` → 301/226 | — | **ASK — the site is bot-gated here**, so the read is not measured and must not be claimed |
| **Meetup group pages** — `meetup.com/twin-cities-math-users-group/events/`, `meetup.com/…/events/all/upcoming-ics/` | served **200/59,698 whose text says `Group not found … the group you're looking for doesn't exist`** (a soft 404), and the ICS path 404/49,910 | — | the word `online` appears only in Meetup's nav chrome | no | D69 already rules Meetup automation off (`robots.txt` disallows `*/events/rss/*`) | **REJECT** — a soft-404 answer and terms already ruled off |
| **Mathcamp** — `mathcamp.org/2026/` | 200/13,850; the summer is stated as past (`June 28 to August 2`) | 0 free | 0 online | no | — | **REJECT — nothing upcoming, in-person only** |
| **JuliaCon** — `juliacon.org/2026/` | `August 10-15, 2026` (past); the page's own line is `The recorded streams for the conference are on YouTube!` | its only `free` is a `KombiTicket for free public transport` | recordings, not events | no | — | **REJECT — past, and its free is transport, not entry** |
| **`mtm.org/events/`** | 200/30,071, dated rows | 0 free | 5 (`Online-Lerngruppe`, `MS Teams`) | no | — | **REJECT — not mathematics**: this is a German driving-school/academy site (MTM-Akademie). A name collision that a search would have produced |
| `asl.org/events` 404/2,450 · `symboliclogic.org/events/` 404/1,271 · `greshams.com/lectures/` **404 with 117,581 bytes** (a soft 404: the page exists, the lectures page does not) | — | — | — | — | — | **REJECT — the page does not exist**, and a byte count alone is not evidence it does |
| `submap.cc`, `mathseminars.net`, `jointmathematics.com`, `mathgoverschool.org`, `mtcmath.org`, `mathematicalseminars.com` | — | — | — | — | — | **ASK — `unreachable from this seat` (DNS/TLS failure), which is a statement about this rig, not about the publisher.** Do not call any of these a rejection until the host resolves |

**If the club could only add two, add these two**: MoMath's `calendar` page (not `Volumes` alone —
15 `Free!` × 35 `( online )` rows on one allowed page, and the operator's `Volumes` row is inside it)
and **Julia Computing's events page**, whose 18 online `Webinar` rows are the only candidate that is
dated and online without a membership gate — with the one caveat that its page states no price, so its
`free` column waits for a human read. NYAS is third and loses on one measurement: its 25 free rows are
`Free for Members`, which is free to a member and not free to a visitor.

Three rules this candidate does not relieve, and each is why nothing is wired mid-round: the disagreement
rule in §1 is stated for the club's **two** calendars, and a third publisher's dates are not a club record —
they would need a surface that says so (the parked "a dimension for other groups" question, D303); its times
are **wall clock in Eastern**, while the site's clock is `todayInZone('America/Chicago')` (D188) and its clock
rule is D174's; and its event names are not in `src/lib/event-groups.mjs`'s two-type vocabulary, which the
N1 ruling on series names still owns. **It is parked in `PLAN.md` §Parked until the operator's letter names
the surface and the vocabulary** (D334).

### 4c. The two names one meeting carries — the vocabulary at N1, measured 2026-11-15

A row carries **two** names, and the contract says which surface gets which. This is the part of the
naming decision that a fresh clone has to learn, because it is not visible in the code that reads it:
`src/lib/event-groups.mjs` consults `row.series || row.seriesNote || row.summary`, and the page prints
`series` while the feed publishes `summary` (D189: the feed's line is a quotation of the organizer,
not the club's claim). Measured over `data/events.json`, `dist/client/events.ics` and the built
schedule page @measured 2026-11-15 (full dump `.design/tmp-naming-2026-11-15.txt`, reasoning in
`design/records/0028-a-series-carries-two-names-and-the-feed-prints-the-wrong-one.md`):

| surface | name it prints | rows | distinct names |
|---|---|---|---|
| `data/events.json` — `series` (the club's own word) | `MPLS Math Club Social` ×5, `Common Denominator - Study Session` ×2, `Parallel Learning for Mathematical Minds` ×1 | 8 | **3** |
| `data/events.json` — `summary` (the organizer's, verbatim) | `Matheapolis - Bimonthly Social` ×3, `Common Denominator - Study Session` ×2, `MPLS Math Club - Bimonthly Social` ×2, `Parallel Learning for Mathematical Minds` ×1 | 8 | **4** |
| `dist/client/events.ics` — `SUMMARY:` | the four organizer strings, one CANCELLED row superseded under D318's grouping note | 7 | **4** |
| `dist/client/schedule/index.html` — the row's `<h2>` | `MPLS Math Club Social` ×3, `Common Denominator - Study Session` ×2 | 5 | **2** |

Three rules follow, and each is a rule a future session would otherwise re-derive:

1. **Never rename inside `summary`.** It is the organizer's verbatim field (D92, `check:ics`'s
   read-verbatim rule), and `npm run events:harvest` overwrites it with whatever Mobilizon types — a
   rename there is a rename that does not survive the next harvest.
2. **The club's word for a meeting lives in `series`, one field per row.** That is legal today; what is
   *not* settled is the list of members of that vocabulary, and nothing in the gates asserts one:
   `meetingKind` deliberately compares **kinds, not names** (its own comment: "a byte-level gate can
   only compare kinds, not names"), and `check:naming` owns page names, not series names. So the
   divergence above is not a defect a gate can see — it is an open decision.
3. **`seriesNote` is a shape the code already reads and the data never writes — 0 of 8 rows carry one**
   @measured 2026-11-15. A "bold name plus a muted clause" is therefore a new **field**, not markup,
   and the field is the one `event-groups.mjs` already falls back through.

**What stays the operator's, and why it is not decided here:** which names belong to the club — is
`Common Denominator` a series the club runs, or one meeting the club attended? — is the N1 ruling on
series names (still open, MS25/MS27). Picking names would be this seat inventing what the club calls
its own meetings, which is the same class as D309's one-name-per-page rule; the recommendation is that
the operator's letter answer **one question** — the list of series the club owns — and the code then
fills `series` and `seriesNote` from that list in one commit, with `check:ics` gaining a rule that
fails a `series` outside the named list.


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
