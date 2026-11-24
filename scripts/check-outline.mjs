#!/usr/bin/env node
// check:outline — the heading ladder of every page the build emits.
//
//   npm run check:outline            # over the built dist/client
//   npm run check:outline:selftest   # plant each defect, require each to FAIL, with clean controls
//
// Why this gate exists (2026-11-14, the second design read §7 item D8, S040): a page's headings are its
// structure to a screen reader, to the browser's outline and to anyone quoting the page. `/schedule` printed
// an `<h1>` ("When We Meet") and then straight into `<h3>` row titles - an h1 -> h3 jump - and nothing measured
// it. `check:naming` proves a page is CALLED one thing; `check:row-geometry` proves a row's boxes; neither
// looks at the ladder. A skipped level is invisible on screen and loud to assistive tech, so it needs a
// detector, not a note.
//
// What it enforces:
//   FAIL  no-h1            — an emitted page with no h1 at all
//   FAIL  extra-h1         — more than one h1 on one page
//   FAIL  skipped-level    — a heading more than one level below the heading before it (h1 -> h3)
//   FAIL  empty-heading    — a heading whose visible text is empty: a landmark with no words
//   FAIL  skip-link        — a page with no in-page anchor at all: nothing jumps past the repeated chrome
//   FAIL  skip-link-late   — the skip link is not the page's first anchor, so the reader crosses the chrome
//                            on the way to the control meant to skip it
//   FAIL  skip-link-target — the skip link's fragment is not the page's `<main>` landmark
//   INFO  the outline      — the ladder, printed per page, so a reviewer sees the shape before fixing it
//
// Why the skip-link rules live here (2026-11-23, Operator ToDo 19, landed under MS42's polish). A page's
// headings are its structure to a reader; so is the one control that jumps past the header. This tree had
// **0 of 76 anchors** carrying a `#` fragment on the 6 built pages @measured 2026-11-21 by
// `npm run check:cta-context` — WCAG 2.4.1 (Bypass Blocks) asks for that control, and nothing measured for it.
// `check:route-targets` already refuses an in-page anchor whose id is missing (`anchor-dead`), but it skips
// `/404` entirely and it never asks whether a skip link EXISTS or whether its target is the content landmark
// rather than some other id on the page. Those three facts are the structure of the page, which is this gate's
// subject. The rules are what keep the anchor landed on 2026-11-23 from silently vanishing again.
//
// Deliberately NOT enforced: that every page has an h2, or that h4s exist. A page with one heading is a
// complete outline; a ladder that never skips is the only invariant a reader can actually rely on. Nor the
// skip link's WORDS (that is `check:naming`'s ground) nor cross-page fragments like `/chat#threads`
// (`check:route-targets` resolves those against the target page).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emittedRoutes } from '../design/emitted-routes.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return i < 0 ? resolve('dist/client') : args[i + 1];
})();

const HEADING = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g;
const visible = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
// Comments ship as bytes and are structure to nobody, so they come out before every scan — on the whole page,
// not on a slice. On 2026-11-23 a note in `src/layouts/Layout.astro` quoted the main landmark's tag name,
// `MAIN_OPEN` found the quote before it found the element, and `skip-link-target` reported six findings about a
// sentence. Same family as D181 (a comment that ships as text), with the mechanism reversed: this comment never
// renders, and the gate read it anyway.

// The skip-link shell: the first anchor in the document, and the landmark it has to land on.
const ANY_ANCHOR = /<a\b/g;
const FRAGMENT_ANCHOR = /<a\b[^>]*href="#([^"]*)"[^>]*>/g;
const MAIN_OPEN = /<main\b([^>]*)>/;
const ID_ATTR = /\bid="([^"]+)"/;

/** Pure verdict over `[{route, html}]` so the selftest can plant pages with no build and no disk (D118). */
export const outlineFindings = (pages) => {
  const fails = [];
  for (const p0 of pages) {
    const p = { ...p0, html: p0.html.replace(/<!--[\s\S]*?-->/g, ' ') };
    const heads = [...p.html.matchAll(HEADING)].map((m) => ({ level: Number(m[1]), text: visible(m[2]) }));
    if (!heads.length) {
      fails.push({ rule: 'no-h1', detail: `${p.route} has no heading at all — a page with no structure is a wall of text to a screen reader` });
      continue;
    }
    const h1s = heads.filter((h) => h.level === 1);
    if (h1s.length === 0) {
      fails.push({ rule: 'no-h1', detail: `${p.route} opens at h${heads[0].level} ("${heads[0].text.slice(0, 60)}") and never has an h1; the ladder has to start at the top` });
    } else if (h1s.length > 1) {
      fails.push({ rule: 'extra-h1', detail: `${p.route} has ${h1s.length} h1s: ${h1s.map((h) => `"${h.text.slice(0, 40)}"`).join(', ')}. One page, one top heading` });
    }
    for (const h of heads) {
      if (!h.text) fails.push({ rule: 'empty-heading', detail: `${p.route} has an empty h${h.level} — a landmark with no words` });
    }
    // The ladder: walk from the first h1, and each heading may go down at most one level at a time.
    // A heading ABOVE the first h1 is its own failure: the page's structure starts at the top.
    let prev = null;
    for (const h of heads) {
      if (prev !== null && h.level > prev + 1) {
        fails.push({ rule: 'skipped-level', detail: `${p.route} goes h${prev} -> h${h.level} ("${h.text.slice(0, 60)}") — level ${prev + 1} is missing, so the reader has to guess what this heading sits under` });
      }
      prev = h.level;
    }

    // The skip link: it has to exist, it has to come before the chrome it skips, and it has to land on the
    // page's own content rather than on an id that happens to exist somewhere.
    const fragments = [...p.html.matchAll(FRAGMENT_ANCHOR)];
    if (!fragments.length) {
      fails.push({ rule: 'skip-link', detail: `${p.route} carries no in-page anchor — a keyboard reader crosses the mark, the nav labels and the date chip on every page to reach the page's own words (WCAG 2.4.1)` });
    } else {
      const first = fragments[0];
      const before = [...p.html.matchAll(ANY_ANCHOR)].filter((a) => a.index < first.index).length;
      if (before > 0) {
        fails.push({ rule: 'skip-link-late', detail: `${p.route}'s skip link (href="#${first[1]}") is its ${before + 1}${before === 1 ? 'st' : before === 2 ? 'nd' : before === 3 ? 'rd' : 'th'} anchor — the reader tabs through ${before} control(s) before reaching the one that is supposed to skip them` });
      }
      const main = MAIN_OPEN.exec(p.html);
      const mainId = main ? (ID_ATTR.exec(main[1]) ?? [])[1] : undefined;
      if (!main) {
        fails.push({ rule: 'skip-link-target', detail: `${p.route} has a skip link to "#${first[1]}" and no <main> landmark at all — the jump has nothing to land on` });
      } else if (mainId !== first[1]) {
        fails.push({ rule: 'skip-link-target', detail: `${p.route}'s skip link targets "#${first[1]}" but its <main> carries ${mainId ? `id="${mainId}"` : 'no id'} — the reader lands somewhere other than the page's content` });
      }
    }
  }
  return fails;
};

const outlineOf = (html) => [...html.matchAll(HEADING)].map((m) => `${'  '.repeat(Number(m[1]) - 1)}h${m[1]} ${visible(m[2]).slice(0, 70)}`);

const runSelftest = () => {
  // The shipped shell: skip link first, then the landmark carrying its target id. Heading fixtures are wrapped
  // in it so a ladder planting reports the ladder and not the shell — a case that reports two rules when it
  // names one is a case that passes for the wrong reason.
  const page = (inner) => '<a href="#main" class="sr-only">Skip to content</a><main id="main">' + inner + '</main>';
  const good = page('<h1>When We Meet</h1><h2>The next three dates</h2><h3>MPLS Math Club Social</h3><h3>Common Denominator</h3>');
  const cases = [
    { name: 'clean control: a ladder that never skips', html: good, want: [] },
    { name: 'h1 straight to h3', html: page('<h1>When We Meet</h1><h3>MPLS Math Club Social</h3>'), want: ['skipped-level'] },
    { name: 'h1 straight to h4', html: page('<h1>When We Meet</h1><h4>Something</h4>'), want: ['skipped-level'] },
    { name: 'a page with two h1s', html: page('<h1>When We Meet</h1><h2>Dates</h2><h1>Also dates</h1>'), want: ['extra-h1'] },
    { name: 'a page with no h1 at all', html: page('<h2>When We Meet</h2><h3>A date</h3>'), want: ['no-h1'] },
    { name: 'a page with no headings', html: page('<p>Just a paragraph.</p>'), want: ['no-h1'] },
    { name: 'a heading with no words in it', html: page('<h1>When We Meet</h1><h2></h2>'), want: ['empty-heading'] },
    { name: 'a heading whose only content is an image with no alt text', html: page('<h1>When We Meet</h1><h2><img alt=""></h2>'), want: ['empty-heading'] },
    { name: 'clean control: one heading, no sections', html: page('<h1>Page not found</h1><p>Nothing here.</p>'), want: [] },
    { name: 'clean control: h1 -> h2 -> h2 -> h3', html: page('<h1>Ways in</h1><h2>Follow the club</h2><h2>Come to a meeting</h2><h3>Meetup</h3>'), want: [] },
    { name: 'clean control: a heading inside a nested island keeps its level', html: page('<h1>Chat</h1><h2>Summaries</h2><h3>Nov 12</h3><h3>Nov 5</h3>'), want: [] },
    { name: 'skips are caught even when the level goes back up', html: page('<h1>Chat</h1><h2>Summaries</h2><h3>Nov 12</h3><h1>Again</h1>'), want: ['extra-h1'] },
    // The skip-link plantings: each is the shape this repo had, or a shape it could drift back into.
    { name: 'no skip link anywhere on the page', html: '<main id="main"><h1>When We Meet</h1></main>', want: ['skip-link'] },
    { name: 'a skip link that comes after the nav it is meant to skip', html: '<a href="/join">Join</a><a href="/dates">Dates</a><a href="#main">Skip to content</a><main id="main"><h1>Join</h1></main>', want: ['skip-link-late'] },
    { name: 'a skip link whose target is not the main landmark', html: '<a href="#content">Skip to content</a><main id="main"><h1>Chat</h1></main>', want: ['skip-link-target'] },
    { name: 'a skip link pointing at a main that carries no id', html: '<a href="#main">Skip to content</a><main><h1>Chat</h1></main>', want: ['skip-link-target'] },
    { name: 'clean control: skip link first, target is the main landmark', html: '<a href="#main">Skip to content</a><nav><a href="/dates">Dates</a></nav><main id="main"><h1>Past meetings</h1><h2>Three of them</h2></main>', want: [] },
    // Comments come out before the scan, so a note that QUOTES the shell cannot satisfy a rule. Both cases are the
    // defect this pair caught on 2026-11-23: a comment quoting the main tag read as the element itself.
    { name: 'a skip link that exists only inside a comment', html: '<!-- <a href="#main">Skip to content</a> --><main id="main"><h1>Chat</h1></main>', want: ['skip-link'] },
    { name: 'clean control: a comment quoting a heading and the main tag is not structure', html: '<!-- the <main id="cal"> and its <h2> go here --><a href="#main">Skip to content</a><main id="main"><h1>Chat</h1><h2>Threads</h2></main>', want: [] },
  ];
  let bad = 0;
  for (const c of cases) {
    const found = outlineFindings([{ route: '/fixture', html: c.html }]);
    const got = found.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(52)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
    if (!ok) for (const f of found) console.log(`        ${f.rule}: ${f.detail}`);
  }
  console.log(`\ncheck:outline selftest — ${cases.length} cases (${cases.filter((c) => c.want.length).length} plantings, ${cases.filter((c) => !c.want.length).length} clean controls), ${bad} wrong`);
  process.exit(bad ? 1 : 0);
};

const runReal = () => {
  if (!existsSync(DIST)) {
    console.error(`check:outline: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
    process.exit(1);
  }
  const pageFile = (route) => {
    if (route === '/') return resolve(DIST, 'index.html');
    const bare = route.replace(/^\//, '');
    const asDir = resolve(DIST, `${bare}/index.html`);
    return existsSync(asDir) ? asDir : resolve(DIST, `${bare}.html`);
  };
  const pages = emittedRoutes(DIST).map((route) => {
    const file = pageFile(route);
    return { route, html: existsSync(file) ? readFileSync(file, 'utf8') : '' };
  });
  const fails = outlineFindings(pages);
  for (const p of pages) {
    const ladder = outlineOf(p.html);
    console.log(`${p.route}: ${ladder.length ? ladder.join(' | ') : 'no headings'}`);
  }
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  console.log(fails.length ? `\n${fails.length} finding(s).` : `\n${pages.length} page(s), every ladder starts at h1 and never skips a level.`);
  process.exit(fails.length ? 1 : 0);
};

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) (selftest ? runSelftest : runReal)();
