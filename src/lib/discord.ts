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

// Cache management
let cachedData: CachedData | null = null;
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

// The Cloudflare `Env` type (bindings generated into worker-configuration.d.ts by
// `wrangler types`, secrets/vars declared in src/env.d.ts) is passed in explicitly so
// this module stays testable.
export type DiscordEnv = Pick<Cloudflare.Env, 'DISCORD_TOKEN' | 'DISCORD_GUILD_ID' | 'CLAUDE_API_KEY'> & {
  CLAUDE_MODEL?: string;
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

export async function getDiscordSummary(env: DiscordEnv): Promise<CachedData> {
  // Return cached data if it's still fresh
  if (cachedData && new Date().getTime() - cachedData.lastUpdated.getTime() < CACHE_DURATION) {
    return cachedData;
  }

  const { DISCORD_GUILD_ID } = env;
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
    cachedData = {
      channels,
      messages: summaries,
      lastUpdated: new Date(),
    };

    return cachedData;
  } catch (error) {
    console.error('Error fetching Discord data:', error);
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
