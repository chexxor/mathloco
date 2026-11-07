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
  { group: 'production', url: 'https://matheapolis.com/events.ics', expect: 200 },
  { group: 'production', url: 'https://minneapolismathbookclub.com/', expect: 200 },
  { group: 'production', url: 'https://minneapolismathbookclub.com/schedule', expect: 200 },
  { group: 'production', url: 'https://minneapolismathbookclub.com/events.ics', expect: 200 },
  // `expect: null` is a ruling that is still open, not a pass: www.matheapolis.com 404s today and the
  // operator has to rule 1a/1b/1c before anyone can call that right or wrong (D245).
  { group: 'production', url: 'https://www.matheapolis.com/', expect: null },
  { group: 'preview', url: 'https://staging-minneapolis-math-book-club.chexxor.workers.dev/', expect: 200 },
  { group: 'preview', url: 'https://staging-minneapolis-math-book-club.chexxor.workers.dev/schedule', expect: 200 },
  { group: 'preview', url: 'https://staging-minneapolis-math-book-club.chexxor.workers.dev/events.ics', expect: 200 },
];

// Tells, each one a fact about *which artifact* answered rather than a style opinion.
const tells = [
  ['rename', 'Matheapolis'],
  ['descriptor', 'Minneapolis\u2013St. Paul math club'],
  ['wordmark step', 'sm:text-display-3'],
  ['Pages-era nav', 'href="/members"'],
  ['Pages-era palette', 'text-blue-600'],
];

async function probe(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const type = res.headers.get('content-type') ?? '';
    const body = type.includes('text/html') || type.includes('text/plain') ? await res.text() : '';
    const robots = res.headers.get('x-robots-tag') ?? '';
    const cache = res.headers.get('cf-cache-status') ?? '';
    const previewErr = res.headers.get('x-preview-user-error') ?? '';
    return {
      status: res.status,
      location: res.headers.get('location') ?? '',
      bytes: body.length,
      title: (body.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').trim(),
      robots,
      cache,
      previewErr,
      tells: tells.map(([, needle]) => (body.includes(needle) ? 1 : 0)),
    };
  } catch (e) {
    return { status: 'ERR', location: '', bytes: 0, title: '', robots: '', cache: '', previewErr: '', error: e.message, tells: tells.map(() => 0) };
  }
}

// The local side of the comparison: the home page this tree would ship, if a build exists.
const distIndex = resolve('dist/client/index.html');
const built = existsSync(distIndex) ? readFileSync(distIndex, 'utf8') : null;
const builtTitle = built?.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? null;

const results = [];
for (const t of targets) results.push({ ...t, ...(await probe(t.url)) });

const width = Math.max(...results.map((r) => r.url.length));
let group = '';
for (const r of results) {
  if (r.group !== group) {
    group = r.group;
    console.log(`\n${group}`);
  }
  const flags = [
    r.location ? `-> ${r.location}` : '',
    r.previewErr ? 'x-preview-user-error' : '',
    r.cache ? `cache:${r.cache}` : '',
    r.robots ? `robots:${r.robots}` : '',
    r.error ? r.error : '',
  ]
    .filter(Boolean)
    .join(' | ');
  console.log(
    `  ${String(r.status).padEnd(4)} ${r.url.padEnd(width)}  ${String(r.bytes).padStart(6)}b  ${flags}`
  );
  if (r.title) console.log(`       title: ${r.title}`);
}

console.log('\ntells (rename / descriptor / wordmark step / Pages-era nav / Pages-era palette)');
for (const r of results) {
  if (!r.bytes) continue;
  console.log(`  ${r.tells.join(' ')}  ${r.url}`);
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
    if (r.status !== 200) problems.push(`${r.group} ${r.url} answered ${r.status}${r.location ? ` (-> ${r.location})` : ''}`);
  }
  if (problems.length) {
    console.log('\n--strict: production URLs that did not answer 200');
    for (const p of problems) console.log(`  ${p}`);
    process.exit(1);
  }
}
