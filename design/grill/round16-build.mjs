#!/usr/bin/env node
// round16-build.mjs — the round-16 (R7) specimen: the club's name and the word "Book", every option photographed
// in the identity block at three widths, with the line boxes and page heights the same loads produced.
// Generated from `design/grill/round16/report.json`.
//
//   node design/grill/round16-build.mjs        # after `npm run round16` has written the report
//
// Edit the builder or `design/grill/copy-options.mjs`, NEVER the HTML: the generated page embeds the strings and
// the numbers it measured, so a hand-edit is a claim about a build that did not happen. A lookup that finds
// nothing THROWS (round 13's rule) — a specimen with a blank where a measurement belongs is worse than no specimen.
//
// Why the specimen also prints the change surface: the operator's ask is about branding, and branding here is
// eight slots in this repo plus four the repo does not own (Meetup's own group name, the apex domain, the
// Mobilizon handle, the share card's bytes). An option that only quotes the two sentences it changes cannot be
// costed, so the tables come out of the same record the photographs come out of.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORT = resolve('design/grill/round16/report.json');
const OUT = resolve('design/grill/round-16-copy.html');
if (!existsSync(REPORT)) { console.error('round16-build: no report — run `npm run round16` first'); process.exit(1); }
const R = JSON.parse(readFileSync(REPORT, 'utf8'));

const THEMED = readFileSync(resolve('src/styles/global.css'), 'utf8');
const tok = (name) => {
  const m = THEMED.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`round16-build: --color-${name} is not in the token block — the specimen would be inventing a colour`);
  return m[1].trim();
};
const C = { paper: tok('paper'), panel: tok('panel'), ink: tok('ink'), ink2: tok('ink-2'), ink3: tok('ink-3'), rule: tok('rule'), gold: tok('gold') };

const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round16-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const OPTS = need(R.options, 'options');
if (!OPTS.length) throw new Error('round16-build: the report has no options');
const BASE = need(R.baseline, 'baseline');
const WIDTHS = (R.widths && R.widths.length ? R.widths : Object.keys(BASE.at).map(Number));
const CROPS = R.cropWidths && R.cropWidths.length ? R.cropWidths : WIDTHS;
const NOTES = R.notes ?? [];
const letter = (i) => String.fromCharCode(65 + i);
const at = (o, w) => need(o.at[String(w)], `${o.label} @${w}`);
const base = (w) => need(BASE.at[String(w)], `baseline @${w}`);
const num = (v) => (v === null || v === undefined ? '—' : v);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// The h1's built markup contains Astro's `<!-- -->` and a <br>; a specimen that printed it raw would be showing
// markup rather than the line the reader meets. Tags out, the break kept as a soft mark.
const h1text = (s) => esc(s.replace(/<!--.*?-->/g, '').replace(/&nbsp;/g, ' \u00a0').replace(/<br[^>]*>/g, ' / ').replace(/<[^>]+>/g, ''));
const b64 = (p) => (p && existsSync(p) ? readFileSync(p).toString('base64') : null);
// Headroom: how much of the column the longest line left empty. This is the number that prices the NEXT copy
// edit — a name with 6px to spare is one adjective away from a whole extra line box.
const slack = (m, where) => {
  const b = m[where];
  if (!b || b.availW === null || b.availW === undefined) return null;
  return +(b.availW - b.inkW).toFixed(1);
};
const slackTxt = (m, where) => {
  const s = slack(m, where);
  return s === null ? '' : ` (${s}px to the next box)`;
};

// The questions, assembled from the option table so the letters can never disagree with the rows below.
const L = (label) => {
  const i = OPTS.findIndex((o) => o.label === label);
  if (i < 0) throw new Error(`round16-build: the report has no option "${label}" — the question is pointing at a table row that does not exist`);
  return `${letter(i)} (${label})`;
};
const OPTQ = OPTS.map((o, i) => `<li><b>${letter(i)} — ${esc(o.what)}.</b> ${esc(o.claims)}</li>`).join('');

const stringRows = [BASE, ...OPTS].map((o, i) => `
<tr>
  <td>${i === 0 ? 'shipped' : `${letter(i - 1)} <span class="lbl">${esc(o.label)}</span>`}</td>
  <td>${esc(o.locator ?? R.shipped.locator)}</td>
  <td>${h1text(o.h1 ?? R.shipped.h1)}</td>
  <td>${esc(o.band ?? R.shipped.band)}</td>
  <td>${esc(o.name ?? R.shipped.name)}</td>
</tr>`).join('');

const cells = (w) => `
<h2>The identity block at ${w}px — locator, name, lede, as the page paints it</h2>
<div class="strip">${[BASE, ...OPTS].map((o, i) => {
  const m = at(o, w);
  const crop = m.crop ?? (o.at[String(w)] && o.at[String(w)].crop);
  const img = b64(crop);
  const delta = i === 0 ? '' : (() => {
    const dd = need(o.delta, `${o.label} deltas`)[String(w)];
    const lines = m.h1?.lines - base(w).h1.lines;
    return `<span class="nums">page ${num(m.pageHeight)}px (${dd === 0 ? 'same' : `${dd} vs shipped`}) · h1 ${m.h1?.lines} lines${slackTxt(m, 'h1')} · locator ${m.locator?.lines} line(s)${slackTxt(m, 'locator')} · band lede ${m.bandLede?.lines}</span>`;
  })();
  return `<figure class="card${img ? '' : ' noimg'}" style="width:${Math.min(470, w + 30)}px">
    ${img ? `<img src="data:image/png;base64,${img}" alt="${i === 0 ? 'shipped' : o.label} identity block at ${w}px">` : '<div class="warn">no crop for this cell — the browser posted no box, so there is nothing to photograph</div>'}
    <figcaption><b>${i === 0 ? 'shipped' : `${letter(i - 1)} ${esc(o.label)}`}</b>
      <span class="what">${i === 0 ? `locator "${esc(base(w).locator?.text)}" · h1 "${esc(base(w).h1?.text)}"` : esc(o.what)}</span>
      ${i === 0 ? `<span class="nums">page ${num(base(w).pageHeight)}px · h1 ${base(w).h1?.lines} lines${slackTxt(base(w), 'h1')} · locator ${base(w).locator?.lines} line(s)${slackTxt(base(w), 'locator')} · band lede ${base(w).bandLede?.lines}</span>` : delta}
    </figcaption></figure>`;
}).join('')}</div>`;

const tableRows = OPTS.map((o) => `<tr><td>${esc(o.label)}</td>${WIDTHS.map((w) => {
  const m = at(o, w), b = base(w);
  return `<td class="n">${need(o.delta, 'deltas')[String(w)]}<br><span>h1 ${m.h1?.lines}/${b.h1?.lines} (${slack(m, 'h1')}px) · loc ${m.locator?.lines}/${b.locator?.lines} · band ${m.bandLede?.lines}/${b.bandLede?.lines}</span></td>`;
}).join('')}</tr>`).join('');

const censusRows = (R.census ?? []).map((c) => `<tr><td>${esc(c.route)}</td><td class="n">${c.nameSlots}</td><td class="n">${c.bookWord}</td><td>${(c.quoted ?? []).map(esc).join('<br>') || '<span class="lbl">no occurrence of the word on this route</span>'}</td></tr>`).join('');

const surfaceRows = (R.surface ?? []).map((s) => `<tr><td><code>${esc(s.path)}</code></td><td class="n">${s.nameSlots}</td><td class="n">${s.bookWord}</td><td class="lbl">${esc(s.sample ?? '')}</td></tr>`).join('');

const extRows = (R.external ?? []).map((e) => `<tr><td>${esc(e.what)}</td><td><code>${esc(e.value)}</code></td><td>${e.holdsName ? '<b>yes</b>' : 'no'}</td><td>${esc(e.owns)}</td></tr>`).join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Round 16 — the club's name, and the word "Book"</title>
<style>
  body { margin: 0; background: ${C.panel}; color: ${C.ink}; font: 15px/1.55 system-ui, sans-serif; }
  main { max-width: 1500px; margin: 0 auto; padding: 32px 24px 96px; }
  h1 { font-size: 26px; margin: 0 0 6px; }
  h2 { font-size: 19px; margin: 40px 0 6px; }
  .meta, .lbl { color: ${C.ink3}; font-size: 13px; }
  .strip { display: flex; gap: 14px; align-items: flex-start; overflow-x: auto; padding-bottom: 10px; }
  .card { margin: 0; flex: 0 0 auto; background: ${C.paper}; border: 1px solid ${C.rule}; padding: 8px; }
  .card img { display: block; width: 100%; height: auto; }
  figcaption b { display: block; font-size: 14px; margin-top: 4px; }
  .what { display: block; color: ${C.ink2}; font-size: 12px; margin: 3px 0; }
  .nums { display: block; color: ${C.ink3}; font-size: 11.5px; }
  .warn { padding: 24px 8px; color: ${C.ink2}; font-size: 12px; }
  table { border-collapse: collapse; margin-top: 14px; font-size: 13px; background: ${C.paper}; width: 100%; }
  th, td { border: 1px solid ${C.rule}; padding: 6px 9px; text-align: left; vertical-align: top; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  td.n span { color: ${C.ink3}; font-size: 11px; }
  code { font-size: 12px; }
  ol.notes { font-size: 12.5px; color: ${C.ink2}; }
  .ask { background: ${C.paper}; border: 1px solid ${C.rule}; padding: 14px 16px; margin: 18px 0 0; }
  .ask h3 { margin: 0 0 6px; font-size: 16px; }
  .ask li { margin-bottom: 6px; }
</style></head><body><main>
<h1>Round 16 — the club's name, and where the word "Book" reaches a reader</h1>
<p class="meta">measured ${R.measuredAt} · widths ${WIDTHS.join(' / ')} · options from
<code>design/grill/copy-options.mjs</code> applied to a copy of <code>dist/client</code> · every number from
<code>design/grill/copy-measure.js</code> on that copy · generated by <code>design/grill/round16-build.mjs</code>
from <code>design/grill/round16/report.json</code> (${R.seconds}s run)</p>

<div class="ask">
  <h3>What is being asked, in answer form</h3>
  <ol>
    <li><b>Which package?</b> Each option below is a name plus the two sentences that describe what happens at the
      table. ${OPTS.map((o, i) => `<b>${letter(i)}</b> ${esc(o.what)}`).join(' · ')}.
      <br>Answer <b>1a / 1b / 1c / 1d</b> (or 1none).</li>
    ${OPTS.map((o, i) => `<li>${letter(i)} — <b>${esc(o.what)}</b><br><span class="lbl">cost: ${esc(o.surface)}</span></li>`).join('')}
    <li><b>Does the secondary draw get named in prose?</b> The books and the math history are already on the page as
      three public-domain plates and the hero engraving; the word "books" survives today only in the horizon shelf's
      <code>aria-label</code> and in the plate's <code>alt</code> (both quoted from the source's own description).
      Naming it in a sentence — "the drawings on this page are from old books we keep pulling ideas off" — is a claim
      about the club's practice, so it needs the operator's own words as its source (D92's rule, the same one that
      killed "Monthly" until a source was named).
      <br>Answer <b>2yes "&lt;sentence in your words&gt;" / 2no</b>.</li>
    <li><b>How far does a rename reach?</b> The identity block is two files. The name a subscriber's calendar app
      shows, and the name painted into the share card, are further down the same change.
      <br>Answer <b>3a identity+calendar+card / 3b identity+calendar / 3c identity only</b>.</li>
    <li><b>What about the names this site cannot change?</b> Meetup's group, the apex domain and the Mobilizon
      handle all still say "book" (values in the table at the bottom — read from the tree, not remembered). A
      mismatch between the site's name and the group's name is a fact a visitor can see on the join path.
      <br>Answer <b>4accept (the site leads, the org names follow later) / 4open (open the Meetup/Mobilizon rename as its own item)</b>.</li>
  </ol>
  <p class="meta">Nothing here is applied to the site: each page was measured in a copy of <code>dist/client</code>.
  Taking an option means editing the components, and it goes through <code>verify</code> like anything else —
  including <code>check:content</code>, which fails an unsourced claim, and <code>check:links</code>, which would
  catch a rename that touched the Meetup URL by accident.</p>
</div>

<h2>The strings, side by side</h2>
<table><thead><tr><th>option</th><th>locator (the line above the name)</th><th>h1 (the name, as the built page holds it)</th><th>the schedule band's lede</th><th>the name in every other slot</th></tr></thead>
<tbody>${stringRows}</tbody></table>

${CROPS.map(cells).join('\n')}

<h2>Every option at every width — page-height delta, then line boxes</h2>
<table><thead><tr><th>option</th>${WIDTHS.map((w) => `<th class="n">@${w}<br><span>shipped ${num(base(w).pageHeight)}px</span></th>`).join('')}</tr></thead>
<tbody>${tableRows}</tbody></table>
<p class="meta">"h1 2/3" = this option's line boxes over the shipped page's, counted from the browser's own line
rects after the ratified faces settle. A copy change that adds a line box at 320 costs a whole line of scroll on
every phone that ever loads the page.</p>

<h2>Where the word "Book" is on the built site today</h2>
<table><thead><tr><th>route</th><th class="n">name slots</th><th class="n">"book"</th><th>the occurrences, in their own words</th></tr></thead>
<tbody>${censusRows}</tbody></table>

<h2>Where the edit lands in this repo</h2>
<table><thead><tr><th>file</th><th class="n">name slots</th><th class="n">"book"</th><th>first occurrence, quoted</th></tr></thead>
<tbody>${surfaceRows}</tbody></table>

<h2>And where it does not</h2>
<table><thead><tr><th>slot</th><th>value in the tree</th><th>holds "book"?</th><th>whose to change</th></tr></thead>
<tbody>${extRows}</tbody></table>

<h2>Notes from the run</h2>
<ol class="notes">${NOTES.length ? NOTES.map((n) => `<li>${esc(n)}</li>`).join('') : '<li>none</li>'}</ol>
</main></body></html>`;

writeFileSync(OUT, html);
const missing = OPTS.filter((o) => CROPS.some((w) => !o.at[String(w)]?.crop));
console.log(`wrote ${OUT} — ${CROPS.length} photographed rows (${CROPS.join(', ')}) x ${1 + OPTS.length} options` +
  (missing.length ? `; NO CROP for: ${missing.map((o) => o.label).join(', ')}` : ''));
