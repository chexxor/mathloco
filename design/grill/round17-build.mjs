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
const letter = (i) => String.fromCharCode(65 + i);
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

// Two families in one round: the bar (how the header reads) and the copy (what the page says twice).
const BAR = OPTS.filter((o) => !o.label.startsWith('dup') && !o.label.startsWith('dedup'));
const COPY = OPTS.filter((o) => o.label.startsWith('dup') || o.label.startsWith('dedup'));

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
        · name ${m.nameInFirstScreen} in the first screen
        · nav ${items} · row ${m.row.needed} of ${m.row.available}
        · page ${m.docHeight}px ${o.label === 'shipped' ? '' : `(${sgn(m.docHeight - b.docHeight)})`}</span>
      <span class="gate">${gateWord(o)}</span>
      ${firstFails(o).length ? `<span class="why">${firstFails(o).join(' | ')}</span>` : ''}
    </figcaption></figure>`;
};

const strip = (w, opts) => `<h2>at ${w}px — shipped bar ${at(BASE, w).header.box}, page ${at(BASE, w).docHeight}px</h2>
<p class="scale">Every crop is the same region of the page: the header, the hero, and the copy directly under it. A change you cannot see here is a change the page cannot show.</p>
<div class="strip">${opts.map((o) => card(o, w)).join('\n')}</div>`;

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

<h2>3. The numbers, at every width</h2>
<table><tr><th>option</th><th>nav name</th><th>nav label</th><th>hero</th><th>bar ground</th><th>name in fold / on page</th><th>near-duplicate pairs</th><th>page height delta</th><th>bar height delta</th><th>first-screen copy delta</th><th>shipped gate</th></tr>
${OPTS.map(numRow).join('\n')}</table>

<div class="note"><b>What the mark floor says about a nav glyph (${letter(OPTS.findIndex((o) => o.label === 'nav-glyph'))}).</b>
The shipped mark is drawn ${floor.drawnAtPx}px wide, at which its thinnest stroke lands ${floor.deviceStrokeAtDrawnPx}px. Its thinnest stroke is ${floor.thinnestStrokeUnits} viewBox units,
so a 1px floor (D119) needs the mark at least <b>${floor.minWidthFor1pxFloorPx}px wide</b>. At 24px the gate measured the strokes at 0.21px, and the mark probe — which reads the
first <code>svg[data-mark]</code> on the page — took the glyph for the hero mark and failed ${((OPTS.find((o) => o.label === 'nav-glyph').gates || [])[0].fails || []).length} checks. A nav glyph is
possible only as its own thing with its own rule, not as the mark.</div>

<h2>4. The copy the page says twice</h2>
<p class="scale">Sentences are compared on content words only, split at terminal punctuation (not at semicolons — this page writes its repeated claims as semicolon pairs). A pair is reported when it shares at least 3 content words and either Jaccard ≥ 0.45 or overlap ≥ 0.5. Jaccard is shared vocabulary over union; overlap is how much of the shorter sentence is inside the longer one.</p>
<table><tr><th>sentence A</th><th>sentence B</th><th>shared words</th><th>jaccard</th><th>overlap</th><th>where</th></tr>
${pairRows}</table>

<h2>5. Deleting one side of each pair — every option is a deletion, not a reword</h2>
<p class="scale">Copy here comes from \`src/content.json\` and ruled strings, so a priced option can only remove an exact sentence. Rewording is a ruling first, and an option that reworded would be pricing the builder's words, not the club's.</p>
${COPY.map(copyCard).join('\n')}

<h2>6. What this round cannot yet answer</h2>
<div class="note">
  <b>a.</b> \`name-lockup\` and \`descriptor-owns-display\` pass the shipped render gate, but \`npm run check:copy\` reads <i>source</i>, and the round mutates the built page. Neither has been run against the copy gate; both move the descriptor between slots, which is exactly what \`slot-coupling\` exists to catch.<br>
  <b>b.</b> No \`design/copy-duplicates.json\` baseline exists yet, so \`check:content\`'s \`near-duplicate-surface\` rule currently carries its exemptions in code. Run \`node scripts/check-content.mjs --print-baseline\` and rule each pair open or accepted.<br>
  <b>c.</b> The gate verdicts for \`chrome-ground\` and \`dup-homework-band-goes\` were re-run after a probe flake (a headless Firefox that never posted); both are now clean, with the retry count in the record.
</div>
</main></body></html>
`;
writeFileSync(OUT, html);
console.log(`specimen: ${OUT} (${(html.length / 1024).toFixed(0)} kB, ${OPTS.length} options, ${PHOTO_WIDTHS.length * OPTS.length} crops)`);
