# Context budget: handoffs instead of pi's compaction

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/context-handoff-budget.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

Symptoms this covers: "did the session compact?", "how do I stop pi summarising the transcript away",
"why is every tool blocked?", "what is `.ai-work/handoffs/`?", "which thresholds are in force for this
model?", "is the context-budget extension actually loaded in this project?"

Everything below was run on **Linux (native, no WSL), 2026-11-09**, node **v24.22.1**, pi **1.5.0**.

## What is installed, and where

`@woksin/pi-context-budget` **0.6.0**, installed **project-local** (not global):

```
pi install npm:@woksin/pi-context-budget -l
```

`pi list` on this rig (measured 2026-11-09):

```
Project packages:
  npm:pi-cloudflare            /home/chexxor/Git/mathloco/.pi/npm/node_modules/pi-cloudflare
  npm:@woksin/pi-context-budget /home/chexxor/Git/mathloco/.pi/npm/node_modules/@woksin/pi-context-budget
```

The package registers one tool, `context_handoff`, and hooks `session_before_compact`, `tool_call`,
`turn_end`, `agent_before_settle`, `input`, `context` and `session_start`
(the package's own `extension.ts`, 327 lines - read it before trusting it; it is a file in the installed
pi extension, not in this repo).

**Config:** `~/.pi/agent/context-budget.json` (the extension resolves
`PI_CONTEXT_BUDGET_CONFIG || join(getAgentDir(), "context-budget.json")`; there is no project-scoped
config path, so the *scope* is done with `enforceCwds`). **State:** `~/.pi/agent/context-budget/`
(`status/<sessionId>.json`, `events.jsonl`). **Handoff files:** `<repo root>/.ai-work/handoffs/<sessionId>-<n>.md`
plus a `.json` sidecar - now gitignored.

**Installing does not inject code into a running session.** A session that started before the install
needs `/reload` or a new session. Config changes *are* re-read on every input, so editing the thresholds
takes effect in a live session without reloading.

## The policy in force (measured, not assumed)

```json
{
  "mode": "enforce",
  "enforceCwds": ["/home/chexxor/Git/mathloco"],
  "overflowRecovery": true,
  "main":     { "soft": 90000,  "handoff": 120000, "hard": 150000, "minProgress": 40000 },
  "subagent": { "soft": 60000,  "handoff": 80000,  "hard": 110000, "minProgress": 20000 },
  "models": {
    "strata/qwen3.8-flash-next-iq3_s":            { "main": {...}, "subagent": {...} },
    "strata-server/qwen3.8-flash-next-iq3_xxs":   { "main": {...}, "subagent": {...} }
  },
  "idleMinutes": 50, "idleMinTokens": 90000, "keepRecentTokens": 24000,
  "maxHandoffsPerSession": 10,
  "loop": { "maxHandoffsWithoutProgress": 2, "withinTurns": 8 }
}
```

- **soft** - one UI notice: finish the step, hand off at the next boundary. No steer, no block.
- **handoff** - every tool except `context_handoff` is blocked; the agent writes a structured handoff
  (goal, next step, verified facts, verbatim user constraints, hypotheses kept separate, files to read),
  and at `turn_end` pi commits a **retain-none compaction whose summary is that handoff**. Context
  returns to floor + handoff.
- **hard** - fallback: if no usable handoff exists, the extension supplies a bounded mechanical summary
  instead of pi's summarizer, and pi's own compaction is intercepted
  (`session_before_compact` -> `{compaction: {summary, firstKeptEntryId: null}}`).
- **pi's native compaction stays enabled** as the overflow backstop. In `enforce` mode it never reaches
  pi's LLM summarizer: "Enforce mode never delegates to pi's default summarizer" (README).

Thresholds are **floor-relative**: `effective handoff = min(hard, max(handoff, floor + minProgress))`,
where floor is the first assistant usage after bootstrap. Status snapshots print both raw and effective.

## Why this beats compaction here

`pi-compaction-budget.md` measured, on this rig: a native compaction costs **132-492 s** on
`strata-server` and up to **1,318 s** on `strata` (it is a *separate* completion over the whole
transcript), buys only 3-14k tokens of room at the old trigger, and can fail outright with
`Auto-compaction failed: ... generation hit the token cap`.

A handoff costs no separate summarization call: the model writes it as a tool result inside the turn it
is already in, capped at 48 KiB, and the full transcript stays in the session file plus the handoff file
on disk. **Not yet measured end-to-end on this rig** - the mechanism is read from the source, the wall
clock is not.

## The check (run this before blaming compaction)

```bash
node .notes/bin/pi-context-budget-check.mjs
```

Output 2026-11-09:

```
config: /home/chexxor/.pi/agent/context-budget.json
mode: enforce  effective here (/home/chexxor/Git/mathloco): enforce
state: /home/chexxor/.pi/agent/context-budget

provider/model                            role           ctx  native>  handoff    soft    hard  margin handoff wins?
strata-server/qwen3.8-flash-next-iq3_xxs   main        131072   104858    78000   60000   95000   26858  yes
strata-server/qwen3.8-flash-next-iq3_xxs   subagent    131072   104858    55000   40000   70000   49858  yes
strata/qwen3.8-flash-next-iq3_s            main        204800   163840   120000   90000  150000   43840  yes
strata/qwen3.8-flash-next-iq3_s            subagent    204800   163840    80000   60000  110000   83840  yes

floor observed this rig (first assistant usage per session, last 40 sessions): strata/iq3_s=1559,
strata/qwen3.8-flash-next-iq3_s=8867, strata-server/qwen3.8-flash-next-iq3_s=480,
strata-server/qwen3.8-flash-next-iq3_xxs=6537
```

`margin` is `native trigger - handoff threshold`. **Negative margin means pi compactes first and the
extension only backstops it.** Any model added to `models.json` needs a matching entry in
`context-budget.json` `models` - the same drift that made the old `reserveTokens` mis-target (see
`pi-compaction-budget.md`).

Read the live state of a session directly:

```bash
cat ~/.pi/agent/context-budget/status/<sessionId>.json      # phase, tokens, floor, effectiveThresholds
tail -20 ~/.pi/agent/context-budget/events.jsonl            # soft_crossing / blocked / handoff_committed
```

## Proof the enforcement path works (deliberate low-threshold test, 2026-11-09)

A throwaway config (`PI_CONTEXT_BUDGET_CONFIG=/tmp/cb-test/context-budget.json`, handoff 10,700, hard
13,000) was pointed at a real session in this repo, asked to run three `bash` calls:

- `events.jsonl`: `soft_crossing` -> `blocked` ("Every tool except context_handoff is blocked...") ->
  `handoff_written` -> `handoff_committed` -> `turn ... phase idle` with `tokens: null, floor: null`.
- The session JSONL gained **10 compaction entries, each `details: {"kind":"handoff", "path": ".ai-work/handoffs/..."}`**,
  `tokensBefore` 11,583-32,055, and the context after each commit fell back to the floor (~13.8k).
- After 2 handoff commits with no other successful tool call the loop guard fired and the phase went
  `degraded` (no `pi-session` wrapper, so no relaunch) - enforcement paused rather than deadlocking the
  session, exactly as the README describes.

Test artifacts were deleted; the extension's own state dir and this repo's `.ai-work/` are where real
records land.

## Traps

- **The config is global; the scope is the cwd.** `enforceCwds` limits enforcement to this repo - in any
  other directory the same file runs in observe mode. Forgetting it means a delegate in another project
  wonders why nothing fires.
- **`/reload` is not free.** It re-runs every extension; do not reload a session that is mid-work.
- **Handoff files can contain secrets.** The README warns that full job commands, including inline
  tokens, are written into the handoff. Treat `.ai-work/handoffs/` as sensitive; do not paste a handoff
  into a public issue.
- **The loop guard is a real limit.** `maxHandoffsWithoutProgress: 2` within 8 turns: if the model keeps
  handing off without doing work, enforcement degrades (no wrapper) or falls back to a relaunch (with
  `pi-session`). If a session starts saying "handoff loop limit reached", it has hit that guard.
- **Thresholds are per model id, exact-match.** A model renamed in `models.json` silently stops matching
  its override. The check script prints the floors and the margins; run it after editing either file.
- **Do not set `mode: "off"` casually.** `off` also disables the overflow recovery (`overflowRecovery`
  is only honoured in observe/enforce), so a real provider overflow goes back to pi's default summarizer.

## Where the ruling lives

Host pi config with no tracked code citing it, so **no `D###` id** - same ruling as `3b` in
`pi-compaction-budget.md`. The one tracked artifact this produced is `.gitignore`'s `.ai-work/` entry,
committed with this session.
