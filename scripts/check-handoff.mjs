#!/usr/bin/env node
/**
 * check:handoff — the far side's two fixtures are run through **this repo's** calendar rules on every build.
 *
 *   npm run check:handoff          # three files: the real snapshot, the standard's fixture, the broken one
 *   npm run check:handoff:selftest # plant each way this differential can rot, require each to be named
 *
 * Why (MS42, **S092**, **ADR-0010**, **D471**, docs/spec/event-data-handoff.md §"The two vendor fixtures are a
 * test in this tree, not a sample"). Since 2026-11-23 another repository writes `data/events.json`. This repo's
 * rules for that file live in `scripts/check-ics.mjs`; the publisher's rules for writing it live in
 * `social-event-publisher`, and its test suite carries two fixtures: one file in the shape the standard pins, and
 * the same file with the shape broken on purpose (their MH-FR-020). Both were vendored here on 2026-11-17 at
 * `data/fixtures/`.
 *
 * A vendored copy is only worth its bytes if something runs it. Without this gate the two suites can disagree
 * about the contract and nobody finds out until a handoff commit lands on a branch that will not build — the
 * disagreement becomes an argument between two repositories, which is the thing `docs/spec/event-data-handoff.md`
 * exists to prevent. With it:
 *
 *   - the standard's own fixture must satisfy this repo's rules. If it stops satisfying them, **this repo** moved
 *     (a rule got stricter than the contract, or a rule was written against this repo's data rather than against
 *     the contract). That is not the vendor's bug to fix; it is a claim in this repo's contract that the vendor
 *     never agreed to, and the fixture says so.
 *   - the misshapen fixture must still fail, and each planted defect must still be **named**. If it stops failing,
 *     a rule here was relaxed or deleted, and the file that is supposed to be refused is now acceptable.
 *   - the blobs are pinned. A fixture edited in this tree stops being the vendor's test file, so the gate compares
 *     the git blob id against the one the vendoring commit recorded and names the path when they differ.
 *
 * What it caught on the day it landed (@measured 2026-11-23): `check:ics`'s `uid-shape` rule read the fixture's
 * zero-padded UUIDs (`00000000-0000-4000-8000-000000000006`) as time-derived, because stripping punctuation leaves
 * a 32-digit run. The vendor's canonical file was fine and this repo's rule was not — a false positive that would
 * have made every future handoff fixture fail. Fixed in the same commit, with the exemption narrowed to the
 * 8-4-4-4-12 hex shape and all 50 `check:ics` plantings re-run.
 *
 * What it does NOT do: audit the shipped bytes (that is `check:ics`, which compares the render against
 * `dist/client/events.ics`), or reach the network, or write anything. Three of `check:ics`'s rules are not run on
 * the fixtures — `artifact` (a fixture has no shipped bytes), and `runway` plus `stale-snapshot` (they read the wall
 * clock, and a fixture's dates are frozen at vendoring time, so they would turn this gate red on 2026-12-02 over a
 * file nobody touched). Everything else runs, including the cascade behind an unrenderable file: the gate's verdict
 * is about the six planted defects, each of which must appear by name.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run, renderSafe } from './check-ics.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');

const REAL = resolve('data/events.json');
const GOOD = resolve('data/fixtures/mathloco-snapshot.json');
const MISFIT = resolve('data/fixtures/mathloco-snapshot-misshapen.json');

/** Blob ids recorded when the pair was vendored from `social-event-publisher` at 2026-11-18T01:43Z
 * (commits 36f2bf5 and 3080c66's fixture rows). `git hash-object <path>` is the same function. */
const BLOBS = {
  [GOOD]: 'bc52bf4b3feea80896ea88b206c5d118a393aaf8',
  [MISFIT]: '442abd71b8ba6396773e967a0a5edbdfadb60e64',
};

/** The defects the vendor planted in the misshapen fixture, each with the finding that must name it.
 *  Read the pair side by side and the mutation is visible: `calendar.prodid` deleted, a `mood` key added to one
 *  row, one `start` rewritten to `2026-11-21T12:00` + `Z`, another to the bare date `2026-11-21`, and
 *  `superseded` emptied while the grouping still drops two rows. Six expectations, five mutations: the missing
 *  `prodid` is named twice, once by the renderer and once by the field rule. */
const PLANTED = [
  { label: 'an envelope this repo cannot render (calendar.prodid deleted)', rule: 'renderable', needle: 'cannot be rendered at all' },
  { label: 'a row field the contract does not carry (`mood`)', rule: 'sourced-rows', needle: 'field "mood" is not in the D70 row shape' },
  { label: 'no calendar.prodid on the snapshot', rule: 'sourced-rows', needle: 'the snapshot has no calendar.prodid' },
  { label: 'a start wearing a zone it does not have (`2026-11-21T12:00Z`)', rule: 'raw-upstream-instant', needle: 'carries a zone designator' },
  { label: 'a start with no hour (the bare date `2026-11-21`)', rule: 'raw-upstream-instant', needle: 'start has no hour' },
  { label: 'rows the grouping drops but the log does not carry (`superseded` emptied)', rule: 'superseded-log', needle: 'is superseded by the grouping but is not in the log' },
];

/** Rules the fixture audit does not run, each with the reason.
 *  - `artifact` compares the render against `dist/client/events.ics`; a fixture has no shipped bytes, and
 *    `check:ics`'s own clean pass excludes the same rule for the same reason.
 *  - `runway` and `stale-snapshot` read the **wall clock**. A fixture's dates are frozen at vendoring time
 *    (its rows end 2026-11-21, its stamp is 2026-11-17, its hatch expires 2026-12-01), so those two rules would
 *    turn this gate red on 2026-12-02 for a file nobody touched — the date-rot class D192 names, in a new
 *    costume. A fixture is a **shape** specimen; the freshness of the file that is actually published is ruled
 *    by `check:ics` on every build, on the real `data/events.json`. */
const FIXTURE_SKIP = ['artifact', 'runway', 'stale-snapshot'];

/** One file through the rule set minus the three above. Everything else, including the cascade behind an
 *  unrenderable file, is kept: an unrenderable file really does break every rule downstream of the renderer. */
const audit = (data) => {
  const { text } = renderSafe(data);
  return run(data, text).filter((f) => !FIXTURE_SKIP.includes(f.rule));
};

const blobOf = (path) =>
  createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(readFileSync(path))}\0`), readFileSync(path)])).digest('hex');

/** The differential itself. Pure: it takes the three parsed documents and returns problems and notes, so the
 *  selftest can plant a drift without touching a file on disk (add-a-gate anatomy 1). */
function differential({ real, good, misfit }) {
  const problems = [];
  const notes = [];

  const rf = audit(real);
  if (rf.length) {
    problems.push(
      `data/events.json — the file this repo actually publishes — has ${rf.length} finding(s), first: ` +
        `${rf[0].rule}: ${rf[0].detail}. check:ics audits the same file after build, so this is the same defect ` +
        'caught before anyone builds (D118)',
    );
  } else {
    notes.push(`data/events.json: ${(real.events ?? []).length} row(s), 0 finding(s) — the file this repo publishes`);
  }

  const gf = audit(good);
  if (gf.length) {
    problems.push(
      `the standard's own fixture (${(good.events ?? []).length} rows) no longer satisfies this repo's rules: ` +
        `${gf.length} finding(s), first: ${gf[0].rule}: ${gf[0].detail}. The fixture is the vendor's canonical ` +
        'shape, so this repo moved: a rule here is stricter than docs/spec/event-data-handoff.md, or was written ' +
        "against this repo's data instead of against the contract. Either narrow the rule with a reason, or raise " +
        'it as a change request in that file — do not edit the fixture to match the rule',
    );
  } else {
    notes.push(`mathloco-snapshot.json: ${(good.events ?? []).length} row(s), 0 finding(s) — the standard's shape passes here`);
  }

  const mf = audit(misfit);
  if (!mf.length) {
    problems.push(
      'the misshapen fixture produced no finding at all. That file is the vendor\'s proof that a sink must refuse ' +
        'a broken snapshot; a green run here means this repo would publish it. A rule was deleted or relaxed since ' +
        'the pair was vendored 2026-11-17',
    );
  }
  const missed = PLANTED.filter((e) => !mf.some((f) => f.rule === e.rule && f.detail.includes(e.needle)));
  for (const e of missed) {
    problems.push(
      `the misshapen fixture's planted defect — ${e.label} — is not named by any finding. ` +
        `Expected a finding from rule \`${e.rule}\` containing ${JSON.stringify(e.needle)}. ` +
        'Either that rule was relaxed here (then the file it should refuse is acceptable), or the vendor moved the ' +
        'fixture (then re-vendor it and say so in the commit)',
    );
  }
  if (!missed.length && mf.length) {
    notes.push(
      `mathloco-snapshot-misshapen.json: ${mf.length} finding(s), all ${PLANTED.length} planted defects named ` +
        `(${[...new Set(mf.map((f) => f.rule))].join(', ')})`,
    );
  }
  return { problems, notes, counts: { real: rf.length, good: gf.length, misfit: mf.length } };
}

if (selftest) {
  // What this gate can fail at is not "a calendar rule stops working" — that is check:ics:selftest's 50 plantings.
  // It is **the differential itself going quiet**: one side stops being checked, or the vendored bytes stop being
  // the vendor's. Each planting repairs one planted defect in a copy of the misshapen fixture, or adds one to the
  // good fixture, and requires the harness to say which.
  const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
  const good = readJson(GOOD);
  const misfit = readJson(MISFIT);
  const real = readJson(REAL);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const cases = [
    {
      name: 'a rule here gets laxer: the superseded log is restored in the misshapen file',
      misfit: (() => {
        const m = clone(misfit);
        m.superseded = clone(good.superseded);
        return m;
      })(),
      want: 'rows the grouping drops but the log does not carry',
    },
    {
      name: 'a rule here gets laxer: the unknown `mood` key is removed from the misshapen file',
      misfit: (() => {
        const m = clone(misfit);
        for (const r of m.events) delete r.mood;
        return m;
      })(),
      want: 'a row field the contract does not carry',
    },
    {
      name: 'a rule here gets laxer: the zone-suffixed start is repaired',
      misfit: (() => {
        const m = clone(misfit);
        for (const r of m.events) if (typeof r.start === 'string' && r.start.endsWith('Z')) r.start = r.start.slice(0, -1);
        return m;
      })(),
      want: 'a start wearing a zone it does not have',
    },
    {
      name: 'a rule here gets laxer: the envelope is restored so the file renders',
      misfit: (() => {
        const m = clone(misfit);
        m.calendar.prodid = '-//Matheapolis//Events 1.0//EN';
        return m;
      })(),
      want: 'an envelope this repo cannot render',
    },
    {
      name: 'the misshapen fixture is swapped for a clean file: the premise itself must fail loudly',
      misfit: clone(good),
      want: 'produced no finding at all',
    },
    {
      name: 'a rule here gets stricter: an unknown key appears on the standard\'s fixture',
      good: (() => {
        const g = clone(good);
        g.events[0].mood = 'keen';
        return g;
      })(),
      want: "no longer satisfies this repo's rules",
    },
    {
      name: 'the published file itself breaks: the differential still reports it by name',
      real: (() => {
        const r = clone(real);
        r.events[0].start = '2026-11-21T12:00Z';
        return r;
      })(),
      want: 'the file this repo actually publishes',
    },
    { name: 'the three files exactly as they sit on disk', want: null },
  ];

  let bad = 0;
  for (const c of cases) {
    const { problems } = differential({ real: c.real ?? real, good: c.good ?? good, misfit: c.misfit ?? misfit });
    if (c.want === null) {
      if (problems.length) {
        bad++;
        console.log(`FAIL  ${c.name} should pass but reported: ${problems[0]}`);
      } else console.log(`ok    clean control: ${c.name}`);
      continue;
    }
    const hit = problems.find((p) => p.includes(c.want));
    if (hit) console.log(`ok    planting "${c.name}" -> ${hit.slice(0, 150)}...`);
    else {
      bad++;
      console.log(`FAIL  planting "${c.name}": expected a problem naming ${JSON.stringify(c.want)} and got ${problems.length}`);
    }
  }

  // The blob pin, planted: a fixture edited in this tree is no longer the vendor's test file.
  const tampered = { ...BLOBS, [MISFIT]: '0'.repeat(40) };
  const blobProblems = blobProblemsFor(tampered);
  if (blobProblems.some((p) => p.includes('is not the vendored blob'))) {
    console.log('ok    planting "a fixture edited in this tree" -> the blob pin names the path and both ids');
  } else {
    bad++;
    console.log('FAIL  planting "a fixture edited in this tree": the blob pin said nothing');
  }
  if (blobProblemsFor(BLOBS).length) {
    bad++;
    console.log('FAIL  the shipped fixtures do not match their own recorded blobs — the clean control failed');
  }

  // The skip list must never hide a defect the differential is supposed to name. Static assertion, because a
  // skipped rule that also carries an expectation is the quiet way this gate loses coverage.
  const collision = PLANTED.filter((e) => FIXTURE_SKIP.includes(e.rule));
  if (collision.length) {
    bad++;
    console.log(`FAIL  the skip list hides a planted defect: ${collision.map((e) => `${e.rule} (${e.label})`).join(', ')}`);
  } else {
    console.log(`ok    assertion: the ${FIXTURE_SKIP.length} skipped rules (${FIXTURE_SKIP.join(', ')}) carry none of the ${PLANTED.length} planted expectations`);
  }

  console.log(`check:handoff:selftest — ${cases.length + 2} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

/** Blob pins, checked against the files on disk. Split out so the selftest can plant a mismatch without
 *  rewriting a vendored fixture. */
function blobProblemsFor(pins) {
  const problems = [];
  for (const [path, want] of Object.entries(pins)) {
    if (!existsSync(path)) {
      problems.push(`${path} is missing — the vendored fixture the differential runs on is gone (re-vendor it from social-event-publisher, or delete this gate in the same commit that deletes the fixture)`);
      continue;
    }
    const got = blobOf(path);
    if (got !== want) {
      problems.push(
        `${path} is not the vendored blob: recorded ${want}, on disk ${got} ` +
          `(\`git hash-object ${path}\`). A fixture edited in this tree stops being the far side's test file — ` +
          're-vendor it, or update this line in the same commit as the change request in docs/spec/event-data-handoff.md',
      );
    }
  }
  return problems;
}

const missing = [REAL, GOOD, MISFIT].filter((p) => !existsSync(p));
if (missing.length) {
  for (const p of missing) console.log(`FAIL  ${p} is missing — check:handoff runs on three files and one is gone`);
  process.exit(1);
}

const parsed = {
  real: JSON.parse(readFileSync(REAL, 'utf8')),
  good: JSON.parse(readFileSync(GOOD, 'utf8')),
  misfit: JSON.parse(readFileSync(MISFIT, 'utf8')),
};

const { problems, notes, counts } = differential(parsed);
const blobProblems = blobProblemsFor(BLOBS);
for (const n of notes) console.log(`ok    ${n}`);
for (const p of [...blobProblems, ...problems]) console.log(`FAIL  ${p}`);
console.log(
  `check:handoff — 3 file(s): findings real=${counts.real} standard-fixture=${counts.good} misshapen-fixture=${counts.misfit}; ` +
    `${PLANTED.length} planted defects expected on the broken one; ${problems.length + blobProblems.length} problem(s)`,
);
console.log(`ok    the two fixtures skip ${FIXTURE_SKIP.length} of check:ics's rules: ${FIXTURE_SKIP.join(', ')} — a fixture has no shipped bytes and its dates are frozen, so the wall-clock rules belong to check:ics on the real file`);
process.exit(problems.length + blobProblems.length ? 1 : 0);
