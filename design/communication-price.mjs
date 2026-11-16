#!/usr/bin/env node
// communication-price.mjs — what deleting a DUPLICATED claim would save, in gzipped bytes.
//
//   node design/communication-price.mjs                 # price every cluster the census found
//   node design/communication-price.mjs --json          # the machine record only
//   CLAIMS="trademark,gloss" node design/communication-price.mjs   # a subset, by cluster id
//
// Round 5 (communication). `communication-census.mjs` says a fact is stated more than once; this says what
// deleting the extra statements would buy the visitor. A finding with no price next to it is a finding nobody
// can act on — the next session reads "that band is waste" and has to re-measure before it can decide, which
// is what D311's price-every-label rule paid for in px in the nav; this pays it in gzip, because the currency
// here is bytes the visitor downloads, not geometry.
//
// Nothing on disk is mutated: the removal is a string splice of the BUILT bytes in memory, then gzip -9 of the
// page as shipped and of the page without the string. The artifact never sees the edit, so a run of this probe
// cannot be mistaken for a deploy — the deletion itself is Batch A of the plan, and it happens in `src/` under
// the next session's commit boundary, not here.
//
// Two shapes are priced:
//   cluster — every statement `communication-census.mjs` clustered, minus the one the site should keep
//             (first route in the census's own page order), so the delta is the cost of the EXTRAS
//   band    — the page's single `<footer>` element, which is standing chrome on every page (D307), so its
//             cost is priced whole rather than per sentence
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { emittedRoutes } from './emitted-routes.mjs';
import { pageFileFor } from './dist-pages.mjs';
import { localDay } from './dist-pages.mjs';

const DIST = 'dist/client';
const OUT = process.env.OUT || 'design/communication/price.json';
const ROUTES = emittedRoutes(DIST);

function gz(html) { return gzipSync(Buffer.from(html, 'utf8'), { level: 9 }).length; }
function raw(html) { return Buffer.from(html, 'utf8').length; }   // octets, not characters — the census counts characters

function bandOf(html) {
  const open = /<footer\b[^>]*>/gi.exec(html);
  if (!open) return null;
  const close = /<\/footer>/gi.exec(html.slice(open.index));
  if (!close) return null;
  return html.slice(open.index, open.index + close.index + close[0].length);
}

// The census clusters by salient words, so a cluster's statements are paraphrases of one another, not
// copies; deleting the EXTRA statement is priced per page, and the page that keeps one is the first route
// in the census's own page order (dist order), which is stated rather than assumed below in the record.
const reportPath = 'design/communication/report.json';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const pages = Object.fromEntries(ROUTES.map((route) => [route, readFileSync(pageFileFor(route, DIST), 'utf8')]));

const clusters = [];
for (const cl of report.duplicateClaims) {
  const statements = cl.fact ?? cl.statements ?? cl.members ?? [];
  const byRoute = {};
  for (const s of statements) {
    const list = byRoute[s.page] ?? [];
    list.push(s);
    byRoute[s.page] = list;
  }
  const keep = ROUTES.find((r) => byRoute[r]);
  const extras = statements.filter((s) => !(s.page === keep && byRoute[s.page][0] === s));
  const perRoute = {};
  for (const s of extras) {
    const html = pages[s.page];
    const needle = s.words ?? s.text;
    const i = html.indexOf(needle);
    if (i < 0) {
      const rec = perRoute[s.page] ?? { found: 0, gzip: 0 };
      rec.notFound = (rec.notFound ?? 0) + 1;
      perRoute[s.page] = rec;
      continue;
    }
    const saved = gz(html) - gz(html.slice(0, i) + html.slice(i + needle.length));
    const rec = perRoute[s.page] ?? { found: 0, gzip: 0 };
    rec.found += 1;
    rec.gzip += saved;
    perRoute[s.page] = rec;
  }
  clusters.push({
    id: cl.id ?? clusters.length + 1,
    label: cl.label ?? cl.fact?.[0]?.words ?? "",
    pages: Object.keys(byRoute).sort(),
    statements: statements.length,
    routes: cl.routes ?? null,
    weakestPair: cl.weakestPair ?? null,
    samePageRepeat: cl.repeatedOnSamePage ?? null,
    keep,
    perRoute,
  });
}

const bands = [];
for (const route of ROUTES) {
  const html = pages[route];
  const band = bandOf(html);
  if (!band) { bands.push({ route, problem: 'no <footer> element' }); continue; }
  bands.push({
    route,
    rawBytes: raw(band),
    gzipAlone: gz(band),
    pageRaw: raw(html),
    pageGzip: gz(html),
    saveIfDeleted: gz(html) - gz(html.replace(band, '')),
    shareOfPageGzip: +(100 * (gz(html) - gz(html.replace(band, ''))) / gz(html)).toFixed(1),
  });
}

const record = {
  measuredAt: localDay(),
  instrument: 'design/communication-price.mjs',
  unit: 'gzip -9 octets of the built page, measured in memory over `dist/client`; the artifact is never written',
  baseline: 'dist/client as emittedRoutes finds it; the census record (design/communication/report.json) supplies the clusters, so the two probes cannot describe different facts',
  bands,
  clusters,
  totals: {
    bandRawIdentical: new Set(bands.map((b) => b.rawBytes)).size === 1 ? bands[0].rawBytes : null,
    bandGzipSavedAcrossPages: bands.reduce((a, b) => a + b.saveIfDeleted, 0),
  },
};
writeFileSync(OUT, `${JSON.stringify(record, null, 1)}\n`);

console.log('band — the standing chrome every emitted page closes with (D307)');
for (const b of bands) {
  console.log(`  ${b.route}\t${b.rawBytes} raw / ${b.pageRaw} page raw · deleting the band saves ${b.saveIfDeleted} of ${b.pageGzip} gzip = ${b.shareOfPageGzip}%`);
}
console.log(`  identical on all ${bands.length}: ${bands.every((b) => b.rawBytes === bands[0].rawBytes) ? 'yes' : 'no'} · across five pages: ${bands.reduce((a, b) => a + b.saveIfDeleted, 0)} gzip`);
console.log('\nclusters — the cost of the EXTRA statements (one page keeps the fact)');
for (const c of clusters) {
  const parts = Object.entries(c.perRoute).map(([r, v]) => `${r} -${v.gzip}B (${v.found})${v.notFound ? ` + ${v.notFound} not found` : ''}`);
  console.log(`  #${c.id} ${c.label}  x${c.statements} on ${c.pages.join(', ')} — keeps ${c.keep} — same-page repeat ${c.samePageRepeat} — weakest pair ${c.weakestPair} — ${parts.join(' · ') || 'nothing'}`);
}
console.log(`\nrecord written to ${OUT}`);
