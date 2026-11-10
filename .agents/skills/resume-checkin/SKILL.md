---
name: resume-checkin
description: Clocks in a session on this repo in one command: branch, HEAD, what is already dirty, which milestone the plan says is active, the real gate list, and whether the last measured gate run predates the commit you are standing on. Use at the start of every session, before reading memory or a chat log, and whenever you are unsure whether the numbers you are about to quote are current.
---

# Resume check-in

AGENTS.md §Clock in lists four reads. This does them at once, so the first ten minutes of a session are
not spent rediscovering the state of the rig — and so no gate count is quoted from memory, which is how
`AGENTS.md` came to describe a gate set that had drifted twice.

## Run it

```bash
node .agents/skills/resume-checkin/scripts/checkin.mjs
```

It reads; it never writes, builds, or touches the network. `--json` gives the same data machine-readable.

## What each block means, and what to do about it

| Block | If it says this | Then |
|---|---|---|
| `uncommitted` | paths you did not expect | They are someone else's in-progress work. Do not stage them; `git add` only your own item's paths. |
| `ahead of main / staging` | a large number | The verified tree is not the shipped tree. MS02's probe is about exactly that gap. |
| `What the plan says is active` | an `active`, `next`, `paused` or `blocked` row | That row's exit gate is the work. A `paused` row needs the trigger its row names before you touch it. |
| `WARNING: NEXT.md contains a queue heading` | it appeared | `check:plan` fails on that; fix NEXT.md before anything else. |
| `Last measured gate run` | `PREDATES HEAD` | Any number quoted from it describes code that is no longer in the tree. Re-run before quoting. |
| cost line | baseline older than a month | If your change moves the wall clock, `npm run cost:save` in the same commit and say why. |

## Then still read the two files

The script is a summary, not a substitute. Before starting milestone work, open `.notes/PLAN.md`
§Milestones (the only place "what's next" lives) and `.notes/NEXT.md` (the traps). `.notes/` is
gitignored, so on a fresh clone or CI checkout it is absent: the script says so, and the tracked
projection to read there is `MILESTONES.md`.
