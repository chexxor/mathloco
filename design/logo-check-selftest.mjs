// logo-check-selftest.mjs — can `check:logo` fail at all, or does it only ever nod?
//
//   npm run build && npm run check:logo:selftest      # needs a built dist/ and firefox; ~20 s
//   npm run check:logo:selftest "missing"             # a substring picks which cases to run
//
// WHY THIS EXISTS (the repo rule: a gate ships with its own selftest). `check:logo` was added to the BROWSER
// set and passed for days, then D489 found it running two probes that did not exist: the rename that moved
// design/mark-*.mjs to design/logo-*.mjs left the gate spawning bare `logo-geometry.mjs` / `logo-pixels.mjs`
// against the process cwd, so the gate's own wiring was the defect and nothing could see it. A gate nobody
// can prove can go red is an assertion, not a detector (D118).
//
// Three things can be wrong about this gate, and each is planted here:
//   A. the gate's WIRING — a probe it must spawn is gone (the D489 class, planted by moving the file);
//   B. the GEOMETRY probe — a table that disagrees with the painted pixels must FAIL. Four decoy readings of
//      src/lib/logo.mjs are written to gitignored scratch and run against the SAME shot, so the only variable
//      is the table. This is the probe's own `--table` control mechanism, scripted;
//   C. the PIXELS probe — a report whose logo sits outside the shot must FAIL with the window-height trap
//      named, not silently measure nothing (record 0015's failure class: a fixed frame around a taller page).
// Every case needs a clean control beside it: a run that is always green and a run that is always red are the
// same useless gate.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOGO } from '../src/lib/logo.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));            // design/
const SCRATCH = '.design/logo-selftest';
const only = process.argv.slice(2);

const run = (args, env = {}) => {
  try {
    return { status: 0, out: execFileSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, ...env } }) };
  } catch (e) {
    return { status: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

if (!existsSync(resolve('dist/client/index.html'))) {
  console.error('dist/client/index.html missing — run npm run build first (this selftest measures the shipped artifact)');
  process.exit(1);
}
mkdirSync(SCRATCH, { recursive: true });

const results = [];
let ok = true;
const expect = (name, kind, res, want) => {
  const hit = res.out.split('\n').find((l) => want.test(l));
  if (kind === 'pass' && res.status === 0 && hit) results.push(`  ok    ${name}: control passes — ${hit.slice(0, 90)}`);
  else if (kind === 'pass' && res.status === 0) { ok = false; results.push(`  FAIL  ${name}: exit 0 but the control line never printed (${res.out.slice(0, 120)})`); }
  else if (kind === 'pass') { ok = false; results.push(`  FAIL  ${name}: the CONTROL failed (exit ${res.status}) — a selftest whose control is red proves nothing`); }
  else if (res.status === 0 || !hit) { ok = false; results.push(`  FAIL  ${name}: exit ${res.status}, ${hit ? 'wrong reason' : 'no failure'} — this planting cannot make the gate go red (want /${want}/)`); }
  else results.push(`  ok    ${name}: fails as designed — ${hit.slice(0, 110)}`);
};

// ---------- A. the gate's own wiring (D489) ----------
// The control is the gate itself, unmutated, at the three widths it brackets the hero box.
const CONTROL = run([resolve(HERE, 'logo-check.mjs')]);
expect('check:logo on the shipped tree', 'pass', CONTROL, /LOGO CHECK: PASS/);
const shot = `.design/render/logo-320.png`, rep = `.design/render/_-320.json`;
if (!existsSync(shot) || !existsSync(rep)) {
  console.error(`the control run wrote no ${shot} / ${rep} — the plantings below measure pixels, so they need it`);
  process.exit(1);
}

for (const probe of ['logo-pixels.mjs', 'logo-geometry.mjs']) {
  const src = resolve(HERE, probe), moved = resolve(SCRATCH, probe);
  if (only.length && !only.some((o) => probe.includes(o))) continue;
  renameSync(src, moved);
  try {
    expect(`the gate cannot spawn ${probe} (D489)`, 'fail', run([resolve(HERE, 'logo-check.mjs')]), /probe missing/);
  } finally {
    renameSync(moved, src);
  }
  if (!existsSync(src)) { console.error(`restore failed: ${src} is still moved — fix before running anything else`); process.exit(1); }
}

// ---------- B. the geometry probe: a table that disagrees with the pixels ----------
// The decoys are GENERATED from src/lib/logo.mjs, never typed out: a hard-coded path string rots the moment
// the drawing moves (D190), and these cases must rot with the drawing they break, not before it.
const num = (s) => (String(s).match(/-?\d+(\.\d+)?/g) || []).map(Number);
// The drawing writes its cubics as `C62 50, 178 50, 178 78`, so every number pair has to be read before
// any of it is rewritten: flatten a comma-separated path by pulling each C's six numbers out in order.
const flatten = (d) => {
  const y0 = num(d)[1];
  return d.replace(/C((?:-?[\d.]+[, ]\s*){5}-?[\d.]+)/g, (all) => {
    const n = num(all);
    return `C ${n[0]} ${y0} ${n[2]} ${y0} ${n[4]} ${n[5]}`;
  });
};

const decoys = {
  // 1. the equator drawn as a chord instead of an ellipse: every box, dash and colour still measures, and the
  //    figure stops being a sphere (operator ruling, 2026-11-02: "the circle does not look like a sphere").
  'flattened-equator': (L) => ({ ...L, shapes: L.shapes.map((s) => (s.role === 'sphere' && s.tag === 'path' ? { ...s, d: flatten(s.d) } : s)) }),
  // 2. meridians replaced by straight runs from the same feet to the same pole — the compromise the operator
  //    rejected (sixth ruling, 2026-11-24). The lines still cross at the pole, so only the meridian check sees it.
  'straight-meridians': (L) => ({ ...L, shapes: L.shapes.map((s) => (s.role === 'route' ? { ...s, d: `M${num(s.d)[0]} ${num(s.d)[1]} L${L.meet.x} ${L.meet.y}` } : s)) }),
  // 3. the pole dot no longer at the crossing. Same ink everywhere; the dot logos a point the surface does not have.
  'pole-dot-off-the-crossing': (L) => ({ ...L, dot: { ...L.dot, cy: L.dot.cy - 12 } }),
  // 4. dashes on the NEAR half: the sphere drawn inside out, and the only cue for occlusion is inverted.
  'dash-on-the-near-half': (L) => {
    const [a, b] = L.shapes.map((s, i) => [s, i]).filter(([s]) => s.role === 'sphere' && s.tag === 'path');
    const shapes = [...L.shapes];
    shapes[a[1]] = { ...a[0], dash: b[0].dash ?? null };
    shapes[b[1]] = { ...b[0], dash: a[0].dash ?? null };
    return { ...L, shapes };
  },
  // 5. the table has fewer shapes than the page draws — D118 lesson 1, the <svg> that silently drops children.
  //    The probe refuses to guess which painted shape belongs to which declared one, which is the honest verdict.
  'table-shorter-than-the-page': (L) => ({ ...L, shapes: L.shapes.filter((s) => s.role !== 'accent') }),
};

for (const [name, mutate] of Object.entries(decoys)) {
  if (only.length && !name.includes(only[0])) continue;
  const file = resolve(SCRATCH, `${name}.mjs`);
  const planted = mutate(LOGO);
  writeFileSync(file, `// planted by design/logo-check-selftest.mjs — a deliberately wrong reading of the logo\n`
    + `export const LOGO = ${JSON.stringify(planted, null, 1)};\n`);
  expect(`geometry probe vs ${name}`, 'fail',
    run([resolve(HERE, 'logo-geometry.mjs'), shot, rep, '--table', file]),
    /LOGO GEOMETRY:|against a table of/);
}
if (!only.length || only.some((o) => 'control'.includes(o))) {
  expect('geometry probe vs the shipped table', 'pass',
    run([resolve(HERE, 'logo-geometry.mjs'), shot, rep]), /LOGO GEOMETRY: PASS/);
}

// ---------- C. the pixels probe: a shot shorter than the page (record 0015) ----------
// firefox --screenshot captures the WINDOW. When this gate still shot at the render gate's fixed 1400,
// the PS-1 plate moved the logo to y=1421 at 320px and the probe measured an empty box for a logo that was
// painted correctly. The planting is that exact artifact: the shipped report, and the shipped shot cut back
// to the 1400 window that no longer contains the logo. A planted y in the report would be a number this
// script invents; a cropped shot is the defect itself.
if (!only.length || only.some((o) => 'window'.includes(o) || 'shot'.includes(o))) {
  const shortFile = resolve(SCRATCH, 'logo-320-window-1400.png');
  const meta = await sharp(shot).metadata();
  await sharp(shot).extract({ left: 0, top: 0, width: meta.width, height: Math.min(1400, meta.height) })
    .png().toFile(shortFile);
  expect('pixels probe vs a 1400px window on a taller page (record 0015)', 'fail',
    run([resolve(HERE, 'logo-pixels.mjs'), shortFile, rep]), /outside the .*-tall shot/);
  expect('pixels probe vs the shipped report', 'pass',
    run([resolve(HERE, 'logo-pixels.mjs'), shot, rep]), /COVERAGE|logo "/);
}

console.log('\n== can check:logo fail? (gate wiring, decoy tables, a report off the page) ==');
console.log(results.join('\n'));
console.log(`\n  ${results.length} cases; nothing in the tree or dist is changed by this script (scratch is ${SCRATCH})`);
if (!ok) { console.error('LOGO CHECK SELFTEST: FAIL'); process.exit(1); }
console.log('LOGO CHECK SELFTEST: PASS');
