# Domain cutover: matheapolis.com (and any future apex)

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/domain-cutover-matheapolis.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

Symptoms this covers: "I added a custom domain in the dashboard and a deploy took it off", "the new domain
answers 404 on `www`", "which hostnames does this Worker actually answer?", "curl can't resolve the domain I
just bought", "the sitemap still points at the old site", "do I need a second Worker?", "`check:deploy` says the
artifact carries the wrong number of triggers".

Written 2026-11-07, the day the operator bought `matheapolis.com` and attached it to the production Worker.
Everything marked **measured** is a command run in that session, on this rig (Linux, native).

## 1. What the site answers on, measured 2026-11-07

| hostname | result |
| --- | --- |
| `https://matheapolis.com/` | `HTTP/2 200`, `server: cloudflare`, `cf-cache-status: DYNAMIC`, a real `cf-ray` — the Worker is serving it |
| `https://www.matheapolis.com/` | `HTTP/2 404` with **`x-preview-user-error: true`** — no Worker trigger is answering `www` |
| `https://minneapolismathbookclub.com/` | `HTTP/2 200`, `cf-cache-status: HIT` — the legacy apex is still live |
| A records | both apexes resolve to the same Cloudflare pair (`104.21.42.141`, `172.67.162.128`); both zones are on `carol.ns.cloudflare.com` / `dns.ns.cloudflare.com` |

**Gotcha, and it cost time:** from this rig, plain `curl -sSI https://matheapolis.com/` fails to resolve, while
`dig +short A matheapolis.com @1.1.1.1` answers those IPs. The local resolver had cached the negative lookup from
before the zone existed. Probe around it rather than believing it:

```bash
curl -sS --connect-timeout 6 --resolve matheapolis.com:443:104.21.42.141 -sSI https://matheapolis.com/
```

A `000`/NXDOMAIN from your own shell is **not** evidence the domain is unattached. Cloudflare documents the other
side of that: a Custom Domain's certificate provisioning "can take up to 24 hours to complete"
(<https://developers.cloudflare.com/cloudflare-plan/llms.txt>). A `www` 404 an hour after attaching may be
mid-provisioning, not a failed attach — re-measure before configuring anything.

## 2. The trap that takes the site down: wrangler *replaces* the trigger set

The live Worker answers its hostnames through **declared triggers**. A hostname added in the dashboard, or with
`wrangler domains` / `--domain`, is not remembered by the file, and the next `wrangler deploy` from this repo
detaches it. That is how "I added the domain" becomes "the domain is gone tomorrow".

So every hostname must be declared in `wrangler.toml`, and the count is asserted by a gate. As of 2026-11-07 the
file declares **three** triggers, and `scripts/check-deploy-target.ts` expects exactly that number:

```toml
[[routes]]
pattern = "minneapolismathbookclub.com"   # legacy apex, custom_domain = true — kept attached on purpose
zone_name = "minneapolismathbookclub.com"
[[routes]]
pattern = "minneapolismathbookclub.com/*" # legacy zone route, custom_domain = false — the older mechanism
zone_name = "minneapolismathbookclub.com"
[[routes]]
pattern = "matheapolis.com"               # the new apex, custom_domain = true
zone_name = "matheapolis.com"
```

Two product facts make that legal, both from the vendored Cloudflare skills
(`.pi/npm/node_modules/pi-cloudflare/skills/cloudflare/references/custom-domains/README.md` and
`.../zones/README.md`):

- "You can configure multiple Custom Domains (hostnames) for a single Worker."
- "A Worker can be attached to routes in multiple zones." (One zone may carry several hostnames; two hostnames in
  two zones needs a route in each.)

Do **not** delete the legacy `minneapolismathbookclub.com/*` route to "clean up". It is a working route, not a
Custom Domain, and deleting a working route with no replacement is how a calendar subscriber loses the feed. It
gets deleted by the commit that adds the 301, not before.

## 3. What a rename touches in this repo, and what it must not

Site-side (edited in the same branch, `content/matheapolis-rebrand`): `src/config.json` (name/title/canonical/
image), `astro.config.mjs` (`site:`), `data/events.json` (`calendar.name` → the subscriber-visible
`X-WR-CALNAME`, and `calendar.prodid` — a new PRODID, so a subscriber that matches old rows by UID keeps its old
rows: watch for duplicates in the first sync), the share card (`scripts/make-social-share.mjs` →
`public/matheapolis-social-share.jpg`), the components, and `integrations/mobilizon-cadence/series.config.mjs`
(the click-through URL). Editing a `series.config.mjs` comment also marks all three generated n8n artifacts stale,
because each embeds its generator's source — run the generators (`build-workflow.mjs`, `build-alerter.mjs`,
`build-heartbeat.mjs`), then `npm run check:cadence`.

Not site-side, and unchanged on 2026-11-07: the Meetup group URL slug (`minneapolis-mathematics-book-club` — the
org's record, changing it breaks the join link) and the Mobilizon group handle. Both are listed as
`ORG_OF_RECORD` in `design/grill/copy-options.mjs`, and the round asserts a copy mutation never edits them.

## 4. The old apex: serving-but-not-canonical is a state, not a destination

Right now both apexes serve the same app, `canonical` says `matheapolis.com`, and the sitemap says
`matheapolis.com` because `astro.config.mjs`'s `site:` is what fills `<loc>`. **No gate reads that host** — a
stale `site:` publishes the legacy apex as the canonical URL of every page and a 301 cannot undo it. The line is
guarded only by its comment.

Three ways to finish the move; none is implemented. **The free-plan gating is now verified** (docs read
2026-11-08, `rules/url-forwarding/#availability`): Single Redirects are "available on all Cloudflare plans",
Free = **10 rules per zone**; Bulk Redirects, Free = **15 rules / 5 lists / 10,000 URLs**, and those are *per
account*, keyed off the highest plan on the account. Both "require that you proxy the DNS records" of the
hostname they act on. The plan ceiling here is still D32's $1/month.

1. **Zone redirect rules on the legacy zone** (4 rules: `minneapolismathbookclub.com`→`https://matheapolis.com/`
   preserving path+query, plus `*.minneapolismathbookclub.com`, plus one to send `www.matheapolis.com` to the
   apex). Cheapest to reason about, lives outside the Worker.
2. **Bulk Redirects + a List** — one 301 covers both hosts with path preservation.
3. **Keep the Worker attached to the legacy apex and return 301s** — most control (it can redirect
   `/events.ics` differently from `/`), and it needs `run_worker_first` on the legacy zone, which the
   `workers-best-practices` skill warns against setting while Dynamic Routing is on: "Dynamic Routing and
   `run_worker_first` are incompatible: Dynamic Routing currently overrides this setting."

**Before choosing, read `.pi/npm/node_modules/pi-cloudflare/skills/cloudflare-hardening/references/paid-features.md`**
— I did not verify what the Free plan allows for redirect rules or Bulk Redirects, and the plan ceiling here is
D32's $1/month. The measurement that decides it: the zone's current rule counts against the plan's limit.

### 4a. Re-measured 2026-11-08 (Linux, `dig @1.1.1.1` + `curl`): this is a trigger problem, not a DNS problem

The operator had added a `www` DNS record by then, and `www.matheapolis.com` still answered `404`. The measurement
that explains why: **every hostname tested on the zone resolves to the same proxied pair** `104.21.62.168 /
172.67.137.140` — the apex, `www.`, `staging.` and a deliberate nonsense name — yet

| hostname | answer |
|---|---|
| `matheapolis.com` | `200` (Custom Domain trigger) |
| `staging.matheapolis.com` | `200` — a `wrangler preview` hostname, provisioned automatically because the apex is an attached Custom Domain (D244) |
| `www.matheapolis.com` | `404`, `x-preview-user-error: true` |
| `nonsense.matheapolis.com` | `404` |

So DNS is not the missing piece: the name resolves to Cloudflare and **nothing is attached to it**. The consistent
reading is a proxied wildcard record on the zone, and it is **not verified as one** — the token this rig holds returns
`Authentication error` (`10000`) on `/zones/<id>/dns_records` and `/zones/<id>/rulesets`, even though it lists zones
and the Worker's custom domains. Mint the read-capable token before choosing a mechanism.

**One line in this runbook and one in `NEXT.md` were wrong and are corrected here:** the cheap fix is **not** "one
`[[routes]]` block". A zone route on a **proxied** record needs `run_worker_first: true`, and option 3 above already
quotes why that is a bad bet (Dynamic Routing overrides it). For a proxied `www` the real choices are: make the name
**DNS only** and attach it as a **Custom Domain** (the historical blocker is `100117`, "already has externally managed
DNS records (A, CNAME, etc). Delete them first"), keep it proxied and add the **zone redirect rule** already listed in
option 1, or rule `www` a permanent 404. Note that a `www` Custom Domain is the one option that lands inside
`check:deploy`'s trigger count; a zone rule does not, and a zone rule is invisible to every gate in this repo.
**Read §4b before typing any of them** — the doc line about CNAMEs and the Free-plan quotas were verified after
this section was written, and they change the ranking.

### 4b. Verified against Cloudflare docs 2026-11-08: what each `www` option actually costs

Three doc lines decide it, quoted rather than remembered:

1. **`workers/configuration/routing/custom-domains`** — *"You cannot create a Custom Domain on a hostname with
   an existing CNAME DNS record or on a zone you do not own."* The operator's `www` **CNAME** is therefore the
   thing standing between option 1a and a `100117`, the same error the apex produced in October. To attach
   `www` as a Custom Domain, the CNAME has to go first (dashboard → DNS → Records → delete `www`), and the
   Custom Domain then creates its own record.
2. **same page, "Redirect between www and root domain"** — *"Because Custom Domains require an exact hostname
   match, a Worker attached to `example.com` will not receive requests sent to `www.example.com`, and vice
   versa."* This is the mechanism behind today's `www` 404: the apex Custom Domain is exact-match, and `www`
   has no trigger of its own.
3. **same page, and `rules/url-forwarding/examples/redirect-www-to-root`** — a redirect rule needs a **proxied**
   record for the hostname it redirects *from*, and for an originless setup the documented placeholder is a
   proxied `A www → 192.0.2.0` (or proxied `AAAA → 100::`): *"Because the DNS record is proxied, requests never
   reach this address — Cloudflare intercepts them and applies your redirect rule."* (The Pages-era how-to this
   runbook quoted in October used `192.0.2.1`; same TEST-NET-1 block, different address. Use what the rules doc
   says today.)

Measured the same day, Linux, `openssl s_client` + `curl`:

| Probe | Result |
| :-- | :-- |
| TLS on `matheapolis.com`, `www.`, `staging.`, a nonsense name | all four present one certificate whose SANs are `matheapolis.com` **and `*.matheapolis.com`** — the wildcard certificate exists, so a `www` request is *not* a TLS problem |
| `https://www.matheapolis.com/events.ics` | `404`, `x-preview-user-error: true` — the Worker's own not-found shape, i.e. a proxied request reached a zone with no trigger for that host |
| Free quota headroom | 10 Single Redirect rules per zone; the whole cutover needs 3 (legacy apex, legacy `*.`, new `www`) |

**The consequence the earlier recommendation got wrong.** Attaching `www` as a Custom Domain is the option that
lands inside `check:deploy`'s trigger count, but it makes `www` a **second canonical host** serving identical
pages: `<link rel="canonical" href="https://matheapolis.com">` already points at the apex, so a Custom Domain on
`www` buys a duplicate host to keep the canonical tag honest. The docs' own answer for a site that has chosen a
root canonical is the proxied placeholder record **plus one Single Redirect** — answered at the edge, no Worker
CPU, none of the 100,000 requests/day, and one canonical host.

So, ranked (2026-11-08), for `www.matheapolis.com`:

1. **Delete the `www` CNAME; add a proxied `A www → 192.0.2.0`; add one Single Redirect**
   `hostname eq www.matheapolis.com` → `concat("https://matheapolis.com", http.request.uri.path)`, 301, preserve
   query. Free-allowed with 9 rules of headroom left. The `www` ruling the operator accepted as "(a)" was
   Custom-Domain-shaped; this is the variant the docs actually recommend for a root-canonical site, and it is
   the one that leaves the sitemap and canonical tag telling the truth.
2. **Custom Domain on `www`** after deleting the CNAME. Works, gets gated by `check:deploy`, and adds a second
   serving host.
3. **Rule `www` a permanent 404.** Cheapest, and defensible for a club with no `www` links in the wild — but any
   card, QR code or printed mat that says `www.` lands on an error.

All three are dashboard-only: this rig's token returns `10000 Authentication error` on
`/zones/<id>/dns_records` and `/zones/<id>/rulesets`, and a zone rule is **invisible to every gate in this
repo** — `check:deploy` counts only what `wrangler.toml` declares. The instrument that *does* see a zone rule is
`npm run probe:live`, which lists `www.matheapolis.com` in its production group.

### 4c. The order that never leaves a live URL pointing at a hole (2026-11-08)

Measured facts first: `main` is at `873b894` (2026-10-30), `staging` is **178 commits ahead**, the newest
production Worker version was created **2026-10-31T00:30Z**, and both apexes answer `/schedule` and
`/events.ics` with **404** (full table in `DECISIONS.md` D245 and in
`deploy-pipeline-workers-builds.md` → "Is what is deployed what is built?"). So:

1. **Ship first.** `staging → main` is a **fast forward** (`git merge-tree --write-tree --name-only main staging`
   printed a tree hash and no conflicted paths). Push `main` and the repo hook builds and deploys — the mechanism
   measured on 2026-10-30 (`verify` is its build command). Operator's hands, both merge and push.
2. **Prove it.** `npm run probe:live`. Production must read the built title, and `/dates` + `/events.ics` must
   answer 200 on both apexes (`/dates` is the route as of **D373**, 2026-11-16; `/schedule` was its name through
   2026-11-15, and production 404s **both** today — the 2026-10-31 artifact, D245). Re-probe past `cf-cache-status: HIT` with a fresh query key before believing a 200 or a 404.
   answer 200 on both apexes. Re-probe past `cf-cache-status: HIT` with a fresh query key before believing a 200
   or a 404.
3. **Then `www`** (§4b): delete the CNAME, add the proxied `A www → 192.0.2.0`, add one Single Redirect preserving
   path and query. Probe `https://www.matheapolis.com/dates` and expect `301 → https://matheapolis.com/dates`
   (a redirect rule preserving path and query serves either name; the probe asks the route this tree ships).
4. **Then the legacy apex 301s** (item 2 accepted): zone rules on `minneapolismathbookclub.com` preserving path and
   query, `/events.ics` included. Probe the old apex's `/events.ics` for a `301` to the new apex's feed, not a 404.
5. **Then retire the trigger.** Only once rule 4 is live and probed, delete the `[[routes]]` entry for
   `minneapolismathbookclub.com/*` from `wrangler.toml` in its own commit, where `check:deploy`'s expected count
   changes with it (D241). A rule that is not yet probed is a rule that is not yet a replacement.
6. **Then the calendar check** (A15's post-deploy item): the `PRODID` changed, so look at one real subscriber's
   first sync for duplicated rows.

## 5. Fast loop next time

```bash
npm run build && npm run check:deploy     # the trigger set + asset budget, ~2s
npm run probe:live                        # what a visitor is served, vs what this tree would ship
node design/grill/copy-shipped.mjs        # re-base the naming round from the new build
npm run round16                           # measure + photograph the copy options (~40s)
```

`round16` refuses a `dist/` older than the tree, and `copy-shipped.mjs` refuses one too — that is what keeps a
naming round from measuring the pre-rename page for a week after the rename.
