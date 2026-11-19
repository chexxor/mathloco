#!/usr/bin/env node
/**
 * check:token-usage — every token `@theme` defines is written in src/, or reserved by a written ruling.
 *
 *   npm run check:token-usage             # over src/styles/global.css, src/, and the built sheets
 *   npm run check:token-usage:selftest    # plant each defect class, require each named verdict
 *   npm run check:token-usage --census    # per-domain travel report, for a prose claim that cites numbers
 *
 * The rule, written in DESIGN.md before this gate demands it (MS36, GAP-ANALYSIS §2 rank 10 — the corpus
 * rows `atlassian/tokens-governance-versioning.md#A18-gov-02` ("You must ONLY use tokens listed in this
 * document, do not make up values") and `spectrum/tokens-governance-versioning.md#S18-token-08` (a
 * component-specific set with the refusal stated). What is stolen is their CONTRACT — a closed set a build
 * can fail against — never their registry, migration CLI or eslint preset: GAP §5's `DRAFT·token-registry-file`
 * refuses the machine, and this gate is what makes that refusal honest rather than aspirational.
 *
 * Why it exists (2026-11-18, MS36): the palette lives in one file and is travelled unevenly, and nothing
 * could name the gap. `check:css-utilities` (D253) reads the far side of the same fact — utilities in the
 * shipped CSS that no file in src/ writes — and `check:contrast` only ever sees a colour that IS painted.
 * Neither reads a `--token` in `@theme` that nobody reads back, which is already the state of the elevation
 * pair ("ship defined-but-unused until the first menu", D105) and is the state of the join-path hues: 16
 * `path-*` tokens defined, 2 painted, and `git log --all -S 'inset-shadow-path-'` returning only the token
 * block and a prose round — the chip ring never shipped in a component.
 *
 * States per token: written (a class in src/, outside comments) | reserved (in the allowlist, with its ruling)
 * | emitted (a built sheet reads it and nothing in src/ names it — D253's prose class) | comment-only (named
 * in a comment only) | orphan | companion-orphan (a `--line-height` with no step).
 *
 * What counts as a PAINT is decided against the artifact, not the sheet. `var(--token)` inside a built rule
 * proves only that Tailwind saw the class name somewhere in the scanned tree — and prose names class names,
 * which is D253's whole finding. So a token travels when a class for it is written in src/ outside prose,
 * or when a built HTML page carries that class in a `class=` attribute. A sheet rule with neither is reported
 * as a NOTE, not a finding: the reservation still holds, and the bytes those rules cost are `check:css-utilities`'s
 * count. This is why the reservation record and the artifact cannot quietly disagree in either direction.
 *
 * Verdicts:
 *   FAIL  orphan-token              — declared, written by no class in src/, read by no built sheet, not reserved
 *   FAIL  used-in-comment-only      — its only src/ evidence is its class name inside a comment or backticks
 *   FAIL  companion-no-base         — a `--text-X--line-height` in `@theme` with no `--text-X` beside it
 *   FAIL  retired-token-still-read  — the inline RETIRED record (D316/D117) names a token gone, and a class
 *                                     for it is still written or a sheet still reads it
 *   FAIL  allowlist-entry-absent    — the allowlist reserves a name `@theme` no longer declares
 *   FAIL  allowlist-entry-written   — the allowlist reserves a name a src/ file writes OR a built page paints
 *   note  reserved-rule-in-sheet    — a reserved token has a rule in the built sheet because a SENTENCE names
 *                                     the class (D253's scan), while no src/ write and no built page carry it
 *
 * Two traps this gate survives, both measured here rather than reasoned:
 *   1. `--inset-shadow-*`, `--breakpoint-*`, `--radius-*`, `--shadow-*`, `--leading-*`, `--font-*` and
 *      `--container-*` are NAMESPACE-DEFINITION tokens: Tailwind derives classes and media queries from
 *      them, so `var(--inset-shadow-rule)` appears in NO sheet even though `.inset-shadow-rule` is in the
 *      shipped CSS — the built rule is `.inset-shadow-rule{--tw-inset-shadow:inset 0 0 0 1px var(--tw-inset-shadow-color,var(--color-rule))}`,
 *      derived from the VALUE string. For those the honest unit is the src/ write count; a dist read count
 *      of 0 must not call them unused. The reverse case is real too: `--spacing`, `--font-sans` and
 *      `--default-transition-*` are never written by name and are read by a Tailwind default — travelled,
 *      not orphans.
 *   2. A comment naming a class reads as a write. The round-8 census counted `--shadow-e2` as used because
 *      src/components/Navigation.astro mentions it in a comment — the same class of trap as "a guard inside
 *      a comment does not count" (§1 rank 8, and `check:reduced-motion`'s load-bearing strip). So the strip
 *      below is the whole point, and the selftest plants it.
 *
 * A `var(--token)` reference inside the `@theme` block is a DEFINITION composing another token, not a use:
 * `--inset-shadow-path-calendar` composes `--color-path-calendar`, and calling that a write would call the
 * reserved chip machinery travelled before anything painted it. Writes are counted outside the token file.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const censusMode = args.includes('--census');
const flag = (name, dflt) => { const i = args.indexOf(name); return i < 0 ? dflt : args[i + 1]; };
const TOKEN_FILE = flag('--token-file', 'src/styles/global.css');
const SRC = flag('--src', 'src');
const DIST = flag('--dist', 'dist/client');
const ALLOWLIST = resolve('design/token-usage-allowlist.json');

const rx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sameFile = (a, b) => resolve(a) === resolve(b);

/** Comments and backticked spans are prose: they NAME a class, they do not paint one. Astro and Svelte brace
 *  their comments, CSS and JS use block and line comments, and this repo's prose names classes in backticks
 *  — D253's whole finding is that a sentence can emit a utility, so prose must not count as a paint. */
function stripProse(text, file) {
  let out = text.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\{?\/\*[\s\S]*?\*\/\}?/g, ' ');
  if (/\.(ts|js|mjs)$/.test(file)) out = out.replace(/(^|[^\S\n])\/\/[^\n]*/g, '$1');
  return out.replace(/`[^`\n]*`/g, ' ');
}

/** The class Tailwind derives from a token, as regex alternatives. An empty list means the token has no
 *  derivable class — it is consumed by a Tailwind default, so only a var() read in a sheet counts. */
const VARIANT = '(?:[a-z][a-z0-9-]*:)*';
function classPatterns(name) {
  if (name.endsWith('--line-height')) return [];
  const n = rx(name);
  if (name.startsWith('color-')) return [`(?:text|bg|border|ring|fill|stroke|underline|decoration|outline|accent|caret|shadow|from|via|to|divide)-${n.slice(6)}`];
  if (name.startsWith('inset-shadow-')) return [`inset-shadow-${n.slice(13)}`];
  if (name.startsWith('shadow-')) return [`(?<!inset-)shadow-${n.slice(7)}`];
  if (name.startsWith('radius-')) return [`rounded-${n.slice(7)}`];
  if (name.startsWith('breakpoint-')) return [`${n.slice(11)}:`];
  if (name.startsWith('container-')) return [`(?:max-|min-)?w-${n.slice(10)}`];
  if (name.startsWith('text-')) return [`text-${n.slice(5)}`];
  if (name.startsWith('leading-')) return [`leading-${n.slice(8)}`];
  if (name.startsWith('font-')) return [`font-${n.slice(5)}`];
  if (name.startsWith('animate-')) return [`animate-${n.slice(8)}`];
  if (name === 'spacing') return [`(?:[pm](?:xy|[xytrbl])?|gap-x|gap-y|gap|space(?:-x|-y)?|w|h|max-w|min-w|top|bottom|left|right|leading)-\\d+`];
  return [];
}
const derivable = (name) => classPatterns(name).length > 0;

/** `@theme`'s body with balanced braces, then the declarations inside it. Comments are stripped before
 *  matching, so the RETIRED block ("`--color-book-gray` … are gone in this commit") never reads as a definition. */
function themeBlock(css) {
  const i = css.search(/@theme\s*\{/);
  if (i < 0) return { found: false, body: '' };
  const open = css.indexOf('{', i);
  let depth = 0;
  for (let k = open; k < css.length; k++) {
    if (css[k] === '{') depth++;
    else if (css[k] === '}') { depth--; if (depth === 0) return { found: true, body: css.slice(open + 1, k) }; }
  }
  return { found: true, body: css.slice(open + 1) };
}
const declared = (body) => [...new Set([...body.matchAll(/(?:^|[;{\s])--([a-z][a-z0-9-]*)\s*:/gm)].map((m) => m[1]))];
const commentText = (css) => [...css.matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g)].map((m) => m[0]).join('\n');
/** D316/D117's grammar: a comment that says RETIRED and names the token it retired with its D-id. */
const retiredNames = (css) => new Set(commentText(css).split(/(?=\bRETIRED\b)/i)
  .filter((chunk) => /\bRETIRED\b/i.test(chunk))
  .flatMap((chunk) => [...chunk.matchAll(/--([a-z][a-z0-9-]*)/g)].map((m) => m[1])));

// ------------------------------------------------------------------ the context

/** One build of everything the verdict and the census read, so a fixture and the disk tree go through
 *  identical code. Entries of `srcFiles` are [path, rawText]; the token file's own text is passed apart so
 *  a `var()` inside `@theme` never counts as a use. */
function build(input) {
  const { tokenFile, tokenFileSrc, srcFiles, sheets, allow } = input;
  const theme = themeBlock(tokenFileSrc);
  const names = theme.found ? declared(theme.body) : [];
  const other = srcFiles.filter(([f]) => !sameFile(f, tokenFile));
  const stripped = other.map(([f, raw]) => [f, stripProse(raw, f)]);
  const sheetText = sheets.map(([, css]) => css).join('\n');
  /** The built HTML pages: a class in a `class=` attribute is the one thing that proves a token travels. */
  const pages = input.pages ?? [];
  const pageClasses = pages.map(([f, html]) =>
    [f, [...html.matchAll(/\bclass=(['"])([\s\S]*?)\1/gi)].flatMap((m) => m[2].split(/\s+/)).filter(Boolean)]);

  /** A breakpoint needle ENDS in its colon (`xs:inline`), so the trailing "not a word char" guard that keeps
   *  `text-ink` from matching inside `text-ink-3` must not be appended to it — that guard is what made the
   *  shipped `xs:inline` write read as absent (measured: `--breakpoint-xs` reported comment-only before this). */
  const classRe = (name, global) => {
    const pats = classPatterns(name);
    if (!pats.length) return null;
    const tail = pats.every((p) => p.endsWith(':')) ? '' : '(?![\\w-])';
    return new RegExp(`(?<![\\w-])${VARIANT}(?:${pats.join('|')})${tail}`, global ? 'g' : undefined);
  };
  const writeFiles = (name) => {
    const re = classRe(name, false);
    if (!re) return [];
    return stripped.filter(([, text]) => re.test(text)).map(([f]) => f);
  };
  const writeCount = (name) => {
    const re = classRe(name, true);
    if (!re) return 0;
    return stripped.reduce((n, [, text]) => n + (text.match(re)?.length ?? 0), 0);
  };
  const sheetRead = (name) => sheetText.includes(`var(--${name})`);
  const companionBase = (name) => name.endsWith('--line-height') ? name.slice(0, -'--line-height'.length) : null;
  /** Built pages that carry a class for this token — the artifact's own proof that it travels. */
  const artifactPaint = (name) => {
    const re = classRe(name, true);
    if (!re) return [];
    return pageClasses.filter(([, cls]) => cls.some((t) => re.test(t))).map(([f]) => f);
  };
  /** Where a token's class name, or the token itself, appears in src/ INCLUDING comments and prose — the
   *  pair with writeFiles is what makes "named in prose, painted nowhere" a fact rather than a guess. */
  const mentionFiles = (name) => {
    const base = companionBase(name) ?? name;
    const needles = [...classPatterns(base), rx(bareClass(base))];
    const re = new RegExp(`(?<![\\w-])${VARIANT}(?:${needles.join('|')})(?![\\w-])`);
    const tokenRe = new RegExp(`--${rx(base)}(?![a-z0-9-])`);
    return other.filter(([, raw]) => re.test(raw) || tokenRe.test(raw)).map(([f]) => f);
  };

  const state = new Map();
  for (const n of names) {
    const base = companionBase(n);
    if (base && !names.includes(base)) { state.set(n, 'companion-orphan'); continue; }
    const writes = writeCount(n) + (base ? writeCount(base) : 0);
    if (allow.has(n)) state.set(n, 'reserved');
    else if (writes) state.set(n, 'written');
    else if (mentionFiles(n).length) state.set(n, 'comment-only');
    else if (sheetRead(n) || (base && sheetRead(base))) state.set(n, 'emitted');
    else state.set(n, 'orphan');
  }
  return { tokenFile, tokenFileSrc, srcFiles, other, stripped, sheetText, sheets, pages, pageClasses, theme, names, state, allow,
    writeCount, writeFiles, sheetRead, mentionFiles, companionBase, artifactPaint, retired: retiredNames(tokenFileSrc) };
}
const bareClass = (name) => name.replace(/--line-height$/, '');

// ------------------------------------------------------------------ the verdict

export const tokenUsageFindings = (input) => {
  const c = build(input);
  const fails = [];
  if (!c.theme.found) {
    return [{ rule: 'no-theme-block', detail: `${c.tokenFile} declares no \`@theme\` block — this repo keeps its tokens in exactly one file (D266's contract), so point the gate at that file rather than inventing a second home.` }];
  }
  if (!c.names.length) {
    return [{ rule: 'no-tokens-declared', detail: `\`@theme\` in ${c.tokenFile} declares no \`--token\` — the gate would read green over an empty set, which is the wrong verdict. Either the block was emptied or the declaration pattern no longer matches this formatting.` }];
  }

  for (const n of c.names) {
    const st = c.state.get(n);
    if (st === 'companion-orphan') {
      const base = c.companionBase(n);
      fails.push({ rule: 'companion-no-base', detail:
        `--${n} is declared in \`@theme\` in ${c.tokenFile} with no --${base} step beside it: Tailwind emits a line-height with no size, so a \`${base}\` class a page writes (\`text-${base.replace(/^text-/, '')}\`) gets leading with nothing to match it against. The ramp is ratified as pairs (D95) — restore the step, or delete the orphan leading.` });
      continue;
    }
    if (st === 'comment-only') {
      fails.push({ rule: 'used-in-comment-only', detail:
        `--${n} is named in src/ only inside a comment or a backticked span (${c.mentionFiles(n).join(', ')}), is written by no class, and nothing paints it — the token reads as used while nothing ships it, the same trap as "a guard inside a comment does not count". Paint the class, record the reservation in design/token-usage-allowlist.json beside the ruling that reserves it, or delete the sentence that names it.` });
      continue;
    }
    if (st !== 'orphan') continue;
    fails.push({ rule: 'orphan-token', detail:
      `--${n} is declared in \`@theme\` in ${c.tokenFile}, written by no class anywhere in src/, read by no built sheet, and not listed in design/token-usage-allowlist.json — ${derivable(n) ? `the class Tailwind derives from it (${classPatterns(n)[0].replace(/\\\(\?<!/g, '')} without its variant prefixes) appears in no class list` : `it is a bare token with no derivable class, so only a var() read in a built sheet would count it used`}. Fix by name: paint the class, retire it inline with its D-id (D316's grammar, so the reason survives the deletion), or add one allowlist line stating the ruling that reserves it.` });
  }

  for (const n of c.retired) {
    if (c.state.has(n)) continue;
    if (!derivable(n) && !c.sheetRead(n)) continue;
    const pats = classPatterns(n);
    const re = new RegExp(`(?<![\\w-])${VARIANT}(?:${pats.length ? pats.join('|') : rx(bareClass(n))})(?![\\w-])`);
    const stillWritten = c.stripped.filter(([, text]) => re.test(text)).map(([f]) => f);
    if (!stillWritten.length && !c.sheetRead(n)) continue;
    fails.push({ rule: 'retired-token-still-read', detail:
      `--${n} is recorded as RETIRED in ${c.tokenFile} with its D-id, and ${stillWritten.length ? `a class for it is still written in ${stillWritten.join(', ')}` : `a built sheet still reads var(--${n})`} — the inline record is the retirement's whole proof, so a page that still asks for the token makes that proof false. Move the write to the ratified token (D316 moved every \`text-gold\` write in one commit) or un-retire it.` });
  }

  for (const n of c.allow.keys()) {
    if (!c.state.has(n)) {
      fails.push({ rule: 'allowlist-entry-absent', detail:
        `design/token-usage-allowlist.json reserves --${n} and \`@theme\` in ${c.tokenFile} no longer declares it — the token was retired inline (D316/D117) and its reservation line stayed, so the record claims a reservation for a token that does not exist. Delete the line.` });
      continue;
    }
    const files = c.writeFiles(n);
    const painted = files.length ? files : c.artifactPaint(n);
    if (!painted.length) continue;
    fails.push({ rule: 'allowlist-entry-written', detail:
      `design/token-usage-allowlist.json reserves --${n} as unused, and ${painted.join(', ')} ${files.length ? 'writes a class for it' : 'carries a class for it in a built page\'s class attribute'} — the record contradicts the artifact, and a reserved token that travels is a rule a future session will re-read as "unused". Remove the line.` });
  }
  return fails;
};

/** A reserved token whose class has a rule in the built sheet but no writer in src/ and no carrier on any
 *  built page. The rule exists because a SENTENCE in the scanned tree names the class — D253's scan, not a
 *  paint — so the reservation holds and this is not a finding. It is printed because the reservation costs
 *  CSS bytes, and `check:css-utilities` is the gate that counts them. */
export const reservedRuleNotes = (input) => {
  const c = build(input);
  return [...c.allow.keys()].filter((n) => {
    if (!c.state.has(n) || c.state.get(n) !== 'reserved') return false;
    if (c.writeFiles(n).length || c.artifactPaint(n).length) return false;
    const base = c.companionBase(n);
    return c.sheetRead(n) || (base && c.sheetRead(base));
  }).map((n) => ({ rule: 'reserved-rule-in-sheet', detail:
    `--${n} is reserved in design/token-usage-allowlist.json and nothing in src/ or on a built page paints it, but the built sheet carries a rule reading var(--${n}) — Tailwind emits it because a sentence somewhere in the scanned tree names the class (D253). The reservation holds; those bytes are inside check:css-utilities' dead-utility count.` }));
};

/** Per-domain travel: how many of a domain's tokens are painted, and how many class writes exist. This is
 *  the tracked home for the numbers a prose claim cites, so a census never has to be re-derived in scratch. */
export const travelCensus = (input) => {
  const c = build(input);
  const domains = new Map();
  for (const n of c.names) {
    const head = n.split('-')[0];
    const d = domains.get(head) ?? { tokens: 0, travelled: 0, writes: 0, unused: [] };
    d.tokens++;
    d.writes += c.writeCount(n);
    const st = c.state.get(n);
    if (st === 'written' || st === 'reserved' || st === 'emitted') d.travelled++;
    else d.unused.push(`--${n}`);
    domains.set(head, d);
  }
  const states = {};
  for (const st of c.state.values()) states[st] = (states[st] ?? 0) + 1;
  return { tokens: c.names.length, srcFiles: c.stripped.length, sheets: c.sheets.length, states,
    domains: [...domains.entries()].sort((a, b) => b[1].writes - a[1].writes) };
};

// ------------------------------------------------------------------ the selftest

/** Representative `@theme`: every token in it either travels in FIXTURE_SRC or is reserved in FIXTURE_ALLOW,
 *  so the clean control is a tree with nothing to report and every failing case is a planting onto it. */
const FIXTURE_THEME = `
@theme {
  --color-paper: oklch(97.35% 0.0139 88.7);
  --color-ink: oklch(18.92% 0.0149 81.4);
  --color-path-calendar: oklch(51% 0.11 205);
  --color-path-meetup-on-ink: oklch(64% 0.15 315);
  --color-path-discord-on-ink: oklch(64% 0.15 262);
  /* chip tracks are flat on purpose: the hue keyline and the word carry the chip. */
  --color-path-calendar-tint: oklch(93% 0.03 205);
  --color-path-discord-tint: oklch(93% 0.03 262);
  /* keylines are inset shadows, never borders: a border adds 2px (D98). */
  --inset-shadow-rule: inset 0 0 0 1px var(--color-rule);
  /* elevation: nothing floats yet, so the pair ships defined-but-unused until the first menu (D105). */
  --shadow-e1: 0 1px 2px 0 rgba(23, 19, 12, 0.165);
  --shadow-e2: 0 2px 5px -1px rgba(23, 19, 12, 0.22);
  /* xs = 380px exists for the nav date chip (D311). */
  --breakpoint-xs: 380px;
  --container-measure: 32em;
  --text-label: 13.3px;
  --text-label--line-height: 16px;
  --text-display-2: 43.7px;
  --text-display-2--line-height: 48px;
  --radius-control: 6px;
  --radius-card: var(--radius-control);
  --font-body: "PT Serif", ui-serif, Georgia, serif;
  --leading-prose: 1.6;
  --spacing: 0.25rem;
  --default-transition-duration: 150ms;
  /* RETIRED (D316): --color-book-gray and the four dormant social-icon files it existed for are gone in this commit. */
}`;

const FIXTURE_SRC = [
  ['src/components/Footer.astro', `<a class='py-2 text-label font-medium text-path-meetup-on-ink hover:underline'>Meetup</a>
<a class='py-2 text-label font-medium text-path-discord-on-ink'>Discord</a>`],
  ['src/components/Schedule.astro', `<div class="bg-paper text-ink rounded-control inset-shadow-rule">card</div>
<a class='text-label text-path-calendar hover:text-accent'>Add to a calendar</a>
<div class="text-label py-2 rounded-control inset-shadow-rule">row</div>
<div class="rounded-card text-body font-body leading-prose max-w-measure">prose</div>
<div class="p-2 gap-4 w-5 h-5">ladder</div>`],
  ['src/components/Navigation.astro', `<a class="text-label xs:inline hover:bg-tint transition">Dates <span class="hidden text-label text-ink-3 tabular-nums">21 Nov</span></a>
{/* shadow-e2 is the ring a floating menu would carry; nothing floats yet */}`],
  ['src/styles/fonts.css', `@font-face { font-family: "PT Serif"; src: url("./fonts/pt-serif-latin.woff2"); }`],
];
const FIXTURE_SHEET =
  `.text-path-meetup-on-ink{color:var(--color-path-meetup-on-ink)}.text-path-discord-on-ink{color:var(--color-path-discord-on-ink)}.text-path-calendar{color:var(--color-path-calendar)}.text-label{font-size:var(--text-label);line-height:var(--text-label--line-height)}.text-display-2{font-size:var(--text-display-2);line-height:var(--text-display-2--line-height)}.inset-shadow-rule{--tw-inset-shadow:inset 0 0 0 1px var(--tw-inset-shadow-color,var(--color-rule))}.rounded-control{border-radius:var(--radius-control)}.rounded-card{border-radius:var(--radius-card)}.max-w-measure{max-width:var(--container-measure)}.leading-prose{line-height:var(--leading-prose)}.font-body{font-family:var(--font-body)}.p-2{padding:var(--spacing)*2}.gap-4{gap:var(--spacing)*4}.w-5{width:var(--spacing)*5}.py-2{padding-y:var(--spacing)*2}.transition{transition-duration:var(--default-transition-duration)}@media(min-width:380px){.xs-inline{display:inline}}`;
const FIXTURE_SHEETS = [['dist/client/_astro/Footer.Cf8uTf39.css', FIXTURE_SHEET]];

const FIXTURE_PAGES = [['dist/client/dates/index.html', `<a class="text-label font-medium text-path-calendar underline decoration-rule">Add to a calendar</a>
<a class='py-2 text-label font-medium text-path-meetup-on-ink hover:underline'>Meetup</a>
<a class='py-2 text-label font-medium text-path-discord-on-ink'>Discord</a>`]];

const fixtureAllow = () => new Map([
  ['shadow-e1', 'D105 — elevation stops are solved maths (the contact edge clears the 1.35 layer bar); nothing floats in src/ yet, so the pair ships defined-but-unused until the first menu.'],
  ['shadow-e2', 'D105 — the same pair. src/components/Navigation.astro names `shadow-e2` in a comment, which is a mention and not a paint.'],
  ['color-path-calendar-tint', 'MS36, DESIGN.md "Join-path hues" — the chip track a join-path chip would sit on; the chip row now says the construction is reserved rather than shipped, so the token stays defined.'],
  ['color-path-discord-tint', 'MS36, DESIGN.md "Join-path hues" — same reservation: a tint on paper measures 1.13, under the 1.35 layer bar, so a track is never the only cue.'],
]);

/** The shipped tree from disk, so a clean control is the artifact rather than a sketch. */
const diskInput = () => ({
  tokenFile: TOKEN_FILE,
  tokenFileSrc: readFileSync(TOKEN_FILE, 'utf8'),
  srcFiles: walk(SRC),
  sheets: readSheets(DIST),
  pages: readPages(DIST),
  allow: readAllowlist(),
});

const runSelftest = () => {
  /** The clean control is the SHIPPED tree, so it reads `dist/` like the gate does - which is why gate-run
   *  gives this step `needs: ['build']` too: run beside `build` in the same wave it raced a half-written
   *  artifact and crashed with a TypeError instead of a verdict (@measured 2026-11-19 in
   *  `.design/tmp-gate-logs/deploy/check:token-usage:selftest.txt`). Here it says so in words instead. */
  const disk = diskInput();
  if (!disk.sheets || !disk.pages.length) {
    console.error(`check:token-usage selftest: the clean control is the shipped tree, and ${DIST} hands it ${disk.sheets ? `${disk.sheets.length} sheet parts` : 'no built sheets'} and ${disk.pages.length} built pages - a control that cannot be read is not a pass. Run it after a build (npm run build, or through gate-run.mjs, which waits on needs: ['build']).`);
    process.exit(1);
  }
  const fixture = (over = {}) => ({
    tokenFile: 'src/styles/global.css',
    tokenFileSrc: over.theme ?? FIXTURE_THEME,
    srcFiles: over.src ?? FIXTURE_SRC,
    sheets: over.sheets ?? FIXTURE_SHEETS,
    pages: over.pages ?? FIXTURE_PAGES,
    allow: over.allow ?? fixtureAllow(),
  });
  const commentOut = (file, needle) => fixture({
    src: FIXTURE_SRC.map(([f, t]) => [f, f === file ? t.replace(needle, `/* ${needle.replace(/class='/g, '')} is reserved, not painted here */`) : t]),
  });

  const cases = [
    { name: 'clean control: the fixture tree, every token painted or reserved with a reason', want: [], input: fixture() },
    { name: 'clean control: the shipped tree at this tip (token file, src/, dist/ as they are)', want: [], input: disk },
    { name: 'a planted --color-orphan-test in @theme with no reference anywhere', want: ['orphan-token'],
      input: fixture({ theme: FIXTURE_THEME.replace('  --spacing: 0.25rem;', '  --spacing: 0.25rem;\n  --color-orphan-test: oklch(50% 0.1 200);') }) },
    { name: 'the calendar hue written only inside a comment: the token reads as used, nothing paints it', want: ['used-in-comment-only'],
      input: commentOut('src/components/Schedule.astro', "text-path-calendar") },
    { name: 'the numeric ladder written only in a comment, and the sheet no longer reads --spacing', want: ['used-in-comment-only'],
      input: (() => {
        const src = FIXTURE_SRC.map(([f, t]) => [f, f === 'src/components/Navigation.astro'
          ? `${t} {/* the ladder reads p-2 py-2 gap-4 w-5 h-5 in prose here */}`
          : t.replace(/["' ][a-z-]*-\d+(?= |"|')/g, ' ')]);
        const sheet = FIXTURE_SHEET.replace(/[.](?:p-2|gap-4|w-5|py-2)\{[^}]*\}/g, '');
        return fixture({ src, sheets: [['dist/client/_astro/Footer.Cf8uTf39.css', sheet]] });
      })() },
    { name: '--text-nobase--line-height declared with no --text-nobase step beside it', want: ['companion-no-base'],
      input: fixture({ theme: FIXTURE_THEME.replace('  --spacing: 0.25rem;', '  --spacing: 0.25rem;\n  --text-nobase--line-height: 48px;') }) },
    { name: 'a page still writes text-book-gray while the file records the token as RETIRED (D316)', want: ['retired-token-still-read'],
      input: fixture({ src: FIXTURE_SRC.map(([f, t]) => [f, f === 'src/components/Footer.astro' ? `${t} <span class="text-book-gray">retired</span>` : t]) }) },
    { name: 'the allowlist reserves a tint @theme no longer declares', want: ['allowlist-entry-absent'],
      input: fixture({ theme: FIXTURE_THEME.replace('  --color-path-discord-tint: oklch(93% 0.03 262);', '') }) },
    { name: 'the allowlist reserves a tint a page now paints', want: ['allowlist-entry-written'],
      input: fixture({ src: FIXTURE_SRC.map(([f, t]) => [f, f === 'src/components/Footer.astro' ? `${t} <div class="bg-path-discord-tint rounded-card">chip</div>` : t]) }) },
    { name: 'the allowlist reserves a tint no src/ file writes and no page paints, but a BUILT PAGE carries the class', want: ['allowlist-entry-written'],
      input: fixture({ pages: [...FIXTURE_PAGES, ['dist/client/join/index.html', '<span class="bg-path-calendar-tint rounded-card">chip</span>']] }) },
    { name: 'a breakpoint tier planted and never written: judged by writes, not by a var() read', want: ['orphan-token'],
      input: fixture({ theme: FIXTURE_THEME.replace('  --breakpoint-xs: 380px;', '  --breakpoint-xs: 380px;\n  --breakpoint-huge: 2400px;') }) },
  ];

  let bad = 0;
  for (const c of cases) {
    const found = tokenUsageFindings(c.input);
    const got = found.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = !miss.length && !extra.length;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   ' : 'FAIL '} ${c.name.padEnd(80)} ${[...new Set(got)].join(', ') || 'nothing reported'}${miss.length ? `   MISSING ${miss.join(', ')}` : ''}`);
    if (!ok) for (const f of found) console.log(`         ${f.rule}: ${f.detail.slice(0, 200)}`);
  }
  console.log(`\ncheck:token-usage selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
};

// ------------------------------------------------------------------ the run

function walk(dir) {
  return readdirSync(dir, { recursive: true }).map(String)
    .filter((f) => !f.includes('node_modules') && /\.(css|astro|svelte|ts|js|mjs|json)$/.test(f))
    .map((f) => [join(dir, f), readFileSync(resolve(dir, f), 'utf8')]);
}
function readSheets(dir) {
  if (!existsSync(dir)) return null;
  const sheets = readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.css'))
    .map((f) => [f, readFileSync(resolve(dir, f), 'utf8')]);
  const inline = readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.html'))
    .flatMap((f) => [...readFileSync(resolve(dir, f), 'utf8').matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => [`${f} <style>`, m[1]]));
  return [...sheets, ...inline];
}
function readPages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.html'))
    .map((f) => [f, readFileSync(resolve(dir, f), 'utf8')]);
}
function readAllowlist() {
  const m = new Map();
  if (!existsSync(ALLOWLIST)) return m;
  const j = JSON.parse(readFileSync(ALLOWLIST, 'utf8'));
  for (const e of (j.allow || [])) m.set(e.token ?? e.name, e.why ?? e.reason ?? '(no reason given in the file)');
  return m;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (selftest) runSelftest();
  if (!existsSync(TOKEN_FILE)) { console.error(`check:token-usage: ${TOKEN_FILE} missing — run it from the repo root, where the token file lives.`); process.exit(1); }
  if (!existsSync(SRC)) { console.error(`check:token-usage: ${SRC} missing — this gate reads src/, run it from the repo root.`); process.exit(1); }
  const sheets = readSheets(DIST);
  if (!sheets) { console.error(`check:token-usage: ${DIST} missing — the gate reads the artifact as well as src/, so build first (npm run build).`); process.exit(1); }
  /** The built HTML pages go in with the sheets: a class a built page carries in its `class=` attribute is the
   *  artifact's own proof that a token travels, and without this line the reservation contradiction could only
   *  ever be planted, never seen on the shipped tree (the selftest's own case for it would have been the only
   *  evidence the rule works). */
  const input = { tokenFile: TOKEN_FILE, tokenFileSrc: readFileSync(TOKEN_FILE, 'utf8'), srcFiles: walk(SRC), sheets, pages: readPages(DIST), allow: readAllowlist() };
  const cen = travelCensus(input);
  console.log(`tokens ${cen.tokens} in \`@theme\` (${cen.srcFiles} src/ files other than the token file, ${cen.sheets} sheet parts) — states: ${Object.entries(cen.states).map(([k, v]) => `${k} ${v}`).join(' ')}`);
  for (const [head, d] of cen.domains) {
    console.log(`  ${head}: ${d.travelled}/${d.tokens} travelled, ${d.writes} class writes${d.unused.length ? `  unused: ${d.unused.join(' ')}` : ''}`);
  }
  const notes = reservedRuleNotes(input);
  if (notes.length) {
    console.log(`\n${notes.length} note(s) (not findings): a reserved token whose class has a rule in the built sheet because a sentence names it (D253); the bytes are check:css-utilities' count.`);
    for (const f of notes) console.log(`  note ${f.rule}  ${f.detail}`);
  }
  if (censusMode) process.exit(0);
  const fails = tokenUsageFindings(input);
  if (!fails.length) {
    console.log(`\nno findings: every @theme token is written in src/, reserved in design/token-usage-allowlist.json with its ruling, read by a built sheet, or emitted for prose. Namespace-definition tokens were judged by their src/ writes, and a name inside a comment was not counted as a write.`);
    process.exit(0);
  }
  console.log(`\n${fails.length} finding(s):`);
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  process.exit(1);
}
