/**
 * rhythm.mjs — the club's cadence, said in words the site is allowed to say.
 *
 * Why this module exists (round-6 communication review, 2026-11-16, D383). The reviewer's peer table named
 * the missing row as "States a repeatable rhythm — Never stated anywhere", and the letter's own "what to do
 * this week" put stating it second. The repo's rule (D92) is that a **frequency word** may not reach a page
 * unless a source names that exact word, so the honest answer is not "monthly" or "most months" — it is the
 * pattern the calendar file already carries: which weekdays, which hours, which formats. That is derivable
 * from the rows this build publishes, exactly the way `windowSentence` derives the feed's reach from its own
 * `DTSTART`s (D371). A generated sentence cannot go stale with the next harvest; a hand-written one can, and
 * `src/content.json`'s `cadence` slot is the hand-written one that already carries a source for that reason.
 *
 * Two rules the sentence obeys:
 *   1. **No cadence word.** `src/lib/cadence.mjs`'s list is what `scripts/check-content.mjs` fails a build on
 *      when a source does not name it. "Saturdays at noon, Wednesdays at 6 pm" states the rhythm by naming the
 *      days, not by naming a frequency, so it needs no cadence source and cannot contradict one.
 *   2. **Only rows that actually happened or will.** A `STATUS:CANCELLED` row is an announced non-meeting
 *      (D72); deriving the rhythm from it would claim a Saturday noon social the club called off. The
 *      grouping is the same `publishableRows` the feed uses, so one decision decides both surfaces (D264).
 *
 * Node/Vite only, like `event-window.mjs`: no `node:` built-ins, so a plain `node script.mjs` gate can read
 * the same function the page renders (D238's split — a gate that re-implements a rule is the drift it exists
 * to prevent).
 */
import { meetingKind, publishableRows } from './event-groups.mjs';
import { dateOf } from './event-window.mjs';

/** The two formats the site already defines (`SERIES_VOCABULARY` in `src/lib/event-groups.mjs`), in the
 *  lowercase form a sentence uses. A kind outside this table contributes no words, so the rhythm can never
 *  name a meeting type the page does not define. */
const KIND_WORDS = { social: 'a social', study: 'a study session' };

/** 24h start hour → the phrase a person uses for it. Only the hours the club actually uses are named; an
 *  hour outside this table prints the clock, because inventing a nicer word for an hour is inventing a fact. */
const HOUR_WORDS = {
  11: '11 am',
  12: 'noon',
  13: '1 pm',
  17: '5 pm',
  18: '6 pm',
  19: '7 pm',
  20: '8 pm',
};

/** The weekday a row falls on, as a calendar date problem rather than an instant one — the same `Date.UTC`
 *  + `timeZone: 'UTC'` pair `formatDate` and `plainDate` use, so a build on a UTC runner cannot name the
 *  day before the one the organizer wrote (D188). */
const weekdayLong = (isoDate) => {
  const [y, m, d] = String(isoDate ?? '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};

/**
 * One entry per weekday the club books, in the order the calendar lists them:
 * `{ weekday, hour, kinds }` — `kinds` being the `meetingKind` values that meet on that day.
 * Rows with no confirmed hour are skipped: an unconfirmed hour is stated as "time not set" on the page
 * (D169/D172), and a rhythm built on an unset hour is a rhythm invented from a gap.
 */
export const rhythmParts = (rows) => {
  const live = publishableRows(Array.isArray(rows) ? rows : []).rows.filter((r) => r.timeConfirmed !== false);
  const byDay = new Map();
  for (const row of live) {
    const day = weekdayLong(dateOf(row));
    const hour = String(row.start ?? '').slice(11, 13);
    if (!day || !hour) continue;
    const entry = byDay.get(day) ?? { weekday: day, hour: Number(hour), kinds: [] };
    const kind = meetingKind(row);
    if (!entry.kinds.includes(kind)) entry.kinds.push(kind);
    byDay.set(day, entry);
  }
  return [...byDay.values()];
};

/**
 * The sentence itself: `Saturdays at noon for a social, Wednesdays at 6 pm for a study session.`
 *
 * Returns `''` when the calendar holds no live, hour-confirmed row — an empty rhythm renders nothing rather
 * than a claim (record 0010: a hole is a designed state, never a blank and never a failure). With one day it
 * reads as one day; with none it reads as nothing, and the component that prints it is conditional.
 */
export const rhythmSentence = (rows) => {
  const parts = rhythmParts(rows);
  if (!parts.length) return '';
  const clause = (p) => {
    const when = HOUR_WORDS[p.hour] ?? `${p.hour} ${p.hour < 12 ? 'am' : 'pm'}`;
    const day = p.weekday.endsWith('s') ? p.weekday : `${p.weekday}s`;
    // The format words are the two names `event-groups.mjs` already owns (`Social`, `Study session`), so the
    // rhythm sentence cannot invent a third kind of meeting the page never defines.
    const what = p.kinds.map((k) => KIND_WORDS[k] ?? null).filter(Boolean);
    return what.length ? `${day} at ${when} for ${what.join(' or ')}` : `${day} at ${when}`;
  };
  return parts.map(clause).join(', ') + '.';
};
