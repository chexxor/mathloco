#!/usr/bin/env node
// round18.mjs — grill round 18 in one command: the CURRENT landing page under each composition, measured by
// the gates CI runs, and photographed whole at one scale so the operator can answer by looking (D160).
//
//   npm run round18                        every option + the phone question
//   npm run round18 -- band-pays-less      a subset, by id (the phone question is skipped, and the specimen says so)
//   npm run round18 -- --widths 1240 390   fewer geometry widths while iterating
//
// Why this round is numbered 18. Rounds 13 and 14 are settled questions, and both now say so themselves:
// `npm run round13` is retired, and `npm run round14` throws on foot — its own guard refuses any option that
// would insert a band, because this page carries `data-slot="PS-5"`. Rounds 15 (vertical rhythm), 16 (the club
// name / "Book") and 17 (the header bar) are taken, in tracked files and in package.json. Plan ids are
// append-only and never renumbered, so the next free round id is 18 and the letter's "round 15" is recorded
// as a contradiction rather than honoured by overwriting the rhythm round (D426).
//
// What it does, in order:
//   1. measures the shipped page — no placeholder overlay, since the state under test is the state that ships —
//      and reads its section map, so every box below comes from a probe rather than from memory;
//   2. per option: mutate `dist/client/index.html` (a `<style>` block, DOM moves, plates planted as `data:`
//      URIs cropped by `grill/plate-crop.mjs` — the shipped recipe), then run `check:space` at four widths,
//      `check:render` on its ratified matrix, and `check:color` at 1240/390, and take the survey's own whole-page
//      screenshot out of the same load. No new gate logic anywhere: a FAIL is the gate's own rule, so a specimen
//      can never disagree with CI;
//   3. restore the page and re-measure the shipped build, so the scratch left behind describes the tree;
//   4. measure the phone question at 390, which is where a desktop delta has lied before (D161: "+0" at 1240
//      hid "+314px" at 390);
//   5. write `design/grill/round18/report.json`, then generate the specimen from it. The builder reads the
//      report and throws on a missing lookup: nothing in the specimen is typed by hand.
//
// A mutation that changes nothing THROWS (except the incumbent, which plants an inert marker and says so) — a
// rule that loses to an inline style, or a selector that matched nothing, is not an answer to the question.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { OPTIONS, PHONE_STATES } from './grill/round18-options.mjs';
import { plateSource, cropFor, keepPct } from './grill/plate-crop.mjs';
import { cropBox, cropStats, makeInstruments, scaleTo } from './grill/round-instruments.mjs';
import { LOGO } from '../src/lib/logo.mjs';

const SCRATCH = '.design/tmp-round18';
const ART = '.design/tmp-art';
const PAGE = 'dist/client/index.html';
const OUT = 'design/grill/round18';

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

if (!existsSync(PAGE)) { console.error('round18: dist/client/index.html missing — run npm run build first'); process.exit(1); }
try {
  const { distState, staleLine } = await import('./dist-fresh.mjs');
  const st = distState();
  if (!st.fresh && !st.allowed) { console.error(`round18: ${staleLine(st)}`); process.exit(1); }
} catch (e) { console.error(`round18: the dist freshness check did not run: ${e.message}`); process.exit(1); }

const unknown = only.filter((id) => !OPTIONS.some((o) => o.id === id));
if (unknown.length) { console.error(`unknown option(s): ${unknown.join(', ')}\nknown: ${OPTIONS.map((o) => o.id).join(' ')}`); process.exit(1); }
const options = only.length ? OPTIONS.filter((o) => only.includes(o.id)) : OPTIONS;

mkdirSync(SCRATCH, { recursive: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(`${ART}/img`, { recursive: true });

const report = { measuredAt: new Date().toISOString(), widths: SPACE_WIDTHS, notes: [], options: [] };
const { runSpace, runGate, runColor } = makeInstruments({ scratch: SCRATCH, gateWidths: GATE_WIDTHS, colorWidths: [1240, 390], notes: report.notes });
mkdirSync(`${SCRATCH}/phone`, { recursive: true });
const phone = makeInstruments({ scratch: `${SCRATCH}/phone`, gateWidths: [390, 320], colorWidths: [390], notes: report.notes });

const original = readFileSync(PAGE, 'utf8');
report.siteFp = sha(original);

/** Boxes this round asks about, from one probe record — matched by what the page NAMES, never by styling. */
function boxes(dom) {
  const slot = (name) => dom.slots.find((s) => s.dataSlot === name);
  const ps1 = slot('PS-1'), ps3 = slot('PS-3'), ps5 = slot('PS-5');
  const grid = dom.regions.find((r) => /lg:grid lg:grid-cols-12/.test(r.cls || ''));
  const mark = dom.media.find((m) => m.tag === 'svg' && m.vb === `0 0 ${LOGO.vbW} ${LOGO.vbH}`);
  const imgs = (dom.media || []).filter((m) => m.tag === 'img').map((m) => ({ ...pick(m), alt: (m.alt || '').slice(0, 40), src: (m.src || '').split('/').pop(), complete: m.complete }));
  return {
    pageH: dom.pageHeight,
    paintedPct: dom.paintedPct, emptyRuns: dom.emptyRuns, emptyPct: dom.emptyRunPct,
    grid: grid ? pick(grid) : null,
    col: ps1 ? pick(ps1) : null,
    ps3: ps3 ? pick(ps3) : null,
    band: ps5 ? pick(ps5) : null,
    mark: mark ? { ...pick(mark), scale: +(mark.w / LOGO.vbW).toFixed(3) } : null,
    imgs,
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
  say(`  slots: PS-1 ${base.col ? `${base.col.w}x${base.col.h} @${base.col.y}` : '—'} · PS-5 ${base.band ? `${base.band.w}x${base.band.h} @${base.band.y}` : '—'} · PS-3 ${base.ps3 ? `${base.ps3.w}x${base.ps3.h}` : 'not measured'}`);

  // [2] the same fail-fast round 13 and 14 have, updated to what THIS page ships: options are proposals about
  // surfaces that exist. If the band is gone, or PS-3 already paints, the row that moves or fills it would price
  // a page that does not exist, and the table would silently stop meaning what its header says.
  const shippedBand = /data-slot="PS-5"/.test(original);
  const shippedPs3 = /<div data-slot="PS-3">[^<]/.test(original);
  for (const o of options) {
    if (!shippedBand && ['plate-closes-the-page', 'band-pays-less'].includes(o.id))
      throw new Error(`this page carries no PS-5 band, so "${o.id}" is not a proposal any more — it would price a band that is not on the page`);
    if (shippedPs3 && o.id === 'reserved-slot-gets-a-plate')
      throw new Error(`PS-3 already paints something at this state, so "${o.id}" is not a proposal any more — the reserved-slot question is answered and this round would price a second plate beside it`);
  }

  say('\n[2] crop the licensed plates at each option\u2019s box (grill/plate-crop.mjs, the shipped recipe)');
  const uriFor = new Map(), altFor = new Map();
  report.plates = {};
  for (const o of options) {
    for (const p of o.plates) {
      const src = await plateSource(p.plate.id);
      const meta = await sharp(src).metadata();
      const buf = await cropFor(src, p.w, p.h, { capWidth: Math.min(p.w * 2, meta.width) });
      const file = `${SCRATCH}/plate-${p.key}-${p.w}x${p.h}.png`;
      writeFileSync(file, buf);
      const stats = await cropStats(buf, NAMED_CHROMA);
      report.plates[p.key] = {
        ...p, srcW: meta.width, srcH: meta.height, srcAspect: +(meta.width / meta.height).toFixed(3),
        keepPct: keepPct(meta.width / meta.height, p.w, p.h),
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
      bleed: c0 ? Math.round(w0 - (c0.x + c0.w)) : 0,
    };
    let html = original;
    if (o.inert) {
      html = html.replace('</head>', `<style id="r18-${o.id}">/* the incumbent: an inert marker, no rule, so this row is the shipped page */</style></head>`);
    } else {
      if (o.css) {
        const css = typeof o.css === 'function' ? o.css(ctx) : o.css;
        html = html.replace('</head>', `<style id="r18-${o.id}">${css}</style></head>`);
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
    const d = (a, w) => {
      const b = report.baseline.at[w]?.pageH;
      if (!(b > 0)) throw new Error(`no shipped page height at ${w} - cannot state a delta for ${a?.id ?? 'an option'}`);
      if (a?.pageH == null) throw new Error(`no measured page height at ${w} - cannot state a delta`);
      const x = a.pageH - b;
      return `${x >= 0 ? '+' : ''}${x}`;
    };
    // A rule that matched nothing, or lost to a more specific shipped rule, is not an answer to the question —
    // and it looks exactly like a plausible design from the outside. Round 18's option E printed +0 at all four
    // widths for that reason (`[class~="horizon__plate"]` is (0,1,0); the shipped cap is (0,2,0)), and the phone
    // state with the same selector threw on byte-identical numbers. So: a non-inert option that leaves every
    // aggregate alone must SAY why it is allowed to, or this run stops.
    const same = SPACE_WIDTHS.every((w) =>
        at[w].pageH === report.baseline.at[w].pageH && at[w].paintedPct === report.baseline.at[w].paintedPct
        && at[w].emptyPct === report.baseline.at[w].emptyPct && at[w].emptyRuns === report.baseline.at[w].emptyRuns)
      && at[SPACE_WIDTHS[0]].imgs.length === b0.imgs.length && at[SPACE_WIDTHS[0]].mark?.w === b0.mark?.w;
    if (same && !o.inert) {
      if (!o.unchangedOk) throw new Error(`${o.id}: every measured aggregate is identical to the shipped page at all ${SPACE_WIDTHS.length} widths — a selector that matched nothing, or lost to a more specific shipped rule, is not an answer. Check the specificity (an attribute selector is one class-level: .x[a] is (0,2,0), [class~="x"] is (0,1,0)), or declare unchangedOk: '<reason>' if this option is meant to leave the aggregates alone.`);
      report.notes.push(`${o.id}: every aggregate is identical to shipped by construction (${o.unchangedOk}) — the whole-page photographs are the evidence for this row, not the table`);
    }
    const shots = {};
    for (const w of SPACE_WIDTHS) {
      const full = `${SCRATCH}/page-${w}.png`;
      if (existsSync(full)) shots[w] = await scaleTo(full, `${SCRATCH}/scaled-${o.id}-${w}.png`, PAGE_SCALE);
      else report.notes.push(`${o.id} @${w}: the survey left no screenshot — no picture for this cell`);
    }
    // The detail crop is the hero grid: the whole-page strip is where a band question is answered, the crop is
    // where the fold is. Which box was used goes into the report, because a crop caption that does not name its
    // box is a claim about a picture (round 14 mislabelled every crop this way once).
    const a0 = at[SPACE_WIDTHS[0]];
    const heroBox = a0.grid || a0.col || a0.bands.find((s) => s.tag === 'main');
    const cropOf = a0.grid ? 'the hero grid' : a0.col ? 'the media column' : heroBox ? 'the main surface (this option is not a grid)' : null;
    const detail = await cropBox(`${SCRATCH}/page-${SPACE_WIDTHS[0]}.png`, heroBox, `${SCRATCH}/hero-${o.id}.png`, { pad: 8, where: `${o.id}: the hero`, notes: report.notes });
    const detailScaled = detail ? { ...(await scaleTo(detail, `${SCRATCH}/hero-${o.id}-scaled.png`, DETAIL_SCALE)), at: SPACE_WIDTHS[0], cropOf } : null;
    report.options.push({
      ...o, plates: o.plates.map((p) => p.key), at, gate, color, shots, detail: detailScaled, cropOf,
      delta: Object.fromEntries(SPACE_WIDTHS.map((w) => [w, d(at[w], w)])),
    });
    for (const w of SPACE_WIDTHS) say(`  @${String(w).padEnd(5)} page ${String(at[w].pageH).padEnd(5)} (${d(at[w], w)}) · painted ${at[w].paintedPct}% · empty ${at[w].emptyPct}% · imgs ${at[w].imgs.length} · mark ${at[w].mark?.w ?? '—'}`);
    say(`  gate ${gate.fails.length ? `${gate.fails.length} FAIL: ${gate.fails.slice(0, 2).join(' | ')}` : 'green'}${gate.gaps?.length ? ` (+${gate.gaps.length} unmeasured)` : ''} · colour >=${NAMED_CHROMA} ${color[1240]?.strongPct}% @1240, ${color[390]?.strongPct}% @390 · mark min stroke ${gate.minStrokePx ?? '?'}`);
    writeFileSync(PAGE, original);
  }

  // [4] the shipped page gets its numbers back, so the scratch describes the tree.
  say('\n[4] re-measure the shipped page (the scratch left behind must describe the tree)');
  writeFileSync(PAGE, original);
  runSpace(SPACE_WIDTHS);
  report.shipped = boxes(JSON.parse(readFileSync(`${SCRATCH}/space-${SPACE_WIDTHS[0]}.json`, 'utf8')));
  report.shippedSiteFp = sha(readFileSync(PAGE, 'utf8'));
  if (report.shippedSiteFp !== report.siteFp) {
    report.notes.push(`the shipped page at the end of the run is not the page at the start (${report.siteFp} -> ${report.shippedSiteFp}) — something in this round did not restore, and the numbers above describe a page that no longer exists`);
    say(`  note: the restore did not return the same bytes (${report.siteFp} -> ${report.shippedSiteFp})`);
  }

  // [5] the phone question.
  if (only.length && !argv.includes('--phone')) {
    report.notes.push('phone: skipped in a subset run — the phone column is a whole-page question, so it waits for a full run');
    say('\n[5] the phone question: skipped (subset run; pass --phone to measure it)');
  } else {
    say('\n[5] the phone question: what 390 pays for the band, on the shipped page');
    const shipped = readFileSync(PAGE, 'utf8');
    report.phone = { states: [] };
    for (const st of PHONE_STATES) {
      let html = shipped;
      if (st.css) {
        const css = `@media (max-width: 1023.98px) { ${typeof st.css === 'function' ? st.css() : st.css} }`;
        html = html.replace('</head>', `<style id="r18-${st.id}">${css}</style></head>`);
      }
      if (html === shipped && st.id !== 'phone-shipped') throw new Error(`${st.id}: the mutation changed nothing`);
      writeFileSync(PAGE, html);
      phone.runSpace([390]);
      const at = boxes(JSON.parse(readFileSync(`${SCRATCH}/phone/space-390.json`, 'utf8')));
      const g = phone.runGate();
      const c = phone.runColor()[390];
      let shot = null;
      const full = `${SCRATCH}/phone/page-390.png`;
      if (existsSync(full)) shot = await scaleTo(full, `${SCRATCH}/phone-scaled-${st.id}.png`, PAGE_SCALE);
      const dv = at.pageH - report.baseline.at[390].pageH;
      if (st.css && dv === 0 && at.paintedPct === report.baseline.at[390].paintedPct) {
        throw new Error(`${st.id}: the mutation did not change the measured page at 390 (${at.pageH}, painted ${at.paintedPct}% — identical to shipped). A rule that loses to an inline style, or a selector that matched nothing, is not an answer.`);
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
  console.error(`\nround18 FAILED: ${fatal}`);
  console.error('the built page was restored; nothing in this round can reach a deploy (it mutates dist/ scratch only, and check:content fails any build carrying a placeholder).');
  process.exit(1);
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1) + '\n');
say(`\njson      ${OUT}/report.json (tracked — commit it with the round that cites it)`);
say(`evidence  ${SCRATCH}/ (gitignored: plates, full-page shots, per-option survey records)`);
if (report.notes.length) for (const n of report.notes) say(`note      ${n}`);
const { execFileSync } = await import('node:child_process');
try {
  execFileSync(process.execPath, ['design/grill/round18-build.mjs'], { stdio: 'inherit' });
} catch (e) {
  console.error(`the specimen builder did not run: ${(e.stderr || e.message || '').toString().slice(0, 400)}`);
  process.exit(1);
}
say(`round18: ${(Date.now() - started) / 1000}s`);
