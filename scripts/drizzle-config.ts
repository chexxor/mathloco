// Shared drizzle-kit config factory.
//
// Why this exists: the previous single drizzle.config.ts picked local-vs-remote from
// `process.env.NODE_ENV === 'production'`, and the npm scripts that meant to reach a remote
// database (`db:studio:preview`, `db:studio:prod`) never set NODE_ENV. So every studio command
// took the *local* branch, and the local branch found the local database by scanning all of
// `.wrangler` for the first file ending in `.sqlite`. On this rig that scan returns
// `.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite` - miniflare's HTTP cache
// metadata, not D1. Measured with `find .wrangler -name '*.sqlite'`: 8 candidates, spanning
// cache, d1, kv, r2, images and observability stores.
//
// So the target is now an explicit argument (one config file per target, selected with
// `drizzle-kit --config`), the local file is looked up only under the D1 directory, and a remote
// target refuses to start when a credential is missing instead of quietly falling back to a
// local file.

import fs from 'node:fs';
import path from 'node:path';
import type { Config } from 'drizzle-kit';

export type DbTarget = 'local' | 'preview' | 'prod';

const SCHEMA = './src/schema.ts';
const OUT = './migrations';

/**
 * Load KEY=VALUE lines from a dotenv file without adding a dependency, and without needing
 * `source .drizzle.env` in an npm script (`source` does not exist in cmd.exe or PowerShell, and
 * this rig runs on both). Vars already in the environment win, so a one-off
 * `DB_ID=... npm run db:studio:prod` still overrides the file.
 */
function loadEnvFile(file: string): void {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) return;
  for (const raw of fs.readFileSync(resolved, 'utf-8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

/**
 * The SQLite file wrangler/miniflare keeps local D1 state in.
 *
 * Scoped to `.wrangler/state/v3/d1` rather than all of `.wrangler`, and `metadata.sqlite` is
 * excluded because miniflare writes one of those per resource type - including inside the D1
 * directory itself, alongside the real database file. If more than one real candidate exists
 * (a second binding, or a second env), guessing is not acceptable for a command that can write,
 * so it errors and lists them; `LOCAL_D1_FILE` in `.drizzle.env` picks one explicitly.
 */
export function localD1File(): string {
  loadEnvFile('.drizzle.env');
  if (process.env.LOCAL_D1_FILE) return path.resolve(process.env.LOCAL_D1_FILE);

  const root = path.resolve('.wrangler', 'state', 'v3', 'd1');
  if (!fs.existsSync(root)) {
    throw new Error(
      `No local D1 state at ${root}. Start the dev server once (npm run dev), or run `
        + '`npm run db:migrate:local`, to create it.',
    );
  }

  const found = (fs.readdirSync(root, { encoding: 'utf-8', recursive: true }) as unknown as string[])
    .map((f) => String(f))
    .filter((f) => f.endsWith('.sqlite') && path.basename(f) !== 'metadata.sqlite')
    .map((f) => path.resolve(root, f))
    .sort();

  if (found.length === 0) {
    throw new Error(
      `No local D1 database file under ${root}. Run '` + '`npm run db:migrate:local` to create one.',
    );
  }
  if (found.length > 1) {
    throw new Error(
      'More than one local D1 file; refusing to guess which one to open or write:\n' +
        found.map((f) => `  ${f}`).join('\n') +
        '\nSet LOCAL_D1_FILE in .drizzle.env to one of them.',
    );
  }
  return found[0];
}

// (LOCAL_D1_FILE, if set in .drizzle.env, is honoured by localD1File() above.)

export function drizzleCheckConfig(): Config {
  return { schema: SCHEMA, out: OUT, dialect: 'sqlite' };
}

export function drizzleConfig(target: DbTarget): Config {
  loadEnvFile('.drizzle.env');


  if (target === 'local') {
    const url = localD1File();
    console.log(`[drizzle] target: local (SQLite) -> ${url}`);
    return { schema: SCHEMA, out: OUT, dialect: 'sqlite', dbCredentials: { url } };
  }

  const idVar = target === 'prod' ? 'DB_ID' : 'PREVIEW_DB_ID';
  const required = ['CLOUDFLARE_D1_ACCOUNT_ID', 'CLOUDFLARE_D1_API_TOKEN', idVar];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Cannot open the ${target} D1 database - these are unset (in the environment or .drizzle.env): ` +
        missing.join(', ') +
        `\nCopy .drizzle.env.example to .drizzle.env and fill them in. ` +
        `The ids are already in wrangler.toml; only the API token is a secret.`,
    );
  }

  const databaseId = process.env[idVar] as string;
  console.log(
    `[drizzle] target: ${target} (D1, d1-http) -> account ${process.env.CLOUDFLARE_D1_ACCOUNT_ID}, ` +
      `database ${databaseId} (${target === 'prod' ? 'd1-mathloco-prod-db' : 'd1-mathloco-preview-db'})`,
  );

  return {
    schema: SCHEMA,
    out: OUT,
    dialect: 'sqlite',
    driver: 'd1-http',
    dbCredentials: {
      accountId: process.env.CLOUDFLARE_D1_ACCOUNT_ID as string,
      databaseId,
      token: process.env.CLOUDFLARE_D1_API_TOKEN as string,
    },
  };
}
