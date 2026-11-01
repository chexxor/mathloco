// ratify-check.mjs — does the ratified token block actually do what DESIGN.md claims?
//
// Two oracles, both run in the loop, neither of them me:
//
//  1. Tailwind's own resolver (`@tailwindcss/node`, the same one `npm run check:classes` uses).
//     Every utility name DESIGN.md promises must resolve to CSS, and the token block must NOT
//     redeclare any key of Tailwind's default theme except the four that are deliberate
//     (--spacing, --default-transition-duration, --default-transition-timing-function, --font-sans,
//     --font-body, and the two retired book-* colours). Redeclaring --text-sm / --radius-lg /
//     --shadow-lg would restyle every existing page invisibly from a "tokens only" branch — the one
//     way this branch could do damage without touching markup. `duration-color` is asserted NULL on
//     purpose: Tailwind v4 has no --duration-* namespace, which is why the ladder is written as
//     duration-150 / duration-250 (measured, not remembered).
//
//  2. The renderer colour oracle (.design/grill/contrast-oracle.mjs), over a config whose token
//     VALUES ARE PARSED OUT OF src/styles/global.css. So this check cannot pass by remembering the
//     decisions: nudge a token and the measured ratio moves with it and the row fails.
//
// Run: node .design/ratify-check.mjs      (needs firefox; ~20 s)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { __unstable__loadDesignSystem } from '@tailwindcss/node';

const ROOT = resolve(import.meta.dirname, '..'); // this file lives in .design/
const CSS_PATH = resolve(ROOT, 'src/styles/global.css');
const css = readFileSync(CSS_PATH, 'utf8');
let bad = 0;
const fail = (msg) => { bad++; console.log(`  FAIL  ${msg}`); };
const ok = (msg) => console.log(`  ok    ${msg}`);

// ---------------- 1. what the token block declares, and what it must not collide with ----------
const themeBody = css.slice(css.indexOf('@theme {'), css.lastIndexOf('}'));
const declared = [...themeBody.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
const twDefaults = new Set(
  [...readFileSync(resolve(ROOT, 'node_modules/tailwindcss/theme.css'), 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
);
// The collisions that ARE the decision. Everything else must be a new name.
const ALLOWED_COLLISIONS = new Set([
  '--spacing',                          // 4px grid: already the default, stated so a gate can assert it
  '--default-transition-duration',      // 150ms for colour transitions (D-round5)
  '--default-transition-timing-function', // linear for colour, ease-out written where things move
  '--font-sans',                        // chrome face; still the phantom value until apply installs it
  '--font-body',                        // PT Serif, live today
  '--color-book-gray',                  // retired, but the four never-imported icons/*.astro still
                                        // write it, so check:classes needs it until choose-icons lands
]);
// A retired token must STAY retired. book-theme's last two references were ::selection and a global
// `.underline` class in Layout.astro that painted an amber highlighter instead of underlining; both
// went in apply batch 3, so its return to @theme would be a regression, not a typo.
const RETIRED_GONE = ['--color-book-theme'];
const collisions = declared.filter((d) => twDefaults.has(d) && !ALLOWED_COLLISIONS.has(d));
console.log('\n== token block: declared keys, collisions with Tailwind defaults ==');
console.log(`  ${declared.length} keys declared; ${new Set(declared).size} distinct`);
if (collisions.length) fail(`token block overrides Tailwind built-ins (would invisibly restyle every page): ${collisions.join(', ')}`);
else ok(`no accidental built-in overrides (${[...ALLOWED_COLLISIONS].length} deliberate collisions allowed)`);
const missing = [...ALLOWED_COLLISIONS].filter((k) => !declared.includes(k));
if (missing.length) fail(`expected tokens absent from @theme: ${missing.join(', ')}`);
const resurrected = RETIRED_GONE.filter((k) => declared.includes(k));
if (resurrected.length) fail(`retired token is back in @theme: ${resurrected.join(', ')}`);
else ok(`${RETIRED_GONE.length} retired token(s) confirmed absent from @theme`);

// ---------------- 2. every utility DESIGN.md promises must resolve ----------------------------
const ds = await __unstable__loadDesignSystem(css, { base: ROOT });
const promised = [
  'bg-paper', 'bg-panel', 'bg-tint', 'bg-ink', 'bg-path-mobilizon-tint',
  'bg-ink-hover', 'hover:bg-ink-hover', 'hover:bg-tint',
  'focus-visible:outline-gold', 'focus-visible:outline-band-text', 'focus-visible:outline-2', 'focus-visible:outline-offset-2',
  'text-ink', 'text-ink-2', 'text-ink-3', 'text-gold', 'text-gold-on-ink', 'text-band-text',
  'text-path-calendar', 'text-path-meetup-on-ink',
  'inset-shadow-rule', 'inset-shadow-gold', 'inset-shadow-path-calendar', 'inset-shadow-path-meetup',
  'inset-shadow-path-discord', 'inset-shadow-path-mobilizon',
  'shadow-e1', 'shadow-e2',
  'text-micro', 'text-label', 'text-body', 'text-lede', 'text-subhead', 'text-heading',
  'text-display-1', 'text-display-2', 'text-display-3', 'text-display-4', 'leading-prose',
  'rounded-control', 'rounded-card',
  'duration-150', 'duration-250', 'ease-out', 'ease-linear',
  'p-3', 'p-6', 'mt-6', 'gap-2', 'font-body',
];
console.log('\n== utilities the token block must produce ==');
const unresolved = promised.filter((c) => !ds.candidatesToCss([c])[0]);
if (unresolved.length) fail(`these class names resolve to nothing: ${unresolved.join(', ')}`);
else ok(`${promised.length}/${promised.length} promised utilities resolve`);
if (ds.candidatesToCss(['duration-color'])[0]) fail('duration-color resolved: Tailwind v4 has no --duration-* namespace, so DESIGN.md must not promise it');
else ok('duration-color correctly resolves to nothing (v4 has no --duration-* namespace)');
// the built-ins design-apply will retire must STILL work until the markup stops using them
const stillLive = ['text-sm', 'text-gray-900', 'bg-blue-100', 'shadow-lg', 'rounded-lg', 'p-5'];
const dead = stillLive.filter((c) => !ds.candidatesToCss([c])[0]);
if (dead.length) fail(`shipped classes no longer resolve (apply not landed yet): ${dead.join(', ')}`);
else ok('all shipped built-ins still resolve, so this branch cannot break check:classes');

// ---------------- 3. the renderer oracle over the token values in the artifact ----------------
console.log('\n== renderer colour oracle over the token values as written in global.css ==');
execFileSync(process.execPath, [resolve(ROOT, '.design/grill/contrast/gen-ratify-cfg.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [resolve(ROOT, '.design/grill/contrast-oracle.mjs'), 'contrast/cfg-ratify.json'], { stdio: 'inherit' });
const cfg = JSON.parse(readFileSync(resolve(ROOT, '.design/grill/contrast/cfg-ratify.json'), 'utf8'));
const out = JSON.parse(readFileSync(resolve(ROOT, '.design/grill/contrast/out/cfg-ratify/oracle_blank_html-1240.json'), 'utf8'));
const rows = out.pairs || [];
const want = cfg.pairs.length;
if (rows.length !== want) fail(`the oracle returned ${rows.length} of ${want} pairs — a colour expression was unparseable, read the table above`);
const verdictFor = (must) => (must === 'fail' ? 'FAIL' : must === 'flat' ? 'FLAT (decoration)' : must === 'layered' ? 'LAYERED' : 'PASS');
for (const want0 of cfg.pairs) {
  const got = rows.find((r) => r.name === want0.name);
  if (!got) { fail(`no result row for: ${want0.name}`); continue; }
  const wantVerdict = verdictFor(want0.must);
  if (got.verdict !== wantVerdict) fail(`${want0.name}: verdict ${got.verdict}, decision requires ${wantVerdict} (bar ${want0.bar}, measured ${got.ratio})`);
  else if (want0.expect !== null && Math.abs(got.ratio - want0.expect) > 0.15) fail(`${want0.name}: measured ${got.ratio}, the grill recorded ${want0.expect} (>0.15 apart) — a token drifted`);
  else ok(`${want0.name} = ${got.ratio} (bar ${want0.bar}, renderer says ${got.verdict}${want0.expect === null ? ', no historic number to match' : `, record ${want0.expect}`})`);
}
console.log(`\n${bad ? `${bad} FAILURE(S)` : 'ALL PASS'} — token file: ${CSS_PATH}`);
process.exit(bad ? 1 : 0);
