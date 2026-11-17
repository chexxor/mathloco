# Matheapolis — the communication-science review (round 6), 2026-11-16

This document is **not** this seat's read. It is an external reviewer's letter, saved **verbatim** so the
seat that executes it can cite the same words the reviewer wrote, and it is the authority this round works
against. The answer to it — every item mapped to landed / landed with a gate change / declined with evidence
— is in `docs/reply-to-the-communication-review-round-6-2026-11-16.md`.

## 0. Provenance — what this letter read

| | |
|---|---|
| **This doc lives on** | `staging`, at the tip of this round. The round was cut on `communication-round-6` from `staging` @ `65d406e`, and **2026-11-17 the operator granted the merge into `staging`, the push, and the deletion of that branch (**S057**)** — the ref named here therefore no longer exists, and the work it carried (this letter, the reply, the copy, the gate changes) is on `staging`. This row states the **cut point and never a commit count** (**S051**'s "pointer rows follow refs" rule: a count written into a prose row is an expiry, not a fact, and this row was already stale when the round's second commit landed); verify with `git log --oneline 65d406e..staging \| cat`. **S046**/**D354**'s rule is unchanged — a read and its execution live on **one** branch; it is the *ref* that was deleted, not the work. `check:tables` cannot see this drift: its ref pattern matches `refs/heads/(main\|staging\|qa/[a-z-]+)` and `origin/`, which name neither a feature branch nor a `staging..HEAD` range, so the re-key at deletion is what **ruling S059** (**D425**) makes a rule instead of a habit (**D380** re-applied, not superseded)
| **The artifact it read** | the **staging preview**, not production. Its six footnote targets are all `staging.matheapolis.com`, and its `[^5]` row is `Page not found` at `/schedule` — which only the **post-**D373 artifact prints, so the letter read the tree after the `/schedule` → `/dates` sweep and after the `/past` route landed (**D374**). Re-confirmed against the live preview this session @measured 2026-11-16 CST by `npm run probe:live` (Linux native, Node 24.22.1, 16 CPU): `https://staging-minneapolis-math-book-club.chexxor.workers.dev/` **200 / 26,417 b**, `/dates` **200 / 36,796 b**, `/events.ics` **200 / 8,260 b / 7 `VEVENT`s**, `/` and `/dates` carry `x-robots-tag: noindex` on the workers.dev origin. Production answers a **different** artifact (`https://matheapolis.com/` title reads `Math Enthusiasts Meetup`; the probe prints `same page: no`, `live is missing: rename, wordmark step`) — the gap between a branch and a deploy is **D245**'s, and nothing below is a judgment about what the live site ships |
| **What the letter is made of** | the copy and the markup, plus the feed as text: "I have the copy and the markup, not the rendered pixels, so nothing below is a judgment about type or spacing." Its per-route citations are `[^route#line]` anchors into its own read of those pages, and its two named open gaps — the rendered hero, and the peer comparison table — are the reviewer's, not this repo's |
| **How it differs from the round-5 read** | round 5 (`docs/communication-read-2026-11-15.md`) is this seat's: five probes, per-route word counts, a 29-question visitor inventory, prices in gzipped bytes. This letter is an external reader's: it brings **peer standards** (OSR, parkrun, CreativeMornings, Silent Book Club) and **uncertainty/reading theory** (peak-end, information scent, Hick's law) that no probe here produces, and it recommends against the site's own discipline. Where they disagree, this round records both, and the reconciliation is in the reply |
| **Rigor the letter does not carry** | no instrument, no `@measured` stamp, no count it can be re-run against. Every number in it is the reviewer's estimate — "roughly a third of the home page's sentences", "eight controls on home", "two-thirds of OSR's page". The repo's rule is that a measured number names its probe, so a figure quoted from this letter is always quoted **as the letter's**, never restated as this repo's measurement (**D382**) |

## 1. The letter, verbatim

> The site has gotten better and the improvements are real: the hero states the next meeting and the venue, `/dates` filters cancelled events correctly, the source names are mapped to "Social" and "Study session" instead of the dead brand, and there is now a `/past` route.
>
> But there is one defect underneath all the per-page ones, and it is a writing problem, not an engineering problem:
>
> **The site is written for an auditor, not for a visitor.**
>
> Every page answers some version of *"can this website be trusted?"* — and no page answers *"should I come?"* Roughly a third of the home page's sentences are about the website rather than the club: that it does not state a price, that a page can't tell you whether the room suits you, that the member list isn't the room, that the site drops no pin. The provenance discipline is genuinely better than every peer I've shown you. It has escaped its container and is now standing in the doorway.

> ### Where you stand against the expert-grade peers
>
> | Dimension | Matheapolis now | Peer standard | Gap |
> |---|---|---|---|
> | States the next date | Yes, in hero | OSR, parkrun | **Closed** |
> | States a repeatable rhythm | Never stated anywhere | OSR: "TUESDAY NIGHTS, 6:45" | **Biggest single gap** |
> | States cost | Actively declines to | Resistor, CreativeMornings answer in one line | Severe |
> | Says what happens in the first 10 min | No | parkrun makes it a scheduled ritual | Severe |
> | Says who comes | No names, no count, no faces | All seven peers | Severe |
> | Shows the room | No photograph, ever | Silent Book Club, OSR | Severe |
> | One primary CTA | Eight controls on home | OSR: one | Moderate |
> | Social proof | None | Testimonials, attendance, press | Moderate |
> | Archive of past meetings | Route exists, empty, and the only history is two cancellations | Two-thirds of OSR's page | Moderate |
> | Contactable human | "no front desk and no phone number" | Every peer has a mailto | Small |
> | Subscribable calendar | Yes, and correct | **None of the peers have one** | **You win** |
> | Stated data provenance | Yes | **None of the peers do this** | **You win** |
>
> The two rows at the bottom are your actual competitive advantage. Keep them. The nine above them are the job.

> ### Home
>
> | Move | Item | Why |
> |---|---|---|
> | **Remove** | "Nothing here says what a meeting costs, and no price is printed. Nothing here says whether you must be a member to come, and no rule is kept." | This is the worst paragraph on the site. It answers the visitor's most important question by announcing that the site won't answer it. Uncertainty-reduction theory says a stranger's first task is reducing uncertainty about cost and belonging; a sentence that *points at* an unresolved cost is worse than silence, because it converts an unasked question into an anxious one. Replace with "Free." or with the actual number. |
> | **Remove** | "Whether the room is your kind of room is not something a page can tell you." | Your best-written sentence, in your worst position: the closing line before the visitor decides. It concedes the exact thing a website is for. If a photograph exists it becomes unnecessary; if it doesn't, move it to `/join`. |
> | **Remove** | "the list is not the room", "this site drops no pin", "last read 14 days ago" | Provenance marketing that reads as decay. "14 days ago" is an admission, in relative time, that nobody has looked. Keep the fact; move it to a footer colophon as an absolute date. |
> | **Revise** | `## When we meet` contains no date — two links, then a different section | A heading that promises a fact and delivers navigation is the clearest information-scent failure on the site (Pirolli & Card: users commit to a link on the expectation its label creates). Open this section with the Nov 21 line and put the calendar link after it. |
> | **Revise** | `### How it works` describes the *website's* data policy — 15 venues, member-list freshness, no map pin | This is the correct heading for the highest-value missing content: the first ten minutes. What happens at 12:00, who talks first, whether you buy a coffee. You have the heading and are spending it on disclaimers. |
> | **Revise** | Primary CTA "Join Our Group" | Names no outcome, is the only Title Case string on the site, and sends a visitor who has already decided on Nov 21 two clicks away from signing up. Make the primary `Sign up for Nov 21` → `meetup.com/.../events/317242488/`, secondary `All 5 dates →`. That is one click to conversion instead of three. |
> | **Revise** | Terminology: "See the dates", "the schedule", "All 5 dates", "the dates page" | Four names for one page on one screen. Pick `dates` everywhere, matching the nav chip. |
> | **Add** | The rhythm, in one clause near the date | Verified from your own data: Saturdays 12–1 at Angel Food Bakery, Wednesdays 6–8 at Kowalski's. That's a legible cadence — "Saturdays at noon, most months; Wednesday evenings for study" — and a stated cadence is the single strongest habit hook a club site has (parkrun's entire growth model is one sentence: Saturday, free, just turn up). Costs one sentence, invents nothing. |
> | **Add** | Three lines: what happens when you walk in, what to bring, what's expected | The peer pattern (OSR's "Before joining") is *prediction*, not reassurance. Your current reassurance is five negations in a row and negation is slower to parse and less memorable than assertion. |
> | **Add** | One number about the room: "usually six to twelve people" | Social proof with a specific quantity. You have the venue count (15) — the best credibility figure on the site — and no figure about attendance, which is the one a stranger actually wants. |

> ### `/dates`
>
> | Move | Item | Why |
> |---|---|---|
> | **Remove** | "The calendar file carries the club's 7 dates from Nov 7, 2026 through Dec 19, 2026." | Meta-commentary about the file, and it invites the reader to notice that 7 ≠ the 5 rows shown. Both facts are true and together they read as a discrepancy. |
> | **Remove** | "no page here draws a route to it" and the duplicated calendar paragraph | The calendar explanation appears twice on one page; the "no route" sentence is a disclaimer about the site's capabilities. |
> | **Remove** | "Looking for a date that has already passed? Past meetings" | Never link to an empty shelf. `/past` currently renders "Nothing listed yet" followed by "the dates… that have already passed were announced cancelled" — accurate, and the worst possible first impression of a club with a history. Unlink until there are three completed meetings; `noindex` the route meanwhile. |
> | **Remove** | The footer nav that repeats the header nav verbatim | Doubles the link count to no benefit and competes with the body's single action. |
> | **Revise** | "Central" appears on row 1 only and is absent from rows 2–5 | Inconsistent and silently wrong for anyone outside the zone. Print the zone on the first row of each *venue group*, or on all five. |
> | **Revise** | Row headings as H3 "Social" / "Study session" | The mapping is correct and I'm glad it landed — but the format words are never defined on this page. A visitor arriving from search learns what a "Study session" is only by going to `/join`. Add five words at first use. |
> | **Add** | The rhythm, as the page's opening line | This page is where a planner lands. "Saturdays at noon, Wednesdays at six, most months" is the sentence they came for and it is derivable from the rows already printed. |
> | **Add** | A redirect `/schedule` → `/dates` | It 404s today. Old links, bookmarks and any past brief that named it now dead-end. Three lines in the Workers config. |
>
> ### `/join`
>
> | Move | Item | Why |
> |---|---|---|
> | **Remove** | "Nothing here says what a meeting costs…" — the same sentence as home | Two things wrong: it withholds the answer, and it appears twice on the site. |
> | **Remove** | "The club has no front desk and no phone number"; "no single door this site could give directions to"; trademark line | Three more statements about institutional absence, and a legal line in the body where a footer belongs. A page that lists what the club doesn't have, ending on trademarks, breaks the peak-end rule — the last thing read is the coldest thing said. |
> | **Revise** | Section order: Follow the club → Come to a meeting → Talk with us now → **What we do** | You describe the thing fourth, after offering three doors into it. A visitor must know what this is before choosing how to enter. Move "What we do" to the top; then order the doors by ascending commitment: come to a meeting · read the chat first · follow the feed. The current order starts at the lowest-value action. |
> | **Revise** | H1 "Ways in", and nav label "Ways in" | Charming, on-voice, and not what a first-timer scans for. They scan for "Join." Recommend nav `Join`, H1 `Join the club`, and "Ways in" demoted to the lede line where it still does its work. |
> | **Revise** | "Your first one" | One 60-word reassurance paragraph with four negations. Rewrite as three short rules — what happens in the first ten minutes, what to bring (nothing), what's expected (nothing) — and add the one sentence no peer omits: *buy a coffee; that's the rent.* |
> | **Add** | Cost, in one line | The highest-value sentence missing from the site. If attendance is free, "Free" is worth more than any paragraph here. |
> | **Add** | A mailto | You have no address, no form, no phone, and a Discord invite. One address costs nothing and gives the cautious visitor a private door — which matters more for this club than for a run crew, because the anxiety is intellectual as well as social. |
>
> ### `/chat`
>
> | Move | Item | Why |
> |---|---|---|
> | **Remove** | The empty section: `The bot's reading of the channels` — a heading, one sentence, then the next H2 | A section that promises summaries and delivers none is worse than a page that doesn't promise them. Kill the heading until there is content under it. |
> | **Remove** | One of the three Discord invites on this page | Three identical buttons is a choice the reader has to make for no reason (Hick's law). |
> | **Remove** | The duplicated thread list | This is the page's entire substance and it is word-for-word the home page's list, which home already calls "the rest of the list →". The destination must add something the teaser didn't. |
> | **Revise** | H1 "Summaries from the chat" | The page is named for a thing that isn't on it. If the bot output is a deploy-credentials issue, ship a warm static state — "No summary this week. The channel is the live thing." — instead of a heading over a void. |
> | **Revise** | The illustration caption: "drawn for this site in the plates' line language: ink hairlines, no fills. Not a scan of a book." | Provenance commentary about your own drawing, in a prominent slot. Keep the sentence; demote it to a small caption under the figure. |
>
> ### Site-wide, the feed, and the 404
>
> | Move | Item | Why |
> |---|---|---|
> | **Remove** | From `events.ics`: "The calendar file carries the club's 7 dates from Nov 7, 2026 through Dec 19, 2026." | This string lands in subscribers' Google Calendars on every event. It's a note about the website, delivered in the club's calendar, and it hardcodes a count that will be wrong next month. |
> | **Revise** | The feed's `URL` field points to `mobilizon.labradorius.com` while every row on `/dates` points to Meetup | A subscriber clicking through from their calendar reaches a platform the site never mentions. Either make the feed's URL the Meetup event URL, or name Mobilizon as the source on `/dates`. Right now two surfaces promise "the sign-up page" and disagree about where it is. |
> | **Revise** | Nav: three labels plus the chip | The chip `Dates 21 Nov` is excellent — keep it. But `/past` is reachable only from a line at the bottom of `/dates`, i.e. it is an orphan that exists to be found and disappoint. |
> | **Keep** | The 404 | Best copy on the site: "Everything we have sits behind one of these links." Don't touch it. |
> | **Add** | Page titles with the category and the city | Titles are `Dates - Matheapolis`, `Ways in - Matheapolis`. Only the home page's title says what the site is. `Dates — Matheapolis, a Minneapolis math club` costs nothing and is the whole of your SEO. |

> ### What to do this week
>
> Six items, ordered by value per hour. Everything above is cheap; these six are the ones that change whether a stranger comes.
>
> 1. **Answer cost and membership in one line** (home hero, `/join`). Even if the answer is "free, no membership" — especially then. This is the highest-value sentence on the site and it is currently a refusal.
> 2. **State the rhythm** (home hero and `/dates` lede): "Saturdays at noon for a social; Wednesday evenings for study." Already true in your data.
> 3. **Point the home primary at the Nov 21 event**, not at `/join`. One click to conversion instead of three.
> 4. **Rewrite `### How it works`** as the first ten minutes — buy a coffee, go round the table, no preparation — and delete the four sentences about the website's data policy.
> 5. **Delete the "Nothing here says what a meeting costs" sentence** everywhere it appears. It is the one line I would remove before anything else on this list.
> 6. **Give `/chat` a real state or a warm empty one**, and unlink `/past` until it holds three meetings.
>
> Everything else is polish, and the polish is worth doing — but if you ship only these six, the site goes from *scrupulously honest* to *honest and inviting*, which is the gap between Matheapolis and Orchard Street Runners.
>
> **One thing I still can't judge:** the rendered hero. The copy now carries the right facts, and whether the page *feels* confident or bureaucratic is a matter of type, spacing, and whether the engraving is allowed to be a picture rather than a footnote. Attach the 1440 and 390 PNGs from `.design/render/` and I'll review composition instead of prose — that's the last review I can usefully give without them.

## 2. What the letter's own references are

The letter's six footnote targets, kept because they are what its percentages are weighted by:

1. `https://staging.matheapolis.com/` — Matheapolis, 30%
2. `https://staging.matheapolis.com/join` — Ways in, 23%
3. `https://staging.matheapolis.com/chat` — Chat, 22%
4. `https://staging.matheapolis.com/dates` — Dates, 11%
5. `https://staging.matheapolis.com/schedule` — Page not found, 11%
6. `https://staging.matheapolis.com/past` — Past meetings, 3%

Two of those six are the letter's own evidence that it read the post-rename artifact: `/schedule` answers
`Page not found`, and `/past` exists. Neither was true of the artifact round 5 read.
