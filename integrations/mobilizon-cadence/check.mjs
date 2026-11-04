#!/usr/bin/env node
/**
 * check.mjs - the one command that gates this integration.
 *
 *   node integrations/mobilizon-cadence/check.mjs
 *
 * It runs three things and stops at the first failure:
 *
 *   1. `build-workflow.mjs --check` - the generator's own structural checks (every `$('name')` resolves,
 *      every Code node parses, no URL off the configured host, no literal credential, the gate compares
 *      against `create`, every series has the fields `lib/core.mjs` needs).
 *   2. `node --test test/` - 36 tests. `test/core.test.mjs` runs the rules against the club's real calendar
 *      snapshot in `fixtures/`; `test/workflow.test.mjs` executes the *generated* Code nodes with a fake
 *      n8n sandbox, which is what catches a build that injects the wrong text.
 *   3. a live, credential-free read against the instance, then the same plan `simulate.mjs` would print -
 *      so a Mobilizon upgrade that breaks a query, or a renamed event, fails here rather than at 09:00 on a
 *      day with nobody watching.
 *
 * Step 3 is skipped with `--offline` (CI has no route to the LAN; see `.notes/integrations-subproject.md`
 * rule 4). Nothing here writes to the instance: the only write path in this directory is the n8n workflow,
 * and its dry run is enforced by the tests.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const OFFLINE = process.argv.includes("--offline");
const steps = [
  ["build --check", process.execPath, [here + "build-workflow.mjs", "--check"]],
  ["tests", process.execPath, ["--test", here + "test/core.test.mjs", here + "test/workflow.test.mjs"]],
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
