# Architecture decision records

This directory holds the decisions that are **expensive to undo**, written next to the artifact they govern so a
fresh clone gets the *why* and not only the *what*. It exists because `AGENTS.md` G4 names `docs/adr/0001-*` as a
stage gate and the directory did not exist: `design/audit-references.mjs` exempted the path as a deliberate
**fence** ("citing it before it exists is the fence, not a broken link"), which made G4 a debt rather than a broken
link. **D452** and **S078** opened the work; this file is the home it was owed (**MS40 P1**, 2026-11-19).

## Admission test

A decision belongs here when **all three** hold:

1. **Undoing it means editing a named tracked artifact** — a config key, a binding, a route, a database id, a gate's
   step list. Not "changing an approach": the reversal has to have a file and a line.
2. **The reason is not recoverable from the artifact.** A `routes = [...]` block does not explain why a Custom
   Domain was refused with `100117`, or why a hand-added dashboard trigger gets detached by the next deploy.
3. **A future session could undo it by accident** — a migration that trims an "unused" binding, a cleanup that drops
   a "redundant" trigger, a config that "simplifies" a per-environment block.

**Not admitted**, and why:

- **Dated letters in `docs/`** — they are a *record of a round*, not a live source. Measured: of the **640** claims
  in them that carry a distinctive number, **67 (10%)** carry one found nowhere else in the tracked corpus, and
  **57 of those 67 sit in three letters** @measured 2026-11-19 by `design/letter-claim-uniqueness.mjs` (627 tracked
  files, 34.49 MB, base64 runs and NUL binaries stripped). **D452** recorded **637 / 67 (11%)** from the same probe
  one commit earlier: the denominator moves when tracked prose moves, which is why the probe prints its question and
  its corpus size rather than a bare count. Orphaned numbers are dated measurements, not rules.
- **`S###` rulings in `PLAN.md` §Rulings** — that register records *how a round was worked*, not infrastructure.
  Measured: **66** ruling bullets, and only **17** name any artifact at all; most of those matches are negations
  ("no ceiling moved, no route cut, no gate rule edited") @measured 2026-11-19 by `.design/tmp-adr-candidates2.mjs`.
- **`D###` decision lines** — one line each in `DECISIONS.index.md`, resolving **350 ids / 2,707 citations** through
  a **109,774 b** tracked index against a **1,266,775 b** host-local why-log. A line cannot hold context,
  consequences, and the condition that would reopen a decision; that shape is what an ADR adds, so an ADR **cites**
  its `D###`s rather than replacing them.
- **Operating knowledge** (how to deploy, which database a script opens, how to fix a stale meetup) → `docs/howto/`,
  16 runbooks and their symptom-to-file index (17 files), moved out of the gitignored `.notes/runbooks/` home on 2026-11-20
  (**MS40 P2**), so a clone finally has them.
- **`DESIGN.md`** — reference, cited by **189** files @measured 2026-11-19; it stays where it is.

## The set, chosen by the test rather than by a cost label

`PLAN.md` §Rulings labels decisions `reversible` / `costly` / `one-way`, but the label is mostly about *who had to
rule*, not about infra irreversibility: measured, the six `one-way` bullets are about marks, claims and round shape,
and none of them governs a config key @measured 2026-11-19 by `.design/tmp-adr-candidates2.mjs`. The set below was
chosen by **which artifact a session could undo**, measured over `DECISIONS.index.md` with negation filtering
(**179** of **350** index lines name at least one infra or gate artifact; **5** name three or more
@measured 2026-11-19 by `.design/tmp-adr-candidates3.mjs` over 658 tracked files).

| id | subject | the artifact a session could undo | governing decisions |
|---|---|---|---|
| 0001 | Deploy target is Workers, not Pages | `astro.config.mjs` (`output`, adapter), the deploy scripts | **D37** **D34** **D39** **D56** **D58** |
| 0002 | Spend is capped at $1/month: Workers Free is permanent | plan/billing; every binding request | **D32** |
| 0003 | SQLite locally, D1 in production; preview data is isolated | `[[d1_databases]]` ids, `[previews]`, `drizzle` config | **D20** |
| 0004 | The apex is a declared trigger set, and deploy replaces it | `wrangler.toml` `routes`, `check:deploy`'s expected count | **D241** **D292** **D244** |
| 0005 | Merge and push are the operator's; `staging` is a review env | branch and deploy workflow | **D42** **D124** **D221** |
| 0006 | Three gate sets, and the cost guard compares work seconds | `scripts/gate-run.mjs`, `design/gate-cost.json` | **D291** **D290** **D269** **D443** **D144** |
| 0007 | Secrets are per-environment; a public snowflake is not a secret | `wrangler.toml` `[vars]`, secret scope | **D58** |
| 0008 | One name per page at every surface, and the retired URL answers 301 | `astro.config.mjs` `redirects`, `NOINDEX_ROUTES`, sitemap `filter` | **D373** **D408** **D309** **D404** |
| 0009 | The `/chat` archive is harvested offline, signed by hand, and rendered through one narrow view | `data/discord-threads.json`, `scripts/harvest-threads.mjs`, `src/lib/threads-view.mjs`, the `check:thread-topics` steps | **D461** **D464** **D465** **D73** |
| 0010 | Event data arrives as a handoff commit; this repo reads `data/events.json` and never fetches | the four deleted fetchers and their `package.json` entries, `scripts/gate-run.mjs`, `check-ics.mjs`'s rule array | **D471** **D70** **D73** **D72** **D236** |

Only **0001**, **0009** and **0010** are written so far. The others are listed with their decision ids so the next session does
not have to re-derive the set; each lands as its own commit, with `DECISIONS.index.md` regenerated in the same commit
if it mints a `D###`.

**0009 and 0010 are not from the 2026-11-19 candidate probe above.** 0009 was added 2026-11-21 because **MS41**'s
exit gate names `docs/adr/0009-*.md`, and it passes the admission test on its own terms: the artifacts a session
could undo are named in its row, and the reason a later harvest may add entries but never rename a signed one
(**D464**) is not recoverable from the JSON. 0010 was added 2026-11-23 with **MS42**, and it is admitted by the
third condition rather than by the probe: the undo is the most natural refactor in the repo — a date on the site
looks wrong, a session greps for what writes `data/events.json`, finds no harvester, and writes one, creating a
second writer to a path another repository commits to. Its id is the next free one — ids **0002**–**0008** are
untouched and never renumbered.

## Rules for writing one

- File name `NNNN-kebab-slug.md`. **Ids are never reused, renumbered or renamed** — an ADR id appears in prose and
  in commit messages, the same reason `D###` and `MS##` ids are append-only.
- A superseded record stays and says what supersedes it. Do not edit a decision's substance in place; add a record
  that names the supersession. A correction to a *fact* in it (a number, a path) is edited in place with its date.
- Every measured number carries its date and its probe: `@measured 2026-11-03 by check:space`. `check:figures` fails
  a stamp older than 60 days (it audits `DESIGN.md`; the convention is the repo's, not one file's).
- Every section is f(reader, what the reader can do after reading it, register) — the copy rule from **S074**. An
  ADR's reader is a session about to edit the artifact, so the test for a paragraph is: does it change what that
  session edits, or does it just describe?
