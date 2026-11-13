#!/usr/bin/env node
/**
 * check:rsvp-page — the sign-up links on the painted page are the links the resolver says exist.
 *
 *   npm run check:rsvp-page                  # dist/client/index.html and dist/client/schedule/index.html
 *   npm run check:rsvp-page:selftest         # plant each defect, require each to FAIL (D118)
 *   node scripts/check-rsvp-page.mjs --dist <dir> [--snap <file>] [--discord <file>] [--events <file>] [--today YYYY-MM-DD]
 *
 * Why a page gate on top of `check:rsvp` (S019, D272). `check:rsvp` proves the *inputs* are fit: the Meetup
 * snapshot is dated and inside the window, every configured URL has been checked and answered. It cannot
 * prove what the page did with them. A component could stop calling `signUpPaths()` and print a hard-coded
 * group link under every row; a row could gain a Facebook link the config never declared; the cluster could
 * land on a date the schedule does not print. Those are painted-byte defects, and this repo's rule for a
 * painted fact is that a gate reads the bytes (D238: `check:schedule-window` reads `data-date` off the built
 * page rather than trusting the component that wrote it).
 *
 * Three things are compared, and none of them is the page's own claim about itself:
 *   1. **the hour.** `data-rsvp-hour` is checked against `data/events.json` — the painted hour must be a
      confirmed hour of a row on that date, or `unsettled` when no row on that date has one (D169). Reading the
      hour back out of the row's prose ("time not set") is exactly what D173 forbids, so the check goes to the
      snapshot instead of to the sentence.
   2. **the links.** Recomputed with `signUpPaths()` from `src/lib/rsvp.mjs` — the same function
      `src/components/SignUpLinks.astro` calls — from both event snapshots, the Meetup pages and the guild's
      own scheduled events. Order (Meetup, Discord, Facebook), one link per destination, the exact href, the
      accessible suffix, `target="_blank" rel="noopener noreferrer"`, nothing for a platform whose
      configured URL is empty, and a link for **every** platform the config declares in **every** printed
      cluster (D273: the label is the resolver's label, so a reworded link that no longer names the platform is
      a painted defect, not a copy choice; D280: a declared platform is a choice a visitor can make on every
      date, so a cluster that quietly drops one is the same class of defect as one that invents a platform).
   3. **the counts.** No headcount may reach the page (D265). `meetupView()` in the resolver is the projection
      that drops `going`; this gate is the other end of the rule and reads the bytes a visitor sees.
 *
 * What it does NOT do: reach the network. The freshness and liveness of the URLs is `check:rsvp`'s job
 * (`check:rsvp:links` is the network probe, deliberately outside `verify`). This gate is pure artifact
 * reading, so it runs in the deploy set right after `build`.
 *
 * Assumption written down: the cluster contains no nested `<div>`. `SignUpLinks.astro` emits spans and
 * anchors only; if that ever changes, the cluster regex below stops at the first `</div>` and the
 * "one cluster per printed row" count is what reports it.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  LINK_KEYS, PLATFORMS, PREF_KEY, SNAPSHOT_FRESH_DAYS, hourOf, signUpPaths,
} from '../src/lib/rsvp.mjs';
import { MARKS, MARK_COUNT, markId } from '../src/lib/platform-marks.mjs';
import { dateOf, scheduleWindow, todayInZone } from '../src/lib/event-window.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const argOne = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i < 0 ? dflt : args[i + 1];
};

const DIST = resolve(argOne('--dist', 'dist/client'));
const MEETUP_SNAP = resolve(argOne('--snap', 'data/meetup-events.json'));
const DISCORD_SNAP = resolve(argOne('--discord', 'data/discord-events.json'));
const EVENTS_SNAP = resolve(argOne('--events', 'data/events.json'));
const CONFIG = resolve(argOne('--config', 'src/config.json'));

const PAGES = [
  { name: 'homepage', file: resolve(DIST, 'index.html') },
  { name: '/schedule', file: resolve(DIST, 'schedule/index.html') },
];

/** Every `.html` the build emitted. A gate that keeps its own list of pages is a gate that goes stale the day a
 *  page is added (design/emitted-routes.mjs is the same lesson, applied here): the artifact is the source. */
function emittedHtml(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.endsWith('.html')) out.push(p);
    }
  }
  return out.sort();
}
const routeOf = (file) => {
  const rel = file.slice(DIST.length + 1);
  return rel === 'index.html' ? '/' : `/${rel.replace(/\/index\.html$/, '')}`;
};

/** A printed row or card: `<li ... data-surface="row|preview" data-date="YYYY-MM-DD">`. */
const SURFACE_RE = /<li[^>]*data-surface="(row|preview)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g;
/** The cluster the component paints inside it. */
const CLUSTER_RE = /<div[^>]*data-rsvp-cluster[\s\S]*?<\/div>/g;
/** An Astro island wrapper. `SignUpLinksCluster` is one (S022, D281): Astro server-renders it, so the bytes
 *  above come out of the component, and the same wrapper is what lets the browser reorder them. */
const ISLAND_RE = /<astro-island[^>]*>/g;
/** The platform sprite (S026, D294): the hidden `<svg>` whose `<symbol>`s every mark's `<use>` points at.
 *  Keyed on the attributes the sprite is built from rather than a class list, so an extra attribute on
 *  `PlatformMarks.astro` does not make the element invisible to this gate (D190). */
const SPRITE_RE = /<svg class="hidden" aria-hidden="true">[\s\S]*?<\/symbol>\s*<\/svg>/;
/** A headcount that got painted, in text or in an attribute (D265). Covers the Meetup `going` field, the
 *  Discord `user_count` the harvester never asks for, and any prose tally — an RSVP count can reach the page
 *  as an attribute or as a sentence, and both are the same rule. The second alternative is the form the site
 *  itself once printed: "280 on the Meetup list" is a count of people with a date attached to it, and a date
 *  on a number does not make it not a headcount (D276). */
const COUNT_RE = /data-(going|headcount|attendees|user-count|usercount|rsvp-count)|\b\d[\d,.]*\s+(going|people|attendees|members?|rsvp(?:s)?|sign-ups)\b|\b\d[\d,.]*\s+(on|in) the [a-z][a-z ]*list\b/i;

/** (F3(b), D294) A sprite is glyph bytes a page pays for whether or not it draws them. @measured 2026-11-13 by
 *  `node design/mark-cost.mjs` (Linux native, Node 24.22.1, gzip of the built page): +2,197 gzip on `/` and
 *  +2,191 on `/schedule`, both of which paint a cluster; a page that paints none would still pay — the
 *  counterfactual measured on `/chat` is +2,202 gzip, 41.6% of that page's 5,289 gzip bytes.
 *  Inlining the three glyphs instead costs +2,119/+2,121 gzip on a one-cluster page, so the sprite is the right
 *  shape for a page with two or more clusters and the wrong shape for a page with none. */
function spriteFindings(html, pageName) {
  const out = [];
  const ships = SPRITE_RE.test(html);
  const paints = /<use href="#(pm-[a-z0-9-]+)"/.test(html);
  if (ships && !paints) {
    out.push(`${pageName} ships the platform sprite and paints none of it — ${MARK_COUNT} glyph(s) of path data the page never draws (D294: the sprite costs +2,197 gzip @measured 2026-11-13 by design/mark-cost.mjs)`);
  }
  return out;
}

/** The age painted on a cluster is computed when the page is built; the gate recomputes it when it runs, so a
 *  build and a gate hours apart cannot agree to one decimal (measured 2026-11-11, Linux: a `dist/client` built
 *  2.4h before `node scripts/check-rsvp-page.mjs` painted 2.1 against the snapshot's 2.2, which is a clock
 *  gap, not a defect). 0.15 days is the slack between those two readings — it is not a licence for a stale
 *  snapshot, because `data-rsvp-snapshot` must equal the committed file's `fetchedAt` **exactly**, and
 *  `check:rsvp` fails the build over the 14-day limit before this gate ever sees the page. */
const AGE_SLACK_DAYS = 0.15;
const withinAge = (painted, actual) => {
  const n = Number(painted);
  return Number.isFinite(n) && Math.abs(n - actual) <= AGE_SLACK_DAYS;
};

/** Attribute map of a tag, tolerating bare attributes like `data-rsvp-cluster`. */
const attrsOf = (tag) => {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g)) out[m[1]] = m[2] ?? '';
  return out;
};

/** Split one cluster into its attributes, its links, and the text the cluster paints. */
const parseCluster = (clusterHtml) => {
  const open = clusterHtml.slice(0, clusterHtml.indexOf('>') + 1);
  const links = [...clusterHtml.matchAll(/<a[^>]*data-rsvp-platform[^>]*>[\s\S]*?<\/a>/g)].map((m) => {
    const tag = m[0].slice(0, m[0].indexOf('>') + 1);
    return {
      raw: m[0],
      tag,
      attrs: attrsOf(tag),
      text: m[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    };
  });
  return {
    attrs: attrsOf(open),
    links,
    text: clusterHtml.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
};

/** Every printed surface on a page, with the clusters inside it. */
const surfacesOf = (html) => {
  const found = [...html.matchAll(SURFACE_RE)];
  return found.map((m, i) => {
    const start = m.index;
    const end = i + 1 < found.length ? found[i + 1].index : html.length;
    const region = html.slice(start, end);
    return {
      surface: m[1],
      date: m[2],
      attrs: attrsOf(m[0]),
      clusters: [...region.matchAll(CLUSTER_RE)].map((c) => parseCluster(c[0])),
    };
  });
};

/**
 * The rules, as failures against one page's HTML. Pure: the selftest plants pages in memory and requires a
 * named failure for each defect, which is only possible if the verdict does not touch the filesystem.
 */
const pageFindings = (html, { meetupEvents, discordEvents, eventRows, urls, fetchedAt, age, discordFetchedAt, discordAge, today, pageName, chunks = {} }) => {
  const fails = [];
  const surfaces = surfacesOf(html);
  const clustersByIndex = [...html.matchAll(CLUSTER_RE)].map((m) => ({ index: m.index, ...parseCluster(m[0]) }));
  const clusters = clustersByIndex;

  // 1. Every date the page prints gets exactly one cluster, and no cluster floats on a date it printed no row for.
  if (!surfaces.length && clusters.length) {
    fails.push(`${pageName} paints a sign-up cluster with no printed date to attach it to`);
  } else if (surfaces.length && clusters.length !== surfaces.length) {
    fails.push(`${pageName} prints ${surfaces.length} date(s) and ${clusters.length} sign-up cluster(s) — a printed date must have exactly one, not zero and not two`);
  }
  if (!surfaces.length && !clusters.length) {
    fails.push(`${pageName} prints no date and no cluster: either the schedule is empty or its rows lost their data-surface/data-date handles`);
  }

  for (const s of surfaces) {
    if (s.clusters.length !== 1) {
      fails.push(`${pageName} row for ${s.date} has ${s.clusters.length} clusters (a printed date carries exactly one)`);
      continue;
    }
    const c = s.clusters[0];
    const at = c.attrs;

    // 2. The cluster belongs to the row that carries it.
    if (at['data-rsvp-date'] !== s.date) {
      fails.push(`${pageName} row ${s.date} carries a cluster stamped ${at['data-rsvp-date'] || '(no date)'} — the cluster must say the date of the row it is in`);
    }
    if (at['data-rsvp-date'] < today) {
      fails.push(`${pageName} cluster on ${at['data-rsvp-date']} is a date that has already passed (today is ${today})`);
    }

    // 3. The hour is the feed's hour, not the component's guess.
    const hoursOnDate = [...new Set(eventRows.filter((r) => dateOf(r) === s.date).map(hourOf).filter(Boolean))];
    const paintedHour = at['data-rsvp-hour'];
    if (!hoursOnDate.length) {
      if (paintedHour !== 'unsettled') fails.push(`${pageName} cluster on ${s.date} claims hour ${paintedHour} but no row on that date has a confirmed time (D169: an unsettled hour is painted "unsettled")`);
    } else if (!hoursOnDate.includes(paintedHour)) {
      fails.push(`${pageName} cluster on ${s.date} claims hour ${paintedHour || '(missing data-rsvp-hour)'}; the feed confirms ${hoursOnDate.join(' / ')}`);
    }

    // 4. Freshness, stated on the page and checked against the snapshot the build read.
    if (at['data-rsvp-snapshot'] !== fetchedAt) {
      fails.push(`${pageName} cluster says the snapshot is ${at['data-rsvp-snapshot'] || '(unstamped)'}; data/meetup-events.json says ${fetchedAt}`);
    }
    if (age !== null && !withinAge(at['data-rsvp-age'], age)) {
      fails.push(`${pageName} cluster says the snapshot is ${at['data-rsvp-age']} days old; the stamp says ${age.toFixed(1)}`);
    }
    if (age === null || age > SNAPSHOT_FRESH_DAYS) {
      fails.push(`${pageName} paints sign-up links from a snapshot ${age === null ? 'with no date' : `${age.toFixed(1)} days old`} (limit ${SNAPSHOT_FRESH_DAYS})`);
    }
    // The Discord half of the same rule (D274): a guild scheduled event is a page that appears and disappears
    // on the club's own schedule, so its snapshot ages under the identical 14-day limit.
    if (at['data-rsvp-discord-snapshot'] !== discordFetchedAt) {
      fails.push(`${pageName} cluster says the Discord snapshot is ${at['data-rsvp-discord-snapshot'] || '(unstamped)'}; data/discord-events.json says ${discordFetchedAt}`);
    }
    if (discordAge !== null && !withinAge(at['data-rsvp-discord-age'], discordAge)) {
      fails.push(`${pageName} cluster says the Discord snapshot is ${at['data-rsvp-discord-age']} days old; the stamp says ${discordAge.toFixed(1)}`);
    }
    if (discordAge === null || discordAge > SNAPSHOT_FRESH_DAYS) {
      fails.push(`${pageName} paints sign-up links from a Discord snapshot ${discordAge === null ? 'with no date' : `${discordAge.toFixed(1)} days old`} (limit ${SNAPSHOT_FRESH_DAYS})`);
    }

    // 5. The destinations, recomputed from the resolver.
    const paths = signUpPaths({ date: s.date, time: paintedHour === 'unsettled' ? null : paintedHour }, meetupEvents, urls, discordEvents);
    if (at['data-rsvp-state'] !== paths.state) {
      fails.push(`${pageName} cluster on ${s.date} is stamped state "${at['data-rsvp-state']}" but signUpPaths() returns "${paths.state}"`);
    }
    if (c.links.length !== paths.destinations.length) {
      fails.push(`${pageName} cluster on ${s.date} paints ${c.links.length} link(s); signUpPaths() returns ${paths.destinations.length} (${paths.destinations.map((d) => d.platform).join(', ') || 'none'})`);
    }
    paths.destinations.forEach((d, i) => {
      const link = c.links[i];
      if (!link) return;   // the count failure above already names it
      if (link.attrs['data-rsvp-platform'] !== d.platform) {
        fails.push(`${pageName} cluster on ${s.date}: link ${i + 1} is "${link.attrs['data-rsvp-platform']}", expected ${d.platform} (order is Meetup, Discord, Facebook)`);
      }
      if (link.attrs.href !== d.href) {
        fails.push(`${pageName} cluster on ${s.date}: ${d.platform} link goes to ${link.attrs.href}, the resolver says ${d.href}`);
      }
      if (link.attrs['data-rsvp-date'] !== s.date) {
        fails.push(`${pageName} cluster on ${s.date}: the ${d.platform} link is stamped ${link.attrs['data-rsvp-date'] || '(no date)'} — every link in a cluster carries that cluster's date`);
      }
      if (link.attrs.target !== '_blank') fails.push(`${pageName} ${d.platform} link on ${s.date} has no target="_blank"`);
      if (!/noopener/.test(link.attrs.rel) || !/noreferrer/.test(link.attrs.rel)) {
        fails.push(`${pageName} ${d.platform} link on ${s.date} leaves the site with rel="${link.attrs.rel || ''}" — a cross-site link needs rel="noopener noreferrer"`);
      }
      if (!link.raw.includes(`<span class="sr-only">${d.srOnly}</span>`)) {
        fails.push(`${pageName} ${d.platform} link on ${s.date} has no accessible name suffix "${d.srOnly}" (D273: a link whose visible label is an event title still has to name its platform to a screen reader)`);
      }
      if (!link.text.includes(d.label)) {
        fails.push(`${pageName} ${d.platform} link on ${s.date} paints "${link.text}" rather than the resolver's label "${d.label}"`);
      }
      // A quiet label, not a control (D139): the row is already one boundary.
      if (/data-control/.test(link.tag)) fails.push(`${pageName} ${d.platform} link on ${s.date} carries data-control — the sign-up cluster is DESIGN.md's quiet label, not a control`);

      // 5c. (F3(b), D294) Every painted link carries its own platform's mark, and the mark is the platform
      //     the link is for. A glyph of the wrong platform is a painted lie: the visitor reads the mark first.
      //     The browser gate (design/render-gate.mjs rule 4c) proves the mark is 16px and painted in the label's
      //     colour; this rule proves the identity, which a screenshot cannot.
      const uses = [...link.raw.matchAll(/<use href="#([a-z0-9-]+)"/g)];
      if (uses.length !== 1) {
        fails.push(`${pageName} ${d.platform} link on ${s.date} paints ${uses.length} platform mark(s) — F3(b) rules exactly one, drawn from the sprite (D294)`);
      } else if (uses[0][1] !== markId(d.platform)) {
        fails.push(`${pageName} ${d.platform} link on ${s.date} is marked #${uses[0][1]} — a mark must name the platform it points to (F3(b), D294)`);
      }
    });

    // 6. A platform the club has no verified URL for must not appear at all, whatever the component thinks.
    for (const link of c.links) {
      const platform = link.attrs['data-rsvp-platform'];
      const key = Object.keys(LINK_KEYS).find((k) => PLATFORMS[k] === platform);
      if (!key) { fails.push(`${pageName} cluster on ${s.date} paints a link for platform "${platform}", which src/lib/rsvp.mjs has no key for`); continue; }
      if (!urls[LINK_KEYS[key]]) fails.push(`${pageName} cluster on ${s.date} paints a ${platform} link while config.URLs.${LINK_KEYS[key]} is empty (D272: a closed platform is painted nowhere)`);
    }

    // 6b. The mirror of rule 6: a platform the config declares and check:rsvp has stamped must be painted on
    //     every printed date. A cluster that omits one is not an honest hole — the hole is a *date with no
    //     page*, and it is named in the note (rule 7). Dropping a chosen platform is a silent subtraction.
    const paintedPlatforms = new Set(c.links.map((l) => l.attrs['data-rsvp-platform']));
    for (const [platformKey, urlKey] of Object.entries(LINK_KEYS)) {
      const platform = PLATFORMS[platformKey];
      if (!urls[urlKey]) continue;                    // closed platform: rule 6 already forbids painting it
      if (!paintedPlatforms.has(platform)) {
        fails.push(`${pageName} cluster on ${s.date} prints no ${platform} link although config.URLs.${urlKey} declares one (D280: a declared platform is a choice a visitor can make on every date)`);
      }
    }

    // 7. An absence is a named state (DESIGN.md "States"), and the note is the name.
    if (paths.note && !c.text.includes(paths.note)) {
      fails.push(`${pageName} cluster on ${s.date} is state "${paths.state}" but never says "${paths.note}"`);
    }
    if (!paths.note && /no page|no sign-up page|different time/i.test(c.text)) {
      fails.push(`${pageName} cluster on ${s.date} says the Meetup page is missing while the resolver found one`);
    }
  }

  // 9. (S022, D281) Every cluster is painted by the island that can honour a remembered platform.
  //    The reorder is a browser fact, so the build has to prove two things about it: the cluster sits inside an
  //    Astro island (not plain markup), and the chunk Astro ships for that island is the one that reads
  //    localStorage. A component that stops being an island, or an island whose client directive is dropped,
  //    passes every order rule above — the server always paints canonical order — while quietly making the
  //    preference feature impossible.
  const islands = [...html.matchAll(ISLAND_RE)];
  for (const m of clustersByIndex) {
    const island = islands.filter((i) => i.index < m.index).pop();
    if (!island) {
      fails.push(`${pageName} cluster on ${m.attrs['data-rsvp-date'] || '(no date)'} is painted as plain markup, not inside a sign-up island — a cluster with no island can never lead with the platform a visitor keeps using (S022, D281)`);
      continue;
    }
    if (html.indexOf('</astro-island>', island.index) < m.index) {
      fails.push(`${pageName} cluster on ${m.attrs['data-rsvp-date'] || '(no date)'} is outside the island that opened before it — the cluster is not the island's content`);
      continue;
    }
    const at = attrsOf(island[0]);
    if (!at.client) {
      fails.push(`${pageName} sign-up island for ${m.attrs['data-rsvp-date'] || '(no date)'} has no client directive: it is server-rendered only, so no browser ever reorders it (S022)`);
      continue;
    }
    const chunk = at['component-url'] ? chunks[at['component-url']] : undefined;
    if (chunk === undefined) {
      fails.push(`${pageName} sign-up island for ${m.attrs['data-rsvp-date'] || '(no date)'} names no shipped chunk (${at['component-url'] || 'none'}) — the island has nothing to hydrate from`);
      continue;
    }
    if (!chunk.includes('localStorage')) {
      fails.push(`${pageName} sign-up island chunk ${at['component-url']} never touches localStorage, so a remembered platform cannot survive a page load (D281)`);
    }
    if (!chunk.includes(PREF_KEY)) {
      fails.push(`${pageName} sign-up island chunk ${at['component-url']} does not carry the preference key "${PREF_KEY}" — the resolver's key and the shipped key have drifted (D281)`);
    }
  }

  // 9b. (F3(b), D294) The sprite. Marks are path data, and path data is only ever as honest as the source
  //     that declared it: src/lib/platform-marks.mjs lists every platform the club has a mark for, with its
  //     source URL and licence. A page that paints a mark whose symbol it never ships is a broken glyph; a
  //     sprite whose path data drifted from the lib is a mark nobody licensed. Both are byte facts, so both
  //     are read here rather than eyeballed.
  const symbols = [...html.matchAll(/<symbol id="([a-z0-9-]+)"[^>]*>(?:\s*<path[^>]*d="([^"]*)"[^>]*>)?/g)];
  const declared = new Set(symbols.map((s) => s[1]));
  const paintedMarkIds = new Set([...html.matchAll(/<use href="#([a-z0-9-]+)"/g)].map((m) => m[1]));
  for (const id of paintedMarkIds) {
    if (!declared.has(id)) fails.push(`${pageName} paints #${id} but ships no <symbol id="${id}"> — the glyph resolves to nothing (F3(b), D294)`);
  }
  if (paintedMarkIds.size) {
    for (const m of MARKS) {
      const id = markId(m.platform);
      if (!declared.has(id)) { fails.push(`${pageName} paints marks but ships no sprite symbol for ${m.platform} (#${id}) although src/lib/platform-marks.mjs declares it (D294)`); continue; }
      const symbol = symbols.find((s) => s[1] === id);
      if (symbol[2] !== m.d) fails.push(`${pageName} sprite symbol #${id} carries path data the lib does not declare — the sprite and src/lib/platform-marks.mjs have drifted (D294)`);
    }
    if (declared.size !== MARK_COUNT) {
      fails.push(`${pageName} sprite declares ${declared.size} symbol(s); src/lib/platform-marks.mjs declares ${MARK_COUNT} platform marks (${[...declared].join(', ')})`);
    }
  }
  // 9c. (D294) The sprite only rides pages that draw it. `SignUpLinks.astro` emits it in front of the first
  //     cluster on the page, so a page with no cluster carries no glyph bytes.
  fails.push(...spriteFindings(html, pageName));

  // 8. No headcount reaches the page, in text or in an attribute (D265).
  const counts = [...html.matchAll(new RegExp(COUNT_RE.source, 'gi'))];
  if (counts.length) {
    fails.push(`${pageName} paints a headcount: ${counts.slice(0, 3).map((m) => `"${m[0]}"`).join(', ')} — the site prints dates, not attendance (D265)`);
  }

  return { surfaces, clusters, fails };
};

// ------------------------------------------------------------------------ selftest (D118)
if (selftest) {
  const FETCHED = '2026-11-09T06:42:38.507Z';
  const AGE = 1.7;
  const DISFETCHED = '2026-11-10T12:00:00.000Z';
  const DISAGE = 0.2;
  const TODAY = '2026-11-10';
  const urls = { meetupGroup: 'https://www.meetup.com/g', discordInvite: 'https://discord.com/invite/x', facebookGroup: 'https://www.facebook.com/groups/planted' };
  // The other half of the rule: a platform the club has closed is painted nowhere (rule 6), so the selftest
  // needs a page built with an empty declaration as well as one built with a declared platform.
  const closedUrls = { ...urls, facebookGroup: '' };
  const meetup = [
    { id: '1', url: 'https://www.meetup.com/g/events/111/', date: '2026-11-11', time: '18:00', status: 'ACTIVE', title: 'Proofs' },
    { id: '2', url: 'https://www.meetup.com/g/events/222/', date: '2026-11-21', time: '12:00', status: 'ACTIVE', title: 'Puzzles' },
    { id: '3', url: 'https://www.meetup.com/g/events/333/', date: '2026-11-11', time: '19:00', status: 'ACTIVE', title: 'Late' },
    { id: '4', url: 'https://www.meetup.com/g/events/444/', date: '2026-11-25', time: null, status: 'ACTIVE', title: 'No hour' },
    { id: '5', url: 'https://www.meetup.com/g/events/555/', date: '2026-11-01', time: '18:00', status: 'PAST', title: 'Past' },
    { id: '6', url: 'https://www.meetup.com/g/events/not-a-page', date: '2026-11-28', time: '18:00', status: 'ACTIVE', title: 'Bad shape' },
    { id: '7', url: 'https://www.meetup.com/g/events/777/', date: '2026-11-11', time: '18:00', status: 'ACTIVE', title: 'Second page, same hour' },
  ];
  const discord = [
    { id: 'd1', url: 'https://discord.com/events/111/222/', date: '2026-11-11', time: '18:00', status: 1, title: 'Study session' },
    { id: 'd2', url: 'https://discord.com/events/111/333/', date: '2026-11-21', time: '12:00', status: 2, title: 'Second guild event' },
    { id: 'd3', url: 'https://discord.com/events/111/444/', date: '2026-11-28', time: '18:00', status: 3, title: 'Completed session' },
    { id: 'd4', url: 'https://discord.com/invite/x', date: '2026-11-25', time: '18:00', status: 1, title: 'Wrong shape' },
    { id: 'd5', url: 'https://discord.com/events/111/555/', date: null, time: null, status: 1, title: 'Undated' },
  ];
  const rows = [
    { start: '2026-11-11T18:00:00', timeConfirmed: true },
    { start: '2026-11-21T12:00:00', timeConfirmed: true },
    { start: '2026-11-25T18:00:00', timeConfirmed: false },
    { start: '2026-11-28T18:00:00', timeConfirmed: true },
  ];
  // The island Astro really emits (measured 2026-11-11 against dist/client/index.html): `component-url` names
  // the shipped chunk, `client="visible"` is what makes it hydrate, and the props are HTML-escaped JSON.
  const ISLAND_CHUNK = '/_astro/SignUpLinksCluster.planted.js';
  const island = (cluster, chunk = ISLAND_CHUNK, client = 'visible') =>
    `<astro-island uid="planted" component-url="${chunk}" component-export="default" renderer-url="/_astro/client.svelte.planted.js" props="{}" ssr${client ? ` client="${client}"` : ''} opts="{&quot;name&quot;:&quot;SignUpLinksCluster&quot;,&quot;value&quot;:true}" await-children><!--[-->${cluster}<!--]--></astro-island>`;
  const shippedChunk = `const KEY="${PREF_KEY}"; function reorder(list,p){ return p ? [list.find(d=>d.platform===p), ...list.filter(d=>d.platform!==p)] : list; } localStorage.getItem(KEY);`;

  // Byte-faithful to SignUpLinks.astro, so a planting tests the rules and not a paraphrase of the markup.
  const clusterHtml = (item, mut = {}, us = urls) => {
    const p = signUpPaths(item, meetup, us, discord);
    const a = {
      'data-rsvp-state': mut.state ?? p.state,
      'data-rsvp-date': mut.date ?? p.date,
      'data-rsvp-hour': mut.hour ?? (p.hour ?? 'unsettled'),
      'data-rsvp-snapshot': mut.snapshot ?? FETCHED,
      'data-rsvp-age': mut.age ?? AGE.toFixed(1),
      'data-rsvp-discord-snapshot': mut.discordSnapshot ?? DISFETCHED,
      'data-rsvp-discord-age': mut.discordAge ?? DISAGE.toFixed(1),
    };
    const attrs = Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');
    const links = (mut.links ?? p.destinations).map((d) => {
      const platform = d.platform ?? '';
      const href = d.href ?? 'https://example.com/';
      const rel = d.rel ?? 'noopener noreferrer';
      const target = d.target ?? '_blank';
      const sr = d.srOnly === undefined ? ` on ${platform}, opens in a new tab` : d.srOnly;
      return `<a href="${href}" target="${target}" rel="${rel}" data-rsvp-platform="${platform}" data-rsvp-date="${p.date}"><svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><use href="#${markId(platform)}"></use></svg>${d.label ?? 'Details and sign-up'}${sr ? ` <span class="sr-only">${sr}</span>` : ''}<span aria-hidden="true">→</span></a>`;
    }).join('');
    const note = (mut.note === null ? '' : p.note) ? `<p class="text-label text-ink-3">${mut.note ?? p.note}</p>` : '';
    return `<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1" data-rsvp-cluster ${attrs}>${note}${links}</div>`;
  };
  // The sprite SignUpLinks.astro ships: the same lib, the same ids, the same path data (D294).
  const sprite = () => `<svg class="hidden" aria-hidden="true">${MARKS.map((m) => `<symbol id="${markId(m.platform)}" viewBox="0 0 24 24"><path d="${m.d}"/></symbol>`).join('')}</svg>`;
  const page = (rows, extra = '', us = urls) =>
    `${sprite()}<main><ul class="space-y-4">${rows.map(([date, hour]) => `<li class="rounded-card" data-surface="row" data-date="${date}"><div data-copy><p>${date}</p>${island(clusterHtml({ date, time: hour }, {}, us))}</div></li>`).join('')}</ul>${extra}</main>`;

  const clean = page([['2026-11-11', '18:00'], ['2026-11-21', '12:00']]);
  const ctx = { meetupEvents: meetup, discordEvents: discord, eventRows: rows, urls, fetchedAt: FETCHED, age: AGE, discordFetchedAt: DISFETCHED, discordAge: DISAGE, today: TODAY, pageName: 'planted page', chunks: { [ISLAND_CHUNK]: shippedChunk } };

  const cases = [
    { name: 'a page the resolver agrees with', html: clean, ctx, want: [] },
    { name: 'a printed row with no cluster at all', html: clean.replace(clusterHtml({ date: '2026-11-21', time: '12:00' }), ''), ctx, want: ['sign-up cluster'] },
    { name: 'a row whose cluster carries a different date', html: clean.replace(clusterHtml({ date: '2026-11-21', time: '12:00' }), clusterHtml({ date: '2026-11-11', time: '12:00' }, { date: '2026-11-11' })), ctx, want: ['cluster stamped'] },
    { name: 'a cluster whose hour the feed never confirmed', html: clean.replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), clusterHtml({ date: '2026-11-11', time: '18:00' }, { hour: '20:00' })), ctx, want: ['claims hour 20:00'] },
    { name: 'an unsettled hour painted as a settled one', html: page([['2026-11-25', '18:00']]), ctx, want: ['no row on that date has a confirmed time'] },
    { name: 'the note a missing page must state, stated nowhere', html: page([['2026-11-28', '18:00']]).replace(`<p class="text-label text-ink-3">${signUpPaths({ date: '2026-11-28', time: '18:00' }, meetup, urls, discord).note}</p>`, ''), ctx, want: ['never says']},
    { name: 'a note claiming a missing page where the resolver found one', html: page([['2026-11-21', '12:00']]).replace('data-rsvp-discord-age="0.2">', 'data-rsvp-discord-age="0.2"><p class="text-label text-ink-3">No sign-up page for this date yet — ask in the chat.</p>'), ctx, want: ['says the Meetup page is missing while the resolver found one']},
    { name: 'a state stamp that disagrees with the resolver', html: clean.replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), clusterHtml({ date: '2026-11-11', time: '18:00' }, { state: 'none' })), ctx, want: ['state "none" but signUpPaths'] },
    { name: 'two Meetup pages on one hour printed as a single link', html: page([['2026-11-11', '18:00']]).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), (() => { const p = signUpPaths({ date: '2026-11-11', time: '18:00' }, meetup, urls, discord); return clusterHtml({ date: '2026-11-11', time: '18:00' }, { links: p.destinations.slice(0, 1) }); })()), ctx, want: ['paints 1 link(s)', 'returns 4']},
    { name: 'the Facebook link quietly dropped from a row', html: page([['2026-11-11', '18:00']]).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), (() => { const p = signUpPaths({ date: '2026-11-11', time: '18:00' }, meetup, urls, discord); return clusterHtml({ date: '2026-11-11', time: '18:00' }, { links: p.destinations.filter((d) => d.platform !== PLATFORMS.facebook) }); })()), ctx, want: ['prints no Facebook link although config.URLs.facebookGroup declares one']},
    { name: 'the Facebook link sent to a group page instead of the group', html: page([['2026-11-11', '18:00']]).replace('https://www.facebook.com/groups/planted', 'https://www.facebook.com/groups/planted/events/999/'), ctx, want: ['Facebook link goes to https://www.facebook.com/groups/planted/events/999/', 'the resolver says https://www.facebook.com/groups/planted']},
    { name: 'the Discord link before the Meetup link', html: page([['2026-11-11', '18:00']]).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), (() => { const p = signUpPaths({ date: '2026-11-11', time: '18:00' }, meetup, urls, discord); return clusterHtml({ date: '2026-11-11', time: '18:00' }, { links: [p.destinations[2], ...p.destinations.slice(0, 2)] }); })()), ctx, want: ['order is Meetup, Discord, Facebook']},
    { name: 'a link to a Meetup page on the wrong date', html: page([['2026-11-11', '18:00']]).replace('https://www.meetup.com/g/events/111/', 'https://www.meetup.com/g/events/222/'), ctx, want: ['the resolver says'] },
    { name: 'a Facebook link painted for a platform the club closed', html: page([['2026-11-11', '18:00']], '', closedUrls).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }, {}, closedUrls), (() => { const p = signUpPaths({ date: '2026-11-11', time: '18:00' }, meetup, closedUrls, discord); return clusterHtml({ date: '2026-11-11', time: '18:00' }, { links: [...p.destinations, { platform: 'Facebook', href: 'https://www.facebook.com/groups/g', label: 'Ask in the group', srOnly: ' on Facebook, opens in a new tab' }] }, closedUrls); })()), ctx: { ...ctx, urls: closedUrls }, want: ['config.URLs.facebookGroup is empty'] },
    { name: 'a link with no accessible name suffix', html: page([['2026-11-11', '18:00']]).replace('<span class="sr-only"> on Meetup, opens in a new tab</span>', ''), ctx, want: ['no accessible name suffix', 'opens in a new tab'] },
    { name: 'a cross-site link without rel="noopener noreferrer"', html: page([['2026-11-11', '18:00']]).replace('rel="noopener noreferrer"', 'rel="noopener"'), ctx, want: ['rel="noopener"'] },
    { name: 'a cluster stamped with a snapshot the build did not read', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-snapshot="2026-11-09T06:42:38.507Z" data-rsvp-age="1.7"', 'data-rsvp-snapshot="2026-10-01T00:00:00.000Z" data-rsvp-age="40.1"'), ctx, want: ['cluster says the snapshot is 2026-10-01T00:00:00.000Z'] },
    { name: 'an age painted 3.7 days off while the snapshot stamp is correct', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-age="1.7"', 'data-rsvp-age="5.4"'), ctx, want: ['says the snapshot is 5.4 days old; the stamp says 1.7']},
    { name: 'links painted from a snapshot past the freshness window', html: `<main><ul><li class="rounded-card" data-surface="row" data-date="2026-11-11">${island(clusterHtml({ date: '2026-11-11', time: '18:00' }, { snapshot: '2026-10-01T00:00:00.000Z', age: '40.1' }))}</li></ul></main>`, ctx: { ...ctx, fetchedAt: '2026-10-01T00:00:00.000Z', age: 40.1 }, want: ['snapshot 40.1 days old (limit 14'] },
    { name: 'a headcount painted in the cluster', html: page([['2026-11-11', '18:00']]).replace('Proofs <span class="sr-only">', '12 going <span class="sr-only">'), ctx, want: ['paints a headcount']},
    { name: 'the roster tally the join band used to print, painted again', html: `${clean}<section class="mt-8"><p>280 on the Meetup list — counted Nov 3, 2026, and that is the list, not the room.</p></section>`, ctx, want: ['paints a headcount', '280 on the Meetup list']},
    { name: 'a member count painted as prose', html: `${clean}<section class="mt-8"><p>The club has 142 members.</p></section>`, ctx, want: ['paints a headcount', '142 members']},
    { name: 'an RSVP tally painted where a Discord link is', html: page([['2026-11-11', '18:00']]).replace('Sign up on Discord', 'Sign up on Discord (14 RSVPs)'), ctx, want: ['paints a headcount', '14 RSVPs']},
    { name: 'a headcount painted in an attribute', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-cluster', 'data-rsvp-cluster data-going="12"'), ctx, want: ['headcount']},
    { name: 'a Discord user_count painted in an attribute', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-discord-snapshot', 'data-user-count="7" data-rsvp-discord-snapshot'), ctx, want: ['headcount', 'user-count']},
    { name: 'the guild event link dropped while the snapshot has one', html: page([['2026-11-11', '18:00']]).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), (() => { const p = signUpPaths({ date: '2026-11-11', time: '18:00' }, meetup, urls, discord); return clusterHtml({ date: '2026-11-11', time: '18:00' }, { links: p.destinations.filter((d) => d.platform !== 'Discord') }); })()), ctx, want: ['paints 3 link(s)', 'returns 4']},
    { name: 'the Discord event page replaced by the bare invite', html: page([['2026-11-11', '18:00']]).replace('https://discord.com/events/111/222/', 'https://discord.com/invite/x'), ctx, want: ['Discord link goes to https://discord.com/invite/x', 'the resolver says https://discord.com/events/111/222/']},
    { name: 'a completed guild event painted as a sign-up path', html: page([['2026-11-28', '18:00']]).replace(clusterHtml({ date: '2026-11-28', time: '18:00' }), (() => { const p = signUpPaths({ date: '2026-11-28', time: '18:00' }, meetup, urls, discord); return clusterHtml({ date: '2026-11-28', time: '18:00' }, { links: [...p.destinations, { platform: 'Discord', href: 'https://discord.com/events/111/444/', label: 'Sign up on Discord', srOnly: 'Discord, opens in a new tab' }] }); })()), ctx, want: ['paints 4 link(s)', 'returns 3 (Meetup, Discord, Facebook)']},
    { name: 'a cluster stamped with a Discord snapshot the build did not read', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-discord-snapshot="2026-11-10T12:00:00.000Z"', 'data-rsvp-discord-snapshot="2026-10-01T00:00:00.000Z"'), ctx, want: ['Discord snapshot is 2026-10-01T00:00:00.000Z']},
    { name: 'Discord links painted from a guild snapshot past the freshness window', html: page([['2026-11-11', '18:00']]).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), clusterHtml({ date: '2026-11-11', time: '18:00' }, { discordSnapshot: '2026-10-01T00:00:00.000Z', discordAge: '40.1' })), ctx: { ...ctx, discordFetchedAt: '2026-10-01T00:00:00.000Z', discordAge: 40.1 }, want: ['Discord snapshot 40.1 days old (limit 14']},
    { name: 'the cluster promoted to a control', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-platform="Meetup"', 'data-rsvp-platform="Meetup" data-control="signup"'), ctx, want: ['quiet label, not a control'] },
    // Rule 5c / 9b: the platform mark (F3(b), D294).
    { name: 'a sign-up link painted without its platform mark', html: page([['2026-11-11', '18:00']]).replace('<svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><use href="#pm-meetup"></use></svg>', ''), ctx, want: ['paints 0 platform mark(s)'] },
    { name: 'the Meetup link marked with the Discord glyph', html: page([['2026-11-11', '18:00']]).replace('<use href="#pm-meetup"></use>', '<use href="#pm-discord"></use>'), ctx, want: ['is marked #pm-discord — a mark must name the platform it points to'] },
    { name: 'a mark whose symbol the page never ships', html: page([['2026-11-11', '18:00']]).replace('<symbol id="pm-meetup" viewBox="0 0 24 24"><path d="', '<symbol id="pm-unused" viewBox="0 0 24 24"><path d="'), ctx, want: ['paints #pm-meetup but ships no <symbol id="pm-meetup">'] },
    { name: 'sprite path data that drifted from the lib', html: page([['2026-11-11', '18:00']]).replace(/<symbol id="pm-meetup"[^>]*><path d="[^"]*"/, '<symbol id="pm-meetup" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"'), ctx, want: ['path data the lib does not declare'] },
    { name: 'a cluster painted with no sprite in the document at all', html: page([['2026-11-11', '18:00']]).replace(/<svg class="hidden" aria-hidden="true">[\s\S]*?<\/symbol>\s*<\/svg>/, ''), ctx, want: ['paints marks but ships no sprite symbol for Meetup'] },
    { name: 'a sprite shipped to a page that paints no mark', html: `${sprite()}<main><p>Nothing on the calendar yet.</p></main>`, ctx, want: ['ships the platform sprite and paints none of it'] },
    { name: 'a cluster floating with no printed row', html: `<main>${island(clusterHtml({ date: '2026-11-11', time: '18:00' }))}</main>`, ctx, want: ['no printed date to attach it to'] },
    { name: 'a cluster on a date already past', html: page([['2026-11-01', '18:00']]).replace(/data-rsvp-state="none"/, 'data-rsvp-state="none"'), ctx, want: ['already passed'] },
    // Rule 9: the island that makes the remembered platform possible (S022, D281).
    { name: 'the sign-up cluster painted as plain markup, not as an island', html: page([['2026-11-11', '18:00']]).replace(island(clusterHtml({ date: '2026-11-11', time: '18:00' })), clusterHtml({ date: '2026-11-11', time: '18:00' })), ctx, want: ['painted as plain markup, not inside a sign-up island'] },
    { name: 'an island with no client directive', html: page([['2026-11-11', '18:00']]).replace(island(clusterHtml({ date: '2026-11-11', time: '18:00' })), island(clusterHtml({ date: '2026-11-11', time: '18:00' }), ISLAND_CHUNK, '')), ctx, want: ['no client directive: it is server-rendered only'] },
    { name: 'an island whose shipped chunk never reads localStorage', html: page([['2026-11-11', '18:00']]).replace(island(clusterHtml({ date: '2026-11-11', time: '18:00' })), island(clusterHtml({ date: '2026-11-11', time: '18:00' }), '/_astro/SignUpLinksCluster.stripped.js')), ctx: { ...ctx, chunks: { '/_astro/SignUpLinksCluster.stripped.js': 'function reorder(list,p){return list}' } }, want: ['never touches localStorage'] },
    { name: 'an island whose shipped chunk carries a different preference key', html: page([['2026-11-11', '18:00']]).replace(island(clusterHtml({ date: '2026-11-11', time: '18:00' })), island(clusterHtml({ date: '2026-11-11', time: '18:00' }), '/_astro/SignUpLinksCluster.oldkey.js')), ctx: { ...ctx, chunks: { '/_astro/SignUpLinksCluster.oldkey.js': 'const KEY="old-rsvp-key"; localStorage.getItem(KEY);' } }, want: ['preference key "matheapolis-rsvp-platform" — the resolver'] },
  ];

  let bad = 0;
  for (const c of cases) {
    const { fails } = pageFindings(c.html, c.ctx);
    if (c.want.length === 0 && fails.length === 0) { console.log(`ok    ${c.name}`); continue; }
    if (c.want.length === 0) { bad++; console.log(`FAIL  "${c.name}" should pass but failed: ${fails[0]}`); continue; }
    const hit = fails.find((f) => c.want.every((w) => f.includes(w)));
    if (hit) console.log(`ok    planting "${c.name}" -> ${hit}`);
    else { bad++; console.log(`FAIL  planting "${c.name}" produced ${fails.length} failure(s), none naming "${c.want.join(' + ')}": ${fails.map((f) => `"${f}"`).join(' | ') || 'nothing'}`); }
  }
  console.log(`check:rsvp-page selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------------ the live check
const readJson = (p, hint) => {
  if (!existsSync(p)) {
    console.error(`check:rsvp-page: ${p} missing — ${hint}`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`check:rsvp-page: ${p} is not readable JSON: ${e.message}`);
    process.exit(1);
  }
};

const meetupSnap = readJson(MEETUP_SNAP, 'run node scripts/meetup-events.mjs --write');
const discordSnap = readJson(DISCORD_SNAP, 'run npm run events:discord (writes data/discord-events.json)');
const events = readJson(EVENTS_SNAP, 'run npm run events:harvest');
const config = readJson(CONFIG, 'src/config.json is the link map');

const urls = config.URLs ?? {};
const fetchedAt = meetupSnap.source?.fetchedAt ?? null;
const age = fetchedAt ? (Date.now() - Date.parse(fetchedAt)) / 86400000 : null;
const discordFetchedAt = discordSnap.source?.fetchedAt ?? null;
const discordAge = discordFetchedAt ? (Date.now() - Date.parse(discordFetchedAt)) / 86400000 : null;
const today = argOne('--today', todayInZone(events.calendar?.timezone ?? 'America/Chicago'));

let total = 0;
for (const page of PAGES) {
  if (!existsSync(page.file)) {
    console.error(`check:rsvp-page: ${page.file} missing — run npm run build first`);
    process.exit(1);
  }
  const html = readFileSync(page.file, 'utf8');
  // The island chunks this page actually references, read from the dist that produced it (rule 9).
  const chunks = {};
  for (const m of html.matchAll(ISLAND_RE)) {
    const url = attrsOf(m[0])['component-url'];
    if (!url || url in chunks) continue;
    const file = resolve(DIST, url.replace(/^\/+/, ''));
    chunks[url] = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
  }
  const { surfaces, clusters, fails } = pageFindings(html, {
    meetupEvents: meetupSnap.events ?? [], discordEvents: discordSnap.events ?? [], eventRows: events.events ?? [], urls,
    fetchedAt, age, discordFetchedAt, discordAge, today, pageName: page.name, chunks,
  });
  if (fails.length) {
    for (const f of fails) console.log(`FAIL  ${f}`);
    total += fails.length;
    console.log(`check:rsvp-page: ${page.name} — ${fails.length} failure(s)`);
    continue;
  }
  const states = surfaces.map((s) => s.clusters[0]?.attrs['data-rsvp-state'] ?? '?');
  const links = clusters.flatMap((c) => c.links.map((l) => l.attrs['data-rsvp-platform']));
  const window = scheduleWindow(events.events ?? [], today);
  const inWindow = surfaces.filter((s) => window.shown.map(dateOf).includes(s.date)).length;
  console.log(`ok    ${page.name}: ${surfaces.length} printed date(s), ${clusters.length} cluster(s), ${links.length} sign-up link(s) [${links.join(', ') || 'none'}], states ${states.join('/')}; ${inWindow} of them inside the schedule window`);
}

// (D294) Every other emitted page: the sprite is path data, and path data is only worth shipping on a page that
// draws it. The two cluster pages above are already read by pageFindings, so this loop covers the rest of the
// artifact — /chat, /404 and whatever page a future session adds.
for (const file of emittedHtml(DIST)) {
  if (PAGES.some((p) => p.file === file)) continue;
  const html = readFileSync(file, 'utf8');
  const fails = spriteFindings(html, routeOf(file));
  if (fails.length) {
    for (const f of fails) console.log(`FAIL  ${f}`);
    total += fails.length;
    continue;
  }
  const marks = [...html.matchAll(/<use href="#(pm-[a-z0-9-]+)"/g)].length;
  console.log(`ok    ${routeOf(file)}: ${marks} mark(s) painted, sprite ${SPRITE_RE.test(html) ? 'present' : 'not needed'}`);
}

if (total) {
  console.log(`check:rsvp-page: ${total} failure(s) across the built pages`);
  process.exit(1);
}
console.log(`ok    every painted cluster equals what signUpPaths() returns for the date it sits on (D272)`);
console.log(`ok    no headcount in the painted bytes of either page (the projection in src/lib/rsvp.mjs is what keeps it out)`);
