# Test plan — what is proven, and from where

```bash
node integrations/mobilizon-cadence/check.mjs             # build check + 36 tests + live read-only plan
node integrations/mobilizon-cadence/check.mjs --offline    # the same without the live read
```

Three layers, chosen so that each one catches what the others cannot.

## Layer 1 — the rules, against the club's real calendar (`test/core.test.mjs`, 24 tests)

`lib/core.mjs` is pure: instants in, decisions out. It runs against
`fixtures/group-history-2026-11-04.json` — the group's own rows as the instance returned them on 2026-11-04,
uuids and all. Every test came from a row that exists.

| what it pins | tests |
|---|---|
| **the clock rule** — a wall clock becomes the right instant on both sides of a DST boundary (Nov 21 12:00 → 18:00Z; Jul 4 12:00 → 17:00Z); the same instant reads differently in `Etc/UTC` and `America/Chicago`; a wall clock that does not exist (2026-03-08 02:30) is refused rather than shifted; an unknown zone is refused | 1–4 |
| the row's own declared zone wins, and the series zone is used only when the row declares none (the May/June rows) | 5 |
| calendar arithmetic happens on dates, an event past midnight is expressed as one, and `2026-02-30` is not a date | 6 |
| the weekday snap only ever moves a date **later** | 7 |
| the rhythm: next date from the last real row; `skipDates` stays skipped and the chain keeps its spacing; a gap is caught up and an absurd gap (`needs a human look`) is refused | 8–10 |
| series matching survives case and spacing and honours `aliases`, but a **typo does not match** — a typo starts a second series, loudly | 11 |
| **the copy whitelist** — an address is copied as a value, never as a shared row (`id`/`originId`/`url` dropped); option counts of the old meeting are not copied; `maximumAttendeeCapacity: 0` is dropped; the write body carries no `id`, `uuid` or `publishAt`; the picture travels as `mediaUuid` | 12–14 |
| **the decision on the real calendar** — `mpls-social` → 2026-11-21 18:00Z, `parallel-learning` → 2026-11-25 (ends 2026-11-26T02:00Z), and the `TIMEZONE:` note is present in both plans | 15 |
| the guards: a date that already exists is never written twice (including a **cancelled** row, and one that declares a different zone); a different meeting on the same night stops the write; enough dates ahead is a skip; a date past the horizon is left alone | 16–19 |
| the alerts: a rename is an alert and never a new series; every row cancelled is an alert; `strictTimezone` turns the clock warning into a refusal | 20–22 |
| the audit catches a duplicate on the date, including one a human made a second earlier; and a GraphQL error is a failure even though the HTTP call succeeded (both the `errors`-only and the `data`+`errors` shapes measured on 5.2.4) | 23–24 |

## Layer 2 — the generated artifact, executed (`test/workflow.test.mjs`, 12 tests)

These do not read the source files. They rebuild `n8n/cadence-workflow.json`, take each Code node's
`jsCode` **as it will be imported**, and run it under a fake `$('name')` sandbox. That catches the failure
class Layer 1 cannot: a build that injects the wrong file, a here-string that mangles a template literal, a
renamed node that leaves an expression pointing at nothing, an accidental credential in the JSON.

| what it pins | tests |
|---|---|
| the node list, `executionOrder: v1`, the workflow timezone, no pinned data, and every connection naming a node that exists | 1 |
| every HTTP node: one host, the `/api/v1` path 5.2.4 actually serves, `sendQuery: false`, `neverError: false`, body JSON, and the document arriving by expression rather than retyped text | 2 |
| only the two writing nodes carry an `Authorization` header, it is exactly this run's session token, the password is reachable only as `$env.NAME`, no `credentials` block, and nothing credential-shaped appears as a literal | 3 |
| the injected config equals the repo config, `dryRun` is `true` as shipped, the config exposes every document the HTTP nodes ask for, and the IF gate is the **only** edge that can reach `06 Create event` | 4 |
| the plan node, as n8n will run it, produces two items — Nov 21 and Nov 25 — with the right instants, the venue, the picture, the timezone note, the audit window, and `would_create` rather than `create` | 5 |
| it refuses rather than guessing: an account owning 0 or 2 local actors, a GraphQL error hidden in a 200, a read that returned no group | 6 |
| the report accepts a clean run and prints both series, both dates, the audit verdict and the timezone note | 7 |
| the report **fails the execution** when the audit finds two events on one date, and when a write claimed success but the event is not in the group's list | 8–9 |
| a night where every series skipped is a normal night, not an error | 10 |
| the alert reporter and the error reporter: the failure shape a notification can use, and `failedAt` naming the stage that broke (and refusing to pretend when none did) | 11–12 |

## Layer 3 — the live read, with no credentials (`check.mjs` step 3)

`simulate.mjs` performs the real `READ_SERIES_HISTORY` against `mobilizon.labradorius.com` and prints the plan
it would send. It writes nothing, needs no secret, and is the step that fails when Mobilizon upgrades and a
field, a path or an event title moves. `--now` and `--fixture` rehearse other dates against the saved
snapshot:

```bash
node integrations/mobilizon-cadence/simulate.mjs --now 2026-12-01T14:00:00Z --fixture fixtures/group-history-2026-11-04.json
```

There is **no live write** in any test. The write path was exercised by hand on 2026-11-04 (draft/private
events created and then deleted — see the probe record, and the group's `total: 5` as proof nothing was left
behind).

## What tests cannot prove, and what covers it instead

| not provable in a test | the cover |
|---|---|
| that the credential is valid, or that n8n can read `$env` | step 0 of the operator guide: the `$env` probe, then the first dry run's `03` panel |
| that n8n evaluates the expressions as the tests assume | the first dry run, reading `04`'s items |
| that the IF node survives an n8n version change | guide step 1: open `05` once after import |
| that Mobilizon renders the event the way the plan intends | guide step 6: look at the event in the Mobilizon UI, and at the site after a harvest |
| retry/idempotence behaviour under a partial network failure | the audit is the guard; the duplicate drill in guide §8 |
| that the club *wants* these dates | the operator, reading `simulate.mjs` output — which is why the dry run is the shipped default |

## Acceptance checklist for the first live run

All four must hold before the workflow is left activated:

1. a dry run whose `08 Report` output agrees with `simulate.mjs`, and whose dates you recognise;
2. a plan item whose `createVars` you have read as a member would read them (hour, venue, description, picture);
3. the alerting wired (`21` and `22` reach you);
4. after one real write: the audit line reads `ok (1 row(s) on the date)`, the Mobilizon UI shows the hour
   you expected, and `simulate.mjs` now says `skip` for that series rather than `would_create`.

## When to re-run what

| trigger | run |
|---|---|
| any change to `lib/`, `nodes/`, `series.config.mjs` | `node integrations/mobilizon-cadence/build-workflow.mjs` (it writes the artifact), then `check.mjs` — whose build step **fails** if the artifact on disk is not byte-identical to what the sources produce, so a stale committed artifact is caught rather than imported |
| a Mobilizon upgrade | `check.mjs` — the live step fails if a query, field or path moved; re-read the probe record's assumptions |
| an n8n upgrade | import into the new version, open `05 Stop if nothing to write`, re-run a dry run |
| a series renamed in Mobilizon | expect `alert / no_rows_for_series`; add the old title to `aliases` if the rename is real |
| before enabling writes for the first time | `check.mjs`, then the guide's §3–§6 in order |
