# Minneapolis Math Book Club - Astro + Tailwind + Cloudflare Workers

## 🎯 Features

- ✅ [Astro 7](https://astro.build/) with the [Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) (Workers target: static assets + one SSR Worker, D1 bindings, workerd dev server);
- ✅ [Tailwind 4](https://tailwindcss.com/) — CSS-first config, wired in through `@tailwindcss/vite`;
- ✅ [Svelte 5](https://svelte.dev/) islands (`src/components/*.svelte`);
- ✅ [Astro/Sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) (requires `site` in `astro.config.mjs`);
- ✅ [Drizzle ORM](https://orm.drizzle.team/docs/migrations) + Cloudflare D1;
- ✅ Claude (Anthropic SDK v1) summary of Discord channels at `/api/discord-summary`.

## 🧞 Commands

Run from the project root. **npm is the only supported package manager here** — `package-lock.json`
is the single lockfile (`bun.lockb` was removed because it had drifted from the npm resolution).

## 🚀 Running it locally, end to end

0. **Runtime** — Node **22.23.4**; `nvm use` reads `.nvmrc`. The number is not a preference:
   Astro 7.4.4 refuses to build below `>=22.23.4`. Cloudflare's
   [build-image table](https://developers.cloudflare.com/pages/configuration/build-image/#override-default-versions)
   gives the defaults per image: **v3 → Node 22.23.4 + npm 10.9.9**, **v2 → Node 18.17.1 +
   npm 9.6.7**, v1 → 12.18.0. This Pages project is on **v2** — the failing 2026-10-29 branch build
   logged `nodejs@18.17.1, npm@9.6.7` and then `Node.js v18.17.1 is not supported by Astro!`.
   The repo-side fix is the `.nvmrc`: that table accepts `.nvmrc`/`.node-version` (or a
   `NODE_VERSION` build env var) as an "any version" override on every image. Two reasons to keep
   the pin rather than trust the default: **v2 is auto-moved to v3 on 2027-02-23**, and Cloudflare
   "will update preinstalled software before reaching end-of-life … these updates apply only if you
   have not overridden the default version" — their own best practice is to pin. Note the same page
   lists, as a v3 limitation, that detecting Node and package managers from `package.json`
   `"engines"` is **not** supported: `engines.node` below is a local guard, not the build-service lever.
   The same pin applies wherever the build runs — GitHub Actions (`ci.yml` pins `22.23.4`) and, once the
   deploy target is a Worker, Workers Builds. Wrangler's own [build-configuration
   page](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) documents the build
   command, outputs and cached directories but **does not state the container's Node version**, so if
   Workers Builds is enabled, add `nvm use` (or an explicit `NODE_VERSION`) to the build command rather
   than assuming its default.
1. **Install** — `npm install`. On a fresh machine **npm 11** reports install scripts it has not
   run yet (`npm install-scripts ls`); the approved set is recorded in `allowScripts` in
   `package.json`, so a normal `npm ci` needs no interaction. Note that `better-sqlite3` v13
   ships prebuilt binaries, so no C++ toolchain is required. Caveat worth knowing: the install
   scripts gate is an **npm 11** feature — Pages (npm 10.9.9) and anything else on npm 10 have no
   `install-scripts` command at all, so there the guard is the pinned lockfile plus `npm ci`.
2. **Secrets** — `cp .dev.vars.example .dev.vars` and fill in the three values (each line in
   that example file says where the value comes from). `.dev.vars` is gitignored, and the dev
   server reloads when you change it.
3. **Pre-flight** — `npm run check:discord`. It uses the same credentials the app uses and tells
   you, before you open a browser, whether the bot is a member of the configured guild, whether
   Discord is withholding message text (the Message Content Intent trap), and which guild ids the
   token can actually see. `DISCORD_GUILD_ID` must be the **server** id — pasting the bot's own
   Application ID is the single most common failure and shows up as `10004 "Unknown Guild"`.
   `npm run check:ai` is the matching pre-flight for the model side: it resolves the model id the
   way the app does (argument → environment → `.dev.vars` → `wrangler.toml [vars]`), makes one tiny
   call, and prints the resolved id plus token usage. A retired or mistyped id exits non-zero with
   the 404 and the deprecations link — that is exactly how production ended up printing
   "Unable to generate summary at this time." for weeks. It is deliberately not in CI: it needs a
   real key and spends a request. Run it before a production deploy and after any Anthropic
   deprecation notice.
4. **Local database** — only needed for work that touches data. `npm run db:migrate:local` applies
   `migrations/` to the local D1 SQLite file under `.wrangler/state/v3/d1/`; `npm run db:check`
   verifies those migrations agree with `src/schema.ts`; `npm run db:studio:local` browses the
   rows. Two things worth knowing first: nothing in `src/` queries `env.DB` yet, so the tables
   exist but stay empty until a feature uses them; and remote targets need `.drizzle.env` (copy
   `.drizzle.env.example`) — see [Database](#-database-sqlite-locally-d1-in-production).
5. **Run** — `npm run dev` → http://localhost:4321. Stop it with `npx astro dev stop` (Astro 7
   runs the dev server as a background process).
6. **The chat page** — `/chat` renders a loading state on the server and then fetches
   `/api/discord-summary` in the browser. A cold fetch (Discord + Claude) takes a few seconds; the
   next one in the same isolate is ~40 ms. If credentials are missing or Discord/Claude fail, the
   API returns `{"error":"Failed to fetch Discord summary"}` with status `502` and the page shows
   its "could not load" state — the real cause and stack trace go to `npx astro dev logs`, never
   to the response.
7. **Cache behaviour** — `npm run check:cache` runs the summary-cache rules (shared-cache hit,
   stale-on-error within the 7-day grace, nothing cached on total failure) against a fake KV
   namespace. The default run needs no credentials and makes no Claude calls; `-- --live` adds two
   cases that use the real ones.

| Command                      | Action                                                        |
| :--------------------------- | :------------------------------------------------------------ |
| `npm install`                | Installs dependencies                                         |
| `npm run dev`                | Starts the dev server at `localhost:4321` (`npx astro dev stop` to stop it) |
| `npm run start:app`          | Alternative way to start the dev server                       |
| `npm run serve:dist`         | Build, then serve `dist` on workerd via `wrangler dev --config dist/server/wrangler.json` — the same runtime the deploy uses |
| `npm run build`              | Builds the production site to `./dist/`                       |
| `npm run preview`            | Preview the dev server on your LAN with the `--host` flag     |
| `npm run preview:workerd`    | Build, then `astro preview` — serves the built artifact on workerd, applies `_headers`, loads `dist/server/.dev.vars` |
| `npm run check`              | `astro check` — types, config and template diagnostics        |
| `npm run check:sanitize`     | Adversarial checks for the Discord summary render path        |
| `npm run check:classes`      | Every class name written in `src/` must resolve to real CSS (Tailwind or hand-written) |
| `npm run check:discord`      | Discord/credential pre-flight: guild access, message content, key shape |
| `npm run check:ai`           | Model pre-flight: does the configured model id resolve? Prints token usage (needs a key, not in CI) |
| `npm run check:cache`        | Summary-cache rules against a fake KV namespace (`-- --live` for live cases) |
| `npm run astro -- <cmd>`     | Run Astro CLI commands                                        |
| `npm run db:generate`         | Generate Drizzle migrations from `src/schema.ts`             |
| `npm run db:check`            | Verify `migrations/` agree with `src/schema.ts` (CI runs it)  |
| `npm run db:migrate:local`    | Apply migrations to the local D1 SQLite copy                 |
| `npm run db:migrate:preview`  | Apply migrations to the preview database (needs Cloudflare auth) |
| `npm run db:migrate:prod`     | Apply migrations to production (needs Cloudflare auth)       |
| `npm run db:studio:local`     | Drizzle Studio against the local D1 SQLite copy              |
| `npm run db:studio:preview`   | Drizzle Studio against the preview database (needs `.drizzle.env`) |
| `npm run db:studio:prod`      | Drizzle Studio against production (needs `.drizzle.env`)     |
| `npm run db:pull:local`       | Introspect the local copy back into `src/schema.ts` — **overwrites** it |
| `npm run db:pull:preview`     | Same, against preview — **overwrites** `src/schema.ts` and `migrations/` |
| `npm run db:pull:prod`        | Same, against production — **overwrites** `src/schema.ts` and `migrations/` |
| `npm run audit:all`          | `npm audit` for prod + dev dependencies                       |
| `npm run audit:prod`         | `npm audit --omit=dev` (what actually ships)                  |
| `npm run audit:gate`         | Audit that fails only on advisories outside the documented allowlist (what CI runs) |
| `npm run deploy`             | `npm run verify && wrangler deploy` — the gates run before a **production** Worker deploy, so a red gate cannot deploy |
| `npm run preview:deploy`     | `npm run verify && wrangler preview` — a branch Preview URL for review; name defaults to the current git branch |
| `npm run verify`             | **The whole gate set in one command**: `check` · `check:classes` · `db:check` · `check:sanitize` · `check:cache` · `audit:gate` · `build` · `check:deploy`. This is the hook's **build command**, so a red gate cannot upload | 
| `npm run check:deploy`       | Read `dist/server/wrangler.json` (and `entry.mjs`) and assert it is still deployable on the apex: the route, the assets root, the D1 ids, the Preview vars, both KV namespaces, the cold-start byte budget, and that Astro's manifest actually got injected. 19 checks; needs a build, so it runs **after** `build` in `verify` |
| `npm run probe:cpu`          | Deploy the built artifact as a throwaway Worker (`mmbc-cpu-probe`, no routes, preview KV/D1 only) so `wrangler tail` can report **per-request CPU** before anything of yours is promoted. Delete it after: `npx wrangler delete mmbc-cpu-probe --force` |
| `npm run falsify:manifest`   | Deliberately break `dist/server/entry.mjs` to prove the manifest assertions in `check:deploy` go red. Operates on `dist/` only; restore with `npm run build` |
| `npm run cf:types`           | Regenerate `worker-configuration.d.ts` from `wrangler.toml` (`wrangler types`) |
| `npm run cf:secrets:list`    | List secrets on the **production** Worker                  |
| `npm run cf:secrets:list:preview`      | List secrets on the Preview for the current branch |
| `npm run cf:secrets:list:preview-base` | List secrets on the Previews **base config** (copied into each new Preview at creation) |
| `npm run cf:kv:create`       | Create a KV namespace named `SUMMARY_CACHE`. Both needed namespaces already exist — see "Summary cache" below — so this is only for rebuilding after an account change |

## 🔄 Deploy pipeline: a Cloudflare repo hook, not GitHub Actions

Deploys come from a git hook into Workers, so nothing in GitHub Actions has to do anything. That works
because a hook runs a **build command** before a **deploy command**, and a build command that exits
non-zero stops the deploy:

| hook setting | value | why |
| --- | --- | --- |
| Git branch | `main` | production-branch builds promote a version; other branches build Previews |
| Build command | `npm run verify` | every gate, `check:deploy` included, runs before anything uploads |
| Deploy command | `npx wrangler deploy` (default) | the hook uses the Wrangler version pinned in `package.json` |
| Preview command | `npx wrangler preview` (default) | matches the `[previews]` block: preview D1, preview KV namespace, preview vars |

The facts that make this worth wanting, rather than remembered: the Workers Builds image **preinstalls
Node.js 22.23.4** and reads `.nvmrc` / `.node-version` (or `NODE_VERSION`), so the pin this repo needs is
already its default; the free plan allows **3,000 build minutes/month, 1 concurrent build, a 20-minute
timeout** and `verify` takes about two; and a build that must not ship can use
`npx wrangler versions upload` as its deploy command, which produces a version and a Version URL without
promoting it — the thing we wished Pages could do.

Two consequences to plan around:

* `.github/workflows/ci.yml` is redundant once the hook is green, and is still here because it is
  currently the only record of these gates running off this machine (two runs, both `success`).
* A hook catches **build-time** failures. It cannot notice a model id Anthropic retires next month with
  no push. Putting `check:ai` in the build command with a build secret catches it at the next deploy,
  and the KV cache plus the 7-day stale grace now buys roughly a week of slack instead of an instant
  outage. A real watchdog needs a scheduler: the Astro-generated entry has **no `scheduled` handler**
  (`grep scheduled dist/server/*.mjs` finds none), so a Workers Cron Trigger would invoke a handler that
  does not exist.

Connecting the repo needs the Cloudflare GitHub App. With a `wrangler login` OAuth token, `GET
/accounts/<id>/builds/workers/<worker>/triggers` answers `{"code":10000,"message":"Authentication
error"}` — the Builds API wants a token with Workers Builds permissions — so either connect it in the
dashboard (Workers → `minneapolis-math-book-club` → Settings → **Builds & Deployments**) or create that
token. Build secrets are separate from runtime secrets and are never readable at runtime.

### Summary cache (KV), and why the bundle size is a CPU budget

Workers bill **CPU time**, and on the free plan an HTTP request gets **10 ms** of it — past that the
Visitor gets error 1102. Waiting on `fetch` does not count; *evaluating the module* does. A cold
`/api/discord-summary` measured `cpu=13ms wall=1973ms`, over the ceiling, because one route chunk was
**1,439,951 B** of Discord and Anthropic SDKs inside a 2,208,627 B bundle. So `src/` talks to both APIs
with plain `fetch` (618,134 B total, largest module 346,636 B) and `check:deploy` refuses to deploy past
a byte budget, because a dependency list does not tell you what landed in which route chunk.

The same route, measured on the real runtime after the change (throwaway probe Worker, `npm run probe:cpu`,
`wrangler tail --format json`, whose top-level `cpuTime`/`wallTime` are the only place this rig has ever
seen the number):

| request | cpu | wall |
| --- | --- | --- |
| cold isolate, KV miss (live Discord + Claude) | **8 ms** | 1983 ms |
| ten KV-warm requests | 0–1 ms each, one at **5 ms** | ~1 ms, that one 10 ms |
| `GET /`, `/chat/`, `/favicon.svg` | **not logged at all** | — |

Read it honestly: 13 ms → 8 ms is *under* the ceiling with **2 ms to spare**, not comfortably under it, and
the one 5 ms sample is what a fresh isolate costs even when the answer is in KV — so a burst after traffic
goes quiet is the shape that could still clip. The third row is the free-tier lever worth more: static
asset requests never invoke the Worker, which is why `/` and `/chat` are prerendered. A Preview **cannot**
be tailed (`wrangler tail <preview-name>` → "This Worker does not exist" [code: 10007]; a Preview's
requests do not appear in the production Worker's tail either), which is why the probe exists.

The cache itself, measured on workerd in sequence: cold isolate with nothing cached **2.09 s**, same
isolate again **0.008 s**, and after a restart with a warm KV **0.037 s**. Namespaces:

| binding | namespace | id | used by |
| --- | --- | --- | --- |
| `SUMMARY_CACHE` | `SUMMARY_CACHE` | `ee21a66177e94bafb9ed3829d5af537d` | production |
| `SUMMARY_CACHE` | `SUMMARY_CACHE_PREVIEW` | `8173e43e9bfb496d9cbe21d8e4e38318` | Previews |

Verified rather than assumed: after a Preview served the summary route, the preview namespace held
`discord-summary:v1:1170385683379126343` and the production namespace was still `[]`. Free plan allows
1,000 namespaces per account and 100,000 reads / 1,000 writes per day, so this costs nothing at our
volume. The binding also revives the 7-day stale-serving path, which only runs when KV is bound.

## 🚚 Deploy target: Workers — the cutover, and why the apex is a *route*

The build produces a Workers artifact: `dist/client` (static assets) and `dist/server/entry.mjs` (one
SSR Worker, `"no_bundle": true`), and `dist/server/wrangler.json` wires them together with
`assets.directory = "../client"`. `npm run deploy` ships that. **Pages cannot run this artifact's
server side**: on the Pages branch preview it logged `No functions dir at /functions found. Skipping.`
and `Success: Assets published!` with no Worker upload, `/api/discord-summary` answered 404, and the
same commit under workerd answered `200 application/json` with a real summary. Astro removed Pages
support from this adapter at v13. So the API routes only exist where a Worker runs.

Since 2026-10-30 the apex is served by the Worker, and the mechanism is a **route**, not a custom
domain — that was forced, and the reason is in `wrangler.toml`:

```
Hostname 'minneapolismathbookclub.com' already has externally managed DNS records
(A, CNAME, etc). Delete them first or try a different hostname. [code: 100117]
```

A Custom Domain has Cloudflare create the record, and the docs say it *"cannot be created on a
hostname with an existing CNAME DNS record"*; a route sits *"in front of your existing proxied
hostnames"*. So the route attached while the record stayed put and **the site never stopped
serving** — measured before/after in one minute, `/api/discord-summary` went 404 → 200 with a real
summary while `/` kept answering 200 the whole time.

⚠️ **Wrangler replaces a Worker's triggers on every deploy.** `wrangler deploy` from a config without
the `routes` block does not leave the domain alone — it **detaches the apex**. That is what
`npm run check:deploy` exists to make impossible; it reads the artifact wrangler will actually
upload, not the TOML it came from (the adapter has already been seen to drop keys it does not know).

The same gate also checks something that only showed up as a deploy refusal. One build reported
`Complete!`, exited 0, and passed every check — and then `wrangler deploy` rejected it:

```text
Uncaught TypeError: Invalid URL string.
  at .../astro/dist/core/app/manifest.js:35 in deserializeManifest
  at entry.mjs:170                                           [code: 10021]
```

`dist/server/entry.mjs` still held `deserializeManifest("@@ASTRO_MANIFEST_REPLACE@@")` — Astro's
post-build hook had never substituted the manifest, so the Worker threw `new URL(undefined)` at
startup. It is also ~6.5 KB smaller than a good entry. `check:deploy` now asserts the token is gone and
that a `"rootDir":"file://` payload is present, and `npm run falsify:manifest` re-breaks `entry.mjs` to
prove both go red (2 failures, then `npm run build` to restore). Seven later builds were clean, so the
original trigger is not pinned down, but a build cut short was seen leaving `dist/server/entry.mjs`
**absent** while `chunks/` and `wrangler.json` were already there — so the two broken shapes are "entry
missing" and "entry present, token unsubstituted", and the gate names each with its own remedy
(`rm -rf dist && npm run build`). If a build command ever gets interrupted, rebuild before believing `dist/`.

The remaining teardown, in this order (each step is reversible up to the last):

1. The Pages project `mathloco` still exists and still lists `minneapolismathbookclub.com` as a
   custom hostname, even though the route now shadows it. **Do not delete the Pages project until the
   apex has a DNS record that Pages does not own** — a route requires a proxied record to exist, and
   deleting Pages may take the record with it, which would make the apex `ERR_NAME_NOT_RESOLVED`.
   Two clean end states: (a) keep the route and make the apex record a normal proxied record, or
   (b) delete the apex record and then ask for a custom domain, which recreates the record pointed at
   the Worker. Both need DNS edit rights, which the `wrangler login` OAuth token does **not** carry
   (`dns_records` scope) — dashboard, or a scoped API token.
2. Turn off Pages production auto-deploy (Settings → Build → *Production branch control*), or the old
   project keeps rebuilding on every push to `main` and burns the 500-build/month free allowance.
3. Delete Pages last, once the Worker has served the apex for a while and you want no rollback.

Branch review without touching production: `npm run preview:deploy` (`wrangler preview`) returns a
Preview URL named after the current git branch; with `preview_urls = true` each deployment also keeps a
unique `<version>-<name>.<subdomain>.workers.dev` URL. Previews do **not** inherit production settings —
that is why `[previews.vars]` and `[[previews.d1_databases]]` exist in `wrangler.toml`, and why preview
secrets are set with `wrangler preview base-config secret put`. Verified working 2026-10-30: a Preview
served `/api/discord-summary` → 200 with a real summary off the base-config secrets alone.

Branch review without touching production: `npm run preview:deploy` (`wrangler preview`) returns a
Preview URL named after the current git branch; with `preview_urls = true` each deployment also keeps a
unique `<version>-<name>.<subdomain>.workers.dev` URL. Previews do **not** inherit production settings —
that is why `[previews.vars]` and `[[previews.d1_databases]]` exist in `wrangler.toml`, and why preview
secrets are set with `wrangler preview base-config secret put`.

## 🌐 Host names and the canonical URL

The site is served at the **apex**: `https://minneapolismathbookclub.com`. The canonical host appears in
exactly two files, and they must match:

| File | Key | What it drives |
| :-- | :-- | :-- |
| `src/config.json` | `seo.canonical` | `<link rel="canonical">`, `og:url`, and the prefix for `og:image` (`src/layouts/Layout.astro`) |
| `astro.config.mjs` | `site` | the absolute `<loc>` URLs in `sitemap-0.xml` (`@astrojs/sitemap`) |

`public/robots.txt` also names the sitemap absolutely, so it is a third place the host is written.

**Do not set these to `www` unless `www` actually resolves.** A canonical pointing at a host with no DNS
record tells every crawler that the working pages are duplicates of pages that do not exist — it is worse
than no canonical at all. `www` does now resolve and does redirect to the apex (measured 2026-10-30:
`https://www.minneapolismathbookclub.com/` → `301` → `https://minneapolismathbookclub.com/` → `200`), so
the apex is a safe canonical. Proxied records hide the record type from a public DNS lookup — `www`
answers `A`/`AAAA` for a Cloudflare proxied record whatever you created — so verify a redirect by
fetching it, not by querying it.

If you ever want `www` to be the canonical instead, do it in the Cloudflare zone, not here:
add a `www` record (proxied, pointing at the same Worker/Pages service) and one **Single Redirect** rule
`https://www.minneapolismathbookclub.com/*` → `https://minneapolismathbookclub.com/$1`, **301**. Single
Redirects are available on every plan (10 rules on Free). Prefer this over a `_redirects` file: Pages
docs state that `_redirects` entries *"are not applied to requests served by Pages Functions"*, so a
host-level redirect in `_redirects` is not guaranteed to cover the API routes.

## 🔐 Environment

Secrets and variables are read through `import { env } from 'cloudflare:workers'`, typed in
`src/env.d.ts` (`Cloudflare.Env`), and supplied per environment:

| Name | Where to get it | Notes |
| :-- | :-- | :-- |
| `DISCORD_TOKEN` | Discord Developer Portal → your application → **Bot → Reset Token** | The bot must be a member of the server, with **View Channels** + **Read Message History**, and **Message Content Intent** must be enabled in the portal or `content` comes back empty. |
| `DISCORD_GUILD_ID` | Discord desktop app: Settings → Advanced → Developer Mode, then right-click the server → *Copy Server ID* | **Not a secret** — it is committed in `wrangler.toml` under `[vars]` (and `[env.preview.vars]`) so it can be reviewed and diffed; `.dev.vars` overrides it locally. Plain numeric ID; also used as the cache key. Pasting the bot's *application* ID here is the single most common failure — `npm run check:discord` prints the guild ids your token can actually see. |
| `CLAUDE_API_KEY` | console.anthropic.com → Settings → API Keys | |
| `CLAUDE_MODEL` | optional | Defaults to `claude-haiku-5-5` (`src/lib/claude.ts`). |

- **Local:** put them in `.dev.vars` (gitignored). Wrangler-style per-environment files
  (`.dev.vars.preview`) also work. `wrangler.toml` `[vars]` reach the local dev runtime too —
  verified: with `DISCORD_GUILD_ID` commented out in `.dev.vars`, `/api/discord-summary` still
  returned `200` in 2.47 s against the guild from `wrangler.toml`.
- **Deployed (Worker, production):** `npx wrangler secret put DISCORD_TOKEN` then choose
  *Production*; same for `CLAUDE_API_KEY`. List them with `npm run cf:secrets:list`.
- **Branch Previews:** secrets are *not* inherited from production, and they cannot live in a config
  file. Set them once on the Previews base config so every new Preview gets them —
  `npx wrangler preview base-config secret put DISCORD_TOKEN` — or override on one Preview with
  `npx wrangler preview secret put DISCORD_TOKEN --name <branch>`. `npm run cf:secrets:list:preview`
  and `:preview-base` show what is actually set. A Preview with missing secrets boots and serves 500s
  rather than refusing to deploy, so check the list before debugging the code.
- **Old Pages project (still serving the apex today):** its secrets were set with
  `npx wrangler pages secret put … --project-name <project>`. Those do **not** carry over to a Worker —
  a Worker's secrets are a different resource. Re-set them with the Worker commands above; do not
  assume the dashboard value followed the migration.
- `DISCORD_GUILD_ID` is in **three** places in `wrangler.toml` on purpose — `[vars]` (production),
  `[previews.vars]` (branch Previews) and `[env.preview.vars]` (the named `--env preview` config).
  Wrangler does not inherit `vars` into Previews or named environments; its own schema says each must
  specify it. If you change the guild id, change all three or grep for it.
- **Bindings** (D1, and the optional KV) live in `wrangler.toml`. Run `npm run cf:types` after
  changing it, so `worker-configuration.d.ts` is regenerated — bindings are typed there, while
  secrets/vars stay declared in `src/env.d.ts`. **Bindings also do not inherit into Previews:**
  `[[previews.d1_databases]]` must name the *preview* database, because two Previews bound to the same
  `database_id` share rows.
- **Optional KV cache:** `npm run cf:kv:create`, paste the printed `id`/`preview_id` into the
  commented `[[kv_namespaces]]` block in `wrangler.toml`, uncomment it, then `npm run cf:types`.
  Without it the Discord summaries are cached per isolate only, so each cold start re-fetches
  Discord and re-pays Claude.

## 🗄️ Database: SQLite locally, D1 in production

One schema (`src/schema.ts`), three targets, and the target is always explicit — because the
previous setup guessed and got it wrong:

| Command | What it opens |
| :-- | :-- |
| `db:generate`, `db:check`, `db:studio:local`, `db:pull:local` | the local SQLite file under `.wrangler/state/v3/d1/` (`drizzle.config.ts`) |
| `db:studio:preview`, `db:pull:preview` | `d1-mathloco-preview-db` over the D1 API (`drizzle.config.preview.ts`) |
| `db:studio:prod`, `db:pull:prod` | `d1-mathloco-prod-db` over the D1 API (`drizzle.config.prod.ts`) |
| `db:migrate:local` / `:preview` / `:prod` | wrangler, not drizzle-kit — it applies `migrations/` to that target |

Remote targets read `.drizzle.env` (copy `.drizzle.env.example`; gitignored). Only
`CLOUDFLARE_D1_API_TOKEN` is a secret — the database ids are already committed in
`wrangler.toml`. If a required value is missing the config throws instead of falling back, which
is the point: the old `drizzle.config.ts` chose local-vs-remote from `NODE_ENV === 'production'`,
and `db:studio:prod` never set `NODE_ENV`, so it took the local branch — whose idea of "find the
local database" was "scan all of `.wrangler` for the first `*.sqlite`". Measured on Linux
(`find .wrangler -name '*.sqlite'`): eight candidates across cache, d1, kv, r2, images and
observability stores, and the scan picked
`.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite` — miniflare's HTTP cache
metadata, not D1. So every studio command was browsing the wrong database, silently. Lookup is
now scoped to `.wrangler/state/v3/d1`, miniflare's per-resource `metadata.sqlite` files are
excluded, and more than one real candidate is an error that lists them (`LOCAL_D1_FILE` in
`.drizzle.env` picks one) rather than a guess by a command that can write.

Normal loop: edit `src/schema.ts` → `npm run db:generate` → **read the generated SQL** in
`migrations/` (renaming a column and adding a new one are different migrations, and drizzle-kit
picks) → `npm run db:migrate:local` → `npm run db:check` (also in CI) → `db:migrate:preview` →
`db:migrate:prod`. `db:pull:*` goes the other way and **overwrites** `src/schema.ts` and
`migrations/`, so only run it on a clean tree.

Two caveats for the local copy: it is gitignored, so a fresh clone (or a `rm -rf .wrangler`)
starts empty and needs `npm run db:migrate:local` before anything can query it — I checked the
local state today and all three migrations are recorded there (`d1_migrations`: 0000, 0001,
0002; `user` has `id,username,created_dt,modified_dt,deleted_dt`, 0 rows), but I did not find any
code that applies migrations automatically at dev-server start, so don't count on it. And local
SQLite is not byte-for-byte D1: verify a migration against preview before production.

Nothing in `src/` queries `env.DB` yet. `npm run cf:types` types the binding for you
(`worker-configuration.d.ts` declares `DB: D1Database` on `Env`), and `drizzle-orm/d1` is already
a dependency if you want the query builder; `env.DB.prepare(...).run()` needs no ORM at all.

## 🔎 Dependency security

- `npm run audit:prod` / `npm run audit:all` — the production tree is what matters for deploy.
- `package.json` `overrides` pin two transitive packages that upstream release lines do not:
  `postcss-selector-parser` (pinned exactly by `@tailwindcss/typography`) and `esbuild`
  (pinned low by the unmaintained `@esbuild-kit/*` chain inside `drizzle-kit`). Remove an
  override only when the upstream package ships a fixed release.
- `npm install` reports packages with install scripts (`npm install-scripts ls`). Review and
  `npm install-scripts approve` them deliberately rather than blanket-approving. Approvals are
  pinned to an exact version in `allowScripts`, so a dependency bump re-opens the gate.
- `npm run audit:gate` is the CI gate: it fails on anything not explicitly allowlisted in
  `scripts/audit-gate.ts`, where each tolerated advisory carries the reason and the condition
  for removing it (today: the three `deepmerge` lows reached through `@astrojs/svelte`, which
  have no upstream fix — `npm audit fix --force` would downgrade `@astrojs/svelte` to 0.1.2).

## 🎨 Customization

Tailwind 4 has no JS config file. Theme tokens live in [`src/styles/global.css`](./src/styles/global.css)
under `@theme` — currently `--color-book-gray` (Footer + social icons) and `--color-book-theme`
(the `::selection` and `.underline` accents in [`Layout.astro`](./src/layouts/Layout.astro)).
That token is the only source of truth for the accent colour: `src/config.json` also carries a
`theme.color` hex, but nothing reads it. `npm run check:classes` fails if markup uses a utility
whose token has been dropped, which is what makes it safe to add or remove a token here.

## 🤖 Agent skills

`.agents/skills/` holds project skills (Astro, Svelte, and frontend-design guidance) that
any Agent-Skills-compatible assistant — including Pi — loads on demand.

Two kinds, and the distinction matters when updating them:

- **Lock-managed** (`skills-lock.json`, reinstallable with `npx skills add <owner>/<repo>` and
  restorable with `npx skills experimental_install`): the ten design skills from
  `MaxPrehoda/motif`, `svelte-code-writer` and `svelte-core-bestpractices` from
  `sveltejs/ai-tools`, and `code-review-and-quality` from `addyosmani/agent-skills`.
- **Local only** (adapted for this repo, deliberately not in the lock, so an upstream update
  cannot silently overwrite the adaptation): `astro` and `frontend-design`. Diff them against
  their sources by hand if you want to pull upstream changes.

## 🔍 SEO

- Rich Results Test: https://search.google.com/test/rich-results
- https://developers.facebook.com/tools/debug/

## ☕ Supporters

If you want to support this project, you can ☕ [**buy a coffee here**](https://buymeacoff.ee/candidosales)
