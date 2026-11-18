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
  // Round-7 communication review (2026-11-18), `/chat`/Remove "Cancellation of a math gathering" and "A cafe
  // being closed for the day" - "this is the page's most damaging content": a visitor's first impression of the
  // club's intellectual life included a cafe closure and a cancellation as peer items to quaternions and Lean.
  // The instruction is the only home that can make the distinction, because it is the only place that sees the
  // messages: a filter over the finished text cannot tell "cancellation of a math gathering" (a date the club
  // called off) from a cancellation in a proof, and deleting on a pattern would remove real mathematics. The
  // letter's other half - "or hand-edit before publish" - is the operator's, not this seat's.
  'Skip notices about the running of the club itself: a gathering being cancelled or moved, a venue being closed or reopened, a channel renamed. Those are dates and places, and the site lists them on its own dates page.',
  // Same round, `/chat`/Revise on the fourth nested label: the model used to title its own block "Chat Topics
  // Summary", which is the fourth time one page said "summary". Naming the heading for its content is the
  // instruction that stops that, and it is why the card's own heading is now the window it covers.
  'Name the heading for what the items are - the thread, the question, the thing being pulled on - never "Summary", "Chat Topics Summary", or a restatement of the section.',
  'Never include usernames, personal details, links, attributes, or any other HTML tags.',
  'Do not comment on conversation style, group dynamics, or context.',
].join(' ');
