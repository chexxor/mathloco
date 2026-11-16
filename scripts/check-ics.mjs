#!/usr/bin/env node
/**
 * check:ics — the published calendar can fail, and it fails on the traps that actually cost people meetings.
 *
 *   npm run check:ics                # audit data/events.json AND the built dist/client/events.ics
 *   npm run check:ics:selftest       # plant each defect, require each to FAIL (D118: a gate that cannot go
 *                                    # red is not a gate)
 *   node scripts/check-ics.mjs --dist <dir> --data <file>   # audit a different artifact/snapshot
 *
 * Why this trap list and not a general validator: D72 retrieved RFC 5545 and named what a hand-built feed
 * must not skip, and D169 then measured Mobilizon 5.2.4's own exporter committing four of them — LF-only
 * lines, a 721-char unfolded content line, `DTSTART:20261107T120000Z` (a wall clock wearing a zone it does
 * not have), and no `SEQUENCE`. A subscriber that trusts that `Z` is told a bakery social starts at 06:00.
 * Each rule below is therefore a way a calendar silently lies to a person standing outside a bakery.
 *
 * Two levels of audit on purpose: the **snapshot** (fields a human or the harvester wrote) and the
 * **published bytes** (what a subscriber reads). A proxy that forwarded Mobilizon's feed verbatim would pass
 * a data-only check and fail here, which is D150's "the publisher normalizes; it does not proxy" as a machine.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderCalendar, escapeText } from '../src/lib/ics.mjs';
import { publishableRows, meetingKind, venueKey } from '../src/lib/event-groups.mjs';
import { feedDescription, DESCRIPTIONS } from '../src/lib/event-description.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const argOne = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i < 0 ? dflt : args[i + 1];
};
const DATA_PATH = resolve(argOne('--data', 'data/events.json'));
const DIST_DIR = resolve(argOne('--dist', 'dist/client'));
const ARTIFACT = resolve(DIST_DIR, 'events.ics');

const snapshot = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const BUILD_DATE = new Date().toISOString().slice(0, 10).replace(/-/g, '');

// Textual helpers shared by several rules: unfolding joins a folded line back together, so an assertion sees
// one property per line no matter how the renderer wrapped it.
const unfold = (text) => text.replace(/\r\n[ \t]/g, '');
const eventsOf = (text) => unfold(text).match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
const propOf = (block, name) => {
  const m = new RegExp(`^${name}([^:]*):([^\r]*)`, 'm').exec(block);
  return m ? { params: m[1], value: m[2], raw: m[0] } : null;
};

/** The runtime's own answer for a zone's offset on a date — the thing a typed VTIMEZONE gets checked against. */
const offsetFor = (tz, isoDate) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(`${isoDate}T12:00:00Z`));
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  const m = /GMT([+-]\d{2})(?::(\d{2}))?/.exec(name);
  return m ? `${m[1]}${m[2] ?? '00'}` : null;
};

// ------------------------------------------------------------------ the runway (A8, D188)
// Two numbers, and they live here as constants on purpose: the operator's ruling 2026-11-04 was "N = 21 days,
// and no env var at this point". A knob nobody has to reach for is a constant a diff has to review.
//
// Why 21: both series run every 14 days (D175), so 21 days of runway guarantees at least one row exists while
// still leaving a week of slack between "the organizer has not made the next one yet" and "the site is lying".
const RUNWAY_DAYS = 21;
// The warning fires at twice the failure distance, so there is one number to remember and one lead time.
const RUNWAY_WARN_DAYS = RUNWAY_DAYS * 2;

/**
 * Today in the club's own zone. `src/lib/events.mjs` states the reason for the same rule: the same commit
 * built on a UTC CI runner and on a UTC-6 laptop must not disagree about whether tonight's event is still
 * upcoming. A gate that is supposed to fire exactly when the schedule section goes empty has to agree with
 * the page about what "today" is — the previous version of this file compared UTC dates, which sat up to a
 * day away from the page it was guarding (D188).
 */
const clubToday = (data) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: data.calendar?.timezone ?? 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (k) => parts.find((p) => p.type === k)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** The rows the page may show, in the page's own order — the same predicate `isUpcoming` applies in `Schedule.astro`. */
const upcomingRows = (data, today) =>
  (data.events ?? [])
    .filter((e) => String(e.status ?? '').toUpperCase() !== 'CANCELLED'
      && `${String(e.start ?? '').slice(0, 10)}T23:59` >= `${today}T00:00`)
    .sort((a, b) => `${a.start} ${a.uid}`.localeCompare(`${b.start} ${b.uid}`));

const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T12:00Z`) - Date.parse(`${from}T12:00Z`)) / 86400000);

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** Top-level fields the gate knows by name, so a hatch spelled wrong fails instead of silently silencing. */
const SNAPSHOT_KEYS = ['calendar', 'source', 'events', 'stalenessOkUntil', 'superseded'];

// ------------------------------------------------------------------ the rules
// Each rule returns findings: `[]` means satisfied. Rules receive (data, text) where text is the published
// calendar, so a rule may audit the snapshot, the bytes, or both.

const RULES = [
  // RFC 5545 3.6: a VCALENDAR MUST carry PRODID and VERSION. METHOD:PUBLISH says this is a feed being
  // published rather than an invitation a client should answer.
  (data, text) => {
    const out = [];
    for (const req of ['PRODID', 'VERSION', 'CALSCALE', 'METHOD']) {
      if (!new RegExp(`^${req}:`, 'm').test(unfold(text))) out.push({ rule: 'envelope', detail: `${req} missing from VCALENDAR` });
    }
    const begun = (text.match(/^BEGIN:VEVENT$/gm) ?? []).length;
    const ended = (text.match(/^END:VEVENT$/gm) ?? []).length;
    if (begun !== ended) out.push({ rule: 'envelope', detail: `unbalanced VEVENT components (${begun} BEGIN, ${ended} END)` });
    // D318: the snapshot holds every row the source has; the feed publishes the rows the grouping does not
    // supersede. Comparing the raw row count here would make the renderer's de-duplication look like a bug.
    const publishable = publishableRows(data.events ?? []).rows.length;
    if (publishable !== ended) {
      out.push({ rule: 'envelope', detail: `${publishable} of ${(data.events ?? []).length} snapshot row(s) are publishable, ${ended} VEVENT(s) published` });
    }
    return out;
  },

  // D72: a VEVENT requires UID + DTSTAMP, and DTSTART absent a METHOD. SEQUENCE is how an edit reaches
  // someone who already has the event (lines 6267-6272), so it is required here rather than optional.
  (_data, text) => {
    const out = [];
    eventsOf(text).forEach((b, i) => {
      for (const req of ['UID', 'DTSTAMP', 'DTSTART', 'DTEND', 'SUMMARY', 'STATUS', 'SEQUENCE']) {
        if (!new RegExp(`^${req}[^:]*:`, 'm').test(b)) out.push({ rule: 'vevent-required', detail: `VEVENT #${i + 1} has no ${req}` });
      }
    });
    return out;
  },

  // RFC 5545 line 6206: a UID must be globally unique and must not be derived from the time the component was
  // created — a build-timestamp UID re-adds the same meeting to every subscriber on every deploy. The UIDs
  // here are Mobilizon's own UUIDv4s (D74: `uid: event.uuid`), which is why they survive a redeploy unchanged.
  (data, text) => {
    const out = [];
    const uids = (data.events ?? []).map((e) => String(e.uid ?? ''));
    for (const u of uids) {
      if (!u) out.push({ rule: 'uid-shape', detail: 'a row has no UID' });
      // Two shapes a build clock actually produces: a bare 14-digit stamp (`20261105002000`) and the ICS form with
      // a `T` and a `Z` (`20261105T002000Z`). The digit-run test alone missed the second, which is exactly the form a
      // harvester copying `DTSTAMP` into `uid` would write - found on 2026-11-05 when a *planting* of that shape
      // passed the gate. A selftest that plants a defect the rule cannot see is a rule that is not gated.
      //
      // The third shape is the ISO one (`2026-11-06T05:00:28Z`), and it found me on 2026-11-06: hand-writing the
      // cancelled row's `source.dtstamp` in the JSON form rather than the verbatim ICS form made the
      // `time-derived-UID` planting invisible, because punctuation splits every digit run the rule looks for. A
      // timestamp with dashes and colons is just as time-derived once it is glued into a UID, so the test runs on the
      // punctuation-stripped string too. The four shipped UUIDv4s stripped of `[-:]` hold runs of at most 6 digits
      // (longest: `198943`, `213498`), so this does not flag a real UUID - and the selftest now plants both shapes.
      const TIME_SHAPE = /\d{14}|\d{8}T\d{6}Z?/;
      if (TIME_SHAPE.test(u) || TIME_SHAPE.test(u.replace(/[-:]/g, '')))
        out.push({ rule: 'uid-shape', detail: `UID ${u} looks time-derived — every redeploy would duplicate it` });
      if (u.includes(BUILD_DATE)) out.push({ rule: 'uid-shape', detail: 'a UID contains this build date' });
      // D318: a row the grouping supersedes is *meant* to be absent, so the presence test runs only on rows
      // the calendar is supposed to publish. The grouping rule below is what proves the absence is deliberate.
      const publishable = new Set(publishableRows(data.events ?? []).rows.map((r) => String(r.uid ?? '')));
      if (u && publishable.has(u) && !unfold(text).includes(`UID:${u}`)) out.push({ rule: 'uid-shape', detail: `UID ${u} is absent from the published feed` });
    }
    if (new Set(uids).size !== uids.length) out.push({ rule: 'uid-shape', detail: 'two rows share a UID' });
    return out;
  },

  // The point of D70's "moving the writer must not change any subscriber's calendar": two builds of one
  // snapshot are the same bytes. Anything that reads a clock in the renderer breaks this.
  (data) => {
    const a = renderCalendar(data);
    const b = renderCalendar(JSON.parse(JSON.stringify(data)));
    return a === b ? [] : [{ rule: 'byte-identity', detail: 'one snapshot rendered twice to two different byte strings' }];
  },

  // DTSTAMP is required (3.8.7) but must come from the harvest, not the build: a build-time stamp makes every
  // deploy look like an edit to every event, and makes the byte-identity rule above unmeasurable.
  (data, text) => {
    const out = [];
    const want = String(data.source?.fetchedAt ?? '').replace(/[-:]/g, '');
    const stamps = unfold(text).match(/^DTSTAMP:(\S+)$/gm) ?? [];
    if (!stamps.length) out.push({ rule: 'dtstamp', detail: 'no DTSTAMP published' });
    for (const s of stamps) {
      const v = s.slice('DTSTAMP:'.length);
      if (v !== want) out.push({ rule: 'dtstamp', detail: `DTSTAMP ${v} is not the harvest stamp ${want} — a stamp that moves between builds re-notifies every subscriber on every deploy` });
    }
    return out;
  },

  // RFC 3.1: CRLF line endings, content lines no longer than 75 octets, folded with CRLF + one space. This is
  // the rule Mobilizon 5.2.4's own feed fails (LF-only, longest line 721 chars, measured 2026-11-04).
  (_data, text) => {
    const out = [];
    if (/\r(?!\n)/.test(text)) out.push({ rule: 'folding', detail: 'a bare CR' });
    if (text.split('\r\n').some((chunk) => chunk.includes('\n'))) {
      out.push({ rule: 'folding', detail: 'a line ends in LF without CR — RFC 3.1 wants CRLF (this is what Mobilizon 5.2.4 ships)' });
    }
    if (!/^(BEGIN:VCALENDAR|PRODID)/.test(text)) out.push({ rule: 'folding', detail: 'the document does not start with the calendar' });
    const wire = text.split('\r\n');
    wire.forEach((l, i) => {
      const octets = new TextEncoder().encode(l).length;
      if (octets > 75) out.push({ rule: 'folding', detail: `line ${i + 1} is ${octets} octets (max 75): ${l.slice(0, 40)}...` });
      if (l === '') {
        if (i !== wire.length - 1) out.push({ rule: 'folding', detail: `line ${i + 1} is empty — a content line ended with nothing on it` });
        return;
      }
      if (!/^[A-Za-z][A-Za-z0-9-]*(;[^:]*)?:/.test(l) && !/^[ \t]/.test(l)) {
        out.push({ rule: 'folding', detail: `line ${i + 1} is neither a property line nor a folded continuation: ${JSON.stringify(l.slice(0, 30))}` });
      }
    });
    return out;
  },

  // RFC 3.3.11: TEXT escapes backslash, semicolon, comma and newline. An unescaped comma is how "Angel Food
  // Bakery, Saint Louis Park" turns into a city called "Angel Food Bakery" in some clients.
  (_data, text) => {
    const out = [];
    const u = unfold(text);
    for (const name of ['SUMMARY', 'LOCATION', 'DESCRIPTION']) {
      const p = propOf(u, name);
      if (!p) continue;
      const v = p.value;
      for (let i = 0; i < v.length; i += 1) {
        if ((v[i] === ',' || v[i] === ';') && v[i - 1] !== '\\') {
          out.push({ rule: 'escaping', detail: `${name} has an unescaped "${v[i]}" at offset ${i}: ${v.slice(0, 40)}` });
          break;
        }
        if (v[i] === '\\' && !'nN\\;,'.includes(v[i + 1] ?? '')) {
          out.push({ rule: 'escaping', detail: `${name} has a lone backslash at offset ${i}` });
          break;
        }
      }
    }
    return out;
  },

  // D169, the six-hour rule. Every DATE-TIME on the wire must name its zone. `Z` on a value we did not
  // confirm is the upstream defect; no parameter at all is floating local time, which each client resolves
  // differently. A bare DATE must announce itself with VALUE=DATE.
  (data, text) => {
    const out = [];
    const tz = data.calendar?.timezone;
    for (const b of eventsOf(text)) {
      for (const name of ['DTSTART', 'DTEND']) {
        const p = propOf(b, name);
        if (!p) continue;
        if (/^\d{8}$/.test(p.value)) {
          if (!/VALUE=DATE/.test(p.params)) out.push({ rule: 'zone-on-instants', detail: `${name} is a bare DATE with no VALUE=DATE parameter` });
          continue;
        }
        if (p.value.endsWith('Z')) {
          out.push({ rule: 'zone-on-instants', detail: `${name} ${p.value} claims UTC — the defect that puts a noon social at 06:00 CST (D169)` });
        } else if (!p.params.includes(`TZID=${tz}`)) {
          out.push({ rule: 'zone-on-instants', detail: `${name} ${p.value} carries no TZID (floating local time)` });
        }
      }
    }
    return out;
  },

  // The quarantined upstream form, stopped at the door: a snapshot row whose start/end still carries a `Z` or
  // an offset is a harvested instant nobody confirmed. It may live in `source` as provenance, never in the
  // field the renderer publishes.
  (data) => {
    const out = [];
    for (const row of data.events ?? []) {
      for (const f of ['start', 'end']) {
        const v = String(row[f] ?? '');
        if (/Z$|[+-]\d{2}:?\d{2}$/.test(v)) {
          out.push({ rule: 'raw-upstream-instant', detail: `${row.uid}.${f} = ${v} carries a zone designator — D169 quarantines the harvested form until the organizer confirms the wall clock` });
        } else if (v && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v)) {
          out.push({ rule: 'raw-upstream-instant', detail: `${row.uid}.${f} = ${JSON.stringify(v)} is not YYYY-MM-DD or YYYY-MM-DDTHH:MM` });
        }
      }
      if (row.timeConfirmed === true && !/T\d{2}:\d{2}$/.test(String(row.start ?? ''))) {
        out.push({ rule: 'raw-upstream-instant', detail: `${row.uid}: timeConfirmed but start has no hour` });
      }
    }
    return out;
  },

  // A DATE-valued DTEND is exclusive (3.8.2.2), so repeating the start date tells every subscriber the event
  // ends the moment it begins.
  (_data, text) => {
    const out = [];
    for (const b of eventsOf(text)) {
      const s = propOf(b, 'DTSTART');
      const e = propOf(b, 'DTEND');
      if (s && e && /^\d{8}$/.test(s.value) && /^\d{8}$/.test(e.value) && e.value <= s.value) {
        out.push({ rule: 'date-span', detail: `DTEND ${e.value} is not after DTSTART ${s.value} (a DATE end is exclusive)` });
      }
      if (s && e && /^\d{8}T\d{6}$/.test(s.value) && /^\d{8}T\d{6}$/.test(e.value) && e.value <= s.value) {
        out.push({ rule: 'date-span', detail: `DTEND ${e.value} is not after DTSTART ${s.value}` });
      }
    }
    return out;
  },

  // The VTIMEZONE block is typed by a human; the runtime's tz database is not. Compare the published
  // transitions with `Intl` for one date on each side of the DST switch, so a typo ships red rather than
  // six hours wrong.
  (data, text) => {
    const out = [];
    const tz = data.calendar?.timezone;
    const block = /BEGIN:VTIMEZONE[\s\S]*?END:VTIMEZONE/.exec(unfold(text))?.[0];
    if (!tz) return [{ rule: 'vtimezone', detail: 'the snapshot has no calendar.timezone' }];
    if (!block) return [{ rule: 'vtimezone', detail: 'no VTIMEZONE is published, so a subscriber resolves the wall clock in its own zone' }];
    if (!`TZID:${tz}`.includes(block) && !block.includes(`TZID:${tz}`)) out.push({ rule: 'vtimezone', detail: `VTIMEZONE TZID does not match ${tz}` });
    const comps = block.match(/BEGIN:(DAYLIGHT|STANDARD)[\s\S]*?END:(DAYLIGHT|STANDARD)/g) ?? [];
    if (comps.length < 2) out.push({ rule: 'vtimezone', detail: 'VTIMEZONE needs both DAYLIGHT and STANDARD components for a zone that observes DST' });
    const summer = offsetFor(tz, '2026-07-15');
    const winter = offsetFor(tz, '2026-01-15');
    for (const c of comps) {
      const kind = /^BEGIN:(DAYLIGHT|STANDARD)/.exec(c)?.[1];
      const to = /^TZOFFSETTO:([-+]\d{4})$/m.exec(c)?.[1];
      const want = kind === 'DAYLIGHT' ? summer : winter;
      if (!to) { out.push({ rule: 'vtimezone', detail: `${kind} component has no TZOFFSETTO` }); continue; }
      if (to !== want) out.push({ rule: 'vtimezone', detail: `${kind} TZOFFSETTO ${to} but the runtime says ${tz} is ${want} on ${kind === 'DAYLIGHT' ? '2026-07-15' : '2026-01-15'}` });
      if (!/^RRULE:/m.test(c)) out.push({ rule: 'vtimezone', detail: `${kind} component has no RRULE, so it applies once and then never again` });
    }
    if (summer && winter && summer === winter) out.push({ rule: 'vtimezone', detail: `${tz} has no DST in this runtime — the two-component block is wrong or the zone changed` });
    return out;
  },

  // Every published row is a claim about the real world, so it names where it came from — the rule
  // `check:content` enforces for prose (D92). "Saturday, 2:0 PM at the Local Library" survived two years
  // because nothing asked who said it.
  (data) => {
    const out = [];
    for (const row of data.events ?? []) {
      const id = row.uid ?? row.slug ?? '(no uid)';
      if (!row.uid) out.push({ rule: 'sourced-rows', detail: 'a row has no uid' });
      if (!row.summary) out.push({ rule: 'sourced-rows', detail: `${id}: no summary` });
      if (!row.status) out.push({ rule: 'sourced-rows', detail: `${id}: no status` });
      if (!/^\d+$/.test(String(row.sequence ?? ''))) out.push({ rule: 'sourced-rows', detail: `${id}: SEQUENCE must be a non-negative integer` });
      if (!row.slug) out.push({ rule: 'sourced-rows', detail: `${id}: no slug (the id a human types when reporting a problem with a row)` });
      if (!row.source?.feed || !row.source?.fetchedAt) {
        out.push({ rule: 'sourced-rows', detail: `${id}: no source.feed/source.fetchedAt — a date nobody can trace is a date nobody can trust` });
      }
      for (const k of Object.keys(row)) {
        if (!k.startsWith('_') && !['uid', 'slug', 'summary', 'series', 'seriesNote', 'start', 'end', 'timeConfirmed', 'venue', 'geo', 'blurb', 'url', 'image', 'sequence', 'status', 'source'].includes(k)) {
          out.push({ rule: 'sourced-rows', detail: `${id}: field "${k}" is not in the D70 row shape — add it to the gate's list deliberately, or remove it` });
        }
      }
    }
    if (!data.source?.url || !data.source?.fetchedAt) out.push({ rule: 'sourced-rows', detail: 'the snapshot has no source.url/source.fetchedAt' });
    if (!data.calendar?.prodid) out.push({ rule: 'sourced-rows', detail: 'the snapshot has no calendar.prodid' });
    return out;
  },

  // A snapshot is a copy, so it goes stale on its own, and the failure M6 names is that nobody notices: the
  // landing schedule shows its empty state and every subscriber keeps a calendar whose last date has passed.
  // `check:ics` used to *print* the distance ("next is 2026-11-07 (3 day(s) away)"), and A8's exit criterion
  // is the sentence that makes this a gate: prints are not gates (D118).
  (data) => {
    const out = [];
    const today = clubToday(data);
    const hatch = data.stalenessOkUntil;
    const hatchWellFormed = hatch == null || DATE_SHAPE.test(String(hatch));
    if (!hatchWellFormed) {
      out.push({ rule: 'runway', detail: `stalenessOkUntil ${JSON.stringify(hatch)} is not a YYYY-MM-DD date — a hatch the gate cannot read is a silence nobody granted` });
    }
    const rows = upcomingRows(data, today);
    const next = rows.length ? daysBetween(today, String(rows[0].start).slice(0, 10)) : null;
    if (next !== null && next <= RUNWAY_DAYS) return out; // the runway is long enough; nothing to say
    const stale = next === null
      ? `no upcoming row on or after ${today}`
      : `the next row is ${String(rows[0].start).slice(0, 10)}, ${next} days out — more than the ${RUNWAY_DAYS}-day runway`;
    if (hatchWellFormed && hatch != null) {
      if (String(hatch) >= today) return out; // granted, and `report()` prints it so a green run still says so
      out.push({
        rule: 'runway',
        detail: `${stale}, and the hatch expired on ${hatch} — a hatch that lives forever is exactly the silence this rule exists to end. Fetch first: \`node scripts/events-harvest.mjs\` (dry run) then \`--write\`; if the club genuinely has no date yet, replace stalenessOkUntil with a new date and say why in the commit`,
      });
      return out;
    }
    out.push({
      rule: 'runway',
      detail: `${stale}. Fix it by fetching: \`node scripts/events-harvest.mjs\` (prints the diff) then \`node scripts/events-harvest.mjs --write\`, then rebuild — the snapshot is a copy, and a copy nobody re-fetches is a claim about last week. For a real gap between series, set a dated \`stalenessOkUntil\` in data/events.json and say why in the commit`,
    });
    return out;
  },

  // D318, the assertion the 2026-11-14 read asked for in its own words: "assert in a test that no two VEVENTs
  // share a DTSTART date". Read strictly, that is wrong — the club can legitimately hold two meetings on one
  // day — so the rule is the useful version of it: **no published CANCELLED row shares a group (date, venue,
  // meeting type) with a published live row.** It is computed from the bytes, not from the snapshot, so a
  // publisher that proxies upstream rows is caught by the same rule even if the data is clean.
  (_data, text) => {
    const out = [];
    const groups = new Map();
    for (const block of eventsOf(text)) {
      const u = unfold(block);
      const start = propOf(u, 'DTSTART');
      if (!start) continue;
      const status = String(propOf(u, 'STATUS')?.value ?? 'CONFIRMED').toUpperCase();
      const key = `${String(start.value).slice(0, 8)}|${venueKey({ venue: { raw: propOf(u, 'LOCATION')?.value ?? '' } })}|${meetingKind({ summary: propOf(u, 'SUMMARY')?.value ?? '' })}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ status, uid: propOf(u, 'UID')?.value ?? '(no uid)' });
    }
    for (const [key, members] of groups) {
      const dead = members.filter((m) => m.status === 'CANCELLED');
      const live = members.filter((m) => m.status !== 'CANCELLED');
      if (dead.length && live.length) {
        out.push({
          rule: 'grouping',
          detail: `${dead.length} CANCELLED VEVENT(s) (${dead.map((m) => m.uid).join(', ')}) share the group ${key} with a live one (${live.map((m) => m.uid).join(', ')}) — a subscriber sees a struck-through meeting on the day of the real one (D318)`,
        });
      }
    }
    // And the rows the grouping decided not to publish must actually be absent.
    const dropped = publishableRows(_data.events ?? []).dropped;
    const u = unfold(text);
    for (const d of dropped) {
      if (d.uid && u.includes(`UID:${d.uid}`)) {
        out.push({ rule: 'grouping', detail: `${d.uid} is published although ${d.reason} (D318)` });
      }
    }
    return out;
  },

  // Round-5 communication read B1 (q17, D370): a row the source stopped announcing stays in the snapshot,
  // keeps `STATUS:CONFIRMED`, and reads to every subscriber as upcoming long after the evening passed — two
  // of them on the artifact this round measured. The class becomes a gate because the rule is what makes it
  // unmissable forever: a future harvest that publishes a passed row fails `verify` instead of shipping two
  // live-looking dates to every calendar (D313's class — a rule the reader cannot see is worse than a number,
  // which is why the planting below anchors on the shape, not on today's data). The feed stays **uncapped**
  // (D238: shrinking a calendar feed to a page limit is how a subscriber loses a date they were told about),
  // so this fires on a row that is *stale*, never on a feed that is *short*. A `STATUS:CANCELLED` row is
  // exempt, because retiring a date is the RFC's own mechanism — UID plus a raised SEQUENCE (lines 6267-6272)
  // — which is what keeps D225's and D318's hand-authored cancellations green. `stalenessOkUntil` is
  // deliberately **not** consulted here: the hatch grants silence about *no upcoming row*, not about announcing
  // an evening that already happened as live; the honest states are retire-it or re-fetch, both named below.
  (data, text) => {
    const out = [];
    const today = clubToday(data).replace(/-/g, '');
    for (const block of eventsOf(text)) {
      const u = unfold(block);
      const start = propOf(u, 'DTSTART');
      if (!start) continue;
      const day = String(start.value).slice(0, 8);
      if (!/^\d{8}$/.test(day)) continue;
      const status = String(propOf(u, 'STATUS')?.value ?? 'CONFIRMED').toUpperCase();
      if (status === 'CANCELLED' || day >= today) continue;
      out.push({
        rule: 'stale-live-row',
        detail: `VEVENT ${propOf(u, 'UID')?.value ?? '(no uid)'} publishes as ${status} with DTSTART ${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}, a day already past (${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}) — a subscriber who added this feed is being asked to attend an evening that happened. Retire it the only way RFC 5545 gives: STATUS:CANCELLED with a raised SEQUENCE, hand-authored (.notes/runbooks/event-feed-churn.md §3; the source stops announcing old rows rather than cancelling them), or re-fetch first: node scripts/events-harvest.mjs. The row is never deleted (D72), and the feed is never shortened to dodge this rule (D238).`,
      });
    }
    return out;
  },

  // The superseded list the harvest writes is a record, so it has to agree with the decision the renderer is
  // making right now. A log that names a row the grouping no longer drops is a claim about a row the calendar
  // does publish (D118's "one table" rule applied to a log).
  (data) => {
    const out = [];
    const log = data.superseded;
    if (log == null) return out; // the key only exists after a harvest has run; its absence is not a defect
    if (!Array.isArray(log)) return [{ rule: 'superseded-log', detail: 'superseded is not an array' }];
    const live = new Set(publishableRows(data.events ?? []).dropped.map((d) => d.uid));
    for (const d of log) {
      if (!d?.uid) out.push({ rule: 'superseded-log', detail: 'a superseded entry has no uid' });
      else if (!live.has(d.uid)) {
        out.push({ rule: 'superseded-log', detail: `the log records ${d.uid} as superseded, but the grouping no longer drops it — a stale log is a claim about a row nobody dropped` });
      }
      if (!d?.reason) out.push({ rule: 'superseded-log', detail: `${d?.uid ?? '(no uid)'}: a superseded entry with no reason is a deletion nobody can audit` });
    }
    for (const uid of live) {
      if (!log.some((d) => d.uid === uid)) {
        out.push({ rule: 'superseded-log', detail: `${uid} is superseded by the grouping but is not in the log (D318: every dropped UID is logged)` });
      }
    }
    return out;
  },

  // D319: the published DESCRIPTION is the club's own copy, per meeting type. This is the rule that makes
  // "the publisher normalizes, it does not proxy" (D150) checkable in the calendar file, and it is the reason
  // the organizer's pre-2026 boilerplate cannot come back on the next harvest while the gate is green.
  (data, text) => {
    const out = [];
    const rowsByUid = new Map((data.events ?? []).map((r) => [String(r.uid ?? ''), r]));
    for (const block of eventsOf(text)) {
      const u = unfold(block);
      const uid = String(propOf(u, 'UID')?.value ?? '');
      const desc = propOf(u, 'DESCRIPTION');
      if (!desc) continue;
      const row = rowsByUid.get(uid) ?? { uid };
      const want = escapeText(feedDescription(row));
      if (desc.value !== want) {
        out.push({ rule: 'feed-copy', detail: `${uid}: DESCRIPTION is not the copy src/lib/event-description.mjs generates — the feed proxies upstream boilerplate (D319)` });
      }
      const lower = desc.value.toLowerCase();
      for (const stale of ['algorithms of most any kind', 'post a comment before the date', 'generate topics to discuss']) {
        if (lower.includes(stale)) out.push({ rule: 'feed-copy', detail: `${uid}: DESCRIPTION still carries the organizer's obsolete phrase "${stale}" (D319)` });
      }
      if (!lower.includes('discord.com/invite')) out.push({ rule: 'feed-copy', detail: `${uid}: DESCRIPTION carries no path to where the club actually talks (D319)` });
    }
    for (const [kind, template] of Object.entries(DESCRIPTIONS)) {
      if (template.sentences.length !== 2) out.push({ rule: 'feed-copy', detail: `the ${kind} template has ${template.sentences.length} sentences; the ruled shape is two (D319)` });
      if (!template._source) out.push({ rule: 'feed-copy', detail: `the ${kind} template names no source for its claims (D92)` });
    }
    return out;
  },

  // The hatch above only works if the name is right. A top-level key the gate does not know is either a typo
  // (which would silence a gate for free) or a field some tool started writing (which nobody reviewed), so it
  // fails by name rather than passing through.
  (data) => {
    const out = [];
    for (const k of Object.keys(data)) {
      if (!k.startsWith('_') && !SNAPSHOT_KEYS.includes(k)) {
        out.push({ rule: 'snapshot-keys', detail: `top-level field "${k}" is not one the gate knows — add it to SNAPSHOT_KEYS deliberately, or remove it (a hatch spelled almost right is a silence nobody granted)` });
      }
    }
    return out;
  },

  // The artifact is what a subscriber reads. If the route drifted from the renderer, or the asset layer
  // re-wrote bytes on the way out, this is what notices.
  (_data, text) => {
    if (!existsSync(ARTIFACT)) {
      return [{ rule: 'artifact', detail: `${ARTIFACT} is missing — build first (check:ics audits the shipped bytes, not just the data)` }];
    }
    const shipped = readFileSync(ARTIFACT, 'utf8');
    if (shipped === text) return [];
    const a = shipped.split('\r\n');
    const b = text.split('\r\n');
    const i = a.findIndex((l, j) => l !== b[j]);
    return [{ rule: 'artifact', detail: `${ARTIFACT} differs from the render at line ${i + 1}: shipped ${JSON.stringify(a[i])} vs rendered ${JSON.stringify(b[i])}` }];
  },
];

/** Reported, never failed: a quiet calendar is a fact about the club, not a broken build (record 0010). The
 *  runway line prints the same number the runway rule fails on, so a green run still says how much margin is
 *  left — the day it turns red, the number a reader needs is already in the log above it. */
const report = (data) => {
  const today = clubToday(data);
  const upcoming = upcomingRows(data, today);
  const lines = [];
  const hatch = data.stalenessOkUntil;
  const dropped = publishableRows(data.events ?? []).dropped;
  if (dropped.length) {
    lines.push(`${dropped.length} row(s) superseded by the grouping (D318): ${dropped.map((d) => `${d.uid} (${d.reason})`).join('; ')} — they stay in data/events.json and are never published`);
  }
  const daysTo = (row) => daysBetween(today, String(row.start).slice(0, 10));
  if (!upcoming.length) {
    lines.push(`no upcoming row on or after ${today} (${data.calendar?.timezone ?? 'zone unknown'}) — the page renders its empty state (M6 names a silently stale schedule as the failure mode)`);
    if (hatch != null) lines.push(`hatch: stalenessOkUntil ${hatch}${String(hatch) >= today ? ' is live — the runway rule is staying silent by your explicit grant' : ' has EXPIRED'}`);
    return lines;
  }
  const runway = daysTo(upcoming[0]);
  lines.push(`${upcoming.length} upcoming row(s); next is ${String(upcoming[0].start).slice(0, 10)} (${runway} day(s) away) — runway rule fails below ${RUNWAY_DAYS} days`);
  const soon = upcoming.filter((e) => e.timeConfirmed !== true && daysTo(e) <= 7);
  if (soon.length) lines.push(`${soon.length} row(s) within 7 days still have no confirmed hour — the feed publishes the DATE and the page says "time not set"`);
  if (runway > RUNWAY_DAYS && runway <= RUNWAY_WARN_DAYS) lines.push(`${runway} days of runway — inside the ${RUNWAY_WARN_DAYS}-day warning band: worth a word to the organizer before this becomes the stale-schedule failure (M6)`);
  if (hatch != null) lines.push(`hatch present: stalenessOkUntil ${hatch} (it only matters below ${RUNWAY_DAYS} days, and it expires on its own)`);
  return lines;
};

const run = (data, text) => RULES.flatMap((rule) => rule(data, text));

if (selftest) {
  const clone = () => JSON.parse(JSON.stringify(snapshot));
  // A row put back into the unconfirmed state: what the snapshot looks like whenever the club adds a date and
  // nobody has settled the hour yet (D172).
  const unconfirmed = (d) => { d.events[0].timeConfirmed = false; return d; };
  // Date helpers for the plantings, computed from **the club's own today** (the same `clubToday` the runway rule
  // uses), not from UTC. Two plantings rotted at a UTC date boundary on 2026-11-05 because they shifted off
  // `Date.now()` in UTC while the rule compares against the club's local date: at 18:20 Chicago an "expired hatch"
  // computed as UTC-yesterday *is* club-today, so the hatch read as live and the runway rule correctly stayed silent.
  // The planting, not the rule, was wrong — and a date pinned to a literal rots the same way.
  const TODAY = clubToday(snapshot);
  const shiftDate = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d) + n * 86400000);
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
  };
  const dayShift = (n) => shiftDate(TODAY, n);
  // A planting only tests what it says it tests if its dates sit on the side of `today` it assumes. Assert that
  // here, in one line per offset, rather than letting a drifted date turn a FAIL case silently into a clean run.
  for (const [n, side] of [[-30, '<'], [-1, '<'], [3, '>'], [7, '>'], [40, '>']]) {
    const d = dayShift(n);
    const ok = side === '<' ? d < TODAY : d > TODAY;
    if (!ok) throw new Error(`selftest planting dates have rotted: today${n > 0 ? '+' : ''}${n} = ${d} is not ${side} ${TODAY} (the club's today in ${snapshot.calendar?.timezone ?? 'America/Chicago'})`);
  }
  const moveRow = (row, date) => {
    row.start = `${date}T12:00`;
    row.end = `${date}T14:00`;
    row.timeConfirmed = true;
    return row;
  };
  const plantings = [
    // snapshot-level: a field a harvester or a human got wrong
    { name: 'no-PRODID', data: (d) => { delete d.calendar.prodid; return d; }, rule: 'envelope' },
    { name: 'no-UID', data: (d) => { delete d.events[0].uid; return d; }, rule: 'uid-shape' },
    { name: 'no-SUMMARY', data: (d) => { delete d.events[0].summary; return d; }, rule: 'sourced-rows' },
    { name: 'duplicate-UID', data: (d) => { d.events[1].uid = d.events[0].uid; return d; }, rule: 'uid-shape' },
    { name: 'time-derived-UID', data: (d) => { d.events[0].uid = `${d.events[0].source.dtstamp}-${d.events[0].uid}`; return d; }, rule: 'uid-shape' },
    // The same defect written in the JSON clock's punctuation instead of ICS punctuation. Two plantings for the two
    // punctuation shapes, because the rule now tests both, and a rule branch with no planting is an ungated branch -
    // which is how the compact one came to be missed on 2026-11-05 and the ISO one on 2026-11-06.
    { name: 'iso-time-derived-UID', data: (d) => { d.events[0].uid = `${d.source.fetchedAt}-${d.events[0].uid}`; return d; }, rule: 'uid-shape' },
    // The other half of the same rule: a UID carrying the build date with no time part. Two plantings, because one
    // defect shape per branch is the only way a rule that has two branches is actually gated.
    { name: 'uid-contains-the-build-date', data: (d) => { d.events[0].uid = `${BUILD_DATE}-${d.events[0].uid}`; return d; }, rule: 'uid-shape' },
    { name: 'row-stamp-drifts-from-the-harvest', data: (d) => { d.events[1].source.fetchedAt = '2026-01-01T00:00:00Z'; return d; }, rule: 'dtstamp' },
    { name: 'harvested-Z-instant-published', data: (d) => { d.events[0].start = '2026-11-07T12:00Z'; return d; }, rule: 'raw-upstream-instant' },
    { name: 'timeConfirmed-without-hour', data: (d) => { d.events[0].timeConfirmed = true; d.events[0].start = '2026-11-07'; d.events[0].end = '2026-11-07'; return d; }, rule: 'raw-upstream-instant' },
    { name: 'bad-SEQUENCE', data: (d) => { d.events[0].sequence = 'first'; return d; }, rule: 'sourced-rows' },
    { name: 'unsourced-row', data: (d) => { delete d.events[0].source; return d; }, rule: 'sourced-rows' },
    { name: 'unknown-field-shape-drift', data: (d) => { d.events[0].rsvp_count = 12; return d; }, rule: 'sourced-rows' },
    // D318/D319. The first three plant the defects the grouping and the feed-copy rule exist to catch; the
    // last two are the assertions in the other direction, so a green run means the grouping is firing on the
    // shipped snapshot and not merely always silent.
    { name: 'a-cancelled-twin-published-next-to-a-live-row', text: (t) => t.replace('END:VCALENDAR', [
      'BEGIN:VEVENT',
      'UID:twin-cancelled-planting',
      `DTSTAMP:${String(snapshot.source.fetchedAt).replace(/[-:]/g, '')}`,
      'SEQUENCE:1',
      'DTSTART;TZID=America/Chicago:20261121T120000',
      'DTEND;TZID=America/Chicago:20261121T140000',
      'SUMMARY:MPLS Math Club - Bimonthly Social',
      'LOCATION:Angel Food Bakery 8100 Minnetonka Boulevard 55426 Saint Louis Park Minnesota United States',
      'STATUS:CANCELLED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')), rule: 'grouping' },
    { name: 'the-organizer-s-boilerplate-back-in-the-feed', text: (t) => t.replace(/DESCRIPTION:[^\r]*(?:\r\n [^\r]*)*/, 'DESCRIPTION:We are interested in discussing algorithms of most any kind.'), rule: 'feed-copy' },
    // Round-5 B1 (q17): the class `stale-live-row` exists for. Anchored on the row's **status**, not on a uid or
    // a date — the harvest re-dates rows and this snapshot now carries three cancellations, so a uid-keyed or
    // date-keyed planting stops measuring the day the data moves (D173's rule, the one `zero-length-instant-span`
    // follows). The first live row is moved four days into the past and kept CONFIRMED, which is what a harvest
    // that reads a stale copy leaves behind.
    { name: 'a-past-row-published-as-live', data: (d) => { moveRow(d.events.find((e) => String(e.status ?? 'CONFIRMED').toUpperCase() !== 'CANCELLED'), dayShift(-4)); return d; }, rule: 'stale-live-row' },
    { name: 'a-stale-superseded-log', data: (d) => { d.superseded = [{ uid: 'ghost-row', group: '2026-11-21|angel|social', reason: 'dropped last week' }]; return d; }, rule: 'superseded-log' },
    { name: 'the-grouping-is-silent-on-the-shipped-snapshot', clean: true, rule: 'grouping' },
    { name: 'the-log-matches-the-live-decision', clean: true, data: (d) => { d.superseded = publishableRows(d.events).dropped; return d; }, rule: 'superseded-log' },
    // The "renderer read a clock" defect is not plantable from the data side, and is not asserted here as a
    // source-text rule either (nextDay() legitimately builds a Date from a date string). It is caught by
    // behaviour: `byte-identity` renders the snapshot twice and fails on any difference, which is what a
    // clock read in the renderer would produce.
    // byte-level: defects the renderer will not produce but a proxying publisher would ship verbatim
    { name: 'long-unfolded-line', text: (t) => t.replace('DESCRIPTION:', `DESCRIPTION:${'x'.repeat(200)}`), rule: 'folding' },
    { name: 'lf-only-line-endings', text: (t) => t.replace(/\r\n/g, '\n'), rule: 'folding' },
    { name: 'unescaped-comma', text: (t) => t.replace(/^SUMMARY:.*$/m, 'SUMMARY:Math Club, Minneapolis'), rule: 'escaping' },
    // Four of the traps below only exist on a row published as a DATE, and the shipped rows are now confirmed
    // instants (D174) - so the planting flips the row first. That is not a cheat: "unconfirmed" is a state the
    // snapshot is routinely in again the moment the club adds a date, and a gate that can only plant on the
    // shape today's data happens to hold stops measuring the day the data changes (D173).
    { name: 'proxied-mobilizon-Z', data: unconfirmed, text: (t) => t.replace('DTSTART;VALUE=DATE:20261107', 'DTSTART:20261107T120000Z'), rule: 'zone-on-instants' },
    { name: 'floating-time', data: unconfirmed, text: (t) => t.replace('DTSTART;VALUE=DATE:20261107', 'DTSTART:20261107T120000'), rule: 'zone-on-instants' },
    { name: 'zero-length-date-span', data: unconfirmed, text: (t) => t.replace('DTEND;VALUE=DATE:20261108', 'DTEND;VALUE=DATE:20261107'), rule: 'date-span' },
    { name: 'wrong-DST-offset', text: (t) => t.replace('TZOFFSETTO:-0500', 'TZOFFSETTO:-0700'), rule: 'vtimezone' },
    { name: 'no-VTIMEZONE', text: (t) => t.replace(/BEGIN:VTIMEZONE[\s\S]*?END:VTIMEZONE\r\n/, ''), rule: 'vtimezone' },
    { name: 'dropped-DTEND', data: unconfirmed, text: (t) => t.replace(/^DTEND;VALUE=DATE:20261108\r\n/m, ''), rule: 'vevent-required' },
    // The same three traps on the shape the live rows actually publish (confirmed instants, D174), so the
    // plantings track the shipped artifact rather than a stale copy of it.
    { name: 'Z-on-a-confirmed-instant', text: (t) => t.replace('DTSTART;TZID=America/Chicago:20261107T120000', 'DTSTART:20261107T120000Z'), rule: 'zone-on-instants' },
    { name: 'floating-confirmed-instant', text: (t) => t.replace('DTSTART;TZID=America/Chicago:20261107T120000', 'DTSTART:20261107T120000'), rule: 'zone-on-instants' },
    // Anchored on the SHAPE, not on a date: a literal like `20261107T140000` is a snapshot of one row, and the
    // harvest re-dates rows (D174's confirmed instants), so a date-keyed planting stops measuring the day the
    // feed moves - which is exactly how this one went silent on 2026-11-13. The planting copies whichever
    // DTSTART the renderer emits first into that row's own DTEND, so the span is zero whatever the row is.
    { name: 'zero-length-instant-span', text: (t) => t.replace(/DTSTART;TZID=America\/Chicago:(\d{8}T\d{6})\r\nDTEND;TZID=America\/Chicago:\d{8}T\d{6}/, (m, start) => 'DTSTART;TZID=America/Chicago:' + start + '\r\nDTEND;TZID=America/Chicago:' + start), rule: 'date-span' },
    { name: 'artifact-drift', text: (t) => `${t}BEGIN:VEVENT\r\nUID:ghost\r\nEND:VEVENT\r\n`, rule: 'envelope' },
    // The runway gate (A8, D188). Each of these is a way a published calendar goes quietly stale; the last is
    // an assertion of SILENCE, because a hatch that never works is as wrong as a gate that never fires.
    { name: 'snapshot-holds-nothing-upcoming', data: (d) => { for (const e of d.events) moveRow(e, dayShift(-30)); return d; }, rule: 'runway' },
    { name: 'runway-beyond-N', data: (d) => { for (const e of d.events) moveRow(e, dayShift(40)); return d; }, rule: 'runway' },
    { name: 'cancelled-rows-are-not-runway', data: (d) => { for (const e of d.events) { moveRow(e, dayShift(3)); e.status = 'CANCELLED'; } return d; }, rule: 'runway' },
    { name: 'hatch-expired', data: (d) => { for (const e of d.events) moveRow(e, dayShift(-30)); d.stalenessOkUntil = dayShift(-1); return d; }, rule: 'runway' },
    { name: 'hatch-not-a-date', data: (d) => { for (const e of d.events) moveRow(e, dayShift(40)); d.stalenessOkUntil = 'next month or so'; return d; }, rule: 'runway' },
    { name: 'hatch-name-typo', data: (d) => { d.staleOkUntil = dayShift(30); return d; }, rule: 'snapshot-keys' },
    // The one clean assertion: a live hatch on a stale snapshot must NOT fail. Planted like the others so the
    // selftest proves both directions of the escape hatch.
    { name: 'live-hatch-on-a-stale-snapshot', clean: true, data: (d) => { for (const e of d.events) moveRow(e, dayShift(-30)); d.stalenessOkUntil = dayShift(7); return d; }, rule: 'runway' },
  ];

  let missed = 0;
  for (const p of plantings) {
    const data = p.data ? p.data(clone()) : clone();
    let text;
    try {
      const base = renderCalendar(data);
      text = p.text ? p.text(base) : base;
    } catch (err) {
      // A renderer that refuses to emit the defect is a catch too, as long as the refusal names it.
      console.log(`ok   ${p.name}: the renderer refused (${err.message})`);
      continue;
    }
    const hit = run(data, text).find((f) => f.rule === p.rule);
    if (p.clean) {
      if (hit) { console.log(`FAIL ${p.name}: the rule fired on a state it must stay silent about: ${hit.detail}`); missed += 1; }
      else console.log(`ok   ${p.name}: ${p.rule} stayed silent (the assertion in the other direction)`);
      continue;
    }
    if (hit) console.log(`ok   ${p.name} -> ${hit.rule}: ${hit.detail}`);
    else { console.log(`FAIL ${p.name}: planted a ${p.rule} defect and the gate said nothing`); missed += 1; }
  }
  const clean = run(snapshot, renderCalendar(snapshot)).filter((f) => f.rule !== 'artifact');
  if (clean.length) {
    console.log(`FAIL the clean pass found ${clean.length} finding(s) on the committed snapshot:`);
    for (const f of clean) console.log(`       ${f.rule}: ${f.detail}`);
    missed += 1;
  }
  console.log(`check:ics:selftest — ${plantings.length} plantings, ${missed} undetected`);
  process.exit(missed ? 1 : 0);
}

const text = renderCalendar(snapshot);
const findings = run(snapshot, text);
for (const line of report(snapshot)) console.log(`note  ${line}`);
for (const f of findings) console.log(`FAIL  ${f.rule}: ${f.detail}`);
console.log(
  `check:ics — ${(snapshot.events ?? []).length} row(s), ${text.split('\r\n').length} content lines, ` +
    `${new TextEncoder().encode(text).length} octets, ${findings.length} finding(s) from ${RULES.length} rules`,
);
process.exit(findings.length ? 1 : 0);
