// A1 Compose the alert - Run Once For All Items. The head of the error watcher (`n8n/error-watcher.json`).
//
// What this workflow is for. Every fallible stage in the cadence has its error output wired to `21 Report
// error path`, and that is deliberate - but a *handled* error is invisible to n8n's own failure machinery: the
// vendor reference is explicit that an error leaving a wired output is "handled, even if the handler does
// nothing", so it is not recorded as a failure and a workflow-level error workflow never sees it. What a
// watcher still catches is everything the per-node wiring cannot see: a whole-run timeout, a crash between
// nodes, an error in a node nobody wired, a trigger that never activated, and the one throw this graph leaves
// unhandled on purpose (`24 Fail loudly`). That is the vendor set's non-negotiable for unattended jobs, and the
// operator un-parked it on 2026-11-05 (D206).
//
// So this node's job is to turn an Error Trigger payload into the same message shape cadence's own reporters
// compose - one title naming what broke, one detail saying what to look at - and nothing else. It is fast and
// it is dumb on purpose: the vendor's warning is that an error workflow runs synchronously inside the failing
// run, and "make external API calls that can themselves fail" is its first listed way to lose an error. The
// only thing this workflow touches is the alert channel.
//
// What it does NOT inject: `series.config.mjs` or `lib/queries.mjs`. A watcher that carries the monitored
// host's config is a watcher that can be brought down by the thing it watches, and `checkAlerter()` fails the
// build if a Mobilizon URL or GraphQL document ever appears in this file. `ALERTCFG` below is a literal the
// generator writes from `series.config.mjs` `ALERT` - the host, topic, priorities and the *name* of the token
// variable, never its value (D177).
//
// GENERATED FROM integrations/mobilizon-cadence/nodes/31-error-alert.js - edit that file and rebuild.

// @inject core
// @literal ALERTCFG

// The Error Trigger emits exactly one item. Read it by node name rather than relying on `$json`, so this node
// still says something true if a future n8n hands the payload in a different position; and read it defensively,
// because a watcher that throws on an unexpected payload is a watcher that failed to watch.
const payload = (() => {
  try { return $("A0 Error Trigger").first().json; } catch (e) { return $json ?? {}; }
})();

const f = errorAlertFields(payload);

// cadence already sent the message for this run: `24 Fail loudly` throws *after* `23 Notify on ntfy` delivered,
// so the unhandled throw that wakes this watcher is the loudness re-declaration, not a new incident. One
// notification per incident (D194) - and the suppressed composition stays in the execution log, so the record
// of "the watcher ran and chose not to speak" is readable after the fact.
const channelReady = canAlert(ALERTCFG);
const notifyNeeded = channelReady && !f.duplicate;

return [{ json: {
  ok: false,
  watcher: true,
  alertTitle: f.title,
  alertDetail: f.detail,
  summary: `WATCHER: ${f.title}\n${f.detail}`,
  failedAt: f.source.node,
  failedWorkflow: f.source.workflowId,
  executionId: f.source.executionId,
  duplicate: f.duplicate,
  suppressedWhy: f.duplicate
    ? "the failing step was cadence's own deliberate throw (24 Fail loudly), and cadence already delivered the alert from 23 - sending again would be the second message for one incident that D194 exists to prevent"
    : null,
  notifyNeeded,
  alertChannel: channelReady ? ALERTCFG.topic : "none configured",
  // `click` is the failed execution's own url when the payload carries one: for a failure, the thing to tap
  // open is the run that broke, not the page it was writing about.
  ntfy: alertBody({ alert: ALERTCFG, kind: "problem", title: f.title, detail: f.detail, click: f.click }),
  // Only used if ALERT.fallback is configured (it is not, D206): the same words in the second channel's shape.
  fallbackBody: ALERTCFG.fallback
    ? { content: `${f.title}\n${f.detail}`.slice(0, ALERTCFG.fallback.maxMessageChars || 1800) }
    : null,
} }];
