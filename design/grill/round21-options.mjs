// round21-options.mjs — the ONLY place the Byrne-1847 colourings exist (grill round 21, 2026-11-24).
//
// The operator's ask, verbatim: "If you can, also create it in the style of John Byrne's 1847 Euclid
// illustrations, where it makes heavy use of primary colors. If you can do that, use our website's color
// palette, though."
//
// WHAT THE SOURCE ACTUALLY DOES, grounded rather than remembered. The book is Oliver Byrne's "The First Six
// Books of the Elements of Euclid, in Which Coloured Diagrams and Symbols Are Used Instead of Letters for the
// Greater Ease of Learners" (London, W. Pickering; printed by Charles Whittingham, Chiswick Press, 1847) — the
// operator's "John Byrne" is the same volume; Byrne's brother John co-authored his 1830 Diophantine algebra.
// Three facts drive the options, and all three come from the title page and Byrne's own preface as reproduced
// at c82.net/euclid and in the archived text (fetched 2026-11-24):
//   1. COLOUR REPLACES LETTERS. The title says it: coloured diagrams and symbols "instead of letters". The
//      prose then refers to "the squares of the blue and red lines" — a line's colour IS its name.
//   2. IT IS NOT ORNAMENT. Byrne, 1847: "we do not introduce colours for the purpose of entertainment, or to
//      amuse by certain combinations of tint and form, but to assist the mind… to increase the facilities of
//      instruction".
//   3. THE INK IS RED, YELLOW, BLUE (+ black) on white paper — the printing of the day, ~100 copies at
//      25 shillings.
//
// Why that is a hard fit for THIS mark, and what the round is for. The mark's claim is that the two lines are
// the SAME KIND of line (parallel where they start) and meet because the surface is curved. Byrne's convention
// colours a line to NAME it, so two differently-coloured meridians read as two different objects — option C
// prices exactly that reading and the round prints the tension rather than hiding it. And the third primary is
// the palette's known hole: the amber the 2026-11-14 read proposed was refused (D316) at 1.95 on paper and
// 0.043 OKLab from Amazon orange, so `round21.mjs` re-solves the yellow window instead of quoting that.
//
// Every token named here is a token `src/styles/global.css` declares today; the runner reads the palette out of
// that file (design/palette-tokens.mjs) and THROWS on a name it does not find, so this table cannot invent a
// colour and cannot go stale with a palette round.
//
// Slots are the eight drawn shapes in paint order, named for what they are:
//   ring (the silhouette circle), rear (the far, dashed half of the equator), front (the near half),
//   left / right (the two meridians), angleL / angleR (the right-angle marks), dot (the meeting point).

export const SLOTS = ['ring', 'rear', 'front', 'left', 'right', 'angleL', 'angleR', 'dot'];

export const OPTIONS = [
  {
    id: 'A',
    label: 'incumbent (the control)',
    byrne: 'not Byrne — the ratified colouring, kept in the round so every other row is a delta from a measured line, not from memory',
    paper: { ring: 'rule', rear: 'rule', front: 'rule', left: 'ink', right: 'ink', angleL: 'accent', angleR: 'accent', dot: 'accent' },
    ink: { ring: 'band-text', rear: 'band-text', front: 'band-text', left: 'band-text', right: 'band-text', angleL: 'accent-on-ink', angleR: 'accent-on-ink', dot: 'accent-on-ink' },
    reading: 'one line-colour for the sphere, one for the pair, gold for the notation. Colour carries ROLE only.',
  },
  {
    id: 'B',
    label: 'Byrne: the given figure in black, the lines in the club red',
    byrne: 'Byrne draws what the proposition gives in black and what it constructs or seeks in a primary; the notation (the right angles) takes the second primary so the reader can follow which statement is about which line',
    paper: { ring: 'ink', rear: 'ink', front: 'ink', left: 'accent', right: 'accent', angleL: 'path-calendar', angleR: 'path-calendar', dot: 'accent' },
    ink: { ring: 'band-text', rear: 'band-text', front: 'band-text', left: 'accent-on-ink', right: 'accent-on-ink', angleL: 'path-calendar-on-ink', angleR: 'path-calendar-on-ink', dot: 'accent-on-ink' },
    reading: 'the pair keep ONE colour, so "same kind of line" survives; the sphere recedes because it is the given; blue carries only the construction mark.',
  },
  {
    id: 'C',
    label: 'Byrne literally: colour instead of letters, one per line',
    byrne: 'the title page\'s own device — a line is named by its colour, so the two meridians are "the red line" and "the blue line" and the prose can say so',
    paper: { ring: 'ink', rear: 'ink', front: 'ink', left: 'accent', right: 'path-calendar', angleL: 'accent-strong', angleR: 'accent-strong', dot: 'path-mobilizon' },
    ink: { ring: 'band-text', rear: 'band-text', front: 'band-text', left: 'accent-on-ink', right: 'path-calendar-on-ink', angleL: 'accent-on-ink', angleR: 'accent-on-ink', dot: 'path-mobilizon-on-ink' },
    reading: 'the most Byrne row on the table, and the one that costs the mark its claim: two colours name two DIFFERENT lines, and "parallel" is a statement about a pair. Priced, not recommended.',
  },
  {
    id: 'D',
    label: 'three primaries, one per role (green standing in for yellow)',
    byrne: 'Byrne\'s ink is red, yellow, blue plus black. There is no legal yellow here (see the round\'s yellow solve), so the third primary is taken by the palette\'s green, path-mobilizon at hue 145',
    paper: { ring: 'ink', rear: 'ink', front: 'ink', left: 'accent', right: 'accent', angleL: 'path-mobilizon', angleR: 'path-mobilizon', dot: 'path-calendar' },
    ink: { ring: 'band-text', rear: 'band-text', front: 'band-text', left: 'accent-on-ink', right: 'accent-on-ink', angleL: 'path-mobilizon-on-ink', angleR: 'path-mobilizon-on-ink', dot: 'path-calendar-on-ink' },
    reading: 'black sphere, red pair, green notation, blue point: three primaries plus black, and the pair still one colour.',
  },
  {
    id: 'E',
    label: 'D with Byrne\'s flat wash inside the lune',
    byrne: 'Byrne fills regions, not only lines — a proposition\'s area is a block of red, blue or yellow. The lune between the two meridians is the mark\'s "area"',
    paper: { ring: 'ink', rear: 'ink', front: 'ink', left: 'accent', right: 'accent', angleL: 'path-mobilizon', angleR: 'path-mobilizon', dot: 'path-calendar' },
    ink: { ring: 'band-text', rear: 'band-text', front: 'band-text', left: 'accent-on-ink', right: 'accent-on-ink', angleL: 'path-mobilizon-on-ink', angleR: 'path-mobilizon-on-ink', dot: 'path-calendar-on-ink' },
    fill: { token: 'path-calendar-tint', ground: 'paper' },
    reading: 'the wash is the one Byrne move that changes what KIND of contrast the mark is held to: a filled region is a LAYER (1.35, D101), not a graphic line (3.0) — but it also adds a nine-th shape to a mark whose gates count eight.',
  },
];

// The wash candidates, priced against the ground they would sit on. The bar is the LAYER bar (1.35, D101):
// a fill has to read as a region, and the palette's tints are deliberately FLAT (they must stay UNDER 1.35 so a
// chip ground does not read as a raised surface), which is exactly why a chip tint may be the wrong tool here.
export const WASHES = [
  { token: 'tint', why: 'the palette\'s only warm wash (adopted accent-wash #F0E2D0)' },
  { token: 'path-calendar-tint', why: 'a path tint, deliberately flat (93% 0.03 205)' },
  { token: 'path-mobilizon-tint', why: 'the green path tint' },
  { token: 'panel', why: 'the raised-surface token — flat by rule against paper' },
];

// The yellow question, re-solved rather than remembered. D316 refused the read's amber (#E9A63F) at 1.95 on
// paper and 0.043 OKLab from Amazon orange (#FF9900). What was never printed is the WINDOW: at each candidate
// yellow hue, what lightness range clears the 3.0 graphic bar on paper at all, and what chroma that leaves.
export const YELLOW_HUES = [60, 75, 85, 95, 105];
export const YELLOW_CHROMAS = [0.10, 0.14, 0.18];
