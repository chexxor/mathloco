# Minneapolis Math Book Club - Astro + Tailwind + Cloudflare Pages

## 🎯 Features

- ✅ [Astro 7](https://astro.build/) with the [Cloudflare Pages adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) (server output, D1 bindings, workerd dev server);
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
   `"engines"` is **not** supported: `engines.node` below is a local guard, not the Pages lever.
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
| `npm run verify`             | **The whole gate set in one command**: `check` · `check:classes` · `db:check` · `check:sanitize` · `check:cache` · `audit:gate` · `build`. CI runs this; the Pages build command should be `npm ci && npm run verify` so all three paths are identical |
| `npm run cf:types`           | Regenerate `worker-configuration.d.ts` from `wrangler.toml` (`wrangler types`) |
| `npm run cf:secrets:list`    | List the secrets configured for the deployed Pages project    |
| `npm run cf:kv:create`       | Create the optional `SUMMARY_CACHE` KV namespace              |

`.github/workflows/ci.yml` runs **`npm run verify`** on every pull request and on pushes to `main`.
It is the only place these gates run automatically, and it gates nothing by itself — a red Actions run
does not stop Cloudflare Pages, which runs the dashboard build command and ignores Actions. To make a
red gate stop a deployment, either set the Pages build command to `npm ci && npm run verify` or enable
branch protection requiring the `verify` check before merge. `check:discord` and `check:ai` are excluded
from every automated run: they need credentials and `check:ai` spends a paid model call, so they are
pre-deploy rituals you run by hand.

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
- **Deployed (Cloudflare Pages):** secrets are set per Pages project, so the name is required:
  `npx wrangler pages secret put DISCORD_TOKEN --project-name <pages-project>` and the same for
  `CLAUDE_API_KEY`. Note `wrangler secret put` without `pages` targets a **Worker**, not Pages —
  different resource, and it will not do anything to this site.
- **Bindings** (D1, and the optional KV) live in `wrangler.toml`. Run `npm run cf:types` after
  changing it, so `worker-configuration.d.ts` is regenerated — bindings are typed there, while
  secrets/vars stay declared in `src/env.d.ts`.
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
