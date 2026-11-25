// probe-path.mjs — one home for "spawn a probe that lives beside this script" (D496).
//
// WHY THIS FILE EXISTS. `npm run round21` exited 1 at tip 0c96cad with
// `Cannot find module '/home/chexxor/Git/mathloco/logo-geometry.mjs'` @measured 2026-11-25 (Linux native,
// Node 24.22.1): the D487 rename of design/mark-*.mjs -> design/logo-*.mjs swallowed the `design/` prefix in
// the SPAWN LITERALS, not just in prose, and a bare name in a spawn array is resolved against the PROCESS cwd
// (the repo root for npm, scripts/gate-run.mjs and CI) rather than against the script that wrote it. D489
// fixed the same class in design/logo-check.mjs by resolving from the script's own home; this is that pattern
// lifted out so every round and probe uses the one rule instead of re-deriving it.
//
// The rule, in one sentence: a probe is named by a path, never by a bare filename, and the path is resolved
// where the probe actually is - beside the spawner for a design/ probe, from the repo root for a scripts/ one.
//
// It REFUSES rather than guesses: if neither home has the file, the error names both absolute paths it tried
// and the class of mistake, because a gate that ENOENTs reports a finding about the page instead of about
// itself (D489).
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The directory a script lives in, from its own import.meta.url. */
export const scriptHome = (url) => dirname(fileURLToPath(url));

/**
 * Resolve a spawned probe to an absolute path.
 *   fromUrl - the CALLER's import.meta.url (not this module's)
 *   name    - 'logo-geometry.mjs' (looked up beside the caller, then at the repo root)
 *             or 'scripts/check-favicon.mjs' (resolved from the repo root, as those calls already do)
 */
export function probePath(fromUrl, name) {
  if (name.includes('/')) {
    const p = resolve(name);
    if (!existsSync(p)) {
      throw new Error(`spawn probe "${name}" does not exist at ${p} — the path a spawner names must be a file `
        + 'this tree actually has (D496).');
    }
    return p;
  }
  const beside = resolve(scriptHome(fromUrl), name);
  if (existsSync(beside)) return beside;
  const atRoot = resolve(name);
  if (existsSync(atRoot)) return atRoot;
  throw new Error(`spawn probe "${name}" resolves to nothing: tried ${beside} and ${atRoot}. A bare filename in a `
    + 'spawn array is resolved against the PROCESS cwd (the repo root for npm, gate-run.mjs and CI), not against '
    + "the script that wrote it — name the directory, or resolve it from the spawner's own home (D496).");
}
