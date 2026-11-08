#!/usr/bin/env node
// edge-probe.mjs — the pixel probe behind "does this device separate the bar from the page?"
//
// Written 2026-11-08 for round 17 (design/round17.mjs calls it for every option it prices;
// design/grill/round17-edge-backfill.mjs calls it for options priced before the probe existed).
// It is a pure function of a screenshot and the bar's bottom edge, so a round can re-measure an
// old photograph without re-rendering the page.
//
// Why it exists: DESIGN.md's elevation table says level 1 "measures 1.35 at the contact edge". That
// number is the shadow's declared stop composited at full alpha (design/grill/contrast/gen-ratify-cfg.mjs
// line 141), not what a browser paints under a 1px/2px blur. The only way to tell the two apart is to
// read the bytes Firefox put in the rows under the bar.
//
// Two references are sampled from the SAME screenshot - the bar's own ground six rows above its edge,
// and the paper 40 rows below it - so every ratio here is pixel to pixel. A device is a LAYER when the
// darkest row under it reaches the ratified layer bar (1.35, D101); it is an EDGE when a device row
// inside the bar reads at or above 1.4 against the paper it sits on (the same threshold the render gate
// uses to call a painted line a border).
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { BARS, contrastBytes } from './okcolor.mjs';

export async function edgeReport(png, headerBottom, pageBytes) {
  if (!png || !existsSync(png) || headerBottom == null || !pageBytes) return null;
  try {
    const meta = await sharp(png).metadata();
    const buf = await sharp(png).raw().toBuffer();
    const CH = meta.channels || 3; // firefox writes RGBA; a 3-byte stride reads the wrong pixels and made
    // every row in this strip look like one muddy ground (found 2026-11-08).
    const W = meta.width, H = meta.height;
    const px = (x, y) => { if (x < 0 || y < 0 || y >= H) return null; const i = (y * W + x) * CH; return [buf[i], buf[i + 1], buf[i + 2]]; };
    const xs = [Math.round(W * 0.25), Math.round(W * 0.5), Math.round(W * 0.75)];
    const rowAvg = (y) => {
      const pts = xs.map((x) => px(x, y)).filter(Boolean);
      if (!pts.length) return null;
      return [0, 1, 2].map((k) => Math.round(pts.reduce((a, p) => a + p[k], 0) / pts.length));
    };
    const barBytes = rowAvg(headerBottom - 6);
    const paperBytes = rowAvg(headerBottom + 40);
    const strip = [];
    for (let y = headerBottom - 3; y <= headerBottom + 8; y++) {
      const avg = rowAvg(y);
      if (!avg) continue;
      strip.push({ y, bytes: avg.join(','), vsPage: contrastBytes(avg, pageBytes), vsPaper: contrastBytes(avg, paperBytes), vsBar: contrastBytes(avg, barBytes) });
    }
    const edgeRow = strip.find((s) => s.y === headerBottom - 1) || null;   // the last device row INSIDE the bar
    const below = strip.filter((s) => s.y >= headerBottom);
    const maxBelow = below.length ? Math.max(...below.map((s) => s.vsPaper)) : null;
    return {
      headerBottom, pageBytes: pageBytes.join(','), barBytes: barBytes?.join(','), paperBytes: paperBytes?.join(','),
      strip, edgeRow: edgeRow ? { y: edgeRow.y, bytes: edgeRow.bytes, vsPaper: edgeRow.vsPaper } : null,
      maxBelow,
      layerBar: BARS.layer,
      graphicBar: BARS.graphic,
      paintsALayer: maxBelow != null && maxBelow >= BARS.layer,
      paintsAnEdge: (edgeRow && edgeRow.vsPaper >= 1.4) || (maxBelow != null && maxBelow >= 1.4),
    };
  } catch (e) {
    return { error: String(e.message || e) };
  }
}
