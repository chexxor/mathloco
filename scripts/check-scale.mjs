#!/usr/bin/env node
// check:scale — every spacing step a page writes is one of the eight DESIGN.md rules.
//
//   npm run check:scale            # over src/
//   npm run check:scale:selftest   # plant each defect, require each to FAIL, with clean controls
//
// Why this gate exists (2026-11-14, the second design read §4, S042 / D321). `DESIGN.md` "Spacing — 4px grid,
// eight steps" names the ladder Tailwind step -> px (1,2,3,4,6,8,12,16 -> 4,8,12,16,24,32,48,64) and says
// "Never use a step outside that set". Nothing measured it. `check:classes` proves a class EXISTS; Tailwind
// v4's dynamic spacing scale makes `mt-23` (92px) resolve, so "the class generates CSS" is not "the value is
// on the scale" — DESIGN.md says this in its own Enforcement section. The read's line "If the repo has
// one-off margin-top values, replace them with the scale" is a rule with no detector, so it was a topic
// rather than a gate (S038's point: a rule a probe cannot fire on is prose).
//
// What it enforces, in the class attribute only — comments are stripped first, because a note quoting the
// defect is not the defect:
//   FAIL  off-scale-step    — a spacing utility whose step is not in {0,1,2,3,4,6,8,12,16}
//   FAIL  fractional-step   — `gap-3.5` (14px): Tailwind accepts it, the ladder does not
//   FAIL  bracket-value     — `p-[13px]` / `mt-[7px]`: a hand-written number in a utility
//   INFO  the census        — every step the tree writes, with its count, so a reviewer sees the shape
//
// Deliberately NOT enforced: width and height utilities (`h-20`, `w-28`). The scale in DESIGN.md is a
// SPACING scale; icon boxes are measured objects with their own rulings (D139's 48px control, PS-4's 323px
// plate), and a gate that flags them would fire on geometry it has no rule about.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');

const STEPS = new Set([0, 1, 2, 3, 4, 6, 8, 12, 16]);
const PX = (n) => n * 4;

// Tailwind's spacing families are margin, padding, gap and the `space-x`/`space-y` list helpers. The
// regex below spells them out rather than naming a `SPACING` constant, because the same character
// string has to appear in the bracket-value pass too; `inset`/`top`/`left` are excluded — nothing in
// this tree positions with them, and a rule about a utility nobody writes is a gate that can only
// fire on future noise.
const UTIL = /(?:^|[\s"'(:=])((?:[a-z]+:)*(m|p)(t|r|b|l|x|y)?|gap(?:-x|-y)?|space-(?:x|y))-(\d+(?:\.\d+)?)(?=[\s"')\]}])/g;

/**
 * Pure verdict over `[{file, text}]` so the selftest plants with no disk and no build (D118).
 * Comments are stripped before scanning: the shipped `global.css` comment quoting `mt-5` is the
 * lesson, not the defect, and a gate that fires on prose about a defect is a gate that teaches
 * the next agent to ignore it (D302's reasoning, applied to a scanner).
 */
export const scaleFindings = (files) => {
  const fails = [];
  const census = new Map();
  for (const f of files) {
    const text = stripComments(f.text);
    // Pass 1: bracket values — a hand-written px inside a spacing utility.
    for (const m of text.matchAll(/\b(m|p)(t|r|b|l|x|y)?-\[([0-9.]+)px\]/g)) {
      fails.push({ rule: 'bracket-value', file: f.file, detail: `${m[0]}: a hand-written px value; DESIGN.md's rule is "If no step fits, change the scale, do not write p-[13px]"` });
    }
    // Pass 2: utility writes, responsive prefixes included (`md:gap-x-8`).
    for (const line of text.split('\n')) {
      for (const m of line.matchAll(UTIL)) {
        const utility = m[1];
        const raw = m[4]; // groups 2 and 3 are the (m|p) and its direction; the step is group 4
        const step = Number(raw);
        if (!Number.isFinite(step)) continue;
        const key = `${utility}-${raw}`;
        census.set(key, (census.get(key) || 0) + 1);
        if (!Number.isInteger(step)) {
          fails.push({ rule: 'fractional-step', file: f.file, line: lineTrim(line), detail: `${utility}-${raw} is ${PX(step)}px; the ladder has no half steps (14px was mapped to 12 by design-apply, D117)` });
        } else if (!STEPS.has(step)) {
          fails.push({ rule: 'off-scale-step', file: f.file, detail: `${utility}-${raw} is ${PX(step)}px, and ${PX(step)} is not on the eight-step ladder (4 8 12 16 24 32 48 64)` });
        }
      }
    }
  }
  return { fails, census };
};

const lineTrim = (line) => line.trim().slice(0, 60);

const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')   // C-style block comments (astro frontmatter, css, js)
    .replace(/<!--[\s\S]*?-->/g, '')    // HTML comments in .astro markup
    .replace(/(^|\n)\s*\*[^\n]*/g, '\n') // frontmatter continuation lines (" * note")
    .replace(/\/\/[^\n]*/g, '');        // line comments

// Walk src/, skipping node_modules, dist and dot-directories.
const sourceFiles = (base) => {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      const p = resolve(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(astro|svelte|ts|js|mjs|css)$/.test(name)) out.push({ file: relative(base, p), text: readFileSync(p, 'utf8') });
    }
  };
  walk(resolve(base, 'src'));
  return out;
};

const runSelftest = () => {
  const clean = `
    <section class="bg-paper py-12">
      <div class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="mt-4">Dates</h2>
        <ul class="mt-6 grid grid-cols-1 gap-x-8 md:grid-cols-2 gap-y-4">
          <li class="py-2">one</li>
        </ul>
        <p class="mt-0">zero is a real step</p>
      </div>
    </section>
    <!-- a comment mentioning gap-5 and mt-23 and p-[13px] is not the defect -->
  `;
  const cases = [
    { name: 'clean control: every step on the ladder', src: clean, want: [] },
    { name: 'a comment quoting the defect does not fire it', src: clean + '\n// gap-5 here is prose, not markup\n/* mt-23 too */', want: [] },
    { name: 'gap-5 (20px) — the orphan the read named', src: '<ul class="grid gap-5"><li>a</li></ul>', want: ['off-scale-step'] },
    { name: 'mt-23 (92px) — Tailwind v4 resolves it, the ladder does not', src: '<p class="mt-23">text</p>', want: ['off-scale-step'] },
    { name: 'py-10 (40px) — the footer-shaped off-step', src: '<footer class="py-10">band</footer>', want: ['off-scale-step'] },
    { name: 'mt-7 (28px)', src: '<p class="mt-7">x</p>', want: ['off-scale-step'] },
    { name: 'gap-3.5 (14px)', src: '<ul class="gap-3.5"><li>x</li></ul>', want: ['fractional-step'] },
    { name: 'p-[13px]', src: '<div class="p-[13px]">x</div>', want: ['bracket-value'] },
    { name: 'responsive prefix is still caught: sm:mt-5', src: '<p class="sm:mt-5 md:mt-6">x</p>', want: ['off-scale-step'] },
    { name: 'a sizing utility is not a spacing one: h-20 is not flagged', src: '<svg class="h-20 w-28"><circle/></svg>', want: [] },
    { name: 'a token name is not a utility: text-ink-2 is not flagged', src: '<p class="text-ink-2">x</p>', want: [] },
    { name: 'the defect is named with the file it lives in', src: '<p class="mt-9">x</p>', want: ['off-scale-step'] },
  ];
  let bad = 0;
  for (const c of cases) {
    const { fails } = scaleFindings([{ file: 'fixture/thing.astro', text: c.src }]);
    const got = fails.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = !miss.length && !extra.length;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(56)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
    for (const f of fails) console.log(`        ${f.rule}: ${f.detail}`);
  }
  console.log(`\ncheck:scale selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
};

const runReal = () => {
  const files = sourceFiles(process.cwd());
  const { fails, census } = scaleFindings(files);
  const steps = [...census.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`check:scale — ${files.length} source file(s), ${steps.length} distinct spacing utilities`);
  // The step is the LAST dash-separated piece: `gap-x-8` is 8, not `x`.
  for (const [u, n] of steps) console.log(`  ${u.padEnd(12)} x${n}  (${PX(Number(u.split('-').pop()))}px)`);
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.file}: ${f.detail}`);
  console.log(fails.length ? `\n${fails.length} off-scale spacing write(s).` : '\nEvery spacing step in src/ is on the eight-step ladder.');
  process.exit(fails.length ? 1 : 0);
};

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) (selftest ? runSelftest : runReal)();
