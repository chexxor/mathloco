# Research: how this site should send a stranger to the club's Discord

Asked by the operator on 2026-11-20, about `src/pages/chat.astro`:

> the /chat page has a "Join the chat" button at the top as the first item under the heading. It doesn't
> make sense to have a user call-to-action without context around it like that, don't you agree? Additionally,
> it feels incorrect for us to use a button there for something that takes you off the page. Shouldn't it be an
> anchor link with an external icon? Or something else? Can you research how other sites send people to a
> Discord server, or how Discord themselves recommend the UX/UI be for that?

The ask was: **what does the destination actually ask of a visitor, what does Discord itself provide for
sending people to a server, what do comparable projects do, and what does the accessibility literature
require** — and then: what rule would catch the whole class site-wide.

Method first, because two of the fetches failed in a way that changes the answer if you don't write it down.

---

## 1. Method, and the two traps in it

Every line below was fetched on **2026-11-20, Linux native** (no WSL, no Docker), from this rig, with
`curl -sL --max-time 15`. Bodies are kept in `.design/tmp-research/` (gitignored scratch) with their byte
counts.

**Trap 1 — a browser User-Agent gets you blocked, and the block looks like a dead page.** With
`-A "Mozilla/5.0 (X11; Linux x86_64) … Chrome/129.0"`, `w3.org` answers **403 with 5,695 bytes** and
`support.discord.com` answers **403 with 5,615 bytes**. With curl's own default (no `-A`) the same w3.org
URL answers **200 with 32,628 bytes** @measured 2026-11-20 by re-running one URL with and without `-A`.
A "404/403 and a big body" is not evidence that a document is gone; it is evidence about the client.

**Trap 2 — a technique number remembered is a technique number invented.** This seat first reached for
**G83** as "the WCAG technique for links that open a new window". Retrieved, G83 is
`G83: Providing text descriptions to identify required fields that were not completed`
@retrieved 2026-11-20 from <https://www.w3.org/WAI/WCAG22/Techniques/general/G83.html>. The new-window
technique is **H83: Using the target attribute to open a new window on user request and indicating this in
link text** @retrieved 2026-11-20 from <https://www.w3.org/WAI/WCAG22/Techniques/html/H83.html>. The
memory was wrong; the page was two keystrokes away.

**What could not be read at all, and why it matters for anyone re-running this:** Discord's own marketing
pages, the club's own invite page and the JS-heavy community pages below ship a shell whose visible text is
rendered client-side. `https://discord.com/invite/wx5S7YJSkU` answers **200 / 27,650 bytes** but yields
**63 characters** of text once `<script>` and `<style>` are stripped @measured 2026-11-20 by a strip-and-count
over the saved body. So "what a newcomer sees when they land on our invite" is **not** answerable from a
static fetch, and this note does not answer it. `discord.com/servers` (their server directory) is the same
shape: 3,257 characters of text, all navigation.

---

## 2. What the destination actually asks (Discord's own words)

From the Discord Developer Documentation, `Invite Object`:

> Represents a code that when used, adds a user to a guild or group DM channel.

@retrieved 2026-11-20 from <https://discord.com/developers/docs/resources/invite>.

Three consequences, and they are the whole argument against a bare "Join the chat" control:

1. **An invite is a membership operation, not a read.** It does not open content; it *adds a user to a
   guild*. A control that says "Join the chat" and paints next to nothing states an action ("join") without
   its two preconditions: that a Discord account is involved, and that the visitor is joining a **server**,
   not reading a page.
2. **An invite can expire.** The same page documents `Invite Metadata`: `uses` — "number of times this invite
   has been used", `max_uses` — "max number of times this invite can be used", `max_age` — "duration (in
   seconds) after which the invite expires". So a printed invite URL is a claim with a shelf life, which is
   exactly what `src/config.json`'s `_verified` stamp and the 60-day `LINK_STAMP_DAYS` in `src/lib/rsvp.mjs`
   already buy (**S019**, **D272**). The docs give that mechanism a reason it did not have before: expiry is
   documented behaviour, not a rumour.
3. **Discord's recommended website surface publishes presence, and this site may not paint it.** The same
   documentation describes the Guild Widget object — the thing Discord ships so a server can be embedded in a
   web page — with `members`: "special widget user objects that includes users presence (Limit 100)",
   `presence_count`: "number of online members in this guild", and `instant_invite`.
   @retrieved 2026-11-20 from <https://discord.com/developers/docs/resources/guild#guild-widget-object>

   That rules the widget out here, on the repo's own rules rather than on taste: **D265** keeps headcounts off
   every painted surface, and the `discord-events.mjs` harvester deliberately never asks for `user_count` for
   the same reason. A widget would also put members' identities in front of a stranger, which is the class of
   leak **D33** refused a model provider over ("cost is not the argument, username leakage is"). **Decision
   carried out of this note: no embed, no widget, no presence.** The invite is words plus a URL.

Brand side, from Discord's brand page @retrieved 2026-11-20 from <https://discord.com/branding>:

> You must have permission from Discord before using any of the Discord Marks or Brand Assets except as
> permitted here.

This site is not exposed to that, and the reason is already on the record: the Discord glyph in the platform
sprite is not Discord's asset. `src/lib/platform-marks.mjs` records each `d` string as the path Simple Icons
serves, and the upstream licence was re-checked today: **CC0 1.0 Universal**
@retrieved 2026-11-20 from <https://raw.githubusercontent.com/simple-icons/simple-icons/develop/LICENSE.md>,
with `https://cdn.simpleicons.org/discord` answering 200 / 1,389 bytes @measured 2026-11-20. The glyph is
painted in `currentColor`, never in `#5865F2` (which is what the CDN's own SVG carries), for **D82/D88**'s
palette rule. So: **use the existing mark; do not redraw Clyde, do not add a wordmark lockup, and do not
paint brand blue** — an "external icon" added for the sake of one link must come from the same CC0 source or
it is a second icon home, which is what `choose-icons` exists to prevent.

---

## 3. What the accessibility literature requires

WCAG 2.2 SC 2.4.4, retrieved from the specification @retrieved 2026-11-20 from
<https://www.w3.org/TR/WCAG22/>:

> The purpose of each link can be determined from the link text alone or from the link text together with its
> programmatically determined link context, except where the purpose of the link would be ambiguous to users
> in general.

And the Understanding page on the same criterion @retrieved 2026-11-20 from
<https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html>:

> Whenever possible, provide link text that identifies the purpose of the link without needing additional
> context.

That sentence is the operator's complaint, in a standard's words. "Join the chat" derives its purpose from
context; the W3C's preference is that the label carry it itself. Note that it is a *preference* in the
criterion's own text ("or … together with its … context"), which is why context is not optional — it is the
thing the label is allowed to lean on, and right now nothing is standing there.

H83, cited above, covers the mechanics this site already pays: `target` on user request **and saying so in
the link text**. `check:ext-links` already enforces that half (`blank-no-rel`, `external-no-blank`,
`no-qualifier`, `qualifier-visible`, `name-repeats`), and `newTabQualifier` in `src/lib/links.mjs` is the one
home for the words. So the gap is not the new-tab disclosure. The gap is **purpose and consequence**.

---

## 4. What comparable projects actually do

Measured over static bytes (the limit in §1 applies to the JS-rendered ones). Four attempts, three readable.

| Page | What the bytes show | Readable? |
|---|---|---|
| `https://www.typescriptlang.org/community/` | A card: an icon span, a headline link whose text is `Chat`, then a gloss — "Chat with other TypeScript users in the TypeScript Community Chat." The visible words never say "Discord"; only `title="TypeScript Community on Discord"` does. The Discord anchor carries **no** `target="_blank"`, while the Twitter anchor on the same page does | yes — the pattern and the miss are both in the bytes |
| `https://svelte.dev/chat` | The invite `https://discord.com/invite/svelte` is present in the payload; the label around it is rendered client-side, so nothing around the link is readable | no |
| `https://astro.build/chat` | Same shape: `https://discord.com/invite/astro-lounge-…` present, presentation client-rendered | no |
| `https://www.electronjs.org/community` | One mention of Discord, no invite anchor in the bytes at all | partial |

@measured 2026-11-20 by a scratch extractor (`href` scan plus a text-strip) over the saved bodies; the
`rust-lang.org` community page turned out to carry no Discord link at all, so it is dropped rather than quoted.

Two things worth taking from that sample, one worth refusing:

- **Worth taking:** the TypeScript card is the right *shape* — a short label plus a sentence naming who is on
  the other side and what you do there. That is the context unit this site should standardise.
- **Worth refusing:** the same card shows the drift the shape allows — a label ("Chat") that only makes sense
  with its gloss, a platform named only in a `title` attribute, and an off-site link that does not open a new
  window while its neighbour does. It is exactly the defect class `check:ext-links` already fails on this
  repo's own pages.
- **Not comparable:** none of the readable samples answers "does the site warn that an account is needed",
  because the warning would sit on Discord's invite page, which §1 could not read.

---

## 5. What this site does today, counted

`node design/cta-inventory.mjs` over the built artifact (`dist/client`, and the probe refuses a stale one —
`design/dist-fresh.mjs` said `fresh` when this ran) counts **49 actions across 6 built pages**: **22** off-site
links, **11** declared controls (**3** `data-control="primary"`, **8** `data-control="secondary"`) and **16**
in-page anchors whose accessible name opens with an action verb — the verb list is printed by the probe, so a
reader can argue with it instead of inheriting it. Cost **0.034s**, no browser, no build
@measured 2026-11-20 by `time node design/cta-inventory.mjs` (Linux native, Node 24.22.1).

The probe prints **two** candidate measures of "context", and the difference between them is the finding:

| measure of context | actions with under 6 words | actions with under 12 |
|---|---|---|
| painted words within ±200 characters of the action's own words | **0** of 49 | **1** of 49 |
| words in the **enclosing block**, besides the action's own label | **17** of 49 | **25** of 49 |

A **proximity window cannot fail on this site**, so it must not be built: a page whose nav, lede and exit band
all name "Discord", "Meetup" and "dates" flatters every control standing on it. A **block** measure does fail,
and it fails on the exact thing the operator pointed at — `/chat`'s invite control sits in a block holding
**0** words besides its own label, as do `/`'s primary ("Sign up for Sat, Nov 21") and `/dates`'s Facebook
join @measured 2026-11-20 by `node design/cta-inventory.mjs`.

Two cautions the probe keeps in its own output rather than in a footnote. The block walk is a tag stack over
hand-written components, not a DOM parse, and it found no enclosing block for **1** of the 49 (`/dates`,
"Add to a calendar"). And an earlier cut of the instrument used `lastIndexOf('<div')` to find the block, which
reported **0 context words for every action on the site** — a parser bug wearing a finding's costume. The
number that looked worst was the number that was wrong, which is why both measures print side by side and
neither one is trusted alone.

---

## 6. What this settles, and what it leaves open

Settled for the apply and the gate:

1. **The invite stays in the first screen of `/chat`.** `D367` moved it there off a measurement — the page's
   only way out sat 1,720px down at 1240 and 2,075px at 390 — and nothing in this research contradicts that.
   The complaint is about the company it keeps, not its position.
2. **What is missing is a context unit, not a different control.** The label must not carry the whole load on
   its own, and the block it sits in must name the destination and the ask: a **server**, and that joining
   needs a **Discord account**. `/join` already has the half this is missing — "the club's Discord" with the
   `sr-only` qualifier, in an inline link idiom — so the reusable thing to build is one idiom with two
   renderings (inline link, block control) and one source for URL, platform name and qualifier.
3. **No widget, no presence, no headcount, no redrawn brand mark** (§2). If an "external" glyph is added, it
   comes from the same CC0 source as the existing marks and paints in `currentColor`.
4. **A gate for the class must test a declared block, not a text window** (§5). The site already declares
   handles for exactly this kind of thing (`data-control`, **D140**; the notice handle `check:notice-announcement`
   reads), so the cheap decidable form is: a control declares its context element, and the gate fails when the
   declaration is missing, resolves to nothing, or names no destination and no ask.
5. **Per the operator's ruling, the rule covers every call-to-action, not only off-site ones** — the nav
   links, the identity link and the skip link are not calls to action, and their exclusion has to be written
   down rather than inferred.

Still open, and this note does not answer it:

- **Whether an external-link icon helps a sighted reader here at all.** The research says an icon is
  conventional; it does not say it adds anything the `sr-only` qualifier and a labelled block do not already
  say. That is a specimen question (a row of variants the operator picks from), not a literature question.
- **What Discord's invite page shows a newcomer.** Not fetchable (§1). If it matters, the instrument is a
  rendered page in the browser set, not a curl.
- **Whether the 60-day invite stamp should shorten**, given `max_age` exists in the docs. Today the club's
  invite answers 200 with a stamp dated 2026-11-10; nothing here shows it expires.
