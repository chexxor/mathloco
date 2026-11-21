#!/usr/bin/env node
/**
 * round20.mjs — grill round 20: what a call to action is made OF. Prices every treatment in
 * `design/grill/round20-options.mjs` with the SAME reading `scripts/check-cta-context.mjs` enforces, and writes
 * `design/grill/round20/report.json` for `design/grill/round20-build.mjs` to render.
 *
 * Why the runner shares its instrument with the gate (D264, one home per rule): this round exists to answer the
 * operator's three questions about one control, and the answer has to be the reading the site will actually
 * enforce tomorrow. A specimen priced by a private copy of the classifier is a claim about a hypothetical gate —
 * the failure that put `design/cta-rules.mjs` in the middle of the probe and the gate in the first place.
 *
 * What it refuses:
 *   - a stale `dist/` (design/dist-fresh.mjs, the rule every dist-reading probe pays, D118's topology);
 *   - a `delta` row that changes no bytes (round 15's rule — an option that changes nothing is not an answer);
 *   - a row whose `expect` the reading does not confirm: the runner THROWS, so the round exits 1 and a claim in
 *     the specimen cannot outlive the finding it rests on (round 9's discipline);
 *   - a transform whose needle has moved (thrown by the options module, round 19's rule).
 *
 * Not a gate: it reads a built `dist/`, mutates copies of pages into gitignored scratch, and its verdict is a
 * design choice for the operator rather than a rule the site enforces (D269's reason for staying out of
 * `scripts/gate-run.mjs`, the same reason `round13`/`round15`/`round19` are out).
 *
 *   node design/round20.mjs            # price the rows, write report.json
 *   node design/round20:specimen       # render the specimen from that report
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { builtPageFiles } from './dist-pages.mjs';
import { distState, staleLine } from './dist-fresh.mjs';
import { pageActions, contextVerdict, wordsIn, MIN_WORDS, MAX_FRACTION } from './cta-rules.mjs';
import { OPTIONS } from './grill/round20-options.mjs';
import { extLinkFindings } from '../scripts/check-ext-links.mjs';

const TMP = resolve('.design/tmp-round20');
mkdirSync(TMP, { recursive: true });

// Refuse before pricing: a price list about a build this tree did not make is worse than no price list (D156).
// `distState()` returns `{present, fresh, input, built, allowed}` and there is NO `.stale` field - an earlier
// draft of this guard tested `state.stale`, so it silently never fired, the same defect caught the same day in
// design/cta-inventory.mjs @caught 2026-11-21 by reading dist-fresh.mjs's return shape instead of assuming it.
const state = distState();
if (!state.fresh && !state.allowed) {
  console.error(`round20: refusing to price a stale build.`);
  console.error(staleLine(state));
  console.error('Run `npm run build` (or `node design/dist-fresh.mjs` to see the pair of mtimes) first.');
  process.exit(1);
}

const pages = builtPageFiles('dist/client');
const byRoute = new Map(pages.map((p) => [p.route, p]));
const read = (route) => {
  const p = byRoute.get(route);
  if (!p) throw new Error(`round20: no built page for ${route} — this tree emits ${[...byRoute.keys()].join(' ')}`);
  return { page: p, html: readFileSync(p.file, 'utf8') };
};

/** The quiet step, read out of the artifact rather than typed here (D264): `/dates` paints a per-date sign-up as
 *  an underlined label with `min-h-8`, and that is the class list the demotion row needs. A copy in this file
 *  would be a second memory of the ladder, and the day `CallToAction.astro`'s quiet role changes, this round
 *  would be pricing a step the site no longer ships. */
const quietClasses = (() => {
  const html = read('/dates').html;
  const m = /<a\b[^>]*data-rsvp-platform="Meetup"[^>]*class="([^"]*\bmin-h-8\b[^"]*)"/.exec(html);
  if (!m) throw new Error('round20: no /dates sign-up label carries min-h-8 — the quiet step moved, and the demotion row has nothing to be demoted to');
  return m[1];
})();

/** Census of the artifact as it stands: what a reader of the specimen is comparing the rows against. */
const census = (() => {
  const byKind = {};
  let actions = 0;
  let ok = 0;
  let widest = { words: 0, share: 0, route: '', ids: '' };
  const shared = { actions: 0, route: '', ids: '' };
  for (const p of pages) {
    const { pageWords, anchors } = pageActions(p, { keepAll: true });
    const perBlock = new Map();
    for (const a of anchors) {
      if (a.isAction) {
        byKind[a.kind] = (byKind[a.kind] ?? 0) + 1;
        actions++;
        if (contextVerdict(a).ok) ok++;
      }
      for (const b of a.blocks) {
        const key = b.blockIds.join(' ');
        perBlock.set(b, (perBlock.get(b) ?? 0) + 1);
        const words = wordsIn(b.text);
        const share = pageWords ? words / pageWords : 0;
        if (words > widest.words) widest = { words, share, route: p.route, ids: key };
      }
    }
    for (const [b, n] of perBlock) {
      if (n > shared.actions) {
        shared.actions = n;
        shared.route = p.route;
        shared.ids = b.blockIds.join(' ');
      }
    }
  }
  return { pages: pages.length, actions, byKind, ok, minWords: MIN_WORDS, maxShare: MAX_FRACTION, widest, shared };
})();

const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const controlsOn = (html) => [...html.matchAll(/data-control="([^"]*)"/g)].length;

const rows = [];
for (const opt of OPTIONS) {
  const { page, html: base } = read(opt.page);
  const out = opt.transform(base, { quietClasses });
  if (typeof out?.html !== 'string' || typeof out.from !== 'number' || typeof out.to !== 'number') {
    throw new Error(`round20: option ${opt.id} did not return {html, from, to}`);
  }
  if (out.html === base && opt.delta) {
    throw new Error(`round20: option ${opt.id} claims to be a delta and changed no byte of ${opt.page} (round 15's rule)`);
  }
  if (out.html !== base && !opt.delta) {
    throw new Error(`round20: option ${opt.id} claims to show a shipped shape and mutated ${opt.page} — the shape is no longer what this tree ships`);
  }
  const file = resolve(TMP, `${opt.id}${page.file}`);
  mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true });
  writeFileSync(file, out.html);

  const { pageWords, anchors } = pageActions({ route: page.route, file });
  const inRegion = anchors.filter((a) => a.at >= out.from && a.at < Math.max(out.to, out.from + 1));
  const targets = opt.targets === 'region' ? inRegion : inRegion.slice(0, 1);
  if (!targets.length) throw new Error(`round20: option ${opt.id} leaves no anchor in the region it changed — the transform moved the control out of its own range`);

  const verdicts = targets.map((a) => {
    const v = contextVerdict(a);
    const block = a.blocks.find((b) => b.blockIds.includes(a.declaredId)) ?? a.blocks[0] ?? null;
    return {
      rule: v.ok ? 'ok' : v.rule,
      detail: v.detail ?? '',
      label: a.label,
      accessible: a.accessible,
      href: a.href,
      control: a.control,
      declaredId: a.declaredId,
      kind: a.kind,
      zone: a.zone,
      blockIds: block ? block.blockIds : null,
      blockWords: block ? wordsIn(block.text.replace(new RegExp(escRe(a.label), 'gi'), ' ')) : -1,
      blockShare: block && pageWords ? +(wordsIn(block.text) / pageWords).toFixed(3) : null,
    };
  });

  // Every OTHER action on the page must keep its verdict: a row that buys its own context by deleting another
  // control's is a row that lies about its cost. `before` is the shipped page, so a defect row is compared with
  // the page it starts from, not with an ideal.
  const verdictOf = (a) => (contextVerdict(a).ok ? 'ok' : contextVerdict(a).rule);
  const shipped = pageActions(page).anchors.filter((a) => a.isAction).map((a) => ({ label: a.label, rule: verdictOf(a) }));
  const pageFindings = anchors.filter((a) => a.isAction && verdictOf(a) !== 'ok').map((a) => `${a.label}: ${verdictOf(a)}`);
  const collateral = anchors
    .filter((a) => a.isAction && verdictOf(a) !== 'ok' && !targets.some((t) => t.at === a.at))
    .filter((a) => !shipped.some((b) => b.label === a.label && b.rule === verdictOf(a)))
    .map((a) => `${a.label} -> ${verdictOf(a)}`);
  if (collateral.length) {
    throw new Error(`round20: option ${opt.id} damaged another action on ${opt.page}: ${collateral.join('; ')}`);
  }

  const ext = extLinkFindings(out.html, opt.page);
  const extBefore = extLinkFindings(base, opt.page);

  // the claim the round makes has to be confirmed by the reading, or the round fails (round 9's discipline)
  const rules = verdicts.map((v) => v.rule);
  if (opt.expect === 'ok') {
    if (!rules.every((r) => r === 'ok')) throw new Error(`round20: option ${opt.id} claims context and the reading says ${rules.join(', ')} — ${verdicts.map((v) => v.detail).join(' | ')}`);
  } else if (!rules.includes(opt.expect)) {
    throw new Error(`round20: option ${opt.id} claims the finding ${opt.expect} and the reading says ${rules.join(', ')}`);
  }
  const marker = out.html.indexOf(opt.sampleFrom);
  if (marker < 0) throw new Error(`round20: option ${opt.id} names a sampleFrom marker that is not in its own output`);
  // back up to the start of the TAG the marker landed in, so the specimen gets whole elements rather than an
  // attribute dangling out of a slice (the band row's marker is its `class=`, and a fragment starting mid-tag
  // renders as text).
  const sampleStart = out.html.lastIndexOf('<', marker);
  if (sampleStart < 0) throw new Error(`round20: option ${opt.id}'s sample marker is not inside an element`);

  rows.push({
    id: opt.id,
    name: opt.name,
    page: opt.page,
    shape: opt.shape,
    expect: opt.expect,
    claim: opt.claim,
    ruled: opt.ruled,
    markup: out.html.slice(out.from, out.to),
    sample: out.html.slice(sampleStart, out.to),
    verdicts,
    pageActions: anchors.filter((a) => a.isAction).length,
    pageFindings,
    findingsBefore: shipped.filter((b) => b.rule !== 'ok').length,
    extFindings: ext.fails.length,
    extChecked: ext.checked,
    extFindingsBefore: extBefore.fails.length,
    controlsBefore: controlsOn(base),
    controlsAfter: controlsOn(out.html),
    pageWords,
  });

  console.log(
    `${opt.id.padEnd(19)} ${opt.page.padEnd(6)} ${rules.join('/').padEnd(20)} block ${String(verdicts.map((v) => v.blockWords).join('/')).padEnd(8)}w  share ${verdicts.map((v) => v.blockShare).join('/')}  actions ${shipped.filter((b) => b.rule !== 'ok').length}->${pageFindings.length}  controls ${controlsOn(base)}->${controlsOn(out.html)}  ext ${extBefore.fails.length}->${ext.fails.length}`,
  );
}

const report = {
  measuredAt: new Date().toISOString(),
  host: `${process.platform} ${process.release.name} ${process.version}`,
  quietClasses,
  census,
  options: rows,
  notes: [
    'Every row is a byte delta on the built page in dist/client, applied to a copy under .design/tmp-round20/ and re-read by design/cta-rules.mjs — the same reading scripts/check-cta-context.mjs enforces, so a specimen number and a gate finding cannot come from different memories of the page (D264).',
    'No pixel is measured in this round. Nothing here claims a height, a box, or a position relative to a fold; check:render and design/fold-answers.mjs price painted geometry when a variant graduates, and a specimen that printed a geometry number it never measured would be the defect D269 exists to stop.',
    `The context rule at the time of this run: a block must hold at least ${MIN_WORDS} words besides the action's own label, and may account for at most ${Math.round(MAX_FRACTION * 100)}% of its page's words (src/lib/links.mjs, CTA_BLOCK_MIN_WORDS / CTA_BLOCK_MAX_FRACTION).`,
    'The specimen is generated from this file. Edit round20-options.mjs or re-run this runner; never edit round-20-cta.html.',
  ],
};

const OUT = resolve('design/grill/round20/report.json');
mkdirSync(OUT.slice(0, OUT.lastIndexOf('/')), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\ncensus: ${census.pages} built pages, ${census.actions} actions (${Object.entries(census.byKind).map(([k, v]) => `${k} ${v}`).join(', ')}), ${census.ok} in context`);
console.log(`biggest declared block: ${census.widest.words} words = ${(census.widest.share * 100).toFixed(0)}% of ${census.widest.route} [${census.widest.ids}]`);
console.log(`one block carrying the most actions: ${census.shared.actions} on ${census.shared.route} [${census.shared.ids}]`);
console.log(`round20: ${rows.length} treatments -> ${OUT}`);
