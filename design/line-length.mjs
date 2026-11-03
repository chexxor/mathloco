#!/usr/bin/env node
// line-length.mjs — characters per line, measured on the built page at the shipped widths.
//
//   node design/line-length.mjs                     # '/', '/404', '/chat' at 1240, 390, 320 (builds first)
//   node design/line-length.mjs / --no-build        # the dist that is already there
//   node design/line-length.mjs / 375 360           # one route, its own widths
//   RENDER_JOBS=1 node design/line-length.mjs       # serialize the firefox runs (default 4)
//
// This is the diagnostic for the type-ramp round, not a gate: it exits 0 whatever it finds, because its
// job is to print the number that decides whether "bigger type" is readable or merely larger. Line length
// in characters is what a size change moves in the opposite direction to intent — a bigger size in the
// same box buys FEWER characters per line, and past roughly 75-80 ch the reader loses the return sweep.
// The reading band this report compares against (40-75 ch) is the conventional body-copy range; it is
// stated here as a yardstick for the round, not ratified as a rule.
//
// Reports land in .design/render/linelength-<route>-<w>.json — regenerable, so scratch (design/README.md).
// The probe that produces them (design/grill/line-length-measure.js) is tracked, because the numbers in
// DESIGN.md / .notes/NEXT.md cite it.
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { distState, staleLine } from './dist-fresh.mjs';

const argv = process.argv.slice(2);
const NO_BUILD = argv.includes('--no-build');
const pos = argv.filter((a) => !a.startsWith('--'));
const routesArg = pos.filter((a) => a.startsWith('/'));
const routes = routesArg.length ? routesArg : ['/', '/404', '/chat'];
const widthsArg = pos.filter((a) => /^\d+$/.test(a)).map(Number);
const widths = widthsArg.length ? widthsArg : (process.env.RENDER_WIDTHS || '1240,390,320').split(',').map(Number);
const JOBS = Math.max(1, Number(process.env.RENDER_JOBS || 4));
const dist = resolve('dist/client');
if (!existsSync(dist)) { console.error('dist/client missing — run npm run build first (or drop --no-build)'); process.exit(2); }
if (!NO_BUILD) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const { execFileSync } = await import('node:child_process');
  execFileSync(npm, ['run', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });
} else {
  console.log('(measuring the dist that is already built — --no-build)');
  const STALE = distState();
  if (!STALE.fresh && !STALE.allowed) { console.error(`lines:measure: ${staleLine(STALE)}`); process.exit(1); }
}
mkdirSync('.design/render', { recursive: true });

const run = (route, width) => new Promise((done) => {
  const height = width === 390 ? 844 : 1400;
  execFile(process.execPath,
    ['design/grill/dist-measure.mjs', dist, route, 'design/grill/line-length-measure.js', String(width), String(height)],
    { encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 },
    (err, out, stderr) => done({ route, width, out, err, stderr }));
});

// the same flake the render gate works around: a firefox that starts and never posts
const ATTEMPTS = Number(process.env.RENDER_ATTEMPTS || 2);
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
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (i < items.length) { const k = i++; out[k] = await work(items[k]); }
  }));
  return out;
}

const cells = routes.flatMap((r) => widths.map((w) => [r, w]));
const got = new Map();
const raw = await pool(cells, ([r, w]) => measure(r, w).then((x) => ({ route: r, width: w, ...x })), Math.min(JOBS, cells.length));
for (const r of raw) {
  if (r.err) { console.log(`FAIL ${r.route} @${r.width}: ${r.err.message}`); continue; }
  writeFileSync(`.design/render/linelength-${r.route.replace(/\//g, '_') || 'root'}-${r.width}.json`, JSON.stringify(r.j, null, 1));
  got.set(`${r.route} @${r.width}`, r.j);
}

const num = (s) => parseFloat(s);
const band = (c) => c >= 40 && c <= 75;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };

for (const route of routes) {
  for (const w of widths) {
    const j = got.get(`${route} @${w}`);
    if (!j) continue;
    console.log(`\n=== ${route} @${w} (viewport ${j.vw}) — ${j.runs.length} text runs ===`);
    const unloaded = (j.fonts || []).filter((f) => !/\bloaded\b/.test(f));
    if (j.facesLoaded === false || unloaded.length) console.log(`  FAIL-FOR-READING faces not loaded at measure time (${unloaded.slice(0, 3).join('; ')}) — every advance/box below is fallback metrics`);

    // outermost runs only: a <span> inside a <p> shares the p's box, and counting it twice would
    // over-weight whatever happens to be marked up with an inline wrapper
    const outer = j.runs.filter((r) => !r.nested);
    const rows = [...outer].sort((a, b) => b.cpl - a.cpl);
    console.log('  box    lines cpl(avg) max  advance  word-px/box  fs      tag  text');
    for (const r of rows) {
      console.log(`  ${String(r.box).padStart(6)} ${String(r.lines).padStart(5)} ${String(r.cpl).padStart(8)} ${String(r.maxLineChars).padStart(4)} ${String(r.advance).padStart(8)}  ${String(r.longestWordPx).padStart(7)}/${String(r.box).padEnd(6)} ${r.fs.padEnd(7)} ${r.tag.padEnd(4)} ${r.t.slice(0, 44)}${r.broken ? ' [BROKEN WORD]' : ''}${r.wordFits ? '' : ' [WORD OVERFLOWS BOX]'}`);
    }

    // the reading band applies to PROSE at reading size: a nav label is not body copy and its 12
    // characters are not a line-length failure
    const prose = outer.filter((r) => r.chars >= 20 && num(r.fs) >= 15);
    const short = outer.filter((r) => !(r.chars >= 20 && num(r.fs) >= 15));
    const outOfBand = prose.filter((r) => !band(r.maxLineChars));
    console.log(`  prose runs ${prose.length}: cpl median ${median(prose.map((r) => r.cpl)).toFixed(1)}, max line ${Math.max(0, ...prose.map((r) => r.maxLineChars))}, min box ${Math.min(9999, ...prose.map((r) => r.box))}`);
    console.log(`  outside the 40-75 ch band: ${outOfBand.length ? outOfBand.map((r) => `${r.tag}(${r.fs}) ${r.maxLineChars}ch in ${r.box}px`).join(' | ') : 'none'}`);
    const tight = prose.filter((r) => r.maxLineChars < 40);
    if (tight.length) console.log(`  under 40 ch (the number a size bump makes WORSE): ${tight.map((r) => `${r.tag}(${r.fs}) ${r.maxLineChars}ch`).join(' | ')}`);
    console.log(`  short/label runs: ${short.length} (not band-scored)`);
    for (const r of j.runs.filter((x) => !x.wordFits)) console.log(`  WORD-DRIVEN WRAP: ${r.tag} "${r.longestWord}" ${r.longestWordPx}px against a ${r.box}px box at ${r.fs}`);
  }
}

// What the predictor needs, printed so the round-8 specimen can be checked against it rather than
// argued with: box / advance = how many characters fit a line at this size, whatever the wrap did.
console.log('\n=== the predictor (box / advance, i.e. characters that FIT a line, not characters that fitted) ===');
for (const route of routes) {
  for (const w of widths) {
    const j = got.get(`${route} @${w}`);
    if (!j) continue;
    const prose = j.runs.filter((r) => !r.nested && r.chars >= 20 && num(r.fs) >= 15 && r.advance > 0);
    const byFace = {};
    for (const r of prose) (byFace[`${r.ff} ${r.fs} ${r.fw}`] ||= []).push(+(r.box / r.advance).toFixed(0));
    console.log(`  ${route} @${w}: ${Object.entries(byFace).map(([k, v]) => `${k} -> fits ~${Math.max(...v)} ch`).join(' | ')}`);
  }
}
console.log('\n(line-length.mjs is a diagnostic: it exits 0 whatever it measures. Reports: .design/render/)');
