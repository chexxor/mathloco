# Matheapolis — the communication read (round 5), 2026-11-15

This is a read of **what the site communicates**, not of how it looks. A reader who distrusts web
design asks three questions of every page: what does this page spend on, what does it spend twice,
and what does a visitor ask that this page does not answer. All three are answered here against the
built artifact, and the document ends with the plan that follows.

## 0. Provenance — the artifact this read is pinned to

| | |
|---|---|
| **This doc lives on** | `design-critique-round-4` (the branch tip; verify with `git branch -v --no-color` and `git log --oneline -5 \| cat`). **An earlier landing of this same item sat on a separate branch the operator deleted on 2026-11-16** — a round's products live on **one** branch (S046, D354), and the deleted container's tree is **not** the one this doc describes: it predates the §3 `/` fold restatement, the §5 phone-fold row, and the band figures restated at the 23:32/23:55 builds. **Read the branch tip**, not an older sha; the whole item is one commit — `git diff --stat 92c613b c58ba4b` = 17 paths, no `src/`, no `scripts/`, no gate path — with `MILESTONES.md`'s MS31 row in the same commit (D155's rule) |
| Artifact | `dist/client`, built from `design-critique-round-4` @ `a3a911c` **plus one other session's in-flight `src/` edits** (`src/components/{EventRow,Footer,HeroSection,HorizonBand,SignUpLinks}.astro`, `src/lib/rsvp.mjs`, `scripts/check-rsvp-{page,preference}.mjs` were dirty while these probes ran) |
| Build | two builds landed inside the probe window — `2026-11-16T03:09:17Z` UTC (**21:09 CST**) and `2026-11-16T04:00:36Z` (**22:00 CST**). `node design/dist-fresh.mjs` verdict **fresh** (newest input `src/components/HorizonBand.astro` @ 03:41:40Z UTC) before and after every probe run, and the census run against **both** builds returned **identical** per-route counts — `23,583` characters / `427` body words on `/`, `33,954` / `229` on `/schedule` — so no number below moves with that session's rebuild. The one line that did move is named where it moved (§2, wayfinding prose). |
| Re-verified | Every probe was run a **third** time against the newest artifact — `dist/client` built `2026-11-16T05:32:37Z` UTC (**23:32 CST**) from the committed round-4 tree at `92c613b` — and `node design/dist-fresh.mjs` again returned **fresh** (`dist present: true`, newest input `src/components/HorizonBand.astro` @ `03:41:40Z`). Per-route characters, body words, sentence/heading/anchor counts, the **13** claim clusters and the **11 of 22** wayfinding pair came back **identical**; so did the question verdicts (29 / 19 ANSWERED / 2 DECLINED / 8 UNANSWERED) and the six gloss prices (28·33·28·26·24·18 = **157** gzip on `/chat`); the survey posted **15/15** cells with identical geometry. **One number moved**: deleting the exit band on `/schedule` saves **1,816** gzipped bytes, not 1,817 — so the five-page band total is **9,183**, not 9,184, and its share of `/schedule`'s gzip is **16.4%**, not 16.5%. A **fourth** pass of all five probes then ran at 23:55–24:00 CST against `dist/client` built `2026-11-16T05:55:26Z` UTC (**23:55 CST**) — `node design/dist-fresh.mjs` verdict **fresh**, newest input `src/components/HorizonBand.astro` @ `03:41:40Z` — and printed the same per-route counts, the **13** clusters, the **11 of 22** wayfinding pair, **15/15** cells with identical geometry, the same **29 / 19 ANSWERED / 2 DECLINED / 8 UNANSWERED** question verdicts and the same band deltas, so the five records now in `design/communication/` are the ones this doc reads @measured 2026-11-15 by the five probes named in §0. Every byte figure below is stated against that newest artifact unless the row says otherwise. |
| **What moved since the read (2026-11-16, this same branch)** | The read is pinned; the branch is not, and it kept working. **Twenty-nine commits sat between `c58ba4b` and the tip at the measurement named here** @measured 2026-11-16 by `git log --oneline c58ba4b..HEAD \| wc -l` — a commit count is stale the moment the edit that writes it lands, and this row has been re-measured since, so re-measure with that command rather than quote the figure; the ones that moved the pages these tables count are the round-4 rulings letter's items (**D355**–**D365**), Batch A (**D366**–**D369**, `5dc58f4` → `dd6d930`), B1 (**D370**, `d46e002`), B2 (**D371**, `12a044c`), B4 (**D372**, `a6ba916`), q25's way-in words on `/` and `/dates` (**D375**, `d0e00da`), the `/schedule` → `/dates` sweep (**D373**, `d4e1951`), the new `/past` route (**D374**, `16c059a`), the q05/q10 declines in the open (**D376**/**D377**, `f5ebb7e`). **What the probes print at this tip @measured 2026-11-16 by `node design/communication-census.mjs --no-build`, `node design/visitor-questions.mjs --no-build` and `node design/fold-answers.mjs` against a `dist/client` whose `node design/dist-fresh.mjs` verdict was **fresh** (Linux native, Node 24.22.1, Firefox 159.0, 16 CPU):** **seven surfaces, not six** — the HTML routes are now `/`, `/404`, `/chat`, `/dates`, `/join`, `/past` (this doc's `/schedule` is the name **D373** renamed away, and `/past` is a route this read did not have to answer) plus `/events.ics`; **15 duplicate-claim clusters, not 13** — and the two new ones are this round's own doing, the refusal pair printed verbatim on both `/` and `/join` under **D376**/**D377**, whose cost was recorded beside it rather than hidden; **14 of 26** wayfinding sentences, not 11 of 22; the 29-question inventory reads **23 answered where asked · 0 only in chrome · 0 only off-page · 5 declined in the open (q05 q06 q07 q10 q13) · 1 unanswered (q28)**, so the read's eight gaps are **six** now; per route `/` 26,829 chars / 489 body words (87.9%) / 46 sentences / 19 anchors (15 internal, 4 external), `/dates` 37,207 / 285 (81%) / 48 / 19 (11, 8) — one byte above the run at 22:55 CST, because the sentence beside it moved from "3 days ago" to "4 days ago" across UTC midnight: a route's byte count is a function of a generated relative-age sentence, `/chat` 26,015 / 293 / 35 / 14 (9, 5), `/join` 20,263 / 379 / 33 / 17 (12, 5), `/404` 15,646 / 65 / 11 / 15 (12, 3), `/past` 15,376 / 74 / 9 / 13 (10, 3); the standing chrome is 67 words × 6 routes = **402** against **1,585** body words, so §1's "18.8% of the site's words are copy no page wrote for itself" is **20.2%** at this tip; the fold at 390x844 keeps **0 of 5** answers past it on a **4622px** page. `node design/communication-survey.mjs` was **not** re-run this session, so §3's 15/15 cell table is the pinned artifact's and nothing claims it still holds. **How to read §1–§7:** as the record of the artifact pinned at `92c613b`/`c58ba4b`, **superseded as a description of the branch tip by this row** — the same treatment `MILESTONES.md`'s MS30 and MS31 rows carry, and the reason is **D378**'s, sitting on D155's rule: a read rewritten in place loses what it saw, and a read left alone becomes a lie the next session trusts. Every probe named above is one command, so the tip's numbers are re-runnable rather than remembered. **The plan's projection of this delta was wrong in three places** — it predicted 13 clusters unchanged (the probes print **15**), 12 of 23 wayfinding (they print **14 of 26**), and 21 answered + 1 off-page + 3 declined + 4 unanswered (they print **23 + 0 + 5 + 1**) — and this row is the measurement, not the projection. |
| **What moved after the `∑` ruling (2026-11-16, this same branch, later the same day)** | The row above is a record of the tip at the time it ran; the glyph ruling landed after it, so **this row supersedes the row above as a description of the branch tip**, and neither is rewritten (**D378**'s treatment, sitting on D155's rule). **What changed is one ruling:** **S050 / D379** — the operator's word on q28: "The sigma was intended to be a fun unique thing. It can be removed, because it is out-of-place now that we are in a well-designed webpage." The summand went from `src/components/Footer.astro`'s identity line, and the exit band ends **every emitted page**, so one deletion closed three asks at once: q28's *meaning* half, MS25's `∑` ship half, and the `∑` on the 404 page. **The like-for-like pair, both halves against the same tree with only `Footer.astro` moved, each build re-run through `node design/communication-census.mjs --no-build` @measured 2026-11-16 CST:** the glyph's own markup is **61 characters a route** (`/` 26,417 → **26,478** with ` <span aria-hidden="true" class="text-accent-on-ink">∑</span>` re-inserted); the source comment beside it, restored as an HTML `<!-- -->` comment, is **460 characters a route** (`/` 26,417 → **26,877`, from a 453-character block) — an HTML comment inside a component **ships on every page that component appears on**, which is why the identity prose is now an Astro server-side `{/* … */}` comment and ships nothing. Against the tip the ruling started from, the artifact lost **412 characters a route, 2,472 across the six**: `/` **26,417** chars / **489** body words (88.1%) / **46** sentences, `/dates` **36,795** / 285 / 48, `/chat` **25,603** / 293 / 35, `/join` **19,851** / 379 / 33, `/404` **15,234** / 65 / 11, `/past` **14,964** / 74 / 9 @measured 2026-11-16 by `node design/communication-census.mjs --no-build`. **What did not move:** body words are identical on all six routes, and duplicate-claim clusters stay **15** and wayfinding stays **14 of 26** — the glyph was never a claim. **What did, and why the metric moved alone:** the shared page reading counts tokens, so the `aria-hidden` glyph weighed **one word** in the chrome census; standing chrome went **67 → 66** words a page, **396** against **1,585** body words, so §1's "18.8% of the site's words are copy no page wrote for itself" now reads **20.0%**, not 20.2%. **The instrument moved in the same commit as the artifact:** `design/visitor-questions.mjs` keeps its questions in a static list, so q28 left alone reports a **gap** for an item closed by deletion forever — the class **D371** named, whose only symptom is a number that refuses to move. q28 now carries `onlyIf: /∑/u` and `judge()` answers **NOT-ASKED** when no route carries the needle, excluded from `gaps`: **29 questions · 8 classes · 7 surfaces — 23 answered where asked · 0 only in chrome · 0 only off-page · 5 declined in the open (q05 q06 q07 q10 q13) · 0 unanswered · 1 about a thing no route carries any more**, and **gaps 6 → 5** @measured 2026-11-16 by `node design/visitor-questions.mjs --no-build`, with `grep -rl '∑' dist/client --include='*.html'` returning **0** files. `dist/client` is 29 files / **1,009,292** octets and the six HTML routes **139,220** of them @measured 2026-11-16 — a **total**, not a delta. `node design/communication-survey.mjs` was not re-run, so §3's 15/15 fold cells stay the pinned artifact's. |
| Rig | Linux native, Node 24.22.1, Firefox 159.0, 16 CPU, load 8.3/16cpu during the probe window (a loaded rig: numbers are wall-time-free here, but say so) |
| Probes | `node design/communication-census.mjs` → `design/communication/report.json`; `node design/communication-survey.mjs --no-build` → `design/communication/fold.json`; `node design/visitor-questions.mjs` → `design/communication/questions.json`; all three read `dist/client`, never `src/` |
| Shared reading | `design/dist-pages.mjs` — the three probes share one page reading (route → file, comment/script/style/head blanking at equal length, nav → `nav-chrome`, footer → `exit-band`, sentence splitting), so a word count and a question verdict cannot describe two different pages |
| Units | `bytes` in the census record are **characters** (`p.raw.length`); `wc -c` says 23,639 octets for `/`'s 23,583 characters because `∑ → · —` are multi-byte. The gzip figures below are octets. |

**Not claimed:** nothing here claims what production serves (`probe:live` was not run — every gate and
probe in this round reads `dist/`, and a green `dist` says nothing about the live site, D245). What the
first probe window read was a tree **in flight** (another session's `src/` edits were dirty while the
probes ran); those edits have since landed **on this very branch** (`design-critique-round-4` @ `92c613b`),
so the re-verified run reads the committed tree and the artifact this doc describes is a committed state,
not a moving one — and where a number moved between the two artifacts, or has moved since, the move is printed in the Re-verified
row and in the **What moved since the read** row above rather than hidden.

## 1. What the site is for, in its own words

The site's own definition, printed in the hero of `/` (`@measured 2026-11-15 by node design/communication-census.mjs`, sentence census):

> "Minneapolis math club" · "We meet around a table in a coffee shop or a brewery in the Twin Cities and work through something together — a paper, a proof, a proof assistant, a puzzle with a strange answer." · "Dates go up on Meetup; most of the arguing happens in the chat between meetings." · "There is no syllabus, no reading list to keep up with, and no current focus."

That is the whole purpose, and the surface map agrees with it. Six surfaces are emitted — five HTML
routes (`/`, `/schedule`, `/chat`, `/join`, `/404`) and one feed (`/events.ics`) — and each owns one
part of the purpose: `/schedule` is the calendar of record, `/chat` is the arguing, `/join` is the
ways in, `/events.ics` is the same dates for a calendar, `/404` is the exit, `/` is the introduction.

The census of what the site spends on it (`@measured 2026-11-15 by node design/communication-census.mjs`, totals summed from the record's per-page fields):

| | words | anchors | what it is for |
|---|---|---|---|
| `/` | 427 body | 19 (4 nav, 7 band, 8 body) | introduces; answers when/where once |
| `/schedule` | 229 body | 18 (4 nav, 7 band, 7 body) | the dates, five rows, one way out each |
| `/chat` | 283 body | 13 (4 nav, 7 band, 2 body) | the arguing, six threads, one invite |
| `/join` | 268 body | 17 (4 nav, 7 band, 6 body) | the three ways in |
| `/404` | 65 body | 15 (4 nav, 7 band, 4 body) | the exit, three ways back |
| standing chrome | **59 words × 5 pages = 295** | **11 × 5 = 55** | the map every page ends with |

The body is 1,272 words; the standing chrome is 295; so **18.8% of the site's words are copy no page
wrote for itself** — the nav's 7 words and the exit band's 52 on every page (`check:page-exit` makes
every emitted page close with that band, D307). This round's whole question is whether that 18.8%
communicates, and where the body spends words the medium could carry instead.

## 2. Route by route

### `/` — 23,583 characters, 427 body words (87.9% of the page), 43 body sentences, 4 headings

4 headings ("Matheapolis", "What we take up", "When we meet", "How it works") and 19 anchors that
point at **8 destinations**, of which **7 are painted more than once**: `/schedule` ×4
(nav chip "Dates 21 Nov" · "See the dates" · "All 5 dates →" · band "Dates"), `/join` ×4
("Ways in" · "Join Our Group" · "Join the club" · band "Ways in"), and `/`, `/chat`,
`/events.ics`, the Meetup group and the Discord invite ×2 each. **11 of the 19 anchors on this page
are second or third copies of a place the page already paints.**

The page's own words say "the rest of the list →", "All 5 dates →", "Add to a calendar →" — the
**only 3 arrows on the artifact are on internal links**, and the other four pages carry **0**
(`@measured 2026-11-15 by node design/communication-census.mjs`). Outbound links carry the platform's
own mark instead (D294's sprite, D317's "opens in a new tab"), so the arrow now means "more of this
page" and nothing else — which is coherent, and it means the arrow carries no information the link
does not already carry: the three arrows cost 0 anchors and 0 boxes, so they are decoration the
medium already provides.

Wayfinding prose: **11 of 22 body sentences across the five pages name a destination the page also
links to** (`@measured 2026-11-15 by node design/communication-census.mjs`, `wayfinding prose (11 of 22)`;
the census's own `wayfindingProseReal / wayfindingProseCount` fields in `design/communication/report.json`
carry the same pair). On `/` the five are "Dates go up on Meetup; most of the arguing happens in the chat
between meetings.", "Dates and places go up on…", "All 5 dates…", "If you would rather hear what is
being argued about before you go, the chat invite is below.", and "The club's list of members is its
Meetup group page, last read 13 days ago — the list is not the room." The first of the five is not in the
older artifact: the other session's in-flight `HeroSection.astro` edit added it, and it moved the count
from `10 of 21` to `11 of 22` without moving a byte — the class this round names is live in the tree, not
historical. The medium places the link at
the words; the sentence then spends itself on naming the place. Two of the four are pure waste
("the chat invite is below" spends a sentence to point at a link the reader is already looking at);
two carry a real fact beside the pointer (the membership sentence says *the list is not the room*,
and the cadence sentence says where dates come from). This is the round's central finding: a sentence
is waste only when the pointer is all it says.

### `/schedule` — 33,954 characters, 229 body words (79.5%), 43 sentences, 6 headings, 18 anchors

The most bytes, the fewest body words per byte: 5 rows of date rail + copy + one Meetup link each,
plus the standing cluster once after the last row (D342). Its 18 anchors point at 8 destinations,
10 of them repeats; **the Meetup host alone is painted 6 times** (5 per-event pages + the band's
group join). Its 6 headings are `Dates | Social | Study session | Social | Study session | Social` —
the row titles repeat because there are two kinds of meeting, which is a heading ladder telling the
reader the list alternates, and it is not a defect: a row heading is the row's own name (`check:naming`
holds one name per page, not one per heading).

`/schedule` carries **0 controls** — no element wears `data-control` (`@measured 2026-11-15 by
node design/communication-survey.mjs`, `controls: 0 total`). The page communicates its one way out as
a plain anchor inside the row. That is the shipped shape (D342's "one action per row"), and the
consequence for the reader is measured: at 1240 the fold shows **7 of 18 anchors** (11 below it) and **4 of 5 row
boxes**, so the page answers "when" for four meetings before any scroll.

Its provenance pair ("These dates are copied from the club's own calendar." and the list stamp "Copied
from the club's own calendar 3 days ago") is **deliberate** — `design/copy-duplicates.json` carries the
pair with status `deliberate`, ruled by D218 (the stamp is once for the list) and D322 (the stamp's
wording). Same for the venue addresses printed in sibling rows (D273's `rowFurniture`: Angel Food ×3,
Kowalski's ×2 are coupling, not duplication). The census finds them and this read refuses to call
them defects — the register is read, not reinvented.

### `/chat` — 22,778 characters, 283 body words (82.7%), 33 sentences, 4 headings, 13 anchors

The page with the **worst above-the-fold access on the artifact**: **1 control total, 0 of them above
the fold at any of the three viewports**, and its first action sits at **y=1720 @1240** and
**y=2075 @390** (`@measured 2026-11-15 by node design/communication-survey.mjs`). The visitor reads
2,112 px of summaries and thread glosses and then scrolls two screens to reach the one thing the page
offers. Its 13 anchors point at 7 destinations, 6 of them repeats — and only **2 anchors are in the
body at all** (a Discord invite twice), the rest being chrome.

The six thread glosses are printed verbatim here and on `/`: "— what breaks, and what gets interesting,
if you change how numbers combine", "— Lean, and what it does to a proof when something verifies it
line by line", "— Qiskit, and the linear algebra those gates are made of", "— algorithms that lose
nothing, drawn as wires and boxes", "— foundations, and why the question keeps coming back",
"— about doing mathematics, and about who gets to" — **six pairs, home's "What we take up" and
`/chat`'s "What the club is pulling on"** (`@measured 2026-11-15 by node design/communication-census.mjs`,
claim clusters at the 0.34 Jaccard bar, ≥4 salient words). `/` lists them as a signpost, `/chat` lists
them as the threads themselves, and both print the gloss.

### `/join` — 16,620 characters, 268 body words (82%), 27 sentences, 6 headings, 17 anchors

The best-behaved page on the artifact: **4 controls, 3 of them above the fold at 1240, 4 of 4 at 768,
2 at 390**, first action at **y=409 @1240** — a visitor on a laptop acts before they read the first
section. Its 17 anchors → 8 destinations, 9 repeats, and its 5 external anchors are the three
platforms the page is *about*. `/join` is where the club's disclaimers belong for this reason, and
D344 already moved three of the five disclaimers here.

### `/404` — 12,875 characters, 65 body words (52.4%), 11 sentences, 1 heading, 15 anchors

The page that is mostly chrome: **65 body words against 59 words of standing chrome** — a third of
this page is copy no page wrote for itself. It fits its first screen at every viewport (900 / 1024 /
1,021 px, first action y=340 / y=340 / y=413), which is what an error page should do. Its body answers
"what happened to the link I followed" ("The link may be old, or the address may have a typo.") and
"what is here" ("Everything we have sits behind one of these links."). Its remaining question —
"can I look for a specific past meetup?" — is unanswered here and on `/schedule` and `/chat`
(q24, §4).

### the chrome — the exit band, 5,762 raw octets, byte-identical on all five pages

The band is 7 anchors ("Dates · Chat · Ways in · Add to a calendar · Join on Meetup · Discord ·
Matheapolis ∑"), a line of location and copyright, and the two legal sentences. Measured:

- **box:** **1,228×280px** at 1240 and **378×320px** at 390, the band sitting at y=2,834 and y=3,780 (`@measured 2026-11-15 by node design/communication-bandbox.mjs`, record `design/communication/bandbox.json`; raw per-cell reports in `.design/render/bandbox-*.json` — a probe the doc cites, therefore tracked in `design/`, not scratch). The 320px at 390 matches the band's own header at 319.6px, which is D347's shelf.
- **bytes:** 2,322 gzipped alone; **deleting it saves 1,800 (`/`) · 1,859 (`/404`) · 1,873 (`/chat`) · 1,835 (`/join`) · 1,816 (`/schedule`) gzipped bytes = 9,183 gzip bytes across the five pages**, i.e. **39.9% of `/404`'s 4,663 gzip bytes**, 34.6% of `/join`'s 5,306, 22.5% of `/`'s 7,999, 22.4% of `/chat`'s 8,357, 16.4% of `/schedule`'s 11,045 (the 1,816 and 9,183 are the **23:32 CST** build; the 22:00 CST build said 1,817 and 9,184, and `price.json` carries only the later pair) (`@measured 2026-11-15 by node design/communication-price.mjs`, record `design/communication/price.json`; gzip −9 measured **in memory** over the built bytes — the artifact is never mutated, so this probe cannot be mistaken for a ship). The 5,762 octets include the two `data-rsvp-platform` attributes the concurrent item added to the band's outbound anchors (D349); the artifact this round read at 21:09 CST carried 5,750, which is the 12-octet difference, and every price above is stated against the later build.
- **the two legal sentences inside it:** 2 line boxes, **32px** tall at **11.1px** type, y=3034 @1240 and y=4020 @390, **18–19 gzip bytes per page**. Across a five-page visit that is **10 line boxes and 160px of standing scroll** spent on the same 21 words (`@measured 2026-11-15 by node design/communication-bandbox.mjs`)

This is the honest reading of a standing band: bytes are cheap and it should not be judged on them;
**reading** is what it costs, and the band spends a legal note on the page that claims nothing
(`/404`) and repeats a fact the reader will meet five times in one visit.

### the feed — `/events.ics`, 7,637 octets, 7 `BEGIN:VEVENT`

The feed is the only surface that answers where with bytes instead of prose: 7 `LOCATION` lines and 7
`GEO` lines, `X-WR-TIMEZONE:America/Chicago` and a `VTIMEZONE` block, `SEQUENCE` on all 7 rows,
`STATUS:CONFIRMED` on all 7. **Two of its rows are dated `20261107` and `20261111` — both already past
on 2026-11-15 — and both still `STATUS:CONFIRMED`**, while `/schedule` prints 5 rows all ≥ Nov 21
(`@measured 2026-11-15 by reading `dist/client/events.ics`: `BEGIN:VEVENT` 7, `DTSTART` 20261107/20261111/20261121/20261125/20261205/20261209/20261219, `STATUS:CONFIRMED` 7`). The feed is uncapped
*on purpose* (a plan ruling, and MS24's grouping), so the open half is not "trim the feed" — it is
that a subscriber's calendar will hold two November dates that read as live, and nothing on `/schedule`
or in the feed says which rows have passed (q17, §4). D223's shape — *is that row still true* — is
exactly this, and `check:ics`'s 21-day runway asks *is a row near*, not this.

## 3. What the first screen carries (the fold, at three stated viewports)

Viewports: **1240×900** (a laptop window), **768×1024** (a tablet upright), **390×844** (a phone
upright — the same box `design/line-length.mjs` measures at). All 15 cells posted, faces settled
before any rect was read (`@measured 2026-11-15 by node design/communication-survey.mjs --no-build`;
raw per-cell reports in `.design/render/communication-*.json`, the aggregate in
`design/communication/fold.json`).

| route | page height @1240 / @768 / @390 | exit band at | first action @1240 / @768 / @390 | controls above the fold |
|---|---|---|---|---|
| `/` | 3,114 / 3,851 / 4,100 | 2,834 / 3,571 / 3,780 | 364 / 364 / **356** | 2 of 4 / 2 of 4 / **2 of 4** |
| `/schedule` | 1,738 / 2,298 / 2,419 | 1,458 / 2,018 / 2,099 | none (0 controls; first anchor y16) | 0 total |
| `/chat` | 2,112 / 2,112 / 2,507 | 1,832 / 1,832 / 2,187 | 1,720 / 1,720 / 2,075 | 0 above, 1 below |
| `/join` | 1,924 / 1,924 / 2,314 | 1,644 / 1,644 / 1,994 | 409 / 409 / 505 | 3 of 4 / 4 of 4 / 2 of 4 |
| `/404` | 900 / 1,024 / 1,021 | 532 / 548 / 701 | 340 / 340 / 413 | 2 of 2 |

Three readings come out of this table, and they are not the same as the word census:

1. **`/` at 390 answers AND offers — the phone fold is not a live defect on this artifact.** The next-meeting
   block sits at **y=224, 346×108px**, and the page's two own controls sit at **y=356** (primary, "Join
   Our Group") and **y=416** (secondary, "See the dates") — all three above the 844 fold, with the first
   action at **y=356** (`@measured 2026-11-15 by node design/communication-survey.mjs --no-build`, record
   `design/communication/fold.json`; the same geometry posted on both artifacts this round ran against).
   What the phone screen does **not** carry above the fold is the band's two controls (y=3,684) — and those
   are the map, not the page's own offer. So the ask the last session parked in `NEXT.md` §Operator ToDo
   item 5 (when-line y=822, venue line y=874, both controls past 844 on **that** artifact) is **closed by
   measurement, not by a patch this round owes**: D340's block and D350's promotion of the block and the
   controls ahead of the lede are what moved it, and this survey is the proof. The §5 row therefore moves
   to **ALREADY-FIXED** and no Batch line points at it.
2. **`/chat` hides its only exit.** 1 control on the page, 0 above the fold, first action 1,720px down.
3. **`/join` and `/404` are the two pages that behave**, and they are the two pages that carry the
   least chrome relative to their own body.

## 4. The visitor-question inventory

`design/visitor-questions.mjs` asks 29 questions of 8 visitor classes against the six built surfaces,
and a question counts as answered **in the form the medium carries it** — prose, heading, link label,
`href`, `<meta>`, a `data-mark` tag, an `.ics` line — or as **declined in the open**, which is a page
naming the question it refuses ("Whether the room is your kind of room is not something a page can
tell you."). Declines are subtracted from answers, so a page that says it declines cannot also be
counted as answering.

`@measured 2026-11-15 by node design/visitor-questions.mjs` (record `design/communication/questions.json`, `artifactBuilt 2026-11-16T03:09:17Z`, `artifactFresh true`):

> **29 questions across 8 visitor classes · 6 surfaces: 19 answered where asked · 2 declined in the
> open · 8 unanswered · 0 answered only in chrome · 0 answered only off-page** · share card: **1
> distinct `og:description` across the 5 built routes**

| q | class | ask | verdict | where it is answered (form) |
|---|---|---|---|---|
| q01 | first-time | What is this, in one line? | ANSWERED | `/` prose |
| q02 | first-time | When do we meet? | ANSWERED | `/` prose ("Next meeting: Saturday, Nov 21 · 12:00 pm – 1:00 pm Central"), `/schedule` prose (5 dates) |
| q03 | first-time | Where do we meet? | ANSWERED | `/`, `/join`, `/schedule` prose; `/events.ics` LOCATION+GEO |
| q04 | first-time | Bring or prepare anything? | ANSWERED | `/`, `/join` prose ("Nothing to prepare and nothing to read first.") |
| **q05** | first-time | **What does it cost — a cover charge or a fee?** | **UNANSWERED** | nowhere; belongs on `/`, `/join` |
| q06 | first-time | The club's current focus? | DECLINED | `/` names it: "There is no syllabus, no reading list to keep up with, and no current focus." |
| q07 | first-time | Is the room one I can be in? | DECLINED | `/`: "Whether the room is your kind of room is not something a page can tell you." |
| q08 | first-time | How do I get in? | ANSWERED | `/`, `/chat`, `/join`, `/schedule` prose+label; `/404` in chrome only |
| q09 | first-time | What actually happens at a meeting? | ANSWERED | `/`, `/join` prose; `/schedule` row headings |
| **q10** | first-time | **Do I have to be a member to come?** | **UNANSWERED** | nowhere; belongs on `/`, `/join` |
| q11 | phone | Which tap gets me the calendar file? | ANSWERED | `/`, `/schedule` in body; `/404`, `/chat`, `/join` **chrome only** |
| q12 | phone | Ask the club something before a meeting? | ANSWERED | `/join` prose+label |
| **q13** | phone | **Something to call or tap more than once?** | **UNANSWERED** | nowhere; belongs on `/join`, `/` |
| q14 | share-link | Does the page name itself in a share card? | ANSWERED, but weakly | all 5 routes carry `meta`; `<title>` is page-specific ("Dates - Matheapolis", "Chat - Matheapolis", "Ways in - Matheapolis", "Page not found - Matheapolis"), the card text is not |
| q15 | calendar-subscriber | Does the file know my timezone? | ANSWERED | `/events.ics` `X-WR-TIMEZONE`, `TZID` |
| q16 | calendar-subscriber | Does each entry say where to go? | ANSWERED | `/events.ics` 7 `LOCATION` + 7 `GEO` |
| **q17** | calendar-subscriber | **Which of its dates have already passed?** | **UNANSWERED** | nowhere; belongs on `/events.ics`, `/schedule` |
| **q18** | calendar-subscriber | **How far ahead does the file reach?** | **UNANSWERED** | nowhere; belongs on `/events.ics`, `/schedule`, `/` |
| q19 | returning | What is the club arguing about now? | ANSWERED | `/chat` prose+heading, `/`, `/join`, `/404` |
| q20 | returning | What happened at a meeting I missed? | ANSWERED | `/chat` heading ("Summaries from the chat"); **not** on `/` |
| q21 | returning | Am I told when a date moves? | ANSWERED | `/schedule` only ("…it changes when the club changes a date.") |
| q22 | search-visitor | The link I followed is dead — what happened? | ANSWERED | `/404` prose+heading |
| q23 | search-visitor | Is anything here not shown to me? | ANSWERED | `/404` ("Everything we have sits behind one of these links.") |
| **q24** | search-visitor | **Can I look for a specific past meetup?** | **UNANSWERED** | nowhere; belongs on `/schedule`, `/404`, `/chat` |
| **q25** | any-visitor | **How do I get to the venue?** | **UNANSWERED** | nowhere; belongs on `/`, `/schedule` |
| q26 | assistive-tech | Does the drawing carry a name? | ANSWERED | `/` — the hero `data-mark="hero"` svg carries `aria-label="Two parallel lines leaving a sphere's equator and crossing at its pole"` |
| q27 | assistive-tech | Are the section names explained? | ANSWERED | `/`, `/chat`, `/join`, `/schedule`; on `/404` only in chrome |
| **q28** | assistive-tech | **What does the mark the wordmark carries mean?** | **UNANSWERED** | none of the 5 routes; the wordmark's `∑` is `<span aria-hidden="true">∑</span>` |
| q29 | assistive-tech | Does a link that leaves the site say so? | ANSWERED | all 5 routes, every outbound label (D317's rule; `rel="noopener noreferrer"` 4 / 3 / 4 / 5 / 8) |

Per-route tally of what each page is asked and what it answers — the answer where asked, the
chrome-only answers, and the body-answers are all in the record; the counts that matter for the plan
are the 8 UNANSWERED (q05, q10, q13, q17, q18, q24, q25, q28) and the 2 DECLINED (q06, q07).

## 5. Reconciliation — nothing here re-asks a closed item

| finding | state | what closed it, or what this round adds |
|---|---|---|
| the six thread glosses printed on both `/` and `/chat` | **NEW** | `check:threads` (MS23, D320) caps the list at 6 of 9 and holds the `/chat#threads` anchors; nothing has ever priced the *gloss* duplication. §Parked's "`/chat`'s thread list moved above its summaries" is a different ask (the order), so this does not collide with it |
| the two legal sentences on all 5 routes (10 statements) | **PARTLY CLOSED** | D344 moved three of five disclaimers from `/` to `/join`; the pair that remains is standing band copy, i.e. the repeat is the band's design (D307). New here is only the question of whether a legal note belongs in the band at all, and its price |
| the provenance pair on `/schedule` (×3) | **ALREADY-RULED** | `design/copy-duplicates.json` status `deliberate`, D218 + D322 |
| venue addresses repeated in sibling rows | **ALREADY-RULED** | D273 `rowFurniture` (coupling, not duplication) |
| home's next-meeting sentence and block | **ALREADY-FIXED** | D340 (supersedes D306's reversal); the block ships at **y=224 @390 (346×108)** and y=248 @1240/@768, above the fold in all three cells (`design/communication/fold.json`) |
| arrows on internal links only, 3 of them | **ALREADY-RULED** | D341 deleted the arrow from every outbound label; what remains is decoration, not a defect |
| outbound labels carrying "opens in a new tab" on all 5 pages | **ALREADY-RULED** | D317 / MS22, `check:ext-links` |
| the phone fold on `/`: does the phone screen offer anything? | **ALREADY-FIXED** | not live on this artifact — the survey puts the primary control at **y=356** and the secondary at **y=416**, **2 of 4 controls above the 844 fold**, first action y=356 (`design/communication/fold.json`), which is D340's block plus D350's promotion of the block and controls ahead of the lede. The parked pair y=822 / y=874 belonged to an older artifact. **Nothing owed**: this round closes the ask the last session parked; it does not re-ask it |
| the `/schedule` outbound-link ceiling ("no more than six outside the footer") | **PARKED, prompt item 1** | 7 absolute anchors outside the page's `<footer>`, two readings measuring 7 and 6; the operator's ruling is owed, not a patch |
| the `∑` in the wordmark lockup, and on `/404` | **PARKED (MS25)** | q28's action line points at that row and its trigger (the operator's rule, `nav-fit` 279-of-276px); this round adds the *meaning* half — the glyph carries no accessible name on any route |
| a home-page next date, one-action-per-row, the footer's order, the inline arrow, the phone rung, the OG plate, the `name`/`note` split, the free-online-events list | **PARKED (MS27/MS28/MS29)** | §Parked rows carry their prices from D337/§15; not re-priced here |
| "does the site say which feed rows already passed" (q17) | **NEW against MS05/MS24** | D223 named the shape in 2026-11-12 prose but no surface or gate answers it; MS24 closed grouping and the club's own words, not freshness of past rows |
| the share card: 1 description for 5 routes | **NEW** | §Parked's OG ask is about the **image**; this is the card's **text**, and `check:social` holds the bytes, not the wording |
| directions to a venue (q25) | **NEW** | the feed carries `GEO` for 7 rows, the pages carry an address string and no map path |
| a callable/tappable contact (q13) | **NEW** | no `tel:`/email anywhere in `dist/client`; the chat is the only contact path |
| cost of a meeting (q05), membership (q10), a past-meetup search (q24) | **NEW, and not groundable here** | these are claims about the club, not about the page; they become letters, not patches |

## 6. The plan — sequenced, priced, cost-classed

Every unanswered question appears exactly once below. Batches run **reversible → costly → one-way**,
and within a batch the cheapest-to-verify runs first. Nothing in this document is a patch: **no `src/`
change, no gate change, no push, no merge** were made this session, and the next session executes.

### Batch A — reversible, the delegate's own (copy that the artifact already grounds)

**A1 · the six thread glosses duplicated `/` ↔ `/chat`** (q14's not-a-question, the census's six clusters).
Price: **6 sentences, 363 characters, 157 gzip bytes on `/chat`** — the per-gloss deltas are 28 · 33 · 28 · 26 · 24 · 18 (`@measured 2026-11-15 by node design/communication-price.mjs`, record `design/communication/price.json`: the census's clusters #5–#10, each priced by splicing the extra statement out of the built bytes in memory and gzipping at −9). The strings live in
`src/content.json`'s `threads`, so one edit moves both surfaces at once. The honest reading: the
gloss on `/` is a *signpost* and the gloss on `/chat` is the *thread*; a reader who lands on `/chat`
gets the gloss twice from the same field. Options: (a) one gloss, both surfaces read it (the field
stays, `/chat` prints the name only) — costs 0 bytes, makes `/chat`'s thread list a bare list;
(b) keep both, and this stays as-measured copy; (c) split the field into `name`/`note` (that is
§Parked's `name`/`note` row and the operator's, so it is not this session's to start).
**Recommendation: (a) only if the operator accepts a bare list on `/chat`; otherwise (b), and record
the duplication as deliberate standing copy like D218's provenance pair** — pros of (b): no field
change, no gate touched, `/chat` keeps its glosses where they read the summaries; cons: 12 statements
of the same 6 facts. Access: none for (a)/(b) beyond `check:threads` re-running green. The one
measurement that changes the ranking: whether `/chat`'s summaries already re-state each gloss —
`node design/communication-census.mjs` re-run after a candidate edit prints the cluster count
(6 now) either way.

**A2 · the band's location-and-copyright line and the two legal sentences** (10 statements, 160px,
18 gzip/page). Options: (a) leave the band as it is — pros: the band is standing by design (D307),
`check:page-exit` holds it, no gate moves; cons: a reader meets the pair five times; (b) move the pair
to `/join`, which is the page that talks about the platforms, and let the band carry one clause —
pros: 10 statements → 5, `/join` keeps its own copy, the pair stops asserting on `/404`; cons:
`check:copy` guards the descriptor phrase and `check:content`'s near-duplicate rule may then need a
signature in `design/copy-duplicates.json`, i.e. two gate reads move with it; (c) delete the pair and
carry the legal note in the feed's `DESCRIPTION` and on `/join` only — cons: a trademark claim
unadorned on the pages that name Meetup and Discord is worse than the current repeat.
**Recommendation: (b)**, cost class **reversible** (the delegate decides and records it), price measured
above. Access: `check:copy`, `check:content`, `check:page-exit`, `check:naming` must stay green.
The one measurement that changes the ranking: whether the pair survives on `/` without breaking
`check:content`'s near-duplicate rule — `npm run check:content` answers in under a second.

**A3 · `/chat`'s one control and 0 above the fold** (first action y=1720 @1240, y=2075 @390).
The page's only exit is the Discord invite; the band already carries a second one 2,187px down.
Options: (a) promote one invite into the first screen as a labelled control; (b) leave it and let the
nav's `Chat` chrome be the page's own name (it already is, D309). Price: a control here costs a
`data-control` element, which `check:render:dist` then measures (MS12's cluster measured at 32px/68px/104px
tall, so a second control is a box the browser gates must re-measure). pros of (a): the one exit the page
names meets the first screen instead of the third, so the page stops spending 1,720px of prose to reach its
own offer; cons: one more box in the browser-gated set (`check:render:dist` re-measures its 12 cells), and
the page already paints a second Discord invite in the band 2,187px down, so (a) puts the same offer twice
on one page. **Recommendation: (a)** — a
page whose only exit sits two screens down is the worst communication defect on the artifact, and
D345 already accepted that `/chat`'s first screen must name a section. Cost class **reversible** for
the copy, **costly** for the control (it adds a render-gate control to a shipping page set). Access:
`check:render`, `check:render:dist`, `check:ext-links`, `check:contrast`. Measurement that settles it:
`node design/communication-survey.mjs --no-build /chat 390` printing `controls above the fold ≥ 1`.

**A4 · q13, a phone that has nothing to call.** The artifact has no `tel:` and no email on any route;
the only repeatable contact is the Discord invite. Options: (a) state the decline in the open — one
sentence on `/join` ("The club has no front desk and no phone number; the chat is where you ask.") —
pros: it answers the question the honest way the artifact already uses for q06/q07, costs ~15 words
and 0 boxes, and no third party is named; cons: it spends a sentence on the page about ways in to say that
there is nothing to call, and a phone visitor who wanted a number still has none — the decline is honest,
not helpful; (b) invent a contact — impossible: the club's phone number
is a claim this seat cannot ground; (c) leave it unanswered. **Recommendation: (a)**, **reversible**.
Access: none. Measurement that changes it: none needed — the decline form already ships on `/` twice,
so the pattern is `grep`-provable (`node design/visitor-questions.mjs` verdict moves UNANSWERED → DECLINED).

**A5 · q21 asymmetry: "am I told when a date moves" is answered only on `/schedule`.** Price: one
clause, already written ("Google, Apple and Outlook can all follow that link, and it changes when the
club changes a date.") exists on `/schedule` and could be echoed where the feed link is painted (the
band's "Add to a calendar" on all 5 pages). **Recommendation: echo it once, in the band, beside the
calendar link** — pros: the fact then travels with every place the feed is offered; cons: +1 line box
in the band on 5 pages. **Reversible**. Access: `check:page-exit`, `check:naming` (the band is the map,
D309 names it), `check:content`. Measurement that changes the ranking: `node design/communication-price.mjs`
run with the clause added, printing the band's `rawBytes` (5,762 today) and the five `saveIfDeleted` — if
the clause makes the band stop being byte-identical across the five routes, the echo has bought the reader
nothing and the clause stays where it is, on `/schedule`'s own lede.

### Batch B — costly (touches a shipping rule or a gate); delegate decides, writes, reports

**B1 · q17, the feed's past rows still `STATUS:CONFIRMED`.** This is the rawest material in the round:
two rows dated before today publish as live events to every subscriber. Options: (a) mark passed rows
in the feed with the standard property (`STATUS` → a past-dated row gets `STATUS:CANCELLED`? no —
cancelling is a lie; the standard form is the subscriber's *recurrence* semantics, so the honest fix
is (b) or (c)); (b) print a one-line runway in `/schedule`'s lede and in the feed's `DESCRIPTION`
("the feed carries the club's dates from <first> onward"); (c) let `check:ics` grow a rule that fails
a `CONFIRMED` row whose date has passed while keeping the feed uncapped. pros of (c): the class becomes
a gate, so a future harvest that publishes a passed row fails `verify` instead of shipping two live-looking
dates to every subscriber — and it never lies, since the feed stays uncapped; cons: it is a rule the reader
cannot see, which D313's class calls worse than a number, and MS24's 18 rules on `check:ics` have to be
re-read before a 19th lands. pros of (b): the subscriber's calendar and the page both say which rows have
passed; cons: a generated date in prose, so the sentence expires with the next harvest unless the build
writes it. **Recommendation: (c) plus
(b)'s one line** — the gate makes the class visible forever, the line makes it visible to the visitor,
and the uncapped-feed ruling stays intact. Cost: `check:ics` is in `verify` and MS24 closed 18 rules
on it, so this is a **costly** change to a shipping gate (D313's class: "a rule the reader cannot
see is worse than a number"). Access: the gate's own selftest must grow the planting (`check:ics:selftest`
currently 33 plantings). Measurement that changes the ranking: whether subscriber apps actually show
the two rows as upcoming on this artifact (`node scripts/discord-events.mjs`-style live read is out of
scope; `check:ics`'s 21-day runway already reads the same rows).

**B2 · q18, how far ahead the feed reaches.** Today the feed's own bytes say the answer and nothing wraps
it: 7 `DTSTART`s — 20261107 / 20261111 / 20261121 / 20261125 / 20261205 / 20261209 / 20261219 — so the feed
**reaches 2026-12-19** while `/schedule` prints 5 of those rows (`@measured 2026-11-15 by reading
`dist/client/events.ics``). Options: (a) one **generated** clause in `/schedule`'s lede naming the window —
pros: it answers the subscriber's second question where the feed link is offered, and being generated it
cannot go stale; cons: a sentence the build owns, so copy that moves with every harvest; (b) carry the same
window in the feed's own `DESCRIPTION` — pros: it sits where the answer is consumed, and it costs 0 page
boxes; cons: a browsing visitor never sees it; (c) leave it. **Recommendation: (a) plus (b)'s line** — one
clause where the feed is offered and one line inside the feed. Cost class **costly-leaning but reversible
in code** (it names a window the build computes, so the sentence must be generated, not written, or it
expires with the next harvest). Access: `src/lib/ics.mjs`, the template that paints `/schedule`'s lede, and
`check:ics` (already in `verify`, so a generated window needs a rule that reads it). Measurement that
changes the ranking: `node design/communication-census.mjs` after the clause lands — the wayfinding pair is
**11 of 22** today, and a clause that names the calendar the page already links to moves that pair, which is
the test of whether the sentence is information or pointer.

**B3 · q28, the wordmark's `∑` carries no accessible name on any of the 5 routes.** It is `aria-hidden`,
so a reader never hears it, and no page explains it. §Parked's two `∑` rows already hold the *mark*
decisions (the operator's rule, priced at 279-of-276px at the 320 floor by `node design/nav-fit.mjs
--no-build --widths 320`). **This round adds only the meaning half, and parks it under the same row
with the same trigger** — it must not open a third `∑` ask.

**B4 · q25, directions to the venue.** The feed already carries 7 `GEO` pairs; the pages carry an
address string and no path to a map. Options: (a) a per-row map link on `/schedule` — pros: the
information the visitor needs most often, and the bytes already exist in the feed; cons: it adds an
outbound platform (a map host) that `check:ext-links` and the platform sprite's rules would grow to
know, and it is a claim about a third party this seat does not declare in `src/config.json`;
(b) one line on `/join` naming how to get there in words; (c) leave it. **Recommendation: (b)**,
because (a) adds a platform binding the free-plan and the config rules do not have. Cost class
**costly** for (a) (new binding + a platform vocabulary rule), **reversible** for (b). Access for
(a): a `src/config.json` `URLs.*` key, `MEETUP`-style shape rules, and the sprite's platform set.
Measurement that changes the ranking: whether a visitor to `/schedule` actually leaves for directions
rather than for sign-up — the row already prints one way out (D342), so a second would compete with
it on the same box (row 1,164×184 at 1240 per fold census rows).

### Batch C — one-way, the operator's letter first (claims about the club, not about the page)

**Superseded 2026-11-16, on the operator's letter:** C1 and C2 landed as **declines in the open**, not as
the operator's words — **D376** (q05, cost) and **D377** (q10, membership), one sentence each in q06/q07's
voice, carried as sourced slots in `src/content.json` and painted on `/` and `/join` out of one call;
C3 landed as **option (a)**, the `/past` route, under **D374**. What is **not** landed is the operator's
word for either claim: the refusal is what ships until that letter arrives. The pricing below stays as the
record of what ranked the options.

**C1 · q05, cost of a meeting.** Nothing in the artifact states whether there is a cover charge; no
source in the tree states it either. Writing "no cover charge" is a claim about the club's practice.
Options: (a) the operator states it and it ships on `/join` and `/`; (b) decline in the open in the
same voice as q06/q07; (c) leave unanswered. **Recommendation: (a)**, then (b) if the club genuinely
has no standing answer — because a first-time visitor's second question after "when" is "what does
it cost", and an unanswered question there is the artifact's worst communication failure of the eight.
Access: the operator's word only. Measurement that changes the ranking: the club's own answer, not a
probe.

**C2 · q10, do I have to be a member to come?** Same class as C1; `/join` already organises the three
relationships (follow / come / talk), so the sentence belongs there as a clause on "Come to a
meeting". Options: (a) the operator's word ships as a clause on `/join`'s "Come to a meeting" — pros: it answers
the question a first-time visitor asks between "when" and "how do I get in", and `/join` already owns the
three relationships; cons: it is a claim about the club's practice that no seat may write, and if the answer
is "members only" the page then needs a membership path nothing in the artifact carries; (b) decline in the
open in q06/q07's voice — pros: honest, ~12 words, 0 boxes, and no claim invented; cons: the visitor still
does not know whether to arrive; (c) leave it. **Recommendation: (a)**. Cost class **one-way** (a claim
about the club, not about the page). Access: the operator's word only. Measurement that changes the ranking:
none inside the artifact — `node design/visitor-questions.mjs` prints q10 UNANSWERED whatever the page says
until the claim lands, so the club's own answer is the only measurement, and it is the operator's to give.

**C3 · q24, can I look up a specific past meetup?** Answered nowhere on `/schedule`, `/404` or `/chat`.
Options: (a) a small archive surface (a `/past` page, or the feed's uncapped rows printed as an
"earlier dates" block on `/schedule`); (b) one clause on `/404` and `/schedule` saying the archive is
the Meetup group's page, with the existing group link; (c) leave. **Recommendation: (b)** — the
artifact already says "The club's list of members is its Meetup group page" and the group link is in
the band, so (b) spends ~12 words and 0 boxes, while (a) is a new surface plus `check:dated-surfaces`
and the sitemap and `check:site-host` moving with it — the same class as the parked `/schedule` →
`/dates` rename, and that one is parked because the rename is **one change or none** (D309). Cost
class: (b) **reversible**, (a) **one-way** (a new emitted route is a cutover decision, MS02's shape).
Access for (a): `src/pages/`, the sitemap, `check:site-host`, the cutover runbook. Measurement that
changes the ranking: how far the gap between the feed and the page grows — today the feed carries **7** rows
and `/schedule` prints **5**, two of them already past, under a cap of 8 (D238). While the gap is 2 rows,
(b)'s ~12 words is the whole answer; the moment it grows past the cap, (a)'s surface is what a search
visitor needs, and `check:dated-surfaces`, the sitemap and the cutover rules move with it — which is the
same one-change-or-none shape D309 holds the `/schedule` → `/dates` rename in.

### Batch D — what this round explicitly does not start

**Superseded 2026-11-16:** the sweep this heading declines to start **did** start, on the operator's letter —
the `/schedule` → `/dates` rename landed as one change-or-none sweep (**D373**, `d4e1951`) and the `/past`
route that answers q24 landed with it (**D374**, `16c059a`); §0's row above carries what that moved in the
numbers of this document. What stays not-started is everything listed below.

The `∑` meaning (B3's park), the OG card's **image** (parked, MS25), the band's plate and its cap
(prompt item 2, priced by D337 and §Parked), the outbound-link ceiling (prompt item 1, 7-vs-6),
the footer's link order, the `name`/`note` field split, the free-online-events surface and vocabulary
(MS29), the mobile date chip (needs 54px freed at the 320 floor), hiding the band on phones (+715px
at 390), and the meeting photograph (an operator errand, no stock substitute) — all already carry a
§Parked row with a trigger, and re-pricing them here would buy nothing.

## 7. What this round leaves the machine

- Six tracked probes and five tracked records (`design/communication/{report,fold,questions,price,bandbox}.json`), plus the shared page reading `design/dist-pages.mjs`, which is now the only home for "what a page says at offset N" — the census and the question probe cannot disagree about a page. The two that bring money and boxes are `design/communication-price.mjs` (gzip deltas of the duplicate statements, measured in memory) and `design/communication-bandbox.mjs` (the band's box at 1240/390).
- `design/dist-pages.mjs` refuses routes whose carrying file is not on disk, because the browser gates
  write `rendered-index.<w>.html` and `.measured-rendered-index.<w>.html` **into** `dist/client`, and
  `emitted-routes.mjs` reads those as routes. That is a probe-class trap worth the pitfall register:
  a route-enumeration probe run after a browser gate sees phantom pages.
- The band's cost is now a machine record in three units (bytes, box, line boxes) instead of prose.
- `check:plan` gains MS31; `MILESTONES.md` carries it in the same commit.

Nothing here authorises a merge or a push (D42, D124); the operator holds the grants, and MS31's
Batch A–C work is the **next** session's.
