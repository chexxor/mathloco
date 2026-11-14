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
  { name: 'check:design', desc: 'every design path a doc or script cites resolves' },
  // The roadmap is one file (.notes/PLAN.md, host-local) and MILESTONES.md is its tracked projection. Two
  // files claiming "what is next" drift, and the drift is invisible in a table cell (S015). Reads prose, so
  // it runs before build; the selftest plants each defect class and requires a named failure.
  { name: 'check:plan', desc: 'the plan, its tracked projection and NEXT.md agree; every milestone has an exit gate' },
  { name: 'check:plan:selftest', desc: 'the plan gate can still fail (19 plantings, incl. the CI clone case)' },
  { name: 'check:decisions', desc: 'the tracked decision index matches the log, and no D-id citation dangles' },
  { name: 'check:figures', desc: 'a measured number in DESIGN.md carries a date, and that date is not stale' },
  // Tracked prose is a contract, and a markdown table row with the wrong cell count still renders: the extra or
  // missing cell becomes an unnamed column at the right edge. `MILESTONES.md` carried one such row (A2, three
  // cells under a four-column header) and one in the parked table, both introduced by hand-resolved merges,
  // and both invisible in a diff @measured 2026-11-08.
  { name: 'check:tables', desc: 'every markdown table row in the tracked prose has its header\'s cell count' },
  { name: 'check:tables:selftest', desc: 'the table gate can still fail (3 plantings: an extra cell, a missing cell, a short header; 4 clean forms)' },
  { name: 'check:social', desc: 'the committed share card against its painted report' },
  { name: 'check:social:selftest', desc: 'the card checks can still fail' },
  { name: 'db:check', desc: 'schema and migrations agree, no database opened' },
  { name: 'check:sanitize', desc: 'summary rendering stays text-only' },
  // The descriptor is one phrase in three files (`const locator`, `seo.title`, the page `<Layout title>`), and the
  // tree sat 2-of-3 for a day with every gate green. Reads source, so it runs before `build` (D118's rule).
  { name: 'check:copy', desc: 'the club descriptor: three slots, one phrase, no superseded form, no date' },
  { name: 'check:copy:selftest', desc: 'the copy gate can still fail (9 plantings, each into a fixture copy)' },
  // `check:ics` reads `dist/client/events.ics` (scripts/check-ics.mjs:31-32), so it belongs in the artifact
  // wave. It was scheduled before `build` @measured 2026-11-12: a fresh clone - CI, or anyone's first checkout -
  // has no dist/, and the gate reported "FAIL artifact: ... is missing - build first" while every other step
  // in the wave passed. The selftest plants in-memory clones of the committed snapshot, so it needs nothing.
  { name: 'check:ics', desc: 'the published calendar: RFC 5545 traps, UID stability, and the built /events.ics bytes', needs: ['build'] },
  { name: 'check:ics:selftest', desc: 'the calendar gate can still fail (21 plantings)' },
  // The sign-up link map: both event snapshots' dates and ages, and a dated stamp on every URL the config prints.
  // Reads committed JSON only, so it runs before `build` (D118). `check:rsvp:links` — the probe that produces
  // the stamps — is NOT here: it reaches the network, the same exclusion class as check:discord and check:ai.
  { name: 'check:rsvp', desc: 'the Meetup snapshot and the Discord guild snapshot are both dated and inside the window, and every printed platform URL carries a stamp under 60 days that answered 2xx/3xx' },
  { name: 'check:rsvp:selftest', desc: 'the link-map gate can still fail (50 cases: snapshot, config and resolver plantings)' },
  // The page gate's own defect catalog runs on in-memory fixture pages, not on dist/, so it can fire on a
  // branch nobody has built yet (D118). 43 cases = 42 plantings plus one clean control page: missing cluster,
  // wrong date, invented hour, an unsettled hour painted as settled, missing note, a note claiming an absence
  // the resolver disproves, wrong order, dead rel, closed-platform link, a dropped guild event page, a completed
  // guild event painted as a sign-up path, an event page swapped for the bare invite, stale Meetup and Discord
  // stamps, an age painted 3.7 days off a correct stamp, and headcounts painted in text (12 going, the roster
  // tally "280 on the Meetup list", "142 members", "14 RSVPs") and in attributes (D276).
  { name: 'check:rsvp-page:selftest', desc: 'the page gate can still fail (42 plantings each named, plus a clean control that must pass)' },
  // The platform sprite (S026, D294) is claimed once per page render by the cluster that paints a mark. Keyed
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
  { name: 'check:join:selftest', desc: 'the join gate can still fail (12 plantings plus 2 parser assertions, each named, with a clean control)' },
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
  { name: 'check:escapes:selftest', desc: 'the escape gate can still fail (25 fixtures: 13 plantings, 11 clean forms, 1 severity case)' },
  { name: 'check:cache', desc: 'summary-cache rules against a fake KV namespace' },
  // The n8n integration builds an importable artifact from sources in this repo, and its rules are the same
  // date rules `data/events.json` is harvested against. It runs `--offline`: no route to the LAN instance is
  // assumed (that is what the live form of the same command is for), and it costs 1.4s @measured 2026-11-05.
  { name: 'check:cadence', desc: 'the Mobilizon cadence workflow: generators, invariants, 71 tests, the import checker' },
  // `data/events.json` is written by one tool, and its four rules (never un-cancel a published CANCELLED UID,
  // reuse a venue split only on a byte-identical raw string, a TZID on both ends declares the hour, never delete
  // a row that dropped out of the feed) are invisible in a diff. 15 offline fixtures, no network, no live feed
  // touched @measured 2026-11-13 by this step: 0.45s. Planting each rule in a copy of the harvester names the
  // failure (D290's reasoning, applied to a tool rather than a gate).
  { name: 'harvest:selftest', desc: "the calendar harvester's four rules, proven on 15 offline fixtures (cancelled-UID guard, venue-split reuse, TZID hour confirmation, rows never deleted)" },
  // Which dates `/schedule` is allowed to print, checked against the rule module rather than a copy of it. Runs
  // before `build` because it opens no artifact (D118 again: a gate that can go red before anyone builds is a
  // gate that catches the defect on the branch that introduced it).
  { name: 'check:schedule-window:selftest', desc: 'the schedule-window gate can still fail (17 cases: 9 rule, 8 page plantings)' },
  { name: 'audit:gate', desc: 'prod-only npm audit against an explicit allowlist' },
  { name: 'build', desc: 'astro build -> dist/' },
  // dist/ exists only after `build`, and both of these read the artifact rather than the source.
  { name: 'check:deploy', desc: 'the built artifact is deployable on the apex', needs: ['build'] },
  // One host, asserted in four places (astro.config `site`, config.json `seo.canonical`, the shipped
  // robots.txt Sitemap line, every canonical/og/twitter tag). A stale host in a shipped artifact is a
  // rebrand defect no other gate sees (D261): robots.txt named the apex being retired while the sitemap
  // itself was correct.
  { name: 'check:site-host', desc: 'the artifact names one host about itself: robots, sitemap locs, canonical, og, twitter', needs: ['build'] },
  { name: 'check:content', desc: 'no placeholder, no unsourced claim, no fabricated number ships', needs: ['build'] },
  { name: 'check:content:selftest', desc: 'the content gate can still fail', needs: ['build'] },
  // What shipped on /schedule: `club\u2019s` painted literally, at every width, through a green `verify`.
  // This reads the bytes a reader sees (page text, `<meta>`, and the attributes a screen reader speaks) plus
  // the rendered-text context of every `.astro`/`.svelte` source, because the same bytes are correct inside a
  // string literal. `dist/client/events.ics` is out of scope by design - RFC 5545 escapes with backslashes.
  { name: 'check:escapes', desc: 'no escape sequence reaches a reader: built text and meta, and template text at the source', needs: ['build'] },
  // The page half of the same rule: `data-date` handles off the built page against `scheduleWindow()`'s plan,
  // plus the requirement that a page hiding dates says so and offers `/events.ics` (D238).
  { name: 'check:schedule-window', desc: '/schedule prints exactly the windowed dates the rule module lists, in order, and names what it left out', needs: ['build'] },
  // The other end of the RSVP rule: `check:rsvp` proves the inputs, this proves the bytes. Recomputes each
  // cluster from `signUpPaths()` and fails a painted page that disagrees with the resolver (D272).
  { name: 'check:rsvp-page', desc: 'every printed date carries one sign-up cluster, and that cluster matches what signUpPaths() returns for it against both event snapshots; no headcount is painted', needs: ['build'] },
  // The page half of the join rule (S033, D303): every channel the resolver lists is painted on /join, in
  // canonical order, under a heading for its kind, at a URL its platform can have, with a stamp under 60 days;
  // nothing is painted that the resolver does not have. It reads `dist/`, so it waits for `build` (D118).
  { name: 'check:join', desc: 'every way in on /join is a channel joinChannels() returns, in canonical order under its kind, at a stamped URL; no invented channel, no empty kind heading, no blind link past 60 days', needs: ['build'] },
  // The artifact side of the promise gate: it opens the built pages, so it waits for `build` (D118).
  { name: "check:rsvp-promise", desc: "the platforms MS12's row promises are exactly the platforms the config declares and the built pages paint, in the plan and in the tracked projection alike", needs: ['build'] },
  // Report-only, not a correctness gate (D253): Tailwind v4 scans every tracked file, so a class name
  // written in design prose lands in the stylesheet every visitor downloads. The number is the budget;
  // the baseline makes a new round's invented class names visible the day they are written.
  { name: 'check:css-utilities', desc: 'utilities in the shipped CSS that no file in src/ writes', needs: ['build'] },
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
  // (Linux, native): check:mark alone is 10s; in a wave beside check:space and check:social:live it took
  // 152s and came back `exit 1 / firefox rc=?` (a timeout, twice in a row), while check:render:dist reports
  // nine internal measurements it already runs JOBS-at-a-time by itself. Two browser pools in one wave buys
  // nothing here — the browser steps are almost all downstream of check:render:dist anyway — and it buys a
  // flake, which is the one thing a gate may not buy.
  { name: 'check:render:dist', desc: 'control geometry, contrast, bands, keylines, nav fit, the mark, the sign-up cluster', alone: true },
  { name: 'check:mark', desc: 'the mark probe at 320 and 1240: painted ink and meaning', needs: ['check:render:dist'], alone: true },
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
  // read-only probes, a mark or space probe could measure a planted page and report a finding that never
  // happened — a race that reads as a flaky browser gate. (It must not rebuild either: check:render would
  // build over its own fixtures and selftest nothing.)
  { name: 'check:render:selftest', desc: 'twenty-four mutations, each of which check:render must FAIL (last: it mutates dist)', needs: ['check:render:dist', 'check:mark', 'check:social:live', 'check:space', 'check:ground'] },
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
