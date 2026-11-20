# Runbook: the deploy pipeline (Cloudflare repo hook, not GitHub Actions)

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/deploy-pipeline-workers-builds.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

**Symptom:** "how does this ship now", "why did `wrangler secret put` do nothing", "a push changed the
site / did not change the site", "where do the gates actually gate", "the domain detached",
"how do I roll back", `code: 100117`.

**Supersedes** the Pages half of `deploy-and-secrets.md` (that file still holds the D1/secrets detail and
the Pages-era diagnosis, which is the evidence). Decisions: **D37** (deploy target is Workers),
**D40** (`check:deploy`), **D42** (who may deploy), **D47** (repo hook), **D48** (no cron here).
Traps: `PITFALLS.md` → *trigger loss*, *`versions upload` has no `--config`*, *OAuth cannot manage Builds
triggers*, *Pages auto-deploy still on*.

## What is live (measured 2026-10-30T17:11Z and again at 18:2xZ)

| | |
| :-- | :-- |
| Serves the apex | Worker **`minneapolis-math-book-club`** via route `minneapolismathbookclub.com/*` (from the `routes` array in `wrangler.toml`) |
| Also live | `minneapolis-math-book-club.chexxor.workers.dev` (same code, `workers_dev = true`) |
| Branch previews | `wrangler preview` → `<branch>-minneapolis-math-book-club.chexxor.workers.dev` + a unique `<hash>-…` URL. Verified for `perf/worker-cpu-and-shared-cache` |
| Gates | `npm run verify` = `check` · `check:classes` · `db:check` · `check:sanitize` · `check:cache` · `audit:gate` · `build` · **`check:deploy`** (19 checks). `npm run deploy` and `npm run preview:deploy` both run it first, so a red gate cannot upload |
| Secrets | Worker: `DISCORD_TOKEN`, `CLAUDE_API_KEY`. Previews base config: same two. `DISCORD_GUILD_ID` is **`[vars]` in `wrangler.toml`**, never a secret |
| Bindings | `DB` (D1 prod) · `SUMMARY_CACHE` (KV `ee21a661…537d`) · `ASSETS` (`dist/client`) · previews get preview D1 + KV `8173e43e…8318` |
| Pages | **No Pages project exists any more** (measured 2026-11-08: `npx wrangler pages project list --json` → `[]`; `dig mathloco.pages.dev @1.1.1.1` → no answer). The row that used to sit here — "project `mathloco` still exists, still claims the apex hostname, auto-deploy still ON, do not delete yet (see rollback)" — was true on 2026-10-30 and is void: the project is gone, so **there is no Pages rollback and no Pages build that can touch the hostname** |

## ⚠️ The one rule that keeps the site up

**`wrangler deploy` REPLACES a Worker's triggers.** A config with no `routes` array detaches the apex —
silent, instant, full outage. So:

1. never deploy from a branch lacking the `routes` block (as of 2026-10-30 `main` has it, via
   `infra/apex-route-and-deploy-gate` — merge before deploying from `main`);
2. `npm run check:deploy` is inside `verify` and asserts the route is in the **artifact**
   (`dist/server/wrangler.json`), which is what wrangler uploads.
3. Repair a detached apex: `npx wrangler deploy --route 'minneapolismathbookclub.com/*'` (measured, ~5 s).
4. Do **not** use `--domain` on this zone: `code: 100117` — *"Hostname … already has externally managed
   DNS records (A, CNAME, etc). Delete them first"*. Routes sit in front of existing records; custom
   domains have Cloudflare create the record. Details in `pages-to-workers-migration.md` → STATUS 2.

## Deploy today (delegate may prepare; production deploy is the operator's unless delegated — D42)

```bash
nvm use                      # .nvmrc -> 22.23.4; nvm default alias is still 24
npm ci --no-audit --no-fund
npm run deploy               # = npm run verify && wrangler deploy   (PROMOTES to the apex)
# verification after any deploy
curl -sk -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' https://minneapolismathbookclub.com/api/discord-summary
curl -sk https://minneapolismathbookclub.com/api/discord-summary | grep -c 'Unable to generate'   # must be 0
curl -sk -o /dev/null -w '%{http_code}\n' https://minneapolismathbookclub.com/definitely-not-a-page  # must be 404
npx wrangler tail minneapolis-math-book-club --format json   # top-level cpuTime/wallTime; free plan allows 10 ms/request
```
Preview from a branch: `npm run preview:deploy`. To upload a version **without** promoting it:
`(cd dist/server && npx wrangler versions upload)` — `--config` is not accepted by that subcommand, and
`--json` reveals it ran an upload anyway (`"source": {"source": "health_check"}`) and created a version
(PITFALLS).

### Measuring per-request CPU without shipping it (the probe Worker)

A Preview **cannot** be tailed: `wrangler tail <preview-name>` → *"This Worker does not exist" [code:
10007]*, and a Preview's requests do not appear in the production Worker's tail either (verified: connected
the production tail, requested the branch Preview's URL, got zero lines). So the CPU number for a branch is
taken on a throwaway Worker:

```bash
npm run probe:cpu                                       # writes dist/server/wrangler.probe.json + deploys mmbc-cpu-probe
printf %s "$DISCORD_TOKEN"  | npx wrangler secret put DISCORD_TOKEN  --name mmbc-cpu-probe
printf %s "$CLAUDE_API_KEY" | npx wrangler secret put CLAUDE_API_KEY --name mmbc-cpu-probe
setsid nohup timeout 60 npx wrangler tail mmbc-cpu-probe --format json > /tmp/t.log 2>&1 &
npx wrangler kv key delete --remote --namespace-id=8173e43e9bfb496d9cbe21d8e4e38318 "discord-summary:v1:1170385683379126343"
curl -sk -o /dev/null -w '%{http_code} %{time_total}s\n' https://mmbc-cpu-probe.chexxor.workers.dev/api/discord-summary
grep -o '"cpuTime": *[0-9]*\|"wallTime": *[0-9]*\|"outcome": *"[a-z]*"' /tmp/t.log
npx wrangler delete mmbc-cpu-probe --force             # name is POSITIONAL; -y/--yes is not a flag here
```
The probe is safe by construction: `routes` stripped (the apex is never attached), KV/D1 repointed at the
**preview** namespaces (it cannot write what visitors read), no `previews` block, and its own secrets.
Measured with this repo's artifact on 2026-10-30: cold isolate + KV miss **cpu 8 ms / wall 1983 ms** (the
SDK build was **13 ms** on production); ten KV-warm requests **cpu 0–1 ms / wall ~1 ms**, one at **5 ms**
(a fresh isolate paying module evaluation). `GET /`, `/chat/`, `/favicon.svg` produced **no log entries at
all** — static assets never invoke the Worker. Delete the probe afterwards; it costs a free-plan Worker
slot and a public URL while it exists.

### A green build is not a deployable artifact (measured, reproduced, gated)

`astro build` exited 0, printed `Complete!`, and passed every other check, while `dist/server/entry.mjs` still
contained `deserializeManifest("@@ASTRO_MANIFEST_REPLACE@@")`. `wrangler deploy` refused it:

```text
Uncaught TypeError: Invalid URL string.
  at .../astro/dist/core/app/manifest.js:35 in deserializeManifest   [code: 10021]
```

Astro substitutes that token in a post-build hook (`manifestBuildPostHook` in
`node_modules/astro/dist/core/build/plugins/plugin-manifest.js`), and `new URL(undefined)` is the throw.
`check:deploy` now asserts the token is absent and a `"rootDir":"file://` payload is present;
`npm run falsify:manifest` recreates the state to prove it, and `npm run build` restores.

**Mechanism confirmed 2026-10-30 16:0x**, by accident, in the clean-clone validation below: a detached
`npm run verify` in `/tmp/buildsim` was reaped mid-build (its log stops right after
`[vite] ✓ built in 23.35s`, no exit line, no surviving process), and the artifact it left is the same shape:
`entry.mjs` **251,077 B with one token occurrence** (good entries here: 257,662 / 257,493 B), plus an
unfinished module graph — **29 chunks / 1,384,823 B**, which the byte-budget check also failed. So the
trigger is *an interrupted build*, not an Astro bug: the chunk pass has written files and the manifest hook
has not run. A killed build can instead leave `entry.mjs` absent while `chunks/` and `wrangler.json` exist.
Either way: after any build command that got cut short, `rm -rf dist && npm run build` before trusting `dist/`,
and trust `check:deploy` rather than the exit code.

## The repo hook to configure (D47) — not yet connected

Workers Builds reads **dashboard settings**, not `wrangler.toml` `build.*`. Path:
**Workers & Pages → `minneapolis-math-book-club` → Settings → Build**. Fields, using Cloudflare's own names:

| Field (dashboard name) | Value | Why |
| :-- | :-- | :-- |
| **Git account** / **Git repository** | `chexxor` / `mathloco` | the repo is public; the Cloudflare GitHub App does the cloning |
| **Git branch** | `main` | docs: "Select the branch you would like Cloudflare to listen to for new commits. This will be defaulted to `main`." Changing it later: Settings → Build → **Branch control** |
| **Build command** | `npm run verify` | every gate runs before any upload; a non-zero exit deploys nothing |
| **Deploy command** | leave default `npx wrangler deploy` | the hook uses the Wrangler pinned in `package.json` (15.0.2), and the repo root's `.wrangler/deploy/config.json` points it at `dist/server/wrangler.json`. Use `npx wrangler versions upload` instead only if you want every hook build to create a version and keep promotion manual |
| **Preview command** | leave default `npx wrangler preview` | runs instead of the deploy command for non-production branches; reads this file's `[previews]` block (preview D1 + preview KV + preview vars) |
| **Enable Preview Builds** (Branch control) | on, if you want branch Previews | each non-`main` push then gets `<branch>-minneapolis-math-book-club.chexxor.workers.dev` |
| **Root directory** | blank | not a monorepo |
| Build variables / build secrets | none | `DISCORD_GUILD_ID` is committed config; `check:discord`/`check:ai` are outside `verify`; runtime secrets already live on the Worker and on the Previews base config |
| Node | nothing to set | image preinstalls **22.23.4** + 24.22.1 and honours `.nvmrc`; npm in the image is 10.9.2 vs 10.9.9 here — set `packageManager` in `package.json` if you ever need them identical |

Free plan: 3,000 build-minutes/month, 1 concurrent build, 20-minute timeout. The image **installs
dependencies itself** (`SKIP_DEPENDENCY_INSTALL=1` to opt out), so the build command is `npm run verify` and
not `npm ci && npm run verify`.

**Validated in a clean clone** (the closest local stand-in for the build container): `git clone` of this
branch to `/tmp/buildsim` — no `.dev.vars`, no `.drizzle.env`, no `.wrangler/`, no `dist/` — then `npm ci`
(exit 0, Node 22.23.4 selected from `.nvmrc`) and `npm run verify`: exit **0** in **50.9 s cold** (32.3 s
warm), 21 deploy checks green, 1.08 GB peak RSS. It works credential-free because `check:cache` substitutes
fake credentials when `.dev.vars` is missing and `db:check` opens no database. Expect the container to add
install time; budget roughly 2–4 minutes per build, which is ~1/500th of the monthly allowance.

**Blocker found:** connecting the repo is not possible with the current credential.
`GET /accounts/1cc19cf380e05566a3bfbfb2e7dcbb94/builds/workers/minneapolis-math-book-club/triggers` →
`{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}` even with a token that had
just deployed the Worker. Do it in the dashboard (Cloudflare GitHub App, which also gives the token that
`wrangler`'s OAuth flow lacks), or mint an API token scoped for Workers Builds (vendored
`cloudflare-api-token` skill; resolve exact names from `GET /user/tokens/permission_groups`; keep the token
in a gitignored file, never in chat).

## ✅ Resolved 2026-10-30: the hook is connected, and what now owns the apex

The operator connected the repo in the dashboard and pushed `main`. Evidence it worked: `npx wrangler
deployments status` → version `749f9005-ac06-4023-924a-faebb7d43899`, created `2026-10-30T21:46:56Z`.
Behaviour after that deploy, measured at 21:5xZ: apex `/api/discord-summary` → 200 `application/json` 681 B
in **0.24 s** (KV-warm), `/chat/` → 200 in 0.088 s, `/definitely-not-a-page` → 404, `www` → 301 to the apex,
and the **production** KV namespace now holds `discord-summary:v1:1170385683379126343` — that key did not
exist before the merge, so it also proves the merged (plain-`fetch`, KV-bound) build is the live one.

That `www` → 301 was **not** our Worker — it was Cloudflare answering for a hostname pointed at Pages. See
*Teardown update, same day* at the end of this file.

Pages: auto-deploy switched off in *Production branch control*, and the hostname detached — `GET
/accounts/<id>/pages/projects/mathloco/domains` now returns `"result": []`.

### The apex is now claimed twice, and that is intentional during DNS cleanup

`npx wrangler deploy --domain minneapolismathbookclub.com` succeeded once the Pages hostname was gone, and
the log attached **both** triggers:

```text
minneapolismathbookclub.com/* (zone name: minneapolismathbookclub.com)
minneapolismathbookclub.com (custom domain)
```

The trap: `wrangler deploy` **replaces** the trigger set with whatever the config declares. Until this file
carried the Custom Domain entry, the *next* build (including a hook build) would have detached it silently.
So `routes` now declares both, and `check:deploy` asserts the Custom Domain entry, the route entry, and that
exactly two triggers exist. Verified: the adapter carries `custom_domain: true` into
`dist/server/wrangler.json`, `--dry-run` accepts the shape, and injecting a malformed
`custom_domain: "yes"` makes `npx wrangler deploy --dry-run` exit 1 with `Expected "routes" to be an array
of … { pattern, custom_domain, zone_id | zone_name, … }` — so a bad trigger definition fails before upload.

### Retiring the leftover Pages DNS record (dashboard work; not possible from this rig)

A Pages-era record on the apex still targets `mathloco.pages.dev`. For the Custom Domain it is irrelevant
(Cloudflare creates and owns its own record, pointing directly at the Worker — do **not** hand-edit that
one); for the **route** it is the record that makes resolution work, so leaving it alive keeps a path to a
stale, assets-only Pages deployment. Order:

1. Merge + deploy the config that declares both triggers (so nothing can be detached by accident).
2. Delete the `mathloco.pages.dev` record in **Zone → DNS → Records**, then immediately probe
   `https://minneapolismathbookclub.com/` and `/api/discord-summary`. Expected: still the Worker.
3. If resolution breaks, recover in one move: add a **proxied** `AAAA` record for `@` → `100::` (reserved
   IPv6 discard prefix, the documented dummy in both the routes and custom-domains docs). The route then
   serves the Worker again, and we revisit the end state.
4. Delete Pages only afterwards. Last good Pages deployment for rollback remains `470df4f4…`.
5. Then retire the route entry from `wrangler.toml` (a Custom Domain covers every path) and change
   `check:deploy`'s expected trigger count 2 → 1 in the same commit.

Why this is dashboard-only from here: `GET /zones/<id>/dns_records` and `GET /zones/<id>/custom_hostnames`
both answer `{"code":10000,"message":"Authentication error"}` with the `wrangler login` OAuth token (no
`dns_records` scope). Also from the docs: deleting a Custom Domain does **not** delete the Advanced
Certificate it issued — clean that up under SSL/TLS → Edge Certificates or it just confuses later audits.

## What a build gate cannot catch (why a watchdog is a separate decision)

A hook proves the artifact **builds**. It cannot prove the runtime works: a retired model id, a revoked
Discord token, a detached apex, a missing secret. Those need a scheduled probe. Options, cheapest first:
(a) a scheduled GitHub Actions job that curls the live endpoints — no secrets, no deploy rights, and
**SHA-pin the actions** if it ever gets repo secrets; (b) a separate scheduled Worker with a `scheduled`
handler; (c) **not** a Cloudflare Cron Trigger on this Worker — the adapter's entrypoint exports no
`scheduled` handler (D48). KV + the 7-day stale grace already mean an upstream failure degrades slowly
rather than immediately (D49).

## Rollback

- **Application rollback:** redeploy the previous commit (`git revert`/`git checkout <sha>` then
  `npm run deploy`). Workers has no "promote previous version" command in wrangler 4.155 other than
  `wrangler versions` / rollback configuration; the honest cheap path is redeploy-from-git, and it is why
  the 38-commit history stays unsquashed.
- **Trigger rollback only:** `npx wrangler deploy --route 'minneapolismathbookclub.com/*'`.
- **Pages rollback no longer exists** (measured 2026-11-08): `npx wrangler pages project list --json` → `[]` and `mathloco.pages.dev` does not resolve. The trap this bullet used to describe — the newest Pages production deployment `bd05bf61…` 404ing at its own URL while `470df4f4…` served 200, and Pages production auto-deploy needing the dashboard uncheck — is historical: the project is deleted, which is also what D58 asked for. **The only rollback is a Worker version**: `npx wrangler deployments list` then `npx wrangler rollback [version-id]` (both in the pinned 4.155.0). The current production version is `0633ca4b-f44a-45f1-8b8a-a810fd0cdb1b`, created 2026-10-31T00:30:14.313Z.
- D58's *other* half is not recorded as done: **`CLAUDE_API_KEY` rotation**. The Pages copy of it is gone with the project, but the key itself should still be rotated unless the operator has done it.

## Is what is deployed what is built? `npm run probe:live` (added 2026-11-08)

Every gate in the deploy set reads `dist/`. **Nothing in the gate set reads a live URL**, so a branch can be
green for a week while the site a person reaches is an older artifact. `npm run probe:live`
(`scripts/live-probe.mjs`) is the missing instrument: GET-only, no secrets, no deploy rights, exit 0 unless
`--strict` — deliberately **not** in `verify`, because production lagging `staging` is the operator's deploy
decision (D42) and a gate that goes red every time they choose to wait is a gate people learn to ignore.

Measured on 2026-11-08, which is why the instrument exists:

| Fact | Command | Result |
| :-- | :-- | :-- |
| `main` has not moved since the cutover | `git log -1 --date=iso main` | `873b894`, 2026-10-30 17:24 -0500 |
| Everything since lives only on `staging` | `git log --oneline main..staging \| wc -l` / `staging..main` | **178 ahead**, 0 behind — `main` is an ancestor of `staging`, so `staging → main` is a **fast forward** |
| Merge cleanliness, no worktree touched | `git merge-tree --write-tree --name-only main staging` | a tree hash, **no conflicted paths** |
| The newest production Worker version is seven days old | `npx wrangler deployments list` (oldest-first; read the tail) | `2026-10-31T00:30:14.313Z`, version `0633ca4b-f44a-45f1-8b8a-a810fd0cdb1b` |
| Both apexes serve the pre-design-system artifact | `curl -s https://matheapolis.com/` and the same host's CSS | 200, 12,761 b, `<title>Math Enthusiasts Meetup</title>`, `Layout.b_fGKICv.css`, `href="/members"`, `text-blue-600` ×11, no `Matheapolis`, no descriptor, no `sm:text-display-3` |
| The schedule page and the feed do not exist in production | `curl -o /dev/null -w "%{http_code}" …/schedule`, `…/events.ics`, both apexes | **404 ×4**, each a 3,729 b page titled `Page not found - Minneapolis Math Book Club` |
| The edge cache is **not** the explanation | `curl …/?cb=20261108` (a cache key that cannot exist yet) | still `cf-cache-status: HIT`, still the old markup — the origin serves the old artifact |
| `www` is answered by nobody | `curl https://www.matheapolis.com/events.ics` | 404, 19,986 b, `x-preview-user-error: true` |
| The feed is real on the Preview and absent in production | `npm run probe:live`, the "the feed, as a visitor gets it" block | Preview `200`, **6,049 b**, `text/calendar`, **4 VEVENTs**; both production apexes `404` returning a **`text/html` 3,729 b "Page not found"** — the probe labels that `NOT a VCALENDAR`, which is the check a calendar subscriber cares about |

**The probe found a defect in itself on its second run, and it is the instructive kind.** The first run printed
`/events.ics … 0 b` with no title and no tells, which reads as "the feed is empty". It was not: the probe read the
response body only when `content-type` was `text/html` or `text/plain`, so a genuine 6,049-byte `text/calendar`
document (curl agrees, byte for byte) was counted as nothing. **Habit:** a probe that only reads bodies it recognises
reports an absent artifact in place of a present one — when a probe prints `0 b` for something you know exists, check
what the probe filters before you report what the site serves. The same run also collapsed redirects, so a
`301 → 404` (the exact failure the cutover must avoid) would have printed as one end or the other; it now follows up
to four hops and prints the chain (`307 -> /schedule/ -> 200`). Two forms exist for a future watchdog:
`--json` (one artifact, `deployedMatchesBuild` plus `strictProblems`, `measuredAt` in **UTC** — this rig is -0500, so
`2026-11-07T18:51Z` is 2026-11-08 locally) and `--strict` (exit 1 on any target whose chain does not end at its
expected status, or on a 200 feed that is not a VCALENDAR).

**Correction 2026-11-16 (**D373**):** the branch's page of record moved from `/schedule` to `/dates`, and
`scripts/live-probe.mjs`'s `targets` rows moved with it, so the probe now asks production and the Preview for
`/dates`. What production actually answers today is **404 for both names** — `npm run probe:live` @measured
2026-11-16 prints `404 … /schedule 3729b` on both apexes and the live `<title>` is still `Math Enthusiasts
Meetup`, i.e. the 2026-10-31 artifact (D245). So the rename is **not** what makes those rows 404, and no
redirect is owed today: a redirect becomes owed the day an artifact ships both names, and that change is a
Cloudflare-dashboard rule behind the operator's deploy grant. The 2026-11-08 table rows above, and the
`307 -> /schedule/ -> 200` chain below, are records of that run.**

**What that does to the 2026-11-08 rulings.** The accepted legacy-apex 301s (item 2) must run **after** a
production deploy, not before: today a 301 from the old apex would send a visitor to
`https://matheapolis.com/schedule`, which answers **404**. The order that never leaves a live URL pointing at
a hole:

1. `staging → main` (fast forward) and **push `main`** — the repo hook builds and deploys, the mechanism
   measured on 2026-10-30 ("version `4db66b9a…`, created minutes after a push of `main` that nobody deployed
   by hand"). The hook runs `npm run verify` as its build command, so a red gate cannot ship.
2. `npm run probe:live` — production must now read the same title as `dist/client/index.html`, `/dates`
   200 and `/events.ics` 200 **as a VCALENDAR** on both apexes (the probe says `calendar:4 VEVENTs` or
   `NOT a VCALENDAR`). Before believing any of it, re-probe past `cf-cache-status: HIT` with a fresh query key,
   as above.
3. Then the `www` ruling and the old-apex 301 rules (dashboard — §4a/§4b of `domain-cutover-matheapolis.md`).
4. Then, only after the rules are live and probed, the `wrangler.toml` edit that retires the legacy route —
   its own commit, with `check:deploy`'s count changing in it.
5. Then the A15 subscriber check (the `PRODID` change and whether a subscriber double-books).

Unverified on purpose: whether a production `wrangler deploy` detaches the `staging.matheapolis.com` hostname
that `wrangler preview` provisioned (a deploy *replaces* the trigger set from config, and that hostname is
not in config). Re-probe it after the deploy rather than assume either way.

## New-old fact worth keeping

The `check:ai` gate spends one real Claude call and is the only thing that catches a **retired model id**
before visitors do — that is the outage this project already had (`claude-3-haiku-20240307` → 404 →
"Unable to generate summary at this time." served for an unknown period). Keep it out of `verify` (it costs
money and needs a secret) and run it by hand or in the watchdog.

## Teardown update, same day: the record that pointed at Pages was `www`'s

The operator deleted the leftover record and pushed `357a265`. Measured 22:0x–22:1x UTC:

- **The hook is the pipeline.** `npx wrangler deployments status` → version
  **`4db66b9a-80f3-4672-be57-1604eaf35d91`**, created `2026-10-30T22:08:29.353Z`, 100 % — minutes after a
  push of `main` that nobody deployed by hand.
- **Pages auto-deploy off is proven, not assumed.** The same push created a Pages deployment record
  (`8580a3b4`, `deployment_trigger.type = "github:push"`, commit `357a265`) carrying **`is_skipped: true`,
  `skip_reason: "production_deployments_disabled"`**. Pages built nothing and published nothing.
- **The apex is fine.** The hostname still resolves to Cloudflare `A`/`AAAA` — the records Cloudflare created
  for the Custom Domain — and `/api/discord-summary` → 200 `application/json` 681 B in **0.096 s**, `/` 200,
  `/chat/` 200, `/definitely-not-a-page` 404.
- **`www` is dead.** `dig www.minneapolismathbookclub.com @1.1.1.1` → **`NXDOMAIN`**; `curl` → `Could not
  resolve host`. The deleted record was the one `www` resolved through. The trap in one line: a record's
  *target* tells you what it used to reach, its **name** tells you what breaks — read the name before
  deleting. Fix, both Free and grounded at `rules/url-forwarding/#availability`: a proxied dummy
  `A www → 192.0.2.1` (the value `pages/how-to/www-redirect` uses) **plus** one Redirect Rule — `http.host
  eq "www.minneapolismathbookclub.com"` → dynamic `concat("https://minneapolismathbookclub.com",
  http.request.uri.path)`, 301, preserve query string. Free allows 10 Single Redirect rules per zone (Bulk
  Redirects: 15 rules / 5 lists / 10,000 URLs). Answered at the edge, so it costs no Worker CPU and none of
  the 100,000 requests/day.
- **Delete Pages, and rotate `CLAUDE_API_KEY` while doing it.** That deployments response also carries the
  project's `env_vars`, and the Pages project stores `CLAUDE_API_KEY` as **`type: "plain_text"`** — handed
  back in the clear to any token with Pages read scope, not `secret_text`. Deleting the project removes the
  exposure; rotate the key regardless, because it sat there readable. Never paste it into a chat or a commit.
  Rollback does not need Pages any more: `npx wrangler deployments list` lists Worker version ids and
  `npx wrangler rollback [version-id]` restores one (both exist in the pinned 4.155.0).
- **What this token still cannot see:** DNS records (`10000`), custom hostnames (`10000`), and the route set
  (`10404 No route for that URI` on `GET /zones/<id>/routes`; the service-scoped
  `/workers/services/<name>/routes` response has no `routes` / `custom_hosts` fields at all). Triggers are
  observable only through behaviour — which is exactly why `check:deploy` asserts the **declared** set.

## Watchdog design — proposed 2026-10-30, **DEFERRED by the operator (D66)**

Division of labour already exists: **the hook catches artifact shape** (`verify` → `check:deploy`, 21 checks,
runs before wrangler is allowed to touch anything), and `check:ai` / `check:discord` are the credential-holding
oracles. What nothing watches today is **runtime behaviour and hostnames** — every failure this project has
actually had lives there:

| Failure we had | What the probe would see |
| :-- | :-- |
| Retired model id (`claude-3-haiku-20240307` → 404) | `summary` equals `"Unable to generate summary at this time."`, or `lastUpdated` ageing |
| Rotated/dead key (measured locally: `401 authentication_error`) | same — and KV's 7-day grace means it is **silent** for days |
| Pages asset-root (`/api/*` 404) | `/api/discord-summary` 404 `text/html` instead of 200 JSON |
| Trigger detach / wrong DNS record deleted | apex fails **while `workers.dev` succeeds** — that split is the diagnosis |
| Soft-404 fallback | `/definitely-not-a-page` returns 200 |
| Interrupted build, unsubstituted manifest token | already caught pre-deploy by `check:deploy` |

**Assertions (8, all public, no secrets):** `/` 200 `text/html` containing the apex canonical; `/chat/` 200;
`/definitely-not-a-page` 404; `/api/discord-summary` 200 `application/json` with keys `channels`, `messages`,
`lastUpdated`, a summary longer than ~80 chars, not the fallback string, `cache-control: public, max-age=60`,
and `lastUpdated` younger than **48 h**; `https://minneapolis-math-book-club.chexxor.workers.dev/api/discord-summary`
200 (the diagnostic split); `https://www.…/chat/` 301 with a `location` on the apex at the same path; the
compiled hero `/_astro/math-group-image.*.avif` 200 `immutable`.

Why 48 h comes out of the code, not out of thin air: `src/lib/discord.ts` has `KV_CACHE_TTL_SECONDS = 60*60*24`
(24 h shared), `MEMORY_CACHE_TTL_MS` 24 h per isolate, and `STALE_GRACE_MS` 7 days. A quiet site can therefore
legitimately show a ~24 h-old summary; 48 h never fires on a quiet day and still trips with **five days of
grace left**. Side effect worth having: a probe every 30 minutes keeps the KV entry warm, which keeps visitor
requests off the 2 s cold path and keeps the Claude call to roughly one a day.

**Tier 1 — GitHub Actions schedule (recommended now, free, no secrets).** One file
`.github/workflows/watchdog.yml` (`schedule:` + `workflow_dispatch:` for manual runs) that runs `npm ci` then the
probes, so the same oracle runs by hand from this rig and in CI, matching how `check:*` scripts already work.
**Naming correction, 2026-11-08:** this paragraph planned a `npm run probe:live` living in a
`probe-live-site.ts` script, and that path never existed. `npm run probe:live` now exists, in
**`scripts/live-probe.mjs`**, and it is the *artifact* probe — built-vs-deployed tells, both apexes, the preview, and
`/schedule` + `/events.ics` existence (D245). It is **not** the Discord-freshness probe this section was describing,
and it opens no API and reads no secret; the 48 h Discord check needs its own script (a `probe-discord-summary`
under `scripts/`, unwritten as of 2026-11-20 — it lands with the watchdog that would run it) or a flag on this one. Do not wire the watchdog to `probe:live` expecting the Discord assertion. Use zero
third-party actions
(`ubuntu-latest` + `node`/`curl` in `run:` steps), which is also the supply-chain answer: nothing to SHA-pin
because nothing third-party executes, and no repo secrets at all. GitHub's documented floor is *"the minimum
interval you can run scheduled workflows is once every 5 minutes"*. Alerting = GitHub's failure notification
email. Unverified caveat to check in the Actions tab if the repo goes quiet for weeks: GitHub can disable
scheduled workflows on inactive repositories.

**Tier 2 — optional Cloudflare-native alerting into Discord (nicer, later).** A **separate** tiny Worker
(`mmbc-watchdog`) with `[triggers] crons` posting to a channel through the existing bot. D48 still binds: the
app Worker's generated entry exports no `scheduled` handler, so cron belongs on its own Worker. Grounded Free
limits (`workers/platform/limits/`): **5 Cron Triggers per account**, **10 ms CPU per Cron Trigger**, 15
minutes wall time, and `fetch()` waiting does not count as CPU. Cost: a second deploy target, so it needs its
own gate that refuses any `routes`/`custom_domain` in its config — the same class of mistake `check:deploy`
exists for. Design trap to solve up front: a failure-only alert goes **silent when the alerting breaks**, so
post a once-a-day "all green" heartbeat and treat silence as the alarm.

**Not chosen:** Cloudflare's own uptime product — `health-checks/index.md` says *"This functionality is now
offered as part of Cloudflare's origin server safeguard, Smart Shield"*, i.e. not a free knob here. And never
put the bot token or the Claude key in a probe: the probe watches symptoms, then a human/delegate runs
`check:ai` / `check:discord` to name the cause.
