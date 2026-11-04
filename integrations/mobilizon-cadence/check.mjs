#!/usr/bin/env node
/**
 * check.mjs - the one command that gates this integration.
 *
 *   node integrations/mobilizon-cadence/check.mjs
 *
 * It runs four things and stops at the first failure:
 *
 *   1. `build-workflow.mjs --check` and `build-probe.mjs` - the generators' own structural checks (every
 *      `$('name')` resolves, every Code node parses, no URL off the configured host, no literal credential,
 *      the gate compares against `create`, every series has the fields `lib/core.mjs` needs) and, for the
 *      probe, its read-only argument (no write node, no login call, no credential value on any output).
 *   2. `node --test <every file in test/>` - 59 tests, discovered from the directory so a new layer cannot
 *      be forgotten. `test/core.test.mjs` runs the rules against the club's real calendar snapshot in
 *      `fixtures/`; `test/workflow.test.mjs` executes the *generated* Code nodes with a fake n8n sandbox,
 *      which is what catches a build that injects the wrong text; `test/import.test.mjs` plants defects in a
 *      copy of the artifact and requires the import checker to notice each one.
 *   3. `verify-import.mjs --selftest` - the transport layer: an export fed back into the checker must match
 *      the artifact, and every planted break in it must be caught.
 *   4. a live, credential-free read against the instance, then the same plan `simulate.mjs` would print -
 *      so a Mobilizon upgrade that breaks a query, or a renamed event, fails here rather than at 09:00 on a
 *      day with nobody watching.
 *
 * Step 3 is skipped with `--offline` (CI has no route to the LAN; see `.notes/integrations-subproject.md`
 * rule 4). Nothing here writes to the instance: the only write path in this directory is the n8n workflow,
 * and its dry run is enforced by the tests.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const OFFLINE = process.argv.includes("--offline");
// Every file in test/ is a layer, discovered rather than listed: `node --test <dir>` does not accept a
// directory, and a hand-kept list is how a new layer stops being gated.
const testFiles = readdirSync(here + "test").filter((f) => f.endsWith(".test.mjs")).sort().map((f) => `${here}test/${f}`);
const steps = [
  ["build --check", process.execPath, [here + "build-workflow.mjs", "--check"]],
  ["probe build --check", process.execPath, [here + "build-probe.mjs", "--check"]],
  [`tests (${testFiles.length} files)`, process.execPath, ["--test", ...testFiles]],
  ["import check (round trip + planted defects)", process.execPath, [here + "verify-import.mjs", "--selftest"]],
];
if (!OFFLINE) steps.push(["live read + plan", process.execPath, [here + "simulate.mjs"]]);

let failed = null;
for (const [label, cmd, args] of steps) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  const code = r.status ?? 1;
  console.log(`${code === 0 ? "ok  " : "FAIL"}  ${label}${code ? ` (exit ${code})` : ""}`);
  if (code !== 0) { failed = label; break; }
}
console.log(failed ? `\ncadence check failed at: ${failed}` : "\ncadence check green: artifact builds, rules pass, plan matches the live instance");
process.exit(failed ? 1 : 0);
