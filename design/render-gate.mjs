#!/usr/bin/env node
// render-gate.mjs — do the ratified tokens survive contact with a real browser?
//
//   node design/render-gate.mjs            # every route dist/client emits, at 1240, 640, 390, 320
//   node design/render-gate.mjs /chat      # one page
//   node design/render-gate.mjs --no-build # measure the dist that is already there (see below)
//   RENDER_JOBS=1 node design/render-gate.mjs   # serialize the firefox runs (default 4 at once)
//   RENDER_ATTEMPTS=1 ...                        # no retry on a firefox that posted nothing (default 2)
//
// This measures dist/client, not src — so by default it builds first (3.8 s) rather than let a green
// result stand for a page nobody rebuilt. `--no-build` skips that step when dist is already current,
// which is the case immediately after `npm run verify` (its last step is a build) and the case in
// `render-gate-selftest.mjs`, where a rebuild would wipe the mutation being tested. Measured here
// (16 CPU rig, Firefox 158.0.1, Linux): one page at one width 0.89 s; the 3 x 3 matrix serialized 8.0 s,
// with --no-build off 11.4 s total; the five-mutation selftest 4.6 s. So the browser gates are not
// expensive — what is expensive is a cold `astro build` on every repeat of the ritual.
//
// The scanner (npm run check:classes) proves a class NAME exists in markup and resolves through
// Tailwind. It cannot prove what that class BECAME. This gate measures the built page in Firefox and
// enforces the numeric claims DESIGN.md makes:
//
//   - a control's HEIGHT comes from the role it declares in its own markup (`data-control="primary|secondary"`,
//     D140). Both roles are **48px** and differ by FILL (D139): a 16px label line box + `py-4` 16/16. Having one
//     height to assert is also what stops a keylined control arriving at 42 by border arithmetic — the ratified
//     keyline is a 1px INSET ring, so padding decides the box and the box is 48. A control-shaped element that
//     declares no role is a finding.
//   - the contrast the oracle promised is the contrast that painted, on the page a visitor gets
//   - one dark band per screen (a footer + a dark CTA is two bands, which is what the old book-theme
//     ribbon produced), and that band must contain paths a visitor can press (D115)
//   - no keyline drawn as a border/outline (the ratified keyline is a 1px INSET ring, measured 3.01
//     against paper in this harness — the same number the specimen records; a border costs 2px, which
//     is how a 40px control arrives at 42)
//   - notices and states: every role=status/alert block has no fill, a 1px inset ring at the ratified
//     rule contrast, text at or above the 4.5 bar, and a height that clears D98's 48px one-line figure
//   - the nav: one row at every width, flex-wrap: nowrap, one type tier per viewport, and the row must
//     FIT the container's content box (D100's needed-vs-available probe, run on the built artifact).
//     The tier boundary, if there is one, is read from --breakpoint-nav-narrow so this gate cannot
//     drift from the CSS; that token is currently retired (D117), so the nav holds one tier everywhere.
//   - one display step per screen
//   - no horizontal overflow at any measured width, and tap targets that clear 44px at 390
//
// Default widths are 1240, 390 and 320 — the floor, and the two widths the design was grilled at.
//
// Contrast is measured on PAINTED BYTES (D116): the harness paints each computed colour into a 1px
// canvas and reads the byte back, because a screen is 8-bit and hand-written OKLab arithmetic read every
// pair 0.1-0.3 low (path-discord-on-ink read 4.47 against a true 4.59, which would have failed a token
// that passes). If a contrast number here ever disagrees with the oracle's record again, the harness is
// wrong, not the token.
//
// Each run also reports whether the webfonts had loaded. A serif line box measured while PT Serif is
// still loading is a fallback metric, so this shows up as a warning rather than a pass.
import { execFileSync, execFile } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { MARK, MARK_SHAPE_COUNT } from '../src/lib/brand-mark.mjs';
import { BARS } from './grill/okcolor.mjs';
import { emittedRoutes } from './emitted-routes.mjs';

// The site's FLOOR is 320px (D114, operator ruling 2026-11-02): the nav's narrow tier needs 273px and
// a 320 viewport's container offers 276 (288 on a page short enough not to scroll). Below 320 the
// grammar does not fit — at 310 the container offers 266 and at 300 it offers 256, and at 300 the hero
// primary also wraps to 64px. That is declared, not discovered: the alternative measured 254 (the mark
// down a tier), which fits 256 by 2px, and D100 keeps the mark at 16px serif at every width because the
// face is what carries the club's name. 300/310 are still worth looking at, so ask for them:
//   RENDER_WIDTHS=1240,390,375,360,320,310,300 node design/render-gate.mjs /
// They report the overflow instead of hiding it, and the gate refuses to run a default set that has
// quietly dropped the floor.
const FLOOR = 320;
// 640 is in the default set because it is the only breakpoint that can fire inside the phone band: `src/`
// uses Tailwind `sm:` (640) 22 times, `md:` (768) 16 and `lg:` (1024) 16, and until 2026-11-03 the matrix
// jumped 320 -> 390 -> 1240, crossing none of them. A phone in landscape is 640-932 CSS px, so `sm:` is a
// narrow-viewport event, not a tablet one. 768/1024 stay out: they are not narrow, and each width costs a
// firefox per route. The boundary is reported, not remembered - see the breakpoint note the gate prints.
const widths = (process.env.RENDER_WIDTHS || "1240,640,390,320").split(",").map(Number);
const argv = process.argv.slice(2);
const NO_BUILD = argv.includes('--no-build');
// Three firefoxes, not four. Measured 2026-11-04 (Linux, native): at JOBS=4 the @390 cell - the tallest page on the
// site, 5176px with four raster images - failed to post twice in a row and the gate exited 1, while the same command
// on its own passed. Under `verify:browser` this is the flake that would make CI red on a green page, so the pool is
// one firefox smaller and the retry one longer: wall cost measured in design/gate-cost.json.
const JOBS = Math.max(1, Number(process.env.RENDER_JOBS || 3));
const pages = argv.filter((a) => a.startsWith('/'));
const dist = resolve('dist/client');
// Which routes the gate measures is read off the artifact, not remembered here — see
// `design/emitted-routes.mjs` for why the literal `['/', '/404', '/chat']` had to go. An explicit `/route`
// argument still wins, because probing one page is the normal way to debug one page. The list is built
// BELOW the build step, not here: a page added by this very commit is not in `dist` until the build the
// gate itself runs has emitted it, and a route list captured before the build is the same forgetting the
// literal used to do.
let routes;
// the tier boundary is read out of the token block, not remembered: a moved --breakpoint-nav-narrow
// moves this gate with it instead of quietly disagreeing with the CSS
// The tier boundary is READ from the token block, never remembered, so this gate cannot drift from the
// CSS. It is now optional: the token was retired in D117 (the nav's two dead-path labels went, and the
// wide tier fits everywhere), and the gate honours either shape — one tier at every width, or a ratified
// --breakpoint-nav-narrow with a tier each side of it. The one shape it will not accept is an ad-hoc
// `min-[412px]:` bracket, because a bracket writes nothing that any gate reads.
const THEMED = readFileSync('src/styles/global.css', 'utf8');

// Breakpoints get REPORTED, not remembered. Tailwind's defaults are rem-based (sm = 40rem), so a moved root
// font size moves them; a `--breakpoint-x` in the token block adds one. Either way the gate says which tiers
// `src/` actually uses and which of them the width matrix measures, because a flip with no measured width is
// a layout nobody has looked at — that is exactly how 640 stayed unmeasured while `sm:` fired 22 times.
const BP = { sm: 640, md: 768, lg: 1024, xl: 1280 };
for (const m of THEMED.matchAll(/--breakpoint-([a-z-]+):\s*([0-9.]+)rem/g)) BP[m[1]] = Math.round(Number(m[2]) * 16);
const walkSrc = (d, out = []) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  const p = `${d}/${e.name}`;
  if (e.isDirectory()) walkSrc(p, out); else if (/\.(astro|svelte|css|ts|js)$/.test(e.name)) out.push(p);
} return out; };
const usedBP = {};
for (const f of walkSrc('src')) for (const m of readFileSync(f, 'utf8').matchAll(/(?:[\s"'`({])(sm|md|lg|xl):[a-zA-Z0-9_\-\[\]#.]/g)) usedBP[m[1]] = (usedBP[m[1]] || 0) + 1;
const bpList = Object.entries(usedBP).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}(${BP[k] ?? '?'})x${n}`);
const unmeasuredBP = Object.keys(usedBP).filter((k) => BP[k] && !widths.includes(BP[k])).map((k) => `${k}(${BP[k]})`);
console.log(`breakpoints in use: ${bpList.join(' ') || 'none'} | widths measured: ${widths.join(', ')} | ${unmeasuredBP.length ? `FLIP WITH NO MEASURED WIDTH: ${unmeasuredBP.join(' ')}` : 'every used breakpoint is measured'}`);
const navTier = THEMED.match(/--breakpoint-nav-narrow:\s*(\d+)px/);
const NAV_NARROW = navTier ? Number(navTier[1]) : null;
// The ramp, read out of the block instead of remembered. Round 8 (2026-11-02) raised body 16 -> 17.6 and
// heading 27.7 -> 30.4, and a gate that remembered "fs >= 30px counts as a display step" then reported every
// section h2 as a display step: 9 FAILs on a branch that had just done what the operator asked. A px
// threshold is only a fact for as long as it is read from the thing it describes.
const textTok = (name) => { const m = THEMED.match(new RegExp(`--text-${name}:\\s*([\\d.]+)px`)); return m ? Number(m[1]) : null; };
const LABEL = textTok('label');
const DISPLAY_FLOOR = textTok('display-1');
if (DISPLAY_FLOOR === null) { console.error('--text-display-1 is not in the token block — the gate cannot tell a display step from a heading, and guessing a px threshold is what just broke'); process.exit(1); }
if (LABEL === null) { console.error('--text-label is not in the token block — the nav tier cannot be checked'); process.exit(1); }
if (process.env.RENDER_WIDTHS) {
  if (!widths.includes(FLOOR)) console.log(`NOTE  RENDER_WIDTHS overrides the default set and omits ${FLOOR} — the declared floor. The shipped gate must measure it.`);
} else if (!widths.includes(FLOOR)) {
  console.error(`the default width set no longer contains ${FLOOR} — the floor is a ratified claim (D114), so it has to stay gated`);
  process.exit(1);
}
if (!existsSync(dist)) { console.error('dist/client missing — run npm run build first'); process.exit(1); }
if (!NO_BUILD) {
  // the same script CI runs, so the gate cannot measure a build the pipeline would not make. npm is
  // npm.cmd on Windows, and this rig runs natively on both (D131).
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });
} else {
  console.log('(measuring the dist that is already built — --no-build)');
  // --no-build is the fast path, and its whole risk is measuring a build this tree did not make — the case
  // that cost 4 phantom keyline FAILs on a branch switch (design/dist-fresh.mjs, D156).
  // Imported here, not at the top: only the `--no-build` path needs it, and this file's import list is a spot
  // two branches edit at once (it is the one conflict the pending branches had), so the check lives beside the
  // line that runs it. Same pattern as line-length.mjs below.
  const { distState, staleLine } = await import('./dist-fresh.mjs');
  const STALE = distState();
  if (!STALE.fresh && !STALE.allowed) { console.error(`check:render: ${staleLine(STALE)}`); process.exit(1); }
}
mkdirSync('.design/render', { recursive: true });

routes = pages.length ? pages : emittedRoutes(dist);
if (!routes.length) { console.error(`no .html under ${dist} — the build emitted nothing to measure`); process.exit(1); }
console.log(`routes ${routes.join(' ')}`);

const fails = [];
const warns = [];
const num = (v) => (typeof v === 'number' ? v : NaN);

// The height each declared control role must measure, +/-1px. D139 (2026-11-03): primary and secondary are ONE
// height and differ by FILL, because the pair of rules that used to live in the control loop demanded 40px and
// >=44px of the same element and could not both be satisfied. The 40px step is a box height now.
const CONTROL_ROLES = { primary: 48, secondary: 48 };

// The nine measurements are independent, and each one is a cold firefox: 0.89 s of its own, ~8 s back to
// back. They run JOBS at a time, and only the *measurement* is parallel — the assertions below still run
// one route and width at a time, in a fixed order, so the report and the failure list stay diffable.
// page-measure binds port 0 and dist-measure names each probe copy per width, so runs cannot collide.
const run = (route, width) => new Promise((done) => {
  const height = width === 390 ? 844 : 1400;
  execFile(process.execPath,
    ['design/grill/dist-measure.mjs', dist, route, 'design/grill/render-measure.js', String(width), String(height)],
    { encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 },
    (err, out, stderr) => done({ route, width, out, err, stderr }));
});

// A firefox that posts nothing is this harness's known flake (fresh profile, cold start, the page never
// calling __send()). One in nine showed up while timing this. A gate that flakes is a gate people learn
// to re-run instead of trust, so a cell gets a second attempt; two failures in a row is a real FAIL and
// the report says which it was.
const ATTEMPTS = Number(process.env.RENDER_ATTEMPTS || 2);
async function measureCell(route, width) {
  let last = null;
  for (let n = 1; n <= ATTEMPTS; n++) {
    const r = await run(route, width);
    const json = r.out ? r.out.slice(r.out.indexOf('{'), r.out.lastIndexOf('}') + 1) : '';
    if (json) {
      try { return { j: JSON.parse(json), tries: n }; }
      catch (e) { last = { err: e, stderr: r.stderr }; }
    } else {
      last = { err: r.err || new Error('no JSON from firefox'), stderr: r.stderr };
    }
    if (n < ATTEMPTS) console.error(`  retry ${route} @${width} — ${last.err && last.err.message ? String(last.err.message).slice(0, 60) : 'no report posted'}`);
  }
  // The probe's own error lines, not just the last two things it printed. `page-measure.mjs` says most
  // loudly when the thing it cannot do is a page problem ("Unsupported element for pixel sampling",
  // "font wait: ... never reached status loaded"), and those lines sit ABOVE the "probing rendered-..."
  // chatter, which is what `slice(-2)` used to report \u2014 so a red cell could not be told from the @390 flake
  // (line 77) without re-running the whole matrix by hand.
  const said = (last.stderr || '').split('\n').filter(Boolean);
  const tail = [...new Set(said.filter((l) => /error|sample|font wait|never reached|SyntaxError/i.test(l)).slice(-3).concat(said.slice(-2)))].join(' | ');
  return { err: new Error(`${last.err && last.err.message ? last.err.message : 'no report'}${tail ? ' :: ' + tail.slice(0, 160) : ''}`) };
}

async function pool(jobs, items, work) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await work(items[k]);
    }
  }));
  return out;
}

const cells = routes.flatMap((route) => widths.map((w) => [route, w]));
const got = new Map();
const record = (r) => {
  const at = `${r.route} @${r.width}`;
  if (r.err) { got.set(at, { err: r.err }); return; }
  writeFileSync(`.design/render/${r.route.replace(/\//g, '_') || 'root'}-${r.width}.json`, JSON.stringify(r.j, null, 1));
  got.set(at, { j: r.j });
};
const raw = await pool(Math.min(JOBS, cells.length), cells, ([route, w]) => measureCell(route, w).then((r) => ({ route, width: w, ...r })));
for (const r of raw) record(r);

// A cell that could not post **with three firefoxes running** is re-measured **alone**, after the pool has
// drained. The mechanism, measured 2026-11-07 (Linux, Firefox 158.0.1): `/ @390` failed all 3 in-pool
// attempts in one run and passed 3 of 3 the same command run on its own, minutes later, on the same bytes.
// Retries inside the pool cannot fix that, because a retry under the same load is the same race \u2014 which is why
// ATTEMPTS went from 3 to 2 in-pool and this uncontended pass exists: same total attempts, and the last one
// runs against nothing but the page.
const flaked = raw.filter((r) => r.err);
if (flaked.length) {
  console.error(`  ${flaked.length} cell(s) failed inside the ${JOBS}-firefox pool \u2014 re-measuring ${flaked.map((r) => `${r.route} @${r.width}`).join(', ')} alone`);
  const again = await pool(1, flaked.map((r) => [r.route, r.width]), ([route, w]) => measureCell(route, w).then((r) => ({ route, width: w, ...r })));
  for (const r of again) record(r);
}

for (const route of routes) {
  for (const w of widths) {
    const cell = got.get(`${route} @${w}`);
    if (!cell || cell.err) { fails.push(`${route} @${w}: measurement failed — ${String(cell && cell.err ? cell.err.message : 'no run recorded').slice(0, 220)}`); continue; }
    const j = cell.j;
    const at = `${route} @${w}`;
    console.log(`\n=== ${at} (viewport ${j.vw}) ===`);

    if (j.overflowX) fails.push(`${at}: horizontal overflow by ${j.overflowX}px`);

    // 1. control height grammar. The role is DECLARED by the markup (D140), not inferred from a class
    // substring: measured at 390, the old substring rules applied to 7 controls and were blind to 3 — every
    // one a 40px tap target on the join path — because the probe truncates `cls` and `inset-shadow-rule`
    // fell off the end (design/records/0016-*). A class is whatever the layout is called this week.
    for (const c of j.controls) {
      const cls = c.cls || '';
      const shaped = /\bbg-ink\b(?!-2)|inset-shadow-rule/.test(cls);   // it is painted like a button
      if (c.role) {
        const want = CONTROL_ROLES[c.role];
        if (want === undefined) {
          fails.push(`${at}: control "${c.t}" declares data-control="${c.role}" and the gate has no height for that role — add it to CONTROL_ROLES or fix the name`);
        } else if (num(c.h) < want - 1 || num(c.h) > want + 1) {
          fails.push(`${at}: ${c.role} control "${c.t}" is ${c.h}px tall, not ${want} (${cls.slice(0, 48)})`);
        }
        if (w === 390 && num(c.h) < 44) fails.push(`${at}: tap target "${c.t}" is ${c.h}px tall, under 44`);
      } else if (shaped) {
        fails.push(`${at}: control-shaped element "${c.t}" declares no data-control role — the height rules match the name the source publishes (D140): ${cls.slice(0, 60)}`);
      }
      if (c.contrast !== null && c.contrast < 4.5) fails.push(`${at}: control "${c.t}" contrast ${c.contrast} < 4.5 (${c.fg} on ${c.bg})`);
    }

    // 2. text contrast, on the page rather than in a specimen
    for (const t of j.text) {
      const fs = parseFloat(t.fs);
      const bar = fs >= 24 ? 3.0 : 4.5;
      if (t.contrast !== null && t.contrast < bar) fails.push(`${at}: ${t.tag} "${t.t}" at ${t.fs} is ${t.contrast} on its ground (bar ${bar})`);
      // 2b. a text node that *begins* like source-comment syntax is a leaked comment, not copy (D181). Measured
      // 2026-11-04: a `//` comment written between JSX children inside `{items.map()}` in `Schedule.astro` is not a
      // comment to the template compiler — it is text, and three lines of agent prose shipped in every event card,
      // where a screen reader reads them aloud. Astro strips `//` in the template body and inside JS expressions;
      // the position that ships it is JSX children, which is exactly where a note next to a tag wants to go.
      if (/^\s*(\/\/|\/\*|\*\/)/.test(String(t.t ?? ''))) {
        fails.push(`${at}: ${t.tag} text begins like source-comment syntax — "${String(t.t).slice(0, 72)}" is visible prose to a visitor, not a comment (D181: in JSX-children position a double-slash is text)`);
      }
    }

    // 3. one dark band per screen — and the band has to be an EXIT, not a poster. A band with no link
    //    in it is what the old footer was: a slogan with a pulsing glyph and nowhere to go (D115).
    if (j.bands.length > 1) fails.push(`${at}: ${j.bands.length} dark bands (want 1): ${j.bands.map((b) => b.tag + ':' + b.cls.slice(0, 28)).join(' | ')}`);
    for (const b of j.bands) {
      const links = b.links || [];
      if (!links.length) fails.push(`${at}: the dark band (${b.tag}) paints no path out — the band is the site's exit, it must offer the paths (D115)`);
      for (const l of links) {
        if (l.contrast !== null && l.contrast < 4.5) fails.push(`${at}: band link ${JSON.stringify(l.t)} is ${l.contrast} on the band (bar 4.5) — ${l.color}`);
        if (l.h < 24) fails.push(`${at}: band link ${JSON.stringify(l.t)} is ${l.h}px tall — 24px is the floor for a target a pointer must hit`);
      }
    }

    // 4. keylines: a painted border / outline / decoration line darker than a hairline. The ratified
    //    keyline is `inset-shadow-rule` — a 1px inset ring, measured 3.01 against paper in this same
    //    harness, which is the number the specimen records — and it costs no height. A BORDER at the
    //    same hue measures
    //    the same contrast and costs 2px, which is how a 40px control arrives at 42. So the bar here
    //    is about the grammar, not the hue: D105's 1.35 layer bar is for shadows.
    for (const k of j.keylines) {
      if (k.w >= 1 && k.keylineContrast !== null && k.keylineContrast > 1.4) {
        fails.push(`${at}: painted keyline ${k.w}px (contrast ${k.keylineContrast} on its ground) is a border/outline, not the 1px inset ring — ${k.cls.slice(0, 60)}`);
      }
    }

    // 4a. inset rings (D149-3c, record 0018). The rule above cannot see the system's own hairline at all:
    //     the ratified keyline is a 1px INSET box-shadow, not a border, so `keylines` reports nothing for it.
    //     A ring is drawn on a boundary and therefore has two neighbours - the fill inside it and the ground
    //     it stands on - and the operator's ruling is that a keyline may not straddle two grounds. That is a
    //     measurement, not a preference: `--color-rule` is 3.01 on paper, 2.88 on `panel` (under this same
    //     graphic bar) and 4.00 on the ink band, so a ring that has a tint on one side is under bar on that
    //     side even when the number printed beside it looks legal.
    for (const g of j.rings || []) {
      if (g.inside === null || g.outside === null || g.inset !== 1) continue;
      const who = `${g.tag} ${JSON.stringify(g.cls.slice(0, 60))}`;
      const pair = `ring (${g.isRule ? '--color-rule' : g.raw}) measures ${g.inside} inside / ${g.outside} outside`;
      if (Math.abs(g.inside - g.outside) > 0.05) {
        fails.push(`${at}: ${pair} against two different grounds (${JSON.stringify(g.innerBytes)} vs ${JSON.stringify(g.outerBytes)}) — a keyline may not straddle two grounds (D149-3c, record 0018): move the box onto one ground — ${who}`);
      } else if (Math.min(g.inside, g.outside) < BARS.graphic) {
        fails.push(`${at}: ${pair} — under the ${BARS.graphic.toFixed(1)} graphic bar on its own ground. --color-rule is solved for paper (3.01); on a tint it reads 2.88 (record 0018) — ${who}`);
      }
    }

    // 4b. notices and states (DESIGN.md "Notices" + "States"): word + inset hairline on the page's own
    //     ground, NO fill, one-line 48px (D98), text at or above the contrast bar.
    for (const n of j.notices || []) {
      if (n.fill) fails.push(`${at}: ${n.role} block paints a fill (${n.fill}) — a notice is word + keyline, never a fill (D102)`);
      if (n.inset !== 1) fails.push(`${at}: ${n.role} block keyline is ${n.inset}px, want the 1px inset ring (inset-shadow-rule)`);
      if (n.keylineContrast !== null && Math.abs(n.keylineContrast - 3.01) > 0.2) {
        fails.push(`${at}: ${n.role} keyline contrast ${n.keylineContrast} is not the ratified rule (measured 3.01 on paper, 4.00 on the band)`);
      }
      if (n.textContrast !== null && n.textContrast < 4.5) fails.push(`${at}: ${n.role} text at contrast ${n.textContrast} is under the 4.5 bar`);
      if (n.h < 48) fails.push(`${at}: ${n.role} block is ${n.h}px tall — D98 puts a one-line notice at 48px`);
      // **A notice is one boundary** (operator ruling, 2026-11-03, on the Discord island: `Try again` and
      // `Read Discord` were keylined, filled boxes sitting inside the notice's own keyline — two boxes, one
      // of them drawn twice). Inside a notice an action is an inline link or a quiet label: no fill, no
      // second ring, no declared control role. Height rules for block controls live in rule 1; this rule is
      // about how many edges one component is allowed to have.
      for (const a of n.actions || []) {
        const why = [a.fill && `fill ${a.fill}`, a.ring && 'its own inset ring', a.role && `data-control="${a.role}"`].filter(Boolean).join(', ');
        fails.push(`${at}: ${n.role} notice contains a block action "${a.t}" (${why}) — a notice is one boundary; inside it an action is an inline link or a quiet label (DESIGN.md, Notices)`);
      }
    }

    // 4c. the sign-up cluster (S019, D272): DESIGN.md's quiet label under every printed date. It is NOT a
    //     control (D140) — the row it sits in is already one boundary (D220), so a fill or a ring drawn
    //     inside that row is the same two-box defect rule 4b prices for notices. Its box is 32px because it
    //     reserves `min-h-8`, the same label box D100 accepted for the nav; its tier is read from the token
    //     block, never remembered, so a ramp move moves this check with it (the D112 lesson).
    //     The mark every label carries (S026, D294, operator ruling F3(b)) is checked four ways, because a
    //     `<use>` pointing at a symbol the sprite does not have is invisible to every class scanner: the box
    //     is there, the glyph is not.
    for (const c of j.clusters || []) {
      const who = `${at} sign-up cluster on ${c.date}`;
      if (c.fill) fails.push(`${who} paints a fill (${c.fill}) — a quiet label is word + underline on the page's own ground, never a fill (D272)`);
      if (c.ring) fails.push(`${who} carries its own inset ring — the row is already one boundary, so this draws a second box inside it (D149-3c, D220)`);
      if (c.border) fails.push(`${who} is bordered ${c.border}px — the ratified keyline is a 1px inset ring and a cluster has no keyline at all (D272)`);
      if (c.control) fails.push(`${who} declares data-control="${c.control}" — a sign-up cluster is a quiet label, not a control (D140, D272)`);
      if (!c.links.length) fails.push(`${who} prints no sign-up link and no note — an absent Meetup page is a named state, never a blank (DESIGN.md "States", D272)`);
      if (c.noteContrast !== null && c.noteContrast < 4.5) fails.push(`${who} note reads ${c.noteContrast} on its ground, under the 4.5 bar (D101)`);
      for (const l of c.links) {
        if (l.h < 31) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} (${l.platform}, ${c.date}) is ${l.h}px tall — the quiet label reserves min-h-8 = 32px, the box D100 accepted for a label target`);
        if (parseFloat(l.fs) !== LABEL) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} renders ${l.fs} at ${w}px, want the label tier ${LABEL} — the tier is read from the token block, not remembered (D112)`);
        if (l.fill) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} paints a fill (${l.fill}) inside a row that is already one boundary (D220, D272)`);
        if (l.ring) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} carries its own inset ring (D149-3c)`);
        if (l.role) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} declares data-control="${l.role}" — the 48px control height rule does not belong to a quiet label (D140, D272)`);
        if (!l.mark) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} (${l.platform}, ${c.date}) paints no platform mark — F3(b) rules one 16px mark before every label (S026, D294)`);
        else {
          if (Math.abs(l.mark.w - 16) > 0.5 || Math.abs(l.mark.h - 16) > 0.5) {
            fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} mark is ${l.mark.w}x${l.mark.h}px, want the 16px mark F3(b) ruled (w-4 h-4, 16px — the same box D100 keeps the nav mark at)`);
          }
          if (!l.mark.id) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} mark has no <use href> — an empty svg is decoration, not a platform mark (D294)`);
          else if (l.mark.id !== `pm-${(l.platform || '').toLowerCase()}`) {
            fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} is ${l.platform} but its mark points at #${l.mark.id} — the glyph must name the platform it is attached to (D294)`);
          }
          if (!l.mark.symbol) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} mark points at #${l.mark.id} and the page's sprite has no such symbol — the glyph paints nothing (D118: geometry in the table is not geometry in the DOM)`);
          if (l.mark.glyph < 8) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} mark paints a glyph ${l.mark.glyph}px inside a 16px box — an empty square is not a mark (D294)`);
          if (l.mark.paint && l.colorBytes && (l.mark.paint.r !== l.colorBytes.r || l.mark.paint.g !== l.colorBytes.g || l.mark.paint.b !== l.colorBytes.b)) {
            fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} mark painted rgb(${l.mark.paint.r},${l.mark.paint.g},${l.mark.paint.b}) while its label is rgb(${l.colorBytes.r},${l.colorBytes.g},${l.colorBytes.b}) — a mark is drawn in currentColor, so it follows the label's gold on hover and never introduces a colour the palette has no token for (D82, D88)`);
          }
          if (!l.mark.hidden) fails.push(`${at}: sign-up link ${JSON.stringify(l.t)} mark is not aria-hidden — the label already names the platform, and a glyph the reader hears as well is a duplicated name (D294)`);
        }
      }
    }

    // 4d. nav (D100): one row at every width, `flex-wrap: nowrap`, one type tier per viewport, and
    //     the row must fit. The shipped nav was flex-col + flex-wrap and clipped links; a class grep
    //     cannot see that, row centres can.
    if (j.nav) {
      const wraps = j.nav.containers.map((c) => c.wrap).filter((x) => x !== 'nowrap');
      if (wraps.length) fails.push(`${at}: nav flex-wrap is ${wraps.join('/')} — D100 wants nowrap, so a label set that stops fitting fails this probe instead of re-wrapping`);
      const centres = j.nav.links.map((l) => l.cy);
      if (Math.max(...centres) - Math.min(...centres) > 1) fails.push(`${at}: nav links are not on one row (centres ${centres.join(', ')}) — D100 shape B is a single row`);
      const links = j.nav.links.slice(1);              // links[0] is the mark
      const tiers = new Set(links.map((l) => l.fs));
      if (tiers.size > 1) fails.push(`${at}: nav links mix ${tiers.size} type tiers (${[...tiers].join(', ')}) — one tier per viewport` + (NAV_NARROW === null ? ', and no --breakpoint-nav-narrow is declared: a second tier needs a ratified token, not a bracket (D117)' : ''));
      const want = NAV_NARROW === null ? `${LABEL}px` : (w < NAV_NARROW ? `${textTok('micro')}px` : `${LABEL}px`);   // DESIGN.md's type table, read from the block
      for (const l of links) if (l.fs !== want) fails.push(`${at}: nav link ${JSON.stringify(l.t)} renders ${l.fs} at ${w}px, want ${want}`);
      const right = Math.max(...j.nav.links.map((l) => l.right));
      if (right > j.vw) fails.push(`${at}: nav row reaches ${right}px on a ${j.vw}px viewport — the label set no longer fits (D100's probe)`);
      if (j.nav.row && j.nav.row.needed > j.nav.row.available + 0.5) {
        fails.push(`${at}: nav needs ${j.nav.row.needed}px, the container offers ${j.nav.row.available}px — D100's probe fails at this width (nowrap means it shows, it does not hide)`);
      }
      const small = j.nav.links.filter((l) => l.h < 32);
      if (small.length) fails.push(`${at}: ${small.length} nav target(s) under 32px tall (${small.map((l) => l.h).join(', ')}) — the accepted shape pads to 32 (D100 rejected the 13px summary target)`);
    } else {
      fails.push(`${at}: no <nav> in the page at all — the D100 width probe cannot run`);
    }

    // 5. one display step per screen. The threshold is the smallest display step as shipped, so a ramp move
    //    moves the check with it; D112's rule is about the locator role, and this is its measurable shadow.
    const display = j.text.filter((t) => parseFloat(t.fs) >= DISPLAY_FLOOR);
    const steps = new Set(display.map((t) => t.fs));
    if (steps.size > 1) fails.push(`${at}: ${steps.size} display steps on one screen (${[...steps].join(', ')}): ${display.map((t) => t.tag + '“' + t.t.slice(0, 18) + '”').join(' | ')}`);
    if (display.length > 3) fails.push(`${at}: ${display.length} display-size elements on one screen (want at most 3)`);

    // 6. fonts
    const unloaded = (j.fonts || []).filter((f) => !/\bloaded\b/.test(f));
    // a ratified face that never loads is not a warning: it means every height below was measured in
    // the fallback stack (the url in src/styles/fonts.css moved, or the import went away)
    for (const fam of ["PT Serif", "Public Sans Variable"]) {
      const face = (j.fonts || []).find((f) => f.startsWith(fam));
      if (!face) fails.push(`${at}: no ${fam} face referenced by the page at all — the face import is gone`);
      else if (!/\bloaded\b/.test(face)) fails.push(`${at}: ${fam} never loaded (${face}) — heights below are fallback metrics`);
    }
    if (unloaded.length) warns.push(`${at}: ${unloaded.length} webface(s) not loaded at measure time: ${unloaded.slice(0, 3).join('; ')}${unloaded.length > 3 ? ' …' : ''} — serif metrics may be fallback`);
    const phantom = (j.text || []).filter((t) => /Inter var/.test(t.ff));
    if (phantom.length) warns.push(`${at}: ${phantom.length} text run(s) resolve through the phantom family "Inter var" — the faces batch has not landed`);

    // 7. drawn marks (D120): the hero's graphic is geometry, not bytes, so it is measured like every other
    //    claim this gate makes. Four failures are possible and only per-shape numbers separate them.
    if (route === '/' && !(j.marks || []).length) {
      fails.push(`${at}: the landing page draws no mark at all — the hero column's graphic IS the club's mark (D120); an empty column is a defect, not a blank`);
    }
    for (const m of j.marks || []) {
      const at2 = `${at} mark "${m.name}"`;
      if (m.count !== MARK_SHAPE_COUNT) fails.push(`${at2}: ${m.count} shape(s) in the document, the geometry table has ${MARK_SHAPE_COUNT} — an <svg> drops children whose subtree it treats as foreign content, without a word (D118 lesson 1)`);
      if (m.wantRatio && Math.abs(m.ratio - m.wantRatio) > 0.02 * m.wantRatio) fails.push(`${at2}: box is ${m.w}x${m.h} (ratio ${m.ratio}) but the viewBox says ${m.wantRatio} — an inline <svg> that loses its intrinsic ratio falls back to 300x150`);
      if (m.w < 40 || m.h < 20) fails.push(`${at2}: box is ${m.w}x${m.h} — the mark collapsed instead of scaling to its column`);
      if (m.role === 'img' && !m.label) fails.push(`${at2}: role="img" with no accessible name — it announces nothing`);
      if (!m.role && !m.hidden) fails.push(`${at2}: visible with no role and no aria-hidden — name it or hide it (the hero's old photo invented "Math Study Group Session", D120)`);
      for (const [i, s] of m.shapes.entries()) {
        const cands = [s.strokeContrast, s.fillContrast].filter((x) => x !== null);
        if (!cands.length) fails.push(`${at2}: <${s.tag}> painted nothing (stroke ${s.stroke}, fill ${s.fill}) — an unmapped colour role means no paint: ${s.cls}`);
        else {
          const best = Math.max(...cands);
          if (best < 3.0) fails.push(`${at2}: <${s.tag}> reads ${best} against its ground, under the 3.0 graphic bar (D101) — stroke ${s.stroke} / fill ${s.fill}`);
        }
        // D119's floor, for line art: a stroke under one device pixel has no fully-covered pixel, so it has no
        // measurable colour identity. It applies to a stroke that PAINTS. The probe reports the cascade's
        // `stroke-width` even where `stroke: none` means nothing strokes (the SVG initial value is 1), and the
        // mark's meeting point is a filled disc — so keying on the cascade number alone failed a shape that has
        // no stroke to measure. `strokePaints` comes from the same computed style, in the same record.
        if ((s.strokePaints ?? s.stroke !== 'none') && s.sw > 0 && s.swDevice < 1) fails.push(`${at2}: <${s.tag}> stroke lands at ${s.swDevice}px on screen (${s.sw} viewBox units at scale ${m.scale}) — under 1px it is a smudge with no measurable colour identity (D119's rule, applied to line art)`);
        // A declared dash has to ARRIVE. On this mark the far half of the equator is dashed and the near half is
        // solid, and that difference is the occlusion cue that makes the ring read as a sphere rather than a disc
        // (src/lib/brand-mark.mjs, operator ruling 2026-11-02). Two silent failures are possible: a renderer that
        // drops stroke-dasharray, and a drawn scale so small the dashes fuse back into one line — either turns the
        // sphere back into a disc without changing the shape count or a single contrast number.
        const want = MARK.shapes[i]?.dash;
        if (want && (!s.dash || s.dash === 'none')) fails.push(`${at2}: shape ${i} declares dash "${want}" but paints dash "${s.dash}" — the far half of the equator is no longer denoted differently from the near half, so the mark reads as a disc`);
        if (!want && s.dash && s.dash !== 'none') fails.push(`${at2}: shape ${i} paints dash "${s.dash}" but the geometry table declares none — an undeclared dash on the near half would hide the side of the sphere the viewer is standing on`);
        if (want && Array.isArray(s.dashDevice)) {
          const [on, off] = s.dashDevice;
          if (on < 1.5 || (off ?? 0) < 1.5) fails.push(`${at2}: shape ${i}'s dash lands at ${on}px on / ${off}px off at scale ${m.scale} — under 1.5px the pattern fuses into a solid line (D119's floor, applied to the gap as well as the mark)`);
        }
      }
    }

    console.log(`  controls ${j.controls.length} | bands ${j.bands.length} | keylines ${j.keylines.length} | rings ${(j.rings || []).length} | notices ${(j.notices || []).length} | clusters ${(j.clusters || []).length} | nav ${(j.nav?.links ?? []).length} | marks ${(j.marks || []).length} | shadows ${j.shadows.length} | text ${j.text.length}`);
    if (j.nav) console.log(`   nav   ${j.nav.links.map((l) => `${l.fs}/${l.h}px`).join(' ')}  wrap ${j.nav.containers.map((c) => c.wrap).join('/')} gap ${j.nav.containers.map((c) => c.gap).join('/')} needed ${j.nav.row?.needed} of ${j.nav.row?.available}`);
    for (const c of j.controls) {
      console.log(`   ctrl  ${String(c.h).padStart(5)}px ${c.fs.padEnd(6)} lh ${c.lh.padEnd(6)} ${String(c.contrast).padStart(6)}  ${c.tag} ${(c.role || 'NO ROLE').padEnd(10)} ${JSON.stringify(c.t).slice(0, 30)}  ${(c.cls || '').slice(0, 46)}`);
    }
    for (const t of j.text.filter((x) => parseFloat(x.fs) >= 30)) {
      console.log(`   disp  ${t.fs.padEnd(6)} lh ${t.lh.padEnd(7)} ${String(t.contrast).padStart(6)}  ${t.ff.padEnd(11)} ${t.tag} ${JSON.stringify(t.t).slice(0, 34)}`);
    }
    for (const k of [...new Map(j.keylines.map((k) => [k.w + k.raw + k.keylineContrast, k])).values()]) console.log(`   key   ${String(k.w).padStart(3)}px contrast ${String(k.keylineContrast).padStart(5)}  ${k.raw.padEnd(26)} ${(k.cls || '').slice(0, 40)}`);
    // A ring's number is a PAIR (DESIGN.md, Colour): inside and outside, each against the ring. Equal means
    // one ground; unequal means the ring straddles, which D149-3c bans and record 0018 prices at 2.88.
    for (const g of [...new Map((j.rings || []).map((g) => [g.raw + g.inside + g.outside + g.cls, g])).values()]) console.log(`   ring  ${String(g.inset).padStart(3)}px in ${String(g.inside).padStart(5)} out ${String(g.outside).padStart(5)}  ${g.isRule ? 'rule' : g.raw.padEnd(26)}  in ${JSON.stringify(g.innerBytes)} out ${JSON.stringify(g.outerBytes)}  ${(g.cls || '').slice(0, 34)}`);
    for (const n of j.notices || []) console.log(`   notc  ${String(n.h).padStart(5)}px x ${String(n.w).padStart(4)}px  inset ${n.inset}px contrast ${String(n.keylineContrast).padStart(5)}  text ${String(n.textContrast).padStart(5)}  ${n.role} ${JSON.stringify(n.text).slice(0, 34)}`);
    // The sign-up cluster prints as a pair of numbers: the box, and each label's height/tier/contrast. This
    // is where DESIGN.md's "32px, label tier, no fill" claim is checked against paint rather than markup.
    for (const c of j.clusters || []) console.log(`   rsvp  ${String(c.h).padStart(5)}px x ${String(c.w).padStart(4)}px  state ${String(c.state).padEnd(7)} fill ${c.fill || 'none'} ring ${c.ring}  ${c.links.map((l) => `${l.platform} ${l.h}px ${l.fs} ${String(l.contrast)}`).join(' | ')}`);
    for (const b of j.bands) {
      console.log(`   band  ${String(b.h).padStart(5)}px  bg ${b.bg.padEnd(26)} fg ${b.fg.padEnd(24)} ${String(b.contrast).padStart(5)}  ${b.tag} ${(b.cls || '').slice(0, 40)}`);
      for (const l of b.links || []) console.log(`          link ${String(l.h).padStart(4)}px ${l.fs.padEnd(6)} ${String(l.contrast).padStart(6)}  ${JSON.stringify(l.t)}`);
    }
    for (const s of j.shadows) console.log(`   shdw  ${s.shadow.slice(0, 70)}  ${(s.cls || '').slice(0, 40)}`);
    for (const m of j.marks || []) {
      console.log(`   mark  ${m.name} ${m.w}x${m.h} at ${m.x},${m.y} (viewBox ${m.vbW}x${m.vbH}, scale ${m.scale}, shapes ${m.count}/${MARK_SHAPE_COUNT}, ratio ${m.ratio} vs ${m.wantRatio}) role="${m.role}" ${JSON.stringify(m.label)}`);
      for (const s of m.shapes.filter((x) => x.dash && x.dash !== 'none')) console.log(`         dashed: <${s.tag}> declared "${s.dash}" units -> ${s.dashDevice} px on screen`);
      for (const s of m.shapes) console.log(`         ${s.tag.padEnd(6)} ${s.strokePaints === false ? 'no stroke  (fill only)'.padEnd(21) : `${String(s.sw).padStart(4)}u = ${String(s.swDevice).padStart(5)}px`.padEnd(21)}  stroke ${String(s.strokeContrast).padStart(6)} fill ${String(s.fillContrast).padStart(6)}  ${(s.stroke !== 'none' ? s.stroke : s.fill).padEnd(24)} ${s.cls.slice(0, 24)}`);
    }
  }
}

console.log('');
for (const w of warns) console.log('WARN  ' + w);
if (fails.length === 0) {
  console.log(`\nRENDER GATE: PASS (${routes.length} route(s) x ${widths.length} width(s))`);
  process.exit(0);
}
console.log(`\nRENDER GATE: ${fails.length} FAILING CHECK(S)`);
for (const f of fails) console.log('FAIL  ' + f);
process.exit(1);
