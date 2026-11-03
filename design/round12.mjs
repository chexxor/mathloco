// round12.mjs — build the public-domain art specimen, then measure the specimen back and fail if it
// misrepresents the slots.
//
//   node design/round12.mjs     # or: npm run round12
//
// Why the specimen needs its own probe: the operator sizes a decision about the page from these boxes.
// A crop drawn at the wrong size is a different design than the one that would ship — the same rule
// round10.mjs enforces for the photo slots (record 0015: a crop is a claim about the page).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const TOL = 0.6; // CSS px

const build = () => execFileSync('node', ['design/grill/round12-build.mjs'], { encoding: 'utf8' });

const probe = () => {
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return JSON.parse(execFileSync('node', ['design/grill/page-measure.mjs',
        'design/grill/round-12-art.html',
        'design/grill/round12-measure.js', '1080', '1400'], { encoding: 'utf8' }));
    } catch (e) { last = e; }
  }
  throw last;
};

process.stdout.write(build());
const got = probe();

const rows = got.boxes.map((b) => {
  const painted = Math.abs(b.gotImgW - b.wantW) <= TOL && Math.abs(b.gotImgH - b.wantH) <= TOL;
  const retina = b.naturalW === b.wantW * 2 && b.naturalH === b.wantH * 2;
  return { ...b, ok: painted && b.complete && retina, painted, retina };
});

const overflow = got.doc.scrollW > got.doc.clientW;

mkdirSync('design/grill/round12', { recursive: true });
writeFileSync('design/grill/round12/report.json', JSON.stringify({
  measuredAt: new Date().toISOString(), tolPx: TOL, doc: got.doc, overflow, boxes: rows,
}, null, 1));

for (const b of rows) {
  console.log(`${b.ok ? 'ok ' : 'BAD'} ${b.slot} ${String(b.id).slice(0, 40).padEnd(40)} claims ${b.wantW}x${b.wantH} -> painted ${b.gotImgW}x${b.gotImgH}, delivered ${b.naturalW}x${b.naturalH}, loaded ${b.complete}`);
}
console.log(`document ${got.doc.clientW}px wide: ${overflow ? `HORIZONTAL OVERFLOW at ${got.doc.scrollW}px` : 'no horizontal overflow'}; height ${got.doc.scrollH}px`);

const bad = rows.filter((r) => !r.ok);
if (bad.length || overflow) {
  console.error(`\n${bad.length} box(es) not painted at the size they claim${overflow ? ', and the specimen overflows its own width' : ''}.`);
  process.exit(1);
}
console.log(`\n${rows.length} crops verified at their slot sizes. open design/grill/round-12-art.html`);
