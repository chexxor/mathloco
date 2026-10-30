import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  // Keep in sync with `seo.canonical` in src/config.json; required for @astrojs/sitemap
  // and for canonical/OG URLs.
  site: 'https://www.minneapolismathbookclub.com',
  integrations: [sitemap(), svelte()],
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
