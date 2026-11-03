// round12-build.mjs — the art shortlist the operator chooses from, drawn at the real slot sizes.
//
//   node design/grill/round12-build.mjs     # or: npm run round12   (which also verifies: design/round12.mjs)
//
// Source: insideoutlibrary.com — illustrations cut out of public-domain books. Fetched from the
// curated `/s/<subject>` subject pages and two operator-supplied pages (`/b/firstsixbooksofe00byrn`,
// `/p/ia-principlesunderl00unit-514-212`); robots.txt allows those paths and disallows `?q=` search
// and `/api/`, which is what this builder respects. Rights, quoted from the site's own about page on
// 2026-11-03: "Every picture is checked against its library's rights statement before it is admitted
// (public domain, the Public Domain Mark, or no known copyright restrictions), so there is no
// permission to ask, no credit required, and commercial use is included."
//
// The images are scratch (`.design/tmp-art/`, gitignored); the *specimen* is tracked and carries the
// crops as data URIs so it survives a fresh clone with no broken pointers. Every number printed in the
// page is measured off the crop's painted bytes at build time — nothing here is a guess from metadata.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { oklchFromRgb } from './okcolor.mjs';

const IMG = '.design/tmp-art/img';
const CROPS = '.design/tmp-art/crops';

// The slots, exactly as PH-B reserved them (design/grill/round-10-photos.html, verified by round10.mjs).
const SLOT = {
  'PS-1': { w: 372, h: 564, what: 'hero media column (1024px and up)' },
  'PS-3': { w: 526, h: 316, what: 'join-section media column' },
  'PS-4': { w: 319, h: 110, what: 'event-card thumb' },
  'PS-2': { w: 1180, h: 320, what: 'proposed venue strip' },
};
// check:area at siteFp 77d8dc87df — the denominator every "share of the page" below is taken against.
const PAGE_AREA_1240 = 1240 * 4196;
const NAMED_TODAY = 0.02; // % of the page at chroma >= 0.08 today (design/color-survey.mjs, 2026-11-03)

// Palette role hues as declared in src/styles/global.css @theme.
const ROLES = [
  ['gold 62', 62], ['gold-on-ink 84', 84], ['paper 85', 85], ['path-discord 35', 35],
  ['path-mobilizon 105', 105], ['path-calendar 205', 205], ['path-meetup 315', 315], ['ink/rule 152', 152],
];
// The brand table from design/brand-distance.mjs (the instrument the operator's "looks like Amazon"
// objection was settled with). Same colours, so the distances are comparable.
const BRANDS = {
  'Amazon yellow #FFB300': '#FFB300', 'Amazon orange #FF9900': '#FF9900', 'UPS gold #FFB500': '#FFB500',
  'Walmart yellow #FFC220': '#FFC220', 'IKEA yellow #FFD100': '#FFD100', 'UMN gold #FFCD0B': '#FFCD0B',
  'Michigan maize #FFCB05': '#FFCB05', 'Amazon link blue #0066C3': '#0066C3', 'Walmart blue #0071CE': '#0071CE',
  'IKEA blue #0051A5': '#0051A5', 'Amazon navy #232F3E': '#232F3E', 'Target red #CC0000': '#CC0000',
  'FedEx orange #FF6200': '#FF6200', 'Caltech orange #FF6E00': '#FF6E00',
};

const ART = [
  // operator-supplied pages first
  { id: 'ia-firstsixbooksofe00byrn-176-281', slot: 'PS-1', why: 'operator pick: Byrne Euclid, sparse two-colour figure', book: 'The first six books of the elements of Euclid… coloured diagrams instead of letters (1847)' },
  { id: 'ia-firstsixbooksofe00byrn-40-33', slot: 'PS-1', why: 'Byrne: tall figure, yellow wedge + blue arc', book: 'Byrne Euclid (1847)' },
  { id: 'ia-firstsixbooksofe00byrn-99-147', slot: 'PS-1', why: 'Byrne, loud: full-bleed colour — shown as the control', book: 'Byrne Euclid (1847)' },
  { id: 'ia-opusculumgeograp00myri-22-0', slot: 'PS-1', why: 'armillary sphere: the mark’s own subject, 1590', book: 'Opusculum geographicum rarum (1590)' },
  { id: 'ia-firstsixbooksofe00byrn-111-168', slot: 'PS-3', why: 'Byrne, quietest: mostly ink, one red element', book: 'Byrne Euclid (1847)' },
  { id: 'ia-firstsixbooksofe00byrn-37-26', slot: 'PS-3', why: 'Byrne: half-disc + wedge, fills the column', book: 'Byrne Euclid (1847)' },
  { id: 'ia-principlesunderl00unit-514-212', slot: 'PS-3', why: 'operator pick: radio waveform, hand-drawn, colourless', book: 'The principles underlying radio communication (1922)' },
  { id: 'ia-ioanniskepplerih00kepl-271-0', slot: 'PS-3', why: 'Kepler, Harmonices mundi: the polyhedra plate', book: 'Ioannis Keppleri Harmonices mundi libri V (1619)' },
  { id: 'ia-mathematicalrecr1920ball-210-32', slot: 'PS-3', why: 'labyrinth from Mathematical recreations', book: 'Mathematical recreations and essays (1920)' },
  { id: 'ia-firstsixbooksofe00byrn-123-184', slot: 'PS-4', why: 'Byrne: the only plate wide enough for a thumb', book: 'Byrne Euclid (1847)' },
  { id: 'ia-elementsofeuclid1903eucl-297-210', slot: 'PS-4', why: 'Euclid 1903: colourless construction, wide', book: 'The elements of Euclid for the use of schools and colleges (1903)' },
];
// the desaturation ladder, measured — for the operator who likes Byrne but not what it does to the census
const LADDER = ['ia-firstsixbooksofe00byrn-37-26', 'ia-firstsixbooksofe00byrn-176-281'];
const SATS = [100, 75, 50, 25];

mkdirSync(IMG, { recursive: true });
mkdirSync(CROPS, { recursive: true });

const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:159.0) Gecko/20100101 Firefox/159.0';
async function source(id) {
  const f = `${IMG}/${id}.webp`;
  if (!existsSync(f)) {
    const r = await fetch(`https://img.insideoutlibrary.com/img/1024/${id}.webp`, { headers: { 'user-agent': ua } });
    if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
    writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    await new Promise((r) => setTimeout(r, 250)); // one request per picture, politely
  }
  return readFileSync(f);
}

// measure painted bytes: luminance, ink, the two chroma bars, hue families, nearest palette role,
// nearest brand colour, and what a full slot of it adds to the page census
async function stats(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels, n = info.width * info.height;
  let Lsum = 0, ink = 0, c04 = 0, c08 = 0;
  const fam = new Map();
  for (let i = 0; i < data.length; i += ch) {
    const { L, C, h } = oklchFromRgb(data[i], data[i + 1], data[i + 2]);
    Lsum += L;
    if (L < 0.35) ink++;
    if (C >= 0.04) c04++;
    if (C >= 0.08) {
      c08++;
      const k = Math.floor(h / 30) * 30;
      const e = fam.get(k) || { n: 0, hs: 0, cs: 0, ls: 0, rs: 0, gs: 0, bs: 0 };
      e.n++; e.hs += h; e.cs += C; e.ls += L; e.rs += data[i]; e.gs += data[i + 1]; e.bs += data[i + 2];
      fam.set(k, e);
    }
  }
  const dist = (a, hex) => {
    const x = hex.replace('#', '');
    const rgb = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
    const A = oklchFromRgb(...rgb);
    const B = oklchFromRgb(...a);
    const ah = (A.h * Math.PI) / 180, bh = (B.h * Math.PI) / 180;
    return Math.hypot(A.L - B.L, A.C * Math.cos(ah) - B.C * Math.cos(bh), A.C * Math.sin(ah) - B.C * Math.sin(bh));
  };
  const fams = [...fam].map(([, e]) => {
    const meanH = e.hs / e.n, meanRGB = [e.rs / e.n, e.gs / e.n, e.bs / e.n];
    const role = ROLES.map(([r, h]) => [r, Math.min(Math.abs(h - meanH), 360 - Math.abs(h - meanH))]).sort((x, y) => x[1] - y[1]);
    const brand = Object.entries(BRANDS).map(([b, hex]) => [b, dist(meanRGB, hex)]).sort((x, y) => x[1] - y[1]);
    return {
      px: +(100 * e.n / n).toFixed(2), meanH: Math.round(meanH), meanC: +(e.cs / e.n).toFixed(3), meanL: +(e.ls / e.n).toFixed(2),
      role: `${role[0][0]} -${Math.round(role[0][1])}deg`, brand: `${brand[0][1].toFixed(3)} ${brand[0][0]}`,
      commerce: meanH <= 75 && e.cs / e.n >= 0.15,
    };
  }).sort((a, b) => b.px - a.px);
  return { w: info.width, h: info.height, meanL: +(Lsum / n).toFixed(3), ink: +(100 * ink / n).toFixed(2), c04: +(100 * c04 / n).toFixed(2), c08: +(100 * c08 / n).toFixed(2), fams };
}

async function crop(buf, slot, { sat } = {}) {
  const s = SLOT[slot];
  const p = `${CROPS}/${slot}${sat !== undefined ? `-s${sat}` : ''}-{W}x{H}.png`;
  const file = p.replace('{W}', s.w).replace('{H}', s.h);
  let img = sharp(buf).resize({ width: s.w * 2, height: s.h * 2, fit: 'cover', position: 'attention' });
  if (sat !== undefined) img = img.modulate({ saturation: sat / 100 });
  const out = await img.png().toBuffer();
  return { file, buf: out };
}

const rows = [];
for (const a of ART) {
  const src = await source(a.id);
  const s = SLOT[a.slot];
  const full = await stats(src);
  const asp = full.w / full.h, target = s.w / s.h;
  const keep = +(asp > target ? target / asp : asp / target).toFixed(2);
  const { file, buf } = await crop(src, a.slot);
  const c = await stats(buf);
  const jpeg = (await sharp(buf).jpeg({ quality: 72 }).toBuffer()).toString('base64');
  rows.push({
    ...a, slot: a.slot, srcW: full.w, srcH: full.h, keep,
    covers2x: full.w >= s.w * 2 && full.h >= s.h * 2,
    crop: c, areaPct: +(100 * (s.w * s.h) / PAGE_AREA_1240).toFixed(2),
    addNamed: +(c.c08 * (s.w * s.h) / PAGE_AREA_1240).toFixed(3), jpeg,
  });
}

const ladder = []; // measured, drawn as a table: the bytes go to the crops the operator chooses from
for (const id of LADDER) {
  const src = await source(id);
  const cell = { id, sat: [] };
  for (const sat of SATS) {
    const { buf } = await crop(src, 'PS-3', { sat });
    const c = await stats(buf);
    cell.sat.push({
      sat, c08: c.c08, ink: c.ink, meanL: c.meanL,
      fam: c.fams[0] ? `${c.fams[0].meanH}deg C${c.fams[0].meanC} ${c.fams[0].role}${c.fams[0].commerce ? ' COMMERCE' : ''}` : 'none',
      brand: c.fams[0] ? c.fams[0].brand : '-',
      jpeg: (await sharp(buf).jpeg({ quality: 70 }).toBuffer()).toString('base64'),
    });
  }
  ladder.push(cell);
}

const card = (r) => `
  <section class="card">
    <div class="box" data-slot="${r.slot}" data-id="${r.id}" data-w="${SLOT[r.slot].w}" data-h="${SLOT[r.slot].h}" style="width:${SLOT[r.slot].w}px;height:${SLOT[r.slot].h}px">
      <img src="data:image/jpeg;base64,${r.jpeg}" width="${SLOT[r.slot].w}" height="${SLOT[r.slot].h}" alt="">
    </div>
    <h3>${r.slot} · ${SLOT[r.slot].w}×${SLOT[r.slot].h}</h3>
    <p class="why">${r.why}</p>
    <p class="prov">${r.book}<br>insideoutlibrary.com → /p/${r.id}</p>
    <p class="num">source ${r.srcW}×${r.srcH} · keeps ${Math.round(r.keep * 100)}% of it in this box · ${r.covers2x ? 'covers 2×' : 'does not cover 2×'}<br>
    crop paints: mean L ${r.crop.meanL} · ink ${r.crop.ink}% · chroma ≥.04 ${r.crop.c04}% · <b>≥.08 ${r.crop.c08}%</b><br>
    ${r.crop.fams[0] ? `biggest colour family: ${r.crop.fams[0].px}% of the box at mean hue ${r.crop.fams[0].meanH}°, C ${r.crop.fams[0].meanC}, L ${r.crop.fams[0].meanL} · nearest role <b>${r.crop.fams[0].role}</b> · nearest brand ${r.crop.fams[0].brand}${r.crop.fams[0].commerce ? ' · <b>commerce zone</b>' : ''}<br>` : 'paints no colour a reader would name<br>'}
    a full box of this adds <b>${r.addNamed}%</b> of the whole page at chroma ≥ .08 (page today: ${NAMED_TODAY}%)</p>
  </section>`;

const html = `<!doctype html>
<html lang="en-US"><head><meta charset="utf-8"><title>Round 12 — public-domain art at the real slot sizes</title>
<link rel="stylesheet" href="../fonts/specimen.css">
<style>
 body { margin: 0; font: 15px/1.55 "Public Sans Variable", system-ui, sans-serif; color: #2b3330; background: #f7f5f1; }
 main { max-width: 1040px; margin: 0 auto; padding: 32px 20px 80px; }
 h1 { font: 700 30px/1.2 "PT Serif", serif; margin: 0 0 6px; }
 h2 { font: 700 21px/1.3 "PT Serif", serif; margin: 40px 0 6px; }
 h3 { font: 700 15px/1.3 "Public Sans Variable", sans-serif; margin: 10px 0 2px; }
 p { max-width: 74ch; margin: 6px 0; }
 .lede { font-size: 17px; }
 .grid { display: flex; flex-wrap: wrap; gap: 24px; margin: 18px 0 8px; }
 .card { width: 560px; }
 .box { background: #fcfaf6; border: 1px solid #b9b6ac; box-sizing: content-box; }
 .box img { display: block; }
 .why { font-weight: 600; }
 .prov, .num { font-size: 13px; color: #4a4f48; }
 .num { background: #efece5; border-left: 4px solid #8a8f86; padding: 8px 12px; }
 .lad { display: flex; gap: 8px; flex-wrap: wrap; }
 .lad figure { margin: 0; }
 .lad figcaption { font-size: 12px; color: #4a4f48; max-width: 200px; }
 table { border-collapse: collapse; font-size: 13.5px; margin: 14px 0; }
 th, td { border: 1px solid #c8c5bb; padding: 6px 9px; text-align: left; vertical-align: top; }
</style></head><body><main>
<h1>Round 12 — art for the photo slots, from public-domain books</h1>
<p class="lede">Every image below is painted at <b>exactly its slot size</b> on <code>--color-paper</code>, cropped with
subject-aware gravity, and measured off the crop's own bytes. The source is insideoutlibrary.com —
illustrations cut out of public-domain books; 2,110,614 pictures from 59,407 books. Rights, quoted from the site's
about page on 2026-11-03: <i>"Every picture is checked against its library's rights statement before it is admitted
(public domain, the Public Domain Mark, or no known copyright restrictions), so there is no permission to ask, no
credit required, and commercial use is included."</i> Nothing here is a photograph of this club — see the rule at the
bottom.</p>

<h2>PS-1 — hero media column, 372×564</h2>
<div class="grid">${rows.filter((r) => r.slot === 'PS-1').map(card).join('')}</div>

<h2>PS-3 — join-section media column, 526×316</h2>
<div class="grid">${rows.filter((r) => r.slot === 'PS-3').map(card).join('')}</div>

<h2>PS-4 — event-card thumb, 319×110</h2>
<div class="grid">${rows.filter((r) => r.slot === 'PS-4').map(card).join('')}</div>

<h2>PS-2 — the venue strip cannot be filled from this source</h2>
<p>The strip is <b>1180×320</b> and the archive serves at most a <b>1024px</b> render (${Object.values(SLOT).map((s) => `${s.w}×${s.h}`).join(', ')} are the other boxes).
The widest plate measured here keeps ${Math.round(Math.max(...rows.map((r) => r.keep)) * 100)}% of itself in that
aspect and still needs a 15% upscale. <b>PS-2 stays a real-photograph slot</b> (shot list 2 in
<code>.notes/asset-sources.md</code>: shoot wide and level).</p>

<h2>The Byrne colour question, measured</h2>
<p>Byrne's 1847 Euclid is the strongest <b>content</b> answer to the site's measured colour scarcity (the page paints
<b>${NAMED_TODAY}%</b> of itself at chroma ≥ .08 — colour a reader would call colour). But its paint is loud, and two of
its hues sit on top of palette roles: its red-orange lands <b>0–3° from <code>path-discord</code> (35°)</b> and its
yellow <b>1–8° from <code>gold-on-ink</code> (84°)</b>, both at chroma 0.13–0.18, which is inside the zone that
<code>design/brand-distance.mjs</code> puts next to Amazon/UPS/UMN gold. Below: the same crops at reduced saturation,
with the numbers that move.</p>
<table>
 <tr><th>plate (in the PS-3 box)</th>${SATS.map((x) => `<th>${x}% of its own<br>saturation</th>`).join('')}</tr>
 ${ladder.map((c) => `<tr><td>${c.id.replace('ia-firstsixbooksofe00byrn-', 'Byrne ')}</td>${c.sat.map((s) => `<td>named colour <b>${s.c08}%</b><br>${s.fam}<br>brand ${s.brand}</td>`).join('')}</tr>`).join('')}
</table>
<p class="num">The knob is not a gentle fade. Between <b>50%</b> and <b>25%</b> saturation the plate's colour drops off
the census bar entirely (9.0% → 0% and 3.7% → 0%), so anything above half strength still counts as colour. And
desaturating moves the <i>collision</i> rather than removing it: 176-281's yellow sits at mean hue 81° at full
strength and at <b>35°</b> — exactly <code>path-discord</code> — at 50%, because lowering chroma moves the mean of a
mixed stroke further than it moves the hue. Full-strength Byrne 176-281 measures <b>0.047 from Walmart yellow</b>,
which is inside the 0.05 "reads as the same colour" threshold <code>design/brand-distance.mjs</code> uses.</p>

<h2>What the measurements say</h2>
<table>
 <tr><th>candidate</th><th>box</th><th>named colour in the crop</th><th>added to the page</th><th>nearest palette role</th></tr>
 ${rows.map((r) => `<tr><td>${r.id.replace('ia-', '').slice(0, 34)}</td><td>${r.slot}</td><td>${r.crop.c08}%</td><td>${r.addNamed}%</td><td>${r.crop.fams[0] ? r.crop.fams[0].role : 'none — colourless'}</td></tr>`).join('')}
</table>

<h2>The rule this specimen does not get to break</h2>
<p>These are <b>illustrations from books</b>, not images of the club. They may stand in the PS slots as artwork, and no
copy may make them look like records of this club — D94 forbids stock <i>people</i> photography for exactly that
reason, and the Meetup logo (design/records/0013-a-third-partys-mark-is-not-your-brand-colour.md) is what happens when borrowed colour becomes the most saturated
thing on the page. The club's own shot list — the board after a meeting, venues, hands and materials — still stands,
and PS-1/PS-2 are its slots. Strip EXIF/GPS on commit.</p>

<div class="num" data-measured="1">
 <b>Measured back:</b> the boxes in this page are the numbers in this page. <code>node design/round12.mjs</code>
 re-reads every box in Firefox and fails if a box is more than 1px off the slot it claims (the round-10 rule:
 a diagram that misrepresents the page is a diagram that lies).
</div>
</main></body></html>`;

writeFileSync('design/grill/round-12-art.html', html);
console.log(`wrote design/grill/round-12-art.html (${(html.length / 1024).toFixed(0)} KB) — ${rows.length} crops, ${ladder.length} ladders`);
for (const c of ladder) for (const s of c.sat) console.log(`ladder ${c.id.slice(24).padEnd(12)} sat ${String(s.sat).padStart(3)}% named ${String(s.c08).padStart(5)}% ink ${String(s.ink).padStart(5)}% L ${s.meanL} | ${s.fam} | brand ${s.brand}`);
for (const r of rows) {
  console.log(`${r.slot} ${r.id.slice(0, 44).padEnd(44)} keep ${Math.round(r.keep * 100)}% crop named ${String(r.crop.c08).padStart(5)}% ink ${String(r.crop.ink).padStart(5)}% add ${r.addNamed}% ${r.crop.fams[0] ? `| H${r.crop.fams[0].meanH} C${r.crop.fams[0].meanC} near ${r.crop.fams[0].role}${r.crop.fams[0].commerce ? ' COMMERCE' : ''}` : ''}`);
}
