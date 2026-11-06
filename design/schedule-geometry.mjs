#!/usr/bin/env node
// schedule-geometry.mjs — is one date drawn the same way on both schedule surfaces?
//
//   node design/schedule-geometry.mjs                       # / and /schedule at 1240 390 320
//   node design/schedule-geometry.mjs --widths 1240         # one viewport
//   node design/schedule-geometry.mjs --routes /schedule    # one page
//
// Why this exists separate from `npm run check:space`: the survey ranks *places* (PS-3, PS-4, PS-5) and
// measures the runs of empty page between blocks of copy. It cannot answer the question the 2026-11-07
// schedule work actually turned on — the operator ruled that `/schedule` gets the same design pass the
// homepage card got ("leaf · copy · plate"), and "the same" is a claim about the boxes inside a row. Two
// surfaces that both claim to draw a date one way drift the moment one of them is edited, and nothing in the
// deploy gate set measures a box inside a row.
//
// This is a survey, not a gate: it prints, it does not fail. The numbers it prints are what the comments in
// `src/components/EventRow.astro`, `EventLeaf.astro` and `Schedule.astro` cite, and a comment that quotes a
// measurement older than this run is the one that needs re-reading (AGENTS.md: a doc line a measurement
// contradicts is corrected in the same commit).
//
// It reads dist/client through design/grill/dist-measure.mjs at a 900px-tall viewport. The handles it selects
// on are published by the markup: [data-surface] ("preview" on the homepage card, "row" on a list row),
// [data-leaf], [data-copy], [data-slot="PS-4"].
//
// Its page height is NOT the number check:space prints, and the difference is not a bug in either. The survey
// probes twice: pass 1 learns the page height, pass 2 re-opens the page in a viewport as tall as the whole
// document, because a shot shorter than the page hides its bottom. A page that fits its viewport has no
// vertical scrollbar, so its column is ~15px wider and a plate that is capped lands ON the cap. Measured
// 2026-11-07 (Linux, Firefox 158.0.1) on the same build of / at 390: this probe reports a 4967px document
// with the plate at 314x151; check:space reports a 4725px page with the plate at 323 (the cap). Both are
// true of the same bytes at a different viewport height, which is why every measurement this tool's numbers
// get cited by names the tool (AGENTS.md: a measured number carries its date and its probe).
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const argList = (flag, dflt) => {
  const i = argv.indexOf(flag);
  if (i === -1) return dflt;
  const out = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) out.push(argv[j]);
  return out;
};
const routes = argList('--routes', ['/', '/schedule']);
const widths = argList('--widths', ['1240', '390', '320']).map(Number);
const dist = resolve('dist/client');
const MEASURE = 'design/grill/row-measure.js';

// The plate cap, read off the component that draws it rather than remembered here: `.event-slot`'s max-width
// in src/components/EventArt.astro's scoped <style>. A cap this probe does not read is a cap that moves and
// leaves this tool reporting a number nothing decides.
const CAP = (() => {
  const css = execFileSync('node', ['-e', 'process.stdout.write(require("node:fs").readFileSync("src/components/EventArt.astro","utf8"))'])
    .toString()
    .match(/\.event-slot\s*\{[^}]*max-width:\s*([0-9.]+)px/);
  return css ? Number(css[1]) : null;
})();

const report = (route, w) => {
  const out = execFileSync(process.execPath, ['design/grill/dist-measure.mjs', dist, route, MEASURE, String(w), '900'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000,
  });
  return JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
};

for (const route of routes) {
  for (const w of widths) {
    let j;
    try { j = report(route, w); } catch (e) { console.log(`${route} @${w}: measurement failed — ${String(e.message).split('\n')[0]}`); continue; }
    console.log(`\n=== ${route} @${w} — page ${j.pageHeight}px, ${j.surfaces.length} date surface(s) ===`);
    for (const s of j.surfaces) {
      const f = (b) => (b ? `${b.w}x${b.h} @x${b.x} y${b.y}` : 'none');
      console.log(`  ${String(s.surface).padEnd(8)} card ${f(s.card).padEnd(24)} leaf ${f(s.leaf).padEnd(22)} copy ${f(s.copy).padEnd(24)} plate ${f(s.plate)}`);
      if (CAP && s.plate && s.plate.w > CAP) console.log(`    NOTE  plate is ${s.plate.w}px wide, over the ${CAP}px cap in EventArt.astro's .event-slot`);
    }
  }
}
console.log(`\ncap read from the component: ${CAP ?? 'not found — this probe cannot check plate width'}`);
