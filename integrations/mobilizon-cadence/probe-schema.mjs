#!/usr/bin/env node
/**
 * probe-schema.mjs — asserts the two NEGATIVES this whole integration rests on, against the live instance.
 *
 *   node integrations/mobilizon-cadence/probe-schema.mjs
 *
 * Everything in `integrations/mobilizon-cadence/` exists because of two absences, both measured and both
 * recorded as decisions:
 *
 *   1. **Mobilizon has no recurrence.** No type, field or mutation named series / recurrence / RRULE;
 *      `createEvent` and `updateEvent` take no recurrence argument (**D175**). That is why the unit of work
 *      is the next occurrence written through GraphQL, and why `lib/core.mjs` owns a date rule at all.
 *   2. **Mobilizon has no server-side importer.** No import mutation, and the `bots` table is an identity
 *      waiting for one (**D186**, confirmed independently in the Mobilizon workspace from `lib/mobilizon/actors/bot.ex`
 *      and the Oban crontab, which fetches no external feed).
 *
 * A gate that only checks the positives goes quiet the day a premise dies. The Mobilizon workspace asked for
 * exactly this (`answer` exchange, 2026-11-04): "assert the negative ... so the day that stops being true,
 * both workspaces hear about it from the same signal." Upstream `!1636` (a `recurrence_rules` table) and any
 * future core importer are the two changes that would flip these, and this probe is the tripwire for both —
 * for the *running instance*, not for upstream's repo.
 *
 * It is **read-only and credential-free**: one anonymous introspection POST. Baseline measured 2026-11-04 on
 * Mobilizon 5.2.4 (`mobilizon.labradorius.com`): 91 mutations, 42 queries, 190 types, introspection enabled.
 *
 * Refuses to be a rumour machine: it FAILs only on the two premises above. Anything else it finds (bot-ish
 * fields, feed queries, statistics) is printed as a finding with no verdict, because a gate that cries wolf
 * trains the reader to ignore the day it is serious.
 */
import { INSTANCE } from "./series.config.mjs";

/**
 * Matched on **name tokens**, never on a substring. A first attempt used `/(import|ics|ical)/i` and hit
 * `categoryStatistics` and `statistics` — "stat**ics**" — which is how a schema gate becomes noise. The names
 * are split on camelCase and `_` first, and a token counts only if it is one of these words.
 */
const IMPORT_TOKENS = new Set(["import", "imports", "imported", "importing", "importer", "ics", "ical", "icalendar"]);
const RECURRENCE_TOKENS = new Set(["series", "recurrence", "recurring", "recur", "rrule", "occurrence", "occurrences"]);
/** Printed, never failed on: Mobilizon legitimately has feed and bot-adjacent names, and `bots` in particular
 *  is the interesting one — D186's conclusion is "an identity waiting for an importer", so a new `bot` field
 *  would be the earliest sign a core importer is landing. Watching it is not the same as failing on it. */
const WATCH_TOKENS = new Set(["bot", "bots", "feed", "feeds", "subscribe", "subscription", "webhook", "scheduler"]);

const tokens = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[\s_]+/).filter(Boolean);
const hits = (names, set) => names.filter((n) => tokens(n).some((t) => set.has(t.toLowerCase())));

const body = {
  query: `{ __schema { mutationType { fields { name } } queryType { fields { name } } types { name } } }`,
};

const url = new URL(INSTANCE.graphqlPath, INSTANCE.baseUrl).toString();
let schema;
try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.__schema) {
    console.error(`FAIL  introspection at ${url} — HTTP ${res.status}, and the body is not a schema:\n${JSON.stringify(json).slice(0, 400)}`);
    console.error(`A Mobilizon upgrade that disables introspection breaks this probe rather than the premise. If the instance\ncloses introspection on purpose, that is a decision to record (and this probe becomes a versioned query),\nnot a bug to route around.`);
    process.exit(1);
  }
  schema = json.data.__schema;
} catch (e) {
  console.error(`FAIL  cannot reach ${url}: ${e.message}`);
  console.error(`This probe is not run under \`check.mjs --offline\`; if you got here, the route is the problem (see\n.notes/runbooks/ for the reachability probe, and D182 on the instance being reachable from outside the LAN).`);
  process.exit(1);
}

const mutations = (schema.mutationType?.fields ?? []).map((f) => f.name);
const queries = (schema.queryType?.fields ?? []).map((f) => f.name);
const types = (schema.types ?? []).map((t) => t.name);
console.log(`schema at ${url}: ${mutations.length} mutations, ${queries.length} queries, ${types.length} types`);

const problems = [];
const importHits = [...hits(mutations, IMPORT_TOKENS), ...hits(queries, IMPORT_TOKENS), ...hits(types, IMPORT_TOKENS)];
const recurHits = [...hits(mutations, RECURRENCE_TOKENS), ...hits(queries, RECURRENCE_TOKENS), ...hits(types, RECURRENCE_TOKENS)];

// D176 already proved what an unverified assumption about the schema costs: the naive implementation added 14
// days to an instant and put the club's social at 06:00 Central. A premise flip is a decision point, so the
// failure names the decision and the record rather than just exiting 1.
if (recurHits.length) {
  problems.push(
    `recurrence vocabulary appeared on the live instance: ${recurHits.join(", ")}\n` +
    `  D175 ("Mobilizon has no recurrence, so cadence writes the next occurrence") may be obsolete.\n` +
    `  Re-run the introspection walk in records/2026-11-04-mobilizon-api-probe.md, then decide whether\n` +
    `  lib/core.mjs's date rule is still the right shape or should become a series write.`,
  );
}
if (importHits.length) {
  problems.push(
    `import vocabulary appeared on the live instance: ${importHits.join(", ")}\n` +
    `  D186 ("the ICS-feed-import alternative is measured and parked") was about core having no importer.\n` +
    `  Check whether this is a core field or a plugin, and whether it runs under the account you authorise\n` +
    `  it with (the Mobilizon workspace's finding: both third-party importers create AND update, and the\n` +
    `  behaviour when a source event simply disappears is unknown in both).`,
  );
}

const watch = [...new Set([...hits(mutations, WATCH_TOKENS), ...hits(queries, WATCH_TOKENS), ...hits(types, WATCH_TOKENS)])];
console.log(`watched, not gated: ${watch.length ? watch.join(", ") : "(none of the watched tokens appear)"}`);
console.log(`  why not gated: Mobilizon has legitimate feed queries and a \`bots\` table with no GraphQL surface\n  (D186). The absence of bot-ish fields is the finding; a gate would be a rumour machine.`);

if (problems.length) {
  console.error(`\nSCHEMA PREMISE CHECK: FAIL — a premise this integration was built on changed shape`);
  for (const p of problems) console.error(`\n- ${p}`);
  process.exit(1);
}
console.log(`\nSCHEMA PREMISE CHECK: PASS — no recurrence object, no import mutation (the premises of D175 and D186 still hold)`);
