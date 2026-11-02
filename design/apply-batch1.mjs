// apply-batch1.mjs — batch 1 of design-apply: delete the writes that paint nothing.
//
// Why a script instead of hand edits: batch 1 is 40+ mechanical deletions in 8 files, and the
// failure mode of hand-editing a 400-character class attribute is a typo in the part you did NOT
// mean to change. This script only ever REMOVES tokens; it never rewrites or reorders the rest.
//
// What is deleted, and why each is dead:
//   (hover:)?shadow-(sm|md|lg)  - measured 1.25 at the contact edge, under the 1.35 layer bar, so it
//                                 is decoration (D105). Only shadow-e1/e2 exist, and nothing floats.
//   border-transparent          - with it, `border` paints nothing on the CTAs: transparent border,
//                                 no border colour. 8 shipped CTAs carry the Tailwind-2 boilerplate.
//   border (only in that pair)  - the same boilerplate's other half. A REAL keyline (`border
//                                 border-gray-300` on the 404 secondary, the DiscordSummary card
//                                 edges) is left here for batch 3, where the keyline grammar decides
//                                 its role; deleting it now would silently remove a boundary.
//   duration-300 / ease-in-out  - every one of them animates colour or box-shadow, and @theme now
//                                 sets the default to 150ms + linear (D-round5). Writing the retired
//                                 values back over the default is what keeps them alive.
//   transition (nothing left)   - a `transition` with no hover/focus variant left in the same
//                                 attribute animates nothing. That is the six WhyJoinUs cards: they
//                                 are not links, and their only hover was the shadow above.
//   leading-6 / leading-4 (inert) - leading-6 (24px) equals what text-base already carries, and the
//                                 footer's leading-4 sits on a wrapper whose only text is a text-xl
//                                 paragraph carrying its own line-height.
// The other 7 leading writes are NOT touched here: they sit next to a size write, and the size token
// that replaces that write carries the same line-height, so they go away IN batch 2 with the rename.
//
// Run: node design/apply-batch1.mjs [--dry]     (prints a per-token report either way)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry');
const DORMANT = [
  'src/components/UpcomingMeetups.astro', // invented placeholder copy, showUpcomingEvents: false
  'src/components/PastEvents.astro',       // stub: an <h2> and a comment
  'src/components/icons/Instagram.astro',  // unreferenced: no import anywhere in src/
  'src/components/icons/Linkedin.astro',
  'src/components/icons/Medium.astro',
  'src/components/icons/Twitter.astro',
];

const files = [];
const walk = (d) => readdirSync(d).forEach((e) => {
  const p = join(d, e);
  if (statSync(p).isDirectory()) walk(p);
  else if (/\.(astro|svelte)$/.test(e)) files.push(p);
});
walk('src');
const norm = (f) => f.split('\\').join('/').replace(/^\.\//, '');
const live = files.filter((f) => !DORMANT.includes(norm(f)));

const DEAD = /^(hover:|focus:|focus-visible:)?(shadow-(sm|md|lg|xl)|duration-300|ease-in-out|border-transparent)$/;
const counts = new Map();
for (const f of live) {
  const src = readFileSync(f, 'utf8');
  // Only class attribute literals are touched: the same token in prose or a <style> block is not a
  // class write and this script has no business rewriting those.
  const out = src.replace(/(class(?::list)?=)(?:"([^"]*)"|'([^']*)')/g, (m0, attr, dq, sq) => {
    const quote = dq === undefined ? "'" : '"';
    const body = dq ?? sq;
    const toks = body.split(/(\s+)/);
    const has = (t) => toks.includes(t);
    const borderBoilerplate = has('border-transparent');
    let kept = toks.filter((t) => {
      if (/^\s+$/.test(t) || t === '') return true;
      if (DEAD.test(t)) return false;
      if (t === 'border' && borderBoilerplate) return false;
      return true;
    });
    const stillInteractive = kept.some((t) => /^\w*:(hover|focus|focus-visible):|^hover:|^focus/.test(t));
    if (!stillInteractive) kept = kept.filter((t) => t !== 'transition' && t !== 'duration-300' && t !== 'ease-in-out');
    // leading-6 next to text-base is the same 24px twice; leading-4 on a wrapper whose only text is
    // a text-xl paragraph changes nothing. Everything else keeps its leading until the rename.
    if (kept.includes('text-base')) kept = kept.filter((t) => t !== 'leading-6');
    if (kept.includes('text-gray-50')) kept = kept.filter((t) => t !== 'leading-4');
    for (const t of toks) if (!/^\s+$/.test(t) && !kept.includes(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
    const joined = kept.join('').replace(/\s+/g, ' ').trim();
    return `${attr}${quote}${joined}${quote}`;
  });
  if (out !== src) {
    if (!DRY) writeFileSync(f, out);
    console.log(`${DRY ? 'would edit' : 'edited'} ${f}`);
  }
}
console.log('\nremoved tokens:');
for (const [t, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${t}`);
console.log(`total removed: ${[...counts.values()].reduce((s, n) => s + n, 0)} across ${live.length} live files`);
