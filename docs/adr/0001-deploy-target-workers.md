# 0001 — the deploy target is Cloudflare Workers; Pages is out, and deleted

**Status:** accepted, recorded 2026-11-19 (**MS40 P1**, paying the `AGENTS.md` **G4** debt **D452** describes). The
decision itself is older: **D37** (target is Workers), **D34** (plan the move in a runbook), **D56** (the deploy
pipeline is the repo hook; rollback is a Worker version), **D58** (the Pages project stored `CLAUDE_API_KEY` as
`plain_text`), **D32** (spend capped at $1/month), **D20** (SQLite locally, D1 in production), **D31** (one pinned
Node). **D39**'s "Pages stays as a rollback" is **superseded** — Pages was deleted on 2026-10-30; the record stays
and this file names the supersession.

## Context

The build produces a Workers artifact: `dist/client` (static assets) plus one SSR Worker at
`dist/server/entry.mjs` (`"no_bundle": true`), wired by `dist/server/wrangler.json` with
`assets.directory = "../client"`. `astro.config.mjs` sets `output: 'server'` and the `@astrojs/cloudflare` adapter.
The site has API routes (`/api/discord-summary` and friends) that only exist if a server runs.

## Decision

**Workers is the deploy target. Pages does not host this artifact, and its project is deleted.** Deployment is
`npm run deploy`, which runs the gate set first and then wrangler; review is `npm run preview:deploy` (a Worker
Preview named after the branch). Rollback is a **Worker version**, not a Pages redeploy (**D56**).

## The evidence that decided it, not the preference

- Pages ran the assets and silently skipped the server: a Pages branch preview logged
  `No functions dir at /functions found. Skipping.` and `Success: Assets published!` with no Worker upload, and
  `/api/discord-summary` answered **404**; the same commit under workerd answered **200 application/json** with a
  real summary @measured 2026-10-29, recorded in README §"Deploy target: Workers — the cutover".
- `@astrojs/cloudflare` builds a Workers artifact, and Astro **removed Pages support** from that adapter at v13.
  A framework that no longer emits the target is not a target you can keep.
- Turning Pages off was **proven, not assumed**: pushing `357a265` produced a Pages deployment record carrying
  `is_skipped: true` / `skip_reason: "production_deployments_disabled"`, and the project's domains list came back
  `[]` before deletion @measured 2026-10-30.
- The reason it could not wait: Pages stored `CLAUDE_API_KEY` as **`plain_text`**, and the deployments API returns
  those values inline to any token with Pages read scope (**D58**). The key was revoked and reissued as
  `secret_text` in both production and the preview base config.

## Consequences (each is a thing a session can trip on)

1. **An API route is only testable where a Worker runs.** A static-only preview, or a Pages-shaped mental model,
   produces a 404 that looks like an app bug. The Pages-vs-Worker mix-up is a named runbook symptom
   (`docs/howto/pages-to-workers-migration.md`, moved out of the gitignored runbook home in **MS40 P2**).
2. **`wrangler deploy` replaces the Worker's trigger set with whatever the config declares.** A Custom Domain added
   in the dashboard without a matching entry is detached by the next routine deploy. `npm run check:deploy` asserts
   the declared triggers and reads the artifact wrangler uploads, not the TOML it came from (**D241**); the apex
   trigger contract is its own record, **0004**.
3. **A build can exit 0 and still be undeployable.** One build reported `Complete!`, passed every check, and wrangler
   rejected it with `Uncaught TypeError: Invalid URL string.` `[code: 10021]` because `entry.mjs` still held
   `@@ASTRO_MANIFEST_REPLACE@@`. `check:deploy` asserts the token is gone and the manifest payload is present, and
   `npm run falsify:manifest` re-breaks it to prove both go red. After any interrupted build: `rm -rf dist && npm run build`.
4. **Previews do not inherit production.** `[previews.vars]` and `[[previews.d1_databases]]` exist because they must;
   preview secrets come from `wrangler preview base-config secret put`. Previews that share a `database_id` share
   rows, so they bind the preview database, never the production one (**D221** for the preview mechanism).
5. **The free plan is a design constraint, not a billing setting.** **D32** caps spend at $1/month, so bindings that
   cost request time or write quota get argued, not added: `session: false` in `astro.config.mjs` (the adapter would
   otherwise inject a `SESSION` KV namespace with no id and open writes against the 1,000 writes/day ceiling),
   `imageService: 'compile'` (the default routes images through an unverified Images subscription and ships the
   source bytes), and the KV summary cache, whose whole purpose is to keep one request under the 10 ms per-request
   CPU figure. Details belong to **0002**.
6. **Node is pinned as a floor for the toolchain, not for the runtime.** `.nvmrc` and `engines.node` (`^22.23.4`)
   exist because Astro 7.4.4 refuses anything below it; Workers itself is V8/workerd. The rig runs Node 24.22.1,
   which the floor permits (**D31**).

## What this does not decide, and what would reopen it

- **The route entry is still in `wrangler.toml`** alongside the Custom Domain, and `check:deploy` expects **exactly
  two** triggers. Retiring the route means changing that count **in the same commit**, and it is gated on a
  behaviour probe right after a deploy — this token cannot list routes (`10404`) or custom hostnames (`10000`), so
  the trigger set is only observable by what the apex answers. Owner: the operator's deploy hand (**D42**).
- What would reopen the target question: an adapter that ships Pages support again, an operator ruling that lifts
  **D32**'s ceiling, or a product need for a Pages-style build. None is on the roadmap.
- What would *not* reopen it: a preview inconvenience, or a bundle that is easier to inspect statically.
