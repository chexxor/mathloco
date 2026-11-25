// round20-options.mjs — the treatments on the table for grill round 20: what a call to action is made OF.
// Edit THIS, never the specimen HTML (D282's contract: a generated page embeds what it measured).
//
// WHY ROUND 20 EXISTS (2026-11-21). The operator's word, verbatim, from `docs/research/discord-invite-ux-2026-11-20.md`:
//   "the /chat page has a 'Join the chat' button at the top as the first item under the heading. It doesn't make
//    sense to have a user call-to-action without context around it like that, don't you agree? Additionally, it
//    feels incorrect for us to use a button there for something that takes you off the page. Shouldn't it be an
//    anchor link with an external icon? Or something else?"
// That is three questions in one sentence, and this round separates them so each can be answered with a reading
// rather than with a taste:
//   1. CONTEXT — is the ask legible without clicking? Rows `bare-invite` and `machine-name-only` price the two
//      ways that question got answered badly: the label alone (what shipped on 2026-11-20) and the label plus an
//      sr-only qualifier (a fix a screen reader hears and a sighted reader never sees). Rows `registry-gloss`,
//      `prose-block` and `band-shared-block` price the three shapes this tree now ships for the same destination.
//   2. WEIGHT — should an exit be a box or a link? `quiet-label` demotes the control to the site's own quiet step
//      (the underlined label the schedule rows already use), read out of the artifact rather than re-drawn here.
//   3. THE LOGO — does an external icon belong in the label? `no-arrow` removes the glyph and shows what the gate
//      that owns outbound links actually demands, which is not the glyph.
//
// WHAT THIS ROUND MEASURES, and what it refuses to.
//   Measured: the verdict of the same reading `scripts/check:cta-context` enforces (`design/cta-rules.mjs`), the
//   words in the declared block, that block's share of the page, the accessible name, whether the anchor still
//   counts as a `data-control`, and what `scripts/check-ext-links.mjs` says about the whole mutated page.
//   NOT measured: pixels. No row here claims a height, a box or a fold position, so no row carries a photograph —
//   `check:render` and `design/fold-answers.mjs` price painted geometry when a variant graduates, and a specimen
//   that printed a pixel number it never measured is the defect D269 exists to stop.
//
// Discipline kept from the rounds before this one:
//   - every row is a byte delta on the SHIPPED page, not a re-render, and a transform that finds its needle gone
//     THROWS (round 19's rule: a stale assumption that fails silently becomes prose).
//   - every class in a mutated region already ships: `round20-build.mjs` checks each class token against
//     `dist/client/_astro/*.css` and throws on one the sheet does not have (D110 / record 0018).
//   - a `delta` row that changes nothing throws (round 15's rule — a rule that lost to an inline style is not an
//     answer).
//   - an `expect` that the reading does not confirm throws, so the round exits 1 and a claim cannot outlive the
//     finding it rests on (round 9's discipline: an option that breaks a rule is supposed to be loud).
//   - the quiet ladder's class string is READ out of the built `/dates` page (see `ctx.quietClasses` in
//     `design/round20.mjs`), because `CallToAction.astro`'s `ROLE` map is not exported and a copy typed here would
//     be a second memory of the same ladder (D264).

/** Find a needle the transform depends on, and name the needle when it is gone. */
const inv = (html, needle, what) => {
  const i = html.indexOf(needle);
  if (i < 0) {
    throw new Error(`round20-options: ${what} is not in the built page — the markup moved since this file was written (${needle.slice(0, 70)})`);
  }
  return i;
};

/** The offset just past the tag that closes the element opened at `open`. Same rule as
 *  `design/cta-rules.mjs`'s matchingClose: take both tags WHOLE and walk depth, or a nested open turns a balanced
 *  page into an unbalanced one. */
function closeTag(html, open, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = open + 1;
  let depth = 1;
  for (;;) {
    const m = re.exec(html);
    if (!m) break;
    if (m[1] === '/') {
      depth--;
      if (depth === 0) return m.index + m[0].length;
    } else depth++;
  }
  return html.length;
}

/** The one block on `/chat` that carries the Discord invite: the component's own wrapper, control + sentence. */
function inviteRegion(html) {
  const start = inv(html, '<div data-cta-block="discord-server"', 'the /chat invite block');
  return [start, closeTag(html, start, 'div')];
}
const anchorIn = (region) => {
  const m = /<a\b[\s\S]*?<\/a>/.exec(region);
  if (!m) throw new Error('round20-options: the invite block holds no anchor — the transform has nothing to change');
  return m[0];
};

/** Splice a region out of a page, returning the new bytes and the range they occupy (the runner locates the
 *  treated anchor by that range, because after `bare-invite` there is no `data-cta` left to find it by). */
const splice = (html, [s, e], replacement) => ({ html: `${html.slice(0, s)}${replacement}${html.slice(e)}`, from: s, to: s + replacement.length });

export const OPTIONS = [
  {
    id: 'registry-gloss',
    page: '/chat',
    shape: 'shipped',
    expect: 'ok',
    delta: false,
    sampleFrom: '<main',
    name: 'A — the control plus the registry sentence (what ships now)',
    transform: (html) => {
      const [s, e] = inviteRegion(html);
      return { html, from: s, to: e };
    },
    claim:
      'The incumbent of this item, and the row every delta below is read against: the control carries its registry id, and the element around it DECLARES itself the context, printing the sentence the registry owns for that destination ("The club keeps its own Discord server, and the invite adds you to it."). The block is 23 words beside the label, which is the whole of the fix — the reader learns what the button enrols them in before they press it. This shape is what `check:cta-context` reads off the artifact; it is not a layout the page happens to have.',
    ruled: 'S090, D467 (this item)',
  },
  {
    id: 'bare-invite',
    page: '/chat',
    shape: 'defect',
    expect: 'action-undeclared',
    delta: true,
    sampleFrom: '<main',
    name: 'B — the label alone (what shipped on 2026-11-20)',
    transform: (html) => {
      const region = inviteRegion(html);
      const a = anchorIn(html.slice(...region)).replace(/ data-cta="[^"]*"/, '');
      if (/data-cta=/.test(a)) throw new Error('round20-options: the bare variant still carries a data-cta id');
      return splice(html, region, a);
    },
    claim:
      'Exactly the shape the operator pointed at: a secondary control under the heading, its id and its sentence removed, nothing around it claiming to be its context. The reading calls it `action-undeclared` before it says anything about words \u2014 there are no words to weigh. This was not one call site: the research over the artifact of that date counted 49 marked links on 6 built pages, found the proximity window failing 0 of them and the block measure failing 17 \u2014 `/chat`\'s own invite among them at 0 words @measured 2026-11-20 by `node design/cta-inventory.mjs`, in docs/research/discord-invite-ux-2026-11-20.md \u00a75. Which is why the fix is an idiom and not a patch to /chat.',
    ruled: 'the defect this item exists to fix',
  },
  {
    id: 'machine-name-only',
    page: '/chat',
    shape: 'defect',
    expect: 'block-missing',
    delta: true,
    sampleFrom: '<main',
    name: 'C — the accessible name fixed, nothing painted',
    transform: (html) => {
      const region = inviteRegion(html);
      const a = anchorIn(html.slice(...region));
      if (!/class="sr-only"/.test(a)) throw new Error('round20-options: the invite anchor has no sr-only qualifier to test');
      return splice(html, region, a);
    },
    claim:
      'The half-fix, and the row that says why an accessible name is not the same thing as context: the anchor still declares its id and still carries the sr-only qualifier (" on Discord, opens in a new tab"), so a screen reader reads "Join the chat on Discord, opens in a new tab" — and a sighted reader sees two words and an arrow. The reading refuses it as `block-missing`: there is no element around the control claiming to be its context, so nothing painted names the server the invite enrols you in. `check:ext-links` is green on this row (0 findings, printed in the table beside it), which is the point — a green outbound-link gate coexisted with the defect the operator reported.',
    ruled: 'D317 (the qualifier) is necessary and not sufficient',
  },
  {
    id: 'prose-block',
    page: '/join',
    shape: 'shipped',
    expect: 'ok',
    delta: false,
    sampleFrom: '<section class="mt-12" aria-labelledby="join-chat"',
    name: 'D — the control inside the page\'s own prose',
    transform: (html) => {
      const start = inv(html, '<section class="mt-12" aria-labelledby="join-chat"', 'the /join chat section');
      return { html, from: start, to: closeTag(html, start, 'section') };
    },
    claim:
      'The same destination in the other shape the idiom allows: here the PAGE owns the block — a `<section>` whose own lead sentence is "The people, on an ordinary day, in the club\u2019s own Discord server." No gloss is printed by the component, because the prose is already there and a component that appended a sentence every time would write boilerplate over the page\'s own words. It carries more than three times the floor (20 words beside the label against a floor of 6), and the extra words are the club\'s, not the registry\'s. This is the shape to choose where the page already has something to say; A is the shape for where it does not \u2014 and the same id, the same registry row and the same reading accept both, which is what stops a sweep of 43 actions from becoming 43 copies of one sentence.',
    ruled: 'S090, D467 (this item)',
  },
  {
    id: 'band-shared-block',
    page: '/chat',
    shape: 'shipped',
    expect: 'ok',
    delta: false,
    targets: 'region',
    sampleFrom: 'class="bg-ink text-band-text"',
    name: 'E — one block, three actions: the exit band',
    transform: (html) => {
      const start = inv(html, '<div data-cta-block="calendar-feed meetup-group discord-server">', 'the exit band\u2019s declared block');
      return { html, from: start, to: closeTag(html, start, 'div') };
    },
    claim:
      'The multi-id shape: one element declaring three ids, so the band\'s two standing sentences are read as the context for the calendar feed, the Meetup group and the Discord invite at once — and each of the three is weighed against its own row (the feed must name a feed and an ask; the invite must name a server). The price of the shape is visible in the numbers: one block has to carry enough words for the most demanding of its three rows, and it must not swallow the page (over two thirds of the page\'s words fails as `block-too-wide`, which is what stops a `<main>`-sized wrap from laundering every action on it).',
    ruled: 'S090 (the multi-id form), D307 (the band is standing chrome)',
  },
  {
    id: 'quiet-label',
    page: '/chat',
    shape: 'demotion',
    expect: 'ok',
    delta: true,
    sampleFrom: '<main',
    name: 'F — the exit demoted to a quiet underlined label',
    transform: (html, ctx) => {
      const region = inviteRegion(html);
      const a = anchorIn(html.slice(...region));
      const quiet = /class="([^"]*min-h-8[^"]*)"/.exec(a);
      if (quiet) throw new Error('round20-options: the invite is already a quiet label, so this row would be the baseline');
      const swapped = a.replace(/data-control="secondary" /, '').replace(/class="[^"]*"/, `class="${ctx.quietClasses}"`);
      if (!swapped.includes(ctx.quietClasses)) throw new Error('round20-options: the class swap found no control class list to replace');
      return splice(html, region, html.slice(...region).replace(a, swapped));
    },
    claim:
      'The operator\'s second question — "it feels incorrect for us to use a button there for something that takes you off the page. Shouldn\'t it be an anchor link" — answered as a weight question, not a meaning question. The site already ships a third step below primary and secondary: the quiet underlined label, byte-for-byte the classes the `/dates` rows use for a per-date sign-up (read out of the built page, not retyped here). This row pays the context rule the same way A does — the block and the id are untouched — and its cost is elsewhere: the anchor stops carrying `data-control`, so it leaves the control census that `check:render` measures and `check:primary-action` counts. What this round does NOT price is the fold: D367 holds the invite in the first screen, and whether a quiet label still sits there is a pixel question for `check:render` and `design/fold-answers.mjs`, not a number this row can honestly print.',
    ruled: 'open — the operator\'s question, priced for meaning only',
  },
  {
    id: 'no-arrow',
    page: '/chat',
    shape: 'demotion',
    expect: 'ok',
    delta: true,
    sampleFrom: '<main',
    name: 'G — the glyph removed from an exit that keeps its qualifier',
    transform: (html) => {
      const region = inviteRegion(html);
      const a = anchorIn(html.slice(...region));
      const bare = a.replace(/<span aria-hidden="true">\u2192<\/span>/, '');
      if (bare === a) throw new Error('round20-options: the invite paints no arrow glyph to remove — the mark moved');
      return splice(html, region, html.slice(...region).replace(a, bare));
    },
    claim:
      'The operator\'s third question — "Shouldn\'t it be an anchor link with an external icon?" — as a measurement rather than an opinion. `check:ext-links` (S041, D317) demands `rel`, `target`, the sr-only qualifier and one name per platform; it does NOT demand the glyph, and this row proves it: with the arrow deleted the page is still green under that gate and still `ok` under the context rule. So the arrow is a design choice, and the choice this tree made is documented rather than implied — an `aria-hidden` glyph after an off-site control, and never after a same-site route (`ctaPlatform` is the only authority on "off-site", and D264 is why `check:cta-context` is written to fail a control that fakes the mark).',
    ruled: 'the arrow is not gated — this row is the evidence',
  },
];
