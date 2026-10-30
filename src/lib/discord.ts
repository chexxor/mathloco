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

// This module talks to two HTTP APIs with plain `fetch`, on purpose. It used to import
// `@discordjs/rest`, `discord-api-types` and `@anthropic-ai/sdk`, which rolled up into a
// single 1,439,951-byte route chunk (`dist/server/chunks/discord-summary_*.mjs`) out of a
// 2.2 MB Worker bundle. A cold isolate has to *evaluate* that before answering, and Workers
// measure that as CPU time: the free plan allows 10 ms per HTTP request and exceeds it with
// error 1102. A cold `/api/discord-summary` call measured cpu=13ms wall=1973ms in `wrangler
// tail` - over the ceiling, on the one request that also spends real time upstream. Two GETs
// and one POST do not justify 1.4 MB of SDK, so the SDKs are dev tooling now and the runtime
// path is fetch. The same reasoning is enforced by `npm run check:deploy`.
//
// Node APIs are still requested via the `nodejs_compat` flag for Astro's own server bundle.
// See also: the per-isolate cache below, which is why the cold path was being paid often.

const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_TIMEOUT_MS = 10_000;
// Discord's ToS wants an identifiable User-Agent for bots.
const DISCORD_USER_AGENT = 'minneapolismathbookclub.com (https://minneapolismathbookclub.com, 1.0)';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
// The Anthropic SDK releases this repo previously pinned sent this version header, so the
// wire behaviour is unchanged by dropping the SDK. Note that API version removes sampling
// parameters (temperature/top_p/top_k) - they must not be sent here.
const ANTHROPIC_VERSION = '2026-10-21';
const ANTHROPIC_MAX_TOKENS = 1024;
// Upper bound on how long a retry will hold the request open; a `retry-after` from Anthropic
// is respected but capped, because the caller is a browser waiting on a page.
const RETRY_WAIT_CAP_MS = 10_000;

const SUMMARY_UNAVAILABLE = 'Unable to generate summary at this time.';

// Cache management. Two layers, because a Workers isolate only keeps module state for
// its own lifetime: an in-memory layer per isolate, plus the KV binding shared across
// isolates. Without the KV binding every cold isolate re-fetches Discord and re-pays
// Claude, so a burst of cold starts multiplies cost, latency and - critically - CPU time.
let cachedData: CachedData | null = null;
const MEMORY_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours, per isolate
const KV_CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours, shared
// If Discord or Claude is failing, a summary up to this old is still better than a 502.
const STALE_GRACE_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_KEY_PREFIX = 'discord-summary:v1';

/** JSON-safe form of CachedData (`lastUpdated` is a Date in memory, an ISO string in KV). */
type CachedDataWire = Omit<CachedData, 'lastUpdated'> & { lastUpdated: string };

/** Anthropic's Messages response, narrowed to what is read here. */
interface AnthropicTextBlock {
  type: string;
  text?: string;
}
interface AnthropicWire {
  content?: AnthropicTextBlock[];
  model?: string;
  stop_reason?: string;
  request_id?: string;
  error?: { type?: string };
}

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
   * KV binding (`[[kv_namespaces]]`, binding name `SUMMARY_CACHE`) shared by every isolate.
   * The type stays optional so `npm run check:cache` can exercise both paths, and so a
   * config that drops the binding fails loudly at the cache layer rather than at import.
   */
  SUMMARY_CACHE?: KVNamespace;
};

/** Upstream HTTP failure. Carries a status for logs; the body is never retained. */
class UpstreamError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

function assertCredentials(env: DiscordEnv) {
  if (!env.DISCORD_TOKEN) {
    throw new Error('Discord token is not configured. Please set the DISCORD_TOKEN environment variable.');
  }
  if (!env.CLAUDE_API_KEY) {
    throw new Error('Anthropic API key is not configured. Please set the CLAUDE_API_KEY environment variable.');
  }
}

async function discordGet(env: DiscordEnv, path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(DISCORD_API + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      'User-Agent': DISCORD_USER_AGENT,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
  });

  if (!response.ok) {
    // The response body is deliberately not read or logged: it can echo asset and invite
    // URLs. The status plus the path in the caller's log identifies the call. A 403/10004
    // here is the guild-id mistake that used to live in a dashboard secret - see the
    // DISCORD_GUILD_ID comment in wrangler.toml, and `npm run check:discord`.
    throw new UpstreamError(response.status, `Discord request failed: ${response.status} ${path}`);
  }

  return response.json();
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
  if (!DISCORD_GUILD_ID) {
    throw new Error('DISCORD_GUILD_ID is not configured. Please set the DISCORD_GUILD_ID environment variable.');
  }
  const cacheKey = `${CACHE_KEY_PREFIX}:${DISCORD_GUILD_ID}`;

  if (!env.SUMMARY_CACHE) {
    console.warn('SUMMARY_CACHE KV binding is not configured; summaries are cached per isolate only.');
  } else {
    const shared = await readSharedCache(env, cacheKey);
    if (shared && ageOf(shared) < KV_CACHE_TTL_SECONDS * 1000) {
      return shared;
    }
  }

  assertCredentials(env);

  let channels: DiscordChannel[] = [];
  const summaries: ChannelSummary[] = [];

  try {
    // Fetch channels from the Discord server
    const response = (await discordGet(env, `/guilds/${DISCORD_GUILD_ID}/channels`)) as DiscordChannel[];
    channels = response
      .filter((channel) => channel.type === 0)
      // Narrow to what the page renders. Discord's channel objects also carry `topic`,
      // `permission_overwrites`, `parent_id`, `flags` and `nsfw`, which have no business
      // in a response an anonymous visitor reads or in a KV entry. The previous cast to
      // this shape was a lie that shipped all of it.
      .map((channel) => ({ id: channel.id, name: channel.name, type: channel.type }));

    // Fetch and summarize messages for each channel
    for (const channel of channels) {
      try {
        const channelMessages = (await discordGet(env, `/channels/${channel.id}/messages`, {
          limit: '10',
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
        const summary = await generateSummary(env, messageContent);

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

const retryDelayMs = (response: Response | null, attempt: number): number => {
  const retryAfter = response?.headers.get('retry-after');
  const fromHeader = retryAfter ? Number.parseFloat(retryAfter) * 1000 : Number.NaN;
  const wait = Number.isFinite(fromHeader) ? fromHeader : 250 * 2 ** attempt;
  return Math.min(Math.max(wait, 0), RETRY_WAIT_CAP_MS);
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function generateSummary(env: DiscordEnv, content: string): Promise<string> {
  if (!content.trim()) return '';

  const boundedContent =
    content.length > MAX_SUMMARY_INPUT_CHARS
      ? `${content.slice(0, MAX_SUMMARY_INPUT_CHARS)}\n[truncated]`
      : content;

  const model = env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;

  for (let attempt = 0; attempt <= CLAUDE_MAX_RETRIES; attempt += 1) {
    let response: Response | null = null;
    try {
      response = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'x-api-key': env.CLAUDE_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: ANTHROPIC_MAX_TOKENS,
          system: SUMMARY_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: boundedContent }],
        }),
        signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
      });

      const payload = (await response.json().catch(() => null)) as AnthropicWire | null;

      if (response.ok) {
        // Current models run with thinking enabled, so the first block is not
        // guaranteed to be the text answer.
        const textBlock = payload?.content?.find((block) => block.type === 'text');

        if (!textBlock || textBlock.type !== 'text') {
          console.error('Claude returned no text block', {
            model: payload?.model,
            stopReason: payload?.stop_reason,
          });
          return SUMMARY_UNAVAILABLE;
        }

        // Returned as plain text; the client renders it block by block with
        // parseSummaryBlocks (src/lib/sanitize.ts), so nothing here becomes HTML. If a
        // future consumer renders this as HTML, run it through sanitizeSummaryHtml first.
        return textBlock.text?.trim() || 'No summary available.';
      }

      // Log the request id so the failing call can be reported to Anthropic. The upstream
      // `error.message` is never logged or returned: it has been observed to echo the
      // thing that is wrong (a model id), which is not something to route onward.
      console.error('Claude API error', {
        status: response.status,
        requestId: payload?.request_id,
        errorType: payload?.error?.type,
        model,
        attempt,
      });

      // A retired model id or a bad key will not fix itself, so do not burn retries on it;
      // 429 and 5xx are the retryable ones.
      if (response.status === 429 || response.status >= 500) {
        await sleep(retryDelayMs(response, attempt));
        continue;
      }
      return SUMMARY_UNAVAILABLE;
    } catch (error) {
      // Timeout (AbortSignal.timeout) or a transport failure.
      console.error('Unexpected error calling Claude', {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        model,
        attempt,
      });
      if (attempt < CLAUDE_MAX_RETRIES) {
        await sleep(retryDelayMs(response, attempt));
        continue;
      }
      return SUMMARY_UNAVAILABLE;
    }
  }

  return SUMMARY_UNAVAILABLE;
}

export { SUMMARY_UNAVAILABLE };
