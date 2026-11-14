#!/usr/bin/env node
// check:join — the `/join` page prints exactly the channels the resolver says the club has.
//
//   npm run check:join            # over the built dist/client/join/index.html
//   npm run check:join:selftest   # plant each defect, require each to FAIL (D118)
//
// Why this gate exists (S033, D303, D304). `/join` is the one page the homepage's single action lands on, and
// its whole value is that the list of ways in is true: every row a channel the club actually has, at a URL
// whose platform shape is right and whose verification stamp is young, with a group heading only for a kind
// that has a row. That is a promise about a site this club does not control, which is the class
// `check:rsvp` (D272) and `check:rsvp-page` (D272/D273) already guard on the dated surfaces — this is the
// same rule on the one page that is not dated.
//
// What it does NOT do: it does not check the copy of the page's prose sections, does not read the schedule,
// and does not touch the network. `check:content` owns what the page *says*; this owns what it *links to*.
// The URLs and the stamps come from `src/config.json` and the list from `src/lib/rsvp.mjs` (via
// `joinChannels()`), so there is no second copy of either here — a gate that re-typed the platform list
// would be the drift it exists to catch (D264).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CHANNEL_KINDS, LINK_KEYS, LINK_SHAPES, LINK_STAMP_DAYS, PLATFORMS, PROBE_BLIND_KEYS,
  joinChannels, paintedKinds,
} from '../src/lib/rsvp.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const argOne = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i < 0 ? dflt : args[i + 1];
};

const PAGE = argOne('--page', 'dist/client/join/index.html');
const CONFIG = argOne('--config', 'src/config.json');
const DIST = argOne('--dist', 'dist/client');

/** A join anchor, with the four things a gate can compare to the resolver: its kind, its platform, its href
 *  and its painted text. The page prints no nested anchor, so a non-greedy match to the first `</a>` is the
 *  whole control; if that ever stops being true the text comparison fails loudly rather than silently. */
const ANCHOR_RE = /<a\b([^>]*\bdata-join-kind="([a-z]+)"[^>]*)>([\s\S]*?)<\/a>/g;
const attr = (attrs, name) => new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? null;
const text = (html) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/** A JSON file this gate cannot work without, read with its reason attached: a missing or malformed artifact
 *  says which file and why in one line instead of dying on a stack trace. This is the `readJson(path, why)`
 *  shape the 2026-11-13 report recommended for D288's parked `unchecked-throwing-call-js` class, so this gate
 *  does not grow that count by one. */
const readJson = (path, why) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`check:join: cannot read ${path} (${why}) — ${err.message}`);
    process.exit(1);
  }
};

const platformKey = (platform) => Object.keys(PLATFORMS).find((k) => PLATFORMS[k] === platform) ?? null;
const daysBetween = (a, b) => Math.round((a - b) / 86_400_000);
const parseDay = (s) => {
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) ? t : NaN;
};

/** Every channel the page paints, in document order. */
export const paintedChannels = (html) => {
  const out = [];
  for (const m of html.matchAll(ANCHOR_RE)) {
    out.push({ kind: m[2], platform: attr(m[1], 'data-join-platform'), href: attr(m[1], 'href'), text: text(m[3]) });
  }
  return out;
};

/** The headings the page paints for a kind. A group with no row must paint none, or the page promises a
 *  kind of joining the club does not have (D303). */
export const paintedKindHeadings = (html) =>
  [...html.matchAll(/<h2\b[^>]*\bid="join-([a-z]+)"/g)].map((m) => m[1]);

/**
 * The findings. `painted` and `headings` are what the artifact contains; the resolver and the config are
 * what it should contain. Pure, so the selftest can plant into it without a build or a network.
 */
export const joinFindings = (painted, headings, urls = {}, { today = new Date(), pagePath = PAGE, dist = DIST } = {}) => {
  const fails = [];
  const expect = joinChannels(urls);
  const fail = (rule, detail) => fails.push({ rule, file: pagePath, detail });

  // 1. Every expected row is painted, in the resolver's order, with its href and its text.
  const got = painted;
  const want = expect;
  for (const w of want) {
    const g = got.find((c) => c.kind === w.kind && c.platform === w.platform && c.href === w.href);
    if (!g) {
      fail('join-channel-missing', `the resolver has a ${w.kind}/${w.platform} channel at ${w.href} and the page does not paint it (S033, D303)`);
      continue;
    }
    const wantText = text(`${w.label}${w.srOnly ? ` ${w.srOnly}` : ''}`);
    if (g.text !== wantText) {
      fail('join-label-mismatch', `${w.kind}/${w.platform} paints "${g.text}" but the resolver's label is "${wantText}" (D273: the resolved label is the painted label, and the gate compares bytes)`);
    }
  }
  for (const g of got) {
    if (!want.some((w) => w.kind === g.kind && w.platform === g.platform && w.href === g.href)) {
      fail('join-channel-invented', `the page paints a ${g.kind}/${g.platform} channel at ${g.href} that the resolver does not have — a link the config never declared`);
    }
  }
  const order = (list) => list.map((c) => `${c.kind}/${c.platform}`).join(',');
  if (got.length && order(got) !== order(want.filter((w) => got.some((g) => g.kind === w.kind && g.platform === w.platform && g.href === w.href)))) {
    fail('join-order', `the page paints ${order(got)} — the resolver's canonical order is ${order(want)} (D304: the page's shape is the explanation, so a returning visitor must see the same order)`);
  }

  // 2. Kinds: known, and a heading only where a row exists.
  for (const k of headings) {
    if (!CHANNEL_KINDS.includes(k)) fail('join-unknown-kind', `the page paints a group heading for the kind "${k}", which is not in CHANNEL_KINDS (${CHANNEL_KINDS.join(', ')})`);
    if (!paintedKinds(expect).includes(k)) fail('join-empty-kind-heading', `the page paints a "${k}" group with no channel in it — a heading that promises a kind of joining the club does not have`);
  }
  for (const k of paintedKinds(expect)) {
    if (!headings.includes(k)) fail('join-kind-heading-missing', `the resolver has a ${k} channel and the page paints no group heading for it`);
  }

  // 3. Each row's destination is what its platform can be, and its stamp is young.
  const verified = urls?._verified ?? {};
  for (const c of expect) {
    if (!c.external) {
      const route = c.href.replace(/^\//, '').replace(/\/$/, '');
      const file = resolve(dist, route, 'index.html');
      if (!existsSync(file)) fail('join-internal-route-missing', `the ${c.kind} row points at ${c.href} and the build emits no ${file} (D117: a path needs a page)`);
      continue;
    }
    const key = platformKey(c.platform);
    const shape = LINK_SHAPES?.[key];
    if (shape && !shape.test(c.href)) {
      fail('join-url-shape', `the ${key} row points at ${c.href}, which is not the shape ${key} URLs can have (${shape})`);
    }
    const stamp = verified?.[LINK_KEYS[key]];
    if (!stamp) {
      fail('join-stamp-missing', `the ${key} row has no verification stamp in src/config.json _verified.${LINK_KEYS[key]} — a printed URL is a promise nobody has checked (D272)`);
      continue;
    }
    const age = daysBetween(today, new Date(parseDay(stamp.verifiedAt ?? stamp.confirmedAt ?? '')));
    if (!Number.isFinite(age) || age > LINK_STAMP_DAYS) {
      fail('join-stamp-stale', `the ${key} row's stamp is ${Number.isFinite(age) ? `${age} days old` : 'undated'} (${stamp.verifiedAt ?? stamp.confirmedAt ?? 'none'}) — the limit is ${LINK_STAMP_DAYS} days (D151/D272)`);
    }
    if (PROBE_BLIND_KEYS.has(LINK_KEYS[key])) {
      if (!stamp.confirmedBy || !stamp.confirmedAt) {
        fail('join-blind-link-unconfirmed', `${key} cannot be probed from this rig, so its evidence is a named human confirmation — the stamp has no confirmedBy/confirmedAt (S021, D280)`);
      } else {
        const cAge = daysBetween(today, new Date(parseDay(stamp.confirmedAt)));
        if (!Number.isFinite(cAge) || cAge > LINK_STAMP_DAYS) fail('join-blind-link-stale', `${key}'s human confirmation is ${cAge} days old; the limit is ${LINK_STAMP_DAYS} (S021, D280)`);
      }
    } else if (/^[45]\d\d$/.test(String(stamp.status ?? '200'))) {
      fail('join-stamp-status', `${key}'s last probe answered ${stamp.status} — a printed URL that did not answer is not a path out`);
    }
  }
  return fails;
};

// ------------------------------------------------------------------ selftest

if (selftest) {
  const FIX = resolve('.design', 'tmp-join-page');
  rmSync(FIX, { recursive: true, force: true });
  mkdirSync(resolve(FIX, 'schedule'), { recursive: true });
  writeFileSync(resolve(FIX, 'schedule', 'index.html'), '<html><body>fixture</body></html>');

  const urls = {
    meetupGroup: 'https://www.meetup.com/minneapolis-mathematics-book-club',
    discordInvite: 'https://discord.com/invite/wx5S7YJSkU',
    facebookGroup: 'https://www.facebook.com/groups/matheapolis',
    _verified: {
      meetupGroup: { status: 200, verifiedAt: '2026-11-10' },
      discordInvite: { status: 200, verifiedAt: '2026-11-10' },
      facebookGroup: { status: 400, verifiedAt: '2026-11-11', confirmedBy: 'operator', confirmedAt: '2026-11-11' },
    },
  };
  const today = new Date('2026-11-13T00:00:00Z');
  const opts = { today, pagePath: `${FIX}/join/index.html`, dist: FIX };
  const good = [
    { kind: 'social', platform: 'Meetup', href: urls.meetupGroup, text: 'Join the Meetup group Meetup, opens in a new tab' },
    { kind: 'social', platform: 'Facebook', href: urls.facebookGroup, text: 'Join the Facebook group Facebook, opens in a new tab' },
    { kind: 'rsvp', platform: 'Meetup', href: '/schedule', text: 'See the dates' },
    { kind: 'chat', platform: 'Discord', href: urls.discordInvite, text: 'Join the chat on Discord Discord, opens in a new tab' },
  ];
  const goodHeadings = ['social', 'rsvp', 'chat'];
  const cases = [
    { name: 'clean control', painted: good, headings: goodHeadings, urls, want: [] },
    { name: 'a channel the resolver has and the page dropped', painted: good.filter((c) => c.kind !== 'chat'), headings: ['social', 'rsvp'], urls, want: ['join-channel-missing', 'join-kind-heading-missing'] },
    { name: 'a channel the page invented', painted: [...good, { kind: 'social', platform: 'Mobilizon', href: 'https://example.org/group', text: 'Join on Mobilizon' }], headings: goodHeadings, urls, want: ['join-channel-invented', 'join-order'] },
    { name: 'a reworded label', painted: good.map((c) => (c.kind === 'rsvp' ? { ...c, text: 'Look at the dates' } : c)), headings: goodHeadings, urls, want: ['join-label-mismatch'] },
    { name: 'an unknown kind', painted: good, headings: [...goodHeadings, 'society'], urls, want: ['join-unknown-kind', 'join-empty-kind-heading'] },
    { name: 'a row dropped but its heading kept', painted: good.filter((c) => c.kind !== 'chat'), headings: [...goodHeadings], urls, want: ['join-channel-missing'] },
    { name: 'a stale stamp', painted: good, headings: goodHeadings, urls: { ...urls, _verified: { ...urls._verified, discordInvite: { status: 200, verifiedAt: '2026-09-01' } } }, want: ['join-stamp-stale'] },
    { name: 'a missing stamp', painted: good, headings: goodHeadings, urls: { ...urls, _verified: { ...urls._verified, discordInvite: undefined } }, want: ['join-stamp-missing'] },
    { name: 'a URL of the wrong shape', painted: good.map((c) => (c.platform === 'Discord' ? { ...c, href: 'https://discord.gg/wx5S7YJSkU' } : c)), headings: goodHeadings, urls, want: ['join-channel-invented', 'join-channel-missing', 'join-order'] },
    { name: 'the order swapped', painted: [good[1], good[0], good[2], good[3]], headings: goodHeadings, urls, want: ['join-order'] },
    { name: 'a route the build does not emit', painted: good.map((c) => (c.kind === 'rsvp' ? { ...c, href: '/when' } : c)), headings: goodHeadings, urls, want: ['join-channel-invented', 'join-channel-missing', 'join-order'] },
    { name: 'a blind link with no human confirmation', painted: good, headings: goodHeadings, urls: { ...urls, _verified: { ...urls._verified, facebookGroup: { status: 400, verifiedAt: '2026-11-11' } } }, want: ['join-blind-link-unconfirmed'] },
  ];
  let bad = 0;
  for (const c of cases) {
    const got = joinFindings(c.painted, c.headings, c.urls, opts).map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(46)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
  }
  // The page's own painted bytes must be read by the same parser the selftest plants into: the fixture below
  // is the shape `join.astro` emits (attributes in any order, an sr-only span inside the anchor).
  const fixture = `<h2 id="join-social">Follow</h2><a href="${urls.meetupGroup}" target="_blank" data-control="primary" data-join-kind="social" data-join-platform="Meetup">Join the Meetup group<span class="sr-only"> Meetup, opens in a new tab</span></a>`;
  const parsed = paintedChannels(fixture);
  const parseOk = parsed.length === 1 && parsed[0].kind === 'social' && parsed[0].platform === 'Meetup' && parsed[0].text === 'Join the Meetup group Meetup, opens in a new tab';
  console.log(`${parseOk ? 'ok   parsed' : 'FAIL parsed'}  the parser reads what the page emits   ${JSON.stringify(parsed[0] ?? null)}`);
  if (!parseOk) bad++;
  const headsOk = paintedKindHeadings(fixture).join(',') === 'social';
  console.log(`${headsOk ? 'ok   parsed' : 'FAIL parsed'}  the heading parser reads the group id`);
  if (!headsOk) bad++;
  rmSync(FIX, { recursive: true, force: true });
  console.log(`\ncheck:join selftest — ${cases.length + 2} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ the real run

if (!existsSync(PAGE)) {
  console.error(`check:join: ${PAGE} missing — this gate reads the artifact a visitor's link lands on, so build first (npm run build).`);
  process.exit(1);
}
const html = readFileSync(PAGE, 'utf8');
const config = readJson(CONFIG, 'the stamped URLs every painted channel must come from');
const fails = joinFindings(paintedChannels(html), paintedKindHeadings(html), config.URLs, { pagePath: PAGE, today: new Date() });

const channels = joinChannels(config.URLs);
console.log(`check:join — ${PAGE}`);
console.log(`  ${channels.length} channel(s) in the resolver: ${channels.map((c) => `${c.kind}/${c.platform}`).join(', ')}`);
console.log(`  ${paintedChannels(html).length} painted, ${paintedKindHeadings(html).length} group heading(s): ${paintedKindHeadings(html).join(', ')}`);
for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
console.log(fails.length ? `\n${fails.length} finding(s).` : '\nEvery way in on /join is a channel the resolver has, at a URL its platform can have, with a stamp inside 60 days.');
process.exit(fails.length ? 1 : 0);
