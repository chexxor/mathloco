// Summary-cache behaviour check (the KV layer in src/lib/discord.ts).
//
// Runs getDiscordSummary against a fake KVNamespace, so the cache rules can be verified
// without a Cloudflare account, and mostly without spending Discord/Claude calls.
//
//   npm run check:cache              # the offline cases only (no network, no cost)
//   npm run check:cache -- --live    # adds two cases that use real credentials
//
// Each case runs in its own process because getDiscordSummary keeps a per-module
// in-memory layer, which would otherwise leak between cases.

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { getDiscordSummary, type DiscordEnv } from '../src/lib/discord';
import type { CachedData } from '../src/types/discord';

type Case = 'warm-kv' | 'stale-on-error' | 'no-cache-on-failure' | 'live-write' | 'live-reread';
const OFFLINE_CASES: Case[] = ['warm-kv', 'stale-on-error', 'no-cache-on-failure'];
const LIVE_CASES: Case[] = ['live-write', 'live-reread'];

/** Minimal .dev.vars reader; values are never printed. */
function readDevVars(): Record<string, string> {
  if (!existsSync('.dev.vars')) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync('.dev.vars', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** In-memory stand-in for a Cloudflare KV namespace, honouring expirationTtl. */
class FakeKV {
  private store = new Map<string, { value: string; expiresAt: number }>();
  puts = 0;

  async get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  async get(key: string, type?: string): Promise<string | null>;
  async get(key: string, type = 'text'): Promise<unknown> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return type === 'json' ? JSON.parse(hit.value) : hit.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    this.puts += 1;
    const ttl = options?.expirationTtl ?? 60 * 60 * 24;
    this.store.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  }

  size(): number {
    return this.store.size;
  }

  keys(): string[] {
    return [...this.store.keys()];
  }
}

const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

function fixture(ageMs: number): Omit<CachedData, 'lastUpdated'> & { lastUpdated: string } {
  return {
    channels: [{ id: 'chan-1', name: 'general', type: 0 }],
    messages: [{ channelId: 'chan-1', summary: 'Fixture summary.', timeRange: 'fixture range' }],
    lastUpdated: new Date(Date.now() - ageMs).toISOString(),
  };
}

async function runCase(name: Case): Promise<boolean> {
  const devVars = readDevVars();
  const live = name === 'live-write' || name === 'live-reread';
  const kv = new FakeKV();

  const env = {
    DISCORD_TOKEN: live ? devVars.DISCORD_TOKEN || '' : 'not-a-real-token',
    DISCORD_GUILD_ID: live ? devVars.DISCORD_GUILD_ID || '' : '0000000000000000000',
    CLAUDE_API_KEY: live ? devVars.CLAUDE_API_KEY || '' : 'not-a-real-key',
    SUMMARY_CACHE: kv,
  } as unknown as DiscordEnv;

  const checks: string[] = [];
  const expect = (label: string, ok: boolean) => checks.push(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  // Seeding the fixture goes through put, so "no writes" is measured against the count
  // after seeding, not zero.
  let seededPuts = 0;

  if (name === 'warm-kv') {
    // A fresh entry in KV must be served from KV: the guild id is unreachable, so a hit
    // proves the shared-cache read path ran and that no Discord/Claude call was made.
    const key = 'discord-summary:v1:0000000000000000000';
    await kv.put(key, JSON.stringify(fixture(HOUR)));
    seededPuts = kv.puts;
    const started = Date.now();
    const data = await getDiscordSummary(env);
    expect('fresh KV entry is served without any network call', Date.now() - started < 1500);
    expect('served summary came from the fixture', data.messages[0]?.summary === 'Fixture summary.');
    expect('lastUpdated revived as the stored instant', Date.now() - data.lastUpdated.getTime() < 2 * DAY);
    expect('KV was read, not written', kv.puts === seededPuts);
  }

  if (name === 'stale-on-error') {
    // Upstream is unreachable and the KV entry is 3 days old: inside the 7-day grace
    // window the app must degrade to the stale summary rather than throw (D7).
    const key = 'discord-summary:v1:0000000000000000000';
    await kv.put(key, JSON.stringify(fixture(3 * DAY)));
    seededPuts = kv.puts;
    const data = await getDiscordSummary(env);
    expect('stale KV entry served instead of throwing', data.messages[0]?.summary === 'Fixture summary.');
    expect('stale entry not overwritten', kv.puts === seededPuts);
  }

  if (name === 'no-cache-on-failure') {
    // Nothing cached and upstream failing must surface as a throw (the endpoint turns
    // that into the generic 502), and must not write an empty entry to KV.
    try {
      await getDiscordSummary(env);
      expect('failure without any cache throws', false);
    } catch {
      expect('failure without any cache throws', true);
    }
    expect('nothing written to KV on failure', kv.size() === 0);
  }

  if (name === 'live-write') {
    if (!env.DISCORD_TOKEN || !env.CLAUDE_API_KEY || !env.DISCORD_GUILD_ID) {
      expect('live case needs real .dev.vars credentials', false);
    } else {
      const data = await getDiscordSummary(env);
      expect('live run produced summaries', data.messages.length > 0);
      expect('live run wrote exactly one KV entry', kv.puts === 1);
      const stored = await kv.get<Record<string, unknown>>(`discord-summary:v1:${env.DISCORD_GUILD_ID}`, 'json');
      expect('KV entry is JSON with an ISO lastUpdated (Date is not serialisable)', typeof stored?.lastUpdated === 'string');
      expect('KV entry carries the summaries', Array.isArray((stored as { messages?: unknown[] })?.messages));
    }
  }

  if (name === 'live-reread') {
    // Warm the fake KV with a fresh entry, then call with an unreachable guild: a fast
    // answer proves a cold isolate reads the shared cache instead of re-paying Claude.
    const devGuild = devVars.DISCORD_GUILD_ID || '';
    if (!devGuild) {
      expect('live case needs DISCORD_GUILD_ID in .dev.vars', false);
    } else {
      await kv.put(`discord-summary:v1:${env.DISCORD_GUILD_ID}`, JSON.stringify(fixture(HOUR)));
      seededPuts = kv.puts;
      const started = Date.now();
      const data = await getDiscordSummary(env);
      expect('warm KV served without a live fetch', Date.now() - started < 1500);
      expect('warm KV returned the fixture, not a fresh summary', data.messages[0]?.summary === 'Fixture summary.');
      expect('warm KV did not trigger a rewrite', kv.puts === seededPuts);
    }
  }

  for (const check of checks) console.log(`  ${check}`);
  return checks.every((line) => line.startsWith('PASS'));
}

/** The case this process should run, or null when this process is the runner. */
function caseArg(): Case | null {
  const hit = process.argv.find((arg) => arg.startsWith('--case='));
  return hit ? (hit.slice('--case='.length) as Case) : null;
}

async function main(): Promise<void> {
  const wantLive = process.argv.includes('--live');
  const single = caseArg();

  if (single === null) {
    const cases = wantLive ? [...OFFLINE_CASES, ...LIVE_CASES] : OFFLINE_CASES;
    console.log(
      `cache checks: ${cases.join(', ')}${wantLive ? ' (live cases spend Discord + Claude calls)' : ' (offline only)'}\n`,
    );

    const tsx = existsSync('node_modules/.bin/tsx') ? 'node_modules/.bin/tsx' : 'npx';
    let allPassed = true;
    for (const testCase of cases) {
      console.log(`case: ${testCase}`);
      // Each case gets its own process: getDiscordSummary keeps a per-module in-memory
      // layer that would otherwise leak into the next case.
      const child = spawnSync(
        tsx === 'npx' ? 'npx' : 'node_modules/.bin/tsx',
        [__filename, `--case=${testCase}`, ...(wantLive ? ['--live'] : [])],
        { encoding: 'utf8', timeout: 120_000 },
      );
      if (child.error) {
        console.error(`  could not run case: ${child.error.message}`);
        allPassed = false;
        continue;
      }
      if (child.signal) {
        console.error(`  case killed by ${child.signal}`);
        allPassed = false;
      }
      console.log(((child.stdout ?? '') + (child.stderr ?? '')).trimEnd());
      if (child.status !== 0) allPassed = false;
      console.log('');
    }
    process.exit(allPassed ? 0 : 1);
  }

  const ok = await runCase(single);
  console.log(`case ${single}: ${ok ? 'passed' : 'FAILED'}`);
  process.exit(ok ? 0 : 1);
}

void main();
