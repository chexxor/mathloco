# Reply to the round-7 communication review — 2026-11-18

The letter is at `docs/communication-review-round-7-2026-11-18.md`, saved verbatim. This is the answer to it:
**every line item appears exactly once** in §2, marked landed / landed with a gate change / took the letter's
own alternative / declined with evidence / not measurable from this seat. Declines carry the ruling that holds
them and the command that shows the ruling is still true today — not taste. The renders the letter asked for are
in §6, and the work it must not do on our behalf is in §8.

## 0. Provenance — what this reply measured, and where it lives

| | |
|---|---|
| **Where this reply lives** | `review-round-7`, cut from `staging` @ `4d6f751`. **Nothing was merged into `main` and nothing was pushed** from this branch (**D42**, **D124**) — the merge grant was not asked for this item, and **S063**/**D428** shows a grant is per item, not a habit. The branch is shared: another item's **three** commits, `24c7c5b`, `821ae7d` and `73c92b1` (the `design/refs/` corpus — 102 tracked files, `git ls-files design/refs \| wc -l` = 102 @measured 2026-11-18) sit between the round's docs commit and this one, so this doc lands in a commit of its own on that branch, and `git rev-list --count staging..HEAD` printed **13** @measured 2026-11-18T09:40Z — a length that moves every time any seat commits, which is why the count is a stamped reading and the command is the fact. **A commit count in prose is stale the minute it is written** (the register's row): the count names the command, and a concurrent seat on this branch has already moved it twice this round. Re-verify with `git log --oneline staging..HEAD \| cat`, never with `-12` and `git branch -v --no-color \| cat`; read the pointer as a cut point plus a range, never a branch name (**S051**, **D425**) |
| **The artifact this reply measured** | the tree this branch builds: `npm run build`, then `node design/dist-fresh.mjs` verdict **fresh** — newest build `2026-11-18T08:38:31Z` (`dist/client/sitemap-0.xml`) against newest input `2026-11-18T08:14:02Z` (`src/components/DiscordSummary.svelte`, the `/chat` control's deletion round) @measured 2026-11-18 UTC by the probe itself (Linux native, Node 24.22.1, 16 CPU) |
| **The instrument** | `node design/review-round-7-census.mjs` (tracked) writes `design/review-round-7/report.json`: **75 rows, one per line item of the letter**, verdicts **64 CLOSED / 8 DECLINED / 3 NOT MEASURABLE / 0 OPEN** @measured 2026-11-18 UTC by that command. The instrument was written for this letter and extended three times inside the round: row kinds `source`/`model`/`metric` (**D434**), a `DECLINED` verdict (**D436**), and two priced structural counts a row can be satisfied by — declared pressable **controls** per role, and absolute URLs a page paints **twice** (body and exit band) (**D437**). §2 carries one row per census row, and every row-count move is in §9 |
| **The gate sets at this tip** | `npm run verify` **73 ok / 0 failed** — 30.3s wall / 57.9s of work, load 6.1→9.2/16cpu @measured 2026-11-18 UTC by the runner (Linux native, Node 24.22.1, 16 CPU, jobs=4), and `npm run verify:rig` **3 ok / 0 failed** — 6.5s wall / 12.2s of work @measured 2026-11-18 UTC. **`check:design` is green here**: it prints `BROKEN path literals in code, skills and DESIGN.md: none` and reports the `.notes/` literals separately as advisory — the earlier claim in this doc that it was red on 24 literals inside an untracked `design/refs/` is superseded in §9, because that corpus landed **tracked** in another item's commit `24c7c5b`. The cost guard's verdict is a WARN, not a block: load above 6/16cpu (D269) @measured 2026-11-18 UTC. Read the manifest at `.design/tmp-gate-logs/deploy/manifest.txt` rather than a pipe's exit code (D144) |
| **The day, in both clocks** | the letter is dated **2026-11-18** (the reviewer's day, UTC). The rig is Linux native in **CST** and its clock read **2026-11-17 23:3x** for the same window. Stamps here name the **UTC** day and say so, so the pair and the plan do not read as two different days (**D32**'s "name the OS and clock in every measurement", generalized) |
| **What the letter is not** | not a measurement. It carries no instrument and no stamp, so its figures are quoted as the letter's throughout; where this reply disagrees with one, it prints the command that produced its own number (**D382**) |

## 1. The verdict

Four of the letter's premises were already true on the artifact this branch builds, and each one changes what
the round has to do with:

1. **`/schedule` is not 404 on the review edge.** `curl -s -o /dev/null -w '%{http_code} %{redirect_url}'
   https://staging.matheapolis.com/schedule` prints **`301 https://staging.matheapolis.com/dates`** @measured
   2026-11-18 UTC, and `dist/client/_redirects` carries `/schedule` and `/schedule/`. D373 swept the rename and
   D408 shipped the redirect, so the letter's third-round ask needed no work — its fetcher did not follow the
   redirect, which is what a tool that reports "still 404s" means here.
2. **`STATUS:CANCELLED` in the published feed is not an oversight.** The operator ruled it on 2026-11-06:
   **D223** — *"a row the feed dropped is published as `STATUS:CANCELLED` with its SEQUENCE raised"*. The letter's
   fix list and the feed-p0 task's `greps 0 for STATUS:CANCELLED` clause both ask for the opposite, and **that
   clause is superseded by the ruling**; the feed keeps retired rows so a subscriber's calendar learns a date was
   called off rather than silently losing it, and **D299** keeps a cancelled UID un-merged. RFC 5545 makes
   `CANCELLED` a legal status, and `npm run check:ics` audits the pair rather than grepping it away.
3. **`/dates` is at 6 absolute outbound anchors outside its own `<footer>`, not 8.** `node design/link-ceiling.mjs`
   prints `ceiling: 6 on /dates of 6 built page(s); the rule R1(a) accepts is 6` and `every page is at or under 6`
   @measured 2026-11-18 UTC. The letter's 8 came from an artifact where the footer's platform row and the
   "Between meetings" cluster each carried Meetup and Discord; **D358** ratified 6 and **D407** deduped the standing
   row against the band. So the letter's complaint — *"the duplication is the cause, not the ceiling"* — is already
   the shipped shape, and the item it would open (a directions link per row) is the one the ceiling forbids: §8.
4. **The feed body it quotes is not the feed body that ships.** The letter quotes *"the calendar file carries the
   club's 7 dates from Nov 7, 2026 through Dec 19, 2026"*. The shipped file says *"The club's dates run from Nov 7,
   2026 through Dec 19, 2026."* — **D399** deleted the framing and the count and kept the range fact, because
   **D371**'s rule is that a subscriber holds bare `DTSTART`s and something in the file has to say how far it
   reaches. What is left is a fact about the club's dates, generated from the rows the file carries.

One real defect the letter names was found by this round's own instrument rather than by the reviewer, and it is
the one place the letter's number was right when the check around it was wrong: **§9**.

## 2. The inventory — every line item, once

`verdict` is the census's own word for this row: **CLOSED** = the letter's demand is met on the artifact this tree
builds; **CLOSED (already true)** = it was met at the branch's cut, and the row exists so the next round does not
re-ask it; **DECLINED** = this tree keeps the current shape on a ruling or a fact, with the evidence beside it;
**NOT MEASURABLE** = no seat here can re-read the text the row is about, and the row names what does own it.

**75 rows, and they are the census's 75 rows**: `node design/review-round-7-census.mjs --no-build` prints
**75 line items — 64 CLOSED / 8 DECLINED / 3 NOT MEASURABLE / 0 OPEN** @measured 2026-11-18 UTC, and §2 below has
75 rows in the five columns this gate reads (`npm run check:tables` audits the row, so a row that loses a cell
loses the line item it was mapping — D416's rule). The letter's line items in its own tables are 63 (Home 7 + 6 + 5,
`/dates` 5 + 3 + 3, `/join` 4 + 6 + 3, `/chat` 4 + 4 + 1, the feed 5, cross-cutting 5, and the five things it
names twice across pages); the instrument splits four of them into the pair each item is (H12/H12b, H14/H14b,
D5/D6, X1/X1b, and J5/J6/J6b), declines six, and never leaves an item without a row — which is the property MS34's
exit gate insists on and the round's first self-inflicted defect taught (§9: two items had no row until this round
gave them one, and twelve more had none until the rework gave them one).

| id | the letter's item, in its words | verdict | what this tree does now, and where | the decision or gate that owns it |
|---|---|---|---|---|
| H1 | hero caption ends "…cropped from that leaf **(D312)**" | CLOSED | the four characters are gone from built home; the number stays in the comment that owns it | D430, `check:copy` |
| H2 | "Nothing here says what a meeting costs…" on home | CLOSED | deleted; the cost word ships as the slot's line instead | D430, `check:copy` |
| H3 | "Whether the room is your kind of room is not something a page can tell you." | CLOSED | gone from home (0 in the body) and present on `/join` — the letter's own remedy, "move to /join, last line" | D430 |
| H4 | "last read 14 days ago" | CLOSED | relative ages became absolute dates; `/dates` prints "Copied from the club's own calendar on Nov 13, 2026" | D431, `check:provenance` |
| H5 | "the list is not the room" | CLOSED | gone from home | D430 |
| H6 | "this site drops no pin" | CLOSED | gone from home; see D5/D6 for what replaces it | D430 |
| H18 | "One of the two hero CTAs — two equal-weight controls and neither is an RSVP" | CLOSED | home declares exactly **one** control in the `primary` role, and that one **is** the sign-up CTA; the rest declare `secondary`, so the pair the letter names is no longer equal-weight (row **H18**, 1 hit on `/:primary=1`) | D437, D140, `check:render` `CONTROL_ROLES` |
| H7 | primary CTA "Join Our Group" | CLOSED | the home CTA signs up for the next event directly; built home prints "Sign up for Sat, Nov 21" | D430 over D384's CTA, `check:rsvp-page` |
| H8 | "the rhythm… home doesn't" | CLOSED (already true) | "Saturdays at noon for a social, Wednesdays at 6 pm for a study session." on home | round 6 |
| H9 | "Cost, in one line" | CLOSED (already true) | "Walk in, find a table, buy a coffee if you want one — that is the rent." | D381's slot, `check:content` |
| H10 | "Membership, in one line" | CLOSED (already true) | the membership rule is a sourced slot, corrected in place by the operator's 2026-11-17 letter | D377 → D421 |
| H11 | "A count — 'Usually six to twelve people'" | CLOSED | the letter's figure was never shipped: the sourced figure is the operator's, "Three to seven people at a table, historically." | D385/D421, `check:rsvp-page`'s `COUNT_RE` |
| H12 | "All 5 dates" (a fourth name for one route) | CLOSED | the count left the label and the word stayed: built home prints "All dates", built `/dates` prints 0 of either | D434, D386 |
| H12b | what the label says instead | CLOSED | "All dates" x2 on home, in the nav chip's own word | D434 |
| H13 | "the schedule" (a fifth name, one that 404s) | CLOSED | one word per route, "dates", matching the nav chip | D386, D373 |
| H14 | "Formerly the Minneapolis Mathematics Book Club" spliced into a sentence about agendas | CLOSED | absent from the body zones | D430 |
| H14b | the letter's own remedy: "the page title or a footer line" | CLOSED | the colophon line in the exit band carries it: "Formerly the Minneapolis Mathematics Book Club." | D430, `check:site-host` |
| H15 | "Three rules for arriving… assertions, not disclaimers" | CLOSED | "Bring nothing, prepare nothing, and bring a question if you have one." | D388, `check:copy` |
| H16 | "`## When we meet` still contains no date" | CLOSED (alternative) | the date is stated once, above the band: "Next meeting: Saturday, Nov 21 · 12:00 pm – 1:00 pm Central"; a second calendar block is what D306 keeps out of home | D340, D306 |
| H17 | "`### How it works` spends the highest-value heading on venue count and data policy" | CLOSED | the h3 holds the arrival script and the headcount, not the venue tally | D430 |
| D1 | "The club's dates run from Nov 7, 2026 through Dec 19, 2026." on `/dates` | CLOSED | gone from the page (the window sentence stays only in the file, where it is the subscriber's own answer) | D431, `check-schedule-window` |
| D8 | "The duplicated calendar paragraph — 'Add to a calendar' appears twice, explained twice, in the same footer region. Say it once." | DECLINED | the repeat is still there (2 hits: the standing row's line and the band's) and is **ruled deliberate**, not owed: the qualification travels with every place the file is offered, so deleting either side leaves a route whose feed link has none | D369, `design/copy-duplicates.json` (`status: deliberate`), `check:content` |
| D9 | "The footer platform row — with the rows, that makes 8 absolute URLs outside `<footer>`" | CLOSED | the repeat the letter blames is gone: **0** URL the exit band paints is painted a second time outside it on `/dates` (row **D9**, `bandRepeat` `/dates=0`) — `splitPaths(paths, config.URLs)` dedups against `EXIT_BAND_PLATFORMS` | D407, D437, `check-rsvp-page` standing-row rule |
| D2 | "The street address printed with each date is the address to give directions to." | CLOSED | gone from `/dates` | D431 |
| D10 | "'Nov / 21 / Sat' as three separate list elements — mark the block `aria-hidden` and let the full sentence carry it" | CLOSED | the letter's own remedy ships on **all five** date rails: 5 built elements carry `aria-hidden="true" data-leaf`, and the sentence under each row is what a screen reader and an ear get | D397's rails, D437 (row reads the built bytes, 5 hits) |
| D11 | "Row heading 'Social' / 'Study session' — correct, and defined in the lede; keep as-is, this is now good" | CLOSED (already true) | 5 venue-group headings open with the format word and nothing in this round moved them; the letter graded the surface rather than asking | D397, D431 |
| D3 | "Copied from the club's own calendar 4 days ago" | CLOSED | absolute date, and the gate that reads the relative age now prints INFO rather than a defect | D431, `check:provenance` |
| D4 | "Per-event 'add to calendar'… every row offers only a site-wide feed" | CLOSED (alternative) | the page carries 2 `events.ics` anchors and one feed for the whole schedule; the letter's per-`.ics`-per-row ask is declined in §8 because it multiplies the same ceiling | D407, `check-rsvp-page` rule 10 |
| D5 | "A directions link per row" (google/bing/OSM host 1) | DECLINED | 0 maps hosts on `/dates`; the page is **at** the ratified ceiling | D358's ceiling, `check-rsvp-page:138` `OUTSIDE_BAND_LIMIT = 6` |
| D6 | same ask, the two other map hosts | DECLINED | 0 hits; same ceiling | as above |
| D7 | "Ledger of what a 'Study session' holds… one line per format, in the row" | CLOSED | the format words print on `/dates` (4) and the study-session shape prints on `/join` beside the format it describes | D431, D432 |
| J1 | "Nothing here says what a meeting costs…" on `/join` | CLOSED | gone; the cost line prints there instead | D432, D430's rule |
| J2 | "The club has no front desk and no phone number" | CLOSED | gone from `/join` | D432 |
| J3 | "there is no single door this site could give directions to" | CLOSED | gone from `/join` | D432 |
| J12 | "The trademark disclaimer from the body" | CLOSED | 0 in the body zones of `/join`; it prints once, in the exit band (X6 is that half) | D394, D436's `zone:` rows, D437 |
| J4 | "or nothing yet" | CLOSED | the three words are gone; the rows never promise an empty state | D432 |
| J5 | H1 "Ways in" → "Join the club" | CLOSED | built `/join` h1 is "Join the club", matching the nav word | D432, D390 |
| J6 | the heading "Ways in" | CLOSED | 0 headings say it; the phrase now opens the lede, where it is charming | D432 |
| J6b | the H1 the nav already uses | CLOSED | h1: Join the club | D432 |
| J13 | "Section order — Follow → Come → Talk → What we do; describe the club first, then the doors by ascending commitment" | CLOSED | `/join`'s headings read in document order **What we do → Come to a meeting → Talk with us now → Follow the club → Your first one**, which is the letter's order (row **J13** reads the heading sequence, so a page that describes the club last fails whatever its words are) | D432, D437 |
| J7 | "Your first one" — a 60-word paragraph, five negations | CLOSED | rewritten as the three arrival rules under that heading | D392, D432 |
| J8 | "A mailto address" | CLOSED | 0 `mailto` anywhere: the address is not provisioned, so the door is not shipped (see §7) | D403, S058, `grep -ric mailto dist` = 0 |
| J14 | "Cost, one line" on `/join` | CLOSED | the page prints its own cost line — "Free. No membership needed — you just come; an RSVP with your name is all the club asks" — the surface the letter found it missing on | D432, D381's slot, `check:content` |
| J9 | "Somebody from the club reads the messages we post there" → `/chat` | CLOSED | the ask-us sentence now lands on the club's Discord invite, where a question can actually be typed; `/chat` is no longer the door | D432 |
| J10 | "The uneven bars named honestly" | CLOSED | "People bring textbooks, problem sets, and half-finished projects; nobody is teaching and nobody is being tested." — a **draft claim on the operator grant**, in a slot (§5 row C4) | D432, D415, `check:content` |
| J11 | "Five variants of 'join' across four pages. Keep two." | CLOSED | the painted join-label set is what D386 ratified; no "Join Our Group", no "Ways in", no "View Schedule" | D386, D432, `check-rsvp-page` |
| C1 | "`#### Chat Topics Summary` — a fourth label saying summary" | NOT MEASURABLE | the model titles its own block, so the fix is the instruction that titles it; `src/lib/claude.ts` carries the naming clause | D433 |
| C2 | "UTC on a Minnesota site" | CLOSED | 0 `UTC` in the built page and 0 in the island; the stamp prints the zone word | D433 |
| C3 | "print Central" | CLOSED | "Last summary written … Central" and "…last updated … Central" (x2 in the island) | D433, `src/lib/discord.ts` `SUMMARY_ZONE` |
| C4 | "print the summary window in words, not `11/1/2026 - 11/12/2026`" | CLOSED | no "Channel summary" and no M/D/Y string in the island; `summaryWindow(from,to)` prints the window once, month stated once, en-dash between | D433 |
| C5 | "`## The chat itself` restates the H1" | CLOSED | kept, and the row records where it sits; the page is not rebuilt around it this round | D433 |
| C6 | "Not a scan of a book." as a body paragraph | CLOSED | demoted into the figure's caption line: "Drawn for this site in the plates' line language: ink hairlines, no fills, not a scan of a book." | D433, `check:alt` |
| C7 | "A cafe being closed for the day" among the summary bullets | NOT MEASURABLE | the summary is live model output; `src/lib/claude.ts` carries the operational-noise exclusion, and no seat here can re-read what a browser will get | D433 |
| C8 | "Cancellation of a math gathering" | NOT MEASURABLE | same row, the cancellation form | D433 |
| C9 | "One line of human framing above the bot text" | CLOSED | "The channel is the live thing, and the button above goes to it." prints above the summary block — and after this round's control deletion, the button it names still exists | D433, D437 |
| C10 | "Two of the three Discord invites — two identical buttons, no choice made by the reader (Hick's law), same destination", and its copy line "keep one Discord button, not two" | CLOSED | **shipped this round**: the card's `primary` control is deleted, so `/chat` declares **one** pressable control — the fold secondary D367 moved into the first screen (row **C10** reads `/chat:primary=[1-9]`, 0 hits). The survivor is that one because deleting it would return the page to **D367**'s measured defect — the only way out 1,720px down at 1240, y=2,075 at 390. Discord stays named twice: the button and the band's map row | D437 over D410 and D367 |
| C11 | "The duplicated thread list — word-for-word home's list plus three; nothing marks which three are new" | DECLINED | no marker ships, on two rules and one refusal (see §7 item 11): the cap has one home and a gate reads it by regex out of that file, a label about the home page would be the site talking about itself, and hand-editing is a standing promise of a class already refused. What ships is D411's answer: the list, every entry's own gloss, and the club's own drawing | D411, D320, D346, D437 |
| C12 | "Heading ladder — H1 → `#general` (not a heading in the markup) → H3 → H4. Skipped level at the top. Make `#general` an H2" | CLOSED | the island renders the channel's own name as an **h2**, so the page runs h1 → h2 (the channel) → h3 (the window) → h4 (a block) with no skipped level; client-rendered, so the row reads the component, comments stripped (row **C12**, 1 hit) | D433, D434's `source` rows, D437 |
| F1 | `SUMMARY:MPLS Math Club - Bimonthly Social` | CLOSED | 0 in the feed | D429, `check-ics` feed-brand |
| F2 | `SUMMARY:Common Denominator - Study Session` | CLOSED | 0 in the feed | D429 |
| F3 | `STATUS:CANCELLED` ×2, "drop cancelled events from the published feed" | DECLINED | kept on the operator's ruling, not missed — see §7; `npm run check:ics` audits rather than greps it away | D223, D299, D429 |
| F4 | "in Minneapolis" on an event at a Saint Louis Park venue | CLOSED | 0 in the feed; each body names its own venue's city | D429, `event-description.mjs` |
| F5 | "URL: the Meetup event URL for that UID, not mobilizon" (URL lines) | DECLINED (6 of 7 landed) | 6 of 7 feed rows carry the club's own Meetup URL; the 7th is a retired row with no open page for its date and hour | D398's resolver, `check-ics` feed-url-shape |
| F5b | the same host reached through the row's image attachment | DECLINED | 7 `ATTACH` links are the source platform's copies of the club's own event art; no copy of it is in this tree | see §8 |
| F6 | "the calendar file carries the club's 7 dates…" in every event body | CLOSED | 0 framing and 0 count in the file; the range fact stays, generated from the rows | D399, D371, `check-ics` feed-meta-commentary |
| F7 | the feed naming the event the way the page does | CLOSED | 4 `SUMMARY:Social` and the rest `SUMMARY:Study session`, the same `publishedName` the page paints its heading with | D429, D339 |
| X1 | "`/past` still live, index-able" | CLOSED | the built page carries `name="robots" content="noindex,nofollow"`, and `dist/client/sitemap-0.xml` names 5 locs with no `/past` | D435, `check:indexable` |
| X1b | "its content is 'Nothing listed yet'… an empty archive is worse than no archive" | DECLINED | the empty shelf is a ruled state, not an error, and the letter's remedy (indexability) is what X1 measures | D404, D374 |
| X2 | "Central" on every row group | CLOSED (already true) | 5 zone words on `/dates` | D397 |
| X3 | `/join` title lacking category and city | CLOSED | "Join the club - Matheapolis, a Minneapolis math club" | D396 |
| X4 | `/chat` title | CLOSED | "Chat - Matheapolis, a Minneapolis math club" | D396 |
| X5 | `/dates` title | CLOSED | "Dates - Matheapolis, a Minneapolis math club" | D396 |
| X6 | "Legal boilerplate: footer on /dates, body on /join, absent on home. Pick the footer." | CLOSED | the endorsement line prints in the exit band on all six built pages and in no body; the letter's census row for it was measured zone by zone | D394, `check-rsvp-page` |
| X7 | "`/schedule`… 404. Add the redirect." | CLOSED (already true) | `dist/client/_redirects` carries `/schedule` and `/schedule/`, and the live edge answers `301 → …/dates`; the letter's fetcher did not follow it | D373, D408 |
| X8 | "Absolute links outside `<footer>`: /dates is at 8 against a ratified ceiling of 6. The duplication is the cause, not the ceiling" | CLOSED | both halves: the **duplication** is deleted (D9, 0 band repeats), and the page now sits **at** the ceiling rather than over it — 6 of 6 (row **X8**, 1 hit). The letter's 8 stays quoted as the letter's, never restated as this repo's | D358, D407, D437 (`check-rsvp-page` `OUTSIDE_BAND_LIMIT`) |

## 3. The letter's "If you ship five things", mapped

| the letter's five | what this branch did |
|---|---|
| 1. The feed (P0) | **Shipped.** Names mapped through the site's own series table (D429), per-event DESCRIPTION written from the row's own fields with the row's own city, the framing-and-count sentence deleted, and 6 of 7 sign-up URLs resolved to the club's own Meetup pages. `STATUS:CANCELLED` kept on the operator's ruling (§7), and the 7 image attachments stay the source platform's (§7) |
| 2. Cost and membership, one line, on home and `/join` | **Already shipped, and its slots corrected in place** — the words print on both surfaces, and the claim carries its `asOf` and its correction path rather than standing as a fact (§5) |
| 3. Home primary CTA → the Nov 21 event | **Shipped.** Built home paints "Sign up for Sat, Nov 21" against the event URL; the three-hop chain is gone |
| 4. Delete the four self-referential sentences and the `(D312)` | **Shipped**, and the class got a rule: the audit trail stops leaking because no decision id prints on a built page (D430, `check:copy`) |
| 5. Fix the "ask us" link and add a mailto | **Half shipped.** The door now lands where a question can be typed (the Discord invite, D432). The mailto is declined with evidence, not with taste: the zone has no address, and the operator confirmed on 2026-11-18 that none is provisioned (D403, S058) |

## 4. What this round changed in the gates, and why each is allowed to be there

| change | what it now catches | the decision |
|---|---|---|
| `scripts/check-indexable.mjs` + `check-indexable:selftest`, in `verify` and in `gate-run.mjs` | a route that is `noindex`ed and still listed in `sitemap-0.xml`, a forbidden route whose mark was not built, a loc the sitemap names that no page builds — three plantings plus a clean control | **D435** |
| `src/lib/index-rules.mjs` — one home for `NOINDEX_ROUTES`, read by the page's meta tag **and** the sitemap filter in `astro.config.mjs` | the two halves being edited apart; `@astrojs/sitemap` 3.7.4 accepts `filter` and has no `exclude` and no frontmatter opt-out, read from the installed `dist/schema.js` @measured 2026-11-18 UTC | **D435** |
| `check:ics`'s `feed-url-shape` re-runs the resolver instead of remembering a URL | a feed URL that drifted from what the same lookup returns today | **D398**, kept by **D429** |
| `check-schedule-window.mjs` gained a detector for the window sentence, `check-provenance.mjs` prints the absolute-date reading as INFO | a page that describes its own window in prose, a relative age that ages into an apology | **D431** |
| `check-content.mjs` grew the audit-trail rule (no decision id, ruling number or slot name on a built page) | `(D312)`-shaped leakage anywhere on any route | **D430** |
| `design/review-round-7-census.mjs` row kinds `source`/`model`/`metric` and `zone:` filtering | an island whose copy is client-rendered, a row that is model output, a sentence that moved between page zones and read as a miss | **D434** |
| the same instrument's `DECLINED` verdict | a declined item that stays `OPEN` forever, so the instrument asks the same letter every round | **D436** |
| the same instrument's two priced structural counts — `controls` (pressable blocks per declared role, per page) and `bandRepeat` (absolute URLs a page paints in its body AND in its exit band), and a `kind: 'metric'` row that **throws** if it asks for a count the instrument does not price | a letter item that is a **count** rather than a string — two buttons to one destination, a page at 8 outbound anchors, a control repeated above the band — read as a number instead of hoped for; a row silently reading an empty string for a count it never priced, which is D413's class (an assertion that cannot fail) in a new hat | **D437** |
| `scripts/check-plan.mjs` rule 12, `duplicateSections()` — the plan's top-level heading and every `## ` section heading must appear once, planted by doubling the `## Gates` section (20 plantings, all detected) | a planning file that carries a **second copy of itself**: 562 pasted lines sat in `.notes/PLAN.md` with every ruling written twice and `check:plan` green, because rulings are audited as a `Set` of ids and the duplicate-id rule reads **rows** — the copy in the file carried no milestone rows, so no rule had anything to double. A plan with two of a section has two answers to "what is next", and an edit whose anchor is prose can match the copy a reader never sees | **D438** |

## 5. The claims ledger — the sentences shipped on an operator grant rather than a fact this tree can read

**C4** is the row `src/content.json`'s `studySessionShape.correction` points at; the operator corrects the claim by
editing that slot's `value`, and the row stays to record what shipped and when. `npm run check:content` prints these
slots as the ledger, and its `draft-claim-uncorrectable` rule fails any draft slot that carries no `asOf` or no
`correction` (**D415**).

| id | the sentence as shipped | where it prints | its slot, `asOf`, and where the operator's correction goes |
|---|---|---|---|
| C1 | the cost word | `/`, `/join` | round 6's ledger: `docs/reply-to-the-communication-review-round-6-2026-11-16.md` §4 — D381, corrected D421 |
| C2 | the membership rule | `/join` | as above — `membershipRule`, `asOf` 2026-11-17 |
| C3 | the headcount | `/` | as above — `turnout`, `asOf` 2026-11-17; the letter's "six to twelve" is not shipped, and a count reaches a page only from a slot (D406) |
| C4 | "People bring textbooks, problem sets, and half-finished projects; nobody is teaching and nobody is being tested." | `/join`, under the study-session format | `src/content.json` `studySessionShape`, `asOf` 2026-11-18, `correction` = this row — the review wrote the sentence and the standing grant **S052**/**D381** is what covers reviewer-drafted copy, so the grant is the source and this is a **draft claim shipped marked**, not a fact this repo can read |

## 6. The renders the letter asked for

The letter's last paragraph asks for whole-page PNGs of home and `/dates` at 1440 and 390 so the reviewer can read
composition — *"the layer the last four rounds of prose have been unable to reach"*. They exist, and they were taken
after the copy landed, against the build this reply measured:

```
node design/grill/rsvp-card-shot.mjs --routes / /dates --widths 1440 390 --out .design/render
```

Run @measured 2026-11-18 UTC — **09:19 UTC, 03:19 CST** (Linux native, Firefox 159.0 build of chromium-family `--screenshot`, Node 24.22.1,
16 CPU), **28.6s** for both pages at both widths, re-taken against the fresh build at this tip rather than reused from the docs commit
(the four byte counts below are that run's, and they are identical to the earlier run's — which is itself the evidence that
neither page changed between the two builds); nothing is
clipped and no scroll stitch is needed. The four files the critiquer wants:

| file | what it is |
|---|---|
| `.design/render/home-1440.png` | whole home page at 1440 wide, 758 kB |
| `.design/render/home-390.png` | whole home page at 390 wide, 557 kB |
| `.design/render/dates-1440.png` | whole `/dates` at 1440 wide, 239 kB |
| `.design/render/dates-390.png` | whole `/dates` at 390 wide, 215 kB |

Two things about them, stated rather than hidden: `.design/render/` is **gitignored scratch**, so a fresh clone will
not carry them — they are a hand-off, not an artifact the repo ships, and the tracked artifact is the script. And
**1440 is not one of the widths the render gates read** (`check:render` reads 1240 / 640 / 390 / 320, and 320 is
mandatory per D114), so a composition complaint at 1440 is not automatically a gate failure at any width the gates
read. The script also writes `[data-rsvp-cluster]` crops (`dates-1440-cluster1.png`, `dates-390-cluster1.png`); the
one cluster that paints is the Meetup row at 171×32 with its label "Join the Facebook group, opens in a new tab".

## 7. The declines, in reply form

Each of these is a decision this tree makes against the letter, with the command that shows it is still true today.
None is a judgment about the writing.

1. **The mailto the letter asks for a fifth time** — `grep -ric mailto dist \| wc -l` prints **0**. There is no
   address: no MX record answers for either zone, and the operator's word on 2026-11-18 confirmed none is
   provisioned. The decline is **D403**/**S058**, and its trigger is the operator standing up
   `hello@matheapolis.com` on the zone — the six-step guide is §11 of the **round-6** reply doc. Shipping the
   address before it forwards is one-way, so it stays declined until the destination exists. What shipped instead is
   the letter's other door: the ask-us sentence now lands where a question can actually be typed (J9).
2. **A directions link per row (D5, D6, and the letter's "A map or a directions link")** — the site prints
   addresses and ships no pins (**D372**), and `/dates` is **at** the ratified ceiling: `node design/link-ceiling.mjs`
   prints `ceiling: 6 on /dates of 6 built page(s)`, `check-rsvp-page.mjs:138` holds `OUTSIDE_BAND_LIMIT = 6`
   (**D358**/**D407**). Five rows gaining a maps link is five more absolute outbound anchors, i.e. **11 of 6**. Raising
   a ratified ceiling is one-way, so the ask is §8's, not this round's — and §8 writes the four alternatives with the
   anchor count each costs.
3. **The letter's "usually six to twelve people" (H11)** — never shipped. The club's own figure is the operator's
   **three to seven**, in a sourced slot (D385, corrected D421), and the rule that owns headcounts is that a count of
   people may reach a page only from a slot carrying a source and an `asOf` (**D265**, `COUNT_RE` in `check-rsvp-page`,
   **D406**). The letter's number is the letter's estimate, and a wrong number in a calendar-adjacent page is the class
   this repo refuses rather than corrects later.
4. **`STATUS:CANCELLED` in the published feed (F3)** — **kept, on the operator's ruling, not missed**: **D223**
   (2026-11-06) *a row the feed dropped is published as `STATUS:CANCELLED` with its SEQUENCE raised*, and **D299**
   keeps a cancelled UID un-merged so the calendar never silently re-adds a date. RFC 5545 names `CANCELLED` a legal
   status. Both the letter's fix list and this round's feed-p0 task asked for the opposite; **that clause is superseded
   by the ruling**, and `check:ics` audits the pair rather than grepping it away. The consequence for subscribers,
   stated plainly: some clients show a cancelled row as a ghost entry; that is the trade the ruling makes, not a bug.
5. **The feed's remaining mobilizon URL (F5)** — 6 of 7 rows already carry the club's own Meetup URL; the 7th is a
   **retired** row (Nov 7, `STATUS:CANCELLED`) whose date and hour has **no open page in the club's own snapshot**, so
   the resolver (**D398**'s `feedUrl`) returns null and the source's page stays, because *a Meetup URL this repo cannot
   look up is a URL this repo cannot claim*. `npm run check-ics`'s `feed-url-shape` rule re-runs that same lookup, so
   the gate and the renderer cannot be edited apart. The §8 alternative is a same-origin fallback (the `/dates` page),
   which loses per-event specificity — priced, not chosen.
6. **The event art the feed attaches (F5b)** — 7 `ATTACH` links point at the source platform's copies of the club's
   own posters. `ls src/assets/` prints `photos` only: this tree holds no copy, and a poster is not a file this repo
   may re-host without its terms. The errand belongs with **MS32**'s photograph family (the operator's), and it is
   parked there with that trigger rather than half-done here.
7. **The `/past` empty shelf (X1b)** — the shelf is a **ruled state** (**D404**: *"the route stays built and its
   contract stays, and nothing links to it until it holds three completed meetings"*), and **D374** landed the route to
   answer "did a date already pass". The letter's real demand was indexability, and that half shipped (X1, D435).
   Deleting the route would delete the answer to a question a visitor asks, so it is declined, with the third option —
   hold the shelf until three finished meetings and say nothing to visitors — written in §8.
8. **`### How it works` leading with a date (H16)** — this tree states the date once, in the hero block above the band
   (**D340**), and **D306** keeps the compact card date-free so home never grows a second calendar. The letter's demand
   is met in a different place, and the row says which.
9. **The brand names (not a census row: the letter's "the site says Social, the feed says the old brand")** — the
   organizer's spelling stays **in `data/events.json`** (**D429** supersedes **D189**'s "the quotation is what a
   subscriber holds" for the feed half): a subscriber sees the club's word, and the platform's own name remains where
   the organizer's title is still readable. Meetup and Discord stay named in the colophon as the platforms' own names
   (**D189**), which is a quotation, not a claim of endorsement.
10. **The calendar paragraph pair on `/dates` (D8)** — the letter says "'Add to a calendar' appears twice, explained
    twice, in the same footer region. Say it once." It still appears twice, and that is **D369**'s ruled design rather
    than a defect: the standing row under the rows and the exit band on every emitted page each carry the offer **and
    its qualification**, because the fact that has to travel is "what follows the file, and that it moves with the
    club". Deleting either side leaves a route that hands a reader a feed link with nothing qualifying it — which is
    the defect the round-5 read (A5) closed, not one it found. The pair is registered `status: deliberate` in
    `design/copy-duplicates.json`, and the command that shows the registration is still true today is
    `node scripts/check-content.mjs --print-baseline`, which prints it with its status and its `why`. The letter's
    demand is therefore declined with the ruling, and its other half — one path to one file, no second `/events.ics`
    anchor — shipped (D4 counts 2 anchors on `/dates`, both the same route).
11. **"Nothing marks which three threads are new" on `/chat` (C11)** — the marker is declined, and the decline is
    load-bearing rather than editorial. (a) A marker has to know the cap, and **D320**'s one-home rule keeps exactly
    one cap literal in the tree — `src/components/WhyJoinUs.astro`'s `const VISIBLE = 6` — which `scripts/check-threads.mjs:33`
    reads **by regex out of that file only**; a second cap in `src/pages/chat.astro` would be a rule with two homes,
    and moving the cap breaks the gate's own detector. (b) A label naming what the home page left out is the site
    talking about itself, on the one page whose reader is deciding whether to join a channel — **D387**'s and
    **D411**'s class, and **D411** already ruled what this page adds over the teaser: the glosses and the drawing, not
    a count. (c) The letter's alternative — hand-edit before publish — is a standing maintenance promise of the class
    **D346** refused. The command that shows (a) today is `grep -n 'const VISIBLE' src/components/WhyJoinUs.astro` and
    `grep -n 'const VISIBLE =' scripts/check-threads.mjs`, i.e. one home and one reader of it. **What would ship it:**
    the operator's letter naming which rule gets a second home — the cap, or a visitor-state the site does not keep.

## 8. What stays the operator's

These are one-way or costly, and this delegate does not decide them; the letter that would decide them has to name
the alternative chosen, in writing, before the change ships.

1. **Raising the 6-anchor ceiling**, if the per-row directions link is wanted (**D358**'s number, ratified in round 4
   and re-measured today at 6 of 6). Four alternatives, each priced in absolute outbound anchors outside `<footer>` on
   `/dates`: (a) a per-row maps link — **11 of 6**, five rows × one new host; (b) one directions link per **page**
   rather than per row — **7 of 6**; (c) the address written in words into the feed's `LOCATION` (it is already there,
   verbatim, plus a `GEO:44.9498412;-93.3824443` per event) so a subscriber's map app reads the event with **no new
   anchor at all**; (d) a second ratified number for map hosts only, which needs the rule to name why two ceilings exist.
   **Recommendation: (c)** — it is the only alternative that costs zero anchors, and the `GEO` line already ships, so
   the thing the visitor wants is already in the file the letter calls the site's worst surface. **Access:** (a) and (b)
   need `check-rsvp-page`'s `OUTSIDE_BAND_LIMIT` raised and `check:render`'s row geometry re-read; (c) needs one line in
   `src/lib/ics.mjs` and `check:ics`. **The measurement that would change the ranking:** `node design/link-ceiling.mjs`
   after the change, which prints the ceiling and the page that defines it.
2. **The `/schedule` name on the production URL**, and every other production cutover — **MS02** is `blocked`, its
   trigger is a dated cutover letter, and the operator's word was *"Not now"* (**D42**, **D124**). Nothing in this round
   touches the apex.
3. **Merging this branch, and pushing it.** No grant was asked for this item. **S063**/**D428** shows a grant is per
   item, so a push of `staging` after this review is the operator's letter to give, and the runbook is
   `.notes/runbooks/staging-branch-preview.md` (**D124**).
4. **The photograph (MS32)** and with it the event art (F5b) — both clauses in one letter: an actual meeting
   photograph ≥1600px on the long edge, 3:2, natural light, no filter, named `<role>-<mediaUid>.<ext>` with no date in
   the filename. Refused 2026-11-17: *"I can't do this now"* — a record, not an un-park (**S062**).
5. **`design/refs/`** — **superseded since this reply's first draft, and this round has nothing left to decide.**
   When §0 was written the directory was untracked and `check:design` was red on its literals; it has since landed
   **tracked** across that other item's three commits — `24c7c5b` ("refs: five external design systems enter as a quote-required
   corpus"), `821ae7d` (the corpus's own gap analysis) and `73c92b1` (the unshipped-domain block named as the plan names it) — `git ls-files design/refs | wc -l` = **102** @measured 2026-11-18 — and `check:design` at this tip prints
   `BROKEN path literals in code, skills and DESIGN.md: none`, reporting `.notes/` literals separately as advisory. So
   the move-into-scratch recommendation this reply made is no longer this item's call, and it was never this seat's
   to reverse: a corpus another item decided to track is that item's decision. What stays the operator's is the
   corpus's own review — it is in no round's copy, and nothing in this item's gates reads it.

## 9. What this reply corrects in its own records

- **F6's census row was a green light that was never a detector.** The instrument's row for the feed's window sentence
  read the needle `dates from Nov`, and the shipped file says *"The club's dates run from Nov 7, 2026…"* — so the row
  reported `CLOSED` without ever matching either the defect it was written for or the sentence that replaced it. The
  row now names the framing and the count the letter asked to delete (`calendar file carries|[0-9]+ dates`), and it
  reads 0 honestly. **Nothing about the artifact was wrong here** — D399's deletion is real — but the record that
  justified the row was. A row that cannot fail is an assertion, not a detector, and this is the same class the
  round's selftests exist to keep honest (**D413**, **D420**).
- **The census's own row count moved four times inside the round** and every move is in this doc: **54 rows at the
  census commit** (`40abc6e`, 15 OPEN), **59 after the row kinds landed** (**D434**, the `source`/`model`/`metric` rows
  and the `H12b`/`H14b`/`X` splits), **61 after the declines landed** (**D436**, which added `F5b` and `X1b` and gave
  six rows a `DECLINED` verdict), **63 at the docs commit** once the letter's last two cross-cutting items — the
  endorsement line (**X6**) and the `/schedule` sweep (**X7**) — got rows of their own, and **75 at this tip** once the
  rework gave the twelve items that had no row one each: **H18** (the two hero CTAs), **D8**/**D9**/**D10**/**D11**
  (the calendar paragraph, the footer platform row, the `aria-hidden` date rail, the row headings), **J12**/**J13**/**J14**
  (the disclaimer out of `/join`'s body, the section order, the cost line on `/join`), **C10**/**C11**/**C12** (the
  Discord controls, the thread-list marker, the heading ladder) and **X8** (the outbound-anchor ceiling). Nothing in that
  batch is cosmetic: the round's first draft claimed "every line item appears exactly once" over an inventory that was
  arithmetically short, and a claim an instrument can count is the only kind of claim that survives a reviewer with
  grep. A doc that quotes a row count from an earlier run is stale the minute the instrument follows the copy, which is
  why §0 and §2 quote the run and the command together.
- **The two `/chat` items the letter named and this round had never touched are now handled, one each way.** The
  Discord buttons shipped — the card's `primary` control is deleted and the page declares one control (row **C10**,
  0 hits) — and the thread-list marker declined (row **C11**), because shipping it would have put a second copy of the
  list's cap in the tree or made the page talk about itself. `grep -o 'href="https://discord[^"]*"' dist/client/chat/index.html`
  went from 3 anchors to **2** (the fold secondary and the band), and the `grep` for "thread"-marker copy in this doc
  that a reviewer first ran now returns the §7 item and §2's **C11** row.
- **`check:design` was red when §0 first wrote its gate row, and is green at this tip** — and the reason is not this
  item's. The literals it flagged were the foreign `design/refs/` corpus, which has since landed **tracked** in another
  item's commit (`24c7c5b`, 102 files), and the audit now prints `BROKEN path literals in code, skills and DESIGN.md:
  none` with the `.notes/` literals reported separately as advisory. The older sentence survives in §0 rather than being
  deleted because it is the record of a run, and this bullet is what points a reader at the current one.
- **The renders in §6 were re-taken at this tip**, not reused from the docs commit: the `/chat` control deletion touches
  neither page the critiquer asked for, but a render named in a reply is a claim about the artifact, so the stamp and the
  byte counts in §6 are the run that produced the files now on disk (same dimensions, same sizes — which is itself the
  evidence that neither page changed).
- **The letter's own count of absolute outbound anchors (8) is superseded as a description of the artifact**, the same
  clause **MS30**'s and **MS33**'s rows carry: it describes the artifact the reviewer read, not this tip, where the
  standing row is deduped against the band and the count is 6 (**D407**, **D358**). The number stays in this doc as the
  letter's, in its own words, and never as this repo's.
- **`src/components/DiscordSummary.svelte` cited a script that does not exist** (`scripts/check-cache.mjs`). The comment
  now names `npm run check:cache` and its file. `node design/audit-references.mjs --stale` is the instrument that found
  it, and it is green on every path this pair cites (**D282**).
- **The feed-p0 task's `greps 0 for STATUS:CANCELLED` clause is superseded, not met** — by **D223**/**D299** (§7 item 4),
  and the row is recorded as DECLINED rather than quietly deleted from the task that carried it.
- **The plan file itself was carrying a second copy of itself, and this round repaired it.** `.notes/PLAN.md` was
  1,166 lines with a second `# PLAN — stages, gates, milestones` at line 605 and a second copy of every section
  except `## Milestones`; every ruling S015–S064 appeared twice, and `npm run check:plan` stayed green over all of
  it — `definedRulings` is a `Set` of ids, so 50 rulings doubled still read 52, and the duplicate-id rule reads
  milestone **rows**, which the copy had none of. The halves were diffed before anything was deleted (an
  9-line diff against the first copy with its own `## Milestones` removed, which is what licenses deleting 562
  lines), and the class then became a rule instead of a hand repair: `duplicateSections()` in `check-plan.mjs`,
  planted by doubling `## Gates` (**D438**, ruling **S066**). What a reader of the old plan would have gotten
  wrong is named in §Pitfall register, and the reason this belongs in a reply about a communication review is
  that the plan is what told this round what the round's items are — a plan with two of every section is a plan
  a fresh session cannot be trusted to read.

## 10. What a fresh session runs first

```
npm run check:plan && npm run check:plan:selftest
npm run verify                       # 73 ok / 0 failed at this tip; read .design/tmp-gate-logs/deploy/manifest.txt
npm run verify:rig                   # 3 ok; the rig set is not in verify (S028, D291)
node design/review-round-7-census.mjs --no-build   # 75 rows: 64 CLOSED / 8 DECLINED / 3 NOT MEASURABLE / 0 OPEN
node design/grill/rsvp-card-shot.mjs --routes / /dates --widths 1440 390 --out .design/render
```
