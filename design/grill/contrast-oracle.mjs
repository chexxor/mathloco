// contrast-oracle.mjs - run the renderer-side colour oracle over one or more config files.
//
//   node design/grill/contrast-oracle.mjs contrast/cfg-r6.json [more.json ...]
//
// Each config names a page ("blank" = a synthetic page served from memory by artifact-measure; any
// path under design = a real specimen, e.g. "grill/round-6.html") plus tokens, pairs and solves.
// Output lands in contrast/<cfg-name>.txt (the human table) and .json (the same rows as data).
// It never writes to the config path - doing that once turned the config into harness output and the
// next run died in JSON.parse.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cfgs = process.argv.slice(2);
if (!cfgs.length) { console.error('usage: contrast-oracle.mjs <cfg.json> [...]'); process.exit(2); }

for (const c of cfgs) {
  const cfgPath = resolve(here, c);
  const cfg = JSON.parse(await readFile(cfgPath, 'utf8'));
  const name = basename(c).replace(/\.json$/, '');
  // NEVER `contrast/${name}.json` - that is the config path, and doing so once replaced the config
  // with the probe's own output (the next run died in JSON.parse). Results go under contrast/out/.
  const outDir = join(here, 'contrast', 'out', name);
  await mkdir(outDir, { recursive: true });
  const args = [
    resolve(here, 'artifact-measure.mjs'),
    '--root', resolve(here, '..'),
    '--pages', cfg.page === 'blank' ? 'oracle-blank.html' : cfg.page,
    '--probe', resolve(here, 'contrast-probe.js'),
    '--config', cfgPath,
    '--widths', String(cfg.width || 1240),
    '--out', outDir,
  ];
  let stdout = '';
  try {
    stdout = execFileSync(process.execPath, args, { encoding: 'utf8' });
  } catch (e) {
    stdout = (e.stdout || '') + '\n' + (e.stderr || String(e));
  }
  const files = (await readFile(join(outDir, 'manifest.json'), 'utf8').catch(() => null));
  void files;
  let rows = [];
  try {
    const dir = await import('node:fs/promises');
    for (const f of await dir.readdir(outDir)) {
      if (!f.endsWith('.json')) continue;
      const data = JSON.parse(await dir.readFile(join(outDir, f), 'utf8'));
      // artifact-measure writes <page>-<width>.json and the body is the probe's own object, so the
      // width lives in the file name
      data.width = Number(f.replace(/.*-/, '').replace(/\.json$/, '')) || cfg.width;
      rows.push(data);
    }
  } catch (e) { console.log(`--- ${c}: cannot read results: ${e}`); }
  if (!rows.length) { console.log(`--- ${c}: NO REPORT\n${stdout}`); continue; }
  for (const r of rows) {
    console.log(`\n########## ${c}  (${cfg.page}, ${r.width ?? cfg.width}px) ##########`);
    console.log(r.report || r.out || JSON.stringify(r, null, 1));
    await writeFile(join(here, 'contrast', 'out', `${name}.txt`), r.report || r.out || '');
    await writeFile(join(here, 'contrast', 'out', `${name}.json`), JSON.stringify(r, null, 1));
  }
}
