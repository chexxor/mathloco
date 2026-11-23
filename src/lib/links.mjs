/**
 * src/lib/links.mjs — the wording every call to action carries: the accessible-name suffix on a link that
 * LEAVES the site, and the one registry of what each call to action asks and where it leads. (S090, D467;
 * MS41.)
 *
 * Why a file of its own (S041, D317, 2026-11-14). The commissioned read (§5.5) asked for
 * `target="_blank" rel="noopener"` plus an arrow and `<span class="sr-only">(opens in a new tab)</span>`,
 * "consistent on every page". Checked against the artifact, the rel and the arrow were already there and the
 * qualifier was already sr-only — what was missing was consistency: four outbound anchors carried no
 * qualifier at all, and where one existed it repeated the platform the label had just named
 * ("Sign up on Meetup Meetup, opens in a new tab"). A rule that lives in four components is a rule that
 * drifts, so the wording is written once here and every component imports it. `scripts/check-ext-links.mjs`
 * checks the built artifact against the same shape; this module is where the string exists.
 *
 * It has no imports on purpose: an island that needs the qualifier (DiscordSummary.svelte) must not pull the
 * whole RSVP resolver into its bundle to say four words. The registry below is a literal for the same reason —
 * the URLs themselves stay in `src/config.json`, which carries their dated `_verified` stamps (**S019**, **D272**),
 * and this table names only the host and the path a printed href has to match to be the destination it claims.
 */

/** The exact phrase the gate looks for. Change it here and the gate's clean control changes with it. */
export const NEW_TAB_QUALIFIER = ', opens in a new tab';

/** Derive the suffix from the label rather than typing it per link. A label that already names the platform
 *  needs only the mode of opening; a label that is an event title needs the platform too, or two rows on the
 *  same date read alike to a screen reader (D273). */
export const newTabQualifier = (label, platform) =>
  String(label ?? '').toLowerCase().includes(String(platform ?? '').toLowerCase())
    ? NEW_TAB_QUALIFIER
    : ` on ${platform}, opens in a new tab`;

/* ---------- the calls-to-action registry (S090, D467; MS41) ----------------------------------------------

 * WHY A TABLE AND NOT A COMMENT. The operator's complaint on 2026-11-20 was one control on one page: “/chat has a
 * 'Join the chat' button at the top as the first item under the heading. It doesn't make sense to have a user
 * call-to-action without context around it like that”. The research that answered it
 * (`docs/research/discord-invite-ux-2026-11-20.md`) counted **49 actions over 6 built pages** and found that a
 * proximity window cannot tell a contextual action from a bare one (it fails **0 of 49**, because a page whose
 * nav, lede and exit band all name Discord, Meetup and “dates” flatters every control standing on it), while a
 * declared block fails **17 of 49** — and the 17 include exactly the controls the operator pointed at. Re-measured
 * on the tree that carries the fix @measured 2026-11-21 by `node design/cta-inventory.mjs`: 6 built pages, **45
 * marked links = 43 actions + 2 descriptive links a page still declares context for**, and **0 of 45** carrying no
 * declared block. The count moved from 49 because nav chrome became exempt (S090) and declared controls now name
 * themselves; the pre-fix figures keep their date rather than being restated, because the artifact they measured is
 * no longer buildable from this tree. So the rule is a declared block, and a declared block needs a definition of
 * “adequate” that is not a seat's ear.
 *
 * THIS TABLE IS THAT DEFINITION, and one row per destination rather than one per call site: `/chat`'s invite, the
 * band's invite, `/join`'s Discord row and the home band's invite are one destination four times, so they share one
 * row, one vocabulary and one sentence — the same one-home rule that put the new-tab qualifier in this file
 * (**S041**) and the platform list in `src/lib/rsvp.mjs`. What a row holds:
 *   - `where`  — one line for the reader of the code: what this destination is, in the visitor's terms.
 *   - `names`  — the words that say WHERE it leads. A block that never names the destination is a block that
 *                has not told the reader what they are clicking (SC 2.4.4, retrieved 2026-11-20 from
 *                https://www.w3.org/TR/WCAG22/: “The purpose of each link can be determined from the link text
 *                alone or from the link text together with its programmatically determined link context”).
 *   - `asks`   — the words that say WHAT the visitor does there. A destination with no ask is a page title, not
 *                an action.
 *   - `noun`   — for a standing exit only: the kind of thing the visitor joins. This is the half the research
 *                bought from Discord's own docs — an invite “when used, adds a user to a guild”
 *                @retrieved 2026-11-20 from https://discord.com/developers/docs/resources/invite — so a control
 *                that says only “join the chat” hides that it enrolls you in a **server**.
 *   - `host` / `pathContains` / `pathNot` — the shape the printed href must have to BE this destination. A row
 *                labelled Discord that points at Meetup is a defect no word check can see, and so is a control
 *                that claims the club's standing group while pointing at one date's page: the standing group and
 *                a single date are the two tiers D361 rules apart, so the shape is checked in both directions
 *                (`MEETUP_URL_SHAPE`/`DISCORD_EVENT_URL_SHAPE` in `src/lib/rsvp.mjs` own the per-date forms;
 *                this owns the host and the group path).
 *   - `configKey` — only a **standing** exit has one: the href is `src/config.json`'s URL. A per-date row has
 *                none, because its href is read out of a snapshot by `signUpPaths()` and no config value is it.
 *   - `says`   — the sentence the block carries, when this file is the one that owns the sentence. A destination
 *                whose context is prose the page already says (a row's own date, a section's own lead) carries
 *                `''`, and the gate reads the prose instead. **`check:join-page` compares the `/join` rows'
 *                clauses with these strings byte for byte**, so the sentence a visitor reads and the sentence the
 *                resolver answers with cannot be edited apart.
 *
 * A row is a claim about a destination, so each one names its source in the comment above it. Nothing here
 * invents a fact about the club (**D92**): every `says` sentence is either a string that already shipped with a
 * source named in `src/content.json` or `src/lib/rsvp.mjs`, or a line about what a URL is, retrieved above.
 */

/** How many words a block must carry besides the action's own label. The number is the census's own bar:
 *  `node design/cta-inventory.mjs` reports the enclosing-wrapper measure at under 6 and under 12 words, and 6 of 45
 *  marked links sit under 6 @measured 2026-11-21 by that probe (Linux native, Node 24.22.1, 0.05s, no browser). On the
 *  pre-declaration artifact of 2026-11-20 the same measure printed 17 of 49; the action count moved because nav
 *  chrome became exempt and declared controls started naming themselves (S090), which is why both figures carry a
 *  date. A block under this floor is a label with air around it, which is the defect, not a smaller version of the
 *  fix. */
export const CTA_BLOCK_MIN_WORDS = 6;

/** How much of a page one block may account for before it is the page rather than the sentence around the action.
 *  Two thirds, read off the artifact instead of chosen as a round number: @measured 2026-11-21 by
 *  `node design/cta-inventory.mjs` the widest block the tree declares holds 77 words, which is 16% of its page, while
 *  the six built pages hold 142-490 words - so a block wrapped around `<main>` lands at 100% and every block written
 *  for a real action lands far under the line. `scripts/check-cta-context.mjs` fails that shape as
 *  `block-too-wide`: a mark over the whole page satisfies every word check at once, which is the proximity window's
 *  laundering re-enacted on purpose (that window is why this rule exists at all). */
export const CTA_BLOCK_MAX_FRACTION = 2 / 3;

export const CALL_TO_ACTION = {
  // The club's own Discord server. The invite is not a link to a page: Discord's Invite Object is “a code that
  // when used, adds a user to a guild” @retrieved 2026-11-20 from
  // https://discord.com/developers/docs/resources/invite, and `src/lib/rsvp.mjs:276` already calls it “the club’s
  // server”, which is the same claim the harvest of `data/discord-threads.json` reads channel by channel (**D461**).
  'discord-server': {
    where: 'the club’s own server on Discord; the invite enrols you in it',
    names: ['discord', 'server'],
    asks: ['join', 'joining', 'invite', 'adds', 'account'],
    noun: 'server',
    host: 'discord.com',
    configKey: 'discordInvite',
    says: 'The club keeps its own Discord server, and the invite adds you to it.',
  },
  // The club's standing group on Meetup — the group root, not a date (D361's two tiers: “joining a thing that
  // persists, which is not a question about a date”). Its sentence is the clause `/join` already paints from
  // `joinChannels()` with the membership source behind it (`src/content.json` membership).
  'meetup-group': {
    where: 'the club’s standing group on Meetup, where its dates are announced',
    names: ['meetup', 'group'],
    asks: ['join', 'joining', 'sign up', 'announced', 'list'],
    noun: 'group',
    host: 'meetup.com',
    configKey: 'meetupGroup',
    // The group's own path, which the dated pages sit under — so `/events/` is excluded, or a control claiming
    // the standing group would pass while pointing at one Saturday. The `/join` form of the same group IS
    // allowed: `joinUrl()` in `src/lib/rsvp.mjs` is the resolver's named "this date has no page yet" state, and
    // it addresses the same group. D346 deleted that form from the band and the standing row (one survivor, the
    // config-declared root) and left it live in the resolver, so the shape rule follows the resolver, not the
    // page that used to print it.
    pathContains: '/minneapolis-mathematics-book-club',
    pathNot: ['/events/'],
    says: 'Where the club announces dates, and keeps the RSVP list.',
  },
  // ONE date's own page on Meetup, reached from the row that prints that date. No `noun`: the standing-exit noun
  // answers “what kind of thing do I join”, and a per-date link does not ask you to join a thing — D361 rules the
  // two tiers apart on purpose. The block that carries it is the row, and the row names WHICH date by ruling
  // (D327: `data-date` and `<time datetime>` on every row), so the row's own words are the context.
  'meetup-date': {
    where: 'that date’s own page on Meetup, where the club posts its sign-up',
    names: ['meetup'],
    asks: ['sign up', 'signup', 'rsvp', 'join'],
    host: 'meetup.com',
    pathContains: '/events/',
    says: '',
  },
  // The same tier, on the other platform: `signUpPaths()` returns a Discord guild scheduled event when the page set
  // it is given carries an open one on the date (`DISCORD_EVENT_URL_SHAPE`). Since **MS42** that set is
  // `EVENT_PAGES.discord` in `src/lib/rsvp.mjs`, which is **empty** — the file it used to read,
  // `data/discord-events.json`, is deleted and the standard carries no per-platform link set yet
  // (`docs/spec/event-data-handoff.md`). It paints **0 times**
  // on the current artifact @measured 2026-11-21 by `node design/cta-inventory.mjs --all` (6 built pages, 43
  // actions, none of them a Discord event page) — the row is here because the code path is live and the club has
  // posted guild events before, and a registry that cannot name the destination would turn the day it posts one
  // into a red build rather than a sentence. No `noun`: like `meetup-date`, it does not enrol the visitor in a
  // standing thing (D361's two tiers).
  'discord-date': {
    where: 'that date’s own event page on Discord',
    names: ['discord', 'event'],
    asks: ['sign up', 'signup', 'rsvp', 'join'],
    host: 'discord.com',
    pathContains: '/events/',
    says: '',
  },
  // The club's public Facebook group, named by the operator and public at the URL S021/D280 records; the sentence
  // is the clause `/join` already paints for it, with that ruling behind it.
  'facebook-group': {
    where: 'the club’s public group on Facebook',
    names: ['facebook', 'group'],
    asks: ['join', 'joining', 'follow'],
    noun: 'group',
    host: 'facebook.com',
    configKey: 'facebookGroup',
    says: 'The club\'s own public Facebook group.',
  },
  // The club's own calendar file — same-origin, so no `noun` and no new-tab disclosure, but the sentence that
  // makes it worth adding is the band's existing one (D369): it is a feed, and it moves when the club moves a date.
  'calendar-feed': {
    where: 'the club’s own /events.ics, which a calendar client follows',
    names: ['calendar', 'dates', 'feed'],
    asks: ['add', 'follow', 'follows', 'changes', 'subscribe'],
    href: '/events.ics',
    says: 'Add to a calendar: Google, Apple and Outlook can all follow it, and it changes when the club changes a date.',
  },
  // The club's own page of record for dates (D218). The destination word is the nav's own word (D309's one-name
  // rule holds nav, title, band and heading to it), so a rename moves this row and the nav together.
  'dates-page': {
    where: 'the club’s own dates page, /dates',
    names: ['dates', 'date', 'calendar'],
    asks: ['see', 'all', 'every', 'list', 'lists', 'name', 'names', 'next'],
    href: '/dates',
    says: '',
  },
  // The club's own page that explains the ways in (S033, D303).
  'join-page': {
    where: 'the club’s own /join, which explains the ways in',
    names: ['join', 'club', 'ways'],
    asks: ['join', 'come', 'ask', 'see', 'choose'],
    href: '/join',
    says: '',
  },
  // The club's chat page, /chat (the nav word is “Chat”, D309; the archive on it is the ratified one, D464).
  'chat-page': {
    where: 'the club’s own /chat — the live channel and the ratified archive',
    names: ['chat', 'thread', 'threads', 'conversation'],
    asks: ['ask', 'read', 'see', 'talk', 'open', 'openly', 'joins'],
    href: '/chat',
    says: '',
  },
  // Home, from the page the build emits for an address that is not a page (the 404 route).
  'home-page': {
    where: 'the home page, which is where the club explains itself',
    names: ['home', 'site', 'club'],
    asks: ['back', 'start', 'begin', 'read', 'see'],
    href: '/',
    says: '',
  },
};

/** The ids the registry defines, in one call, so a gate and a probe cannot keep their own lists (D264). */
export const ctaIds = () => Object.keys(CALL_TO_ACTION);

/** The registry id for a destination the resolver produced. The resolver owns which **state** a date is in (a
 *  page exists, or the club has posted none yet); this owns which registry row that state names, so
 *  `signUpPaths()` can attach the id to the same object it attaches `label` and `srOnly` to and no component
 *  keeps its own copy of the mapping (D264, the rule that put the qualifier in this file).
 *  `perDate` is the two-tier distinction D361 rules: a page for one Saturday is not the club's standing group,
 *  and the fallback when a date has no page IS the standing group (`joinUrl()`). */
export const ctaIdFor = (platform, perDate = false) => {
  if (platform === 'Facebook') return 'facebook-group';
  if (platform === 'Discord') return perDate ? 'discord-date' : 'discord-server';
  if (platform === 'Meetup') return perDate ? 'meetup-date' : 'meetup-group';
  return null;
};

/** The sentence the registry owns for this destination, or '' when the page's own prose is the context. A
 *  component prints this instead of typing the sentence again, so the words a visitor reads and the words a
 *  gate expects cannot be edited apart — the same mechanism `check:join-page` uses on `joinChannels().gives`. */
export const ctaSays = (id) => String(CALL_TO_ACTION[id]?.says ?? '');
export const isStandingExit = (id) => Boolean(CALL_TO_ACTION[id]?.host);

/** Which outside platform a registry destination sits on, or `null` for a page the site itself emits. The
 *  registry owns this so a component cannot decide for itself whether a control leaves the site: it is what
 *  puts the new-tab qualifier on the right anchors, and what will let `check:cta-context` ask the external
 *  arrow for exactly the controls that go off-site and forbid it on the ones that do not (S090, MS41). */
export const ctaPlatform = (id) => {
  const host = CALL_TO_ACTION[id]?.host ?? '';
  if (host.includes('meetup')) return 'Meetup';
  if (host.includes('discord')) return 'Discord';
  if (host.includes('facebook')) return 'Facebook';
  return null;
};

/** Resolve a registry id to the href it must be: a config URL key for a standing exit, an emitted route for a
 *  route. A **per-date** row (`meetup-date`, `discord-date`) answers null: its href is read out of a snapshot by
 *  `signUpPaths()`, so no config value is it, and a component that asks this function for one would be inventing
 *  a date. */
export const ctaHref = (id, urls = {}) => {
  const row = CALL_TO_ACTION[id];
  if (!row) return null;
  if (row.href) return row.href;
  return row.configKey ? (urls[row.configKey] ?? null) : null;
};
