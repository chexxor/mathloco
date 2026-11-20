// design/letter-claim-uniqueness.mjs — how much of the corpus do the dated letters uniquely carry?
//
// THE QUESTION THIS PROBE ASKS, printed in its own output so a re-run can never look like a different probe:
//   Of the claims in the dated letters under docs/ that carry a DISTINCTIVE number, how many carry one that
//   appears NOWHERE else in the tracked corpus? Those are the facts a session would lose if a letter were
//   treated as archive rather than source.
// WHAT IT DOES NOT ASK: whether a letter carries facts stated only in words (invisible to this test), or
// whether a bare "4" or a breakpoint width is distinctive (excluded). A sibling question - every claim
// carrying ANY number/id/stamp/quote, "restated" if every number or an 8-word verbatim window appears
// elsewhere - returns a different pair of numbers (1,367 claims / 71 unique, 5%) against this one's
// (637 / 67, 11%). Both were measured 2026-11-19, both put the unique share between 5% and 11%, and both
// concentrated it in the same three letters; D452's ranking rests on the agreement, not on either figure
// alone. Quote the figure WITH this file's name, or the next session has a third number and no way to tell
// which question it answered.
//
// Corpus = `git ls-files` (tracked only) minus the letters themselves. `.notes/`, `.ai-work/` and other
// gitignored trees are NOT in it, deliberately: a reach count that includes them counts echoes, not
// dependents (.notes/PITFALLS.md, "a citation count that includes the session scratch is not a citation
// count", 2026-11-19).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const LETTERS = execFileSync('git', ['ls-files', 'docs'], { encoding: 'utf8' })
  .split('\n').filter((f) => /^docs\/[^/]+\.md$/.test(f));
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n').filter((f) => f && !LETTERS.includes(f));

const EXT = /\.(m?js|ts|tsx|json|md|astro|svelte|sh|css|py|yml|txt|html)$/;
const B64 = /data:[a-z0-9.+-]+\/?[a-z0-9.+-]*;base64,[A-Za-z0-9+/=]+/gi;
const B64RUN = /"[A-Za-z0-9+/=]{80,}"|'[A-Za-z0-9+/=]{80,}'|[A-Za-z0-9+/]{200,}={0,2}/g;

const parts = [];
let bytes = 0;
for (const f of files) {
  if (!EXT.test(f)) continue;
  let t;
  try { t = readFileSync(f, 'utf8'); } catch { continue; }
  if (t.includes('\u0000')) continue;           // a binary that survives the extension filter
  bytes += t.length;
  parts.push(t.replace(B64, ' ').replace(B64RUN, ' '));   // D163: a base64 plate is not a source of numbers
}
const corpus = parts.join('\n\u0001');

// "Distinctive" = three digits or a decimal, and not a date or a breakpoint the whole repo repeats.
const STOP = new Set(['2026', '2025', '2024', '1240', '1024', '768', '640', '390', '320']);
const distinct = (n) => (/\d{3,}/.test(n) || /\d\.\d/.test(n)) && !STOP.has(n);

let tot = 0, orphan = 0;
const per = {};
const ex = [];
for (const L of LETTERS) {
  const t = readFileSync(L, 'utf8');
  for (let s of t.split(/(?<=[.!?])\s+|\n{2,}/)) {
    s = s.replace(/^[\s>*#|-]+/, '').trim();
    if (s.length < 25 || s.length > 600) continue;
    const ns = [...s.matchAll(/\d[\d,.]*/g)].map((m) => m[0].replace(/[.,]$/, '')).filter(distinct);
    if (!ns.length) continue;
    tot++;
    const missing = ns.filter((n) => !corpus.includes(n));
    if (missing.length) {
      orphan++;
      const k = L.replace('docs/', '');
      per[k] = (per[k] || 0) + 1;
      if (ex.length < 8) ex.push([k, missing.join(','), s.slice(0, 110)]);
    }
  }
}

console.log('# question: of the letter claims carrying a DISTINCTIVE number, how many carry one found NOWHERE else in tracked files?');
console.log(`# corpus: ${parts.length} tracked files (the ${LETTERS.length} dated docs/ letters excluded), ${(bytes / 1048576).toFixed(2)} MB, base64 runs and NUL binaries stripped`);
console.log(`claims carrying at least one DISTINCTIVE number: ${tot}`);
console.log(`of those, carrying a number that appears NOWHERE else in tracked files: ${orphan}  (${Math.round((100 * orphan) / tot)}%)`);
console.log('\nper letter:');
for (const [k, v] of Object.entries(per).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log('\nexamples (letter | orphan number | the sentence):');
for (const [f, n, s] of ex) console.log(`  ${f} | ${n} | ${s}`);
console.log('\nLIMIT: a bare "4" or a breakpoint width is not distinctive and is excluded; a fact stated only in');
console.log('words (no number) is invisible to this test, so this measures numeric claims, not all claims.');
