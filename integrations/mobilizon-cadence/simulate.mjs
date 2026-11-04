#!/usr/bin/env node
/**
 * simulate.mjs - what cadence would do, right now, with no credentials and no writes.
 *
 *   node integrations/mobilizon-cadence/simulate.mjs                      # read the live instance (public read only)
 *   node integrations/mobilizon-cadence/simulate.mjs --now 2026-11-22T13:00:00Z
 *   node integrations/mobilizon-cadence/simulate.mjs --fixture fixtures/group-history-2026-11-04.json
 *   node integrations/mobilizon-cadence/simulate.mjs --series mpls-social --json
 *   node integrations/mobilizon-cadence/simulate.mjs --fixture ... --save fixtures/new.json
 *
 * This is the reason the rules live in `lib/core.mjs` instead of inside n8n: the same functions run here,
 * so the plan can be checked against the club's real calendar from a terminal, without the n8n instance,
 * without a Mobilizon token, and without the possibility of writing anything. If this prints the date you
 * expect, the workflow's plan node - which is this code - prints it too.
 *
 * The one thing it cannot show is the write itself. That is covered by a dry run in n8n (`RUN.dryRun`) and
 * by the probe log in records/.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { INSTANCE, RUN, SERIES } from "./series.config.mjs";
import { READ_SERIES_HISTORY } from "./lib/queries.mjs";
import { planSeries, unwrap, wallClock } from "./lib/core.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f, d) => { const i = args.indexOf(f); return i < 0 ? d : args[i + 1]; };

const nowIso = opt("--now", new Date().toISOString());
if (Number.isNaN(Date.parse(nowIso))) { console.error(`--now is not an instant: ${nowIso}`); process.exit(2); }

const only = opt("--series", null);
const series = only ? SERIES.filter((s) => s.key === only) : SERIES;
if (!series.length) { console.error(`no series "${only}". known: ${SERIES.map((s) => s.key).join(", ")}`); process.exit(2); }

const now = new Date(nowIso);
const stampDaysFrom = (n) => new Date(now.getTime() + n * 86_400_000).toISOString().replace(/\.\d{3}Z$/, "Z");

async function readHistory(groupActor) {
  const url = `${INSTANCE.baseUrl}${INSTANCE.graphqlPath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: READ_SERIES_HISTORY,
      variables: { preferredUsername: groupActor, after: stampDaysFrom(-RUN.readBackDays), before: stampDaysFrom(RUN.readAheadDays), limit: RUN.readLimit },
    }),
  });
  const body = await res.json().catch(() => null);
  if (!body) throw new Error(`${url} answered ${res.status} with no body`);
  // The public document carries no `loggedPerson`, so an `errors` array here is a real failure - that is the
  // whole point of splitting the public read from the authenticated one.
  return unwrap(body, `read ${groupActor} from ${url}`);
}

const byGroup = new Map();
if (flag("--fixture")) {
  const raw = JSON.parse(readFileSync(opt("--fixture"), "utf8"));
  for (const s of series) byGroup.set(s.groupActor, raw.data ?? raw);
} else {
  for (const s of series) {
    if (byGroup.has(s.groupActor)) continue;
    byGroup.set(s.groupActor, await readHistory(s.groupActor));
  }
}
if (flag("--save")) {
  const out = opt("--save");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ note: `cadence read, saved ${new Date().toISOString()} from ${INSTANCE.baseUrl}${INSTANCE.graphqlPath}`, data: [...byGroup.values()][0] }, null, 2));
}

const plans = [];
for (const s of series) {
  const data = byGroup.get(s.groupActor);
  const group = data.group;
  if (!group) { plans.push({ seriesKey: s.key, action: "alert", reason: "group_not_found", notes: [] }); continue; }
  plans.push(planSeries({
    series: s,
    run: { ...RUN, dryRun: true }, // simulate never writes, whatever the config says
    events: group.organizedEvents?.elements ?? [],
    actorIds: { organizerActorId: "(not read - simulate sends no authenticated request)", attributedToId: group.id },
    nowIso,
  }));
}

if (flag("--json")) { console.log(JSON.stringify({ nowIso, plans }, null, 2)); }
else {
  console.log(`cadence simulation - instance ${INSTANCE.baseUrl}${INSTANCE.graphqlPath}`);
  console.log(`as of ${nowIso} (that is ${wallClock(nowIso, SERIES[0].timezone).date} in ${SERIES[0].timezone})`);
  console.log(`config: dryRun=${RUN.dryRun} horizon=${RUN.horizonDays}d series=${SERIES.length}\n`);
  for (const p of plans) {
    const head = `  ${p.seriesKey}: ${p.action}${p.candidate ? ` -> ${p.candidate.date} ${p.candidate.time} ${p.candidate.timezone}` : ""}`;
    console.log(head);
    if (p.candidate) console.log(`    instants   ${p.candidate.beginsOn} .. ${p.candidate.endsOn}`);
    if (p.anchor) console.log(`    from row   ${p.anchor.title} (${p.anchor.uuid}) begins ${p.anchor.beginsOn}, declares ${p.anchor.declaredTimezone}`);
    if (p.reason) console.log(`    why        ${p.reason}${p.note ? ` - ${p.note}` : ""}`);
    if (p.clashes) for (const c of p.clashes) console.log(`    already    ${c.title} ${c.uuid} ${c.url}`);
    for (const n of p.notes ?? []) console.log(`    note       ${n}`);
    if (p.createVars) {
      console.log(`    would send (createEvent arguments, verbatim):`);
      console.log(`      ${JSON.stringify(p.createVars)}`);
    }
    console.log();
  }
  console.log("nothing was written. in n8n the same decision runs with RUN.dryRun, and `create` only when you flip it.");
}

const alerts = plans.filter((p) => p.action === "alert");
process.exit(alerts.length ? 1 : 0);
