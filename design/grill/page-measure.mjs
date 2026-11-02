#!/usr/bin/env node
// page-measure.mjs - run JS *inside* a real browser and get the numbers back as text.
//
//   node design/grill/page-measure.mjs <page.html> <measure.js> [width] [height] [shotOut.png]
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
//   - a FRESH profile dir per run: a reused profile says "already in use", firefox exits 0, and nothing arrives.
//   - mode:'no-cors' is required: file:// is an opaque origin, so a cors-mode fetch is blocked pre-flight.
//   - the probed copy goes next to the original, because the previews load woff2 by relative path into node_modules.
//   - keep the server on 127.0.0.1, not 0.0.0.0: this is a loopback pipe, not a listening service.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const [pageArg, measureArg, wArg = '1240', hArg = '1400', shotOut] = process.argv.slice(2);
if (!pageArg || !measureArg) {
  console.error('usage: node design/grill/page-measure.mjs <page.html> <measure.js> [width] [height] [shotOut.png]');
  process.exit(2);
}
const page = fs.realpathSync(pageArg);
const measure = fs.realpathSync(measureArg);
const dir = path.dirname(page);
const probed = path.join(dir, `.measured-${path.basename(page, '.html')}.html`);
const port = 8731 + (Math.floor(Math.random() * 40) * 7);

const src = fs.readFileSync(page, 'utf8');
const tag = `<script>window.__MEASURE_ENDPOINT='http://127.0.0.1:${port}/';</script>\n<script src="${measure}"></script>`;
fs.writeFileSync(probed, src.includes('</body>') ? src.replace('</body>', tag + '</body>') : src + tag);

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'ffprof.'));
let code = 1;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    res.writeHead(204);
    res.end();
    let obj;
    try { obj = JSON.parse(body); }
    catch { console.log('RAW (not JSON): ' + body.slice(0, 4000)); obj = null; }
    if (obj) console.log(JSON.stringify(obj, null, 1));
    if (obj && obj.error) { console.error('page threw: ' + obj.error); }
    if (obj && obj.done) { code = 0; close(); }
    // otherwise keep listening: the page may post more than once (heartbeat, then results)
  });
});
function close() {
  server.close();
  if (shotOut) {
    try { fs.copyFileSync(path.join(prof, 'm.png'), shotOut); } catch (e) { console.error('no screenshot to copy: ' + e.message); }
  }
  try { fs.unlinkSync(probed); } catch {}
  try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
  process.exit(code);
}
server.listen(port, '127.0.0.1', () => {
  try {
    execFileSync('firefox', ['--headless', '--no-remote', '--profile', prof,
      `--window-size=${wArg},${hArg}`, '--screenshot', path.join(prof, 'm.png'), `file://${probed}`],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 120000 });
  } catch (e) {
    console.error('firefox rc=' + (e.status ?? '?') + ' ' + String(e.stderr || '').split('\n').slice(-6).join('\n'));
  }
  setTimeout(() => { console.error('TIMEOUT: the page never posted - check the measure script calls __send()'); close(); }, 30000);
});
