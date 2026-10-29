import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import Anthropic from '@anthropic-ai/sdk';
import type {
  CachedData,
  ChannelSummary,
  DiscordChannel,
  DiscordMessage,
} from '../types/discord';
import {
  CLAUDE_MAX_RETRIES,
  CLAUDE_TIMEOUT_MS,
  DEFAULT_CLAUDE_MODEL,
  MAX_SUMMARY_INPUT_CHARS,
  SUMMARY_SYSTEM_PROMPT,
} from './claude';

// Cache management. Two layers, because a Workers isolate only keeps module state for
// its own lifetime: an in-memory layer per isolate, plus an optional KV binding shared
// across isolates. Without the KV binding every cold isolate re-fetches Discord and
// re-pays Claude, so a burst of cold starts multiplies cost and latency.
let cachedData: CachedData | null = null;
const MEMORY_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours, per isolate
const KV_CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours, shared
// If Discord or Claude is failing, a summary up to this old is still better than a 502.
const STALE_GRACE_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_KEY_PREFIX = 'discord-summary:v1';

/** JSON-safe form of CachedData (`lastUpdated` is a Date in memory, an ISO string in KV). */
type CachedDataWire = Omit<CachedData, 'lastUpdated'> & { lastUpdated: string };

const toWire = (data: CachedData): CachedDataWire => ({
  ...data,
  lastUpdated: data.lastUpdated.toISOString(),
});

const fromWire = (data: CachedDataWire): CachedData => ({
  ...data,
  lastUpdated: new Date(data.lastUpdated),
});

const ageOf = (data: CachedData) => new Date().getTime() - data.lastUpdated.getTime();

// The Cloudflare `Env` type (bindings generated into worker-configuration.d.ts by
// `wrangler types`, secrets/vars declared in src/env.d.ts) is passed in explicitly so
// this module stays testable.
export type DiscordEnv = Pick<Cloudflare.Env, 'DISCORD_TOKEN' | 'DISCORD_GUILD_ID' | 'CLAUDE_API_KEY'> & {
  CLAUDE_MODEL?: string;
  /**
   * Optional KV binding (`[[kv_namespaces]]`, binding name `SUMMARY_CACHE`). When it is
   * absent the cache degrades to one entry per isolate, which is functionally correct
   * but pays for a fresh Discord + Claude round trip on every cold isolate.
   */
  SUMMARY_CACHE?: KVNamespace;
};

function initializeClients(env: DiscordEnv) {
  const { DISCORD_TOKEN, CLAUDE_API_KEY } = env;

  if (!DISCORD_TOKEN) {
    throw new Error('Discord token is not configured. Please set the DISCORD_TOKEN environment variable.');
  }

  if (!CLAUDE_API_KEY) {
    throw new Error('Anthropic API key is not configured. Please set the CLAUDE_API_KEY environment variable.');
  }

  const discordAPI = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  // SDK v1.x sends `anthropic-version: 2026-10-21`. Note that sampling parameters
  // (temperature/top_p/top_k) were removed in that API version, so they must not be
  // sent here.
  const anthropic = new Anthropic({
    apiKey: CLAUDE_API_KEY,
    maxRetries: CLAUDE_MAX_RETRIES,
    timeout: CLAUDE_TIMEOUT_MS,
  });

  return { discordAPI, anthropic };
}

async function readSharedCache(env: DiscordEnv, key: string): Promise<CachedData | null> {
  if (!env.SUMMARY_CACHE) return null;

  try {
    const stored = await env.SUMMARY_CACHE.get<CachedDataWire>(key, 'json');
    if (!stored) return null;
    cachedData = fromWire(stored);
    return cachedData;
  } catch (error) {
    // A KV hiccup must not take the page down; fall through to a live fetch.
    console.error('Failed to read summary cache from KV:', error);
    return null;
  }
}

async function writeSharedCache(env: DiscordEnv, key: string, data: CachedData): Promise<void> {
  if (!env.SUMMARY_CACHE) return;

  try {
    await env.SUMMARY_CACHE.put(key, JSON.stringify(toWire(data)), {
      expirationTtl: KV_CACHE_TTL_SECONDS,
    });
  } catch (error) {
    console.error('Failed to write summary cache to KV:', error);
  }
}

export async function getDiscordSummary(env: DiscordEnv): Promise<CachedData> {
  // Return cached data if it's still fresh
  if (cachedData && ageOf(cachedData) < MEMORY_CACHE_TTL_MS) {
    return cachedData;
  }

  const { DISCORD_GUILD_ID } = env;
  const cacheKey = `${CACHE_KEY_PREFIX}:${DISCORD_GUILD_ID}`;

  if (!env.SUMMARY_CACHE && !env.DISCORD_GUILD_ID) {
    throw new Error('DISCORD_GUILD_ID is not configured. Please set the DISCORD_GUILD_ID environment variable.');
  }

  if (!env.SUMMARY_CACHE) {
    console.warn('SUMMARY_CACHE KV binding is not configured; summaries are cached per isolate only.');
  } else {
    const shared = await readSharedCache(env, cacheKey);
    if (shared && ageOf(shared) < KV_CACHE_TTL_SECONDS * 1000) {
      return shared;
    }
  }
  const { discordAPI, anthropic } = initializeClients(env);

  let channels: DiscordChannel[] = [];
  const summaries: ChannelSummary[] = [];

  try {
    // Fetch channels from the Discord server
    const response = (await discordAPI.get(
      Routes.guildChannels(DISCORD_GUILD_ID),
    )) as DiscordChannel[];
    channels = response.filter((channel) => channel.type === 0);

    // Fetch and summarize messages for each channel
    for (const channel of channels) {
      try {
        const channelMessages = (await discordAPI.get(Routes.channelMessages(channel.id), {
          query: new URLSearchParams({ limit: '10' }),
        })) as DiscordMessage[];

        if (!channelMessages || channelMessages.length === 0) continue;

        const messageContent = channelMessages
          .map((msg) => `${msg.author.username}: ${msg.content}`)
          .join('\n');

        // Get time range
        const latestMessage = channelMessages[0];
        const oldestMessage = channelMessages[channelMessages.length - 1];
        const timeRange = `${new Date(oldestMessage.timestamp).toLocaleDateString()} - ${new Date(
          latestMessage.timestamp,
        ).toLocaleDateString()}`;

        // Generate summary using Claude
        const summary = await generateSummary(anthropic, env, messageContent);

        summaries.push({
          channelId: channel.id,
          summary,
          timeRange,
        });
      } catch (error) {
        console.error(`Error processing channel ${channel.id}:`, error);
        continue;
      }
    }

    // Update cache. Raw message text is deliberately not cached or served: the page
    // only renders the summaries, and a public endpoint should not hand out chat logs
    // and usernames.
    const fresh: CachedData = {
      channels,
      messages: summaries,
      lastUpdated: new Date(),
    };

    // Do not park an empty result in the cache for a day: every channel failing is a
    // reason to retry on the next request rather than to keep serving nothing.
    if (summaries.length > 0) {
      cachedData = fresh;
      await writeSharedCache(env, cacheKey, fresh);
    } else {
      console.warn('Discord fetch produced no summaries; not caching.');
    }

    return fresh;
  } catch (error) {
    console.error('Error fetching Discord data:', error);

    // Upstream is failing (rate limit, Discord/Claude outage). Serve the most recent
    // summary we have if it is within the grace window instead of a hard 502.
    if (cachedData && ageOf(cachedData) < STALE_GRACE_MS) {
      console.warn('Serving stale Discord summary cache', {
        ageHours: Math.round(ageOf(cachedData) / 3_600_000),
      });
      return cachedData;
    }

    throw error;
  }
}

export async function generateSummary(
  anthropic: Anthropic,
  env: DiscordEnv,
  content: string,
): Promise<string> {
  if (!content.trim()) return '';

  const boundedContent =
    content.length > MAX_SUMMARY_INPUT_CHARS
      ? `${content.slice(0, MAX_SUMMARY_INPUT_CHARS)}\n[truncated]`
      : content;

  try {
    const message = await anthropic.messages.create({
      model: env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL,
      max_tokens: 1024,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: boundedContent }],
    });

    // Current models run with thinking enabled, so the first block is not
    // guaranteed to be the text answer.
    const textBlock = message.content.find((block) => block.type === 'text');

    if (!textBlock || textBlock.type !== 'text') {
      console.error('Claude returned no text block', { model: message.model, stopReason: message.stop_reason });
      return 'Unable to generate summary at this time.';
    }

    // Returned as plain text; the client renders it block by block with
    // parseSummaryBlocks (src/lib/sanitize.ts), so nothing here becomes HTML. If a
    // future consumer renders this as HTML, run it through sanitizeSummaryHtml first.
    return textBlock.text.trim() || 'No summary available.';
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      // Log the request id so the failing request can be reported to Anthropic,
      // but never forward the upstream message to the browser.
      console.error('Claude API error', {
        status: error.status,
        name: error.name,
        requestId: (error as { request_id?: string }).request_id,
        model: env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL,
      });
    } else {
      console.error('Unexpected error calling Claude', error);
    }
    return 'Unable to generate summary at this time.';
  }
}
