#!/usr/bin/env node
/**
 * design/sprite-claim.mjs - does EVERY render of a page carry the platform sprite? (S026, D294, D297)
 *
 * The sprite (`src/components/PlatformMarks.astro`) is emitted by `src/components/SignUpLinks.astro` once per
 * page render, and every mark on the page is a `<use href="#pm-...">` pointing at it. A `<use>` whose symbol
 * is not in the document paints nothing: to a class scanner and to the pixel gate alike, an invisible 16px box
 * is indistinguishable from a glyph that is there. So the assertion this probe makes is not "the sprite exists
 * somewhere" - it is "the sprite is in the bytes of every response the rig can produce".
 *
 * Why a probe and not a gate over `dist/`: every page in `src/pages/` is `prerender = true`, so the built
 * artifact is rendered exactly once per route and the sprite is in it by construction - `check:rsvp-page` and
 * `check:render` read those files and cannot see a per-render claim that goes stale. The failure mode lives
 * where a process renders the same route more than once: the dev server, and any future non-prerendered route
 * (D297: the claim was keyed on `Astro.url.pathname` in a module loaded once per process, so the second request
 * for `/` got three `<use>` refs and no symbols).
 *
 * It measures a server that is already running - it does not start one, because Astro 7's `astro dev` is a
 * daemon and refuses to start a second one while a dev server exists (it reports the existing pid instead),
 * and a probe that quietly kills the rig's server is worse than one that asks for it.
 *
 *   npm run dev                                   # or any server that renders the real components
 *   node design/sprite-claim.mjs                  # http://localhost:4321
 *   node design/sprite-claim.mjs --base http://localhost:4322 --requests 3
 *
 * Exit 0 when every request on every probed path carries as many `<symbol>` defs as the glyph table has, and
 * at least as many `<use>` refs. Exit 1 with the failing path, request number and counts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MARKS_SRC = resolve(new URL('..', import.meta.url).pathname, 'src/lib/platform-marks.mjs');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

const base = arg('--base', 'http://localhost:4321').replace(/\/$/, '');
const requests = Number(arg('--requests', '3'));
const paths = (arg('--paths', '/,/schedule,/chat')).split(',').filter(Boolean);

let expected = 0;
try {
  // Read the table the sprite is built from, rather than importing it, so the probe does not need the
  // framework's ESM runtime to answer "how many glyphs should be in the document?".
  const src = readFileSync(MARKS_SRC, 'utf8');
  expected = (src.match(/platform: '/g) || []).length;
} catch (err) {
  console.error(`cannot read ${MARKS_SRC}: ${err.message}`);
  process.exit(1);
}

const fails = [];
const lines = [];

for (const path of paths) {
  for (let i = 1; i <= requests; i++) {
    let html;
    try {
      const res = await fetch(base + path);
      html = await res.text();
      if (!res.ok) {
        fails.push(`${path} request ${i}: HTTP ${res.status} - nothing to count`);
        continue;
      }
    } catch (err) {
      fails.push(`${path} request ${i}: fetch failed (${err.message}) - is a server running at ${base}?`);
      break;
    }
    const symbols = (html.match(/<symbol id="pm-/g) || []).length;
    const uses = (html.match(/<use href="#pm-/g) || []).length;
    const bytes = Buffer.byteLength(html);
    lines.push(`  ${path} request ${i}: ${symbols} symbol defs, ${uses} <use> refs, ${bytes} bytes`);
    const cluster = uses > 0;
    if (cluster && symbols !== expected) {
      fails.push(
        `${path} request ${i}: ${uses} marks painted, ${symbols} sprite symbols (expected ${expected}) - ` +
        `the sprite is claimed per process or per path instead of per render, so this render references glyphs ` +
        `it never emitted (D297)`
      );
    }
    if (!cluster && symbols > 0) {
      fails.push(`${path} request ${i}: sprite emitted with no marks on the page - glyph bytes shipped for nothing`);
    }
  }
}

console.log(`sprite claim @ ${base} (Linux native, Node ${process.version}, ${requests} requests per path`);
console.log(lines.join('\n'));
if (fails.length) {
  console.log('FAIL');
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`PASS - every render of every probed path carries its own sprite (${expected} glyphs)`);
