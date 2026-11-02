// round10.mjs — build the photographs specimen, then measure the drawing back and fail if it misrepresents
// the page.
//
//   node design/round10.mjs        # or npm run round10
//
// The measurement is deliberately cheap and deliberately strict: the geometry in this round was measured off
// the BUILT page by design/whitespace-survey.mjs, so the specimen adds no new measurement of the site. What
// it can get wrong is its own drawing — a slot box that is not the box it claims is a diagram that lies, and
// the operator would size a shot list from it. So every box is read back out of the rendered specimen in
// Firefox and compared with the number printed in its own data attributes, at 1px.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const TOL = 1; // CSS px, device-independent

const build = () => execFileSync('node', ['design/grill/round10-build.mjs'], { encoding: 'utf8' });

const probe = () => {
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return JSON.parse(execFileSync('node', ['design/grill/page-measure.mjs',
        'design/grill/round-10-photos.html',
        'design/grill/round10-measure.js', '980', '1400'], { encoding: 'utf8' }));
    } catch (e) { last = e; }
  }
  throw last;
};

process.stdout.write(build());
const got = probe();

const slots = got.slots.map((r) => {
  const wantW = r.wantW * r.scale, wantH = r.wantH * r.scale;
  return { ...r, ok: Math.abs(r.gotW - wantW) <= TOL && Math.abs(r.gotH - wantH) <= TOL, wantDrawW: wantW, wantDrawH: wantH };
});
const pages = got.pages.map((r) => ({ ...r, ok: Math.abs(r.gotH - r.wantH * r.scale) <= TOL }));
const gaps = got.gaps.map((r) => ({ ...r, ok: Math.abs(r.got - r.want * 0.5) <= TOL }));

mkdirSync('design/grill/round10', { recursive: true });
writeFileSync('design/grill/round10/report.json', JSON.stringify({
  measuredAt: new Date().toISOString(), tolPx: TOL, slots, pages, gaps,
}, null, 2));

for (const r of slots) {
  console.log(`${r.ok ? 'ok ' : 'BAD'} ${r.id}: claims ${r.wantW}x${r.wantH} at ${r.scale}x -> drawn ${r.gotW.toFixed(1)}x${r.gotH.toFixed(1)}`);
}
for (const r of pages) {
  console.log(`${r.ok ? 'ok ' : 'BAD'} page ${r.w}: measured height ${r.wantH} -> drawn ${r.gotH.toFixed(1)} (want ${(r.wantH * r.scale).toFixed(1)})`);
}

const bad = [...slots, ...pages, ...gaps].filter((r) => !r.ok);
if (bad.length) {
  console.error(`\n${bad.length} box(es) in the specimen do not match the number they print.`);
  process.exit(1);
}
console.log(`\n${slots.length} slot boxes and ${pages.length} page frames match the measured geometry within ${TOL}px.`);
console.log('\nopen design/grill/round-10-photos.html — it now carries the measured-back block');
process.stdout.write(build());
