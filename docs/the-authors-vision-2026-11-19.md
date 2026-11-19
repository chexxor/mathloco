# The author's vision — an ask, 2026-11-19

This is a **letter the author has not sent**. It is the tracked home of the one thing the copy mechanism
cannot supply: what the club's own author means when they say the site is for someone. `design/copy-contract.json`
points at it, and `npm run check:copy-contract` reads it. Everything below the questions is written by the
delegate and is a draft; the words the author puts in the bracketed slots are the author's, and they are the
only place a section's reader, its goal, and its voice get ruled.

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
   - `/` — [the one reader this page is written for]
   - `/dates` — [the one reader this page is written for]
   - `/join` — [the one reader this page is written for]
   - `/chat` — [the one reader this page is written for]
   - `/past` — [the one reader this page is written for]
2. **What can that reader DO when they leave the page?** One verb and its object each, in the author's own
   words — a place, a date, a thing to carry, a question to ask, a channel to open. If the answer is "nothing;
   they only learn what the club is", say that, and say which page is allowed to be like that.
   - after reading `/` — [what they can do]
   - after reading `/dates` — [what they can do]
   - after reading `/join` — [what they can do]
   - after reading `/chat` — [what they can do]
3. **What will you not promise?** The list of things you refuse to say, so a future round cannot invent one:
   price, turnout, a host's name, a first year, a cadence word, a photograph. Each refusal is a slot that stays
   empty, or a sentence that stays off the page — the mechanism for both already exists (D415's slots in
   `src/content.json`, D92's bracketed placeholders).
   - [what you will not promise, and which slot or page each refusal belongs to]
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
`cost.value` is "Free." on the author's grant of 2026-11-16, corrected by their letter of 2026-11-17
(**D381**, **D421**); `membershipRule` is their words "no membership required except an rsvp with a name",
also 2026-11-17; `turnout` is their "turnout is 3-7 people historically", re-worded by a reviewer on
2026-11-18 and kept in a slot rather than in prose so the count stays a grounded claim (**D385**, **D406**);
`hostLine` and `pastLine` shipped empty or nameless because this tree holds no roster and no first year, and
the correction path is this letter's ledger (MS37's §4 rows C6, C7, C8). **What none of those words ever
named is the reader.** That is the one field this letter is, and the one field no gate in `verify` has ever
had a rule for.
