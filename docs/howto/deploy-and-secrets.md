# Runbook: deploy, bindings and secrets

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/deploy-and-secrets.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

**Symptoms it covers:** "where does this actually deploy?"; `wrangler secret put` accepted a value
but the site still 502s; a deploy fails naming a binding; nobody can say the Pages project name;
`og:image` previews show no picture; `/api/discord-summary` returns 502 in production but not locally.

All measurements below are from native Linux x86-64, Node 24.22.1, npm 11.19.1, wrangler 4.155.0,
`@astrojs/cloudflare` 14.4.3, 2026-10-29.

## What is known without touching the dashboard

- **The deploy config is generated, not the repo file.** `npx wrangler deploy --dry-run --outdir /tmp/wout`
  prints `Using redirected Wrangler configuration. Configuration being used: "dist/server/wrangler.json"`
  (original: `wrangler.toml`, redirect via `.wrangler/deploy/config.json`). The adapter writes
  `main: "entry.mjs"` and `assets.directory: "../client"` there; `wrangler.toml` has no `main` and no
  `assets` key. So editing `wrangler.toml` changes bindings; editing it does not choose an entrypoint.
- **Bindings that artifact declares:** `env.SESSION` (kv_namespaces, **no id**), `env.DB` (D1,
  `d1-mathloco-prod-db`, `migrations_dir: ../../migrations`), `env.IMAGES` (images), `env.ASSETS`,
  and `env.DISCORD_GUILD_ID` from `[vars]`.
- **`SESSION` and `IMAGES` are inert today:** `grep -rn "env\.SESSION\|env\.IMAGES" src` returns
  nothing. The adapter emits them with no ids, which is consistent with platform-provided Pages
  bindings, but that is inference from the emitted shape, not a doc quote. Nothing breaks if the
  Pages project lacks them - until code reads them.
- **`--dry-run` needs no auth.** It validated the whole artifact and listed those bindings while
  `npx wrangler whoami` said "You are not authenticated". Use it as the cheap binding check.
- **`pages_build_output_dir = "dist"` changes nothing here.** With that line added, `astro build`
  still emitted only `dist/client` and `dist/server` (no `dist/_worker.js`), and
  `grep -rn pages_build_output_dir node_modules/@astrojs/cloudflare/dist` finds no reference - this
  adapter version never reads it. The line was probed and removed; do not re-add it as a fix for a
  build-shape problem.
- **There is no deploy script in `package.json` and no deploy workflow** (`.github/workflows/`
  contains only `ci.yml`). Deployment is a human action in an authenticated terminal or the dashboard.

## The five things only an authenticated session can settle

Run these in the order listed; each one is a single command and each answer goes in `wrangler.toml`
as a comment or in `README.md` so the next session does not re-ask.

1. **Pages project name.** `npx wrangler pages project list`. Every Pages secret command needs
   `--project-name <name>`; without the name recorded in the repo, the next person runs
   `wrangler secret put` (Worker scope, wrong resource) and the site never sees the value.
   Record it, then `npm run cf:secrets:list` works as written.
2. **Git integration or direct upload?** Dashboard → Pages → the project → Details → Build & deploy.
   If "Production build settings" shows a build command and output dir, the *dashboard* drives the
   build and `wrangler pages deploy` is not the deploy path. If it says the project is built from a
   Git repository, do not "fix" a bad deploy by uploading `dist` from a laptop - that produces a
   deployment whose source nobody can reproduce.
3. **Is the D1 `DB` binding attached to the Pages project?** Dashboard → project → Settings →
   Environment variables & secrets → D1 bindings (the section name moves; look for D1). The repo
   declares the binding, but for Pages the attachment lives on the project. Nothing in `src/`
   queries `env.DB` yet, so this cannot bite today; it bites the moment the first data feature
   ships, and the symptom will be an opaque `TypeError` reading `prepare` on `undefined`, not a
   message naming a missing binding. Check it before that feature, not during.
4. **Which secrets are actually set on the Pages project?** `npx wrangler pages secret list
   --project-name <name>` (that is what `npm run cf:secrets:list` now runs). Only two values belong
   there: `DISCORD_TOKEN` and `CLAUDE_API_KEY` (`CLAUDE_MODEL` optional). `DISCORD_GUILD_ID` does
   **not** - it is a public snowflake and now lives in `wrangler.toml` `[vars]`. The bug that made
   `/chat` fail for years was that guild id set by hand in the dashboard, where the value was the
   bot's own application id; Discord answers that with `10004 "Unknown Guild"`, which reads like a
   permissions problem.
5. **Optional shared cache.** If summaries should survive cold starts: `npm run cf:kv:create`,
   paste the printed `id` into the commented `[[kv_namespaces]]` block in `wrangler.toml`,
   uncomment, `npm run cf:types`. Without it the summaries are cached per isolate and every cold
   start re-pays Discord and Claude.

## After any deploy: the four checks that close the loop

1. `curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' https://<host>/api/discord-summary` -
   expect `200` in a few seconds cold, ~40 ms warm. A `502` with body
   `{"error":"Failed to fetch Discord summary"}` means Discord or Claude failed server-side; the
   cause is in the Pages function logs (`[observability]` is on with head sampling 1), never in the
   response.
2. Open `/chat` in a real browser. It renders a loading state server-side and fetches the API in the
   browser, so `curl` can never prove hydration works. No browser automation is installed here
   (only `/usr/bin/firefox`), so this step is manual until someone decides CI should own it.
3. `npm run audit:gate`, `npm run check:classes`, `npm run db:check` - all four are in `ci.yml`;
   if CI has never run on a branch, the gates prove nothing about it. `git log main..HEAD --oneline`
   plus the Actions page is the honest status.
4. Social preview: `curl -sI https://<host>/book-club-social-share.png` - currently **404** while
   `src/config.json` advertises it as `og:image`, and `/favicon.png` 404s while `Layout.astro`
   declares it as the alternate icon. Both are asset decisions for the operator, not bugs to
   guess at.

## Standing advice

- Never run `wrangler secret put` without `pages` on this project. It targets a Worker; the value
  lands somewhere that is not this site and the symptom is identical to "forgot the secret".
- Set secrets with `--project-name`; if the CLI offers an interactive pick, that is fine locally but
  never in a script you paste into a runbook.
- `wrangler.toml` `[vars]` reach the local dev runtime too - verified by commenting
  `DISCORD_GUILD_ID` out of `.dev.vars` and still getting `200` from `/api/discord-summary` in
  2.47 s. `.dev.vars` still wins locally, which is what you want when pointing at another guild.

## Branch builds and previews after Pages -> Workers

Operator flagged that "Workers does not auto-build every branch like Pages"
(`workers/ci-cd/builds/build-branches/#configure-preview-builds`). Grounded correction: Workers
**does** build every non-production branch — *"When enabled, every push to a branch that is not your
production branch triggers a preview build"* — but unlike Pages it is **opt-in**, and the preview
*model* is different. Three real deltas, not the one assumed:

1. **A checkbox we would have to remember.** Dashboard: *Settings → Build → Branch control →
   Enable Preview Builds*. Production-branch pushes always build + run the deploy command
   (default `npx wrangler deploy`), so "prod only moves when `main` moves" survives migration.
2. **Worker Previews are a different mechanism, and the switch is one-way.** New Workers default to
   `npx wrangler preview`. Existing Workers connected to Builds keep the old model until a
   *"one-time switch"* that *"cannot be reversed"*. Docs: *"Previews do not use production settings"*
   → preview bindings, vars and secrets must be declared, in the Wrangler file:
   ```toml
   [vars]
   DISCORD_GUILD_ID = "1170385683379126343"

   [previews.vars]
   DISCORD_GUILD_ID = "1170385683379126343"   # verify whether previews inherit [vars]

   [previews.d1_databases]                     # preview must not point at prod's DB
   binding = "DB"
   database_name = "d1-mathloco-preview-db"
   database_id = "b58d56c1-6aa6-4108-a1c3-91b5e9dbbcb7"
   ```
   And: *"Settings that you add or import in the dashboard must also be copied to your Wrangler
   configuration file"* — so dashboard-only preview config is not a thing to lean on.
   Note this is **not** the same as our `[env.preview]` wrangler-environment block; mixing Worker
   Previews with `--env preview` is a trap. If wrangler environments are used at all, Astro needs the
   env chosen at **build** time (`CLOUDFLARE_ENV=<env>`), per the adapter's v13/Astro 6 changes.
3. **Preview URLs change shape.** `preview_urls = true` + a `previews` block (the adapter already
   emits `"previews":{}` into `dist/server/wrangler.json`), and for our own domain each Preview is
   `<preview-name>.<your-domain>` with Cloudflare creating the wildcard DNS record and certificate —
   so `chore-deps-upgrade-and-secur.mathloco.pages.dev` becomes
   `chore-deps-upgrade-and-secur.minneapolismathbookclub.com`. PR comments come along for GitHub repos.

### Two ways to be the builder — pick one deliberately

**A. Workers Builds (closest to today).** Build command `npm ci && npm run build`, deploy
`npx wrangler deploy`, preview `npx wrangler preview`. Free limits: **3,000 build minutes/month,
1 concurrent build, 20-minute timeout** — fine, but one concurrent build means branch pushes queue.
**Unverified and load-bearing: the docs never say which Node version the build container runs.**
That is the exact class of failure that broke this branch (Pages' v2 image = Node 18, Astro 7
refused it), and `.nvmrc` is a *Pages* lever. Before adopting, measure with a throwaway build whose
command is `node --version`, or pin inside the build command.

**B. GitHub Actions as the builder (recommended).** The `verify` job already runs the gates on a
deterministic `actions/setup-node` pin of 22.23.4, and the Previews doc's Step 2 says to run
*"the same Preview command locally or in your existing CI workflow"* — so add a `preview` job on
`pull_request` running `npx wrangler preview`, and a `deploy` job on `main` (or `workflow_dispatch`,
which keeps prod explicitly operator-gated). Needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
as repo secrets; scope that token with the vendored `cloudflare-api-token` skill rather than a global
one. The repo is public, so Actions minutes are free.

**C. No hosted branch preview at all** — `npm run preview:workerd` and `npm run serve:dist` both serve
the built artifact on workerd locally (measured: `/` 200, `/chat` 307→200, `/api/discord-summary` 200,
`/book-club-social-share.jpg` 200, `_headers` applied). Zero setup; loses the browsable link the
operator has been reviewing on.

### Not yet grounded, do before implementing
- Whether previews inherit top-level `[vars]` or must restate them.
- How preview **secrets** are set (`DISCORD_TOKEN`, `CLAUDE_API_KEY`) — no `wrangler preview secret`
  syntax found in the pages read so far. Never assume; this project's history is a secret landing in
  the wrong place.
- Which Node the Workers Builds container runs (if option A is chosen).

### Answered 2026-10-30 (the three open questions above, two now grounded)

1. **Does `[previews.vars]` inherit top-level `[vars]`? No.** Wrangler's own `config-schema.json` for the
   `previews` sub-objects: *"This field is not automatically inherited from the top level environment, and so
   must be specified in every named environment."* The Previews docs add that the `previews` block is
   **required** (may be empty) and that `assets`, `compatibility_date`, `compatibility_flags` stay top level.
   So `DISCORD_GUILD_ID` is written three times in `wrangler.toml` on purpose.
2. **How preview secrets are set:** they cannot live in a config file.
   `npx wrangler preview base-config secret put X` (every new Preview, at creation; later edits do not touch
   live Previews) or `npx wrangler preview secret put X --name <branch>` (one Preview; `--name` defaults to the
   current git branch). Deletion and `… secret bulk <file>` exist too, and `… secret list` on both scopes is what
   `npm run cf:secrets:list:preview[-base]` wraps. All confirmed present on wrangler **4.155.0** via `--help`;
   Previews require **≥ 4.135.0**.
3. **Which Node the Workers Builds container runs: still NOT documented.**
   `workers/ci-cd/builds/configuration` covers build command, outputs and cached directories and says nothing
   about the container's Node. Given this project's Pages failure was exactly that, do not inherit a mystery
   default: pin inside the build command (`nvm use && npm ci && npm run verify && wrangler deploy`) or keep
   building in GitHub Actions where `actions/setup-node` pins `22.23.4` explicitly.

Also: a Preview whose secrets are missing **deploys and 500s** rather than refusing to deploy — so when a
Preview URL misbehaves, run `npm run cf:secrets:list:preview` before reading code.

## After the cutover (2026-10-30): what auth you have, and what it still cannot do
wrangler is logged in by OAuth (`~/.config/.wrangler/config/default.toml`), which covers workers,
`workers_routes`, d1, pages and `zone:read` — but **not `dns_records`**. Anything that adds, moves or
deletes a DNS record needs the dashboard or a scoped API token with Zone → DNS → Edit. Never copy the
OAuth token out of that file into a shell history-visible place; extract it into a variable inside one
command when an API call is needed, and print only the fields you asked for.

Secrets live in three separate stores now — production Worker (`wrangler secret put`), Previews base
config (`wrangler preview base-config secret put`), and individual Previews (`wrangler preview secret
put --name <branch>`). `.dev.vars` is local-only and is read by `wrangler dev`, never by a deploy. To set
a remote secret from it without printing the value: take the first line of `.dev.vars` whose key is
`DISCORD_TOKEN`, cut it at the first `=`, and pipe the remainder into
`npx wrangler secret put DISCORD_TOKEN` (the key is written here, the value never is - a runbook names a
secret, it does not carry one).
`CLAUDE_MODEL` is intentionally empty locally; the code default is what production runs, so do not turn it
into a secret.
