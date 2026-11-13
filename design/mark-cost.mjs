#!/usr/bin/env node
// mark-cost.mjs — what the platform sprite really costs the page that ships it.
//
//   node design/mark-cost.mjs                        # dist/client
//   node design/mark-cost.mjs dist/client            # an explicit dist
//   node design/mark-cost.mjs --json                 # machine-readable, for a stamp
//
// Why this exists as a probe and not as arithmetic in prose (design/README.md: a number DESIGN.md quotes
// needs a script that produces it). `src/components/PlatformMarks.astro`'s own comment claims a sprite is
// cheaper than inlining the glyphs, and DESIGN.md wants a byte figure beside that claim. A claim about bytes
// that no script measures is the same class of defect D282 was written for: the sentence survives a rebuild,
// the number does not.
//
// What it measures, per page:
//   raw/gzip bytes of the sprite element itself (`<svg class="hidden" ...>` .. `</svg>`),
//   gzip bytes of the whole page, and gzip bytes of the same page with the sprite removed — the delta is the
//   sprite's real cost, including the whitespace and the comment Astro ships with it, not a hand count of
//   the path strings;
//   the counterfactual: gzip bytes of the same page with every `<use>` replaced by an inlined copy of the
//   glyph's path data, which is what "just inline it" would ship. That is the comparison, because the
//   alternative to a sprite is not no glyph - it is the glyph written once per link.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { MARKS, markId } from '../src/lib/platform-marks.mjs';

const argv = process.argv.slice(2);
const json = argv.includes('--json');
const dist = resolve(argv.find((a) => !a.startsWith('--')) || 'dist/client');

const PAGES = ['index.html', 'schedule/index.html', 'chat/index.html'];
const gz = (s) => gzipSync(Buffer.from(s, 'utf8')).length;

// The sprite element, matched by the attribute the render gate already keys on rather than by a class list
// (D190): if PlatformMarks.astro ever gains an attribute, the element is still the sprite.
const SPRITE = /<svg class="hidden" aria-hidden="true">[\s\S]*?<\/symbol>\s*<\/svg>/;

// Where Layout.astro used to put the sprite, before the sprite moved to the component that draws it
// (S026/D294). A page with no cluster is measured against this insertion so the prose claim "a markless page
// pays for glyph bytes it never paints" is a number the probe produces, not a remembered figure.
const BODY_OPEN = /<body class="bg-paper text-ink">/;

const rows = [];
let spriteText = null;   // the sprite as the build actually emits it, taken from a page that ships one
for (const page of PAGES) {
  const file = `${dist}/${page}`;
  let html;
  try { html = readFileSync(file, 'utf8'); } catch { continue; }

  const m = html.match(SPRITE);
  if (!m) {
    if (!spriteText) { rows.push({ page, sprite: null, note: 'no sprite element found in the built page' }); continue; }
    const at = html.replace(BODY_OPEN, (b) => `${b}${spriteText}`);
    rows.push({
      page, sprite: null, marks: 0,
      note: `paints no mark; inserting the sprite where Layout used to put it would cost +${gz(at) - gz(html)} gzip (${((gz(at) - gz(html)) / gz(html) * 100).toFixed(1)}% of the page's ${gz(html)} gzip bytes)`,
      wouldBeDelta: gz(at) - gz(html),
      pageGzip: gz(html),
    });
    continue;
  }
  const sprite = m[0];
  spriteText = sprite;

  const links = [...html.matchAll(/<use href="#(pm-[a-z]+)"/g)];
  const pathOf = (id) => (MARKS.find((x) => markId(x.platform) === id) || {}).d || '';

  // The counterfactual: same page, no sprite, each <use> replaced by its own inline <path>.
  const inlined = html.replace(SPRITE, '').replace(
    /<svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><use href="#(pm-[a-z]+)"><\/use><\/svg>/g,
    (_full, id) => `<svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="${pathOf(id)}"/></svg>`
  );

  rows.push({
    page,
    marks: links.length,
    spriteRaw: sprite.length,
    spriteGzip: gz(sprite),
    pageRaw: html.length,
    pageGzip: gz(html),
    pageGzipNoSprite: gz(html.replace(SPRITE, '')),
    spriteDelta: gz(html) - gz(html.replace(SPRITE, '')),
    inlineGzip: gz(inlined),
    inlineDelta: gz(inlined) - gz(html.replace(SPRITE, '')),
    spriteCheaperBy: gz(inlined) - gz(html),
    // The sprite's cost is fixed; inlining costs one copy of the path per link. The number that decides
    // which is smaller is the break-even cluster count, so the probe prints it instead of leaving it to a
    // reader's arithmetic.
    clusters: links.length / MARKS.length,
    inlinePerCluster: links.length ? (gz(inlined) - gz(html.replace(SPRITE, ''))) / (links.length / MARKS.length) : 0,
  });
}

if (json) {
  console.log(JSON.stringify({ measuredAt: new Date().toISOString(), dist, pages: rows }, null, 1));
} else {
  console.log(`sprite cost, measured from ${dist} (Linux native, Node ${process.version})`);
  for (const r of rows) {
    if (!r.spriteRaw) { console.log(`  ${r.page}: ${r.note}`); continue; }
    console.log(`  ${r.page.padEnd(22)} ${r.marks} mark(s) | sprite ${r.spriteRaw} raw / ${r.spriteGzip} gzip | page ${r.pageGzip} gzip, ${r.pageGzipNoSprite} without sprite = +${r.spriteDelta} gzip | inlining instead: ${r.inlineDelta} gzip for the marks, sprite saves ${r.spriteCheaperBy} gzip`);
  }
  console.log(`  path data per glyph: ${MARKS.map((m) => `${m.platform} ${m.d.length} chars`).join(', ')}`);
  const withClusters = rows.filter((r) => r.spriteRaw && r.marks > 0);
  for (const r of withClusters) {
    console.log(`  ${r.page.padEnd(22)} ${r.marks} link(s) in ${r.clusters} cluster(s): sprite ${r.spriteDelta} gzip fixed vs inlining ${r.inlineDelta} gzip = ${r.inlinePerCluster.toFixed(0)} gzip per cluster -> sprite wins at ${Math.ceil(r.spriteDelta / r.inlinePerCluster)} clusters on this page`);
  }
  const carriers = withClusters.filter((r) => r.spriteCheaperBy > 0).map((r) => r.page);
  const lose = withClusters.filter((r) => r.spriteCheaperBy <= 0).map((r) => `${r.page} (${r.spriteCheaperBy} gzip)`);
  const idle = rows.filter((r) => r.spriteRaw && r.marks === 0).map((r) => `${r.page} (+${r.spriteDelta} gzip, 0 marks)`);
  console.log(`  sprite cheaper than inlining on: ${carriers.length ? carriers.join(', ') : 'none yet'}`);
  if (lose.length) console.log(`  sprite costs more than inlining on: ${lose.join(', ')}`);
  if (idle.length) console.log(`  sprite rides pages that paint no mark: ${idle.join(', ')}`);
  const markless = rows.filter((r) => !r.spriteRaw && r.wouldBeDelta);
  if (markless.length) console.log(`  pages painting no mark, counterfactual: ${markless.map((r) => `${r.page} +${r.wouldBeDelta} gzip (${(r.wouldBeDelta / r.pageGzip * 100).toFixed(1)}% of its ${r.pageGzip} gzip)`).join(', ')}`);
}
