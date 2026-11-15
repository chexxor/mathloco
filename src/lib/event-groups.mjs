/**
 * event-groups.mjs — when two rows of `data/events.json` are the same meeting.
 *
 * Why this module exists (D318, 2026-11-14). The club's Mobilizon instance is edited by hand, and on
 * 2026-11-13 it held two rows for one evening: UID `649bf59a…` `STATUS:CONFIRMED` 2026-11-21T12:00 and UID
 * `99df9996…` `STATUS:CANCELLED` 2026-11-21T12:00, same venue string, same series name
 * (@measured 2026-11-14 by `node scripts/check-ics.mjs` reading `dist/client/events.ics`). A subscriber
 * who added the feed saw a struck-through meeting on the same day as the real one, which is the defect the
 * 2026-11-14 design read named as D1.
 *
 * This is **not** the collision guard in `scripts/events-harvest.mjs` (rule 4, D299). That guard protects a
 * *snapshot row the site has already published as CANCELLED* from being silently rewritten by a feed that
 * re-announces the same UID with a new date. Different problem, different mechanism: the guard refuses a
 * merge on one UID; grouping decides which of several UIDs the *publisher* emits. Both stay in place: the
 * harvest never deletes a row (D72 — a cancelled meeting has to be announced, not vanish), and grouping
 * never un-cancels anything in the data. It only decides what the calendar file and the page show.
 *
 * What "the same meeting" means here, in the order the ruling was written (D318):
 *   1. **the same calendar date** — the DATE part of `start`, not the instant. A re-issue that moves the
 *      hour (12:00–14:00 versus 12:00–13:00, the actual pair) is still the same meeting.
 *   2. **the same venue** — the organizer's raw LOCATION string, byte-normalized. A different venue on the
 *      same day is a different meeting, however similar the titles are.
   3. **the same meeting type** — the series name the page prints (`series`, else `summary`), with every
      cadence word cut out. "MPLS Math Club - Bimonthly Social" and "Matheapolis - Bimonthly Social" are the
      same meeting because the site already rules them the same series (D189, D92); "Bimonthly" is a word
      the page may not print at all (D301), so it cannot be what distinguishes two rows.
 *
 * Within a group:
 *   - if any row is live (CONFIRMED or TENTATIVE), every CANCELLED row in that group is not published;
 *   - if every row is CANCELLED, the highest `SEQUENCE` is published and the rest are not — RFC 5545
 *     (lines 6267-6272) makes UID+SEQUENCE the only way a client learns which copy is the current one, so
 *     publishing two cancellations of one meeting is two announcements of one fact.
 *
 * Every dropped row is *reported*, never removed from the data: `scripts/events-harvest.mjs` prints each
 * dropped UID and writes the list into the snapshot under `superseded`, and `scripts/check-ics.mjs` asserts
 * that nothing the grouping supersedes reaches the published bytes. A group whose rows differ only in hour
 * and are both live is left alone — the club has never had two distinct meetings of the same series at the
 * same venue on the same day, and if it ever does, the drop log is where a human sees the decision being
 * made.
 */
import { cadenceWords } from './cadence.mjs';

/** Lowercase, punctuation-free, single-spaced: the shape two strings must be in to be compared. */
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** A row's status, uppercased, with the RFC default for a component that states none. */
export const statusOf = (row) => String(row?.status ?? 'CONFIRMED').toUpperCase();

/**
 * The meeting's type. Cadence words are cut because the page is not allowed to print them without a source
 * that names them (D92, D301), so a row cannot be told apart from another by a word the site already refuses
 * to say.
 */
export const meetingType = (row) => {
  const name = String(row?.series || row?.seriesNote || row?.summary || '');
  let cut = name;
  for (const word of cadenceWords(name).keys()) {
    cut = cut.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
  }
  return norm(cut);
};

/**
 * The kind a grouping and a description template can both use. "MPLS Math Club - Bimonthly Social" and
 * "Matheapolis - Bimonthly Social" are the same meeting under either spelling (both @measured 2026-11-14 in
 * `dist/client/events.ics`), and the wire only carries the organizer's `SUMMARY`, so a byte-level gate can
 * only compare kinds, not names. Anything the repo has not named keeps its own name as its kind, so an
 * unfamiliar series is never merged into a known one by accident.
 */
export const meetingKind = (row) => {
  const type = meetingType(row);
  if (/(^|\b)(social|meetup|gathering|book club)(\b|$)/.test(type)) return 'social';
  if (/(^|\b)(study|parallel learning|workshop|session)(\b|$)/.test(type)) return 'study';
  return type;
};

/** The venue as one comparable string. `raw` is the organizer's own text, kept verbatim in the feed (D92). */
export const venueKey = (row) => {
  const v = row?.venue ?? {};
  return norm(v.raw || [v.name, v.street, v.city].filter(Boolean).join(' '));
};

/** The calendar date a row sits on — the same accessor `event-window.mjs` uses for its window. */
export const dayOf = (row) => String(row?.start ?? '').slice(0, 10);

/** The three-part key, joined with `|` so a reader can see which part disagreed in a report. */
export const groupKey = (row) => `${dayOf(row)}|${venueKey(row)}|${meetingKind(row)}`;

/** Rows bucketed by that key, in snapshot order, each with its index (a UID is not the identity here: two
 *  rows can share a UID in a broken snapshot, and `check:ics` catches that separately). */
export const groupRows = (rows) => {
  const groups = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row, i) => {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ row, i });
  });
  return groups;
};

/**
 * The rows a calendar may publish, plus the rows it is superseding and why.
 *
 * Returns `{ rows, dropped }`. `rows` keeps the snapshot's order; `dropped` is a log, one entry per row the
 * publisher will not emit, each naming the UID, the group key that decided it, and the UID that won.
 */
export const publishableRows = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  const keep = new Set();
  const dropped = [];
  const nameOf = (m) => m.row.uid ?? `row #${m.i + 1}`;

  for (const [key, members] of groupRows(list)) {
    const live = members.filter((m) => statusOf(m.row) !== 'CANCELLED');
    if (live.length) {
      live.forEach((m) => keep.add(m.i));
      for (const m of members) {
        if (statusOf(m.row) === 'CANCELLED') {
          dropped.push({
            uid: nameOf(m),
            group: key,
            kept: live.map(nameOf),
            reason: `a live row in the same group (${live.map(nameOf).join(', ')}) supersedes this CANCELLED row`,
            sequence: Number(m.row.sequence ?? 0),
            start: m.row.start ?? null,
            summary: m.row.summary ?? null,
          });
        }
      }
      continue;
    }
    // All CANCELLED: the highest SEQUENCE is the current announcement of the cancellation.
    const best = members.reduce((a, b) =>
      Number(b.row.sequence ?? 0) > Number(a.row.sequence ?? 0) ? b : a,
    );
    keep.add(best.i);
    for (const m of members) {
      if (m.i === best.i) continue;
      dropped.push({
        uid: nameOf(m),
        group: key,
        kept: [nameOf(best)],
        reason: `the group holds only cancellations, so the highest SEQUENCE (${best.row.sequence ?? 0}) is the one published`,
        sequence: Number(m.row.sequence ?? 0),
        start: m.row.start ?? null,
        summary: m.row.summary ?? null,
      });
    }
  }

  return { rows: list.filter((_, i) => keep.has(i)), dropped };
};

/** The published rows only — the shortcut for a caller that does not need the log. */
export const publishableOnly = (rows) => publishableRows(rows).rows;
