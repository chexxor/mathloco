#!/usr/bin/env node
// check:figures - a measured number in a doc is a claim with an expiry date.
//
// Why (D151): `DESIGN.md` is the authority an agent reads before it touches the UI, and in one week it
// carried three figures its own probes contradicted - a nav row "needs 171px" while `check:space` reported
// 176, a floor margin that "clears by 105px" when it clears by 100, and "the whole browser ritual is ~14s"
// against a measured `verify:browser` of 87.8s. None of those were lies; they were true once. A stale
// measurement in an authority doc is worse than no measurement, because it is not questioned.
//
// The mechanism, deliberately cheap (no browser, no screenshot):
//   a stamp  -  `@measured 2026-11-03 by check:space`  -  placed anywhere in a section, it covers every
//   figure below it in that section, until the next heading or the next stamp.
//   a figure -  a number with a unit: px, %, ms, s, deg/°, KB, MB, octets, or a bare "N of M".
//   the gate -  (1) a stamp older than STALE_DAYS fails; (2) a figure with no stamp before it is counted,
//   and the count may not grow past the frozen baseline in `design/figures.baseline.json`.
//
// Only *measurement-shaped* prose is policed: a figure on a line that talks about measuring, painting,
// probing, contrast, viewports, chroma or bytes. Ratified scale values ("body 17.6px/24px", "4px grid") are
// decisions with sources in design/decisions.json, not claims about the built page, and stamping those would
// be theatre. A decision gets a source; a measurement gets a date. it cannot tell you the stamped number is still true. That would mean re-running the
// probe, which costs a browser. It makes the age of the number unmissable instead. Probes that are cheap
// enough to re-run are named in the stamp, so re-running one by hand is a one-line command.
//
//   node scripts/check-figures.mjs            gate
//   node scripts/check-figures.mjs --save     freeze the current unstamped count as the baseline

const STALE_DAYS = 60;
const FILE = 'DESIGN.md';
const BASELINE = 'design/figures.baseline.json';

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = readFileSync(root + FILE, 'utf8').split('\n');

const STAMP = /@measured\s+(\d{4}-\d{2}-\d{2})(?:\s+by\s+([A-Za-z0-9:_\/-]+))?/;
// A figure: a number that is a measurement, not a sentence. Deliberately excludes bare integers with no
// unit (they are usually counts in prose), hex colours, versions and file names, and - importantly -
// anything inside a code span or a fenced block: `oklch(98.5% .006 85)` is a definition, and a probe's
// excerpt is somebody else's claim. Only prose figures are ours to keep honest.
const FIGURE = /\b\d+(?:\.\d+)?\s?(?:px|%|ms|s\b|deg|\u00b0|KB|MB|octets?\b)/g;

let unstamped = 0;
const offenders = [];
const stamped = [];
let cur = null; // {date, probe}

let fenced = false;
for (let i = 0; i < src.length; i++) {
  const raw = src[i];
  if (/^\s*```/.test(raw)) fenced = !fenced;
  if (/^#{1,6}\s/.test(raw)) cur = null; // a stamp covers its own section, not the rest of the file
  const line = fenced ? '' : raw.replace(/`[^`]*`/g, ' ');
  const sm = STAMP.exec(raw);
  if (sm) {
    cur = { date: sm[1], probe: sm[2] || '(unnamed)', line: i + 1 };
    stamped.push(cur);
  }
  const figs = line.match(FIGURE);
  if (!figs) continue;
  if (!/measur|painted|probe|verify:|check:|contrast|ratio|\bvs\b|viewport|ceiling|scroll|byte|chroma|ink share|device px|hairline/i.test(line)) continue;
  if (!cur) {
    unstamped++;
    if (offenders.length < 12) offenders.push(`  ${FILE}:${i + 1}  ${figs.slice(0, 3).join(' ')}  |  ${line.trim().slice(0, 80)}`);
  }
}

let bad = 0;
const today = new Date();
for (const s of stamped) {
  const age = Math.floor((today - new Date(s.date + 'T00:00:00Z')) / 86400000);
  if (age > STALE_DAYS) {
    console.error(`${FILE}:${s.line} stamp is ${age} days old (limit ${STALE_DAYS}): @measured ${s.date} by ${s.probe}`);
    console.error('  re-run the probe and update the number and the date, or delete the number. Do not extend the date.');
    bad++;
  }
}

const base = existsSync(root + BASELINE) ? JSON.parse(readFileSync(root + BASELINE, 'utf8')) : null;
if (process.argv.includes('--save')) {
  writeFileSync(root + BASELINE, JSON.stringify({ savedAt: today.toISOString().slice(0, 10), unstamped, stamped: stamped.length, stales: STALE_DAYS }, null, 2) + '\n');
  console.log(`check-figures: baseline saved - ${unstamped} unstamped figures, ${stamped.length} stamps.`);
  process.exit(0);
}

if (!base) {
  console.error(`check-figures: no baseline. Run \`node scripts/check-figures.mjs --save\` once you have stamped what you can.`);
  console.error(`  currently ${unstamped} unstamped figures; first offenders:`);
  offenders.forEach((o) => console.error(o));
  process.exit(1);
}

if (unstamped > base.unstamped) {
  console.error(`check-figures: ${unstamped} figures carry no @measured stamp; baseline is ${base.unstamped} (saved ${base.savedAt}).`);
  console.error('  a new measured claim in DESIGN.md needs a stamp on the same line or above it:');
  offenders.forEach((o) => console.error(o));
  bad++;
}

if (!bad) {
  console.log(`check-figures: ok - ${stamped.length} stamps, all within ${STALE_DAYS} days; ${unstamped} unstamped figures against a baseline of ${base.unstamped}.`);
  if (unstamped) console.log(`  unstamped figures are counted, not listed - run it with --save after stamping more to ratchet the baseline down.`);
}
process.exit(bad ? 1 : 0);
