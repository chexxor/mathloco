#!/usr/bin/env node
// check-site-host.mjs - one host, everywhere the shipped artifact names one.
//
//   npm run check:site-host          # the gate (in `verify`); needs dist/
//   npm run check:site-host --print  # the table it checked, for a report
//
// Why this exists, measured rather than felt (2026-11-09): `public/robots.txt` carried
// `Sitemap: https://minneapolismathbookclub.com/sitemap-index.xml` while `astro.config.mjs`'s `site` and
// `src/config.json`'s `seo.canonical` both said `matheapolis.com`, and `dist/client/sitemap-0.xml`'s <loc>
// entries were correct. Three files, one fact, two answers - and no existing gate reads a shipped host:
// `check:deploy` counts triggers, `check:copy` couples the descriptor, `check:content` reads claims. The one
// place a stale host is worst is precisely a rebrand: a canonical or a robots pointer at the apex being retired
// tells a crawler the old name is the site, and a 301 afterwards cannot undo it (D241's warning about a stale
// `site:`).
//
// The rule: every host the artifact asserts about ITSELF must be the one host. Links out to Meetup, Discord
// and Mobilizon are not self-assertions and are not checked here.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/client';
const fails = [];
const rows = [];

const hostOf = (url) => {
  const m = String(url).match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].toLowerCase() : null;
};

// 1. the config's own claim
const astroConfig = readFileSync('astro.config.mjs', 'utf8');
const siteMatch = astroConfig.match(/site:\s*['"]([^'"]+)['"]/);
if (!siteMatch) { console.log('FAIL  astro.config.mjs has no `site:` - @astrojs/sitemap cannot emit locs'); process.exit(1); }
const canonical = siteMatch[1].replace(/\/$/, '');
const canonicalHost = hostOf(canonical);
rows.push(['astro.config.mjs site', canonical]);

const config = JSON.parse(readFileSync('src/config.json', 'utf8'));
if (config.seo?.canonical) {
  rows.push(['src/config.json seo.canonical', config.seo.canonical]);
  if (config.seo.canonical.replace(/\/$/, '') !== canonical)
    fails.push(`seo.canonical (${config.seo.canonical}) != astro.config site (${canonical}) - the two are documented as one fact`);
}

if (!existsSync(DIST)) { console.log('FAIL  no dist/ - run `npm run build` (this gate reads the artifact a visitor gets)'); process.exit(1); }

// 2. robots.txt, the file a crawler reads first
const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
for (const line of robots.split('\n')) {
  const m = line.match(/^Sitemap:\s*(\S+)/i);
  if (!m) continue;
  rows.push(['dist/client/robots.txt Sitemap', m[1]]);
  if (hostOf(m[1]) !== canonicalHost)
    fails.push(`robots.txt advertises a sitemap on ${hostOf(m[1])}, not ${canonicalHost} - a crawler is told the site lives on a host this repo is retiring`);
}

// 3. the sitemap itself
const sitemaps = readdirSync(DIST).filter((f) => /^sitemap.*\.xml$/.test(f));
let locs = 0;
for (const f of sitemaps) {
  for (const m of readFileSync(join(DIST, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    locs++;
    if (hostOf(m[1]) !== canonicalHost) fails.push(`${f} lists ${m[1]} on a host that is not the canonical one`);
  }
}
rows.push([`sitemap <loc> entries (${locs})`, canonicalHost]);

// 4. the metadata a link unfurl reads
const htmls = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmls.push(p);
  }
};
walk(DIST);
for (const f of htmls) {
  const html = readFileSync(f, 'utf8');
  const pairs = [
    ['rel="canonical"', html.match(/rel="canonical"\s+href="([^"]+)"/i)],
    ['og:url', html.match(/property="og:url"\s+content="([^"]+)"/i)],
    ['og:image', html.match(/property="og:image"\s+content="([^"]+)"/i)],
    ['twitter:image', html.match(/name="twitter:image"\s+content="([^"]+)"/i)],
  ];
  for (const [name, m] of pairs) {
    if (!m) continue;
    if (hostOf(m[1]) !== canonicalHost) fails.push(`${f}: ${name} = ${m[1]} - not the canonical host`);
  }
  // The retired apex must not appear in a shipped self-reference at all.
  const stale = html.match(/minneapolismathbookclub\.com/gi);
  if (stale) fails.push(`${f}: ${stale.length} occurrence(s) of the apex being retired - a shipped page cannot cite a host the cutover is leaving`);
}

if (fails.length) {
  console.log(`FAIL  ${fails.length} host assertion(s) disagree:`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`check:site-host ok - ${canonicalHost} is the only host the artifact asserts about itself (${htmls.length} pages, ${locs} sitemap locs, robots.txt + canonical/og/twitter tags).`);
if (process.argv.includes('--print')) for (const [k, v] of rows) console.log(`  ${k.padEnd(34)} ${v}`);
