# Reply to the round-6 communication review — 2026-11-17

This is the answer to `docs/communication-review-round-6-2026-11-16.md`. Every line item in that letter is
inventoried here exactly once, with the path the change landed on and the gate that now holds it, and the
sentences that shipped as **the operator's draft** rather than as a fact this tree grounds are listed separately
in §4 so a later session cannot read them as grounded.

## 0. Provenance — what this reply measured, and where it lives

| | |
|---|---|
| **This doc lives on** | `communication-round-6`, cut from `staging` @ `65d406e` and carrying this round's work. **S046**/**D354**'s rule: a read and its execution live on **one** branch, so a fresh clone cannot find the letter without the reply. The merge into `staging` and the push come at the end of the round under the grant already in force (**S050**, **S051**, **D124**); `main`, every merge into `main`, and every deploy stay the operator's (**D42**). Verify with `git branch -v --no-color` and `git log --oneline staging..HEAD \| cat` — the pointer row follows the ref rather than pinning a sha, because **S051** deleted a branch mid-round and every gate stayed green over five citations to a ref that no longer exists |
| **What the round measured against** | the built artifact in `dist/client`, not a preview and not production. The route set the artifact emits at this tip: `/`, `/404`, `/chat`, `/dates`, `/join`, `/past` plus `/events.ics`. Every quoted string below was read out of that artifact with `node .design/tmp-page-text.mjs <page>` (scratch) or a `grep` against `dist/client`, and the probe lines name the command that printed them |
| **The probes this reply ran, at the tip** | `node design/visitor-questions.mjs --no-build` → 29 questions across 8 classes · 7 surfaces: **24 ANSWERED where asked · 0 only in chrome · 0 only off-page · 3 DECLINED in the open (q06, q07, q20) · 1 UNANSWERED (q13) · 1 NOT-ASKED (q28)**, **4 gaps** @measured 2026-11-17; `node design/communication-census.mjs --no-build` → **15** duplicate-claim clusters, wayfinding prose **14 of 23** sentences, `/` 24,711 bytes / 408 body words / 45 sentences / 16 anchors → 8 destinations @measured 2026-11-17; `node design/fold-answers.mjs --no-build` → at 390x844 the five acceptance answers sit at 136–176, 439–487, 551–607, 700–748, 760–808 with **0 of 5 past the fold** on a 4,212px page @measured 2026-11-17; `npm run probe:live` for what the live surfaces serve (D245's gap, unchanged: production still answers a 2026-10-31 artifact) |
| **What this reply is not** | not a judgment about type, spacing or composition. The letter itself says it had "the copy and the markup, not the rendered pixels", and this reply answers at the same altitude. The one thing the letter said it still owes — the rendered hero — is answered in §7 with the two PNGs, not with prose |

## 1. The verdict

The letter is right about the defect underneath the per-page ones, and this round fixed it at that altitude: the
site stopped spending its doorway on what it cannot ground. The audit voice was a discipline this repo earned its
own gates for — D92 forbids a frequency word with no source, D136 deleted a fabricated member count, D265 refuses
a headcount that is not a grounded claim — so the sentences the letter calls "provenance marketing" were not
decorations: each one was a gate's requirement that a claim name its source. What moved was the **position**,
not the discipline: the facts left the doorway and went beside the file they describe (D387, D388), the legal
line went to the band's colophon (D394), and the freshness stamp left the pages that were reading it as decay.

Three of the letter's premises were factually wrong against the artifact, and each is recorded rather than
quietly corrected:

1. **The feed's `URL` field disagreed with `/dates` for one row, not for the feed.** At the artifact the letter
   read, `dist/client/events.ics` carried one `mobilizon.labradorius.com` URL (the row whose source is the
   self-hosted Mobilizon feed) and six Meetup URLs. The defect is real and it shipped, but it is one row, and
   the fix the round took is neither of the letter's two options — see row S2.
2. **"`last read 14 days ago` is an admission, in relative time".** The stamp was already the rule that keeps
   relative time inside a window: `provenanceStamp()` prints "last read `<n>` days ago" **inside 30 days** and
   `on <day> <month> <year>` beyond it (D322). The letter's own prescription — "keep the fact… as an absolute
   date" — was therefore already the code's behaviour past 30 days; what the letter saw was the 30-day branch,
   and what the round deleted is that branch's appearance in body copy.
3. **`/schedule` 404s today.** True of the artifact, and it is why the redirect shipped (D408). It is also why
   the letter read `Page not found` as 11% of its own weighting.

Where the letter and the repo's rules disagree, the repo's rule wins and the letter's point is kept as the reason
— the same treatment **D355**'s standing rule gives a rulings letter. Two places this round took the letter's
intent rather than its literal instruction (rows C3 and S2), and both say so in their cell.

## 2. The inventory — every line item, once

35 rows: the letter's five Move tables carry 9 (Home) + 8 (`/dates`) + 8 (`/join`) + 5 (`/chat`) + 5 (Site-wide,
the feed, the 404). Row ids are this reply's, in the letter's own order. **Verdicts:** `landed` (the copy or the
state shipped), `landed + gate` (the invariant that keeps it shipped changed in the same commit), `took the
letter's alternative` (the letter offered a second option and that option shipped), `declined with evidence`
(the item is a ruling, with the probe and the trigger that ships it), `kept` (the letter said keep, and nothing
touched it).

| id | the item, verbatim | verdict | files touched | gate touched |
|---|---|---|---|---|
| H1 | Home / Remove — "Nothing here says what a meeting costs, and no price is printed. Nothing here says whether you must be a member to come, and no rule is kept." | landed + gate — replaced by two sourced slots, `cost` "Free." and `membershipRule` "No membership needed - you just come.", painted on `/` and `/join` out of one `answers()` call; **D381** supersedes **D376**/**D377**'s content while keeping their mechanism | `src/content.json`, `src/lib/content.ts`, `src/components/Schedule.astro`, `src/pages/join.astro` | `check:content` (a painted claim with no source fails), `check:copy` |
| H2 | Home / Remove — "Whether the room is your kind of room is not something a page can tell you." | landed — the letter's own fallback ("if it doesn't [a photograph], move it to `/join`") shipped: the sentence left `/` and stayed on `/join`; the photograph stays MS32 (**D389**) | `src/components/Schedule.astro`, `src/pages/join.astro` | none — copy only, `check:content`'s near-duplicate pair stays in baseline |
| H3 | Home / Remove — "the list is not the room", "this site drops no pin", "last read 14 days ago" | landed + gate — all three are gone from every built page (`grep -ric` over `dist/client` prints 0 for each string); the freshness stamp now sits only beside the `/events.ics` path, where it describes the file it qualifies (**D387**, **D388**) | `src/components/Schedule.astro`, `src/pages/dates.astro`, `src/lib/rsvp.mjs` | `check:rsvp`, `check:rsvp-page` |
| H4 | Home / Revise — "`## When we meet` contains no date — two links, then a different section" | landed — the band opens with the next meeting line, names the date and the hour with its zone, and the calendar link comes after it (`fold-answers` prints "when is the next meeting" at 439–487, above the fold at 390) | `src/components/HeroSection.astro`, `src/components/Schedule.astro` | none — copy only; `check:dated-surfaces` still rules `/dates` and `/past` as the only date-printing surfaces |
| H5 | Home / Revise — "`### How it works` describes the *website's* data policy — 15 venues, member-list freshness, no map pin" | landed + gate — the heading now carries the first ten minutes (walk in / bring nothing / usually six to twelve), and the data-policy sentences left the heading; the venue count and the freshness fact moved beside the file they describe (**D387**, **D388**, **D389**) | `src/components/Schedule.astro`, `src/lib/rsvp.mjs`, `src/content.json` | `check:copy`, `check:content` |
| H6 | Home / Revise — "Primary CTA 'Join Our Group'… Make the primary `Sign up for Sat, Nov 21` → `meetup.com/.../events/317242488/`, secondary `All 5 dates →`" | landed + gate — the hero primary is `signUpPaths()`'s answer for **the printed date**, labelled with that date, falling back to `/join`; the artifact carries exactly one `data-control="primary"` control, labelled "Sign up for Sat, Nov 21", at the Nov 21 event URL (**D384**) | `src/components/HeroSection.astro`, `src/lib/rsvp.mjs` | `check:rsvp-page`, `check:rsvp` (the resolver that decides the path) |
| H7 | Home / Revise — Terminology: "See the dates", "the schedule", "All 5 dates", "the dates page" | landed + gate — one word across every surface that names the page, the nav chip's word; the sentence that used a fourth name drops the name rather than coining a fifth (**D386**) | `src/components/Schedule.astro`, `src/pages/join.astro`, `src/components/WhyJoinUs.astro` | `check:naming` |
| H8 | Home / Add — "The rhythm, in one clause near the date" | landed + gate — the cadence sentence is **generated from the rows this build publishes** by `src/lib/rhythm.mjs`, so no hand-written cadence can go stale and no cadence word reaches a page from prose (**D383**); artifact prints "Saturdays at noon for a social, Wednesdays at 6 pm for a study session." | `src/lib/rhythm.mjs`, `src/components/HeroSection.astro`, `src/pages/dates.astro` | `check:ics` (the same generated string reaches the feed) |
| H9 | Home / Add — "Three lines: what happens when you walk in, what to bring, what's expected" + "One number about the room: 'usually six to twelve people'" | landed + gate — three lines ship on `/`, and the headcount is the site's **first painted headcount**, only legal because it sits in a slot carrying a source and an `asOf` (**D385**, **D392**) | `src/components/Schedule.astro`, `src/content.json` | `check:rsvp-page` — its `COUNT_RE` now catches spelled-out numbers as well as digits, and exempts only a match inside a sourced slot |
| D1 | `/dates` / Remove — "The calendar file carries the club's 7 dates from Nov 7, 2026 through Dec 19, 2026." | landed + gate — one call generates the sentence for the page and the feed; it now reads "The club's dates run from Nov 7, 2026 through Dec 19, 2026.", which keeps q18's answer and loses the framing and the count (**D399**) | `src/lib/ics.mjs`, `src/lib/event-description.mjs`, `src/pages/dates.astro` | `check:ics` gained `feed-meta-commentary` (planting: a DESCRIPTION saying "the calendar file carries") |
| D2 | `/dates` / Remove — "no page here draws a route to it" and the duplicated calendar paragraph | landed + gate — the reach sentence left the lede and sits under the `/events.ics` path, so it reads about the file rather than about the site (**D387**, **D388**); the duplicate calendar paragraph is gone and the page prints the window once | `src/pages/dates.astro`, `src/lib/rsvp.mjs` | `check:copy`, `check:content`'s near-duplicate baseline |
| D3 | `/dates` / Remove — "Looking for a date that has already passed? Past meetings" — "Never link to an empty shelf… Unlink until there are three completed meetings; `noindex` the route meanwhile" | landed + gate — the route stays **built** and keeps its contract; the pointer is deleted with the trigger written as a number the page's own list prints (three completed meetings), and `past.astro` carries the `noindex`. `grep href="/past"` returns 0 on every built page (**D404**) | `src/pages/past.astro`, `src/pages/dates.astro` | `check:dated-surfaces` (still rules `/past`), `check:site-host`, `design/link-ceiling.mjs` (the six-URL ceiling held) |
| D4 | `/dates` / Remove — "The footer nav that repeats the header nav verbatim" | landed + gate — the band lost the three internal links it repeated, and **the rule moved in the same commit as the copy**: `check:page-exit` now refuses a band nav carrying a path the page's own nav printed above the body (**D395**, **D407**); the selftest grew a planting in each direction @measured 2026-11-17 (14 cases, 0 wrong) | `src/components/Footer.astro`, `scripts/check-page-exit.mjs` | `check:page-exit`, `check:page-exit:selftest` |
| D5 | `/dates` / Revise — "'Central' appears on row 1 only and is absent from rows 2–5" | landed + gate — the zone word opens every **venue group**, keyed off a `data-venue-key` handle the gate re-derives rather than trusting the flag; all five artifact rows print "Central" (**D397**, supersedes D327's once-per-page) | `src/components/EventRow.astro`, `src/components/Schedule.astro` | `check:row-geometry` grew from 17 to 23 selftest cases @measured 2026-11-17 |
| D6 | `/dates` / Revise — "the format words are never defined on this page… Add five words at first use" | landed — the definition goes in the lede immediately after the rhythm sentence, which is the page's own first use; the words are the two names `src/lib/event-groups.mjs` owns, so the definition cannot coin a third kind of meeting (**D405**) | `src/pages/dates.astro` | `check:naming` (unchanged rule: the row headings stay the two names) |
| D7 | `/dates` / Add — "The rhythm, as the page's opening line" | landed + gate — same generated sentence as home, so the two surfaces cannot be edited apart (**D383**) | `src/lib/rhythm.mjs`, `src/pages/dates.astro` | `check:copy` |
| D8 | `/dates` / Add — "A redirect `/schedule` → `/dates`. It 404s today… Three lines in the Workers config" | landed + gate — `astro.config.mjs` `redirects` answers `/schedule` with a **301** to `/dates`; `curl -i http://localhost:4321/schedule` against the dev server prints `HTTP/1.1 301 Moved Permanently` and `location: /dates` @measured 2026-11-17, and `dist/server/entry.mjs` carries the route as `"type":"redirect"…"status":301,"destination":"/dates"` in the shipping Worker (**D408**) | `astro.config.mjs` | `check:site-host` (the sitemap and the canonical set still agree) |
| J1 | `/join` / Remove — "'Nothing here says what a meeting costs…' — the same sentence as home" | landed + gate — same two sourced slots as H1, painted through the same call, so the pair cannot appear twice as a refusal and once as an answer | `src/content.json`, `src/lib/content.ts`, `src/pages/join.astro` | `check:content`, `check:copy` |
| J2 | `/join` / Remove — "The club has no front desk and no phone number"; "no single door this site could give directions to"; trademark line | landed + gate — the institutional-absence sentences are gone (`grep -ric "front desk" dist/client` prints 0), and the legal line is the **whole sentence in the band's colophon**, which supersedes D366's split between a band clause and a `/join` paragraph (**D393**, **D394**) | `src/pages/join.astro`, `src/components/Footer.astro`, `scripts/check-copy.mjs` | `check:copy`, `check:copy:selftest` (the colophon line is now a band rule, not page prose) |
| J3 | `/join` / Revise — "Section order: Follow the club → Come to a meeting → Talk with us now → What we do… Move 'What we do' to the top; then order the doors by ascending commitment" | landed + gate — "What we do" moved from fourth to first, and the doors run in `CHANNEL_KINDS`'s ascending-commitment order, which `check-join-page`'s join-order rule **reads rather than re-types** (**D391**). Artifact h2 order: What we do › Come to a meeting › Talk with us now › Follow the club › Your first one | `src/pages/join.astro`, `src/lib/rsvp.mjs` | `check:join`, `check:rsvp`, `check:rsvp:selftest` (the canonical order is derived from the list) |
| J4 | `/join` / Revise — "H1 'Ways in', and nav label 'Ways in'… Recommend nav `Join`, H1 `Join the club`, and 'Ways in' demoted to the lede line" | landed + gate — nav label `Join`, H1 `Join the club`, `<title>` stem `Join the club` moved in one commit, because `check:naming`'s name-not-on-page rule ties the nav word to the page's own heading (**D390**). `grep "Ways in"` over the built pages prints 0; the lede keeps the phrase in words | `src/pages/join.astro`, `src/components/Navigation.astro`, `src/layouts/Layout.astro` | `check:naming` |
| J5 | `/join` / Revise — "'Your first one'… Rewrite as three short rules — what happens in the first ten minutes, what to bring (nothing), what's expected (nothing) — and add the one sentence no peer omits: *buy a coffee; that's the rent.*" | landed — three rules ship, on the coffee line first: "Walk in, find a table, buy a coffee if you want one — that is the rent." / "Bring nothing…" / "Expect nothing…" A prediction parses faster than four negations (**D392**) | `src/pages/join.astro`, `src/components/Schedule.astro` | none — copy only |
| J6 | `/join` / Add — "Cost, in one line" | landed + gate — the same sourced `cost` slot as H1: "Free." | `src/content.json`, `src/pages/join.astro` | `check:content` |
| J7 | `/join` / Add — "A mailto" | **declined with evidence** — `dig +short MX matheapolis.com` and `dig +short MX minneapolismathbookclub.com` each printed **no record at all** @measured 2026-11-17 CST (Linux native), so neither zone carries an address service and printing one would invent it (**D403**). Trigger: the day the operator provisions Cloudflare Email Routing (or any address) for the zone, the line lands on `/join`; the probe keeps q13 reporting UNANSWERED with `declinedBy` naming the shapes that used to satisfy it, so the next session sees an open question with a ruled answer | `src/pages/join.astro` (unchanged for this item), `design/visitor-questions.mjs` | `check:ext-links` (no new outbound path shipped) |
| C1 | `/chat` / Remove — "The empty section: `The bot's reading of the channels` — a heading, one sentence, then the next H2… Kill the heading until there is content under it" | took the letter's alternative — the letter offered, under C4, "ship a warm static state — 'No summary this week. The channel is the live thing.'" That state shipped, in DESIGN.md's notice grammar: "No summary written this week" with one body line, on the branch the server paints — so it is an operator-granted draft and §4 names it (**D409**) | `src/components/DiscordSummary.svelte`, `src/pages/chat.astro` | `check:render:dist`, `check:ics` (the empty state is a designed state, never silence — record 0010) |
| C2 | `/chat` / Remove — "One of the three Discord invites on this page… Three identical buttons is a choice the reader has to make for no reason (Hick's law)" | landed + gate — the invite the pending state **carried inline** is the one deleted, because it is the same path the page already offers twice in the ratified construction (**D410**). The page keeps three Discord anchors (fold secondary, card primary, exit band) and prints 2 outbound anchors outside the band against a cap of 6 @measured 2026-11-17 | `src/components/DiscordSummary.svelte`, `src/pages/chat.astro` | `check:page-exit`, `check:ext-links` |
| C3 | `/chat` / Remove — "The duplicated thread list… The destination must add something the teaser didn't" | took the letter's own criterion rather than its Move — the list **stays** (it is the page's substance, and deleting it leaves `/chat` with one button), and what changes is the lead: the page stopped restating what the home teaser already said and now says what this page adds over it (**D411**) | `src/pages/chat.astro` | `check:content`'s near-duplicate-surface rule fired on the subtitle/lead pair and the pair was resolved in the same commit; `check:threads` |
| C4 | `/chat` / Revise — "H1 'Summaries from the chat'… The page is named for a thing that isn't on it" | landed + gate — H1 is now "The club's chat", named for what the page holds; the lede names the three things it carries (**D411**'s rename, shipped with the state in **D409**) | `src/pages/chat.astro`, `src/layouts/Layout.astro` | `check:naming`, `check:copy` |
| C5 | `/chat` / Revise — "The illustration caption: 'drawn for this site in the plates' line language: ink hairlines, no fills. Not a scan of a book.'" | landed + gate — the caption keeps the provenance and loses the **thread name quoted inside it**; the demotion was already shipped as a small caption under the figure, and the repetition is what made the line read as part of the list (**D412**) | `src/components/ThreadFigure.astro` | `check:line-art` |
| S1 | Feed / Remove — "From `events.ics`: 'The calendar file carries the club's 7 dates from Nov 7, 2026 through Dec 19, 2026.'" | landed + gate — same generated sentence as D1: the fact (the window the file reaches) stays inside the file because a subscriber holds bare `DTSTART`s; the framing and the count leave (**D399**). `grep "calendar file carries" dist/client/events.ics` prints 0 | `src/lib/ics.mjs`, `src/lib/event-description.mjs` | `check:ics` — `feed-meta-commentary` with 2 plantings and 2 clean controls, 45 plantings 0 undetected @measured 2026-11-17 |
| S2 | Feed / Revise — "The feed's `URL` field points to `mobilizon.labradorius.com` while every row on `/dates` points to Meetup" | took neither literal option, and says so — the letter offered "make the feed's URL the Meetup event URL" or "name Mobilizon on `/dates`". Naming a platform on `/dates` reintroduces the "platform the site never mentions" one surface over, and a Meetup event URL is not always in this snapshot. `feedUrl()` is a **lookup** resolved through the same resolver the pages use, so the URL a subscriber follows is the club's own page for that date, and `check:ics` re-runs that lookup instead of remembering a URL (**D398**) | `src/lib/ics.mjs`, `src/lib/rsvp.mjs` | `check:ics` gained `feed-url-shape` (plantings both directions: a URL reverted to the source platform's, folded through the renderer's own `contentLine`; and a row whose URL was dropped) |
| S3 | Site-wide / Revise — "Nav: three labels plus the chip… `/past` is reachable only from a line at the bottom of `/dates`, i.e. it is an orphan that exists to be found and disappoint" | landed + gate — the chip stays (the letter called it excellent), the nav gains **no** fourth label, and the orphan's only door is deleted with D404's trigger, so the orphan and the empty shelf are one ruling (**D404**, same letter as D3) | `src/pages/dates.astro`, `src/components/Navigation.astro` | `check:site-host`, `design/link-ceiling.mjs` |
| S4 | Site-wide / Keep — "The 404… 'Everything we have sits behind one of these links.' Don't touch it." | kept — `git log --format="%h %s" staging..HEAD -- src/pages/404.astro` prints **nothing**: the round touched no line of the 404 page. The artifact still prints "Everything we have sits behind one of these links." | none | none — `check:page-exit` and the band rules cover it unchanged |
| S5 | Site-wide / Add — "Page titles with the category and the city… `Dates — Matheapolis, a Minneapolis math club`" | landed + gate — every page's title names the page, the site and the city, and `og:title` mirrors the **page** title instead of one site-wide string (**D396**). Artifact: `Dates - Matheapolis, a Minneapolis math club`, `Join the club - …`, `Chat - …` | `src/layouts/Layout.astro`, `src/config.json` | `check:copy`, `check:copy:selftest`, `check:site-host` (the canonical/og/twitter tag set) |

## 3. The letter's six "what to do this week" items, mapped

Each of the six is one of the rows above, so none of them is a second ask. This table exists so a reader of the
letter's priority list can find the row that closed it.

| # | the item | row(s) that closed it | shipped in |
|---|---|---|---|
| 1 | Answer cost and membership in one line (home hero, `/join`) | H1, J1, J6 | `fe1bb9b`, `723f7a4` |
| 2 | State the rhythm (home hero and `/dates` lede) | H8, D7 | `a271c87`, `cf3948f` |
| 3 | Point the home primary at the Nov 21 event, not at `/join` | H6 | `fe1bb9b` |
| 4 | Rewrite `### How it works` as the first ten minutes | H5, H9, J5 | `fe1bb9b`, `723f7a4` |
| 5 | Delete the "Nothing here says what a meeting costs" sentence everywhere | H1, J1 | `fe1bb9b`, `723f7a4` |
| 6 | Give `/chat` a real state or a warm empty one, and unlink `/past` | C1, D3, S3 | `0b9db03`, `cf3948f` |

## 4. The claims ledger — sentences shipped as the operator's draft, not as a grounded fact

Every sentence in this table is painted in `dist/client` today and is **not** grounded in a source this tree can
read: it is the operator's word, granted for a draft (S052's letter: "All ~40 items, including anything needing a
fact about the club" and "It's a draft, and we can correct errors when you are complete with this goal"). The
repo's rule is that a claim names its source, so the grant **is** the source and is written beside the word — but
a later session must not read these as facts. Each row names the correction path and the gate that would notice
if the correction were skipped, so the correction is a thing a machine sees, not a thing a reader hopes for.

The ledger's data half lives in `src/content.json`: each draft slot carries `source` (naming the grant and the
D### that records it), `asOf`, and a `correction` path. `scripts/check-content.mjs` prints those slots as a
ledger section and fails a draft-granted slot that carries no correction path — the rule that makes this table
an invariant for the data-backed claims (**D415**). The markup rows below have no slot to hold a correction, so
their correction path is a file and a line.

| id | the sentence as shipped | painted on | granted by | grounded? | correction path | the gate that would notice |
|---|---|---|---|---|---|---|
| C1 | "Free." | `/` (the acceptance block), `/join` ("Your first one") | operator grant 2026-11-16, **D381**; no source in this tree states a price | **draft** | `src/content.json` → `cost.value` (a slot, not markup: the operator's word replaces it without touching a component) | `check:content` (a painted claim with no source fails); `check-content`'s `draft-claim-uncorrectable` (a draft slot without a `correction` fails) |
| C2 | "No membership needed - you just come." | `/`, `/join` | operator grant 2026-11-16, **D381** | **draft** | `src/content.json` → `membershipRule.value` | as C1 |
| C3 | "Usually six to twelve people at a table." | `/` (the acceptance block) | operator grant 2026-11-16, **D385**; the club keeps no attendance record in this tree | **draft** | `src/content.json` → `turnout.value`. Do **not** move this line into prose: `check:rsvp-page` exempts a spelled-out count only when it sits inside a sourced slot, so prose copy of the same sentence would fail the build | as C1, plus `check:rsvp-page`'s count rule (D265) |
| C4 | "Walk in, find a table, buy a coffee if you want one — that is the rent." | `/` (How it works), `/join` (Your first one) | the round-6 review's recommendation, shipped on the operator's grant (**D392**); no source states what a visitor does on arrival | **draft** | `src/components/Schedule.astro` and `src/pages/join.astro` (markup, not a slot). If the operator's correction is long enough to want a phone, the line moves to a `content.json` slot in the same commit that changes it | `check:copy` (the pair printed on both surfaces is one string: change one and the gate sees the other), `check:content`'s near-duplicate pair |
| C5 | "Bring nothing, prepare nothing, and bring a question if you have one." (and `/join`'s two sibling rules) | `/`, `/join` | as C4 (**D392**) | **draft** | as C4 | as C4 |
| C6 | "Sign up for Sat, Nov 21" → `https://www.meetup.com/minneapolis-mathematics-book-club/events/317242488/` | `/` hero primary | the **URL is grounded** (the row is in `data/meetup-events.json`, harvested from the club's feed, and `check:rsvp` fails the build if the snapshot is older than 14 days); what is **draft** is that the label names a date the next harvest can move | draft label, grounded URL | nothing to edit by hand: the label is generated from the printed date by `signUpPaths()`, so the next harvest re-labels it. If the club posts the sign-up somewhere other than that event page, the operator's word changes `src/lib/rsvp.mjs`'s resolver | `check:rsvp` (snapshot freshness), `check:rsvp-page` (the primary control must answer the printed date) |
| C7 | "No summary written this week" (and its body line) | `/chat` | the warm state is the reviewer's wording shipped on the grant (**D409**); the bot's output is a deploy-credentials state this seat cannot read, so the page claims nothing about whether a load succeeded | **draft** | the string lives in `src/components/DiscordSummary.svelte`; the trigger that replaces it with real summaries is the credentials the operator holds (**MS27**'s row). The state deliberately carries no frequency and no count | `check:render:dist` (the section is a designed state, never silence), `check:copy` |
| C8 | the mailto address | **not shipped** — J7 declined with evidence (**D403**) | n/a | n/a | when the operator provisions an address for the zone, the line lands on `/join`; §2's row J7 carries the trigger | q13 stays UNANSWERED in `design/visitor-questions.mjs`, so a future session sees an open question rather than a closed one |
| C9 | "Saturdays at noon for a social, Wednesdays at 6 pm for a study session." | `/`, `/dates` | **grounded, not draft**: the sentence is generated by `src/lib/rhythm.mjs` from the rows `data/events.json` publishes (**D383**), so it moves with the calendar and cannot be contradicted by hand | grounded | none — to change the wording, change `rhythm.mjs`; the cadence word rule (D92) still requires a source for any frequency word that reaches prose | `check:ics` (the same generated string reaches the feed), `check:content`'s cadence rule |

The ledger is complete over what the artifact paints today: `check:content` prints three draft-granted slots
(`cost`, `membershipRule`, `turnout`), and C4–C7 are the markup sentences the round shipped on the same grant.
No other painted sentence on any built route depends on an operator word that this tree cannot read — the
remaining sourced claims name a source that is re-readable (the venues list, the threads list, the member-list
sentence, the `cadence` "Monthly" with the operator's 2026-10-31 ruling, the dates and venues from the harvested
feed).

## 5. What the letter said the peers do that this site now does

The peer table's twelve dimensions are the letter's own ranking, and each now has a row here:

| dimension | the letter's gap | what the artifact does now |
|---|---|---|
| States the next date | Closed | unchanged: the hero prints the date, the hour with its zone, and the venue |
| States a repeatable rhythm | Biggest single gap | **closed** — generated cadence sentence on `/` and `/dates` (H8, D7) |
| States cost | Severe | **closed** — "Free." on `/` and `/join` (H1, J6), as C1 in the ledger |
| Says what happens in the first 10 min | Severe | **closed** — the three rules (H5, H9, J5), as C4/C5 |
| Says who comes | Severe | **partly closed** — the headcount (C3); no names, no faces, no testimonials: the site keeps its rule against a member tally dressed as a headcount (D276), and the faces are MS32's photograph |
| Shows the room | Severe | **not closed** — MS32 stays blocked: no photograph of an actual meeting exists in the archive, and a stock room is forbidden ("a stock room is worse than no room") |
| One primary CTA | Moderate | **closed** — the artifact carries exactly one `data-control="primary"` control on `/` |
| Social proof | Moderate | **partly closed** — one sourced quantity about the room (C3); testimonials and press stay out of scope, since the club keeps no record this tree could quote |
| Archive of past meetings | Moderate | **ruled, not polished** — `/past` stays built, unlinked, `noindex`ed until it holds three completed meetings (D404) |
| Contactable human | Small | **declined with evidence** — no zone carries an address service (J7, D403); the page still offers the path a visitor can actually take (the channel) |
| Subscribable calendar | You win | kept — and its DESCRIPTION lost the sentence that talked about the website inside the club's calendar (S1) |
| Stated data provenance | You win | kept, and its position changed: the stamp sits beside the file it qualifies, not in the doorway (H3, D2) |

## 6. The gate changes this round made, and the decision that justifies each

Every row below changed an invariant in the **same commit** as the copy that made it stale, and each ships with
plantings in each direction so the rule is a detector and not an assertion. Run them to see it:

| gate | what the round added | plantings @measured 2026-11-17 | decision |
|---|---|---|---|
| `check:page-exit` | refuses a band nav carrying a path the page's own nav printed above the body | 14 cases, 0 wrong — planting in each direction plus a clean control that the band's identity line to `/` is not a repeat | **D407**, with **D395**'s copy |
| `check:row-geometry` | the zone word opens every venue group, keyed off a re-derived `data-venue-key` handle | 23 cases, 0 wrong (two venue groups each opening with the word, two dates at one venue naming it once) | **D397** |
| `check:ics` | `feed-url-shape` (re-runs the renderer's own `feedUrl()`) and `feed-meta-commentary` | 45 plantings, 0 undetected, 2 of them clean controls for the new rules | **D398**, **D399** |
| `check:rsvp-page` | `COUNT_RE` catches spelled-out numbers as well as digits, exempted only inside a sourced slot | shipped with the headcount in the same commit | **D385** |
| `check:copy` | the legal line is a band rule, and the page titles name page + site + city | shipped with the colophon and the titles | **D394**, **D396** |
| `check-rsvp` / `check-join-page` | the door order is **read** from `CHANNEL_KINDS` rather than re-typed | canonical order derived from the list | **D391** |
| `check-content` | `draft-claim-uncorrectable`: an operator-granted slot must carry a `correction` path and an `asOf`, and the slots print as the ledger | 25 cases, 0 wrong — the plant is the shipped `cost` slot carrying only the grant as its source, and the clean control is the same slot carrying `asOf` and `correction` @measured 2026-11-17 by `npm run check:content:selftest` | **S053**, **D415** |
| `check:tables` | the round's own two docs join the tracked set whose tables are cell-count audited | 3 plantings caught, 4 clean forms pass; over the two docs **26 tables across 7 tracked files, 0 mismatched rows** @measured 2026-11-17 by `npm run check:tables:selftest` and `npm run check:tables` | **D416** |

## 7. What the letter said it still owes

The letter's last line: "One thing I still can't judge: the rendered hero… Attach the 1440 and 390 PNGs from
`.design/render/` and I'll review composition instead of prose". The renders are handed over. They live in
`.design/tmp-ground/`, not `.design/render/`, because the instrument that paints a whole page and reads its
bytes is `design/pixel-ground.mjs`, and its scratch home is `.design/tmp-ground/` (`design/README.md`: `.design/`
is gitignored scratch, so a fresh clone cannot have these — they are for the operator's eyes this week, not for
a clone). Two images per width: the whole page, and a crop that stops below the acceptance block. Regenerate them
with `node design/pixel-ground.mjs --routes / --widths 1440 390` and then `node design/hero-crop.mjs` — the cropper
landed in `design/` (tracked) in this same round, because a claim these paths carry needs a probe behind it (D282).

| width | whole page | hero crop | measured |
|---|---|---|---|
| 1440 | `.design/tmp-ground/ground-root-1440.png` (1440x2917) | `.design/tmp-ground/hero-root-1440.png` (1440x1200) | @measured 2026-11-17 by `node design/pixel-ground.mjs --routes / --widths 1440 390`; the acceptance block's five answers sit at 136–192, 373–397, 462–518, 590–638, 590–638 with **0 of 5 past an 844 fold** @measured 2026-11-17 by `FOLD_WIDTHS=1440,390 node design/fold-answers.mjs --no-build` |
| 390 | `.design/tmp-ground/ground-root-390.png` (390x4066) | `.design/tmp-ground/hero-root-390.png` (390x900) | as above; answers at 136–176, 439–487, 551–607, 700–748, 760–808, **0 of 5 past the fold** |

The crops run to 1200 at 1440 and 900 at 390 — past the last answer in each column (638 and 808) — so the
plate, the mark and the primary control are all inside the frame the reviewer will read.

That is the composition pass the reviewer asked for, and it is the operator's to read: this round judged no
type, no spacing and no composition, and it changed no token, no radius and no spacing, which is why the
gates that moved are copy gates and route gates rather than render gates.

## 8. What stays the operator's

- **Merges and deploys.** `staging` receives this branch and `origin/staging` is pushed under the grant already
  in force (**S050**, **S051**, **D124**); `main`, every merge into `main`, and every deploy stay the operator's
  (**D42**). The production URL cutover for the three names is a Cloudflare-dashboard rule behind that grant
  (MS25's row), and **D245**'s gap is still open: production answers a 2026-10-31 artifact while every gate
  reads `dist/`.
- **The claims in §4.** The operator's correction of each row is the next letter; the correction paths are in the
  table, and **D415**'s rule is what makes an uncorrected draft slot fail a build rather than ship silently.
- **MS32** — the meeting photograph (both clauses of its trigger, in one letter).
- **MS25/MS27** — the OG engraving crop, the N1 series names, the mobile date chip, and the bot-credentials
  half of C7.
