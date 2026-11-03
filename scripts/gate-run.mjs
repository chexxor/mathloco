#!/usr/bin/env node
// gate-run.mjs — the gate set, in dependency order, with the independent steps run side by side.
//
//   npm run verify                 # the deploy gate set (browser-free) — this script is what runs
//   npm run verify:browser         # the browser ritual over the dist that already exists
//   node scripts/gate-run.mjs --serial        # same gates, one at a time (small machine, flake hunt)
//   node scripts/gate-run.mjs --list          # print the steps and their times from the last plan, exit 0
//   node scripts/gate-run.mjs check:classes check:design   # a named subset (still in dependency order)
//   GATE_JOBS=1 ...                            # same as --serial, for CI YAML that prefers env
//
// Why this exists: the wall clock of the loop decides whether the gates get run. Measured on the dev rig
// (Linux, 16 CPU, node 22.23.4, `npm run <step>` timed one at a time, 2026-11-03):
//
//   check (astro check) 7.21s   build 4.09s   check:cache 0.95s   check:social:selftest 1.78s
//   check:classes 0.42s  check:design 0.15s  check:social 0.41s  db:check 0.39s
//   check:sanitize 0.26s  audit:gate 0.66s   check:deploy 0.36s   -> 16.7s summed
//
// Everything in that list except `check:deploy` reads only `src/` and `design/`, so the chain version of
// `verify` was paying for ten steps that had no ordering between them. `check:deploy` is the only real
// dependency: it opens `dist/server/wrangler.json`, so it waits for `build`. Two stages, then, and the
// parallel version measured 7.6s against 16.7s — the same 21+ checks, not a smaller set.
//
// `astro check` and `astro build` in the same stage was tested rather than assumed, because both touch
// `.astro/`: run concurrently on 2026-11-03 both exited 0 (7.07s wall for the pair) and `check:deploy`
// accepted the artifact. If that ever stops being true on an upgrade, `--serial` is the fallback and this
// file is the place to record the ordering.
//
// The browser set (`verify:browser`) is measured separately and runs only when asked: **85.6s wall for its 7
// steps** on this rig (2026-11-03, jobs=4, wall == work because every step must be ALONE — each runs its own
// Firefox pool, see the note in BROWSER). It was 44.7s before the width sets grew to 1240/640/390/320 (record
// 0022); that is the price of measuring the breakpoints the code actually uses. Its wall clock is one reason it is
// not in `verify`; the other is that the runner needs Firefox, which is an operator call. The log capture below is
// what makes its output survive a green run.
//
// What is deliberately NOT here: `check:discord` (needs a bot token), `check:ai` (needs Groq credentials
// and spends a model call), and the browser gates as a deploy gate (the runner has no Firefox — D123).
// Those exclusions are identical to the ones the old `npm run verify` chain had; only the schedule moved.
//
// Output discipline: each step's stdout/stderr is captured and replayed as a block, so nothing
// interleaves. A step that fails prints its own output under its name; steps that needed it are reported
// SKIPPED rather than run against an artifact that does not exist.
//
// Every step's full output is ALSO written to `.design/tmp-gate-logs/{deploy,browser}/<step>.txt`, pass or fail
// (D144). Why: a green run used to leave the word "ok" and throw the measurement away, and the output is
// where the answer lives whenever a decision has to be taken from a gate — which controls measured what,
// what a probe saw, what the preview will show. It got asked for four times in one session and each time
// the answer cost a re-run of a 50-80s browser step. `.design/tmp-*` is gitignored by an existing rule, so
// this adds no tracked noise, and a run overwrites its own set's directory: the logs are the *last* run.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * A step is one existing `package.json` script (so `npm run <step>` still works standalone and the
 * gate set here cannot drift from the one a human runs by hand) plus its scheduling.
 * `needs` names steps whose failure makes this one meaningless.
 */
const DEPLOY = [
  { name: 'check', desc: 'astro check: types in .astro/.svelte/.ts' },
  { name: 'check:classes', desc: 'every written class resolves to CSS' },
  { name: 'check:design', desc: 'every design path a doc or script cites resolves' },
  { name: 'check:decisions', desc: 'the tracked decision index matches the log, and no D-id citation dangles' },
  { name: 'check:figures', desc: 'a measured number in DESIGN.md carries a date, and that date is not stale' },
  { name: 'check:social', desc: 'the committed share card against its painted report' },
  { name: 'check:social:selftest', desc: 'the card checks can still fail' },
  { name: 'db:check', desc: 'schema and migrations agree, no database opened' },
  { name: 'check:sanitize', desc: 'summary rendering stays text-only' },
  { name: 'check:cache', desc: 'summary-cache rules against a fake KV namespace' },
  { name: 'audit:gate', desc: 'prod-only npm audit against an explicit allowlist' },
  { name: 'build', desc: 'astro build -> dist/' },
  // dist/ exists only after `build`, and both of these read the artifact rather than the source.
  { name: 'check:deploy', desc: 'the built artifact is deployable on the apex', needs: ['build'] },
  { name: 'check:content', desc: 'no placeholder, no unsourced claim, no fabricated number ships', needs: ['build'] },
  { name: 'check:content:selftest', desc: 'the content gate can still fail', needs: ['build'] },
];

// The browser ritual (D123): everything a human used to type by hand, in one command, over the dist that
// `verify` just built. It does NOT build first — several of these mutate or re-measure the artifact, and
// `check:render:dist` is the `--no-build` form precisely so the run measures the thing being tested.
// The mutating selftest runs after the read-only gates so a crash cannot leave a mutated page under a
// passing render gate.
const BROWSER = [
  // `alone: true` — a step that runs its OWN pool of browsers takes the whole machine. Measured on this rig
  // (Linux, native): check:mark alone is 10s; in a wave beside check:space and check:social:live it took
  // 152s and came back `exit 1 / firefox rc=?` (a timeout, twice in a row), while check:render:dist reports
  // nine internal measurements it already runs JOBS-at-a-time by itself. Two browser pools in one wave buys
  // nothing here — the browser steps are almost all downstream of check:render:dist anyway — and it buys a
  // flake, which is the one thing a gate may not buy.
  { name: 'check:render:dist', desc: 'control geometry, contrast, bands, keylines, nav fit, the mark', alone: true },
  { name: 'check:mark', desc: 'the mark probe at 320 and 1240: painted ink and meaning', needs: ['check:render:dist'], alone: true },
  { name: 'check:social:live', desc: 'the card producer itself, into a gitignored temp file', needs: ['check:render:dist'], alone: true },
  { name: 'check:space', desc: 'where the emptiness is, and what each reserved slot measures', needs: ['check:render:dist'], alone: true },
  // what the page PAINTS as its ground, and what a hairline measures off those bytes (D143). The rest of the
  // render gate is colour-string arithmetic, so a background-image moves none of its numbers — this is the step
  // that sees pixels, and the only one that can go red on a texture.
  { name: 'check:ground', desc: 'the painted page ground and the painted hairlines, off screenshot bytes', needs: ['check:render:dist'], alone: true },
  { name: 'check:ground:selftest', desc: 'four plantings the ground probe must tell apart (it copies dist, so it reads only)', needs: ['check:render:dist', 'check:ground'], alone: true },
  // last: it edits dist/client/index.html and restores it in a finally block
  // Runs LAST, and the needs list is why it is not just 'after check:render:dist': the selftest PLANTS
  // defects in dist/client/index.html to prove check:render can go red (D118). In the same wave as the
  // read-only probes, a mark or space probe could measure a planted page and report a finding that never
  // happened — a race that reads as a flaky browser gate. (It must not rebuild either: check:render would
  // build over its own fixtures and selftest nothing.)
  { name: 'check:render:selftest', desc: 'twelve mutations, each of which check:render must FAIL (last: it mutates dist)', needs: ['check:render:dist', 'check:mark', 'check:social:live', 'check:space', 'check:ground'] },
];

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const positional = args.filter((a) => !a.startsWith('--'));
const serial = flag('--serial') || process.env.GATE_JOBS === '1';
const JOBS = serial ? 1 : Math.max(1, Number(process.env.GATE_JOBS ?? 4));

const set = flag('--browser') ? BROWSER : DEPLOY;
if (positional.length) {
  const unknown = positional.filter((p) => !set.some((s) => s.name === p));
  if (unknown.length) {
    console.error(`gate-run: unknown step(s): ${unknown.join(', ')}`);
    console.error(`  known: ${set.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }
}
const picked = positional.length ? set.filter((s) => positional.includes(s.name)) : set;

if (flag('--list')) {
  for (const s of picked) console.log(`${s.name.padEnd(26)} ${s.needs ? `after ${s.needs.join(',')} ` : ''}${s.desc}`);
  process.exit(0);
}

const dist = resolve('dist/client/index.html');
if (set === BROWSER && !existsSync(dist)) {
  console.error('gate-run --browser: dist/client/index.html missing — run npm run verify (or npm run build) first.');
  process.exit(1);
}

// One directory per set, overwritten by the run, so `check:render:dist.txt` always means "the last render
// measurement I ran". A log write must never be what breaks the gate set, so failures are reported loudly
// and do not throw — a silent log failure is the same defect class as no logs at all.
const LOG_DIR = resolve('.design', 'tmp-gate-logs', set === BROWSER ? 'browser' : 'deploy');
let logBroken = null;
try {
  mkdirSync(LOG_DIR, { recursive: true });
  for (const f of readdirSync(LOG_DIR)) if (f.endsWith('.txt')) unlinkSync(join(LOG_DIR, f));
} catch (e) { logBroken = e.message; }
const runStarted = new Date().toISOString();
const writeLog = (name, { code, secs, out, note = '' }) => {
  if (logBroken) return;
  const head = `# gate-run: ${name}\n# set=${set === BROWSER ? 'browser' : 'deploy'} started=${runStarted} exit=${code} secs=${secs.toFixed(2)}\n# command: npm run --silent ${name}\n`;
  try { writeFileSync(join(LOG_DIR, `${name}.txt`), `${head}${note}\n${out}\n`); }
  catch (e) { logBroken = e.message; }
};

const run = (step) => new Promise((done) => {
  const t0 = process.hrtime.bigint();
  const child = spawn(NPM, ['run', '--silent', step.name], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (b) => { out += b; });
  child.stderr.on('data', (b) => { out += b; });
  child.on('error', (e) => { out += `\nspawn failed: ${e.message}`; });
  child.on('close', (code) => done({
    step,
    code: code ?? 1,
    secs: Number(process.hrtime.bigint() - t0) / 1e9,
    out: out.trimEnd(),
  }));
});

const results = new Map();
const t0 = Date.now();
let failed = 0;
let skipped = 0;

// Ready-queue waves, not fixed chunks. The chunked version of this put `check:content` and `check:deploy` in
// the SAME wave as `build`, so they looked for a build result that did not exist yet and skipped: the deploy
// set shipped green while its two content gates never ran. A step joins a wave only once its needs have
// SUCCEEDED, which is also what stops a failed `check` from being papered over by running everything
// downstream of it anyway. (Array order still decides who goes first when more than JOBS are ready.)
const remaining = [...picked];
while (remaining.length) {
  const readySteps = remaining.filter((step) => (step.needs ?? []).every((n) => results.get(n)?.code === 0));
  if (readySteps.length === 0) {
    // Everything left is waiting on something that failed or was itself skipped.
    for (const step of remaining) {
      const missing = (step.needs ?? []).filter((n) => results.get(n)?.code !== 0);
      skipped++;
      const why = missing.map((m) => `${m} (${results.get(m) ? 'FAILED' : 'not run'})`).join(', ');
      writeLog(step.name, { code: 'skipped', secs: 0, out: `SKIPPED — needed: ${why}`, note: '\n# The step never ran: an earlier step it needs did not succeed.' });
      console.log(`SKIP ${step.name.padEnd(24)} needed: ${why}`);
    }
    break;
  }
  // An `alone` step gets a wave to itself, and no non-alone step is held back behind one: if the first
  // ready step is alone, the wave is just it; otherwise the wave is the ready steps that are not alone.
  let wave;
  if (serial) wave = readySteps.slice(0, 1);
  else if (readySteps[0].alone) wave = [readySteps[0]];
  else wave = readySteps.filter((s) => !s.alone).slice(0, JOBS);
  if (wave.length === 0) wave = [readySteps[0]];   // everything ready is alone; take the first
  for (const step of wave) remaining.splice(remaining.indexOf(step), 1);
  const waveResults = await Promise.all(wave.map(run));
  for (const r of waveResults) {
    results.set(r.step.name, r);
    const secs = r.secs.toFixed(2).padStart(6);
    writeLog(r.step.name, r);
    if (r.code === 0) {
      console.log(`ok   ${r.step.name.padEnd(24)} ${secs}s`);
    } else {
      failed++;
      console.log(`FAIL ${r.step.name.padEnd(24)} ${secs}s  (exit ${r.code})`);
      if (r.out) console.log(r.out.split('\n').map((l) => `     | ${l}`).join('\n'));
    }
  }
}

const wall = ((Date.now() - t0) / 1000).toFixed(1);
const sum = [...results.values()].reduce((a, r) => a + r.secs, 0).toFixed(1);
const ok = results.size - failed - 0;
try {
  const manifest = [...results.values()]
    .map((r) => `${r.code === 0 ? 'ok  ' : 'FAIL'} ${r.step.name.padEnd(24)} ${r.secs.toFixed(2).padStart(7)}s  -> ${r.step.name}.txt`)
    .join('\n');
  writeFileSync(join(LOG_DIR, 'manifest.txt'), `# gate-run ${set === BROWSER ? 'browser' : 'deploy'} set, ${runStarted}\n# ${ok} ok, ${failed} failed, ${skipped} skipped — ${wall}s wall, ${sum}s of work (jobs=${serial ? 1 : JOBS})\n${manifest}\n`);
} catch (e) { logBroken ||= e.message; }
console.log(`\ngate-run: ${ok} ok, ${failed} failed, ${skipped} skipped — ${wall}s wall, ${sum}s of work (jobs=${serial ? 1 : JOBS}, set=${set === BROWSER ? 'browser' : 'deploy'})`);
console.log(logBroken
  ? `NOTE step output was NOT saved (${logBroken}) — every number above is unverified until you re-run with a writable .design/`
  : `logs  ${LOG_DIR}/ — every step's full output, pass or fail, from this run (gitignored scratch; the last run wins)`);

// The cost of a gate set doubles without anyone deciding it: `verify:browser` went 44.7s -> 85.6s -> 87.8s
// as the width sets grew (D146) and nobody compared two runs. A gate that takes twice as long is a gate
// people stop running, so every green run compares itself against a tracked baseline. Only 2x fails: CPU
// contention on a home rig is real, and a 40% wobble is not a regression.
const COST_BASELINE = resolve('design', 'gate-cost.json');
const costKey = set === BROWSER ? 'browser' : 'deploy';
if (!failed && !skipped && existsSync(COST_BASELINE)) {
  try {
    const base = JSON.parse(readFileSync(COST_BASELINE, 'utf8'))[costKey];
    if (base && base.wallSecs) {
      const ratio = Number(wall) / base.wallSecs;
      const pct = Math.round((ratio - 1) * 100);
      console.log('cost: ' + costKey + ' ' + wall + 's vs baseline ' + base.wallSecs + 's (' + base.measuredAt + ') = ' + (pct >= 0 ? '+' : '') + pct + '%');
      for (const r of results.values()) {
        const b = base.steps && base.steps[r.step.name];
        if (b && r.secs > b * 2) console.log('cost: one step doubled - ' + r.step.name + ' ' + b + 's -> ' + r.secs.toFixed(2) + 's');
      }
      if (ratio > 2) {
        failed++;
        console.log('cost: FAIL - over 2x the baseline. A slower gate is a gate people stop running: fix it, or');
        console.log('      re-baseline on purpose with `npm run cost:save` and say why in the commit message.');
      } else if (ratio > 1.4) {
        console.log('cost: WARN - over 40% vs baseline. Not a failure; look at the manifest before the new cost is normal.');
      }
    }
  } catch (e) {
    console.log('cost: baseline unreadable (' + e.message + ') - comparison skipped.');
  }
} else if (!failed && !skipped) {
  console.log('cost: no baseline for ' + costKey + ' (design/gate-cost.json) - `npm run cost:save` after a green run starts one.');
}

if (failed || skipped) {
  console.log('Nothing was deployed by this command. Fix the FAILs above; the SKIPs are steps that');
  console.log('would have measured an artifact their failed step never produced.');
  process.exit(1);
}
