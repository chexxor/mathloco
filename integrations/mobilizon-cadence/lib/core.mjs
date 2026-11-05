/**
 * cadence core - every rule this integration follows, in pure functions with no imports.
 *
 * It has no dependencies on purpose. The same text runs in two hosts: Node here (tests, `simulate.mjs`) and
 * an n8n Code node (`build-workflow.mjs` inlines it, stripping the word `export`). A rule that exists in one
 * host and not the other is the failure this file is built to prevent, so the two hosts are not allowed to
 * own logic of their own - the adapters around this file only move items.
 *
 * What the rules are for: Mobilizon has no repeating events, so a series only exists as a row per date.
 * Someone, or something, has to make the next one. Everything below is that decision made the same way
 * every time, with the clock question treated as the hard part rather than an implementation detail.
 *
 * The clock rule (the one that matters most here):
 *   Mobilizon stores a true UTC instant in `beginsOn`, and renders it in the **event's own**
 *   `options.timezone`. Measured 2026-11-04 on this instance: the three May/June rows sit at `17:00Z` with
 *   `options.timezone: null` (12:00 CDT, right), while the two November rows sit at `12:00Z`/`18:00Z` with
 *   `options.timezone: "Etc/UTC"` - the same wall clock the organizer typed, but filed as a UTC instant, so
 *   a subscriber's calendar shows them six hours early. D174 confirms the club's hours from the organizer's
 *   own entry and the club's own page, not from the `Z`.
 *   So: a date is read as wall clock in the row's own zone (falling back to the series zone when the row
 *   declares none), the next date is computed on calendar days, and the new instant is rebuilt from the
 *   carried wall clock in the **series'** declared zone. A row whose declared zone disagrees with the
 *   series' is reported, never quietly reinterpreted.
 */

// ---------------------------------------------------------------- titles

/** Series matching is on the organizer's own title text, so it has to be forgiving of spacing and case. */
export const normTitle = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export function matchesSeries(series, row) {
  const t = normTitle(row.title);
  if (!t) return false;
  if (t === normTitle(series.title)) return true;
  return (series.aliases ?? []).some((a) => normTitle(a) === t);
}

// ------------------------------------------------- calendar date arithmetic
// All of it happens on plain `YYYY-MM-DD` calendar dates, never on a `Date` with a zone attached. A
// biweekly club meeting is a date, and the moment you turn a date into an instant you have chosen a
// timezone - which is the exact choice this file wants to make once, on purpose.

const DAY_MS = 86_400_000;

export function parseDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str ?? "").trim());
  if (!m) throw new Error(`not a YYYY-MM-DD date: ${JSON.stringify(str)}`);
  const [y, mo, d] = m.slice(1).map(Number);
  const t = Date.UTC(y, mo - 1, d);
  if (Number.isNaN(t) || new Date(t).getUTCFullYear() !== y || new Date(t).getUTCMonth() !== mo - 1 || new Date(t).getUTCDate() !== d) {
    throw new Error(`not a real calendar date: ${str}`);
  }
  return t;
}

export const fmtDate = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (str, n) => fmtDate(parseDate(str) + n * DAY_MS);
export const weekdayOf = (str) => new Date(parseDate(str)).getUTCDay(); // 0 = Sunday
export const cmpDate = (a, b) => (parseDate(a) === parseDate(b) ? 0 : parseDate(a) < parseDate(b) ? -1 : 1);

/** Move forward (never back) to the given weekday. Forward-only is a rule, not an accident: pulling a
 *  meeting earlier is a decision about the club, pushing it later is only a decision about the slot. */
export function snapToWeekday(str, weekday) {
  if (weekday === null || weekday === undefined) return str;
  const w = Number(weekday);
  if (!Number.isInteger(w) || w < 0 || w > 6) throw new Error(`weekday must be 0..6, got ${JSON.stringify(weekday)}`);
  for (let i = 0; i <= 6; i++) {
    const c = addDays(str, i);
    if (weekdayOf(c) === w) return c;
  }
  throw new Error("unreachable: weekday snap");
}

/** Add minutes to a wall clock time. Returns the day roll, because "12:00 + 150 min" is a different date. */
export function addMinutesToTime(time, minutes) {
  if (!/^\d{2}:\d{2}$/.test(String(time))) throw new Error(`not HH:MM: ${JSON.stringify(time)}`);
  const total = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + Number(minutes);
  if (total < 0 || total >= 24 * 60 + 1440) throw new Error(`time out of range: ${time} + ${minutes}`);
  const dayShift = Math.floor(total / 1440);
  const inDay = total % 1440;
  return { time: `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`, dayShift };
}

// ---------------------------------------------------------------- zones

const dtfCache = new Map();
function dtfFor(tz) {
  if (!dtfCache.has(tz)) {
    dtfCache.set(tz, new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }));
  }
  return dtfCache.get(tz);
}

export function assertTimezone(tz) {
  if (typeof tz !== "string" || !tz) throw new Error(`timezone must be a non-empty IANA string, got ${JSON.stringify(tz)}`);
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { throw new Error(`unknown IANA timezone ${JSON.stringify(tz)}`); }
  return tz;
}

/** The wall clock an instant shows in `tz`, as text: "2026-11-21T12:00:00". */
function wallText(tz, ms) {
  const p = {};
  for (const part of dtfFor(tz).formatToParts(new Date(ms))) if (part.type !== "literal") p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

export function wallClock(iso, tz) {
  assertTimezone(tz);
  const ms = Date.parse(String(iso ?? ""));
  if (Number.isNaN(ms)) throw new Error(`not an instant: ${JSON.stringify(iso)}`);
  const text = wallText(tz, ms);
  return { date: text.slice(0, 10), time: text.slice(11, 16), tz };
}

function offsetMinutes(tz, ms) {
  return (Date.parse(wallText(tz, ms) + "Z") - ms) / 60_000;
}

/**
 * The wall clock -> instant direction, done twice because one pass is not enough across a DST boundary,
 * and then verified: if the instant we computed does not render back as the clock we asked for, that clock
 * does not exist (the spring-forward gap) and the run must stop rather than ship an hour that never happened.
 */
export function instantFrom(dateStr, time, tz) {
  assertTimezone(tz);
  if (!/^\d{2}:\d{2}$/.test(String(time))) throw new Error(`not HH:MM: ${JSON.stringify(time)}`);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [hh, mi] = time.split(":").map(Number);
  const wallMs = Date.UTC(y, mo - 1, d, hh, mi, 0);
  let t = wallMs;
  for (let i = 0; i < 3; i++) {
    const next = wallMs - offsetMinutes(tz, t) * 60_000;
    if (next === t) break;
    t = next;
  }
  const back = wallText(tz, t);
  if (back.slice(0, 16) !== `${dateStr}T${time}`) {
    throw new Error(`${dateStr} ${time} does not exist in ${tz} (it reads back as ${back}) - check the DST transitions for this series`);
  }
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
}

// ------------------------------------------------------------ the row's clock

/** Which zone a stored row's wall clock should be read in: the row's own declaration first, the series'
 *  only when the row declares none. `usedFallback` exists so the report can say which happened. */
export function rowTimezone(row, series) {
  const declared = row?.options?.timezone;
  if (typeof declared === "string" && declared) return { tz: declared, usedFallback: false };
  return { tz: assertTimezone(series.timezone), usedFallback: true };
}

/** The local date of a stored row - the unit the dedupe key is compared on. */
export function rowLocalDate(row, series) {
  return wallClock(row.beginsOn, rowTimezone(row, series).tz).date;
}

// ------------------------------------------------------------- the schedule

const CANCELLED = "CANCELLED";
const isLive = (row) => row.status !== CANCELLED;

/**
 * The next date the series should hold.
 *
 * Anchored on the last real occurrence, not on a hard-coded calendar: if the club skips a week the chain
 * keeps its rhythm from what actually happened, and if a human schedules the next date by hand the rule
 * steps past it. `skipDates` is "sometimes we miss one", expressed as data instead of as silence.
 */
export function nextCandidate({ lastDate, everyDays, weekdaySnap, skipDates = [], todayDate, maxSteps }) {
  if (!Number.isInteger(Number(everyDays)) || Number(everyDays) < 1) throw new Error(`everyDays must be a positive integer, got ${JSON.stringify(everyDays)}`);
  const every = Number(everyDays);
  const skipped = [];
  let d = lastDate;
  for (let step = 1; step <= maxSteps; step++) {
    d = snapToWeekday(addDays(d, every), weekdaySnap);
    const iso = skipDates.map(String);
    if (iso.includes(d)) { skipped.push(d); continue; }
    if (cmpDate(d, todayDate) > 0) return { date: d, steps: step, skipped };
  }
  throw new Error(`no future date for this series within ${maxSteps} steps of ${lastDate} - the rhythm needs a human look (last occurrence ${lastDate}, everyDays ${every})`);
}

/** Copy the address without the fields that would make the new event *share* a row with the old one: an
 *  `id` here means "edit this address", and editing one event's venue would move the other's. */
export function copyAddress(a) {
  if (!a) return undefined;
  const out = {};
  for (const k of ["street", "locality", "region", "postalCode", "country", "geom", "type", "description"]) {
    if (a[k] !== null && a[k] !== undefined) out[k] = a[k];
  }
  return Object.keys(out).length ? out : undefined;
}

/** Event options, copied on a whitelist. Deliberately *not* copied: `remainingAttendeeCapacity` (a count of
 *  who has already joined the old meeting) and `attendees` (a list of people). `timezone` is always the
 *  series' declared zone - that is the whole point of the clock rule.
 *
 *  `maximumAttendeeCapacity: 0` is also dropped. Measured 2026-11-04: the club's own live rows carry `0`,
 *  and their members attend them, so on this instance `0` is the "no limit" placeholder - but ActivityPub
 *  reserves `0` for "no attendees allowed", so the same number means two things in two layers. Copying it
 *  into a new public meeting is a defect either way, and dropping it fails in the safe direction: a meeting
 *  that admits more people than planned, not one that admits nobody. Set a real capacity on the source row
 *  and it is copied. */
export function copyOptions(o, tz) {
  const out = { timezone: assertTimezone(tz) };
  for (const k of ["isOnline", "showStartTime", "showEndTime", "maximumAttendeeCapacity",
    "hideNumberOfParticipants", "hideOrganizerWhenGroupEvent", "commentModeration", "program"]) {
    if (o && o[k] !== null && o[k] !== undefined && !(k === "maximumAttendeeCapacity" && Number(o[k]) === 0)) out[k] = o[k];
  }
  return out;
}

/** The body of the write: a copy of the previous occurrence, with the clock and the zone re-derived. */
export function buildCreateVars({ series, template, when, actorIds }) {
  const vars = {
    title: series.title,
    description: template.description ?? "",
    beginsOn: when.beginsOn,
    endsOn: when.endsOn,
    category: series.category || template.category || "MEETING",
    language: template.language || "en",
    draft: series.draft === true,
    visibility: series.visibility,
    status: "CONFIRMED",
    joinOptions: series.joinOptions || template.joinOptions || "FREE",
    tags: (template.tags ?? []).map((t) => t?.title).filter(Boolean),
    metadata: (template.metadata ?? [])
      .map((m) => ({ key: m.key, title: m.title, value: m.value, type: m.type }))
      .filter((m) => m.key && m.value !== undefined),
    contacts: (template.contacts ?? []).map((c) => ({ id: String(c.id) })).filter((c) => c.id),
    options: copyOptions(template.options, series.timezone),
    physicalAddress: copyAddress(template.physicalAddress),
    organizerActorId: String(actorIds.organizerActorId),
  };
  const attributedTo = actorIds.attributedToId ?? series.attributedToId;
  if (attributedTo) vars.attributedToId = String(attributedTo);
  if (series.copyPicture && template.picture?.uuid) vars.picture = { mediaUuid: template.picture.uuid };
  return vars;
}

// ------------------------------------------------------------ the decision

/**
 * One series in, one decision out. The order of the checks is the safety model:
 *
 * 1. no rows at all for this series  -> `alert` (a rename, or a series deleted: the loud answer, never a guess)
 * 2. where does the series stand today
 * 3. what date comes next, per the rule
 * 4. guards: horizon, catch-up, already-scheduled, another event on the same day, too many dates ahead
 * 5. only then: the payload, and `dryRun` decides whether it becomes `create` or `would_create`
 *
 * `alert` and `skip` both stop the write; they differ so the report can say "this needs a person" apart from
 * "nothing to do, correctly".
 */
export function planSeries({ series, run, events, actorIds, nowIso }) {
  const notes = [];
  const all = Array.isArray(events) ? events : [];
  const rows = all.filter((r) => matchesSeries(series, r));
  const todayDate = wallClock(nowIso, assertTimezone(series.timezone)).date;

  if (!rows.length) {
    return {
      seriesKey: series.key, action: "alert", reason: "no_rows_for_series",
      note: `no event in ${series.groupActor} matches "${series.title}"${series.aliases?.length ? ` (or its aliases: ${series.aliases.join(", ")})` : ""} inside the read window. A rename, a deleted series, or a window that starts after the history.`,
      notes, todayDate,
    };
  }

  const live = rows.filter(isLive);
  if (!live.length) {
    return { seriesKey: series.key, action: "alert", reason: "every_row_cancelled", note: `${rows.length} rows match and all are CANCELLED.`, notes, todayDate };
  }

  const anchor = live.reduce((a, b) => (Date.parse(a.beginsOn) > Date.parse(b.beginsOn) ? a : b));
  const tzForAnchor = rowTimezone(anchor, series);
  const anchorClock = wallClock(anchor.beginsOn, tzForAnchor.tz);
  if (tzForAnchor.usedFallback) notes.push(`the anchor row declares no timezone; its clock was read in the series zone (${series.timezone})`);
  if (!tzForAnchor.usedFallback && tzForAnchor.tz !== series.timezone) {
    notes.push(`TIMEZONE: the anchor row declares ${tzForAnchor.tz} but the series declares ${series.timezone}; the wall clock ${anchorClock.time} was carried from the row and stamped ${series.timezone}. Fix the row in Mobilizon if that is not the club's real hour.`);
    if (series.strictTimezone === true) {
      return { seriesKey: series.key, action: "alert", reason: "timezone_mismatch", note: notes.at(-1), notes, todayDate };
    }
  }

  const duration = anchor.endsOn
    ? Math.round((Date.parse(anchor.endsOn) - Date.parse(anchor.beginsOn)) / 60_000)
    : Number(series.defaultDurationMinutes ?? 120);
  if (!anchor.endsOn) notes.push(`the anchor row has no end time; using the configured ${series.defaultDurationMinutes ?? 120} minutes`);
  if (duration <= 0 || duration > 24 * 60) {
    return { seriesKey: series.key, action: "alert", reason: "nonsense_duration", note: `anchor duration computed as ${duration} minutes.`, notes, todayDate };
  }

  const cand = nextCandidate({
    lastDate: anchorClock.date,
    everyDays: series.everyDays,
    weekdaySnap: series.weekdaySnap ?? null,
    skipDates: series.skipDates ?? [],
    todayDate,
    maxSteps: Number(run.maxCatchUpSteps ?? 6),
  });
  if (cand.skipped.length) notes.push(`skipDates held these back: ${cand.skipped.join(", ")}`);
  if (cand.steps > 1) notes.push(`caught up ${cand.steps} intervals from ${anchorClock.date} to ${cand.date} - the series had no row for a while`);

  const end = addMinutesToTime(anchorClock.time, duration);
  const when = {
    date: cand.date,
    time: anchorClock.time,
    timezone: series.timezone,
    beginsOn: instantFrom(cand.date, anchorClock.time, series.timezone),
    endsOn: instantFrom(addDays(cand.date, end.dayShift), end.time, series.timezone),
  };

  const decision = {
    seriesKey: series.key,
    seriesTitle: series.title,
    aliases: (series.aliases ?? []).slice(),
    action: null, reason: null, notes, todayDate,
    anchor: { uuid: anchor.uuid, id: anchor.id, title: anchor.title, beginsOn: anchor.beginsOn, url: anchor.url, declaredTimezone: tzForAnchor.tz },
    candidate: when,
  };

  // horizon: never write a date further out than the config allows, however the rhythm falls
  const horizonDate = fmtDate(parseDate(todayDate) + Number(run.horizonDays ?? 28) * DAY_MS);
  if (cmpDate(cand.date, horizonDate) > 0) {
    return { ...decision, action: "skip", reason: "beyond_horizon", note: `${cand.date} is more than ${run.horizonDays} days from ${todayDate}.` };
  }

  // dedupe: the series already holds this date - in whatever zone the existing row declares.
  // When is this reachable, given the anchor is the newest live row? Exactly when the row on the candidate
  // date is not live - today that means CANCELLED: the club cancelled Nov 21, the chain steps from Nov 7 to
  // Nov 21, and the guard refuses to resurrect a cancelled meeting on its own. It also catches the case a
  // future Mobilizon version or a different rule would make ordinary - a live row sitting on the computed
  // date - which is why it stays in front of the write rather than being deleted as dead code.
  const clash = rows.filter((r) => rowLocalDate(r, series) === cand.date);
  if (clash.length) {
    return {
      ...decision, action: "skip", reason: "already_scheduled",
      note: clash.map((r) => `${r.title} (${r.uuid}${r.status ? ", " + r.status : ""}) on ${cand.date}`).join("; "),
      clashes: clash.map((r) => ({ uuid: r.uuid, url: r.url, title: r.title, beginsOn: r.beginsOn, status: r.status, draft: r.draft })),
    };
  }
  // someone already put a different meeting on that night
  const otherSameDay = all.filter((r) => !matchesSeries(series, r) && rowLocalDate(r, series) === cand.date);
  if (otherSameDay.length && series.blockOnSameDayConflict !== false) {
    return {
      ...decision, action: "skip", reason: "other_event_same_day",
      note: otherSameDay.map((r) => `${r.title} (${r.uuid})`).join("; "),
    };
  }
  // enough dates ahead already
  const future = live.filter((r) => cmpDate(rowLocalDate(r, series), todayDate) > 0);
  if (future.length >= Number(series.maxFuturePerSeries ?? 2)) {
    return {
      ...decision, action: "skip", reason: "max_future_reached",
      note: `${future.length} future date(s) already scheduled: ${future.map((r) => rowLocalDate(r, series)).join(", ")}`,
    };
  }

  const leadDays = Math.round((parseDate(cand.date) - parseDate(todayDate)) / DAY_MS);
  if (leadDays < Number(series.minLeadDays ?? 2)) notes.push(`SHORT LEAD: this date starts in ${leadDays} day(s).`);

  const createVars = buildCreateVars({ series, template: anchor, when, actorIds: actorIds ?? {} });
  if (normTitle(anchor.title) !== normTitle(series.title)) {
    notes.push(`the new row is titled "${series.title}"; the row it was copied from is titled "${anchor.title}"`);
  }

  if (run.dryRun === true) {
    return { ...decision, action: "would_create", reason: "dry_run", createVars, leadDays };
  }
  return { ...decision, action: "create", reason: null, createVars, leadDays };
}

/**
 * A GraphQL response is not trustworthy because the transport succeeded. Measured on Mobilizon 5.2.4:
 * validation and authorization failures come back as **HTTP 200** with an `errors` array, and a partially
 * authorized query can carry `data` *and* `errors` together. So every caller of this integration unwraps
 * through here, and a response with errors ends the run with the server's own words in the message.
 */
export function unwrap(response, label) {
  if (!response) throw new Error(`${label}: empty response`);
  if (Array.isArray(response.errors) && response.errors.length) {
    const detail = response.errors.map((e) => `${e.path ? e.path.join(".") + ": " : ""}${e.message ?? JSON.stringify(e)}`).join(" | ");
    throw new Error(`${label}: GraphQL error (HTTP reported success): ${detail}`);
  }
  if (!response.data) throw new Error(`${label}: no data in the GraphQL response`);
  return response.data;
}

/** The audit of the date we just wrote: the created event is present, and it is alone on that date.
 *  This is the duplicate guard that actually holds. Mobilizon offers no conditional create and no
 *  idempotency key, so the sequence can only be: read the date, decide, write, then prove what the date
 *  now holds. A same-second race with a human creating the same meeting is caught here and reported with
 *  both uuids rather than left for a member to notice. */
export function auditDate({ plan, created, windowRows }) {
  const rows = Array.isArray(windowRows) ? windowRows : [];
  const series = { title: plan.seriesTitle, aliases: plan.aliases ?? [] };
  const mine = rows.find((r) => r.uuid === created?.uuid);
  const sameSeries = rows.filter((r) => matchesSeries(series, r));
  const problems = [];
  if (!mine) problems.push(`the created event (${created?.uuid}, ${created?.url}) is not in the group's list for ${plan.candidate.date}`);
  if (mine?.draft === true && plan.createVars?.draft !== true) problems.push("the event came back as a draft while the config asked for a published event");
  if (sameSeries.length > 1) {
    problems.push(`${sameSeries.length} rows for this series sit on ${plan.candidate.date}: ${sameSeries.map((r) => `${r.title} (${r.uuid}, ${r.url})`).join("; ")}`);
  }
  if (created && normTitle(created.title) !== normTitle(plan.createVars?.title)) problems.push(`the title came back as "${created.title}"`);
  if (created && Date.parse(created.beginsOn) !== Date.parse(plan.candidate.beginsOn)) {
    problems.push(`the instant came back as ${created.beginsOn}, expected ${plan.candidate.beginsOn}`);
  }
  return { ok: problems.length === 0, problems, seen: rows.length };
}

/** Is the alert channel usable? `ALERT` comes from `series.config.mjs` on the config item, so a reporter can
 *  answer this without knowing which host or topic is configured. A missing channel is not an error - the run
 *  still reports in the execution log - but it must be *said*, because "nobody was told" is the difference
 *  between a monitored job and an unmonitored one (D194). */
export function canAlert(alert) {
  return !!(alert && alert.rootUrl && alert.topic && alert.tokenEnv);
}

/** The run summary, in the words a person reads. The execution log, the alert body, and `simulate.mjs`'s
 *  rehearsal all print these same lines, which is the point: a rehearsal that paraphrases the real report is
 *  a rehearsal of something else. `rows` is the per-series shape the reporters build
 *  ({ series, action, date, beginsOn, endsOn, why, audit, url, notes, wouldSend }). `payloads: false` is what
 *  a phone gets; the log gets them. */
export function summaryLines({ rows, written, todayDate, payloads = true }) {
  const label = { create: "created", would_create: "dry run - would create", skip: "nothing to do", alert: "NEEDS A PERSON" };
  const lines = [`cadence: ${rows.length} series, ${written} event(s) written, at ${todayDate}`];
  for (const r of rows) {
    lines.push(`- ${r.series}: ${label[r.action] || r.action} ${r.date ?? "-"} ${r.beginsOn ?? ""}`.trimEnd());
    if (r.why) lines.push(`    why: ${r.why}`);
    if (r.url) lines.push(`    url: ${r.url}`);
    if (r.audit) lines.push(`    audit: ${r.audit}`);
    for (const n of r.notes ?? []) lines.push(`    note: ${n}`);
    // The full createEvent argument list belongs in the execution log, where a reviewer reads it line by line.
    // It is the *only* thing that differs from what a phone gets, because one JSON dump of a description
    // pushes every date out of the message cap - which is how an alert becomes "see the log", i.e. unread.
    if (payloads && r.wouldSend) lines.push(`    payload: ${JSON.stringify(r.wouldSend)}`);
  }
  return lines;
}

/** Which runs are worth a message, decided once (D194). Cadence runs every morning, so a message that means
 *  "nothing happened" is itself the failure mode: it trains a person to skim the channel, and the messages
 *  that matter get skimmed with it. So a plain skip is silent - the execution log remains the record - while
 *  a run that *wrote* something, or a dry run that decided exactly what it would write, says so out loud.
 *  `simulate.mjs` asks the same function, which is why the rule cannot drift between the workflow and the
 *  rehearsal. */
export function runKind({ written = 0, wouldWrite = 0 } = {}) {
  return written ? "wrote" : wouldWrite ? "dryRun" : null;
}

/** The one message shape for the alert channel. Three reporters need it (a stage that threw, a plan that
 *  stopped, a run that wrote something), and a message that differs by path is a message nobody can learn to
 *  read - so the fields live here and the reporters only supply the words.
 *
 *  Field names are quoted from ntfy's JSON-publish example (read 2026-11-04): `topic`, `title`, `message`,
 *  `priority`, `tags`, `click`. Priorities are the documented ones - 4 high, 3 default, 2 low - and a caller
 *  that asks for an unknown kind gets the default rather than a rejected message. */
export function alertBody({ alert, kind, title, detail }) {
  if (!canAlert(alert)) return null;
  const cap = alert.maxMessageChars || 1000;
  const priority = (alert.priority || {})[kind] || 3;
  const tags = kind === "problem" ? (alert.tags || {}).problem : undefined;
  return {
    topic: alert.topic,
    title: String(title || "cadence").slice(0, 256),
    message: String(detail || "(no detail)").slice(0, cap),
    priority,
    ...(tags && tags.length ? { tags } : {}),
    ...(alert.click ? { click: alert.click } : {}),
  };
}
