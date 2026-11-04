# Mobilizon API probe — 2026-11-04

Everything in this directory rests on the measurements below. Each was taken against
`https://mobilizon.labradorius.com` on 2026-11-04, from this rig (Linux, Node v24.22.1), over the public
route. Machine-readable output: [`evidence-2026-11-04.json`](./evidence-2026-11-04.json). Reproduce with the
commands in each section; none of them writes, and the credential probes use deliberately bogus values.

## Identity

`GET /.well-known/nodeinfo/2.0` → 200

```
software: { name: "Mobilizon", version: "5.2.4" }
usage:    { users: { total: 1 }, localPosts: 5 }
openRegistrations: false
```

Consequences: one account on the instance today (the organizer's), nobody can self-register, and a
second account for automation has to be created by the instance admin. `localPosts: 5` matches the five
events below.

## The GraphQL endpoint is `/api/v1`

| request | result |
|---|---|
| `POST /api/v1` `{"query":"{__typename}"}` | 200, executes |
| `POST /graphql` (same body) | **404** `{"msg":"Resource not found"}` |
| `POST /api/v1/apps` `{}` | GraphQL response: `"No query document supplied"` — i.e. no app-registration route; the path falls through to the GraphQL router |

`/graphql` is the path the public docs lead you to expect. It 404s here. `series.config.mjs` carries
`graphqlPath: "/api/v1"` so nobody has to remember that, and `build-workflow.mjs` refuses to build an HTTP
node pointed at any other path.

## GraphQL errors are HTTP 200

Every failure below was a **200** at the transport layer:

```json
{ "data": { "loggedPerson": null },
  "errors": [ { "code": "unauthenticated", "message": "You need to be logged in",
                "path": ["loggedPerson"], "status_code": 401 } ] }
```

```json
{ "data": { "login": null },
  "errors": [ { "code": "unknown_error", "message": "Impossible to authenticate, either your email or password are invalid.",
                "path": ["login"], "status_code": 500 } ] }
```

So `data` can be present *and* `errors` present, and the embedded `status_code` is not the HTTP status.
That is why every read in this integration goes through `unwrap()` in `lib/core.mjs`, and why
`neverError` is pinned to `false` on every HTTP node by the build: an n8n node that reports success on a
GraphQL error would make a refused write look like a successful one.

## The auth surface (this decides the whole workflow shape)

Probed 2026-11-04 with bogus values only — no real credential left this machine:

| probe | result | what it rules out |
|---|---|---|
| `{loggedPerson{id}}`, no `Authorization` | `unauthenticated` | — (baseline) |
| same query with `Authorization: Basic Zm9vOmJhcg==` | **byte-identical** `unauthenticated` error | HTTP Basic is not honoured at this endpoint. n8n's built-in "Basic Auth" node option cannot authenticate here |
| `POST /oauth/token` `grant_type=password&username=x&password=y` | 400 `"…you need to provide at least the grant_type and client_id parameters"` | the OAuth2 provider exists, but there is no client to use it with |
| `POST /api/v1/apps` | falls through to the GraphQL router | no Mastodon-style dynamic client registration |
| introspection: mutations matching `/token\|login\|oauth\|app\|session\|client/i` | `acceptInvitationToken, approveMember, authorizeApplication, authorizeDeviceApplication, createFeedToken, deleteFeedToken, login, refreshToken, revokeApplicationToken` | no "create a personal access token" mutation |

What is left is the documented path: **sign in per run.**

```graphql
mutation CadenceSignIn($email: String!, $password: String!) {
  login(email: $email, password: $password) { accessToken refreshToken user { id actors { id preferredUsername domain } } }
}
```

`login` takes **`email`**, not a username, and returns **`accessToken`**. An earlier draft of the generated
workflow read `data.login.sessionToken`; that field does not exist on 5.2.4, and the mistake would have
surfaced as `Cannot read properties of undefined` inside the first credentialed node — days later, on a
day nobody was watching. The document above is validated against the live schema (the bogus-credential
probe returns a *credential* error, not a validation error), and the generated workflow is asserted against
the same shape in `test/workflow.test.mjs`.

`login` also returns a `refreshToken`. The workflow deliberately does **not** select it: a refresh token is
a long-lived secret, and the only thing it would buy is skipping one round trip per day.

## There is no recurrence primitive — this is the reason the integration exists

Introspection, 2026-11-04:

- types matching `/series|recur|rrule|rule/i`: **none**.
- mutations matching `/series|recur|rule|event/i`: `createEvent, deleteEvent, exportEventParticipants,
  joinEvent, leaveEvent, sendEventPrivateMessage, updateEvent` — no "create series", no "add occurrence".
- `createEvent` / `updateEvent` arguments, in full: `attributedToId, beginsOn, category, contacts, description,
  draft, endsOn, externalParticipationUrl, joinOptions, language, metadata, onlineAddress, options,
  organizerActorId, phoneAddress, physicalAddress, picture, publishAt, status, tags, title, visibility`
  (plus `eventId` on update). **No recurrence field of any kind.**
- `createEvent` takes **flat named arguments**, not a single input object (`CreateEventInput` does not exist).
- `Event` has a `relatedEvents` field. This integration does not read it, so no claim is made here about
  what it selects.

So "the next one" has to be created by someone. That is the job.

## The five rows, as the instance stores them

`group(preferredUsername: "minneapolis_math_book_group")` — group actor **id `4`**, `domain: null` (local).

| id | title | beginsOn (stored) | endsOn (stored) | `options.timezone` | picture uuid |
|---|---|---|---|---|---|
| 5 | Parallel Learning for Mathematical Minds | 2026-11-11T18:00:00Z | 2026-11-11T20:00:00Z | `Etc/UTC` | — |
| 4 | MPLS Math Club - Bimonthly Social | 2026-11-07T12:00:00Z | 2026-11-07T14:00:00Z | `Etc/UTC` | c9110656-24d2-435e-b1c1-99a59d77690b |
| 3 | MPLS Math Club - Bimonthly Social | 2026-06-05T17:00:00Z | 2026-06-05T18:00:00Z | `null` | 6660cbd4-b45c-4a7e-986b-0b19eed51241 |
| 2 | MPLS Math Club - Bimonthly Social | 2026-05-22T17:00:00Z | 2026-05-22T18:00:00Z | `null` | 09bdfc5f-cdae-4fb0-bf8c-21a01a223310 |
| 1 | MPLS Math Club - Bimonthly Social | 2026-05-08T17:00:00Z | 2026-05-08T18:00:00Z | `null` | e9cd0edd-1051-4740-b947-4c81dd0370bd |

`options.maximumAttendeeCapacity` is `0` on all five. `Event.organizerActor` reads back as `null` over an
unauthenticated connection, which is why the organizer actor id is resolved from the sign-in response
rather than copied from the previous event.

No probe events remain: the group's `organizedEvents.total` is 5, and all five are organizer-authored.
(The write path was exercised earlier the same day with draft/private events that were then deleted; the
`total: 5` above is the evidence that nothing was left behind.)

## The clock trap, and why the rule carries the *wall clock*

Two different conventions appear in those five rows:

- ids 1–3 sit at **17:00Z** with no declared zone. 17:00Z is **12:00** in `America/Chicago` in May and June.
- id 4 sits at **12:00Z** with `options.timezone: "Etc/UTC"`, so the organizer sees **12:00**.

Same wall clock — 12:00 — entered two different ways. The newer rows were entered with the event's timezone
set to `Etc/UTC`, so their stored instant is five hours off the club's real hour: as id 4 is stored, that
social starts at **06:00** Central.

This is the whole reason `lib/core.mjs` never carries an *instant* forward. It reads the wall clock the
organizer sees in the row (12:00), and stamps it in the series' declared zone (`America/Chicago`):

| rule | next social would be |
|---|---|
| carry the wall clock (what the code does) | **2026-11-21 12:00 America/Chicago** = 18:00Z ✅ matches ids 1–3's intent |
| carry the instant (the naive rule) | 2026-11-21 12:00Z = **06:00 local** ❌ a bakery social at six in the morning |

The same for Parallel Learning: the row is 18:00Z/`Etc/UTC`, the rule produces 18:00 local (an evening
session); carrying the instant would produce a noon session.

The rule is therefore *correct but corrective*, and it says so out loud: the plan carries a
`TIMEZONE:` note naming the row, the zone it declares, and the clock it carried, and
`series.strictTimezone: true` turns that note into a refusal. **Fix the two `Etc/UTC` rows in Mobilizon and
the note disappears** — that is the operator action this probe recommends.

## The ICS feed (for contrast — the site consumes this, the cadence does not)

`GET /@minneapolis_math_book_group/feed/ics` → 2578 bytes, 2 VEVENTs (upcoming only):

- **no `RRULE`** (nothing to repeat), **no `TZID`**, **no `BEGIN:VTIMEZONE`**;
- wall clocks stamped `Z`: `DTSTART:20261107T120000Z`, `DTSTART:20261111T180000Z`;
- LF line endings, not the CRLF RFC 5545 requires; unfolded long lines.

That is the site's harvester's problem to normalise (the integrations boundary is D152, and the
snapshot-not-proxy rule is D73 — both one line in `DECISIONS.index.md`), not this one's. The cadence writes through GraphQL, which returns ISO-8601 instants plus an
explicit `options.timezone` — which is why it can be correct about the clock at all.
