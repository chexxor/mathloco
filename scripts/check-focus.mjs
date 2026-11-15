#!/usr/bin/env node
// check:focus — every link and button in the artifact gets a visible focus ring, and nothing turns one off.
//
//   npm run check:focus            # over src/ + the built dist/client
//   npm run check:focus:selftest   # plant each defect, require each to FAIL, with the shipped files as control
//
// Rules, all of them about the ring the round-3 read asked for (§9, §12 criterion 9):
//   ring-suppressed        authored CSS sets `outline: none`, `outline: 0` or `outline-style: none`
//   no-global-ring         no rule covers `a:focus-visible` AND `button:focus-visible` with an outline
//   ring-too-thin          that rule's outline is under 2px
//   ring-no-offset         that rule sets an outline with no outline-offset (a ring glued to the glyph)
//   ring-not-a-token       that rule's colour is a hex or rgb literal rather than a @theme token
//   ring-under-bar         the ring's token measures under 3.0 against the paper it sits on
//   class-kills-the-ring   an anchor or button in the built HTML carries `outline-none` / `outline-hidden`
//
// Why this gate exists (2026-11-15, S043, D328): the round-3 read's criterion 9 is the one criterion this repo
// could not answer. `grep -rn "outline: none" src/` returned nothing — so the literal defect does not exist —
// but the reason the answer was "nothing" was that no rule existed either. Rings were written per component:
// `check:classes` proves a class resolves, `check:contrast` proves a colour pair clears its bar, and
// `check:render` cannot focus anything (DESIGN.md says so plainly, D104). Of the 91 anchors in the built pages,
// 24 carried no `focus-visible:*outline*` utility at all: the nav's four links, the 404 page's two in-sentence
// links, the plate captions. Those fell back to the browser default — a colour the oracle never measured, on a
// ground the palette record says nothing about. A ring that exists only where somebody remembered to write one
// is not a rule, so this gate asserts the rule: one global ring, token-coloured, 2px, offset 2px, and no rule
// anywhere that removes it.
//
// What it cannot do: paint a focused element. `design/grill/dist-measure.mjs` can set a class, not a focus
// state, so the ring's *appearance* stays the responsibility of DESIGN.md's ring rule (the band overrides with
// `outline-band-text` because `accent` on ink measures 2.97). This gate proves the rule is written, wired into
// the shipped stylesheet, and not undone anywhere.
//
// Cost @measured 2026-11-15 by `node scripts/check-focus.mjs` (Linux native, Node 24.22.1): 0.06s gate, 0.07s selftest.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { contrastTriple, parseOklch } from '../design/grill/okcolor.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const SRC = resolve(args.includes('--src') ? args[args.indexOf('--src') + 1] : 'src');
const DIST = resolve(args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist/client');

/** CSS with comments removed, so a doc comment that quotes the defect does not read as the defect.
 *  (The same rule `check:scale` and `check:copy` follow: a planting in a comment is not a shipped value.) */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

const SUPPRESS = /outline\s*:\s*(none|0|transparent)\b|outline-style\s*:\s*none\b/i;

/** Every `:focus-visible` rule in a stylesheet, as {selector, body}. */
const focusRules = (css) =>
  [...stripComments(css).matchAll(/([^{}]*:focus-visible[^{}]*)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: m[1].trim(), body: m[2].trim() }));

/** Pure verdict, so the selftest can plant CSS and HTML strings without a build. */
export const focusFindings = ({ authoredCss, builtCss, pages }) => {
  const fails = [];

  // 1. Nothing authored may suppress an outline.
  for (const [file, css] of authoredCss) {
    const hit = stripComments(css).match(SUPPRESS);
    if (hit) fails.push({ rule: 'ring-suppressed', detail: `${file}: ${hit[0]} — a focus ring cannot be removed by rule; the ring is the global one in src/styles/global.css` });
  }

  // 2. One rule must cover every link and every button.
  const rules = focusRules(builtCss);
  const ring = rules.find((r) => /\ba:focus-visible\b/.test(r.selector) && /\bbutton:focus-visible\b/.test(r.selector) && /outline/.test(r.body));
  if (!ring) {
    fails.push({ rule: 'no-global-ring', detail: "the shipped stylesheet has no rule putting an outline on both a:focus-visible and button:focus-visible. Without it a control's ring is whatever the browser guessed." });
    return fails;
  }

  // 3. It must be at least 2px, and it must have an offset.
  const width = (ring.body.match(/outline[^;]*?(\d+(?:\.\d+)?)px/) || [null, null])[1];
  if (!width || Number(width) < 2) {
    fails.push({ rule: 'ring-too-thin', detail: `the global ring is ${width || 'unset'}; DESIGN.md's ring is 2px, and a 1px ring on a 3:1 boundary is invisible at phone scale.` });
  }
  if (!/outline-offset\s*:\s*\d/.test(ring.body)) {
    fails.push({ rule: 'ring-no-offset', detail: 'the global ring sets an outline with no outline-offset: a ring drawn on the glyph is not a ring, it is underline soup.' });
  }

  // 4. Its colour is a token, and the token clears the 3.0 non-text bar against paper.
  const colour = (ring.body.match(/outline[^;]*?(var\(--color-[a-z0-9-]+\)|#[0-9a-f]{3,6}|rgb?\([^)]*\))/i) || [null, null])[1];
  if (!colour) {
    fails.push({ rule: 'ring-not-a-token', detail: `the global ring's colour is "${ring.body}" — the gate needs a token name to measure it against the ground.` });
  } else if (!colour.startsWith('var(')) {
    fails.push({ rule: 'ring-not-a-token', detail: `the global ring paints ${colour}, a literal the palette record never measured (check:contrast's rule 7 says the same about paint literals).` });
  } else {
    const name = colour.slice(4, -1);
    const tokens = {};
    for (const m of builtCss.matchAll(/--color-([a-z0-9-]+):\s*(oklch\([^)]*\))/g)) {
      // A token Tailwind emits with `none` as the hue (oklch(37.1% 0 none)) is not something this gate
      // can put a ratio on; skip it rather than crash, because the ring's own token is checked below.
      try { tokens[m[1]] = parseOklch(m[2]); } catch { /* unparseable hue: not a colour the ring uses */ }
    }
    const ringT = tokens[name.replace('--color-', '')];
    const paper = tokens.paper;
    if (ringT && paper) {
      const ratio = +contrastTriple(ringT, paper).toFixed(2);
      if (ratio < 3) fails.push({ rule: 'ring-under-bar', detail: `${name} on paper measures ${ratio}; WCAG's non-text contrast bar is 3.0, and DESIGN.md's ring rule is 3:1. On the ink band the ring must be overridden (that is why Footer.astro uses outline-band-text).` });
    }
  }

  // 5. No control in the artifact carries a class that removes the ring.
  for (const { route, html } of pages) {
    for (const m of html.matchAll(/<(a|button)\b[^>]*class="([^"]*outline-(none|hidden)[^"]*)"/g)) {
      fails.push({ rule: 'class-kills-the-ring', detail: `${route} has a <${m[1]}> with class "${m[2]}" — outline-none/outline-hidden cancels the global ring on exactly the element the rule is for.` });
    }
  }

  return fails;
};

// ------------------------------------------------------------------ the selftest

if (selftest) {
  const GOOD = `a:focus-visible,button:focus-visible{outline:2px solid var(--color-accent);outline-offset:2px}
@theme{--color-accent:oklch(50.57% .1321 35.7);--color-paper:oklch(97.2% .017 84.9);--color-band-text:oklch(96.7% .011 84.6)}`;
  const cases = [
    { name: 'clean control: the shipped ring', authored: [['src/styles/global.css', GOOD.replace(/a:focus-visible/, 'a:focus-visible /* ring */')]], built: GOOD, pages: [{ route: '/', html: '<a href="/schedule" class="focus-visible:outline-2">Dates</a>' }], want: [] },
    { name: 'an authored outline: none', authored: [['src/styles/global.css', 'a:focus-visible{outline:none}']], built: GOOD, pages: [], want: ['ring-suppressed'] },
    { name: 'an authored outline: 0', authored: [['src/components/Footer.astro', '.btn:focus{outline:0}']], built: GOOD, pages: [], want: ['ring-suppressed'] },
    { name: 'outline-style: none', authored: [['src/styles/global.css', '.x{outline-style:none}']], built: GOOD, pages: [], want: ['ring-suppressed'] },
    { name: 'the defect quoted inside a comment must NOT fire', authored: [['src/styles/global.css', '/* do not write outline: none anywhere */']], built: GOOD, pages: [], want: [] },
    { name: 'no global ring at all', authored: [], built: '.focus-visible\\:outline-2:focus-visible{outline-width:2px}', pages: [], want: ['no-global-ring'] },
    { name: 'a ring that covers links but not buttons', authored: [], built: 'a:focus-visible{outline:2px solid var(--color-accent);outline-offset:2px}', pages: [], want: ['no-global-ring'] },
    { name: 'a 1px ring', authored: [], built: GOOD.replace('outline:2px solid', 'outline:1px solid'), pages: [], want: ['ring-too-thin'] },
    { name: 'a ring with no offset', authored: [], built: GOOD.replace(';outline-offset:2px', ''), pages: [], want: ['ring-no-offset'] },
    { name: 'a ring painted with a hex', authored: [], built: GOOD.replace('var(--color-accent)', '#A2432A'), pages: [], want: ['ring-not-a-token'] },
    { name: 'a ring whose token is under the 3.0 bar', authored: [], built: GOOD.replace('oklch(50.57% .1321 35.7)', 'oklch(78% .02 84)'), pages: [], want: ['ring-under-bar'] },
    { name: 'a link that carries outline-none', authored: [], built: GOOD, pages: [{ route: '/chat', html: '<a href="/x" class="outline-none">quiet link</a>' }], want: ['class-kills-the-ring'] },
    { name: 'a button that carries outline-hidden', authored: [], built: GOOD, pages: [{ route: '/', html: '<button class="outline-hidden" type="button">menu</button>' }], want: ['class-kills-the-ring'] },
    { name: 'clean control: a decorative outline-none on a non-control', authored: [], built: GOOD, pages: [{ route: '/', html: '<div class="outline-none" data-decorative="1"></div>' }], want: [] },
  ];
  let wrong = 0;
  for (const c of cases) {
    const got = focusFindings({ authoredCss: c.authored, builtCss: c.built, pages: c.pages }).map((f) => f.rule);
    const missing = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = !missing.length && !extra.length;
    if (!ok) wrong++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(50)} ${got.join(',') || 'nothing'}${missing.length ? ` — missing: ${missing.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
  }
  console.log(`\ncheck:focus selftest — ${cases.length} cases, ${wrong} wrong`);
  process.exit(wrong ? 1 : 0);
}

// ------------------------------------------------------------------ the real run

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== 'node_modules') walk(p, out); continue; }
    if (e.endsWith('.css')) out.push([p, readFileSync(p, 'utf8')]);
    // Astro and Svelte components carry their own <style> blocks; the ring rule lives in one of them
    // as often as it lives in a stylesheet.
    if (e.endsWith('.astro') || e.endsWith('.svelte') || e.endsWith('.svelte.css')) out.push([p, readFileSync(p, 'utf8')]);
  }
  return out;
};

const authored = walk(SRC, []);
let builtCss = '';
const cssFiles = [];
if (existsSync(DIST)) {
  const findCss = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      const st = statSync(p);
      if (st.isDirectory()) findCss(p);
      else if (e.endsWith('.css')) { cssFiles.push(p); builtCss += readFileSync(p, 'utf8'); }
    }
  };
  findCss(DIST);
}

const pages = [];
const pageFiles = [];
const findHtml = (dir) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) findHtml(p);
    else if (e.endsWith('.html')) { pageFiles.push(p); pages.push({ route: p.replace(DIST + '/', '/').replace(/index\.html$/, '').replace(/\.html$/, ''), html: readFileSync(p, 'utf8') }); }
  }
};
if (existsSync(DIST)) findHtml(DIST);

const fails = focusFindings({ authoredCss: authored, builtCss, pages });

console.log(`focus gate: ${authored.length} authored CSS-bearing file(s), ${cssFiles.length} shipped stylesheet(s), ${pages.length} built page(s)`);
const rules = focusRules(builtCss);
const ring = rules.find((r) => /\ba:focus-visible\b/.test(r.selector) && /\bbutton:focus-visible\b/.test(r.selector));
console.log(ring ? `global ring rule: ${ring.selector} { ${ring.body} }` : 'global ring rule: none');
const controls = pages.reduce((n, p) => n + (p.html.match(/<(a|button)\b/g) || []).length, 0);
const ownRing = pages.reduce((n, p) => n + (p.html.match(/class="[^"]*focus-visible:outline[^"]*"/g) || []).length, 0);
console.log(`${controls} interactive element(s) in the artifact; ${ownRing} carry their own focus-visible outline utility, ${controls - ownRing} rely on the global rule (before 2026-11-15 those ${controls - ownRing} had no ring at all)`);
if (fails.length) {
  console.log(`FAIL ${fails.length} finding(s):`);
  for (const f of fails) console.log(`  ${f.rule}: ${f.detail}`);
  process.exit(1);
}
console.log('PASS — one global ring (2px, offset 2px, token colour), no rule anywhere suppresses it.');
