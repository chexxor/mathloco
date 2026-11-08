#!/usr/bin/env node
// round17-build.mjs — the round-17 specimen: the shipped page and each priced header/copy option, photographed at the
// two widths where the difference is visible, with the numbers the same loads produced. Generated from
// `design/grill/round17/report.json`.
//
//   node design/grill/round17-build.mjs      # after `node design/round17.mjs` has written the report
//
// Edit the builder or `design/grill/round17-options.mjs`, NEVER the HTML: the generated page embeds the numbers it
// measured, so a hand-edit is a claim about a build. A lookup that finds nothing THROWS.
//
// D160 applies here too: a header question is answered by looking at bars, not at a table of px. The table is under
// the photographs because a ruling has to be able to quote a number, and `DESIGN.md` will be the thing that quotes it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { rgbTripleFromBytes, dist, SAME_COLOUR_BAR, BARS, hueGap, asTriple, contrastTriple } from './okcolor.mjs';

const REPORT = resolve('design/grill/round17/report.json');
const SCRATCH = resolve('.design/tmp-round17');
const OUT = resolve('design/grill/round-17-header.html');
if (!existsSync(REPORT)) { console.error('round17-build: no report — run `node design/round17.mjs` first'); process.exit(1); }
const R = JSON.parse(readFileSync(REPORT, 'utf8'));

const THEMED = readFileSync(resolve('src/styles/global.css'), 'utf8');
const tok = (name) => {
  const m = THEMED.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`round17-build: --color-${name} is not in the token block — the specimen would be inventing a colour`);
  return m[1].trim();
};
const C = { paper: tok('paper'), panel: tok('panel'), ink: tok('ink'), ink2: tok('ink-2'), ink3: tok('ink-3'), rule: tok('rule'), gold: tok('gold'), tint: tok('tint') };

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round17-build: ${what} is missing from the record — refusing to print a blank or a guess`);
  return v;
};
const OPTS = need(R.options, 'options');
if (!OPTS.length) throw new Error('round17-build: the record has no options');
const BASE = OPTS.find((o) => o.label === 'shipped');
if (!BASE) throw new Error('round17-build: the record has no `shipped` row, so every delta would be an orphan');
// The record's own width order. Integer-like keys iterate ascending, which silently made the phone the "first width"
// of a specimen in an earlier round (D158/D165 lineage) — read the list the runner wrote, not Object.keys.
const WIDTHS = need(R.widths, 'widths');
const PHOTO_WIDTHS = [1240, 390];
// A crop is the header plus the hero plus the copy that sits under it. Tall enough that the bar's relationship to the
// page is visible, short enough that 14 of them fit on one screen.
const CROP = { 1240: 820, 390: 660 };
const sgn = (v) => `${v > 0 ? '+' : ''}${+v.toFixed(1)}`;
const letter = (i) => (i < 26 ? String.fromCharCode(65 + i) : 'A' + (i - 25)); // 27th option onward is A1, A2: the alphabet runs out and '[' is not a label
const at = (o, w) => need(o.widths && o.widths[String(w)], `${o.label} @${w}`);

// Photographs are the point of this specimen, so a missing one is not a detail: a blank cell reads as "the bars look
// the same" when what happened is that a probe flaked. Crop from the viewport shots the round already took, and name
// the fix when there is nothing to crop.
const crops = {};
for (const o of OPTS) {
  for (const w of PHOTO_WIDTHS) {
    const shot = o.shots && o.shots[String(w)];
    if (!shot || !shot.png || !existsSync(resolve(shot.png))) { crops[`${o.label}@${w}`] = null; continue; }
    const out = `${SCRATCH}/crop-${o.label}-${w}.png`;
    if (!existsSync(out)) {
      try { await sharp(resolve(shot.png)).extract({ left: 0, top: 0, width: w, height: CROP[w] }).png().toFile(out); }
      catch (e) { throw new Error(`round17-build: crop failed for ${o.label}@${w}: ${e.message}`); }
    }
    crops[`${o.label}@${w}`] = out;
  }
}
const missing = [];
for (const o of OPTS) for (const w of PHOTO_WIDTHS) if (!crops[`${o.label}@${w}`]) missing.push(`${o.label}@${w}`);
if (missing.length) console.warn(`round17-build: no photograph for ${missing.join(', ')} — the probe posted its numbers but Firefox wrote no screenshot. `
  + `Those cells say so instead of showing a blank, because a blank cell reads as "the pages look the same". Re-price the row with \`node design/round17.mjs --only=<label>\`.`);
const b64 = (p) => readFileSync(p).toString('base64');

const gateWord = (o) => {
  const g = (o.gates || [])[0];
  if (!g) return '<span class="skip">gate not run (--fast)</span>';
  if (g.ok) return `<span class="ok">gate ok${g.retries ? ` after ${g.retries} flake retry` : ''}</span>`;
  const flake = (g.fails || []).some((f) => /measurement failed|TIMEOUT/.test(f));
  return `<span class="fail">gate FAILS (${(g.fails || []).filter((f) => !/RENDER GATE:/.test(f)).length})${flake ? ' — includes a probe flake' : ''}</span>`;
};
const firstFails = (o) => ((o.gates || [])[0]?.fails || []).filter((f) => !/RENDER GATE:/.test(f)).slice(0, 3).map((f) => f.trim());

// The edge probe (added 2026-11-08, operator's steer: separate the bar STRUCTURALLY, not by painting it).
// Every "the bar is separated by X" claim in this round is answered by the bytes Firefox actually painted in the
// rows around the bar's bottom edge: the last device row inside the bar, and the eight rows below it, each against
// the paper painted 40 rows further down the same screenshot. A device that paints nothing there cannot separate
// the bar from the page, whatever the token says.
const edgeCell = (o) => {
  const e = o.headline && o.headline.edgeReport;
  if (!e || e.error) return '';
  return `· edge: last row inside the bar <b>${e.edgeRow ? e.edgeRow.vsPaper : '—'}</b>, darkest row below <b>${e.maxBelow}</b> (layer bar ${e.layerBar})`;
};
const stickyCell = (o) => {
  const s = o.headline && o.headline.sticky;
  if (!s || !s.atScroll600) return '';
  return `· sticky: at scroll 600 the bar covers <b>${s.atScroll600.covers}</b> text boxes`;
};

// Two families in one round: the bar (how the header reads) and the copy (what the page says twice).
const BAR = OPTS.filter((o) => !o.label.startsWith('dup') && !o.label.startsWith('dedup'));
const COPY = OPTS.filter((o) => o.label.startsWith('dup') || o.label.startsWith('dedup'));

// The edge probe is a number, and a number that small is not something a person can rule on by reading. Cut a
// 320x55 window around each bar's bottom edge and double it, so the row the probe measured is the row you are
// looking at. Same source screenshot, same headerBottom, so the picture and the number cannot drift.
const zooms = {};
for (const o of BAR) {
  const src = o.shots && o.shots['1240'] && o.shots['1240'].png;
  const e = o.headline && o.headline.edgeReport;
  if (!src || !existsSync(resolve(src)) || !e || e.error || e.headerBottom == null) continue;
  const out = `${SCRATCH}/zoom-edge-${o.label}-1240.png`;
  if (!existsSync(out)) {
    try {
      await sharp(resolve(src)).extract({ left: 300, top: Math.max(0, e.headerBottom - 25), width: 320, height: 55 }).resize({ width: 640 }).png().toFile(out);
    } catch (err) { console.warn(`round17-build: edge zoom failed for ${o.label}: ${err.message}`); continue; }
  }
  zooms[o.label] = out;
}

const card = (o, w) => {
  if (o.hole) return `<figure class="card hole"><div class="noimg">not measured — ${o.hole}</div><figcaption><b>${letter(OPTS.indexOf(o))}. ${o.title}</b><span class="gate">no verdict</span></figcaption></figure>`;
  const m = at(o, w);
  const b = at(BASE, w);
  const items = m.navItems.map((i) => `${i.t} ${i.fs}`).join(' · ');
  const img = crops[`${o.label}@${w}`]
    ? `<img src="data:image/png;base64,${b64(crops[`${o.label}@${w}`])}" alt="the header and hero at ${w}px under ${o.label}">`
    : `<div class="noimg">no photograph for this cell — the probe posted numbers but Firefox wrote no screenshot</div>`;
  return `<figure class="card">
    ${img}
    <figcaption><b>${o.label === 'shipped' ? 'shipped (incumbent)' : `${letter(OPTS.indexOf(o))}. ${o.title}`}</b>
      <span class="what">${o.what}</span>
      <span class="nums">bar ${m.header.box} ground <b>${m.header.ground}</b> border ${m.header.border} shadow ${m.header.shadow}
        ${o.headline && o.headline.groundReport ? `· layer vs page <b>${o.headline.groundReport.layerVsPage}</b> (bar ${o.headline.groundReport.layerBar}) · ink ${o.headline.groundReport.roles.ink} gold ${o.headline.groundReport.roles.gold} rule ${o.headline.groundReport.roles.rule}` : ''}
        · name ${m.nameInFirstScreen} in the first screen
        · nav ${items} · row ${m.row.needed} of ${m.row.available}
        ${w === 1240 ? `${edgeCell(o)} ${stickyCell(o)}` : ''}
        · page ${m.docHeight}px ${o.label === 'shipped' ? '' : `(${sgn(m.docHeight - b.docHeight)})`}</span>
      <span class="gate">${gateWord(o)}</span>
      ${firstFails(o).length ? `<span class="why">${firstFails(o).join(' | ')}</span>` : ''}
    </figcaption></figure>`;
};

const strip = (w, opts) => `<h2>at ${w}px — shipped bar ${at(BASE, w).header.box}, page ${at(BASE, w).docHeight}px</h2>
<p class="scale">Every crop is the same region of the page: the header, the hero, and the copy directly under it. A change you cannot see here is a change the page cannot show.</p>
<div class="strip">${opts.map((o) => card(o, w)).join('\n')}</div>`;

// The ground table: every bar option's painted bytes, how far that ground is from the page's own ground against the
// ratified 1.35 layer bar (D101), and what each role the header can paint measures ON it. This is the half of the
// round that answers "make the header amber instead of teal" - warmth is not free, and the price is written here in
// contrast, measured off bytes the browser actually painted.
const PAGE_BYTES = (BASE.headline.groundReport?.bytes || '').split(',').map(Number).filter((n) => Number.isFinite(n));
const groundRow = (o) => {
  const g = o.headline && o.headline.groundReport;
  if (!g) return `<tr><td>${o.label}</td><td class="n" colspan="10">no ground measured for this row</td></tr>`;
  const bad = (v, bar) => v < bar ? `<b class="fail">${v}</b>` : v;
  const dPage = PAGE_BYTES.length ? dist(rgbTripleFromBytes(PAGE_BYTES), rgbTripleFromBytes(g.bytes.split(',').map(Number))) : null;
  return `<tr><td>${o.label === 'shipped' ? 'shipped' : `${letter(OPTS.indexOf(o))}. ${o.label}`}</td>
    <td class="n">${g.oklch}</td><td class="n">${g.bytes}</td>
    <td class="n">${bad(g.layerVsPage, g.layerBar)} <span class="tiny">(bar ${g.layerBar})</span></td>
    <td class="n">${dPage === null ? '' : `${dPage}${dPage < SAME_COLOUR_BAR ? ' <span class="fail">reads as the same colour</span>' : ''}`}</td>
    <td class="n">${bad(g.roles.ink, g.bars.text)}</td><td class="n">${bad(g.roles['ink-3'], g.bars.text)}</td>
    <td class="n">${bad(g.roles.gold, g.bars.text)}</td><td class="n">${bad(g.roles.rule, g.bars.graphic)}</td>
    <td class="n">${(g.painted || []).map((p) => `${p.t.replace(/, home|Navigate to /, '')} ${bad(p.on, g.bars.text)}`).join(' · ') || 'not measured'}</td>
    <td class="n">${g.hueGapToGold === null ? '' : g.hueGapToGold}</td><td class="n">${g.nearestBrand}</td></tr>`;
};

// The edge table: one line per bar option - what the bar ground painted, what the paper painted in the same
// screenshot, the contrast of the bar's last device row and of the darkest row under it, and whether the device
// reaches the layer bar. A row that reads 1.00 is a device that is not there.
const edgeRow = (o) => {
  const e = o.headline && o.headline.edgeReport;
  if (!e || e.error) return `<tr><td>${o.label === 'shipped' ? 'shipped' : `${letter(OPTS.indexOf(o))}. ${o.label}`}</td><td colspan="7" class="n">no edge measured — ${o.hole || (e ? e.error : 'no screenshot for this row')}</td></tr>`;
  const below = e.maxBelow >= e.layerBar ? `<b>${e.maxBelow}</b>` : `<b class="fail">${e.maxBelow}</b>`;
  const inside = e.edgeRow ? `${e.edgeRow.bytes} = <b>${e.edgeRow.vsPaper}</b>` : '—';
  const s = o.headline.sticky && o.headline.sticky.atScroll600
    ? `${o.headline.sticky.atScroll600.covers} text boxes covered at scroll 600`
    : (o.headline.sticky && o.headline.sticky.position ? o.headline.sticky.position : 'no');
  return `<tr><td>${o.label === 'shipped' ? 'shipped' : `${letter(OPTS.indexOf(o))}. ${o.label}`}</td>
    <td>${o.title}</td><td class="n">${e.barBytes}</td><td class="n">${e.paperBytes}</td>
    <td class="n">${inside}</td><td class="n">${below}</td>
    <td class="n">${e.paintsALayer ? 'paints a layer' : 'paints nothing the eye can find'}</td><td class="n">${s}</td>
    <td>${zooms[o.label] ? `<img src="data:image/png;base64,${b64(zooms[o.label])}" width="160" height="27" alt="the bar's bottom edge at 2x">` : '<span class="skip">no photograph</span>'}</td></tr>`;
};
const EDGE_ROWS = BAR.filter((o) => o.headline && o.headline.edgeReport && !o.headline.edgeReport.error);
const SHIPPED_EDGE = (EDGE_ROWS.find((o) => o.label === 'shipped') || {}).headline.edgeReport.maxBelow;
const SHADOW_EDGE = (EDGE_ROWS.find((o) => o.label === 'chrome-elevation') || {}).headline.edgeReport.maxBelow;
const SHADOW2_EDGE = (EDGE_ROWS.find((o) => o.label === 'chrome-elevation-2') || {}).headline?.edgeReport?.maxBelow;
const KEYLINE_EDGE = (EDGE_ROWS.find((o) => o.label === 'chrome-keyline') || {}).headline.edgeReport.edgeRow && EDGE_ROWS.find((o) => o.label === 'chrome-keyline').headline.edgeReport.edgeRow.vsPaper;
const layered = EDGE_ROWS.filter((o) => o.headline.edgeReport.paintsALayer).map((o) => `${o.label} (${o.headline.edgeReport.maxBelow})`);
const edgeFindings = `the inset rule ring paints a real edge at ${KEYLINE_EDGE} (the ratified graphic keyline, bar 3.0, D103), the level-1 shadow's darkest painted row is ${SHADOW_EDGE}, the level-2 shadow's is ${SHADOW2_EDGE}, and every other device sits at ${SHIPPED_EDGE} - the same bytes as the paper it stands on. ${layered.length ? 'Only ' + layered.join(', ') + ' reaches the 1.35 layer bar by painting a ground.' : 'No option reaches the 1.35 layer bar without painting a ground.'}`;

// The recommendation section reads its numbers from the record, so it cannot quote a value the probe did not
// measure. These helpers resolve an option label to the fields the section cites.
const opt = (label) => OPTS.find((o) => o.label === label) || {};
const SHIP = BASE.headline;
const edgeOf = (label) => (opt(label).headline && opt(label).headline.edgeReport) || {};
const barHeight = (label) => (opt(label).widths && opt(label).widths['1240'] && opt(label).widths['1240'].header.box) || 'no photograph';
const groundOf = (label) => (opt(label).headline && opt(label).headline.groundReport && opt(label).headline.groundReport.layerVsPage) ?? 'not measured';
const roleOn = (label, role) => ((opt(label).headline && opt(label).headline.groundReport && opt(label).headline.groundReport.roles) || {})[role] ?? 'not measured';
const stickyCover = (label) => {
  const o = opt(label);
  const rows = Object.entries(o.widths || {}).filter(([, w]) => w && w.sticky && w.sticky.atScroll600);
  if (!rows.length) return 'not measured';
  return rows.map(([w, m]) => w + 'px: ' + m.sticky.atScroll600.covers + (m.sticky.atScroll600.covers === 1 ? ' box' : ' boxes') +
    ' (' + m.sticky.atScroll600.first.map((f) => f.own.slice(0, 22) + '... ' + f.overlapPx + 'px').join(', ') + ')').join(' · ');
};
const GROUND_EDGES = OPTS.filter((o) => o.headline && o.headline.groundReport && o.headline.groundReport.bytes !== SHIP.groundReport.bytes && o.headline.groundReport.layerVsPage < BARS.layer)
  .map((o) => o.label.replace('chrome-ground-', '') + ' ' + o.headline.groundReport.layerVsPage).join(', ');
const BAND_FILL = opt('chrome-ground-gold-fill');
const OPEN_PAIRS = JSON.parse(readFileSync(resolve('design/copy-duplicates.json'), 'utf8')).pairs.filter((p) => p.status === 'open').length;
const STICKY2 = opt('chrome-sticky-e2');
const numRow = (o) => {
  const h = o.headline;
  if (o.hole) return `<tr><td>${letter(OPTS.indexOf(o))}. ${o.label}</td><td class="n" colspan="9">not measured — ${o.hole}</td><td>no verdict</td></tr>`;
  return `<tr><td>${o.label === 'shipped' ? 'shipped' : `${letter(OPTS.indexOf(o))}. ${o.label}`}</td>
    <td class="n">${h.navIdentityFs}</td><td class="n">${h.navLabelFs}</td><td class="n">${h.heroFs}</td>
    <td class="n">${h.headerGround}</td><td class="n">${h.nameInFirstScreen1240}/${h.nameOnPage1240}</td>
    <td class="n">${h.dupPairs.length}</td>
    <td class="n">${o.deltas ? o.deltas.docHeightByWidth : ''}</td>
    <td class="n">${o.deltas ? o.deltas.headerHeight : ''}</td>
    <td class="n">${o.deltas ? o.deltas.copyCharsInFirstScreen : ''}</td>
    <td>${gateWord(o)}</td></tr>`;
};

const pairs = (BASE.headline.dupPairs || []).length;
const pairRows = (at(BASE, 1240).dupPairs || []).map((p) => `<tr><td>${p.a.own}</td><td>${p.b.own}</td>
  <td class="n">${p.shared}</td><td class="n">${p.jaccard}</td><td class="n">${p.overlap}</td>
  <td class="n">${p.a.surface} @${p.a.y}px · ${p.b.surface} @${p.b.y}px</td></tr>`).join('\n');

const copyCard = (o) => {
  if (o.hole) return `<figure class="card copy"><b>${letter(OPTS.indexOf(o))}. ${o.title}</b><span class="what">${o.what}</span><span class="nums">not measured — ${o.hole}</span></figure>`;
  const gone = (o.applied || []).map((a) => a.where).join(', ');
  return `<figure class="card copy">
    <b>${letter(OPTS.indexOf(o))}. ${o.title}</b>
    <span class="what">${o.what}</span>
    <span class="nums">pairs ${at(o, 1240).dupPairs.length} (was ${pairs}) · page ${o.deltas.docHeightByWidth} · first-screen copy ${sgn(o.deltas.copyCharsInFirstScreen)} chars · "${gone}" removed
      · "What we take up" now starts at y ${at(o, 1240).sections['how-it-works'] ? at(o, 1240).sections['how-it-works'].y : '—'}</span>
    <span class="gate">${gateWord(o)}</span>
    ${at(o, 1240).dupPairs.length ? at(o, 1240).dupPairs.map((p) => `<span class="why">still a pair: ${p.a.own.slice(0, 60)}… <> ${p.b.own.slice(0, 60)}… (${p.jaccard})</span>`).join('') : '<span class="why">no near-duplicate sentence left on the page</span>'}
  </figure>`;
};

const floor = BASE.headline.markStrokeFloor;

const barOf = (role) => (role === 'rule' ? BARS.graphic : BARS.text);
const inkBytes = (label) => {
  const p = OPTS.find((x) => x.label === label)?.headline?.groundReport?.painted?.[0];
  return p ? { on: p.on, bytes: p.bytes, brand: p.brand ? `${p.brand.brand} ${p.brand.d}` : 'not measured' } : null;
};
// How far a candidate ink sits from the four hues the join paths already own. The palette keeps 40 degrees between
// signal hues (okcolor.mjs hueWindows), so an ink inside that band is not free to use.
const pathGap = (bytes) => ['calendar', 'meetup', 'discord', 'mobilizon'].map((p) => ({ p, gap: hueGap(rgbTripleFromBytes(bytes.split(',').map(Number)), asTriple(tok('path-' + p))) })).sort((a, b) => a.gap - b.gap);
const WARM_LABELS = ['chrome-ground', 'chrome-ground-warm', 'chrome-ground-warm-band', 'chrome-ground-panel', 'chrome-ground-gold-fill', 'chrome-ink-warm', 'nav-name-gold'];
const warmBlock = WARM_LABELS.map((l) => OPTS.find((o) => o.label === l)).filter((o) => o && o.headline.groundReport).map((o) => {
  const g = o.headline.groundReport;
  const fails = Object.entries(g.roles).filter(([r, v]) => r !== 'band-text' && v < barOf(r)).map(([r, v]) => `${r} ${v} (bar ${barOf(r)})`);
  const dPage = PAGE_BYTES.length ? dist(rgbTripleFromBytes(PAGE_BYTES), rgbTripleFromBytes(g.bytes.split(',').map(Number))) : null;
  const runs = o.gates || [];
  const gr = runs[0];
  const realFails = gr ? (gr.fails || []).filter((f) => !/RENDER GATE:/.test(f) && !/measurement failed|TIMEOUT/.test(f)) : [];
  const flaked = gr && (gr.fails || []).some((f) => /measurement failed|TIMEOUT/.test(f));
  const gate = !gr ? 'gate not run' : gr.ok ? 'shipped gate clean' : (realFails.length ? `${realFails.length} shipped-gate failure(s): ${realFails.slice(0, 3).map((f) => f.trim()).join(' | ')}` : 'gate red only because a probe flaked');
  return `<li><b>${o.label}</b> - ground ${g.oklch} = rgb(${g.bytes})${g.paintedBy !== BASE.headline.groundReport.paintedBy ? '' : ' (ground unchanged from shipped)'}. Layer vs page <b>${g.layerVsPage}</b>, OKLab distance from the page ground <b>${dPage}</b>. Roles painted on it: ${Object.entries(g.roles).filter(([r]) => r !== 'band-text').map(([r, v]) => `${r} ${v}`).join(', ')}. ${fails.length ? 'Below its bar: ' + fails.join('; ') + '.' : 'Every role clears its bar.'} Nav ink as painted: ${g.paintedMin}${g.paintedBrand ? ', brand distance ' + g.paintedBrand : ''}. ${gate}.</li>`;
});
// The floor sweep: how far a hue-62 ground has to move before the eye reads it as a separate layer, and what that
// costs the roles that have to live on it. Token arithmetic (okcolor.mjs), so it is reproducible without a browser.
const warmFloor = [95, 93, 91, 89, 87, 85].map((L) => {
  const t = asTriple(`oklch(${L}% 0.06 62)`);
  return { L, layer: contrastTriple(C.paper, t), d: dist(asTriple(C.paper), t), ink: contrastTriple(t, asTriple(C.ink)), gold: contrastTriple(t, asTriple(C.gold)), rule: contrastTriple(t, asTriple(C.rule)) };
});
const warmInk = inkBytes('chrome-ink-warm');
const coolInk = inkBytes('shipped');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Round 17 — the header bar and the name, photographed</title>
<style>
  body { margin: 0; background: ${C.panel}; color: ${C.ink}; font: 15px/1.55 system-ui, sans-serif; }
  main { max-width: 1600px; margin: 0 auto; padding: 32px 24px 96px; }
  h1 { font-size: 26px; margin: 0 0 6px; }
  h2 { font-size: 19px; margin: 40px 0 4px; }
  .meta, .scale { color: ${C.ink3}; font-size: 13px; margin: 0 0 12px; }
  .strip { display: flex; gap: 14px; align-items: flex-start; overflow-x: auto; padding-bottom: 10px; }
  .card { margin: 0; flex: 0 0 auto; background: ${C.paper}; border: 1px solid ${C.rule}; padding: 10px; width: 320px; }
  .card img { display: block; width: 100%; height: auto; border: 1px solid ${C.rule}; }
  .noimg { padding: 24px 8px; color: ${C.ink3}; font-size: 12px; border: 1px dashed ${C.rule}; }
  .card.hole { opacity: .6; }
  figcaption b { display: block; font-size: 14px; margin-top: 6px; }
  .what { display: block; color: ${C.ink2}; font-size: 12px; margin: 3px 0; }
  .nums { display: block; color: ${C.ink3}; font-size: 11.5px; }
  .gate { display: block; margin-top: 6px; font-size: 12px; }
  .ok { color: #1c6b4a; } .fail { color: #a3302a; } .skip { color: ${C.ink3}; }
  .why { display: block; color: ${C.ink3}; font-size: 11px; margin-top: 3px; }
  table { border-collapse: collapse; width: 100%; font-size: 12.5px; background: ${C.paper}; }
  th, td { border: 1px solid ${C.rule}; padding: 6px 8px; text-align: left; vertical-align: top; }
  td.n { font-variant-numeric: tabular-nums; }
  .copy { background: ${C.paper}; border: 1px solid ${C.rule}; padding: 10px; margin: 0 0 10px; }
  .note { background: ${C.paper}; border: 1px solid ${C.rule}; padding: 12px; margin: 14px 0; font-size: 13px; }
</style></head><body><main>
<h1>Round 17 — the header bar, the name, and the copy the page says twice</h1>
<p class="meta">measured ${R.measuredAt} on ${R.os} at ${R.widths.join('/')}px, viewport ${R.viewportHeight}px.
The bar is ${BASE.headline.headerBox} on the same ground as the page (${BASE.headline.headerGround}), border-bottom ${BASE.headline.headerBorderBottom}, shadow ${BASE.headline.headerShadow}.
The name is painted ${BASE.headline.nameOnPage1240} times on the page and ${BASE.headline.nameInFirstScreen1240} of them are in the first screen at 1240px; the hero is ${BASE.headline.heroFs} and the nav name is ${BASE.headline.navIdentityFs} — the hero is ${BASE.headline.heroOverNavIdentity}× the bar's name.
Type ramp read from the build: ${Object.entries(R.rampFromBuild).map(([k, v]) => `${k} ${v}`).join(', ')}.
Gates: ${R.gates}.</p>

<h2>1. The bar — every way of making it read as chrome, at 1240px</h2>
${strip(1240, BAR)}
<h2>2. The bar at 390px (the phone, where the row has ${at(BASE, 390).row.needed}px of ${at(BASE, 390).row.available}px)</h2>
${strip(390, BAR)}

<h2>3. The ground each bar paints, measured off the pixels the browser painted</h2>
<p class="scale">Bytes come from the live page's computed background, not from the stylesheet (record 0020). "Layer vs page" is the header ground against the page ground; the ratified layer bar is 1.35 (D101), so a ground the eye cannot separate from the page is a ground that is not a layer. "Distance to page" is OKLab: below 0.05 two surfaces read as the same colour (D88's own same-colour bar). The role columns are each token painted on THAT ground: ink and ink-3 against the 4.5 text bar, gold (the colour the nav's hover and the focus ring use) against 4.5, rule (every keyline, every card edge and the sphere mark's outline) against the 3.0 graphic bar. Bold is a failure of the bar.</p>
<table><tr><th>option</th><th>painted oklch</th><th>bytes</th><th>layer vs page</th><th>distance to page</th><th>ink</th><th>ink-3</th><th>gold</th><th>rule</th><th>nav text, as painted</th><th>hue gap to gold</th><th>nearest brand (D88 zone is 0.135)</th></tr>
${BAR.map(groundRow).join('\n')}</table>

<h2>4. Could the bar be amber? Every warm ground priced, and what it costs</h2>
<p class="scale">A ground is only worth painting if the eye can see it as a ground - layer bar 1.35, same-colour bar 0.05 - and if every role painted on it still clears its own bar: 4.5 for text, 3.0 for a boundary or a graphic. rule is every notice's inset edge, every card border and the mark's outline, so a ground that sinks rule below 3 does not just change the header: it erases the mark's own edge on the bar it sits in.</p>
<ul>${warmBlock}</ul>
<p class="scale"><b>How warm can a ground get and still be a layer?</b> A hue-62 ground at chroma .06, darkened one lightness step at a time, with the roles the header must paint measured on it. This is the arithmetic that decides whether a warm bar can exist at all, and it is computed from the ratified tokens in grill/okcolor.mjs, so it reproduces without a browser.</p>
<table><tr><th>ground oklch</th><th>layer vs paper</th><th>OKLab distance</th><th>ink on it</th><th>gold on it</th><th>rule on it</th></tr>
${warmFloor.map((r) => `<tr><td>${r.L}% .06 62</td><td class="n">${r.layer}${r.layer < BARS.layer ? ' <span class="fail">not a layer</span>' : ''}</td><td class="n">${r.d}</td><td class="n">${r.ink}</td><td class="n">${r.gold}${r.gold < BARS.text ? ' <span class="fail">under 4.5</span>' : ''}</td><td class="n">${r.rule}${r.rule < BARS.graphic ? ' <span class="fail">under 3.0</span>' : ''}</td></tr>`).join('\n')}</table>
<div class="note"><b>The four numbers that answer the amber question.</b>
<b>1.</b> The shipped bar paints nothing: its ground is the page's, ${BASE.headline.groundReport.bytes}, measured layer contrast ${BASE.headline.groundReport.layerVsPage}, and the edge probe below finds the identical bytes in every row under it. The bar is separated from the page by air only - 16px of nav padding inside it and ${at(BASE, 1240).gaps.headerToHero}px between its bottom edge and the h1 - not by ground, not by a shadow, not by a rule.<br>
<b>2.</b> No warm ground priced here reaches the layer bar. The amber wash is 1.11 and sits under 0.05 OKLab from paper, so it reads as paper while still costing gold and rule their bars. The sweep above shows the ground has to reach about L89 to hit 1.35 - and at L89 rule on it measures ${warmFloor.find((r) => r.L === 89)?.rule} and gold ${warmFloor.find((r) => r.L === 89)?.gold}. A warm ground big enough to be a layer is big enough to break the boundary role it has to support.<br>
<b>3.</b> gold as a fill is a 4.82 layer and takes the nav's text to 2.50 - the same number DESIGN.md already records for gold on the dark band, "an invisible focus ring". The shipped render gate fails it at all four widths, and painting the header makes it a second dark band where the palette allows one (D101). In this system gold is a mark, a word and a keyline; it is not a surface, and DESIGN.md's rule against a signal hue (D102) says the same thing in words.<br>
<b>4.</b> The green in the header is the ink, not the ground. ink, ink-2, ink-3 and rule are hue 152 by design - the mark's own hue, chosen from a 58-candidate sweep in round 9 (D19) - while paper is hue 85, a warm off-white. The bar is paper with cool ink on it, and that is what reads as teal. It is priced as G (chrome-ink-warm): warm ink reads ${warmInk.on} on paper, its painted bytes ${warmInk.bytes} are ${warmInk.brand} from a real brand, and the shipped cool ink's bytes ${coolInk.bytes} are ${coolInk.brand} - the 0.135 zone (D88) does not separate the two, so the argument is hue and role, not brand collision. Warm ink sits ${pathGap(warmInk.bytes)[0].gap} degrees from ${pathGap(warmInk.bytes)[0].p}'s path hue; the cool ink sits ${pathGap(coolInk.bytes)[0].gap} from ${pathGap(coolInk.bytes)[0].p}'s.</div>

<h2>5. What actually paints under the bar — the edge probe</h2><p class="scale">The operator's steer for this round was structural separation rather than a painted ground (2026-11-08). A device only separates two surfaces if the eye can find it in the pixels, so every candidate is tested the same way: the last device row INSIDE the bar, and the eight rows below it, each averaged over three x positions and differenced against the paper painted 40 rows further down in the SAME screenshot. The ratified layer bar is 1.35 (D101); a boundary the eye can find is what a keyline is for. A device that measures 1.0 here paints nothing, however tidy it looks in the token table.</p>
<table><tr><th>option</th><th>device</th><th>bar ground, as painted</th><th>paper in the same shot</th><th>last row inside the bar</th><th>darkest row below</th><th>does it read as a layer?</th><th>sticky?</th><th>the bottom edge, 2x</th></tr>
${BAR.map(edgeRow).join('\n')}</table>
<div class="note"><b>What the probe says.</b> Of the devices that change no ground, only the inset keyline ring paints an edge the eye can find: ${edgeFindings}. Padding and content inside the bar leave the rows under it at ${SHIPPED_EDGE} against the paper they sit on. That is not a taste call: DESIGN.md's elevation table used to say level 1 "measures 1.35 at the contact edge", and that number is the shadow's stop composited at full alpha in the ratify config, not the pixels Firefox paints. Measured on this bar: level 1 ${SHADOW_EDGE}, level 2 ${SHADOW2_EDGE}. DESIGN.md now states both painted numbers (corrected 2026-11-08 in the same commit as this round); the token did not change, the claim about it did.</div>

<h2>6. The numbers, at every width</h2>
<table><tr><th>option</th><th>nav name</th><th>nav label</th><th>hero</th><th>bar ground</th><th>name in fold / on page</th><th>near-duplicate pairs</th><th>page height delta</th><th>bar height delta</th><th>first-screen copy delta</th><th>shipped gate</th></tr>
${OPTS.map(numRow).join('\n')}</table>

<div class="note"><b>What the mark floor says about a nav glyph (${letter(OPTS.findIndex((o) => o.label === 'nav-glyph'))}).</b>
The shipped mark is drawn ${floor.drawnAtPx}px wide, at which its thinnest stroke lands ${floor.deviceStrokeAtDrawnPx}px. Its thinnest stroke is ${floor.thinnestStrokeUnits} viewBox units,
so a 1px floor (D119) needs the mark at least <b>${floor.minWidthFor1pxFloorPx}px wide</b>. At 24px the gate measured the strokes at 0.21px, and the mark probe — which reads the
first <code>svg[data-mark]</code> on the page — took the glyph for the hero mark and failed ${((OPTS.find((o) => o.label === 'nav-glyph').gates || [])[0].fails || []).length} checks. A nav glyph is
possible only as its own thing with its own rule, not as the mark.</div>

<h2>7. The copy the page says twice</h2>
<p class="scale">Sentences are compared on content words only, split at terminal punctuation (not at semicolons — this page writes its repeated claims as semicolon pairs). A pair is reported when it shares at least 3 content words and either Jaccard ≥ 0.45 or overlap ≥ 0.5. Jaccard is shared vocabulary over union; overlap is how much of the shorter sentence is inside the longer one.</p>
<table><tr><th>sentence A</th><th>sentence B</th><th>shared words</th><th>jaccard</th><th>overlap</th><th>where</th></tr>
${pairRows}</table>

<h2>8. Deleting one side of each pair — every option is a deletion, not a reword</h2>
<p class="scale">Copy here comes from \`src/content.json\` and ruled strings, so a priced option can only remove an exact sentence. Rewording is a ruling first, and an option that reworded would be pricing the builder's words, not the club's.</p>
${COPY.map(copyCard).join('\n')}

<h2>9. What this round cannot yet answer</h2>
<div class="note">
  <b>a.</b> \`name-lockup\` and \`descriptor-owns-display\` pass the shipped render gate, but \`npm run check:copy\` reads <i>source</i>, and the round mutates the built page. Neither has been run against the copy gate; both move the descriptor between slots, which is exactly what \`slot-coupling\` exists to catch. Same for \`bar-carries-descriptor\*\`: the phrase moves into the bar, so the three slots \`check:copy\` couples have to be re-ruled before the copy ships.<br>
  <b>b.</b> \`design/copy-duplicates.json\` now exists and \`check:content\` reads it: 6 pairs, 2 ruled \`deliberate\` (the provenance lines), 1 ruled \`template\` (one row template rendered twice), 3 still \`open\>. The open three are rulings the operator has to make, not measurements the round can finish.<br>
  <b>c.</b> The gate verdicts for \`chrome-ground\` and \`dup-homework-band-goes\` were re-run after a probe flake (a headless Firefox that never posted); both are now clean, with the retry count in the record. Firefox flakes at @390 on this rig (Linux, native, D131) - every row that touches the phone width carries a retry in its record.<br>
  <b>d.</b> The sticky rows are priced with an injected \`<style>\` rule. \`sticky\` and \`top-0\` are Tailwind v4 core utilities the build does not emit today (grep the built CSS: zero \`position:sticky\), so shipping either needs the classes in \`src/components/Navigation.astro\` for Tailwind to generate them - the round prices the behaviour, not the production CSS.<br>
  <b>e.</b> DESIGN.md's elevation table quoted the token, not the render: level 1 "measures 1.35 at the contact edge" is the stop composited at full alpha, and the pixels Firefox paints under a 1px/2px blur are ${SHADOW_EDGE}. Level 2 goes the other way - declared 1.51, painted ${SHADOW2_EDGE}, because its two stops overlap at the contact edge. Both numbers are now in DESIGN.md with the probe that produced them, so a future round cannot quote 1.35 as a painted value. What has NOT been measured: how a painted shadow reads to a person, only what the bytes are.
</div>

<h2>10. What the measurements point to</h2>
<p class="scale">One answer per question, ranked, with the number that decides it. A recommendation is not a ruling: the ruling is the operator's, and every option named here is already priced, photographed and gate-checked in this specimen.</p>
<div class="note">
  <b>Q1. What makes the bar chrome?</b> A bar reads as chrome if it has an edge, behaves like furniture, or carries content the page does not. Measured in this round: only the ring paints an edge, only sticky changes behaviour, only the descriptor row gives the bar content of its own. Ranked:
  <ol>
    <li><b>${letter(OPTS.indexOf(opt('chrome-sticky-e2')))}. chrome-sticky-e2</b> - the only structural device in the round that clears the 1.35 layer bar on painted pixels: ${SHADOW2_EDGE} at the contact row, gate ok, no colour, no new token. DESIGN.md defines level 2 as "something that floats over content", and a bar that stays while the page scrolls is exactly that - sticky is what makes the shadow mean something. Cost: it needs <code>sticky</code>/<code>top-0</code> in source (the built CSS emits zero <code>position:sticky</code> today) and it covers ${STICKY2.widths['1240'].sticky.atScroll600.covers} text boxes at 1240 and ${STICKY2.widths['390'].sticky.atScroll600.covers} at 390 while scrolled - the shadow makes that hiding visible, which is why the pair is priced together and <code>chrome-sticky</code> alone is not recommended.</li>
    <li><b>${letter(OPTS.indexOf(opt('chrome-keyline')))}. chrome-keyline</b> - the ratified inset rule ring, ${KEYLINE_EDGE} against the paper it stands on: the 3.0 graphic bar DESIGN.md already ratified (D103), met exactly. Nothing else moves - the bar stays ${barHeight('chrome-keyline')}, the nav row is unchanged, the gate is ok at 1240/640/390/320. Cost: it is a hairline, so the bar reads as <i>bounded</i>, not as <i>above</i> the page.</li>
    <li><b>${letter(OPTS.indexOf(opt('chrome-sticky-keyline')))}. chrome-sticky-keyline</b> - the same ring, and the bar stays while the page scrolls. Measured occlusion at scroll 600: ${stickyCover('chrome-sticky-keyline')}. The ring is what makes the hiding legible: \`chrome-sticky\` alone leaves ${edgeOf('chrome-sticky').maxBelow} under the bar - copy slides under a bar with no edge and simply vanishes. If sticky is ever adopted it must not ship without the ring.</li>
    <li><b>${letter(OPTS.indexOf(opt('bar-carries-descriptor-keyline')))}. bar-carries-descriptor-keyline</b> - the bar says who you are on, which is furniture by content rather than by line. The bar grows from ${barHeight('shipped')} to ${barHeight('bar-carries-descriptor-keyline')} at every width, the hero loses its label lane, and the phrase moves between the three slots \`check:copy\` couples - a copy ruling, not a pixel change. By itself it paints ${edgeOf('bar-carries-descriptor').maxBelow}, so it still needs the ring.</li>
    <li><b>Not:</b> \`chrome-elevation\` (${SHADOW_EDGE} painted, under the 1.35 layer bar), \`chrome-airier\` (${edgeOf('chrome-airier').maxBelow} - 16px more height, nothing painted), a painted ground (${GROUND_EDGES} - all under the 1.35 layer bar; the only fill that reaches it is the gold band, and it fails the gate: nav ink ${BAND_FILL.headline.groundReport.roles.ink}, rule ${BAND_FILL.headline.groundReport.roles.rule}), any nav type step (\`check:render\` fails: labels stop rendering at the ratified 13.3px tier, and D117 retired the breakpoint a second tier would need).</li>
  </ol>
  <b>Q2. Does it hold at 390px?</b> For the ring, yes: the nav row needs ${at(BASE, 390).row.needed}px of ${at(BASE, 390).row.available} at 390 and ${at(BASE, 320).row.needed} of ${at(BASE, 320).row.available} at 320, and no recommended option changes either number. The phone cost of sticky is occlusion, not overflow: at 390 a sticky bar covers ${opt('chrome-sticky').widths['390'].sticky.atScroll600.covers} box (${opt('chrome-sticky').widths['390'].sticky.atScroll600.first[0].own.slice(0, 34)}… , ${opt('chrome-sticky').widths['390'].sticky.atScroll600.first[0].overlapPx}px of it), and the phone fold already holds only ${at(BASE, 390).fold.length} boxes / ${at(BASE, 390).fold.reduce((a, x) => a + x.own.length, 0)} characters. Recommend the ring at every width now; hold sticky until the operator rules whether a permanent bar is worth 72px of the phone fold.<br>
  <b>Q3. Which ground does the bar paint?</b> None that qualifies. Shipped: ${SHIP.groundReport.bytes}, layer vs page ${SHIP.groundReport.layerVsPage} - the bar is the page. Every palette ground sits under the 1.35 layer bar (panel ${groundOf('chrome-ground-panel')}, tint ${groundOf('chrome-ground')}, warm tint ${groundOf('chrome-ground-warm')}, warm band ${groundOf('chrome-ground-warm-band')}), which is exactly what DESIGN.md already records as "FLAT (decoration)". A chrome ground needs a new token solved to 1.35 or more while keeping \`rule\` at 3.0 or more and text at 4.5 or more. The palette does not contain one.<br>
  <b>Q4. Could the bar be amber?</b> No, and it is not close. The warm tint reaches ${groundOf('chrome-ground-warm')} and drops \`rule\` to ${roleOn('chrome-ground-warm', 'rule')}; the warm band reaches ${groundOf('chrome-ground-warm-band')} and drops \`rule\` to ${roleOn('chrome-ground-warm-band', 'rule')} and \`ink-3\` to ${roleOn('chrome-ground-warm-band', 'ink-3')}; the gold fill gives nav ink ${roleOn('chrome-ground-gold-fill', 'ink')}. Every warm ground puts a role under its own bar, so amber is a colour decision the round cannot make pass.<br>
  <b>Q5. The type ramp</b> holds as shipped: ${SHIP.navIdentityFs} identity, ${SHIP.navLabelFs} labels, ${SHIP.heroFs} hero - the hero is ${SHIP.heroOverNavIdentity}x the nav name. The two type-step options raise nav to ${opt('nav-step-only').headline.navIdentityFs}/${opt('nav-step-only').headline.navLabelFs} and fail \`check:render\`, and D117 retired the breakpoint a second nav tier would need. Chrome by type is not available without changing the ramp rule.<br>
  <b>Q6. The copy the page says twice.</b> ${OPEN_PAIRS} pairs are still \`open\` in \`design/copy-duplicates.json\`; the three provenance pairs are already ruled. One ruling per open pair: delete the join band's Meetup-and-chat twin (the band's job is sourced facts - venues and the count - the hero's job is voice), delete the join band's "nobody hands you homework" line (the hero already reassures, in the words a reader meets first), and reword rather than delete the hero's threads signpost - a reword is a ruling, and this round can only price exact deletions, so it needs the operator's sentence before it can be measured.<br>
  <b>Q7. Which deletions, if any?</b> Take \`dup-dates-chat-band-goes\`, \`dup-homework-band-goes\` and \`dup-threads-hero-goes\`: they close all three open pairs and leave every provenance sentence standing, and neither band deletion touches the fold (${at(BASE, 1240).fold.reduce((a, x) => a + x.own.length, 0)} characters at 1240 before and after). Do not take \`dedup-below-trims\` as a package: it includes \`dup-threads-section-goes\`, which removes the clause that says where the threads list comes from - and \`check:content\` treats an unsourced list as a claim (D92). Deleting the hero's signpost instead of the band's costs ${at(BASE, 1240).fold.reduce((a, x) => a + x.own.length, 0) - at(opt('dup-threads-hero-goes'), 1240).fold.reduce((a, x) => a + x.own.length, 0)} characters of fold copy, which is the one real trade in this set.
</div>
</main></body></html>
`;
writeFileSync(OUT, html);
console.log(`specimen: ${OUT} (${(html.length / 1024).toFixed(0)} kB, ${OPTS.length} options, ${PHOTO_WIDTHS.length * OPTS.length} crops)`);
