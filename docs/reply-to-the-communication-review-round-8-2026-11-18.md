# Reply to the round-8 communication review — 2026-11-18

The letter is at `docs/communication-review-round-8-2026-11-18.md`, saved **verbatim** and blockquoted, so
`check:tables` does not read its tables and every count in it stays the reviewer's number rather than this
tree's — the same rule the round-7 pair was saved under.

This is the answer to it. **Every line item of the letter appears exactly once** in §2, and its row ids are the
census's row ids: `node design/review-round-8-census.mjs --reply docs/reply-to-the-communication-review-round-8-2026-11-18.md`
prints both sets and their differences, so the claim is an instrument's reading rather than a sentence here.
Declines carry the **ruling that holds them** and the command that shows the ruling is still true today — not
taste (D436's `DECLINED` shape). The sentences this tree cannot ground are **draft slots** in `src/content.json`
carrying `asOf` + `correction` (§4), never invented facts. The renders the letter asked for are in §6. The work
this seat must not do on the operator's behalf is in §8.

## 0. Provenance — what this reply measured, and where it lives

| | |
|---|---|
| **Where this reply lives** | the branch `design-enforcement-round-8`, cut from `staging` at **`f49a2ab`**, printed by `git log --oneline staging..HEAD` rather than quoted as a range of shas — a concurrent seat moves a branch length while you read it (D438). **Nothing here is pushed and nothing is merged by this seat**: `staging` is still `f49a2ab` at both ends, `origin` carries no `design-enforcement-round-8`, and `main` is untouched. `git rev-parse HEAD staging origin/staging` @measured 2026-11-18 by that command. The merge and every push stay the operator's (D42, D124), and pushing `staging` after an approval is still not ruled (D124) |
| **The artifact this reply measured** | the tree this branch builds: `npm run build`, then `node design/dist-fresh.mjs` verdict **fresh** — newest build `2026-11-19T02:07:46Z` (`dist/client/sitemap-0.xml`) against newest input `2026-11-19T02:04:43Z` (`package.json`) @measured 2026-11-19T02:07Z UTC by the probe itself (Linux native, Node 24.22.1, 16 CPU). A gate set's own run rewrites the record beside it, so the probe and the number are named together (D418) |
| **The instrument** | `node design/review-round-8-census.mjs` (this round's, written for this letter) writes `design/review-round-8/report.json`: **53 rows, one per line item of this letter**, verdicts **44 CLOSED / 9 DECLINED / 0 NOT MEASURABLE / 0 OPEN** @measured 2026-11-19T02:09Z UTC by `node design/review-round-8-census.mjs --no-build`. Its `--selftest` plants a defect in every row that can be planted and demands the verdict each must produce: **88 of 88 cases ok over 44 plantable rows, 9 rows carry a ruling instead** (D413's rule that a row which cannot fail is an assertion, not a detector). The round-7 instrument stays where it is and answers the round-7 letter; the two do not read each other |
| **The gate sets at this tip** | the three sets are read off `.design/tmp-gate-logs/<set>/manifest.txt`, never off a pipe (D144); their readings are in §10, and a reading quoted here would be a record of an earlier run (D418) |
| **The day, in both clocks** | the letter is dated **2026-11-18** (the reviewer's day, UTC). The rig is Linux native on a **CST** clock, so a stamp here names the **UTC** day it was taken in — 2026-11-19T02:0x UTC is the same window the rig calls 2026-11-18 20:0x CST (D32's rule, generalized) |
| **What the letter is not** | not a measurement. It carries no instrument and no stamp, so its figures — eight absolute URLs, five row headings reading two format names, three Discord invites — are quoted as **the letter's** throughout. Where this reply disagrees with one, it prints the command that produced its own number (D382) |

## 1. The verdict

Six of the letter's premises are already true on the artifact this branch builds, and each one changes what
the round has to do with:

1. **`/dates` sits at 6 absolute outbound anchors outside its own `<footer>`, not 8.** `node design/link-ceiling.mjs`
   prints `ceiling: 6 on /dates of 6 built page(s); the rule R1(a) accepts is 6` and `every page is at or under
   6; /dates is the page that defines it` @measured 2026-11-19T02:09Z UTC. The letter's 8 came from an artifact
   where the footer's platform row and the "Between meetings" cluster each carried the same hosts; **D407**'s
   dedup of the standing row against `EXIT_BAND_PLATFORMS` deleted that duplication. So the letter's own
   diagnosis — *"the duplication is the cause, not the ceiling"* — is already the shipped shape, and what is left
   at the ceiling is the page, not the duplication. Row **D8** prices that claim; rows **D7** and **D7b** are what
   the ceiling now forbids.
2. **`/join` may not print a date, and the letter's line 21 asks it to.** `scripts/check-join-page.mjs` rule `1c`
   (`join-date-painted`) fails any join page that repeats a date, and `scripts/check-dated-surfaces.mjs` keeps a
   `RULED` map naming `/dates`, `/past` and `/` only, so a fourth date-bearing surface fails `dated-surface-unruled`.
   Both trace to the operator's own `/join` objective — no page grows a second source of truth for links, dates or
   claims. Re-ratifying that map is a **ruling**, not this item's call, so the letter's wording is **DECLINED**
   (rows **J3**, **J4**) and its principle is shipped: the pointer made honest without a date,
   `The dates page names the next one.`
3. **The apex photograph the letter offers is stock, and it was never in this tree.** `find src/assets -type f`
   names five files — `hero.png`, three horizon plates, `README.md` — and no meeting photograph. **D86** ruled
   stock crowd photography out ("it shows people who have never attended"), **D94** ruled the site photo-free by
   construction, and **MS32** — the milestone that would commission a real one — was refused by the operator on
   2026-11-17 (*"I can't do this now"*). The letter's own condition, *"if the apex photo is real"*, has never been
   met, so the `<figure>` is declined (row **H5**) and ships the day MS32 lands.
4. **There is no address to print.** `dig +short MX matheapolis.com` answers no record at all, and the same probe
   on `minneapolismathbookclub.com` answers none @measured 2026-11-17 and re-run 2026-11-18 (Linux native, BIND
   DNS), and the operator confirmed on 2026-11-18 that none is provisioned. That is **D403** / **S058**, and it is
   why the mailto is declined (row **J10**) rather than printed and later retracted (D245's class: a surface
   promising a thing nothing serves).
5. **`/schedule` already answers.** `dist/client/_redirects` carries `/schedule` and `/schedule/`, and the 301 is in
   the adapter's `redirects` in `astro.config.mjs` — **D408** shipped it in the round that made it measurable, so
   the letter's ask needs no work (row **D9**). A report that `/schedule` "still 404s" means a fetcher that does not
   follow the 301.
6. **The attendance figure the letter re-writes is a sourced slot, not prose.** "Usually three to seven people at a
   table." ships from `src/content.json`'s `turnout` slot with `asOf` 2026-11-18 and a `correction` path into §4
   row **C6** — because **D265**'s rule is that a count of people may reach a page only from a slot carrying a
   source and an `asOf`, and `check:rsvp-page`'s `SPELL_RE` exempts a spelled count **only** inside a sourced slot.
   Moving the sentence into markup would take the exemption off the page (rows **H2**, **H2b**).

One item the letter names is a **page-level claim this seat cannot read**, and the row says so rather than
guessing: the apex's own seven claims (row **X2**), owned by `npm run probe:live` (D245).

## 2. The inventory — every line item, once

`verdict` is the census's own word for the row: **CLOSED** = the letter's demand is met on the artifact this tree
builds; **CLOSED (already true)** = it was met before this round and the row exists so the next round does not
re-ask it; **DECLINED** = this tree keeps the current shape on a ruling or a fact, with the evidence beside it.
The 53 rows below are the census's 53 rows, in the five columns `npm run check:tables` reads, so a row that loses
a cell loses the line item it was mapping (D416's rule, extended by D436).

| id | the letter's item, in its words | verdict | what this tree does now, and where | the ruling or gate that owns it |
|---|---|---|---|---|
| H1 | Home line 19: "delete the first clause; make it: Most of the arguing happens in the chat between meetings." | CLOSED | the seam is gone from built home (0 hits on `Dates go up on Meetup; most of the arguing`), and the replacement reads in the letter's own words (row H1b, 1 hit) in `src/components/HeroSection.astro` | D350's class, `check:copy` |
| H1b | the same line's replacement half | CLOSED | "Most of the arguing happens in the chat between meetings." 1 hit on built home | as above |
| H2 | "Three to seven people at a table, historically." → "Usually three to seven people at a table." | CLOSED | the old wording reads 0 on built home; it lived in `turnout` in `src/content.json`, not in markup, and its `asOf` moved to the day the re-word shipped | D265, D406, `check:rsvp-page` `SPELL_RE` |
| H2b | the letter's wording, shipped | CLOSED | "Usually three to seven people at a table." 1 hit, painted from the sourced slot (§4 row C6) — the wording is the reviewer's, the number is the operator's | D385 → D421 → this round |
| H3 | delete the H2 "When we meet" OR move line 7-9 under it; "Do not leave a when heading with no when in it." | CLOSED | heading deleted, per the operator's own answer (delete the heading and its promise, keep `/` date-free); built home prints 0 "When we meet" | D340, D306, `check:dated-surfaces` |
| H3b | the band's heading ladder, once the H2 is gone | CLOSED | "How it works" 1 hit, and it is the band's opening heading, so the ladder does not skip a level | D306, `check:naming` |
| H4 | ADD after the thread list: "Ask for [host name]; they're usually the one with the laptop open." + the Home Add row "one sentence naming a human" | CLOSED | ships as one sentence without the bracket — "Ask for the host; they're usually the one with the laptop open." — read from `hostLine` in `src/content.json` (§4 row C7). No literal bracket ever ships | D415, `check:content` |
| H4b | Home Add: "one sentence of past" | CLOSED | landed as an **empty draft slot**, `pastLine` in `src/content.json`, which paints nothing and carries `asOf` 2026-11-18 and a `correction` path into §4 row C8 — nothing in this tree records a first meeting | D415, D148, `check:content` `draft-claim-uncorrectable` |
| H5 | ADD, if the apex photo is real: a `<figure>` after "What we take up" | DECLINED | the condition was never met and the file is not in this tree — see §7 item 1 | D86, D94, MS32 (refused 2026-11-17) |
| H6 | Home/Revise: "split the lede at the dash" | CLOSED | priced as a number: `/` body-zone max sentence is **19 words**, down from 23, and both long sentences split. The bar is the page's OWN prose: `bodyMaxSentenceWords` counts the body zone only, because the exit band's 21-word sentences are D115's site-wide copy on all five pages and no letter item asks to change them | D437's metric rows, `src/components/HeroSection.astro` |
| H7 | Keep: line 38's fuller Meetup sentence | CLOSED | "Dates and places go up on" 1 hit — the site naming its own limit, which D350 closed by deleting | D350, `src/components/SignUpLinks.astro` |
| H8 | Keep: line 48, the rent line | CLOSED | "buy a coffee if you want one" 1 hit — D388's whole answer for arriving | D381's slot, `check:copy` |
| H9 | Keep: line 13, the cost and membership answer | CLOSED | "Free. No membership needed" 1 hit — the operator-granted pair | D381, D421, S058's sibling grants |
| H10 | Keep: line 23's caption (the engraving's provenance) | CLOSED | "cropped from that leaf" 1 hit — D101/D116's rule that a drawing says what it is | D101, D116, `check:line-art` |
| D1 | "lede, replace one long paragraph" with the letter's three sentences | CLOSED | "A social is an afternoon around a table, nothing to prepare. A study session is an evening working side by side." 1 hit in `src/components/Schedule.astro` — the kinds get their own sentence, in the letter's words | this round, over D431's lede |
| D1b | the same lede's other half: the clause that chained the two kinds | CLOSED | "with nothing to prepare; a study session" reads 0 — the semicolon that made the lede one paragraph is gone | as above |
| D2 | Dates/Revise: "split the lede" | CLOSED | `/dates` body-zone max sentence is **14 words**; the page opened at 55 words in one paragraph | D437's metric rows |
| D3 | "row headings: date leads. Sat, Nov 21 — Social as the heading; Social becomes a label inside the row" | CLOSED | five headings, each opening with its row's own weekday, month and day, generated from the feed and never typed: `h2: Sat, Nov 21 — Social`, `h2: Wed, Nov 25 — Study session`, `h2: Sat, Dec 5 — Social`, `h2: Wed, Dec 9 — Study session`, `h2: Sat, Dec 19 — Social` | D397's rails, `check:row-geometry`, `check:svelte` |
| D3b | the same ask's other half | CLOSED | 0 headings read "Social" or "Study session" alone — five headings reading two format names is a screen-reader defect as well as a copy one | as above |
| D4 | "mark the Nov/21/Sat block aria-hidden" | CLOSED | 5 built date rails carry `aria-hidden="true"` before their `data-leaf`, on the built bytes, not in a comment | D397's rails, D437's `source` rows |
| D5 | "delete line 95 (repeated explanation)" | CLOSED | "Google, Apple and Outlook can all follow" reads 0 **in the body**; the band says it once on every emitted page | D115, `check:rsvp-page` |
| D6 | "delete line 93 (duplicate platform row)" | CLOSED | priced, not remembered: **0** URL the exit band paints is painted a second time above it on `/dates` (`bandRepeat` `/dates=0`) | D407's dedup, D437 |
| D7 | Dates/Add: "a maps link" | DECLINED | 0 map hosts on `/dates`; the page is **at** the ratified ceiling — see §7 item 2 | D358, `check:rsvp-page`, `design/link-ceiling.mjs` |
| D7b | Dates/Add: "a per-row `.ics`" (the letter's own data exists: `dist/client/events.ics` carries one entry per event) | DECLINED | the evidence row prints `body: Add to a calendar → /events.ics` and `exit-band: Add to a calendar → /events.ics`; the file the letter counts is real, the affordance is the ceiling's — see §7 item 2 | D358, `check:rsvp-page` rule 10, `npm run check:ics` |
| D8 | "eight absolute URLs against a ceiling of six — deleting the duplicate row returns 6" | CLOSED | re-priced off this tree: `/dates` = **6 of 6** — the duplication the letter blamed is gone, so the ceiling is not what needs raising | D358, D407, `node design/link-ceiling.mjs` |
| D9 | Dates/Add: "the `/schedule` redirect" | CLOSED | already shipped in the round that made it measurable: the 301 is in the adapter's `redirects` in `astro.config.mjs`, read there because a redirect is a response header and no page in `dist/` carries it | D408, `check:route-targets` |
| J1 | Join line 48: "The club's member list, and where a date gets announced." → "Where the club announces dates, and keeps the RSVP list." | CLOSED | ships in the letter's words, at its one home: `joinChannels()` in `src/lib/rsvp.mjs` is the single home for which platforms the club has | D264, `check:join` |
| J1b | the same line's first half | CLOSED | the old wording reads 0 on built `/join` | as above |
| J2 | line 60: "Expect nothing." → "Nothing is expected of you." | CLOSED | ships; the imperative that read as a command becomes the sentence that answers "what do I have to do" | D392's arrival rule, `check:join` |
| J2b | the same line's first half | CLOSED | "Expect nothing" reads 0 | as above |
| J3 | line 21: "The next ones are on the dates page." → "Next: Sat, Nov 21, noon — all the dates" | DECLINED | painting a date on `/join` fails two gates this tree will not contradict — see §7 item 3 | `check-join-page` rule 1c, `check-dated-surfaces` `RULED` |
| J3b | the same line's first half | CLOSED | the old pointer reads 0; what ships instead is "The dates page names the next one." in `src/pages/join.astro` | as above |
| J4 | the handshake that named date implies: `/join`'s date must equal the first date `/dates` prints | DECLINED | the row is kept so the instrument prints `/join = none` rather than a memory; `check-dated-surfaces` is the gate that guards the same comparison across surfaces, and it is green because no surface disagrees — see §7 item 3 | `check-dated-surfaces` |
| J5 | line 44: "A feed you already read, where the club can put a date." → "Two feeds, if you'd rather not use Meetup." | CLOSED | ships in the letter's words (typographic apostrophe, matching the page's own), from `JOIN_KIND_COPY.social` in `src/lib/rsvp.mjs` | D264 |
| J5b | the same line's first half | CLOSED | "A feed you already read" reads 0 | as above |
| J6 | delete the second sentence of line 58 ("There is nothing to prepare…"); home already says it | CLOSED | reads 0 on `/join`; the sentence stays on home, the surface that says what a meeting is | D344, D369's registered deliberate duplicate |
| J7 | Keep: "Whether the room is your kind of room…" until a photograph exists | CLOSED | 1 hit on `/join`, kept; its trigger for deletion is MS32, the same condition D389 wrote and the letter's own apex line repeats | D389, MS32 |
| J8 | Keep: "Three ways in…" and do NOT add a fifth door | CLOSED | 1 hit; and the shape is priced rather than trusted — row J9 reads `/join` at exactly **1** control in the `primary` role | D303, D304, `check:primary-action` |
| J9 | the same Keep row's structural half | CLOSED | `/join:primary=1` | D140's declared-role rule, `check:primary-action` |
| J10 | Join Add: "Or write to hello@matheapolis.com — one of us reads it." | DECLINED | `grep -ric mailto dist` reads 0 — no address is provisioned; see §7 item 4 | D403, S058 |
| C1 | move "No summary written this week" to the end, as one line, no heading | CLOSED | the old heading-and-void reads 0 on built `/chat` | D409's heading over a void |
| C1b | the one line, in the letter's words, at the bottom | CLOSED | "No summary this week. The channel is the live thing." 1 hit, in `src/components/DiscordSummary.svelte`'s pending state, below the thread section | this round, over D414 and D437 |
| C2 | Keep: "Our bot writes this section from recent channel activity, after the noise settles." | CLOSED | survives byte-for-byte — it is the only thing on the page that says how the section is made | D432, kept by this round |
| C3 | delete "the dates the club set" from the lede | CLOSED | reads 0 on `/chat`; the subtitle no longer promises what the page does not print | D411's class, this round |
| C4 | delete "The chat itself" (lines 37-40) entirely | CLOSED | 0 headings say it; "the channel is the live thing" went from three statements on the page to two | D414, D437, this round |
| C5 | line 23 → "Nine threads the club is pulling on. Any can be dropped mid-sentence; none is a prerequisite for arriving." | CLOSED | ships, with the count generated from `threads()`'s own length rather than typed — eight threads would print "Eight" | D411's list, `countWord()` in `src/lib/content.ts` |
| C5b | the meta-description it replaces | CLOSED | "Every thread on the list, each with what the club says it is" reads 0 — that described the teaser instead of the page | D411 |
| C6 | line 35 → a figcaption under the drawing | CLOSED | `<figcaption` present in `src/components/ThreadFigure.astro`: the provenance line is the drawing's own label, not a paragraph of the page | D324's cap, `check:line-art` |
| C6b | the same move's other half | CLOSED | "not a scan of a book" reads 0 in `src/pages/chat.astro` — it stopped being body prose | as above |
| C7 | Keep: "one line of human framing above the bot voice" | CLOSED | "Nobody typed these lines" survives byte-for-byte in `src/components/DiscordSummary.svelte`. The row reads the **component**, not the built page: the island hydrates with `client:visible`, so the branch that carries a summary never appears as built bytes — round 7's instrument met the same trap | D432, D434's `source` rows |
| X1 | Apex: "one host, one site: point the apex at this build" | DECLINED | a deploy on the live zone, and the grant is the operator's — see §8 | D42, D245, D124, `npm run probe:live` |
| X2 | Apex: "reconcile seven claims before it goes live" | DECLINED | the apex page is not in this tree and no seat here may change it; what this tree holds is the slot file. See §8 | D245, this round |
| X3 | Apex: "if math-group-image is a real meeting photo… if it is stock, delete it and commission nothing in its place" | DECLINED (agreement) | it is stock, and the file was never in this tree's shipped pages — `metrics.assets` names `hero.png` and three horizon plates and no photograph. Commissioning nothing is what the ruling already says, so the row records agreement rather than owing work | D86, D94, D120 |

## 3. The letter's own counts, priced off the same read

The letter's numbers are its artifact's; this tree re-prices each one off the build it just made, and the
instrument prints them together so the two can be read side by side.

| the letter's count | this tree's reading, and the command that prints it |
|---|---|
| eight absolute URLs outside `<footer>` on `/dates` | **6 of 6** — `node design/link-ceiling.mjs`, which also names the page that defines the ceiling: `/dates` |
| five row headings reading two format names | **5** headings, each leading with its own date; 0 headings naming a format alone (row D3, D3b) |
| three Discord invites | **1** outbound Discord anchor outside the footer on `/chat`, **2** inside the band; pressable controls on `/chat`: **primary 0, secondary 1** (the card's `primary` control was deleted in the round that made this countable) |
| the lede is one long paragraph | `/` body max **19 words** (was 23), `/dates` body max **14** (was 55) — `metrics.bodyMaxSentenceWords` |
| "the next ones" is a pointer to another page | `/join` prints **no** date, by two gates (rows J3, J3b, J4) |
| the assets the apex offers | 5 files in `src/assets`: `hero.png`, three horizon plates, `README.md` — 0 photographs (row X3) |
| the drawing has a caption floating as prose | `/chat` carries **1** `<figcaption>`; the other four pages carry 0 and need none (row C6) |

## 4. The claims ledger — sentences shipped on an operator grant rather than a fact this tree can read

Each row is a sentence the site paints whose source is a **word from the operator or the reviewer**, not something
this repo can read. `npm run check:content` prints these slots as the ledger, and its `draft-claim-uncorrectable`
rule fails any draft slot that carries no `asOf` or no `correction` (D415). The operator corrects a claim by editing
that slot's `value`; the row stays to record what shipped and when. Rows **C6**, **C7** and **C8** are the three this
round moved, and `src/content.json`'s `turnout.correction`, `hostLine.correction` and `pastLine.correction` name
this section by these ids.

| id | the sentence as shipped | where it prints | its slot, `asOf`, and where the operator's correction goes |
|---|---|---|---|
| C1 | "Free." | `/`, `/join` | `cost` in `src/content.json`, `asOf` 2026-11-17 — `docs/reply-to-the-communication-review-round-6-2026-11-16.md` §4 ledger C1 (D381, corrected D421) |
| C2 | "No membership needed — you just come; an RSVP with your name is all the club asks." | `/join` | `membershipRule`, `asOf` 2026-11-17 — the same ledger's row C2 |
| C3 | "The club's list of members is its Meetup group page" (its tally stays **off** the page) | `/join`, in words only | `membership`, `asOf` 2026-11-03 — D276 keeps a member count off the surface; `check:rsvp-page` fails a tally of people reaching built HTML |
| C4 | "People bring textbooks, problem sets, and half-finished projects; nobody is teaching and nobody is being tested." | `/join`, under the study-session format | `studySessionShape`, `asOf` 2026-11-18 — `docs/reply-to-the-communication-review-round-7-2026-11-18.md` §5 ledger C4 |
| C5 | the cadence: Saturdays at noon, Wednesdays at 6 pm | `/`, `/dates`, `/join`, the feed | `cadence`, `asOf` 2026-11-03 — sourced from the club's own calendar, so it is a fact rather than a grant, and the window is regenerated from `data/events.json` on every build |
| C6 | "Usually three to seven people at a table." | `/` | `turnout`, `asOf` 2026-11-18. The number is the operator's (2026-11-16, corrected 2026-11-17); **the wording is this letter's**, so the re-word is a draft claim on the standing grant and the sentence stays in the slot — prose of the same sentence would take the exemption off `check:rsvp-page`'s spelled-count rule |
| C7 | "Ask for the host; they're usually the one with the laptop open." | `/`, after the thread list | `hostLine`, `asOf` 2026-11-18. **No name ships**: this tree holds no roster of hosts and no name for one, so the sentence says "the host" rather than inventing one (D415 forbids shipping a literal bracket). The operator supplies a name by editing this value |
| C8 | (empty — paints nothing) | `/`, where a sentence of past would sit | `pastLine`, `asOf` 2026-11-18, `value: ""`. Nothing in this tree records a first meeting — `data/events.json` starts 2026-11-07 and the apex's own page is not in this tree (D245) — so the slot ships empty and its row's trigger is that value being non-empty (D148) |

## 5. What this round changed in the instrument and the gates

| change | what it now catches | the decision |
|---|---|---|
| `design/review-round-8-census.mjs --reply <path>` — a row-set checker that reads the reply's §2 table and the census's rows and prints both set differences and any dupe | a reply that quietly answers 44 of 53 items, or answers one item twice, or invents a row for an item the letter never raised. Also checks that every `§4 ledger C<n>` citation in `src/content.json` lands on a real row in this section, so a slot cannot point at a ledger row that is not there | **S071**, **D446** |
| `bodyMaxSentenceWords` as a metric, used by rows H6 and D2 | a lede claim that was priced against the whole page and could not move: the exit band's 21-word sentences are D115's site-wide copy on all five pages, so a whole-page maximum is the same number everywhere and fixing a lede would never change it | **D446** |
| rows **D8** (the ceiling's own reading), **D7b** (the per-row `.ics` the letter says exists), **D9** (the `/schedule` redirect), **H4b** (the past sentence) | four items the first draft of the round had **no row for** — an item with no row is invisible to the instrument, which is the property MS34's exit gate insists on | **D446** |
| rows **J3**, **J4**, **C7**, **H4b** converted to read a **ruling**, a **component**, or a **config** rather than a built page | two of the letter's fixes that would turn two gates red (`check-join-page` rule 1c, `check-dated-surfaces` `RULED`); a client-rendered island whose branch never reaches the built bytes; a redirect that is a response header no `dist/` page carries | **D446** |
| `check:tables` takes the round-8 pair into its `FILES` | that round-8's inventory and claims ledger are audited for cell count like round-6's and round-7's, so an inventory row that loses a cell loses the line item it was mapping | D416's rule, extended by D436, and this round's extension of it |

## 6. The renders the letter asked for

The letter's own page list — whole pages of home and `/dates` at 1440 and 390, "the layer the last four rounds of
prose have been unable to reach". They exist, taken after every copy change in this round landed, against the build
this reply measured:

```
node design/grill/rsvp-card-shot.mjs --routes / /dates --widths 1440 390 --out .design/render
```

| file | what it is |
|---|---|
| `.design/render/home-1440.png` | whole home page at 1440 wide |
| `.design/render/home-390.png` | whole home page at 390 wide |
| `.design/render/dates-1440.png` | whole `/dates` at 1440 wide |
| `.design/render/dates-390.png` | whole `/dates` at 390 wide |

Two things stated rather than hidden: `.design/render/` is **gitignored scratch**, so a fresh clone will not carry
them — they are a hand-off, not an artifact the repo ships, and the tracked artifact is the script above. And
**1440 is not one of the widths the render gates read** (`check:render` reads 1240 / 640 / 390 / 320, and 320 is
mandatory per D114), so a composition complaint at 1440 is not automatically a gate failure at any width the gates
read; the four pages were checked at the widths the gates read, and those runs are in the sets' manifests.

## 7. The declines, in reply form

Each is a decision this tree makes against the letter, with the command that shows it is still true today. None is
a judgment about the writing.

1. **The `<figure>` after "What we take up" (H5).** The letter gates it on its own condition — *"if the apex photo
   is real"* — and that condition has never been met. `find src/assets -type f` names five files and no photograph;
   `math-group-image.jpg` is on the apex, not in this tree, and it was a stock crowd photo with an invented alt.
   **D86** ruled stock crowd photography out ("it shows people who have never attended"), **D94** ruled the site
   photo-free by construction ("no club photograph exists, so no surface may require a picture"), and **MS32**, the
   milestone that would commission a real one, was refused by the operator on 2026-11-17. **What would ship it:**
   MS32 landing a real meeting photograph ≥1600px on the long edge, 3:2, natural light, no filter, named
   `<role>-<mediaUid>.<ext>` — then the `<figure>` and its slot land together.
2. **A maps link per row, and a per-row `.ics` (D7, D7b).** `node design/link-ceiling.mjs` prints `ceiling: 6 on /dates
   of 6 built page(s); the rule R1(a) accepts is 6`, and `npm run check:rsvp-page` enforces the same number. Five
   rows gaining a maps link is **11 of 6**; five rows gaining a download anchor is the same arithmetic against the
   same ceiling. What ships is what the letter's own evidence says is already there — one site-wide feed the page
   offers twice (its body row and its band row), and `dist/client/events.ics` carries one entry per event, so a
   subscriber's calendar app already holds every date and the address printed with it. Raising a ratified ceiling is
   one-way, so the ask is §8's, not this round's.
3. **Naming the date on `/join` (J3, J4).** `scripts/check-join-page.mjs` rule `1c` (`join-date-painted`) fails any
   join page that repeats a date, and `scripts/check-dated-surfaces.mjs` keeps a `RULED` map naming `/dates`, `/past`
   and `/` only, so a fourth date-bearing surface fails `dated-surface-unruled`. Re-runnable proof that the gates are
   live and green today: `npm run check:join` and `npm run check:dated-surfaces`, both exit 0 while `/join`
   prints no date. Both gates trace to the operator's own `/join` objective — no page grows a second source of truth
   for links, dates or claims — so re-ratifying the map is a **ruling**, and ids are append-only (D436). **What shipped
   instead** is the letter's principle without the letter's mechanism: the pointer made honest in place, "The dates
   page names the next one.", so a reader learns where the answer lives without `/join` holding a copy of it that can
   go stale. **What would ship the letter's wording:** a ruling adding `/join` to that `RULED` map — one-way in the
   same sense the ceiling is, because it decides which surfaces may go stale on their own (§8 item 5).
4. **The mailto (J10).** `grep -ric mailto dist` prints **0**. `dig +short MX matheapolis.com` answers no record, and
   the same probe on `minneapolismathbookclub.com` answers none @measured 2026-11-17 and re-run 2026-11-18 (Linux
   native, BIND DNS); the operator confirmed on 2026-11-18 that no address is provisioned. **D403** / **S058** is the
   ruling that holds it, and its trigger is the operator provisioning Cloudflare Email Routing on the apex zone — the
   six-step guide is §11 of the round-6 reply. Printing an address before it forwards is one-way (a door that serves
   nothing is D245's class), so it stays declined until the destination exists.
5. **Pointing the apex at this build (X1), and reconciling the apex's seven claims (X2).** Both are the apex: the
   domain is the operator's, production has served an older artifact than this tree would ship while every gate read
   `dist/` (**D245**), and `npm run probe:live` is the only instrument here that compares what a visitor is actually
   served with what this tree would ship. Priced in §8, with the cutover's alternatives and the grant each needs.
6. **`math-group-image` (X3).** The letter's own branch — *"if it is stock, delete it and commission nothing in its
   place"* — is already what the rulings say (**D86**, **D94**), and the file was never in this tree's shipped pages
   (`metrics.assets` names `hero.png` and three horizon plates). So this row records **agreement**, and the work it
   would owe is MS32's, which the operator refused.
7. **A fifth door and a painted headcount moved into prose (J8's "do not add a fifth door", H2b's wording).** Both
   are kept rather than changed, and both are priced: `/join` declares exactly one control in the `primary` role
   (row J9, D303's rule), and a count of people reaching a page must come from a sourced slot (D265, D406). The
   letter's re-word shipped **into the slot**, which is where the exemption lives.

## 8. What stays the operator's

These are one-way or costly, and this delegate does not decide them. Each is priced with its options, the access
each needs, and the one measurement that would change the ranking.

1. **Pointing the apex at this build** (row X1). (a) **Cut the apex over now** — pros: one host, one site, and the
   letter's premise stops being a lie a visitor can test; cons: the apex today answers with an artifact from before
   this round (D245's reason a live site and a green gate set are different facts), and a cutover is a live write
   with no undo. (b) **Cut the review edge only** (`npm run preview:deploy`, D124) — pros: a Worker Preview is not the
   site, it takes the preview D1 and preview KV, and it never touches the apex triggers; cons: it does not answer the
   letter's premise, it only makes the round reviewable. (c) **Hold both** and write the dated cutover letter — pros:
   nothing goes live that the operator has not read; cons: the letter's first bullet stays open forever.
   **Recommendation: (b) now, (a) only with a dated cutover letter** — that is MS02's existing shape, whose trigger is
   exactly that letter and whose operator's word was *"Not now"*. **Access:** (a) and (c) are the operator's grant to
   run a deploy against the apex; (b) needs the operator's `wrangler` credentials and their word to run
   `npm run preview:deploy`. **The measurement that would change the ranking:** `npm run probe:live`, which prints what
   the apex actually serves today against what this tree would ship.
2. **Email Routing on the apex zone** (row J10). (a) **Provision `hello@matheapolis.com`** and ship the mailto — pros:
   the private door the letter has now asked for a fourth time becomes real, and the row turns CLOSED with no code
   change beyond one anchor; cons: it is a live write on the zone's DNS and it invites the site to become a place
   people write to, which the club has not decided. (b) **Keep the Discord door only** — pros: every door this tree
   ships is one a question can actually be typed into; cons: a visitor with no Discord cannot reach the club. (c)
   **Provision the address and print nothing** — pros: the door can be added in one edit later with the destination
   already working; cons: an address that forwards to nothing is one state more than this round needs.
   **Recommendation: (a) if the operator has a person behind the address, otherwise (b)** — the decline is a fact
   (no MX record answers), not a preference. **Access:** (a) needs the operator's Cloudflare zone: create the Email
   Routing address, then verify it with `dig +short MX matheapolis.com`. **The measurement that changes the ranking:**
   that same `dig`, which today answers nothing.
3. **The photograph (MS32), which un-parks rows H5, J7 and X3 together.** (a) **Commission one** to the spec the
   operator set — ≥1600px on the long edge, 3:2, natural light, no filter, named `<role>-<mediaUid>.<ext>`, role
   ∈ {social, study} — pros: three rows close at once, and the site stops being photo-free by construction rather
   than by promise; cons: refused 2026-11-17 (*"I can't do this now"*), and a photograph of a table is a claim about
   the club's own rooms. (b) **Keep the drawings** — pros: the engravings carry their provenance (D101, D116) and say
   what they are; cons: a join page with no human face is the thing the letter is circling. (c) **Commission a room,
   not a crowd** — pros: it answers D86's objection (people who have never attended) without putting faces on the
   site; cons: it is still a photograph, and the site's rule against one (D94) has to be re-ruled to allow it.
   **Recommendation: (c) when the operator can take one, (b) until then** — D94 makes the current shape a rule, not a
   gap. **Access:** the operator's camera and their word that the file may be re-hosted; nothing in this rig can
   produce it. **The measurement that changes the ranking:** `find src/assets -type f`, which today names five files
   and no photograph.
4. **Re-ratifying the anchor ceiling above 6** (rows D7, D7b). Four alternatives priced in absolute outbound anchors
   outside `<footer>` on `/dates`: (a) a per-row maps link — **11 of 6**, five rows × one new host; (b) one directions
   link per **page** rather than per row — **7 of 6**; (c) the address already in the feed's `LOCATION` plus a
   `GEO` per event, so a subscriber's map app reads the event with **no new anchor**; (d) a second ratified number
   for map hosts only, which must say in the rule why two ceilings exist. **Recommendation: (c)** — the only
   alternative that costs zero anchors, and the `GEO` line already ships, so what the visitor wants is already in
   the file the letter calls the site's worst surface. **Access:** (a) and (b) need `scripts/check-rsvp-page.mjs`'s
   `OUTSIDE_BAND_LIMIT` raised and `check:render`'s row geometry re-read; (c) is one line in `src/lib/ics.mjs` plus
   `npm run check:ics`; (d) needs a ruling naming both numbers. **The measurement that changes the ranking:**
   `node design/link-ceiling.mjs` after the change, which prints the ceiling and the page that defines it.
5. **Adding `/join` to the `RULED` dated-surface map** (rows J3, J4). (a) **Add `/join`** — pros: the letter's
   wording ships, and `/join` becomes one of the surfaces allowed to name the next date, so a reader sees the answer
   where they asked it; cons: it puts a second copy of the schedule on the page whose whole contract is "one door,
   one truth", and a `/join` that goes stale is a live lie. (b) **Keep the pointer** — pros: no surface can drift out
   of agreement with `/dates`, which is the comparison `check-dated-surfaces` guards; cons: the answer costs one hop.
   (c) **Add `/join` and give it the same provenance stamp `/dates` carries** — pros: staleness becomes visible
   instead of silent; cons: a stamped date on a join page reads as an apology to a first-time visitor.
   **Recommendation: (b)**, and (c) only if the operator wants the date on the page — the gate's current green is a
   fact about the map, not a preference about the copy. **Access:** the map is a ruling's, in `scripts/check-dated-surfaces.mjs`;
   (a) and (c) also need `scripts/check-join-page.mjs`'s rule `1c` relaxed or re-ruled in the same change.
   **The measurement that changes the ranking:** `npm run check:dated-surfaces`, which prints the surfaces the map
   rules and the date each currently claims.

## 9. What this round corrects in its own records

- **The instrument's `--reply` checker is what makes this round's central claim checkable.** The first draft of this
  reply asserted "every line item appears exactly once" over an inventory that had not been counted against the rows.
  The claim is now a command: `node design/review-round-8-census.mjs --reply <path>` prints both id sets, their
  differences and any dupe. An assertion an instrument can count is the only kind that survives a reviewer with grep.
- **Four letter items had no row until this round gave them one** — the ceiling's own reading (**D8**), the per-row
  `.ics` the letter says exists (**D7b**), the `/schedule` redirect (**D9**), and the sentence of past (**H4b**).
  A letter item with no row is invisible to the instrument, and that is the property MS34's exit gate insists on.
- **Two rows were converted from "ship it" to "a ruling holds it" before any edit was attempted** (**J3**, **J4**):
  the letter's wording would have turned `check-join-page` and `check-dated-surfaces` red, and a copy edit that turns
  a gate red is escalation, not a fix. The principle shipped instead of the wording.
- **The lede rows had to move from a whole-page metric to a body-zone metric**, because the exit band's 21-word
  sentences are D115's site-wide copy on all five pages: a whole-page maximum is the same number on every route, so
  a row reading it could not move by fixing a lede — a row that cannot fail is D413's assertion, not a detector.
- **Row C7 reads the component, not the built page.** `/chat` hydrates the island with `client:visible`, so the branch
  that has summary data is compiled into the runtime and the built bytes never carry it. Round 7's instrument met the
  same trap and stated the rule: client-rendered copy is measured in the component that declares it (D434's `source`
  rows).
- **The letter's 8 anchors stays the letter's**, described nowhere as this tree's — the same clause MS30's and MS33's
  rows carry. The number this tree ships is 6, and it is the **page** at the ceiling, not the duplication the letter
  blames, that is now there (**D407**'s dedup, D358's ceiling).

## 10. What a fresh session runs first

```
git log --oneline staging..HEAD | cat          # this item's commits, off the cut at f49a2ab
node design/dist-fresh.mjs                     # fresh before any probe reads dist
node design/review-round-8-census.mjs --no-build   # 53 rows: 44 CLOSED / 9 DECLINED / 0 OPEN
node design/review-round-8-census.mjs --reply docs/reply-to-the-communication-review-round-8-2026-11-18.md   # empty set differences, no dupes
node design/review-round-8-census.mjs --selftest   # 88 cases over the plantable rows, 9 rows carry a ruling
node design/link-ceiling.mjs                     # the ceiling, and the page that defines it
npm run verify                                   # read .design/tmp-gate-logs/deploy/manifest.txt, never the pipe (D144)
npm run verify:rig ; npm run verify:browser      # the other two sets, each with its own bar (S028, D291)
npm run check:plan && npm run check:plan:selftest
npm run check:tables && npm run check:tables:selftest
npm run check:decisions && npm run check:figures && npm run check:content && npm run check:content:selftest
node design/audit-references.mjs --stale         # exit 0: no BROKEN path literal
```
