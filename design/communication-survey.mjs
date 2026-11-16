#!/usr/bin/env node
// communication-survey.mjs — what a visitor has inside the FIRST SCREEN, per route, at three widths.
//
//   node design/communication-survey.mjs                 # every emitted route at 1240, 768, 390 (builds first)
//   node design/communication-survey.mjs --no-build      # measure the dist that is already there
//   node design/communication-survey.mjs / 390           # one route, one width
//   RENDER_JOBS=1 node design/communication-survey.mjs   # serialize the firefox runs (default 4)
//
// Round 5 (communication). The byte census (design/communication-census.mjs) counts what a page SAYS;
// this counts what a visitor SEES before they scroll, which is the half of "is this page efficient at
// communicating" that word counts cannot answer. A page that answers when/where/how 2,400px down asks a
// visitor to scroll before they can act, and a page whose first screen is wayfinding has a first screen
// that answers nothing.
//
// The viewports are stated, not inherited, because the fold IS the question:
//   1240 x 900   a laptop window
//   768 x 1024   a tablet held upright
//   390 x 844    a phone held upright (the same phone box design/line-length.mjs measures at)
// The harness's own flake rule applies: a firefox that starts and never posts gets a second attempt
// (RENDER_ATTEMPTS), and the probe waits for the ratified faces before reading a single rect — positions
// move 108px on the font swap at 320, which is the render gate's finding.
//
// Per-cell scratch (the raw browser report) lands in .design/render/communication-*.json — regenerable,
// so scratch. The AGGREGATE lands in design/communication/fold.json, tracked, because round 5's prose
// cites it. Exits 0 whatever it finds: this is the before-number for a communication round, not a gate.
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { distState, staleLine } from './dist-fresh.mjs';
import { emittedRoutes } from './emitted-routes.mjs';

const argv = process.argv.slice(2);
const NO_BUILD = argv.includes('--no-build');
const pos = argv.filter((a) => !a.startsWith('--'));
const routesArg = pos.filter((a) => a.startsWith('/'));
const widthsArg = pos.filter((a) => /^\d+$/.test(a)).map(Number);
const JOBS = Math.max(1, Number(process.env.RENDER_JOBS || 4));
const dist = resolve('dist/client');

// The stamp is the LOCAL day, not the UTC one: `new Date().toISOString().slice(0,10)` said 2026-11-16 at
// 20:04 CST on 2026-11-15, and `check:figures` reads a stamp as the day the probe ran. Same form as
// design/communication-census.mjs's localDay, so the two records can never disagree about one build.
function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// width -> the viewport height the fold is measured against, stated above so the number in prose names its box
const HEIGHTS = new Map([[1240, 900], [768, 1024], [390, 844]]);
const widths = widthsArg.length ? widthsArg : [1240, 768, 390];
const ATTEMPTS = Number(process.env.RENDER_ATTEMPTS || 2);

if (!existsSync(dist)) { console.error('dist/client missing — run npm run build first (or drop --no-build)'); process.exit(2); }

if (NO_BUILD) {
  console.log('(measuring the dist that is already built — --no-build)');
  const STALE = distState();
  if (!STALE.fresh && !STALE.allowed) { console.error(`communication survey: ${staleLine(STALE)}`); process.exit(1); }
} else {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const { execFileSync } = await import('node:child_process');
  execFileSync(npm, ['run', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });
}
mkdirSync('.design/render', { recursive: true });

const routes = routesArg.length ? routesArg : emittedRoutes(dist);
if (!routes.length) { console.error(`no .html under ${dist} — the build emitted nothing to measure`); process.exit(2); }
console.log(`routes ${routes.join(' ')}`);

const run = (route, width) => new Promise((done) => {
  execFile(process.execPath,
    ['design/grill/dist-measure.mjs', dist, route, 'design/communication-measure.js', String(width), String(HEIGHTS.get(width) ?? 1200)],
    { encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 },
    (err, out, stderr) => done({ route, width, out, err, stderr }));
});

async function measure(route, width) {
  for (let n = 1; n <= ATTEMPTS; n++) {
    const r = await run(route, width);
    const json = r.out ? r.out.slice(r.out.indexOf('{'), r.out.lastIndexOf('}') + 1) : '';
    if (json) { try { return { j: JSON.parse(json) }; } catch {} }
    if (n < ATTEMPTS) console.error(`  retry ${route} @${width}`);
  }
  return { err: new Error('no report from firefox') };
}

async function pool(items, work, jobs) {
  const acc = [];
  let i = 0;
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (i < items.length) { const k = i++; acc[k] = await work(items[k]); }
  }));
  return acc;
}

const cells = routes.flatMap((r) => widths.map((w) => [r, w]));
const got = new Map();
const raw = await pool(cells, ([r, w]) => measure(r, w).then((x) => ({ route: r, width: w, ...x })), Math.min(JOBS, cells.length));
for (const r of raw) {
  if (r.err) { console.log(`FAIL ${r.route} @${r.width}: ${r.err.message}`); continue; }
  writeFileSync(`.design/render/communication-${r.route.replace(/\//g, '_') || 'root'}-${r.width}.json`, JSON.stringify(r.j, null, 1));
  got.set(`${r.route} @${r.width}`, r.j);
}

const cells2 = routes.map((r) => ({ route: r, widths: widths.map((w) => got.get(`${r} @${w}`)) }));
writeFileSync('design/communication/fold.json', `${JSON.stringify({ measuredAt: localDay(), instrument: 'design/communication-survey.mjs', viewports: [...HEIGHTS.entries()].map(([w, h]) => `${w}x${h}`), cells: cells2 }, null, 1)}\n`);

for (const c of cells2) {
  for (const j of c.widths) {
    if (!j) continue;
    const vh = j.fold.vh;
    console.log(`\n=== ${c.route} @${j.vw}x${vh} — page ${j.docHeight}px, exit band at ${j.band ? j.band.y : '?'}px ===`);
    if (j.facesSettled === false) console.log(`  FAIL-FOR-READING faces never loaded at measure time (${(j.errors || []).join('; ')}) — positions are fallback metrics`);
    console.log(`  first screen (${vh}px): ${j.fold.wordsAbove} words above / ${j.fold.wordsBelow} below · ${j.fold.anchorsAbove} anchors above / ${j.fold.anchorsBelow} below · ${j.fold.runsAbove} text runs above`);
    console.log(`  headings above:   ${j.fold.headingsAbove.map((h) => `y${h.y} "${h.text}"`).join(' | ')}`);
    console.log(`  named blocks above: ${j.fold.surfacesAbove.map((s) => `y${s.y} ${s.name} ${s.w}x${s.h}`).join(' | ')}`);
    console.log(`  first action:     ${j.firstAction ? `y${j.firstAction.y} role=${j.firstAction.role} "${j.firstAction.label}"` : `no data-control element on the page (first anchor y${j.firstAnchor ? j.firstAnchor.y : '?'} ${j.firstAnchor ? j.firstAnchor.href : ''})`}`);
    console.log(`  controls:         ${j.controls.length} total (${j.fold.controlsAbove.length} above, ${j.fold.controlsBelow} below)`);
    console.log(`  named blocks all: ${j.surfaces.map((s) => `y${s.y} ${s.name} ${s.w}x${s.h}`).join(' | ')}`);
  }
}
console.log(`\naggregate written to design/communication/fold.json (${got.size} of ${cells.length} cells posted)`);
