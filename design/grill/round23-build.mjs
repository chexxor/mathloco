#!/usr/bin/env node
// round23-build.mjs — the round-23 specimen: the ratified logo (row C, D483) put in the 16px TAB, priced with the
// numbers the same run produced. Generated from `design/grill/round23/report.json`; edit
// `design/grill/round23-options.mjs` or re-run `node design/round23.mjs`, NEVER this HTML — a generated page embeds
// what it measured, so a hand-edit here is a claim about a run nobody did (D282). A lookup that finds nothing THROWS.
//
// Why it looks like this. D160: a look question arrives as pictures, at one display factor, from the same load that
// made its numbers. This is the most look-shaped question in the item — "which framing is the club's tab icon" — and
// it is also the question with the least to look at: the tab is 16px, so the pictures ARE the decision and the only
// honest way to show a 16px tab is to show 16px of pixels and a zoom of the same raster beside them.
//
// Plates come from the run, never from this file. `design/round23.mjs` rasterizes each row's svg string at 8x the tab
// size and records the paths; this builder embeds exactly those bytes and throws naming a missing one. It does NOT
// re-render: a second render is a second drawing, and this round's whole argument is about which drawing is the logo.
// True size is CSS `width:` on the 8x raster (16 CSS px out of 128 device px), because a specimen that scales a tab
// glyph up to 200px is a specimen of a thing no browser ever draws.
//
// The chrome colours are read out of src/styles/global.css through design/palette-tokens.mjs — the same single reading
// the runner and check:social's palette-currency rule use — so the specimen cannot invent a colour and cannot go stale
// against a palette round. The candidate golds are the run's declared CANDIDATES (not tokens), and are labelled so.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { paletteTokens } from '../palette-tokens.mjs';

const REPORT = resolve('design/grill/round23/report.json');
const OUT = resolve('design/grill/round-23-tab.html');
if (!existsSync(REPORT)) { console.error('round23-build: no report — run `npm run round23` first'); process.exit(1); }
let R;
try { R = JSON.parse(readFileSync(REPORT, 'utf8')); }
catch (e) { console.error(`round23-build: the report is not readable JSON: ${(e.message || '').slice(0, 200)}`); process.exit(1); }

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round23-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const TOKENS = paletteTokens();
const tok = (name) => {
  const t = TOKENS[name];
  if (!t) throw new Error(`round23-build: src/styles/global.css declares no --color-${name}; the specimen would be inventing a colour`);
  return t;
};
const hash = (bytes) => `#${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;

const ROWS = need(R.rows, 'rows');
if (!ROWS.length) throw new Error('round23-build: the report has no rows');
const WIDTHS = need(R.widths, 'widths');
const BROWSER_WIDTHS = need(R.browserWidths, 'browserWidths');
const FIGURE = need(R.figure, 'figure');
const TAB = need(R.tabSlot, 'tabSlot');
const INC = need(R.incumbent, 'incumbent');
const CONTROLS = need(R.controls, 'controls');
const GOLD = need(R.gold, 'gold');
const GOLD_TABLE = need(GOLD.table, 'gold.table');
const GOLD_CANDIDATES = need(GOLD.candidates, 'gold.candidates');
const GOLD_SS = need(GOLD.searchSpace, 'gold.searchSpace');
const GOLD_BARS = need(GOLD_SS.bars, 'gold.searchSpace.bars');
const GATE_INSTRUMENT = need(R.instrument, 'instrument');

const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d) : '\u2014');
const platePath = (id, ground, w) => {
  const row = ROWS.find((r) => r.id === id);
  if (!row) throw new Error(`round23-build: no row ${id} in the report`);
  const g = row.grounds?.[ground];
  if (!g) throw new Error(`round23-build: row ${id} has no ${ground} pricing in the report`);
  const rec = need(g.plates, `${id}/${ground} plates`);
  if (rec.factor !== 8) throw new Error(`round23-build: ${id}/${ground} plates were rasterized at ${rec.factor}x but this builder's true-size CSS assumes 8x`);
  const p = need(rec.files?.[w], `${id}/${ground} plate at ${w}`);
  if (!existsSync(p)) throw new Error(`round23-build: ${p} is missing — the run that wrote design/grill/round23/report.json did not leave its plates (.design/ is gitignored scratch; re-run \`npm run round23\` before building)`);
  return p;
};
// The run's own raster, embedded. No re-rendering here: this file has no svg string and must not acquire one.
const plate = (id, ground, w, cssPx, label) => {
  const p = platePath(id, ground, w);
  const b64 = readFileSync(p).toString('base64');
  return `<figure><img src="data:image/png;base64,${b64}" width="${cssPx}" alt="${esc(label)}" /><figcaption>${esc(label)}</figcaption></figure>`;
};

// ---------- the controls, read from the record (a specimen with a broken anchor prices nothing) ----------
const INC_ROW = ROWS.find((r) => r.id === 'I0');
if (!INC_ROW) throw new Error('round23-build: the report has no I0 row — the shipped tab is the control of this round (D481 §c) and a round without it has no anchor');
const incumbentProblems = [];
for (const ground of ['paper', 'ink']) {
  const g = INC_ROW.grounds[ground];
  if (!g) { incumbentProblems.push(`I0 has no ${ground} pricing`); continue; }
  if (g.gate?.exit !== 0) incumbentProblems.push(`the shipped artifact fails its own gate on ${ground} (exit ${g.gate?.exit}: ${g.gate?.findings?.join(' | ') || 'no findings quoted'})`);
  if (!(g.sizes?.['16']?.at3Px > 0)) incumbentProblems.push(`the shipped tab paints nothing at or over the graphic bar at 16px on ${ground} (at3Px ${g.sizes?.['16']?.at3Px})`);
}
if (CONTROLS.incumbentGateExit !== 0) incumbentProblems.push(`the round's own control check reports exit ${CONTROLS.incumbentGateExit}`);
if (INC.shippedCopy?.state !== 'identical') incumbentProblems.push(`the built copy ${INC.shippedCopy?.path} is ${INC.shippedCopy?.state} against ${INC.source} (${INC.shippedCopy?.srcSha}/${INC.shippedCopy?.distSha}) — the artifact the site serves is not the artifact this round measured (D245's class)`);
if ((INC.document?.xmlCommentFaults?.length ?? 0) > 0) incumbentProblems.push(`${INC.source} is not well-formed XML: ${INC.document.xmlCommentFaults.length} comment(s) carry "--" (D485)`);
if (INC.document?.parse?.librsvg !== 'OK — the document rasterizes') incumbentProblems.push(`the shipped artifact does not rasterize: ${INC.document?.parse?.librsvg}`);
if (incumbentProblems.length) {
  throw new Error(`round23-build: the CONTROL is broken — ${incumbentProblems.join('; ')}. Fix the artifact or the runner before showing anyone a framing.`);
}
const rowC = ROWS.find((r) => r.id === 'T9');
// Row N0 is the sentence the weight rows exist to answer, so the builder asserts it rather than repeating it.
const N0 = ROWS.find((r) => r.id === 'N0');
if (!N0) throw new Error('round23-build: the report has no N0 row (the hero drawing, no tab tuning). The weight rows exist because N0 paints nothing at the tab bar at 16px; without it that claim is a quotation, not a measurement.');
for (const ground of ['paper', 'ink']) {
  const s = N0.grounds?.[ground]?.sizes?.['16'];
  if (!s) throw new Error(`round23-build: N0 has no 16px measurement on ${ground}`);
  if (s.at3Px !== 0) throw new Error(`round23-build: N0 at 16px on ${ground} now paints ${s.at3Px} pixels at/over 3.0 (max contrast ${s.maxContrast}). The specimen's claim that the untuned hero drawing has no legible ink at tab size is no longer measured, so the reason this round has weight rows has changed — rewrite the specimen's prose, do not reprint it.`);
}
if (!rowC) throw new Error('round23-build: the report has no T9 row (row C in a tab). The price this round was commissioned to record is the tab gate refusing row C, so a report without it cannot be shown.');
for (const c of need(CONTROLS.rowCRefused, 'controls.rowCRefused')) {
  if (c.exit !== 1) throw new Error(`round23-build: row C on ${c.ground} came back exit ${c.exit}, not refused. The tab gate's rule 3/5 price is no longer what this page says it is — re-derive this specimen, do not reprint it.`);
}
for (const c of need(CONTROLS.goldGate, 'controls.goldGate')) {
  for (const gr of c.grounds) {
    if (gr.exit !== c.expected.exit) {
      throw new Error(`round23-build: gold row ${c.id} on ${gr.ground} came back exit ${gr.exit} but the record states exit ${c.expected.exit} (${c.expected.why}). The specimen would be stating a gate price the gate does not charge.`);
    }
    if (c.expected.string && !gr.findings.some((f) => f.includes(c.expected.string))) {
      throw new Error(`round23-build: gold row ${c.id} on ${gr.ground} exited ${gr.exit} with no finding naming "${c.expected.string}" — the record states WHICH rule refuses it and that rule is not what fired.`);
    }
  }
}

// ---------- shared table pieces ----------
const gateBlock = (id, ground, g) => {
  const planTxt = g.plan?.note ?? `${g.plan?.distinct} colour token(s): ${g.plan?.tokens?.map((t) => `--color-${t}`).join(', ')}`;
  const verdict = g.gate.exit === 0
    ? '<span class="pass">exit 0 \u00b7 PASSES all five rules</span>'
    : `<span class="fail">exit ${g.gate.exit} \u00b7 REFUSED</span>`;
  const findings = g.gate.findings.length
    ? `<ul class="findings">${g.gate.findings.map((f) => `<li>${esc(f.replace(/^.*?\/tmp-round23\//, ''))}</li>`).join('')}</ul>`
    : '';
  return `<table class="gate"><thead><tr><th>gate on this artifact</th><th>paints</th><th>verdict</th></tr></thead><tbody><tr><td><code>${esc(id)}.${esc(ground)}.svg</code></td><td>${esc(planTxt)}</td><td>${verdict}${findings}</td></tr></tbody></table>
  <p class="meta">gate headline as it printed: <code>${esc(g.gate.headline.replace(/^.*?\/home\/chexxor\/Git\/mathloco\//, ''))}</code></p>`;
};

const fitRows = (g) => WIDTHS.map((n) => {
  const s = g.sizes?.[n];
  if (!s) throw new Error(`round23-build: no ${n}px measurement in this record`);
  const feats = s.features.ringDiameterPx != null
    ? `ring ${s.features.ringDiameterPx} \u00b7 stroke ${s.features.strokeMinPx}\u2013${s.features.strokeMaxPx} \u00b7 dot \u2300 ${s.features.dotDiameterPx} \u00b7 arm ${s.features.angleArmPx} \u00b7 feet ${s.features.footSeparationPx} \u00b7 dash ${s.features.dashOnPx}/${s.features.dashOffPx}`
    : `glyph ${num(s.features.glyphPctOfPlate * 100, 1)}% of the plate (the incumbent has no shapes to size)`;
  const clip = s.clipUnits ? `${s.clipUnits.left}/${s.clipUnits.right}/${s.clipUnits.top}/${s.clipUnits.bottom}u (max ${s.clipUnits.max}u)` : '\u2014';
  return `<tr><td class="n"><strong>${n}px</strong></td><td class="n">${s.canvas} \u2192 ${s.drawW}\u00d7${s.drawH} @${s.rect.left},${s.rect.top}</td>
    <td class="n ${s.blankPx > 0 ? 'warn' : ''}">${s.blankPx} (${s.blankPct}%)</td>
    <td class="n">${s.anyPx}</td><td class="n ${s.at3Px === 0 ? 'fail' : ''}"><strong>${s.at3Px}</strong> (${s.coveragePct}%)</td>
    <td class="n">${s.fullPx}</td><td class="n">${num(s.maxContrast)}</td><td>${esc(feats)}</td><td>${esc(clip)}</td></tr>`;
}).join('');

const survivalTable = (g) => {
  if (!g.survival.length) return `<p class="meta">${esc(g.note ?? '')}</p>`;
  const cells = (row) => row.map((s) => `<td class="${s.at3Px >= 4 ? 'on' : s.at3Px > 0 ? 'part' : 'off'}"><span class="slot">${esc(s.slot)}</span><span class="n">stroke ${s.swDevice}px</span><span class="n">any ${s.anyPx} \u00b7 at3 <strong>${s.at3Px}</strong> \u00b7 full ${s.fullPx}</span><span class="n">max ${num(s.maxContrast)}</span></td>`).join('');
  return `<table class="surv"><thead><tr>${g.survival.map((s) => `<th>${esc(s.slot)}<span class="sub">${esc(s.drawn)}</span></th>`).join('')}</tr></thead><tbody><tr>${cells(g.survival)}</tr></tbody></table>`;
};

const dashTable = (g) => {
  if (!g.runs.length) return `<p class="meta">${esc(g.note ?? '')}</p>`;
  const at = [16, 32];
  const rows = at.map((n) => {
    const rear = g.runs.find((x) => x.n === n && x.slot === 'rear');
    const front = g.runs.find((x) => x.n === n && x.slot === 'front');
    if (!rear || !front) throw new Error(`round23-build: no rear/front dash walk at ${n}px — the record prices the depth cue and cannot print it`);
    const fused = rear.runs === 1;
    return `<tr><td class="n"><strong>${n}px</strong></td>
      <td class="n">${rear.onInkPct}% ink \u00b7 ${rear.runs} run${rear.runs === 1 ? '' : 's'} \u00b7 longest ${rear.longestRunPx}px</td>
      <td class="n">${front.onInkPct}% ink \u00b7 ${front.runs} run${front.runs === 1 ? '' : 's'} \u00b7 longest ${front.longestRunPx}px</td>
      <td class="${fused ? 'fail' : 'pass'}">${fused ? '<strong>FUSED</strong> \u2014 the dashed rear arc has become one continuous run with the front arc: the logo\'s only depth cue is gone at this size' : `still ${rear.runs} separate runs \u2014 the equator still reads as dashed behind the sphere`}</td>
      <td class="sub">${rear.samples} samples walked along each arc's own geometry (not off colour)</td></tr>`;
  }).join('');
  return `<table class="dash"><thead><tr><th>size</th><th>rear (dashed) arc</th><th>front arc</th><th>the depth cue</th><th>how</th></tr></thead><tbody>${rows}</tbody></table>`;
};

const clipTable = (g) => {
  const keys = Object.keys(g.clip ?? {});
  if (!keys.length) return `<p class="meta">${esc(g.note ?? '')}</p>`;
  return `<table class="clip"><thead><tr><th>size</th><th>worst spill outside the frame</th><th>pad used to catch it</th><th>pixels the tab cannot show</th><th>of those, at/over 3</th></tr></thead><tbody>${keys.map((n) => {
    const c = g.clip[n];
    return `<tr><td class="n">${n}px</td><td class="n ${c.worstDevicePx < 1 ? 'warn' : ''}">${c.worstDevicePx}px</td><td class="n">${c.padPx}px</td><td class="n">${c.clipLossPx}</td><td class="n">${c.clipAt3Px}</td></tr>`;
  }).join('')}</tbody></table>`;
};

const browserTable = (g) => {
  const rows = BROWSER_WIDTHS.map((n) => {
    const br = g.browser?.[n];
    const a = g.agreement?.[n];
    if (!br) throw new round23buildErr(`no browser reading at ${n}`);
    const pair = (k) => a ? `${a[k][0]} | ${a[k][1]}` : `${br[k]} | (no librsvg pair)`;
    return `<tr><td class="n"><strong>${n}px</strong></td><td class="n">${br.box.join('\u00d7')} (shot ${br.shot})</td><td class="n">${pair('anyPx')}</td><td class="n">${pair('at3Px')}</td><td class="n">${pair('maxContrast')}</td></tr>`;
  }).join('');
  return `<table class="agree"><thead><tr><th>tab size</th><th>crop box</th><th>ink px (librsvg | firefox)</th><th>at/over 3.0</th><th>max contrast</th></tr></thead><tbody>${rows}</tbody></table>`;
};
function round23buildErr(m) { return new Error(`round23-build: ${m} — the record prices this and cannot print it`); }

// ---------- one row of the specimen ----------
const groundBlock = (r, ground) => {
  const g = r.grounds[ground];
  if (!g) throw new Error(`round23-build: row ${r.id} has no ${ground} pricing`);
  const plates = WIDTHS.map((n) => plate(r.id, ground, n, n, `${r.id} on ${ground}, ${n}px tab, drawn at true size`)).join('')
    + WIDTHS.map((n) => plate(r.id, ground, n, n * 8, `${r.id} on ${ground}, the same ${n}px raster shown at 8\u00d7 (no re-render)`)).join('');
  const weight = r.weight?.at
    ? `stroke weight scaled by <strong>k ${r.weight.k}</strong> so the thinnest line lands ${r.weight.floorPx} device px at ${r.weight.at}px (plate stroke ${r.weight.swMin}\u2013${r.weight.swMax}u; device scale ${r.weight.scale}px per unit)`
    : r.incumbent ? 'the shipped artifact, untuned' : `<strong>no tuning</strong> \u2014 the hero\u2019s own drawing, dropped into a ${TAB.px}px box`;
  const colourNote = g.warm
    ? `<p class="meta">warm family on this ground: ${g.warm.map((w) => `<code>--color-${w.token}</code> ${esc(w.hex)} hue ${w.hue} vs ${ground} <strong>${num(w.vsGround)}</strong> ${w.clearsPairBar ? 'clears the tab bar 4.5' : '<span class="fail">fails 4.5</span>'} ${w.clearsGraphicBar ? 'clears the graphic bar 3' : '<span class="fail">fails 3</span>'}`).join(' \u00b7 ')}</p>`
    : g.gold
      ? `<p class="meta">gold candidate on this ground: <strong>${esc(need(g.gold.candidate, `${r.id}/${ground} gold candidate name`))}</strong> = ${esc(need(g.gold.spec, `${r.id}/${ground} gold spec`))} \u2192 <span class="chip" style="background:${esc(g.gold.spec)}"></span> ${esc(hash(need(g.gold.bytes, `${r.id}/${ground} gold bytes`)))} \u00b7 ${g.gold.token ? 'a declared token' : '<span class="cand">candidate, NOT a token @theme renders</span>'} \u00b7 declared by ${esc(need(g.gold.declaredBy, `${r.id}/${ground} gold declaredBy`))} \u00b7 solved for the window <strong>${esc(need(g.gold.solve.window, `${r.id}/${ground} gold window`))}</strong> against ${esc(need(g.gold.solve.against, `${r.id}/${ground} gold against`))} at the ${esc(need(g.gold.solve.bar, `${r.id}/${ground} gold bar`))} bar ${num(g.gold.solve.ratioAgainst)} \u00b7 its own ground reads ${num(g.gold.solve.ratioVsOwnGround)} \u00b7 region window at ${GOLD_BARS.region}: ${esc(g.gold.solve.regionWindow ?? 'none')}${g.gold.solve.belowFloor ? ` \u00b7 <strong>below the gold-ness floor L ${GOLD_SS.lFloor}</strong>: legal, and reads as bronze/ochre rather than gold` : ' \u00b7 reads as gold'} \u00b7 nearest brand ${esc(need(g.gold.solve.nearestBrand, `${r.id}/${ground} gold nearestBrand`))} d=${num(g.gold.solve.brandDist, 3)} \u00b7 vs --color-accent \u0394OKLab ${num(g.gold.solve.distToAccent, 3)}, hue gap ${g.gold.solve.hueGapToAccent}\u00b0</p>`
      : '';
  return `<section class="ground">
  <h3>${esc(ground)} ground</h3>
  <p class="meta">colour plan: ${esc(g.plan?.note ?? g.plan?.tokens?.map((t) => `--color-${t}`).join(' + ') ?? 'none')} \u00b7 ${weight}</p>
  <div class="shots">${plates}</div>
  ${colourNote}
  <h4>the gate, read aloud (\`scripts/check-favicon.mjs\` run as a subprocess on this exact artifact, not reimplemented here)</h4>
  ${gateBlock(r.id, ground, g)}
  <h4>fit and paint at the tab sizes (librsvg)</h4>
  <table><thead><tr><th>tab</th><th>canvas \u2192 draw box @offset</th><th>blank tab px</th><th>any ink px</th><th>at/over 3.0</th><th>full px</th><th>max contrast</th><th>what the features became</th><th>frame clip (plate units)</th></tr></thead><tbody>${fitRows(g)}</tbody></table>
  <h4>survival at 16px: which of the eight shapes lands, shape by shape</h4>
  ${survivalTable(g)}
  <h4>the equator: dashed behind the sphere, or fused with the front arc</h4>
  ${dashTable(g)}
  <h4>clip in ink: pixels the framing pushes outside its own frame</h4>
  ${clipTable(g)}
  <h4>the same fixture in a real browser (headless firefox), paired with librsvg</h4>
  ${browserTable(g)}
</section>`;
};

const rowSection = (r) => {
  return `<section class="opt" id="${r.id}">
  <h2><span class="oid">${r.id}</span>${r.incumbent ? ' <span class="ctl">CONTROL \u00b7 SHIPPED TODAY</span>' : ''} ${esc(need(r.label, `${r.id} label`))}</h2>
  <p class="reading">${esc(need(r.reading, `${r.id} reading`))}</p>
  <p class="meta"><strong>framing:</strong> ${esc(need(r.framing, `${r.id} framing`))} \u2014 ${esc(need(r.framingWhy, `${r.id} framingWhy`))} \u00b7 <strong>why this row exists:</strong> ${esc(need(r.byrne, `${r.id} byrne`))}</p>
  ${groundBlock(r, 'paper')}
  ${groundBlock(r, 'ink')}
</section>`;
};

// ---------- the gold section ----------
const goldTableRows = GOLD_TABLE.map((t) => {
  if (t.note) return `<tr><td>${esc(t.role)} on ${esc(t.ground)} <span class="sub">held against ${esc(t.against)}</span></td><td class="n">${t.H}</td><td class="n">${t.C}</td><td colspan="6">${esc(t.note)}</td></tr>`;
  return `<tr>
  <td>${esc(t.role)} on ${esc(t.ground)} <span class="sub">held against ${esc(t.against)}</span></td>
  <td class="n">${t.H}</td><td class="n">${t.C}</td>
  <td class="n">${esc(t.window)}</td>
  <td>${`<span class="chip" style="background:${esc(t.spec)}"></span><span class="sl">L ${t.L}</span><span class="ss">${esc(t.spec)}</span>`}</td>
  <td class="n ${t.ratioAgainst >= GOLD_BARS.pair ? 'pass' : 'fail'}">${num(t.ratioAgainst)}</td>
  <td class="n">${esc(t.regionWindow ?? 'none')} <span class="sub">at ${GOLD_BARS.region}</span></td>
  <td class="${t.belowFloor ? 'fail' : 'pass'}">${t.belowFloor ? `<strong>below the floor L ${GOLD_SS.lFloor}</strong> \u2014 legal, reads as bronze/ochre` : 'reads as gold'}</td>
  <td>${esc(t.nearestBrand)} <span class="n">d=${num(t.brandDist, 3)}</span>${t.sameColourAsBrand ? ' <strong>SAME COLOUR</strong>' : ''}<span class="sub">vs accent d=${num(t.distToAccent, 3)} \u00b7 hue gap ${t.hueGapToAccent}\u00b0</span></td>
</tr>`;
}).join('');

const goldCandidateCards = Object.entries(GOLD_CANDIDATES).map(([k, v]) => `<tr>
  <td><strong>${esc(v.name)}</strong><span class="sub">${esc(k)} \u00b7 ${esc(v.declaredBy)}</span></td>
  <td>${`<span class="chip" style="background:${esc(v.spec)}"></span><span class="sl">${esc(v.spec)}</span><span class="ss">${esc(hash(v.bytes))}</span>`}</td>
  <td>${v.token ? 'a declared token' : '<span class="cand">candidate \u2014 not a token yet</span>'}</td>
  <td class="n">${esc(v.windowPair)}</td><td class="n">${num(v.ratioAgainst)}</td>
  <td class="${v.belowFloor ? 'fail' : 'pass'}">${v.belowFloor ? 'below the gold-ness floor' : 'reads as gold'}</td>
</tr>`).join('');

const warmMatrixRows = GOLD.referents.warm.matrix.cells.map((c) => `<tr>
  <td><code>--color-${esc(c.token)}</code> <span class="sub">hue ${c.hue}</span></td>
  <td>${esc(c.ground)}</td>
  <td>${`<span class="chip" style="background:${esc(c.spec)}"></span><span class="sl">${esc(c.hex)}</span><span class="ss">${esc(c.spec)}</span>`}</td>
  <td class="n">${num(c.vsGround)}</td>
  <td class="${c.clearsPairBar ? 'pass' : 'fail'}">${c.clearsPairBar ? 'clears' : 'fails'} the tab pair bar ${GOLD_BARS.pair}</td>
  <td class="${c.clearsGraphicBar ? 'pass' : 'fail'}">${c.clearsGraphicBar ? 'clears' : 'fails'} the graphic bar ${GOLD.referents.warm.matrix.graphicBar}</td>
</tr>`).join('');

// ---------- prose that the run backs ----------
const goldGateRows = CONTROLS.goldGate.map((c) => `<tr><td><strong>${c.id}</strong></td><td>${esc(c.expected.why)}</td>
  <td>${c.grounds.map((gr) => `on ${gr.ground}: <span class="${gr.exit === 0 ? 'pass' : 'fail'}">exit ${gr.exit}</span>${gr.findings.length ? ` <span class="sub">${esc(gr.findings.map((f) => f.replace(/^.*?\/tmp-round23\//, '')).join(' \u2014 '))}</span>` : ''}`).join('<br />')}</td></tr>`).join('');
const rowCRefusalRows = CONTROLS.rowCRefused.map((c) => `<tr><td>row C on <strong>${esc(c.ground)}</strong></td><td><span class="fail">exit ${c.exit}</span></td><td>${c.findings.map((f) => `<div class="sub">${esc(f.replace(/^.*?\/tmp-round23\//, ''))}</div>`).join('')}</td></tr>`).join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Round 23 \u2014 the club logo in the 16px tab: framings and weights, priced, not applied</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
/* Specimen chrome only. The pictures carry the run's own raster; nothing here restyles them. */
:root {
  --paper: ${tok('paper').spec}; --ink: ${tok('ink').spec}; --ink2: ${tok('ink-2').spec}; --ink3: ${tok('ink-3').spec};
  --rule: ${tok('rule').spec}; --panel: ${tok('panel').spec};
}
body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 system-ui, sans-serif; }
.spec { max-width: 82rem; margin: 0 auto; padding: 1.5rem 1rem 5rem; }
h1 { font-size: 1.5rem; font-weight: 800; margin: 0 0 .4rem; }
h2 { font-size: 1.1rem; font-weight: 700; margin: 1.8rem 0 .4rem; }
h3 { font-size: .95rem; font-weight: 700; margin: 1.2rem 0 .3rem; }
h4 { font-size: .8rem; font-weight: 600; margin: .8rem 0 .25rem; color: var(--ink2); }
p { max-width: 88ch; font-size: .9rem; color: var(--ink2); }
.ask { border-left: 3px solid var(--rule); padding: .4rem .8rem; font-size: .95rem; color: var(--ink); }
.opt { margin-top: 2.4rem; border-top: 2px solid var(--rule); padding-top: 1rem; }
.ground { border-top: 1px dashed var(--rule); margin-top: 1rem; padding-top: .6rem; }
.oid { display: inline-block; width: 1.9rem; font-variant-numeric: tabular-nums; }
.ctl { display: inline-block; font-size: .68rem; text-transform: uppercase; letter-spacing: .06em; border: 1px solid var(--rule); padding: 0 .35rem; margin-right: .4rem; color: var(--ink2); }
.reading { color: var(--ink); font-weight: 600; }
.shots { display: flex; flex-wrap: wrap; gap: .7rem 1rem; align-items: end; margin: .6rem 0; }
figure { margin: 0; }
figure img { display: block; border: 1px solid var(--rule); image-rendering: pixelated; }
figcaption { font-size: .68rem; color: var(--ink3); max-width: 16rem; }
table { border-collapse: collapse; font-size: .74rem; margin-top: .4rem; }
th, td { border: 1px solid var(--rule); padding: .25rem .45rem; text-align: left; vertical-align: top; }
th { background: var(--panel); font-weight: 600; }
td.on { background: color-mix(in oklab, var(--rule) 26%, transparent); }
td.part { background: color-mix(in oklab, var(--rule) 12%, transparent); }
td.off { background: color-mix(in oklab, #8a1c1c 12%, transparent); }
td .slot { display: block; font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; color: var(--ink3); }
.n { font-variant-numeric: tabular-nums; }
.sub { display: block; font-size: .68rem; color: var(--ink3); }
.pass { color: #1c6b3f; font-weight: 700; }
.fail { color: #8a1c1c; font-weight: 700; }
.warn { color: #8a5a10; font-weight: 600; }
.meta { font-size: .78rem; color: var(--ink3); }
.findings { font: .72rem/1.45 ui-monospace, monospace; color: var(--ink2); margin: .3rem 0 0; padding-left: 1rem; }
.chip { display: inline-block; width: 2.4rem; height: 1.1rem; border: 1px solid var(--rule); vertical-align: middle; margin-right: .35rem; }
.sl { font-weight: 600; font-variant-numeric: tabular-nums; } .ss { color: var(--ink3); font-variant-numeric: tabular-nums; font-size: .72rem; }
.cand { color: #8a5a10; font-weight: 600; }
ul { font-size: .85rem; color: var(--ink2); max-width: 92ch; }
li { margin-bottom: .4rem; }
blockquote { border-left: 3px solid var(--rule); margin: .5rem 0; padding: .4rem .8rem; font: .78rem/1.45 ui-monospace, monospace; color: var(--ink2); white-space: pre-wrap; }
</style></head>
<body>
<div class="spec">
<h1>Round 23 \u2014 the club logo in the 16px tab: framings and weights, priced, not applied</h1>
<p class="ask">${esc(need(GOLD.steer, 'gold.steer'))}</p>
<p>${esc(need(R.ask, 'ask'))}</p>
<p><strong>Nothing here is applied.</strong> Colour on this site is operator-ratified (D316) and the tab artifact is a one-way door for the site's own gates (D479), so this round prices and the pick stays the operator's. Every picture is the run's own raster: each row's SVG string, rasterized <strong>once</strong> at 8\u00d7 the tab size by the same instrument that counted its pixels, then embedded. This page does not re-render anything, and a 16px picture here is 16 CSS px of a 128px raster \u2014 what a browser is actually asked to draw.</p>
<p class="meta">measured ${esc(String(need(R.measuredAt, 'measuredAt')))} \u00b7 instrument: ${esc(GATE_INSTRUMENT)} \u00b7 tab slot <strong>${TAB.px}\u00d7${TAB.px}</strong> (${esc(TAB.source)}) \u00b7 tab pair bar <strong>${GOLD_BARS.pair}</strong> (check:favicon rule 4) \u00b7 graphic line bar <strong>3.0</strong> \u00b7 filled-region layer bar <strong>${GOLD_BARS.region}</strong> (D101) \u00b7 rows: <code>design/grill/round23-options.mjs</code> \u00b7 instrument: <code>logo-tab.mjs</code> \u00b7 record: <code>design/grill/round23/report.json</code></p>

<h2>1. The control: the tab as it ships today (row I0)</h2>
<p>Everything below is a delta from this. <code>${esc(INC.source)}</code> is a ${INC.parsed.width}\u00d7${INC.parsed.height} plate (viewBox "${esc(INC.parsed.viewBox)}", rx ${esc(INC.parsed.rx)}) painting ${INC.parsed.paints.map((p) => `<code>${esc(p)}</code>`).join(' and ')} with the club's summand <strong>${esc(INC.parsed.glyph.char)}</strong> in ${esc(INC.parsed.glyph['font-family'])} ${esc(INC.parsed.glyph['font-size'])} \u2014 ${INC.parsed.shapesPainted} paints, which is why it passes. Its built copy <code>${esc(INC.shippedCopy.path)}</code> is <span class="pass">${esc(INC.shippedCopy.state)}</span> (${esc(INC.shippedCopy.srcSha)} / ${esc(INC.shippedCopy.distSha)}), and the document parses: ${esc(INC.document.parse.librsvg)}.</p>
<table><thead><tr><th>tab</th><th>canvas \u2192 draw box @offset</th><th>blank tab px</th><th>any ink px</th><th>at/over 3.0</th><th>full px</th><th>max contrast</th><th>what the features became</th></tr></thead>
<tbody>${['paper', 'ink'].map((gr) => {
  const s = INC_ROW.grounds[gr].sizes['16'];
  return `<tr><td class="n"><strong>16px</strong> on ${gr}</td><td class="n">${s.canvas} \u2192 ${s.drawW}\u00d7${s.drawH} @${s.rect.left},${s.rect.top}</td><td class="n">${s.blankPx} (${s.blankPct}%)</td><td class="n">${s.anyPx}</td><td class="n"><strong>${s.at3Px}</strong> (${s.coveragePct}%)</td><td class="n">${s.fullPx}</td><td class="n">${num(s.maxContrast)}</td><td>glyph ${num(s.features.glyphPctOfPlate * 100, 1)}% of the plate</td></tr>`;
}).join('')}</tbody></table>
<div class="shots">${['paper', 'ink'].flatMap((gr) => [plate('I0', gr, 16, 16, `shipped tab, ${gr}, true size`), plate('I0', gr, 16, 128, `shipped tab, ${gr}, same raster at 8\u00d7`)]).join('')}</div>

<h2>2. The drawing that has to fit (the logo's own numbers, not a re-drawing)</h2>
<p>The plate is the hero's: <strong>${FIGURE.plate.w}\u00d7${FIGURE.plate.h}u</strong>, ring ${FIGURE.ring.r}u at (${FIGURE.ring.cx},${FIGURE.ring.cy}), ink bounding box ${FIGURE.inkBox.w}\u00d7${FIGURE.inkBox.h}u at (${FIGURE.inkBox.x},${FIGURE.inkBox.y}), sphere span <strong>${FIGURE.sphereSpanUnits}u</strong>, strokes <strong>${FIGURE.minStrokeUnits}\u2013${FIGURE.maxStrokeUnits}u</strong>, pole dot \u2300 ${FIGURE.dotDiameterUnits}u, right-angle arm ${FIGURE.angleArmUnits}u, feet ${FIGURE.footSeparationUnits}u apart, equator dash ${FIGURE.equatorDash.join('/')}. At 16px the tab is 16 device px, so the plate's 240u is 0.067 device px per unit and a 1.4u line is <strong>0.09 device px</strong> \u2014 roughly 17\u00d7 under the ~1.5 device px a line has to reach before it is ink at all (D119). That one sentence is why this round has weight rows.</p>

<h2>3. The gate, read aloud: what the tab gate refuses today</h2>
<p><code>scripts/check-favicon.mjs</code> was run as a subprocess on every artifact this round produced \u2014 never reimplemented here \u2014 and each row's reading is quoted below in its own box. Two readings the whole item has to reckon with:</p>
<table><thead><tr><th>the row</th><th>what it would take</th><th>what the gate says</th></tr></thead><tbody>${rowCRefusalRows}${goldGateRows}</tbody></table>
<p><strong>Row ${rowC.id}</strong> is the ratified hero colouring dropped into a tab: the gate refuses it on both grounds, because a tab logo is <em>one ground and one glyph</em> (rule 3) and two of row C's hues are reserved for join paths (rule 5). Rows <strong>G2\u2013G4</strong> are refused too \u2014 G2 for a third paint, G3/G4 because a solved gold literal is not a token @theme renders (rule 2). Row <strong>G1</strong> passes with no new token and no ruling. The consequence for the ruling: <em>a logo in the tab is not the hero's colouring at a smaller size.</em> Something has to give \u2014 the tab gate's rules, the logo's colour table, or the logo's own colouring \u2014 and this round is priced so the operator chooses which, rather than discovering it after the pick (D479: a gate is re-derived, never bypassed).</p>

<h2>4. Gold: the steer, the arithmetic, and what it does not settle</h2>
<p>The operator's steer is quoted at the top of this page. There are two things on this site that "gold" could mean, and they cost opposite amounts.</p>
<table><thead><tr><th>token</th><th>ground</th><th>colour</th><th>vs that ground</th><th>tab pair bar ${GOLD_BARS.pair}</th><th>graphic bar ${GOLD.referents.warm.matrix.graphicBar}</th></tr></thead><tbody>${warmMatrixRows}</tbody></table>
<p><strong>The warm family</strong> (${esc(GOLD.referents.warm.what)}) costs nothing: it is declared, shipped, and row G1 shows the gate accepting it. But note the asymmetry the matrix measures \u2014 <code>--color-accent</code> clears 4.5 on paper (${num(GOLD.referents.warm.matrix.cells.find((c) => c.ground === 'paper').vsGround)}) and only ${num(GOLD.referents.warm.matrix.cells.find((c) => c.ground === 'ink').vsGround)} on ink, so which end of the warm family a ground may use is not a preference, it is which end clears the bar.</p>
<p><strong>The true gold</strong> (${esc(GOLD.referents.trueGold.what)}) costs ${esc(GOLD.referents.trueGold.costs)}.</p>
<p>Search space: hues ${GOLD_SS.hues.join(' / ')} \u00d7 chroma ${GOLD_SS.chromas.join(' / ')}; the gold-ness floor is <strong>L ${GOLD_SS.lFloor}</strong> (${esc(GOLD_SS.lFloorSource)}); the bars are ${esc(GOLD_SS.bars.pairSource)} and ${esc(GOLD_SS.bars.regionSource)}. The window below is the set of lightnesses that clear the bar \u2014 the chosen L is at the edge nearest gold-ness.</p>
<table><thead><tr><th>job / ground</th><th>hue</th><th>chroma</th><th>legal L window</th><th>the colour at the take</th><th>measures</th><th>as a region</th><th>gold-ness</th><th>nearest brand / nearest accent</th></tr></thead><tbody>${goldTableRows}</tbody></table>
<table><thead><tr><th>declared candidate</th><th>colour</th><th>status</th><th>window it came from</th><th>measures</th><th>gold-ness</th></tr></thead><tbody>${goldCandidateCards}</tbody></table>
<ul>
<li><strong>The asymmetry, in one sentence.</strong> On paper the palest gold the 4.5 bar allows is <strong>L 55</strong>, which is <em>below</em> the lightness at which a hue 62\u201375 reads as gold \u2014 it reads bronze/ochre. On ink the darkest gold the bar allows is <strong>L 60</strong>, which does read as gold. So "gold on the light page" and "gold that looks like gold" are not simultaneously available, and the plate case inverts it: a gold GROUND is judged against the lines drawn over it at the pair bar, not at the 1.35 layer bar.</li>
<li><strong>The same bytes appear twice.</strong> <code>gold-line-ink</code> and <code>gold-plate-paper</code> both solve to ${esc(GOLD_CANDIDATES['line-ink'].spec)} \u2192 ${esc(hash(GOLD_CANDIDATES['line-ink'].bytes))}: one colour, two jobs.</li>
<li><strong>What this round does NOT decide.</strong> Whether a hue 75 (39\u00b0 from --color-accent) is admissible under round 3b's new-hue convention is <em>not</em> settled here \u2014 <code>scripts/check-contrast.mjs</code> runs its hue-gap rule over its own reserved map, and what that map reserves for the logo is a separate reading. Stated as a question with its numbers (26\u00b0 at hue 62, 39\u00b0 at hue 75), not as a refusal.</li>
</ul>

<h2>5. The rows</h2>
${ROWS.map(rowSection).join('\n')}

<h2>6. How to read this page</h2>
<ul>
<li><strong>Row ${N0.id}</strong> is the hero's drawing dropped into the tab with nothing tuned: at 16px it has <strong>${N0.grounds.paper.sizes['16'].at3Px} pixels at or over the 3.0 bar</strong> on paper and <strong>${N0.grounds.ink.sizes['16'].at3Px}</strong> on ink (its best contrast there is ${num(N0.grounds.paper.sizes['16'].maxContrast)} / ${num(N0.grounds.ink.sizes['16'].maxContrast)}). Everything that follows exists because of that sentence.</li>
<li><strong>T1\u2013T4, T7\u2013T9</strong> centre the tab on the <em>sphere</em> and change only the stroke weight (and, in T7, the padding, and in T8/T9 the colour plan). <strong>T5/T6</strong> put the whole 240\u00d7150 plate in the tab: T5 letterboxes it, so ${(ROWS.find((r) => r.id === 'T5').grounds.paper.sizes['16'].blankPx)} of ${ROWS.find((r) => r.id === 'T5').grounds.paper.sizes['16'].boxPx} tab px (${ROWS.find((r) => r.id === 'T5').grounds.paper.sizes['16'].blankPct}%) are the ground showing through with no logo on it.</li>
<li><strong>Read three columns before liking a weight.</strong> The <em>at/over 3.0</em> count is legibility. The <em>survival</em> table is which of the eight shapes still lands \u2014 at 16px some of them land on a single pixel. The <em>dash</em> table is whether the rear arc is still dashed: where it reads FUSED, the sphere has lost its only depth cue and reads as a circle with lines on it. The <em>clip</em> table is what the framing pushes outside its own frame and the tab therefore cannot show.</li>
<li><strong>The two grounds are not decoration.</strong> A browser draws the tab on whatever chrome colour the user's browser and OS put behind it. Paper is the light chrome, ink the dark one; a colour that works on one can fail on the other and the artifact has to be a single file.</li>
<li><strong>The pictures are the measurement.</strong> True size first, then the identical raster at 8\u00d7. No zoom, no re-render, no CSS filter: if a shape is gone at 16px it is gone in the browser too, and the firefox column above each row is the check on that (librsvg | firefox paired per size).</li>
<li><strong>The delegate's ranked recommendation is not on this page.</strong> It belongs to the session report and <code>.notes/NEXT.md</code>, where it carries its pros, cons and the measurement that would change it; a specimen prices, it does not argue (D160).</li>
<li>Specimen chrome only: this page's own type and spacing are not the site's. The photographs are the run's raster.</li>
</ul>
</div></body></html>`;

writeFileSync(OUT, html);
const plates = ROWS.reduce((n, r) => n + ['paper', 'ink'].reduce((m, g) => m + (r.grounds[g]?.plates ? Object.keys(r.grounds[g].plates.files).length : 0), 0), 0);
console.log(`round23-build: ${ROWS.length} rows x 2 grounds, ${plates} plates embedded (true size + 8x each) -> ${OUT} (${(html.length / 1024).toFixed(0)}k)`);
