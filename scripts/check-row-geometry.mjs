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
//   row-date-not-time           the date sentence is loose text rather than `<time datetime="…">`, so no tool
//                               (a screen reader, a calendar importer, the next gate) can read the date as a date
//   row-date-time-disagrees     the `<time datetime>` value is not the row's own `data-date` handle (D173: a
//                               handle is part of the interface, so two copies of one date must agree)
//   zone-not-stated / zone-not-on-first-row / zone-repeated  the page of record names its zone once, on the
//                               first row it prints (D327, the second read §5.1)
//   row-zone-order              leaf, copy — the order `design/schedule-geometry.mjs` measures against
//   row-art-painted             a row that paints a plate or an `<img>` again (D-D, round-4 §7.1 — the rows are
//                               typographic. What made the old plate a false claim was its NAME: `event-2026-11-07-club-social.webp`
//                               sat on rows dated Nov 21, Dec 5 and Dec 19, and R7's rule of 2026-11-16 removes
//                               that claim by naming an asset `<role>-<mediaUid>.<ext>` with no date in it, while
//                               R8's criterion replaces the criterion that a date in a name made decidable; the
//                               rule is still what stops a plate coming back with every gate green, which is D301's
//                               class in this new place)
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

const ROW = /<li\b[^>]*data-surface="row"[\s\S]*?<\/li>/g;
const HEAD = /<div data-head>([\s\S]*?)<\/div>/;
const PROSE = /<div data-copy-prose([^>]*)>([\s\S]*?)<\/div>/;
const DATE_SENTENCE = /<span class="text-label text-ink-3">/;
const TIME_EL = /<time\b[^>]*datetime="(\d{4}-\d{2}-\d{2})"/;
const DATA_DATE = /data-date="(\d{4}-\d{2}-\d{2})"/;
const ZONE_WORD = /\bCentral\b/;
/** (D-D, round-4 §7.1) A row is two zones — the date rail and the copy zone — and nothing else. The plate
 *  (`data-slot="PS-4"`, `event-*.webp`) was deleted from the row in the same commit that added this rule, so a
 *  row that paints one again is the D301 class: a shape a note describes and no gate catches. */
const ART_IN_ROW = /data-slot="PS-\d"|<img\b/;
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
    const art = ART_IN_ROW.exec(row);

    if (art) {
      fails.push({
        rule: 'row-art-painted',
        detail: `row ${i + 1} paints \`${art[0].trim()}\` — the rows are typographic (D-D, round-4 §7.1) and no mirrored event asset exists in this repo at all: R7's sweep of 2026-11-16 deleted the seven \`src/assets/photos/event-*.png\` with the plate (D359). A filename no longer asserts a date, so what makes a plate a false claim is no longer a name contradicting the row (R8's criterion replaced that one) — it is the row being typographic by ruling, and a shared asset being an illustration of a format (\`standing: true\` in the manifest) rather than a photograph of the meeting beside it. Delete it, or name what it shows and give it a real alt; \`EventArt.astro\` and \`src/lib/event-art.ts\` stay as wiring over an empty map.`,
      });
    }

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
      // h2 since S040 (the row title is a direct child of the page's h1, so an h3 skipped a level). Matching
      // both levels is deliberate: a gate pinned to `<h3` stops testing the day the level changes, which is
      // the "planting that quietly stopped testing anything" trap (D268).
      const titleIdx = headBody.search(/<h[23]\b/);
      if (dateIdx === -1 || (titleIdx !== -1 && dateIdx > titleIdx)) {
        fails.push({
          rule: 'row-date-out-of-head',
          detail: `row ${i + 1} puts the date sentence outside the head or after the title, so a stacked visitor meets the date twice with the title between (D313). The sentence belongs in data-head, above the heading.`,
        });
      }
      // The date has to be a date, not just words that look like one (D327, the second read §5.1).
      const timeMatch = TIME_EL.exec(row);
      const dataDate = DATA_DATE.exec(row.slice(0, row.indexOf('>') + 1));
      if (!timeMatch) {
        fails.push({
          rule: 'row-date-not-time',
          detail: `row ${i + 1} paints its date as loose text: no <time datetime="YYYY-MM-DD"> wraps the sentence. A screen reader hears a string, a calendar importer sees nothing, and the row's own data-date handle is the only machine-readable copy (D327, D173).`,
        });
      } else if (dataDate && timeMatch[1] !== dataDate[1]) {
        fails.push({
          rule: 'row-date-time-disagrees',
          detail: `row ${i + 1} says data-date="${dataDate[1]}" but the <time> element says "${timeMatch[1]}". Two copies of one date that disagree is the same defect class as a nav chip disagreeing with the schedule (D311).`,
        });
      }
    }
    if (leaf >= 0 && copy >= 0 && !(leaf < copy)) {
      fails.push({
        rule: 'row-zone-order',
        detail: `row ${i + 1} orders its zones leaf(${leaf}) copy(${copy}) — design/schedule-geometry.mjs measures the rail and the lane in that order, and a reordered row measures as something else (D313, and D-D's two-zone row).`,
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

/** Zone naming is a property of a PAGE, not of a row: the read §5.1 asks for the zone once, on the first time
 * the page shows. Rows are grouped by page so the rule counts in page order. */
export const zoneFindings = (pages) => {
  const out = [];
  for (const page of pages) {
    const rows = page.rows.filter((r) => DATE_SENTENCE.test(r));
    if (!rows.length) continue;
    const hits = rows.map((r) => ZONE_WORD.test(r)).map((h, i) => (h ? i : -1)).filter((i) => i >= 0);
    if (hits.length === 0) {
      out.push({
        rule: 'zone-not-stated',
        detail: `${page.route} prints ${rows.length} time(s) and names no zone. Every row carries DTSTART;TZID=America/Chicago, so "12:00 – 1:00" is a fact a visitor in another zone cannot place on a clock (D327).`,
      });
    } else if (hits.length === 1 && hits[0] === 0) {
      // exactly the shipped shape: one word, on the first row.
    } else if (hits.length === 1) {
      out.push({
        rule: 'zone-not-on-first-row',
        detail: `${page.route} names the zone on row ${hits[0] + 1}, not the first row the visitor meets (D327).`,
      });
    } else {
      out.push({
        rule: 'zone-repeated',
        detail: `${page.route} names the zone on ${hits.length} rows (rows ${hits.map((h) => h + 1).join(', ')}). The ruling is once per page; five rows repeating one word is the noise the read §5.1 was objecting to (D327).`,
      });
    }
  }
  return out;
};

if (selftest) {
  const row = (inner, date = '2026-11-21') => `<li class="rounded-card px-4 flex flex-col" data-surface="row" data-date="${date}">${inner}</li>`;
  const head = (date, zone = ' Central') => `<div data-head><p class="tabular-nums"><time datetime="${date}"><span class="text-label text-ink-3">Saturday, November 21 &middot; 12:00 – 1:00${zone}</span></time></p><h2 class="text-lede">Social</h2></div>`;
  // The shipped row is TWO zones now (D-D, round-4 §7.1): the date rail and the copy zone, and the copy zone
  // carries one primary link — `splitPaths()` puts Meetup in the row, Discord and Facebook in the page's standing
  // cluster, which is why no fixture below paints a cluster inside a row.
  const shipped = row(`
    <div aria-hidden="true" data-leaf class="bg-tint"><p class="text-label">Nov</p><p class="text-heading">21</p></div>
    <div data-copy class="min-w-0 flex-1">
      ${head('2026-11-21')}
      <div data-copy-prose class="max-w-measure"><p class="mt-2 text-body leading-prose">Angel Food Bakery</p></div>
      <a href="https://www.meetup.com/g/events/1/" target="_blank" rel="noopener noreferrer" data-rsvp-platform="Meetup" data-rsvp-date="2026-11-21" class="text-label">Sign up on Meetup</a>
    </div>`);
  const CSS = '--container-measure:32em';
  const verdict = (rows, css, pages) => rowFindings(rows, css).concat(zoneFindings(pages ?? [{ route: '/fixture', rows }]));
  const cases = [
    { name: 'clean control: the shipped row, two zones and a capped lane', rows: [shipped], css: CSS, want: [] },
    { name: 'the head div is deleted, and the zone word with it', rows: [row(`
      <div data-leaf></div>
      <div data-copy><p class="tabular-nums"><time datetime="2026-11-21"><span class="text-label text-ink-3">Saturday, Nov 21 · 12:00 – 1:00</span></time></p><h2>Title</h2><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`) ], css: CSS, want: ['row-head-missing', 'zone-not-stated'] },
    { name: 'the prose wrapper loses max-w-measure', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><span class="text-label text-ink-3">Nov 21 Central</span><h2>Title</h2></div><div data-copy-prose><p class="text-body">venue</p></div></div>`) ], css: CSS, want: ['row-prose-uncapped', 'row-date-not-time'] },
    { name: 'the date sentence moves below the title', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><h2>Title</h2><time datetime="2026-11-21"><span class="text-label text-ink-3">Nov 21 Central</span></time></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`) ], css: CSS, want: ['row-date-out-of-head'] },
    { name: 'the copy zone is pulled above the date rail', rows: [row(`
      <div data-copy><div data-head><time datetime="2026-11-21"><span class="text-label text-ink-3">Nov 21 Central</span></time><h2>Title</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>
      <div data-leaf></div>`) ], css: CSS, want: ['row-zone-order'] },
    { name: 'the plate is painted back into a row (D-D deleted it)', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><time datetime="2026-11-21"><span class="text-label text-ink-3">Nov 21 Central</span></time><h2>Title</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>
      <div data-slot="PS-4"><img alt="a poster" src="/social-1f54c2.webp"></div>`) ], css: CSS, want: ['row-art-painted'] },
    { name: 'an image is painted in a row with no plate slot at all', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><time datetime="2026-11-21"><span class="text-label text-ink-3">Nov 21 Central</span></time><h2>Title</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div><img alt="a poster" src="/poster.webp"></div>`) ], css: CSS, want: ['row-art-painted'] },
    { name: 'the measure token is gone from the CSS', rows: [shipped], css: '--container-lead: 32em', want: ['measure-token-missing'] },
    { name: 'the cap is widened to 60em (132 characters)', rows: [shipped], css: '--container-measure:60em', want: ['measure-out-of-band'] },
    { name: 'the cap is cut to 12em (26 characters)', rows: [shipped], css: '--container-measure:12em', want: ['measure-out-of-band'] },
    { name: 'the date is loose text again — the <time> wrapper is gone', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><p class="tabular-nums"><span class="text-label text-ink-3">Saturday, November 21 Central</span></p><h2>Title</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`) ], css: CSS, want: ['row-date-not-time'] },
    { name: 'the <time> value disagrees with the data-date handle', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><p class="tabular-nums"><time datetime="2026-11-28"><span class="text-label text-ink-3">Saturday, November 21 Central</span></time></p><h2>Title</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`) ], css: CSS, want: ['row-date-time-disagrees'] },
    { name: 'the zone word is dropped from the first row', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><p class="tabular-nums"><time datetime="2026-11-21"><span class="text-label text-ink-3">Saturday, November 21 · 12:00 – 1:00</span></time></p><h2>Title</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`) ], css: CSS, want: ['zone-not-stated'] },
    { name: 'every row repeats the zone word', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><p class="tabular-nums"><time datetime="2026-11-21"><span class="text-label text-ink-3">Sat 21 · 12:00 Central</span></time></p><h2>A</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`, '2026-11-21'), row(`
      <div data-leaf></div>
      <div data-copy><div data-head><p class="tabular-nums"><time datetime="2026-12-05"><span class="text-label text-ink-3">Sat 5 · 12:00 Central</span></time></p><h2>B</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`, '2026-12-05')], css: CSS, want: ['zone-repeated'] },
    { name: 'the zone word sits on the second row only', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><p class="tabular-nums"><time datetime="2026-11-21"><span class="text-label text-ink-3">Sat 21 · 12:00</span></time></p><h2>A</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`, '2026-11-21'), row(`
      <div data-leaf></div>
      <div data-copy><div data-head><p class="tabular-nums"><time datetime="2026-12-05"><span class="text-label text-ink-3">Sat 5 · 12:00 Central</span></time></p><h2>B</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`, '2026-12-05')], css: CSS, want: ['zone-not-on-first-row'] },
    { name: 'clean control: two rows, the zone named on the first only', rows: [row(`
      <div data-leaf></div>
      <div data-copy><div data-head><p class="tabular-nums"><time datetime="2026-11-21"><span class="text-label text-ink-3">Sat 21 · 12:00 Central</span></time></p><h2>A</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`, '2026-11-21'), row(`
      <div data-leaf></div>
      <div data-copy><div data-head><p class="tabular-nums"><time datetime="2026-12-05"><span class="text-label text-ink-3">Sat 5 · 12:00</span></time></p><h2>B</h2></div><div data-copy-prose class="max-w-measure"><p class="text-body">venue</p></div></div>`, '2026-12-05')], css: CSS, want: [] },
    { name: 'clean control: the widest cap still inside the band (34em ~ 75)', rows: [shipped], css: '--container-measure:34em', want: [] },
    { name: 'clean control: an empty calendar paints no rows', rows: [], css: CSS, want: [] },
  ];

  let bad = 0;
  for (const c of cases) {
    const got = verdict(c.rows, c.css).map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(58)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
  }
  // The extractor must find the rows the shipped markup actually paints, or the gate is green on a page it
  // cannot see (the D301 lesson: prove the parser meets the artifact).
  const real = verdict([shipped], CSS);
  const shapeOk = real.length === 0;
  console.log(`${shapeOk ? 'ok   parsed' : 'FAIL parsed'}  the row extractor reads a shipped row as one row with head, prose and one primary link   ${shapeOk ? '0 findings' : real.map((f) => f.rule).join(',')}`);
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
const pagesWithRows = pages.map((p) => ({ route: p.route, rows: [...p.html.matchAll(ROW)].map((m) => m[0]) }));
const rows = pagesWithRows.flatMap((p) => p.rows);
const cssFiles = readdirSync(DIST, { recursive: true }).map((f) => String(f)).filter((f) => f.endsWith('.css'));
const css = cssFiles.map((f) => readFileSync(resolve(DIST, f), 'utf8')).join('\n');

const fails = rowFindings(rows, css).concat(zoneFindings(pagesWithRows));
const tokens = [...new Set([...css.matchAll(MEASURE_TOKEN)].map((m) => `${m[1]}${m[2]}`))];
const zonePages = pagesWithRows.filter((p) => p.rows.some((r) => ZONE_WORD.test(r)));
console.log(`check:row-geometry — ${rows.length} row(s) across ${pages.filter((p) => ROW.test(p.html)).length} page(s); measure ${tokens.join(', ') || 'MISSING'} = ~${Math.round(parseFloat(tokens[0]) / EM_PER_CHAR)} characters of serif prose at 0.455 em/char; zone named on ${zonePages.length} page(s), first row only (${zonePages.map((p) => p.route).join(', ') || 'none'})`);
for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
console.log(fails.length ? `\n${fails.length} finding(s).` : '\nEvery row is a rail and a capped copy zone, in that order, with no art painted and its date a <time>, and its zone named once.');
process.exit(fails.length ? 1 : 0);

function resolvePage(route) {
  if (route === '/') return resolve(DIST, 'index.html');
  const bare = route.replace(/^\//, '');
  const asDir = resolve(DIST, `${bare}/index.html`);
  return existsSync(asDir) ? asDir : resolve(DIST, `${bare}.html`);
}
