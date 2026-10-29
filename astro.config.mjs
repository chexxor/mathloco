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
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
