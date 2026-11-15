#!/usr/bin/env node
// plates-price.mjs — what the horizon band would cost if it stopped being desktop-only.
//
//   node design/plates-price.mjs                 # build, then measure
//   node design/plates-price.mjs --no-build      # measure the dist that is already there
//   PLATES_WIDTHS=1240,640,390 node design/plates-price.mjs
//
// Why this exists (2026-11-15, round-3 read §10). The band is `hidden lg:block`: below 1024px the three
// public-domain plates are not on the page at all. D168 parks the fix behind a ruling — "Revisit when a
// phone band composition gets ruled" — so the delegate's job is to price the options, not to pick one.
// The probe mutates the DOM only (never the artifact on disk) and reports, per variant: page height,
// band height, each plate's painted box, and the painted area in px².
//
// This is a probe, not a gate: it prints numbers and exits 0 whatever it finds, the same rule as
// check:space and check:color (design/README.md). `npm run check:render` is the gate that would decide a
// shipped variant.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { distState, staleLine } from './dist-fresh.mjs';

const args = process.argv.slice(2);
const widths = (process.env.PLATES_WIDTHS || '1240,640,390,320').split(',').map(Number);
const dist = resolve('dist/client');

if (!args.includes('--no-build')) {
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
} else {
  const st = distState();
  if (!st.fresh && !st.allowed) {
    console.error(`plates-price: ${staleLine(st)}`);
    process.exit(1);
  }
}

const out = [];
for (const w of widths) {
  const h = w >= 640 ? 2400 : 1400;
  let json = null;
  for (let attempt = 1; attempt <= 2 && !json; attempt++) {
    try {
      const raw = execFileSync(process.execPath,
        ['design/grill/dist-measure.mjs', dist, '/', 'design/grill/plates-price.js', w, h],
        { encoding: 'utf8' });
      json = JSON.parse(raw.slice(raw.indexOf('{')));
    } catch {
      if (attempt < 2) console.error(`  no report at ${w}px — retrying once`);
    }
  }
  if (!json) { console.error(`plates-price: no report at ${w}px after 2 attempts`); process.exit(1); }
  out.push({ width: w, ...json });
}

console.log('horizon band: what each variant costs, measured on the built page (the shipped page is the first row)');
for (const r of out) {
  if (r.error) { console.log(`  ${r.width}px: ${r.error}`); continue; }
  console.log(`\n@ ${r.width}px viewport — page ${r.baseline}px tall`);
  for (const row of r.rows) {
    const boxes = row.plates.map((p) => `${p.w}x${p.h}`).join('  ');
    const painted = row.plates.some((p) => p.painted);
    console.log(`  ${row.id.padEnd(38)} +${String(row.delta).padStart(4)}px page  band ${String(row.band).padStart(5)}px  painted ${String(Math.round(row.paintedArea)).padStart(6)}px²  [${boxes}]${painted ? '' : '  (nothing painted)'}`);
  }
}
console.log('\nRow 1 is what the tree ships now (D329 ruled the rungs 2026-11-15, lifting D168\u2019s park). The other rows');
console.log('are the alternatives priced against it: hiding the band below lg costs what the band costs today,');
console.log('and dropping plates costs the rest.');
