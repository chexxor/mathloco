#!/usr/bin/env node
// island-cost.mjs — what the client-rendered preference island actually ships, in bytes.
//
//   node design/grill/island-cost.mjs                         # measures dist/client
//   node design/grill/island-cost.mjs --dist .design/tmp-no-cluster
//
// Why a script: S022/D281 chose a client-rendered island for the sign-up cluster so a visitor's remembered
// platform comes first. That is a decision with a byte price, and "it costs a little JS" is not a number
// (AGENTS.md: a measured number carries its date and its probe). The price has three separate parts, and
// only two of them are in the page:
//   1. the per-island tag — Astro serialises every prop into the <astro-island> attribute, and the props are
//      the full destination list, the date, the hour and both snapshot stamps;
//   2. the island runtime — Astro's own inline `<script>` that finds islands and hydrates them, shipped
//      once per page that has an island;
//   3. the chunks the runtime imports — the component chunk and the Svelte renderer chunk, fetched lazily
//      when a cluster scrolls into view (`client:visible`), so they are not in the page bytes at all.
//
// Collapsing the island is not a guess at a static alternative: the script writes the same cluster markup
// into a plain <div> in a scratch copy (.design/tmp-no-island), so the gzip differential is between two
// pages that differ only in the island mechanism. Geometry is unaffected (design/grill/strip-clusters.mjs
// measures the markup's layout cost; this measures its transport cost).
//
// Measured 2026-11-11, Linux native, Node v24.22.1, gzip at the default level (what the CDN stores).
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};
const dist = resolve(flag('--dist', 'dist/client'));
const noIslandOut = resolve(flag('--out', '.design/tmp-no-island'));

if (!existsSync(dist)) {
  console.error(`no ${dist} — run npm run build first`);
  process.exit(2);
}

const gz = (s) => gzipSync(Buffer.from(s)).length;
const walk = (dir, prefix = '') => {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const rel = prefix ? `${prefix}/${f}` : f;
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, rel));
    else if (f.endsWith('.html')) out.push({ path: p, rel });
  }
  return out;
};

// Astro's island tag: <astro-island uid=... component-url=... renderer-url=... props=... opts=...>
// The closing tag and the slot wrapper are short and counted separately.
const ISLAND_RE = /<astro-island\b[^>]*>/g;
const INLINE_SCRIPT_RE = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;

/** Replace every island with a plain div holding the same server-rendered slot content. */
const collapseIslands = (html) => {
  let out = '';
  let i = 0;
  let count = 0;
  while (true) {
    const start = html.indexOf('<astro-island', i);
    if (start === -1) { out += html.slice(i); break; }
    const openEnd = html.indexOf('>', start);
    const close = html.indexOf('</astro-island>', openEnd);
    if (close === -1) { out += html.slice(i); break; }
    const inner = html.slice(openEnd + 1, close);
    const tag = html.slice(start, openEnd + 1);
    const componentUrl = (tag.match(/component-url="([^"]+)"/) || [])[1] || '';
    // A server-rendered island paints its slot inline; a static component paints the same markup in a div.
    out += html.slice(i, start) + (inner.trim() || '');
    i = close + '</astro-island>'.length;
    count += 1;
    void componentUrl;
  }
  return { html: out, count };
};

const pages = walk(dist);
let totalIslands = 0;
let tagBytes = 0, tagGzip = 0;
let propBytes = 0, propGzip = 0;
let runtimeBytes = 0, runtimeGzip = 0;
let ssrBytes = 0, ssrGzip = 0;
const chunkRefs = new Map(); // chunk path -> { pages: Set, islands: number }
const collapsed = [];

for (const { path, rel } of pages) {
  const html = readFileSync(path, 'utf8');
  const tags = [...html.matchAll(ISLAND_RE)];
  if (!tags.length) continue;

  for (const m of tags) {
    const tag = m[0];
    totalIslands += 1;
    tagBytes += tag.length;
    tagGzip += gz(tag);
    const props = (tag.match(/ props="([^"]*)"/) || [])[1] || '';
    const opts = (tag.match(/ opts="([^"]*)"/) || [])[1] || '';
    propBytes += props.length + opts.length;
    propGzip += gz(props) + gz(opts);
    const comp = (tag.match(/component-url="([^"]+)"/) || [])[1];
    const renderer = (tag.match(/renderer-url="([^"]+)"/) || [])[1];
    for (const c of [comp, renderer]) {
      if (!c) continue;
      const key = c;
      if (!chunkRefs.has(key)) chunkRefs.set(key, { pages: new Set(), islands: 0 });
      chunkRefs.get(key).pages.add(rel);
      chunkRefs.get(key).islands += 1;
    }
  }

  // The island runtime is inline: Astro ships it once per page with an island.
  for (const m of html.matchAll(INLINE_SCRIPT_RE)) {
    const body = m[1];
    if (body.includes('astro-island') || body.includes('astro:content')) {
      runtimeBytes += body.length;
      runtimeGzip += gz(body);
    }
  }

  // The markup Astro server-renders inside the island: what a JS-off visitor, a crawler and the gate read.
  // There is no <astro-slot> wrapper here; the renderer paints the component's own markup between the island
  // tag and `<!--astro:end--></astro-island>`.
  for (const m of html.matchAll(/<astro-island\b[^>]*>([\s\S]*?)<!--astro:end--><\/astro-island>/g)) {
    ssrBytes += m[1].length;
    ssrGzip += gz(m[1]);
  }

  const c = collapseIslands(html);
  // A page with no island does not ship Astro's island runtime either, so the static stand-in drops it.
  let staticHtml = c.html;
  if (c.count === 0) {
    staticHtml = staticHtml.replace(INLINE_SCRIPT_RE, (whole, body) => (body.includes('astro-island') || body.includes('astro:content') ? '' : whole));
  }
  collapsed.push({ rel, html: staticHtml, islands: c.count, page: html, bytes: html.length, gz: gz(html), staticGz: gz(staticHtml) });
}

if (!existsSync(noIslandOut)) mkdirSync(noIslandOut, { recursive: true });
let isoGzipTotal = 0, staticGzipTotal = 0;
for (const p of collapsed) {
  // write into the scratch copy, mirroring the route structure
  const dest = join(noIslandOut, p.rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, p.html);
  isoGzipTotal += p.gz;
  staticGzipTotal += p.staticGz;
}

const chunkLines = [...chunkRefs.entries()].map(([url, ref]) => {
  const file = resolve(dist, url.replace(/^\//, ''));
  const exists = existsSync(file);
  const raw = exists ? statSync(file).size : null;
  const g = exists ? gz(readFileSync(file)) : null;
  return { url, raw, gzip: g, pages: ref.pages.size, islands: ref.islands, missing: !exists };
});

const pagesWithIsland = collapsed.length;
console.log(`island cost — ${dist}, ${pages.length} html pages, ${pagesWithIsland} carry an island`);
console.log(`islands: ${totalIslands}`);
console.log('');
console.log('per-island tag (raw bytes summed over all islands):');
console.log(`  tag      ${tagBytes} raw  ${tagGzip} gzip`);
console.log(`  props+opts alone  ${propBytes} raw  ${propGzip} gzip  (${(propBytes / totalIslands).toFixed(0)} raw per island)`);
console.log('island runtime inline script (summed over pages):');
console.log(`  ${runtimeBytes} raw  ${runtimeGzip} gzip  (${(runtimeBytes / pagesWithIsland).toFixed(0)} raw per page)`);
console.log('server-rendered cluster markup (what a JS-off visitor sees):');
console.log(`  ${ssrBytes} raw  ${ssrGzip} gzip`);
console.log('');
console.log('page differential — same cluster markup, island mechanism removed (.design/tmp-no-island):');
for (const p of collapsed) {
  console.log(`  /${p.rel === 'index.html' ? '' : p.rel}  ${p.bytes} raw / ${p.gz} gzip  ->  ${p.html.length} raw / ${p.staticGz} gzip  (delta ${p.bytes - p.html.length} raw, ${p.gz - p.staticGz} gzip)`);
}
console.log(`  total across island pages: ${isoGzipTotal} gzip vs ${staticGzipTotal} gzip  (delta ${isoGzipTotal - staticGzipTotal} gzip)`);
console.log('');
console.log('lazy chunks (fetched when a cluster scrolls into view, client:visible):');
for (const c of chunkLines) {
  console.log(`  ${c.url}  ${c.raw} raw  ${c.gzip} gzip  on ${c.pages} page(s), ${c.islands} island(s)${c.missing ? '  [chunk file not found]' : ''}`);
}
console.log('');
console.log(`scratch copy written to ${noIslandOut} (gitignored)`);
