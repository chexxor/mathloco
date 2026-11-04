/**
 * RFC 5545 primitives — the single place the site turns `data/events.json` into a calendar object.
 *
 * Shared by `src/pages/events.ics.ts` (the thing a subscriber points at) and `scripts/check-ics.mjs`
 * (the gate that can fail it), in the same spirit as `src/lib/content-slots.mjs`: one implementation, so
 * the gate cannot audit a different calendar from the one that ships.
 *
 * Every rule this file enforces is quoted in `.notes/DECISIONS.md` D72, from `tools.ietf.org/rfc/rfc5545.txt`:
 *   - `VCALENDAR` requires `PRODID` and `VERSION`; a `VEVENT` requires `UID`, `DTSTAMP` and (absent a METHOD)
 *     `DTSTART`.
 *   - content lines end in **CRLF** (§3.1) and SHOULD NOT exceed **75 octets**, folded with CRLF + one space
 *     (lines 479-485). `fold()` counts *octets*, not characters: the venue strings are ASCII today, and a
 *     character-count fold would silently break the first curly apostrophe that lands in a DESCRIPTION.
 *   - `TEXT` escapes `\`, `;`, `,` and newlines (§3.3.11).
 *   - an edit reaches a subscriber through **UID + SEQUENCE** (lines 6267-6272), and a UID must not be derived
 *     from the time the component was created (line 6206) — hence `dtstamp()` reads the snapshot's harvest
 *     stamp, not the clock. Two builds of the same snapshot are byte-identical, which is what makes D72's
 *     byte-identity assertion a test instead of a hope.
 *   - instants carry `TZID=America/Chicago` with a `VTIMEZONE`, never a bare `Z` (D169: Mobilizon 5.2.4's
 *     exporter writes wall-clock numbers wearing a `Z`, and read literally that puts a bakery social at 06:00).
 *
 * Node/Vite only: `src/` is build-time and Worker code, so this module uses no `node:` built-ins.
 */

export const CRLF = '\r\n';

/** Escape a string for a RFC 5545 `TEXT` value (§3.3.11). Order matters: backslash first. */
export const escapeText = (s) =>
  String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');

/**
 * Fold one content line to <= 75 octets, continuing with CRLF + a single space (RFC lines 479-485).
 * Iterates code points, so a multi-byte character is never split, and counts the folding space toward the
 * line it starts (that is what the octet budget of a continuation line includes).
 */
export const fold = (text, max = 75) => {
  const enc = new TextEncoder();
  const out = [];
  let cur = '';
  let used = 0;
  for (const ch of String(text)) {
    const octets = enc.encode(ch).length;
    if (used + octets > max) {
      out.push(cur);
      cur = ' ';
      used = 1;
    }
    cur += ch;
    used += octets;
  }
  out.push(cur);
  return out.join(CRLF);
};

/** `NAME;PARAMS:value` folded to the wire. */
export const contentLine = (name, params, value) =>
  fold(`${name}${params ? `;${params}` : ''}:${value}`);

/**
 * `DTSTAMP` for every published VEVENT, derived from the committed harvest stamp rather than the build
 * clock (line 6206 forbids a creation-time UID, and a creation-time DTSTAMP has the same effect one level
 * down: every deploy looks like a change to every subscriber). Accepts `2026-11-04T07:15:30Z`.
 */
export const dtstamp = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(String(iso ?? ''));
  if (!m) throw new Error(`dtstamp: harvest stamp must be YYYY-MM-DDTHH:MM:SSZ, got ${JSON.stringify(iso)}`);
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6]}Z`;
};

/** `2026-11-07T12:00` (a wall clock, no zone on it) -> `20261107T120000`. */
export const localStamp = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(iso ?? ''));
  if (!m) throw new Error(`localStamp: expected YYYY-MM-DD or YYYY-MM-DDTHH:MM, got ${JSON.stringify(iso)}`);
  if (!m[4]) return `${m[1]}${m[2]}${m[3]}`;
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6] ?? '00'}`;
};

/** `20261107` -> `20261108`, in UTC, with no DST assumption anywhere in it. */
export const nextDay = (yyyymmdd) => {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + 1));
  return `${String(d.getUTCFullYear()).padStart(4, '0')}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
};

/** `2026-11-07T12:00` -> `20261107`: the DATE value type, for a row whose hour is not yet confirmed. */
export const dateStamp = (iso) => localStamp(iso).slice(0, 8);

/**
 * A `VTIMEZONE` for the club's zone. Only the offsets and the transition *rules* matter to a subscriber; the
 * `DTSTART` of each component is a fixed point after which the RRULE applies (US rules changed in 2007).
 * `check:ics` does not trust these offsets as typed: it recomputes them from the runtime's tz database with
 * `Intl`, so a typo here goes red instead of shipping a six-hour error (D169's whole point).
 */
export const vtimezone = (tzid) => {
  if (tzid !== 'America/Chicago') {
    // Nothing else is claimed. Adding a zone means adding its transitions and letting the gate check them.
    throw new Error(`vtimezone: no transition table for ${tzid} — add one, do not guess one`);
  }
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${tzid}`,
    'BEGIN:DAYLIGHT',
    'DTSTART:20070311T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0500',
    'TZNAME:CDT',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'DTSTART:20071104T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0600',
    'TZNAME:CST',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
};

/**
 * One `VEVENT`. A row whose wall clock the organizer has not confirmed publishes as a **DATE** (RFC 5545
 * 3.8.2.2/3.8.2.3: DTSTART and DTEND must share a value type, so an all-day event carries DATE on both, and
 * a DATE-valued DTSTART is how a calendar honestly says "this day, hour not yet known"). The alternative —
 * guessing an hour — is the defect D169 quarantined.
 */
export const vevent = (row, calendar) => {
  const status = String(row.status ?? 'CONFIRMED').toUpperCase();
  if (!['CONFIRMED', 'TENTATIVE', 'CANCELLED'].includes(status)) {
    throw new Error(`vevent ${row.uid}: STATUS must be CONFIRMED, TENTATIVE or CANCELLED, got ${row.status}`);
  }
  const lines = [
    'BEGIN:VEVENT',
    contentLine('UID', null, row.uid),
    contentLine('DTSTAMP', null, dtstamp(row.source?.fetchedAt ?? calendar.stamp)),
    contentLine('SEQUENCE', null, String(row.sequence ?? 0)),
  ];

  if (row.timeConfirmed) {
    if (!row.start || !row.end) throw new Error(`vevent ${row.uid}: timeConfirmed but no start/end`);
    lines.push(contentLine('DTSTART', `TZID=${calendar.timezone}`, localStamp(row.start)));
    lines.push(contentLine('DTEND', `TZID=${calendar.timezone}`, localStamp(row.end)));
  } else {
    // A DATE-valued DTEND is EXCLUSIVE (RFC 5545 3.8.2.2), so the day after is what "all day, hour unknown"
    // actually means; repeating the start date would tell every subscriber the event ends as it begins.
    lines.push(contentLine('DTSTART', 'VALUE=DATE', dateStamp(row.start)));
    lines.push(contentLine('DTEND', 'VALUE=DATE', nextDay(dateStamp(row.start))));
  }

  lines.push(contentLine('SUMMARY', null, escapeText(row.summary)));
  lines.push(contentLine('STATUS', null, status));
  if (row.venue?.raw) lines.push(contentLine('LOCATION', null, escapeText(row.venue.raw)));
  if (row.geo) lines.push(contentLine('GEO', null, row.geo));
  if (row.blurb) lines.push(contentLine('DESCRIPTION', null, escapeText(row.blurb)));
  if (row.url) lines.push(contentLine('URL', null, row.url));
  if (row.image) lines.push(contentLine('ATTACH', 'FMTTYPE=image/png', row.image));
  lines.push('END:VEVENT');
  return lines;
};

/** The whole `VCALENDAR`. Deterministic for a given snapshot: sorted, no clock reads, no random ids. */
export const renderCalendar = (data) => {
  const cal = { ...data.calendar, stamp: data.source?.fetchedAt };
  if (!cal.prodid || !cal.timezone) throw new Error('renderCalendar: calendar.prodid and calendar.timezone are required');
  const rows = [...(data.events ?? [])].sort((a, b) =>
    `${a.start} ${a.uid}`.localeCompare(`${b.start} ${b.uid}`),
  );
  const lines = [
    'BEGIN:VCALENDAR',
    contentLine('PRODID', null, cal.prodid),
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(cal.name ? [contentLine('X-WR-CALNAME', null, escapeText(cal.name))] : []),
    // X-WR-* are not in RFC 5545; Google, Apple and Outlook all read them, and without X-WR-TIMEZONE a
    // subscriber that meets the calendar in another zone renders the wall clock in its own.
    contentLine('X-WR-TIMEZONE', null, cal.timezone),
    ...vtimezone(cal.timezone),
    ...rows.flatMap((r) => vevent(r, cal)),
    'END:VCALENDAR',
  ];
  return lines.join(CRLF) + CRLF;
};
