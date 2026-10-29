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
2. `git status --short -- .` - know what is already uncommitted before you touch anything.
3. If this session is an **operating situation a runbook covers** - broker down/stalled, store
   corruption, a degenerate seat, leaked worktrees, a merge/conflict, or you need external research -
   read the matching `.notes/runbooks/<symptom>.md` **before improvising**. The index (symptom → runbook)
   is `.notes/runbooks/README.md`; read `.notes/runbooks/research-request.md` before commissioning research.
4. Resume from `NEXT.md`. Do not re-derive the priority from the 1300-line roadmap.

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
- **Do not push or publish.** The operator holds that grant; the delegate may commit its own item's
  work (the commit boundary is scoped per item - stage explicit paths only, never `git add -A`).
  Push requires the operator's explicit grant.
- **Native host OS only** - never `wsl`, `docker`, or `docker-compose`. Linux and Windows are both operating
  platforms for this rig (D131); run natively wherever it lives, and **name the OS in every measurement you
  report**: tool names, path fixtures and process-death semantics differ.
- **Never run a whole-filesystem search**; stay inside your workspace.
