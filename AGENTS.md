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

## Clock in (run this at the start of every session)

1. Read **`.notes/NEXT.md`** - the current priority, its queue id, and the exact next command.
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
   Skills are tracked, so if one goes stale against the code, **fix it in the same commit** that makes
   it stale (e.g. a config change invalidates the config block quoted in `astro/SKILL.md`).
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
3. `git status --short -- .` - know what is already uncommitted before you touch anything. Then
   `git log --oneline main..HEAD | cat` to see how far the branch is ahead, and run the CI gate set
   once so you know whether the branch is green *before* you start changing it: `check`,
   `check:classes`, `db:check`, `build`, `check:sanitize`, `check:cache`, `audit:gate`. Run them as
   separate commands, not one `&&` chain - a chain stops at the first failure and you lose the rest
   of the picture. `npm run check:discord` needs real credentials and is deliberately not in CI.
4. If this session is an **operating situation a runbook covers** - deploy/bindings/secrets, a
   Pages-vs-Worker mix-up, "which database is drizzle opening?", a migration that did not apply, or
   you need external research - read the matching `.notes/runbooks/<symptom>.md` **before
   improvising**. The index (symptom -> runbook) is `.notes/runbooks/README.md`; read
   `.notes/runbooks/research-request.md` before commissioning research. Runbooks live in `.notes/`,
   which is gitignored - they are host-local, so a fresh clone will not have them.
5. Resume from `NEXT.md`. Do not re-derive the priority from the roadmap - the roadmap is not in
   this repo (`AGENTS.md` and `README.md` are the only tracked .md files), so `NEXT.md` is the only
   queue view a session gets. Durable plans that are not queue items live beside it: `roadmap-events.md`
   (surfacing and syncing the meetup schedule) and `asset-sources.md` (which image sources are
   legitimately usable, and what their terms are).

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

1. Update **`.notes/NEXT.md`**: the current item, its queue id, the exact next command, and any
   blocker. Leave it truer than you found it, because the next session has only this file.
2. Record a durable decision's *why* in `.notes/DECISIONS.md`, not just its *what*.
3. Report status - done / blocked / unverified, with evidence.
4. Take notes in appropriate about trouble or pitfalls you encountered as well as propose solutions to ensure future efforts can shortcut the trouble.
5. Consider the parts of your work that took a lot of wall-clock time to execute on, and propose solutions to hasten future efforts that are likely to also take a lot of wall-clock time, without sacrificing quality of the project.
6. Ensure you commit your changes to a feature branch, so the operator can review it before merging to main.

## Non-negotiables

- **Ground every claim** in a retrieved passage or a command you actually ran; never assert from memory.
  For Cloudflare and Astro docs, fetch the **markdown twin** of any page - `<url>/index.md` - instead of the
  HTML page: ~40x smaller, and table cells stay parseable (a stripped-HTML table cell nearly produced a wrong
  free-plan limit here). Product doc indexes: `https://developers.cloudflare.com/<product>/llms.txt`.
- **Do not push or publish.** The operator holds that grant; the delegate may commit its own item's
  work (the commit boundary is scoped per item - stage explicit paths only, never `git add -A`).
  Push requires the operator's explicit grant, and **only the operator runs `git push`** - a granted
  push is not delegated, it is done by the operator. This repo has a live production site behind
  `main`; merging and deploying stay with the operator for the same reason.
- **Native host OS only** - never `wsl`, `docker`, or `docker-compose`. Linux and Windows are both operating
  platforms for this rig (D131); run natively wherever it lives, and **name the OS in every measurement you
  report**: tool names, path fixtures and process-death semantics differ.
- **Never run a whole-filesystem search**; stay inside your workspace.
