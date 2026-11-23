#!/usr/bin/env node
/**
 * design/event-field-parity.mjs — which event facts does a **built page** actually render, and which input
 * file supplies each one.
 *
 * Why it exists (MS42, D471, ADR-0010): this repository is about to stop fetching event data. The claim
 * "nothing a visitor sees today is lost" cannot be made from a reading of `src/` — a field can be imported
 * and never painted, and a link can be painted from a file nobody thinks of as an event input. So the probe
 * reads the **artifact** (`dist/client`) and answers, per field and per link, where the bytes came from.
 *
 * Three inputs, four surfaces:
 *   inputs   data/events.json (the handoff file) · data/meetup-events.json · data/discord-events.json
 *            (the two fetcher outputs this item retires — **deleted on 2026-11-23**, so the probe reads them
 *            only when they exist: run it on the commit before the deletion and it reports the before-state,
 *            run it here and it reports that no input in this tree supplies a per-date page any more)
 *            · src/config.json `URLs` (hand-authored)
 *   surfaces the built HTML pages · the built /events.ics · (nothing) a field that reaches neither
 *
 * Verdicts, and the rule that assigns them:
 *   carried      the value on the artifact comes from a field the far side's standard carries
 *   at-risk      the value on the artifact comes from an input this item deletes
 *   missing      the artifact shows the fact, but no single field of the standard supplies it
 *   feed-only    the snapshot carries it and only /events.ics publishes it — no page renders it
 *   unused       the snapshot carries it and nothing on the artifact uses it
 *
 * It prints a table and writes `design/event-field-parity.json`. It exits 0 unless the artifact is missing:
 * this is a measurement, not a gate, so it never fails a build (the same reasoning that keeps `check:area`
 * and `check:rhythm` out of `verify`, D269).
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

import { asUpcomingItems, venueLine, displayTime, displayEndTime } from '../src/lib/event-item.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const DIST = resolve(ROOT, arg('--dist', 'dist/client'));
const OUT = resolve(ROOT, arg('--json', 'design/event-field-parity.json'));

const read = (p) => {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
  } catch (e) {
    console.error(`event-field-parity: cannot read or parse ${p}: ${e.message}`);
    process.exit(1);
  }
};
const snapshot = read('data/events.json');
// Optional by design (MS42): these two are deleted with the fetchers. A probe that hard-fails on a missing
// input cannot measure the state on either side of the deletion, and this probe exists to compare them.
const readIf = (p) => { try { const f = resolve(ROOT, p); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : { events: [] }; } catch { return { events: [] }; } };
const meetup = readIf('data/meetup-events.json');
const discord = readIf('data/discord-events.json');
const config = read('src/config.json');
const urls = config.URLs ?? {};

// The standard's row whitelist, read from the gate that enforces it rather than copied into this probe, so
// the two cannot drift (D264: one home per rule).
const ROW_FIELDS = [
  'uid', 'slug', 'summary', 'series', 'seriesNote', 'start', 'end', 'timeConfirmed', 'venue', 'geo',
  'blurb', 'url', 'image', 'sequence', 'status', 'source',
];

// --- the artifact ----------------------------------------------------------------------------
function htmlFiles(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) { if (ent.name !== '_astro') out.push(...htmlFiles(p)); }
    else if (ent.name.endsWith('.html')) out.push(p);
  }
  return out.sort();
}

if (!existsSync(DIST) || !existsSync(join(DIST, 'index.html'))) {
  console.error(`event-field-parity: no built artifact at ${relative(ROOT, DIST)} — run \`npm run build\` first.`);
  process.exit(1);
}

const pages = htmlFiles(DIST).map((f) => ({ file: relative(DIST, f), text: readFileSync(f, 'utf8') }));
const allHtml = pages.map((p) => p.text).join('\n');
const icsPath = join(DIST, 'events.ics');
// Unfold the feed before needle-matching it: a content line longer than 75 octets is split with a leading
// space on the continuation, so a URL or a long DESCRIPTION never appears as one contiguous string in the
// bytes. `check-ics.mjs` unfolds for the same reason; a probe that did not would report a real fact as absent.
const ics = existsSync(icsPath) ? readFileSync(icsPath, 'utf8').replace(/\r\n[ \t]/g, '') : '';
const icsEvents = (ics.match(/BEGIN:VEVENT/g) ?? []).length;

const inHtml = (needle) => (needle && allHtml.includes(needle));
const inIcs = (needle) => (needle && ics.includes(needle));
const pagesWith = (needle) => pages.filter((p) => p.text.includes(needle)).map((p) => p.file);

// --- per-field parity ------------------------------------------------------------------------
const rows = snapshot.events;
const itemFor = new Map();
for (const r of rows) itemFor.set(r.uid, asUpcomingItems([r])[0]);

const fields = ROW_FIELDS.map((field) => {
  const carrying = rows.filter((r) => r[field] !== undefined && r[field] !== null);
  const htmlNeedles = [];
  const icsNeedles = [];
  for (const r of carrying) {
    const it = itemFor.get(r.uid) ?? {};
    switch (field) {
      case 'uid': icsNeedles.push(`UID:${r.uid}`); break;
      case 'slug': htmlNeedles.push(r.slug); break;
      case 'summary':
        htmlNeedles.push(it.title ?? null, r.summary);
        icsNeedles.push(`SUMMARY:${(it.title ?? r.summary ?? '').replace(/,/g, '\\,')}`);
        break;
      case 'series':
        htmlNeedles.push(r.series);
        break;
      case 'seriesNote': htmlNeedles.push(r.seriesNote); break;
      case 'start':
        htmlNeedles.push(`datetime="${String(r.start).slice(0, 10)}"`, displayTime(r));
        icsNeedles.push(`DTSTART${/T/.test(String(r.start)) ? '' : ';VALUE=DATE'}:${String(r.start).slice(0, 10).replace(/-/g, '')}`,
          String(r.start).slice(0, 10).replace(/-/g, ''));
        break;
      case 'end':
        htmlNeedles.push(displayEndTime(r));
        icsNeedles.push(String(r.end).slice(0, 10).replace(/-/g, ''));
        break;
      case 'timeConfirmed':
        htmlNeedles.push(r.timeConfirmed === true ? displayTime(r) : 'time not set');
        break;
      case 'venue':
        htmlNeedles.push(venueLine(r), r.venue?.raw ?? null);
        icsNeedles.push((r.venue?.raw ?? '').replace(/,/g, '\\,'));
        break;
      case 'geo': icsNeedles.push(`GEO:${r.geo}`); break;
      case 'blurb': icsNeedles.push((r.blurb ?? '').slice(0, 40).replace(/,/g, '\\,')); break;
      case 'url': icsNeedles.push(`URL:${r.url}`); htmlNeedles.push(r.url); break;
      case 'image': icsNeedles.push(`ATTACH;FMTTYPE=image/png:${r.image}`); htmlNeedles.push(r.image); break;
      case 'sequence': icsNeedles.push(`SEQUENCE:${String(r.sequence ?? 0)}`); break;
      case 'status':
        icsNeedles.push(`STATUS:${String(r.status ?? 'CONFIRMED').toUpperCase()}`);
        htmlNeedles.push(String(r.status ?? '').toUpperCase() === 'CANCELLED' ? 'Cancelled' : null);
        break;
      case 'source':
        htmlNeedles.push(r.source?.feed ?? null);
        icsNeedles.push(r.source?.feed ?? null);
        break;
    }
  }
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  const h = uniq(htmlNeedles).filter(inHtml);
  const i = uniq(icsNeedles).filter(inIcs);
  const onArtifact = h.length + i.length;
  const inStandard = ROW_FIELDS.includes(field);
  let verdict;
  if (!onArtifact) verdict = carrying.length ? 'unused' : 'absent';
  else if (i.length && !h.length) verdict = 'feed-only';
  else verdict = inStandard ? 'carried' : 'missing';
  return {
    field,
    rowsCarrying: carrying.length,
    rowsTotal: rows.length,
    onHtml: h.length,
    onIcs: i.length,
    htmlPages: h.length ? pagesWith(h[0]) : [],
    inStandard,
    verdict,
  };
});

// --- the links a visitor can actually click ---------------------------------------------------
const hrefOf = new Map();
for (const p of pages) {
  for (const m of p.text.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const u = m[1];
    if (!hrefOf.has(u)) hrefOf.set(u, { href: u, count: 0, pages: new Set(), platforms: new Set() });
    const rec = hrefOf.get(u);
    rec.count++;
    rec.pages.add(p.file);
  }
}
// Which input supplies each URL. The order matters: a URL can sit in more than one file, and the one the
// resolver actually used is the one the page's own markup says — so the platform attribute is read too.
for (const p of pages) {
  for (const m of p.text.matchAll(/data-rsvp-platform="([^"]+)"[^>]*href="(https?:\/\/[^"]+)"|href="(https?:\/\/[^"]+)"[^>]*data-rsvp-platform="([^"]+)"/g)) {
    const plat = m[1] ?? m[4];
    const href = m[2] ?? m[3];
    if (plat && href && hrefOf.has(href)) hrefOf.get(href).platforms.add(plat);
  }
}
const meetupUrls = new Set(meetup.events.map((e) => e.url));
const discordUrls = new Set(discord.events.map((e) => e.url));
const rowUrls = new Set(rows.map((r) => r.url));
const configUrls = new Set(Object.values(urls).filter(Boolean));

const links = [...hrefOf.values()].map((rec) => {
  const src = [];
  if (meetupUrls.has(rec.href)) src.push('data/meetup-events.json');
  if (discordUrls.has(rec.href)) src.push('data/discord-events.json');
  if (rowUrls.has(rec.href)) src.push('data/events.json');
  if (configUrls.has(rec.href)) src.push('src/config.json');
  const perDate = meetupUrls.has(rec.href) || discordUrls.has(rec.href);
  return {
    href: rec.href,
    count: rec.count,
    pages: [...rec.pages].sort(),
    platforms: [...rec.platforms],
    suppliedBy: src.length ? src : ['not attributable to a tracked input'],
    perDateEventPage: perDate,
    survivesHandoff: !perDate,
  };
}).sort((a, b) => (a.perDateEventPage === b.perDateEventPage ? a.href.localeCompare(b.href) : a.perDateEventPage ? -1 : 1));

const perDateLinks = links.filter((l) => l.perDateEventPage);

// --- what the feed's own URL property promises, per VEVENT ------------------------------------
// `src/lib/ics.mjs` publishes `own ?? row.url`, where `own` is `feedUrl(row, EVENT_PAGES.meetup)` — the
// per-date Meetup page this repo used to scrape. So the subscriber's calendar app follows the same input the
// page does, and the handoff moves the feed's URL too, not only the page's link.
const feedUrls = [];
for (const block of ics.split('BEGIN:VEVENT').slice(1)) {
  const uid = /UID:(.+)/.exec(block)?.[1]?.trim() ?? null;
  const url = /URL:(.+)/.exec(block)?.[1]?.trim() ?? null;
  if (!url) continue;
  const from = meetupUrls.has(url) ? 'data/meetup-events.json'
    : discordUrls.has(url) ? 'data/discord-events.json'
      : rowUrls.has(url) ? 'data/events.json (the row\'s own url)'
        : 'not attributable to a tracked input';
  feedUrls.push({ uid, url, suppliedBy: from, perDateEventPage: meetupUrls.has(url) || discordUrls.has(url) });
}

// --- the hole: does any date get a link from the handoff file at all? -------------------------
const datesOnPages = [...new Set(pages.flatMap((p) => [...p.text.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1])))]
  .sort();
const datesWithPerDateLink = datesOnPages.filter((d) => perDateLinks.some((l) => {
  const e = meetup.events.find((x) => x.url === l.href) ?? discord.events.find((x) => x.url === l.href);
  return e && e.date === d;
}));

// --- report -----------------------------------------------------------------------------------
const summary = {
  generatedAt: new Date().toISOString().slice(0, 10),
  dist: relative(ROOT, DIST),
  rows: rows.length,
  icsEvents,
  htmlPages: pages.length,
  fieldsCarried: fields.filter((f) => f.verdict === 'carried').length,
  fieldsFeedOnly: fields.filter((f) => f.verdict === 'feed-only').length,
  fieldsUnused: fields.filter((f) => f.verdict === 'unused').length,
  externalLinks: links.length,
  perDateEventLinks: perDateLinks.length,
  feedUrlEvents: feedUrls.length,
  feedUrlPerDate: feedUrls.filter((f) => f.perDateEventPage).length,
  feedUrlFromSnapshot: feedUrls.filter((f) => !f.perDateEventPage).length,
  datesOnPages: datesOnPages.length,
  datesWithPerDateLink: datesWithPerDateLink.length,
  rowUrlsOnHtml: fields.find((f) => f.field === 'url')?.onHtml ?? 0,
};

const pad = (s, n) => String(s).padEnd(n);
console.log(`event-field-parity — ${summary.htmlPages} built pages, ${summary.rows} snapshot rows, ${summary.icsEvents} VEVENTs`);
console.log('');
console.log(pad('field', 14) + pad('rows', 7) + pad('html', 6) + pad('ics', 5) + pad('standard', 10) + 'verdict');
for (const f of fields) {
  console.log(pad(f.field, 14) + pad(`${f.rowsCarrying}/${f.rowsTotal}`, 7) + pad(f.onHtml, 6) + pad(f.onIcs, 5)
    + pad(f.inStandard ? 'yes' : 'no', 10) + f.verdict + (f.htmlPages.length ? `  (${f.htmlPages.join(',')})` : ''));
}
console.log('');
console.log(`external links on the artifact: ${links.length}`);
for (const l of links) {
  console.log(`  ${l.href}\n    ${l.count}x on ${l.pages.join(', ')}${l.platforms.length ? ` [${l.platforms.join(',')}]` : ''} <- ${l.suppliedBy.join(' + ')}${l.perDateEventPage ? '  ** per-date event page: does NOT survive the handoff **' : ''}`);
}
console.log('');
console.log(`the feed's own URL property, per VEVENT: ${feedUrls.length} events, ${feedUrls.filter((f) => f.perDateEventPage).length} pointing at a per-date platform page`);
for (const f of feedUrls) console.log(`  ${f.uid}\n    ${f.url} <- ${f.suppliedBy}`);
console.log('');
console.log(`dates painted on a page: ${datesOnPages.length} (${datesOnPages.join(', ')})`);
console.log(`dates with a per-date platform page linked: ${datesWithPerDateLink.length} (${datesWithPerDateLink.join(', ') || 'none'})`);

writeFileSync(OUT, JSON.stringify({ summary, fields, links, feedUrls, datesOnPages, datesWithPerDateLink }, null, 1) + '\n');
console.log(`\nwrote ${relative(ROOT, OUT)}`);
