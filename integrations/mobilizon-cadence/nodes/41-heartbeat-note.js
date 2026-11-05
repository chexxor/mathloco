// H3 Compose the weekly note - Run Once For All Items. The reasoning node of the weekly heartbeat.
//
// What it answers, in one message a week: is the runtime alive, and is the club's calendar actually full?
// Both questions matter because every other message on this topic means "something happened" (D194), so
// silence means either "quiet" or "dead" and a person cannot tell (D205).
//
// What it does NOT do: plan. It never calls `planSeries`. The heartbeat is not a second planner - a second
// planner is a second opinion, and two vocabularies for one calendar is how a message stops being evidence. It
// reports the rows that exist, read in the same wall-clock terms the planner uses, and makes exactly one
// judgement: how many days until the next one, against the same 21-day runway A8's `check:ics` gates the site
// on (D188). Past it, the note goes to priority 4 and names the fixing command.
//
// There is no `Tell a person?` gate anywhere in this workflow, and `checkHeartbeat()` fails the build if one
// is ever added: a heartbeat that can be skipped is indistinguishable from the failure it exists to detect.
//
// GENERATED FROM integrations/mobilizon-cadence/nodes/41-heartbeat-note.js - edit that file and rebuild.

// @inject core
// @inject config

const cfg = (() => { try { return $("H1 Config").item.json; } catch (e) { return null; } })();
if (!cfg) throw new Error("H3: H1 Config produced no item, so the heartbeat has no series table to report on");

// A GraphQL error comes back as HTTP 200 with an `errors` array on this instance, so the response is unwrapped
// rather than trusted. If it throws, the run goes red - and if the watcher is linked, a person hears about a
// dead heartbeat read within a minute of it happening rather than up to a week later.
const body = (() => { try { return $("H2 Read the calendar").item.json; } catch (e) { return null; } })();
const data = unwrap(body, "H2 Read the calendar");
const group = data.group;
if (!group) {
  throw new Error(`H3: the instance returned no group for "${cfg.groupActor}" - the heartbeat cannot report on a calendar it cannot find`);
}

const eventsByGroup = { [cfg.groupActor]: group.organizedEvents?.elements ?? [] };
const report = heartbeatReport({
  series: cfg.SERIES,
  events: eventsByGroup,
  nowIso: cfg.runAt,
  runwayDays: cfg.HEARTBEAT.runwayDays,
});
const lines = heartbeatLines({ report, runwayDays: cfg.HEARTBEAT.runwayDays });

const head = report.rows.map((r) => `${r.series} ${r.nextDate ? `+${r.daysOut}d` : "EMPTY"}`).join(", ");
const title = report.kind === "heartbeat"
  ? `cadence heartbeat: alive, ${head}`
  : report.kind === "runway"
    ? `cadence heartbeat: THIN RUNWAY - ${head}`
    : `cadence heartbeat: NO UPCOMING ROW - ${head}`;

const detail = [
  `weekly heartbeat for ${cfg.groupActor} at ${cfg.runAt}`,
  ...lines,
  "",
  `cadence writes the next row itself; it fires daily at the hour in its own settings.timezone, and its kill switch is RUN.dryRun in series.config.mjs.`,
  `the site's own staleness gate (check:ics, ${cfg.HEARTBEAT.runwayDays}-day runway, D188) fails a publish on the same condition - this is the earlier half of it.`,
].join("\n");

return [{ json: {
  ok: report.kind === "heartbeat",
  heartbeat: true,
  kind: report.kind,
  todayDate: report.todayDate,
  rows: report.rows,
  empty: report.empty,
  far: report.far,
  alertTitle: title,
  summary: lines.join("\n"),
  // Not a decision node: this workflow has no gate, so every run that reaches here sends. The field exists so
  // the execution log says so out loud rather than leaving a reader to infer it from the wiring.
  notifyNeeded: canAlert(cfg.ALERT),
  alertChannel: canAlert(cfg.ALERT) ? cfg.ALERT.topic : "none configured",
  ntfy: alertBody({ alert: cfg.ALERT, kind: report.kind, title, detail }),
} }];
