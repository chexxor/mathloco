#!/usr/bin/env node
/**
 * check:schedule-window — `/schedule` prints exactly the dates the window rule says, and says what it left out.
 *
 *   npm run check:schedule-window                     # the built page against the tracked snapshot
 *   npm run check:schedule-window:selftest            # plant each defect, require each to FAIL (D118)
 *   node scripts/check-schedule-window.mjs --dist <dir> [--data <file>] [--today YYYY-MM-DD]
 *
 * Why this gate exists and not just a `slice`: `/schedule` used to print **every open row in the snapshot**, so
 * its length was a function of how many dates a host happened to create. Measured price of one art-bearing row:
 * **+197px of page** @measured 2026-11-06 by the overflow probe recorded in D224 — on the homepage that was a
 * one-off design question; on the schedule page it is a page that grows without bound.
 * `src/lib/event-window.mjs` now holds the two limits (`HORIZON_WEEKS`, `MAX_ROWS`), and a limit nobody checks is
 * a limit that quietly stops applying: the component could stop calling the helper, or the helper could be edited
 * into a no-op, and every other gate in this repo would stay green. This one reads `data-date` off the built page
 * and compares the sequence against the same helper — not against a copy of it, which is why the helper lives in a
 * module a plain `node` script can import (`src/lib/events.mjs` opens its JSON with an `import`, and plain node
 * refuses that without an import attribute).
 *
 * What it fails on, and why each is worth a gate:
 *   - **more rows than the window allows** — the defect the operator asked about (2026-11-06: "ensure the
 *     schedule page does not grow unbounded");
 *   - **a date printed outside the horizon** — the horizon is what makes the page's length *stable* week to week;
 *   - **a date not printed that should be** — the honest half. A page limit that silently swallows a date is how a
 *     visitor misses a meeting, and a gate that only counts rows would pass it;
 *   - **the omission left unsaid** — when rows are hidden the page must say so and point at `/events.ics`, which
 *     carries everything (D150: the page limit is a layout rule, not a fact about the club);
 *   - **a cancelled date painted on the page** — the feed publishes cancellations with a raised SEQUENCE; the page
 *     does not (D223).
 *
 * The snapshot is read the way `src/lib/events.mjs` reads it: the tracked file, with gitignored
 * `src/content.local/events-*.json` merged over it, so a review build made over an overlay is checked against the
 * data that build actually used rather than against the tracked file. When an overlay is present the run says so.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HORIZON_WEEKS, MAX_ROWS, addDays, dateOf, scheduleWindow, startDate, todayInZone,
} from '../src/lib/event-window.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const argOne = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i < 0 ? dflt : args[i + 1];
};

const DIST_DIR = resolve(argOne('--dist', 'dist/client'));
const PAGE = resolve(DIST_DIR, 'schedule/index.html');
const LOCAL_DIR = 'src/content.local';

/** The snapshot as the build saw it: the tracked file, then the gitignored overlays in filename order. */
const readSnapshot = (trackedPath) => {
  let snap = JSON.parse(readFileSync(resolve(trackedPath), 'utf8'));
  const overlaid = [];
  if (existsSync(resolve(LOCAL_DIR))) {
    for (const f of readdirSync(resolve(LOCAL_DIR)).filter((n) => /^events-.*\.json$/.test(n)).sort()) {
      snap = { ...snap, ...JSON.parse(readFileSync(resolve(LOCAL_DIR, f), 'utf8')) };
      overlaid.push(f);
    }
  }
  return { snap, overlaid };
};

/** Every `data-date` the built page printed, in document order. */
const printedDates = (html) => [...html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);

/**
 * Dates whose only rows are cancelled. Kept beside the plan rather than inside `scheduleWindow` because it is a
 * statement about the page's duty (do not paint it), not about which rows to show (D223).
 */
const cancelledOnlyDates = (rows, today) => {
  const all = Array.isArray(rows) ? rows : [];
  const open = new Set(
    all.filter((r) => dateOf(r) && String(r.status ?? '').toUpperCase() !== 'CANCELLED' && dateOf(r) >= today).map(dateOf),
  );
  return [...new Set(all.filter((r) => String(r.status ?? '').toUpperCase() === 'CANCELLED').map(startDate))]
    .filter((d) => d && d >= today && !open.has(d));
};

/** The plan plus the page's duty about cancellations, so `verdict` takes one argument. */
const planFor = (rows, today) => {
  const plan = scheduleWindow(rows, today);
  plan.cancelledOnly = cancelledOnlyDates(rows, today);
  return plan;
};

/**
 * The rules, as a list of failures against (html, plan). Pure, so the selftest can plant each defect in a string
 * and require a verdict without rebuilding the site eight times.
 */
const verdict = (html, plan, today) => {
  const fails = [];
  const printed = printedDates(html);
  const want = plan.shown.map(dateOf);

  if (printed.length > MAX_ROWS) {
    fails.push(`the page prints ${printed.length} rows; MAX_ROWS is ${MAX_ROWS}`);
  }
  for (const d of printed) {
    if (d < today) fails.push(`${d} is in the past: it is printed on a page of upcoming dates`);
    if (d > plan.horizonEnd) fails.push(`${d} is past the horizon ${plan.horizonEnd} (${HORIZON_WEEKS} weeks from ${today})`);
  }
  for (const d of want) {
    if (!printed.includes(d)) fails.push(`${d} is inside the window but the page does not print it`);
  }
  for (const d of printed) {
    if (!want.includes(d)) fails.push(`${d} is printed but the window rule does not list it`);
  }
  if (printed.join(',') !== want.join(',')) {
    fails.push(`the printed order (${printed.join(',')}) is not the window's order (${want.join(',')})`);
  }
  for (const d of plan.cancelledOnly) {
    if (printed.includes(d)) fails.push(`${d} is cancelled and has no open row, but the page prints it (D223)`);
  }
  if (plan.hiddenHorizon + plan.hiddenCap > 0) {
    if (!/events\.ics/.test(html)) fails.push('rows are hidden and the page offers no /events.ics path');
    if (plan.hiddenHorizon > 0 && !new RegExp(`lists the next ${HORIZON_WEEKS} weeks`).test(html)) {
      fails.push(`${plan.hiddenHorizon} dates sit past the horizon and the page never says so`);
    }
    if (plan.hiddenCap > 0 && !new RegExp(`at most ${MAX_ROWS} dates`).test(html)) {
      fails.push(`${plan.hiddenCap} dates sit inside the window unprinted and the page never says so`);
    }
  }
  return fails;
};

// ------------------------------------------------------------------------ selftest (D118)
// Two kinds of case, because the gate has two halves. The first plants snapshots and asks the *rule* what it
// would show (fast, no build); the second plants *built pages* whose printed rows disagree with the snapshot and
// requires a named failure for each. A clean page is included so the gate is shown to pass as well as to fail.
if (selftest) {
  const TODAY = '2026-11-06';
  const row = (day, extra = {}) => ({ uid: `mmbc-${day}-${extra.seq ?? 0}`, start: `${day}T18:00:00`, status: 'CONFIRMED', ...extra });
  const weekly = (first, n) => Array.from({ length: n }, (_, i) => addDays(first, i * 7));

  const ruleCases = [
    {
      name: 'a year of weekly dates: the page prints eight weeks of them, not fifty-two',
      rows: weekly('2026-11-09', 52).map((d) => row(d)),
      want: (p) => p.shown.length === MAX_ROWS && p.hiddenHorizon === 52 - MAX_ROWS,
      note: (p) => `shown=${p.shown.length} hiddenHorizon=${p.hiddenHorizon} horizonEnd=${p.horizonEnd}`,
    },
    {
      name: 'a host stacks twelve dates into one week: the cap holds, not the horizon',
      rows: Array.from({ length: 12 }, (_, i) => row('2026-11-09', { seq: i })),
      want: (p) => p.shown.length === MAX_ROWS && p.hiddenCap === 12 - MAX_ROWS,
      note: (p) => `shown=${p.shown.length} hiddenCap=${p.hiddenCap}`,
    },
    {
      name: 'the horizon is inclusive: 56 days from 2026-11-06 is 2027-01-01, and that date is in',
      rows: [row('2027-01-01'), row('2027-01-08')],
      want: (p) => p.horizonEnd === '2027-01-01' && p.shown.map(dateOf).join(',') === '2027-01-01' && p.hiddenHorizon === 1,
      note: (p) => `horizonEnd=${p.horizonEnd} shown=${p.shown.map(dateOf).join(',')} hiddenHorizon=${p.hiddenHorizon}`,
    },
    {
      name: 'nothing inside the window: the page still knows the next date, so it cannot say "none"',
      rows: [row('2027-03-02'), row('2027-03-16')],
      want: (p) => p.shown.length === 0 && p.hiddenHorizon === 2 && dateOf(p.firstOpen) === '2027-03-02',
      note: (p) => `shown=${p.shown.length} hiddenHorizon=${p.hiddenHorizon} firstOpen=${p.firstOpen ? dateOf(p.firstOpen) : 'none'}`,
    },
    {
      name: 'a cancelled row is dropped; a date sharing its day survives (D223)',
      rows: [row('2026-11-07', { status: 'CANCELLED' }), row('2026-11-07', { seq: 1 })],
      want: (p) => p.shown.map(dateOf).join(',') === '2026-11-07' && p.cancelledOnly.length === 0,
      note: (p) => `shown=${p.shown.map(dateOf).join(',')} cancelledOnly=${p.cancelledOnly.join(',')}`,
    },
    {
      name: 'a cancelled date with no open row is named as cancelled-only',
      rows: [row('2026-11-07', { status: 'CANCELLED' }), row('2026-11-11')],
      want: (p) => p.shown.map(dateOf).join(',') === '2026-11-11' && p.cancelledOnly.join(',') === '2026-11-07',
      note: (p) => `shown=${p.shown.map(dateOf).join(',')} cancelledOnly=${p.cancelledOnly.join(',')}`,
    },
    {
      name: 'yesterday is not upcoming, whatever the window says',
      rows: [row('2026-11-05'), row('2026-11-06')],
      want: (p) => p.shown.map(dateOf).join(',') === '2026-11-06',
      note: (p) => `shown=${p.shown.map(dateOf).join(',')}`,
    },
    {
      name: 'the horizon crosses DST (America/Chicago, Nov into Dec) without shifting a date',
      rows: [row('2026-11-08')],
      today: '2026-11-01',
      want: (p) => p.horizonEnd === '2026-12-27',
      note: (p) => `horizonEnd=${p.horizonEnd}`,
    },
    {
      name: 'an empty snapshot plans nothing and does not crash',
      rows: [],
      want: (p) => p.shown.length === 0 && p.total === 0 && p.firstOpen === null,
      note: (p) => `total=${p.total}`,
    },
  ];

  // The sentence Schedule.astro writes when it hides rows, kept byte-faithful so a planting tests the rule and
  // not a paraphrase of it. `omit(hidden)` renders it for a given count.
  const said = (hiddenHorizon, hiddenCap) =>
    `This page lists the next ${HORIZON_WEEKS} weeks, and ${hiddenHorizon} more ${hiddenHorizon === 1 ? 'date is' : 'dates are'} booked past 2027-01-01. ` +
    (hiddenCap ? `It lists at most ${MAX_ROWS} dates, and ${hiddenCap} more are inside that window. ` : '') +
    '<a href="/events.ics">Add the club calendar</a>';
  const pageOf = (printed, extra = '') => `<main><ul>${printed.map((d) => `<li data-surface="row" data-date="${d}">x</li>`).join('')}</ul>${extra}</main>`;

  const long = weekly('2026-11-09', 12).map((d) => row(d));            // 12 weekly dates: 8 in, 4 past
  const pageCases = [
    {
      name: 'clean page: every in-window date printed, the omission spoken',
      snap: long,
      html: () => pageOf(weekly('2026-11-09', 8), said(4, 0)),
      expect: [],
    },
    {
      name: 'one row too many printed',
      snap: long,
      html: () => pageOf(weekly('2026-11-09', 9), said(4, 0)),
      expect: ['MAX_ROWS'],
    },
    {
      name: 'a date the window lists is missing from the page',
      snap: [row('2026-11-11'), row('2026-11-18')],
      html: () => pageOf(['2026-11-11']),
      expect: ['does not print it'],
    },
    {
      name: 'a date past the horizon is printed',
      snap: [row('2027-04-03')],
      html: () => pageOf(['2027-04-03']),
      expect: ['past the horizon'],
    },
    {
      name: 'rows are printed out of order',
      snap: [row('2026-11-11'), row('2026-12-05')],
      html: () => pageOf(['2026-12-05', '2026-11-11']),
      expect: ['is not the window'],
    },
    {
      name: 'a cancelled date is painted on the page',
      snap: [row('2026-11-07', { status: 'CANCELLED' })],
      html: () => pageOf(['2026-11-07']),
      expect: ['cancelled'],
    },
    {
      name: 'rows are hidden and the page says nothing about it',
      snap: long,
      html: () => pageOf(weekly('2026-11-09', 8)),
      expect: ['never says so'],
    },
    {
      name: 'the cap binds and the page does not mention the cap',
      snap: Array.from({ length: 12 }, (_, i) => row('2026-11-09', { seq: i })),
      html: () => pageOf(Array(8).fill('2026-11-09'), `This page lists the next ${HORIZON_WEEKS} weeks, and 0 more dates are booked past 2027-01-01. <a href="/events.ics">Add the club calendar</a>`),
      expect: ['never says so'],
    },
  ];

  let bad = 0;
  for (const c of ruleCases) {
    const plan = planFor(c.rows, c.today ?? TODAY);
    if (c.want(plan)) {
      console.log(`ok    ${c.name}`);
    } else {
      bad++;
      console.log(`FAIL  ${c.name}\n      got: ${c.note(plan)}`);
    }
  }
  for (const c of pageCases) {
    const today = TODAY;
    const plan = planFor(c.snap, today);
    const fails = verdict(c.html(), plan, today);
    if (c.expect.length === 0 && fails.length === 0) {
      console.log(`ok    ${c.name}`);
    } else if (c.expect.length === 0) {
      bad++;
      console.log(`FAIL  "${c.name}" is supposed to pass but failed: ${fails[0]}`);
    } else if (!fails.length) {
      bad++;
      console.log(`FAIL  planting "${c.name}" produced NO failure — the gate cannot go red there`);
    } else if (!fails.some((f) => c.expect.every((e) => f.includes(e)))) {
      bad++;
      console.log(`FAIL  planting "${c.name}" failed, but not for the named reason: ${fails[0]} (wanted "${c.expect.join(' + ')}")`);
    } else {
      console.log(`ok    planting "${c.name}" -> ${fails.find((f) => c.expect.every((e) => f.includes(e)))}`);
    }
  }
  console.log(`check:schedule-window selftest — ${ruleCases.length + pageCases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------------ the live check
if (!existsSync(PAGE)) {
  console.error(`check:schedule-window: ${PAGE} missing — run npm run build first`);
  process.exit(1);
}

const trackedPath = argOne('--data', 'data/events.json');
const { snap, overlaid } = readSnapshot(trackedPath);
const today = argOne('--today', todayInZone(snap.calendar?.timezone ?? 'America/Chicago'));
const plan = planFor(snap.events ?? [], today);

const html = readFileSync(PAGE, 'utf8');
const fails = verdict(html, plan, today);

if (overlaid.length) {
  console.log(`note  the built page was built over an overlay: ${overlaid.join(', ')} (gitignored, src/content.local/)`);
}
if (fails.length) {
  for (const f of fails) console.log(`FAIL  ${f}`);
  console.log(`check:schedule-window: ${fails.length} failure(s) — page prints ${printedDates(html).length} rows; the window lists ${plan.shown.length} of ${plan.total} open dates (${today} + ${HORIZON_WEEKS} weeks = ${plan.horizonEnd}, cap ${MAX_ROWS})`);
  process.exit(1);
}
console.log(
  `ok    /schedule prints ${plan.shown.length} of ${plan.total} open dates ` +
  `(${today} + ${HORIZON_WEEKS} weeks = ${plan.horizonEnd}, cap ${MAX_ROWS}, ` +
  `hidden ${plan.hiddenHorizon} past the horizon / ${plan.hiddenCap} inside it)`,
);
