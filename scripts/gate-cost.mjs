#!/usr/bin/env node
// npm run cost:save - freeze the current gate cost as the tracked baseline.
//
// gate-run compares every green run against `design/gate-cost.json` and fails past 2x (D151). This script
// writes that file from the manifests the last run left in `.design/tmp-gate-logs/<set>/manifest.txt`.
// Re-baselining is a deliberate act: do it in a commit that says *why* the new cost is acceptable, because
// the alternative is a gate set that quietly doubles and then gets skipped under time pressure.
//
//   node scripts/gate-cost.mjs            print what the last runs cost vs the baseline, change nothing
//   node scripts/gate-cost.mjs --save     write the baseline from the last runs
//   node scripts/gate-cost.mjs --save --force   save even under a load this rig cannot clear
//
// The comparison since D269 is on WORK SECONDS (the sum of the steps' own times), because wall measures the
// box and work measures the set. The `load` field is kept for the same reason: it tells you whether the
// number you are freezing was produced by this repo or by whatever else was running on the rig.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = 'design/gate-cost.json';
const sets = ['deploy', 'browser'];

function read(set) {
  const f = `.design/tmp-gate-logs/${set}/manifest.txt`;
  if (!existsSync(root + f)) return null;
  const text = readFileSync(root + f, 'utf8');
  const wm = /—\s*([\d.]+)s wall/.exec(text);
  const sm = /([\d.]+)s of work/.exec(text);
  const whenm = /^# gate-run \w+ set, (\S+)/m.exec(text);
  // The load the run ran under (gate-run writes it into the manifest header). A baseline frozen on a contended
  // box is a bar nobody can clear, so the number travels with the entry rather than being forgotten.
  const lm = /load ([\d.]+\/\d+cpu) -> ([\d.]+\/\d+cpu)/.exec(text);
  if (!wm) return null;
  const steps = {};
  for (const m of text.matchAll(/^ok\s+(\S+)\s+([\d.]+)s/gm)) steps[m[1]] = Number(m[2]);
  return {
    measuredAt: (whenm ? whenm[1] : '').slice(0, 10),
    wallSecs: Number(wm[1]),
    workSecs: sm ? Number(sm[1]) : null,
    load: lm ? lm[2] : null,
    steps,
    stepCount: Object.keys(steps).length,
  };
}

const current = {};
for (const s of sets) {
  const v = read(s);
  if (v) current[s] = v;
  else console.log(`cost: no manifest for the ${s} set (.design/tmp-gate-logs/${s}/manifest.txt) - run \`npm run verify${s === 'browser' ? ':browser' : ''}\` first.`);
}
if (!Object.keys(current).length) {
  console.error('cost: nothing to do - no manifests found.');
  process.exit(1);
}

const base = existsSync(root + OUT) ? JSON.parse(readFileSync(root + OUT, 'utf8')) : {};
for (const [s, v] of Object.entries(current)) {
  const b = base[s];
  const vWork = v.workSecs ?? v.wallSecs;
  const bWork = b ? (b.workSecs ?? b.wallSecs) : null;
  const pct = bWork ? Math.round((vWork / bWork - 1) * 100) : null;
  console.log(
    `${s}: ${vWork}s of work, ${v.wallSecs}s wall, ${v.stepCount} steps (${v.measuredAt}${v.load ? `, load ${v.load}` : ''})` +
      (bWork ? ` vs baseline ${bWork}s (${b.measuredAt}${b.load ? `, load ${b.load}` : ''}, ${b.stepCount ?? Object.keys(b.steps ?? {}).length} steps) = ${pct >= 0 ? '+' : ''}${pct}%` : ' - no baseline yet'),
  );
  for (const [name, secs] of Object.entries(v.steps)) {
    if (b?.steps?.[name] && secs > b.steps[name] * 1.5) console.log(`  ${name}: ${b.steps[name]}s -> ${secs}s`);
  }
  if (b && !b.workSecs) console.log(`  baseline has no workSecs - the first --save writes it, and the comparison stops comparing wall to work.`);
}

// A baseline frozen while the rig is busy is a bar the repo cannot clear: gate-run's own comment records a
// +125% cost FAIL from `strata-host` holding 542% CPU (measured 2026-11-05, Linux, 16 CPU). The load that
// produced the numbers is saved with them, so the next session can tell which half of a delta is the set.
const LOAD_LIMIT = 6;
if (process.argv.includes('--save')) {
  const saving = {};
  for (const [s, v] of Object.entries(current)) {
    const l = v.load ? Number(v.load.split('/')[0]) : null;
    if (l !== null && l > LOAD_LIMIT && !process.argv.includes('--force')) {
      console.error(`cost: skipped the ${s} set - its last run ended at load ${v.load} (limit ${LOAD_LIMIT}/16cpu).`);
      console.error('      Stop whatever is busy (this rig: `strata-host`) and re-run that set, or pass --force and say why in the commit.');
      continue;
    }
    saving[s] = v;
  }
  if (!Object.keys(saving).length) {
    console.error('cost: nothing saved - every manifest available was produced under a load this rig cannot clear.');
    process.exit(1);
  }
  const out = {
    ...base,
    ...saving,
    note: 'tracked baseline for the cost guard in scripts/gate-run.mjs. The comparison is on workSecs - the sum of the time each step took - not wallSecs: wall measures the box, work measures the set (D269). Re-baseline on purpose, in a commit that says why. The `load` field is the 1-minute load average / CPU count at the end of that run: a baseline taken under a high load is a bar the repo cannot clear, so check it before trusting a comparison, and gate-cost.mjs refuses to save above 6/16cpu without --force.',
  };
  writeFileSync(root + OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`cost: wrote ${OUT} for: ${Object.keys(saving).join(', ')}` + (Object.keys(current).length !== Object.keys(saving) ? ` (skipped: ${Object.keys(current).filter((s) => !saving[s]).join(', ')})` : ''));
}
