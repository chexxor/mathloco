#!/usr/bin/env node
// nav-fit.mjs — what the nav row needs, per candidate label set, at the widths the gates measure.
//
//   node design/nav-fit.mjs                    # the built dist, at 1240/640/390/320
//   node design/nav-fit.mjs --no-build         # the dist that is already there
//   NAV_WIDTHS=320 node design/nav-fit.mjs     # one width
//
// Why this exists (2026-11-14): DESIGN.md and Navigation.astro both carry remembered arithmetic about the
// row ("needs 217, offered 276"), and a nav label is the kind of decision that gets made from prose. D100
// made the row `flex-wrap: nowrap` precisely so a label set that stops fitting FAILS the probe instead of
// quietly re-wrapping, so the answer to "can /join go in the nav?" is a number measured on the page the
// visitor gets, per label, at the 320px floor (D114). `check:render` enforces the fit for the set that is
// shipped; this probe prices a set that is not shipped yet.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { distState, staleLine } from './dist-fresh.mjs';

const args = process.argv.slice(2);
const widths = (process.env.NAV_WIDTHS || '1240,640,390,320').split(',').map(Number);
const dist = resolve(args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist/client');

if (!args.includes('--no-build')) {
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
} else {
  // Same rule every --no-build probe follows (design/README.md): after a branch switch the numbers below
  // would describe the page the previous branch built, and a label priced against that row is a label
  // decided on the wrong millimetres.
  const st = distState();
  if (!st.fresh && !st.allowed) {
    console.error(`nav-fit: ${staleLine(st)}`);
    process.exit(1);
  }
}

const out = [];
for (const w of widths) {
  const h = w >= 640 ? 2400 : 1400;
  const raw = execFileSync(process.execPath,
    ['design/grill/dist-measure.mjs', dist, '/', 'design/grill/nav-fit.js', w, h],
    { encoding: 'utf8' });
  let json;
  try {
    json = JSON.parse(raw.slice(raw.indexOf('{')));
  } catch {
    // A firefox that posted nothing is a flake this rig has seen before (design/README.md: the render
    // gate retries it). Retrying once is cheaper than trusting a row of numbers with a hole in it.
    console.error(`  no report posted at ${w}px — retrying once`);
    json = JSON.parse(execFileSync(process.execPath,
      ['design/grill/dist-measure.mjs', dist, '/', 'design/grill/nav-fit.js', w, h], { encoding: 'utf8' }));
  }
  out.push({ width: w, gap: json.gap, rows: json.rows, fonts: json.fonts.filter((f) => /PT Serif/.test(f)) });
}

for (const { width, gap, rows, fonts } of out) {
  console.log(`\n@ ${width}px viewport — container content box ${rows[0].available}px, gap ${gap}px, faces: ${fonts.join(', ') || 'none matched'}`);
  for (const r of rows) {
    const verdict = r.slack >= 0 ? `fits by ${r.slack}px` : `OVERFLOWS by ${-r.slack}px`;
    console.log(`  ${r.labels.join(' · ').padEnd(28)} needs ${String(r.needed).padStart(6)}  ${verdict.padEnd(20)}  [${r.perLabel.join(' ')}]  tier ${r.tier.join('/')} ${r.family}`);
  }
}
console.log('\nD100: the row is nowrap, so a set that does not fit fails check:render at that width — it does not wrap.');
