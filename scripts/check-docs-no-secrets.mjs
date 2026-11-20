#!/usr/bin/env node
// check:docs-no-secrets - a tracked page under docs/ may NAME a secret and say where it lives; it may never
// carry one.
//
// Why (D459): MS40 P2 moved 267,130 b of operating knowledge out of the gitignored `.notes/runbooks/` home into
// tracked `docs/howto/` (**S083**, **D456**), which put that text into git history, into every clone, and in
// front of the Worker build. The pre-flight shape scan over the source home found **2** assignment-shaped lines
// in 17 files and **0** live-looking secrets @measured 2026-11-19 (`.design/tmp-ms40-p2-preflight.mjs`), and both
// were rewritten to name the secret and point at where it lives. Without this gate the correction lasts until the
// next runbook is written by hand from a shell history, which is exactly how the two lines got there.
//
// The test is the SHAPE, not the word. Keyword density is useless here: five of the runbooks are prose *about*
// tokens and mention them 24-48 times @measured 2026-11-19, so a word-count rule would have been switched off in
// a day. What is dangerous is a name followed by `:` or `=` and a value - the thing you paste. A value in a code
// span still counts: the fence hides it from a reader, not from a scrape.
//
// Deliberately NOT policed, because the tree is full of them and none is a secret: a bare name with no `:`/`=`
// (`CF_API_TOKEN`, `wrangler secret put NTFY_TOKEN`), an empty assignment (`NTFY_TOKEN=`), a placeholder in angle
// brackets, and the identifiers this repo already publishes on purpose - the Cloudflare account id, the KV
// namespace id, the Discord guild snowflake, LAN addresses and `sha256` fingerprints. Masking those in one home
// and not the other is theatre (**D456**); the operator's ruling on the account id is still open.
//
//   node scripts/check-docs-no-secrets.mjs            the gate
//   node scripts/check-docs-no-secrets.mjs --selftest plant each defect, require each to fail
//   node scripts/check-docs-no-secrets.mjs --show     the file list and the pattern, as the gate reads them

const SHAPE = /(cf_|api[_-]?token|api[_-]?key|_token|_secret|password|passwd|secret|token)[\s*]*[:=][\s*]*([^\s`|<][^\s`|]{7,})/i;

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function listDocs() {
  try {
    return execSync('git ls-files docs', { cwd: root.slice(0, -1) }).toString().split('\n').filter((f) => f.endsWith('.md'));
  } catch {
    return execSync('find docs -name "*.md"', { cwd: root.slice(0, -1) }).toString().split('\n').filter(Boolean);
  }
}

// A pure verdict, so the selftest can plant a credential without writing one to disk.
function verdict(files) {
  const fail = [];
  for (const f of files) {
    const lines = f.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = SHAPE.exec(lines[i]);
      if (!m) continue;
      const value = m[2];
      // Name the crime and the fix; echo the key, not the whole value - a log that reprints a secret has made
      // a second copy of the thing the gate exists to stop.
      fail.push(`${f.name}:${i + 1} carries an assignment-shaped credential: \`${m[1].trim()}\` followed by a ${value.length}-character value (\`${value.slice(0, 4)}…\`) - rewrite it to name the secret and say where it lives (a wrangler secret, the n8n host, the host-local \`.notes/\` home), never the value`);
    }
  }
  return fail;
}

function runGate() {
  const names = listDocs();
  if (!names.length) {
    console.error('check:docs-no-secrets: no tracked .md under docs/ - that is a blind run, not a clean one');
    return 1;
  }
  const files = names.map((n) => ({ name: n, text: readFileSync(root + n, 'utf8') }));
  const fail = verdict(files);
  if (fail.length) {
    console.error(`check:docs-no-secrets: ${fail.length} problem(s) in ${files.length} tracked docs`);
    for (const f of fail) console.error('  - ' + f);
    return 1;
  }
  console.log(`check:docs-no-secrets: ok - ${files.length} tracked docs, 0 assignment-shaped credentials`);
  return 0;
}

// Each planting must FAIL; each clean form must pass. The plantings are the two shapes the source home actually
// carried, widened to the lowercase prose form the pattern now also catches.
const PLANTINGS = [
  ['uppercase assignment (the shape deploy-and-secrets.md carried)', 'Set `CF_API_TOKEN=abc123DEF456ghi789` then run wrangler', 1],
  ['lowercase prose assignment (the shape the widened pattern adds)', 'the secret: hunter2hunter2 for the mail host', 1],
  ['value inside a code fence (a fence hides it from a reader, not from a scrape)', '```\nNTFY_TOKEN = push-me-somewhere\n```', 1],
];
const CLEAN = [
  ['a name with no assignment', 'Put it with `wrangler secret put NTFY_TOKEN`; the value lives in the operator\u2019s vault, never in this file.'],
  ['an empty assignment (how a runbook says "unset")', '`NTFY_TOKEN=` clears it; that is the point of the reset step.'],
  ['a placeholder in angle brackets', '`API_TOKEN=<from the vault>` is an instruction, not a value.'],
  ['a colon naming where a secret lives', 'The secret: `wrangler secret list` on the Worker, and `.notes/n8n-public-api-token` on this host.'],
];

function runSelftest() {
  let bad = 0;
  for (const [label, text, want] of PLANTINGS) {
    const fail = verdict([{ name: 'selftest/planted.md', text }]);
    if (fail.length === want) console.log(`  caught: ${label} -> ${fail[0]}`);
    else { console.error(`  NOT caught: ${label}`); bad++; }
  }
  for (const [label, text] of CLEAN) {
    const fail = verdict([{ name: 'selftest/clean.md', text }]);
    if (fail.length) { console.error(`  false positive: ${label} -> ${fail[0]}`); bad++; }
    else console.log(`  clean form passes: ${label}`);
  }
  // The real corpus is the control that the gate is not merely always red.
  const names = listDocs();
  const files = names.map((n) => ({ name: n, text: readFileSync(root + n, 'utf8') }));
  const real = verdict(files);
  if (real.length) {
    console.error(`  control fails: the tracked corpus already carries ${real.length} shape hit(s) - fix the corpus, then the selftest means something:`);
    for (const f of real) console.error('    - ' + f);
    bad++;
  } else {
    console.log(`  control clean: ${files.length} tracked docs carry no assignment-shaped credential`);
  }
  if (bad) {
    console.error(`check:docs-no-secrets:selftest: FAIL - ${bad} of ${PLANTINGS.length + CLEAN.length + 1} cases wrong`);
    return 1;
  }
  console.log(`check:docs-no-secrets:selftest: PASS - ${PLANTINGS.length} plantings caught, ${CLEAN.length} clean forms pass, control clean`);
  return 0;
}

if (process.argv.includes('--selftest')) process.exit(runSelftest());
if (process.argv.includes('--show')) {
  console.log(`pattern: ${SHAPE}`);
  console.log(listDocs().join('\n'));
  process.exit(0);
}
process.exit(runGate());
