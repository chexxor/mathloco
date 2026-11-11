#!/usr/bin/env node
/**
 * check:rsvp — the sign-up link map is current, and every link it prints has been checked.
 *
 *   npm run check:rsvp                 # the committed Meetup + Discord snapshots and the configured platform URLs
 *   npm run check:rsvp:selftest        # plant each defect, require each to FAIL (D118)
 *   npm run check:rsvp:links           # GET each configured URL and write its dated stamp (network)
 *   node scripts/check-rsvp.mjs --snap <file> --discord <file> --config <file> [--today YYYY-MM-DD]
 *
 * Why this gate and not a comment in the data file (S019, D272). Two facts about the sign-up links are true
 * only for a while: which Meetup pages exist, and whether a platform URL still answers. A page that prints
 * "Details and sign-up" pointing at a page that was retired last month is the same failure class D223 names
 * — a fact kept published after its source stopped supporting it — and it is invisible to every other gate
 * here, because the link is a string in a committed file and the string is not wrong, only old.
 *
 * Two windows, both dated, both one-number-simple:
 *   - `data/meetup-events.json` and `data/discord-events.json` may be `SNAPSHOT_FRESH_DAYS` (14) days old.
 *     One threshold, one failure, one fix each: `node scripts/meetup-events.mjs --write` and
 *     `node scripts/discord-events.mjs --write`. The 28-day "expired" tier this used to carry is deleted
 *     (D272) — two numbers that both stop the build are one rule wearing two names.
 *   - a configured URL's stamp may be `LINK_STAMP_DAYS` (60) days old, and the status it recorded must not be
 *     a 4xx/5xx. `check:links` is what produces the stamp, so the rule is cheap to keep.
 *
 * The rule lives in `src/lib/rsvp.mjs` as `snapshotFindings()`, `discordSnapshotFindings()` and
 * `linkFindings()` — the same functions `scripts/meetup-events.mjs --check` and
 * `scripts/discord-events.mjs --check` call (D264). This file is the gate around them: it reads the files,
 * prints the numbers, and exits.
 *
 * `--links` is deliberately NOT in `npm run verify`: it reaches the network, the same exclusion class as
 * `check:discord` (needs a token) and `check:ai` (needs credentials and spends a call). The build never
 * touches the network (D73's topology); only a human running the probe does.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LINK_KEYS, LINK_STAMP_DAYS, PLATFORMS, SNAPSHOT_FRESH_DAYS,
  joinUrl, hourOf, linkFindings, openDiscordEvents, openMeetupEvents, discordSnapshotFindings,
  snapshotAgeDays, snapshotFindings,
} from '../src/lib/rsvp.mjs';
import { scheduleWindow, todayInZone, dateOf } from '../src/lib/event-window.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const links = args.includes('--links');
const argOne = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i < 0 ? dflt : args[i + 1];
};

const SNAP = resolve(argOne('--snap', 'data/meetup-events.json'));
const DISCORD_SNAP = resolve(argOne('--discord', 'data/discord-events.json'));
const CONFIG = resolve(argOne('--config', 'src/config.json'));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/** One GET, redirects followed, status only. `--links` is a measurement, not a client: no retry, no cookie,
 *  one request per link, and the answer is a number and a date. */
async function measure(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    return res.status;
  } catch (e) {
    return `error: ${e.message}`;
  }
}

async function stampLinks(config) {
  const urls = config.URLs ?? {};
  const today = new Date().toISOString().slice(0, 10);
  // Written inside `URLs`, beside the links they stamp (D272). `linkFindings` accepts either placement, so a
  // hand-edited config with a top-level `_verified` is still checked rather than silently ignored.
  const verified = { ...((urls._verified ?? config._verified) ?? {}) };
  const rows = [];
  for (const key of Object.values(LINK_KEYS)) {
    const url = urls[key];
    if (!url) {
      // A closed platform paints nothing, so there is nothing to stamp — but the join page it would fall
      // back to is still worth reading, because that is the link a visitor actually gets.
      const status = await measure(joinUrl(urls));
      rows.push(`  ${String(status).padEnd(6)} ${joinUrl(urls)}  (${key} is empty: nothing is painted for that platform)`);
      verified[key] = { status: Number(status) || 0, verifiedAt: today, ...(verified[key]?._note ? { _note: verified[key]._note } : {}) };
      continue;
    }
    const status = await measure(url);
    rows.push(`  ${String(status).padEnd(6)} ${url}`);
    verified[key] = { status: Number(status) || 0, verifiedAt: today, ...(verified[key]?._note ? { _note: verified[key]._note } : {}) };
  }
  if (!config.URLs) config.URLs = {};
  config.URLs._verified = verified;
  writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`);
  for (const r of rows) console.log(r);
  const problems = linkFindings(config);
  console.log(`check:rsvp:links — stamps written to ${CONFIG} (${LINK_STAMP_DAYS}-day limit); ${problems.length} problem(s) after stamping`);
  for (const p of problems) console.log(`  FAIL  ${p}`);
  return problems.length ? 1 : 0;
}

if (selftest) {
  // Each planting is a whole (snapshot, config) pair, because the two rules read two files and a gate that
  // tests them one at a time proves nothing about the pair. `now` is fixed so "old" means the same thing
  // every run: a freshness gate whose selftest depends on the wall clock cannot be re-run next month and
  // mean the same thing.
  const NOW = Date.parse('2026-11-10T12:00:00Z');
  const day = (n) => new Date(NOW - n * 86400000).toISOString();
  const goodSnap = { source: { fetchedAt: day(1) }, events: [{ id: '1', url: 'https://www.meetup.com/minneapolis-mathematics-book-club/events/317097578/', date: '2026-11-11', time: '18:00', status: 'ACTIVE', going: 5 }] };
  const goodDiscord = { source: { fetchedAt: day(1), guildId: '1170385683379126343' }, events: [{ id: '1569601080235532400', url: 'https://discord.com/events/1170385683379126343/1569601080235532400/', date: '2026-11-11', time: '18:00', status: 1, title: 'Study Session' }] };
  const goodConfig = { URLs: { meetupGroup: 'https://www.meetup.com/minneapolis-mathematics-book-club', discordInvite: 'https://discord.com/invite/wx5S7YJSkU', facebookGroup: '' }, _verified: { meetupGroup: { status: 200, verifiedAt: day(1) }, discordInvite: { status: 200, verifiedAt: day(1) }, facebookGroup: { status: 400, verifiedAt: day(1) } } };

  const cases = [
    { name: 'both files fit: no finding', snap: goodSnap, config: goodConfig, want: [] },
    { name: 'snapshot one day past the window', snap: { ...goodSnap, source: { fetchedAt: day(15) } }, config: goodConfig, want: ['days old', '14'] },
    { name: 'snapshot with no fetchedAt at all', snap: { ...goodSnap, source: {} }, config: goodConfig, want: ['no fetchedAt'] },
    { name: 'snapshot with an unreadable fetchedAt', snap: { ...goodSnap, source: { fetchedAt: 'last Tuesday' } }, config: goodConfig, want: ['readable instant'] },
    { name: 'an event whose URL is not a Meetup event page', snap: { ...goodSnap, events: [{ ...goodSnap.events[0], url: 'https://www.meetup.com/minneapolis-mathematics-book-club/events/' }] }, config: goodConfig, want: ['cannot trust'] },
    { name: 'a configured link with no stamp', snap: goodSnap, config: { URLs: goodConfig.URLs, _verified: { discordInvite: goodConfig._verified.discordInvite } }, want: ['has ever checked it'] },
    { name: 'a stamp 61 days old', snap: goodSnap, config: { ...goodConfig, _verified: { ...goodConfig._verified, discordInvite: { status: 200, verifiedAt: day(61) } } }, want: ['61 days ago', '60'] },
    { name: 'a stamp that last answered 404', snap: goodSnap, config: { ...goodConfig, _verified: { ...goodConfig._verified, discordInvite: { status: 404, verifiedAt: day(1) } } }, want: ['answered 404'] },
    { name: 'a platform the resolver knows that config never declared', snap: goodSnap, config: { URLs: { meetupGroup: goodConfig.URLs.meetupGroup, discordInvite: goodConfig.URLs.discordInvite }, _verified: goodConfig._verified }, want: ['no facebookGroup entry'] },
    { name: 'a link in config that no rule knows about', snap: goodSnap, config: { ...goodConfig, URLs: { ...goodConfig.URLs, meetupSeries: 'https://www.meetup.com/g/events/' } }, want: ['no rule knows about: meetupSeries'] },
    { name: 'a stamp stamped in the future', snap: goodSnap, config: { ...goodConfig, _verified: { ...goodConfig._verified, discordInvite: { status: 200, verifiedAt: day(-3) } } }, want: ['stamped in the future'] },
    { name: 'an empty entry with a 400 stamp: the documented closed platform', snap: goodSnap, config: goodConfig, want: [] },
    { name: 'the Discord snapshot 15 days old', snap: goodSnap, discord: { ...goodDiscord, source: { ...goodDiscord.source, fetchedAt: day(15) } }, config: goodConfig, want: ['Discord snapshot is 15.0 days old', '14'] },
    { name: 'the Discord snapshot with no guild named', snap: goodSnap, discord: { ...goodDiscord, source: { fetchedAt: day(1) } }, config: goodConfig, want: ['names no guild'] },
    { name: 'a Discord event whose URL is not an event page', snap: goodSnap, discord: { ...goodDiscord, events: [{ ...goodDiscord.events[0], url: 'https://discord.com/invite/wx5S7YJSkU' }] }, config: goodConfig, want: ['url this build cannot trust'] },
    { name: 'a Discord snapshot that stored an RSVP headcount', snap: goodSnap, discord: { ...goodDiscord, events: [{ ...goodDiscord.events[0], user_count: 14 }] }, config: goodConfig, want: ['headcount (14) in the snapshot'] },
  ];

  // The match rule itself, planted here because `signUpPaths()` is the thing the page gate compares against:
  // if the resolver attaches a link to a date it should not, no page check can catch it.
  const pages = [
    { id: 'a', url: 'https://www.meetup.com/g/events/111/', date: '2026-11-11', time: '18:00', status: 'ACTIVE', title: 'Proofs' },
    { id: 'b', url: 'https://www.meetup.com/g/events/222/', date: '2026-11-11', time: '19:00', status: 'ACTIVE', title: 'Puzzles' },
    { id: 'c', url: 'https://www.meetup.com/g/events/333/', date: '2026-12-01', time: '18:00', status: 'PAST', title: 'Old' },
    { id: 'd', url: 'https://www.meetup.com/g/events/not-a-page', date: '2026-11-11', time: '18:00', status: 'ACTIVE', title: 'Bad shape' },
  ];
  const urls = { meetupGroup: 'https://www.meetup.com/g', discordInvite: 'https://discord.com/invite/x' };
  const discordPages = [
    { id: 'd1', url: 'https://discord.com/events/1170385683379126343/1569601080235532400/', date: '2026-11-11', time: '18:00', status: 1, title: 'Study Session' },
    { id: 'd2', url: 'https://discord.com/events/1170385683379126343/1569601080235532401/', date: '2026-11-21', time: '12:00', status: 3, title: 'Already over' },
    { id: 'd3', url: 'https://discord.com/events/1170385683379126343/1569601080235532402/', date: '2026-11-21', time: '19:00', status: 1, title: 'A different hour' },
  ];
  const { signUpPaths, hourOf } = await import('../src/lib/rsvp.mjs');
  const ruleCases = [
    { name: 'a settled hour picks exactly the page that shares it', item: { date: '2026-11-11', time: '18:00' }, want: (r) => r.state === 'meetup' && r.meetup.length === 1 && r.meetup[0].id === 'a', note: (r) => `${r.state} ${r.meetup.map((e) => e.id).join(',')}` },
    { name: 'two pages at the same hour are printed as two, not guessed as one', item: { date: '2026-11-11', time: '18:00' }, extra: [{ id: 'e', url: 'https://www.meetup.com/g/events/444/', date: '2026-11-11', time: '18:00', status: 'ACTIVE', title: 'Second' }], want: (r) => r.state === 'several' && r.meetup.length === 2 && r.destinations.filter((d) => d.platform === PLATFORMS.meetup).length === 2, note: (r) => `${r.state} ${r.destinations.map((d) => d.platform).join(',')}` },
    { name: 'an unsettled hour links only when the date has exactly one page', item: { date: '2026-11-11', time: null }, want: (r) => r.state === 'none' && r.destinations[0].href === 'https://www.meetup.com/g/join', note: (r) => `${r.state} ${r.destinations[0]?.href}` },
    { name: 'a raw row without timeConfirmed is an unsettled hour, whatever its start says', item: { start: '2026-11-11T18:00', timeConfirmed: false }, want: (r) => hourOf(r.raw) === null, note: () => 'hourOf' },
    { name: 'a past Meetup record is never a sign-up path', item: { date: '2026-12-01', time: '18:00' }, want: (r) => r.state === 'none' && r.otherOnDate === 0, note: (r) => `${r.state} ${r.otherOnDate}` },
    { name: 'a page on the date at a different hour is named, not called missing', item: { date: '2026-11-11', time: '20:00' }, want: (r) => r.note === 'Meetup has a page for this date at a different time.', note: (r) => String(r.note) },
    { name: 'the closed platform contributes nothing', item: { date: '2026-11-11', time: '18:00' }, want: (r) => !r.destinations.some((d) => d.platform === PLATFORMS.facebook), note: (r) => r.destinations.map((d) => d.platform).join(',') },
    { name: 'a guild scheduled event on the date and hour is a sign-up path', item: { date: '2026-11-11', time: '18:00' }, discord: discordPages, want: (r) => r.state === 'meetup' && r.discord.length === 1 && r.destinations.map((d) => d.href).join(' ').includes('discord.com/events/1170385683379126343/1569601080235532400/'), note: (r) => `${r.state} ${r.destinations.map((d) => d.platform).join(',')}` },
    { name: 'a date with only a Discord page says so, and drops the invite', item: { date: '2026-11-11', time: '18:00' }, discord: [{ id: 'd1', url: 'https://discord.com/events/1170385683379126343/1569601080235532400/', date: '2026-11-11', time: '18:00', status: 2, title: 'Study Session' }], meetups: [], want: (r) => r.state === 'discord' && r.destinations.length === 2 && r.destinations[1].label === 'Sign up on Discord' && !r.destinations.some((d) => d.href.includes('invite')), note: (r) => `${r.state} ${r.destinations.map((d) => d.label).join(' | ')}` },
    { name: 'a completed Discord event is not a sign-up path', item: { date: '2026-11-21', time: '12:00' }, discord: discordPages, meetups: [], want: (r) => r.state === 'none' && r.discord.length === 0 && r.destinations[1].href === 'https://discord.com/invite/x', note: (r) => `${r.state} ${r.destinations.map((d) => d.href).join(' ')}` },
    { name: 'a Discord page at a different hour is not attached to the row', item: { date: '2026-11-21', time: '12:00' }, discord: discordPages, meetups: [{ id: 'm', url: 'https://www.meetup.com/g/events/666/', date: '2026-11-21', time: '12:00', status: 'ACTIVE', title: 'On time' }], want: (r) => r.state === 'meetup' && r.discord.length === 0, note: (r) => `${r.state} ${r.discord.length}` },
    { name: 'a date with no page anywhere names the hole and the fallback', item: { date: '2026-12-01', time: '18:00' }, discord: discordPages, meetups: [], want: (r) => r.state === 'none' && r.note === 'No sign-up page for this date yet — ask in the chat and the club will tell you when it is posted.' && r.destinations.map((d) => d.label).join(' | ') === 'Join the Meetup group | Join the Discord chat', note: (r) => `${r.state} ${r.destinations.map((d) => d.label).join(' | ')}` },
  ];

  let bad = 0;
  for (const c of cases) {
    const got = [...snapshotFindings(c.snap, NOW), ...discordSnapshotFindings(c.discord ?? goodDiscord, NOW), ...linkFindings(c.config, NOW)];
    const hit = got.find((f) => c.want.every((w) => f.includes(w)));
    if (c.want.length === 0) {
      if (got.length) { bad++; console.log(`FAIL  "${c.name}" should pass but reported: ${got[0]}`); }
      else console.log(`ok    ${c.name}`);
    } else if (hit) {
      console.log(`ok    planting "${c.name}" -> ${hit}`);
    } else {
      bad++;
      console.log(`FAIL  planting "${c.name}" reported "${got[0] || 'nothing'}" — wanted "${c.want.join(' + ')}"`);
    }
  }
  for (const c of ruleCases) {
    const r = signUpPaths(c.item, [...(c.meetups ?? pages), ...(c.extra ?? [])], urls, c.discord ?? []);
    r.raw = c.item;
    if (c.want(r)) console.log(`ok    ${c.name}`);
    else { bad++; console.log(`FAIL  ${c.name}\n      got: ${c.note(r)}`); }
  }
  console.log(`check:rsvp selftest — ${cases.length + ruleCases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------------ the live check
const readJson = (p, hint) => {
  if (!existsSync(p)) {
    console.error(`check:rsvp: ${p} missing — ${hint}`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`check:rsvp: ${p} is not readable JSON: ${e.message}`);
    process.exit(1);
  }
};

if (links) {
  if (!existsSync(CONFIG)) { console.error(`check:rsvp:links: ${CONFIG} missing`); process.exit(1); }
  let config;
  try {
    config = JSON.parse(readFileSync(CONFIG, 'utf8'));
  } catch (e) {
    console.error(`check:rsvp:links: ${CONFIG} is not readable JSON: ${e.message}`);
    process.exit(1);
  }
  process.exit(await stampLinks(config));
}

const snap = readJson(SNAP, 'run node scripts/meetup-events.mjs --write');
// The Discord snapshot is not optional: a committed file the resolver reads must exist, and if it is empty
// because nobody ran the harvester, the site paints fewer links than the guild actually offers.
const discordSnap = readJson(DISCORD_SNAP, 'run node scripts/discord-events.mjs --write (needs DISCORD_TOKEN in .dev.vars)');
const config = readJson(CONFIG, 'src/config.json is the link map');
const problems = [...snapshotFindings(snap), ...discordSnapshotFindings(discordSnap), ...linkFindings(config)];

if (problems.length) {
  for (const p of problems) console.log(`FAIL  ${p}`);
  console.log(`check:rsvp: ${problems.length} problem(s) with the sign-up link map`);
  process.exit(1);
}

const open = openMeetupEvents(snap.events);
const openDiscord = openDiscordEvents(discordSnap.events);
const age = snapshotAgeDays(snap);
const discordAge = snapshotAgeDays(discordSnap);
const entries = Object.entries(LINK_KEYS).map(([platform, key]) => ({ platform, key, url: config.URLs?.[key] }));
const configured = entries.filter((e) => e.url);
const closed = entries.filter((e) => !e.url);
const stamps = config.URLs?._verified ?? config._verified ?? {};
const oldest = configured.map((e) => ({ k: e.key, at: stamps[e.key].verifiedAt, status: stamps[e.key].status }))
  .sort((a, b) => a.at.localeCompare(b.at))[0];

// How many of the dates the schedule actually prints have a sign-up page, as a sentence a human can act on.
let printNote = 'no events snapshot for the schedule to draw on';
if (existsSync(resolve('data/events.json'))) {
  let events;
  try {
    events = JSON.parse(readFileSync(resolve('data/events.json'), 'utf8'));
  } catch (e) {
    console.error(`check:rsvp: data/events.json is not readable JSON: ${e.message}`);
    process.exit(1);
  }
  const today = argOne('--today', todayInZone(events.calendar?.timezone ?? 'America/Chicago'));
  const window = scheduleWindow(events.events ?? [], today);
  const withPage = window.shown.filter((r) => {
    const onDate = open.filter((e) => e.date === dateOf(r));
    const hour = hourOf(r);   // the same clock the row prints and the resolver matches on, not a second copy of it
    return hour ? onDate.filter((e) => e.time === hour).length : onDate.length === 1;
  });
  const withDiscord = window.shown.filter((r) => {
    const onDate = openDiscord.filter((e) => e.date === dateOf(r));
    const hour = hourOf(r);
    return hour ? onDate.filter((e) => e.time === hour).length : onDate.length === 1;
  });
  printNote = `${withPage.length} of the ${window.shown.length} dates the schedule prints have their own Meetup page, ${withDiscord.length} their own Discord event page`;
}

console.log(
  `ok    Meetup snapshot: ${snap.events.length} records read ${snap.source.fetchedAt.slice(0, 10)}, ` +
  `${age.toFixed(1)} days old (limit ${SNAPSHOT_FRESH_DAYS})`,
);
console.log(`ok    Discord snapshot: ${(discordSnap.events ?? []).length} scheduled event(s) read ${discordSnap.source.fetchedAt.slice(0, 10)}, ${discordAge.toFixed(1)} days old (limit ${SNAPSHOT_FRESH_DAYS}), guild ${discordSnap.source.guildId}`);
console.log(`ok    ${open.length} open Meetup sign-up page(s), every URL matching MEETUP_URL_SHAPE; ${open.filter((e) => e.time).length} with a settled clock`);
console.log(`ok    ${openDiscord.length} open Discord event page(s), every URL matching DISCORD_EVENT_URL_SHAPE; no user_count stored (D265)`);
console.log(`ok    ${configured.length} platform link(s) stamped (oldest: ${oldest.k} ${oldest.at}, answered ${oldest.status}; limit ${LINK_STAMP_DAYS} days)`);
if (closed.length) console.log(`ok    ${closed.length} platform(s) closed and painted nowhere: ${closed.map((e) => PLATFORMS[e.platform]).join(', ')}`);
console.log(`ok    ${printNote}`);
console.log('ok    headcounts stay in the snapshots: meetupView() and discordView() drop `going` and `user_count`, and check:rsvp-page reads the painted bytes (D272)');
