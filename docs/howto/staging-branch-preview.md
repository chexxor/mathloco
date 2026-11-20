# Runbook: a `staging` branch, and the preview environment it should deploy to

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/staging-branch-preview.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

Symptoms this answers: *"I want to see this branch on the real edge before it becomes the site"*,
*"how do I review a design branch without touching production"*, *"did the staging deploy pick up the
prod database?"*, *"the staging URL is showing yesterday's meetup schedule / an empty schedule"*,
*"a push to `staging` ran no CI"*.

Proposed by the operator on 2026-11-02 (`design/ratify-tokens` session). Durable ruling:
`.notes/DECISIONS.md` **D124**. Everything below is grounded in `wrangler.toml`, `package.json`,
`.github/workflows/ci.yml` in this repo and in Cloudflare docs fetched as markdown twins —
`workers/previews/{get-started,configuration,index,compare-workflows}` and
`workers/wrangler/environments` (2026-11-02).

## What already exists (do not build a second staging system)

This repo already has a branch-environment mechanism, configured and commented:

| piece | where | what it is |
|---|---|---|
| `npm run preview:deploy` | `package.json` | `npm run verify && wrangler preview` — the gate set, then a **Worker Preview** deploy |
| `[previews.vars]`, `[[previews.d1_databases]]` | `wrangler.toml` | Previews get `d1-mathloco-preview-db` (`b58d56c1-…`), never the prod DB |
| `[[previews.kv_namespaces]]` | `wrangler.toml` | a separate `SUMMARY_CACHE` namespace (`8173e43e-…`) so a branch cannot write the cache real visitors read |
| `[env.preview]` + `npm run db:migrate:preview` | `wrangler.toml`, `package.json` | a Wrangler **environment** used only to aim migrations at the preview DB — a different mechanism from Previews, do not conflate (the toml says so) |
| `workers_dev = true`, `preview_urls = true` | `wrangler.toml` | `workers.dev` hostnames are enabled for the Worker |

A **Preview** is a branch-scoped copy under the *same* Worker (`npx wrangler preview`, name defaults to
the current git branch). That is the right backing for a `staging` branch. The alternatives are wrong
here, per `workers/previews/compare-workflows`:

- **Version URLs** (`wrangler versions upload`, `--preview-alias staging`) — the docs' exact words:
  "A Version URL runs one uploaded Worker version with the production resources configured for that
  version. It does not create isolated branch resources." and "Do not use Version URLs for branch or pull
  request testing." For a repo whose prod D1 holds the club's real meetup rows, that disqualifies it.
- **Wrangler environments** (`wrangler deploy --env staging`) create a *separate Worker*
  (`<top-level-name>-<env>` per `workers/wrangler/environments`), with their own secrets and bindings,
  and routes must be declared per environment. More moving parts, no isolation gain over Previews here.

## Why a Preview cannot take the live site down

`wrangler.toml` carries two apex triggers (a Custom Domain plus a `/*` route) and warns that
`wrangler deploy` **replaces** a Worker's triggers every run. That is the scariest line in the config, so
it is worth having the doc reason for why a staging deploy is safe:

> "Do not add Queue consumers, Cron Triggers, or production routes to `previews`. These do not target
> Previews." — `workers/previews/configuration`
> "Routes and Cron Triggers target production. Queue consumers cannot target a Preview." — `workers/previews`

So `wrangler preview` never attaches or detaches the apex. It publishes to a `workers.dev` hostname only.

## The protocol

```bash
# once, by the operator (creating a branch on origin is a push, and pushes are the operator's — D66):
git push origin design/ratify-tokens:staging

# per item, after the operator approves that item (D124 amendment: the delegate ASKS, then merges locally;
# it does NOT push — a granted review deploy is not a granted push):
git checkout staging && git merge --no-ff <approved-branch>        # one merge commit per item
git branch --show-current && npm run preview:deploy                # verify runs first; preview named "staging"

# the operator pushes when they want the branch on origin:
#   git push origin staging

# the URL it returns (docs shape: <preview-name>-<worker-name>.<account-subdomain>.workers.dev). Measured
# on the first staging deploy, 2026-11-03:
#   Preview URL:        https://staging-minneapolis-math-book-club.chexxor.workers.dev
#   Unique Deployment:  https://8cb9fff2-minneapolis-math-book-club.chexxor.workers.dev
```

Then, the first time only (a Preview does **not** inherit production settings —
`workers/previews/configuration`). **Check before you change anything** (measured 2026-11-03, first `staging`
deploy): `npm run cf:secrets:list:preview-base` already showed `DISCORD_TOKEN` and `CLAUDE_API_KEY` here, and
`DISCORD_GUILD_ID` is a plain `[vars]` entry in `wrangler.toml` — so the `secret put` below was a no-op, and a
needless roll is a secret-hygiene incident rather than a no-op. The **migrations** were the real first-time step:
`wrangler d1 migrations list d1-mathloco-preview-db --env preview --remote` showed three pending, and the preview
is not worth reading until they are applied.

```bash
npm run cf:secrets:list:preview-base                        # what the preview can already see — do this first
npx wrangler d1 migrations list d1-mathloco-preview-db --env preview --remote
npx wrangler preview base-config secret put DISCORD_TOKEN   # only if the list above says it is missing
npm run db:migrate:preview                                  # schema into d1-mathloco-preview-db, --env preview
npm run cf:secrets:list:preview                             # confirm what the preview can actually see
```

`cf:secrets:list:preview-base` lists the base-config secrets. `wrangler pages secret put` is the
Pages form and does nothing for this Worker (`deploy-and-secrets.md`).

## What staging will look different from production (expected, not a bug)

- **Meetup schedule**: the preview DB is a different database; if the harvest writes to prod
  (`.notes/roadmap-events.md`), staging shows an older or emptier schedule. That is the isolation working.
  **But check the feature exists before blaming isolation:** as of 2026-11-03 there is **no meetup API route in
  `src/pages/api/`** (only `discord-summary.ts`; `getMeetupEvents.ts` is deleted and sits in
  `design/audit-references.mjs`'s `KNOWN_GONE`). So an empty schedule on staging is the designed no-source state
  of `src/components/Schedule.astro` plus a missing route, not a sync failure. The D1 bindings are exercised by
  `npm run db:check` and the migration history, not by a request path.
- **The Discord summary**: a separate KV namespace, so the first cold isolate on staging re-pays Discord +
  Claude (one read per cold isolate per day afterwards — `wrangler.toml`'s KV comment).
- **The share card** ships from `public/`, so it looks identical — which is the point of apply 4g.

## Things that will surprise you

1. **A push to `staging` does run CI — and since 2026-11-14 it is green.** **Corrected in place 2026-11-17** @measured by `curl -sS "https://api.github.com/repos/chexxor/mathloco/actions/runs?per_page=20" | …` (the API's `conclusion` field): 16 runs exist, the five staging runs from 2026-11-04 to 2026-11-12 concluded **`failure`**, and **every staging push from 2026-11-14 on concluded `success`** — seven in a row, the newest being run **`44002973192`** for `staging` @ **`65d406e`**, started `2026-11-17T02:26:18Z` UTC, finished `02:27:12Z` (**54s**). The failures stopped because the clone-mode defects below were fixed, not because CI went quiet: `check:ics` now declares **`needs: ['build']`** (`scripts/gate-run.mjs`, verified 2026-11-17) and the deploy set is 71 steps. **If a staging push goes red again, that quartet below is the place to look first — not the product.** **What was measured on 2026-11-12, kept as history rather than deleted:** `.github/workflows/ci.yml` triggers on
   `pull_request` (any base) and `push` to `[main, staging]` (that line was added after this runbook
   first said staging had no CI). The GitHub Actions API @measured 2026-11-12 by
   `curl https://api.github.com/repos/chexxor/mathloco/actions/runs` shows a run for **every** staging
   push since 2026-11-04, and **every one of them failed**: the tip just pushed, `3ca3784`, has run
   43325253833, `npm run verify` → failure, job done in 46 s. Reproduced locally in a fresh clone of
   that exact tip under Node 22.23.4 (the version CI pins, `~/.nvm/versions/node/v22.23.4`):
   **34 ok / 4 failed**, all four failures clone-mode artifacts, none of them product defects —
   `check:design` (it calls gitignored `.design/` scratch that a clone has not created yet),
   `check:plan:selftest` (15 of its 18 plantings need `.notes/PLAN.md`, which a clone does not have),
   `check:ics` (it audits `dist/client/events.ics` but sits **before** `build` in the DEPLOY set with no
   `needs: ['build']`), and `check:rsvp-promise:selftest` (2 plantings cannot be applied without
   `.notes/PLAN.md`). So "staging is green" locally and red in CI, and any clean-checkout path to
   production (`npm run deploy` = `verify && wrangler deploy`) inherits the same four.
2. **A staging deploy from CI needs credentials the repo does not have.** `wrangler preview` needs
   `CLOUDFLARE_API_TOKEN` (+ account id) in the workflow. That is the operator's grant, and the token
   should be scoped to the Worker's edit + the preview D1/KV, not account-wide
   (`.pi/npm/node_modules/pi-cloudflare/skills/cloudflare-api-token/SKILL.md`). Until then, the staging
   deploy is a local command run by a human — which is also where the browser gates belong.
3. **The staging URL is public by default**, but the `workers.dev` preview hostname sends
   `X-Robots-Tag: noindex` (`workers/previews`), so it does not pollute search the way a `www` variant
   would. If the operator wants it not-guessable, Cloudflare Access can gate the preview hostname
   (free plan permits a limited number of Access seats; check `cloudflare-hardening/references/paid-features.md`
   before proposing it).
4. **Previews are evicted, not permanent.** Free plan: **100 Previews per Worker, 100 Deployments per
   Preview**, and over the limit Cloudflare deletes "the Preview that was deployed to least recently"
   (`workers/previews`). `staging` redeployed per merge stays warm; a PR-preview habit could in principle
   age it out. Redeploy is one command; `npx wrangler preview delete --name <preview>` cleans up by hand.
5. **Do not put the apex route in a staging config.** Nothing targets production routes from a Preview, but
   a hand-written `[env.staging]` block deployed with `wrangler deploy` **is** a production deploy of a
   second Worker, and the trigger-replacement rule applies. Keep staging on `wrangler preview`.
6. **Cost**: nothing here needs a paid plan. Previews are a Workers feature at these volumes
   (100/100 free), the preview D1 and KV namespaces already exist, and the plan is permanently
   ~$1/month (D32). Verify against `cloudflare-hardening/references/paid-features.md` before adding any
   *new* binding.

## Where the pixel gates fit

Staging doubles the value of the open browser-gate escalation (D123, `.notes/NEXT.md`): the ritual that
currently runs on a human's machine — `check:render` (8.3 s incl. build), `design/render-gate-selftest.mjs`
(4.7 s), `check:social:live` (1.3 s) — is ~14 s, and `preview:deploy` already runs `verify` first, so a
red gate cannot reach staging. If Firefox lands in the runner, the same chain can run in CI on `staging`
pushes, which is the strongest place to catch a page that renders wrong.
