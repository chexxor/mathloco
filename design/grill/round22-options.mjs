// round22-options.mjs — the ONLY place the Byrne FACE colourings exist (grill round 22, 2026-11-24).
//
// THE ASK, VERBATIM. The second half of the operator's seventh ruling on this mark (2026-11-24, recorded D483):
//   "(3. C), but also show me options for coloring faces of the shape also in the Byrne style."
// and, when asked how general to make them: "General options and present them to me to select from."
// Row C shipped. This round is the second half of that sentence.
//
// WHAT BYRNE ACTUALLY DOES WITH A REGION (grounded, not remembered — Byrne's own preface and title page, as
// reproduced at c82.net/euclid, fetched 2026-11-24). The book colours *diagrams*, not only lines: the prose speaks
// of "the squares of the blue and red lines", so an area is named by its colour exactly as a line is, and the
// colours are red, yellow, blue on white with black for what the proposition merely gives. Two consequences price
// this round: a filled area is a second *name* in the same sentence, so a mark with two filled areas is making two
// statements; and Byrne's fills are flat regions, which is why they are cheap to print and hard to fake with a tint.
//
// WHY A FACE IS NOT A THICK LINE. Three things follow and `design/round22.mjs` prices all three:
//   1. AREA. A face has one, and it is measured twice — projected, and ON THE SPHERE this drawing implies — so a
//      face is named by its geometry rather than by its paint (design/mark-faces.mjs). The region between the two
//      meridians is a spherical TRIANGLE whose area is fixed by the very right angles the mark draws; the two faces
//      above and below the near equator arc are spherical LUNES that tile the visible face exactly; the ring's
//      interior IS the near hemisphere. A colouring that fills "the sphere" and fills "the disc" is filling the same
//      thing, and only the measurement says so.
//   2. A DIFFERENT BAR. A filled region is a LAYER (1.35, D101), not a graphic line (3.0). The palette's tints are
//      deliberately flat — 1.04 to 1.18 against paper — because a chip ground must not read as a raised surface, so
//      the obvious "wash" tokens are the wrong tool for a Byrne area.
//   3. A FACE IS A GROUND. Every line painted over the fill must clear 3.0 against the FILL, not against the page.
//      That is the squeeze this round exists to print: a face has to be far enough from the ground to read as a
//      region and far enough from the lightest line drawn on it to keep that line legible. The two bars close on
//      each other, and the runner prints the window that survives both.
//
// WHAT IS NOT SHIPPED HERE. Colour on this site is operator-ratified (D316): the runner prices, the operator picks,
// and no byte of src/ or of src/styles/global.css moves before a pick exists. A face is also a new KIND of shape
// for this mark — its gates count shapes, and a planted face makes nine — so the shape-count price is printed as a
// price (the probes' own refusal, verbatim), not tuned away.
//
// THE LINES ARE ROW C'S, IMPORTED. `LINES` below is `MARK_COLOURS` read out of src/lib/brand-mark.mjs, not a copy
// of it: a face round that restated the line colouring could price a mark the site no longer has, which is the
// defect D481 §c names (the incumbent is the control in every colour round). The CONTROL row is the one with no
// face, and the runner FINDS it by matching these maps against the shipped table.
import { MARK_COLOURS } from '../../src/lib/brand-mark.mjs';
import { GOLD_HUES, GOLD_CHROMAS, GOLD_L_FLOOR } from './round23-options.mjs';

export { MARK_SLOTS as SLOTS } from '../../src/lib/brand-mark.mjs';
export const LINES = { paper: { ...MARK_COLOURS.paper }, ink: { ...MARK_COLOURS.ink } };

// ---------------------------------------------------------------------------
// THE GOLD STEER (operator, 2026-11-25), VERBATIM:
//   "Regarding the logo, I feel like the gold color that is an established theme color of the website should be
//    used in the logo a bit more prominently. Ensure some options you create to share with me consider that."
// Rows F6-F9 below are that instruction inside the FACE round. Byrne's own palette supplies the licence: red,
// yellow, blue on white, and the prose speaks of "the squares of the blue and red lines", so a gold area is the
// yellow in the same sentence rather than a fourth idea.
//
// WHY A FAMILY AND NOT A TOKEN. The site declares NO gold (D316 retired the name `gold` and the palette round
// refused the amber read; the warm role is `accent` at hue 35.7). Colour is operator-ratified (D316), so this
// round may not invent a token: it prices a hue @theme does not declare, and `design/round22.mjs` registers it as
// a CANDIDATE through `declareCandidate` so its bytes come from the same token->bytes path a shipped token's do
// (the D485 unit trap is exactly what a second conversion would re-grow).
//
// WHY THE HUE AND CHROMA COME FROM ROUND 23. One home per rule: the gold SEARCH SPACE is declared once, in
// `round23-options.mjs`, because round 23 solved it against the tab's pair bar and round 22 must price the SAME
// gold a reader would see there, not a second gold with a second arithmetic. The pair taken below is the one
// round 23's solve preferred (most chroma, widest hue gap from `--color-accent`), and the assertion right here is
// what keeps the two files from drifting apart silently: if round 23's search space stops containing this pair,
// round 22 stops running rather than pricing a gold no other record knows about.
// ---------------------------------------------------------------------------
// Re-exported so `design/round22.mjs` reads the gold search space from THIS file and never from round 23's options
// directly: the rounds stay decoupled from each other and the space still has one home.
export { GOLD_HUES, GOLD_CHROMAS, GOLD_L_FLOOR } from './round23-options.mjs';
export const GOLD_HUE = 75;
export const GOLD_CHROMA = 0.14;
if (!GOLD_HUES.includes(GOLD_HUE) || !GOLD_CHROMAS.includes(GOLD_CHROMA)) {
  throw new Error(`round22-options: the gold family is hue ${GOLD_HUE} chroma ${GOLD_CHROMA}, which round 23's search space (hues ${GOLD_HUES.join('/')}, chromas ${GOLD_CHROMAS.join('/')}) no longer contains. One home for the gold arithmetic (D316) — fix both files or neither.`);
}
export const GOLD_FAMILY = {
  name: 'gold',
  H: GOLD_HUE,
  C: GOLD_CHROMA,
  floor: GOLD_L_FLOOR,
  source: `the pair round 23's gold solve took from its own search space (design/grill/round23-options.mjs: GOLD_HUES ${GOLD_HUES.join('/')}, GOLD_CHROMAS ${GOLD_CHROMAS.join('/')})`,
  floorSource: "round 21's YELLOW_L_FLOOR (design/round21.mjs:131), carried here as GOLD_L_FLOOR — a STATED JUDGEMENT, not a ratified bar",
  why: 'the site\'s own warm family (accent, hue 35.7) is declared and shipped, so a warm FACE costs no token; a true gold at hue 75 does not exist in @theme, so every gold row below is priced as a candidate and refuses to ship until the operator declares it.',
};
// Families a row may name that are NOT tokens. The runner resolves a token name through @theme and a name in this
// map through its declared hue/chroma, and never the other way round.
export const FAMILIES = { gold: GOLD_FAMILY };

// A row is a SET of filled faces. Each face is taken from a HUE FAMILY already declared in the palette, at a
// lightness the runner SOLVES for per ground and per face (the window both bars leave). A family rather than a
// token, because the census shows no declared token is a legal face on paper at the lightness that keeps the lines
// over it legible — so each row names the family it would take and the runner prints the token that would cost.
export const ROWS = [
  {
    id: 'C0',
    label: 'row C alone — the colouring the site ships today (nothing filled)',
    byrne: 'the control: Byrne line colouring with no region. A face round without this row cannot say what a face costs.',
    faces: [],
    reading: 'the shipped mark: a colour names a line, and the figure has no area. Everything below is a delta from this measured line.',
  },
  {
    id: 'F1',
    label: 'the lune filled — the mark\'s own area, in the club red',
    byrne: 'Byrne fills the region a proposition is about. Here that region is the spherical triangle between the two meridians and the near equator arc, and its area is fixed by the two right angles the mark already draws.',
    faces: [{ face: 'lune', family: 'accent' }],
    reading: 'one area, one colour: "the red figure" is the strip of surface between the two lines, which is where the metaphor lives. The pair keep their two colours (row C), so the area names the BETWEEN, not a line.',
  },
  {
    id: 'F2',
    label: 'the south lune filled — the region below the near arc, in the club red',
    byrne: 'the other reading of the same ink: colour the half the lines leave, so the equator becomes the boundary of a region rather than a line across a disc',
    faces: [{ face: 'south', family: 'accent' }],
    reading: 'the fill sits under the equator, so the sphere gains a near side and a far side: the dashed arc stays uncoloured and the solid arc reads as an edge of an area. The meridians run THROUGH the fill on their way up, so they are the lines the fill must not swallow.',
  },
  {
    id: 'F3',
    label: 'the north lune filled — the face the claim lives on, in the club blue',
    byrne: 'Byrne colours the area a construction moves through; here the construction is the pair climbing to the pole, and the area they bound is everything above the equator',
    faces: [{ face: 'north', family: 'path-calendar' }],
    reading: 'the biggest single region the drawing has (68.45% of the visible face) and the one that carries the pole, both meridians and the notation. It also puts the most line-ink over a fill, so it is where the two-bar squeeze bites hardest.',
  },
  {
    id: 'F4',
    label: 'two areas, two colours — lune red, south lune blue',
    byrne: 'the literal Byrne sentence — "the squares of the blue and red lines" — where two regions are named by two colours so the prose can point at either without a letter',
    faces: [{ face: 'lune', family: 'accent' }, { face: 'south', family: 'path-calendar' }],
    reading: 'the two faces this drawing really does tile the figure with are the north and south lunes; this row takes the triangle inside the north face plus the south face, so the two fills are DISJOINT and meet only at the near arc. What it costs is a third name in a mark whose claim is about a pair of lines.',
  },
  {
    id: 'F5',
    label: 'the near hemisphere filled — the sphere as a body, in the palette\'s own grey',
    byrne: 'Byrne\'s circles are regions as often as they are outlines; a filled limb is how 1847 printing says "this is a body, not a disc"',
    faces: [{ face: 'disc', family: 'rule' }],
    reading: 'colouring the near hemisphere IS colouring the disc, so every one of the eight lines is drawn over the fill and the whole mark becomes lines-on-surface. This is the row that shows what the layer bar and the graphic bar cost at the same time.',
  },
  // ---- F6-F9: the operator's gold steer of 2026-11-25, priced in the same four currencies as F1-F5 ----
  {
    id: 'F6',
    label: 'the lune filled in gold — the mark\'s own area, in Byrne\'s yellow',
    byrne: 'the yellow of Byrne\'s three-colour printing, on the region a proposition is about: the spherical triangle between the two meridians and the near equator arc',
    faces: [{ face: 'lune', family: 'gold' }],
    reading: 'the steer read as literally as F1: the same region F1 fills in the club red, filled instead in the gold the operator asked to see more of. Compared against F1 on the same photographs, it is the question "which colour names the BETWEEN" asked with everything else held still.',
  },
  {
    id: 'F7',
    label: 'the near hemisphere filled in gold — gold as the sphere\'s own surface',
    byrne: 'Byrne\'s yellow is the colour his diagrams use for the ground a figure sits on as often as for a line; a yellowed limb is the loudest reading a flat fill allows',
    faces: [{ face: 'disc', family: 'gold' }],
    reading: 'the most prominent gold this drawing can carry: the largest area it bounds (the whole visible face, 100.02% by measurement), with all eight lines drawn over it. This is the row that answers "more prominently" as area rather than as a second line colour — and the row where the two bars squeeze the gold hardest.',
  },
  {
    id: 'F8',
    label: 'two areas, gold and red — lune gold, south lune in the club red',
    byrne: 'the literal Byrne sentence with the yellow present: two regions named by two colours so the prose can point at either without a letter',
    faces: [{ face: 'lune', family: 'gold' }, { face: 'south', family: 'accent' }],
    reading: 'F4\'s two disjoint regions, with the gold taking the triangle the metaphor lives in and the club red taking the region below the equator. What it costs is a third name in a mark whose claim is about a pair of lines — and the measured hue gap between the gold and the red is what says whether they read as two names or as one warm wash.',
  },
  {
    id: 'F9',
    label: 'the north lune filled in gold — the face the claim lives on, in gold',
    byrne: 'the area a construction moves through, in the colour that carries most light: here the construction is the pair climbing to the pole',
    faces: [{ face: 'north', family: 'gold' }],
    reading: 'the middle prominence between F6 and F7: 68.45% of the visible face, the region that carries the pole, both meridians and the notation, in gold instead of the club blue F3 takes. It also puts the most line-ink over a gold fill, so it is where a gold\'s legal lightness is decided by the lines it has to keep legible.',
  },
];

// The hue families the band solve runs over: every declared token, grouped by hue, so the round can say what a
// face in ANY family the palette already has would look like, and not only in the families the rows happen to pick.
export const bandFamilies = (tokens) => {
  const byHue = new Map();
  for (const [name, t] of Object.entries(tokens)) {
    if (name === 'paper' || name === 'ink-on-paper') continue;
    const key = `${Math.round(t.H)}|${t.C}`;
    if (!byHue.has(key)) byHue.set(key, { H: t.H, C: t.C, tokens: [] });
    byHue.get(key).tokens.push(name);
  }
  return [...byHue.values()].sort((a, b) => a.H - b.H);
};
