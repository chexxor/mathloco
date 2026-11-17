#!/usr/bin/env node
// round18-build.mjs — the round-18 specimen: six whole pages at one scale, side by side, and the numbers
// the loads that produced them. Generated from `design/grill/round18/report.json`; edit the report or
// `design/grill/round18-options.mjs`, NEVER this HTML — a generated page embeds the numbers it measured, so a
// hand-edit is a claim about a build nobody ran. A lookup that finds nothing THROWS.
//
// D160 is the reason this file looks the way it does: a look question arrives as pictures, at one display
// factor, from the same load that made its numbers. D161 is the reason the phone column is not optional.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORT = resolve('design/grill/round18/report.json');
const OUT = resolve('design/grill/round-18-page.html');
if (!existsSync(REPORT)) { console.error('round18-build: no report — run `npm run round18` first'); process.exit(1); }
let R;
try { R = JSON.parse(readFileSync(REPORT, 'utf8')); }
catch (e) { console.error(`round18-build: the report is not readable JSON: ${(e.message || '').slice(0, 200)}`); process.exit(1); }

const THEMED = readFileSync(resolve('src/styles/global.css'), 'utf8');
const tok = (name) => {
  const m = THEMED.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`round18-build: --color-${name} is not in the token block — the specimen would be inventing a colour`);
  return m[1].trim();
};
const C = { paper: tok('paper'), panel: tok('panel'), ink: tok('ink'), ink2: tok('ink-2'), ink3: tok('ink-3'), rule: tok('rule'), accent: tok('accent') };

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round18-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const OPTS = need(R.options, 'options');
if (!OPTS.length) throw new Error('round18-build: the report has no options');
const BASE = need(R.baseline, 'baseline');
// The report's own width order, not Object.keys order: integer-like keys iterate ASCENDING, which put the phone
// first and mislabelled every detail crop in round 14 as "at 390". A specimen's column order is a claim.
const WIDTHS = (R.widths && R.widths.length ? R.widths : Object.keys(BASE.at).map(Number));
if (!WIDTHS.length) throw new Error('round18-build: the baseline records no widths');
const PHONE_W = Math.min(...WIDTHS);
const STRIP = [...new Set([WIDTHS[0], PHONE_W])];
const b64 = (p) => (p && existsSync(p) ? readFileSync(p).toString('base64') : null);
const box = (b) => (b ? `${b.w}×${b.h}` : '—');
const gateVerdict = (g) => g.fails.length ? `${g.fails.length} FAIL` : (g.gaps?.length ? `unmeasured ×${g.gaps.length}` : 'green');
const gateCell = (g) => g.fails.length ? 'bad' : (g.gaps?.length ? 'warn' : 'ok');
const at = (o, w) => need(o.at[w], `${o.id} @${w}`);
const num = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d) : '—');
const signed = (s) => (s === undefined ? '—' : s);
const letter = (i) => String.fromCharCode(65 + i);
const NAME = (o) => o.name.replace(/^[A-Z] — /, '');

const plateRows = Object.values(R.plates || {}).map((p) => `<tr>
  <td>${p.key}</td><td>${p.where}</td><td class="n">${p.w}×${p.h}</td><td class="n">${p.keepPct}%</td>
  <td class="n">${p.srcW}×${p.srcH}</td><td class="n ${p.upscale > 1 ? 'warn' : ''}">${p.upscale}×</td>
  <td class="n">${num(p.crop?.namedPct)}%</td></tr>`).join('\n');

const strip = OPTS.map((o, i) => STRIP.map((w) => {
  const s = o.shots?.[w];
  const img = s && b64(s.file);
  if (!img) throw new Error(`round18-build: ${o.id} has no whole-page photograph at ${w} — D160 says a look question arrives as pictures, and D161 says the phone is one of them, so this run is incomplete`);
  return `<figure class="pg"><figcaption><b>${letter(i)}</b> ${NAME(o)}<br><span class="dim">whole page at ${w} wide · ${s.to} from ${s.from}</span></figcaption><img src="data:image/png;base64,${img}" alt="the whole landing page under option ${letter(i)} at ${w} wide"></figure>`;
}).join('')).join('\n');

const detail = OPTS.map((o, i) => {
  const s = o.detail;
  if (!s || !b64(s.file)) return '';
  return `<figure class="pg"><figcaption>${letter(i)} · ${s.cropOf || o.cropOf || 'hero'} at ${s.at || WIDTHS[0]}, ${s.factor}× of the measured box</figcaption><img src="data:image/png;base64,${b64(s.file)}" alt="the hero region under option ${letter(i)}"></figure>`;
}).join('\n');

const rows = OPTS.map((o, i) => `<tr>
  <td><b>${letter(i)}</b> ${NAME(o)}</td>
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
const shippedPx = emptyPx(BASE, WIDTHS[0]);
const cheapest = [...OPTS].sort((a, b) => (a.color?.[1240]?.strongPct ?? 9) - (b.color?.[1240]?.strongPct ?? 9))[0];
const richest = [...OPTS].sort((a, b) => (b.color?.[1240]?.strongPct ?? 0) - (a.color?.[1240]?.strongPct ?? 0))[0];
const tallest = [...OPTS].sort((a, b) => (at(b, WIDTHS[0]).pageH ?? 0) - (at(a, WIDTHS[0]).pageH ?? 0))[0];
const shortest = [...OPTS].sort((a, b) => (at(a, WIDTHS[0]).pageH ?? 1e9) - (at(b, WIDTHS[0]).pageH ?? 1e9))[0];
const leastEmpty = [...OPTS].sort((a, b) => (emptyPx(a, WIDTHS[0]) ?? 1e9) - (emptyPx(b, WIDTHS[0]) ?? 1e9))[0];
const reds = OPTS.filter((o) => o.gate?.fails.length);
const shortfalls = Object.values(R.plates || {}).filter((p) => p.upscale > 1).sort((a, b) => b.upscale - a.upscale);
const phones = R.phone?.states || [];
const phoneW = Object.keys(BASE.at).map(Number).sort((a, b) => a - b)[0];

const bullets = [
  `Emptiness is the question this round asks, and a percentage flatters a page that grows, so compare pixels. At ${WIDTHS[0]} the shipped page carries ${BASE.at[WIDTHS[0]].emptyRuns} empty runs over ${num(BASE.at[WIDTHS[0]].emptyPct, 1)}% of ${BASE.at[WIDTHS[0]].pageH}px = <b>${shippedPx}px of unmarked vertical space</b>. This run: ${OPTS.map((o) => `${o.id} ${emptyPx(o, WIDTHS[0])}px (${num(at(o, WIDTHS[0]).emptyPct, 1)}%, ${signed(o.delta?.[WIDTHS[0]])} page)`).join(', ')}. The least empty here is <b>${leastEmpty.id}</b> at ${emptyPx(leastEmpty, WIDTHS[0])}px.`,
  `Page height: every option's cost is printed at all ${WIDTHS.length} widths, because a desktop delta has been a lie before — round 13's option C was "+0" at 1240 and <b>+314px at 390</b> (D161). The cheapest page here is <b>${shortest.id}</b> at ${at(shortest, WIDTHS[0]).pageH} (${signed(shortest.delta?.[WIDTHS[0]])}); the most expensive is <b>${tallest.id}</b> at ${at(tallest, WIDTHS[0]).pageH} (${signed(tallest.delta?.[WIDTHS[0]])}).`,
  `Colour is the budget being spent, not a mood: one coloured slot is the ruling (D149-1b/2b), so the column is what each composition asks for. Shipped is ${num(BASE.color?.[1240]?.strongPct, 3)}% of pixels at chroma ≥ 0.08; the cheapest option is <b>${cheapest.id}</b> at <b>${num(cheapest.color?.[1240]?.strongPct, 3)}%</b> and the loudest is <b>${richest.id}</b> at <b>${num(richest.color?.[1240]?.strongPct, 3)}%</b>.`,
  reds.length
    ? `Gates: ${reds.length} option(s) fail a gate CI runs — ${reds.map((o) => `${o.id}: ${o.gate.fails.slice(0, 2).join(' | ')}`).join('; ')}. A FAIL is the gate's own rule, not this round's opinion, and it is why those rows cannot simply be chosen.`
    : `Gates: every option is green on \`check:render\` at ${((OPTS[0].gate?.widths) || []).join('/')} — these are compositions to choose between, not breakage to fix.`,
  shortfalls.length
    ? `Resolution: the archive's widest rung is \`/img/1024/\` and it returns each leaf's own scan (record 0023; \`/img/1600/\`, \`/img/2048/\`, \`/img/full/\` answer 404), so ${shortfalls.map((p) => `${p.key} paints ${p.w}px from a ${p.srcW}px scan (**${p.upscale}× upscale**)`).join('; ')}. Hairline art does not survive that, which is what D347's cap has been protecting.`
    : `Resolution: every plate in this run paints at or below its own scan width — no upscaling, so the hairlines are the archive's drawing shrunk, not interpolated.`,
  phones.length
    ? `The phone, priced separately (D161): at ${phoneW} the shipped page is ${BASE.at[phoneW].pageH}px, and the answers to what the band costs there are ${phones.map((s) => `${s.id} ${signed(s.delta)}`).join(', ')}.`
    : `The phone question was not measured in this run — a subset run skips it rather than printing remembered pictures, so no phone ruling can be read off this specimen.`,
].map((b) => `<li>${b}</li>`).join('\n');

const phoneBlock = phones.length
  ? `<h2>Question 2 — what the phone pays for the band</h2>
<p>D356's ruling put the horizon band back at every width, which means the phone is now paying something
nobody priced at this artifact — and D161 is the reason this question is asked at 390 rather than inferred from
the desktop: a "+0" column once hid "+314px" of scroll. Three answers, whole page at one scale, measured on the
shipped page at ${phoneW}.</p>
<div class="pages">${phones.map((s, i) => {
    const img = s.shot && b64(s.shot.file);
    if (!img) throw new Error(`round18-build: phone state ${s.id} has no photograph — the question cannot be answered from prose (D160)`);
    return `<figure class="pg"><figcaption><b>${String.fromCharCode(97 + i)}</b> ${s.name.replace(/^[abc] — /, '')}<br><span class="dim">page ${s.at[phoneW].pageH} (${s.delta} vs shipped) · painted ${num(s.at[phoneW].paintedPct)}% · gate ${gateVerdict(s.gate)}</span></figcaption><img src="data:image/png;base64,${img}" alt="the whole landing page on a phone under answer ${String.fromCharCode(97 + i)}"></figure>`;
  }).join('\n')}</div>
<table><thead><tr><th>answer</th><th>page @${phoneW}</th><th>vs shipped</th><th>painted</th><th>empty runs</th><th>chroma ≥0.08</th><th>gate</th></tr></thead><tbody>
${phones.map((s, i) => `<tr><td><b>${String.fromCharCode(97 + i)}</b> ${s.name.replace(/^[abc] — /, '')}</td><td class="n">${s.at[phoneW].pageH}</td><td class="n">${s.delta}</td><td class="n">${num(s.at[phoneW].paintedPct)}%</td><td class="n">${num(s.at[phoneW].emptyPct, 1)}%</td><td class="n">${num(s.color?.strongPct, 3)}%</td><td class="v ${gateCell(s.gate)}">${gateVerdict(s.gate)}</td></tr>`).join('\n')}
</tbody></table>
<p class="dim">“why” — what each answer is for, from the option table: ${phones.map((s) => `${String.fromCharCode(97 + phones.indexOf(s))} ${s.why || ''}`).join('; ')}</p>`
  : `<h2>Question 2 — what the phone pays for the band</h2>
<p class="note">Not measured in this run (a subset run skips the phone question rather than printing remembered
pictures). Run <code>npm run round18</code> in full.</p>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Round 18 — the whole page, six compositions</title>
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
 .q { border-left: 4px solid ${C.accent}; padding: 4px 0 4px 14px; margin: 22px 0; }
 .ask { font-weight: 700; }
 .note { background: ${C.panel}; border-left: 4px solid ${C.rule}; padding: 10px 14px; font-size: 14px; }
 .claim { font-size: 14px; color: ${C.ink2}; max-width: 84ch; }
 @media (max-width: 760px) { td.n { white-space: normal; } }
</style></head><body><main>
<h1>Round 18 — the whole page, six compositions</h1>
<p class="lede">Rounds 13 and 14 are settled and say so themselves: <code>npm run round13</code> is retired, and
<code>npm run round14</code> throws at this page because the composition it priced is shipped — the page carries
<code>data-slot="PS-5"</code>. Rounds 15 (vertical rhythm), 16 (the club name) and 17 (the header bar) are taken,
so this round is <b>18</b>: plan ids are append-only and never renumbered. It asks the question the
<b>current</b> page raises — one plate below the fold, and ${shippedPx}px of unmarked vertical space in
${BASE.at[WIDTHS[0]].emptyRuns} runs. What closes that emptiness: art moved, art added, art paid for less, or
air taken back? Six compositions of the <b>same built page</b>, each photographed whole at one display factor,
from the load that produced its numbers (D160). Nothing here touches <code>src/</code>: applying a composition
is a separate commit set, after the ruling.</p>

<div class="q"><h3>Question 1 — which composition?</h3>
<p class="ask">Answer in letters (e.g. “1C”), and say if a mix is meant.</p>
${OPTS.map((o, i) => `<p><b>${letter(i)} — ${NAME(o)}.</b> <span class="claim">${o.claim}</span></p>`).join('\n')}</div>

<h2>The pages, one scale</h2>
<p>Same document, same factor, whole page — top to bottom. This is the comparison: rhythm, weight, and where the
page puts its one coloured thing. The last column is ${PHONE_W}, because the phone is where a desktop delta lies.</p>
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
<p class="dim">“keeps” is how much of the source plate the box holds (record 0023's number); “scale” is the box width over the scan width — above 1.00 is an upscale, and the archive's widest rung is 1024.</p>

${phoneBlock}

${R.notes?.length ? `<h2>Notes from this run</h2><ul>${R.notes.map((n) => `<li>${n}</li>`).join('\n')}</ul>` : ''}

<h2>How this was made</h2>
<p><code>npm run round18</code> (design/round18.mjs): mutate <code>dist/client/index.html</code> per option —
a <code>&lt;style&gt;</code> block of attribute selectors, DOM moves, plates planted as data URIs through
<code>design/grill/plate-crop.mjs</code>, the same recipe that built the shipped hero asset — then run the gates
CI runs. Options live in <code>design/grill/round18-options.mjs</code>; this file is generated from
<code>design/grill/round18/report.json</code> and throws on a missing lookup. A design round, not a gate: it
runs in no CI. Measured at ${new Date(R.measuredAt).toISOString().slice(0, 16).replace('T', ' ')}, site
fingerprint <code>${R.siteFp}</code>.</p>
</main></body></html>`;

writeFileSync(OUT, html);
const phoneStates = phones;
const want = OPTS.length * (1 + STRIP.length) + phoneStates.length;
const got = (html.match(/data:image\/png;base64/g) || []).length;
if (got !== want) throw new Error(`round18-build: the specimen embedded ${got} photographs; the report holds ${want} (${OPTS.length} options x (1 hero crop + ${STRIP.length} whole-page widths) + ${phoneStates.length} phone states)`);
console.log(`round18-build: wrote ${OUT} (${(html.length / 1024) | 0} kB) — ${got} photographs: ${OPTS.length} options x (1 crop + ${STRIP.length} widths: ${STRIP.join(', ')}) + ${phoneStates.length} phone states`);
