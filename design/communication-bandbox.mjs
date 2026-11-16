#!/usr/bin/env node
// communication-bandbox.mjs — the exit band's box, at the widths the fold is measured at.
//
//   node design/communication-bandbox.mjs                 # `/` at 1240 and 390
//   node design/communication-bandbox.mjs /schedule       # another page's band
//   node design/communication-bandbox.mjs --widths 1240 768 390
//
// Round 5 (communication). The band is standing copy on EVERY emitted page (D307), so its cost is what a
// visitor pays on each page they open, and a claim about it needs all three units: bytes
// (design/communication-price.mjs), the box (this), and the prose count (design/communication-census.mjs's
// exit-band zone words). This brings the box: the band's own width and height, and how many LINE BOXES the
// two legal sentences spend inside it — the scroll a visitor pays for copy they cannot act on.
//
// Browser probe, deliberate scratch record: `design/communication/bandbox.json` is tracked because round 5's
// prose cites it; the raw per-cell report stays in `.design/render/`.
import { execFile } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { distState, staleLine } from './dist-fresh.mjs';
import { localDay } from './dist-pages.mjs';

const argv = process.argv.slice(2);
const routesArg = argv.filter((a) => a.startsWith('/')) || [];
const routes = routesArg.length ? routesArg : ['/'];
const wi = argv.indexOf('--widths');
const widths = wi >= 0 ? argv.slice(wi + 1).filter((a) => /^\d+$/.test(a)).map(Number) : [1240, 390];
const dist = resolve('dist/client');

if (!existsSync(dist)) { console.error('dist/client missing — run npm run build first'); process.exit(2); }
const STALE = distState();
if (!STALE.fresh) { console.error(`band box: ${staleLine(STALE)}`); process.exit(1); }

const cells = [];
for (const route of routes) for (const w of widths) {
  const j = await new Promise(async (done) => {
    execFile(process.execPath, ['design/grill/dist-measure.mjs', dist, route, 'design/grill/bandbox-measure.js', String(w), '1400'],
      { encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 },
      (err, out, stderr) => done({ err, out, stderr }));
  });
  if (!j.out) { console.log(`FAIL ${route} @${w}: no report from firefox`); continue; }
  const json = JSON.parse(j.out.slice(j.out.indexOf('{'), j.out.lastIndexOf('}') + 1));
  writeFileSync(`.design/render/bandbox-${route.replace(/\//g, '_') || 'root'}-${w}.json`, JSON.stringify(json, null, 1));
  const b = json.band ?? {};
  const legal = (json.legal ?? []).map((l) => `y${l.y} ${l.w}x${l.h} lh ${l.fontSize}`);
  console.log(`${route} @${json.vw} — band ${b.w}x${b.h} at y${b.y} · ${b.links ?? '?'} links · line boxes ${b.lh}(lh) · legal ${legal.join(' | ')}`);
  cells.push({ route, width: json.vw, band: json.band, legal: json.legal, legalBoxes: json.legalBoxes, facesLoaded: json.facesLoaded, errors: json.errors });
}
writeFileSync('design/communication/bandbox.json', `${JSON.stringify({ measuredAt: localDay(), instrument: 'design/communication-bandbox.mjs', cells }, null, 1)}\n`);
console.log(`\nrecord written to design/communication/bandbox.json (${cells.length} of ${routes.length * widths.length} cells)`);
