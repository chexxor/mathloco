// 01 Config - Run Once For All Items.
//
// One item, carrying the whole configuration and the exact GraphQL documents the next nodes will send. The
// requests are built here rather than typed into the HTTP nodes' bodies so the query text has exactly one
// home (`lib/queries.mjs`, injected below) and the HTTP nodes stay boring enough to review at a glance.
//
// Nothing secret is in here. The Mobilizon password never enters this node: node 03 reads it from an
// n8n environment variable directly, so a dry-run report cannot print it and this node cannot leak it.
//
// GENERATED FROM integrations/mobilizon-cadence/nodes/01-config.js - edit that file and rebuild.

// @inject config
// @inject queries

// Mobilizon has no conditional create and no idempotency key, so everything downstream depends on this read
// being complete: far enough back to see the rhythm, far enough forward to see every date the club has
// already scheduled by hand.
const now = new Date();
const stampDaysFrom = (n) =>
  new Date(now.getTime() + n * 86_400_000).toISOString().replace(/\.\d{3}Z$/, "Z");

const groups = [...new Set(SERIES.map((s) => s.groupActor))];
if (groups.length !== 1) {
  // Deliberate: the graph is one straight line with one read. A second group needs a loop (Split In Pieces
  // into a per-group sub-workflow). Refusing here is better than quietly planning one group and ignoring the
  // other, which is what a copy-paste of this node would do.
  throw new Error(
    `01 Config: series live in ${groups.length} different groups (${groups.join(", ")}). ` +
    "This workflow reads one group per run. Add a second copy of the chain, or split by group, before adding a series elsewhere.",
  );
}

return [{
  json: {
    runAt: now.toISOString(),
    groupActor: groups[0],
    INSTANCE, CREDENTIALS, RUN, SERIES,
    // The alert channel travels on the config item for the same reason the GraphQL documents do: the
    // delivery node holds no endpoint text of its own, so `series.config.mjs` stays the one place a host
    // or a topic can change. Nothing secret: `ALERT.tokenEnv` is a NAME (D177 keeps secrets in n8n env).
    ALERT,
    query: {
      // 02 - public read, no credential attached and none needed.
      readSeriesHistory: READ_SERIES_HISTORY,
      readSeriesHistoryVars: {
        preferredUsername: groups[0],
        after: stampDaysFrom(-RUN.readBackDays),
        before: stampDaysFrom(RUN.readAheadDays),
        limit: RUN.readLimit,
      },
      // 03 - the only credentialed call in the workflow. Its token is what 06 and 07 send.
      signIn: LOGIN,
      // 06 / 07
      createEvent: CREATE_EVENT,
      auditDateWindow: AUDIT_DATE_WINDOW,
    },
  },
}];
