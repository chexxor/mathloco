// mark-pixels.mjs — what did the hero's drawn mark ACTUALLY paint, in bytes?
//
//   node .design/mark-pixels.mjs <shot.png> <render-json> [markIndex]
//   e.g.
//     node .design/grill/dist-measure.mjs dist/client / .design/grill/render-measure.js 320 1400 .design/tmp-mark-320.png
//     node .design/mark-pixels.mjs .design/tmp-mark-320.png .design/render/_-320.json
//
// Why: the mark is line art, and line art is where D119 bites hardest — a stroke thinner than about 1.5px
// never contains a fully-covered pixel, so "the token pair is 3.01" and "what the screen shows" are
// different quantities. `check:render` asserts the pair (author syntax -> the browser's own bytes), which
// is the right bar for the PALETTE. This probe answers the other question, the one about coverage: how
// much ink actually lands, and at what ratio, for each stroke in the box.
//
// Not a gate. It is the measurement a decision about line weight has to be taken from; the gate stays
// `check:render` (pair, 3.0 graphic bar, >=1px device stroke, shape count).
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const [shot, jsonFile, idxArg = '0'] = process.argv.slice(2);
if (!shot || !jsonFile) { console.error('usage: node .design/mark-pixels.mjs <shot.png> <render-json> [markIndex]'); process.exit(2); }
const j = JSON.parse(readFileSync(jsonFile, 'utf8'));
const m = j.marks[Number(idxArg)];
if (!m) { console.error(`${jsonFile} reports no measured mark`); process.exit(1); }

const img = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = img.info;
const px = img.data;
const at = (x, y) => [px[(y * width + x) * channels], px[(y * width + x) * channels + 1], px[(y * width + x) * channels + 2]];
const lum = (c) => { const f = (v) => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const contrast = (a, b) => { const [L1, L2] = [lum(a), lum(b)].sort((x, y) => y - x); return +(((L1 + 0.05) / (L2 + 0.05)).toFixed(2)); };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// The ground, sampled from a strip beside the mark rather than from a token: the page's ground is a
// painted background, and the question is what the pixels under the mark are.
const gy = Math.round(m.y + m.h / 2);
const strip = [];
for (let x = Math.max(0, m.x - 12); x < Math.max(0, m.x - 2); x++) strip.push(at(x, gy));
const ground = strip.reduce((best, c) => (strip.filter((o) => dist(o, c) < 12).length > strip.filter((o) => dist(o, best) < 12).length ? c : best), strip[0]);

const x0 = Math.max(0, Math.round(m.x)), x1 = Math.min(width - 1, Math.round(m.x + m.w));
const y0 = Math.max(0, Math.round(m.y)), y1 = Math.min(height - 1, Math.round(m.y + m.h));
const inks = [];
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = at(x, y); if (dist(c, ground) > 24) inks.push(c); }
// cluster like scripts/check-social-card.mjs does (40 RGB units) so anti-aliased blends of one stroke
// collapse into one row instead of forty
const clusters = [];
for (const c of inks) {
  const hit = clusters.find((cl) => dist(cl.c, c) < 40);
  if (hit) { hit.n++; hit.sum = hit.sum.map((v, i) => v + c[i]); hit.c = hit.sum.map((v) => v / hit.n); }
  else clusters.push({ c: [...c], sum: [...c], n: 1 });
}
clusters.sort((a, b) => b.n - a.n);
const total = (x1 - x0 + 1) * (y1 - y0 + 1);

console.log(`mark "${m.name}" box ${m.w}x${m.h} at ${m.x},${m.y} (scale ${m.scale}) in a ${width}x${height} shot`);
console.log(`ground sampled beside it: ${ground.join(',')} — ink threshold 24 RGB units, ${inks.length}/${total} pixels in the box are ink (${((inks.length / total) * 100).toFixed(1)}%)`);
for (const cl of clusters.slice(0, 8)) {
  const c = cl.c.map(Math.round);
  console.log(`  ${String(cl.n).padStart(5)} px  ${c.join(',').padEnd(13)} contrast ${String(contrast(c, ground)).padStart(6)}  (token pair of its colour: see the run's strokeContrast column)`);
}
const strongest = clusters.reduce((a, b) => (contrast(b.c, ground) > contrast(a.c, ground) ? b : a), clusters[0]);
const perStroke = m.shapes.map((s) => {
  const pair = s.strokeContrast ?? s.fillContrast;
  return `${s.tag} ${s.sw}u=${s.swDevice}px pair ${pair}`;
});
console.log(`\n  per shape (pair, from author syntax via the browser's own paint): ${perStroke.join(' | ')}`);
console.log(`  strongest painted cluster: ${strongest.c.map(Math.round).join(',')} at ${contrast(strongest.c, ground)} — the coverage ceiling for this box at this width.`);
