#!/usr/bin/env node
// page-measure.mjs - run JS *inside* a real browser and get the numbers back as text.
//
//   node design/grill/page-measure.mjs <page.html> <measure.js> [width] [height] [shotOut.png]
//   PAGE_MEASURE_ATTEMPTS=n   firefox spawns allowed per run (default 3)
//   PAGE_MEASURE_HOLD=0       disable the settle hold (A/B only)
//   PAGE_MEASURE_HOLD_MS=n    the hold's safety release in ms (default 12000)
//   PAGE_MEASURE_DEBUG=1      print attempt/hold diagnostics to stderr
//
//   [shotOut.png] - copy firefox's screenshot out before the profile is deleted. The screenshot is taken
//   at load, so it is NOT proof that webfonts had applied; that is what the posted layout boxes are for
//   (scripts/social-card-measure.js compares reported run widths against ink extent in the pixels).
//
// Why this exists: `firefox --headless --screenshot` executes page JS but gives back only pixels, so the
// first version of this loop pushed numbers into a banner and had a local vision model read them off a
// JPEG (see probe-run.sh). That works and stays useful for the *gate* (one pixel = the verdict), but as an
// measurement tool it costs a model call and a transcription per number.
//
// Measured here (Linux, Firefox 158.0.1, native, not WSL): a page loaded from file:// CAN POST to
// http://127.0.0.1 - `fetch(..., {mode:'no-cors'})` arrives, body intact. So the browser can hand its own
// computed values to a local node server. No browser automation dependency, no Playwright, nothing
// installed: firefox is already on this rig and already runs page JS for the screenshots.
//
// Notes that cost time to discover:
//   - a FRESH profile dir per spawn: a reused one says "already in use", firefox exits 0, nothing arrives.
//   - mode:'no-cors' is required: file:// is an opaque origin, so a cors-mode fetch is blocked pre-flight.
//   - the probed copy goes next to the original, because the previews load woff2 by relative path into node_modules.
//   - keep the server on 127.0.0.1, not 0.0.0.0: this is a loopback pipe, not a listening service.
//   - THE EXIT RACE (measured 2026-11-11 with design/grill/probe-race.mjs, Linux/Firefox 158.0.1): firefox
//     exits as soon as the document loads, and the probe posts its report from an async chain that starts
//     at script-eval. At 390x844 six plain attempts exited in 0.76-0.92 s with the heartbeat at 0.59-0.70 s
//     and the report 30-90 ms later; six of six lost the report. That is the "check:render flake", not load.
//     The fix is a pending subresource the harness controls: an <iframe> whose response is withheld until
//     the report POST arrives, so load cannot fire before the numbers are in the pipe. Measured 8/8 attempts
//     reported, firefox exit 0.86-0.90 s - the hold costs milliseconds.
//   - What does NOT work, each measured: an <img> hold (the probe's own decodeImages() waits on every
//     image, so settle() runs to its 8 s cap and exit moves to 8.9 s); a <link rel=stylesheet> hold (a
//     pending stylesheet delays script execution - heartbeat arrived at 5.67 s, not 0.6 s); a
//     <script defer> hold (firefox exited 0.82-1.11 s with the fetch still open).
//   - And the reason spawn() is used instead of execFileSync: execFileSync blocks this process's event
//     loop, so the loopback server cannot answer the hold request while firefox is alive. With execFileSync
//     the hold is a deadlock - one run at 390x844 burned the full 120 s spawn timeout with the report
//     already sitting in the socket buffer.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const [pageArg, measureArg, wArg = '1240', hArg = '1400', shotOut] = process.argv.slice(2);
if (!pageArg || !measureArg) {
  console.error('usage: node design/grill/page-measure.mjs <page.html> <measure.js> [width] [height] [shotOut.png]');
  process.exit(2);
}
const page = fs.realpathSync(pageArg);
const measure = fs.realpathSync(measureArg);
const dir = path.dirname(page);
const probed = path.join(dir, `.measured-${path.basename(page, '.html')}.html`);

const src = fs.readFileSync(page, 'utf8');
const attempts = Math.max(1, Number(process.env.PAGE_MEASURE_ATTEMPTS || 3));
const holdMs = Number(process.env.PAGE_MEASURE_HOLD_MS || 12000);
const useHold = process.env.PAGE_MEASURE_HOLD !== '0';
let code = 1;
let prof = null;
let holdRes = null;
let posts = 0;

const releaseHold = (why) => {
  if (!holdRes) return;
  holdRes.writeHead(200, { 'content-type': 'text/html' });
  holdRes.end('<!doctype html><title>released</title>');
  holdRes = null;
  posts++;
  if (process.env.PAGE_MEASURE_DEBUG) console.error(`hold released: ${why}`);
};

const server = http.createServer((req, res) => {
  if (req.url === '/settle-hold') {
    holdRes = res;
    // A probe that never posts must not hang the gate forever: the safety release lets firefox finish,
    // the spawn loop then retries, and the failure is reported with its real cause.
    setTimeout(() => releaseHold('safety timeout'), holdMs);
    return;
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    res.writeHead(204);
    res.end();
    posts++;
    let obj;
    try { obj = JSON.parse(body); }
    catch { console.log('RAW (not JSON): ' + body.slice(0, 4000)); obj = null; }
    if (obj) console.log(JSON.stringify(obj, null, 1));
    if (obj && obj.error) { console.error('page threw: ' + obj.error); }
    if (obj && obj.done) {
      // Do NOT exit here. The screenshot lives in the profile firefox is still using, and closing now
      // deletes it out from under the browser (measured: `no screenshot to copy: ENOENT` on check:social:live).
      // Release the hold, let firefox finish load and write its shot, and close after the spawn returns.
      code = 0;
      releaseHold('report received');
    }
    // otherwise keep listening: the page may post more than once (heartbeat, then results)
  });
});

function close() {
  server.close();
  if (shotOut && prof) {
    try { fs.copyFileSync(path.join(prof, 'm.png'), shotOut); } catch (e) { console.error('no screenshot to copy: ' + e.message); }
  }
  try { fs.unlinkSync(probed); } catch {}
  if (prof) { try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} }
  process.exit(code);
}

const runFirefox = (profile) => new Promise((resolve) => {
  const p = spawn('firefox', ['--headless', '--no-remote', '--profile', profile,
    `--window-size=${wArg},${hArg}`, '--screenshot', path.join(profile, 'm.png'), `file://${probed}`],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  const killer = setTimeout(() => p.kill('SIGKILL'), 120000);
  let err = '';
  p.stderr.on('data', (d) => { err += d.toString(); });
  p.on('exit', (rc) => {
    clearTimeout(killer);
    resolve({ rc, err: err.split('\n').filter((l) => l.trim()).slice(-6).join('\n') });
  });
});

server.listen(0, '127.0.0.1', async () => {
  // The OS picks a free port, and the probe file is written only once that port is known. The old
  // scheme guessed `8731 + random*7`: two concurrent runs could guess the same one (one dies with
  // EADDRINUSE, or worse, one page posts its numbers into the other run's server and the gate reads a
  // different page's report). Port 0 makes that impossible, which is what lets the gate run its
  // route x width matrix in parallel.
  const port = server.address().port;
  const holdTag = useHold
    ? `<iframe src="http://127.0.0.1:${port}/settle-hold" title="harness hold" aria-hidden="true" style="position:absolute;left:0;bottom:0;width:0;height:0"></iframe>`
    : '';
  const tag = `<script>window.__MEASURE_ENDPOINT='http://127.0.0.1:${port}/';</script>\n<script src="${measure}"></script>${holdTag}`;
  fs.writeFileSync(probed, src.includes('</body>') ? src.replace('</body>', tag + '</body>') : src + tag);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    prof = fs.mkdtempSync(path.join(os.tmpdir(), 'ffprof.'));
    if (attempt > 1 && process.env.PAGE_MEASURE_DEBUG) console.error(`attempt ${attempt}: firefox exited without a report, re-spawning`);
    const r = await runFirefox(prof);
    // The event loop is free during a spawn, so a report that landed while firefox was still running has
    // already been handled. A short yield covers the case where the socket is still draining at exit.
    // firefox has exited, so its screenshot is in the profile and every queued POST has been handled.
    await new Promise((res) => setTimeout(res, 150));
    if (code === 0) { close(); return; }
    if (r.err) console.error(`firefox rc=${r.rc} ${r.err}`);
    try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
  }

  console.error(`TIMEOUT: the page never posted after ${attempts} firefox spawn(s) (${posts} other posts) - check the measure script calls __send()`);
  close();
});
