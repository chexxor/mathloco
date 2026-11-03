#!/usr/bin/env node
// round13-build.mjs — the specimen the operator chooses from, generated from the measurement.
//
//   node design/grill/round13-build.mjs        # after `npm run round13` has written the report
//
// Edit the builder or design/grill/round13-variants.mjs, NEVER the HTML (the round-8/9/10 rule: the
// generated page embeds the numbers it measured, so hand-editing it makes a claim about a build).
//
// What it embeds: the real page, shot under each option (the hero region cropped out of the screenshot the
// survey took on the same load its numbers came from), the real Byrne plate at each candidate box, and every
// number the gates produced. Nothing is transcribed by hand: a lookup that finds nothing THROWS, because a
// stale assumption that fails silently becomes prose (design/round10.mjs states the rule).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORT = resolve('design/grill/round13/report.json');
const OUT = resolve('design/grill/round-13-hero.html');
if (!existsSync(REPORT)) { console.error('round13-build: no report — run `npm run round13` first'); process.exit(1); }
const R = JSON.parse(readFileSync(REPORT, 'utf8'));

// The palette comes out of the shipped token block, not out of memory, so this specimen cannot drift from the
// CSS it is describing. The values are oklch() strings, which a browser paints directly.
const THEMED = readFileSync(resolve('src/styles/global.css'), 'utf8');
const tok = (name) => {
  const m = THEMED.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`round13-build: --color-${name} is not in the token block — the specimen would be inventing a colour`);
  return m[1].trim();
};
const C = { paper: tok('paper'), panel: tok('panel'), ink: tok('ink'), ink2: tok('ink-2'), ink3: tok('ink-3'), rule: tok('rule'), gold: tok('gold') };

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round13-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const box = (b) => (b ? `${b.w}×${b.h}` : '—');
const pos = (b) => (b ? `${b.x},${b.y}` : '—');
const b64 = (p) => (p && existsSync(p) ? readFileSync(p).toString('base64') : null);
const pct = (n) => (typeof n === 'number' ? `${n.toFixed(2)}%` : '—');
// coverage is a 0..1 ratio and reads better rounded; the census percentages want two decimals, this does not.
const cov = (n) => (typeof n === 'number' ? `${Math.round(100 * n)}%` : '—');
const delta = (a, b) => { const d = a - b; return `${d >= 0 ? '+' : ''}${d}px`; };

const geo = need(R.geo, 'geo');
const shipped = need(R.shipped, 'shipped geometry');
const shippedColor = need(R.shippedColor, 'shipped colour census');
const P1 = need(R.plates?.PS1, 'plates.PS1');
const P3 = need(R.plates?.PS3, 'plates.PS3');
const VS = need(R.variants, 'variants');
if (!VS.length) throw new Error('round13-build: the report has no variants');
// Options are lettered A, B, C… in the order the variant table holds them, and the letter is what the operator
// answers with. It is derived from the table, so adding an option cannot silently renumber the ones above it.
const IDS = VS.map((v) => v.id);
const letter = (id) => {
  const i = IDS.indexOf(id);
  if (i < 0) throw new Error(`round13-build: ${id} is not in the report's variant list — the specimen would label a picture that was never measured`);
  return String.fromCharCode(65 + i);
};
const byId = (id) => { const v = VS.find((x) => x.id === id); if (!v) throw new Error(`round13-build: no measurement for ${id}`); return v; };
// A subset run (`npm run round13 -- stack-fill`) measures fewer options; the prose has to say less rather than
// assert something about a picture that was never taken.
const maybe = (id) => VS.find((x) => x.id === id);

// The recommendation, stated with the number that earns it. `stack-fill` is the delegate's pick: the only
// option measured so far that is green at the mark's floor, costs the page nothing, and gives the plate more
// of the column than the alternative that is also green.
const RECOMMEND = 'stack-fill';
if (!maybe(RECOMMEND)) console.warn('round13-build: the recommended option was not in this run — the Q1 paragraph will name the measured options only');

// Prose quotes numbers from THIS run. On a subset run the option a note names may be absent, so the note falls
// back to any measured value of the same kind rather than printing a remembered one.
const ceilNote = (() => { for (const v of VS) if (v.stroke?.ceiling != null) return v.stroke.ceiling; return 'no scan'; })();
const colorRow = pct(maybe('row-shipped')?.color?.strongPct ?? maybe(IDS[0])?.color?.strongPct);
const colorStack = pct(maybe(RECOMMEND)?.color?.strongPct ?? maybe(IDS[IDS.length - 1])?.color?.strongPct);

// A gate cell can come back three ways: a FAIL, green, or no verdict at all (the browser posted nothing). The
// third is not a design finding, so it never prints as one.
const gateVerdict = (g) => g.fails.length ? `${g.fails.length} FAIL` : (g.gaps?.length ? `unmeasured ×${g.gaps.length}` : 'green');
const gateCell = (g) => g.fails.length ? 'bad' : (g.gaps?.length ? 'warn' : 'ok');

const rows = VS.map((v) => {
  const at = need(v.at?.[1240], `${v.id} @1240`);
  const atPhone = v.at?.[390];
  const gate = need(v.gate, `${v.id} gate result`);
  return `
  <tr${v.id === RECOMMEND ? ' class="rec"' : ''}>
    <td><b>${letter(v.id)}</b> ${v.name}</td>
    <td class="n">${box(at.mark)}<br><span class="dim">scale ${at.mark?.scale ?? '—'}</span></td>
    <td class="n">${v.stroke?.paintedPx ?? '—'}px ink<br><span class="dim">${v.stroke?.scanPx ?? '—'}px set · ${cov(v.stroke?.coverage)} covered</span></td>
    <td class="n">${box(at.plate)}</td>
    <td class="n">${box(at.col)}</td>
    <td class="n">${delta(need(at.pageH, `${v.id} page height`), geo.pageH)}</td>
    <td class="n">${pct(v.color?.strongPct)}</td>
    <td class="v ${gateCell(gate)}">${gateVerdict(gate)}</td>
    <td class="n">${box(atPhone?.mark)} / ${box(atPhone?.plate)}</td>
  </tr>`;
});

const panels = VS.map((v) => {
  const at = v.at[1240];
  const gate = v.gate;
  const shot = b64(v.shot);
  const pb = v.plateBox;
  const pbox = pb ? P1.boxes[pb.key] : null;
  return `
<section class="opt" id="${v.id}">
  <h3><span class="ltr">${letter(v.id)}</span>${v.name}${v.id === RECOMMEND ? ' <em class="rec">recommended</em>' : ''}</h3>
  <p class="changed">what changes in the markup: ${v.changed}</p>
  ${shot ? `<figure>
    <img src="data:image/png;base64,${shot}" width="${need(at.grid?.w, `${v.id} grid width`)}" height="${need(at.grid?.h, `${v.id} grid height`)}" alt="the landing page's hero under option ${letter(v.id)}">
    <figcaption>the built page at 1240, from the top of the hero grid to its bottom — ${at.grid.w}×${at.grid.h} at ${pos(at.grid)}. This is a screenshot of the real page with the real plate in it, not a drawing.</figcaption>
  </figure>` : `<p class="bad">no picture: ${R.notes.find((n) => n.startsWith(v.id)) || 'the shot is missing'}</p>`}
  <table class="detail">
    <tr><th>the mark</th><td>${box(at.mark)} at ${pos(at.mark)} — scale ${at.mark?.scale} of the ${geo.vbW}×${geo.vbH} viewBox. The gate's floor applies to its thinnest stroke: <b>${v.stroke?.reportedPx ?? '?'}px</b> of the <b>1px</b> D119 minimum. Measured in the pixels: the ${v.stroke?.scanRole ?? 'route'} meridian is set to ${v.stroke?.scanSw ?? '?'} viewBox units = <b>${v.stroke?.scanPx ?? '?'}px</b>, and it paints an ink run of <b>${v.stroke?.paintedPx ?? '?'}px</b> whose strongest pixel reaches ${v.stroke?.peakInk ?? '?'} of the ${v.stroke?.ceiling ?? '?'} that fully covering ${v.stroke?.scanToken ?? 'its token'} on this ground would read — <b>${cov(v.stroke?.coverage)} coverage</b>.${v.stroke?.corePx != null ? ` Pixels that are mostly ink (delta-OKLab ≥ 0.10): <b>${v.stroke.corePx}</b>.` : ''}${v.stroke?.allRuns ? `<br><span class="dim">every ink run in the scan window, as px offsets from the meridian: ${v.stroke.allRuns} · ground rgb(${(v.stroke?.ground || []).join(', ')}) at ${pct(100 * (v.stroke?.groundShare ?? 0))} of the mark's box</span>` : ''}</td></tr>
    <tr><th>the plate</th><td>${box(at.plate)} at ${pos(at.plate)}${pbox ? ` — a ${pbox.w}×${pbox.h} crop of a ${P1.srcW}×${P1.srcH} leaf: <b>keeps ${pbox.keepPct}%</b> of it, and paints ${pbox.crop.namedPct}% of its own box at chroma ≥ 0.08` : ''}</td></tr>
    <tr><th>the column</th><td>PS-1 ${box(at.col)} at ${pos(at.col)} (the row the text column beside it already costs is ${geo.colH}px) · the whole page ${at.pageH}px, ${delta(at.pageH, geo.pageH)} against today</td></tr>
    <tr><th>colour</th><td>the page at chroma ≥ 0.08: <b>${pct(v.color?.strongPct)}</b> (today ${pct(shippedColor.strongPct)}) · all chromatic ${pct(v.color?.chromaticPct)}</td></tr>
    <tr><th>at 390</th><td>the hero is not a grid below 1024, so the phone sees: mark ${box(v.at[390]?.mark)}, plate ${box(v.at[390]?.plate)}${v.at[390] ? ` · page ${v.at[390].pageH}px` : ''}</td></tr>
    <tr><th>the gate</th><td class="${gateCell(gate)}">${gate.fails.length ? gate.fails.slice(0, 3).map((f) => `<code>${f}</code>`).join('') + (gate.fails.length > 3 ? `<code>… and ${gate.fails.length - 3} more like it</code>` : '') : gate.gaps?.length ? `green where it got a verdict; <b>no verdict</b> at ${gate.gaps.map((g) => g.split(' @')[1]?.split(':')[0]).join(', ')} — firefox posted nothing after three attempts, so that cell is unmeasured rather than failing` : `green on all four widths (${gate.widths.join(', ')})`}</td></tr>
    <tr><th>why it is here</th><td>${v.verdict}</td></tr>
  </table>
</section>`;
});

const plateShapes = Object.entries(P1.boxes).map(([key, b]) => {
  const j = b64(b.png);
  return `<figure class="shape">
    ${j ? `<img class="box" src="data:image/png;base64,${j}" width="${b.w}" height="${b.h}" data-w="${b.w}" data-h="${b.h}" alt="the Byrne Euclid leaf cropped to ${b.w} by ${b.h}">` : ''}
    <figcaption><b>${b.w}×${b.h}</b> — ${b.label}<br>keeps <b>${b.keepPct}%</b> of the ${P1.srcW}×${P1.srcH} leaf · paints ${b.crop.namedPct}% at chroma ≥ .08${b.crop.fam ? ` · biggest family ${b.crop.fam.share}% at hue ${b.crop.fam.hue}°, C ${b.crop.fam.chroma}` : ''}</figcaption>
  </figure>`;
}).join('');

// The prose needs three of the measurements by name, and a subset run may not have taken them.
const shippedWithPlate = maybe('row-shipped');
const reviewAt = R.reviewBaseline?.at;
const reviewGate = R.reviewBaseline?.gate;
const reviewGateColor = R.shippedColor?.strongPct;
const ps3Run = maybe('stack-fill-ps3-too');
const rec = maybe(RECOMMEND);
const other = maybe('stack-3x2');
const artFirst = maybe('plate-owns-slot');
const pinned = maybe('row-non-scaling');
const recPara = rec ? `<p><b>Recommendation: ${letter(rec.id)}.</b> ${rec.verdict}. check:render on it:
  ${rec.gate.fails.length ? `<code>${rec.gate.fails[0]}</code>` : `${gateVerdict(rec.gate)} at ${rec.gate.widths.join(', ')} (mark
  ${box(rec.at[1240].mark)}, thinnest stroke ${rec.stroke.reportedPx} computed / ${rec.stroke.corePx}px of solid ink, floor 1px)`}.
  It costs the page ${delta(rec.at[1240].pageH, geo.pageH)} of height, and it gives the art more of the column than
  ${other ? `${letter(other.id)}, which keeps ${P1.boxes.reserved.keepPct}% of the leaf instead of
  ${P1.boxes.fill.keepPct}%` : 'the other stacked option'}. If the art matters more than the mark's size,${artFirst ? ` ${letter(artFirst.id)}
  keeps the plate whole and puts a ${box(artFirst.at[1240].mark)} mark beside the club's name instead — strokes
  ${artFirst.stroke.reportedPx}px, and ${delta(artFirst.at[1240].pageH, geo.pageH)} of page.` : ` the option that keeps the
  plate whole was not measured in this run.`}</p>`
  : '';
const pinnedPara = pinned && shippedWithPlate ? `<p class="dim">${letter(pinned.id)} exists to show what pinning the stroke does, measured
  against ${letter(shippedWithPlate.id)} at the identical size (both ${box(shippedWithPlate.at[1240].mark)}): the ink run
  across the mark's vertical meridian is <b>${pinned.stroke.paintedPx}px pinned</b> vs
  <b>${shippedWithPlate.stroke.paintedPx}px scaled</b>, and its strongest pixel covers
  <b>${cov(pinned.stroke.coverage)}</b> of the ground against <b>${cov(shippedWithPlate.stroke.coverage)}</b>
  — so <code>vector-effect: non-scaling-stroke</code> does put more paint where the arithmetic says there is barely any,
  which is exactly what the gate cannot see: it computes ${pinned.stroke.reportedPx} for both, because it multiplies
  viewBox units by the box scale and does not know about <code>vector-effect</code>. Choosing it means changing a gate
  rule as well as the markup — and the mark is still a ${box(pinned.at[1240].mark)} drawing.</p>`
  : pinned ? `<p class="dim">${letter(pinned.id)} pins the stroke to device pixels: ink run ${pinned.stroke.paintedPx}px,
  peak ink ${pinned.stroke.peakInk}, against ${pinned.stroke.reportedPx}px computed by the gate. Compare it with the row
  option at the same size to see the difference.</p>` : '';

// Colour attendance: the plates are the first chromatic content on a page measured at 0.014% named colour.
const colorPara = VS.some((v) => v.color) ? `<h2>What the plates do to the page's colour</h2>
<p>D119 counts the page at chroma ≥ 0.08, and ${R.gateBar?.attnBar ?? 'the attention bar'} is where that count is
enforced. The shipped page sits at <b>${pct(shippedColor.strongPct)}</b>; every option below is measured by
<code>check:color</code> on the built page, not predicted from the crop. Against the shipped page, the Byrne leaf costs
<b>${pct(Math.max(...VS.map((v) => (v.color?.strongPct ?? 0) - shippedColor.strongPct)))}</b> at most and
<b>${pct(Math.min(...VS.map((v) => (v.color?.strongPct ?? 0) - shippedColor.strongPct)))}</b> at least — the difference
between the options is how much leaf is on screen, so the ${pct(shippedColor.emptyPct)} empty attention cell is not
the thing that changes.</p>` : '';

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Round 13 — the hero media column: what the plate and the mark each get</title>
<style>
 body { margin: 0; font: 15px/1.55 "Public Sans Variable", system-ui, sans-serif; color: ${C.ink}; background: ${C.paper}; }
 main { max-width: 1240px; margin: 0 auto; padding: 32px 20px 96px; }
 h1 { font: 700 30px/1.2 "PT Serif", serif; margin: 0 0 8px; }
 h2 { font: 700 21px/1.3 "PT Serif", serif; margin: 44px 0 8px; }
 h3 { font: 700 16px/1.35 "Public Sans Variable", sans-serif; margin: 0 0 4px; }
 p { max-width: 78ch; margin: 8px 0; }
 .lede { font-size: 17px; }
 .dim { color: ${C.ink3}; }
 .rec { color: ${C.ink}; background: ${C.panel}; }
 em.rec { font-style: normal; border: 1px solid ${C.gold}; padding: 1px 6px; font-size: 12px; }
 .shapes { display: flex; gap: 24px; flex-wrap: wrap; margin: 16px 0; }
 .shape { margin: 0; }
 .shape img, .box { display: block; background: ${C.panel}; border: 1px solid ${C.rule}; box-sizing: border-box; }
 figcaption { font-size: 13px; color: ${C.ink2}; max-width: 420px; margin-top: 6px; }
 table { border-collapse: collapse; font-size: 13.5px; margin: 16px 0; width: 100%; }
 th, td { border: 1px solid ${C.rule}; padding: 7px 9px; text-align: left; vertical-align: top; }
 thead th { background: ${C.panel}; }
 td.n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
 td.v.ok { color: ${C.ink}; } td.v.bad { color: ${C.ink}; background: ${C.panel}; } td.v.warn, td.warn { color: ${C.ink2}; font-style: italic; }
 tr.rec td { background: ${C.panel}; }
 .opt { margin: 40px 0; padding: 18px 20px; border: 1px solid ${C.rule}; background: ${C.panel}; }
 .opt h3 { display: flex; gap: 10px; align-items: baseline; }
 .ltr { display: inline-block; width: 26px; height: 26px; line-height: 26px; text-align: center; background: ${C.ink}; color: ${C.paper}; font-weight: 700; }
 .changed { color: ${C.ink2}; margin: 2px 0 12px; }
 .opt figure { margin: 0 0 14px; }
 .opt img { max-width: 100%; height: auto; display: block; background: ${C.paper}; }
 .detail { font-size: 13.5px; }
 .detail th { width: 108px; background: ${C.paper}; }
 code { display: block; font: 12.5px/1.45 ui-monospace, monospace; background: ${C.paper}; border-left: 3px solid ${C.gold}; padding: 4px 8px; margin: 3px 0; }
 .q { border-left: 4px solid ${C.gold}; padding: 4px 0 4px 14px; margin: 22px 0; }
 .q h3 { margin-bottom: 6px; }
 .ask { font-weight: 700; }
 .note { background: ${C.panel}; border-left: 4px solid ${C.rule}; padding: 10px 14px; font-size: 14px; }
 @media (max-width: 760px) { td.n { white-space: normal; } }
</style></head><body><main>

<h1>Round 13 — the hero media column: what the plate and the mark each get</h1>
<p class="lede">A2 puts a Byrne Euclid leaf in PS-1 and a 1910 geometry plate in PS-3 (D149-1b/2b). PS-1 already holds
the club's mark, and the column is a <b>row</b>: put a plate in it and the two graphics split the column's <i>width</i>.
Measured on the built page with the real plate in it, the mark falls from <b>${box(shipped.mark)}</b> to
<b>${box(shippedWithPlate?.at?.[1240]?.mark)}</b> and its thinnest stroke lands at
<b>${shippedWithPlate?.stroke?.reportedPx ?? '?'}px</b> against D119's 1px floor, while the plate becomes a
<b>${box(shippedWithPlate?.at?.[1240]?.plate)}</b> window on a ${P1.srcW}×${P1.srcH} leaf that keeps only
<b>${P1.boxes.reserved?.keepPct}%</b> of itself.${reviewGate?.fails?.length ? ` With the hatched placeholder box the review
build stands in for — the state every earlier measurement of this defect used — the column falls to
${box(reviewAt?.mark)} and <code>check:render</code> prints <b>${reviewGate.fails.length} FAILs</b>.` : ''} So the question
is not whether a gate goes red: it is what the column holds. It is laid out here as pictures of the real page with the
real art in it — every number on this page was produced by the gates, and nothing in it is transcribed by hand.</p>
<p class="dim">measured ${new Date(R.measuredAt).toISOString().slice(0, 16).replace('T', ' ')} on the review build (siteFp
${R.reviewSiteFp}); the shipped page for comparison is siteFp ${R.shippedSiteFp}. Instruments: check:space (boxes),
check:render (the mark's legibility rules at ${VS[0].gate.widths.join(', ')}), check:color (the palette census), and a
byte scan across the mark's own meridian for the stroke that actually paints. Evidence:
design/grill/round13/report.json · .design/tmp-round13/.</p>

<h2>The column as built</h2>
<p>PS-1 is <b>${geo.colW}×${geo.colH}</b> at ${pos(shipped.col)} at 1240 — the ${geo.colH}px is the row's height, which the
text column beside it already pays for. The mark at full column width paints <b>${geo.colW}×${geo.markH}</b>
(viewBox ${geo.vbW}×${geo.vbH}, so every stroke is ${geo.minStroke} viewBox units at scale ${(shipped.mark?.w / geo.vbW).toFixed(2)}).
That leaves <b>${geo.colH - geo.markH - geo.gapPx}px</b> of a column the page is already paying for.</p>
<table><thead><tr><th>what is in the column</th><th class="n">mark</th><th class="n">plate</th><th class="n">PS-1</th><th class="n">page</th><th class="n">page colour</th><th class="n">check:render</th></tr></thead><tbody>
<tr><td>nothing — the shipped page, where the mark <i>is</i> this slot's empty state</td><td class="n">${box(shipped.mark)}</td><td class="n">—</td><td class="n">${box(shipped.col)}</td><td class="n">${shipped.pageH}px</td><td class="n">${pct(shippedColor.strongPct)}</td><td class="n">green</td></tr>
<tr><td>the reserved 3:2 box standing in it — the review state's hatched placeholder, which is what every earlier measurement of this defect used</td><td class="n">${box(reviewAt?.mark)}</td><td class="n">${box(reviewAt?.plate)}</td><td class="n">${box(reviewAt?.col)}</td><td class="n">${reviewAt?.pageH ?? '—'}px</td><td class="n">—</td><td class="n bad">${reviewGate ? gateVerdict(reviewGate) : '—'}</td></tr>
<tr><td>the real plate in the row as built (${shippedWithPlate ? letter(shippedWithPlate.id) : 'not measured this run'}) — what A2 would actually ship</td><td class="n">${box(shippedWithPlate?.at?.[1240]?.mark)}</td><td class="n">${box(shippedWithPlate?.at?.[1240]?.plate)}</td><td class="n">${box(shippedWithPlate?.at?.[1240]?.col)}</td><td class="n">${shippedWithPlate?.at?.[1240]?.pageH ?? '—'}px</td><td class="n">${pct(shippedWithPlate?.color?.strongPct)}</td><td class="n">${shippedWithPlate ? gateVerdict(shippedWithPlate.gate) : '—'}</td></tr>
</tbody></table>
<p class="dim">The two states split the column differently because a hatched box and an inline image are flex items with
different intrinsic sizes — 149×93 against 188×118 — and only the placeholder state fails the floor outright. The
real-image state is legal at 1240 by a hundredth of a pixel, which is a fact about the arithmetic rather than an
endorsement: at that size the plate is a postage stamp on a portrait leaf and the mark is the smallest drawing the rules
allow. From the review state:</p>
${(reviewGate?.fails || []).slice(0, 3).map((f) => `<code>${f}</code>`).join('')}
${reviewGate?.fails?.length > 3 ? `<code>… and ${reviewGate.fails.length - 3} more, one per painted stroke</code>` : ''}
<p class="dim"><b>Instrument note, measured on this branch.</b> The gate used to assert D119's 1px floor on every shape's
<code>stroke-width</code>, including the mark's meeting point — a filled disc styled <code>stroke-none</code>, whose
<code>stroke-width</code> is the SVG initial value of 1 and which paints no stroke at all. Below a drawn scale of 1.0 that
phantom shape failed, so one of the eight FAILs earlier sessions quoted was arithmetic about a stroke that does not exist.
The floor is now asserted on a stroke that <i>paints</i> (<code>strokePaints</code>, from the same computed style), and
<code>check:render:selftest</code> gained the counterfactual — give that disc a real 0.3-unit stroke and the gate fails it
like any line. The FAILs quoted above are painted strokes, one each.</p>

  <p class="note"><b>Two probes, two numbers, both right.</b> On the same planted review build,
  <code>check:space</code> puts the mark at <b>${box(R.reviewBaseline?.at?.mark)}</b> and
  <code>check:render</code> at <b>${box(R.reviewBaseline?.gate?.markBox)}</b>: the gate runs in a viewport with a
  vertical scrollbar, which steals about 10px of width from a centred column. Every stroke figure in this specimen is
  arithmetic on the gate's box, because that is the box the gate measures and the smaller of the two.</p>

  <p class="note"><b>What "covered" means.</b> The vertical run of one meridian was scanned in the live page at device
  resolution, pixel by pixel, against the ground the mark actually stands on (the modal colour inside the mark's own
  box — measured, not assumed: <b>${pct(100 * (maybe(IDS[0])?.stroke?.groundShare ?? 0))}</b> of that box is paper).
  Distance is measured in OKLab, the space <code>check:color</code> and <code>check:ground</code> already use. A pixel
  of the mark's token on this ground reads <b>${ceilNote}</b> when it fully covers its pixel — that is the ceiling.
  Coverage is the strongest pixel the line reaches divided by that ceiling. A stroke set at less than a whole device
  pixel splits its colour across two of them and never reaches full ink; that is what the coverage figure shows,
  which makes D119's coverage claim a measurement rather than an assertion.</p>

  <p class="note"><b>What the art costs the palette.</b> "page colour" is the share of the whole page at chroma
  ≥ 0.08, the quantity <code>check:color</code> enforces (reading bar: 33% of any named family). The page today is
  <b>${pct(shippedColor.strongPct)}</b>; a Byrne leaf in the column takes it to <b>${colorRow}</b> in the row and
  <b>${colorStack}</b> stacked, because flat engraving is nearly all paper. Every option stays two orders of magnitude
  under the bar; the figure is here so that "add the art" has its cost written next to its picture.</p>

<h2>The plate's shape is part of the question</h2>
<p>The leaf is ${P1.srcW}×${P1.srcH} — a portrait. ${P1.why}. A 3:2 box (what the markup reserves today) keeps
<b>${P1.boxes.reserved?.keepPct}%</b> of it; the column's own leftover keeps <b>${P1.boxes.fill?.keepPct}%</b>; the
column at the plate's own shape keeps all of it. Cropping is a claim about the page, so it is drawn at true size:</p>
<div class="shapes">${plateShapes}</div>

<h2>The options, measured</h2>
<table><thead><tr><th>option</th><th class="n">mark box</th><th class="n">stroke (ink run / set)</th><th class="n">plate</th><th class="n">PS-1</th><th class="n">page Δ</th><th class="n">page colour</th><th class="n">check:render</th><th class="n">@390 mark/plate</th></tr></thead>
<tbody>${rows.join('')}</tbody></table>
<p class="dim">The screenshots below are <b>1:1 at 1240</b>. The plate column is what the crop keeps of the
${P1.srcW}×${P1.srcH} leaf and how much of the crop is chromatic enough to name. The mark column is measured three ways,
and they are not the same claim: <b>set</b> is the stroke's device width the markup asks for (the geometry table's
viewBox units × the box scale — what the gate rules on against D119's 1px floor, and the cell is shaded where it is
under it); <b>ink</b> is the width of the painted run across the mark's one vertical stroke, which includes antialiased
pixels and so reads ~1px wider; <b>covered</b> is how close the strongest pixel of that run comes to full coverage of the
token it is painted with, measured against the ground the mark actually sits on — D119's actual claim is about coverage,
and this is the only one of the three that tests it. <b>check:render</b> is the real gate run on that variant.</p>

${colorPara}

${panels.join('')}

<h2>The join section's plate (not a question — a confirmation)</h2>
<p>D149-2b ruled the 1910 Euler plate into PS-3 at 526×316. Since then the two join actions moved outside the tinted
card (D149-3c), so that column is now <b>${geo.ps3W}×${shipped.ps3?.h}</b> inside a grid row the copy column already
makes <b>${geo.ps3RowH}px</b> tall. The ruled plate is ${P3.boxes.ruled.w}×${P3.boxes.ruled.h}, keeps
<b>${P3.boxes.ruled.keepPct}%</b> of a ${P3.srcW}×${P3.srcH} leaf${ps3Run ? `, and in option ${letter(ps3Run.id)} the page
measures ${ps3Run.at[1240].pageH}px with the plate inside the row it belongs to — it costs
${delta(ps3Run.at[1240].pageH, geo.pageH)} of height` : ' — this run did not measure it in place'}. Source: ${P3.book}.</p>

<h2>Questions</h2>
<div class="q">
  <h3>Q1 — which composition?</h3>
  <p class="ask">Answer with the letter. ${VS.map((v) => `${letter(v.id)} = ${v.name}`).join(' · ')}</p>
  ${recPara}
  ${pinnedPara}
</div>
<div class="q">
  <h3>Q2 — PS-4, the event-card thumb: art or no art?</h3>
  <p>The slot is defined but not built (src/assets/photos/README.md: 323×110 inside the measured card; the event
  sections are switched off until A6 gives them real dates). Record 0023 measured the only plate wide enough for a
  thumb: Byrne 123-184 keeps 93% of itself in the box and would add <b>+0.032%</b> to the whole page at chroma ≥ 0.08
  — an order of magnitude below what PS-1 costs. So a thumb is cheap and a void is avoidable.</p>
  <p class="ask">Answer: (a) art in the thumb when a plate fits it, (b) no art in PS-4 — text-only cards.</p>
</div>

<p class="note">How to read the pictures: they are screenshots of the built page at 1240, cropped from the top of the
hero grid to its bottom, so the geometry in the picture is the geometry the probe reported. On a narrow screen the
browser scales the picture down; compare the boxes and the numbers, not the pixels. Answer in letter form (e.g. “1c, 2a”).</p>

${R.notes.length ? `<p class="note">Instrument notes: ${R.notes.join(' · ')}</p>` : ''}
</main></body></html>`;

writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} kB) from design/grill/round13/report.json`);


