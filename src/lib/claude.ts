// Model naming for the Messages API. `claude-3-haiku-20240307` was retired on
// 2026-04-20, so requests naming it now fail with a 404. Current Haiku is the
// right tier for this task (short summarisation of chat logs).
// See https://platform.claude.com/docs/en/about-claude/model-deprecations
export const DEFAULT_CLAUDE_MODEL = 'claude-haiku-5-5';

// The SDK defaults to a 10 minute timeout with 2 retries, which is far longer
// than a Cloudflare Pages Function should spend on one upstream call.
export const CLAUDE_TIMEOUT_MS = 30_000;
export const CLAUDE_MAX_RETRIES = 2;

// Upper bound on the chat text we send upstream: keeps cost/latency bounded for
// a publicly reachable endpoint.
export const MAX_SUMMARY_INPUT_CHARS = 8_000;

export const SUMMARY_SYSTEM_PROMPT = [
  'You summarise the topics discussed in a set of chat messages.',
  'Reply ONLY with HTML: an <h4> heading followed by a <ul> list of short topic items.',
  'Never include usernames, personal details, links, attributes, or any other HTML tags.',
  'Do not comment on conversation style, group dynamics, or context.',
].join(' ');
