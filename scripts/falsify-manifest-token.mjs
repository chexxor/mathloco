/**
 * falsify:manifest - prove the two manifest assertions in `npm run check:deploy` actually go red.
 *
 * Rewrites `dist/server/entry.mjs` so the Astro manifest is the **unsubstituted token** again,
 * which is a build state this rig has seen with its own eyes (a build that reported `Complete!`
 * but never ran `manifestBuildPostHook` over the written chunks). What that artifact does on
 * `wrangler deploy`:
 *
 *   Uncaught TypeError: Invalid URL string.
 *     at .../astro/dist/core/app/manifest.js:35 in deserializeManifest
 *     at entry.mjs:170                                          [code: 10021]
 *
 * `new URL(undefined)` is the throw: the entry contains
 *   var _manifest = deserializeManifest("@@ASTRO_MANIFEST_REPLACE@@");
 * instead of `deserializeManifest({"rootDir":"file://…"}). It is also ~6.5 KB smaller, so the
 * byte budget would notice a regression of this size even without the token check.
 *
 * Run it against a built tree, expect 2 failures, then `npm run build` to restore.
 * `dist/` is gitignored; nothing here can touch a deploy.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'dist/server/entry.mjs';
const src = readFileSync(file, 'utf8');
// The call site carrying the payload is the last one; the earlier occurrence is the function
// definition `function deserializeManifest(serializedManifest, routesList)`, which must not be
// the one you rewrite (doing so changes the byte count by 2 and proves nothing).
const call = src.lastIndexOf('deserializeManifest(');
if (call < 0) throw new Error(`${file}: no deserializeManifest call site found`);

let depth = 0;
let end = -1;
for (let i = call + 'deserializeManifest'.length; i < src.length; i++) {
  if (src[i] === '(') depth++;
  else if (src[i] === ')' && --depth === 0) {
    end = i;
    break;
  }
}
if (end < 0) throw new Error(`${file}: unbalanced parentheses after the call site`);

const out = src.slice(0, call) + 'deserializeManifest("@@ASTRO_MANIFEST_REPLACE@@")' + src.slice(end + 1);
writeFileSync(file, out);
console.log(
  `rewrote ${file}: ${src.length} -> ${out.length} B (manifest payload removed, token restored)\n` +
    'next: npm run check:deploy  -> expect "manifest token substituted in entry.mjs" and ' +
    '"manifest payload present (rootDir file: URL)" both FAIL',
);
