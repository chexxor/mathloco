import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import Anthropic from '@anthropic-ai/sdk';
import type { CachedData, DiscordChannel, ChannelSummary, DiscordMessage } from '../types/discord';

// Cache management
let cachedData: CachedData | null = null;
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

function initializeClients() {
  const DISCORD_TOKEN = import.meta.env.DISCORD_TOKEN;
  const CLAUDE_API_KEY = import.meta.env.CLAUDE_API_KEY;

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const anthropic = new Anthropic({
    apiKey: CLAUDE_API_KEY,
  });

  return { rest, anthropic };
}

export async function getDiscordSummary(): Promise<CachedData> {
  // Return cached data if it's still fresh
  if (cachedData && (new Date().getTime() - cachedData.lastUpdated.getTime()) < CACHE_DURATION) {
    return cachedData;
  }

  const GUILD_ID = import.meta.env.DISCORD_GUILD_ID;
  const { rest, anthropic } = initializeClients();

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

        if (!channelMessages || channelMessages.length === 0) continue;

        const messageContent = channelMessages
          .map(msg => `${msg.author.username}: ${msg.content}`)
          .join('\n');

        // Get time range
        // const latestMessage = channelMessages[0];
        // const oldestMessage = channelMessages[channelMessages.length - 1];
        // const timeRange = `${new Date(oldestMessage.timestamp).toLocaleDateString()} - ${new Date(latestMessage.timestamp).toLocaleDateString()}`;

        // Generate summary using Claude
        // const summary = await generateSummary(anthropic, messageContent);

        messages.push({
          channelId: channel.id,
          messages: channelMessages
          // summary,
          // timeRange
        });
      } catch (error) {
        console.error(`Error processing channel ${channel.id}:`, error);
        continue;
      }
    }

    // Update cache
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

async function generateSummary(anthropic: Anthropic, content: string): Promise<string> {
  if (!content.trim()) return '';

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Please provide a brief, engaging summary of this Discord chat conversation. Focus on the main topics and key points discussed. Format the summary in HTML with appropriate paragraph tags. Here's the conversation:\n\n${content}`
      }],
    });

    // Handle the response based on the content type
    const firstContent = message.content[0];
    if ('type' in firstContent && firstContent.type === 'text') {
      return firstContent.text || 'No summary available.';
    }
    return 'Unable to generate summary at this time.';
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Unable to generate summary at this time.';
  }
}
