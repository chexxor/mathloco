/**
 * The rules, tested as rules - no network, no n8n, no clock.
 *
 *   node --test integrations/mobilizon-cadence/test/
 *
 * These are the cases a person would otherwise discover on the club's calendar: a date that crossed a DST
 * boundary and moved six hours, a skipped week that turned into two meetings, a rename that silently starts
 * a second series, a shared address row that would move two events at once. Each test names the real row it
 * came from, because every one of them was read off the club's own calendar first.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  addDays, addMinutesToTime, auditDate, buildCreateVars, cmpDate, copyAddress, copyOptions, instantFrom,
  matchesSeries, nextCandidate, normTitle, parseDate, planSeries, rowTimezone, snapToWeekday, unwrap,
  wallClock, weekdayOf,
} from "../lib/core.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE = JSON.parse(readFileSync(here + "../fixtures/group-history-2026-11-04.json", "utf8"));
const ELEMENTS = FIXTURE.data.group.organizedEvents.elements;
const SERIES = () => import("../series.config.mjs");

const socialFixture = async () => {
  const { SERIES: all, RUN } = await SERIES();
  return { series: all.find((s) => s.key === "mpls-social"), run: RUN, events: ELEMENTS };
};

// ---------------------------------------------------------------- the clock

test("a wall clock becomes the right instant on both sides of a DST boundary", () => {
  // Nov 21 2026 is after the 2026-11-01 transition: CST, UTC-6. These are the two hours the club meets.
  assert.equal(instantFrom("2026-11-21", "12:00", "America/Chicago"), "2026-11-21T18:00:00Z");
  assert.equal(instantFrom("2026-11-25", "18:00", "America/Chicago"), "2026-11-26T00:00:00Z");
  // July is CDT, UTC-5 - the same clock string is a different instant, and a fixed offset would get this wrong.
  assert.equal(instantFrom("2026-07-04", "12:00", "America/Chicago"), "2026-07-04T17:00:00Z");
});

test("a wall clock that does not exist is refused, not quietly moved", () => {
  // 2026-03-08 02:30 never happens in America/Chicago (the clock jumps 02:00 -> 03:00).
  assert.throws(() => instantFrom("2026-03-08", "02:30", "America/Chicago"), /does not exist in/);
});

test("an unknown timezone is refused before anything is computed", () => {
  assert.throws(() => instantFrom("2026-11-21", "12:00", "America/Chicagox"), /unknown IANA timezone/);
  assert.throws(() => instantFrom("2026-11-21", "12:00", ""), /timezone must be/);
});

test("the wall clock an instant shows depends on the zone it is read in - the whole Mobilizon problem in one test", () => {
  // The club's Nov 7 row: stored 12:00Z, declares Etc/UTC, so the organizer sees 12:00.
  assert.equal(wallClock("2026-11-07T12:00:00Z", "Etc/UTC").time, "12:00");
  // Read in the club's real zone that same row is a bakery social at six in the morning.
  assert.equal(wallClock("2026-11-07T12:00:00Z", "America/Chicago").time, "06:00");
  // The May/June rows declare nothing and sit at 17:00Z, which is 12:00 CDT.
  assert.equal(wallClock("2026-06-05T17:00:00Z", "America/Chicago").time, "12:00");
});

test("a row's own declaration wins; the series zone is used only when the row declares none", async () => {
  const { series } = await socialFixture();
  assert.deepEqual(rowTimezone({ options: { timezone: "Etc/UTC" } }, series), { tz: "Etc/UTC", usedFallback: false });
  assert.deepEqual(rowTimezone({ options: { timezone: null } }, series), { tz: "America/Chicago", usedFallback: true });
  assert.deepEqual(rowTimezone({ options: null }, series), { tz: "America/Chicago", usedFallback: true });
});

test("calendar arithmetic is done on dates, and an event that runs past midnight is expressed as one", () => {
  assert.equal(addDays("2026-11-07", 14), "2026-11-21");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekdayOf("2026-11-21"), 6);
  assert.equal(cmpDate("2026-11-21", "2026-11-22"), -1);
  assert.deepEqual(addMinutesToTime("18:00", 120), { time: "20:00", dayShift: 0 });
  assert.deepEqual(addMinutesToTime("23:30", 90), { time: "01:00", dayShift: 1 });
  assert.throws(() => parseDate("2026-02-30"), /not a real calendar date/);
});

test("the weekday snap only ever moves a date later", () => {
  assert.equal(snapToWeekday("2026-11-19", 3), "2026-11-25"); // Thu -> next Wed, never back to Nov 18
  assert.equal(snapToWeekday("2026-11-21", 6), "2026-11-21"); // already Saturday
  assert.throws(() => snapToWeekday("2026-11-21", 9), /weekday must be 0..6/);
});

// ---------------------------------------------------------------- the rhythm

test("the next date comes from the last real one, at the configured spacing", () => {
  const got = nextCandidate({ lastDate: "2026-11-07", everyDays: 14, weekdaySnap: 6, skipDates: [], todayDate: "2026-11-08", maxSteps: 6 });
  assert.equal(got.date, "2026-11-21");
  assert.equal(got.steps, 1);
});

test("a skipped week stays skipped and the chain keeps its rhythm", () => {
  const got = nextCandidate({ lastDate: "2026-11-07", everyDays: 14, weekdaySnap: 6, skipDates: ["2026-11-21"], todayDate: "2026-11-08", maxSteps: 6 });
  assert.equal(got.date, "2026-12-05");
  assert.deepEqual(got.skipped, ["2026-11-21"]);
});

test("a gap in the calendar is caught up, and an absurd gap is refused", () => {
  // Four intervals missed: the rule steps forward until the date is in the future, then snaps to the weekday.
  const got = nextCandidate({ lastDate: "2026-09-19", everyDays: 14, weekdaySnap: 6, skipDates: [], todayDate: "2026-11-04", maxSteps: 6 });
  assert.equal(got.date, "2026-11-14");
  assert.equal(got.steps, 4, "it has to report how far it had to reach");
  // Seven intervals is more than maxSteps: this is the case where the history is so old that a chain of
  // invented dates is a decision for a person, not a loop.
  assert.throws(
    () => nextCandidate({ lastDate: "2026-08-01", everyDays: 14, weekdaySnap: 6, skipDates: [], todayDate: "2026-11-04", maxSteps: 6 }),
    /needs a human look/,
  );
});

test("series matching survives case and spacing, and honours aliases, but not a typo", async () => {
  const { series } = await socialFixture();
  assert.ok(matchesSeries(series, { title: "  MPLS Math Club - Bimonthly Social " }));
  assert.ok(matchesSeries(series, { title: "MPLS Math Club Social" })); // an alias, i.e. a rename
  assert.equal(matchesSeries(series, { title: "MPLS Math Club - Bimonlthy Social" }), false); // typo -> a new series, loudly
  assert.equal(normTitle(undefined), "");
});

// ------------------------------------------------------------- the copy rules

test("an address is copied as a value, never as a shared row", () => {
  const src = {
    id: "12", originId: "osm:99", url: "https://example.invalid/a",
    street: "8100 Minnetonka Boulevard", locality: "Saint Louis Park", region: "Minnesota",
    postalCode: "55426", country: "United States", geom: "-93.3824443;44.9498412", type: "house", description: "Angel Food Bakery",
  };
  const out = copyAddress(src);
  for (const dangerous of ["id", "originId", "url"]) assert.equal(out[dangerous], undefined, `${dangerous} would make the two events share one address row`);
  assert.equal(out.geom, src.geom); // the Point scalar round-trips in lng;lat - verified against 5.2.4
  assert.equal(out.description, "Angel Food Bakery");
  assert.equal(copyAddress(null), undefined);
});

test("options are copied on a whitelist, and the counts of the old meeting are not", () => {
  const src = {
    timezone: "Etc/UTC", isOnline: false, showEndTime: true, maximumAttendeeCapacity: 0,
    remainingAttendeeCapacity: 7, hideNumberOfParticipants: true, attendees: ["someone"],
  };
  const out = copyOptions(src, "America/Chicago");
  assert.equal(out.timezone, "America/Chicago", "the zone is always the series' declared one");
  assert.equal(out.maximumAttendeeCapacity, undefined, "0 is a placeholder here and \"nobody allowed\" in ActivityPub");
  assert.equal(out.remainingAttendeeCapacity, undefined);
  assert.equal(out.attendees, undefined);
  assert.equal(out.hideNumberOfParticipants, true);
});

test("the write body is flat createEvent arguments, and carries no ids from the old row", async () => {
  const { series } = await socialFixture();
  const template = ELEMENTS.find((e) => e.title === series.title);
  const vars = buildCreateVars({
    series, template,
    when: { beginsOn: "2026-11-21T18:00:00Z", endsOn: "2026-11-21T20:00:00Z" },
    actorIds: { organizerActorId: "3", attributedToId: "4" },
  });
  assert.equal(vars.beginsOn, "2026-11-21T18:00:00Z");
  assert.equal(vars.organizerActorId, "3");
  assert.equal(vars.attributedToId, "4");
  assert.equal(vars.picture.mediaUuid, template.picture.uuid, "the club's event art carries by reference");
  assert.equal(vars.id, undefined);
  assert.equal(vars.uuid, undefined);
  assert.equal(vars.publishAt, undefined, "publish now; a scheduled publish would be a second clock to keep");
  assert.ok(vars.description.includes("algorithms of most any kind"), "the description is the organizer's own");
});

// --------------------------------------------------------------- the decision

test("on the club's real calendar the two series each get exactly one next date", async () => {
  const { series, run, events } = await socialFixture();
  const { SERIES: all } = await SERIES();
  const parallel = all.find((s) => s.key === "parallel-learning");
  const nowIso = "2026-11-04T14:00:00Z";

  const a = planSeries({ series, run, events, actorIds: { organizerActorId: "3", attributedToId: "4" }, nowIso });
  assert.equal(a.action, "would_create");
  assert.equal(a.candidate.date, "2026-11-21");
  assert.equal(a.candidate.beginsOn, "2026-11-21T18:00:00Z");
  assert.ok(a.notes.some((n) => n.startsWith("TIMEZONE:")), "the Etc/UTC row must be visible in the report, not smoothed over");

  const b = planSeries({ series: parallel, run, events, actorIds: { organizerActorId: "3", attributedToId: "4" }, nowIso });
  assert.equal(b.action, "would_create");
  assert.equal(b.candidate.date, "2026-11-25");
  assert.equal(b.candidate.endsOn, "2026-11-26T02:00:00Z"); // 20:00 CST
});

test("a date that already exists is never written twice, whoever made it", async () => {
  const { series, run, events } = await socialFixture();
  // The reachable shape of this case on Mobilizon: the club cancelled the Nov 21 row. A cancelled row is not
  // an anchor (the chain still steps Nov 7 -> Nov 21) but it *is* a row, so the guard refuses to resurrect a
  // cancelled meeting by itself and hands it to a person instead.
  const cancelled = { ...ELEMENTS[3], uuid: "cancelled-1", status: "CANCELLED", beginsOn: "2026-11-21T18:00:00Z", endsOn: "2026-11-21T20:00:00Z", options: { timezone: "America/Chicago" } };
  const plan = planSeries({ series, run, events: [...events, cancelled], actorIds: {}, nowIso: "2026-11-08T14:00:00Z" });
  assert.equal(plan.action, "skip");
  assert.equal(plan.reason, "already_scheduled");
  assert.deepEqual(plan.clashes.map((c) => c.uuid), ["cancelled-1"]);
  assert.deepEqual(plan.clashes[0].status, "CANCELLED", "the report has to say the row is cancelled, not just that it exists");
  // and the guard compares *local* dates, so a row the instance stores at a different UTC hour (because it
  // declares a different zone) is still recognised as the same night
  const otherHour = { ...cancelled, beginsOn: "2026-11-21T12:00:00Z", options: { timezone: "Etc/UTC" } };
  const again = planSeries({ series, run, events: [...events, otherHour], actorIds: {}, nowIso: "2026-11-08T14:00:00Z" });
  assert.equal(again.reason, "already_scheduled");
  assert.equal(again.clashes[0].beginsOn, "2026-11-21T12:00:00Z", "the report quotes the row's own instant, not the one we would have written");
});

test("a different meeting on the same night stops the write", async () => {
  const { series, run, events } = await socialFixture();
  const other = { id: "9", uuid: "u-other", url: "https://x/y", title: "Winter Solstice Potluck", beginsOn: "2026-11-21T19:00:00Z", endsOn: "2026-11-21T21:00:00Z", status: "CONFIRMED", options: { timezone: "America/Chicago" } };
  const plan = planSeries({ series, run, events: [...events, other], actorIds: {}, nowIso: "2026-11-08T14:00:00Z" });
  assert.equal(plan.action, "skip");
  assert.equal(plan.reason, "other_event_same_day");
});

test("enough dates ahead already is a skip, not a queue", async () => {
  const { series, run, events } = await socialFixture();
  const extra = [
    { id: "a", uuid: "u-a", url: "", title: series.title, beginsOn: "2026-11-21T18:00:00Z", endsOn: "2026-11-21T20:00:00Z", status: "CONFIRMED", options: { timezone: "America/Chicago" } },
    { id: "b", uuid: "u-b", url: "", title: series.title, beginsOn: "2026-12-05T18:00:00Z", endsOn: "2026-12-05T20:00:00Z", status: "CONFIRMED", options: { timezone: "America/Chicago" } },
  ];
  // horizon widened so the guard under test is the one that fires: with two dates already scheduled, the
  // chain that would add a third must stop even though a third date is inside the club's planning horizon.
  const plan = planSeries({ series, run: { ...run, horizonDays: 60 }, events: [...events, ...extra], actorIds: {}, nowIso: "2026-11-08T14:00:00Z" });
  assert.equal(plan.action, "skip");
  assert.equal(plan.reason, "max_future_reached");
  assert.match(plan.note, /2 future date\(s\)/);
});

test("a date past the horizon is left alone", async () => {
  const { series, run, events } = await socialFixture();
  const plan = planSeries({ series, run: { ...run, horizonDays: 7 }, events, actorIds: {}, nowIso: "2026-11-08T14:00:00Z" });
  assert.equal(plan.reason, "beyond_horizon");
});

test("a rename is an alert, never a new series", async () => {
  const { series, run } = await socialFixture();
  const plan = planSeries({ series, run, events: [{ id: "1", uuid: "u", title: "Totally Different Name", beginsOn: "2026-11-07T12:00:00Z", status: "CONFIRMED" }], actorIds: {}, nowIso: "2026-11-08T14:00:00Z" });
  assert.equal(plan.action, "alert");
  assert.equal(plan.reason, "no_rows_for_series");
});

test("every row cancelled is an alert, not a rhythm to continue", async () => {
  const { series, run, events } = await socialFixture();
  const plan = planSeries({ series, run, events: events.map((e) => ({ ...e, status: "CANCELLED" })), actorIds: {}, nowIso: "2026-11-08T14:00:00Z" });
  assert.equal(plan.action, "alert");
  assert.equal(plan.reason, "every_row_cancelled");
});

test("strictTimezone turns the clock warning into a refusal", async () => {
  const { series, run, events } = await socialFixture();
  const plan = planSeries({ series: { ...series, strictTimezone: true }, run, events, actorIds: {}, nowIso: "2026-11-04T14:00:00Z" });
  assert.equal(plan.action, "alert");
  assert.equal(plan.reason, "timezone_mismatch");
});

// ------------------------------------------------------------------ the audit

test("the audit catches a duplicate on the date, including one made by a human a second earlier", () => {
  const plan = {
    seriesTitle: "MPLS Math Club - Bimonthly Social", aliases: [],
    candidate: { date: "2026-11-21", beginsOn: "2026-11-21T18:00:00Z" },
    createVars: { title: "MPLS Math Club - Bimonthly Social", draft: false },
  };
  const mine = { uuid: "new", url: "u1", title: plan.createVars.title, beginsOn: plan.candidate.beginsOn, draft: false };
  const human = { uuid: "human", url: "u2", title: plan.createVars.title, beginsOn: "2026-11-21T18:30:00Z", draft: false };

  assert.equal(auditDate({ plan, created: mine, windowRows: [mine] }).ok, true);
  const dup = auditDate({ plan, created: mine, windowRows: [mine, human] });
  assert.equal(dup.ok, false);
  assert.match(dup.problems.join(" "), /2 rows for this series/);
  assert.match(auditDate({ plan, created: mine, windowRows: [human] }).problems.join(" "), /is not in the group's list/);
  assert.match(auditDate({ plan, created: { ...mine, beginsOn: "2026-11-21T17:00:00Z" }, windowRows: [mine] }).problems.join(" "), /came back as/);
});

test("a GraphQL error is a failure even though the HTTP call succeeded", () => {
  assert.throws(() => unwrap({ errors: [{ message: "You need to be logged in", path: ["loggedPerson"] }] }, "03"), /03: GraphQL error \(HTTP reported success\)/);
  // measured on 5.2.4: a partial authorization returns data AND errors together
  assert.throws(() => unwrap({ data: { group: { id: "4" } }, errors: [{ message: "nope" }] }, "02"), /nope/);
  assert.deepEqual(unwrap({ data: { group: { id: "4" } } }, "02"), { group: { id: "4" } });
  assert.throws(() => unwrap(null, "02"), /empty response/);
});
