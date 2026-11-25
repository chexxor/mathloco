// round23-options.mjs — the ONLY place the TAB framings for the club logo exist (grill round 23, 2026-11-25).
//
// THE ASK. Round 22 priced which FACES a Byrne colouring could fill; this round prices the other half of the goal:
// putting the ratified logo — row C's sphere with its two intersecting meridians (D483) — into the browser tab. The
// operator's own framing of the item asked for "square sphere-centred variant, full 240x150 letterbox,
// weight-scaled variants", which is what the row set below is: every way the drawing can be put in the slot, each
// one priced by pixels rather than argued about.
//
// WHY A FRAMING ROUND IS NEEDED AT ALL, in three numbers.
//   1. THE SLOT IS 16x16. MDN, "Favicon" (fetched 2026-11-25): "Usually, a favicon is 16 x 16 pixels in size". The
//      site's tab is that slot, and the artifact that fills it today is a 32x32 `∑` glyph, not the logo.
//   2. THE DRAWING IS 240x150. Fit the whole plate into 16 device px and the contain-scale is 0.0667 device px per
//      viewBox unit, so the logo's thickest line (1.4u) lands at 0.09 device px and its thinnest (1.3u) at 0.087.
//      D119's measured floor is that a stroke thinner than ~1.5 device px never contains a fully-covered pixel: the
//      hero's logo is roughly 17x under its own line-weight floor when it is shrunk into a tab as drawn. Framing is
//      not cosmetics; it is the only way to buy the stroke any width at all, because the only lever left is how many
//      viewBox units a device pixel is allowed to cover.
//   3. THE TAB GATE ALLOWS TWO COLOURS. `scripts/check-favicon.mjs` rule 3 ("a logo is one ground and one glyph")
//      and rule 5 (no reserved `--color-path-*` hue) both refuse row C as shipped. What they count is every literal
//      in the document, so the ground rect is one of them: row C paints 6 literals on paper (5 distinct line tokens
//      + the paper ground) and 5 on ink (4 tokens + the ink ground), and TWO of the tokens on each ground are
//      reserved path hues (`path-calendar`, `path-mobilizon`) @measured 2026-11-25 by npm run round23, the T9 gate
//      findings quoted verbatim in design/grill/round23/report.json. So a tab cannot carry the hero's colouring; it carries
//      either the ratified PAIR (D316: the ground and the colour of the ground on the other side of the band) or one
//      line colour. Row T9 exists to print the gate's refusal VERBATIM rather than to argue about it (D479: a gate
//      is re-derived, never bypassed — and re-deriving it starts by reading what it actually says).
//
// THE LEVER EVERY ROW TURNS: WEIGHT. A "1.5px floor at 16" row multiplies every stroke (and its dash, and the dot's
// radius stays put because the dot is a fill) until the thinnest line reaches 1.5 device px in that framing. That is
// a real change to the drawing: the same figure with heavier lines is not the same figure, and the heavier the
// lines the more the two meridians merge with the ring they cross, the more the equator's dash fills into a solid
// arc, and the more of the ring's outer edge the frame cuts off. Each row prints all three consequences instead of
// asserting them: the run profile (is the dashed arc still dashed?), the survival table (which of the eight shapes
// lands at all), and the frame clip in device px.
//
// THE CONTROL IS THE TAB AS SHIPPED, AND IT IS READ OFF THE TREE. Row I0 has no colours, no geometry and no size
// typed into this file: the runner parses `public/favicon.svg` and measures the document it finds there
// (D481 §c — the incumbent is the control in every round, and a control typed by hand is a claim). Everything else
// on the page is a delta from what that glyph measures.
//
// WHAT IS NOT SHIPPED HERE. Colour is operator-ratified (D316) and a framing is the same kind of decision: the
// runner prices, the operator picks, and `public/favicon.svg` does not change in this commit. The artifact half of
// the work (`logo-lands`) happens after the pick, from the row the operator chooses.

export { LOGO_SLOTS as SLOTS } from '../../src/lib/logo.mjs';

// The tab sizes the round reads every candidate at. 16 is the slot (MDN above); 32 is what a HiDPI tab asks for and
// what the incumbent's own viewBox is; 48/64 are the sizes a bookmark/starshot tile and a macOS retina tab reach.
export const TAB_WIDTHS = [16, 32, 48, 64];
// The sizes measured twice, by librsvg AND by a real browser. A favicon is only ever rasterized by a browser, so
// the two readings that decide the pick are the browser ones; the rest are librsvg-only for shape.
export const BROWSER_WIDTHS = [16, 32];
export const GROUNDS = ['paper', 'ink'];

export const ROWS = [
  {
    id: 'I0',
    incumbent: true,
    label: 'the tab as it ships today — a 32x32 ink plate with the club summand, no sphere',
    framing: 'derived from public/favicon.svg at run time (the document is parsed, not restated)',
    byrne: 'none: the incumbent predates the Byrne rounds. It is here because a framing round that cannot reproduce the shipped tab is measuring a tab that does not exist.',
    reading: 'one ground, one glyph, 17.15 contrast, a serif summand at 22/32 of the plate. It reads at 16px because a single thick glyph is what a 16px slot can actually hold. A logo row has to beat this, not merely differ from it.',
  },
  {
    id: 'N0',
    frame: 'sphere', colours: 'pair', weightAt: 16, floorPx: null,
    label: 'the logo exactly as the hero draws it, centred on the sphere, no tab tuning',
    framing: 'the ink bounding box of the whole figure (117.4 x 117.46u) fills the 16px slot; every stroke stays at its hero weight',
    byrne: 'row C as ratified, drawn the way the site draws it — this row is the price of the tuning the other rows do',
    reading: 'the honest starting point: whatever survives here survives without bending the drawing. Everything heavier is buying legibility with a different figure, and this row is the line it is bought from.',
  },
  {
    id: 'T1',
    frame: 'sphere', colours: 'pair', weightAt: 16, floorPx: 1.5,
    label: 'sphere-centred, strokes weighted to a 1.5 device px floor at 16px',
    framing: 'the ink box fills the slot, and the thinnest line is scaled until it measures 1.5 device px — D119\'s own floor, in the slot that decides the pick',
    byrne: 'Byrne\'s lines are thick relative to the figure they name; at 16px a line has to be thick or it is not ink at all',
    reading: 'the row the item was really asking for: the sphere, filling the tab, with lines that exist at 16px. Read its dash profile and its frame clip before liking it — a filled-in equator and a clipped ring are what 1.5px costs here.',
  },
  {
    id: 'T2',
    frame: 'sphere', colours: 'pair', weightAt: 16, floorPx: 1.0,
    label: 'sphere-centred, weighted to 1.0 device px at 16px (under the repo\'s own line floor)',
    framing: 'half the weight of T1: the logo keeps closer to its hero proportions, and the lines land at one device pixel',
    byrne: 'the lighter end of the same idea — Byrne\'s line is a name, and a name can be thin as long as it is present',
    reading: 'what happens below D119\'s floor, measured rather than refused: whether a 1px line still has a fully-covered pixel, and how much of the figure survives once the strokes stop being forced.',
  },
  {
    id: 'T3',
    frame: 'sphere', colours: 'pair', weightAt: 16, floorPx: 2.5,
    label: 'sphere-centred, weighted to 2.5 device px at 16px (the heavy end)',
    framing: 'the heaviest weight the slot can be pushed to before the line width is a third of the gap it spans',
    byrne: 'the end of the logic where a colour is a line\'s name and the name is set in display weight',
    reading: 'the fuse end: at this weight the two meridians, the ring and the equator are one mass in places. If it still reads as a sphere, the logo can be bold in a tab; if it does not, this row is the fence.',
  },
  {
    id: 'T4',
    frame: 'sphere', colours: 'pair', weightAt: 32, floorPx: 1.5,
    label: 'sphere-centred, weighted for a 1.5px floor at 32px (the HiDPI tab), then read at 16 too',
    framing: 'same framing as T1, but the weight is solved for the 32px tab instead of the 16px one',
    byrne: 'the same line colouring, tuned for the density most visitors actually have',
    reading: 'the row that asks which tab the logo is drawn for. A weight solved at 32 is a much lighter drawing at 16 — so this row is the comparison T1 needs, in both directions.',
  },
  {
    id: 'T5',
    frame: 'plate', colours: 'pair', weightAt: 16, floorPx: 1.5,
    label: 'the full 240x150 plate, letterboxed in the tab, nothing cropped',
    framing: 'the hero\'s own viewBox, contain-fit: at 16px the drawing occupies a 16x10 band with 3px of empty tab above and below',
    byrne: 'the drawing exactly as the page shows it, in the tab, with its own aspect ratio',
    reading: 'the non-square option: nothing of the figure is cut and nothing is moved, and the price is that the sphere is 10 device px tall in a 16px slot. Its artifact is also the only one that is not square, which is what a browser letterboxes.',
  },
  {
    id: 'T6',
    frame: 'plateSquare', colours: 'pair', weightAt: 16, floorPx: 1.5,
    label: 'the full plate in a 240x240 square ground, ground covering the whole tab',
    framing: 'the plate centred in a square slot of its own long dimension, so the ground rect IS the tab square',
    byrne: 'the drawing as a plate: a rectangle of ground with the figure on it, which is how 1847 printing shows a diagram',
    reading: 'the letterbox with the bands filled in — the ground instead of the browser\'s own background, so the tab shows a square plate with empty bands above and below the figure rather than transparent ones.',
  },
  {
    id: 'T7',
    frame: 'spherePad', pad: 0.1, colours: 'pair', weightAt: 16, floorPx: 1.5,
    label: 'sphere-centred with 10% breathing room at the tab edge',
    framing: 'the ink box padded 10% so the figure does not touch the slot edge — which also absorbs part of the stroke overhang T1 clips',
    byrne: 'the same line colouring with margin, the way Byrne\'s diagrams sit inside their plate rather than out to its rules',
    reading: 'the row that costs scale to buy air. Every unit of padding takes device pixels away from the strokes, so this row says what margin is worth at 16px — and how much of the frame clip it removes.',
  },
  {
    id: 'T8',
    frame: 'sphere', colours: 'single', weightAt: 16, floorPx: 1.5,
    label: 'sphere-centred, every line in ONE colour (the lightest line the ground allows)',
    framing: 'same framing and weight as T1; the only difference is that all eight shapes take one token',
    byrne: 'Byrne uses colour to DISTINGUISH; where a 16px slot cannot hold a distinction, a single colour says one thing instead of failing to say several',
    reading: 'a fact the record states rather than hides: on the paper ground `single` and `pair` resolve to the same token (both are `ink`), so these two rows are identical on paper and differ only on the ink ground (`band-text` instead of `paper`). It prices the case where the tab says one thing.',
  },
  {
    id: 'T9',
    frame: 'sphere', colours: 'rowC', weightAt: 16, floorPx: 1.5,
    label: 'sphere-centred, row C exactly as the hero paints it (6 paints on paper / 5 on ink; two reserved path hues)',
    framing: 'the ratified hero colouring, unmodified, in a tab artifact — so the tab gate\'s own words are what gets printed',
    byrne: 'the literal row C: a colour is a line\'s name, and the logo\'s names are red, yellow-equivalent, blue, green on black',
    reading: 'this row is not a candidate, it is the gate read aloud: `check:favicon` refuses it on rule 3 (too many colours) and rule 5 (path hues). Whatever the operator picks, this is the ruling `logo-lands` has to re-derive the gate around, priced now rather than discovered at ship time.',
  },
  // ---------------------------------------------------------------------------
  // THE GOLD STEER (operator, 2026-11-25), verbatim:
  //   "Regarding the logo, I feel like the gold color that is an established theme color of the website should be
  //    used in the logo a bit more prominently. Ensure some options you create to share with me consider that."
  //
  // "gold" has TWO referents in this repo and a row names which one it means; picking one silently is the kind of
  // decision the delegate does not get to make (D316: colour is the operator's).
  //   (A) THE SITE'S OWN WARM FAMILY, hue 35.7. `src/styles/global.css` says it out loud at `--color-accent`:
  //       "the role `gold` held. D316 renames it". This family is declared, shipped, and costs NO new token — rows
  //       G1 and G2 are the answer to "more prominently" that needs no ruling about the palette.
  //   (B) A TRUE GOLD/OCHE HUE, ~62-75. NO token declares it today: the role `gold` was retired with its name, and
  //       the palette round refused an amber read (`--amber #e9a63f`) rather than keep it (D316). So a row that
  //       wants this gold can only be PRICED, against a candidate the round declares at run time
  //       (`palette-tokens.declareCandidate`) — never as a token, because inventing a token is the operator's act.
  //       Rows G3 and G4 are that answer, and they print what the gold costs.
  //
  // WHAT THE GOLD ARITHMETIC SAYS BEFORE THE PICK (the numbers are in the record's `gold` table; the price is in
  // every row's `reading`). Every claim in this block was WRITTEN before the solve ran and is corrected here
  // against it @measured 2026-11-25 by `node design/round23.mjs` (Linux native, node 24.22.1; search space hue
  // 62/75 x C 0.12/0.14):
  //   - A gold LINE on PAPER has to be dark to clear the tab gate's 4.5 pair bar, and the palest lightness that
  //     clears it is L 55 (`oklch(55% 0.14 75)` -> `#a06200`, measures 4.59) — below the L 60 floor at which a hue
  //     60-105 colour at C >= 0.10 reads as gold rather than as ochre, bronze or brown (round 21's judgement,
  //     `YELLOW_L_FLOOR` in design/grill/round21-options.mjs). Legal, and not gold to the eye.
  //   - A gold LINE on INK is the mirror: that window starts at L 59.5, so the solve takes L 60 (`#b07100`, 4.59)
  //     and that one DOES read as gold — not "L 92 at 15.73", which is what this file guessed before it measured.
  //   - A gold PLATE is NOT the 1.35 region case. A plate IS the ground, so the gate's PAIR bar (4.5) compares it
  //     against the LINES drawn over it (`GOLD_ROLES`; `check:favicon` rule 4), which swaps which ground has room:
  //     a gold plate under `ink` lines solves at L 60 (`#b07100`, 4.59, reads as gold); under `paper` lines at L 55
  //     (`#a06200`, 4.59, below the floor). The 1.35 layer bar is what a filled FACE owes (round 22, D101) — a gold
  //     FACE is the easy case, a gold GROUND is not.
  //   - The window is asymmetric by BAR as well as by ground, measured: hue 75 C 0.14 against paper admits L 5..55
  //     at 4.5 and L 5..89.5 at 1.35.
  // So what this set is built to show is not "gold as a surface yes, gold as a line no" but that a gold's legal
  // lightness depends on WHICH COLOUR it is measured against and which bar applies — and on each ground one of the
  // two jobs is forced below the lightness at which the hue reads as gold.
  //
  // There is deliberately no separate "gold on ink" row: `GROUNDS` prints EVERY row on both grounds, so each gold
  // row below already carries its ink reading in the record and on the specimen page.
  // ---------------------------------------------------------------------------
  {
    id: 'G1',
    frame: 'sphere', colours: 'warm', weightAt: 16, floorPx: 1.5,
    label: 'sphere-centred, every line in the site\'s warm accent family (the colour the role `gold` used to be)',
    framing: 'T1\'s framing and T1\'s weight (1.5 device px at 16px), with all eight shapes taking --color-accent on paper and --color-accent-on-ink on ink',
    byrne: 'Byrne prints a figure in one ink and lets the plate carry the colour: here the whole named figure is the club\'s warm red, and the ground stays the page\'s own',
    reading: 'the prominent gold that costs NOTHING: the warm family is already declared, already ships on the hero, and a two-colour tab (ground + one line colour) is what the gate allows today, so this row passes without touching a gate or a token. It is the same gold the site already uses for links and rules, which is also its cost: it is not a NEW colour, so it will read as the site\'s red rather than as a gold plate. Its lines measure 5.77 on paper and 5.69 on ink against their grounds — above the 4.5 the tab demands, and far above the 3.0 the hero demands.',
  },
  {
    id: 'G2',
    frame: 'sphere', colours: 'splitWarm', weightAt: 16, floorPx: 1.5,
    label: 'sphere-centred, warm meridians and warm marks on a dark sphere (the body stays ink)',
    framing: 'T1\'s framing and weight; the ring, the far equator and the near equator take the ground\'s surface token (`ink` / `band-text`) and the two meridians, the two right-angle marks and the meeting point take the warm token',
    byrne: 'the row Byrne would actually print: the given figure in black, the lines that NAME something in colour. It is row C\'s idea with the path hues taken out and one colour put in their place',
    reading: 'this is what "more gold, prominently" looks like when the sphere keeps its body and the warm colour becomes the information. It is also the row the gate REFUSES today: three colours (ground + surface + warm) against rule 3\'s "one ground and one glyph", so its findings are printed verbatim on the specimen. `logo-lands` can only ship it by re-ruling rule 3, which is a decision about what a tab glyph is allowed to be, not a colour decision.',
  },
  {
    id: 'G3',
    frame: 'sphere', colours: 'goldLine', candidate: null, weightAt: 16, floorPx: 1.5,
    label: 'sphere-centred, every line in a TRUE GOLD hue (~75) — the gold the palette does not declare',
    framing: 'T1\'s framing and weight; the lightness is SOLVED per ground by the runner (`goldSolve`): the palest gold clearing the tab\'s 4.5 pair bar on paper, the deepest gold clearing it on ink',
    byrne: 'Byrne\'s yellow is the one ink row C could not use here (round 21 solved that window); this row asks the same question at tab size instead of hero size',
    reading: 'the honest price of a gold LINE, measured: on PAPER the solve lands at L 55 (`oklch(55% 0.14 75)` = `#a06200`, 4.59 against paper), which the record flags as BELOW the L 60 floor at which a hue ~75 colour reads as gold — a bronze line that satisfies the arithmetic and the eye separately. On INK it lands at L 60 (`#b07100`, 4.59 against ink) and that one reads as gold. So the same hue is a gold on the dark tab and a bronze on the light one, and the reason is the bar, not the hue. Either way the row costs a token @theme does not have: `check:favicon` refuses `#a06200` and `#b07100` with "is not a token (nearest: --color-accent renders #a2432a)", and the candidate names are printed as candidates, not as tokens. At 16px the row is also QUIETER than the ratified pair it replaces — T1 measures 87 any / 61 at3 px, this row 90 any / 62 at3 but a max contrast of 4.59 against 17.15 — so a gold line buys prominence in HUE and pays for it in CONTRAST.',
  },
  {
    id: 'G4',
    frame: 'plate', colours: 'goldPlate', ground: null, weightAt: 16, floorPx: 1.5,
    label: 'the full 240x150 plate, and the PLATE ITSELF is the gold',
    framing: 'T5\'s letterboxed plate, with the ground rect painted a SOLID declared gold instead of paper or ink; the lines take the lightest colour the other side of the band allows',
    byrne: '1847 printing shows a diagram on a tinted plate: the colour is the surface the figure sits on, which is the one place a gold has room in this palette (the LAYER bar is 1.35, not 4.5)',
    reading: 'the gold with the most area — and the price that corrects a guess: a gold GROUND is not judged by the 1.35 layer bar, it is judged by the gate\'s 4.5 PAIR bar against the lines drawn over it, so the solve lands at L 60 under `ink` lines (`#b07100`, 4.59, reads as gold) and at L 55 under `paper` lines (`#a06200`, 4.59, BELOW the gold-ness floor). Gold on the light page, bronze on the dark one — the mirror image of the gold-line row, because the plate swaps which colour it is measured against. It is also the row that changes what the tab\'s ground MEANS: a gold plate is the site\'s colour replacing the browser\'s own background, and the 96 blank px a 240x150 plate leaves in a 16px slot (37.5% of the tab, measured) become gold bands. Costs a token @theme does not have.',
  },
];

// The eight things the logo is made of, in paint order (LOGO_SLOTS). The survival table asks of each row, at each
// tab size and on each ground: does this shape land at all, and does it ever reach a fully-covered pixel?
export const SURVIVAL_SLOTS = ['ring', 'rear', 'front', 'left', 'right', 'angleL', 'angleR', 'dot'];
// The two arcs whose relationship IS the logo's depth cue. A rear arc whose run equals the front arc's has fused,
// and the sphere has become a disc with lines on it.
export const DASH_SLOTS = ['rear', 'front'];

// ---------------------------------------------------------------------------
// THE GOLD SEARCH SPACE (rows G1-G4). Declared here as a SPACE TO SOLVE, not as colours: a hue and a chroma
// range, plus the lightness floor a judgement sets. The lightness of every gold this round prices is SOLVED by
// `design/round23.mjs` from the gate's own bar and the grounds in `src/styles/global.css`, then declared as a
// candidate (`palette-tokens.declareCandidate`), so the record reproduces its own gold rather than quoting one.
// WHY A RANGE AND NOT A COLOUR: picking the lightness IS the answer to "does it read as gold", and the answer
// depends on which ground it sits on and which bar applies (4.5 for a tab glyph, 1.35 for a region), so it is
// arithmetic the runner does, not a value typed into an options file (D481 §c's discipline, applied to colour).
export const GOLD_HUES = [62, 75];
export const GOLD_CHROMAS = [0.12, 0.14];
// A STATED JUDGEMENT carried from round 21 (`YELLOW_L_FLOOR`, design/round21.mjs:131), not a ratified bar: below
// about L 60 a colour at hue 60-105 and chroma >= 0.10 reads as ochre, olive or bronze rather than as gold. It is
// printed as a flag on every gold row and shown as swatches on the specimen; the operator chooses by looking.
export const GOLD_L_FLOOR = 60;
// The four gold jobs a colour can do in a tab, and for each: which colour it is measured AGAINST (the thing it
// must not be swallowed by) and which end of the legal lightness window the round takes. A gold line is judged
// against the ground it is drawn on; a gold PLATE is judged against the lines drawn over it, because the plate IS
// the ground and the gate's pair bar (check:favicon rule 4) compares the two paints in the artifact.
export const GOLD_ROLES = [
  { role: 'line', ground: 'paper', against: 'paper', bar: 'pair', take: 'palest legal', why: 'a gold line on the light page: the palest gold that still clears 4.5 is the most gold-shaped colour the bar allows, since gold-ness wants lightness and 4.5 wants depth' },
  { role: 'line', ground: 'ink', against: 'ink', bar: 'pair', take: 'deepest legal at/above the floor', why: 'a gold line on the dark page: lightness buys contrast here, so the binding price is the OTHER end — the deepest gold that still reads against ink' },
  { role: 'plate', ground: 'paper', against: 'ink', bar: 'pair', take: 'deepest legal at/above the floor', why: 'a gold plate carrying `ink` lines: the plate is the ground, so it is held to the pair bar against the lines, and the richest gold is the deepest one that still clears 4.5' },
  { role: 'plate', ground: 'ink', against: 'paper', bar: 'pair', take: 'palest legal', why: 'a gold plate carrying `paper` lines: the lines are light, so the plate has to be dark, which is the case where the gold-ness floor and the bar point opposite ways' },
];
