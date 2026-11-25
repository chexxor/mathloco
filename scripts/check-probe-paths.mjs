#!/usr/bin/env node
// check-probe-paths.mjs — every probe a script spawns is named by a path that resolves (D496).
//
// WHY THIS GATE EXISTS. On 2026-11-24 D487 renamed design/mark-*.mjs to design/logo-*.mjs. D489 found and
// fixed the one place that broke (design/logo-check.mjs) and wrote the reason into its comment. Four days
// later `npm run round21` — a round that is not in `verify`, so nothing ran it — exited 1 with
// `Cannot find module '/home/chexxor/Git/mathloco/logo-geometry.mjs'` @measured 2026-11-25 (Linux native,
// Node 24.22.1) by `npm run round21 > .design/tmp-round-runs/r21-turn6.txt`. The rename had swallowed the
// directory in the SPAWN LITERALS, not only in prose, and the same shape sat in round22, round8 and round9.
// A bare filename passed to execFileSync is resolved against the PROCESS cwd — the repo root for npm,
// scripts/gate-run.mjs and CI — not against the script that wrote it. `check:design`
// (design/audit-references.mjs --stale) resolves path literals that carry a root prefix; a bare name is
// invisible to it, which is exactly the shape this defect took.
//
// THE RULE, in one sentence: inside a file that spawns a process, an argv-shaped array whose first element
// is a quoted script name must name a file that exists at the path the spawn would resolve.
//
// "argv-shaped" means the array holds something other than quoted strings after the name (a variable, a
// call, a number) — that is what distinguishes a spawn array from a fixture list of ['P07.ts', 'desc', ...]
// and from prose. @measured 2026-11-25 by the pre-gate scan (.design/tmp-spawn-scan5.mjs): the rule finds
// the 10 broken sites and nothing else in the tracked tree.
//
// Source-only, so it runs before `build` (D118). Cost @measured 2026-11-25 by
// `node scripts/gate-run.mjs check:probe-paths check:probe-paths:selftest` (Linux native, Node 24.22.1).
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const EXT = /\.(mjs|js|ts|sh)$/;
const SPAWNS = /\b(execFileSync|spawnSync|execSync)\s*\(/;
// first element of an array literal, quoted, naming a script
const ARRAY_RE = /\[\s*(['"`])([A-Za-z0-9._\/-]+\.(?:mjs|js|ts|sh))\1\s*,\s*([\s\S]{0,300}?)\]/g;

/**
 * Byte ranges of string, comment and regex literals in `text`.
 * WHY: once this file itself is tracked, its own selftest plantings - `S("txt(['logo-geometry.mjs', shot, rep]);")`
 * - are array literals sitting INSIDE a quoted string, and the gate reported them as spawns: a detector that
 * cannot tell data from code reds the set on its own fixture (D496 §j, found @measured 2026-11-25 by
 * `npm run verify` at tip df24b9d, 4 false findings, exit 1). So a candidate is only a spawn if its `[` is
 * code, not the contents of a string. The fix is a scanner, not an exemption: widening the rule to let the
 * fixture through would let a real quoted spawn through with it.
 */
function literalRanges(text) {
  const ranges = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') { const s = i; while (i < text.length && text[i] !== '\n') i++; ranges.push([s, i]); continue; }
    if (c === '/' && text[i + 1] === '*') { const s = i; const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; ranges.push([s, i]); continue; }
    if (c === "'" || c === '"' || c === '`') {
      const start = i++;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === c) { i++; break; }
        if (c === '`' && text[i] === '$' && text[i + 1] === '{') {   // interpolation is code, not string
          let d = 1; i += 2;
          while (i < text.length && d) { if (text[i] === '{') d++; else if (text[i] === '}') d--; i++; }
          continue;
        }
        i++;
      }
      ranges.push([start, i]);
      continue;
    }
    if (c === '/') {                                            // a regex literal: quotes inside it are not strings
      const before = text.slice(0, i).replace(/\s+$/, '').slice(-1);
      if (before && '(,=[:{;'.includes(before)) {
        const start = i++;
        while (i < text.length) {
          if (text[i] === '\\') { i += 2; continue; }
          if (text[i] === '[') { while (i < text.length && text[i] !== ']') { if (text[i] === '\\') i += 2; else i++; } i++; continue; }
          if (text[i] === '/') { i++; break; }
          i++;
        }
        ranges.push([start, i]);
        continue;
      }
    }
    i++;
  }
  return ranges;
}

/** Does this array look like an argv (a name followed by real arguments), or like a list of strings? */
function argvShape(rest) {
  const stripped = rest.replace(/(['"`])((?:\\\1|[\s\S])*?\1)/g, ' ');
  return /[A-Za-z_$][\w$.]*\s*[,)]|[A-Za-z_$]\s*\(/.test(stripped);
}

/** Pure verdict: (file, text, exists, candidates) -> findings. Split out so the selftest can plant without touching disk. */
export function verdict(file, text, exists, candidates = []) {
  if (!SPAWNS.test(text)) return [];
  const ranges = literalRanges(text);
  const out = [];
  let m;
  ARRAY_RE.lastIndex = 0;
  while ((m = ARRAY_RE.exec(text)) !== null) {
    if (ranges.some(([a, b]) => m.index >= a && m.index < b)) continue;  // the "array" is inside a quoted fixture
    const lit = m[2];
    if (lit.includes('$') || lit.includes('{')) continue;      // template with a hole: not a static path
    if (!argvShape(m[3])) continue;                            // a list of strings is not an argv
    if (exists(lit)) continue;                                 // the spawn resolves — nothing to say
    const line = text.slice(0, m.index).split('\n').length;
    const base = lit.split('/').pop();
    const where = candidates.filter((p) => p.split('/').pop() === base && exists(p))[0] ?? 'nowhere in the tree';
    out.push(`${file}:${line} spawns '${lit}' — a bare or root-relative name is resolved against the process cwd, `
      + `and no file exists there. ${base} is at ${where}. Name the directory, or resolve it from the spawner's own `
      + 'home with design/probe-path.mjs (D496).');
  }
  return out;
}

let CANDIDATES = [];

function trackedFiles() {
  try {
    return execSync('git ls-files design scripts src .agents', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

if (process.argv.includes('--selftest')) {
  const cases = [];
  const expect = (name, want, got) => {
    const ok = (want === 'fail') ? got.length > 0 : got.length === 0;
    cases.push([name, want, got.length ? got[0] : 'clean', ok]);
  };
  const spawn = `const txt = (args) => execFileSync(process.execPath, args, { encoding: 'utf8' });\n`;
  const S = (extra) => spawn + extra;
  const only = (paths) => (p) => paths.includes(p);

  expect('planting: bare probe name, file lives in design/', 'fail',
    verdict('design/roundX.mjs', S("txt(['logo-geometry.mjs', shot, rep]);"), only(['design/logo-geometry.mjs']), ['design/logo-geometry.mjs']));
  expect('planting: bare name where the probe is nowhere in the tree', 'fail',
    verdict('design/roundX.mjs', S("txt(['gone-probe.mjs', shot, rep]);"), only([])));
  expect('planting: args built into a variable first (round8 shape)', 'fail',
    verdict('design/roundX.mjs', S("const args = ['logo-pixels.mjs', png, String(i), '--json'];\nexecFileSync(process.execPath, args);"), only(['design/logo-pixels.mjs']), ['design/logo-pixels.mjs']));
  expect('planting: qualified but wrong directory', 'fail',
    verdict('design/roundX.mjs', S("txt(['design/old/dist-measure.mjs', DIST, '/']);"), only(['design/grill/dist-measure.mjs']), ['design/grill/dist-measure.mjs']));
  expect('control: qualified path that exists', 'pass',
    verdict('design/roundX.mjs', S("txt(['design/grill/dist-measure.mjs', DIST, '/', String(w)]);"), only(['design/grill/dist-measure.mjs'])));
  expect('control: resolved from the spawner home', 'pass',
    verdict('design/logo-check.mjs', S("const PROBES = [resolve(HERE, 'logo-geometry.mjs')];\nfor (const p of PROBES) execFileSync(process.execPath, [p, shot, rep]);"), only(['design/logo-geometry.mjs'])));
  expect('control: fixture list of strings is not an argv', 'pass',
    verdict('scripts/check-svelte.mjs', "const PLANTINGS = [['P07_ts_file_error.ts', 'type error in a plain .ts file', 'body'], ['P05.svelte', 'desc', 'body']];\nexecFileSync('svelte-check');", only([])));
  expect('control: prose naming a probe in a comment', 'pass',
    verdict('design/roundX.mjs', "// `logo-geometry.mjs` and `logo-pixels.mjs` do the measuring\n" + spawn + "txt(['design/grill/dist-measure.mjs', DIST]);", only(['design/grill/dist-measure.mjs'])));
  expect('control: file that spawns nothing', 'pass',
    verdict('src/lib/logo.mjs', "const shapes = ['ring.mjs', 'meridian.mjs'];\nexport const LOGO = { shapes };", only([])));
  expect('control: a bare name that really is at the repo root', 'pass',
    verdict('scripts/gate-run.mjs', spawn + "execFileSync(process.execPath, ['scripts/check-favicon.mjs', '--selftest']);", only(['scripts/check-favicon.mjs'])));
expect("control: a spawn literal quoted inside a string (this gate's own plantings)", "pass",
    verdict('scripts/check-probe-paths.mjs', spawn + 'const FIXTURE = "execFileSync(process.execPath, [\'gone-probe.mjs\', shot, rep]);";', only([])));
  expect('control: a spawn in a comment', 'pass',
    verdict('design/logo-check.mjs', spawn + '// execFileSync(process.execPath, [\'gone-probe.mjs\', a, b]);', only([])));

  const bad = cases.filter((c) => !c[3]);
  console.log(`check:probe-paths:selftest — ${cases.length} cases, ${bad.length} wrong`);
  for (const [name, want, got, ok] of cases) console.log(`  ${ok ? 'ok   ' : 'WRONG'} ${name} (want ${want}): ${got}`);
  if (bad.length) { console.error('the probe-path detector cannot fail: ' + bad.map((b) => b[0]).join(', ')); process.exit(1); }
  process.exit(0);
}

CANDIDATES = trackedFiles();
const files = CANDIDATES.filter((f) => EXT.test(f));
const findings = [];
for (const f of files) {
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  findings.push(...verdict(f, text, (p) => existsSync(p), CANDIDATES));
}
if (findings.length) {
  console.error(`check:probe-paths: ${findings.length} spawn literal(s) name a probe that does not resolve:`);
  for (const f of findings) console.error('  ' + f);
  console.error('\nA spawn argument is resolved against the process cwd, not the script that wrote it. '
    + 'This is the D487/D489 class: a rename that changed a probe name without its directory.');
  process.exit(1);
}
console.log(`check:probe-paths: PASS — ${files.length} tracked source files scanned, every spawn argument resolves.`);
