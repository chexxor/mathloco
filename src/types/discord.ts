export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export interface DiscordMessage {
  author: {
    username: string;
  };
  content: [{
    text: string
  }];
  timestamp: string;
}

export interface ChannelSummary {
  channelId: string;
  messages: DiscordMessage[];
  summary?: string;
  timeRange?: string;
}

export interface AnthropicMessage {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface CachedData {
  channels: DiscordChannel[];
  messages: ChannelSummary[];
  lastUpdated: Date;
}
