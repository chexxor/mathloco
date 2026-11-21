#!/usr/bin/env node
// check:thread-topics - the /chat archive only says what a human signed, and nothing private reaches a page.
//
//   node scripts/check-thread-topics.mjs                      verdict on data/discord-threads.json
//   node scripts/check-thread-topics.mjs --file <path>        the same verdict on another document
//   node scripts/check-thread-topics.mjs --dist <dir>       the built half: no id, date, channel name, alias or
//                                                           mention in a built byte; the ratified set whole on the page
//   node scripts/check-thread-topics.mjs --selftest           plant each defect, require each to be NAMED
//
// Why this gate exists (MS41, S088, D461, 2026-11-20). The operator asked for an archive of what the club has
// actually discussed, harvested from two years of Discord, "and you review the file before it ships". A review
// with no detector is a wish: the same session that wrote the file would also ship it. So the two facts that
// make the page honest - every topic traces to messages, and every topic was signed - are fields, and fields
// are checkable. The third fact is privacy: evidence is Discord snowflakes, and a member's message ids, a
// member's handle, or the text of a message must not reach a public page even by accident.
//
// What FAILS (each planted in --selftest):
//   FAIL no-document                    data/discord-threads.json does not exist - the harvest has not run
//   FAIL schema-version                 the file was written by a different contract than this build reads
//   FAIL no-evidence                    a topic nobody can trace to a channel and messages
//   FAIL evidence-no-channel / -messages / -date   a pointer that is not actually a pointer
//   FAIL evidence-carries-prose         evidence holding text/author/anything off the whitelist (D461)
//   FAIL unknown-thread-key             a field on an entry that no reviewer ever agreed to
//   FAIL duplicate-topic                two entries that fold to one thread: the dedup rule missed a pair
//   FAIL approved-without-signature     status says approved, no approvedBy/approvedAt
//   FAIL public-field-carries-a-*       a snowflake, a handle, a link or a bare number in a printed field
//   FAIL username-in-file               an @handle anywhere in the document - the file stores pointers
//   FAIL token-shaped-string            a bot token in a committed file (the D459 rule, applied here)
//
// And on the built half (`--dist`, run after `build`):
//   FAIL built-carries-an-id              a channel or message id in any built text byte
//   FAIL built-carries-a-private-string   an evidence date, channel name, alias or note on the archive's own page
//   FAIL built-carries-a-handle           a mention-shaped @name in what a visitor reads, on any built page
//   FAIL built-topic-missing              a signed topic that the archive page does not paint
//   FAIL built-list-count-wrong           rows painted under #threads that do not equal the ratified count
//
// What is deliberately NOT a failure: an unsigned candidate. The harvest lands candidates, and `verify` cannot
// go red while the operator's review pass is pending. The protection is that a candidate cannot render -
// `publishedThreads()` in src/lib/threads.mjs prints signed topics only - and the dist half of this gate
// (added with the component, MS41) greps built bytes for the ids and names that must never appear there.
//
// The verdict is `threadFindings()` in src/lib/threads.mjs, shared with the harvester's own `--check` mode
// (D264): two paraphrases of one rule is how a file passes the tool that wrote it and fails the gate.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { THREADS_FILE, THREADS_SCHEMA, readThreads, threadFindings, mergeThreads, publishedThreads, isRatified } from '../src/lib/threads.mjs';

const args = process.argv.slice(2);
const argOne = (flag, dflt) => { const i = args.indexOf(flag); return i < 0 ? dflt : args[i + 1]; };

// ------------------------------------------------------------------------------ fixture
// A small, obviously-fictional document the plantings mutate. The ids are real-shaped snowflakes so the
// privacy patterns have something to bite on; they are not the club's.
const FIXTURE = () => ({
  _rule: 'fixture',
  schema: THREADS_SCHEMA,
  source: {
    kind: 'discord-api',
    guildId: '1170385683379126343',
    window: { from: '2024-11-20', to: '2026-11-20' },
    harvestedAt: '2026-11-20T00:00:00.000Z',
    channelsRead: 4,
    messagesRead: 18,
  },
  threads: [
    {
      id: 'thr-9f3c1a2b7d40',
      topic: 'Nonstandard analysis',
      aliases: ['infinitesimals'],
      status: 'approved',
      approvedBy: 'operator',
      approvedAt: '2026-11-20',
      evidence: [{ channelId: '1170391234567890123', channelName: 'math-chat', date: '2025-04-11', messageIds: ['1356789012345678901', '1356789012345678902'] }],
    },
    {
      id: 'thr-41ab0c9d2e77',
      topic: 'Prime ideals',
      aliases: [],
      status: 'approved',
      approvedBy: 'operator',
      approvedAt: '2026-11-20',
      evidence: [{ channelId: '1170391234567890123', channelName: 'math-chat', date: '2026-02-03', messageIds: ['1489012345678901234'] }],
    },
  ],
});

/** The near-duplicate a model reliably produces for one thread: another name, another capitalisation, an
 *  article, a shared message. This is the planting the MS41 exit gate names. */
const NEAR_DUPES = () => [
  { topic: 'Non-standard Analysis', aliases: ['infinitesimals', 'hyperreals'], evidence: [{ channelId: '1170391234567890123', channelName: 'math-chat', date: '2025-04-11', messageIds: ['1356789012345678902', '1356789012345678903'] }] },
  { topic: 'the prime ideal story', aliases: ['Prime Ideals'], evidence: [{ channelId: '1170399999999999999', channelName: 'online', date: '2026-02-03', messageIds: ['1489012345678901234'] }] },
  { topic: 'Categorical dualities', aliases: [], evidence: [{ channelId: '1170391234567890123', channelName: 'math-chat', date: '2026-05-19', messageIds: ['1501234567890123456'] }] },
];

// ------------------------------------------------------------------------------ the built half
//
// The file-side verdict says an entry may not *store* a member's words or name. This half says what the build
// must not *print*. `publishedThreads()` is the primary defence (a component cannot render a field it was not
// handed, D461); this is the backstop for the component that hands itself something else - a date pulled out of
// `evidence`, an alias printed because it read better, a message id pasted into a `data-` attribute "for
// debugging". It runs after `build`, on the artifact, because a source-only check cannot see what the
// prerenderer emitted (**D118**: a check that reads no artifact cannot catch what the artifact does).
//
// THREE SCAN SCOPES, and the measurements that chose them (@measured 2026-11-21 against `dist/client` of this
// tree, Linux native, Node 24.22.1):
//
//   - **every built text byte, raw** — the ids. A channel id or message id is unique to this archive, so it can
//     be hunted everywhere: 0 of 436 evidence ids in 30 built files today. Global scope, zero false positives.
//   - **the pages that render the archive** (a built HTML page carrying `id="threads"`) — every other private
//     string, after the ratified topics are subtracted from the page. Scoped to that surface because a global
//     date rule is not usable here: the evidence date `2026-11-11` is also a real club date, so a global rule
//     fails `/dates` for a coincidence (that is the measurement, not a hypothesis). On the archive's own page a
//     private string has no innocent source, which is what makes the rule strict rather than noisy. Subtracting
//     the topics first is what keeps a channel name that is a substring of its own ratified topic — `Frobenius
//     theorem` inside `Frobenius theorem on division algebras` — from reading as a leak.
//   - **the visible text of every built HTML page** — a mention-shaped `@handle`. Raw bytes cannot be the
//     scope: an author's note in a built comment reads `@measured 2026-11-13 by npm run build` (5 such strings
//     on `/chat` alone), and a minified island bundle carries `@__PURE__`; both are shapes, not people. The
//     visible-text scan reports 0 mention-shaped tokens across the built pages today, so a non-zero count is a
//     finding rather than a tuning problem.

/** The surface the archive paints. `id="threads"` is also the anchor `scripts/check-threads.mjs` holds the home
 *  page's "the rest of the list →" promise to, so one handle serves the coupling and the privacy scan. */
const ARCHIVE_SURFACE = 'id="threads"';
const ARCHIVE_SECTION = /<section\b[^>]*id="threads"[\s\S]*?<\/section>/;

/** A mention, and only a mention: `@` plus 2-32 word characters, bounded on both sides. `@font-face`, `@media`,
 *  `@layer` and `;@layer` are CSS at-rules; `@__PURE__` is a bundler annotation; a Discord name is letters,
 *  digits and `_`. Measured: 0 matches in built visible text, 1 in built CSS under this shape (`;@layer`). */
const MENTION = /(?:^|[\s(,;:'"\[\]])@[\p{L}\p{N}_]{2,32}(?=$|[\s.,;:!?')"\[\]])/gu;

/** Strip what a visitor does not read, the way `check:content` and `check:dated-surfaces` do: comments (this
 *  repo's source notes ride into the artifact), scripts, styles, and tags. Then decode the entities a topic
 *  turns into (`Arrow's theorem` is emitted as `Arrow&#39;s theorem`), or the positive rule misses its own page. */
export const builtVisible = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

/** Every string the archive knows that is not a ratified topic. `what` names the kind so a finding can say what
 *  leaked, and `id` marks the ones with the global (raw-byte) scope. */
export function privateStrings(doc) {
  const out = [];
  const add = (needle, what, id = false) => {
    if (typeof needle === 'string' && needle.length > 0) out.push({ needle, what, id });
  };
  add(doc?.source?.guildId, 'source.guildId', true);
  for (const t of doc?.threads ?? []) {
    for (const e of t.evidence ?? []) {
      add(e.channelId, 'evidence.channelId', true);
      add(e.date, 'evidence.date');
      add(e.channelName, 'evidence.channelName');
      for (const m of e.messageIds ?? []) add(m, 'evidence.messageIds[]', true);
    }
    for (const a of t.aliases ?? []) add(a, 'aliases[]');
    add(t._note, '_note');
  }
  return out;
}

/**
 * The built half, pure over `[{ file, text }]` so the selftest plants defects without a build (the house shape,
 * `add-a-gate`). `pages` is every text file under `dist/client`; binary files are skipped by the caller.
 */
export function builtFindings({ doc, pages }) {
  const findings = [];
  const push = (rule, file, detail) => findings.push({ rule, file, detail });
  const pub = publishedThreads(doc);
  const topics = pub.map((t) => t.topic);
  const priv = privateStrings(doc);
  const surfaces = pages.filter((p) => p.text.includes(ARCHIVE_SURFACE));

  // 1. ids: unique to this archive, so hunted through every built byte that is text.
  for (const { file, text } of pages) {
    for (const p of priv.filter((x) => x.id)) {
      if (text.includes(p.needle))
        push('built-carries-an-id', file, `${p.what} "${p.needle}" is in a built byte. Evidence is a pointer, and it stays in data/discord-threads.json (D461).`);
    }
  }

  // 2. on the archive's own surface: nothing the file knows except the ratified topics.
  for (const { file, text } of surfaces) {
    const residual = topics.reduce((s, t) => s.split(t).join(' '), text);
    for (const p of priv) {
      if (residual.includes(p.needle))
        push('built-carries-a-private-string', file, `${p.what} "${p.needle}" is on the page the archive renders. A topic is what publishes; the date it came from, the channel it came from and the names it was also called are not (S088).`);
    }
  }

  // 3. a mention in visible text, on any built page.
  for (const { file, text } of pages) {
    if (!file.endsWith('.html')) continue;
    const visible = builtVisible(text);
    for (const m of visible.matchAll(MENTION)) {
      push('built-carries-a-handle', file, `"${m[0].trim()}" is in what a visitor reads. This site names the club, never a member (D461).`);
    }
  }

  // 4. the positive half: the surface must carry the ratified set, whole. A gate that only forbids things lets a
  //    component quietly print nine of thirty-one.
  for (const { file, text } of surfaces) {
    const visible = builtVisible(text);
    for (const t of topics) {
      if (!visible.includes(t)) push('built-topic-missing', file, `"${t}" is signed and publishable but is not on ${file}. The page lists the archive, not a sample of it.`);
    }
    const section = ARCHIVE_SECTION.exec(text);
    const painted = section ? [...section[0].matchAll(/<li\b/g)].length : 0;
    if (painted !== pub.length)
      push('built-list-count-wrong', file, `${painted} row(s) painted under ${ARCHIVE_SURFACE} against ${pub.length} ratified topic(s). A sliced archive is a second, quieter cap (D320's one-home rule).`);
  }

  return { findings, surfaces: surfaces.length, publishable: pub.length, privateStrings: priv.length };
}

if (args.includes('--selftest')) {
  const cases = [];
  const run = (name, fn) => cases.push({ name, check: fn });

  // 1. the dedup rule, proven rather than asserted: three candidates, two of them the same thread as an
  //    existing entry, one genuinely new.
  run('near-duplicates collapse, alias kept', () => {
    const { doc, stats } = mergeThreads(FIXTURE(), NEAR_DUPES(), { harvestedAt: '2026-11-21T00:00:00.000Z' });
    const problems = [];
    if (doc.threads.length !== 3) problems.push(`expected 3 threads, got ${doc.threads.length}`);
    if (stats.merged !== 2 || stats.added !== 1) problems.push(`stats merged=${stats.merged} added=${stats.added}, wanted merged=2 added=1`);
    const nsa = doc.threads.find((t) => t.topic === 'Nonstandard analysis');
    if (!nsa) problems.push('the signed name was not kept - the harvest overruled the operator');
    else {
      if (!nsa.aliases.includes('infinitesimals')) problems.push('the existing alias was dropped');
      if (!nsa.aliases.includes('Non-standard Analysis')) problems.push('the candidate name was not kept as an alias');
      if (!nsa.aliases.includes('hyperreals')) problems.push('the candidate alias was dropped');
      if (!nsa.id.startsWith('thr-9f3c')) problems.push(`the id churned (${nsa.id}) - ratification would be lost on re-merge`);
      const ids = nsa.evidence[0].messageIds;
      if (ids.length !== 3) problems.push(`evidence not unioned: ${ids.join(',')}`);
    }
    const prime = doc.threads.find((t) => t.topic === 'Prime ideals');
    if (!prime) problems.push('the article/case fold missed "the prime ideal story"');
    else if (!prime.aliases.includes('the prime ideal story')) problems.push('the folded-in name was not kept as an alias');
    return problems;
  });

  // 2. idempotence: the exit gate's phrase is "changes nothing but harvestedAt".
  run('merge is idempotent except harvestedAt', () => {
    const once = mergeThreads(FIXTURE(), NEAR_DUPES(), { harvestedAt: '2026-11-21T00:00:00.000Z' }).doc;
    const twice = mergeThreads(once, once.threads, { harvestedAt: '2026-11-22T00:00:00.000Z' }).doc;
    const strip = (d) => JSON.stringify({ ...d, source: { ...d.source, harvestedAt: null } });
    const problems = [];
    if (strip(once) !== strip(twice)) {
      problems.push(`a second merge over its own output changed the document (${once.threads.length} -> ${twice.threads.length} threads)`);
      problems.push(`first:  ${strip(once).slice(0, 160)}`);
      problems.push(`second: ${strip(twice).slice(0, 160)}`);
    }
    if (once.source.harvestedAt === twice.source.harvestedAt) problems.push('harvestedAt did not move - the merge is not recording the run');
    return problems;
  });

  // 3. privacy by construction: the reader the component uses hands out names and nothing else.
  run('publishedThreads leaks no private field', () => {
    const pub = publishedThreads(FIXTURE());
    const problems = [];
    if (pub.length !== 2) problems.push(`expected 2 signed topics, got ${pub.length}`);
    for (const t of pub) {
      if (Object.keys(t).sort().join(',') !== 'id,topic') problems.push(`a published entry carries ${Object.keys(t).sort().join(',')} - only id and topic may reach a page`);
    }
    const blob = JSON.stringify(pub);
    for (const leak of ['1170391234567890123', '1356789012345678901', '2025-04-11', 'math-chat', 'infinitesimals']) {
      if (blob.includes(leak)) problems.push(`the published view contains "${leak}"`);
    }
    // An unsigned candidate must not be printable, however complete its evidence is.
    const pending = FIXTURE();
    delete pending.threads[1].approvedBy;
    pending.threads[1].status = 'candidate';
    if (publishedThreads(pending).some((t) => t.topic === 'Prime ideals')) problems.push('an unsigned topic is publishable');
    // A signed topic with no evidence is not publishable either: ratification needs something behind it.
    const bare = FIXTURE();
    bare.threads[0].evidence = [];
    if (publishedThreads(bare).some((t) => t.topic === 'Nonstandard analysis')) problems.push('a topic with no evidence is publishable');
    if (isRatified({ status: 'approved', approvedBy: 'x', approvedAt: 'y', evidence: [{ messageIds: [] }] })) problems.push('isRatified accepted evidence with no message ids');
    return problems;
  });

  // 4. each defect the gate exists to catch, planted one at a time and required by name.
  const plant = (name, mutate, want) => run(name, () => {
    const doc = FIXTURE();
    mutate(doc);
    const { findings } = threadFindings(doc);
    const got = findings.map((f) => f.rule);
    return want.every((w) => got.includes(w)) ? [] : [`planted "${name}" and got: ${got.join(', ') || 'nothing'}`];
  });
  plant('a topic with no evidence', (d) => { delete d.threads[0].evidence; }, ['no-evidence']);
  plant('evidence with no message ids', (d) => { d.threads[0].evidence[0].messageIds = []; }, ['evidence-no-messages']);
  plant('evidence with no date', (d) => { d.threads[0].evidence[0].date = 'last spring'; }, ['evidence-no-date']);
  plant('evidence holding the message text', (d) => { d.threads[0].evidence[0].snippet = 'I think the compactness theorem breaks here'; }, ['evidence-carries-prose']);
  plant('evidence holding who said it', (d) => { d.threads[0].evidence[0].author = 'someone'; }, ['evidence-carries-prose']);
  plant('a thread named after a member', (d) => { d.threads[0].evidence[0].channelName = '@algebra_fan-asks-about-limits'; }, ['evidence-carries-a-handle', 'username-in-file']);
  plant('approved with no signature', (d) => { delete d.threads[0].approvedBy; }, ['approved-without-signature']);
  plant('two entries for one thread', (d) => { d.threads.push({ id: 'thr-zz0000000000', topic: 'the Nonstandard Analysis', status: 'approved', approvedBy: 'operator', approvedAt: '2026-11-20', evidence: [{ channelId: '1170391234567890123', date: '2025-01-01', messageIds: ['1356789012345678999'] }] }); }, ['duplicate-topic']);
  plant('a handle in a printed name', (d) => { d.threads[0].topic = 'What @algebra_fan said about limits'; }, ['public-field-carries-a-handle', 'username-in-file']);
  plant('a link in a topic', (d) => { d.threads[0].topic = 'see https://discord.gg/xyz'; }, ['public-field-carries-a-link']);
  plant('a thread key nobody reviewed', (d) => { d.threads[0].snippet = 'what the model said'; }, ['unknown-thread-key']);
  plant('a topic named after a number', (d) => { d.threads[0].topic = 'the 1356789012345678901 question'; }, ['public-field-carries-a-snowflake']);
  plant('a handle anywhere in the file', (d) => { d.threads[1].aliases.push('@number_theorist'); }, ['public-field-carries-a-handle', 'username-in-file']);
  plant('a token in the file', (d) => { d.source._how = 'MTQ5NjEyMzQ1Njc4OTAxMjM0NR.abcdefghij.klmnopQRSTUVWXyz'; }, ['token-shaped-string']);
  plant('a source key nobody scoped', (d) => { d.source.memberNames = ['someone']; }, ['unknown-source-key']);
  plant('a message id in an alias', (d) => { d.threads[0].aliases.push('1356789012345678901'); }, ['public-field-carries-a-snowflake']);
  plant('the wrong contract version', (d) => { d.schema = THREADS_SCHEMA + 1; }, ['schema-version']);
  run('a missing document is named, not silently empty', () => {
    const { findings } = threadFindings(null);
    return findings.some((f) => f.rule === 'no-document') ? [] : ['no-document not reported'];
  });
  run('a document with no threads array is named', () => {
    const d = FIXTURE();
    delete d.threads;
    const { findings } = threadFindings(d);
    return findings.some((f) => f.rule === 'no-threads') ? [] : ['no-threads not reported'];
  });

  // 5. the built half: what may not reach an artifact, planted one at a time.
  const BUILT_PAGE = (extra = '', drop = null) => {
    const rows = ['Nonstandard analysis', 'Prime ideals']
      .filter((t) => t !== drop)
      .map((t) => `<li class="py-2 text-body leading-prose font-body text-ink">${t}</li>`)
      .join('');
    return [
      {
        file: 'dist/client/chat/index.html',
        text:
          `<main><section class="mt-16 max-w-measure" id="threads" aria-labelledby="threads-heading">` +
          `<h2 id="threads-heading">What the club is pulling on</h2>` +
          `<p>Two threads the club is pulling on.</p><ul class="grid grid-cols-1 gap-x-8 md:grid-cols-2">${rows}</ul>` +
          `</section>${extra}</main>`,
      },
      { file: 'dist/client/_astro/DiscordSummary.js', text: 'export const summaryRoute = 1;' },
    ];
  };
  const built = (pages, mutate = () => {}) => {
    const doc = FIXTURE();
    mutate(doc);
    return builtFindings({ doc, pages }).findings.map((f) => f.rule);
  };
  const plantBuilt = (name, pages, want, mutate) => run(name, () => {
    const got = built(pages, mutate);
    return want.every((w) => got.includes(w)) ? [] : [`planted "${name}" and got: ${got.join(', ') || 'nothing'}`];
  });
  plantBuilt('a message id pasted into a data attribute on the archive page', BUILT_PAGE('<p data-debug="1356789012345678901">for debugging</p>'), ['built-carries-an-id', 'built-carries-a-private-string']);
  plantBuilt('an evidence date printed beside a topic', BUILT_PAGE('<p class="text-micro">2025-04-11</p>'), ['built-carries-a-private-string']);
  plantBuilt('an alias printed in place of the signed topic', BUILT_PAGE().map((p) => ({ ...p, text: p.text.split('Nonstandard analysis').join('infinitesimals') })), ['built-carries-a-private-string', 'built-topic-missing']);
  plantBuilt('a member mention in what a visitor reads', BUILT_PAGE('<p>ask @number_theorist in the channel</p>'), ['built-carries-a-handle']);
  plantBuilt('a signed row quietly dropped from the list', BUILT_PAGE('', 'Prime ideals'), ['built-list-count-wrong', 'built-topic-missing']);
  plantBuilt('a message id in a built JS chunk rather than the page', [
    BUILT_PAGE()[0],
    { file: 'dist/client/_astro/DiscordSummary.js', text: 'const debug = "1170391234567890123";' },
  ], ['built-carries-an-id']);
  run('clean control: the built shape this tree ships', () => {
    const got = built(BUILT_PAGE());
    return got.length ? [`unexpected findings on a clean artifact: ${got.join(', ')}`] : [];
  });
  run('clean control: an author comment is not a handle, and a channel name inside its own topic is not a leak', () => {
    const doc = FIXTURE();
    doc.threads[0].topic = 'Nonstandard analysis and infinitesimals';
    doc.threads[0].evidence[0].channelName = 'Nonstandard analysis';
    const page = [
      {
        file: 'dist/client/chat/index.html',
        text:
          '<section id="threads"><ul><li>Nonstandard analysis and infinitesimals</li><li>Prime ideals</li></ul>' +
          '<!-- written 2026-11-21 @measured by npm run build, ping @number_theorist if it breaks --></section>',
      },
    ];
    const got = builtFindings({ doc, pages: page }).findings;
    return got.length ? [`a comment or a substring of a topic read as a leak: ${got.map((f) => `${f.rule} (${f.detail})`).join(' | ')}`] : [];
  });

  // 6. the clean control: a gate that always fails is as undecidable as one that always passes.
  run('clean control: the fixture passes', () => threadFindings(FIXTURE()).findings.map((f) => `unexpected ${f.rule}: ${f.detail}`));
  run('clean control: notes name what is pending, not what is broken', () => {
    const d = FIXTURE();
    d.threads[1].status = 'candidate';
    delete d.threads[1].approvedBy;
    const { findings, notes } = threadFindings(d);
    const problems = findings.map((f) => `unexpected ${f.rule}`);
    if (!notes.some((n) => /Prime ideals/.test(n))) problems.push('the pending topic is not in the review queue');
    return problems;
  });

  let bad = 0;
  for (const c of cases) {
    let problems = [];
    try { problems = c.check() ?? []; } catch (e) { problems = [`threw: ${e.message}`]; }
    console.log(`${problems.length ? 'FAIL ' : 'ok   '} ${c.name}${problems.length ? `\n       ${problems.join('\n       ')}` : ''}`);
    if (problems.length) bad++;
  }
  console.log(`\ncheck:thread-topics selftest - ${cases.length} cases, ${bad} wrong`);
  if (!bad) console.log('The dedup rule, the idempotence, and the privacy of the published view all still fail when broken.');
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------------------ verdict
const file = argOne('--file', THREADS_FILE);
const DIST = args.includes('--dist') ? argOne('--dist', 'dist/client') : null;
const doc = args.includes('--file') ? (() => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return { _unreadable: e.message }; } })() : readThreads(file);

/** Every text file under the built directory. A file containing a NUL byte is an image or a font and has no
 *  strings a prose rule can speak about; skipping it is stated rather than assumed. */
function builtPages(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else {
        let buf;
        try {
          buf = readFileSync(p);
        } catch {
          continue;
        }
        if (buf.includes(0)) continue;
        out.push({ file: p, text: buf.toString('utf8') });
      }
    }
  };
  walk(dir);
  return out;
}

if (DIST) {
  if (!doc || doc._unreadable) {
    console.log(`check:thread-topics:dist FAIL - cannot read ${file}, so there is no archive to compare the build against.`);
    process.exit(1);
  }
  if (!existsSync(DIST)) {
    console.log(`check:thread-topics:dist FAIL - ${DIST} does not exist. Run \`npm run build\` first; this half reads the artifact (D118).`);
    process.exit(1);
  }
  const pages = builtPages(DIST);
  const { findings, surfaces, publishable, privateStrings } = builtFindings({ doc, pages });
  console.log(`check:thread-topics:dist - ${pages.length} built text file(s), ${surfaces} archive surface(s), ${publishable} publishable topic(s), ${privateStrings} private string(s) @measured ${new Date().toISOString().slice(0, 10)} by this gate`);
  for (const f of findings) console.log(`  FAIL     ${f.rule}: ${f.file}: ${f.detail}`);
  if (findings.length) {
    console.log(`\n${findings.length} finding(s). The archive's evidence stays in data/discord-threads.json; what publishes is a signed topic (D461, S088).`);
    process.exit(1);
  }
  console.log('\nNo channel id, message id, evidence date, channel name, alias or member mention reaches a built byte; the archive surface paints the whole ratified set.');
  console.log('Run `node scripts/check-thread-topics.mjs --selftest` to see that these checks can still fail.');
  process.exit(0);
}

if (!doc) {
  console.log(`check:thread-topics FAIL - ${file} does not exist.`);
  console.log('  Fix: node scripts/harvest-threads.mjs --write (run on the operator\'s rig; MS41, S088).');
  console.log('  Nothing is published without it: the /chat archive has no source, so the section has no content.');
  process.exit(1);
}

const { findings, notes } = threadFindings(doc);
const pub = publishedThreads(doc);
console.log(`check:thread-topics - ${(doc.threads ?? []).length} thread(s) in the archive, ${pub.length} ratified and publishable @measured ${new Date().toISOString().slice(0, 10)} by this gate (schema ${doc.schema})`);
for (const n of notes) console.log(`  pending  ${n}`);
for (const f of findings) console.log(`  FAIL     ${f.rule}: ${f.detail}`);
if (findings.length) {
  console.log(`\n${findings.length} finding(s). The contract is src/lib/threads.mjs; the harvest is scripts/harvest-threads.mjs.`);
  console.log('A topic is published only with evidence (channel + message ids + date) and a signature (approvedBy/approvedAt) - D461.');
  process.exit(1);
}
console.log(`\nEvery topic traces to messages and carries a signature; ${pub.length} will render and nothing private is in the public view.`);
console.log('Run `node scripts/check-thread-topics.mjs --selftest` to see that these checks can still fail.');
