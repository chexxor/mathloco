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
  // Window taller than any page this probe will meet, so Firefox draws no vertical scrollbar: that scrollbar
  // steals 12px of the column at narrow widths, which made this probe's leaf 346px where `check:space` says 358px
  // (measured 2026-11-15 on one dist). The page height is the bottom of the body's boxes (design/grill/plates-price.js),
  // so a tall window cannot inflate it — same condition the gate measures in.
  const h = 6000;
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
console.log('\nRow 1 is what the tree ships now (D351, 2026-11-15: ONE plate on the shelf, no cap, full-bleed to the column edge;');
console.log("D347's cap at the leaf's own scan width is a dated record in HorizonBand.astro's header, not this build).");
console.log('The other rows are the alternatives priced against it: the band gone, the band with nothing on it, and');
console.log('the leaf let to the column edge - which is now the SAME page as row 1, so that row prints +0px and a');
console.log('band as tall as row 1. Read them together: a differing pair would mean the cap is still binding somewhere.');
