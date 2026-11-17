#!/usr/bin/env node
// naming-reproduction.mjs — does the build really fail, loudly, on an event name this site cannot map?
//
//   node design/naming-reproduction.mjs            # plant, build, restore, rebuild
//   NAMING_SOURCE='Joyful Math' node design/naming-reproduction.mjs   # plant a different unmappable name
//   REPLACE_SERIES='MPLS Math Club Social' node design/naming-reproduction.mjs  # which row's `series` to swap
//
// Why this exists (2026-11-16, round-4 design brief §3 / D-C, D339). The ruling is that the site owns the
// published event-name vocabulary and a name it cannot map must fail the build rather than print a name nobody
// published (D339). The criterion that judges it is not the throw's source line, it is the *run*: "the build
// exits non-zero and prints the offending string". That is an observable with no instrument behind it, so this
// probe is the instrument - it plants the defect in a source file, runs the real build, reads its exit code and
// its output, and restores.
//
// A probe, NOT a gate: it mutates `data/events.json` for the length of one build, so it cannot run alongside
// the gate set (two builds reading one tree is two different pages), and it stays out of `scripts/gate-run.mjs`.
// `check:naming` is the gate half - it reads the mapping table and the throw without touching the tree.
//
// What it must NOT do is leave the tree mutated. The restore is verified by sha256 before/after and printed, and
// the probe rebuilds afterwards so `dist/` on disk still matches the restored tree — a green run that left a
// planted row in `data/events.json` would make every later gate describe a page the repository cannot build.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = process.env.NAMING_SOURCE || 'Joyful Math Festival';
const REPLACED = process.env.REPLACE_SERIES || 'MPLS Math Club Social';
const data = 'data/events.json';

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

const original = readFileSync(data, 'utf8');
const before = sha(original);

const KEY = `"series": "${REPLACED}"`;

if (!original.includes(KEY)) {
  console.error(`naming-reproduction: no ${KEY} in ${data} — nothing to plant, and a silent no-op would`);
  console.error('report the throw as shipped when it is not. Name a series the snapshot actually carries.');
  process.exit(1);
}

// Every row carrying that series is planted, not just the first: planting one row is enough to prove the throw
// reachable, but a probe that plants one and reports "1" while five rows carry the name understates what it
// measured. @measured 2026-11-16 reading `data/events.json`: 5 rows carry `"series": "MPLS Math Club Social"`
// (on 2026-11-07 / 2026-11-21 twice - one CONFIRMED, one CANCELLED / 2026-12-05 / 2026-12-19) and the last four
// are inside the window the page prints, so a throw that fires on the first is a throw the page would meet.
const plantedRows = original.split(KEY).length - 1;
const planted = original.replaceAll(KEY, `"series": "${SOURCE}"`);
if (planted === original) { console.error('naming-reproduction: the swap changed nothing'); process.exit(1); }

let out = '';
let code = null;
try {
  writeFileSync(data, planted);
  // spawnSync, not execFileSync: a build that throws exits non-zero, and execFileSync reports that failure as a
  // thrown error whose `code` is undefined for a wrapped spawn — the exit code is the observable the criterion is
  // about, so it is read from the spawn result, never inferred from "it threw or it did not".
  const r = spawnSync('npm', ['run', 'build'], { encoding: 'utf8' });
  out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  // Node 24 names the spawn result's exit status `status`; `exitCode` is undefined on it (measured 2026-11-16 by
  // printing every key of the spawnSync result: status, signal, output, stdout, stderr, error, codes...). Reading
  // the wrong one is how a probe calls a green build red and a red build green.
  code = r.status ?? r.exitCode;
} finally {
  writeFileSync(data, original);
}

const after = sha(readFileSync(data, 'utf8'));
const where = out.indexOf('Unmapped event name');
const window = where < 0 ? '' : out.slice(where, where + 400).replace(/\s+/g, ' ');
const hit = where >= 0 && window.includes(SOURCE) ? window : null;
const nonzero = code !== null && Number(code) !== 0;

console.log(`naming reproduction — planted "${SOURCE}" into every row carrying "${REPLACED}", ran npm run build, restored`);
console.log(`  planted rows       ${plantedRows} of the ${data}'s rows now name "${SOURCE}"`);
console.log(`  build exit code    ${nonzero ? code : '0'} — ${nonzero ? 'non-zero, as required' : 'zero: the build shipped an unmappable name'}`);
console.log(`  offending line     ${hit ?? 'ABSENT — the build failed (or passed) without naming the offending string'}`);
console.log(`  data/events.json   sha ${before} -> ${after} ${before === after ? 'restored byte-for-byte' : 'NOT RESTORED — restore it by hand'} (probe run 2026-11-16, Linux native, Node 24.22.1)`);
console.log(nonzero && hit && before === after
  ? '  verdict: PASS — the build refuses the name, prints it, and the tree is the tree it was'
  : '  verdict: FAIL — one of the three is missing, and the ruling that ships is unverified');

// The tree is restored; dist is not. Rebuild so the artifact on disk matches the tree again — every `--no-build`
// probe and dist-fresh.mjs would otherwise read the failed build's half-written dist.
const reshape = spawnSync('npm', ['run', 'build'], { encoding: 'utf8' });
if ((reshape.status ?? reshape.exitCode) !== 0) {
  console.error(`  dist re-shipped    the restore build FAILED (exit ${reshape.status ?? reshape.exitCode}) — do not trust the dist on disk`);
  process.exit(1);
}
console.log('  dist re-shipped    rebuilt against the restored tree');

process.exit(nonzero && hit && before === after ? 0 : 1);
