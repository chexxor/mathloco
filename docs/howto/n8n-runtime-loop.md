# Runbook — driving the live n8n runtime from this seat

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/n8n-runtime-loop.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

**Symptom:** "can you create/run a workflow in n8n yourself", "iterate against the actual runtime",
"the n8n public API answers 401 even with the token", "the execution I just ran is 'not found'",
"n8n.labradorius.com no longer answers 302 → `/yunohost/sso`".

Everything below was run from this worktree (native Linux, `192.168.1.101` → `192.168.1.120`) on
**2026-11-05**, and re-measures the 2026-11-04 numbers in `n8n-cadence-preconditions.md` §1 and D196.
The YunoHost app's group membership changed on 2026-11-05, so the old "every path is 302" line is dead.

## 1. Which doors are open (measure before re-deriving)

```bash
curl -sS -o /dev/null -D - https://n8n.labradorius.com/ | head -4         # 200 text/html, x-sso-wat: You've just been SSOed
curl -sS https://n8n.labradorius.com/healthz                              # 200 (unauthenticated)
curl -sS -H "X-N8N-API-KEY: $(cat .notes/n8n-public-api-token)" -w ' %{http_code}\n' \
     https://n8n.labradorius.com/api/v1/workflows                         # 401 {"message":"Unauthorized"}
curl -sS -H "X-N8N-API-KEY: not-a-key" -w ' %{http_code}\n' \
     https://n8n.labradorius.com/api/v1/ping                              # 404 {"message":"not found"}
```

- **SSO is out of the way now** — the app answers for real (`200`, n8n's own JSON on `/api/*`). The YunoHost
  app permission includes `visitors`; that is also the upstream package's own default
  (`manifest.toml`: `install.init_main_permission` default `visitors`, and `sso = false` — n8n does its own
  user management). So no nginx/SSO exemption is needed.
- **The REST public API is mounted but unauthenticated-401** with the token in `.notes/n8n-public-api-token`
  (a JWT whose payload says `aud: public-api`), in either header form (`X-N8N-API-KEY`, `Authorization: Bearer`).
  The router is alive: an unknown path under `/api/v1` answers **404 `{"message":"not found"}`** while a real
  route answers **401**, so the API is not disabled — the key is simply not validating (stale row, deleted key,
  or an instance secret rotated after it was minted at 2026-11-04 08:42Z). Do **not** read this as "the API is
  off"; re-run the two curls above after minting a fresh key before concluding anything.
- **The instance's own MCP server answered once, and is now closed by ruling.** `POST /mcp-server/http` with
  `Authorization: Bearer $(cat .notes/n8n-mcp-token)` (`aud: mcp-server-api`) → `200`,
  `serverInfo {name:"n8n MCP server", version:"1.2.0"}`, **54 tools** (measured 2026-11-05 afternoon). No
  `Mcp-Session-Id` is required; `initialize`, `tools/list` and `tools/call` each stand alone, so a curl/node
  one-liner is enough — no MCP client needed.
  **Same evening it answered `401 {"message":"Unauthorized"}` with both tokens this rig holds (§7), and on
  2026-11-05 the operator ruled MCP not offered (D217)**: it is a second way to do what REST and one UI button
  already do, and getting it back means enabling a feature (`N8N_MCP_SERVER_API_FORMAT` + an MCP-format key + an
  `mcp-server-api` user with a role, per `deploy/host-n8n/configure-n8n/manage-settings-using-environment-variables.md`,
  fetched 2026-11-05) plus a second thing to keep secure. Plan REST + UI; do not schedule work that needs MCP.

## 2. The loop, and the step that failed until the workflow asked for its own run data

`node .notes/bin/n8n-mcp.mjs` (host-local) wraps it: no args = tool list;
`call <tool> '<json>'`; `export <workflowId> [out]` (live copy → an n8n-"Download"-shaped file);
`verify <workflowId>` (export, then `integrations/mobilizon-cadence/verify-import.mjs` on it).

Measured end to end on 2026-11-05 with a throwaway workflow (created, published, run, then unpublished and
archived — the instance is back to its one workflow):

| step | tool | result |
|---|---|---|
| validate before writing | `validate_workflow` | `{"valid":true,"nodeCount":2}` |
| create | `create_workflow_from_code` | `workflowId HO5PyBXP7TKbBQys` |
| activate | `publish_workflow` | `success:true`, `activeVersionId …` |
| run | `execute_workflow` (`executionMode:"manual"`, `triggerNodeName`, `inputs.webhookData`) | `{"executionId":"2","status":"started"}` |
| **read the execution** | `get_workflow_execution`, `search_workflow_executions` | **`Execution '2' not found`**; the search returns **0 rows for every workflow** — until the workflow's own settings ask for retention, then it works (see below) |
| read the graph | `get_workflow_details` (`detailLevel:"full"`) | works — this is how the live copy is now verified |
| undo | `unpublish_workflow`, `archive_workflow` | works; the probe's webhook path went `403` → `404` |

**Why the read fails:** the YunoHost package's `conf/.env` (`YunoHost-Apps/n8n_ynh@master`, which pins
`2.45.7~ynh1` — the same build the box runs, read off the SPA's `n8n:config:sentry` meta: `n8n@2.45.7`) ships

```
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=false
```

so a successful manual execution is never persisted, and there is nothing to read back.

**The fix does not need the box touched: a workflow's own settings override the instance defaults**
(D201). Same-day A/B on a throwaway workflow (`OZNvFxoKUabfzwvY`, archived afterwards): run it as-is →
`execute_workflow` returns `{"executionId":"3","status":"started"}` and `search_workflow_executions`
returns `count: 0`; then `update_workflow` with a `setWorkflowSettings` operation of
`{"saveManualExecutions":true,"saveDataSuccessExecution":"all","saveDataErrorExecution":"all"}`, run it
again → execution `4` is listed (`status:"success"`, `mode:"manual"`) and `get_workflow_execution` with
`includeData:true` returns the whole `runData`, node by node, including the Set node's output.

The cadence artifact already declares `saveDataErrorExecution:"all"` and `saveDataSuccessExecution:"all"`
in its `settings`; what it did not declare was **`saveManualExecutions:true`** — precisely the flag a manual
dry run needs. **Fixed 2026-11-05:** `series.config.mjs` now exports `RETENTION` (all four flags), both
generators spread it, both builders refuse an artifact whose spread did not apply, and `test/workflow.test.mjs`
asserts the flags — so every cadence dry run is readable while every *other* workflow on the instance keeps the
packaged retention. The consequence for anyone holding an old import: **both artifacts re-hashed, so a copy
already inside n8n is stale** (`verify-import.mjs --fingerprint` prints the current ones). What a hand-edit of the box's `.env`
(the `ynh_config_add --template=".env" --destination="$install_dir/.env"` line in the package's `install` script)
would do is turn it
on **instance-wide** — and a hand-edited `.env` is re-rendered from the package template at the next
`yunohost app upgrade`.

Cost to name either way: with success data stored, the cadence's own run records hold the sign-in request
body and the fetched Mobilizon page. The execution I read carried `"redaction":{"version":2,"production":false,
"manual":false}` — **whether n8n 2.45.7 masks that password inside stored run data is not measured**. The NOTE
lines `verify-import.mjs` prints are where that question is named for a ruling. **Now read, still unmeasured**
(D204): the instance's own OpenAPI documents `settings.redactionPolicy` — `none` is the default and means *"No
redaction. All execution data is stored."*, with `non-manual`, `manual-only`, `all` — and a read-side
`GET /executions/{id}?redactExecutionData=false` that "requires the `execution:reveal` scope". So the password is
stored unredacted unless a policy is set, and there is a per-workflow switch. The three-step experiment that
settles whether redaction masks the secret or the whole node output is §4 of
`integrations/mobilizon-cadence/records/2026-11-05-rest-door-retention-and-redaction.md`.

## 3. Two things the runtime showed that the repo did not know

- **The instance does not hold the reviewed artifact.** `get_workflow_details gTPNPCgjU7L0fwiZ` returns a
  3-node scratch workflow ("Add Next Math Bi-monthly Math Social Event": weekly Schedule Trigger → HTTP GET of
  the group page → a stub Code node). `node .notes/bin/n8n-mcp.mjs verify gTPNPCgjU7L0fwiZ` →
  **43 fatal, 6 drift**. A9's import step has therefore never happened, and `cadence-workflow.json` (with the
  D194 alerting) is still only a repo artifact.
- **`list_credentials` → `{"data":[],"count":0}`**: no n8n credentials exist for that account, so the
  `MOBILIZON_EMAIL`/`MOBILIZON_PASSWORD` and `NTFY_TOKEN` half of A9 is also still unbuilt.
- **Inbound webhooks on this instance answer `403` with `www-authenticate: Basic realm="Webhook"`** and body
  `Authorization data is wrong!` — even with the Webhook node's `authentication` explicitly `"none"`, and for
  requests with no credentials at all. An *unregistered* path answers n8n's own `404 {"code":404,…is not
  registered}`, which proves the challenge is raised by **n8n after route matching**, not by nginx. Upstream
  `conf/.env` says `N8N_BASIC_AUTH_ACTIVE=false`, so the box's rendered env is the place to look. Not urgent
  for the cadence (schedule-triggered, outbound HTTP only), but it decides whether any future inbound design
  can be tested from a seat at all.

## 4. What to try next time the token question comes up

1. `node .notes/bin/n8n-mcp.mjs call search_workflows '{"limit":5}'` — the fast "is the door still open" probe.
2. Re-mint the public API key in the n8n UI (Settings → n8n API), then
   `export N8N_API_KEY="$(cat .notes/n8n-public-api-token)"` and run
   `node integrations/mobilizon-cadence/n8n-api.mjs status` — the recommended box-side step, accepted by the
   operator as ruling **2a** on 2026-11-05. Until a key validates, that command answers the 401 with the re-mint
   instruction (measured through the tool on 2026-11-05, so the message is tested rather than imagined).
3. **The instance publishes its own contract.** `curl https://n8n.labradorius.com/api/v1/docs/swagger-ui-init.js`
   embeds the whole OpenAPI document as `options.swaggerDoc` (`n8n Public API` 1.1.1, 107 paths, measured
   2026-11-05). Do not guess an endpoint, and do not trust a 200 under `/api/v1/docs/*`: those paths answer 200
   **SPA HTML**. Route existence is also probeable without a key, because route matching precedes auth here —
   unknown paths 404, real routes 401 (16 paths probed).
4. **REST carries the artifact; a UI press runs it.** `POST /api/v1/workflows` requires exactly
   `{name, nodes, connections, settings}` — the artifact's own top level — so `n8n-api.mjs push` sends the
   reviewed bytes, with the `readOnly` fields stripped and an `Idempotency-Key` derived from the artifact's
   fingerprint. MCP's creation path is SDK code (`get_workflow_sdk_reference` → `validate_workflow` →
   `create_workflow_from_code`): re-authoring the artifact there would put a second copy of the config in the
   repo, which is **not** importing the reviewed file (D184). Conversely this instance's API has **no** manual-run
   endpoint — no `/workflows/{id}/run` among its 107 paths — so firing a dry run means **Execute Workflow in the
   editor**, and reading it afterwards is `GET /api/v1/executions` (read-only) or the Executions list (D197, D203,
   D217).
5. One checker on both paths: `n8n-api.mjs verify <id>` fetches the live copy and runs `verify-import.mjs`'s own
   `verifyDocument()`; `n8n-api.mjs activate <id>` refuses to send the activate POST at all unless that check
   comes back 0 fatal / 0 drift (proven in `test/api.test.mjs`).

## 5. The four open questions, and what I recommend (2026-11-05)

Answers came back as `1c, 2a, 3a, 4a` — accepted, and carried into work the next morning (§6, D202).

1. **Execution retention — `(c)`: change nothing on the box, add one line to the artifact.**
   Measured above: the workflow's own settings win, and the artifact already declares two of the three
   flags. Add `saveManualExecutions: true` to `settings` in `build-workflow.mjs`, regenerate, re-gate
   (`check:cadence` + `test/import.test.mjs`). `(a)` (instance-wide `all`) additionally keeps every other
   workflow's run data — including anything that ever handles a password — and lives in a file the next
   `app upgrade` re-renders.
2. **The public API key — `(a)`: re-mint it.** Settings → n8n API → *Create* (name it `mathloco-delegate`, set
   the shortest expiry the UI offers that still outlives A9), value into `.notes/n8n-public-api-token`
   (`0600`, never tracked). This is the highest-value of the four asks: it is the only way to get **this**
   artifact onto the instance rather than a re-telling of it. Community edition has no token scopes, so the
   key is instance-wide read/write — which is the reason it stays host-local and expiring.
3. **Exposure with `visitors` on — `(a)` accept, and revisit the day an inbound webhook exists.** Today the
   public surface is n8n's own sign-in page, `/healthz`, and two token-gated paths; no webhook routes are
   registered, and the cadence needs none. The packaged nginx config is one `location __PATH__/` block with
   `include proxy_params_no_auth;`, so an IP allowlist means editing a packager-regenerated file for a surface
   with no unauthenticated route on it. Cheap instead: MFA + a strong password on the n8n owner account, and an
   expiry on both tokens. `(b)` (LAN-only `/mcp-server/*`, `/api/*`, `/webhook*`) costs nothing on this LAN but
   breaks a seat that is away from home.
4. **Order — `(a)`, sequenced.** (i) re-mint the key, import `n8n/env-probe.json`, run it, read its outputs —
   no credentials, no writes to anyone: it answers whether Code nodes see `$env`, whether n8n reaches Mobilizon
   over HTTPS, and what clock the scheduler trusts (the `R5` guard is a clock comparison). (ii) the operator
   fills `MOBILIZON_EMAIL` / `MOBILIZON_PASSWORD`. (iii) import the cadence with `dryRun` on, run it, read run
   `07`, compare to `simulate.mjs`, export the copy → `check.mjs` → 0 fatal / 0 drift. (iv) the ntfy token and the
   red-run proof last. `A3`/`R6` gates a design edit, not this chain — it can land in any reply.

## 6. The rulings came back, and what each one changed (2026-11-05, operator: "I accept the recommendations")

`1c, 2a, 3a, 4a` — accepted as recommended, recorded as **D202**. What each is now, in practice:

1. **Retention `(c)` — done in the repo, nothing on the box.** `series.config.mjs` `RETENTION` carries all four
   flags; both artifacts were regenerated, so **any copy already inside n8n is stale**: re-import and re-verify
   (`node integrations/mobilizon-cadence/verify-import.mjs --fingerprint` prints the current hashes). The gate
   that keeps it true: both builders refuse an artifact whose `RETENTION` spread did not apply, and
   `test/workflow.test.mjs` asserts `saveManualExecutions === true`.
2. **The public API key `(a)` — open, and it is the operator's** (Settings → n8n API → *Create*, name
   `mathloco-delegate`, the shortest expiry the UI offers that outlives A9, value → `.notes/n8n-public-api-token`,
   `0600`, never tracked). Everything a seat can do without it is now done: `n8n-api.mjs` plus 11 offline tests
   against a fake instance (**D203**), and the live probe through it answers the 401 with the re-mint instruction.
3. **`visitors` on the app `(a)` — accepted, revisited the day an inbound webhook exists.** Cheap hardening
   instead: MFA + a strong password on the n8n owner account, and an expiry on both tokens.
4. **Order `(a)` — sequenced as above**, and now partly scripted: (i) and (iii) are
   `n8n-api.mjs push probe` / `push` / `verify <id>`; the *running* is a UI press (D217), and reading it back is
   `GET /api/v1/executions`; the ntfy half stays §11 of `n8n-cadence-preconditions.md`.

**What reading the runtime's own contract added, one line each.**

- The OpenAPI document is readable unauthenticated, and it is the authority for what to send (D203). The artifact's
  `tags` (a list of names) and `meta` are `readOnly` there, so they are stripped; `settings` accepts
  `saveManualExecutions`, `errorWorkflow`, `executionTimeout`, `redactionPolicy` and others.
- `settings.redactionPolicy` exists, defaults to `none` = *"No redaction. All execution data is stored."*, so the
  password-in-run-data question has a switch and no measurement yet — **D204**, experiment in §4 of
  `integrations/mobilizon-cadence/records/2026-11-05-rest-door-retention-and-redaction.md`.
- The spec names an `execution:reveal` scope. That makes D197's "community n8n gives a key no scopes" a statement
  about the **mint UI**, not about the API. Confirm from the mint screen next time rather than repeating it.
- There is no run endpoint, so "can a seat fire a dry run?" was answered by MCP and nothing else — **that half died
  the same day**: `POST /mcp-server/http` now answers `401 {"message":"Unauthorized"}` with the public API key as a
  bearer *and* with `.notes/n8n-mcp-token` (§7). Firing a run is a UI press, and the MCP route is closed by ruling
  rather than by an outage (D217).

## 7. The door opened, and the 401 that followed was my probe's fault (@measured 2026-11-05 22:31:49Z)

The key in `.notes/n8n-public-api-token` validates now (re-minted 14:36 local; mtime unchanged since). All four
reviewed artifacts are on the instance, the cadence and the heartbeat are linked to the published watcher, and the
three scratch workflows are archived with local copies (D212; `n8n-api.mjs retire`, and `isArchived: true` re-read
afterwards). Details and fingerprints: `integrations/mobilizon-cadence/records/2026-11-05-rest-door-retention-and-redaction.md` §7-9.

**The trap, because it cost an hour.** A session wrote "every route 401s for ~10 minutes after an activation" into a
record and the operator guide. It was wrong: the failing calls were hand-written, and the tool was returning 200 to the
same routes at the same minutes. One paired probe separates them:

```bash
K=$(cat .notes/n8n-public-api-token)
for h in "X-N8N-API-KEY: $K" "X-API-Key: $K" "Authorization: Bearer $K"; do
  printf '%-28s ' "${h%%:*}"; curl -sS -o /dev/null -w '%{http_code}\n' -H "$h" \
    https://n8n.labradorius.com/api/v1/tags?limit=1
done
# X-N8N-API-KEY 200   X-API-Key 401   Authorization 401   (same second, same token)
curl -sS -o /dev/null -w 'healthz %{http_code}\n' https://n8n.labradorius.com/healthz   # 200: the app is up
curl -sS -o /dev/null -w 'login   %{http_code}\n' -X POST -H 'content-type: application/json' -d '{}' \
  https://n8n.labradorius.com/rest/login                                                # 400: the REST layer answers
ls -l --time-style=long-iso .notes/n8n-public-api-token                                # unchanged file = no rotation
```

`X-N8N-API-KEY` is the name the instance's own `openapi.json` gives under `securitySchemes.ApiKeyAuth`; `Bearer` is the
JWT session scheme, and the API key is not accepted there. Consequences worth keeping:

- **Send the tool, not curl**, for anything on this door (`n8n-api.mjs status|verify|push|update|link|activate|retire`).
  There is no `executions` subcommand — for runs use `-H "X-N8N-API-KEY: …"` on `/api/v1/executions` or the UI.
- **A 401 gets an A/B on the request before it gets a story about the instance** (D215). Never rotate on a
  whole-instance 401 whose calls used an alias header: the rotation invalidates the file `NEXT.md` points the next
  session at.
- **Archived rows still list.** `GET /workflows` returns them here with or without `includeArchived=true` (7 rows both
  ways), so archive state is read from `isArchived`, never from the row count.
- **`/versions` is a separate permission**: `GET /workflows/{id}/versions` answers 401 with this key while `/workflows`
  answers 200. Route existence is not token access.
- **`update` is a whole-document `PUT`, so it carries the link for you** (D219): the reviewed bytes deliberately do not
  name `settings.errorWorkflow` (that id belongs to the instance), and a `PUT` that omits a settings key is how a
  watched workflow gets quietly unlinked. `carryLiveLink` reads the live copy first and copies its link into the body
  unless the body already names one. Whether this build would in fact drop the key is still unmeasured — `/versions`
  401s — which is why the guard exists rather than a note.
