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
// `probe` says how this probe can see it at all.
// ---------------------------------------------------------------------------
const CHECKS = [
  // ---- Home ----
  { id: 'H1', route: '/', want: 'absent', needle: '(D312)', why: 'an internal decision number printed in the hero figcaption' },
  { id: 'H2', route: '/', want: 'absent', needle: 'what a meeting costs', why: 'the cost refusal, third round' },
  { id: 'H3', route: '/', want: 'absent', needle: 'kind of room', why: 'the sentence conceding what a page cannot say about the room' },
  { id: 'H4', route: '/', want: 'absent', needle: 'last read', why: 'relative staleness painted as a selling point' },
  { id: 'H5', route: '/', want: 'absent', needle: 'list is not the room', why: 'an aphorism about data provenance in a deciding reader\'s way' },
  { id: 'H6', route: '/', want: 'absent', needle: 'drops no pin', why: 'a disclaimer about the site\'s own capability where a directions link belongs' },
  { id: 'H7', route: '/', want: 'absent', needle: 'Join Our Group', why: 'the Title Case CTA that points at a page that points at a page' },
  { id: 'H8', route: '/', want: 'present', needle: 'Saturdays at noon', why: 'the rhythm stated near the hero date' },
  { id: 'H9', route: '/', want: 'present', needle: 'buy a coffee', why: 'cost and membership in one line' },
  { id: 'H10', route: '/', want: 'present', needle: 'Three to seven', why: 'the one headcount a stranger wants, on the operator\'s word' },
  { id: 'H11', route: '/', want: 'absent', needle: 'six to twelve', why: 'the letter\'s invented turnout figure against the operator\'s 3-7' },
  { id: 'H12', route: '/', want: 'absent', needle: 'All 5 dates', why: 'a fourth name for one route (D386 keeps one word)' },
  { id: 'H13', route: '/', want: 'absent', needle: 'the schedule', why: 'a fifth name for the same route, and one that 404s' },
  { id: 'H14', route: '/', want: 'absent', needle: 'Formerly the Minneapolis Mathematics Book Club', why: 'the former name spliced into a sentence about agendas' },
  { id: 'H15', route: '/', want: 'present', needle: 'Nothing to bring', why: 'three rules for arriving, asserted not disclaimed' },
  // ---- /dates ----
  { id: 'D1', route: '/dates', want: 'absent', needle: 'dates run from', why: 'a stated range that contradicts the rows under it' },
  { id: 'D2', route: '/dates', want: 'absent', needle: 'address to give directions to', why: 'a sentence describing the page\'s own layout' },
  { id: 'D3', route: '/dates', want: 'absent', needle: 'days ago', why: 'a relative age that ages into an apology' },
  { id: 'D4', route: '/dates', want: 'present', kind: 'href', re: true, needle: 'events\.ics', why: 'the calendar action the page offers at all' },
  { id: 'D5', route: '/dates', want: 'present', kind: 'href', re: true, needle: 'google\\.com/maps|\\bmaps\\.', why: 'a directions link per row (the letter\'s ask; the site declines pins)' },
  { id: 'D6', route: '/dates', want: 'present', kind: 'href', re: true, needle: 'bing\\.com/maps|openstreetmap', why: 'same ask, the two other map hosts a directions link could name' },
  { id: 'D7', route: '/dates', want: 'present', needle: 'Study session', why: 'the format word defined where it is printed' },
  // ---- /join ----
  { id: 'J1', route: '/join', want: 'absent', needle: 'what a meeting costs', why: 'the cost refusal, second surface' },
  { id: 'J2', route: '/join', want: 'absent', needle: 'front desk', why: 'institutional absence stated as a feature' },
  { id: 'J3', route: '/join', want: 'absent', needle: 'single door', why: 'a paragraph explaining why the site cannot do what peers do' },
  { id: 'J4', route: '/join', want: 'absent', needle: 'or nothing yet', why: 'promises an empty state the rows never show' },
  { id: 'J5', route: '/join', want: 'present', needle: 'Join the club', why: 'the H1 the nav already uses' },
  { id: 'J6', route: '/join', want: 'absent', kind: 'heading', needle: 'Ways in', why: 'the heading the nav fix made mismatch worse (D390 moves the phrase into the lede)' },
  { id: 'J6b', route: '/join', want: 'present', kind: 'heading', needle: 'Join the club', why: 'the H1 the nav already uses' },
  { id: 'J7', route: '/join', want: 'present', needle: 'Your first one', why: 'the first-ten-minutes rules (D392 rewrites the paragraph, the heading may stay)' },
  { id: 'J8', route: '/join', want: 'absent', needle: 'mailto', why: 'the private door the letter asks for five times' },
  { id: 'J9', route: '/join', want: 'absent', needle: 'reads the messages we post there', why: 'the ask-us door that lands on bot output' },
  { id: 'J10', route: '/join', want: 'present', needle: 'nobody is teaching', why: 'the uneven bars named honestly' },
  // ---- /chat ----
  { id: 'C1', route: '/chat', want: 'absent', needle: 'Chat Topics Summary', why: 'a fourth label all saying summary' },
  { id: 'C2', route: '/chat', want: 'absent', needle: 'UTC', why: 'UTC stamped on a Central-time site' },
  { id: 'C3', route: '/chat', want: 'present', needle: 'Central', why: 'the summary stamped in the zone the club runs in' },
  { id: 'C4', route: '/chat', want: 'absent', needle: 'Channel summary', why: 'the summary window written M/D/Y' },
  { id: 'C5', route: '/chat', want: 'present', needle: 'The chat itself', why: 'the section the letter says restates the H1 - kept, so the row records where it sits' },
  { id: 'C6', route: '/chat', want: 'present', needle: 'Not a scan of a book', why: 'the provenance line the letter wants demoted to a caption' },
  { id: 'C7', route: '/chat', want: 'absent', needle: 'closed for the day', why: 'operational noise (a cafe closure) printed beside mathematics' },
  { id: 'C8', route: '/chat', want: 'absent', needle: 'Cancellation', why: 'the same noise, the cancellation form' },
  { id: 'C9', route: '/chat', want: 'present', needle: 'the live thing', why: 'one line of human framing above the bot voice' },
  // ---- the feed ----
  { id: 'F1', route: 'feed', want: 'absent', needle: 'MPLS Math Club', why: 'the dead brand in every subscriber\'s calendar' },
  { id: 'F2', route: 'feed', want: 'absent', needle: 'Common Denominator - Study Session', why: 'an organizer title with an internal codename, as the event\'s name' },
  { id: 'F3', route: 'feed', want: 'absent', needle: 'STATUS:CANCELLED', why: 'cancelled events published to a subscriber who cannot unsubscribe from a ghost' },
  { id: 'F4', route: 'feed', want: 'absent', needle: 'in Minneapolis', why: 'the wrong city in the body of a Saint Louis Park event' },
  { id: 'F5', route: 'feed', want: 'absent', needle: 'mobilizon', why: 'a sign-up destination the site never mentions' },
  { id: 'F6', route: 'feed', want: 'absent', needle: 'dates from Nov', why: 'the website meta-note with a hardcoded count, in every event body' },
  { id: 'F7', route: 'feed', want: 'present', needle: 'SUMMARY:Social', why: 'the feed naming the event the way the page does' },
  // ---- cross-cutting ----
  { id: 'X1', route: '/past', want: 'absent', needle: 'Nothing listed yet', why: 'an empty archive that is indexable' },
  { id: 'X2', route: '/dates', want: 'present', needle: 'Central', why: 'the zone word on every venue group (D397)' },
  { id: 'X3', route: '/join', want: 'present', kind: 'title', re: true, needle: 'Matheapolis.*Minneapolis|Minneapolis.*Matheapolis', why: 'the title carrying the page, the site and the city (D396)' },
  { id: 'X4', route: '/chat', want: 'present', kind: 'title', re: true, needle: 'Matheapolis.*Minneapolis|Minneapolis.*Matheapolis', why: 'same, on /chat' },
  { id: 'X5', route: '/dates', want: 'present', kind: 'title', re: true, needle: 'Matheapolis.*Minneapolis|Minneapolis.*Matheapolis', why: 'same, on /dates' },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const titleOf = (p) => {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(p.raw);
  return m ? decode(m[1].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim() : '(no title)';
};

const rows = [];
for (const check of CHECKS) {
  const kind = check.kind ?? 'plain';
  const re = new RegExp(check.re ? check.needle : esc(check.needle), 'gi');
  let haystack, where, evidence = [];
  if (check.route === 'feed') {
    haystack = feed;
    where = 'dist/client/events.ics';
    if (haystack.match(re)) evidence = (haystack.match(new RegExp(re.source, 'gi')) ?? []).slice(0, 3);
  } else {
    const p = pages[check.route];
    where = check.route;
    haystack =
      kind === 'href' ? p.anchors.map((a) => a.href).join(' '):
      kind === 'heading' ? p.headings.map((h) => h.text).join(' '):
      kind === 'title' ? titleOf(p):
      p.plain;
    if (kind === 'href') evidence = p.anchors.filter((a) => re.test(a.href)).slice(0, 3).map((a) => `${a.zone}: ${a.label} -> ${a.href}`);
    if (kind === 'heading') evidence = p.headings.filter((h) => re.test(h.text)).slice(0, 3).map((h) => `${h.tag}: ${h.text}`);
    if (kind === 'plain' && haystack.match(re)) evidence = p.sentences.filter((s) => re.test(s.text)).slice(0, 2).map((s) => `${s.zone}/${s.section}: ${s.text}`);
  }
  const count = (haystack.match(re) ?? []).length;
  const present = count > 0;
  const satisfied = check.want === 'absent' ? !present : present;
  rows.push({
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
  joinLabels: [...new Set(
    Object.values(pages).flatMap((p) => p.anchors.filter((a) => /^(join|sign up|come|attend)/i.test(a.label)).map((a) => a.label))
  )],
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
console.log(`\nOPEN ${open.length} of ${rows.length}; CLOSED ${rows.length - open.length}`);
console.log(`\n## the counts the letter argues with, priced off the same read`);
console.log(`page titles: ${JSON.stringify(metrics.titles)}`);
console.log(`absolute URLs painted outside each page's own <footer>: ${JSON.stringify(metrics.outboundOutsideFooter)} (the ceiling R1 ratified is 6)`);
console.log(`/events.ics anchors per page: ${JSON.stringify(metrics.icsLinks)}`);
console.log(`join-word labels the artifact paints: ${metrics.joinLabels.map((s) => JSON.stringify(s)).join(' | ')}`);
console.log(`feed: ${metrics.feedEvents} VEVENTs, ${metrics.feedCancelled} of them STATUS:CANCELLED`);
console.log(`feed SUMMARYs: ${metrics.feedSummary.join(' | ')}`);
console.log(`feed URLs: ${metrics.feedUrl.join(' | ')}`);
console.log(`record ${OUT}`);
