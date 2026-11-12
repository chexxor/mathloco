#!/usr/bin/env node
/**
 * check:rsvp-preference — the remembered platform reorders the cluster in a real browser.
 *
 *   npm run check:rsvp-preference              # dist/client, routes / and /schedule
 *   npm run check:rsvp-preference:selftest     # plant each defect, require each to FAIL (D118)
 *   node scripts/check-rsvp-preference.mjs --dist dist/client --routes /,/schedule
 *
 * Why this gate exists on top of `check:rsvp-page` (S022, D281). The page gate proves the bytes Astro
 * builds: every printed date carries a cluster, the cluster sits inside an island, the shipped chunk
 * mentions `localStorage` and carries `PREF_KEY`. Those are all necessary and none is sufficient. A chunk
 * can carry the key in a string constant and never read it; an island can have a `client` directive and
 * still never hydrate because the cluster sits 2,280px below a 682px viewport (`client:visible` hydrates on
 * intersection @measured 2026-11-11, Linux native, Firefox 159.0); a reorder can quietly become a filter
 * and still contain the right key. Only a browser answers those.
 *
 * This is the browser half of the rule and it is deliberately NOT in `npm run verify`: the runner has no
 * Firefox (D123). It runs in `npm run verify:browser` beside check:render:dist, check:mark, check:space and
 * check:ground, over loopback HTTP rather than `file://`, because Firefox refuses `import()`/`fetch()` from
 * a file:// document, so an island on a file:// page never hydrates
 * @measured 2026-11-11 by `node design/grill/probe-import.mjs`.
 *
 * Three seeds, one Firefox spawn each, per route:
 *   1. nothing stored  -> the order a first-time visitor sees is exactly the canonical order the resolver
 *      produced at build time, which is what a crawler, a JavaScript-off visitor and the page gate see;
 *   2. a stored platform -> that platform is first in every cluster that offers it, and every cluster is
 *      still a permutation of the same platforms (a reorder that drops one is a filter, D281);
 *   3. a stored value nobody recognises -> the canonical order survives. An old or hand-typed value must
 *      not scramble the row.
 * Then a real click on a real anchor: it must write the key and reorder every cluster on the page,
 * including the row that was not clicked - a "preference" that applies only to the row you touched is not
 * a preference.
 *
 * What it does NOT do: reach the network. The only network here is 127.0.0.1.
 */
import { existsSync, readFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PLATFORMS, PREF_KEY, signUpPaths, preferredFirst } from '../src/lib/rsvp.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const argOne = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i < 0 ? dflt : args[i + 1];
};

/** Read a committed JSON input, or report why it cannot be read. A gate that stack-traces on a malformed
 *  snapshot tells the next session nothing (the rule the gate skeleton enforces for every read). */
const readJson = (path) => {
  try {
    return { ok: true, data: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (e) {
    return { ok: false, why: `${path} cannot be read as JSON: ${e.message}` };
  }
};

const DIST = resolve(argOne('--dist', 'dist/client'));
const ROUTES = (argOne('--routes', '/,/schedule')).split(',').filter(Boolean);
const SCRATCH = resolve('.design', 'tmp-rsvp-preference');
/** Astro writes a route as <route>/index.html; the homepage is index.html itself. `join('/schedule',
 * 'index.html')` is absolute, so it must be stripped before joining onto the dist directory - a trap
 * that made this gate report "no built page for /schedule" on an artifact that plainly had one
 * @measured 2026-11-11 by `node scripts/check-rsvp-preference.mjs --routes /schedule`. */
const pageRel = (route) => (route === '/' ? 'index.html' : `${route.replace(/^\/+/, '').replace(/\/+$/, '')}/index.html`);
const SERVE = resolve('design/grill/serve-measure.mjs');
const PROBE = resolve('design/grill/rsvp-preference-measure.js');

/** The seed that stands for "a visitor who keeps signing up on the platform the resolver puts last".
 *  Facebook is deliberately the LAST canonical platform: a seed that is already first would prove nothing. */
const PREF_SEED = 'Facebook';
/** A value that is not a platform. It must not scramble anything (D281). */
const UNKNOWN_SEED = 'Myspace';

/* ------------------------------------------------------------------ the artifact side (no browser) */

const CLUSTER_RE = /<div[^>]*data-rsvp-cluster[\s\S]*?<\/div>/g;
const attrsOf = (tag) => {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g)) out[m[1]] = m[2] ?? '';
  return out;
};

/** The clusters a page paints, with the canonical order the resolver says they should have.
 *  `canonical` is the destination objects (what `orderByPreference` takes); `platforms` is the same list
 *  flattened to names, which is what the painted `data-rsvp-platform` attributes are compared against.
 *  Keeping both is deliberate: passing the flat names to `orderByPreference` silently returns the input
 *  unchanged, because it looks for `d.platform` @measured 2026-11-12 by `node scripts/check-rsvp-preference.mjs`. */
const clustersIn = (html, meetupEvents, urls, discordEvents) =>
  [...html.matchAll(CLUSTER_RE)].map((m) => {
    const open = m[0].slice(0, m[0].indexOf('>') + 1);
    const attrs = attrsOf(open);
    const painted = [...m[0].matchAll(/<a[^>]*data-rsvp-platform="([^"]*)"/g)].map((x) => x[1]);
    const hour = attrs['data-rsvp-hour'];
    const canonical = signUpPaths(
      { date: attrs['data-rsvp-date'], time: hour && hour !== 'unsettled' ? hour : null },
      meetupEvents, urls, discordEvents,
    ).destinations;
    return {
      date: attrs['data-rsvp-date'] || '(no date)',
      attrs,
      painted,
      canonical,
      platforms: canonical.map((d) => d.platform),
    };
  });

/* ------------------------------------------------------------------ the browser side */

/** One probe: one Firefox spawn, one fresh profile, one seed written before any island hydrates. */
const runProbe = (distDir, route, seed) => {
  const prelude = `window.__RSVP_PREF_KEY=${JSON.stringify(PREF_KEY)};`
    + (seed ? `try{localStorage.setItem(${JSON.stringify(PREF_KEY)},${JSON.stringify(seed)});}catch(e){window.__SEED_ERROR=e.message;}` : '');
  const preludeFile = join(SCRATCH, `prelude-${String(seed ?? 'none')}.js`);
  try { writeFileSync(preludeFile, prelude); } catch (e) {
    return { done: false, error: `cannot write the probe prelude into ${SCRATCH}: ${e.message}` };
  }
  const r = spawnSync('node', [SERVE, distDir, route, PROBE, '1240', '1400', '--prelude', preludeFile], {
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, PAGE_MEASURE_ATTEMPTS: '2' },
  });
  if (r.status !== 0) {
    return { done: false, error: `the probe exited ${r.status}: ${(r.stderr || '').trim().split('\n').slice(-3).join(' | ')}` };
  }
  const out = (r.stdout || '').trim();
  if (!out.startsWith('{')) return { done: false, error: `the probe posted no JSON: ${out.slice(0, 400) || '(empty)'}` };
  try {
    return JSON.parse(out.slice(0, out.lastIndexOf('}') + 1));
  } catch (e) {
    return { done: false, error: `the probe's report is not parseable (${e.message})` };
  }
};

/** How the gate describes a probe's seed in a failure message. */
const seedLabel = (seed) => {
  if (seed === null) return 'no stored preference';
  if (seed === PREF_SEED) return `a stored preference (${PREF_SEED})`;
  return `a stored value nobody recognises (${UNKNOWN_SEED})`;
};

/**
 * One page's findings. Pure: it takes the probe's JSON and the clusters the artifact paints and touches
 * nothing on disk, which is what lets the selftest run it against a mutated copy of dist with no
 * special casing.
 */
const verdict = (probe, clusters, pageName, seed) => {
  const fails = [];
  const say = (s) => fails.push(s);
  /** The order a cluster must read for this probe's seed. `preferredFirst` already returns platform names,
   *  not destination objects (src/lib/rsvp.mjs), so there is nothing to map again. */
  const wantFor = (c, preferred) => preferredFirst(c.canonical, preferred).join(', ');

  if (!probe.done || probe.error) {
    say(`${pageName}: the browser probe never reported (${probe.error || 'no report'}), so the reorder is unverified`);
    return fails;
  }
  if (probe.errors?.length) {
    for (const e of probe.errors) say(`${pageName}: ${e}`);
    return fails;
  }
  if (!clusters.length) {
    say(`${pageName}: no sign-up cluster in the artifact - there is nothing for an island to reorder (npm run build)`);
    return fails;
  }

  // 1. hydration. `client:visible` fires on intersection; the homepage cluster is at y~2280, so the probe
  //    scrolls it in. A cluster that never hydrates is a cluster whose island never ran.
  const notHydrated = clusters.filter((c) => !probe.hydration?.some((h) => h.date === c.date && h.ok));
  if (notHydrated.length) {
    say(`${pageName}: the sign-up island for ${notHydrated.map((c) => c.date).join(', ')} never hydrated in the browser, so a remembered platform never reaches it (check the island's client directive and the chunk it ships)`);
  }

  // 2. the server-painted order is the canonical order, and it is a permutation of the resolver's list.
  for (const c of clusters) {
    const where = `${pageName} cluster for ${c.date}`;
    if (c.painted.join(', ') !== c.platforms.join(', ')) {
      say(`${where} is painted in the order ${c.painted.join(', ')} but signUpPaths() says ${c.platforms.join(', ')} - the component is no longer ordering from the resolver`);
    }
    if (!c.platforms.length) {
      say(`${where} offers no platform, but the resolver's destinations for that date are empty while the row is printed - check src/config.json (D280)`);
    }
    for (const [phase, list] of [['after load', probe.orderAfterSeed], ['after another row is clicked', probe.orderAfterEvent], ['after this row is clicked', probe.orderAfterClick]]) {
      const h = (list || []).find((x) => x.date === c.date);
      if (!h) continue;
      const missing = c.platforms.filter((p) => !h.order.includes(p));
      if (missing.length) {
        say(`${where} lost ${missing.join(', ')} ${phase} (${h.order.join(', ')}) - a preference is a reorder, never a filter (D281); every platform the club declares stays on every date`);
      }
      if (h.order.length !== c.platforms.length) {
        say(`${where} paints ${h.order.length} links ${phase} but the resolver offers ${c.platforms.length}`);
      }
    }
  }

  // 3. this probe's seed, checked against the order the resolver plus the stored platform predict. The
  //    three seed cases are three separate probes, so verdict is called once per seed; checking all three
  //    labels against one probe's snapshot is how the gate reported 42 failures on a page that was right
  //    @measured 2026-11-12.
  const label = seedLabel(seed);
  for (const c of clusters) {
    const where = `${pageName} cluster for ${c.date}`;
    const h = (probe.orderAfterSeed || []).find((x) => x.date === c.date);
    if (!h) { say(`${pageName}: the probe saw no cluster for ${c.date} in the ${label} case`); continue; }
    const want = wantFor(c, seed);
    if (h.order.join(', ') !== want) {
      say(`${where}: with ${label}, the cluster reads ${h.order.join(', ')} - it should read ${want} (the island reads ${PREF_KEY} and reorders with orderByPreference())`);
    }
    const wantPreferred = seed && c.platforms.includes(seed) ? seed : null;
    if ((h.preferred ?? null) !== wantPreferred) {
      say(`${where}: with ${label}, data-rsvp-preferred is ${h.preferred ?? 'unset'} but should be ${wantPreferred ?? 'unset'}`);
    }
  }

  // 4. the window event is the whole cross-row mechanism: the platform one row chose must reach the others,
  //    both through the event alone and through a real click on another row.
  //    A page that paints only ONE cluster cannot show the cross-row half of that promise - there is no
  //    second row to hear the event - so the gate checks the half the artifact CAN show: the event is
  //    dispatched and the islands that hear it reorder. Without that, `listen to the wrong event name` is a
  //    defect no planting can be caught on a one-date page, which is exactly what today's artifact is (the
  //    club's calendar has one upcoming date) @measured 2026-11-12 by
  //    `npm run check:rsvp-preference:selftest`, which reported "the cross-row event name is broken - NOT
  //    caught (gate silent)". The blind spot is named out loud rather than left as a silent `continue`.
  //    The platform asserted is the one the probe SENT (probe.dispatch / probe.clicked.platform), not the one
  //    the islands report back: an island listening to the wrong event name still shows its own seeded
  //    `data-rsvp-preferred`, so comparing orders to each other would read as self-consistent
  //    @measured 2026-11-12 by `npm run check:rsvp-preference:selftest`.
  for (const [phaseName, list, expected] of [
    ['the synthetic event', probe.orderAfterEvent, probe.dispatch],
    ['a real click', probe.orderAfterClick, probe.clicked?.platform],
  ]) {
    if (!list || !expected) continue;
    for (const c of clusters) {
      const where = `${pageName} cluster for ${c.date}`;
      const h = list.find((x) => x.date === c.date);
      if (!h) continue;
      const want = wantFor(c, expected);
      if (h.order.join(', ') !== want) {
        say(`${where} did not take the platform chosen ${phaseName} (${h.order.join(', ')}); the window event 'rsvp-platform' is not reaching every island (want ${want}, from ${expected})`);
      }
    }
  }
  if (clusters.length < 2) {
    console.log(`  note: ${pageName} paints one cluster, so "the platform one row chose reaches the OTHER rows" has no second row to test. The event itself is still exercised: the probe dispatches it and the island that hears it must reorder (checked above). The club's calendar holds one upcoming date @measured 2026-11-12 by npm run events:harvest, so this is the honest state of the artifact, not a gap in the gate; the planting that breaks the event name is still caught.`);
  }

  // 5. the click itself: it must write the key, and the island you clicked must reorder.
  if (probe.clicked) {
    if (probe.storedAfterClick !== probe.clicked.platform) {
      say(`${pageName}: clicking the ${probe.clicked.platform} link stored ${probe.storedAfterClick ?? 'nothing'} in ${PREF_KEY} - the click is the signal the whole design rests on (D281), and it is not being stored`);
    }
    const clickedDate = probe.clicked.date || (probe.orderAfterClick || [])[0]?.date;
    const clickedCluster = clusters.find((c) => c.date === clickedDate);
    if (clickedCluster) {
      const h = (probe.orderAfterClick || []).find((x) => x.date === clickedCluster.date);
      const want = wantFor(clickedCluster, probe.clicked.platform);
      if (h && h.order.join(', ') !== want) {
        say(`${pageName} cluster for ${clickedCluster.date}: the island whose link was clicked reads ${h.order.join(', ')} after its own click; it should read ${want}`);
      }
    }
  } else {
    say(`${pageName}: the probe found no anchor to click, so the click path that records a preference is untested`);
  }

  return fails;
};

/* ------------------------------------------------------------------ run one page */

const runPage = (distDir, route, meetupEvents, urls, discordEvents) => {
  const file = resolve(distDir, pageRel(route));
  if (!existsSync(file)) return { name: route, clusters: [], fails: [`no built page for ${route} under ${distDir} (npm run build first)`], summaries: [] };
  const clusters = clustersIn(readFileSync(file, 'utf8'), meetupEvents, urls, discordEvents);
  const fails = [];
  const summaries = [];
  for (const seed of [null, PREF_SEED, UNKNOWN_SEED]) {
    const probe = runProbe(distDir, route, seed);
    fails.push(...verdict(probe, clusters, route, seed));
    summaries.push(`${seed ?? 'none'}: ${(probe.orderAfterSeed || []).map((c) => c.order.join('/')).join(' | ')}`);
  }
  return { name: route, clusters, fails, summaries };
};

/* ------------------------------------------------------------------ the selftest */

/** Every defect class this gate must be able to name, planted into a copy of the real dist. */
const homeOfRoute = (route) => readFileSync(resolve(DIST, pageRel(route)), 'utf8');

const plantings = (home, pageFile, chunkName, chunk) => {
  const islandMatch = home.match(/<astro-island[^>]*SignUpLinksCluster[^>]*>/);
  if (!islandMatch) return [];
  const island = islandMatch[0];
  /** The reorder, found in the shipped chunk rather than hardcoded: minifiers rename the local, so a
   *  literal `C=(e,t)=>...` stops matching the day the build changes a name - the selftest then reports
   *  "the mutation changed nothing" and the class goes untested
   *  @measured 2026-11-12 by `npm run check:rsvp-preference:selftest`. A body with no nested braces is
   *  the shape orderByPreference compiles to. */
  const reorderMatch = chunk.match(/\w+=\(\w+,\w+\)=>\{[^{}]*findIndex[^{}]*\}/);
  const reorderName = reorderMatch ? reorderMatch[0].split('=')[0] : null;

  /** Paint the canonical cluster with its first two links swapped, props untouched: the only evidence of
   *  the defect is the bytes the server emitted. */
  const swapPaintedOrder = () => {
    const i = home.indexOf(island);
    const start = i + island.length;
    const clusterStart = home.indexOf('<div', start);
    if (i < 0 || clusterStart < 0) return home;
    const clusterEnd = home.indexOf('</div>', clusterStart) + 6;
    const cluster = home.slice(clusterStart, clusterEnd);
    const links = [...cluster.matchAll(/<a[^>]*data-rsvp-platform="([^"]*)"[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);
    if (links.length < 2) return home;
    const swapped = cluster.replace(links[0], '@@').replace(links[1], links[0]).replace('@@', links[1]);
    return home.slice(0, clusterStart) + swapped + home.slice(clusterEnd);
  };
  const chunkKey = chunkName.replace(/^\//, '');

  return [
    {
      name: 'an island with no client directive',
      files: { [pageFile]: home.replace(island, island.replace(/ client="visible"/, '')) },
      want: 'never hydrated',
    },
    {
      name: 'the shipped chunk reads a different preference key',
      files: { [chunkKey]: chunk.replace(`\`${PREF_KEY}\``, '`old-matheapolis-rsvp`') },
      want: 'it should read',
    },
    {
      name: 'the chunk carries the key but never reorders',
      files: { [chunkKey]: reorderMatch ? chunk.replace(reorderMatch[0], `${reorderName}=(a,b)=>a`) : chunk },
      want: 'it should read',
    },
    {
      name: 'the reorder is a filter (only the preferred platform survives)',
      files: { [chunkKey]: reorderMatch ? chunk.replace(reorderMatch[0], `${reorderName}=(a,b)=>{if(!b)return a;let i=a.findIndex(a=>a.platform===b);return i<=0?a:[a[i]]}`) : chunk },
      want: 'lost Meetup, Discord',
    },
    {
      /* Every occurrence, not the first one. `String.prototype.replace` with a string pattern hits ONE
       * match, and the chunk's first `` `rsvp-platform` `` is the dispatch inside the click handler, not
       * the `addEventListener` - so the planting left the listener alive, the probe's own synthetic event
       * was heard, and the gate reported "not caught" for a defect that was never planted
       * @measured 2026-11-12 by `npm run check:rsvp-preference:selftest`.
       * Note the preference key `matheapolis-rsvp-platform` does NOT match: the character before
       * `rsvp-platform` there is a hyphen, not a backtick. */
      name: 'the cross-row event name is broken',
      files: { [chunkKey]: chunk.replace(/`rsvp-platform`/g, '`rsvp-platform-dead`') },
      want: "window event 'rsvp-platform' is not reaching every island",
    },
    {
      name: 'the server paints a non-canonical order',
      files: { [pageFile]: swapPaintedOrder() },
      want: 'is painted in the order',
    },
  ];
};

const inputs = {
  meetup: readJson(resolve('data/meetup-events.json')),
  discord: readJson(resolve('data/discord-events.json')),
  config: readJson(resolve('src/config.json')),
};
for (const r of Object.values(inputs)) {
  if (!r.ok) { console.error(`check:rsvp-preference: ${r.why}`); process.exit(1); }
}
if (!existsSync(DIST) || !existsSync(resolve(DIST, 'index.html'))) {
  console.error(`check:rsvp-preference: no ${DIST}/index.html - run npm run build (or npm run verify) first.`);
  process.exit(1);
}
if (!existsSync(SERVE) || !existsSync(PROBE)) {
  console.error(`check:rsvp-preference: the probe harness is missing (${SERVE} or ${PROBE}).`);
  process.exit(1);
}
rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(SCRATCH, { recursive: true });

const meetupEvents = inputs.meetup.data.events ?? [];
const discordEvents = inputs.discord.data.events ?? [];
const urls = inputs.config.data.URLs ?? {};

if (!selftest) {
  const fails = [];
  for (const route of ROUTES) {
    const r = runPage(DIST, route, meetupEvents, urls, discordEvents);
    console.log(`${route}: ${r.clusters.length} cluster(s) - ${r.summaries.join('  ;  ')}`);
    fails.push(...r.fails);
  }
  // The declared-platform rule, checked in the browser rather than in the bytes: a cluster can carry every
  // platform in the markup and still lose one after the island runs (D280 + D281 together).
  const homeClusters = clustersIn(readFileSync(resolve(DIST, 'index.html'), 'utf8'), meetupEvents, urls, discordEvents);
  const absent = Object.values(PLATFORMS).filter((p) => !homeClusters.some((c) => c.platforms.includes(p)));
  if (absent.length) {
    fails.push(`no printed cluster offers ${absent.join(', ')} - src/config.json declares platforms the page never paints (D280)`);
  }
  if (fails.length) {
    console.log(`check:rsvp-preference: ${fails.length} failure(s)`);
    for (const f of fails) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log(`check:rsvp-preference: ok - ${ROUTES.length} route(s), ${ROUTES.length * 3} browser loads, canonical order preserved with no seed and with an unknown seed, ${PREF_SEED} first when stored, every cluster a permutation of the same platforms, click path stored and reordering every cluster`);
  process.exit(0);
}

let wrong = 0;
let cases = 0;
// /schedule, not /: it is the only route with more than one cluster, and cross-row sync - the promise that
// one row's click reorders the others - can only be planted where there is a second row to fail.
const CASE_ROUTE = '/schedule';
const casePage = pageRel(CASE_ROUTE);
const home = homeOfRoute(CASE_ROUTE);
const chunkName = (home.match(/component-url="([^"]*SignUpLinksCluster[^"]*)"/) || [])[1];
if (!chunkName) {
  console.error(`check:rsvp-preference:selftest: the built ${CASE_ROUTE} page has no SignUpLinksCluster island, so there is nothing to plant defects into (npm run build first).`);
  process.exit(1);
}
const chunk = readFileSync(resolve(DIST, chunkName.replace(/^\//, '')), 'utf8');

for (const planting of plantings(home, casePage, chunkName, chunk)) {
  cases++;
  const copy = mkdtempSync(join(SCRATCH, 'case-'));
  cpSync(DIST, copy, { recursive: true });
  let planted = false;
  for (const [rel, text] of Object.entries(planting.files)) {
    const target = join(copy, rel);
    if (!existsSync(target)) {
      console.log(`WRONG  ${planting.name}: targets ${rel}, which the built page does not contain - the gate cannot catch this class`);
      wrong++;
      continue;
    }
    if (text === readFileSync(target, 'utf8')) {
      console.log(`WRONG  ${planting.name}: the mutation changed nothing (the pattern it targets is not in the artifact)`);
      wrong++;
      continue;
    }
    writeFileSync(target, text);
    planted = true;
  }
  if (planted) {
    const clusters = clustersIn(readFileSync(join(copy, casePage), 'utf8'), meetupEvents, urls, discordEvents);
    const fails = verdict(runProbe(copy, CASE_ROUTE, PREF_SEED), clusters, CASE_ROUTE, PREF_SEED);
    const named = fails.some((f) => f.includes(planting.want));
    console.log(`${named ? 'ok   ' : 'WRONG '} ${planting.name.padEnd(52)} ${named ? 'caught' : 'NOT caught'}  ${fails.length ? `(${fails[0].slice(0, 120)})` : '(gate silent)'}`);
    if (!named) wrong++;
  }
  rmSync(copy, { recursive: true, force: true });
}

// The clean control: the unmutated artifact must pass, or the gate is crying at everything.
const controlFails = verdict(runProbe(DIST, CASE_ROUTE, PREF_SEED), clustersIn(home, meetupEvents, urls, discordEvents), CASE_ROUTE, PREF_SEED);
console.log(`${controlFails.length ? 'WRONG  ' : 'ok     '} control (unmutated dist) ${controlFails.length ? `failed: ${controlFails[0]}` : 'passed'}`);
if (controlFails.length) wrong++;
cases++;

console.log(`check:rsvp-preference:selftest: ${cases} cases, ${wrong} wrong`);
process.exit(wrong ? 1 : 0);
