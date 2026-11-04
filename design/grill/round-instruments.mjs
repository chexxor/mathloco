// round-instruments.mjs — the measuring hands a design round borrows, in one place.
//
// Why a module: `design/round13.mjs` grew these inline, and round 14 needs the same hands on the same built
// page. Two copies is how `plate-crop.mjs` came to exist (a review crop and a shipped asset that had silently
// diverged), and a round's *instrument* drifting is worse than a crop drifting: the second round would print
// verdicts that CI cannot reproduce. So both rounds call these, and the FAILs stay the gates' own rules —
// `runGate` is `check:render` as CI runs it, never a private approximation of it.
//
// What lives here and what does not: the probes, the crop, and the byte census are shared. The **boxes** a
// round asks about (PS-1, the schedule card, a section band) stay in that round, because they are what that
// round is *about*, and matching them is a per-page judgement, not a general instrument.
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { oklchFromRgb } from './okcolor.mjs';

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts });

/**
 * One firefox probe, retried, with the reason surviving into the error.
 *
 * This harness has a known flake: `firefox --headless --screenshot` **ends the page when it paints**, so a probe
 * that waits after paint (fonts, `img.decode()`) can lose its POST and the caller sees "the page never posted".
 * The surveys that survive it (`whitespace-survey.mjs`, `check:render`) all retry the whole load. A bare call
 * used to take a round down with a node stack trace, which hid the one line that named the cause (D160).
 */
export function probeRetry(args, label, attempts = Number(process.env.PROBE_ATTEMPTS ?? 3)) {
  let last = '';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return sh(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) {
      const err = String(e.stderr || e.message);
      const named = err.match(/TIMEOUT[^\n]*|no page for route[^\n]*|ENOENT[^\n]*|Expected [^\n]*/g) || [];
      last = named.join(' | ') || err.split('\n').filter(Boolean).slice(-2).join(' | ');
      if (attempt === attempts) throw new Error(`${label}: ${last}`);
    }
  }
  throw new Error(`${label}: unreachable`);
}

/**
 * One box out of one screenshot, at 1:1 device pixels. Every picture a round prints goes through here, so
 * "this image is the box the probe reported" is a property of the code rather than of a caption (D160).
 * Boxes round outward to whole pixels: sharp's `extract` refuses fractional ones, and shaving the edge the
 * probe is measuring is worse than a pixel of slack.
 */
export async function cropBox(png, box, file, { pad = 12, where, notes = [] } = {}) {
  if (!existsSync(png) || !box) {
    notes.push(`${where}: no shot or no measured box — no picture for this one`);
    return null;
  }
  const meta = await sharp(png).metadata();
  const left = Math.max(0, Math.floor(box.x - pad)), top = Math.max(0, Math.floor(box.y - pad));
  const width = Math.min(meta.width - left, Math.ceil(box.x + box.w + pad) - left);
  const height = Math.min(meta.height - top, Math.ceil(box.y + box.h + pad) - top);
  if (width < 50 || height < 50) {
    notes.push(`${where}: box ${width}x${height} inside a ${meta.width}x${meta.height} shot — refusing to crop a box the shot does not hold`);
    return null;
  }
  await sharp(png).extract({ left, top, width, height }).png({ effort: 8 }).toFile(file);
  return file;
}

/** Downscale a whole page shot to one display factor, so options can be compared as compositions, not as sizes. */
export async function scaleTo(png, file, factor) {
  const meta = await sharp(png).metadata();
  await sharp(png).resize({ width: Math.round(meta.width * factor), height: Math.round(meta.height * factor) })
    .png({ effort: 8 }).toFile(file);
  const out = await sharp(file).metadata();
  return { file, from: `${meta.width}x${meta.height}`, to: `${out.width}x${out.height}`, factor };
}

/**
 * Byte census of an image: what share of it is colour a reader would name, how much is ink, and which hue
 * family carries the colour. Same 0.08 chroma bar `design/color-survey.mjs` reports and record 0023 priced
 * art against, so a crop's number and a page's number are the same bar.
 */
export async function cropStats(buf, namedChroma = 0.08) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels, n = info.width * info.height;
  let named = 0, ink = 0, Lsum = 0;
  const fam = new Map();
  for (let i = 0; i < data.length; i += ch) {
    const { L, C, h } = oklchFromRgb(data[i], data[i + 1], data[i + 2]);
    Lsum += L; if (L < 0.35) ink++;
    if (C >= namedChroma) {
      named++;
      const k = Math.floor(h / 30) * 30;
      const e = fam.get(k) || { n: 0, hs: 0, cs: 0 };
      e.n++; e.hs += h; e.cs += C;
    }
  }
  const top = [...fam].sort((a, b) => b[1].n - a[1].n)[0];
  return {
    w: info.width, h: info.height,
    namedPct: +(100 * named / n).toFixed(2), inkPct: +(100 * ink / n).toFixed(2), meanL: +(Lsum / n).toFixed(3),
    fam: top ? { share: +(100 * top[1].n / n).toFixed(2), hue: Math.round(top[1].hs / top[1].n), chroma: +(top[1].cs / top[1].n).toFixed(3) } : null,
  };
}

/**
 * The gates a composition round argues with, run exactly as CI runs them.
 *
 * @param o.scratch     where to copy the surveys' records (their own paths are fixed and get overwritten)
 * @param o.gateWidths  the matrix `check:render` runs; keep the ratified one unless the question is width-scoped
 * @param o.notes       the round's notes array: a cell the browser never posted is a GAP, never a design FAIL
 * @param o.colorWidths widths for the colour census
 */
export function makeInstruments({ scratch, renderDir = '.design/render', gateWidths = [1240, 640, 390, 320], colorWidths = [1240], notes = [] }) {
    // A survey step, retried. `check:space`, `check:color` and `check:render` each drive firefox, and this harness's
  // known flake is a page that paints and never posts — which surfaces as a TIMEOUT in the survey's own child
  // process, so the retry has to wrap the whole step, not just the probe. Measured 2026-11-03: a colour survey
  // inside round 14 hit it once in about twenty runs, and a design round that dies at its 20th measurement is a
  // round nobody re-runs.
  function step(label, fn, attempts = Number(process.env.STEP_ATTEMPTS ?? 3)) {
    let last = null;
    for (let i = 1; i <= attempts; i++) {
      try { return fn(); }
      catch (e) {
        const err = `${(e.stderr && Buffer.isBuffer(e.stderr) ? e.stderr.toString() : (e.stderr || ''))}${e.message || ''}`;
        const flaky = /TIMEOUT|never posted|measurement failed/i.test(err);
        last = e;
        const tail = err.split(String.fromCharCode(10)).filter(Boolean).slice(-2).join(' | ');
        if (!flaky || i === attempts) throw new Error(`${label}${flaky ? ` (firefox posted nothing after ${attempts} attempts)` : ''}: ${tail}`);
        notes.push(`${label}: the browser posted nothing on attempt ${i}; retried`);
      }
    }
    throw last;
  }

  /** check:space on the current dist, with its records and shots copied out of the shared scratch paths. */
  function runSpace(widths) {
    step(`check:space @${widths.join('/')}`, () =>
      sh('node', ['design/whitespace-survey.mjs', '--routes', '/', '--widths', ...widths.map(String)], { stdio: 'pipe' }));
    for (const w of widths) {
      copyFileSync(`.design/tmp-whitespace/space-root-${w}.json`, `${scratch}/space-${w}.json`);
      const png = `${renderDir}/space-root-${w}.png`;
      if (existsSync(png)) copyFileSync(png, `${scratch}/page-${w}.png`);
    }
  }

  /** check:render — the gate that produced seven painted-stroke FAILs on the placeholder state (D158). */
  function runGate() {
    let out = '', code = 0;
    const env = { ...process.env, RENDER_WIDTHS: gateWidths.join(','), RENDER_ATTEMPTS: process.env.RENDER_ATTEMPTS || '3' };
    // The gate already retries its own cells (RENDER_ATTEMPTS); this catches the whole-step failure mode where it
    // exits 1 without producing a report at all.
    try { out = step('check:render', () => sh('node', ['design/render-gate.mjs', '--no-build', '/'], { env, stdio: 'pipe' })); }
    catch (e) { out = (e.stdout || '') + (e.stderr || '') + (e.message || ''); code = e.status ?? 1; }
    if (!/breakpoints in use:/.test(out)) throw new Error(`check:render produced no report: ${out.slice(0, 400)}`);
    const all = out.split('\n').filter((l) => /^\s*FAIL\b/.test(l)).map((l) => l.trim());
    const gaps = all.filter((l) => /measurement failed|no report posted/i.test(l));
    const fails = all.filter((l) => !gaps.includes(l));
    if (gaps.length) notes.push(`the gate got no verdict for: ${gaps.map((g) => g.replace(/^FAIL\s+/, '')).join('; ')} — the browser posted nothing after ${process.env.RENDER_ATTEMPTS || 3} attempts, so that cell is unmeasured, not failing`);
    const markLine = (out.split('\n').find((l) => /^\s*mark\s+hero/.test(l)) || '').trim();
    const mb = markLine.match(/mark\s+hero\s+([\d.]+)x([\d.]+)/);
    const strokes = [...out.matchAll(/(\d+(?:\.\d+)?)u\s*=\s*(\d+(?:\.\d+)?)px/g)].map((m) => +m[2]);
    return {
      code, fails, gaps, markLine, widths: gateWidths,
      markBox: mb ? { w: +mb[1], h: +mb[2] } : null,
      minStrokePx: strokes.length ? Math.min(...strokes) : null,
    };
  }

  /** check:color — what art costs the palette, off the bytes the browser painted. */
  function runColor() {
    step(`check:color @${colorWidths.join('/')}`, () =>
      sh('node', ['design/color-survey.mjs', '--routes', '/', '--widths', ...colorWidths.map(String)], { stdio: 'pipe' }));
    const out = {};
    for (const w of colorWidths) {
      const j = JSON.parse(readFileSync(`.design/tmp-color/survey-root-${w}.json`, 'utf8'));
      out[w] = { strongPct: j.strongPct, chromaticPct: j.chromaticPct, faintPct: j.faintPct, paintedPct: j.paintedPct, pageHeight: j.pageHeight, hueFamilies: j.hueFamilies };
    }
    return out;
  }

  return { runSpace, runGate, runColor };
}
