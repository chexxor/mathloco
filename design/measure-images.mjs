// measure-images.mjs - what colours a photograph actually contains, in OKLCH.
//
// Why this exists: the local vision model is a hypothesis generator, not an oracle (see the PITFALL entry - it invented
// a dark nav background on a bg-white header). This script is the independent measurement a vision claim gets checked
// against. It answers the questions that decide whether an image can be used in a layout: is it dark or light, warm or
// cool, how loud is it, and will text sit on it.
//
// Usage (must run from inside the repo - bare imports do not resolve from /tmp):
//   node design/measure-images.mjs /tmp/mmbc/social.jpg /tmp/mmbc/lecture.jpg
import sharp from 'sharp';
import { resolve } from 'node:path';

// sRGB -> linear -> OKLab. The inverse of the transform used by design/primary-math.mjs.
const toOklab = (r, g, b) => {
  const lin = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  let l = R * 0.4122214708 + G * 0.5363325363 + B * 0.0514459929;
  let m = R * 0.2119034982 + G * 0.6806995451 + B * 0.1073969566;
  let s = R * 0.0883024619 + G * 0.2817188376 + B * 0.6299787005;
  l = Math.cbrt(Math.max(l, 0)); m = Math.cbrt(Math.max(m, 0)); s = Math.cbrt(Math.max(s, 0));
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L, C: Math.hypot(A, Bb), H: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360 };
};
const wcagLum = (r, g, b) => {
  const lin = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node design/measure-images.mjs <image> [...]'); process.exit(2); }

for (const f of files) {
  const img = sharp(resolve(f)).rotate();           // rotate() honours EXIF orientation, which photos rely on
  const meta = await img.metadata();
  const { data, info } = await img.clone().resize(48, 48, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const n = info.channels === 4 ? data.length / 4 : data.length / 3;
  let warm = 0, cool = 0, dark = 0, light = 0, neutral = 0, sumC = 0, loud = 0, sumLum = 0;
  const buckets = new Map();
  for (let i = 0; i < n; i++) {
    const o = i * info.channels;
    const px = toOklab(data[o], data[o + 1], data[o + 2]);
    sumLum += wcagLum(data[o], data[o + 1], data[o + 2]);
    if (px.C < 0.025) neutral++; else { buckets.set(Math.floor(px.H / 30) * 30, [...(buckets.get(Math.floor(px.H / 30) * 30) || []), px]); sumC += px.C; }
    if (px.C > 0.16) loud++;                                     // the palette's fill budget, applied to photographs too
    if (px.H >= 20 && px.H <= 110) warm++;
    if (px.H >= 180 && px.H <= 300) cool++;
    if (px.L < 0.30) dark++;
    if (px.L > 0.85) light++;
  }
  const pct = (x) => `${Math.round((x / n) * 100)}%`;
  console.log(`\n${f}  ${meta.width}x${meta.height}${meta.orientation && meta.orientation !== 1 ? ` (EXIF orientation ${meta.orientation})` : ''}`);
  console.log(`  mean WCAG luminance ${(sumLum / n).toFixed(3)}   dark(L<.30) ${pct(dark)}   light(L>.85) ${pct(light)}   neutral(C<.025) ${pct(neutral)}`);
  console.log(`  warm-hue ${pct(warm)}   cool-hue ${pct(cool)}   pixels over the C 0.16 fill budget ${pct(loud)}   mean chroma of chromatic pixels ${(sumC / Math.max(n - neutral, 1)).toFixed(3)}`);
  // Can text sit on it? This is the question a hero band actually asks.
  console.log(`  text verdict: ${dark / n > 0.55 ? 'white text has a plausible field' : light / n > 0.55 ? 'dark text has a plausible field' : 'mixed - put a scrim or a solid band behind any text'}`);
  const top = [...buckets.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5);
  for (const [h, v] of top) {
    const mL = v.reduce((a, x) => a + x.L, 0) / v.length, mC = v.reduce((a, x) => a + x.C, 0) / v.length;
    console.log(`    hue ${String(h).padStart(3)}-${h + 30}  ${pct(v.length)} of pixels  mean L ${mL.toFixed(2)}  mean C ${mC.toFixed(3)}`);
  }
}
