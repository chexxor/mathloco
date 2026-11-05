// H1 Config - Run Once For All Items. Head of the weekly heartbeat (`n8n/heartbeat.json`).
//
// One item, carrying the series table, the heartbeat's own window, and the exact GraphQL document the next
// node will send - the same document cadence's `02` sends, from the same file (`lib/queries.mjs`), so the
// heartbeat and the cadence cannot disagree about what "the group's calendar" means.
//
// It carries **no credential and asks for none**. `READ_SERIES_HISTORY` is the public document (measured
// 2026-11-04: it answers unauthenticated, which is why `simulate.mjs` can plan from a laptop with no token),
// so the heartbeat is proof-of-life without being a second holder of the Mobilizon password. `checkHeartbeat()`
// enforces that: no credential block, no Authorization header, and no write or sign-in vocabulary anywhere in
// the document.
//
// GENERATED FROM integrations/mobilizon-cadence/nodes/40-heartbeat-config.js - edit that file and rebuild.

// @inject config
// @inject queries

const groups = [...new Set(SERIES.map((s) => s.groupActor))];
if (groups.length !== 1) {
  // Same refusal as cadence's 01 Config: this workflow reads one group per run. Saying so beats planning one
  // group and reporting the other as empty, which would look like a missing meeting.
  throw new Error(
    `H1 Config: series live in ${groups.length} different groups (${groups.join(", ")}). ` +
    "The heartbeat reads one group per run; add a second copy of the chain before adding a series elsewhere.",
  );
}

const now = new Date();
const stampDaysFrom = (n) =>
  new Date(now.getTime() + n * 86_400_000).toISOString().replace(/\.\d{3}Z$/, "Z");

return [{
  json: {
    runAt: now.toISOString(),
    groupActor: groups[0],
    SERIES, HEARTBEAT, ALERT,
    query: {
      // Forward-only window: the question is "what is coming", not "what was". The lower bound is today, so a
      // long club history never makes the weekly note's response grow without limit.
      readSeriesHistory: READ_SERIES_HISTORY,
      readSeriesHistoryVars: {
        preferredUsername: groups[0],
        after: stampDaysFrom(0),
        before: stampDaysFrom(HEARTBEAT.readAheadDays),
        limit: HEARTBEAT.readLimit,
      },
    },
  },
}];
