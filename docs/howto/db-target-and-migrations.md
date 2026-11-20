# Runbook: drizzle targets, local SQLite, D1 migrations

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/db-target-and-migrations.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

**Symptoms it covers:** Drizzle Studio shows tables you did not expect, or no `user` table;
"which database am I actually looking at?"; `src/schema.ts` or `migrations/` changed on their own;
a migration that applied locally but not in preview/production.

Measured on native Linux x86-64, Node 24.22.1, drizzle-kit 0.31.11, drizzle-orm 0.45.4,
better-sqlite3 13.0.3 (SQLite 3.53.4), 2026-10-29.

## Read this before running anything that can write

The target is chosen by **which config file you pass**, never by an environment guess:

| Command | Opens |
| :-- | :-- |
| `db:generate`, `db:check`, `db:studio:local`, `db:pull:local`, bare `npx drizzle-kit <cmd>` | `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` via `drizzle.config.ts` |
| `db:studio:preview`, `db:pull:preview` | `d1-mathloco-preview-db` over the D1 HTTP API via `drizzle.config.preview.ts` |
| `db:studio:prod`, `db:pull:prod` | `d1-mathloco-prod-db` over the D1 HTTP API via `drizzle.config.prod.ts` |
| `db:migrate:local` / `:preview` / `:prod` | wrangler applies `migrations/` to that target - drizzle-kit does not apply migrations here |

Remote configs read `.drizzle.env` (copy `.drizzle.env.example`) and **throw listing the missing
names** rather than falling back to a local file. That fallback used to exist: the old config chose
local-vs-remote from `NODE_ENV === 'production'`, the `:prod`/`:preview` scripts never set
`NODE_ENV`, and the local branch found "the local database" by scanning all of `.wrangler` for the
first `*.sqlite` - which returned
`.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite`, miniflare's HTTP cache metadata.
Eight `.sqlite` files exist under `.wrangler` (cache, d1, kv, r2, images, observability), so the
scan was a coin flip.

`db:pull:*` **overwrites** `src/schema.ts` and rewrites `migrations/`. Run it only on a clean tree,
and only after reading the first line the config prints: `[drizzle] target: ... -> ...`.

## Diagnose in this order

1. **Which file would the tool open?** It prints it on every run. To see it without starting studio:
   `npx tsx -e "console.log(require('./drizzle.config.ts').default.dbCredentials)"`
   Expect a path under `.wrangler/state/v3/d1/`. If it prints anything under `state/v3/cache`, or
   errors "More than one local D1 file", the lookup is ambiguous - set `LOCAL_D1_FILE` in
   `.drizzle.env` to the exact file.
2. **What is actually in the local file?** Read it without writing:
   ```bash
   node -e "const D=require('better-sqlite3');const db=new D(process.argv[1],{readonly:true,fileMustExist:true});
   console.log(db.prepare('select name from sqlite_master').all());
   console.log(db.prepare('select id,applied_at,name from d1_migrations order by id').all());" \
     .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite
   ```
   `d1_migrations` is wrangler's ledger. Known-good state today: rows 0000/0001/0002, `user` with
   `id,username,created_dt,modified_dt,deleted_dt`, 0 rows.
3. **Does wrangler agree the local copy is migrated?**
   `npx wrangler d1 migrations list d1-mathloco-prod-db --local` → "No migrations to apply!".
4. **Do the migration files agree with the schema?** `npm run db:check` (uses
   `drizzle.config.check.ts`: no credentials, opens no database, so it runs in CI with no
   `.wrangler` state).
5. **Migration applied locally but not remotely?** Local state is gitignored - a fresh clone or
   `rm -rf .wrangler` starts empty and needs `npm run db:migrate:local`. I found no code that
   applies migrations at dev-server start (the generated `dist/server/wrangler.json` does carry
   `migrations_dir: ../../migrations`, so check whether newer adapter versions auto-apply before
   assuming they do not).

## Loop for a schema change

Edit `src/schema.ts` → `npm run db:generate` → **read the generated SQL**. Renames vs
add-a-new-column are different migrations and drizzle-kit picks; a wrong pick silently loses data
once it is applied to production. → `npm run db:migrate:local` → `npm run db:check` (also in CI) →
`db:migrate:preview` → check the preview app → `db:migrate:prod`. Local SQLite is not byte-for-byte
D1, so preview is not optional for anything destructive.

## Known open item

Whether the Pages project has the D1 `DB` binding attached is unverified - `npx wrangler whoami`
reports "You are not authenticated" on this rig. Nothing in `src/` queries `env.DB` yet. See
`deploy-and-secrets.md` step 3 for the check and the symptom if it is missing.
