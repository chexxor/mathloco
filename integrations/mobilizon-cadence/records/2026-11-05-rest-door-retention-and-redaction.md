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
that works is the one in `.notes/n8n-public-api-token`, sent as the header the instance's own spec names: `X-N8N-API-KEY`
(see §9.1 - an alias header does not work, and that cost an hour of believing the door was shut).

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

## 8. Redaction, read from the contract rather than assumed (@measured 2026-11-05, `n8n Public API` 1.1.1 + docs)

D204 parked "does a redaction policy hide the sign-in body?" as an experiment. Before running anything the operator
asked what the setting *is*, so it was read from two sources instead of remembered:

- **The instance's own contract** (`.design/tmp-n8n/openapi.json`, saved this session by
  `.notes/bin/n8n-openapi.mjs save`): `settings.redactionPolicy` is an enum of **`none`** (default),
  **`non-manual`**, **`manual-only`**, **`all`**. `GET /executions` takes `redactExecutionData`: `true` always
  redacts, `false` asks for unredacted data and **requires `execution:reveal`**, and *omitted* means "follow the
  workflow's policy". A redacted response can carry `redactionInfo` = `{isRedacted, reason, canReveal}`.
- **n8n's own docs**, markdown twin: `https://docs.n8n.io/deploy/host-n8n/configure-n8n/security/redact-execution-data.md`
  (saved to `.design/tmp-n8n/redact-execution-data.md`, 200, 17,935 bytes, 2026-11-05). Its own words: it redacts
  **all** input and output `item.json` for each node, replacing it with **an empty object** (line 88), removes
  `item.binary`, always redacts fields node authors mark `sensitiveOutputFields`, and redacts **error messages**,
  keeping only error type and HTTP status (line 91). Execution metadata stays: node names, status, timing, structure
  (line 96). Plans (lines 12-13): **n8n Cloud: Enterprise; self-hosted: Enterprise**. Per-workflow redaction from
  **2.16.0**, instance-level enforcement from **2.26.0** (line 15).

What that means for this project, before any experiment:

1. It is **all-or-nothing per node**, not a field picker. Turning it on for the cadence hides the sign-in body
   (which carries `MOBILIZON_PASSWORD`) *and* the plan, the GraphQL rows, the dry-run payload and the created-event
   id — the exact evidence `saveDataSuccessExecution: all` was turned on for in D201, and the evidence "verify the
   date we actually wrote" depends on.
2. The mode split is the only useful dial, and the UI calls it **Redact production execution data** / **Redact
   manual execution data** (line 43, 59-60): production = webhook/schedule runs while active, manual = a press of
   **Execute Workflow**. n8n's own recommendation is production-only, "protects live data while keeping manual test
   runs visible for debugging" (line 74). That is **not** the split this project wants: D201 turned on
   `saveDataSuccessExecution: all` precisely so *manual dry runs* could be read, and once real writes exist, the
   scheduled run's created-event id is the audit trail that matters most. So either mode costs the one piece of
   evidence the cadence was built to leave behind.
3. **The plan gate comes first, and so does the scope gate.** Enforcement, when a licence has it, sets a floor and
   the public API "rejects attempts to create or update a workflow with a redaction policy below the floor" (line
   80) — which would interact with `importBody`'s settings allowlist, not silently override it. The instance is a
   Community build (YunoHost package). Redaction is an Enterprise
   feature, so the honest expectation is that the API *accepts* the key (it is in the 17-key settings allowlist,
   D208) and nothing happens. And the contract says changing it needs a `workflow:enableRedaction` scope, while this
   key already 401s on `/versions` — so the experiment may fail on scope before it fails on licence.

Cheap partial experiment, when wanted: `update` the **probe** (not the cadence) with
`settings.redactionPolicy: "all"`, run it once in the UI, then `GET /executions/{id}?redactExecutionData=false`
and look for `redactionInfo`. The probe is disposable and carries no credential except the ones it reads from
`$env`. **Not run yet** — it needs a UI press, and the full answer also needs the reveal scope.

The threat model is worth restating, because redaction's stated purpose is least-privilege *between teams*: this
instance has one admin, who is the operator. The password in stored run data is a **backup/DB-at-rest** exposure,
not a coworker exposure, which is why retention plus host-side pruning (`docs/security.md`) was the shipped answer
and why the two options here are "accept it, or lose the audit trail", not "fix it".

## 9. Later the same day: the heartbeat goes live, the scratch goes to archive, and a 401 gets blamed on the wrong thing (@measured 2026-11-05)

Operator rulings in (numbered, answered as numbers — the house shape): activate the heartbeat, retire the three
`not ours` workflows, accept the A3/R6 rhythm recommendation, and explain redaction before running it (§8).

**Heartbeat is live.** `activate heartbeat` → `activated rCSdarhTstt3jILw`, then `link heartbeat watcher` → linked to
`dTvHkp7CmEyVNxgf`. Cadence and probe remain inactive; nothing writes to Mobilizon. Recorded as D213.

**A false fatal, in this repo's own gate** (D211). Minutes after that link, `verify heartbeat` answered
`1 fatal … settings.errorWorkflow is set in a generated artifact`. `verifyDocument` reuses `build-heartbeat.mjs`'s
`checkHeartbeat` on the live document, and one of that checker's rules is about **provenance of generated bytes**
(D207: no artifact may bake in an instance-local id), not about a property of a running document. The rule is now
`checkHeartbeat(wf, { live: true })`-scoped, with tests in both directions: the builder still refuses the byte, and
a linked live heartbeat reads **0 fatal / 0 drift / 0 warn**. Had it been left, the plausible response was to unlink
the heartbeat to satisfy a message — giving up the watcher's coverage for a wording bug.

**Scratch retired, not deleted** (D212). `n8n-api.mjs retire <id|name>` calls the door's `POST /workflows/{id}/archive`
(its OpenAPI calls it a soft delete; the UI restores it), after writing the canvas copy to
`.design/tmp-n8n/retired/<stamp>-<id>.json`. It refuses a name this repo reviews, and refuses an ACTIVE workflow.
Run against all three:

```
archived HO5PyBXP7TKbBQys "[probe] n8n API header diagnostic - DELETE ME" (2 nodes)
archived OZNvFxoKUabfzwvY "[probe] execution retention - DELETE ME" (2 nodes)
archived gTPNPCgjU7L0fwiZ  "Add Next Math Bi-monthly Math Social Event" (3 nodes)
```

### 9.1 The door did not blink - my probe used a header this build does not accept (same day, corrected)

An earlier draft of this record claimed the public API 401d on every route for ~10 minutes after the heartbeat
activation. **That claim is false, and it is corrected here rather than left standing.** The 401s came from ad-hoc
probes; the tool's own calls to the same routes at the same minutes were returning 200. Measured A/B, same second,
same key, `GET /api/v1/tags?limit=1` @ 2026-11-05 22:31:49Z:

| header | status |
| --- | --- |
| `X-N8N-API-KEY: <token>` | **200** `{"data":[],...}` |
| `X-API-Key: <token>` | **401** `{"message":"Unauthorized"}` |
| `Authorization: Bearer <token>` | **401** `{"message":"Unauthorized"}` |

The instance was healthy throughout: `GET /healthz` and `/healthz/readiness` → **200**, and `POST /rest/login` → 400
(the app answers, only the public-API auth failed). The token file never moved: mtime `2026-11-05 14:36`, sha256
prefix `1c1d9ba868a12edc` before and after. `n8n-api.mjs` sends `X-N8N-API-KEY`, which is what the instance's own
`openapi.json` names under `securitySchemes.ApiKeyAuth` (the earlier phase where *that* header 401d was a different,
real problem: the public API was not enabled yet).

So the lesson is not "retry before rotating" - it is **A/B the request, not the instance, before narrating an
outage**: one path, two headers, one second apart. A 401 that says "your key is wrong" can mean the key, the header
name, or the auth scheme, and only a paired probe separates them. `makeApi`'s message (D198) is fine: it describes
the request *it* made, and it was telling the truth about a call that used the right header.

Still one execution total (id 4, the archived retention scratch, `success`), still no credentials on the instance, and
no execution by any reviewed artifact — the heartbeat has not fired yet (next Monday).

**Archived state, confirmed after the door was re-read correctly** (`GET /workflows?limit=50`, 200):

```
HO5PyBXP7TKbBQys                    archived  [probe] n8n API header diagnostic - DELETE ME
OZNvFxoKUabfzwvY                    archived  [probe] execution retention - DELETE ME
gTPNPCgjU7L0fwiZ                    archived  Add Next Math Bi-monthly Math Social Event
Ys3CdS3CSzfXeMkn                             Mobilizon cadence (inactive)
nSGb9ICHP6w9vFAO                             Mobilizon cadence - environment probe (inactive)
dTvHkp7CmEyVNxgf ACTIVE                      Mobilizon cadence - error watcher
rCSdarhTstt3jILw ACTIVE                      Mobilizon cadence - weekly heartbeat
```

`isArchived: true` on all three scratch workflows, so `retire` did what D212 claims. Note the listing quirk: this
build returns archived rows **even without** `includeArchived=true` (both calls returned 7 rows), so "it is still in
the list" is not evidence that an archive failed - read `isArchived`, not the row count. The linked heartbeat reads
back `{active: true, settings.errorWorkflow: "dTvHkp7CmEyVNxgf", versionCounter: 2}` - the bump from 1 is the link
write, which is why `link` is idempotent.

## 10. The rulings that closed the session, and one hazard found while writing them down (2026-11-05)

Four operator rulings, in answer form:

| ruling | answer | what it changed |
|---|---|---|
| ship it | merge into `staging` | `integrations/cadence-ntfy-alert` merged into `staging` with `--no-ff`; the push and any production deploy stay the operator's (D66/D124) |
| redaction | skip, as recommended | D218: parked with its un-parking trigger named, because a deferral without a trigger is a loss, not a park |
| MCP | stop offering it | D217: the guide's "REST carries, MCP runs" line is deleted; running is a UI press, and `.notes/bin/n8n-mcp.mjs` survives only as a way to re-measure the door |
| next item | start it next session | D214's `rows` + `edges` lands next, and it must carry a measurement of the **pair**, which round 15 never took |

**The hazard found while documenting the above.** `settings.errorWorkflow` is instance-local and no artifact
declares it (D206). An `update` sends a whole document. So re-importing the cadence or the heartbeat - the normal
thing to do after a repo change - is one merge-vs-replace question away from **unlinking the watcher quietly**.
Nothing in the verify output would have shouted: `verify` after such an update would print the missing link as a
note against the reviewed bytes, which are *correct* to lack it. `carryLiveLink` now reads the live copy before the
`PUT` and carries the id across, printing what it carried (D219, pinned in `test/api.test.mjs`).

Whether this build would have dropped the key is still unmeasured - `GET /workflows/{id}/versions` answers `401`
with this key, so the published copy cannot be read back and compared. The guard does not need that answer, and the
next session should not spend a call getting it.

**Where the ntfy token may live, measured rather than remembered** (docs fetched 2026-11-05, saved under
`.design/tmp-n8n/`): an **env var on the n8n service** works and is what the artifact assumes - `$env` is available
in Code nodes unless `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`, whose documented default is `false`. An **n8n credential**
exists on Community and is writable through the same REST door (`POST /credentials` is in this instance's 107 paths;
the credential DTO returns `id/name/type/timestamps`, never the secret), but it moves the reference into
instance-local node state and makes `23`/`A2`'s "is a channel configured at all?" question unanswerable from the
reviewed code. **Custom variables** (`$vars`) are Business/Enterprise on self-hosted, so this Community build does
not have them, and their values are substituted into execution data anyway. Recommendation stands: keep
`NTFY_TOKEN` as a service environment variable holding the `tk_…` string `ntfy token add` prints.

## 11. The merge, and three claims this session had to take back (2026-11-05)

Ruling 1 was *merge into `staging`, push is mine*, so the merge was measured before it was made (D156) and the numbers
were written only afterwards: `git merge-tree --write-tree --name-only staging HEAD` -> exit **0**, tree **`8472398c`**,
**no conflicted files**; merged `--no-ff` as **`3fcdf50`**; `npm run verify` **on `staging`** -> **18 ok / 0 failed /
0 skipped, 19.6s** `= +15%` (load **5.9 -> 4.6/16cpu**) @measured 2026-11-05. Two follow-on docs merges (`221382a`,
`640a6b0`) exist because the merge row records the merge, and a row inside the branch being merged can only be written
after the thing it describes. `origin/staging` is untouched at `9e15d8d`: the push is the operator's (D66).

The same calm box also closed the D216 question that was still open at §7: the identical gate set measured
**19.2s (+12%)** and **19.6s (+15%)** at load 5.5-6.4 against **38.4s (+125%)** at load 8-9.6 @measured 2026-11-05.
Contention, not regression; no baseline was rolled.

Three claims were taken back during this stretch, each in the commit that contradicts it, which is the only reason they
are worth writing down:

1. **`9076363` does not exist.** A `NEXT.md` line named it as a commit on this branch; `git log --oneline -1 9076363`
   answers `unknown revision`. The content it pointed at is `a7dbd7e`. A sha written before the commit is made is the
   D215 failure one file over, and `DECISIONS.index.md`'s `check:decisions` has no power over it — that gate catches
   dangling **D-ids**, not dangling object names.
2. **A `sed -i` that matched nothing was reported as a change.** Two prose substitutions were scripted and each followed
   by an unconditional `echo "… updated"`; `sed` exits 0 on a non-match, so one landed, one missed by four spaces of
   indentation, and one targeted a block that runbook does not contain. The consequence was a guide line printing
   `update <id> <key>` — a signature the tool never had (`update <id|name> [cadence|probe|watcher|heartbeat]`, read off
   its own usage block). Fixing the prose meant copying the command out of the code that parses it.
3. **A tree hash and a merge hash were drafted before the merge ran**, and were only caught because the neighbouring
   sentence demanded a number that had not been produced. Measured values differ (`8472398c`, `3fcdf50`).

The general shape, for the next time it would be cheaper: a claim's evidence is the command output, and a success
message printed by the same command as the edit is not evidence. Assert the result — `grep -c` and read the number.
