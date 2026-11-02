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

// Slot boxes are MEASURED, not drawn to taste. `design/whitespace-survey.mjs` reports the children of every
// grid/flex container on the built page (matched on COMPUTED display, because the hero grid here is `lg:grid
// lg:grid-cols-12` and a `.grid` class selector silently misses variant classes). A photo goes INTO a container,
// so the container is the slot: the hero's media column is 372x564 while the drawing inside it is 372x232.5.
// `proposed` boxes take their width from measured neighbours -- content width is 1180 at 1240 and 346 at 390.
const slots = [
  {
    id: 'PS-1', name: 'Hero media column',
    live: { 1240: [372, 564], 390: [346, 216] },
    aspect: 'portrait at 1240 (372 x 564, 1:1.52); at 390 the hero stops being a grid, so there is no empty column -- the mark alone is 346 x 216',
    fills: 'Shot 2 (venue interior) or shot 3 (hands and materials). Today the column holds the drawn mark at 372 x 232.5, so 331px of a 564px column paints nothing.',
    empty: 'The drawn mark, exactly as shipped today -- a slot with no photo is a state, not a grey rectangle (design/records/0010).',
    note: 'The mark stays in this column when there is no photo: photo-free by construction is still the rule (D94); the slot only changes what CAN go there.',
  },
  {
    id: 'PS-2', name: 'Venue strip (proposed)',
    proposed: { 1240: [1180, 320], 390: [346, 230] },
    aspect: '1180 x 320 is 3.69:1 -- a phone camera at 4:3 crops to this with real height lost, so shoot wide and level',
    fills: 'Shot 2 (venues): one strip per venue, the honest answer to "interesting venues" (Ambrosia Coffee is the venue node on the club\'s own group page).',
    empty: 'No strip at all. A proposed slot must not ship as an empty band.',
    note: "Width is not a taste call: 1180 is the measured content width at 1240 (the hero grid's own box) and 346 at 390. This is the largest area gain on the list.",
  },
  {
    id: 'PS-3', name: 'Join media column',
    live: { 1240: [526, 165], 390: [298, 225] },
    proposed: { 1240: [526, 316], 390: [298, 225] },
    aspect: 'the column is 526 x 165 today; the proposed photo is 526 x 316 because the copy column beside it already makes the row 316 tall',
    fills: 'Shot 1 (the board after a meeting) or shot 3 (materials). This is the column that today holds the Meetup png.',
    empty: 'Today: the Meetup logo at 200 x 192 (1.24% of the desktop page) inside a column 2.6x its area -- and the site\'s loudest colour belongs to Meetup.',
    note: 'Whatever goes here must be a FIXED box: the current image asks for 200x80 while its file is 834x799, and the page shifts 112px when it decodes (measured 2495 -> 2607).',
  },
  {
    id: 'PS-4', name: 'Event-card thumb (proposed)',
    live: { 1240: [367, 205], 390: [346, 205] },
    proposed: { 1240: [319, 110], 390: [298, 110] },
    aspect: '2.9:1 at 319 x 110 -- the measured card is 366.7 x 204.7 and its p-6 padding leaves a 319 x 157 interior, so the thumb fits above the copy without growing the card',
    fills: 'Shot 1 (board) or shot 4 (the sphere diagram artwork, which needs creator + licence, not just a file).',
    empty: 'No thumb: the card\'s type carries it (the share card already proves a drawn motif works).',
    note: 'This slot waits on the schedule surface, not on photography: the two event sections are switched off in src/config.json because the dates do not live in this repo yet.',
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
  <li><b>Fixed boxes, or the page moves.</b> The one image on the landing page asks for 200&times;80 while its
   file is 834&times;799, and Tailwind's preflight sets <code>img { height: auto }</code> &mdash; so the
   rendered box is 200&times;192, and because it is lazy-loaded the page reflows by
   <b>${meet ? Math.round(2607 - 2495) : '?'}px</b> when it decodes (measured: document height 2495 without it, 2607 with).
   Every photo slot gets a declared aspect ratio for this reason.</li>
  <li><b>The loudest colour on the site is not ours.</b> The Meetup png is <b>${colourSurvey ? colourSurvey.bands.find((b) => b.hueFrom === 0).pct : '?'}%</b>
   of the desktop page's pixels at hue 0-30&deg; and its mean chroma (0.226) is the highest in the system
   (round 9's census). Dropping it takes the page's chromatic share from
   <b>${colourSurvey ? colourSurvey.chromaticPct : '?'}%</b> to about
   <b>${colourSurvey ? (colourSurvey.chromaticPct - colourSurvey.bands.find((b) => b.hueFrom === 0).pct).toFixed(2) : '?'}%</b>
   &mdash; which is the honest cost of the operator's Q4 ruling, and the reason area (photos, content) has to
   pay for the drabness instead.</li>
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
