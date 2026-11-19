#!/usr/bin/env node
// review-round-8-census.mjs — re-run the round-8 copy letter's own evidence against the artifact THIS tree ships.
//
//   node design/review-round-8-census.mjs              # the table, one row per line item of the letter
//   node design/review-round-8-census.mjs --json       # the machine record (design/review-round-8/report.json)
//   node design/review-round-8-census.mjs --selftest   # every row's planted defect, and the verdict it must name
//   REVIEW_ROUND_8_OUT=design/review-round-8/report.json  # where the record lands
//
// The round-8 letter (home, /dates, /join, /chat, apex) is an external read of the staging preview. Like round 7's,
// every one of its line items is a claim about **a string or a count in the built page**, so every one of them is
// checkable — and some of them name a defect the round that shipped between the read and this session already
// removed. A verdict says one of four things:
//
//   OPEN           the artifact this tree builds still carries the defect the letter names: work remains
//   CLOSED         it does not, and the row prints the copy that stands in its place now
//   DECLINED       the item is settled as a stance this tree keeps (the row carries the ruling that holds it, D436)
//   NOT MEASURABLE live model output, or a fetch no seat runs — the row's evidence is the instruction that owns it
//
// Nothing here judges wording, colour or composition: this probe reads the artifact, like the letter does.
// `dist-fresh.mjs` gates the read first (D266/D426's class: a branch switch left the gates measuring the old page).
//
// A row may carry `min` (the hit count that counts as satisfied, for "five headings must be five dates"), `zone`
// (the defect is a sentence in one part of the page, so a move between parts is a fix rather than a miss),
// `declined` (the ruling that holds it — an item that stays OPEN every round is an instrument that asks for the
// same letter forever, D413's class one step further), and `file`/`owns` (client-rendered copy lives in the
// component, and a row that read the built page for it reported CLOSED for a string the page never had).
//
// NOT a gate: like `design/link-ceiling.mjs` and `design/communication-census.mjs`, it prints and exits 0. What
// executes the letter is a session with a diff; what decides is the operator.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { onePage, pageFileFor, decode } from './dist-pages.mjs';
import { distState, staleLine } from './dist-fresh.mjs';

const ROOT = process.env.DIST || 'dist/client';
const ROOT2 = process.env.ROOT_DIR || '.';
const OUT = process.env.OUT || 'design/review-round-8/report.json';
const SELFTEST = process.argv.includes('--selftest');

/** Refuse a stale dist — the same preflight every `--no-build` probe makes, in its own words (D266). */
const state = distState();
if (!state.fresh && !state.allowed) {
  console.log(staleLine(state));
  process.exit(1);
}

const pages = {};
for (const route of ['/', '/dates', '/join', '/chat', '/past']) pages[route] = await onePage(pageFileFor(route, ROOT), ROOT);
for (const p of Object.values(pages)) {
  p.plain = decode(p.text.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  // The date rail of a row is graphic, not prose; a row that reads the whole page for "Nov 21" would count the
  // rail as a second printing of the date. Rows below read `plain`, which keeps the rail, and `prose`, which does not.
  p.prose = p.sentences.filter((s) => !s.flagged).map((s) => s.text).join(' ');
}

// ---------------------------------------------------------------------------
// The letter's line items, one row each, in the letter's own order, with the letter's own ids.
// Home: the five `copy, exactly` bullets then the page's Revise/Keep rows.
// /dates, /join, /chat: same. Apex last: it is a deploy ask, so its rows carry their ruling.
// Where the letter states the same ask twice — once in the copy block and once in the page's Add/Remove table —
// that is ONE line item and ONE row; its `why` names both letter lines, so the reply doc and the census agree.
// ---------------------------------------------------------------------------
const CHECKS = [
  // ---- Home ----
  { id: 'H1', route: '/', want: 'absent', needle: 'Dates go up on Meetup; most of the arguing', why: 'copy line 19: delete the first clause, keep "Most of the arguing happens in the chat between meetings." The needle is the seam, so a page that keeps either half of it still has the defect' },
  { id: 'H1b', route: '/', want: 'present', re: true, needle: 'Most of the arguing happens in the chat between meetings\\.', why: 'the other half of the same line: what the letter asks the sentence to read after the fix' },
  { id: 'H2', route: '/', want: 'absent', needle: 'at a table, historically', why: 'copy line: "Three to seven people at a table, historically." → "Usually three to seven people at a table." The old wording is the defect; it lives in the `turnout` slot in src/content.json, not in markup (D265)' },
  { id: 'H2b', route: '/', want: 'present', needle: 'Usually three to seven people at a table', why: 'the letter\'s wording, shipped from the same sourced slot rather than as prose (an attendance claim has no record in this tree: D265)' },
  { id: 'H3', route: '/', want: 'absent', kind: 'heading', needle: 'When we meet', why: 'copy line: delete the H2 "When we meet" (operator\'s answer: delete the heading and its promise, keep `/` date-free in the band). A heading that promises a when and delivers navigation is the defect D350 named' },
  { id: 'H3b', route: '/', want: 'present', kind: 'heading', needle: 'How it works', why: 'the band keeps the heading its content sits under; with the H2 gone the ladder must not skip a level, so this heading is the band\'s only opening heading' },
  { id: 'H4', route: '/', want: 'present', needle: 'usually the one with the laptop open', why: 'copy Add after the thread list: "Ask for [host name]; they\'re usually the one with the laptop open." and the Home Add row "one sentence naming a human" — one ask, one row. No literal bracket ever ships (D415): the words come from a draft slot carrying asOf + correction' },
  { id: 'H4b', item: 'Home/Add: “one sentence of past” — “We’ve been meeting since [year]; last month we worked through [thing].”', route: '/', want: 'present', kind: 'source', file: 'src/content.json', needle: '"pastLine"', why: 'the sentence the letter wants, landed as a DRAFT SLOT rather than as a fact: nothing in this tree records a first meeting (`data/events.json` starts 2026-11-07) and the apex page is not in this tree (D245), so the slot ships empty and paints nothing while carrying `asOf` + `correction` into this reply\u2019s ledger. The row prices the home that the year lives in, which is the ask; the row that would price the sentence itself cannot exist until the operator fills the value. Evidence, re-runnable: `grep -c pastLine src/content.json`, and `npm run check:content:selftest`, whose `draft-claim-uncorrectable` rule fails any slot without a correction path' },
  { id: 'H5', route: '/', want: 'present', kind: 'source', file: 'dist/client/index.html', needle: 'data-slot="PS-1"', min: 1, declined: 'the apex photograph, and the reserved place this row reads (`find src/assets -type f` names five files — hero.png, three horizon plates, README.md — and no meeting photograph; the file the letter names, math-group-image.jpg, is on the apex, not in this tree, and it was a stock crowd photo with an invented alt). D86 ruled stock crowd photography out ("it shows people who have never attended") and D94 ruled the site photo-free by construction ("no club photograph exists, so no surface may require a picture"). MS32 — the milestone that would commission a real one — was refused by the operator on 2026-11-17 ("I can\'t do this now"), and the letter\'s own condition ("if the apex photo is real") has never been met. The <figure> ships the day MS32 lands', why: 'the <figure> after "What we take up", gated on the letter\'s own condition' },
  { id: 'H6', item: 'Home/Revise: line 5 is 31 words in one sentence with four commas', route: '/', want: 'present', kind: 'metric', metric: 'bodyMaxSentenceWords', re: true, needle: '/=(?:[1-9]|1[0-9])( |$)', why: 'Revise: split the lede at the dash, priced as a number. The bar is the page\u2019s OWN prose: `bodyMaxSentenceWords` counts sentences in the body zone only, because the exit band\u2019s sentences (21 words, identical on all five pages) are D115\u2019s site-wide copy and no letter item asks to change them — a whole-page max would be the same number on every route and could not move by fixing the lede. `/` opens at 23 words in the thread-list lead and 21 in the lede; both must split.' },
  { id: 'H7', route: '/', want: 'present', needle: 'Dates and places go up on', why: 'Keep: line 38, the fuller Meetup sentence. It is the site naming its own limit, and deleting it is the defect D350 closed' },
  { id: 'H8', route: '/', want: 'present', needle: 'buy a coffee if you want one', why: 'Keep: line 48, the rent line. First-ten-minutes copy, and D388\'s whole answer for arriving' },
  { id: 'H9', route: '/', want: 'present', needle: 'nice to buy a drink', why: 'Keep: line 13, the cost answer - the needle moved 2026-11-19 with the author\'s own re-wording of the `cost` slot (**D449**), which is what made this row read OPEN for a fact the page still states. The letter\'s needle was "Free. No membership needed", the two halves contiguous; the author\'s 2026-11-19 sentence now sits between them, so the pair is priced as two rows (H9b is the membership half). **The needle stops before the apostrophe on purpose:** the built page escapes it (`Free. It&#39;s nice to buy a drink...` @measured 2026-11-19 by reading `dist/client/index.html`), and a needle carrying a literal apostrophe can never match the artifact - while its own selftest still passes, because the selftest plants the needle string itself. That is round 7\'s trap in a new costume: a row that reads OPEN forever and calls itself a detector' },
  { id: 'H9b', route: '/', want: 'present', needle: 'No membership needed', why: 'the other half of the same Keep row: D381/D421\'s membership answer, unprompted by the re-wording. Deleting it re-opens q05 in `design/visitor-questions.mjs`' },
  { id: 'H10', route: '/', want: 'present', needle: 'cropped from that leaf', why: 'Keep: line 23\'s caption — the engraving\'s provenance. D101/D116\'s rule is that a drawing says what it is' },
  // ---- /dates ----
  { id: 'D1', route: '/dates', want: 'present', re: true, needle: 'A social is an afternoon around a table, nothing to prepare\\. A study session is an evening working side by side\\.', why: 'lede, replace one long paragraph: the kinds get their own sentence, in the letter\'s words, without the semicolon that made the lede one 55-word paragraph' },
  { id: 'D1b', route: '/dates', want: 'absent', needle: 'with nothing to prepare; a study session', why: 'the same lede\'s other half: the clause that chained the two kinds into one sentence is the thing being deleted' },
  { id: 'D2', item: 'Dates/Revise: the lede is one 55-word paragraph carrying rhythm, two format definitions, provenance and a link promise', route: '/dates', want: 'present', kind: 'metric', metric: 'bodyMaxSentenceWords', re: true, needle: '/dates=(?:[1-9]|1[0-9])( |$)', why: 'Revise: split the lede into sentences and a second short paragraph. Same pricing as H6: body zone only, so D115\u2019s standing band copy is not what has to move. `/dates` opens at 55 words in one paragraph; its body now sits at 14.' },
  { id: 'D3', route: '/dates', want: 'present', kind: 'heading', re: true, needle: '(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \\d{1,2} \\u2014 ', min: 5, why: 'row headings: the date leads. "Sat, Nov 21 — Social" as the heading, and the format word inside it. Priced off the feed: five headings, each opening with the row\'s own weekday, month and day, never a typed date' },
  { id: 'D3b', route: '/dates', want: 'absent', kind: 'heading', re: true, needle: '^(Social|Study session)$', why: 'the same ask\'s other half: the five headings that name a format instead of a date. Five headings reading two format names is the defect the letter grades, and it is a screen-reader defect as well — a heading has to say which date it is' },
  { id: 'D4', route: '/dates', want: 'present', kind: 'source', file: 'dist/client/dates/index.html', re: true, needle: 'aria-hidden="true"[^>]*data-leaf', min: 5, why: 'mark the Nov/21/Sat block aria-hidden. Its own remedy — hide the rail, let the full sentence carry it — is on the date rail of all five rows; the row reads the built bytes, so this is what ships, not what a comment claims' },
  { id: 'D5', route: '/dates', want: 'absent', zone: ['body'], needle: 'Google, Apple and Outlook can all follow', why: 'delete line 95, the repeated explanation. The band says it once on every emitted page (D115); the body\'s copy beside the standing row is the repeat. Scoped to the body, because deleting the band\'s copy instead is the other defect' },
  { id: 'D6', route: '/dates', want: 'present', kind: 'metric', metric: 'bandRepeat', re: true, needle: '/dates=0', why: 'delete line 93, the duplicate platform row. Priced rather than remembered: D407\'s dedup against EXIT_BAND_PLATFORMS deleted the row the letter counted, so 0 URL the band paints is painted a second time above it, and the page sits at 6 of 6 (D8 is the ceiling\'s own row)' },
  { id: 'D7', route: '/dates', want: 'present', kind: 'href', re: true, needle: 'google\\.com/maps|\\bmaps\\.', min: 1, declined: 'a maps link per row, and a per-row .ics, against the ceiling this tree ratified. `node design/link-ceiling.mjs` prints "ceiling: 6 on /dates of 6 built pages; the rule R1(a) accepts is 6" — /dates is AT the ceiling D358 ratified and check-rsvp-page enforces, and five rows would add five anchors. Raising the ceiling is one-way (it is what every subscriber of every page pays), so the row records the stance: the row\'s one way out is D342\'s, and the address the directions need is printed in the row already. Trigger that would ship it: a ruling that re-ratifies the ceiling above 6', why: 'a directions link per row, against the ratified ceiling' },
  { id: 'D7b', item: 'Dates/Add: per-row “add to calendar” — you have per-UID .ics data, expose it', route: '/dates', want: 'present', kind: 'href', re: true, needle: '\.ics$', min: 1, declined: 'the same ceiling as D7: `node design/link-ceiling.mjs` prints the absolute URLs each built page paints outside its own <footer>, and `/dates` is AT the 6 that D358 ratified and `check:rsvp-page` enforces. Five per-row .ics anchors would be five more on the page that already carries the site-wide feed and the band’s own calendar row. What ships is the feed (one way out for every date at once) and the band row; what does not ship is a door per row. Evidence, re-runnable: `node design/link-ceiling.mjs`, `npm run check:rsvp-page`, and `grep -c entry dist/client/events.ics`, which shows the per-event data the letter says exists. Trigger that would ship it: a ruling re-ratifying the ceiling above 6, or one that makes a per-row download a hosted file rather than an outbound anchor.', why: 'the letter\u2019s own data exists — `dist/client/events.ics` carries one entry per event — so this row prices the affordance, not the availability' },
  { id: 'D8', item: 'Dates/Revise: “8 absolute URLs outside <footer>, against the ratified ceiling of 6 — deleting the duplicate row returns you to 6”', route: '/dates', want: 'present', kind: 'metric', metric: 'outbound', re: true, needle: '/dates=6( |$)', why: 'the letter priced its own page; this row prices the same claim off the same read. D407\'s dedup against EXIT_BAND_PLATFORMS deleted the row the letter counted, so the page sits at 6 of 6 and the ceiling is not what needs raising — the duplication that caused it is gone. `node design/link-ceiling.mjs` is the instrument that prints the ceiling and names the page that defines it; D358 ratified it, `check:rsvp-page` enforces it' },
  { id: 'D9', item: 'Dates/Add: “/schedule → /dates redirect. Fourth round.”', route: '/dates', want: 'present', kind: 'source', file: 'astro.config.mjs', needle: '/schedule', why: 'the fourth round\u2019s ask, already shipped in the round that made it measurable: D408 put the 301 in the adapter\u2019s redirects, so `/schedule` answers with `/dates` rather than 404ing. It reads the config, not the built page, because a redirect is a response header and no page in `dist/` carries it. Evidence, re-runnable: `curl -si https://staging.matheapolis.com/schedule` on the preview, or the redirect block in `astro.config.mjs`' },
  // ---- /join ----
  { id: 'J1', route: '/join', want: 'present', needle: 'Where the club announces dates, and keeps the RSVP list', why: 'copy line 48: the member list\'s clause, in the letter\'s words. The clause is the resolver\'s — `joinChannels()` in src/lib/rsvp.mjs is the one home for which platforms the club has (D264), so the edit goes there' },
  { id: 'J1b', route: '/join', want: 'absent', needle: 'The club’s member list, and where a date gets announced', why: 'the same line\'s first half: the wording that made the member list sound like a promise about dates' },
  { id: 'J2', route: '/join', want: 'present', needle: 'Nothing is expected of you', why: 'copy line 60: "Expect nothing." → "Nothing is expected of you." The imperative that reads as a command becomes the sentence that answers "what do I have to do"' },
  { id: 'J2b', route: '/join', want: 'absent', needle: 'Expect nothing', why: 'the same line\'s first half' },
  { id: 'J3', item: 'Join/Revise line 21: the pointer that withholds the date you already have', route: '/join', want: 'present', re: true, needle: 'Next: (Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \\d{1,2}', declined: 'painting a date on `/join` fails two gates this tree will not contradict, so the letter\u2019s wording is declined and its principle is shipped instead. `scripts/check-join-page.mjs` rule 1c (`join-date-painted`) fails any join page that repeats a date, and `scripts/check-dated-surfaces.mjs` keeps a `RULED` map naming `/dates`, `/past` and `/` only, so a fourth date-bearing surface fails `dated-surface-unruled`. Both trace to the operator\u2019s own `/join` objective (no page grows a second source of truth for links, dates or claims), and re-ratifying that map is a ruling, not this item\u2019s call (ids are append-only, D436). Re-runnable evidence: `npm run check:join` and `npm run check:dated-surfaces` exit 0 today while `/join` prints no date. What ships instead is the pointer made honest without the date, in `src/pages/join.astro`: "The dates page names the next one." Trigger that would ship the letter\u2019s wording: a ruling adding `/join` to that `RULED` map, one-way in the same sense the anchor ceiling is, because it decides which surfaces may go stale on their own.', why: 'copy line 21: → "Next: Sat, Nov 21, noon — all the dates". Naming the date converts the pointer into the answer. The date is generated from the same schedule window `/dates` and the nav chip read, never typed (D238, D340)' },
  { id: 'J3b', route: '/join', want: 'absent', needle: 'The next ones are on the', why: 'the same line\'s first half: the pointer that makes a reader leave to find out what "the next ones" are' },
  { id: 'J4', item: 'Join/Revise line 21 (same item): the named date must be the neighbour\u2019s date', route: '/join', want: 'present', kind: 'metric', metric: 'nextDateHandshake', re: true, needle: '/join=match', declined: 'the handshake this row prices can only be satisfied by a surface that names a date, and row J3 above records that `/join` may not print one (check-join-page rule 1c, check-dated-surfaces RULED). The row is kept so the instrument prints the pair `/join = none` rather than a memory: `check-dated-surfaces` is the gate that guards the same comparison across surfaces, and it is green because no surface disagrees. Same trigger as J3.', why: 'the named date is the page\'s neighbour\'s date: the `data-date` handle /join paints must equal the first `data-date` /dates prints. `check-dated-surfaces` compares the same pair across surfaces, so a disagreement is a build that fails twice' },
  { id: 'J5', route: '/join', want: 'present', needle: 'Two feeds, if you’d rather not use Meetup', why: 'copy line 44: the feed group\'s heading, in the letter\'s words — it names the choice the reader has, rather than assuming they read the feed' },
  { id: 'J5b', route: '/join', want: 'absent', needle: 'A feed you already read', why: 'the same line\'s first half' },
  { id: 'J6', route: '/join', want: 'absent', needle: 'There is nothing to prepare and no reading to keep up with', why: 'delete the second sentence of line 58; home already says it. The pair is D344\'s and D369\'s registered deliberate duplicate across the two surfaces — deleting the /join half is what leaves the sentence on the surface that says what a meeting is' },
  { id: 'J7', route: '/join', want: 'absent', needle: 'Whether the room is your kind of room is not something a page can tell you', why: 'SUPERSEDED 2026-11-19, so `want` is flipped from the letter\'s Keep row: the operator deleted the sentence ("Just remove \"Whether the room is your kind of room is not something a page can tell you.\", then. I don\'t like that sentence.", **D451**), which is the deletion D389 priced but with a different trigger - the author\'s ear, not MS32\'s photograph. The row still fires: it now sees OPEN if the sentence comes back, and its selftest plants exactly that. What the deletion costs is on the record, not here: `node design/visitor-questions.mjs` moves q07 ("is the room one I can be in?") from DECLINED to UNANSWERED, so the question survives and the page\'s way of naming it does not. D368 (name a gap in the open) is unchanged and `/`\'s "no current focus" line is now the only such sentence the build carries' },
  { id: 'J8', route: '/join', want: 'present', needle: 'Three ways in, and you only need one to start', why: 'Keep row: keep "Three ways in…" and do NOT add a fifth door. D303\'s one primary, and the page\'s shape is its own explanation (D304)' },
  { id: 'J9', route: '/join', want: 'present', kind: 'metric', metric: 'controls', re: true, needle: '/join:primary=1', why: 'the same Keep row\'s structural half, priced: exactly one primary on the page, so a fifth door is measured rather than trusted' },
  { id: 'J10', route: '/join', want: 'present', kind: 'href', re: true, needle: 'mailto', declined: 'the private door. `dig +short MX matheapolis.com` answers no record at all, and the same probe on minneapolismathbookclub.com answers none, @measured 2026-11-17 and re-run 2026-11-18 (Linux native, BIND DNS): neither apex zone carries an address service, so printing an address would invent one, and the operator confirmed on 2026-11-18 that no address is provisioned. D403 (ruling S058) is the ruling that holds it. Trigger that ships it: the day the operator provisions Cloudflare Email Routing on the apex zone — `docs/reply-to-the-communication-review-round-7-2026-11-18.md` §5 names the same trigger', why: 'the mailto the letter adds on /join' },
  // ---- /chat ----
  { id: 'C1', route: '/chat', want: 'absent', needle: 'No summary written this week', why: 'move the empty state to the end as one line with no heading. The heading over a void is the defect D409 named; the letter moves it down the page as well as quieting it' },
  { id: 'C1b', route: '/chat', want: 'absent', re: true, needle: 'No summary this week\\. The channel is the live thing\\.', why: 'the same item\'s other half: the one line, in the reviewer\'s own words, kept by round 6 and this round alike — **SUPERSEDED 2026-11-19, so `want` is flipped from the letter\'s wording**: the operator deleted "The channel is the live thing." out of the shipped line (**D453**), one of the four sentences `npm run check:copy-contract --print-hollow` held on the worklist, which the author cleared by deletion rather than by rewrite ("(A) drop all four of those."). The row still fires: it now reads OPEN if that half-sentence comes back, and its selftest plants exactly that. What survives of the reviewer\'s line is "No summary this week.", and row C2 keeps the bot-voice sentence byte for byte' },
  { id: 'C2', route: '/chat', want: 'present', needle: 'Our bot writes this section from recent channel activity, after the noise settles', why: 'Keep row: the bot-voice sentence survives byte-for-byte — it says how the section is made, and nothing else on the page does' },
  { id: 'C3', route: '/chat', want: 'absent', needle: 'the dates the club set', why: 'delete "the dates the club set" from the lede: the lede promises dates, and `/chat` prints none, so the subtitle lies about its own page' },
  { id: 'C4', route: '/chat', want: 'absent', kind: 'heading', needle: 'The chat itself', why: 'delete the section entirely. "The channel is the live thing" is three times on one page, and this section is the second of the three' },
  { id: 'C5', route: '/chat', want: 'present', re: true, needle: 'Nine threads the club is pulling on\\.', why: 'line 23 → the count of what the page lists, and what none of it asks of a visitor. Priced off `threads()`\'s own length, not typed' },
  { id: 'C5b', route: '/chat', want: 'absent', needle: 'Every thread on the list, each with what the club says it is', why: 'the same line\'s first half: the meta-description that described the teaser instead of the page (D411\'s class)' },
  { id: 'C6', route: '/chat', want: 'present', kind: 'source', file: 'src/components/ThreadFigure.astro', re: true, needle: '<figcaption', why: 'line 35 → a figcaption under the drawing. A provenance line as body prose reads as the page talking about itself; under the drawing it is the drawing\'s own label' },
  { id: 'C6b', route: '/chat', want: 'absent', kind: 'source', file: 'src/pages/chat.astro', needle: 'not a scan of a book', why: 'the same move\'s other half: the provenance sentence stops being a paragraph of the page' },
  { id: 'C7', item: 'Chat/Keep: "Our bot writes this section from recent channel activity, after the noise settles." (and round 7\u2019s human-framing line beside it)', route: '/chat', want: 'present', kind: 'source', file: 'src/components/DiscordSummary.svelte', needle: 'Nobody typed these lines', why: 'the one line of human framing above the bot voice, kept from round 7 (D432), and kept byte-for-byte through this round\u2019s moves. It reads the component, not the built page: `/chat` hydrates the island with `client:visible`, so the branch that has summary data under it is compiled into the runtime and the built bytes never carry that branch — round 7\u2019s instrument hit the same trap and said the rule is that client-rendered copy is measured in the component that declares it' },
  // ---- apex ----
  { id: 'X1', route: '/', want: 'present', kind: 'metric', metric: 'apexServed', re: true, needle: 'CANNOT ANSWER', declined: 'one host, one site: pointing the apex at this build is a deploy on the live zone, and the grant is the operator\'s. D42 owns the apex, D245 is the reason a live site and a green gate set are different facts (`probe:live` is the only instrument here that compares what a visitor is served with what this tree would ship), and D124 keeps even the review branch\'s push with the operator. Trigger that ships it: the operator runs the deploy against this branch, and then `npm run probe:live` is the check' },
  { id: 'X2', route: '/', want: 'present', kind: 'metric', metric: 'apexClaims', re: true, needle: 'CANNOT ANSWER', declined: 'reconciling seven claims (name, current focus, who teaches, member count, cadence, materials, photograph) against the apex before it goes live is a claim about a page this seat does not read and is not permitted to change. What this tree holds is the slot file: `src/content.json` carries name (seo), focus (empty since D318 — the operator ruled "We have no current focus at all right now"), cadence (sourced), membership (sourced, tally off the page under D276), materials (the no-syllabus line). The apex\'s own words stay the operator\'s, and `npm run probe:live` is the command that reads them' },
  { id: 'X3', route: '/', want: 'present', kind: 'metric', metric: 'assets', re: true, needle: 'math-group-image', declined: 'the letter\'s condition — "if math-group-image is a real meeting photo… If it is stock, delete it and commission nothing in its place". It is stock, and D86 already ruled stock crowd photography out and D94 ruled the site photo-free; the file was never in this tree\'s shipped pages (HeroSection.astro names the column that used to hold it, and PhotoSlot is what replaced it). Commissioning nothing is what the ruling already says, so the row records agreement rather than owing work' },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A `min` raises the bar for "five headings must be five dates": the count has to reach it, not just clear zero.
const stripComments = (t) => t.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*(?:\/\/|\*)[^\n]*$/gm, ' ');
const SOURCE_FILE = (f) => {
  try { return f.endsWith('.astro') || f.endsWith('.svelte') || f.endsWith('.ts') || f.endsWith('.mjs') || f.endsWith('.json')
    ? stripComments(readFileSync(resolve(f), 'utf8'))
    : readFileSync(resolve(f), 'utf8'); } catch { return null; }
};
const titleOf = (p) => {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(p.raw);
  return m ? decode(m[1].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim() : '(no title)';
};
/** Longest sentence, in words — what a Revise row that says "split this paragraph" means, as a number. */
const wordsIn = (s) => (s.trim().match(/[^\s]+/g) ?? []).length;
const maxSentenceWords = (p) => Math.max(0, ...p.sentences.map((s) => wordsIn(s.text)));
/** Longest sentence in the page's OWN prose — the body zone, with the exit band and the nav chip out.
   D115 makes the band's sentences identical on every emitted page, so a whole-page max is the same number
   on all five routes and cannot move by fixing one lede: it prices "the page has a long sentence", not
   "the lede the letter read is long". A letter row about a paragraph prices that paragraph's page. */
const bodyMaxSentenceWords = (p) => Math.max(0, ...p.sentences.filter((s) => s.zone === 'body').map((s) => wordsIn(s.text)));
/** The date a surface hands out, read off its own `data-date` handle — the handle D340 made for this comparison. */
const firstDateHandle = (p) => {
  const m = /data-(?:date|nav-date)="(\d{4}-\d{2}-\d{2})"/.exec(p.raw);
  return m ? m[1] : 'none';
};

// ---------------------------------------------------------------------------
// The counts the letter argues with instead of quoting, priced off the same read (D434, D437).
// ---------------------------------------------------------------------------
const outsideAbsolute = (p) => p.anchors.filter((a) => /^https?:/i.test(a.href) && a.zone !== 'exit-band');
const controlsByRoute = Object.fromEntries(Object.entries(pages).map(([route, p]) => {
  const roles = { primary: 0, secondary: 0 };
  for (const m of p.raw.matchAll(/<a[^>]*data-control="(primary|secondary)"/g)) roles[m[1]]++;
  return [route, roles];
}));
const bandRepeatByRoute = Object.fromEntries(Object.entries(pages).map(([route, p]) => {
  const band = new Set(p.anchors.filter((a) => a.zone === 'exit-band').map((a) => a.href));
  return [route, outsideAbsolute(p).filter((a) => band.has(a.href)).length];
}));
const metrics = {
  joinLabels: [...new Set(Object.values(pages).flatMap((p) => p.anchors.filter((a) => /^(join|sign up|come|attend)/i.test(a.label)).map((a) => a.label)))],
  outbound: Object.fromEntries(Object.entries(pages).map(([route, p]) => [route, outsideAbsolute(p).length])),
  bandRepeat: bandRepeatByRoute,
  controls: controlsByRoute,
  maxSentenceWords: Object.fromEntries(Object.entries(pages).map(([route, p]) => [route, maxSentenceWords(p)])),
  bodyMaxSentenceWords: Object.fromEntries(Object.entries(pages).map(([route, p]) => [route, bodyMaxSentenceWords(p)])),
  nextDateHandshake: (() => {
    const first = firstDateHandle(pages['/dates']);
    const want = first === 'none' ? 'none' : new Date(`${first}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const phrase = (p) => {
      const m = /Next: (\w{3,10}), ([A-Z][a-z]{2}) (\d{1,2})/.exec(p.plain);
      return m ? `${m[2]} ${m[3]}` : 'none';
    };
    const handshake = (got, want) => {
      if (got === 'none') return 'none';
      if (got === want) return 'match';
      return 'mismatch';
    };
    return Object.fromEntries(Object.entries(pages).map(([route, p]) => {
      const got = phrase(p);
      return [route, `${handshake(got, want)} (${want} expected)`];
    }));
  })(),
  assets: Object.fromEntries(
    readdirSync(resolve(ROOT2, 'src/assets'), { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile()).map((d) => [`${d.name}`, 1]),
  ),
  figcaption: Object.fromEntries(Object.entries(pages).map(([route, p]) => [route, (p.raw.match(/<figcaption/gi) ?? []).length])),
  // what a seat here cannot settle, priced so the row prints a number rather than a memory (D426: the live edge
  // and this artifact are different facts, and the only instrument that compares them is `probe:live`, which
  // needs credentials and is outside `verify` for that reason).
  apexServed: { 'apex': 'CANNOT ANSWER (a seat here runs no deploy and reads no live zone; `npm run probe:live` is the instrument)' },
  apexClaims: { 'apex': 'CANNOT ANSWER (same: the apex page is not in this tree; `npm run probe:live` reads it)' },
};
const METRIC_TEXT = {
  joinLabels: metrics.joinLabels.join(' | '),
  outbound: Object.entries(metrics.outbound).map(([r, n]) => `${r}=${n}`).join(' '),
  bandRepeat: Object.entries(metrics.bandRepeat).map(([r, n]) => `${r}=${n}`).join(' '),
  controls: Object.entries(metrics.controls).flatMap(([route, roles]) => Object.entries(roles).map(([role, n]) => `${route}:${role}=${n}`)).join(' '),
  maxSentenceWords: Object.entries(metrics.maxSentenceWords).map(([r, n]) => `${r}=${n}`).join(' '),
  bodyMaxSentenceWords: Object.entries(metrics.bodyMaxSentenceWords).map(([r, n]) => `${r}=${n}`).join(' '),
  nextDateHandshake: Object.entries(metrics.nextDateHandshake).map(([r, v]) => `${r}=${v}`).join(' '),
  figcaption: Object.entries(metrics.figcaption).map(([r, n]) => `${r}=${n}`).join(' '),
  assets: Object.entries(metrics.assets).map(([name, n]) => `${name}=${n}`).join(' '),
  apexServed: Object.entries(metrics.apexServed).map(([k, v]) => `${k}=${v}`).join(' '),
  apexClaims: Object.entries(metrics.apexClaims).map(([k, v]) => `${k}=${v}`).join(' '),
};

// ---------------------------------------------------------------------------
// One matcher, shared by the table and by the selftest (D413: a row that cannot fail is not a row).
// ---------------------------------------------------------------------------
/** What a row reads, per kind. A chain of `?:` here would be a lookup with five arms and no name. */
const HAYSTACK_FOR = {
  href: (p) => p.anchors.map((a) => a.href).join(' '),
  heading: (p) => p.headings.map((h) => h.text).join('\n'),
  title: (p) => titleOf(p),
  prose: (p) => p.prose,
  zone: (p, zone) => p.sentences.filter((s) => zone.includes(s.zone)).map((s) => s.text).join(' '),
  plain: (p) => p.plain,
};
const need = (check) => new RegExp(check.re ? check.needle : esc(check.needle), 'gim');
const match = (check, page) => {
  const kind = check.kind ?? 'plain';
  const re = need(check);
  if (kind === 'model') return { where: check.owns, count: 0, evidence: [], verdict: 'NOT MEASURABLE' };
  let haystack, where, evidence = [];
  if (check.route === 'feed') { haystack = page?.raw ?? ''; where = 'dist/client/events.ics'; }
  else if (kind === 'source') {
    where = check.file;
    haystack = page?.sources?.[check.file] ?? SOURCE_FILE(check.file) ?? (() => { throw new Error(`row ${check.id} names a source file that is not there: ${check.file}`); })();
  } else if (kind === 'metric') {
    where = `metrics.${check.metric}`;
    haystack = page?.metrics?.[check.metric] ?? METRIC_TEXT[check.metric] ?? (() => { throw new Error(`row ${check.id} asks for a metric this instrument does not price: ${check.metric}`); })();
  } else {
    where = check.route;
    haystack =
      kind === 'href' ? HAYSTACK_FOR.href(page) :
      HAYSTACK_FOR[check.zone ? 'zone' : kind]?.(page, check.zone) ?? HAYSTACK_FOR.plain(page);
    if (kind === 'href') evidence = page.anchors.filter((a) => need(check).test(a.href)).slice(0, 3).map((a) => `${a.zone}: ${a.label} -> ${a.href}`);
    if (kind === 'heading') evidence = page.headings.filter((h) => need(check).test(h.text)).slice(0, 6).map((h) => `${h.tag}: ${h.text}`);
    if (kind === 'plain' && check.zone) evidence = page.sentences.filter((s) => check.zone.includes(s.zone) && re.test(s.text)).slice(0, 2).map((s) => `${s.zone}/${s.section}: ${s.text}`);
  }
  const count = (haystack.match(re) ?? []).length;
  const min = check.min ?? 1;
  const satisfied = check.want === 'absent' ? count === 0 : count >= min;
  return { where, count, evidence, verdict: check.declined ? 'DECLINED' : satisfied ? 'CLOSED' : 'OPEN' };
};

const rows = [];
for (const check of CHECKS) rows.push({ id: check.id, check, result: match(check, pages[check.route]) });
if (process.env.DEBUG_HAYSTACK) {
const dbg = CHECKS.find((c) => c.id === process.env.DEBUG_HAYSTACK);
  const hp = pages[dbg.route].plain ?? '';
  const at = hp.indexOf('membership');
  console.log(`HAYSTACK ${dbg.route}: len=${hp.length} at=${at} around=${JSON.stringify(hp.slice(Math.max(0, at - 30), at))}`);
}

// ---------------------------------------------------------------------------
// The selftest (D413: every row has a planted defect its selftest sees). Each row in PLANTS names the defect the
// row exists to catch; the selftest plants it in the in-memory page and demands the row say OPEN, then hands the
// row a clean control and demands CLOSED. A row whose planted defect it cannot see is a row that never fires —
// the class D413 caught in round 7, where a needle that matched only half of a shipped line read the defect as
// absent without ever matching it.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// The selftest (D413: every row has a planted defect its selftest sees). A row that cannot report OPEN is a row
// a future session will read as "closed" forever without anything having been fixed, which is the defect D413
// caught in round 7 - a needle that matched only half of a shipped line read the defect as absent without ever
// matching it. So every row that can fire gets a planting: the copy that carries the defect, which the row must
// call OPEN, and a clean control, which it must call CLOSED.
//
// Where the letter names the defect in words - a phrase it quotes - the plant and the control are derived from
// the row itself, so the plant cannot drift away from the needle without this run failing. Where the row is a
// count, a metric, or a string in a component that never reaches the built page, the plant has to say more than
// a phrase, so OVERRIDE carries it in that item's own words. A row with a pattern needle and no override is
// reported, not skipped: the instrument says which rows it cannot plant rather than quietly planting nothing.
// ---------------------------------------------------------------------------
const OVERRIDE = [
  { id: 'H1b', plant: 'Dates go up on Meetup.', clean: 'Most of the arguing happens in the chat between meetings.' },
  { id: 'H2b', plant: 'Three to seven people at a table, historically.', clean: 'Usually three to seven people at a table.' },
  { id: 'D1', plant: 'Saturdays at noon for a social, Wednesdays at 6 pm for a study session, with nothing to prepare; a study session is an evening working side by side.', clean: 'A social is an afternoon around a table, nothing to prepare. A study session is an evening working side by side.' },
  { id: 'D3', plant: 'headings: Social | Study session | Social | Study session | Social', clean: 'headings: Sat, Nov 21 \u2014 Social | Wed, Nov 25 \u2014 Study session | Sat, Dec 5 \u2014 Social | Wed, Dec 9 \u2014 Study session | Sat, Dec 12 \u2014 Social' },
  { id: 'D3b', plant: 'headings: Social | Study session | Social | Study session | Social', clean: 'headings: Sat, Nov 21 \u2014 Social | Wed, Nov 25 \u2014 Study session | Sat, Dec 5 \u2014 Social | Wed, Dec 9 \u2014 Study session | Sat, Dec 12 \u2014 Social' },
  { id: 'D5', plant: 'Add to a calendar: Google, Apple and Outlook can all follow that link, and it changes when the club changes a date.', clean: 'Add to a calendar' },
  { id: 'C1', plant: 'No summary written this week', clean: 'No summary this week. Our bot writes this section from recent channel activity, after the noise settles.' },
  { id: 'C1b', plant: 'No summary this week. The channel is the live thing. Our bot writes this section from recent channel activity, after the noise settles.', clean: 'No summary this week. Our bot writes this section from recent channel activity, after the noise settles.' },
  { id: 'C5', plant: 'Every thread on the list, each with what the club says it is, and the club\u2019s own drawing of one of them underneath.', clean: 'Nine threads the club is pulling on. Any can be dropped mid-sentence; none is a prerequisite for arriving.' },
  // rows whose haystack is a metric, not a sentence: the plant names the number the letter argues from,
  // the control names the number the letter asks for.
  { id: 'H6', metrics: { bodyMaxSentenceWords: '/=23 /dates=14 /join=22 /chat=26 /past=21' }, clean: { metrics: { bodyMaxSentenceWords: '/=19 /dates=14 /join=18 /chat=17 /past=19' } } },
  { id: 'D2', metrics: { bodyMaxSentenceWords: '/=23 /dates=21 /join=22 /chat=26 /past=21' }, clean: { metrics: { bodyMaxSentenceWords: '/=19 /dates=14 /join=18 /chat=17 /past=19' } } },
  { id: 'D6', metrics: { bandRepeat: '/=2 /dates=1 /join=3 /chat=1 /past=1' }, clean: { metrics: { bandRepeat: '/=0 /dates=0 /join=0 /chat=0 /past=0' } } },
  { id: 'D8', metrics: { outbound: '/=3 /dates=8 /join=4 /chat=1 /past=1' }, clean: { metrics: { outbound: '/=3 /dates=6 /join=4 /chat=1 /past=1' } } },
  { id: 'J9', metrics: { controls: '/:primary=2 /:secondary=3 /join:primary=2 /join:secondary=3' }, clean: { metrics: { controls: '/:primary=1 /:secondary=3 /join:primary=1 /join:secondary=3' } } },
  // rows whose haystack is a component or a config: the plant is the file without the shipped string,
  // the control is the file with it. A branch that is client-rendered is measured where it is declared.
  { id: 'H4b', sources: { 'src/content.json': '{ "turnout": { "value": "Usually three to seven people at a table." } }' }, clean: { sources: { 'src/content.json': '{ "pastLine": { "value": "", "asOf": "2026-11-18", "correction": "docs/reply-to-the-communication-review-round-8-2026-11-18.md" } }' } } },
  { id: 'D4', sources: { 'dist/client/dates/index.html': '<span class="rail"><span>Nov</span><span>21</span><span>Sat</span></span>' }, clean: { sources: { 'dist/client/dates/index.html': ('<span aria-hidden="true" data-leaf="nov"><span>Nov</span></span> ').repeat(5) } } },
  { id: 'D9', sources: { 'astro.config.mjs': 'export const astroConfig = { deploy: { settings: {} } };' }, clean: { sources: { 'astro.config.mjs': "'/schedule': { status: 301, destination: '/dates' }," } } },
  { id: 'C6', sources: { 'src/components/ThreadFigure.astro': '<figure><img ... /><span class="text-note">Drawn for this site in the plates\u2019 line language.</span></figure>' }, clean: { sources: { 'src/components/ThreadFigure.astro': '<figure><img ... /><figcaption>Drawn for this site in the plates\u2019 line language.</figcaption></figure>' } } },
  { id: 'C6b', sources: { 'src/pages/chat.astro': '<p class="text-lede">Drawn for this site in the plates\u2019 line language, not a scan of a book.</p>' }, clean: { sources: { 'src/pages/chat.astro': '<ThreadFigure />' } } },
  { id: 'C7', sources: { 'src/components/DiscordSummary.svelte': '<p class="text-body">Our bot writes this section from recent channel activity.</p>' }, clean: { sources: { 'src/components/DiscordSummary.svelte': '<p class="text-body">Nobody typed these lines. A summary service reads the last fortnight of the channel and writes them.</p>' } } },
];
const derived = (check) => {
  const benign = 'A short sentence that keeps the point.';
  const lit = check.needle;
  const heading = (t) => `headings: ${t}`;
  const isHeading = (check.kind ?? 'plain') === 'heading';
  const body = (t) => (isHeading ? heading(t) : t);
  return check.want === 'absent'
    ? { plant: body(lit), clean: body(benign) }
    : { plant: body(benign), clean: body(lit) };
};
const plan = (check) => {
  const over = OVERRIDE.find((o) => o.id === check.id);
  if (over) {
    const tag = check.kind === 'metric' ? 'metrics' : 'sources';
    return { plant: typeof over.plant === 'string' ? over.plant : tag, clean: typeof over.clean === 'string' ? over.clean : tag, plantExtra: over.metrics ? { metrics: over.metrics } : over.sources ? { sources: over.sources } : undefined, cleanExtra: over.clean?.metrics || over.clean?.sources ? { metrics: over.clean?.metrics, sources: over.clean?.sources } : undefined };
  }
  if (check.re) return null;
  return derived(check);
};
const synth = (text, extra) => ({
  plain: text, prose: text, raw: text,
  sentences: [{ text, zone: 'body', section: 'planted' }],
  headings: text.startsWith('headings: ') ? text.replace(/^headings: /, '').split(' | ').map((t) => ({ tag: 'h2', text: t })) : [],
  anchors: text.startsWith('bandRepeat:') || text.startsWith('metrics') ? [] : [],
  metrics: extra?.metrics, sources: extra?.sources,
});
if (SELFTEST) {
  let bad = 0;
  let tested = 0;
  for (const check of CHECKS) {
    if (check.declined) { console.log(`skip row ${check.id}: it carries a ruling, so its verdict is DECLINED by construction and no planting moves it - its evidence is the ruling, and the command inside it`); continue; }
    const p = plan(check);
    if (!p) { bad++; console.log(`FAIL row ${check.id}: its needle is a pattern and no override plants it, so nothing here proves the row can fire`); continue; }
    tested++;
    for (const [mode, text, extra] of [['planted', p.plant, p.plantExtra], ['clean', p.clean, p.cleanExtra]]) {
      const want = mode === 'planted' ? 'OPEN' : 'CLOSED';
      const got = match(check, synth(text, extra));
      const ok = got.verdict === want;
      if (!ok) {
        bad++;
        console.log(`FAIL row ${check.id} (${mode}): it saw ${got.verdict} where the letter's defect demands ${want} - the needle for ${check.id} does not name the defect it was written for`);
      } else console.log(`ok  row ${check.id} (${mode}) -> ${got.verdict}`);
    }
  }
  console.log(bad ? `\nselftest ${bad} FAILED of ${tested * 2} checks over ${tested} plantable rows (${CHECKS.filter((c) => c.declined).length} rows carry a ruling and cannot fire)` : `\nselftest ${tested * 2} of ${tested * 2} ok over ${tested} plantable rows: every row that can fire has a planted defect it sees; ${CHECKS.filter((c) => c.declined).length} rows carry a ruling instead`);
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------------------
// The table.
// ---------------------------------------------------------------------------
mkdirSync(dirname(resolve(OUT)), { recursive: true });
const iso = (ms) => (ms ? new Date(ms).toISOString() : 'never');
const record = {
  day: new Date().toISOString().slice(0, 10),
  metrics: { distState: { fresh: state.fresh, built: state.built.path, builtAt: iso(state.built.mtimeMs), input: state.input.path, inputAt: iso(state.input.mtimeMs) }, ...metrics },
  rows: rows.map((r) => ({ id: r.id, route: r.check.route, kind: r.check.kind ?? 'plain', want: r.check.want, needle: r.check.needle, where: r.result.where, hits: r.result.count, verdict: r.result.verdict, why: r.check.why, evidence: r.result.evidence, ...(r.check.declined ? { declined: r.check.declined } : {}) })),
};
writeFileSync(OUT, JSON.stringify(record, null, 2) + '\n');
if (process.argv.includes('--json')) { console.log(JSON.stringify(record, null, 2)); process.exit(0); }

// ---------------------------------------------------------------------------
// --reply <path>: the reply doc's row ids must EQUAL this run's row ids.
// Why (S071, D446): 'every line item appears exactly once' is the round's central
// claim, and a claim a reviewer can count with grep is the only kind that survives
// one. Round 7's reply asserted it over an inventory that had never been counted;
// this is that assertion turned into a command. The checker reads ONLY the reply's
// inventory section, because §4's claims ledger re-uses ids (C1..C8) for a different
// set of things, and an id that appears in both is not a dupe of the inventory — the
// reply has two contracts, and a checker that conflates them fails an honest doc.
// The second contract it checks is the one src/content.json depends on: every
// '<this file> §4 ledger C<n>' citation must land on a real row in §4, so a slot
// cannot carry a correction path into a ledger row that is not there.
// ---------------------------------------------------------------------------
const replyIdx = process.argv.indexOf('--reply');
if (replyIdx >= 0) {
  const path = process.argv[replyIdx + 1] ?? '';
  if (!path) { console.error('reply-check: `--reply` needs the reply doc\'s path'); process.exit(1); }
  let text;
  try { text = readFileSync(path, 'utf8'); } catch { console.error(`reply-check: cannot read ${path}`); process.exit(1); }

  const section = (headRe) => {
    const lines = text.split('\n');
    const start = lines.findIndex((l) => headRe.test(l));
    if (start < 0) return [];
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((l, i) => i > 0 && /^##\s/.test(l));
    return end < 0 ? rest : rest.slice(0, end);
  };
  // A row's id is its first cell, and only a bare id counts: prose cells are prose.
  const idsOf = (lines) => lines
    .filter((l) => /^\s*\|/.test(l) && !/^[\s|:-]+$/.test(l.trim()))
    .map((l) => l.replace(/^\s*\|/, '').split(/(?<!\\)\|/)[0].trim())
    .filter((c) => /^[A-Z]{1,2}[0-9]{1,2}b?$/.test(c));

  const invIds = idsOf(section(/^##\s+2\./));
  const ledgerIds = idsOf(section(/^##\s+4\./));
  const censusIds = rows.map((r) => r.id);

  const dupes = invIds.filter((x, i) => invIds.indexOf(x) !== i);
  const missing = censusIds.filter((x) => !invIds.includes(x));
  const extra = invIds.filter((x) => !censusIds.includes(x));

  let bad = 0;
  if (!invIds.length) { console.error('reply-check: the reply has no §2 inventory, so no row ids to compare'); bad++; }
  if (dupes.length) { console.error(`reply-check: DUPE row ids in the inventory: ${[...new Set(dupes)].join(' ')}`); bad++; }
  if (missing.length) { console.error(`reply-check: in the census, absent from the reply: ${missing.join(' ')}`); bad++; }
  if (extra.length) { console.error(`reply-check: in the reply, never a census row: ${extra.join(' ')}`); bad++; }

  const cites = [];
  try {
    const slot = readFileSync('src/content.json', 'utf8');
    for (const m of slot.matchAll(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' §4 ledger (C[0-9]+)', 'g'))) cites.push(m[1]);
  } catch { /* a tree with no slot file owes nothing to a ledger */ }
  const dangling = cites.filter((id) => !ledgerIds.includes(id));
  if (dangling.length) { console.error(`reply-check: src/content.json points at §4 ledger rows that are not there: ${[...new Set(dangling)].join(' ')}`); bad++; }

  console.log(`reply-check — census ${censusIds.length} rows vs ${invIds.length} inventory rows in ${path}`);
  console.log(`  census ids not in the reply: ${missing.length ? missing.join(' ') : 'none'}`);
  console.log(`  reply ids not in the census: ${extra.length ? extra.join(' ') : 'none'}`);
  console.log(`  dupes in the reply: ${dupes.length ? [...new Set(dupes)].join(' ') : 'none'}`);
  console.log(`  §4 claims ledger: ${ledgerIds.length} rows (${ledgerIds.join(' ')}), and ${cites.length} slot citation${cites.length === 1 ? '' : 's'} from src/content.json (${[...new Set(cites)].join(' ')}), dangling: ${dangling.length ? [...new Set(dangling)].join(' ') : 'none'}`);
  console.log(bad ? `reply-check: FAIL — ${bad} contract${bad === 1 ? '' : 's'} broken` : 'reply-check: PASS — the reply answers this run, exactly once each, and every slot correction path lands');
  process.exit(bad ? 1 : 0);
}

console.log(`# round-8 census — ${rows.length} line items of the round-8 copy letter, re-run against the artifact this tree builds`);
console.log(`dist ${state.fresh ? 'fresh' : 'STALE'} — newest build ${iso(state.built.mtimeMs)} (${state.built.path}) vs newest input ${iso(state.input.mtimeMs)} (${state.input.path})`);
for (const r of rows) {
  console.log(`${r.id}\t${r.result.verdict}\t${r.check.route}\t${r.check.kind ?? 'plain'}\t"${r.check.needle}" x${r.result.count}${r.check.min ? ` (min ${r.check.min})` : ''}`);
  for (const e of r.result.evidence) console.log(`\t\t  ${e}`);
}
const open = rows.filter((r) => r.result.verdict === 'OPEN');
const unmeasurable = rows.filter((r) => r.result.verdict === 'NOT MEASURABLE');
const declined = rows.filter((r) => r.result.verdict === 'DECLINED');
console.log(`\nOPEN ${open.length} of ${rows.length}; CLOSED ${rows.length - open.length - unmeasurable.length - declined.length}; DECLINED with evidence ${declined.length}; NOT MEASURABLE from this seat ${unmeasurable.length}`);
if (open.length) console.log(`\nopen, and the work each still owes: ${open.map((r) => `${r.id} ${r.check.route} "${r.check.needle}"`).join(' | ')}`);
if (declined.length) console.log(`\ndeclined, each with the ruling that holds it: ${declined.map((r) => `${r.id} ${r.check.needle}`).join(' | ')}`);
if (unmeasurable.length) console.log(`\nunmeasurable from this seat (live model output, or a fetch no seat runs): ${unmeasurable.map((r) => r.id).join(', ')}`);
console.log(`\n## the counts the letter argues with, priced off the same read`);
for (const k of Object.keys(metrics)) {
  if (k === 'distState') continue;
  console.log(`${k}: ${JSON.stringify(metrics[k])}`);
}
console.log(`\nceiling: \`node design/link-ceiling.mjs\` prints the absolute URLs each built page paints outside its own <footer>, the ceiling, and the page that defines it`);
console.log(`record ${OUT}`);
process.exit(0);
