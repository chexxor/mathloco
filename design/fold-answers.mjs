#!/usr/bin/env node
// fold-answers.mjs — does the built home page answer the four questions a stranger asks, ABOVE THE FOLD?
//
//   node design/fold-answers.mjs              # build, then measure at 390x844
//   node design/fold-answers.mjs --no-build   # measure the dist that is already there
//   FOLD_WIDTHS=390,320 node design/fold-answers.mjs   # the phone columns, one command
//
// Why this exists (2026-11-15, round-4 design brief §5 / §6, D340 and D350). The brief's acceptance test
// is written as a human-visible thing: "a stranger on a phone asking when / where / how do I sign up".
// Every other instrument here answers *is the fact on the page* — the round-5 question inventory (a later
// round's instrument, documented on the branch that carries it: naming it here would point at a file this
// branch cannot run, which is what the design audit exists to catch) matches shapes in the bytes, `check:space`
// reports boxes and empty runs — and none of them answers *is the fact on the first screen*, which is the half
// that decides whether the answer reaches someone who will not scroll. A fact that is present at y=1100 and a fact at y=300 are the same bytes to every other probe
// and different pages to a visitor.
//
// The fold is `window.innerHeight` at a stated viewport: 390x844 is the phone the brief names (an iPhone
// 12/13 logical viewport is 390 CSS px wide and 844 tall). A probe that scrolled the page before
// measuring would report the whole document as "above the fold"; this one never scrolls.
//
// A probe, not a gate: it prints numbers and exits 0 whatever it finds, the same rule as check:space,
// check:color and check:rhythm (design/README.md). `check:dated-surfaces` and `check:copy` still decide
// the copy; this decides whether the copy is where a phone reader lands.
//
// It reads the SHIPPED page through design/grill/dist-measure.mjs, which rewrites asset URLs to relative
// inside dist — the same copy the render gate measures — and never mutates what gets deployed.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { distState, staleLine } from './dist-fresh.mjs';

const args = process.argv.slice(2);
const widths = (process.env.FOLD_WIDTHS || '390').split(',').map(Number);
// 844 is the phone's own viewport height, not a tall window: a 6000px window makes every element
// "above the fold" by construction, which is how a fold probe would become a machine that always
// says yes. design/plates-price.mjs uses a tall window because it measures page height instead.
const heights = (process.env.FOLD_HEIGHTS || '844').split(',').map(Number);
const dist = resolve('dist/client');

if (!args.includes('--no-build')) {
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
} else {
  const st = distState();
  if (!st.fresh && !st.allowed) {
    console.error(`fold-answers: ${staleLine(st)}`);
    process.exit(1);
  }
}

const out = [];
for (const w of widths) {
  for (const h of heights) {
    let json = null;
    for (let attempt = 1; attempt <= 2 && !json; attempt++) {
      try {
        const raw = execFileSync(process.execPath,
          ['design/grill/dist-measure.mjs', dist, '/', 'design/grill/fold-answers.js', w, h],
          { encoding: 'utf8' });
        json = JSON.parse(raw.slice(raw.indexOf('{')));
      } catch {
        if (attempt < 2) console.error(`  no report at ${w}x${h} — retrying once`);
      }
    }
    if (!json) { console.error(`fold-answers: no report at ${w}x${h} after 2 attempts`); process.exit(1); }
    out.push({ width: w, height: h, ...json });
  }
}

console.log('fold answers — the built home page, at each phone viewport (the fold is the viewport height)');
let worst = null;
for (const r of out) {
  console.log(`\n@ ${r.width}x${r.height} viewport — fold at y=${r.viewport.h}, page ${r.docHeight}px tall`);
  for (const a of r.answers) {
    if (!a.found) { console.log(`  ${a.ask.padEnd(32)} NOT ON THE PAGE (no element carries the handle)`); continue; }
    console.log(`  ${a.ask.padEnd(32)} top ${String(a.top).padStart(5)}  bottom ${String(a.bottom).padStart(5)}  ${a.fullyAboveFold ? 'above the fold' : a.topAboveFold ? 'cut by the fold' : 'PAST THE FOLD'}  "${a.words}"`);
  }
  console.log(`  above the fold: ${r.inFold.join(', ') || '(none)'} — past it: ${r.pastFold.join(', ') || '(none)'}`);
  if (!worst || r.pastFold.length > worst.pastFold.length) worst = r;
}
console.log(`\nworst viewport: ${worst.width}x${worst.height}, ${worst.pastFold.length} of ${worst.answers.length} answers past the fold`);
