# Round 1 — the calendar-keeper reads the built site

**Every question the blind reader asked, annotated.** One section per question. Each quote block is the
reader's own line, copied verbatim from `design/fresh-reader/round-1/pass-answer.md` (the numbering below
is the numbering `grade.mjs` stamped into `round-1/grading-blind.md`). `node
design/fresh-reader/check-report-coverage.mjs` fails this file if a question is missing or a quote has
drifted from the answer file.

## The run

| | |
|---|---|
| reader | `qwen3.8-flash-next-iq3_s` — the host's own local model, served over loopback at 127.0.0.1:8080. **A model, not a human.** |
| reader wall | 1,483.2 s, exit 0; started in `/tmp/fresh-reader-pass-…` (outside the repository), `--no-tools --no-session --no-context-files --no-skills` |
| grader | the same local model, blind, 1,648.4 s, exit 0; 25 questions + 6 page word files + `DECISIONS.index.md` (115,998 bytes), no pictures, no answers |
| OS | Linux native (no `wsl`, no docker), node v24.22.1 |
| material | 6 routes (`/`, `/404`, `/chat`, `/dates`, `/join`, `/past`) x 2 widths (1240x900, 390x844); 44 images + 12 page word files; first screen, then the rest of each page cut into screen-sized pieces; the `-full.png` strips were not handed over |
| persona | `design/fresh-reader/persona.md`, changelog **version 1** (the only row); body sha256/16 `22eefa7a808d963f`, re-extracted 2026-11-22 and compared byte-for-byte with the block quoted in the answer file — identical |
| grading rule | `design/fresh-reader/grading-rule.md`, changelog **version 1**; body sha256/16 `32a72ca98a91e11d` |
| questions | **25** numbered lines in the answer file; **25** annotated here (100%) |
| piles | delegate A:19 B:4 C:2 X:0 · blind A:9 B:15 C:1 X:0 · **union A:20 B:3 C:2 X:0** |
| disagreements | **13 of 25**, listed one per line in `round-1/grading-blind.md`, never averaged |
| the reader picked up our vocabulary | 1 word — "mark" (a measurement, not a failure) |

Union rule, written into `grading-rule.md`: **a question is pile A if either grader puts it in A.** The
delegate is the party that builds and changes the site, so the interested party cannot shop for a lenient
pile. The delegate's grade file is `round-1/delegate-grading.txt`, and the union now lives in
`round-1/grading-union.md`, re-taken by one command and no model call:
`node design/fresh-reader/grade.mjs --union-only --round=1` @measured 2026-11-22 (0.1s, exit 0) — it prints
the same totals this report prints, **A:20 B:3 C:2 X:0 over 25, 13 disagreements**, so the counts in this
file are a re-runnable command rather than a number typed into prose. One quirk that command had to be
taught about: `grade.mjs` writes a `# --- parsed ---` echo of every question with its pile letter, and a
parser that treats any repeat as a defect reported **25 problems over a valid round** — a repeated line with
the *same* pile is now a restatement (counted once, printed as a note), and only a repeat that disagrees
with itself is a problem. That is the same trap as a gate reading its own output: the file that records a
verdict is also an input to the tool that made it.

Pile key — **A** the page could have answered it (a fault in the page) · **B** a tracked record answers it
and the page deliberately does not · **C** the operator or the club answers it · **X** about the exercise.

## Before the annotations

The reader's two cleanest catches are facts about the build, not taste: the 404 page's "everything sits
behind two links" sentence is false on its own artifact (Q6), and its run-together words are a defect in
the shipped bytes (Q7). Its biggest design question is Q23 — the site counts two called-off evenings and
shows neither — the one place where the calendar idiom the persona carries and a shipped rule of this rig
point in opposite directions. Its most useful single observation is Q14: a sentence about *series* was read
as a sentence about *frequency*, which is a comprehension failure of a decision (D92), not of a copy editor.

---

### Q1 — the nav chip and the "next meeting" line: always the very next date, whatever its kind

> (first page, top bar and the "next meeting" line) Does the little date up in the top bar, and the "next meeting" line, always point to the very next evening whatever kind it is, or only ever to the afternoon kind — because if the next thing on the calendar were an evening one, I would not want that number to be quietly wrong.

- **Pile:** delegate **A** / blind **A** → union **A**
- **Blind grader's one line:** A: the nav aria-label and home both say "next meeting," not only the afternoon kind.
- **What the artifact and the records support:** both dates come from one expression, and kind is not part
  of it. `src/components/Navigation.astro:50` takes `nextDate = scheduleWindow(upcoming(), todayIn()).shown[0]?.date`;
  `src/components/HeroSection.astro:122` takes the same `shown[0]`. On the captured artifact the first row
  is Sat Nov 21 and the second is Wed Nov 25, so a study session owns the chip the following week.
  `check:dated-surfaces` rules `nav-date-mismatch` and `next-meeting-mismatch` fail a chrome date that
  disagrees with the first date `/dates` actually prints, so the number cannot quietly go wrong. The doubt
  is answered by a gate, not by a sentence.
- **What would fix it, and what it costs:** nothing is required. If the operator wants the doubt closed in
  words: the anchor's accessible name already says it (`Dates 21 Nov, next meeting Saturday, Nov 21`, D333)
  and a sighted visitor sees the same date in two places. Cost of doing nothing: zero.
- **Collision:** none.

### Q2 — the "copied from the club's own calendar on Nov 13, 2026" stamp

> (first page, the "copied" stamp) The dates are stamped as "copied" from the club's own list on 13 Nov 2026 — is that list checked again on its own after that day, or does it sit exactly as copied until somebody copies it again? If the club moved an evening after the 13th, would I still be looking at the old date with no sign of it?

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record the calendar is a copied snapshot with stale-date/provenance rules, not a page claim.
- **What the artifact and the records support:** the refresh is a human act, and the reader's fear *is* the
  current behavior. `data/events.json` is a committed snapshot (rows carry `_fetchedAt`/`_dtstamp`);
  `src/pages/events.ics.ts` is `prerender = true` and its own comment says "A redeploy is what publishes a
  change"; **D293** rules the live harvest "a refresh the operator runs, not a build step"; and nothing
  schedules it — `grep -rn "cron" wrangler.toml package.json` returned no hit @measured 2026-11-22. At
  capture the stamp was 8 days old.
- **What would fix it, and what it costs:** one clause on both stamped surfaces — "we copy this by hand; if
  the club moves a date, its Meetup page is ahead of this one." The stamp itself is generated
  (`HeroSection.astro:282`, `Schedule.astro:442`), so the clause is a copy edit, not a second source of
  truth; costs a `check:copy` and `check:content` run. The alternative is a Workers cron that runs
  `npm run events:harvest` and redeploys: it buys freshness and costs the "a person looked at this" property
  the stamp carries today, and it adds a binding, which has to clear the $1/month ceiling (the free-plan gate
  in the vendored `cloudflare-hardening` skill). Parked as ask **A5**.
- **Collision:** **D103** (the site may not claim an age it cannot compute). "Usually in the week before each
  date" is exactly such a claim, so the clause must be phrased as practice, not as a schedule.

### Q3 — "proof assistant", "Lean", "Qiskit", and glosses built out of more unknown words

> (first page, the topic names and the intro) Several names there use words I do not know — things like "proof assistant", "Lean", "Qiskit" — and the short glosses next to them use other words I do not know either, and the page never explains them where they appear; what are these words, and is an evening meant for somebody who does not already know them, or would I be completely out of my depth?

- **Pile:** delegate **A** / blind **A** → union **A**
- **Blind grader's one line:** A: the pages already say there is no syllabus, nothing is expected, and help comes when someone asks.
- **What the artifact and the records support:** the two *format* words are defined where they print (**D405**):
  `/dates` says "A social is an afternoon around a table, nothing to prepare. A study session is an evening
  working side by side." and `/join` defines both again. The *tool* words never are. The home list glosses
  each entry with more specialist vocabulary — "Proofs a machine checks — Lean, and what it does to a proof
  when something verifies it line by line" — which is precisely the defect: a gloss whose own words are
  undefined. What the page offers instead is about agenda ("There is no syllabus, no reading list to keep up
  with, and no current focus"), which answers "must I prepare", not "would I be out of my depth".
- **What would fix it, and what it costs:** rewrite the six home teasers so each gloss names a thing a person
  does, or drop the glosses and let the section lead carry one plain sentence ("you do not need these words —
  they are what the club has been pulling on, not what you have to bring"). Cost: six strings on the home
  teaser only; the `/chat` titles are signed verbatim and must not move. Gate runs: `check:copy`,
  `check:content` (its `near-duplicate-surface` rule bit the last copy edit on this class), `check:naming`.
- **Collision:** **D405** supports the fix (define a word at first use, on the page that prints it).
  **D464/D465** forbid renaming a signed title — which is why the fix belongs in the gloss and never in the name.

### Q4 — the coloured engraving and the line drawings: do they mean anything?

> (first page, the pictures) The coloured picture and the round line drawings — one caption says it is cropped from a very old book, the other is described in a sentence I do not understand — do they mean anything about what happens at an evening, or are they only decoration?

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record that the graphic language comes from the club's own diagram and drawn art, not stock decoration.
- **What the artifact and the records support:** nothing on any page says the art is decoration rather than
  information. The home caption is provenance only — "Detail of a coloured engraving after John Byrne's 1847
  Euclid, Book IV, proposition XV — cropped from that leaf" — and the two inline SVGs carry only
  `aria-label`s. The closest the site comes is `/chat`'s caption: "Drawn for this site in the plates' line
  language: ink hairlines, no fills, not a scan of a book." That says how a thing was made, not whether it
  means anything.
- **What would fix it, and what it costs:** one clause per figure naming its purpose ("decoration, from
  mathematics books the club has read" / "no meaning — the club's own line art"). Cost: two captions;
  `check:alt` and `check:line-art` run over both.
- **Collision:** **D170** (alt text and provenance are quoted from the picture's own page; a title plus an id
  number is not evidence). The clause is additive; the quoted provenance stays exactly as quoted.

### Q5 — the off-site buttons: is there anything to see before I have an account?

> (first page, the buttons at the bottom) Some of the big buttons look like they keep me on this site and some take me to the sign-up place; for the ones that take me off-site, can I see anything before I have an account there, or do I have to sign in first just to look?

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record Meetup event data is readable without a credential, while the page does not say this.
- **What the artifact and the records support:** yes, there is, and this session measured it: `curl` with a
  plain Firefox user-agent and **no credential** returned the event page `200 / 98,453 bytes` and the group
  page `200 / 182,498 bytes` @measured 2026-11-22 (Linux native). **D236** already measured that the harvest
  needs no credential, for the same reason. The site says none of this; its labels ("Sign up on Meetup",
  "Join the Meetup group") read as a wall.
- **What would fix it, and what it costs:** one clause under `/join`'s "Come to a meeting": "You can read a
  Meetup page without an account — putting your name down is the part that needs one." Cost: one copy line;
  `check:join`, `check:ext-links`, `check:page-exit`.
- **Collision:** **D369** (a fact belongs beside every place its offer appears) argues for echoing it in the
  exit band too, which puts a line on every emitted page. Echo-or-not is an operator call, not a copy detail.
  **D358**'s ceiling of 6 counts exits, not clauses, so an echo does not breach it.

### Q6 — the 404 page's "everything sits behind two links"

> (not-found page) It says everything the club publishes sits behind only two links, the home page and the chat page — but the top bar and the bottom of that same page offer more places, including one for dates; which is right?

- **Pile:** delegate **A** / blind **A** → union **A**
- **Blind grader's one line:** A: the same 404 page's own top bar, paragraph, and footer visibly point to more places than "two links."
- **What the artifact and the records support:** false as shipped. The built 404 paints `/dates` and `/join`
  in its own nav, and the very next paragraph on that page links to the dates page and the Meetup group.
  `check:naming` does not see it, because the sentence is prose; `check:page-exit` counts exits rather than
  the truth of a sentence about them.
- **What would fix it, and what it costs:** rewrite it to match the artifact — name the routes the top bar
  paints, or drop the count: "Everything the club publishes is reachable from the top bar." Cost: one sentence
  in `src/pages/404.astro`; `check:naming`, `check:page-exit`, `check:content`.
- **Collision:** none — this is a factual claim about this site's own pages, not a naming or design ruling.

### Q7 — words run together on the 404 page

> (not-found page, the text under the two buttons) That sentence has words run together with no space after the question mark and before "our"; is that a missing space, or did something on the page break?

- **Pile:** delegate **A** / blind **A** → union **A**
- **Blind grader's one line:** A: the page markup itself shows the missing space before the anchor, so the fault is in the page wording.
- **What the artifact and the records support:** real, and visible in the bytes: the built page reads
  `Looking for a specific meetup?<a href="/dates" …>Our dates page` — no text node between the sentence and
  the anchor, so a visitor reads "meetup?Our dates page". The same Astro whitespace behavior is already
  documented in this repo, in `Navigation.astro`'s comment: Astro "ate the newline between the two
  expressions … the two visible words were one word", and axe-core found it there only because of SC 2.5.7
  (**D333**).
- **What would fix it, and what it costs:** one `{' '}` in `src/pages/404.astro` around line 75 — one token.
  The class is worth closing: nothing in `verify` reads built text for glued words outside that nav-label
  case. A `check:text-glue` script with its own selftest would fail (a) a letter immediately before an inline
  tag whose text begins with a letter, and (b) a `?`/`!`/`.` immediately followed, across inline tags, by a
  capital — and would plant both. Cost: one script, one `package.json` script, one runner entry (read
  `.agents/skills/add-a-gate/SKILL.md` first), and it runs over the `dist` the runner already builds.
- **Collision:** none.

### Q8 — three names for the chat on one page

> (not-found page, naming) That page calls the chat "Recent Discord summaries", the top bar calls it "Chat", and the page itself calls it "The club's chat" — are these all the same one place, and why the different names?

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record a naming rule for the chat surface, but the page does not explain the different names.
- **What the artifact and the records support:** on one built page: nav "Chat", h1 "The club's chat", control
  "Recent Discord summaries". `npm run check:naming` exits 0 @measured 2026-11-22 — its four policed surfaces
  are the nav, the title, the exit band and the page opening (its header, line 28: "only the four name
  surfaces are held to one word"). A button label is none of the four.
- **What would fix it, and what it costs:** rename the 404 control to the nav's word, then give
  `check:naming` one more rule: a control whose `href` is a nav route must contain that route's nav name in
  its visible words. Cost: one label, one rule, and the rig's usual selftest plants.
- **Collision:** none — this implements **D309 / D373 / D386** rather than contradicting them.

### Q9 — "Thirty-one threads": is it live, and when was it last looked at?

> (chat page) It says "Thirty-one threads" — is that a live number, and when was that list last looked at? My chat always shows me when something was last checked; here there is no date at all on the list.

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record the "Thirty-one threads" list is a ratified archived topic list, not a live feed.
- **What the artifact and the records support:** not live. The list is the ratified archive:
  `publishedThreads()` prints only human-signed topics (`src/lib/threads.mjs`; **D461, D464, D465**), and all
  31 entries in `data/discord-threads.json` carry `status: "approved"` and an `approvedAt`. The page imports
  that file and prints `{countWord(topics.length)} threads the club is pulling on.`
  (`src/components/ThreadArchive.astro:76`) with no date anywhere in the section.
- **What would fix it, and what it costs:** print the archive's own date in the section lead — "signed by the
  club on Nov 20, 2026", i.e. the max `approvedAt` the page already holds, so **D103** is satisfied (the date
  is in the file, not remembered). Cost: one line of copy **plus a ruling**, because the built-byte half of
  **D465** refuses any date from that archive reaching a visitor. The clean shape is a whitelist of allowed
  keys (`approvedAt` is ratification metadata, not evidence), in the same shape **D462** used for evidence
  pointers.
- **Collision:** **D465** — the current rule would fail the stamp. This is the round's clearest
  rule-versus-reader collision and it is the operator's to settle.

### Q10 — the thread names are not things I can open

> (chat page) The names in the list look like side-discussions I ought to be able to open, but none of them is something I can tap into and there is no preview; if I wanted to read one, what would I see, and would I have to join something first?

- **Pile:** delegate **B** / blind **B** → union **B**
- **Blind grader's one line:** B: the decisions record that `/chat` publishes ratified topic titles only and refuses an embedded Discord widget.
- **What the artifact and the records support:** by decision, twice. **D461** refuses an embedded Discord
  widget because it publishes presence; **D461/D465** publish only human-signed topic strings. So a title is a
  record of what the club has pulled on, not a doorway into it. To read a conversation you join the server,
  and the page already says "the invite adds you to it".
- **What would fix it, and what it costs:** say what the names are. A clause after the list: "These are names,
  not links; the conversations themselves are in the server." Cost: one clause; `check:copy` and
  `check:threads`. The reader's puzzlement is real even though the design is deliberate — a rule being right
  does not make it self-explanatory.
- **Collision:** none; **D368** (a gap the site cannot fill is stated in the open) supports the clause.

### Q11 — "No summary this week … after the noise settles"

> (chat page, the box at the bottom) It says there is no summary this week and that "our bot" writes it from recent activity "after the noise settles" — when did it last look, what would a summary look like when there is one, and what does "after the noise settles" mean?

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record the chat's empty-summary state and that "noise" is excluded at the summary-writing stage.
- **What the artifact and the records support:** "after the noise settles" is this site's own phrase
  (`src/components/DiscordSummary.svelte:148-149`). **D433** settled where noise is handled — excluded where
  the summary is *written*, not where it is printed. When a summary exists, the card's heading is the window
  it covers (same component, ~line 243); in the empty state nothing says when the bot last looked, and the
  page honestly cannot: the card is rendered from a payload the build holds, and **D103** forbids claiming an
  age it cannot compute.
- **What would fix it, and what it costs:** (a) drop or plain-language the "noise settles" clause — **D433**
  already contains the honest version; cost one component, `check:copy`, `check:render:dist`. (b) print a
  window or a "last looked" stamp **only if** the payload carries one — that is a data-shape change on the
  summary path, not a copy edit, and it needs its own stamp rule so it cannot go stale.
- **Collision:** **D103** is what makes (b) not free; **D433** governs (a).

### Q12 — the line drawing under the thread list

> (chat page, the drawing under the list) The little picture of a line running through three boxes sits right under the list — is it a diagram of one of those discussions or something else? It is not explained.

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record that the line drawing is the site's own club-thinking line art, not a discussion diagram.
- **What the artifact and the records support:** it is the site's own line art, and **D412** is the record of
  its caption losing the thread name that used to be quoted inside it. Placed immediately under a list of
  conversations, with `aria-label="A wire running through three boxes, and the same path traced back"`, it
  reads as a diagram of one of them. The caption explains how it was made, not whether it means anything.
- **What would fix it, and what it costs:** extend the caption with what it is *not* ("no meaning — the club's
  mark, drawn for this site"), or move the figure off the list. Cost: one clause; `check:line-art` is
  **D412**'s own gate and will run.
- **Collision:** stays inside **D412**'s caption shape (provenance stays, the quoted thread name stays out).

### Q13 — "the chat", "the live channel", "the Discord server", "the channel"

> (chat page, naming) The pages use "the chat", "the live channel", "the Discord server" and "the channel" as if they are one thing — in my chat those are different things (the whole group versus one conversation under it); on this club's site, are they one place or several?

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record a one-name-per-page naming rule, but the pages use several names.
- **What the artifact and the records support:** all four are printed — "Chat" (nav), "the club's chat"
  (`/chat` h1), "The live channel" (`/chat` lede), "the club's own Discord server" (invite copy), "the
  channel" (`/join`). The reader is right that in Discord they are not one object: the server is the group, a
  channel is one conversation inside it. The rig's rule is one name per page (**D309**) and it holds on the
  four surfaces `check:naming` reads; the drift the reader met lives in prose and invite copy, which that
  gate leaves alone on purpose ("prose is allowed to describe", line 28).
- **What would fix it, and what it costs:** settle two words — the place ("the club's Discord server") and the
  nav label ("Chat") — and sweep prose to match, keeping "channel" only where a specific channel is meant.
  Cost: copy on `/chat`'s lede, `/join`'s invite sentence and the 404 control; if it is to be enforced, an
  alias list in `check:naming` is cheap and needs plants.
- **Collision:** no rule forbids it, but it reopens a question this rig has already argued three times
  (**D309**, **D330**, **D386**). Worth one ruling that either says prose is inside the rule or says it is
  not — the current state is a rule whose scope is written in a script comment.

### Q14 — "every week" wording against an every-other-week list

> (dates page, intro against the list) The wording at the top says the afternoon kind is every Saturday and the evening kind every Wednesday, but the list underneath shows each of them only every other week — is it weekly or every other week? This is exactly the mismatch I watch for.

- **Pile:** delegate **B** / blind **A** → union **A** · **DISAGREE**
- **Blind grader's one line:** A: the dates list itself gives the actual every-other-week pattern, which answers the cadence mismatch.
- **What the artifact and the records support:** the wording is deliberate, and this is the round's hardest
  item. **D92** (operator, 2026-10-31): "Cadence is three things, not one - so the site publishes series,
  never a frequency." The sentence "Saturdays at noon for a social, Wednesdays at 6 pm for a study session"
  is that ruling, shipped. The captured list — Sat Nov 21, Wed Nov 25, Sat Dec 5, Wed Dec 9, Sat Dec 19 — is
  each series 14 days apart, and the site never says so. A reader whose calendar writes "every other
  Tuesday" heard a weekly promise in a sentence about kinds of evening.
- **What would fix it, and what it costs:** three cheap-to-write options. (1) Add "every other" to the series
  sentence on `/dates` and the hero — that is a frequency claim **D92** forbids, and it goes stale the week
  the club skips one (**D26**, "Cadence copy: 'Monthly', and never hardcoded again", is the earlier scar).
  (2) Add a generated line under the list — "the two series alternate; the same kind comes around a fortnight
  later" — computed from the rows so it cannot go stale, in the same generated-from-data shape **D453**
  established for `/past`. (3) Leave it and accept the misreading. **Recommendation: (2)** — it states a
  pattern the snapshot itself proves and prints no frequency the club has not promised.
- **Collision:** **D92**, head-on. The blind grader graded it A and the delegate B, so the union keeps A: the
  page is on the hook for the misreading even though its wording is a ruling. If the operator wants D92 to
  stand as written, that is a defensible answer — but it should be written down as the answer to *this*
  question, not left as an inference from a sentence about series.

### Q15 — "a Meetup page or the chat", against rows that only ever say Meetup

> (dates page, the rows) Every row's action is to sign up at the sign-up place, yet the join page says this dates page shows for each date "a Meetup page or the chat"; I never see a chat one here — is there ever a date you sign up for through the chat instead?

- **Pile:** delegate **A** / blind **A** → union **A**
- **Blind grader's one line:** A: the join page itself says the dates page may show "a Meetup page or the chat," even if none is currently shown.
- **What the artifact and the records support:** both paths exist in code; today only one paints.
  `signUpPaths()` returns a Discord guild scheduled event when `data/discord-events.json` carries an open one
  on that date (`src/lib/links.mjs:147`), and that file holds exactly one row — dated **2026-11-11**, titled
  "PILOT TEST Common Denominator - Study Se…" — which is in the past, so no row shows it.
  `node design/cta-inventory.mjs --all` @measured 2026-11-21 counted **0** Discord-event actions across the 6
  built pages; the comment at `links.mjs:147` records that same zero.
- **What would fix it, and what it costs:** on `/join`, say when the alternative appears ("when the club posts
  a Discord event, that date links there instead"), or delete "or the chat" until it does. Cost: one clause;
  `check:join`, `check:content`.
- **Collision:** none; **D368** favors stating it, and **D274** already rules that the Discord surface never
  carries a headcount.

### Q16 — is putting my name down required, or only polite?

> (dates page, the small print) In one place the site says you just come and an "RSVP" with your name is all that is asked, and in another it says to sign up for each date on every row — is putting my name down required to attend, or only polite?

- **Pile:** delegate **A** / blind **A** → union **A**
- **Blind grader's one line:** A: the join/home wording says "No membership needed — you just come; an RSVP with your name is all the club asks."
- **What the artifact and the records support:** the site states the club's ask twice ("No membership needed -
  you just come; an RSVP with your name is all the club asks", on `/join` and in the hero) and then makes
  every row's action "Sign up on Meetup". The two sentences sit on different pages and never meet. The missing
  fact — what the host does with a headcount, and whether a walk-in who never RSVPs is fine — is the club's
  practice; it is in no artifact in this tree and in no tracked record.
- **What would fix it, and what it costs:** one sentence on `/join` under "Come to a meeting": either "you can
  walk in without putting your name down; the RSVP is how the host knows how many chairs" or "put your name
  down — the venue needs a number". **It needs the club's answer first** → ask **A2**. Cost after that: one
  line, `check:copy`.
- **Collision:** none; it extends **D405**'s define-at-first-use habit to the word RSVP.

### Q17 — "Add to a calendar": does my calendar change when the club's does?

> (dates page, "Add to a calendar") If I add this to my own calendar, do the evenings land in my calendar as normal events beside everything else, and if the club moves or calls off an evening does my calendar change with it? My calendar keeps a called-off evening greyed with a line through it so I can see it was planned — I want to know whether that happens here too.

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record the ICS cancellation mechanism (`STATUS:CANCELLED`, SEQUENCE), while the page only says the feed changes.
- **What the artifact and the records support:** the promise is already on every page, in the exit band: "Add
  to a calendar: Google, Apple and Outlook can all follow it, and it changes when the club changes a date."
  (**D369** put it there, beside the feed link, deliberately.) Two halves go unstated. First, the feed is
  `prerender = true` (`src/pages/events.ics.ts`), so a change lands when this site is rebuilt and redeployed,
  not the moment the club edits Meetup (see Q2). Second, cancellations *do* reach subscribers: the built feed
  holds 7 `VEVENT`s, two of them `STATUS:CANCELLED` with a raised `SEQUENCE` @measured 2026-11-22 from
  `dist/client/events.ics` (**D223**, **D299**, **D429**). What no page here can answer is the reader's last
  clause — whether a given calendar app draws a cancelled component greyed with a line through it is that
  app's behavior.
- **What would fix it, and what it costs:** echo one clause beside the row-level "Add to a calendar" on
  `/dates`: "it updates when we republish, after the club changes a date." Cost: one clause. Do **not** claim
  an app's rendering anywhere.
- **Collision:** **D369** supports the echo; **D103** forbids "within a day" unless the refresh cadence
  actually is a day (it is not pinned — Q2).

### Q18 — how would a date that has already gone by look different?

> (dates page, all future dates) Every date shown here is still to come, so I could not see how this site shows one that has already gone by; on a list that mixed them, would the finished ones look different, or would they simply be left off?

- **Pile:** delegate **B** / blind **B** → union **B**
- **Blind grader's one line:** B: the decisions record a separate `/past` route and a rule that finished rows are not mixed into the upcoming dates page.
- **What the artifact and the records support:** they are never on that page at all. **D109**: "A past or
  cancelled event is never inside the upcoming section; whether it shows at all is deferred". The finished
  half lives on its own route (`/past`, **D374**), because `/dates` is a window — `HORIZON_WEEKS = 8`,
  `MAX_ROWS = 8` (`src/lib/event-window.mjs:37-38`).
- **What would fix it, and what it costs:** nothing; the design is the answer. If the operator wants the
  boundary stated to visitors, the sentence belongs in the `/dates` lede — but any pointer to `/past` collides
  with Q19.
- **Collision:** **D404** (the pointer is exactly what was removed).

### Q19 — where do you reach the past page from?

> (dates page, bottom) The bottom block offers only the Facebook place and the calendar link; the club's past evenings have their own page, but I could not find a link to it from here — where do you reach it from?

- **Pile:** delegate **B** / blind **B** → union **B**
- **Blind grader's one line:** B: the decisions record that `/past` has no navigation door until it holds three completed meetings.
- **What the artifact and the records support:** nowhere, deliberately. **D404**: "/past keeps its shelf and
  loses its door: the route stays built and its contract stays, and nothing links to it until it holds **three
  completed meetings**, which is a number the page's own list prints." Today the page holds none, which is
  why the reader could not find it.
- **What would fix it, and what it costs:** nothing until the trigger fires — and the trigger is stated with
  its number and is decided by data, not by a date on a wall. Cost of doing nothing: zero.
- **Collision:** none. **D404** is the answer, and it already carries its own resume condition.

### Q20 — would someone who does not speak the vocabulary fit in? *(pile C — an ask, not answered on the operator's behalf)*

> (join page) It says nothing is expected of you and to bring nothing, but the topic names on the other pages put me off; as someone who has never met anyone from the club, I cannot tell from this page whether I would fit in or whether everyone there already knows that specialist language — is it welcoming to someone who does not?

- **Pile:** delegate **C** / blind **C** → union **C**
- **Blind grader's one line:** C: whether the club is welcoming to a newcomer who does not know the specialist language is an owner/practice decision not settled in the material.
- **What the artifact supports (and only this):** the site refuses to characterise the club, and has been told
  once not to: **D454** removed "Most of the arguing happens in the chat between meetings." because it
  misstated the club. What the pages do claim, in their own words: "Nothing is expected of you. People work on
  what they brought, and nobody sets an agenda"; "Bring nothing"; "Usually three to seven people at a table";
  "with help when someone asks for it". Whether a newcomer who does not know the vocabulary is typical or rare
  is not in any artifact or record here.
- **ASK A1 (operator / the club):** is a newcomer who does not know the specialist words typical or rare, in one
  quotable sentence? **Recommendation:** take the sentence from a member's own words and sign it, the way the
  thread archive was signed (**D464**: a human artifact with machine provenance), rather than writing a
  delegate's welcome. Cost of that route: one harvest-style ratification; cost of the alternative (a delegate
  writes a warm paragraph): one paragraph, and it is the kind of sentence **D454** exists to stop.
- **Collision:** **D454** is the reason the answer cannot be improvised.

### Q21 — must I make an account on the other site to put my name down? *(pile C)*

> (join page, to attend) To go to a specific evening this page sends me first to the dates and then to a sign-up on another site, so attending seems to need an account there — but the same page says you just come; is there a way to put my name down without an account on that other site, or must I make one?

- **Pile:** delegate **C** / blind **B** → union **C** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record the sign-up surfaces are date links to the posted sign-up page, not a site-built RSVP page.
- **What is settled and what is not:** half of it is measured — the event page is readable with no credential
  (Q5), and the club has posted at least one Discord scheduled event (`data/discord-events.json`, 2026-11-11,
  "PILOT TEST"), so a name given through Discord is technically possible. **Whether the host counts a Discord
  RSVP as an RSVP is the club's practice**, and nothing in this tree says so. Recorded as an ask rather than
  answered on the operator's behalf.
- **ASK A3 (operator / the club):** does the club accept a name through Discord, and should the site say so?
  **Recommendation:** if yes, post a guild event for every date — the site's existing code path then paints
  those rows with no new work (Q15), and `/join`'s "or the chat" clause becomes true rather than hypothetical.
  Cost: a club habit, not a code change.
- **Collision:** **D274** frames what may be published (the Discord surface never carries a headcount); the
  practice itself stays the club's.

### Q22 — "Talk with us now": will anyone answer, and where do I write?

> (join page, "Talk with us now") If I join the chat before ever going to an evening, will somebody there actually answer me, and how would I know which conversation to write in? My chat points unread things to me; here I would just land in a pile with no obvious place to say hello.

- **Pile:** delegate **A** / blind **A** → union **A**
- **Blind grader's one line:** A: the join page itself says somebody from the club reads the channel and the place to ask is the Discord server.
- **What the artifact and the records support:** the first half is already answered on the page — "Want to ask
  something before you turn up? Somebody from the club reads the channel, and the place to ask is the club's
  Discord server — the invite joins you to it." The second half is inside Discord's interface, which this site
  does not control. I have **no measurement** of the guild's channel list: `data/discord-threads.json` carries
  channel names for threads that were harvested, not the server's layout, so the site cannot name a welcome
  channel without being told one.
- **What would fix it, and what it costs:** if the guild has one general or welcome channel, name it in that
  same sentence ("there is one channel; say hello there"). Cost: one clause once the fact exists → ask **A4**
  (the operator names the channel, or rules that the site stays out of Discord's layout). **D368** is the
  standing reason to state the gap if it is not filled.
- **Collision:** none; **D368** governs the fallback wording.

### Q23 — the two called-off evenings are counted and not shown

> (past page) The box says nothing is listed because two evenings were called off — but I cannot see those two anywhere, not their dates, not what they were; my calendar would show them greyed with a line through them. Are those two dates visible anywhere at all, and will this page ever hold finished evenings, or is it empty for good now?

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record cancelled rows are published with ICS status and that `/past` stays empty until three completed meetings exist.
- **What the artifact and the records support:** the page computes exactly those rows and prints only their
  count. `closedOff` in `src/pages/past.astro` counts held rows whose date has finished and whose `status` is
  `CANCELLED`, and the body line is generated from that count — the hand-written sentence was deleted and
  replaced by the generated one on 2026-11-19 (**S079**, **D453**). The dates themselves are in
  `data/events.json` and go to subscribers as `STATUS:CANCELLED` with a raised `SEQUENCE`, but no page shows
  them. `scripts/check-rsvp-page.mjs` rule 10 refuses them by name — "a past row for … is not a date that
  finished and was not called off … D72 keeps that word in the data" — and that gate's selftest plants the
  opposite defect on purpose ("a cancelled date painted as a meeting that happened").
- **What would fix it, and what it costs:** this is the round's biggest design question, and it is the reader's
  own calendar idiom: kept, greyed, struck through, so a person can see it was planned rather than that it
  never existed. It would need `/past` to carry a **second row kind** ("called off"), with the status printed
  in words so it cannot read as a meeting that happened: one component branch, one change to
  `check-rsvp-page` rule 10 with new plants, and a ruling that supersedes the deferral in **D109**. Cost: a
  `costly` surface change — a shipped page's contract, its gate, and a decision — not a copy edit.
- **Collision:** **D109** (deliberately deferred), **D374**/rule 10 (currently refuses exactly this),
  **D429** (the feed's cancelled-row wording is the precedent to copy).

### Q24 — where are the evenings from 2019 to now?

> (past page) The club's first year was said to be 2019, yet "our own calendar" appears to hold no finished evening at all except those two; where are all the evenings from 2019 up to now, and is the calendar on this site a new thing while the real history lives on the other sign-up site?

- **Pile:** delegate **A** / blind **A** → union **A**
- **Blind grader's one line:** A: the past page itself says a meeting that already happened stays listed on the club's Meetup group page.
- **What the artifact and the records support:** the page half-answers it — "The club keeps its sessions on its
  own Meetup group page, and a meeting that has already happened stays listed there." What it never says is
  that this site's own calendar is a window: `HORIZON_WEEKS = 8`, `MAX_ROWS = 8`
  (`src/lib/event-window.mjs:37-38`) for the upcoming page, and `/past` has "no horizon backwards, only the
  cap" (`past.astro`'s own comment). So the reader's guess — the site's calendar is new, and the history lives
  on Meetup — is correct and unstated.
- **What would fix it, and what it costs:** one clause on `/past`: "our own calendar starts with the oldest
  date we have copied, {date}; everything older is on the club's Meetup page" — computed from the snapshot's
  oldest row, in the same generated-from-data shape **D453** established for that page. Cost: one line, and
  the page can already compute the date.
- **Collision:** **D453** shapes *how* it must be written (generated, never typed), not whether.

### Q25 — the past page carries no "copied on" date

> (past page) Unlike the dates page, this page gives no "copied from ... on" date; when was it last looked at?

- **Pile:** delegate **A** / blind **B** → union **A** · **DISAGREE**
- **Blind grader's one line:** B: the decisions record the dated-surface and provenance rules, while the past page gives no "copied on" stamp.
- **What the artifact and the records support:** `/` and `/dates` print "Copied from the club's own calendar
  {copied}" (`HeroSection.astro:282`, `Schedule.astro:442`). `/past` imports the same `snapshot`
  (`past.astro`) and prints no date. `check:dated-surfaces` exists because "a date a visitor reads is a date"
  — its header records the 2026-11-14 audit finding a stamp left on a page the record claimed printed none —
  but the gate rules pages that **do** print dates. It has no rule for a ruled dated surface that omits its
  provenance.
- **What would fix it, and what it costs:** print the same generated copied-on line on `/past`. Cost: one line
  of copy using the existing value (no new source of truth), plus one rule in `check:dated-surfaces` — the
  mirror of `dated-surface-unmarked`: a ruled dated surface with no stamp fails — with plants in its selftest.
- **Collision:** extends **D103**; collides with nothing.

---

## The calendar idioms this persona brings, and where this site reads calendar-natural

The persona (`persona.md` v1) carries a specific set of expectations. Reading the six pages against that
list, one at a time:

| the idiom | where this site meets it | evidence |
|---|---|---|
| a month grid / a week view / a day with hours down the side | **not met, and not offered.** The site is a list of rows. Nothing on any page says "this is a list, not a calendar", so a calendar reader scans it for a grid | the six captured pages; `/dates` is `<ul>` of rows |
| a date chip that says what is next, without counting | **met, and well.** The nav carries the next date as a subordinate chip, and the hero says "Next meeting: Saturday, Nov 21" | `Navigation.astro:135`, `HeroSection.astro:260`; enforced by `check:dated-surfaces` |
| a time written as a range | **met.** "12:00 pm – 1:00 pm Central", "6:00 pm – 8:00 pm Central", on the hero and on every row | the captured `/dates` and `/` words |
| the place, after the time | **met in words.** "Angel Food Bakery, 8100 Minnetonka Boulevard, Saint Louis Park, Minnesota" | the captured `/dates` words |
| tap the place and a map opens | **not met.** No venue is a link and no map URI appears anywhere in the source — `grep -rn "maps.google\|mapbox\|apple.maps\|geo:" src/` returned nothing @measured 2026-11-22 (the harvest *does* carry a `geo` object per row; it is printed as text) | `data/events.json` rows carry `geo`; no link in `Schedule.astro` |
| dates written the way a calendar writes them ("next Tuesday", "in 3 days") | **partly.** Absolute dates everywhere ("Sat, Nov 21"); relative dates nowhere — `grep -rn "in 3 days\|tomorrow\|daysUntil" src/` returned nothing | the captured words |
| finished dates look different from future dates | **met by separating them onto different routes, not by styling them** — and the finished route has no door | **D109**, **D374**, **D404** |
| a called-off date stays, greyed and struck through | **met in the feed, invisible on the site.** The `.ics` carries `STATUS:CANCELLED` with a raised `SEQUENCE`; `/past` counts the two and shows neither; `check-rsvp-page` rule 10 refuses them on the page | `dist/client/events.ics` (7 VEVENTs, 2 cancelled @measured 2026-11-22); **D223**, **D429**, **D109** |
| one tap to add it to my calendar | **met, three times:** the hero, `/dates`' bottom block, and the exit band on every page — plus the footer clause naming the three apps that can follow it | the captured words; **D369** |
| it changes when the organiser changes it | **claimed, with a gap:** the feed is `prerender = true`, so it changes at the next rebuild and redeploy, and the refresh that feeds it is a human run | `src/pages/events.ics.ts`; **D293**; Q2, Q17 |
| a recurring series, and "this one or every one after it?" | **not applicable as the reader assumes:** the feed publishes one component per date with `UID`+`SEQUENCE`, no `RRULE` for club dates — the only RRULEs in the artifact are the VTIMEZONE transition rules | `dist/client/events.ics` @measured 2026-11-22; `src/lib/ics.mjs:26` |
| who is coming / going, maybe, not going | **not met, by rule.** The site publishes no headcount: **D274** "never carrying a headcount", and **D461** refuses a Discord widget because it publishes presence | **D274**, **D461** |
| anything that shows me something fetched tells me **when** | **met on two surfaces, missing on three.** `/` and `/dates` stamp "Copied from the club's own calendar on Nov 13, 2026"; `/chat`'s thread list, `/chat`'s empty summary state and `/past` print no date at all | `HeroSection.astro:282`, `Schedule.astro:442`; Q9, Q11, Q25 |
| a number in a small pill beside a word means how many | **met in substance, not in shape:** the count is spelled into prose ("Thirty-one threads") rather than a pill | `ThreadArchive.astro:76` |
| a thread is something you open; unread things are pointed at you | **deliberately not met** — titles only, human-signed, no deep link, no widget | **D461**, **D464**, **D465**; Q10 |

**Where it reads calendar-natural, in one sentence:** the parts a stranger uses to decide whether to go out —
what is next, when it starts and ends, where, and how to put it in a calendar — are the strongest parts of
this site, and the reader said so ("my habits worked"). **Where it does not:** every part that answers "what
is this place like" is written in the club's own vocabulary and unstamped — the topic lists, the summary
state, the cadence sentence, and the two called-off evenings — and those are exactly the places a stranger
needs, and the places the rig's own rules (D92, D109/D374, D465) currently govern.

## What this round could not see (a known blind spot of a static-image read)

The reader could not press, type, scroll or follow a link, so nothing about interaction was asked about: no
question touches hover, focus, the map link that does not exist, a headcount that is deliberately absent, or
what happens after tapping "Sign up on Meetup". The venue/map gap and the headcount gap are recorded above
as observations **with their own evidence**, not counted as reader questions.

## The operator's ToDo from this round

Four asks need an answer before a fix can be written (Q20, Q21, Q22, Q16 → A1-A4), and three fixes collide
with a shipped decision and so need a ruling rather than a copy edit: **Q14** (cadence wording vs **D92**),
**Q23** (paint the called-off dates, vs **D109**/**D374** and `check-rsvp-page` rule 10), and **Q9** (stamp
the thread list, vs **D465**). The cheap, unopposed fixes — Q6, Q7, Q8, Q5, Q15, Q24, Q25, Q12, Q10, Q11a,
Q4, Q3 — are all copy or one-rule gate work, in that order of reader harm.
