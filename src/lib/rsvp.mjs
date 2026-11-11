/**
 * Which sign-up pages a printed date actually has — the JSON-free half of the RSVP rules.
 *
 * Why this module exists (S019, D265, 2026-11-10). The operator's ruling is that the site does not need an
 * RSVP page of its own: "the website just needs functionality to make it easy for a user to rsvp at a site
 * that they prefer to rsvp on", and "only support RSVPs for what exists in mobilizon". So the affordance is
 * a per-date cluster of links sitting on the row that already prints the date, and the set of dates it may
 * appear on is exactly the set `src/lib/event-window.mjs` decides to print.
 *
 * The same split `event-window.mjs` and `ics-data.mjs` make (D238): a rule implemented in two places is a
 * rule that drifts. This file is imported by `src/components/SignUpLinks.astro` (used by `EventRow.astro`
 * and the homepage's compact card), by `scripts/meetup-events.mjs --check`, by `scripts/discord-events.mjs
 * --check`, by `scripts/check-rsvp.mjs` and by `scripts/check-rsvp-page.mjs`. A component that stops calling
 * it, or a gate that hard-codes its own regex, is caught by the page gate comparing the built bytes against
 * this code.
 *
 * Three facts this module owns and nobody else may re-derive:
 *   1. **`MEETUP_URL_SHAPE`** — the only place the Meetup event URL pattern is written. The reader
 *      (`scripts/meetup-events.mjs`) and both gates import it (D264: two copies of a shape check is how a
 *      bad URL reaches a page with every gate green).
 *   2. **`DISCORD_EVENT_URL_SHAPE`** — the same argument for the guild scheduled-event URL, so the harvester
 *      and the page gate cannot disagree about what a Discord event page looks like (D274).
 *   3. **the match key** — date + wall-clock `HH:MM` (docs/spec/source-contract.md §2). Meetup and Mobilizon
 *      are two calendars (measured 2026-11-09: 4 Mobilizon rows, 26 Meetup records); attaching a sign-up link
 *      to a date whose hour the organizer has not settled would attach it to a meeting that may not be the
 *      one the page is describing.
 *
 * What it deliberately does not do: read `going.totalCount` or `user_count`. `meetupView` and `discordView`
 * below are whitelists, and they are the mechanism behind "no headcount is printed anywhere" (S019, D265) —
 * a count cannot be painted by a component that never receives it. `scripts/check-rsvp-page.mjs` asserts the
 * same thing from the other end, on the painted bytes.
 */
import { dateOf } from './event-window.mjs';

/** A Meetup event URL this build is willing to print. Measured 2026-11-09 (`scripts/meetup-events.mjs`):
 *  both the numeric id form and the series-occurrence token form answer 200. Written once, here. */
export const MEETUP_URL_SHAPE = /^https:\/\/www\.meetup\.com\/[a-z0-9-]+\/events\/[0-9a-z]+\/$/;

/** Meetup's own status word for a date that is still happening (`ACTIVE`); `PAST` rows are in the snapshot
 *  so the history is auditable, but a sign-up link may never point at one. */
export const MEETUP_OPEN = 'ACTIVE';

/** A Discord guild scheduled-event URL this build is willing to print. Written once, here, for the same reason
 *  as `MEETUP_URL_SHAPE` (D264). Measured 2026-11-11 (curl, browser UA, redirects followed, Linux native): both
 *  `discord.com/events/<guild>/<event>` and the trailing-slash form answer 200 for the club's pilot event; the
 *  harvester always writes the trailing-slash form, so the shape is the form a link can actually carry. */
export const DISCORD_EVENT_URL_SHAPE = /^https:\/\/discord\.com\/events\/\d+\/\d+\/$/;

/** `GuildScheduledEventStatus`: 1 Scheduled and 2 Active are still sign-up paths; 3 Completed and 4 Cancelled
 *  are not. @retrieved 2026-11-11 from `node_modules/discord-api-types/payloads/v10/guildScheduledEvent.d.ts`
 *  (the enum the vendored Discord types carry, which is the same enum the API returns — the pilot event in the
 *  club's guild answers `status: 1`). */
export const DISCORD_OPEN_STATUS = [1, 2];

/** `GuildScheduledEventPrivacyLevel` has exactly one value in v10, `GuildOnly = 2`, so every guild scheduled
 *  event is readable only by members of that guild. That is not a defect to hide: a visitor who is not yet a
 *  member is asked to join the server before the RSVP, which is why the label says *sign up on Discord* rather
 *  than promising a headcount-free one-click attend. @retrieved 2026-11-11 from the same file. */
export const DISCORD_GUILD_ONLY = 2;

/** The age `data/meetup-events.json` may be before the gate calls it stale, in days.
 *  There is one threshold and one failure, because there is one fix: `node scripts/meetup-events.mjs --write`.
 *  The 28-day "expired" tier this module used to carry is deleted (D272): two numbers that both stop the
 *  build are one rule wearing two names, and a build that fails twice for the same reason teaches the next
 *  session to read the gate as flaky. Shorter than `check:ics`'s 21-day runway (D188) because a sign-up
 *  page is created and retired far faster than a date is. */
export const SNAPSHOT_FRESH_DAYS = 14;

/** A platform name, spelled one way, so the markup and the gate cannot disagree about it. The KEY (`meetup`) is
 *  what `LINK_KEYS` and this module index by; the VALUE (`Meetup`) is what a person reads, and it is what
 *  `data-rsvp-platform` carries — `check-rsvp-page.mjs` compares that attribute against `d.platform`, so the
 *  painted handle is the value, not the key. */
export const PLATFORMS = { meetup: 'Meetup', discord: 'Discord', facebook: 'Facebook' };

/** Each platform's key in `config.URLs`. The config file names its links the way the components that already
 *  read them do (`URLs.meetupGroup`, `URLs.discordInvite`); the resolver and the probe handles use the short
 *  platform name. Two spellings of one thing is exactly the drift this module exists to prevent, so the
 *  mapping is written here once and nowhere else (D264). */
export const LINK_KEYS = { meetup: 'meetupGroup', discord: 'discordInvite', facebook: 'facebookGroup' };

/** How old a printed link's verification stamp may be before the gate calls it a promise nobody has checked,
 *  in days. The same 60-day rule `check:figures` applies to a measured number in DESIGN.md (D151): a number
 *  and a URL are the same kind of thing — a claim about the world that was true when someone looked at it. */
export const LINK_STAMP_DAYS = 60;

/** The group's own join page — the destination when a printed date has no event page of its own. Derived
 *  from the configured group URL rather than typed, so the two can never disagree (D241's "one source per
 *  fact" rule). Measured 2026-11-10: `…/minneapolis-mathematics-book-club/join` answers 200. */
export const joinUrl = (urls = {}) => `${String(urls?.meetupGroup ?? '').replace(/\/+$/, '')}/join`;

/** The wall-clock hour a row or item carries, or null when the organizer has not settled it (D169). Accepts
 *  both shapes `dateOf` accepts, so the link rule reads the same clock as the window rule: an item already
 *  shaped by `asUpcomingItems` (`time: "18:00"`) and a raw snapshot row (`start: "2026-11-11T18:00"`). The
 *  anchor is on the `T`, not on the string start, because the instant shape begins with the date — a
 *  `^(\d{2}:\d{2})` test matched nothing on a raw row and every row then fell into the "hour unknown" branch.
 *  @measured 2026-11-10 by `node -e "import('./src/lib/rsvp.mjs').then(r=>console.log(r.hourOf({start:'2026-11-11T18:00'})))"` -> 18:00. */
export const hourOf = (item) => {
  if (item && item.time) return String(item.time);
  // A raw row's hour is not the club's hour until a human says so. `src/lib/events.mjs`'s `displayTime` uses
  // exactly this test (`hasConfirmedTime`), and the link rule must read the same clock the row prints, or a
  // row that says "time not set" would attach its sign-up link to whichever Meetup page happens to share the
  // date and an hour the site has not published (D169, D172).
  if (!item?.timeConfirmed) return null;
  const m = /T(\d{2}:\d{2})/.exec(String(item?.start ?? ''));
  return m ? m[1] : null;
};

/**
 * Whether `config.URLs` is fit to print.
 *
 * The other half of `check:rsvp`, in the same module as the snapshot half, for the same reason (D264): a rule
 * written in two places is a rule that drifts. `scripts/check-rsvp.mjs` calls it, and `--links` re-measures
 * the stamps it requires.
 *
 * A platform key must exist, even when it is empty — that is what makes "Facebook is not on this site" a
 * declared state rather than an omission nobody chose. A non-empty URL must carry a stamp: a link printed on a
 * page is a promise about a site the club does not control, and the only evidence that the promise holds is a
 * status code somebody fetched and dated.
 */
export const linkFindings = (config = {}, nowMs = Date.now()) => {
  const urls = config?.URLs ?? {};
  // The stamps live beside the links they stamp (`URLs._verified`) so a reader sees the claim and its evidence
  // in one block; a top-level `_verified` is accepted too, so the gate is not coupled to one indentation.
  const stamps = urls._verified ?? config?._verified ?? {};
  const problems = [];

  for (const [platform, key] of Object.entries(LINK_KEYS)) {
    if (!(key in urls)) problems.push(`config.URLs has no ${key} entry — ${platform} is a platform the resolver knows about, so it must be declared, even when it is empty (an unchosen platform is not the same thing as a closed one)`);
    const url = urls[key];
    if (!url) continue;   // an empty entry paints nothing, so there is nothing to verify
    if (!/^https:\/\/[^\s]+$/.test(url)) problems.push(`URLs.${key} is not a URL a browser can follow: ${url}`);
    const stamp = stamps[key];
    if (!stamp) { problems.push(`URLs.${key} is printed on pages but nothing has ever checked it: add _verified.${key} (npm run check:rsvp:links measures and stamps them)`); continue; }
    const at = Date.parse(stamp.verifiedAt ?? '');
    if (!Number.isFinite(at)) { problems.push(`_verified.${key}.verifiedAt is not a date: ${stamp.verifiedAt}`); continue; }
    const age = (nowMs - at) / 86400000;
    if (age < 0) problems.push(`_verified.${key} is stamped in the future: ${stamp.verifiedAt}`);
    if (age > LINK_STAMP_DAYS) problems.push(`_verified.${key} was read ${age.toFixed(0)} days ago; the limit is ${LINK_STAMP_DAYS} days (npm run check:rsvp:links re-measures it)`);
    if (typeof stamp.status !== 'number' || stamp.status >= 400) problems.push(`URLs.${key} last answered ${stamp.status} — a dead link is printed as a way in`);
  }
  for (const key of Object.keys(urls)) {
    if (!Object.values(LINK_KEYS).includes(key) && !key.startsWith('_')) problems.push(`config.URLs carries a link no rule knows about: ${key}`);
  }
  // A `_`-prefixed key in the stamp block is prose about the stamps (the config's own `_how` note), not a stamp.
  for (const key of Object.keys(stamps)) {
    if (!key.startsWith('_') && !Object.values(LINK_KEYS).includes(key)) problems.push(`the verification block stamps a platform this build has no rule for: ${key}`);
  }
  return problems;
};

/** Age of a snapshot in days, from the instant it says it was read. Returns null when there is no stamp —
 *  an unstamped snapshot is not "fresh", it is unknown, and the gate fails it. */
export const snapshotAgeDays = (snap, nowMs = Date.now()) => {
  const fetchedAt = snap?.source?.fetchedAt;
  if (!fetchedAt) return null;
  const ms = Date.parse(fetchedAt);
  if (!Number.isFinite(ms)) return null;
  return (nowMs - ms) / 86400000;
};
/** The only fields of a Meetup record a surface may ever see. Anything not in this list is dropped before a
 *  component touches it — the headcount rule is a projection, not a convention (S019, D265). */
export const meetupView = (e) => ({
  id: String(e?.id ?? ''),
  url: String(e?.url ?? ''),
  title: e?.title ?? null,
  date: e?.date ?? null,
  time: e?.time ?? null,
  status: String(e?.status ?? '').toUpperCase(),
});

export const DISCORD_STATUS_NAMES = { 1: 'scheduled', 2: 'active', 3: 'completed', 4: 'cancelled' };

/** The only fields of a Discord scheduled event a surface may ever see. `user_count` is deliberately not in
 *  this list: the guild's RSVP tally is a third party's headcount, and D265 keeps headcounts off every painted
 *  surface (S019, D274). */
export const discordView = (e) => ({
  id: String(e?.id ?? ''),
  url: String(e?.url ?? ''),
  title: e?.title ?? null,
  date: e?.date ?? null,
  time: e?.time ?? null,
  status: Number(e?.status),
  statusName: DISCORD_STATUS_NAMES[Number(e?.status)] ?? `status ${e?.status}`,
});

/** Discord scheduled events that are open, dated and shaped like a real event page. */
export const openDiscordEvents = (events = []) =>
  (Array.isArray(events) ? events : [])
    .map(discordView)
    .filter((e) => DISCORD_OPEN_STATUS.includes(e.status) && e.date && DISCORD_EVENT_URL_SHAPE.test(e.url))
    .sort((a, b) => `${a.date} ${a.time ?? ''} ${a.id}`.localeCompare(`${b.date} ${b.time ?? ''} ${b.id}`));

/** Meetup records that are open, dated and shaped like a real event page. Past records, records with no
 *  date, and URLs that do not match `MEETUP_URL_SHAPE` are not sign-up paths, whatever the snapshot says. */
export const openMeetupEvents = (events = []) =>
  (Array.isArray(events) ? events : [])
    .map(meetupView)
    .filter((e) => e.status === MEETUP_OPEN && e.date && MEETUP_URL_SHAPE.test(e.url))
    .sort((a, b) => `${a.date} ${a.time ?? ''} ${a.id}`.localeCompare(`${b.date} ${b.time ?? ''} ${b.id}`));

/**
 * Every way the Discord snapshot can be unfit to build from, as sentences that name the fix.
 *
 * Same shape as `snapshotFindings()` for the same reason (D264): the harvester's own `--check` and the gate
 * `check:rsvp` call this one function, so a defect cannot be described one way by the writer and another way
 * by the reader.
 */
export const discordSnapshotFindings = (snap, nowMs = Date.now()) => {
  const problems = [];
  const age = snapshotAgeDays(snap, nowMs);
  if (!snap?.source?.fetchedAt) {
    problems.push('no fetchedAt — the Discord snapshot does not say when it was read (run npm run events:discord)');
  } else if (age === null) {
    problems.push(`fetchedAt is not a readable instant: ${snap.source.fetchedAt}`);
  } else if (age > SNAPSHOT_FRESH_DAYS) {
    problems.push(`Discord snapshot is ${age.toFixed(1)} days old; the limit is ${SNAPSHOT_FRESH_DAYS} days (npm run events:discord re-reads the guild)`);
  }
  if (!snap?.source?.guildId) problems.push('the Discord snapshot names no guild, so its events cannot be attributed to the club\u2019s server');
  if (!Array.isArray(snap?.events)) problems.push('no events array in the Discord snapshot');
  for (const e of snap?.events ?? []) {
    if (!e.id) problems.push('a Discord event has no id');
    if (!e.url || !DISCORD_EVENT_URL_SHAPE.test(String(e.url))) problems.push(`Discord event ${e.id} has a url this build cannot trust: ${e.url}`);
    if (!e.date) problems.push(`Discord event ${e.id} has no local date`);
    if (typeof e.user_count === 'number') problems.push(`Discord event ${e.id} carries an RSVP headcount (${e.user_count}) in the snapshot — the projection drops it, so the harvester must not store it (D265)`);
  }
  return problems;
};

/**
 * Every way the Meetup snapshot can be unfit to build from, as sentences that name the fix.
 *
 * This is the whole `check:rsvp` rule, in the library, so `scripts/meetup-events.mjs --check` (the harvester's
 * own sanity pass) and `scripts/check-rsvp.mjs` (the gate) are the same code path rather than two
 * paraphrases of it. Pure: it takes the parsed snapshot and the clock, touches no file, so the gate's
 * selftest can plant each defect in memory.
 */
export const snapshotFindings = (snap, nowMs = Date.now()) => {
  const problems = [];
  const age = snapshotAgeDays(snap, nowMs);
  if (!snap?.source?.fetchedAt) {
    problems.push('no fetchedAt — the snapshot does not say when it was read, so nothing printed from it can be dated (run node scripts/meetup-events.mjs --write)');
  } else if (age === null) {
    problems.push(`fetchedAt is not a readable instant: ${snap.source.fetchedAt}`);
  } else if (age > SNAPSHOT_FRESH_DAYS) {
    problems.push(`snapshot is ${age.toFixed(1)} days old; the limit is ${SNAPSHOT_FRESH_DAYS} days (a sign-up page is created and retired faster than a date)`);
  }
  if (!Array.isArray(snap?.events) || !snap.events.length) problems.push('no events in the snapshot');
  for (const e of snap?.events ?? []) {
    if (!e.id) problems.push('an event has no id');
    if (!e.url || !MEETUP_URL_SHAPE.test(String(e.url))) problems.push(`event ${e.id} has a url this build cannot trust: ${e.url}`);
    if (!e.date) problems.push(`event ${e.id} has no local date`);
    if (e.going !== null && typeof e.going !== 'number') problems.push(`event ${e.id} has a going count that is not a number: ${e.going}`);
  }
  return problems;
};

/** How many of the open pages printed on this date the record's own clock settles. The same function serves
 *  both calendars, because the contract's key is the same for both: date + wall-clock hour. A settled hour
 *  matches exactly; an unsettled one may only match when the date has exactly one page, so a link is never
 *  attached to a meeting the record does not describe (docs/spec/source-contract.md §2). */
const matchPages = (onDate, hour) => {
  if (hour) return onDate.filter((e) => e.time === hour);
  return onDate.length === 1 ? onDate : [];
};

/** Which platform, if any, holds the sign-up page this row points at. `several` outranks the single hits
 *  because the row then has to say so rather than pick one (see `noteFor`). */
const stateFor = (matching, discordMatching) => {
  if (matching.length > 1) return 'several';
  if (matching.length === 1) return 'meetup';
  if (discordMatching.length) return 'discord';
  return 'none';
};

/** The row's own sentence for the hole, written from what the snapshots prove rather than from an assumption.
 *  DESIGN.md's "States" rule: an absence is a named state, never a blank. A date with a Discord event page and
 *  no Meetup page has no hole to name, so it gets no sentence (D274). */
const noteFor = (matching, onDate, discordMatching) => {
  if (matching.length > 1) return 'Meetup has more than one page for this date.';
  if (matching.length === 1) return null;
  if (discordMatching.length) return null;
  if (onDate.length) return 'Meetup has a page for this date at a different time.';
  return 'No sign-up page for this date yet — ask in the chat and the club will tell you when it is posted.';
};

/**
 * The sign-up cluster for one printed date.
 *
 * `item` is either a snapshot row (`start: "2026-11-11T18:00"`, `timeConfirmed: true`) or an item already
 * shaped by `asUpcomingItems` (`date`, `time` — `time` is null when the organizer has not settled the hour,
 * D169). `dateOf` and `hourOf` accept both, so the window rule and the link rule read the same date and
 * the same clock and cannot disagree about which date a row is.
 *
 * `urls` is `config.URLs`. A platform with no verified URL is simply absent from the returned list: the
 * control is not rendered, and `check-rsvp-page.mjs` asserts that no control exists for a platform with no
 * URL rather than trusting this function's silence (S019's open question 3 — the Facebook group).
 *
 * `discordEvents` is `data/discord-events.json`'s `events` array, harvested from the guild's own scheduled
 *  events (D274). A date with a Discord event page gets that page as its sign-up path; a date with only the
 *  invite gets the chat, labelled as the chat, so a visitor is never told to RSVP on a platform that has no
 *  page for the date.
 *
 * Returns:
 *   state: 'meetup'  — exactly one Meetup page for this date and hour
 *          'several' — more than one Meetup page matches; each is printed with its own title, because
 *                      guessing which one is the club's meeting is a worse failure than printing two
 *          'discord' — no Meetup page matches, but the guild's own scheduled event for this date and hour does
 *          'none'    — neither calendar has a page. `otherOnDate` counts Meetup pages on the date whose hour
 *                      differs, so the row's wording stays true ("no page for this date" only when there
 *                      really is none, not when there is one at a different clock).
 *   destinations: ordered, primary first — Meetup, then Discord, then Facebook. Each is { platform, href,
 *                 label, srOnly } — the exact four strings the component paints, so the gate compares painted
 *                 bytes with this list.
 */
export const signUpPaths = (item, meetupEvents = [], urls = {}, discordEvents = []) => {
  const date = dateOf(item);
  const hour = hourOf(item);
  const onDate = openMeetupEvents(meetupEvents).filter((e) => e.date === date);
  const matching = matchPages(onDate, hour);
  const discordOnDate = openDiscordEvents(discordEvents).filter((e) => e.date === date);
  const discordMatching = matchPages(discordOnDate, hour);

  const destinations = [];
  // A label that already names the platform needs only the mode of opening; a label that is an event title
  // has to carry the platform too, or a screen reader hears two identical-looking links (D273).
  const named = (platform) => `${platform}, opens in a new tab`;
  const titled = (platform) => ` on ${platform}, opens in a new tab`;

  if (matching.length) {
    // One page: the short label the row already carries. Several: the event's own title, so a visitor is
    // not asked to trust a guess about which of the two is the meeting.
    for (const e of matching) {
      destinations.push({
        platform: PLATFORMS.meetup,
        href: e.url,
        label: matching.length === 1 ? 'Sign up on Meetup' : e.title || 'Sign up on Meetup',
        srOnly: matching.length === 1 ? named(PLATFORMS.meetup) : titled(PLATFORMS.meetup),
      });
    }
  } else if (urls?.meetupGroup) {
    // The hole is a named state, not a blank (DESIGN.md "States"): the date has no page yet, so the path is
    // the group's join page, and the row says plainly which one it is.
    destinations.push({ platform: PLATFORMS.meetup, href: joinUrl(urls), label: 'Join the Meetup group', srOnly: named(PLATFORMS.meetup) });
  }

  if (discordMatching.length) {
    for (const e of discordMatching) {
      destinations.push({
        platform: PLATFORMS.discord,
        href: e.url,
        label: discordMatching.length === 1 ? 'Sign up on Discord' : e.title || 'Sign up on Discord',
        srOnly: discordMatching.length === 1 ? named(PLATFORMS.discord) : titled(PLATFORMS.discord),
      });
    }
  } else if (urls?.discordInvite) {
    destinations.push({ platform: PLATFORMS.discord, href: urls.discordInvite, label: 'Join the Discord chat', srOnly: named(PLATFORMS.discord) });
  }

  if (urls?.facebookGroup) {
    destinations.push({ platform: PLATFORMS.facebook, href: urls.facebookGroup, label: 'Join the Facebook group', srOnly: named(PLATFORMS.facebook) });
  }

  return {
    date,
    hour,
    state: stateFor(matching, discordMatching),
    meetup: matching,
    discord: discordMatching,
    otherOnDate: onDate.length - matching.length,
    destinations,
    note: noteFor(matching, onDate, discordMatching),
  };
};
