#!/usr/bin/env node
// dist-unpainted-bytes.mjs — which bytes the artifact ships that nothing paints.
//
//   node design/dist-unpainted-bytes.mjs            # the orphan table
//   node design/dist-unpainted-bytes.mjs --json     # the machine record only
//
// WHY THIS PROBE EXISTS. `dist/client` is what a visitor downloads, and every gate in `verify` reads it as
// "what will ship" — none of them asks whether a byte that ships is ever **painted**. It found the class
// twice: the seven `src/assets/photos/event-*.png` (D359's sweep, R7 of the round-4 rulings letter) and,
// still standing, the two horizon leaves `HorizonBand.astro` keeps on the shelf because deleting artwork
// no surface paints is "a different change with its own sweep" (D343): @measured 2026-11-16 by this probe,
// **540,262 bytes = 51.6% of the 1,047,320-byte artifact and 70.9% of its 11 carried assets** — and PNG
// does not gzip (234,773 raw → 234,790 gzipped), so the visitor pays essentially all of it on every visit. Astro copies every file under
// `src/assets/` into `dist` with a content hash, so an asset a component stopped referencing still ships.
// A byte that ships and never paints is the cheapest defect in the artifact: the visitor pays it on every
// visit and no reader can be shown it.
//
// WHAT IT IS NOT: not a gate. It prints numbers and exits 0, so it sits outside `scripts/gate-run.mjs`
// (the same reason `check:area`, `check:rhythm` and `check:color` do: numbers for a decision, no verdict).
// The verdict is the operator's, because un-painting an asset is a deletion in `src/assets/` with its own
// sweep, and `scripts/plate-asset.mjs` may still be the tool that produced the file.
//
// HOW IT MATCHES, and why the match is the whole point: Astro hashes an asset's name to
// `<name>.<6chars>.<ext>`, and a page may reference either that hashed name or the source name. So a
// reference is either the exact emitted basename, or the basename with its hash segment removed. A scan
// that checks only the hashed form reports every painted asset as an orphan, and a share quoted
// against the asset folder rather than the artifact moves the number by half — which is how the same 540,262
// bytes were once called 52.4% (of 1,031,421) and are now 51.6% of the artifact and 70.9% of its assets.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const DIST = (process.argv.find((a, i) => i > 0 && a === '--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist/client');
const json = process.argv.includes('--json');

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = `${d}/${e.name}`;
  return e.isDirectory() ? walk(p) : [p];
});

const files = walk(DIST);
const READABLE = /\.(html|css|js|mjs|json|xml|ics|txt|svg|webmanifest)$/i;
const CARRIED = /\.(png|jpe?g|webp|avif|gif|svg|woff2?|ttf|ico)$/i;

const haystack = files.filter((f) => READABLE.test(f)).reduce((a, f) => a + readFileSync(f, 'utf8'), '');
const totalBytes = files.reduce((a, f) => a + statSync(f).size, 0);
const carried = files.filter((f) => CARRIED.test(f));

const rows = carried.map((f) => {
  const base = f.split('/').pop();
  // Astro's asset hash is a 6-char segment before the extension; a font hash sits in the same place.
  // Astro's asset hash is one segment before the extension (and it can carry an underscore, and be longer
  // than 8 chars: `hero.DSx7PBhB_AReXT.webp`), so the segment class is wide and the extension is kept.
  const unhashed = base.replace(/\.[A-Za-z0-9_-]{6,16}\.(png|jpe?g|webp|avif|gif|svg|woff2|woff|ttf|ico)$/i, '.$1');
  return { file: f, bytes: statSync(f).size, gzip: gzipSync(readFileSync(f)).length, painted: haystack.includes(base) || haystack.includes(unhashed) };
});

const orphans = rows.filter((r) => !r.painted);
const orphanBytes = orphans.reduce((a, r) => a + r.bytes, 0);
const carriedBytes = carried.reduce((a, f) => a + statSync(f).size, 0);

if (json) {
  console.log(JSON.stringify({ dist: DIST, artifactBytes: totalBytes, carriedBytes, orphans }, null, 1));
} else {
  console.log(`dist/client artifact: ${files.length} files, ${totalBytes} bytes (${(totalBytes / 1024).toFixed(0)} KB), ${carried.length} carried assets (${carriedBytes} bytes)`);
  console.log(`carried, painted:   ${rows.filter((r) => r.painted).map((r) => `${r.file.split('/').pop()} ${r.bytes}b`).join(', ') || 'none'}`);
  console.log(`carried, NEVER painted (${orphans.length}, ${orphanBytes} bytes = ${(orphanBytes / totalBytes * 100).toFixed(1)}% of the artifact, ${(orphanBytes / carriedBytes * 100).toFixed(1)}% of its assets):`);
  for (const r of orphans) console.log(`  ${r.file}  ${r.bytes} bytes raw / ${r.gzip} gzip`);
}
// A probe that finds nothing has to say it found nothing, not print an empty table (D347's rule: a printed
// "no finding" under exit 0 is a probe that stopped measuring). Here the empty table IS the finding of
// nothing, so the header says so and the numbers above it carry the run.
