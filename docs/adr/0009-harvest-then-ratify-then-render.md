# 0009 — the `/chat` archive is harvested offline, signed by hand, and rendered through one view

**Status:** accepted, recorded 2026-11-21 (**MS41**'s exit gate; the record the milestone promised when it opened —
`docs/adr/0009-*.md` named in `PLAN.md` §Milestones and in `MILESTONES.md`). Ids **0002**–**0008** keep their numbers:
this is the next free id, not a reordering. The decisions it rests on: **S088** (the ruling that opened MS41 and set
the five points), **D461** (a harvested topic publishes only what a human has ratified; a Discord widget is refused
because it publishes presence), **D464** (all 31 entries signed by hand; a later harvest may add but never rename,
re-date or delete a signed entry), **D465** (the component, the one publishing rule a page can import, and the gate
half that reads built bytes), **D73** (harvest offline; the build never reaches the network), **D457** (a citation is
checked, not trusted), and the no-people posture of **D136**, **D265**, **D301**.

## Context — the five artifacts one session can undo

The pipeline that puts a sentence under `/chat`'s "what we pull on" heading is five files, and each is a thing a
cleanup could break:

| artifact | what it holds |
|---|---|
| `scripts/harvest-threads.mjs` | the offline harvester: two years of one Discord guild read with a `Bot` token, clustered, named by a model, written as **candidates with pointers** |
| `data/discord-threads.json` | the committed archive (`schema: 1`): every entry carries `evidence` (channel id, message ids, dates) and a `status`, and a signed entry carries `approvedBy` / `approvedAt` |
| `src/lib/threads.mjs` | the **file** machinery — `node:fs`, the repo root off `import.meta.url`, `mergeThreads` (the dedup rule), `threadFindings` (the contract) |
| `src/lib/threads-view.mjs` | the **publishing rule** alone — `hasEvidence`, `isRatified`, `publishedThreads` — importable by a prerendered page |
| `src/components/ThreadArchive.astro` | renders the signed topics **undated** under `#threads` on `/chat` |

Gates: `check:thread-topics` (the source contract), `check:thread-topics:selftest` (the plantings), and
`check:thread-topics:dist` (built bytes) inside `verify`, plus `check:threads`, which still owns the coupling between
`/chat#threads` and the home page's curated teaser.

Before this, the section was **authored guesswork** in `src/content.json`'s `threads._rule`. That rule is superseded
for `/chat` **only** — the home teaser (`WhyJoinUs.astro`, `VISIBLE = 6`) is still an authored artifact and still
reads authored content.

## Decision

1. **Harvest offline, commit the result.** The harvester is run by hand on a human's rig; `data/discord-threads.json`
   is tracked; the build and the Worker never reach Discord. This is **D73**'s topology, the one
   `data/events.json`, `data/meetup-events.json` and `data/discord-events.json` already follow: an upstream being
   down costs *editing*, not *serving*.
2. **Authority is evidence plus the operator's signature.** A model may name a topic; only a human may publish it.
   There is deliberately **no `--approve` flag** on the harvester, so no command can write `approvedBy: "operator"`.
   Ratification is a hand edit in the file.
3. **One view, and it is narrow.** Pages get `publishedThreads(doc)` → frozen `{ id, topic }` and nothing else — no
   aliases, no dates, no channel or message ids. A component cannot print what it was never handed, so the privacy
   rule is structural; the dist gate is a backstop, not the defence.
4. **Identity across runs is deterministic and existing entries win.** `mergeThreads` matches on a shared message id,
   a folded name, or an alias; the file's existing `id` and `topic` survive, and the candidate's different name
   becomes an **alias**. A re-harvest therefore cannot overrule a signed word (**D464**).

## The evidence that decided it, not the preference

- **The guild is small and rate-limited, so the pager sleeps.** `GET /guilds/{g}/channels` → 3 channels: **1** text,
  **2** categories; `GET /channels/{id}/messages?limit=100` → 100 messages, 98 with content, header
  `X-RateLimit-Remaining: 4`, `X-RateLimit-Reset-After: 1.000`; `GET /channels/{id}/threads/archived/public` →
  **21** archived threads @measured 2026-11-20 by `.design/tmp-harvest-probe.mjs` (Linux native, Node 24.22.1).
- **What the real run cost.** Window 2024-11-20 → 2026-11-20; channels read **1**; threads listed **24**; messages
  read **628**; clusters **39**, all named; candidates **31**; entries after merge **31** (added 31, merged 0,
  kept 0); model `claude-haiku-5-5` calls **39**, errors **0**, tokens in **39,649** out **9,745**; **5** aliases
  carrying a handle dropped; requests **32**; rate-limit sleep **0 s**; wall **70.7 s**
  @measured 2026-11-20 by `node scripts/harvest-threads.mjs --write` (run log kept at
  `.design/harvest-threads-2026-11-20.log`).
- **Model output is a budget problem before it is a taste problem.** The first naming pass lost **7 of 39** calls to
  a reply with no JSON in it; `stop_reason: "max_tokens"` named the cause, which is why `MODEL_MAX_TOKENS` is 1200
  and not 300 (recorded in `scripts/harvest-threads.mjs` beside the retry path).
- **Ratification happened as a human edit, and the tools agree it did.** All 31 entries signed 2026-11-20
  (**D464**). Today: `node scripts/harvest-threads.mjs --check` → *31 entries, 0 finding(s), 0 awaiting
  ratification*; `npm run check:thread-topics` → *31 thread(s) in the archive, 31 ratified and publishable*
  @measured 2026-11-21 by those commands.
- **Idempotence is proven on the committed file, not only on a fixture.**
  `node scripts/harvest-threads.mjs --merge-cache .design/harvest-candidates-2026-11-20.json` → *31 candidate(s) →
  31 entries (added 0, merged 31, kept 31)* and *`threads[]` UNCHANGED — re-merging an already-merged file is a
  no-op*, exit 0, with no network read and no model call @measured 2026-11-21 by that command.
- **The module split is a build failure, not a style choice.** The first build with `/chat` importing the file module
  died `TypeError: Invalid URL string` — Astro's prerender bundle keeps the root expression and evaluates it where
  `import.meta.url` is not a URL @measured 2026-11-21 by `npm run build`. Hence `threads-view.mjs`.
- **The checks can still fail.** `check:thread-topics:selftest` → **32 cases, 0 wrong**
  @measured 2026-11-21 by that selftest: it plants an entry with no evidence, an entry with no signature, a
  near-duplicate that must collapse with its alias kept, a merge that must be a no-op, and a handle or snowflake
  reaching a built byte.

## Consequences — each is a thing a session can trip on

1. **A re-harvest cannot rename what the operator signed.** The existing `topic` and `id` win; the new name lands in
   `aliases`. If a topic's wording is wrong, the fix is a hand edit to `data/discord-threads.json` — that is the
   operator's word, not a model's second opinion (**D464**).
2. **Do not add an approval flag, a `--yes`, or an auto-sign on write.** A command that can write `approvedBy`
   manufactures the one authority this file exists to require. A future harvest adds entries and aliases and leaves
   them `status: "candidate"`.
3. **Evidence keys are whitelisted.** `threadFindings` rejects an evidence object carrying any key outside
   channel/message ids and dates, and the harvester refuses to write a document it fails. So "store the snippet to
   make review easier" is a gate failure by design: a quotation on a public page is a member's words published by a
   site that promises not to do that.
4. **A page must not import `src/lib/threads.mjs`.** It carries `node:fs` and path arithmetic. Pages import
   `threads-view.mjs`; scripts and the gate may use the re-exports on `threads.mjs`, which exist so `isRatified` has
   exactly one definition (**D264**).
5. **Built bytes are audited, not trusted.** `check:thread-topics:dist` runs in `verify` after `build` and greps
   `dist/client` for snowflakes, handles and quoted message content — **D457**'s posture applied to this artifact.
6. **Dates are evidence, not content.** The section is undated by decision (**S088**(b)). A "last discussed" badge, a
   year grouping, or sorting by recency re-opens that ruling and needs a new one, not a class change.
7. **The home teaser is out of scope.** `src/content.json`'s `threads._rule` is superseded for `/chat` alone;
   `check:threads`'s `rest-link-missing` rule still couples the teaser to `/chat#threads`. Wiring the teaser to the
   archive, or deleting it, is a separate decision with its own gate consequences.
8. **`schema: 1` is bumped only when an old file cannot satisfy the shape**, and never renumbered; the guild id in
   `source` is a public snowflake, not a secret (**D58**'s posture), while `DISCORD_TOKEN` lives in the environment or
   `.dev.vars` and never in `wrangler.toml` `[vars]`.
9. **Nothing here runs on its own.** No cron trigger, no binding, no queue: the cadence is a human decision, so
   `wrangler.toml` stays free of it and the free-plan surface (**D32**) does not grow.

## What this does not decide, and what would reopen it

- **Recency.** An undated archive answers range, not recency, so the `/chat` section's goal is only half met; the
  recency surface is parked with the operator (**D465**, `.notes/NEXT.md` ToDo). What would settle it: the operator's
  answer on whether `/chat` owes a "recently" surface at all.
- **Whether aliases may ever render.** Refused today: an alias is model output that may carry a handle. Reopening it
  means a filter that is provably handle-free, not a caveat in a comment.
- **Cadence and re-verify interval.** Not set. A re-run is triggered by a new milestone or the operator's word.
- **Accessibility, not privacy.** While building the sibling rule (**S090**, **D467**) the artifact was found to carry
  **no skip link and no bare `#` anchor**: `grep -o 'href="#"' dist/client --include='*.html'` counts **0** and
  `grep -io skip` counts **0** across the **76** anchors in the 6 built pages
  @measured 2026-11-21 by those greps over `dist/client`; that gap is filed, not fixed here, and it is deliberately
  **not** an exemption in the CTA rule — an exemption whose needle matches no anchor fails as `exemption-stale`.
- **Why the call-to-action rule is not its own record here.** **S090**/**D467** change 45 links' attributes and add a
  gate, so they pass clause 1 and clause 3 of the admission test above, but they fail clause 2: the *reason* is
  recoverable from the artifact — `design/cta-rules.mjs` carries the measured refusal of a proximity window and of a
  fixed word ceiling in its own header, and `DESIGN.md` states the rule with its stamp. If those comments were ever
  stripped, the rule would become a record.
- **The merge and every push** stay the operator's (**D42**, **D124**).
