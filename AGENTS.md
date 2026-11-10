# mathloco - agent entry point

This file loads whenever the working directory is `mathloco/` or below. Read it before touching
anything else in this project.

## Who you are here

You are a **delegate for the operator**, external to any durian-pi team - **not a seat**. Keeping the
three actors straight is the whole job:

- **The human operator** - owns intent, rulings, and grants (push, new seats). Escalate a genuine
  scope/priority decision rather than deciding it for them.
- **You (delegate)** - deliver the operator's intent to a team, read the rig's state, verify what
  comes back, report, and escalate. You may drive the loop on the operator's behalf. You never
  become a seat.

## Planning system (`S015`)

`.notes/PLAN.md` is the roadmap: stages, gates, milestones `MS01`-`MS11`, scope fences, decision rules,
pitfall register. `.notes/NEXT.md` is the session entry point and **no longer carries a queue** - "what's
next" lives in `PLAN.md` §Milestones, so the two files can't disagree. `.notes/QUESTIONS.md` archives asks
and the letters that closed them; `.notes/SESSIONS.md` is the per-session trail.

- **Gates beat enthusiasm.** A stage is entered when the file proving its gate exists. No adapter code
  before `docs/spec/source-contract.md` (G2) and an accepted `docs/adr/0001-*` (G4). No token held or sent
  before `docs/threat-model.md` (G3). Nothing touches a live account before the fixture harness proves the
  payload offline (G5). No merge without a written review under `code-review-and-quality` (G6).
- **Cost to undo decides who decides.** `reversible`: the delegate decides and records it. `costly`: the
  delegate decides, writes the ADR, and tells the operator. `one-way`: operator's letter first, with at
  least two alternatives written down in the same file.
- **Decide at the last responsible moment.** If a milestone's evidence would change the answer, the answer
  waits for the evidence. Open questions are capped at three.
- **Ids are never reused or renumbered:** rulings `S###` (append-only), milestones `MS##`, questions
  `Q###`. Plan status columns change in place; decisions never do - supersede them with a new `S###`.
- **Every session ends with a report:** the stage and milestone moved, what exists now that didn't before,
  what remains in that milestone, and every decision the operator must make with pros, cons, and a
  recommendation. `PLAN.md` §Session protocol is the template.

`npm run check:plan` is what makes the above true rather than aspirational: it fails on a missing plan
section, a milestone row with no exit gate, a status outside the vocabulary, a paused or blocked row with
no resume trigger, an `MILESTONES.md` status that disagrees with the plan, a fourth open question, a
`NEXT.md` that carries a queue, or an `S###`/`MS##` citation with no entry. `check:plan:selftest` plants
each of those and requires a named failure. Both are in `verify`.

## Clock in (run this at the start of every session)

1. Read **`.notes/NEXT.md`** - the stage, the active milestone, the exact first command, the traps - and
   **`.notes/PLAN.md` §Milestones** (the only place "what's next" lives). **`MILESTONES.md`** (tracked) is
   the projection of that table for a fresh clone; `check:plan` keeps the two identical. An item without an
   exit criterion is a topic; if you are about to start one and cannot name its gate, write the gate first.
   If the plan says a milestone is `paused`, do not resume it without the trigger it names.
2. **Load the project skills before writing framework or UI code.** They live in `.agents/skills/` and
   each is repo-specific, so its text beats what you remember - and appearing in the available-skills
   list is **not** loading it; open the file. Which to open:
   - `.astro`, `astro.config.*`, SSR/adapter/bindings/D1 work → `astro/SKILL.md`
   - any `.svelte` / `.svelte.js|ts` work → `svelte-core-bestpractices/SKILL.md` **and**
     `svelte-code-writer/SKILL.md` (its CLI docs lookup is mandatory for Svelte edits)
   - anything visual - colour, spacing, type, icons, motion, empty states → `design-system/SKILL.md`
     (it sequences design-extract -> grill -> ratify -> apply -> enforce); `beautify`,
     `apply-transitions`, `choose-icons`, `empty-states` are the smaller follow-ons
   - before merging anything → `code-review-and-quality/SKILL.md`
   - at the start of a session → `resume-checkin/SKILL.md` - one command prints branch, HEAD, dirty paths,
     the active milestone row, the gate list and whether the last gate run predates the commit you are on
   - before adding a check to `verify` → `add-a-gate/SKILL.md` - a gate not in `scripts/gate-run.mjs` runs
     only when a human remembers it; its `--audit` lists the ones that already drifted
   - before writing any number into prose → `measure-a-claim/SKILL.md` - the stamp grammar, the 60-day
     rule, and the probe that produces the figure
   Skills are tracked, so if one goes stale against the code, **fix it in the same commit** that makes
   it stale (e.g. a config change invalidates the config block quoted in `astro/SKILL.md`).
3. **Code intelligence is installed, and it is narrow on purpose (D266).** `pi-lens` registers 13 tools
   (`lens_diagnostics`, `lsp_navigation`, `ast_grep_search`, `read_symbol`, `module_report`, ...); five are
   `situational` and stay invisible until something calls `pi_lens_activate_tools`, so one empty run is not
   evidence a capability is missing. `.pi-lens.json` (tracked) is what makes `.astro` reachable at all - the
   package's built-in registry does not know Astro, and without the `initializationOptions.typescript.tsdk`
   the server answers `initialize` and then rejects every type-backed request - `documentSymbol` comes back
   `"Unhandled method"` @measured 2026-11-10 by `.design/tmp-lsp-timing.mjs`), so the .astro files are dark even
   though nothing errors. `npm run check:lsp` asserts the entry, the tsdk, that format and autofix stay off -
   this repo's correctness is byte comparisons, and a formatter that rewrites files on edit is a gate-breaking
   machine wearing a convenience hat - and, since D270, that the server is actually **live**: the gate spawns
   `astro-ls`, sends `initialize`, opens the smallest .astro in `src/`, and requires a non-empty
   `documentSymbol`. A config that reads perfectly and a server that never answers are the same defect to a
   reader of the config only. Cost @measured 2026-11-10 by the gate itself (Linux native, node 24.22.1):
   `check:lsp` 3.3s of work, its selftest 3.8s - spawn to `initialize` 0.6s, first `documentSymbol` 2.4s, the
   embedded TypeScript service's warm-up. The 51ms `documentSymbol` quoted in D266 was a **warm** server inside
   a session, and the first typescript LSP call in a session takes ~10s; the gate pays the warm-up once per run
   instead of assuming it has already been paid.
   - **A second skill home exists, and it is host-local:** the vendored Cloudflare set from the
     `pi-cloudflare` pi package, at `.pi/npm/node_modules/pi-cloudflare/skills/` (`.pi/` is gitignored, so a
     fresh machine must reinstall the package to have them). 18 skills. They are **vendor** guidance, so this
     repo's code, `astro/SKILL.md` and `.notes/runbooks/` outrank them on anything repo-specific. Open the one
     for the Cloudflare surface you are touching:
     - product choice / "what should we use here" -> `cloudflare/SKILL.md`; the depth lives in its
       `references/<product>/{README,api,configuration,gotchas,patterns}.md`, e.g. `workers-ai`, `d1`, `kv`,
       `static-assets`, `pages`, `cron-triggers`, `images`, `observability`, `waf`
     - writing or reviewing Worker code / wrangler config -> `workers-best-practices/SKILL.md`, `wrangler/SKILL.md`
     - driving Cloudflare from bash (deploy, D1/KV, DNS, WAF, machine-readable output) -> `cloudflare-cf-cli/SKILL.md`
     - Durable Objects, Agents SDK, Turnstile, Email routing, Sandbox, Next-on-Workers -> the matching skill dir
     - free-plan gating and what costs money -> `cloudflare-hardening/SKILL.md`, whose
       `references/paid-features.md` lists what is gated on the Free plan. Read it before proposing any new
       binding: the operator's ceiling is **$1/month**, so the plan is permanently free (`.notes/DECISIONS.md` D32).
   - **Design work has a tracked home:** `design/` (no dot) holds the design gates, their harness, the
     probes behind every number `DESIGN.md` quotes, the specimens the operator chose from, and the machine
     records; `.design/` (with the dot) is gitignored scratch (`tmp-*`, `render/`, probe screenshots,
     candidate fonts). Read `design/README.md` before adding, renaming or deleting a file in either. After
     a rename run `node design/audit-references.mjs --stale` — it exits 1 if any doc or script cites a path
     that no longer exists; a pointer into a wall is how a future session loses a probe for good.
4. `git status --short -- .` - know what is already uncommitted before you touch anything. Then
   `git log --oneline main..HEAD | cat` to see how far the branch is ahead, and run the CI gate set
   once so you know whether the branch is green *before* you start changing it: **`npm run verify`**
   (the set lives in `scripts/gate-run.mjs`, and `node scripts/gate-run.mjs --list` prints it. It used to be
   enumerated in this file and went stale twice, so the enumeration is gone - read the list rather than trusting
   this sentence). It is
   one script so CI, the Cloudflare repo hook and your own shell run the identical gates - and
   `npm run deploy` / `preview:deploy` run it before any wrangler command, so a red gate cannot ship. If
   a chain hides which step broke, run the steps separately - and read
   `.design/tmp-gate-logs/<set>/<step>.txt`: every step's full output is kept from the last run, pass or
   fail (D144). `npm run check:discord` and
   `npm run check:ai` need real credentials (`check:ai` also spends one model call) and are deliberately
   not in `verify`. Five more scripts sit outside `verify` on purpose, and each now has its reason written
   down rather than left to inference (D269): `review:render` plants placeholder states, builds, measures them
   with the browser gates and restores - it mutates the tree, so it is an instrument for the missing-content
   state (record 0024 found its defects there), not a gate; `check:area`, `check:rhythm` and `check:color` are
   design-round probes that report numbers and never exit non-zero, so in `verify` they would cost a build and
   a browser for no verdict; `probe:cpu` deploys a throwaway Worker to measure per-request CPU on the real
   runtime, which needs Cloudflare credentials and touches live infrastructure. `add-a-gate --audit` is what
   keeps this list honest: any script outside the runner with no reason anywhere is reported as drift.
   The cost guard in `gate-run.mjs` compares **work seconds, like-for-like** against `design/gate-cost.json`
   (the steps the baseline knows; new steps are listed with their cost) and **fails only when the run started
   and ended at or below 6/16cpu** - a contended rig is a WARN with the load printed, not a blocked ship step
   (D269). `npm run cost:save` refuses to freeze a baseline from a run above that load unless you pass
   `--force` and say why.
5. If this session is an **operating situation a runbook covers** - deploy/bindings/secrets, a
   Pages-vs-Worker mix-up, "which database is drizzle opening?", a migration that did not apply, an
   event feed that moved (a stale or duplicated meetup, a row to cancel, event art to mirror), or
   you need external research - read the matching `.notes/runbooks/<symptom>.md` **before
   improvising**. The index (symptom -> runbook) is `.notes/runbooks/README.md`; read
   `.notes/runbooks/research-request.md` before commissioning research. Runbooks live in `.notes/`,
   which is gitignored - they are host-local, so a fresh clone will not have them.
6. Resume from `NEXT.md`, and take the priority from `PLAN.md` §Milestones - never from memory or from a
   chat log. The roadmap is host-local (`.notes/` is gitignored); the tracked prose at the root is
   `AGENTS.md`, `README.md`, `DESIGN.md`, `MILESTONES.md` and `DECISIONS.index.md`. Durable plans that are
   not milestones live beside the plan: `roadmap-events.md` (surfacing and syncing the meetup schedule),
   `roadmap-brand.md` (the mark's surface identity, the colour expansion, and what either re-measures) and
   `asset-sources.md` (which image sources are legitimately usable, and what their terms are). Before you
   enter stage S2 or S3, check the gate table in `PLAN.md`: a stage is entered when the file proving its
   gate exists, not when the work is convenient.

## Work protocol

It's important to interpret operator prompts, roadmap items, milestones, and tasks in a flexible way, leaning towards producing a quality product for end-users. Towards that end, before taking action on anything, ensure you have a comprehensive plan towards achieving your goal. Towards that end, first do the following, and operate using the prompt resulting from this interpretation.

Create a deeper version of the task, not a bigger one. Before rewriting it:
(1) say what a top professional in this field would do here that the operator is not asking for;
(2) name the rawest material they would start from instead of what has already been digested;
(3) name the specific methods and tools they would use;
(4) say what, other than you or me, would show the result is right.
Then rewrite the operator's prompt to ask for exactly that.
Then execute on that resulting promp.

## Clock out (before you stop)

1. Write the session report in **`.notes/SESSIONS.md`** in the shape `PLAN.md` §Session protocol gives:
   the stage and milestone moved, what exists now that did not before (with its evidence), what remains in
   that milestone and by whom, every decision the operator must make with pros, cons and a recommendation,
   anything parked **with its trigger**, and the exact command the next session runs first.
2. Update **`.notes/NEXT.md`**: the stage, the active milestone, the exact first command, and any blocker.
   Leave it truer than you found it, because the next session reads only this file and then the plan.
   Do not put a queue back into it.
3. Record a durable decision's *why* in `.notes/DECISIONS.md`, not just its *what*, then run
   **`npm run decisions:index`** so the tracked `DECISIONS.index.md` gains its one line. Ids are append-only:
   never renumber one, because 600-odd citations in tracked code would silently re-point at a different
   decision. `check:decisions` fails on a `D###` citation with no entry - it caught one the day it landed.
   A planning ruling goes in `PLAN.md` §Rulings as one line with its cost class (`S###`, append-only); if
   the reasoning needs paragraphs, it is a decision and takes a `D###` as well. Never write the same ruling
   twice.
4. If the milestone moved, change its **status in `PLAN.md` §Milestones** and update **`MILESTONES.md`**
   (tracked) in the **same commit** - `check:plan` fails when the two disagree, and a plan the tracked
   projection does not match is a plan a fresh clone does not have.
5. Report status - done / blocked / unverified, with evidence. For **every open decision** the session touched,
   the report ends with a **recommendation, not a menu**: your ranked answer, one line of pros and one line of
   cons per option (including options the operator did not name, if they are real), the access or permission each
   option would require, and the one measurement that would change the ranking. If you recommend against a
   stated preference, say so plainly and say why.
6. Close the report with a **Value added** section - what this session delivered beyond the item it was given,
   and what it made cheaper for the next session (a gate that now catches a class of defect, a correction to a
   note the next session would have trusted, a probe that costs seconds instead of an hour). Anything in it that
   is not already in `NEXT.md`, `MILESTONES.md` or `DECISIONS.index.md` is a claim without an artifact, so land
   the artifact first.
7. Take notes in appropriate places about trouble or pitfalls you encountered, and propose the solution that
   lets a future session shortcut it - the pitfall register in `PLAN.md` is where a class of trap goes, and
   `.notes/PITFALLS.md` is where its detail lives.
8. Consider the parts of your work that took a lot of wall-clock time to execute on, and propose solutions to hasten future efforts that are likely to also take a lot of wall-clock time, without sacrificing quality of the project.
9. Ensure you commit your changes to a feature branch, so the operator can review it before merging to main.
10. If the operator has **approved the item** and a `staging` branch exists, merge the item into `staging`,
   push it, and report the preview URL (`npm run preview:deploy` - it runs `verify` first, then deploys a
   Worker Preview). `staging` is a review environment, not the site: it gets the preview D1 and preview KV,
   and it never touches the apex triggers. Protocol and gotchas: `.notes/runbooks/staging-branch-preview.md`
   (D124). `staging` -> `main`, and any production deploy, stay the operator's.

## How we work (practices that earned their place)

Each of these paid for itself in a real session; each has a cost attached in `.notes/PITFALLS.md`.

- **A doc or note line that a measurement contradicts is corrected or deleted in the same commit that
  contradicts it.** No exception for host-local files - host-local files are exactly what the next session
  trusts. `DESIGN.md` quoted a nav width its own probe contradicted for a day; `design/state.json` told a
  session to do work that was already done.
- **A measured number in tracked prose carries its date and its probe**: `@measured 2026-11-03 by
  check:space`. `check:figures` fails a stamp older than 60 days and counts unstamped measurement claims
  against a baseline. A decision gets a source; a measurement gets a date.
- **A deferral names its target, always.** "Defer whatever you like" produced a deferral list nobody could
  reconstruct. If it is not written with a trigger that un-parks it, it is not parked - it is lost (D148).
  `check:plan` now enforces it: a `paused` or `blocked` milestone row with no resume trigger fails the gate.
- **Rulings come back in answer form** (`1b, 2b, 3c`). Seven decisions in one line, none ambiguous. Ask
  numbered questions; answer numbered answers.
- **Blocking questions go into `NEXT.md`'s Operator ToDo before the session starts**, not discovered mid-run.
- **Read the file before you edit it.** A blind append to `scripts/gate-run.mjs` nearly shipped a dead
  function that referenced variables that did not exist.
- **A pipe swallows an exit code.** `npm run check:design | tail -30; echo $?` reported the exit of `tail`.
  Check the gate's own exit, or the manifest in `.design/tmp-gate-logs/`.
- **A tracked file generated from a host-local source is regenerated in the same commit that changes the
  source.** `DECISIONS.index.md` is generated from the gitignored `.notes/DECISIONS.md`, so writing a decision without
  running `npm run decisions:index` turned the index gate red on a branch sitting under review (D155). The gate firing
  is the mechanism working; the fix belongs to whoever wrote the id.
- **Measure a merge before proposing a merge order.** `git merge-tree --write-tree --name-only A B` reports conflicts
  with no worktree change and no build, and a chained run costs seconds. It found one conflict across three pending
  branches - both adding an import at the same line - and moving that import to its use site deleted the conflict
  rather than scheduling it (D156).

## Non-negotiables

- **Ground every claim** in a retrieved passage or a command you actually ran; never assert from memory.
  For Cloudflare and Astro docs, fetch the **markdown twin** of any page - `<url>/index.md` - instead of the
  HTML page: ~40x smaller, and table cells stay parseable (a stripped-HTML table cell nearly produced a wrong
  free-plan limit here). Product doc indexes: `https://developers.cloudflare.com/<product>/llms.txt`.
- **Do not push or publish.** The operator holds that grant; the delegate may commit its own item's
  work (the commit boundary is scoped per item - stage explicit paths only, never `git add -A`).
  Push requires the operator's explicit grant, and **only the operator runs `git push`** - a granted
  push is not delegated, it is done by the operator. This repo has a live production site behind
  `main`; merging and deploying stay with the operator for the same reason. The one exception the operator
  is considering (D124, not yet ruled) is the review branch: pushing **`staging`** after they approve an
  item, because a Worker Preview is not the site. Until they rule, do not push `staging` either - ask.
- **Native host OS only** - never `wsl`, `docker`, or `docker-compose`. Linux and Windows are both operating
  platforms for this rig (D131); run natively wherever it lives, and **name the OS in every measurement you
  report**: tool names, path fixtures and process-death semantics differ.
- **Never run a whole-filesystem search**; stay inside your workspace.
