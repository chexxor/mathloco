# Minneapolis Math Book Club - Astro + Tailwind + Cloudflare Pages

## 🎯 Features

- ✅ [Astro 7](https://astro.build/) with the [Cloudflare Pages adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) (server output, D1 bindings, workerd dev server);
- ✅ [Tailwind 4](https://tailwindcss.com/) — CSS-first config, wired in through `@tailwindcss/vite`;
- ✅ [Svelte 5](https://svelte.dev/) islands (`src/components/*.svelte`);
- ✅ [Astro/Sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) (requires `site` in `astro.config.mjs`);
- ✅ [Drizzle ORM](https://orm.drizzle.team/docs/migrations) + Cloudflare D1;
- ✅ Claude (Anthropic SDK v1) summary of Discord channels at `/api/discord-summary`.

## 🧞 Commands

Run from the project root. `npm` is the package manager this branch was verified with
(`bun install` / `pnpm install` also work; `bun.lockb` is currently stale — regenerate it
with `bun install` if you use Bun).

| Command                      | Action                                                        |
| :--------------------------- | :------------------------------------------------------------ |
| `npm install`                | Installs dependencies                                         |
| `npm run dev`                | Starts the dev server at `localhost:3000` (`astro dev stop` to stop it) |
| `npm run start:app`          | Alternative way to start the dev server                       |
| `npm run start:functions`    | Starts the Wrangler Pages dev server against `dist`           |
| `npm run build`              | Builds the production site to `./dist/`                       |
| `npm run preview`            | Preview the build locally with the `--host` flag              |
| `npm run check`              | `astro check` — types, config and template diagnostics        |
| `npm run check:sanitize`     | Adversarial checks for the Discord summary render path        |
| `npm run astro -- <cmd>`     | Run Astro CLI commands                                        |
| `npm run db:generate`        | Generate Drizzle migrations                                   |
| `npm run db:migrate:local`   | Apply migrations to the local D1 copy                         |
| `npm run db:migrate:preview` | Apply migrations to the preview database                      |
| `npm run db:migrate:prod`    | Apply migrations to production                                |
| `npm run db:studio:local`    | Drizzle Studio against the local D1 copy                      |
| `npm run audit:all`          | `npm audit` for prod + dev dependencies                       |
| `npm run audit:prod`         | `npm audit --omit=dev` (what actually ships)                  |

## 🔐 Environment

Copy `.dev.vars.example` to `.dev.vars` for local development; production secrets live in
the Cloudflare dashboard. Bindings (D1, KV, Images) are configured in `wrangler.toml` and
typed by `worker-configuration.d.ts` — regenerate that file with `npx wrangler types` after
changing `wrangler.toml`. Variables and secrets are declared in `src/env.d.ts`
(`Cloudflare.Env`) and read with `import { env } from 'cloudflare:workers'`.

## 🔎 Dependency security

- `npm run audit:prod` / `npm run audit:all` — the production tree is what matters for deploy.
- `package.json` `overrides` pin two transitive packages that upstream release lines do not:
  `postcss-selector-parser` (pinned exactly by `@tailwindcss/typography`) and `esbuild`
  (pinned low by the unmaintained `@esbuild-kit/*` chain inside `drizzle-kit`). Remove an
  override only when the upstream package ships a fixed release.
- `npm install` reports packages with install scripts (`npm install-scripts ls`). Review and
  `npm install-scripts approve` them deliberately rather than blanket-approving.

## 🎨 Customization

Tailwind 4 has no JS config file. Theme tokens live in [`src/styles/global.css`](./src/styles/global.css)
under `@theme` — `book-yellow`, `book-gray`, `book-theme` colours and the `font-sans` /
`font-body` families. `$math-theme-color` in [`Layout.astro`](./src/layouts/Layout.astro)
is the selection/underline accent.

## 🤖 Agent skills

`.agents/skills/` holds project skills (Astro, Svelte, and frontend-design guidance) that
any Agent-Skills-compatible assistant — including Pi — loads on demand.

## 🔍 SEO

- Rich Results Test: https://search.google.com/test/rich-results
- https://developers.facebook.com/tools/debug/

## ☕ Supporters

If you want to support this project, you can ☕ [**buy a coffee here**](https://buymeacoff.ee/candidosales)
