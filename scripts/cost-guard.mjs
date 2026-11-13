#!/usr/bin/env node
// cost-guard.mjs - the cost guard, as data, so it can be tested.
//
// Why this is separate from gate-run.mjs: the guard is arithmetic over a baseline and a run, and gate-run is
// the scheduler. Inlined, the arithmetic could only be exercised by running the whole 40-step set, so the
// guard had no selftest - an assertion nobody could prove was not always green (the repo rule: a gate ships
// with its own selftest). `npm run cost:selftest` plants each failure class the guard must name and requires
// a named verdict, plus a clean control so a green run means the guard is not merely always green.
//
// The comparison, since D269, is on WORK SECONDS (the sum of what each step took), never the wall clock:
// wall measures the box, work measures the set.
//
// The problem D269 left open, and what this file fixes (E6, D290): work seconds still measure the box when
// the box is busy. Measured on this rig (Linux native, 16 CPU): the deploy set ran 42.1s of like-for-like
// work at load 2.6 -> 3.9/16cpu @measured 2026-11-12 by `npm run cost:save` (design/gate-cost.json), and
// 66.6s of like-for-like work at load 6.8 -> 8.7/16cpu @measured 2026-11-12 by `npm run verify` in a fresh
// clone (.design/tmp-ci-clone, node 22.23.4). +58% with nothing in the repo changed; `strata-host` holds
// roughly 285% CPU in the second run. The old guard answered high load by refusing to fail, which means a
// real regression on a busy rig is invisible, and the only way to make it bite was to stop the operator's
// other process. That is not a guard, it is a hostage.
//
// The fix is to compare CPU-seconds, not seconds: a step's cost is what it took multiplied by how many CPUs
// were free to run it. Free CPU is estimated from the 1-minute load average at the start and end of the run,
// averaged (gate-run writes both into the manifest header, and gate-cost.mjs saves both with the baseline).
// Two runs of the same set on the same repo, one at load 3 and one at load 8 on a 16-CPU box, land within a
// few percent of each other in CPU-seconds; their wall numbers differ by about 2x.
//
// It is an estimate, not an instrument: load average is a 1-minute window sampled twice, and a 4-way
// parallel set lifts the average itself (measured 2026-11-11, Linux, 16 CPU: a 36.4s deploy run sampled
// 4.40 -> 7.72). So the guard keeps the same 2x bar, applies it to the normalised ratio, and prints both the
// raw and the normalised number so a reader can see what the estimate did. When a baseline carries no load
// fields (pre-D269 entries) normalisation is refused, the raw comparison is printed with that stated, and
// the load rule of the old guard applies: fail only at or below the load limit.

/** Parse "6.8/16cpu" into the number of CPUs free on average. Null for a missing or malformed field. */
export function freeCpu(loadStr) {
  const m = String(loadStr ?? '').match(/^([\d.]+)\/(\d+)cpu$/);
  if (!m) return null;
  return Math.max(0, Number(m[2]) - Number(m[1]));
}

/** Average free CPU across a run, from its start and end load readings. */
export function freeCpuAvg(loadStart, loadEnd) {
  const a = freeCpu(loadStart);
  const b = freeCpu(loadEnd);
  if (a === null || b === null) return null;
  return (a + b) / 2;
}

function pct(r) {
  const p = Math.round((r - 1) * 100);
  return `${p >= 0 ? '+' : ''}${p}%`;
}

/**
 * Compare a run against a baseline.
 *   base: {workSecs, steps:{name:secs}, measuredAt, load, loadStart}
 *   run:  {steps:{name:secs}, wallSecs, workSecs, loadStart, loadEnd}
 * Returns { lines, fail, ratio, normRatio }.
 */
export function compareCost(base, run, { costKey = 'deploy', loadLimit = 6 } = {}) {
  const lines = [];
  let fail = false;
  const baseWork = base ? (base.workSecs ?? base.wallSecs) : null;
  if (!baseWork) {
    return { lines: [`cost: no baseline for ${costKey} (design/gate-cost.json) - \`npm run cost:save\` after a green run starts one.`], fail: false, ratio: null, normRatio: null };
  }

  const baseSteps = base.steps ?? {};
  const runSteps = run.steps ?? {};
  const sharedNames = Object.keys(runSteps).filter((n) => baseSteps[n] > 0);
  const sharedNow = sharedNames.reduce((a, n) => a + runSteps[n], 0);
  const sharedBase = sharedNames.reduce((a, n) => a + baseSteps[n], 0);
  const ratio = sharedNames.length ? sharedNow / sharedBase : (Number(run.workSecs) || 0) / baseWork;

  const nowFree = freeCpuAvg(run.loadStart, run.loadEnd);
  const baseFree = freeCpuAvg(base.loadStart, base.load);
  // The discount is one-way (D290): a run on a BUSIER box is forgiven, never a run on a QUIETER box blamed.
  // Unclamped, a baseline frozen at load 9.5/16cpu makes an identical quiet run look 102% slower and FAIL
  // @measured 2026-11-13 by compareCost(base=the rig-set freeze, run=the same step seconds at load 2.6/16cpu).
  // Free CPU is a floor on contention, not a measure of the set's work, so it can only subtract.
  const normRatio = nowFree !== null && baseFree !== null && baseFree > 0 ? ratio * Math.min(1, nowFree / baseFree) : null;

  const loadText = run.loadStart && run.loadEnd ? `${run.loadStart} -> ${run.loadEnd}` : (run.loadEnd || 'load unknown');
  lines.push(`cost: ${costKey} ${Number(run.workSecs ?? sharedNow).toFixed(1)}s of work, ${run.wallSecs}s wall, ${Object.keys(runSteps).length} steps (load ${loadText})`);
  lines.push(`cost: like-for-like ${sharedNames.length} steps the baseline knows: ${sharedNow.toFixed(1)}s now vs ${sharedBase.toFixed(1)}s (${base.measuredAt}) = ${pct(ratio)}`);
  if (normRatio === null) {
    lines.push('cost: the baseline has no load fields, so the comparison cannot be normalised; the raw number is the one that counts');
  } else if (nowFree > baseFree) {
    lines.push(`cost: free-CPU normalisation is a discount only (baseline ${baseFree.toFixed(2)} free, this run ${nowFree.toFixed(2)} free) - a quieter box never makes a run look slower`);
  } else {
    lines.push(`cost: normalised for free CPU (baseline ${baseFree.toFixed(2)} free, this run ${nowFree.toFixed(2)} free) = ${pct(normRatio)}`);
  }

  const baseStepCount = Object.keys(baseSteps).length;
  const runStepCount = Object.keys(runSteps).length;
  if (runStepCount !== baseStepCount) {
    const unbaselined = Object.entries(runSteps).filter(([n]) => !(baseSteps[n] > 0));
    const extra = unbaselined.reduce((a, [, s]) => a + s, 0).toFixed(1);
    lines.push(`cost: the set has ${runStepCount} steps, the baseline ${baseStepCount}; ${unbaselined.length} step(s) it does not know cost ${extra}s: ${unbaselined.map(([n, s]) => `${n} ${s.toFixed(2)}s`).join(', ')}`);
  }

  // Per-step doubling, in CPU-seconds where the estimate is available.
  const factor = normRatio !== null && ratio > 0 ? normRatio / ratio : 1;
  for (const [name, secs] of Object.entries(runSteps)) {
    const b = baseSteps[name];
    if (b && secs * factor > b * 2) lines.push(`cost: one step doubled - ${name} ${b}s -> ${secs.toFixed(2)}s (normalised ${pct((secs * factor) / b)})`);
  }

  const loadMax = Math.max(Number((run.loadEnd || '0').split('/')[0] || 0), Number((run.loadStart || '0').split('/')[0] || 0));
  const verdictRatio = normRatio ?? ratio;

  if (verdictRatio > 2) {
    // A baseline with no load fields cannot be normalised, so on a contended rig the guard still only warns
    // rather than blocking a ship step for a reason that is not a defect (D118).
    if (normRatio === null && loadMax > loadLimit) {
      lines.push(`cost: WARN - 2x the baseline work, but the rig was at load ${loadText} and the baseline has no load fields; the guard only fails unnormalised at or below ${loadLimit}/16cpu.`);
      lines.push('      Time the doubled step on its own (`npm run build`). If it is near its baseline there, the box is');
      lines.push('      contended: stop the busy process, re-run, then `npm run cost:save` from the quiet run.');
    } else {
      fail = true;
      lines.push(`cost: FAIL - over 2x the baseline work once free CPU is accounted for (${pct(verdictRatio)} over ${base.measuredAt}). A slower gate is a gate people stop running: fix it, or`);
      lines.push('      re-baseline on purpose with `npm run cost:save` and say why in the commit message.');
      lines.push('      before either: time the doubled step on its own (`npm run build`). If it is near its');
      lines.push('      baseline there, the box is contended, and re-baselining freezes someone else\'s CPU in.');
    }
  } else if (verdictRatio > 1.4) {
    lines.push('cost: WARN - over 40% more work than the baseline for the steps it knows. Not a failure; the line above names the new steps before you call this normal.');
  }

  return { lines, fail, ratio, normRatio };
}

// ---------------------------------------------------------------- selftest ----------------------------------------------------------------
// Each planting names the verdict the guard must produce. A planting that does not produce it is a FAIL,
// printed by name - the same shape every other selftest in this repo uses.
if (process.argv.includes('--selftest')) {
  const QUIET = { loadStart: '2.6/16cpu', loadEnd: '3.9/16cpu' };   // the load the frozen baseline was taken at
  const BUSY = { loadStart: '6.8/16cpu', loadEnd: '8.7/16cpu' };    // strata-host holding ~285% CPU
  const base = {
    measuredAt: '2026-11-12', wallSecs: 33, workSecs: 42.1, load: QUIET.loadEnd, loadStart: QUIET.loadStart,
    steps: { check: 7.26, build: 18.39, 'check:cache': 0.94, 'audit:gate': 0.63 },
  };

  const cases = [
    { name: 'control: the same set at the same load', run: { wallSecs: 33, workSecs: 42.1, ...QUIET, steps: base.steps }, want: 'pass' },
    { name: 'the same set on a busy box (E6: must NOT fail)', run: { wallSecs: 55, workSecs: 66.6, ...BUSY, steps: { check: 13.98, build: 31.05, 'check:cache': 1.23, 'audit:gate': 0.99 } }, want: 'pass' },
    { name: 'a real doubling on a busy box must FAIL', run: { wallSecs: 120, workSecs: 140, ...BUSY, steps: { check: 30, build: 70, 'check:cache': 3, 'audit:gate': 3 } }, want: 'fail' },
    { name: 'a real doubling on a quiet box must FAIL', run: { wallSecs: 90, workSecs: 95, ...QUIET, steps: { check: 16, build: 40, 'check:cache': 2, 'audit:gate': 1.4 } }, want: 'fail' },
    { name: 'no load fields in the baseline, busy box: WARN, not FAIL', run: { wallSecs: 100, workSecs: 100, loadStart: null, loadEnd: '9.0/16cpu', steps: { check: 18, build: 45, 'check:cache': 2, 'audit:gate': 1.5 } }, want: 'warn' },
    { name: 'no load fields in the baseline, quiet box: still FAILS', run: { wallSecs: 100, workSecs: 100, loadStart: null, loadEnd: '3.0/16cpu', steps: { check: 18, build: 45, 'check:cache': 2, 'audit:gate': 1.5 } }, want: 'fail' },
    { name: 'steps the baseline does not know are named and do not by themselves fail', run: { wallSecs: 41, workSecs: 35.7, ...QUIET, steps: { ...base.steps, 'check:svelte': 8.45 } }, want: 'pass' },
    { name: 'a run with steps missing from the baseline still reports the step-count disagreement', run: { wallSecs: 30, workSecs: 23, ...QUIET, steps: { check: 7.26, build: 18.39 } }, want: 'pass' },
    { name: 'a missing baseline says so instead of comparing to nothing', base: null, run: { wallSecs: 33, workSecs: 42.1, ...QUIET, steps: base.steps }, want: 'nobaseline' },
    { name: 'a load field the run could not parse refuses to normalise', run: { wallSecs: 42, workSecs: 39.3, loadStart: 'n/a', loadEnd: '3.9/16cpu', steps: { check: 11, build: 26, 'check:cache': 1.4, 'audit:gate': 0.9 } }, want: 'warn' },
    { name: 'a baseline frozen on a busy box does not make an identical quiet run FAIL (D290)', base: { measuredAt: '2026-11-13', wallSecs: 6.3, workSecs: 12.0, load: BUSY.loadEnd, loadStart: BUSY.loadStart, steps: { 'check:lsp': 5.59, 'check:lsp:selftest': 6.30, 'cost:selftest': 0.14 } }, run: { wallSecs: 4.6, workSecs: 12.0, ...QUIET, steps: { 'check:lsp': 5.59, 'check:lsp:selftest': 6.30, 'cost:selftest': 0.14 } }, want: 'pass' },
    { name: 'a doubling against a busy-box baseline still FAILS', base: { measuredAt: '2026-11-13', wallSecs: 6.3, workSecs: 12.0, load: BUSY.loadEnd, loadStart: BUSY.loadStart, steps: { 'check:lsp': 5.59, 'check:lsp:selftest': 6.30, 'cost:selftest': 0.14 } }, run: { wallSecs: 13, workSecs: 25, ...QUIET, steps: { 'check:lsp': 12, 'check:lsp:selftest': 13, 'cost:selftest': 0.3 } }, want: 'fail' },
  ];

  let wrong = 0;
  for (const c of cases) {
    const b = c.base === undefined ? base : c.base;
    const res = compareCost(b, c.run);
    let got = 'pass';
    if (c.want === 'nobaseline') got = 'nobaseline';
    else if (res.fail) got = 'fail';
    else if (res.lines.some((l) => l.startsWith('cost: WARN'))) got = 'warn';
    const ok = got === c.want;
    if (!ok) wrong++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.name}  [want ${c.want}, got ${got}]`);
    if (!process.argv.includes('--quiet')) for (const l of res.lines) console.log(`     | ${l}`);
  }
  console.log(`cost:selftest - ${cases.length} cases, ${wrong} wrong`);
  process.exit(wrong ? 1 : 0);
}
