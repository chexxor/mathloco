import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import Anthropic from '@anthropic-ai/sdk';
import type { CachedData, DiscordChannel, ChannelSummary, DiscordMessage } from '../types/discord';

// Load environment variables
const DISCORD_TOKEN = import.meta.env.DISCORD_TOKEN;
const GUILD_ID = import.meta.env.DISCORD_GUILD_ID;
const CLAUDE_API_KEY = import.meta.env.CLAUDE_API_KEY;

// Initialize clients
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
const anthropic = new Anthropic({
  apiKey: CLAUDE_API_KEY,
});

// Cache management
let cachedData: CachedData | null = null;
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

export async function getDiscordSummary(): Promise<CachedData> {
  // Return cached data if it's still fresh
  if (cachedData && (new Date().getTime() - cachedData.lastUpdated.getTime()) < CACHE_DURATION) {
    return cachedData;
  }

  let channels: DiscordChannel[] = [];
  const messages: ChannelSummary[] = [];

  try {
    // Fetch channels from the Discord server
    const response = await rest.get(
      Routes.guildChannels(GUILD_ID)
    ) as DiscordChannel[];
    channels = response.filter(channel => channel.type === 0);

    // Fetch and summarize messages for each channel
    for (const channel of channels) {
      try {
        const channelMessages = (await rest.get(
          Routes.channelMessages(channel.id),
          { query: new URLSearchParams({ limit: '10' }) }
        )) as DiscordMessage[];

        if (!channelMessages) continue;

        const messageContent = channelMessages
          .map(msg => `${msg.author.username}: ${msg.content}`)
          .join('\n');

        const messageTimestampOldest = channelMessages[channelMessages.length - 1]?.timestamp;
        const messageTimestampNewest = channelMessages[0]?.timestamp;

        const timeRange = messageTimestampOldest && messageTimestampNewest
          ? `${new Date(messageTimestampOldest).toLocaleDateString()} - ${new Date(messageTimestampNewest).toLocaleDateString()}`
          : undefined;

        const summary = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `List the main topics discussed in these Discord messages. Format the response in HTML with a simple list structure using <h4> for the heading and <ul>/<li> for the topics. Do not include any analysis of conversation style, group dynamics, or context. Do not include any usernames or personal details:\n\n${messageContent}`
          }],
        });

        messages.push({
          channelId: channel.id,
          messages: channelMessages,
          summary: summary.content[0].text,
          timeRange
        });
      } catch (error) {
        console.error(`Error processing channel ${channel.id}:`, error);
        continue;
      }
    }

    cachedData = {
      channels,
      messages,
      lastUpdated: new Date()
    };

    return cachedData;
  } catch (error) {
    console.error('Error fetching Discord data:', error);
    throw error;
  }
}
