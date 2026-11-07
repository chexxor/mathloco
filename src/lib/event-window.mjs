/**
 * Which event rows a surface shows, and how far ahead it looks — the JSON-free half of the event rules.
 *
 * Why a second module (the same split `ics-data.mjs` makes for the feed): `src/lib/events.mjs` opens
 * `data/events.json` with a plain `import`, which a plain `node script.mjs` cannot do (it needs an import
 * attribute), so a checker that wants the *rules* would have to re-implement them. Duplicating a limit is how
 * two surfaces end up disagreeing — the reason the row count, the date window and the eligibility test all live
 * here instead of inside the component that prints them. `events.mjs` re-exports every one of these, so nothing
 * in `src/` imports this module directly except a page that wants the window; `scripts/` imports it to check the
 * built page against the same rules rather than against a copy of them.
 *
 * ---------------------------------------------------------- how far ahead /schedule lists (D238)
 *
 * Two constants, both reviewed in a diff — the same shape A8 chose for the runway (D188's "no env var at this
 * point"). They exist because `/schedule` had **no ceiling at all**: its full variant printed every open row in
 * the snapshot, so the page grew by one full strip (leaf, copy, PS-4 plate) with every date a host created.
 * Measured cost of one art-bearing row: **+197px** @measured 2026-11-06 by the overflow probe recorded in D224.
 * That is D224's four-cards-on-one-date defect on the homepage, arriving slowly instead of all at once.
 *
 * **`HORIZON_WEEKS = 8`** — the window has to be wider than the longest gap between the club's own dates, or it
 * hides a series whose next date sits just outside it. Both series run on a ~14-day rhythm (one is titled
 * "Bimonthly" in the organizer's feed) @verified 2026-11-06 by `data/events.json`: Nov 7, Nov 11, Nov 21. Six
 * weeks works today and starts hiding dates the first time a host books a month out; eight weeks sits above the
 * longest real gap with a fortnight of slack, and above the runway `check:ics` already insists on (21 days,
 * D188) — so the page cannot go empty for a reason that gate has not already flagged.
 *
 * **`MAX_ROWS = 8`** — the horizon alone does not bound a snapshot that stacks many dates into one week: a
 * Mobilizon host can create several events for one evening, and four rows at one instant is something that
 * already happened (D224). The cap is what makes the page length *bounded*; the horizon is what makes it *stable*.
 *
 * Both limits bind the **page**. `/events.ics` still publishes every row the source has, at any distance (D150,
 * D161): a subscriber's client has its own horizon, and shrinking a calendar feed to match a page limit is how a
 * subscriber loses a date they were told about. The page says what it left out and points at that feed, so the
 * omission is visible rather than silent.
 */

export const HORIZON_WEEKS = 8;
export const MAX_ROWS = 8;

/**
 * Today in a named zone, as `YYYY-MM-DD`, from the runtime's tz database — never from the build host's clock
 * settings. The rule and the reason are `events.mjs`'s: the same commit built on a UTC CI runner and on a UTC-6
 * laptop must not disagree about whether tonight's event is still upcoming (D188).
 */
export const todayInZone = (tz) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const get = (k) => parts.find((p) => p.type === k)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** The date part of a row's start, as a calendar date string. */
export const startDate = (row) => String(row.start ?? '').slice(0, 10);

/**
 * The calendar date a surface should compare, for either shape this repo carries:
 * a snapshot **row** (`start: "2026-11-07T12:00"`, see `data/events.json`) or an **item** already shaped by
 * `asUpcomingItems` (`date: "2026-11-07"`, what `Schedule.astro` is handed). One accessor means one window rule:
 * a limit implemented twice against two shapes is a limit that drifts, and the drift shows up as the page and the
 * gate disagreeing about what is on the page.
 */
export const dateOf = (row) => (row && row.date ? String(row.date) : startDate(row));

/** A row or item a calendar may show as happening: not cancelled, and its day has not finished. */
export const isOpen = (row, today) => {
  if (String(row?.status ?? '').toUpperCase() === 'CANCELLED') return false;
  const d = dateOf(row);
  if (!d) return false;
  return `${d}T23:59` >= `${today}T00:00`;
};

/** Kept as the row-shaped name, because that is what `events.mjs` and the feed code call it with. */
export const isUpcoming = (row, today) => isOpen(row, today);

/** Add whole days to a `YYYY-MM-DD` calendar date without going through an instant — same rule as `isUpcoming`. */
export const addDays = (isoDate, days) => {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

/**
 * The rows a schedule surface should print, plus an honest account of what it is not printing.
 *
 * `rows` is the unfiltered list — snapshot rows or shaped items, see `dateOf`: `isOpen` still owns past and
 * cancelled entries, so a caller cannot print a cancelled date by forgetting a filter. `today` is required: a
 * surface that wants the runtime's own answer calls `events.mjs`'s `todayIn()`, which supplies the snapshot's
 * zone (D188 — a page and its gate comparing windows against different clocks is how a date goes missing).
 *
 * `hiddenHorizon` and `hiddenCap` are kept apart because they need different sentences: dates just past the
 * window are worth telling a visitor about (and the ICS feed carries them), an over-booked week is not.
 */
export const scheduleWindow = (rows, today) => {
  const horizonEnd = addDays(today, HORIZON_WEEKS * 7);
  const open = (Array.isArray(rows) ? rows : [])
    .filter((r) => isOpen(r, today))
    .sort((a, b) => `${dateOf(a)} ${a.uid ?? a.slug ?? ''}`.localeCompare(`${dateOf(b)} ${b.uid ?? b.slug ?? ''}`));
  const inWindow = open.filter((r) => dateOf(r) <= horizonEnd);
  return {
    shown: inWindow.slice(0, MAX_ROWS),
    // The first open date however far out, so a page that printed nothing can still name the next one. A page
    // saying "nothing is scheduled" when a date exists three months out is a lie with a friendly face (D238).
    firstOpen: open[0] ?? null,
    horizonEnd,
    hiddenHorizon: open.length - inWindow.length,
    hiddenCap: Math.max(0, inWindow.length - MAX_ROWS),
    total: open.length,
  };
};
