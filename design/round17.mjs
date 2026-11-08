#!/usr/bin/env node
// round17 - grill round 17: the header bar, and the club name painted twice (2026-11-08).
//
// Runs design/grill/round17-options.mjs against mutated copies of `dist/client`, measures each with
// design/grill/header-measure.js at the four ratified widths, runs the SHIPPED render gate against each mutated
// page, and records it all in design/grill/round17/report.json (tracked). The operator chooses from
// design/grill/round-17-header.html, generated from that record by design/grill/round17-build.mjs - the page is a
// view of the record, not a second copy of the numbers (design/README.md, "a specimen is a build, not a story").
//
// Three rules this runner enforces, one per lesson a previous round paid for:
//   1. an exact `from` that is not in the built page THROWS (round 16): an option whose markup moved under it
//      would otherwise price nothing and report the shipped page's numbers under its own name.
//   2. a priced type step must be the step that PAINTED (round 16's `optionTypeWasNotPainted`, where a
//      `sm:text-display-4` option came back -16px while the build painted display-1): the step options are
//      asserted against ramp values read out of the built CSS, not against numbers typed into this file.
//   3. the shipped gate runs unchanged against every candidate (D211/D212's argument) - see renderGateMutated.
//
// `--fast` skips the gate sweep to look at the numbers; the record then says gates were skipped instead of
// pretending they ran.

import { mkdirSync, rmSync, cpSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { OPTIONS, WIDTHS, SHOT_WIDTHS, RAMP_TOKENS } from './grill/round17-options.mjs';
// The colour maths is the shared module, asserted against the numbers DESIGN.md cites (okcolor.mjs --selftest),
// so a ground reported here cannot disagree with the census or the contrast oracle.
import { rgbTripleFromBytes, tripleToBytes, asTriple, contrastBytes, nearestBrand, hueGap, dist, BARS } from './grill/okcolor.mjs';
// The pixel probe lives in grill/edge-probe.mjs: it is a pure function of a screenshot and the bar's bottom
// edge, so a round can re-measure a photograph it already took without re-rendering the page.
import { edgeReport } from './grill/edge-probe.mjs';

const SCRATCH = '.design/tmp-round17';
const OUT = 'design/grill/round17';
const FAST = process.argv.includes('--fast');
// `--only chrome-ground,dup-homework-band-goes` re-prices named options and merges their rows into an existing
// record. A round is ~25 minutes; a single flaked row should not cost the whole round, and a record whose verdict is
// a probe flake is worse than a record with a named, re-run row.
const onlyFlag = process.argv.findIndex((a) => a === '--only' || a.startsWith('--only='));
const ONLY = (onlyFlag < 0 ? '' : process.argv[onlyFlag].includes('=') ? process.argv[onlyFlag].slice(7) : (process.argv[onlyFlag + 1] || '')).split(',').filter(Boolean);
if (process.argv.includes('--list')) { console.log(OPTIONS.map((o) => `${o.label}  -  ${o.title}`).join('\n')); process.exit(0); }
const BACKUP = `${SCRATCH}/index-shipped.html`;

const run = (args, timeout = 240000) => execFileSync('node', args, { maxBuffer: 64 * 1024 * 1024, timeout }).toString();

// A headless probe that never posts is a flake on this rig, not a property of the page. Measured 2026-11-08 (Linux,
// Firefox 159): inside the 14-option round, `name-lockup` at 320px died as TIMEOUT while the identical mutated page
// posted fine when run on its own seconds later. A full round costs ~15 minutes, and losing one to a single flake is
// exactly the wall-clock waste .notes/PITFALLS.md exists to name, so a probe gets three bounded attempts. If all
// three fail the option is recorded as a hole with the error, rather than taking the whole round down with it — a
// record with a named hole is readable; a crashed round has to be started again from nothing.
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const probe = (args, tag) => {
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const j = JSON.parse(run(args, 150000));
      if (attempt > 1) console.log(`   ${tag}: recovered on attempt ${attempt}`);
      return j;
    } catch (e) {
      last = String(e.message || e).split('\n').find((l) => l.trim()) || 'unknown';
      console.log(`   ${tag}: attempt ${attempt} failed (${last.slice(0, 110)})`);
      sleepSync(1500 * attempt);
    }
  }
  return { probeError: last };
};
const num = (v) => (typeof v === 'string' ? parseFloat(v) : v);

// The ramp, read from the artifact rather than typed here: if a token moves, this follows it.
function rampFromCss(dir) {
  const cssDir = join(dir, '_astro');
  const file = readdirSync(cssDir).find((f) => f.endsWith('.css'));
  const css = readFileSync(join(cssDir, file), 'utf8');
  const out = {};
  for (const m of css.matchAll(/(--(?:text|leading|color|space)[a-z0-9-]*)\s*:\s*([^;}]+)/g)) out[m[1]] = m[2].trim();
  return out;
}

// The gate that the header options press on, run UNCHANGED against the mutated page. The mechanism is the one
// design/render-gate-selftest.mjs already uses, in its own words: it edits dist/client/index.html "because that is
// what the gate measures - a specimen would prove the harness works but not that the gate reads the artifact", and
// dist/ is gitignored scratch. So the shipped page is swapped out, the shipped gate runs, and the page is restored
// in a `finally`. Adding a `--dist <dir>` flag to the gate would give it a second entry point, and a gate with two
// entry points is a gate whose default path nobody can be certain of.
// A gate run whose verdict is "measurement failed" is the harness flaking, not the page failing a check: the gate
// counts a width it could not probe as a FAIL (correct, for a deploy), but for pricing an option a flake must not
// be read as a verdict. Retry bounded, then record what actually happened.
const FLAKE = /measurement failed|TIMEOUT|never posted|no screenshot/;
function renderGateMutated(label, html, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    writeFileSync('dist/client/index.html', html);
    try {
      const o = run(['design/render-gate.mjs', '/', '--no-build']);
      writeFileSync(`${SCRATCH}/gate-${label}.txt`, o);
      return [{ ok: true, retries: attempt - 1, detail: o.trim().split('\n').filter((l) => /ok|pass|—/.test(l)).slice(-1)[0] || 'ok', full: `${SCRATCH}/gate-${label}.txt` }];
    } catch (e) {
      const text = String(e.stdout || e.message).trim();
      writeFileSync(`${SCRATCH}/gate-${label}.txt`, text);
      // The gate prints its reasons as lines starting with the route; the trailing summary block is the same block a
      // passing run prints, so it is the FAIL lines that carry the verdict.
      const fails = text.split('\n').filter((l) => l.includes('FAIL'));
      if (fails.some((l) => FLAKE.test(l)) && attempt < attempts) { sleepSync(2000); continue; }
      return [{ ok: false, retries: attempt - 1, fails, full: `${SCRATCH}/gate-${label}.txt`, detail: fails.slice(0, 6).join(' | ') || text.split('\n').slice(0, 3).join(' | ') }];
    } finally {
      writeFileSync('dist/client/index.html', readFileSync(BACKUP, 'utf8'));
    }
  }
}

const shippedHtml = readFileSync('dist/client/index.html', 'utf8');
// A round killed mid-swap leaves the candidate in dist/client/index.html, and the next round then backs up that
// candidate as "shipped" and prices every option against it. Measured 2026-11-08 (Linux): a `--only` run killed by a
// shell timeout left `bg-tint` in the header, and the run that followed measured its `shipped` row at 21.1px nav type
// on a tint ground, then threw because the shipped anchor no longer existed. Refuse, and name the fix.
if (!/<header class="bg-paper"/.test(shippedHtml) || !/Minneapolis math club/.test(shippedHtml)) {
  console.error('round17: dist/client/index.html is not the shipped page — a previous round was killed while the gate swap was in place. Run `npm run build` to restore it, then re-run this round.');
  process.exit(1);
}
mkdirSync(SCRATCH, { recursive: true });
writeFileSync(BACKUP, shippedHtml);
// A signal is not an exception: `finally` does not run on SIGTERM, so the swap has to be undone by the signal itself.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    writeFileSync('dist/client/index.html', readFileSync(BACKUP, 'utf8'));
    console.error(`round17: ${sig} — dist/client/index.html restored from ${BACKUP}`);
    process.exit(130);
  });
}
const ramp = rampFromCss('dist/client');
const MISSING_TOKENS = [];

// The colour question under the bar, answered off the bytes Firefox painted (record 0020: a computed colour
// string cannot describe a ground when a background image is involved) rather than off the stylesheet:
//   * what the bar's ground IS, in the space @theme writes tokens in
//   * how far it is from the page's own ground, against the ratified 1.35 layer bar (D101) — the number the
//     operator's "the bar is not distinguishable from the page body" is actually asking for
//   * what every role the header can paint measures ON it (ink, ink-3, rule, gold, band-text), against the 4.5
//     text bar and the 3.0 graphic bar — this is where a warm ground stops being a free swap
//   * how close it is to a commerce brand, in D88's 0.135 zone
function groundReport(m) {
  const g = m.header?.ground?.bytes;
  if (!g) return null;
  const roles = {};
  for (const role of ['ink', 'ink-2', 'ink-3', 'rule', 'gold', 'band-text']) {
    const spec = ramp[`--color-${role}`];
    if (!spec) { MISSING_TOKENS.push(`--color-${role}`); continue; }
    roles[role] = contrastBytes(tripleToBytes(asTriple(spec)), g);
  }
  const t = rgbTripleFromBytes(g);
  const page = m.doc?.bgBytes;
  const painted = (m.nav?.items || []).filter((i) => i.colorBytes).map((i) => ({ t: i.t, on: contrastBytes(i.colorBytes, g), bytes: i.colorBytes.join(','), brand: nearestBrand(rgbTripleFromBytes(i.colorBytes), 1)[0] }));
  return {
    bytes: g.join(','),
    paintedBy: m.header.ground.from,
    oklch: `${t.L}% ${t.C} ${t.H}`,
    layerVsPage: page ? contrastBytes(g, page) : null,
    layerBar: BARS.layer,
    distToPage: page ? dist(t, rgbTripleFromBytes(page)) : null,
    roles,
    bars: { text: BARS.text, graphic: BARS.graphic },
    painted,
    paintedMin: painted.length ? Math.min(...painted.map((p) => p.on)) : null,
    paintedBrand: painted.length ? painted.map((p) => `${p.brand.brand} ${p.brand.d}`).sort((a, b) => parseFloat(a.split(' ')[1]) - parseFloat(b.split(' ')[1]))[0] : null,
    hueGapToGold: ramp['--color-gold'] ? hueGap(t, asTriple(ramp['--color-gold'])) : null,
    nearestBrand: nearestBrand(t, 2).map((b) => `${b.brand} ${b.d}`).join(', '),
  };
}

function distCopy(label, option, html) {
  const dir = `${SCRATCH}/${label}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync('dist/client', dir, { recursive: true, filter: (s) => !/rendered-|\.measured-|\.rel\.css|\.full\.css/.test(s) });
  const applied = [];
  let out = html;

  let mutations = option.mutations;
  if (mutations === 'glyph') {
    // Reuse the SHIPPED mark rather than redraw it: round 11 made the mark single-source for this reason, and a
    // re-typed SVG would price a glyph the site does not have.
    const svg = out.match(/<svg[^>]*data-mark[^>]*>[\s\S]*?<\/svg>/);
    if (!svg) throw new Error(`${option.label}: no svg[data-mark] in the built page to reuse`);
    // Sized from the mark's OWN viewBox, at the nav's 24px line box: forcing height AND width to 24px squashes a
    // 240x150 mark into a square, and the mark probe's ratio rule would then fail my mutation instead of the
    // option. The first run of this round did exactly that and reported ratio 1 vs 0.625.
    const vb = (svg[0].match(/viewBox="([^"]+)"/) || [, ''])[1].split(/[\s,]+/).map(Number);
    if (!(vb[2] && vb[3])) throw new Error(`${option.label}: the shipped mark has no usable viewBox to size from`);
    const H = 24, W = +(H * vb[2] / vb[3]).toFixed(1);
    const sized = svg[0].replace(/\s+class="[^"]*"/, '').replace('<svg ', `<svg style="height:${H}px;width:${W}px" `);
    mutations = [{
      where: 'Navigation.astro identity item',
      from: '<a href="/" class="flex-shrink-0 whitespace-nowrap py-2 font-body text-body text-ink" aria-label="Matheapolis, home">Matheapolis</a>',
      to: `<a href="/" class="flex-shrink-0 whitespace-nowrap py-2 text-ink" aria-label="Matheapolis, home">${sized}</a>`,
    }];
  }

  for (const m of mutations) {
    const n = out.split(m.from).length - 1;
    if (n === 0) throw new Error(`${option.label}: "${m.where}" expects ${JSON.stringify(m.from).slice(0, 90)}… in the built page and it is not there - the markup moved under this option, so it would price nothing`);
    out = out.split(m.from).join(m.to);
    applied.push({ where: m.where, occurrences: n });
  }
  if (option.css) out = out.replace('</head>', option.css + '\n</head>');
  if (out === html) throw new Error(`${option.label}: the mutation changed nothing, so its numbers would be the shipped page wearing another name`);
  writeFileSync(join(dir, 'index.html'), out);
  return { dir, applied, html: out };
}

const MEASURED = {};   // label -> the four-width measurement, so a later row can be differenced against `shipped`
const OPTS = ONLY.length ? OPTIONS.filter((o) => ONLY.includes(o.label) || o.label === 'shipped') : OPTIONS;

const report = {
  round: 17,
  measuredAt: new Date().toISOString(),
  os: `${process.platform} (native, no container - D131)`,
  question: 'The club name is painted in the header bar and again as the largest text on the page, and the header bar carries the page ground with a type step smaller than a body line. What makes the bar read as chrome, and what does each way of doing it cost?',
  widths: WIDTHS,
  viewportHeight: 1400,
  probes: ['design/grill/header-measure.js (new this round): header box + ground, every nav item at its own computed size, the row needed-vs-available, the h1, the descriptor lane, the gaps between them, every element whose OWN text carries the name, and the name count inside the first viewport', 'design/grill/render-measure.js at the shot widths, for the mark stroke widths in device px'],
  gates: FAST ? 'SKIPPED (--fast) - these rows have no shipped-gate verdict in this record' : 'the shipped gate unchanged: `node design/render-gate.mjs / --no-build` at 1240/640/390/320, with dist/client/index.html swapped for the option and restored in a finally (the design/render-gate-selftest.mjs mechanism)',
  rampFromBuild: Object.fromEntries(Object.entries(RAMP_TOKENS).flatMap(([k, [f, l]]) => [[k, `${ramp[f]} / ${ramp[l]}`]])),
  options: [],
};

for (const opt of OPTS) {
  // Scratch is reused across rounds, and a stale artifact is worse than a missing one: the mark-floor question below,
  // and any human reading `m-<label>-<width>.json`, would answer from a previous round's page. The patterns are the
  // runner's own names, not a substring match on the label: a `f.includes(label)` sweep deletes
  // `index-shipped.html` for the `shipped` row (that file is what the gate swap restores FROM), and it deletes the
  // copy directory this round has already made. Clean first, copy second.
  if (existsSync(SCRATCH)) {
    for (const f of readdirSync(SCRATCH)) {
      if (f === 'index-shipped.html') continue;
      if (f === opt.label || f.startsWith(`m-${opt.label}-`) || f.startsWith(`shot-${opt.label}-`) || f.startsWith(`render-${opt.label}-`) || f.startsWith(`gate-${opt.label}-`)) {
        rmSync(`${SCRATCH}/${f}`, { recursive: true, force: true });
      }
    }
  }

  const { dir, applied, html } = opt.label === 'shipped'
    ? { dir: `${SCRATCH}/shipped`, applied: [], html: shippedHtml }
    : distCopy(opt.label, opt, shippedHtml);
  if (opt.label === 'shipped') { rmSync(dir, { recursive: true, force: true }); cpSync('dist/client', dir, { recursive: true, filter: (s) => !/rendered-|\.measured-|\.rel\.css|\.full\.css/.test(s) }); }

  const measure = {};
  for (const w of WIDTHS) {
    const j = probe(['design/grill/dist-measure.mjs', dir, '/', 'design/grill/header-measure.js', String(w), '1400', `${SCRATCH}/m-${opt.label}-${w}.png`], `header ${opt.label}@${w}`);
    writeFileSync(`${SCRATCH}/m-${opt.label}-${w}.json`, JSON.stringify(j, null, 2));
    measure[w] = j;
  }
  // A probe that THREW posts `errors: [...]` and still counts as `done`, so the row would otherwise be priced on
  // a half-built record (found 2026-11-08: a throw in the sticky probe left `sizes` undefined and the runner died
  // 40 lines later with a TypeError far from the cause). Both failure shapes are a hole.
  const unmeasured = WIDTHS.filter((w) => measure[w].probeError || (measure[w].errors && measure[w].errors.length));
  if (unmeasured.length) console.log(`   ${opt.label}: NOT measured at ${unmeasured.join('/')}px after 3 attempts - recorded as a hole, not hidden`);

  // Rule 2: the step has to have painted, at every width, on both sides of the 640 flip.
  if (opt.step && !unmeasured.length) {
    const wantLabel = num(ramp[RAMP_TOKENS[opt.step.labels][0]]);
    const wantMark = num(ramp[RAMP_TOKENS[opt.step.mark][0]]);
    const baseLabel = num(ramp['--text-label']), baseMark = num(ramp['--text-body']);
    for (const w of WIDTHS) {
      const wide = w >= 640;
      const labels = measure[w].nav.items.filter((i) => !i.namesClub).map((i) => num(i.textFs));
      const mark = num(measure[w].nav.items.find((i) => i.namesClub)?.textFs);
      const bad = [];
      if (labels.some((f) => Math.abs(f - (wide ? wantLabel : baseLabel)) > 0.15)) bad.push(`labels ${labels.join('/')} expected ${wide ? wantLabel : baseLabel}`);
      if (Math.abs(mark - (wide ? wantMark : baseMark)) > 0.15) bad.push(`identity ${mark} expected ${wide ? wantMark : baseMark}`);
      if (bad.length) throw new Error(`round17: optionTypeWasNotPainted - "${opt.label}" at ${w}px: ${bad.join('; ')}. The step lost to the shipped rule, so the option is not being measured.`);
    }
  }

  const shots = {};
  for (const w of SHOT_WIDTHS) {
    const png = `${SCRATCH}/shot-${opt.label}-${w}.png`;
    const j = probe(['design/grill/dist-measure.mjs', dir, '/', 'design/grill/render-measure.js', String(w), '1400', png], `shot ${opt.label}@${w}`);
    if (j.probeError) { shots[w] = { png, probeError: j.probeError }; continue; }
    writeFileSync(`${SCRATCH}/render-${opt.label}-${w}.json`, JSON.stringify(j, null, 2));
    shots[w] = {
      png,
      docHeight: j.doc.scrollHeight,
      marks: (j.marks || []).map((m) => ({
        name: m.name, w: m.w, h: m.h, scale: m.scale, vbW: m.vbW,
        minStrokeDevicePx: Math.min(...m.shapes.filter((s) => s.strokePaints).map((s) => s.swDevice)),
      })),
      heroMarkJson: w === 1240 ? (j.marks || [])[0] : null,
    };
  }

  // Derived, from the shipped mark's own numbers: at what drawn width does its thinnest stroked shape reach the
  // 1px device floor `check:render` asserts? scale = drawn width / viewBox width, so width = floor * vbW / sw_u.
  // Read from the shot just taken, never from the scratch file: a previous round's file for the same label would
  // otherwise answer this question for a page that was never measured.
  const heroMark = shots[1240] && shots[1240].heroMarkJson;
  const markFloor = heroMark ? (() => {
    const thinnest = Math.min(...heroMark.shapes.filter((sh) => sh.strokePaints).map((sh) => sh.sw));
    return { thinnestStrokeUnits: thinnest, minWidthFor1pxFloorPx: +(1 * heroMark.vbW / thinnest).toFixed(1), drawnAtPx: heroMark.w, deviceStrokeAtDrawnPx: Math.min(...heroMark.shapes.filter((sh) => sh.strokePaints).map((sh) => sh.swDevice)) };
  })() : null;

  const gates = FAST ? null : renderGateMutated(opt.label, html);
  if (unmeasured.length) {
    report.options.push({
      label: opt.label, title: opt.title, what: opt.what, surfaces: opt.surfaces, gate: opt.gate,
      applied, dir, gates, hole: `probe produced nothing at ${unmeasured.join('/')}px after 3 attempts each`,
      headline: { probeError: measure[unmeasured[0]].probeError },
    });
    console.log(`${opt.label.padEnd(22)} NOT MEASURED — ${measure[unmeasured[0]].probeError.slice(0, 90)}`);
    continue;
  }
  const m = measure[1240], nav = m.nav, hero = m.hero;
  const entry = {
    label: opt.label,
    title: opt.title,
    what: opt.what,
    surfaces: opt.surfaces,
    gate: opt.gate,
    applied,
    dir,
    gates,
    headline: {
      nameInFirstScreen1240: m.nameInFirstScreen,
      groundReport: groundReport(m),
      nameOnPage1240: m.namePicks.filter((p) => p.painted).length,
      navIdentityFs: m.sizes.navIdentityFs,
      navLabelFs: m.sizes.navLabelFs,
      heroFs: m.sizes.heroFs,
      heroOverNavIdentity: m.sizes.heroOverNavIdentity,
      headerGround: m.header ? `${m.header.ground.bytes?.join(',')} from ${m.header.ground.from}` : null,
      headerBox: m.header ? `${m.header.w}x${m.header.h}` : null,
      headerBorderBottom: m.header ? m.header.border : null,
      headerShadow: m.header ? (m.header.shadow || 'none') : null,
      headerToHeroGap: m.gaps.headerToHero,
      laneFs: m.sizes.laneFs,
      rowNeededOfAvailable: WIDTHS.map((w) => `${measure[w].nav.row.needed}/${measure[w].nav.row.available}@${w}`).join('  '),
      docHeightByWidth: WIDTHS.map((w) => `${measure[w].doc.scrollHeight}@${w}`).join('  '),
      markStrokeFloor: markFloor,
      edgeReport: await edgeReport(shots[1240] && shots[1240].png, m.header && m.header.bottom, m.doc && m.doc.bgBytes),
      sticky: m.sticky || null,
      dupPairs: (m.sentences?.duplicatePairs || []).map((p) => `${p.a.own.slice(0,44)}… <> ${p.b.own.slice(0,44)}… @${p.jaccard}`),
      foldCopyChars: (m.fold || []).reduce((a, e) => a + e.own.length, 0),
      howItWorksY: m.sections?.['how-it-works']?.y ?? null,
    },
    deltas: null, // filled after the shipped row exists

    widths: Object.fromEntries(WIDTHS.map((w) => [w, {
      header: measure[w].header ? { box: `${measure[w].header.w}x${measure[w].header.h}`, ground: measure[w].header.ground.bytes?.join(','), border: measure[w].header.border, shadow: measure[w].header.shadow || 'none' } : null,
      navItems: measure[w].nav.items.map((i) => ({ t: i.t, fs: i.textFs, lh: i.textLh, ff: i.textFf, w: i.w, h: i.h, scrollW: i.scrollW, hasMark: i.hasMark, markBox: i.markBox })),
      row: measure[w].nav.row,
      hero: { own: hero && measure[w].hero.own, fs: measure[w].hero.fs, lh: measure[w].hero.lh, ff: measure[w].hero.ff, w: measure[w].hero.w, h: measure[w].hero.h, y: measure[w].hero.y },
      lane: measure[w].lane ? { own: measure[w].lane.own, fs: measure[w].lane.fs, y: measure[w].lane.y } : null,
      nameInFirstScreen: measure[w].nameInFirstScreen,
      gaps: measure[w].gaps,
      sticky: measure[w].sticky || null,
      docHeight: measure[w].doc.scrollHeight,
      fold: (measure[w].fold || []).map((e) => ({ tag: e.tag, own: e.own, y: e.y, fs: e.fs })),
      sections: measure[w].sections || {},
      dupPairs: measure[w].sentences?.duplicatePairs || [],
    }])),
    shots: Object.fromEntries(Object.entries(shots).map(([w, s]) => [w, s])),
  };
  MEASURED[opt.label] = measure;
  const base = MEASURED['shipped'];
  const sgn = (v) => `${v > 0 ? '+' : ''}${+v.toFixed(1)}`;
  if (base) entry.deltas = {
    docHeightByWidth: WIDTHS.map((w) => `${sgn(measure[w].doc.scrollHeight - base[w].doc.scrollHeight)}px@${w}`).join('  '),
    navRowNeededByWidth: WIDTHS.map((w) => `${sgn(measure[w].nav.row.needed - base[w].nav.row.needed)}px@${w}`).join('  '),
    headerHeight: m.header && base[1240].header ? `${sgn(m.header.h - base[1240].header.h)}px@1240` : null,
    nameInFirstScreen: m.nameInFirstScreen - base[1240].nameInFirstScreen,
    copyCharsInFirstScreen: (measure[1240].fold || []).reduce((a, e) => a + e.own.length, 0) - (base[1240].fold || []).reduce((a, e) => a + e.own.length, 0),
    howItWorksY: measure[1240].sections?.['how-it-works']?.y - base[1240].sections?.['how-it-works']?.y,
  };

  report.options.push(entry);

  const g = gates ? (gates.every((x) => x.ok) ? 'gate ok' : 'GATE FAILS (kept in the record, not hidden)') : 'gate skipped';
  console.log(`${opt.label.padEnd(22)} identity ${String(entry.headline.navIdentityFs).padEnd(7)} label ${String(entry.headline.navLabelFs).padEnd(7)} hero ${String(entry.headline.heroFs).padEnd(7)} ground ${String(entry.headline.headerGround).padEnd(28)} names-in-fold ${entry.headline.nameInFirstScreen1240}/${entry.headline.nameOnPage1240}  row ${entry.headline.rowNeededOfAvailable}  ${g}`);
  console.log(`${' '.repeat(23)}dup pairs: ${(m.sentences?.duplicatePairs || []).length}  (fold copy ${entry.headline.foldCopyChars} chars, how-it-works at y ${entry.headline.howItWorksY}px)`);
  if (entry.headline.groundReport) {
    const gr = entry.headline.groundReport;
    console.log(`${' '.repeat(23)}ground ${gr.oklch} (${gr.bytes}, painted by ${gr.paintedBy}) · vs page ${gr.layerVsPage} (layer bar ${gr.layerBar}) · ` +
      Object.entries(gr.roles).map(([r, c]) => `${r} ${c}${c < (r === 'rule' ? gr.bars.graphic : gr.bars.text) ? ' FAIL' : ''}`).join(' · ') +
      (gr.painted.length ? ` · painted nav ${gr.painted.map((p) => `${p.t} ${p.on}`).join(', ')}` : '') +
      ` · nearest brand ${gr.nearestBrand}`);
  }
  if (entry.deltas) console.log(`${' '.repeat(23)}deltas: page ${entry.deltas.docHeightByWidth}  nav row ${entry.deltas.navRowNeededByWidth}  ${entry.deltas.headerHeight}  names-in-fold ${sgn(entry.deltas.nameInFirstScreen)}  mark floor: ${entry.headline.markStrokeFloor ? entry.headline.markStrokeFloor.minWidthFor1pxFloorPx + 'px wide' : 'n/a'}`);
  if (gates && !gates[0].ok) for (const f of (gates[0].fails || [gates[0].detail])) console.log(`     ${f.trim().slice(0, 160)}`);
}

mkdirSync(OUT, { recursive: true });
if (ONLY.length && existsSync(`${OUT}/report.json`)) {
  const prev = JSON.parse(readFileSync(`${OUT}/report.json`, 'utf8'));
  const fresh = new Map(report.options.map((o) => [o.label, o]));
  report.options = prev.options.map((r) => fresh.get(r.label) ?? r);
  for (const row of fresh.values()) if (!prev.options.some((r) => r.label === row.label)) report.options.push(row);
  report.reRan = [...fresh.keys()];
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`\nrecord: ${OUT}/report.json`);
console.log(`scratch: ${SCRATCH}/ (measurements, gate-free copies, shots)`);
console.log(`dist/client/index.html restored from ${BACKUP}`);
