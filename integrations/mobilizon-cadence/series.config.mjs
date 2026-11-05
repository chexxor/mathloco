/**
 * The series table - the one place a maintainer edits to change what this integration does.
 *
 * This file is the source of truth for both hosts: `simulate.mjs` imports it, and `build-workflow.mjs`
 * inlines it into the n8n "01 Config" Code node. There is no copy of it inside n8n to keep in step.
 *
 * Every value here is either quoted from the organizer's own Mobilizon rows or chosen as an operating
 * limit and labelled as one. Nothing here states a cadence as a fact about the club (D92 keeps frequency
 * words off the site); these are the spacing rules the automation will *try* to hold, measured from the
 * rows in `fixtures/group-history-2026-11-04.json` (read from the live instance 2026-11-04):
 *
 *   MPLS Math Club - Bimonthly Social       2026-05-08, 05-22, 06-05, 11-07   14 days apart, Saturdays
 *   Parallel Learning for Mathematical Minds 2026-11-11                        Wednesdays, "twice a month"
 *
 * If the organizer's real rhythm is not 14 days, change `everyDays` here - that is the whole point of
 * keeping the rhythm as data rather than as a rule engine.
 */

export const INSTANCE = {
  // Measured 2026-11-04 on Mobilizon 5.2.4: the GraphQL endpoint on this instance is `/api/v1`.
  // `/graphql` answers 404 `{"msg":"Resource not found"}`, which is what the public docs imply you should
  // use - so the path is recorded here rather than remembered.
  baseUrl: "https://mobilizon.labradorius.com",
  graphqlPath: "/api/v1",
  // The n8n nodes use the absolute URL literally. This is here so a reader, and the build's own assertion,
  // can see which host this integration is allowed to write to.
  expectedHost: "mobilizon.labradorius.com",
  // The workflow's own clock zone. The trigger says 09:00 and this is what that means; leaving it to the n8n
  // instance default is how a schedule quietly moves when the host is rebuilt.
  timezone: "America/Chicago",
};

/**
 * Where the Mobilizon account lives - **by name only**. These are the names of environment variables set on
 * the n8n host (see README, "Credentials"); the workflow reads them with `$env`, so no password exists in the
 * repo, in the workflow JSON, or in the config item that every node can see. The build refuses this field if
 * it is ever given a value instead of a NAME.
 *
 * Mobilizon 5.2.4 offers no long-lived API token, and this workflow signs in per run with this account. OAuth
 * does exist on the instance - but on the apex (`POST /apps`), not under `/api/v1`, and its grants need a
 * one-time human authorisation plus a rotating refresh token (measured and read in lib/queries.mjs; D185), so
 * it moves the secret rather than removing it. If the operator chooses a scoped service account, `03 Sign in`
 * is the only node that changes.
 */
export const CREDENTIALS = {
  emailEnv: "MOBILIZON_EMAIL",
  passwordEnv: "MOBILIZON_PASSWORD",
};

export const RUN = {
  /**
   * `true` computes everything and writes nothing: the decision arrives as `would_create` with the exact
   * payload it would have sent, printed in the report. Flip to `false` after watching one dry run you agree
   * with. This is the only kill switch, so it is deliberately the first line of the config.
   */
  dryRun: true,
  /** Never write a date further out than this. A series whose rule points past the horizon is skipped -
   *  the club stays able to plan by hand, and a runaway loop cannot fill next year. */
  horizonDays: 28,
  /** How far past the last existing row the rule may reason while catching up. Past this the run alerts
   *  instead of inventing a chain of dates nobody asked for. */
  maxCatchUpSteps: 6,
  /** The read window, in days. Back: enough history to see the rhythm and survive a long gap. Forward:
   *  enough to see every date the club has already scheduled by hand. */
  readBackDays: 400,
  readAheadDays: 120,
  readLimit: 100,
};

/**
 * The alert channel - **one topic on the operator's own ntfy server** (D194, adopted 2026-11-04).
 *
 * Measured on 2026-11-04 from this workspace (Linux), so a future session does not re-guess it:
 *   - `ntfy.labradorius.com` resolves CNAME `labradorius.com` -> `75.73.33.126` - **public**, not LAN-only,
 *     unlike `mobilizon.labradorius.com` (192.168.1.120). So the alert reaches a phone off the LAN, and
 *     nothing can poll the Mobilizon host from away from home.
 *   - Anonymous publish and anonymous poll are both refused: `POST /<topic>` -> `{"code":40301,"http":403,
 *     "error":"forbidden"}` and `GET /<topic>/json?poll=1` -> the same. `GET /v1/version` -> `40101`. That is
 *     the YunoHost package's own posture, read from its `conf/server.yml`: `auth-default-access: "deny-all"`
 *     plus `enable-login: true`, and `ntfy access everyone "up*" wo` at install (so **a topic must not start
 *     with `up`** - the package grants anonymous write-only there for its iOS upstream flow).
 *   - So the channel needs a credential: an ntfy **access token** in an n8n environment variable, exactly like
 *     the Mobilizon password (`CREDENTIALS`). ntfy tokens are `tk_`-prefixed and - measured from the upstream
 *     docs - "grant users full access to the user account", i.e. they are **not topic-scoped**. Least privilege
 *     therefore comes from the *account*: a purpose-built non-admin user whose ACL entry is
 *     `read-write` on this one topic and nothing else. See docs/operator-guide.md for the commands.
 *   - E-mail is not the channel: `labradorius.com` has no apex TXT (no SPF) and no MX record (measured
 *     2026-11-04 by `dig`), and the n8n package's pre-wired SMTP points at the YunoHost mail server that those
 *     records say is not set up for sending. Discord is the fallback (the repo already has a Discord webhook
 *     gate); ntfy was chosen because it is one `POST`, self-hosted, needs no bot, and works on a phone with no
 *     account beyond the topic.
 *
 * The URL is the **root**, not a topic path: ntfy accepts the whole message as a JSON body only when the
 * request goes to the server root ("To publish as JSON, you must PUT/POST to the ntfy root URL, not to the
 * topic URL" - docs, read 2026-11-04). That keeps the httpRequest node in the same `specifyBody: "json"` shape
 * as every other HTTP node in this workflow, so there is no second body style to review.
 */
export const ALERT = {
  provider: "ntfy",
  host: "ntfy.labradorius.com",
  rootUrl: "https://ntfy.labradorius.com/",
  /** Topic ids in ntfy are `[a-zA-Z0-9_-]{1,64}`. `mathloco-` prefixes it so a topic on a shared home server
   *  still says which project it belongs to, and it deliberately does not start with `up` (see above). */
  topic: "mathloco-cadence",
  /** Name of the n8n environment variable holding the `tk_...` token - a NAME, never a value, under the same
   *  rule as `CREDENTIALS` (the build refuses a value, and the token never enters the workflow JSON). */
  tokenEnv: "NTFY_TOKEN",
  /** What tapping the notification opens. The public schedule page, because that is the thing an alert is
   *  about, and reading it is how you tell whether the alert is stale. */
  click: "https://minneapolismathbookclub.com/#when-we-meet",
  /** Priorities are measured from the upstream table: 5 max (long vibration, pop-over), 4 high, 3 default,
   *  2 low (no sound, drawer only), 1 min. Nothing here is a 5: these messages arrive at 09:00 and a calendar
   *  problem is not a three-in-the-morning emergency. A run with nothing to say sends nothing at all. */
  priority: { problem: 4, wrote: 4, dryRun: 2 },
  /** Only `warning` is used, because that tag name is quoted from the upstream examples. Other emoji tags are
   *  plausible but unverified here, and an unknown tag name is a message that fails to publish. */
  tags: { problem: ["warning"] },
  /** The message text is capped here as well as in the reporters, so a 400 from ntfy is not how a person finds
   *  out something went wrong. (ntfy's own limit was not measured; 1000 chars is far under the 4096-byte
   *  figure in the message-format docs, which is the number to re-check if this ever truncates.) */
  maxMessageChars: 1000,
};

export const SERIES = [
  {
    key: "mpls-social", // stable id; never reuse it for a different series
    // Quoted from the organizer's row, verbatim. This string is the dedupe key as well as the new row's
    // title, so an edit here must match the Mobilizon title or the series stops being recognised (the run
    // will alert rather than silently create a second series).
    // The word "Bimonthly" is the organizer's, not ours: D92 keeps frequency words off the *site*, and the
    // harvester already quotes this title rather than rewriting it.
    title: "MPLS Math Club - Bimonthly Social",
    aliases: ["MPLS Math Club Social", "Bimonthly Social"], // earlier titles, so a rename does not orphan the history
    groupActor: "minneapolis_math_book_group",

    everyDays: 14,      // the spacing in the rows above
    weekdaySnap: 6,     // 6 = Saturday: pull the date back onto the club's weekday if a row drifts
    timezone: "America/Chicago", // declared, never inferred (see lib/core.mjs, "The clock rule")
    skipDates: [],      // "sometimes we miss one", as data: ["2026-12-19"]

    maxFuturePerSeries: 2, // stop once this many future dates exist; the club plans ahead by hand past that
    minLeadDays: 2,        // write anyway, but say so, if the date starts sooner than this
    strictTimezone: false, // true = alert instead of writing when a row's declared zone is not the series'

    // What the new row looks like to members
    visibility: "PUBLIC",
    joinOptions: "FREE",
    draft: false,            // true = park it as a draft for a human to publish
    copyPicture: true,       // carry the club's event art by reference (`picture.mediaUuid`), verified 2026-11-04
    blockOnSameDayConflict: true, // another group event already on that date -> skip and say so
  },
  {
    key: "parallel-learning",
    title: "Parallel Learning for Mathematical Minds",
    aliases: [],
    groupActor: "minneapolis_math_book_group",
    // 14 days is the club's stated cadence, not a measured one: Mobilizon holds exactly ONE row for this
    // series (2026-11-11, saved in fixtures/group-history-2026-11-04.json), so there is no gap history here to
    // take a mode of. "twice a month on weekday evenings" is quoted from that row's own description, and 14 is
    // also the spacing the social series' four rows show (14, 14, then a 155-day summer gap). Revisit once a
    // few parallel sessions exist - the anchor is the newest row, so history in Mobilizon is what this tracks.
    everyDays: 14,
    // No snap: 14 days from a weekday lands on the same weekday, so there is nothing to correct - and if a
    // human moves one session to a Tuesday, the next should stay a Tuesday. This series' own description says
    // "weekday evenings", not a named day. mpls-social keeps its snap because the club has stated a Saturday
    // pattern that a one-off weekday should not silently replace.
    weekdaySnap: null,
    timezone: "America/Chicago",
    skipDates: [],
    maxFuturePerSeries: 2,
    minLeadDays: 2,
    strictTimezone: false,
    visibility: "PUBLIC",
    joinOptions: "FREE",
    draft: false,
    copyPicture: true,
    blockOnSameDayConflict: true,
  },
];
