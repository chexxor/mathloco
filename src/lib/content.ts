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
// The provenance rule is a plain-JS module, not a TS one, so `scripts/check-provenance.mjs` can read the
// SAME arithmetic the site renders (D238's split: a gate that re-implements the rule it checks is the
// drift the gate is supposed to prevent). Re-exported here so every component keeps importing from
// `content.ts` and there is still one name for the rule.
import { ageSince, formatSince, daysSince, provenanceStamp } from './provenance.mjs';
export { ageSince, formatSince, daysSince, provenanceStamp };

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
   * The snapshot's own key for the row. The page never prints it; it exists so a row can be attached to a
   * file by identity rather than by position, so reordering the list cannot move a picture to the wrong meeting.
   * It used to be the filename: `src/assets/photos/event-<slug>.png` (PS-4, D190) put the row's DATE inside the
   * asset's name, and R7's rule of 2026-11-16 (D359) retires that key — an asset is now named `<role>-<mediaUid>.<ext>`
   * and `src/lib/event-art.ts` carries the file name in the entry, not in the key.
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
  /**
   * What a meeting costs (q05). D376 shipped a refusal here because no source in the tree carried the answer;
   * the round-6 review called that sentence the worst paragraph on the site and the operator granted the
   * answer (D381). A value here is a claim about the club, so its `source` field is the grant itself.
   */
  cost: Slot;
  /**
   * Whether you have to belong to come (q10, D377 -> D381). Not the member LIST - that is `membership`
   * above, whose tally stays off the page (D276). This is the question a first-time visitor asks between
   * "when" and "how do I get in".
   */
  membershipRule: Slot;
  /**
   * How many people are at a table (D385). The only painted headcount the site carries, and the reason
   * `scripts/check-rsvp-page.mjs`'s headcount rule reads this file: a count of people on a page must be a
   * slot with a source and a date, never a leftover from a third-party snapshot (D136, D265).
   */
  turnout: Slot;
  /**
   * What a person brings to a study session, and what the room does not do (D432, round-7 review's
   * `/join`/Add "the uneven bars named honestly"). A claim about the club, so its `source` is the
   * operator's grant and D415 requires it to carry `asOf` and the place the correction lands; that is
   * why it is a slot and not markup on the page. Painted on `/join` only, under the format sentence it
   * reassures. It is NOT the first-meeting rule (`check:content` sees the two as near-duplicates and
   * `design/copy-duplicates.json` carries the pair - they answer what a person carries and what the
   * room does), so deleting one does not silently orphan the other.
   */
  studySessionShape: Slot;
  /**
   * Who a visitor asks for at the table (round-8 review, Home/Add "one sentence naming a human").
   * The sentence the review wrote names a **host name** this tree has no record of, so the shipped
   * value says "the host" rather than inventing one; the name itself comes back by editing this
   * value, which is why D415 makes it a slot and not markup (D444).
   */
  hostLine: Slot;
  /**
   * How long the club has been meeting (round-8 review, Home/Add "one sentence of past"). Nothing
   * in this tree recorded a first meeting, so the slot shipped **empty** and painted nothing: the row
   * was a home for the operator's year, not a fact a seat may fill in (D444). **Filled 2026-11-19** by
   * the operator's vision letter — "The first year was 2019" — and it paints on `/`, under "What we take
   * up" (`src/components/WhyJoinUs.astro`). A bare year is not a calendar date to `check:dated-surfaces`
   * (its DATE_TEXT wants a month name or an ISO date), so it adds no date string to the ruled set (D449).
   */
  pastLine: Slot;
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

/** A list counted in words, capitalised to open a sentence — the round-8 review's "Nine threads the club is
 *  pulling on." The count is read out of `threads()` at the call site rather than typed into markup, so the
 *  sentence cannot disagree with the list under it (D320's one home per rule; `check:threads` fails a `/chat`
 *  that does not carry the list home promises). A spelled count is also the form `check:rsvp-page`'s tally rule
 *  reads, and the noun here is `threads`, not a headcount noun, so nothing painted is a headcount. */
export const countWord = (n: number): string =>
  (['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'])[n] ?? String(n);

/**
 * The answers, in reading order, to the two questions a stranger asks before they decide whether to come:
 * what it costs (q05) and whether you have to belong (q10). They are data in `src/content.json` rather than
 * markup because they are claims with sources - the source is the operator's grant (D381), not a ruling that
 * left the gap open - and because the operator's corrected word is what replaces them one day, from a phone,
 * without anyone touching a component.
 *
 * One helper, two call sites: `/` (HeroSection.astro) and `/join` (join.astro) paint the SAME strings out of
 * this one call, which is what keeps the pair from being edited apart (D247's defect class, inverted: an
 * answer that lives in one place cannot disagree with itself). A surface that renders them renders the whole
 * set; an empty slot drops its sentence rather than painting a bracket (record 0010).
 *
 * The name changed from `refusals()` on 2026-11-16 (D381) with the round-6 review's first "what to do this
 * week" item: the page answers these questions now instead of declining to.
 */
export const answers = (): string[] =>
  [value(content.cost), value(content.membershipRule)].filter((s) => s !== null);

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

// `formatSince`, `ageSince`, `daysSince` and `provenanceStamp` are re-exported from `src/lib/provenance.mjs`
// (D322). They stay importable from here because every component and gate that reads provenance imports
// this module, and the point of D322 is that there is exactly one implementation to import.
//
// Why an age and not the date (D306, 2026-11-14): the operator's `/join` objective made `/schedule` the only
// surface that prints a date, and `check:dated-surfaces` refuses ANY date-shaped string on a page it does not
// list - year-bearing provenance included, which is the hole the 2026-11-14 audit found ("last read Nov 3,
// 2026" on the homepage). An age keeps the freshness a sourced claim owes its reader without putting a
// calendar date on such a page. **D431 (2026-11-18) moved the switch, not the exemption:** the date form is now
// required past `AGE_HONEST` = 1 day rather than past 30, because the only stamp this site prints is set by a
// step a human runs, so an age is never corrected against a newer read - it grows into an apology. On a surface
// ruled date-free, `allowDate: false` keeps the age form, coarsened by `ageSince`: there is no date to print
// there, so an age is the only freshness that surface can carry.

/** The build's own date, for the dated lane of a prerendered page. The only age a static page can compute (D103). */
export const builtOn = (): string => formatSince(new Date().toISOString().slice(0, 10));

// The provenance itself is `provenanceStamp` in `src/lib/provenance.mjs`; `AGE_HONEST` is the one-day window
// that gate and site both read (D431 superseded D322's 30). Nothing here recomputes it.

/**
 * The day the club's own calendar was last read — "on Nov 13, 2026" under D431's threshold ("yesterday" for
 * a stamp taken today or yesterday), or null when the snapshot does not say.
 *
 * It is the stamp every published `DTSTAMP` in `/events.ics` derives from (`data/events.json`'s
 * `source.fetchedAt`, which `check:ics`'s dtstamp rule asserts row by row), which is the reason the site's
 * "copied from" line reads from here rather than from `builtOn()`: a page that says it was copied on one
 * date and a calendar file whose rows say another is the same defect as a page and a calendar file that
 * disagree about a date.
 */
export const copiedOn = (): string | null => {
  const f = snapshot.source?.fetchedAt;
  return typeof f === 'string' && f.length >= 10 ? provenanceStamp(f.slice(0, 10)) : null;
};

/**
 * Every slot in the tracked content that still needs a human, and every slot that states a claim it cannot
 * source. The walks themselves live in `src/lib/content-slots.mjs` so the gate and the site cannot drift
 * apart — see the header there for why one walk, and for the source-inheritance rule.
 */
export const openSlots = (c: unknown = content) => openTree(c);
export const unsourcedSlots = (c: unknown = content): string[] => unsourcedTree(c).map((u) => u.path);

