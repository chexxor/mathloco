#!/usr/bin/env node
/**
 * cta-inventory.mjs — how many calls to action does the built site actually paint, and how much context
 * does each one have? A **probe, not a gate** (it prints and exits 0).
 *
 * Why it exists (2026-11-20, the operator's `/chat` CTA question; MS41). Before a rule about
 * "a call-to-action must sit in context" can be written, two numbers are needed and neither was known:
 * **how many actions exist** (which decides whether the rule is a sweep of six components or of forty), and
 * **what counts as context** (which decides whether the rule is decidable at all). The second number is the
 * interesting one, and it killed a candidate instrument — see the two measures below.
 *
 * What it prints, and the two measures it prints on purpose:
 *   1. actions counted by kind — declared controls (`data-control`), off-site anchors, and in-page anchors
 *      whose accessible name opens with an action verb. The verb list is printed in its own line so a reader
 *      can argue with it rather than inherit it.
 *   2. a **text window** measure: how many words of painted text sit within ±200 characters of the action's
 *      own words. Reported because it passes on every action on this site, which is exactly why a proximity
 *      window cannot be the gate — a page whose nav, lede and exit band all name Discord, Meetup and "dates"
 *      flatters every control on it. A rule that cannot fail is not an instrument.
 *   3. a **block** measure: the enclosing element's own text, walked out of the tag structure rather than
 *      guessed with `lastIndexOf('<div')`. Reported because the first cut of this probe used the guess and
 *      printed 0 context words for `/chat`'s own invite control — a parser bug wearing a finding's costume.
 *      Both numbers stay in the output so neither instrument is trusted by accident.
 *
 * Read the artifact, not `src/`: what a visitor sees is what the build emitted. Refuses a stale `dist/`
 * through `design/dist-fresh.mjs`, the same rule every other `dist`-reading probe pays (D118's topology).
 *
 *   node design/cta-inventory.mjs                 # over dist/client
 *   node design/cta-inventory.mjs --routes /,/chat
 *
 * Cost @measured 2026-11-20 by this file (Linux native, Node 24.22.1): 0.04s, no browser, no build.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { distState, staleLine } from './dist-fresh.mjs';

const root = new URL('../dist/client/', import.meta.url).pathname;
const args = process.argv.slice(2);
const only = args.includes('--routes') ? args[args.indexOf('--routes') + 1].split(',') : null;

// An action is: a declared control, an off-site anchor, or an in-page anchor whose own words open with an
// action verb. Nav labels, the identity link and the skip link are deliberately NOT actions — the exclusion
// is written here rather than inferred at the call site (the operator's ruling on scope was about calls to
// action, which is a smaller set than "every anchor").
const ACTION_LABEL = /^(join|sign up|see |add to|subscribe|get |come|rsvp|reserve|register|start|read|browse|all dates|back to|the rest|tell us|find)/i;

const clean = (h) => h
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&#x2019;|&#39;|&apos;|&#x27;|&#x2014;|&mdash;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');

const wordsIn = (s) => (s.match(/[A-Za-z][A-Za-z'’-]+/g) || []).length;

// The enclosing block, walked: scan backwards for the tag that opens the innermost element still open at the
// anchor. Not a DOM parse — a stack over the tags between the last blank-line boundary and the anchor is
// enough for these hand-written components, and it is honest about being a stack.
const enclosingBlockText = (html, at) => {
  const start = Math.max(0, at - 4000);
  const before = html.slice(start, at);
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
  const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'use', 'path', 'circle', 'source']);
  let m;
  while ((m = tagRe.exec(before))) {
    const [, close, name, rest] = m;
    const n = name.toLowerCase();
    if (VOID.has(n) || /\/>$/.test(rest)) continue;
    if (close) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i] === n) { stack.splice(i); break; }
    } else stack.push(n);
  }
  const WRAPPERS = new Set(['div', 'section', 'p', 'li', 'ul', 'article', 'header', 'footer', 'form', 'aside']);
  const openName = [...stack].reverse().find((n) => WRAPPERS.has(n));
  if (!openName) return null;
  const openRe = new RegExp(`<(div|section|p|li|ul|article|header|footer|form|aside)\\b[^>]*>`, 'gi');
  let om; let best = -1;
  while ((om = openRe.exec(before))) if (om[1].toLowerCase() === openName) best = om.index;
  if (best < 0) return null;
  const blockStart = start + best;
  const closeRe = new RegExp(`</${openName}>`, 'gi');
  let cm; let blockEnd = html.length;
  closeRe.lastIndex = at;
  if ((cm = closeRe.exec(html))) blockEnd = cm.index + cm[0].length;
  return clean(html.slice(blockStart, blockEnd));
};

const pages = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (e.endsWith('.html')) pages.push(p);
  }
};
walk(root);

const SELF = /matheapolis\.com/;
const rows = [];
for (const p of pages) {
  const route = '/' + relative(root, p).replace(/\/index\.html$/, '').replace(/^index\.html$/, '');
  if (only && !only.includes(route)) continue;
  const html = readFileSync(p, 'utf8');
  const painted = clean(html);
  const re = /<a\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const hrefM = /href="([^"]*)"/.exec(tag);
    if (!hrefM) continue;
    const href = hrefM[1];
    if (/^(#|mailto:|tel:)/.test(href)) continue;
    const internal = href.startsWith('/') || SELF.test(href);
    const control = /data-control="(primary|secondary)"/.exec(tag);
    const end = html.indexOf('</a>', m.index);
    if (end < 0) continue;
    const label = clean(html.slice(m.index + tag.length, end)).trim();
    const kind = control ? `control:${control[1]}` : internal ? (ACTION_LABEL.test(label) ? 'action-link' : 'other-link') : 'offsite-link';
    if (kind === 'other-link') continue;
    const at = painted.indexOf(label);
    if (at < 0) continue;
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const win = painted.slice(Math.max(0, at - 200), at + label.length + 200).replace(new RegExp(esc, 'g'), ' ');
    const block = enclosingBlockText(html, m.index);
    const blockWords = block === null ? -1 : wordsIn(block.replace(new RegExp(esc, 'g'), ' '));
    rows.push({ route, kind, label, href, window: wordsIn(win), blockWords, blockFound: block !== null });
  }
}

const state = distState();
if (state.stale) console.log(staleLine(state) + '\n');
const byKind = {};
for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
console.log(`pages read: ${pages.length}`);
console.log(`action verbs counted as actions: ${ACTION_LABEL.source}`);
console.log(`actions: ${JSON.stringify(byKind)}  total ${rows.length}`);
for (const t of [10, 20, 35]) {
  console.log(`  window measure — actions with under ${String(t).padStart(2)} painted words within 200 chars: ${rows.filter((r) => r.window < t).length}`);
}
for (const t of [0, 6, 12]) {
  console.log(`  block measure — actions whose enclosing block holds under ${String(t).padStart(2)} words besides their own label: ${rows.filter((r) => r.blockWords >= 0 && r.blockWords < t).length}`);
}
const unboxed = rows.filter((r) => !r.blockFound).length;
if (unboxed) console.log(`  actions whose enclosing block the walk could not find: ${unboxed}`);
console.log('\nthe ten thinnest blocks:');
for (const r of rows.slice().sort((a, b) => a.blockWords - b.blockWords).slice(0, 10)) {
  console.log(`  ${String(r.blockWords).padStart(4)}w ${r.kind.padEnd(16)} ${r.route.padEnd(11)} "${r.label.slice(0, 44)}" -> ${r.href.slice(0, 42)}`);
}
console.log('\nThis is a price list for a rule, not a verdict: it says how many actions exist and what each of two');
console.log('candidate instruments would report about them. The window measure cannot fail here (§ its header), so');
console.log('a context rule has to read a declared block. It does not decide which actions deserve a sentence.');
