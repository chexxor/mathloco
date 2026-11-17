#!/usr/bin/env node
// dist-pages.mjs — one reading of the built pages, shared by every probe that asks what a page SAYS.
//
//   import { onePage, builtPageFiles, localDay } from './dist-pages.mjs';
//   builtPageFiles('dist/client')          // -> [{ route: '/', file: 'dist/client/index.html' }, …]
//   onePage('dist/client/index.html')      // -> { route, raw, text, headings, anchors, sentences, zones }
//
// Round 5 (communication). Two probes ask the same question in different units —
// `communication-census.mjs` counts claims and anchors, `visitor-questions.mjs` matches sentences against
// questions — and both need the same three things: which files the build emitted, where a piece of text sits
// (nav chrome / exit band / body), and what a sentence is once the markup is off. A probe that carries its own
// copy of that zone logic is a second memory of the page, and the day the two disagree every number in the
// round-5 doc disagrees with itself. `emitted-routes.mjs` already owns "which paths exist"; this owns "what a
// page says at offset N".
//
// The reading is deliberately the same one `scripts/check-content.mjs` makes: comments, `<script>`, `<style>`
// and `<head>` are blanked **at the same length**, so every offset a caller gets still points at the page, and
// a `<a>` inside a comment cannot become an anchor.
import { readFileSync, existsSync } from 'node:fs';
import { emittedRoutes } from './emitted-routes.mjs';

/** @returns {string} today's date as YYYY-MM-DD in the LOCAL zone, not UTC.
    `new Date().toISOString().slice(0,10)` said 2026-11-16 at 20:04 on 2026-11-15; `check:figures` reads a
    stamp as the day the probe ran, so the stamp and the probe's own record must name the same day. */
export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Every route the build emitted, as { route, file }. Never a remembered list (D266's class, and D151).
    A route only counts if the file that carries it is on disk: `emitted-routes.mjs` walks every `.html`
    under dist/client, and the browser gates write `.measured-rendered-index.390.html` and
    `rendered-index.390.html` INTO dist/client, which that walker reads as routes named
    `.measured-rendered-index.390`. Those are one page measured at a viewport, not a page, so the rule
    "a route is a file" decides: if `pageFileFor` finds no file, there is no route here. */
export function builtPageFiles(dist = 'dist/client') {
  return emittedRoutes(dist)
    .map((route) => ({ route, file: pageFileFor(route, dist) }))
    .filter((p) => existsSync(p.file));
}

/** One built route -> the file that carries it (`/` is `index.html`, `/404` is `404.html`). */
export function pageFileFor(route, dist = 'dist/client') {
  if (route === '/') return `${dist}/index.html`;
  if (route === '/404') return `${dist}/404.html`;
  return `${dist}${route}/index.html`;
}

function blank(s) { return ' '.repeat(s.length); }

/** Decode the entities the artifact writes, including the numeric ones the sprite and the arrows use. */
export function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&shy;/g, '').replace(/&#8203;/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/gu, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

/** Text the page shows, with the chrome ranges kept. */
export function pageText(html) {
  return html.replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<script[\s\S]*?<\/script>/gi, blank)
    .replace(/<style[\s\S]*?<\/style>/gi, blank)
    .replace(/<head[\s\S]*?<\/head>/gi, blank);
}

/** nav -> nav-chrome, footer -> exit-band (D115's band carries its own `<nav>` of links, so a chrome range
    swallowed by the band is wayfinding at the foot of the page, not chrome at the head of it). */
export function zoneRanges(html) {
  const out = [];
  for (const tag of ['nav', 'header', 'footer']) {
    const open = new RegExp(`<${tag}\\b`, 'gi');
    let m = open.exec(html);
    while (m) {
      const closeRe = new RegExp(`</${tag}>`, 'gi');
      closeRe.lastIndex = m.index;
      const close = closeRe.exec(html);
      out.push({ zone: tag === 'footer' ? 'exit-band' : 'nav-chrome', from: m.index, to: close ? close.index : html.length });
      if (!close) break;
      open.lastIndex = close.index;
      m = open.exec(html);
    }
  }
  for (const r of out) for (const f of out) if (f.zone === 'exit-band' && r !== f && r.from >= f.from && r.to <= f.to) r.zone = 'exit-band';
  return out;
}

export function zoneAt(ranges, at) {
  let best = null;
  for (const r of ranges) {
    if (at < r.from || at >= r.to) continue;
    if (!best) { best = r; continue; }
    if (r.from >= best.from && r.to <= best.to) best = r;
  }
  return best ? best.zone : 'body';
}

/** One built page, read once: its headings, anchors, and its sentences with the zone and section each sits in. */
export function onePage(file, route) {
  const raw = readFileSync(file, 'utf8');
  const text = pageText(raw);
  const ranges = zoneRanges(text);

  const headings = [];
  const hre = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let hm = hre.exec(text);
  while (hm) {
    headings.push({ at: hm.index, to: hm.index + hm[0].length, tag: hm[1].toLowerCase(), text: decode(hm[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim() });
    hm = hre.exec(text);
  }

  const sectionAt = (at) => {
    let best = null;
    for (const h of headings) if (h.at < at) { best = h; } else break;
    return best ? best.text : '(no heading above it)';
  };

  const anchors = [];
  for (const m of text.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = /href="([^"]*)"/.exec(m[1])?.[1] ?? '';
    const inner = m[2];
    const label = decode(inner.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
    anchors.push({
      at: m.index,
      href,
      label,
      internal: href.startsWith('/'),
      zone: zoneAt(ranges, m.index),
      section: sectionAt(m.index),
      srOnly: /sr-only/.test(inner),
    });
  }

  const units = [];
  const tre = /<[^>]+>/g;
  let cursor = 0;
  let tk = tre.exec(text);
  while (tk) {
    const chunk = text.slice(cursor, tk.index);
    if (chunk.trim()) units.push({ at: cursor, text: decode(chunk).replace(/\s+/g, ' ').trim() });
    cursor = tre.lastIndex;
    tk = tre.exec(text);
  }
  const lastChunk = text.slice(cursor);
  if (lastChunk.trim()) units.push({ at: cursor, text: decode(lastChunk).replace(/\s+/g, ' ').trim() });

  const inHeading = (at) => headings.some((h) => at >= h.at && at < h.to);
  const sentences = [];
  for (const u of units) {
    for (const s of u.text.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean)) {
      sentences.push({ at: u.at, text: s, zone: zoneAt(ranges, u.at), section: sectionAt(u.at), heading: inHeading(u.at) });
    }
  }
  // A caller that wants "did the page ANSWER this" must ask its sentences AND its anchors: `sentences` is
  // prose only, `anchors` carries each label with its href and zone. They are kept apart so a probe that
  // counts claims (design/communication-census.mjs) never counts a link label twice, and a probe that asks
  // whether a visitor's question is answered (design/visitor-questions.mjs) can say which form answered it.
  return { route, raw, text, headings, anchors, sentences, zones: ranges };
}
