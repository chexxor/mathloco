#!/usr/bin/env node
// resume-checkin - the clock-in of AGENTS.md, in one command.
//
// Why (D267): a session that starts by re-deriving its own state spends its first ten minutes on
// `git status`, `git log`, opening NEXT.md and opening PLAN.md, and it usually ends up quoting a
// gate list from memory - which is the exact thing PLAN.md §Milestones was written to prevent. This
// script reads all of it once and prints what a fresh session actually needs: the branch, the HEAD,
// what is already dirty, what the plan says is active, the real gate list, and whether the last
// measured gate run predates the commit you are standing on.
//
//   node .agents/skills/resume-checkin/scripts/checkin.mjs        the check-in
//   node .agents/skills/resume-checkin/scripts/checkin.mjs --json machine-readable
//
// It reads; it never writes, never runs a build, never touches a network.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';


const git = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim() + '/';

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const head = git(['rev-parse', 'HEAD']);
const headDate = git(['log', '-1', '--format=%aI']);
const dirty = git(['status', '--short', '--', '.']);

function aheadOf(ref) {
  try {
    execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' });
  } catch {
    return null; // the ref does not exist here (fresh clone, no staging yet)
  }
  return Number(git(['rev-list', '--count', `${ref}..HEAD`]) || 0);
}

const section = (t) => `\n${t}\n` + '-'.repeat(t.length);

// ---- the plan, as the plan actually says it -------------------------------------------------------------
const PLAN = '.notes/PLAN.md';
const NEXT = '.notes/NEXT.md';
let milestoneRows = [];
if (existsSync(root + PLAN)) {
  const plan = readFileSync(root + PLAN, 'utf8');
  const inMilestones = plan.split('\n## Milestones')[1] ?? '';
  for (const line of inMilestones.split('\n')) {
    const m = /^\|\s*\*\*(MS\d+)\*\*\s*\|(.*)$/.exec(line.trim());
    if (!m) continue;
    // columns: description | exit gate | who | status. A table line ends with `|`, so the split leaves a
    // trailing empty cell - dropping the empties is what makes the status column the last one.
    const cells = m[2].split('|').map((c) => c.trim());
    while (cells.length && !cells[cells.length - 1]) cells.pop();
    milestoneRows.push({ id: m[1], desc: cells[0], gate: cells[1], status: cells[cells.length - 1] });
    // (who is responsible is cells[2]; it is in the plan and printed in --json)
  }
}

let next = null;
if (existsSync(root + NEXT)) {
  const text = readFileSync(root + NEXT, 'utf8');
  const stage = /\*\*Stage:\*\*\s*([^|]+?)\s*\*\*Closed:\*\*([^|]*?)\s*\*\*Active milestone:\*\*\s*\*\*(MS\d+)\*\*/.exec(text.replace(/\n/g, ' '));
  const firstBlock = /```bash\n([\s\S]*?)```/.exec(text);
  const hasQueue = /##\s*(queue|Queue|TODO|To do)/.test(text);
  next = {
    stage: stage?.[1]?.trim() ?? 'not stated in NEXT.md',
    active: stage?.[3] ?? 'not stated',
    closed: stage?.[2]?.replace(/[^A-Z0-9]+/g, ' ').trim() ?? '',
    firstCommands: firstBlock ? firstBlock[1].split('\n').map((l) => l.trim()).filter(Boolean) : [],
    hasQueue,
  };
}

// ---- the gate set, read from the runner, never from memory -------------------------------------------
let gateCount = null;
try {
  const list = execFileSync('node', ['scripts/gate-run.mjs', '--list'], { encoding: 'utf8', cwd: root });
  gateCount = list.split('\n').filter((l) => l.trim()).length;
} catch {
  gateCount = null;
}

// ---- the last measured run: does it predate this commit? ---------------------------------------------
const manifests = [];
for (const set of ['deploy', 'browser']) {
  const p = root + `.design/tmp-gate-logs/${set}/manifest.txt`;
  if (!existsSync(p)) continue;
  const lines = readFileSync(p, 'utf8').split('\n').slice(0, 4);
  const iso = /(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/.exec(lines[0] ?? '')?.[1];
  manifests.push({ set, header: lines[0], counts: lines[1], when: iso, predatesHead: iso && headDate && new Date(iso) < new Date(headDate) });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ branch, head, headDate, dirty, aheadOfMain: aheadOf('main'), aheadOfStaging: aheadOf('staging'), milestones: milestoneRows, next, gateCount, manifests }, null, 2));
  process.exit(0);
}

console.log(section('RESUME CHECK-IN'));
console.log(`branch      ${branch}  HEAD ${head.slice(0, 12)}  (${headDate})`);
const main = aheadOf('main'), staging = aheadOf('staging');
if (main !== null) console.log(`ahead of main: ${main}${staging !== null ? `, ahead of staging: ${staging}` : ''}`);
console.log(`uncommitted ${dirty ? `\n${dirty}` : '— nothing, the tree is clean'}`);

console.log(section('What the plan says is active'));
if (!next && !milestoneRows.length) {
  console.log('  .notes/ is absent (a clone). Read MILESTONES.md, the tracked projection, instead.');
  const rows = milestoneRows.length ? milestoneRows : [];
  for (const r of rows) console.log(`  ${r.id}  ${r.status}`);
} else {
  if (next) {
    console.log(`  stage ${next.stage}; closed ${next.closed}; active ${next.active}`);
    if (next.hasQueue) console.log('  WARNING: NEXT.md contains a queue heading - check:plan fails on that.');
    if (next.firstCommands.length) console.log(`  first commands:\n    ${next.firstCommands.join('\n    ')}`);
  }
  const live = milestoneRows.filter((r) => /active|next|paused|blocked|in progress/i.test(r.status));
  for (const r of live) {
    console.log(`  ${r.id}  ${r.status}`);
    console.log(`     gate: ${(r.gate ?? '').slice(0, 240)}`);
  }
}

console.log(section('The gate set, read from the runner'));
console.log(`  ${gateCount ?? 'unknown'} steps in verify. Read the list, do not remember it:`);
console.log('    node scripts/gate-run.mjs --list');

let baseline = null;
if (existsSync(root + 'design/gate-cost.json')) {
  const b = JSON.parse(readFileSync(root + 'design/gate-cost.json', 'utf8'));
  baseline = { measuredAt: b.deploy?.measuredAt, steps: Object.keys(b.deploy?.steps ?? {}).length, wall: b.deploy?.wallSecs };
}

console.log(section('Last measured gate run'));
if (!manifests.length) {
  console.log('  no manifest yet - run npm run verify before quoting any number as measured.');
}
for (const m of manifests) {
  console.log(`  ${m.set}: ${m.counts ?? ''}`);
  console.log(`  ${m.when ?? 'unknown time'}${m.predatesHead ? '  PREDATES HEAD - its numbers describe code that is no longer the tree you are in' : ''}`);
}
if (baseline) console.log(`  cost baseline: ${baseline.steps} steps at ${baseline.wall}s, frozen ${baseline.measuredAt}. If your change moves the wall clock, npm run cost:save in the same commit and say why.`);

console.log(section('Read before writing framework or UI code'));
console.log('  .agents/skills/astro/SKILL.md, svelte-core-bestpractices, svelte-code-writer, design-system, code-review-and-quality');
console.log('  Appearing in the skills list is not loading a skill. Open the file.');
