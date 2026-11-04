/**
 * The event snapshot, read once at build time.
 *
 * `data/events.json` is the derived copy of the club's own calendar (D70's contract: the URL and the row
 * shape are the durable part, the writer is separable; D73's topology: Mobilizon holds the events, this repo
 * keeps a snapshot, and the public site never fetches Mobilizon at request time — Mobilizon down must cost
 * editing, not serving).
 *
 * This module answers "what is there, and when does it start". It never prints anything: `src/lib/ics.mjs`
 * is what turns the same rows into the `.ics` a subscriber reads, and `Schedule.astro` is what turns them
 * into the page. One snapshot, two renderings, so the page and the feed cannot disagree.
 */
import tracked from '../../data/events.json';

// A review-only overlay, the same trick src/lib/content.ts uses for its slots (D120's render-harness note):
// files in gitignored `src/content.local/` merge over the tracked snapshot in filename order, so a session can
// build the page in a state the tracked data does not currently hold - the schedule's empty state most of all,
// since that section stops being empty for only a few weeks a year and its design has to stay measurable. The
// pattern is `events-*.json`, not `*.json`, for the reason content.ts records: a glob that matches everything
// drags in an example file and builds the placeholder state by accident.
//
// The overlay reaches the built /events.ics too, which is correct rather than unfortunate: a review build that
// hides its dates also publishes a feed without them, and `check:ics`'s artifact rule fails any such artifact
// that reaches `verify`.
const overlays = Object.entries(
  import.meta.glob('../content.local/events-*.json', { eager: true, import: 'default' }),
).sort(([a], [b]) => a.localeCompare(b));
const snapshot = overlays.reduce(
  (acc, [, over]) => ({ ...acc, ...over, _harvest: { ...acc._harvest, ...(over._harvest ?? {}), overlaid: true } }),
  tracked,
);

export { snapshot };


/**
 * Today's date in the club's zone, as `YYYY-MM-DD`, computed from the runtime's tz database — never from the
 * build host's clock settings. Measured reason: the same commit built on a UTC CI runner and on a UTC-6
 * laptop must not disagree about whether tonight's event is still upcoming (the same class of bug that made
 * `content.ts` parse `date` fields as calendar dates rather than instants).
 */
export const todayIn = (tz = snapshot.calendar.timezone) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const get = (k) => parts.find((p) => p.type === k)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** The date part of a row's start, as a calendar date string. */
export const startDate = (row) => String(row.start ?? '').slice(0, 10);

/** A row a calendar may show as happening: not cancelled, and its day has not finished. */
export const isUpcoming = (row, today = todayIn()) => {
  if (String(row.status ?? '').toUpperCase() === 'CANCELLED') return false;
  return `${startDate(row)}T23:59` >= `${today}T00:00`;
};

export const events = () =>
  [...(snapshot.events ?? [])].sort((a, b) => `${a.start} ${a.uid}`.localeCompare(`${b.start} ${b.uid}`));

export const upcomingEvents = (today = todayIn()) => events().filter((e) => isUpcoming(e, today));

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
 */
export const asUpcomingItems = (rows = upcomingEvents()) =>
  rows.map((row) => ({
    date: startDate(row),
    time: displayTime(row),
    endTime: displayEndTime(row),
    // The page shows the human-labelled series name when the snapshot has one, because D92 keeps a frequency
    // word off the page ("Bimonthly" is the organizer's own title and stays verbatim in the feed, where it is
    // a quotation rather than the club's claim). `seriesNote` is the only second line a row may print.
    title: row.series ?? row.summary ?? null,
    series: row.seriesNote ?? null,
    status: String(row.status ?? '').toUpperCase() === 'CANCELLED' ? 'Cancelled' : null,
    venue: venueLine(row),
    url: row.url ?? null,
  }));
