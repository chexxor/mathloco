// Regenerates `public/book-club-social-share.jpg` — the image `og:image` / `twitter:card` point at.
//
// Why a generator instead of a committed binary: the share card is derived art, not a logo. Keeping
// the recipe here means the card can be re-cut when the hero photo changes, and the text on it is
// reviewable in a diff. Run with `npm run assets:social` (needs no credentials, no network).
//
// 1200x630 is the size social unfurlers ask for; the tags in src/layouts/Layout.astro declare the
// same numbers. JPEG (not PNG/AVIF) because every crawler that reads og:image accepts JPEG and PNG
// and none is guaranteed to accept AVIF; ~120 KB keeps it inside the size limits services like.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const W = 1200;
const H = 630;
const source = path.resolve('src/assets/math-group-image.jpg');
const out = path.resolve('public/book-club-social-share.jpg');

// Copy comes from the site's own declared text (src/config.json's description, and the city in the
// hero). Deliberately no meetup cadence on the card: src/config.json says "Monthly meetups" while
// HeroSection.astro says "Weekly Meetups" - that contradiction needs a human, not a generator.
const overlay = Buffer.from(
  `<svg width="${W}" height="${H}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.35" stop-color="#1a1a1c" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#1a1a1c" stop-opacity="0.88"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <rect x="72" y="424" width="88" height="8" fill="#f59e0b"/>
  <text x="72" y="506" fill="#ffffff" font-family="sans-serif" font-size="70" font-weight="700">Minneapolis Math Book Club</text>
  <text x="72" y="562" fill="#f59e0b" font-family="sans-serif" font-size="34">Book discussions &#183; math meetups &#183; Minneapolis, MN</text>
</svg>`,
);

await sharp(source)
  // attention: pick the region most likely to contain the subject (a room of people) rather than
  // the geometric centre, which on a wide group photo crops heads out.
  .resize(W, H, { fit: 'cover', position: sharp.gravity.attention })
  .modulate({ brightness: 1.04, saturation: 1.06 })
  .composite([{ input: overlay, blend: 'over' }])
  .jpeg({ quality: 82, progressive: true, mozjpeg: true })
  .toFile(out);

const meta = await sharp(out).metadata();
console.log(
  `wrote ${path.relative(process.cwd(), out)} — ${meta.width}x${meta.height} ${meta.format}, ` +
    `${fs.statSync(out).size} bytes (source ${(fs.statSync(source).size / 1024).toFixed(0)} KB)`,
);
