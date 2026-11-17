// design/hero-crop.mjs — crop the hero block out of pixel-ground's full-page shots, so the composition
// pass the round-6 reviewer asked for has a SHORT image per width as well as the whole page.
//
// Why a tracked script rather than a scratch one: `docs/reply-to-the-communication-review-round-6-2026-11-16.md`
// §7 hands over four named PNGs and cites the fold measurements beside them (D282's rule — a probe a tracked
// claim cites lives in `design/`, scratch stays gitignored). The whole pages are written by
// `node design/pixel-ground.mjs --routes / --widths 1440 390` into `.design/tmp-ground/`; this only crops,
// so the pair is regenerable in two commands and a reviewer never reads a full 4,066px page at 390.
//
// The crop heights are chosen from the fold probe, not by eye: `FOLD_WIDTHS=1440,390 node design/fold-answers.mjs`
// @measured 2026-11-17 puts the last answer of the acceptance block at y=638 at 1440 and y=808 at 390, so 1200
// and 900 sit below the last answer while keeping the plate, the mark and the primary control inside the frame.
import fs from 'node:fs';
import sharp from 'sharp';

const CROPS = [
  { in: '.design/tmp-ground/ground-root-1440.png', out: '.design/tmp-ground/hero-root-1440.png', height: 1200 },
  { in: '.design/tmp-ground/ground-root-390.png', out: '.design/tmp-ground/hero-root-390.png', height: 900 },
];

for (const c of CROPS) {
  if (!fs.existsSync(c.in)) {
    console.error(`missing ${c.in} — run \`node design/pixel-ground.mjs --routes / --widths 1440 390\` first`);
    continue;
  }
  const buf = fs.readFileSync(c.in);
  const { info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const height = Math.min(c.height, info.height);
  fs.writeFileSync(c.out, await sharp(buf).extract({ left: 0, top: 0, width: info.width, height }).png().toBuffer());
  console.log(`${c.out}  ${info.width}x${height} (cropped from a ${info.width}x${info.height} page shot)`);
}
