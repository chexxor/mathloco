# Runbook: Pages -> Workers migration checklist

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/pages-to-workers-migration.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

Operator-supplied starting point: `https://developers.cloudflare.com/workers/prompts/pages-to-workers.txt`
(fetched 2026-10-30, 5,423 B). That file is a **generic agent prompt**, not the authority. The authority is
the guide it points at:
`https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/`
(fetched as `.../index.md`). Where the two disagree, the guide wins — three disagreements are listed in
§3 because each one would have made this repo worse.

Status: **planning only. Nothing has been migrated.** Cloudflare auth is absent on this rig
(`npx wrangler whoami` unauthenticated), so every dashboard-dependent step is written as an instruction,
not a result.

## 1. The operator's checklist, item by item, against this repo

| Cloudflare prompt item | Verdict here | Evidence (run on this rig) |
| :-- | :-- | :-- |
| Update Wrangler to `^4` | **Already satisfied** | `npx wrangler --version` -> `4.155.0` |
| Detect package manager | **npm** | `package-lock.json` present, `lockfileVersion 3` |
| Create a Wrangler config file if missing | Exists: `wrangler.toml` | prompt prefers `.jsonc`; optional — our `.toml` is valid and the adapter emits its own `dist/server/wrangler.json` |
| Two mandatory fields: `name`, `compatibility_date` | **Both present** | `wrangler.toml:5` `compatibility_date = "2026-10-29"`; generated config `name = "minneapolis-math-book-club"` |
| "Replace `pages_build_output_dir` with `assets: {directory}`" | **N/A — and this settles option B** | We never had `pages_build_output_dir`. The adapter already writes `"assets": {"binding":"ASSETS","directory":"../client"}` and `"main":"entry.mjs"` |
| Step 3: look for a `functions/` dir with .js/.ts | **None — skip step 6 entirely** | `ls -d functions` -> *No such file or directory*. Our API is an Astro route: `src/pages/api/discord-summary.ts` |
| "If `_worker.js` exists, add `main` + `ASSETS` binding" | **No `_worker.js`** | `find dist -name _worker.js -o -name _routes.json` -> only `dist/client/_headers`. Entry is `entry.mjs` in `dist/server` |
| Step 4: `.assetsignore` containing `_worker.js` | **N/A** | no `_worker.js`; worker code lives in `dist/server`, the assets directory is `dist/client` — the two never mix |
| Step 5: `pages deploy` -> `deploy`, `pages dev` -> `dev` | **Half done** | `wrangler pages dev dist` already deleted; `serve:dist` runs `wrangler dev --config dist/server/wrangler.json`. **Still Pages-shaped:** `package.json:36` `"cf:secrets:list": "wrangler pages secret list"`, `README.md:126`, `wrangler.toml:17-18` |
| Step 7: `wrangler deploy --dry-run` | **Passes today** | `npx wrangler deploy --dry-run --config dist/server/wrangler.json` -> bindings `env.DB` (D1), `env.ASSETS`, `env.DISCORD_GUILD_ID`, exit 0 |
| "Document Project Analysis / Migration Steps / Validation" | Do this in the migration PR description | use §5 order below as the outline |

## 2. What the prompt omits, and the guide requires

1. **`_headers` / `_redirects` are supported natively in Workers static assets** — guide: *"Ensure that,
   just like for Pages, these files are included in the static asset directory."* Ours is
   `dist/client/_headers` (emitted by Astro), and it already declares
   `/_astro/* -> Cache-Control: public, max-age=31536000, immutable`. Verify it survives the move;
   production currently ignores that rule (measured: `max-age=14400, must-revalidate`), so do not claim
   the migration fixes caching on its own.
2. **`pages.dev` disappears.** Replace with a `workers_dev` subdomain + `workers_dev = true`
   (dashboard-configured subdomain). Today's branch previews
   (`chore-deps-upgrade-and-secur.mathloco.pages.dev`) have no equivalent unless preview builds and
   `preview_urls = true` are turned on — see `deploy-and-secrets.md` → *Branch builds and previews*.
3. **Custom domains: "Workers does not support any domain whose nameservers are not managed by
   Cloudflare."** **Settled by the operator on 2026-10-30: our zones' nameservers are Cloudflare-managed.**
   So a Worker can be attached to the apex directly, and Cloudflare will create the wildcard DNS record and
   certificate for custom-domain **Preview** URLs (`<branch>.minneapolismathbookclub.com`). This is also the
   screen that settles the dead-`www` canonical question (D25) — with Cloudflare DNS we can add the `www`
   record and a zone-level 301 without touching the origin.
4. **"Unlike Pages, Workers does not share the same set of runtime and build-time variables."** Any
   Pages *build* env var must be re-declared under Workers Builds. Relevant because our Node pin used
   Pages' `.nvmrc` lever — re-check the toolchain on the new builder (unverified).
5. **Local port changes:** `wrangler pages dev` -> `8788`, `wrangler dev` -> `8787`. We pass `--port`
   explicitly (`8790`), so just keep doing that.
6. **Rollout order:** validate the Worker, migrate traffic, **only then**
   `npx wrangler pages project delete`. And when connecting a repo to Workers Builds, *disable Pages
   automatic deployments* — otherwise every push publishes twice, on two platforms.

## 3. Three places the generic prompt is wrong for this repo

- **It would add a Pages Functions build step.** *"The presence of a `functions/` directory means you
  must include this build step"* → we have none, so `wrangler pages functions build
  --outdir=<output>/_worker.js/` would be a Pages-era command bolted onto an Astro Worker, and would
  manufacture a `_worker.js` inside our assets directory. Skip steps 3b and 6.
- **"Don't add KV, D1, or other bindings unless your build explicitly fails."** Our D1 binding is
  currently *unused at runtime*: `git grep -l drizzle -- src` returns exactly one file,
  `src/schema.ts`, and `git grep "\.DB\b|env\.DB" -- src` returns **nothing**. Following this line would
  delete the binding the events roadmap (`.notes/roadmap-events.md`) is built on. Operator ruling D20
  keeps D1 (SQLite locally, D1 in prod). **Keep `[[d1_databases]]` and say why in the PR**, so the next
  agent does not "clean it up".
- **"Framework Messages: Ignore informational logs about storage or sessions."** Correct as advice about
  *log noise*, wrong as advice about *config*. `@astrojs/cloudflare` 14 enables a KV session driver by
  default and emits `"kv_namespaces":[{"binding":"SESSION"}]` with **no id** (`node_modules/@astrojs/cloudflare/dist/index.js:85`);
  we set `session: false`. Measured correction to my own earlier wording: an id-less KV binding does
  **not** fail validation — re-adding one to a copy of the generated config and running
  `wrangler deploy --dry-run` exited **0** and listed `env.SESSION`. So `session:false` is dead-weight
  trimming (the session chunk went 2,912 B -> 203 B) and removal of a KV write surface, not a proven
  deploy fix. Whether a real (non-dry) deploy resolves it is **unverified**.

## 4. Repo-side diff the migration branch will make (nothing applied yet)

- `wrangler.toml`: add `preview_urls = true` and a `[previews]` block pointing `DB` at
  `d1-mathloco-preview-db` — its id is already committed at `wrangler.toml:50`
  (`database_id = "b58d56c1-6aa6-4108-a1c3-91b5e9dbbcb7"`), so **copy from that line, never from memory**.
- Fix the D1 smell found while doing this: `wrangler.toml:29` `preview_database_id = "DB"`, but
  wrangler's own schema says it is *"The UUID of this D1 database for Wrangler Dev"*. `"DB"` is a binding
  name in a UUID slot — same failure family as the guild-id bug that started this branch. Either remove
  it or put the preview DB's real UUID there.
- `package.json`: `cf:secrets:list` -> `wrangler secret list`; add `deploy` / `preview` scripts
  (`npx wrangler deploy`, `npx wrangler preview`).
- `README.md:126` and `wrangler.toml:17-18`: the secret commands change from
  `wrangler pages secret put ... --project-name` to `wrangler secret put ...` (per environment). The
  current text is right for Pages and must flip **in the same commit** as the platform change, or the
  next operator pastes a wrong command.
- Do **not** add `.assetsignore`, `pages_build_output_dir`, `functions/`, or
  `wrangler pages functions build`.

## 5. Order of operations that keeps the site up

1. Branch off `main` after this branch merges. Build on the branch as normal — `npm run build` already
   produces a complete Worker (`dist/server/entry.mjs` + `dist/server/wrangler.json`).
2. Validate without touching Cloudflare: `npm run build && npx wrangler deploy --dry-run --config
   dist/server/wrangler.json`, then serve it locally — `npx astro preview` or
   `npx wrangler dev --config dist/server/wrangler.json` (both proven on this rig).
3. Create the Worker **without a domain**: `npx wrangler deploy`. Check its `workers.dev` URL for `/`,
   `/chat`, `/api/discord-summary`, `/book-club-social-share.jpg`, and the `/_astro/*` cache header.
4. Attach secrets to the **Worker** (not the Pages project), prod and preview separately.
5. Attach the custom domain to the Worker; keep the Pages project alive as the fallback until the
   Worker is confirmed serving the apex.
6. Only then disable Pages automatic deployments and delete the Pages project.
7. Re-run the four post-deploy checks in `deploy-and-secrets.md`.

## 6. Blocked / unverified — do these before implementing

- Cloudflare auth on this rig, full stop: Workers name availability, D1 UUIDs, existing Pages bindings and
  secrets inventory. (Nameserver management is no longer in this list — operator confirmed.)
- Which Node the **Workers Builds** container runs. The docs never say. This is the exact class of
  failure that broke this branch (Pages v2 image = Node 18; Astro 7 requires `>=22.23.4`). Measure with a
  throwaway build command `node --version`, or make GitHub Actions the builder — see
  `deploy-and-secrets.md` for both.
- How **preview secrets** are set under Worker Previews.
- Whether `[previews]` inherits top-level `[vars]`.
- **Whether either rate-limiting knob is available on a Free zone plan.** Grounded: Cache Rules are on Free with
  **10 rules** (`cache/how-to/cache-rules/index.md`). **Not stated anywhere I retrieved**: plan availability for
  WAF rate limiting rules (`waf/rate-limiting-rules/index.md`, 13 KB, no plan table) or for the Workers Rate
  Limiting binding (`workers/runtime-apis/bindings/rate-limit/index.md`). The migration matrix's "Rate Limiting
  ✅ Workers / ❌ Pages" is a *feature* matrix, not plan availability. Check the dashboard before designing the
  abuse bounds around it.
- Astro's own guidance for Workers (`@astrojs/cloudflare` 14 README: *"An SSR adapter for use with
  Cloudflare Workers targets"*; Astro's Cloudflare guide: *"Removed: Cloudflare Pages support"*) — check
  for a Workers-specific Astro guide before writing config by hand.

## Option D (found 2026-10-30): Pages "advanced mode" — the only way Pages can run this artifact

Pages docs (`pages/functions/advanced-mode`): *"Pages offers the ability to define a `_worker.js` file in the
output directory of your Pages project… Using Module syntax enables JavaScript frameworks to generate a Worker
as part of the Pages output directory contents."* That is the missing piece: adapter 14 emits a module Worker
(`dist/server/entry.mjs`, `"no_bundle": true`, plus `chunks/`), and Pages will run one if it sits in the asset
root as `_worker.js/`.

Mechanically: a post-build copy of `dist/server/*` into `dist/client/_worker.js/`, a `.assetsignore` containing
`_worker.js` so the runtime isn't served as an asset, and Pages-set bindings/compatibility flags in the dashboard.

Why it is ranked **below** the Workers move, even though it is less account work:
- Bindings and compatibility flags live in the **dashboard**, which is how the guild-id bug hid for years —
  and `preview_database_id`/Pages preview bindings are exactly the fields already wrong in `wrangler.toml:29`.
- **Pages preview environments have their own secrets.** The live branch preview may answer 500 rather than 404
  once a Worker exists, if `DISCORD_TOKEN` / `CLAUDE_API_KEY` are not set for the preview environment. Verify with
  `npm run cf:secrets:list` before concluding the Worker failed.
- It is hand-maintained support for a platform the adapter **explicitly removed** ("Removed: Cloudflare Pages
  support", Astro's Cloudflare upgrade notes for v13/Astro 6).
- Nothing is gained for the follow-up list: Cron Triggers, Rate Limiting and Workers Logs stay Workers-only.

Not testable locally on this rig: `wrangler pages dev dist/client` dies with the `middleware-insertion-facade.js`
error because wrangler follows Astro's `.wrangler/deploy/config.json` redirect (see PITFALLS). A push is the test.

## STATUS 1 (2026-10-30, morning) — repo side done, account side not — **superseded by STATUS 2 below**

Branch `infra/workers-deploy-target-and-previews` (stacked on `chore/deps-upgrade-and-security-scan`,
commit `1ea54ed`) carries the repo-side half: `name`, `workers_dev`, `preview_urls`, the required
`[previews]` block (`previews.vars` + `[[previews.d1_databases]]` → `d1-mathloco-preview-db`),
`preview_database_id = "DB"` gone, `deploy` / `preview:deploy` scripts, the three real secret-list
commands, README cutover order, and the astro skill corrected.

Evidence on that branch (native Linux, Node 22.23.4): `npm run verify` exit 0; generated
`dist/server/wrangler.json` carries the new keys; `wrangler deploy --dry-run` lists
`env.DB`, `env.ASSETS`, `env.DISCORD_GUILD_ID` (1856.93 KiB, 10 modules, 26 asset files); `wrangler dev`
on that config serves `/` 200, `/chat/` 200, `/definitely-not-a-page` 404 and
`/api/discord-summary` 200 `application/json` with a real summary.

**Nothing is deployed and nothing can be from this rig** — wrangler is unauthenticated. Account-side
steps, in order, all operator-held:

1. Auth this rig with a scoped dashboard token (see `cloudflare-api-token` skill) or run the commands
   yourself.
2. `npm run deploy` → Worker exists at `minneapolis-math-book-club.<sub>.workers.dev`; apex untouched.
3. `npx wrangler secret put DISCORD_TOKEN` / `CLAUDE_API_KEY` (choose *Production*), then
   `npm run cf:secrets:list` to prove it. Pages secrets do not carry over.
4. `npx wrangler preview base-config secret put DISCORD_TOKEN` and `… CLAUDE_API_KEY` so every new
   branch Preview has them; `npm run cf:secrets:list:preview-base` to prove it.
5. Verify the Worker on `workers.dev`, then a branch Preview with `npm run preview:deploy`.
6. Attach the apex to the Worker (custom domain), remove the Pages custom-domain relationship, verify,
   and only then delete the Pages project. Fix the D1 binding on the preview DB before believing any
   preview-derived event data.

## STATUS 2 (2026-10-30, later the same day) — **the migration is done; only the teardown is left**

Executed on the operator's instruction after they authenticated wrangler. Native Linux, Node 22.23.4.

**The domain moved by route, not by custom domain** — that is the deviation from every checklist here,
including Cloudflare's own. Ask for the custom domain and you get
`code: 100117 … already has externally managed DNS records (A, CNAME, etc). Delete them first`, and
deleting that record blind is impossible from this rig (the OAuth token has no `dns_records`). A route
sits in front of the existing proxied record, so the apex never stopped serving. See D38.

Sequence that worked, with the measured result of each step:

| Step | Result |
| :-- | :-- |
| `npx wrangler whoami` | OAuth, `chexxor@pm.me`, account `1cc19cf380e05566a3bfbfb2e7dcbb94` |
| `npx wrangler d1 list` | both DBs real, ids match `wrangler.toml`, **0 tables each** |
| `npx wrangler pages project list` | project `mathloco`, domains `mathloco.pages.dev` + the apex |
| `npm run deploy` | Worker `minneapolis-math-book-club` live at `…chexxor.workers.dev`, bindings `DB`/`ASSETS`/`DISCORD_GUILD_ID` |
| probe before secrets | `/api/discord-summary` → **502** `{"error":"Failed to fetch Discord summary"}` — fails closed, no leak |
| `printf %s "$v" \| npx wrangler secret put …` (from `.dev.vars`, never printed) | both stored; `cf:secrets:list` confirms |
| probe after secrets | `/api/discord-summary` → **200 application/json**, 517-char summary, 2.38 s |
| `wrangler preview base-config secret put` ×2 + `wrangler preview --name smoke-test` | Preview served a real summary off base-config secrets; then `wrangler preview delete --name smoke-test -y` |
| `npx wrangler deploy --domain minneapolismathbookclub.com` | **rejected, inert** — this is the pre-flight: nothing changed, and the error names the only obstacle |
| `npx wrangler deploy --route 'minneapolismathbookclub.com/*'` | attached. Apex `/` 200, `/chat/` 200, **`/api/discord-summary` 200 with a real summary**, `/definitely-not-a-page` 404, `/_headers` honoured, static `cf-cache-status: HIT` |
| `npx wrangler deploy` (plain, route now in `wrangler.toml`) | trigger list still shows `minneapolismathbookclub.com/*` — proves future deploys keep the domain |

**Still open, in order:** (1) merge `infra/apex-route-and-deploy-gate` — until then a deploy from `main`
detaches the apex; (2) Pages → uncheck *Enable automatic production branch deployments*; (3) DNS end
state (a) normal proxied apex record + keep the route, or (b) delete the record and `--domain`; (4) delete
Pages last; (5) `npm run db:migrate:prod` when the events roadmap needs tables.
