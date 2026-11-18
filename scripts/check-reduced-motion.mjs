#!/usr/bin/env node
// check:reduced-motion — the stylesheet that ships a transition ships a guard that neutralises it.
//
//   npm run check:reduced-motion            # over src/styles and the built dist/client
//   npm run check:reduced-motion:selftest   # plant each guard defect, require each to FAIL
//
// The rule this detector enforces is DESIGN.md's line "Never use `duration-300` or a 400ms tier. **Always**
// guard animation with `prefers-reduced-motion: reduce` — and a guard inside a comment does not count"
// (MS35, S068 — GAP-ANALYSIS §2 rank 4, `govuk/motion-and-attention.md#G12-motion-03`: "Remove or provide
// an option for disabling animation"). The rule is written in DESIGN.md before this gate demands it, so
// this file cites it rather than restating it.
//
// Why this gate exists (2026-11-18, MS35): the mandated guard had no detector and no artifact. The mandate
// sat in a stylesheet comment — `src/styles/global.css:203` says the guard "is mandatory and lands with the
// markup in design-apply (0 occurrences in src/ today)" — and `check:render` measures contrast and heights,
// never whether motion can be turned off. `ratify-check` is named in DESIGN.md and in `src/layouts/Layout.astro`'s
// comment but is in neither `package.json` nor `scripts/gate-run.mjs`, so the thing that was supposed to fail
// the absence cannot be run at all. D282's class: "a check without a selftest is an assertion, not a
// detector" — here it is worse, the check does not exist.
//
// What it enforces:
//   FAIL  transition-unguarded        — src writes motion and no built sheet carries a guard block at all
//   FAIL  guard-comment-only          — the only mention of the feature in src is inside a comment:
//                                        DESIGN.md's own words are "a guard inside a comment does not count"
//   FAIL  guard-not-shipped           — a guard block authored in src/styles, absent from every built sheet:
//                                        the stylesheet stopped reaching the artifact, so what ships is motion
//   FAIL  guard-in-artifact-only      — a guard in a built sheet and none in src/: the fix was written into
//                                        dist/, so the next build erases it and nothing ever failed
//   FAIL  guard-neutralises-nothing   — a guard block exists whose declarations change no motion property:
//                                        a guard that sets a colour leaves every 150ms hover fade running
//   FAIL  animation-in-src-unguarded  — src writes an animate- utility, an @keyframes or an animation: and
//                                        no guard block neutralises animation
//   FAIL  guard-scope-narrow          — a guard that selects classes but never `*`: it stops the motion on
//                                        the controls that exist today and misses the next one written
//   INFO  the motion census           — src writes per kind, and the guard's selectors and declarations
//
// Deliberately NOT enforced: that a page animate anything, and NOT any `@keyframes` the SHEET carries that
// no file in src/ writes. Tailwind v4 emits `@keyframes spin` and `.animate-spin{animation:var(--animate-spin)}`
// into every sheet whether or not a page paints them, so a gate that fires on a sheet-level keyframe fires
// on a utility no visitor sees — the same trap `check:css-utilities` (D253) reports from the other side.
// Authority for "motion ships" is therefore the writes src/ makes; the built sheet is only ever asked
// "did the guard ship?". A guard's own declarations are never counted as motion writes, which is why the
// guard block is removed before the census runs.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return i < 0 ? resolve('dist/client') : args[i + 1];
})();
const SRC = (() => {
  const i = args.indexOf('--src');
  return i < 0 ? resolve('src') : args[i + 1];
})();

/** Comments are prose. A guard written inside a comment is not a guard, and a motion word in a sentence
 *  is not a write — DESIGN.md's mandate sentence for this very rule lives inside a stylesheet comment, so
 *  counting comments would make this gate green by reading the mandate. `check:focus` makes the same call:
 *  it plants "the defect quoted inside a comment" as a case that must NOT fire. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');
const stripMarkupComments = (html) => html.replace(/<!--[\s\S]*?-->/g, ' ');
const stripLineComments = (text) => text.replace(/(^|[^\S\n])\/\/[^\n]*/g, '$1');

/** A guard is a BLOCK, not the string "prefers-reduced-motion": a gate that matched the string would call
 *  a comment, or a media query that names the feature and guards nothing, a guard. Braces are balanced
 *  rather than assumed because the shipped sheet is one minified line. */
function mediaBlocks(css) {
  const out = [];
  const re = /@media\b\s*([^{]*)\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    out.push({ prelude: m[1].trim(), body: css.slice(m.index + m[0].length, i - 1) });
  }
  return out;
}

const REDUCED = /prefers-reduced-motion/;
const guards = (css) => mediaBlocks(stripCssComments(css)).filter((b) => REDUCED.test(b.prelude));

/** Does a guard stop the motion this tree ships? A declaration of a colour does not; `!important` and `0s` do.
 *  Folded over every guard block, because a guard may be written in more than one place. */
const neutralisesTransition = (blocks) => blocks.some((b) =>
  /transition(-property)?\s*:\s*(none|0)/.test(b.body) || /transition-duration\s*:\s*0/.test(b.body));
const neutralisesAnimation = (blocks) => blocks.some((b) =>
  /animation(-name)?\s*:\s*none/.test(b.body) || /animation-duration\s*:\s*0/.test(b.body));
/** A guard may only be trusted for what it selects. `*` is the only selector list that covers a control
 *  that does not exist yet, and the site adds controls faster than it adds guards. */
const guardsEverything = (blocks) => blocks.some((b) =>
  b.body.split('}').some((chunk) => {
    const sel = chunk.split('{')[0].trim();
    return /(^|[,>\s])\*([,\s]|$)/.test(sel);
  }));
const guardSelectors = (blocks) => [...new Set(blocks.flatMap((b) => b.body.split('}'))
  .map((chunk) => chunk.split('{')[0].trim().replace(/\s+/g, ' ')).filter(Boolean))];
const guardDecl = (blocks) => [...new Set(blocks.flatMap((b) => b.body.split('}'))
  .flatMap((chunk) => (chunk.split('{')[1] ?? '').split(';'))
  .map((d) => d.split(':')[0].trim()).filter(Boolean))];

/** Which motion this tree WRITES — the authority for "motion ships". Class tokens in markup, declarations
 *  in CSS, with comments and the guard's own neutralising declarations removed so the guard never reads
 *  as motion that needs guarding. */
function motionWrites(files /* [[name, text]] */) {
  let transitions = 0, animations = 0;
  for (const [name, raw] of files) {
    const css = name.endsWith('.css');
    const text = stripLineComments(stripMarkupComments(css ? stripCssComments(raw) : raw));
    const bare = css
      ? mediaBlocks(text).reduce((c, b) => REDUCED.test(b.prelude) ? c.replace(b.body, ' ') : c, text)
      : text;
    if (css) {
      transitions += (bare.match(/(^|[;{\s])transition(-property|-duration|-delay|-timing-function)?\s*:/g) ?? []).length;
      animations += (bare.match(/@keyframes\s+[a-zA-Z-]+|(^|[;{\s])animation(-name|-duration)?\s*:/g) ?? []).length;
    } else {
      transitions += (bare.match(/\btransition\b/g) ?? []).length;
      animations += (bare.match(/\banimate-[a-z][a-z0-9-]*/g) ?? []).length;
    }
  }
  return { transitions, animations };
}

// ------------------------------------------------------------------ the verdict

/** Pure verdict over `{srcFiles, authored, built}` so the selftest plants a deleted guard, a commented
 *  guard, an inert guard and an artifact-only guard in memory: no build, no disk (D118 — the defect is
 *  caught on the branch that introduced it). */
export const reducedMotionFindings = ({ srcFiles, authored, built }) => {
  const fails = [];
  const motion = motionWrites(srcFiles);
  if (motion.transitions + motion.animations === 0) return fails; // nothing ships, nothing to guard

  const authoredGuards = authored.flatMap(([, css]) => guards(css));
  const builtGuards = built.flatMap(([, css]) => guards(css));

  if (!builtGuards.length) {
    if (!authoredGuards.length) {
      const namedInProse = authored.some(([, css]) => REDUCED.test(css)) || srcFiles.some(([, t]) => REDUCED.test(t));
      fails.push({ rule: namedInProse ? 'guard-comment-only' : 'transition-unguarded', detail:
        `${namedInProse
          ? `the only "prefers-reduced-motion" in src/ is prose inside a comment (the mandate at src/styles/global.css, "is mandatory and lands with the markup") — the guard does not exist`
          : `no file in src/ or in the built sheets mentions prefers-reduced-motion`
        }, while src writes ${motion.transitions} transition(s) and ${motion.animations} animation(s). A reader who asks for reduced motion still gets every 150ms and 250ms hover fade.` });
      return fails;
    }
    fails.push({ rule: 'guard-not-shipped', detail:
      `a guard block is authored in src/styles and no built sheet carries one — the stylesheet stopped reaching the artifact, so what ships is the unguarded motion and the guard is invisible to every visitor` });
    return fails;
  }

  if (!authoredGuards.length) {
    fails.push({ rule: 'guard-in-artifact-only', detail:
      `a built sheet carries the guard and no src/styles file does — it was written into dist/, so the next build erases it and nothing failed on the branch that "fixed" it` });
  }

  if (!neutralisesTransition(builtGuards) && !neutralisesAnimation(builtGuards)) {
    fails.push({ rule: 'guard-neutralises-nothing', detail:
      `the shipped @media (prefers-reduced-motion) block sets ${guardDecl(builtGuards).join(', ') || 'no declarations at all'} and changes no transition or animation property — a guard that changes only a colour or a comment leaves every 150ms hover fade running at full speed for a reader who asked for none` });
  } else if (!neutralisesTransition(builtGuards) && motion.transitions) {
    fails.push({ rule: 'transition-unguarded', detail:
      `the shipped guard neutralises animation but not the ${motion.transitions} transition(s) src writes — hover states still fade over the 150/250ms tiers under a reduced-motion setting` });
  } else if (!neutralisesAnimation(builtGuards) && motion.animations) {
    fails.push({ rule: 'animation-in-src-unguarded', detail:
      `src writes ${motion.animations} animation(s) and the shipped guard neutralises only transitions — the keyframe still runs for a reader who asked for reduced motion` });
  }

  if ((neutralisesTransition(builtGuards) || neutralisesAnimation(builtGuards)) && !guardsEverything(builtGuards)) {
    fails.push({ rule: 'guard-scope-narrow', detail:
      `the shipped guard selects ${guardSelectors(builtGuards).join(' | ')} and never \`*\` — it stops the motion on the controls that happen to exist today, and the next control written inherits a 150ms fade with nothing to stop it` });
  }
  return fails;
};

export const motionCensus = (srcFiles) => motionWrites(srcFiles);

// ------------------------------------------------------------------ the selftest

/** The guard as this item lands it in `src/styles/global.css`, verbatim, so the clean control is the
 *  artifact rather than a sketch. */
const SHIPPED_GUARD = `
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    animation-name: none !important;
    animation-duration: 0s !important;
  }
}`;

/** The motion the shipped tree writes: Tailwind `transition` class tokens on the controls, with their
 *  `hover:` fills, and `ease-out duration-250` on the movement. No `animate-*` in src/. */
const SHIPPED_SRC = [
  ['src/components/Schedule.astro', '<button class="bg-ink hover:bg-accent-strong transition">Join</button>'],
  ['src/components/Navigation.astro', '<a class="hover:bg-tint transition ease-out duration-250">Nav</a>'],
  ['src/styles/global.css', `/* prefers-reduced-motion: reduce is mandatory and lands with the markup in design-apply (0 occurrences in src/ today). */
@theme { --default-transition-duration: 150ms; --default-transition-timing-function: linear; }`],
];
/** Tailwind's own motion, emitted whether or not a page paints it — the trap this gate must not fall into. */
const TAILWIND_SPIN = '@keyframes spin{to{transform:rotate(360deg)}}.animate-spin{animation:var(--animate-spin)}';

const runSelftest = () => {
  const cases = [
    {
      name: 'clean control: the shipped guard, authored and built, neutralising both, selecting *',
      src: [...SHIPPED_SRC, ['src/styles/global.css', SHIPPED_GUARD]],
      authored: [['src/styles/global.css', '@theme { --radius-card: 6px; }' + SHIPPED_GUARD]],
      built: [['dist/client/_astro/Footer.CIGlQK5A.css', '.card{border-radius:var(--radius-card)}' + TAILWIND_SPIN + SHIPPED_GUARD]],
      want: [],
    },
    {
      name: "the shipped sheet with the guard block deleted (today's artifact)",
      src: [...SHIPPED_SRC, ['src/styles/global.css', SHIPPED_GUARD]],
      authored: [['src/styles/global.css', '@theme { --radius-card: 6px; }' + SHIPPED_GUARD]],
      built: [['dist/client/_astro/Footer.CIGlQK5A.css', '.card{border-radius:var(--radius-card)}' + TAILWIND_SPIN]],
      want: ['guard-not-shipped'],
    },
    {
      name: 'a guard written but commented out — DESIGN.md says this does not count',
      src: SHIPPED_SRC,
      authored: [['src/styles/global.css', `@theme { --radius-card: 6px; }
/* @media (prefers-reduced-motion: reduce) { *, ::before, ::after { transition-duration: 0s !important; animation-name: none !important; } } */`]],
      built: [['dist/client/_astro/Footer.CIGlQK5A.css', '.card{border-radius:var(--radius-card)}' + TAILWIND_SPIN]],
      want: ['guard-comment-only'],
    },
    {
      name: 'a guard that sets only a colour',
      src: [...SHIPPED_SRC, ['src/styles/global.css', '@media (prefers-reduced-motion: reduce) { * { color: var(--color-ink); } }']],
      authored: [['src/styles/global.css', '@media (prefers-reduced-motion: reduce) { * { color: var(--color-ink); } }']],
      built: [['dist/client/_astro/Footer.CIGlQK5A.css', '.card{border-radius:var(--radius-card)}@media (prefers-reduced-motion: reduce) { * { color: var(--color-ink); } }']],
      want: ['guard-neutralises-nothing'],
    },
    {
      name: 'a guard scoped to .notice while motion ships on controls',
      src: [...SHIPPED_SRC, ['src/styles/global.css', '@media (prefers-reduced-motion: reduce) { .notice { transition-duration: 0s; animation-name: none; } }']],
      authored: [['src/styles/global.css', '@media (prefers-reduced-motion: reduce) { .notice { transition-duration: 0s; animation-name: none; } }']],
      built: [['dist/client/_astro/Footer.CIGlQK5A.css', '.notice{border:1px var(--color-rule)}@media (prefers-reduced-motion: reduce) { .notice { transition-duration: 0s; animation-name: none; } }']],
      want: ['guard-scope-narrow'],
    },
    {
      name: 'a page writes animate-pulse and the guard neutralises only transitions',
      src: [...SHIPPED_SRC.map(([f, t]) => [f, t + ' class="animate-pulse"']), ['src/styles/global.css', '@media (prefers-reduced-motion: reduce) { * { transition-duration: 0s; } }']],
      authored: [['src/styles/global.css', '@media (prefers-reduced-motion: reduce) { * { transition-duration: 0s; } }']],
      built: [['dist/client/_astro/Footer.CIGlQK5A.css', TAILWIND_SPIN + '@media (prefers-reduced-motion: reduce) { * { transition-duration: 0s; } }']],
      want: ['animation-in-src-unguarded'],
    },
    {
      name: 'a guard written into the built sheet and never into src/',
      src: SHIPPED_SRC,
      authored: [['src/styles/global.css', '@theme { --radius-card: 6px; }']],
      built: [['dist/client/_astro/Footer.CIGlQK5A.css', '.card{border-radius:var(--radius-card)}' + TAILWIND_SPIN + SHIPPED_GUARD]],
      want: ['guard-in-artifact-only'],
    },
    {
      name: 'clean control: Tailwind emits @keyframes spin and .animate-spin, src writes no animation',
      src: [['src/components/Navigation.astro', '<a class="hover:bg-tint transition">Nav</a>'], ['src/styles/global.css', SHIPPED_GUARD]],
      authored: [['src/styles/global.css', SHIPPED_GUARD]],
      built: [['dist/client/_astro/Footer.CIGlQK5A.css', TAILWIND_SPIN + SHIPPED_GUARD]],
      want: [],
    },
    {
      name: 'clean control: a sheet with no motion written anywhere, and nothing to guard',
      src: [['src/pages/past.astro', '<div class="text-label">Nothing moves here</div>'], ['src/styles/global.css', '@theme { --radius-card: 6px; }']],
      authored: [['src/styles/global.css', '@theme { --radius-card: 6px; }']],
      built: [['dist/client/_astro/Footer.CIGlQK5A.css', '.card{border-radius:var(--radius-card)}' + TAILWIND_SPIN]],
      want: [],
    },
  ];

  let bad = 0;
  for (const c of cases) {
    const found = reducedMotionFindings({ srcFiles: c.src, authored: c.authored, built: c.built });
    const got = found.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = !miss.length && !extra.length;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(72)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
    if (!ok) for (const f of found) console.log(`        ${f.rule}: ${f.detail}`);
  }
  console.log(`\ncheck:reduced-motion selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
};

// ------------------------------------------------------------------ the run

const readSrcFiles = () => {
  if (!existsSync(SRC)) {
    console.error(`check:reduced-motion: ${SRC} missing — this gate reads src/, run it from the repo root.`);
    process.exit(1);
  }
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
    return /\.(css|astro|svelte|ts|js|mjs)$/.test(e.name) ? [[p.replace(`${SRC}/`, ''), readFileSync(p, 'utf8')]] : [];
  });
  return walk(SRC);
};

const readBuilt = () => {
  if (!existsSync(DIST)) {
    console.error(`check:reduced-motion: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
    process.exit(1);
  }
  const sheets = readdirSync(DIST, { recursive: true }).map(String)
    .filter((f) => f.endsWith('.css')).map((f) => [f, readFileSync(resolve(DIST, f), 'utf8')]);
  const inline = readdirSync(DIST, { recursive: true }).map(String)
    .filter((f) => f.endsWith('.html')).flatMap((f) => [...readFileSync(resolve(DIST, f), 'utf8').matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => [`${f} <style>`, m[1]]));
  return [...sheets, ...inline];
};

const runReal = () => {
  const srcFiles = readSrcFiles();
  const authored = srcFiles.filter(([f]) => f.endsWith('.css'));
  const built = readBuilt();
  const motion = motionWrites(srcFiles);
  const builtGuards = built.flatMap(([, css]) => guards(css));
  const authoredGuards = authored.flatMap(([, css]) => guards(css));
  const fails = reducedMotionFindings({ srcFiles, authored, built });
  console.log(`src: ${srcFiles.length} files (${authored.length} stylesheets) — motion writes: transitions ${motion.transitions}, animations ${motion.animations} (guard blocks and comments excluded)`);
  console.log(`guards: ${authoredGuards.length} authored block(s), ${builtGuards.length} built block(s) over ${built.length} sheet(s) (dist css + inline <style>)`);
  if (builtGuards.length) {
    console.log(`built guard selectors: ${guardSelectors(builtGuards).join(' | ')}`);
    console.log(`built guard declarations: ${guardDecl(builtGuards).join(' ')} — transition neutralised ${neutralisesTransition(builtGuards)}, animation neutralised ${neutralisesAnimation(builtGuards)}, covers \`*\` ${guardsEverything(builtGuards)}`);
  }
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  console.log(fails.length
    ? `\n${fails.length} finding(s).`
    : `\nsrc ships ${motion.transitions} transition(s) and ${motion.animations} animation(s); every built sheet carries a guard that neutralises them, selecting \`*\`. Tailwind's own unused @keyframes spin was not mistaken for a shipped animation.`);
  process.exit(fails.length ? 1 : 0);
};

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) (selftest ? runSelftest : runReal)();
