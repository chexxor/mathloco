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

// Two rules the site's posture on member-derived text states once, because a second paraphrase is how one
// of them drifts (D264, "one home per rule"). MS41's naming prompt (below) reuses both verbatim.
export const NO_PEOPLE_RULE = 'Never include usernames, personal details, links, attributes, or any other HTML tags.';
export const HOUSEKEEPING_RULE = 'Skip notices about the running of the club itself: a gathering being cancelled or moved, a venue being closed or reopened, a channel renamed. Those are dates and places, and the site lists them on its own dates page.';

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
  HOUSEKEEPING_RULE,
  // Same round, `/chat`/Revise on the fourth nested label: the model used to title its own block "Chat Topics
  // Summary", which is the fourth time one page said "summary". Naming the heading for its content is the
  // instruction that stops that, and it is why the card's own heading is now the window it covers.
  'Name the heading for what the items are - the thread, the question, the thing being pulled on - never "Summary", "Chat Topics Summary", or a restatement of the section.',
  NO_PEOPLE_RULE,
  'Do not comment on conversation style, group dynamics, or context.',
].join(' ');

/**
 * MS41 (S088, D461): the naming prompt for the harvested `/chat` archive. It shares the two clauses above
 * with the summary prompt, and adds the two that only matter here: the answer is a **name**, not a summary, so
 * a quote is a leak rather than a detail; and a name must be readable by a stranger who has never seen the
 * channel, which is the difference between a topic and an inside reference.
 *
 * The text handed to this prompt is already anonymised by the harvester (`speaker-1`, `speaker-2`), so the
 * model is not the only thing standing between a member's handle and a committed file (D461).
 */
export const THREAD_NAMING_SYSTEM_PROMPT = [
  'You name the ONE subject of a stretch of chat in a mathematics book club, for a public list of what the club pulls on.',
  'Reply with JSON only: {"topic": "three to seven words", "aliases": ["up to three other names people used"]}.',
  'The topic is a subject, not a sentence: no verb phrase, no punctuation beyond what a name needs, no leading article.',
  'Write the topic in sentence case - capitalise the first word and any proper noun, nothing else.',
  // The first harvest pass returned aliases like "I've spent the last week trying to" and "ooh, just came
  // across this again. seems" (@measured 2026-11-20 by `node scripts/harvest-threads.mjs --review`): the model
  // was copying the first words of a message, which is the half-a-sentence defect D188 already forbids in a
  // generated title. An alias is filed under the topic, so it has to be a label, and empty is better than prose.
  'An alias is also a subject label of two to six words, never words lifted out of a message. If nobody used another label for the subject, return an empty aliases list.',
  'Do not quote the messages. Name what was being discussed in words a stranger who has never seen the channel can read.',
  HOUSEKEEPING_RULE,
  NO_PEOPLE_RULE,
  // The alternative to a refusal is a filler name, and a filler name on a public list is the defect that made
  // this milestone: invented items under a heading that claims they are real (S088).
  'If the stretch has no subject worth putting on that list - only logistics, greetings, or one person talking to themselves - reply {"topic": null}.',
  'Organising the club itself is logistics even when the club is what is being talked about: scheduling, promoting, recruiting for, or reflecting on a meetup or a book-club series is not a subject. Reply {"topic": null} for those.',
  'Never write "Summary", "general chat", "miscellaneous", or a restatement of the section as the topic.',
].join(' ');

