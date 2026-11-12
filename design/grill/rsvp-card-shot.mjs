#!/usr/bin/env node
// rsvp-card-shot.mjs — photograph the sign-up cluster where it actually sits, at the shipped widths.
//
//   node design/grill/rsvp-card-shot.mjs                          # / and /schedule at 1240 and 390
//   node design/grill/rsvp-card-shot.mjs --routes / /schedule --widths 1240 640 390 320
//
// Why this exists (2026-11-12): the operator asked to *see* the sign-up widget on the card, and the only
// honest answer to "what does it look like" is a photograph of the artifact this tree builds, taken with
// the same harness the gates use. A screenshot taken by hand is not reproducible; this one is a command.
//
// Two passes per page, the same reason check:ground and check:color take two (design/README.md):
// firefox's `--screenshot` captures the viewport, so the frame has to be the page's own settled height,
// which the page only knows after the fonts and the islands have loaded. Pass 1 asks for the height with
// a small frame; pass 2 shoots the whole document.
//
// Output goes to .design/rsvp-shot/ (gitignored scratch) — the tracked artifact is this script, not the
// pixels (D282). Nothing in dist/ is touched: serve-measure.mjs rewrites the page in memory.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const arg = (flag) => {
  const i = argv.indexOf(flag);
  if (i < 0) return null;
  const out = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) out.push(argv[j]);
  return out;
};
const routes = arg('--routes') || ['/', '/schedule'];
const widths = (arg('--widths') || [1240, 390]).map(Number);
const outDir = arg('--out') || ['.design/rsvp-shot'];
const out = path.resolve(outDir[0]);
const dist = 'dist/client';
const probe = path.join('design', 'grill', 'rsvp-card-geometry.mjs');

if (!fs.existsSync(dist)) {
  console.error('no dist/client — run npm run build first (or npm run verify, which builds).');
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

const slug = (route) => (route === '/' ? 'home' : route.replace(/^\/+|\/+$/g, ''));

function runProbe(route, w, h, shot) {
  // The shot argument is appended only when there is one. `execFileSync` stringifies `null` to "null",
  // and serve-measure.mjs takes the shot as a positional: measured 2026-11-12 the height pass therefore
  // handed it the string "null", `if (shotOut)` was true, and the probe wrote a 154KB PNG named `null`
  // in the repo root (D286). Optional positional args are appended, never passed as null.
  const args = [path.join('design', 'grill', 'serve-measure.mjs'), dist, route, probe, String(w), String(h)];
  if (shot) args.push(shot);
  const stdout = execFileSync('node', args, { encoding: 'utf8' });
  const start = stdout.indexOf('{');
  if (start < 0) throw new Error(`${route} @ ${w}: the probe posted nothing`);
  try {
    return JSON.parse(stdout.slice(start));
  } catch (e) {
    throw new Error(`${route} @ ${w}: probe posted something that is not JSON (${e.message}): ${stdout.slice(start, start + 200)}`);
  }
}

const results = [];
for (const route of routes) {
  for (const w of widths) {
    const first = runProbe(route, w, 1400, null);
    const docH = Math.max(1, first.docHeight ?? 1400);
    const shot = path.join(out, `${slug(route)}-${w}.png`);
    // The geometry comes from the FULL-height pass. `client:visible` means an Astro island hydrates only
    // when it is in the viewport, so a 1400px frame measures the server-rendered bytes of a cluster at
    // y=2291 while its island is still asleep — measured 2026-11-12 (this probe reported
    // `hydrated=false` in the 1400 frame and `true` in the doc-height frame).
    const second = runProbe(route, w, docH, shot);

    const clusters = second.clusters ?? [];
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i].box;
      const top = Math.max(0, c.y - 70);
      const bottom = Math.min(docH, c.y + c.h + 70);
      const left = Math.max(0, c.x - 30);
      const right = Math.min(w, c.x + c.w + 30);
      const cropOut = path.join(out, `${slug(route)}-${w}-cluster${i + 1}.png`);
      await sharp(shot)
        .extract({ left, top, width: right - left, height: bottom - top })
        .resize({ width: (right - left) * 2, height: (bottom - top) * 2 })
        .png()
        .toFile(cropOut);
        console.log(`${route} @ ${w}px  cluster ${i + 1}: ${c.x},${c.y} ${c.w}x${c.h}  ` +
        `state=${clusters[i].state} hydrated=${second.hydrated}  crop: ${cropOut}`);
      console.log(`   painted text: ${clusters[i].text}`);
      for (const l of second.labels ?? []) {
        console.log(`     [${l.platform}] ${l.text}  ${l.box.w}x${l.box.h}`);
      }
    }
    results.push({ route, width: w, docHeight: docH, clusters, shot, hydrated: second.hydrated });
  }
}
console.log(`\nfull-page shots and crops in ${out} (gitignored scratch; the script is the tracked artifact)`);
