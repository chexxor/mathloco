#!/usr/bin/env node
// serve-measure.mjs — run a measure script inside Firefox against the BUILT site over loopback HTTP.
//
//   node design/grill/serve-measure.mjs <distDir> <route> <measure.js> [w] [h] [shot.png] [--prelude <file>]
//
// Why this harness exists next to dist-measure.mjs, and the measurement that forced it
// (Linux, native, Firefox 159.0, 2026-11-11): an Astro island hydrates by dynamically `import()`ing its
// chunk, and Firefox refuses both `import()` and `fetch()` from a `file://` document — measured with
// design/grill/probe-import.mjs, which came back
// `error loading dynamically imported module: file:///.../mod.js` and
// `NetworkError when attempting to fetch resource`. So in the file:// copy every island stays
// server-rendered, which is fine for geometry and useless for anything a browser-side effect does.
// Over http://127.0.0.1 the same page hydrates, so probes that need hydration come here.
//
// Nothing is written to disk except an optional screenshot: the page is rewritten in memory and served,
// so `dist/` is never mutated (the rule dist-measure.mjs already states — a measurement step must not
// touch the artifact that gets deployed). The server listens on 127.0.0.1 only, on a port the OS picks,
// and closes when firefox exits.
//
// The settle hold is the same iframe trick page-measure.mjs uses (see D278/D279 and the exit-race
// measurement in that file's header): firefox exits when the document finishes loading, and the report is
// posted from an async chain, so a pending subresponse the harness controls keeps the browser alive
// until the numbers are in the pipe.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const positional = [];
let preludePath = null;
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--prelude') { preludePath = rawArgs[++i]; continue; }
  if (rawArgs[i].startsWith('--')) continue;
  positional.push(rawArgs[i]);
}
const [distArg, route = '/', measureArg, w = '1240', h = '1400', shotOut] = positional;
if (!distArg || !measureArg) {
  console.error('usage: node design/grill/serve-measure.mjs <distDir> <route> <measure.js> [w] [h] [shot] [--prelude <file>]');
  process.exit(2);
}
const dist = path.resolve(distArg);
if (!fs.existsSync(dist)) { console.error(`no dist directory ${dist} — run npm run build first`); process.exit(2); }
if (!fs.existsSync(path.join(dist, '_astro'))) { console.error(`no _astro under ${dist} — run npm run build first`); process.exit(2); }
const measurePath = path.resolve(measureArg);
if (!fs.existsSync(measurePath)) { console.error(`measure script ${measurePath} does not exist`); process.exit(2); }
const prelude = (() => {
  if (!preludePath) return '';
  const p = path.resolve(preludePath);
  if (!fs.existsSync(p)) { console.error(`--prelude ${preludePath} does not exist`); process.exit(2); }
  return fs.readFileSync(p, 'utf8');
})();

// Astro writes route pages as <route>/index.html, and the 404 as a sibling file 404.html.
const routeClean = route.replace(/^\/+/, '').replace(/\/+$/, '');
const pagePath = [path.join(dist, routeClean, 'index.html'), path.join(dist, `${routeClean}.html`)]
  .find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
if (!pagePath) { console.error(`no built page for route ${route} under ${dist}`); process.exit(2); }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ics': 'text/calendar',
};

let code = 1;
let posts = 0;
let holdRes = null;
const holdMs = Number(process.env.PAGE_MEASURE_HOLD_MS || 12000);
const attempts = Math.max(1, Number(process.env.PAGE_MEASURE_ATTEMPTS || 3));

const releaseHold = (why) => {
  if (!holdRes) return;
  holdRes.writeHead(200, { 'content-type': 'text/html' });
  holdRes.end('<!doctype html><title>released</title>');
  holdRes = null;
  posts++;
  if (process.env.PAGE_MEASURE_DEBUG) console.error(`hold released: ${why}`);
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;

  if (p === '/__hold') {
    holdRes = res;
    setTimeout(() => releaseHold('safety timeout'), holdMs);
    return;
  }
  if (p === '/__report') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(204);
      res.end();
      posts++;
      let obj;
      try { obj = JSON.parse(body); } catch { console.log(`RAW (not JSON): ${body.slice(0, 4000)}`); obj = null; }
      if (obj) console.log(JSON.stringify(obj, null, 1));
      if (obj && obj.error) console.error(`page threw: ${obj.error}`);
      if (obj && obj.done) { code = 0; releaseHold('report received'); }
    });
    return;
  }
  if (p === '/__measure') {
    res.writeHead(200, { 'content-type': MIME['.js'] });
    res.end(fs.readFileSync(measurePath));
    return;
  }

  const rel = p === '/' ? '' : p.replace(/^\/+/, '');
  const file = [path.join(dist, rel), path.join(dist, rel, 'index.html')]
    .find((cand) => fs.existsSync(cand) && fs.statSync(cand).isFile());
  if (!file) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end(`not served: ${p}`); return; }

  if (file.endsWith('.html')) {
    // Inject the probe into the page we serve, never into the artifact on disk.
    const tag = `${prelude ? `<script>${prelude}</script>\n` : ''}`
      + `<script>window.__MEASURE_ENDPOINT='http://127.0.0.1:${port}/__report';</script>`
      + `<script src="http://127.0.0.1:${port}/__measure"></script>`
      + `<iframe src="http://127.0.0.1:${port}/__hold" title="harness hold" aria-hidden="true" style="position:absolute;left:0;bottom:0;width:0;height:0"></iframe>`;
    const html = fs.readFileSync(file, 'utf8');
    res.writeHead(200, { 'content-type': MIME['.html'] });
    res.end(html.includes('</body>') ? html.replace('</body>', `${tag}</body>`) : `${html}${tag}`);
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

let port = 0;
server.listen(0, '127.0.0.1', async () => {
  port = server.address().port;
  const target = `http://127.0.0.1:${port}${route.startsWith('/') ? route : `/${route}`}`;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'ffprof.'));
    // `--screenshot` is passed even when no shot is asked for: measured 2026-11-11 (Linux, Firefox 159.0),
    // headless Firefox honours --window-size only when it is taking a screenshot — without it the viewport
    // was 1366x682 regardless of the flag, which is exactly the kind of silent difference that makes a
    // geometry number mean something else.
    const child = spawn('firefox', ['--headless', '--no-remote', '--profile', prof,
      `--window-size=${w},${h}`, '--screenshot', path.join(prof, 'm.png'), target],
      { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => (err += d.toString()));
    // Unlike page-measure.mjs, this harness waits for the spawn to finish. An island probe polls for
    // hydration, which takes seconds; a loop that slept 150ms declared TIMEOUT while the browser was
    // still working (measured 2026-11-11: three spawns in 1.4s, no report).
    const rc = await new Promise((res) => {
      const killer = setTimeout(() => { child.kill('SIGKILL'); res(-1); }, 60000);
      child.on('exit', (code2) => { clearTimeout(killer); res(code2); });
    });
    if (shotOut) {
      try { fs.copyFileSync(path.join(prof, 'm.png'), path.resolve(shotOut)); } catch (e) { console.error(`no screenshot: ${e.message}`); }
    }
    fs.rmSync(prof, { recursive: true, force: true });
    if (code === 0) break;
    if (err) console.error(`attempt ${attempt}: firefox rc=${rc}, stderr: ${err.split('\n').filter(Boolean).slice(-4).join('\n')}`);
  }
  if (code !== 0) {
    console.error(`TIMEOUT: ${target} never posted after ${attempts} firefox spawn(s) (${posts} other posts)`);
  }
  server.close();
  process.exit(code);
});
