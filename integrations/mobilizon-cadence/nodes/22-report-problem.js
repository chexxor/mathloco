// 22 Report a problem - Run Once For All Items.
//
// A plan that *alerts* (a rename nobody told the config about, a clock mismatch, every row cancelled) does not
// throw - it stops and says why. This node folds that stop into the same failure shape a thrown error gets, so
// "the workflow broke" and "the workflow refused" arrive at a person looking alike: a title naming the series
// and a detail that says what to look at (D194).
//
// It runs on every clean run too, which is why it has a `notifyNeeded: false` branch: cadence runs every
// morning, and a message that means "nothing to report" would train a person to ignore the channel.
//
// GENERATED FROM integrations/mobilizon-cadence/nodes/22-report-problem.js - edit that file and rebuild.

// @inject core

const cfgItem = (() => { try { return $('01 Config').item; } catch (e) { return null; } })();
const ALERTCFG = cfgItem && cfgItem.json ? cfgItem.json.ALERT : null;
const channel = canAlert(ALERTCFG) ? ALERTCFG.topic : 'none configured';

const plans = $('04 Plan & decide').all().map((i) => i.json).filter((p) => p.action === 'alert');
if (!plans.length) {
  return [{ json: { ok: true, summary: 'no alerts to report', notifyNeeded: false, alertChannel: channel, ntfy: null } }];
}

const lines = plans.map((p) => p.seriesKey + ": " + (p.reason || "alert") + " - " + (p.note || ""));
const detail = lines.join('\n').slice(0, 900);
const title = 'cadence paused: ' + plans.map((p) => p.seriesKey).join(', ');

return [{ json: {
  ok: false,
  failedAt: ['plan'],
  alertTitle: title,
  alertDetail: detail,
  summary: 'CADENCE PROBLEM: ' + lines.join('\n'),
  notifyNeeded: canAlert(ALERTCFG),
  alertChannel: channel,
  ntfy: alertBody({ alert: ALERTCFG, kind: 'problem', title, detail }),
} }];
