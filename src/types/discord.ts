export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export interface DiscordMessage {
  author: {
    username: string;
  };
  /** Discord returns message content as a string. */
  content: string;
  timestamp: string;
}

/** A generated summary for one channel. Raw message text is intentionally not included. */
export interface ChannelSummary {
  channelId: string;
  summary?: string;
  timeRange?: string;
}

export interface CachedData {
  channels: DiscordChannel[];
  /** Per-channel summaries, keyed by `channelId`. */
  messages: ChannelSummary[];
  lastUpdated: Date;
}
