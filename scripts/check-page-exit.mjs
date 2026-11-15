#!/usr/bin/env node
// check:page-exit — every page the build emits ends with the site's exit band.
//
//   npm run check:page-exit            # over the built dist/client
//   npm run check:page-exit:selftest   # plant each defect, require each to FAIL, with a clean control
//
// Two rules, both about what a page the build emits must carry:
//   exit-band-missing     a route that ends with no <footer> at all
//   exit-band-ground      a footer that is not on the ratified ink ground with band-text text
//   exit-band-no-paths    a band with fewer than two links out
//   page-no-home-path     a page whose served HTML never links to "/" (S043, round-3 read §1 criterion 1)
//
// Why this gate exists (2026-11-14): DESIGN.md's colour rounds ruled "at most one dark band per screen, and the
// band is the site's EXIT" (D115), and `check:render` enforces that rule for a page that HAS a band — it never
// asked whether a page has one at all. So `/`, `/schedule` and `/404` carried the band while `/chat` and `/join`
// ended on their last paragraph: a visitor who lands on those pages from a shared link has the nav above and
// nothing below, and the paths the club wants them to take (schedule, join, chat, Meetup, Discord) live on
// surfaces they may never reach. That is not a design rule a gate can see, because no gate looked at the bottom
// of every route. This gate walks the routes the artifact actually emits (design/emitted-routes.mjs, not a
// remembered list, D117's lesson) and requires the band.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { emittedRoutes } from '../design/emitted-routes.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return resolve(i < 0 ? 'dist/client' : args[i + 1]);
})();

/** The band as ratified: ground `ink`, text `band-text` (DESIGN.md "Layout rules that came out of the colour
 *  rounds"). A footer on some other ground is a second dark region or a band the contrast oracle never checked.
 *  Order of the two classes is not assumed, and either quote style is accepted, because the rule is the pair of
 *  tokens, not the string. */
const OPEN_TAG = /<footer\b[^>]*>/;
const BAND_ANY = /<footer\b[\s\S]*?<\/footer>/;
const isRatifiedBand = (tag) => /\bbg-ink\b/.test(tag) && /\btext-band-text\b/.test(tag);
const PATHS_IN = (band) => [...band.matchAll(/<a\b[^>]*href=["']([^"']+)["']/g)];
// `href="/"` in any form: bare, trailing slash, or with a fragment. The round-3 read (§1, criterion 1) asked
// for proof that every page links home, and the way to make that proof permanent is a gate, not a curl.
const HOME_LINK = /<a\b[^>]*href=["']\/(?:#[^"']*)?["']/;

/** Pure verdict over `[{route, html}]` so the selftest can plant pages without a build or a disk. */
export const pageExitFindings = (pages) => {
  const fails = [];
  for (const { route, html } of pages) {
    const band = BAND_ANY.exec(html);
    if (!band) {
      fails.push({
        rule: 'exit-band-missing',
        detail: `${route} ends with no footer at all. Every page the build emits closes with the exit band (D115): add <Footer /> from src/components/Footer.astro, or say in DESIGN.md why this route is the exception.`,
      });
      continue;
    }
    if (!isRatifiedBand(OPEN_TAG.exec(band[0])[0])) {
      fails.push({
        rule: 'exit-band-ground',
        detail: `${route} has a footer, but not on the ratified band ground: DESIGN.md's band is the ink ground with band-text text. The band\u2019s contrast pair, its path hues and its focus ring are all asserted for that ground; a footer on another ground is unmeasured.`,
      });
      continue;
    }
    const paths = PATHS_IN(band[0]);
    if (paths.length < 2) {
      fails.push({
        rule: 'exit-band-no-paths',
        detail: `${route}'s band offers ${paths.length} path(s) out. D115: the band is the site's exit, so it must offer the paths — the band that used to sit here was a sentence with zero links and a pulsing glyph.`,
      });
    }
    // (S043, round-3 read §1 criterion 1) A page the build emits must link to `/` somewhere in the served HTML,
    // in the JS-off branch, before any island runs. The nav's wordmark and the band's identity line are the two
    // paths home; if either is ever deleted the page becomes a dead end for a reader with JavaScript off, and
    // nothing else in the set would notice.
    if (!HOME_LINK.test(html)) {
      fails.push({
        rule: 'page-no-home-path',
        detail: `${route} serves no link to the site root at all. The nav's wordmark or the band's identity line must carry a plain "/" href: a page with no path home is a dead end for a reader whose scripts never run.`,
      });
    }
  }
  return fails;
};

if (selftest) {
  const band = (links) => `<footer class="bg-ink text-band-text">${links.map((l) => `<a href="${l}">${l}</a>`).join('')}</footer>`;
  const bandOn = (ground, links) => `<footer class="${ground}">${links.map((l) => `<a href="${l}">${l}</a>`).join('')}</footer>`;
  const page = (body) => `<html><body>${body}</body></html>`;
  const cases = [
    { name: 'clean control: a page that closes with the band', pages: [{ route: '/chat', html: page(`<main><a href="/">home</a></main>${band(['/schedule', '/join'])}`) }], want: [] },
    { name: 'clean control: the nav wordmark is the path home', pages: [{ route: '/chat', html: page(`<nav><a href="/" aria-label="Matheapolis, home">Matheapolis</a></nav>${band(['/schedule', '/join'])}`) }], want: [] },
    { name: 'a page that ends on its last paragraph', pages: [{ route: '/chat', html: page('<main>hi</main>') }], want: ['exit-band-missing'] },
    { name: 'a footer on a ground the oracle never checked', pages: [{ route: '/chat', html: page(bandOn('bg-paper text-ink', ['/schedule', '/join'])) }], want: ['exit-band-ground'] },
    { name: 'a band with the two classes swapped', pages: [{ route: '/chat', html: page(`<nav><a href="/">Matheapolis</a></nav>${bandOn('text-band-text bg-ink', ['/schedule', '/join'])}`) }], want: [] },
    { name: 'a band with nothing to press', pages: [{ route: '/chat', html: page('<footer class="bg-ink text-band-text"><p>Matheapolis</p></footer>') }], want: ['exit-band-no-paths', 'page-no-home-path'] },
    { name: 'a band with one path', pages: [{ route: '/chat', html: page(band(['/schedule'])) }], want: ['exit-band-no-paths', 'page-no-home-path'] },
    { name: 'a band with paths but no way home', pages: [{ route: '/schedule', html: page(`<main>dates</main>${band(['/chat', 'https://discord.com/invite/x'])}`) }], want: ['page-no-home-path'] },
    { name: 'a page whose only internal link is to itself', pages: [{ route: '/join', html: page(`<main><a href="/join">Ways in</a></main>${band(['/schedule', '/chat'])}`) }], want: ['page-no-home-path'] },
    { name: 'clean control: the band may carry external paths too', pages: [{ route: '/', html: page(`<nav><a href="/">Matheapolis</a></nav>${band(['/schedule', 'https://www.meetup.com/x', 'https://discord.com/invite/y'])}`) }], want: [] },
    { name: 'clean control: the bare wordmark link counts as home', pages: [{ route: '/404', html: page(`<header><a href="/" aria-label="Matheapolis, home">Matheapolis</a></header>${band(['/schedule', '/chat'])}`) }], want: [] },
  ];
  let bad = 0;
  for (const c of cases) {
    const got = pageExitFindings(c.pages).map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(52)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
  }
  console.log(`\ncheck:page-exit selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ the real run

// A route is a file, and the two shapes are not the same: `/chat` is `chat/index.html`, `/` is
// `index.html`, `/404` is `404.html` (the same rule `scripts/check-content.mjs` states and
// `design/emitted-routes.mjs` reads off). Guessing one of them makes the gate crash with ENOENT on the
// one page that most needs the band.
const pageFile = (route) => {
  if (route === '/') return resolve(DIST, 'index.html');
  const bare = route.replace(/^\//, '');
  const asDir = resolve(DIST, `${bare}/index.html`);
  return existsSync(asDir) ? asDir : resolve(DIST, `${bare}.html`);
};

if (!existsSync(DIST)) {
  console.error(`check:page-exit: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
  process.exit(1);
}
const pages = emittedRoutes(DIST).map((route) => ({
  route,
  html: readFileSync(pageFile(route), 'utf8'),
}));
const fails = pageExitFindings(pages);
const withBand = pages.filter((p) => BAND_ANY.test(p.html)).map((p) => p.route);
console.log(`check:page-exit — ${pages.length} built page(s), ${withBand.length} closing with the exit band (${withBand.join(', ')})`);
for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
console.log(fails.length ? `\n${fails.length} finding(s).` : '\nEvery emitted page ends with the band that carries the paths out.');
process.exit(fails.length ? 1 : 0);
