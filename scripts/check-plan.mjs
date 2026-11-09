#!/usr/bin/env node
// check-plan.mjs — the plan, its tracked projection and the session entry point cannot disagree.
//
// Why this exists (ruling S015, 2026-11-09): the queue lived in `.notes/NEXT.md`, and a session that read
// only NEXT.md saw a priority while `MILESTONES.md` said something else about the same item. Two files that
// both claim "what is next" drift, and the drift is invisible until a session does work that is already
// done, or re-measures a number a ruling already settled. So: one roadmap (`.notes/PLAN.md`), one tracked
// projection (`MILESTONES.md`, because `.notes/` is gitignored and a fresh clone needs something to read),
// and an entry point with no queue (`NEXT.md`). This gate is what makes that a rule instead of an intention.
//
//   node scripts/check-plan.mjs              the gate (in `verify`)
//   node scripts/check-plan.mjs --selftest   plant each defect class and require a named failure
//   node scripts/check-plan.mjs --show       print the parsed milestone rows
//
// CI runs `verify` from a clone, where `.notes/` does not exist. The gate therefore has two modes, the
// same shape `decision-index.mjs --check` uses (D151): with the plan present it audits the plan *and*
// demands the projection match; without it it audits the tracked projection alone and says so. It never
// goes red for the absence of a host-local file, and it never goes green for a milestone row that proves
// nothing.
//
// What it fails on, and why each earns its place:
//   1. a plan section missing            -> "stages, gates, fences, rules" is a claim, not a document
//   2. a milestone row with no exit gate -> an item with no command or ruling is a topic, not a milestone (D151)
//   3. a row with no owner               -> an item nobody is answerable for does not get done
//   4. a status outside the vocabulary   -> a status nobody can test is a mood, not a state
//   5. a paused/blocked row with no trigger -> a deferral without a trigger is lost, not parked (D148)
//   6. the projection disagreeing        -> the plan the clone reads is not the plan this machine has
//   7. a skipped or duplicate MS id      -> ids are append-only; a renumber silently re-points citations
//   8. more than three open questions    -> a queue of unknowns is how a session stalls
//   9. NEXT.md carrying a queue          -> two sources of "next" is the defect this plan replaces
//  10. an S/MS id cited with no entry    -> an id that resolves to nothing reads like evidence (D151)
//  11. a parked row with no trigger      -> the same class as 5, one row at a time
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const PLAN = '.notes/PLAN.md';
const PROJ = 'MILESTONES.md';
const NEXT = '.notes/NEXT.md';
const QUESTIONS = '.notes/QUESTIONS.md';
const SESSIONS = '.notes/SESSIONS.md';

const STATUSES = ['active', 'next', 'paused', 'queued', 'blocked', 'closed'];
const SECTIONS = ['Stages', 'Gates', 'Milestones', 'Scope fences', 'Decision rules', 'Pitfall register', 'Session protocol', 'Open questions', 'Parked', 'Rulings'];

// --- parsing -----------------------------------------------------------------------------------------------
const rowCells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());
const isRow = (line) => /^\|\s*\*\*MS\d{2}\*\*\s*\|/.test(line);
const milestoneRows = (text) => text.split('\n').filter(isRow)
  .map((l) => ({ id: /^\|\s*\*\*(MS\d{2})\*\*/.exec(l)[1], cells: rowCells(l), line: l }));

const statusOf = (row) => {
  const m = /\b(active|next|paused|queued|blocked|closed)\b/i.exec(row.cells[row.cells.length - 1] || '');
  return m ? m[1].toLowerCase() : null;
};

const sectionText = (text, heading) => {
  const start = text.indexOf('\n## ' + heading);
  if (start < 0) return '';
  const rest = text.slice(start);
  const next = rest.indexOf('\n## ', 1);
  return next < 0 ? rest : rest.slice(0, next);
};

// An exit gate is a command, a gate id, or a ruling. "Make the header nice" is neither.
const hasExitGate = (row) => /npm run |node |wrangler |git merge-tree|\bG\d\b|\bS\d{3}\b|\bD\d{1,3}\b/.test(row.cells[2] ?? '');

// A pause or a block must say what ends it.
const hasTrigger = (row) => /trigger|unblock|resume|until|closes|when |headroom/i.test(row.cells[row.cells.length - 1] || '');

// Parked rows: the second column is the trigger. A blank trigger is the D148 failure mode in table form.
const parkedRows = (plan) => sectionText(plan, 'Parked').split('\n')
  .filter((l) => /^\|/.test(l) && !/^\|\s*(-{3,}\s*\|)+-?\s*\|$/.test(l) && !/^\|\s*parked\s*\|/.test(l))
  .map((l) => rowCells(l));

const definedRulings = (plan) => new Set([...sectionText(plan, 'Rulings').matchAll(/\*\*S(\d{3})\b/g)].map((m) => Number(m[1])));
const openQuestions = (plan) => sectionText(plan, 'Open questions').split('\n').filter((l) => /^\d+\.\s/.test(l));

// The rules every milestone row must satisfy, whoever is reading it - the plan or the projection.
// The column count is fixed per file (plan: id | milestone | exit gate | who | status; projection:
// id | milestone | exit gate | status) so the exit-gate cell is always index 2 and a row with an
// extra or missing cell is a failure rather than a silent misread of the wrong column.
function rowProblems(rows, source, cols) {
  const out = [];
  if (!rows.length) out.push(`${source} has no milestone rows (expected "| **MS01** | ... |")`);
  for (const r of rows) {
    if (r.cells.length !== cols) out.push(`${r.id}: row in ${source} has ${r.cells.length} columns, the table defines ${cols} (${cols === 5 ? 'milestone, exit gate, who, status' : 'milestone, exit gate, status'})`);
    if (r.cells.length >= 4 && !r.cells[3]) out.push(`${r.id}: no named owner in ${source} - an item nobody is answerable for does not get done`);
    if (!hasExitGate(r)) out.push(`${r.id}: no exit gate - an item with no command or ruling that proves it is a topic, not a milestone (D151)`);
    const st = statusOf(r);
    if (!st) out.push(`${r.id}: status "${r.cells[r.cells.length - 1]}" is outside the vocabulary (${STATUSES.join(', ')})`);
    if ((st === 'paused' || st === 'blocked') && !hasTrigger(r)) out.push(`${r.id}: ${st} with no resume trigger - a deferral without a trigger is lost, not parked (D148)`);
  }
  const ids = rows.map((r) => r.id);
  if (ids.length !== new Set(ids).size) out.push(`a milestone id is defined twice in ${source} - ids are never reused`);
  const nums = ids.map((i) => Number(i.slice(2))).sort((a, b) => a - b);
  for (let i = 1; i <= (nums[nums.length - 1] ?? 0); i++) if (!nums.includes(i)) out.push(`MS${String(i).padStart(2, '0')} is missing from ${source} - ids are never skipped, renumbered or reused`);
  const actives = rows.filter((r) => statusOf(r) === 'active');
  if (actives.length > 1) out.push(`${actives.length} milestones are "active" in ${source} - at most one, or the plan has no current milestone`);
  return out;
}

const B64 = /data:[a-z0-9.+-]+\/?[a-z0-9.+-]*;base64,[A-Za-z0-9+/=]+/gi;
const B64RUN = /"[A-Za-z0-9+/=]{80,}"|'[A-Za-z0-9+/=]{80,}'|[A-Za-z0-9+/]{200,}={0,2}/g;
function trackedCitations() {
  const by = { S: new Map(), MS: new Map() };
  let files = [];
  try { files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean); } catch { return by; }
  for (const f of files) {
    if (f === PROJ) continue; // the projection defines MS ids; counting it as a citation is circular
    let text;
    try { text = readFileSync(root + f, 'utf8'); } catch { continue; }
    if (text.includes('\u0000')) continue; // a tracked binary is not prose (D163)
    text = text.replace(B64, ' ').replace(B64RUN, ' ');
    for (const m of text.matchAll(/\bS(\d{3})\b/g)) { const id = Number(m[1]); if (!by.S.has(id)) by.S.set(id, []); by.S.get(id).push(f); }
    for (const m of text.matchAll(/\bMS(\d{2})\b/g)) { const id = Number(m[1]); if (!by.MS.has(id)) by.MS.set(id, []); by.MS.get(id).push(f); }
  }
  return by;
}

function audit(plan, proj, next, citations) {
  const problems = [];
  const planRows = milestoneRows(plan);
  const projRows = milestoneRows(proj);

  // Clone mode: `.notes/` is gitignored, so CI has only the projection. It is still a roadmap, so it is
  // still held to the rules - and the absence of the host-local file is reported, not failed.
  if (!plan) {
    problems.push(...rowProblems(projRows, PROJ, 4));
    const known = new Set(projRows.map((r) => r.id));
    for (const [id, files] of citations.MS) {
      const id2 = 'MS' + String(id).padStart(2, '0');
      if (!known.has(id2)) problems.push(`${id2} cited by ${files.length} file(s) (${files.slice(0, 3).join(', ')}) but no such milestone in the tracked projection`);
    }
    // S### rulings live in the host-local plan, so a clone cannot check them. They are not silently
    // ignored: `--show` in a clone prints what it can see, and the local run is where the register lives.
    return { problems, clone: true };
  }

  // 1. sections
  for (const s of SECTIONS) if (!new RegExp('^## ' + s, 'm').test(plan)) problems.push(`plan section missing: "## ${s}"`);

  // 2-5, 7. the plan's own rows
  problems.push(...rowProblems(planRows, PLAN, 5));

  // 6. the tracked projection must match, and must be complete
  problems.push(...rowProblems(projRows, PROJ, 4));
  const planStatus = new Map(planRows.map((r) => [r.id, statusOf(r)]));
  const projStatus = new Map(projRows.map((r) => [r.id, statusOf(r)]));
  for (const [id, st] of planStatus) {
    if (!projStatus.has(id)) problems.push(`${PROJ} does not carry ${id}: the tracked projection is missing a milestone a fresh clone would need`);
    else if (projStatus.get(id) !== st) problems.push(`${id} disagrees: PLAN says "${st}", ${PROJ} says "${projStatus.get(id)}" - one of them is wrong, and the diff is invisible in a table cell`);
  }
  for (const id of projStatus.keys()) if (!planStatus.has(id)) problems.push(`${PROJ} carries ${id}, which the plan does not define - projection drift`);

  // 8. open questions capped at three
  const open = openQuestions(plan);
  if (open.length > 3) problems.push(`${open.length} open questions - the cap is three (S015). Answer one, park one with a trigger, or merge two`);

  // 9. NEXT.md is an entry point, not a queue
  if (!next) problems.push(`${NEXT} missing: a session has no entry point`);
  else {
    if (!/no queue/i.test(next)) problems.push(`${NEXT} does not say it carries no queue - that line is what stops a session adding one back`);
    if (!/PLAN\.md/.test(next)) problems.push(`${NEXT} must point at PLAN.md §Milestones for "what is next"`);
    if (!/\bMS\d{2}\b/.test(next)) problems.push(`${NEXT} names no current milestone`);
    if (isRow(next)) problems.push(`${NEXT} carries a milestone table - a queue in the entry point is the defect the plan replaces`);
    if (!/npm run |node /.test(next)) problems.push(`${NEXT} gives no exact command to run first`);
  }

  // 10. ids cited must exist
  const rulings = definedRulings(plan);
  for (const [id, files] of citations.S) if (!rulings.has(id)) problems.push(`S${id} cited by ${files.length} file(s) (${files.slice(0, 3).join(', ')}) but defined in no ruling register`);
  for (const [id, files] of citations.MS) if (!planStatus.has('MS' + String(id).padStart(2, '0'))) problems.push(`MS${String(id).padStart(2, '0')} cited by ${files.length} file(s) (${files.slice(0, 3).join(', ')}) but no such milestone`);

  // 11. parked rows carry triggers
  for (const cells of parkedRows(plan)) {
    if (cells.length < 2 || !cells[1]) problems.push('a parked row has no un-park trigger: ' + (cells[0] || '').slice(0, 60));
  }

  // the archive files exist and are not stubs
  for (const f of [QUESTIONS, SESSIONS]) {
    if (!existsSync(root + f)) problems.push(`${f} missing`);
    else if (readFileSync(root + f, 'utf8').trim().length < 200) problems.push(`${f} is a stub, not a record`);
  }

  return { problems, clone: false };
}

// --- selftest -----------------------------------------------------------------------------------------------
// Each planting must FAIL. A gate that cannot go red is decoration (the rule every other selftest here
// follows, D118). Rows are mutated by id, not by literal prose, so the test survives the plan being edited.
function rewriteRow(text, id, which, value) {
  return text.split('\n').map((l) => {
    if (!isRow(l) || !l.includes(id)) return l;
    const cells = rowCells(l);
    cells[which] = value;
    return '| ' + cells.join(' | ') + ' |';
  }).join('\n');
}

function selftest(base) {
  const [plan, proj, next, cites] = base;
  const plantings = [
    ['plan section deleted', () => ({ plan: plan.replace(/^## Gates[\s\S]*?(?=\n## )/m, '') }), 'plan section missing'],
    ['exit gate removed', () => ({ plan: rewriteRow(plan, 'MS01', 2, 'make the planning nicer') }), 'no exit gate'],
    ['status outside the vocabulary', () => ({ plan: rewriteRow(plan, 'MS01', 4, '**ongoing**') }), 'outside the vocabulary'],
    ['paused with no trigger', () => ({ plan: rewriteRow(plan, 'MS03', 4, '**paused**') }), 'no resume trigger'],
    ['blocked with no trigger', () => ({ plan: rewriteRow(plan, 'MS05', 4, '**blocked**') }), 'no resume trigger'],
    ['projection disagrees', () => ({ proj: rewriteRow(proj, 'MS02', 3, '**queued**') }), 'disagrees'],
    ['projection missing a milestone', () => ({ proj: proj.split('\n').filter((l) => !l.includes('**MS11**')).join('\n') }), 'does not carry MS11'],
    ['milestone id skipped', () => ({ plan: plan.split('\n').filter((l) => !l.includes('**MS07**')).join('\n') }), 'MS07 is missing'],
    ['two milestones active at once', () => ({ plan: rewriteRow(plan, 'MS04', 4, '**active**') }), 'milestones are "active"'],
    ['fourth open question', () => ({ plan: plan.replace('## Open questions (capped at three)', '## Open questions (capped at three)\n4. **A fourth one.** Something nobody has answered yet.') }), 'open questions'],
    ['queue put back in NEXT', () => ({ next: '| **MS11** | an item in the entry point | a command | **queued** |\n\n' + next }), 'milestone table'],
    ['park row with no trigger', () => ({ plan: plan.split('\n').map((l) => /^\| mark surface identity \(R1\) \|/.test(l) ? '| mark surface identity (R1) | |' : l).join('\n') }), 'un-park trigger'],
    ['milestone row with no owner', () => ({ plan: rewriteRow(plan, 'MS11', 3, '') }), 'no named owner'],
    ['milestone row truncated to two columns', () => ({ plan: plan.split('\n').map((l) => /^\| \*\*MS11\*\* \|/.test(l) ? '| ' + rowCells(l).slice(0, 2).join(' | ') + ' |' : l).join('\n') }), 'columns'],
    ['projection row with an extra column', () => ({ proj: proj.split('\n').map((l) => /^\| \*\*MS02\*\* \|/.test(l) ? l.replace(/ \| \*\*active\*\*/, ' | delegate | **active**') : l).join('\n') }), 'columns'],
    ['ruling id with no entry', () => { const c = { S: new Map(cites.S), MS: new Map(cites.MS) }; c.S.set(777, ['AGENTS.md']); return { cites: c }; }, 'no ruling register'],
    // CI mode: the clone has no plan, so the projection alone is audited - and it must still catch a bad row.
    ['clone: plan gone, projection row with no exit gate', () => ({ plan: '', proj: rewriteRow(proj, 'MS02', 2, 'make production match the repo') }), 'no exit gate'],
    ['clone: plan and projection both gone', () => ({ plan: '', proj: '' }), 'no milestone rows'],
  ];
  const control = audit(plan, proj, next, cites);
  if (control.problems.length) {
    console.log('check:plan:selftest FAIL - control: the real plan is already red, so a planted failure proves nothing:');
    for (const p of control.problems) console.log('  ' + p);
    return 1;
  }
  let bad = 0;
  for (const [name, mutate, expected] of plantings) {
    const p = { plan, proj, next, cites };
    Object.assign(p, mutate());
    const { problems, clone } = audit(p.plan, p.proj, p.next, p.cites);
    const hit = problems.find((x) => x.toLowerCase().includes(expected.toLowerCase()));
    if (hit) console.log(`  selftest ok   - ${name}${clone ? ' [clone mode]' : ''}: caught "${hit.slice(0, 92)}"`);
    else { bad++; console.log(`  selftest FAIL - ${name}: planted a defect the gate did not see (${problems.length} problems reported)`); }
  }
  console.log(`check:plan:selftest - ${plantings.length} plantings, ${bad ? bad + ' undetected' : 'all detected'}; control clean (${milestoneRows(plan).length} milestones).`);
  return bad ? 1 : 0;
}

const args = process.argv.slice(2);
if (!existsSync(root + PLAN) && !existsSync(root + PROJ)) {
  console.error('check:plan FAIL - neither .notes/PLAN.md nor MILESTONES.md exists: this repo has no roadmap at all.');
  process.exit(1);
}
const plan = existsSync(root + PLAN) ? readFileSync(root + PLAN, 'utf8') : '';
const proj = existsSync(root + PROJ) ? readFileSync(root + PROJ, 'utf8') : '';
const next = existsSync(root + NEXT) ? readFileSync(root + NEXT, 'utf8') : '';
const cites = trackedCitations();

if (args.includes('--show')) {
  for (const r of milestoneRows(plan || proj)) console.log(`${r.id}  ${(statusOf(r) ?? '?').padEnd(7)} ${r.cells[1].slice(0, 80)}`);
  process.exit(0);
}
if (args.includes('--selftest')) process.exit(selftest([plan, proj, next, cites]));

const { problems, clone } = audit(plan, proj, next, cites);
if (problems.length) {
  console.error('check:plan FAIL - the plan, its tracked projection and the entry point do not agree:');
  for (const p of problems) console.error('  ' + p);
  console.error('  Fix the plan, not the symptom: PLAN.md §Milestones is the source, and MILESTONES.md mirrors it in the same commit.');
  process.exit(1);
}
const rows = milestoneRows(plan || proj);
if (clone) {
  console.log(`check:plan ok (clone mode - ${PLAN} is host-local, so the tracked projection is the roadmap) - ${rows.length} milestones (${rows.map((r) => statusOf(r)).join(', ')}), every row has an exit gate and an owner.`);
} else {
  console.log(`check:plan ok - ${rows.length} milestones (${rows.map((r) => statusOf(r)).join(', ')}), every row has an exit gate and an owner, open questions ${openQuestions(plan).length}/3, ${definedRulings(plan).size} rulings, ${parkedRows(plan).length} parked items each with a trigger, projection matches, ${NEXT} carries no queue.`);
}
