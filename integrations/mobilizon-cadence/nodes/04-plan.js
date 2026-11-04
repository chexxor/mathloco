// 04 Plan & decide - Run Once For Each Item.
//
// This is the only node that reasons. Everything above it moved JSON, and everything below it obeys. The
// rules are injected from lib/core.mjs, so the behaviour you are reading here is the behaviour the repo's
// tests execute (`node --test integrations/mobilizon-cadence/test/`) and the behaviour `simulate.mjs` prints
// from a terminal.
//
// What it decides, in order: is there a series to reason about at all, what date comes next, then the guards -
// horizon, already-scheduled, another meeting on that night, enough dates already ahead. Only after all of
// that does it build a payload, and `RUN.dryRun` decides whether the answer is `create` or `would_create`.
// A decision *not* to write is still a decision, so it comes back with a reason the report prints.
//
// GENERATED FROM integrations/mobilizon-cadence/nodes/04-plan.js - edit that file and rebuild.

// @inject core

const cfg = $('01 Config').item.json;

// A GraphQL response with an `errors` array is a failure even though the transport said 200. Measured on
// Mobilizon 5.2.4: authorization and validation problems arrive as HTTP 200 with `errors`, and a partially
// authorized query can carry `data` *and* `errors` at once. `unwrap` is what stops that becoming a silent
// empty plan.
const history = unwrap($('02 Read the series history').item.json, "02 series history");
const session = unwrap($('03 Sign in').item.json, "03 sign in");

const group = history.group;
if (!group) {
  throw new Error(`04: the history read returned no group for "${cfg.groupActor}" - check the group handle in series.config.mjs`);
}
if (!group.organizedEvents || !Array.isArray(group.organizedEvents.elements)) {
  throw new Error(`04: no organizedEvents list for ${cfg.groupActor} - the read window or the group handle is wrong`);
}

// The write needs Mobilizon's internal actor ids. They are resolved here, at run time, because they are
// database ids: hard-coding them survives exactly one account rebuild, and the failure it survives is the
// bad one - events attributed to the wrong actor, which look fine on the calendar.
const actorIds = (session.login && session.login.user && session.login.user.actors) || [];
const localActors = actorIds.filter((a) => !a.domain);
if (localActors.length !== 1) {
  throw new Error(
    `04: the signed-in account owns ${localActors.length} local actors (${actorIds.map((a) => `${a.preferredUsername}@${a.domain || "local"}`).join(", ")}). ` +
    "The organizer has to be one of them; set series.organizerActor to say which rather than guessing.",
  );
}
const organizerActorId = String(localActors[0].id);

// One run, one clock. `runAt` comes from the config node so every series in the execution is planned against
// the same instant, and so a re-run of a saved execution can be reasoned about afterwards.
const plans = cfg.SERIES.map((series) => {
  if (series.groupActor !== cfg.groupActor) {
    return { seriesKey: series.key, action: "alert", reason: "group_not_read", note: `${series.groupActor} is not the group this run read (${cfg.groupActor}).` };
  }
  return planSeries({
    series,
    run: cfg.RUN,
    events: group.organizedEvents.elements,
    actorIds: { organizerActorId, attributedToId: group.id },
    nowIso: cfg.runAt,
  });
});

// One item per series, so the gate and the write work per series and a failure in one cannot swallow another.
return plans.map((plan) => {
  if (plan.candidate) {
    // The audit window: the candidate date plus a day either side, measured in the series' own zone. A row
    // Mobilizon stores at a different UTC hour still lands inside it, which is what makes the duplicate check
    // independent of the instance's clock quirks.
    const bound = (offset) => instantFrom(addDays(plan.candidate.date, offset), "00:00", plan.candidate.timezone);
    plan.auditVars = {
      preferredUsername: cfg.groupActor,
      after: bound(-1),
      before: bound(1),
    };
  }
  return { json: plan };
});
