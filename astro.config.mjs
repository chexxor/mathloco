import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sitemap(), svelte()],
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  })
});
