#!/usr/bin/env node
// check:content — the site may not ship a thing it does not know.
//
//   npm run check:content            # over src/ and the built dist/client
//   npm run check:content:selftest   # plant each defect, require each to FAIL (D118)
//   node scripts/check-content.mjs --dist <dir> --src <dir>   # scan fixtures instead (the selftest uses this)
//
// Why a gate and not a guideline: every fabricated claim in this repo survived *because nothing could see
// one*. Measured history, all real:
//   - `Join our active community of ${Math.floor(Math.random()*100+150)}+ members.` — a different community
//     size on every request, from a static page, with no source (D136; deleted, not replaced).
//   - "Saturday, 2:00 PM", "Local Library - Study Room B", "Topic: Introduction to Group Theory", a
//     "Reserve Your Spot" button — the whole of `UpcomingMeetups.astro`, `.notes/roadmap-events.md`:
//     "**entirely invented placeholder content**".
//   - "weekly" in four places, one of them `grep -c "Weekly Meetups"` → 1 on the live site, for two years
//     (D92; the copy rule: publish series names and real dates, never a frequency).
//   - `Schedule` and `Members` in the nav pointing at pages the build does not emit — 404 links on prod
//     (D117: a path needs a page).
// DESIGN.md's Copy rule already says how to write the fix — "[YEAR], [CADENCE], [N], [verbatim] stay
// bracketed until a source exists" — and the operator ruled on 2026-11-03 that placeholders are what to
// use for everything we are missing. A bracket is only safe while it stays out of the visitor's page, so
// the bracket convention gets a machine: this gate reads the built HTML, not the source, because the
// artifact is what a visitor reads.
//
// What FAILS: a bracketed placeholder in built HTML; a placeholder photo fill (`data-placeholder`) in a
// build whose tracked `src/content.json` has placeholders off, or a tracked config that turns them on; a
// retired fabricated string; a cadence word with no `source` beside it; `Math.random()` in copy generation;
// an internal link to a route the build does not emit; a cross-surface near-duplicate sentence that
// `design/copy-duplicates.json` does not already record (see the rule block above the scanner).
//
// What is REPORTED, not failed: the open placeholder slots in `src/content.json` — the operator's punch
// list (photographs, the venue line, the member count and its source, the calendar source from D132) — and
// slots holding a claim with no source yet. Those are known holes with names; failing a build for a hole
// the operator has not filled yet is the "make the build fail so someone notices" answer they rejected
// (record 0010).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { openSlots, unsourcedSlots } from '../src/lib/content-slots.mjs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const argOne = (flag, dflt) => { const i = args.indexOf(flag); return i < 0 ? dflt : args[i + 1]; };
const selftest = args.includes('--selftest');

const SKIP = new Set(['node_modules', 'dist', '.git', '.pi', '.astro', '.wrangler', 'design', '.notes', '.agents', '.design']);
const walk = (dir, exts, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
};

// ---- the rules, as data, so the selftest can plant each one ------------------------------

// A bracket is DESIGN.md's marker for "we do not know this yet". It may live in src/content.json and in a
// specimen; it may never reach a visitor.
const BRACKET = /\[([^\]\n<>]{1,48})\]/g;
const looksLikePlaceholder = (s) => /^[A-Z][A-Z0-9 '’\-]{1,}$/.test(s.trim()) || /^\{.*\}$/.test(s.trim());

// D92's frequency words. Allowed only with a named `cadence.source` in src/content.json.
const CADENCE = /\b(weeklyn?|weekly|monthly|daily|nightly|biweekly|bimonthly|fortnightly|every other week|every week|every month|each week|twice a month|most months)\b/gi;

// Strings this repo measured as fabricated, or that the operator says the club never claimed. If one comes
// back, someone pasted a placeholder or a template's benefit grid back into copy.
const RETIRED = [
  // invented events and venues (the retired UpcomingMeetups.astro / PastEvents.astro, .notes/roadmap-events.md)
  'Local Library', 'Study Room B', 'Reserve Your Spot', 'Introduction to Group Theory',
  'Saturday, 2:00 PM', 'active community of', 'Math Study Group Session',
  // the six-card benefit grid and the join band's checklist, deleted 2026-11-03. The operator on the same
  // day: the page had "no humanity" and was "too professional", and on the club having written anything —
  // "Our club has not written anything." Every one of these was an unsourced claim about a club nobody in
  // the repo could describe; three of them ("Learn from experienced mathematicians…", "Access to curated
  // learning materials…", "Monthly in-person study sessions") describe services the club does not offer.
  'Why Join Our Math Book Club', 'Discover the benefits', 'Expert Guidance', 'Collaborative Learning',
  'Learn from experienced mathematicians', 'Regular Meetups', 'Sessions most months', 'Study Resources',
  'Access to curated learning materials', 'Diverse Community', 'Connect with students, professionals',
  'Growth Mindset', 'Develop problem-solving skills', 'Join our passionate community',
  'our monthly book club meetings', 'Why Join Our Meetup Group', 'Monthly in-person study sessions',
  'Collaborative problem-solving', 'Network with math enthusiasts', 'Connect with fellow math enthusiasts',
  'Join Our Next Session', 'Join Our Community',
  // The pre-rename identity copy, retired 2026-11-07 when the operator rebranded the club as Matheapolis ("I want
  // the focus on the people and the ideas more than the book. the book is more an inspiration"). If either is back
  // in what a visitor reads, a name slot was renamed only halfway or an old branch re-landed. The one permitted
  // mention of the old framing is the hero's continuity sentence, which names the club's FORMER name in the Meetup
  // listing's own spelling ("Minneapolis Mathematics Book Club") - a fact about the past. These two are present
  // tense: the lane that made a book the venue, and the band clause that said the book is what happens at the table.
  'A book, a room, and whoever shows up', 'the table is the book itself',
];

// D136's defect class: a number the page invents at request time.
const RANDOM_COPY = /Math\.random\s*\(/g;

// Which paths the build actually emits, read off the artifact rather than remembered here: a route is a
// file, so `/chat` is `chat/index.html` and `/404` is `404.html`. This is what makes the dead-path rule
// self-updating — add a page and the gate stops refusing to link to it, delete one and every link to it
// goes red (D117 killed two nav links that pointed at nothing; remembering the route list by hand is how
// that class survives).
const emittedRoutes = (htmlFiles, distDir) => htmlFiles.map((f) => {
  const rel = f.slice(distDir.length).replace(/\\/g, '/');
  return rel.replace(/^\//, '').replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
}).map((p) => (p === 'index' || p === '' ? '/' : `/${p}`));

/** Strip comments and tags: a comment is not something a visitor reads, and prod's HTML carried the
 *  fabricated "Next meetup: Saturday, 2:00 PM" inside one, which made whole-page content probes lie. */
const visibleText = (html) => html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');

// ---- near-duplicate surface copy -------------------------------------------------------------
// The rule this repo did not have until 2026-11-08, when the operator read the homepage and said it twice: "there
// is duplication between the 'How it works' section on the homepage and the very first section, 'We meet around a
// table…'". They were right, and the instructive part is that a reader noticed it long before anything here could:
// the page states the same facts in two surfaces ~2,180px apart, in three vocabularies. Measured on the built
// homepage, and reproduced by this gate:
//   hero    y248   "Dates go up on Meetup; most of the arguing happens in the chat between meetings."
//   band    y2427  "A date and its place go up on Meetup; the discussion keeps running between meetings in the chat."
//   hero    y407   "There is no syllabus, no reading list to keep up with, and no current focus."
//   section y872   "This is not a syllabus and there is nothing to keep up with: any of them can be dropped…"
//   hero    y407   "What the club is pulling on is decided in its own chat, and some of the threads open there…"
//   section y872   "Threads that are open in the club's chat."
//
// Why a machine and not a note: duplicated copy is not a style complaint here, it is LENGTH. Every repeated
// sentence is vertical space on a page whose whole design argument is that the first screen answers the question,
// and check:space's own rule is that a repeated verb is cheaper than an added label. Duplication is also how a
// sourced claim drifts: the band's sentence sits beside the `venues` slot and the hero's does not, so the twins can
// be edited apart and only one of them stays traceable to a source.
//
// What FAILS: a cross-surface repeat that design/copy-duplicates.json does not know about. The baseline is this
// repo's own pattern (design-enforce's "only fails when it gets worse"): the pairs already shipped are recorded as
// OPEN, with their scores and no ruling, so the gate cannot be blamed for a defect the operator is still deciding
// — while any NEW repeat is red the moment it ships. Deleting the copy, or accepting a pair with a ruling id, are
// both exits.
//
// What it deliberately is NOT: a semantic detector. Content words only, and two scores — Jaccard (how much of the
// combined vocabulary is shared) and the overlap coefficient (how much of the SHORTER sentence is inside the longer
// one, because a paraphrase of a long sentence scores low on Jaccard alone) — over a floor of 3 shared content
// words. Splitting is on terminal punctuation only: this page writes both of its worst twins as semicolon-joined
// pairs, and splitting on ';' is exactly how a detector misses them.

const BASELINE_PATH = resolve('design', 'copy-duplicates.json');
const STOP = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'your', 'with', 'that', 'this', 'from', 'their', 'they', 'them', 'its', 'it', 'a', 'an', 'of', 'in', 'to', 'on', 'at', 'is', 'was', 'be', 'been', 'do', 'does', 'has', 'have', 'had', 'we', 'our', 'us', 'he', 'she', 'as', 'by', 'or', 'if', 'so', 'than', 'then', 'there', 'here', 'what', 'which', 'who', 'would', 'will', 'can', 'some', 'any', 'no', 'most', 'into', 'about', 'before', 'between', 'up', 'down', 'out', 'off', 'over', 'under']);
const plain = (frag) => frag.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;|\u2019/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const contentWords = (t) => new Set(t.toLowerCase().replace(/[.,;:!?\u2013\u2014\u2019'()\[\]]/g, ' ').split(' ').filter((w) => w.length > 2 && !STOP.has(w)));
// A signature, not an index: a baseline row must survive a reword of the sentence beside it, and it must not match
// a different pair that happens to share three words.
//
// The date stamp is stripped before anything else, because a signature that carries a stamp's date is an
// exemption with an expiry. `npm run events:harvest` rewrites "Copied from the club's own calendar on <date>"
// every time the feed is read, and a harvest that changes nobody's copy can retire every exemption built on it:
// @measured 2026-11-13 by this gate — one harvest moved the stamp from Nov 6 to Nov 13 and made all 3 baseline
// rows stale, each of them a FAIL for a sentence nobody touched. The pair is the pair whatever today is; the
// date is data the page prints, not the shape of the sentence.
const DATE_STAMP = /\b(?:on|read|dated|as of)\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g;
const normSentence = (t) => t.toLowerCase().replace(DATE_STAMP, '').replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
const dupSignature = (a, b) => [normSentence(a), normSentence(b)].sort().join(' <> ');

/** The rows the schedule builds from the snapshot are `<li data-surface="row">` (EventRow.astro); the homepage's
 *  next-date card is `data-surface="preview"` (Schedule.astro). Only the rows count as furniture: a venue line
 *  printed in three sibling rows is ONE string rendered three times, which is coupling, not duplication — D273
 *  closed the row-label pair on exactly that reasoning. A sentence that appears in a row AND in a section
 *  paragraph is still two surfaces saying the same thing, and that still goes red; rows that paraphrase each other
 *  still go red. The exemption is only for the identical string, and only when both ends are inside a row.
 *
 *  `</li>` without a nested one is checked, not assumed: no schedule row contains a nested list (verified on the
 *  built /schedule, 2026-11-13: 5 `data-surface="row"` <li>, 0 <li> inside them). If a row ever grows a nested
 *  list this helper must be re-anchored, same rule as D173. */
function rowRanges(html) {
  const ranges = [];
  for (const m of html.matchAll(/<li\b[^>]*data-surface="row"[^>]*>/g)) {
    const end = html.indexOf('</li>', m.index);
    ranges.push([m.index, end < 0 ? html.length : end]);
  }
  return ranges;
}

/** Every sentence of page copy, tagged with the surface a reader would name it by. Surfaces come from the
 *  document's own structure — the enclosing section id and the heading the copy sits under — because the ruling is
 *  about WHICH surface keeps a sentence, and "the hero" versus "the join band" is the whole ruling. */
function surfaceSentences(html) {
  const out = [];
  const rows = rowRanges(html);
  let heading = '';
  let section = 'page';
  // `\b` after `<p` and `<h` is not decoration: `<p[^>]*>` also matches `<path`, and the sphere mark's SVG is
  // full of them. Without the boundary the first `<path>` in the hero opened a "paragraph" that ran to the next
  // literal `</p>`, swallowing the "What we take up" heading and its paragraph — so the strongest pair on the page
  // (the hero's threads signpost <> the section's "Threads that are open in the club's chat.") read as one
  // 5-word sentence and the gate missed the duplicate the operator had just pointed at. Measured 2026-11-08:
  // 21 "sentences" on the built homepage, 2 of them SVG path soup.
  const re = /<(section|main|header|footer)\b[^>]*>|<h([1-3])\b[^>]*>([\s\S]*?)<\/h\2>|<p\b[^>]*>([\s\S]*?)<\/p>/g;
  for (const m of html.matchAll(re)) {
    if (m[1]) { const id = m[0].match(/id="([^"]+)"/); section = id ? `#${id[1]}` : m[1]; continue; }
    if (m[2]) { heading = plain(m[3]); continue; }
    const text = plain(m[4]);
    if (text.split(' ').length < 5) continue;
    for (const part of text.split(/(?<=[.!?])\s+/)) {
      const t = part.trim();
      if (contentWords(t).size < 4) continue;
      out.push({
        own: t.slice(0, 200), surface: `${section}:${heading}`, words: contentWords(t),
        inRow: rows.some(([s, e]) => m.index >= s && m.index < e),
      });
    }
  }
  return out;
}

function scanDuplicates(built, baseline) {
  const failSeen = new Map();
  const openSeen = new Map();
  const furnitureSeen = new Map();
  const known = new Set((baseline.pairs || []).map((p) => p.signature));
  for (const [file, html] of built) {
    const sents = surfaceSentences(html);
    // Count the identical strings inside the rows first, so the report can say how many rows print them.
    for (const s of sents) {
      if (!s.inRow) continue;
      const k = normSentence(s.own);
      const e = furnitureSeen.get(k);
      if (e) e.count++;
      else furnitureSeen.set(k, { key: k, count: 1, text: s.own, file, surface: s.surface });
    }
    for (let i = 0; i < sents.length; i++) {
      for (let j = i + 1; j < sents.length; j++) {
        const a = sents[i], b = sents[j];
        if (a.surface === b.surface) continue;
        if (a.inRow && b.inRow && normSentence(a.own) === normSentence(b.own)) continue; // row furniture, reported below
        const shared = [...a.words].filter((w) => b.words.has(w));
        const union = new Set([...a.words, ...b.words]).size;
        const jaccard = shared.length / union;
        const overlap = shared.length / Math.min(a.words.size, b.words.size);
        if (shared.length < 3 || (jaccard < 0.45 && overlap < 0.5)) continue;
        const row = {
          rule: 'near-duplicate-surface', file, signature: dupSignature(a.own, b.own),          shared: shared.length, sharedWords: shared.join(','),
          jaccard: +jaccard.toFixed(3), overlap: +overlap.toFixed(3),
          detail: `${a.surface}: "${a.own}"  <>  ${b.surface}: "${b.own}"`,
        };
        // One row per pair, not one row per page that carries it: the same twin can appear on three emitted pages,
        // and three identical baseline rows would read as three defects.
        const bucket = known.has(row.signature) ? openSeen : failSeen;
        const prev = bucket.get(row.signature);
        if (prev) { if (!prev.files.includes(file)) prev.files.push(file); continue; }
        row.files = [file];
        bucket.set(row.signature, row);
      }
    }
  }
  return {
    fails: [...failSeen.values()],
    opens: [...openSeen.values()],
    furniture: [...furnitureSeen.values()].filter((f) => f.count > 1),
  };
}

function scanPage(html, file, emitted, distDir) {
  const fails = [];
  const text = visibleText(html);

  for (const m of text.matchAll(BRACKET)) {
    if (looksLikePlaceholder(m[1])) fails.push({ rule: 'bracket', file, detail: `[${m[1]}] is in what a visitor reads` });
  }
  for (const m of html.matchAll(/data-slot="([^"]+)"/g)) void m; // probe handles: informational only
  for (const m of html.matchAll(/data-placeholder="([^"]+)"/g)) {
    fails.push({ rule: 'placeholder-fill', file, detail: `photo place ${m[1]} is drawn as a placeholder in this build` });
  }
  for (const s of RETIRED) {
    if (text.includes(s)) fails.push({ rule: 'retired-fabrication', file, detail: `"${s}" is back — it was measured as invented (.notes/roadmap-events.md, D136)` });
  }
  // Links the build has nothing behind (D117: a path needs a page — this is how /schedule and /members
  // 404'd). "Nothing behind" is checked against the artifact, not a remembered route list: a href is fine
  // if it is an emitted route or a real file under dist/client (favicon.svg, /_astro/*.css, sitemap.xml are
  // assets, not pages, and a rule that called them dead paths would be noise that gets the whole gate
  // ignored). What survives is a link a visitor can click and the edge has nothing to answer with.
  for (const m of html.matchAll(/href="([^"]*)"/g)) {
    const raw = m[1].split('#')[0].split('?')[0];
    if (!raw.startsWith('/')) continue;
    const path = raw.replace(/\/$/, '') || '/';
    const onDisk = existsSync(resolve(distDir, '.' + raw));
    if (!onDisk && !emitted.includes(path) && !emitted.some((r) => r !== '/' && path.startsWith(`${r}/`))) {
      fails.push({ rule: 'dead-path', file, detail: `href="${m[1]}" — no emitted route and no file behind it (emits ${emitted.join(', ')})` });
    }
  }
  return fails;
}

function scanSource(files) {
  const fails = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if (RANDOM_COPY.test(src)) {
      fails.push({ rule: 'invented-number', file: f, detail: 'Math.random() in source — a number the page invents per request (D136)' });
    }
    RANDOM_COPY.lastIndex = 0;
  }
  return fails;
}

function checkConfig(trackedJson, builtHtml) {
  const fails = [];
  const warns = [];
  if (trackedJson.photos?.placeholders === true) {
    fails.push({ rule: 'tracked-placeholder-switch', file: 'src/content.json', detail: 'placeholders: true is in the TRACKED content file — only src/content.local.json (gitignored) may turn a placeholder on' });
  }
  const cadence = trackedJson.cadence;
  const cadenceHits = new Map();
  for (const [, html] of builtHtml) {
    // Meta descriptions are a claim the site publishes even though no eye reads them on the page — the
    // `seo.description` sentence says "Monthly meetups", and `visibleText` strips tags, so it is picked up
    // here rather than silently escaping the D92 rule.
    const meta = [...html.matchAll(/<meta\b[^>]*>/gi)]
      .map((m) => /content="([^"]*)"/i.exec(m[0])?.[1] ?? '')
      .filter(Boolean)
      .join(' ');
    for (const m of (visibleText(html) + ' ' + meta).matchAll(CADENCE)) {
      const w = m[1].toLowerCase();
      cadenceHits.set(w, (cadenceHits.get(w) ?? 0) + 1);
    }
  }
  if (cadenceHits.size && !cadence?.source) {
    fails.push({
      rule: 'unsourced-cadence',
      file: 'src/content.json',
      detail: `cadence word in built HTML (${[...cadenceHits].map(([w, n]) => `${w} x${n}`).join(', ')}) with no cadence.source — D92: publish series names and real dates, or name where the ruling came from`,
    });
  }
  return { fails, warns, cadenceHits };
}

/** The operator's punch list: which facts are still holes, and what each hole is waiting for. The walks
 *  themselves are shared with the site (src/lib/content-slots.mjs) — they used to be copied here, and the
 *  copy had no array branch, so every claim inside a list was invisible to this gate. */
function run(distDir, srcDir, tracked) {
  const htmlFiles = walk(distDir, ['.html']);
  const built = htmlFiles.map((f) => [f, readFileSync(f, 'utf8')]);
  const emitted = emittedRoutes(htmlFiles, distDir);
  const srcFiles = walk(srcDir, ['.astro', '.svelte', '.ts', '.tsx', '.mjs', '.js']).filter((f) => !f.endsWith('content.ts'));
  const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : { pairs: [] };
  const dup = scanDuplicates(built, baseline);
  const fails = [
    ...built.flatMap(([f, h]) => scanPage(h, f, emitted, distDir)),
    ...scanSource(srcFiles),
    ...dup.fails,
  ];
  const { cadenceHits } = checkConfig(tracked, built);
  return { fails, built, cadenceHits, emitted, dupOpens: dup.opens, dupFurniture: dup.furniture, staleBaseline: (baseline.pairs || []).filter((p) => !dup.opens.concat(dup.fails).some((d) => d.signature === p.signature)) };
}

// ---- selftest: can this gate fail? (D118 — a gate whose failure mode is a green line is no gate) ----

if (selftest) {
  const FIX = '.design/tmp-content';
  mkdirSync(`${FIX}/clean`, { recursive: true });
  const clean = `<html><body><a href="/chat">chat</a><p>Dates are set in the club Discord and posted on Meetup.</p></body></html>`;
  const plants = [
    { name: 'bracket', html: clean.replace('</body>', '<p>at [VENUE NAME]</p></body>') },
    { name: 'placeholder-fill', html: clean.replace('</body>', '<div data-placeholder="PS-1"></div></body>') },
    { name: 'retired-fabrication', html: clean.replace('</body>', '<p>Local Library - Study Room B</p></body>') },
    // the six-card grid the operator deleted on 2026-11-03: a pasted-back template heading has to be as
    // catchable as an invented venue, or the retired list only remembers the last round's mistakes
    { name: 'retired-marketing-grid', rule: 'retired-fabrication', html: clean.replace('</body>', '<h3>Expert Guidance</h3><p>Learn from experienced mathematicians and educators</p></body>') },
    { name: 'dead-path', html: clean.replace('</body>', '<a href="/schedule">Schedule</a></body>') },
    { name: 'unsourced-cadence', html: clean.replace('</body>', '<p>Monthly meetups</p></body>') },
    { name: 'invented-number', html: clean, src: 'Join our active community of ' + '${Math.random()}+ members.' },
    // Two surfaces, one statement, different vocabulary — the shape the operator actually found on the page. It is
    // planted against an EMPTY baseline (below) because the baseline is what makes the shipped pairs non-failures,
    // and a selftest that read the real baseline could pass by forgetting it knows this pair.
    // The planted pair is the REAL one, copied off the built homepage, not a paraphrase of it: the clean fixture's
    // own one-liner shares only the word "Meetup" with the band, which is a 1-word overlap and correctly does not
    // fire. Planting a weak pair would prove the selftest can plant, not that the rule catches this defect.
    {
      name: 'near-duplicate-surface', rule: 'near-duplicate-surface',
      html: `<html><body><main><h1>Matheapolis</h1><p>Dates go up on Meetup; most of the arguing happens in the chat between meetings.</p></main><section id="when-we-meet"><h2>When We Meet</h2><p>A date and its place go up on Meetup; the discussion keeps running between meetings in the chat.</p></section></body></html>`,
    },
    // The near-miss that must NOT fire: shared vocabulary is not the same defect when the surfaces say different
    // things. Without this planting the rule drifts into noise and gets the whole gate switched off.
    { name: 'shared-words-not-a-duplicate', negative: true, html: clean.replace('</body>', '<section id="how"><h2>How it works</h2><p>Meetup holds the calendar and the chat holds the arguments, which is why the schedule page copies its dates from the club calendar.</p></section></body>') },
    // Sibling schedule rows that print the SAME string are furniture (coupling), not duplication — the
    // exemption has to be scoped as tightly as the ruling that earned it, so two plants here prove both edges:
    // identical in two rows is green, identical in a row and a section paragraph is red.
    {
      name: 'row-furniture-not-a-duplicate', rule: 'near-duplicate-surface', negative: true, furniture: 2,
      html: `<html><body><section id="when-we-meet"><h2>When We Meet</h2><ul><li data-surface="row" data-date="2026-11-21"><h3>MPLS Math Club Social</h3><p>Angel Food Bakery, 8100 Minnetonka Boulevard, Saint Louis Park, Minnesota</p></li><li data-surface="row" data-date="2026-12-05"><h3>Matheapolis - Bimonthly Social</h3><p>Angel Food Bakery, 8100 Minnetonka Boulevard, Saint Louis Park, Minnesota</p></li></ul></section></body></html>`,
    },
    {
      name: 'row-sentence-in-a-section-paragraph', rule: 'near-duplicate-surface',
      html: `<html><body><section id="when-we-meet"><h2>When We Meet</h2><p>Angel Food Bakery, 8100 Minnetonka Boulevard, Saint Louis Park, Minnesota</p><ul><li data-surface="row" data-date="2026-11-21"><h3>MPLS Math Club Social</h3><p>Angel Food Bakery, 8100 Minnetonka Boulevard, Saint Louis Park, Minnesota</p></li></ul></section></body></html>`,
    },
    // Two rows that say the same thing in different words are not furniture: the string differs, so the coupling
    // is not the mechanism and the duplicate is real.
    {
      name: 'rows-that-paraphrase', rule: 'near-duplicate-surface',
      html: `<html><body><section id="when-we-meet"><h2>When We Meet</h2><ul><li data-surface="row"><h3>Session A</h3><p>The social is an hour at the bakery with no agenda.</p></li><li data-surface="row"><h3>Session B</h3><p>An hour at the bakery with no agenda and no sign-up.</p></li></ul></section></body></html>`,
    },
    // The signature must survive a harvest. This pair is recorded with the stamp as it read on Nov 6 and the
    // page prints Nov 13: without DATE_STAMP normalisation the exemption expires on its own and the page goes
    // red for a sentence nobody edited.
    {
      name: 'stamp-date-moves-baseline-still-matches', rule: 'near-duplicate-surface',
      baseline: [{ signature: dupSignature('Copied from the club\u2019s own calendar on Nov 6, 2026', 'These dates are copied from the club\u2019s own calendar.') }],
      html: `<html><body><section id="when-we-meet"><h2>When We Meet</h2><p>These dates are copied from the club\u2019s own calendar.</p><ul><li data-surface="row"><h3>MPLS Math Club Social</h3><p>Copied from the club\u2019s own calendar on Nov 13, 2026</p></li></ul></section></body></html>`,
    },
    // The exemption has to be load-bearing, not decorative: the identical pair, with its signature in the baseline,
    // must go GREEN and still be reported. If `known` were ignored the shipped page would be red; if the gate only
    // ever printed baseline rows, nobody would notice a rule that had stopped firing. `recorded: true` builds the
    // baseline from the pair itself rather than from a hand-typed string, so a change to `dupSignature` shows up
    // here as a red planting instead of a silent pass.
    {
      name: 'near-duplicate-recorded-not-exempted', rule: 'near-duplicate-surface', recorded: true,
      html: `<html><body><main><h1>Matheapolis</h1><p>Dates go up on Meetup; most of the arguing happens in the chat between meetings.</p></main><section id="when-we-meet"><h2>When We Meet</h2><p>A date and its place go up on Meetup; the discussion keeps running between meetings in the chat.</p></section></body></html>`,
    },
  ];
  const trackedNoSource = { cadence: { value: 'Monthly', source: null }, photos: { placeholders: false } };
  let bad = 0;
  for (const p of plants) {
    const dir = `${FIX}/plant-${p.name.replace(/[^a-z]/g, '')}`;
    mkdirSync(`${dir}/src`, { recursive: true });
    writeFileSync(`${dir}/index.html`, p.html);
    if (p.src) writeFileSync(`${dir}/src/Fake.astro`, p.src);
    const html = [[`${dir}/index.html`, p.html]];
    let fails = [...scanPage(p.html, `${dir}/index.html`, ['/', '/chat'], dir), ...scanSource(p.src ? [`${dir}/src/Fake.astro`] : [])];
    if (p.name === 'unsourced-cadence') fails = [...fails, ...checkConfig(trackedNoSource, html).fails];
    let dup = null;
    if (p.rule === 'near-duplicate-surface') {
      const baseline = p.recorded
        ? { pairs: scanDuplicates(html, { pairs: [] }).fails.map((f) => ({ signature: f.signature })) }
        : { pairs: p.baseline || [] };
      dup = scanDuplicates(html, baseline);
      fails = [...fails, ...dup.fails];
    }
    let caught;
    if (p.furniture) caught = dup.fails.length === 0 && dup.furniture.length === 1 && dup.furniture[0].count === p.furniture;
    else if (p.recorded) caught = dup.fails.length === 0 && dup.opens.length === 1;
    else if (p.negative) caught = !fails.some((f) => f.rule === 'near-duplicate-surface');
    else caught = fails.some((f) => f.rule === (p.rule ?? p.name));
    console.log(`${caught ? 'ok   caught' : 'FAIL missed'}  ${p.name.padEnd(34)} ${p.recorded ? `green, reported as open (${dup.opens.length})` : fails.map((f) => f.rule).join(',') || 'nothing'}`);
    if (!caught) bad++;
  }
  // and the clean fixture must pass, or the gate is just always red
  const cleanFails = scanPage(clean, `${FIX}/clean/index.html`, ['/', '/chat'], `${FIX}/clean`);
  const cleanOk = cleanFails.length === 0;
  console.log(`${cleanOk ? 'ok   clean' : 'FAIL clean'}  clean fixture          ${cleanFails.map((f) => f.rule).join(',') || 'no findings'}`);
  if (!cleanOk) bad++;
  // a tracked file that switches placeholders on must be caught
  const trackedOn = checkConfig({ cadence: { source: 'x' }, photos: { placeholders: true } }, []).fails;
  const trackedOnCaught = trackedOn.some((f) => f.rule === 'tracked-placeholder-switch');
  console.log(`${trackedOnCaught ? 'ok   caught' : 'FAIL missed'}  tracked-placeholder-switch`);
  if (!trackedOnCaught) bad++;

  // The shared walks (src/lib/content-slots.mjs). The copy that used to live here had no array branch, so
  // every claim inside a list — all nine `threads.items` — was invisible to it. D118: prove the walk sees
  // the case it used to miss, and prove source inheritance does not turn the report off.
  const inList = unsourcedSlots({ threads: { source: null, items: [{ value: 'A claim in a list' }] } });
  const listOk = inList.length === 1 && inList[0].path === 'threads.items[0]';
  console.log(`${listOk ? 'ok   caught' : 'FAIL missed'}  unsourced-claim-in-a-list  ${inList.map((u) => u.path).join(',') || 'nothing'}`);
  if (!listOk) bad++;
  const inheritOk = unsourcedSlots({ threads: { source: 'operator, 2026-11-03', items: [{ value: 'x' }, { value: 'y' }] } }).length === 0;
  console.log(`${inheritOk ? 'ok   clean' : 'FAIL missed'}  inherited-source         a source on the group covers the items under it`);
  if (!inheritOk) bad++;
  const holesOk = openSlots({ focus: { value: null, placeholder: '[what we are reading]' } }).length === 1;
  console.log(`${holesOk ? 'ok   caught' : 'FAIL missed'}  open-placeholder-walk`);
  if (!holesOk) bad++;

  console.log(`\ncheck:content selftest: ${plants.length + 5 - bad}/${plants.length + 5} planted defects caught`);
  process.exit(bad ? 1 : 0);
}

// ---- the real run -----------------------------------------------------------------------

const trackedPath = resolve('src/content.json');
if (!existsSync(trackedPath)) {
  console.error('check:content: src/content.json missing — the site has no single source for its own facts.');
  process.exit(1);
}
const tracked = JSON.parse(readFileSync(trackedPath, 'utf8'));

const distDir = argOne('--dist', 'dist/client');
const srcDir = argOne('--src', 'src');
if (!existsSync(distDir)) {
  console.error(`check:content: ${distDir} missing — it judges the artifact a visitor reads, so build first (npm run build).`);
  process.exit(1);
}

const { fails, built, cadenceHits, dupOpens, dupFurniture, staleBaseline } = run(distDir, srcDir, tracked);

// `--print-baseline` is a paste helper, not a write. A baseline row means "this repeat is known and ruled", and an
// gate that can write its own exemptions is a gate that eventually has none.
if (args.includes('--print-baseline')) {
  const d = scanDuplicates(built, { pairs: [] });
  console.log(JSON.stringify({ pairs: d.fails.map((f) => ({ signature: f.signature, shared: f.shared, jaccard: f.jaccard, overlap: f.overlap, status: 'open', ruled: null, note: f.detail })) }, null, 2));
  process.exit(0);
}

console.log(`check:content — ${built.length} built page(s) over ${walk(srcDir, ['.astro', '.svelte', '.ts']).length} source file(s)`);
console.log(`  built HTML: ${built.map(([f]) => f.split('/').slice(-2).join('/')).join(', ')}`);
if (cadenceHits.size) {
  console.log(`  cadence words in what a visitor reads: ${[...cadenceHits].map(([w, n]) => `${w} x${n}`).join(', ')} — source: ${tracked.cadence?.source ? tracked.cadence.source.slice(0, 72) + '…' : 'NONE (that is a failure)'}`);
}

const holes = openSlots(tracked);
console.log(`\n  open placeholders in src/content.json (${holes.length}) — these are the operator's, not the build's:`);
for (const h of holes) {
  console.log(`   · ${h.path}${h.placeholder ? `  waiting for ${h.placeholder}` : ''}${h.requires ? `  [${h.requires}]` : ''}`);
}
const uns = unsourcedSlots(tracked);
if (uns.length) {
  console.log(`\n  claims with no source beside them (${uns.length}) — the site states these today:`);
  for (const u of uns) console.log(`   ~ ${u.path}: "${u.value}" — add source + asOf in src/content.json (D92)`);
}

if (dupOpens.length) {
  console.log(`\n  near-duplicate surface copy, already in the baseline (${dupOpens.length}) — known, not yet ruled:`);
  for (const d of dupOpens) console.log(`   ~ ${d.file.split('/').pop()}  shared ${d.shared} (${d.sharedWords})  jaccard ${d.jaccard} overlap ${d.overlap}\n       ${d.detail}`);
}
if (dupFurniture.length) {
  console.log(`\n  row furniture (${dupFurniture.length}) — one string printed in more than one schedule row. That is coupling, not duplication (D273): if the row changes, every sibling changes with it. Reported, never failed.`);
  for (const f of dupFurniture) console.log(`   · ${f.file.split('/').slice(-2).join('/')}  ${f.surface}  x${f.count}  "${f.text}"`);
}
if (staleBaseline.length) {
  console.log(`\n  baseline rows that no longer match anything on the page (${staleBaseline.length}) — the copy was fixed or reworded; delete the row so the pair stays visible if it comes back:`);
  for (const p of staleBaseline) console.log(`   - ${p.signature}`);
}

if (fails.length) {
  console.log('');
  for (const f of fails) console.log(`  FAIL ${f.rule.padEnd(24)} ${f.file}\n       ${f.detail}`);
  console.log(`\n${fails.length} content failure(s). The page is asserting something it does not know, or a`);
  console.log('review-only state is in an artifact that carries the apex triggers.');
  process.exit(1);
}
console.log(`\nNo placeholder, no fabricated number, no dead path, no unsourced cadence and no new near-duplicate sentence in the built pages.`);
console.log(`Run \`npm run check:content:selftest\` to see that these checks can still fail.`);
