/**
 * check:deploy - assert the built artifact is still a deployable Workers config for THIS host.
 *
 * Why this exists is a measured failure, not a hypothesis. Wrangler **replaces** a Worker's
 * triggers on every deploy: `wrangler deploy` from a config that has no `routes` block does not
 * leave the domain alone, it detaches it. So a missing line in `wrangler.toml` is a command that
 * looks routine and takes the live site down. The route itself was chosen because a custom domain
 * is refused while the hostname has a pre-existing record:
 *   "Hostname 'minneapolismathbookclub.com' already has externally managed DNS records
 *    (A, CNAME, etc). Delete them first or try a different hostname. [code: 100117]"
 *
 * This gate reads what `astro build` actually emitted - `dist/server/wrangler.json`, the file
 * wrangler is told to deploy via `.wrangler/deploy/config.json` - not the TOML it was derived
 * from, because the two have already been observed to disagree (the adapter silently drops keys
 * it does not know, e.g. `pages_build_output_dir`).
 *
 * The expectations below are deliberately duplicated from `wrangler.toml`. That is the point: a
 * rename that only touches one side goes red here instead of red on the apex.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACT = resolve(process.cwd(), 'dist/server/wrangler.json');

// The deploy contract. Change these together with wrangler.toml, never one without the other.
const EXPECTED = {
  workerName: 'minneapolis-math-book-club',
  apex: 'minneapolismathbookclub.com',
  routePattern: 'minneapolismathbookclub.com/*',
  prodDb: 'd1-mathloco-prod-db',
  previewDb: 'd1-mathloco-preview-db',
  guildId: '1170385683379126343', // the SERVER id; the bot's app id yields 10004 "Unknown Guild"
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Config = Record<string, unknown>;

const failures: string[] = [];
const passed: string[] = [];

function check(ok: boolean, label: string, remedy: string) {
  if (ok) passed.push(label);
  else failures.push(`${label}\n      fix: ${remedy}`);
}

if (!existsSync(ARTIFACT)) {
  console.error(`check:deploy - no ${ARTIFACT}`);
  console.error('  the artifact does not exist; run `npm run build` first (verify builds last, so');
  console.error('  inside `npm run verify` this cannot happen unless the build itself failed).');
  process.exit(1);
}

const config = JSON.parse(readFileSync(ARTIFACT, 'utf8')) as Config;
const routes = (config.routes ?? []) as { pattern?: string; zone_name?: string }[];
const kv = (config.kv_namespaces ?? []) as { binding?: string; id?: string }[];
const d1 = (config.d1_databases ?? []) as {
  binding?: string;
  database_name?: string;
  database_id?: string;
  preview_database_id?: string;
}[];
const assets = (config.assets ?? {}) as { directory?: string; binding?: string };
const previews = (config.previews ?? {}) as {
  vars?: Record<string, unknown>;
  d1_databases?: { database_name?: string; database_id?: string }[];
};
const vars = (config.vars ?? {}) as Record<string, unknown>;
const flags = (config.compatibility_flags ?? []) as string[];

// 1. The route. Losing this is a production outage, so it is checked first and named loudly.
check(
  routes.some((r) => r.pattern === EXPECTED.routePattern),
  `route ${EXPECTED.routePattern} present`,
  `wrangler replaces triggers on deploy, so a config without this route DETACHES the apex. Add back
       routes = [{ pattern = "${EXPECTED.routePattern}", zone_name = "${EXPECTED.apex}" }]
     to wrangler.toml, or do not deploy this config.`,
);

// 2. Dead-end deploy shapes we already tried and refuted.
check(
  !('pages_build_output_dir' in config),
  'no pages_build_output_dir (Pages-only key; Astro drops it, and Pages cannot run this artifact)',
  'remove the key; the Workers equivalent is assets.directory, which the adapter already sets',
);

check(
  typeof assets.directory === 'string' && assets.directory.includes('client') && assets.binding === 'ASSETS',
  `assets served from ${String(assets.directory)} as ${String(assets.binding)}`,
  'the adapter must emit assets.directory pointing at dist/client; a wrong root is what made the ' +
    'Pages preview serve routes that did not exist',
);

check(config.workers_dev === true, 'workers_dev = true (the domain-free review URL)', 'set workers_dev = true in wrangler.toml');

check(
  kv.length === 0,
  `kv_namespaces empty (got ${kv.map((k) => `${k.binding}${k.id ? `#${k.id}` : ' NO ID'}`).join(', ') || 'nothing'})`,
  '@astrojs/cloudflare 14 injects an id-less SESSION KV binding unless the adapter config sets ' +
    "session: false. Nothing here uses sessions. If you have deliberately added SUMMARY_CACHE, add " +
    'it to this gate with its namespace id.',
);

const prodBinding = d1.find((d) => d.binding === 'DB');
check(
  !!prodBinding && prodBinding.database_name === EXPECTED.prodDb && UUID.test(String(prodBinding.database_id)),
  `D1 binding DB -> ${prodBinding ? `${prodBinding.database_name} / ${prodBinding.database_id}` : 'missing'}`,
  'a UUID here is the difference between a binding and a guess; `wrangler d1 list` prints the real ids',
);

// A binding name in a UUID slot was in this file once. It is worse than useless: wrangler keys its
// local miniflare database by the ids, so local migrate/dev/studio silently open a different file.
check(
  !prodBinding?.preview_database_id || UUID.test(prodBinding.preview_database_id),
  `preview_database_id ${prodBinding?.preview_database_id ? `= ${prodBinding.preview_database_id}` : 'unset'}`,
  'preview_database_id must be a UUID or absent. A binding name there (it was literally "DB") ' +
    'moves which local .sqlite file every db:* command reads and writes.',
);

const previewD1 = (previews.d1_databases ?? []).find((d) => d.database_name === EXPECTED.previewDb);
check(!!previewD1, `previews bind D1 to ${EXPECTED.previewDb}`, 'Previews inherit nothing from production settings; ' +
  'a Preview sharing the prod database_id shares prod rows. Add [[previews.d1_databases]].');
check(
  previews.vars?.DISCORD_GUILD_ID === EXPECTED.guildId,
  `previews.vars.DISCORD_GUILD_ID = ${String(previews.vars?.DISCORD_GUILD_ID)}`,
  'vars is not inherited by Previews (wrangler schema). A Preview without the guild id answers ' +
    'the summary route with the generic 502 and looks like an upstream outage.',
);
check(
  vars.DISCORD_GUILD_ID === EXPECTED.guildId,
  `vars.DISCORD_GUILD_ID = ${String(vars.DISCORD_GUILD_ID)}`,
  'production lost its summary for months because this value lived in a dashboard field and was ' +
    'set to the bot app id. It is a public snowflake; keep it in wrangler.toml.',
);

check(flags.includes('nodejs_compat'), `nodejs_compat in compatibility_flags (${flags.join(', ') || 'none'})`,
  '@anthropic-ai/sdk and @discordjs/rest need Node APIs; wrangler v4 removed the old node_compat key');

check(typeof config.main === 'string' && config.main.endsWith('entry.mjs'), `worker entrypoint = ${String(config.main)}`,
  'the adapter emits entry.mjs; if this changed, the artifact shape changed with it');

console.log(`check:deploy - ${ARTIFACT}`);
for (const p of passed) console.log(`  ok   ${p}`);
if (failures.length) {
  console.log('');
  for (const f of failures) console.log(`  FAIL ${f}`);
  console.log(`\n${failures.length} deploy-contract failure(s). Nothing was deployed by this command,`);
  console.log('but deploying this artifact would not be the deploy you think it is.');
  process.exit(1);
}
console.log(`\n${passed.length} checks passed: this artifact is deployable on ${EXPECTED.apex}.`);
