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
   2. **the links.** Recomputed with `signUpPaths()` from `src/lib/rsvp.mjs` — the same function the
      components call — from both event snapshots, the Meetup pages and the guild's own scheduled events, and
      then **split** the way the components split it (D-B, round-4 §6, `splitPaths` in that module): a printed
      row carries the per-date half (`splitPaths(p, urls).row`, one anchor) and the page carries the standing half
      (`splitPaths(p, urls).standing`) exactly once, after the last row — that standing half is **deduped** against
      the site's exit band (`EXIT_BAND_PLATFORMS` in that module, round-4 §10's ceiling), so an exit the band
      paints is not painted a second time under the rows. Order in the standing row is the resolver's; the exact href,
      the accessible suffix, `target="_blank" rel="noopener noreferrer"`, nothing for a platform whose
      configured URL is empty, and a link for **every** platform the config declares — Meetup from the rows,
      the band's two exits from the band (rule 6c), and everything else from the standing row (D273: the label
      is the resolver's label, so a reworded link that no longer names the platform is a painted defect, not a
      copy choice; D280: a declared platform is a choice a visitor can make, so a surface that quietly drops one
      is the same class of defect as one that invents a platform).
   4. **the band and the ceiling** (2026-11-15, round-4 §6 and §10). The exit band owns the club-wide exits,
      carries a handle for exactly `EXIT_BAND_PLATFORMS`, paints the URL `src/config.json` declares for each of
      them, and no cross-site anchor outside it repeats one of those URLs — which is what makes the brief's
      "no page contains more than six outbound links outside the footer" a checked invariant rather than a
      number somebody looked at once. An internal route (`/events.ics`) is not an exit and is not counted, the
      same class `check:ext-links` already draws (S041).
   3. **the counts.** No headcount may reach the page (D265). `meetupView()` in the resolver is the projection
      that drops `going`; this gate is the other end of the rule and reads the bytes a visitor sees.
 *
 * What it does NOT do: reach the network. The freshness and liveness of the URLs is `check:rsvp`'s job
 * (`check:rsvp:links` is the network probe, deliberately outside `verify`). This gate is pure artifact
 * reading, so it runs in the deploy set right after `build`.
 *
 * Assumption written down: the cluster contains no nested `<div>`. `SignUpLinks.astro` emits spans and
 * anchors only; if that ever changes, the cluster regex below stops at the first `</div>` and the
 * "exactly one standing cluster per page" count is what reports it.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  LINK_KEYS, PLATFORMS, PREF_KEY, SNAPSHOT_FRESH_DAYS, hourOf, signUpPaths, newTabQualifier,
  ROW_PRIMARY_PLATFORM, splitPaths, EXIT_BAND_PLATFORMS, exitBandUrls,
} from '../src/lib/rsvp.mjs';
import { MARKS, MARK_COUNT, markId } from '../src/lib/platform-marks.mjs';
import { dateOf, scheduleWindow, todayInZone, isPast } from '../src/lib/event-window.mjs';

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
const CONTENT = resolve(argOne('--content', 'src/content.json'));

const PAGES = [
  // `dates: false` is a contract, not a description: since D306 the homepage prints no date (its one date moved
  // off the pitch when the operator's `/join` objective made `/dates` the only dated surface — the route moved
  // from `/schedule` under D373), and a homepage
  // that starts printing one again fails here as well as in `check:dated-surfaces`.
  { name: 'homepage', file: resolve(DIST, 'index.html'), dates: false },
  { name: '/dates', file: resolve(DIST, 'dates/index.html'), dates: true },
  // D374 (round-5 read Batch D half 2): `/past` is ruled to print dates, and its rows carry `data-surface="past-row"`,
  // which the row rules above do not read. `dates: false` is that contract stated in the entry rather than a flag
  // the rules guess: an upcoming-style row on the past page is the failure of this gate's row rules, and rule 10 is
  // what checks the handle this page does use.
  { name: '/past', file: resolve(DIST, 'past/index.html'), dates: false, past: true },
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

/** A printed row or card, as its **whole element** (D-B, round-4 §6): the region a row owns is its own
 *  `</li>`, not everything up to the next row. Before the split, a cluster lived inside the row and the
 *  slice-to-next-row parser was fine; now the standing cluster sits after the last `</li>` and the old slice
 *  would read it as the last row's. Same element span `scripts/check-row-geometry.mjs` matches, so the two
 *  gates cannot disagree about what a row is (D264). */
const SURFACE_RE = /<li\b[^>]*data-surface="(row|preview)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>[\s\S]*?<\/li>/g;
/** A date on the **past** surface (D374). It is deliberately not the handle above: `EventRow.astro`'s rules
 *  (leaf, capped prose, one sign-up primary) are about a date a visitor can still act on, and a meeting
 *  that has finished offers no sign-up page. Rule 10 below owns this handle, and the two handles are how
 *  one gate states two contracts instead of bending one contract to cover both halves of the calendar. */
const PAST_RE = /<li\b[^>]*data-surface="past-row"[^>]*>/g;
/** The cluster the component paints inside it. */
const CLUSTER_RE = /<div[^>]*data-rsvp-cluster[\s\S]*?<\/div>/g;
/** The site's exit band — the same first `<footer>` `scripts/check-page-exit.mjs` calls the ratified band.
 *  Two gates reading two different "footer"s is two ceilings on one page; the string is the pair of tokens,
 *  so the element span is written once in each gate's own words and matched the same way (D264). */
const BAND_RE = /<footer\b[\s\S]*?<\/footer>/;
/** Round-4 brief §10 (2026-11-15): "no page contains more than six outbound links outside the footer".
 *  Counted cross-site, which is the class `check:ext-links` already draws around an exit (S041: an internal
 *  route is not an exit), so the club's own `/events.ics` is not one of the six. */
const OUTSIDE_BAND_LIMIT = 6;
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
/** D406 (round-6 communication review, 2026-11-16, Home/Add "one number about the room"): a tally written
 *  IN WORDS is the same headcount as one written in digits. The review's own recommendation - "usually
 *  six to twelve people" - is spelled out, and COUNT_RE above matches only digits, so the sentence this
 *  round ships would have walked past the gate that exists for attendance figures. This is an invariant
 *  change, not a new permission: the probe for a painted headcount is the SLOT. `src/content.json`'s
 *  `turnout` slot is the one headcount the site is allowed to paint, and it carries a `source` and an
 *  `asOf`; the exemption below is that slot's OWN WORDS, read out of the file rather than remembered. So
 *  "six to twelve people" painted from `turnout` passes, "Twelve people come on most nights" typed into a
 *  component fails, and so does the digits form of a tally nobody sourced (D265, D276: a date on a number
 *  does not make it not a headcount).
 *
 *  The gap between the number word and the noun excludes `<`, `>` and `.` on purpose: a spelled tally is one
 *  run of prose inside one sentence, so "five" in one element and "people" in the next is not a tally. */
const SPELL_RE = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b[^.<>]{0,24}?\b(?:people|persons?|attendees?|members?|going|sign-?ups?|rsvps?)\b/i;
/** The words a sourced slot carries - the only tallies this gate lets reach a page. A slot VALUE only, never
 *  its `source` prose: `content.membership` sources "280 members" and "about ten regular attendees", and D265
 *  forbids both on a page. A source that names a number is not permission to paint it. */
const sourcedSlotValues = (() => {
  const parsed = JSON.parse(readFileSync(CONTENT, 'utf8'));
  return Object.values(parsed)
    .filter((slot) => typeof slot === 'object' && typeof slot?.value === 'string' && slot.source && slot.asOf)
    .map((slot) => String(slot.value).toLowerCase());
})();
const paintedFromSource = (hit) => sourcedSlotValues.some((v) => v.includes(String(hit).toLowerCase()));

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

/** A sign-up anchor — the row's primary, one of the standing row's, or one of the exit band's: parsed the
 *  same way wherever it is found, so the row rules, the cluster rules and the band rules cannot disagree about
 *  one anchor (D264). */
const linkOf = (a) => {
  const tag = a.slice(0, a.indexOf('>') + 1);
  return {
    raw: a,
    tag,
    attrs: attrsOf(tag),
    text: a.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
};
const ANCHOR_RE = /<a[^>]*data-rsvp-platform[^>]*>[\s\S]*?<\/a>/g;
const linksOf = (html) => [...html.matchAll(ANCHOR_RE)].map((m) => linkOf(m[0]));
/** A cross-site anchor, whatever it carries: the ceiling counts **exits**, so it counts anchors that leave the
 *  site rather than anchors that name a sign-up platform (a nav link to a group page is still an exit).
 *  `check:ext-links` owns their grammar; this counts them, and an internal route (`/events.ics`) is not one —
 *  the same class S041 draws in that gate. */
const CROSS_ANCHOR = /<a\b[^>]*href=["']https?:\/\/[^"']*?["']/gi;
/** Split one cluster into its attributes, its links, and the text the cluster paints. */
const parseCluster = (clusterHtml) => {
  const open = clusterHtml.slice(0, clusterHtml.indexOf('>') + 1);
  const links = linksOf(clusterHtml);
  return {
    attrs: attrsOf(open),
    links,
    text: clusterHtml.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
};

/** Every printed surface on a page: its own element, the clusters inside it (D-B: none), its anchors. */
const surfacesOf = (html) => {
  const found = [...html.matchAll(SURFACE_RE)];
  return found.map((m) => {
    const region = m[0];
    const tag = region.slice(0, region.indexOf('>') + 1);
    return {
      surface: m[1],
      date: m[2],
      attrs: attrsOf(tag),
      region,
      anchors: linksOf(region),
      clusters: [...region.matchAll(CLUSTER_RE)].map((c) => parseCluster(c[0])),
    };
  });
};

/**
 * The rules, as failures against one page's HTML. Pure: the selftest plants pages in memory and requires a
 * named failure for each defect, which is only possible if the verdict does not touch the filesystem.
 */
const pageFindings = (html, { meetupEvents, discordEvents, eventRows, urls, fetchedAt, age, discordFetchedAt, discordAge, today, pageName, dates = true, past = false, chunks = {} }) => {
  const fails = [];
  const surfaces = surfacesOf(html);
  const bandMatch = BAND_RE.exec(html);
  const band = bandMatch ? bandMatch[0] : null;
  const bandLinks = band ? linksOf(band) : [];
  const clustersByIndex = [...html.matchAll(CLUSTER_RE)].map((m) => ({ index: m.index, ...parseCluster(m[0]) }));
  const clusters = clustersByIndex;

  // 1. (D-B, round-4 §6) The **standing** cluster renders ONCE per page, after the last row; each printed row
  //    carries its OWN one primary action and no cluster of its own. Before this rule was rewritten a printed
  //    date owned a cluster of every platform the club declares, so `/schedule` painted 5 dates x 3 links =
  //    15 anchors and 15 arrows (§4: "Fifteen arrows on one page is decoration pretending to be affordance";
  //    §6: "Five rows should scan as five dates, not fifteen links"). One cluster per page and one primary
  //    per row is the shape this rule asserts, and the count is what stops a fifth row re-inventing a
  //    cluster of its own the next time the markup moves.
  if (!surfaces.length && clusters.length) {
    fails.push(`${pageName} paints a sign-up cluster with no printed date to attach it to`);
  } else if (surfaces.length && clusters.length !== 1) {
    fails.push(`${pageName} prints ${surfaces.length} row(s) and ${clusters.length} standing cluster(s) — the standing cluster renders once per page (D-B, round-4 §6), not once per row and not twice`);
  }
  // A ruled page printing neither a row nor a cluster is legitimate on both surfaces now: an upcoming calendar
  // is empty some weeks (record 0010's designed state), and `/past` prints nothing today because every date
  // the harvest holds that has finished was announced cancelled (D374, @measured 2026-11-16). What is not
  // legitimate on `/past` is a cluster, and rule 10 is what says so.
  if (!surfaces.length && !clusters.length && dates) {
    fails.push(`${pageName} prints no date and no cluster: either the schedule is empty or its rows lost their data-surface/data-date handles`);
  }
  // A page that must not print a date: the homepage since D306 — until D340, which put ONE computed date
  // back on it under a ruling `check:dated-surfaces` now carries in its RULED set. A whole row is still a
  // second calendar, and `/schedule` is still the page of record.
  if (!dates && surfaces.length) {
    fails.push(`${pageName} prints ${surfaces.length} date(s) and must not print a date: /schedule is the page of record (D306, \`check:dated-surfaces\`)`);
  }

  // 2. The row's ONE action (D-B §6), resolved against `splitPaths(p, urls).row` — the per-date half of the
  //    resolver, the same split `EventRow.astro` renders from. Comparing a row against the whole cluster
  //    would compare the gate against the wrong thing after the split moved (D264).
  for (const s of surfaces) {
    if (s.clusters.length) {
      fails.push(`${pageName} row for ${s.date} carries ${s.clusters.length} cluster(s) — the standing cluster renders once per page after the last row, not inside a row (D-B, round-4 §6)`);
      continue;
    }
    const standing = s.anchors.filter((l) => l.attrs['data-rsvp-platform'] !== ROW_PRIMARY_PLATFORM);
    if (standing.length) {
      fails.push(`${pageName} row for ${s.date} carries ${standing.length} link(s) for a standing platform (${standing.map((l) => `${l.attrs['data-rsvp-platform']}: ${l.attrs.href}`).join('; ')}) — one action per row; the club's standing resources render once per page (D-B, round-4 §6)`);
    }
    const primary = s.anchors.filter((l) => l.attrs['data-rsvp-platform'] === ROW_PRIMARY_PLATFORM);
    if (!primary.length) {
      fails.push(`${pageName} row for ${s.date} carries no primary action — a printed date must offer the sign-up page the club posted for that date (D-B, round-4 §6)`);
      continue;
    }
    // The hour is no longer painted on the row (the standing row carries it), so the gate reads the hour the
    // row was built from off `data/events.json` — the same rows `EventRow.astro` renders. A date whose feed
    // settles two hours is resolved for each of them and the painted set must be one of those answers, so
    // the gate never picks whichever hour it happened to try first (D169: an unsettled hour is not a guess).
    const hoursOnDate = [...new Set(eventRows.filter((r) => dateOf(r) === s.date).map(hourOf).filter(Boolean))];
    const tries = (hoursOnDate.length ? hoursOnDate : [null]).map((h) => {
      const p = signUpPaths({ date: s.date, time: h }, meetupEvents, urls, discordEvents);
      return { state: p.state, want: splitPaths(p, urls).row };
    });
    const t = tries.find((x) => x.want.length === primary.length && x.want.map((d) => d.href).join('|') === primary.map((l) => l.attrs.href).join('|')) ?? tries[0];
    const want = t.want;
    if (want.length !== primary.length) {
      fails.push(`${pageName} row for ${s.date} paints ${primary.length} primary link(s); the resolver returns ${want.length} (${want.map((d) => d.platform).join(', ') || 'none'}) for that date`);
    }
    if (primary.length > 1 && t.state !== 'several') {
      fails.push(`${pageName} row for ${s.date} carries ${primary.length} primary actions (one per row, D-B round-4 §6); only the resolver's "several" state may offer more than one page for a date, and it says so`);
    }
    primary.forEach((link, i) => {
      const d = want[i];
      if (!d) return;   // the count failure above already names it
      if (link.attrs['data-rsvp-platform'] !== d.platform) {
        fails.push(`${pageName} row for ${s.date}: its primary link is "${link.attrs['data-rsvp-platform']}", expected ${d.platform} (the per-date action is the ${ROW_PRIMARY_PLATFORM} one, D-B)`);
      }
      if (link.attrs.href !== d.href) {
        fails.push(`${pageName} row for ${s.date}: its primary link goes to ${link.attrs.href}, the resolver says ${d.href}`);
      }
      if (link.attrs['data-rsvp-date'] !== s.date) {
        fails.push(`${pageName} row for ${s.date}: its primary link is stamped ${link.attrs['data-rsvp-date'] || '(no date)'} — a row's action carries that row's date`);
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
      if (/data-control/.test(link.tag)) fails.push(`${pageName} ${d.platform} link on ${s.date} carries data-control — the sign-up link is DESIGN.md's quiet label, not a control`);
      // The row's way out is typographic (D-B §6, D-D §7.1): the underline and the words carry it, and a
      // glyph in every row would paint five for one fact. The marks belong to the standing row, below.
      const uses = [...link.raw.matchAll(/<use href="#([a-z0-9-]+)"/g)];
      if (uses.length) {
        fails.push(`${pageName} row for ${s.date} paints ${uses.length} platform mark(s) on its primary link — the marks belong to the standing row; a row is typographic (D-B, D-D, round-4 §6/§7.1)`);
      }
    });
  }

  // 3. The standing row (D-B §6), once per page. Its stamps describe a date the page actually prints — the
  //    FIRST one, so the freshness a reader sees under the last row is the freshness the rows above were
  //    built from, and D311's "two surfaces of one fact must agree" rule extends to this pair.
  for (const c of clusters) {
    const at = c.attrs;
    const date = at['data-rsvp-date'] || '(no date)';

    // 3a. The cluster belongs to a date the page prints, and to the first of them.
    if (surfaces.length && !surfaces.some((x) => x.date === at['data-rsvp-date'])) {
      fails.push(`${pageName} cluster on ${date} is stamped a date the page prints no row for — the standing row describes a meeting the page shows (D-B, round-4 §6)`);
    } else if (surfaces.length && at['data-rsvp-date'] !== surfaces[0].date) {
      fails.push(`${pageName} cluster on ${date} is stamped a date other than the page's first printed date (${surfaces[0].date}) — SignUpLinks takes the first item, so the stamps and the rows come from one window call (D311's rule, extended to this surface)`);
    }
    if (at['data-rsvp-date'] < today) {
      fails.push(`${pageName} cluster on ${date} is a date that has already passed (today is ${today})`);
    }

    // 3b. The hour is the feed's, not the component's guess.
    const hoursOnDate = [...new Set(eventRows.filter((r) => dateOf(r) === at['data-rsvp-date']).map(hourOf).filter(Boolean))];
    const paintedHour = at['data-rsvp-hour'];
    if (!hoursOnDate.length) {
      if (paintedHour !== 'unsettled') fails.push(`${pageName} cluster on ${date} claims hour ${paintedHour} but no row on that date has a confirmed time (D169: an unsettled hour is painted "unsettled")`);
    } else if (!hoursOnDate.includes(paintedHour)) {
      fails.push(`${pageName} cluster on ${date} claims hour ${paintedHour || '(missing data-rsvp-hour)'}; the feed confirms ${hoursOnDate.join(' / ')}`);
    }

    // 3c. Freshness, stated on the page and checked against the snapshot the build read.
    if (at['data-rsvp-snapshot'] !== fetchedAt) {
      fails.push(`${pageName} cluster on ${date} says the snapshot is ${at['data-rsvp-snapshot'] || '(unstamped)'}; data/meetup-events.json says ${fetchedAt}`);
    }
    if (age !== null && !withinAge(at['data-rsvp-age'], age)) {
      fails.push(`${pageName} cluster on ${date} says the snapshot is ${at['data-rsvp-age']} days old; the stamp says ${age.toFixed(1)}`);
    }
    if (age === null || age > SNAPSHOT_FRESH_DAYS) {
      fails.push(`${pageName} paints sign-up links from a snapshot ${age === null ? 'with no date' : `${age.toFixed(1)} days old`} (limit ${SNAPSHOT_FRESH_DAYS})`);
    }
    if (at['data-rsvp-discord-snapshot'] !== discordFetchedAt) {
      fails.push(`${pageName} cluster says the Discord snapshot is ${at['data-rsvp-discord-snapshot'] || '(unstamped)'}; data/discord-events.json says ${discordFetchedAt}`);
    }
    if (discordAge !== null && !withinAge(at['data-rsvp-discord-age'], discordAge)) {
      fails.push(`${pageName} cluster says the Discord snapshot is ${at['data-rsvp-discord-age']} days old; the stamp says ${discordAge.toFixed(1)}`);
    }
    if (discordAge === null || discordAge > SNAPSHOT_FRESH_DAYS) {
      fails.push(`${pageName} paints sign-up links from a Discord snapshot ${discordAge === null ? 'with no date' : `${discordAge.toFixed(1)} days old`} (limit ${SNAPSHOT_FRESH_DAYS})`);
    }

    // 3d. The destinations, recomputed from the resolver — the STANDING half (D-B). Meetup is not in this
    //     row any more; it is in every row above, and rule 2 is what proves it there.
    const paths = signUpPaths({ date: at['data-rsvp-date'], time: paintedHour === 'unsettled' ? null : paintedHour }, meetupEvents, urls, discordEvents);
    const want = splitPaths(paths, urls).standing;
    if (at['data-rsvp-state'] !== paths.state) {
      fails.push(`${pageName} cluster on ${date} is stamped state "${at['data-rsvp-state']}" but signUpPaths() returns "${paths.state}"`);
    }
    if (c.links.length !== want.length) {
      fails.push(`${pageName} cluster on ${date} paints ${c.links.length} link(s); signUpPaths() returns ${want.length} standing link(s) (${want.map((d) => d.platform).join(', ') || 'none'})`);
    }
    want.forEach((d, i) => {
      const link = c.links[i];
      if (!link) return;   // the count failure above already names it
      if (link.attrs['data-rsvp-platform'] !== d.platform) {
        fails.push(`${pageName} cluster on ${date}: link ${i + 1} is "${link.attrs['data-rsvp-platform']}", expected ${d.platform} (the standing row's canonical order is Discord, Facebook — D-B keeps Meetup in the rows)`);
      }
      if (link.attrs.href !== d.href) {
        fails.push(`${pageName} cluster on ${date}: ${d.platform} link goes to ${link.attrs.href}, the resolver says ${d.href}`);
      }
      if (link.attrs['data-rsvp-date'] !== at['data-rsvp-date']) {
        fails.push(`${pageName} cluster on ${date}: the ${d.platform} link is stamped ${link.attrs['data-rsvp-date'] || '(no date)'} — every link in a cluster carries that cluster's date`);
      }
      if (link.attrs.target !== '_blank') fails.push(`${pageName} ${d.platform} link on ${date} has no target="_blank"`);
      if (!/noopener/.test(link.attrs.rel) || !/noreferrer/.test(link.attrs.rel)) {
        fails.push(`${pageName} ${d.platform} link on ${date} leaves the site with rel="${link.attrs.rel || ''}" — a cross-site link needs rel="noopener noreferrer"`);
      }
      if (!link.raw.includes(`<span class="sr-only">${d.srOnly}</span>`)) {
        fails.push(`${pageName} ${d.platform} link on ${date} has no accessible name suffix "${d.srOnly}" (D273: a link whose visible label is an event title still has to name its platform to a screen reader)`);
      }
      if (!link.text.includes(d.label)) {
        fails.push(`${pageName} ${d.platform} link on ${date} paints "${link.text}" rather than the resolver's label "${d.label}"`);
      }
      // A quiet label, not a control (D139): the standing row is prose with an underline, not a band of buttons.
      if (/data-control/.test(link.tag)) fails.push(`${pageName} ${d.platform} link on ${date} carries data-control — the sign-up link is DESIGN.md's quiet label, not a control`);

      // 3e. (F3(b), D294) Every standing link carries its own platform's mark, and the mark is the platform
      //     the link is for. The row's primary carries none — rule 2 above is what proves that.
      const uses = [...link.raw.matchAll(/<use href="#([a-z0-9-]+)"/g)];
      if (uses.length !== 1) {
        fails.push(`${pageName} ${d.platform} link on ${date} paints ${uses.length} platform mark(s) — F3(b) rules exactly one on a standing link, drawn from the sprite (D294)`);
      } else if (uses[0][1] !== markId(d.platform)) {
        fails.push(`${pageName} ${d.platform} link on ${date} is marked #${uses[0][1]} — a mark must name the platform it points to (F3(b), D294)`);
      }
    });

    // 3f. A platform the club has closed must not appear at all, whatever the component thinks (D272).
    for (const link of c.links) {
      const platform = link.attrs['data-rsvp-platform'];
      const key = Object.keys(LINK_KEYS).find((k) => PLATFORMS[k] === platform);
      if (!key) { fails.push(`${pageName} cluster on ${date} paints a link for platform "${platform}", which src/lib/rsvp.mjs has no key for`); continue; }
      if (!urls[LINK_KEYS[key]]) fails.push(`${pageName} cluster on ${date} paints a ${platform} link while config.URLs.${LINK_KEYS[key]} is empty (D272: a closed platform is painted nowhere)`);
    }

    // 3g. The mirror, for the standing half: a platform the config declares and the resolver puts in the
    //     standing row must be painted in it (D280). Dropping one is a silent subtraction.
    // 3g. The mirror, for the standing half: a platform the config declares and the resolver puts in the
    //     standing row must be painted in it (D280). Dropping one is a silent subtraction. The two club-wide
    //     exits the band owns are not this row's to carry — rule 6c is what proves them there — and a
    //     destination whose URL the band does not paint (a guild **event page** for a printed date) still is.
    const paintedPlatforms = new Set(c.links.map((l) => l.attrs['data-rsvp-platform']));
    for (const [platformKey, urlKey] of Object.entries(LINK_KEYS)) {
      const platform = PLATFORMS[platformKey];
      if (!urls[urlKey]) continue;                       // closed platform: rule 3f already forbids painting it
      if (platform === ROW_PRIMARY_PLATFORM) continue;   // the rows carry it; rule 2 is what proves it there
      if (EXIT_BAND_PLATFORMS.includes(platform)) continue; // the band carries it; rule 6c is what proves it there
      if (!paintedPlatforms.has(platform)) {
        fails.push(`${pageName} cluster on ${date} prints no ${platform} link although config.URLs.${urlKey} declares one (D280: a declared platform is a choice a visitor can make)`);
      }
    }

    // 3h. An absence is a named state (DESIGN.md "States"), and the note is the name.
    if (paths.note && !c.text.includes(paths.note)) {
      fails.push(`${pageName} cluster on ${date} is state "${paths.state}" but never says "${paths.note}"`);
    }
    if (!paths.note && /no page|no sign-up page|different time/i.test(c.text)) {
      fails.push(`${pageName} cluster on ${date} says the Meetup page is missing while the resolver found one`);
    }
  }

  // 6. A platform the club has closed is painted NOWHERE on the page — not in the standing row and not in a
  //    row and not in the exit band (D272). The three halves used to be one list; D-B split the destinations
  //    across two surfaces, and 2026-11-15's ceiling moved two more onto the band, so the page is the thing
  //    that owns "nowhere".
  const pageLinks = clusters.flatMap((c) => c.links).concat(surfaces.flatMap((s) => s.anchors), bandLinks);
  for (const link of pageLinks) {
    const platform = link.attrs['data-rsvp-platform'];
    const key = Object.keys(LINK_KEYS).find((k) => PLATFORMS[k] === platform);
    if (!key) { fails.push(`${pageName} paints a link for platform "${platform}", which src/lib/rsvp.mjs has no key for`); continue; }
    if (!urls[LINK_KEYS[key]]) fails.push(`${pageName} paints a ${platform} link while config.URLs.${LINK_KEYS[key]} is empty (D272: a closed platform is painted nowhere)`);
  }

  // 6b. And the mirror at the page's level: every platform the config declares must reach a visitor
  //     somewhere on the page (D280). Under D-B, Meetup reaches them from every row and Discord/Facebook from
  //     the standing row, so the assertion is on the union of the two, not on a per-row cluster.
  // The mirror only applies to a page that owns the standing row: the homepage paints no sign-up anchor at
  // all (its ways in are `joinChannels()` rows, stamped `data-join-platform`), and asserting a platform is
  // clickable on a page that never claimed it is a different rule — `check:join` owns that one.
  const paintedHere = new Set(pageLinks.map((l) => l.attrs['data-rsvp-platform']));
  for (const [platformKey, urlKey] of Object.entries(LINK_KEYS)) {
    const platform = PLATFORMS[platformKey];
    if (!urls[urlKey] || !clusters.length) continue;    if (!paintedHere.has(platform)) {
      fails.push(`${pageName} paints no ${platform} link anywhere although config.URLs.${urlKey} declares one (D280: a declared platform is a choice a visitor can make)`);
    }
  }

  // 6c. (round-4 §6 and §10, 2026-11-15) The exit band owns the club-wide exits, and an exit is painted once.
  //     `EXIT_BAND_PLATFORMS` in src/lib/rsvp.mjs is the list; this rule is what makes the brief's
  //     "no page contains more than six outbound links outside the footer" an invariant the build is checked
  //     against rather than a number somebody read off one screenshot, and it is what prices the split: five
  //     row primaries plus one standing exit is the six, a seventh cross-site anchor fails the build here.
  const bandUrls = exitBandUrls(urls);
  let outsideBand = 0;
  if (band) {
    for (const [platformKey, urlKey] of Object.entries(LINK_KEYS)) {
      const platform = PLATFORMS[platformKey];
      if (EXIT_BAND_PLATFORMS.includes(platform) && urls[urlKey]) {
        const owned = bandLinks.filter((l) => l.attrs['data-rsvp-platform'] === platform);
        if (!owned.length) {
          fails.push(`${pageName}'s exit band paints no ${platform} path although config.URLs.${urlKey} declares one — the band is the site's map, and a club-wide exit belongs to it, not to a row (D280, round-4 §6)`);
        } else if (owned.some((l) => l.attrs.href !== urls[urlKey])) {
          fails.push(`${pageName}'s ${platform} band path goes to ${owned[0].attrs.href}; config.URLs.${urlKey} says ${urls[urlKey]} — one source per fact (D241)`);
        }
      }
    }
    for (const l of bandLinks) {
      const handle = l.attrs['data-rsvp-platform'];
      if (handle && EXIT_BAND_PLATFORMS.includes(handle) === false) {
        fails.push(`${pageName}'s exit band carries data-rsvp-platform="${handle}", which EXIT_BAND_PLATFORMS in src/lib/rsvp.mjs does not name — one list owns which exits the band paints (D264)`);
      }
    }
    outsideBand = [...html.replace(band, '').matchAll(CROSS_ANCHOR)].length;
    if (outsideBand > OUTSIDE_BAND_LIMIT) {
      fails.push(`${pageName} paints ${outsideBand} outbound link(s) outside the exit band; round-4 §10 caps a page at ${OUTSIDE_BAND_LIMIT}. Measured on the shipped artifact @measured 2026-11-15 by npm run check:rsvp-page: /schedule 6, / 2, /chat 2, /join 3, /404 1 — the fix is the split in src/lib/rsvp.mjs (a page for a date belongs to a row; a club-wide exit belongs to the band), not a copy edit.`);
    }
  } else {
    fails.push(`${pageName} paints no exit band, so ${EXIT_BAND_PLATFORMS.join(', ')} has no owner and the ceiling has no inside/outside boundary (scripts/check-page-exit.mjs is what requires the band itself)`);
  }
  for (const c of clusters) {
    for (const l of c.links) {
      if (bandUrls.has(l.attrs.href)) {
        fails.push(`${pageName} standing row paints ${l.attrs.href}, an exit the band already paints at the foot of the same page — one URL once per page (round-4 §10's ceiling is what makes the duplication a defect rather than a courtesy; splitPaths in src/lib/rsvp.mjs does the dedup)`);
      }
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

  // 8. No headcount reaches the page, in text or in an attribute (D265), **in digits or in words** (D406).
  //     The scan runs on the **painted** surface, not on the file: Astro ships its source comments into the
  //     artifact, and a tally inside `<!-- -->` costs the shipped bytes but no browser paints it - `/dates`
  //     carries "five sign-up links" in SignUpLinks.astro's own comment, and D265 forbids a headcount on the
  //     page, not in the note beside it. The island's `<!--[-->` / `<!--]-->` delimiters strip without hiding
  //     what is between them, so a real cluster stays real to this rule (D406).
  const painted = html.replace(/<!--[\s\S]*?-->/g, '');
  const counts = [
    ...[...painted.matchAll(new RegExp(COUNT_RE.source, 'gi'))].map((m) => m[0]),
    ...[...painted.matchAll(new RegExp(SPELL_RE.source, 'gi'))].map((m) => m[0]),
  ].filter((hit) => !paintedFromSource(hit));
  if (counts.length) {
    fails.push(`${pageName} paints a headcount: ${counts.slice(0, 3).map((m) => `"${m}"`).join(', ')} — the site prints dates, not attendance (D265), and a tally in words is the same headcount as one in digits (D406: the only painted headcount allowed is the words src/content.json's sourced turnout slot carries)`);
  }

  // 10. (D374, round-5 read Batch D half 2) The ruled **past** surface. `/past` answers q24 from data the
  //     build already holds — D72 keeps a retired row rather than deleting it, and `/events.ics` publishes
  //     it with `STATUS:CANCELLED` — so the dates on this page are facts on a surface no window rule owned
  //     before, and they are checked against `data/events.json` rather than against the page's own claim
  //     (D238's lesson: a gate reads the bytes, and the rule is the module's). Four findings, one per way a
  //     past page gets a date wrong: a date no row carries (an invented meeting), a date that has not
  //     finished (the upcoming half leaking into the past one), a date announced cancelled (D72 keeps
  //     those rows so a client can retire them; painting one claims a meeting the club said would not
  //     happen), and a sign-up cluster (a meeting that has happened offers nothing to sign up for, and
  //     rule 9 would then demand an island for it).
  if (past) {
    const pastRows = [...html.matchAll(PAST_RE)].map((m) => ({ attrs: attrsOf(m[0]), tag: m[0] }));
    if (clusters.length) {
      fails.push(`${pageName} paints ${clusters.length} standing cluster(s); a date that has finished offers no sign-up page, and the standing row describes a meeting the site is offering to (D374)`);
    }
    for (const r of pastRows) {
      const d = r.attrs['data-date'];
      if (!d) {
        fails.push(`${pageName}'s past row carries no data-date handle — every painted date carries the handle (D173), and rule 10 is what compares it to the harvest`);
        continue;
      }
      const rows = eventRows.filter((x) => dateOf(x) === d);
      if (!rows.length) {
        fails.push(`${pageName}'s past row for ${d} is a date no row of data/events.json carries — /past prints only dates the build already holds (D374, D72's rows are the record)`);
        continue;
      }
      if (!rows.some((x) => isPast(x, today))) {
        fails.push(`${pageName}'s past row for ${d} is not a date that finished and was not called off (today is ${today}) — /past lists meetings that happened; ${d} is still to come, or was announced cancelled and D72 keeps that word in the data (D374)`);
      }
    }
  }

  return { surfaces, clusters, fails, outsideBand };
};

// ------------------------------------------------------------------------ selftest (D118)
if (selftest) {
  const FETCHED = '2026-11-09T06:42:38.507Z';
  const AGE = 1.7;
  // D406: the exemption is a SLOT, not a sentence. The fixture reads the slot out of src/content.json rather
  // than remembering "six to twelve people", so the clean control tests the rule and not a paraphrase of it.
  const turnoutSlot = JSON.parse(readFileSync(CONTENT, 'utf8')).turnout;
  if (typeof turnoutSlot?.value !== 'string') throw new Error('selftest needs src/content.json\'s turnout slot to carry a value string to build D406\'s clean control');
  const turnoutWords = turnoutSlot.value;
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
    // Rule 10 (D374) needs a finished row the harvest made — the clean control's date — and a finished row
    // the harvest **announced** cancelled, which is the row D72 keeps in the data and `/past` must refuse
    // to paint as a meeting that happened. Neither date is used by any rule above, which keys on 11-11,
    // 11-21, 11-25 and 11-28.
    { start: '2026-11-01T18:00:00', timeConfirmed: true },
    { start: '2026-11-02T18:00:00', timeConfirmed: true, status: 'CANCELLED' },
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
    // D-B (round-4 §6): the cluster that exists now is the **standing** one, so the fixture's default links
    // are the standing half of the resolver — the same `splitPaths(p, urls)` the component calls, which is
    // the standing half MINUS the exits the band paints.
    const links = (mut.links ?? splitPaths(p, us).standing).map((d) => {
      const platform = d.platform ?? '';
      const href = d.href ?? 'https://example.com/';
      const rel = d.rel ?? 'noopener noreferrer';
      const target = d.target ?? '_blank';
      const sr = d.srOnly === undefined ? newTabQualifier(d.label ?? '', platform) : d.srOnly;
      return `<a href="${href}" target="${target}" rel="${rel}" data-rsvp-platform="${platform}" data-rsvp-date="${p.date}"><svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><use href="#${markId(platform)}"></use></svg>${d.label ?? 'Details and sign-up'}${sr ? `<span class="sr-only">${sr}</span>` : ''}</a>`;
    }).join('');
    const note = (mut.note === null ? '' : p.note) ? `<p class="text-label text-ink-3">${mut.note ?? p.note}</p>` : '';
    return `<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1" data-rsvp-cluster ${attrs}>${note}${links}</div>`;
  };
  // The sprite SignUpLinks.astro ships: the same lib, the same ids, the same path data (D294).
  const sprite = () => `<svg class="hidden" aria-hidden="true">${MARKS.map((m) => `<symbol id="${markId(m.platform)}" viewBox="0 0 24 24"><path d="${m.d}"/></symbol>`).join('')}</svg>`;
  // Byte-faithful to `EventRow.astro` after D-B: the row's ONE way out, drawn from the resolver's per-date
  // half, label and qualifier adjacent (D341), and carrying neither a platform glyph nor an arrow.
  const rowAnchor = (item, mut = {}, us = urls) => {
    const p = signUpPaths(item, meetup, us, discord);
    return (mut.links ?? splitPaths(p, us).row).map((d) => {
      const platform = d.platform ?? '';
      const href = d.href ?? 'https://example.com/';
      const rel = d.rel ?? 'noopener noreferrer';
      const target = d.target ?? '_blank';
      const sr = d.srOnly === undefined ? newTabQualifier(d.label ?? '', platform) : d.srOnly;
      return `<a href="${href}" target="${target}" rel="${rel}" data-rsvp-platform="${platform}" data-rsvp-date="${p.date}" class="min-h-8 inline-flex items-center text-label font-medium text-ink underline decoration-rule underline-offset-2">${d.label ?? 'Sign up on Meetup'}${sr ? `<span class="sr-only">${sr}</span>` : ''}</a>`;
    }).join('');
  };
  // One standing cluster per page, after the last row, stamped with the FIRST date the page prints — the shape
  // `Schedule.astro` builds by handing `SignUpLinks` the first item. The band is the fixture's own, byte-shaped
  // to `src/components/Footer.astro`: the ceiling in rule 6c has to have an inside and an outside, so a page
  // fixture without a band would be a fixture the rule cannot judge.
  const bandHtml = (us = urls) =>
    `<footer class="bg-ink text-band-text"><nav aria-label="Where to next">${EXIT_BAND_PLATFORMS.map((platform) => {
      const key = Object.keys(LINK_KEYS).find((k) => PLATFORMS[k] === platform);
      const href = us[LINK_KEYS[key]];
      return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer" data-rsvp-platform="${platform}">Exit to ${platform}<span class="sr-only">, opens in a new tab</span></a>` : '';
    }).join('')}</nav></footer>`;
  const page = (rows, extra = '', us = urls) =>
    `${sprite()}<main><ul class="space-y-4">${rows.map(([date, hour]) => `<li class="rounded-card" data-surface="row" data-date="${date}"><div data-copy><p>${date}</p>${rowAnchor({ date, time: hour }, {}, us)}</div></li>`).join('')}</ul>${rows.length ? island(clusterHtml({ date: rows[0][0], time: rows[0][1] }, {}, us)) : ''}${extra}</main>${bandHtml(us)}`;
  // The past surface (D374): rows carry `data-surface="past-row"`, and the page owns no cluster and no
  // sprite, because a meeting that has finished offers nothing to sign up for. Same band, because rule 6c
  // needs an inside and an outside to judge at all.
  const pastPage = (dates) =>
    `<main><ul class="space-y-4">${dates.map((d) => `<li data-surface="past-row" data-date="${d}"><time class="tabular-nums" datetime="${d}">${d}</time> — Study session</li>`).join('')}</ul></main>${bandHtml()}`;

  const clean = page([['2026-11-11', '18:00'], ['2026-11-21', '12:00']]);
  const ctx = { meetupEvents: meetup, discordEvents: discord, eventRows: rows, urls, fetchedAt: FETCHED, age: AGE, discordFetchedAt: DISFETCHED, discordAge: DISAGE, today: TODAY, pageName: 'planted page', chunks: { [ISLAND_CHUNK]: shippedChunk } };
  // The entry the live run passes for `/past` (D374): `dates: false` is the row contract's, `past: true` is
  // rule 10's, and the pair is what a fixture has to carry — a fixture that leaves `dates` at its default
  // asks a page of finished dates to print an upcoming row and a standing cluster (the defect D374 fixed
  // by moving the fixtures rather than by weakening a rule, D155's rule applied to fixtures).
  const pastCtx = { ...ctx, dates: false, past: true };

  const cases = [
    { name: 'a page the resolver agrees with', html: clean, ctx, want: [] },
    { name: 'a page that must not print a date printing two', html: clean, ctx: { ...ctx, dates: false }, want: ['must not print a date'] },
    { name: 'a printed row with no primary action at all', html: clean.replace(rowAnchor({ date: '2026-11-21', time: '12:00' }), ''), ctx, want: ['carries no primary action'] },
    { name: 'the standing cluster stamped with the LAST printed date instead of the first', html: clean.replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), clusterHtml({ date: '2026-11-21', time: '12:00' })), ctx, want: ["other than the page's first printed date"] },
    { name: 'a row that carries the standing cluster inside it (the shape before D-B)', html: clean.replace(rowAnchor({ date: '2026-11-21', time: '12:00' }), island(clusterHtml({ date: '2026-11-21', time: '12:00' }))), ctx, want: ['not inside a row (D-B, round-4 §6)'] },
    { name: 'two standing clusters on one page', html: `${clean}${island(clusterHtml({ date: '2026-11-21', time: '12:00' }))}`, ctx, want: ['standing cluster(s)', 'renders once per page'] },
    { name: 'a row that keeps a standing link inside it, as well as its primary', html: clean.replace(rowAnchor({ date: '2026-11-21', time: '12:00' }), `${rowAnchor({ date: '2026-11-21', time: '12:00' })}<a href="https://www.facebook.com/groups/planted" target="_blank" rel="noopener noreferrer" data-rsvp-platform="Facebook" data-rsvp-date="2026-11-21">Join the Facebook group</a>`), ctx, want: ['one action per row; the club'] },
    { name: 'a row whose primary link sprouts a platform glyph', html: clean.replace(rowAnchor({ date: '2026-11-21', time: '12:00' }), rowAnchor({ date: '2026-11-21', time: '12:00' }).replace('>Sign up on Meetup', '><svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><use href="#pm-meetup"></use></svg>Sign up on Meetup')), ctx, want: ['paints 1 platform mark(s) on its primary link'] },
    { name: 'a cluster whose hour the feed never confirmed', html: clean.replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), clusterHtml({ date: '2026-11-11', time: '18:00' }, { hour: '20:00' })), ctx, want: ['claims hour 20:00'] },
    { name: 'an unsettled hour painted as a settled one', html: page([['2026-11-25', '18:00']]), ctx, want: ['no row on that date has a confirmed time'] },
    { name: 'the note a missing page must state, stated nowhere', html: page([['2026-11-28', '18:00']]).replace(`<p class="text-label text-ink-3">${signUpPaths({ date: '2026-11-28', time: '18:00' }, meetup, urls, discord).note}</p>`, ''), ctx, want: ['never says']},
    { name: 'a note claiming a missing page where the resolver found one', html: page([['2026-11-21', '12:00']]).replace('data-rsvp-discord-age="0.2">', 'data-rsvp-discord-age="0.2"><p class="text-label text-ink-3">No sign-up page for this date yet — ask in the chat.</p>'), ctx, want: ['says the Meetup page is missing while the resolver found one']},
    { name: 'a state stamp that disagrees with the resolver', html: clean.replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), clusterHtml({ date: '2026-11-11', time: '18:00' }, { state: 'none' })), ctx, want: ['state "none" but signUpPaths'] },
    { name: 'two Meetup pages on one hour printed as a single row link', html: page([['2026-11-11', '18:00']]).replace(rowAnchor({ date: '2026-11-11', time: '18:00' }), (() => { const p = signUpPaths({ date: '2026-11-11', time: '18:00' }, meetup, urls, discord); return rowAnchor({ date: '2026-11-11', time: '18:00' }, { links: splitPaths(p, urls).row.slice(0, 1) }); })()), ctx, want: ['paints 1 primary link(s)', 'the resolver returns 2 (Meetup, Meetup)']},
    { name: 'the Facebook link quietly dropped from the standing row', html: page([['2026-11-11', '18:00']]).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), (() => { const p = signUpPaths({ date: '2026-11-11', time: '18:00' }, meetup, urls, discord); return clusterHtml({ date: '2026-11-11', time: '18:00' }, { links: splitPaths(p, urls).standing.filter((d) => d.platform !== PLATFORMS.facebook) }); })()), ctx, want: ['prints no Facebook link although config.URLs.facebookGroup declares one']},
    { name: 'the Facebook link sent to a group page instead of the group', html: page([['2026-11-11', '18:00']]).replace('https://www.facebook.com/groups/planted', 'https://www.facebook.com/groups/planted/events/999/'), ctx, want: ['Facebook link goes to https://www.facebook.com/groups/planted/events/999/', 'the resolver says https://www.facebook.com/groups/planted']},
    // The order class needs two standing exits to have anything to swap, and the dedup leaves `/schedule` today
    // with one (the band owns the other two). The fixture that still has two is a date the guild holds an event
    // page for — 2026-11-21 12:00, where the resolver's Discord destination is that page and not the invite the
    // band paints. So this planting is also the proof that the dedup keeps a **per-date** page in the standing
    // row: deduping by URL, not by platform name, is what keeps a guild event page from being swallowed because
    // "Discord" happens to be one of the band's platforms.
    { name: 'the guild event page painted after the Facebook group', html: page([['2026-11-21', '12:00']]).replace(clusterHtml({ date: '2026-11-21', time: '12:00' }), (() => { const p = signUpPaths({ date: '2026-11-21', time: '12:00' }, meetup, urls, discord); const st = splitPaths(p, urls).standing; return clusterHtml({ date: '2026-11-21', time: '12:00' }, { links: [st[1], st[0]] }); })()), ctx, want: ["the standing row's canonical order is Discord, Facebook"]},
    { name: 'a link to a Meetup page on the wrong date', html: page([['2026-11-11', '18:00']]).replace('https://www.meetup.com/g/events/111/', 'https://www.meetup.com/g/events/222/'), ctx, want: ['the resolver says'] },
    { name: 'a Facebook link painted for a platform the club closed', html: page([['2026-11-11', '18:00']], '', closedUrls).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }, {}, closedUrls), (() => { const p = signUpPaths({ date: '2026-11-11', time: '18:00' }, meetup, closedUrls, discord); return clusterHtml({ date: '2026-11-11', time: '18:00' }, { links: [...p.destinations, { platform: 'Facebook', href: 'https://www.facebook.com/groups/g', label: 'Ask in the group', srOnly: ' on Facebook, opens in a new tab' }] }, closedUrls); })()), ctx: { ...ctx, urls: closedUrls }, want: ['config.URLs.facebookGroup is empty'] },
    { name: 'a link with no accessible name suffix', html: page([['2026-11-11', '18:00']]).replace('<span class="sr-only"> on Meetup, opens in a new tab</span>', ''), ctx, want: ['no accessible name suffix', 'opens in a new tab'] },
    { name: 'a cross-site link without rel="noopener noreferrer"', html: page([['2026-11-11', '18:00']]).replace('rel="noopener noreferrer"', 'rel="noopener"'), ctx, want: ['rel="noopener"'] },
    { name: 'a cluster stamped with a snapshot the build did not read', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-snapshot="2026-11-09T06:42:38.507Z" data-rsvp-age="1.7"', 'data-rsvp-snapshot="2026-10-01T00:00:00.000Z" data-rsvp-age="40.1"'), ctx, want: ['says the snapshot is 2026-10-01T00:00:00.000Z'] },
    { name: 'an age painted 3.7 days off while the snapshot stamp is correct', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-age="1.7"', 'data-rsvp-age="5.4"'), ctx, want: ['says the snapshot is 5.4 days old; the stamp says 1.7']},
    { name: 'links painted from a snapshot past the freshness window', html: `<main><ul><li class="rounded-card" data-surface="row" data-date="2026-11-11">${island(clusterHtml({ date: '2026-11-11', time: '18:00' }, { snapshot: '2026-10-01T00:00:00.000Z', age: '40.1' }))}</li></ul></main>`, ctx: { ...ctx, fetchedAt: '2026-10-01T00:00:00.000Z', age: 40.1 }, want: ['snapshot 40.1 days old (limit 14'] },
    // The anchor here is the arrow glyph, not a label word. This planting used to be `replace('Proofs <span class="sr-only">', ...)` -
    // a label - and it went dead on 2026-11-14 when the cluster's copy changed, producing 0 failures and a
    // selftest that looked green for a rule that had stopped being exercised (D265, S041). Markup the
    // cluster emits on every link is the stable anchor.
    { name: 'a headcount painted in the cluster', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-discord-age="0.2">', 'data-rsvp-discord-age="0.2"><p>12 going</p>'), ctx, want: ['paints a headcount']},
    { name: 'the roster tally the join band used to print, painted again', html: `${clean}<section class="mt-8"><p>280 on the Meetup list — counted Nov 3, 2026, and that is the list, not the room.</p></section>`, ctx, want: ['paints a headcount', '280 on the Meetup list']},
    { name: 'a member count painted as prose', html: `${clean}<section class="mt-8"><p>The club has 142 members.</p></section>`, ctx, want: ['paints a headcount', '142 members']},
    { name: 'an RSVP tally painted where a Discord link is', html: page([['2026-11-11', '18:00']]).replace('Sign up on Discord', 'Sign up on Discord (14 RSVPs)'), ctx, want: ['paints a headcount', '14 RSVPs']},
    { name: 'a headcount painted in an attribute', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-cluster', 'data-rsvp-cluster data-going="12"'), ctx, want: ['headcount']},
    { name: 'a Discord user_count painted in an attribute', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-discord-snapshot', 'data-user-count="7" data-rsvp-discord-snapshot'), ctx, want: ['headcount', 'user-count']},
    // D406: a tally IN WORDS is the same headcount as one in digits, so the two plantings below are the forms
    // COUNT_RE alone walked past. The first is a number typed into a component - no slot, no source, and the
    // words appear in no sourced value. The second is the trap that keeps the exemption from becoming a free
    // pass: "Six people at a table." states the sourced slot's own number but is not the slot's words, and a
    // paraphrased tally is not a sourced one.
    { name: 'a spelled tally typed into a component', html: `${clean}<section class="mt-8"><p>Twenty people show up on a good night.</p></section>`, ctx, want: ['paints a headcount', 'Twenty people']},
    { name: 'a paraphrase of the sourced turnout slot painted as its own words', html: `${clean}<section class="mt-8"><p>Six people at a table.</p></section>`, ctx, want: ['paints a headcount', 'Six people']},
    { name: 'clean control: the sourced turnout slot painted in its own words', html: `${clean}<section class="mt-8"><p>${turnoutWords}</p></section>`, ctx, want: []},
    { name: 'clean control: a tally that lives only in a shipped comment', html: `${clean}<!-- Twenty people at a table. -->`, ctx, want: []},
    { name: 'the guild event link dropped from the standing row', html: page([['2026-11-11', '18:00']]).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), (() => { const p = signUpPaths({ date: '2026-11-11', time: '18:00' }, meetup, urls, discord); return clusterHtml({ date: '2026-11-11', time: '18:00' }, { links: splitPaths(p, urls).standing.filter((d) => d.platform !== 'Discord') }); })()), ctx, want: ['paints 1 link(s)', 'returns 2 standing link(s) (Discord, Facebook)']},
    { name: 'a completed guild event painted as a standing link', html: page([['2026-11-28', '18:00']]).replace(clusterHtml({ date: '2026-11-28', time: '18:00' }), (() => { const p = signUpPaths({ date: '2026-11-28', time: '18:00' }, meetup, urls, discord); return clusterHtml({ date: '2026-11-28', time: '18:00' }, { links: [...splitPaths(p, urls).standing, { platform: 'Discord', href: 'https://discord.com/events/111/444/', label: 'Sign up on Discord', srOnly: ', opens in a new tab' }] }); })()), ctx, want: ['paints 2 link(s)', 'returns 1 standing link(s) (Facebook)'] },
    // Rule 6c (2026-11-15, round-4 §6 and §10): the band owns the club-wide exits, paints the URL the config
    // declares for each, carries no handle the shared list does not name, and no exit is painted twice on one
    // page. The anchor each of these plants is the band fixture's own label ("Exit to Discord"), so a mutation
    // cannot silently move onto the standing row's Discord link and report itself as the band's.
    { name: 'the band Discord exit losing the handle that names it', html: clean.replace('data-rsvp-platform="Discord">Exit to Discord', 'data-rsvp-exit="Discord">Exit to Discord'), ctx, want: ['exit band paints no Discord path although config.URLs.discordInvite declares one'] },
    { name: 'the band carrying a platform the shared exit list does not name', html: clean.replace('data-rsvp-platform="Discord">Exit to Discord', 'data-rsvp-platform="Mobilizon">Exit to Discord'), ctx, want: ['which EXIT_BAND_PLATFORMS in src/lib/rsvp.mjs does not name'] },
    { name: 'the band Meetup path drifting from the URL the config declares', html: clean.replace('href="https://www.meetup.com/g" target="_blank" rel="noopener noreferrer" data-rsvp-platform="Meetup"', 'href="https://www.meetup.com/g/join" target="_blank" rel="noopener noreferrer" data-rsvp-platform="Meetup"'), ctx, want: ["band path goes to https://www.meetup.com/g/join; config.URLs.meetupGroup says https://www.meetup.com/g"] },
    { name: 'the standing row repeating an exit the band already paints', html: page([['2026-11-21', '12:00']]).replace(clusterHtml({ date: '2026-11-21', time: '12:00' }), (() => { const p = signUpPaths({ date: '2026-11-21', time: '12:00' }, meetup, urls, discord); return clusterHtml({ date: '2026-11-21', time: '12:00' }, { links: [...splitPaths(p, urls).standing, { platform: 'Discord', href: urls.discordInvite, label: 'Join the Discord chat', srOnly: ', opens in a new tab' }] }); })()), ctx, want: ['an exit the band already paints at the foot of the same page'] },
    { name: 'a page with seven outbound exits outside the band', html: `${clean.replace('</main>', '<a href="https://example.com/a">One more</a><a href="https://example.com/b">Two more</a><a href="https://example.com/c">Three more</a><a href="https://example.com/d">Four more</a></main>')}`, ctx, want: ['9 outbound link(s) outside the exit band'] },
    { name: 'a cluster stamped with a Discord snapshot the build did not read', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-discord-snapshot="2026-11-10T12:00:00.000Z"', 'data-rsvp-discord-snapshot="2026-10-01T00:00:00.000Z"'), ctx, want: ['Discord snapshot is 2026-10-01T00:00:00.000Z']},
    { name: 'Discord links painted from a guild snapshot past the freshness window', html: page([['2026-11-11', '18:00']]).replace(clusterHtml({ date: '2026-11-11', time: '18:00' }), clusterHtml({ date: '2026-11-11', time: '18:00' }, { discordSnapshot: '2026-10-01T00:00:00.000Z', discordAge: '40.1' })), ctx: { ...ctx, discordFetchedAt: '2026-10-01T00:00:00.000Z', discordAge: 40.1 }, want: ['Discord snapshot 40.1 days old (limit 14']},
    { name: 'the cluster promoted to a control', html: page([['2026-11-11', '18:00']]).replace('data-rsvp-platform="Meetup"', 'data-rsvp-platform="Meetup" data-control="signup"'), ctx, want: ['quiet label, not a control'] },
    // Rule 5c / 9b: the platform mark (F3(b), D294).
    { name: 'a standing link painted without its platform mark', html: page([['2026-11-11', '18:00']]).replace('<svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><use href="#pm-discord"></use></svg>', ''), ctx, want: ['paints 0 platform mark(s)'] },
    { name: 'the Discord link marked with the Facebook glyph', html: page([['2026-11-11', '18:00']]).replace('<use href="#pm-discord"></use>', '<use href="#pm-facebook"></use>'), ctx, want: ['is marked #pm-facebook — a mark must name the platform it points to'] },
    { name: 'a mark whose symbol the page never ships', html: page([['2026-11-11', '18:00']]).replace('<symbol id="pm-discord" viewBox="0 0 24 24"><path d="', '<symbol id="pm-unused" viewBox="0 0 24 24"><path d="'), ctx, want: ['paints #pm-discord but ships no <symbol id="pm-discord">'] },
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
    // Rule 10 (D374, round-5 read Batch D half 2): `/past` prints dates the build already holds, and each
    // one is a row that finished and was not called off. The clean control is the same page shape the live
    // run reads today, which lists nothing; these plantings are the four ways a past page gets a date wrong.
    { name: 'clean control: a past row on a date the harvest made and that finished', html: pastPage(['2026-11-01']), ctx: pastCtx, want: [] },
    { name: 'a past page painting a date that has not finished', html: pastPage(['2026-11-21']), ctx: pastCtx, want: ['is not a date that finished and was not called off'] },
    { name: 'a cancelled date painted as a meeting that happened', html: pastPage(['2026-11-02']), ctx: pastCtx, want: ['D72 keeps that word in the data'] },
    { name: 'a past page inventing a date the harvest never made', html: pastPage(['2026-10-04']), ctx: pastCtx, want: ['is a date no row of data/events.json carries'] },
    { name: 'a past page painting a standing sign-up cluster', html: pastPage(['2026-11-01']).replace('</main>', `${island(clusterHtml({ date: '2026-11-11', time: '18:00' }, {}, urls))}</main>`), ctx: pastCtx, want: ['offers no sign-up page'] },
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
  const { surfaces, clusters, fails, outsideBand } = pageFindings(html, {
    meetupEvents: meetupSnap.events ?? [], discordEvents: discordSnap.events ?? [], eventRows: events.events ?? [], urls,
    fetchedAt, age, discordFetchedAt, discordAge, today, pageName: page.name, dates: page.dates, past: page.past, chunks,
  });
  if (fails.length) {
    for (const f of fails) console.log(`FAIL  ${f}`);
    total += fails.length;
    console.log(`check:rsvp-page: ${page.name} — ${fails.length} failure(s)`);
    continue;
  }
  const states = clusters.map((c) => c.attrs['data-rsvp-state'] ?? '?');
  const links = clusters.flatMap((c) => c.links).concat(surfaces.flatMap((s) => s.anchors)).map((l) => l.attrs['data-rsvp-platform']);
  const window = scheduleWindow(events.events ?? [], today);
  const inWindow = surfaces.filter((s) => window.shown.map(dateOf).includes(s.date)).length;
  console.log(`ok    ${page.name}: ${surfaces.length} printed date(s), ${clusters.length} standing cluster(s), ${links.length} sign-up link(s) [${links.join(', ') || 'none'}], states ${states.join('/')}; ${inWindow} of them inside the schedule window; ${outsideBand} outbound link(s) outside the exit band (limit ${OUTSIDE_BAND_LIMIT})`);
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
