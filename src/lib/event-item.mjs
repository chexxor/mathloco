/**
 * The row → item projection, JSON-free on purpose.
 *
 * `src/lib/events.mjs` owns the snapshot: it imports `data/events.json`, applies the review overlay, and
 * answers "what is there". The **shape a page is handed** is pure arithmetic over a row, and it lives here so
 * a `scripts/` or `design/` check can recompute what a page should paint from the same code the page runs —
 * without importing the snapshot, which a plain `node` process cannot do (the JSON import needs an attribute
 * only the bundler supplies). This is the split `event-window.mjs` and `ics-data.mjs` already make, stated in
 * `events.mjs`'s own header: "the date/eligibility/window rules live in a JSON-free module so `scripts/` can
 * check the built page against them instead of against a copy of them" (**D264**, one home per rule).
 *
 * Added by **MS42** for `design/event-field-parity.mjs`, which measures which event facts a built page
 * actually renders. Nothing here decides *which* rows are in a window — that stays in `event-window.mjs`.
 */
import { startDate } from './event-window.mjs';
import { publishedName } from './event-groups.mjs';

/** Whether the organizer has settled the hour. Until then the feed publishes a DATE, not an instant (D169). */
export const hasConfirmedTime = (row) => row.timeConfirmed === true;

/** The hour for a page, or null — an unconfirmed hour is stated as unknown, never defaulted (DESIGN.md). */
export const displayTime = (row) => (hasConfirmedTime(row) ? String(row.start).slice(11, 16) : null);

/** The other end of the span, or null. Same rule as `displayTime`: never a defaulted hour (DESIGN.md). */
export const displayEndTime = (row) => (hasConfirmedTime(row) && row.end ? String(row.end).slice(11, 16) : null);

/** The one-line venue a visitor can navigate to. `raw` is the organizer's string, kept verbatim in the feed. */
export const venueLine = (row) => {
  const v = row.venue;
  if (!v) return null;
  return [v.name, v.street, v.city].filter(Boolean).join(', ');
};

/**
 * `content.ts`'s `upcoming()` shape, so the hero label and the schedule section read events exactly as they
 * read any other club fact: a missing piece is a named hole, and `time: null` renders "time not set".
 *
 * Takes the rows: this module has no snapshot to default them from, which is the whole point of the split.
 * `src/lib/events.mjs` re-exports a wrapper that defaults to `upcomingEvents()`, so no importer changed.
 */
export const asUpcomingItems = (rows) =>
  rows.map((row) => ({
    date: startDate(row),
    time: displayTime(row),
    endTime: displayEndTime(row),
    // The row heading is the site's own word for the format, not the organizer's spelling (D339, round-4 read
    // §3 D-C): `publishedName` maps every name the snapshot carries onto the two formats `/join` already
    // defines, and throws naming the string for a name the site does not define, which fails the build. D92's
    // rule still holds in the other direction — a frequency word stays off the page, and `seriesNote` is still
    // the only second line a row may print. The organizer's spelling survives in `data/events.json` and in
    // `/events.ics` as the organizer's quotation (D189).
    title: publishedName(row),
    // The row's key, not a fact for the page: it used to name a file (`event-<slug>.png`, PS-4, D190), which put the
    // row's date inside the asset's name; R7's rule of 2026-11-16 (D359) names an asset by role + media identity
    // instead, so an attachment still follows the meeting rather than its position in the list, and a filename no
    // longer asserts a date.
    slug: row.slug ?? null,
    series: row.seriesNote ?? null,
    status: String(row.status ?? '').toUpperCase() === 'CANCELLED' ? 'Cancelled' : null,
    venue: venueLine(row),
    url: row.url ?? null,
  }));
