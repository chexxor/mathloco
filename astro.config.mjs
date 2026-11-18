import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import { NOINDEX_ROUTES } from './src/lib/index-rules.mjs';

// https://astro.build/config
export default defineConfig({
  // Keep in sync with `seo.canonical` in src/config.json; required for @astrojs/sitemap
  // and for canonical/OG URLs. This is the host the sitemap’s <loc> entries carry, so after the 2026-11-07
  // cutover to matheapolis.com a stale value here publishes the legacy apex as the canonical URL of every page —
  // the one inconsistency in a domain move that a 301 cannot undo. Nothing in the gate set reads the host in
  // <loc>, so this comment is the only thing keeping the two apexes in step.
  site: 'https://matheapolis.com',
  // Round-7 communication review (2026-11-18), `/past` indexability. D404 already put a
  // `noindex,nofollow` meta tag on `/past` while its shelf is empty; the sitemap still published a
  // `<loc>` for it, so the artifact told a crawler both — the class D245 names, an artifact whose parts
  // disagree while every gate reading those parts stays green. The integration's own `filter` (the only
  // option in its schema that can see more than a literal path list: node_modules/@astrojs/sitemap/dist/
  // schema.js exposes `filter`, not a per-page opt-out) reads `NOINDEX_ROUTES`, the same list the page
  // reads for its meta tag, so the two cannot be edited apart and `/past` re-enters the sitemap in the
  // same commit that drops it from the list (the trigger is written in that module).
  integrations: [
    sitemap({
      filter: (loc) => !NOINDEX_ROUTES.includes(new URL(loc).pathname.replace(/\/+$/, '') || '/'),
    }),
    svelte(),
  ],
  // D408 (round-6 communication review, `/dates`/Add: "a redirect `/schedule` → `/dates`… It 404s today. Old
  // links, bookmarks and any past brief that named it now dead-end"). The route moved on D373 and the sweep left
  // the old name answering the site's 404, so the one URL that has ever been published is the one that dead-ends.
  // A 301 rather than a meta refresh or a second page: the old name has to answer with the new one for a client,
  // a crawler and a bookmark alike, and a redirect page would be a second route promising a page that does not
  // exist. Verified against this config @measured 2026-11-17 by `curl -i` against `npm run preview`'s dev server
  // and against the built artifact (see the reply doc for what the artifact ships).
  redirects: {
    '/schedule': { status: 301, destination: '/dates' },
  },
  output: 'server',
  // Nothing in this app reads Astro sessions, but @astrojs/cloudflare v14 enables a KV-backed session
  // driver unless this is explicitly false (node_modules/@astrojs/cloudflare/dist/index.js:85). Left on,
  // it injects `"kv_namespaces":[{"binding":"SESSION"}]` with no namespace id into the deploy artifact,
  // ships a session-driver chunk, and opens a KV write surface against the free plan's 1,000 writes/day
  // ceiling. Turn it off until something actually needs a session.
  session: false,
  adapter: cloudflare({
    // `compile` transforms with sharp at build time. The adapter's default instead routes
    // astro:assets through the Cloudflare Images `IMAGES` binding at request time, which ships the
    // 1,756,478-byte source and makes every image on the site depend on an Images subscription we
    // have not verified on this account. Build-time variants need no runtime binding.
    imageService: 'compile',
    platformProxy: {
      enabled: true,
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
