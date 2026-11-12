#!/usr/bin/env node
// strip-clusters.mjs — make a copy of the built site with every sign-up cluster removed, so the
// cluster's page cost is a differential measured by a probe rather than a hand edit.
//
//   node design/grill/strip-clusters.mjs                       # dist/client -> .design/tmp-no-cluster
//   node design/grill/strip-clusters.mjs --out .design/tmp-x   # a different scratch directory
//
// Why a script and not a sed one-liner: DESIGN.md quotes "what the sign-up cluster costs" (+44px on the
// copy lane, 80px at 320 where the labels wrap) and stamps it with
// `node design/schedule-geometry.mjs --dist .design/tmp-no-cluster`. A stamp that names a tool but whose
// input was produced by an unrecorded shell command is a number nobody can reproduce (design/README.md:
// if a claim cites it or a script runs it, it belongs in design/). S022/D281 put a third platform on every
// date, so the old differential had to be re-measured — and re-measuring needs the strip to be repeatable.
//
// What it removes: the `<div ... data-rsvp-cluster>...</div>` subtree, and nothing else. The astro-island
// wrapper stays, because Astro's shipped CSS makes it `display: contents` (measured 2026-11-11, Linux,
// Firefox 159.0: the wrapper paints no box), so leaving it in isolates the cost of the cluster's own
// markup rather than the cost of the island mechanism. The island's props are still serialised into the
// wrapper, which is deliberate: the byte cost of the island tag is measured separately by
// design/grill/island-cost.mjs.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};
const src = resolve(flag('--dist', 'dist/client'));
const out = resolve(flag('--out', '.design/tmp-no-cluster'));

if (!existsSync(src)) {
  console.error(`no ${src} — run npm run build first`);
  process.exit(2);
}

const walk = (dir, prefix = '') => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const rel = prefix ? `${prefix}/${f}` : f;
    if (statSync(p).isDirectory()) {
      mkdirSync(join(out, rel), { recursive: true });
      walk(p, rel);
    } else {
      copyFileSync(p, join(out, rel));
    }
  }
};
mkdirSync(out, { recursive: true });
walk(src);

// Find the div that opens with data-rsvp-cluster and close it by counting divs, not by regex matching to
// the next </div>: the cluster contains anchors and spans but no nested divs today, and a regex that
// stops at the first </div> would leave the arrow spans orphaned the day someone nests one.
const strip = (html) => {
  let removed = 0;
  let i = 0;
  let result = '';
  while (i < html.length) {
    const open = html.indexOf('<div', i);
    if (open === -1) { result += html.slice(i); break; }
    result += html.slice(i, open);
    const tagEnd = html.indexOf('>', open);
    const tag = html.slice(open, tagEnd + 1);
    if (!tag.includes('data-rsvp-cluster')) {
      result += tag;
      i = tagEnd + 1;
      continue;
    }
    let depth = 0, j = open;
    while (j < html.length) {
      const nextOpen = html.indexOf('<div', j + 1);
      const nextClose = html.indexOf('</div>', j + 1);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) { depth++; j = nextOpen + 4; continue; }
      depth--;
      j = nextClose + 6;
      if (depth < 0) break;
    }
    removed++;
    i = j;
  }
  return { html: result, removed };
};

let total = 0, files = 0;
const stripTree = (dir, prefix = '') => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const rel = prefix ? `${prefix}/${f}` : f;
    if (statSync(p).isDirectory()) { stripTree(p, rel); continue; }
    if (!f.endsWith('.html')) continue;
    const { html, removed } = strip(readFileSync(p, 'utf8'));
    if (removed) { writeFileSync(p, html); total += removed; files++; console.log(`  ${rel}: ${removed}`); }
  }
};
stripTree(out);
console.log(`stripped ${total} cluster(s) from ${files} page(s) -> ${out}`);
if (!total) {
  console.error('nothing stripped: the built pages carry no data-rsvp-cluster, so the differential is meaningless');
  process.exit(1);
}
