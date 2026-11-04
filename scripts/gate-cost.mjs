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
  const whenm = /^# gate-run \w+ set, (\S+)/m.exec(text);
  if (!wm) return null;
  const steps = {};
  for (const m of text.matchAll(/^ok\s+(\S+)\s+([\d.]+)s/gm)) steps[m[1]] = Number(m[2]);
  return { measuredAt: (whenm ? whenm[1] : '').slice(0, 10), wallSecs: Number(wm[1]), steps };
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
  const pct = b ? Math.round((v.wallSecs / b.wallSecs - 1) * 100) : null;
  console.log(`${s}: ${v.wallSecs}s (${v.measuredAt})` + (b ? ` vs baseline ${b.wallSecs}s = ${pct >= 0 ? '+' : ''}${pct}%` : ' - no baseline yet'));
  for (const [name, secs] of Object.entries(v.steps)) {
    if (b?.steps?.[name] && secs > b.steps[name] * 1.5) console.log(`  ${name}: ${b.steps[name]}s -> ${secs}s`);
  }
}

if (process.argv.includes('--save')) {
  const out = { ...base, ...current, note: 'tracked baseline for the cost guard in scripts/gate-run.mjs. Re-baseline on purpose, in a commit that says why.' };
  writeFileSync(root + OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`cost: wrote ${OUT} for: ${Object.keys(current).join(', ')}`);
}
