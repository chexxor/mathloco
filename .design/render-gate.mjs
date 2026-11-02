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
//     ribbon produced), and that band must contain paths a visitor can press (D115)
//   - no keyline drawn as a border/outline (the ratified keyline is a 1px INSET ring, measured 3.01
//     against paper in this harness — the same number the specimen records; a border costs 2px, which
//     is how a 40px control arrives at 42)
//   - notices and states: every role=status/alert block has no fill, a 1px inset ring at the ratified
//     rule contrast, text at or above the 4.5 bar, and a height that clears D98's 48px one-line figure
//   - the nav: one row at every width, flex-wrap: nowrap, one type tier per viewport, and the row must
//     FIT the container's content box (D100's needed-vs-available probe, run on the built artifact).
//     The tier boundary is read from --breakpoint-nav-narrow so this gate cannot drift from the CSS.
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
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The site's FLOOR is 320px (D114, operator ruling 2026-11-02): the nav's narrow tier needs 273px and
// a 320 viewport's container offers 276 (288 on a page short enough not to scroll). Below 320 the
// grammar does not fit — at 310 the container offers 266 and at 300 it offers 256, and at 300 the hero
// primary also wraps to 64px. That is declared, not discovered: the alternative measured 254 (the mark
// down a tier), which fits 256 by 2px, and D100 keeps the mark at 16px serif at every width because the
// face is what carries the club's name. 300/310 are still worth looking at, so ask for them:
//   RENDER_WIDTHS=1240,390,375,360,320,310,300 node .design/render-gate.mjs /
// They report the overflow instead of hiding it, and the gate refuses to run a default set that has
// quietly dropped the floor.
const FLOOR = 320;
const widths = (process.env.RENDER_WIDTHS || "1240,390,320").split(",").map(Number);
const pages = process.argv.slice(2).filter((a) => a.startsWith('/'));
const routes = pages.length ? pages : ['/', '/404', '/chat'];
const dist = resolve('dist/client');
// the tier boundary is read out of the token block, not remembered: a moved --breakpoint-nav-narrow
// moves this gate with it instead of quietly disagreeing with the CSS
const NAV_NARROW = Number((readFileSync('src/styles/global.css', 'utf8').match(/--breakpoint-nav-narrow:\s*(\d+)px/) ?? [])[1]);
if (!NAV_NARROW) { console.error('no --breakpoint-nav-narrow in src/styles/global.css — the nav probe needs it'); process.exit(1); }
if (process.env.RENDER_WIDTHS) {
  if (!widths.includes(FLOOR)) console.log(`NOTE  RENDER_WIDTHS overrides the default set and omits ${FLOOR} — the declared floor. The shipped gate must measure it.`);
} else if (!widths.includes(FLOOR)) {
  console.error(`the default width set no longer contains ${FLOOR} — the floor is a ratified claim (D114), so it has to stay gated`);
  process.exit(1);
}
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
      if (tiers.size > 1) fails.push(`${at}: nav links mix ${tiers.size} type tiers (${[...tiers].join(', ')}) — one tier per viewport`);
      const want = w < NAV_NARROW ? '11.1px' : '13.3px';   // text-micro / text-label (DESIGN.md's type table)
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

    console.log(`  controls ${j.controls.length} | bands ${j.bands.length} | keylines ${j.keylines.length} | notices ${(j.notices || []).length} | nav ${(j.nav?.links ?? []).length} | shadows ${j.shadows.length} | text ${j.text.length}`);
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
