#!/usr/bin/env node
// measure-a-claim - every number DESIGN.md states, its age, and the command that re-measures it.
//
// Why (D267): check:figures makes a stale stamp fail, but it does not tell you which probe to run, and
// the probes are scattered (design/schedule-geometry.mjs, design/grill/*, scripts/check-space.mjs). A
// session that sees "stamp is 61 days old" and has to find the instrument loses the afternoon it was
// meant to spend fixing the claim. This prints the pair: the number and its instrument.
//
//   node .agents/skills/measure-a-claim/scripts/stamps.mjs            every stamp, its age, its command
//   node .agents/skills/measure-a-claim/scripts/stamps.mjs --due      only the ones expiring soon (<=30d left)
//   node .agents/skills/measure-a-claim/scripts/stamps.mjs --stale   only the ones already past 60 days
//
// Read-only. It never runs a probe; it tells you which one to run.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim() + '/';
const FILE = 'DESIGN.md';
const STALE_DAYS = 60;
const SOON_DAYS = 30;

// Same grammar check:figures enforces. If this script and the gate disagree, the gate is right.
const STAMP = /@measured\s+(\d{4}-\d{2}-\d{2})(?:\s+by\s+(.+))?/;

// The instrument named after `by`, in whatever shape it was written. What actually appears in DESIGN.md:
//   by `npm run check:rhythm`        by check:ground and check:render
//   by design/grill/edge-probe.mjs   by round17's edge probe
//   by this table against its predecessor in git
// Pull out every token that is an npm script or a file in the tree; if none is, the stamp names a probe in
// prose and the honest answer is "go look for it". Path alternatives come first so `design/grill/page-measure.mjs`
// is not chopped at `design` by the looser script-name pattern.
const SCRIPTS = new Set(Object.keys(JSON.parse(readFileSync(root + 'package.json', 'utf8')).scripts ?? {}));
function commandFor(rest) {
  if (!rest) return [];
  const out = [];
  for (const m of rest.matchAll(/\b([A-Za-z0-9_\/.-]+\.(?:mjs|ts))\b|npm\s+run\s+([A-Za-z0-9_]+(?::[A-Za-z0-9_-]+)*)|\b([A-Za-z0-9_]+:[A-Za-z0-9_-]+)\b/g)) {
    const tok = m[1] ?? m[2] ?? m[3];
    if (!tok) continue;
    if (/\.(mjs|ts)$/.test(tok)) out.push(`node ${tok}`);
    else if (SCRIPTS.has(tok)) out.push(`npm run ${tok}`);
  }
  return [...new Set(out)];
}

const src = readFileSync(root + FILE, 'utf8').split('\n');
const today = new Date();

const rows = [];
let section = '';
for (let i = 0; i < src.length; i++) {
  if (/^#{1,6}\s/.test(src[i])) section = src[i].replace(/^#+\s*/, '').trim();
  const m = STAMP.exec(src[i]);
  if (!m) continue;
  const date = m[1];
  // A stamp may break the line after `by` (DESIGN.md does this twice); the instrument is on the next line.
  let probe = (m[2] ?? '').trim();
  if (/\bby$/.test(probe) || probe === '') probe += ' ' + (src[i + 1] ?? '');
  const age = Math.floor((today - new Date(date + 'T00:00:00Z')) / 86400000);
  // the figures the stamp covers: the lines below it, until the next heading or stamp
  const covered = [];
  for (let j = i + 1; j < src.length && !STAMP.test(src[j]) && !/^#{1,6}\s/.test(src[j]); j++) {
    const fig = /\b\d+(?:\.\d+)?\s?(?:px|%|ms|s\b|deg|\u00b0|KB|MB|octets?\b)/.exec(src[j]);
    if (fig) { covered.push(fig[0]); if (covered.length >= 4) break; }
  }
  const commands = commandFor(probe);
  rows.push({ line: i + 1, section, date, probe, age, covered, commands });
}

const filter = process.argv.includes('--stale') ? rows.filter((r) => r.age > STALE_DAYS)
  : process.argv.includes('--due') ? rows.filter((r) => r.age > STALE_DAYS - SOON_DAYS && r.age <= STALE_DAYS)
  : rows;

console.log(`${FILE}: ${rows.length} @measured stamps; the gate fails any stamp older than ${STALE_DAYS} days.`);
for (const r of filter) {
  const status = r.age > STALE_DAYS ? 'STALE (the gate is red)' : r.age > STALE_DAYS - SOON_DAYS ? `expires in ${STALE_DAYS - r.age}d` : `${r.age}d old`;
  console.log(`  L${String(r.line).padEnd(5)} ${r.date}  ${status}`);
  console.log(`        section: ${r.section}`);
  console.log(`        covers:  ${r.covered.join(', ') || '(no figure within the section below it)'}`);
  if (r.commands.length) {
    for (const c of r.commands) {
      const path = c.replace('node ', '').replace('npm run ', '');
      const missing = c.startsWith('node ') && !existsSync(root + path);
      console.log(`        re-measure: ${c}${missing ? '   <- the named file is not in this tree' : ''}`);
    }
  } else {
    console.log(`        re-measure: no instrument in the stamp ("${r.probe.slice(0, 60)}"). Find it: grep -rn "${r.probe.split(/\s+/)[0]}" design/ scripts/`);
  }
}
if (!filter.length) console.log(process.argv.includes('--stale') ? '  none stale.' : '  none expiring in the next 30 days.');
console.log('\nIf a number changes, change the number, the date and the probe in the same edit. Extending a date without re-running the probe is exactly what this gate exists to catch.');
