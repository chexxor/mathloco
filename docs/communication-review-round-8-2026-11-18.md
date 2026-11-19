# Communication review, round 8 — 2026-11-18

The critiquer agent's copy letter, saved **verbatim** and blockquoted, so `check:tables` does not read its
tables and every count in it stays the reviewer's number rather than this tree's (the same rule round 7's
letter was saved under — `docs/communication-review-round-7-2026-11-18.md`).

What the reviewer read was the staging preview at the day the round-7 item landed. This tree has shipped
another round since, so the letter's line numbers are its own artifact's line numbers: the instrument that
re-runs its evidence is `node design/review-round-8-census.mjs`, and every row below carries the string or
the count the letter argues from, not a row number. The reply is
`docs/reply-to-the-communication-review-round-8-2026-11-18.md`, whose row ids are the census's row ids.

## The letter

> # Home
> - delete the first clause of line 19; make it: "Most of the arguing happens in the chat between meetings."
> - "Three to seven people at a table, historically." → "Usually three to seven people at a table."
> - delete the H2 "When we meet" OR move line 7-9 under it. Do not leave a "when" heading with no when in it.
> - ADD, after the thread list: "Ask for [host name]; they're usually the one with the laptop open."
> - ADD, if the apex photo is real: <figure> after "What we take up".
>
> # Dates
> - lede, replace one long paragraph with:
>   "Saturdays at noon for a social; Wednesdays at 6 pm for a study session.
>    A social is an afternoon around a table, nothing to prepare. A study session is an evening working side by side.
>    These come from the club's own calendar. Each links to the page the club posts its sign-up on."
> - row headings: date leads. "Sat, Nov 21 — Social" as the heading; "Social" becomes a label inside the row. Five headings must be five dates, not two format names.
> - mark the Nov/21/Sat block aria-hidden.
> - delete line 93 (duplicate platform row) and line 95 (repeated explanation).
>
> # Join
> - line 48: "The club's member list, and where a date gets announced." → "Where the club announces dates, and keeps the RSVP list."
> - line 60: "Expect nothing." → "Nothing is expected of you."
> - line 21: "The next ones are on the[dates page](/dates)." → "Next: Sat, Nov 21, noon — [all the dates](/dates)."
> - line 44: "A feed you already read, where the club can put a date." → "Two feeds, if you'd rather not use Meetup."
> - delete the second sentence of line 58 ("There is nothing to prepare…"); home already says it.
> - ADD after line 64: "Or write to [hello@matheapolis.com] — one of us reads it."
>
> # Chat
> - move "No summary written this week" to the end, as one line, no heading: "No summary this week. The channel is the live thing."
> - delete "the dates the club set" from the lede.
> - delete "The chat itself" section (lines 37-40) entirely.
> - line 23 → "Nine threads the club is pulling on. Any can be dropped mid-sentence; none is a prerequisite for arriving."
> - line 35 → figcaption under the drawing.
>
> # Apex (matheapolis.com)
> - one host, one site: point the apex at this build.
> - reconcile seven claims before it goes live: name, current focus, who teaches, member count, cadence, materials, photograph.
> - if math-group-image is a real meeting photo, move it into src/assets and use it. If it is stock, delete it and commission nothing in its place.

## The letter's per-page rows

Transcribed as received, in the letter's own four registers (Revise / Add / Remove / Keep). They are the
same read as the copy block above — where a register restates a bullet, it is one line item and one census
row, and that row's `why` names both letter lines.

**Home.** Revise: split the lede at the dash. Keep: line 38's fuller Meetup sentence; the home-only line-21
sentence; lines 46, 48 and 13; line 23's caption. Add: one sentence naming a human; one sentence of past.

**Dates.** Revise: split the lede; the row headings lead with the date; the Nov/21/Sat block is `aria-hidden`;
the calendar explanation appears once, after the rows. Remove: the duplicate platform row; the repeated
explanation. Add: a per-row `.ics`, a maps link, the `/schedule` redirect. Argues: eight absolute URLs
against a ceiling of six — "deleting the duplicate row returns 6".

**Join.** Revise: the frame-consistency rewrite ("The club's member list, and where a date gets announced."
→ the announcement first); "Expect nothing." → a positive; name the date instead of "the next ones";
"A feed you already read…" → "Two feeds, if you'd rather not use Meetup." Keep: "Three ways in…" and do
**not** add a fifth door; "Whether the room is your kind of room" until a photograph exists. Add: a `mailto`.

**Chat.** Revise: the empty state to one quiet line at the bottom; the lede has no dates, so cut the clause
that promises them; "The channel is the live thing" appears three times, so cut the section that makes it a
third; "Drawn for this site…" → a figcaption; the meta-description → "Nine threads the club is pulling on…".
Keep: "Our bot writes this section from recent channel activity, after the noise settles."

## What the reviewer measured, in its own numbers

The letter's counts — eight absolute URLs outside the band on `/dates`, five row headings reading two format
names, three Discord invites — are its artifact's. This tree re-prices each of them in the census
(`design/review-round-8-census.mjs` prints `outbound`, `bandRepeat`, `controls`, `maxSentenceWords`,
`nextDateHandshake`, `assets`, `figcaption` off the same read), and `node design/link-ceiling.mjs` is the
instrument that prices the ceiling claim and names the page that defines it. Where the two disagree, the
reply doc says so and carries the ruling that holds the tree's stance (D436's `DECLINED` shape).
