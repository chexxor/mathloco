---
name: astro
description: Skill for building with the Astro web framework in this repo (Astro 7 + @astrojs/cloudflare Workers adapter + Svelte 5 islands + Tailwind 4 via @tailwindcss/vite + Drizzle/D1). Helps create Astro components and pages, configure SSR adapters, set up content collections, deploy static or server-rendered sites, and manage project structure and CLI commands. Use when the user needs to work with Astro, mentions .astro files, asks about SSG/islands architecture, content collections, API routes, D1/Cloudflare runtime env, or deploying this Astro project.
license: MIT
metadata:
  authors: "Astro Team (upstream), adapted for mathloco"
  upstream: "https://github.com/astrolicious/agent-skills/blob/main/skills/astro/SKILL.md"
  version: "0.0.2"
---

# Astro Usage Guide

**Always consult [docs.astro.build](https://docs.astro.build) for code examples and latest API.**
Astro releases often move APIs between integrations and core, so verify against the version
installed in `package.json` before writing config code.

Astro is the web framework for content-driven websites.

---

## Quick Reference

### File Location

CLI looks for `astro.config.js`, `astro.config.mjs`, `astro.config.cjs`, and `astro.config.ts` in: `./`. Use `--config` for custom path.

### CLI Commands

- `npx astro dev` - Start the development server.
- `npx astro build` - Build your project and write it to disk.
- `npx astro check` - Check your project for errors (requires `@astrojs/check` + `typescript` as devDependencies).
- `npx astro add` - Add an integration.
- `npx astro sync` - Generate TypeScript types for all Astro modules.

**Re-run `npx astro sync` after adding/changing plugins or integrations.**

In this repo, prefer the npm scripts: `npm run dev`, `npm run build`, `npm run check`,
`npm run astro -- <command>`.

### Project Structure

Reference [project structure docs](https://docs.astro.build/en/basics/project-structure).

- `src/*` - Project source code (components, pages, styles, images, etc.)
- `src/pages` - **Required.** Defines all pages and routes.
- `src/components` - Components (convention, not required).
- `src/layouts` - Layout components (convention, not required).
- `src/styles` - CSS/Sass files (convention, not required). Global Tailwind entry: `src/styles/global.css`, imported once from `src/layouts/Layout.astro`.
- `src/lib` - Server-side helpers (safe to import secrets/env here).
- `src/pages/api/*.ts` - API routes (`export const GET: APIRoute`).
- `public/*` - Non-code, unprocessed assets (fonts, icons, etc.); copied as-is to build output.
- `package.json` - Project manifest.
- `astro.config.{js,mjs,cjs,ts}` - Astro configuration file. (recommended)
- `tsconfig.json` - TypeScript configuration file. (recommended)

---

## Core Config Options

| Option | Notes |
|--------|-------|
| `site` | Your final, deployed URL. Used to generate sitemaps and canonical URLs. Set it; `@astrojs/sitemap` and canonical SEO tags depend on it. |
| `output` | `'static'` (default) or `'server'`. This repo uses `'server'` because API routes read Cloudflare env bindings. |
| `adapter` | Required for on-demand rendering. This repo: `@astrojs/cloudflare` with `platformProxy.enabled`. |
| `integrations` | Sitemap, Svelte, etc. Tailwind is **not** an integration here — see below. |
| `vite.plugins` | Where `@tailwindcss/vite` is registered. |

### This repo's `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://minneapolismathbookclub.com',
  integrations: [sitemap(), svelte()],
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'compile',
  }),
  vite: { plugins: [tailwindcss()] },
});
```

`imageService: 'compile'` is load-bearing, not cosmetic: the adapter's **default** routes `astro:assets`
through the Cloudflare **Images** binding at request time (the build log says so: "Enabling image
processing with Cloudflare Images … with the `IMAGES` Images binding") and copies the **unprocessed**
source into `dist/`. `compile` pre-renders variants at build time with sharp.

Do **not** re-add `@astrojs/tailwind`: it is deprecated, peer-limits Astro to `^3|^4|^5`,
and only supports Tailwind 3. Tailwind 4 is wired through `@tailwindcss/vite`, and theme
tokens live in `src/styles/global.css` under `@theme` (no `tailwind.config.*` file).

---

## Common Workflows

### Creating a Basic Page

Add a file to `src/pages/` — the filename becomes the route:

```astro
---
// src/pages/index.astro
const title = 'Hello, Astro!';
---
<html>
  <head><title>{title}</title></head>
  <body>
    <h1>{title}</h1>
  </body>
</html>
```

### Creating a Component

```astro
---
// src/components/Card.astro
const { title, body } = Astro.props;
---
<div class="card">
  <h2>{title}</h2>
  <p>{body}</p>
</div>
```

### API Route Reading Cloudflare Bindings

`env` comes from `import { env } from 'cloudflare:workers'`, not `import.meta.env` and not
`locals`. Never read `process.env` in edge code.

The adapter removes `Astro.locals.runtime` entirely (verified in
`node_modules/@astrojs/cloudflare/dist`: "`Astro.locals.runtime.env` has been removed in Astro
v6. Use `import { env } from "cloudflare:workers"` instead."). The other removals it reports:

| Removed | Use instead |
| :-- | :-- |
| `locals.runtime.env` | `import { env } from 'cloudflare:workers'` |
| `locals.runtime.cf` | `Astro.request.cf` |
| `locals.runtime.ctx` | `Astro.locals.cfContext` |
| `locals.runtime.caches` | the global `caches` object |

Bindings are typed in `worker-configuration.d.ts` (regenerate with `npm run cf:types` after
editing `wrangler.toml`); secrets and plain vars are declared on `Cloudflare.Env` in
`src/env.d.ts`.

```ts
// src/pages/api/example.ts
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async () => {
  const { results } = await env.DB.prepare('select id from posts').all();
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

Return generic error messages to clients; log details server-side only.

### Svelte Islands

Islands hydrate on the client; keep secrets and env access out of `.svelte` files.
Anything rendered from model/third-party content through `{@html}` must be sanitized first.

### Images and rendering (measured here — three switches, all required)

1. Import the file; **a string `src` is treated as remote** and silently skips optimization:
   `import heroImage from '../assets/math-group-image.jpg'`, then `<Image src={heroImage} … />`.
2. `imageService: 'compile'` on the adapter (above), or the build ships the raw source.
3. Under `output: 'server'`, a **server-rendered route emits no variants** — it needs
   `export const prerender = true`. `src/pages/index.astro` has it; `/chat` and the API routes do not.

Verify after any image change: `find dist/client/_astro -name '*<name>*'` for variant files and byte
sizes, and look for `generating optimized images … (before: 1715kB, after: 20kB)` in the build log. If
the page still points at the original filename, the pipeline never ran. Known gap: compile emitted a
single 900 px AVIF here — **no `srcset` ladder** yet.

### Deploying with an Adapter

This site's deploy target is **Cloudflare Workers** (`npm run deploy` = gates + `wrangler deploy`;
`npm run preview:deploy` for a branch Preview URL). It is *not* deployed by hand-running
`wrangler pages deploy`, and Pages cannot run this artifact's server side — see
"Deploy target" in `README.md` and `.notes/runbooks/pages-to-workers-migration.md`. The delegate never
**pushes git**; a production `wrangler deploy` is also the operator's, unless they have explicitly
told you to do it. Two things about deploying that are specific to this repo:

- **The apex is attached by a `routes` entry in `wrangler.toml`, and wrangler *replaces* triggers on
  every deploy.** Deploy from a config that lost that block and the domain detaches — a routine-looking
  command takes the live site down. `npm run check:deploy` (last step of `verify`) asserts the built
  `dist/server/wrangler.json` still carries the route, the assets root, the D1 ids and the Preview vars.
- A **custom domain** is refused while the hostname has a pre-existing record (`code: 100117`), which
  is why this site uses a route. Changing that is a DNS change, not a config change.

### The deploy pipeline, and the CPU budget that shapes this repo's code

The intended pipeline is a **Cloudflare repo hook** (Workers Builds), not GitHub Actions: its build
command is `npm run verify`, so a red gate cannot upload. Fields live at **Workers & Pages → the Worker →
Settings → Build**: **Git account / Git repository / Git branch** (branch defaults to the repo default),
then **Build command** / **Deploy command** / **Preview command** / **Root directory**, with preview builds
behind an **Enable Preview Builds** checkbox under **Branch control**. Leave Deploy command at its default
`npx wrangler deploy` and Preview command at its default `npx wrangler preview` — the latter is what reads
this file's `[previews]` block. Grounded facts: the build image **installs dependencies for you**
(`SKIP_DEPENDENCY_INSTALL=1` opts out), so the build command is `npm run verify`, not
`npm ci && npm run verify`; it preinstalls **Node.js 22.23.4** and reads `.nvmrc`/`.node-version`; it uses
the Wrangler version in `package.json`; free plan allows 3,000 build minutes/month, 1 concurrent build,
20-minute timeout, and `verify` measured **51 s cold / 32 s warm** in a clean clone; `npx wrangler versions
upload` as the deploy command builds without promoting. A Worker connected to Builds before Worker Previews
existed shows a **one-way** "Set up Worker Previews" banner. Connecting the repo needs the Cloudflare GitHub
App or a token with Workers Builds scope — a `wrangler login` token gets `code 10000` on
`/accounts/<id>/builds/*`.

`verify` is deliberately **credential-free**, which is what lets the hook run it with no build secrets: it
was validated by cloning this branch somewhere with no `.dev.vars`, no `.drizzle.env`, no `.wrangler/` and no
`dist/` — `npm ci` then `npm run verify` exited 0. `check:cache` falls back to fake credentials when
`.dev.vars` is absent, and `db:check` opens no database. `check:discord` and `check:ai` stay out of `verify`
because they need secrets (and `check:ai` spends a model call).

**Workers bill CPU per request: 10 ms on the free plan, error 1102 past it.** Waiting on `fetch` is free;
*evaluating the module* is not. That single constraint decides how code in `src/` is written here:

- **`src/` does not import service SDKs.** `@discordjs/rest` + `discord-api-types` + `@anthropic-ai/sdk`
  bundled into one route chunk of 1,439,951 B (of a 2,208,627 B server bundle) and a cold
  `/api/discord-summary` measured `cpu=13ms`. Both APIs are called with `fetch` in
  `src/lib/discord.ts`; the SDKs are dev tooling for `scripts/check-*.ts` only. Do not "modernise" this
  back to an SDK.
- `npm run check:deploy` enforces a byte budget (total ≤ 900,000 B, largest module ≤ 400,000 B) read from
  `dist/server/**`. If it goes red, `astro build`'s chunk list names the import that pulled it in.
- **How to get a real CPU number without shipping:** `npm run probe:cpu` deploys the artifact as a
  throwaway Worker (`mmbc-cpu-probe`, routes stripped, KV/D1 repointed at the *preview* namespaces) and
  `npx wrangler tail mmbc-cpu-probe --format json` reports top-level `cpuTime`/`wallTime`. Delete it after:
  `npx wrangler delete mmbc-cpu-probe --force` (name is positional; `-y` is not a flag there).
  Measured with this repo's artifact: cold isolate + KV miss **8 ms** (was 13 ms with the SDKs), ten
  KV-warm requests 0–1 ms with one fresh isolate at **5 ms**. So the ceiling is met with ~2 ms of margin —
  treat any new dependency in a route chunk as a CPU change, not just a size change.
  A **Preview cannot be tailed**: `wrangler tail <preview-name>` → "This Worker does not exist"
  [code: 10007], and a Preview's requests never appear in the production Worker's tail.
- **Static assets do not invoke the Worker here** — `GET /`, `/chat/` and `/favicon.svg` produced no tail
  entries at all, and those requests are the free-and-unlimited kind. Prerendering is therefore a budget
  lever, not only a latency one; conversely anything that pushes traffic through Worker code (a Cache
  Rule with `run_worker_first`, Workers Caching of assets) is what puts a free plan at risk of 1102.
- `check:deploy` also asserts Astro's manifest was actually injected into `entry.mjs`. A build here once
  exited 0 and passed every other check while `dist/server/entry.mjs` still contained
  `deserializeManifest("@@ASTRO_MANIFEST_REPLACE@@")`; `wrangler deploy` then refused it with
  `Uncaught TypeError: Invalid URL string … [code: 10021]`. Prove the gate works with
  `npm run falsify:manifest` (2 failures), restore with `npm run build`. **Mechanism confirmed by
  reproduction:** a build that died between the Vite chunk pass (it had printed `✓ built in 23.35s`) and
  Astro's manifest hook left exactly that artifact — `entry.mjs` 251,077 B with the token still in it, and an
  unfinished module graph of 29 chunks / 1,384,823 B that the byte-budget check also flagged. A killed build
  can also leave `entry.mjs` **absent** while `chunks/` and `wrangler.json` exist. So an interrupted build is
  a routine way to reach a broken `dist/`; after one, `rm -rf dist && npm run build` before believing it.
- The summary cache is **KV-bound** (`SUMMARY_CACHE`, and `SUMMARY_CACHE_PREVIEW` for Previews). Without
  it every cold isolate re-paid Discord + Claude (2.09 s) and the 7-day stale-grace path was dead code;
  with it a cold isolate reads KV in 0.037 s. Previews must keep their own namespace — shared id means
  shared rows, so a bad branch could poison live summaries.
- **There is no cron.** The Astro-generated entry exports no `scheduled` handler (checked by grepping
  `dist/server/*.mjs`), so a `triggers.crons` entry would invoke a handler that does not exist. Anything
  scheduled has to be a separate Worker, or run outside Cloudflare.

The local steps still apply:
1. Add the adapter: `npx astro add cloudflare --yes` (already present here)
2. Run `npx astro check` to catch type and configuration errors before building.
3. Run `npm run build` to produce the deployment artifact (`dist/`).
4. Verify `dist/` exists and is non-empty before proceeding.
5. Run D1 migrations for the target environment when `migrations/` changed — `npm run db:migrate:preview`
   / `db:migrate:prod` (targets are explicit per environment; see
   `.notes/runbooks/db-target-and-migrations.md`). `npm run db:check` in CI proves schema and
   migrations agree without any credentials.

---

## Adapters

Deploy to your favorite server, serverless, or edge host with build adapters. Use an adapter
to enable on-demand rendering in your Astro project.

**Add [Node.js](https://docs.astro.build/en/guides/integrations-guide/node) adapter using astro add:**
```
npx astro add node --yes
```

**Add [Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare) adapter using astro add:**
```
npx astro add cloudflare --yes
```

**Add [Netlify](https://docs.astro.build/en/guides/integrations-guide/netlify) adapter using astro add:**
```
npx astro add netlify --yes
```

**Add [Vercel](https://docs.astro.build/en/guides/integrations-guide/vercel) adapter using astro add:**
```
npx astro add vercel --yes
```

Adapter majors are coupled to Astro majors — when bumping Astro, bump the adapter in the same
change and check its peer range (`npm view @astrojs/cloudflare peerDependencies`).

[Other Community adapters](https://astro.build/integrations/2/?search=&categories%5B%5D=adapters)

## Resources

- [Docs](https://docs.astro.build)
- [Config Reference](https://docs.astro.build/en/reference/configuration-reference/)
- [llms.txt](https://docs.astro.build/llms.txt)
- [GitHub](https://github.com/withastro/astro)
