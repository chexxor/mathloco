#!/usr/bin/env node
// round14.mjs — grill round 14 in one command: the whole landing page under each composition, measured by the
// gates CI runs, and photographed whole at one scale so the operator can answer by looking (D160).
//
//   npm run round14                       every option + the phone question (~6 min on this rig)
//   npm run round14 -- two-horizons       a subset, by id (the phone question is skipped, and the specimen says so)
//   npm run round14 -- --widths 1240 390  fewer geometry widths while iterating
//
// Why it exists. Round 13 settled one column (D161) and the operator asked for the page: *"Why two graphics in
// one place? Can they go elsewhere? More full-page sweeping-change ideas."* A composition at that scale cannot be
// ruled from a table of deltas — the thing being compared is rhythm, weight and where the eye lands. So the
// artifact is the page, photographed: five compositions of the SAME built page, each shot from the load that
// produced its numbers, downscaled to one display factor, set side by side.
//
// What it does:
//   1. measures the shipped page (no placeholder overlay this round — PS-1 is filled, so the state under test is
//      the state that ships) and reads its section map, so every box below is derived from a probe rather than
//      remembered;
//   2. crops the licensed plates at each option's box through `grill/plate-crop.mjs` — the recipe that built the
//      shipped hero — and records the **resolution shortfall** of every band, because the archive ladder stops at
//      1024px (record 0023) and a 1192px band is an upscale, not a scan;
//   3. per option: mutate `dist/client/index.html` (a `<style>` block, DOM moves, planted `data:` plates), then
//      run `check:space` at four widths, `check:render` on its ratified matrix, and `check:color` at 1240/390, and
//      copy the survey's own full-page screenshot out of the same load;
//   4. restore the page, re-measure the shipped build so the scratch left behind describes the tree;
//   5. measure the phone question (full plate / shorter plate / no plate) at 390, which is where round 13's
//      desktop table hid a +314px cost;
//   6. write `design/grill/round14/report.json`, then generate `design/grill/round-14-page.html` from it. The
//      builder reads the report and throws on a missing lookup: nothing in the specimen is typed by hand.
//
// No new gate logic: the FAILs are the gates' own rules, so a specimen can never disagree with CI. A mutation that
// changes nothing THROWS (except the incumbent, which plants an inert marker and says so).
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { OPTIONS, PHONE_STATES } from './grill/round14-options.mjs';
import { plateSource, cropFor, keepPct } from './grill/plate-crop.mjs';
import { shotHeight } from './grill/shot-height.mjs';
import { probeRetry, cropBox, cropStats, makeInstruments, scaleTo } from './grill/round-instruments.mjs';
import { MARK } from '../src/lib/brand-mark.mjs';

const SCRATCH = '.design/tmp-round14';
const ART = '.design/tmp-art';
const PAGE = 'dist/client/index.html';
const OUT = 'design/grill/round14';
const RENDER = '.design/render';

// One display factor for every whole-page photograph in the specimen, so five pages compare as compositions
// rather than as sizes (D160). 0.22 keeps a 4284px page under 950px tall and a 1240 viewport under 275px wide.
const PAGE_SCALE = 0.22;
const DETAIL_SCALE = 0.5;
const NAMED_CHROMA = 0.08;

const argv = process.argv.slice(2);
const only = argv.filter((a) => !a.startsWith('--'));
const wIdx = argv.indexOf('--widths');
const SPACE_WIDTHS = wIdx >= 0 ? argv.slice(wIdx + 1).filter((a) => !a.startsWith('--')).map(Number) : [1240, 1024, 640, 390];
const GATE_WIDTHS = [1240, 640, 390, 320];

const started = Date.now();
const say = (s) => console.log(s);
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);
const pick = (b) => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });

if (!existsSync(PAGE)) { console.error('dist/client/index.html missing — run npm run build first'); process.exit(1); }
try {
  const { distState, staleLine } = await import('./dist-fresh.mjs');
  const st = distState();
  if (!st.fresh && !st.allowed) { console.error(`round14: ${staleLine(st)}`); process.exit(1); }
} catch (e) { console.error(`round14: the dist freshness check did not run: ${e.message}`); process.exit(1); }

const unknown = only.filter((id) => !OPTIONS.some((o) => o.id === id));
if (unknown.length) { console.error(`unknown option(s): ${unknown.join(', ')}\nknown: ${OPTIONS.map((o) => o.id).join(' ')}`); process.exit(1); }
const options = only.length ? OPTIONS.filter((o) => only.includes(o.id)) : OPTIONS;

mkdirSync(SCRATCH, { recursive: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(`${ART}/img`, { recursive: true });

const report = { measuredAt: new Date().toISOString(), notes: [], options: [] };
const { runSpace, runGate, runColor } = makeInstruments({ scratch: SCRATCH, gateWidths: GATE_WIDTHS, colorWidths: [1240, 390], notes: report.notes });
mkdirSync(`${SCRATCH}/phone`, { recursive: true });
const phone = makeInstruments({ scratch: `${SCRATCH}/phone`, gateWidths: [390, 320], colorWidths: [390], notes: report.notes });

const original = readFileSync(PAGE, 'utf8');
report.siteFp = sha(original);

/** Boxes this round asks about, from one probe record — matched by what the page NAMES, never by styling. */
function boxes(dom) {
  const ps1 = dom.slots.find((s) => s.dataSlot === 'PS-1');
  const ps3 = dom.slots.find((s) => s.dataSlot === 'PS-3');
  const grid = dom.regions.find((r) => /lg:grid lg:grid-cols-12/.test(r.cls));
  const mark = dom.media.find((m) => m.tag === 'svg' && m.vb === `0 0 ${MARK.vbW} ${MARK.vbH}`);
  const imgs = (dom.media || []).filter((m) => m.tag === 'img').map((m) => ({ ...pick(m), alt: (m.alt || '').slice(0, 40), src: (m.src || '').split('/').pop(), complete: m.complete }));
  const plates = (dom.regions || []).filter((r) => /data-plate/.test(r.cls || '') || /inset-shadow-gold/.test(r.cls || ''));
  return {
    pageH: dom.pageHeight,
    paintedPct: dom.paintedPct, emptyRuns: dom.emptyRuns, emptyPct: dom.emptyRunPct,
    grid: grid ? pick(grid) : null,
    col: ps1 ? pick(ps1) : null,
    ps3: ps3 ? pick(ps3) : null,
    mark: mark ? { ...pick(mark), scale: +(mark.w / MARK.vbW).toFixed(3) } : null,
    imgs, plates: plates.map(pick),
    bands: (dom.surfaces || []).map((s) => ({ tag: s.tag, bg: s.bg, cls: (s.cls || '').slice(0, 34), ...pick(s) })),
  };
}

let fatal = null;
try {
  // [1] the page as it ships, and its section map.
  say('\n[1] the shipped page: geometry, gates, colour');
  runSpace(SPACE_WIDTHS);
  const base = boxes(JSON.parse(readFileSync(`${SCRATCH}/space-${SPACE_WIDTHS[0]}.json`, 'utf8')));
  report.pageMap = base.bands;
  report.baseline = { at: {}, gate: runGate(), color: runColor() };
  for (const w of SPACE_WIDTHS) report.baseline.at[w] = boxes(JSON.parse(readFileSync(`${SCRATCH}/space-${w}.json`, 'utf8')));
  const b0 = report.baseline.at[SPACE_WIDTHS[0]];
  say(`  page ${b0.pageH} at ${SPACE_WIDTHS[0]} · painted ${b0.paintedPct}% · ${b0.emptyRuns} empty runs over ${b0.emptyPct}% · gate ${report.baseline.gate.fails.length ? `${report.baseline.gate.fails.length} FAIL` : 'green'}`);
  say(`  bands: ${base.bands.map((s) => `${s.tag} ${s.h}@${s.y}`).join(' · ')}`);

  // [2] every plate this round needs, at its option's box, with the honest resolution number.
  say('\n[2] crop the licensed plates at each option\u2019s box (grill/plate-crop.mjs, the shipped recipe)');
  const uriFor = new Map(), altFor = new Map();
  report.plates = {};
  for (const o of options) {
    for (const p of o.plates) {
      const src = await plateSource(p.plate.id);
      const meta = await sharp(src).metadata();
      const buf = await cropFor(src, p.w, p.h);
      const file = `${SCRATCH}/plate-${p.key}-${p.w}x${p.h}.png`;
      writeFileSync(file, buf);
      const stats = await cropStats(buf, NAMED_CHROMA);
      report.plates[p.key] = {
        ...p, srcW: meta.width, srcH: meta.height, srcAspect: +(meta.width / meta.height).toFixed(3),
        keepPct: keepPct(meta.width / meta.height, p.w, p.h),
        // At 1x the band is painted `w` CSS px wide from a `srcW`-pixel scan. >1 is an upscale, and the archive
        // ladder stops at 1024, so a full-bleed option cannot be judged without this number.
        upscale: +(p.w / meta.width).toFixed(2),
        crop: stats, png: file,
      };
      uriFor.set(p.key, `data:image/png;base64,${buf.toString('base64')}`);
      altFor.set(p.key, `Detail of an engraving after ${p.plate.book}: ${p.where} (public domain, insideoutlibrary.com)`);
      say(`  ${p.key.padEnd(11)} ${p.w}x${p.h} — keeps ${report.plates[p.key].keepPct}% of the plate · source ${meta.width}x${meta.height} → ${report.plates[p.key].upscale >= 1 ? `upscaled ${report.plates[p.key].upscale}x` : `downscaled ${report.plates[p.key].upscale}x`} · paints ${stats.namedPct}% at chroma >= ${NAMED_CHROMA}`);
    }
  }

  // [3] one composition at a time.
  for (const [i, o] of options.entries()) {
    say(`\n[3.${i + 1}] ${o.name}`);
    const w0 = SPACE_WIDTHS[0];
    const c0 = b0.col;
    const ctx = {
      uri: (k) => uriFor.get(k), alt: (k) => altFor.get(k), boxes: b0,
      viewport: w0,
      // How far a box has to reach to touch the viewport edge, from the probe's own x/width — not a remembered
      // padding. A guessed bleed overflowed the page by 4px and the render gate failed the option for my mutation.
      bleed: c0 ? Math.round(w0 - (c0.x + c0.w)) : 0,
    };
    let html = original;
    if (o.inert) {
      html = html.replace('</head>', `<style id="r14-${o.id}">/* the incumbent: an inert marker, no rule, so this row is the shipped page */</style></head>`);
    } else {
      if (o.css) {
        const css = typeof o.css === 'function' ? o.css(ctx) : o.css;
        html = html.replace('</head>', `<style id="r14-${o.id}">${css}</style></head>`);
      }
      if (o.apply) html = o.apply(html, ctx);
    }
    if (html === original) throw new Error(`${o.id}: the mutation changed nothing — this measurement would describe the wrong page`);
    writeFileSync(PAGE, html);

    runSpace(SPACE_WIDTHS);
    const gate = runGate();
    const color = runColor();
    const at = {};
    for (const w of SPACE_WIDTHS) at[w] = boxes(JSON.parse(readFileSync(`${SCRATCH}/space-${w}.json`, 'utf8')));
    // A delta is always against the shipped page AT THE SAME WIDTH: round 13 printed one width's delta and the
    // ruling travelled with it (+0 at 1240 hid +314 at 390, D161).
    const d = (a, w) => { const x = (a.pageH ?? 0) - (report.baseline.at[w]?.pageH ?? 0); return `${x >= 0 ? '+' : ''}${x}`; };
    const shots = {};
    for (const w of SPACE_WIDTHS) {
      const full = `${SCRATCH}/page-${w}.png`;
      if (existsSync(full)) shots[w] = await scaleTo(full, `${SCRATCH}/scaled-${o.id}-${w}.png`, PAGE_SCALE);
      else report.notes.push(`${o.id} @${w}: the survey left no screenshot — no picture for this cell`);
    }
    // The detail crop's box, in order of preference: the hero grid, the media column, and — if a composition
    // stopped being a grid (option B sets display:block, and the survey collects grid/flex children by computed
    // display, so the grid disappears from `regions`) — the `main` surface the survey still measures. Which box was
    // used goes into the report, because a crop caption that does not name its box is a claim about a picture.
    const a0 = at[SPACE_WIDTHS[0]];
    const heroBox = a0.grid || a0.col || a0.bands.find((b) => b.tag === 'main');
    const cropOf = a0.grid ? 'the hero grid' : a0.col ? 'the media column' : heroBox ? 'the main surface (this option is not a grid)' : null;
    const detail = await cropBox(`${SCRATCH}/page-${SPACE_WIDTHS[0]}.png`, heroBox, `${SCRATCH}/hero-${o.id}.png`, { pad: 8, where: `${o.id}: the hero`, notes: report.notes });
    const detailScaled = detail ? await scaleTo(detail, `${SCRATCH}/hero-${o.id}-scaled.png`, DETAIL_SCALE) : null;
    const art = at[SPACE_WIDTHS[0]].imgs.filter((m) => /png|webp/.test(m.src || '')).length;
    report.options.push({ ...o, plates: o.plates.map((p) => p.key), at, gate, color, shots, detail: detailScaled, cropOf, delta: Object.fromEntries(SPACE_WIDTHS.map((w) => [w, d(at[w])])) });
    for (const w of SPACE_WIDTHS) say(`  @${String(w).padEnd(5)} page ${String(at[w].pageH).padEnd(5)} (${d(at[w], w)}) · painted ${at[w].paintedPct}% · empty ${at[w].emptyPct}% · imgs ${at[w].imgs.length} · mark ${at[w].mark?.w ?? '—'}`);
    say(`  gate ${gate.fails.length ? `${gate.fails.length} FAIL: ${gate.fails.slice(0, 2).join(' | ')}` : 'green'}${gate.gaps?.length ? ` (+${gate.gaps.length} unmeasured)` : ''} · colour >=${NAMED_CHROMA} ${color[1240]?.strongPct}% @1240, ${color[390]?.strongPct}% @390 · mark min stroke ${gate.minStrokePx ?? '?'}px`);
    writeFileSync(PAGE, original);
  }

  // [4] the shipped page gets its numbers back, so the scratch describes the tree.
  say('\n[4] re-measure the shipped page (the scratch left behind must describe the tree)');
  writeFileSync(PAGE, original);
  runSpace(SPACE_WIDTHS);
  report.shipped = boxes(JSON.parse(readFileSync(`${SCRATCH}/space-${SPACE_WIDTHS[0]}.json`, 'utf8')));
  report.shippedSiteFp = sha(readFileSync(PAGE, 'utf8'));

  // [5] the phone question, which round 13's desktop table could not show.
  if (only.length && !argv.includes('--phone')) {
    report.notes.push('phone: skipped in a subset run — the +314px question is a whole-page question, so it waits for a full run');
    say('\n[5] the phone question: skipped (subset run; pass --phone to measure it)');
  } else {
    say('\n[5] the phone question: full plate / shorter plate / no plate, at 390');
    const shipped = readFileSync(PAGE, 'utf8');
    report.phone = { states: [] };
    for (const st of PHONE_STATES) {
      let html = shipped;
      if (st.css) {
        // Scoped below `lg:` on purpose: the question is what a phone pays, and a rule that also fires at 1240
        // would measure a different desktop page and make the row a lie about the phone.
        const css = `@media (max-width: 1023.98px) { ${typeof st.css === 'function' ? st.css() : st.css} }`;
        html = html.replace('</head>', `<style id="r14-${st.id}">${css}</style></head>`);
      }
      if (html === shipped && st.id !== 'phone-full') throw new Error(`${st.id}: the mutation changed nothing`);
      writeFileSync(PAGE, html);
      phone.runSpace([390]);
      const at = boxes(JSON.parse(readFileSync(`${SCRATCH}/phone/space-390.json`, 'utf8')));
      const g = phone.runGate();
      const c = phone.runColor()[390];
      let shot = null;
      const full = `${SCRATCH}/phone/page-390.png`;
      if (existsSync(full)) shot = await scaleTo(full, `${SCRATCH}/phone-scaled-${st.id}.png`, PAGE_SCALE);
      const dv = at.pageH - report.baseline.at[390].pageH;
      // An option that paints the same page is not an answer. (b) did exactly this once — a stylesheet rule
      // losing to an inline aspect-ratio — and the run would have printed two identical photographs under two
      // different labels.
      if (st.css && dv === 0 && at.paintedPct === report.baseline.at[390].paintedPct) {
        throw new Error(`${st.id}: the mutation did not change the measured page at 390 (${at.pageH}, painted ${at.paintedPct}% — identical to shipped). A rule that loses to an inline style, or a selector that matched nothing, is not an answer to the question.`);
      }
      report.phone.states.push({ ...st, at: { 390: at }, gate: g, color: c, shot, delta: `${dv >= 0 ? '+' : ''}${dv}` });
      say(`  ${st.name}: page ${at.pageH} (${dv >= 0 ? '+' : ''}${dv} vs shipped) · painted ${at.paintedPct}% · gate ${g.fails.length ? `${g.fails.length} FAIL` : 'green'} · colour ${c?.strongPct}%`);
      writeFileSync(PAGE, shipped);
    }
  }
} catch (e) {
  fatal = e.message;
} finally {
  writeFileSync(PAGE, original);
}
if (fatal) {
  console.error(`\nround14 FAILED: ${fatal}`);
  console.error('the built page was restored; nothing in this round can reach a deploy (it mutates dist/ scratch only, and check:content fails any build carrying a placeholder).');
  process.exit(1);
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1) + '\n');
say(`\njson      ${OUT}/report.json (tracked — commit it with the round that cites it)`);
say(`evidence  ${SCRATCH}/ (gitignored: plates, full-page shots, per-option survey records)`);
if (report.notes.length) for (const n of report.notes) say(`note      ${n}`);
const { execFileSync } = await import('node:child_process');
try {
  execFileSync(process.execPath, ['design/grill/round14-build.mjs'], { stdio: 'inherit' });
} catch (e) {
  console.error(`the specimen builder did not run: ${(e.stderr || e.message || '').toString().slice(0, 400)}`);
  process.exit(1);
}
say(`round14: ${(Date.now() - started) / 1000}s`);
