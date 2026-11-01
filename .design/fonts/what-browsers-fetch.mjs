#!/usr/bin/env node
// what-browsers-fetch.mjs - measure which woff2 files a real browser actually downloads for a real page.
//
//   node .design/fonts/what-browsers-fetch.mjs
//
// Why: the revamp brief and NEXT.md quote "107,680 B of woff2, of which 53,016 B (49%) is cyrillic" as if that
// were a download the visitor pays. It is a *bundle* number. @fontsource's CSS carries unicode-range, so the
// browser only fetches the subsets the rendered text needs. The difference matters for the type-family ruling:
// dropping dead subsets costs the repo bytes it never serves, while adding a second face is what actually
// makes a visitor download more. So measure it instead of arguing about it.
//
// Method: serve the @font-face rules verbatim from the installed @fontsource CSS, with the src pointing at a
// loopback server that logs every request and answers with the real file. firefox --screenshot loads the page;
// whatever it asks for is what a browser fetches. Same loopback trick as page-measure.mjs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const PORT = 8741;
const root = process.cwd();
const NM = path.join(root, 'node_modules', '@fontsource');

// real @font-face blocks, copied out of the installed packages (not written from memory)
function faces(pkg, name, weights, subsets) {
  const css = ['index.css', '400.css', '700.css'].map((f) => {
    const p = path.join(NM, pkg, f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  }).join('\n');
  const blocks = [];
  for (const m of css.matchAll(/\/\* ([a-z0-9-]+) \*\/\s*\n@font-face \{([^}]+)\}/g)) {
    const [, id, body] = m;
    const bare = id.replace(new RegExp('^' + name.replace(/ /g, '-').toLowerCase() + '-'), '');
    const [, sub, wt, style] = bare.match(/^(.+)-(\d+)-(\w+)$/) || [];
    if (!sub || !weights.includes(Number(wt)) || style !== 'normal' || !subsets.includes(sub)) continue;
    const ur = (body.match(/unicode-range: ([^;]+);/) || [])[1];
    const stem = name.replace(/ /g, '-').toLowerCase();
    const file = `${pkg}/${stem}-${sub}-${wt}-normal.woff2`;
    const onDisk = path.join(NM, pkg, 'files', `${stem}-${sub}-${wt}-normal.woff2`);
    if (!fs.existsSync(onDisk)) continue;
    blocks.push(`@font-face{font-family:"${name}";font-style:normal;font-weight:${wt};src:url("http://127.0.0.1:${PORT}/${file}") format("woff2");unicode-range:${ur};}`);
  }
  return blocks.join('\n');
}

const sets = [
  ['pt-serif', 'PT Serif', [400], ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']],
  ['pt-serif', 'PT Serif', [700], ['latin', 'cyrillic']],
];
const css = sets.map(([p, n, w, s]) => faces(p, n, w, s)).join('\n');

const TEXT = '<p style="font-family:\'PT Serif\',serif;font-size:18px">We read one paper and take it apart until someone finds a second route to the result. Rated 4.9 of 5 by 57 members. Next: Sat 7 Nov, 7:00pm at Ambrosia Coffee.</p>' +
  '<p style="font-family:\'PT Serif\',serif;font-size:18px">Café — an accented character, to see whether latin-ext is fetched.</p>';

const page = `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${TEXT}</body>`;
const tmp = path.join(root, '.design', 'fonts', '.fontfetch.html');
fs.writeFileSync(tmp, page);
fs.writeFileSync(path.join(root, '.design', 'fonts', '.fontfetch.css'), css);

const hits = [];
const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.slice(1));
  const [pkg, file] = [rel.split('/')[0], rel.split('/').slice(1).join('/')];
  const abs = path.join(NM, pkg, 'files', file);
  if (!fs.existsSync(abs)) { res.writeHead(404); return res.end(); }
  const buf = fs.readFileSync(abs);
  hits.push({ file: rel, bytes: buf.length });
  // fonts are a CORS-only resource: without this header a file:// page refuses the cross-origin font
  // and the server logs nothing, which looks identical to "the browser needed no subset".
  res.writeHead(200, { 'content-type': 'font/woff2', 'content-length': buf.length, 'access-control-allow-origin': '*' });
  res.end(buf);
});

srv.listen(PORT, '127.0.0.1', () => {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'ffprof.'));
  try {
    execFileSync('firefox', ['--headless', '--no-remote', '--profile', prof, '--window-size=900,400',
      '--screenshot', path.join(prof, 'f.png'), `file://${tmp}`], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 90000 });
  } catch (e) { console.error('firefox rc=' + (e.status ?? '?')); }
  setTimeout(() => {
    let total = 0;
    for (const h of hits) { total += h.bytes; console.log('FETCHED ' + h.file.padEnd(52) + h.bytes.toLocaleString() + ' B'); }
    console.log('downloaded for this page: ' + total.toLocaleString() + ' B across ' + hits.length + ' files');
    const bundle = ['pt-serif-latin-400-normal.woff2', 'pt-serif-latin-ext-400-normal.woff2', 'pt-serif-cyrillic-400-normal.woff2', 'pt-serif-cyrillic-ext-400-normal.woff2', 'pt-serif-latin-700-normal.woff2', 'pt-serif-cyrillic-700-normal.woff2']
      .map((f) => path.basename(f));
    let b = 0;
    for (const f of ['latin-400', 'latin-ext-400', 'cyrillic-400', 'cyrillic-ext-400', 'latin-700', 'cyrillic-700']) {
      const p = path.join(NM, 'pt-serif', 'files', `pt-serif-${f}-normal.woff2`);
      if (fs.existsSync(p)) { const s = fs.statSync(p).size; b += s; console.log('in bundle ' + ('pt-serif-' + f + '-normal.woff2').padEnd(52) + s.toLocaleString() + ' B'); }
    }
    console.log('bundled if index.css (400) + 700 is imported: ' + b.toLocaleString() + ' B');
    fs.rmSync(prof, { recursive: true, force: true });
    fs.rmSync(tmp, { force: true });
    srv.close();
  }, 4000);
});
