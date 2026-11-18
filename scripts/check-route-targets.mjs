#!/usr/bin/env node
// check:route-targets — every internal route a built page paints is a route the build emits.
//
//   npm run check:route-targets            # over the built dist/client
//   npm run check:route-targets:selftest   # plant each dead-route class, require each to FAIL
//
// The rule this detector enforces is DESIGN.md's bullet "An internal route is a route the build
// emits" (MS35, S068 — GAP-ANALYSIS §2 rank 1, `govuk/loading-empty-error.md#G15-state-07` and
// `govuk/navigation-wayfinding.md#G13-nav-12`: every address in a service is for a page that exists,
// and "Test all links and buttons to make sure they work"). The rule is written before the gate
// demands it, in that bullet, so this file cites it rather than restating it.
//
// Why this gate exists (2026-11-18, MS35): the corpus's rank 1 gap. Nothing in the 71-step set read
// an internal `href` at all — `check:ext-links` reads the anchors that LEAVE, `check:site-host` reads
// hosts, `check:indexable` reads which routes may be listed. So a page that cited `/schedule` — the
// name the site used until D373 renamed the route to `/dates` — stayed green, and the way out a
// visitor pressed answered a wall. `src/components/Schedule.astro:67` still carries the sentence
// "`/events.ics` existed, `/schedule` did not": the repo has already been paid this defect once.
//
// What it enforces:
//   FAIL  route-dead      — an <a href="/p"> whose path no file in dist/client answers
//   FAIL  route-alias     — the same page named by a second URL: a trailing slash, or a `.html`/`index.html`
//                           suffix written into an href. Both paint, both are a second address a crawler
//                           will treat as a duplicate, and `check:site-host` compares only hosts
//   FAIL  anchor-dead     — an <a href="/p#f"> whose `f` is not an id on the page the anchor LANDS on
//                           (`/chat#threads` from the home page is fine; a gate that looked on the page
//                           CARRYING the anchor would call it dead)
//   INFO  the route census — every internal href, its count, and what answered it, so a reviewer sees
//                           the map before fixing it
//
// Deliberately NOT enforced: that a page link anything it has a name for, or that outbound hrefs
// resolve (that is `check:ext-links`), or that a page links at all. And the `/404` page's own anchors:
// the build emits `404.html` precisely to answer paths that do not exist, so a dead path cited there
// is the page's job, not a defect. It is printed as exempt rather than skipped silently.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emittedRoutes } from '../design/emitted-routes.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return i < 0 ? resolve('dist/client') : args[i + 1];
})();

/** Compiled island code lives in <script> blocks and in `_astro/*.js`; neither is markup. A class
 *  string inside a component's compiled output would read as a painted element and report a defect
 *  the visitor never sees (measured 2026-11-18: `dist/client/_astro/DiscordSummary.*.js` carries the
 *  notice handles three times, and `dist/client/chat/index.html` carries one inside a <script>). */
const markup = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');

/** An internal href, canonicalised: no leading slash in the key, no trailing slash, no `.html`. */
const ANCHOR = /<a\b[^>]*?href=(["'])((?:\/[^"']*|#[^"']*))[\"'][^>]*/g;
const canonical = (path) => {
  if (path === '/' || path === '') return '';
  return path.replace(/\/+$/, '').replace(/\/index\.html$/, '').replace(/\.html$/, '');
};

/** Every path the build answers, as '' for the root and '/x' for each emitted page and file. */
const emittedPaths = (distDir) => {
  const files = existsSync(distDir)
    ? readdirSync(distDir, { recursive: true }).map(String).filter((f) => !f.endsWith('.html'))
    : [];
  const asFiles = files.map((f) => `/${f.replace(/\\/g, '/')}`);
  const routes = emittedRoutes(distDir);
  return new Set([...routes, ...asFiles].map((p) => canonical(p)));
};

/** Pure verdict over `{route, html}` pages plus the emitted path set, so the selftest can plant
 *  dead routes in memory with no build and no disk (D118: the defect is caught on the branch that
 *  wrote it, not on whichever branch happens to be built). */
export const internalAnchors = (html) => [...markup(html).matchAll(ANCHOR)].map((m) => m[2]);
export const routeFindings = ({ pages, emitted }) => {
  const fails = [];
  const pageOf = new Map(pages.map((p) => [canonical(p.route), p.html]));
  for (const page of pages) {
    const exempt = canonical(page.route) === '/404';
    for (const m of markup(page.html).matchAll(ANCHOR)) {
      const href = m[2];
      const [path, ...fragments] = href.split('#');
      const frag = fragments.join('#');
      if (exempt) continue;
      if (path === '' ) {
        // an in-page anchor: its target is the page carrying it.
        if (frag && !new RegExp(`\\b(id|name)="${frag}"`).test(page.html)) {
          fails.push({ rule: 'anchor-dead', detail: `${page.route} anchors "#${frag}" and no id="${frag}" exists on ${page.route} — the reader jumps to the top of the same page` });
        }
        continue;
      }
      const key = canonical(path);
      const aliased = path !== key && key !== '';
      if (aliased) {
        fails.push({ rule: 'route-alias', detail: `${page.route} writes href="${href}" — the route is ${key}; a trailing slash, an index.html suffix or an .html suffix is a second address for one page, and every canonical tag in the artifact names the one without it` });
      }
      if (!emitted.has(key)) {
        fails.push({ rule: 'route-dead', detail: `${page.route} links href="${path}" and the build emits no ${key}: no ${key}/index.html, no ${key}.html, no ${key} file. The way out a visitor presses answers a wall` });
        continue;
      }
      if (!frag) continue;
      const target = pageOf.get(key) ?? '';
      if (!new RegExp(`\\bid="${frag}"`).test(target)) {
        fails.push({ rule: 'anchor-dead', detail: `${page.route} links "${path}#${frag}" and ${key} has no id="${frag}" — the anchor moved off its page, so the reader lands on the page and hunts for what the sentence promised` });
      }
    }
  }
  return fails;
};

// ------------------------------------------------------------------ the selftest

const runSelftest = () => {
  const shippedRoutes = new Set(['/', '/404', '/chat', '/dates', '/join', '/past', '/events.ics']);
  const emitted = new Set([...shippedRoutes, '/favicon.svg', '/_astro/Footer.CIGlQK5A.css'].map(canonical));
  const cases = [
    {
      name: 'clean control: the shipped map (every internal href answers)',
      pages: [
        { route: '/', html: '<a href="/">Home</a><a href="/chat">Chat</a><a href="/chat#threads">Threads</a><a href="/dates">Dates</a><a href="/join">Ways in</a><a href="/events.ics">Add to a calendar</a><a href="https://www.meetup.com/minneapolis-mathematics-book-club">Meetup</a>' },
        { route: '/chat', html: '<h2 id="threads">What the club is pulling on</h2>' },
      ],
      want: [],
    },
    {
      name: 'a citation of a route the build stopped emitting',
      pages: [{ route: '/dates', html: '<a href="/schedule">the schedule</a>' }],
      want: ['route-dead'],
    },
    {
      name: 'a route written with a trailing slash',
      pages: [{ route: '/', html: '<a href="/chat/">Chat</a>' }],
      want: ['route-alias'],
    },
    {
      name: 'a route written as its index.html file',
      pages: [{ route: '/', html: '<a href="/chat/index.html">Chat</a>' }],
      want: ['route-alias'],
    },
    {
      name: 'an anchor moved off the page it names',
      pages: [
        { route: '/', html: '<a href="/chat#threads">Threads</a>' },
        { route: '/chat', html: '<h2 id="summaries">Summaries</h2>' },
      ],
      want: ['anchor-dead'],
    },
    {
      name: 'an in-page anchor whose id is not on the page',
      pages: [{ route: '/join', html: '<a href="#ways-in">Ways in</a><h2>Ways in</h2>' }],
      want: ['anchor-dead'],
    },
    {
      name: 'a dead route on the 404 page (exempt: it answers paths that do not exist)',
      pages: [{ route: '/404', html: '<a href="/schedule">Schedule</a>' }],
      want: [],
    },
    {
      name: 'clean control: an outbound href is not an internal route',
      pages: [{ route: '/', html: '<a href="https://discord.com/invite/x" rel="noopener noreferrer">Discord</a>' }],
      want: [],
    },
    {
      name: 'clean control: an emitted file that is not an .html page',
      pages: [{ route: '/dates', html: '<a href="/events.ics">Add to a calendar</a>' }],
      want: [],
    },
    {
      name: 'clean control: a <link> to an asset is not an anchor',
      pages: [{ route: '/', html: '<link rel="icon" href="/favicon.svg"><a href="/">Home</a>' }],
      want: [],
    },
    {
      name: 'clean control: a class string inside compiled island code is not markup',
      pages: [{ route: '/chat', html: '<script>const s = \'<a href="/schedule">x</a>\';</script><a href="/chat">Chat</a>' }],
      want: [],
    },
  ];
  let bad = 0;
  for (const c of cases) {
    const found = routeFindings({ pages: c.pages, emitted });
    const got = found.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(64)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
    if (!ok) for (const f of found) console.log(`        ${f.rule}: ${f.detail}`);
  }
  console.log(`\ncheck:route-targets selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
};

const runReal = () => {
  if (!existsSync(DIST)) {
    console.error(`check:route-targets: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
    process.exit(1);
  }
  const pageFile = (route) => {
    if (route === '/') return resolve(DIST, 'index.html');
    const bare = route.replace(/^\//, '');
    const asDir = resolve(DIST, `${bare}/index.html`);
    return existsSync(asDir) ? asDir : resolve(DIST, `${bare}.html`);
  };
  const routes = emittedRoutes(DIST);
  const pages = routes.map((route) => ({ route, html: readFileSync(pageFile(route), 'utf8') }));
  const emitted = emittedPaths(DIST);
  const counts = new Map();
  for (const page of pages) {
    for (const m of markup(page.html).matchAll(ANCHOR)) counts.set(m[2], (counts.get(m[2]) ?? 0) + 1);
  }
  console.log(`routes(${routes.length}) = ${routes.join(' ')}`);
  console.log(`emitted paths(dist) = ${emitted.size} (pages + files: ${[...emitted].filter((p) => p && !routes.includes(p)).join(' ')})`);
  console.log('internal hrefs: ' + [...counts].map(([h, n]) => `${h} x${n}`).join(' | '));
  const fails = routeFindings({ pages, emitted });
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  console.log(fails.length
    ? `\n${fails.length} finding(s) across ${pages.length} page(s).`
    : `\n${pages.length} page(s), ${counts.size} distinct internal hrefs, every one answered by the build; the 404 page's own anchors are exempt by rule.`);
  process.exit(fails.length ? 1 : 0);
};

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) (selftest ? runSelftest : runReal)();
