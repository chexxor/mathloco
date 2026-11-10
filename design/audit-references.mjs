#!/usr/bin/env node
// audit-references.mjs — what cites a design file, and is it worth keeping?
//
// This is the tool that answers "should this stay in the repo?" with a reference graph instead of a
// guess. It walks every source, doc and note in the project and counts how many *other* files name
// each design path literally, then splits those into:
//   code  - package.json scripts, scripts/*, or another design tool (the file is an input to a run)
//   docs  - DESIGN.md, .notes/*, skills, records (the file is the citation behind a claim)
// A file with code>0 is load-bearing: moving or deleting it breaks a gate. A file with docs>0 is
// evidence: a number or a decision in DESIGN.md / DECISIONS.md points at it. A file with neither is
// unreferenced - either promote it (give it a header and a doc that cites it) or stop tracking it.
//
//   node design/audit-references.mjs            # tracked files under design/ and .design/
//   node design/audit-references.mjs -v         # show up to 8 citing files per row
//   node design/audit-references.mjs --scratch  # include gitignored scratch in .design/
//   node design/audit-references.mjs --json     # dump the rows to .design/tmp-audit.json
//   node design/audit-references.mjs --stale    # only: path literals in any doc that resolve to nothing
//
// --stale is the one to run after any rename: a doc that cites a path which no longer exists is a
// pointer a future session will follow into a wall. Path literals named *because* they are gone, or
// that were never paths, are listed in KNOWN_GONE with the reason — this is meant to be a gate, so it
// may not shrug at anything else. Scratch files never count as citable sources unless --scratch is set.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', 'dist', '.git', '.pi', '.svelte-kit', 'npm-cache', '.wrangler']);
const walk = (d, out = []) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};

const scratch = process.argv.includes('--scratch');
const staleOnly = process.argv.includes('--stale');
// git tells us which .design/ files are evidence rather than scratch; in --stale mode we don't need it,
// so a checkout without git (or without .design/ at all) still runs the check.
let tracked = [];
if (!staleOnly || process.argv.includes('-v')) {
  try { tracked = execSync('git ls-files design .design', { encoding: 'utf8' }).trim().split('\n').filter(Boolean); } catch { tracked = walk('design'); }
}
const subjects = (scratch ? walk('design').concat(existsSync('.design') ? walk('.design') : []) : tracked).filter((f) => statSync(f).size > 0);

const ROOTS = ['package.json', 'DESIGN.md', 'AGENTS.md', 'README.md', 'src', 'scripts', '.agents', '.notes', 'design', '.design', '.github'];
const textExt = /\.(m?js|ts|tsx|json|md|astro|svelte|sh|css|py|yml|txt)$/;
// Scratch is not a citable source. `.design/` is scratch by rule (design/README.md), and the harness
// writes `.probe-shot-*` / `.measured-*` / `rendered-*` next to whatever it probes. A scratch log that
// happened to record a failing command line turned this gate red by quoting a path that never existed —
// the gate judges tracked, durable text, and `--scratch` opts the rest back in.
const scratchFile = (f) => f.startsWith('.design/') || /(^|[\\/])(\.probe-shot-|\.measured-|rendered-)/.test(f);
const sources = ROOTS.filter(existsSync)
  .flatMap((r) => (statSync(r).isDirectory() ? walk(r) : [r]))
  .filter((f) => textExt.test(f))
  .map((f) => [f, (() => { try { return readFileSync(f, 'utf8'); } catch { return ''; } })()])
  .filter(([f, t]) => t && (scratch || !scratchFile(f)));

// every path literal that looks like a repo path, so --stale can resolve it
const PATHRE = /['"`]((?:design|\.design|src|scripts|public)\/[A-Za-z0-9._/-]*[A-Za-z0-9])['"`]/g;

const KNOWN_GONE = {
  'design/decision-audit.mjs': 'DESIGN.md cites it as the probe written in a session that never committed it; the citation IS the lesson',
  'design/ratify-tokens': 'a branch name recorded in design/state.json, not a path',
  'src/assets/math-group-image.jpg': 'deleted in apply 4h (D120); scripts/make-social-share.mjs names it as the provenance of the crop geometry',
  'src/consts.ts': 'named in dated evidence (records/0010, token-plan.md); the section flags now live in src/config.json',
  'design/grill/round6/round-6_html-375.json': 'design/decisions.json recorded this before the harness named outputs grill_round_6_html-375.json',
  'design/grill/navfit/D100.md': 'a specimen note that went missing mid-session; DECISIONS names it while recording that it is gone',
  'src/components/UpcomingMeetups.astro': 'deleted 2026-11-03 — invented events behind a false flag; real schedule work wrote src/components/Schedule.astro instead of enabling it. Cited by dated evidence (design/drift.json, the phase-1 measurement) and one-shot history (design/apply-batch1.mjs), which are records, not live tooling',
  'src/components/PastEvents.astro': 'deleted 2026-11-03 — the empty stub (records/0010 named it as the original justification for the empty-state grammar, which now has a live component to apply it). Same dated-evidence citations as above',
  'src/components/icons/Checkmark.astro': 'deleted 2026-11-03 — its only users were the six benefit cards in src/components/WhyJoinUs.astro, whose copy the operator retired as claims the club never made (design/records/0018-*). It painted text-ink-2, so it was never a colour source either. Cited by dated evidence (design/drift.json) and by that record',
  'src/components/JoinCommunity.astro': 'deleted 2026-11-07 (D228) — its content did not die, it moved: its heading ("Come once" until the same day\u2019s copy pass retired the theme, D239 — the band is headed "When We Meet" now), "How it works", the PS-3 join media and the two paths out are now the bottom of the compact schedule band in src/components/Schedule.astro, because a date and how you come to it are one question and the landing page was answering them in two bands with two headings. Cited by dated evidence (design/drift.json, the phase-1 measurement) and one-shot history (design/apply-batch2.mjs, design/apply-batch3.mjs), which are records, not live tooling',
};

// Paths a run does not need yet, and shapes a skill names before it writes: exempt with a reason.
const PENDING = [
  [/lint\.config\.json$/, 'phase 5 (design-enforce) has not run; that is the config it would write'],
  [/design-lint\.mjs$/, 'phase 5 asset; it lands in scripts/ only when enforce runs'],
  [/^src\/lib\/components\/ui$/, 'no shadcn/ui in this repo; the enforce reference probes for it with `|| ls components/ui`'],
  [/(NNNN|round-N\.|00[0-9]{2}$|-0009$)/, 'a skill template or shorthand for a set of records, not one path'],
  [/^\.design\/tmp-/, 'scratch: producing it is the point of the tool that names it'],
  [/^src\/content\.local$/, 'a gitignored directory that exists only while a REVIEW build is planted: scripts/review-render.mjs creates and removes it, and src/lib/content.ts globs the directory (never a filename) precisely because it may not exist'],
  [/^docs\/(spec\/source-contract\.md|threat-model\.md|adr\/0001[^/]*\.md|fixtures)/, 'the stage gates named by .notes/PLAN.md (G2-G5): the plan names the file that must exist before the stage is entered, and it is written by the milestone that owns the gate (MS06-MS09). Citing it before it exists is the fence, not a broken link - the rule is that no adapter code, no token and no live write lands before it'],
  [/^scripts\/check-rsvp(-page)?\.mjs$/, 'MS12 (S019): src/lib/rsvp.mjs names the two gates its own milestone row lists as its exit criteria, and the reader in scripts/meetup-events.mjs already carries the snapshot half of check:rsvp. The gate scripts are written by the milestone that owns them. (D268)'],
];
const pending = (p) => PENDING.find(([re]) => re.test(p));

// .notes/ is host-local dated narrative: a stale path there misleads a human, it does not break a run,
// so it is reported rather than fatal. Everything else that names a path has to resolve.
const ADVISORY = (f) => f.startsWith('.notes/');

if (staleOnly) {
  const bad = new Map(), notes = new Map(), known = new Set();
  for (const [f, t] of sources) {
    for (const m of t.matchAll(PATHRE)) {
      const p = m[1];
      if (existsSync(p) || p.includes('*')) continue;
      if (KNOWN_GONE[p]) { known.add(`${p}   <- ${f}${KNOWN_GONE[p] ? ' — ' + KNOWN_GONE[p] : ''}`); continue; }
      const pend = pending(p);
      if (pend) { known.add(`${p}   <- ${f} — pending: ${pend[1]}`); continue; }
      (ADVISORY(f) ? notes : bad).set(`${p}   <- ${f}`, p);
    }
  }
  const dump = (label, set) => console.log(set.size ? `${label}:\n  ${[...set.keys()].sort().join('\n  ')}` : `${label}: none`);
  dump('BROKEN path literals in code, skills and DESIGN.md', bad);
  dump('\nunsolvable in .notes/ (host-local narrative; fix by hand if it would mislead)', notes);
  console.log(`\nknown-gone / pending (documented, not defects):\n  ${[...known].sort().join('\n  ')}`);
  process.exit(bad.size ? 1 : 0);
}

const rows = [];
for (const f of subjects) {
  const code = [], docs = [];
  for (const [g, t] of sources) {
    if (g === f || !t.includes(f)) continue;
    (g === 'package.json' || g.startsWith('scripts/') || g.startsWith('design/') || g.startsWith('.design/') ? code : docs).push(g);
  }
  rows.push({ f, size: statSync(f).size, code, docs });
}
rows.sort((a, b) => b.code.length - a.code.length || b.docs.length - a.docs.length || a.f.localeCompare(b.f));
for (const r of rows) {
  console.log(`code=${String(r.code.length).padStart(2)} docs=${String(r.docs.length).padStart(2)} ${String(r.size).padStart(7)}  ${r.f}`);
  if (process.argv.includes('-v')) for (const g of [...r.code, ...r.docs].slice(0, 8)) console.log(`        <- ${g}`);
}
const dead = rows.filter((r) => !r.code.length && !r.docs.length);
console.log(`\n${rows.length} files; ${dead.length} cited by nothing (promote or untrack):`);
for (const r of dead.slice(0, 40)) console.log(`  ${r.f}`);
if (process.argv.includes('--json')) writeFileSync('.design/tmp-audit.json', JSON.stringify(rows, null, 1));
