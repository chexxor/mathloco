// The club's mark: two lines that leave a sphere's equator at right angles — so parallel — and cross at the pole.
//
// WHAT THE MARK MEANS (corrected 2026-11-02, operator ruling). The operator's words: the drawn mark was "an
// incorrect interpretation of the meet up image… two parallel lines intersect on a curved surface", and it is in
// production, so it gets corrected rather than re-litigated. The source figure is the club's own event artwork
// (`https://secure.meetupstatic.com/photos/event/8/d/d/8/highres_534396312.webp`, fetched 2026-11-02, kept at
// `.design/mark-src/source.png`). It was read by measurement, not by eye — this session's model has no vision,
// and the repo's own finding (design/state.json `layout_probe`) is that screenshot judgement has no power here
// while measurement and transcription do. The ink mask (L > 0.30 = 3.8% of pixels; it is a dark-ground drawing,
// median L 0.057) printed as a 150×54 ASCII grid shows exactly four things:
//   - a big circle (rows 1-44, columns 21-127);
//   - a long horizontal dashed line across it at row 16 — the equator, drawn **curved** (it bows), which is what
//     makes the ring read as a sphere rather than a disc;
//   - two lines leaving that line side by side at columns ~50 and ~101, **vertical**, holding an equal separation
//     from row 3 to row ~30, then curving in and converging at the bottom of the circle at the centre column;
//   - small text where each line meets the equator (rows 7-9) and a label at the pole (rows 45-47).
// That is the standard spherical-geometry figure — two lines that are parallel where they start, meeting because
// the surface is curved — and the club's caption on it is "S pole — meet here".
//
// TWO RULINGS ON THE CORRECTED MARK (operator, 2026-11-02). First: the metaphor is "two parallel lines intersect
// on a curved surface". Second, on the first correction: "the circle does not look like a sphere — the one I made
// before had an equator line that was curved to show it." So the surface cue is now drawn, not implied: the
// equator is a **curved** pair of arcs (a tilted great circle, the way a globe is drawn) instead of a straight
// chord, and it meets the ring exactly at the ring's widest points. The first correction had drawn it as a chord
// — technically the far half of that ellipse with the near half omitted, which is why it read as a line across a
// disc. A plain <circle> plus a straight line is a disc with a line on it; the curve is the whole cue.
//
// THIRD RULING: THE FAR HALF IS DRAWN DIFFERENTLY FROM THE NEAR HALF (operator, 2026-11-02). "The rear side of
// the equator should be denoted differently from the front side… that distinction helps the shape read as a
// sphere. Another idea is to add shading as if there were a light source." The first of those is now drawn: the
// arc that bows UP is the far side of the sphere, so it is drawn in DASHES; the arc that bows DOWN is nearer
// than the surface it lies on, so it is drawn solid. That is occlusion — the part of the great circle the sphere
// hides from itself — and it is what the source figure does too (the ASCII ink mask of it reads "a long
// horizontal dashed line across it", and the mark used to be solid on the theory that dashes cannot survive at
// small sizes; the theory was wrong, see below). Of the standard depth cues, that is the one this mark can carry:
// graticule lines and elliptical cross-sections are already here (ring + equator + two meridians), and TONAL
// shading would need a filled shape whose contrast bar is a LAYER's (1.35, D101) rather than a graphic line's
// (3.0), a gradient in the share card's own SVG document, and a new colour role — so it stays an open question
// for the operator with numbers attached, not a decision taken here.
// WHY THE DASH SURVIVES AT PHONE SIZE (the earlier reason for solid was wrong): `dash: '5 4'` is in viewBox
// units, and the smallest shipped box is the hero on a 320px viewport — box 276px, scale 1.15 — where a dash is
// 5.75 device px long with a 4.6px gap: four times the 1.5px floor that D119 sets for a stroke to have a
// measurable colour identity at all. `check:render` now asserts the declared dash ARRIVES (computed
// strokeDasharray, per shape), and `design/mark-geometry.mjs` measures the cue in painted pixels: the near
// arc's widest run near its apex is 49 units of unbroken line, the far arc's is one dash.
//
// WHAT WAS WRONG IN THE OLD DRAWING (drawn in apply 4h, shipped until 2026-11-02). Three of its six shapes were
// inventions, and the one idea that carries the metaphor was missing:
//   - the two lines were mirror-symmetric curves starting at the top corners, so they were converging from their
//     first pixel. Nothing in the figure read as PARALLEL, which is the whole surprise;
//   - a THIRD line ran straight down the middle into the meeting point (`M120 20 L120 128`). The source has no
//     such line; it is what made the figure read as an arrow / Y;
//   - the two gold segments were mirrored arcs (`M62 118 C…`, `M178 118 C…`), also not in the source;
//   - the equator — the reference line the two lines leave at right angles, the thing that ESTABLISHES that they
//     are parallel — was absent. Without it "parallel lines meeting" cannot be seen at all.
// The lesson ships with the fix: a mark derived from a source image has to be checked against the source image.
// "The owner approved the specimen" does not substitute — the operator ratified a drawing, not a reading of
// their figure. Asking for the vector (D94) is still worth doing, and `MARK` below is still the one place it lands.
//
// WHY THIS FILE EXISTS (apply 4h, 2026-11-01). The mark is drawn in two places — the landing page's hero column
// (`src/components/HeroSection.astro`) and the share card (`scripts/make-social-share.mjs`, D118) — and the share
// card's pixel gate (`scripts/check-social-card.mjs`), which measures the meeting point's position in the JPEG,
// needs the same coordinates. Before this file, the path data was typed twice and the coordinates a third time,
// which is exactly how the palette drifted before `@theme` owned it: two renderings of one idea, no single
// source. So composer and verifier read one table (D118's rule, applied to geometry instead of colour). One table
// is also why this correction moved the hero, the card and both gates together.
//
// WHAT IS NOT HERE: colour. Which token a role takes depends on the ground it sits on — `gold` on paper (4.82)
// vs `gold-on-ink` on the band (5.80), because `gold` on ink is 2.50 and banned (DESIGN.md "Colour"). The role->
// token maps are `MARK_COLOURS` below; each surface turns a token into whatever its renderer understands (a
// Tailwind class on the page, `var(--color-…)` in the card document, which has no Tailwind).
//
// Every drawn mark clears the **3.0 graphic bar** (D101). `check:render` measures that on painted bytes, per
// shape, on the built page (D116) — see the `marks` probe in `design/grill/render-measure.js`.

export const MARK = {
  vbW: 240,
  vbH: 150,
  // Order is paint order: the surface and its reference line sit under the routes, the routes under the marks
  // that explain them. `role` is not a colour, it is what the shape means, so a ground can supply its own map.
  shapes: [
    // The curved surface. cx/cy/r unchanged from the ratified round-4 specimen.
    // sw 1.3, not 0.9 (round 8, operator ruling M-B, 2026-11-02), and that ruling survives the geometry fix —
    // it was about this stroke's weight, not its path. Measured: at the hero's phone box (276px, scale 1.15) a
    // 0.9-unit stroke lands at 1.03 device px and its pixels never clear the 3.0 graphic bar, so the ring reads
    // as absent at exactly the width the club's flyer-sized audience sees. Painted pixels at/over 3.0 inside the
    // drawn box: 890 at 0.9u -> 1070 at 1.3u (276px box), 1722 -> 2038 at the 372px desktop box; ink share of the
    // box 4.09% -> 4.53%. Evidence: design/grill/round8/report.json; the candidates are in
    // design/grill/round8-ramps.mjs. (Those numbers are the OLD figure; the corrected figure's numbers are in
    // .notes/DECISIONS.md and are re-measured with the same probe.)
    { role: 'sphere', tag: 'circle', cx: 120, cy: 78, r: 58, sw: 1.3 },
    // The equator's REAR half — the far side of the tilted great circle, drawn in dashes because the sphere
    // hides it from the viewer (operator ruling, third on this mark). `face` is the author's claim; the probe
    // checks it against the pixels, which is what catches the dash landing on the wrong arc (that would draw a
    // sphere with its near side hidden — an inside-out globe).
    // Two arcs of one ellipse centred on the sphere: semi-major = r horizontally (its ends land exactly on the
    // ring at cx ± r, which is what makes it the sphere's own circle rather than a decoration inside it) and
    // semi-minor 21 = 0.36r vertically, so it bows 21 units above and below the centre. A half-ellipse as one
    // cubic: controls at ±(4/3)b off the endpoints' height put the apex at exactly cy ∓ b (at t = 0.5 the cubic
    // sits 0.75 of the way from the endpoint height to the control height, and 0.75 × 28 = 21).
    { role: 'sphere', tag: 'path', d: 'M62 78 C62 50, 178 50, 178 78', sw: 1.3, face: 'rear', dash: '5 4' },
    // The NEAR half of the same ellipse: solid, because it is the part of the great circle between the viewer
    // and the sphere's centre. Same token, same weight — the two halves differ in continuity, not in colour, so
    // both keep clearing the 3.0 graphic bar (D101) and neither can drift into a tint.
    { role: 'sphere', tag: 'path', d: 'M62 78 C62 106, 178 106, 178 78', sw: 1.3, face: 'front' },
    // The two lines. Straight and vertical for the first 25 units — an equal separation of 52 units held the
    // whole way, which is all "parallel" means measurably — then one cubic each into the pole. Each starts exactly
    // on the far arc (at x 94 and 146 the arc is at y 59.0), and the arc there is only ~7° off horizontal, so the
    // right angles at the junctions are real rather than claimed. Each cubic leaves its straight segment with a
    // vertical tangent (first control point directly below the join), so there is no kink at (94,84) / (146,84),
    // and each arrives at the pole ~32° off horizontal, mirrored, so the two lines CROSS at ~64° rather than
    // kissing tangentially. On the way they cross the near arc, which is what a meridian does on a globe.
    { role: 'route', tag: 'path', d: 'M94 59 L94 84 C94 108, 104 126, 120 136', sw: 1.4 },
    { role: 'route', tag: 'path', d: 'M146 59 L146 84 C146 108, 136 126, 120 136', sw: 1.4 },
    // The right-angle marks: the notation for "each of these leaves the equator at a right angle", which is the
    // construction that makes them parallel. In the source this is text (measured as two small text blobs where
    // the lines meet the equator); a mark that renders at 24×15px cannot carry text, and inventing a word would
    // break D92 (state only sourceable facts), so the smallest faithful encoding is the square-corner glyph. It
    // sits in the quadrant between the two arms, 6 units to a side. Gold because it is the reason the figure
    // means anything, not because it is decoration.
    { role: 'accent', tag: 'path', d: 'M100 59 L100 65 L94 65', sw: 1.4 },
    { role: 'accent', tag: 'path', d: 'M140 59 L140 65 L146 65', sw: 1.4 },
  ],
  // The filled point the two lines cross at — the mark's whole point, so the gates put a measurement band here
  // rather than trusting that the paths still converge. It sits ON the surface: (120,136) is the circle's bottom
  // edge (cy + r = 136), the pole, as in the source. The first correction's point sat 8 units inside the sphere.
  dot: { role: 'accent', tag: 'circle', cx: 120, cy: 136, r: 4 },
  meet: { x: 120, y: 136 },
};

// Shapes a correctly-rendered mark contains. `check:render` compares this against the DOM it measures:
// an <svg> can lose children silently — measured on the share card, firefox painted the rule and the
// first mark but dropped every mark wrapped in a <span>, because SVG treats an unknown element's
// subtree as foreign content (D118 lesson 1). A count is the cheapest check that catches it.
export const MARK_SHAPE_COUNT = MARK.shapes.length + 1;   // + the filled meeting point

// role -> token name (the `--color-<name>` in @theme) per ground. `rule` is the lightest line the
// system has and lands exactly on the graphic bar on paper (3.01 measured, D116): a `rule` retune that
// goes lighter than 3.0 on paper is supposed to break the hero mark, and `check:render` says so.
export const MARK_COLOURS = {
  paper: { sphere: 'rule', route: 'ink', accent: 'gold' },
  ink: { sphere: 'band-text', route: 'band-text', accent: 'gold-on-ink' },
};
