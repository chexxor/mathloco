#!/usr/bin/env node
// check:dated-surfaces — the pages that print a calendar date are the ones a ruling names, and a page cannot
// start printing one without joining that list.
//
//   npm run check:dated-surfaces            # over the built dist/client
//   npm run check:dated-surfaces:selftest   # plant each defect, require each to FAIL, with clean controls
//
// Why this gate exists (2026-11-14, the operator's `/join` objective: "/schedule stays the only surface that
// prints dates, and no page grows a second source of truth for links, dates or claims"). Every ruling that put a
// date on the site was made one page at a time (D218 made `/schedule` the page of record; D227 put ONE date and a
// pointer on the homepage), and nothing compared the set of dated surfaces with the set of rulings. A new page
// that prints a date is a second copy of a fact whose source is `data/events.json`, and a copy goes stale on its
// own the day the snapshot moves — the class `check:schedule-window` and `check:rsvp-page` catch only for the
// pages they know. This gate knows every page the build emits, because it walks `dist/client`.
//
// Chrome (2026-11-14, D311): the nav now carries the next date as a subordinate chip, on EVERY emitted page.
// That is a date on a page that is not on the ruled list, so it is allowed only as chrome, and only as a copy of
// the page of record: the chip must carry `data-nav-date`, and its value must equal the first `data-date` the
// schedule page actually prints. A nav date with no handle, or one that disagrees with the schedule, is a
// second calendar — the thing this gate exists to prevent.
//
// What counts as a date: a month-and-day ("Nov 21", "Saturday, Nov 21"), a month-and-day with a year ("Copied from
// the club's own calendar on Nov 13, 2026"), or an ISO date, in text a visitor reads. The year-bearing form was out
// of scope in this gate's first version, on the argument that a provenance stamp is not a schedule date — and the
// 2026-11-14 audit found exactly that hole: `/` still printed "last read Nov 3, 2026" after its card came off, while
// the record said the homepage printed no date. A date a visitor reads is a date; provenance on an unruled page is
// expressed as an age (`ageSince()`), which carries the freshness without the string.
//
// Findings name the fix, not the fact:
//   dated-surface-unruled    this page prints a date and no ruling has put one there
//   dated-surface-unmarked   this page prints a date but carries no `data-date` handle, so no gate can key on it
//   dated-surface-missing    a page on the ruled list is not in the build at all (a deleted route, not a quiet one)
//   next-meeting-mismatch    the home hero's computed next meeting disagrees with the nav chip, or with the
//                            page of record (D340, round-4 §5: "if they disagree, the build fails" — D311's
//                            rule extended to a second surface, which is the brief's wording, not a new gate)
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return resolve(i < 0 ? 'dist/client' : args[i + 1]);
})();

/** The pages a ruling has given a date to, and the ruling that owns each. Adding a row is the whole act of
 *  putting a date on a new surface, so the diff that prints one has to touch this file and say which decision
 *  allows it. */
export const RULED = new Map([
  ['/dates', "D218 — the page of record: every open date inside the window. Since D306 it was the ONLY one until D374 gave it a sibling `/past`; its route moved from `/schedule` to `/dates` on the round-5 read's Batch D (the nav, the band and the page's own h1 all said `Dates`), and its entry here moved in the same commit that moved the file (D155's rule). The homepage's one-date band was removed on the operator's `/join` objective, and its entry here was deleted in the same commit that stopped printing the date (2026-11-14)."],
  ['/past', "D374 — the page of record for dates that have **finished** (round-5 read Batch D half 2, q24 'Can I look for a specific past meetup?', which was UNANSWERED on every surface the probe read). It is the other half of one calendar: `pastWindow` in src/lib/event-window.mjs keeps a row whose day has finished and that was not announced cancelled, so the cancellations D72 keeps in the data are not painted as meetings that happened. What owns that decision is `scripts/check-rsvp-page.mjs`'s rule 10, which reads the built bytes and refuses a date no row of data/events.json carries, a date still to come, and a cancelled one. Its entry here landed in the SAME commit that emitted the page: a RULED route the build does not emit is `dated-surface-missing`, and the day this page starts listing a date, that date needs a `data-date` handle like every other painted one (D173)."],
  ['/', "D340 — one computed next meeting in the home hero, from the same scheduleWindow(upcoming(), todayIn()) call the nav chip makes (round-4 §5, D-A). This reverses D306's blanket \"`/schedule` is the only surface that prints dates\": D306 removed a band that DUPLICATED the page of record's five dates; this is one date, stated as the answer to \"when is the next meeting?\", and gated against the page of record by `next-meeting-mismatch` so it cannot drift into a second calendar. (`/schedule` in that quote is the route as ruled on 2026-11-14; it is `/dates` now — D373.)"],
]);

/** A month-and-day a visitor could read, with no year attached. The year is the discriminator: "Nov 21" is a
 *  date on a schedule, "Nov 13, 2026" is a stamp about a source (see the note at the top). */
const DATE_TEXT = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b(?:,?\s*\d{4}\b)?|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?:,?\s*\d{4}\b)?|\b\d{4}-\d{2}-\d{2}\b/;
/** The machine-readable handle `Schedule.astro` and `EventRow.astro` put on every date they paint (D173). */
const DATE_HANDLE = /data-date="\d{4}-\d{2}-\d{2}"/;
/** The nav's subordinate date chip (D311). Its text is chrome, so it is stripped before the prose scan and
 *  audited separately against the page of record. */
const NAV_CHIP = /<span[^>]*data-nav-date="(\d{4}-\d{2}-\d{2})"[^>]*>[\s\S]*?<\/span>/g;
/** The hero's computed next-meeting block (D340, round-4 §5). The rule reads the block's opening tag, because
 *  the tag is what carries the handle: a block that claims to be the next meeting without an ISO date on it is
 *  prose wearing a surface name, and no gate could key on it. */
const NEXT_MEETING_TAG = /<div[^>]*data-surface="next-meeting"[^>]*>/;
const ISO_DATE = /\d{4}-\d{2}-\d{2}/;
/** The anchor the chip sits in (D311, and the 2026-11-14 read §2/§5.2). The chip's visible text is the short
 *  form — "21 Nov" — because the measured 320px floor cannot hold the weekday (D311: `Sat 21 Nov` needs 286px
 *  of 276). The weekday has to be in the accessible name, which costs no pixels, or the screen-reader user gets
 *  a bare number with no sentence around it. */
const NAV_ANCHOR = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
const WEEKDAY = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;
const MONTH_DAY = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/i;
const attrOf = (attrs, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1] ?? '';

export const visibleText = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const routesUnder = (dir, prefix = '') => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...routesUnder(full, `${prefix}/${entry.name}`));
    else if (entry.name === 'index.html') out.push(prefix === '' ? '/' : `${prefix}/`.replace(/\/$/, ''));
  }
  return out;
};

/** Pure verdict over `[{route, html}]`, so the selftest plants pages without a build or a disk. */
export const datedSurfaceFindings = (pages, ruled = RULED) => {
  const fails = [];
  const dated = [];
  // What the page of record actually prints, in document order. The nav chip is judged against this, not
  // against a clock: a gate that re-derives "today" would disagree with the build on the other side of
  // midnight, and the rule we can prove is that the two surfaces agree.
  const record = pages.find((p) => p.route === '/dates');
  const recordDates = record ? [...record.html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]) : [];
  for (const { route, html } of pages) {
    const chips = [...html.matchAll(NAV_CHIP)].map((m) => m[1]);
    const chromeStripped = html.replace(NAV_CHIP, ' ');
    if (chips.length) {
      if (recordDates.length === 0) {
        fails.push({
          rule: 'nav-date-with-no-dates',
          detail: `${route}'s nav carries data-nav-date="${chips[0]}" but /dates prints no date at all (an empty calendar is a designed state, D311). Drop the chip in the frontmatter — it is derived from the same window call, so an empty page means an empty chip.`,
        });
      } else if (chips[0] !== recordDates[0]) {
        fails.push({
          rule: 'nav-date-mismatch',
          detail: `${route}'s nav says the next date is ${chips[0]} while the page of record prints ${recordDates[0]} first. The chip must come from the same scheduleWindow() call the rows do (D311).`,
        });
      }
    } else if (/data-nav-date="[^"]*"/.test(html)) {
      fails.push({
        rule: 'nav-date-unhandled',
        detail: `${route}'s nav prints a date whose element carries no ISO handle, so no gate can compare it with the schedule page. Give the chip data-nav-date="YYYY-MM-DD".`,
      });
    }
    // The chip's accessible name (S041/S040 chrome rule): a sentence, not a bare label or a bare number.
    for (const a of html.matchAll(NAV_ANCHOR)) {
      if (!/data-nav-date="\d{4}-\d{2}-\d{2}"/.test(a[2])) continue;
      const label = attrOf(a[1], 'aria-label');
      if (!label || !WEEKDAY.test(label) || !MONTH_DAY.test(label)) {
        fails.push({
          rule: 'nav-chip-name-thin',
          detail: `${route}'s nav chip carries a date but its accessible name is ${label ? `"${label}"` : 'nothing'} — the visible chip is the short form (D311), so the weekday and the month-and-day have to be in the aria-label, e.g. "Dates, next meeting Saturday, Nov 21".`,
        });
      }
    }
    // D340 (round-4 §5, decision D-A): the home hero now ANSWERS "when is the next meeting?" instead of
    // pointing at the page that does. Two surfaces claiming to be "the next one" is the same second-calendar
    // defect D311 was built for, so the chip's rule extends here: hero, chip and the page of record name one
    // date, and a hero that disagrees is a build failure rather than a visitor meeting two answers.
    const heroTag = NEXT_MEETING_TAG.exec(html);
    if (heroTag) {
      const heroDate = ISO_DATE.exec(heroTag[0])?.[0];
      if (!heroDate) {
        fails.push({
          rule: 'next-meeting-mismatch',
          detail: `${route}'s hero opens a data-surface="next-meeting" block whose element carries no ISO date, so the block claims a date a visitor can read and nothing can compare. Put data-date="YYYY-MM-DD" on the block element (D173), the same handle the rows carry.`,
        });
      } else if (chips.length && chips[0] !== heroDate) {
        fails.push({
          rule: 'next-meeting-mismatch',
          detail: `${route}'s hero says the next meeting is ${heroDate} while the same page's nav chip says ${chips[0]}. The brief's rule for this pair is that disagreeing fails the build (D340, extending D311): both come from the one scheduleWindow(upcoming(), todayIn()) call, so one of them is not coming from it.`,
        });
      } else if (!recordDates.length || recordDates[0] !== heroDate) {
        fails.push({
          rule: 'next-meeting-mismatch',
          detail: `${route}'s hero says the next meeting is ${heroDate} while the page of record prints ${recordDates[0] ?? 'no date at all'} first. The hero must be the same computed fact the rows are (D340); a hero restating an old date is a second calendar wearing a bolder hat than the first.`,
        });
      }
    }
    const text = visibleText(chromeStripped);
    const m = DATE_TEXT.exec(text);
    if (!m) continue;
    dated.push({ route, sample: m[0] });
    if (!ruled.has(route)) {
      fails.push({
        rule: 'dated-surface-unruled',
        detail: `${route} prints the date "${m[0]}" and no ruling has put a date on it. Either remove it — /dates is the page of record (D218) — or add it to RULED in this file with the decision that allows it.`,
      });
      continue;
    }
    if (!DATE_HANDLE.test(html)) {
      fails.push({
        rule: 'dated-surface-unmarked',
        detail: `${route} prints the date "${m[0]}" with no data-date handle. Every painted date carries the handle (D173) so check:rsvp-page and this gate can key on it; a text-only date is one no gate can find.`,
      });
    }
  }
  // A ruled page that prints NO date is legitimate: an upcoming-only calendar is empty some weeks (record 0010's
  // designed empty state), and the 2026-11-14 audit found this rule calling that state a spent allowlist entry. What
  // is not legitimate is a ruled ROUTE disappearing from the build, which is what this checks instead.
  for (const [route, why] of ruled) {
    if (!pages.some((p) => p.route === route)) {
      fails.push({
        rule: 'dated-surface-missing',
        detail: `${route} is on the ruled list ("${why}") and the build emits no such page. Move the ruling with the page, or delete the row.`,
      });
    }
  }
  return { fails, dated };
};

if (selftest) {
  const FIX = resolve('.design', 'tmp-dated-surfaces');
  rmSync(FIX, { recursive: true, force: true });
  mkdirSync(FIX, { recursive: true });
  // The fixture rulings key on the LIVE RULED routes, not on the older ones: D373 moved the page of
  // record from `/schedule` to `/dates` on 2026-11-16, and a fixture keyed to the old route starts
  // failing for the wrong reason the day the live rule moves (D155's rule, applied to fixtures).
  const ruled = new Map([['/dates', 'fixture: the page of record']]);
  // D340 puts ONE computed date on home, so the fixture's home page needs a ruling of its own; cases that
  // paint a hero pass this map instead of the unruled one, which is what the real RULED row says.
  const heroRuled = new Map([['/dates', 'fixture: the page of record'], ['/', 'fixture: D340 puts one computed date on home']]);
  const page = (body) => `<html><body>${body}</body></html>`;
  const home = page('<p class="italic">Nov 21</p><div data-date="2026-11-21">MPLS Math Club Social</div>');
  const schedule = page('<ul><li data-date="2026-11-21">Saturday, Nov 21 — MPLS Math Club Social</li></ul>');
  const cases = [
    { name: 'clean control: the page of record prints dates with handles', pages: [{ route: '/', html: page('<p>See the schedule</p>') }, { route: '/dates', html: schedule }, { route: '/join', html: page('<p>Ways in</p>') }], want: [] },
    { name: 'a page that is not ruled starts printing a date', pages: [{ route: '/', html: page('<p>See the schedule</p>') }, { route: '/dates', html: schedule }, { route: '/chat', html: page('<p>Come on Nov 21</p><div data-date="2026-11-21"></div>') }], want: ['dated-surface-unruled'] },
    { name: 'the homepage starts printing a date again', pages: [{ route: '/', html: home }, { route: '/dates', html: schedule }], want: ['dated-surface-unruled'] },
    { name: 'a ruled page prints a date with no handle', pages: [{ route: '/dates', html: page('<p>Nov 21</p>') }], want: ['dated-surface-unmarked'] },
    // An empty calendar is a designed state, not a spent allowlist row (2026-11-14 audit's third finding).
    { name: 'a ruled page with an empty calendar stays green', pages: [{ route: '/', html: page('<p>See the schedule</p>') }, { route: '/dates', html: page('<p>No date is on the calendar yet.</p>') }], want: [] },
    { name: 'a ruled route missing from the build', pages: [{ route: '/', html: page('<p>See the schedule</p>') }], want: ['dated-surface-missing'] },
    // The discriminator: a provenance stamp carries a year and is not a schedule date (D276).
    // The hole the 2026-11-14 audit found: a year-bearing provenance stamp is still a date a visitor reads, so an
    // unruled page that prints one fails. The ruled page may carry its own stamp.
    { name: 'a year-bearing provenance stamp on an unruled page', pages: [{ route: '/dates', html: schedule }, { route: '/chat', html: page('<p>Copied from the club\u2019s own calendar on Nov 13, 2026</p>') }], want: ['dated-surface-unruled'] },
    { name: 'clean control: an age is not a date', pages: [{ route: '/dates', html: schedule }, { route: '/', html: page('<p>last read 11 days ago</p>') }], want: [] },
    { name: 'clean control: a date inside an HTML comment is not painted', pages: [{ route: '/dates', html: schedule }, { route: '/join', html: page('<!-- measured Nov 21 --><p>Ways in</p>') }], want: [] },
    // D311: the nav chip is chrome, and its whole legitimacy is that it copies the page of record.
    { name: 'clean control: the nav chip repeats the page of record\u2019s first date', pages: [{ route: '/', html: page('<header><a href="/dates" aria-label="Dates, next meeting Saturday, Nov 21">Dates <span data-nav-date="2026-11-21">21 Nov</span></a></header>') }, { route: '/dates', html: schedule }], want: [] },
    { name: 'the nav chip disagrees with the schedule page', pages: [{ route: '/', html: page('<a href="/dates" aria-label="Dates, next meeting Saturday, Dec 5">Dates <span data-nav-date="2026-12-05">5 Dec</span></a>') }, { route: '/dates', html: schedule }], want: ['nav-date-mismatch'] },
    { name: 'a nav chip whose accessible name is the bare label', pages: [{ route: '/', html: page('<a href="/dates" aria-label="Dates">Dates <span data-nav-date="2026-11-21">21 Nov</span></a>') }, { route: '/dates', html: schedule }], want: ['nav-chip-name-thin'] },
    { name: 'a nav chip with no accessible name of its own', pages: [{ route: '/', html: page('<a href="/dates">Dates <span data-nav-date="2026-11-21">21 Nov</span></a>') }, { route: '/dates', html: schedule }], want: ['nav-chip-name-thin'] },
    { name: 'a nav chip whose name has the day but not the weekday', pages: [{ route: '/', html: page('<a href="/dates" aria-label="Dates, next meeting Nov 21">Dates <span data-nav-date="2026-11-21">21 Nov</span></a>') }, { route: '/dates', html: schedule }], want: ['nav-chip-name-thin'] },
    { name: 'a nav date written as bare prose with no chip element', pages: [{ route: '/', html: page('<a href="/dates">Dates 21 Nov</a>') }, { route: '/dates', html: schedule }], want: ['dated-surface-unruled'] },
    // The chip's element must be the one the gate can read: an attribute on the wrong element carries the date
    // without the handle, so no gate can compare it with the schedule page (D311).
    { name: 'a nav date whose element has the attribute but is not the chip shape', pages: [{ route: '/', html: page('<a href="/dates" aria-label="Dates, next meeting Saturday, Nov 21">Dates <div data-nav-date="2026-11-21" class="chip">the next one</div></a>') }, { route: '/dates', html: schedule }], want: ['nav-date-unhandled'] },
    { name: 'a nav chip while the calendar is empty', pages: [{ route: '/', html: page('<a href="/dates" aria-label="Dates, next meeting Saturday, Nov 21">Dates <span data-nav-date="2026-11-21">21 Nov</span></a>') }, { route: '/dates', html: page('<p>No date is on the calendar yet.</p>') }], want: ['nav-date-with-no-dates'] },
    // D340 (round-4 §5): the hero block is a second surface for the next date, and it must agree.
    { name: 'clean control: the hero, the chip and the record name one date', ruled: heroRuled, pages: [{ route: '/', html: page('<div data-surface="next-meeting" data-date="2026-11-21"><p><time datetime="2026-11-21">Next meeting: Saturday, Nov 21</time></p></div><a href="/dates" aria-label="Dates, next meeting Saturday, Nov 21">Dates <span data-nav-date="2026-11-21">21 Nov</span></a>') }, { route: '/dates', html: schedule }], want: [] },
    { name: 'the hero states a date the page of record does not print first', ruled: heroRuled, pages: [{ route: '/', html: page('<div data-surface="next-meeting" data-date="2026-12-05"><p><time datetime="2026-12-05">Next meeting: Wednesday, Dec 5</time></p></div>') }, { route: '/dates', html: schedule }], want: ['next-meeting-mismatch'] },
    { name: 'the hero and the nav chip disagree on the next meeting', ruled: heroRuled, pages: [{ route: '/', html: page('<div data-surface="next-meeting" data-date="2026-11-21"><p><time datetime="2026-11-21">Next meeting: Saturday, Nov 21</time></p></div><a href="/dates" aria-label="Dates, next meeting Wednesday, Dec 5">Dates <span data-nav-date="2026-12-05">5 Dec</span></a>') }, { route: '/dates', html: page('<ul><li data-date="2026-12-05">Wednesday, Dec 5 — Study session</li></ul>') }], want: ['next-meeting-mismatch'] },
    { name: 'a hero block whose element carries no date handle', ruled: heroRuled, pages: [{ route: '/', html: page('<div data-surface="next-meeting"><p><time datetime="2026-11-21">Next meeting: Saturday, Nov 21</time></p></div>') }, { route: '/dates', html: schedule }], want: ['next-meeting-mismatch', 'dated-surface-unmarked'] },
  ];
  let bad = 0;
  for (const c of cases) {
    const got = datedSurfaceFindings(c.pages, c.ruled ?? ruled).fails.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(62)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
  }
  // The parser the real run uses must be the one the fixtures were read by.
  const dir = resolve(FIX, 'walk', 'dates');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(FIX, 'walk', 'index.html'), home);
  writeFileSync(resolve(dir, 'index.html'), schedule);
  const routes = routesUnder(resolve(FIX, 'walk')).sort();
  const walkOk = routes.join(',') === '/,/dates';
  console.log(`${walkOk ? 'ok   walked' : 'FAIL walked'}  the route walker reads index.html as "/" and a directory as its route   ${routes.join(',')}`);
  if (!walkOk) bad++;
  rmSync(FIX, { recursive: true, force: true });
  console.log(`\ncheck:dated-surfaces selftest — ${cases.length + 1} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ the real run

if (!existsSync(DIST)) {
  console.error(`check:dated-surfaces: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
  process.exit(1);
}
const pages = [];
for (const route of routesUnder(DIST).sort()) {
  const file = resolve(DIST, route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`);
  if (statSync(file).isFile()) pages.push({ route, html: readFileSync(file, 'utf8') });
}
const { fails, dated } = datedSurfaceFindings(pages);
console.log(`check:dated-surfaces — ${pages.length} built page(s), ${dated.length} printing a date`);
for (const d of dated) console.log(`  ${d.route.padEnd(12)} ${d.sample}${RULED.has(d.route) ? `   (${RULED.get(d.route)})` : ''}`);
for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
console.log(fails.length ? `\n${fails.length} finding(s).` : `\nDates are printed only where a ruling put them: ${[...RULED.keys()].join(', ')}.`);
process.exit(fails.length ? 1 : 0);
