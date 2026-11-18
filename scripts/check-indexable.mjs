#!/usr/bin/env node
// check:indexable — a route that tells a crawler not to index itself is not a route the sitemap lists.
//
// Why (round-7 communication review, 2026-11-18, and D404 before it): D404 ruled `/past` noindexed while
// its shelf is empty — the letter's words, "Unlink until there are three completed meetings; `noindex`
// the route meanwhile" — and the meta tag landed. The sitemap did not follow: `grep -c past
// dist/client/sitemap-0.xml` printed **1** while `dist/client/past/index.html` carried
// `<meta name="robots" content="noindex,nofollow">`. One page, two machines, two answers, and no gate in
// the set could see the pair: `check:site-host` compares the *host* of every `<loc>` and of canonical/og
// tags (a sitemap on the retired apex), `check:content` reads claims in pages, `check:page-exit` reads the
// links a page paints. This gate reads the two halves of one claim about the same route, which is the
// class D245 names — an artifact whose parts disagree while every gate reading those parts stays green.
//
//   node scripts/check-indexable.mjs            the gate (in `verify`; needs dist/)
//   node scripts/check-indexable.mjs --selftest plant each defect, require each to fail
//   node scripts/check-indexable.mjs --show     the two halves the gate read, for a report
//
// The rule: `src/lib/index-rules.mjs`'s `NOINDEX_ROUTES` is the one home for "a crawler must not file this
// route"; the page proves it obeys with its meta tag, and the sitemap proves it obeys by not naming it.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const DIST = 'dist/client';
const RULES = 'src/lib/index-rules.mjs';

/** A route the build emits, in the spelling the sitemap uses: `/dates` is `https://site/dates/`. */
/** One spelling for both halves of the claim: the sitemap's `<loc>` is an absolute URL and a built page
 *  is a path under `dist/client`, and a gate that compares two spellings of one route is a gate that
 *  disagrees with itself. `/dates/`, `https://site/dates/` and `dates/index.html` all say `/dates`. */
const routeOfHref = (href) => {
  let path = String(href);
  const m = path.match(/^https?:\/\/[^/]+(\/.*)?$/);
  if (m) path = m?.[1] ?? '/';
  else if (path.endsWith('.html')) path = path.replace(/(?:^|\/)index\.html$/, '/').replace(/\.html$/, '');
  if (!path.startsWith('/')) path = '/' + path;
  return path.replace(/\/+$/, '') || '/';
};

// A pure verdict, so the selftest plants defects in the data rather than on disk. Every gate here is
// written this way: the check is a function of the artifact, and the artifact is real only in readBase().
function verdict(base) {
  const fail = [];
  const marked = new Map(base.pages.map((p) => [p.route, p.noindex]));
  const built = new Set(marked.keys());

  for (const loc of base.locs) {
    if (!built.has(loc.route)) continue;
    if (!marked.get(loc.route)) continue;
    fail.push(`${loc.file} lists a <loc> for ${loc.route} while that page prints a noindex meta tag - a crawler is told both. Either drop ${loc.route} from NOINDEX_ROUTES in ${RULES} (the route is meant to be filed) or make the sitemap filter read that list (astro.config.mjs passes sitemap({ filter })).`);
  }

  for (const route of base.forbidden) {
    if (!built.has(route)) {
      fail.push(`${RULES} forbids ${route} but the build does not emit it - a route a page is written for and no page answers is D117's 404. Emit the page, or delete the row from NOINDEX_ROUTES in ${RULES}.`);
      continue;
    }
    if (!marked.get(route)) {
      fail.push(`${RULES} forbids ${route} and the built page carries no noindex meta tag - the list and the page disagree, so the crawler is told one thing and the sitemap another. The page's <Layout> call must pass noindex={forbidsIndexing(route)}.`);
    }
  }

  return fail;
}

function readBase() {
  if (!existsSync(root + RULES)) return null;
  if (!existsSync(root + DIST)) return null;

  // The list, read as text rather than imported: a plain `node script.mjs` cannot import a file under
  // `src/` (Astro's own import rules apply to it), and a copy of the list would be the defect this gate
  // exists to prevent. The pattern `check-ics.mjs` pays over the built bytes, pointed at source instead.
  const rulesText = readFileSync(root + RULES, 'utf8');
  const listMatch = rulesText.match(/NOINDEX_ROUTES\s*=\s*\[([^\]]*)\]/);
  if (!listMatch) return null;
  const forbidden = [...new Set(listMatch[1].split(',').map((s) => s.trim().replace(/^['"`]|['"`]$/g, '')).filter(Boolean))];

  const sitemaps = readdirSync(root + DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f));
  const locs = [];
  for (const f of sitemaps) {
    for (const m of readFileSync(root + DIST + '/' + f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
      locs.push({ file: `dist/client/${f}`, route: routeOfHref(m[1]) });
    }
  }

  const pages = [];
  const walk = (dir, rel) => {
    for (const e of readdirSync(root + DIST + '/' + dir, { withFileTypes: true })) {
      const d = `${dir}/${e.name}`.replace(/^\/+/, '');
      const r = `${rel}/${e.name}`.replace(/^\/+/, '');
      if (e.isDirectory()) walk(d, r);
      else if (e.name.endsWith('.html')) {
        const html = readFileSync(root + DIST + '/' + dir + '/' + e.name, 'utf8');
        const meta = /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i.exec(html);
        pages.push({ file: `dist/client/${dir}/${e.name}`.replace(/\/\//g, '/'), route: routeOfHref(r), noindex: /noindex/i.test(meta?.[1] ?? '') });
      }
    }
  };
  walk('', '');

  return { locs, pages, forbidden };
}

function runGate() {
  const base = readBase();
  if (base === null) {
    console.error(`check:indexable: dist/client or ${RULES} missing - this gate reads the artifact a crawler gets, so run \`npm run build\` first`);
    return 1;
  }
  const fail = verdict(base);
  if (fail.length) {
    console.error(`check:indexable: ${fail.length} problem(s)`);
    for (const f of fail) console.error('  - ' + f);
    return 1;
  }
  const selfForbidding = base.pages.filter((p) => p.noindex).map((p) => p.route);
  console.log(`check:indexable: ok - ${base.forbidden.join(', ') || 'no route'} forbidden, ${selfForbidding.join(', ') || 'no page'} printing noindex, ${base.locs.length} sitemap <loc>(s); the two halves agree.`);
  return 0;
}

// Each planting is a real mutation of the real artifact's data, and the gate must NAME it.
const PLANTINGS = [
  ['a forbidden route is listed by the sitemap beside its own noindex tag', (base) => ({ ...base, locs: [...base.locs, { file: 'dist/client/sitemap-0.xml (planted)', route: base.forbidden[0] }] })],
  ['a forbidden route keeps its row but its page lost the meta tag', (base) => ({ ...base, pages: base.pages.map((p) => p.route === base.forbidden[0] ? { ...p, noindex: false } : p) })],
  ['a forbidden route is in the list and the build never emits the page', (base) => ({ ...base, pages: base.pages.filter((p) => p.route !== base.forbidden[0]) })],
];

function runSelftest() {
  const base = readBase();
  if (base === null) {
    console.error(`check:indexable:selftest: dist/client or ${RULES} missing - the selftest needs the real artifact as its control`);
    return 1;
  }
  if (verdict(base).length) {
    console.error(`check:indexable:selftest: the real artifact already fails the gate - fix it before trusting the selftest`);
    return 1;
  }
  let caught = 0;
  for (const [label, mutate] of PLANTINGS) {
    const fail = verdict(mutate(base));
    if (fail.length) {
      caught++;
      console.log(`  caught: ${label} -> ${fail[0]}`);
    } else {
      console.error(`  NOT caught: ${label}`);
    }
  }
  if (caught !== PLANTINGS.length) {
    console.error(`check:indexable:selftest: ${caught}/${PLANTINGS.length} plantings caught - the gate is blind to ${PLANTINGS.length - caught} defect classes.`);
    return 1;
  }
  console.log(`check:indexable:selftest: ok - ${caught} plantings caught, control clean (an indexable page, a forbidden-and-marked page, and a sitemap that names only the indexable ones).`);
  return 0;
}

if (process.argv.includes('--selftest')) process.exit(runSelftest());
if (process.argv.includes('--show')) {
  const base = readBase();
  if (base === null) {
    console.error(`check:indexable: dist/client or ${RULES} missing - set nothing; run \`npm run build\` first`);
    process.exit(1);
  }
  console.log(JSON.stringify(base, null, 2));
  process.exit(0);
}
process.exit(runGate());
