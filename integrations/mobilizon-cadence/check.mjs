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
 *   2. `node --test <every file in test/>` - the test count is printed by the runner rather than quoted here,
 *      because a count in a comment is a number that rots on the next commit. Layers are discovered from the
 *      directory so a new one cannot be forgotten. `test/core.test.mjs` runs the rules against the club's real calendar snapshot in
 *      `fixtures/`; `test/workflow.test.mjs` executes the *generated* Code nodes with a fake n8n sandbox,
 *      which is what catches a build that injects the wrong text; `test/import.test.mjs` plants defects in a
 *      copy of the artifact and requires the import checker to notice each one.
 *   3. `verify-import.mjs --selftest` - the transport layer: an export fed back into the checker must match
 *      the artifact, and every planted break in it must be caught.
 *   4. a live, credential-free read against the instance, then the same plan `simulate.mjs` would print -
 *      so a Mobilizon upgrade that breaks a query, or a renamed event, fails here rather than at 09:00 on a
 *      day with nobody watching.
 *   5. `probe-schema.mjs` - the **negatives**. The design rests on two absences (D175 no recurrence object,
 *      D186 no server-side importer), and a gate that only checks the positives stays silent the day a
 *      premise dies. One anonymous introspection POST; it fails only on those two premises (the Mobilizon
 *      workspace asked for this signal, 2026-11-04, so both workspaces hear it from one place).
 *   6. `probe-ntfy.mjs` - **the alert channel** (D194). The workflow composes a message; this asks the running
 *      server whether a stranger can post to the topic, whether a stranger can read it, and - only if
 *      `$NTFY_TOKEN` is present in the shell - whether this workspace can actually publish. The first two need
 *      no credentials, so they run in CI; the third prints a loud SKIP rather than passing silently.
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
  ["error watcher build --check (D206)", process.execPath, [here + "build-alerter.mjs", "--check"]],
  ["heartbeat build --check (D205)", process.execPath, [here + "build-heartbeat.mjs", "--check"]],
  [`tests (${testFiles.length} files)`, process.execPath, ["--test", ...testFiles]],
  ["import check (round trip + planted defects)", process.execPath, [here + "verify-import.mjs", "--selftest"]],
];
if (!OFFLINE) steps.push(
  ["live read + plan", process.execPath, [here + "simulate.mjs"]],
  ["schema premises (D175 no recurrence, D186 no importer)", process.execPath, [here + "probe-schema.mjs"]],
  ["ntfy channel (private topic; send only with $NTFY_TOKEN)", process.execPath, [here + "probe-ntfy.mjs"]],
);

let failed = null;
for (const [label, cmd, args] of steps) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  const code = r.status ?? 1;
  console.log(`${code === 0 ? "ok  " : "FAIL"}  ${label}${code ? ` (exit ${code})` : ""}`);
  if (code !== 0) { failed = label; break; }
}
const green = OFFLINE
  ? "cadence check green: artifact builds, rules pass (offline: no live read, no schema premises, no channel probe)"
  : "cadence check green: artifact builds, rules pass, plan matches the live instance, the alert topic is private";
console.log(failed ? `\ncadence check failed at: ${failed}` : `\n${green}`);
process.exit(failed ? 1 : 0);
