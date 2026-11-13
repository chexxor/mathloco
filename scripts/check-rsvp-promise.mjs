#!/usr/bin/env node
/**
 * check:rsvp-promise — a milestone row that names a sign-up platform must paint it, and a platform the
 * artifact paints must be named in the row.
 *
 *   npm run check:rsvp-promise              # PLAN.md §Milestones + MILESTONES.md vs src/config.json vs dist/
 *   npm run check:rsvp-promise:selftest     # 8 plantings + a clean control, each defect must be named (D118)
 *   node scripts/check-rsvp-promise.mjs --dist <dir> [--plan <file>] [--projection <file>]
 *
 * Why this gate exists (S024, D287). The completion auditor's rejection of MS12 was not a code defect: the
 * milestone text promised "the club's Facebook group" while `src/config.json` carried an empty
 * `facebookGroup`, the resolver emitted no Facebook destination, and the gate meant to prove the promise
 * (`check:rsvp-page`) compared the page against the resolver — a resolver reading an empty config. Every link
 * in the chain was honest; the *promise* was never compared with anything. `check:plan` proves the plan's
 * structure (statuses, exit gates, owners, the tracked projection); `check:figures` proves a measured number
 * carries a date; `check:decisions` proves a `D###` citation resolves. Nothing proved that the platforms a
 * milestone names are the platforms a visitor can click. That is the gap an auditor found and a future
 * session would find again.
 *
 * Three sets, and the gate fails if they are not the same set:
 *   the promise  - the platform names (`PLATFORMS` in src/lib/rsvp.mjs) in the description cell of a milestone
 *                 row that also mentions sign-up, in .notes/PLAN.md §Milestones and in MILESTONES.md;
 *   the choice   - the platforms with a non-empty URL in src/config.json (an empty entry means the club does
 *                 not sign people up there, and `signUpPaths()` paints nothing for it);
 *   the artifact - every `data-rsvp-platform` attribute in dist/client/index.html and
 *                 dist/client/schedule/index.html.
 *
 * Clone mode (D118 rule 4): `.notes/` is gitignored, so a CI checkout has no PLAN.md. The gate then reads the
 * tracked projection `MILESTONES.md` and says so in its own output rather than failing on a missing plan.
 *
 * What it does NOT do: reach the network (that is `check:rsvp` / `check:rsvp:links`), or prove the wording of
 * a label (that is `check:rsvp-page`, which compares each link against `signUpPaths()` byte for byte).
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLATFORMS, LINK_KEYS } from '../src/lib/rsvp.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NAMES = Object.values(PLATFORMS); // ['Meetup', 'Discord', 'Facebook']
const PAGES = ['client/index.html', 'client/schedule/index.html'];

const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : dflt;
};

const dist = arg('--dist', `${ROOT}dist`);
const planPath = arg('--plan', `${ROOT}.notes/PLAN.md`);
const projectionPath = arg('--projection', `${ROOT}MILESTONES.md`);

/**
 * A milestone row is a line starting `| **MS12** |`. Only a row that makes the **sign-up promise** is judged,
 * and the promise is read from the row's **description cell** (column 2, i.e. `split('|')[2]`) — the
 * Two reasonings: (1) the exit-gate and status cells legitimately list platforms as *evidence* ("`check:rsvp`
 * ... the `PROBE_BLIND_KEYS` rule for `facebookGroup`", "the built `/` paints 3 links"), and a record of what
 * was measured is not a promise to paint it; (2) rows that name a platform without promising sign-up — MS03
 * (the band lost its Meetup/chat twin), MS06 (Meetup as a source to describe) — are not measurable against the
 * artifact. A row must mention sign-up (or RSVP) and name a platform in its description to be a promise.
 */
function promiseRows(text) {
  return (text || '')
    .split('\n')
    .filter((l) => /^\|\s*\*\*MS\d+\*\*/.test(l))
    .map((l) => ({ id: /\*\*(MS\d+)\*\*/.exec(l)[1], desc: (l.split('|')[2] || '').trim() }))
    .filter((r) => /sign-?up|rsvp/i.test(r.desc))
    .filter((r) => NAMES.some((n) => new RegExp(`\\b${n}\\b`, 'i').test(r.desc)))
    .map((r) => ({ id: r.id, desc: r.desc, named: NAMES.filter((n) => new RegExp(`\\b${n}\\b`, 'i').test(r.desc)) }));
}

function paintedPlatforms(distDir) {
  const set = new Set();
  const missing = [];
  let read = 0;
  for (const p of PAGES) {
    const file = `${distDir}/${p}`;
    if (!existsSync(file)) { missing.push(p); continue; }
    read++;
    for (const m of readFileSync(file, 'utf8').matchAll(/data-rsvp-platform="([^"]+)"/g)) set.add(m[1]);
  }
  return { set, missing, read };
}

/** A platform is a *choice* when the config declares a URL for it; `signUpPaths()` paints nothing otherwise. */
function configuredPlatforms(urls) {
  return new Set(
    Object.entries(LINK_KEYS)
      .filter(([, urlKey]) => (urls[urlKey] || '').trim())
      .map(([platform]) => PLATFORMS[platform])
  );
}

/** Pure verdict: the selftest plants into these three sets without touching the tree (D118 rule 1). */
function verdict({ planText, projectionText, urls, painted }) {
  const problems = [];
  const notes = [];

  if (painted.missing.length) {
    problems.push(`the artifact is not there (${painted.missing.join(', ')}): run \`npm run build\` before this gate — it is wired with needs: ['build']`);
    return { problems, notes };
  }
  if (!painted.set.size) {
    problems.push('the built pages paint no sign-up platform at all, so every promise in a milestone row is unmet — either the cluster is gone from the page or `src/config.json` declares no link for any platform');
  }

  const source = planText ? 'plan' : 'projection';
  if (source === 'projection') notes.push('.notes/ is not in a clone, so the promise is read from the tracked MILESTONES.md');

  const rows = promiseRows(planText || projectionText);
  if (!rows.length) {
    problems.push('no milestone row names any sign-up platform — the promise side of this gate has nothing to compare, which is how a milestone closes while naming nothing it ships');
    return { problems, notes };
  }

  const chosen = configuredPlatforms(urls);
  const paintedNames = [...painted.set].filter((n) => NAMES.includes(n));
  const strays = [...painted.set].filter((n) => !NAMES.includes(n));
  if (strays.length) {
    problems.push(`the artifact paints data-rsvp-platform="${strays.join(', ')}" — a name not in PLATFORMS, so no gate, label or preference key knows what it means`);
  }

  for (const row of rows) {
    const named = new Set(row.named);
    const promisedButNotChosen = [...named].filter((n) => !chosen.has(n));
    const promisedButNotPainted = [...named].filter((n) => !painted.set.has(n));
    const paintedButNotPromised = paintedNames.filter((n) => !named.has(n));
    const chosenButNotPromised = [...chosen].filter((n) => !named.has(n));

    if (promisedButNotChosen.length) {
      problems.push(`${row.id} names ${promisedButNotChosen.join(', ')} but src/config.json declares no URL for them — fill the entry (with its verification stamp, S019/S021) or strike the platform from the row`);
    }
    if (promisedButNotPainted.length) {
      problems.push(`${row.id} promises ${promisedButNotPainted.join(', ')}; the ${painted.read} built pages paint ${paintedNames.join(', ')} — a platform named in a milestone row must reach a visitor, or the row is a claim the artifact does not keep`);
    }
    if (paintedButNotPromised.length) {
      problems.push(`the artifact paints ${paintedButNotPromised.join(', ')} on ${row.id}'s surfaces but the row never names it — a platform a visitor can click that no ruling ratified is an undocumented choice`);
    }
    if (chosenButNotPromised.length) {
      problems.push(`src/config.json declares ${chosenButNotPromised.join(', ')} and the resolver paints it, but ${row.id}'s row does not name it — the milestone record is behind the code`);
    }
  }

  const projRows = promiseRows(projectionText);
  for (const row of rows) {
    const mirror = projRows.find((p) => p.id === row.id);
    if (!mirror) {
      problems.push(`${row.id} names ${row.named.join(', ')} in the plan and is absent from MILESTONES.md's platform rows — check:plan proves the projection has the row, so this means the projection row dropped its platform names`);
      continue;
    }
    if (mirror.named.join(',') !== row.named.join(',')) {
      problems.push(`${row.id} names ${row.named.join(', ')} in PLAN.md and ${mirror.named.join(', ')} in MILESTONES.md — the tracked projection is what a fresh clone reads, and a clone cannot see a promise it has no file for`);
    }
  }

  return { problems, notes };
}

/* ---------------- selftest ---------------- */

function selftest() {
  const plan = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
  const projection = existsSync(projectionPath) ? readFileSync(projectionPath, 'utf8') : '';
  if (!plan && !projection) {
    console.error('check:rsvp-promise:selftest needs a milestone table: neither .notes/PLAN.md nor MILESTONES.md is present');
    process.exit(1);
  }

  let urls;
  try {
    urls = JSON.parse(readFileSync(`${ROOT}src/config.json`, 'utf8')).URLs;
  } catch (e) {
    console.error(`check:rsvp-promise:selftest cannot read src/config.json: ${e.message}`);
    process.exit(1);
  }

  // The real artifact is the control's baseline. When dist/ is absent the selftest still runs, against an
  // artifact synthesised from what the config declares — that is exactly what signUpPaths() emits.
  const realPaint = paintedPlatforms(dist);
  const controlPaint = realPaint.missing.length
    ? { set: configuredPlatforms(urls), missing: [], read: 0 }
    : realPaint;
  if (realPaint.missing.length) console.log('  note: dist/ not built; the selftest uses an artifact derived from the config');

  const rowOf = (text, id) => (text || '').split('\n').find((l) => new RegExp(`^\\|\\s*\\*\\*${id}\\*\\*`).test(l)) || '';
  const ms12Plan = rowOf(plan, 'MS12');
  const ms12Proj = rowOf(projection, 'MS12');
  const FB_PHRASE = /and the club's Facebook group \(S021\)/;
  // A clone has no plan, so the promise it can be checked against lives in the tracked projection. Planting
  // a plan-side defect into a string that is not there is a no-op, and a no-op planted as a failure is a
  // selftest that reports a defect it never created @measured 2026-11-12 by `npm run verify` in a fresh clone.
  const inClone = !plan;
  const srcText = inClone ? projection : plan;
  const srcRow = inClone ? ms12Proj : ms12Plan;
  const srcKey = inClone ? 'projectionText' : 'planText';
  const dropPhrase = (re, rep) => ({ [srcKey]: srcText.replace(srcRow, srcRow.replace(re, rep)) });

  const plantings = [
    { label: 'the row promises Facebook while the config declares none',
      urls: { ...urls, facebookGroup: '' }, painted: controlPaint, want: ['declares no URL for them'] },
    { label: 'the row names only Meetup and Discord while the artifact paints three',
      ...dropPhrase(FB_PHRASE, '(S021)'), painted: controlPaint, want: ['never names it'] },
    { label: 'the Facebook link is painted but never promised',
      ...dropPhrase(/Facebook group/g, 'group'), painted: controlPaint, want: ['no ruling ratified', 'does not name it'] },
    { label: 'the built page drops the Discord link while the row still names it',
      painted: { set: new Set(['Meetup', 'Facebook']), missing: [], read: 2 }, want: ['promises Discord'] },
    { label: 'the projection omits the platform the plan names', needsPlan: true,
      projectionText: projection.replace(ms12Proj, ms12Proj.replace(FB_PHRASE, '(S021)')), painted: controlPaint, want: ['PLAN.md and'] },
    { label: 'a clone with no plan and no projection',
      planText: '', projectionText: '', painted: controlPaint, want: ['no milestone row names any sign-up platform'] },
    { label: 'the artifact was never built',
      painted: { set: new Set(), missing: PAGES, read: 0 }, want: ['npm run build'] },
    { label: 'an attribute painted with a platform name no rule knows',
      painted: { set: new Set([...controlPaint.set, 'Instagram']), missing: [], read: 2 }, want: ['a name not in PLATFORMS'] },
  ];

  const cases = [{ label: 'clean control', want: [] }, ...plantings];
  let wrong = 0;
  let skipped = 0;
  for (const c of cases) {
    // The plan-vs-projection planting needs both files; a clone has only the projection, so that class of
    // defect cannot exist there and the planting is skipped rather than silently reported as passing.
    if (c.needsPlan && !plan) { skipped++; continue; }   // the plan-vs-projection class cannot exist without a plan
    const data = {
      planText: c.planText ?? plan,
      projectionText: c.projectionText ?? projection,
      urls: c.urls ?? urls,
      painted: c.painted ?? controlPaint,
    };
    const { problems } = verdict(data);
    const hit = c.want.every((w) => problems.some((p) => p.includes(w)));
    const ok = c.want.length === 0 ? problems.length === 0 : hit;
    if (!ok) {
      wrong++;
      console.error(`  WRONG: ${c.label}`);
      console.error(`    want: ${c.want.join(' | ') || 'no problems'}   got: ${problems.length ? problems.join(' ; ') : 'none'}`);
    }
  }
  console.log(`check:rsvp-promise:selftest: ${plantings.length} plantings + 1 clean control, ${wrong} wrong${skipped ? ` (${skipped} skipped: no .notes/PLAN.md to disagree with)` : ''}`);
  process.exit(wrong ? 1 : 0);
}

/* ---------------- main ---------------- */

if (process.argv.includes('--selftest')) selftest();

const planText = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
const projectionText = existsSync(projectionPath) ? readFileSync(projectionPath, 'utf8') : '';

let urls;
try {
  urls = JSON.parse(readFileSync(`${ROOT}src/config.json`, 'utf8')).URLs;
} catch (e) {
  console.error('check:rsvp-promise: FAIL');
  console.error(`  - src/config.json cannot be parsed, so the link map is unknown: ${e.message}`);
  console.error('  Fix the config; the gate cannot judge a promise against a file it cannot read.');
  process.exit(1);
}

const painted = paintedPlatforms(dist);
const { problems, notes } = verdict({ planText, projectionText, urls, painted });

for (const n of notes) console.log(`  note: ${n}`);
const chosen = [...configuredPlatforms(urls)];
const rows = promiseRows(planText || projectionText);
for (const r of rows) {
  console.log(`ok    ${r.id} names ${r.named.join(', ')}; config declares ${chosen.join(', ')}; the ${painted.read} built pages paint ${[...painted.set].join(', ')}`);
}
if (problems.length) {
  console.error('check:rsvp-promise: FAIL');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('  Fix the side that is wrong, not the gate: the row, the config, or the component.');
  process.exit(1);
}
console.log(`check:rsvp-promise: ok - ${rows.length} milestone row(s) name exactly the platforms the config declares and the artifact paints (${[...painted.set].join(', ')})`);
