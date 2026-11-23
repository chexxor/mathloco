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
// The date/eligibility/window rules live in a JSON-free module so `scripts/` can check the built page against
// them instead of against a copy of them (the same split `ics-data.mjs` makes for the feed). Re-exported here so
// every existing importer keeps importing one module.
import { isUpcoming, todayInZone } from './event-window.mjs';
export { addDays, HORIZON_WEEKS, MAX_ROWS, scheduleWindow } from './event-window.mjs';
// The published-name vocabulary lives with the grouping rules, so one module decides both which rows are
// one meeting and what that meeting is called on the page (D339, round-4 read §3 D-C). It reaches the page
// through `event-item.mjs`, which imports it directly.
// The row -> item projection lives in a JSON-free module for the same reason the window rules do: a script
// that checks the built page has to recompute what the page should paint from the code the page runs, and a
// plain `node` process cannot import `data/events.json` (MS42, D264). Re-exported here so every existing
// importer keeps importing one module, and the default argument stays here because it is the one thing in
// the signature that needs the snapshot.
import { asUpcomingItems as itemsFromRows } from './event-item.mjs';
export { hasConfirmedTime, displayTime, displayEndTime, venueLine } from './event-item.mjs';

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
export const todayIn = (tz = snapshot.calendar.timezone) => todayInZone(tz);

export const events = () =>
  [...(snapshot.events ?? [])].sort((a, b) => `${a.start} ${a.uid}`.localeCompare(`${b.start} ${b.uid}`));

export const upcomingEvents = (today = todayIn()) => events().filter((e) => isUpcoming(e, today));

/**
 * The row -> item shape a page is handed. The arithmetic lives in `event-item.mjs`; this wrapper only
 * supplies the default rows, which is the part that needs the snapshot.
 */
export const asUpcomingItems = (rows = upcomingEvents()) => itemsFromRows(rows);
