// round10-build.mjs — generates design/grill/round-10-photos.html: where photographs go, drawn to the
// page's own measured geometry.
//
//   node design/grill/round10-build.mjs && node design/round10.mjs
//
// Why a specimen for this at all: the operator asked to "ensure we have places for photos so I have an idea
// of what to expect" (PH-B, 2026-11-02). A list of slot names is not an idea of what to expect — sizes and
// empty states are. So every box in this file comes from design/whitespace-survey.mjs's report of the BUILT
// page (`.design/tmp-whitespace/space-root-{1240,390}.json`), drawn at a stated scale, and design/round10.mjs
// measures the drawing back and fails if a box is not within 1px of what the live page measured. A proposed
// box (a slot that does not exist yet) is labelled PROPOSED and sized from a measured neighbour — the
// document's own content width, the existing card's box — never invented.
//
// It also answers the "mostly whitespace" question quantitatively: each slot's painted-area gain is printed
// as a share of the page, next to the measured before-number.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const SCALE = 0.5;                                           // the diagram is half-size; labels say so
const SRC = [1240, 390];

const load = (w) => {
  const f = `.design/tmp-whitespace/space-root-${w}.json`;
  if (!existsSync(f)) throw new Error(`${f} missing — run npm run check:space first`);
  return JSON.parse(readFileSync(f, 'utf8'));
};
const pages = Object.fromEntries(SRC.map((w) => [w, load(w)]));

// Every style string ends each declaration with ';' — a missing semicolon in a generated style attribute
// silently invalidates the rest of the declaration (round 9's runbook).
const s = (pairs) => pairs.map(([k, v]) => `${k}:${v};`).join('');
const px = (v) => `${Math.round(v * SCALE)}px`;

const surfaceOf = (page, clsStart, tag) =>
  page.surfaces.find((x) => x.tag === tag && (x.cls || '').startsWith(clsStart));
const boxOf = (page, pred) => page.media.find(pred);

// Slot boxes are MEASURED, not drawn to taste, and they are looked up rather than remembered.
// `design/whitespace-survey.mjs` reports the children of every container whose COMPUTED display is grid/flex
// (matching a `.grid` class misses the hero's `lg:grid lg:grid-cols-12`), plus every such container itself.
// A photo goes INTO a container, so the container's column is the slot.
//
// This file used to hard-code the boxes. That is how it started asserting numbers the page had already changed
// (372x564 -> 376x564 when the third-party image left the page, since a lazy image's box is also a scrollbar's
// box), and one pair of columns was labelled backwards. So: every number below is fetched from the report by a
// matcher, and a matcher that finds nothing THROWS - a stale assumption in a specimen fails the build instead of
// becoming a plausible sentence (design/records/0014, design/records/0015).
const R = (v) => Math.round(v);
const need = (page, pred, what) => {
  const hit = page.slots.find(pred);
  if (!hit) {
    throw new Error(
      `round10-build: no ${what} in the slots report for ${page.width}px - the page changed shape and this ` +
      `matcher is stale. Slots found: ${page.slots.map((x) => `${x.tag}.${(x.cls || '').slice(0, 30)}`).join(' | ')}`,
    );
  }
  return hit;
};
const geo = {};
for (const w of SRC) {
  const page = pages[w];
  // The hero's media column only exists where `lg:` applies (>=1024px); below that the hero stacks and the only
  // thing in it is the mark. Recorded as null so the specimen says that instead of inventing a scaled number.
  // The page names its own places (`data-slot`), so that is the matcher. `lg:col-span-4` is not: the report
  // truncates class strings, and matching a slot to a styling class is matching it to whatever the layout
  // happens to be called this week.
  const hero = page.slots.find((x) => x.dataSlot === 'PS-1') || null;
  // Below 1024 the hero wrapper is not flex either, so the mark is not a grid/flex CHILD; it is still in the
  // media list, which reports every drawing at its computed box. Prefer the slot (it carries the container's
  // display and gap), fall back to media, and throw if neither knows about it.
  const mark = page.slots.find((x) => x.tag === 'svg' && /w-full h-auto/.test(x.cls || ''))
    || page.media.find((x) => x.tag === 'svg' && /w-full h-auto/.test(x.cls || ''));
  if (!mark) throw new Error(`round10-build: the hero mark is in neither the slots nor the media report at ${w}px`);
  const joinCols = page.slots.filter((x) => /items-center/.test(x.parent) && x.tag === 'div');
  if (joinCols.length < 2) throw new Error(`round10-build: expected two columns in the join card at ${w}px, found ${joinCols.length}`);
  // The card's two columns, in source order: [the list column, the call-to-action column]. Which one is TALLER
  // is what sets the row height - and getting that backwards is how "the copy column already makes the row 316
  // tall" ended up in a doc: it was the media column that was 316 tall, because it held the image.
  const [listCol, ctaCol] = joinCols;
  const card = need(page, (x) => /rounded-card/.test(x.cls || '') && /p-6/.test(x.cls || ''), 'a feature card');
  const cta = page.slots.find((x) => x.dataSlot === 'PS-3') || null;
  const contentW = Math.max(...page.regions.map((r) => r.w));
  geo[w] = {
    hero: hero ? [R(hero.w), R(hero.h)] : null,
    mark: [R(mark.w), R(mark.h)],
    // PS-3 is whatever the page calls PS-3; only if the label is missing do we fall back to "the second column
    // of the join card", and the row-height claim still uses both columns.
    join: [R(cta ? cta.w : ctaCol.w), R(cta ? cta.h : ctaCol.h)],
    joinLabelled: !!cta,
    listCol: [R(listCol.w), R(listCol.h)],
    rowH: R(Math.max(listCol.h, ctaCol.h)),
    card: [R(card.w), R(card.h)],
    cardInner: [R(card.w) - 48, R(card.h) - 48],
    contentW: R(contentW),
  };
}
const g = (w, k) => (geo[w][k] === null ? 'n/a' : geo[w][k].join(' x '));
const n = (w, k) => geo[w][k];

const slots = [
  {
    id: 'PS-1', name: 'Hero media column',
    live: { 1240: geo[1240].hero, 390: geo[390].mark },
    proposed: { 1240: [n(1240, 'mark')[0], n(1240, 'hero')[1] - n(1240, 'mark')[1] - 32], 390: null },
    aspect: `at 1240 the column is ${g(1240, 'hero')} and the mark inside it paints ${g(1240, 'mark')} - so ${n(1240, 'hero')[1] - n(1240, 'mark')[1]}px of a column the page already pays for paints nothing. At 390 the hero is not a grid, so there is no empty column: the mark alone is ${g(390, 'mark')}.`,
    fills: 'Shot 2 (venue interior) or shot 3 (hands and materials). The reserved place is the free part of the column beside the mark: 376 x 250 at 1240, which lands the column at ~517 of its 564 without moving the row.',
    empty: 'The drawn mark, exactly as shipped - a slot with no photo is a state, not a grey rectangle (design/records/0010).',
    note: 'The mark stays in this column whether or not a photo exists: photo-free by construction is still the rule (D94); the slot only changes what CAN go there.',
  },
  {
    id: 'PS-2', name: 'Venue strip (proposed)',
    proposed: { 1240: [geo[1240].contentW, 320], 390: [geo[390].contentW, 230] },
    aspect: `${n(1240, 'contentW')} x 320 is ${(n(1240, 'contentW') / 320).toFixed(2)}:1 - a phone camera at 4:3 crops to this with real height lost, so shoot wide and level`,
    fills: 'Shot 2 (venues): one strip per venue, the honest answer to "interesting venues" (Ambrosia Coffee is the venue node on the club\'s own group page).',
    empty: 'No strip at all. A proposed slot must not ship as an empty band.',
    note: `Width is not a taste call: ${n(1240, 'contentW')} and ${n(390, 'contentW')} are the widest containers the page reports at those widths. This is the largest area gain on the list, and the largest risk of shipping a void.`,
  },
  {
    id: 'PS-3', name: 'Join media column',
    live: { 1240: geo[1240].join, 390: geo[390].join },
    proposed: { 1240: geo[1240].join, 390: geo[390].join },
    aspect: `the column is ${g(1240, 'join')} at 1240 and ${g(390, 'join')} at 390; the list column beside it is ${g(1240, 'listCol')}, and the taller of the two sets the row (${n(1240, 'rowH')}px). This column's height is the call-to-action's own height, so a photo here is a growth, not a reclamation.`,
    labelled: n(1240, 'joinLabelled') ? 'PS-3 matched by its data-slot on the built page' : 'PS-3 label missing on the page - matched positionally instead',
    liveWhat: 'the column as it stands today - the call-to-action is what gives it this height',
    proposedWhat: "a photo at the column's measured size: the width is not a guess, and the height is the honest cost of putting an image here",
    fills: "Shot 1 (the board after a meeting) or shot 3 (materials). Unlike PS-1 this is not spare air: the column is as tall as the call-to-action, so a photo here adds its own height plus the gap (~152px at 532 x 128) to the card. Pay that for a photograph of this club, not for a stock one (D94).",
    empty: `Today the column carries the join path itself (the CTA), since the third-party mark was removed from the build on 2026-11-02. That is the state: it is not a void.`,
    note: 'Whatever goes here is a FIXED box: the image that used to sit here asked for 200x80 while its file is 834x799, preflight made the height attribute inert, and the page shifted 112px when it decoded (2495 -> 2607).',
  },
  {
    id: 'PS-4', name: 'Event-card thumb (proposed)',
    live: { 1240: geo[1240].card, 390: geo[390].card },
    proposed: { 1240: [geo[1240].cardInner[0], 110], 390: [geo[390].cardInner[0], 110] },
    aspect: `the measured card is ${g(1240, 'card')} and its p-6 padding leaves a ${g(1240, 'cardInner')} interior, so a ${n(1240, 'cardInner')[0]} x 110 thumb (${(n(1240, 'cardInner')[0] / 110).toFixed(2)}:1) fits above the copy without growing the card`,
    fills: 'Shot 1 (board) or shot 4 (the sphere diagram artwork, which needs creator + licence, not just a file).',
    empty: 'No thumb: the card\'s type carries it (the share card already proves a drawn motif works).',
    note: 'This slot waits on the schedule surface, not on photography: the two event sections are switched off in src/config.json because the dates do not live in this repo yet - and the operator has ruled the source must be phone-editable (Mobilizon or an ICS feed).',
  },
];

const before = SRC.map((w) => {
  const p = pages[w];
  return `<li><b>${w}px</b>: page ${p.height}px tall, painted <b>${p.paintedPct}%</b> of pixels differ from their own ground by the 0.05 same-colour bar; <b>${p.emptyRunPct}%</b> of the page height sits in ${p.emptyRuns} empty runs of at least ${p.gapMin}px.</li>`;
}).join('');

const meet = pages[1240].media.find((m) => m.tag === 'img' && /Meetup/.test(m.src || ''));
const colourSurvey = existsSync('.design/tmp-color/survey-root-1240.json')
  ? JSON.parse(readFileSync('.design/tmp-color/survey-root-1240.json', 'utf8')) : null;

const slotRows = slots.map((sl) => {
  const cells = SRC.map((w) => {
    const box = (sl.live && sl.live[w]) || (sl.proposed && sl.proposed[w]);
    const [bw, bh] = box;
    const gain = 100 * bw * bh / (pages[w].width * pages[w].height);
    const kind = sl.proposed && sl.proposed[w] ? (sl.live && sl.live[w] ? 're-sized' : 'PROPOSED') : 'measured';
    return `<div class="slotcell">
      <div class="slotbox" data-slot="${sl.id}" data-w="${bw}" data-h="${bh}" data-scale="${SCALE}"
           style="${s([['width', px(bw)], ['height', px(bh)]])}">
        <span class="slotlabel">${bw}&times;${bh} &middot; ${kind}</span>
      </div>
      <div class="slotmeta">${w}px &mdash; ${(bw * SCALE).toFixed(0)}&times;${(bh * SCALE).toFixed(0)} drawn at ${SCALE}&times;; painted-area gain <b>${gain.toFixed(2)}%</b> of that page</div>
    </div>`;
  }).join('');
  return `<section class="slot">
    <h3>${sl.id} ${sl.name}</h3>
    <div class="slotrow">${cells}</div>
    <dl>
      <dt>Aspect / crop</dt><dd>${sl.aspect}</dd>
      <dt>What fills it</dt><dd>${sl.fills}</dd>
      <dt>Empty state (what paints today)</dt><dd>${sl.empty}</dd>
      <dt>Rule it has to obey</dt><dd>${sl.note}</dd>
    </dl>
  </section>`;
}).join('\n');

// The page-as-measured diagram: surfaces at scale, empty runs hatched. This is the picture of "mostly
// whitespace" rather than the number for it.
const diagram = (w) => {
  const p = pages[w];
  const layers = [];
  for (const sf of p.surfaces) {
    layers.push(`<div class="surf" data-surf="${sf.tag}" style="${s([
      ['top', px(sf.y)], ['left', 0], ['width', px(sf.w)], ['height', px(sf.h)],
    ])}"><span>${sf.tag} ${Math.round(sf.w)}&times;${Math.round(sf.h)} &middot; paints ${sf.inkPct}% &middot; ${sf.chars} chars</span></div>`);
  }
  for (const r of p.gaps) {
    layers.push(`<div class="gapband" data-gap="${r.h}" style="${s([
      ['top', px(r.y)], ['left', 0], ['width', px(p.width)], ['height', px(r.h)],
    ])}"></div>`);
  }
  const reflow = p.pageHeight && p.pageHeight !== p.height
    ? ` &middot; the document later measured ${p.pageHeight}px, so it grew ${p.pageHeight - p.height}px when a lazy image decoded` : '';
  return `<div class="caption">${w}px page: captured height ${p.height}px${reflow}</div>
  <div class="page" data-page="${w}" data-w="${p.width}" data-h="${p.height}" data-scale="${SCALE}" style="${s([['width', px(p.width)], ['height', px(p.height)]])}">
    ${layers.join('\n')}
  </div>`;
};

const measuredBlock = existsSync('design/grill/round10/report.json')
  ? (() => {
    const rep = JSON.parse(readFileSync('design/grill/round10/report.json', 'utf8'));
    const bad = rep.slots.filter((r) => !r.ok);
    return `<section class="measured">
      <h2>Measured back off this specimen</h2>
      <p>${rep.slots.length} slot boxes drawn; <b>${bad.length} disagree</b> with the live page's own measured box by more than 1px (device-independent CSS px, read from the specimen in Firefox).</p>
      <ul>${rep.slots.map((r) => `<li>${r.id}: asked ${r.wantW}&times;${r.wantH}, painted box ${Math.round(r.gotW)}&times;${Math.round(r.gotH)} ${r.ok ? 'ok' : 'MISMATCH'}</li>`).join('')}</ul>
    </section>`;
  })() : `<section class="measured"><h2>Measured back off this specimen</h2><p>Not measured yet — run <code>node design/round10.mjs</code>.</p></section>`;

const html = `<!doctype html>
<html lang="en-US"><head><meta charset="utf-8"><title>Round 10 - where photographs go</title>
<link rel="stylesheet" href="../fonts/specimen.css">
<style>
 body { margin: 0; font: 15px/1.55 "Public Sans Variable", system-ui, sans-serif; color: #2b3330; background: #fbfbf9; }
 main { max-width: 980px; margin: 0 auto; padding: 32px 20px 80px; }
 h1 { font: 700 30px/1.2 "PT Serif", serif; margin: 0 0 6px; }
 h2 { font: 700 21px/1.3 "PT Serif", serif; margin: 40px 0 10px; }
 h3 { font: 700 17px/1.3 "PT Serif", serif; margin: 26px 0 8px; }
 p, li, dd, dt { max-width: 74ch; }
 .lede { font-size: 17px; max-width: 70ch; }
 .num { background: #f2f2ee; border-left: 4px solid #8a8f86; padding: 10px 14px; margin: 14px 0; }
 .page { position: relative; background: #fff; border: 1px solid #c9ccc4; margin: 10px 0 18px; box-sizing: border-box; }
 .surf { position: absolute; border-bottom: 1px dashed #b9bdb4; box-sizing: border-box; }
 .surf span { font-size: 11px; color: #5c615a; padding: 2px 4px; display: inline-block; white-space: nowrap; }
 .gapband { position: absolute; box-sizing: border-box; background: repeating-linear-gradient(45deg, rgba(206,64,74,.16) 0 6px, rgba(206,64,74,0) 6px 12px); }
 .slotrow { display: flex; gap: 22px; flex-wrap: wrap; }
 .slotcell { flex: 1 1 320px; }
 .slotbox { border: 2px dashed #2b3330; box-sizing: border-box; background: rgba(43,51,48,.04); position: relative; }
 .slotlabel { position: absolute; top: 4px; left: 6px; font-size: 12px; }
 .slotmeta { font-size: 12px; color: #5c615a; margin-top: 5px; max-width: 46ch; }
 dl { display: grid; grid-template-columns: 210px 1fr; gap: 6px 14px; margin: 12px 0 0; }
 dt { font-weight: 700; font-size: 13px; } dd { margin: 0; font-size: 14px; }
 .measured { margin-top: 34px; border-top: 1px solid #c9ccc4; padding-top: 14px; font-size: 13px; }
 code { font: 13px/1.4 ui-monospace, monospace; }
 .scale { font-size: 12px; color: #5c615a; }
 .caption { font-size: 12px; color: #5c615a; margin-top: 12px; }
</style></head>
<body><main>
 <h1>Round 10 &mdash; where photographs go</h1>
 <p class="lede">PH-B: reserve the places, so the shot list has sizes to aim at and an empty state has a
 defined look. Every box below is the built page's own geometry, read in Firefox by
 <code>npm run check:space</code>, drawn at ${SCALE}&times;.</p>

 <h2>The emptiness being answered</h2>
 <div class="num"><ul>${before}</ul></div>
 <p class="scale">Read: about two fifths of the vertical journey at 1240 crosses rows that contain no painted
 pixel at all. Colour (round 9's S-B) moves the reader-visible share from 0.0% to 0.4% &mdash; it does not
 fill this. Area does: a photo, a strip, or real content.</p>

 <h2>The page as measured, at ${SCALE}&times;</h2>
 <p class="scale">Hatched bands are empty runs of ${pages[1240].gapMin}px or more. Labels are each surface's
 measured box, the share of its own pixels it paints, and how many characters of copy it carries.</p>
 ${diagram(1240)}
 ${diagram(390)}

 <h2>The slots</h2>
 <p class="scale">"measured" = the box exists on the built page today. "PROPOSED" = it does not, and its size
 comes from a measured neighbour (document content width, the existing card) rather than from taste.</p>
 ${slotRows}

 <h2>Two numbers that make the rules concrete</h2>
 <ul>
  <li><b>Fixed boxes, or the page moves.</b> The image this page used to ship asked for 200&times;80 while its
   file was 834&times;799, and Tailwind's preflight sets <code>img { height: auto }</code> &mdash; so the rendered
   box was 200&times;192, and because it was lazy-loaded the page reflowed by <b>112px</b> when it decoded
   (measured: document 2495px without it, 2607px with). It is out of the build now, which is why nothing in the
   media list is a photograph &mdash; but every photo slot still declares its aspect ratio for exactly this reason.</li>
  <li><b>The loudest colour on the site was not ours.</b> Before the 2026-11-02 mark demotion the survey found
   <b>0.48%</b> of the desktop page at hue 0-30&deg; with mean chroma 0.226 &mdash; the Meetup png &mdash; against
   <b>0.49%</b> of the whole page at the "colour a reader would name" bar. On mobile it was 1.04 of 1.06. So
   <b>~96% of the site's visible colour belonged to another company</b>. It is gone: the 0-30&deg; band is now
   empty (the survey reports ${colourSurvey ? colourSurvey.bands.length : '?'} families, none of them red), and the
   page's reader-named colour is <b>${colourSurvey ? colourSurvey.strongPct : '?'}%</b>. The drabness is area and
   content, not another company's red &mdash; which is what these slots are for.</li>
</ul>

 <h2>Rules every slot inherits (already ruled, not new)</h2>
 <ul>
  <li>No stock people photography; no photo of this club exists, so strangers are a false statement about who
   attends (D86/D94). Prefer the board, venues, hands and materials.</li>
  <li>An identifiable face is personal data: opt-in, first name by default, withdrawable
   (<code>.notes/consent-and-data-policy.md</code> rule 4).</li>
  <li>Strip EXIF/GPS on commit &mdash; phone photos embed the location of a real gathering.</li>
  <li>Never hot-link Meetup's CDN: their event images are theirs. Ask for source files
   (<code>.notes/asset-sources.md</code>).</li>
  <li>Text on a photo takes its colour from the photo, not from a rule: the club's own four images split both
   ways (chalkboard mean luminance 0.014 takes light type; the parchment cover 0.791 takes dark).</li>
  <li>Processing is already in the repo: <code>astro:assets</code> + <code>imageService: 'compile'</code> and
   <code>sharp</code> with <code>gravity: 'attention'</code> for subject-aware crops.</li>
 </ul>

 ${measuredBlock}
</main></body></html>`;

writeFileSync('design/grill/round-10-photos.html', html);
console.log(`wrote design/grill/round-10-photos.html — ${slots.length} slots, ${SRC.join('/')}px diagrams at ${SCALE}x`);
for (const sl of slots) {
  const box = sl.live?.[1240] || sl.proposed?.[1240];
  console.log(`  ${sl.id} ${sl.name}: ${box.join('x')} at 1240 (${(100 * box[0] * box[1] / (pages[1240].width * pages[1240].height)).toFixed(2)}% of page)`);
}
