# Matheapolis — the communication-science review (round 7), 2026-11-18

This document is **not** this seat's read. It is an external reviewer's letter, saved **verbatim** so the
seat that executes it can cite the same words the reviewer wrote, and it is the authority this round works
against. The answer to it — every item mapped once to landed / landed + gate / took the letter's alternative /
declined with evidence — is in `docs/reply-to-the-communication-review-round-7-2026-11-18.md`.

## 0. Provenance — what this letter read

| | |
|---|---|
| **Where this doc lives** | `review-round-7`, cut from `staging` @ `4d6f751`, which is where round 7's work ran to completion. Nothing on this branch is merged into `main` and nothing was pushed from it (**D42**, **D124**); `staging` itself moved on during the round under a different item's grant (**S063**, **D428**), so the branch is not the whole of what the review edge serves — re-verify with `git log --oneline -9 \| cat` and `git branch -v --no-color \| cat`, and read it as a cut point plus a range rather than a branch name once the branch is deleted (**D425**, ruling **S059**) |
| **The artifact it read** | the **staging review edge** — every footnote target is `staging.matheapolis.com`, and its `[^3]` row is `events.ics` at 5%. Two of its premises are stale against the edge this session measured: `/schedule` answers **301 → `https://staging.matheapolis.com/dates`** @measured 2026-11-18 UTC by `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://staging.matheapolis.com/schedule`, and `dist/client/_redirects` carries `/schedule` and `/schedule/` (D373's sweep, D408); and the feed body it quotes — *"the calendar file carries the club's 7 dates from…"* — is not what the shipped file says today. So the letter read a build from before that sweep and before **D399**'s deletion of that framing |
| **What the letter is made of** | the copy, the markup, and the feed as text. Its own words: *"Nothing below is a judgment about type or spacing — I have copy and markup, not pixels."* Its five route footnotes are anchors into its own reads; its named open gap is the **rendered surface**, which it asks this repo to hand as PNGs |
| **How it differs from the round-6 letter** | round 6 (`docs/communication-review-round-6-2026-11-16.md`) argued from peer standards and reading theory against a site that had not yet shipped the cost word or the H1 fix. Round 7 reads a site that has, and turns to the surfaces the last six rounds never opened: the **feed**, which it calls *"the site's worst surface"*, and the **indexability** of `/past` |
| **Rigor the letter does not carry** | no instrument, no `@measured` stamp, no count it can be re-run against. Every figure in it is the reviewer's estimate — *"eight absolute URLs outside `<footer>`"*, *"two of the three Discord invites"*. A figure quoted from this letter is always quoted **as the letter's**, never restated as this repo's measurement (**D382**) |
| **The day, in both clocks** | the letter is dated **2026-11-18** (the reviewer's day, UTC); the rig's local clock read **2026-11-17 23:3x CST** for the same window. Measurement stamps in this pair name the UTC day and say so, because the rig is Linux native in CST (**D32**'s naming rule generalized: name the clock in every measurement) |

## 1. The letter, verbatim

> Respond to this updated design critique, correcting the deficiencies of mathloco in places you agree with the critique, and leaving a response for the critiquer on items you disagree on. I'll read all five routes fresh, plus the feed, before writing anything.Five routes and the feed read fresh. Nothing below is a judgment about type or spacing — I have copy and markup, not pixels.
> 
> ## What landed since last round
> 
> Real progress, and worth naming so it isn't lost in what follows:
> 
> | Fix | Evidence |
> |---|---|
> | Rhythm is now stated, in one sentence, at the top of /dates | "Saturdays at noon for a social, Wednesdays at 6 pm for a study session" [^a2eab6#10] |
> | Format words defined at first use | A social "is an afternoon around a table, with nothing to prepare" [^a2eab6#10] |
> | "Central" now on all five rows | [^a2eab6#18,32,46,60,74] |
> | Nav labels are the plain words | `Dates 21 Nov · Chat · Join` [^a2eab6#5] |
> | /dates title carries the city | [^a2eab6#1] |
> | The bot's summaries actually render | [^1] |
> | /past is no longer linked from /dates | [^2] |
> | Cancelled events correctly excluded from rows | 5 rows, 7 in feed [^2] vs [^3] [^3] |
> 
> ## The diagnosis, round 5
> 
> Three sentences have now survived three consecutive reviews, each time because they are individually defensible:
> 
> - "Nothing here says what a meeting costs, and no price is printed." — on home [^0327a0#19] and on /join [^8ce5a4#44]
> - "Whether the room is your kind of room is not something a page can tell you." [^0327a0#36]
> - "this site drops no pin" / "the list is not the room" / "last read 14 days ago" [^0327a0#50,52]
> 
> And there is a new, sharper symptom that confirms the same cause. The hero caption reads: *"Detail of a coloured engraving after John Byrne's 1847 Euclid, Book IV, proposition XV — cropped from that leaf **(D312)**"* [^0327a0#21]. **D312 is an internal decision number, printed on the home page.**
> 
> That single parenthetical is the whole problem in five characters. The site is being edited to satisfy a reviewer's audit trail, and the audit trail is now leaking into the artifact. A visitor who is used to leading websites will not read "D312" as provenance rigour. They will read it as a bug.
> 
> ## The benchmark you're being measured against
> 
> "Visitors used to leading websites" is a specific bar. Someone who has RSVP'd on Luma, Partiful, Eventbrite, or Meetup in the last year has a learned schema for an event page, and their expectations are:
> 
> | Expectation | Where it comes from | Matheapolis |
> |---|---|---|
> | Date, time, place, **price** in one block | every ticketing product | date ✓ time ✓ place ✓ **price: actively refused** [^0327a0#19] |
> | One RSVP button, on the page about the event | Luma, Partiful | the home CTA goes to /join, which goes to /dates, which goes to Meetup — **three hops** [^0327a0#11] [^8ce5a4#20] [^a2eab6#25] |
> | "Add to calendar" attached to the event | universal | only as a site-wide feed [^a2eab6#89] |
> | Who else is going / how many | universal | no count, ever |
> | A map or a directions link | universal | "this site drops no pin" [^0327a0#52] |
> | A photograph of the thing | universal | none |
> | A deadline or a "spots left" | event products | none |
> | A way to ask a question | universal | no mailto anywhere |
> 
> The last row is the one that surprises me most after five rounds. /join says: *"Want to ask something before you turn up? Somebody from the club reads the messages we post there"* — and "the messages we post there" links to **/chat** [^8ce5a4#42], which is a page of bot-generated summaries [^1]. The link promises a place to ask a question and delivers a page you cannot ask a question on. That is not a small wiring error; it is a visitor with a pre-meeting anxiety, given a door that opens onto a wall.
> 
> ## Per-page manifest
> 
> ### Home
> 
> **Remove**
> 
> | Item | Why it frustrates |
> |---|---|
> | `(D312)` in the hero caption [^0327a0#21] | Internal code visible to users. Delete all four characters. |
> | "Nothing here says what a meeting costs…" [^0327a0#19] | The worst sentence on the site, third round. It raises the price question specifically to decline it. Uncertainty reduction says the visitor's first job is resolving cost and belonging; a sentence that points at an unresolved cost creates anxiety it could have removed with one word. |
> | "Whether the room is your kind of room is not something a page can tell you." [^0327a0#36] | Beautiful sentence, terminal position, concedes the purpose of the page. Move to /join, last line, or delete once a photograph exists. |
> | "last read 14 days ago" [^0327a0#50] | Relative staleness, in public, as a selling point. Also unchanged from last round's reading — the same "14 days" two days later is itself a signal. |
> | "the list is not the room" [^0327a0#50] | An aphorism about data provenance, in a paragraph a visitor reads while deciding whether to come. |
> | "this site drops no pin" [^0327a0#52] | Disclaimer about the site's capability, standing where a directions link belongs. |
> | One of the two hero CTAs [^0327a0#11,13] | Two equal-weight controls and neither is an RSVP. |
> 
> **Revise**
> 
> | Item | To |
> |---|---|
> | `## When we meet` [^4] | Still contains **no date** — two links, then a different section. A heading promising *when* that delivers *navigation* is the clearest information-scent failure on the site, and it's still here after I flagged it last round. Lead with "Saturday, Nov 21 · 12:00 pm – 1:00 pm · Angel Food Bakery," then the links. |
> | Primary CTA "Join Our Group" [^0327a0#11] | It's Title Case (the only such string on the site), "Group" is ambiguous, and it points at a page that points at a page. Make it `Sign up for Nov 21 →` to the event URL already on /dates [^a2eab6#25]. That is one click to conversion instead of three, and it's the fix that most closes the gap to Luma-class expectations. |
> | "Join Our Group / Join the club / Join the Meetup group / Join the chat / Join on Meetup" | Five variants of "join" across four pages. Keep two: **Join the Meetup group** (the persistent thing) and **Sign up for Nov 21** (the specific date). Everything else becomes "the dates page," "the chat." |
> | "See the dates" [^0327a0#13], "All 5 dates" [^a2eab6#42], "the schedule" [^0327a0#36], "the dates page" [^0327a0#52] | Four names for one route. Use "dates" everywhere, matching the nav chip. "Schedule" now refers to a URL that 404s [^eb5107#1]. |
> | "Formerly the Minneapolis Mathematics Book Club" [^0327a0#17] | Buried mid-paragraph in an unrelated sentence about syllabi. If the former name matters for search, it belongs in the page title or a footer line, not spliced into the middle of a sentence about agendas. |
> | `### How it works` [^4] | Still spends the highest-value heading on the site on venue count and data policy. This heading should hold the first ten minutes: you arrive, you buy a coffee, someone says what they've been thinking about, you can listen. |
> 
> **Add**
> 
> | Item | Why |
> |---|---|
> | **Cost, in one line** | The single highest-value missing sentence. If meetings are free, "Free — buy a coffee if you want one" is worth more than every paragraph on the page. |
> | **Membership, in one line** | "No membership. Come once and see." Replaces the sentence that announces the site won't say. |
> | **A count** | "Usually six to twelve people." You already publish the venue count ("15 of them" [^0327a0#46]) — the least interesting number on the page — and not the one a stranger wants. |
> | **The rhythm** | /dates now says it [^a2eab6#10]; home doesn't. One clause near the hero date. |
> | **Three rules for arriving** | What happens, what to bring (nothing), what's expected (nothing). Assertions, not disclaimers. |
> 
> ### /dates
> 
> **Remove**
> 
> | Item | Why |
> |---|---|
> | "The club's dates run from Nov 7, 2026 through Dec 19, 2026." [^a2eab6#93] | **Factually contradicts the page it's on.** The rows run Nov 21 → Dec 19; Nov 7 and Nov 11 are cancelled and filtered out [^56ffd8#32,56]. A stated range that disagrees with the visible list is the kind of small wrongness that costs a lot of trust. |
> | The duplicated calendar paragraph [^a2eab6#89-91 and #97-99] | "Add to a calendar" appears twice, explained twice, in the same footer region. Say it once. |
> | "The street address printed with each date is the address to give directions to." [^a2eab6#95] | Describing the page's own layout to the reader. |
> | The footer platform row [^a2eab6#97] | With the rows, that makes **8 absolute URLs outside `<footer>`** — over the ceiling of 6 we ratified in round 4, because the "Between meetings" cluster and this row both carry Meetup and Discord. |
> | "Nov / 21 / Sat" as three separate list elements [^2] | Read aloud, each row announces the date three times before the sentence that states it, which states it a fourth: "Nov, 21, Sat, Saturday, Nov 21." Visually fine; audibly a stutter. Mark the block `aria-hidden` and let the full sentence carry it. |
> 
> **Revise**
> 
> | Item | To |
> |---|---|
> | "Copied from the club's own calendar 4 days ago" [^a2eab6#83] | Same decay problem as home. An absolute date ("checked Nov 17") ages honestly; "4 days ago" ages into an apology. |
> | Row heading "Social" / "Study session" [^2] | Correct, and defined — but defined in the lede above, not in the row. Keep as-is; this is now good. |
> | Ledger of what a "Study session" holds | The description lives on /join [^8ce5a4#34] and the calendar boilerplate [^3], not here. One line per format, in the row, so a search visitor never has to leave. |
> 
> **Add**
> 
> | Item | Why |
> |---|---|
> | **Per-event "add to calendar"** | Every row currently offers only a site-wide feed [^a2eab6#89]. Leading event pages attach the calendar action to the event. One `.ics` message per UID already exists in the feed — expose it per row. |
> | **A directions link per row** | The address is printed [^a2eab6#23]. A maps link is the single most-expected affordance on an event row and the site explicitly declines to provide one [^0327a0#52]. |
> | **A redirect `/schedule` → `/dates`** | Still 404s [^eb5107#1]. Third round. Old links, bookmarks, and any brief that named it dead-end. |
> 
> ### /join
> 
> **Remove**
> 
> | Item | Why |
> |---|---|
> | "Nothing here says what a meeting costs…" [^8ce5a4#44] | Same sentence as home. Twice on one site, and both times refusing. |
> | "The club has no front desk and no phone number" [^8ce5a4#46] | Institutional absence, stated as a feature. |
> | "there is no single door this site could give directions to" [^8ce5a4#48] | A whole paragraph explaining why the site can't do what every peer does. |
> | The trademark disclaimer from the body [^8ce5a4#50] | Legal boilerplate belongs in the footer — where /dates already puts it [^a2eab6#107]. In the body it makes the last thing read the coldest thing said (peak-end). |
> 
> **Revise**
> 
> | Item | To |
> |---|---|
> | H1 "Ways in" [^8ce5a4#1] | The nav now says **Join** [^a2eab6#5] and the H1 says **Ways in**. The nav fix made this mismatch worse, not better. H1 → "Join the club"; keep "Ways in" as the lede sentence, where it's charming instead of confusing. |
> | Section order [^5] | Follow → Come → Talk → **What we do**. You describe the club fourth, after three doors. Move "What we do" first, then order the doors by ascending commitment: come to a meeting · read the chat first · follow the feed. |
> | "The schedule lists each date and whatever the club has posted for it: a Meetup page, the chat, **or nothing yet**" [^8ce5a4#21] | "Or nothing yet" contradicts /dates, where all five rows have a sign-up link [^2]. Delete those three words. |
> | "Your first one" [^8ce5a4#40] | A 60-word paragraph containing five negations. Rewrite as three rules. |
> | "Somebody from the club reads the messages we post there" → /chat [^8ce5a4#42] | **The broken door.** Either point this at Discord (where you can actually ask) or add the mailto below. Do not leave a "ask us" link landing on bot output. |
> 
> **Add**
> 
> | Item | Why |
> |---|---|
> | **A mailto address** | Fifth round of asking. A closed club with no email, no form, no phone, and a Discord invite is asking a cautious stranger to perform in public before being allowed to ask a private question. For an intellectual club that anxiety is real and asymmetric. |
> | **Cost, one line** | Same as home. |
> | **The uneven bars named honestly** | A study session where people work side by side is intimidating to someone who assumes everyone else is further along. One sentence — "People bring textbooks, problem sets, and half-finished projects; nobody is teaching and nobody is being tested" — converts the most common reason to not come. |
> 
> ### /chat
> 
> **Remove**
> 
> | Item | Why |
> |---|---|
> | Two of the three Discord invites [^70749c#5, 43] | Two identical buttons, no choice made by the reader (Hick's law), same destination. |
> | "Cancellation of a math gathering" and "A cafe being closed for the day" [^1] | **This is the page's most damaging content.** A visitor's first impression of the club's intellectual life includes a café closure and a cancellation as peer items to quaternions and Lean. Two unedited bot lines undo the six threads below them. Filter operational noise out of the summary, or hand-edit before publish. |
> | "Not a scan of a book." [^70749c#37] | Provenance about your own drawing, as a body paragraph. Keep the sentence; make it a `<figcaption>` under the figure, at caption size. |
> | The duplicated thread list [^1] | Word-for-word home's list plus three. If /chat is where "the rest of the list" lands [^0327a0#34], it must visibly contain more than the teaser — it does, by three items, but nothing marks which three are new. |
> 
> **Revise**
> 
> | Item | To |
> |---|---|
> | "Written by our bot from recent channel activity · last updated Nov 17, 2026, 2:44 AM UTC" [^70749c#7] | **UTC on a Minnesota site.** Every reader is 5–6 hours off, so the freshness claim reads as overnight-stale. Print Central, and print the summary window in words ("Nov 1–12"), not `11/1/2026 - 11/12/2026` [^70749c#11] — the only M/D/Y string on a site that uses "Nov 21" everywhere. |
> | `#### Chat Topics Summary` [^70749c#13] | Title Case, and a fourth nested label all saying "summary" (H1 "Summaries from the chat" → "Channel summary" → "Chat Topics Summary"). One label. |
> | Heading ladder | H1 → `#general` (not a heading in the markup) → H3 → H4. Skipped level at the top. Make `#general` an H2. |
> | "## The chat itself" [^1] | Restates the H1. Either it's the page's real purpose (then it belongs above the summary) or it's a footnote. |
> 
> **Add**
> 
> | Item | Why |
> |---|---|
> | One line of human framing above the bot text | "The channel is the live thing; this is the bot's attempt at a summary of the last two weeks." Right now the page is 100% machine voice with no human in it — the opposite of a club. |
> 
> ### The calendar feed — the page nobody reviews
> 
> This is now the site's worst surface, and it is the one you can't restyle.
> 
> | Defect | Evidence | Why it matters |
> |---|---|---|
> | **Dead brand in every subscriber's calendar** | `SUMMARY:MPLS Math Club - Bimonthly Social` [^56ffd8#31]; `SUMMARY:Common Denominator - Study Session` [^56ffd8#102,149] | Round 4's mapping is render-only. The site says "Social"; the feed says the old brand and an internal codename. A subscriber sees a name the website never mentions, in their own calendar, permanently. |
> | **Website meta-note in every event body** | "The calendar file carries the club's 7 dates from Nov 7, 2026 through Dec 19, 2026." on all 7 events [^56ffd8#40,63,87,110,134,157,181] | A note about the website, delivered into someone's calendar app, with a hardcoded count that is wrong within weeks. Third round of flagging. |
> | **Wrong city, generic body** | "in Minneapolis" [^56ffd8#36] on events at Angel Food Bakery, Saint Louis Park [^56ffd8#33] | Same boilerplate on every event instead of per-event content. |
> | **Two sign-up destinations** | Feed `URL:` → `mobilizon.labradorius.com` [^56ffd8#43,66,90]; every row on /dates → `meetup.com` [^2] | A subscriber clicking through from their calendar reaches a platform the site never mentions. |
> | Cancelled events present | `STATUS:CANCELLED` ×2 [^56ffd8#32,56] | Most clients hide them; some leave ghosts. The site filters these out [^2]; the feed doesn't. |
> 
> The fix is one pass over `data/events.json`'s render path: map `SUMMARY` through the same table that produces "Social"/"Study session", write a per-event `DESCRIPTION` from the row's own fields, point `URL` at the Meetup event URL, and delete the count sentence. This is a **P0 above everything on the page manifests**, because it is the only defect that persists in a visitor's own software after they leave the site.
> 
> ## Cross-cutting
> 
> | Item | Action |
> |---|---|
> | `/past` [^6] | Unlinked ✓ but still live, `index`-able, and its content is "Nothing listed yet." Remove the route or `noindex` it until three meetings have passed. An empty archive is worse than no archive. |
> | `/schedule` [^eb5107#1] | 404. Add the redirect. |
> | Titles | /join "Ways in - Matheapolis" and /chat "Chat - Matheapolis" lack the category and city that /dates now has [^a2eab6#1]. Match it. |
> | Legal boilerplate | In the footer on /dates [^a2eab6#107], in the body on /join [^8ce5a4#50], absent on home. Pick the footer. |
> | Absolute links outside `<footer>` | /dates is at 8 against a ratified ceiling of 6 [^2]. The duplication is the cause, not the ceiling. |
> 
> ## The copy, exactly
> 
> Ten replacements. Every one deletes words rather than adding them.
> 
> ````markdown
> # Home
> 
> - hero caption: delete the trailing " (D312)".
>   "…cropped from that leaf."                           [line 21]
> 
> - ¶3, replace both sentences:
>   BEFORE  Nothing here says what a meeting costs, and no price is printed. Nothing
>           here says whether you must be a member to come, and no rule is kept.
>   AFTER   Free, and no membership. Buy a coffee if you want one.      [line 19]
> 
> - closing ¶, replace:
>   BEFORE  …Whether the room is your kind of room is not something a page can tell you.
>   AFTER   (delete; move to /join as the final line)
> 
> - ### How it works, replace all four paragraphs:
>   AFTER   You arrive, you get a coffee, and somebody says what they have been
>           thinking about. You can listen for the whole hour. Nothing to bring,
>           nothing to prepare, no subject assumed. Usually six to twelve people.
>                                                                       [lines 44-52]
> 
> - primary CTA:
>   BEFORE  [Join Our Group] → /join
>   AFTER   [Sign up for Nov 21] → https://www.meetup.com/…/events/317242488/
>           [All 5 dates →] → /dates
> 
> # Dates
> 
> - delete: "The club's dates run from Nov 7, 2026 through Dec 19, 2026."   [line 93]
> - delete: "The street address printed with each date is the address to give
>           directions to."                                              [line 95]
> - delete the second "Add to a calendar" row and its explanation         [line 97, 99]
> - "Copied from the club's own calendar 4 days ago" → "Checked Nov 17"    [line 83]
> 
> # Join
> 
> - H1 "Ways in" → "Join the club"; keep "Ways in" as the first sentence of the lede.
> - move "What we do" above "Follow the club"; reorder doors as
>   come to a meeting · read the chat first · follow the feed.
> - delete: "Nothing here says what a meeting costs…"                       [line 44]
> - delete: "The club has no front desk and no phone number; the chat is where
>           you ask."                                                      [line 46]
> - delete: "…so there is no single door this site could give directions to." [line 48]
> - move the trademark line to the footer                                    [line 50]
> - delete "or nothing yet"                                                 [line 21]
> - AFTER "Want to ask something…": link to mailto:hello@matheapolis.com, not /chat.
> 
> # Chat
> 
> - "last updated Nov 17, 2026, 2:44 AM UTC" → "…2:44 AM Central"            [line 7]
> - "Channel summary: 11/1/2026 - 11/12/2026" → "The last two weeks: Nov 1–12" [line 11]
> - "#### Chat Topics Summary" → delete (the H3 already says it)             [line 13]
> - drop noise bullets: cancellation of a gathering; a cafe closed for the day [20-21]
> - keep one Discord button, not two                                          [line 43]
> - move "Not a scan of a book." into the figure's figcaption                [line 37]
> 
> # events.ics  — P0, before anything above
> 
> - SUMMARY: map through the site's own table → "Social" / "Study session"
> - DESCRIPTION: per-event, from the row's fields; delete the "7 dates … through
>   Dec 19" sentence everywhere
> - URL: the Meetup event URL for that UID, not mobilizon
> - LOCATION: keep Saint Louis Park as Saint Louis Park; don't say Minneapolis
>   in the body
> - drop STATUS:CANCELLED events from the published feed
> ````
> 
> ## If you ship five things
> 
> 1. **The feed.** Map the names, kill the count sentence, fix the URL. It's the only defect that lives in someone's calendar after they close your tab.
> 2. **Cost and membership, one line, on home and /join.** If the answer is "free, no membership," say so — especially then.
> 3. **Home primary CTA → the Nov 21 event.** Three hops to an RSVP is the clearest "not a leading website" tell on the site.
> 4. **Delete the four self-referential sentences** (cost refusal ×2, "drops no pin," "not a page's job") and the `(D312)`.
> 5. **Fix the "ask us" link on /join** so it lands somewhere a question can be asked, and add a mailto.
> 
> ## What I still can't judge
> 
> The rendered surface. Every question that remains about this site is now about pixels: whether the capped hero plate reads as identity or as a footnote, whether five rows scan as five dates or as fifteen lines, whether the answers-first hero feels confident or abrupt. `design/grill` writes full-page PNGs to `.design/render/` — attach the 1440 and 390 for home and /dates and I'll review composition, which is the layer the last four rounds of prose have been unable to reach.
> 
> **References**
> 
> [^1]: [Chat - Matheapolis](https://staging.matheapolis.com/chat) (26%)
> [^2]: [Dates - Matheapolis, a Minneapolis math club](https://staging.matheapolis.com/dates) (48%)
> [^3]: [staging.matheapolis.com](https://staging.matheapolis.com/events.ics) (5%)
> [^4]: [Matheapolis - a Minneapolis math club](https://staging.matheapolis.com/) (6%)
> [^5]: [Ways in - Matheapolis](https://staging.matheapolis.com/join) (10%)
> [^6]: [Past meetings - Matheapolis](https://staging.matheapolis.com/past) (5%)
