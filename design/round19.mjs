#!/usr/bin/env node
// round19.mjs — the round-19 runner: every treatment of the home page's date, photographed and priced from the
// SAME load that made the number.
//
//   npm run round19              # measure; writes design/grill/round19/report.json
//   npm run round19:specimen     # the specimen the operator chooses from, from that report
//
// Why this round exists: see `design/grill/round19-options.mjs`'s header — the operator's word was that the home
// date does not read as maintained data, and D73 / the prerender rule / D115 make "dynamic" a claim this tree
// cannot make. What it can make is the register the site already runs, so this round prices WHERE the register
// sits and HOW LOUD the date is, in the two vocabularies the design system already owns (DESIGN.md's freshness
// register, and D231's date object: leaf fill · copy · plate).
//
// Method, and what each number is:
//   - a treatment is a byte delta on the SHIPPED page, written into a copy under `.design/tmp-round19/<id>/`.
//     Nothing here edits `dist/`: a measurement step must not mutate what gets deployed (design/README.md).
//   - every class an option uses is checked against the built sheet before the run, and one the sheet does not
//     ship THROWS (D110 / record 0018: Tailwind generates CSS by scanning source, so a class the scanner never
//     saw paints nothing, and a specimen that paints nothing is a claim about a build nobody made).
//   - boxes and the page height come from `dist-measure.mjs` + `date-fresh-measure.js` inside Firefox, after the
//     ratified faces settle, so the stamp line's WRAP at 390 is the wrap the page makes and not a fallback's.
//   - the contrasts are token arithmetic — the same `contrastTriple` the contrast gate's own oracle uses — printed
//     against BARS.text, so a colour choice is a number the operator can read off rather than a shade to squint at.
//   - the shot is firefox's own, at the variant's viewport: the screenshot is taken at LOAD, so it is not proof
//     the webfonts applied — the boxes are that, and they are taken after the settle (page-measure.mjs's note).
//
// The baseline row is `as-shipped`: the shipped page with THIS round's line removed, so a delta is this item's
// cost and not two changes stacked.
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFile } from 'node:child_process';
import { OPTIONS } from './grill/round19-options.mjs';
import { WIDTHS } from './grill/round19-options.mjs';
import { distState, staleLine } from './dist-fresh.mjs';
import { contrastTriple, BARS } from './grill/okcolor.mjs';

const OUT = resolve('design/grill/round19/report.json');
const SCRATCH = resolve('.design/tmp-round19');
const DIST = resolve('dist/client');
const HERO_ATTR = 'data-surface="next-meeting"';
const STAMP_WORDS = /Copied from the club/;

const args = process.argv.slice(2);
if (args.includes('--clean')) { rmSync(SCRATCH, { recursive: true, force: true }); console.log(`cleaned ${SCRATCH}`); process.exit(0); }

// --- the freshness guard every `--no-build` probe and `verify:browser` already pays (design/README.md):
//     after a branch switch, a stale dist means the gates measure the page the previous branch built.
{
  const s = distState(process.cwd());
  if (!s.fresh && !s.allowed) { console.error(staleLine(s)); process.exit(1); }
}

const THEMED = readFileSync(resolve('src/styles/global.css'), 'utf8');
const tok = (name) => {
  const m = THEMED.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`round19: --color-${name} is not in the token block — the specimen would be inventing a colour`);
  return m[1].trim();
};
const TOKENS = { paper: tok('paper'), tint: tok('tint'), ink: tok('ink'), ink3: tok('ink-3') };

const SHIPPED = (() => {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error(`round19: no dist/client/index.html — run npm run build first`);
  return readFileSync(join(DIST, 'index.html'), 'utf8');
})();

// --- the hero block, and the register line this item ships, located by what they print rather than by a class,
//     so an edit to a class list cannot silently make the transform a no-op.
const heroRange = (html) => {
  const at = html.indexOf(HERO_ATTR);
  if (at < 0) throw new Error(`round19: the shipped page carries no ${HERO_ATTR} — the hero block moved, and a transform that no longer lands would price a page that does not exist`);
  const open = html.lastIndexOf('<div', at);
  let depth = 1, i = open + 4;
  while (depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose < 0) throw new Error(`round19: the hero block never closes`);
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + 4; }
    else { depth--; i = nextClose + 6; }
  }
  return [open, i];
};

const SHEET = readdirSync(resolve(DIST, '_astro')).reduce((acc, f) => acc + readFileSync(resolve(DIST, '_astro', f), 'utf8'), '');
const hasClass = (cls) => new RegExp(`\\.${cls.replace(/\\/g, '\\\\')}\\s*\\{`).test(SHEET);

// The baseline every option is a delta from is the SHIPPED page with this item's register line removed, so a
// delta is this item's cost rather than two changes stacked. If the line is not shipped (the operator declined
// the item), the baseline is the shipped page and the report says which — a silent swap would let a row claim
// a delta from a page that already carries it.
const { html: BASE_HTML, hadStamp } = (() => {
  const [s, e] = heroRange(SHIPPED);
  const block = SHIPPED.slice(s, e);
  const stripped = block.replace(/<p[^>]*>Copied from the club[^<]*<\/p>/, '');
  if (stripped === block) return { html: SHIPPED, hadStamp: false };
  return { html: SHIPPED.slice(0, s) + stripped + SHIPPED.slice(e), hadStamp: true };
})();

function variantHtml(id) {
  const opt = OPTIONS.find((o) => o.id === id);
  if (!opt) throw new Error(`round19: no option ${id}`);
  let out = BASE_HTML;
  if (id === 'as-shipped') return out;
  if (opt.ink !== 'text-ink-3') {
    const [s, e] = heroRange(out);
    const block = out.slice(s, e).replace('text-label text-ink-3', `text-label ${opt.ink}`);
    out = out.slice(0, s) + block + out.slice(e);
  }
  if (opt.fill) {
    const [s, e] = heroRange(out);
    const block = out.slice(s, e).replace('<p class="tabular-nums"><time', `<p class="${opt.fill} tabular-nums"><time`);
    if (!block.includes(`${opt.fill} tabular-nums`)) throw new Error(`round19: the fill transform found no when-line paragraph — the hero's date line moved`);
    out = out.slice(0, s) + block + out.slice(e);
  }
  if (opt.chip) {
    out = out.replace(/ class="hidden (xs:inline text-label text-ink-3 tabular-nums)"/, ` class="$1"`);
    if (!/data-nav-date[^>]*class="(xs:inline[^"]*)"/.test(out)) throw new Error(`round19: the nav chip was not switched — its class list changed since this file was written`);
  }
  if (opt.stamp) {
    const [s, e] = heroRange(out);
    const block = out.slice(s, e);
    if (STAMP_WORDS.test(block)) throw new Error(`round19: the baseline already carries a register line, so the stamp row would be the baseline`);
    const line = '<p class="mt-1 text-label text-ink-3 tabular-nums">Copied from the club\u2019s own calendar on Nov 13, 2026</p>';
    // slot 'under' puts the register directly under the when-line (the date and its read as one object);
    // slot 'foot' closes the block, the way /dates closes its list. Both are the same line in the same class.
    let at2;
    if (opt.slot === 'under') {
      const when = block.indexOf('<p class="tabular-nums">');
      if (when < 0) throw new Error(`round19: the when-line paragraph is not where this transform expects — the hero's date line moved`);
      at2 = block.indexOf('</p>', when) + 4;
    } else if (opt.slot === 'foot') {
      at2 = block.lastIndexOf('</div>');
    } else {
      throw new Error(`round19: option ${opt.id} names no slot, and the placement is the question this round prices`);
    }
    out = out.slice(0, s) + block.slice(0, at2) + line + block.slice(at2) + out.slice(e);
  }
  return out;
}

// every class an option names must already be in the built sheet (D110), or the row paints nothing.
for (const o of OPTIONS) {
  for (const cls of [o.ink, ...(o.fill ? [o.fill] : []), 'text-label', 'text-ink-3', 'tabular-nums', 'mt-1']) {
    if (cls && !hasClass(cls)) throw new Error(`round19: .${cls} is not in the built sheet — a specimen that names it paints nothing (D110)`);
  }
}

const CONTRAST = (fg, bg) => +contrastTriple(TOKENS[fg], TOKENS[bg]).toFixed(2);
const contrasts = {
  'ink-3 on paper': CONTRAST('ink3', 'paper'),
  'ink on paper': CONTRAST('ink', 'paper'),
  'ink-3 on tint': CONTRAST('ink3', 'tint'),
  'ink on tint': CONTRAST('ink', 'tint'),
  'tint on paper': CONTRAST('tint', 'paper'),
  bar: BARS,
};

// --- the harness run, with the same flake guard the render gate works around (design/README.md: a firefox
//     that starts and never posts).
const ATTEMPTS = Number(process.env.ROUND_ATTEMPTS || 2);
const run = (dir, w, h, shot) => new Promise((done) => {
  execFile(process.execPath,
    ['design/grill/dist-measure.mjs', dir, '/', 'design/grill/date-fresh-measure.js', String(w), String(h), shot],
    { encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 },
    (err, out, stderr) => done({ err, out, stderr }));
});

async function measure(dir, w, h, shot) {
  for (let n = 1; n <= ATTEMPTS; n++) {
    const r = await run(dir, w, h, shot);
    const json = r.out ? r.out.slice(r.out.indexOf('{'), r.out.lastIndexOf('}') + 1) : '';
    if (json) { try { return { j: JSON.parse(json) }; } catch { } }
    if (n < ATTEMPTS) console.error(`  retry / @${w} in ${dir}`);
  }
  return { err: new Error('no report from firefox') };
}

async function pool(items, work, jobs = 3) {
  const out = new Array(items.length); let i = 0;
  const workers = [];
  for (let n = 0; n < Math.min(jobs, items.length); n++) {
    workers.push((async () => { while (i < items.length) { const k = i++; out[k] = await work(items[k]); } })());
  }
  await Promise.all(workers);
  return out;
}

mkdirSync(SCRATCH, { recursive: true });
const dirs = OPTIONS.map((o) => {
  const d = join(SCRATCH, o.id);
  mkdirSync(d, { recursive: true });
  cpSync(DIST, d, { recursive: true });
  const html = variantHtml(o.id);
  if (typeof html !== 'string') throw new Error(`round19: variantHtml(${o.id}) returned ${typeof html}, so the transform fell through`);
  writeFileSync(join(d, 'index.html'), html, 'utf8');
  return { id: o.id, dir: d };
});

const BASE = OPTIONS.find((o) => o.id === 'as-shipped') ?? OPTIONS[0];
const SAMPLES = 2;   // measured, not decorative: a single sample at 390 came in 60px high apart on the
// same bytes (3925 against 3985 on the shipped tree), so one load is not this harness's page height.
const sampleJob = [];
for (const o of OPTIONS) for (const x of WIDTHS) for (let n = 1; n <= SAMPLES; n++) sampleJob.push({ id: o.id, x, n });
const rows = await pool(sampleJob, async (job) => {
  const dir = dirs.find((d) => d.id === job.id).dir;
  const shot = job.n === 1 ? join(SCRATCH, `shot-${job.id}-${job.x.w}.png`) : null;
  const r = await measure(dir, job.x.w, job.x.h, shot);
  if (r.j) return { id: job.id, w: job.x.w, at: r.j, shot };
  return { id: job.id, w: job.x.w, error: `firefox never posted at ${job.x.w} (sample ${job.n})` };
}, 3);

const at = (id, w) => {
  const mine = rows.filter((x) => x.id === id && x.w === w);
  const good = mine.filter((x) => x.at);
  if (!good.length) return mine.length ? { error: mine[0].error } : null;
  // The page height is the number this harness is least steady on, so the row takes the SHORTEST load and
  // prints the spread rather than averaging a fluke into a claim.
  const paged = good.filter((x) => typeof x.at?.doc?.height === 'number');
  const chosen = paged.length ? paged.reduce((a, b) => (b.at.doc.height < a.at.doc.height ? b : a)) : good[0];
  const heights = paged.map((x) => x.at.doc.height);
  const spread = heights.length > 1 ? Math.max(...heights) - Math.min(...heights) : 0;
  return { ...chosen.at, pageHeights: heights, pageSpread: spread, shot: mine.map((x) => x.shot).find((s) => s) };
};
const fmt = (o, w) => {
  const j = at(o.id, w);
  if (!j) return null;
  if (j.error) return { error: j.error };
  return {
    pageHeights: j.pageHeights, pageSpread: j.pageSpread,
    doc: j.doc && { height: j.doc.height },
    hero: j.hero && { w: j.hero.w, h: j.hero.h, y: j.hero.y },
    stamp: j.stamp && { w: j.stamp.w, h: j.stamp.h, y: j.stamp.y },
    stampLines: j.stamp ? Math.max(1, Math.round(j.stamp.h / 17)) : 0,
    chip: j.chip && { w: j.chip.w, h: j.chip.h, display: j.chip.display },
    navRow: j.navRow && { x: j.navRow.x, w: j.navRow.w, h: j.navRow.h, y: j.navRow.y },
    navWrap: j.navWrap,
    navRight: j.navRight,
    navLines: j.navLines,
    navRows: j.navRows,
    shot: rows.find((x) => x.id === o.id && x.w === w)?.shot,
  };
};

const report = {
  measuredAt: new Date().toISOString(),
  siteFp: distState(process.cwd()).siteFp,
  widths: WIDTHS.map((x) => x.w),
  notes: [
    'the boxes are the page\'s own layout after the ratified faces settle (date-fresh-measure.js); the shot is firefox\'s at load',
    'the hero block\'s OWN box is the quoted delta: the page height repeats across loads of identical bytes (the shipped page came in 3925 and 3985 in one run), so pageHeights prints every sample and pageSpread prints the gap, and a page-height delta of less than that spread is no evidence of anything',
    'contrasts are token arithmetic against the same oracle the contrast gate uses; BARS.text is the ratified text bar',
    'the nav\u2019s date chip is NOT hidden above 380: the built sheet ships `@media (width>=380px){.xs\\:inline{display:inline}}` (the breakpoint is --breakpoint-xs, src/styles/global.css:48), so the shipped chip already paints at 390 and 1240 and only the 320 floor is in question — the chip column proves that, it is not a claim',
    'the stamp line is the sentence /dates prints, verbatim: D322 rules one wording for one provenance fact, and check-content.mjs pairs surfaces WITHIN a page, so this repeat is not a cross-page pair it can see',
  ],
  contrasts,
  baselineCarriesStamp: hadStamp,
  baseline: { id: BASE.id, name: BASE.name, at: Object.fromEntries(WIDTHS.map((x) => [x.w, fmt(BASE, x.w)])) },
  shipped: { id: 'register', at: Object.fromEntries(WIDTHS.map((x) => [x.w, fmt('register', x.w)])) },
  options: OPTIONS.map((o) => ({
    id: o.id, name: o.name, claim: o.claim, ruled: o.ruled,
    stamp: o.stamp, ink: o.ink, fill: o.fill, chip: o.chip,
    at: Object.fromEntries(WIDTHS.map((x) => [x.w, fmt(o, x.w)])),
  })),
};
mkdirSync(resolve('design/grill/round19'), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 1));

const bad = rows.filter((r) => r.error);
console.log(`round19 — ${OPTIONS.length} treatments x ${WIDTHS.length} widths, ${bad.length ? `${bad.length} unmeasured` : 'all measured'} @measured ${new Date().toISOString().slice(0, 16)} by this runner (Linux native, Node ${process.version})`);
for (const o of OPTIONS) {
  const d = WIDTHS.map((x) => {
    const j = fmt(o, x.w);
    if (!j || j.error) return `@${x.w} UNMEASURED`;
    return `@${x.w} block ${j.hero?.w}x${j.hero?.h} stamp ${j.stamp ? `${j.stamp.w}x${j.stamp.h}` : 'absent'} pages [${(j.pageHeights ?? []).join(',')}] spread ${j.pageSpread}`;
  }).join('  ');
  console.log(`  ${o.id.padEnd(14)} ${d}`);
}
const CHIP = OPTIONS.find((o) => o.id === 'register-chip');
console.log(`nav row at each width: ${WIDTHS.map((x) => { const j = fmt(CHIP, x.w); const b = j && j.navRows && j.navRows.length ? j.navRows[j.navRows.length - 1] : null; const room = b && typeof b.ink === 'number' ? b.box.x + b.box.w - b.ink : null; return `@${x.w} outer box ${b?.box?.w}x${b?.box?.h} ink to ${j?.navRight ?? '?'}px (${room ?? '?'}px of room) wrap ${j?.navWrap ?? '?'} over ${j?.navLines ?? '?'} line(s)`; }).join(' ')} (D114\u2019s floor is 320; a nowrap row that runs past its box is a failed width probe)`);
console.log(`contrasts: ${Object.entries(contrasts).filter(([k]) => k !== 'bar').map(([k, v]) => `${k} ${v} (bar ${BARS.text})`).join('; ')}`);
console.log(`report: ${OUT}`);
