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

1. **Install** — `npm install`. On a fresh machine npm will report install scripts it has not
   run yet (`npm install-scripts ls`); the approved set is recorded in `allowScripts` in
   `package.json`, so a normal `npm ci` needs no interaction. Note that `better-sqlite3` v13
   ships prebuilt binaries, so no C++ toolchain is required.
2. **Secrets** — `cp .dev.vars.example .dev.vars` and fill in the three values (each line in
   that example file says where the value comes from). `.dev.vars` is gitignored, and the dev
   server reloads when you change it.
3. **Pre-flight** — `npm run check:discord`. It uses the same credentials the app uses and tells
   you, before you open a browser, whether the bot is a member of the configured guild, whether
   Discord is withholding message text (the Message Content Intent trap), and which guild ids the
   token can actually see. `DISCORD_GUILD_ID` must be the **server** id — pasting the bot's own
   Application ID is the single most common failure and shows up as `10004 "Unknown Guild"`.
4. **Local database** — `npm run db:migrate:local`. This creates the local D1 SQLite file under
   `.wrangler/state/v3/d1/`; `drizzle.config.ts` and `scripts/find-db.js` look it up there.
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
| `npm run start:functions`    | Starts the Wrangler Pages dev server against `dist`           |
| `npm run build`              | Builds the production site to `./dist/`                       |
| `npm run preview`            | Preview the build locally with the `--host` flag              |
| `npm run check`              | `astro check` — types, config and template diagnostics        |
| `npm run check:sanitize`     | Adversarial checks for the Discord summary render path        |
| `npm run check:discord`      | Discord/credential pre-flight: guild access, message content, key shape |
| `npm run check:cache`        | Summary-cache rules against a fake KV namespace (`-- --live` for live cases) |
| `npm run astro -- <cmd>`     | Run Astro CLI commands                                        |
| `npm run db:generate`        | Generate Drizzle migrations                                   |
| `npm run db:migrate:local`   | Apply migrations to the local D1 copy                         |
| `npm run db:migrate:preview` | Apply migrations to the preview database                      |
| `npm run db:migrate:prod`    | Apply migrations to production                                |
| `npm run db:studio:local`    | Drizzle Studio against the local D1 copy                      |
| `npm run audit:all`          | `npm audit` for prod + dev dependencies                       |
| `npm run audit:prod`         | `npm audit --omit=dev` (what actually ships)                  |
| `npm run audit:gate`         | Audit that fails only on advisories outside the documented allowlist (what CI runs) |
| `npm run cf:types`           | Regenerate `worker-configuration.d.ts` from `wrangler.toml` (`wrangler types`) |
| `npm run cf:secrets:list`    | List the secrets configured for the deployed Worker           |
| `npm run cf:kv:create`       | Create the optional `SUMMARY_CACHE` KV namespace              |

`.github/workflows/ci.yml` runs `check`, `build`, `check:sanitize` and `audit:gate` on every
pull request and on pushes to `main`.

## 🔐 Environment

Secrets and variables are read through `import { env } from 'cloudflare:workers'`, typed in
`src/env.d.ts` (`Cloudflare.Env`), and supplied per environment:

| Name | Where to get it | Notes |
| :-- | :-- | :-- |
| `DISCORD_TOKEN` | Discord Developer Portal → your application → **Bot → Reset Token** | The bot must be a member of the server, with **View Channels** + **Read Message History**, and **Message Content Intent** must be enabled in the portal or `content` comes back empty. |
| `DISCORD_GUILD_ID` | Discord desktop app: Settings → Advanced → Developer Mode, then right-click the server → *Copy Server ID* | Plain numeric ID; also used as the cache key. |
| `CLAUDE_API_KEY` | console.anthropic.com → Settings → API Keys | |
| `CLAUDE_MODEL` | optional | Defaults to `claude-haiku-5-5` (`src/lib/claude.ts`). |

- **Local:** put them in `.dev.vars` (gitignored). Wrangler-style per-environment files
  (`.dev.vars.preview`) also work.
- **Deployed:** `npx wrangler secret put DISCORD_TOKEN` (and `--env preview` for the preview
  environment), or the Cloudflare dashboard.
- **Bindings** (D1, and the optional KV) live in `wrangler.toml`. Run `npm run cf:types` after
  changing it, so `worker-configuration.d.ts` is regenerated — bindings are typed there, while
  secrets/vars stay declared in `src/env.d.ts`.
- **Optional KV cache:** `npm run cf:kv:create`, paste the printed `id`/`preview_id` into the
  commented `[[kv_namespaces]]` block in `wrangler.toml`, uncomment it, then `npm run cf:types`.
  Without it the Discord summaries are cached per isolate only, so each cold start re-fetches
  Discord and re-pays Claude.

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
under `@theme` — `book-yellow`, `book-gray`, `book-theme` colours and the `font-sans` /
`font-body` families. `$math-theme-color` in [`Layout.astro`](./src/layouts/Layout.astro)
is the selection/underline accent.

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
