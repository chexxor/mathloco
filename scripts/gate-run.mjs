#!/usr/bin/env node
// gate-run.mjs — the gate set, in dependency order, with the independent steps run side by side.
//
//   npm run verify                 # the deploy gate set (browser-free) — this script is what runs
//   npm run verify:browser         # the browser ritual over the dist that already exists
//   node scripts/gate-run.mjs --serial        # same gates, one at a time (small machine, flake hunt)
//   node scripts/gate-run.mjs --list          # print the steps and their times from the last plan, exit 0
//   node scripts/gate-run.mjs check:classes check:design   # a named subset (still in dependency order)
//   GATE_JOBS=1 ...                            # same as --serial, for CI YAML that prefers env
//
// Why this exists: the wall clock of the loop decides whether the gates get run. Measured on the dev rig
// (Linux, 16 CPU, node 22.23.4, `npm run <step>` timed one at a time, 2026-11-03):
//
//   check (astro check) 7.21s   build 4.09s   check:cache 0.95s   check:social:selftest 1.78s
//   check:classes 0.42s  check:design 0.15s  check:social 0.41s  db:check 0.39s
//   check:sanitize 0.26s  audit:gate 0.66s   check:deploy 0.36s   -> 16.7s summed
//
// Everything in that list except `check:deploy` reads only `src/` and `design/`, so the chain version of
// `verify` was paying for ten steps that had no ordering between them. `check:deploy` is the only real
// dependency: it opens `dist/server/wrangler.json`, so it waits for `build`. Two stages, then, and the
// parallel version measured 7.6s against 16.7s — the same 21+ checks, not a smaller set.
//
// `astro check` and `astro build` in the same stage was tested rather than assumed, because both touch
// `.astro/`: run concurrently on 2026-11-03 both exited 0 (7.07s wall for the pair) and `check:deploy`
// accepted the artifact. If that ever stops being true on an upgrade, `--serial` is the fallback and this
// file is the place to record the ordering.
//
// The browser set (`verify:browser`) is measured separately and runs only when asked: **85.6s wall for its 7
// steps** on this rig (2026-11-03, jobs=4, wall == work because every step must be ALONE — each runs its own
// Firefox pool, see the note in BROWSER). It was 44.7s before the width sets grew to 1240/640/390/320 (record
// 0022); that is the price of measuring the breakpoints the code actually uses. Its wall clock is one reason it is
// not in `verify`; the other is that the runner needs Firefox, which is an operator call. The log capture below is
// what makes its output survive a green run.
//
// What is deliberately NOT here: `check:discord` (needs a bot token), `check:ai` (needs Groq credentials
// and spends a model call), and the browser gates as a deploy gate (the runner has no Firefox — D123).
// Those exclusions are identical to the ones the old `npm run verify` chain had; only the schedule moved.
//
// Output discipline: each step's stdout/stderr is captured and replayed as a block, so nothing
// interleaves. A step that fails prints its own output under its name; steps that needed it are reported
// SKIPPED rather than run against an artifact that does not exist.
//
// Every step's full output is ALSO written to `.design/tmp-gate-logs/{deploy,browser}/<step>.txt`, pass or fail
// (D144). Why: a green run used to leave the word "ok" and throw the measurement away, and the output is
// where the answer lives whenever a decision has to be taken from a gate — which controls measured what,
// what a probe saw, what the preview will show. It got asked for four times in one session and each time
// the answer cost a re-run of a 50-80s browser step. `.design/tmp-*` is gitignored by an existing rule, so
// this adds no tracked noise, and a run overwrites its own set's directory: the logs are the *last* run.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { loadavg, cpus } from 'node:os';
import { resolve, join } from 'node:path';
import { distState, staleLine } from '../design/dist-fresh.mjs';
// The cost guard lives in its own file so it can have a selftest: as arithmetic inside this scheduler it could
// only be exercised by running the whole 40-step set, which is exactly why it had none (D290).
import { compareCost } from './cost-guard.mjs';

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * A step is one existing `package.json` script (so `npm run <step>` still works standalone and the
 * gate set here cannot drift from the one a human runs by hand) plus its scheduling.
 * `needs` names steps whose failure makes this one meaningless.
 */
const DEPLOY = [
  { name: 'check', desc: 'astro check: types in .astro/.svelte/.ts' },
  // `astro check` cannot type-check a .svelte file at all: @measured 2026-11-12 it reports 217 files, 0 errors
  // on a tree whose DiscordSummary.svelte carries a ts(18047) the LSP and svelte-check both report at that line,
  // and it still reports 0 after a deliberately broken .svelte is copied into src/components (D288). Source-only,
  // so before `build` (D118). Cost @measured 2026-11-12 by this gate: 6.3s gate, 2.2s selftest.
  { name: 'check:svelte', desc: 'svelte-check: every .svelte island plus the TS it reaches - the type surface astro check is blind to' },
  { name: 'check:svelte:selftest', desc: 'the svelte gate can still fail (7 plantings in one fixture run, plus a clean control)' },
  { name: 'check:classes', desc: 'every written class resolves to CSS' },
  // The value behind the class (S042, D321, the second design read §4). DESIGN.md's "Spacing — 4px grid,
  // eight steps" names the ladder and says "never use a step outside that set", and its own Enforcement
  // section admits `check:classes` cannot see it: Tailwind v4's dynamic spacing scale makes `mt-23` (92px)
  // resolve, so "the class generates CSS" is not "the value is on the scale". Source-only, so it can go red
  // before anyone builds (D118). Cost @measured 2026-11-14 by this step: 0.04s gate, 0.03s selftest.
  { name: 'check:scale', desc: 'every margin/padding/gap step written in src/ is one of DESIGN.md\u2019s eight (4 8 12 16 24 32 48 64); no half steps, no bracket px' },
  { name: 'check:scale:selftest', desc: 'the spacing-scale gate can still fail (12 cases: 6 plantings — gap-5, mt-23, py-10, mt-7, gap-3.5, p-[13px], plus a responsive-prefix case — and 6 clean controls, incl. a comment quoting the defect, which must NOT fire, and a sizing utility, which is not a spacing one)' },
  { name: 'check:design', desc: 'every design path a doc or script cites resolves' },
  // The palette round of 2026-11-14 (D316) moved 23 colour tokens in one commit, and nothing between design
  // rounds re-checks the bars DESIGN.md states. `check:classes` proves a class resolves, not that its colour
  // clears anything — the pitfall register's `gap-5` story. Source-only, so before `build` (D118).
  // Cost @measured 2026-11-14 by this step: 0.04s gate, 0.08s selftest.
  { name: 'check:contrast', desc: 'every @theme colour is an oklch triple the palette record solved, every asserted pair clears its bar, reserved hues stay 40 degrees apart, and no paint literal sits outside the token file' },
  { name: 'check:contrast:selftest', desc: 'the contrast gate can still fail (11 plantings: a muted step off the 4.5 bar, a hairline under the 3.0 boundary bar, a tint promoted to a layer, an accent off the band, a hover fill under its own label, two reserved hues 6 degrees apart, an accent that is Target red, a brand collision deeper than the recorded one, an invented token, a hex token, a hex in a style attribute; plus the shipped file as the clean control)' },
  // The roadmap is one file (.notes/PLAN.md, host-local) and MILESTONES.md is its tracked projection. Two
  // files claiming "what is next" drift, and the drift is invisible in a table cell (S015). Reads prose, so
  // it runs before build; the selftest plants each defect class and requires a named failure.
  { name: 'check:plan', desc: 'the plan, its tracked projection and NEXT.md agree; every milestone has an exit gate' },
  { name: 'check:plan:selftest', desc: 'the plan gate can still fail (21 plantings @measured 2026-11-23, 11 of them runnable in a CI clone with no .notes/)' },
  { name: 'check:decisions', desc: 'the tracked decision index matches the log, and no D-id citation dangles' },
  { name: 'check:figures', desc: 'a measured number in DESIGN.md carries a date, and that date is not stale' },
  // Tracked prose is a contract, and a markdown table row with the wrong cell count still renders: the extra or
  // missing cell becomes an unnamed column at the right edge. `MILESTONES.md` carried one such row (A2, three
  // cells under a four-column header) and one in the parked table, both introduced by hand-resolved merges,
  // and both invisible in a diff @measured 2026-11-08.
  { name: 'check:tables', desc: 'every markdown table row in the tracked prose has its header\'s cell count' },
  { name: 'check:tables:selftest', desc: 'the table gate can still fail (3 plantings: an extra cell, a missing cell, a short header; 4 clean forms)' },
  // MS40 (S085, D458): `docs/` grew a router, an ADR set and 17 tracked how-to pages in three days, and nothing
  // asked whether a page that lands is reachable. `check:plan` compares milestone status, `check:decisions`
  // checks ids, and `check:design` resolves path literals - none of them knows that a file with no index row is
  // invisible to the clone it was written for. Reads tracked text only, so before `build` (D118).
  // Cost @measured 2026-11-20 by this step: 0.06s gate, 0.07s selftest (5 plantings).
  { name: 'check:docs-routes', desc: 'every tracked page under docs/ has exactly one row in the index that owns it (router: one row per document; the runbook index: at least one, because one runbook answers several symptoms), and no index row points at a file that is not tracked' },
  { name: 'check:docs-routes:selftest', desc: 'the docs router can still fail (5 plantings: a routed document with no row, a row whose target does not exist, the same document routed twice, a runbook the index stopped routing, and an index whose tables stopped parsing - the silent-pass case)' },
  // MS40 (S086, D459): the runbooks became tracked on 2026-11-20, which put 267,130 b of operating knowledge into
  // git history and in front of the Worker build. The shape scan before the move found 2 assignment-shaped lines
  // and 0 live secrets; this gate is what keeps the next hand-written runbook from re-importing a shell history.
  // The test is the shape, not the word - keyword density in these files is 24-48 mentions, which is prose about
  // tokens. Reads tracked text only, so before `build` (D118). Cost @measured 2026-11-20 by this step: 0.06s gate,
  // 0.07s selftest (3 plantings, 4 clean forms, the tracked corpus as the control).
  { name: 'check:docs-no-secrets', desc: 'no tracked page under docs/ carries an assignment-shaped credential (a name saying key/token/secret, then : or =, then a value) - name the secret and where it lives, never the value' },
  { name: 'check:docs-no-secrets:selftest', desc: 'the no-secrets gate can still fail (3 plantings: an uppercase assignment, a lowercase prose assignment, a value inside a code fence; 4 clean forms that must pass: a bare name, an empty assignment, an angle-bracket placeholder, and a colon naming where a secret lives)' },
  { name: 'check:social', desc: 'the committed share card against its painted report, and that report against the palette this tree declares now' },
  { name: 'check:social:selftest', desc: 'the card checks can still fail (8 plantings: painted amber, a light ground, a run with no ink in its box, two display steps, a path word in the wrong hue, a missing logo shape, a logo stroke under the graphic bar, and a committed card whose palette went stale — the last two added 2026-11-24) @measured 2026-11-24 by `node scripts/check-social-card.mjs --selftest`' },
  // The tab glyph is the other committed image artifact, and until 2026-11-14 it had no gate at all: it
  // shipped Tailwind's default #3b82f6 with a `white` glyph (3.68, under the 4.5 text bar) from the Init
  // commit through the whole design pass, because check:classes scans src/ utility writes, check:design
  // audits design/, and check:render measures pages in a browser that never paints a favicon (D310).
  // Source-only, so it can go red before anyone builds (D118). Cost @measured 2026-11-25 by this step
  // (Linux native, node 24.22.1, `node scripts/gate-run.mjs check:favicon check:favicon:selftest`):
  // 0.16s gate, 0.16s selftest — both moved up from 0.11/0.13 when rule 1 began asking a real renderer.
  { name: 'check:favicon', desc: 'the tab logo is a document a renderer loads, paints only @theme tokens, at most two of them, none a reserved join-path hue, and the pair clears 4.5 (five rules, D485)' },
  { name: 'palette:selftest', desc: 'the one @theme reader resolves every declared token to bytes a painted pixel is compared against, and its round-trip guard catches the unit slip (L is 0..1 here; tripleToBytes wants a percentage) that made all 23 tokens resolve toward #000000 and collapsed paper/ink to a contrast of 1.00 (D485)' },
  { name: 'check:favicon:selftest', desc: 'the favicon gate can still fail (11 cases: 7 plantings — a named colour, a Tailwind hex, a 3.01 pair, three hues, a channel hue, an empty logo, and a comment carrying a token name so a parser refuses the whole document (D485) — plus 3 clean controls and a missing file)'},
  // The tab glyph now has a GENERATOR (`design/logo-tab.mjs`, the one home for the drawing at tab size), and a
  // generator without a detector is a machine that can be wrong silently: D485 is exactly what a hand-assembled
  // tab looked like — four colour rules green on a document a renderer refuses. The ship gate (`tab:verify
  // public/favicon.svg`) cannot join the set yet, because the tab that ships today predates the instrument: the
  // incumbent summand glyph has no provenance line, so demanding regeneration now would red the set for a defect
  // that is not in the shipped bytes. It joins at the operator's framing pick (Operator ToDo 36), which is the
  // moment the artifact becomes a generated one. What the set CAN police today is that the instrument's own
  // verdict can go red — 22 cases, controls clean, plantings named — so the gate that arrives later is already
  // proven to be a detector and not an assertion. Source-only, no build, no browser (D118). Cost @measured
  // 2026-11-25 by `time node design/logo-tab.mjs --selftest` (Linux native, Node 24.22.1): 0.16s wall.
  { name: 'check:tab:selftest', desc: "the tab generator's verdict can still fail (8 controls including the gold rows read from the round record, 6 planted defects — a hand-edited stroke, a lying weight, a stripped provenance, a row id that does not exist, a comment with a double hyphen, a deleted meeting point — 3 legibility refusals (N0 0.18px, T2 1.00px, T4 0.75px at the 16px slot, against D119's 1.5 device px floor), the incumbent glyph's missing provenance, the ship guard refusing public/favicon.svg without a ruling while leaving its bytes untouched, and the row guard refusing an unknown id and the incumbent id by name) @measured 2026-11-25 by `node design/logo-tab.mjs --selftest` (22 cases, 0 wrong)" },
  { name: 'db:check', desc: 'schema and migrations agree, no database opened' },
  { name: 'check:sanitize', desc: 'summary rendering stays text-only' },
  // The descriptor is one phrase in three files (`const locator`, `seo.title`, the page `<Layout title>`), and the
  // tree sat 2-of-3 for a day with every gate green. Reads source, so it runs before `build` (D118's rule).
  { name: 'check:copy', desc: 'the club descriptor: three slots, one phrase, no superseded form, no date' },
  { name: 'check:copy:selftest', desc: 'the copy gate can still fail (10 plantings, each into a fixture copy)' },
  // The harvested topic archive (MS41, S088, D461, D463). Source-only: it reads data/discord-threads.json, not
  // dist/, so it runs in the pre-build wave (D118). It joins the set in the same commit as the file it polices -
  // a gate that exits 1 on a missing artifact must not enter the deploy set before the artifact is scheduled.
  // Cost @measured 2026-11-20 by this step (Linux native, Node 24.22.1): gate 0.05s, selftest 0.05s - no build, no browser.
  { name: 'check:thread-topics', desc: 'the harvested topic archive keeps its contract: every topic that may render has evidence and an operator signature, evidence is a pointer (channelId, channelKind, channelName, date, messageIds) and never prose or an author, no handle / snowflake / link / token shape appears in a printed name or anywhere in the file, no key is unscoped, and the published view leaks nothing private (S088, D461, D463)' },
  { name: 'check:thread-topics:selftest', desc: 'the topic-archive gate can still fail (32 cases: 17 file-side plantings - no evidence, evidence with no message ids, an undated exchange, prose in evidence, an author field, an evidence channel named after a member, an unsigned approval, two entries for one thread, a handle in a printed name, a link in a topic, an unscoped thread key, a snowflake in a topic, a handle anywhere in the file, a token-shaped string, an unscoped source key, a message id in an alias, the wrong contract version - plus 6 built-side plantings: a message id in a data attribute, an evidence date printed beside a topic, an alias printed instead of the signed topic, a member mention in visible text, a signed row dropped from the list, a message id in a built JS chunk - plus the 9 cases that the contract holds: near-duplicates collapse, the merge is idempotent but for harvestedAt, publishedThreads leaks no private field, a missing document is named, a document with no threads array is named, an author comment and a channel name inside its own topic are not leaks, the shipped built shape is clean, and the fixture with its review queue is clean) @measured 2026-11-21 by `node scripts/check-thread-topics.mjs --selftest`' },
  // `check:ics` reads `dist/client/events.ics` (scripts/check-ics.mjs:31-32), so it belongs in the artifact
  // wave. It was scheduled before `build` @measured 2026-11-12: a fresh clone - CI, or anyone's first checkout -
  // has no dist/, and the gate reported "FAIL artifact: ... is missing - build first" while every other step
  // in the wave passed. The selftest plants in-memory clones of the committed `data/events.json`, so it needs
  // nothing. Since MS42 (D471) its rules include the file's one harvest stamp: the runway (D188) and the
  // `stalenessOkUntil` hatch — the reader's half of a freshness rule whose writer half left this repo.
  { name: 'check:ics', desc: 'the published calendar: RFC 5545 traps, UID stability, the built /events.ics bytes, the reach the file states about itself (D371), and the age of its one harvest stamp (D188, D471)', needs: ['build'] },
  { name: 'check:ics:selftest', desc: 'the calendar gate can still fail (52 plantings, each named @measured 2026-11-23 by `node scripts/check-ics.mjs --selftest` — 45 before MS42 retired the live-row rule and replanted the stamp rule four ways, plus the pair that pins the 21-day window at its edge from both sides)' },
  // The two fixtures `social-event-publisher` ships with its own suite are run here through **this** repo's rules
  // (MS42, ADR-0010, docs/spec/event-data-handoff.md §"The two vendor fixtures are a test in this tree, not a
  // sample"). The standard's file must pass, the deliberately broken one must fail with each planted defect named,
  // and both blob ids are pinned, so a fixture edited in this tree stops being the far side's test file. This is
  // the only step that can see the two repositories disagree about the contract: every other gate reads
  // `data/events.json`, which is one side's output. It imports `check-ics.mjs` as a library, so no rule is copied.
  // Source-only, so before `build` (D118). Cost @measured 2026-11-23 by this step (Linux native, Node 24.22.1):
  // gate 0.10s, selftest 0.35s — no build, no browser, no network.
  { name: 'check:handoff', desc: 'the vendored fixtures through this repo\u2019s own calendar rules: the standard\u2019s shape passes, the broken one fails with all 6 planted defects named, and both blob ids still match what was vendored 2026-11-17 (MS42, ADR-0010)' },
  { name: 'check:handoff:selftest', desc: 'the differential can still fail (10 cases: 4 plantings that repair one defect in the broken fixture, 1 that swaps it for a clean file, 1 that breaks the standard\u2019s fixture, 1 that breaks the published file, the blob-pin planting, the skip-list assertion, the clean control @measured 2026-11-23 by `node scripts/check-handoff.mjs --selftest`)' },
  // The sign-up link map: a dated stamp on every URL the config prints, and the shape of each link. The two
  // scraped event snapshots it used to date-check are deleted with their fetchers (MS42, ADR-0010); the one
  // dated calendar file is `data/events.json`, and its age is ruled by `check:ics` above, not twice.
  // Reads committed JSON only, so it runs before `build` (D118). `check:rsvp:links` — the probe that produces
  // the stamps — is NOT here: it reaches the network, the same exclusion class as check:discord and check:ai.
  { name: 'check:rsvp', desc: 'every printed platform URL carries a stamp under 60 days that answered 2xx/3xx (or a named human\u2019s dated confirmation, D280), every link matches its platform\u2019s shape, and every platform the resolver knows is declared (D272, MS42)' },
  { name: 'check:rsvp:selftest', desc: 'the link-map gate can still fail (48 cases: 19 link-map cases — 14 plantings, 5 clean controls — plus 14 resolver match-rule cases, 10 preference-reorder cases and 5 join-channel cases @measured 2026-11-23 by `node scripts/check-rsvp.mjs --selftest`; the snapshot plantings left with the fetchers)' },
  // The page gate's own defect catalog runs on in-memory fixture pages, not on dist/, so it can fire on a
  // branch nobody has built yet (D118). 43 cases = 42 plantings plus one clean control page: missing cluster,
  // wrong date, invented hour, an unsettled hour painted as settled, missing note, a note claiming an absence
  // the resolver disproves, wrong order, dead rel, closed-platform link, a dropped guild event page, a completed
  // guild event painted as a sign-up path, an event page swapped for the bare invite, stale Meetup and Discord
  // stamps, an age painted 3.7 days off a correct stamp, and headcounts painted in text (12 going, the roster
  // tally "280 on the Meetup list", "142 members", "14 RSVPs") and in attributes (D276).
  { name: 'check:rsvp-page:selftest', desc: 'the page gate can still fail (57 plantings each named, plus 4 clean controls that must pass: the resolver-agrees page, a past row on a date the harvest made and that finished, the sourced turnout slot painted in its own words, and a tally that lives only in a shipped comment)' },
  // The platform sprite (S026, D294) is claimed once per page render by the cluster that paints a platform glyph. Keyed
  // on anything that outlives a render - a path, a counter - a warm process answers every request after the
  // first with `<use>` refs and no symbols: three empty 16px boxes @measured 2026-11-13 by
  // `node design/sprite-claim.mjs --base http://localhost:4322` (request 2 of `/`: 0 symbols, 5,270 bytes
  // smaller than request 1). Every route here is `prerender = true`, so dist-based gates (check:rsvp-page 5c/9b/9c,
  // check:render 4c) read a page rendered once and cannot see it (D297). Source-only, so before `build` (D118);
  // cost @measured 2026-11-13 by this gate: 0.15s gate, 0.16s selftest.
  { name: 'check:sprite-claim', desc: 'the sprite claim is keyed on the render (Astro.locals in a WeakSet), not on the path, and is asked for by every component that paints it' },
  // The join page's own defect catalog (S033, D303): it recomputes the channels from `joinChannels()` and compares
  // them with what the built page paints, so a channel added to the config without a row - or a row naming a
  // platform the resolver does not have - fails on the branch that did it. Its fixtures are in memory, so it can
  // fire before anyone builds (D118).
  { name: 'check:join:selftest', desc: 'the join gate can still fail (14 plantings plus 2 parser assertions, each named, with two clean controls: a correct page, and a date that lives only in an HTML comment)' },
  // The dated surfaces, asserted as a SET (2026-11-14, the operator's /join objective: "no page grows a second
  // source of truth for links, dates or claims"). Every ruling that put a date on the site did it one page at a
  // time, and nothing compared the pages that print a date with the rulings that allow it - so a new page could
  // start printing one and only `check:content`'s prose rules would ever look. Its fixtures are in memory, so it
  // runs before `build` (D118).
  { name: 'check:dated-surfaces:selftest', desc: 'the dated-surfaces gate can still fail (18 cases: 12 plantings — an unruled page printing a date, the homepage printing one again, a year-bearing stamp on an unruled page, a ruled page with no data-date handle, a ruled route missing from the build, a nav date written as bare prose, a nav date on the wrong element so the chip has no handle (nav-date-unhandled), a nav chip disagreeing with the schedule, a chip on an empty calendar, and three thin chip names (bare label, no aria-label at all, day without the weekday); 5 clean controls incl. an empty calendar, an age, a commented date, the shipped chip and the page of record; plus the route-walker case)' },
  // The band half of D115 ("at most one dark band per screen, and the band is the site's EXIT") was only ever
  // half-checked: `check:render` counts dark regions on a page that HAS a band and never asked whether a page
  // has one. In-memory fixtures, so before `build` (D118). Cost @measured 2026-11-14 by this step: 0.20s.
  { name: 'check:page-exit:selftest', desc: 'the page-exit gate can still fail (14 cases: no band, a band on the wrong ground, a band with no paths, a band with one path, a band whose nav repeats a path the page\u2019s own nav carries (D407), plus six clean controls incl. the swapped-class band, the band nav carrying only what the page nav does not, and the band\u2019s identity link to / which is not a nav repeat)' },
  // One page, one name (2026-11-14, the commissioned UX read's finding 1, D309). `/schedule` answered to five
  // names depending on where the visitor stood: nav "Dates", title "Schedule", h1 "When We Meet", band
  // "Schedule", homepage button "View Schedule". Every one is fine alone; together they are an alias map the
  // reader has to hold. The verdict here runs on in-memory fixtures, so the rule can go red on a branch nobody
  // has built yet (D118). Cost @measured 2026-11-14 by this step: 0.13s.
  { name: 'check:naming:selftest', desc: 'the naming gate can still fail (20 cases: 10 plantings — nav/title drift, band drift, a page that never names itself, the name only in a comment, a nav label with no page, a title with no site name, two pages labelling one route differently, a date glued to a nav label, an eyebrow above the h1, a section h2 that is another page’s h1 — and 10 clean controls, incl. a subordinate date chip, prose that describes without naming, a subtitle under the heading, and a comment quoting a tag name)' },
  // The heading ladder (S040, 2026-11-14, the second design read §7 D8): `/schedule` printed an h1 and then
  // jumped straight to h3 row titles, and no gate looked at levels at all. In-memory fixtures, so the rule can
  // go red before anyone builds (D118). Cost @measured 2026-11-14 by this step: 0.05s selftest, 0.04s gate.
  { name: 'check:outline:selftest', desc: 'the outline gate can still fail (19 cases: 13 plantings — h1 to h3, h1 to h4, two h1s, no h1, no headings, an empty heading, an image-only heading, a repeat h1 after going back up, no skip link, a late skip link, a skip link aimed off the main landmark, a main with no id, a skip link that exists only in a comment — and 6 clean controls; the step prints its own counts)' },
  // Outbound links (S041, D317): the read's §5.5 asked for `rel=noopener` + an arrow + an sr-only qualifier. Two
  // of those were already shipped; the defect was a qualifier repeated in the accessible name and four outbound
  // links carrying no qualifier at all. In-memory fixtures, so it can go red before anyone builds (D118).
  // Cost @measured 2026-11-21 by this step: 0.037s selftest, 0.040s gate (Linux native, Node 24.22.1).
  { name: 'check:ext-links:selftest', desc: 'the external-link gate can still fail (18 cases: 11 plantings — a new tab with no rel, rel without noopener, the qualifier painted in the label, an outbound link with no qualifier, a platform named twice, the exact doubled string the round-3 read quoted, a doubled word with no platform involved, an internal route opened as a new tab, an outbound link in the same tab, the "new window" wording, all defects at once — 6 clean controls incl. a mailto and a hyphenated name, and the derivation assertion). The count was 15 until 2026-11-21, when its own printout contradicted this description @measured 2026-11-21 by `node scripts/check-ext-links.mjs --selftest`)' },
  { name: 'check:sprite-claim:selftest', desc: 'the sprite-claim gate can still fail (6 plantings: path key, counter key, never-releases, path call site, no claim, sprite in the layout)' },
  // The promise half of the RSVP rule (S024, D287), added because of the completion audit's second objection:
  // MS12 closed while the plan still named a platform `src/config.json` declared no URL for. No gate compared
  // a milestone's words with the artifact. This one does: the description cell of every milestone row that
  // promises sign-up, against the config's declared links and against every `data-rsvp-platform` the built
  // pages carry. It runs pre-build on purpose — with no dist/ its artifact side is derived from the config, so
  // a plan-side defect goes red on a branch nobody has built yet (D118).
  { name: 'check:rsvp-promise:selftest', desc: 'the promise gate can still fail (8 plantings: config emptied, row reworded, painted-but-unpromised, a dropped link, a projection that disagrees, no plan, no artifact, an unknown platform name)' },
  // Runs before `build` on purpose: its fixture tree is its own, so a defect in this class is caught on a branch
  // nobody has built yet, and the artifact half of it is the reason it still belongs in this set.
  { name: 'check:escapes:selftest', desc: 'the escape gate can still fail (37 fixtures: 19 plantings, 17 clean forms, 1 severity case @measured 2026-11-14 by `node scripts/check-escapes.mjs --selftest`)' },
  { name: 'check:cache', desc: 'summary-cache rules against a fake KV namespace' },
  // The n8n integration builds an importable artifact from sources in this repo, and its rules are the same
  // date rules `data/events.json` is checked against. It runs `--offline`: no route to the LAN instance is
  // assumed (that is what the live form of the same command is for), and it costs 1.4s @measured 2026-11-05.
  { name: 'check:cadence', desc: 'the Mobilizon cadence workflow: four generators, invariants, 114 tests @measured 2026-11-23 by `npm run check:cadence`, the import checker' },
  // `harvest:selftest` is deleted with the harvester (MS42, S092, D471, 2026-11-23): `data/events.json` is no
  // longer written by a tool in this repo, so the four rules that step planted (never un-cancel a published
  // CANCELLED UID, venue reuse only on a byte-identical raw string, a TZID on both ends declares the hour, never
  // delete a row that dropped out of the feed) moved to the writer, which is `social-event-publisher`. What this
  // repo keeps is the reader's half: `check:ics` audits the file that arrives, and `check:ics:selftest` plants
  // each of its rules. The step count in design/gate-cost.json moves with it.
  // Which dates `/schedule` is allowed to print, checked against the rule module rather than a copy of it. Runs
  // before `build` because it opens no artifact (D118 again: a gate that can go red before anyone builds is a
  // gate that catches the defect on the branch that introduced it).
  { name: 'check:schedule-window:selftest', desc: 'the schedule-window gate can still fail (18 cases: 9 rule, 9 page plantings, @measured 2026-11-16 by `npm run check:schedule-window:selftest`)' },
  { name: 'audit:gate', desc: 'prod-only npm audit against an explicit allowlist' },
  // A review-round census row is not a note: a `want: 'present'` row makes a sentence load-bearing for as long as
  // the row stands, and the round reading it is not the round that wrote it. Two round-8 rows asserted sentences
  // without ever naming who put them on the page, and it took a visitor noticing one of them to open the question
  // of whether the site was saying the delegate's words (S082, D454). So each prose row that makes the site SAY a
  // sentence has to name its home - a `src/content.json` slot, a file that actually holds the string, a file that
  // composes it, or a ruling id - and a citation that names a file not containing the string fails as a false
  // citation. Source-only: it reads the census file, never an artifact, so it can go red before anyone builds (D118).
  // Cost @measured 2026-11-19 by these steps: 0.06s gate, 0.16s selftest.
  { name: 'check:census-rows', desc: 'every census row that makes a page say a sentence names where that sentence comes from (content slot / source file / generated file / ruling id), and the citation actually holds the string' },
  { name: 'check:census-rows:selftest', desc: 'the census-provenance gate can still fail (11 cases: an unattributed row, a slot that does not exist, a file that does not exist, a real file that does not hold the sentence, a malformed author, a slot holding the wrong sentence, plus a generated:/ruling/declined row accepted and the clean control)' },
  { name: 'build', desc: 'astro build -> dist/' },
  // dist/ exists only after `build`, and both of these read the artifact rather than the source.
  // The built half of the topic-archive gate (S089, D465): the source half cannot see what the prerenderer
  // emitted, and the component is the thing that can put an evidence date, a channel name or a snowflake into
  // a public byte. Scopes and their measurements are written out at the top of the script: ids are hunted
  // through every built text byte, every other private string through the page the archive renders, and a
  // member mention through the visible text of every built page - because a raw-byte mention rule fires on
  // `@measured` in an author comment and on `@__PURE__` in a minified bundle, which are shapes, not people.
  // Cost @measured 2026-11-21 by this step (Linux native, Node 24.22.1): 0.08s over 20 built text files.
  { name: 'check:thread-topics:dist', desc: 'no channel id, message id, evidence date, channel name, alias or @mention from the topic archive reaches a built byte, and the page under #threads paints the whole ratified set (S089, D465)', needs: ['build'] },
  { name: 'check:deploy', desc: 'the built artifact is deployable on the apex', needs: ['build'] },
  // One host, asserted in four places (astro.config `site`, config.json `seo.canonical`, the shipped
  // robots.txt Sitemap line, every canonical/og/twitter tag). A stale host in a shipped artifact is a
  // rebrand defect no other gate sees (D261): robots.txt named the apex being retired while the sitemap
  // itself was correct.
  { name: 'check:site-host', desc: 'the artifact names one host about itself: robots, sitemap locs, canonical, og, twitter', needs: ['build'] },
  // One claim, two machines: D404 put a `noindex,nofollow` meta tag on `/past` while its shelf is empty, and
  // the sitemap still published a `<loc>` for it @measured 2026-11-18 — `grep -c past dist/client/sitemap-0.xml`
  // printed 1 beside a page printing noindex. `check:site-host` compares the host of every `<loc>`, not which
  // routes the sitemap may name at all, so the pair had no detector (D245’s class: parts of one artifact
  // disagreeing while every gate reading them stays green). `src/lib/index-rules.mjs` is the one home both the
  // page’s meta tag and `astro.config.mjs`’s sitemap filter read.
  { name: 'check:indexable', desc: 'a route that prints a noindex meta tag is not a route the sitemap lists, and every route NOINDEX_ROUTES forbids is built and marked', needs: ['build'] },
  { name: 'check:indexable:selftest', desc: 'the indexability gate can still fail (3 plantings: the sitemap naming a self-forbidding page, a forbidden route whose page lost its meta tag, a forbidden route the build never emits; plus the clean control)', needs: ['build'] },
  { name: 'check:content', desc: 'no placeholder, no unsourced claim, no fabricated number, no uncorrectable operator-granted draft ships', needs: ['build'] },
  { name: 'check:content:selftest', desc: 'the content gate can still fail (25 cases incl. D415\u2019s draft-claim planting and its clean control)', needs: ['build'] },
  // Every section of a built page is a function of three inputs — the reader it is written for, what that reader
  // can do or believe once they leave the section, and the voice register it is written in. The communication
  // reviews (rounds 6, 7, 8) priced LINES of copy against rules about SHAPE — word count, near-duplication
  // (check:content and design/copy-duplicates.json), anchor ceilings, sources, dated surfaces, escapes. None of
  // them ever asked the three questions of a SECTION, so a sentence can pass every one of those gates while
  // changing nothing a reader can do or believe — which is what the operator’s word of 2026-11-19 met:
  // “it feels like fluff … it doesn’t feel authentic or like it’s consistent in communication to our target
  // audience”. This gate reads the built pages through design/dist-pages.mjs against design/copy-contract.json,
  // and it prints the sentences that carry no club fact and no path out as a worklist (S074, D448). The selftest
  // mutates the record and in-memory pages, so the row can go red before anyone builds (D118).
  { name: 'check:copy-contract', desc: 'every section of every built page has a contract naming a reader, a goal and a register; one reader per page unless the shift is declared; the sentences carrying no reader-usable fact do not get more numerous', needs: ['build'] },
  { name: 'check:copy-contract:selftest', desc: 'the copy-contract gate can still fail (9 plantings: a row deleted, a row renamed away, a row with no goal, a reader nobody declared, an undeclared audience shift, an unfilled letter shipped as sent, the letter missing, a hollow sentence unregistered, an exemption whose needle matches no sentence; plus the clean control)' },
  // What shipped on /schedule: `club\u2019s` painted literally, at every width, through a green `verify`.
  // This reads the bytes a reader sees (page text, `<meta>`, and the attributes a screen reader speaks) plus
  // the rendered-text context of every `.astro`/`.svelte` source, because the same bytes are correct inside a
  // string literal. `dist/client/events.ics` is out of scope by design - RFC 5545 escapes with backslashes.
  { name: 'check:escapes', desc: 'no escape sequence reaches a reader: built text and meta, and template text at the source', needs: ['build'] },
  // The page half of the same rule: `data-date` handles off the built page against `scheduleWindow()`'s plan,
  // plus the requirement that a page hiding dates says so and offers `/events.ics` (D238).
  { name: 'check:schedule-window', desc: '/dates prints exactly the windowed dates the rule module lists, in order, and names what it left out', needs: ['build'] },
  // The other end of the RSVP rule: `check:rsvp` proves the inputs, this proves the bytes. Recomputes each
  // cluster from `signUpPaths()` and fails a painted page that disagrees with the resolver (D272).
  { name: 'check:rsvp-page', desc: 'every printed date carries one sign-up cluster, and that cluster matches what signUpPaths() returns for it against both event snapshots; no headcount is painted on the page, in digits or in words, that src/content.json does not source (D265, D406)', needs: ['build'] },
  // The page half of the join rule (S033, D303): every channel the resolver lists is painted on /join, in
  // canonical order, under a heading for its kind, at a URL its platform can have, with a stamp under 60 days;
  // nothing is painted that the resolver does not have. It reads `dist/`, so it waits for `build` (D118).
  // The artifact side of the same rule: walk every emitted page, and require the set that prints a date to be the
  // set a ruling names. It reads `dist/`, so it waits for `build` (D118).
  { name: 'check:dated-surfaces', desc: 'the pages that print a calendar date are exactly the ones a ruling names (D218, `/dates` alone since D306), each with a data-date handle; no other built page prints a date, year-bearing provenance included; the nav’s subordinate date is chrome and must equal the first date /dates prints (D311)', needs: ['build'] },
  // Which register each "how current is this" line uses (S042, D322): an age inside 30 days, the calendar
  // date beyond it, produced by the one function in `src/lib/provenance.mjs`. The read's D6 found the site
  // running both registers at once; this is the detector that keeps them from drifting back apart.
  { name: 'check:provenance', desc: 'every provenance line in the artifact uses the one ruled register for its age — relative inside 30 days, absolute beyond — and no component computes its own age outside src/lib/provenance.mjs (D322)', needs: ['build'] },
  { name: 'check:join', desc: 'every way in on /join is a channel joinChannels() returns, in canonical order under its kind, named in visible words, at a stamped URL, and the page prints no date; no invented channel, no empty kind heading, no blind link past 60 days', needs: ['build'] },
  // The artifact half of the same rule: every route the build emits (read off `dist/`, never remembered, D117)
  // closes with the band, on the ratified ground, offering at least two paths out. It reads `dist/`, so it waits
  // for `build` (D118). Cost @measured 2026-11-14 by this step: 0.21s.
  { name: 'check:page-exit', desc: 'every page the build emits ends with the exit band on the ink ground, offers at least two paths out, links home, and its band nav never repeats a path the page\u2019s own nav already carries (D407)', needs: ['build'] },
  // The name surfaces of every emitted page: the nav label is the chosen name, and the <title>, the exit-band
  // link and the page's own opening block have to say it too (D309). Routes are read off `dist/`, never
  // remembered (D117). It also prints an alias census - every other label the artifact attaches to an internal
  // route - as information, because prose is allowed to describe a page without naming it.
  { name: 'check:naming', desc: 'one name per page in the four surfaces a visitor navigates by: nav, title, exit band and the page’s own opening block; a nav label with no page behind it fails; nothing sits above a page’s first heading and no page wears another page’s h1 as its own h2 (S040)', needs: ['build'] },
  // Every emitted page: exactly one h1, and a ladder that never skips a level (S040). Routes are read off
  // `dist/`, never remembered (D117), and the ladder itself is printed so a reviewer sees the shape.
  { name: 'check:outline', desc: 'one h1 per built page and no skipped heading level (an h1 -> h3 jump, a second h1, a page starting at h2, an empty heading), and every page carries a skip link as its first anchor aimed at its own <main id> (WCAG 2.4.1, 2026-11-23)', needs: ['build'] },
  // Every link that leaves the site (S041, D317): rel carries noopener, "opens in a new tab" lives only in the
  // sr-only span, no platform is named twice in one accessible name, and the club's own routes never open a new
  // tab. Counts are printed from the artifact so a reviewer sees the census, not just the verdict.
  { name: 'check:ext-links', desc: 'every outbound anchor: rel carries noopener, opens in a new tab, "opens in a new tab" only in an sr-only span, no platform named twice in one accessible name, and no club route painted target=_blank (S041, D317)', needs: ['build'] },
  // Every call to action on every built page sits in a block the page declared as its context (MS41, S090, D467).
  // The operator's letter named one button on `/chat`; the census in `docs/research/discord-invite-ux-2026-11-20.md`
  // found the class: 43 actions on 6 built pages, none with declared context, and a proximity window fails **none**
  // of them because nav, lede and exit band flatter every control they surround. So the rule is a declared block
  // (`data-cta-block` + `data-cta`) whose words must name the destination, the ask, and — for a standing exit — the
  // thing the visitor enrols in. The vocabulary and the walk live in `design/cta-rules.mjs`, shared with the probe
  // that prices it (`design/cta-inventory.mjs`), so a review letter and a red gate cannot quote different numbers
  // (D264). The selftest plants whole fixture pages in `.design/tmp-cta-context/` and reads no `dist/`, so it can go
  // red before anyone builds (D118); the gate reads the artifact, so it waits for `build`. The artifact census is
  // printed on a green run (pages, actions by kind, blocks) because "green" alone is not a measurement (D144).
  // Cost @measured 2026-11-21 by this step (Linux native, Node 24.22.1, 6 pages, rig load 10/16cpu): 0.07s gate, 0.06s selftest.
  { name: 'check:cta-context:selftest', desc: 'the call-to-action context gate can still fail (14 cases: 11 planted pages — an undeclared action, an id with no registry row, an href contradicting its own id, no block, a block declared for another destination, a block that is the label with air around it, a block that swallows the page, a block naming no destination, a block naming no ask, an invite that hides that it enrolls you in a server, and a clean control — plus a vacuous exemption named by id, a platform with no registry row, and the fraction guard)' },
  { name: 'check:cta-context', desc: 'every call to action on a built page names a registry destination whose row the printed href matches, and sits in an element declaring data-cta-block for that id which says in words where it leads, what the visitor does there, and what it enrols them in; a platform or /join row with no registry id fails, and so does an exclusion that matched nothing on the artifact (S090, D467)', needs: ['build'] },
  // One focus ring for the whole site, asserted in the stylesheet it ships in (S043, D328). The selftest plants
  // on in-memory CSS and HTML, so the rule can go red before anyone builds (D118); the gate reads the shipped
  // stylesheet, so it waits for `build`. Cost @measured 2026-11-15 by this step: 0.06s gate, 0.07s selftest.
  { name: 'check:focus:selftest', desc: 'the focus gate can still fail (14 cases: 6 plantings — an authored outline:none, outline:0, outline-style:none, a stylesheet with no global ring, a ring covering links but not buttons, a 1px ring, a ring with no offset, a hex ring, a token under the 3.0 bar, outline-none on a link, outline-hidden on a button — plus 3 clean controls, incl. the defect quoted inside a comment and outline-none on a non-control)' },
  { name: 'check:focus', desc: 'the shipped stylesheet carries one global 2px focus ring on a:focus-visible and button:focus-visible, offset 2px, coloured by a @theme token that clears 3.0 against paper, and nothing in src/ or the artifact suppresses an outline (S043, D328)', needs: ['build'] },
  // One provenance register (S042, D322). The selftest plants on in-memory pages and fixture files, so it
  // can go red before anyone builds (D118); the gate itself reads the emitted pages, so it waits for
  // `build`. Cost @measured 2026-11-14 by this step: 0.05s gate, 0.03s selftest.
  { name: 'check:provenance:selftest', desc: 'the provenance gate can still fail (14 cases: 4 artifact plantings — an age past the 30-day window, an absolute date inside it, both registers on one line, and a phrase with no register that must NOT fire — plus 5 source-side cases, incl. the rule\u2019s own module being exempt and a comment quoting the defect not counting as a call)' },
  // The site's own drawings (S042, D323). Cost @measured 2026-11-14 by this step: 0.04s gate, 0.03s selftest.
  { name: 'check:line-art:selftest', desc: 'the line-art gate can still fail (13 cases: 9 plantings — a hex in a stroke, a hex fill, a currentColor fill, a missing role, a missing label, a 20-word label, a missing caption, an oversized drawing, a figure with no svg at all — and 4 clean controls, incl. fill="none", a bare svg that is not a figure, and a label at exactly the 12-word cap)' },
  // What an alt says, and where the source goes (2026-11-14, the MS04 read, D312). Before this gate the three
  // horizon plates' alts ran 30, 28 and 32 words @measured 2026-11-14 by
  // `git show HEAD:src/components/HorizonBand.astro | grep -o "alt: '[^']*'" | awk '{print NF-2}'` and each opened
  // with a book title, a year and a leaf number -
  // a citation in the place a description belongs - with nothing on the page carrying a caption. Selftest runs
  // on in-memory fixtures, so the rule can go red before anyone builds (D118). Cost @measured 2026-11-14 by
  // this step: 0.16s selftest, 0.14s gate.
  { name: 'check:alt:selftest', desc: 'the alt gate can still fail (13 cases: 8 plantings — a bare img, an empty alt nobody declared, a 22-word alt, a citation in an alt with no figcaption, 13 words, an alt that names the file instead of the picture, an img with no intrinsic size, a bare `alt` with no declaration — plus 5 clean controls, incl. a declared decorative plate and a 12-word alt exactly at the cap)' },
  // Which pages carry the club's own drawings, in the ruled language: hairlines, currentColor, under 1200
  // bytes, captioned (S042, D323). Reads the artifact, so it waits for `build`.
  { name: 'check:line-art', desc: 'every <figure data-line-art> in the artifact is a captioned, role="img" drawing under 1200 bytes whose strokes are currentColor and whose shapes are unfilled (D323)', needs: ['build'] },
  { name: 'check:alt', desc: 'every img in every built page: an alt, or a declared decorative plate (data-decorative); no alt over 12 words, no alt naming the file’s role, no citation in an alt with no figcaption, no img without intrinsic width/height (D312, D324)', needs: ['build'] },
  // The homepage's thread list: the cap the component declares, the number the page paints, and a link that
  // actually lands on the page that holds the rest (S042, D320, read §5.4). The cap is read out of
  // WhyJoinUs.astro rather than restated here, so the gate and the page cannot disagree (D238).
  { name: 'check:threads:selftest', desc: 'the thread-list gate can still fail (9 cases: 7 plantings — nine bullets under a cap of six, the rest link deleted, the rest link aimed at Meetup, a dead #threads anchor, a list that quietly dropped two items, no cap declared, an offer with nothing left to offer — plus 2 clean controls) @measured 2026-11-14 by `node scripts/check-threads.mjs --selftest`' },
  { name: 'check:threads', desc: 'the home page paints exactly min(cap, items) thread bullets, and when items exceed the cap the page carries a "the rest of the list" link to /chat#threads and /chat has that id (S042, D320)', needs: ['build'] },
  // A schedule row's shape is a rule, not a preference (2026-11-14, the commissioned read's item 4, D313, S037).
  // The restructure was measured - `design/schedule-geometry.mjs` prints the rail/lane/plate boxes and
  // `design/line-length.mjs` prints characters per line - but both are diagnostics: they exit 0 whatever they
  // measure, so the shape lived only in DESIGN.md prose. Delete the head div, drop `max-w-measure` from the prose
  // wrapper, move the date sentence under the title or put the plate before the copy, and every gate stays green.
  // This gate is the detector, and the cap is checked against DESIGN.md's 40-75 character band using the
  // measured 0.455 em per serif character (32em = ~70 @measured 2026-11-14 by
  // `node design/line-length.mjs /schedule 1240 1024 640 320 --no-build`). Selftest is in-memory (D118).
  // Cost @measured 2026-11-14 by this step: 0.03s selftest, 0.05s gate.
  { name: 'check:row-geometry:selftest', desc: 'the row-geometry gate can still fail (23 cases: 17 plantings — head deleted, prose uncapped, date sentence after the title, plate before the copy, measure token gone, cap widened to 60em, cap cut to 12em, the <time> wrapper gone, the <time> value disagreeing with data-date, the zone word missing, the zone word on the second row, the zone repeated, a second venue group starting without the word, a dated row losing its venue handle, a handle naming a room the row never prints — plus 5 clean controls (incl. two venue groups each opening with the word, and two dates at one venue naming it once) and the parser assertion that a shipped row parses as one row)' },
  { name: 'check:row-geometry', desc: 'every date row in the artifact is two zones in order — the date rail and a copy zone (head above the title, capped prose, one primary link) with no plate painted — the date sentence wrapped in <time datetime> matching the row’s data-date, the zone word opening each venue group rather than each page (D397, supersedes D327) off a grounded data-venue-key handle, and the emitted --container-measure inside DESIGN.md’s 40-75 character band (D313, D327, D397)', needs: ['build'] },
  // The artifact side of the promise gate: it opens the built pages, so it waits for `build` (D118).
  { name: "check:rsvp-promise", desc: "the platforms MS12's row promises are exactly the platforms the config declares and the built pages paint, in the plan and in the tracked projection alike", needs: ['build'] },
  // Report-only, not a correctness gate (D253): Tailwind v4 scans every tracked file, so a class name
  // written in design prose lands in the stylesheet every visitor downloads. The number is the budget;
  // the baseline makes a new round's invented class names visible the day they are written.
  { name: 'check:css-utilities', desc: 'utilities in the shipped CSS that no file in src/ writes', needs: ['build'] },
  // MS35 (S068, D440): §2's ranked GAP rows graduate to detectors, and each one here is a detector because
  // its selftest can plant the defect and name the failure (D282's "a check without a selftest is an assertion,
  // not a detector"). All four read the ARTIFACT, so each waits for `build` (D118's table: `dist/` => DEPLOY
  // with needs: ['build']). The rules they enforce are written in DESIGN.md before these gates demand them -
  // each script's header cites the line it enforces - and the corpus that proposes them is input, not authority:
  // the secondary half of rank 2 is refused rather than minted (`DRAFT·secondary-budget`), because our own
  // shipped tree carries three secondary roles on `/` and on `/join`. Cost below is what these steps measured
  // in the runner, so the next round's cost guard can compare like-for-like.
  { name: 'check:route-targets:selftest', desc: 'the route-target gate can still fail (11 cases: 6 plantings — a citation of /schedule, the route the site used until D373 renamed it; a trailing-slash route; an index.html suffix; an anchor moved off its page; an in-page anchor with no id; and the dead path on the 404 page, which must NOT fire — plus 5 clean controls, incl. an emitted file that is not an .html page (/events.ics) and a class string inside compiled island code, which is not markup) @measured 2026-11-18 by `node scripts/check-route-targets.mjs --selftest`' },
  { name: 'check:route-targets', desc: 'every <a href="/…"> a built page paints names a path the build emits (a page, or an emitted file like /events.ics), no href is a second address for one page (a trailing slash, an index.html or an .html suffix), and every #fragment is an id on the page the anchor LANDS on — 6 pages, 6 distinct internal hrefs, 0 dead (MS35, S068; GAP-ANALYSIS §2 rank 1)', needs: ['build'] },
  { name: 'check:primary-action:selftest', desc: 'the emphasis gate can still fail (8 cases: 2 plantings — the shipped Schedule fixture with its notice\u2019s quiet label promoted to primary, and a join page whose computed lead paints twice — plus 6 clean controls, incl. a page with one primary and three secondary, a page with two secondary and no primary (the corpus would fail this one; our refusal does not), and a role inside compiled island code) @measured 2026-11-18 by `node scripts/check-primary-action.mjs --selftest`' },
  { name: 'check:primary-action', desc: 'at most one data-control="primary" per built page — /, /join and /404 carry one each, /chat, /dates and /past carry none; the secondary count is printed, not bounded (DRAFT·secondary-budget: the shipped / and /join carry three each) (MS35, S068; GAP-ANALYSIS §2 rank 2, primary half only)', needs: ['build'] },
  { name: 'check:notice-announcement:selftest', desc: 'the announcement gate can still fail (8 cases: 2 plantings — the shipped /past notice with its role attribute deleted, prose first, and the empty state with its region removed AND a sentence before its title — plus 6 clean controls: a status region, an alert region, a notice that announces itself by its own first <h2>, controls/rows/headers carrying the inset handle in the other order or mid-list, and the handle inside compiled island code) @measured 2026-11-18 by `node scripts/check-notice-announcement.mjs --selftest`' },
  { name: 'check:notice-announcement', desc: 'every painted notice handle (inset-shadow-rule rounded-control at the FRONT of a block\u2019s class list) carries a live region, an assertive region, or its own title as its first content — 2 painted notices today, both announced; 8 controls and every schedule row carry the inset handle in another order and never fire (MS35, S068; GAP-ANALYSIS §2 rank 3, with the title exemption written out loud)', needs: ['build'] },
  { name: 'check:reduced-motion:selftest', desc: 'the motion guard can still fail (9 cases: 5 plantings — the shipped sheet with the guard block deleted; a guard written but commented out, which DESIGN.md says does not count; a guard that sets only a colour; a guard scoped to .notice while motion ships on controls; and a guard written into the built sheet and never into src/ — plus 4 clean controls, incl. Tailwind\u2019s own unused @keyframes spin and .animate-spin, which must NOT fire with 0 animate-* written in src/) @measured 2026-11-18 by `node scripts/check-reduced-motion.mjs --selftest`' },
  { name: 'check:reduced-motion', desc: 'the stylesheet that ships a transition ships a @media (prefers-reduced-motion: reduce) block that neutralises it, in the artifact and not only in src/: 12 transition writes in src/, 1 guard block authored, 1 built, selecting *, neutralising both kinds; a guard inside a comment does not count and Tailwind\u2019s unused @keyframes spin is not mistaken for shipped motion (MS35, S068; GAP-ANALYSIS §2 rank 4 — the one row DESIGN.md already mandated, so its artifact half landed with the gate)', needs: ['build'] },
  // MS36 (S070, D444): the design system's own contract, stated the way the two token-governance rows in
  // design/refs/GAP-ANALYSIS.md §2 rank 10 quote it - a closed set, so anything outside it fails the build. We
  // take their CONTRACT, never their registry file, migration CLI or eslint preset: D440 refuses the machine that
  // would import them, and this gate is what makes that refusal honest rather than aspirational. The fact it
  // catches is one no other gate here can see: check:contrast only ever reads a colour that IS painted, and
  // check:css-utilities (D253) reads the FAR side (a utility in the shipped sheet nothing writes), so a token
  // @theme declares and nothing reads back was invisible to both - and it is already the state of the elevation
  // pair (D105, defined-but-unused until the first menu) and of 14 of the join-path tokens.
  // BOTH rows wait for build, and the reason is written here rather than left to inference: the gate reads
  // dist/client's built sheets AND the class= attributes of its built HTML pages, and the selftest's clean control
  // is that same shipped tree, so neither step is pure - D118's table puts a gate reading dist/ in DEPLOY with
  // needs: ['build'] - and the SELFTEST waits on it too, because its clean control is the shipped tree: run in the
  // same wave as build it raced a half-written dist and died with a TypeError at check-token-usage.mjs:141 instead
  // of a verdict (@measured 2026-11-19 in .design/tmp-gate-logs/deploy/check:token-usage:selftest.txt, which is
  // the reason this row carries needs, not an arrangement). Its 9 plantings are in-memory fixtures, so the step
  // mutates nothing on disk and still shares a wave with the read-only probes. Cost @measured 2026-11-18 by /usr/bin/time
  // called fresh: 0.65s for the gate, 0.22s for the selftest.
  { name: 'check:token-usage:selftest', desc: 'the token-travel gate can still fail (11 cases: 9 plantings - a planted @theme colour no class anywhere names, a hue written only inside a comment, a spacing ladder named only in prose, a line-height companion with no base step, a page still writing the class of a token the token file records RETIRED (D316), an allowlist entry for a token @theme no longer declares, an allowlist entry for a tint src/ now paints, the same reservation contradicted by a BUILT PAGE instead, and a planted breakpoint tier never written - plus 2 clean controls (a fixture tree where every token is painted or reserved, and the shipped tree at this tip) - 11 cases, 0 wrong @measured 2026-11-18 by `node scripts/check-token-usage.mjs --selftest`)', needs: ['build'] },
  { name: 'check:token-usage', desc: 'every --token @theme declares in src/styles/global.css travels: a class for it is written in src/ outside a comment, or a built page carries it in a class= attribute, or it is reserved in design/token-usage-allowlist.json beside its ruling - and a reserved token whose rule sits in the built sheet because a sentence elsewhere names it is a NOTE whose bytes belong to check:css-utilities, not a finding (D253); the namespace-definition namespaces (--breakpoint-*, --inset-shadow-*, --radius-*, --shadow-*, --leading-*, --font-*, --container-*) are judged by their src/ write counts, since they emit no var() read of themselves; a name inside a comment or a backticked span is a mention, never a paint (61 tokens: 39 written, 8 emitted, 14 reserved, 0 findings @measured 2026-11-18 by `node scripts/check-token-usage.mjs`). Reads dist/, so needs: [build] (MS36, D444; GAP-ANALYSIS §2 rank 10)', needs: ['build'] },
];

// The dev rig (E7, D291): checks that measure the TOOLING a session uses rather than the bytes a visitor
// receives. `check:lsp` proves the pi-lens registration in `.pi-lens.json` still reaches `.astro` - a config
// that rots silently costs a session its code intelligence, but it changes nothing that ships. It is not in
// `verify` for that reason, and CI runs it as its own step so a rig defect is named as a rig defect instead
// of hiding inside the deploy gate set. `npm run verify:rig` is the command; the runner treats it as a gate
// set like any other, with logs and its own cost comparison.
//
// Why the LSP gate checks what it checks: pi-lens can reach `.astro` (19 files - the surface the design
// handles and probe anchors live on) only through a custom server entry in `.pi-lens.json` (D266), and every
// way that entry rots is silent: delete it and the .astro files simply stop answering, drop the tsdk init
// option and astro-ls registers no type service at all (it still answers initialize - measured 2026-11-10),
// switch autoformat or autofix on and a gate set that compares bytes starts seeing files rewritten on every
// edit. Since D270 the gate also spawns the server and requires a handshake, because a config that reads
// perfectly can register a deaf server. It needs no artifact, so it runs before `build` (D118); cost
// @measured 2026-11-13 by this gate: 3.2s gate, 3.8s selftest, inside the rig set.
const RIG = [
  { name: 'check:lsp', desc: 'the LSP config registers astro-ls for .astro, sets its tsdk, keeps format/autofix off, and the server answers a real handshake' },
  { name: 'check:lsp:selftest', desc: 'the LSP config gate can still fail (9 plantings: 7 config, 2 spawn)' },
  { name: 'cost:selftest', desc: 'the cost guard can still fail (12 planted baseline/load combinations, each with the verdict it must produce)' },
];

// The browser ritual (D123): everything a human used to type by hand, in one command, over the dist that
// `verify` just built. It does NOT build first — several of these mutate or re-measure the artifact, and
// `check:render:dist` is the `--no-build` form precisely so the run measures the thing being tested.
// The mutating selftest runs after the read-only gates so a crash cannot leave a mutated page under a
// passing render gate.
const BROWSER = [
  // `alone: true` — a step that runs its OWN pool of browsers takes the whole machine. Measured on this rig
  // (Linux, native): check:logo alone is 10s; in a wave beside check:space and check:social:live it took
  // 152s and came back `exit 1 / firefox rc=?` (a timeout, twice in a row), while check:render:dist reports
  // nine internal measurements it already runs JOBS-at-a-time by itself. Two browser pools in one wave buys
  // nothing here — the browser steps are almost all downstream of check:render:dist anyway — and it buys a
  // flake, which is the one thing a gate may not buy.
  { name: 'check:render:dist', desc: 'control geometry, contrast, bands, keylines, nav fit, the logo, the sign-up cluster', alone: true },
  { name: 'check:logo', desc: 'the logo probe at 320 and 1240: painted ink and meaning', needs: ['check:render:dist'], alone: true },
  // A gate nobody can prove can go red is an assertion, not a detector (D118). `check:logo` sat green in the set
  // while its two probe paths were bare names resolving against the cwd (D489), because nothing could plant that
  // defect. The selftest does: it moves a probe, runs the gate, restores it, then runs the GEOMETRY probe against
  // five decoy readings of src/lib/logo.mjs generated from the shipped table (D190: never a typed-out path), and
  // the PIXELS probe against a report whose logo sits outside the shot (record 0015's frame trap). Controls are
  // run alongside every planting. Cost @measured 2026-11-25 by `time npm run check:logo:selftest` three times
  // (Linux native, Node 24.22.1, 16 CPU, load 7.4 -> 7.5/16cpu): 9.86s, 8.99s and 8.59s wall for the whole script,
  // against `check:logo` itself at 10.32s in .design/tmp-gate-logs/browser/manifest.txt - the selftest is the
  // same two firefox probes plus six extra probe invocations, so it costs about one more gate run, which is
  // what a detector has to cost to be worth running.
  { name: 'check:logo:selftest', desc: 'the logo gate can still fail (2 probe-wiring plantings, 5 decoy geometry tables, 1 report with the logo outside the shot, plus controls)', needs: ['check:render:dist', 'check:logo'], alone: true },
  { name: 'check:social:live', desc: 'the card producer itself, into a gitignored temp file', needs: ['check:render:dist'], alone: true },
  { name: 'check:space', desc: 'where the emptiness is, and what each reserved slot measures', needs: ['check:render:dist'], alone: true },
  // what the page PAINTS as its ground, and what a hairline measures off those bytes (D143). The rest of the
  // render gate is colour-string arithmetic, so a background-image moves none of its numbers — this is the step
  // that sees pixels, and the only one that can go red on a texture.
  { name: 'check:ground', desc: 'the painted page ground and the painted hairlines, off screenshot bytes', needs: ['check:render:dist'], alone: true },
  { name: 'check:ground:selftest', desc: 'four plantings the ground probe must tell apart (it copies dist, so it reads only)', needs: ['check:render:dist', 'check:ground'], alone: true },
  // The browser half of the RSVP rule (S022, D281): check:rsvp-page proves the bytes Astro builds carry an
  // island and a chunk that mentions localStorage; only a browser can prove the island hydrates and that a
  // remembered platform actually reorders the row. Six Firefox spawns of ~2.4s each @measured 2026-11-11
  // (Linux native, Firefox 159.0).
  { name: 'check:rsvp-preference', desc: 'the sign-up island hydrates over loopback HTTP, leads with the platform localStorage remembers, keeps every platform in the cluster, and syncs across rows on click', needs: ['check:render:dist'], alone: true },
  { name: 'check:rsvp-preference:selftest', desc: 'six plantings in a copy of dist, each of which the preference gate must name (no island directive, wrong key, no reorder, reorder-as-filter, dead cross-row event, non-canonical painted order)', needs: ['check:render:dist', 'check:rsvp-preference'], alone: true },
  // last: it edits dist/client/index.html and restores it in a finally block
  // Runs LAST, and the needs list is why it is not just 'after check:render:dist': the selftest PLANTS
  // defects in dist/client/index.html to prove check:render can go red (D118). In the same wave as the
  // read-only probes, a logo or space probe could measure a planted page and report a finding that never
  // happened — a race that reads as a flaky browser gate. (It must not rebuild either: check:render would
  // build over its own fixtures and selftest nothing.)
  { name: 'check:render:selftest', desc: 'twenty-five mutations, each of which check:render must FAIL (last: it mutates dist)', needs: ['check:render:dist', 'check:logo', 'check:social:live', 'check:space', 'check:ground'] },
];

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const positional = args.filter((a) => !a.startsWith('--'));
const serial = flag('--serial') || process.env.GATE_JOBS === '1';
const JOBS = serial ? 1 : Math.max(1, Number(process.env.GATE_JOBS ?? 4));

function pickSet(flagFn) { if (flagFn('--browser')) return BROWSER; if (flagFn('--rig')) return RIG; return DEPLOY; }
const set = pickSet(flag);
const setKey = set === BROWSER ? 'browser' : set === RIG ? 'rig' : 'deploy';
if (positional.length) {
  const unknown = positional.filter((p) => !set.some((s) => s.name === p));
  if (unknown.length) {
    console.error(`gate-run: unknown step(s): ${unknown.join(', ')}`);
    console.error(`  known: ${set.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }
}
const picked = positional.length ? set.filter((s) => positional.includes(s.name)) : set;

if (flag('--list')) {
  for (const s of picked) console.log(`${s.name.padEnd(26)} ${s.needs ? `after ${s.needs.join(',')} ` : ''}${s.desc}`);
  process.exit(0);
}

const dist = resolve('dist/client/index.html');
if (set === BROWSER && !existsSync(dist)) {
  console.error('gate-run --browser: dist/client/index.html missing — run npm run verify (or npm run build) first.');
  process.exit(1);
}
// The browser set does not build, so it stands or falls on `dist/` being the build of this tree. Checked here,
// before the first 7s browser step, because the failure is silent otherwise: after a branch switch the gates
// measure the page the previous branch built and report findings about code that is gone — measured 2026-11-03,
// where a merged tree inherited the pre-merge dist and check:render went red on the very defect the branch
// under review had fixed (design/dist-fresh.mjs, D156).
if (set === BROWSER) {
  const st = distState();
  if (!st.fresh && !st.allowed) {
    console.error(`gate-run --browser: ${staleLine(st)}`);
    process.exit(1);
  }
}

// One directory per set, overwritten by the run, so `check:render:dist.txt` always means "the last render
// measurement I ran". A log write must never be what breaks the gate set, so failures are reported loudly
// and do not throw — a silent log failure is the same defect class as no logs at all.
const LOG_DIR = process.env.GATE_LOG_DIR
  // an override is always a gitignored scratch path (`.design/tmp-*`), so a review build's evidence does not
  // overwrite the shipped run's - `tmp-gate-logs` is "the last run wins" and those two runs are not the same page
  || resolve('.design', 'tmp-gate-logs', setKey);
let logBroken = null;
try {
  mkdirSync(LOG_DIR, { recursive: true });
  for (const f of readdirSync(LOG_DIR)) if (f.endsWith('.txt')) unlinkSync(join(LOG_DIR, f));
} catch (e) { logBroken = e.message; }
const runStarted = new Date().toISOString();
const writeLog = (name, { code, secs, out, note = '' }) => {
  if (logBroken) return;
  const head = `# gate-run: ${name}\n# set=${setKey} started=${runStarted} exit=${code} secs=${secs.toFixed(2)}\n# command: npm run --silent ${name}\n`;
  try { writeFileSync(join(LOG_DIR, `${name}.txt`), `${head}${note}\n${out}\n`); }
  catch (e) { logBroken = e.message; }
};

const run = (step) => new Promise((done) => {
  const t0 = process.hrtime.bigint();
  const child = spawn(NPM, ['run', '--silent', step.name], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (b) => { out += b; });
  child.stderr.on('data', (b) => { out += b; });
  child.on('error', (e) => { out += `\nspawn failed: ${e.message}`; });
  child.on('close', (code) => done({
    step,
    code: code ?? 1,
    secs: Number(process.hrtime.bigint() - t0) / 1e9,
    out: out.trimEnd(),
  }));
});

const results = new Map();
const t0 = Date.now();
// A wall-clock number with no load number next to it is not a measurement. Measured 2026-11-05 (Linux, 16 CPU):
// `build` was 17.8-21.8s inside the set and **5.85s standalone in the same minute**, because a foreign process
// (`strata-host`) held 542% CPU and load average sat at 8-9.6. That is a +125% cost FAIL with nothing wrong in
// the repo. The guard cannot tell a regression from a contended box unless both numbers are kept, so the
// manifest carries the load at start and at end, and the cost line prints it.
const loadLine = () => `${loadavg()[0].toFixed(1)}/${cpus().length}cpu`;
const load0 = loadLine();
let failed = 0;
let skipped = 0;

// Ready-queue waves, not fixed chunks. The chunked version of this put `check:content` and `check:deploy` in
// the SAME wave as `build`, so they looked for a build result that did not exist yet and skipped: the deploy
// set shipped green while its two content gates never ran. A step joins a wave only once its needs have
// SUCCEEDED, which is also what stops a failed `check` from being papered over by running everything
// downstream of it anyway. (Array order still decides who goes first when more than JOBS are ready.)
const remaining = [...picked];
while (remaining.length) {
  const readySteps = remaining.filter((step) => (step.needs ?? []).every((n) => results.get(n)?.code === 0));
  if (readySteps.length === 0) {
    // Everything left is waiting on something that failed or was itself skipped.
    for (const step of remaining) {
      const missing = (step.needs ?? []).filter((n) => results.get(n)?.code !== 0);
      skipped++;
      const why = missing.map((m) => `${m} (${results.get(m) ? 'FAILED' : 'not run'})`).join(', ');
      writeLog(step.name, { code: 'skipped', secs: 0, out: `SKIPPED — needed: ${why}`, note: '\n# The step never ran: an earlier step it needs did not succeed.' });
      console.log(`SKIP ${step.name.padEnd(24)} needed: ${why}`);
    }
    break;
  }
  // An `alone` step gets a wave to itself, and no non-alone step is held back behind one: if the first
  // ready step is alone, the wave is just it; otherwise the wave is the ready steps that are not alone.
  let wave;
  if (serial) wave = readySteps.slice(0, 1);
  else if (readySteps[0].alone) wave = [readySteps[0]];
  else wave = readySteps.filter((s) => !s.alone).slice(0, JOBS);
  if (wave.length === 0) wave = [readySteps[0]];   // everything ready is alone; take the first
  for (const step of wave) remaining.splice(remaining.indexOf(step), 1);
  const waveResults = await Promise.all(wave.map(run));
  for (const r of waveResults) {
    results.set(r.step.name, r);
    const secs = r.secs.toFixed(2).padStart(6);
    writeLog(r.step.name, r);
    if (r.code === 0) {
      console.log(`ok   ${r.step.name.padEnd(24)} ${secs}s`);
    } else {
      failed++;
      console.log(`FAIL ${r.step.name.padEnd(24)} ${secs}s  (exit ${r.code})`);
      if (r.out) console.log(r.out.split('\n').map((l) => `     | ${l}`).join('\n'));
    }
  }
}

const wall = ((Date.now() - t0) / 1000).toFixed(1);
const sum = [...results.values()].reduce((a, r) => a + r.secs, 0).toFixed(1);
const ok = results.size - failed - 0;
try {
  const manifest = [...results.values()]
    .map((r) => `${r.code === 0 ? 'ok  ' : 'FAIL'} ${r.step.name.padEnd(24)} ${r.secs.toFixed(2).padStart(7)}s  -> ${r.step.name}.txt`)
    .join('\n');
  writeFileSync(join(LOG_DIR, 'manifest.txt'), `# gate-run ${setKey} set, ${runStarted}\n# ${ok} ok, ${failed} failed, ${skipped} skipped — ${wall}s wall, ${sum}s of work (jobs=${serial ? 1 : JOBS}, load ${load0} -> ${loadLine()})\n${manifest}\n`);
} catch (e) { logBroken ||= e.message; }
  console.log(`\ngate-run: ${ok} ok, ${failed} failed, ${skipped} skipped — ${wall}s wall, ${sum}s of work (jobs=${serial ? 1 : JOBS}, set=${setKey})`);
console.log(logBroken
  ? `NOTE step output was NOT saved (${logBroken}) — every number above is unverified until you re-run with a writable .design/`
  : `logs  ${LOG_DIR}/ — every step's full output, pass or fail, from this run (gitignored scratch; the last run wins)`);

// The cost of a gate set doubles without anyone deciding it: `verify:browser` went 44.7s -> 85.6s -> 87.8s
// as the width sets grew (D146) and nobody compared two runs. A gate that takes twice as long is a gate
// people stop running, so every green run compares itself against a tracked baseline. The arithmetic - work
// seconds, normalised for the CPU actually free, with the 2x bar and the WARN at 40% - lives in
// scripts/cost-guard.mjs and is tested by `npm run cost:selftest` (D290, E6).
const COST_BASELINE = resolve('design', 'gate-cost.json');
const LOAD_LIMIT = Number(process.env.GATE_LOAD_LIMIT || 6);   // only used when a baseline has no load fields and the comparison cannot be normalised
if (!failed && !skipped) {
  try {
    const base = existsSync(COST_BASELINE) ? JSON.parse(readFileSync(COST_BASELINE, 'utf8'))[setKey] : null;
    const res = compareCost(base, {
      steps: Object.fromEntries([...results.entries()].map(([n, r]) => [n, r.secs])),
      wallSecs: Number(wall),
      workSecs: Number(sum),
      loadStart: load0,
      loadEnd: loadLine(),
    }, { costKey: setKey, loadLimit: LOAD_LIMIT });
    for (const line of res.lines) console.log(line);
    if (res.fail) failed++;
  } catch (e) {
    console.log(`cost: baseline unreadable (${e.message}) - comparison skipped.`);
  }
}

if (failed || skipped) {
  console.log('Nothing was deployed by this command. Fix the FAILs above; the SKIPs are steps that');
  console.log('would have measured an artifact their failed step never produced.');
  process.exit(1);
}
