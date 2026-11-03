// dist-fresh.mjs — does the `dist/` on disk belong to the working tree that is asking about it? (D156)
//
// Why this exists (measured 2026-11-03, Linux, native): `verify:browser` deliberately does NOT build —
// `check:render:dist` is the `--no-build` form so the browser gates measure the artifact `verify` just
// produced. That is only safe while `dist/` is the build of *this* tree. A branch switch updates the mtime
// of every file in `src/` and leaves `dist/` exactly as the previous branch built it, and the gates then
// measure a page that no longer exists. Observed on a trial merge of the three branches awaiting a grant:
// the merged tree ran `verify:browser` against the pre-merge `dist/` and `check:render` reported **4 FAILs**
// — a `--color-rule` ring at 3.01 inside / 2.88 outside, straddling `paper` and `tint` — which is the exact
// defect the branch being tested had removed. Eighty seconds of browser time and a red gate describing code
// that was not in the tree. The inverse is worse: a stale `dist/` can also stand for a fix that was never built.
//
// The rule, and its cost:
//   fresh  - the newest mtime under `dist/client` + `dist/server` is >= the newest under the build inputs.
//   cost   - one recursive stat walk of `src/`, `public/` and a handful of config files: measured at **0.03s**
//            on this rig (Linux, native, 2026-11-03, `time node design/dist-fresh.mjs`), against a 4.7s build
//            and a 68s browser set. So: refuse, do not rebuild. Rebuilding on a guess spends 5s every run to
//            avoid a 68s measurement of the wrong artifact; refusing spends 0.03s and names the file to blame.
//            `npm run build` is one line.
//   escape - `GATE_ALLOW_STALE=1` measures the stale build anyway, for the times you are deliberately
//            looking at a kept artifact (a review build with the shot-card overlay is the standing case).
//            It is an env var, not a flag, so it cannot be set by a script in the repo and forgotten.
//
// What counts as an input is what the build reads, not everything git tracks. `design/` is deliberately NOT
// an input: the probes write their own reports under `design/`, so including it would make every gate run
// stale the next gate run. A `package-lock.json`-only dependency bump slips through (its output changes but
// no listed input does) — that is a known hole, and `npm run verify` rebuilding anyway is what covers it.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const INPUTS = ['src', 'public', 'astro.config.mjs', 'svelte.config.mjs', 'tsconfig.json', 'package.json', 'wrangler.toml'];
const OUTPUTS = ['dist/client', 'dist/server'];

function newest(target, root, best = { mtimeMs: 0, path: null }) {
  const abs = join(root, target);
  let st;
  try { st = statSync(abs); } catch { return best; }
  if (!st.isDirectory()) return st.mtimeMs > best.mtimeMs ? { mtimeMs: st.mtimeMs, path: target } : best;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    best = newest(join(target, entry.name), root, best);
  }
  return best;
}

/**
 * @returns {{present: boolean, fresh: boolean, built: {mtimeMs: number, path: string|null},
 *            input: {mtimeMs: number, path: string|null}, allowed: boolean}}
 */
export function distState(root = process.cwd()) {
  const present = existsSync(join(root, 'dist/client/index.html'));
  let built = { mtimeMs: 0, path: null };
  for (const o of OUTPUTS) built = newest(o, root, built);
  let input = { mtimeMs: 0, path: null };
  for (const i of INPUTS) input = newest(i, root, input);
  return {
    present,
    // No dist at all is not "stale" — every caller already has its own missing-dist message, which is clearer.
    fresh: !present || built.mtimeMs >= input.mtimeMs,
    built,
    input,
    allowed: process.env.GATE_ALLOW_STALE === '1',
  };
}

/** One line a probe can print: what is stale, which file made it stale, what to run. */
export function staleLine(s) {
  const age = (s.input.mtimeMs - s.built.mtimeMs) / 1000;
  return `dist/ is OLDER than the tree asking about it — ${s.input.path} (mtime) is ${age.toFixed(0)}s newer than ${s.built.path}. `
    + `The numbers below would describe a build this tree did not make. Run \`npm run build\` first `
    + `(or GATE_ALLOW_STALE=1 to measure it knowingly).`;
}

// `node design/dist-fresh.mjs` — ask the question directly: is the dist on disk this tree's build?
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const s = distState();
  const when = (t) => (t.mtimeMs ? new Date(t.mtimeMs).toISOString() : 'never');
  console.log(`dist present : ${s.present}`);
  console.log(`newest build : ${when(s.built)}  ${s.built.path ?? ''}`);
  console.log(`newest input : ${when(s.input)}  ${s.input.path ?? ''}`);
  console.log(`verdict      : ${s.fresh ? 'fresh — the probes may read it' : 'STALE — run npm run build first'}`);
  process.exit(s.fresh ? 0 : 1);
}
