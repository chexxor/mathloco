---
name: add-a-gate
description: Adds a check to `npm run verify` the way this repo's gates are built: a pure verdict, a selftest that plants each defect class and requires a named failure, wiring into scripts/gate-run.mjs with the right scheduling, and the milestone row it satisfies in the same commit. Use before writing any new check, and use its audit when a gate exists but never runs.
---

# Add a gate

A gate in this repo is not a script that prints a warning. It is a mechanism that fails, on purpose, on
the branch that introduces the defect. Five parts, and the fifth is the one people skip.

## The anatomy

1. **A pure `verdict(data)`** returning an array of findings. Every gate here is written this way
   (`check-lsp-config.mjs`, `check-plan.mjs`, `check-ics.mjs`) because the selftest needs to plant
   defects without touching the file on disk.
2. **A finding that names the fix.** "lsp.servers.astro is missing - no server is registered for
   .astro, so 19 markup files have no LSP" tells the next session what to write. "config invalid" does not.
3. **`--selftest` with plantings.** Each planting is a real mutation of the real config/file, and the
   gate must NAME it. A gate nobody has seen fail is a gate that is measuring nothing.
4. **Clone mode, if it reads `.notes/`.** `.notes/` is gitignored, so a CI checkout has no plan, no
   decisions log, no NEXT.md. A gate that reads those must fall back to the tracked projection and say so
   (`check:plan` and `decision-index.mjs --check` both do), and the selftest must plant the clone case.
5. **Wiring, in the same commit.** `package.json` + `scripts/gate-run.mjs`. A gate that is not in the
   runner runs only when a human remembers it, which is not a gate.

## Run it

```bash
node .agents/skills/add-a-gate/scripts/gate-skeleton.mjs --audit      # what is already drifted
node .agents/skills/add-a-gate/scripts/gate-skeleton.mjs --new check:attendance
```

`--new` writes `scripts/check-<name>.mjs` and prints the wiring lines. It refuses to overwrite.

Before the gate is real, all three modes exit 1 with the same named fix (`check:foo: CHANGE-ME missing -
set TARGET to the file this gate checks`) - the skeleton guards every read of `TARGET`, so a placeholder
never produces a stack trace. Fill `TARGET` first, then the `verdict`, then the plantings.

Do not copy the template somewhere else to test it. `root` is computed as `new URL('..', import.meta.url)`,
which is the repo root only for a file in `scripts/`; anywhere else it resolves one level too high and the
gate reports a file missing that is sitting beside it (`.notes/PITFALLS.md`, measured 2026-11-10).

## Scheduling, and why it matters

| The gate reads | Put it | Because |
|---|---|---|
| source or config only | `DEPLOY`, before `build` | D118: a gate that can go red before anyone builds catches the defect on the branch that introduced it |
| `dist/` | `DEPLOY` with `needs: ['build']` | the artifact does not exist yet |
| a rendered page | `BROWSER`, `needs: ['check:render:dist']` | the browser set does not build; it stands or falls on `dist/` being fresh (`design/dist-fresh.mjs`) |
| its own pool of browsers | `BROWSER` + `alone: true` | two browser pools in one wave flaked here: `check:mark` alone is 10s, beside the others it took 152s and failed twice |
| files in `.notes/` | anywhere, with clone mode | see above |

A mutating selftest runs **after** the read-only probes that measure the same artifact — otherwise a
planted page gets measured by a probe that reports a defect that never happened.

## Prove it, then record it

```bash
node scripts/gate-run.mjs check:attendance check:attendance:selftest
cat .design/tmp-gate-logs/deploy/manifest.txt        # every step's exit, and the wall clock
```

Then, in the same commit:

- the `PLAN.md` §Milestones row whose exit gate this satisfies, and `MILESTONES.md` - `check:plan` fails
  when the two disagree, and a plan the tracked projection does not match is a plan a clone does not have;
- the *why* in `.notes/DECISIONS.md` as a new `D###`, then `npm run decisions:index` so
  `DECISIONS.index.md` (tracked) gains its line. Ids are append-only: never renumber one; 600-odd
  citations in tracked code would silently point at a different decision;
- the cost: if the wall clock moved materially, `npm run cost:save` and say so in the commit message.
  Two 0.11s gates in a 16s set do not need a re-baseline; a new browser probe does.

## The audit catches the two ways gates rot

- **a runner step with no script behind it** → exit 1. This is the only hard failure the audit reports.
- **a `check:` script nobody runs** → listed, and flagged when neither `gate-run.mjs` nor `AGENTS.md`
  gives a reason for the exclusion. `check:discord` and `check:ai` are deliberately outside `verify`
  (they need credentials, and `check:ai` spends a model call); a gate with no stated reason is drift.
- **a gate with no selftest** → listed as a candidate. Not every gate needs one, but a gate that guards a
  config nobody can see is the class that does.
