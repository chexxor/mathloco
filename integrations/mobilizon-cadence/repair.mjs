#!/usr/bin/env node
/**
 * repair.mjs - the human-sized undo for a write this workflow made.
 *
 *   node integrations/mobilizon-cadence/repair.mjs --list
 *   node integrations/mobilizon-cadence/repair.mjs --show <uuid>
 *   node integrations/mobilizon-cadence/repair.mjs --delete <uuid> --yes
 *
 * Why a script for something the Mobilizon UI already does: when the cadence writes a date that should not
 * exist, the fix has to be available in the same minute, from the same terminal, with the same credentials -
 * and it has to be *specific*. A person hunting a uuid in a UI list makes mistakes under pressure; this prints
 * the row it is about to remove (title, instant, url, uuid) and refuses to remove anything without `--yes`.
 *
 * It is also the repair path for the one thing the audit cannot fix by itself: a duplicate the workflow
 * detected and stopped on. The workflow never deletes anything - removing a member-visible event is a
 * decision for a person - and this is where that decision gets executed cleanly.
 *
 * Credentials come from the environment, under the names `series.config.mjs` declares. `--list` and `--show`
 * need no credentials at all: Mobilizon's group event read is public.
 */
import { INSTANCE, CREDENTIALS, SERIES } from "./series.config.mjs";
import { unwrap } from "./lib/core.mjs";

const EP = `${INSTANCE.baseUrl}${INSTANCE.graphqlPath}`;
const GROUP = SERIES[0].groupActor;
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const opt = (f, d) => { const i = args.indexOf(f); return i < 0 ? d : args[i + 1]; };

const post = async (query, variables, token) => {
  const res = await fetch(EP, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => null);
  return unwrap(body, `${res.status} from ${EP}`);
};

const LIST = /* GraphQL */ `
query RepairList($preferredUsername: String!, $after: DateTime!) {
  group(preferredUsername: $preferredUsername) {
    organizedEvents(limit: 50, order: BEGINS_ON, orderDirection: ASC, afterDatetime: $after) {
      elements { uuid id title beginsOn endsOn url status draft options { timezone } }
    }
  }
}`;

const SHOW = /* GraphQL */ `
query RepairShow($uuid: String!) {
  event(uuid: $uuid) {
    id uuid title beginsOn endsOn url status draft visibility
    options { timezone }
    attributedTo { id preferredUsername domain }
  }
}`;

// Verified against 5.2.4 introspection on 2026-11-04: `deleteEvent(eventId: ID)` returns a DeletedObject whose
// only field is `id`, and it takes the **internal id**, not the uuid. The lookup happens below, so nobody has
// to hold that distinction in their head while fixing a calendar.
const DELETE = /* GraphQL */ `
mutation RepairDelete($eventId: ID!) {
  deleteEvent(eventId: $eventId) { id }
}`;

const SIGN_IN = /* GraphQL */ `
mutation RepairSignIn($email: String!, $password: String!) {
  login(email: $email, password: $password) { accessToken }
}`;

async function signIn() {
  const email = process.env[CREDENTIALS.emailEnv];
  const password = process.env[CREDENTIALS.passwordEnv];
  if (!email || !password) {
    throw new Error(
      `deleting needs ${CREDENTIALS.emailEnv} and ${CREDENTIALS.passwordEnv} in the environment - the same two` +
      " names the n8n workflow reads. Listing and showing need neither.",
    );
  }
  const data = await post(SIGN_IN, { email, password });
  return data.login.accessToken;
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (has("--list")) {
  const after = opt("--after", new Date().toISOString().replace(/\.\d{3}Z$/, "Z"));
  const data = await post(LIST, { preferredUsername: GROUP, after });
  const rows = data.group?.organizedEvents?.elements ?? [];
  console.log(`${rows.length} row(s) in @${GROUP} from ${after}`);
  for (const r of rows) {
    console.log(`  ${r.beginsOn}  ${r.title}`);
    console.log(`            uuid ${r.uuid}  id ${r.id}  ${r.status}${r.draft ? " draft" : ""}  ${r.options?.timezone ?? "no zone"}`);
  }
  process.exit(0);
}

if (has("--show")) {
  const uuid = opt("--show");
  const data = await post(SHOW, { uuid });
  if (!data.event) { console.error(`no event with uuid ${uuid}`); process.exit(1); }
  console.log(JSON.stringify(data.event, null, 2));
  process.exit(0);
}

if (has("--delete")) {
  const uuid = opt("--delete");
  if (!uuidRe.test(uuid ?? "")) {
    console.error(`--delete needs the event's uuid (not its numeric id): repair.mjs --list shows both`);
    process.exit(2);
  }
  const found = (await post(SHOW, { uuid })).event;
  if (!found) { console.error(`no event with uuid ${uuid}`); process.exit(1); }
  console.log("about to delete:");
  console.log(`  ${found.title}`);
  console.log(`  ${found.beginsOn} -> ${found.endsOn}  (${found.options?.timezone ?? "no zone declared"})`);
  console.log(`  ${found.url}`);
  console.log(`  uuid ${found.uuid}  internal id ${found.id}  ${found.status}${found.draft ? " draft" : ""}`);
  if (!has("--yes")) {
    console.error(`\nrefusing without --yes. this is the moment to be sure: repair.mjs --delete ${uuid} --yes`);
    process.exit(2);
  }
  const token = await signIn();
  const data = await post(DELETE, { eventId: found.id }, token);
  console.log(`deleted: ${JSON.stringify(data.deleteEvent)}`);
  const after = (await post(SHOW, { uuid })).event;
  console.log(after ? `still present: ${after.url}` : "confirmed gone.");
  process.exit(after ? 1 : 0);
}

console.error(`repair.mjs - undo one cadence write, deliberately.

  --list [--after ISO]     the group's upcoming rows (public read, no credentials)
  --show <uuid>           one row, in full, before deciding
  --delete <uuid> --yes   delete that one row (needs ${CREDENTIALS.emailEnv}/${CREDENTIALS.passwordEnv})

Nothing here deletes more than one row, and nothing in the cadence workflow deletes anything at all.`);
process.exit(2);
