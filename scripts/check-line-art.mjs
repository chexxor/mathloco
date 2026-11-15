#!/usr/bin/env node
// check:line-art — the site's own drawings stay drawings in the ratified language.
//
//   npm run check:line-art            # over the built dist/client
//   npm run check:line-art:selftest   # plant each defect, require each to FAIL, with clean controls
//
// Why this gate exists (2026-11-14, the second design read §6.6, S042 / D323). The read asked for ONE
// original drawing — the club's thinking has no visual form, every image on the site is a hundred-year-old
// plate or a Meetup upload — "SVG, currentColor strokes, ~1200 bytes", in the plates' language: hairlines,
// no fills. The repo has rules about colour (check:contrast fails a paint literal in src/), about alt text
// (check:alt) and about ring contrast (check:render), and none of them can see an inline SVG: a hex in a
// `stroke` attribute is not a class, and a filled shape is not a keyline. So the drawing this session adds
// would be the first artifact with its own rules and no detector, which is exactly the S038 defect class.
//
// What it enforces, per `<figure data-line-art="...">` in the artifact:
//   FAIL  no-caption        — a figure with no <figcaption>; provenance belongs in the caption (D312)
//   FAIL  no-img-role       — the <svg> is not `role="img"`, so a screen reader reads it as markup noise
//   FAIL  long-label        — the accessible name over 12 words, the same cap check:alt applies to <img>
//   FAIL  over-size         — the drawing's bytes over 1200
//   FAIL  colour-literal    — a hex/rgb/named colour in a stroke or fill instead of currentColor
//   FAIL  filled            — a shape painted, when the ruled language is hairlines only
//   INFO  the census        — each figure, its byte count, its label, its stroke count
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emittedRoutes } from '../design/emitted-routes.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return i < 0 ? resolve('dist/client') : args[i + 1];
})();

const MAX_BYTES = 1200; // the read's own figure, adopted as the cap (D323)
const MAX_WORDS = 12;   // D312's alt cap, applied to an inline drawing's accessible name

const FIGURE = /<figure[^>]*data-line-art="([^"]+)"[\s\S]*?<\/figure>/g;
const SVG = /<svg[\s\S]*?<\/svg>/;
const COLOUR = /(?:stroke|fill)\s*=\s*"(?!none|currentColor)(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|rgb?\([^)]*\)|[a-z]+(?:-[a-z]+)*)"/;

/** Pure verdict over `[{route, html}]` so the selftest plants with no build and no disk (D118). */
export const lineArtFindings = (pages) => {
  const fails = [];
  const census = [];
  for (const p of pages) {
    for (const m of p.html.matchAll(FIGURE)) {
      const figure = m[0];
      const name = m[1];
      const svg = figure.match(SVG);
      if (!svg) {
        fails.push({ rule: 'no-drawing', detail: `${p.route} figure "${name}": a data-line-art figure with no <svg> in it` });
        continue;
      }
      const bytes = svg[0].length;
      const strokes = (svg[0].match(/<(path|rect|circle|line|polyline)\b/g) || []).length;
      const label = (svg[0].match(/aria-label="([^"]*)"/) || [])[1];
      census.push(`${p.route} "${name}": ${bytes} bytes, ${strokes} stroke(s), label ${label ? `"${label}"` : 'none'}`);

      if (!/role="img"/.test(svg[0])) {
        fails.push({ rule: 'no-img-role', detail: `${p.route} figure "${name}": the <svg> has no role="img", so a screen reader announces shapes instead of a picture` });
      }
      if (!label) {
        fails.push({ rule: 'no-label', detail: `${p.route} figure "${name}": no aria-label — an inline SVG has no alt attribute to fall back on` });
      } else if (label.trim().split(/\s+/).length > MAX_WORDS) {
        fails.push({ rule: 'long-label', detail: `${p.route} figure "${name}": accessible name is ${label.trim().split(/\s+/).length} words; the cap is ${MAX_WORDS} (D312)` });
      }
      if (bytes > MAX_BYTES) {
        fails.push({ rule: 'over-size', detail: `${p.route} figure "${name}": ${bytes} bytes of drawing, over the ${MAX_BYTES}-byte cap (D323)` });
      }
      const colour = svg[0].match(COLOUR);
      if (colour) {
        fails.push({ rule: 'colour-literal', detail: `${p.route} figure "${name}": ${colour[0]} — a drawing in the plates' language takes currentColor, so the ink is the token and not a hard-coded value (D316)` });
      }
      if (/<(path|rect|circle|ellipse|polygon)\b[^>]*\bfill="(?!none)[^"]*"/.test(svg[0])) {
        fails.push({ rule: 'filled', detail: `${p.route} figure "${name}": a painted shape; the ruled language for these drawings is hairlines, no fills (D323)` });
      }
      if (!/<figcaption[\s>]/.test(figure)) {
        fails.push({ rule: 'no-caption', detail: `${p.route} figure "${name}": no <figcaption>, so the drawing has no provenance — who drew it and when (D312)` });
      }
    }
  }
  return { fails, census };
};

const runSelftest = () => {
  const good = `<figure data-line-art="undoable-steps"><svg viewBox="0 0 240 96" role="img" aria-label="A wire through three boxes and the path back" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M6 52c13-1 20 1 30 0"></path><rect x="36" y="34" width="34" height="36"></rect></svg><figcaption class="text-micro">Drawn for this site, 2026-11-14.</figcaption></figure>`;
  const cases = [
    { name: 'clean control: the shipped shape', html: good, want: [] },
    { name: 'a hex in a stroke', html: good.replace('stroke="currentColor"', 'stroke="#2b2b2b"'), want: ['colour-literal'] },
    { name: 'a filled box (a hex fill is both a colour literal and a fill)', html: good.replace('<rect x="36"', '<rect fill="#eee" x="36"'), want: ['colour-literal', 'filled'] },
    { name: 'a shape filled in currentColor: not a literal, still a fill', html: good.replace('<rect x="36"', '<rect fill="currentColor" x="36"'), want: ['filled'] },
    { name: 'no role="img"', html: good.replace('role="img" ', ''), want: ['no-img-role'] },
    { name: 'no accessible label', html: good.replace(/ aria-label="[^"]*"/, ''), want: ['no-label'] },
    { name: 'a 20-word label', html: good.replace('aria-label="A wire through three boxes and the path back"', 'aria-label="a b c d e f g h i j k l m n o p q r s t"'), want: ['long-label'] },
    { name: 'no figcaption', html: good.replace(/<figcaption[\s\S]*?<\/figcaption>/, ''), want: ['no-caption'] },
    { name: 'an oversized drawing', html: good.replace('<path d="M6 52c13-1 20 1 30 0"></path>', '<path d="M0 0' + 'L1 1'.repeat(400) + '"></path>'), want: ['over-size'] },
    { name: 'a figure with no svg at all', html: '<figure data-line-art="empty"><figcaption>nothing</figcaption></figure>', want: ['no-drawing'] },
    { name: 'fill="none" is not a colour', html: good, want: [] },
    { name: 'a plain svg with no data-line-art is not a figure', html: '<svg role="img" aria-label="decorative" stroke="#111"></svg>', want: [] },
    { name: 'exactly twelve words is allowed', html: good.replace(/aria-label="[^"]*"/, 'aria-label="one two three four five six seven eight nine ten eleven twelve"'), want: [] },
  ];
  let bad = 0;
  for (const c of cases) {
    const { fails } = lineArtFindings([{ route: '/fixture', html: c.html }]);
    const got = fails.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = !miss.length && !extra.length;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(48)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
    for (const f of fails) console.log(`        ${f.rule}: ${f.detail}`);
  }
  console.log(`\ncheck:line-art selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
};

const runReal = () => {
  if (!existsSync(DIST)) {
    console.error(`check:line-art: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
    process.exit(1);
  }
  const pageFile = (route) => {
    if (route === '/') return resolve(DIST, 'index.html');
    const bare = route.replace(/^\//, '');
    const asDir = resolve(DIST, `${bare}/index.html`);
    return existsSync(asDir) ? asDir : resolve(DIST, `${bare}.html`);
  };
  const pages = emittedRoutes(DIST).map((route) => {
    const f = pageFile(route);
    return { route, html: existsSync(f) ? readFileSync(f, 'utf8') : '' };
  });
  const { fails, census } = lineArtFindings(pages);
  console.log(`check:line-art — ${pages.length} page(s), ${census.length} drawing(s), cap ${MAX_BYTES} bytes / ${MAX_WORDS} words`);
  for (const c of census) console.log(`  ${c}`);
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  console.log(fails.length ? `\n${fails.length} finding(s).` : '\nEvery drawing is hairlines, currentColor, under the cap and captioned.');
  process.exit(fails.length ? 1 : 0);
};

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) (selftest ? runSelftest : runReal)();
