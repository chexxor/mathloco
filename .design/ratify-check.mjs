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
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
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

// ---------------- 1b. the faces the token block names must exist ----------------
// "The class exists" is not "the font is there". A phantom family in --font-sans renders in the
// fallback stack and every type measurement downstream is a lie about a face nobody installed, which
// is exactly the state ratify found ("Inter var", x-height 0.48). So the phantom is asserted absent,
// and the one vendor woff2 the ratified latin face points at must exist at the size the decision paid
// for — a moved path in an @fontsource upgrade fails here instead of shipping system-ui chrome.
const PHANTOM_FAMILIES = ['Inter var'];
const sansDecl = /--font-sans:\s*([^;]+);/.exec(css);
const phantom = !sansDecl ? ['--font-sans is not declared at all']
  : PHANTOM_FAMILIES.filter((f) => sansDecl[1].includes(f));
console.log('\n== faces ==');
if (phantom.length) fail(`--font-sans names a family no file provides: ${phantom.join(', ')}`);
else ok('no phantom family in the token block');
const fontsCss = readFileSync(resolve(ROOT, 'src/styles/fonts.css'), 'utf8');
const faceUrl = /src: url\('([^']+)'\)/.exec(fontsCss);
const RATIFIED_FACE_BYTES = 26832;   // .design/decisions.json typeFamily.bytes
if (!faceUrl) fail('src/styles/fonts.css declares no @font-face src — the chrome face is not wired');
else {
  const facePath = resolve(resolve(ROOT, 'src/styles'), faceUrl[1]);
  const bytes = existsSync(facePath) ? statSync(facePath).size : -1;
  if (bytes === -1) fail(`the chrome face points at a file that is not there: ${faceUrl[1]}`);
  else if (bytes !== RATIFIED_FACE_BYTES) fail(`chrome face is ${bytes} B at ${faceUrl[1]}, ratified at ${RATIFIED_FACE_BYTES} B — a different file got imported`);
  else ok(`chrome face present, ${bytes} B, latin wght 100-900 as ratified`);
}
for (const serif of ['latin-400.css', 'latin-700.css']) {
  if (!readFileSync(resolve(ROOT, 'src/layouts/Layout.astro'), 'utf8').includes(`pt-serif/${serif}`))
    fail(`Layout.astro no longer imports @fontsource/pt-serif/${serif} — serif would render one weight`);
}
ok('serif pair (latin 400 + latin 700) imported in Layout.astro');

// ---------------- 1c. motion and state grammar, grepped out of the live source ----------------
// DESIGN.md "Motion": every animation carries a reduced-motion guard, and the grammar has two tiers
// (150ms colour, 250ms movement) — neither of which is an infinite loop. "States": a notice is word +
// inset keyline, never a palette fill, and model output carries its type in tokens rather than
// through the prose plugin. DORMANT files are excluded here exactly as .design/gen-token-map.mjs
// excludes them, so a dormant file cannot make this section green by accident.
const DORMANT = new Set([
  'src/components/UpcomingMeetups.astro', 'src/components/PastEvents.astro',
  'src/components/icons/Instagram.astro', 'src/components/icons/Linkedin.astro',
  'src/components/icons/Medium.astro', 'src/components/icons/Twitter.astro',
]);
const liveFiles = [];
(function walk(dir, rel) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { walk(join(dir, e.name), r); continue; }
    if (!/\.(astro|svelte|ts|css)$/.test(e.name)) continue;
    const path = `src/${r}`;
    if (DORMANT.has(path)) continue;
    liveFiles.push([path, readFileSync(join(dir, e.name), 'utf8')]);
  }
})(resolve(ROOT, 'src'), '');
// the guard has to be a real @media block: global.css MENTIONS the string inside a comment, and a
// grep that counts comments would report a guard that does not exist
const guards = liveFiles.reduce((n, [, t]) => n + (t.match(/@media[^{]*\(\s*prefers-reduced-motion/g) ?? []).length, 0);
if (guards < 1) fail('no prefers-reduced-motion guard in live src — DESIGN.md "Motion" requires one per animation');
else ok(`${guards} reduced-motion @media guard(s), ${liveFiles.length} live source files scanned`);
for (const [re, why] of [
  [/class="[^"]*\sanimate-[a-z-]+/, 'an `animate-*` write (the motion grammar is 150ms colour / 250ms movement — no infinite tier)'],
  [/class="[^"]*(?:^|\s)prose(?:\s|-blue)/, 'a prose-plugin write (`prose` / `prose-blue`)'],
  [/\bbg-(?:red|blue|green|amber|yellow|gray|slate)-\d{2,3}/, 'a palette fill in markup, where the grammar says word + keyline'],
]) {
  const hits = liveFiles.filter(([, t]) => re.test(t)).map(([f]) => f);
  if (hits.length) fail(`${why} — still written in ${hits.join(', ')}`);
  else ok(`clean: ${why}`);
}

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
