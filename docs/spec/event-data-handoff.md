# Event-data handoff — the file arrives; this repo reads it

The page that says **who writes `data/events.json`**, and what this repository may and may not do about it. It
sits beside `docs/spec/source-contract.md` (gate **G2**) and narrows one thing that file used to state: the
snapshot used to be written by a harvester run inside this repo. It is not any more.

One upstream project — `chexxor/social-event-publisher` — reads the club's platforms, decides what is published,
and puts the result into **this** repository as **one commit to one path**. This repository reads whatever that
path holds at the branch it builds from. Nothing here fetches a platform for event data, and **a gate that tells
a reader to fetch one is a defect in the gate**, not a instruction to the reader.

The far side owns the shape. Its contract is **`mathloco-sink.md`** in the `social-event-publisher` repository,
under that repository's own spec home, **v1.6 (2026-11-18)** with **ADR-0017** in that tree; its requirement ids
(`MH-FR-###`) are cited here rather than restated — a rule copied twice is a rule that drifts. Where the two
documents disagree about what this repo's build actually reads, **this repo's gate is the truth**: the far side
says so in its own closing paragraph, and the fixture section below is the test that turns a disagreement into a
red build instead of an argument.

## The path, the branch, and who deploys

| Claim | The rule | Whose call |
|---|---|---|
| The path | `data/events.json` — one file, one path; the sink refuses any other path, including one resolving outside `data/` | `MH-FR-003` |
| Branch during the testing period | **`staging`** | the operator, 2026-11-23 |
| Branch once it works | **`main`** | the operator, 2026-11-23 |
| A config that names no branch | the sink refuses and names the key; the branch is never defaulted, because `main` is what the site builds from and `staging` is the review branch | `MH-FR-002` |
| Commits per run | at most one; a run that would need two stops and reports | `MH-FR-016` |
| What a push buys here | a gate run, not a deploy — CI runs `npm run verify` on a push to `main` or `staging` and holds no Cloudflare credentials (`.github/workflows/ci.yml`) | this repo |
| Who deploys | the operator, from this workspace, via `npm run deploy`, which runs `verify` before any `wrangler` command | `AGENTS.md` §Non-negotiables, **D42** |

The consequence a session must not miss: **a handoff commit changes what a visitor sees only when this repo is
next built and deployed.** A green CI on a handoff commit means the file is shaped correctly. It does not mean
the new date is live, and it does not mean the old date was ever live anywhere else — the site has exactly one
event input, `src/lib/events.mjs`, and it reads the tracked file at build time.

## The shape, as this repo's own gate holds it

Top-level keys this repo accepts are `calendar`, `source`, `events`, `stalenessOkUntil`, `superseded`, and any
key beginning with `_` (`SNAPSHOT_KEYS` at `scripts/check-ics.mjs:109`, enforced by the `snapshot-keys` rule).
What the committed file actually carries @measured 2026-11-23 by `node -e` over `data/events.json` (Linux
native, Node 24.22.1): `_rule`, `calendar`, `_dropped`, `_runway`, `events`, `source`, `superseded` — three
top-level prose keys, all `_`-prefixed, all written by a human in this repo.

| Key | Required here by | Who authors it | What this repo does with it |
|---|---|---|---|
| `calendar` | `prodid` and `vtimezone` rules | carried from the file at the branch head; the publisher claims no `prodid` or timezone | `src/lib/ics.mjs` renders the feed from it |
| `source` | `url` and `fetchedAt` | the publisher authors `kind`, `url`, `fetchedAt`; everything else in the object travels byte-for-byte from the head (`MH-FR-026`) | the feed's provenance line, and the stamp every row's `DTSTAMP` must equal |
| `events` | every row rule | the publisher's rows, ordered by `start` then `uid` (`MH-FR-010`) | one array, two windows: `src/lib/event-window.mjs` splits it into upcoming and past at build time |
| `stalenessOkUntil` | optional | **this repo only** — a hatch is an explicit grant that a short runway is fine, and the publisher refuses to invent one (`MH-FR-011`) | the `runway` rule's hatch, and §"When a check goes red now" turns on it |
| `superseded` | demanded equal to the drop list the grouping produces (`superseded-log`) | computed by the publisher over the rows it writes | a record, checked against the renderer's own decision on every build |
| `_`-prefixed keys | allowed at the top level only | **this repo** — prose a reader wrote, never a field of the publisher's | carried byte-for-byte; nothing in this repo regenerates them |

**There is no `version` field in the file.** The version is a section of the far side's contract, and a version
maintained inside the data would be a second oracle no test can fail — which is also why `snapshot-keys` refuses
an unknown top-level key rather than tolerating one.

A row's fields are the sixteen named at `scripts/check-ics.mjs:352` — `uid`, `slug`, `summary`, `series`,
`seriesNote`, `start`, `end`, `timeConfirmed`, `venue`, `geo`, `blurb`, `url`, `image`, `sequence`, `status`,
`source` — and the seven the gate requires are `uid`, `slug`, `summary`, `status`, a non-negative integer
`sequence`, `source.feed` and `source.fetchedAt` (`:343`–`:347`). A row key beginning with `_` is prose and
passes; the committed rows carry `_summary`, `_series`, `_times`, `_reissues`, `_image`, `_status`, `_slug` and
`_dtstamp` alongside their fields @measured 2026-11-23 by the same probe. A field outside the sixteen fails
`sourced-rows` on this side and is refused before a byte is sent on that side (`MH-FR-005`), so a new field is a
change to **both** repositories — see the request section for what this repo will ask for and how it will not
smuggle it in.

## One harvest stamp, and why a moving one is a defect

The file carries **one** harvest instant, and every row it carries names that same instant in
`source.fetchedAt` (`MH-FR-023`). The shape is `YYYY-MM-DDTHH:MM:SSZ` with no fraction: a fraction is cut rather
than carried, because `src/lib/ics.mjs` throws at anything else inside the renderer, which would kill a build
before any validator could name a rule (`MH-FR-022`).

This repo already enforces the equality — the `dtstamp` rule compares each row's `DTSTAMP` with the file's stamp
— and the reason is not tidiness. A stamp that moves between builds re-notifies every subscriber that already
holds the feed, on every deploy. That is the same harm **D72** and **D225** exist to prevent, arriving through a
different door.

## A finished row travels; the gate that used to refuse it was wrong

The publisher carries a row that has finished rather than deleting it, and carries its `status`, because deleting
a row un-announces a date to every subscriber that already holds it (`MH-FR-012`; **D72** says the same thing
from this side). This repo's `check:ics` used to fail exactly that row: `stale-live-row` fired on a past-dated
`CONFIRMED` row and told the reader to re-run the harvester. Under the handoff that rule enforces a fetch-era
assumption — that this repo can and should re-read the platform — and it fires on a file that is correct.

The re-ruled rule, and the reasoning with its alternatives, is **D471**. What survives is the part that protects
a subscriber: a file whose single harvest stamp has run past its `stalenessOkUntil` hatch is a file nobody has
refreshed, and that still fails by name. A carried finished date does not.

## The two vendor fixtures are a test in this tree, not a sample

The far side's standard ships two files, and both were vendored into this repository on 2026-11-18 (one Contents
API commit each, `ADR-0017`'s amendment):

| File | What it is | What this repo must do with it |
|---|---|---|
| `data/fixtures/mathloco-snapshot.json` | the standard's shape, as its own suite pins it | must **pass** this repo's shape check |
| `data/fixtures/mathloco-snapshot-misshapen.json` | the same file with the shape broken on purpose | must **fail**, with the findings named |

A copy of a vendor's fixture is not a publication and does not make `data/events.json` two paths (`MH-FR-003`
still names one). What it buys is the differential: if the far side's standard and this repo's gate ever stop
agreeing, a build goes red in both repositories rather than one team discovering it in production. The
`@measured` blob ids the far side records for the two copies are `bc52bf4b3feea80896ea88b206c5d118a393aaf8` and
`442abd71b8ba6396773e967a0a5edbdfadb60e64`.

## When a check goes red now

| Finding | What it means under the handoff | What to do |
|---|---|---|
| `runway` | the file's stamp is older than its hatch, so nobody has refreshed it | the publisher's run is the act; renewing `stalenessOkUntil` is this repo's grant, and it must say why in the commit |
| `snapshot-keys`, `sourced-rows` | the file carries a key this repo's build does not know — the two whitelists have drifted apart | the differential fixture test says which side moved; a new field is a change to both repositories, agreed, never one side alone |
| `superseded-log` | the file's record of dropped rows disagrees with what the renderer is dropping right now | this repo's grouping decision is the one that changed, or the log was hand-edited; open both and read them |
| `dtstamp` | rows disagree about when they were harvested | a publisher defect (`MH-FR-023`); do not hand-edit a stamp to silence a gate |
| a date a visitor would call wrong | the file is a snapshot of someone else's read, at a branch, at a commit | find the handoff commit (`git log -- data/events.json`) before touching a page |

What none of these mean, any more: "run the harvester". There is no harvester in this repository, and a finding
text that says otherwise is a bug in the finding text.
