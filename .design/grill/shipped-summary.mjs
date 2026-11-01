// shipped-summary.mjs - read the shipped-control measurements back into a table an operator can read.
// Evidence lives in .design/grill/shipped-controls/*.json; this file only prints, it does not measure.
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, 'shipped-controls');
const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && !f.startsWith('ctl-')).sort();
const rows = [];
for (const f of files) {
  const d = JSON.parse(await readFile(resolve(dir, f), 'utf8'));
  rows.push({ f, ...d });
}
const pad = (v, n) => String(v).padEnd(n);
for (const r of rows) {
  console.log(`\n=== ${r.f}  viewport ${r.viewport.join('x')}  interactive ${r.count}  under24 ${r.under24}  under44 ${r.under44}`);
  console.log(`    distinct heights: ${r.distinctHeights.join(', ')}`);
  if (r.under24) console.log(`    UNDER the 24px AA target floor: ` +
    r.elements.filter((e) => !e.target24).map((e) => `${e.tag}"${e.text}" ${Math.round(e.w)}x${e.h}`).join('; '));
  const fails = r.elements.filter((e) => e.contrast !== null && e.contrast < 4.5 && parseFloat(e.fontSize) < 24);
  if (fails.length) console.log(`    contrast under 4.5: ` + fails.map((e) => `${e.text} ${e.fontSize} ${e.contrast} on ${e.bg} (${e.colorResolved} / ${e.bgResolved})`).join('; '));
  const faces = r.fonts?.loadedFaces ?? [];
  console.log(`    faces: ${faces.join(' | ')}`);
  console.log(`    ${pad('element', 34)} ${pad('box', 12)} ${pad('font', 12)} ${pad('pad(t/r/b/l)', 20)} ${pad('radius', 8)} contrast  bg`);
  for (const e of r.elements.slice(0, 40)) {
    console.log(`    ${pad(`${e.tag}"${e.text.slice(0, 22)}"`, 34)} ${pad(`${Math.round(e.w)}x${Math.round(e.h)}`, 12)} ${pad(`${e.fontSize}/${e.fontWeight}`, 12)} ${pad(e.pad, 20)} ${pad(e.radius, 8)} ${pad(e.contrast ?? 'n/a', 9)} ${e.bgResolved}`);
  }
}
