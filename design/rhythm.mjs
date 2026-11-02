#!/usr/bin/env node
// design/rhythm.mjs — price a vertical-rhythm proposal by measuring it, not by picturing it.
//
//   npm run build && npm run check:rhythm
//
// "Tighten the rhythm" is a request whose effect nobody can estimate: the last round's numbers said 42% of the
// page height sits in empty runs, and 480px of the page is declared padding and margin — but the measurement
// also said most of the emptiness is INSIDE surfaces, between their own elements, where padding rules do not
// reach. So each option is applied as a stylesheet to a COPY of the built page and re-measured by the same
// instrument that produced the baseline (`design/whitespace-survey.mjs`, same bars, same widths). The deltas in
// the table are what the option buys; nothing here edits the site.
//
// Why `!important` in the variants: they have to beat Tailwind utilities (`md:mt-32`, `py-16`) from a single
// injected style, and an override that loses silently measures the shipped page.
//
// The "slots" variant paints a hatched stand-in at the APPROVED photo-slot sizes (PS-1 372x564, PS-3 526x316).
// It is not a photograph and must not be read as one: it measures the GEOMETRY of filling the slot — how many
// empty rows and how much painted share change when that box stops being empty. Colour numbers from it are
// meaningless; area numbers are the point.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const WIDTHS = [1240, 390];
const ROUTES = ['/'];

const variants = [
  {
    label: 'edges',
    what: 'declared edges only: hero margins 128/96 -> 64/64, section padding 64 -> 48',
    css: `main { margin-top: 64px !important; margin-bottom: 64px !important; }
section.bg-panel, section.bg-paper { padding-top: 48px !important; padding-bottom: 48px !important; }`,
  },
  {
    label: 'edges-rules',
    what: 'same trims, with a 1px rule at each band boundary instead of the lost air',
    css: `main { margin-top: 64px !important; margin-bottom: 64px !important; }
section.bg-panel, section.bg-paper { padding-top: 48px !important; padding-bottom: 48px !important;
  border-top: 1px solid var(--color-rule); }`,
  },
  {
    label: 'interior',
    what: 'inside surfaces only: the six-card grid 64px in + 32px gaps -> 40px in + 24px gaps',
    css: `.bg-panel > div > .mt-16 { margin-top: 40px !important; }
.bg-panel .grid { gap: 24px !important; }`,
  },
  {
    label: 'slots',
    what: 'PS-1 and PS-3 filled at their approved sizes (hatched stand-in, geometry only)',
    css: `main div[class*="grid-cols-12"] > div:last-child { background: repeating-linear-gradient(135deg,
  transparent 0 6px, var(--color-rule) 6px 8px); }
main div[class*="items-center"] > div:last-child { min-height: 316px !important; background:
  repeating-linear-gradient(135deg, transparent 0 6px, var(--color-rule) 6px 8px); }`,
  },
  {
    label: 'all',
    what: 'edges + interior + slots together, to see the ceiling of the code-only option',
    css: `main { margin-top: 64px !important; margin-bottom: 64px !important; }
section.bg-panel, section.bg-paper { padding-top: 48px !important; padding-bottom: 48px !important; }
.bg-panel > div > .mt-16 { margin-top: 40px !important; }
.bg-panel .grid { gap: 24px !important; }
main div[class*="grid-cols-12"] > div:last-child { background: repeating-linear-gradient(135deg,
  transparent 0 6px, var(--color-rule) 6px 8px); }
main div[class*="items-center"] > div:last-child { min-height: 316px !important; background:
  repeating-linear-gradient(135deg, transparent 0 6px, var(--color-rule) 6px 8px); }`,
  },
];

if (!existsSync('dist/client/index.html')) {
  console.error('dist/client/index.html missing — run npm run build first');
  process.exit(1);
}
mkdirSync('.design/tmp-rhythm', { recursive: true });
mkdirSync('design/rhythm', { recursive: true });

const dir = (l) => `.design/tmp-whitespace${l === 'shipped' ? '' : `/dist-${l}`}`;
// The built page's own fingerprint is part of the cache name. Without it a variant JSON measured against an
// EARLIER build is read back as if it described the current one: after the join card lost its image, the
// shipped row moved to 4127px at 390 while the cached variant rows still said 4062, and the printed deltas
// were comparing a fresh baseline to stale variants. A rebuild that changes the page now invalidates them.
const FP = createHash('sha1').update(readFileSync('dist/client/index.html')).digest('hex').slice(0, 10);
const load = (label, route, w) => {
  const tag = label === 'shipped' ? '' : `-${label}`;
  const f = `.design/tmp-whitespace/space${tag}-${route === '/' ? 'root' : route.slice(1)}-${w}.json`;
  if (!existsSync(f)) return null;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  // A cached variant JSON is only about THIS page if it was probed from this build. Without the stamp, the
  // shipped row moves with a rebuild while cached variants keep their old numbers, and the printed deltas
  // compare a fresh baseline to stale variants (that is exactly what happened after the join card lost its
  // image: shipped 4127px at 390, cached variants still 4062).
  if (j.siteFp !== FP) return null;
  return {
    height: j.height, pageHeight: j.pageHeight, paintedPct: j.paintedPct,
    emptyRunPx: j.emptyRunPx, emptyRunPct: j.emptyRunPct, emptyRuns: j.emptyRuns,
    biggestRun: Math.max(0, ...(j.gaps || []).map((g) => g.h)),
    inside: (j.surfaces || []).reduce((a, s) => a + (s.gapsInside || 0), 0),
    edges: (j.surfaces || []).reduce((a, s) => a + (s.emptyTop || 0) + (s.emptyBottom || 0), 0),
    fixed: (j.fixed || []).length,
  };
};

const run = (label, css) => {
  const cssPath = `.design/tmp-rhythm/${label}.css`;
  writeFileSync(cssPath, `${css}\n`);
  const args = ['design/whitespace-survey.mjs', '--routes', ...ROUTES, '--widths', ...WIDTHS.map(String)];
  if (label !== 'shipped') args.push('--css', cssPath, '--label', label);
  execFileSync(process.execPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
};

const rows = [];
for (const label of ['shipped', ...variants.map((v) => v.label)]) {
  const have = Object.fromEntries(WIDTHS.map((w) => [String(w), load(label, '/', w)]));
  if (WIDTHS.every((w) => have[String(w)])) {
    rows.push({ label, what: label === 'shipped' ? 'as shipped' : variants.find((v) => v.label === label).what, by: have });
    continue;
  }
  run(label, label === 'shipped' ? '' : variants.find((v) => v.label === label).css);
  rows.push({
    label,
    what: label === 'shipped' ? 'as shipped' : variants.find((v) => v.label === label).what,
    by: Object.fromEntries(WIDTHS.map((w) => [String(w), load(label, '/', w)])),
  });
}

const fmt = (r, w) => r.by[String(w)] ?? null;
for (const w of WIDTHS) {
  const base = fmt(rows[0], w);
  console.log(`\n=== @ ${w}px — document ${base.height}px, ${base.emptyRunPx}px in ${base.emptyRuns} empty runs (${base.emptyRunPct}% of height), biggest ${base.biggestRun}px`);
  console.log('  option          doc px   empty px   empty%  runs  biggest  painted%  at-edges  in-surface  fixed');
  for (const r of rows) {
    const m = fmt(r, w);
    if (!m) { console.log(`  ${r.label.padEnd(14)} (no measurement)`); continue; }
    console.log(
      `  ${r.label.padEnd(14)}${String(m.height).padStart(7)}${String(m.emptyRunPx).padStart(10)}` +
      `${m.emptyRunPct.toFixed(1).padStart(8)}${String(m.emptyRuns).padStart(6)}` +
      `${String(m.biggestRun).padStart(9)}${m.paintedPct.toFixed(2).padStart(10)}` +
      `${String(Math.round(m.edges)).padStart(9)}${String(Math.round(m.inside)).padStart(10)}` +
      `${String(m.fixed).padStart(6)}` +
      `${r.label === 'shipped' ? '' : `   ${m.height - base.height >= 0 ? '+' : ''}${m.height - base.height}px tall, ${m.emptyRunPx - base.emptyRunPx >= 0 ? '+' : ''}${m.emptyRunPx - base.emptyRunPx}px empty`}`,
    );
  }
  console.log('  "edges" = empty rows at the top/bottom of a surface (what padding + line leading declares);');
  console.log('  "in-surface" = every empty run inside a surface, which INCLUDES its at-edges rows: the difference');
  console.log('  between the two columns is the emptiness between a surface\'s own elements, where padding cannot reach.');
}
for (const r of rows) console.log(`\n  ${r.label}: ${r.what}`);

writeFileSync('design/rhythm/report.json', `${JSON.stringify({ measuredAt: new Date().toISOString(), widths: WIDTHS, rows }, null, 1)}\n`);
console.log('\nwrote design/rhythm/report.json — re-run npm run check:rhythm after any layout change.');
console.log('Nothing here changed the site: each option was measured in a copy of dist/client.');
