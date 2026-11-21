#!/usr/bin/env node
/**
 * cta-inventory.mjs — how many calls to action does the built site actually paint, and how many of them pass
 * the context rule? A **probe, not a gate** (it prints and exits 0).
 *
 * Why it exists (2026-11-20, the operator's `/chat` CTA question; MS41). Before a rule about "a call-to-action
 * must sit in context" can be written, two numbers are needed and neither was known: **how many actions exist**
 * (which decides whether the rule is a sweep of six components or of forty), and **what counts as context**
 * (which decides whether the rule is decidable at all). The second number killed the first candidate instrument —
 * the proximity window. On the artifact of 2026-11-20 it failed **0 of 49** marked links at the six-word floor
 * (`docs/research/discord-invite-ux-2026-11-20.md` §5): a page whose nav, lede and exit band all name Discord,
 * Meetup and "dates" flatters every control standing on it. Re-measured on the tree that carries this item's fix
 * it fails **6 of 45** @measured 2026-11-21 by this probe — and that is the honest reason to refuse it anyway, not
 * its emptiness: a ±200-character window weighs the accident of what the build happened to print near the label,
 * it counts a footer colophon's trademark boilerplate as context for the link beside it, and it cannot say which
 * destination a given control's context must name. A rule that cannot name the destination it is checking for is
 * not decidable; it is a word count.
 *
 * The reading lives in `design/cta-rules.mjs`, shared with `scripts/check-cta-context.mjs` (D264): the verb
 * list, the exemptions, the block walk and the word floor are defined once, so the number quoted in a review
 * letter and the finding the gate prints cannot come from different memories of the page. This file used to
 * carry its own classifier, and the two copies did disagree — the old walk called an internal anchor with an
 * action-ish label `other-link` or `action-link` depending on which file was read.
 *
 * What it prints:
 *   1. actions by kind — declared controls (`data-control`), off-site anchors, and in-page anchors whose own
 *      words open with an action verb; the verb list and every exemption print in full so a reader can argue
 *      with the set instead of inheriting a verdict.
 *   2. the context verdict per action, from `contextVerdict` — which rule fired, how many times.
 *   3. the **window** measure (words within ±200 characters), the **enclosing-element** measure (words in the
 *      innermost wrapper the walk finds) and the **declared-block** measure (words in the element the page marks
 *      as this action's context). All three are kept: the window because its history is the argument that chose
 *      the block, the enclosing element because it is the heuristic the declaration replaced — it fails 6 of 45 at
 *      the floor @measured 2026-11-21 by this probe — and the declared block because it is what the gate reads.
 *      A declared block measure of 0 failures on this tree means every marked link now has context, not that the
 *      measure is weak; the proof that it can fail is `npm run check:cta-context:selftest` (14 plantings) and the
 *      defect rows in `node design/round20.mjs`.
 *
 * Read the artifact, not `src/`: what a visitor sees is what the build emitted. Refuses a stale `dist/`
 * through `design/dist-fresh.mjs`, the same rule every other `dist`-reading probe pays (D118's topology).
 *
 *   node design/cta-inventory.mjs                 # over dist/client
 *   node design/cta-inventory.mjs --routes /,/chat
 *   node design/cta-inventory.mjs --all           # every action, not just the ten thinnest blocks
 *   node design/cta-inventory.mjs --verdicts      # every action WITH its finding, passing ones too
 *
 * Cost @measured 2026-11-21 by this file (Linux native, Node 24.22.1): 0.07s, no browser, no build.
 */
import { builtPageFiles } from './dist-pages.mjs';
import { distState, staleLine } from './dist-fresh.mjs';
import { pageActions, contextVerdict, ACTION_LABEL, EXEMPTIONS, MIN_WORDS, plainText, wordsIn } from './cta-rules.mjs';

const args = process.argv.slice(2);
const only = args.includes('--routes') ? args[args.indexOf('--routes') + 1].split(',') : null;
const WINDOW = 200;

// Refuse before reading a page: a price list about a build this tree did not make is worse than no price list
// (D156). `distState` returns `{present, fresh, input, built, allowed}` - there is no `.stale` field, and an
// earlier draft of this line tested one, which made the check silently never fire @caught 2026-11-21.
const state = distState();
if (!state.fresh && !state.allowed) {
  console.error(staleLine(state));
  process.exit(1);
}

const pages = builtPageFiles('dist/client').filter((p) => !only || only.includes(p.route));
const rows = [];
const pageWords = new Map();
for (const page of pages) {
  const { text, anchors, pageWords: words } = pageActions(page);
  pageWords.set(page.route, words);
  for (const a of anchors) {
    // the label inside its own anchor, removed, so the window counts context and not the control's own words
    const esc = a.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const win = plainText(text.slice(Math.max(0, a.at - WINDOW), a.at + a.label.length + WINDOW)).replace(new RegExp(esc, 'gi'), ' ');
    const block = a.blocks.find((b) => b.blockIds.includes(a.declaredId)) ?? a.blocks[0] ?? null;
    const blockWords = block ? wordsIn(block.text.replace(new RegExp(esc, 'gi'), ' ')) : -1;
    const wrapWords = a.enclosing ? wordsIn(a.enclosing.text.replace(new RegExp(esc, 'gi'), ' ')) : -1;
    rows.push({
      route: page.route,
      kind: a.kind,
      zone: a.zone ?? 'body',
      label: a.label,
      href: a.href,
      declaredId: a.declaredId,
      window: wordsIn(win),
      blockWords,
      wrapWords,
      verdict: contextVerdict(a),
    });
  }
}

const byKind = {};
for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
const byRule = {};
for (const r of rows) byRule[r.verdict.ok ? 'ok' : r.verdict.rule] = (byRule[r.verdict.ok ? 'ok' : r.verdict.rule] || 0) + 1;

// Two counts, printed apart, because they are two different questions and a reader of a doc will quote one of
// them. "How many things on this site ask the visitor to do something" is the classifier's answer (an action is a
// declared control, an off-site anchor, or an in-page anchor whose own words open with an action verb). "How many
// places carry the idiom's mark" is bigger, because a page may declare context for a plain descriptive link that
// the classifier does not call an action - `/join`'s "dates page" is one. The run that showed the collapse:
// 43 actions and 45 marked anchors @measured 2026-11-21 by this probe, and a line in `src/lib/links.mjs` that said
// "45 actions" was counting two descriptive links the rule does not weigh.
const actions = rows.filter((r) => r.kind !== 'other-link');
const marked = rows.filter((r) => r.kind === 'other-link');
console.log(`pages read: ${pages.length}  (${pages.map((p) => p.route).join(' ')})`);
console.log(`page words: ${pages.map((p) => `${p.route} ${pageWords.get(p.route)}`).join('  ')}`);
console.log(`\nactions: ${JSON.stringify(byKind)}  total ${rows.length} = ${actions.length} action(s) + ${marked.length} declared link(s) the classifier does not call an action`);
console.log(`action verbs counted as actions: ${ACTION_LABEL.source}`);
console.log('excluded, with the reason:');
for (const e of EXEMPTIONS) console.log(`  ${e.id.padEnd(28)} ${e.reason}`);
for (const t of [MIN_WORDS, 10, 20, 35]) {
  console.log(`  window measure \u2014 marked links with under ${String(t).padStart(2)} painted words within ${WINDOW} chars: ${rows.filter((r) => r.window < t).length}`);
}
for (const t of [0, MIN_WORDS, 12]) {
  console.log(`  enclosing-element measure \u2014 marked links whose innermost wrapper holds under ${String(t).padStart(2)} words besides their own label: ${rows.filter((r) => r.wrapWords >= 0 && r.wrapWords < t).length}`);
}
for (const t of [0, MIN_WORDS, 12]) {
  console.log(`  declared-block measure \u2014 marked links whose declared block holds under ${String(t).padStart(2)} words besides their own label: ${rows.filter((r) => r.blockWords >= 0 && r.blockWords < t).length}`);
}
const unwrapped = rows.filter((r) => r.wrapWords < 0).length;
if (unwrapped) console.log(`  marked links whose innermost wrapper the walk could not find: ${unwrapped}`);
const unboxed = rows.filter((r) => r.blockWords < 0).length;
if (unboxed) console.log(`  marked links with no declared block: ${unboxed}`);

console.log('\nthe context rule, as src/lib/links.mjs and design/cta-rules.mjs define it:');
for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${rule}`);

const line = (r) =>
  `  ${String(r.wrapWords).padStart(3)}/${String(r.blockWords).padStart(3)}w ${r.kind.padEnd(16)} ${r.route.padEnd(11)} "${r.label.slice(0, 40)}" -> ${r.href.slice(0, 40)}  ${r.verdict.ok ? 'ok' : r.verdict.rule}`;
const thin = (r) => Math.min(r.blockWords < 0 ? Infinity : r.blockWords, r.wrapWords < 0 ? Infinity : r.wrapWords);
console.log('\nthe ten thinnest blocks (wrapper/declared words):');
for (const r of rows.slice().sort((a, b) => thin(a) - thin(b)).slice(0, 10)) console.log(line(r));
if (args.includes('--all')) {
  console.log('\nevery action, by route then kind:');
  for (const r of rows.slice().sort((a, b) => (a.route + a.kind + a.label).localeCompare(b.route + b.kind + b.label))) console.log(line(r));
}
if (args.includes('--verdicts')) {
  console.log('\nevery action with the finding, in document order:');
  for (const r of rows) {
    console.log(line(r));
    if (!r.verdict.ok) console.log(`        ${r.verdict.detail}`);
  }
}
console.log('\nThis is a price list and a verdict, not the verdict itself: it says how many actions exist, what each');
console.log('candidate instrument would report about them, and which rule of check:cta-context each one trips. The');
console.log('window measure is kept even though the rule refuses it (see the header): its failure count is the');
console.log('evidence for that refusal. It does not decide which actions deserve a sentence — that is copy.');
