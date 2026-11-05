# Operator guide — import, dry run, enable, repair

Written as steps, in order, with the check that tells you each step worked. The workflow ships in **dry
run**: nothing can be written until you change one line.

## 0. Before you import

You need:

- the Mobilizon account this will run as (see [`security.md`](security.md) — a dedicated group member, not the
  organizer's own account, and not an instance admin);
- two environment variables **on the n8n host**, under the names `series.config.mjs` declares:

  ```
  MOBILIZON_EMAIL=…
  MOBILIZON_PASSWORD=…
  ```

  They must be in the *service* environment (systemd unit drop-in, the container's env file, or however n8n is
  started on that host) — n8n reads its environment when the process starts, so set them and **restart n8n**.

- the artifact: `n8n/cadence-workflow.json`. If you changed `series.config.mjs` or anything in `lib/` or
  `nodes/`, regenerate first:

  ```bash
  node integrations/mobilizon-cadence/build-workflow.mjs
  node integrations/mobilizon-cadence/check.mjs --offline
  ```

**Probe that n8n can actually see them** (this depends on the host's `N8N_BLOCK_ENV_ACCESS_IN_NODE`, which
nothing in this repo can read from here). Import the second artifact — `n8n/env-probe.json` — and press
**Execute workflow**. Six nodes, in a line: `P0 Run me (there is no schedule here)` → `P1 What this host can
see` (`$env`) → `P2 Mobilizon on the apex` (GET `/.well-known/nodeinfo/2.0`) → `P3 Mobilizon on the GraphQL
path` (POST `{ __typename }` to `/api/v1`) → `P5 Mobilizon on the OAuth app route` (POST `/apps` with a body
that is incomplete **on purpose**) → `P4 Report what I found`. The report node puts the whole answer in
one string so you do not have to interpret the UI:

```json
{ "ok": true, "verdicts": [],
  "summary": "cadence environment probe - read only, nothing was written\nasked at   2026-11-04T15:00:00.000Z (…)\ntarget     https://mobilizon.labradorius.com/api/v1\nnodeinfo   Mobilizon 5.2.4 at /.well-known/nodeinfo/2.0\ngraphql    answers, root type RootQueryType\noauth      POST /apps answered invalid_request - the route is live (asked with an incomplete body: nothing was registered)\nenv        visible, 41 keys; wanted: MOBILIZON_EMAIL, MOBILIZON_PASSWORD",
  "host": { "envVisible": true, "envKeyCount": 41,
            "wantedNames": ["MOBILIZON_EMAIL", "MOBILIZON_PASSWORD"],
            "wantedPresent": ["MOBILIZON_EMAIL", "MOBILIZON_PASSWORD"],
            "wantedMissing": [], "valuesPrinted": false },
  "software": { "name": "Mobilizon", "version": "5.2.4" },
  "oauth": { "answer": "invalid_request", "live": true } }
```

`ok: true` with an empty `verdicts` array is the pass. Each verdict names the layer it belongs to, and what to
do about it:

| verdict / field | what it means |
|---|---|
| `CODE: env access is blocked in Code nodes` | `N8N_BLOCK_ENV_ACCESS_IN_NODE` is set. The cadence reads the password in `03`'s HTTP expression, which that same setting governs — so the fix is host-level: unset it, or restart n8n with the variables present |
| `CODE: MOBILIZON_PASSWORD is not in the environment n8n started with` | the name is absent from the **process** environment. Different installs put env files in different places; set it where the n8n process reads it, then **restart n8n** — it reads its environment at process start |
| `HOST: … gave no nodeinfo software field` | this host cannot reach the apex — DNS/routing/TLS, not credentials. Split DNS is real on this network (`mobilizon.labradorius.com` resolves to a LAN address from inside and a public address from outside), so which view n8n has depends on where n8n runs |
| `HOST: something answered as "…", not Mobilizon` | a proxy is intercepting the request |
| `HOST: /api/v1 did not answer { __typename }` | the cadence's own endpoint is unreachable from n8n's network — this is the 09:00 failure the probe exists to catch |
| `HOST: POST /apps did not answer invalid_request` | the OAuth application route is not reachable from n8n's network (YunoHost's SSO front door can swallow it). Nothing to fix for A9 — the cadence does not use OAuth — but until this line is clean, plan no OAuth path (D185). It is asked with a body the instance refuses by name, so **no application is registered** by running the probe |
| a `version` line that is not 5.2.4 | the instance moved. Run `node integrations/mobilizon-cadence/check.mjs` before trusting any field name in these docs |

It prints **presence, never values**: the only strings it can emit are variable *names* (`valuesPrinted: false`
says so in the output), it attaches no credential, and it has no write path — `build-probe.mjs` refuses to
generate one, and `check.mjs` re-checks that argument on every run. It also cannot register an OAuth client:
`P5` sends a `name` and nothing else, and the builder refuses a probe that ever sends `scope`, `redirect_uri`,
`client_id`, `client_secret` or `grant_type` (D185). It has no schedule trigger, so it cannot fire on its own:
import it, run it once, read the summary, delete the workflow.

If you would rather not import a second workflow, the one-line equivalent is a temporary **Code** node in any
workflow:

```js
return [{ json: { seen: Object.keys($env ?? {}).filter((k) => k.startsWith("MOBILIZON")) } }];
```

That answers only the env question — it will not tell you whether n8n can reach the GraphQL endpoint, which is
the other half of what a 09:00 failure looks like.

## 1. Import

n8n → **Workflows → Import from File** → `n8n/cadence-workflow.json`.

Expected: 11 nodes, no red "node not installed" badges, and **no credential to attach** — the two authed
requests authenticate inside the run. If n8n warns about node versions, it is offering to upgrade
`httpRequest`/`if`/`code`; the artifact deliberately names the *lowest* type versions that carry the features
used, so an upgrade is safe but not required.

**Then open `05 Stop if nothing to write` once.** Its condition block is the one part of the file whose
internal shape varies between n8n versions. You should see exactly one rule:

```
{{ $('04 Plan & decide').item.json.action }}  is equal to  create
```

and **Fallback Output / branch mode** set so that non-matching items go to the *false* branch (the report).
Opening the node lets n8n rewrite the block into the shape your version prefers, which is what you want
before a scheduled run depends on it.

**Then export the copy back out and verify it.** Workflow menu → **Download**, and from the repo:

```bash
node integrations/mobilizon-cadence/verify-import.mjs ~/Downloads/cadence-workflow.json
```

This is the step that makes "the workflow in n8n is the workflow that was reviewed" a checked fact instead of
an assumption. Nothing else records what an import did: the copy inside n8n can differ because the instance
runs a different n8n version and rewrote a node, because the import partially failed, or because someone
pressed something. The checker compares the edges, the gate's rule, every URL and host, the injected config
(it *runs* both copies and reports where they disagree), `settings.timezone`, `executionOrder`, pinned data,
and the exact text of each Code node — and it prints whether the **exported** copy would write, read from the
export's own `dryRun`. It is read-only: it never talks to n8n and never touches the instance.

The same run answers the question you actually have, in words:

```text
executed here against fixtures/group-history-2026-11-04.json (no credential, no network, no write):
  04 Plan & decide -> would_create  mpls-social  2026-11-21T18:00:00Z .. 2026-11-21T20:00:00Z  (dry_run)
  04 Plan & decide -> would_create  parallel-learning  2026-11-26T00:00:00Z .. 2026-11-26T02:00:00Z  (dry_run)
  08 Report: cadence: 2 series, 0 event(s) written, at 2026-11-04
compare that with: node integrations/mobilizon-cadence/simulate.mjs  (the same rules, live calendar)
```

Those dates come out of the copy **installed in n8n**, run against the saved calendar; `simulate.mjs` runs the
same rules against the live one. Two different calendars, or two different copies of the rules — that line is
how you tell which you have.

What is normal in a real export: ids, version ids, timestamps, tags and node **positions** differing (n8n
rewrites all of them; the checker ignores them), and one `note` per **extra** channel node you add beside the
shipped `23 Notify on ntfy`. What is not: any `fatal` or `drift` line — and note that the node-level settings
(`onError`, `retryOnFail`, `maxTries`) are inside the fingerprint, so toggling "Retry On Fail" in the editor
*is* a drift line, not cosmetic noise. If you get one, fix it in the repo, `build-workflow.mjs`, re-import,
export again, re-run this. Do **not** fix it by editing in the n8n editor — that is how the two-configs
problem in step 5 starts. Re-run this checker after any edit made in the editor, and once more before you
enable writes (step 5). To see the checker prove itself first: `verify-import.mjs --selftest`.

## 2. Rehearse away from n8n first (optional, 30 seconds, zero risk)

```bash
node integrations/mobilizon-cadence/simulate.mjs
```

This performs the same read and the same plan with **no credentials and no writes**. As of 2026-11-04 it
prints:

```
mpls-social:       would_create -> 2026-11-21 12:00 America/Chicago   (18:00Z–20:00Z)
parallel-learning: would_create -> 2026-11-25 18:00 America/Chicago   (00:00Z–02:00Z next day)
```

plus a `TIMEZONE:` note for each series, because the two newest rows declare `Etc/UTC`. That note is the
integration telling you the truth about the club's data — see step 7.

## 3. Dry run inside n8n

**Execute workflow**. Then:

1. `02` should return the group with its rows (`data.group.organizedEvents.total`). If `group` is `null`, the
   group handle in `series.config.mjs` is wrong — this is the failure mode the plan node turns into a clear
   error rather than an empty run.
2. `03` should return `data.login.accessToken` (a long opaque string). Treat this execution's `03` panel as
   sensitive: its request body contains the password.
3. `04` should emit **one item per series**, each with `action: "would_create"`, a `candidate`, `createVars`
   and `auditVars`. `"create"` here would be a bug — a dry run cannot produce it, and a test asserts that.
4. `05` routes both items to its **false** branch. That routing *is* the dry run.
5. `08 Report` prints the ledger: the dates, the reasons, the notes, and the full payload it would send.

**Acceptance for step 3:** the `08 Report` output and `simulate.mjs` agree on both dates and both instants,
and you recognise the dates as the club's next meetings. If they disagree, stop and compare the two reads —
one of them is looking at a different calendar.

**Two things a manual run cannot prove, and the cheap way to prove each:**

- **That the schedule actually fires on your host, at the hour you think.** "Execute workflow" bypasses the
  trigger, and the trigger's `09:00` is interpreted in `settings.timezone` (`America/Chicago` in the artifact)
  — which is the behaviour you want, but nothing outside that host has confirmed it. Temporarily set the
  trigger to a time two minutes ahead (or every minute), activate the workflow, and check that an execution
  appears in the list **without** you clicking anything. Then put `09:00` back and re-import.
- **That a write lands where you expect, without a member seeing it.** When you do enable writes, set
  `draft: true` in `series.config.mjs` for one rebuild. The event is created as a draft — the club's members
  never see it — the audit still runs against it, and `repair.mjs --list` then `--delete <uuid> --yes` takes it
  away. That rehearses the entire write path, including the undo, at zero cost to the public calendar. Once you
  have watched it once, delete the `draft: true` and rebuild.

## 4. Alerting: what ships, and the four commands that make it real

An automation that quietly adds dates nobody noticed is a calendar nobody trusts. As of 2026-11-05 the delivery
is **in the artifact**, not an exercise for the reader (D194): `23 Notify on ntfy` posts to your own ntfy server,
and `24 Fail loudly` makes sure the execution still goes red afterwards (D195 — a failure n8n considers
"handled" stops being recorded as one, and that used to be this workflow's alarm).

What gets sent, from `series.config.mjs` `ALERT`:

| when | title | priority | note |
|---|---|---|---|
| a stage threw (`21`) | `cadence failed at read+write…` | 4 high | goes straight to `23`, no condition in the way |
| the plan stopped and needs you (`22`) | `cadence paused: <series>` | 4 high | through `09 Tell a person?` |
| it wrote, or a dry run decided what it would write (`08`) | `cadence wrote 1 event(s)` / `cadence dry run: would write 1` | 4 / **2 drawer-only** | a dry-run report is deliberately quiet |
| every series skipped | *nothing* | — | on purpose: a message that means "nothing happened" is what makes the messages that matter unread |

Four commands on the ntfy host (the YunoHost package keeps its CLI behind a wrapper that sets
`NTFY_CONFIG_FILE`; `<install>` is the app's install directory — `yunohost app info ntfy`):

```bash
sudo -u ntfy <install>/ntfy.sh user add --role=user cadence-bot
sudo -u ntfy <install>/ntfy.sh access cadence-bot mathloco-cadence read-write
sudo -u ntfy <install>/ntfy.sh token add --expires=365d --label="mathloco cadence" cadence-bot
```

Put the printed `tk_…` value in the **n8n service environment** as `NTFY_TOKEN`. It never goes in the workflow:
`23` reads it as `$env.NTFY_TOKEN`, the config carries only the *name*, and both the build and the export checker
fail if a token-shaped value appears in the JSON. Two things to know about that grant:

- **Tokens are account-scoped, not topic-scoped** (upstream docs, 2026-11-04). Least privilege is the account: a
  non-admin user whose only ACL entry is `mathloco-cadence`.
- **`--expires` is a trap you choose with eyes open.** When the token dies, the alerts stop and nothing notices.
  Put the renewal date in a calendar now, or mint it without `--expires` and record a rotation date here.

Then prove the channel, from this repo:

```bash
node integrations/mobilizon-cadence/probe-ntfy.mjs
```

It asks the running server three questions: can a stranger **post** to your topic, can a stranger **read** it,
and can this workspace **send**. The first two run without credentials and are part of `check.mjs` (measured
2026-11-05: both `403 / 40301`, which is the package's `auth-default-access: "deny-all"` doing its job). The
third prints a loud SKIP until `NTFY_TOKEN` is in your shell, and when it runs it puts a real message on your
phone that says it is a probe.

**Prove the alert path, not just the channel.** Set `MOBILIZON_PASSWORD` on the n8n host to something wrong and
run the workflow once. Expected: `03 Sign in` fails, its error output fires, `21` names the stage, `23` delivers,
`24` throws, the execution is **red** and the message is on your phone with the same words. Nothing can be
written by a run that cannot sign in, so this is free. Fix the password afterwards, and note that a red run this
deliberate is the cheapest evidence you will get that the alarm works.

**Two things this does not cover, both deferred on purpose (D195):**

- **If n8n itself is down, nothing sends.** Under the silence rule a quiet week is indistinguishable from a dead
  scheduler. The candidate answer is a weekly priority-2 heartbeat message, which trades directly against the
  silence rule above — an operator decision, not a code change.
- **No workflow-level error workflow yet.** The vendor set calls it non-negotiable for unattended jobs because it
  also catches whole-run timeouts, crashes between nodes and a trigger that never fires. It is a second artifact
  plus a setting in your n8n version whose label moves. Parked until the first real write, with the trigger
  named in D195. Note that our per-node error outputs mean a workflow-level error workflow will *not* see those
  failures — `24 Fail loudly` is the one unwired throw it would catch.

## 5. Enable writes

The dry-run switch is the first line of `series.config.mjs`:

```js
export const RUN = { dryRun: false, … }
```

then rebuild, re-check, and re-import:

```bash
node integrations/mobilizon-cadence/build-workflow.mjs
node integrations/mobilizon-cadence/check.mjs
```

Before activating, two commands and two eyes:

```bash
node integrations/mobilizon-cadence/verify-import.mjs <the export you just downloaded>
```

1. it reports **0 fatal, 0 drift**, and its own line says `as exported, this copy WOULD WRITE` — that sentence
   is the checker reading the dry-run switch out of the copy that will actually run, not out of the repo;
2. `05 Stop if nothing to write` still routes only `action == create` into `06`, and everything else to its
   false branch. That node is the whole safety story in one condition, and "nobody edited it" is not something
   the artifact can prove — the export check above is what can.

On import, n8n may create a second workflow with the same name rather than replacing the first (which it does
depends on the version and on whether you import from file or paste JSON — check the workflow list after
importing, and delete or deactivate the stale one). The point is not which: it is that **the config's only home
is the repo**, so the copy inside n8n never drifts from the copy the tests describe. If you flip `dryRun`
inside the `01 Config` node in the n8n editor instead, you now have two configs, and the tests describe
neither. Acceptable for a one-off experiment; reconcile it the same day.

Then activate the workflow (the schedule trigger starts firing at 09:00 America/Chicago).

## 6. The first real write — check it on the calendar, not just in n8n

After the first run with `dryRun: false`:

| check | where | what you want |
|---|---|---|
| `06 Create event` returned an event | n8n | `data.createEvent.uuid`, `url`, `beginsOn` matching the plan's `candidate.beginsOn` |
| `07 Audit the date` saw it | n8n | the window contains the new uuid and **no other row for that series on that date** |
| `08 Report` | n8n | `created 2026-11-21 … audit: ok (1 row(s) on the date)` |
| the event looks right | Mobilizon UI | title, **start hour in the club's zone**, venue and map pin, the club's event picture, description, and that visitors can join it |
| the site sees it | mathloco | run the harvest (`npm run events:harvest`) and confirm the new row lands in `data/events.json` with the right local time |

The UI check matters more than it seems: the API can be perfectly consistent and the wall clock still wrong,
because Mobilizon renders in the event's own `options.timezone`. If the UI shows the hour you expected, the
clock rule is working.

Only let the workflow run unattended once you have watched one full cycle you agree with.

## 7. Two data fixes this integration recommends and never performs

It copies, it does not correct. Both of these are one edit in the Mobilizon UI, and doing them removes a
warning that would otherwise live in every report forever:

1. **The two newest rows declare `Etc/UTC`.** `MPLS Math Club - Bimonthly Social` (Nov 7) and
   `Parallel Learning for Mathematical Minds` (Nov 11) have `options.timezone: "Etc/UTC"`, while the May/June
   rows carry no zone and sit at instants that read as 12:00 Central. Same wall clock, two conventions —
   which means those two events, *as stored*, are five hours off. The cadence works around it by carrying the
   wall clock (see the probe record), and prints a `TIMEZONE:` note about it every run. Setting those rows'
   timezone to `America/Chicago` (and re-checking their displayed hour) makes the note disappear and makes
   the club's own data consistent for the site's harvester too.
2. **`maximumAttendeeCapacity: 0` on every row.** On this instance `0` behaves as "no limit", but in the
   ActivityPub vocabulary `0` means "no attendees allowed". The cadence therefore *drops* a `0` rather than
   copying it, so a new meeting can never be created closed. If the club ever wants a real cap, put a real
   number on the source row — it will be copied.

## 8. Repair, rollback, and the duplicate drill

Nothing in the workflow deletes anything. Undo is yours to run, and it is one command:

```bash
node integrations/mobilizon-cadence/repair.mjs --list                 # upcoming rows, with uuid and id
node integrations/mobilizon-cadence/repair.mjs --show <uuid>          # exactly what you are about to remove
node integrations/mobilizon-cadence/repair.mjs --delete <uuid> --yes  # that row and no other
```

It prints title, instants, url and uuid, refuses without `--yes`, and after deleting re-reads the uuid and
reports `confirmed gone`. (Mobilizon's `deleteEvent` takes the numeric internal id, not the uuid — the script
resolves that so it is not your problem at 9 a.m.)

**If the audit reports a duplicate** (`cadence wrote an event but the audit disagrees … 2 rows for this series
sit on 2026-11-21`): the execution is red on purpose, both uuids are named, and the calendar now has two of
one meeting. The drill is:

1. read the report line — it names both uuids and both urls;
2. `repair.mjs --show` each one, and keep the one the club would rather members see (usually the human's,
   because it may carry extra detail);
3. `repair.mjs --delete <the other uuid> --yes`;
4. re-run `simulate.mjs` — it should now say `skip / already_scheduled` (or `max_future_reached`) for that
   series rather than `would_create`;
5. the next scheduled run needs no other change: the anchor is now the newest real row, so the chain resumes.

**If the date is right but the hour is wrong**: the source row is wrong. Fix the source row in Mobilizon and
delete the created event; the rule carries the wall clock from the anchor, so fixing the anchor fixes every
future date.

**If a date should not exist** (the club skipped a week): add it to `skipDates` in the series block, rebuild,
re-import, and delete the event if it was already created. `skipDates` is a permanent record of a deliberate
skip, which is why it is config and not a deletion.

## 9. Living with it

| you want to | do |
|---|---|
| pause for a fortnight | deactivate the workflow in n8n. The next run re-derives everything from the calendar, so a pause costs nothing |
| keep reasoning but write nothing | `dryRun: true`, rebuild, re-import |
| skip a specific date | `skipDates: ["2026-12-19"]` |
| change the rhythm | `everyDays`, `weekdaySnap` — the numbers are labelled as the automation's *rule*, measured from the club's rows, not as a fact about the club |
| add a third series | a new block in `series.config.mjs`; `check.mjs` and `simulate.mjs` pick it up immediately, and `--now`/`--fixture` rehearse it before it ever runs |
| after a Mobilizon upgrade | `node integrations/mobilizon-cadence/check.mjs` — the live step fails loudly if a query, a field or the endpoint path moved |

The whole behaviour is `series.config.mjs` + `lib/core.mjs`, and both are covered by
[`test-plan.md`](test-plan.md).
