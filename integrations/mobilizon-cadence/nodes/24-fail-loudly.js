// 24 Fail loudly - Run Once For All Items.
//
// Why this node exists at all. Every fallible stage in this workflow has its error output wired to
// `21 Report error path`, and each of those nodes now carries `"onError": "continueErrorOutput"` so the wire
// actually fires. That fix has a side effect the vendor docs name outright (n8n skills,
// `n8n-error-handling-official/references/ERROR_WORKFLOWS.md`, read 2026-11-05): a wired error output means
// the error is *handled* - "even if the handler does nothing" - so the run is not recorded as a failure and a
// workflow-level error workflow will not fire for it either. Before that fix the default `stopWorkflow` made
// every stage failure a red execution; making the alert path reachable would quietly have taken that away, and
// this workflow's own safety story is "a red execution is what a person notices" (08 Report throws on purpose
// for exactly that reason).
//
// So the loudness is re-declared explicitly: after the message is on its way, this node throws. The execution
// ends red, the error text names the stage, and its error output is deliberately **not** wired - which is the
// one shape a workflow-level error workflow still catches (D206: the operator un-parked that item on
// 2026-11-05, and `n8n/error-watcher.json` is the watcher). That difference between "handled and swallowed"
// and "handled and reported" has a cost, and the cost is a second notification: this throw is unhandled, so a
// linked watcher fires on it. The marker below is what lets the watcher recognise its own workflow's
// loudness and stay quiet, because cadence already sent the message from `23 Notify on ntfy` (D194's silence
// rule is about not training a person to skim).
//
// GENERATED FROM integrations/mobilizon-cadence/nodes/24-fail-loudly.js - edit that file and rebuild.

// @inject core

const allOf = (name) => {
  try { return $(name).all(); } catch { return null; } // that path did not run in this execution
};

// Both reporters emit `{ ok, alertTitle, summary }`; only one of them ran for any given failure, and on a
// clean run neither said anything was wrong.
const reporters = [
  { name: "21 Report error path", items: allOf("21 Report error path") },
  { name: "22 Report a problem", items: allOf("22 Report a problem") },
].filter((r) => r.items && r.items.length);

const bad = reporters
  .map((r) => ({ ...r, rows: r.items.map((i) => i.json).filter((j) => j && j.ok === false) }))
  .filter((r) => r.rows.length);

if (bad.length) {
  const lines = bad.flatMap((r) => r.rows.map((j) => `${r.name}: ${j.alertTitle ?? "(no title)"}\n${j.summary ?? ""}`));
  // Throwing with the reporters' own words, so the failed-execution line and the ntfy message a person just
  // received say the same thing. Two vocabularies for one incident is how a log stops being evidence.
  // The message starts with core.mjs' LOUD_THROW marker: that is the string the error watcher matches on
  // before deciding not to send a second notification for a run that already sent its own.
  throw new Error(`${LOUD_THROW}. The alert was sent; the run is kept red on purpose (24 Fail loudly).\n${lines.join("\n\n")}`);
}

// Nothing needed a red execution. Emit what this node saw, so the last line of the log says the loop closed:
// which reporters ran, and that neither said anything was wrong. ntfy's receipt (message id, topic, time) is on
// 23's output one step upstream, where a person who doubts the send can read it.
return {
  json: {
    ok: true,
    loudness: "nothing to keep red",
    reporters: reporters.map((r) => ({ node: r.name, items: r.items.length })),
    delivered: reporters.length > 0 || (allOf("23 Notify on ntfy") ?? []).length > 0,
  },
};
