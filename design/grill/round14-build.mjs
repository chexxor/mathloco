#!/usr/bin/env node
// round14-build.mjs — the round-14 specimen: five whole pages at one scale, side by side, and the numbers the
// same loads produced. Generated from `design/grill/round14/report.json`.
//
//   node design/grill/round14-build.mjs        # after `npm run round14` has written the report
//
// Edit the builder or `design/grill/round14-options.mjs`, NEVER the HTML: the generated page embeds the numbers
// it measured, so a hand-edit is a claim about a build. A lookup that finds nothing THROWS.
//
// D160 is the reason this file looks the way it does: every option is photographed, at one display factor, from
// the load that made its numbers. Reading the page is the thing being decided, so the specimen shows pages.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORT = resolve('design/grill/round14/report.json');
const OUT = resolve('design/grill/round-14-page.html');
if (!existsSync(REPORT)) { console.error('round14-build: no report — run `npm run round14` first'); process.exit(1); }
const R = JSON.parse(readFileSync(REPORT, 'utf8'));

const THEMED = readFileSync(resolve('src/styles/global.css'), 'utf8');
const tok = (name) => {
  const m = THEMED.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`round14-build: --color-${name} is not in the token block — the specimen would be inventing a colour`);
  return m[1].trim();
};
const C = { paper: tok('paper'), panel: tok('panel'), ink: tok('ink'), ink2: tok('ink-2'), ink3: tok('ink-3'), rule: tok('rule'), gold: tok('gold') };

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round14-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const OPTS = need(R.options, 'options');
if (!OPTS.length) throw new Error('round14-build: the report has no options');
const BASE = need(R.baseline, 'baseline');
const WIDTHS = Object.keys(BASE.at).map(Number);
if (!WIDTHS.length) throw new Error('round14-build: the baseline records no widths');
const b64 = (p) => (p && existsSync(p) ? readFileSync(p).toString('base64') : null);
const box = (b) => (b ? `${b.w}×${b.h}` : '—');
const gateVerdict = (g) => g.fails.length ? `${g.fails.length} FAIL` : (g.gaps?.length ? `unmeasured ×${g.gaps.length}` : 'green');
const gateCell = (g) => g.fails.length ? 'bad' : (g.gaps?.length ? 'warn' : 'ok');
const at = (o, w) => need(o.at[w], `${o.id} @${w}`);
const num = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d) : '—');
const signed = (s) => (s === undefined ? '—' : s);

// The letter is derived from the table's order, exactly as in round 13, so an answer of "1c" stays readable when
// the table grows and adding an option cannot renumber the ones above it.
const letter = (i) => String.fromCharCode(65 + i);

const plateRows = Object.values(R.plates || {}).map((p) => `<tr>
  <td>${p.key}</td><td>${p.where}</td><td class="n">${p.w}×${p.h}</td><td class="n">${p.keepPct}%</td>
  <td class="n">${p.srcW}×${p.srcH}</td><td class="n ${p.upscale > 1 ? 'warn' : ''}">${p.upscale}×</td>
  <td class="n">${num(p.crop?.namedPct)}%</td></tr>`).join('\n');

// The strip: every whole page at one factor, so the eye compares composition rather than size.
const strip = OPTS.map((o, i) => {
  const s = o.shots?.[WIDTHS[0]];
  const img = s && b64(s.file);
  if (!img) throw new Error(`round14-build: ${o.id} has no whole-page photograph at ${WIDTHS[0]} — D160 says a look question arrives as pictures, so this run is incomplete`);
  return `<figure class="pg"><figcaption><b>${letter(i)}</b> ${o.name.replace(/^[A-E] — /, '')}<br><span class="dim">${s.to} from ${s.from}</span></figcaption><img src="data:image/png;base64,${img}" alt="the whole landing page under option ${letter(i)}"></figure>`;
}).join('\n');

const detail = OPTS.map((o, i) => {
  const s = o.detail;
  if (!s || !b64(s.file)) return '';
  return `<figure class="pg"><figcaption>${letter(i)} · ${o.cropOf || 'hero'} at ${WIDTHS[0]}, ${s.factor}× of the measured box</figcaption><img src="data:image/png;base64,${b64(s.file)}" alt="the hero region under option ${letter(i)}"></figure>`;
}).join('\n');

const rows = OPTS.map((o, i) => `<tr>
  <td><b>${letter(i)}</b> ${o.name.replace(/^[A-E] — /, '')}</td>
  ${WIDTHS.map((w) => `<td class="n">${at(o, w).pageH}<br><span class="dim">${signed(o.delta?.[w])}</span></td>`).join('')}
  ${WIDTHS.map((w) => `<td class="n">${num(at(o, w).paintedPct)}%</td>`).join('')}
  ${WIDTHS.map((w) => `<td class="n">${num(at(o, w).emptyPct, 1)}%</td>`).join('')}
  <td class="n">${num(o.color?.[1240]?.strongPct, 3)}%</td>
  <td class="n">${num(o.color?.[390]?.strongPct, 3)}%</td>
  <td class="n">${at(o, WIDTHS[0]).imgs.length}</td>
  <td class="n">${box(at(o, WIDTHS[0]).mark)}</td>
  <td class="n">${o.gate?.minStrokePx ?? '—'}</td>
  <td class="v ${gateCell(o.gate)}">${gateVerdict(o.gate)}</td></tr>`).join('\n');

const baseRow = `<tr class="rec"><td><i>the shipped page</i></td>
  ${WIDTHS.map((w) => `<td class="n">${BASE.at[w].pageH}</td>`).join('')}
  ${WIDTHS.map((w) => `<td class="n">${num(BASE.at[w].paintedPct)}%</td>`).join('')}
  ${WIDTHS.map((w) => `<td class="n">${num(BASE.at[w].emptyPct, 1)}%</td>`).join('')}
  <td class="n">${num(BASE.color?.[1240]?.strongPct, 3)}%</td><td class="n">${num(BASE.color?.[390]?.strongPct, 3)}%</td>
  <td class="n">${BASE.at[WIDTHS[0]].imgs.length}</td><td class="n">${box(BASE.at[WIDTHS[0]].mark)}</td>
  <td class="n">${BASE.gate?.minStrokePx ?? '—'}</td><td class="v ${gateCell(BASE.gate)}">${gateVerdict(BASE.gate)}</td></tr>`;

// "What the measurements say" — bullets the report writes, not the delegate. Each compares measured cells from
// THIS run; if a cell is missing the bullet says less rather than remembering a number.
const emptyPx = (r, w) => Math.round(((r.at?.[w] ?? r)?.emptyPct ?? 0) * ((r.at?.[w] ?? r)?.pageH ?? 0) / 100);
const cheapest = [...OPTS].sort((a, b) => (a.color?.[1240]?.strongPct ?? 9) - (b.color?.[1240]?.strongPct ?? 9))[0];
const richest = [...OPTS].sort((a, b) => (b.color?.[1240]?.strongPct ?? 0) - (a.color?.[1240]?.strongPct ?? 0))[0];
const tallest = [...OPTS].sort((a, b) => (at(b, WIDTHS[0]).pageH ?? 0) - (at(a, WIDTHS[0]).pageH ?? 0))[0];
const emptiest = [...OPTS].sort((a, b) => (at(b, WIDTHS[0]).emptyPct ?? 0) - (at(a, WIDTHS[0]).emptyPct ?? 0))[0];
const leastEmpty = [...OPTS].sort((a, b) => (at(a, WIDTHS[0]).emptyPct ?? 99) - (at(b, WIDTHS[0]).emptyPct ?? 99))[0];
const reds = OPTS.filter((o) => o.gate?.fails.length);
const shortfalls = Object.values(R.plates || {}).filter((p) => p.upscale > 1).sort((a, b) => b.upscale - a.upscale);

const bullets = [
  `Colour: the cheapest page is <b>${cheapest.id}</b> at <b>${num(cheapest.color?.[1240]?.strongPct, 3)}%</b> of pixels at chroma ≥ 0.08, the richest is <b>${richest.id}</b> at <b>${num(richest.color?.[1240]?.strongPct, 3)}%</b>; the shipped page is ${num(BASE.color?.[1240]?.strongPct, 3)}%. One coloured slot is the ruling (D149-1b/2b), so this column is the budget being spent.`,
  `Page height: every option's cost is printed at all four widths, because the desktop column lied once — round 13's option C was “+0” at 1240 and **+314px at 390**. The tallest here is <b>${tallest.id}</b> at ${at(tallest, WIDTHS[0]).pageH} (${signed(tallest.delta?.[WIDTHS[0]])}).`,
  `Emptiness — the thing this page is actually short of, and the metric most easily misled. At ${WIDTHS[0]} the shipped page has ${BASE.at[WIDTHS[0]].emptyRuns} empty runs covering ${num(BASE.at[WIDTHS[0]].emptyPct, 1)}% of its height, which is <b>${emptyPx(BASE, WIDTHS[0])} px of unmarked vertical space</b>. Percentages flatter a page that grows, so compare the pixels: ${OPTS.map((o) => `${o.id} ${emptyPx(o, WIDTHS[0])}px (${num(at(o, WIDTHS[0]).emptyPct, 1)}%)`).join(', ')}.`,
  reds.length
    ? `Gates: ${reds.length} option(s) fail the render gate — ${reds.map((o) => `${o.id}: ${o.gate.fails.slice(0, 2).join(' | ')}`).join('; ')}. A FAIL here is the gate's own rule, not this round's opinion.`
    : `Gates: every option is green on \`check:render\` at ${((R.options[0].gate?.widths) || []).join('/')} — these are compositions to choose between, not breakage to fix.`,
  shortfalls.length
    ? `Resolution: the archive ladder stops at 1024px (record 0023), so ${shortfalls.map((p) => `${p.key} paints ${p.w}px from a ${p.srcW}px scan (**${p.upscale}× upscale**)`).join('; ')}. A full-bleed band is a decision about a bigger scan, not only about layout.`
    : `Resolution: every plate here paints at or above its scan width — no upscaling in this run.`,
].map((b) => `<li>${b}</li>`).join('\n');

const phoneBlock = R.phone?.states?.length
  ? `<h2>Question 2 — what the phone pays for the hero plate</h2>
<p>Round 13's ruling came with a desktop table that said <b>+0px</b>. At 390 the same composition costs
<b>+314px</b> of scroll, because below 1024 the hero is not a grid and the plate stacks (D161). Three answers,
photographed whole at one scale, measured at 390 on the shipped page.</p>
<div class="pages">${R.phone.states.map((s, i) => {
    const img = s.shot && b64(s.shot.file);
    if (!img) throw new Error(`round14-build: phone state ${s.id} has no photograph — the question cannot be answered from prose (D160)`);
    return `<figure class="pg"><figcaption><b>${String.fromCharCode(97 + i)}</b> ${s.name.replace(/^[abc] — /, '')}<br><span class="dim">page ${s.at[390].pageH} (${s.delta} vs shipped) · painted ${num(s.at[390].paintedPct)}% · gate ${gateVerdict(s.gate)}</span></figcaption><img src="data:image/png;base64,${img}" alt="the whole landing page on a phone under answer ${String.fromCharCode(97 + i)}"></figure>`;
  }).join('\n')}</div>
<table><thead><tr><th>answer</th><th>page @390</th><th>vs shipped</th><th>painted</th><th>empty</th><th>colour ≥0.08</th><th>gate</th></tr></thead><tbody>
${R.phone.states.map((s, i) => `<tr><td><b>${String.fromCharCode(97 + i)}</b> ${s.name.replace(/^[abc] — /, '')}</td><td class="n">${s.at[390].pageH}</td><td class="n">${s.delta}</td><td class="n">${num(s.at[390].paintedPct)}%</td><td class="n">${num(s.at[390].emptyPct, 1)}%</td><td class="n">${num(s.color?.strongPct, 3)}%</td><td class="v ${gateCell(s.gate)}">${gateVerdict(s.gate)}</td></tr>`).join('\n')}
</tbody></table>`
  : `<h2>Question 2 — what the phone pays for the hero plate</h2>
<p class="note">Not measured in this run (a subset run skips the phone question rather than printing remembered
pictures). Run <code>npm run round14</code> in full, or <code>npm run round14 -- as-shipped --phone</code>.</p>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Round 14 — the whole page, five compositions</title>
<style>
 body { margin: 0; font: 15px/1.55 "Public Sans Variable", system-ui, sans-serif; color: ${C.ink}; background: ${C.paper}; }
 main { max-width: 1400px; margin: 0 auto; padding: 32px 20px 96px; }
 h1 { font: 700 30px/1.2 "PT Serif", serif; margin: 0 0 8px; }
 h2 { font: 700 21px/1.3 "PT Serif", serif; margin: 44px 0 8px; }
 h3 { font: 700 16px/1.35 "Public Sans Variable", sans-serif; margin: 26px 0 4px; }
 p { max-width: 84ch; margin: 8px 0; }
 ul { max-width: 84ch; } li { margin: 6px 0; }
 .lede { font-size: 17px; }
 .dim { color: ${C.ink3}; }
 .pages { display: flex; gap: 18px; flex-wrap: wrap; margin: 16px 0; align-items: flex-start; }
 .pg { margin: 0; flex: 0 1 auto; }
 .pg img { display: block; background: ${C.panel}; border: 1px solid ${C.rule}; max-width: 100%; height: auto; }
 figcaption { font-size: 13px; color: ${C.ink2}; max-width: 420px; margin: 0 0 6px; }
 table { border-collapse: collapse; font-size: 13px; margin: 16px 0; width: 100%; }
 th, td { border: 1px solid ${C.rule}; padding: 6px 8px; text-align: left; vertical-align: top; }
 thead th { background: ${C.panel}; }
 td.n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
 td.v.ok { color: ${C.ink}; } td.v.bad { background: ${C.panel}; } td.v.warn { color: ${C.ink2}; font-style: italic; }
 tr.rec td { background: ${C.panel}; }
 .q { border-left: 4px solid ${C.gold}; padding: 4px 0 4px 14px; margin: 22px 0; }
 .ask { font-weight: 700; }
 .note { background: ${C.panel}; border-left: 4px solid ${C.rule}; padding: 10px 14px; font-size: 14px; }
 .claim { font-size: 14px; color: ${C.ink2}; max-width: 84ch; }
 @media (max-width: 760px) { td.n { white-space: normal; } }
</style></head><body><main>
<h1>Round 14 — the whole page, five compositions</h1>
<p class="lede">Round 13 settled one column (D161). This round proposes the page, because the operator asked:
<i>why two graphics in one place, can they go elsewhere, and what would make the landing page more
interesting?</i> Five compositions of the <b>same built page</b>, each photographed whole, at one display factor,
from the load that produced its numbers (D160). Nothing here touches <code>src/</code>: applying a composition is
a separate commit set, after the ruling.</p>

<div class="q"><h3>Question 1 — which composition?</h3>
<p class="ask">Answer in letters (e.g. “1C”), and say if a mix is meant.</p>
${OPTS.map((o, i) => `<p><b>${letter(i)} — ${o.name.replace(/^[A-E] — /, '')}.</b> <span class="claim">${o.claim}</span></p>`).join('\n')}</div>

<h2>The five pages, one scale</h2>
<p>Same viewport (${WIDTHS[0]}), same factor, whole document — top to bottom. This is the comparison: rhythm, weight, and where the page puts its one coloured thing.</p>
<div class="pages">${strip}</div>

<h2>The heroes, closer</h2>
<div class="pages">${detail}</div>

<h2>What the measurements say</h2>
<ul>${bullets}</ul>

<h2>The numbers behind the pictures</h2>
<table><thead><tr><th rowspan="2">composition</th><th colspan="${WIDTHS.length}">page height (Δ vs shipped)</th><th colspan="${WIDTHS.length}">painted</th><th colspan="${WIDTHS.length}">empty runs</th><th colspan="2">chroma ≥ 0.08</th><th rowspan="2">imgs</th><th rowspan="2">mark box</th><th rowspan="2">min stroke px</th><th rowspan="2">check:render</th></tr>
<tr>${WIDTHS.map((w) => `<th>${w}</th>`).join('')}${WIDTHS.map((w) => `<th>${w}</th>`).join('')}${WIDTHS.map((w) => `<th>${w}</th>`).join('')}<th>@1240</th><th>@390</th></tr></thead>
<tbody>${baseRow}${rows}</tbody></table>
<p class="dim">Page height and painted/empty runs from <code>check:space</code> at each width; the gate verdict and the mark's minimum painted stroke from <code>check:render</code> on its ratified matrix (${((OPTS[0].gate?.widths) || []).join('/')}); colour from <code>check:color</code> at 1240 and 390; the image count and boxes from the same survey probe. “imgs” counts raster images the page paints, which is the art inventory for that composition.</p>

<h3>Every plate this run planted, and what it costs in pixels</h3>
<table><thead><tr><th>key</th><th>where</th><th>box</th><th>keeps</th><th>source scan</th><th>scale</th><th>paints ≥0.08</th></tr></thead><tbody>${plateRows}</tbody></table>
<p class="dim">“keeps” is how much of the source plate the box holds (record 0023's number); “scale” is the box width over the scan width — above 1.00 is an upscale, and the archive ladder stops at 1024px.</p>

${phoneBlock}

${R.notes?.length ? `<h2>Notes from this run</h2><ul>${R.notes.map((n) => `<li>${n}</li>`).join('\n')}</ul>` : ''}

<h2>How this was made</h2>
<p><code>npm run round14</code> (design/round14.mjs): mutate <code>dist/client/index.html</code> per option — a
<code>&lt;style&gt;</code> block, DOM moves, plates planted as data URIs through
<code>design/grill/plate-crop.mjs</code>, the same recipe that built <code>src/assets/photos/hero.png</code> —
then run the gates CI runs. Options are defined in <code>design/grill/round14-options.mjs</code>; this file is
generated from <code>design/grill/round14/report.json</code> and throws on a missing lookup. A design round, not a
gate: it runs in no CI. Measured at ${new Date(R.measuredAt).toISOString().slice(0, 16).replace('T', ' ')}, site fingerprint <code>${R.siteFp}</code>.</p>
</main></body></html>`;

writeFileSync(OUT, html);
console.log(`round14-build: wrote ${OUT} (${(html.length / 1024) | 0} kB) from ${OPTS.length} options and ${WIDTHS.length} widths`);
