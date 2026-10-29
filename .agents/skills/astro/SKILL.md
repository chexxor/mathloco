---
name: astro
description: Skill for building with the Astro web framework in this repo (Astro 7 + @astrojs/cloudflare Pages adapter + Svelte 5 islands + Tailwind 4 via @tailwindcss/vite + Drizzle/D1). Helps create Astro components and pages, configure SSR adapters, set up content collections, deploy static or server-rendered sites, and manage project structure and CLI commands. Use when the user needs to work with Astro, mentions .astro files, asks about SSG/islands architecture, content collections, API routes, D1/Cloudflare runtime env, or deploying this Astro project.
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
  integrations: [sitemap(), svelte()],
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  vite: { plugins: [tailwindcss()] },
});
```

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

### Deploying with an Adapter

1. Add the adapter: `npx astro add cloudflare --yes` (already present here)
2. Run `npx astro check` to catch type and configuration errors before building.
3. Run `npm run build` to produce the deployment artifact (`dist/`).
4. Verify `dist/` exists and is non-empty before proceeding.
5. Deploy per the adapter's docs (`wrangler pages deploy dist`), and run D1 migrations
   with `npm run db:migrate:prod` / `db:migrate:preview` when `migrations/` changed.

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
