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
  ['/schedule', "D218 — the page of record: every open date inside the window. Since D306 it is the ONLY one: the homepage's one-date band was removed on the operator's `/join` objective, and its entry here was deleted in the same commit that stopped printing the date (2026-11-14)."],
]);

/** A month-and-day a visitor could read, with no year attached. The year is the discriminator: "Nov 21" is a
 *  date on a schedule, "Nov 13, 2026" is a stamp about a source (see the note at the top). */
const DATE_TEXT = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b(?:,?\s*\d{4}\b)?|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?:,?\s*\d{4}\b)?|\b\d{4}-\d{2}-\d{2}\b/;
/** The machine-readable handle `Schedule.astro` and `EventRow.astro` put on every date they paint (D173). */
const DATE_HANDLE = /data-date="\d{4}-\d{2}-\d{2}"/;
/** The nav's subordinate date chip (D311). Its text is chrome, so it is stripped before the prose scan and
 *  audited separately against the page of record. */
const NAV_CHIP = /<span[^>]*data-nav-date="(\d{4}-\d{2}-\d{2})"[^>]*>[\s\S]*?<\/span>/g;

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
  const record = pages.find((p) => p.route === '/schedule');
  const recordDates = record ? [...record.html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]) : [];
  for (const { route, html } of pages) {
    const chips = [...html.matchAll(NAV_CHIP)].map((m) => m[1]);
    const chromeStripped = html.replace(NAV_CHIP, ' ');
    if (chips.length) {
      if (recordDates.length === 0) {
        fails.push({
          rule: 'nav-date-with-no-dates',
          detail: `${route}'s nav carries data-nav-date="${chips[0]}" but /schedule prints no date at all (an empty calendar is a designed state, D311). Drop the chip in the frontmatter — it is derived from the same window call, so an empty page means an empty chip.`,
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
    const text = visibleText(chromeStripped);
    const m = DATE_TEXT.exec(text);
    if (!m) continue;
    dated.push({ route, sample: m[0] });
    if (!ruled.has(route)) {
      fails.push({
        rule: 'dated-surface-unruled',
        detail: `${route} prints the date "${m[0]}" and no ruling has put a date on it. Either remove it — /schedule is the page of record (D218) — or add it to RULED in this file with the decision that allows it.`,
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
  const ruled = new Map([['/schedule', 'fixture: the page of record']]);
  const page = (body) => `<html><body>${body}</body></html>`;
  const home = page('<p class="italic">Nov 21</p><div data-date="2026-11-21">MPLS Math Club Social</div>');
  const schedule = page('<ul><li data-date="2026-11-21">Saturday, Nov 21 — MPLS Math Club Social</li></ul>');
  const cases = [
    { name: 'clean control: the page of record prints dates with handles', pages: [{ route: '/', html: page('<p>See the schedule</p>') }, { route: '/schedule', html: schedule }, { route: '/join', html: page('<p>Ways in</p>') }], want: [] },
    { name: 'a page that is not ruled starts printing a date', pages: [{ route: '/', html: page('<p>See the schedule</p>') }, { route: '/schedule', html: schedule }, { route: '/chat', html: page('<p>Come on Nov 21</p><div data-date="2026-11-21"></div>') }], want: ['dated-surface-unruled'] },
    { name: 'the homepage starts printing a date again', pages: [{ route: '/', html: home }, { route: '/schedule', html: schedule }], want: ['dated-surface-unruled'] },
    { name: 'a ruled page prints a date with no handle', pages: [{ route: '/schedule', html: page('<p>Nov 21</p>') }], want: ['dated-surface-unmarked'] },
    // An empty calendar is a designed state, not a spent allowlist row (2026-11-14 audit's third finding).
    { name: 'a ruled page with an empty calendar stays green', pages: [{ route: '/', html: page('<p>See the schedule</p>') }, { route: '/schedule', html: page('<p>No date is on the calendar yet.</p>') }], want: [] },
    { name: 'a ruled route missing from the build', pages: [{ route: '/', html: page('<p>See the schedule</p>') }], want: ['dated-surface-missing'] },
    // The discriminator: a provenance stamp carries a year and is not a schedule date (D276).
    // The hole the 2026-11-14 audit found: a year-bearing provenance stamp is still a date a visitor reads, so an
    // unruled page that prints one fails. The ruled page may carry its own stamp.
    { name: 'a year-bearing provenance stamp on an unruled page', pages: [{ route: '/schedule', html: schedule }, { route: '/chat', html: page('<p>Copied from the club\u2019s own calendar on Nov 13, 2026</p>') }], want: ['dated-surface-unruled'] },
    { name: 'clean control: an age is not a date', pages: [{ route: '/schedule', html: schedule }, { route: '/', html: page('<p>last read 11 days ago</p>') }], want: [] },
    { name: 'clean control: a date inside an HTML comment is not painted', pages: [{ route: '/schedule', html: schedule }, { route: '/join', html: page('<!-- measured Nov 21 --><p>Ways in</p>') }], want: [] },
    // D311: the nav chip is chrome, and its whole legitimacy is that it copies the page of record.
    { name: 'clean control: the nav chip repeats the page of record\u2019s first date', pages: [{ route: '/', html: page('<header><a href="/schedule">Dates <span data-nav-date="2026-11-21">21 Nov</span></a></header>') }, { route: '/schedule', html: schedule }], want: [] },
    { name: 'the nav chip disagrees with the schedule page', pages: [{ route: '/', html: page('<a href="/schedule">Dates <span data-nav-date="2026-12-05">5 Dec</span></a>') }, { route: '/schedule', html: schedule }], want: ['nav-date-mismatch'] },
    { name: 'a nav date written as bare prose with no chip element', pages: [{ route: '/', html: page('<a href="/schedule">Dates 21 Nov</a>') }, { route: '/schedule', html: schedule }], want: ['dated-surface-unruled'] },
    // The chip's element must be the one the gate can read: an attribute on the wrong element carries the date
    // without the handle, so no gate can compare it with the schedule page (D311).
    { name: 'a nav date whose element has the attribute but is not the chip shape', pages: [{ route: '/', html: page('<a href="/schedule">Dates <div data-nav-date="2026-11-21" class="chip">the next one</div></a>') }, { route: '/schedule', html: schedule }], want: ['nav-date-unhandled'] },
    { name: 'a nav chip while the calendar is empty', pages: [{ route: '/', html: page('<a href="/schedule">Dates <span data-nav-date="2026-11-21">21 Nov</span></a>') }, { route: '/schedule', html: page('<p>No date is on the calendar yet.</p>') }], want: ['nav-date-with-no-dates'] },
  ];
  let bad = 0;
  for (const c of cases) {
    const got = datedSurfaceFindings(c.pages, ruled).fails.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(62)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
  }
  // The parser the real run uses must be the one the fixtures were read by.
  const dir = resolve(FIX, 'walk', 'schedule');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(FIX, 'walk', 'index.html'), home);
  writeFileSync(resolve(dir, 'index.html'), schedule);
  const routes = routesUnder(resolve(FIX, 'walk')).sort();
  const walkOk = routes.join(',') === '/,/schedule';
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
