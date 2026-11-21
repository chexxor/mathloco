#!/usr/bin/env node
/**
 * cta-rules.mjs — the ONE reading of "what on a built page is a call to action, and is it in context".
 *
 *   import { pageActions, contextVerdict, EXEMPTIONS } from './cta-rules.mjs';
 *
 * Why a module and not a loop inside each script (D264, the rule this repo repeats because it keeps paying
 * for the absence): `design/cta-inventory.mjs` prices a rule, `scripts/check-cta-context.mjs` enforces it, and
 * the operator argues with the numbers in a review letter. If the verb list, the nav exclusion, or the block
 * walk lives twice, a letter can be answered with a number from one copy and a red gate from the other — which
 * is the exact failure `link-ceiling.mjs`/`check:rsvp-page` and `dist-pages.mjs` exist to prevent. This file
 * holds the vocabulary; the probe prints what it says and the gate fails what it says.
 *
 * WHAT COUNTS AS AN ACTION. The operator widened the question on 2026-11-20, verbatim: "don't restrict
 * calls-to-action to only off-site actions, it should be any call-to-action button/action/link." That is a set
 * smaller than "every anchor" and bigger than "every button", and the boundary has to be written out loud
 * rather than inferred at the call site:
 *
 *   - a declared control (`data-control="primary|secondary"`) — always an action;
 *   - an anchor that leaves the site — always an action, internal or platform;
 *   - an anchor whose own visible words open with an action verb (`ACTION_LABEL`, printed by the probe so a
 *     reader can argue with the list instead of inheriting it);
 *   - NOT an action: nav chrome, the band's identity line, and a skip link. Those are wayfinding, and each
 *     exclusion is named in `EXEMPTIONS` below with its reason. A widened rule that quietly excludes nothing
 *     is a rule nobody can check.
 *
 * WHAT COUNTS AS CONTEXT. A proximity window was the first candidate, and the research refused it on the artifact
 * of 2026-11-20: it failed **0 of 49** marked links at the six-word floor, because a page whose nav, lede and exit
 * band all name Discord, Meetup and "dates" flatters every control standing on it (docs/research/discord-invite-ux-2026-11-20.md
 * §5). On this tree it fails **6 of 45** @measured 2026-11-21 by `node design/cta-inventory.mjs`, so it is not an
 * empty instrument — it is still the wrong one, and the three reasons are visible in the numbers rather than
 * argued: it weighs what the build happened to print within 200 characters of a label (a footer colophon's
 * trademark boilerplate counts as context), its verdict moves when an unrelated section changes length, and it has
 * no way to name WHICH destination a given control's context must state. A **declared block** does: the component
 * says "the context for this action lives in this element", and the gate reads that element's words against the
 * registry row for the id the control carries.
 *
 * `contextVerdict` below IS that check, against the vocabulary in `src/lib/links.mjs` - which is also where the
 * sentences themselves live, so a page and a gate cannot disagree about what a destination is called (D264).
 */
import { readFileSync } from 'node:fs';
import { CALL_TO_ACTION, CTA_BLOCK_MIN_WORDS, CTA_BLOCK_MAX_FRACTION } from '../src/lib/links.mjs';
import { pageText, zoneRanges, zoneAt, decode } from './dist-pages.mjs';

const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'use', 'path', 'circle', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr']);

/** Anchors whose own words open with an action verb. Deliberately a list in the open: the probe prints its own
 *  source line, so a reviewer can dispute a verb rather than inherit a verdict. */
export const ACTION_LABEL = /^(join|sign up|see |add to|subscribe|get |come|rsvp|reserve|register|start|read|browse|all dates|back to|the rest|tell us|find)/i;

/** The exclusions, each with the reason it is not a call to action. An exemption that matches nothing on the
 *  artifact is reported by the gate as `exemption-stale` - round 7's F6 was an exemption whose needle matched no
 *  defect, and it read as a green light for a whole round. Two entries this list used to carry died of exactly that
 *  rule, @measured 2026-11-21 by `npm run check:cta-context` over the 76 anchors on the 6 built pages:
 *  `skip-link` matched **0** (the artifact carries no skip link and no `#` anchor at all - an accessibility gap in
 *  its own right, filed in `.notes/NEXT.md` rather than hidden behind an exemption for a link that does not exist),
 *  and `not-an-http-or-route-target` matched **0** and described shapes the action test already refuses: a
 *  `mailto:`, a `tel:` or a bare fragment is neither off-site nor a declared control, so it is an action only when
 *  its own words open with an action verb - and then it is a destination that needs a registry row, which is the
 *  right answer, not an exemption. A favicon is a `<link>`, and this scan reads anchors. */
export const EXEMPTIONS = [
  {
    id: 'nav-chrome',
    reason: 'the header nav and the band nav are wayfinding the visitor steers by, not an action the page is asking them to take (D117, D309: a nav label is a promise about a path); their copy belongs to check:naming',
    test: (a) => a.zone === 'nav-chrome',
  },
  {
    id: 'band-identity',
    reason: 'the band\u2019s club name is the home path standing as identity, not an ask (D100)',
    test: (a) => a.zone === 'exit-band' && a.href === '/' && /home/i.test(a.ariaLabel ?? ''),
  },
];

/** Words the block must carry besides the action's own label. */
export const MIN_WORDS = CTA_BLOCK_MIN_WORDS;

/** How much of a page a block may swallow before it stops being context and becomes the page (see
 *  `block-too-wide` in `contextVerdict`). A fraction rather than a word count, because the honest comparison is
 *  against the page: @measured 2026-11-21 by `node design/cta-inventory.mjs` the widest block on the artifact holds
 *  77 words, which is 16% of its page, while the six built pages run 142-490 words. A fixed ceiling would be a magic
 *  number a short page slips; a fraction states the actual rule - context is part of a page, never all of it. */
export const MAX_FRACTION = CTA_BLOCK_MAX_FRACTION;

/** The elements that can hold a sentence around a control. Deliberately the same set `design/cta-inventory.mjs`
 *  has always used, so the enclosing-element number stays comparable with the figures it prints: @measured 2026-11-21
 *  by that probe, 6 of 45 marked links sit under 6 words in their innermost wrapper and 11 of 45 under 12. The
 *  pair in the older prose (17 of 49) is the same measure on the pre-declaration artifact of 2026-11-20 - a
 *  different tree, and the count of marked links moved when nav chrome became exempt (S090) and declared controls
 *  began to name themselves. */
const WRAPPERS = new Set(['div', 'section', 'p', 'li', 'ul', 'article', 'header', 'footer', 'form', 'aside']);

/** Markup -> the words a visitor reads. Exported because a probe that prices a rule and a gate that enforces
 *  it must count the same words (D264); `decode` comes from dist-pages, the same unescaping every other
 *  dist-reading script pays. */
export const plainText = (s) => decode(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const clean = plainText;
export const wordsIn = (s) => (String(s).match(/[A-Za-z][A-Za-z\u2019'-]+/g) ?? []).length;
const wordCount = wordsIn;

/** Whole-word (prefix-tolerant) match, so "lists" answers "list" and "joining" answers "join" — but "ours" does
 *  not answer "our". Anchored at the start of a word, which is how a stem stays honest. */
const saysWord = (text, word) => new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text);

/**
 * Every anchor on a page, classified, with the declared block it sits in (if any).
 * `page` is { route, file }; the file is read once and comments/script/style/head are blanked at equal length
 * (dist-pages' rule) so an offset a caller holds still points at the page.
 */
export function pageActions(page, { keepAll = false } = {}) {
  const raw = readFileSync(page.file, 'utf8');
  const text = pageText(raw);
  const ranges = zoneRanges(text);

  // Ancestor stack per anchor offset: walk the tags ONCE, keeping (tag, attrs) for the elements open at each
  // tag, and snapshot that stack at every `<a>`. Not a DOM parse — a stack over the tags in these hand-written
  // components, honest about being a stack (the same honesty cta-inventory.mjs declares about its own walk, and
  // the reason it prints the count of anchors whose block it could not find instead of reporting silence as a
  // pass). One walk, not two: a second walk is a second memory of the same page, and the two disagree the day
  // only one of them learns a new tag (D264, one home per rule).
  const blocksByOffset = new Map(); // anchor offset -> [{ tag, from, to, blockIds, text }]
  const enclosingAt = new Map();    // anchor offset -> the innermost wrapper element, declared or not
  const textOf = (entry) => {
    if (entry.text === undefined) {
      entry.to = matchingClose(text, entry.from, entry.tag);
      entry.text = clean(text.slice(entry.from, entry.to));
    }
    return entry.text;
  };
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  for (;;) {
    const m = tagRe.exec(text);
    if (!m) break;
    const [, closing, name, attrs] = m;
    const tag = name.toLowerCase();
    if (VOID.has(tag) || /\/\s*$/.test(attrs)) continue;
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.splice(i); break; }
      continue;
    }
    const declared = /data-cta-block="([^"]*)"/.exec(attrs)?.[1];
    const entry = { tag, attrs, from: m.index };
    if (declared) {
      entry.blockIds = declared.split(/\s+/).filter(Boolean);
      textOf(entry);
    }
    // An anchor belongs to every declared block enclosing it, and to itself if it declares one.
    if (tag === 'a') {
      blocksByOffset.set(m.index, stack.filter((e) => e.blockIds?.length).concat(entry.blockIds?.length ? [entry] : []));
      // and it has an innermost enclosing wrapper whether or not anyone declared it — the legacy column in the
      // inventory, and the reason the declared block was chosen instead (it is the measure that can fail).
      const inner = [...stack].reverse().find((e) => WRAPPERS.has(e.tag));
      if (inner) enclosingAt.set(m.index, { tag: inner.tag, from: inner.from, text: textOf(inner) });
    }
    stack.push(entry);
  }

  const anchors = [];
  const pageWordCount = wordCount(clean(text));
  const anchorRe = /<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a>/gi;

  for (const am of text.matchAll(anchorRe)) {
    const attrs = am[1];
    const inner = am[2];
    const href = /href="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const ariaLabel = /aria-label="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const srOnly = clean(inner.match(/<span[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi)?.join(' ') ?? '');
    const visible = clean(inner.replace(/<span[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, ' '));
    const control = /data-control="([^"]*)"/.exec(attrs)?.[1] ?? null;
    const declaredId = /data-cta="([^"]*)"/.exec(attrs)?.[1] ?? null;
    const at = am.index;
    const offsite = /^https?:\/\//i.test(href);
    const actionWords = ACTION_LABEL.test(visible);
    let kind = 'other-link';
    if (control) kind = `control:${control}`;
    else if (offsite) kind = 'offsite-link';
    else if (actionWords) kind = 'action-link';
    const exempt = EXEMPTIONS.find((e) => e.test({ href, zone: zoneAt(ranges, at), label: visible, ariaLabel }));
    anchors.push({
      route: page.route,
      at,
      href,
      ariaLabel,
      label: visible,
      accessible: clean(`${visible} ${srOnly}`),
      control,
      declaredId,
      kind,
      offsite,
      zone: zoneAt(ranges, at),
      blocks: blocksByOffset.get(at) ?? [],
      enclosing: enclosingAt.get(at) ?? null,
      pageWords: pageWordCount,
      exempt: exempt ? exempt.id : null,
      isAction: !exempt && (Boolean(control) || offsite || actionWords),
    });
  }
  // `keepAll` is what the gate uses to hunt a stale EXEMPTIONS entry: an exemption is stale when nothing on the
  // artifact matches it, and that question is about every anchor, not only the ones the rule already called actions
  // (round 7's F6: an exemption whose needle matched no defect read as a green light for a whole round).
  return { text, pageWords: pageWordCount, anchors: anchors.filter((a) => keepAll || a.isAction || a.declaredId) };
}

/** The offset of the tag that closes the element opened at `open`, or the end of the page if the markup never
 *  closes it (a page whose component is unbalanced is a build bug, and the gate reads the whole rest of the page
 *  rather than crashing on it). */
function matchingClose(text, open, tag) {
  // Both tags are taken WHOLE (`<div class="x">`, `</div>`), not up to the tag name. The reason is not tidiness:
  // the block's text is what the gate makes its verdict from, and a slice that stops inside the closing tag leaks
  // the tag's own characters into the words being counted - which reads as extra tokens and can carry a thin
  // block over the floor. One regex, one scan: two stateful regexes racing each other lose a close tag the
  // moment a nested open skips past it, which turns a balanced page into an unbalanced one.
  const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  tags.lastIndex = open + 1;
  let depth = 1;
  for (;;) {
    const m = tags.exec(text);
    if (!m) break;
    if (m[1] === '/') {
      depth--;
      if (depth === 0) return m.index + m[0].length;
    } else depth++;
  }
  return text.length;
}

/**
 * Is this action in context? Returns { ok, rule, detail } where `rule` names the finding the gate prints.
 * The order is deliberate: an action that never declared itself gets one finding, not four.
 */
export function contextVerdict(action) {
  const id = action.declaredId;
  if (!id) return { ok: false, rule: 'action-undeclared', detail: `${action.kind} "${action.label}" -> ${action.href} carries no data-cta id, so no element on the page claims to be its context` };
  const row = CALL_TO_ACTION[id];
  if (!row) return { ok: false, rule: 'cta-unknown-id', detail: `data-cta="${id}" is not in src/lib/links.mjs, so nothing defines what its block must name` };

  // the href must be the destination the id claims (a control labelled Discord that points at Meetup is a
  // defect no word check can see)
  const hrefProblem = hrefMatches(action.href, row);
  if (hrefProblem) return { ok: false, rule: 'cta-href-mismatch', detail: `data-cta="${id}" says "${row.where}" but the printed href is ${action.href} (${hrefProblem})` };

  const block = action.blocks.find((b) => b.blockIds.includes(id));
  if (!block) {
    const declaredElsewhere = action.blocks.length;
    return { ok: false, rule: declaredElsewhere ? 'block-id-mismatch' : 'block-missing', detail: declaredElsewhere ? `${action.kind} "${action.label}" sits in a block declared for ${action.blocks.map((b) => b.blockIds.join('+')).join(', ')} — not for ${id}` : `${action.kind} "${action.label}" -> ${action.href} has no element around it declaring data-cta-block="${id}"` };
  }
  const beyond = block.text.replace(action.label, ' ').replace(action.ariaLabel ?? '\u0000', ' ');
  if (wordCount(beyond) < MIN_WORDS) {
    return { ok: false, rule: 'block-thin', detail: `the block for "${id}" holds ${wordCount(beyond)} words besides the label (${MIN_WORDS} is the floor): "${beyond.slice(0, 90)}"` };
  }
  // Context that is most of the page is not context. Without this rule, wrapping `<main>` in one
  // `data-cta-block` would satisfy every word check at once and make the mark meaningless - the same laundering
  // the proximity window performed by accident (a page that names Discord in its nav, lede and band flatters every
  // control on it, and a declared block that declares the page does the same thing on purpose).
  if (action.pageWords && wordCount(block.text) > action.pageWords * MAX_FRACTION) {
    return { ok: false, rule: 'block-too-wide', detail: `the block for "${id}" holds ${wordCount(block.text)} of the page's ${action.pageWords} words - context that is most of a page is the page, not the sentence that makes the action readable (over ${Math.round(MAX_FRACTION * 100)}% fails)` };
  }
  const whole = `${action.accessible} ${block.text}`;
  if (!row.names.some((w) => saysWord(whole, w))) {
    return { ok: false, rule: 'block-names-no-destination', detail: `nothing in the block or the label for "${id}" says where it leads (needs one of: ${row.names.join(', ')})` };
  }
  if (!row.asks.some((w) => saysWord(whole, w))) {
    return { ok: false, rule: 'block-names-no-ask', detail: `nothing in the block or the label for "${id}" says what the visitor does there (needs one of: ${row.asks.join(', ')})` };
  }
  if (row.noun && !saysWord(whole, row.noun)) {
    return { ok: false, rule: 'block-hides-what-it-asks', detail: `"${id}" enrols the visitor in a ${row.noun} and nothing in the block or the label says so` };
  }
  return { ok: true };
}

/** Does the printed href name the destination the registry row claims? */
function hrefMatches(href, row) {
  if (row.href) return href.split('#')[0] === row.href ? null : `the registry says the route is ${row.href}`;
  if (!/^https?:\/\//i.test(href)) return `the registry says this destination leaves the site, but the href is ${href || '(empty)'}`;
  if (row.host && !href.toLowerCase().includes(row.host.toLowerCase())) return `the registry says the host is ${row.host}`;
  if (row.pathContains && !href.includes(row.pathContains)) return `the registry says the path contains ${row.pathContains}`;
  for (const not of row.pathNot ?? []) {
    if (href.includes(not)) return `the registry says this is not ${not} — that path is a different destination`;
  }
  return null;
}
