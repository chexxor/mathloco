#!/usr/bin/env node
// list-writes.mjs — every live type / spacing / shape class write in src/, counted.
//
// design-apply work starts here, not from memory: it prints the writes that a token batch would touch,
// most frequent first, so a batch is chosen by coverage ("these 6 classes are 71% of the writes") rather
// than by what the last session happened to notice. Pair it with `node design/gen-token-map.mjs` (which
// maps each write to a token and exits 1 if any has no mapping).
//
//   node design/list-writes.mjs
//
// Deliberate exclusions (DORMANT below): components no page renders — UpcomingMeetups.astro and
// PastEvents.astro are imported by index.astro but switched off by `sections` in src/config.json, and
// the four never-imported files under src/components/icons/. DESIGN.md warns about the same trap.
// Counts are author syntax, not painted pixels: for what a page actually paints, use `npm run check:render`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
const walk = (d) => readdirSync(d).forEach((e) => {
  const p = join(d, e);
  if (statSync(p).isDirectory()) walk(p); else if (/\.(astro|svelte)$/.test(e)) files.push(p);
});
walk('src');
const DORMANT = ['UpcomingMeetups.astro', 'PastEvents.astro', '/icons/'];
const dormant = files.filter((f) => DORMANT.some((d) => f.endsWith(d) || f.includes(d)));
const live = files.filter((f) => !dormant.includes(f));
const RE = /^(?:(?:sm|md|lg|xl|hover|focus|focus-visible|group-hover|dark|peer-hover):)*(?:text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)|leading-[a-z0-9]+|tracking-[a-z]+|font-(?:bold|semibold|medium|normal|extrabold)|[pm][xytblr]?-[\d.]+|gap[x-y]?-[\d.]+|space-[xy]-[\d.]+|[wm][xytblr]?-[\d.]+|rounded(?:-[a-z0-9]+)?|border-t|border-b)$/;
const toks = new Map();
for (const f of live) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/class(?::list)?=(?:"([^"]*)"|'([^']*)')/g)) {
    for (const t of (m[1] ?? m[2]).split(/\s+/).filter(Boolean)) {
      const bare = t.replace(/^!/, '');
      if (RE.test(bare)) toks.set(bare, (toks.get(bare) ?? 0) + 1);
    }
  }
}
for (const [t, n] of [...toks].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) console.log(String(n).padStart(3), t);
console.log('distinct', toks.size, 'writes', [...toks.values()].reduce((s, n) => s + n, 0));
console.log('excluded as dormant:', dormant.join(' ') || 'none');
