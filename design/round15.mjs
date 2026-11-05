#!/usr/bin/env node
// design/round15.mjs — grill round 15 (R6): the landing page's vertical rhythm, priced AND photographed.
//
//   npm run round15                     every option at every width (~4 min on this rig under load)
//   npm run round15 -- edges rows       a subset by label
//   RHYTHM_WIDTHS="1240 390" npm run round15      fewer widths while iterating
//
// Why a round and not just the table. `design/rhythm.mjs` already prices each option in numbers, and numbers
// answer "what does this cost". They do not answer the question the operator actually has, which is "which page
// do I want" — a rhythm decision is about where the eye lands and whether a band still reads as a band after its
// air is gone. D160: a question answered by looking gets pictures of every option, at one scale, from the same
// load that produced its numbers.
//
// Why these options and not the old ones. The previous rhythm table measured a page that no longer ships: its
// `interior` option tightened a six-card grid that has been gone for weeks and came out **+184px taller and
// +532px emptier** (measured 2026-11-04 at 320 — it was steering at nothing), and its `slots` option painted
// PS-1 and PS-3, which are no longer empty (PS-1 372x574 with two images, PS-3 a 526x56 line of text), so it
// measured a -47px no-op. The options here come from `design/grill/rhythm-variants.mjs` — the same module the
// gate reads, so a specimen can never argue for a stylesheet the table never priced.
//
// What it does, per option:
//   1. runs `whitespace-survey.mjs --css <option> --label <label>` at every width — a COPY of dist, never dist;
//   2. copies that same load's own full-page screenshot out of `.design/render/` (the survey takes it anyway);
//   3. downscales the shot to one factor shared by every option at that width, so the comparison is composition
//      rather than image size;
//   4. refuses an option that changed nothing, and says which rule lost (round14's rule, kept: an option that
//      paints the same page is not an answer).
// Then it writes `design/grill/round15/report.json` — the only tracked output, like round 13's — and hands off to
// `design/grill/round15-build.mjs`, which generates the specimen from the report and throws on a missing lookup or a
// missing photograph, so nothing in the HTML is typed by hand. Every screenshot stays in `.design/tmp-round15/`:
// the specimen embeds the pages as base64, so the PNGs are scratch and the tracked dir holds one JSON.
//
// Not run here: `check:render` and `check:color` per option. This round's options are one stylesheet each on a
// page whose components did not change, so the render matrix cannot disagree with it; the survey's own painted
// share and the delta columns carry the colour cost. If an option graduates to a real edit, it goes through the
// normal gates at that point rather than being pre-run here.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { VARIANTS } from './grill/rhythm-variants.mjs';
import { scaleTo } from './grill/round-instruments.mjs';
import { shotHeight } from './grill/shot-height.mjs';
import { distState, staleLine } from './dist-fresh.mjs';

const OUT = 'design/grill/round15';
const SCRATCH = '.design/tmp-round15';
const WIDTHS = (process.env.RHYTHM_WIDTHS || '1440 1240 1024 640 390 320').split(/\s+/).filter(Boolean).map(Number);
// One page tall at 1240 is ~4000px; five or six of those side by side is unreadable and enormous. 0.22 puts a
// whole page at ~270px wide on a laptop screen, which is where "does this band still read as a band" is answerable.
const PAGE_SCALE = Number(process.env.ROUND15_SCALE ?? 0.22);
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (only.length) {
  const unknown = only.filter((l) => !VARIANTS.some((v) => v.label === l));
  if (unknown.length) {
    console.error(`round15: no such option(s): ${unknown.join(', ')}. Known: ${VARIANTS.map((v) => v.label).join(', ')}`);
    process.exit(1);
  }
}
const variants = only.length ? VARIANTS.filter((v) => only.includes(v.label)) : VARIANTS;

const STALE = distState();
if (!STALE.fresh && !STALE.allowed) {
  console.error(`round15: ${staleLine(STALE)}`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });
const notes = [];
const started = Date.now();
const say = (m) => console.log(m);

/** One survey step, retried: this harness's known flake is a page that paints and never posts. */
function survey(label, css) {
  const cssPath = `${SCRATCH}/${label}.css`;
  if (css) writeFileSync(cssPath, `${css}\n`);
  const args = ['design/whitespace-survey.mjs', '--routes', '/', '--widths', ...WIDTHS.map(String)];
  if (css) args.push('--css', cssPath, '--label', label);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execFileSync(process.execPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      return;
    } catch (e) {
      const err = `${e.stderr ? e.stderr.toString() : ''}${e.message || ''}`;
      const flaky = /TIMEOUT|never posted|measurement failed/i.test(err);
      const tail = err.split('\n').filter(Boolean).slice(-2).join(' | ');
      if (!flaky || attempt === 3) throw new Error(`survey ${label}: ${tail}`);
      notes.push(`survey ${label}: the browser posted nothing on attempt ${attempt}; retried`);
    }
  }
}

const jsonFor = (label, w) => {
  const tag = label === 'shipped' ? '' : `-${label}`;
  return `.design/tmp-whitespace/space${tag}-root-${w}.json`;
};
const shotFor = (label, w) => {
  const tag = label === 'shipped' ? '' : `-${label}`;
  return `.design/render/space${tag}-root-${w}.png`;
};
const at = (label, w) => {
  const f = jsonFor(label, w);
  if (!existsSync(f)) return null;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  return {
    height: j.height, paintedPct: j.paintedPct, emptyRunPx: j.emptyRunPx, emptyRunPct: j.emptyRunPct,
    emptyRuns: j.emptyRuns, biggestRun: Math.max(0, ...(j.gaps || []).map((g) => g.h)),
    declaredPaddingPx: j.declaredPaddingPx,
    inside: (j.surfaces || []).reduce((a, s) => a + (s.gapsInside || 0), 0),
    edges: (j.surfaces || []).reduce((a, s) => a + (s.emptyTop || 0) + (s.emptyBottom || 0), 0),
  };
};

const report = { measuredAt: new Date().toISOString(), widths: WIDTHS, scale: PAGE_SCALE, notes, baseline: { label: 'shipped', at: {} }, options: [] };
say(`round15 — ${1 + variants.length} pages x ${WIDTHS.length} widths (${WIDTHS.join('/')}); dist ${STALE.built.path} built ${new Date(STALE.built.mtimeMs).toISOString()}`);

survey('shipped', '');
for (const w of WIDTHS) {
  const m = at('shipped', w);
  if (!m) throw new Error(`shipped survey produced no record at ${w}`);
  shotHeight(m.height, `shipped @${w}`);
  report.baseline.at[String(w)] = m;
}

for (const v of variants) {
  const row = { label: v.label, what: v.what, at: {}, shots: {} };
  survey(v.label, v.css);
  for (const w of WIDTHS) {
    const m = at(v.label, w);
    const b = report.baseline.at[String(w)];
    if (!m) { notes.push(`${v.label} @${w}: no survey record — that cell is a gap, not a zero`); continue; }
    const dead = m.height === b.height && m.emptyRunPx === b.emptyRunPx && m.paintedPct === b.paintedPct;
    // A no-op at one width is a fact about the option (a media query that does not reach that width, a container
    // already narrower than the viewport); a no-op at EVERY width is an option that answers nothing. Say which.
    if (dead) notes.push(`${v.label} @${w}: identical to shipped — this option cannot reach this width`);
    row.at[String(w)] = { ...m, dead, delta: `${m.height - b.height >= 0 ? '+' : ''}${m.height - b.height}` };
    const png = shotFor(v.label, w);
    if (existsSync(png)) {
      copyFileSync(png, `${SCRATCH}/full-${v.label}-${w}.png`);
      row.shots[String(w)] = await scaleTo(`${SCRATCH}/full-${v.label}-${w}.png`, `${SCRATCH}/page-${v.label}-${w}.png`, PAGE_SCALE);
    } else notes.push(`${v.label} @${w}: the survey left no screenshot — the specimen will have no picture for this one`);
  }
  const live = WIDTHS.filter((w) => row.at[String(w)] && !row.at[String(w)].dead);
  if (!live.length) throw new Error(`${v.label}: identical to shipped at every measured width — the mutation matched nothing, or a rule lost. Not an answer.`);
  const cost = live.map((w) => `${w}: ${row.at[String(w)].delta}px tall, ${row.at[String(w)].emptyRunPx - report.baseline.at[String(w)].emptyRunPx >= 0 ? '+' : ''}${row.at[String(w)].emptyRunPx - report.baseline.at[String(w)].emptyRunPx}px empty`).join(' · ');
  say(`  ${v.label.padEnd(12)} ${cost}`);
  report.options.push(row);
}

// The shipped page's own photographs, at the same scale, so the first column of every row is the incumbent.
for (const w of WIDTHS) {
  const png = shotFor('shipped', w);
  if (existsSync(png)) report.baseline.shots ??= {};
  if (existsSync(png)) report.baseline.shots[String(w)] = await scaleTo(png, `${SCRATCH}/page-shipped-${w}.png`, PAGE_SCALE);
}

writeFileSync(`${OUT}/report.json`, `${JSON.stringify(report, null, 1)}\n`);
say(`\njson      ${OUT}/report.json (tracked — commit it with the round that cites it)`);
say(`pictures  ${SCRATCH}/page-*.png - scratch, NOT tracked: the specimen embeds every page as base64, so nothing reads `
          + `these later, and 54 full-page PNGs in git would buy nothing. round15-build.mjs refuses to generate a specimen `
          + `with a missing photograph, so regenerate the round rather than rebuilding the HTML alone.`);
for (const n of notes) say(`note      ${n}`);
try {
  execFileSync(process.execPath, ['design/grill/round15-build.mjs'], { stdio: 'inherit' });
} catch (e) {
  console.error(`the specimen builder did not run: ${(e.stderr || e.message || '').toString().slice(0, 400)}`);
  process.exit(1);
}
say(`round15: ${(Date.now() - started) / 1000}s`);
