#!/usr/bin/env node
// render-gate.mjs — do the ratified tokens survive contact with a real browser?
//
//   node .design/render-gate.mjs            # '/', '/404' and '/chat' at 1240 and 390
//   node .design/render-gate.mjs /chat      # one page
//
// Run `npm run build` first: this measures dist/client, not src.
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
//     ribbon produced)
//   - no keyline darker than --color-rule (1.27 against paper); D105's 1.35 layer bar with a hair of
//     float tolerance, because Firefox composites oklch and the last digit moves
//   - one display step per screen
//   - no horizontal overflow at either width, and tap targets that clear 44px at 390
//
// Each run also reports whether the webfonts had loaded. A serif line box measured while PT Serif is
// still loading is a fallback metric, so this shows up as a warning rather than a pass.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const widths = (process.env.RENDER_WIDTHS || "1240,390").split(",").map(Number);
const pages = process.argv.slice(2).filter((a) => a.startsWith('/'));
const routes = pages.length ? pages : ['/', '/404', '/chat'];
const dist = resolve('dist/client');
if (!existsSync(dist)) { console.error('dist/client missing — run npm run build first'); process.exit(1); }
mkdirSync('.design/render', { recursive: true });

const fails = [];
const warns = [];
const num = (v) => (typeof v === 'number' ? v : NaN);

function measure(route, width) {
  const height = width === 390 ? 844 : 1400;
  const out = execFileSync(process.execPath,
    ['.design/grill/dist-measure.mjs', dist, route, '.design/grill/render-measure.js', String(width), String(height)],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000 });
  const json = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1);
  if (!json) throw new Error(`no JSON from firefox for ${route} @ ${width}`);
  const j = JSON.parse(json);
  writeFileSync(`.design/render/${route.replace(/\//g, '_') || 'root'}-${width}.json`, JSON.stringify(j, null, 1));
  return j;
}

for (const route of routes) {
  for (const w of widths) {
    let j;
    try { j = measure(route, w); }
    catch (e) { fails.push(`${route} @${w}: measurement failed — ${String(e.message).slice(0, 120)}`); continue; }
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

    // 3. one dark band per screen
    if (j.bands.length > 1) fails.push(`${at}: ${j.bands.length} dark bands (want 1): ${j.bands.map((b) => b.tag + ':' + b.cls.slice(0, 28)).join(' | ')}`);

    // 4. keylines within the layer bar
    for (const k of j.keylines) {
      if (k.w >= 1 && k.keylineContrast !== null && k.keylineContrast > 1.4) {
        fails.push(`${at}: keyline ${k.w}px at contrast ${k.keylineContrast} on its ground is darker than --color-rule (1.27) — ${k.cls.slice(0, 60)}`);
      }
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

    console.log(`  controls ${j.controls.length} | bands ${j.bands.length} | keylines ${j.keylines.length} | shadows ${j.shadows.length} | text ${j.text.length}`);
    for (const c of j.controls) {
      console.log(`   ctrl  ${String(c.h).padStart(5)}px ${c.fs.padEnd(6)} lh ${c.lh.padEnd(6)} ${String(c.contrast).padStart(6)}  ${c.tag} ${JSON.stringify(c.t).slice(0, 30)}  ${(c.cls || '').slice(0, 46)}`);
    }
    for (const t of j.text.filter((x) => parseFloat(x.fs) >= 30)) {
      console.log(`   disp  ${t.fs.padEnd(6)} lh ${t.lh.padEnd(7)} ${String(t.contrast).padStart(6)}  ${t.ff.padEnd(11)} ${t.tag} ${JSON.stringify(t.t).slice(0, 34)}`);
    }
    for (const k of [...new Map(j.keylines.map((k) => [k.w + k.raw + k.keylineContrast, k])).values()]) console.log(`   key   ${String(k.w).padStart(3)}px contrast ${String(k.keylineContrast).padStart(5)}  ${k.raw.padEnd(26)} ${(k.cls || '').slice(0, 40)}`);
    for (const b of j.bands) console.log(`   band  ${String(b.h).padStart(5)}px  bg ${b.bg.padEnd(26)} fg ${b.fg.padEnd(24)} ${String(b.contrast).padStart(5)}  ${b.tag} ${(b.cls || '').slice(0, 40)}`);
    for (const s of j.shadows) console.log(`   shdw  ${s.shadow.slice(0, 70)}  ${(s.cls || '').slice(0, 40)}`);
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
