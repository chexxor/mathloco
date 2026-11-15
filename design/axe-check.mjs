#!/usr/bin/env node
// axe-check.mjs — axe-core's rules against the built artifact, using the Firefox harness this repo
// already has. No Playwright, no dependency: axe.min.js is fetched into .design/ (gitignored scratch)
// and injected as a --prelude script by design/grill/dist-measure.mjs.
//
//   node design/axe-check.mjs                        # the four pages, 390 and 1440
//   node design/axe-check.mjs --routes /,/schedule   # a subset
//   node design/axe-check.mjs --widths 390           # one width
//
// Why this exists (2026-11-15, round-3 read §12 criterion 10): the reviewer asks for "axe-core: zero
// violations across all four pages". This repo has no axe dependency and the reviewer's own rule 3 says
// "do not add dependencies". Before deciding whether axe earns a place in the gate set, the question
// "what would it actually find here?" has to be answered with numbers rather than with the list of rules
// axe ships. That is what this probe does.
//
// It is a probe, not a gate: it prints and exits 0. Adopting it as a gate would mean a dependency and a
// new Firefox step on top of the 9-step browser set (operator's call — see DECISIONS D332).
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { distState, staleLine } from './dist-fresh.mjs';

const AXE = resolve('.design/axe.min.js');
// A 652 KB script injected INLINE into the probe copy never runs (measured 2026-11-15: the page posts
// nothing, firefox exits rc=0, three attempts). Appending it as a src script does run: axe 4.14.0 reports
// 24 passes and 4 incomplete contrast nodes in under 200 ms. So the prelude is one line of JS that
// appends the real file.
const PRELUDE = resolve('.design/axe-prelude.js');
const args = process.argv.slice(2);
const routes = (args.includes('--routes') ? args[args.indexOf('--routes') + 1] : '/,/schedule,/chat,/join').split(',');
const widths = (args.includes('--widths') ? args[args.indexOf('--widths') + 1] : '390,1440').split(',').map(Number);

if (!existsSync(AXE)) {
  console.log(`fetching axe-core into ${AXE} (scratch; the repo does not depend on it)`);
  execFileSync('curl', ['-sL', '-o', AXE, 'https://unpkg.com/axe-core@4.14.0/axe.min.js'], { stdio: 'inherit' });
  if (!existsSync(AXE)) { console.error('could not fetch axe.min.js — no network, or unpkg unreachable'); process.exit(1); }
}
writeFileSync(PRELUDE, `var __axeS = document.createElement('script');\n__axeS.src = '${AXE}';\ndocument.body.appendChild(__axeS);\n`);

const st = distState();
if (!st.fresh && !st.allowed) { console.error(`axe-check: ${staleLine(st)}`); process.exit(1); }

// page-measure.mjs holds the page for PAGE_MEASURE_HOLD_MS and then releases, so firefox exits at load;
// at its 12 s default a full axe run never finishes (measured 2026-11-15: the page posted nothing after
// 3 spawns). The probe raises the hold and keeps to one spawn per cell so a bad cell costs 60 s, not 6 m.
const results = [];
for (const route of routes) {
  for (const w of widths) {
    const h = w >= 640 ? 2400 : 1400;
    let json = null;
    for (let attempt = 1; attempt <= 2 && !json; attempt++) {
      try {
        const raw = execFileSync(process.execPath,
          ['design/grill/dist-measure.mjs', 'dist/client', route, 'design/grill/axe-run.js', w, h, '--prelude', PRELUDE],
          { encoding: 'utf8', env: { ...process.env, PAGE_MEASURE_HOLD_MS: '60000', PAGE_MEASURE_ATTEMPTS: '1' } });
        json = JSON.parse(raw.slice(raw.indexOf('{')));
      } catch {
        if (attempt < 2) console.error(`  no report for ${route} @${w} — retrying once`);
      }
    }
    results.push({ route, width: w, report: json });
  }
}

let totalViolations = 0;
for (const r of results) {
  if (!r.report) { console.log(`  ${r.route} @${r.width}: no report posted (firefox flake, see design/README.md)`); continue; }
  if (r.report.error) { console.log(`  ${r.route} @${r.width}: axe threw — ${r.report.error}`); continue; }
  totalViolations += r.report.violations.length;
  console.log(`\naxe ${r.report.axeVersion}  ${r.route} @${r.width}px  — ${r.report.violations.length} violation(s), ${r.report.incomplete.length} incomplete, ${r.report.passes} rules passed`);
  for (const v of r.report.violations) {
    console.log(`    ${v.id} (${v.impact}) x${v.nodes}: ${v.why}  — ${v.first}`);
  }
  for (const v of r.report.incomplete) {
    console.log(`    incomplete: ${v.id} x${v.nodes}: ${v.why} (axe could not decide)`);
  }
}
console.log(`\naxe-check: ${results.length} page x width cells, ${totalViolations} violation(s) total`);
