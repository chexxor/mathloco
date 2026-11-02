#!/usr/bin/env node
// render-gate.mjs — do the ratified tokens survive contact with a real browser?
//
//   node design/render-gate.mjs            # '/', '/404' and '/chat' at 1240, 390, 320
//   node design/render-gate.mjs /chat      # one page
//   node design/render-gate.mjs --no-build # measure the dist that is already there (see below)
//   RENDER_JOBS=1 node design/render-gate.mjs   # serialize the firefox runs (default 4 at once)
//   RENDER_ATTEMPTS=1 ...                        # no retry on a firefox that posted nothing (default 2)
//
// This measures dist/client, not src — so by default it builds first (3.8 s) rather than let a green
// result stand for a page nobody rebuilt. `--no-build` skips that step when dist is already current,
// which is the case immediately after `npm run verify` (its last step is a build) and the case in
// `render-gate-selftest.mjs`, where a rebuild would wipe the mutation being tested. Measured here
// (16 CPU rig, Firefox 158.0.1, Linux): one page at one width 0.89 s; the 3 x 3 matrix serialized 8.0 s,
// with --no-build off 11.4 s total; the five-mutation selftest 4.6 s. So the browser gates are not
// expensive — what is expensive is a cold `astro build` on every repeat of the ritual.
//
// The scanner (npm run check:classes) proves a class NAME exists in markup and resolves through
// Tailwind. It cannot prove what that class BECAME. This gate measures the built page in Firefox and
// enforces the numeric claims DESIGN.md makes:
//
//   - a primary control is 48px tall (16px label line box + py-4 16/16), a secondary 40px (py-3),
//     so a control with no fill and a keyline cannot arrive at 42 — the border-the-height-arithmetic
//     problem ratify refused
//   - the contrast the oracle promised is the contrast that painted, on the page a visitor gets
//   - one dark band per screen (a footer + a dark CTA is two bands, which is what the old book-theme
//     ribbon produced), and that band must contain paths a visitor can press (D115)
//   - no keyline drawn as a border/outline (the ratified keyline is a 1px INSET ring, measured 3.01
//     against paper in this harness — the same number the specimen records; a border costs 2px, which
//     is how a 40px control arrives at 42)
//   - notices and states: every role=status/alert block has no fill, a 1px inset ring at the ratified
//     rule contrast, text at or above the 4.5 bar, and a height that clears D98's 48px one-line figure
//   - the nav: one row at every width, flex-wrap: nowrap, one type tier per viewport, and the row must
//     FIT the container's content box (D100's needed-vs-available probe, run on the built artifact).
//     The tier boundary, if there is one, is read from --breakpoint-nav-narrow so this gate cannot
//     drift from the CSS; that token is currently retired (D117), so the nav holds one tier everywhere.
//   - one display step per screen
//   - no horizontal overflow at any measured width, and tap targets that clear 44px at 390
//
// Default widths are 1240, 390 and 320 — the floor, and the two widths the design was grilled at.
//
// Contrast is measured on PAINTED BYTES (D116): the harness paints each computed colour into a 1px
// canvas and reads the byte back, because a screen is 8-bit and hand-written OKLab arithmetic read every
// pair 0.1-0.3 low (path-discord-on-ink read 4.47 against a true 4.59, which would have failed a token
// that passes). If a contrast number here ever disagrees with the oracle's record again, the harness is
// wrong, not the token.
//
// Each run also reports whether the webfonts had loaded. A serif line box measured while PT Serif is
// still loading is a fallback metric, so this shows up as a warning rather than a pass.
import { execFileSync, execFile } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MARK_SHAPE_COUNT } from '../src/lib/brand-mark.mjs';

// The site's FLOOR is 320px (D114, operator ruling 2026-11-02): the nav's narrow tier needs 273px and
// a 320 viewport's container offers 276 (288 on a page short enough not to scroll). Below 320 the
// grammar does not fit — at 310 the container offers 266 and at 300 it offers 256, and at 300 the hero
// primary also wraps to 64px. That is declared, not discovered: the alternative measured 254 (the mark
// down a tier), which fits 256 by 2px, and D100 keeps the mark at 16px serif at every width because the
// face is what carries the club's name. 300/310 are still worth looking at, so ask for them:
//   RENDER_WIDTHS=1240,390,375,360,320,310,300 node design/render-gate.mjs /
// They report the overflow instead of hiding it, and the gate refuses to run a default set that has
// quietly dropped the floor.
const FLOOR = 320;
const widths = (process.env.RENDER_WIDTHS || "1240,390,320").split(",").map(Number);
const argv = process.argv.slice(2);
const NO_BUILD = argv.includes('--no-build');
const JOBS = Math.max(1, Number(process.env.RENDER_JOBS || 4));
const pages = argv.filter((a) => a.startsWith('/'));
const routes = pages.length ? pages : ['/', '/404', '/chat'];
const dist = resolve('dist/client');
// the tier boundary is read out of the token block, not remembered: a moved --breakpoint-nav-narrow
// moves this gate with it instead of quietly disagreeing with the CSS
// The tier boundary is READ from the token block, never remembered, so this gate cannot drift from the
// CSS. It is now optional: the token was retired in D117 (the nav's two dead-path labels went, and the
// wide tier fits everywhere), and the gate honours either shape — one tier at every width, or a ratified
// --breakpoint-nav-narrow with a tier each side of it. The one shape it will not accept is an ad-hoc
// `min-[412px]:` bracket, because a bracket writes nothing that any gate reads.
const navTier = readFileSync('src/styles/global.css', 'utf8').match(/--breakpoint-nav-narrow:\s*(\d+)px/);
const NAV_NARROW = navTier ? Number(navTier[1]) : null;
if (process.env.RENDER_WIDTHS) {
  if (!widths.includes(FLOOR)) console.log(`NOTE  RENDER_WIDTHS overrides the default set and omits ${FLOOR} — the declared floor. The shipped gate must measure it.`);
} else if (!widths.includes(FLOOR)) {
  console.error(`the default width set no longer contains ${FLOOR} — the floor is a ratified claim (D114), so it has to stay gated`);
  process.exit(1);
}
if (!existsSync(dist)) { console.error('dist/client missing — run npm run build first'); process.exit(1); }
if (!NO_BUILD) {
  // the same script CI runs, so the gate cannot measure a build the pipeline would not make. npm is
  // npm.cmd on Windows, and this rig runs natively on both (D131).
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });
} else {
  console.log('(measuring the dist that is already built — --no-build)');
}
mkdirSync('.design/render', { recursive: true });

const fails = [];
const warns = [];
const num = (v) => (typeof v === 'number' ? v : NaN);

// The nine measurements are independent, and each one is a cold firefox: 0.89 s of its own, ~8 s back to
// back. They run JOBS at a time, and only the *measurement* is parallel — the assertions below still run
// one route and width at a time, in a fixed order, so the report and the failure list stay diffable.
// page-measure binds port 0 and dist-measure names each probe copy per width, so runs cannot collide.
const run = (route, width) => new Promise((done) => {
  const height = width === 390 ? 844 : 1400;
  execFile(process.execPath,
    ['design/grill/dist-measure.mjs', dist, route, 'design/grill/render-measure.js', String(width), String(height)],
    { encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 },
    (err, out, stderr) => done({ route, width, out, err, stderr }));
});

// A firefox that posts nothing is this harness's known flake (fresh profile, cold start, the page never
// calling __send()). One in nine showed up while timing this. A gate that flakes is a gate people learn
// to re-run instead of trust, so a cell gets a second attempt; two failures in a row is a real FAIL and
// the report says which it was.
const ATTEMPTS = Number(process.env.RENDER_ATTEMPTS || 2);
async function measureCell(route, width) {
  let last = null;
  for (let n = 1; n <= ATTEMPTS; n++) {
    const r = await run(route, width);
    const json = r.out ? r.out.slice(r.out.indexOf('{'), r.out.lastIndexOf('}') + 1) : '';
    if (json) {
      try { return { j: JSON.parse(json), tries: n }; }
      catch (e) { last = { err: e, stderr: r.stderr }; }
    } else {
      last = { err: r.err || new Error('no JSON from firefox'), stderr: r.stderr };
    }
    if (n < ATTEMPTS) console.error(`  retry ${route} @${width} — ${last.err && last.err.message ? String(last.err.message).slice(0, 60) : 'no report posted'}`);
  }
  const tail = (last.stderr || '').split('\n').filter(Boolean).slice(-2).join(' | ');
  return { err: new Error(`${last.err && last.err.message ? last.err.message : 'no report'}${tail ? ' :: ' + tail.slice(0, 160) : ''}`) };
}

async function pool(jobs, items, work) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await work(items[k]);
    }
  }));
  return out;
}

const cells = routes.flatMap((route) => widths.map((w) => [route, w]));
const got = new Map();
const raw = await pool(Math.min(JOBS, cells.length), cells, ([route, w]) => measureCell(route, w).then((r) => ({ route, width: w, ...r })));
for (const r of raw) {
  const at = `${r.route} @${r.width}`;
  if (r.err) { got.set(at, { err: r.err }); continue; }
  writeFileSync(`.design/render/${r.route.replace(/\//g, '_') || 'root'}-${r.width}.json`, JSON.stringify(r.j, null, 1));
  got.set(at, { j: r.j });
}

for (const route of routes) {
  for (const w of widths) {
    const cell = got.get(`${route} @${w}`);
    if (!cell || cell.err) { fails.push(`${route} @${w}: measurement failed — ${String(cell && cell.err ? cell.err.message : 'no run recorded').slice(0, 220)}`); continue; }
    const j = cell.j;
    const at = `${route} @${w}`;
    console.log(`\n=== ${at} (viewport ${j.vw}) ===`);

    if (j.overflowX) fails.push(`${at}: horizontal overflow by ${j.overflowX}px`);

    // 1. control height grammar
    for (const c of j.controls) {
      const cls = c.cls || '';
      if (/\bbg-ink\b/.test(cls) && !/\bbg-ink-2\b/.test(cls)) {
        if (num(c.h) < 47 || num(c.h) > 49) fails.push(`${at}: primary control "${c.t}" is ${c.h}px tall, not 48 — ${cls.slice(0, 60)}`);
      }
      if (/inset-shadow-rule/.test(cls)) {
        if (num(c.h) < 39 || num(c.h) > 41) fails.push(`${at}: secondary control "${c.t}" is ${c.h}px tall, not 40`);
      }
      if (c.contrast !== null && c.contrast < 4.5) fails.push(`${at}: control "${c.t}" contrast ${c.contrast} < 4.5 (${c.fg} on ${c.bg})`);
      if (w === 390 && /\bbg-ink\b|inset-shadow-rule|menu/i.test(cls) && num(c.h) < 44) fails.push(`${at}: tap target "${c.t}" is ${c.h}px tall, under 44`);
    }

    // 2. text contrast, on the page rather than in a specimen
    for (const t of j.text) {
      const fs = parseFloat(t.fs);
      const bar = fs >= 24 ? 3.0 : 4.5;
      if (t.contrast !== null && t.contrast < bar) fails.push(`${at}: ${t.tag} "${t.t}" at ${t.fs} is ${t.contrast} on its ground (bar ${bar})`);
    }

    // 3. one dark band per screen — and the band has to be an EXIT, not a poster. A band with no link
    //    in it is what the old footer was: a slogan with a pulsing glyph and nowhere to go (D115).
    if (j.bands.length > 1) fails.push(`${at}: ${j.bands.length} dark bands (want 1): ${j.bands.map((b) => b.tag + ':' + b.cls.slice(0, 28)).join(' | ')}`);
    for (const b of j.bands) {
      const links = b.links || [];
      if (!links.length) fails.push(`${at}: the dark band (${b.tag}) paints no path out — the band is the site's exit, it must offer the paths (D115)`);
      for (const l of links) {
        if (l.contrast !== null && l.contrast < 4.5) fails.push(`${at}: band link ${JSON.stringify(l.t)} is ${l.contrast} on the band (bar 4.5) — ${l.color}`);
        if (l.h < 24) fails.push(`${at}: band link ${JSON.stringify(l.t)} is ${l.h}px tall — 24px is the floor for a target a pointer must hit`);
      }
    }

    // 4. keylines: a painted border / outline / decoration line darker than a hairline. The ratified
    //    keyline is `inset-shadow-rule` — a 1px inset ring, measured 3.01 against paper in this same
    //    harness, which is the number the specimen records — and it costs no height. A BORDER at the
    //    same hue measures
    //    the same contrast and costs 2px, which is how a 40px control arrives at 42. So the bar here
    //    is about the grammar, not the hue: D105's 1.35 layer bar is for shadows.
    for (const k of j.keylines) {
      if (k.w >= 1 && k.keylineContrast !== null && k.keylineContrast > 1.4) {
        fails.push(`${at}: painted keyline ${k.w}px (contrast ${k.keylineContrast} on its ground) is a border/outline, not the 1px inset ring — ${k.cls.slice(0, 60)}`);
      }
    }

    // 4b. notices and states (DESIGN.md "Notices" + "States"): word + inset hairline on the page's own
    //     ground, NO fill, one-line 48px (D98), text at or above the contrast bar.
    for (const n of j.notices || []) {
      if (n.fill) fails.push(`${at}: ${n.role} block paints a fill (${n.fill}) — a notice is word + keyline, never a fill (D102)`);
      if (n.inset !== 1) fails.push(`${at}: ${n.role} block keyline is ${n.inset}px, want the 1px inset ring (inset-shadow-rule)`);
      if (n.keylineContrast !== null && Math.abs(n.keylineContrast - 3.01) > 0.2) {
        fails.push(`${at}: ${n.role} keyline contrast ${n.keylineContrast} is not the ratified rule (measured 3.01 on paper, 4.00 on the band)`);
      }
      if (n.textContrast !== null && n.textContrast < 4.5) fails.push(`${at}: ${n.role} text at contrast ${n.textContrast} is under the 4.5 bar`);
      if (n.h < 48) fails.push(`${at}: ${n.role} block is ${n.h}px tall — D98 puts a one-line notice at 48px`);
    }

    // 4c. nav (D100): one row at every width, `flex-wrap: nowrap`, one type tier per viewport, and
    //     the row must fit. The shipped nav was flex-col + flex-wrap and clipped links; a class grep
    //     cannot see that, row centres can.
    if (j.nav) {
      const wraps = j.nav.containers.map((c) => c.wrap).filter((x) => x !== 'nowrap');
      if (wraps.length) fails.push(`${at}: nav flex-wrap is ${wraps.join('/')} — D100 wants nowrap, so a label set that stops fitting fails this probe instead of re-wrapping`);
      const centres = j.nav.links.map((l) => l.cy);
      if (Math.max(...centres) - Math.min(...centres) > 1) fails.push(`${at}: nav links are not on one row (centres ${centres.join(', ')}) — D100 shape B is a single row`);
      const links = j.nav.links.slice(1);              // links[0] is the mark
      const tiers = new Set(links.map((l) => l.fs));
      if (tiers.size > 1) fails.push(`${at}: nav links mix ${tiers.size} type tiers (${[...tiers].join(', ')}) — one tier per viewport` + (NAV_NARROW === null ? ', and no --breakpoint-nav-narrow is declared: a second tier needs a ratified token, not a bracket (D117)' : ''));
      const want = NAV_NARROW === null ? '13.3px' : (w < NAV_NARROW ? '11.1px' : '13.3px');   // DESIGN.md's type table
      for (const l of links) if (l.fs !== want) fails.push(`${at}: nav link ${JSON.stringify(l.t)} renders ${l.fs} at ${w}px, want ${want}`);
      const right = Math.max(...j.nav.links.map((l) => l.right));
      if (right > j.vw) fails.push(`${at}: nav row reaches ${right}px on a ${j.vw}px viewport — the label set no longer fits (D100's probe)`);
      if (j.nav.row && j.nav.row.needed > j.nav.row.available + 0.5) {
        fails.push(`${at}: nav needs ${j.nav.row.needed}px, the container offers ${j.nav.row.available}px — D100's probe fails at this width (nowrap means it shows, it does not hide)`);
      }
      const small = j.nav.links.filter((l) => l.h < 32);
      if (small.length) fails.push(`${at}: ${small.length} nav target(s) under 32px tall (${small.map((l) => l.h).join(', ')}) — the accepted shape pads to 32 (D100 rejected the 13px summary target)`);
    } else {
      fails.push(`${at}: no <nav> in the page at all — the D100 width probe cannot run`);
    }

    // 5. one display step per screen
    const display = j.text.filter((t) => parseFloat(t.fs) >= 30);
    const steps = new Set(display.map((t) => t.fs));
    if (steps.size > 1) fails.push(`${at}: ${steps.size} display steps on one screen (${[...steps].join(', ')}): ${display.map((t) => t.tag + '“' + t.t.slice(0, 18) + '”').join(' | ')}`);
    if (display.length > 3) fails.push(`${at}: ${display.length} display-size elements on one screen (want at most 3)`);

    // 6. fonts
    const unloaded = (j.fonts || []).filter((f) => !/\bloaded\b/.test(f));
    // a ratified face that never loads is not a warning: it means every height below was measured in
    // the fallback stack (the url in src/styles/fonts.css moved, or the import went away)
    for (const fam of ["PT Serif", "Public Sans Variable"]) {
      const face = (j.fonts || []).find((f) => f.startsWith(fam));
      if (!face) fails.push(`${at}: no ${fam} face referenced by the page at all — the face import is gone`);
      else if (!/\bloaded\b/.test(face)) fails.push(`${at}: ${fam} never loaded (${face}) — heights below are fallback metrics`);
    }
    if (unloaded.length) warns.push(`${at}: ${unloaded.length} webface(s) not loaded at measure time: ${unloaded.slice(0, 3).join('; ')}${unloaded.length > 3 ? ' …' : ''} — serif metrics may be fallback`);
    const phantom = (j.text || []).filter((t) => /Inter var/.test(t.ff));
    if (phantom.length) warns.push(`${at}: ${phantom.length} text run(s) resolve through the phantom family "Inter var" — the faces batch has not landed`);

    // 7. drawn marks (D120): the hero's graphic is geometry, not bytes, so it is measured like every other
    //    claim this gate makes. Four failures are possible and only per-shape numbers separate them.
    if (route === '/' && !(j.marks || []).length) {
      fails.push(`${at}: the landing page draws no mark at all — the hero column's graphic IS the club's mark (D120); an empty column is a defect, not a blank`);
    }
    for (const m of j.marks || []) {
      const at2 = `${at} mark "${m.name}"`;
      if (m.count !== MARK_SHAPE_COUNT) fails.push(`${at2}: ${m.count} shape(s) in the document, the geometry table has ${MARK_SHAPE_COUNT} — an <svg> drops children whose subtree it treats as foreign content, without a word (D118 lesson 1)`);
      if (m.wantRatio && Math.abs(m.ratio - m.wantRatio) > 0.02 * m.wantRatio) fails.push(`${at2}: box is ${m.w}x${m.h} (ratio ${m.ratio}) but the viewBox says ${m.wantRatio} — an inline <svg> that loses its intrinsic ratio falls back to 300x150`);
      if (m.w < 40 || m.h < 20) fails.push(`${at2}: box is ${m.w}x${m.h} — the mark collapsed instead of scaling to its column`);
      if (m.role === 'img' && !m.label) fails.push(`${at2}: role="img" with no accessible name — it announces nothing`);
      if (!m.role && !m.hidden) fails.push(`${at2}: visible with no role and no aria-hidden — name it or hide it (the hero's old photo invented "Math Study Group Session", D120)`);
      for (const s of m.shapes) {
        const cands = [s.strokeContrast, s.fillContrast].filter((x) => x !== null);
        if (!cands.length) fails.push(`${at2}: <${s.tag}> painted nothing (stroke ${s.stroke}, fill ${s.fill}) — an unmapped colour role means no paint: ${s.cls}`);
        else {
          const best = Math.max(...cands);
          if (best < 3.0) fails.push(`${at2}: <${s.tag}> reads ${best} against its ground, under the 3.0 graphic bar (D101) — stroke ${s.stroke} / fill ${s.fill}`);
        }
        if (s.sw > 0 && s.swDevice < 1) fails.push(`${at2}: <${s.tag}> stroke lands at ${s.swDevice}px on screen (${s.sw} viewBox units at scale ${m.scale}) — under 1px it is a smudge with no measurable colour identity (D119's rule, applied to line art)`);
      }
    }

    console.log(`  controls ${j.controls.length} | bands ${j.bands.length} | keylines ${j.keylines.length} | notices ${(j.notices || []).length} | nav ${(j.nav?.links ?? []).length} | marks ${(j.marks || []).length} | shadows ${j.shadows.length} | text ${j.text.length}`);
    if (j.nav) console.log(`   nav   ${j.nav.links.map((l) => `${l.fs}/${l.h}px`).join(' ')}  wrap ${j.nav.containers.map((c) => c.wrap).join('/')} gap ${j.nav.containers.map((c) => c.gap).join('/')} needed ${j.nav.row?.needed} of ${j.nav.row?.available}`);
    for (const c of j.controls) {
      console.log(`   ctrl  ${String(c.h).padStart(5)}px ${c.fs.padEnd(6)} lh ${c.lh.padEnd(6)} ${String(c.contrast).padStart(6)}  ${c.tag} ${JSON.stringify(c.t).slice(0, 30)}  ${(c.cls || '').slice(0, 46)}`);
    }
    for (const t of j.text.filter((x) => parseFloat(x.fs) >= 30)) {
      console.log(`   disp  ${t.fs.padEnd(6)} lh ${t.lh.padEnd(7)} ${String(t.contrast).padStart(6)}  ${t.ff.padEnd(11)} ${t.tag} ${JSON.stringify(t.t).slice(0, 34)}`);
    }
    for (const k of [...new Map(j.keylines.map((k) => [k.w + k.raw + k.keylineContrast, k])).values()]) console.log(`   key   ${String(k.w).padStart(3)}px contrast ${String(k.keylineContrast).padStart(5)}  ${k.raw.padEnd(26)} ${(k.cls || '').slice(0, 40)}`);
    for (const n of j.notices || []) console.log(`   notc  ${String(n.h).padStart(5)}px x ${String(n.w).padStart(4)}px  inset ${n.inset}px contrast ${String(n.keylineContrast).padStart(5)}  text ${String(n.textContrast).padStart(5)}  ${n.role} ${JSON.stringify(n.text).slice(0, 34)}`);
    for (const b of j.bands) {
      console.log(`   band  ${String(b.h).padStart(5)}px  bg ${b.bg.padEnd(26)} fg ${b.fg.padEnd(24)} ${String(b.contrast).padStart(5)}  ${b.tag} ${(b.cls || '').slice(0, 40)}`);
      for (const l of b.links || []) console.log(`          link ${String(l.h).padStart(4)}px ${l.fs.padEnd(6)} ${String(l.contrast).padStart(6)}  ${JSON.stringify(l.t)}`);
    }
    for (const s of j.shadows) console.log(`   shdw  ${s.shadow.slice(0, 70)}  ${(s.cls || '').slice(0, 40)}`);
    for (const m of j.marks || []) {
      console.log(`   mark  ${m.name} ${m.w}x${m.h} at ${m.x},${m.y} (viewBox ${m.vbW}x${m.vbH}, scale ${m.scale}, shapes ${m.count}/${MARK_SHAPE_COUNT}, ratio ${m.ratio} vs ${m.wantRatio}) role="${m.role}" ${JSON.stringify(m.label)}`);
      for (const s of m.shapes) console.log(`         ${s.tag.padEnd(6)} sw ${String(s.sw).padStart(4)}u = ${String(s.swDevice).padStart(5)}px  stroke ${String(s.strokeContrast).padStart(6)} fill ${String(s.fillContrast).padStart(6)}  ${(s.stroke !== 'none' ? s.stroke : s.fill).padEnd(24)} ${s.cls.slice(0, 24)}`);
    }
  }
}

console.log('');
for (const w of warns) console.log('WARN  ' + w);
if (fails.length === 0) {
  console.log(`\nRENDER GATE: PASS (${routes.length} route(s) x ${widths.length} width(s))`);
  process.exit(0);
}
console.log(`\nRENDER GATE: ${fails.length} FAILING CHECK(S)`);
for (const f of fails) console.log('FAIL  ' + f);
process.exit(1);
