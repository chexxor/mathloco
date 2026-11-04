# Decisions — what was chosen, and what was rejected

Each entry names the alternative that was actually considered, so the next reader can disagree with a reason
rather than guess at one. Probe evidence lives in [`../records/2026-11-04-mobilizon-api-probe.md`](../records/2026-11-04-mobilizon-api-probe.md);
decisions that belong to the repo as a whole are numbered in `DECISIONS.index.md` and cited by id.

## 1. Mobilizon stays the authoring system; the automation writes into it

**Rejected: making the repo the source of truth** (generate events in `data/events.json` and publish them).
The club's members, comments, participants and ActivityPub federation live in Mobilizon; a repo-side calendar
would fork them, and D73's rule (*Mobilizon down costs editing, not serving*) already put the site on the
other side of a snapshot. **Rejected: scraping the UI** — no contract, breaks silently.

So the write path is the GraphQL API, and the site keeps reading the harvested snapshot. This integration
touches neither `src/` nor any gate.

## 2. n8n runs it; the reasoning does not live in n8n

The operator already runs n8n, and the primitives needed are exactly three (schedule, HTTP, JavaScript). A
home-server cron plus a `.mjs` script was the alternative — cheaper to reason about, but the operator's ask
was an n8n workflow, and n8n gives the execution ledger, the error branch, the retries and the UI a casual
contributor can read.

The cost of choosing n8n is that its storage is one JSON blob full of duplicated pasted code. Hence decision
12.

## 3. There is no series object to create, so the unit of work is "the next occurrence"

Probed: no type or field named series/recurrence/RRULE anywhere in 5.2.4's schema, and `createEvent`/
`updateEvent` take no recurrence argument. So the integration does exactly what a person does — make the next
row — and does it at most once per series per run.

## 4. The rhythm anchors on the newest real row, not on a calendar formula

**Rejected: "second Saturday, every 14 days" computed from the date.** A formula keeps producing dates when
the club has *stopped* meeting (a gap is invisible to it), and it fights a human who scheduled the next date
by hand. Anchoring on the newest row means: a hand-made date simply moves the anchor; a missed week keeps the
chain's spacing; and a long gap becomes a *catch-up* with a step limit, because inventing six dates nobody
asked for is a decision for a person (`RUN.maxCatchUpSteps`, then `alert`).

## 5. Carry the wall clock, never the instant

The single most consequential rule, and the one a naive implementation gets wrong. The club's own rows use two
conventions (`Etc/UTC` on the two newest, no zone on the older three, at instants that read as 12:00
Central). Carrying the *instant* forward turns the bakery social into a 6 a.m. meeting. Carrying the *wall
clock* the organizer sees — read in the zone that row declares, falling back to the series' declared zone —
reproduces the club's intent and matches the older rows. Worked example, with both rows' stored instants, in
the probe record.

The rule is corrective rather than obedient, so it says so: every plan carries a `TIMEZONE:` note naming the
row and the zone, and `series.strictTimezone: true` turns the note into a refusal. **The rule never fixes the
club's data** — [`operator-guide.md`](operator-guide.md) §7 lists that as an operator action.

## 6. `weekdaySnap` moves a date later, never earlier

Pulling a drifted date *back* onto the club's weekday risks a date in the past or one that collides with a
meeting already scheduled. Forward-only is boring and safe. `null` disables it (a series that genuinely wants
"every 14 days whatever weekday" gets that).

## 7. Five guards, in a fixed order, before any payload is built

| guard | the harm it prevents |
|---|---|
| `horizonDays` (28) | a runaway chain filling next year; keeps the club able to plan by hand |
| `maxCatchUpSteps` (6) → `alert` | inventing a long history of dates after a long gap |
| `already_scheduled` (same *local* date, any declared zone) | a second row for a date the series holds, including a **cancelled** one — the guard refuses to resurrect a meeting the club chose to cancel |
| `other_event_same_day` | two different club meetings stacked on one night (the same address, the same members) |
| `maxFuturePerSeries` (2) | the automation racing ahead of the club's own planning |

Order matters: horizon before the rest, because a rule that points past the horizon is a config bug and
should not be laundered into a dedupe skip.

## 8. Deduplication: read → decide → write → **audit the date**

Mobilizon offers no conditional create, no `If-None-Match`, no idempotency key. So a unique constraint is not
available and the honest sequence is the four-step one, where the fourth step is the real guard: read the date
back and assert that (a) the event we made is there, (b) its title and instant came back as planned, and
(c) **it is the only row for that series on that date**. (c) is what catches a human who made the same meeting
a minute earlier, and what catches a retry that duplicated a write. A failure there throws on purpose, so the
execution is red and `21` names the stage.

**Rejected: a n8n static-data / data-store ledger of "events I created"** — it would go stale, survive
deletions, and answer "why is this on the calendar" with a file nobody trusts. The calendar is the state
(decision 13).

**Rejected: auto-deleting a detected duplicate.** Choosing which of two events members should see is a human
judgement. The workflow reports both uuids; `repair.mjs` executes the choice.

## 9. Copy by whitelist, and never copy an identity

`buildCreateVars` carries the fields members see — title, description, category, language, visibility, join
options, status, tags, metadata, contacts, the options block, the physical address, the picture — and refuses
everything else:

- **`id`, `uuid`, `url`, `slug`, `insertedAt`, `updatedAt`** — copying any of these is an attempt to make the
  new row *be* the old one;
- **`physicalAddress.id` / `originId`** — an address row with an id is a *shared* row: editing the venue of
  one event would move the other. The address is copied as a value (`geom` round-trips as `longitude;latitude`,
  verified on 5.2.4);
- **`options.remainingAttendeeCapacity` and any participant list** — a count of who joined the old meeting is
  not a property of the new one;
- **`options.maximumAttendeeCapacity: 0`** — `0` means "no limit" on this instance (all five real rows carry
  it and their members attend) but means "no attendees allowed" in the ActivityPub vocabulary. Copying it
  into a public meeting is a defect either way, so it is dropped: the failure direction becomes "admits more
  people than planned", never "admits nobody";
- **`publishAt`** — a scheduled publish would be a second clock to keep. The new row is publishable now
  (`draft: false`, deliberately; set `draft: true` in the series block to park it for a human instead);
- **the picture is carried by reference** (`picture: { mediaUuid }`), not re-uploaded — verified on 5.2.4.

## 10. Authentication: sign in per run, from environment variables

Rejections, all measured: n8n's Basic Auth (the endpoint does not honour HTTP Basic), an n8n OAuth2 credential
(the grants this instance implements are `authorization_code`, device code and `refresh_token` — no
`password`, no `client_credentials`), a personal access token (no such mutation on 5.2.4), a stored long-lived
session token (it expires, and silently). Adopted:
`login(email, password) { accessToken … }` in exactly one node, values read as `$env.NAME`, token used by two
nodes and dropped with the execution. The `refreshToken` Mobilizon offers is deliberately not selected — a
long-lived secret to save one round trip a day.

Corrected 2026-11-04 (D185): this section originally said "there is no client-registration route". That was
`/api/v1/apps` falling through to the GraphQL router. The route is on the apex — `POST /apps`, `POST
/oauth/token` and `POST /login/device/code` all answer, and the scope vocabulary is granular
(`write:event:create`, `read:group:events`, …). An OAuth service account is therefore *available*: it removes
the password from n8n at the cost of a registered client, one human authorisation, and a rotating refresh
token that still has to live on that host. Not adopted for A9; the operator's account ruling decides.

Consequence stated plainly in [`security.md`](security.md): the password travels on every run, and the
sign-in node's execution data contains it. Mitigations, and the alternative posture, are there.

## 11. Actor ids are resolved at run time, never written into config

`organizerActorId` and `attributedToId` are Mobilizon database ids. Hard-coding `3` and `4` survives one
account rebuild, and the failure it survives is the bad one: events attributed to the wrong actor, which look
fine on the calendar. So they are read per run, and if the signed-in account owns more than one local actor
the run **refuses** rather than picking one. `Event.organizerActor` reads back as `null` for unauthenticated
callers, so copying the organizer from the previous event is not available — another reason the id comes from
the sign-in.

## 12. The workflow JSON is generated, and the tests execute the generated text

**Rejected: pasting the queries and rules into the n8n editor** — three copies of the date rules (the node,
`simulate.mjs`, the tests) is exactly the drift this project cannot afford. `build-workflow.mjs` injects
`series.config.mjs`, `lib/core.mjs` and `lib/queries.mjs` into the three Code nodes at `// @inject` markers,
then refuses to write the artifact unless: every `$('name')` resolves, every Code node parses, no name is
declared twice in one node, every URL is on the configured host and path, no `neverError`, no
credential-shaped literal, the gate compares `.action` against `"create"` and is the only edge into the write,
the error reporter is reachable only from error outputs — and every node except the trigger and the two reporters has
its error output wired to it, with both reporters terminals — and every series has the fields the rules need. Under
`--check` it additionally compares the artifact **on disk** with what these sources produce: the tests run the rebuilt
text, so a stale committed artifact is the one route by which an untested rule could reach n8n.

`test/workflow.test.mjs` then runs the **generated** `jsCode` under a fake `$()`, so a mangled here-string or
a missing injection fails a test rather than a club calendar. The invariant list has already paid for itself twice: the
error-output rule failed the build on the commit that introduced it (the IF node had none), and the drift rule fails on
a single trailing newline.

## 13. No database, no static data: the club's calendar is the state

Every run re-derives from a read. Recovery properties: a crashed run leaves nothing to clean, a lost execution
history costs nothing, a hand-made date is understood, and a pause costs one day. The price is that the read
must be complete — hence a 400-day back window and a 120-day forward one, bounded so the query cannot grow
with the club's age.

## 14. One run a day; at most one new event per series per run

Daily is enough because the horizon is 28 days and a missed day is re-derived. One event per series per run is
what makes an unexpected result reviewable — a run that created four dates is a run nobody can check.

## 15. One group per run, and a loud refusal beyond that

Both series are in `@minneapolis_math_book_group`. The graph is a straight line with one read, so a second
group needs a loop (Split Out into a sub-workflow). Rather than plan one group and silently ignore the other,
`01 Config` throws and the build refuses, with the extension path in the message.

## 16. `dryRun` is the kill switch, and it lives in the config the tests read

`dryRun: true` makes the plan say `would_create`, which the IF gate routes to the report. The dry-run switch
is therefore one config line rather than a wiring change, and the same flag is what `test/core.test.mjs`
asserts on — a dry run that can reach a write fails the suite.

## 17. `alert` and `skip` are different words, and both reach a person

`skip` means "correctly did nothing" (already scheduled, enough ahead, past the horizon). `alert` means
"this needs a human" (a rename, a clock mismatch, every row cancelled, a gap too long to catch up). The
report prints both; `22 Report a problem` folds alerts into the failure shape so a notification can fire on
either, and `21 Report error path` names which stage broke — because a red dot on a canvas is not an alert.

## 18. No `package.json` in `integrations/` yet

Per D152's recommendation ("directory now, manifest when it earns one"): this integration has zero
dependencies — Node builtins (`fetch`, `node:test`, `node:fs`) — and its schedule lives in n8n, not on the
home server. The triggers that would earn a manifest are named there, and the site's `package.json` stays
what the operator asked for.

## 19. The ICS-feed route: measured, and parked with a trigger

The Mobilizon delegate opened a read-only question (ruling 3(c)): instead of calling `createEvent` itself,
could cadence publish an ICS feed that **Mobilizon imports** — removing the login, the credential, the
duplicate-write risk and the audit-after-write? Answered 2026-11-04 in
[`../records/2026-11-04-oauth-surface-and-ics-import-probe.md`](../records/2026-11-04-oauth-surface-and-ics-import-probe.md):

- **Mobilizon has no importer.** On the live 5.2.4 schema (91 mutations, 42 queries) nothing matches
  `import`/`ics`/`ical`; `createFeedToken`/`deleteFeedToken` mint **export** tokens. In the upstream clone at
  `f2590486f` (5.2.5-RC1) there is no import route in `lib/web/router.ex`, no `def import` in `lib`, no import
  string in `src/i18n/en_US.json`, and `ical.js` is a dependency imported nowhere in `src/`. The "import tool"
  in the upstream thread is not a Mobilizon feature.
- **The third-party importers use the same door.** `vranki/mobilizon-importer` (the one with the `ical_calendar`
  module) keeps `email`/`password` in plaintext in its own `config.json`, authenticates with the same
  `login`/`refreshToken` mutations, and writes with the same `createEvent` — *plus* `updateEvent`,
  `updateEvent(status: CANCELLED)` and `DeleteEvent`, the three things this workflow never does.

So the route moves the credential and the write into an unreviewed process on another port with a wider blast
radius, and adds a service to run. **Option 1 stands.** Parked with its un-parking trigger (D148): re-open if
Mobilizon **core** gains a server-side importer — detection is one command,
`curl --json '{"query":"{ __schema { mutationType { fields { name } } } }"}' $M/api/v1 | grep -oiE
'"name":"[a-z]*(import|ics|ical)[a-z]*"'`, which today prints nothing.

## Deliberately not built

- **RRULE in the site's own ICS output.** The site emits one VEVENT per real occurrence (D73's shape). Adding
  recurrence there would make the site claim a rhythm Mobilizon does not hold.
- **Copying participants, comments or RSVPs.** A new meeting starts empty.
- **Drafts by default.** `draft: false` — a parked draft nobody publishes is worse than a published event.
  It is one config field for a club that prefers to review.
- **A n8n credential for the Mobilizon account.** Not with this API's body-based credential, and not with
  n8n's OAuth2 credential either (this instance implements no `password` and no `client_credentials` grant,
  D185). A scoped OAuth client registered on the apex *is* available — one human authorisation, then a
  rotating refresh token that still has to live on the n8n host — and if the operator chooses it, `03 Sign in`
  is the only node that changes.
- **Auto-repair.** Detection reports; deletion is executed by a person through `repair.mjs`.
