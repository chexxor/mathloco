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
  // PS-5, the horizon (round 14 option C -> F, 2026-11-03): three colourless leaves on one baseline between the
  // club's reasons and the schedule. Each box's aspect is the leaf's own aspect, so `cover` crops nothing — the
  // plate arrives whole — and `capWidth` (below) keeps the file at the scan's own width. The boxes are the
  // measured ones: 384 CSS px wide inside the 1192px column at 1240, three across, 16px apart.
  {
    slot: 'horizon-euclid1903',
    id: 'ia-elementsofeuclid1903eucl-297-210',
    book: 'The elements of Euclid for the use of schools and colleges… (1903)',
    page: 'https://insideoutlibrary.com/p/ia-elementsofeuclid1903eucl-297-210',
    w: 384, h: 134,
    ruled: 'round 14 option F (three plates, desktop only) — record 0023: "compose a strip from several plates rather than upscale one"',
  },
  {
    slot: 'horizon-euler1910',
    id: 'ia-cu31924031236171-122-176',
    book: 'Plane geometry, with problems and applications (Slaught & Lennes, 1910)',
    page: 'https://insideoutlibrary.com/p/ia-cu31924031236171-122-176',
    w: 384, h: 193,
    ruled: 'D149-2b (the Euler diagram, colourless) shown in PS-5 rather than PS-3, per round 14',
  },
  {
    slot: 'horizon-radio1922',
    id: 'ia-principlesunderl00unit-514-212',
    book: 'The principles underlying radio communication (1922)',
    page: 'https://insideoutlibrary.com/p/ia-principlesunderl00unit-514-212',
    w: 384, h: 179,
    ruled: 'record 0023: 0% named colour, native 1024x478 — one of the two leaves wide enough to need no upscale',
  },
];

const OUT = 'src/assets/photos';
mkdirSync(OUT, { recursive: true });
for (const s of SLOTS) {
  const src = await plateSource(s.id, { log: (m) => console.log(m) });
  const meta = await sharp(src).metadata();
  const cap = Math.min(s.w * 2, meta.width);
  const buf = await cropFor(src, s.w, s.h, { capWidth: cap });
  const file = `${OUT}/${s.slot}.png`;
  writeFileSync(file, buf);
  const sha = createHash('sha1').update(buf).digest('hex').slice(0, 10);
  const out = await sharp(buf).metadata();
  console.log(`${file}  ${out.width}x${out.height} @2x of ${s.w}x${s.h} CSS px  ${(buf.length / 1024).toFixed(0)}kB  sha1 ${sha}`);
  console.log(`  source ${s.id} — ${meta.width}x${meta.height}, keeps ${keepPct(meta.width / meta.height, s.w, s.h)}% of the leaf`);
  console.log(`  ${s.ruled}`);
  console.log(`  ${s.book}\n  ${s.page} — public domain (insideoutlibrary.com: rights statement checked per leaf, record 0023)`);
}
