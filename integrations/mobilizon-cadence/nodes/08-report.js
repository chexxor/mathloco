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

const label = { create: "created", would_create: "dry run - would create", skip: "nothing to do", alert: "NEEDS A PERSON" };
const lines = [];
lines.push(`cadence: ${rows.length} series, ${created.length} event(s) written, at ${plans[0] && plans[0].todayDate}`);
for (const r of rows) {
  lines.push(`- ${r.series}: ${label[r.action] || r.action} ${r.date} ${r.beginsOn}`.trimEnd());
  if (r.why) lines.push(`    why: ${r.why}`);
  if (r.url) lines.push(`    url: ${r.url}`);
  if (r.audit) lines.push(`    audit: ${r.audit}`);
  for (const n of r.notes || []) lines.push(`    note: ${n}`);
  if (r.wouldSend) lines.push(`    payload: ${JSON.stringify(r.wouldSend)}`);
}
const summary = lines.join("\n");

if (problems.length) throw new Error(`cadence wrote an event but the audit disagrees:\n${problems.join("\n")}\n\n${summary}`);

return { json: { ok: true, written: created.length, series: rows.length, summary, rows } };
