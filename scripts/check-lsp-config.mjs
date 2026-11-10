#!/usr/bin/env node
// check:lsp - the repo's code-intelligence config is real, narrow, and points at a server that ANSWERS.
//
// Why (D266): pi-lens is the pi package that can reach `.astro` (19 files - the markup surface where the
// design handles and probe anchors live), and it can only do that through a custom LSP server entry in
// `.pi-lens.json`. Vendor guidance cannot cover Astro: pi-lens ships no Astro grammar and no Astro server in
// its built-in registry, and pi-lsp-adapter's built-in filetype map has no `.astro` entry, so an Astro
// component - which starts with `---` - is classified as YAML and handed to yamlls (measured 2026-11-10 in
// .pi/npm/node_modules/pi-lsp-adapter/src/detect/filetypes.ts and src/registry/builtin.ts).
//
// So the config is load-bearing and it can rot in five ways, each silent:
//   1. the astro server entry is deleted or renamed - no tool errors, the .astro files just stop answering;
//   2. `initializationOptions.typescript.tsdk` is dropped - the server comes up with no type service at all
//      (measured 2026-11-10, see class 5 below: `initialize` answers, `documentSymbol` is refused);
//   3. the write-side effects (autoformat, autofix) are switched on - this repo's gates compare bytes, and a
//      formatter that rewrites a file on every edit is a gate-breaking machine wearing a convenience hat;
//   4. the server binary is not in the tree (a fresh clone without the astro dependency);
//   5. the config is correct and the binary is present, but the server is not actually LIVE - it never
//      answers, or answers `initialize` and then refuses every type-backed request.
//
// Class 5 is the one a config-reading gate cannot see, and it is real. Measured 2026-11-10 (Linux, node
// 24.22.1, astro-ls 2.17.3, `.design/tmp-lsp-timing.mjs`): with the tsdk removed - or pointed at a path
// that does not exist - astro-ls still answers `initialize` in 0.4s, and then replies
// `"Unhandled method textDocument/documentSymbol"` to every request the type service backs. The config looks
// fine; the .astro files are dark. So the gate spawns the server and requires a handshake.
//
// Cost @measured 2026-11-10 by this gate, same rig: the whole handshake 3.3s of work - `initialize` 0.6s,
// the first `documentSymbol` 2.4s - the embedded TypeScript service's warm-up, which is what makes the probe
// worth its seconds. It sits in the DEPLOY wave whose max is `build` at 17.75s, so it costs work-seconds,
// not wall clock.
//
// The config verdict is a pure function so the selftest can plant each defect into a copy of the real config
// and require a named failure; the live verdict is a function of a mutated config too, so the two spawn
// plantings are proved the same way. It still needs no artifact, so it stays before `build` (D118).
//
//   node scripts/check-lsp-config.mjs            gate
//   node scripts/check-lsp-config.mjs --selftest plant each defect, require each to fail
//   node scripts/check-lsp-config.mjs --show     print the resolved config the gate is asserting

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const CONFIG = '.pi-lens.json';
// Generous on purpose: the rot class is "never answers", not "answers slowly". A contended rig (D216) must
// not fail a ship step for a warm-up that eventually completes.
const INIT_DEADLINE_MS = 10000;
const DOC_DEADLINE_MS = 15000;

/** Every .astro under a directory, longest first is irrelevant - the probe just needs one that exists.
 * Derived from the tree rather than named, so the probe does not guard a string it hard-codes (D263). */
function astroFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) astroFiles(p, out);
    else if (entry.name.endsWith('.astro')) out.push(p);
  }
  return out;
}

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
      fail.push('lsp.servers.astro.initializationOptions.typescript.tsdk is unset - astro-ls answers initialize but registers no type-backed request, so .astro hover/definition/references are dead (measured 2026-11-10)');
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

/**
 * Spawn the configured server and shake its hand: `initialize`, open a real .astro file, ask for its
 * symbols. A server that answers `initialize` but not `documentSymbol` is a server whose Astro half never
 * started, which is exactly the defect the config-only verdict is blind to.
 * Returns findings; empty means the server is live.
 */
async function liveVerdict(server) {
  const fail = [];
  if (!server?.command) return ['lsp.servers.astro.command is missing - there is nothing to spawn'];
  const command = Array.isArray(server.command) ? server.command.map(String) : [String(server.command)];
  const bin = command[0];
  // pi-lens resolves the command from the project root; do the same, so a bare relative path is not
  // mistaken for something on PATH. The probe file is the SMALLEST .astro in src/ on purpose: the cost of
  // the handshake is the embedded TypeScript service's warm-up, not the file, and a smaller file keeps the
  // gate's seconds down without changing what it proves.
  const inTree = `${root}${bin}`;
  let exe = bin;
  if (!bin.startsWith('/') && existsSync(inTree)) exe = inTree;
  const files = astroFiles(`${root}src`).sort((a, b) => statSync(a).size - statSync(b).size);
  if (!files.length) return ['no .astro file under src/ to probe - the server has nothing to parse, so the gate cannot prove it works'];
  const probeFile = files[0];
  const rel = probeFile.slice(root.length);

  const responses = new Map();
  let stderr = '';
  let spawnError = null;
  const proc = spawn(exe, command.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] });
  proc.on('error', (e) => { spawnError = e; });
  proc.stderr.on('data', (d) => { if (stderr.length < 1200) stderr += d.toString(); });

  let buf = '';
  proc.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    while (true) {
      const head = buf.indexOf('\r\n\r\n');
      if (head < 0) break;
      const len = buf.slice(0, head).match(/Content-Length: (\d+)/);
      if (!len) { buf = buf.slice(head + 4); continue; }
      const size = Number(len[1]);
      if (buf.length < head + 4 + size) break;
      try {
        const msg = JSON.parse(buf.slice(head + 4, head + 4 + size));
        if (msg.id !== undefined) responses.set(msg.id, msg);
      } catch { /* a partial frame is read on the next chunk */ }
      buf = buf.slice(head + 4 + size);
    }
  });

  const send = (msg) => {
    const payload = JSON.stringify(msg);
    proc.stdin.write(`Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`);
  };
  const awaitId = async (id, deadlineMs) => {
    const started = Date.now();
    while (Date.now() - started < deadlineMs) {
      if (spawnError) return null;
      if (responses.has(id)) return responses.get(id);
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  };

  try {
    const t0 = Date.now();
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { processId: process.pid, capabilities: {}, initializationOptions: server.initializationOptions ?? {}, rootUri: `file://${root}` } });
    const init = await awaitId(1, INIT_DEADLINE_MS);
    if (spawnError) {
      fail.push(`the configured astro server could not be spawned (${spawnError.message}) - "${command.join(' ')}" is in the config but does not run here`);
      return fail;
    }
    if (!init) {
      fail.push(`the server did not answer initialize within ${INIT_DEADLINE_MS / 1000}s${stderr ? ` - stderr: ${stderr.trim().slice(0, 300)}` : ''} - a registered server that never answers is invisible to every .astro file pi-lens opens`);
      return fail;
    }
    const caps = init.result?.capabilities ?? {};
    if (!caps.documentSymbolProvider) fail.push('initialize answered without documentSymbolProvider - the Astro/TypeScript half of the server is not registered');

    send({ jsonrpc: '2.0', method: 'initialized', params: {} });
    send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: `file://${probeFile}`, language: 'astro', text: readFileSync(probeFile, 'utf8') } } });
    send({ jsonrpc: '2.0', id: 2, method: 'textDocument/documentSymbol', params: { textDocument: { uri: `file://${probeFile}` } } });
    const symbols = await awaitId(2, DOC_DEADLINE_MS);
    if (!symbols) {
      fail.push(`initialize answered but documentSymbol did not, for ${rel}${stderr ? ` - stderr: ${stderr.trim().slice(0, 300)}` : ''} - the server is up but its type service never started`);
    } else if (symbols.error) {
      fail.push(`documentSymbol on ${rel} returned "${symbols.error.message}" - astro-ls is answering, but its TypeScript service is not registered (the usual cause is initializationOptions.typescript.tsdk pointing at a path that is not in the tree: ${JSON.stringify(server.initializationOptions?.typescript?.tsdk)})`);
    } else if (!Array.isArray(symbols.result) || !symbols.result.length) {
      fail.push(`documentSymbol on ${rel} answered with nothing - the server parsed a .astro component and found no symbols, which means it is not reading Astro markup at all`);
    } else {
      const secs = ((Date.now() - t0) / 1000).toFixed(2);
      console.log(`check:lsp: live handshake ok - ${rel} (${symbols.result.length} symbol(s)) in ${secs}s`);
    }
  } finally {
    proc.kill();
  }
  return fail;
}

async function runGate() {
  if (!existsSync(root + CONFIG)) {
    console.error(`check:lsp: ${CONFIG} missing. pi-lens has no project config, so the .astro surface is invisible to it.`);
    return 1;
  }
  const text = readFileSync(`${root}${CONFIG}`, 'utf8');
  const hasBinary = existsSync(`${root}node_modules/@astrojs/language-server`);
  const fail = verdict(text, hasBinary);
  // The live half only runs when the config is already sound, so the parse below cannot throw.
  if (!fail.length) fail.push(...await liveVerdict(JSON.parse(text).lsp.servers.astro));
  if (fail.length) {
    console.error(`check:lsp: ${fail.length} problem(s) in ${CONFIG}:`);
    for (const f of fail) console.error(`  - ${f}`);
    return 1;
  }
  console.log(`check:lsp: ok - astro server registered for .astro, tsdk set, format/autofix off, server present in the tree AND answering`);
  return 0;
}

// Each planting is a real mutation of the real config, and the gate must name it. A gate nobody has seen
// fail is a gate that is not measuring anything (the pattern every gate here follows: check:plan:selftest,
// check:ics:selftest, check:copy:selftest).
// The live plantings are proved by the spawn handshake, so the selftest has to run it - one control run
// plus one spawn per planting. A bogus tsdk path fails in ~0.5s because the server answers initialize and
// then rejects every type-backed request; a bogus command fails at spawn.
const LIVE_PLANTINGS = [
  ['command names a binary that is not there', (c) => { c.lsp.servers.astro.command = ['no-such-astro-server', '--stdio']; return c; }],
  ['tsdk points at a path that is not in the tree', (c) => { c.lsp.servers.astro.initializationOptions.typescript.tsdk = 'node_modules/typescript/lib-not-there'; return c; }],
];

const PLANTINGS = [
  ['drop the astro server', (c) => { delete c.lsp.servers.astro; return c; }],
  ['wrong extensions', (c) => { c.lsp.servers.astro.extensions = ['.ts']; return c; }],
  ['wrong command', (c) => { c.lsp.servers.astro.command = ['some-other-server', '--stdio']; return c; }],
  ['no tsdk', (c) => { delete c.lsp.servers.astro.initializationOptions.typescript; return c; }],
  ['autoformat on', (c) => { c.format = { enabled: true }; return c; }],
  ['autofix on', (c) => { c.autofix = { enabled: true }; return c; }],
  ['no server in the tree', (c) => c, 'binary-missing'],
];

async function runSelftest() {
  if (!existsSync(`${root}${CONFIG}`)) {
    console.error(`check:lsp:selftest: ${CONFIG} missing - nothing to plant into.`);
    return 1;
  }
  let base;
  try {
    base = JSON.parse(readFileSync(`${root}${CONFIG}`, 'utf8'));
  } catch (e) {
    console.error(`check:lsp:selftest: ${CONFIG} is not valid JSON (${e.message}) - nothing to plant into.`);
    return 1;
  }
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
  const controlLive = await liveVerdict(base.lsp.servers.astro);
  if (controlLive.length) {
    console.error(`check:lsp:selftest: the real config does not produce a live server (${controlLive[0]}) - fix it before trusting the selftest.`);
    return 1;
  }
  for (const [label, mutate] of LIVE_PLANTINGS) {
    const cfg = mutate(JSON.parse(JSON.stringify(base)));
    const fail = await liveVerdict(cfg.lsp.servers.astro);
    if (fail.length) {
      caught++;
      console.log(`  caught: ${label} -> ${fail[0]}`);
    } else {
      console.error(`  NOT caught: ${label}`);
    }
  }
  const total = PLANTINGS.length + LIVE_PLANTINGS.length;
  if (caught !== total) {
    console.error(`check:lsp:selftest: ${caught}/${total} plantings caught - the gate is blind to ${total - caught} defect classes.`);
    return 1;
  }
  console.log(`check:lsp:selftest: ok - ${caught} plantings caught (${PLANTINGS.length} config, ${LIVE_PLANTINGS.length} live), control clean.`);
  return 0;
}

if (process.argv.includes('--selftest')) process.exit(await runSelftest());
if (process.argv.includes('--show')) {
  console.log(readFileSync(`${root}${CONFIG}`, 'utf8'));
  process.exit(0);
}
process.exit(await runGate());
