# Ask: the first handoff commit, and the cadence behind it

> **status: `unsent` — sending this letter is the operator's act, not the delegate's.**
> It is drafted by a seat in this repository on 2026-11-23 at `7e3848b` (branch `staging`). This
> repository holds no credential on `social-event-publisher` and asks for none, and it will never edit a
> file in that repository: a gap between the two becomes a letter like this one, or a change request in
> `docs/spec/event-data-handoff.md`, and your ruling on it stays yours (**D42**, **D124**, **D236**).

| | |
|---|---|
| **To** | the author of `chexxor/social-event-publisher` |
| **From** | a delegate seat in `mathloco`, branch `staging` at `7e3848b`, dated 2026-11-23 |
| **Contract this repo reads** | `mathloco-sink.md` **v1.6 (2026-11-18)** with **ADR-0017**, cited (never restated) in `docs/spec/event-data-handoff.md` |
| **Asks** | **two**: §1 a first commit, §2 the run cadence behind it. Neither asks for a code change |
| **Deadline that is real** | **2026-12-05** — why it is that date, and what happens instead if it passes, is §3 and §5 |

---

## 1. Ask one: run it once, and let the commit land on `staging`

Run the publisher against the club's calendar and let it write `data/events.json` into **this** repository
as one commit on **`staging`**, **before 2026-12-05**.

That is the whole ask. Nothing about your implementation is under discussion.

Two things about landing it here, so it is not a surprise:

- **A push here buys a gate run, not a deploy.** CI runs `npm run verify` on a push to `main` or `staging`
  and holds no Cloudflare credentials (`.github/workflows/ci.yml`), so your commit is checked against this
  repo's calendar rules and nothing a visitor sees changes until the operator builds and deploys
  (`docs/spec/event-data-handoff.md` §"The path, the branch, and who deploys").
- **Your own two fixtures already run here as a differential test.** `data/fixtures/mathloco-snapshot.json`
  must pass and `mathloco-snapshot-misshapen.json` must fail by name, both blob-pinned, in the
  `check:handoff` step of that same set. It has already caught one defect in *our* rule (our `uid-shape`
  read your zero-padded UUIDs as time-derived), which is the argument for running your shape through our
  rules rather than comparing documents.

The operator's ruling that set the branch, in their words (2026-11-23): *"It will arrive only on `main`
once all is working as expected. It will arrive on `staging` during the testing period."* So `staging` is
the branch to aim at, and a commit there is a test, not a publication.

## 2. Ask two: how often do you run, and does a run that finds nothing still commit?

This one is a question, not a request, and it is the more valuable of the two.

Our gate holds one number: the file's single `source.fetchedAt` may be at most **21 days** old
(`RUNWAY_DAYS` at `scripts/check-ics.mjs:93`, the `stale-snapshot` rule at `:499`). Your contract says the
file carries **one** harvest instant and every row names that same instant (**MH-FR-023**), and that a
fraction is cut rather than carried (**MH-FR-022**). So the age of that one stamp is the only freshness
signal this repository has left — we deleted our own fetchers on 2026-11-23 (**MS42**, **ADR-0010**), so
there is nothing here that can ask "is that row still true" except a clock on the stamp.

What we do not know is which of these your pipeline actually does, and the two have opposite consequences:

| If your run… | then here… |
|---|---|
| refreshes `source.fetchedAt` on **every** run, changed rows or not | the 21-day window is never reached, and our gate stays quiet — but every row's `DTSTAMP` moves on every run, which re-notifies every subscriber that already holds the feed. That is the harm **D72**/**D225** exist to prevent, arriving from your side rather than ours |
| commits **only** when a row changed | a perfectly healthy pipeline goes quiet over a month with no new dates, the stamp ages past 21 days, and our gate fails a file that is **correct** — the exact class of false alarm **D471** just retired one rule for |
| runs on demand, when a human asks it to | then the window is a deadline on a human, and we should say so in our own docs rather than pretend it is a machine's job |

**So the question is: what is your intended run cadence, and does a run with no change still write a
commit and a new stamp?** A sentence in your own contract is the answer we want — we will cite it by
version rather than copy it, because a rule written twice is a rule that drifts.

Why we cannot just pick a reading: this repository's own record says a moving stamp is a defect
(`data/events.json`'s `source._fetchedAt`: *"Deliberately a committed value, not `new Date()`: a build-time
DTSTAMP would make every deploy a change to every subscriber's calendar"*), and its own gate says a stamp
that never moves is a stale copy. Both sentences are ours and both are true; which one bites depends
entirely on your cadence. **`MS05`'s resume trigger is written as this exact measurement** — "the first
handoff commit from `chexxor/social-event-publisher` lands and is **measured** … that run answers two
things nobody may assert before it: how old the publisher's stamp actually runs, and whether **D257**'s
Yunohost-package requirement transfers to hosting the *publisher's* fetch or retires with this repo's
runner." Until a commit exists, that row cannot close in either direction, and neither can we re-rule the
21-day window on evidence.

## 3. Why 2026-12-05, stated as a measurement rather than a threat

The date is not a preference and it is not a guess. Today, our gate prints:

```
note  harvest stamp: source.fetchedAt 2026-11-13T17:05:33Z is 10 day(s) old — stale-snapshot fails above 21 days (D471)
```

@measured 2026-11-23 by `node scripts/check-ics.mjs` (Linux native, Node 24.22.1). The rule is
`age <= RUNWAY_DAYS` (`scripts/check-ics.mjs:499`), so age **21** on **2026-12-04** still passes and age
**22** on **2026-12-05** fails. That edge is not read off the source either — it is pinned from both sides
by two plantings in the gate's own selftest, `a-stamp-at-exactly-the-window` (silence at exactly 21 days)
and `a-stamp-one-day-past-the-window` (the rule fires at 22), and the pair was proved by mutation rather
than by reading: patching the comparison to `age < RUNWAY_DAYS` prints `FAIL a-stamp-at-exactly-the-window`
and exits 1, where before the pair existed that same patch left every planting green @measured 2026-11-23
by `node scripts/check-ics.mjs --selftest` (**52 plantings, 0 undetected** at the tip today).

So: one commit before 2026-12-05 resets the clock and this whole question disappears for another three
weeks. We are not asking you to hit a moving target — the target is one date, and it is our gate's date,
not the club's.

## 4. What we will not do about that date

Stated so nothing here surprises you later, and so you can tell us if any of it is wrong:

- **We will not hand-edit `source.fetchedAt`.** It is the value every subscriber's client diffs (**D225**),
  and editing it would publish a read that never happened.
- **We will not delete a row to shorten a window** (**D72**, **D238**) — deleting a row un-announces a date
  to every calendar that already holds it, which is the same reason you carry finished rows (**MH-FR-012**).
- **We will not invent a field, or smuggle one in as a `_`-prefixed key.** Your contract carries `_`-keys
  byte-for-byte (**MH-FR-006**), which would turn our prose into an input to a rendering rule — the
  inversion **D236** and **D319** refuse.
- **We will not touch your repository.** A field outside the sixteen is refused by our `sourced-rows` rule
  and by your **MH-FR-005**, so a new field is a change to both repositories, agreed, never one side alone.

## 5. The fallback we have already staged here (so the date is honest, not a squeeze)

If no commit lands, this repository will set its own one-line escape hatch in `data/events.json`:

```json
"stalenessOkUntil": "2026-12-26"
```

That key is **ours, not yours** — your contract refuses to invent a hatch (**MH-FR-011**), and the field is
in this repo's accepted top-level key list (`docs/spec/event-data-handoff.md`). It is dated, it expires on
its own date, a misspelled name fails `snapshot-keys` rather than buying a free silence, and it buys
exactly one further 21-day window past the red day (2026-12-05 + 21 = 2026-12-26), so it cannot become a
permanent quiet. The trigger and who sets it are written in **D475** and in this repo's session entry
point: the delegate sets it **no later than 2026-12-04**, the last green day, with the reason in the commit
message, and the operator is told.

**And the hatch moots itself the moment you commit.** Any handoff commit replaces the file and therefore
refreshes `source.fetchedAt`, which makes the age rule pass on its own — and since you do not carry a key
you refuse to invent, the hatch disappears with the file it was covering. That is by design: the fallback
is a bridge over a gap in the schedule, not a substitute for the run.

## 6. What this letter does *not* ask

- **Not the per-platform link set.** That request is already written, in full, with its shape and its rules:
  `docs/spec/event-data-handoff.md` §"The change request: a per-platform link set". It is the one fact the
  standard does not carry, and it is the reason the site's per-date platform links went **4 → 0** when our
  scrapers went @measured 2026-11-23 by `node design/event-field-parity.mjs` on both trees. The operator's
  words when that item was ruled: *"cooperate with the schema and fields in the file format to ensure we
  don't lose data that we currently expose on the site. For example, in the ideal state, we have a link to
  the event for each platform that the event is published on."* It stays open, and it is not urgent in the
  way §1 is.
- **Not a Mobilizon writer.** This repository's own cadence integration (an n8n workflow that wrote dates
  *into* Mobilizon) is being retired on the operator's ruling, with an ADR naming what is lost written
  before any deletion (**MS43**, **D474**). One calendar should have one writer, and after **MS42** that
  writer is you. One consequence is still unruled on our side and is therefore **not** an ask here: the
  retired subsystem used to emit a weekly proof-of-life and a per-series runway note, and after it goes
  there is no owner of "is the schedule alive, and how many days until the next date". If you already have
  a scheduler heartbeat, that is the natural home for it — but whether that note is filled here, by you, or
  not at all is the operator's call, so we are not asking you for it in this letter.

## 7. How to answer, and what happens on our side when you do

Any of these is an answer; the first is the one that closes the deadline.

| Answer | What it looks like | What it settles here |
|---|---|---|
| **to §1** | one commit from the publisher touching `data/events.json` on **`staging`** in this repository | resets the stamp age; **`MS05`**'s resume trigger fires; the 21-day window gets re-measured instead of assumed; the hatch in §5 is never set |
| **to §2** | a sentence in your own `mathloco-sink.md` naming the cadence and whether a no-change run commits | lets this repo re-rule `RUNWAY_DAYS` on evidence rather than on a guess, and tells us whether subscriber re-notification is a real risk |
| **to §1, declined** | a word back, with the date you expect to run | we set the dated hatch, tell the operator, and the window stays as it is — a smaller site, not a broken one |

When a commit lands, this repository does three things in the same commit: re-runs
`node design/event-field-parity.mjs --no-build` and updates the parity table with its new numbers, checks
the differential fixtures (`check:handoff`) still pass against the real file, and re-reads the stamp's age
from `node scripts/check-ics.mjs`. If your file carries a per-platform link set, ask one of §6 resolves
itself — that ask resolves itself, and the site's outbound links move back up on their own.
