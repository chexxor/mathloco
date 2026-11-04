# mobilizon-cadence — keeping the next meeting scheduled

Mobilizon 5.2.4 has no recurring events. Probed on 2026-11-04 (`records/2026-11-04-mobilizon-api-probe.md`):
there is no type or field named series / recurrence / RRULE anywhere in its GraphQL schema, and
`createEvent` takes no recurrence argument. So the club's two series exist only as a sequence of separate
rows a person makes by hand, one at a time.

This integration makes the next row, on the club's own rhythm, and proves it landed.

It runs in **n8n** (`https://n8n.labradorius.com`) as one importable workflow. Three HTTP nodes do the
talking, one Code node does the reasoning, and the reasoning is the same code the repo's tests run and
`simulate.mjs` prints from a terminal — so "what would it do" is answerable without touching the instance.

**What it would do right now** (live read, 2026-11-04, dry run):

| series | next date it would write | why |
|---|---|---|
| `mpls-social` | **Sat 2026-11-21, 12:00–14:00 America/Chicago** | last row Nov 7 + 14 days, snapped to Saturday |
| `parallel-learning` | **Wed 2026-11-25, 18:00–20:00 America/Chicago** | last row Nov 11 + 14 days, snapped to Wednesday |

## Read this first if you only read one thing

`series.config.mjs` is the whole behaviour: the two series, their spacing, their skipped dates, the planning
horizon, and `dryRun`. Nothing else in the directory needs editing to change what the workflow does.

The three rules worth arguing about are all in `lib/core.mjs`, each with its reason attached:

1. **Carry the wall clock, never the instant.** The club's own rows are inconsistent (`Etc/UTC` on the new
   ones, no zone on the old ones); carrying an instant forward moves the social to 6 a.m. The worked example
   is in the probe record.
2. **Never write a date the series already holds, and never resurrect a cancelled one.** Mobilizon offers no
   conditional create and no idempotency key, so the order is: read the window → decide → write → **read the
   date back and prove what it now holds**. A duplicate is caught and named with both uuids.
3. **A plan that has to guess is a plan that stops.** A renamed title, an account owning two actors, an
   anchor so old the rule would invent six dates: all of them become `alert`, which reaches a person.

## Commands

```bash
node integrations/mobilizon-cadence/check.mjs            # build --check + 36 tests + live read-only plan
node integrations/mobilizon-cadence/check.mjs --offline  # same, without the live read (CI / no route)
node integrations/mobilizon-cadence/simulate.mjs         # what it would do today, credentials, no writes
node integrations/mobilizon-cadence/simulate.mjs --now 2026-12-01T14:00:00Z --fixture fixtures/group-history-2026-11-04.json
node integrations/mobilizon-cadence/simulate.mjs --save fixtures/group-history-$(date +%F).json   # live read, saved
node integrations/mobilizon-cadence/build-workflow.mjs   # regenerate n8n/cadence-workflow.json
node integrations/mobilizon-cadence/repair.mjs --list    # the group's upcoming rows, with uuid and internal id
node --test integrations/mobilizon-cadence/test/*.test.mjs
```

No `package.json` here on purpose: this integration has no dependencies (Node builtins only), and D152's
recommendation for `integrations/` is "directory now, manifest when it earns one". The trigger that would
earn one is named there — a dependency the site does not use, or a schedule running on the home server
rather than in n8n.

Nothing in this directory is imported by `src/`, `worker/`, `astro.config.*` or any step in `npm run verify`.
The site keeps reading `data/events.json` from the `events-harvest` integration; Mobilizon stays the
authoring system, this only writes into Mobilizon.

## Files

| file | what it is |
|---|---|
| `series.config.mjs` | the series table, the horizon, the dry-run switch. The only file you edit to change behaviour |
| `lib/core.mjs` | the rules: clock, rhythm, guards, the copy whitelist, the audit. Pure functions, no network |
| `lib/queries.mjs` | every GraphQL document, in one place, with the 5.2.4 facts attached |
| `nodes/01-config.js` `nodes/04-plan.js` `nodes/08-report.js` | the three n8n Code nodes, as reviewable source |
| `build-workflow.mjs` | generates the importable workflow and refuses to generate a broken one |
| `n8n/cadence-workflow.json` | **the artifact** — what you import into n8n. Generated: never edit it. `check.mjs` fails if the file on disk is not byte-identical to what `nodes/` + `lib/` + `series.config.mjs` produce |
| `simulate.mjs` | the same rules, from a terminal, with no credentials and no writes |
| `repair.mjs` | the undo: list / show / delete one row by uuid, with a `--yes` gate. The workflow itself never deletes |
| `check.mjs` | build check + tests + live read-only plan, in one command |
| `test/` | 36 tests: the rules against the club's real calendar, and the *generated* Code nodes executed under a fake n8n sandbox |
| `fixtures/group-history-2026-11-04.json` | the club's calendar as the instance returned it, so tests are about real rows |
| `records/` | the probe log and its machine-readable output — where every number in these docs comes from |
| `docs/` | [`architecture.md`](docs/architecture.md) (node by node, and the build's invariants) · [`security.md`](docs/security.md) (the auth surface, and where the password is) · [`operator-guide.md`](docs/operator-guide.md) (import → dry run → enable → repair) · [`decisions.md`](docs/decisions.md) (what was rejected, and why) · [`test-plan.md`](docs/test-plan.md) (what is proven, and from where) |

## The workflow in eleven nodes

```
Trigger every morning (09:00 America/Chicago)
  └─ 01 Config                    one item: the config + the exact GraphQL documents
     └─ 02 Read the series history   POST /api/v1  (public — no credential attached, and it needs none)
        └─ 03 Sign in                POST /api/v1  login mutation; credentials from n8n's environment
           └─ 04 Plan & decide       one item per series: the decision, and the payload it would send
              └─ 05 Stop if nothing to write   action == "create"?
                 ├─ true  → 06 Create event → 07 Audit the date ─┐
                 └─ false ───────────────────────────────────────┴─ 08 Report → 22 Report a problem
                (every stage's error output → 21 Report error path)
```

Node-by-node detail, including what each execution should show, is in
[`docs/architecture.md`](docs/architecture.md).

## Start it up

1. Set the two environment variables on the n8n host and import `n8n/cadence-workflow.json` —
   [`docs/operator-guide.md`](docs/operator-guide.md) has the exact steps, including the one-minute probe
   that proves n8n will let the workflow read them.
2. Leave `"dryRun": true` (it is the first line of `series.config.mjs`, and the shipped artifact is built
   from it).
3. Run it once in the editor and read the `08 Report` output. Compare it with
   `node integrations/mobilizon-cadence/simulate.mjs` — they must agree, and both must be right about the
   dates.
4. Only then decide about `dryRun`, and read the alerting step first: a workflow that writes a date nobody
   noticed is a calendar nobody trusts.

## What this does not do

- It does not create a recurring event, a series object, or an RRULE. Mobilizon has none (probed).
- It does not touch the site. The website's events come from `data/events.json`, harvested from the ICS feed.
- It reads **one group per run**. Both series are in `@minneapolis_math_book_group`; a series in a second
  group is a deliberate refusal at build time, with the extension path named in the message.
- It writes **at most one event per series per run**, and never two series' events on the same date.
- It does not invent history. If the newest row is so old that catching up means inventing more than
  `RUN.maxCatchUpSteps` dates, it alerts instead.
