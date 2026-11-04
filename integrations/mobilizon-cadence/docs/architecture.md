# Architecture — eleven nodes, three rules, one artifact

## Why the shape is what it is

The workflow has no database, no static data, no queue, no key-value store. **The club's calendar is the
state.** Every run re-derives everything from a read of the instance, which means:

- a lost n8n execution history costs nothing;
- a run that fails halfway is fully recoverable by the next run (there is no half-written plan to clean);
- a human scheduling the next date by hand *is* understood by the workflow — the rule anchors on the newest
  real row, so a hand-made date simply moves the anchor;
- and the price: the read must be complete, because it is the only memory. Hence
  `RUN.readBackDays: 400` and `readAheadDays: 120`.

The other structural choice is that **the reasoning lives in one Code node** (`04 Plan & decide`). Everything
above it moves JSON, everything below it obeys. That is what makes the workflow testable: the same
`planSeries()` runs in the tests, in `simulate.mjs`, and inside n8n, because `build-workflow.mjs` injects the
repo file into the node rather than letting a copy live in the n8n editor.

## Node by node

### `Trigger every morning` — Schedule Trigger
`daysInterval: 1` at `09:00`, and `settings.timezone: "America/Chicago"` on the workflow, so 09:00 means the
club's 09:00 and not the n8n host's. One trigger only: **Execute workflow** in the editor runs the same path,
which is how a dry run is tested. One run a day is enough because the horizon is 28 days: a missed day is
re-derived the next day, and the dedupe makes a repeat run harmless.

### `01 Config` — Code (run once for all items)
Emits **one item**: `INSTANCE`, `CREDENTIALS`, `RUN`, `SERIES`, `groupActor`, `runAt`, and `query` — the exact
GraphQL documents the HTTP nodes will send. The documents come from `lib/queries.mjs` via injection, so an
HTTP node body is `JSON.stringify({ query: $('01 Config').item.json.query.createEvent, variables: … })` and
cannot drift from the file you reviewed.

It also refuses, in code, to plan across two groups. `build-workflow.mjs` refuses too, so the mistake is
caught at build time rather than at 09:00.

`runAt` is stamped here so every series in one execution is planned against the same instant, and so a saved
execution can be re-reasoned about afterwards.

### `02 Read the series history` — HTTP Request (public)
`READ_SERIES_HISTORY`: the group's actor id and every event in the window, with the fields a copy needs —
title, description, instants, category, language, visibility, join options, options block, physical address,
picture, tags, metadata, contacts.

No credential is attached, because the document carries no `loggedPerson` and answers unauthenticated
(measured 2026-11-04). Two things follow, and they are the point: least privilege by construction, and
`simulate.mjs` can run the identical query with zero credentials.

### `03 Sign in` — HTTP Request (the only credentialed call)
`login(email, password) { accessToken user { id actors { id preferredUsername domain } } }`. The email and
password are read as `$env.MOBILIZON_EMAIL` / `$env.MOBILIZON_PASSWORD` **in this node's body expression**,
so they are not in the workflow JSON, not in the repo, and not in the config item that every downstream node
can see. Why this is the only option, with the probes, is in [`security.md`](security.md).

No long-lived token is stored, and the `refreshToken` Mobilizon also returns is deliberately not selected.

### `04 Plan & decide` — Code (run once for all items → one item per series)
The only node that reasons. It unwraps both responses (a GraphQL error with HTTP 200 is a failure —
measured behaviour of this instance), resolves the actor ids, then for each series:

1. find the rows that belong to this series (`title` + `aliases`, normalised);
2. pick the newest live row as the anchor; read the **wall clock** in the zone *that row declares*, falling
   back to the series zone when the row declares none;
3. compute the next date: `+everyDays`, then `weekdaySnap` forward only, then past any `skipDates`, then
   catch up until the date is in the future (max `RUN.maxCatchUpSteps`, then alert);
4. run the guards in this order — horizon → already-scheduled → another meeting that night → enough dates
   ahead → short-lead note;
5. only then build `createVars` from the copy whitelist, and set `action` to `create` or `would_create`
   according to `RUN.dryRun`.

The item it emits is the whole audit trail of that decision: `action`, `reason`, `notes[]`, `anchor`
(which row it learned from, and what zone that row claims), `candidate` (the date, the wall clock, and the
two instants), `createVars`, `auditVars`.

### `05 Stop if nothing to write` — IF
`{{ $('04 Plan & decide').item.json.action }} == "create"`. True branch → the write; false branch → the
report. This one comparison is the only thing in the graph that can start a write, and `test/workflow.test.mjs`
asserts it (both the condition itself and that no other edge points at `06 Create event`).

### `06 Create event` — HTTP Request (bearer)
`createEvent` with `createVars` as variables — **never string interpolation**, so nothing the calendar holds
can become query syntax. Retried at the node's default batching, which is safe precisely because `04` re-reads
the date before deciding.

### `07 Audit the date` — HTTP Request (bearer)
`AUDIT_DATE_WINDOW`: every row in the group on the candidate date ±1 day, in the series' zone. This is not a
nice-to-have. Mobilizon has no conditional create, so the only honest duplicate guard is "prove what the date
now holds": the event we made is there, its instant and title came back as planned, and **it is the only row
for that series on that date** — which also catches a human who made the same meeting a minute earlier.

### `08 Report` — Code (run once for all items)
Prints the ledger in the execution log: one line per series, the date, the reason, the audit verdict, the
notes, and for a dry run the exact payload. A night where everything skipped is a *normal* night and prints
as one. It throws if the audit disagrees — a red execution is the alarm, and the throw message carries the
whole summary.

Pairing created events to plans is done by (title, instant), not by item order: the graph preserves order
today, and a rule that depends on that breaks the first time someone inserts a node.

### `21 Report error path` and `22 Report a problem` — the two terminals
`21` is fed only by the **error** outputs of `02`, `03`, `04`, `06`, `07`, `08`; it says which stage broke
(`failedAt: ["read"]` vs `["write"]` vs `["audit"]`) and puts the server's own message in the body. A red dot
on a canvas is not an alert; `alertTitle` / `alertDetail` are there so a notification node can be wired to
either terminal without inventing a shape.

`22` is fed by `08`'s main output and turns *plan-level* alerts (a rename, a clock mismatch, every row
cancelled) into the same failure shape. Neither terminal is downstream of the other, so a clean run can never
reach the error reporter and throw there — the build asserts that no main edge points at `21`.

## The invariants the build enforces

A generation step is only worth having if it refuses to generate something wrong. `build-workflow.mjs` fails
on each of these, and each corresponds to a way n8n fails *at execution time* rather than at import time:

| check | the failure it prevents |
|---|---|
| every `$('name')` resolves to a node in the graph | an expression silently evaluating to `undefined` |
| every Code node parses (`new Function`) | a mangled here-string producing a node that throws on run |
| no top-level name declared twice in one Code node | "Identifier 'addDays' has already been declared" |
| every URL on the configured host, at `/api/v1`, body JSON | writing to the wrong host; a GraphQL path that 404s |
| `neverError: false` on every HTTP node | a refused write reported as success |
| no `credentials` blocks; no literal shaped like a secret; the password reachable only as `$env.NAME` | a secret committed to the repo, or exported inside a workflow JSON |
| the IF compares `.action` against exactly `"create"`, `branchMode: matchingBranch`, and only that edge reaches the write | a dry run that can still write |
| the error reporter is reachable only from error outputs | a clean run arriving at a node that requires `$json.error` |
| every node except the trigger and the two reporters has its error output wired to `21`, and both reporters are terminals | a node added later that fails silently in a scheduled run |
| `RUN.dryRun === true` still routes the decision through `core.mjs` | a plan node that stopped honouring the dry-run switch |
| every series has `key/title/groupActor/everyDays/timezone`, `everyDays` a positive integer, `weekdaySnap` 0–6 or null | a config typo discovered as a missing event in December |
| `--check` also compares the artifact **on disk** with what the sources produce, and refuses | importing a workflow whose rules are not the ones the tests ran |

## Extending it

- **A new series**: add a block to `series.config.mjs`. Nothing else changes; the tests and `simulate.mjs`
  both pick it up, and `--now`/`--fixture` let you rehearse its first six months before it runs.
- **A second group**: the graph is a straight line with one read, so this needs a per-group loop (Split Out
  into a sub-workflow). It refuses at build time rather than planning one group and forgetting the other.
- **A new field to carry**: add it to the read in `lib/queries.mjs` *and* to the whitelist in `copyAddress` /
  `copyOptions` / `buildCreateVars`. The whitelist is a whitelist on purpose: `id`, `uuid`, `url`,
  `remainingAttendeeCapacity`, `attendees`, `publishAt` and `insertedAt` are read but must never be copied,
  and a test asserts the dangerous ones are absent.
- **A second Mobilizon instance**: `INSTANCE` is the only place the host appears, and the build refuses any
  node pointing elsewhere.
- **Notifications**: wire a notification node to `21` and `22`. Both emit
  `{ ok: false, failedAt, alertTitle, alertDetail, summary }`. See [`security.md`](security.md) before
  pointing a notification at `08` — the report body quotes event text.
