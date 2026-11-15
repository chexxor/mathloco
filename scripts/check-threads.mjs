#!/usr/bin/env node
// check:threads — the homepage's thread list shows what it claims, and the "rest" link lands somewhere.
//
//   npm run check:threads            # over the built dist/client
//   npm run check-threads.mjs --selftest   # plant each defect, require each to FAIL, with clean controls
//
// Why this gate exists (2026-11-14, S042, D320, read §5.4). The read asked for a cap of six bullets on `/`
// with "the rest of the list →" leading to the page where the threads actually live. `WhyJoinUs.astro`
// declares the cap as `const VISIBLE = 6` and `src/content.json` holds the set; a milestone that states a
// cap without a detector is exactly the thing S038 was written to prevent — a rule in a comment, green gates
// either side of it, and nobody counting the bullets.
//
// What FAILS:
//   FAIL count-over-cap      the built page paints more thread items than the cap the component declares
//   FAIL count-not-cap       the page paints fewer than min(cap, items) without a reason in the markup
//   FAIL rest-link-missing   items exist beyond the cap and nothing links to them
//   FAIL rest-link-lying     the "rest of the list" link does not point at /chat#threads
//   FAIL dead-anchor         /chat#threads is promised but /chat has no element with that id
//
// The cap number is not duplicated here: it is read out of the component that uses it, so the gate cannot
// disagree with the page (D238's "one home per rule").
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const argOne = (flag, dflt) => { const i = args.indexOf(flag); return i < 0 ? dflt : args[i + 1]; };
const DIST = resolve(argOne('--dist', 'dist/client'));
const SRC = resolve(argOne('--src', 'src/components/WhyJoinUs.astro'));
const CONTENT = resolve(argOne('--content', 'src/content.json'));

/** The cap as the component states it. No second 6 anywhere in the tree. */
const declaredCap = (src) => Number(/const VISIBLE = (\d+)/.exec(src)?.[1] ?? NaN);
const itemCount = (content) => (content?.threads?.items ?? []).length;

/** The thread list node, then its `<li>` children. The section is identified by the grid the component emits. */
const listItems = (html) => {
  const m = /<ul class="[^"]*grid[^"]*">([\s\S]*?)<\/ul>/.exec(html);
  if (!m) return null;
  return [...m[1].matchAll(/<li\b/g)].length;
};

/** The "the rest of the list" anchor, if there is one. */
const restLink = (html) => {
  const m = /<a\b([^>]*)>([\s\S]*?)<\/a>/.exec(/the rest of the list[\s\S]*?<\/a>|<a\b[^>]*>[\s\S]{0,120}the rest of the list[\s\S]*?<\/a>/.exec(html)?.[0] ?? '');
  if (!m) return null;
  return { href: /href="([^"]*)"/.exec(m[1])?.[1] ?? '', text: m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() };
};

/** Pure verdict so the selftest can plant without a build. */
function verdict({ cap, items, home, chat }) {
  const fails = [];
  const notes = [];
  const shown = listItems(home);

  if (Number.isNaN(cap)) fails.push({ rule: 'cap-undeclared', detail: 'WhyJoinUs.astro declares no `const VISIBLE = N`, so nothing here can be checked' });
  if (shown === null) fails.push({ rule: 'no-list', detail: 'the home page paints no thread list at all — a section that renders nothing is a designed state, and this gate cannot tell a designed absence from a dropped one' });
  else {
    if (shown > cap) fails.push({ rule: 'count-over-cap', detail: `${shown} thread bullets painted, cap is ${cap}` });
    if (shown < Math.min(cap, items)) fails.push({ rule: 'count-not-cap', detail: `${shown} painted but min(cap ${cap}, items ${items}) = ${Math.min(cap, items)} expected` });
  }

  const link = restLink(home);
  if (items > cap) {
    if (!link) fails.push({ rule: 'rest-link-missing', detail: `${items} threads in content.json, ${cap} painted, and nothing on the page says where the other ${items - cap} live` });
    else if (link.href !== '/chat#threads') fails.push({ rule: 'rest-link-lying', detail: `the "rest of the list" link points at "${link.href}"` });
    else if (!/id="threads"/.test(chat)) fails.push({ rule: 'dead-anchor', detail: 'the link promises /chat#threads and /chat has no element with id="threads"' });
    else notes.push(`${items - cap} thread(s) reachable through ${link.href}`);
  } else if (link) {
    fails.push({ rule: 'rest-link-nothing-to-reach', detail: 'the page offers "the rest of the list" while every thread is already on it' });
  }

  return { fails, notes, shown, cap, items };
}

if (selftest) {
  const CAP = 6;
  const list = (n) => `<ul class="mt-6 grid grid-cols-1 gap-x-8 md:grid-cols-2">${'<li class="py-2 text-body leading-prose font-body">a thread</li>'.repeat(n)}</ul>`;
  const rest = '<p class="mt-4"><a href="/chat#threads">the rest of the list <span aria-hidden="true">→</span></a></p>';
  const goodHome = `<div>${list(CAP)}${rest}</div>`;
  const chat = '<section id="threads"><h2>Threads</h2></section>';
  const cases = [
    { name: 'the shipped shape', home: goodHome, chat, cap: CAP, items: 9, want: [] },
    { name: 'cap declared but nine bullets painted', home: `<div>${list(9)}${rest}</div>`, chat, cap: CAP, items: 9, want: ['count-over-cap'] },
    { name: 'the rest link deleted', home: `<div>${list(CAP)}</div>`, chat, cap: CAP, items: 9, want: ['rest-link-missing'] },
    { name: 'the rest link points at Meetup', home: `<div>${list(CAP)}<p><a href="https://www.meetup.com/club/">the rest of the list</a></p></div>`, chat, cap: CAP, items: 9, want: ['rest-link-lying'] },
    { name: 'the anchor is dead on the page it links to', home: goodHome, chat: '<section><h2>Threads</h2></section>', cap: CAP, items: 9, want: ['dead-anchor'] },
    { name: 'a list that dropped two items silently', home: `<div>${list(4)}${rest}</div>`, chat, cap: CAP, items: 9, want: ['count-not-cap'] },
    { name: 'no cap declared in the component', home: goodHome, chat, cap: NaN, items: 9, want: ['cap-undeclared'] },
    { name: 'the offer when there is nothing left to offer', home: `<div>${list(4)}${rest}</div>`, chat, cap: 6, items: 4, want: ['rest-link-nothing-to-reach'] },
    { name: 'clean control: everything shown, no promise', home: `<div>${list(4)}</div>`, chat, cap: 6, items: 4, want: [] },
  ];
  let bad = 0;
  for (const c of cases) {
    const { fails } = verdict({ cap: c.cap, items: c.items, home: c.home, chat: c.chat });
    const got = fails.map((f) => f.rule);
    const ok = c.want.length === 0 ? got.length === 0 : c.want.every((w) => got.includes(w));
    console.log(`${ok ? 'ok   ' : 'FAIL '} ${c.name.padEnd(42)} ${got.join(',') || 'nothing'}`);
    if (!ok) bad++;
  }
  console.log(`\ncheck:threads selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

const src = existsSync(SRC) ? readFileSync(SRC, 'utf8') : '';
const content = existsSync(CONTENT) ? JSON.parse(readFileSync(CONTENT, 'utf8')) : {};
const home = existsSync(`${DIST}/index.html`) ? readFileSync(`${DIST}/index.html`, 'utf8') : '';
const chat = existsSync(`${DIST}/chat/index.html`) ? readFileSync(`${DIST}/chat/index.html`, 'utf8') : '';

const { fails, notes, shown, cap, items } = verdict({ cap: declaredCap(src), items: itemCount(content), home, chat });
console.log(`check:threads — cap ${cap}, ${items} thread(s) in content.json, ${shown} painted on / @measured ${new Date().toISOString().slice(0, 10)} by this gate`);
notes.forEach((n) => console.log(`  ${n}`));
fails.forEach((f) => console.log(`  FAIL ${f.rule.padEnd(24)} ${f.detail}`));
if (fails.length) {
  console.log(`\n${fails.length} thread-list failure(s). The cap is declared in src/components/WhyJoinUs.astro; the page has to match it.`);
  process.exit(1);
}
console.log('\nThe list shows what the cap says it shows, and the remainder is linked where it lives.');
console.log('Run `node scripts/check-threads.mjs --selftest` to see that these checks can still fail.');
