#!/usr/bin/env node
// check:notice-announcement — a painted notice is announced.
//
//   npm run check:notice-announcement             # over the built dist/client
//   npm run check:notice-announcement:selftest     # plant a silent notice, require each to FAIL
//
//   (and its selftest alias `npm run check:notice-announcement:selftest`)
//
// The rule this detector enforces is DESIGN.md's bullet "**A painted notice is announced** (MS35, S068)":
// the handle that paints the box — `inset-shadow-rule rounded-control` at the FRONT of a block's class list
// — must also say what the box is to a reader who cannot see it: a live region (`role="status"` or `aria-live`),
// an assertive region (`role="alert"`), or its own title as its first content (an `<h*>`) when the state is
// there at load and reading order carries it. The rule is written in DESIGN.md before this gate demands it, so
// this file cites it rather than restating it.
//
// Why this gate exists (2026-11-18, MS35): the pairing existed only backwards. `check:render` styles the notice
// **from** the role — it reads `role="status"`/`role="alert"` to find the box — so a notice painted WITHOUT the
// role is invisible to it, and `grep -rn 'inset-shadow-rule' scripts` returned **0 lines**: no gate, probe or
// harness in this repo had ever looked at the handle. A notice is a STATE the page may change into after load —
// an empty calendar, a summary set that has not settled, a failed fetch — which is precisely the kind of change
// a reader who cannot see the screen has to be told about. Silent means the box appears and nothing says so.
//
// What it enforces:
//   FAIL  notice-silent — an element carrying the notice handle with no region in its open tag AND no `<h*>`
//                          as its first content, named with the page, the handle's class list and the words
//                          it paints first.
//   INFO  the notice census — per built page: every handle found, and how each is announced.
//
// The exemption, written out loud rather than implied: a notice MAY announce itself by its own first `<h*>`.
// That half is what keeps `src/components/DiscordSummary.svelte:165` (the `empty` state, an `<h2>` and no
// region) legal. The strict form — a region on every handle — would demand editing that component, which is
// outside this item's boundary; whether the `empty` state should take a live region anyway is an operator
// question, escalated rather than worked around here.
//
// Deliberately NOT enforced, and the limits of what this gate can see:
//  — The handle must be at the FRONT of the class list. Controls write `rounded-control … inset-shadow-rule`
//     in the other order and rows/headers carry `inset-shadow-rule` mid-list; neither is a notice, and an
//     anchored match is what keeps 8 controls and every schedule row from firing.
//  — That the notice's state be PAINTED. This gate reads the artifact, so a state that ships unrendered today
//     (the `empty` and `failed` Discord branches) is not in the artifact and cannot be checked until it renders.
//     That is the honest cost of artifact-side scheduling (D118's table: `dist/` ⇒ DEPLOY with `needs:
//     ['build']`); the src-side counterpart would parse Svelte's computed attributes, which is a bigger
//     instrument than this row is worth.
//  — What the region is set to (`aria-live="off"` is not polite), that a notice contain one boundary
//     (`check:render`'s job, it reads the painted boxes), or a cap on notices per page.
//  — Compiled island code: `dist/client/_astro/DiscordSummary.*.js` carries the handle strings three times,
//     and `chat/index.html` carries one inside a <script>. That is a component's compiled output, not markup.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emittedRoutes } from '../design/emitted-routes.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return i < 0 ? resolve('dist/client') : args[i + 1];
})();

const markup = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
const visible = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

/** The notice handle, anchored: `inset-shadow-rule rounded-control` opening the class list. Attribute order
 *  varies in the artifact — `Schedule.astro:363` and `past.astro:110` write `role="status"` BEFORE the class,
 *  `DiscordSummary.svelte:144` writes it after — so the attrs before `class=` are swallowed, not assumed. */
const NOTICE = /<([a-z][a-z0-9-]*)\b([^>]*class="inset-shadow-rule rounded-control[^"]*"[^>]*)>/g;
const REGION = /\brole=(["'])(status|alert)\1|\baria-live=(["'])[^"']*\3/;

/** The first content of a notice: whitespace, HTML comments and the component's own blank lines skipped.
 *  A title that arrives after a sentence is not "its own first content" — reading order is what announces. */
const firstTag = (html) => {
  const rest = html.replace(/^[\s]*((<!--[\s\S]*?-->)[\s]*)*/g, '');
  const m = rest.match(/^<([a-z][a-z0-9-]*)\b/i);
  return m ? m[1] : '';
};

/** Pure verdict over `[{route, html}]` so the selftest plants a deleted role and a notice whose prose comes
 *  before its title, in memory: no build, no disk (D118). */
export const noticeFindings = (pages) => {
  const fails = [];
  for (const p of pages) {
    const html = markup(p.html);
    for (const m of html.matchAll(NOTICE)) {
      const attrs = m[2];
      const inner = innerOf(html, m.index + m[0].length, m[1]);
      const announcedByRegion = REGION.test(attrs);
      const announcedByTitle = firstTag(inner) === 'h1' || firstTag(inner) === 'h2'
        || firstTag(inner) === 'h3' || firstTag(inner) === 'h4' || firstTag(inner) === 'h5'
        || firstTag(inner) === 'h6';
      if (announcedByRegion || announcedByTitle) continue;
      fails.push({ rule: 'notice-silent', detail: `${p.route} paints a notice (${m[1]} class="inset-shadow-rule rounded-control…") with no role="status", no role="alert", no aria-live in its open tag, and its first content is a ${firstTag(inner) || 'text node'} rather than a heading: "${visible(inner).slice(0, 70) || 'no words'}". The box appears on screen and a reader who cannot see it is never told — DESIGN.md "A painted notice is announced": take a live region for a state the page may change into, an alert for a failure, or put the title first.` });
    }
  }
  return fails;
};

/** Inside one notice, with the same tag's nesting counted: a notice contains paragraphs, a label and an
 *  inline link, and the first of those decides whether a heading announces the block. */
function innerOf(html, from, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  re.lastIndex = from;
  let depth = 1;
  let end = html.length;
  for (;;) {
    const m = re.exec(html);
    if (!m) break;
    if (m[1] === '/') {
      if (--depth === 0) { end = m.index; break; }
    } else depth++;
  }
  return html.slice(from, end);
}

/** The census the run prints: per page, every handle and how it is announced. */
export const noticeCensus = (pages) => pages.flatMap((p) => {
  const html = markup(p.html);
  return [...html.matchAll(NOTICE)].map((m) => {
    const inner = innerOf(html, m.index + m[0].length, m[1]);
    const attrs = m[2];
    return {
      route: p.route,
      tag: m[1],
      region: REGION.test(attrs) ? (attrs.match(/\brole=(["'])(status|alert)\1/)?.[2] ?? 'aria-live') : '',
      title: /^<h[1-6]\b/.test(firstContent(inner)) ? firstContent(inner).match(/^<(h[1-6])\b[^>]*>([^<]*)/)?.[2]?.trim() ?? '' : '',
    };
  });
});

const firstContent = (html) => html.replace(/^[\s]*(<!--[\s\S]*?-->[\s]*)*/, '');

// ------------------------------------------------------------------ the selftest

/** Three shipped notices, lifted off the artifact with class lists elided: the pending Discord island
 *  (a live region AND a title), the `/past` empty-calendar notice (a region, prose first — the case that
 *  proves the region half), and the `failed` island (an alert, prose first). */
const CHAT_NOTICE = `<div class="inset-shadow-rule rounded-control px-4 py-3 min-h-20 flex flex-col justify-center gap-1" role="status" aria-live="polite"><h2 class="text-lede">No summary written this week</h2><p class="text-body">The channel is the live thing.</p></div>`;
const PAST_NOTICE = `<div role="status" class="inset-shadow-rule rounded-control px-4 py-6"><p class="text-label font-medium text-ink-3">Nothing listed yet</p><h2 class="text-lede">No finished date on our calendar</h2></div>`;
const FAILED_NOTICE = `<div class="inset-shadow-rule rounded-control px-4 py-3 min-h-20" role="alert"><p class="text-body">The channel summaries did not load.</p></div>`;
/** The `empty` state as it ships in src: no region, and its title first — the exemption, proven. */
const EMPTY_NOTICE = `<div class="inset-shadow-rule rounded-control px-4 py-3 min-h-20"><h2 class="text-lede">No channel summaries on file</h2><p class="text-body">There are none on file.</p></div>`;
/** Not notices: a secondary control writes `rounded-control` first and `inset-shadow-rule` mid-list; a
 *  schedule row and a section header carry `inset-shadow-rule` mid-list; a hero plate carries neither. */
const NOT_NOTICES = `<a href="/join" data-control="secondary" class="inline-flex items-center px-8 py-4 rounded-control text-ink bg-paper inset-shadow-rule hover:bg-tint">Join the club</a><div class="grid items-start gap-x-3 md:grid py-1 text-body leading-prose text-ink-2 inset-shadow-rule rounded-card">a dated row</div><h2 class="text-lede inset-shadow-rule">A header with a hairline</h2>`;

const runSelftest = () => {
  const cases = [
    {
      name: 'clean control: the shipped pending notice (region AND title)',
      pages: [{ route: '/chat', html: CHAT_NOTICE }],
      want: [],
    },
    {
      name: 'clean control: the shipped /past notice (region, prose before the title)',
      pages: [{ route: '/past', html: PAST_NOTICE }],
      want: [],
    },
    {
      name: 'clean control: an assertive notice (role="alert", prose first)',
      pages: [{ route: '/chat', html: FAILED_NOTICE }],
      want: [],
    },
    {
      name: 'clean control: the empty state announces itself by its own first <h2> (the exemption)',
      pages: [{ route: '/chat', html: EMPTY_NOTICE }],
      want: [],
    },
    {
      name: 'clean control: controls, rows and headers carry the inset handle in the other order and mid-list',
      pages: [{ route: '/join', html: NOT_NOTICES }],
      want: [],
    },
    {
      name: 'the shipped /past notice with its role attribute deleted and its prose still first',
      pages: [{ route: '/past', html: PAST_NOTICE.replace(' role="status"', '') }],
      want: ['notice-silent'],
    },
    {
      name: 'the empty state with its region removed AND a sentence before its title',
      pages: [{ route: '/chat', html: EMPTY_NOTICE.replace('<h2 class="text-lede">No channel summaries on file</h2><p class="text-body">There are none on file.</p>', '<p class="text-body">There are none on file.</p><h2 class="text-lede">No channel summaries on file</h2>') }],
      want: ['notice-silent'],
    },
    {
      name: 'clean control: the handle inside compiled island code in a <script> is not markup',
      pages: [{ route: '/chat', html: `<script>var s = '<div class="inset-shadow-rule rounded-control px-4 py-3">compiled</div>'; var t = '<div class="inset-shadow-rule rounded-control px-4 py-3">twice</div>';</script>${CHAT_NOTICE}` }],
      want: [],
    },
  ];

  let bad = 0;
  for (const c of cases) {
    const found = noticeFindings(c.pages);
    const got = found.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(88)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
    if (!ok) for (const f of found) console.log(`        ${f.rule}: ${f.detail}`);
  }
  console.log(`\ncheck:notice-announcement selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
};

// ------------------------------------------------------------------ the run

const runReal = () => {
  if (!existsSync(DIST)) {
    console.error(`check:notice-announcement: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
    process.exit(1);
  }
  const routes = emittedRoutes(DIST);
  const pages = routes.map((route) => {
    const asDir = resolve(DIST, `${route.replace(/^\//, '')}/index.html`);
    const file = route === '/' ? resolve(DIST, 'index.html')
      : existsSync(asDir) ? asDir : resolve(DIST, `${route.replace(/^\//, '')}.html`);
    return { route, html: readFileSync(file, 'utf8') };
  });
  const census = noticeCensus(pages);
  console.log(`built pages: ${pages.length}; notice handles painted: ${census.length} (${census.map((n) => `${n.route} ${n.region || 'title'}${n.title ? ` "${n.title}"` : ''}`).join('  |  ')})`);
  console.log(`unannounced handles: ${census.filter((n) => !n.region).length}; announced by region: ${census.filter((n) => n.region).length}; by their own title: ${census.filter((n) => n.title).length}`);
  const fails = noticeFindings(pages);
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  console.log(fails.length
    ? `\n${fails.length} finding(s) across ${census.length} painted notice(s).`
    : `\n${census.length} painted notice(s), every one announced by a region or by its own first heading; controls, rows and headers that carry the inset handle in another order did not fire, and compiled island code was skipped.`);
  process.exit(fails.length ? 1 : 0);
};

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) (selftest ? runSelftest : runReal)();
