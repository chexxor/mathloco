#!/usr/bin/env node
// review-round-7-census.mjs — re-run the round-7 letter's own evidence against the artifact THIS tree ships.
//
//   node design/review-round-7-census.mjs            # the table, one row per line item in the letter
//   node design/review-round-7-census.mjs --json     # the machine record (design/review-round-7/report.json)
//   REVIEW_ROUND_7_OUT=design/review-round-7/report.json  # where the record lands
//
// An external reader (round 7) handed ~55 line items against the staging preview. Every one of them is a
// claim about a **string or a count in the built page**, so every one of them is checkable — and some of
// them were already fixed by the round that shipped between the read and this session. A verdict is only
// allowed to say one of two things:
//
//   OPEN    the artifact this tree builds still carries the defect the letter names
//   CLOSED  it does not, and the row prints the copy that stands in its place now
//
// Nothing here judges wording, colour or composition: this probe reads the artifact, not pixels, exactly
// like the letter does. `dist-fresh.mjs` gates the read first, because a verdict about a page the previous
// branch built is the class of defect D266/D426 keep naming (a branch switch left the gates measuring the
// old page).
//
// The record lands in design/review-round-7/report.json (tracked: the reply doc cites it, D282's rule —
// a number in prose names its instrument).
//
// NOT a gate: it prints and exits 0 like the other instruments whose verdict is a decision (link-ceiling,
// communication-census). What executes the letter is a session with a diff; what decides is the operator.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { onePage, pageFileFor, decode, localDay } from './dist-pages.mjs';
import { distState, staleLine } from './dist-fresh.mjs';

const ROOT = process.env.DIST || 'dist/client';
const OUT = process.env.OUT || 'design/review-round-7/report.json';

/** Refuse a stale dist — the same preflight every `--no-build` probe makes, in its own words (D266). */
const state = distState();
if (!state.fresh && !state.allowed) {
  console.log(staleLine(state));
  process.exit(1);
}

const pages = {};
for (const route of ['/', '/dates', '/join', '/chat', '/past', '/404']) {
  pages[route] = onePage(pageFileFor(route, ROOT), route);
}
/** Join-word labels across the built pages, hoisted above the rows so a row can read them (H12b, J11) and the
 *  footer of the table can still print them. */
const joinLabelSet = [...new Set(
  Object.values(pages).flatMap((p) => p.anchors.filter((a) => /^(join|sign up|come|attend)/i.test(a.label)).map((a) => a.label))
)];
/** The visible text with the tags folded away, and whitespace normalised — what a reader's eye gets. */
for (const p of Object.values(pages)) {
  p.plain = decode(p.text.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
}
const feed = readFileSync(resolve(ROOT, 'events.ics'), 'utf8');

// ---------------------------------------------------------------------------
// The letter's line items, one row each, in the letter's own order.
// `want` is what the letter asks the page to look like AFTER the fix:
//   absent  -> the copy it names should no longer be there
//   present -> the affordance it asks for should be there
// `probe` says how this probe can see it at all. A row may carry `declined: '<evidence>'` — the item is settled as a
// stance this tree keeps rather than a fix it owes, so its verdict is DECLINED whatever the hit count is: an OPEN row
// is a promise that work remains, and a declined item that stays OPEN is an instrument that asks for the same letter
// every round (D413's class, one step further: the row that cannot be shipped still has a verdict).
// A row may also carry `zone: [...]` — only for rows whose defect
// is a sentence in one part of the page, so a move between parts is a fix rather than a miss — and `metric`, which
// reads one of the counts the table prints instead of a string.
// ---------------------------------------------------------------------------
const CHECKS = [
  // ---- Home ----
  { id: 'H1', route: '/', want: 'absent', needle: '(D312)', why: 'an internal decision number printed in the hero figcaption' },
  { id: 'H2', route: '/', want: 'absent', needle: 'what a meeting costs', why: 'the cost refusal, third round' },
  { id: 'H3', route: '/', want: 'absent', needle: 'kind of room', why: 'the sentence conceding what a page cannot say about the room' },
  { id: 'H4', route: '/', want: 'absent', needle: 'last read', why: 'relative staleness painted as a selling point' },
  { id: 'H5', route: '/', want: 'absent', needle: 'list is not the room', why: 'an aphorism about data provenance in a deciding reader\'s way' },
  { id: 'H6', route: '/', want: 'absent', needle: 'drops no pin', why: 'a disclaimer about the site\'s own capability where a directions link belongs' },
  { id: 'H18', route: '/', want: 'present', kind: 'metric', metric: 'controls', re: true, needle: '/:primary=1', why: 'the letter\'s "One of the two hero CTAs — Two equal-weight controls and neither is an RSVP": home now declares exactly ONE control in the primary role, and it is the sign-up CTA (`data-control`, D140 \u2014 the role a pressable block publishes, not a class string the gate has to trust)' },
  { id: 'H7', route: '/', want: 'absent', needle: 'Join Our Group', why: 'the Title Case CTA that points at a page that points at a page' },
  { id: 'H8', route: '/', want: 'present', needle: 'Saturdays at noon', why: 'the rhythm stated near the hero date' },
  { id: 'H9', route: '/', want: 'present', needle: 'buy a coffee', why: 'cost and membership in one line' },
  { id: 'H10', route: '/', want: 'present', needle: 'Three to seven', why: 'the one headcount a stranger wants, on the operator\'s word' },
  { id: 'H11', route: '/', want: 'absent', needle: 'six to twelve', why: 'the letter\'s invented turnout figure against the operator\'s 3-7' },
  { id: 'H12', route: '/', want: 'absent', needle: 'All 5 dates', why: 'a fourth name for one route (D386 keeps one word); the count in the label goes with it, the word stays' },
  { id: 'H12b', route: '/', want: 'present', needle: 'All dates', why: 'what the label says instead: the nav chip\u2019s own word, and D309 keeps the remaining prose registers as INFO rather than defects' },
  { id: 'H16', route: '/', want: 'present', needle: 'Next meeting', why: 'the letter wants `## When we meet` to lead with a date; this tree states the date once, in the hero block above the band (D340), and D306 keeps the compact card date-free so the page never grows a second calendar' },
  { id: 'H17', route: '/', want: 'present', kind: 'heading', needle: 'How it works', why: 'the heading the letter wants spent on the first ten minutes rather than on venue count and data policy' },
  { id: 'H13', route: '/', want: 'absent', needle: 'the schedule', why: 'a fifth name for the same route, and one that 404s' },
  { id: 'H14', route: '/', want: 'absent', zone: ['body'], needle: 'Formerly the Minneapolis Mathematics Book Club', why: 'the former name spliced into a sentence about agendas (D430 moved it out of the body; a row that reads the whole page counts the new home as the defect still being there)' },
  { id: 'H14b', route: '/', want: 'present', zone: ['exit-band'], needle: 'Formerly the Minneapolis Mathematics Book Club', why: 'the other half of the letter\u2019s own remedy: "it belongs in the page title or a footer line" — the colophon is that footer line' },
  { id: 'H15', route: '/', want: 'present', re: true, needle: 'bring nothing|nothing to bring|prepare nothing', why: 'three rules for arriving, asserted not disclaimed — the letter\u2019s words pinned this row to one wording; the site ships D388\u2019s' },
  // ---- /dates ----
  { id: 'D1', route: '/dates', want: 'absent', needle: 'dates run from', why: 'a stated range that contradicts the rows under it' },
  { id: 'D8', route: '/dates', want: 'absent', needle: 'can all follow', declined: 'the pair the letter calls a duplicate is registered `status: deliberate` in design/copy-duplicates.json under D369 (round-5 read A5): the offer and its qualification print beside EACH place the file is offered — the standing row under the rows, and the exit band on every emitted page — so deleting either side leaves a route that hands the reader a feed link with no qualification, which is the defect A5 closed rather than one it found. `node scripts/check-content.mjs --print-baseline` prints that pair with its status today, and its note says the pair goes away only when one side is deleted or a ruling settles it' },
  { id: 'D2', route: '/dates', want: 'absent', needle: 'address to give directions to', why: 'a sentence describing the page\'s own layout' },
  { id: 'D9', route: '/dates', want: 'present', kind: 'metric', metric: 'bandRepeat', re: true, needle: '/dates=0', why: 'the footer platform row, and the letter\'s arithmetic behind it: it counts 8 absolute URLs outside the band because the standing row repeated the band\'s Meetup and Discord. D407\'s `splitPaths(paths, config.URLs)` deletes that repeat against `EXIT_BAND_PLATFORMS`, so 0 URL the band paints is painted a second time outside it on /dates' },
  { id: 'D3', route: '/dates', want: 'absent', needle: 'days ago', why: 'a relative age that ages into an apology' },
  { id: 'D10', route: '/dates', want: 'present', kind: 'source', file: 'dist/client/dates/index.html', re: true, needle: 'aria-hidden="true" data-leaf class="bg-tint rounded-control w-28', why: 'the letter\'s "Nov / 21 / Sat as three separate list elements": its own remedy — mark the block `aria-hidden` and let the full sentence carry it — is on the date rail of all five rows, and the rail keeps its `data-leaf` handle so `check:row-geometry` can still read the row. The row reads the built artifact, so this is the shipped bytes, not the source (X1\'s form)' },
  { id: 'D11', route: '/dates', want: 'present', kind: 'heading', re: true, needle: 'Social|Study session', why: 'the row headings, which the letter grades rather than asks: "Correct, and defined — but defined in the lede above, not in the row. Keep as-is; this is now good." The format words open each venue group (D397) and nothing in this round moved them' },
  { id: 'D4', route: '/dates', want: 'present', kind: 'href', re: true, needle: 'events\.ics', why: 'the calendar action the page offers at all' },
  { id: 'D5', route: '/dates', want: 'present', kind: 'href', re: true, needle: 'google\\.com/maps|\\bmaps\\.', declined: 'the page sits at 6 of 6 absolute outbound anchors outside <footer>, and 6 is the ceiling ratified in round 4 (D358) and held by check-rsvp-page; a per-row maps link is 5 more. Raising the ceiling is one-way, so this row records the stance, not owed work', why: 'a directions link per row (the letter\'s ask; the site declines pins)' },
  { id: 'D6', route: '/dates', want: 'present', kind: 'href', re: true, needle: 'bing\\.com/maps|openstreetmap', declined: 'same ask as D5, against the same measured ceiling', why: 'same ask, the two other map hosts a directions link could name' },
  { id: 'D7', route: '/dates', want: 'present', needle: 'Study session', why: 'the format word defined where it is printed' },
  // ---- /join ----
  { id: 'J1', route: '/join', want: 'absent', needle: 'what a meeting costs', why: 'the cost refusal, second surface' },
  { id: 'J2', route: '/join', want: 'absent', needle: 'front desk', why: 'institutional absence stated as a feature' },
  { id: 'J3', route: '/join', want: 'absent', needle: 'single door', why: 'a paragraph explaining why the site cannot do what peers do' },
  { id: 'J12', route: '/join', want: 'absent', zone: ['body'], needle: 'not sponsored or endorsed', why: 'the trademark disclaimer out of the body of the page a visitor has just decided to come to (peak-end, the same rule that retired the room sentence). It prints once, in the exit band — X6 is that half' },
  { id: 'J4', route: '/join', want: 'absent', needle: 'or nothing yet', why: 'promises an empty state the rows never show' },
  { id: 'J5', route: '/join', want: 'present', needle: 'Join the club', why: 'the H1 the nav already uses' },
  { id: 'J6', route: '/join', want: 'absent', kind: 'heading', needle: 'Ways in', why: 'the heading the nav fix made mismatch worse (D390 moves the phrase into the lede)' },
  { id: 'J6b', route: '/join', want: 'present', kind: 'heading', needle: 'Join the club', why: 'the H1 the nav already uses' },
  { id: 'J13', route: '/join', want: 'present', kind: 'heading', re: true, needle: 'What we do.*Come to a meeting.*Talk with us now.*Follow the club', why: 'the letter\'s section order: the club described FIRST, then the doors in ascending commitment — come to a meeting · talk with the club · follow the feed. The headings are read in document order, so a page that describes the club last fails this row whatever its words are' },
  { id: 'J7', route: '/join', want: 'present', needle: 'Your first one', why: 'the first-ten-minutes rules (D392 rewrites the paragraph, the heading may stay)' },
  { id: 'J8', route: '/join', want: 'absent', needle: 'mailto', why: 'the private door the letter asks for five times' },
  { id: 'J14', route: '/join', want: 'present', re: true, needle: 'Free\. No membership needed', why: 'the letter\'s "Cost, one line" on `/join` — the same ask as home (H9), measured on the page the letter found it missing on' },
  { id: 'J9', route: '/join', want: 'absent', needle: 'reads the messages we post there', why: 'the ask-us door that lands on bot output' },
  { id: 'J10', route: '/join', want: 'present', needle: 'nobody is teaching', why: 'the uneven bars named honestly' },
  { id: 'J11', route: '/join', want: 'absent', kind: 'metric', metric: 'joinLabels', needle: 'Join Our Group|Ways in|View Schedule', why: 'the letter\u2019s five join-variants against the two this tree ratified (D386 one word per route, D390 the H1)' },
  // ---- /chat ----
// The island's copy is not in the built HTML: `DiscordSummary.svelte` fetches `/api/discord-summary` in the
// browser, so the strings the letter quotes about the bot section live in the component, and Svelte ships the
// component's text in its own template function, not in the page. @measured 2026-11-18: `Last summary written`
// returns 0 hits in `dist/client/chat/index.html` and 2 in the component. A row that read the built page for
// those lines reported CLOSED for a string the page never had a chance to have, so those rows read the
// component instead - `kind: 'source'`, comments stripped, because a source note quoting the defect is not a
// page printing it (D431's rule, applied the other way). The pending branch is the exception: it IS server-
// rendered, so D409's warm state and C9's framing line are still readable in the artifact.
  { id: 'C1', route: '/chat', want: 'absent', kind: 'model', needle: 'Chat Topics Summary', owns: 'src/lib/claude.ts', why: 'a fourth label all saying summary - the model titles its own block, so the fix is the instruction that titles it (src/lib/claude.ts)' },
  { id: 'C2', route: '/chat', want: 'absent', kind: 'source', file: 'src/components/DiscordSummary.svelte', needle: 'UTC', why: 'UTC stamped on a Central-time site (the island is client-rendered: the built page never carries it)' },
  { id: 'C3', route: '/chat', want: 'present', kind: 'source', file: 'src/components/DiscordSummary.svelte', needle: 'Central', why: 'the summary stamped in the zone the club runs in' },
  { id: 'C4', route: '/chat', want: 'absent', kind: 'source', file: 'src/components/DiscordSummary.svelte', needle: 'Channel summary', why: 'the fourth nested label saying summary, and the window printed M/D/Y' },
  { id: 'C5', route: '/chat', want: 'present', needle: 'The chat itself', why: 'the section the letter says restates the H1 - kept, so the row records where it sits' },
  { id: 'C6', route: '/chat', want: 'present', needle: 'Not a scan of a book', why: 'the provenance line the letter wants demoted to a caption' },
  { id: 'C7', route: '/chat', want: 'absent', kind: 'model', needle: 'closed for the day', owns: 'src/lib/claude.ts', why: 'operational noise (a cafe closure) printed beside mathematics - the summary is live model output, so the row measures the instruction that forbids it' },
  { id: 'C8', route: '/chat', want: 'absent', kind: 'model', needle: 'Cancellation', owns: 'src/lib/claude.ts', why: 'the same noise, the cancellation form' },
  { id: 'C9', route: '/chat', want: 'present', needle: 'the live thing', why: 'one line of human framing above the bot voice' },
  { id: 'C10', route: '/chat', want: 'absent', kind: 'metric', metric: 'controls', re: true, needle: '/chat:primary=[1-9]', why: 'round 7\'s re-opened Hick\'s-law item — "Two of the three Discord invites — two identical buttons, no choice made by the reader, same destination", and its copy line "keep one Discord button, not two": the card\'s primary control is deleted (D437), so `/chat` declares ONE pressable control, the fold secondary D367 moved into the first screen. The survivor is that one, not this one, because deleting the fold control would return the page to D367\'s measured defect — the only way out 1,720px down at 1240 and y=2,075 at 390' },
  { id: 'C11', route: '/chat', want: 'present', needle: 'New since|Which three|new since', declined: 'nothing marks which three threads are new, and this tree keeps it that way on two rules and one refusal. (a) A marker has to know the cap, and D320\'s one-home rule keeps exactly one cap literal in the tree — `WhyJoinUs.astro`\'s `const VISIBLE = 6` — which `check-threads.mjs:33` reads by regex out of THAT file only, so a second cap in `chat.astro` is a rule with two homes and moving the cap breaks the gate. (b) A label that named what the home page had left out would be the site talking about itself, on the one page whose reader is deciding whether to join a channel — D387 and D414\'s class, and D411 already ruled that what this page adds over the teaser is the gloss and the drawing, not a count. (c) The letter\'s alternative — hand-edit before publish — is a standing maintenance promise of the class D346 refused. What ships is D411\'s answer: the list stays (its absence fails `check-threads`\'s `rest-link-missing`), every entry carries the club\'s own gloss, and the lead says so in words a reader can use' },
  // ---- the feed ----
  { id: 'F1', route: 'feed', want: 'absent', needle: 'MPLS Math Club', why: 'the dead brand in every subscriber\'s calendar' },
  { id: 'F2', route: 'feed', want: 'absent', needle: 'Common Denominator - Study Session', why: 'an organizer title with an internal codename, as the event\'s name' },
  { id: 'F3', route: 'feed', want: 'absent', needle: 'STATUS:CANCELLED', declined: 'the operator ruled 2026-11-06 that a row the feed dropped is published AS STATUS:CANCELLED with its SEQUENCE raised (D223), and D299 keeps a cancelled UID un-merged; RFC 5545 makes CANCELLED a legal status. The letter\'s fix list and the feed-p0 task both ask for the opposite; the ruling is the source, so the row carries the stance', why: 'cancelled events published to a subscriber who cannot unsubscribe from a ghost' },
  { id: 'F4', route: 'feed', want: 'absent', needle: 'in Minneapolis', why: 'the wrong city in the body of a Saint Louis Park event' },
  { id: 'F5', route: 'feed', want: 'absent', needle: 'URL:https://mobilizon', re: true, declined: '6 of 7 rows already carry the club\'s own Meetup URL (D398\'s resolver); the one that stays on the source platform is a retired row its date and hour has no open page for, and a Meetup URL this repo cannot look up is a URL this repo cannot claim. The 7 further hits are ATTACH image links to art no copy of which is in this tree (src/assets holds only photos/)', why: 'the sign-up destination a subscriber reaches: the source platform\'s page, not the club\'s' },
  { id: 'F5b', route: 'feed', want: 'absent', needle: 'ATTACH[^\r]*mobilizon', re: true, declined: 'the event art a subscriber\'s calendar shows is hosted by the source platform; this repo holds no copy (src/assets holds only photos/) and re-hosting a third party\'s poster is an errand with no source here, so it is declined rather than owed', why: 'the same host reached through the image attachment instead of the sign-up link' },
  { id: 'F6', route: 'feed', want: 'absent', needle: 'calendar file carries|[0-9]+ dates', re: true, why: 'the website meta-note with a hardcoded count, in every event body (D399 deletes the framing and the count and keeps the range fact generated; the needle that matched only "dates from Nov" read the shipped stance as absent without ever matching the defect, so this row now names the framing the letter asked to delete)' },
  { id: 'F7', route: 'feed', want: 'present', needle: 'SUMMARY:Social', why: 'the feed naming the event the way the page does' },
  // ---- cross-cutting ----
  { id: 'X1', route: '/past', want: 'present', kind: 'source', file: 'dist/client/past/index.html', needle: 'noindex', why: 'the letter\'s remedy was "remove the route or noindex it until three meetings have passed": D404 keeps the shelf and loses the door, D435 puts noindex on the page and the sitemap filter on one home both read' },
  { id: 'X1b', route: '/past', want: 'present', needle: 'Nothing listed yet', declined: 'D404 rules the empty shelf as a state, not an error, and D374 landed the route to answer "did a date already pass"; the letter\'s real demand was indexability, which X1 measures', why: 'the empty shelf the letter calls "worse than no archive"' },
  { id: 'X2', route: '/dates', want: 'present', needle: 'Central', why: 'the zone word on every venue group (D397)' },
  { id: 'X3', route: '/join', want: 'present', kind: 'title', re: true, needle: 'Matheapolis.*Minneapolis|Minneapolis.*Matheapolis', why: 'the title carrying the page, the site and the city (D396)' },
  { id: 'X4', route: '/chat', want: 'present', kind: 'title', re: true, needle: 'Matheapolis.*Minneapolis|Minneapolis.*Matheapolis', why: 'same, on /chat' },
  { id: 'X5', route: '/dates', want: 'present', kind: 'title', re: true, needle: 'Matheapolis.*Minneapolis|Minneapolis.*Matheapolis', why: 'same, on /dates' },
  { id: 'X6', route: '/', want: 'present', kind: 'plain', zone: ['exit-band'], needle: 'not sponsored or endorsed', why: 'the endorsement line: the letter found it in the body on /join and absent on home, and asked for one home — all six built pages now print it in the exit band and none in a body (D394)' },
  { id: 'X7', route: '/', want: 'present', kind: 'source', file: 'dist/client/_redirects', needle: '/schedule', why: 'the letter reads /schedule as a 404 for the third round; the built artifact ships a 301 for both /schedule and /schedule/, and the live edge answers 301 (D373\u2019s sweep, D408)' },
  { id: 'C12', route: '/chat', want: 'present', kind: 'source', file: 'src/components/DiscordSummary.svelte', re: true, needle: '<h2 class="text-label font-medium text-ink">#\{channel\.name\}', why: 'the heading ladder: the letter\'s remedy — "H1 -> #general (not a heading in the markup) -> H3 -> H4. Skipped level at the top. Make #general an H2" — landed inside the island, so the page now runs h1 (the page\'s name) -> h2 (the channel\'s own name) -> h3 (the window) -> h4 (a block), no skipped level. Client-rendered, so the row reads the component the way C2/C3/C4 do' },
  { id: 'X8', route: '/dates', want: 'present', kind: 'metric', metric: 'outbound', re: true, needle: '/dates=6', why: 'the cross-cutting "Absolute links outside <footer>: /dates is at 8 against a ratified ceiling of 6. The duplication is the cause, not the ceiling" — the duplication is what D407 deleted, and the page now sits AT the ceiling D358 ratified, 6 of 6, so the letter\'s 8 stays its own number (D382). If a row ever gains an anchor this row goes OPEN, which is the gate for the ceiling, not a note' },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The island's copy is client-rendered (see the `/chat` block above), so those rows read the component.
 *  Comments are stripped first, so a note that quotes the defect it fixed does not count as a page printing
 *  it - the same rule `check-schedule-window.mjs` pays over built text, pointed at source instead. */
const stripComments = (t) => t.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
  // Leading `//` lines and block-continuation lines, rather than every `//`: a URL in a string contains the
  // same two characters, and a strip that eats them is a strip that can eat real copy.
  .replace(/^[ 	]*(?:\/\/|\*)[^\n]*$/gm, ' ');
const SOURCE_FILE = (f) => {
  try { return stripComments(readFileSync(resolve(f), 'utf8')); } catch { return null; }
};
const titleOf = (p) => {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(p.raw);
  return m ? decode(m[1].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim() : '(no title)';
};

// ---------------------------------------------------------------------------
// Two structural counts the letter argues with instead of quoting: how many **pressable controls** a page
// declares, per role, and how many absolute URLs a page paints **twice** - once in its body and once in the
// exit band. Both are read off the same anchors the copy rows read, and both are hoisted above the rows so a
// `kind: 'metric'` row can be satisfied by a number rather than by a string (D434's `metric` rows, extended
// under the same rule by D437). `controls` counts the `data-control` roles D140 makes a pressable block
// publish, because a class string is not a role the gate can trust. `bandRepeat` counts D407's defect: a URL
// the band paints at the foot of a page, painted a second time above it.
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
const METRIC_TEXT = {
  joinLabels: joinLabelSet.join(' | '),
  outbound: Object.entries(pages).map(([route, p]) => `${route}=${outsideAbsolute(p).length}`).join(' '),
  bandRepeat: Object.entries(bandRepeatByRoute).map(([route, n]) => `${route}=${n}`).join(' '),
  controls: Object.entries(controlsByRoute).flatMap(([route, roles]) => Object.entries(roles).map(([role, n]) => `${route}:${role}=${n}`)).join(' '),
};

const rows = [];
for (const check of CHECKS) {
  const kind = check.kind ?? 'plain';
  if (kind === 'model') {
    // The summary is model output fetched at runtime: no seat here can re-read the text a subscriber's
    // browser will get, so the row's evidence is the instruction that owns the shape and the row says so.
    const src = SOURCE_FILE(check.owns) ?? '';
    rows.push({
      id: check.id,
      route: check.route,
      kind,
      want: check.want,
      needle: check.needle,
      where: check.owns,
      hits: (src.match(new RegExp(esc(check.needle), 'gi')) ?? []).length,
      verdict: 'NOT MEASURABLE',
      why: check.why,
      evidence: src.split('\n').filter((l) => new RegExp(esc(check.needle), 'i').test(l) || /Skip notices|Name the heading/.test(l)).slice(0, 2).map((l) => `${check.owns}: ${l.trim()}`),
    });
    continue;
  }
  const re = new RegExp(check.re ? check.needle : esc(check.needle), 'gi');
  let haystack, where, evidence = [];
  if (check.route === 'feed') {
    haystack = feed;
    where = 'dist/client/events.ics';
    if (haystack.match(re)) evidence = (haystack.match(new RegExp(re.source, 'gi')) ?? []).slice(0, 3);
  } else if (kind === 'source') {
    where = check.file;
    haystack = SOURCE_FILE(check.file) ?? '';
    if (!haystack) throw new Error(`census row ${check.id} names a source file that is not there: ${check.file}`);
    if (haystack.match(re)) evidence = haystack.split('\n').filter((l) => re.test(l)).slice(0, 2).map((l) => `${check.file}: ${l.trim()}`.slice(0, 300));
  } else if (kind === 'metric') {
    where = `metrics.${check.metric}`;
    haystack = METRIC_TEXT[check.metric] ?? '';
    if (!haystack) throw new Error(`census row ${check.id} asks for a metric this instrument does not price: ${check.metric}`);
    if (haystack && haystack.match(re)) evidence = check.metric === 'joinLabels'
      ? joinLabelSet.filter((l) => re.test(l)).slice(0, 3).map((l) => `join label: ${l}`)
      : haystack.split(' ').filter((t) => re.test(t)).slice(0, 4).map((t) => `${check.metric}: ${t}`);
  } else {
    const p = pages[check.route];
    where = check.route;
    // A row may scope itself to a zone of the page (`zone: ['body']`, `['exit-band']`): D430 moved a sentence from
    // one zone to another, and a row that reads the whole page counts the new home as the defect still being there.
    const sentences = check.zone ? p.sentences.filter((s) => check.zone.includes(s.zone)) : p.sentences;
    const zonePlain = sentences.map((s) => s.text).join(' ');
    haystack =
      kind === 'href' ? p.anchors.map((a) => a.href).join(' '):
      kind === 'heading' ? p.headings.map((h) => h.text).join(' '):
      kind === 'title' ? titleOf(p):
      check.zone ? zonePlain : p.plain;
    if (kind === 'href') evidence = p.anchors.filter((a) => re.test(a.href)).slice(0, 3).map((a) => `${a.zone}: ${a.label} -> ${a.href}`);
    if (kind === 'heading') evidence = p.headings.filter((h) => re.test(h.text)).slice(0, 3).map((h) => `${h.tag}: ${h.text}`);
    if (kind === 'plain' && haystack.match(re)) evidence = sentences.filter((s) => re.test(s.text)).slice(0, 2).map((s) => `${s.zone}/${s.section}: ${s.text}`);
  }
  const count = (haystack.match(re) ?? []).length;
  const present = count > 0;
  const satisfied = check.want === 'absent' ? !present : present;  rows.push({
    id: check.id,
    route: check.route,
    kind,
    want: check.want,
    needle: check.needle,
    where,
    hits: count,
    verdict: satisfied ? 'CLOSED' : 'OPEN',
    why: check.why,
    evidence,
    ...(check.declined ? { declined: check.declined, verdict: 'DECLINED' } : {}),
  });
}


// Counts the letter makes about structure rather than copy, priced rather than remembered.
// ---------------------------------------------------------------------------
// What the letter argues with numbers rather than strings: the join-word label set, the outbound ceiling,
// the calendar actions per page, and the page titles. Counted off the same anchors the copy checks read.
// ---------------------------------------------------------------------------
const metrics = {
  dayStamp: localDay(),
  distState: {
    fresh: state.fresh,
    built: state.built.path,
    builtAt: state.built.mtimeMs,
    input: state.input.path,
    inputAt: state.input.mtimeMs,
  },
  feedEvents: (feed.match(/^BEGIN:VEVENT/gm) ?? []).length,
  feedCancelled: (feed.match(/STATUS:CANCELLED/g) ?? []).length,
  feedSummary: [...new Set((feed.match(/^SUMMARY:.*$/gm) ?? []))],
  feedUrl: [...new Set((feed.match(/^URL:.*$/gm) ?? []))],
  // the ceiling claim the letter re-argues: absolute URLs a page paints outside its own <footer>
  outboundOutsideFooter: Object.fromEntries(
    Object.entries(pages).map(([route, p]) => [
      route,
      p.anchors.filter((a) => /^https?:/i.test(a.href) && a.zone !== 'exit-band').length,
    ])
  ),
  // join-word labels across the built pages: how many variants of "join" the site really paints
  joinLabels: joinLabelSet,
  // the two structural counts a `kind: 'metric'` row reads (D437): controls per declared role per page,
  // and absolute URLs a page paints in its body AND in its exit band (D407's dedup deletes such repeats)
  controls: controlsByRoute,
  bandRepeat: bandRepeatByRoute,
  // how many calendar actions /dates offers, and where
  icsLinks: Object.fromEntries(
    Object.entries(pages).map(([route, p]) => [
      route,
      p.anchors.filter((a) => /events\.ics/.test(a.href)).length,
    ])
  ),
  titles: Object.fromEntries(
    Object.entries(pages).map(([route, p]) => [route, titleOf(p)])
  ),
};

mkdirSync(dirname(resolve(OUT)), { recursive: true });
const record = { day: metrics.dayStamp, metrics, rows };
writeFileSync(OUT, JSON.stringify(record, null, 2) + '\n');
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(record, null, 2));
  process.exit(0);
}

const iso = (ms) => (ms ? new Date(ms).toISOString() : 'never');
console.log(`# round-7 census — ${rows.length} line items re-run against the artifact this tree builds`);
console.log(`dist ${metrics.distState.fresh ? 'fresh' : 'STALE'} — newest build ${iso(metrics.distState.builtAt)} (${metrics.distState.built}) vs newest input ${iso(metrics.distState.inputAt)} (${metrics.distState.input})`);
for (const r of rows) {
  console.log(`${r.id}\t${r.verdict}\t${r.route}\t${r.kind}\t"${r.needle}" x${r.hits}`);
  for (const e of r.evidence) console.log(`\t\t  ${e}`);
}
const open = rows.filter((r) => r.verdict === 'OPEN');
const unmeasurable = rows.filter((r) => r.verdict === 'NOT MEASURABLE');
const declined = rows.filter((r) => r.verdict === 'DECLINED');
console.log(`\nOPEN ${open.length} of ${rows.length}; CLOSED ${rows.length - open.length - unmeasurable.length - declined.length}; DECLINED with evidence ${declined.length}; NOT MEASURABLE from this seat ${unmeasurable.length}`);
if (declined.length) console.log(`\ndeclined, each with the ruling that holds it: ${declined.map((r) => `${r.id} ${r.needle}`).join(' | ')}`);
if (unmeasurable.length) console.log(`\nunmeasurable from this seat (live model output, or a fetch no seat runs): ${unmeasurable.map((r) => r.id).join(', ')}`);
console.log(`\n## the counts the letter argues with, priced off the same read`);
console.log(`page titles: ${JSON.stringify(metrics.titles)}`);
console.log(`absolute URLs painted outside each page's own <footer>: ${JSON.stringify(metrics.outboundOutsideFooter)} (the ceiling R1 ratified is 6)`);
console.log(`/events.ics anchors per page: ${JSON.stringify(metrics.icsLinks)}`);
console.log(`pressable controls per page, per declared role: ${JSON.stringify(metrics.controls)}`);
console.log(`absolute URLs a page paints in its body AND in its exit band: ${JSON.stringify(metrics.bandRepeat)} (D407's dedup is the rule that deletes such a repeat)`);
console.log(`join-word labels the artifact paints: ${metrics.joinLabels.map((s) => JSON.stringify(s)).join(' | ')}`);
console.log(`feed: ${metrics.feedEvents} VEVENTs, ${metrics.feedCancelled} of them STATUS:CANCELLED`);
console.log(`feed SUMMARYs: ${metrics.feedSummary.join(' | ')}`);
console.log(`feed URLs: ${metrics.feedUrl.join(' | ')}`);
console.log(`record ${OUT}`);
