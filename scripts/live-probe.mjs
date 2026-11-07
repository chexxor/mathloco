#!/usr/bin/env node
// live-probe.mjs — what a visitor is actually served, next to what this tree would ship.
//
// Why this exists (measured 2026-11-08): `npm run verify` is green against `dist/`, and every gate in the
// deploy set reads the built artifact. Nothing in the gate set reads a live URL, so a branch can be green for
// a week while the site a person reaches is an older artifact — the day this probe printed
// `matheapolis.com/schedule -> 404` and `matheapolis.com -> 200` carrying the pre-design-system markup, the
// gates were all green and the deployed Worker's newest version was 2026-10-31. A green build says the
// artifact is deployable. It says nothing about what is deployed.
//
// Deliberately NOT a gate: it is not in `verify`, and its exit code is 0 unless you ask with `--strict`.
// Production lagging behind `staging` is the operator's deploy decision (D42: the production deploy is
// theirs), and a gate that goes red every time they choose to wait is a gate people learn to ignore.
// `--strict` is the hook a future watchdog (`.notes/runbooks/deploy-pipeline-workers-builds.md`'s scheduled
// probe, option (a)) would use.
//
// No secrets, no deploy rights, no write verb: GET only.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const strict = process.argv.includes('--strict');

// The three environments this repo has, in the order a reviewer should read them.
const targets = [
  { group: 'production', url: 'https://matheapolis.com/', expect: 200 },
  { group: 'production', url: 'https://matheapolis.com/schedule', expect: 200 },
  { group: 'production', url: 'https://matheapolis.com/events.ics', expect: 200, ics: true },
  { group: 'production', url: 'https://minneapolismathbookclub.com/', expect: 200 },
  { group: 'production', url: 'https://minneapolismathbookclub.com/schedule', expect: 200 },
  { group: 'production', url: 'https://minneapolismathbookclub.com/events.ics', expect: 200, ics: true },
  // `expect: null` is a ruling that is still open, not a pass: www.matheapolis.com 404s today and the
  // operator has to rule 1a/1b/1c before anyone can call that right or wrong (D245).
  { group: 'production', url: 'https://www.matheapolis.com/', expect: null },
  { group: 'preview', url: 'https://staging-minneapolis-math-book-club.chexxor.workers.dev/', expect: 200 },
  { group: 'preview', url: 'https://staging-minneapolis-math-book-club.chexxor.workers.dev/schedule', expect: 200 },
  { group: 'preview', url: 'https://staging-minneapolis-math-book-club.chexxor.workers.dev/events.ics', expect: 200, ics: true },
];

// Tells, each one a fact about *which artifact* answered rather than a style opinion.
const tells = [
  ['rename', 'Matheapolis'],
  ['descriptor', 'Minneapolis\u2013St. Paul math club'],
  ['wordmark step', 'sm:text-display-3'],
  ['Pages-era nav', 'href="/members"'],
  ['Pages-era palette', 'text-blue-600'],
];

async function probe(url, { ics = false } = {}) {
  try {
    // Followed by hand, and the chain kept, because the cutover being planned in D245/D246 *is* a chain of
    // redirects: a 301 that lands on a 404 has to be visible as `301 -> 404`, not collapsed into either end.
    // `/schedule` already answers `307 -> /schedule/` on the Preview while every internal link says `href="/schedule"`.
    const chain = [];
    let res = await fetch(url, { redirect: 'manual' });
    let hops = 0;
    while (res.status >= 300 && res.status < 400 && hops < 4) {
      const location = res.headers.get('location');
      chain.push({ status: res.status, location: location ?? '' });
      if (!location) break;
      res = await fetch(new URL(location, res.url ?? url), { redirect: 'manual' });
      hops++;
    }
    const type = res.headers.get('content-type') ?? '';
    // The bug this file had on its first run (measured 2026-11-08): it read the body only for `text/html` and
    // `text/plain`, so `/events.ics` — a real 6,049-byte `text/calendar` document (curl agrees) — printed `0 b`
    // with no title and no tells. A probe that only reads bodies it recognises reports an absent artifact in
    // place of a present one, and the feed is the thing A16's gate and the calendar subscribers depend on.
    const isText = /^text\//.test(type) || /(json|xml|calendar|javascript)/.test(type);
    const body = isText ? await res.text() : '';
    const robots = res.headers.get('x-robots-tag') ?? '';
    const cache = res.headers.get('cf-cache-status') ?? '';
    const previewErr = res.headers.get('x-preview-user-error') ?? '';
    const vevents = ics ? (body.match(/BEGIN:VEVENT/g) ?? []).length : 0;
    const isCalendar = ics && body.includes('BEGIN:VCALENDAR');
    return {
      status: res.status,
      first: chain[0]?.status ?? res.status,
      hops,
      location: chain[0]?.location ?? (res.headers.get('location') ?? ''),
      bytes: body.length,
      type,
      ics,
      isCalendar,
      vevents,
      title: (body.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').trim(),
      robots,
      cache,
      previewErr,
      tells: tells.map(([, needle]) => (body.includes(needle) ? 1 : 0)),
    };
  } catch (e) {
    return { status: 'ERR', first: 'ERR', hops: 0, location: '', bytes: 0, type: '', ics, isCalendar: false, vevents: 0, title: '', robots: '', cache: '', previewErr: '', error: e.message, tells: tells.map(() => 0) };
  }
}

// The local side of the comparison: the home page this tree would ship, if a build exists.
const distIndex = resolve('dist/client/index.html');
const built = existsSync(distIndex) ? readFileSync(distIndex, 'utf8') : null;
const builtTitle = built?.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? null;

const results = [];
for (const t of targets) results.push({ ...t, ...(await probe(t.url, { ics: t.ics })) });

// `--json` exists so the scheduled watchdog in `.notes/runbooks/deploy-pipeline-workers-builds.md` can read this
// probe the same way it reads a `check:*` step: one artifact, no prose to parse, exit code the only verdict.
if (process.argv.includes('--json')) {
  const strictProblems = [];
  for (const r of results) {
    if (r.expect === null) continue;
    if (r.status !== r.expect) strictProblems.push(`${r.group} ${r.url} answered ${r.first} -> ${r.status} after ${r.hops} redirect(s)`);
    if (r.ics && r.status === 200 && !r.isCalendar) strictProblems.push(`${r.group} ${r.url} answered 200 with ${r.type || 'no content-type'} and no BEGIN:VCALENDAR`);
  }
  const liveHome = results.find((r) => r.group === 'production' && r.url.endsWith('matheapolis.com/'));
  console.log(JSON.stringify({
    measuredAt: new Date().toISOString(),
    built: built ? { path: distIndex, title: builtTitle } : null,
    deployedMatchesBuild: Boolean(built && liveHome?.status === 200 && liveHome.title === builtTitle),
    strictProblems,
    results,
  }));
  process.exit(strict && strictProblems.length ? 1 : 0);
}

const width = Math.max(...results.map((r) => r.url.length));
let group = '';
for (const r of results) {
  if (r.group !== group) {
    group = r.group;
    console.log(`\n${group}`);
  }
  const flags = [
    r.hops || r.location ? `${r.first}${r.location ? ` -> ${r.location}` : ''}${r.hops ? ` -> ${r.status}` : ''}` : '',
    r.previewErr ? 'x-preview-user-error' : '',
    r.cache ? `cache:${r.cache}` : '',
    r.robots ? `robots:${r.robots}` : '',
    r.ics ? (r.isCalendar ? `calendar:${r.vevents} VEVENT${r.vevents === 1 ? '' : 's'}` : 'calendar:NO') : '',
    r.error ? r.error : '',
  ]
    .filter(Boolean)
    .join(' | ');
  console.log(
    `  ${String(r.status).padEnd(4)} ${r.url.padEnd(width)}  ${String(r.bytes).padStart(6)}b  ${flags}`
  );
  if (r.title) console.log(`       title: ${r.title}`);
}

console.log('\ntells (rename / descriptor / wordmark step / Pages-era nav / Pages-era palette) — HTML bodies only');
for (const r of results) {
  if (!r.bytes || r.ics) continue;
  console.log(`  ${r.tells.join(' ')}  ${r.url}`);
}

const feeds = results.filter((r) => r.ics);
if (feeds.length) {
  console.log("\nthe feed, as a visitor gets it (the calendar subscribers' half of A16's gate)");
  for (const r of feeds) {
    console.log(`  ${r.status}${r.hops ? ` (after ${r.hops} redirect${r.hops === 1 ? '' : 's'})` : ''}  ${r.url}  ${r.bytes}b  ${r.type || 'no content-type'}  ${r.isCalendar ? `${r.vevents} VEVENT${r.vevents === 1 ? '' : 's'}` : 'NOT a VCALENDAR'}`);
  }
}

const liveHome = results.find((r) => r.group === 'production' && r.url.endsWith('matheapolis.com/'));
console.log('\nwhat is deployed vs what this tree would ship');
if (!built) {
  console.log('  no dist/client/index.html - run `npm run build` first, or read the numbers above alone');
} else if (!liveHome || liveHome.status !== 200) {
  console.log('  the production home did not answer 200, so there is nothing to compare');
} else {
  const sameTitle = liveHome.title === builtTitle;
  const missing = tells
    .filter(([label, needle], i) => built.includes(needle) && !liveHome.tells[i])
    .map(([label]) => label);
  const extra = tells
    .filter(([label, needle], i) => liveHome.tells[i] && !built.includes(needle))
    .map(([label]) => label);
  console.log(`  built title:  ${builtTitle}`);
  console.log(`  live title:   ${liveHome.title}`);
  console.log(`  same page:    ${sameTitle && missing.length === 0 ? 'yes' : 'no'}`);
  if (missing.length) console.log(`  live is missing: ${missing.join(', ')}`);
  if (extra.length) console.log(`  live carries, this build does not: ${extra.join(', ')}`);
  console.log('  (a "no" here is not a defect: it is the gap between a branch and a deploy, and the deploy is the operator\'s — D42)');
}

if (strict) {
  const problems = [];
  for (const r of results) {
    if (r.expect === null) continue;
    // The end of the chain is what a visitor gets. A 301 onto a 404 must fail here even though a 301 happened.
    if (r.status !== r.expect) problems.push(`${r.group} ${r.url} answered ${r.first}${r.hops ? ` -> ${r.status}` : ` (${r.status})`} after ${r.hops} redirect${r.hops === 1 ? '' : 's'}`);
    if (r.ics && r.status === 200 && !r.isCalendar) problems.push(`${r.group} ${r.url} answered 200 with ${r.type || 'no content-type'} and no BEGIN:VCALENDAR - a feed that is not a feed`);
  }
  if (problems.length) {
    console.log('\n--strict: targets that did not answer as expected');
    for (const p of problems) console.log(`  ${p}`);
    process.exit(1);
  }
}
