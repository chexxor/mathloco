#!/usr/bin/env node
// %NAME% - <one line: what it asserts, and what breaks if it is wrong>
//
// Why (D###): <the defect that happened, dated, with the command that saw it>.
// <Why no other gate sees it.>
//
//   node scripts/%SCRIPT%            the gate
//   node scripts/%SCRIPT% --selftest plant each defect, require each to fail
//   node scripts/%SCRIPT% --show     print what the gate is reading

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// The file this gate reads: name it in the comment, put the path in TARGET. Keep the path out of a
// quoted literal that starts with src/, scripts/ or design/ until the file it names actually exists -
// design/audit-references.mjs (--stale, run by check:design) reports every such literal whose target is
// missing, and a template that points at a wall is exactly the thing that gate is built to catch.
const TARGET = 'CHANGE-ME'; // e.g. the file whose contract this gate enforces

// A pure verdict, so the selftest can plant defects without touching the file on disk. Every gate here
// is written this way: the check is a function of data, and the data is real only in runGate().
function verdict(text) {
  const fail = [];
  // Assert. Make every finding name the fix, not just the crime: a gate that says "missing" tells the
  // next session nothing about what to write.
  return fail;
}

function runGate() {
  const path = TARGET;
  if (!existsSync(root + path)) {
    console.error(`%NAME%: ${path} missing`);
    return 1;
  }
  const fail = verdict(readFileSync(root + path, 'utf8'));
  if (fail.length) {
    console.error(`%NAME%: ${fail.length} problem(s)`);
    for (const f of fail) console.error('  - ' + f);
    return 1;
  }
  console.log(`%NAME%: ok - %DESC%`);
  return 0;
}

// Each planting is a real mutation the gate must NAME. A gate nobody has seen fail is a gate that is not
// measuring anything (the pattern check:plan:selftest, check:ics:selftest, check:copy:selftest set).
const PLANTINGS = [
  ['<defect class>', (data) => data.replace('a', 'b')],
];

function runSelftest() {
  const base = readFileSync(root + TARGET, 'utf8');
  if (verdict(base).length) {
    console.error(`%NAME%:selftest: the real file already fails the gate - fix it before trusting the selftest`);
    return 1;
  }
  let caught = 0;
  for (const [label, mutate] of PLANTINGS) {
    const fail = verdict(mutate(base));
    if (fail.length) {
      caught++;
      console.log(`  caught: ${label} -> ${fail[0]}`);
    } else {
      console.error(`  NOT caught: ${label}`);
    }
  }
  if (caught !== PLANTINGS.length) {
    console.error(`%NAME%:selftest: ${caught}/${PLANTINGS.length} plantings caught - the gate is blind to ${PLANTINGS.length - caught} defect classes.`);
    return 1;
  }
  console.log(`%NAME%:selftest: ok - ${caught} plantings caught, control clean`);
  return 0;
}

if (process.argv.includes('--selftest')) process.exit(runSelftest());
if (process.argv.includes('--show')) {
  console.log(readFileSync(root + TARGET, 'utf8'));
  process.exit(0);
}
process.exit(runGate());
