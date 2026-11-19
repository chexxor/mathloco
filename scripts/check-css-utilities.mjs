#!/usr/bin/env node
/**
 * check:css-utilities — how much of the shipped stylesheet is CSS nobody asked for?
 *
 * Why this exists (D253, 2026-11-08). Tailwind v4's automatic content detection scans every
 * file it can see, not just markup. Round 17's option module contains the string "sticky top-0",
 * so `.sticky{position:sticky}` and `.top-0{top:0}` are in the CSS the site ships, and a
 * throwaway file containing only the token `mt-41` put `.mt-41{margin-top:calc(var(--spacing) * 41)}`
 * into the production bundle. Measured on this rig (Linux, native): with `design/`, `.notes/`,
 * `.agents/` and MILESTONES.md in the scan the stylesheet is 51,070 bytes / 285 utilities; with
 * those four out it is 38,605 bytes / 182 utilities. Some of what Tailwind emits is therefore
 * CSS that exists because a *sentence* names a class.
 *
 * This is a budget report, not a correctness gate: dead utilities do not break a page, and prose
 * legitimately mentions class names. It reports the count and bytes, compares against a saved
 * baseline, and names what appeared or disappeared since the baseline, so a design round that
 * invents class names is visible the day it is written. It never fails on its own; the number
 * moving is the signal a human reads.
 *
 * Baseline: design/css-utility-baseline.json (save with --save). Exemptions:
 * design/css-utility-exemptions.json - `exempt` names and a `reasons` map beside them. The one rule that
 * exits 1 is inside this report: an exempt name with no reason is a waiver nobody can re-read, which is
 * the same class of defect as a deferral with no trigger (D148). Everything else stays a report, so the
 * number moving is still the signal a human reads.
 * Requires a built dist/. Usage: node scripts/check-css-utilities.mjs [--save]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASELINE = 'design/css-utility-baseline.json';
const EXEMPT_FILE = 'design/css-utility-exemptions.json';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const cssFiles = readdirSync('dist/client/_astro').filter((f) => f.endsWith('.css') && !f.endsWith('.rel.css'));
if (!cssFiles.length) {
  console.error('check:css-utilities: no CSS in dist/client/_astro — run npm run build first');
  process.exit(1);
}
const css = cssFiles.map((f) => readFileSync(join('dist/client/_astro', f), 'utf8')).join('\n');

// Rules, with their selector lists. Tailwind groups selectors (`.shadow-e1,.shadow-e1\/e2{...}`),
// so a rule's bytes are counted once even when several names in it are dead.
const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
  .map((m) => ({ selectors: m[1].split(',').map((s) => s.trim()), bytes: m[0].length }));

const srcText = walk('src').map((f) => readFileSync(f, 'utf8')).join('\n');
const exemptDoc = existsSync(EXEMPT_FILE) ? JSON.parse(readFileSync(EXEMPT_FILE, 'utf8')) : {};
const exempt = new Set(exemptDoc.exempt || []);
const reasons = exemptDoc.reasons || {};
/** An exemption is only worth its reason. A name in `exempt` with no reason reads as "allowed", which is a
 *  waiver a future session cannot re-read - the reason lives in the same file so the exemption cannot travel
 *  without it. This is the gate's only hard failure, and it is planted by hand at the tip (see DECISIONS). */
const unreasoned = [...exempt].filter((n) => !String(reasons[n] ?? '').trim());

// A class is "written" if the token appears anywhere in src/ — in markup, in a component string,
// or in global.css where a custom utility is defined.
const deadNames = new Map();   // utility name -> first rule that emits it
const deadRuleIdx = new Set();
/** The names an `exempt` line is holding off the count: the same test, without the exemption. Without this
 *  set every exempt name reads as "no longer dead", which is the opposite of what it means - the exempt name
 *  never reaches deadNames at all, so the pair of sets is what says whether an exemption still explains a rule. */
const wouldBeDead = new Set();
for (const [i, r] of rules.entries()) {
  const names = r.selectors.flatMap((s) => (s.match(/\.([a-zA-Z0-9_][a-zA-Z0-9_:-]*)/g) || []).map((n) => n.slice(1).replace(/\\/g, '')));
  const bad = [];
  for (const name of names) {
    const base = name.includes(':') ? name.split(':').pop() : name;   // xl:mt-23 -> mt-23
    if (exempt.has(base) || exempt.has(name)) {
      if (!srcText.includes(base)) wouldBeDead.add(base);
      continue;
    }
    if (srcText.includes(base)) continue;
    bad.push(base);
  }
  if (!bad.length) continue;
  deadRuleIdx.add(i);
  for (const b of bad) if (!deadNames.has(b)) deadNames.set(b, r.selectors.join(', '));
}

const count = deadNames.size;
const bytes = [...deadRuleIdx].reduce((n, i) => n + rules[i].bytes, 0);

if (process.argv.includes('--save')) {
  writeFileSync(BASELINE, JSON.stringify({
    saved: new Date().toISOString().slice(0, 10),
    utilities: count,
    bytes,
    totalCssBytes: css.length,
    names: [...deadNames.keys()].sort(),
  }, null, 2) + '\n');
  console.log(`check:css-utilities: baseline saved - ${count} utilities, ${bytes} bytes.`);
  process.exit(0);
}

console.log(`check:css-utilities: ${css.length} bytes of shipped CSS; ${count} utilities written nowhere in src/ (${bytes} bytes, ${((bytes / css.length) * 100).toFixed(0)}%).`);
console.log(`  exemptions: ${exempt.size} names in design/css-utility-exemptions.json, ${exempt.size - unreasoned.length} of them with a reason; ${exempt.size} hidden + ${count} counted = ${count + exempt.size} the sheet would report unexempted (a name whose rule the exemption still explains). Exempting hides a name from this count - it does not remove the bytes, and this sheet is ${css.length} b because tailwindcss@4.3.3's plugin surface declares only optimize/minify (D253's scan, nothing to scope out).`);
console.log('  D253: Tailwind v4 scans the whole repo, so a class name in prose is emitted. Report, not a gate - except for an exemption with no reason.');

/** An exempt name that stops explaining a rule: it is written in src/, or the sheet no longer carries it, so
 *  the reason line is stale rather than load-bearing. A note, not a finding - nothing ships wrongly. */
const staleExempt = [...exempt].filter((n) => !wouldBeDead.has(n) && !wouldBeDead.has(n.includes(':') ? n.split(':').pop() : n));
if (staleExempt.length) console.log(`  exempt but no longer dead since (written in src/, or the rule stopped shipping): ${staleExempt.join(', ')}`);

if (!existsSync(BASELINE)) {
  console.log('  no baseline yet - run: node scripts/check-css-utilities.mjs --save');
} else {
  const b = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const added = [...deadNames.keys()].filter((n) => !b.names.includes(n));
  const gone = (b.names || []).filter((n) => !deadNames.has(n));
  console.log(`  baseline ${b.utilities} utilities / ${b.bytes} b (${b.saved}): ${count - b.utilities >= 0 ? '+' : ''}${count - b.utilities}, ${bytes - b.bytes >= 0 ? '+' : ''}${bytes - b.bytes} bytes`);
  if (added.length) console.log(`  new since baseline: ${added.join(', ')}`);
  if (gone.length) console.log(`  gone since baseline: ${gone.join(', ')}`);
}

if (unreasoned.length) {
  console.log(`\n${unreasoned.length} exempt name(s) with no reason - the exemption is a waiver no reader can re-read:`);
  for (const n of unreasoned) console.log(`  FAIL  exemption-without-reason  ${n} is in design/css-utility-exemptions.json's exempt list and has no entry in its reasons map. Say which tracked file names the class and why the bytes stay, or delete the name from exempt.`);
  process.exit(1);
}
