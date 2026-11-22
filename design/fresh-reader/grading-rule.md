# The grading rule for the fresh reader's questions

This is the other half of the instrument. `persona.md` says **who reads**; this file says **who grades, and
into which pile**, in words handed to a grader who did not write the questions and did not change the site.
It is a tracked file for the same reason the persona is: a question count compared across rounds is only a
comparison if the rule that produced it is the same rule, and a rule quoted into the grading file travels
with that file even if nobody remembers where it came from.

`design/fresh-reader/grade.mjs` quotes **only** what sits between the `<<<RULE-BEGIN>>>` and
`<<<RULE-END>>>` lines below, each marker kept whole and on its own line, and refuses to run if either is
missing or inverted. Everything outside them is for us.

## Who grades

Two graders grade every round, from round 1:

- **the delegate** - the party that changed the site. Kept because pile B needs to know what is in this
  repository and pile C needs to know which questions the operator already owns.
- **a blind `pi` session** (`grade.mjs`) - started outside the repository, `--no-tools`, given the
  questions, the built pages' own words, and a generated digest of `DECISIONS.index.md` (its one-line
  entries), never the delegate's answers.

**The count is conservative: a question is pile A if either grader puts it in A.** Disagreements are listed
one per line in the round record, never averaged and never quietly re-graded by the party with an interest
in the outcome.

Two limits of this rig, recorded beside every count rather than hidden:

- **The blind grader is handed a digest, not the files.** It has no tools, so it cannot open
  `docs/adr/0001-…`. Pile B is therefore decided against the generated one-line entries in
  `DECISIONS.index.md`, which is what the delegate's own pile B must be checkable against as well. If an
  answer lives only in a paragraph and not in an index line, the blind grader will call it A and the
  delegate may call it B; the union rule makes that disagreement visible rather than resolved by fiat.
- **The blind grader may or may not see the pictures.** This host's model declares image input, and the
  reader pass is run with images. The grader pass is run with the pages' **words**. Where a question is
  answered only by a colour, a position, or a shape, the delegate's grading is final and the blind
  grader's line is kept as it stands, because a text-only grader cannot see pixels.

| version | date | round | change |
| --- | --- | --- | --- |
| 1 | 2026-11-21 | 1 | first written as a tracked file, quoted verbatim into `grade.mjs`'s prompt and reproduced in the grader's own output. The four piles are adapted from the reference rig's (`social-event-publisher`, `.notes/research/fresh-reader/grading-rule.md`, version 1) with pile B's evidence re-specified for this rig: the reference grader was handed a list of tracked document *paths*; this one is handed the generated `DECISIONS.index.md` lines, because a grader with no tools cannot use a path |

<<<RULE-BEGIN>>>

You are sorting questions into four piles. You did not write them, and you did not build the thing they are
about. Sort by this rule and nothing else. Put every question in exactly one pile.

Pile A - the page could have answered it. Somewhere in the page's own words handed to you there is a
sentence, a number, a date, or a stated fact that answers this question, or would answer it if it stood
where the person asking was looking. A question in this pile is a fault in the page: the page had the
answer and did not put it in front of the person asking.

Pile B - a tracked document in this repository answers it, and the page does not. The answer exists in one
of the short records handed to you - a line saying what the project decided, and when - so the page is not
somewhere a volunteer would ever find it. This is not a fault in the page's wording. It is a question about
something the project has settled for itself and deliberately leaves out of the page.

Pile C - the owner of the project answers it. The answer is a decision that has not been made, not a fact
on a page or in a record: whether something will ever be built, what the club's own practice is, whether a
particular group of people is who this is for.

Pile X - the question is about the exercise, not about the site. It is about the pictures, about a word
that appeared in the instructions given to the person answering, or about what they were asked to do.

If A and C both seem to fit, ask: could the page have said this already, or does the answer need a decision
somebody has not made yet? The first is A, the second is C. If A and B both seem to fit, ask whether the
answer is in the page's own words or only in the records: a page that says it is somewhere else is not the
same as a page that says it.

Answer with every question number, its pile, and one short line saying what in the material you were handed
made you choose that pile. If you cannot tell, say so and put the question in A, because that is the pile
that keeps the page on the hook.

<<<RULE-END>>>
