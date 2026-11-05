# Security and credential handling

Written for the person who has to hand this to a delegate, or come back to it in a year and decide whether
it is still safe.

## What is actually being protected

| thing | why it matters | the main risk |
|---|---|---|
| the Mobilizon account | it can publish, edit and delete the club's public calendar | a password copied into the repo, an execution, or a screenshot |
| the calendar itself | members show up; a duplicate or a wrong-hour event is a real-world harm | an automation nobody can explain afterwards |
| the rest of the rig | n8n on this host can reach other services | over-privileged credentials, and the workflow JSON as a portable attack surface |

The workflow JSON is the interesting one: an n8n export is a single portable file that people paste into
chat windows, agent sessions and issue trackers. So the rule is:

> **`n8n/cadence-workflow.json` must be safe to publish.** No credential value may appear in it — only the
> *names* of environment variables. `build-workflow.mjs` fails the build if anything credential-shaped
> appears (`"password"`, `"accessToken":`, `"Basic `, `"Bearer ey`, `eyJ`), and
> `test/workflow.test.mjs` asserts the same thing against the generated artifact.

## The auth decision, and what was ruled out

Measured against `mobilizon.labradorius.com` on 2026-11-04 (full output in
[`../records/2026-11-04-mobilizon-api-probe.md`](../records/2026-11-04-mobilizon-api-probe.md)):

| option | probe result | verdict |
|---|---|---|
| n8n's built-in **Basic Auth** on the HTTP node | a bogus `Authorization: Basic …` produces the byte-identical `unauthenticated` error as no header at all | **not supported** by Mobilizon's GraphQL endpoint |
| n8n's **OAuth2 credential** (password or client-credentials grant) | `POST /oauth/token` with `grant_type=client_credentials` → 400 *"Incorrect parameters sent…"*; the upstream clone at `f2590486f` implements exactly three grants — `authorization_code`, `urn:ietf:params:oauth:grant-type:device_code`, `refresh_token` (no `password`, no `client_credentials`) | **not usable as n8n's OAuth2 credential** — that form needs a grant this instance does not implement |
| an **OAuth app + bearer token**, driven by a Code node (register at apex `POST /apps`, authorise once, refresh in-band) | `POST /apps` on the apex with an incomplete body → 400 `invalid_request` *"All of name, scope and redirect_uri parameters are required to create an application"*; `POST /login/device/code` → 400 *"You need to pass both client_id and scope…"*; `POST /oauth/token` with a bogus refresh token → 400 `invalid_grant`. `/api/v1/apps` falls through to the GraphQL router, which is where D177's "no client-registration route" came from | **available, not adopted (D185)**: it removes the password from n8n but costs a client registration (a `client_id`/`client_secret` pair on the instance, rate-limited 10/min/IP), one human authorisation step, and a rotating refresh token that still has to live on that host. Scopes are granular (`write:event:create`, `read:group:events`, …) so a service account can be narrow |
| a **personal access token** in a Header Auth credential | no such mutation in the schema (`login, refreshToken, revokeApplicationToken, authorizeApplication, authorizeDeviceApplication, createFeedToken, deleteFeedToken` are all that exist; `__type(name: "ApplicationToken")` → `null`, and the only token-ish query is `authApplication`) | **does not exist** on 5.2.4 |
| an **OAuth access token in n8n's Header Auth credential** | `POST /api/v1` with `authorization: Bearer not-a-real-token` → `{"message":"invalid_token","details":":invalid_token"}`, which is an OAuth-layer refusal and **not** the `unauthenticated` GraphQL error an empty bearer gives — so bearer tokens are honoured at this endpoint (Basic is not) | **works at the HTTP layer, not adopted (D185)**: the token has to be obtained through a consent/device step and then refreshed, so the workflow needs the refresh logic anyway; if the operator chooses a service account, this is where the token would live — `03 Sign in` becomes a refresh call |
| a **long-lived session token** stored as a credential | it expires, and when it does the failure looks like a broken integration | rejected: a secret that expires silently is worse than a sign-in |
| **`login(email, password)` per run**, in one node, from environment variables | validated against the live schema; the bogus-credential probe returns a credential error, not a validation error | **adopted** |

The consequence is honest and worth stating: **the password is sent on every run.** That is the price of an
API whose only credential is a password. Two things keep the price low — the value lives in one node's body
expression rather than in the workflow document, and the session token it buys is used by exactly two nodes
and then dropped by the end of the execution.

`login` also returns a `refreshToken`. The document deliberately does not select it: a refresh token is a
long-lived secret that would buy one fewer round trip a day.

## Where the secret lives

`series.config.mjs` carries **names only**:

```js
export const CREDENTIALS = { emailEnv: "MOBILIZON_EMAIL", passwordEnv: "MOBILIZON_PASSWORD" };
```

The build refuses this field if it is ever given a value instead of an environment-variable name
(`/^[A-Z][A-Z0-9_]*$/`), so "just paste the password here while testing" fails the gate rather than shipping.

`03 Sign in` reads them in its body expression:

```
={{ JSON.stringify({ query: $('01 Config').item.json.query.signIn,
                     variables: { email: $env.MOBILIZON_EMAIL, password: $env.MOBILIZON_PASSWORD } }) }}
```

Why not an n8n **credential** (the encrypted store)? Because Mobilizon's credential is a *body* payload, and
n8n's credential types that can attach to an HTTP request attach headers or query parameters. Header Auth
would work — `Authorization: Bearer <token>` — if there were a long-lived token to put in it, and there is
not (row above). Corrected 2026-11-04 (D185): an OAuth client **can** be registered on this instance, at the
apex `POST /apps` — the earlier "no client-registration route" note was `/api/v1/apps` falling through to the
GraphQL router. But it does not make the OAuth2 *credential* type work, because the grants this instance
implements (`authorization_code`, device code, `refresh_token`) all need a human authorisation once and then a
**rotating** refresh token; n8n's OAuth2 credential cannot complete the consent step, and a `client_secret`
alone buys nothing. So the upgrade path, if the operator wants a scoped service account rather than a password,
is: register a client with narrow scopes, do the device/consent step once by hand, store the refresh token on
the host, and let a Code node exchange it — `03 Sign in` is still the only node that changes.

### Verify that n8n will read them (one-minute probe)

Whether expressions can see `$env` depends on the n8n host's `N8N_BLOCK_ENV_ACCESS_IN_NODE` setting, which
this integration cannot read from here. So the operator guide asks for a probe rather than assuming — and the
probe is a **generated artifact** (`n8n/env-probe.json`, from `build-probe.mjs`), not a snippet to type, so
that its read-only-ness is checked rather than promised (D183). It reports which of the two wanted names are
**present**, never their values, and it also answers the other halves of a 09:00 failure: whether that host can
reach `/api/v1` at all, and whether the apex OAuth route answers from that network (D185). That last question
is asked with an **intentionally incomplete** `POST /apps` — the instance refuses it by name (`invalid_request`),
which proves the route without registering anything, and `checkProbe()` refuses a probe that ever sends a
`scope`, `redirect_uri`, `client_id`, `client_secret` or `grant_type` parameter, so the instrument cannot mint
a credential. Its fallback is the one-line Code node in the guide; the reason the variables must be in the
*service* environment is that n8n reads its environment at process start.

## The exposure nobody should discover by accident

The sign-in node's request body — and therefore that node's **input/output data in the execution log** —
contains the password in plaintext. Upstream n8n's default is to save data for successful and failed executions;
**this instance's packaged default is the opposite** (`EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`,
`EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=false`, D199), which is why a dry run used to read back as
`Execution '2' not found`.

This workflow states its own retention instead of inheriting either default (`RETENTION` in `series.config.mjs`, spread
into both artifacts, asserted by both builders and by `test/workflow.test.mjs`: `saveDataSuccessExecution:
"all"`, `saveDataErrorExecution: "all"`, `saveManualExecutions: true`, `savePreExecutionData: false`). The ledger in
`08 Report` is the point of a scheduled run and there is nowhere else this integration writes its findings, and the
per-workflow setting is what keeps *other* workflows on the box from keeping their own run data (D201). The
mitigations that come with that choice, in the operator guide:

1. **Prune on the host**: `EXECUTIONS_DATA_PRUNE=true`, `EXECUTIONS_DATA_MAX_AGE=168` (hours). A stored
   password should not outlive the week it was used in.
2. **Treat execution screenshots and JSON exports as secrets.** Before pasting an execution into a chat, a
   bug report or an agent session, expand nothing under `03 Sign in`; the safe object to share is the
   `08 Report` output.
3. If you would rather have no stored data at all for this workflow, set **Settings → Save Execution Data →
   None** for it. The cost: a scheduled run you did not watch becomes unreadable, and `08 Report`'s ledger is
   gone. This integration is designed so that cost is survivable (the calendar is the state, and the next run
   re-derives everything) — but the alerting story has to be in place first.
4. Use a **dedicated account** (next section), so the value in an execution log is a scoped credential that
   can be rotated without touching the organizer's own login.

**A lever this repo has read but not measured (D204).** The instance's own OpenAPI documents
`settings.redactionPolicy` — `none` (the default: *"No redaction. All execution data is stored."*), `non-manual`,
`manual-only`, `all` — and a read-side `GET /executions/{id}?redactExecutionData=false` that "requires the
`execution:reveal` scope". So as shipped, the password **is** stored unredacted, and there is a per-workflow switch
about it. Not measured: whether redaction masks only secrets or the node's whole output, which would undo what the
retention flags buy. The experiment is in
[`records/2026-11-05-rest-door-retention-and-redaction.md`](../records/2026-11-05-rest-door-retention-and-redaction.md)
§4 — three steps, needs no Mobilizon credential, and its result belongs in `RETENTION` rather than in a comment.

## Least privilege: the account this should run as

The instance reports `users.total: 1` and `openRegistrations: false` — today the workflow would sign in as
the organizer, who is also the instance's only account. That is the wrong credential to spend daily. The
operator's offer of a dedicated user is the right fix, with these specifics:

- an account whose **only** relationship to the club is membership/organizer of `@minneapolis_math_book_group`;
- **not** an instance admin — nothing this workflow does needs admin, and an admin credential in an n8n
  environment is a much bigger blast radius;
- created by the instance admin (the Mobilizon admin UI, or `mix mobilizon.users.create …` on the host, since
  registrations are closed);
- given a **strong, unique password it will never be typed by a human** — it exists to be pasted once into
  the environment;
- if it is ever retired, delete/disable it and the workflow stops loudly (the sign-in node fails →
  `21 Report error path` names `sign in`). A credential that stops working visibly is safer than one that
  stops working quietly.

`04 Plan & decide` adds one more guard that is a security property as much as a correctness one: it refuses to
write when the signed-in account owns more than one local actor, rather than picking one and possibly
attributing the club's event to the wrong identity.

## What reaches where

| place | what it contains | note |
|---|---|---|
| this repo | config, rules, queries, the workflow JSON with env **names** | no credential, no personal data beyond the club's own published event text |
| n8n workflow JSON (export) | as above | safe to publish, and asserted so |
| n8n execution data | the sign-in body (password, unredacted unless `settings.redactionPolicy` is set — D204), the GraphQL bodies, the report ledger | prune it; treat screenshots as secrets |
| n8n / server logs | request URLs (one host, `/api/v1`) — assume bodies may appear | another reason the endpoint is HTTPS and the host is one |
| the Mobilizon instance | the events it creates, which are public | the club's own description/address/venue text is copied verbatim |
| the mathloco site | nothing | the site reads `data/events.json` from `events-harvest` (D73) |

Note the last row is a real privacy consideration: the description text copied into a new event is
Mobilizon's own HTML for the club's meeting, and it will be published on the club's public calendar. Nothing
private is carried: contacts are copied as `{ id }` references, participant lists and
`remainingAttendeeCapacity` are explicitly never copied.

## If a secret leaks

1. Change the dedicated account's password in Mobilizon (or disable the account).
2. Update the environment variable on the n8n host and restart n8n (the environment is read at process start).
3. Prune execution history (`Settings → Executions → Delete`, or lower `EXECUTIONS_DATA_MAX_AGE`).
4. Re-run `node integrations/mobilizon-cadence/check.mjs --offline` and then a dry run, to confirm the
   workflow is the only thing that changed.

The workflow itself needs no edit in that sequence — which is the point of keeping the value out of it.

## The n8n platform account

Nothing in this integration uses the n8n REST API or its API key: the workflow is imported by hand and run by
its own trigger. The n8n instance sits behind the host's SSO (a probe of `n8n.labradorius.com/healthz` and of
the API returned a `302` to the login wall rather than a JSON answer), which is the right posture — the
boundary that matters for "who can run this workflow" is n8n access, not the workflow file.

If the operator keeps an n8n public API token around for other work, note two things: the one shared for this
task decodes to an expiry of **2026-12-04**, and this integration has no reason for it to exist. Delete or
scope it once the review is done.

## Audit trail — who did what to the calendar

Three independent records, none of which depends on the others:

1. **the n8n execution** — `08 Report` prints, per series, the action, the reason, the anchor row it learned
   from, the candidate date, the audit verdict and the payload it sent (or would have sent);
2. **the Mobilizon instance** — the event exists, with the uuid the create returned, and the group's feed
   reflects it;
3. **this repository** — the rules that produced it, the config that parameterised them, and the tests that
   pin the behaviour.

That is deliberate: the workflow has no database of its own, so the question "why is this event on the
calendar" must be answerable from the execution log and the calendar alone.
