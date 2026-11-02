#!/usr/bin/env node
// round8.mjs — run the round-8 type/mark measurements and print the table the operator chooses from.
//
//   node design/round8.mjs                 # build the specimens, measure both, print, save the report
//   node design/round8.mjs --crop          # also write 3x crops of each mark (scratch, .design/tmp-*)
//
// What it proves, in order:
//   1. the PREDICTOR. `fits` (box / advance, computed from a shipped run) against the characters that
//      actually fitted the same box at the candidate size. If those disagree, the rest of this table is
//      arithmetic and should not be trusted, so the disagreement is printed first.
//   2. characters per line per candidate in the two real boxes (the hero's 672px column at 1240 and the
//      228px card box at 320), against the 40-75 ch reading band.
//   3. the control heights each label step produces (48/40 is derived, not chosen: line box + 2 x pad).
//   4. the notice height (D98's 48px one-line figure, min-h 80px in the island) at each ramp.
//   5. the display cap: the club name's longest word at every display step against the measured hero box
//      at 320 (276px) and at 390 (346px).
//   6. the mark's DEVICE strokes at each candidate line weight, plus what those strokes actually painted
//      (design/mark-pixels.mjs clustering the specimen's own screenshot — the same pairing the hero gate
//      uses, so the numbers are not a rendering of my own arithmetic).
//
// Report: design/grill/round8/report.json (tracked — a ruling cites it). Crops and screenshots are scratch.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const CROP = process.argv.includes('--crop');
const jrun = (args) => {
  const out = execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180000 });
  return JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
};

execFileSync(process.execPath, ['design/grill/round8-build.mjs'], { stdio: ['ignore', 'pipe', 'inherit'] });

const type = jrun(['design/grill/page-measure.mjs', 'design/grill/round-8.html', 'design/grill/round8-measure.js', '1240', '1400']);
const mark = jrun(['design/grill/page-measure.mjs', 'design/grill/round-8-mark.html', 'design/grill/round8-measure.js', '1240', '2000', '.design/tmp-round8-mark.png']);
for (const [what, j] of [['type', type], ['mark', mark]]) {
  if (!j.facesLoaded) console.log(`FAIL ${what}: faces not loaded — every width below is a fallback metric`);
}

const BAND = [40, 75];
const verdict = (n) => n < BAND[0] ? 'under' : n > BAND[1] ? 'OVER' : 'in band';

// ---- 1. the predictor
console.log('=== 1. the predictor: box/advance (capacity) vs what actually fitted ===');
const deltas = [];
for (const r of type.runs) {
  if (r.tag !== 'p') continue;
  const d = r.fits - r.maxLineChars;
  deltas.push(d);
  console.log(`  ${r.name} ${String(r.col).padStart(4)}px box at ${r.fs.padEnd(7)}: capacity ${String(r.fits).padStart(3)} ch, fitted ${String(r.maxLineChars).padStart(3)} ch, gap ${String(d).padStart(2)} (the last word that did not fit is ${d} ch of slack)`);
}
// Why the gap is not an error: capacity is an UPPER bound — CSS breaks at the last whole word, so the
// slack is the width of the word that did not fit. The gap grows with size because a word costs more px
// at a bigger size: at the shipped 16px in a 672px box the slack is 1 character (the arithmetic and the
// browser agree), and the same arithmetic at 18px leaves 8. Read this as "capacity is measured and right",
// and read the fitted count as what the reader actually sees.
const shippedGap = type.runs.filter((r) => r.tag === 'p' && r.name === 'A').map((r) => Math.abs(r.fits - r.maxLineChars));
console.log(`  shipped ramp: max |capacity - fitted| = ${Math.max(...shippedGap)} characters — the arithmetic tracks the browser at the size the site runs today`);
console.log(`  every candidate: max gap = ${Math.max(...deltas.map(Math.abs))} characters (a bigger word costs more px, so the slack grows)`);

// ---- 2. characters per line
console.log('\n=== 2. characters per line, real sentences, real boxes ===');
console.log('  cand   hero 672px box                         | card 228px box');
for (const c of [...new Set(type.runs.map((r) => r.name))]) {
  const cell = (col, tag) => type.runs.filter((r) => r.name === c && r.col === col && r.tag === tag)
    .map((r) => `${r.fs.padEnd(7)} ${String(r.maxLineChars).padStart(3)}ch ${verdict(r.maxLineChars)} (${r.lines}L)`)
    .join(' ; ');
  console.log(`  ${c}    ${cell('672', 'p').padEnd(45)} | ${cell('228', 'p')}`);
}

// ---- 3. controls
console.log('\n=== 3. control heights (line box + 2 x pad; pads come from the spacing scale) ===');
for (const c of type.controls) console.log(`  ${String(c.cand).padEnd(4)} ${c.kind.padEnd(10)} ${String(c.h).padStart(4)}px  label ${c.fs} lh ${c.lh}  pad ${c.pad}  radius ${c.radius}`);

// ---- 4. notices
console.log('\n=== 4. the notice (inset ring, min-h 80px, word + title + body) ===');
for (const n of type.notices) console.log(`  ${String(n.cand).padEnd(4)} height ${String(n.h).padStart(4)}px  body ${n.bodyLines} lines at ${n.bodyFs} (${n.bodyMaxCh}ch)  min-h ${n.minH}`);

// ---- 5. display cap
console.log('\n=== 5. the display cap: "Minneapolis" (the longest word in the real title) vs the measured hero box ===');
for (const c of type.caps) console.log(`  ${String(c.cand).padEnd(4)} ${c.step.padEnd(10)} box ${String(c.box).padStart(5)}px  word ${String(c.maxWordPx).padStart(6)}px  ${c.fits ? 'fits' : 'FAILS — cap rule applies'}  ${String(c.lines).padStart(2)} lines${c.clipped ? '  [clipped]' : ''}`);

// ---- 6. the mark
console.log('\n=== 6. the mark at candidate line weights (device px = sw x box/240) ===');
for (const m of mark.marks) {
  console.log(`  ${m.set} @${m.w}px box (scale ${m.scale}) shapes ${m.count}/7 ratio ${m.ratio} vs ${m.wantRatio}`);
  for (const s of m.shapes) console.log(`      ${s.role.padEnd(7)} ${s.tag.padEnd(6)} sw ${String(s.sw).padStart(5)}u -> ${String(s.swDevice).padStart(5)}px${s.nonScaling ? ' (non-scaling)' : ''}`);
}
const idx = '.design/render/round8-mark-report.json';
writeFileSync(idx, JSON.stringify(mark, null, 1));
const coverage = [];
console.log('\n  what those strokes PAINTED (design/mark-pixels.mjs on the specimen screenshot):');
for (let i = 0; i < mark.marks.length; i++) {
  const m = mark.marks[i];
  const args = ['design/mark-pixels.mjs', '.design/tmp-round8-mark.png', idx, String(i), '--json'];
  if (CROP) args.push('--crop', `.design/tmp-mark-${m.set}.png`);
  try {
    const out = execFileSync(process.execPath, args, { encoding: 'utf8', timeout: 120000 });
    console.log(`  --- ${m.set} @${m.w} ---\n${out.trim().split('\n').filter((l) => !l.startsWith('{')).map((l) => '  ' + l).join('\n')}`);
    const rec = JSON.parse(out.trim().split('\n').filter((l) => l.startsWith('{')).pop());
    coverage.push(rec);
  } catch (e) { console.log(`  ${m.set}: mark-pixels failed — ${String(e.message).slice(0, 120)}`); }
}

mkdirSync('design/grill/round8', { recursive: true });
writeFileSync('design/grill/round8/report.json', JSON.stringify({ measuredAt: new Date().toISOString(), shot: '.design/tmp-round8-mark.png', type, mark, coverage }, null, 1));
console.log('\nreport: design/grill/round8/report.json' + (CROP ? ' (crops: .design/tmp-mark-*.png)' : ''));
