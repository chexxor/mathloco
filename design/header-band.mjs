#!/usr/bin/env node
// header-band.mjs - how much of the header band actually paints, off the bytes a browser wrote.
//
// Why it exists: DESIGN.md's "a hairline rule at most" claim quotes a percentage for the header band, and
// the number a reader trusts has to come from an instrument, not from memory. `check:render`'s `bands`
// section only reports elements that carry a `bg-*` class, and since S027 (D295) the header carries no ground
// class at all - it is chrome by its inset ring alone - so no shipped gate reports the band any more.
// This probe reads a screenshot and counts pixels against the page ground in OKLab space, the same 0.05
// same-colour bar `check:space` uses.
//
//   node design/header-band.mjs .design/tmp-round17/shot-shipped-1240.png 71
//
// The band bottom row is the row index of the last row INSIDE the bar (0-based), i.e. header box height - 1.
// `check:render` writes its shots to `.design/render/<route>-<width>.png`; `design/round17.mjs --only shipped`
// writes `.design/tmp-round17/shot-shipped-<width>.png`. Both are gitignored scratch - the number, not the
// photograph, is what is tracked.
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { oklabBytes, distLab } from './grill/okcolor.mjs';

const SAME_COLOUR_BAR = 0.05;   // the bar DESIGN.md and check:space state for "the same colour"

async function main() {
  const shot = process.argv[2];
  const bandBottom = Number(process.argv[3] ?? 71);
  if (!shot || !existsSync(shot)) {
    console.error('usage: node design/header-band.mjs <shot.png> [bandBottomRow]');
    process.exit(1);
  }
  const meta = await sharp(shot).metadata();
  const buf = await sharp(shot).raw().toBuffer();
  const W = meta.width, CH = meta.channels || 3;
  const px = (x, y) => { const i = (y * W + x) * CH; return [buf[i], buf[i + 1], buf[i + 2]]; };

  // The page ground is read off the screenshot itself, 40 rows below the bar - the same reference
  // edge-probe.mjs uses - so the percentage is pixel-to-pixel, never pixel-to-token.
  const ground = px(Math.round(W / 2), bandBottom + 40) ?? px(Math.round(W / 2), bandBottom + 10);
  const groundLab = oklabBytes(...ground);

  let differing = 0, ring = 0, interior = 0, rows = 0;
  for (let y = 0; y <= bandBottom; y++) {
    let rowDiff = 0;
    for (let x = 0; x < W; x++) {
      const c = px(x, y);
      if (distLab(oklabBytes(...c), groundLab) > SAME_COLOUR_BAR) { differing++; rowDiff++; }
    }
    // A row that differs across (almost) its whole width is the ring; anything else is ink.
    if (rowDiff >= W * 0.9) { ring += rowDiff; rows++; }
    else interior += rowDiff;
  }
  const total = (bandBottom + 1) * W;
  console.log(`band ${W}x${bandBottom + 1} against ground ${ground.join(',')}`);
  console.log(`  ${differing} of ${total} pixels differ (${(100 * differing / total).toFixed(2)}%)`);
  console.log(`  ring rows: ${rows} rows, ${ring} pixels (${(100 * ring / total).toFixed(2)}%) - ink: ${interior} pixels (${(100 * interior / total).toFixed(2)}%)`);
  console.log(`  bar: ${SAME_COLOUR_BAR} OKLab distance (same bar check:space uses)`);
}

main().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
