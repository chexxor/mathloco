#!/usr/bin/env node
// check:lsp - the repo's code-intelligence config is real, narrow, and points at a server this tree has.
//
// Why (D266): pi-lens is the pi package that can reach `.astro` (19 files - the markup surface where the
// design handles and probe anchors live), and it can only do that through a custom LSP server entry in
// `.pi-lens.json`. Vendor guidance cannot cover Astro: pi-lens ships no Astro grammar and no Astro server in
// its built-in registry, and pi-lsp-adapter's built-in filetype map has no `.astro` entry, so an Astro
// component - which starts with `---` - is classified as YAML and handed to yamlls (measured 2026-11-10 in
// .pi/npm/node_modules/pi-lsp-adapter/src/detect/filetypes.ts and src/registry/builtin.ts).
//
// So the config is load-bearing and it can rot in four ways, each silent:
//   1. the astro server entry is deleted or renamed - no tool errors, the .astro files just stop answering;
//   2. `initializationOptions.typescript.tsdk` is dropped - astro-ls refuses to initialize at all
//      ("The `typescript.tsdk` init option is required", measured 2026-11-10);
//   3. the write-side effects (autoformat, autofix) are switched on - this repo's gates compare bytes, and a
//      formatter that rewrites a file on every edit is a gate-breaking machine wearing a convenience hat;
//   4. the server binary is not in the tree (a fresh clone without the astro dependency).
//
// The verdict is a pure function so the selftest can plant each defect into a copy of the real config and
// require a named failure. No LSP process is started here: this gate reads files, so it runs before `build`
// (D118 - a gate that can go red before anyone builds catches the defect on the branch that introduced it).
//
//   node scripts/check-lsp-config.mjs            gate
//   node scripts/check-lsp-config.mjs --selftest plant each defect, require each to fail
//   node scripts/check-lsp-config.mjs --show     print the resolved config the gate is asserting

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const CONFIG = '.pi-lens.json';

function verdict(text, hasAstroServerBinary) {
  const fail = [];
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch (e) {
    return [`config is not valid JSON: ${e.message}`];
  }

  const astro = cfg?.lsp?.servers?.astro;
  if (!astro) {
    fail.push(`lsp.servers.astro is missing - no server is registered for .astro, so 19 markup files have no LSP`);
  } else {
    const exts = astro.extensions ?? [];
    if (!exts.includes('.astro')) fail.push(`lsp.servers.astro.extensions does not name ".astro" (got ${JSON.stringify(exts)}) - an entry with no extensions is not registered at all`);
    const command = Array.isArray(astro.command) ? astro.command.join(' ') : String(astro.command ?? '');
    if (!/astro-ls/.test(command)) fail.push(`lsp.servers.astro.command does not launch astro-ls (got "${command}")`);
    if (!astro.initializationOptions?.typescript?.tsdk) {
      fail.push('lsp.servers.astro.initializationOptions.typescript.tsdk is unset - astro-ls refuses initialize without it');
    }
  }

  for (const [path, value] of [
    ['format.enabled', cfg?.format?.enabled],
    ['autofix.enabled', cfg?.autofix?.enabled],
    ['actionableWarnings.autoFix.enabled', cfg?.actionableWarnings?.autoFix?.enabled],
  ]) {
    if (value !== false) fail.push(`${path} is ${JSON.stringify(value)}, not false - a gate set that compares bytes cannot run under a formatter/autofixer that rewrites files on write`);
  }

  if (!hasAstroServerBinary) {
    fail.push('node_modules/@astrojs/language-server is not installed - the configured server cannot be launched by anyone who clones this tree');
  }

  return fail;
}

function runGate() {
  if (!existsSync(root + CONFIG)) {
    console.error(`check:lsp: ${CONFIG} missing. pi-lens has no project config, so the .astro surface is invisible to it.`);
    return 1;
  }
  const hasBinary = existsSync(root + 'node_modules/@astrojs/language-server');
  const fail = verdict(readFileSync(root + CONFIG, 'utf8'), hasBinary);
  if (fail.length) {
    console.error(`check:lsp: ${fail.length} problem(s) in ${CONFIG}:`);
    for (const f of fail) console.error(`  - ${f}`);
    return 1;
  }
  console.log(`check:lsp: ok - astro server registered for .astro, tsdk set, format/autofix off, server present in the tree`);
  return 0;
}

// Each planting is a real mutation of the real config, and the gate must name it. A gate nobody has seen
// fail is a gate that is not measuring anything (the pattern every gate here follows: check:plan:selftest,
// check:ics:selftest, check:copy:selftest).
const PLANTINGS = [
  ['drop the astro server', (c) => { delete c.lsp.servers.astro; return c; }],
  ['wrong extensions', (c) => { c.lsp.servers.astro.extensions = ['.ts']; return c; }],
  ['wrong command', (c) => { c.lsp.servers.astro.command = ['some-other-server', '--stdio']; return c; }],
  ['no tsdk', (c) => { delete c.lsp.servers.astro.initializationOptions.typescript; return c; }],
  ['autoformat on', (c) => { c.format = { enabled: true }; return c; }],
  ['autofix on', (c) => { c.autofix = { enabled: true }; return c; }],
  ['no server in the tree', (c) => c, 'binary-missing'],
];

function runSelftest() {
  if (!existsSync(root + CONFIG)) {
    console.error(`check:lsp:selftest: ${CONFIG} missing - nothing to plant into.`);
    return 1;
  }
  const base = JSON.parse(readFileSync(root + CONFIG, 'utf8'));
  let caught = 0;
  for (const [label, mutate, flag] of PLANTINGS) {
    const cfg = mutate(JSON.parse(JSON.stringify(base)));
    const fail = verdict(JSON.stringify(cfg), flag !== 'binary-missing');
    if (fail.length) {
      caught++;
      console.log(`  caught: ${label} -> ${fail[0]}`);
    } else {
      console.error(`  NOT caught: ${label}`);
    }
  }
  const control = verdict(JSON.stringify(base), true);
  if (control.length) {
    console.error(`check:lsp:selftest: the real config fails the gate (${control.length} findings) - fix it before trusting the selftest.`);
    return 1;
  }
  if (caught !== PLANTINGS.length) {
    console.error(`check:lsp:selftest: ${caught}/${PLANTINGS.length} plantings caught - the gate is blind to ${PLANTINGS.length - caught} defect classes.`);
    return 1;
  }
  console.log(`check:lsp:selftest: ok - ${caught} plantings caught, control clean.`);
  return 0;
}

if (process.argv.includes('--selftest')) process.exit(runSelftest());
if (process.argv.includes('--show')) {
  console.log(readFileSync(root + CONFIG, 'utf8'));
  process.exit(0);
}
process.exit(runGate());
