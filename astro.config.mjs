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
