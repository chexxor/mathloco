# Where a fetch cron runs, and what it is allowed to touch

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/harvest-cron-host.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

> **Superseded as an instruction, kept as a measurement (2026-11-23, MS42, S092, ADR-0010).** The job this file
> evaluated — `npm run events:harvest` → `node scripts/events-harvest.mjs` — **is deleted from this repository**.
> Event data now arrives as one commit from `social-event-publisher` (`docs/spec/event-data-handoff.md`), so the
> question "where does the fetch cron run?" is answered in **that** repository, not here. What still transfers is
> the measurement: a fetch of a public feed needs **no credential**, needs **no dependencies**, is one anonymous
> GET, and the scheduling options rank the same way wherever the job lives. **Every command below that names
> `scripts/events-harvest.mjs` is void in this tree** — read them as the shape of the job, not as something to
> paste here. This repo's own freshness backstop is `check:ics`: the `runway` rule and the `stale-snapshot` rule
> (**D471**) fail a build when the file's single stamp ages past 21 days.

Symptoms: "where should a fetch cron run", "can n8n do it", "does a harvest need a token", "the snapshot is stale
and nothing said so", "Gitea/Forgejo Actions?", "can it live in a container on Unraid?"

Ruling so far: **3(a), 2026-11-07** — the harvest runs from the home server, **daily**, and the **push stays the
operator's**: a harvest lands something to review, never a publish. It has **no `D###` id** — it exists only as
prose in `.notes/roadmap-events.md` ("Ruling 3") and in `NEXT.md`, so nothing in the tree can cite it and
`check:decisions` cannot see it. **When the host is chosen, mint one id covering the ruling, the host, and the
credential scope together.** This file is the evaluation under that ruling, not a re-opening of it. A11 in
`MILESTONES.md` is the item.

**Status of the commands below.** The requirement table is measured here, on this rig, 2026-11-07. The unit
files and the clone commands are **not executed anywhere**: this seat has no shell on the home server (see
"This seat cannot install it"). They are written to be pasted by the operator, and the first executed run
belongs in `design/records/` and must correct anything here it contradicts. A `runbooks/README.md` rule says a
runbook is written after an incident, with the commands that diagnosed it — the diagnosis half of this file is
that kind; the install half is a hand-off, marked as such in the index row.

## What the job actually is (measured 2026-11-07, Fedora 45 native, Node 22.23.4 from `.nvmrc`)

The job measured here was `npm run events:harvest` → `node scripts/events-harvest.mjs` (240 lines, importing only
`node:fs` and `node:path`). Deleted 2026-11-23; the table is what was measured about it, and it is the closest
thing this tree now has to a spec for the publisher's run.

| need | answer | how it was measured |
|---|---|---|
| runtime | Node ≥ 18 (top-level `await`, global `fetch`). Repo pins **22.23.4** (`.nvmrc`, D31) | `node -v` + reading the imports |
| dependencies | **none** — no `node_modules`, no `npm ci`, no lockfile, no build step | the import list |
| secrets | **none.** The script read no `process.env` at all | `grep -n "process.env"` over the file, 2026-11-07 (the file is deleted; the answer is kept) |
| network | one unauthenticated HTTPS GET of `source.url` from `data/events.json` | `curl -sS https://mobilizon.labradorius.com/@minneapolis_math_book_group/feed/ics` → **200**, `text/calendar; charset=utf-8`, **4184** bytes, 39ms (LAN view; that name resolves to **192.168.1.120** from inside the LAN, `getent hosts`) |
| filesystem | reads and rewrites **`data/events.json`**, relative to the **current directory** (`resolve(argOne('--out','data/events.json'))`) → a runner that does not `cd` into the checkout just fails, or worse, writes a file somewhere unexpected | reading the file + running a dry run |
| exit status | `0` ok, `1` feed HTTP failure, `2` no feed url → cron-level alerting is a shell `if` | reading the file |
| output | stdout only (what changed, what to fix by hand, `SEQUENCE` moves) → needs a log sink | dry run, below |
| what it does **not** do | no `git` call of any kind, no commit, no push, no art mirroring, no `series` naming, no `timeConfirmed`, never deletes a row | reading the file |

Dry run from this seat, 2026-11-07T21:33Z: `3 VEVENT(s) in the feed, 4 row(s) in the snapshot, 4 not yet past`,
every row `unchanged`, plus the standing note that UID `649bf59a…` is in the snapshot and not in the feed (D72:
that row is announced `STATUS:CANCELLED`, not dropped — a human owes it).

### The credential in the sketched cron line is not needed by this script

`.notes/NEXT.md` (Operator ToDo 1, and `.notes/roadmap-events.md`'s "Ruling 3" paragraph) said `MATHLOCO_TOKEN`
"(fine-grained PAT, Contents: read-only)" "has to exist for the script to fetch". It does not: the fetch is an
anonymous GET of a public feed (200 above, no `Authorization`), and the script never reads an environment
variable. **Corrected here and in `NEXT.md`.** A token is only needed for a step the script does not perform:

| if the runner also… | then it needs | and that is a separate ruling |
|---|---|---|
| `git pull` the checkout | forge **read** (public repo: nothing at all; private: a Contents:read-only PAT or a deploy key) | keeps a shared checkout current |
| `git commit` locally | nothing — a commit needs no credential | local commit, reviewed on the box |
| `git push` a branch | forge **write** (Contents: read+write) | **against ruling 3(a) unless the target is a review branch**; a harvest that pushes to `main` publishes unreviewed copy |

Today `mathloco` is a **public** GitHub repo (`https://github.com/chexxor/mathloco` → 200, measured), so even the
`git pull` half needs no secret over HTTPS.

### This seat cannot install it

`~/.ssh/` on this rig holds only `durian_pi_deploy`, and `~/.ssh/known_hosts` has no entry for
`labradorius.com` or `192.168.1.120` (`grep -c` → 0). The delegate has **no shell on the home server**; the hand
stays the operator's, which is what A11's exit criterion ("the host's crontab line + secret path handed to the
operator") already assumes. Anything below is written to be pasted by the operator.

## The options

Ranked. "Access it gains" is the part that decides it, not the scheduling syntax. **Void in this tree since
MS42** — the unit files and cron lines below name a script that no longer exists here. They are kept because the
ranking and the syntax transfer to whichever host runs the publisher's fetch, and re-deriving them cost a session.

### 1. A `systemd` timer (or plain cron) on the Yunohost host, in a **dedicated** checkout — recommended

- **Access it gains:** write to one file inside one directory owned by the user that runs it. Nothing else. No
  new listening port, no new credential, no new daemon.
- **Pros:** the smallest thing that satisfies the ruling; the review artifact is `git diff`, the same thing the
  operator reviews by hand now; survives `yunohost app upgrade` because it is not an app's file (that claim is
  about the package not owning it — **re-read the unit file after the next upgrade and record the answer**);
  a timer with `Persistent=true` runs the missed job when the box comes back, which a crontab line does not;
  journald holds the log, so "did the 04:17 run happen?" is `journalctl -t mathloco-harvest`.
- **Cons:** no UI, no retry, no alert (the alert half is option 2); a second checkout means the diff has to be
  read on the box or brought over (`git format-patch -1` + `scp`), which is one command of friction per week.
- **Why a dedicated checkout and not the operator's working copy:** `data/events.json` is both input and output,
  and the repo's own pitfall list says one writer per branch — a nightly rewrite landing under a session that is
  editing the same file is that pitfall, scheduled.

Install (operator, on the box). Read the two verification lines first; the rest assumes their answers.

**Void in this tree since MS42 (2026-11-23).** The blocks below were written against
`scripts/events-harvest.mjs`, which is deleted from this repository. They are kept because the unit syntax, the
`WorkingDirectory=` trap (the fetcher resolved `data/events.json` from cwd) and the journald/`Persistent=`
reasoning transfer to whichever host runs the publisher's fetch. Do not go looking for that path in this tree.

```bash
# 1. Verify the runtime the cron will see — NOT the shell's. cron's PATH is /usr/sbin:/bin:/usr/bin.
sudo -u mathloco env -i PATH=/usr/sbin:/bin:/usr/bin sh -c 'command -v node && node -v'
#    If that prints nothing, use the absolute node path in the unit's ExecStart= line.

# 2. Verify reachability *from that host* — the open question in roadmap-events.md ("Not settled").
#    On this box the name resolves to the box itself; a hairpin loop can still be refused by the firewall.
getent hosts mobilizon.labradorius.com
node /srv/mathloco-harvest/scripts/events-harvest.mjs          # dry run: prints, writes nothing

# 3. The dedicated checkout (public repo, so an anonymous clone). `mathloco` below is a name you choose:
#    a dedicated system user is cleaner than running it as root or as your own user.
sudo mkdir -p /srv && sudo git clone git@github.com:chexxor/mathloco.git /srv/mathloco-harvest
sudo chown -R mathloco:mathloco /srv/mathloco-harvest          # the user that runs the job
```

```ini
# /etc/systemd/system/mathloco-harvest.service
[Unit]
Description=mathloco: re-read the club calendar into data/events.json
[Service]
Type=oneshot
User=mathloco
WorkingDirectory=/srv/mathloco-harvest            # the script resolves data/events.json from cwd
ExecStart=/usr/local/bin/node scripts/events-harvest.mjs --write
ExecStartPost=/usr/bin/git -C /srv/mathloco-harvest diff -- data/events.json
# alert-on-failure, if ntfy is on this box — hostname and topic come from `yunohost app info ntfy`:
# ExecStartPost=/bin/sh -c 'curl -sf -H "Authorization: Bearer $(cat /etc/mathloco/ntfy.token)" -d "mathloco harvest failed: $(journalctl -t mathloco-harvest -n 3 -o cat)" https://<ntfy-host>/<topic>'
```

```ini
# /etc/systemd/system/mathloco-harvest.timer  — daily, after the club's evening, before a workday
[Unit]
Description=daily mathloco harvest
[Timer]
OnCalendar=*-*-* 00:17:00 America/Chicago
Persistent=true
[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now mathloco-harvest.timer
systemctl list-timers mathloco-harvest.timer            # it is installed when this prints a NEXT column
```

The one-line cron form (what `NEXT.md` carried) is equivalent, minus catch-up and journald; keep the `cd`:

```cron
17 13 * * *  cd /srv/mathloco-harvest && /usr/local/bin/node scripts/events-harvest.mjs --write >> ~/logs/mathloco-harvest.log 2>&1
```

Note on that line: the box's timezone decides the hour. `17 13 * * *` was chosen as 07:17 America/Chicago in
CDT; a systemd `OnCalendar=` carries its own zone and does not care.

Then, once a run has landed, A11's last exit criterion: write `design/records/NNNN-harvest-first-run.md` with the
`journalctl` excerpt and the `git diff`, and record the host ruling as a `D###` in `.notes/DECISIONS.md`.

### 2. n8n (already on the box) — recommended **for the watcher**, not for the harvest itself

The instance is **n8n 2.45.7~ynh1** (`2.45.7~ynh1` read off the SPA's sentry config, `docs/howto/n8n-runtime-loop.md`),
so n8n 2.x defaults apply. Two ways to make n8n write a repo file, and each costs an instance-wide relaxation:

| route | what has to change on the instance | source |
|---|---|---|
| Code node doing `fs` | `NODE_FUNCTION_ALLOW_BUILTIN=crypto,fs` (+ restart). That allows `fs` in **every** Code node and every expression on the instance, not just this workflow | `docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/configuration-examples/enable-modules-in-code-node.md` ("For security reasons, the Code node restricts importing modules") |
| Read/Write Files from Disk, or Execute Command | both are **blocked by default in 2.x**; the documented way to enable them is `NODES_EXCLUDE: "[]"`, which un-blocks *both at once* — i.e. a publicly reachable runner gains arbitrary command execution | `docs.n8n.io/deploy/host-n8n/configure-n8n/security/block-specific-nodes.md` and `.../core-nodes/n8n-nodes-base.executecommand.md` ("significant security risks… disabled by default from n8n 2.0") |

- **Pros:** the schedule is visible and editable in the UI; run history and retries are built in; the error
  watcher and the ntfy alert path already exist there for the cadence; the host already makes outbound calls to
  Mobilizon, so it is not new reach.
- **Cons:** the two relaxations above are the whole argument — `n8n.labradorius.com` answers from the internet
  (measured `/healthz` → 200 from this seat), and after them, whatever can create a workflow on that instance
  can write the checkout whose diff the operator ships; the review artifact degrades from `git diff` to an
  execution log, and reading execution data back from here is already known to be limited by retention settings;
  and the box gains a fourth reason to be up.
- **What it is genuinely the right tool for — close the hole the runway rule leaves.** The runway gate (D188)
  asks *is there a row near*, not *is this row still true*, and D223 is the ruling that had to cover the row that
  got dropped: a Nov 7 meetup stayed published after the source stopped listing it, and no gate saw it. A **freshness watcher** needs no new permission at all: an HTTP Request node against
  `https://minneapolismathbookclub.org/events.ics`, an `X-WR-CALNAME`/`DTSTAMP` read, and if the stamp is older
  than ~2 days, the existing ntfy error path fires. No `fs`, no `executeCommand`, no env change — and it also
  catches "the cron ran but the push never happened", which a local log cannot see. **Numbered question in
  `NEXT.md`.**

### 3. Gitea or Forgejo Actions — only if a self-hosted forge is coming anyway

Nothing in this repo's notes mentions a Gitea/Forgejo instance, and `origin` is `github.com:chexxor/mathloco`
(public, measured 200). So this option is really two decisions: run a forge, and then either **migrate** the
repo (CI at `.github/workflows/ci.yml`, the Cloudflare repo hook D47/D56, and the deploy path all key off GitHub
today) or **mirror** it and harvest from the mirror.

- **Access it gains:** a runner daemon with a forge write token, plus (if mirroring) a push credential back to
  GitHub.
- **Pros:** a **pull request** is the best review artifact of any option — a harvest that opens a PR fits
  ruling 3(a) exactly, since a PR is not a push; the schedule lives next to the code; no home-server cron file
  to keep alive through upgrades.
- **Cons:** the most machinery for the smallest job; two forges means two histories for the one file that *is*
  the site's data (`data/events.json`), and a mirror that drifts silently harvests against stale rows; an
  unattended commit that turns `check:ics` red now arrives as a red pipeline instead of a line in a log; and a
  forge on the same home server is strictly more moving parts than option 1 at the same trust level.

### 4. GitHub Actions `schedule:` — zero new infrastructure, and it makes GitHub load-bearing

Reachability is no longer the blocker (D182: a phone on cellular loaded the instance; and the repo is public so
Actions minutes are free). The runner needs a `Contents: write` token to open the PR, and `schedule:` triggers
fire on the **default branch only**.

- **Pros:** nothing to install, nothing to upgrade, and the PR review form of option 3 without a forge.
- **Cons:** **D66 says GitHub must not become load-bearing** — a freshness guarantee that depends on GitHub's
  scheduler, on GitHub's egress, and on the public path into a residential home server is exactly load-bearing;
  it also needs the only write-scoped token in this system, and a third-party runner is the one host the
  operator does not control.
- Also ruled out, so nobody re-proposes it: a **Cloudflare Cron Trigger** — D48, the Worker entrypoint has no
  `scheduled` handler.

### 5. Docker container on Unraid — works, and it is the most machinery for one `node` call

- **Access it gains:** a bind-mounted checkout writable by whatever UID the container runs as (a container is
  root by default, so the file it rewrites changes owner unless `--user` is set to match the host owner), plus
  network egress, plus an image that must be pinned by digest because its output is what the operator ships.
- **Pros:** isolates the job from the Yunohost box (a real preference if the operator wants nothing hand-written
  there); an Unraid box is normally always on; it is the option that does not touch the app host at all.
- **Cons:** Unraid does not schedule a container command natively, so you add a supervisor running cron inside
  the container (or a community template) — that is a scheduler, a container, an image and a mount, all
  scaffolding around one `node` call (the fetcher it wrapped, `node scripts/events-harvest.mjs --write`, is
  deleted here — MS42); the job needs no dependencies, so the
  isolation buys nearly nothing; and the checkout now lives in a third place (Unraid share, container, dev box),
  which makes the review step the hard part instead of the easy part. (The "scaffolding around one `node` call"
  line below names the deleted fetcher — same void as the install blocks above.)

## What to measure if the ranking is contested (cheapest first)

1. Whether n8n's Code node sees `fs` today, and whether `readWriteFile`/`executeCommand` are loaded on that
   instance — `integrations/mobilizon-cadence/n8n/env-probe.json` is the repo's own probe for this class of
   question (`docs/howto/n8n-cadence-preconditions.md`); the answer is 4 minutes and it settles option 2's
   cost without arguing from docs.
2. The fetch command (dry, no write) **on the host that would run it** — settles the reachability question the
   roadmap note left open, for whichever host is in question. Before MS42 that command was this repo's own
   `node scripts/events-harvest.mjs`; it is deleted, so today the measurement belongs to
   `social-event-publisher`.
3. `yunohost app list` and `yunohost app info n8n` on the box — what the app's own cron does (an app that owns a
   cron entry is a place a job can live *inside* the app's upgrade lifecycle, which is a different tradeoff from
   a hand-written unit file).
