#!/usr/bin/env node
// meetup-events.mjs - read the club's own public Meetup pages and write a dated snapshot.
//
// Why this exists (D258, ruling S017): the operator ruled that RSVP aggregation reads Meetup's public pages
// and that a schedule row links to the *event*, not the group (D259). Neither is possible without the event's
// own Meetup id and its headcount, and Meetup has no feed we may read: measured 2026-11-09 (Linux, curl +
// browser UA), `/events/ics/`, `/events/calendar/ics/` and `/events/atom/` all answer 404, and the group's
// `robots.txt` disallows the atom/rss/xml feed paths, `/api/`, `/mu_api/` and `/gql*`. The group's `/events/`
// page is not disallowed and answers 200 with no Cloudflare challenge, and its `__NEXT_DATA__` carries the
// event objects - id, token, title, dateTime, endTime, venue, and `going: { totalCount }`.
//
// What this deliberately is NOT:
//   - not a request-time fetch. The snapshot is committed (`data/meetup-events.json`) and read at build time,
//     the same topology D73 chose for the calendar: an upstream being down costs editing, not serving.
//   - not an API client. There is no credential here, so nothing to leak and no rate limit we are bound by
//     beyond the courtesy of one GET per run.
//   - not authoritative about people. `going.totalCount` is a count of members on a third-party platform at
//     the moment it was read; it is published only with that moment attached (D92's dated-claim rule).
//
//   node scripts/meetup-events.mjs            print what it read, write nothing
//   node scripts/meetup-events.mjs --write    write data/meetup-events.json
//   node scripts/meetup-events.mjs --check    exit 1 if the snapshot is stale, empty, or a row has no count
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = root + 'data/meetup-events.json';
const GROUP = 'minneapolis-mathematics-book-club';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
// How old a snapshot may be before the gate calls it stale. Shorter than check:ics's 21-day runway (D188),
// because a headcount is a claim about people that changes far faster than a date does.
const MAX_AGE_DAYS = 14;

/** One GET of one URL the club publishes. No cookie, no token, one retry, and the byte count is recorded
 *  because the last time a source shape changed under us (D222, the Mobilizon ICS went from bare `Z` to a
 *  TZID in two days) the only way to see it was to keep the read's own evidence. */
async function readPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  const body = await res.text();
  return { url, status: res.status, bytes: Buffer.byteLength(body), body };
}

/** Pull the JSON Next put in `__NEXT_DATA__`. Belt and braces: the attribute is `data-next-data` on some
 *  Meetup pages and `__NEXT_DATA__` on the ones we measured, so both are tried before failing loudly. */
function nextData(html) {
  for (const re of [/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/, /data-next-data="([\s\S]*?)"\s*/]) {
    const m = re.exec(html);
    if (m) {
      try { return JSON.parse(m[1]); } catch { /* try the next shape */ }
    }
  }
  return null;
}

/** Flatten the Apollo state into event records. The state is a flat map keyed `Event:<id>`, and a field that
 *  is a reference is a string like `EventVenue:1234`, so venues and headcounts are looked up in the same map. */
function eventsFrom(state, groupSlug) {
  if (!state) return [];
  const out = [];
  for (const [key, val] of Object.entries(state)) {
    if (!key.startsWith('Event:') || !val || typeof val !== 'object') continue;
    const ref = (s) => (typeof s === 'string' && state[s]) ? state[s] : null;
    const venue = ref(val.venue);
    // `going` is inline here ({"__typename":"GoingRsvpConnection","totalCount":5}), not a ref - measured
    // 2026-11-09. ref() returns null for a non-string, so reading it through ref() silently zeroed every
    // headcount on the first run.
    const going = typeof val.going === 'string' ? ref(val.going) : val.going;
    out.push({
      id: String(val.id ?? key.slice(6)),
      // `eventUrl` is the URL the page itself carries. It is used rather than assembled, because an
      // assembled path is a claim about a site we do not control: measured 2026-11-09, the group's
      // `__NEXT_DATA__` writes /events/<id>/ for every record, and the token form only appears for
      // series occurrences. Storing what the source prints is what makes the gate's shape check mean
      // something.
      url: val.eventUrl ?? `https://www.meetup.com/${groupSlug}/events/${val.id ?? key.slice(6)}/`,
      title: val.title ?? null,
      start: val.dateTime ?? null,
      end: val.endTime ?? null,
      // The field is `status`, not `eventStatus` (measured: 16 records ACTIVE, 10 PAST on 2026-11-09).
      status: val.status ?? val.eventStatus ?? null,
      // Deliberately NOT read: each Event record also carries `rsvps({"first":5})`, i.e. the names of the
      // people who said they are coming. A headcount is a fact about an event; a list of members is a fact
      // about people, and this project's consent note (.notes/consent-and-data-policy.md) says member data
      // stays where the member put it. If a future round wants names, that is a letter, not a field.
      going: typeof going?.totalCount === 'number' ? going.totalCount : null,
      venueName: venue?.name ?? null,
      // `series` is an object, a `Series:<id>` ref, or null for a one-off event - and null is the value that
      // threw the first run, because `typeof null === 'object'`. Guard before deref.
      seriesId: typeof val.seriesId === 'number' ? val.seriesId : (val.series && typeof val.series === 'object' ? val.series.id ?? null : null),
    });
  }
  return out;
}

/** The local wall clock of an instant, as the site stores dates: `YYYY-MM-DD` and `HH:MM`, in the offset the
 *  source itself declares. Never `new Date()` arithmetic, which is how a UTC build prints yesterday (D188). */
function localClock(iso) {
  if (!iso) return { date: null, time: null };
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return { date: m?.[1] ?? null, time: m?.[2] ?? null };
}

async function harvest() {
  const urls = [`https://www.meetup.com/${GROUP}/events/`];
  const events = new Map();
  const reads = [];
  for (const url of urls) {
    const page = await readPage(url);
    reads.push({ url, status: page.status, bytes: page.bytes });
    if (page.status !== 200) continue;
    const data = nextData(page.body);
    // Measured shape (2026-11-09): props.pageProps.__APOLLO_STATE__, a flat map of 26 `Event:<id>` records.
    const state = data?.props?.pageProps?.__APOLLO_STATE__ ?? data?.props?.pageState?.__APOLLO_STATE__ ?? null;
    for (const e of eventsFrom(state, GROUP)) events.set(e.id, e);
  }
  const list = [...events.values()].sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
  return {
    _rule: 'A dated snapshot of the club\'s own public Meetup events, read by `node scripts/meetup-events.mjs --write`. It is committed so the build never reaches the network (D73\'s topology, the same one data/events.json follows). Every number in here is a third party\'s count at the moment it was read, so nothing printed from it is printed without its date (D92). The reader that produced it is scripts/meetup-events.mjs, and npm run check:rsvp is what keeps it from going stale.',
    source: {
      kind: 'meetup-html',
      urls,
      fetchedAt: new Date().toISOString(),
      reads,
      _how: 'Anonymous GET with a browser UA. Meetup offers no readable feed for this group: /events/ics/, /events/calendar/ics/ and /events/atom/ measured 404 on 2026-11-09, and robots.txt disallows the atom/rss/xml paths, /api/, /mu_api/ and /gql*. The group\'s /events/ page is not disallowed and answers 200 without a challenge.',
    },
    events: list.map((e) => ({ ...e, ...localClock(e.start) })),
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    if (!existsSync(OUT)) { console.error('check:rsvp FAIL - data/meetup-events.json does not exist; run node scripts/meetup-events.mjs --write'); return 1; }
    const snap = JSON.parse(readFileSync(OUT, 'utf8'));
    const problems = [];
    if (!snap.source?.fetchedAt) problems.push('no fetchedAt - the snapshot does not say when it was read, so nothing printed from it can be dated');
    else {
      const ageDays = (Date.now() - Date.parse(snap.source.fetchedAt)) / 86400000;
      if (ageDays > MAX_AGE_DAYS) problems.push(`snapshot is ${ageDays.toFixed(1)} days old; the limit is ${MAX_AGE_DAYS} (a headcount is not a date)`);
    }
    if (!Array.isArray(snap.events) || !snap.events.length) problems.push('no events in the snapshot');
    for (const e of snap.events ?? []) {
      if (!e.id) problems.push('an event has no id');
      if (!e.url || !/^https:\/\/www\.meetup\.com\/[a-z0-9-]+\/events\/[0-9a-z]+\/$/.test(e.url)) problems.push(`event ${e.id} has a url this build cannot trust: ${e.url}`);
      if (!e.date) problems.push(`event ${e.id} has no local date`);
      if (e.going !== null && typeof e.going !== 'number') problems.push(`event ${e.id} has a going count that is not a number: ${e.going}`);
    }
    if (problems.length) { console.log(`check:rsvp FAIL - ${problems.length} problem(s):`); for (const p of problems) console.log('  ' + p); return 1; }
    const open = (snap.events ?? []).filter((e) => e.status === 'ACTIVE');
    console.log(`check:rsvp ok - ${snap.events.length} events read ${snap.source.fetchedAt.slice(0, 10)}, ${open.length} still open, ${open.filter((e) => e.going !== null).length} carrying a headcount.`);
    return 0;
  }
  const snap = await harvest();
  if (!snap.events.length) {
    console.error('meetup-events: the page was read but no Event records were found - the shape changed. Nothing written.');
    return 1;
  }
  if (args.includes('--write')) {
    writeFileSync(OUT, JSON.stringify(snap, null, 2) + '\n');
    console.log(`wrote ${OUT}: ${snap.events.length} events, ${snap.events.filter((e) => e.status === 'ACTIVE').length} open`);
  } else {
    for (const e of snap.events) {
      console.log(`${e.date ?? '?'} ${e.time ?? '?'}  going ${e.going ?? '-'}  ${e.status}  ${e.title}  ${e.url}`);
    }
  }
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => { console.error('meetup-events failed:', err.message); process.exit(1); });
