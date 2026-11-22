# 0029 — a stranger who lives in a calendar app read the site: 25 questions, 20 of them the page's own fault

**The question this record exists to answer.** Every design read this rig has run was done by a party that
knows the rig — a seat, a reviewer, or the operator. Round 1 of the **fresh-reader** sequence asks a
different question: what does the site look like to the person it is written for, a volunteer who keeps a
small group's dates, whose software is a calendar app, a contacts app and a chat app, who has no spreadsheet,
has never opened a terminal, and has never been to this club? The instrument, its rules and its limits are in
`design/README.md`; the reader is `design/fresh-reader/persona.md` **changelog version 1**; the pile rule is
`design/fresh-reader/grading-rule.md` **version 1**.

**The round** (run overnight 2026-11-21 → 2026-11-22, Linux native, Node 24.22.1; everything recorded under
`design/fresh-reader/round-1/`). The reader and the grader were both **`qwen3.8-flash-next-iq3_s`** — the
host's own local model over loopback. That is a **model, not a human**, and both record files say so in their
own header lines; "a volunteer who has never been to this club" is the persona, not the thing that answered.

| what | number | how to re-take it |
|---|---|---|
| material handed to the reader | 6 routes (`/`, `/404`, `/chat`, `/dates`, `/join`, `/past`) × 2 widths (1240×900, 390×844); **44 images handed over**, 12 word files; 12 `-full.png` strips withheld | `node design/fresh-reader/capture.mjs --round=2` |
| reader pass | exit 0, **1,483.2 s**, 25 questions | `round-1/pass-answer.md` carries the model, OS, cwd outside the repo, and the persona block quoted verbatim |
| blind grader | exit 0, **1,648.4 s**, graded 25/25 (A:9 B:15 C:1 X:0) | `round-1/grading-blind.md` quotes the rule verbatim and stamps its sha256/16 |
| delegate grading | A:19 B:4 C:2 X:0 | `round-1/delegate-grading.txt` |
| **union (A if either says A)** | **A:20 B:3 C:2 X:0 over 25; 13 disagreements** | `node design/fresh-reader/grade.mjs --union-only --round=1` — 0.1 s, no model call @measured 2026-11-22, exit 0, writes `round-1/grading-union.md` |
| report coverage | **25 of 25** questions annotated, every quote verbatim | `node design/fresh-reader/check-report-coverage.mjs --round=1` @measured 2026-11-22, exit 0 |

**Why the union and not the average.** The delegate is the party that builds and changes the site, so it is
the party with an interest in a lenient pile. A question is pile A — a fault in the page — **if either grader
puts it there**. The 13 disagreements are listed one per line in `grading-union.md` and never averaged away;
12 of the 13 are the blind grader choosing B (a tracked record answers it) where the delegate chose A (the
page could have said it). That split is itself the finding: this rig answers a great many questions in files
no visitor will ever open.

**What 20 pile-A questions are, by kind** (full annotations, one section per question, in
`design/fresh-reader/round-1-questions-2026-11-21.md`):

| kind | questions | what it costs to fix |
|---|---|---|
| a claim the artifact refutes on its own bytes | Q6 (the 404 page says "everything … sits behind two links" while its own nav and footer paint more), Q7 (words run together: `…meetup?<a href="/dates"`) | a copy edit, and the same whitespace class `Navigation.astro` already documents (**D333**) |
| a surface that shows fetched things without saying **when** | Q9 (the thread list), Q11 (the empty summary state), Q25 (`/past`) | one stamp per surface, generated from the snapshot the build already holds |
| vocabulary a newcomer has never met | Q3 ("proof assistant", "Lean", "Qiskit" glossed with more unknown words), Q13 (four names for one chat surface) | a gloss, or one name per surface — the rule already exists (**D309**) and `check:naming` reads only four surfaces |
| a promise the page makes and does not price | Q2 (the "copied on 13 Nov" stamp — the refresh is a human run, **D293**), Q5 (can I look before I have an account — measured yes, the page says nothing), Q15 ("a Meetup page or the chat", and no row ever shows the chat one), Q16 (is an RSVP required), Q17 (does my calendar follow the club's), Q22 (will anybody answer in the chat) | a clause each; Q2's heavier alternative (a Workers cron) costs a binding and the "a person looked at this" property |
| something the calendar idiom expects and the site withholds | Q10 (thread titles you cannot open), Q12 (an unexplained line drawing), Q14 (a cadence sentence read as a frequency), Q18/Q19/Q24 (where finished evenings live), **Q23 (two called-off evenings counted and shown nowhere)** | the cheap ones are captions; Q14, Q23 and Q9 collide with shipped decisions (below) |
| about the exercise, not the site | **X: 0** — the reader never broke the fourth wall, and picked up exactly **1** of our words ("mark") @measured 2026-11-22 by `pass.mjs` scanning its own answer file |

**The three that need a ruling, not a copy edit.** They collide with decisions this rig already shipped, so a
future session must not "fix" them by editing prose:

- **Q14** vs **D92** — the site publishes series and never a club-wide frequency. The reader heard a
  frequency in "Saturdays at noon for a social" anyway, and read the every-other-week list as a contradiction.
  That is a comprehension failure of a decision, which is an argument about the decision, not about the sentence.
- **Q23** vs **D109**/**D374** and `check-rsvp-page` rule 10 — a cancelled evening must not sit in the upcoming
  section, and `/past` prints only the **count** ("Two dates…"), never the two dates. The reader's calendar
  would keep them, greyed and struck through; the `.ics` already does exactly that (**D223**, **D429**,
  `STATUS:CANCELLED` with a raised `SEQUENCE`). The site's strongest calendar behaviour is the one its pages
  hide.
- **Q9** vs **D465** — the thread archive is undated **on purpose** (it is a signed list, not a feed). The
  reader's complaint is not that the list carries dates; it is that nothing says it is a list of what the club
  *was* pulling on rather than what it is pulling on now.

**Four asks for the operator/club** (pile C, recorded as asks and not answered on their behalf): A1 whether a
newcomer who does not know the vocabulary is typical or rare (Q20), A3 whether the club counts a name given
through Discord as an RSVP (Q21), plus the two follow-ons named in the report (Q22's "which conversation do I
write in", Q16's "what happens if I never sign up on Meetup").

**What this round could not see, stated here so nobody over-reads the count.** The reader could not press,
type, scroll or follow a link, so **no question touches interaction**: hover, focus, the missing skip link, the
venue that is never a map link, the headcount deliberately absent (**D274**, **D461**), or what happens after
tapping "Sign up on Meetup". The venue/map and headcount gaps appear in the report **with their own evidence**
and are deliberately not counted as reader questions. And the answer came from a local model wearing a
persona: it is a repeatable, cheap, controllable reader — not a volunteer, and not a substitute for one. The
persona's own `@measured 2026-11-22` numbers are in `persona.md`'s vocabulary table (body **6,017 characters**,
0 of 34 project words, 0 exercise words).

**What makes round 2 comparable to this one** — and the reason the versions are stamped rather than
remembered:

1. the same **persona changelog version**, or a row in `persona.md`'s `## Changelog` saying what changed.
   A question count that moves with no changelog row is not a finding about the site;
2. the same **grading rule version** (round 1: version 1, body sha256/16 `32a72ca98a91e11d`);
3. the same capture contract: 6 routes, 1240×900 and 390×844, first screen plus screen-sized cuts, **no**
   whole-page strips;
4. the counts re-taken with `grade.mjs --union-only`, not typed into prose.

**What this record does not decide.** Nothing was changed to the site by this round. The pile-A list is a
queue the operator ranks, and the three collisions above are rulings to be made, not defects to be patched.
