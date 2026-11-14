#!/usr/bin/env node
/**
 * events:harvest — pull the club's own calendar and merge it into `data/events.json`.
 *
 *   npm run events:harvest                       # fetch the group feed, print what would change (writes nothing)
 *   npm run events:harvest -- --write            # write it
 *   npm run events:harvest -- --from x.ics       # parse a saved feed (offline; what a selftest would use)
 *   npm run events:harvest -- --url <feed url>   # a different group/instance feed
 *
 * The direction is deliberate and it is the whole of D73: the club's calendar lives in Mobilizon (that is
 * where a phone in a pocket can add a date), and this repo holds a **derived snapshot** that a build turns
 * into `/events.ics` and the landing page. Nothing at request time ever talks to Mobilizon — if the home
 * server is down, the cost is that editing is impossible, not that the schedule disappears.
 *
 * What the harvest does NOT do, and why:
 *
 * 1. **It does not believe an upstream `Z`.** Measured on this instance (Mobilizon 5.2.4, `/.well-known/nodeinfo/2.0`):
 *    `DTSTART:20261107T120000Z` with no `TZID` and no `VTIMEZONE`, on a feed whose events were typed as 12:00
 *    and 18:00 Chicago time. Read as instants that is 06:00 and 12:00 CST. The three past rows on the same
 *    instance sit at 17:00Z (= 12:00 CDT), which is consistent with a *correct* conversion — so the exporter
 *    cannot be assumed to behave one way for every row, and no blanket `Z` → local rewrite is safe. The
 *    harvest therefore stores the wall clock it saw, records the verbatim value under `source.rawStart`, and
 *    leaves `timeConfirmed: false`; `src/lib/ics.mjs` then publishes a DATE and `check:ics` fails anyone who
 *    publishes that instant as a real one (D169).
 *
 *    **A zone on the wire is the organizer's own statement of the hour.** Ruled 2026-11-13 (D298), answering
 *    the operator's ask that the schedule stop printing "time not set": when BOTH `DTSTART` and `DTEND` carry
 *    an explicit `TZID=` (the instance writes `TZID=America/Chicago:20261121T120000` on every row it carries
 *    today, @measured 2026-11-13 by this tool), `timeConfirmed` is set true, because the source is declaring
 *    the zone and the clock in it rather than dumping an instant. A bare `Z` with no TZID is still quarantined
 *    (D169) and still needs a human. Precedent: the Nov 21 row's own `_times` note already said "timeConfirmed
 *    is therefore set true on the source's own declaration", which is what A9 ruling 4(a) (D223) asked the
 *    organizer to do. The rule is on by default; `--no-confirm-hours` keeps the old behaviour for a dry run.
 * 2. **It does not invent display copy.** `summary` is quoted from the organizer. `series`, and any rewording
 *    a page needs, stays a human field (D92: publish series names and real dates, never an inferred frequency).
 * 3. **It does not delete rows.** A UID that vanishes from the feed is reported, never dropped: a cancelled
 *    meeting has to be *announced* as cancelled (`STATUS:CANCELLED`) or a subscriber keeps it forever
 *    (D72). Upstream cancel behaviour is still unverified (MILESTONES A6 input 6), so the tool asks a human.
 * 4. **It never un-cancels a published cancellation silently.** On 2026-11-13 this instance re-announced UID
 *    649bf59a - the row this repo had published `STATUS:CANCELLED` on 2026-11-06 - carrying a different date
 *    and hour (@measured 2026-11-13: feed 6,912 octets, 5 VEVENTs, DTSTAMP 20261113T164548Z, and the event page
 *    for that UUID serving "Nov 21, 2026, 12:00:00 PM - GMT-06:00"). RFC 5545 identifies an object by UID,
 *    so a calendar cannot hold both the cancellation and the re-instatement. A merge would quietly rewrite the
 *    dead row's date, its slug and therefore its art key (D223). The harvest prints the collision by name and
 *    changes nothing; the human decides which row lives (D299).
 *
 * Sequence numbers move automatically: if a mechanical field on an existing UID changed, `SEQUENCE`
 * increments, because RFC 5545 (lines 6267-6272) makes UID+SEQUENCE the only way a subscriber learns that
 * the copy it holds is stale.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const argOne = (f, d) => {
  const i = args.indexOf(f);
  return i < 0 ? d : args[i + 1];
};
const OUT = resolve(argOne('--out', 'data/events.json'));
const confirmOff = flag('--no-confirm-hours');
const FROM = argOne('--from', null);
const snapshot = JSON.parse(readFileSync(OUT, 'utf8'));
const FEED_URL = argOne('--url', snapshot.source?.url);

// ------------------------------------------------------------------ parse

/** RFC 5545 line folding: a CRLF followed by a space or tab continues the previous content line. */
const unfoldLines = (raw) => {
  const physical = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const logical = [];
  for (const line of physical) {
    if (/^[ \t]/.test(line) && logical.length) logical[logical.length - 1] += line.slice(1);
    else logical.push(line);
  }
  return logical.filter((l) => l.trim() !== '');
};

const parseLine = (line) => {
  const i = line.indexOf(':');
  if (i < 0) return null;
  const head = line.slice(0, i);
  const parts = head.split(';');
  return { name: parts[0].toUpperCase(), params: parts.slice(1), value: line.slice(i + 1) };
};

/** Reverse of RFC 3.3.11 TEXT escaping, for putting a DESCRIPTION back into the shape a page can render. */
const unescapeText = (s) =>
  s.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');

/** Unescape, then trim. Trimming is not cosmetic: an upstream `\n\n` at the end of a DESCRIPTION would
 *  otherwise read as a content change and burn a SEQUENCE number on every harvest, which makes every
 *  subscriber's client rewrite an event that did not change. */
const text = (v) => unescapeText(v ?? '').trim();

const parseCalendar = (raw) => {
  const lines = unfoldLines(raw);
  const out = { prodid: null, events: [] };
  let current = null;
  for (const line of lines) {
    const p = parseLine(line);
    if (!p) continue;
    if (p.name === 'BEGIN' && p.value.toUpperCase() === 'VEVENT') current = {};
    else if (p.name === 'END' && p.value.toUpperCase() === 'VEVENT') {
      out.events.push(current);
      current = null;
    } else if (current) {
      current[p.name] = { value: p.value, params: p.params };
    } else if (p.name === 'PRODID') out.prodid = p.value;
  }
  return out;
};

/**
 * A feed DTSTART/DTEND into the snapshot's wall-clock form, with the verbatim value kept for provenance.
 * Three shapes arrive: `20261107T120000Z` (the 5.2.4 defect), `20261107T120000` with `TZID=` (a conformant
 * one), and `20261107` (a DATE). None of them sets `timeConfirmed` — that is a human ruling, not a parse.
 */
const readWhen = (prop) => {
  if (!prop) return { value: null, raw: null, tz: null, suspicious: false };
  const v = prop.value;
  const tzid = prop.params.find((p) => p.toUpperCase().startsWith('TZID='))?.slice(5) ?? null;
  if (/^\d{8}$/.test(v)) return { value: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, raw: v, tz: tzid ?? 'DATE', suspicious: false };
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z|[+-]\d{2}:?\d{2})?$/.exec(v);
  if (!m) return { value: null, raw: v, tz: tzid, suspicious: true };
  const wall = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
  return { value: wall, raw: v, tz: tzid, suspicious: Boolean(m[7]) && !tzid };
};

// ------------------------------------------------------------------ fetch

let raw;
let fetchedAt = snapshot.source?.fetchedAt;
if (FROM) {
  raw = readFileSync(FROM, 'utf8');
  console.log(`harvest: read ${FROM} (${Buffer.byteLength(raw)} bytes) — no network, so the harvest stamp stays ${fetchedAt}`);
} else {
  if (!FEED_URL) {
    console.error('harvest: no feed url — pass --url or set source.url in the snapshot');
    process.exit(2);
  }
  const res = await fetch(FEED_URL, { headers: { accept: 'text/calendar' } });
  if (!res.ok) {
    console.error(`harvest: ${FEED_URL} -> HTTP ${res.status}`);
    process.exit(1);
  }
  raw = await res.text();
  fetchedAt = `${new Date().toISOString().slice(0, 19)}Z`;
  console.log(`harvest: fetched ${FEED_URL} (${Buffer.byteLength(raw)} bytes, ${res.headers.get('content-type')}) at ${fetchedAt}`);
}

const feed = parseCalendar(raw);
const software = feed.prodid ?? null;

// ------------------------------------------------------------------ merge

const MECHANICAL = ['summary', 'start', 'end', 'venueRaw', 'geo', 'blurb', 'url', 'image', 'status'];
const seen = new Set();
const notes = [];
const changes = [];

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

/** An instant the source itself zones: both ends are DATE-TIME and both name a TZID. A bare `Z` is not this
 *  (D169), and a DATE is not this either - there is no hour to confirm. */
const declaredHour = (start, end) =>
  Boolean(start.tz && start.tz !== 'DATE' && end.tz && end.tz !== 'DATE');

/** A venue the organizer writes as one string arrives as `raw` only. `name`/`street`/`city` are a human's
 *  split (rule 2: the harvest does not invent copy), so a new row reuses the split of an existing row whose
 *  raw string is byte-identical rather than guessing one. */
const venueFrom = (raw) => {
  if (!raw) return { raw: '' };
  const twin = (snapshot.events ?? []).find((e) => e.venue?.raw === raw && e.venue?.name);
  if (!twin) return { raw };
  return {
    name: twin.venue.name,
    street: twin.venue.street,
    city: twin.venue.city,
    raw,
    _split: `name/street/city copied from row ${twin.uid}, whose LOCATION string is byte-identical (@measured ${fetchedAt}); the split itself is a human field the harvest cannot author`,
  };
};

for (const ev of feed.events) {
  const uid = ev.UID?.value ?? null;
  if (!uid) { notes.push('a VEVENT with no UID — skipped (RFC 5545 requires one; a row nobody can update is a row nobody can cancel)'); continue; }
  seen.add(uid);
  const start = readWhen(ev.DTSTART);
  const end = readWhen(ev.DTEND);
  if (!start.value) { notes.push(`${uid}: unparseable DTSTART ${JSON.stringify(ev.DTSTART?.value)} — not merged`); continue; }
  if (start.suspicious || end.suspicious) {
    notes.push(`${uid}: a DATE-TIME with a zone designator and no TZID (${start.raw}${end.raw ? ` / ${end.raw}` : ''}) — stored as a wall clock, still unconfirmed (D169)`);
  }
  const row = {
    uid,
    summary: text(ev.SUMMARY?.value),
    start: start.value,
    end: end.value ?? start.value,
    venueRaw: text(ev.LOCATION?.value),
    geo: ev.GEO?.value ?? null,
    blurb: text(ev.DESCRIPTION?.value),
    url: ev.URL?.value ?? null,
    image: ev.ATTACH?.value ?? null,
    status: (ev.STATUS?.value ?? 'CONFIRMED').toUpperCase(),
  };

  const existing = (snapshot.events ?? []).find((e) => e.uid === uid);
  if (existing && String(existing.status ?? '').toUpperCase() === 'CANCELLED' && row.status !== 'CANCELLED') {
    notes.push(
      `COLLISION  ${uid}: the feed re-announces a UID this snapshot has published as CANCELLED (${existing.start} -> ${row.start}) ` +
      `and the harvest refuses to merge it (rule 4, D299). Decide which row lives, then hand-edit data/events.json: ` +
      "the live row needs a slug that is not '-cancelled' (D223's event-<slug>.png key) and its art mirrored " +
      "under that slug; the retired one keeps the UID with SEQUENCE raised so subscribers drop it (D72)."
    );
    continue;
  }
  if (!existing) {
    const created = {
      uid,
      slug: `${row.start.slice(0, 10)}-${slugify(row.summary)}`,
      summary: row.summary,
      series: row.summary,
      start: row.start,
      end: row.end,
      timeConfirmed: declaredHour(start, end) && !confirmOff,
      venue: venueFrom(row.venueRaw),
      geo: row.geo,
      blurb: row.blurb,
      url: row.url,
      image: row.image,
      sequence: 0,
      status: row.status,
      source: { feed: FEED_URL, uid, fetchedAt, dtstamp: ev.DTSTAMP?.value ?? null, rawStart: start.raw, rawEnd: end.raw },
    };
    snapshot.events = [...(snapshot.events ?? []), created];
    changes.push(`+ ${uid} ${row.start.slice(0, 10)} "${row.summary}" — new row; SEQUENCE 0. A human still owes it: series name${row.venueRaw ? ', venue split into name/street/city' : ''}, and the hour ruling.`);
    continue;
  }

  const moved = [];
  for (const f of MECHANICAL) {
    const now = f === 'venueRaw' ? (existing.venue?.raw ?? '') : (existing[f] ?? '');
    if (String(now) !== String(row[f] ?? '')) moved.push(f);
  }
  if (moved.length) {
    for (const f of moved) {
      if (f === 'venueRaw') existing.venue = { ...existing.venue, raw: row.venueRaw };
      else existing[f] = row[f];
    }
    existing.sequence = Number(existing.sequence ?? 0) + 1;
    changes.push(`~ ${uid} "${row.summary}" — ${moved.join(', ')} changed; SEQUENCE -> ${existing.sequence} (UID+SEQUENCE is how a subscriber learns its copy is stale)`);
    if (moved.some((f) => ['start', 'end', 'summary', 'venueRaw', 'status'].includes(f)) && existing.timeConfirmed) {
      notes.push(`${uid}: a field the organizer confirms moved — re-confirm the wall clock, timeConfirmed was left as-is deliberately`);
    }
  } else {
    changes.push(`  ${uid} "${row.summary}" — unchanged`);
  }
  if (!confirmOff && declaredHour(start, end) && !existing.timeConfirmed) {
    existing.timeConfirmed = true;
    notes.push(`${uid}: DTSTART and DTEND both carry TZID=${start.tz ?? end.tz} — the source declares the hour, so timeConfirmed is set (D298)`);
  }
  existing.source = { ...existing.source, feed: FEED_URL, uid, fetchedAt, dtstamp: ev.DTSTAMP?.value ?? null, rawStart: start.raw, rawEnd: end.raw };
  // A row created before its venue was split (the harvest writes `raw` only) gets the split from a row whose
  // LOCATION string is byte-identical, so a new date at a known venue prints a venue line instead of nothing.
  if (row.venueRaw && !existing.venue?.name) {
    existing.venue = { ...existing.venue, ...venueFrom(row.venueRaw) };
    if (existing.venue.name) {
      notes.push(`${uid}: venue "${row.venueRaw.slice(0, 24)}..." has no name/street/city split; copied from the row that already has one (rule 2 - the split is a human field, this only reuses one)`);
    }
  }
}

for (const e of snapshot.events ?? []) {
  if (!seen.has(e.uid)) {
    notes.push(`${e.uid} "${e.summary}" is in the snapshot but not in the feed — NOT removed. Either it is past (the group feed lists upcoming only) or it was cancelled upstream; a cancelled meeting has to be published as STATUS:CANCELLED, not deleted (D72).`);
  }
}

snapshot.source = { ...snapshot.source, url: FEED_URL, software, fetchedAt };

// Every published row's DTSTAMP derives from this run's stamp, not from the row's last harvest.
// `src/lib/ics.mjs` reads `row.source.fetchedAt` per row, and `check:ics`'s dtstamp rule asserts every
// published DTSTAMP equals the calendar-level harvest stamp (docs/spec/source-contract.md: "DTSTAMP derives
// from the committed source.fetchedAt, not the build clock"). A row left in the snapshot because it is past
// or gone from the feed would otherwise keep an older stamp and turn the gate red — which is exactly what a
// harvest that re-stamps only the rows it touched produced on 2026-11-13. The row's own upstream stamp stays
// in `source.dtstamp` and its raw instants in `source.rawStart`/`rawEnd`, so provenance is not lost; only the
// published stamp is normalised to the run.
for (const e of snapshot.events ?? []) {
  if (e.source && e.source.fetchedAt !== fetchedAt) {
    notes.push(`${e.uid} "${e.summary}": published DTSTAMP moves from ${e.source.fetchedAt} to the run stamp ${fetchedAt} (one stamp per published calendar; D225's churn consequence)`);
    e.source.fetchedAt = fetchedAt;
  }
}

// ------------------------------------------------------------------ report

for (const c of changes) console.log(c);
for (const n of notes) console.log(`note  ${n}`);
const upcoming = (snapshot.events ?? []).filter((e) => String(e.start).slice(0, 10) >= new Date().toISOString().slice(0, 10));
console.log(`harvest: ${feed.events.length} VEVENT(s) in the feed, ${(snapshot.events ?? []).length} row(s) in the snapshot, ${upcoming.length} not yet past`);
if (flag('--write')) {
  writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`harvest: wrote ${OUT}`);
  console.log('harvest: run npm run check:ics (and a build) before committing — the gate, not this tool, decides whether the result is publishable.');
} else {
  console.log('harvest: dry run — nothing written. Add --write to apply.');
}
