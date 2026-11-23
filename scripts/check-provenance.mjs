#!/usr/bin/env node
// check:provenance — every "how current is this" line on the site uses the ONE provenance format.
//
//   npm run check:provenance            # over src/ and the built dist/client
//   npm run check:provenance:selftest   # plant each defect, require each to FAIL, with clean controls
//
// Why this gate exists (2026-11-14, the second design read §7 item D6, S042 / D322). The read's finding was
// exact: the homepage printed "last read 11 days ago" and `/schedule` printed "Copied from the club's own
// calendar on Nov 13, 2026" — two registers for one fact, on one site, and a reader cannot compare them.
// The ruling is one function (`provenanceStamp()` in `src/lib/content.ts`): **relative inside 30 days,
// absolute beyond**. A function is not a rule until something checks that the pages use it, and that
// something has to be able to fail (S038): `check:content` looks at claims, `check:dated-surfaces` at which
// pages may carry a date, and neither can see a hand-written age or an absolute date inside 30 days.
//
// What it enforces:
//   FAIL  second-register     — a component computing a provenance age with `ageSince()`/`formatSince()`
//                               instead of `provenanceStamp()`, i.e. a second implementation of the rule
//   FAIL  age-past-honest     — a printed "N days ago" past `AGE_HONEST` days; the rule says the date form
//                               by then (**D431** moved the switch from D322's 30 days to 1 day)
//
// **D431 (2026-11-18) deletes this gate's `date-inside-window` rule.** That rule asserted D322's second half —
// inside 30 days a date-bearing surface must print an age — and the round-7 review of `/dates` found the half of
// it that was never true here: the only stamp this site prints is `data/events.json`'s `source.fetchedAt`, set by
// whoever writes that file — then a step a human ran (`npm run events:harvest`, deleted with the fetchers under
// MS42; since 2026-11-23 a handoff commit from `social-event-publisher`, and the 2026-11-13 stamp was still in
// the file the day the review was written), so an age is never corrected against a newer read and grows into a
// self-pitying number rather than a stale one. The date form is therefore legal at any age, which is the form every date-bearing surface
// prints; the age form is legal for a stamp taken today or yesterday, and on a surface ruled date-free
// (`allowDate: false`, D306), where an age is the only freshness there is to carry. The rule was not left firing
// at 30 days under its old name: a gate that still green-lights the defect a review just paid for is a gate that
// does not know it happened.
//   INFO  the lines           — every provenance sentence the artifact prints, with its register, so a
//                               reviewer sees the census rather than only the verdict
//
// Deliberately NOT enforced: that every page carries provenance at all. Some pages state no dated fact
// (`/404`), and a gate that demands provenance would push a page into inventing a source (D92).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emittedRoutes } from '../design/emitted-routes.mjs';
import { daysSince, AGE_HONEST } from '../src/lib/provenance.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return i < 0 ? resolve('dist/client') : args[i + 1];
})();

// `WINDOW` comes from src/lib/provenance.mjs — the gate reads the same constant the site renders with,
// so the threshold cannot be changed in one place and quietly missed by the other (D238).
const AGE = /\b(today|yesterday|\d+ days? ago|\d+ months? ago|\d+ years? ago)\b/i;
// "on Nov 13, 2026" (what formatSince prints), "on 13 Nov 2026", and an ISO date — the three shapes a
// provenance line can carry.
const DATE = /\bon\s(([A-Za-z]{3}) (\d{1,2}), (\d{4})|\d{1,2} [A-Za-z]{3} \d{4}|\d{4}-\d{2}-\d{2})\b/;
// The phrases a provenance line uses on this site. "counted" and "as of" are here because a tally that
// used to print a date (D276) is exactly the kind of line that would come back.
const PHRASES = [
  /last read/gi,
  /was built/gi,
  /copied from[^<.]{0,60}/gi,
  /counted/gi,
  /as of/gi,
];

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** "Nov 13, 2026" (what formatSince prints), "13 Nov 2026", or "2026-11-13" -> an ISO calendar date. */
const parseDate = (s) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dm = s.match(/([A-Za-z]{3}) (\d{1,2}), (\d{4})/);
  if (dm) {
    const mm = MONTHS[dm[1].slice(0, 3).toLowerCase()];
    return mm ? `${dm[3]}-${String(mm).padStart(2, '0')}-${String(dm[2]).padStart(2, '0')}` : null;
  }
  const md = s.match(/(\d{1,2}) ([A-Za-z]{3}) (\d{4})/);
  if (!md) return null;
  const mm = MONTHS[md[2].slice(0, 3).toLowerCase()];
  return mm ? `${md[3]}-${String(mm).padStart(2, '0')}-${String(md[1]).padStart(2, '0')}` : null;
};

/**
 * Pure verdict over `[{route, text}]` so the selftest plants with no build and no disk (D118).
 * `age` is matched in the 60 characters after the phrase, which is the whole of every line this
 * site writes; a phrase with neither register after it is reported as INFO, not failed, because a
 * sentence like "copied from the club's own calendar, which it keeps itself" is a legitimate sentence.
 */
export const provenanceFindings = (pages, now = new Date()) => {
  const fails = [];
  const lines = [];
  for (const p of pages) {
    const text = p.text.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
    for (const phrase of PHRASES) {
      for (const m of text.matchAll(phrase)) {
        const tail = text.slice(m.index, m.index + 120);
        const age = tail.match(AGE);
        const date = tail.match(DATE);
        if (age && date) {
          fails.push({ rule: 'mixed-register', detail: `${p.route}: "${tail.slice(0, 80)}" prints both an age and a calendar date for one stamp — one line, one register (D322)` });
          continue;
        }
        if (age) {
          const n = Number(age[0].split(' ')[0]);
          const days = /\b(today|yesterday)\b/i.test(age[0]) ? (/\btoday\b/i.test(age[0]) ? 0 : 1) : n;
          if (days > AGE_HONEST) {
            fails.push({ rule: 'age-past-honest', detail: `${p.route}: "${tail.slice(0, 80)}" prints an age of ${days} days; past ${AGE_HONEST} the age is a claim about a stamp no run has corrected, and the ruled format is the calendar date (D431, superseding D322's 30-day switch)` });
          }
          lines.push(`${p.route}: age — ${tail.slice(0, 70)}`);
        } else if (date) {
          // D431 retired `date-inside-window`: a date form is legal at any age, and it is the form every
          // date-bearing surface prints. The age is still computed and reported as INFO, because the question
          // the rule moved on is a question a reviewer still asks of a printed stamp - how old is the read it
          // reports? - and printing the register without its age hides the answer this gate exists to show.
          const iso = parseDate(date[1]);
          const days = iso ? daysSince(iso, now) : null;
          lines.push(`${p.route}: date — ${tail.slice(0, 70)} (${days === null ? 'stamp not parseable as a calendar date' : `${days} day(s) old`})`);
        }
      }
    }
  }
  return { fails, lines };
}

/** Source-side rule: the register lives in one function. */
export const registerFindings = (files) => {
  const fails = [];
  for (const f of files) {
    if (f.file === 'lib/content.ts' || f.file === 'lib/provenance.mjs') continue; // the rule's own home
    // Comments are stripped first: a note explaining that ageSince() was replaced is not a call to it.
    for (const m of stripComments(f.text).matchAll(/\b(ageSince|formatSince|builtOn)\s*\(/g)) {
      fails.push({ rule: 'second-register', detail: `src/${f.file}: calls ${m[1]}() directly — every "how current is this" line goes through provenanceStamp() so the 30-day rule lives in one place (D322)` });
    }
  }
  return fails;
}

const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|\n)\s*\*[^\n]*/g, '\n')
    .replace(/\/\/[^\n]*/g, '');

const sourceFiles = (base) => {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      const p = resolve(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(astro|svelte|ts|js|mjs)$/.test(name)) out.push({ file: relative(resolve(base, 'src'), p), text: readFileSync(p, 'utf8') });
    }
  };
  walk(resolve(base, 'src'));
  return out;
};

const runSelftest = () => {
  const today = new Date('2026-11-14T00:00:00Z');
  const cases = [
    { name: 'the round-7 defect: an age past the day it was read', text: '<p>the club\u2019s list, last read 11 days ago</p>', want: ['age-past-honest'] },
    { name: 'clean control: a stale stamp prints the date', text: '<p>Copied from the club\u2019s own calendar on Sep 3, 2026</p>', want: [] },
    { name: 'clean control: built today', text: '<p>This page was built today, and the club\u2019s calendar was last read yesterday.</p>', want: [] },
    { name: 'an age that outlived even the coarse forms', text: '<p>last read 45 days ago</p>', want: ['age-past-honest'] },
    { name: 'clean control: a date form at any age (D431 retires date-inside-window)', text: '<p>Copied from the club\u2019s own calendar on Nov 13, 2026</p>', want: [] },
    { name: 'both registers on one line', text: '<p>last read 12 days ago, on Nov 2, 2026</p>', want: ['mixed-register'] },
    { name: 'a phrase with no register is not a failure', text: '<p>Copied from the club\u2019s own calendar, which the club keeps itself.</p>', want: [] },
    { name: 'a year in a URL is not a provenance line', text: '<a href="https://www.meetup.com/club/2026/">the calendar</a>', want: [] },
    { name: 'a future stamp is reported as an age, not a date', text: '<p>last read recently</p>', want: [] },
  ];
  let bad = 0;
  for (const c of cases) {
    const { fails } = provenanceFindings([{ route: '/fixture', text: c.text }], today);
    const got = fails.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = !miss.length && !extra.length;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(52)} ${got.join(',') || 'nothing'}${miss.length ? ` \u2014 missing: ${miss.join(',')}` : ''}${extra.length ? ` \u2014 unexpected: ${extra.join(',')}` : ''}`);
    for (const f of fails) console.log(`        ${f.rule}: ${f.detail}`);
  }
  // The source-side rule, planted in a fixture file so it can fire before anyone builds (D118).
  const srcCases = [
    { name: 'clean control: a component that uses provenanceStamp', file: 'components/Good.astro', text: '<p>last read {provenanceStamp(content.membership.asOf)}</p>', want: 0 },
    { name: 'a component computing its own age', file: 'components/Bad.astro', text: '<p>last read {ageSince(content.membership.asOf)}</p>', want: 1 },
    { name: 'a component printing the calendar date itself', file: 'components/Bad2.astro', text: '<p>built {formatSince(new Date().toISOString().slice(0,10))}</p>', want: 1 },
    { name: 'the rule\u2019s own module is exempt', file: 'lib/provenance.mjs', text: 'export const stamp = (iso) => ageSince(iso);', want: 0 },
    { name: 'prose in a comment is not a call', file: 'components/Notes.astro', text: '// ageSince() used to be here; provenanceStamp replaced it (D322)', want: 0 },
  ];
  for (const c of srcCases) {
    const got = registerFindings([{ file: c.file, text: c.text }]).length;
    const ok = got === c.want;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(52)} ${got} finding(s), wanted ${c.want}`);
  }
  console.log(`\ncheck:provenance selftest \u2014 ${cases.length + srcCases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
};

const runReal = () => {
  const files = sourceFiles(process.cwd());
  const srcFails = registerFindings(files);
  const pages = [];
  if (existsSync(DIST)) {
    const pageFile = (route) => {
      if (route === '/') return resolve(DIST, 'index.html');
      const bare = route.replace(/^\//, '');
      const asDir = resolve(DIST, `${bare}/index.html`);
      return existsSync(asDir) ? asDir : resolve(DIST, `${bare}.html`);
    };
    for (const route of emittedRoutes(DIST)) {
      const f = pageFile(route);
      if (existsSync(f)) pages.push({ route, text: readFileSync(f, 'utf8') });
    }
  }
  const { fails, lines } = provenanceFindings(pages);
  console.log(`check:provenance \u2014 ${files.length} source file(s), ${pages.length} built page(s), threshold ${AGE_HONEST} day(s) @measured ${new Date().toISOString().slice(0, 10)} by this gate`);
  for (const l of lines) console.log(`  ${l}`);
  for (const f of [...srcFails, ...fails]) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  const total = srcFails.length + fails.length;
  console.log(total ? `\n${total} provenance finding(s).` : '\nOne register, one threshold: every provenance line goes through provenanceStamp() and prints the form the rule chooses.');
  process.exit(total ? 1 : 0);
};

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) (selftest ? runSelftest : runReal)();
