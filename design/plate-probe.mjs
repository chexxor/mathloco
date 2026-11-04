#!/usr/bin/env node
// plate-probe.mjs — how wide is each licensed plate **actually** delivered?
//
// Round 14's header claimed the archive ladder "tops out at 1024px" and priced options as a 1.15x/1.16x upscale.
// That came from the rung name, not the bytes. `/img/1024/` is the widest rung; inside it each picture is its own
// scan's size, and `/img/1600/`, `/img/2048/`, `/img/full/` are 404. The number that decides whether a wide band is
// a downscale or a blur is the **delivered** width, so fetch and measure it.
//
// Writes **design/plate-widths.json** (tracked, `@measured` with a date) rather than gitignored scratch: a
// measurement that only exists in a temporary file is how a future session ends up re-inferring a limit from a
// name. Run it again if the archive re-scans anything. Cost: one metadata call per plate, no build, no browser.
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { plateSource } from './grill/plate-crop.mjs';

const IDS = [
  'ia-firstsixbooksofe00byrn-176-281',   // Byrne Euclid IV.15 (shipped in PS-1)
  'ia-cu31924031236171-122-176',         // Euler 1910 circle-and-triangle
  'ia-elementsofeuclid1903eucl-297-210', // Euclid 1903 similar figures (PS-5 leaf 1)
  'ia-principlesunderl00unit-514-212',   // radio audion 1922 (PS-5 leaf 3)
  'ia-bulletinburea0012nati-105-175',    // NBS sundial 1922
  'ia-elementsofari00whit-223-155',      // Whiting arithmetic 1909 parallelogram
];

const rows = [];
for (const id of IDS) {
  // A 404 here is a fact about the archive today, not a reason to lose the other rows: record it and move on.
  // (Observed 2026-11-04: `ia-bulletinburea0012nati-105-175` served a picture earlier the same day and 404s now.)
  try {
    const f = await plateSource(id);
    const m = await sharp(f).metadata();
    rows.push({ id, width: m.width, height: m.height, aspect: +(m.width / m.height).toFixed(3) });
    console.log(`${id.padEnd(40)} ${m.width}x${m.height}  aspect ${rows.at(-1).aspect}`);
  } catch (e) {
    rows.push({ id, error: String(e.message || e) });
    console.log(`${id.padEnd(40)} ${e.message}`);
  }
}
const widest = Math.max(...rows.map((r) => r.width ?? 0));
console.log(`widest delivered scan: ${widest}px  (rung /img/1024/; /img/1600|2048|full/ -> 404)`);
writeFileSync(
  new URL('./plate-widths.json', import.meta.url),
  JSON.stringify({ measuredAt: new Date().toISOString().slice(0, 10), rung: '/img/1024/', missing: ['/img/1600/', '/img/2048/', '/img/full/'], widest, plates: rows }, null, 2) + '\n',
);
console.log('wrote design/plate-widths.json (tracked - commit it with any doc that cites these widths)');
