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
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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
// And the build has to be the one this tree would make — a chroma survey of the previous branch's page is a
// palette claim about code that is gone (design/dist-fresh.mjs).
import { distState, staleLine } from './dist-fresh.mjs';
const STALE = distState();
if (!STALE.fresh && !STALE.allowed) { console.error(`check:color: ${staleLine(STALE)}`); process.exit(1); }
// Every record carries the fingerprint of the build it measured (design/records/0015, and the same field
// `design/rhythm.mjs` keys its cache on). A survey number without a build identity is how a stale crop got
// compared to a fresh page once already; `design/area-survey.mjs` refuses the pair when these disagree.
const SITE_FP = createHash('sha1').update(readFileSync(resolve('dist/client/index.html'))).digest('hex').slice(0, 10);
mkdirSync('.design/render', { recursive: true });

import { oklchFromRgb } from './grill/okcolor.mjs';
import { shotHeight } from './grill/shot-height.mjs';

const CHROMA_MIN = 0.04;                                     // below this a pixel is a neutral tint, not a colour
// A second bar, because the first one lies on its own: `--color-ink` is C 0.045, so the ink ground — the
// footer band, every glyph — clears 0.04 and the headline "chromatic %" reports a dark page as a colourful
// one (measured: 12.6% of the landing page at 1240, of which the 150-180 degree ink band is 12.60 points).
// This is round 9's census vocabulary (design/round9.mjs), kept identical so the two are comparable:
// STRONG_MIN is colour a reader would name, FAINT_MIN is the oklch(95% 0.03 ...) tints.
const STRONG_MIN = 0.08;
const FAINT_MIN = 0.012;
const BAND = 30;                                             // hue band width in degrees; 12 bands around the wheel

const name = (r) => (r === '/' ? '' : r.replace(/^\//, '_').replace(/\//g, '-'));

// One harness run, returning the page's own report. page-measure prints it pretty-printed (one JSON value,
// multi-line) as the last thing on stdout, so the parse takes the first line that opens an object and runs
// to the end rather than assuming one line.
const run = (route, w, h, shot) => {
  const out = execFileSync(process.execPath, [
    'design/grill/dist-measure.mjs', 'dist/client', route, 'design/grill/render-measure.js',
    String(w), String(h), ...(shot ? [shot] : []),
  ], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  const lines = out.split('\n');
  const start = lines.findIndex((l) => l.trim() === '{');
  if (start < 0) return null;
  try { return JSON.parse(lines.slice(start).join('\n')); } catch { return null; }
};
let first = true;
for (const route of routes) {
  for (const w of widths) {
    const shot = `.design/render/color-${name(route) || 'root'}-${w}.png`;
    // Pass 1: learn the page's real height, then shoot the WHOLE page.
    // This instrument used to shoot a fixed 2400px (desktop) / 1400px (mobile) crop. On a 2495px landing
    // page that hid the `bg-ink` footer band, and the ink ground is itself chromatic at C 0.045 — so the
    // same page measured 3.8% with the band out of frame and 9.4% with it in. At 320 the crop showed about
    // a third of a ~4100px page. A crop is a claim about the page, so the crop is now the page.
    const probe1 = run(route, w, 1200, '');
    const pageH = shotHeight(Number(probe1?.doc?.scrollHeight ?? 0), `${route} @ ${w}`);
    run(route, w, pageH, shot);
    const h = pageH;
    const img = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
    const { width, channels, height } = img.info, d = img.data;
    const bands = new Map();
    let total = 0, chromaSum = 0, chromaN = 0, faint = 0, strongN = 0;
    for (let p = 0; p < width * height; p++) {
      const i = p * channels;
      if (channels >= 4 && d[i + 3] < 8) continue;            // fully transparent: not painted at all
      const c = oklchFromRgb(d[i], d[i + 1], d[i + 2]);
      total++;
      if (c.C >= CHROMA_MIN) {
        chromaN++; chromaSum += c.C; if (c.C >= STRONG_MIN) strongN++;
        const b = Math.floor(c.h / BAND) * BAND;
        const rec = bands.get(b) ?? { n: 0, c: 0, light: 0 };
        rec.n++; rec.c += c.C; if (c.L > 0.55) rec.light++;
        bands.set(b, rec);
      } else if (c.C >= FAINT_MIN) faint++;
    }
    const top = [...bands.entries()].sort((x, y) => y[1].n - x[1].n);
    // A hue band counts as a family once it carries 300 painted px (at 1240x2400 that is 0.01% of the page) —
    // enough to clear antialiasing noise, low enough that the mark's gold dot and the wordmark's gold word show
    // up. Raising this to a percentage of the page hides exactly the hues the "we need more colour" question is
    // about, because they are small on purpose.
    const real = top.filter(([, r]) => r.n >= 300);
    if (!first) console.log('');
    first = false;
    console.log(`${route} @ ${w}x${h} — ${total.toLocaleString()} painted px of a ${probe1?.doc?.scrollHeight ?? '?'}px page (chroma bar ${CHROMA_MIN})`);
    console.log(`  chromatic ${(100 * chromaN / total).toFixed(1)}% of the page | colour a reader would name (C >= ${STRONG_MIN}) ${(100 * strongN / total).toFixed(2)}% | mean chroma of that ink ${(chromaSum / Math.max(1, chromaN)).toFixed(3)} | faintly tinted ${(100 * faint / total).toFixed(1)}%`);
    console.log(`  the ink caveat: --color-ink is C 0.045, so a dark ground counts as chromatic — read the band list, not the headline`);
    console.log(`  hue families: ${real.length} — ${real.map(([b, r]) => `${b}–${b + BAND}° ${(100 * r.n / total).toFixed(2)}% (C̄ ${(r.c / r.n).toFixed(3)})`).join(', ') || 'none'}`);
    mkdirSync('.design/tmp-color', { recursive: true });
    const file = `.design/tmp-color/survey-${name(route) || 'root'}-${w}.json`;
    writeFileSync(file, JSON.stringify({
      route, siteFp: SITE_FP, width: w, height: h, scrollHeight: probe1?.doc?.scrollHeight ?? null, shot, chromaBar: CHROMA_MIN, band: BAND,
      paintedPx: total, chromaticPx: chromaN, chromaticPct: +(100 * chromaN / total).toFixed(2),
      strongPct: +(100 * strongN / total).toFixed(3), strongBar: STRONG_MIN, faintBar: FAINT_MIN,
      meanChroma: +(chromaSum / Math.max(1, chromaN)).toFixed(4), faintPct: +(100 * faint / total).toFixed(2),
      hueFamilies: real.length,
      bands: real.map(([b, r]) => ({ hueFrom: b, pct: +(100 * r.n / total).toFixed(3), meanChroma: +(r.c / r.n).toFixed(4) })),
    }, null, 1));
    console.log(`  json: ${file}`);
  }
}
console.log('\nNo pass/fail here: this is the before-number a colour round argues from. Re-run it after the round.');
