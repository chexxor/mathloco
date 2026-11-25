#!/usr/bin/env node
// Build the two photographs the PS-2 and PS-3 slots ship. Run: `npm run photos` (idempotent; it prints
// what it wrote, with a sha1 for each file).
//
// Why a script rather than dropping the files in by hand (same reasoning as scripts/plate-asset.mjs):
// `src/assets/photos/<slot>.<ext>` IS the site's decision about which frame fills which measured box, so
// the crop has to be reproducible from the original bytes. The originals are the operator's own files and
// live only in `~/Downloads` — they are not in the repo — so the script pins each source by sha256 and
// throws if the bytes it reads are not the bytes the crop was chosen from. A file name can be re-pointed
// at other pixels; a hash cannot (D92's content-addressed rule, applied to the club's own photographs).
//
// Two rules the numbers below obey:
//   D167  never upscale. The delivered width is <= the crop's native width; if a slot wanted more, it
//         would have to be a bigger box, not a stretched file. PS-2 wants 1192 CSS px at 2x = 2384; the
//         source is 1843 wide, so PS-2 ships at 1x and that is written in the row that ships it.
//   DESIGN.md "States" / round 10: a slot's ratio is declared in CSS. The crop here is cut to that ratio
//         exactly, so `object-cover` has nothing left to crop and the measured box and the file agree.
//
// EXIF is stripped: sharp writes its own JPEG without the camera block, and the script asserts the
// shipped bytes carry no EXIF/GPS. The originals carry a Pixel 9 camera block with coordinates — record
// 0013/round 12 ruled "Strip EXIF/GPS on commit" for exactly this reason.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const OUT = 'src/assets/photos';

/** The operator's two frames, keyed by the bytes the crop was chosen from. */
const SOURCES = [
  {
    key: 'angel-food-1',
    path: '/home/chexxor/Downloads/Matheapolis_AngelFood_1.jpg',
    sha256: 'ce8d053fc72cf90ac4661e5c27fdfe55acde27be46bf3a1b7bbbb2e685e5cfa2',
    note: 'portrait 1843x2448: the Angel Food cup, the handwritten sheet with the hand-drawn squares',
  },
  {
    key: 'angel-food-2',
    path: '/home/chexxor/Downloads/Matheapolis_AngelFood_2.jpg',
    sha256: '95bb0f8d5a632f6256658de0ba254dcb7cb9dae285ebab5815ed84ac6b302e6e',
    note: 'landscape 2765x2074: a member writing in a notebook propped on a laptop',
  },
];

/** One row per slot that ships a photograph. `ratio` is the CSS aspect ratio the call site declares;
 *  `top` is the band's row in the source frame, chosen from the 16 candidates this session cut and
 *  looked at (design/records and src/assets/photos/README.md carry the reasoning). */
const SLOTS = [
  {
    slot: 'venue',            // -> src/assets/photos/venue.jpg, fills PS-2 on /dates
    source: 0,
    ratio: [1192, 320],
    top: 800,
    out: [1192, 320],        // 1x: the source is 1843 wide, so a 2x strip would be an upscale (D167)
    quality: 82,
    ruled: 'record 0027 "What is still open": PS-2 awaits a real venue shot — trigger fired 2026-11-25',
  },
  {
    slot: 'join',             // -> src/assets/photos/join.jpg, fills PS-3 on /
    source: 1,
    ratio: [532, 128],
    top: 300,
    out: [1064, 256],        // 2x of a 532 CSS px box, per the round-10 shot list
    quality: 82,
    ruled: "round 10 shot list 1 (PS-3 532x128), filled with the club's own frame 2026-11-25",
  },
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const sha1 = (buf) => createHash('sha1').update(buf).digest('hex');

for (const s of SLOTS) {
  const src = SOURCES[s.source];
  const bytes = readFileSync(src.path);
  const actual = sha256(bytes);
  if (actual !== src.sha256) {
    throw new Error(
      `${src.path}: sha256 is ${actual}, not the ${src.sha256} this crop was cut from. ` +
        `The frame changed (or moved) — re-choose the band before shipping it, do not force this through.`,
    );
  }

  const meta = await sharp(bytes).metadata();
  const [rw, rh] = s.ratio;
  const want = rw / rh;

  // Cut the widest band the frame allows at the slot's exact ratio, then take `top` rows of it.
  const bandH = Math.round(meta.width / want);
  const top = Math.min(s.top, meta.height - bandH);
  if (top < 0) throw new Error(`${src.key}: frame ${meta.width}x${meta.height} cannot hold a ${rw / rh} band`);

  const crop = sharp(bytes).extract({ left: 0, top, width: meta.width, height: bandH });

  const dev = Math.abs(meta.width / bandH - want) / want;
  if (dev > 0.002) {
    throw new Error(`${s.slot}: band ${meta.width}x${bandH} is ${(dev * 100).toFixed(2)}% off the declared ratio`);
  }
  if (meta.width < s.out[0] || bandH < s.out[1]) {
    throw new Error(
      `${s.slot}: delivering ${s.out[0]}x${s.out[1]} from ${meta.width}x${bandH} would upscale — D167 forbids it.`,
    );
  }

  const file = `${OUT}/${s.slot}.jpg`;
  const buf = await crop
    .resize(s.out[0], s.out[1], { join: 'lanczos3' })
    .jpeg({ quality: s.quality })
    .toBuffer();

  const written = await sharp(buf).metadata();
  if (written.exif) {
    throw new Error(`${file}: the shipped bytes still carry EXIF (${Object.keys(written.exif).length} fields) — strip it`);
  }
  if (written.width !== s.out[0] || written.height !== s.out[1]) {
    throw new Error(`${file}: wrote ${written.width}x${written.height}, expected ${s.out[0]}x${s.out[1]}`);
  }

  writeFileSync(file, buf);
  console.log(
    `${file}  ${s.out[0]}x${s.out[1]}  ${buf.length} bytes  sha1 ${sha1(buf).slice(0, 10)}  ` +
      `from ${src.key} band top=${top} (${meta.width}x${bandH}, ratio ${want.toFixed(3)})  ${s.ruled}`,
  );
}
