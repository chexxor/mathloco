/**
 * cadence.mjs — D92's frequency words, in one home, because two programs have to agree about them.
 *
 * `scripts/check-content.mjs` forbids a frequency word on a page unless `src/content.json` names where the
 * claim came from, and `scripts/events-harvest.mjs` must say when it is about to create a row whose title
 * carries one (a harvest cannot author a series name, so it copies the organizer's `SUMMARY`; on 2026-11-13
 * that placeholder put "Bimonthly" on `/schedule` twice while the gate printed the hit and passed — D301).
 * The list lived in the gate; a copy of it in the harvester would be two opinions about one rule, and the
 * second opinion is the one that goes stale (D118's "one table" rule, applied to a word list).
 *
 * A word is allowed only when the source **names that word**: naming a different cadence is not a source
 * for this one. `bimonthly` is not covered by a source that says `Monthly`, because the visitor reads a
 * different claim — and because `\bmonthly\b` does not match inside "bimonthly", the comparison cannot pass
 * by accident.
 *
 * Nothing here decides whether a word is *true*. `series.config.mjs` holds the real spacing (two 14-day
 * series, D175) and Mobilizon 5.2.4 has no series object at all (D189), so any cadence word on a page is a
 * claim our artifact makes about a rhythm the source cannot confirm.
 */

export const CADENCE =
  /\b(weeklyn?|weekly|monthly|daily|nightly|biweekly|bimonthly|fortnightly|every other week|every week|every month|each week|twice a month|most months)\b/gi;

/** Every cadence word in `text`, lowercased, with how many times it appears. Fresh regex per call: a shared
 *  /g regex carries `lastIndex` between callers, which is how a scanning gate comes to miss the page it saw
 *  last. */
export const cadenceWords = (text) => {
  const hits = new Map();
  for (const m of String(text ?? '').matchAll(new RegExp(CADENCE.source, 'gi'))) {
    const w = m[1].toLowerCase();
    hits.set(w, (hits.get(w) ?? 0) + 1);
  }
  return hits;
};

/** Does `source` name this exact cadence word? Whole-word and case-insensitive: "Monthly is more generally
 *  correct…" names `monthly`, and does not name `bimonthly`. */
export const sourceNamesWord = (source, word) => {
  const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(String(source ?? ''));
};
