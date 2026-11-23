/**
 * threads.mjs - the contract behind the `/chat` archive of what the club has actually pulled on.
 *
 * Why this exists (MS41, S088, D461, 2026-11-20). `src/content.json`'s `threads` list is nine invented items
 * under a heading that claims to say what the club is pulling on. The operator asked for the real thing: two
 * years of the guild's channels read offline, deduplicated into a committed file, and rendered undated. That
 * makes the page's central claim **member-derived**, so the only honest shape is: a machine gathers evidence,
 * a model proposes names, a human signs them, and a gate fails anything that skips a step. This module is
 * where the shape lives, so the harvester, the gate and the component cannot each paraphrase it (D264,
 * "one home per rule").
 *
 * Three things this file is responsible for:
 *
 *   1. **Identity across runs.** `mergeThreads` is the dedup rule, and it is deterministic - no model runs in
 *      it. Two candidates are the same thread if they share a message id, if their names fold to the same
 *      key, or if one's name is the other's alias. Existing entries win on identity and on the published
 *      **name**, because the name in the file is the operator's word (D461) and a re-harvest must not
 *      overrule it. A merge keeps the existing `id`, so ratification survives a rename and a rename does not
 *      churn the file's keys.
 *   2. **Idempotence.** Merging the file into itself changes nothing except `source.harvestedAt`. If it did,
 *      every harvest run would produce a diff nobody can read, and "what changed since the last review" - the
 *      only question the ratification pass can answer - would be unanswerable.
 *   3. **Privacy by construction.** Evidence is channel ids, message ids and dates: Discord snowflakes. They
 *      stay in this file, and the component reads the page through `publishedThreads`, which hands out
 *      `{ id, topic }` and nothing else. A component cannot print a message id it was never given, and
 *      `check:thread-topics` greps the built bytes to prove the claim rather than trusting the import
 *      (D457's posture: the citation is checked, not trusted).
 *
 * What this deliberately is NOT:
 *   - not a network reader. The harvest is `scripts/harvest-threads.mjs`, run by hand on the operator's rig;
 *      the file it writes is committed, so the build never reaches the network (D73's topology, the one
 *      `data/events.json` still follows — since **MS42** that file arrives as a handoff commit from
 *      `social-event-publisher` rather than a fetch from here, and the two platform snapshots that used to be
 *      listed beside it are deleted).
 *   - not a place where message text or a member's name may be written. Evidence is *pointers* - a channel,
 *      a message id, a date - never what the message said. `threadFindings` rejects an evidence object with
 *      any key outside its whitelist, so a future harvester that "just stores the snippet to make review
 *      easier" fails the gate instead of shipping a member's words to a public page.
 *   - not the ratifier. `publishedThreads` prints only entries a human signed; an unsigned candidate is a
 *      review queue, not content.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
// The publishing rule lives in threads-view.mjs so a rendered page can import it without this module's
// `node:fs` and its `import.meta.url` path arithmetic (D465). Re-exported here so the gate and the harvester
// keep one import surface, and so `isRatified` has exactly one definition in the tree (D264).
import { hasEvidence, isRatified, publishedThreads } from './threads-view.mjs';
export { isRatified, publishedThreads };

const root = fileURLToPath(new URL('../..', import.meta.url)); // src/lib -> repo root

/** Where the committed archive lives. Tracked on purpose: it is a ratified artifact, not a cache. */
export const THREADS_FILE = `${root}data/discord-threads.json`;
/** Bumped only when the shape changes in a way an old file cannot satisfy. Never renumbered. */
export const THREADS_SCHEMA = 1;

/** Keys an evidence object may carry. Anything else - `text`, `content`, `author` - is the defect this file
 *  exists to refuse: a pointer, not a quotation (D461).
 *
 *  `channelKind` is `thread` or `channel`, and it is decision-relevant at ratification: a thread's name is the
 *  members' own label for the subject (strong evidence the subject is real), while a main-channel cluster's
 *  boundary is the harvester's silence cut (weaker). A reviewer should see which one they are approving. */
export const EVIDENCE_KEYS = ['channelId', 'channelName', 'channelKind', 'date', 'messageIds'];
/** Keys a thread entry may carry. */
export const THREAD_KEYS = ['id', 'topic', 'aliases', 'status', 'approvedBy', 'approvedAt', 'evidence', '_note'];
/** Keys the source block may carry. */
export const SOURCE_KEYS = ['kind', 'guildId', 'guildName', 'window', 'harvestedAt', 'channelsRead', 'messagesRead', 'model', 'reads', '_how'];

// -------------------------------------------------------------------------------- names

const ARTICLE = /^(the|a|an) /;

/** Lowercase, punctuation dropped, whitespace collapsed, leading article dropped. Display text is never
 *  mutated - this is a matching fold, not a rewrite. */
export function normalizeTopic(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(ARTICLE, '');
}

/** Light stemming, deliberately conservative. `ies -> y` and a trailing `s` when the word does not already
 *  end in a double letter, so "Galois groups" and "Galois group" fold together while "analysis" and
 *  "analyses" do not - a miss there costs one extra review line, where a false merge costs a thread a name
 *  the operator already signed. */
function stem(word) {
  if (word.length < 4) return word;
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (/[^aeious]s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

/** The key two candidates collapse on: folded tokens, sorted, so word order is not identity
 *  ("topology, algebraic" and "algebraic topology" are one thread). */
export function foldKey(s) {
  return normalizeTopic(s).split(' ').filter(Boolean).map(stem).sort().join(' ');
}

/** A stable, publish-safe key. Content-derived from the oldest evidence message id, so it survives a rename
 *  and does not survive a different evidence set - and it is a hash prefix, not a snowflake, so a thread id
 *  that ever reaches the page cannot be mistaken for a message id. */
export function threadId(evidence) {
  const oldest = oldestMessageId(evidence) ?? 'unknown';
  return `thr-${createHash('sha1').update(String(oldest)).digest('hex').slice(0, 12)}`;
}

/** The smallest message id in the entry. Discord snowflakes are monotonic per channel, so the minimum across
 *  the entry's evidence is the first message of the earliest surviving cluster. */
function oldestMessageId(evidence) {
  const ids = (evidence ?? []).flatMap((e) => (e?.messageIds ?? []).map(String));
  if (!ids.length) return null;
  return ids.sort((a, b) => (a.length - b.length) || (a < b ? -1 : 1))[0];
}

// ---------------------------------------------------------------------------- evidence

const byId = (a, b) => {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
};

function evidenceKey(e) {
  return `${e?.channelId ?? '?'}|${e?.date ?? '?'}`;
}

/** Union of two evidence lists, one object per (channel, date), message ids deduped and ordered. Ordering is
 *  deterministic so a re-run produces no diff (the idempotence requirement in the MS41 exit gate). */
export function mergeEvidence(a, b) {
  const out = new Map();
  for (const e of [...(a ?? []), ...(b ?? [])]) {
    const k = evidenceKey(e);
    const prev = out.get(k) ?? { channelId: e.channelId ?? null, channelKind: e.channelKind ?? null, channelName: e.channelName ?? null, date: e.date ?? null, messageIds: [] };
    if (!prev.channelKind && e.channelKind) prev.channelKind = e.channelKind;
    if (!prev.channelName && e.channelName) prev.channelName = e.channelName;
    prev.messageIds = [...new Set([...prev.messageIds, ...(e?.messageIds ?? [])].map(String))].sort(byId);
    out.set(k, prev);
  }
  return [...out.values()].sort((x, y) => String(x.date).localeCompare(String(y.date)) || String(x.channelId).localeCompare(String(y.channelId)));
}

// `hasEvidence` and `isRatified` are in src/lib/threads-view.mjs, and re-exported above: the page that renders
// the archive and the gate that checks the file must agree on one definition, and the page must not import
// `node:fs` to get it (D465).

// -------------------------------------------------------------------------------- merge

/** Is `c` the same thread as `e`? Shared message ids first (the strongest signal - the same messages cannot
 *  be two topics), then the folded name, then a name appearing among the other's aliases. */
function sameThread(a, b) {
  const aIds = new Set((a.evidence ?? []).flatMap((e) => (e.messageIds ?? []).map(String)));
  for (const e of b.evidence ?? []) for (const id of e.messageIds ?? []) if (aIds.has(String(id))) return 'messages';
  const bk = new Set([foldKey(b.topic), ...(b.aliases ?? []).map(foldKey)]);
  for (const k of [foldKey(a.topic), ...(a.aliases ?? []).map(foldKey)]) if (bk.has(k)) return 'name';
  return null;
}

/**
 * The dedup rule. `existing` is the committed document (or null, or a document with no threads);
 * `candidates` is what this harvest proposes. Returns `{ doc, stats }`.
 *
 * Existing entries are never dropped by a merge: a harvest window can move and ratification must not vanish
 * because a bot did not re-read a channel. Dropping a topic is an edit a human makes.
 *
 * `harvestedAt` is the only field the merge writes, and it writes it into `source`, so
 * `merge(merge(f, c), [])` deep-equals `f`.
 */
export function mergeThreads(existing, candidates, { harvestedAt = null } = {}) {
  const doc = existing && typeof existing === 'object'
    ? structuredClone(existing) // a deep copy, so the caller's document is never mutated by a merge
    : { _rule: THREADS_RULE, schema: THREADS_SCHEMA, source: {}, threads: [] };
  if (!doc.threads) doc.threads = [];
  if (!doc.source) doc.source = {};
  if (harvestedAt) doc.source.harvestedAt = harvestedAt;

  const stats = { added: 0, merged: 0, kept: doc.threads.length };
  // Candidates are processed in a deterministic order - earliest evidence date, then name - so two runs of
  // the same harvest produce byte-identical output rather than a coin flip on which name wins.
  const queue = [...(candidates ?? [])].sort((a, b) =>
    String(earliestDate(a)).localeCompare(String(earliestDate(b))) || String(a?.topic ?? '').localeCompare(String(b?.topic ?? '')));

  for (const cand of queue) {
    const hit = doc.threads.find((t) => sameThread(t, cand));
    if (!hit) {
      const entry = {
        id: cand.id || threadId(cand.evidence),
        topic: String(cand.topic ?? '').trim(),
        aliases: [...new Set((cand.aliases ?? []).map((a) => String(a).trim()))]
          .filter((a) => a && foldKey(a) !== foldKey(cand.topic)).sort(),
        status: cand.status ?? 'candidate',
        evidence: mergeEvidence([], cand.evidence),
      };
      if (cand.approvedBy) entry.approvedBy = cand.approvedBy;
      if (cand.approvedAt) entry.approvedAt = cand.approvedAt;
      doc.threads.push(entry);
      stats.added++;
      continue;
    }
    // The existing name wins: it is the one a human read and signed. The candidate's name becomes an alias,
    // which is both the audit trail for the rename and the key that keeps the next run from re-splitting it.
    const cName = String(cand.topic ?? '').trim();
    if (cName && foldKey(cName) !== foldKey(hit.topic)) {
      hit.aliases = [...new Set([...(hit.aliases ?? []), cName, ...(cand.aliases ?? [])].map((a) => String(a).trim()))]
        .filter((a) => a && foldKey(a) !== foldKey(hit.topic)).sort();
    }
    hit.evidence = mergeEvidence(hit.evidence, cand.evidence);
    stats.merged++;
  }

  doc.threads.sort((a, b) => String(a.topic).localeCompare(String(b.topic)));
  return { doc, stats };
}

function earliestDate(t) {
  const dates = (t?.evidence ?? []).map((e) => e?.date).filter(Boolean).sort();
  return dates[0] ?? '9999';
}

// ---------------------------------------------------------------------------- the reader

// `publishedThreads()` - the only view a page may take - lives in src/lib/threads-view.mjs and is re-exported
// above. It is out of this module precisely so that `src/components/ThreadArchive.astro` can reach the rule
// without reaching `node:fs` or a path built off `import.meta.url`, which the prerender bundle cannot evaluate
// (D465).

/** Read the committed file. Returns `null` when it does not exist yet, so a caller can distinguish "no
 *  archive" from "an empty archive" - the first is a harvester not run, the second is a harvest that found
 *  nothing, and the honest page for those is different. */
export function readThreads(file = THREADS_FILE) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    return { _unreadable: e.message };
  }
}

// ---------------------------------------------------------------------------- the verdict

const SNOWFLAKE = /\b\d{15,20}\b/;
const LONG_DIGITS = /\b\d{8,}\b/;
const HANDLE = /(?:^|\s)@[\p{L}\p{N}_]{2,}/u;
const DISCRIM = /[\p{L}\p{N}_ ]{2,}#\d{2,6}\b/;
const URLISH = /(https?:\/\/|discord\.(com|app)|discord\.gg)/i;

/**
 * Pure verdict over a document (the selftest plants defects without touching the file on disk, which is the
 * house shape for gates - add-a-gate). Returns `{ findings, notes }`: `findings` fail the build; `notes` are
 * the review queue. An unsigned candidate is a note, not a failure - the harvest lands candidates, and the
 * rule that protects a visitor is that an unsigned topic never reaches a page (`publishedThreads` filters,
 * and `check:thread-topics` greps `dist/` for what got through anyway).
 */
export function threadFindings(doc) {
  const findings = [];
  const notes = [];
  if (!doc || typeof doc !== 'object') return { findings: [{ rule: 'no-document', detail: 'the threads document is missing or is not an object - run node scripts/harvest-threads.mjs --write' }], notes };
  if (doc._unreadable) return { findings: [{ rule: 'unreadable', detail: `data/discord-threads.json is not readable JSON: ${doc._unreadable}` }], notes };
  if (doc.schema !== THREADS_SCHEMA) findings.push({ rule: 'schema-version', detail: `schema is ${doc.schema ?? 'absent'}, this build reads ${THREADS_SCHEMA} - re-run the harvester or update THREADS_SCHEMA deliberately` });

  const threads = doc.threads;
  if (!Array.isArray(threads)) return { findings: [{ rule: 'no-threads', detail: 'the document has no `threads` array - the harvest wrote the wrong shape' }], notes };
  if (!threads.length) notes.push('the archive has no threads yet, so /chat renders its empty state');

  const seen = new Map();
  for (const t of threads) {
    const label = String(t?.topic ?? t?.id ?? '(unnamed)');
    for (const k of Object.keys(t ?? {})) {
      if (!THREAD_KEYS.includes(k)) findings.push({ rule: 'unknown-thread-key', detail: `${label}: key "${k}" is not in the contract - the harvester is writing something nobody reviewed` });
    }
    if (!t?.id) findings.push({ rule: 'missing-id', detail: `"${label}" has no id - it cannot be cited, ratified or re-merged without one (node scripts/harvest-threads.mjs derives it from the oldest evidence)` });
    if (!String(t?.topic ?? '').trim()) findings.push({ rule: 'topic-missing', detail: `entry ${t?.id ?? '(no id)'} has no topic - an entry with no name cannot be reviewed, only deleted` });

    const key = foldKey(t?.topic ?? '');
    if (seen.has(key)) findings.push({ rule: 'duplicate-topic', detail: `"${label}" and "${seen.get(key)}" fold to the same thread - the dedup rule missed one pair, so the page will say one thing twice` });
    else seen.set(key, label);

    // Publish-safe public fields: a thread id or name that carries a snowflake, a handle, a URL or a bare
    // long number has evidence or a person leaking into the part that gets printed.
    const publicFields = [['id', t?.id], ['topic', t?.topic], ...(t?.aliases ?? []).map((a, i) => [`aliases[${i}]`, a])];
    for (const [where, raw] of publicFields) {
      const val = String(raw ?? '');
      if (!val) continue;
      if (SNOWFLAKE.test(val)) findings.push({ rule: 'public-field-carries-a-snowflake', detail: `${label}.${where} contains a Discord id - public fields are names, not pointers` });
      else if (LONG_DIGITS.test(val)) findings.push({ rule: 'public-field-carries-a-number', detail: `${label}.${where} contains "${val}" - a bare number in a printed field is usually an id that followed a name in` });
      if (HANDLE.test(val) || DISCRIM.test(val)) findings.push({ rule: 'public-field-carries-a-handle', detail: `${label}.${where} looks like a member's name - topics are about math, not about people (S088, D461)` });
      if (URLISH.test(val)) findings.push({ rule: 'public-field-carries-a-link', detail: `${label}.${where} contains a link - the archive names topics; links come from src/config.json` });
    }

    const ev = t?.evidence;
    if (!Array.isArray(ev) || !ev.length) {
      findings.push({ rule: 'no-evidence', detail: `"${label}" has no evidence - an entry nobody can trace to a channel and a message does not get published (D461)` });
    } else {
      for (const [i, e] of ev.entries()) {
        for (const k of Object.keys(e ?? {})) {
          if (!EVIDENCE_KEYS.includes(k)) findings.push({ rule: 'evidence-carries-prose', detail: `${label}.evidence[${i}] has key "${k}" - evidence is a pointer (channelId, channelName, date, messageIds), never a quotation or an author (D461)` });
        }
        if (!e?.channelId) findings.push({ rule: 'evidence-no-channel', detail: `${label}.evidence[${i}] names no channel - "someone said this somewhere" is not evidence` });
        // A channel or thread name is user-chosen text, and a thread can be named "@someone's question". The
        // name is never printed, so the harvester scrubs it rather than dropping it - but a handle is still a
        // member, and the first harvest run earned this finding by copying raw thread names into evidence
        // (@measured 2026-11-20: the harvester refused to write its own file, 4 strings swept by the rule below).
        if (HANDLE.test(String(e?.channelName ?? '')) || DISCRIM.test(String(e?.channelName ?? ''))) findings.push({ rule: 'evidence-carries-a-handle', detail: `${label}.evidence[${i}].channelName looks like it names a member - scrub the name or keep the id (the id is enough to reopen the channel)` });
        if (!(e?.messageIds ?? []).length) findings.push({ rule: 'evidence-no-messages', detail: `${label}.evidence[${i}] names no message ids - the review pass reads messages, so it needs ids` });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e?.date ?? ''))) findings.push({ rule: 'evidence-no-date', detail: `${label}.evidence[${i}] has date "${e?.date ?? ''}" - evidence without a date cannot be checked for staleness (the dates stay in the file and never reach the page)` });
      }
    }

    const approved = t?.status === 'approved';
    if (approved && (!t.approvedBy || !t.approvedAt)) findings.push({ rule: 'approved-without-signature', detail: `"${label}" says approved but carries no approvedBy/approvedAt - a status is not a signature (D461)` });
    if (!approved) notes.push(`${label}: not ratified (${hasEvidence(t) ? 'evidence present' : 'no evidence'}, status "${t?.status ?? 'candidate'}") - it will not render until the operator signs it`);
  }

  for (const k of Object.keys(doc.source ?? {})) {
    if (!SOURCE_KEYS.includes(k)) findings.push({ rule: 'unknown-source-key', detail: `source.${k} is not in the contract - a harvest that records new fields is recording something nobody scoped` });
  }

  // The whole-file sweep for the two things that must never be in the file at all.
  const body = JSON.stringify({ threads: doc.threads, source: doc.source });
  if (/MTQ[0-9A-Za-z]{20,}\.[A-Za-z0-9_-]{20,}|bot-token|[A-Za-z0-9_-]{24}\.q?[A-Za-z0-9_-]{6}/.test(body)) findings.push({ rule: 'token-shaped-string', detail: 'the document contains something shaped like a bot token - the token is never written to a committed file (D459 is the same rule for docs/)' });
  const handles = [...body.matchAll(/"[^"]*@[A-Za-z0-9_.]{2,}[^"]*"/g)].map((m) => m[0]);
  if (handles.length) findings.push({ rule: 'username-in-file', detail: `${handles.length} string(s) in the file contain an @handle - the harvester stores pointers, not members (S088)` });

  return { findings, notes };
}

/** The `_rule` text the harvester writes into the committed file, kept here so the file's own explanation
 *  cannot drift from the module that reads it. */
export const THREADS_RULE = "A dated snapshot of what the club's members have actually discussed, harvested by `node scripts/harvest-threads.mjs` and committed so the build never reaches the network (D73's topology, the one data/events.json still follows - since MS42 2026-11-23 that file arrives as a handoff commit from social-event-publisher rather than a fetch from this repo). Evidence is pointers - a channel id, message ids, a date - and never a quotation or a member's name: check:thread-topics fails an evidence object with any other key, and fails any id, date or handle that reaches a built byte. A topic is published only when a human signed it (approvedBy/approvedAt): publishedThreads() prints signed topics alone, and the dates stay in this file as evidence, off the page, because the section says what the club pulls on now, not what it did (S088, D461).";
