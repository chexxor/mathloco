/**
 * The GraphQL documents this integration sends, in one place.
 *
 * Both hosts run these same strings: the repo-side simulator (`../simulate.mjs`) and the n8n Code nodes
 * (the build inlines this file into them - see ../build-workflow.mjs). A query that is valid in one host
 * and stale in the other is the failure mode this file exists to prevent.
 *
 * Mobilizon 5.2.4, verified against `mobilizon.labradorius.com` on 2026-11-04 (see
 * ../records/2026-11-04-mobilizon-api-probe.md and ../records/evidence-2026-11-04.json):
 *   - the endpoint is `<base>/api/v1`, not `<base>/graphql` (the latter answers 404 `{"msg":"Resource not found"}`);
 *   - `createEvent` takes flat arguments, not an input object;
 *   - a GraphQL-level error comes back as **HTTP 200** with an `errors` array, so every caller must
 *     check for `errors` instead of trusting the status code;
 *   - the credential document is `login(email, password) -> { accessToken refreshToken user }`. There is no
 *     `sessionToken` field on this version, HTTP Basic is not honoured at this endpoint (a bogus
 *     `Authorization: Basic` answers the same `unauthenticated` error as no header at all), and there is no
 *     client-registration route (`/api/v1/apps` falls through to the GraphQL router and answers "No query
 *     document supplied"), so a per-execution sign-in is the only auth this instance offers out of the box.
 */

/**
 * One round trip per series: which group the events belong to (its actor id is `attributedToId`) and every
 * event in the window - past (the rhythm, and the row we copy) and future (the dedupe table, and the
 * "already scheduled far enough" check).
 *
 * `afterDatetime`/`beforeDatetime` bound the read so it cannot grow without limit as the club ages.
 *
 * This document is **public**: it carries no `loggedPerson`, so it answers with no errors over an
 * unauthenticated connection (measured 2026-11-04). That is deliberate - it is the read `simulate.mjs`
 * runs with zero credentials, and it means the n8n history node needs no secret attached to it. The ids a
 * write needs come from `READ_ACTOR_IDS`, which does.
 */
export const READ_SERIES_HISTORY = /* GraphQL */ `
query CadenceRead($preferredUsername: String!, $after: DateTime, $before: DateTime, $limit: Int) {
  group(preferredUsername: $preferredUsername) {
    id
    preferredUsername
    domain
    name
    organizedEvents(limit: $limit, order: BEGINS_ON, orderDirection: ASC, afterDatetime: $after, beforeDatetime: $before) {
      total
      elements {
        id
        uuid
        url
        title
        description
        beginsOn
        endsOn
        draft
        status
        visibility
        language
        category
        joinOptions
        options {
          timezone
          isOnline
          showStartTime
          showEndTime
          maximumAttendeeCapacity
          hideNumberOfParticipants
          hideOrganizerWhenGroupEvent
          commentModeration
        }
        physicalAddress {
          street
          locality
          region
          postalCode
          country
          geom
          type
          description
        }
        picture {
          uuid
          url
          name
        }
        tags { title }
        metadata { key title value type }
        contacts { id }
      }
    }
  }
}`;

/**
 * The only credentialed request in the workflow, and the only place a password is ever sent.
 *
 * What comes back is a **session** token scoped to this execution, not a long-lived API key: 5.2.4 exposes
 * no long-lived token and no OAuth client registration (see the header above). Two consequences worth knowing:
 *   - the refresh token is deliberately **not** selected. Keeping it would put a long-lived secret in the
 *     execution data for no benefit, since the next run signs in again in one round trip;
 *   - `user.actors` is selected because the write needs Mobilizon's internal actor ids, and hard-coding them
 *     survives exactly one account rebuild - and the failure it survives is the bad one (events attributed
 *     to the wrong actor, which look fine on the calendar).
 *
 * Verified 2026-11-04: the document validates against this instance (bogus credentials return
 * "Impossible to authenticate", not a validation error).
 */
export const LOGIN = /* GraphQL */ `
mutation CadenceSignIn($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    accessToken
    user {
      id
      actors {
        id
        preferredUsername
        domain
      }
    }
  }
}`;

/**
 * The write. Field-by-field variables (never string interpolation) so nothing the calendar holds can
 * become query syntax. `organizerActorId` and `attributedToId` are Mobilizon's *internal* actor ids, which
 * is why the read resolves them instead of the config hard-coding them.
 *
 * Selection set: the fields the audit step needs to prove the write landed.
 */
export const CREATE_EVENT = /* GraphQL */ `
mutation CadenceCreate(
  $title: String!
  $description: String!
  $beginsOn: DateTime!
  $endsOn: DateTime
  $category: EventCategory
  $language: String
  $draft: Boolean
  $visibility: EventVisibility
  $status: EventStatus
  $joinOptions: EventJoinOptions
  $tags: [String]
  $metadata: [EventMetadataInput]
  $contacts: [Contact]
  $options: EventOptionsInput
  $physicalAddress: AddressInput
  $picture: MediaInput
  $attributedToId: ID
  $organizerActorId: ID!
) {
  createEvent(
    title: $title
    description: $description
    beginsOn: $beginsOn
    endsOn: $endsOn
    category: $category
    language: $language
    draft: $draft
    visibility: $visibility
    status: $status
    joinOptions: $joinOptions
    tags: $tags
    metadata: $metadata
    contacts: $contacts
    options: $options
    physicalAddress: $physicalAddress
    picture: $picture
    attributedToId: $attributedToId
    organizerActorId: $organizerActorId
  ) {
    id
    uuid
    url
    title
    beginsOn
    endsOn
    status
    draft
    visibility
    options { timezone }
    physicalAddress { street locality region postalCode country geom }
    picture { uuid url }
  }
}`;

/**
 * After the write: every row on the candidate date, in the group. Two assertions ride on this one read -
 * the event we just made is there, and it is the only row for that series on that date. That is the
 * duplicate guard that matters: Mobilizon has no conditional create and no idempotency key, so the
 * dedupe is "read, decide, write, then prove what the date now holds".
 */
export const AUDIT_DATE_WINDOW = /* GraphQL */ `
query CadenceAudit($preferredUsername: String!, $after: DateTime!, $before: DateTime!) {
  group(preferredUsername: $preferredUsername) {
    organizedEvents(limit: 50, order: BEGINS_ON, orderDirection: ASC, afterDatetime: $after, beforeDatetime: $before) {
      total
      elements {
        id
        uuid
        url
        title
        beginsOn
        endsOn
        status
        draft
        options { timezone }
      }
    }
  }
}`;
