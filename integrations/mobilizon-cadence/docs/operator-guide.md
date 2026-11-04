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
nothing in this repo can read from here). Add a temporary Code node to any workflow, Run it, and confirm it
prints both names:

```js
return [{ json: { seen: Object.keys($env ?? {}).filter((k) => k.startsWith("MOBILIZON")) } }];
```

If `seen` is empty, n8n is blocking environment access in Code nodes. The workflow reads them in an HTTP node's
expression rather than a Code node, which is governed by the same setting — so the fix is host-level:
unset `N8N_BLOCK_ENV_ACCESS_IN_NODE` (its default is permissive) or restart n8n with the variables present.
Delete the probe node afterwards.

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

## 4. Decide on alerting *before* enabling

An automation that quietly adds dates nobody noticed is a calendar nobody trusts. Two terminals emit a
machine-friendly failure shape, and both are safe to wire a notification to:

- `21 Report error path` — a stage threw. Body: `{ ok: false, failedAt: ["read"|"sign in"|"plan"|"write"|"audit"|"report"], alertTitle, alertDetail, summary }`
- `22 Report a problem` — the plan decided to stop and needs a person (a rename, a clock mismatch, every row cancelled). Same shape.

Add your notification node (Discord/email/etc.) after each, and send `{{ $json.summary }}`. Keep the
notification **off** `08 Report`: the report body quotes the club's event text and, on a dry run, the whole
payload — that is a lot of text to push into a chat log.

Also worth setting on the workflow, if your n8n version exposes it (the label moves between versions —
Settings, or the workflow's own menu): an **error workflow** to a small notify-me workflow, as a backstop for
the case where even `21` fails.

And the positive signal: with no notification at all, "it ran and said nothing" is indistinguishable from
"it is switched off". Wire at least the two failure terminals before you enable writes.

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
