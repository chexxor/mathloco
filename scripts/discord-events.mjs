#!/usr/bin/env node
/**
 * discord-events.mjs - read the club's own Discord guild scheduled events and write a dated snapshot.
 *
 * Why this exists (S019, D274, 2026-11-11). Discord has a real RSVP surface: a guild scheduled event has its
 * own page, `discord.com/events/<guild>/<event>/`, and a member can express intent on it. That makes it a
 * sign-up platform the site can honestly offer, alongside Meetup. It is not something the site may *assert*:
 * which events exist, and whether they are still open, are facts about a server the site does not control, so
 * they come from the guild's own endpoint, harvested into a committed snapshot, and matched on the contract's
 * key (date + wall-clock hour) exactly like a Meetup page (docs/spec/source-contract.md §2).
 *
 * What this deliberately is NOT:
 *   - not a request-time fetch. `data/discord-events.json` is committed and read at build time, the same
 *     topology D73 chose for the calendar: an upstream being down costs editing, not serving.
 *   - not a headcount reader. The API will return `user_count` if you ask with `with_user_count=true`, and
 *     this harvester never asks for it. D265 keeps attendance numbers off every painted surface, and the
 *     cheapest way to guarantee that is to never bring the number into the repo. `discordSnapshotFindings()`
 *     fails a snapshot that somehow carries one.
 *   - not a member of the club. Guild scheduled events are `GuildOnly` (privacy level 2, the only value in
 *     API v10), so an event page is readable by server members only. The label on the row says "Sign up on
 *     Discord", not "one click and you are in", because a visitor who is not yet a member is asked to join
 *     the server first. That is a fact about the destination, and it is written in the data file.
 *
 *   node scripts/discord-events.mjs            print what it read, write nothing
 *   node scripts/discord-events.mjs --write    write data/discord-events.json
 *   node scripts/discord-events.mjs --check    exit 1 if the committed snapshot is stale, empty, or a row
 *                                            this build cannot trust (no id, no date, a URL outside
 *                                            DISCORD_EVENT_URL_SHAPE, a stored headcount)
 *
 * `--check` is not its own rule. It calls `discordSnapshotFindings()` in `src/lib/rsvp.mjs`, the same
 * function `npm run check:rsvp` calls (D264, D272). Two paraphrases of one freshness rule is how a snapshot
 * passes the harvester and fails the gate with nobody able to say which number moved.
 *
 * The token: `DISCORD_TOKEN` from the environment, else `.dev.vars` (gitignored), else nothing - and the
 * script says so plainly rather than inventing a partial snapshot. `DISCORD_GUILD_ID` resolves the same way,
 * then `wrangler.toml`'s `[vars]`, which is where the server id is already written (it is not a secret).
 * Unauthenticated measured 2026-11-11 (Linux native, curl): 401. `Authorization: Bearer <token>` measured
 * 401; `Authorization: Bot <token>` measured 200 - the same header `src/lib/discord.ts` uses.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DISCORD_STATUS_NAMES, openDiscordEvents, discordSnapshotFindings } from '../src/lib/rsvp.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${root}data/discord-events.json`;
const DEV_VARS = `${root}.dev.vars`;
const WRANGLER = `${root}wrangler.toml`;
// Discord's ToS asks for an identifiable User-Agent on bot traffic; this is the one src/lib/discord.ts uses.
const UA = 'matheapolis.com (https://matheapolis.com, 1.0)';
const API = 'https://discord.com/api/v10';

/** First non-empty value, in the order a human would expect it to be found. */
function secret(name) {
  if (process.env[name]) return process.env[name].trim();
  if (existsSync(DEV_VARS)) {
    const m = new RegExp(`^${name}\\s*=\\s*(.*)$`, 'm').exec(readFileSync(DEV_VARS, 'utf8'));
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

/** The guild id is not a secret, so it may come from a tracked file. `wrangler.toml`'s `[vars]` already names
 *  it, and reading it from there beats typing it here (D241: one source per fact). */
function guildId() {
  const fromEnv = secret('DISCORD_GUILD_ID');
  if (fromEnv) return fromEnv;
  if (existsSync(WRANGLER)) {
    const m = /^DISCORD_GUILD_ID\s*=\s*"([^"]+)"/m.exec(readFileSync(WRANGLER, 'utf8'));
    if (m) return m[1];
  }
  return null;
}

async function get(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bot ${token}`, 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.text();
  // A 200 with a body this parser cannot read is a source-shape change, and D222's lesson is that the shape
  // changes without warning. Report it as a failed read rather than letting the exception escape the gate.
  let json = null;
  if (res.status === 200) {
    try { json = JSON.parse(body); } catch { json = null; }
  }
  return { status: res.status, bytes: Buffer.byteLength(body), json };
}

/** The club's wall clock, from the same file the schedule prints its dates from. Meetup's page says
 *  `2026-11-11T18:00-06:00`; Discord's says `2026-11-12T00:00:00+00:00`. Both describe one instant, and the
 *  match key is the hour a person sees, so each is converted into the timezone the calendar declares.
 *  @measured 2026-11-11 (Node 24.22.1, Linux native): the pilot event's `2026-11-12T00:00:00+00:00` formats
 *  to 2026-11-11 / 18:00 in America/Chicago - the same row the schedule prints. */
function localClock(iso, timeZone) {
  if (!iso) return { date: null, time: null };
  const d = new Date(iso);
  // `Number.isFinite(aDate)` is false for every Date — a Date is an object, not a number. The first run of
  // this harvester wrote null dates for a perfectly good event because of it (pitfall: test the parse, not
  // the type). Use getTime().
  if (!Number.isFinite(d.getTime())) return { date: null, time: null };
  return {
    date: new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
    time: new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(d),
  };
}

async function harvest(token, guild) {
  const timeZone = (() => {
    try {
      const events = JSON.parse(readFileSync(`${root}data/events.json`, 'utf8'));
      return events.calendar?.timezone ?? 'America/Chicago';
    } catch {
      return 'America/Chicago';
    }
  })();

  const eventsRes = await get(`${API}/guilds/${guild}/scheduled-events`, token);
  if (eventsRes.status !== 200) {
    throw new Error(`guild scheduled-events answered ${eventsRes.status} - the token is missing, expired, or lacks the "View Guild Scheduled Events" permission`);
  }
  const guildRes = await get(`${API}/guilds/${guild}`, token);

  const events = (eventsRes.json ?? []).map((e) => {
    const clock = localClock(e.scheduled_start_time, timeZone);
    return {
      id: String(e.id),
      // Assembled from the ids the API returns, because the API gives no URL. Measured 2026-11-11: both
      // discord.com/events/<guild>/<id> and the trailing-slash form answer 200; the resolver's
      // DISCORD_EVENT_URL_SHAPE requires the trailing slash, so this is the form every link carries.
      url: `https://discord.com/events/${guild}/${e.id}/`,
      title: e.name ?? null,
      start: e.scheduled_start_time ?? null,
      end: e.end_time ?? null,
      date: clock.date,
      time: clock.time,
      status: Number(e.status),
      statusName: DISCORD_STATUS_NAMES[Number(e.status)] ?? `status ${e.status}`,
      entityType: Number(e.entity_type),
      privacyLevel: Number(e.privacy_level),
      location: e.location ?? null,
      // `channel_id` is null for a physical event (measured: the pilot event has no channel). Kept so a
      // future round can tell an online event from an in-person one without re-fetching.
      channelId: e.channel_id ?? null,
    };
  });

  return {
    _rule: "A dated snapshot of the club's own Discord guild scheduled events, read by `node scripts/discord-events.mjs --write`. Committed so the build never reaches the network (D73's topology, the same one data/events.json and data/meetup-events.json follow). Guild scheduled events are GuildOnly (privacy_level 2, the only value in API v10), so an event page is visible to server members: a visitor who is not a member is asked to join before they can RSVP. No headcount is stored: `user_count` is never requested, and check:rsvp fails a snapshot that carries one (D265). npm run check:rsvp is what keeps this file from going stale.",
    source: {
      kind: 'discord-api',
      guildId: guild,
      guildName: guildRes.json?.name ?? null,
      endpoint: `${API}/guilds/${guild}/scheduled-events`,
      fetchedAt: new Date().toISOString(),
      reads: [{ url: `${API}/guilds/${guild}/scheduled-events`, status: eventsRes.status, bytes: eventsRes.bytes },
              { url: `${API}/guilds/${guild}`, status: guildRes.status, bytes: guildRes.bytes }],
      _how: 'Authenticated GET with `Bot <token>` (measured 2026-11-11: unauthenticated and `Bearer` both answer 401) and the identifiable User-Agent Discord asks bots to send. `with_user_count` is deliberately not requested.',
    },
    events,
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--check')) {
    if (!existsSync(OUT)) {
      console.error('check:rsvp FAIL - data/discord-events.json does not exist; run node scripts/discord-events.mjs --write');
      return 1;
    }
    let snap;
    try {
      snap = JSON.parse(readFileSync(OUT, 'utf8'));
    } catch (e) {
      console.error(`check:rsvp FAIL - data/discord-events.json is not readable JSON: ${e.message}`);
      return 1;
    }
    const problems = discordSnapshotFindings(snap);
    if (problems.length) {
      console.log(`check:rsvp FAIL - ${problems.length} problem(s) in the Discord snapshot:`);
      for (const p of problems) console.log(`  ${p}`);
      return 1;
    }
    const open = openDiscordEvents(snap.events);
    console.log(`check:rsvp ok - ${snap.events.length} Discord scheduled event(s) read ${snap.source.fetchedAt?.slice(0, 10)}, ${open.length} sign-up page(s) this build can print.`);
    return 0;
  }

  const token = secret('DISCORD_TOKEN');
  const guild = guildId();
  if (!token) {
    console.error('discord-events: no DISCORD_TOKEN. Set the environment variable or put it in .dev.vars (gitignored). Nothing written - a snapshot with no events would paint fewer links than the truth.');
    return 1;
  }
  if (!guild) {
    console.error('discord-events: no DISCORD_GUILD_ID. It is in wrangler.toml [vars]; check it is still there.');
    return 1;
  }

  const snap = await harvest(token, guild);
  if (args.includes('--write')) {
    writeFileSync(OUT, `${JSON.stringify(snap, null, 2)}\n`);
    console.log(`wrote ${OUT}: ${snap.events.length} scheduled event(s), ${openDiscordEvents(snap.events).length} open`);
  } else {
    for (const e of snap.events) {
      console.log(`${e.date ?? '?'} ${e.time ?? '?'}  ${e.statusName}  ${e.title}  ${e.url}`);
    }
  }
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => { console.error('discord-events failed:', err.message); process.exit(1); });
