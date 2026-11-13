#!/usr/bin/env node
// add-a-gate - write a gate that can fail, wire it into the runner, and prove it is wired.
//
// Why (D267): this repo has 30 steps in `npm run verify` and the gates are the only thing between a
// branch and a live site. Two failure modes repeat: (1) a gate written but never added to
// `scripts/gate-run.mjs`, so it runs only when a human remembers to type it; (2) a gate added and
// never seen to fail, which is a gate that measures nothing. `--audit` catches (1) mechanically.
//
//   node .agents/skills/add-a-gate/scripts/gate-skeleton.mjs                 audit (default)
//   node .agents/skills/add-a-gate/scripts/gate-skeleton.mjs --audit
//   node .agents/skills/add-a-gate/scripts/gate-skeleton.mjs --new check:foo   write the skeleton
//
// `--new` refuses to overwrite. It writes the file and prints the two lines to paste; pasting is
// deliberate, because the runner's entry needs a rationale comment and only the author knows it.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = `${execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()}/`;

/** Read a file the audit needs, and name the file and the need when it is not there (a bare throw
 * tells a reader nothing about which wiring is missing). */
function readText(path, why) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`add-a-gate: cannot read ${path} (${e.message}) - needed for ${why}`);
    process.exit(1);
  }
}

function packageScripts() {
  try {
    return JSON.parse(readText(`${root}package.json`, 'the list of scripts every gate must exist as')).scripts ?? {};
  } catch (e) {
    console.error(`add-a-gate: package.json is not valid JSON (${e.message}) - no gate can be audited against it`);
    process.exit(1);
  }
}

function runnerSteps() {
  const src = readText(`${root}scripts/gate-run.mjs`, 'the gate set the runner actually executes');
  const steps = [];
  // Both quote styles: `{ name: "check:rsvp-promise" }` in gate-run.mjs was invisible to the
  // single-quote-only pattern, so the audit called a step that IS in the set an orphan (found 2026-11-12).
  for (const m of src.matchAll(/\{\s*name:\s*(['"])([^'"]+)\1[^}]*\}/g)) {
    steps.push(m[2]);
  }
  return steps;
}

function audit() {
  const scripts = packageScripts();
  const steps = runnerSteps();
  const runnerSrc = readText(`${root}scripts/gate-run.mjs`, 'the reason a script is deliberately outside the set');
  const agents = existsSync(`${root}AGENTS.md`) ? readText(`${root}AGENTS.md`, 'the prose reasons for scripts outside the set') : '';

  const hard = steps.filter((s) => !scripts[s]);
  const orphans = Object.keys(scripts).filter((s) => !steps.includes(s) && /^(check|probe|review):/.test(s));
  const undocumented = orphans.filter((s) => !runnerSrc.includes(s) && !agents.includes(s));
  const withoutSelftest = steps.filter((s) => !scripts[`${s}:selftest`] && !s.endsWith(':selftest') && /^(check|audit):/.test(s));

  let baseline = null;
  if (existsSync(`${root}design/gate-cost.json`)) {
    let b = null;
    try {
      b = JSON.parse(readText(`${root}design/gate-cost.json`, 'the cost baseline the guard compares against'));
    } catch (e) {
      console.log(`  cost baseline: design/gate-cost.json is not valid JSON (${e.message}) - the audit cannot report it`);
    }
    if (b) baseline = { deploy: b.deploy?.measuredAt, steps: Object.keys(b.deploy?.steps ?? {}).length };
  }

  console.log('add-a-gate: audit');
  console.log(`  runner steps: ${steps.length}   package scripts: ${Object.keys(scripts).length}`);
  if (hard.length) {
    console.log('  BROKEN - a step the runner will try to run with no script behind it:');
    for (const s of hard) console.log(`    ${s}`);
  }
  if (orphans.length) {
    console.log('  scripts that exist but are not in the verify set:');
    for (const s of orphans) {
      console.log(`    ${s}${undocumented.includes(s) ? '   <- no reason given anywhere (gate-run.mjs or AGENTS.md)' : '   <- named in prose somewhere'}`);
    }
  }
  if (withoutSelftest.length) {
    console.log('  gates with no selftest (a gate nobody has seen fail):');
    for (const s of withoutSelftest) console.log('    ' + s);
  }
  if (baseline) {
    console.log(`  cost baseline: ${baseline.steps} steps, measured ${baseline.deploy}. If your gate moves the wall clock, run npm run cost:save in the same commit and say why.`);
  }
  console.log(`  exit: ${hard.length ? 1 : 0} (only the broken wiring is a failure; the rest is a report)`);
  return hard.length ? 1 : 0;
}

// The skeleton lives in assets/gate-template.mjs, not in a string here: a template literal in this
// file would interpolate the generated gate's own ${...} at generation time (measured: path is not
// defined). %NAME%, %SCRIPT% and %DESC% are substituted after reading it.
const TEMPLATE = readFileSync(root + '.agents/skills/add-a-gate/assets/gate-template.mjs', 'utf8');
const SKELETON = (name, script, desc) =>
  TEMPLATE.replaceAll('%NAME%', name).replaceAll('%SCRIPT%', script).replaceAll('%DESC%', desc);

function newGate(name) {
  const [head, tail] = name.split(':');
  if (!head || !tail) {
    console.error('add-a-gate: --new expects a name like check:attendance');
    return 1;
  }
  const script = 'check-' + tail.replace(/:/g, '-') + '.mjs';  // repo convention: scripts/check-<slug>.mjs
  const path = root + 'scripts/' + script;
  if (existsSync(path)) {
    console.error(`add-a-gate: scripts/${script} already exists - not overwriting it.`);
    return 1;
  }
  writeFileSync(path, SKELETON(name, script, 'CHANGE ME'));
  console.log(`add-a-gate: wrote scripts/${script}`);
  console.log('Then, in the SAME commit:');
  console.log(`  1. package.json:  "${name}": "node scripts/${script}",  "${name}:selftest": "node scripts/${script} --selftest"`);
  console.log('  2. scripts/gate-run.mjs: add to DEPLOY (or BROWSER if it opens a page).');
  console.log('     - source-only gate -> DEPLOY before "build" (D118: catch it on the branch that introduced it)');
  console.log("     - reads dist/ -> needs: ['build']");
  console.log("     - opens a browser -> BROWSER, needs: ['check:render:dist'], and alone: true if it starts its own pool");
  console.log('  3. the selftest entry beside it, so the gate is provable, not merely present');
  console.log('  4. if it reads .notes/, add clone mode (no .notes -> audit the tracked projection only) and plant the clone case in the selftest');
  console.log('  5. the exit gate it satisfies: the PLAN.md milestone row and MILESTONES.md row, same commit - check:plan fails when they disagree');
  console.log('  6. npm run verify, then read .design/tmp-gate-logs/deploy/manifest.txt for the wall clock. If it moved materially, npm run cost:save and say why in the commit message.');
  return 0;
}

const args = process.argv.slice(2);
const i = args.indexOf('--new');
if (i >= 0) process.exit(newGate(args[i + 1] ?? 'check:newgate'));
process.exit(audit());
