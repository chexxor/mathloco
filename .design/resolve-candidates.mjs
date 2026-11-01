// resolve-candidates.mjs — does a class name actually produce CSS in THIS project's design system?
//
// Why: design-apply writes classes the token block only just made legal (`inset-shadow-rule`,
// `bg-ink-hover`, `outline-band-text`, `text-micro`). `check:classes` proves the reverse direction
// (every class written in src/ resolves) but it runs on the tree, not on a plan. This is the same
// oracle Tailwind itself uses (@tailwindcss/node, same @theme file), pointed at a list of names we
// intend to write, so a typo or a v4 namespace that does not exist is caught before it goes into a
// component — which is exactly how `focus:shadow-outline-blue` survived for years (see
// scripts/check-classes.ts header).
//
// Usage: node .design/resolve-candidates.mjs 'bg-ink' 'hover:bg-ink-hover' ...
//        node .design/resolve-candidates.mjs --list .design/apply-targets.txt
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { __unstable__loadDesignSystem } from '@tailwindcss/node';

const argv = process.argv.slice(2);
let cands = [];
if (argv[0] === '--list') {
  cands = readFileSync(argv[1], 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
} else cands = argv;

// Same call shape as scripts/check-classes.ts:197 — the CSS text plus a base, not a path.
const ds = await __unstable__loadDesignSystem(readFileSync(join('src/styles/global.css'), 'utf8'), {
  base: process.cwd(),
});
let bad = 0;
for (const c of cands) {
  const css = ds.candidatesToCss([c]);
  // The resolver answers `null` for a candidate it cannot build (that is what check-classes tests).
  const resolved = Array.isArray(css) && css[0] !== null && String(css[0]).trim().length > 0;
  if (!resolved) bad++;
  console.log(`${resolved ? 'ok   ' : 'DEAD '} ${c}${resolved ? '' : '  <- resolves to nothing'}`);
}
console.log(`\n${cands.length - bad} resolve, ${bad} dead`);
process.exit(bad ? 1 : 0);
