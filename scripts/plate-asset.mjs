// Build the plate assets the PS slots ship. Run: `npm run plates` (idempotent; it prints what it wrote).
//
// Why a script rather than dropping a file in by hand: `src/assets/photos/<slot>.<ext>` is read by
// `PhotoSlot` at build time, so the file IS the site's decision about which artwork fills which slot.
// This keeps that decision reproducible (the crop recipe is `design/grill/plate-crop.mjs`, the same one
// the measuring round used) and puts the provenance where a reader of the folder will find it.
//
// The bytes here are the bytes round 13 measured: it prints a sha1, and the round's scratch crop
// (.design/tmp-round13/plate-PS1-fill-376x307.png) prints the same one, so the colour census in
// design/grill/round13/report.json describes the shipped asset and not a look-alike.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { plateSource, cropFor, keepPct } from '../design/grill/plate-crop.mjs';

// One row per slot that ships art today. `w`/`h` are CSS px of the box the ruling gave the slot, and they
// are NOT free numbers: PS-1's 376x307 is the hero column (376x574, `check:space`) minus the mark
// (376x235) minus the gap (`mb-8`, 32px) — the composition the operator ruled as option C of grill round
// 13 (D160's specimen: design/grill/round-13-hero.html). Change a box here and the layout numbers in
// HeroSection.astro's comment and in DESIGN.md go stale with it.
const SLOTS = [
  {
    slot: 'hero',            // -> src/assets/photos/hero.png, fills PS-1
    id: 'ia-firstsixbooksofe00byrn-176-281',
    book: 'The first six books of the elements of Euclid… with diagrams in colours (John Byrne, 1847)',
    page: 'https://insideoutlibrary.com/p/ia-firstsixbooksofe00byrn-176-281',
    w: 376, h: 307,
    ruled: 'D149-1b/2b (identity art in PS-1) + round 13 option C (stacked column, plate takes the leftover)',
  },
];

const OUT = 'src/assets/photos';
mkdirSync(OUT, { recursive: true });
for (const s of SLOTS) {
  const src = await plateSource(s.id, { log: (m) => console.log(m) });
  const meta = await sharp(src).metadata();
  const buf = await cropFor(src, s.w, s.h);
  const file = `${OUT}/${s.slot}.png`;
  writeFileSync(file, buf);
  const sha = createHash('sha1').update(buf).digest('hex').slice(0, 10);
  const out = await sharp(buf).metadata();
  console.log(`${file}  ${out.width}x${out.height} @2x of ${s.w}x${s.h} CSS px  ${(buf.length / 1024).toFixed(0)}kB  sha1 ${sha}`);
  console.log(`  source ${s.id} — ${meta.width}x${meta.height}, keeps ${keepPct(meta.width / meta.height, s.w, s.h)}% of the leaf`);
  console.log(`  ${s.ruled}`);
  console.log(`  ${s.book}\n  ${s.page} — public domain (insideoutlibrary.com: rights statement checked per leaf, record 0023)`);
}
