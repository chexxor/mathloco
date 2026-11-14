#!/usr/bin/env node
// check:row-geometry — a schedule row is three zones, and its prose is capped at the measure (D313, MS19, S037).
//
//   npm run check:row-geometry            # over the built dist/client
//   npm run check:row-geometry:selftest   # plant each defect, require each to FAIL, with clean controls
//
// Why this gate exists (2026-11-14, the commissioned read's item 4, D313). The read's claim — "the date card
// atomizes into seven stacked elements with no grouping" — was verified against the artifact, and the row was
// restructured: leaf (the date drawn), `data-head` (the date said as a sentence + the title), `data-copy-prose`
// (the series and venue lines, capped at `max-w-measure`), the sign-up cluster, then the plate. The restructure
// was real, the probe that measured it (`design/schedule-geometry.mjs`, `design/line-length.mjs`) prints numbers
// and exits 0 whatever it measures, and DESIGN.md wrote the shape down as a rule. A rule that lives only in prose
// and in a diagnostic comes back the day someone edits the markup: delete the `data-head` div, drop
// `max-w-measure` from the prose wrapper, or move the date sentence under the title, and every gate stays green.
// That is D301/D302's class — "a part that reports is not a part that gates" — in a new place.
//
// What is checkable without a browser is the STRUCTURE, and structure is exactly what regresses:
//   row-head-missing            the row's date sentence and title are not grouped
//   row-prose-uncapped          prose paragraphs sit in the copy lane with no `max-w-measure` wrapper
//   row-date-out-of-head        the date sentence is not inside the head, or comes after the title (the row then
//                               shows the date twice with the title between, which is the stack the read flagged)
//   row-zone-order              leaf, copy, plate — the order `design/schedule-geometry.mjs` measures against
//   measure-token-missing       the emitted CSS has no `--container-measure`, so `max-w-measure` resolves to nothing
//   measure-out-of-band         the cap, converted to characters with the measured 0.455 em/character advance of
//                               PT Serif, lands outside DESIGN.md's 40-75 character reading band
//
// The character arithmetic is stated where it can be argued with: 32em / 0.455 em = ~70 characters @measured
// 2026-11-14 by `node design/line-length.mjs /schedule 1240 1024 640 320 --no-build` (longest measured row line
// 58 characters in the 512px box, 42 at a 320 viewport). The gate does not re-measure pixels — that is the
// browser set's job — it refuses a cap that cannot land in the band.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { emittedRoutes } from '../design/emitted-routes.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return resolve(i < 0 ? 'dist/client' : args[i + 1]);
})();

// Measured advance of the shipped prose face, from the same probe that counts real characters per line
// (design/grill/line-length-measure.js, Range rects over the painted glyphs). DESIGN.md's measure round states
// it as 0.455 em per character for PT Serif prose.
const EM_PER_CHAR = 0.455;
const BAND = [40, 75]; // DESIGN.md: the reading band prose is kept inside.

const ROW = /<li\b[^>]*data-surface="row"[^>]*>([\s\S]*?)<\/li>/g;
const HEAD = /<div data-head>([\s\S]*?)<\/div>/;
const PROSE = /<div data-copy-prose([^>]*)>([\s\S]*?)<\/div>/;
const DATE_SENTENCE = /<span class="text-label text-ink-3">/;
const PLATE = 'data-slot="PS-4"';
const LEAF = 'data-leaf';
const MEASURE_TOKEN = /--container-measure:\s*([0-9.]+)(em|px)/g;

/** Pure verdict over rows extracted from the artifact, so the selftest plants markup without a build. */
export const rowFindings = (rows, css) => {
  const fails = [];
  for (const [i, row] of rows.entries()) {
    const head = HEAD.exec(row);
    const prose = PROSE.exec(row);
    const hasProse = /<p\b[^>]*\btext-body\b/.test(row);
    const leaf = row.indexOf(LEAF);
    const copy = row.indexOf('data-copy');
    const plate = row.indexOf(PLATE);

    if (!head) {
      fails.push({
        rule: 'row-head-missing',
        detail: `row ${i + 1} has no data-head: the date sentence and the title are separate stacked elements again (D313). Group them, or the row is the seven-element stack the commissioned read flagged.`,
      });
    }
    if (hasProse && !(prose && /max-w-measure/.test(prose[1] || ''))) {
      fails.push({
        rule: 'row-prose-uncapped',
        detail: `row ${i + 1} paints prose with no max-w-measure wrapper, so it runs the whole copy lane — 633px at 1240, ~145 characters of serif prose (D313). Wrap the series and venue lines in <div data-copy-prose class="max-w-measure">.`,
      });
    }
    if (head && DATE_SENTENCE.test(row)) {
      // The sentence is in the head, and it comes before the title. Either half failing is the stack the
      // commissioned read flagged: the date painted, then the title, then the date again in prose.
      const headBody = head[1];
      const dateIdx = headBody.search(DATE_SENTENCE);
      const titleIdx = headBody.indexOf('<h3');
      if (dateIdx === -1 || (titleIdx !== -1 && dateIdx > titleIdx)) {
        fails.push({
          rule: 'row-date-out-of-head',
          detail: `row ${i + 1} puts the date sentence outside the head or after the title, so a stacked visitor meets the date twice with the title between (D313). The sentence belongs in data-head, above the h3.`,
        });
      }
    }
    if (leaf >= 0 && copy >= 0 && plate >= 0 && !(leaf < copy && copy < plate)) {
      fails.push({
        rule: 'row-zone-order',
        detail: `row ${i + 1} orders its zones leaf(${leaf}) copy(${copy}) plate(${plate}) — design/schedule-geometry.mjs measures the rail, the lane and the plate in that order, and a reordered row measures as something else (D313).`,
      });
    }
  }

  // Tailwind v4 emits the theme block into more than one shipped stylesheet (global.css and the `.rel.css`
  // twin), so the same declaration can appear twice. Dedupe before judging, or one change prints two findings.
  const tokens = [...new Map([...css.matchAll(MEASURE_TOKEN)].map((m) => [`${m[1]}${m[2]}`, { value: Number(m[1]), unit: m[2] }])).values()];
  if (!tokens.length) {
    fails.push({
      rule: 'measure-token-missing',
      detail: 'the emitted CSS carries no --container-measure, so the max-w-measure utility resolves to nothing and every "capped" prose block is uncapped (DESIGN.md, measure round).',
    });
  } else {
    for (const t of tokens) {
      const em = t.unit === 'px' ? t.value / 16 : t.value;
      const chars = em / EM_PER_CHAR;
      if (chars < BAND[0] || chars > BAND[1]) {
        fails.push({
          rule: 'measure-out-of-band',
          detail: `--container-measure: ${t.value}${t.unit} = ${em.toFixed(1)}em = ~${Math.round(chars)} characters of serif prose at 0.455 em/char, outside the ${BAND[0]}-${BAND[1]} band DESIGN.md's measure round set (shipped: 32em = ~70).`,
        });
      }
    }
  }
  return fails;
};

if (selftest) {
  const row = (inner) => `<li class="rounded-card px-4 flex flex-col" data-surface="row" data-date="2026-11-21">${inner}</li>`;
  const shipped = row(`
    <div aria-hidden="true" data-leaf class="bg-tint"><p class="text-label">Nov</p><p class="text-heading">21</p></div>
    <div data-copy class="min-w-0 flex-1">
      <div data-head><p class="tabular-nums"><span class="text-label text-ink-3">Saturday, Nov 21 &middot; 12:00 pm</span></p><h3 class="text-lede">MPLS Math Club Social</h3></div>
      <div data-copy-prose class="max-w-measure"><p class="mt-2 text-body leading-prose">Angel Food Bakery</p></div>
      <div data-rsvp-cluster><a href="/x">Meetup</a></div>
    </div>
    <div data-slot="PS-4"><img alt="a poster" src="/p.webp"></div>
  `);
  const CSS = '--container-measure:32em';
  const cases = [
    { name: 'clean control: the shipped row, three zones and a capped lane', rows: [shipped], css: CSS, want: [] },
    { name: 'the head div is deleted', rows: [row(`
      <div data-leaf></div>
      <div data-copy><p class="tabular-nums"><span class="text-label text-ink-3">Saturday, Nov 21</span></p><h3>Title</h3><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>
      <div data-slot="PS-4"><img alt="poster"></div>`) ], css: CSS, want: ['row-head-missing'] },
    { name: 'the prose wrapper loses max-w-measure', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><span class="text-label text-ink-3">Nov 21</span><h3>Title</h3></div><div data-copy-prose><p class="text-body">venue</p></div></div>
      <div data-slot="PS-4"><img alt="poster"></div>`) ], css: CSS, want: ['row-prose-uncapped'] },
    { name: 'the date sentence moves below the title', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><h3>Title</h3><span class="text-label text-ink-3">Nov 21</span></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>
      <div data-slot="PS-4"><img alt="poster"></div>`) ], css: CSS, want: ['row-date-out-of-head'] },
    { name: 'the plate is moved above the copy zone', rows: [row(`
      <div data-leaf></div>
      <div data-slot="PS-4"><img alt="poster"></div>
      <div data-copy><div data-head><span class="text-label text-ink-3">Nov 21</span><h3>Title</h3></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`) ], css: CSS, want: ['row-zone-order'] },
    { name: 'the measure token is gone from the CSS', rows: [shipped ? [shipped] : []], css: '--container-lead: 32em', want: ['measure-token-missing'] },
    { name: 'the cap is widened to 60em (132 characters)', rows: [shipped], css: '--container-measure:60em', want: ['measure-out-of-band'] },
    { name: 'the cap is cut to 12em (26 characters)', rows: [shipped], css: '--container-measure:12em', want: ['measure-out-of-band'] },
    { name: 'clean control: the widest cap still inside the band (34em ~ 75)', rows: [shipped], css: '--container-measure:34em', want: [] },
    { name: 'clean control: an empty calendar paints no rows', rows: [], css: CSS, want: [] },
  ];

  let bad = 0;
  for (const c of cases) {
    const got = rowFindings(c.rows, c.css).map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(58)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
  }
  // The extractor must find the rows the shipped markup actually paints, or the gate is green on a page it
  // cannot see (the D301 lesson: prove the parser meets the artifact).
  const real = rowFindings([shipped], CSS);
  const shapeOk = real.length === 0;
  console.log(`${shapeOk ? 'ok   parsed' : 'FAIL parsed'}  the row extractor reads a shipped row as one row with head, prose and plate   ${shapeOk ? '0 findings' : real.map((f) => f.rule).join(',')}`);
  if (!shapeOk) bad++;
  console.log(`\ncheck:row-geometry selftest — ${cases.length + 1} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ the real run

if (!existsSync(DIST)) {
  console.error(`check:row-geometry: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
  process.exit(1);
}
const pages = emittedRoutes(DIST).map((route) => ({ route, html: readFileSync(resolvePage(route), 'utf8') }));
const rows = [];
for (const { route, html } of pages) {
  for (const m of html.matchAll(ROW)) rows.push({ route, html: m[1] });
}
const cssFiles = readdirSync(DIST, { recursive: true }).map((f) => String(f)).filter((f) => f.endsWith('.css'));
const css = cssFiles.map((f) => readFileSync(resolve(DIST, f), 'utf8')).join('\n');

const fails = rowFindings(rows.map((r) => r.html), css);
const tokens = [...new Set([...css.matchAll(MEASURE_TOKEN)].map((m) => `${m[1]}${m[2]}`))];
console.log(`check:row-geometry — ${rows.length} row(s) across ${pages.filter((p) => ROW.test(p.html)).length} page(s); measure ${tokens.join(', ') || 'MISSING'} = ~${Math.round(parseFloat(tokens[0]) / EM_PER_CHAR)} characters of serif prose at 0.455 em/char`);
for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
console.log(fails.length ? `\n${fails.length} finding(s).` : '\nEvery row is a rail, a capped copy zone and a plate, in that order.');
process.exit(fails.length ? 1 : 0);

function resolvePage(route) {
  if (route === '/') return resolve(DIST, 'index.html');
  const bare = route.replace(/^\//, '');
  const asDir = resolve(DIST, `${bare}/index.html`);
  return existsSync(asDir) ? asDir : resolve(DIST, `${bare}.html`);
}
