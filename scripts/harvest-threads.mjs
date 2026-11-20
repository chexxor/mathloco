#!/usr/bin/env node
/**
 * harvest-threads.mjs - read two years of the club's Discord and write a ratified-able archive.
 *
 * Why this exists (MS41, S088, D461, 2026-11-20). `/chat` claims to say what the club is pulling on, and the
 * list under that claim is invented. The operator's answer was to gather the real thing - "I run the harvest on
 * this rig and commit the resulting file; you review the file before it ships" - so this tool's job ends where
 * the human's begins: it produces **candidates with pointers**, never published content. A model names them;
 * the operator signs them; `src/lib/threads.mjs` decides what may render; `check:thread-topics` proves it.
 *
 * What this deliberately is NOT:
 *   - **not request-time.** The output `data/discord-threads.json` is committed and read at build time, the
 *     topology D73 chose for the calendar and the one `data/discord-events.json` follows: an upstream being
 *     down costs editing, not serving.
 *   - **not a repository of what anyone said.** Messages are read into memory to find a subject and are thrown
 *     away. What is committed is pointers - channel id, message ids, a date - because a quotation on a public
 *     page is a member's words published by a site that promises not to do that (D461, and the same posture
 *     that keeps `user_count` out of the events snapshot, D265). `threadFindings()` fails an evidence object
 *     carrying any other key, and this script refuses to write a document it fails.
 *   - **not the publisher.** Every entry it writes is `status: "candidate"` with no signature. `publishedThreads()`
 *     prints signed entries only, so a harvest that nobody reviewed renders nothing.
 *   - **not anonymous-by-hope.** Authors are folded to `speaker-1`, `speaker-2` before anything goes to the
 *     model, so a handle cannot reach Anthropic either, and the naming prompt repeats the site's own
 *     no-people rule (src/lib/claude.ts, NO_PEOPLE_RULE).
 *
 * Shape of the guild this was written against, measured 2026-11-20 on this rig (Linux native, Node 24.22.1,
 * `Bot` token, verification level 0) by `.design/tmp-harvest-probe.mjs` and by this script's own reads:
 *   - `GET /guilds/{g}/channels` -> 3 channels: **1** text (type 0) and **2** categories (type 4). Everything
 *     the club says happens in one channel and its threads, so the "read every channel" problem is small here.
 *   - `GET /channels/{id}/messages?limit=100` -> 200, 100 messages, 98 with non-empty content, oldest
 *     2026-05-09 in that first page, and the bucket header said `X-RateLimit-Remaining: 4`,
 *     `X-RateLimit-Reset-After: 1.000` - five reads per five seconds per channel, which is why the pager
 *     sleeps instead of racing.
 *   - `GET /channels/{id}/threads/archived/public` -> **21** archived threads, `has_more: false`. Threads are
 *     not in the guild channel list, so they are listed separately and each one is treated as its own
 *     conversation: Discord already did the topicting.
 *   - Message content is readable by this bot (98 of 100 non-empty above) because the app is unverified
 *     (verification level 0); Discord's MESSAGE_CONTENT privileged-intent rules bite at verification, and if
 *     content ever arrives empty this script says so instead of inventing topics.
 *
 *   node scripts/harvest-threads.mjs                read, cluster, print the counts, write nothing, spend no calls
 *   node scripts/harvest-threads.mjs --name         + name the clusters with Claude (spends model calls)
 *   node scripts/harvest-threads.mjs --write        + write data/discord-threads.json (implies --name)
 *   node scripts/harvest-threads.mjs --check        verdict on the committed file (same verdict as the gate)
 *   --since 2024-11-20   window start (default: two years back from today)
 *   --channel <id>       one channel only, for a bounded run
 *   --gap-hours 6        a main-channel conversation breaks when the next message is later than this
 *   --min-messages 4     a cluster shorter than this is chatter, not a topic
 *   --max-clusters N     cap the naming pass (cost control), applied to the longest clusters first
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THREADS_FILE, THREADS_RULE, mergeThreads, threadFindings, readThreads, isRatified } from '../src/lib/threads.mjs';
// The naming prompt and its two shared clauses live with the site's other model prompts, not here (D264).
// src/lib/claude.ts is TypeScript, so the strings are inlined from it by import path only in comments; the
// runtime copy is fetched below with a plain read, keeping this script free of a build step.
const CLAUDE_SRC = `${fileURLToPath(new URL('..', import.meta.url))}src/lib/claude.ts`;

const root = fileURLToPath(new URL('..', import.meta.url));
const UA = 'matheapolis.com (https://matheapolis.com, 1.0)';           // what Discord asks bots to send
const API = 'https://discord.com/api/v10';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const EIGHT_K = 8_000;                                                  // the same input bound the summary path uses
// These models emit thinking before the answer, so a 300-token budget truncated 7 of 39 naming replies on the
// first run (@measured 2026-11-20: `stop_reason max_tokens`, 7 failures / 39 calls). A name is short; the
// budget is for the thinking, not the answer.
const MODEL_MAX_TOKENS = 1_200;

// -------------------------------------------------------------------------------- config

function secret(name) {
  if (process.env[name]) return process.env[name].trim();
  const dev = `${root}.dev.vars`;
  if (existsSync(dev)) {
    const m = new RegExp(`^${name}\\s*=\\s*(.*)$`, 'm').exec(readFileSync(dev, 'utf8'));
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

function guildId() {
  const fromEnv = secret('DISCORD_GUILD_ID');
  if (fromEnv) return fromEnv;
  const m = /^DISCORD_GUILD_ID\s*=\s*"([^"]+)"/m.exec(readFileSync(`${root}wrangler.toml`, 'utf8'));
  return m ? m[1] : null;
}

/** The naming prompt, read out of src/lib/claude.ts so there is one home for it. A build step is not
 *  something a harvest script should need, and copying the text here would be the second paraphrase (D264). */
function namingPrompt() {
  const src = readFileSync(CLAUDE_SRC, 'utf8');
  const clause = (name) => {
    const m = new RegExp(`^export const ${name} = '(.*?)';`, 'm').exec(src);
    if (!m) throw new Error(`src/lib/claude.ts no longer defines ${name} - the naming prompt cannot be assembled`);
    return m[1];
  };
  const block = /export const THREAD_NAMING_SYSTEM_PROMPT = \[([\s\S]*?)\]\.join\(' '\);/.exec(src);
  if (!block) throw new Error('src/lib/claude.ts no longer defines THREAD_NAMING_SYSTEM_PROMPT');
  const expand = (l) => {
    if (l === 'HOUSEKEEPING_RULE,') return clause('HOUSEKEEPING_RULE');
    if (l === 'NO_PEOPLE_RULE,') return clause('NO_PEOPLE_RULE');
    return l.replace(/^'/, '').replace(/',$/, '');
  };
  const lines = block[1].split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).map(expand);
  return lines.join(' ');
}

// ---------------------------------------------------------------------------- discord

const reads = [];   // every request this run made, sans headers - the file's own audit trail
let rateWaitMs = 0; // how long this run slept because Discord said to

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dget(token, path, query = {}) {
  const qs = Object.entries(query).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `${API}${path}${qs ? `?${qs}` : ''}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bot ${token}`, 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    let json = null;
    try { json = JSON.parse(body); } catch { /* a non-JSON answer is a failed read, reported below */ }
    reads.push({ url, status: res.status, bytes: Buffer.byteLength(body) });
    if (res.status === 429) {
      const wait = Math.min(Number(json?.retry_after ?? res.headers.get('retry-after') ?? 2) * 1000, 30_000);
      rateWaitMs += wait;
      await sleep(wait);
      continue;
    }
    // Honour the bucket before the next call rather than earning a 429 for it.
    const remaining = Number(res.headers.get('x-ratelimit-remaining'));
    const resetAfter = Number(res.headers.get('x-ratelimit-reset-after'));
    if (remaining === 0 && Number.isFinite(resetAfter)) {
      rateWaitMs += resetAfter * 1000;
      await sleep(resetAfter * 1000 + 50);
    }
    return { status: res.status, json };
  }
  return { status: 429, json: null };
}

/** Page a channel or thread backwards from now until the window opens. Newest-first is what the endpoint
 *  returns (measured 2026-11-20: the first page of the club's text channel ends at 2026-05-09, older than the
 *  100 returned messages' newest entry), so the cursor is the oldest id seen. */
async function history(token, id, sinceMs) {
  const out = [];
  let before = undefined;
  for (let page = 0; page < 60; page++) {
    const r = await dget(token, `/channels/${id}/messages`, { limit: 100, before });
    if (r.status !== 200 || !Array.isArray(r.json)) return { messages: out, status: r.status };
    if (!r.json.length) return { messages: out, status: 200 };
    let oldest = null;
    let olderThanWindow = false;
    for (const m of r.json) {
      const ts = Date.parse(m.timestamp ?? '');
      if (!Number.isFinite(ts)) continue;
      oldest = m.id;
      if (ts < sinceMs) { olderThanWindow = true; continue; }
      out.push(m);
    }
    if (olderThanWindow || r.json.length < 100) return { messages: out, status: 200 };
    before = oldest;
  }
  return { messages: out, status: 200, truncated: true };
}

/** Archived public and private threads of a channel. Threads are not in `GET /guilds/{g}/channels` (measured
 *  2026-11-20: the guild's channel list is 3 entries and holds none of its 21 threads), so they are listed
 *  here. The docs order them by `archive_timestamp` descending and return `has_more`, so the cursor is the
 *  oldest archive timestamp seen. */
async function archivedThreads(token, channelId) {
  const all = [];
  for (const kind of ['public', 'private']) {
    let before = undefined;
    for (let page = 0; page < 10; page++) {
      const r = await dget(token, `/channels/${channelId}/threads/archived/${kind}`, before ? { before } : {});
      const list = Array.isArray(r.json?.threads) ? r.json.threads : [];
      all.push(...list);
      if (!r.json?.has_more || !list.length) break;
      before = list[list.length - 1]?.archive_timestamp;
    }
  }
  return all;
}

// ---------------------------------------------------------------------------- clustering

/** One cluster = one conversation. A Discord thread is already one (members chose to open it under a name),
 *  so it becomes one cluster whole. The main channel is cut by silence: a gap longer than `gapHours` ends a
 *  conversation, and a cluster is capped so one enormous day cannot cost an enormous call. */
function cluster(container, messages, { gapHours, minMessages, maxMessages = 40 }) {
  if (!messages.length) return [];
  if (container.kind === 'thread') {
    const ok = messages.length >= minMessages && new Set(messages.map((m) => m.authorId)).size >= 2;
    return ok ? [{ container, messages, name: container.name }] : [];
  }
  const sorted = [...messages].sort((a, b) => a.ts - b.ts);
  const groups = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].ts - sorted[i - 1].ts > gapHours * 3600 * 1000 || cur.length >= maxMessages) {
      groups.push(cur);
      cur = [];
    }
    cur.push(sorted[i]);
  }
  groups.push(cur);
  return groups
    .filter((g) => g.length >= minMessages && new Set(g.map((m) => m.authorId)).size >= 2)
    .map((g) => ({ container, messages: g, name: null }));
}

/** A label, or a fragment of chat that is not one? A topic or alias goes on a public list, so the same rule
 *  D188 wrote for generated titles applies here: no half sentence. This is mechanical on purpose - a prompt can
 *  be asked politely, but a discarded fragment is counted, so the review still sees that something was offered.
 *
 *  The shape that forced this: members title threads by pasting the question they are asking, so a Discord
 *  thread title can be "ooh, just came across this again. seems" - true, useful as evidence, wrong as a label.
 *  It stays in `evidence[].channelName`, which the page never prints. */
const DANGLING = new Set(['a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'as', 'at', 'is', 'i', "i've", 'ive', 'my', 'me', 'we', 'you', 'it', 'this', 'that', 'here', "here's", 'seems', 'just', 'but', 'if', 'so', 'about']);
function labelIsProse(s) {
  const t = String(s ?? '').trim();
  const words = t.split(/\s+/);
  if (!words.length) return true;
  if (words.length > 8) return true;
  if (/[.,!?;:]$/.test(t)) return true;                 // a label does not end a sentence
  if (DANGLING.has(words[words.length - 1].toLowerCase())) return true;
  return /\b(i'?ve|i|we|you|ooh|oh|here's|gonna|idk|lol)\b/i.test(t);
}

/** Same scrubbing as `anonymize`, for a *name* rather than a message body: a Discord thread is named by a
 *  member, and members name things after each other. Four of the 33 candidates in the first pass carried an
 *  `@handle` in the thread name, which would have landed in `evidence[].channelName` - a field that is never
 *  printed but is committed, and the contract forbids a member name anywhere in the file (S088). */
function scrub(name) {
  return String(name ?? '')
    .replace(/<[@#!][^>]*>/g, '[a mention]')
    .replace(/@[\p{L}\p{N}_.]{2,}/gu, '[a handle]')
    .replace(/https?:\/\/\S+/g, '[a link]');
}

/** Author ids -> `speaker-N`, stable inside a cluster and meaningless outside it. The model never sees an id
 *  it could look up, which is the part a prompt cannot promise (D461).
 *
 *  The text is scrubbed on the way in as well: Discord's own mention syntax (`<@123>`, `<@!123>`, `<#123>`),
 *  a typed `@handle`, and any URL are replaced before the call. A prompt that says "never include usernames"
 *  is doing someone's job for them if the usernames are handed over, and a link in a name is a thing this
 *  site decides centrally (src/config.json), never per topic.
 */
function anonymize(messages) {
  const who = new Map();
  return messages.map((m) => {
    if (!who.has(m.authorId)) who.set(m.authorId, `speaker-${who.size + 1}`);
    const text = (m.content ?? '')
      .replace(/<[@#!][^>]*>/g, '[a mention]')
      // Anywhere, not only after whitespace: the first run's output carried an @handle in an alias because a
      // name typed inside parentheses ("(@someone)") slipped past a whitespace-anchored pattern, and the model
      // repeated it (@measured 2026-11-20 by this script's first --write run, which refused to write the file).
      .replace(/@[\p{L}\p{N}_.]{2,}/gu, '[a handle]')
      .replace(/https?:\/\/\S+/g, '[a link]')
      .replace(/\s+/g, ' ')
      .trim();
    return `${who.get(m.authorId)}: ${text}`;
  }).join('\n').slice(0, EIGHT_K);
}

const dayOf = (ts) => new Date(ts).toISOString().slice(0, 10);

/** Evidence, in the shape src/lib/threads.mjs will accept: one object per (channel, date), message ids
 *  deduped. This is the only thing about the messages that survives the run. */
function evidenceOf(messages, channelKind) {
  const byKey = new Map();
  for (const m of messages) {
    const k = `${m.channelId}|${dayOf(m.ts)}`;
    const e = byKey.get(k) ?? { channelId: m.channelId, channelKind, channelName: m.channelName, date: dayOf(m.ts), messageIds: [] };
    e.messageIds.push(m.id);
    byKey.set(k, e);
  }
  return [...byKey.values()].map((e) => ({ ...e, messageIds: [...new Set(e.messageIds)].sort() }));
}

// ---------------------------------------------------------------------------- naming

async function nameCluster(key, text, { model }) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': ANTHROPIC_VERSION, 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: MODEL_MAX_TOKENS, system: namingPrompt(), messages: [{ role: 'user', content: text }] }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    // The upstream message is never printed: it has been observed to echo the thing that is wrong
    // (src/lib/discord.ts, same call). Status and request id are enough to act on.
    return { error: `status ${res.status}`, requestId: payload?.request_id ?? null };
  }
  const block = (payload?.content ?? []).find((b) => b.type === 'text');
  const raw = (block?.text ?? '').trim();
  const jsonMatch = /\{[\s\S]*\}/.exec(raw);
  if (!jsonMatch) {
    // The first run lost 7 of 39 calls this way. `stop_reason: "max_tokens"` says the budget was the cause
    // (these models emit thinking before the answer), which is why MODEL_MAX_TOKENS is 1200 and not 300.
    return { error: `no JSON in the reply (stop_reason ${payload?.stop_reason ?? '?'})` };
  }
  let parsed = null;
  try { parsed = JSON.parse(jsonMatch[0]); } catch { return { error: 'JSON did not parse' }; }
  return {
    topic: typeof parsed.topic === 'string' ? parsed.topic.trim() : null,
    aliases: Array.isArray(parsed.aliases) ? parsed.aliases.filter((a) => typeof a === 'string' && a.trim()).map((a) => a.trim()) : [],
    usage: { input: payload?.usage?.input_tokens ?? 0, output: payload?.usage?.output_tokens ?? 0 },
    model: payload?.model ?? model,
  };
}

// -------------------------------------------------------------------------------- run

async function main() {
  const args = process.argv.slice(2);
  const opt = (flag, dflt) => { const i = args.indexOf(flag); return i < 0 ? dflt : args[i + 1]; };
  const started = Date.now();

  if (args.includes('--check')) {
    const doc = readThreads(THREADS_FILE);
    if (!doc) { console.log('check:thread-topics FAIL - data/discord-threads.json does not exist; run this script with --write'); return 1; }
    const { findings, notes } = threadFindings(doc);
    findings.forEach((f) => console.log(`  FAIL ${f.rule}: ${f.detail}`));
    notes.forEach((n) => console.log(`  pending ${n}`));
    console.log(`harvest-threads --check: ${(doc.threads ?? []).length} entries, ${findings.length} finding(s), ${notes.length} awaiting ratification`);
    return findings.length ? 1 : 0;
  }

  if (args.includes('--review')) {
    const doc = readThreads(opt('--file', THREADS_FILE));
    if (!doc) { console.log('review: data/discord-threads.json does not exist yet - run with --write first'); return 1; }
    return review(doc);
  }

  /* Re-merge a previous run's cached candidates without touching Discord or Anthropic. A contract or merge
   * defect should be re-runnable for free, and this is how the merge is proven idempotent: run it twice and
   * threads[] must come back byte-identical. It refuses without an existing file, because the first pass has
   * to come from the real archive. */
  const mergeCache = opt('--merge-cache', null);
  if (mergeCache) {
    const existing = readThreads(THREADS_FILE);
    if (!existing) { console.error('merge-cache: there is no data/discord-threads.json to merge into. Do a full --write run first.'); return 1; }
    let candidates = null;
    try {
      candidates = JSON.parse(readFileSync(resolve(root, mergeCache), 'utf8'));
    } catch (err) {
      console.error(`merge-cache: ${mergeCache} is not readable as JSON (${err.message}). The cache is scratch (.design/); do a full --write run to make a new one.`);
      return 1;
    }
    if (!Array.isArray(candidates) || !candidates.length) { console.error(`merge-cache: ${mergeCache} holds no candidates array.`); return 1; }
    const { doc, stats } = mergeThreads(existing, candidates, { harvestedAt: new Date().toISOString() });
    const before = JSON.stringify(existing.threads ?? []);
    const after = JSON.stringify(doc.threads);
    const { findings, notes } = threadFindings(doc);
    console.log(`merge-cache ${mergeCache}: ${candidates.length} candidate(s) -> ${doc.threads.length} entries (added ${stats.added}, merged ${stats.merged}, kept ${stats.kept})`);
    console.log(`threads[] ${before === after ? 'UNCHANGED - re-merging an already-merged file is a no-op' : 'CHANGED - the merge is not idempotent'}`);
    console.log(`source.harvestedAt ${doc.source.harvestedAt}; findings ${findings.length}; ${notes.length} awaiting ratification`);
    findings.slice(0, 10).forEach((f) => console.log(`  FAIL ${f.rule}: ${f.detail.replace(/[@#][\p{L}\p{N}_.]{2,}/gu, '@[masked]')}`));
    if (findings.length) return 1;
    if (args.includes('--write')) { writeFileSync(THREADS_FILE, `${JSON.stringify(doc, null, 2)}\n`); console.log(`wrote ${THREADS_FILE}`); }
    return 0;
  }

  const token = secret('DISCORD_TOKEN');
  const guild = guildId();
  if (!token) { console.error('harvest-threads: no DISCORD_TOKEN (environment or .dev.vars). Nothing read, nothing written.'); return 1; }
  if (!guild) { console.error('harvest-threads: no DISCORD_GUILD_ID. It is in wrangler.toml [vars].'); return 1; }

  const sinceIso = opt('--since', new Date(Date.now() - 2 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const sinceMs = Date.parse(`${sinceIso}T00:00:00Z`);
  const only = opt('--channel', null);
  const gapHours = Number(opt('--gap-hours', 6));
  const minMessages = Number(opt('--min-messages', 4));
  const maxClusters = Number(opt('--max-clusters', Infinity));

  const ch = await dget(token, `/guilds/${guild}/channels`);
  if (ch.status !== 200) { console.error(`harvest-threads: guild channels answered ${ch.status} - the token is missing, expired, or lacks READ_MESSAGE_HISTORY`); return 1; }
  const textish = (ch.json ?? []).filter((c) => (c.type === 0 || c.type === 11) && (!only || c.id === only));

  let messagesRead = 0;
  let threadCount = 0;
  const clusters = [];
  const perContainer = [];
  for (const c of textish) {
    const cname = scrub(c.name);
    const h = await history(token, c.id, sinceMs);
    const msgs = h.messages.map((m) => ({ id: m.id, channelId: c.id, channelName: cname, ts: Date.parse(m.timestamp), authorId: m.author_id ?? m?.author?.id ?? '', content: m.content ?? '' }));
    messagesRead += msgs.length;
    perContainer.push({ kind: 'channel', name: cname, messages: msgs.length, status: h.status, truncated: !!h.truncated });
    clusters.push(...cluster({ kind: 'channel', name: cname, id: c.id }, msgs, { gapHours, minMessages }));

    const archived = await archivedThreads(token, c.id);
    threadCount += archived.length;
    for (const t of archived) {
      const tname = scrub(t.name);
      const th = await history(token, t.id, sinceMs);
      const msgs = th.messages.map((m) => ({ id: m.id, channelId: t.id, channelName: tname, ts: Date.parse(m.timestamp), authorId: m.author_id ?? m?.author?.id ?? '', content: m.content ?? '' }));
      messagesRead += msgs.length;
      perContainer.push({ kind: 'thread', name: tname, messages: msgs.length });
      clusters.push(...cluster({ kind: 'thread', name: tname, id: t.id }, msgs, { gapHours, minMessages }));
    }
  }

  const active = await dget(token, `/guilds/${guild}/threads/active`);
  for (const t of (active.json?.threads ?? [])) {
    threadCount += 1;
    const tname = scrub(t.name);
    const th = await history(token, t.id, sinceMs);
    const msgs = th.messages.map((m) => ({ id: m.id, channelId: t.id, channelName: tname, ts: Date.parse(m.timestamp), authorId: m.author_id ?? m?.author?.id ?? '', content: m.content ?? '' }));
    messagesRead += msgs.length;
    perContainer.push({ kind: 'active-thread', name: tname, messages: msgs.length });
    clusters.push(...cluster({ kind: 'thread', name: tname, id: t.id }, msgs, { gapHours, minMessages }));
  }

  // Longest first: if the operator caps the naming pass for cost, the cap should fall on the thin clusters.
  clusters.sort((a, b) => b.messages.length - a.messages.length);
  const named = clusters.slice(0, Number.isFinite(maxClusters) ? maxClusters : clusters.length);

  const candidates = [];
  let modelCalls = 0, modelErrors = 0, tokensIn = 0, tokensOut = 0, modelUsed = null, droppedNaming = 0, droppedAliases = 0;
  if (args.includes('--name') || args.includes('--write')) {
    const key = secret('CLAUDE_API_KEY');
    const model = secret('CLAUDE_MODEL') ?? 'claude-haiku-5-5';
    if (!key) { console.error('harvest-threads: --name/--write needs CLAUDE_API_KEY. Nothing written.'); return 1; }
    for (const c of named) {
      const text = anonymize(c.messages);
      if (!text.trim()) continue;
      modelCalls++;
      const r = await nameCluster(key, `${c.name ? `Discord thread titled: ${c.name}\n\n` : ''}${text}`, { model });
      if (r.error) { modelErrors++; console.log(`  naming failed (${r.error}) for a ${c.messages.length}-message cluster`); continue; }
      modelUsed = r.model;
      tokensIn += r.usage.input; tokensOut += r.usage.output;
      if (!r.topic) continue;
      // A name that carries a handle or a discriminator is naming a person, not a subject: the candidate is
      // dropped and counted, so the review sees that the model offered it rather than never having asked.
      const namedPeople = (s) => /(?:^|\s)@[\p{L}\p{N}_.]{2,}/u.test(s) || /[\p{L}\p{N}_ ]{2,}#\d{2,6}$/.test(s);
      if (namedPeople(r.topic)) { droppedNaming++; console.log(`  dropped a candidate that names a person (${c.messages.length} messages)`); continue; }
      // A thread's name is the members' own label for the subject, so it is usually the best alias available -
      // and it is also user-chosen text, which can carry a handle (the first run's file earned a finding here:
      // the model's aliases were clean, the thread name was not) or be half a message ("I've spent the last
      // week trying to", @measured 2026-11-20 by `node scripts/harvest-threads.mjs --review`). Both filters
      // apply to the model's own aliases as well; what is dropped is counted, never quietly removed.
      const rawAliases = [...(r.aliases ?? []), ...(c.name ? [c.name] : [])];
      const labels = rawAliases.filter((a) => !namedPeople(a) && !labelIsProse(a));
      droppedAliases += rawAliases.length - labels.length;
      const aliases = [...new Set(labels)];
      candidates.push({ topic: r.topic, aliases, status: 'candidate', evidence: evidenceOf(c.messages, c.container?.kind ?? 'channel') });
    }
  }

  const existing = readThreads(THREADS_FILE);
  // The candidates are cached in scratch so that a merge or contract defect can be re-run without paying for
  // the model a second time (the first run spent 39 calls before a contract finding stopped the write).
  const cachePath = `${root}.design/harvest-candidates-${new Date().toISOString().slice(0, 10)}.json`;
  if (candidates.length) writeFileSync(cachePath, `${JSON.stringify(candidates, null, 2)}\n`);
  const harvestedAt = new Date().toISOString();
  const { doc, stats } = mergeThreads(existing, candidates, { harvestedAt });
  doc._rule = THREADS_RULE;
  doc.schema = 1;
  doc.source = {
    kind: 'discord-api',
    guildId: guild,
    window: { from: sinceIso, to: harvestedAt.slice(0, 10) },
    harvestedAt,
    channelsRead: textish.length,
    messagesRead,
    reads: reads.slice(0, 200),
    _how: 'Authenticated GET with `Bot <token>` and the identifiable User-Agent Discord asks bots to send. Message text is read into memory to find a subject and is never written; authors are folded to speaker-N before anything reaches the model.',
  };
  if (modelUsed) doc.source.model = { id: modelUsed, calls: modelCalls, errors: modelErrors, inputTokens: tokensIn, outputTokens: tokensOut };
  if (rateWaitMs > 0) doc.source.rateWaitSeconds = Math.round(rateWaitMs / 1000);

  const { findings, notes } = threadFindings(doc);
  const summary = [
    `harvest-threads run ${harvestedAt} (Linux native, Node ${process.version})`,
    `window ${sinceIso} -> ${harvestedAt.slice(0, 10)}; channels read ${textish.length}; threads listed ${threadCount}; messages read ${messagesRead}`,
    `clusters ${clusters.length} (named ${named.length}); candidates ${candidates.length}; entries after merge ${doc.threads.length} (added ${stats.added}, merged ${stats.merged}, kept ${stats.kept})`,
    `model ${modelUsed ?? 'not run'}: calls ${modelCalls}, errors ${modelErrors}, tokens in ${tokensIn} out ${tokensOut}; dropped ${droppedNaming} candidate(s) naming a person and ${droppedAliases} alias(es) that named a person or were chat fragments rather than labels`,
    `requests ${reads.length}, slept for rate limits ${Math.round(rateWaitMs / 1000)}s, wall ${((Date.now() - started) / 1000).toFixed(1)}s`,
    `findings ${findings.length}, notes ${notes.length} (the review queue)`,
  ];
  const containers = perContainer.map((p) => `  ${p.kind} ${p.messages} message(s)${p.status && p.status !== 200 ? ` status ${p.status}` : ''}${p.truncated ? ' (page cap hit)' : ''}`);
  const log = [...summary, `containers ${perContainer.length}:`, ...containers].join('\n');
  const logPath = `${root}.design/harvest-threads-${harvestedAt.slice(0, 10)}.log`;
  writeFileSync(logPath, `${log}\n`);
  console.log(summary.join('\n'));
  console.log(`containers ${perContainer.length} listed in the log`);
  console.log(`log: ${logPath}`);
  console.log(`candidates cached: ${cachePath}`);

  if (findings.length) {
    console.log(`NOT WRITTEN - the archive fails its own contract (${findings.length} finding(s)):`);
    findings.slice(0, 10).forEach((f) => console.log(`  ${f.rule}: ${f.detail.replace(/[@#][\p{L}\p{N}_.]{2,}/gu, '@[masked]')}`));
    return 1;
  }

  if (args.includes('--write')) {
    writeFileSync(THREADS_FILE, `${JSON.stringify(doc, null, 2)}\n`);
    console.log(`wrote ${THREADS_FILE}: ${doc.threads.length} entries, ${notes.length} awaiting the operator's signature`);
  } else {
    console.log(`dry run: ${candidates.length} candidate(s) named, ${doc.threads.length} entry(ies) would exist after merge. Nothing written; no model call${(args.includes('--name') ? '' : 's')}.`);
  }
  return 0;
}

/** The operator's review surface: one block per entry, topic first, the other names it was filed under, and
 *  the evidence beside it - dates, which kind of container it came from, and the message ids that reopen it.
 *  No message text and no member name, because a reviewer approving a topic does not need to re-read the
 *  conversation, only satisfy themselves that one happened. */
function review(doc) {
  const signed = doc.threads.filter(isRatified).length;
  console.log(`data/discord-threads.json - ${(doc.threads ?? []).length} entr(ies), ${signed} signed, ${(doc.threads ?? []).length - signed} awaiting the operator`);
  console.log(`window ${doc.source?.window?.from} -> ${doc.source?.window?.to}; naming model ${doc.source?.model?.id ?? 'none'}\n`);
  for (const t of doc.threads) {
    const dates = [...new Set(t.evidence.map((e) => e.date))].sort();
    const kinds = [...new Set(t.evidence.map((e) => e.channelKind))];
    console.log(`  ${t.topic}`);
    console.log(`    filed under also: ${(t.aliases ?? []).join(' | ') || '(nothing else)'}   [${t.status}${t.approvedAt ? `, ${t.approvedBy} ${t.approvedAt}` : ', NOT SIGNED'}]`);
    const where = t.evidence.map((e) => e.channelName).filter(Boolean)[0];
    const whereLabel = where ? ` in "${where}"` : '';
    console.log(`    evidence: ${t.evidence.length} exchange(s), ${kinds.join('/')}${whereLabel} on ${dates.join(', ')}  (id ${t.id}, messages ${t.evidence.map((e) => e.messageIds[0]).join(' ')})`);
    // `--review --links` puts a jump URL on the terminal for the reviewer only. It never enters the data file and
    // never reaches a page: the point is that ratification can be *checked* against the conversation instead of
    // taken on trust, and Discord's own channel/message triple is the only address that reopens it.
    if (process.argv.includes('--links')) {
      for (const e of t.evidence) console.log(`      reopen: https://discord.com/channels/${doc.source?.guildId}/${e.channelId}/${e.messageIds[0]}`);
    }
  }
  console.log(`\nRatify: set "status": "approved", "approvedBy": "operator", "approvedAt": "<YYYY-MM-DD>" on the lines you\napprove (a rejection is status "declined"), then run npm run check:thread-topics. Only approved\nentries with evidence reach the page; the page prints a topic and its id and nothing else.`);
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => { console.error('harvest-threads failed:', err.message); process.exit(1); });
