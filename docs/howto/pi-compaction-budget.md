# pi's compaction budget - is it firing where we think it is?

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/pi-compaction-budget.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

Symptoms this covers: "pi compacted way too early", "why did the session forget everything",
"compaction keeps firing every few turns", "the context bar says 25% but it compacted",
**`Auto-compaction failed: Summarization failed: generation hit the token cap and the summary is
incomplete`**, "I changed `contextWindow` in `models.json` - does compaction follow?",
"which compaction settings are actually in force for `strata-server`".

Everything below was run on **Linux (native, no WSL), 2026-11-06**, node **v24.22.1**, pi
**1.5.0** at `~/.pi/agent/install/releases/1.5.0/`.

**Update 2026-11-09:** the `pi-context-budget` extension is now installed project-local and runs in
`enforce` mode scoped to this cwd, so the trigger arithmetic below is now the **backstop**, not the
first line of defence - a structured handoff fires at 120,000 (`strata`) / 78,000 (`strata-server`)
before pi's summarizer is ever called. Read `context-handoff-budget.md` before changing either budget;
`node .notes/bin/pi-context-budget-check.mjs` prints both and flags a model whose handoff threshold
sits above its native trigger.

## One command, real resolution

```
node .notes/bin/pi-compact-check.mjs
```

It loads `~/.pi/agent/models.json`, resolves the settings **through pi's own `SettingsManager`**
(so the merge order and the per-model key rules are pi's, not a guess), and prints, per model:
the window, the effective `reserveTokens`, the effective `keepRecentTokens`, the first context
size that triggers, and what percent of the window that is. `--target 0.80` also prints the
reserve that *would* hit the target and an `ok` flag. Measured output is in "What was wrong" below.

It also prints **stale `compaction.modelOverrides` keys** - a key whose `provider/modelId` is no
longer in `models.json` is an invisible dead budget (it found `strata/iq3_s`, see below).

## How pi decides (quoted, not remembered)

`compaction.md` in the pi release docs (`docs/` of the installed pi release, not this repo), "When It Triggers":

```
contextTokens > contextWindow - reserveTokens
```

and `dist/core/compaction/compaction.js:173`:

```js
export function shouldCompact(contextTokens, contextWindow, settings) {
    return contextTokens > contextWindow - settings.reserveTokens;
}
```

- **`reserveTokens` is an absolute token count, not a percentage.** There is no percentage
  setting. A "compact at 80%" policy has to be written per model as `reserve = ctx * 0.20`.
- **Resolution order** (`dist/core/settings-manager.js:660-671`):
  `compaction.modelOverrides["<provider>/<modelId>"]` -> ordinary `compaction.reserveTokens` ->
  built-in default (`16384`, `keepRecentTokens` default `20000`, `dist/core/compaction/compaction.js:55`).
  Keys are **exact, case-sensitive `provider/modelId`** - `${model.provider}/${model.id}`.
  `enabled` is global, never per model.
- **`contextTokens` is provider-reported**, not a guess: `calculateContextTokens()` =
  `usage.totalTokens || input + output + cacheRead + cacheWrite`
  (`compaction.js:65`), and the same estimate feeds the TUI's percent readout
  (`agent-session.js:3546`), so "the bar" and the trigger agree.
- Checks run **between turns** (after tool results are appended, before the next assistant
  response), before a new prompt, and as one compact-and-retry **overflow recovery** after the
  provider itself reports overflow (`agent-session.js:443, 494, 2461, 2487, 2525`).

## What was wrong on this rig (measured 2026-11-06)

`~/.pi/agent/settings.json` carried one global `reserveTokens: 99800` / `keepRecentTokens: 4000`
plus an override keyed `strata/iq3_s` - **a model id that no longer exists in `models.json`**, so
nothing applied to either live model. Output before the fix (same command, `AGENT_DIR` pointed at
a copy of the pre-fix settings):

```
strata-server/qwen3.8-flash-next-iq3_s       131072   99800   4000    31272   23.9       26214   n
strata/qwen3.8-flash-next-iq3_s              204800   99800   4000   105000   51.3       40960   n
stale compaction.modelOverrides keys (no such model in models.json): strata/iq3_s
```

So **`strata-server` was compacting at ~24% full, not ~80%** - it fired at 131,072 − 99,800 =
**31,272** tokens, and kept only 4,000 recent tokens. The 99,800 was a budget for a ~200k window
(the old `strata/iq3_s` entry was `contextWindow: 200000`, `maxTokens: 50000` in
`models.json.strata-bak-20261105-133856`); when the models were re-pointed at
`131072`/`204800`, the reserve did not follow.

**Corroboration from the session logs, independent of the config** - every `compaction` entry
records `tokensBefore`:

```
cd ~/.pi/agent/sessions && grep -h '"type":"compaction"' */*.jsonl \
  | python3 -c "import sys,json;print(sorted(json.loads(l)['tokensBefore'] for l in sys.stdin))"
```

Measured: seven `strata-server` compactions today at **31,626 / 31,713 / 31,982 / 32,842 /
33,084 / 33,194** (one at 86,012, reached by a single big tool batch crossing the bar), and
`strata` (204,800) compactions clustered at **105,404-106,507** - exactly `ctx - 99800` for each
window. Three independent lines - config resolution, the code formula, the recorded firing points
- agree.

After the fix (`~/.pi/agent/settings.json`, backup kept as
`settings.json.pre-compact-fix-20261106-120121`):

```
strata-server/qwen3.8-flash-next-iq3_s       131072   26214  16000   104858   80.0       26214   y
strata/qwen3.8-flash-next-iq3_s              204800   40960  24000   163840   80.0       40960   y
```

Rule of thumb used: **`reserveTokens = ctx * 0.20`** (fires at 80%), **`keepRecentTokens ≈ ctx *
0.12`**. A global fallback of `32000/16000` is a floor, not a policy: it fires at 75.6% on a
131k window and 96.8% on a 1M window. **Any model whose window you change needs its override
changed in the same edit** - that is exactly how this drifted.

## Does the endpoint actually allow a compaction at 80%? (yes, with one live risk)

The summary request is a *separate* completion over the whole conversation, so its input+output
must fit the window:

- Tool results are truncated to **2,000 chars** each when serialized for summarization
  (`dist/core/compaction/utils.js:82`), so the summary prompt is much smaller than the context it
  summarizes. Measured over 160 strata compactions: **median ratio ~0.48**, max **0.66**
  (148,217 input for a 224,702-token conversation). At `strata-server`'s 104,858 trigger that is
  **~50-69k input**, and `69k + 16,384 + 4,096 < 131,072` - it fits.
- pi clamps the summary's output itself: `clampMaxTokensToContext()` =
  `min(model.maxTokens, ctx - input - 4096)` (`pi-ai/dist/api/simple-options.js:3-11`), so a big
  conversation shrinks the summary budget rather than overflowing the window.
- Streaming path: `_runAutoCompaction` -> `_runDefaultCompaction` passes `streamFn`, so the
  300s default HTTP **idle** timeout (`pi-coding-agent/dist/core/http-dispatcher.js:4`) is kept
  alive by tokens; it is not the constraint.

**The live risk is the output cap, not the window.** `getSummarizationFailure()`
(`compaction.js:453-461`) rejects a `length` stop with
`Summarization failed: generation hit the token cap and the summary is incomplete`, and
`_runAutoCompaction`'s catch turns that into `Auto-compaction failed: ...` and returns false -
the session then keeps going and the next request hits a real provider overflow, whose one
recovery attempt has the same cap. Measured summary outputs on `strata-server` (declared
`maxTokens: 16384` at the time, and `/status` shows the server honoring it: `"max_tokens": 16384`
in flight) already reach **14,416** and **16,290** on conversations that were only ~32k long.
Summaries of the same model family at 150k-184k before-tokens wanted **8,613-25,485** output tokens
(those sessions had a larger declared cap). At an 80% trigger the span being summarized is ~85k
tokens, so **16,384 sat in the middle of the plausible range**.

**Ruled 2026-11-06 (operator approved `1a`): `strata-server`'s declared `maxTokens` is now
`24576`** in `~/.pi/agent/models.json` (prior file kept as `models.json.pre-maxtokens-20261106-121524`).
The arithmetic that makes it safe: at the 104,858 trigger the summary input is ~0.48 x that =
~50,332, so pi's clamp leaves `131,072 - 50,332 - 4,096 = 76,644` available and the declared
24,576 is used whole. Confirmed by the tool, which now prints that budget (`sumOut`):

```
strata-server/qwen3.8-flash-next-iq3_s  131072  maxOut 24576  fires>104858  80.0  sumOut=24576
```

Cost of the raise, stated: `maxTokens` is also the **per-turn** output cap, so a single answer can
now run to 24,576 output tokens = **~9-10 minutes** of decode at the measured 40-48 tok/s instead
of ~5.7 minutes. Nothing else about the request changes.

**Not yet verified:** that the Strata endpoint *accepts* `max_tokens: 24576`. What is measured is
that it honors the value it is given (`/status` showed `"max_tokens": 16384` mid-generation) and
that `n_ctx` is 131,072. I did not spend a probe on it because the server is single-slot and busy -
a completion probe queues behind live sessions (one timed out at 120s that way on 2026-11-06). The
first real compaction after the change is the test: `/status` should show `max_tokens: 24576`, and
the session must not print `Auto-compaction failed: ... token cap`. A refusal would surface as an
assistant error, not a silent truncation.

**Ruled 2026-11-06 (round 2, accepted): `strata`'s declared `maxTokens` is now `32768`** (prior
file kept as `models.json.pre-maxtokens-local-20261106-124227`). The same failure mode existed
there: 25,600 sat at the very top of its own measured want (max 25,485 for a 152k conversation),
while the window allowed far more. Verified after the change:

```
strata/qwen3.8-flash-next-iq3_s  204800  maxOut 32768  res 40960 keep 24000  fires>163840  80.0  sumOut=32768
```

`204,800 - 0.48 x 163,840 - 4,096 = 122,061` available, so the clamp uses the declared 32,768 whole.
And the local endpoint's own window is honest: `GET /v1/models` on `127.0.0.1:8080` reports
**`n_ctx: 204800`** (as opposed to `131072` on the LAN `strata-server`) - the two are different
machines: this host is `192.168.1.101`, so the `0.0.0.0:8080` listener here is the local one and
`192.168.1.52` is the server. Cost, same as the other raise: the per-turn output cap rises to
32,768 tokens.

**Not verified by a probe:** that either endpoint *accepts* the raised value (see the caveat above).
Cheap way to confirm without spending a completion: `GET /status` echoes the `max_tokens` of the
request in flight. On 2026-11-06 12:45 it still read `max_tokens = 25600` on the local endpoint and
`16384` on the server, from sessions that started before the edits - after each seat runs `/reload`,
those numbers should read `32768` and `24576`.

**Wall-clock cost, measured** - two numbers per compaction, both read out of the session JSONL:
how long the summarization call took (previous assistant entry -> `compaction` entry), and how
much room it bought (context of the first assistant reply *after* it, from that reply's provider
usage):

```
2026-11-06T16-37-17  strata-server  ctx 131072  fires>31272  keep 4000
  before= 86012  summaryOut= 3352  roomAfter=13529  nextIn=645s
  before= 31982  summaryOut= 8743  roomAfter=19399  nextIn=452s
  before= 33084  summaryOut= 7708  roomAfter=17081  nextIn=685s
  before= 31713  summaryOut=11030  roomAfter=21767  nextIn=1200s
  before= 33194  summaryOut=14416  roomAfter=26223  nextIn=761s
  before= 31626  summaryOut=16290  roomAfter=28286
2026-11-06T00-23-41  strata-server (before models.json moved to 131072; before-values show the
                         window then was 204800: 204800-99800=105000, observed 105057-105405)
  before=105404  summaryOut= 1832  roomAfter=14777  nextIn=4643s
  before=112213  summaryOut=23567  roomAfter=33637  nextIn=2332s
```

So the old setting cost **132-492 s per compaction** on `strata-server` (`tokens_per_s` 40-48 per
`/status`, single slot) and bought only **3-14k tokens of headroom** - a compaction every
**7-20 minutes** of work, because the summary itself is 8-16k tokens and the trigger sat at
31,272. `strata` (local) compactions took up to **1,318 s** at 152k before-tokens.

At the fixed setting the trigger is 104,858 and the post-compaction floor is system+tools (~8k,
the `cacheRead` a fresh session reports) + summary (~4-16k measured here) + kept 16k = **~37-40k**,
i.e. **~65k tokens of headroom** - about **5-8x more room per compaction**, and 16k verbatim
recent tokens instead of 4k. Each individual compaction will still take minutes.

**Ruled 2026-11-06 (operator approved `2a`): accept the wall-clock.** Parked alternative, with its
un-park trigger so it is parked and not lost: an extension on `session_before_compact` that
summarizes with a fast remote model (pi supports extension-provided compaction content -
`_runAutoCompaction` takes `extensionResult.compaction` and skips the local summary call).
**Un-park when either** a single compaction exceeds ~10 minutes on that endpoint, **or** a session
prints `Auto-compaction failed` twice.

## Server-side facts worth having at hand

```
K=$(python3 -c "import json;print(json.load(open('$HOME/.pi/agent/auth.json'))['strata-server']['key'])")
curl -sS -m 20 -H "Authorization: Bearer $K" http://192.168.1.52:8080/v1/models   # meta.n_ctx
curl -sS -m 20 -H "Authorization: Bearer $K" http://192.168.1.52:8080/status      # busy/phase/tokens_per_s
```

Measured 2026-11-06: `qwen3.8-flash-next-iq3_s` is `loaded` with **`meta.n_ctx: 131072`** - the
`contextWindow` in `models.json` matches the served window, so the 131,072 used in the arithmetic
is real, not a guess. `/status` answers with `busy`, `queued`, `phase`, `prompt_tokens`,
`generated`, `max_tokens`, `tokens_per_s`, `elapsed_s`, and a text `tail`.

The server is **single-slot**: a probe completion queued behind a live session and timed out at
120s while `/status` showed another session `phase: answering` for `elapsed_s: 420`. So a
completion probe timing out is not evidence the endpoint is down - read `/status` first. Do not
put a short `-m` on a completion probe against this host.

## Traps found doing this

- **A fixed `reserveTokens` silently mis-targets the moment a `contextWindow` changes.** The
  config looked "tuned for 200k" and stayed there while the models moved to 131,072. Re-run
  `pi-compact-check.mjs` after any edit to `models.json`.
- **Per-model override keys are exact and go dead on a model-id rename**, with no warning
  anywhere in the UI. The tool's stale-key line is the only check.
- **A live pi session can overwrite `settings.json`, and never re-reads it on its own.**
  `SettingsManager.save()` (`settings-manager.js:170, 474`) writes its whole in-memory object on any
  settings change, so an edit made while pi is running can be reverted by pi. Run **`/reload`** in
  every live session after the edit (slash command `reload` -> `agent-session.js:3025`
  `settingsManager.reload()`), or start a new session; until then the running seat keeps the old
  budget. Re-run the check after the edit *and* after any in-app settings change; for a guaranteed
  result, apply it with no pi session running.
- **Package-provided models are not in `models.json`.** `pi-deepinfra` builds its catalog from the
  live API, cached at `~/.pi/agent/cache/deepinfra-models.json`; 63 of 92 chat models there carry
  `context_length: 1048576`, where a 32,000 global reserve fires at **96.8%**. Add an override
  (`deepinfra/<id>`, reserve `~209,715` for 80%) before using one as a daily driver.
- **`~/.pi/agent/models-store.json` is `{}` here**, so it does not shadow `models.json` - but
  `models.json` is schema-checked by pi (`dist/core/model-config.js:149`), and a rejected file
  becomes an *empty* provider map with an error string, i.e. your model silently disappears.
  `pi-compact-check.mjs` loads it through that same `ModelConfig.load`, so a schema mistake prints
  instead of quietly vanishing.

## Where the ruling lives

Ruled by the operator 2026-11-06 as **`1a, 2a, 3b`** ("approved" on the three recommendations),
then **round 2: raise the local cap** (accepted the recommendation to `32768`). **`3b`**: this is
host pi config with no tracked code citing it, so it gets **no `D###` id** - this file *is* the
record, deliberately, because `DECISIONS.index.md` is tracked and would force an unrelated repo
commit. If a future item needs to cite it, mint the id then, in that item's commit.
