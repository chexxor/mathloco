# Prompt to the research agent — 2026-11-15

Send this file to the research agent as-is. It is the round-4 design brief's **ungroundable half**: the items
the brief asserts that this tree contradicts, or that this tree cannot be made to satisfy. Every one of them is
written as an ask, not as a fix — where a fix was possible it was made on `design-critique-round-4` and is not
in this file. Nothing below substitutes a change for the question.

## Environment the reply must answer against

Answer for **this rig and these pinned versions**; a reply measured on a different one is not comparable
(D131: native host only — never `wsl`, `docker`, or `docker-compose`, and the OS has to be named in every
number you report).

- Host: **Linux native** — `uname -srm` → `Linux 7.2.15-300.fc45.x86_64 x86_64`; Node `v24.22.1`; npm `11.19.1`; 16 CPU.
- Pinned dependencies (`package.json`, read 2026-11-15): **Astro `^7.4.12`**, **`@astrojs/cloudflare` `^14.4.3`**,
  **`svelte` `^5.57.3`** (line 187), **`wrangler` `^4.155.0`**, `@astrojs/svelte ^9.1.2`, `svelte-check ^4.7.8`.
- Branch under review: `design-critique-round-4` off `staging`, three commits — `fix(naming)` (`a222281`),
  `fix(rows)` (`5cd128f`), then the `content` commit that this file ships in. Nothing is pushed; `main` and
  `staging` are the operator's to merge.
- Sets, as measured today: **`npm run verify` = 71 steps**, **`npm run verify:browser` = 9 steps**, **`verify:rig` = 3 steps**.
- Every figure below was read off `dist/client` produced on **this branch** by `npm run build` on 2026-11-15 or
  2026-11-16 (the round-4 work ran over two days), or from the commit `5cd128f` where the claim is about the tree
  *before* the change. The two tracked instruments that reproduce a claim rather than print it are `node
  design/naming-reproduction.mjs` (item 7's build failure: it plants an unmappable `series` in `data/events.json`,
  runs the build, prints its exit code and the offending string, restores the file by sha, and rebuilds) and `node
  design/fold-answers.mjs` (item 9's fold: it asks the built home page where each of the five answers sits at a
  phone viewport). Both are probes, not gates: neither is in `scripts/gate-run.mjs` or in `package.json`.

## What a reply must contain

Per item: the decision in one line, the measurement that produced it (command, date, OS), and — if the answer
changes a rule — **which existing gate moves and in which commit**, because §1 of the brief forbids a new gate
and the plan forbids a milestone opened for one.

---

## 1. §6 / §10: "no more than six outbound links outside the footer" — shipped at 6, and one reading still measures 7

**The brief's claim**, verbatim (§6 acceptance): *"at 390px, five rows and no more than six outbound links
between them (five primaries plus the calendar). Today the count is fifteen"* — and §10 repeats it as
*"no page contains more than six outbound links outside the footer"*.

**What the artifact says now.** @measured 2026-11-16 off `dist/client/schedule/index.html` — a 33,954-byte page
whose single `<footer>` element runs 28190..33931 — with a byte census that places every `<a>` by position rather
than matching URLs:

| where | outbound | what they are |
| --- | --- | --- |
| the five rows | **5** | one primary per row, labelled "Sign up on Meetup, opens in a new tab", 5 distinct event URLs |
| the standing row | **1** | "Join the Facebook group" → `facebook.com/groups/matheapolis` |
| the exit line, above `<footer>` | 0 absolute | "Add to a calendar" → `/events.ics`, **same-origin** (`href` starts `/`) |
| inside `<footer>` (excluded) | **2** | "Join on Meetup" (the group root), "Discord" (the invite) |

**18 anchors: 8 absolute, 10 same-origin. 6 absolute outside the `<footer>` element, 2 inside it.** The repo's own
instrument prints the same six in its own words — `check:rsvp-page` on `/schedule`: "5 printed date(s), 1 standing
cluster(s), **6** sign-up link(s) [Facebook, Meetup ×5], states meetup; **6 outbound link(s) outside the exit band
(limit 6)**" — and every other page is under the same ceiling: `/` 2, `/chat` 2, `/join` 3, `/404` 1 outside their
own footer element. The fifteen the brief saw was real and is gone twice over: `signUpPaths()` used to put all three
declared platforms in every row (5 × 3 = 15 at `a222281`), and the standing cluster then repeated two URLs the footer
already painted.

**What changed since the round-3 read, and why it is the ceiling's shape.** `splitPaths()` in `src/lib/rsvp.mjs`
now sends `ROW_PRIMARY_PLATFORM` to each row and renders, once per page, only the declared platforms **whose URL the
exit band does not already paint** — `EXIT_BAND_PLATFORMS` = Meetup, Discord, painted by `Footer.astro` on every page.
Dedup is by URL, not by painted name: indexing `LINK_KEYS` by a painted name returns `undefined` and silently
disables the dedup, so the rule is stated in the module that owns the platform list (D272's "one place the list
lives"). Facebook is therefore the only standing platform `/schedule` adds, because it is the only room the band does
not already hand out.

**The three readings and their numbers.** The brief's two halves still do not name the same region, and the
difference is now the **calendar line**, not the standing pair:

- (a) §10's literal reading — absolute (`http(s)://`) anchors outside the `<footer>` element: **6, MET as shipped**.
- (b) §6's own enumeration — "five primaries plus the calendar": 5 row primaries + the same-origin `/events.ics`
  line = **6, MET as shipped**.
- (c) both at once — the five row primaries, the Facebook group **and** the calendar line: **7**, one over.

Reading (c) fails on one vocabulary question, and that question is the whole of what is left: **is a same-origin
route an outbound link?** The repo says no — `check:ext-links` counts "http(s):// hosts that are not the site's own"
and prints 25 outbound anchors across the 5 built pages with `/events.ics` among the same-origin ones. The brief's own
parenthetical counts it. Both cannot be the vocabulary, and the artifact satisfies (a) and (b) and misses (c) at the
same time, so this is a ruling and not a patch. Nothing was deleted to reach 6: the count fell because two of the
page's anchors duplicate the band's, and deleting the Facebook group would be a different, costlier change — it
closes a `src/config.json` `URLs.*` key and takes an affordance off the page (D269's rule: a closed door is not an
unprobed door).

**The ask — one ruling, and it decides whether this row closes or re-opens.**

- (a) **same-origin is not an exit** (what shipped): `/schedule` is at 6 under (a) and under (b); the brief's sentence
  survives verbatim on (a) and on (b). pros: no artifact change, `check:rsvp-page`'s ceiling reads the exit band and
  stays in the run it already had; cons: §10's "outside the footer" and §6's "plus the calendar" still describe two
  different regions in one document.
- (c) **same-origin counts as an exit**: then the standing row must also drop the calendar line for the page to reach
  6, and the answer has to say which of the two the page stops offering — the `.ics` route is the site's own dated
  affordance, and `check:dated-surfaces` asserts it exists. pros: one sentence, one vocabulary, one number; cons:
  an affordance the gates protect goes away, and a brief that names "the calendar" as one of the six then contradicts
  itself.
- (d) **keep the standing pair and accept 7**: refuses the URL dedup, i.e. refuses D342's shape as shipped. pros:
  the page says the club's three rooms out loud; cons: the same URL twice on one page is what a screen reader reads
  as two invitations to the same room.

**Recommendation: (a)** — the shipped shape, because it is the only one under which both of the brief's own numbers
(6, and "five primaries plus the calendar") are true of the page at once. Access: none for (a); (c) needs a ruling on
D342 and names which affordance closes. **The one measurement that would change the ranking**: whether a returning
visitor on `/schedule` uses the `.ics` line — `check:dated-surfaces` proves the affordance exists on every page,
it cannot prove anyone wants it, and the only honest proxy is the brief itself, which counts it as one of the six.

**The second consequence of this row, and it is a gate's, not the page's.** With the dedup, a one-platform standing
row cannot show two of the preference rules the brief cares about: `check:rsvp-preference` still asserts the island
*adopts* the remembered platform (that is what makes "the cross-row event name is broken" catchable on a one-link row)
and still asserts a visitor's stored preference survives the load, but "never reorders" and "drops one" are
unobservable while the standing row offers exactly one platform. The gate's header names that narrowing and its
selftest passes 7 cases / 0 wrong. **Ask the reply**: whether the site should print the band's platforms in the
standing row as well as the footer's — which would make the standing row two platforms, un-park those two assertions,
and move the ceiling's number again — or leave them degenerate until a page ships a standing row of two.

---

## 2. §7.2: "the horizon band paints 715px of page at 390 (15% of the document)" — and the plate the brief asked for is shipped, with a consequence the brief did not price

**The brief's claim**, verbatim: *"The horizon band paints 715px of page at 390 (15% of the document) for three
engravings from 1903/1910/1922…"*, and its acceptance line asks that the band hold **one** plate as a **full-bleed
captioned break**.

**The 715 is a delta against a page with no band, and it names a build that no longer exists.** @measured 2026-11-15
against the three-plate tree (D329's rungs, the artifact `5cd128f` rebuilt in a scratch `git worktree`): three plates
stacked at 390 **added +715px of page** and took the page from 4045px to 4760px — 715 / 4760 is the brief's "15%".
Against any current build the number is not the band's height and must not be quoted as one. There is a second near-715
in this round and it is a coincidence, not a second measurement: the shipped band's height at 1240 is **721.2px**.
Quote one figure, name its build and its width.

**What ships now, and what it costs.** D347 (one plate, capped at its own scan width) is superseded the same day by
**D351**, which deleted the cap: the plate is `width: 100%` of a shelf declared `width: 100%`, so the leaf runs to the
text column's edge at every width this site is probed at, and the probe that priced the alternative now prints it as
**the same page as its shipped row** (`node design/plates-price.mjs --no-build` prints "shipped (one plate, no cap,
full-bleed)" and "plate full-bleed on the column" at identical figures — a differing pair would mean a cap is still
binding somewhere). @measured 2026-11-16 by that probe (Linux native, Node 24.22.1):

| width | band | plate | page | what the plate costs the page |
| --- | --- | --- | --- | --- |
| 1240 | 721.2px | **1192 x 599.4** | 3153px | **+721px** (the probe's "band hidden" row) |
| 640 | 419.5px | 592 x 297.7 | 3932px | +419px |
| 390 | 319.6px | 358 x 180 | 4152px | +320px (224px above the 96px of air an empty band still pays) |
| 320 | 284.4px | 288 x 144.8 | 4600px | +284px |

**The consequence the brief did not price, and it is the half that is still ungroundable.** The archive's widest rung
is `/img/1024/`, and that rung returns each leaf's **own** scan — 698x351 for the 1910 Euler leaf, with `/img/1600/`,
`/img/2048/` and `/img/full/` all answering 404 (probed 2026-11-03). Full-bleed at 1240 therefore paints the leaf at
**1.71x that scan**: the hairlines stop being one-to-one with the drawing, and record 0023 — the round-12 art round,
which is what licensed these plates — answered that in advance: *"if a strip is ever wanted from the archive, compose
it from several plates rather than upscale one."* The brief's acceptance line and record 0023 cannot both hold at
1240. The delegate shipped the brief's line (D351) and reported the cost, because the criterion is observable and the
caution is not. What is measurable about the upscale is this: `check:ground` measures every painted hairline **off the
bytes a browser paints** and is green on this build, and `check:render`'s band and contrast cells are green in the
browser set — so the line art still clears the repo's own legibility bars at 1240 through interpolated pixels. What is
**not** measurable here is whether a human eye prefers it; that is the operator's, and it is why this item is in the
prompt.

**The ask — which of these the operator wants, priced as it must be.**

- (a) **full-bleed, upscaled, as shipped**: the brief's acceptance line is literally true, the plate costs 721px of
  page at 1240 and the drawing is interpolated above 698px. pros: one plate, one caption, one break; cons: record
  0023's caution is what the upscale breaks, and the page pays 721px at the desktop width it is read at most.
- (b) **full-bleed composed from several plates** (record 0023's own answer): honest pixels at every width. Cons
  that must be answered before it can be proposed: the band becomes an exhibition again — the brief's own words call
  three plates in a row "an exhibition, and an exhibition is not a club" — so a composed strip has to say how many
  plates, and each additional plate needs its own alt text quoted from the source's picture page (D170: alt is
  quoted, never invented), its own provenance in the caption, and its own asset build through
  `scripts/plate-asset.mjs`. pros: no interpolation; cons: two of the brief's lines then fight each other.
- (c) **no plate**: the probe prints it as **−721px at 1240 / −320 at 390** with the band's 96px of air still there,
  and the band's identity with it. pros: cheapest page; cons: the site loses the one public-domain artefact that
  carries its identity, which the brief's own §7.2 was asking to keep.
- (d) **a larger scan of the same leaf**: not available from this archive (rung measured 2026-11-03); it would need a
  different public-domain source, which re-opens the licensing record in record 0023 and the alt/provenance rules.

**Recommendation: (a) as shipped**, and say so plainly — the brief's acceptance line is the observable, and the
interpolation is its cost, not an accident the delegate could avoid with the archive it has. **The one measurement
that would change the ranking**: whether the archive serves a wider rung to a different path than the four already
probed (a 1400px+ scan would make full-bleed honest and move (d) above (a)). Reply rule: the chosen option carries
its cost as `@measured <date> by node design/plates-price.mjs` at 390 **and** 1240 with the OS named, and if it is
(b) it names how many plates and where their alt text comes from.


---

## 3. §9a: the exit the brief offers first is not available without moving a heading

**The brief's claim**, verbatim: *"Either render the threads and the "chat itself" sections above the summary,
or ship a static fallback sentence instead of the error string."*

**What the artifact says.** @measured 2026-11-15: `/chat`'s above-the-fold in the built bytes opens
`Summaries from the chat` (h1) → `Written by our bot, after the noise settles.` → the pending block. The page's
**name is the summaries**; moving the thread list above the summary leaves a heading naming a section that no
longer sits under it, which is the same defect class the delegate deleted above another page's first heading
(D309, `DESIGN.md` "Nothing sits above a page's first heading"). So option (a) is not a markup reorder — it is
a heading rewrite, a page rename, and `check:threads`'s "the rest of the list" rule (D320) moving in the same
commit. Option (b) shipped: the pending block now opens `The bot's reading of the channels` (the section's own
name), keeps the protected line verbatim, and hands the path out as the inline Discord link; @measured 2026-11-15
the string `have not loaded` appears **0 times** in every built page, `after the noise settles` still 1.

**The ask.** If the operator still wants option (a), the reply has to name the heading that will sit over the
thread list, and say what happens to `/chat`'s h1, its `og:title`, and its entry in the footer's map (D335 kept
the band's `aria-label` for the same reason). If the reply accepts the shipped fallback, it should say whether
the pending state is allowed to claim anything about whether the summaries loaded — a server-rendered
`prerender = true` page cannot know, and that is why the shipped state claims nothing.

## 4. §9b: "make the other a redirect" is not something this site can build

**The brief's claim**, verbatim: *"One Meetup URL. Home uses the group root, the /chat footer uses `/join`.
Pick one and make the other a redirect or a deletion."*

**What the repo says.** The redirect half is unreachable in every mechanism available here: the two URLs are
**Meetup's** paths, not the site's, and a Workers trigger redirects hosts this Worker is attached to, not
third-party ones. What a redirect *would* require is named, so the reply does not have to guess: the apex's
triggers are declared in `wrangler.toml` and `npm run check:deploy` asserts the **exact** trigger count
("anything added by hand in the dashboard is silently detached"), so a new trigger is a gate change and a
plan ruling, and a Cloudflare zone rule is invisible to every gate in this repo. Deletion is the reachable
half, and it is what shipped: @measured 2026-11-15 the `/join` form paints **0 times on all five built pages**
and the config-declared root paints 2 on `/`, 1 on `/chat`, 2 on `/join`, 1 on `/schedule` and 2 on `/404`.
The survivor is the root because it is the string `URLs.meetupGroup` holds, the shape
`MEETUP_GROUP_URL_SHAPE` (`src/lib/rsvp.mjs:76`) requires, and the only Meetup group URL with a dated
`_verified` stamp (`status: 200`, `verifiedAt: 2026-11-10`). The `/join` form survives inside `joinUrl()`
(`src/lib/rsvp.mjs:127`, called at :416) as the resolver's per-date "no page yet for this date" state.

**The ask.** Confirm the root as the band's survivor — or name the evidence that would make the `/join` form
survive instead, which is a `check:rsvp:links` stamp answering 200 for it inside the 60-day window **and** a
`LINK_SHAPES` entry that can assert the group-join shape. A reply that proposes a redirect must name which of
the two mechanisms above it is, and which gate moves with it.

## 5. §7.1 / §11: "Open an issue and stop" — this repo has no issue tracker

**The brief's claim**, verbatim (§7.1): *"Do not substitute a stock photo. If no photograph exists, ship
nothing and leave this item open"*, and §11: *"The photograph is not a commit; it is an operator errand.
Open an issue and stop."*

**What the repo says.** There is no issue tracker to open one in: the `issue_work` registry is absent/unreadable
in this session's tool set, and the repo's durable homes are `PLAN.md` (a parked row, which `check:plan` fails
when it has no resume trigger — D148's rule, enforced since S015) and `.notes/DECISIONS.md` for the *why*. The
errand is parked as a `PLAN.md` row with its trigger — **the operator supplies a real meeting photograph**
(3:2, natural light, no filter, `--ink-muted` caption per the brief) — and nothing ships for it: @measured
2026-11-15 `dist/client` paints exactly two images on the whole site, `hero…webp` and
`horizon-euler1910…webp`, neither of them a room. A stock substitute stays forbidden (D86/D94 already rule a
stock crowd out, and the brief repeats it in its own words: "a stock room is worse than no room").

**The ask.** Which home the operator wants the errand to live in, and where the photograph is supplied: a row in
`PLAN.md` §Milestones (visible to `check:plan` and to a fresh clone's projection), a line in `roadmap-brand.md`
beside the surfaces it would re-measure, or neither, with the errand handed over by letter. The reply must state
the un-park trigger either way, because a deferral without one is a lost item (D148).

## 6. §0, correction one: round 3's "nav and footer absent on all four pages" was an extraction artifact — keep it closed

**The brief's claim**, verbatim: *"Round 3's 'P0: nav and footer are absent on all four pages' was WRONG. It was
an artifact of the reviewer's text extraction, not the artifact. `Navigation.astro` emits the row and Layout wraps
every page. Do not re-fix this."*

**What the artifact says, so the reply can cite it rather than repeat the claim.** @measured 2026-11-15 on
`dist/client` from this branch: every built page — `index.html`, `chat/index.html`, `join/index.html`,
`schedule/index.html`, `404.html` — carries **2 `<nav` elements and 1 `<footer`**. The finding is closed, the
site is not missing its map, and it must not be re-opened by a reader of the built bytes.

**The ask.** Record in the reply, in one line, that the reviewer's extraction step (whatever strips
`position: fixed` content — the nav row is fixed — or reads only the first block of a page) is the defect, and
name the instrument that measures the nav honestly instead: `npm run check:render:dist` (the nav-fit and mark
cells) and `node design/nav-fit.mjs`, which types candidate labels into the shipped row and prints needed-versus-offered
per width. This is what stops the class coming back a fifth time.

## 7. §0, correction two: the date-stamped-image finding is live, and its class is wider than one rename

**The brief's claim**, verbatim: *"Round 3's retraction of the 'date-stamped image' finding was ALSO wrong.
The assets are `event-2026-11-07-club-social.webp` and `event-2026-11-11-parallel-learning.webp` and they are
painted on rows dated Nov 21, Dec 5 and Dec 19. Finding P1-4 is live."*

**What the artifact says.** Both halves were re-proved this round. The rows: rebuilding `a222281` in a scratch
`git worktree` @measured 2026-11-15 and reading each row's `src` back gives Nov 21 / Dec 5 / Dec 19 all painting
`event-2026-11-07-club-social…webp` and Nov 25 / Dec 9 painting `event-2026-11-11-parallel-learning…webp`. The
cause: `data/events.json` re-issues the same media UID across dates (D338's story), so the harvest mirrors the
image **under the oldest slug's filename** — one asset stands for five dates, and the asset's *name* asserts a
date the row contradicts. D-D therefore removed the painting (D343) rather than renaming the file: @measured
2026-11-15, `/schedule` paints **0 images** and no row carries art.

**The ask.** Two things the reply must contain, and neither is a patch:

- the **naming rule** for the harvester — what the mirror's filename should assert so it can never contradict
  a row (the brief's own framing: "one asset rename away from being a visible one"); and
- the **sweep decision** for the seven `src/assets/photos/event-*.png` that nothing paints any more, kept
  deliberately in the tree under D343's rule (deleting a source because no surface paints it is a different
  change, with its own references to update: the harvest step, `EventArt.astro`, `src/lib/event-art.ts`).
  Which half owns that deletion, and what gate would go red if the deletion landed without it.

## 8. §10: "no image is painted on a date its filename contradicts" is vacuous as this site now ships

**The brief's claim**, verbatim: *"Plus: no image is painted on a date its filename contradicts."*

**What the artifact says.** @measured 2026-11-15: the built pages carry exactly two `<img>` sources across the
whole site — `/_astro/hero…webp` (the engraving in the hero) and `/_astro/horizon-euler1910…webp` (the plate
this commit put on the shelf) — neither filename carries a date, and `/schedule`, the page that used to carry
the contradiction, paints none. The criterion is satisfied by having nothing left to satisfy.

**The ask.** Say what the criterion is **meant to decide**, since as written it decides nothing: does it mean
the *unpainted* sources in `src/assets/photos/` should be retired (item 7 above), or does it mean a future
photograph — the errand in item 5 — must be named so its filename asserts nothing about a date? The reply
should pick one sentence for the acceptance block, not re-state the one that is vacuous.

---

## 9. §5: the fold criterion is met as shipped, and the order that met it is the part the brief never priced

**The brief's claim**, verbatim (§5 acceptance): *"home answers when / where / how do I sign up / what is this club
called above the fold [at 390px]"* — and its §5 sketch puts the meeting block and the controls at the **top** of the
hero, above the two lede paragraphs.

**What the artifact says, before and after.** Before this session's promotion, @measured 2026-11-15 by the fold probe
in `.design/tmp-fold390.js` at a 390x844 window: the when-line at **y=822**, the venue line at **y=874**, the page's
two controls past the fold — present, but not on the first screen. After it, @measured 2026-11-16 by `node
design/fold-answers.mjs --no-build` (the tracked version of that probe, Linux native, Node 24.22.1): at 390x844,
what 136–176, when 224–272, where 276–332, the primary control 356–404, the secondary 416–464, and the probe prints
**0 of 5 answers past the fold** on a 4253px page. The criterion is met, and the instrument that will meet it again
is now tracked rather than scratch.

**What that promotion did to reading order, which is the part still ungroundable.** The two lede paragraphs — the one
that explains what the club does, and the one that names the former club — now sit **below** the answer and the two
controls. No class in the moved blocks changed (order, not type, spacing or colour), and the lede stays the first
prose on the page, but a first-time visitor now meets "Next meeting: Saturday, Nov 21 · 12:00 pm – 1:00 pm Central /
Angel Food Bakery, 8100 Minnetonka Boulevard / Join Our Group / See the dates" **before** anything tells them what
this club is or what happens at a meeting. That is the trade the brief's own sketch implies and never states: the
answers move up, the explanation moves down.

**The ask.** Does the operator want the answers-first hero as shipped, or an order that answers above the fold **and**
explains first? If the second, name which of these the reply proposes, because only the third is reachable inside the
fence this task was given (no palette, token or spacing work, no new routes):

- (a) **shipped (answers first)**: pros — a returning member lands on the date and the door in one screen, and the
  fold criterion is met; cons — a first-time visitor is asked to act before the page says what acting means, and
  the sentence naming the former club, which is what an old link lands on this page to learn, is now below the fold.
- (b) **shrink the hero so the current order fits above the fold**: the venue line needed 130px more room before the
  promotion; that room only exists if type, spacing or the copy itself moves, which this task's fence forbids and
  `DESIGN.md`'s ramp and `check:space` would re-measure. pros: order unchanged; cons: it is a design round, not this
  commit.
- (c) **a shorter answer above the fold and the full answer below**: the chip already answers "when" at y=20 with the
  date; what would have to be added is a one-line where above the lede and the controls after it. pros: explains
  before it asks; cons: it duplicates the date the chip paints, and D303's rule is that the hero does not grow a
  second way in.

**Recommendation: (a) as shipped**, and the reply should say so — the brief's acceptance line is an observable, the
artifact meets it, and what remains is a preference about how a first visit reads, which the brief asserted nothing
about. **The one measurement that would change the ranking**: `node design/fold-answers.mjs` at a **320x844** window.
At 320 the page is 4600px and the answers wrap to more lines, so if any answer drops past 844 there the shipped order
is not the one that meets the criterion at the width DESIGN.md calls the floor (D114), and the ranking moves to (c).
That probe has been run at 390 and has **not** been run at 320 — the reply should run it and report the number rather
than assume it.


---

## What was not checked

Nothing here was checked against a live production deploy: `probe:live` was not run, `check:discord` and
`check:ai` were not run (they spend real credentials and one model call), and every count above is read off
`dist/client` built on this branch, so a green gate set says nothing about what is deployed (D245).
