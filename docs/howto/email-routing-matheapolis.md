# Standing up an email address on `matheapolis.com` (and not printing one that reaches nobody)

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/email-routing-matheapolis.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

Symptom: "the club has no email address", "how do I get an address on our own domain", "the site has no
mailto", "can the page hand a phone an address to tap", **q13 UNANSWERED** in `design/visitor-questions.mjs`.

Written 2026-11-17 after the operator asked for exactly this (`*"the club has no email address right now,
please provide guidance to create an email address on the matheapolis.com domain name, as well as a
recommended username for it"*`). The tracked half of this record is
`docs/reply-to-the-communication-review-round-6-2026-11-16.md` §10 — read that first, it carries the same
quotes with the doc links. This file is the operating half: what to run, in what order, and what must not
be done before the first step is done.

## 1. The state, measured — do not re-derive it

```
$ dig +short MX matheapolis.com            # (no output at all)
$ dig +short MX minneapolismathbookclub.com  # (no output at all)
$ dig +short NS matheapolis.com
a.hostsmtg.com
b.hostsmtg.com
$ dig +short NS minneapolismathbookclub.com   # same two
```

@measured 2026-11-17 (Linux native). Both zones are Cloudflare-managed (`hostsmtg.com` is Cloudflare's
nameserver pair) and **neither carries a mail service record**, so there is no third-party mail host to
configure and nothing to migrate. A Cloudflare-managed zone with no mail service on it is precisely the
situation Email Routing exists for.

## 2. The product, and the free-plan gate that decides it

**Email Routing** (an alias on the club's own domain, forwarded into whatever mailbox the operator already
uses) is the free path. **Email Sending** (outbound, arbitrary recipients) is not: it needs Workers Paid.
The docs at `https://developers.cloudflare.com/email-service/` say, verbatim:

> "Arbitrary-recipient sending requires Workers Paid, while routing supports Workers Free and Paid"
> "Email Routing … Available on Free and Paid plans"
> "Sending to verified destination addresses in your account is free on Workers Free and Paid plans, even
> when only Email Routing is configured."

Read the `/index.md` twin of any Cloudflare page, not the HTML (`AGENTS.md`'s non-negotiable: ~40x smaller,
table cells stay parseable). `developers.cloudflare.com/email-routing/` now **redirects** to
`email-service/` — a bookmark to the old path is a pointer into a wall, which is how `design/audit-references.mjs`
came to exist for docs as much as for files.

The operator's ceiling is **$1/month** (**D32**), so the plan stays permanently free: any step that needs
Workers Paid is out of scope until an outbound path is actually written, not "deferred".

## 3. The commands, in the order that keeps the page honest

**These are the operator's to run — nothing here was run against the live zone, and no delegate seat has
the dashboard hands.** Wrangler's `email routing` verbs are the map
(`pi-cloudflare` skill `cloudflare-email-service/references/cli-and-mcp.md`; the docs outrank it if they
disagree). Re-run them and correct this file the first time they are executed — that is this repo's rule for
a runbook written before its first incident.

```bash
npx wrangler email routing enable matheapolis.com
npx wrangler email routing dns get matheapolis.com          # the records the product needs, and any conflict
npx wrangler email routing addresses create <your-mailbox>@<somewhere>.com   # the verified destination
npx wrangler email routing rules create                     # match (the address) -> destination (the mailbox)
```

`dns get` is not cosmetic: it prints whether the zone's mail records would collide with anything already
there, and it is the step that turns "this should work" into "these records are what the zone now has".

**The address to pick: `hello@matheapolis.com`** (second choice `bookclub@`, third `hi@` — see §10 of the
reply doc for why). If the operator also stands up an external mailbox named for the club, reuse the same
local part so the address and the account never disagree.

## 4. What must NOT happen before step 3 finishes

**Do not put a `mailto:` on the site before the routing exists.** D403's rule, measured: printing an address
that reaches no human is a fabricated contact path, and `check:ext-links.mjs` already carries a `mailto` case
in its selftest (lines ~87 and ~155: `mailto`/`tel` are exempt from the `target="_blank"` rule) — a `mailto`
that resolves nowhere passes every gate and lies to every visitor. That is the class of defect this rule
exists to prevent, and it is why the repo prints **no email address anywhere** today:

```
$ grep -ric mailto dist/client/join/index.html | wc -l
0
```

## 5. Where the address goes in this repo once it forwards

Not a `_verified` URL in `src/config.json` — that block holds things the probe fetches, and a `mailto:` is
not fetchable. It becomes a **`LINK_SHAPES` key in `src/lib/rsvp.mjs`** carrying `confirmedBy` /
`confirmedAt` — the named-human evidence **D280** requires, exactly like `facebookGroup` — and it lands in
`/join`'s "How to get in" band in `src/pages/join.astro`, in the same construction the other paths use
(the link says what it is, per q29's ANSWERED pattern).

## 6. The open question this closes

`design/visitor-questions.mjs` q13 — *"Does the page hand me something to call or tap more than once?"* —
is the round's only **UNANSWERED** gap (the other three gaps are DECLINED), belongs on `/join` and `/`, and
its matcher's `anyOf` **already** matches a `mailto:`. So the day the address ships, q13 flips to ANSWERED
with **no probe change** — which is **D413**'s rule: an instrument that needs editing to notice its own
answer is an instrument that was never aimed at the question.
