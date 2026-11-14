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
const DATE_TEXT = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b(?:,?\s*\d{4}\b)?|\b\d{4}-\d{2}-\d{2}\b/;
/** The machine-readable handle `Schedule.astro` and `EventRow.astro` put on every date they paint (D173). */
const DATE_HANDLE = /data-date="\d{4}-\d{2}-\d{2}"/;

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
  for (const { route, html } of pages) {
    const text = visibleText(html);
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
