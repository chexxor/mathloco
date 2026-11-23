# `docs/` — the router

**Read this first if you have just cloned the repo and want to know which of these pages still speaks.**

This is a router, not a re-organisation. Nothing here moved to make these four sections exist: a dated letter
stays where it was written, because provenance is worth more than a tidy tree — **22 tracked files** name the
dated letters @measured 2026-11-19 by a whole-tree citation probe with its exclude set printed
(`design/letter-claim-uniqueness.mjs` records the method; the reach command is at the foot of this page). A
move would break every one of those citations and tell you nothing you could not write here in a row.

Four sections, and every tracked file under `docs/` appears in **exactly one** of them, as the first cell of
exactly one row. That is not a style rule: `npm run check:docs-routes` fails a file with no row, a row with no
file behind it, and a duplicated row. The three indexes divide the corpus between them — this page routes
everything except `docs/howto/` and `docs/adr/`, which carry their own indexes (`docs/howto/README.md`,
`docs/adr/README.md`); those two index pages are themselves routed here.

The reach column is the count of **tracked files outside `docs/`** that name the file, which is why
"archive" below does not mean "deleted": an archived letter is one that no longer tells you what to do, and a
live one is one a gate, a config file or a component still reads.

---

## 1. How-to — you are trying to do a thing

Procedures for an operation with a known start and end. Written for the person or agent who has to run it
this afternoon, not for somebody deciding what is true.

| File | Dated | What it answers | Superseded by | Cited by (tracked, outside `docs/`) |
|---|---|---|---|---|
| `docs/howto/README.md` | 2026-11-20 | The symptom → file index for the **16** operating runbooks (deploy and secrets, the Worker build pipeline, the Pages→Worker migration, D1 target and migrations, staging previews, the event feed and its ICS, the harvest cron, the n8n cadence, the domain cutover, Email Routing, research asks, design-round specimen measurement, rendered numbers, the handoff/compaction budgets). Its own table holds every runbook row | — | 2 — `AGENTS.md` clock-in step 5, `scripts/check-tables.mjs` |

The 16 runbooks sit beside that index in `docs/howto/`. They were host-local until **S083**/**D456**; the page
that used to hold them no longer exists, so anything citing the old home is a stale pointer, not a file you
have not found yet.

One limitation, stated here so it is not discovered at 2am: a runbook written before the move sometimes names a
**host-local** path — a script under `.notes/bin/`, or a credential file under `.notes/` — which a fresh clone
does not have. Those lines name *where a thing lives*, never its value (**D456**), and the index rows that route
*to* one now say so in the row; a mention deeper in a runbook does not, so treat a `.notes/` path in this
quadrant as host-local by default and expect to write the tool yourself.

---

## 2. Reference — what the system promises

Contracts and durable decisions: the pages you read to check a fact, not to learn a procedure. Each one is
expensive to undo, which is why it is here rather than in a chat log.

| File | Dated | What it answers | Superseded by | Cited by (tracked, outside `docs/`) |
|---|---|---|---|---|
| `docs/spec/source-contract.md` | 2026-11-11 | Gate **G2**: what each source (Mobilizon, Meetup, Discord, the calendar feed) promises, what the site may say about it, and what it may never derive. Stage S2 exists because this file exists. Since **MS42** it owns the *page-facing* half only — who writes the snapshot moved to the row below | — | 6 @measured 2026-11-23 by `git grep -l source-contract -- . ':!docs'` — `AGENTS.md`, `MILESTONES.md`, `scripts/check-docs-routes.mjs`, `scripts/check-tables.mjs`, `design/audit-references.mjs`, `src/lib/rsvp.mjs` |
| `docs/spec/event-data-handoff.md` | 2026-11-23 | Who writes `data/events.json` now, and what this repo may and may not do about it: the one path, the branch policy (`staging` while it is being tested, `main` once it works), the shape and stamp rules this repo's gate holds, the vendored fixtures as a differential test, and what to do when a check goes red with no harvester to run | — | 11 @measured 2026-11-23 by `git grep -l event-data-handoff -- . ':!docs'` — incl. `scripts/check-ics.mjs`, `scripts/check-rsvp.mjs`, `scripts/check-rsvp-page.mjs`, `src/lib/rsvp.mjs`, `src/lib/ics.mjs`, `MILESTONES.md` |
| `docs/adr/README.md` | 2026-11-19 | Which rulings are **ADRs** rather than log lines: the three-part admission test, and the eight numbered records with the `D###`/`S###` they project | — | 4 — `DECISIONS.index.md`, `MILESTONES.md`, `design/README.md`, `scripts/check-tables.mjs` |
| `docs/adr/0001-deploy-target-workers.md` | 2026-11-19 | Why the deploy target is a Worker and not Pages, what the apex cutover retired, and what would reopen it. This file is what satisfies **G4**'s named `docs/adr/0001-*` | — | 2 — `MILESTONES.md`, `wrangler.toml` |

Seven further ADRs are numbered in that index and **not yet written**; they are the debts, and `AGENTS.md` §Gates
lists the two whose absence is load-bearing for a stage. The older roadmap assumed this directory would hold
two `docs/spec/` files: it holds **two** as of 2026-11-23 — `source-contract.md` and the new
`event-data-handoff.md` — and **G3**'s threat model is still unwritten, so a row count here is not a count of the
plan's debts.

---

## 3. Explanation — why it went this way, and what the answer was

Letters: an outside read, this tree's answer to it, and the rulings that closed it. Read these to understand
why an artifact is shaped the way it is — and to find the ruling a decline rests on.

| File | Dated | What it answers | Superseded by | Cited by (tracked, outside `docs/`) |
|---|---|---|---|---|
| `docs/reply-to-the-design-read-2026-11-14.md` | 2026-11-14 | The answer to the first commissioned design read of `/`, `/schedule` and `/events.ics` — five of its claims flagged `[check]`, every one measured here | — (the read it answers is not in this tree) | 2 — `MILESTONES.md`, `design/audit-references.mjs` |
| `docs/reply-to-the-design-read-2026-11-14b.md` | 2026-11-14 | Item-by-item verdict on the second read: already shipped / false / contradicts a ruling / accept | — | 2 — `design/css-utility-exemptions.json` (it is the reason an exemption exists), `design/audit-references.mjs` |
| `docs/reply-to-the-design-read-2026-11-15.md` | 2026-11-15 | The round-3 read answered item by item, and the first place the two surfaces — what staging serves vs what this tree builds — are held apart | — | 2 — `MILESTONES.md`, `design/grill/axe-run.js` |
| `docs/rulings-round-4-2026-11-16.md` | 2026-11-16 | **The operator's rulings R1–R9** on the round-4 asks, plus the five sentences of the brief withdrawn. Decisions, not measurements | — | 2 — `DECISIONS.index.md`, `MILESTONES.md` |
| `docs/reply-to-the-communication-review-round-6-2026-11-16.md` | 2026-11-17 | The round-6 communication letter answered once per item, with the gate that now holds each one, and §4 listing the sentences that shipped as the **operator's draft** rather than as a grounded fact | — | 9 — incl. `scripts/check-content.mjs`, `src/content.json`, `src/components/Schedule.astro` |
| `docs/reply-to-the-communication-review-round-7-2026-11-18.md` | 2026-11-18 | The round-7 answer: landed / landed with a gate change / took the letter's own alternative / declined with evidence — each decline carrying the ruling that holds it and the command that shows the ruling is still true | — | 6 — incl. `src/content.json`, `design/review-round-8-census.mjs` |
| `docs/reply-to-the-communication-review-round-8-2026-11-18.md` | 2026-11-18 | The round-8 copy answer, keyed to the census's own row ids so "every item answered exactly once" is an instrument's reading and not a sentence; §4 names the draft slots that stay ungrounded | — | 7 — incl. `scripts/check-copy-contract.mjs`, `src/content.json`, `.agents/skills/copy-vision/SKILL.md` |
| `docs/the-authors-vision-2026-11-19.md` | 2026-11-19 | What the club's own author means when they say the site is for someone: the only place a section's reader, goal and register get ruled. `npm run check:copy-contract` reads it | — (status is still `unsent`: five slots are empty, which is why **MS39** is open) | 8 — incl. `design/copy-contract.json`, `DESIGN.md`, `src/components/WhyJoinUs.astro` |
| `docs/research/discord-invite-ux-2026-11-20.md` | 2026-11-20 | Retrieved answers to "how should this site send a stranger to the club's Discord": what an invite asks of a visitor and what Discord's own web embed publishes (presence, so it is refused here), what WCAG requires of a link's purpose, what four comparable projects do, and the count of calls to action the CTA rule has to cover. Every claim carries its passage or its command | — | 0 @measured 2026-11-20 by the reach probe at the foot of this page — it rises when the CTA idiom and its gate cite it |

The design-round replies stay here rather than in the archive because live config still names them — an
exemption file and a probe cite them as their reason — even though the design round itself closed at **MS15**
and `DESIGN.md` is now the authority on every value that came out of it.

---

## 4. Archive — dated record, superseded as instruction

These still matter as evidence of what was claimed and decided; they no longer tell you what to do. A row in
this section is grounded in the corpus's own words, not in a reader's opinion — where a letter says it is
superseded, that is what the row says.

| File | Dated | What it answers | Superseded by | Cited by (tracked, outside `docs/`) |
|---|---|---|---|---|
| `docs/design-critique-2026-11-14.md` | 2026-11-14 | The second external design read of `staging.matheapolis.com`, verbatim: the design intent it argued for, before this tree had a token file | `docs/review-round-3-2026-11-15.md` — which states it in its own header ("Supersedes round-2 spec"). Still load-bearing as the provenance of the palette: `DESIGN.md`, `src/styles/global.css` and `design/grill/palette-remap.mjs` name it | 3 |
| `docs/review-round-3-2026-11-15.md` | 2026-11-15 | The round-3 remediation spec, preserved verbatim including two formatting slips in the received text, so its claims can be checked rather than remembered | answered item by item by `docs/reply-to-the-design-read-2026-11-15.md` | 0 |
| `docs/prompt-to-the-research-agent-2026-11-15.md` | 2026-11-15 | The round-4 brief's ungroundable half: nine asks this tree could not satisfy by itself | `docs/rulings-round-4-2026-11-16.md` — its own first blockquote says **do not send this file to the research agent**, and maps asks 1–9 to R1–R9 | 1 |
| `docs/communication-read-2026-11-15.md` | 2026-11-15 | Round 5, this seat's own read of **what the site communicates**: what each page spends on, what it spends twice, what a visitor asks that goes unanswered | two of its sections say "Superseded 2026-11-16" in the row itself; as an instruction the round was replaced by `docs/communication-review-round-6-2026-11-16.md` and the answer to it | 2 |
| `docs/communication-review-round-6-2026-11-16.md` | 2026-11-16 | The external communication-science review (round 6), verbatim, and the authority that round worked against | answered by `docs/reply-to-the-communication-review-round-6-2026-11-16.md`; **MS32** closed the round | 2 |
| `docs/communication-review-round-7-2026-11-18.md` | 2026-11-18 | The external communication-science review (round 7), verbatim, blockquoted so its counts stay the reviewer's numbers | answered by `docs/reply-to-the-communication-review-round-7-2026-11-18.md`; **MS35** closed the round | 2 |
| `docs/communication-review-round-8-2026-11-18.md` | 2026-11-18 | The critiquer agent's round-8 copy letter, verbatim and blockquoted | answered by `docs/reply-to-the-communication-review-round-8-2026-11-18.md`; **MS37** closed the round — but the census and the copy gate still key off its row ids, which is why its reach is the highest of this section | 6 |

---

## Adding a row, and what the gate does

- A new `docs/*.md` needs a row in **this** page, in the section it belongs to; a new runbook needs a row in
  `docs/howto/README.md`; a new ADR needs a row in `docs/adr/README.md` and a number that has never been used.
- The first cell of the row is the path, in backticks. That cell is what `npm run check:docs-routes` counts as
  the row's subject — which is why a path may also appear in another row's **Superseded by** cell without
  counting twice.
- Every row carries a date and says what the file answers. A row that cannot answer "what would I come here
  to find?" is a row that will be wrong in a month.
- `Superseded by` is filled only from the corpus: the letter says so, a later letter says so, or the milestone
  row closed the round. Never from a reader's judgment about whether a round looks finished.

**Reach probe** @measured 2026-11-20 by
`git grep -l -- "docs/<file>.md" | grep -v '^docs/' | wc -l` — tracked files only, so `dist/`, `.ai-work/` and
the gitignored host-local plan are excluded by construction (a whole-tree grep for these same letters returns
**18,405** files, **12,014** of them session echoes; that number is a trap, and the pitfall row naming it is in
the plan's register).
