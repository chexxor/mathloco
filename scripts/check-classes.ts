// Tailwind class gate.
//
// Every class token written in a class attribute under src/ must resolve to CSS.
//
// Why this exists: `astro check` and the build do not care whether a class name is real, and
// two typos survived in this repo for years because nothing in the loop could see them —
// `focus:shadow-outline-blue` (a Tailwind 2 name; it generated nothing, so keyboard focus was
// invisible on all three primary buttons) and `md:max-w-1xl`. Scrolling the built stylesheet
// for `.class{` found both, but escaping selectors (`hover\:bg-blue-700`, `md\:max-w-2xl`,
// arbitrary values) is error-prone and the stylesheet is a downstream artifact.
//
// The oracle here is Tailwind's own: `@tailwindcss/node` loads the design system straight from
// `src/styles/global.css` — the same `@import "tailwindcss"`, `@plugin` and `@theme` the build
// uses — and `candidatesToCss()` answers per candidate: CSS string, or `null` when the candidate
// resolves to nothing. So "is this class real" is answered by the resolver, not by a regex or by
// memory of which utilities exist in v4. It needs no build, and it is exact for variants
// (`md:`, `hover:`, `focus-visible:`), arbitrary values (`mt-[13px]`), negative values (`-mt-2`)
// and this project's own theme keys (`bg-book-yellow`, `font-body`).
//
// That oracle alone is not enough, and the first run of this gate proved it: `love` is used on the
// footer's ∑ and defined by hand in a `<style lang="scss" is:global>` block in `src/layouts/Layout.astro`
// (with `@keyframes love`), so Tailwind answers `null` for it and the gate called a working
// animation dead. Hence a second oracle: class selectors written in `.css` files and `<style>`
// blocks (plus Tailwind 4 `@utility` names) count as defined. Anything neither oracle claims is a
// violation, and the run names which oracle accepted each token.
//
// Known blind spot, reported rather than hidden: dynamic class attributes (`class:list={…}`,
// `class={…}`) hold expressions, not literal class strings, so they are listed as unchecked.
//
// Usage: npm run check:classes  [-- --verbose]

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { __unstable__loadDesignSystem } from '@tailwindcss/node';

const SRC = 'src';
const THEME_CSS = join('src', 'styles', 'global.css');
const CLASS_EXTENSIONS = new Set(['.astro', '.svelte', '.tsx', '.jsx', '.vue', '.html', '.md']);
const CSS_EXTENSIONS = new Set(['.css']);

/**
 * Tailwind markers that carry no CSS of their own and are only ever hooks for another element's
 * `group-*:`/`peer-*:` variants, so a `null` from the oracle is expected, not a bug.
 * Reported as skipped rather than silently ignored.
 */
const STRUCTURAL_MARKERS = ['group', 'peer'];
const isStructuralMarker = (token: string) =>
  STRUCTURAL_MARKERS.some((m) => token === m || token.startsWith(`${m}/`));

/**
 * Characters that can never appear in a class name: the token is an expression, not a class.
 * `!` is deliberately absent — Tailwind 4's important marker works in both positions (`!px-2` and
 * `px-2!`, also `md:!px-2`) and all three forms resolve, so excluding `!` would leave important
 * utilities unchecked.
 */
const NON_CLASS_CHARS = /[{}()[\];,<>=?|&$`\\'"]/;

type Located = { token: string; file: string; line: number };

function sourceFiles(dir: string, extensions: Set<string>): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full, extensions));
    else if (extensions.has(entry.slice(entry.lastIndexOf('.')))) out.push(full);
  }
  return out.sort();
}

/**
 * Second oracle. Tailwind is not the only thing that defines a class here: `src/layouts/Layout.astro`
 * carries a `<style lang="scss" is:global>` block with `.love { animation: love ... }` plus
 * `@keyframes love`, which drives the footer's ∑. `candidatesToCss()` answers `null` for `love`
 * because that block never goes through Tailwind at all — so a gate that trusts only the Tailwind
 * resolver reports it dead, and "fixing" it silently deletes a working animation.
 *
 * Hand-written class selectors in `.css` files and in `<style>` blocks (and Tailwind 4 `@utility`
 * names) are therefore collected and honoured as their own source of truth.
 */
function projectDefinedClasses(files: string[]): Set<string> {
  const names = new Set<string>();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const blocks: string[] = [];
    if (file.endsWith('.css')) blocks.push(text);
    for (const match of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) blocks.push(match[1] ?? '');

    for (const block of blocks) {
      for (const match of block.matchAll(/@utility\s+([\w-]+)/g)) names.add(match[1]);

      // Strip declaration bodies (innermost first, so nesting collapses) and read class
      // selectors off the survivors: `.5em` in a value must not be mistaken for a class.
      let selectors = block;
      let previous: string;
      do {
        previous = selectors;
        selectors = selectors.replace(/\{[^{}]*\}/g, '{}');
      } while (selectors !== previous);
      for (const match of selectors.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) names.add(match[1]);
    }
  }
  return names;
}

/**
 * Class attributes, not every word-shaped token in the file: the extractor in Tailwind's scanner
 * is deliberately loose (it would hand back prose words and identifiers), and the oracle answers
 * `null` for all of those. So the gate looks at the places classes are actually written.
 */
function classAttributes(
  file: string,
  text: string,
): { located: Located[]; blindSpots: Set<string> } {
  const located: Located[] = [];
  const blindSpots = new Set<string>();
  const lineOf = (index: number) => text.slice(0, index).split('\n').length;

  // Both quote styles appear in this repo (22 of the class attributes are single-quoted, all in
  // HeroSection.astro and Footer.astro), so accepting only `"` silently leaves those unchecked.
  for (const match of text.matchAll(/class\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const value = match[1] ?? match[2] ?? '';
    const start = (match.index ?? 0) + match[0].indexOf(value);
    for (const token of value.split(/\s+/)) {
      if (!token || NON_CLASS_CHARS.test(token)) continue;
      located.push({ token, file, line: lineOf(start) });
    }
  }

  // Dynamic class attributes (Astro `class:list={…}`, Svelte `class={…}` / `class:foo`) hold
  // expressions, not literal class strings; a regex over them would both invent tokens and miss
  // real ones. They are reported as blind spots so the gap is visible instead of assumed clean.
  for (const match of text.matchAll(/class(?::\w+)?\s*=\s*\{/g)) {
    blindSpots.add(`${file}:${lineOf(match.index ?? 0)}`);
  }
  for (const match of text.matchAll(/^\s*(?:class:)([\w-]+)/gm)) {
    const token = match[1];
    if (token) located.push({ token, file, line: lineOf(match.index ?? 0) });
  }

  return { located, blindSpots };
}

/** Bounded Levenshtein: enough to name the class the author almost typed. */
function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      best = Math.min(best, row[j]);
    }
    if (best > limit) return limit + 1;
    prev = row;
  }
  return prev[b.length];
}

function suggest(candidate: string, names: string[]): string | undefined {
  // Suggest against the utility part: a typo is usually there, and variants multiply the
  // edit distance without saying anything useful.
  const parts = candidate.split(':');
  const utility = parts[parts.length - 1];
  const prefix = parts.slice(0, -1);
  const limit = Math.max(2, Math.floor(utility.length / 3));

  let best: { name: string; d: number } | undefined;
  for (const name of names) {
    const d = distance(utility, name, best?.d ?? limit);
    if (d <= limit && (!best || d < best.d)) best = { name, d };
  }
  if (!best) return undefined;
  return [...prefix, best.name].join(':');
}

// (no top-level await: tsx transpiles .ts in this project to CJS, which rejects it)
async function main(): Promise<void> {
  const verbose = process.argv.includes('--verbose');

  const markupFiles = sourceFiles(SRC, CLASS_EXTENSIONS);
  const cssFiles = sourceFiles(SRC, CSS_EXTENSIONS);
  const all: Located[] = [];
  const blindSpots = new Set<string>();
  for (const file of markupFiles) {
    const text = readFileSync(file, 'utf8');
    const { located, blindSpots: spots } = classAttributes(file, text);
    all.push(...located);
    for (const spot of spots) blindSpots.add(spot);
  }

  // One location per distinct name: the oracle is per candidate, and reporting a typo once per
  // occurrence would bury the fix when the same typo is copy-pasted across a component.
  const unique = [...new Map(all.map((l) => [l.token, l])).values()];

  const designSystem = await __unstable__loadDesignSystem(readFileSync(THEME_CSS, 'utf8'), {
    base: process.cwd(),
  });
  const own = projectDefinedClasses([...markupFiles, ...cssFiles]);

  const structural = unique.filter((l) => isStructuralMarker(l.token));
  const handWritten = unique.filter((l) => own.has(l.token) && !isStructuralMarker(l.token));
  const checkable = unique.filter((l) => !own.has(l.token) && !isStructuralMarker(l.token));
  const css = designSystem.candidatesToCss(checkable.map((l) => l.token));
  const dead = checkable.filter((_, i) => css[i] === null);

  console.log(`files: ${markupFiles.length} markup + ${cssFiles.length} css under ${SRC}/`);
  console.log(
    `class tokens: ${all.length} written, ${unique.length} distinct — ` +
      `${checkable.length} through the Tailwind resolver, ${handWritten.length} hand-written in ` +
      `project CSS, ${structural.length} structural marker(s)`,
  );
  console.log(`oracles: Tailwind design system from ${THEME_CSS}; class selectors in .css and <style> blocks`);

  if (blindSpots.size > 0) {
    console.log('\nnot covered (dynamic class attributes: expressions, not literal strings):');
    for (const spot of [...blindSpots].sort()) console.log(`  ${spot}`);
  }

  if (verbose) {
    console.log('\nchecked:');
    for (const l of checkable) console.log(`  tailwind       ${l.token}\t${l.file}:${l.line}`);
    for (const l of handWritten) console.log(`  project css    ${l.token}\t${l.file}:${l.line}`);
    for (const l of structural) console.log(`  marker         ${l.token}\t${l.file}:${l.line}`);
  }

  if (dead.length > 0) {
    const names = designSystem.getClassList().map(([name]) => name);
    console.error(`\n${dead.length} class name(s) generate no CSS from either oracle:`);
    for (const v of dead) {
      const suggestion = suggest(v.token, names);
      console.error(`  ${v.file}:${v.line}  ${v.token}${suggestion ? `  ->  ${suggestion}` : ''}`);
    }
    console.error(
      '\nSuch a class renders as nothing: the element keeps its other classes and silently loses\n' +
        `this one. Fix the name, or drop it. Nothing is assumed here: ${THEME_CSS} supplies the\n` +
        'Tailwind side (including this project\'s --color-book-* and --font-body theme keys) and\n' +
        'class selectors written in .css files and <style> blocks supply the hand-written side.',
    );
    process.exit(1);
  }

  console.log('\nclass gate passed: every written class name resolves to CSS.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(2);
});
