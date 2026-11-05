// 08 Report - Run Once For All Items.
//
// The execution log is this workflow's ledger. It has no database and no n8n static data on purpose: the
// club's calendar is the state, so the next run re-derives everything and a lost execution history costs
// nothing. That only works if this node prints, in plain words, what happened and why - including the runs
// that deliberately wrote nothing.
//
// It also carries the last safety rail: if the audit of a created date does not come back clean, this node
// throws on purpose. A red execution is the alarm; nothing here is subtle, because a calendar error is
// noticed by members and by nobody else.
//
// GENERATED FROM integrations/mobilizon-cadence/nodes/08-report.js - edit that file and rebuild.

// @inject core

const allOf = (name) => {
  try { return $(name).all(); } catch { return []; } // the branch never ran - every series skipped, which is a normal night
};
const cfgItem = (() => { try { return $('01 Config').item; } catch { return null; } })();
const ALERTCFG = cfgItem && cfgItem.json ? cfgItem.json.ALERT : null;

const plans = allOf('04 Plan & decide').map((i) => i.json);
const created = allOf('06 Create event')
  .map((i) => unwrap(i.json, '06 create event').createEvent)
  .filter(Boolean);
const audits = allOf('07 Audit the date')
  .map((i) => {
    const data = unwrap(i.json, '07 audit the date');
    return (data.group && data.group.organizedEvents && data.group.organizedEvents.elements) || [];
  });

const rows = [];
const problems = [];

for (const plan of plans) {
  const row = {
    series: plan.seriesKey,
    action: plan.action,
    date: plan.candidate ? plan.candidate.date : "-",
    beginsOn: plan.candidate ? plan.candidate.beginsOn : "-",
    endsOn: plan.candidate ? plan.candidate.endsOn : "-",
    why: plan.reason || (plan.note ?? ""),
    audit: "",
    url: "",
    notes: plan.notes || [],
  };

  // Pair the created event with its plan by what was written (title + instant), not by item order: the
  // branches below preserve order today, but a rule that depends on that breaks the first time someone
  // adds a node.
  const mine = created.find((e) =>
    plan.candidate && e &&
    normTitle(e.title) === normTitle((plan.createVars || {}).title) &&
    Date.parse(e.beginsOn) === Date.parse(plan.candidate.beginsOn));

  if (mine) {
    row.url = mine.url;
    row.id = mine.id;
    row.uuid = mine.uuid;
    const windowRows = audits.find((list) => list.some((r) => r.uuid === mine.uuid)) || [].concat(...audits);
    const audit = auditDate({ plan, created: mine, windowRows });
    row.audit = audit.ok ? `ok (${audit.seen} row(s) on the date)` : `PROBLEM: ${audit.problems.join(" | ")}`;
    if (!audit.ok) problems.push(...audit.problems.map((p) => `${plan.seriesKey}: ${p}`));
  }

  if (plan.action === "would_create") row.wouldSend = plan.createVars;
  rows.push(row);
}

// One vocabulary for "what happened", shared with the alert body and with simulate.mjs's rehearsal (D194):
// three places that each format the run are three chances to rehearse a report the workflow never sends.
const summary = summaryLines({ rows, written: created.length, todayDate: plans[0] && plans[0].todayDate }).join("\n");
// The alert gets the same lines minus the payload dumps (see summaryLines): a phone has a message cap, and a
// single copied description is enough to push every date the alert exists to report off the end of it.
const alertDetail = summaryLines({ rows: rows.map((r) => ({ ...r, wouldSend: undefined })), written: created.length, todayDate: plans[0] && plans[0].todayDate }).join("\n");

if (problems.length) throw new Error(`cadence wrote an event but the audit disagrees:\n${problems.join("\n")}\n\n${summary}`);

/* Should a person be told? (D194) Cadence runs every morning, so a message that means "nothing happened" is
   the failure mode: it trains a person to skim past the channel, and the messages that matter go unread with
   it. So this reports only when the run *did* something - wrote an event, or (in a dry run) decided exactly
   what it would write, which is the evidence a dry run was worth watching. A plain skip stays silent, and the
   execution log stays the record. */
const wouldWrite = plans.filter((p) => p.action === "would_create").length;
const kind = runKind({ written: created.length, wouldWrite });
const notifyNeeded = Boolean(kind) && canAlert(ALERTCFG);
const ntfy = notifyNeeded
  ? alertBody({
      alert: ALERTCFG,
      kind,
      title: created.length
        ? `cadence wrote ${created.length} event(s)`
        : `cadence dry run: would write ${wouldWrite}`,
      detail: alertDetail,
    })
  : null;

return {
  json: {
  ok: true,
  written: created.length,
  wouldWrite,
  series: rows.length,
  summary,
  rows,
  // Stated even when it is false, so a dry run's log answers "would a person have been told?" without
  // having to know how the graph is wired.
  notifyNeeded,
  alertChannel: canAlert(ALERTCFG) ? ALERTCFG.topic : "none configured",
  ntfy,
  },
};
