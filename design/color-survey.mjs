// color-survey.mjs — how much colour does a page actually paint? A number for "the site is drab".
//
//   npm run build && npm run check:color            # "/" at 1240 and 320
//   node design/color-survey.mjs --routes / /chat --widths 1240 390 320
//
// Records land in .design/tmp-color/ (scratch; a before/after pair for the colour round, not evidence to track).
//
// Why this exists instead of an opinion: the complaint ("drab") is a claim about painted pixels, and painted
// pixels are what every other gate in this repo already reads. Three numbers separate the three ways a page can
// be colourless, and they need different fixes:
//
//   chromatic%   - share of pixels with OKLCH chroma >= 0.04. Low = almost everything is a neutral.
//   meanChroma   - average chroma over those pixels. Low-but-many = faint tinting (a wash), not absent colour.
//   hueFamilies  - how many distinct 30-degree hue bands carry that ink. One family = one accent, no palette.
//
// A page can be 96% neutral and still feel fine (a book page does), so this is not a pass/fail gate: it is the
// measurement a colour round argues from, and the same numbers re-run afterwards to show the round did something.
// The bars below are reporting thresholds, not rulings — nothing here exits non-zero on a low number.
//
// sRGB -> OKLab is Björn Ottosson's transform (the same colour space DESIGN.md's contrast bars are stated in),
// done here in node off the shot's raw bytes rather than in the page: the question is what the browser PAINTED,
// not what the CSS asked for.
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const argList = (flag, dflt) => {
  const i = args.indexOf(flag);
  if (i < 0) return dflt;
  const out = [];
  for (let k = i + 1; k < args.length && !args[k].startsWith('--'); k++) out.push(args[k]);
  return out;
};
const routes = argList('--routes', ['/']);
const widths = argList('--widths', ['1240', '320']).map(Number);

if (!existsSync(resolve('dist/client/index.html'))) {
  console.error('dist/client/index.html missing — run npm run build first');
  process.exit(1);
}
mkdirSync('.design/render', { recursive: true });

import { oklchFromRgb } from './grill/okcolor.mjs';

const CHROMA_MIN = 0.04;                                     // below this a pixel is a neutral tint, not a colour
const BAND = 30;                                             // hue band width in degrees; 12 bands around the wheel

const name = (r) => (r === '/' ? '' : r.replace(/^\//, '_').replace(/\//g, '-'));
let first = true;
for (const route of routes) {
  for (const w of widths) {
    const h = w <= 390 ? 1400 : 2400;
    const shot = `.design/render/color-${name(route) || 'root'}-${w}.png`;
    execFileSync(process.execPath, [
      'design/grill/dist-measure.mjs', 'dist/client', route, 'design/grill/render-measure.js',
      String(w), String(h), shot,
    ], { stdio: 'pipe' });
    const img = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
    const { width, channels, height } = img.info, d = img.data;
    const bands = new Map();
    let total = 0, chromaSum = 0, chromaN = 0, faint = 0;
    for (let p = 0; p < width * height; p++) {
      const i = p * channels;
      if (channels >= 4 && d[i + 3] < 8) continue;            // fully transparent: not painted at all
      const c = oklchFromRgb(d[i], d[i + 1], d[i + 2]);
      total++;
      if (c.C >= CHROMA_MIN) {
        chromaN++; chromaSum += c.C;
        const b = Math.floor(c.h / BAND) * BAND;
        const rec = bands.get(b) ?? { n: 0, c: 0, light: 0 };
        rec.n++; rec.c += c.C; if (c.L > 0.55) rec.light++;
        bands.set(b, rec);
      } else if (c.C >= 0.012) faint++;
    }
    const top = [...bands.entries()].sort((x, y) => y[1].n - x[1].n);
    // A hue band counts as a family once it carries 300 painted px (at 1240x2400 that is 0.01% of the page) —
    // enough to clear antialiasing noise, low enough that the mark's gold dot and the wordmark's gold word show
    // up. Raising this to a percentage of the page hides exactly the hues the "we need more colour" question is
    // about, because they are small on purpose.
    const real = top.filter(([, r]) => r.n >= 300);
    if (!first) console.log('');
    first = false;
    console.log(`${route} @ ${w}x${h} — ${total.toLocaleString()} painted px (chroma bar ${CHROMA_MIN})`);
    console.log(`  chromatic ${(100 * chromaN / total).toFixed(1)}% of the page | mean chroma of that ink ${(chromaSum / Math.max(1, chromaN)).toFixed(3)} | faintly tinted ${(100 * faint / total).toFixed(1)}%`);
    console.log(`  hue families: ${real.length} — ${real.map(([b, r]) => `${b}–${b + BAND}° ${(100 * r.n / total).toFixed(2)}% (C̄ ${(r.c / r.n).toFixed(3)})`).join(', ') || 'none'}`);
    mkdirSync('.design/tmp-color', { recursive: true });
    const file = `.design/tmp-color/survey-${name(route) || 'root'}-${w}.json`;
    writeFileSync(file, JSON.stringify({
      route, width: w, height: h, shot, chromaBar: CHROMA_MIN, band: BAND,
      paintedPx: total, chromaticPx: chromaN, chromaticPct: +(100 * chromaN / total).toFixed(2),
      meanChroma: +(chromaSum / Math.max(1, chromaN)).toFixed(4), faintPct: +(100 * faint / total).toFixed(2),
      hueFamilies: real.length,
      bands: real.map(([b, r]) => ({ hueFrom: b, pct: +(100 * r.n / total).toFixed(3), meanChroma: +(r.c / r.n).toFixed(4) })),
    }, null, 1));
    console.log(`  json: ${file}`);
  }
}
console.log('\nNo pass/fail here: this is the before-number a colour round argues from. Re-run it after the round.');
