#!/usr/bin/env node
// round15-build.mjs — the round-15 (R6) specimen: the same landing page under each rhythm option, photographed at
// one scale, with the numbers the same loads produced. Generated from `design/grill/round15/report.json`.
//
//   node design/grill/round15-build.mjs        # after `npm run round15` has written the report
//
// Edit the builder or `design/grill/rhythm-variants.mjs`, NEVER the HTML: the generated page embeds the numbers it
// measured, so a hand-edit is a claim about a build. A lookup that finds nothing THROWS.
//
// D160: every option is photographed at one display factor, from the load that made its numbers. A rhythm question
// is answered by looking at pages, not at a table of deltas — the table is here too, underneath, because the deltas
// are what `DESIGN.md` will quote if an option is taken.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORT = resolve('design/grill/round15/report.json');
const OUT = resolve('design/grill/round-15-rhythm.html');
if (!existsSync(REPORT)) { console.error('round15-build: no report — run `npm run round15` first'); process.exit(1); }
const R = JSON.parse(readFileSync(REPORT, 'utf8'));

const THEMED = readFileSync(resolve('src/styles/global.css'), 'utf8');
const tok = (name) => {
  const m = THEMED.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`round15-build: --color-${name} is not in the token block — the specimen would be inventing a colour`);
  return m[1].trim();
};
const C = { paper: tok('paper'), panel: tok('panel'), ink: tok('ink'), ink2: tok('ink-2'), ink3: tok('ink-3'), rule: tok('rule') };

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round15-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const OPTS = need(R.options, 'options');
if (!OPTS.length) throw new Error('round15-build: the report has no options');
const BASE = need(R.baseline, 'baseline');
// The report's own width order, not Object.keys order (round14 learned this the hard way: integer-like keys iterate
// ASCENDING, which silently made the phone the "first width" of the specimen).
const WIDTHS = (R.widths && R.widths.length ? R.widths : Object.keys(BASE.at).map(Number));
if (!WIDTHS.length) throw new Error('round15-build: the baseline records no widths');
const SCALE = need(R.scale, 'scale');
const NOTES = R.notes ?? [];

const liveAt = (w) => OPTS.filter((o) => o.at[String(w)] && !o.at[String(w)].dead);
// The rows a ruling needs: the widest column where the composition is what is being compared, and the phone.
// A width wider than the 1280 container only earns its row if some option is actually live there (that is the
// bleed question: below 1280 the container already fills the viewport, so a bleed option is invisible — measured).
const PHONE_W = WIDTHS.includes(390) ? 390 : Math.min(...WIDTHS);
const WIDEST = WIDTHS[0];
// A width joins the photographed rows only if some option can actually change at it (below that the row is the same
// page twice) — plus the phone, which D161 says is never optional.
const STRIP = [...new Set([WIDEST, ...WIDTHS.filter((w) => w !== WIDEST && w >= 1024 && liveAt(w).length > 0), PHONE_W])];
const b64 = (p) => (p && existsSync(p) ? readFileSync(p).toString('base64') : null);
const letter = (i) => String.fromCharCode(65 + i);
const at = (o, w) => need(o.at[String(w)], `${o.label} @${w}`);

const base = (w) => need(BASE.at[String(w)], `baseline @${w}`);
const d = (n) => `${n >= 0 ? '+' : ''}${n}`;
// The letters in the question are the letters in the table, looked up by label. Hand-written letters drift:
// this block once described E as "shows everywhere" and F as "moved up" when the module order says the opposite,
// and the only reason anyone noticed is that the specimen was read next to the table.
const L = (label) => {
  const i = OPTS.findIndex((o) => o.label === label);
  if (i < 0) throw new Error(`round15-build: the question asks about "${label}", which is not in the report`);
  return `<b>${letter(i)}</b>. ${OPTS[i].what}`;
};
const olabel = (label) => {
  const o = OPTS.find((x) => x.label === label);
  if (!o) throw new Error(`round15-build: no option "${label}" in the report`);
  return o;
};
// Question 3's whole point is a measured fact, so state the measured fact rather than a claim about it.
const BLEED_FACT = (() => {
  const o = olabel('band-bleed');
  const parts = WIDTHS.filter((w) => at(o, w)).map((w) => `${w}: ${d(at(o, w).height - base(w).height)}px`);
  const dead = WIDTHS.filter((w) => at(o, w) && at(o, w).dead).length;
  return `${dead} of ${parts.length} measured widths cannot show it (${parts.join(' · ')}).`;
})();

// A photograph is the point of this specimen, so a missing one is not a detail: a blank cell reads as "the pages look
// the same" when what happened is that the scratch screenshot was cleaned. Refuse, and name the fix.
const absent = [];
for (const w of STRIP) {
  const want = [['shipped (incumbent)', BASE.shots?.[String(w)]], ...OPTS.map((o, i) => [`${letter(i)}. ${o.label}`, o.shots?.[String(w)]])];
  for (const [label, shot] of want) { const f = shot && shot.file; if (!f || !existsSync(f)) absent.push(`${label} @${w}`); }
}
if (absent.length) {
  console.error(`round15-build: no photograph for ${absent.join(', ')}. The screenshots live in .design/tmp-round15 `
    + '(scratch, because the specimen embeds them); a specimen with blank pages would argue for the incumbent. '
    + 'Run `npm run round15`, which measures, photographs and generates in one pass.');
  process.exit(1);
}

const cells = (w) => {
  const b = base(w);
  const cards = [{ label: 'shipped (incumbent)', what: 'the page as it builds today', shot: BASE.shots?.[String(w)], m: b, delta: 0, dead: false }].concat(
    OPTS.map((o, i) => ({ label: `${letter(i)}. ${o.label}`, what: o.what, shot: o.shots?.[String(w)], m: at(o, w), delta: at(o, w).height - b.height, dead: !!at(o, w).dead })),
  );
  const cardsHtml = cards.map((c) => {
    const img = c.shot && b64(c.shot.file);
    return `<figure class="card${c.dead ? ' dead' : ''}">
      ${img ? `<img src="data:image/png;base64,${img}" alt="the whole landing page at ${w}px under ${c.label}">` : `<div class="noimg">no photograph for this cell — the survey left no screenshot</div>`}
      <figcaption><b>${c.label}</b>${c.dead ? ' <span class="warn">no change at this width</span>' : ''}
        <span class="what">${c.what}</span>
        <span class="nums">page <b>${c.m.height}</b>px ${c.delta ? `(${d(c.delta)})` : '(incumbent)'} ·
          empty <b>${c.m.emptyRunPx}</b>px = ${c.m.emptyRunPct}% in ${c.m.emptyRuns} runs ·
          biggest <b>${c.m.biggestRun}</b>px · painted ${c.m.paintedPct}% · declared padding ${c.m.declaredPaddingPx}px</span>
      </figcaption></figure>`;
  }).join('\n');
  return `<h2>at ${w}px — shipped page ${b.height}px, ${b.emptyRunPx}px empty (${b.emptyRunPct}%), biggest run ${b.biggestRun}px</h2>
  <p class="scale">every page below is downscaled to the same factor (${SCALE}), so the comparison is composition, not size. A grey card means the option cannot reach this width.</p>
  <div class="strip">${cardsHtml}</div>`;
};

const tableRows = OPTS.map((o, i) => {
  const cellsHtml = WIDTHS.map((w) => {
    const m = at(o, w); const b = base(w);
    const inner = m.dead ? '—' : `${d(m.height - b.height)}px<br><span>${d(m.emptyRunPx - b.emptyRunPx)} empty</span>`;
    return `<td class="n${m.dead ? ' dead' : ''}">${inner}</td>`;
  }).join('');
  return `<tr><td>${letter(i)}. ${o.label}</td>${cellsHtml}</tr>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Round 15 — the page's rhythm, photographed</title>
<style>
  body { margin: 0; background: ${C.panel}; color: ${C.ink}; font: 15px/1.55 system-ui, sans-serif; }
  main { max-width: 1700px; margin: 0 auto; padding: 32px 24px 96px; }
  h1 { font-size: 26px; margin: 0 0 6px; }
  h2 { font-size: 19px; margin: 40px 0 4px; }
  .meta, .scale { color: ${C.ink3}; font-size: 13px; margin: 0 0 12px; }
  .strip { display: flex; gap: 14px; align-items: flex-start; overflow-x: auto; padding-bottom: 10px; }
  .card { margin: 0; flex: 0 0 auto; background: ${C.paper}; border: 1px solid ${C.rule}; padding: 8px; width: ${Math.round(270 / SCALE) > 400 ? 290 : 290}px; }
  .card img { display: block; width: 100%; height: auto; }
  .card.dead { opacity: .55; }
  figcaption b { display: block; font-size: 14px; }
  .what { display: block; color: ${C.ink2}; font-size: 12px; margin: 3px 0; }
  .nums { display: block; color: ${C.ink3}; font-size: 11.5px; }
  .noimg { padding: 24px 8px; color: ${C.ink3}; font-size: 12px; }
  .warn { color: ${C.ink2}; font-size: 11px; border: 1px solid ${C.rule}; padding: 0 4px; }
  table { border-collapse: collapse; margin-top: 16px; font-size: 13px; background: ${C.paper}; }
  th, td { border: 1px solid ${C.rule}; padding: 6px 9px; text-align: left; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  td.n span { color: ${C.ink3}; font-size: 11px; }
  td.dead { color: ${C.ink3}; }
  ol.notes { font-size: 12.5px; color: ${C.ink2}; }
  .ask { background: ${C.paper}; border: 1px solid ${C.rule}; padding: 14px 16px; margin: 18px 0 0; }
  .ask h3 { margin: 0 0 6px; font-size: 16px; }
  .ask li { margin-bottom: 4px; }
</style></head><body><main>
<h1>Round 15 — the landing page's vertical rhythm, priced and photographed</h1>
<p class="meta">measured ${R.measuredAt} · widths ${WIDTHS.join(' / ')} · one scale (${SCALE}) · options from
<code>design/grill/rhythm-variants.mjs</code> (the same module <code>npm run check:rhythm</code> prices) ·
generated by <code>design/grill/round15-build.mjs</code> from <code>design/grill/round15/report.json</code></p>

<div class="ask">
  <h3>What is being asked, in answer form</h3>
  <ol>
    <li><b>The trims.</b> ${L('edges')}. ${L('edges-rules')}. ${L('rows')}. ${L('all')}. Or none of them.
      <br>Answer <b>1a / 1b / 1c / 1h / 1none</b>.</li>
    <li><b>The horizon shelf's reach.</b> ${L('band-sm')}. ${L('band-up')}. ${L('band-any')}. Or leave it where it ships
      (from 1024 up). <br>Answer <b>2d / 2e / 2f / 2none</b>.</li>
    <li><b>Does a wider shelf matter at all?</b> ${L('band-bleed')}. ${BLEED_FACT}
      <br>Answer <b>3yes-if-1440-matters / 3drop</b>.</li>
  </ol>
  <p class="meta">Nothing here is applied to the site: each page was measured in a copy of <code>dist/client</code>.
  Taking an option means editing the component or the tokens, and it goes through <code>verify</code> like anything else.</p>
</div>

${STRIP.map(cells).join('\n')}

<h2>The whole table — every option at every width (page-height delta, then empty-run delta)</h2>
<table><thead><tr><th>option</th>${WIDTHS.map((w) => `<th class="n">@${w}<br><span>shipped ${base(w).height}px</span></th>`).join('')}</tr></thead>
<tbody>${tableRows}</tbody></table>
<p class="meta">"empty" = pixels inside runs of at least 60px with no ink in them, as <code>design/whitespace-survey.mjs</code>
counts them; it is not a count of padding. A dash means the option cannot reach that width.</p>

<h2>Notes from the run</h2>
<ol class="notes">${NOTES.length ? NOTES.map((n) => `<li>${n}</li>`).join('') : '<li>none</li>'}</ol>
</main></body></html>`;

writeFileSync(OUT, html);
console.log(`wrote ${OUT} — ${STRIP.length} photographed rows (${STRIP.join(', ')}), ${1 + OPTS.length} pages each`);
