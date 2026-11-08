#!/usr/bin/env node
// round17-edge-backfill.mjs — run the edge probe over photographs a round already took.
//
// `node design/round17.mjs --only=<label>` re-renders and re-photographs one option; that is the expensive way
// to get an edge number for an option priced before the probe existed. The probe is a pure function of a PNG and
// the bar's bottom edge, so every row already in `design/grill/round17/report.json` can be measured from its own
// screenshot in a few seconds. Run this after editing the probe, before rebuilding the specimen.
//
//   node design/grill/round17-edge-backfill.mjs            # fills in any option missing an edgeReport
//   node design/grill/round17-edge-backfill.mjs --redo     # recompute every option
//
// Writes back into report.json. Refuses a row whose screenshot is missing rather than writing a guess.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { edgeReport } from './edge-probe.mjs';

const REPORT = resolve('design/grill/round17/report.json');
const REDO = process.argv.includes('--redo');
if (!existsSync(REPORT)) { console.error('no report — run `node design/round17.mjs` first'); process.exit(1); }
const R = JSON.parse(readFileSync(REPORT, 'utf8'));

let filled = 0, skipped = 0;
for (const o of R.options) {
  const shot = o.shots && o.shots['1240'];
  const w = o.widths && o.widths['1240'];
  if (!shot || !shot.png || !existsSync(resolve(shot.png)) || !w || !w.header || !w.header.box) {
    o.headline = o.headline || {};
    o.headline.edgeReport = { error: 'no 1240 screenshot or header box in the record — nothing to measure' };
    skipped++;
    continue;
  }
  const headerBottom = parseInt(String(w.header.box).split('x')[1], 10);
  const pageBytes = String(w.header.ground || '').split(',').map((n) => parseInt(n, 10));
  if (!Number.isFinite(headerBottom) || pageBytes.length !== 3 || pageBytes.some((n) => !Number.isFinite(n))) {
    o.headline.edgeReport = { error: 'the record has no header box or ground bytes for 1240' };
    skipped++;
    continue;
  }
  if (o.headline.edgeReport && !REDO && !o.headline.edgeReport.error) { skipped++; continue; }
  o.headline.edgeReport = await edgeReport(resolve(shot.png), headerBottom, pageBytes);
  filled++;
  const e = o.headline.edgeReport;
  console.log(`${o.label.padEnd(28)} bottom ${e.headerBottom}  bar ${e.barBytes}  paper ${e.paperBytes}  inside ${e.edgeRow ? e.edgeRow.bytes + ' ' + e.edgeRow.vsPaper : '-'}  below ${e.maxBelow}  layer ${e.paintsALayer}  edge ${e.paintsAnEdge}`);
}
writeFileSync(REPORT, JSON.stringify(R, null, 1));
console.log(`edge probe: ${filled} measured, ${skipped} already measured or unmeasurable`);
