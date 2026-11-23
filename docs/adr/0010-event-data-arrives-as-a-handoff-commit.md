# 0010 — event data arrives as a handoff commit; this repo reads it and never fetches

**Status:** accepted, recorded 2026-11-23. The contract it governs is `docs/spec/event-data-handoff.md`; the
decision that re-ruled the gate is **D471**; the milestone that did the work is **MS42**. The decisions it rests
on: **D70** (the URL and the row shape are the durable part, the writer is separable), **D73** (harvest offline;
the build never reaches the network), **D72** and **D223** (a retired date is announced, not deleted), **D236**
(the harvest never invents copy), **D238** (the feed is never shortened to dodge a rule), **D470** (retiring a
live date is the operator's act), and **D42**/**D124** (merge, push and deploy stay with the operator).

## Context — the artifact a session could undo

The site has exactly one event input. `src/lib/events.mjs:13` does `import tracked from '../../data/events.json'`
and nothing else; `src/lib/ics.mjs` renders the subscriber's feed from the same rows. So the whole calendar is one
tracked file, and the file has a **writer**. For the project's first ~10 months the writer was a script inside this
repository: `scripts/events-harvest.mjs` read Mobilizon's group feed and rewrote the file, and
`scripts/meetup-events.mjs` / `scripts/discord-events.mjs` read other platforms into their own snapshots.

That arrangement is being replaced by a handoff: one upstream repository, `chexxor/social-event-publisher`, reads
the club's platforms, decides what is publishable, and commits the result **into this repository** at
`data/events.json` — one file, one path, at most one commit per run. Its contract is **`mathloco-sink.md`** in
that repository's own spec home, **v1.6 (2026-11-18)** with **ADR-0017** there, and its requirements are
`MH-FR-001`…`MH-FR-027`.

This record passes the admission test in `docs/adr/README.md` on all three conditions:

1. **Named tracked artifacts.** `package.json`'s script map, `scripts/gate-run.mjs`'s step list,
   `scripts/check-ics.mjs`'s rule array, and the existence of four files under `scripts/`. The reversal has a file
   and a line for each half.
2. **The reason is not recoverable from the artifact.** A `data/events.json` whose `source.url` names a Mobilizon
   feed does not explain why no code in this repo may read that feed. The file looks exactly like a harvester's
   output, because it *is* one — produced by a different process now.
3. **A future session could undo it by accident.** The undo is the most natural refactor in the world: a date on
   the site looks wrong, a session greps for how the file is made, finds no harvester, and writes one. That session
   would be creating a **second writer** to the same path, on a branch the publisher also commits to.

## Decision

1. **This repo is a reader.** `scripts/events-harvest.mjs`, `scripts/events-harvest-selftest.mjs`,
   `scripts/meetup-events.mjs` and `scripts/discord-events.mjs` are deleted, with their `package.json` entries
   (`events:harvest`, `harvest:selftest`, `events:discord`, `events:discord:check`). No code in this repository
   fetches a platform for **event** data. (`scripts/harvest-threads.mjs` stays: the `/chat` archive is a different
   pipeline with its own ADR, **0009**, and its own ratification rule.)
2. **One path, one writer.** `data/events.json` is written by the publisher's commit. A hand edit to a *row* is a
   divergence from the branch the next handoff commit lands on, and it will be overwritten. What this repo authors
   in that file is exactly two things: `stalenessOkUntil` (a hatch — an explicit grant that a short runway is fine,
   which the publisher refuses to invent, `MH-FR-011`) and any `_`-prefixed prose key, which travels byte-for-byte
   (`MH-FR-006`).
3. **The branch is stated, never defaulted.** During the testing period the publisher commits to **`staging`**;
   once it works, to **`main`** — the operator ruled this on 2026-11-23. `MH-FR-002` makes the publisher refuse a
   config that names no branch, and that refusal is the point: `main` is what the site builds from and `staging` is
   the review branch, so a defaulted branch is a silent decision about which site a date lands on.
4. **The shape is the far side's, and this repo's gate is the check on it.** `scripts/check-ics.mjs` keeps owning
   the shape: the five top-level keys plus `_`-prefixed prose (`SNAPSHOT_KEYS`, `:109`), the sixteen row fields and
   the seven required ones (`:343`–`:352`), one harvest stamp per file with every row equal to it (`MH-FR-023`),
   `YYYY-MM-DDTHH:MM:SSZ` with no fraction (`MH-FR-022`), rows ordered by `start` then `uid` (`MH-FR-010`), and
   `superseded` equal to the drop list the grouping produces. A field outside the sixteen fails here **and** is
   refused there, so a new field is an agreed change to both repositories — never one side alone.
5. **A finished row travels.** A past-dated `CONFIRMED` row is legal (`MH-FR-012`; **D72** from this side). The
   gate that used to fail it is retired and replaced by a check on the file's stamp — **D471**.
6. **A handoff commit is not a deploy.** CI runs `npm run verify` on a push to `main` or `staging` and holds no
   Cloudflare credentials, so a green handoff commit proves the file is shaped correctly and nothing else. The
   change reaches a visitor only when this repo is next built and deployed, which is the operator's act (**D42**).

## Consequences, and what they cost

**What this buys.** The site stops depending on a scraper surviving a platform's markup change, and the calendar
gets one decision point with a test suite in front of it. The build's dependency surface shrinks: the fetchers held
the platform-specific parsing, and `verify` no longer runs their selftests. And the two vendor fixtures already in
this tree — `data/fixtures/mathloco-snapshot.json` (12,141 b) and `data/fixtures/mathloco-snapshot-misshapen.json`
(11,147 b), vendored 2026-11-17/18 in `1a24341` — become a **differential**: the standard's good file must pass
this repo's shape check and its bad file must fail with the findings named. If the two repositories ever stop
agreeing, a build goes red in both rather than one team finding it in production.

**What it costs.** Three things, and the first is already paid. (a) The gates that assumed a harvester had to be
re-ruled in the same change, or a red build with an impossible remedy is worse than no gate — **D471**, plus three
finding texts in `check-ics.mjs` (`:384`, `:390`, `:458`) that named `node scripts/events-harvest.mjs` as the fix.
(b) Two facts the site renders today come from the fetchers' outputs, not from the snapshot, and the standard does
not carry them yet — the per-platform link set is the largest one. The response is a **written change request** to
the far side, not an invented field and not an edit in the other repository. (c) Diagnosing a wrong date now starts
with `git log -- data/events.json` and a commit in another repo, not with re-running a script.

**State at the time of writing, so a reader knows where this stands.** @measured 2026-11-23 by reading
`config/mobilizon-to-mathloco.json` in the publisher's tree at `69a208f` (Linux native): its `mathloco:snapshot`
sink names `branch: "staging"`, `token_env: "SOCIAL_EVENT_PUBLISHER_MATHLOCO_TOKEN"`, and `run.mode: "dry"`. So as
of this record **no handoff commit has arrived**; `data/events.json` is still the 2026-11-13 harvest
(`source.fetchedAt` `2026-11-13T17:05:33Z`, 8 rows, no `stalenessOkUntil` hatch). The contract is being written
before the pipeline runs, which is what gate **G2** is for.

## What would reopen this

- **The publisher stops publishing** — abandoned, broken, or its token revoked. Then a reader-side fetcher is back
  on the table, but as a *new* ADR that says which writer wins, because two writers to one path on one branch is
  the defect this record exists to prevent.
- **The standard cannot carry a fact the site renders.** That is a change request (`MH-FR-###` addition on their
  side), and the parity table in `docs/spec/event-data-handoff.md` is the evidence for it. If a request is refused,
  the fact leaves the site or moves to a hand-authored file with its own contract — it does not come back through a
  scraper.
- **A second sink appears** (a second calendar, a second site). `MH-FR-003` names one path for this sink; a second
  consumer is a new contract, not a second entry in this one.
- **Cadence work resumes.** `integrations/mobilizon-cadence/` is parked with its trigger in `PLAN.md`; it is a
  *schedule* question, not a fetcher, and this record does not delete it.
