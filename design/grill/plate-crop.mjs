// One crop path for every plate this repo puts on a page.
//
// Why a module rather than a copy in each round: the plate a round *measured* and the asset the site
// *ships* have to be the same bytes, or the colour numbers in the round's record describe a picture the
// page never shows. `design/round13.mjs` and `scripts/plate-asset.mjs` both call `cropFor`, and the
// asset build prints a sha1 that can be compared against the round's scratch crop (`measure(round13)`'s
// `.design/tmp-round13/plate-PS1-fill-376x307.png`). Measured 2026-11-03: identical, sha1 `308193c78a`.
//
// The crop is subject-aware (`attention`) cover fit, delivered at 2x — the recipe record 0023 measured
// ("Crop = subject-aware (attention) cover fit at the slot aspect, delivered at 2x"). Changing the fit or
// the scale changes which pixels land in the slot, so it changes the page's colour census: it is a design
// change, not a build detail, and it belongs in a round, not in an asset step.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

// The art round's cache (gitignored — a fetched archive render is evidence, not a source file).
export const ART_CACHE = '.design/tmp-art/img';

/**
 * The archive render for a picture id, from the cache or by fetching it once.
 *
 * The ladder this archive serves is 200 / 400 / 1024 (record 0023, measured: 600, 800, 1600 and 2048 all
 * 404), so 1024 is the widest honest source. `robots.txt` allows `/img/` and disallows `/*?q=` and `/api/`,
 * which is why nothing here searches — picture ids come from curated `/s/<subject>` pages or the operator.
 */
export async function plateSource(id, { log = () => {} } = {}) {
  const f = `${ART_CACHE}/${id}.webp`;
  if (!existsSync(f)) {
    mkdirSync(ART_CACHE, { recursive: true });
    log(`  fetch ${id} (cache miss)`);
    const r = await fetch(`https://img.insideoutlibrary.com/img/1024/${id}.webp`, {
      headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:159.0) Gecko/10101 Firefox/159.0' },
    });
    if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
    writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    await new Promise((r) => setTimeout(r, 250));
  }
  return readFileSync(f);
}

/** The slot box, in CSS px, out of the source's own aspect — what record 0023 printed as "keeps". */
export const keepPct = (aspect, w, h) => +(100 * Math.min(aspect, w / h) / Math.max(aspect, w / h)).toFixed(0);

/**
 * Cover fit at the slot aspect, delivered at 2x — the one crop recipe in the repo.
 *
 * `capWidth` exists because the archive's widest rung (`/img/1024/`) returns each leaf's own scan width, which
 * for several plates is ~700px: asking for 2x of a 384px box from a 698px source would write 768px of
 * interpolated pixels into the shipped file. Capping at the source width keeps the file honest — displayed at
 * 384 CSS px it is still a downscale — and it says so in the bytes rather than in a comment. Measured
 * 2026-11-03: the 1910 Euler leaf is 698x350, the 1903 Euclid leaf 1024x357, the 1922 radio leaf 1024x478.
 */
export const cropFor = (buf, w, h, { scale = 2, capWidth } = {}) => {
  let width = Math.round(w * scale), height = Math.round(h * scale);
  if (capWidth && width > capWidth) { height = Math.max(1, Math.round((height * capWidth) / width)); width = capWidth; }
  return sharp(buf).resize({ width, height, fit: 'cover', position: 'attention' }).png().toBuffer();
};
