---
name: measure-a-claim
description: Turns any number quoted in this repo's prose into a re-runnable measurement: which probe produces it, when it was last run, whether it is about to expire under check:figures' 60-day rule, and the exact command to re-measure it. Use whenever you are about to write a number into DESIGN.md, README.md, a roadmap file or a plan, and whenever check:figures goes red on a stale stamp.
---

# Measure a claim

Every number in this repo's authority docs is a claim with an expiry date. `DESIGN.md` carried three
figures its own probes contradicted in one week - a nav row that "needs 171px" while `check:space`
reported 176, a margin that "clears by 105px" when it clears by 100, and "the browser ritual is ~14s"
against a measured 87.8s. None of those were lies; they were true once. A stale measurement in an
authority doc is worse than no measurement, because it is not questioned.

## Run it

```bash
node .agents/skills/measure-a-claim/scripts/stamps.mjs          # every stamp, its age, its command
node .agents/skills/measure-a-claim/scripts/stamps.mjs --due    # expiring within 30 days
node .agents/skills/measure-a-claim/scripts/stamps.mjs --stale  # already past 60 days (the gate is red)
```

It reads `DESIGN.md` with the same grammar `check:figures` enforces, and prints for each stamp: the
date, the age, the figures it covers, and the command that re-runs the instrument. It never runs a
probe itself - that is the session's decision.

## Which probe answers which claim

| The claim you want to make | Instrument |
|---|---|
| a row needs N px at width W; bands, keylines, nav fit | `npm run check:render:dist` (over the existing `dist/`; `check:render` builds first) |
| per-event date/leaf/plate geometry | `node design/schedule-geometry.mjs` |
| where the emptiness is, and what each reserved slot measures | `npm run check:space` |
| the painted page ground and the painted hairlines | `npm run check:ground` (pixel bytes, not colour strings) |
| the mark at 320 and 1240 | `npm run check:mark` |
| contrast and colour roles | `npm run check:color`, `check:render` |
| how much CSS ships, and which utilities nothing writes | `npm run check:css-utilities` |
| the wall clock of the gate set | `npm run verify`, then `cat .design/tmp-gate-logs/deploy/manifest.txt`; `npm run cost:check` |
| the browser ritual's cost | `npm run verify:browser` |

Browser probes take the machine: `check:mark` alone is 10s, in a wave with the others it took 152s and
failed twice. Price a new browser probe before adding it.

## The stamp

```
@measured 2026-11-03 by check:space
```

- It covers every figure below it in the section, until the next heading or the next stamp.
- A figure is a number with a unit: `px % ms s deg ° KB MB octets`. Only measurement-shaped prose is
  policed; values inside code spans and fenced blocks are definitions, not claims about the render.
- Ratified scale values ("body 17.6px/24px", "4px grid") are decisions with sources in
  `design/decisions.json`. A decision gets a source; a measurement gets a date. Stamping a ratified
  token is theatre.

## The rules, in order

1. **Do not write a number you did not run.** Ground every claim in a passage you retrieved or a command
   you actually ran (AGENTS.md §Non-negotiables).
2. **Name the machine.** "Linux, native, Firefox 159, 16 CPU" - tool names, path fixtures and
   process-death semantics differ between hosts, so a number without its rig is not reproducible.
3. **Never extend a date.** If the stamp is stale, re-run the probe and update the number *and* the
   date in the same edit. If the number moved, the prose that quotes it moves too - a doc line a
   measurement contradicts is corrected or deleted in the same commit that contradicts it.
4. **Ratchet the baseline down, not up.** The count of unstamped figures may not exceed
   `design/figures.baseline.json`. After stamping more, `npm run check:figures --save` freezes the new,
   lower number.
5. **Suspect the instrument before the design.** A probe that samples pixels with a hardcoded 3-byte
   stride reads RGBA one channel off; a probe that throws can still be counted as a measured row. Get
   the stride from the decoder, wrap each probe section in try/catch, and record the error in the row.
