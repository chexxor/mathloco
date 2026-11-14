#!/usr/bin/env node
/**
 * harvest:selftest — the harvester's rules, proven offline.
 *
 *   npm run harvest:selftest
 *
 * `scripts/events-harvest.mjs` has four rules that a reader cannot see firing in a diff: it refuses to
 * un-cancel a published cancellation (rule 4, D299), it reuses a venue split only when the raw string is
 * byte-identical (rule 2, D92), it treats a TZID on both ends as the source declaring the hour (rule 1,
 * D298), and it never deletes a row that dropped out of the feed (rule 3, D72). A rule nobody plants is a
 * rule nobody knows works — the same reasoning as every `check:*:selftest` in this repo (D290).
 *
 * No network: every case writes a fixture snapshot and a fixture feed into `.design/tmp-harvest-selftest/`
 * (gitignored) and runs the real harvester on them with `--from`. Nothing here touches `data/events.json`,
 * so a green run says nothing about the live feed and a red run names the rule that broke.
 *
 * OS: Linux native, Node 24.22.1 @measured 2026-11-13. Cost of the whole set: 1.2s @measured 2026-11-13
 * by this script's own exit (15 cases, each one a `node` spawn of the real harvester).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const argOne = (f, d) => {
  const i = argv.indexOf(f);
  return i < 0 ? d : argv[i + 1];
};

const HARVESTER = resolve(argOne('--harvester', 'scripts/events-harvest.mjs'));
const SCRATCH = resolve('.design', 'tmp-harvest-selftest');
mkdirSync(SCRATCH, { recursive: true });

const FEED_URL = 'https://mobilizon.example/group/mpls-math-club/calendar.ics';
const STAMP = '2026-11-13T00:00:00Z';
const ANGEL = 'Angel Food Bakery, 8100 Minnetonka Boulevard, Saint Louis Park, Minnesota';
const KOWALSKI = "Kowalski's Market, 3517 Grand Avenue, Minneapolis";
const PAVILION = 'Lake Street Pavilion, 1200 Lake Street, Minneapolis';

/** A row as the snapshot holds it. `split` is the human-authored name/street/city the harvest can only copy. */
const row = (uid, slug, summary, start, end, status, rawVenue, { split = null, sequence = 0, timeConfirmed = true } = {}) => ({
  uid,
  slug,
  summary,
  start,
  end,
  timeConfirmed,
  venue: split ? { name: split[0], street: split[1], city: split[2], raw: rawVenue } : { raw: rawVenue },
  geo: null,
  blurb: '',
  url: null,
  image: null,
  sequence,
  status,
  source: { feed: FEED_URL, uid, fetchedAt: STAMP, dtstamp: null, rawStart: null, rawEnd: null },
});

const snapshot = () => ({
  source: { url: FEED_URL, software: 'Mobilizon 5.2.4', fetchedAt: STAMP },
  events: [
    row('live-21', '2026-11-21-mpls-math-club-social', 'MPLS Math Club Social', '2026-11-21T12:00', '2026-11-21T13:00', 'CONFIRMED', ANGEL, { split: ['Angel Food Bakery', '8100 Minnetonka Boulevard', 'Saint Louis Park'], sequence: 1 }),
    row('cancelled-14', '2026-11-14-math-circle-cancelled', 'Math Circle', '2026-11-14T18:00', '2026-11-14T20:00', 'CANCELLED', KOWALSKI, { sequence: 3 }),
    row('past-07', '2026-11-07-club-social', 'Club Social', '2026-11-07T12:00', '2026-11-07T14:00', 'CONFIRMED', ANGEL, { split: ['Angel Food Bakery', '8100 Minnetonka Boulevard', 'Saint Louis Park'] }),
    // A row an older harvest created before anyone split its venue: the split-lookup branch exists for it.
    row('past-01', '2026-11-01-study-night', 'Study Night', '2026-11-01T18:00', '2026-11-01T20:00', 'CONFIRMED', ANGEL, { timeConfirmed: false }),
  ],
});

/** A feed line set. `when()` writes the three shapes the real instance produces. */
const when = (prop, value, tzid) =>
  tzid ? `${prop};TZID=America/Chicago:${value.replace(/[-:]/g, '')}` : `${prop}:${value.replace(/[-:]/g, '')}`;

const vevent = (uid, summary, start, end, venue, status, extra = []) => [
  'BEGIN:VEVENT',
  `UID:${uid}`,
  `SUMMARY:${summary}`,
  when('DTSTART', start[0], start[1]),
  when('DTEND', end[0], end[1]),
  `LOCATION:${venue}`,
  `STATUS:${status}`,
  ...extra,
  'END:VEVENT',
];

const feed = (events) => `${['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mobilizon//Mobilizon 5.2.4//EN', ...events.flat(), 'END:VCALENDAR'].join('\r\n')}
\n`;

const CHICAGO = 'America/Chicago';

/** The feed that matches the snapshot row for row, in the shape the live instance writes today. */
const matchingFeed = () => [
  vevent('live-21', 'MPLS Math Club Social', ['20261121T120000', CHICAGO], ['20261121T130000', CHICAGO], ANGEL, 'CONFIRMED'),
  vevent('cancelled-14', 'Math Circle', ['20261114T180000', CHICAGO], ['20261114T200000', CHICAGO], KOWALSKI, 'CANCELLED'),
  vevent('past-07', 'Club Social', ['20261107T120000', CHICAGO], ['20261107T140000', CHICAGO], ANGEL, 'CONFIRMED'),
  vevent('past-01', 'Study Night', ['20261101T180000', CHICAGO], ['20261101T200000', CHICAGO], ANGEL, 'CONFIRMED'),
];

const run = (events, args = []) => {
  const snapPath = resolve(SCRATCH, 'snapshot.json');
  const feedPath = resolve(SCRATCH, 'feed.ics');
  writeFileSync(snapPath, `${JSON.stringify(snapshot(), null, 2)}\n`);
  writeFileSync(feedPath, feed(events));
  const r = spawnSync(process.execPath, [HARVESTER, '--from', feedPath, '--out', snapPath, '--write', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`harvester exited ${r.status}: ${r.stderr || r.stdout}`);
  let snap;
  try {
    snap = JSON.parse(readFileSync(snapPath, 'utf8'));
  } catch (err) {
    throw new Error(`the harvester wrote an unreadable snapshot to ${snapPath}: ${err.message}`);
  }
  return { out: r.stdout, snap };
};

const find = (snap, uid) => snap.events.find((e) => e.uid === uid);
const BASE_SEQUENCE = { 'live-21': 1, 'cancelled-14': 3, 'past-07': 0, 'past-01': 0 };
const count = (snap) => snap.events.length;
const lines = (out) => out.split('\n');
const has = (out, s) => out.includes(s);

/** Each case returns the list of ways it FAILED. Empty means the rule held. */
const cases = [
  {
    name: 're-announced-cancelled-uid-is-not-merged',
    events: [
      vevent('live-21', 'MPLS Math Club Social', ['20261121T120000', CHICAGO], ['20261121T130000', CHICAGO], ANGEL, 'CONFIRMED'),
      vevent('cancelled-14', 'Math Circle', ['20261201T180000', CHICAGO], ['20261201T200000', CHICAGO], KOWALSKI, 'CONFIRMED'),
    ],
    check: (o) => {
      const r = find(o.snap, 'cancelled-14');
      return [
        has(o.out, 'COLLISION  cancelled-14') ? null : 'no COLLISION line: the guard did not fire on a UID it published as CANCELLED',
        r.status === 'CANCELLED' ? null : `the cancelled row was silently un-cancelled (status ${r.status})`,
        r.start === '2026-11-14T18:00' ? null : `the cancelled row's date was rewritten to ${r.start}`,
        r.sequence === 3 ? null : `the collision burned a SEQUENCE (${r.sequence}) on a row nobody may touch`,
        count(o.snap) === 4 ? null : `the merge changed the row count to ${count(o.snap)}`,
      ].filter(Boolean);
    },
  },
  {
    name: 'the-guard-stays-silent-when-the-feed-cancels-again',
    events: [vevent('cancelled-14', 'Math Circle', ['20261115T180000', CHICAGO], ['20261115T200000', CHICAGO], KOWALSKI, 'CANCELLED')],
    check: (o) => {
      const r = find(o.snap, 'cancelled-14');
      return [
        has(o.out, 'COLLISION  cancelled-14') ? 'a genuine re-cancellation was read as a collision' : null,
        r.start === '2026-11-15T18:00' ? null : `the re-cancellation did not move the date (still ${r.start})`,
        r.sequence === 4 ? null : `a mechanical change did not bump SEQUENCE (${r.sequence})`,
      ].filter(Boolean);
    },
  },
  {
    name: 'a-live-row-can-be-cancelled-by-the-feed',
    events: [vevent('live-21', 'MPLS Math Club Social', ['20261121T120000', CHICAGO], ['20261121T130000', CHICAGO], ANGEL, 'CANCELLED')],
    check: (o) => {
      const r = find(o.snap, 'live-21');
      return [
        has(o.out, 'COLLISION') ? 'the guard fired on a row that was never cancelled' : null,
        r.status === 'CANCELLED' ? null : `status stayed ${r.status} (D72: a cancelled meeting must be published cancelled)`,
        r.sequence === 2 ? null : `status change did not bump SEQUENCE (${r.sequence})`,
      ].filter(Boolean);
    },
  },
  {
    name: 'venue-split-copied-from-a-byte-identical-raw',
    events: [vevent('new-25', 'Common Denominator - Study Session', ['20261125T180000', CHICAGO], ['20261125T200000', CHICAGO], ANGEL, 'CONFIRMED')],
    check: (o) => {
      const r = find(o.snap, 'new-25');
      return [
        r?.venue?.name === 'Angel Food Bakery' ? null : 'the new row got no venue split although a byte-identical one exists',
        r?.venue?.street === '8100 Minnetonka Boulevard' ? null : 'street not copied',
        r?.venue?.city === 'Saint Louis Park' ? null : 'city not copied',
        typeof r?.venue?._split === 'string' ? null : 'the copied split carries no provenance note (D92: a reader must know the harvest copied it)',
      ].filter(Boolean);
    },
  },
  {
    name: 'a-different-venue-gets-no-invented-split',
    events: [vevent('new-26', 'Study Night', ['20261202T180000', CHICAGO], ['20261202T200000', CHICAGO], PAVILION, 'CONFIRMED')],
    check: (o) => {
      const r = find(o.snap, 'new-26');
      return [
        r?.venue?.raw === PAVILION ? null : `raw venue mangled: ${JSON.stringify(r?.venue?.raw)}`,
        r?.venue?.name === undefined ? null : `the harvest invented a venue name for a venue nobody split (${r.venue.name})`,
      ].filter(Boolean);
    },
  },
  {
    name: 'a-row-created-before-the-split-gets-it-back',
    events: [vevent('past-01', 'Study Night', ['20261101T180000', CHICAGO], ['20261101T200000', CHICAGO], ANGEL, 'CONFIRMED')],
    check: (o) => {
      const r = find(o.snap, 'past-01');
      return [
        r?.venue?.name === 'Angel Food Bakery' ? null : 'the backfill did not give an existing split-less row the split its raw string already matches',
        r?.sequence === 0 ? null : `backfilling a split burned a SEQUENCE (${r.sequence}) on a row whose content did not change`,
      ].filter(Boolean);
    },
  },
  {
    name: 'TZID-on-both-ends-confirms-the-hour',
    events: [vevent('new-27', 'Matheapolis Social', ['20261205T190000', CHICAGO], ['20261205T210000', CHICAGO], ANGEL, 'CONFIRMED')],
    check: (o) => (find(o.snap, 'new-27')?.timeConfirmed === true ? [] : ['D298: a row whose source zones both ends was stored unconfirmed']),
  },
  {
    name: 'the-confirm-rule-can-be-switched-off',
    events: [vevent('new-27', 'Matheapolis Social', ['20261205T190000', CHICAGO], ['20261205T210000', CHICAGO], ANGEL, 'CONFIRMED')],
    args: ['--no-confirm-hours'],
    check: (o) => (find(o.snap, 'new-27')?.timeConfirmed === false ? [] : ['--no-confirm-hours did not keep the old behaviour']),
  },
  {
    name: 'a-bare-Z-instant-is-still-quarantined',
    events: [vevent('new-28', 'Workshop', ['20261202T180000Z', null], ['20261202T200000Z', null], PAVILION, 'CONFIRMED')],
    check: (o) => {
      const r = find(o.snap, 'new-28');
      return [
        r?.timeConfirmed === false ? null : 'D169: a Z with no TZID was believed as a local hour',
        r?.source?.rawStart === '20261202T180000Z' ? null : `the verbatim upstream value is not kept (got ${r?.source?.rawStart})`,
        r?.start === '2026-12-02T18:00' ? null : `wall clock mangled to ${r?.start}`,
        has(o.out, 'D169') ? null : 'the run did not name the zone defect it saw',
      ].filter(Boolean);
    },
  },
  {
    name: 'a-DATE-row-has-no-hour-to-confirm',
    events: [vevent('new-29', 'Retreat', ['20261212', null], ['20261213', null], PAVILION, 'CONFIRMED')],
    check: (o) => {
      const r = find(o.snap, 'new-29');
      return [
        r?.timeConfirmed === false ? null : 'a DATE-only row was published as a confirmed hour',
        r?.start === '2026-12-12' && r?.end === '2026-12-13' ? null : `date span mangled to ${r?.start} / ${r?.end}`,
      ].filter(Boolean);
    },
  },
  {
    name: 'a-mechanical-change-burns-a-sequence',
    events: [vevent('live-21', 'MPLS Math Club Social (moved)', ['20261121T120000', CHICAGO], ['20261121T130000', CHICAGO], ANGEL, 'CONFIRMED')],
    check: (o) => {
      const r = find(o.snap, 'live-21');
      return [
        r?.summary === 'MPLS Math Club Social (moved)' ? null : 'summary not updated',
        r?.sequence === 2 ? null : `SEQUENCE stayed ${r?.sequence} (RFC 5545 6267-6272: UID+SEQUENCE is how a subscriber learns its copy is stale)`,
        has(o.out, 're-confirm the wall clock') ? null : 'a moved field did not trigger the re-confirm note',
      ].filter(Boolean);
    },
  },
  {
    name: 'a-row-that-dropped-out-of-the-feed-is-not-deleted',
    events: [vevent('live-21', 'MPLS Math Club Social', ['20261121T120000', CHICAGO], ['20261121T130000', CHICAGO], ANGEL, 'CONFIRMED')],
    check: (o) => [
      count(o.snap) === 4 ? null : `the harvest deleted rows it could not see: ${count(o.snap)} left (D72)`,
      has(o.out, 'past-07') ? null : 'the vanished row was not reported by name',
      has(o.out, 'D72') ? null : 'the note does not say why the row is kept',
    ].filter(Boolean),
  },
  {
    name: 'a-VEVENT-with-no-UID-is-skipped',
    events: ['BEGIN:VEVENT', 'SUMMARY:Orphan', 'DTSTART;TZID=America/Chicago:20261212T120000', `LOCATION:${ANGEL}`, 'END:VEVENT'],
    check: (o) => [
      count(o.snap) === 4 ? null : 'an event with no UID was merged — nobody can cancel a row with no UID',
      has(o.out, 'no UID') ? null : 'the skip was not reported',
    ].filter(Boolean),
  },
  {
    name: 'a-folded-LOCATION-line-is-reassembled-before-comparing',
    events: [
      'BEGIN:VEVENT',
      'UID:new-30',
      'SUMMARY:Study Session',
      'DTSTART;TZID=America/Chicago:20261128T180000',
      'DTEND;TZID=America/Chicago:20261128T200000',
      'LOCATION:Angel Food Bakery, 8100 Minnetonka Boulevard, ',
      ' Saint Louis Park, Minnesota',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ],
    check: (o) => {
      const r = find(o.snap, 'new-30');
      return [
        r?.venue?.raw === ANGEL ? null : `folded LOCATION became ${JSON.stringify(r?.venue?.raw)} — a folded line is one line (RFC 5545 3.3.10)`,
        r?.venue?.name === 'Angel Food Bakery' ? null : 'the fold broke the split lookup, so the venue line would print nothing',
      ].filter(Boolean);
    },
  },
  {
    name: 'clean-control: a feed that matches the snapshot changes nothing',
    events: matchingFeed(),
    check: (o) => {
      const changed = lines(o.out).filter((l) => l.startsWith('~ '));
      return [
        count(o.snap) === 4 ? null : `row count moved to ${count(o.snap)}`,
        changed.length === 0 ? null : `the control reported changes: ${changed.join(' | ')}`,
        has(o.out, 'COLLISION') ? 'the guard fired on a feed that matches the snapshot' : null,
        o.snap.events.every((e) => e.sequence === BASE_SEQUENCE[e.uid]) ? null : 'a SEQUENCE moved on a row nobody changed',
        find(o.snap, 'past-01')?.venue?.name === 'Angel Food Bakery' ? null : 'the venue split was not backfilled for the split-less row',
      ].filter(Boolean);
    },
  },
];

let failed = 0;
const started = Date.now();
for (const c of cases) {
  let o;
  try {
    o = run(c.events, c.args ?? []);
  } catch (err) {
    console.log(`FAIL ${c.name}: the harvester could not run (${err.message})`);
    failed += 1;
    continue;
  }
  const problems = c.check(o);
  if (problems.length) {
    console.log(`FAIL ${c.name}: ${problems.join('; ')}`);
    failed += 1;
  } else {
    console.log(`ok   ${c.name}`);
  }
}

const collisions = cases.filter((c) => c.name.includes('cancel')).length;
console.log(`harvest:selftest — ${cases.length} offline cases (${collisions} of them about the cancellation guard), ${failed} failure(s) in ${((Date.now() - started) / 1000).toFixed(2)}s; fixtures in ${SCRATCH}`);
if (failed) {
  console.log('harvest:selftest: the harvester does not obey its own stated rules — read scripts/events-harvest.mjs before harvesting anything live.');
  process.exit(1);
}
