# The author's vision — an ask, 2026-11-19

This is a **letter the author has not sent**. It is the tracked home of the one thing the copy mechanism
cannot supply: what the club's own author means when they say the site is for someone. `design/copy-contract.json`
points at it, and `npm run check:copy-contract` reads it. Everything below the questions is written by the
delegate and is a draft; the words the author puts in the bracketed slots are the author's, and they are the
only place a section's reader, its goal, and its voice get ruled.

**Where the letter stands.** The author answered on 2026-11-19, in their own words, for question 1 (one
reader, all five pages), two of the four slots in question 2, and most of question 3. Those answers are landed
below with their date beside each one. The brackets that are left — after `/` and after `/dates` in question 2,
question 4's three sentences, question 5's one sentence — are why `status` still reads `unsent`: the gate
(`vision-letter-shipped-while-unfilled`) fails a `sent` letter with a bracket under it, and it is right to, because
half an author's answers is not the site's vision. Question 3 also carries a half the author could not answer —
"I don't know what we should *not* communicate. I'll need ideas from you" — so the delegate's list of candidates
is filed below as a proposal the author picks from, and picking from it is the errand's, not this seat's.

**Rules this letter keeps.** A slot stays bracketed, in the DESIGN.md convention, until the author fills it — DESIGN.md's Copy rule:
brackets stay until a source exists, and an unfilled slot never ships as a fact. The delegate does not answer
these questions in place of the author; it files the letter and runs the gate. When the author fills the slots,
they change one word here — `status: unsent` to `status: sent` — and the gate fails while any bracket remains
(`vision-letter-shipped-while-unfilled`), so a half-filled letter cannot become the site's vision.

**What the letter changes when it is sent.** `design/copy-contract.json` holds one row per section of every
built page; each row carries `audience`, `goal`, `style`, and a `settledBy` that names who ruled it. Today
every row reads `settledBy: delegate draft, 2026-11-19` — the rows are the delegate's guess at the reader, and
this letter is what replaces that guess. A sent letter moves each row's `audience`, `goal` and `style` to the
author's words, and the gate re-runs against the same built pages.

---

## The five questions, in the author's own words

Answer in the words the club uses, not in the words a page uses about itself.

1. **Who are you writing for?** Not who visits — who you would point at this page and say "this is for
   you": a person who has never met the club and is deciding whether to come; someone who already comes and
   wants to know what happens next; someone whose calendar client is following the feed. Pick **one** per page,
   and say which page breaks that choice.
   - `/` — a visitor who has never attended an event (the author, 2026-11-19: "All pages are written for
     visitors who have never attended an event")
   - `/dates` — the same (the author, 2026-11-19)
   - `/join` — the same (the author, 2026-11-19)
   - `/chat` — the same (the author, 2026-11-19)
   - `/past` — the same (the author, 2026-11-19). **This answer moves the draft's guess.** The delegate's draft
     had `/past` as the page that *breaks* the one-reader choice, because its shipped copy answers "did a date
     already pass, and where are the finished ones written down" — a returner's question. The author says one
     reader for all pages, so the page keeps the reader and its **copy** has to move: a visitor who has never
     attended does not want a shelf of finished dates, they want to know the club has been real for a while and
     is still going. The copy half is MS39's, and it is still open.
2. **What can that reader DO when they leave the page?** One verb and its object each, in the author's own
   words — a place, a date, a thing to carry, a question to ask, a channel to open. If the answer is "nothing;
   they only learn what the club is", say that, and say which page is allowed to be like that.
   - after reading `/` — [what they can do — the author answered for `/join` and `/chat` only]
   - after reading `/dates` — [what they can do — the author answered for `/join` and `/chat` only]
   - after reading `/join` — "they should have a path from this page to a page that is dedicated towards
     persuading the visitor that joining is a good choice for them" (the author, 2026-11-19). **No such page
     exists today**: `/join` is the page, and its own sections are the persuasion. So this answer names a
     surface, not an edit — a new route, or a section promoted into one — and that is a scope call for the
     operator, priced in MS39's row (a sixth emitted route means the nav, the sitemap, `check:indexable`, the
     anchor ceiling, and every whole-page read move with it). **Ruled 2026-11-19: the second of those two, in
     place** (**S076**, **D450**). `/join` now opens with the author's own granted claims — `cost`,
     `membershipRule` (`answers()`, the pair `/` paints) and `turnout` ("Usually three to seven people at a
     table.") — where they sit *before* the three doors instead of two-thirds down the page. No sentence was
     written for that round: the persuasion is the author's words, moved, because a seat may not invent a
     promise in order to make a page persuasive. The sixth route stays parked, and what un-parks it is a
     communication read saying the page cannot carry the pitch, not another copy round.
   - after reading `/chat` — "an understanding of what the group has chatted about recently, so they can be sure
     the group is alive recently and still taking actions and that there are real humans active behind the
     scenes" (the author, 2026-11-19). The shipped page does not give that today: its thread list is
     **deliberately undated**, and its summary section reads "No summary this week." The four words that would
     carry the answer — a date, an activity, a person — are in the channel read, not on the page.
3. **What will you not promise?** The list of things you refuse to say, so a future round cannot invent one:
   price, turnout, a host's name, a first year, a cadence word, a photograph. Each refusal is a slot that stays
   empty, or a sentence that stays off the page — the mechanism for both already exists (D415's slots in
   `src/content.json`, D92's bracketed placeholders).
   - What the author chose to **state** on 2026-11-19, and where each word landed. These are not refusals; they
     are the refusals that became promises, and each now carries a dated source so a later round cannot invent
     a sibling of it:
     - **price** — "price is free, but it's nice to buy a drink or snack or yourself at the venue" (the author's
       words; `or yourself` read as `for yourself`). `src/content.json`'s `cost.value` moved from "Free." to the
       two-sentence form, `asOf` 2026-11-19, the correction path being this letter.
     - **a first year** — "The first year wwas 2019" (read as: the first year was 2019). `src/content.json`'s
       `pastLine` was empty because no record in this tree names a first meeting (MS37's §4 row C8); the author
      's year is what closes that row's trigger. The sentence's wording is the delegate's; the year is the
       author's.
     - **cadence** — "Cadence is twice monthly." `src/content.json`'s `cadence.value` moves to the author's words
       with this letter as its source (D92 requires a source that names the exact word). **No built page paints
       a cadence word today** — `grep -rl cadence dist/client/` reads no hits, and the shipped rhythm sentence is
       generated from the rows (`src/lib/rhythm.mjs`). Putting the author's word on a page is a separate ask, and
       `src/lib/cadence.mjs` does not currently carry the phrase `twice monthly` in the list `check:content`
       fails on, so a printed "twice monthly" would be an unchecked frequency claim.
     - **a current focus** — "The current focus can be derived from the discord chat." The slot stays `null`
       this commit, because the derivation is the thread list that already ships (undated on purpose), and the
       shipped line "There is no syllabus, no reading list to keep up with, and **no current focus**" is now in
       tension with the author's word. That tension is a copy decision, not a fact this seat can settle.
     - **a room** — "whether this is the room you want — this should change. The focus is the social group,
       rather than the room." **Landed 2026-11-19 as a deletion, not a rewrite** (**D451**): asked how far the
       reframing reaches, and shown that the word "group" on `/join` already means the Meetup and Facebook
       groups, the operator took neither candidate sentence and said "Just remove \"Whether the room is your kind
       of room is not something a page can tell you.\", then. I don't like that sentence." The sentence is off
       the page; its `hollowRuled` signature was deleted in the same commit (a signature matching no sentence
       fails `hollow-rule-stale`); and the two `design/copy-contract.json` `goal` strings that spoke of "which
       room is the one they want" and "if the room is not theirs" now speak of a kind of gathering and of the
       group. What it costs, on the record: the visitor probe moves q07 ("is the room one I can be in — quiet,
       seated, reachable?") from DECLINED to UNANSWERED @measured 2026-11-19 by `node design/visitor-questions.mjs`,
       so the question stands and only the page's way of naming it is gone. A sentence about the group here is the
       author's to write — no seat will write one (**S076**).
     - **a photograph** — "photographs will come later." That is a record on MS32, not an un-park: the row keeps
       both of its clauses (a real meeting photograph ≥1600px 3:2 natural light, and the `<role>-<mediaUid>`
       name) and nothing ships until both hold.
   - **What remains refused:** [the list the author asked the delegate to propose — filed below, and the
     author's pick from it is still open]
4. **Three sentences in your own voice.** Copy three sentences you wrote about the club — from a message, a
   post, an email — the way you would say it to a person. Not three adjectives about the tone: the sentences.
   The gate cannot check these; a reader comparing the shipped copy against them can, and that comparison is
   what makes the voice one thing rather than a wish.
   - [your sentence one]
   - [your sentence two]
   - [your sentence three]
5. **What would make a stranger stop reading?** Name the sentence on a shipped page that reads to you as
   somebody else's writing. One sentence per page is enough to start; the census that prints every candidate is
   `npm run check:copy-contract --print-hollow`.
   - [the sentence, and the page it sits on]

## What each answer changes, by hand

| answer | what it changes | the gate that re-runs |
| --- | --- | --- |
| 1 | each page row's `audience`, and any section row whose reader moves with it | `npm run check:copy-contract` (`audience-shift-undeclared`, `contract-audience-unknown`) |
| 2 | each section row's `goal`, and the copy under that heading, until the goal is in it | `npm run check:copy-contract --print-hollow` (the worklist must go down, not up) |
| 3 | a slot's `value` staying `null`, or a sentence being deleted, and the ruling that names it | `npm run check:content`, `npm run check:provenance` |
| 4 | the vocabulary in `design/copy-contract.json`'s `styles`, so a register is the author's words rather than the delegate's | `npm run check:copy-contract` (`contract-style-unknown`) |
| 5 | one sentence deleted or rewritten, and `hollowRuled` gaining or losing its signature | `npm run check:copy-contract` (`hollow-count-worse`, `hollow-rule-stale`) |

## What the delegate proposes the site refuse, 2026-11-19 — the author's to pick from

Not a refusal list anyone owns. The author said on 2026-11-19 they did not know what the site should *not*
communicate and asked the delegate for ideas, so this is the list of candidates: each one is a sentence a
future round could invent, and each names the mechanism that would hold it if the author says yes. The
author's pick from it — which lines stay and which go — is what makes it a refusal list, and it is an errand,
parked in PLAN.md §Parked with the trigger "the author's pick from this list".

| what the site would refuse | why it is a candidate | how it would be held |
| --- | --- | --- |
| what someone brings, and what they must prepare | the shipped "Bring nothing, prepare nothing, and bring a question if you have one." is a rule about a person's hands; a round could grow it into a packing list | a slot (`studySessionShape`, `turnout`) with a correction path, D415 |
| who the club is willing to host, and how many it holds | `hostLine` ships "the one with the laptop open"; a roster is the claim it does not make | a slot that stays nameless (`hostLine`), D432 |
| what the club is for, in the shape of a benefit | the deleted six-card grid — "Expert Guidance", "Learn from experienced mathematicians", "Access to curated learning materials" — is the class D92 measured as invented, and `check:content`'s RETIRED list already refuses six of its strings | already gated: `retired-fabrication` |
| that the club is a place to *be* rather than a place to talk | "always a place where you are allowed to talk over a table" is the author's one venue sentence; anything about ambience, hours, or parking is a claim this tree cannot read | D92: a claim with no source in this tree stays a bracket |
| what the room feels like, or who will be there | the site used to name this question on `/join` and refuse to answer it (D368); the operator deleted that sentence on 2026-11-19 (**D451**), so the question is now simply unanswered — `node design/visitor-questions.mjs` reads q07 UNANSWERED @measured 2026-11-19 — and a future round could still fill the gap with ambience it has never seen | the refusal still holds as a rule: a room description needs a source, and the one the author named is MS32's photograph; D92 keeps an unsourced one a bracket |
| a member count, and what the members do | `membership` reads 280 members off the club's own page, fetched 2026-11-03; a round that says "a community of 280" turns a fetched number into a claim about activity | the slot's dated source, and `check:provenance` |
| a schedule, in words | D92's oldest wound: "weekly" survived two years on the live site. The weekday sentence is generated from rows so it cannot go stale; a frequency phrase typed by hand can | `src/lib/cadence.mjs` is the word list the gate reads — the phrase should join it before the word joins a page |
| that the club has a history it can show | the author has now supplied a year (2019); a round that turns one year into "over seven years of mathematics" is the sibling-invention this class exists to stop | the year in `pastLine`, one sentence, no derived counts |
| an address, a phone line, a map | `mailto` stays declined until the zone has an address (D403, S058); the venue line names a place the row names | the anchor ceiling and `check:rsvp-links` |
| what the club did at a past meeting | `/past` lists dates and nothing else; minutes, slides, a recap would each be an unsourced claim about a session this tree did not record | the state-voice section, and record 0010 (a designed state, never a blank) |

## The exercises (the same five, run against this tree)

Each of these runs on this tree and leaves an artifact a human can check. They are the short version of
`.agents/skills/copy-vision/SKILL.md`, which is the long version with the rules.

1. **Read the letter above and answer it.** Artifact: this file with its brackets filled and `status: sent`.
   Checked by: `npm run check:copy-contract`, which fails while a bracket remains under a `sent` status.
2. **Print the sections and their readers.** Run `npm run check:copy-contract --print-sections`. Artifact: the
   list of body sections, their prose count, and which have a contract row. Checked by eye: does every section
   you can point at have a reader named?
3. **Print the worklist.** Run `npm run check:copy-contract --print-hollow`. Artifact: the sentences on the
   built pages that carry no place, time, price, person, platform, thing to carry, or action, and sit beside no
   link. Checked by: the count, against `design/copy-contract.json`'s `hollow.count` — a copy round that
   improves the copy takes sentences off the list.
4. **The read-back.** Open a built page at a phone width. On paper, write: who you think is reading it, the
   actions it offers you, and the facts you now believe. Then open `design/copy-contract.json` for that route
   and compare. Artifact: the paper. Checked by: any action on the paper that the shipped copy did not give
   you is a section whose `goal` is aspirational, not shipped — and any fact on the page that is not on the
   paper is copy that carries nothing.
5. **Say the section before you write it.** For any section you are about to edit, write its row first —
   reader, what the reader can do after, register — and paste it into `design/copy-contract.json` in the same
   change as the markup. Artifact: the row and the diff in one commit. Checked by: `npm run check:copy-contract`
   in `verify`, which fails the section with no row.

## Where the author's words already are, and how far they got

The author has corrected shipped copy before, and the mechanism kept every word: `src/content.json`'s
`cost.value` was "Free." on the author's grant of 2026-11-16, corrected by their letter of 2026-11-17
(**D381**, **D421**), and is now the two-sentence form the author gave this letter on 2026-11-19 ("Free. It's
nice to buy a drink or a snack for yourself at the venue."); `membershipRule` is their words "no membership
required except an rsvp with a name", also 2026-11-17; `turnout` is their "turnout is 3-7 people
historically", re-worded by a reviewer on 2026-11-18 and kept in a slot rather than in prose so the count
stays a grounded claim (**D385**, **D406**); `hostLine` ships nameless because this tree holds no roster (row
C7 is still open), and `pastLine` **no longer ships empty** — the author's year from this letter is in it
(**D449**), which closes MS37's §4 row C8. **What none of those words ever named is the reader.** That is the
one field this letter is, and the one field no gate in `verify` has ever had a rule for.
