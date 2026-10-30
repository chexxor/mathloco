/**
 * probe:cpu - deploy the built artifact as a THROWAWAY Worker so per-request CPU can be measured
 * on the real Workers runtime before anything of yours is promoted.
 *
 * Why this exists: the free plan allows **10 ms CPU per HTTP request** and returns error 1102 past
 * it, and the only place this rig ever saw the number was `wrangler tail` on a deployed Worker.
 * Bundle bytes are the proxy you can check locally (`npm run check:deploy` budgets them); this is
 * the measurement. A Preview cannot be tailed: `wrangler tail <worker>` only streams the promoted
 * version, and `wrangler tail <preview-name>` says "This Worker does not exist" [code: 10007].
 *
 * What is safe here, and why each difference from production is deliberate:
 *   - new name, `routes` removed   -> the apex is never attached to a probe
 *   - KV + D1 repointed at PREVIEW namespaces -> a probe cannot write what visitors read
 *   - no `previews` block          -> the real Preview base config is untouched
 *   - secrets are NOT copied: set them explicitly on the probe name, then delete the Worker
 *
 * Measured on 2026-10-30 with this branch's artifact (probe bound to the preview KV, both secrets set):
 *   cold isolate, KV miss (live Discord + Claude): cpu 8 ms   wall 1983 ms   (was 13 ms with the SDKs)
 *   10 requests, KV warm: cpu 0-1 ms wall ~1 ms each, except one at cpu 5 ms wall 10 ms - read that one
 *     as a fresh isolate paying module evaluation, which is the shape of a burst after traffic goes quiet
 *   `GET /`, `/chat/`, `/favicon.svg`: no tail entries at all - static assets are served without
 *     invoking the Worker, which is why prerendering is a budget lever as well as a latency one.
 *
 * Recipe (all three, in order - leaving the probe up costs a free-plan Worker slot and a public URL):
 *   npm run probe:cpu                                        # writes dist/server/wrangler.probe.json + deploys
 *   npx wrangler secret put DISCORD_TOKEN --name mmbc-cpu-probe    # pipe the value in; never echo it
 *   npx wrangler secret put CLAUDE_API_KEY --name mmbc-cpu-probe
 *   npx wrangler tail mmbc-cpu-probe --format json          # cpuTime / wallTime are top-level keys
 *   npx wrangler delete mmbc-cpu-probe --force              # `delete` takes the name positionally; -y is not a flag here
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PROBE_NAME = 'mmbc-cpu-probe';
// Must match wrangler.toml [[previews.kv_namespaces]] / [[previews.d1_databases]].
const PREVIEW_KV = '8173e43e9bfb496d9cbe21d8e4e38318';
const PREVIEW_D1 = 'b58d56c1-6aa6-4108-a1c3-91b5e9dbbcb7';

const src = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));

const probe = {
  ...src,
  name: PROBE_NAME,
  routes: undefined,
  previews: undefined,
  workers_dev: true,
  kv_namespaces: (src.kv_namespaces ?? []).map((ns) => ({ ...ns, id: PREVIEW_KV })),
  d1_databases: (src.d1_databases ?? []).map((db) => ({ ...db, database_id: PREVIEW_D1 })),
};
for (const [k, v] of Object.entries(probe)) if (v === undefined) delete probe[k];

writeFileSync('dist/server/wrangler.probe.json', JSON.stringify(probe, null, 2) + '\n');
console.log(
  `wrote dist/server/wrangler.probe.json\n` +
    `  name    ${probe.name} (routes removed, workers_dev true)\n` +
    `  kv      ${JSON.stringify(probe.kv_namespaces)}\n` +
    `  d1      ${JSON.stringify(probe.d1_databases?.map((d) => d.database_id))}\n` +
    `  main    ${probe.main}   assets ${probe.assets?.directory}\n` +
    `then: npx wrangler deploy --config dist/server/wrangler.probe.json  (npm run probe:cpu does both)`,
);
