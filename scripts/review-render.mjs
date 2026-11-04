#!/usr/bin/env node
// review-render.mjs — a REVIEW build (placeholders planted) measured by the browser gates, in one command,
// that cannot leave a placeholder behind.
//
//   npm run review:render                              plant -> build -> assert -> gates -> restore -> rebuild
//   npm run review:render -- --all                     the whole 7-step browser set, not the geometry three
//   npm run review:render -- --gates check:render:dist check:ground
//   npm run review:render -- --keep                    leave the review build in place to poke at (prints the restore)
//   npm run review:render -- --force                   plant beside an overlay that is already there
//
// Why this exists (measured 2026-11-03). The shot-card / missing-content state is invisible to every browser
// gate: `check:content` fails any built page carrying `data-placeholder`, and tracked `src/content.json` keeps
// `photos.placeholders: false`. That rule is right — a placeholder must never reach a visitor — but it has a
// consequence nobody budgeted for: **the one state no gate can reach is where the worst defects live.** Record
// 0024 found the worst keyline straddle of the whole keyline round there (PS-1 at 2.74 inside / 3.01 and 2.88
// outside — eight real FAILs, not planted ones), and finding it cost a hand-assembled recipe: mkdir, write the
// overlay, build, run gates, delete, rebuild. Twice in one session, ~50s of typing and re-thinking each time,
// and A2 (plates in PS-1/PS-3) and A3 (re-measure rhythm on the page the art makes) want it every round.
//
// Three things the script does that the shell recipe does not:
//   1. it ASSERTS the state is actually there. A review build whose overlay silently failed to apply would
//      measure the shipped page and print PASS — a green result about a page that was never built. So the built
//      HTML is grepped for `data-placeholder` before a single browser starts.
//   2. it cannot leave the overlay behind. Restore runs in a `finally` on every exit path, and rebuilds, so the
//      `dist/` you are left with is the shipped page again and the tracked reports' `siteFp` still means something.
//   3. it redirects every tracked artifact to gitignored scratch (`GROUND_OUT`, `AREA_OUT`, `GATE_LOG_DIR`). A
//      review page is not allowed to ship, so a tracked report must never end up describing one. The evidence
//      lands in `.design/tmp-review/`, which matches the `.design/tmp-*` ignore rule.
//
// What is deliberately NOT run: `check:content`. It fails a review build **on purpose** — that is the rule that
// keeps placeholders off the apex — and `check:content:selftest` already proves it can fail.
//
// Cost measured on this rig (Linux, native, 2026-11-03; every run prints its own phase table):
//   the harness's own overhead   plant 0.0s, assert 0.0s, restore 0.0s, plus two builds (review, shipped) at 3.6-5.0s
//   one loop, red                15.8s — build 3.6 | assert 0.0 | gates 7.2 (render gate 7.1s, 8 FAILs) | rebuild 5.0
//   one loop, green, two gates   21.5s — gates 14.2 (check:render:dist 5.6s, check:space 8.6s)
//   one loop when firefox retried 41.6s — that number belongs to the never-post flake, not to the harness
// What it replaces: a recipe of mkdir, write the overlay, build, gates, rm, rebuild — ~50s each time, run by
// hand twice in one session, with the restore easy to forget.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NODE = process.execPath;
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const KEEP = flag('--keep');
const ALL = flag('--all');
const gi = argv.indexOf('--gates');
const named = gi >= 0 ? argv.slice(gi + 1).filter((a) => !a.startsWith('--')) : [];
// The geometry three by default: the placeholder question is always about boxes and edges — control geometry
// and rings (`check:render:dist`), the reserved slot sizes (`check:space`), and what the hairlines measure off
// painted bytes (`check:ground`). The mark, the card producer and both selftests answer the same question
// whether or not a placeholder is standing in the page, so `--all` is there but is not the default.
const GATES = ALL ? [] : (named.length ? named : ['check:render:dist', 'check:space', 'check:ground']);

const OVERLAY_DIR = 'src/content.local';
const OVERLAY = `${OVERLAY_DIR}/tmp-review.json`;
const SCRATCH = '.design/tmp-review';
const PLACEHOLDER_MARK = 'data-placeholder';

const started = Date.now();
const phases = [];
const phase = (name, fn) => {
  const t = Date.now();
  const r = fn();
  phases.push({ name, secs: (Date.now() - t) / 1000, r });
  return r;
};
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: 'inherit', ...opts });

// --- preflight: two states in which a review build must not be attempted at all -------------------------
const tracked = JSON.parse(readFileSync('src/content.json', 'utf8'));
if (tracked?.photos?.placeholders === true) {
  console.error('review:render: tracked src/content.json has photos.placeholders: true — that is the defect');
  console.error('  check:content calls `tracked-placeholder-switch`, and every build from this tree is a review');
  console.error('  build. Fix the tracked file first; this script will not stack an overlay on top of it.');
  process.exit(1);
}
const madeDir = !existsSync(OVERLAY_DIR);
const already = existsSync(OVERLAY_DIR) ? readdirSync(OVERLAY_DIR).filter((f) => f.endsWith('.json')) : [];
if (already.length && !flag('--force')) {
  console.error(`review:render: ${OVERLAY_DIR}/ already holds ${already.join(', ')} — that is somebody else's`);
  console.error('  preview state, and two overlays merge in filename order, so the measurement would describe');
  console.error('  neither. Remove it, or pass --force to plant beside it knowingly.');
  process.exit(1);
}

let gateCode = 0;
let failedEarly = null;

try {
  phase('plant', () => {
    mkdirSync(OVERLAY_DIR, { recursive: true });
    writeFileSync(OVERLAY, JSON.stringify({ _about: 'planted by scripts/review-render.mjs — review-only, gitignored, removed on exit', photos: { placeholders: true } }, null, 1) + '\n');
    return OVERLAY;
  });

  const build = phase('build (review)', () => run(NPM, ['run', '--silent', 'build']).status);
  if (build !== 0) { failedEarly = `build exited ${build}`; throw new Error('build failed'); }

  // The assertion. Without it, "we measured the placeholder state" is a claim about an intent, not an artifact.
  phase('assert', () => {
    const html = readFileSync(resolve('dist/client/index.html'), 'utf8');
    const hits = html.split(PLACEHOLDER_MARK).length - 1;
    if (hits === 0) {
      failedEarly = `the built page contains no ${PLACEHOLDER_MARK} — the overlay did not apply`;
      throw new Error('review state absent');
    }
    const fp = (html.length / 1024).toFixed(1);
    console.log(`  ${hits} ${PLACEHOLDER_MARK} boxes in the built page (${fp} kB of HTML) — the state is really there`);
    return hits;
  });

  // Every tracked artifact goes to scratch. gate-run inherits this env, so the probes get it too.
  const env = {
    ...process.env,
    GATE_LOG_DIR: `${SCRATCH}/gate-logs`,
    GROUND_OUT: `${SCRATCH}/ground`,
    AREA_OUT: `${SCRATCH}/area`,
  };
  phase('gates', () => {
    const r = run(NODE, ['scripts/gate-run.mjs', '--browser', ...GATES], { env });
    gateCode = r.status ?? 1;
    return gateCode;
  });
} catch (e) {
  if (!failedEarly) failedEarly = e.message;
} finally {
  if (KEEP) {
    // The one exit path that leaves the state standing, and it says so with the command that undoes it.
    console.log(`\n--keep: ${OVERLAY} is still planted and dist/ is still the REVIEW build.`);
    console.log('  Restore with:  rm ' + OVERLAY + (madeDir ? ' && rmdir ' + OVERLAY_DIR : '') + ' && npm run build');
    console.log('  Safe to leave while you work: `npm run deploy` / `preview:deploy` run `verify` first, which rebuilds,');
    console.log('  and `check:content` fails any build that carries a placeholder. Nothing here can reach the apex.');
  } else {
    phase('restore', () => {
      rmSync(OVERLAY, { force: true });
      if (madeDir && existsSync(OVERLAY_DIR) && readdirSync(OVERLAY_DIR).length === 0) rmSync(OVERLAY_DIR, { recursive: true, force: true });
      return true;
    });
    // Rebuild so `dist/` is the shipped page again: the freshness guard (design/dist-fresh.mjs) and every
    // tracked report's siteFp describe the tree, not a state that is not allowed to ship.
    const rb = phase('build (shipped)', () => run(NPM, ['run', '--silent', 'build']).status);
    if (rb !== 0) failedEarly = (failedEarly ? failedEarly + '; and ' : '') + 'the restore build failed — rebuild before trusting any gate';
  }
}

const total = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\nreview:render — ${phases.map((p) => `${p.name} ${p.secs.toFixed(1)}s`).join(' | ')} | total ${total}s`);
console.log(`evidence  ${SCRATCH}/ (gitignored: gate logs, ground and area reports for THIS state only)`);
console.log('          tracked design/ground/report.json and design/area/report.json were NOT touched by a review build');
if (failedEarly) {
  console.error(`review:render FAILED: ${failedEarly}`);
  process.exit(1);
}
if (gateCode) {
  console.error(`review:render: the gates failed (exit ${gateCode}) — the FAILs are above, and they are about the`);
  console.error('  placeholder state, which no shipped-page gate would ever have seen.');
  process.exit(gateCode);
}
console.log('review:render: PASS — the review state built, the state was asserted present, and the gates above are green for it.');
