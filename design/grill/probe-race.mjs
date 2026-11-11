#!/usr/bin/env node
// probe-race.mjs — measure the harness's own race, so a red browser gate can be told from a flaky one.
//
//   node design/grill/probe-race.mjs [width] [height] [attempts]      (default 390 844 6)
//   PROBE_SETTLE=1   hold the page open with a pending <img> until the report POST arrives (the proposed fix)
//   PROBE_INLINE=1   inline the measure script instead of loading it by <script src>
//   PROBE_HOLD_MS=n  with PROBE_SETTLE, the safety release in ms (default 30000)
//
// Why this exists: `firefox --headless --screenshot` finishes as soon as the document loads, and a probe
// posts its numbers from an async promise chain that starts at script-eval. Whether the POST lands before
// firefox exits is a sub-second race, and until now the only evidence about it was "it failed, then passed".
// Measured 2026-11-11 (Linux, Firefox 158.0.1, native, load 3-5/16cpu), five attempts at 390x844:
//   exit 0.78 / 0.87 / 0.87 / 1.44 / 0.81 s;  heartbeat post at 0.57-0.62 s;  measure post at 0.68-1.27 s
//   (elapsedMs 74-88), and 2 of those 5 runs posted the heartbeat and NOT the measurement — the two posts
//   are ~70-90 ms apart, so the second one is the one that loses the race.
//
// The instrument distinguishes three failure shapes:
//   heartbeat + no measure  -> the harness lost the exit race (retry or hold fixes it)
//   no heartbeat at all     -> the page or the injected path is broken
//   heartbeat + measure     -> the probe worked; a gate failure here is a real defect
//
// The settle trick being tested: an <iframe> whose response the server withholds until the report has
// arrived. A pending subresource keeps firefox's load event open (proved with a held stylesheet: exit
// moved from 0.8 s to 5.8 s). It must not be an <img>, because the probe's own decodeImages() waits on
// every image in the document, so holding an <img> makes settle() run to its 8 s cap - measured 2026-11-11,
// 6/6 attempts, elapsedMs 8010-8013, exit 8.85-8.96 s. It must not be a <link rel=stylesheet>, because a
// pending stylesheet blocks script execution (heartbeat did not arrive until the sheet resolved). It must
// not be <script defer>, because measured 2026-11-11 firefox exited 0.82-1.11 s with that fetch still open.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const [w = '390', h = '844', attempts = '6', route = '/', measureFile = 'design/grill/render-measure.js'] = process.argv.slice(2);
const dist = path.resolve('dist/client');
if (!fs.existsSync(dist)) { console.error('dist/client missing — run npm run build first'); process.exit(2); }
const measure = path.resolve(measureFile);

const run = (n) => new Promise((done) => {
  const probe = path.join(dist, `.probe-race-${w}-${h}.html`);
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'ffprof.'));
  const posts = [];
  const t0 = Date.now();
  let settleRes = null;
  const releaseSettle = (why) => {
    if (!settleRes) return;
    settleRes.writeHead(200, { 'content-type': 'text/html' });
    settleRes.end('<!doctype html><title>released</title>');
    settleRes = null;
    posts.push({ at: +((Date.now() - t0) / 1000).toFixed(2), kind: 'settle-released', why });
  };
  const server = http.createServer((req, res) => {
    if (req.url === '/settle') { settleRes = res; setTimeout(() => releaseSettle('safety timeout'), Number(process.env.PROBE_HOLD_MS || 20000)); return; }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(204);
      res.end();
      let o = null;
      try { o = JSON.parse(body); } catch {}
      let kind = 'other';
      if (o && o.ping) kind = 'heartbeat';
      else if (o && o.done) kind = 'measure';
      posts.push({
        at: +((Date.now() - t0) / 1000).toFixed(2),
        kind,
        evalAtMs: o && o.evalAt,
        ready: o && o.ready,
        elapsedMs: o && o.elapsedMs,
        unloadedFaces: o && o.fonts ? o.fonts.filter((f) => !f.endsWith('loaded')).slice(0, 5) : null,
      });
      if (kind === 'measure') releaseSettle('report received');
    });
  });
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    const pageFile = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`;
    const src = fs.readFileSync(path.join(dist, pageFile), 'utf8')
      .replace(/((?:href|src|srcset|content)=")\/(?!\/)/g, '$1./')
      .replace(new RegExp(`(\\./)?_astro/([A-Za-z0-9._-]+)\\.css`, 'g'), './_astro/$2.rel.css');
    const settle = process.env.PROBE_SETTLE
      ? `<iframe src="http://127.0.0.1:${port}/settle" width="1" height="1" title="harness hold"></iframe>`
      : '';
    const body = process.env.PROBE_INLINE
      ? `<script>window.__MEASURE_ENDPOINT='http://127.0.0.1:${port}/';` +
        `fetch(window.__MEASURE_ENDPOINT,{method:'POST',mode:'no-cors',body:JSON.stringify({ping:Date.now(),evalAt:performance.now(),ready:document.readyState})});` +
        fs.readFileSync(measure, 'utf8') + '</script>'
      : `<script>window.__MEASURE_ENDPOINT='http://127.0.0.1:${port}/';` +
        `fetch(window.__MEASURE_ENDPOINT,{method:'POST',mode:'no-cors',body:JSON.stringify({ping:Date.now(),evalAt:performance.now(),ready:document.readyState})});` +
        '</script>\n<script src="' + measure + '"></script>';
    fs.writeFileSync(probe, src.replace('</body>', `${settle}${body}</body>`));
    const p = spawn('firefox', ['--headless', '--no-remote', '--profile', prof,
      `--window-size=${w},${h}`, '--screenshot', path.join(prof, 'm.png'), `file://${probe}`],
      { stdio: ['ignore', 'ignore', 'pipe'] });
    const killer = setTimeout(() => p.kill('SIGKILL'), 60000);
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('exit', (code) => {
      clearTimeout(killer);
      fs.rmSync(prof, { recursive: true, force: true });
      releaseSettle('firefox exited');
      const got = posts.map((q) => q.kind);
      const r = {
        attempt: n,
        firefoxExitSec: +((Date.now() - t0) / 1000).toFixed(2),
        rc: code,
        posts,
        lostMeasure: got.includes('heartbeat') && !got.includes('measure'),
        neverStarted: !got.includes('heartbeat'),
        stderr: err.split('\n').filter((l) => l.trim()).slice(-3).join(' | '),
      };
      console.log(JSON.stringify(r));
      server.close();
      done(r);
    });
  });
});

(async () => {
  const results = [];
  for (let i = 0; i < Number(attempts); i++) results.push(await run(i));
  try { fs.unlinkSync(path.join(dist, `.probe-race-${w}-${h}.html`)); } catch {}
  const lost = results.filter((r) => r.lostMeasure).length;
  const dead = results.filter((r) => r.neverStarted).length;
  const exits = results.map((r) => r.firefoxExitSec).sort((a, b) => a - b);
  const modes = [];
  if (process.env.PROBE_SETTLE) modes.push('settle-img');
  if (process.env.PROBE_INLINE) modes.push('inline');
  if (!modes.length) modes.push('plain');
  console.log(`SUMMARY ${modes.join('+')} ${w}x${h}: ${results.length} attempts, ${lost} lost the measure post, ${dead} never posted, firefox exit ${exits[0]}-${exits[exits.length - 1]} s`);
  process.exit(0); // a diagnostic, not a gate: it reports the race, it does not fail on it
})();
