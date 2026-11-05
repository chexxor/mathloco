#!/usr/bin/env node
/**
 * probe-ntfy.mjs — is the alert channel real, private, and able to deliver?
 *
 *   node integrations/mobilizon-cadence/probe-ntfy.mjs              # anonymous checks; send only if NTFY_TOKEN is set
 *   NTFY_TOKEN=tk_... node integrations/mobilizon-cadence/probe-ntfy.mjs
 *
 * Why a probe and not just a node in the workflow: `23 Notify on ntfy` only ever runs when something goes
 * wrong (or a run writes something). A channel whose first exercise is its own failure is not a channel — it
 * is a hope. So this asks, out of band, the three questions that decide whether the alert path exists at all:
 *
 *   1. **Can a stranger post to our topic?** (anonymous publish — must be refused)
 *   2. **Can a stranger read our alerts?** (anonymous subscribe/poll — must be refused)
 *   3. **Can this integration actually send?** (authenticated publish, and a read-back if the token can read)
 *
 * 1 and 2 are worth checking even before a token exists, and they are the reason this probe is not gated on
 * credentials: the YunoHost package's posture is `auth-default-access: "deny-all"` plus an install-time grant
 * of **write-only to `everyone` on topics matching `up*`** (`scripts/install`, read 2026-11-04). A topic that
 * starts with those two letters would be writable by anyone on the internet, and the only way to know that is
 * not a fact you edited away is to ask the running server.
 *
 * Measured baseline, 2026-11-04 (Linux), before any token existed: anonymous publish ->
 * `{"code":40301,"http":403,"error":"forbidden"}`, anonymous poll -> the same, `GET /v1/version` -> `40101`.
 * `ntfy.labradorius.com` resolves to a **public** address (75.73.33.126 via the `labradorius.com` apex), unlike
 * `mobilizon.labradorius.com`, which answers only on the LAN — which is the whole reason this channel was
 * chosen over e-mail and over polling the Mobilizon host (D194).
 *
 * This probe publishes a message a human will see on their own phone. It says so in the text, and it uses the
 * default priority (3) rather than the problem priority, so it is audible exactly once.
 */
import { ALERT } from "./series.config.mjs";

const ROOT = ALERT.rootUrl.replace(/\/$/, "");
const TOKEN = process.env[ALERT.tokenEnv] ?? process.env.NTFY_TOKEN ?? null;
const problems = [];
const notes = [];

const post = async (path, { body, auth } = {}) => {
  const res = await fetch(`${ROOT}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

const get = async (path, { auth } = {}) => {
  const res = await fetch(`${ROOT}${path}`, { headers: { accept: "application/json", ...(auth ? { authorization: `Bearer ${auth}` } : {}) } });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

// ------------------------------------------------------------------ 1 and 2: the anonymous surface
// Both must be refused. A 200 here is not a tuning preference: it means the alert stream — which names the
// club's dates, and in a failure case quotes error text — is open to whoever guesses a topic string.
const anonPublish = await post("/", { body: { topic: ALERT.topic, message: "Mathloco cadence probe: an anonymous publish must NOT be accepted. Ignore this message.", priority: ALERT.priority?.dryRun ?? 3 } });
if (anonPublish.status === 200) {
  problems.push(`an ANONYMOUS publish to ${ALERT.topic} was accepted (HTTP 200, id ${anonPublish.json?.id}). Anyone who can reach ${ROOT} can post to this alert topic.`);
} else if (![401, 403].includes(anonPublish.status)) {
  problems.push(`anonymous publish returned HTTP ${anonPublish.status}, not the 401/403 that "deny-all" implies: ${JSON.stringify(anonPublish.json).slice(0, 200)}`);
} else {
  notes.push(`anonymous publish refused (HTTP ${anonPublish.status} ${anonPublish.json?.code ?? ""}) — expected under auth-default-access: deny-all`);
}

const anonRead = await get(`/${encodeURIComponent(ALERT.topic)}/json?poll=1`);
if (anonRead.status === 200) {
  const n = Array.isArray(anonRead.json) ? anonRead.json.length : 0;
  problems.push(`an ANONYMOUS poll of ${ALERT.topic} returned HTTP 200 with ${n} message(s). The alert stream is public; treat any alert content already sent as disclosed.`);
} else if (![401, 403].includes(anonRead.status)) {
  problems.push(`anonymous poll returned HTTP ${anonRead.status}: ${JSON.stringify(anonRead.json).slice(0, 200)}`);
} else {
  notes.push(`anonymous poll refused (HTTP ${anonRead.status} ${anonRead.json?.code ?? ""}) — the topic is not world-readable`);
}

// ---------------------------------------------------------------------------- 3: can we actually send?
let sent = null;
if (TOKEN) {
  const stamp = new Date().toISOString();
  const body = {
    topic: ALERT.topic,
    title: "mathloco cadence: channel probe",
    message: `This is a channel probe from probe-ntfy.mjs at ${stamp}. Nothing is wrong. It exists so the first time the alert path runs is not the time you learn it works.`,
    // 3, not ALERT.priority.dryRun: a dry-run report is priority 2 (no sound, drawer only) by design, and a
    // probe nobody noticed is indistinguishable from a channel that is broken. The probe has to be audible.
    priority: 3,
    click: ALERT.click,
  };
  const res = await post("/", { body, auth: TOKEN });
  if (res.status !== 200 || !res.json?.id) {
    problems.push(`authenticated publish returned HTTP ${res.status}: ${JSON.stringify(res.json).slice(0, 300)}`);
    notes.push(`a 401 here usually means the token is expired or revoked (ntfy tokens can carry --expires); a 403 means the token's user has no ACL entry for ${ALERT.topic}`);
  } else {
    sent = res.json;
    notes.push(`published probe message id ${sent.id} at ${new Date((sent.time ?? 0) * 1000).toISOString()} (topic ${sent.topic}, priority ${sent.priority ?? "-"}); it should be on the phone subscribed to ${ALERT.topic}`);
    // Read-back only if the token is allowed to read. A write-only grant is the *tighter* shape and is not a
    // failure: publish returns the id, which is already proof the message was accepted.
    const back = await get(`/${encodeURIComponent(ALERT.topic)}/json?poll=1`, { auth: TOKEN });
    if (back.status === 200) {
      const mine = (Array.isArray(back.json) ? back.json : []).find((m) => m.id === sent.id);
      if (mine) notes.push("read-back confirms the message is stored on the server, not just accepted");
      else notes.push(`the token can read the topic but the probe id is not in the poll window — cache expiry, not a broken send`);
    } else {
      notes.push(`the token cannot read ${ALERT.topic} (HTTP ${back.status}) — a write-only grant, which is the tighter posture; the publish response above is the evidence`);
    }
  }
} else {
  notes.push(`SKIP the send test: $${ALERT.tokenEnv} is not set in this shell. Mint one on the ntfy host and re-run.`);
}

for (const n of notes) console.log(`  · ${n}`);

if (problems.length) {
  console.error(`\nNTFY CHANNEL CHECK: FAIL`);
  for (const p of problems) console.error(`\n- ${p}`);
  console.error(`\nUntil this passes, treat cadence as unmonitored: the workflow composes messages, and nothing has proved a person receives them.`);
  process.exit(1);
}

console.log(`\nNTFY CHANNEL CHECK: PASS — ${ROOT}/${ALERT.topic} is closed to strangers${sent ? ` and this workspace can publish to it (message ${sent.id})` : " (send not tested: no token in this shell)"}`);
if (!sent) {
  console.log(`\nTo finish the send test (run these on the ntfy host, as the app user — the wrapper sets NTFY_CONFIG_FILE):
  sudo -u ntfy <install>/ntfy.sh user add --role=user cadence-bot
  sudo -u ntfy <install>/ntfy.sh access cadence-bot ${ALERT.topic} read-write
  sudo -u ntfy <install>/ntfy.sh token add --expires=365d --label="mathloco cadence" cadence-bot
  # --expires is a trap worth choosing with eyes open: when the token dies, alerts stop and nothing notices.
  # Either put the renewal date in a calendar now, or mint it without --expires and record a rotation date here.
then put the printed tk_... value in the n8n service environment as ${ALERT.tokenEnv} and re-run this probe.
<install> is the app's install directory (yunohost app info ntfy, or the package's admin doc). Tokens are not
topic-scoped (upstream docs, read 2026-11-04: a token grants the whole account), so the least-privilege shape is
the **account**: a non-admin user whose only ACL entry is this topic.`);
}
