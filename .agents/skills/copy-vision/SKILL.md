---
name: copy-vision
description: "Writes and reviews the site's copy as a contract per section: every section of a page is a function of three inputs — the reader it is written for, what that reader can do or believe after it, and the voice register it is written in. Use before writing or editing any shipped sentence, and use when copy is said to read as fluff, inauthentic, or inconsistent with the club's own voice. Enforced by npm run check:copy-contract."
---

# Copy vision

A section of a page is a function of three inputs:

```
section = f(target audience, section goal, text style)
```

Nothing else. A sentence is not a unit of this design; a **section** is. A page is the set of its sections,
and the page has one audience unless a row says the reader changes and says why.

## Where the three inputs live in this tree

One home: **`design/copy-contract.json`**. One row per section of every built page, carrying:

| field | what it is | why it is there |
| --- | --- | --- |
| `audience` | one slug from the record's `audiences` vocabulary — which reader this section is written for | the reader is the copy's address; without it a sentence is written for whoever happened to edit the file |
| `goal` | what that reader can **do**, or **believe**, when they leave the section | the goal is what the copy has to deliver; a goal nobody can point at in the section's own words is copy that carries nothing |
| `style` | one slug from the record's `styles` vocabulary — the voice register | the register is what makes five pages read as one club rather than five authors |
| `settledBy` | who ruled the row, and on which day | an unsettled row is the delegate's draft; the author's word replaces it, and the record says which is which |

The vocabularies live in the same file (`audiences`, `styles`), so a row cannot invent a reader or a voice
nobody declared. The page's own `audience` is on its entry, and a section that names a different one must
carry `shiftWhy` — that is what keeps one page from addressing two readers in one voice.

The gate is **`npm run check:copy-contract`** (in `verify`, after `build`). Run it with:

```bash
npm run check:copy-contract                       # the verdict
npm run check:copy-contract:selftest              # the gate can still fail (9 plantings + a clean control)
npm run check:copy-contract --print-sections      # which sections the build carries, and which have no row
npm run check:copy-contract --print-hollow        # the worklist: sentences that carry no reader-usable fact
```

## The rule for settling a section's goal — with the author, not about the author

A section's goal is **the author's**, not the delegate's. The author of the club is the only one who can say
what a reader should be able to do after reading a page. So:

1. **Ask, in the author's own words.** The ask is a tracked letter: `docs/the-authors-vision-2026-11-19.md`.
   Five questions — who you are writing for, what that reader can do when they leave, what you will not
   promise, three sentences in your own voice, and what would make a stranger stop reading. Its slots stay
   bracketed until the author fills them (DESIGN.md's Copy rule: brackets stay until a source exists).
2. **Never answer in place of the author.** Until the letter is sent, every row carries
   `settledBy: delegate draft, <date>` — the rows are a draft the author corrects, and the record says so.
   The gate prints the letter's status; a letter that calls itself `sent` while any bracket remains fails
   (`vision-letter-shipped-while-unfilled`), so a half-filled letter cannot become the site's vision.
3. **A goal the author has not settled is not a licence to invent one.** A section whose goal needs a fact
   this tree cannot ground goes to a slot in `src/content.json` with `asOf` and a `correction` path (D415),
   or stays unpainted (D376's refusal), or is named as a gap in the open (D368). It does not go into markup
   as a sentence that sounds true (D92).

## The reject rule: filler earns no fact

> A sentence is filler when nothing a reader can **do** and nothing a reader can **believe** changes if it is
> deleted. Its payload is the page, or the site's own data model, rather than the club or a person.

That is a machine test, and the gate runs it: a body sentence carrying **no club fact** — no place, time,
hour, price, platform, person, number, thing a person carries, or action — and sitting beside **no link**,
minus the sentences a ruling already owns (`hollowRuled`, each with its decision and its why). The count is a
**floor**: `design/copy-contract.json` records it, and the gate fails when it rises (`hollow-count-worse`).
A copy round takes sentences off the list; it may not put them back. An exemption whose needle matches no
current sentence is itself a defect (`hollow-rule-stale`) — round 7's F6 planted that trap: a needle that never
matched its defect read as a green light that was never a detector.

Sentences that are *meant* to be about the surface are registered, not deleted, and the register says so:
the /dates lede's provenance line (D218, D322), the first-meeting rule (D392), the line naming how the chat
summary is written (the round-8 letter's Keep register, D446), the open-gap sentence (D368). Anything else on
the worklist is copy to fix.

## The diagnosis: why thirty-odd rounds left the fluff standing

The rounds are retrievable, and so is the reason. Three artifacts, read this session:

- `docs/communication-review-round-8-2026-11-18.md` and
  `docs/reply-to-the-communication-review-round-8-2026-11-18.md` — the last copy letter and its answer:
  **53 line items, 44 CLOSED / 9 DECLINED / 0 OPEN**, each priced by `design/review-round-8-census.mjs`,
  each verdict a **re-word** or a **ruling that holds the decline**.
- `design/copy-duplicates.json` — the copy rule that survived: near-duplicate **sentences**, scored on shared
  content words, with an exemption register for the deliberate ones.
- `src/content.json` and the built pages — the copy itself, and the slots that carry the author's words.

**Every detector in that loop measures the shape of a sentence, and none measures its address.** Word count
(`bodyMaxSentenceWords`), duplication (`check:content`, `design/copy-duplicates.json`), anchor spend
(`design/link-ceiling.mjs`), source (`check:content`), date (`check:dated-surfaces`), escape (`check:escapes`),
descriptor coupling (`check:copy`). The absence is a command, not this sentence:

```
$ git show 977242a:scripts/gate-run.mjs | grep -c audience          # 0 — the word is not in the gate set
$ git show 977242a:scripts/gate-run.mjs | grep -c reader            # 1 — check:escapes, about bytes a reader speaks
$ git show 977242a:scripts/gate-run.mjs | grep -cE "^\s*\{ name: '" # 94 step entries across the three sets
```

@measured 2026-11-19 by those three greps (Linux native, Node 24.22.1). Across the whole rig — 94 steps in
three sets — the site's own gates never once name the reader a section is written for; the one use of the word
means *the bytes a reader's screen speaks*. Nor do the author's own corrections name one: `cost`,
`membershipRule`, `turnout`, `hostLine` and `pastLine` in `src/content.json` answer **what** the club is, and
no artifact in the tree has ever answered **who a page is for**.

So the failure was not a bad style rule. It is structural: a **line-level patchwork over sections that were
never given a purpose**. Each round edited lines against shape rules; no round ever wrote down what a section
is for, or who reads it. Every one of those edits is compatible with the same flat, address-less corpus —
which is why a later round could not see the defect either: the round's instrument could not *fail* on it.
A row that cannot fail is an assertion, not a detector (D413), and this class was not in the currency at all.

The falsifiable class this item installs, with the count from the command that finds it:

```
$ npm run check:copy-contract --print-hollow
hollow sentences on the built pages: 0 (bar: 0)
```

The history the record keeps, now as a **specimen set** rather than a worklist. Eight sentences matched the
class before the four ruled signatures were registered (**@measured 2026-11-19 by
`npm run check:copy-contract --print-hollow`, Linux native, Node 24.22.1**); four are owned by a ruling and
carry their `why`, and these four stood as the worklist on 2026-11-19 morning:

```
  /chat / What the club is pulling on  "Any can be dropped mid-sentence; none is a prerequisite for arriving."
  /chat / What the club is pulling on  "The channel is the live thing."
  /join / Talk with us now              "The conversation that runs between meetings."
  /past / No finished date on our calendar  "The dates our own calendar holds that have already passed were announced cancelled."
```

**All four were deleted that same afternoon** (**S079**, **D453**): asked what to do with the worklist, the
operator answered "(A) drop all four of those." The bar is therefore 0 and a new hit is a regression, not a
slot to spend. Exactly one of the four needed a successor, because a notice owes one body line: on `/past` the
line is now **generated from a count the page already computes** rather than written by a delegate — which is
the D92-shaped lesson the whole item is built on. Falsifiable means: delete the sentence from the built page
and nothing a reader can do or believe changes — which is the test a human applies, and the approximation the
gate runs (no club fact, no path out).

## The exercises

Run these in order. Each leaves an artifact a human can check.

1. **Answer the letter.** `docs/the-authors-vision-2026-11-19.md`, in the author's words, then flip
   `status: unsent` to `status: sent`. Artifact: the filled letter. Checked by
   `npm run check:copy-contract`, which fails while a bracket remains under a `sent` status.
2. **Print the sections and their readers.** `npm run check:copy-contract --print-sections`. Artifact: the
   body sections of every built page with their prose count. Checked by eye: point at a section on the page;
   if you cannot name its reader, the row is a guess.
3. **Print the worklist.** `npm run check:copy-contract --print-hollow`. Artifact: the count and the list.
   Checked against `design/copy-contract.json`'s `hollow.count`: the copy round's job is to take sentences
   off it, and the gate fails when the number rises.
4. **The read-back.** Open a built page at a phone width, read it once, then write on paper: who you think is
   reading, the actions it offered you, the facts you now believe. Then open `design/copy-contract.json` for
   that route and compare. Artifact: the paper. An action on the paper the page did not give you is a goal the
   copy does not ship; a fact on the page that is not on the paper is copy that carries nothing.
5. **Say the section before you write it.** Before editing a section's markup, write its row —
   `audience`, `goal`, `style` — into `design/copy-contract.json` in the same change, and commit the row
   beside the diff. Artifact: one commit with a row and a sentence. Checked by `check:copy-contract` in
   `verify`: the section with no row fails the set.
6. **One register, five pages.** Read one section per page in sequence. Artifact: a sentence per page written
   down. If the six sentences could have been written by different people, the `styles` vocabulary is not
   doing its job — re-word the register in the author's three sentences from the letter, and re-run the gate.

## What this does not decide

- **Which treatment of a shipped paragraph the page wears** — a look question goes to a specimen round and the
  operator (D160), not here.
- **Whether a fact is true** — that is `check:content`, `check:provenance`, `check:rsvp-page` (D92, D265, D415).
- **The cadence harvest** (MS05, MS10 — blocked, operator-only triggers) or the photograph (MS32).
- **Any merge, push, or deploy** — the operator holds those grants (D42, D124).
