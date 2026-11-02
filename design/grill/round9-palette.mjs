// round9-palette.mjs — the colour candidates for the colour round, and the arithmetic each one implies.
//
//   node design/grill/round9-palette.mjs            # print the scan (hue window, accents, marks)
//   imported by design/grill/round9-build.mjs (the specimen), design/grill/round9-measure.js's expectations
//   and design/round9.mjs (the driver) — one source of truth, exactly like round8-ramps.mjs.
//
// WHY IT STARTS WITH A SCAN AND NOT WITH SWATCHES. The operator asked for more colour. The naive move is to
// propose hues; the honest move is to ask how much ROOM this palette has left, because the system already
// reserves six of them: `ink`/`rule`/`tint`/`band-text` share hue 152, `gold`/`gold-on-ink` own 62/84, and the
// four join paths hold 35, 105, 205 and 315 (DESIGN.md "Colour — named roles only"). Round 3b ratified that a
// new hue sits >= 40 degrees from the primary and from every reserved path hue. Put those bands on the wheel and
// the answer is arithmetic: the reserved set leaves ONE window, and it is a cool one. That reframes the operator's
// question from "which colours" to "is a cool accent worth re-arranging the path hues for" — which is a question
// only they can rule on, and it is what the round now asks with numbers under it.
//
// Every number here is the predictor (D101: a hand calc narrows the space, the RENDERER decides). Anything that
// reaches a ruling is re-measured twice more: by the browser in the specimen (round9-measure.js measures the
// panel's computed colours AND its painted pixels) and, after apply, on the live page by `npm run check:color`.
// The predictor's own agreement with the cited numbers is guarded by `node design/grill/okcolor.mjs --selftest`.
import { readFileSync } from 'node:fs';
import {
  parseOklch, asTriple, contrastTriple, tripleToBytes, dist, hueGap, polar, nearestBrand,
  hueWindows, BARS, SAME_COLOUR_BAR, oklchToRgb,
} from './okcolor.mjs';
import { MARK_COLOURS } from '../../src/lib/brand-mark.mjs';

// ---- the shipped roles, READ out of src/styles/global.css (never re-typed — same rule as round8-ramps) ----
const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');
const token = (name) => {
  const m = new RegExp(`--color-${name}:\\s*([^;/]+);`).exec(css);
  if (!m) throw new Error(`no --color-${name} in @theme — this file cannot describe the shipped palette`);
  return parseOklch(m[1].trim());
};
export const ROLES = {
  paper: token('paper'), panel: token('panel'), tint: token('tint'),
  ink: token('ink'), inkHover: token('ink-hover'), ink2: token('ink-2'), ink3: token('ink-3'),
  rule: token('rule'), gold: token('gold'), goldOnInk: token('gold-on-ink'), bandText: token('band-text'),
  pathCalendar: token('path-calendar'), pathMeetup: token('path-meetup'),
  pathDiscord: token('path-discord'), pathMobilizon: token('path-mobilizon'),
  pathCalendarInk: token('path-calendar-on-ink'), pathMeetupInk: token('path-meetup-on-ink'),
  pathDiscordInk: token('path-discord-on-ink'), pathMobilizonInk: token('path-mobilizon-on-ink'),
};
export const GROUNDS = { paper: ROLES.paper, panel: ROLES.panel, tint: ROLES.tint, ink: ROLES.ink };

// Every shipped role, by its CSS name, read off @theme. ROLES above is the hand-picked subset the model reasons
// about; THEME is the whole surface — the tints and the on-ink twins included — so a specimen that plants
// `path-meetup-tint` and an assertion that checks it cannot name different things. Names are kept as authored
// (`path-meetup-on-ink`), NOT camelCased, because camelCasing is where a lookup silently misses and a drift
// check reports "all tokens round-trip" for tokens it never actually looked at.
export const THEME = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(oklch\([^)]*\)|#[0-9a-fA-F]{3,8})\s*;/g)]
    // `asTriple` rather than `parseOklch`: @theme is mostly oklch but does carry a hex or two, and a parser that
    // throws on one of them takes the whole round down.
    .map((m) => [m[1], asTriple(m[2])]),
);
export const themeSpec = (name) => {
  const raw = String(name ?? '').trim().replace(/^--/, '');
  // candidate namespaces (--c-*, --w-*) are checked first: `--w-gold` is R-4's re-arranged warm gold and must
  // never resolve to the shipped `gold`, which would report a phantom drift.
  if (/^(c|w)-/.test(raw)) return CANDIDATES[raw.replace(/^(c|w)-/, '')] ?? WARM[raw] ?? null;
  // the drift check walks `:root` custom properties, so it arrives with the `color-` prefix on;
  // `--color-`/`--c-`/`--w-` are the only namespaces in play, and dropping the shipped one here is what lets the
  // same lookup serve a pair attribute (`gold`) and a property name (`--color-gold`).
  return THEME[raw.replace(/^color-/, '')] ?? CANDIDATES[raw] ?? WARM[raw] ?? null;
};

// The reserved hues, grouped the way the system actually uses them: a role family (ink, gold) keeps a
// per-ground variant, and those variants are NOT 40 degrees apart from each other (gold 62 vs gold-on-ink
// 84 is 22) because they never appear on the same ground. A NEW hue has to clear 40 from every member of
// every OTHER family, which is what `hueWindows` does with the flat list below.
export const RESERVED = [
  { name: 'ink family (ink/rule/tint/band-text)', t: ROLES.ink },
  { name: 'gold', t: ROLES.gold },
  { name: 'gold-on-ink', t: ROLES.goldOnInk },
  { name: 'path-calendar', t: ROLES.pathCalendar },
  { name: 'path-mobilizon', t: ROLES.pathMobilizon },
  { name: 'path-discord', t: ROLES.pathDiscord },
  { name: 'path-meetup', t: ROLES.pathMeetup },
];
export const windowScan = () => hueWindows(Object.fromEntries(RESERVED.map((r) => [r.name, r.t])), 40);

// How close the SHIPPED roles are to each other, on the same bar the rule states. Printed because the scan
// only makes sense if the shipped palette's own gaps are visible: gold (62) and path-discord (35) are 27
// apart, under the 40 the rule asks of a new hue. Whether that is an exception or an oversight is a question
// for the round, not a finding I get to settle by arithmetic.
export function shippedGaps() {
  const rows = [];
  for (let i = 0; i < RESERVED.length; i++) {
    for (let k = i + 1; k < RESERVED.length; k++) {
      const gap = hueGap(RESERVED[i].t, RESERVED[k].t);
      if (gap < 40) rows.push({ a: RESERVED[i].name, b: RESERVED[k].name, gap, oklab: dist(RESERVED[i].t, RESERVED[k].t) });
    }
  }
  return rows.sort((x, y) => x.gap - y.gap);
}

// ---- the scan: for a hue, what (L, C) clears the bars, and how far is it from a commerce brand ----
// For each chroma, `accentRows` returns:
//   text   = the LIGHTEST colour at that hue/chroma clearing 4.5 on paper (the one that still reads as a
//            hue rather than a grey, and the one a chip label or a link would use)
//   both   = the colour clearing 3.0 as a GRAPHIC on paper AND on ink (the bar a mark stroke must clear on
//            both grounds — the hero paints the mark on paper, the footer band and the card on ink)
//   onInk  = the DARKEST variant clearing 4.5 on ink (the `-on-ink` pair every role needs, D116)
// and the nearest commerce brand at delta-OKLab (< 0.05 reads as the same colour, per brand-distance.mjs).
export function accentRows(hue, chroma) {
  const scan = (ground, bar, mode) => {
    let best = null;
    for (let L = 15; L <= 97; L += 0.5) {
      const t = { L, C: chroma, H: hue };
      if (oklchRaw(t).og) continue;
      const r = contrastTriple(t, ground);
      if (r >= bar) {
        if (mode === 'lightest' && (!best || L > best.t.L)) best = { t, r };
        if (mode === 'darkest' && (!best || L < best.t.L)) best = { t, r };
      }
    }
    return best;
  };
  const text = scan(ROLES.paper, BARS.text, 'lightest');
  const both = scan(ROLES.paper, BARS.graphic, 'lightest');      // lightest that still clears 3.0 on paper
  const onInk = scan(ROLES.ink, BARS.text, 'darkest');
  const rows = { hue, chroma, text, both, onInk };
  const probe = text || both || onInk;
  rows.gamut = probe ? oklchRaw(probe.t).og : true;
  rows.brand = probe ? nearestBrand(probe.t, 3) : [];
  rows.minBrandGap = rows.brand.length ? rows.brand[0].d : null;
  rows.minHueGapToReserved = Math.min(...RESERVED.map((r) => hueGap({ L: 50, C: chroma, H: hue }, r.t)));

  // `far` is the row the round should actually recommend. `text` above is the LIGHTEST legal colour, which is
  // also the one that sits closest to the commerce blues (Walmart / Amazon / UCLA blue all sit near L 0.55,
  // C 0.17): at C 0.12 the window's legal members fall to 0.049-0.059 from a brand, inside this repo's own
  // "< 0.05 reads as the same colour" bar. So the collision is decided by LIGHTNESS and CHROMA, not by which
  // hue inside the window you pick. `far` searches every in-gamut L that clears text 4.5 on paper and keeps
  // the one farthest from every brand AND from every role already in use.
  //
  // Why the search does NOT also demand 3.0 against `ink`: it cannot be had, and the arithmetic is worth
  // printing rather than debugging. For any colour whose luminance sits between paper and ink, its two
  // contrasts multiply to the paper-ink pair: c_paper x c_ink ~= 12.02. Demanding c_paper >= 4.5 (text) and
  // c_ink >= 3.0 (a graphic on the band) demands 13.5, which is more than 12.02. That is the proof that one
  // value cannot be both body-legible text on paper and a resolvable stroke on the dark band — which is why
  // every role in this palette has an `-on-ink` twin, and why MARK_COLOURS is keyed per ground.
  let best = null;
  for (let L = 40; L <= 92; L += 0.5) {
    const t = { L, C: chroma, H: hue };
    if (oklchRaw(t).og) continue;
    const cp = contrastTriple(t, ROLES.paper);
    // an accent has to stay an ACCENT: legible (>= 4.5) but not a second body black (< 7.5). Without the
    // upper bound the distance search wins by going near-black, which is distance achieved by ceasing to be
    // a colour at all — measured, not asserted: at C 0.12 hue 266 the unconstrained winner was L 15.
    if (cp < BARS.text || cp > 7.5) continue;
    const brand = nearestBrand(t, 1)[0];
    const near = Object.entries(ROLES).map(([n, r]) => ({ n, d: dist(t, r) })).sort((x, y) => x.d - y.d)[0];
    const score = Math.min(brand.d, near.d);
    if (!best || score > best.score) best = { t, r: cp, onInkPair: contrastTriple(t, ROLES.ink), brand, roleGap: near.d, role: near.n, score };
  }
  rows.far = best;
  rows.sandwich = +contrastTriple(ROLES.paper, ROLES.ink).toFixed(2);
  return rows;
}
// out-of-gamut comes from okcolor's own conversion, flagged not clipped
const oklchRaw = (t) => oklchToRgb(t.L / 100, t.C, t.H);

// The hues the window scan leaves open, at the chromas worth comparing.
export function accentCandidates() {
  const w = windowScan();
  const hues = [];
  for (const win of w.windows) for (let d = win.from; d <= win.to; d += 10) hues.push(((d % 360) + 360) % 360);
  const chroma = [0.06, 0.09, 0.12];
  const rows = [];
  for (const h of hues) for (const c of chroma) rows.push(accentRows(h, c));
  // rank by: clears everything, then the largest minimum distance to a commerce brand
  // legal = a text role on paper, a graphic role on paper, and an `-on-ink` twin that carries text on the
  // band. The graphic bar against `ink` is met by that twin, not by the paper value (see the sandwich note).
  const clears = (r) => r.text && r.onInk && r.far && !r.gamut && contrastTriple(r.both.t, ROLES.paper) >= BARS.graphic;
  return {
    window: w,
    rows,
    legal: rows.filter(clears).sort((a, b) => (b.minBrandGap ?? 0) - (a.minBrandGap ?? 0)),
    // recommended by the `far` score: legal everywhere AND maximally distant from commerce brands and from
    // every role in use — the D88 lesson applied forwards instead of backwards
    bestFar: rows.filter((r) => clears(r) && r.far).sort((a, b) => b.far.score - a.far.score)[0],
  };
}

// ---- Q2: the palette options the operator chooses between ----
// Each option says what it ADDS to @theme (so the cost is visible before the ruling), and which surfaces it
// recolours (the builder paints exactly this list, and the census measures exactly what it painted).
export function paletteOptions() {
  const acc = accentCandidates();
  // the recommended accent is the `far` member (legal on every bar AND farthest from commerce brands and
  // from every role in use), not merely the lightest legal one
  const best = acc.bestFar;
  const pick = (hue) => acc.rows.filter((r) => r.hue === hue && r.text && r.both && r.onInk && !r.gamut)
    .sort((a, b) => (b.minBrandGap ?? 0) - (a.minBrandGap ?? 0))[0];
  return {
    scan: acc,
    best,
    pick,
    options: [
      {
        id: 'H-A', hue: null,
        title: 'No new hue — raise the AREA of the hues we already own',
        adds: '@theme: nothing. Roles already exist (gold, the four path hues, tint).',
        why: 'the drab-meter says the site paints 3.8% chromatic pixels at 1240 and 0.5% on /404 and /chat: the hues are there, they are just tiny. Area is a cheaper lever than a new hue, and it cannot collide with a brand.',
        textToken: 'gold', noticeToken: 'gold', chipFg: 'ink', chipBg: 'path-meetup-tint', bandToken: 'path-meetup-on-ink',
        mark: { sphere: 'rule', route: 'ink', accent: 'gold' }, markInk: { sphere: 'band-text', route: 'band-text', accent: 'gold-on-ink' },
        swatch: ['gold on paper', 'ink on a path tint', 'the path word on the band'],
      },
      {
        id: 'H-B', hue: best ? best.hue : 255,
        title: best ? `Add ONE accent at ${best.hue}° (the only window the 40° rule leaves open)` : 'Add ONE accent (the window scan found no legal member)',
        adds: '@theme: --color-accent + --color-accent-on-ink, and a --color-accent-tint if a fill wants one.',
        why: best
          ? `L${best.far.t.L} C${best.chroma} clears text ${best.far.r} on paper and graphic 3.0 on paper; its -on-ink twin carries ${best.onInk.r} on the band. Nearest commerce brand ${best.far.brand.d} (${best.far.brand.brand}) — under the 0.135 that gold clears (D88), so this hue is measurably less brand-clean than gold is; nearest role in use ${best.far.roleGap} (${best.far.role})`
          : 'the scan found nothing that clears text 4.5 on paper, graphic 3.0 on both grounds and text 4.5 on ink inside the legal window.',
        textToken: 'accent', noticeToken: 'accent', chipFg: 'ink', chipBg: 'accent-tint', bandToken: 'accent-on-ink',
        mark: { sphere: 'rule', route: 'ink', accent: 'accent' }, markInk: { sphere: 'band-text', route: 'band-text', accent: 'accent-on-ink' },
        swatch: ['the accent as text', 'ink on an accent tint', 'the accent on the band'],
      },
      {
        id: 'H-C', hue: 100,
        title: 'Re-arrange the reserved hues so a WARM accent is legal (the hue the complaint actually points at)',
        adds: '@theme: gold 62 -> 50, gold-on-ink 84 -> 50, path-discord 35 -> 25, path-mobilizon retired, + --color-olive / --color-olive-on-ink. 12 measured pairs re-solved, and the share card re-generated.',
        why: 'every re-arrangement short of this one leaves the same 246-274 window: the wheel is closed by which hues EXIST, not by where the path set sits. Only folding the gold twin into its family and retiring mobilizon opens a warm window (91-111). This is the option shown so the operator can SEE what they would be paying 12 pairs of re-measurement for.',
        textToken: 'w-olive', noticeToken: 'w-olive', chipFg: 'ink', chipBg: 'path-mobilizon-tint', bandToken: 'w-olive-on-ink',
        mark: { sphere: 'rule', route: 'ink', accent: 'w-gold' }, markInk: { sphere: 'band-text', route: 'band-text', accent: 'w-gold-on-ink' },
        swatch: ['the olive as text', 'ink on an olive-family tint', 'the olive on the band'],
      },
    ],
  };
}

// ---- Q1: where colour goes (a surface policy, independent of which hues exist) ----
// The builder renders each policy as the same real content, and the census counts what each one painted.
// The paint block IS the option: every value in it is a token name the builder turns into var(--color-*), so
// nothing about a policy exists in two places. `mark` is held IDENTICAL across the three policies on purpose —
// Q3 asks about the mark separately, and if the mark changed too, the census would not be attributable to the
// surface policy. Token names are re-read from @theme by the builder, so a policy cannot cite a role that is
// not shipped (it would throw at build time, not at review time).
export function surfaceOptions() {
  return [
    {
      id: 'S-A', title: 'As shipped — colour in the join paths and the mark only',
      note: 'the measured baseline: 3.8% chromatic px at 1240, 0.5% on /404 and /chat, and the most saturated pixel on the page belongs to Meetup.',
      paint: {
        heroGround: 'paper', heroKeyline: 'rule', kicker: 'ink-3', lede: 'ink-2', focus: 'ink', rules: 'rule',
        bandGround: 'ink', bandKicker: 'band-text', bandPathText: 'band-text', rail: null, chip: null, chipText: null,
        marker: null, noticeRing: 'rule', noticeWord: 'gold', mark: { sphere: 'rule', route: 'ink', accent: 'gold' },
      },
    },
    {
      id: 'S-B', title: 'Colour where it MEANS something — path hues on the three ways in, gold on the fact that is current',
      note: 'zero new roles: the reserved path hues get rails and chip fills, `gold` moves onto the current-focus line and the section markers. Colour carries meaning, so it reads as information rather than decoration. Note the shipped constraint on chip fills: a tint carries `ink` (10.96) but NOT `gold` (4.39, a FAIL recorded in global.css), so chip labels stay ink.',
      paint: {
        heroGround: 'paper', heroKeyline: 'rule', kicker: 'ink-3', lede: 'ink-2', focus: 'gold', rules: 'rule',
        bandGround: 'ink', bandKicker: 'band-text', bandPathText: 'path', rail: 'path', chip: 'path', chipText: 'ink',
        marker: 'path', noticeRing: 'gold', noticeWord: 'gold', mark: { sphere: 'rule', route: 'ink', accent: 'gold' },
      },
    },
    {
      id: 'S-C', title: 'Colour as AREA — a tinted hero field, path tints as fills, coloured rules',
      note: 'the widest fields, and the one with a measurement trap in it: every tint in @theme is oklch(95% 0.03 ...), and the census threshold this repo uses for "chromatic" is chroma 0.04. So a wash that reads as coloured can still measure as ZERO colour. Whether S-C is colour or just warmth is exactly what the census under this panel answers.',
      paint: {
        heroGround: 'tint', heroKeyline: 'rule', kicker: 'ink-3', lede: 'ink-2', focus: 'gold', rules: 'gold',
        bandGround: 'ink', bandKicker: 'band-text', bandPathText: 'path', rail: 'path', chip: 'path', chipText: 'ink',
        marker: 'path', noticeRing: 'gold', noticeWord: 'gold', mark: { sphere: 'rule', route: 'ink', accent: 'gold' },
      },
    },
  ];
}

// ---- Q3: the mark's two lines, and what a second colour there costs ----
// MARK_COLOURS is keyed by ROLE (sphere / route / accent). Giving the two routes different colours therefore
// needs a grammar change — the split is written here as `routeSplit` so the cost is stated before any ruling:
// check:render measures per shape (grammar-agnostic), but ratify-check's mark-class coupling, mark-geometry.mjs's
// role checks and the card's per-role map all address roles, so `route` -> two roles is a change in four places.
export const MARK_OPTIONS = [
  {
    id: 'K-A', title: 'As shipped — both lines ink, the sphere rule, the marks gold',
    colours: { sphere: 'rule', route: 'ink', accent: 'gold' },
    onInk: { sphere: 'band-text', route: 'band-text', accent: 'gold-on-ink' },
  },
  {
    id: 'K-B', title: 'The two lines carry different roles: one ink, one gold (no new hue)',
    colours: { sphere: 'rule', route: ['ink', 'gold'], accent: 'gold' },
    onInk: { sphere: 'band-text', route: ['band-text', 'gold-on-ink'], accent: 'gold-on-ink' },
    needs: 'MARK_COLOURS grammar: `route` -> a per-shape pair (a new role, or an array). Both colours already clear 3.0 on both grounds.',
  },
  {
    id: 'K-C', hue: true, title: 'One line ink, one line the new accent (the H-B hue)',
    colours: { sphere: 'rule', route: ['ink', 'accent'], accent: 'gold' },
    onInk: { sphere: 'band-text', route: ['band-text', 'accent-on-ink'], accent: 'gold-on-ink' },
    needs: 'a new role AND the route grammar split — the accent must clear 3.0 as a stroke on paper and on ink, not just 4.5 as text.',
  },
  {
    id: 'K-D', title: 'Both lines gold, the sphere rule (a warm mark, zero new hue)',
    colours: { sphere: 'rule', route: 'gold', accent: 'ink' },
    onInk: { sphere: 'band-text', route: 'gold-on-ink', accent: 'band-text' },
    needs: 'nothing. It trades the 12.02 line for a 4.82 one, so the covered-pixel count is the question — measured, not asserted.',
  },
];

// The token table for each mark option, per ground, with the measured pair for every stroke.
// `extra` maps a candidate token NAME (e.g. 'accent', 'accent-on-ink') to a triple, so a mark option can
// name a role that does not exist yet and still get its pair measured before anyone writes it into @theme.
export function markPairTable(extra = {}) {
  const byName = (name) => {
    if (extra[name]) return extra[name];
    try { return parseOklch(new RegExp(`--color-${name}:\\s*([^;/]+);`).exec(css)[1].trim()); }
    catch { throw new Error(`mark option names --color-${name}, which is neither in @theme nor supplied as a candidate`); }
  };
  const tokensFor = (ground, map) => {
    const groundT = ground === 'paper' ? ROLES.paper : ROLES.ink;
    const out = {};
    for (const r of ['sphere', 'route', 'accent']) {
      const names = Array.isArray(map[r]) ? map[r] : [map[r]];
      out[r] = names.map((name) => ({ name, t: byName(name), pair: contrastTriple(byName(name), groundT) }));
    }
    return out;
  };
  return MARK_OPTIONS.map((o) => ({
    id: o.id, title: o.title, needs: o.needs ?? null,
    paper: tokensFor('paper', o.colours), ink: tokensFor('ink', o.onInk),
  }));
}
// The shipped MARK_COLOURS map, re-read from src/lib/brand-mark.mjs so a candidate can be compared against
// what actually ships rather than against my memory of it.
export const shippedMarkColours = MARK_COLOURS;

// The candidate tokens a round needs that do not exist in @theme yet, keyed by the name the mark option and
// the specimen use. Built from the best-scoring legal member of the open window.
export function accentExtras(pick = accentCandidates().bestFar) {
  if (!pick) return {};
  const t = pick.far?.t ?? pick.text?.t;
  return { accent: t, 'accent-on-ink': pick.onInk.t, 'accent-graphic': pick.both.t, 'accent-tint': { L: 95, C: 0.03, H: pick.hue } };
}

// The candidate set the specimen paints, resolved once. The build writes these as `--c-*` and the driver resolves
// `--c-*` back through `themeSpec`, so a specimen colour and the assertion on it cannot name different values.
export const CANDIDATES = accentExtras(accentCandidates().bestFar);

// Is a two-colour mark still TWO things? A pro would not settle "put a different colour on each line" by
// taste, because a large share of viewers cannot separate some hue pairs. There is no vision model in this
// repo to assert that with, so the test used here is the one this repo already owns, and it is a floor:
//   1. luminance — the separation that survives EVERY colour-vision deficiency, including none: the two
//      strokes' contrast against the ground must themselves differ (12.02 vs 4.82 is obvious in greyscale;
//      4.82 vs 4.59 is invisible in it);
//   2. `brand-distance.mjs`'s own reading of delta-OKLab — "< 0.05 reads as the same colour" — as the bar
//      for two things that must not read as one colour.
// Both are stated as proxies, not as a clinical claim.
export function routeSeparation(pairs) {
  return pairs.map((p) => {
    const rows = ['paper', 'ink'].map((g) => {
      const a = p[g].route[0], b = p[g].route[1];
      if (!a || !b) return { ground: g, split: false, pairA: a?.pair ?? null, pairB: null, oklab: null, same: false };
      return {
        ground: g, split: true, oklab: dist(a.t, b.t), same: dist(a.t, b.t) < SAME_COLOUR_BAR,
        pairA: a.pair, pairB: b.pair, lumRatioGap: +(Math.max(a.pair, b.pair) / Math.min(a.pair, b.pair)).toFixed(2),
      };
    });
    return { id: p.id, rows };
  });
}

// The warm accent the operator's complaint points at, and what it would take to make it legal (Q2).
// Exported because the specimen has to PAINT these to show the option — round 8's R-3 lesson: an option the
// operator cannot see is an option the operator cannot choose. The shifts are constrained by what each role is
// used FOR, not by taste: `gold` has to clear 4.5 on paper AND 3.0 as a keyline, and both golds must stay
// >= 0.135 from every other colour (D88), which is why the target is 50 deg for the family and 100 deg for a
// new olive.
export const WARM = {
  'w-gold': { L: 55, C: 0.12, H: 50 }, 'w-gold-on-ink': { L: 76, C: 0.06, H: 50 },
  'w-olive': { L: 52, C: 0.1, H: 100 }, 'w-olive-on-ink': { L: 72, C: 0.1, H: 100 },
};

// ---- could a DIFFERENT hue be made legal, and what would that cost? ----
// A re-arrangement is only worth its cost if the window it opens holds a BETTER accent than the window that is
// already open, so each case is scored on the winner of its own window: how many degrees of separation that
// accent gets from its closest reserved neighbour, and how far the nearest commerce brand sits. The shipped
// window's winner is the baseline every case has to beat.
function windowWinner(reserved) {
  const w = hueWindows(reserved, 40);
  const perWindow = w.windows.map((win) => {
    let best = null;
    for (let deg = win.from; deg <= win.to; deg += 2) {
      for (const chroma of [0.06, 0.09, 0.12]) {
        const r = accentRows(deg, chroma);
        if (!r.far || r.gamut || !r.text || !r.onInk) continue;
        if (!best || r.far.score > best.score) best = { hue: deg, chroma, score: r.far.score, L: r.far.t.L, onInkL: r.onInk.t.L, roleGap: r.far.roleGap, role: r.far.role, brandGap: r.far.brand.d, brand: r.far.brand.brand };
      }
    }
    return { from: win.from, to: win.to, width: win.width, best };
  });
  // caveat printed rather than hidden: `roleGap` comes from accentRows, which measures against the SHIPPED
  // roles. For a re-arranged case the moved roles are elsewhere, so the number is a floor on the distance, not
  // the distance — good enough to compare options, not good enough to ship a value from. The values the round
  // ships are re-solved and re-measured for the chosen set.
  return { window: w, perWindow, best: perWindow.map((x) => x.best).filter(Boolean).sort((a, b) => b.score - a.score)[0] ?? null };
}

// Rotating the four path hues does not help: the free arc is set by which hues EXIST, not by where the path
// set sits. What buys room is retiring a reserved hue or moving one. Each case states the arithmetic plus the
// re-measure cost in pairs, because "move gold" is not free — gold is a text role, a keyline role, the focus
// ring on paper and a card colour, and every path hue carries a paper pair, an on-ink pair and a tint.
export function rearrangements() {
  const costOf = (c) => {
    const notes = [];
    for (const m of c.move ?? []) notes.push(`${m.name} ${m.from} -> ${m.to}: paper pair, on-ink pair and tint all re-solve`);
    for (const r of c.remove ?? []) notes.push(`${r} retired: its 3 tokens leave @theme (a join path the site does not use yet)`);
    return { pairs: notes.length * 3, notes };
  };
  const cases = [
    { id: 'R-0', title: 'As shipped', move: [], remove: [] },
    { id: 'R-1', title: 'Retire path-mobilizon (the feed is undecided: Mobilizon vs a plain .ics — .notes/roadmap-events.md)', move: [], remove: ['path-mobilizon'] },
    { id: 'R-2', title: 'Warm the set: gold 62 -> 50, path-discord 35 -> 25', move: [{ name: 'gold', from: 62, to: 50 }, { name: 'path-discord', from: 35, to: 25 }], remove: [] },
    { id: 'R-3', title: 'Both: retire path-mobilizon, gold 62 -> 50, path-discord 35 -> 25', move: [{ name: 'gold', from: 62, to: 50 }, { name: 'path-discord', from: 35, to: 25 }], remove: ['path-mobilizon'] },
    { id: 'R-4', title: 'Fold the gold twin into its family (gold-on-ink 84 -> 50) too, retire mobilizon, discord -> 25', move: [{ name: 'gold', from: 62, to: 50 }, { name: 'gold-on-ink', from: 84, to: 50 }, { name: 'path-discord', from: 35, to: 25 }], remove: ['path-mobilizon'] },
  ];
  return cases.map((c) => {
    const reserved = {};
    for (const r of RESERVED) {
      if ((c.remove ?? []).includes(r.name)) continue;
      const mv = (c.move ?? []).find((m) => m.name === r.name);
      reserved[r.name] = mv ? { L: r.t.L, C: r.t.C, H: mv.to } : r.t;
    }
    const w = hueWindows(reserved, 40);
    const cost = costOf(c);
    const warm = WARM['w-olive'];
    const win = windowWinner(reserved);
    return {
      ...c, window: w, biggest: w.windows[0] ?? null, freeDegrees: w.freeDegrees, cost,
      warmLegal: Object.values(reserved).every((t) => hueGap(warm, t) >= 40),
      winner: win.best ?? null, perWindow: win.perWindow,
    };
  });
}

// ---- print it ----
if (process.argv[1] && process.argv[1].endsWith('round9-palette.mjs')) {
  const w = windowScan();
  console.log('=== reserved hues and the room left on the wheel (round 3b: a new hue keeps >= 40 degrees) ===');
  for (const b of w.banned) console.log(`  banned ${String(b.from).padStart(3)}-${String(b.to).padEnd(3)} (from ${b.name} at ${Math.round(b.hue)} degrees)`);
  console.log(`  free: ${w.freeDegrees} of 360 degrees -> windows ${w.windows.map((x) => `${x.from}-${x.to} (${x.width} wide)`).join(', ') || 'none'}`);
  console.log('\n=== the shipped palette measured against its own 40-degree rule ===');
  for (const g of shippedGaps()) console.log(`  ${g.a} <-> ${g.b}: ${g.gap} degrees (delta-OKLab ${g.oklab})${g.gap < 40 ? '  <<< under the bar a NEW hue must clear' : ''}`);
  console.log('\n=== could a warm/olive accent be made legal? (re-arrangements, with their re-measure cost) ===');
  for (const r of rearrangements()) {
    console.log(`  ${r.id} ${r.title}`);
    console.log(`     free ${String(r.freeDegrees).padStart(3)} degrees; windows ${r.window.windows.map((x) => `${x.from}-${x.to}(${x.width})`).join(' ') || 'none'}; hue 100 (olive) ${r.warmLegal ? 'LEGAL' : 'still banned'}; cost ${r.cost.pairs} pairs`);
    console.log(`     best accent its own window holds: hue ${r.winner?.hue ?? '-'} C${r.winner?.chroma ?? '-'} (L${r.winner?.L ?? '-'} on paper / L${r.winner?.onInkL ?? '-'} on ink), ${r.winner?.roleGap ?? '-'} from the nearest shipped role, nearest brand ${r.winner?.brandGap ?? '-'} (${r.winner?.brand ?? '-'})`);
    for (const pw of r.perWindow) console.log(`       window ${pw.from}-${pw.to} (${pw.width}): ${pw.best ? `hue ${pw.best.hue} C${pw.best.chroma} score ${pw.best.score} (brand ${pw.best.brandGap}, role ${pw.best.roleGap})` : 'no member clears every bar'}`);
    for (const n of r.cost.notes) console.log(`       - ${n}`);
  }

  const acc = accentCandidates();
  const extras = accentExtras(acc.bestFar);
  console.log('\n=== accents inside the open window (predictor; the renderer re-measures every pair) ===');
  console.log('  hue   C     text-on-paper L    pair   | graphic-both L   paper/ink | on-ink L   pair   | gamut  min brand delta  nearest');
  for (const r of acc.rows) {
    const f = (x) => x ? `L${String(x.t.L).padStart(4)} ${String(x.r).padStart(5)}` : '   --   ---- ';
    console.log(`  ${String(r.hue).padStart(3)}  ${r.chroma.toFixed(2)}  ${f(r.text)}  | ${f(r.both)}  ${r.both ? String(contrastTriple(r.both.t, ROLES.ink)).padStart(6) : '  --  '} | ${f(r.onInk)}  | ${r.gamut ? 'OOG  ' : 'ok   '} ${String(r.minBrandGap).padStart(5)}  ${r.brand[0]?.brand ?? ''}`);
  }
  console.log('\n  the same members, choosing LIGHTNESS for distance (`far`: clears text 4.5 on paper, then maximizes min(brand, role) delta-OKLab):');
  for (const r of acc.rows) {
    if (!r.far) continue;
    console.log(`  ${String(r.hue).padStart(3)}  ${r.chroma.toFixed(2)}  L${String(r.far.t.L).padStart(4)}  text ${String(r.far.r).padStart(5)} on paper  vs ink ${String(r.far.onInkPair).padStart(5)}  nearest brand ${String(r.far.brand.d).padStart(5)} ${r.far.brand.brand.padEnd(26)} nearest role ${String(r.far.roleGap).padStart(5)} ${r.far.role}`);
  }
  console.log(`\n  why a paper value and a band value cannot be one token: for any colour between the two grounds, c_paper x c_ink ~= the paper-ink pair = ${acc.rows[0].sandwich}. Text needs 4.5 on paper and a graphic needs 3.0 on ink = 13.5 demanded > ${acc.rows[0].sandwich}: impossible. Hence the -on-ink twins and the per-ground MARK_COLOURS.`);
  console.log(`\n  legal (clears text 4.5 on paper + graphic 3.0 on BOTH grounds + text 4.5 on ink, in gamut): ${acc.legal.length}`);
  for (const r of acc.legal.slice(0, 8)) console.log(`    ${r.hue} C${r.chroma.toFixed(2)}  text ${r.text.r} @L${r.text.t.L}  graphic ${r.both.r}/${contrastTriple(r.both.t, ROLES.ink)} @L${r.both.t.L}  on-ink ${r.onInk.r}@L${r.onInk.t.L}  brand ${r.minBrandGap} ${r.brand[0].brand}`);
  console.log('\n=== the mark: stroke pairs per option, per ground ===');
  for (const p of markPairTable(extras)) {
    const line = (g) => Object.entries(p[g]).map(([r, v]) => `${r} ${v.map((x) => `${x.name} ${x.pair}`).join('/')}`).join('  ');
    console.log(`  ${p.id} paper: ${line('paper')}`);
    console.log(`      ink  : ${line('ink')}`);
    if (p.needs) console.log(`      needs: ${p.needs}`);
  }
  console.log('\n=== are the two lines still two things? (luminance + this repo\'s own 0.05 same-colour bar) ===');
  for (const s of routeSeparation(markPairTable(extras))) {
    for (const r of s.rows) console.log(`  ${s.id} on ${r.ground.padEnd(5)} ${r.split ? `delta-OKLab ${String(r.oklab).padStart(6)} ${r.same ? '<<< reads as ONE colour' : 'two colours  '}  pairs ${r.pairA} vs ${r.pairB}  luminance ${r.lumRatioGap}x apart` : `one colour on both lines (pairs ${r.pairA})`}`);
  }
}
