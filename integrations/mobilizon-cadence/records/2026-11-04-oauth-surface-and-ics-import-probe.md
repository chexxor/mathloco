# OAuth surface, and the ICS-import question — 2026-11-04

Two read-only investigations, both opened by the Mobilizon delegate's outbox (`.notes/from-mathloco/` in the
mobilizon workspace; rulings 3(c) and 4(a)). Both are answered with commands that were actually run, and
neither writes anything to the instance. Machine-readable output: the `oauth_apex` and `ics_import_route`
keys in [`evidence-2026-11-04.json`](./evidence-2026-11-04.json).

Source read alongside the live probes: the upstream clone at `~/Git/mobilizon`, commit `f2590486f`
(`mix.exs @version = "5.2.5-RC1"`, dated 2026-09-30). The instance runs **5.2.4** (nodeinfo, measured in the
[first probe log](./2026-11-04-mobilizon-api-probe.md)), so the clone is one release ahead — close enough to
read grant handling from, and every claim below that comes from the clone says so.

## This corrects the first probe log

The earlier log records `POST /api/v1/apps` → `"No query document supplied"` and concludes *"no
app-registration route"*. That conclusion was a path artifact. **The route exists, on the apex.** The wrong
sentence has been corrected in `lib/queries.mjs`, `series.config.mjs`, `docs/decisions.md` §10 and
`docs/security.md` (D185), and `n8n/env-probe.json` now asks the question from inside n8n's own network.

## The OAuth surface is on the apex, and it answers

```bash
M=https://mobilizon.labradorius.com
curl -X POST "$M/apps"       -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode 'name=mathloco cadence probe (incomplete on purpose)'
curl -X POST "$M/apps"       -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode 'name=x' --data-urlencode 'redirect_uri=https://example.invalid/nope' \
  --data-urlencode 'scope=write:everything'
curl -X POST "$M/login/device/code" -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode 'client_id=nonexistent'
curl -X POST "$M/oauth/token" -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=refresh_token' --data-urlencode 'client_id=nonexistent' \
  --data-urlencode 'client_secret=nope' --data-urlencode 'refresh_token=nope'
```

| request | result |
|---|---|
| `POST /apps`, `name` only | **400** `{"error":"invalid_request","error_description":"All of name, scope and redirect_uri parameters are required to create an application"}` |
| `POST /apps`, `scope=write:everything` | **400** `{"error":"invalid_scope","error_description":"The scope parameter is not a space separated list of valid scopes"}` |
| `POST /login/device/code`, `client_id=nonexistent` | **400** `{"error":"invalid_request","error_description":"You need to pass both client_id and scope as parameters to obtain a device code"}` |
| `POST /oauth/token`, bogus refresh token | **400** `{"error":"invalid_grant","error_description":"Invalid refresh token provided"}` |
| `POST /oauth/token`, `grant_type=client_credentials` | **400** `{"error":"invalid_request","error_description":"Incorrect parameters sent. You need to provide at least the grant_type and client_id parameters, depending on the grant type being used."}` |
| `POST /api/v1/apps` | falls through to the GraphQL router (`"No query document supplied"`) — the observation that produced the wrong conclusion |

Each of those refusal strings is the instance's own source text, which is how the response is identifiable as
Mobilizon's OAuth controller rather than a proxy. **Nothing was created**: the first two requests stop in
`ApplicationController.create_application/2` before `Applications.create` — the missing-params clause
(`lib/web/controllers/application_controller.ex:82`) and the `:invalid_scope` return both short-circuit it.

**Honest limit on the last row.** That 400 is the controller's catch-all clause, so it is *consistent with*
`client_credentials` being unimplemented but does not prove it. The grants that **are** implemented were read
from the clone instead: `authorization_code`, `urn:ietf:params:oauth:grant-type:device_code` and
`refresh_token` (`grep '"grant_type" =>' lib/web/controllers/application_controller.ex` → three clauses).
No `password` grant, no `client_credentials` grant.

Why that matters for the credential question: n8n's OAuth2 **credential** type drives `password` or
`client_credentials`, and neither exists here. An OAuth app on this instance therefore needs a human
authorisation once (browser consent, or the device flow: `POST /login/device/code` then `authorizeDeviceApplication`),
and afterwards an unattended writer runs on a **rotating refresh token**. That moves the secret from a
password to a refresh token that still has to live on the n8n host — it does not delete it.

Two more facts that bear on the account decision:
- **The GraphQL endpoint honours bearer tokens.** `POST /api/v1 { loggedPerson }` with
  `authorization: Bearer not-a-real-token` → `{"message":"invalid_token","details":":invalid_token"}` — an
  OAuth-layer refusal, not the GraphQL `unauthenticated` error an empty bearer produces. So a scoped access
  token *can* authenticate `createEvent`, and n8n's **Header Auth** credential could hold it (the store is
  encrypted at rest, unlike an env var in a process that logs its request bodies). What is still missing is the
  unattended way to obtain that token — see the grants above.
- **Scopes are granular.** `lib/graphql/authorization/app_scope.ex` @ `f2590486f` lists them:
  `write:event:create`, `write:event:update`, `write:event:delete`, `read:group:events`,
  `read:profile:organized_events`, and ~40 more. A cadence service account could be `write:event:create`
  plus a read scope, which is narrower than the password it would replace.
- **`POST /apps` is rate-limited** at 10 per minute per IP
  (`Rajska.RateLimit.hit("create_application:<ip>", 60_000, 10)`) — so registering from a script that retries
  is not a good idea, and one registered client is the right shape.
- There is **no long-lived user token**: `__type(name: "ApplicationToken")` → `null`, and the token-shaped
  fields on 5.2.4 are `authorizeApplication`, `authorizeDeviceApplication`, `revokeApplicationToken`,
  `createFeedToken`, `deleteFeedToken`, `refreshToken` (query side: `authApplication`). `createFeedToken`
  mints an **export** feed token; it is not an import.

## Ruling 3(c): could cadence publish an ICS feed that Mobilizon imports?

The claim under test came from the upstream issue thread (Lahax, 2026-10-19): *"creating a serie in a calendar
app, then import the iCalendar (ICS) feed into Mobilizon using the import tool … This is a workaround"* —
and, from 2023-12, *"has anyone has tried out the new 'event importer' released by Framasoft?"*.

**Mobilizon itself has no importer.** Measured on 5.2.4 and read at 5.2.5-RC1:

```bash
# live schema: no import/ics/feed-shaped mutation
curl --json '{"query":"{ __schema { mutationType { fields { name } } queryType { fields { name } } } }"}' \
  https://mobilizon.labradorius.com/api/v1
```

- 91 mutations, 42 queries; **none** matching `import`/`ics`/`ical`. The feed-shaped ones are
  `createFeedToken`/`deleteFeedToken`, which mint the per-user **export** token.
- In the clone: `grep -n "ics\|import" lib/web/router.ex` → only `plug(:accepts, ["atom","ics","html","xml"])`
  (export formats) and Elixir's own `import` statements. `grep -rn "def import" lib` → nothing. No
  import view, and `src/i18n/en_US.json` contains **no** import UI string (the only "import" hit in that file
  is the word "important" inside a notification-settings sentence). `ical.js@^2.2.1` is in `package.json` and
  is imported **nowhere** in `src/` — a vestige, not a feature.

**The importers that do exist are third-party, and they use the same door.** From GitHub (search
`mobilizon import`, 2026-11-04):

| repo | pushed | what it is |
|---|---|---|
| `vranki/mobilizon-importer` | 2025-02-17 | Python, has an `ical_calendar` module that reads an `ics_url` (its own example is a Nextcloud public-calendar export) |
| `dindy/mobilizon-event-importer` | 2026-05-26 | a Vite/Vue **browser** app; README is one line |

The upstream docs page the Mobilizon delegate is drafting names two importers and a CLI, which map onto these
(`~/Git/mobilizon/.notes/drafts/docs-55/evidence.md`, quoting `kaihuri/mobilizon-documentation`’s
`docs/5. Interoperability/10.import_events.md`): "Mobilizon event importer by Dindy (under active
development)" — *"subscribe to a calendar (ICS / Icalendar / Ical) … New events will be regularly fetched"* —
and "Mobilizon event importer by kaihuri (low maintenance)" — *"sources: Meetup, Eventbrite, ICS feeds … new
events are periodically checked and automatically published"*, framagit `kaihuri/mobilizon-event-importer`.

Reading Dindy's importer (`src/api/mobilizon.js`, `src/store/actions.js`, fetched 2026-11-04) matters for the
instance, not just for the comparison:

- it authenticates by **registering an OAuth client on the instance and doing the browser consent flow** —
  `clientId`/`clientSecret` fields, `authorizeApp(code, clientId)`, `scope = 'read write'`, and it stores the
  authorisation in `localStorage`. In `app_scope.ex`, `read` and `write` are the **global** scopes that expand
  to every granular one — so a default install of the recommended importer asks for the widest possible scope;
- it reaches the instance through a **hosted proxy** (`getProxyApiUrl('auth/register?instance=…&redirect_uri=…')`)
  — the registration and authorisation round-trip through Framasoft's service, which is a third party holding a
  client it created on this instance. Anyone evaluating it here should decide that deliberately;
- its writes are `createEvent`, `uploadMedia` and `createGroup` — no ICS parser is in its `package.json`, and
  it also has a page-scraping module (`src/api/scrapper.js`) and `src/api/geo.js`, which is where upstream's
  open issue `!2088` ("Find Geo when importing ICS or federating Gancio events") lives.

So the "regularly fetched" sentence in the docs describes a hosted browser app with a proxy, not a poller you
would run next to n8n. The headless shape is `vranki`'s CLI, whose config holds the password in plaintext.

**The service-shaped one, read from source (the delegate's outbox asked which of the two can actually be run,
and what they do to events that change upstream).** `framagit.org/kaihuri/mobilizon-event-importer` @ `main`,
read through the GitLab API on 2026-11-04: a TypeScript/Node service (`Dockerfile`, `migrations/`, a DB),
README: *"crawl and import events from 3rd-party platforms and post them on Mobilizon or call webhooks … new
events are periodically checked and automatically published"*; sources include ICS feeds. Its credential model
is the OAuth one, not a password: `src/controllers/MobilizonOAuthController.ts`,
`src/models/mobilizon_oauth_application.model.ts` (it stores a registered client **per instance in its own
database**), and `src/services/mobilizon/graphql/auth.ts` carries exactly one document — the `RefreshToken`
mutation. The mutation documents in `src/services/mobilizon/graphql/events.ts` are `createEvent` **and**
`updateEvent`; no `deleteEvent` document appears there.

What that settles, and what it does not: the importer that is *shaped* like a scheduled writer authenticates
with a stored OAuth client and refresh token, and it **edits** events as well as creating them — so it is not a
narrower version of `06 Create event`, it is a wider one. The gap the delegate flagged (what each importer does
when a source event is edited or deleted) is partly answerable statically, as above, and **not** answerable at
all without an instance to write to; mathloco has no write path, so that measurement belongs to whoever runs it
against a test instance.

Reading `vranki/mobilizon-importer`'s `config.json.example` and `mobilizon.py` (raw files, 2026-11-04):

- its config holds **`"email"` and `"password"` in plaintext** next to `"endpoint"`, plus `"dry_run": true`;
- it authenticates with the **same `login(email, password)` and `refreshToken`** mutations cadence uses;
- it writes with the **same `createEvent`**, and additionally `updateEvent`, `updateEvent(status: CANCELLED)`
  and `DeleteEvent` — the three things cadence deliberately never does (D175's "the workflow never edits or
  deletes" boundary).

So the ICS route does **not** remove the login, the credential, the duplicate-write risk, or the
audit-after-write. It relocates them into a third-party process on another port, with a plaintext password in
its own config file, a maintainer's "low maintenance" label on the docs' side, and a wider blast radius than
the workflow being reviewed here. It also adds a service to run and a schema to keep current.

**A nuance worth recording: Mobilizon has bot *actors*, and no bot *ingestion*.**
`lib/mobilizon/actors/bot.ex` defines a `bots` schema — `source` (a string), `type` (default `"ics"`),
`actor_id`, `user_id` — added by `priv/repo/migrations/20180522133844_add_bots_table.exs`, and an instance admin
can create one with `mix mobilizon.create_bot EMAIL NAME SUMMARY TYPE URL`. But nothing in the 5.2.5-RC1 clone
*reads* that source: `grep -l Bot lib` returns `actors.ex`, `bot.ex` and the mix task; there is no
`lib/mobilizon/fetchers`, and `lib/mobilizon/cron.ex` has no bot job. So the `type: "ics"` bot is the
**identity** an external importer is meant to write as — which is exactly the shape the account question is
about — and not a server-side importer. If a third-party importer were ever run here, a bot actor is how its
rows would stop being attributed to a person.

**Ruling: option 1 stands** — A9 stays as built (one real `createEvent` row per date, from the reviewed
artifact). The ICS idea is parked with a trigger, per the "a deferral names its target" rule (D148):

> Re-open if **Mobilizon core** gains a server-side importer. Detection, one command, re-runnable:
> `curl --json '{"query":"{ __schema { mutationType { fields { name } } } }"}' $M/api/v1 | grep -oiE '"name":"[a-z]*(import|ics|ical)[a-z]*"'`
> — today it prints nothing. Also re-open if the upstream issue thread (mobilizon/mobilizon#20) gets a commit
> reference to an importer in `lib/`.

## Facts carried in from the Mobilizon workspace (their measurements, not ours)

From `~/Git/mobilizon/.notes/from-mathloco/outbox-2026-11-04-evening.md`, read 2026-11-04. Recorded here because
a future session that re-opens the ICS question should not have to ask again, and because they are cited as
that clone's own `@measured` claims against `kaihuri/mobilizon` `f2590486f`:

- **Mobilizon's own ICS export is capped and future-only:** `lib/service/export/icalendar.ex:15` →
  `@item_limit 500` for the public group feed and token feeds (`lib/service/export/feed.ex:24` → 5000 for
  RSS/Atom); `lib/mobilizon/events/events.ex:464-475` passes `DateTime.utc_now()` as the lower bound. The cap is
  a code constant — `grep -rn "event_limit" config lib` finds nothing — and `tcit` on `!983` (2021-07-16) states
  the intent ("a sane limit … only events from the last month and in the future"). Relevance: an ICS route built
  on Mobilizon's *own* feed cannot carry history, and any cap change is an upstream patch, not a config key.
- **Live-instance GraphQL shapes differ between builds** (they measured `longEvent`/`relatedEvents` on
  `keskonfai.fr`, absent from the repo schema). This is the same reason `check.mjs`'s last step does a live read
  and fails when a field moves — do not write a query from the schema file alone.
- **Upstream's posture on the automation route:** the docs draft now says "create the occurrences with the
  GraphQL API, if you already automate things", and `setop` on `!1571` said *"Maybe you can keep it as a patch
  for your instance"*. If mathloco ever cites upstream about this, cite those, not a claim that n8n is the
  recommended shape.

## What did not change

`03 Sign in` still signs in per run from `$env` (D175). `RUN.dryRun` is still `true`. Nothing was imported
into n8n, no credential was set, and cadence has still never written an event. The two requests above created
no application, no token and no event; the `name` values spell that out in case a stray row is ever found.
