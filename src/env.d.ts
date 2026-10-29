/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />
/// <reference types="@astrojs/cloudflare" />

/**
 * Secrets and plain-text variables for this Worker.
 *
 * Bindings (D1, KV, Images, …) are generated into worker-configuration.d.ts by
 * `npx wrangler types`; the values below are set in the Cloudflare dashboard (or
 * `.dev.vars` locally), so they are declared here. `Cloudflare.Env` is the type of the
 * `env` object exported by `cloudflare:workers`.
 */
declare namespace Cloudflare {
  interface Env {
    DISCORD_TOKEN: string;
    DISCORD_GUILD_ID: string;
    CLAUDE_API_KEY: string;
    CLAUDE_MODEL?: string;
  }
}
