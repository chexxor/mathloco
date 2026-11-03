#!/usr/bin/env node
// area-survey.mjs — colour and emptiness, off ONE build, in one number pair.
//
//   npm run build && npm run check:area                  # "/" at 1240 and 390
//   node design/area-survey.mjs --routes / /chat --widths 1240 390 320
//
// Why one command instead of two: the round-10 wall-clock proposal, accepted by the operator on
// 2026-11-03. `check:color` and `check:space` already reuse the `dist` that exists (neither builds), so
// the only cost of running both was typing both — and the last design round argued from a colour number
// alone while 41.5% of the page's vertical journey stayed empty. A colour round that cannot see the
// emptiness under it will keep "fixing" a page that is thin, not grey. So the two measurements are
// issued as one pair, from the same bytes of the same build, with the same page fingerprint beside both.
//
// What it writes: `design/area/report.json` — TRACKED, and the point of the second accepted proposal
// ("commit a round's report JSON with its generator"): the next session re-quotes these numbers from git
// instead of re-running firefox, and a `git diff` on this file is the cheapest way to see whether an edit
// changed what the round claims. `siteFp` is the sha1 of `dist/client/index.html` the numbers were shot
// from (record 0015), so a stale report cannot be mistaken for a fresh one.
//
// No pass/fail: like both surveys, this is a before-number. It exits 1 only if a survey failed or wrote
// no record, which is a broken instrument, not a finding.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const argList = (flag, dflt) => {
  const i = args.indexOf(flag);
  if (i < 0) return dflt;
  const out = [];
  for (let k = i + 1; k < args.length && !args[k].startsWith('--'); k++) out.push(args[k]);
  return out;
};
const routes = argList('--routes', ['/']);
const widths = argList('--widths', ['1240', '390', '320']).map(Number);
// `root` for "/" is the two surveys' own convention (design/color-survey.mjs and
// design/whitespace-survey.mjs both name the record that way); matching it is not cosmetic — a wrong guess
// here reads a file that does not exist and the pair is lost.
const name = (r) => (r === '/' ? 'root' : r.replace(/^\//, '_').replace(/\//g, '-'));

const PAGE = 'dist/client/index.html';
if (!existsSync(PAGE)) {
  console.error('design/area-survey.mjs: dist/client/index.html missing — run npm run build first');
  process.exit(1);
}
const siteFp = createHash('sha1').update(readFileSync(PAGE)).digest('hex').slice(0, 10);

// One label for both halves of the run, so the whitespace record for this pass is findable by name
// (`space-area-<route>-<w>.json`) rather than by "whichever file was written last".
const run = (cmd, args2) => {
  try {
    execFileSync(process.execPath, [cmd, ...args2], { stdio: ['ignore', 'inherit', 'inherit'] });
  } catch (e) {
    console.error(`design/area-survey.mjs: ${cmd} exited ${e.status} — the pair is incomplete, not the page`);
    process.exit(1);
  }
};

const surveyArgs = ['--routes', ...routes, '--widths', ...widths.map(String)];
run('design/color-survey.mjs', surveyArgs);
run('design/whitespace-survey.mjs', [...surveyArgs, '--label', 'area']);

const read = (file) => {
  if (!existsSync(file)) {
    console.error(`design/area-survey.mjs: expected ${file} and it is not there — the survey wrote no record,`);
    console.error('  so there is no number to pair. Check the survey output above for a firefox that never posted.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(file, 'utf8'));
};

const rows = [];
for (const route of routes) {
  for (const w of widths) {
    const c = read(`.design/tmp-color/survey-${name(route)}-${w}.json`);
    const s = read(`.design/tmp-whitespace/space-area-${name(route)}-${w}.json`);
    if (c.siteFp && c.siteFp !== siteFp) console.error(`  WARN: colour record for ${route}@${w} carries siteFp ${c.siteFp}, not ${siteFp}`);
    if (s.siteFp !== siteFp) console.error(`  WARN: whitespace record for ${route}@${w} carries siteFp ${s.siteFp}, not ${siteFp}`);
    if (c.height !== s.height) {
      // Two instruments, one page, two heights: that is a settled-page bug, and the pair is not comparable.
      console.error(`  WARN: ${route}@${w} measured ${c.height}px for colour and ${s.height}px for emptiness —`);
      console.error('        the crop and the walk are looking at different pages. Do not quote either number.');
    }
    rows.push({
      route, width: w, height: s.height,
      chromaticPct: c.chromaticPct, strongPct: c.strongPct, faintPct: c.faintPct, hueFamilies: c.hueFamilies,
      paintedPct: s.paintedPct, emptyRunPct: s.emptyRunPct, emptyRuns: s.emptyRuns,
      // The whitespace record stores the runs themselves as `{y, h}` and no max, so the max is derived here
      // rather than assumed to be a field — assuming one printed `undefined`, and reading `gap` instead of
      // `h` printed 0, which is worse than a crash because it looks like a finding.
      biggestRun: (s.gaps ?? []).reduce((a, g) => Math.max(a, g.h ?? 0), 0),
      inside: s.gaps?.length ? s.gaps.reduce((a, g) => a + g.gap, 0) : 0,
    });
  }
}

console.log(`\narea — one build (${siteFp}), both halves off the same settled page:`);
console.log('  width  height   chroma>=.04  chroma>=.08  faint   painted   empty-run%  runs  biggest');
for (const r of rows) {
  console.log(
    `  ${String(r.width).padEnd(6)} ${String(r.height).padEnd(7)}` +
    `${String(r.chromaticPct).padStart(10)}%${String(r.strongPct).padStart(11)}%${String(r.faintPct).padStart(7)}%` +
    `${String(r.paintedPct).padStart(10)}%${String(r.emptyRunPct).padStart(12)}%${String(r.emptyRuns).padStart(7)}${String(r.biggestRun).padStart(9)}px`,
  );
}
console.log('\n  Read the pair, not a column: `chroma>=.08` is colour a reader would name (ink is C 0.045, so the');
console.log('  >=.04 column counts every glyph), and `painted` / `empty-run%` say how much of the journey holds');
console.log('  anything at all. A round that moves the first column and not the second has changed the paint,');
console.log('  not the page. Both bars are reporting thresholds, not rulings — nothing here exits non-zero.');

mkdirSync('design/area', { recursive: true });
writeFileSync('design/area/report.json', JSON.stringify({
  measuredAt: new Date().toISOString(), siteFp, routes, widths, rows,
  note: 'written by design/area-survey.mjs; tracked so the next session re-quotes instead of re-measuring. If siteFp no longer matches dist/client/index.html, re-run `npm run check:area`.',
}, null, 1));
console.log('\njson: design/area/report.json (tracked — commit it with the round that cites it)');
