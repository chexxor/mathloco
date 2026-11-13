#!/usr/bin/env node
// check:sprite-claim - the platform sprite is claimed per RENDER, and only where a mark is painted.
//
// Why (D297, @measured 2026-11-13 by `node design/sprite-claim.mjs --base http://localhost:4322` against a dev
// server running the tree at a50656b): the claim in `src/lib/platform-marks.mjs` was a module-level `new Set()`
// keyed on `Astro.url.pathname`. One process serves many requests, so request 1 for `/` printed the three
// `<symbol>` defs and requests 2 and 3 printed three `<use href="#pm-...">` pointing at a sprite that was never
// emitted - three empty 16px boxes, which to a class scanner is indistinguishable from a glyph. `/` request 2
// was 5,270 bytes smaller than request 1; `/schedule` behaved the same.
//
// Why no other gate saw it: every route in src/pages is `prerender = true`, so `dist/` is rendered exactly once
// per route and the sprite is in it by construction. `check:rsvp-page` (5c/9b/9c) and `check:render` (rule 4c)
// read built files, so a claim that goes stale on the second render of a route is invisible to them. This gate
// is the part of the check that can run in a deploy gate: it reads the claim's shape and its behaviour. The
// live double-render measurement is `design/sprite-claim.mjs`, which needs a running server and is run by hand.
//
//   node scripts/check-sprite-claim.mjs            the gate
//   node scripts/check-sprite-claim.mjs --selftest plant each defect, require each to fail
//   node scripts/check-sprite-claim.mjs --show     print the claim code the gate is reading

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const MODULE = 'src/lib/platform-marks.mjs';
const LAYOUT = 'src/layouts/Layout.astro';

/** Every .astro under src/ that renders the sprite, found by walking rather than by a list: a new call site
 *  cannot escape the rule by being new (D238: one home per rule, and a hand-kept list of files is a second one). */
function spriteCallSites(dir = 'src') {
  const out = [];
  for (const entry of readdirSync(root + dir, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...spriteCallSites(rel));
    } else if (entry.name.endsWith('.astro')) {
      const text = readFileSync(root + rel, 'utf8');
      if (text.includes('<PlatformMarks')) out.push({ path: rel, text });
    }
  }
  return out;
}

/** Read the claim code out of the module so `--show` and the finding text can quote it. */
function claimCode(moduleSrc) {
  const i = moduleSrc.indexOf('spriteClaims');
  return i === -1 ? '' : moduleSrc.slice(i, moduleSrc.indexOf('}', moduleSrc.indexOf('function spriteFor', i)) + 1);
}

/** Import a source string as an ES module: the plantings are exercised by the same code path as the real file,
 *  without writing a file to disk. Node supports data: URL ESM imports (verified here, node 24.22.1). */
async function importSource(src) {
  return import('data:text/javascript,' + encodeURIComponent(src));
}

/** Pure verdict over the data the gate reads. The selftest plants by mutating this data, never the tree. */
function verdict(data) {
  const { moduleSrc, sites, layoutText } = data;
  const fail = [];

  // 1. The claim must be keyed on an object that lives exactly as long as one render.
  if (!/new Weak(Set|Map)\(/.test(moduleSrc)) {
    fail.push(
      `${MODULE}: the sprite claim is not keyed on a render-scoped object (no WeakSet/WeakMap) - a claim keyed on a ` +
      `path or a counter is answered once per process, so every request after the first renders <use> refs with no ` +
      `sprite behind them (D297). Key it on Astro.locals in a WeakSet.`
    );
  }

  // 2. Every call site passes the render, not the path, and never emits the sprite without asking.
  for (const site of sites) {
    const calls = site.text.match(/spriteFor\(([^)]*)\)/g) || [];
    if (!calls.length) {
      fail.push(
        `${site.path}: renders <PlatformMarks> without asking spriteFor for it - the sprite ships on every render of ` +
        `that page whether or not it is needed (D294: /chat would pay +2,201 gzip, 41.3% of the page, for glyphs it never paints).`
      );
      continue;
    }
    for (const call of calls) {
      const arg = call.slice('spriteFor('.length, -1).trim();
      if (/pathname|\.url|\bpath\b/.test(arg)) {
        fail.push(
          `${site.path}: ${call} claims the sprite by path, not by render - the first request for a path wins the claim ` +
          `and every later request paints marks with no sprite (D297). Pass Astro.locals.`
        );
      }
    }
  }

  // 3. The layout is not the emitter: it wraps pages that paint no mark.
  if (/<PlatformMarks/.test(layoutText)) {
    fail.push(
      `${LAYOUT}: emits <PlatformMarks> for every page, so a page painting no mark ships the glyph bytes anyway ` +
      `(D294 - the component that paints the mark claims the sprite, not the shell around it).`
    );
  }

  // 4. Behaviour, not shape: make the claim answer, twice.
  const mod = data.mod;
  if (!mod || typeof mod.spriteFor !== 'function') {
    fail.push(`${MODULE}: spriteFor is not exported, so no component can claim a sprite.`);
    return fail;
  }
  const first = { url: { pathname: '/' } };
  const second = { url: { pathname: '/' } };
  if (!mod.spriteFor(first)) {
    fail.push(`${MODULE}: spriteFor says no to a render that has not emitted a sprite - the first mark on a page would render with no glyph.`);
  }
  if (mod.spriteFor(first)) {
    fail.push(`${MODULE}: spriteFor says yes twice for the same render object - one render emits two sprites, i.e. two sets of the same ids.`);
  }
  if (!mod.spriteFor(second)) {
    fail.push(
      `${MODULE}: spriteFor says no to a different render object with the same pathname - the claim is keyed on the path, ` +
      `so the second request to a route paints marks with no sprite (D297).`
    );
  }
  if (!mod.spriteFor(undefined)) {
    fail.push(`${MODULE}: spriteFor says no with nothing to key on - with no render object the safe answer is to emit the sprite, not to drop it.`);
  }

  return fail;
}

async function readData() {
  const moduleSrc = readFileSync(root + MODULE, 'utf8');
  return {
    moduleSrc,
    sites: spriteCallSites(),
    layoutText: existsSync(root + LAYOUT) ? readFileSync(root + LAYOUT, 'utf8') : '',
    mod: await importSource(moduleSrc),
  };
}

async function runGate() {
  const fail = verdict(await readData());
  if (fail.length) {
    console.error(`check:sprite-claim: ${fail.length} problem(s)`);
    for (const f of fail) console.error('  - ' + f);
    return 1;
  }
  console.log(
    'check:sprite-claim: ok - the sprite is claimed per render (WeakSet keyed on Astro.locals), emitted only by a ' +
    'component that paints a mark, never by the layout; behaviour: one sprite per render, a fresh one for each ' +
    'render, and no render skipped'
  );
  return 0;
}

// Each planting is a mutation of the data the gate reads, and the gate must NAME it.
const PLANTINGS = [
  ['claim keyed on the path instead of the render', (d) => ({
    ...d,
    moduleSrc: d.moduleSrc
      .replace('const spriteClaims = new WeakSet();', 'const spriteClaimed = new Set();')
      .replace('if (spriteClaims.has(locals)) return false;\n  spriteClaims.add(locals);', 'const key = String(locals?.url?.pathname || "");\n  if (spriteClaimed.has(key)) return false;\n  spriteClaimed.add(key);'),
  })],
  ['claim is a process counter, so it never releases', (d) => ({
    ...d,
    moduleSrc: d.moduleSrc
      .replace('const spriteClaims = new WeakSet();', 'let spriteCount = 0;')
      .replace('if (spriteClaims.has(locals)) return false;\n  spriteClaims.add(locals);', 'if (spriteCount++) return false;'),
  })],
  ['claim never says no - one sprite per cluster', (d) => ({
    ...d,
    moduleSrc: d.moduleSrc
      .replace('const spriteClaims = new WeakSet();', 'const spriteClaims = new WeakSet(); // never consulted')
      .replace('if (spriteClaims.has(locals)) return false;\n  spriteClaims.add(locals);', 'spriteClaims.add(locals);'),
  })],
  ['call site passes the path', (d) => ({
    ...d,
    sites: d.sites.map((s) => ({ path: s.path, text: s.text.replace(/spriteFor\(Astro\.locals\)/, 'spriteFor(Astro.url.pathname)') })),
  })],
  ['sprite emitted with no claim at all', (d) => ({
    ...d,
    sites: d.sites.map((s) => ({ path: s.path, text: s.text.replace(/\{spriteFor\(Astro\.locals\) && <PlatformMarks \/>\}/, '<PlatformMarks />') })),
  })],
  ['sprite moved into the layout', (d) => ({ ...d, layoutText: d.layoutText + '\n<PlatformMarks />\n' })],
];

async function runSelftest() {
  const base = await readData();
  if (verdict(base).length) {
    console.error('check:sprite-claim:selftest: the real tree already fails the gate - fix it before trusting the selftest');
    for (const f of verdict(base)) console.error('  - ' + f);
    return 1;
  }
  let caught = 0;
  for (const [label, mutate] of PLANTINGS) {
    const planted = mutate(base);
    // The planted module has to be re-imported for the behaviour half of the verdict to see it.
    planted.mod = await importSource(planted.moduleSrc).catch(() => null);
    const fail = verdict(planted);
    if (fail.length) {
      caught++;
      console.log(`  caught: ${label} -> ${fail[0]}`);
    } else {
      console.error(`  NOT caught: ${label}`);
    }
  }
  if (caught !== PLANTINGS.length) {
    console.error(`check:sprite-claim:selftest: ${caught}/${PLANTINGS.length} plantings caught - the gate is blind to ${PLANTINGS.length - caught} defect classes.`);
    return 1;
  }
  console.log(`check:sprite-claim:selftest: ok - ${caught} plantings caught, control clean`);
  return 0;
}

if (process.argv.includes('--selftest')) process.exit(await runSelftest());
if (process.argv.includes('--show')) {
  console.log(claimCode(readFileSync(root + MODULE, 'utf8')));
  process.exit(0);
}
process.exit(await runGate());
