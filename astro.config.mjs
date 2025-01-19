import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import partytown from '@astrojs/partytown';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sitemap(), partytown(), svelte()],
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  })
});
