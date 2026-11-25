// paint-logo.mjs — the ONE machinery for painting a colouring onto a COPY of a built page (grill rounds 21+).
//
// WHY THIS FILE EXISTS. A colour round cannot price a colouring by token arithmetic alone: a 1.4-unit stroke is
// 1.68 device px at 320, so most of its pixels are half-covered blends and a token that clears 3.0 on paper can
// still fail to land ink where the table draws it. So every round mutates a copy of `dist/client` and hands the
// result to the same probes `check:logo` runs (logo-geometry.mjs, logo-pixels.mjs). Round 21 grew
// that machinery inline; round 22 (faces) needs the same mutation with a LIST of fills instead of one, and a third
// copy of it is how a round ends up measuring a logo that no longer exists. One home, both rounds import it.
//
// WHAT THE MUTATION DOES, and the two traps it is written around:
//   1. The colour CLASSES are removed and an inline `style="stroke:var(--color-X)"` is added. Inline needs no
//      Tailwind generation (the utility for an unused token is not in the built sheet) and the var() resolves
//      through the shipped @theme, so the painted bytes are the token's bytes, not a second colour invented for
//      the specimen. A class counts as a colour only if its suffix is a token this palette DECLARES: `fill-none`
//      and `stroke-none` are not colours, and dropping `fill-none` is not cosmetic — SVG's default fill is black,
//      so the ring, both equator arcs and both meridians came back as black-filled blobs and round 21's control
//      row failed every painted check (@caught 2026-11-24 by that first run: the control failing is the proof the
//      MUTATION was broken, not the colouring).
//   2. A fill is painted FIRST (inserted straight after `<svg>`), so it sits under every line and the lines stay
//      legible over it — which is also why a face is a GROUND for the lines above it, priced at the graphic bar.
//      Paint order is why `labelsFor` puts 'face' at the head of a 9-shape report: labelling it with the 8-slot
//      table instead would print the fill's contrast under the name `ring` and shift every role onto its
//      neighbour's numbers.
import { LOGO_SLOTS } from '../../src/lib/logo.mjs';

// A token name from src/styles/global.css, or a named failure. A round that invented a colour would be pricing a
// colouring the site cannot ship.
export const tokFor = (TOKENS) => (name) => {
  const t = TOKENS[name];
  if (!t) throw new Error(`paint-logo: --color-${name} is not declared in src/styles/global.css. Options: ${Object.keys(TOKENS).join(', ')}`);
  return t;
};

const COLOUR_CLASS = /^(stroke|fill)-/;
export const isColourClass = (tokenSet) => (k) => COLOUR_CLASS.test(k) && tokenSet.has(k.replace(COLOUR_CLASS, ''));

// The eight drawn shapes, in paint order, read off the table (LOGO_SLOTS), with the guard that the <svg> in the
// built page still has exactly that many shape tags.
function shapeTags(block) {
  const tags = [...block.matchAll(/<(circle|path)\b[^>]*>/g)];
  if (tags.length !== LOGO_SLOTS.length)
    throw new Error(`paint-logo: the logo reports ${tags.length} shape tags, the table declares ${LOGO_SLOTS.length} (LOGO_SHAPE_COUNT = ${LOGO_SLOTS.length}) — the specimen would zip each painted shape with the wrong colour declaration`);
  return tags;
}

// fills: [{ d, token }] — painted first, in the order given. `token` is a DECLARED token name, or a literal
// `oklch(...)` spec for a colour a round is PRICING but has not adopted: a candidate face colour is not in the
// stylesheet yet, so a var() for it would resolve to nothing and the specimen would paint the page ground.
const paintValue = (TOKENS) => (v) => (v.startsWith('oklch(') ? v : `var(--color-${tokFor(TOKENS)(v).name})`);
export function recolourPage(html, map, fills, TOKENS) {
  const tok = tokFor(TOKENS);
  const keep = isColourClass(new Set(Object.keys(TOKENS)));
  const open = html.indexOf('<svg data-logo="hero"');
  if (open < 0) throw new Error('paint-logo: the built page carries no svg[data-logo="hero"] — the specimen cannot be planted');
  const close = html.indexOf('</svg>', open);
  const block = html.slice(open, close);
  const tags = shapeTags(block);
  let out = block;
  tags.forEach((m, i) => {
    const t = tok(map[LOGO_SLOTS[i]]);
    let tag = m[0].replace(/\sclass="([^"]*)"/, (_a, c) => ` class="${c.split(/\s+/).filter((k) => !keep(k)).join(' ')}"`);
    tag = tag.replace(/>$/, ` style="stroke:var(--color-${t.name})">`);
    out = out.replace(m[0], tag);
  });
  // the meeting point is a FILLED disc: it takes `fill`, not `stroke`
  out = out.replace(/(<circle[^>]*cy="23\.94"[^>]*?)style="stroke:var\(--color-[a-z0-9-]+\)"(>)/,
    (_a, pre, post) => `${pre}style="fill:var(--color-${tok(map.dot).name})" stroke="none"${post}`);
  const val = paintValue(TOKENS);
  for (const f of fills ?? [])
    out = out.replace(/(<svg data-logo="hero"[^>]*>)/, `$1\n<path d="${f.d}" style="fill:${val(f.token)};stroke:none"/>`);
  return html.slice(0, open) + out + html.slice(close);
}

// The share card's logo is drawn with inline stroke="var(--color-X)" (scripts/make-social-share.mjs), so the
// recolour is a per-tag swap of that var in the same paint order.
//
// The copy also gets `body { background: var(--color-ink) }`, and that is a mutation worth naming: the shipped
// card paints its ground with a SIBLING div (.ground, 1200x630, var(--color-ink)) and leaves <body> transparent —
// deliberately, because firefox's headless shot of this document comes out 4-channel with body alpha 0.
// design/grill/render-measure.js discovers a logo's ground by walking its ANCESTORS, so on the untouched file it
// finds nothing and reports strokeContrast null for all eight shapes, which leaves logo-geometry unable to split
// the figure into roles. Declaring the same token on <body> changes no painted pixel (the div covers the frame
// exactly) and makes the per-shape contrast computable.
export function recolourCard(html, map, fills, TOKENS) {
  const tok = tokFor(TOKENS);
  let out = html.replace(/(<style[^>]*>)/, `$1\nbody{background:var(--color-ink)}`);
  if (out === html) out = out.replace('</head>', '<style>body{background:var(--color-ink)}</style></head>');
  const open = out.indexOf('<svg');
  const start = html.indexOf('viewBox', open);
  const close = out.indexOf('</svg>', start);
  const block = out.slice(open, close);
  const tags = shapeTags(block);
  let body = block;
  tags.forEach((m, i) => {
    const t = tok(map[LOGO_SLOTS[i]]);
    let tag = m[0].replace(/stroke="var\(--color-[a-z0-9-]+\)"/, `stroke="var(--color-${t.name})"`);
    tag = tag.replace(/fill="var\(--color-[a-z0-9-]+\)"/, `fill="var(--color-${t.name})"`);
    body = body.replace(m[0], tag);
  });
  const val = paintValue(TOKENS);
  for (const f of fills ?? [])
    body = body.replace(/(<svg[^>]*>)/, `$1\n    <path d="${f.d}" fill="${val(f.token)}" stroke="none"/>`);
  return out.slice(0, open) + body + out.slice(close);
}

// A fill is painted FIRST, so a 9-shape report is ['face', ring, rear, ...]. With two fills it is
// ['face','face2', ring, ...] in paint order.
export const labelsFor = (nFills, n) => (nFills && n === LOGO_SLOTS.length + nFills
  ? Array.from({ length: nFills }, (_a, i) => (nFills === 1 ? 'face' : `face${i + 1}`)).concat(LOGO_SLOTS)
  : LOGO_SLOTS);

// The report writes each shape's computed paint as an oklch() triple with L in 0..1 — "oklch(0.96 0.012 88)" —
// the same form logo-geometry's paintBytes() reads; its HUE is the third number. (Round 21's first run ran an
// `rgb(...)` regex over it, got [0,0,0] back, and printed "H 0" for every shape.) This is the colour the browser
// RESOLVED for the token; logo-geometry's own line reports the median of the PIXELS, which is the painted fact.
export function hueOfPaint(css) { const n = String(css ?? '').match(/-?\d+(\.\d+)?/g); return n && n.length >= 3 ? Number(n[2]) : null; }
