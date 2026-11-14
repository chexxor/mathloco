#!/usr/bin/env node
// check:svelte — the `.svelte` type surface is checked by a checker that can actually see it.
//
// Why this gate exists (ruling S025, decision D288, 2026-11-12). `npm run check` (`astro check`) is the only
// lint in `verify`, in CI and in the deploy hook. @measured 2026-11-12 on the `staging` tip (Linux native,
// Node 24.22.1, astro 7.4.4): it reports **217 files, 0 errors, 0 warnings** while
// `src/components/DiscordSummary.svelte:51:15` carries a TypeScript error the LSP reports —
// `ts(18047) 'data' is possibly 'null'` — and svelte-check reproduces at exactly that line. To prove the
// blindness rather than infer it, a deliberately broken `.svelte` file was copied into `src/components/` and
// `astro check` still reported 217 files and 0 errors (the probe file was deleted; the tree is clean). So
// every `.svelte` island can ship a null dereference through three green gates. `svelte-check` (4.7.8, the
// checker the Svelte language server uses) is the tool that sees them, and it is now in `verify`.
//
// Cost @measured 2026-11-12 by this gate on the same rig: 6.0s of work for the whole-tree run
// (`npx svelte-check --output machine --no-color --tsconfig tsconfig.json`, 1692 files walked, 1 error),
// against `check` (`astro check`) at 11.87s in the same wave. It reads source only, so it runs before
// `build` (D118).
//
// Anatomy (add-a-gate): `verdict()` is pure over the machine-format output, so the selftest can test the
// parser and the exit rule without touching disk; the plantings are real `.svelte`/`.ts` files in a
// gitignored fixture tree, checked in ONE svelte-check run rather than one run per planting (3.0s for the
// whole set @measured 2026-11-12), plus a clean control component that must stay green.
//
//   node scripts/check-svelte.mjs            the gate
//   node scripts/check-svelte.mjs --selftest plant every defect class, require each to be named
//   node scripts/check-svelte.mjs --show     the raw machine output, no verdict

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const CHECKER = 'node_modules/svelte-check/dist/src/index.js';
const FIXTURE = '.design/tmp-svelte-selftest';

// A ceiling, not a budget. `svelte-check` walks ~1,725 files: @measured 2026-11-12 on an idle rig that is 6.0s
// of work; at load 117/16cpu the same run passes 90s, and the old 90,000ms cap killed it. `spawnSync` kills
// with `status: null` and whatever it had written so far, which reached this gate as an empty log and the
// verdict "output format changed" - a false FAIL and a lie about its cause @measured 2026-11-14 by the
// `verify` run whose check:svelte step logged `exit=1 secs=94.29` and no output. So the cap is wide enough for
// a contended rig, and hitting it is now its own named failure instead of a parser accusation.
const TIMEOUT_MS = 300_000;

/** svelte-check's machine format is `<ts> LEVEL "file" line:col "message"`, plus START and COMPLETED lines. */
function verdict(text) {
  const findings = [];
  let files = null, errors = 0, warnings = 0;
  for (const line of text.split('\n')) {
    const m = /^\d+\s+(ERROR|WARNING)\s+"([^"]+)"\s+(\d+):(\d+)\s+"(.*)"$/.exec(line.trim());
    if (m) findings.push({ kind: m[1], file: m[2], line: Number(m[3]), col: Number(m[4]), message: m[5] });
    const c = /^\d+\s+COMPLETED\s+(\d+)\s+FILES\s+(\d+)\s+ERRORS\s+(\d+)\s+WARNINGS\s+(\d+)/.exec(line.trim());
    if (c) { files = Number(c[1]); errors = Number(c[2]); warnings = Number(c[3]); }
  }
  return { findings, files, errors, warnings };
}

// A finding is only useful if it names what to do about it. These are the classes this repo has actually
// met, each with the fix that was written for it.
const HINTS = [
  [/possibly 'null'|possibly 'undefined'/, "narrow before use: assign the response to a typed local and shape-check it (`if (!Array.isArray(payload.channels)) throw ...`) instead of dereferencing nullable state"],
  [/does not exist on type 'Promise/, 'await the call before reading its result'],
  [/Cannot find name/, 'the identifier is neither declared nor imported in this module'],
  [/is not assignable to type/, 'the declared type and the value disagree'],
  [/Unused CSS selector/, 'the selector paints nothing in this component - delete it or paint it'],
  [/Cannot find module/, 'the import path does not resolve'],
];
const hintFor = (message) => (HINTS.find(([re]) => re.test(message)) ?? [null, 'fix the type at the reported line'])[1];

function runCheck(workspace, tsconfig) {
  if (!existsSync(root + CHECKER)) {
    return { code: 127, out: 'svelte-check is not installed - `npm install -D svelte-check` (D288); the gate cannot run without it.' };
  }
  const args = [root + CHECKER, '--output', 'machine', '--no-color', '--tsconfig', tsconfig];
  if (workspace) args.push('--workspace', workspace);
  const r = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: TIMEOUT_MS });
  return {
    code: r.status ?? 1,
    out: (r.stdout ?? '') + (r.stderr ?? ''),
    // Two different accidents: our ceiling killed it, or the kernel did. Naming the wrong one sends the next
    // session after a format change that never happened.
    timedOut: r.error?.code === 'ETIMEDOUT',
    signal: r.status === null ? (r.signal ?? null) : null,
  };
}

function runGate() {
  const { code, out, timedOut, signal } = runCheck(null, 'tsconfig.json');
  const v = verdict(out);
  if (code === 127) { console.error(out); return 1; }
  // A timeout is not a finding, and saying so is the difference between a session that re-runs and one that
  // spends an hour hunting a format change that never happened.
  if (timedOut || signal) {
    console.error(
      timedOut
        ? `check:svelte: svelte-check did not finish inside ${TIMEOUT_MS / 1000}s - the rig was contended, not the code.`
        : `check:svelte: svelte-check was killed by ${signal} before it reported - the rig ran out of memory or was signalled, not the code.`,
    );
    console.error('  The whole-tree run is 6.0s on an idle box @measured 2026-11-12; check `uptime` and re-run,');
    console.error('  or raise TIMEOUT_MS in this file with a measurement that justifies the new number.');
    return 1;
  }
  // A non-zero exit with nothing parsed is the parser being blind, not the code being clean.
  if (code !== 0 && v.findings.length === 0) {
    console.error(`check:svelte: svelte-check exited ${code} but no finding was parsed - output format changed:`);
    console.error(out.slice(0, 800));
    return 1;
  }
  if (v.findings.length === 0) {
    console.log(`ok - ${v.files} files type-checked, 0 errors, 0 warnings across src/, scripts/, design/, integrations/ and every .svelte island (astro check cannot read those; see D288)`);
    return 0;
  }
  console.error(`check:svelte: ${v.errors} error(s), ${v.warnings} warning(s) in ${v.files} files`);
  for (const f of v.findings) {
    console.error(`  ${f.kind === 'ERROR' ? 'FAIL' : 'WARN'} ${f.file}:${f.line}:${f.col} - ${f.message}`);
    console.error(`       fix: ${hintFor(f.message)}`);
  }
  return 1;
}

// Each planting is written into a fixture tree and checked in ONE run. The names are the assertion: the
// gate must report a finding whose file is the planted file.
const PLANTINGS = [
  ['P01_nullable_payload.svelte', 'nullable state dereferenced after an untyped json()', `
<script lang="ts">
  type Payload = { channels: string[] };
  let data = $state.raw<Payload | null>(null);
  async function load() {
    const res = await fetch('/api/discord-summary');
    if (!res.ok) throw new Error('status ' + res.status);
    data = await res.json();
    // P01: the exact class that shipped - a nullable payload dereferenced after an untyped json()
    return data.channels.length;
  }
  void load();
</script>
<div>{''}</div>
`],
  ['P02_missing_await.svelte', 'Promise read without await', `
<script lang="ts">
  async function go() {
    const r = fetch('/api/x');
    // P02: a Promise read as if it were the response
    return r.ok;
  }
  void go();
</script>
<div>{''}</div>
`],
  ['P03_unknown_name.svelte', 'identifier that does not exist', `
<script lang="ts">
  // P03: an identifier that exists nowhere in this module
  const value = notDefinedHere();
</script>
<div>{value}</div>
`],
  ['P04_bad_assignment.svelte', 'value contradicting its declared type', `
<script lang="ts">
  // P04: a string assigned to a declared number
  let count: number = 'three';
  let total = $state(0);
  total = count;
</script>
<div>{total}</div>
`],
  ['P05_missing_module.svelte', 'import that resolves to nothing', `
<script lang="ts">
  // P05: an import that resolves to nothing
  import { thing } from './nowhere';
  const t = thing();
</script>
<div>{t}</div>
`],
  ['P06_unused_selector.svelte', 'svelte compiler warning (not a type error)', `
<style>
  /* P06: a compiler warning, not a type error - warnings count too, and this repo's state is zero */
  .never-painted { color: #333; }
</style>
<div>{''}</div>
`],
  ['P07_ts_file_error.ts', 'type error in a plain .ts file', `
// P07: the same gate sees a plain .ts file in the same run
export function row(id: number): string {
  return id;
}
`],
];

// The control is the shape the fixed DiscordSummary now uses: a typed local, a shape check, a nullable
// state that is only dereferenced through `?.`. If the gate flags this, it is flagging correct code.
const CONTROL = ['C00_control.svelte', 'control: the shape the fixed component uses', `
<script lang="ts">
  import type { CachedData } from '../types/discord';
  let { label = '' } = $props();
  let data = $state.raw<CachedData | null>(null);
  const names = $derived((data?.messages ?? []).map((m) => m.channelId));
  async function load() {
    const res = await fetch('/api/discord-summary');
    if (!res.ok) throw new Error('status ' + res.status);
    const payload: CachedData = await res.json();
    if (!Array.isArray(payload.channels) || !Array.isArray(payload.messages)) {
      throw new Error('payload has no channels/messages array');
    }
    data = payload;
  }
  void load();
</script>
<div class="card">{label} {names.length}</div>
`];

async function runSelftest() {
  // 1. the parser and the exit rule, in memory
  const clean = verdict('1 START "/x"\n1 COMPLETED 100 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS\n');
  if (clean.findings.length) { console.error('selftest: a clean machine output parsed as findings - the parser is wrong.'); return 1; }
  const warned = verdict('1 WARNING "a.svelte" 2:1 "Unused CSS selector"\n1 COMPLETED 1 FILES 0 ERRORS 1 WARNINGS 1 FILES_WITH_PROBLEMS\n');
  if (warned.findings.length !== 1 || warned.findings[0].kind !== 'WARNING') {
    console.error('selftest: a warning did not become a finding, so a warning could pass silently.'); return 1;
  }
  if (!hintFor("'data' is possibly 'null'").includes('narrow')) {
    console.error('selftest: the null-narrowing hint is gone, so findings arrive without a fix.'); return 1;
  }

  // 2. the real plantings, one run
  rmSync(root + FIXTURE, { recursive: true, force: true });
  mkdirSync(root + FIXTURE + '/src/components', { recursive: true });
  mkdirSync(root + FIXTURE + '/src/types', { recursive: true });
  writeFileSync(root + FIXTURE + '/tsconfig.json', JSON.stringify({
    extends: 'astro/tsconfigs/strict',
    compilerOptions: { types: ['astro/client'] },
  }));
  // the control imports the real type, so the fixture needs the real shape
  writeFileSync(root + FIXTURE + '/src/types/discord.ts',
    `export interface CachedData { channels: { id: string; name: string }[]; messages: { channelId: string }[]; lastUpdated: Date; }\n`);
  for (const [name, , body] of [...PLANTINGS, CONTROL]) writeFileSync(root + FIXTURE + '/src/components/' + name, body);

  const { code, out } = runCheck(root + FIXTURE, 'tsconfig.json');
  const v = verdict(out);
  if (code === 127) { console.error(out); return 1; }

  const planted = PLANTINGS.map(([n]) => n);
  const caught = planted.filter((n) => v.findings.some((f) => f.file.endsWith('components/' + n)));
  const missed = planted.filter((n) => !caught.includes(n));
  const controlHit = v.findings.filter((f) => f.file.endsWith('components/C00_control.svelte'));
  const extras = v.findings.filter((f) => !planted.some((n) => f.file.endsWith(n)) && !f.file.endsWith('C00_control.svelte'));

  for (const m of missed) console.error(`  NOT caught: ${m}`);
  for (const f of controlHit) console.error(`  control flagged: ${f.file}:${f.line}:${f.col} - ${f.message} (the gate is flagging correct code)`);
  for (const f of extras) console.error(`  unexpected finding from the fixture: ${f.file}:${f.line}:${f.col} - ${f.message}`);

  if (missed.length || controlHit.length || extras.length || v.files === null) {
    console.error(`check:svelte:selftest: ${caught.length}/${PLANTINGS.length} plantings caught - the gate is blind to ${missed.length} defect class(es).`);
    return 1;
  }
  const classes = PLANTINGS.filter(([n]) => caught.includes(n)).map(([, label]) => label);
  console.log(`check:svelte:selftest: ok - ${caught.length} plantings caught (${classes.join('; ')}) + 1 clean control, in ${v.files} files (exit ${code}).`);
  return 0;
}

if (process.argv.includes('--selftest')) process.exit(await runSelftest());
if (process.argv.includes('--show')) {
  const r = runCheck(null, 'tsconfig.json');
  console.log(r.out);
  process.exit(0);
}
process.exit(runGate());
