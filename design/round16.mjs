#!/usr/bin/env node
// design/round16.mjs — grill round 16 (R7): the club's name and the word "Book", priced in line boxes and
// photographed in the identity block.
//
//   npm run round16                          every option at every width (~1-2 min on this rig)
//   npm run round16 -- voice-only wordmark   a subset, by label
//   COPY_WIDTHS="1240 320" npm run round16   fewer widths while iterating
//
// Why a round for a string. The question is not whether "Book" can be deleted — three edits delete it — but which
// page the operator wants once it is gone, and a copy choice at display size is a layout choice: "Minneapolis Math
// Book Club" is two line boxes in the h1 at desktop and a different number at 320 than "Minneapolis Math Club",
// and a locator that runs longer than the viewport wraps into the air above the name. D160's rule applies: a
// question answered by looking gets pictures of every option, at one scale, from the same load that produced its
// numbers. So each option is applied to a COPY of the built page, measured by the repo's own harness, and cropped
// from the screenshot that same load took.
//
// What it does, per option:
//   1. copies `dist/client` to `.design/tmp-round16/dist-<label>` and applies `grill/copy-options.mjs`'s pairs to
//      every HTML file in the copy — never to `dist/` itself (that is the artifact that gets deployed; round 13
//      mutated `dist` in place, which is fine only because it restored in a `finally`, and a copy cannot forget to
//      restore). A pair that matches nothing throws, and an option that changes nothing on the measured page
//      throws (round 15's rule).
//   2. censuses the change surface browser-free: how many name slots each route holds, and where the word "book"
//      survives (alt text, aria-labels) — because the operator's ruling is about branding, and the honest answer
//      includes the occurrences that are quotations of public-domain sources.
//   3. probes the copied page at each width with `design/grill/copy-measure.js` (two passes: ask the settled
//      height, then shoot the whole page at it — record 0015/0021's rule via `shotHeight`), and crops the identity
//      column out of that same shot.
//   4. writes `design/grill/round16/report.json` (the only tracked measurement) and hands off to
//      `design/grill/round16-build.mjs`, which generates the specimen from the record and throws on a missing
//      lookup, so no string in the HTML is transcribed by hand.
//
// Not run here: `check:render`, `check:content`, `check:escapes`. An option here is a text edit on unchanged
// components, so the geometry gates cannot disagree with it; if one graduates it goes through the normal gates as
// a real edit, and the naming ruling also has to reach `data/events.json` (the subscriber-visible calendar name)
// and the share card, which this round only lists — it does not repaint them.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { OPTIONS, SHIPPED, apply, mutations as optionMutations } from './grill/copy-options.mjs';
import { cropBox } from './grill/round-instruments.mjs';
import { shotHeight } from './grill/shot-height.mjs';
import { distState, staleLine } from './dist-fresh.mjs';

const OUT = 'design/grill/round16';
const SCRATCH = '.design/tmp-round16';
const WIDTHS = (process.env.COPY_WIDTHS || '1240 640 390 320').split(/\s+/).filter(Boolean).map(Number);
const CROP_WIDTHS = (process.env.COPY_CROPS || '1240 390 320').split(/\s+/).filter(Boolean).map(Number);
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (only.length) {
  const unknown = only.filter((l) => !OPTIONS.some((o) => o.label === l));
  if (unknown.length) {
    console.error(`round16: no such option(s): ${unknown.join(', ')}. Known: ${OPTIONS.map((o) => o.label).join(', ')}`);
    process.exit(1);
  }
}
const options = only.length ? OPTIONS.filter((o) => only.includes(o.label)) : OPTIONS;

const STALE = distState();
if (!STALE.fresh && !STALE.allowed) {
  console.error(`round16: ${staleLine(STALE)}`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });
const notes = [];
const say = (m) => console.log(m);
const started = Date.now();

/** Every HTML file the built site serves, with its route. */
function pages(dir) {
  const out = [];
  const walk = (d, route) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== '_astro') walk(join(d, e.name), `${route}/${e.name}`); continue; }
      if (!e.name.endsWith('.html')) continue;
      out.push({ file: join(d, e.name), route: e.name === 'index.html' ? (route === '/' ? '/' : `${route}/`) : `${route}/${e.name.replace(/\.html$/, '')}` });
    }
  };
  walk(dir, '');
  return out;
}

// --- 2. the census: what the word "Book" is on this build, before any option is applied -----------------------
const shippedPages = pages('dist/client');
const word = /\bbooks?\b/gi;
const census = shippedPages.map(({ file, route }) => {
  const html = readFileSync(file, 'utf8');
  const hits = [...html.matchAll(word)].length;
  // Where the word survives is the answer to "can it all go?": the hero plate's alt text quotes the engraving's
  // own description, and the horizon shelf's aria-label describes the plates' source. Both are true statements
  // about public-domain material, not the club describing itself.
  const quoted = [...html.matchAll(/[^<>]{0,60}\bbooks?\b[^<>]{0,60}/gi)].map((m) => m[0].replace(/\s+/g, ' ').trim());
  return {
    route,
    nameSlots: html.split(SHIPPED.name).length - 1,
    bookWord: hits,
    quoted: [...new Set(quoted)],
  };
});

// --- 2b. the change surface: which tracked files hold the name, and what lives outside this repo -------------
// The name is not one string in one file; it is eight slots in the repo plus four the repo does not own. Both
// halves are read here rather than written into the specimen, because "what would this rename touch" is the
// question an option ruling actually has, and a list typed from memory goes stale the day a slot moves.
const SURFACE_FILES = ['src', 'data/events.json', 'scripts/make-social-share.mjs', 'integrations/mobilizon-cadence/series.config.mjs'];
const BINARY = /\.(png|jpe?g|webp|avif|woff2?|ico|mp4|pdf)$/i;
function textFiles(target, root, acc = []) {
  const abs = join(root, target);
  let st;
  try { st = statSync(abs); } catch { return acc; }
  if (!st.isDirectory()) { if (!BINARY.test(abs)) acc.push(abs); return acc; }
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name.startsWith('.')) continue;
    textFiles(join(target, e.name), root, acc);
  }
  return acc;
}
function nameSurface() {
  const rows = [];
  for (const f of SURFACE_FILES.flatMap((t) => textFiles(t, '.'))) {
    const html = readFileSync(f, 'utf8');
    const names = html.split(SHIPPED.name).length - 1;
    const book = [...html.matchAll(/\bbooks?\b/gi)].length;
    if (!names && !book) continue;
    const firstBook = /\bbooks?\b/i.exec(html);
    rows.push({
      path: f, nameSlots: names, bookWord: book,
      sample: firstBook ? html.slice(Math.max(0, firstBook.index - 50), firstBook.index + 60).replace(/\s+/g, ' ').trim() : null,
    });
  }
  return rows.sort((a, b) => b.nameSlots - a.nameSlots || a.path.localeCompare(b.path));
}

/** The slots that carry the name but are not this site's to rename. Values read from the tree, not remembered. */
function externalSlots() {
  const cfg = JSON.parse(readFileSync('src/config.json', 'utf8'));
  const content = JSON.parse(readFileSync('src/content.json', 'utf8'));
  const cal = JSON.parse(readFileSync('data/events.json', 'utf8')).calendar ?? {};
  const series = readFileSync('integrations/mobilizon-cadence/series.config.mjs', 'utf8');
  const handle = (/groupActor:\s*"([^"]+)"/.exec(series) || [])[1] ?? null;
  const row = (what, value, owns) => ({ what, value, owns, holdsName: String(value).toLowerCase().includes('book') });
  return [
    row('the club\u2019s Meetup group (where the sign-up is)', cfg.URLs?.meetupGroup ?? null, 'Meetup \u2014 the organizer renames it there, and the site only links'),
    row('the apex this site is deployed at', cfg.seo?.canonical ?? null, 'the domain and the Worker route \u2014 renaming means a new domain plus redirects'),
    row('the share card\u2019s painted file', cfg.seo?.image ?? null, 'this repo paints it (scripts/make-social-share.mjs); the name is in the JPEG\u2019s bytes'),
    row('the calendar a subscriber sees', cal.name ?? null, 'this repo (data/events.json) feeds /events.ics; Mobilizon names its own feed'),
    row('the calendar\u2019s PRODID', cal.prodid ?? null, 'this repo, and check:ics requires it to be present'),
    row('the Mobilizon group handle (the calendar of record)', handle, 'Mobilizon \u2014 a handle rename breaks the cadence and every existing follow'),
  ];
}

// --- 3. the probe ------------------------------------------------------------------------------------------
function distCopy(label, option) {
  const dir = `${SCRATCH}/dist-${label}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync('dist/client', dir, { recursive: true, filter: (s) => !/rendered-|\.measured-|\.rel\.css/.test(s) });
  if (!option) return { dir, counts: [] };
  // The measured page gets the strict form (every pair must match); the other routes get the same pairs where
  // they exist — /schedule's lede is the full form, not the compact one, so a hard match there would be a bug in
  // this driver, not a fact about the option.
  const page = join(dir, 'index.html');
  const { html: shippedPage, counts } = apply(readFileSync(page, 'utf8'), option, '/');
  writeFileSync(page, shippedPage);
  let siblings = 0;
  for (const { file } of pages(dir)) {
    if (file === page) continue;
    const html = readFileSync(file, 'utf8');
    let out = html;
    for (const p of optionMutations(option)) {
      if (out.includes(p.from)) { out = out.split(p.from).join(p.to); siblings++; }
    }
    if (out !== html) writeFileSync(file, out);
  }
  notes.push(`applied "${option.label}" to ${shippedPages.length} built pages (${counts.map((c) => `${c.where} x${c.matches}`).join(', ')} on /, ${siblings} further replacements on the other routes)`);
  return { dir, counts };
}
function probe(dir, w, h, shot) {
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const out = execFileSync(process.execPath, [
        'design/grill/dist-measure.mjs', dir, '/', 'design/grill/copy-measure.js', String(w), String(h), shot || '',
      ], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
      const j = JSON.parse(out.slice(out.indexOf('{')));
      if (!j.done) throw new Error('the probe posted without done');
      if (!j.facesLoaded) throw new Error('the page reported the ratified faces as not loaded — heights here would be fallback metrics');
      if (j.errors?.length) notes.push(`${dir} @${w}: probe reported ${j.errors.join('; ')}`);
      return j;
    } catch (e) {
      last = `${e.stderr ? e.stderr.toString() : ''}${e.message || ''}`;
      const flaky = /TIMEOUT|never posted|not JSON|posted without done/i.test(last);
      const tail = last.split('\n').filter(Boolean).slice(-2).join(' | ');
      if (!flaky || attempt === 3) throw new Error(`probe ${dir} @${w}x${h}: ${tail}`);
      notes.push(`probe @${w}: the browser posted nothing on attempt ${attempt}; retried`);
    }
  }
  throw new Error(`probe ${dir} @${w}: unreachable`);
}

async function measure(label, option) {
  const { dir } = distCopy(label, option);
  const at = {};
  for (const w of WIDTHS) {
    const first = probe(dir, w, 1200, '');
    const pageH = shotHeight(first.doc.scrollHeight, `${label} @${w}`);
    const shot = `${SCRATCH}/shot-${label}-${w}.png`;
    const j = probe(dir, w, pageH, shot);
    const block = (where) => (j.blocks || []).find((b) => b.where === where) || null;
    const got = {};
    for (const where of ['identity', 'locator', 'h1', 'heroLede', 'bandLede', 'footerName']) {
      const b = block(where);
      // availW is the content width the text laid out inside. A line count without it is a risk with no units:
      // the same 3 lines with 12px of headroom and with 120px price the next copy edit differently.
      got[where] = b ? { box: b.box, lines: b.lines.count, inkW: b.lines.inkW, availW: b.availW ?? null, fontSize: b.fontSize, text: b.text } : null;
      if (!b) notes.push(`${label} @${w}: no box for ${where}`);
    }
    at[String(w)] = { pageHeight: j.doc.scrollHeight, shotH: pageH, ...got };
    if (CROP_WIDTHS.includes(w) && got.identity) {
      const crop = `${SCRATCH}/id-${label}-${w}.png`;
      await cropBox(shot, got.identity.box, crop, { pad: 14, where: `${label} identity @${w}`, notes });
      at[String(w)].crop = crop;
    }
  }
  return at;
}

say(`round16 — ${1 + options.length} pages x ${WIDTHS.length} widths (${WIDTHS.join('/')}); dist built ${new Date(STALE.built.mtimeMs).toISOString()}`);
const baseline = { label: 'shipped', at: await measure('shipped', null) };
for (const w of WIDTHS) {
  if (!baseline.at[String(w)].identity) throw new Error(`the shipped page produced no identity box at ${w}`);
}

const rows = [];
for (const o of options) {
  const at = await measure(o.label, o);
  let moved = false;
  for (const w of WIDTHS) {
    const a = at[String(w)], b = baseline.at[String(w)];
    if (!a || !b) continue;
    if (a.pageHeight !== b.pageHeight) moved = true;
    for (const where of ['locator', 'h1', 'heroLede', 'bandLede', 'footerName']) {
      if (a[where]?.lines !== b[where]?.lines || Math.abs((a[where]?.inkW ?? 0) - (b[where]?.inkW ?? 0)) > 1) moved = true;
    }
  }
  // Not an error. A copy option that changes no line box anywhere is a real finding (it is free today), but it is
  // a finding about TODAY, so the specimen says so rather than pretending two different pages were photographed.
  if (!moved) notes.push(`"${o.label}" changes no line box and no ink width at any measured width: the page keeps the shape it ships at, and its only cost is future copy that runs longer.`);
  rows.push({
    label: o.label, what: o.what, claims: o.claims, surface: o.surface,
    name: o.name ?? SHIPPED.name, locator: o.locator ?? SHIPPED.locator, band: o.band ?? SHIPPED.band,
    h1: o.h1 ?? SHIPPED.h1, at,
  });
}

const report = {
  round: 16,
  measuredAt: new Date().toISOString(),
  widths: WIDTHS,
  cropWidths: CROP_WIDTHS,
  notes,
  shipped: SHIPPED,
  census,
  surface: nameSurface(),
  external: externalSlots(),
  baseline,
  options: rows,
  seconds: +((Date.now() - started) / 1000).toFixed(1),
};
// Deltas are computed here, not in the builder: the builder may only format numbers this record holds.
for (const r of rows) {
  r.delta = {};
  for (const w of WIDTHS) {
    const a = r.at[String(w)], b = baseline.at[String(w)];
    const d = a && b ? a.pageHeight - b.pageHeight : null;
    r.delta[String(w)] = d === null ? null : `${d >= 0 ? '+' : ''}${d}`;
  }
}
writeFileSync(`${OUT}/report.json`, `${JSON.stringify(report, null, 1)}\n`);
say(`round16: report -> ${OUT}/report.json (${report.seconds}s; ${(existsSync(`${OUT}/report.json`) ? statSync(`${OUT}/report.json`).size : 0)} bytes)`);

execFileSync(process.execPath, ['design/grill/round16-build.mjs'], { stdio: 'inherit' });
