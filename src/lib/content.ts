/**
 * The club's facts, in one place, with their sources — and the rules for what to say when one is missing.
 *
 * Why this module exists (operator request, 2026-11-03: "use placeholders for all the information and
 * content you are missing"): the failure mode this repo keeps hitting is not a missing feature, it is a
 * *sentence the site does not know*. Measured examples, all real: `Math.floor(Math.random()*100+150)+'+
 * members'` rendering a different community size on every request (D136, deleted); "Saturday, 2:00 PM at
 * the Local Library - Study Room B" in `UpcomingMeetups.astro`, entirely invented (.notes/roadmap-events.md);
 * "weekly" surviving two years in four places (D92). A placeholder is only safe if three things are true at
 * once, so this module is where all three live:
 *
 * 1. **A missing fact is a named hole, not an empty string.** `src/content.json` holds `{ value: null,
 *    placeholder: "[venue name + room]", source: null }`, so the bracketed text DESIGN.md's Copy rule
 *    requires is data, and a component cannot accidentally render a bracket to a visitor.
 * 2. **A present fact names its source.** `scripts/check-content.mjs` reports any claim on the page whose
 *    slot has no `source` (that is how "Monthly" stays legal under D92 — the operator ruled it, on
 *    2026-10-31, and the ruling is recorded next to the word).
 * 3. **A hole renders a designed state, never nothing and never a failure** (record 0010). The helpers
 *    below answer "what is there?" and the components answer "what do we say instead?", in the round-7
 *    grammar that was measured (a 305px empty block with two paths out, versus a 47px silence).
 *
 * The local overlay: files under `src/content.local/` (gitignored) deep-merge over the tracked file, in
 * filename order, which is how a preview build shows placeholder photo shot-cards. Nothing *tracked* may
 * turn a placeholder on — `npm run check:content` fails any built page that contains one. Read at build
 * time only: every page that uses this module is prerendered (`src/pages/index.astro` exports
 * `prerender = true`).
 */
import tracked from '../content.json';
import { isObj, openSlots as openTree, unsourcedSlots as unsourcedTree } from './content-slots.mjs';
import { asUpcomingItems, snapshot } from './events.mjs';

export type Slot = {
  value: string | null;
  /** The bracketed text standing in for the fact, e.g. "[venue name + room]". Never rendered to a visitor. */
  placeholder?: string;
  /** Who said so, and where. D92: a frequency claim without one is a fabrication. */
  source?: string | null;
  /** The day the fact was true. The dated lane DESIGN.md requires; `null` means the claim cannot be dated. */
  asOf?: string | null;
  requires?: string;
  note?: string;
};

export type UpcomingItem = {
  /** ISO date, `YYYY-MM-DD`. Parsed as a calendar date, never as an instant, so the page cannot shift a day by running in UTC. */
  date: string;
  /**
   * 24h `HH:MM`, or null to say "time not set" in the date lane (DESIGN.md: never default to 12:00 am).
   * null now has a real cause: a row whose hour the organizer has not confirmed is published as a DATE
   * (D169), so the page says the hour is unknown instead of inventing one.
   */
  time?: string | null;
  /**
   * The other end of the span, same rule as `time`: present only when the organizer confirmed the hour (D172), so a
   * row can print "12:00 pm - 2:00 pm" without ever printing a defaulted hour.
   */
  endTime?: string | null;
  title: string;
  /**
   * The snapshot's own key for the row. The page never prints it; it exists so a file can be attached to a
   * row by name (`src/assets/photos/event-<slug>.png`, PS-4, D190) rather than by position, so adding art is
   * a drop and reordering the list cannot move it to the wrong meeting.
   */
  slug?: string | null;
  /** An optional second line. The row's own name is not repeated there — see `asUpcomingItems`. */
  series?: string | null;
  /** `Scheduled` | `Cancelled` | `Past` — status is a word, never colour or strikethrough alone. */
  status?: string | null;
  /** One navigable line: name, street, city. The organizer's own full string stays in the feed. */
  venue?: string | null;
  /** The organizer's page for this event, when the source has one. */
  url?: string | null;
};

export type Content = {
  cadence: Slot;
  focus: Slot;
  /** What the club is taking up, undated on purpose (see `threads._rule` in content.json). */
  threads: { source: string | null; asOf?: string | null; items: { value: string; gloss?: string }[] };
  /** Club editorial — one thread written for a newcomer. Makes no claim about the club's history. */
  // (the `feature` card — "Steps you can undo" — was cut on the operator's ruling, D149-6c: its mathematics was
  // textbook-correct but its source note ended "checked against nothing but the maths", which is D92's defect class.
  // Do not re-add it as a slot; if the club ever writes about a thread itself, that is a sourced slot of its own.)
  /** The character line the home page prints, and the pool of places a dated event draws from. */
  venues: { value: string; source: string; asOf: string; names?: string[] };
  schedule: {
    source: string | null;
    upcoming: UpcomingItem[];
    empty: { status: string; title: string; body: string; venueLine: Slot };
  };
  venue: Slot;
  membership: Slot;
  photos: { placeholders: boolean };
};

const merge = (base: unknown, over: unknown): unknown => {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out: Record<string, unknown> = { ...(base as object) };
  for (const [k, v] of Object.entries(over as object)) out[k] = merge((base as Record<string, unknown>)[k], v);
  return out;
};

// A pattern rather than an import: `import '../content.local.json'` would be a build error on every clone
// that has not made one, and `import.meta.glob` is the same trick `PhotoSlot.astro` uses to find photos
// that may not exist yet.
// A glob over a **directory**, not a filename, and that is a measured choice: `import.meta.glob
// ('../content.local.json')` was observed on this rig (Vite, Astro 7, 2026-11-03) to match
// `content.local.example.json` as well — a near-miss that would have made the tracked example the
// override and put placeholders in a production build. A pattern with a `/` in it has no such ambiguity:
// `src/content.local/` either exists or does not. Same reason `PhotoSlot.astro` globs for photos that may
// not be there yet: a static `import` of a file that may not exist is a build error on every clone.
// The pattern must be written **inline**: Vite only accepts literals inside `import.meta.glob`, and hoisting
// it to a constant is a hard error in `astro dev` ("Invalid glob import syntax: Could only use literals",
// measured on this rig 2026-11-03). `astro build` did NOT complain, so a variable pattern is red in dev and
// green in the build — the worst possible ordering, and the reason `npm run verify` needs a dev/spawn probe
// (check:deploy) rather than only a build.
const overlays = Object.entries(import.meta.glob('../content.local/*.json', { eager: true, import: 'default' }) as Record<string, unknown>)
  .sort(([a], [b]) => a.localeCompare(b));
if (overlays.length) console.log(`[content.ts] build-time content overlays: ${overlays.map(([k]) => k).join(', ')}`);

export const content = overlays.reduce((acc, [, over]) => merge(acc, over), tracked as unknown) as Content;

/** A slot or list that actually holds something. `null`, `''` and `[]` all mean "not known". */
export const filled = (v: unknown): boolean =>
  v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);

/** The text of a settled slot, or null when the fact is missing. Never returns the bracketed placeholder. */
export const value = (slot: Slot | null | undefined): string | null =>
  slot && typeof slot.value === 'string' && slot.value !== '' ? slot.value : null;

/**
 * The dates the site publishes. They come from `data/events.json` — the club's own calendar, harvested and
 * committed (D70's contract, D73's topology) — not from `src/content.json`, whose `schedule.upcoming` is
 * retired in favour of that file so the landing page and `/events.ics` can never disagree about a date.
 * `src/content.json` keeps the words around them (the empty state, the source note).
 */
export const upcoming = (): UpcomingItem[] => asUpcomingItems() as UpcomingItem[];

/**
 * The open threads, as label + gloss. An item with no `value` is a hole and renders nothing rather than a
 * bracket (record 0010). `gloss` is presentation, not a second claim: the source for the whole set sits on
 * the parent (`threads.source`) and is inherited by the walk in src/lib/content-slots.mjs.
 */
export const threads = (): { label: string; gloss: string | null }[] =>
  (Array.isArray(content.threads?.items) ? content.threads.items : [])
    .filter((t) => typeof t?.value === 'string' && t.value !== '')
    .map((t) => ({ label: t.value, gloss: typeof t.gloss === 'string' && t.gloss !== '' ? t.gloss : null }));

/**
 * True once a schedule source is configured, whether or not it currently holds a date (D132). Since
 * 2026-11-04 the source is the committed snapshot in `data/events.json` (its `source.kind`), so this is no
 * longer a "has the operator provisioned a calendar yet?" flag — it is a fact about the build.
 */
export const scheduleConfigured = (): boolean => filled(content.schedule?.source) || Boolean(snapshot.source?.kind);

/**
 * Retired 2026-11-07 (D239). This used to decide what the hero's label lane said — the next date, or "Nothing
 * scheduled", or the ruled cadence. The operator asked for the hero to introduce the group rather than the next
 * meeting, and the date it printed was already printed 300px lower down inside the compact schedule band, beside
 * the leaf that draws it and the dated line that says when it was copied. The empty-calendar state the round-7
 * ruling was protecting did not go with it: the compact band's own notice carries the status word, the title, the
 * body and the dated line, and `check:render` holds that block to the notice grammar. So the states are here,
 * where a calendar is actually shown, and the hero prints a locator that cannot go stale.
 */

/** "Saturday, 14 Nov" — calendar-date parsing, so a build running in UTC cannot print yesterday's date. */
export const formatDate = (iso: string, style: 'wide' | 'short' = 'short'): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-US', {
    weekday: style === 'wide' ? 'long' : 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(dt);
};

/**
 * One date, in the three pieces a calendar leaf draws: `{ month: 'Nov', day: '7', weekday: 'Sat' }`.
 *
 * It lives beside `formatDate` rather than in the component that draws the leaf for one reason: the parsing
 * is the fragile part. A `new Date('2026-11-07')` is UTC midnight, which a build running in a negative UTC
 * offset prints as Nov 6 — the defect `formatDate`'s `Date.UTC` + `timeZone: 'UTC'` pair exists to prevent.
 * A leaf built by a second parser is a second chance at that bug, and the leaf sits next to a prose date
 * built by the first one, so the disagreement would be visible on the page rather than in a log.
 */
export const dateParts = (iso: string): { month: string; day: string; weekday: string } => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return { month: iso, day: '', weekday: '' };
  const dt = new Date(Date.UTC(y, m - 1, d));
  const at = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(dt);
  return { month: at({ month: 'short' }), day: at({ day: 'numeric' }), weekday: at({ weekday: 'short' }) };
};

/** "7:30 pm", or null — an unset time is stated as "time not set", never defaulted (DESIGN.md, Notices). */export const formatTime = (hhmm: string): string | null => {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m[2]} ${suffix}`;
};

/**
 * The hour the organizer set, as a span: "12:00 pm – 2:00 pm", or "12:00 pm" when only the start is settled,
 * or "time not set" when neither is (D169/D172 — a row published as a DATE has no confirmed hour, and the
 * site says so rather than defaulting to midnight or to "7 pm").
 *
 * It lives here rather than in the row component because both schedule surfaces print it — the homepage's
 * one-date card and every row on `/schedule` — and two copies of the sentence about an hour is two chances
 * for one of them to guess.
 */
export const timeSpan = (row: { time?: string | null; endTime?: string | null }): string => {
  const start = row.time ? formatTime(row.time) : null;
  if (!start) return 'time not set';
  const end = row.endTime ? formatTime(row.endTime) : null;
  return end ? `${start} \u2013 ${end}` : start;
};

/** "Nov 3, 2026" from an ISO calendar date — the dated lane for a fact a human wrote down. Parsed as a
 *  calendar date, never as an instant, so a build running in UTC cannot print the day before. */
export const formatSince = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)));
};

/** The build's own date, for the dated lane of a prerendered page. The only age a static page can compute (D103). */
export const builtOn = (): string => formatSince(new Date().toISOString().slice(0, 10));

/**
 * The day the club's own calendar was last read — "6 Nov 2026", or null when the snapshot does not say.
 *
 * It is the stamp every published `DTSTAMP` in `/events.ics` derives from (`data/events.json`'s
 * `source.fetchedAt`, which `check:ics`'s dtstamp rule asserts row by row), which is the reason the site's
 * "copied from" line reads from here rather than from `builtOn()`: a page that says it was copied on one
 * date and a calendar file whose rows say another is the same defect as a page and a calendar file that
 * disagree about a date.
 */
export const copiedOn = (): string | null => {
  const f = snapshot.source?.fetchedAt;
  return typeof f === 'string' && f.length >= 10 ? formatSince(f.slice(0, 10)) : null;
};

/**
 * Every slot in the tracked content that still needs a human, and every slot that states a claim it cannot
 * source. The walks themselves live in `src/lib/content-slots.mjs` so the gate and the site cannot drift
 * apart — see the header there for why one walk, and for the source-inheritance rule.
 */
export const openSlots = (c: unknown = content) => openTree(c);
export const unsourcedSlots = (c: unknown = content): string[] => unsourcedTree(c).map((u) => u.path);

