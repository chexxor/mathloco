# Runbook — the n8n cadence's preconditions are unobservable from a delegate seat

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/n8n-cadence-preconditions.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

**Symptom:** "is the cadence imported?", "did the 09:00 run happen?", "can n8n see `MOBILIZON_EMAIL`?",
"is the workflow inside n8n the workflow we reviewed?", `n8n.labradorius.com` answered **302 →
`labradorius.com/yunohost/sso`** for everything, `/api/v1/workflows` included (that was true until
2026-11-05; the doors that opened instead are in `n8n-runtime-loop.md`).

Nothing here is inferred. Every line is a command someone in this repo ran, most of them twice.

## 1. What the seat can and cannot see (re-measure before re-deriving)

```bash
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://n8n.labradorius.com/healthz
# 200            (measured again 2026-11-05; it was 302 → /yunohost/sso on 2026-11-04)
```

Measured 2026-11-04 (Linux, this worktree), every path — `/`, `/healthz`, `/api/v1/workflows`,
`/mcp-server/http` — answered **302 → `labradorius.com/yunohost/sso`**. `http://192.168.1.120:5678/healthz`
is still **not routable** from this seat. **That changed on 2026-11-05** when the operator added `visitors` to
the YunoHost app's permission groups (the upstream package's own default: `manifest.toml` sets
`init_main_permission` to `visitors` and declares `sso = false`). What a seat can do now is in
**`n8n-runtime-loop.md`**: list/read/publish/archive workflows, run one, and read the graph through the
instance's MCP server; **read the execution** is still blocked by the instance's execution-retention settings
(D199), and the REST public API still answers 401 for the key this rig holds (D198).

- the delegate **can** now read the live graph and verify it without an operator download;
- the delegate **cannot yet** read an execution back, and cannot set a credential;
- the SSO-era advice ("do not hunt for a token") is retired — but re-run §1 of `n8n-runtime-loop.md` before
  believing any claim about which door is open.

Mobilizon, by contrast, is reachable from **both** views — `mobilizon.labradorius.com` resolves to
`192.168.1.120` on the LAN and to the public address from off-net (D182; the operator's phone on cellular
loaded the site). Which view **n8n** has is exactly what the probe in §2 measures, and it is not answerable
from here.

## 2. The three instruments, and who operates each

| question | instrument | whose hands |
|---|---|---|
| can n8n's **process** see `MOBILIZON_EMAIL`/`MOBILIZON_PASSWORD`; can that host reach `/api/v1`; does the apex OAuth route answer from that network; what clock does it run | import `integrations/mobilizon-cadence/n8n/env-probe.json`, **Execute workflow**, read the `summary` field on `P4 Report what I found` | operator. It prints presence of the names, never values, has no schedule trigger and no credential, its `POST /apps` is incomplete on purpose so it cannot register a client, and its read-only-ness is enforced by `checkProbe()` in `build-probe.mjs` (D183, D185) |
| is the workflow **inside** n8n the workflow in this repo | Workflow menu → **Download**, then `node integrations/mobilizon-cadence/verify-import.mjs <file>` | operator downloads, either side runs the command (it never contacts n8n) |
| would that copy write | same command — it executes the export's own `01 Config` and prints `as exported, this copy writes nothing` / `WOULD WRITE` | same |
| do the rules still hold, does the artifact build, does the live plan still agree | `node integrations/mobilizon-cadence/check.mjs` | delegate |

`verify-import.mjs --selftest` shows the export checker **noticing** planted defects. Run it before asking the
operator to trust a "0 fatal, 0 drift" line — an instrument that never fails is not an instrument.

## 3. The credential question, in order

1. `MOBILIZON_EMAIL`/`MOBILIZON_PASSWORD` must be in the **service** environment of the n8n process
   (systemd drop-in, container env file). n8n reads its environment at process start, so **restart it**.
2. If the probe says `CODE: env access is blocked in Code nodes`, the host set
   `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`. That same setting governs expressions in HTTP nodes, so the cadence
   cannot work around it — it is a host fix (D177 keeps the password out of the workflow JSON on purpose).
3. There is **no** n8n credential attached to any node in the artifact. If `verify-import.mjs` reports a
   `credentials` block, someone attached one in the UI; that is a second, untracked auth path.
4. The auth menu, measured 2026-11-04 (D185) — do not re-probe it from scratch:
   - the OAuth routes are on the **apex**: `POST /apps`, `POST /oauth/token`, `POST /login/device/code`. The
     route is **not** under `/api/v1`; that path falls through to the GraphQL router, which is how the first
     probe concluded it did not exist.
   - implemented grants: `authorization_code`, device code, `refresh_token`. There is **no** `password` and no
     `client_credentials` grant, so n8n's OAuth2 credential type cannot drive it.
   - therefore OAuth = register a client (10/min/IP), one human authorisation, then a **rotating** refresh token
     on the n8n host. It removes the password, not the secret. Scopes are granular (`write:event:create`,
     `read:group:events`, …), which is what a service account would buy.
   - safe probe shapes that create nothing: `POST /apps` with `name` only → `400 invalid_request`; with
     `scope=write:everything` → `400 invalid_scope`. Never send a valid triple unless a client is wanted.
   - bearer tokens **are** honoured at `/api/v1` (`Bearer not-a-real-token` → `{"message":"invalid_token"}`, not
     the GraphQL `unauthenticated`), so if a service account is chosen the token can ride in an n8n Header Auth
     credential; only the unattended token *mint* is missing.
   - Mobilizon models automation identities (`Actors.Bot`, `type` default `"ics"`,
     `mix mobilizon.create_bot …`) but ships nothing that reads a bot's `source` — a bot is an author, not an
     importer. Relevant to the organizer-actor question, not a write path.
   - evidence and commands: `integrations/mobilizon-cadence/records/2026-11-04-oauth-surface-and-ics-import-probe.md`.

## 3b. The ICS-import idea is parked, not lost (D186)

"Publish an ICS feed and let Mobilizon import it" was investigated 2026-11-04 and rejected: Mobilizon 5.2.4 has
no import mutation and the 5.2.5-RC1 source has no import route, view or UI string; the third-party importers
authenticate with the same email+password and write with the same `createEvent`, plus update/cancel/delete.
Un-parking trigger, one command (it prints nothing today):

```bash
M=https://mobilizon.labradorius.com
curl -sS --json '{"query":"{ __schema { mutationType { fields { name } } } }"}' "$M/api/v1" \
  | grep -oiE '"name":"[a-z]*(import|ics|ical)[a-z]*"'
```

## 4. Do not retry these (they were tried 2026-11-04)

Third-party "check this URL from outside" fetchers are not a usable vantage point for this network:
`check-host.net/check-http` now requires a CSRF/JS form, `api.allorigins.win/raw` and
`api.codetabs.com/v1/proxy` return Cloudflare `522` for this target, and
`api.networkcalc.com/api/check-http-status` returns an empty body. The cheap decisive instruments are **a
phone on cellular** (off-net view) and, after a deploy, **the Worker itself**.

## 5. What closes A9, and who does it

Operator, in order: set the two env vars and restart n8n → run the probe → import
`n8n/cadence-workflow.json` → export it and run the verifier → wire alerting to `21`/`22` → run a dry run and
compare `08 Report` with `node integrations/mobilizon-cadence/simulate.mjs` → rule on the dedicated Mobilizon
account (A9 question 1) → `RUN.dryRun: false`, rebuild, re-import, re-verify.
Full step list with the expected output of each:
`integrations/mobilizon-cadence/docs/operator-guide.md`.

Nothing in this repo has ever written to the instance, and `check.mjs` has no write path.

## 6. What an alert would actually say (written 2026-11-04, from the artifact, not from a captured run)

Everything in this section is read out of the committed artifact — `grep -n "alertTitle\|alertDetail\|failedAt"
n8n/cadence-workflow.json` and `grep -n "action: \"alert\"" lib/core.mjs`. **No cadence run has ever happened on the
host**, so the strings are the workflow's own text, not observations. Two reporters, one shape each:

- **`21 Report error path`** — `alertTitle: 'cadence failed at ' + who`,
  `alertDetail: String(first.message || first).slice(0, 900)`,
  `summary: 'CADENCE PROBLEM: ' + who + ' failed - …'`, and `failedAt: failed.map(([label]) => label)`.
- **`22 Report a problem`** — `alertTitle: 'cadence paused: ' + plans.map((p) => p.seriesKey).join(...)`,
  `alertDetail: lines.join('\n')` — i.e. the plan's own reason codes, one line per series.

Failure modes, and what each one really produces (this is the list the operator asked for before choosing a channel):

| Failure | Signal today | Honest caveat |
| :-- | :-- | :-- |
| A series stopped being recognised (a rename, a deleted series) | `cadence paused: mpls-social` + `reason: no_rows_for_series` | fires in **dry run** too — the cheapest alert to test first |
| Every matching row is cancelled | `cadence paused: <series>` + `every_row_cancelled` | this is the D179-adjacent cancel case: nothing upstream has ever been cancelled, so it has never fired |
| A row's declared zone is not the series' zone | `timezone_mismatch` **only when `strictTimezone: true`**; otherwise a `TIMEZONE:` note in `08 Report` | with the flag false (the shipped state) there is **no alert at all** — see Q12 in the mobilizon answer |
| The anchor's computed duration is absurd | `nonsense_duration` + `anchor duration computed as N minutes` | |
| Sign-in fails (bad password, locked account, `MOBILIZON_*` missing after a restart) | error path → `cadence failed at 03 Sign in`, detail = Mobilizon's HTTP error text | the node label is what `who` prints; the detail text is the instance's, so it is unmeasured until a real run |
| A node throws anywhere else | `cadence failed at <that node label>` | every node's error output is wired to `21` by a build invariant (D179), so "silent" requires the reporter itself to die |
| The workflow wrote, or did not write | **no reporter**: `08 Report` is a terminal, read in n8n's execution log; dry run prints `dry run - would create` | if the operator wants a success notification, that is a **third** reporter node — a config decision that costs a node, not a flag |
| A duplicate was created | no alert by design: the calendar is the only state (D175), so the check is that a **second manual run prints `skip` / `nothing to do`**, and `maxFuturePerSeries: 2` caps how many future rows exist anyway | a duplicate detector would need state this repo deliberately refused to keep |
| The imported workflow is not the reviewed one | not an n8n alert at all: `node integrations/mobilizon-cadence/verify-import.mjs <export>` on this machine, fatal if writes are on and the gate's rule moved (D184) | the operator exports; the delegate compares — that split is the design |
| **The schedule never fired** | nothing inside n8n can say so. The real cross-check is **`check:ics`'s runway gate going red about three weeks later** (D188: no upcoming row ≥21 days out) | this is the strongest argument for the runway gate: a dead scheduler becomes a red `verify` on the repo side, without anyone reading a dashboard |

## 7. Making the host inspectable without opening it (options, each with the command that settles it)

Measured 2026-11-04 and recorded above: `n8n.labradorius.com` answered **302 → `/yunohost/sso`** for every path (no longer true — see `n8n-runtime-loop.md`), so a browser-gated
app is not reachable from a delegate seat. The options, cheapest first:

1. **Keep the current posture** — the delegate reviews the artifact (`check.mjs`, `verify-import.mjs`,
   `simulate.mjs` all run here with no credentials); the operator presses buttons in the UI. Zero new exposure. Its
   price is operator wall-clock per action, which is what this runbook exists to shorten.
2. **Move the export to the agent instead of the human.** If the operator saves the workflow export anywhere inside
   this rig, `node integrations/mobilizon-cadence/verify-import.mjs <file>` does the byte comparison offline (D184).
   No network change, no new secret, and it is the step that most often needs redoing after a rebuild.
3. **n8n's own REST API for the export** (`/api/v1/workflows`, `X-N8N-API-KEY`). **Unmeasured from this seat** — the
   check is `curl -sS -H "X-N8N-API-KEY: …" https://n8n.labradorius.com/api/v1/workflows`, and it will hit the same
   SSO 302 unless the YunoHost app config exempts the API path. Costs: a long-lived API key on this machine, and a
   decision about weakening SSO on one path. Not recommended before option 2 has been used once.
4. **YunoHost package questions** (where the env vars actually go, whether a path can be exempted from SSO, how an
   upgrade preserves the credentials and the data): read at upstream master `f95ffd8` (2026-10-31) by a shallow clone
   at `/tmp/n8n-ynh` — **outside** the workspace, vendor material, not repo guidance. What it says is in §9. The
   SSO-exemption question is still unanswered by that read (the package's `conf/nginx.conf` only `proxy_pass`es
   `__PATH__/`; SSO sits in front of it at the YunoHost level, not in the app's own nginx block).

## 8. What the artifact ends with, measured (2026-11-04 late, **corrected 2026-11-05** — `node -e` over `n8n/cadence-workflow.json`)

> **Corrected 2026-11-05 (D194, D195).** This section's two findings are both fixed, and one of them was worse than
> written here: the artifact is now **14 nodes** (`scheduleTrigger`×1, `code`×6, `httpRequest`×5, `if`×2) with a real
> delivery node `23 Notify on ntfy` and a loudness node `24 Fail loudly`, and every fallible stage now carries
> `onError: "continueErrorOutput"`. The `onError` property is **what makes an error output exist** — the vendor set
> (`n8n-error-handling-official/references/NODE_ERROR_OUTPUTS.md`) calls wire-without-property "the handler is
> unreachable", so `21` could never have run, and property-without-wire "one of the worst silent-failure modes in
> n8n" (error discarded, run recorded successful). Both halves are now build-enforced and export-checked. What
> follows is kept as the measurement that found it, with the 2026-11-04 dates intact.

Read out of the committed file, not out of memory:

- **11 nodes** *(as of 2026-11-04; 14 today)*: `scheduleTrigger v1` x1, `code v2` x5, `httpRequest v4` x4, `if v2` x1. **There is no delivery node.**
  No Discord node, no Email node, no webhook. `21 Report error path` and `22 Report a problem` are `code` nodes that
  *compose* a message (`alertTitle`, `alertDetail`, `summary`) and then the workflow stops. So "which channel do we
  alert on" is not a setting to pick — it is **one node that does not exist yet**, appended after `22`, plus a sender
  for the error case. *(Shipped 2026-11-05: `09 Tell a person?` + `23 Notify on ntfy`, D194.)*
- **Trigger**: `Trigger every morning`, `{"field":"days","triggerAt":"09:00","daysInterval":1}`, and the document's own
  `settings.timezone` is `America/Chicago`, so the run is 09:00 **club time**, not instance time. `verify-import.mjs`
  exists because some import paths drop that key (D184) — if it goes, 09:00 becomes the instance default and the
  cadence moves by hours without anyone editing it.
- **Every stage is wired to `21 Report error path` on an `error` output port** (`01 Config [error#0] -> 21 …`), but
  **no node in the artifact carries an `onError`/error-output property** (`node -e` over the nodes: none). The retrieved
  n8n page ("Handle errors gracefully") describes failure handling as a **workflow-level** thing, and no page
  retrieved *that day* documented an `error` connection port — so the seat called the in-workflow reporter's reach
  **unverified** and reached for the Error Trigger instead. That was the right instinct and the wrong conclusion: the
  port is real, the missing half was the node property. `verify-import.mjs` does fingerprint every edge including its
  port, and it now also refuses a document where one half of the pair is missing (planted in `test/import.test.mjs`).
  The workflow-level error workflow is still worth having — it is the only thing that sees a whole-run timeout, a
  crash between nodes, or a trigger that never activated — and it is **parked with a trigger in D195**, not lost.
- **The document overrides the instance's execution-saving defaults**: workflow `settings` say
  `saveDataErrorExecution: "all"` and `saveDataSuccessExecution: "all"`, while the packaged instance defaults
  (`conf/.env`, §9) prune successes. For this workflow a successful write *does* keep an execution record — which is
  the only place a success is written down today.

## 9. Delivery channels, with the facts under each (host package read 2026-11-04, upstream master `f95ffd8`)

- **The package pins n8n `2.45.7~ynh1`** (`manifest.toml` line 8) and declares `autoupdate.version_regex = "^n8n@(.*)$"`.
  The host will therefore upgrade under you on the YunoHost cadence, and the artifact was authored against a different
  lineage (`meta.instanceId: 1.113.3`). Re-run `verify-import.mjs` after **every** app upgrade, not only after a rebuild.
- **Mail is pre-wired at the instance level**: `conf/.env` sets `N8N_EMAIL_MODE=smtp`, `N8N_SMTP_HOST=<main domain>`,
  port 25, user `__APP__`, a generated `__MAIL_PWD__`, and `N8N_SMTP_SSL=false` / `N8N_SMTP_STARTTLS=false` (the
  package's own `#FIXME` sits above those two lines). The install and upgrade scripts also capture an "email address to
  use for notifications". **But** the retrieved Send Email node page says the node needs an *SMTP account credential*:
  "Select or create an SMTP account credential for the node to use." Whether the packaged env pre-populates one is not
  visible from this seat; the operator will know the moment they add the node.
- **Mail deliverability is measurably weak for that domain.** `dig` from this rig, 2026-11-04: `labradorius.com` has
  **no TXT record at the apex** (so no SPF line visible) and **no MX record**, while `_dmarc.labradorius.com` returns
  `v=DMARC1; p=none`. An alert claiming a sender at that domain therefore leaves unauthenticated, and `p=none` means a
  receiver will not reject it — it will *place* it, which usually means spam. This says nothing about any other mail
  domain the box may host; it says if the alert address is `@labradorius.com`, expect the alert to be judged.
- **The host is LAN-only.** `dig A mobilizon.labradorius.com` → **192.168.1.120**. Nothing outside the house can reach
  n8n, so no external heartbeat ("did the 09:00 run happen?") is possible without adding a tunnel. Any alert has to be
  *pushed* by n8n; nothing can *poll* it.
- **`ntfy` is a packaged YunoHost app** — `YunoHost-Apps/ntfy_ynh` exists upstream (`git ls-remote` heads include
  `ci-auto-update-2.23.0`), so self-hosted push alerts cost no subscription and no third-party relay. (What ntfy.sh
  itself caches, and for how long, was not retrievable from this seat — treat that as unknown until measured, and note
  the alert body carries the failed node's message, which may quote the account's e-mail address.)
- **n8n's Error Trigger semantics** (retrieved 2026-11-04 from `docs.n8n.io`, `n8n-nodes-base.errortrigger.md`):
  "When another linked workflow fails, this node gets details about the failed workflow and the errors"; the error
  workflow does not have to be active; and — the trap for A9 — **"You can't test error workflows when running workflows
  manually. The Error Trigger only runs when an automatic workflow errors."** So testing the alert means making a
  **scheduled** run fail, not pressing *Execute Workflow*. Payload it receives: `execution.id`, `execution.url`,
  `execution.error.{message,stack}`, `lastNodeExecuted`, `workflow.{id,name}`; if the failure is in the trigger itself
  the payload is a `trigger.error` block (`WorkflowActivationError`) with no execution id — which is precisely the "the
  schedule could not even start" case the in-workflow reporter cannot see.
- **Execution retention** (`conf/.env`): `EXECUTIONS_DATA_PRUNE=true`, `EXECUTIONS_DATA_MAX_AGE=168` (hours),
  `EXECUTIONS_DATA_PRUNE_MAX_COUNT=2000`, `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`, `…_ON_ERROR=all` — the instance keeps
  failures for a week and keeps successes not at all, before this workflow's own `settings` override it (§8).

## 10. Recommendation, in the order it should be done *(items 1-4 executed 2026-11-05; kept because the reasons are the part that transfers)*

1. **For the dry run: add nothing.** *(Superseded by D194: the dry run now reports itself, at priority 2 — drawer
   only, no sound — and only when it decided something. A plain skip still says nothing, on purpose. Read `08 Report`'s
   output in the UI and compare it with `simulate.mjs`; `simulate.mjs` now prints the alert it would have sent.)*
2. **Before the first real write, install an Error Trigger workflow.** *(Partly superseded: the delivery node ships in
   the cadence itself, so the pause and the throw reach the same channel with the difference in the title. The Error
   Trigger is still the only thing that sees a trigger/activation failure or a whole-run timeout — parked in D195 with
   the trigger "first real write", and note that our per-node error outputs mean it will **not** see those failures.)*
3. **Channel: `ntfy` self-hosted, then Discord, not e-mail.** *(Adopted, D194. One correction to the shape written
   here: the shipped node posts **JSON to the server root** (`specifyBody: "json"` with `topic` inside the body), not
   `POST /<topic>` with headers — same result, one body style across all five HTTP nodes.)*
4. **Success gets one line too.** *(Adopted: `cadence wrote 1 event(s)` at priority 4. And a dry run gets
   `cadence dry run: would write N` at priority 2.)*
5. **What still goes undetected, named.** A scheduler that never fires — because the workflow was deactivated, the app
   upgraded, or the instance was down at 09:00 — produces **no n8n alert at all**, and no external system can poll a
   LAN-only host (`ntfy.labradorius.com` is public, but it knows nothing about n8n). The detector for that case is
   Mathloco's own runway gate (`scripts/check-ics.mjs`, D188): the published calendar stops carrying a row ≥ 21 days
   out and `verify` goes red. Its latency is roughly three weeks, and that is the honest price of refusing to keep a
   local ledger of created events. **Still open, and an operator call, not a code change:** the silence rule in D194
   makes a quiet week indistinguishable from a dead scheduler; the candidate answer is one weekly priority-2 heartbeat
   message, which trades directly against that rule.

## 11. The alert channel is installed in code; the host half is the operator's (commands measured 2026-11-05)

What the seat proved without touching the host: `ntfy.labradorius.com` → **75.73.33.126** (public, unlike
`mobilizon.labradorius.com` → 192.168.1.120), `GET /` 200 behind nginx, and — with **no credentials at all** — an
anonymous publish to `mathloco-cadence` and an anonymous poll of the same topic both return **`403` / code `40301`**,
`GET /v1/version` returns `40101`. That is `auth-default-access: "deny-all"` in `ntfy_ynh`'s config doing its job, and
`probe-ntfy.mjs` re-asks it on every `check.mjs` run so the fact cannot rot.

The operator's four commands (the package's CLI wrapper sets `NTFY_CONFIG_FILE`, so call the wrapper, not bare `ntfy`;
`<install>` from `yunohost app info ntfy`):

```bash
sudo -u ntfy <install>/ntfy.sh user add --role=user cadence-bot
sudo -u ntfy <install>/ntfy.sh access cadence-bot mathloco-cadence read-write
sudo -u ntfy <install>/ntfy.sh token add --expires=365d --label="mathloco cadence" cadence-bot
# then: put the token that command prints into the n8n service environment (systemd drop-in or the app's
# env file, never the workflow) as NTFY_TOKEN
node integrations/mobilizon-cadence/probe-ntfy.mjs     # from this repo: posts a labelled probe, prints the message id
```

Two traps in that grant, both from the package/upstream docs read 2026-11-05:
- **`up*` is anonymous-write.** The `ntfy_ynh` package's `install` script grants write-only on topics matching `up*` to everyone,
  so a topic named `update-…` or `up-later` is a public bullhorn. The topic here is `mathloco-cadence` for that reason.
- **Tokens are account-scoped, not topic-scoped.** Least privilege is the *account*: a non-admin user whose only ACL
  entry is this topic. And `--expires` means alerts stop silently on that date — calendar it, or mint without expiry
  and record a rotation date.

Then prove the path end to end once, free: set `MOBILIZON_PASSWORD` wrong on the n8n host, run the workflow, expect
`03 Sign in` to fail → `21` names the stage → `23` delivers → **`24 Fail loudly` throws and the execution is red**
(2026-11-05: without 24, wiring the error outputs would have made the run look *successful*, because n8n counts an
error that exits a wired error output as handled). A run that cannot sign in cannot write, so there is no risk in
doing it. Note the retrieved Error Trigger caveat still applies to any *future* error workflow: it only fires on
automatic runs, so testing that one means making a scheduled run fail.
