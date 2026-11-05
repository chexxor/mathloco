// 21 Report error path - Run Once For All Items.
//
// The only node in this workflow that reads `$json.error`. It says *which* stage broke, because a red dot on
// a canvas is not an alert, and it composes the message a person would need - the publishing itself is node
// `23 Notify on ntfy`, so the words and the wire are separate and each can be reviewed on its own (D194).
//
// It throws when no stage reports an error. That is deliberate: this node is only reachable from an error
// output, so arriving here with nothing to report means the graph changed under it, and a reporter that
// quietly prints "all good" from the failure path is worse than one that fails loudly.
//
// GENERATED FROM integrations/mobilizon-cadence/nodes/21-report-error.js - edit that file and rebuild.

// @inject core

const stages = [
  ["read", "02 Read the series history"], ["sign in", "03 Sign in"], ["plan", "04 Plan & decide"],
  ["write", "06 Create event"], ["audit", "07 Audit the date"], ["report", "08 Report"],
];
const failed = [];
for (const [label, nodeName] of stages) {
  let item = null;
  try { item = $(nodeName).item; } catch (e) { continue; }   // that stage did not run
  if (item && item.json && item.json.error) failed.push([label, item.json.error]);
}
if (!failed.length) throw new Error('the error branch ran but no stage reported an error - this reporter is out of date');

const who = failed.map(([label]) => label).join("+");
const detail = String(failed[0][1].message || failed[0][1]).slice(0, 900);

// The channel lives on 01's item. If 01 is the stage that failed, there is no config item and therefore no
// channel - which this node states in its own output instead of throwing a second time, because "nobody could
// be told" is the fact worth having after the fact.
const cfgItem = (() => { try { return $('01 Config').item; } catch (e) { return null; } })();
const ALERTCFG = cfgItem && cfgItem.json ? cfgItem.json.ALERT : null;

return [{ json: {
  ok: false,
  failedAt: failed.map(([label]) => label),
  alertTitle: 'cadence failed at ' + who,
  alertDetail: detail,
  summary: 'CADENCE PROBLEM: ' + who + ' failed - ' + detail.slice(0, 300),
  notifyNeeded: canAlert(ALERTCFG),
  alertChannel: canAlert(ALERTCFG) ? ALERTCFG.topic : 'none configured',
  ntfy: alertBody({ alert: ALERTCFG, kind: 'problem', title: 'cadence failed at ' + who, detail }),
} }];
