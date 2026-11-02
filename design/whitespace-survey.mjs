// whitespace-survey.mjs — where the emptiness on a page actually is, measured off the built page.
//
//   npm run build && npm run check:space                 # "/" at 1240 and 390
//   node design/whitespace-survey.mjs --routes / --widths 1240 390 320
//
// "The landing page is mostly whitespace" is two different complaints with two different fixes, and the
// only honest way to tell them apart is to measure both:
//
//   PAINTED SHARE   - what fraction of the page's pixels differ from that page's own ground by at least the
//                     same-colour bar (0.05 delta-OKLab, the threshold this repo has used since the ramp
//                     round for "visibly a different colour"). Low painted share = the page really is empty.
//   CONTENT DENSITY - how many characters of real copy a surface carries per 1000px of height it occupies.
//                     A section can be 1,000px tall and hold 90 characters (nothing to read), or be 1,000px
//                     tall and full of text that is just small (a rhythm problem, not a content problem).
//
// It then answers the third question the complaint hides: WHERE. Per surface, the ink bounding box says how
// much of the width and height the page's own marks actually span; the empty-row runs say how many gaps of
// >= 60px the reader crosses on the way down, and which surface each one sits inside.
//
// Like design/color-survey.mjs, this has NO pass/fail: a book page is 96% neutral and fine. It is the
// before-number for the layout/content round, and the same numbers re-run afterwards.
//
// Both halves come from one firefox run on the built dist (design/grill/dist-measure.mjs): the shot's pixels
// for the painted side, and the page's own post-font geometry for the density side (D127 — a pre-font height
// is a fallback metric, and heights are exactly what is under question here).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { oklabBytes, distLab } from './grill/okcolor.mjs';
import { readFileSync as readSite } from 'node:fs';

const args = process.argv.slice(2);
const argList = (flag, dflt) => {
  const i = args.indexOf(flag);
  if (i < 0) return dflt;
  const out = [];
  for (let k = i + 1; k < args.length && !args[k].startsWith('--'); k++) out.push(args[k]);
  return out;
};
const routes = argList('--routes', ['/']);
const widths = argList('--widths', ['1240', '390']).map(Number);
// --css <file> measures a PROPOSED page rather than the shipped one: the CSS is injected into a COPY of
// dist/client, so a rhythm or photo-slot proposal gets the same bars applied to the real page instead of a
// prediction. dist/ is never mutated (dist/ is what gets deployed). --label names the variant so its records
// and its printout cannot be mistaken for the shipped numbers.
const argOne = (flag, dflt) => { const i = process.argv.indexOf(flag); return i < 0 ? dflt : process.argv[i + 1]; };
const cssFile = argOne('--css', null);
const label = argOne('--label', 'shipped');

const INK_BAR = 0.05;        // same-colour bar: below this a pixel reads as the ground it sits on
const GAP_MIN = 60;          // an empty run this tall is a gap a reader notices (roughly two body lines)
const FAMILY_MIN = 40;       // a row counts as painted once >= this many px in it are ink

if (!existsSync(resolve('dist/client/index.html'))) {
  console.error('dist/client/index.html missing — run npm run build first');
  process.exit(1);
}
mkdirSync('.design/render', { recursive: true });
mkdirSync('.design/tmp-whitespace', { recursive: true });

// A fingerprint of the SHIPPED page (not of a variant copy), stamped into every report this writes. It is
// what lets design/rhythm.mjs know that a variant JSON sitting in the scratch dir was probed from this build
// rather than from an older one - the variants are copies of dist with CSS injected, so their own bytes
// cannot say which site they were copied out of.
import { createHash } from 'node:crypto';
const SITE_FP = (() => {
  try { return createHash('sha1').update(readSite('dist/client/index.html')).digest('hex').slice(0, 10); }
  catch { return 'unknown'; }
})();

const name = (r) => (r === '/' ? 'root' : r.replace(/^\//, '_').replace(/\//g, '-'));

let distDir = 'dist/client';
if (cssFile) {
  const { cpSync, rmSync, readFileSync } = await import('node:fs');
  distDir = `.design/tmp-whitespace/dist-${label}`;
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
  cpSync('dist/client', distDir, { recursive: true });
  const htmlPath = resolve(distDir, 'index.html');
  const html = readFileSync(htmlPath, 'utf8');
  if (!html.includes('</head>')) throw new Error(`${htmlPath} has no </head> to inject into`);
  writeFileSync(htmlPath, html.replace(
    '</head>',
    `<style id="variant-${label}">\n${readFileSync(cssFile, 'utf8')}\n</style>\n</head>`));
  console.log(`variant "${label}": ${cssFile} injected into a copy of dist/client (${distDir})`);
}
const tag = label === 'shipped' ? '' : `-${label}`;

const probe = (route, w, h, shot) => {
  // One retry: this firefox harness has a known flake (it occasionally renders without posting), and
  // check:render learned the same lesson in a7adbf7. Failures print the harness's own stderr, because the
  // default execFileSync exception dumps the raw byte buffer and buries the reason.
  let lastErr = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return JSON.parse(execFileSync(process.execPath, [
        'design/grill/dist-measure.mjs', distDir, route, 'design/grill/whitespace-measure.js',
        String(w), String(h), shot,
      ], { stdio: ['ignore', 'pipe', 'pipe'] }).toString());
    } catch (e) {
      lastErr = String(e.stderr || e.message).split('\n').filter(Boolean).slice(-3).join(' | ');
      if (attempt === 2) throw new Error(`probe failed for ${route} @ ${w}x${h}: ${lastErr}`);
    }
  }
};

for (const route of routes) {
  for (const w of widths) {
    // Pass 1: learn the real page height (a shot taller than the page counts body ground as emptiness,
    // and a shot shorter than it hides the bottom of the page).
    const first = probe(route, w, 1200, '');
    const pageH = Math.min(6000, first.doc.scrollHeight);
    const shot = `.design/render/space${tag}-${name(route)}-${w}.png`;
    const dom = probe(route, w, pageH, shot);
    if (dom.errors?.length) console.error(`  probe errors: ${dom.errors.join('; ')}`);

    const img = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
    const { width, channels, height } = img.info, d = img.data;
    // Firefox paints its scrollbar into a `--screenshot`, and a scrollbar column reads as ink. The page's own
    // surfaces say where the document ends, so measure inside that and ignore the chrome strip.
    const contentW = Math.max(1, Math.min(width, ...dom.surfaces.map((s) => Math.ceil(s.x + s.w))));

    // Per row: the modal colour is the ground (a row inside the footer band is mostly ink; a row on the page
    // is mostly paper), then ink = pixels a bar away from that ground in either direction.
    const rows = [];
    let inkTotal = 0;
    for (let y = 0; y < height; y++) {
      const buckets = new Map();
      for (let x = 0; x < contentW; x++) {
        const i = (y * width + x) * channels;
        const key = (d[i] >> 3 << 10) | (d[i + 1] >> 3 << 5) | (d[i + 2] >> 3);
        const b = buckets.get(key);
        if (b) b.n++, b.r += d[i], b.g += d[i + 1], b.b += d[i + 2];
        else buckets.set(key, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
      }
      let ground = null;
      for (const b of buckets.values()) if (!ground || b.n > ground.n) ground = b;
      const gL = oklabBytes(ground.r / ground.n, ground.g / ground.n, ground.b / ground.n);
      let ink = 0, minX = -1, maxX = -1;
      for (let x = 0; x < contentW; x++) {
        const i = (y * width + x) * channels;
        if (distLab(oklabBytes(d[i], d[i + 1], d[i + 2]), gL) >= INK_BAR) {
          ink++;
          if (minX < 0) minX = x;
          maxX = x;
        }
      }
      rows.push({ y, ink, minX, maxX, ground: [ground.r / ground.n, ground.g / ground.n, ground.b / ground.n] });
      inkTotal += ink;
    }

    // Empty runs, and which surface each one falls inside.
    const runs = [];
    let start = -1;
    for (let y = 0; y <= height; y++) {
      const empty = y < height && rows[y].ink < FAMILY_MIN;
      if (empty && start < 0) start = y;
      if (!empty && start >= 0) {
        if (y - start >= GAP_MIN) runs.push({ y: start, h: y - start });
        start = -1;
      }
    }
    const ownerOf = (y) => {
      const s = dom.surfaces.find((s) => y >= s.y && y < s.y + s.h);
      return s ? `${s.tag}.${(s.cls || '').split(' ')[0] || s.tag}` : '—';
    };

    // Per-surface: painted share of its own area, plus the box its ink actually spans.
    const surfaces = dom.surfaces.map((s) => {
      const y0 = Math.max(0, Math.floor(s.y)), y1 = Math.min(height, Math.ceil(s.y + s.h));
      let ink = 0, minX = width, maxX = 0, rowsPainted = 0, inkY0 = -1, inkY1 = -1;
      for (let y = y0; y < y1; y++) {
        const r = rows[y];
        ink += r.ink;
        if (r.ink >= FAMILY_MIN) {
          rowsPainted++;
          if (inkY0 < 0) inkY0 = y;
          inkY1 = y;
          if (r.minX < minX) minX = r.minX;
          if (r.maxX > maxX) maxX = r.maxX;
        }
      }
      const area = Math.max(1, s.w * s.h);
      const emptyTop = inkY0 < 0 ? s.h : inkY0 - y0;
      const emptyBottom = inkY1 < 0 ? s.h : y1 - 1 - inkY1;
      return {
        ...s,
        inkPct: +(100 * ink / area).toFixed(1),
        paintedRowsPct: +(100 * rowsPainted / Math.max(1, y1 - y0)).toFixed(1),
        inkSpanW: inkY0 < 0 ? 0 : +(maxX - minX).toFixed(0),
        // flanks are measured against the element's own box, not the viewport: full-bleed sections start at
        // x=0 but a page with a scrollbar is wider than the section's 1228px, and subtracting a
        // viewport-relative maxX from an element width produced a negative right flank.
        flankLeft: inkY0 < 0 ? +s.w.toFixed(0) : +(minX - s.x).toFixed(0),
        flankRight: inkY0 < 0 ? +s.w.toFixed(0) : +(s.x + s.w - maxX).toFixed(0),
        emptyTop, emptyBottom,
        charsPer1000px: +(1000 * s.chars / Math.max(1, s.h)).toFixed(0),
        gapsInside: runs.filter((r) => r.y >= s.y && r.y < s.y + s.h).reduce((a, r) => a + r.h, 0),
      };
    });

    // Vertical gaps between blocks of copy (the reader's version of "mostly whitespace").
    const blocks = dom.text.slice().sort((a, b) => a.y - b.y);
    const textGaps = [];
    for (let i = 1; i < blocks.length; i++) {
      const gap = +(blocks[i].y - (blocks[i - 1].y + blocks[i - 1].h)).toFixed(0);
      if (gap >= GAP_MIN) textGaps.push({ after: `${blocks[i - 1].tag} "${(blocks[i - 1].t || '').slice(0, 24)}"`, gap });
    }
    const gapPx = runs.reduce((a, r) => a + r.h, 0);
    // Where the emptiness sits in the document's own structure: the padding each section declares and the
    // gap between surfaces. A page can be empty inside its surfaces (thin content) or between them (rhythm),
    // and the two need different fixes.
    const between = [];
    for (let i = 1; i < dom.surfaces.length; i++) {
      const g = +(dom.surfaces[i].y - (dom.surfaces[i - 1].y + dom.surfaces[i - 1].h)).toFixed(0);
      if (g > 0) between.push({ from: dom.surfaces[i - 1].tag, to: dom.surfaces[i].tag, gap: g });
    }
    const padPx = dom.surfaces.reduce((a, s) => a + (parseFloat(s.padTop) || 0) + (parseFloat(s.padBottom) || 0), 0);

    console.log(`\n${label} ${route} @ ${w}x${pageH} — page ${dom.doc.scrollHeight}px tall, ${(width * height).toLocaleString()} px, painted ${(100 * inkTotal / (width * height)).toFixed(1)}% (ink bar ${INK_BAR} delta-OKLab)`);
    console.log(`  empty runs >= ${GAP_MIN}px: ${runs.length} totalling ${gapPx}px (${(100 * gapPx / height).toFixed(1)}% of the page height)`);
    for (const r of runs.slice(0, 12)) console.log(`    ${r.h}px at y=${r.y} inside ${ownerOf(r.y + Math.floor(r.h / 2))}`);
    console.log('  surfaces (height | painted | chars/1000px | ink span | left/right flanks | empty top/bottom):');
    for (const s of surfaces) {
      console.log(`    ${s.tag}.${(s.cls || '').split(' ')[0] || s.tag}`.padEnd(30) +
        `${String(Math.round(s.h)).padStart(5)}px  ${String(s.inkPct).padStart(5)}%  ${String(s.charsPer1000px).padStart(4)}` +
        `  span ${String(s.inkSpanW).padStart(4)}px  flanks ${String(s.flankLeft).padStart(4)}/${String(s.flankRight).padStart(4)}px` +
        `  empty ${String(Math.round(s.emptyTop)).padStart(4)}/${String(Math.round(s.emptyBottom)).padStart(4)}px  media ${s.img + s.svg}  ${s.chars} chars`);
    }
    console.log('  rhythm (what the CSS declares vs where paint actually starts and stops):');
    for (const s of surfaces) {
      console.log(`    ${s.tag}.${(s.cls || '').split(' ').slice(0, 2).join('.') || s.tag}`.padEnd(30) +
        `margin ${String(s.marginTop).padStart(6)}/${String(s.marginBottom).padEnd(6)}  padding ${String(s.padTop).padStart(6)}/${String(s.padBottom).padEnd(6)}` +
        `  paint starts ${String(Math.round(s.emptyTop)).padStart(4)}px in, ends ${String(Math.round(s.emptyBottom)).padStart(4)}px before its bottom` +
        `  (${s.gapsInside}px of empty run inside)`);
    }
    console.log(`  media (every drawing/photo-sized thing, by painted area):`);
    for (const m of dom.media.slice().sort((a, b) => b.area - a.area).slice(0, 8)) {
      console.log(`    ${m.tag} ${m.src || m.alt || m.cls || ''}`.padEnd(52) + `${Math.round(m.w)}x${Math.round(m.h)} = ${m.area}px² (${(100 * m.area / (width * height)).toFixed(2)}% of page)`);
    }
    const topGaps = textGaps.slice().sort((a, b) => b.gap - a.gap).slice(0, 8);
    console.log(`  containers a slot could go into (grid/flex children >= 60px both ways):`);
    for (const r of (dom.regions || []).slice().sort((a, b) => b.area - a.area).slice(0, 10)) {
      console.log(`    ${r.tag}.${r.cls}`.padEnd(52) + `${Math.round(r.w)}x${Math.round(r.h)} @y${Math.round(r.y)} of ${r.parentTag}.${r.parent}`.slice(0, 96));
    }
    console.log(`  position:fixed elements excluded from the page-absolute walk: ${dom.fixed.length ? dom.fixed.join(', ') : 'none'}`);
    console.log(`  columns inside grid/flex containers (the boxes a photo slot would take):`);
    for (const r of (dom.slots || []).slice().sort((a, b) => b.area - a.area).slice(0, 8)) {
      console.log(`    ${r.tag}.${r.cls}`.padEnd(46) + `${Math.round(r.w)}x${Math.round(r.h)} @y${Math.round(r.y)} in [${r.display}, gap ${r.gap}]`.slice(0, 78));
    }
    console.log(`  biggest gaps between blocks of copy: ${topGaps.map((g) => `${g.gap}px after ${g.after}`).join(' | ') || 'none'}`);
    console.log(`  structure: declared padding ${Math.round(padPx)}px; between surfaces ${between.map((b) => `${b.from}->${b.to} ${b.gap}px`).join(', ') || 'none'}`);

    const file = `.design/tmp-whitespace/space${tag}-${name(route)}-${w}.json`;
    writeFileSync(file, JSON.stringify({
      route, siteFp: SITE_FP, width: width, height, pageHeight: dom.doc.scrollHeight, inkBar: INK_BAR, gapMin: GAP_MIN,
      paintedPx: inkTotal, paintedPct: +(100 * inkTotal / (width * height)).toFixed(2),
      emptyRuns: runs.length, emptyRunPx: gapPx, emptyRunPct: +(100 * gapPx / height).toFixed(1),
      fixed: dom.fixed, gaps: runs, surfaces, media: dom.media, regions: dom.regions, slots: dom.slots, textGaps, fonts: dom.fonts, betweenSurfaces: between, declaredPaddingPx: Math.round(padPx),
    }, null, 1));
    console.log(`  json: ${file}`);
  }
}
console.log('\nNo pass/fail here — this is the before-number for a layout/content round. Re-run it after.');
