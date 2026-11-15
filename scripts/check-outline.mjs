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
//   INFO  the outline      — the ladder, printed per page, so a reviewer sees the shape before fixing it
//
// Deliberately NOT enforced: that every page has an h2, or that h4s exist. A page with one heading is a
// complete outline; a ladder that never skips is the only invariant a reader can actually rely on.
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

/** Pure verdict over `[{route, html}]` so the selftest can plant pages with no build and no disk (D118). */
export const outlineFindings = (pages) => {
  const fails = [];
  for (const p of pages) {
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
  }
  return fails;
};

const outlineOf = (html) => [...html.matchAll(HEADING)].map((m) => `${'  '.repeat(Number(m[1]) - 1)}h${m[1]} ${visible(m[2]).slice(0, 70)}`);

const runSelftest = () => {
  const good = '<main><h1>When We Meet</h1><h2>The next three dates</h2><h3>MPLS Math Club Social</h3><h3>Common Denominator</h3></main>';
  const cases = [
    { name: 'clean control: a ladder that never skips', html: good, want: [] },
    { name: 'h1 straight to h3', html: '<main><h1>When We Meet</h1><h3>MPLS Math Club Social</h3></main>', want: ['skipped-level'] },
    { name: 'h1 straight to h4', html: '<main><h1>When We Meet</h1><h4>Something</h4></main>', want: ['skipped-level'] },
    { name: 'a page with two h1s', html: '<main><h1>When We Meet</h1><h2>Dates</h2><h1>Also dates</h1></main>', want: ['extra-h1'] },
    { name: 'a page with no h1 at all', html: '<main><h2>When We Meet</h2><h3>A date</h3></main>', want: ['no-h1'] },
    { name: 'a page with no headings', html: '<main><p>Just a paragraph.</p></main>', want: ['no-h1'] },
    { name: 'a heading with no words in it', html: '<main><h1>When We Meet</h1><h2></h2></main>', want: ['empty-heading'] },
    { name: 'a heading whose only content is an image with no alt text', html: '<main><h1>When We Meet</h1><h2><img alt=""></h2></main>', want: ['empty-heading'] },
    { name: 'clean control: one heading, no sections', html: '<main><h1>Page not found</h1><p>Nothing here.</p></main>', want: [] },
    { name: 'clean control: h1 -> h2 -> h2 -> h3', html: '<main><h1>Ways in</h1><h2>Follow the club</h2><h2>Come to a meeting</h2><h3>Meetup</h3></main>', want: [] },
    { name: 'clean control: a heading inside a nested island keeps its level', html: '<main><h1>Chat</h1><h2>Summaries</h2><h3>Nov 12</h3><h3>Nov 5</h3></main>', want: [] },
    { name: 'skips are caught even when the level goes back up', html: '<main><h1>Chat</h1><h2>Summaries</h2><h3>Nov 12</h3><h1>Again</h1></main>', want: ['extra-h1'] },
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
  console.log(`\ncheck:outline selftest — ${cases.length} cases, ${bad} wrong`);
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
