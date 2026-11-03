// mark-check.mjs — ask both mark probes about the built page, in one command.
//
//   npm run build && npm run check:mark
//
// Two probes, because the mark can be wrong in two different places and only one of them is the drawing code:
//
//   design/mark-geometry.mjs  — does the GEOMETRY TABLE say "two lines that start parallel and cross on a
//                               curved surface, far half of the equator denoted differently", and do the PAINTED
//                               PIXELS agree? A table and a page that disagree is the failure this catches.
//   design/mark-pixels.mjs    — how much of the ink in the box clears the 3.0 graphic bar (D101), per shape, in
//                               device px (D119).
//
// It measures the SHIPPED mark in the shipped hero box rather than a specimen, because the box is what sets the
// stroke budget: the same 1.3-unit stroke is 1.49 device px in the 276px phone box and 2.02 px at 1240, and the
// dash on the far half is 6px on / 4.8px off at phone size. So the widths here are the two that bracket it:
//
//   320  - the smallest hero box the mark ever gets (276px wide, scale 1.15): the tightest stroke and dash budget
//   640  - the LARGEST (512px wide, scale 2.133) — measured 2026-11-03, and it refuted this file's earlier claim
//          that 1240 was the largest. The hero is single-column until `lg:` (1024), so between `sm:` (640) and 1024
//          the mark fills the whole container width; at 1240 the hero is a 12-col grid and the mark gets one
//          column. The mark is therefore 38% bigger at a phone in landscape than on a desktop, and the stroke
//          budget that matters most is the one at 640.
//   1240 - the widest container (372px, scale 1.55): where a too-heavy mark turns into a poster on the grid
//
// Window heights match the render gate's (1400 at phone widths, 2400 at desktop) so the shots and the gate's
// reports are the same page. The mark sits at y ~1014 at 320px, so a shorter viewport would crop it.
//
// Writes .design/render/mark-<w>.png and .design/render/_-<w>.json (gitignored scratch), prints both probes,
// and exits 1 if either fails — this is a diagnostic, deliberately not in `npm run verify`.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (!existsSync(resolve('dist/client/index.html'))) {
  console.error('dist/client/index.html missing — run npm run build first (this probe reads the artifact, not the source)');
  process.exit(1);
}
mkdirSync('.design/render', { recursive: true });

const runs = [
  { w: 320, h: 1400 },
  { w: 640, h: 1400 },
  { w: 1240, h: 2400 },
];

const failed = [];
for (const { w, h } of runs) {
  const shot = `.design/render/mark-${w}.png`;
  const rep = `.design/render/_-${w}.json`;
  const json = execFileSync(process.execPath, [
    'design/grill/dist-measure.mjs', 'dist/client', '/', 'design/grill/render-measure.js',
    String(w), String(h), shot,
  ], { encoding: 'utf8' });
  JSON.parse(json);                                   // fail loudly rather than feeding a probe a truncated report
  writeFileSync(rep, json);

  for (const probe of ['design/mark-geometry.mjs', 'design/mark-pixels.mjs']) {
    console.log(`\n=== ${probe} @ ${w} (${shot}, ${rep})`);
    try {
      process.stdout.write(execFileSync(process.execPath, [probe, shot, rep], { encoding: 'utf8' }));
    } catch (e) {
      process.stdout.write(e.stdout ?? '');
      failed.push(`${probe} @ ${w}`);
    }
  }
}

console.log(failed.length ? `\nMARK CHECK: FAIL — ${failed.join(', ')}` : '\nMARK CHECK: PASS — geometry table and painted pixels agree at both widths');
process.exit(failed.length ? 1 : 0);
