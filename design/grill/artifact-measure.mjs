// Shared headless-measurement harness for design-grill specimens and for the built artifact.
//
// Why this exists rather than a file:// load: the built artifact's @font-face and image URLs are
// root-absolute (/src/assets/...), which file:// resolves against the filesystem root. Firefox's
// --screenshot exits the instant load fires, before an async measurement finishes, so the page keeps
// its own load open with a 1x1 image request and the harness releases it once the POST lands.
//
// A probe file must define window.__measure() returning { report: string, ...data }.
//
//   node design/grill/artifact-measure.mjs --root dist/client --pages index.html,chat/index.html \
//        --probe design/grill/controls-measure.js --widths 1240,375 --out .design/grill/run/
//   node design/grill/artifact-measure.mjs --root design --pages grill/round-6.html \
//        --probe design/grill/round6-measure.js --widths 1240,900,375,320
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? def : argv[i + 1];
};
const ROOT = resolve(flag('root', 'dist/client'));
const PAGES = flag('pages', 'index.html').split(',');
const PROBE = resolve(flag('probe', 'controls-measure.js'));
const WIDTHS = flag('widths', '1240,375').split(',').map(Number);
const OUT = flag('out', '') ? resolve(flag('out')) : null;
const FIREFOX = process.env.FIREFOX || 'firefox';
const TIMEOUT = Number(process.env.MEASURE_TIMEOUT || 25000);
// --config <file.json> is injected as window.__CFG so a probe can be driven from Node without
// re-writing the probe itself (see contrast-probe.js). A page named "oracle-blank.html" is served from memory,
// which is what a pure colour or metric oracle needs.
const CFG = flag('config', '') ? JSON.parse(await (await import('node:fs/promises')).readFile(resolve(flag('config')), 'utf8')) : null;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const results = new Map();
const holds = new Map();
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
let release = null;

const server = (await import('node:http')).createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/__report') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const id = url.searchParams.get('id');
      results.set(id, Buffer.concat(chunks).toString('utf8'));
      res.writeHead(204).end();
      const held = holds.get(id);
      if (held) { holds.delete(id); held.end(GIF); }
      if (release) { const r = release; release = null; r(); }
    });
    return;
  }
  // ?inj=<id> serves the probe-injected copy of a page at its real path, so relative url()s
  // (fonts, images) still resolve exactly as they do in the source tree or the artifact.
  const inj = url.searchParams.get('inj');
  if (inj) {
    const copy = results.get(`html:${inj}`);
    if (copy === undefined) { res.writeHead(404, { 'content-type': 'text/plain' }).end('no injected copy'); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(copy);
    return;
  }
  // /__hold?id=<id> keeps the page's load event open until its report lands, which is what stops
  // Firefox's --screenshot mode from exiting before an async measurement finishes. The response is a
  // 1x1 gif ended by the report handler, never by a timer.
  if (url.pathname === '/__hold') {
    const id = url.searchParams.get('id');
    res.writeHead(200, { 'content-type': 'image/gif', 'cache-control': 'no-store' });
    if (id) { holds.set(id, res); return; }
    res.end(GIF);
    return;
  }
  const rel = url.pathname.replace(/^\/+|\/+$/g, '') || 'index.html';
  const file = join(ROOT, rel);
  readFile(file)
    .then((buf) => {
      res.writeHead(200, {
        'content-type': TYPES[extname(file)] || 'application/octet-stream',
        'cache-control': 'no-store',
        // fonts are fetched in CORS mode; on loopback this is same-origin anyway, but a missing
        // header is a silent failure mode that shows up as every width measured in the fallback face
        'access-control-allow-origin': '*',
      });
      res.end(buf);
    })
    .catch(() => { res.writeHead(404, { 'content-type': 'text/plain' }).end('missing ' + rel); });
});

await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
const probe = await readFile(PROBE, 'utf8');
const idp = (p) => p.replace(/[^a-z0-9]+/gi, '_');
const rows = [];
// The page holds its own load open with /__hold (see header), so Firefox stays alive until the
// measurement has been POSTed back rather than exiting at the load event.
const LOADER = `<script>(() => {
  const id = new URLSearchParams(location.search).get('inj');
  // probes that predate this harness post their own result to window.__MEASURE_ENDPOINT
  window.__MEASURE_ENDPOINT = '/__report?id=' + encodeURIComponent(id);
  const send = (body) => fetch('/__report?id=' + encodeURIComponent(id), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body }).catch(() => {});
  // the hold is fired, never awaited: awaiting it would deadlock, since the report is what ends it
  fetch('/__hold?id=' + encodeURIComponent(id), { cache: 'no-store' }).catch(() => {});
  if (!window.__measure) return;
  // These scripts sit in <head>, so measuring now would see an empty body (measured: a probe chained
  // straight off a microtask found 0 elements). DOMContentLoaded is the right hook: the parser is done
  // and head stylesheets are applied, and the pending hold means the load event cannot race us out.
  const parsed = document.readyState === 'loading'
    ? new Promise((ok) => document.addEventListener('DOMContentLoaded', ok))
    : Promise.resolve();
  parsed.then(() => window.__measure())
    .then((r) => send(JSON.stringify(r)))
    .catch((e) => send(JSON.stringify({ report: 'probe error: ' + String((e && e.stack) || e) })));
})();</script>`;

for (const page of PAGES) {
  for (const width of WIDTHS) {
    const id = `${idp(page)}-${width}`;
    const src = join(ROOT, page);
    const isHtml = /\.html?$/i.test(page);
    const body = page === 'oracle-blank.html'
      ? '<!doctype html><html lang=en><head><meta charset=utf-8><title>oracle</title></head><body></body></html>'
      : await readFile(src, 'utf8');
    const html = isHtml
      ? (body.includes('</head>')
          ? body.replace('</head>', `<script>window.__CFG=${JSON.stringify(CFG ?? null)}</script><script>${probe}</script>${LOADER}</head>`)
          : `<script>window.__CFG=${JSON.stringify(CFG ?? null)}</script><script>${probe}${LOADER}</script>` + body)
      : body;
    // serve the injected copy through a query-routed virtual path
    results.set(`html:${id}`, html);
    const profile = mkdtempSync(join(tmpdir(), 'ff-'));
    const waited = new Promise((ok) => { release = ok; });
    const child = spawn(FIREFOX, ['--headless', '--profile', profile, `${base}/${page.replace(/^\/+/, '')}?inj=${id}`,
      // --width is accepted and ignored by Firefox 14x headless (measured: every run reported the
      // default 1366 viewport). --window-size is the flag that actually sets it, which is what
      // probe-run.sh uses.
      '--window-size', `${width},1200`, '--hide-scrollbars', '--screenshot', `/tmp/ff-${id}.png`],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (c) => { err += c.toString(); });
    const why = await Promise.race([waited, new Promise((ok) => setTimeout(() => ok('timeout'), TIMEOUT))]);
    const out = results.get(id);
    if (!out) console.log(`${id}: NO REPORT${err ? ` (${err.trim().split('\n').pop()})` : ''}`);
    else rows.push({ id, page, width, data: JSON.parse(out) });
    if (why === 'timeout') console.log(`${id}: hold timed out after ${TIMEOUT}ms`);
    child.kill('SIGKILL');
  }
}
server.close();

if (OUT) {
  await mkdir(OUT, { recursive: true });
  for (const r of rows) await writeFile(join(OUT, `${r.id}.json`), JSON.stringify(r.data, null, 1));
  console.log(`wrote ${rows.length} measurement file(s) to ${OUT}`);
}
for (const r of rows) console.log(`\n===== ${r.id} =====\n${r.data.report || r.data.out || JSON.stringify(r.data, null, 1)}`);
