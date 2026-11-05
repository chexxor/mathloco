# The REST door, per-workflow retention, and where the password actually lands — 2026-11-05

Three things were asked of the n8n instance on 2026-11-05 (operator rulings `1c, 2a, 3a, 4a`, taken the next
morning): make a dry run readable, get a working door for **the reviewed bytes**, decide whether `visitors` on the
app is acceptable, and put the remaining steps in an order. This log is the measurement behind those four, plus
what the instance's own API contract turned out to say. Machine-readable output:
[`evidence-2026-11-05.json`](./evidence-2026-11-05.json).

Nothing here wrote to Mobilizon, and nothing here wrote to n8n: every n8n call below is a read, and the one write
path built in this session (`n8n-api.mjs`) was exercised only against a fake instance in `test/api.test.mjs`.

## 1. The instance publishes its own API contract, unauthenticated

```bash
curl -sS https://n8n.labradorius.com/api/v1/docs/swagger-ui-init.js   # 200 application/javascript, 1,441,305 bytes
```

The OpenAPI document is **embedded** in that file (`"swaggerDoc": { … }`), not at a JSON path: `/api/v1/docs/json`,
`/docs/openapi.json`, `/docs/spec`, `/api/v1/openapi.yaml` and friends all answer **200 `text/html`** — the SPA
fallback, which is the same trap D197 recorded for `/api/v2/*`. Check the content-type, not the status.

What the contract says (extracted, not skimmed):

| fact | value |
|---|---|
| title / version | `n8n Public API` **1.1.1**, OpenAPI 3.0.0, 107 paths |
| `POST /workflows` required body | `name`, `nodes`, `connections`, **`settings`** |
| `PUT /workflows/{id}` required body | the same four |
| `readOnly` (never send) | `id`, `active`, `activeVersionId`, `createdAt`, `updatedAt`, `isArchived`, `versionId`, `triggerCount`, `nodeGroups`, `staticData`, `projectId`, `parentFolderId`, `meta`, `tags`, `shared`, `activeVersion`, `description` |
| the artifact's `tags` | a list of **names**; the API's `tags` is a list of **objects** and is `readOnly` — so it must be stripped, not sent |
| `settings` keys the API accepts | `saveExecutionProgress saveManualExecutions saveDataErrorExecution saveDataSuccessExecution executionTimeout errorWorkflow timezone executionOrder binaryMode callerPolicy callerIds timeSavedMode timeSavedPerExecution redactionPolicy availableInMCP customTelemetryTags credentialResolverId` |
| manual run endpoint | **there is none**. No `/workflows/{id}/run` in 107 paths; `/workflows/{id}/test-runs` is the evaluation-test facility, not a dry run |

Consequence, and it is the shape of the whole A9 chain: **REST carries the artifact, MCP runs it.** MCP's creation
path is SDK code (`create_workflow_from_code`), and re-authoring the artifact in the SDK would put a second copy
of the config in the repo — the D184 failure. Reading the live copy is available through both doors.

## 2. Route existence is measurable without a key

Auth runs **after** route matching on this instance, so a real route answers 401 and an unknown one answers 404 —
which is enough to confirm the contract above against the running build:

```bash
for p in workflows workflows/deadbeef1234 executions executions/1 credentials tags variables \
         workflows/deadbeef1234/activate workflows/deadbeef1234/deactivate owners \
         executions/1/run workflows/deadbeef1234/restore; do
  printf '%s -> %s\n' "$p" "$(curl -sS -o /dev/null -w '%{http_code}' "https://n8n.labradorius.com/api/v1/$p")"
done
```

`401` for everything in the spec; **`404`** for `/api/v1/owners` and `/api/v1/executions/1/run`. The `401` for
`workflows/{id}/run` is a path-prefix match, not a route — the spec is the authority, and it has no run endpoint.

The key in `.notes/n8n-public-api-token` still does not validate (measured through the new client, which is how
the message was checked rather than imagined):

```
$ N8N_API_KEY="$(cat .notes/n8n-public-api-token)" node integrations/mobilizon-cadence/n8n-api.mjs status
n8n-api: GET /api/v1/workflows?excludePinnedData=true -> 401: the key is not validating - stale, deleted, or
minted before an instance-secret rotation (D198). Re-mint it: Settings -> n8n API -> Create, then export N8N_API_KEY=...
```

That is the whole of A9's remaining blocker on this door: **one mint by the operator** (ruling 2a), nothing else.

## 3. Retention is a per-workflow setting, and the packaged default hides every dry run

Confirmed by A/B on a throwaway workflow the same day (D201, and D199's correction): the YunoHost package renders

```
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=false
```

so a successful run — manual or scheduled — is never persisted. The symptom is not an error: `execute_workflow`
returns an id and `get_workflow_execution` answers `Execution '2' not found`. A workflow's own `settings` override
the instance default, and that is what changed in this repo: `series.config.mjs` now exports `RETENTION`
(`saveDataErrorExecution: "all"`, `saveDataSuccessExecution: "all"`, **`saveManualExecutions: true`**), both
generators spread it, `build-workflow.mjs` and `checkProbe()` refuse to emit an artifact whose spread did not
apply, and `test/workflow.test.mjs` asserts the flags. Artifact fingerprints
after this change: cadence and probe both re-hashed (`node integrations/mobilizon-cadence/verify-import.mjs
--fingerprint`); any copy already inside n8n is therefore stale and must be re-imported.

## 4. What the contract then says about the password in run data (unmeasured, and now nameable)

The runbook's open question was *"whether n8n 2.45.7 masks the `$env` password inside stored run data"*. The
contract answers "there is a switch, and it is off by default":

- `settings.redactionPolicy` — enum `none | non-manual | manual-only | all`; **`none` (default): No redaction. All
  execution data is stored.**
- `GET /executions/{id}?redactExecutionData=false` — *"requests unredacted (revealed) data — requires the
  `execution:reveal` scope. When omitted, follows the workflow redaction policy."*

So with the retention we just turned on, the sign-in node's request body — which carries
`$env.MOBILIZON_PASSWORD` interpolated into JSON — is stored **unredacted unless a policy is set**. This is the
first time the question has a lever rather than a worry.

The experiment that settles it, in order, on the first dry run (nothing here needs a Mobilizon credential):

1. run the cadence once in dry run, `get_workflow_execution includeData:true`, look at node `03 Sign in`'s stored
   request body — is the password in the clear?
2. if it is, `update_workflow` `setWorkflowSettings` `{"redactionPolicy":"manual-only"}` on the same workflow, run
   again, and read the same node: does redaction mask the whole output (which would undo what §3 bought), or only
   the secret?
3. whichever the answer is, the artifact should state the policy in `RETENTION` rather than inherit `none`.

Also worth re-measuring at mint time: D197 said community n8n gives a key **no scopes**. This contract names an
`execution:reveal` scope, so the "no scopes" line is about what the community mint UI offers, not about what the
API knows. Confirm from the mint screen, not from memory, before repeating it.

## 5. What this session built on top of that

- **`n8n-api.mjs`** — the REST door: `status`, `verify`, `push`, `update`, `activate`, `deactivate`. It sends the
  artifact minus the server-owned fields, with an **`Idempotency-Key`** derived from the artifact's fingerprint
  (n8n documents retrying a POST with the same key; a timed-out import POST is exactly the retry that would
  otherwise leave two copies on the canvas), it refuses to create a second same-named workflow, and `activate`
  **verifies the live copy first and refuses on any fatal or drift**.
- **`test/api.test.mjs`** — 11 tests against a fake instance, including the two that matter as refusals rather
  than as prose: a drifted live copy produces **no POST at all**, and every server-owned field the artifact
  carries is on the strip list (so a future generator field cannot ride onto the instance uninvited).
- `check.mjs` discovers it: the test layer count moved from 3 files to 4, and `npm run check:cadence` stays a
  `verify` step.

Nothing is imported on the instance yet. The instance still holds the 3-node scratch workflow and zero
credentials (D197) — that is the operator's half of rulings 2a and 4a.

## 6. What the first live push found, the same day (2026-11-05)

The door opened and then refused, and the refusal was worth more than the opening:

```
$ node integrations/mobilizon-cadence/n8n-api.mjs push watcher
watcher -> POST https://n8n.labradorius.com/api/v1/workflows -> 400:
{"message":"request/body/settings Unrecognized key(s) in object: 'savePreExecutionData'"}
```

The same 400 for all four artifacts, because all four spread `RETENTION`, and `RETENTION` carried
`savePreExecutionData: false` (D201). The instance's own spec settles it —
`components/schemas/workflowPublicDto.generated/properties/settings` (n8n 2.45.7, Public API **1.1.1**, saved to
`.design/tmp-n8n/openapi.json` by `.notes/bin/n8n-openapi.mjs save`) accepts exactly seventeen keys:

`availableInMCP, binaryMode, callerIds, callerPolicy, credentialResolverId, customTelemetryTags, errorWorkflow,
executionOrder, executionTimeout, redactionPolicy, saveDataErrorExecution, saveDataSuccessExecution,
saveExecutionProgress, saveManualExecutions, timeSavedMode, timeSavedPerExecution, timezone`

Three things follow, and all three are now in the code rather than in this paragraph:

1. **`savePreExecutionData` is not a public setting**, so it cannot live in an artifact: the file, the wire and the
   canvas are meant to be one set of bytes (D203), and filtering it out on the way past the door would have made
   the reviewed file a lie. It is removed from `series.config.mjs`, and all four fingerprints moved again.
2. **The accepted set is a gate, not a rumour**: `n8n-api.mjs` exports `SETTINGS_ALLOWED` and `importBody` throws
   before the POST when a settings key is outside it — naming the key and the seventeen. `test/api.test.mjs`
   asserts every shipped artifact's settings keys are inside the set, which is the check that would have caught
   this before a live call.
3. **`settings.errorWorkflow` is a real public string field** (the spec's example is a workflow id), so D205's link
   is an API action and not only a canvas one. `n8n-api.mjs link <watched> <watcher>` writes it and reads it back.

Also measured while at the door, and cheap to lose otherwise: `GET /api/v1/ping` answers `404 not found` on this
build (D203 recorded the route; it is not there), and the instance held **three** workflows, none active, none of
them built by this repo — the scratch copy D197 describes is no longer a single one.

## 7. All four artifacts are on the instance, and the cadence is linked (@measured 2026-11-05)

Done through the door, in this order, each step re-verified after it:

| on the instance | id | state after this session |
|---|---|---|
| cadence | `Ys3CdS3CSzfXeMkn` | inactive; `settings.errorWorkflow` = the watcher; **0 fatal, 0 drift, 0 warn** |
| error watcher | `dTvHkp7CmEyVNxgf` | **published** (so it can be named); no schedule, so nothing fires on its own |
| heartbeat | `rCSdarhTstt3jILw` | imported, verified, **inactive** - activation is the operator's ruling |
| environment probe | `nSGb9ICHP6w9vFAO` | imported, verified, inactive |

Two more 400s the spec explains, both now gates:

**A copy the door returns cannot be sent back to it unchanged.** The first `link` PUT was refused:

```
PUT /api/v1/workflows/Ys3CdS3CSzfXeMkn -> 400 {"message":"request/body Unrecognized key(s) in object:
  'versionCounter', 'sourceWorkflowId', 'parentFolder'"}
```

`GET` gives those three; `PUT` will not accept them. That is the round trip every update depends on, so they join
`SERVER_OWNED` (`versionCounter` is optimistic concurrency - the server counts versions, a client does not set it;
`parentFolder` is a rendered object while the writable field is `parentFolderId`). `test/api.test.mjs` now builds a
fixture in the shape the door *returns* and asserts `importBody` produces a body the door accepts.

**A workflow imported through this API has no published version, and n8n refuses to point failures at one.** The
link's second refusal was `400 The selected error workflow has no published version.` The same spec documents
`POST /workflows/{id}/publish` ("in n8n v1, this action was termed activating") and leaves `POST .../activate` as
its alias - which is why `n8n-api.mjs activate watcher` is the publish step, and why `link` refuses an unpublished
watcher *before* the PUT instead of taking the 400. For a watcher this is not a second kind of risk: it has no
schedule, so publishing it runs nothing.

**The instance has no credentials at all** (`GET /credentials?limit=50` -> `{"data":[]}`), which is the fact D186
predicted: the n8n MCP/API tokens on this rig live outside n8n (files, env), so nothing here can export a Mobilizon
password by exporting a credential. The `n8n-mcp` MCP session token is not an n8n credential either; the API token
that works is the one in `.notes/n8n-public-api-token` (`X-API-Key`).

**Executions confirm D201 rather than contradicting it**: `GET /executions` lists exactly one run, id 4, belonging
to the retention scratch workflow - the only workflow that has ever completed on this instance. None of the four
reviewed artifacts has run yet, and `GET /executions?status=error` is empty. So the retention settings arrived on
the artifacts, and their effect on *our* runs is still unmeasured; the first manual run measures it.

Still not done, and it needs a hand on the canvas or the MCP server: the Public API (1.1.1) has **no run endpoint**
(`POST /executions` does not exist), so rehearsing the watcher is a UI press of **Execute Workflow** or the MCP
`execute_workflow`, not a call this client can make.

### 7.1 An active copy must still round-trip, and the client's own guard was in the way (same day)

Attempting the update round trip on the **published watcher** produced no request at all — `importBody` threw on
its own `active === true` check, because `GET /workflows/{id}` reports `active: true` for a published workflow. The
guard was written for artifacts on disk (a reviewed file must not smuggle a schedule onto the wire) and it was
indiscriminate, which meant the tool could maintain an inactive copy and not a live one — the exact situation a
maintainer is in after `activate`. `importBody(doc, { fromInstance: true })` now draws that line, `link` passes the
flag, and `test/api.test.mjs` runs the link against an **active** watcher so the regression cannot come back.

What the live round trip measured, on the ACTIVE watcher, sending the reviewed bytes unchanged:

```
before PUT : active true   activeVersionId fdb7595c-…   versionCounter 1
after PUT  : active true   activeVersionId fdb7595c-…   versionCounter 1
GET again  : active true, code identical, `verify watcher` = 0 fatal / 0 drift / 0 warn
```

So a no-change `update` is a **no-op on the instance's counters** and does not disturb a published, linked watcher.
What is **not measured** is a `update` carrying *different* bytes into an active workflow — whether the firing
version changes on the PUT or only at the next publish. `update` therefore prints a NOTE when the target is active
instead of guessing, and the safe order for a live workflow stays: update → re-verify → then decide about
re-publishing.

Two door facts from the same minute, both cheap for the next session: `GET /workflows/{id}/versions` answers
**401 `Unauthorized`** with the current key (the route exists; the token's scope does not cover versions), and the
**MCP endpoint refuses both tokens** this rig holds — `POST /mcp-server/http` with the public API key as a bearer,
and with `.notes/n8n-mcp-token`, both answer 401. Consequence: nothing in this directory can *run* a workflow, so
every rehearsal in the operator guide is a UI press until an MCP token that this build accepts is minted.
