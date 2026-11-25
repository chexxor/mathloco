// The club's logo: two lines that leave a sphere's equator at right angles — so parallel — and cross at the pole.
//
// WHAT THE LOGO MEANS (corrected 2026-11-02, operator ruling). The operator's words: the drawn logo was "an
// incorrect interpretation of the meet up image… two parallel lines intersect on a curved surface", and it is in
// production, so it gets corrected rather than re-litigated. The source figure is the club's own event artwork
// (`https://secure.meetupstatic.com/photos/event/8/d/d/8/highres_534396312.webp`, fetched 2026-11-02, kept at
// `.design/logo-src/source.png`). It was read by measurement, not by eye — this session's model has no vision,
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
// TWO RULINGS ON THE CORRECTED LOGO (operator, 2026-11-02). First: the metaphor is "two parallel lines intersect
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
// horizontal dashed line across it", and the logo used to be solid on the theory that dashes cannot survive at
// small sizes; the theory was wrong, see below). Of the standard depth cues, that is the one this logo can carry:
// graticule lines and elliptical cross-sections are already here (ring + equator + two meridians), and TONAL
// shading would need a filled shape whose contrast bar is a LAYER's (1.35, D101) rather than a graphic line's
// (3.0), a gradient in the share card's own SVG document, and a new colour role — so it stays an open question
// for the operator with numbers attached, not a decision taken here.
// FOURTH RULING (D482): THE LINES START ON THE NEAR SIDE OF THE EQUATOR (operator, 2026-11-23). "the lines form the
// equator to the south pole start from the bottom/close side of the equator line." (D482 records it LATE: the ask sat
// from 2026-11-23 and its bytes landed in the same commit as the fifth and sixth rulings, which got D480 - a commit
// carrying three rulings owes each of them a line, because this header points at rulings by number.) Until then the two meridians
// left the FAR (dashed) arc and ran toward the viewer, crossing the near arc on the way down — so the pair that
// carries the metaphor was drawn on the hemisphere the sphere hides. They now leave the NEAR arc, at (94,97) and
// (146,97), and run down the visible face to the pole. The price is stated rather than hidden: the parallel run
// shortens from 25 units to 13, because the near arc sits 19 units lower and the pole does not move. See the
// `route` entries in LOGO below for the measurements.
// FIFTH RULING: THEY MEET AT THE NORTH POLE (operator, 2026-11-24). "let's change it so they meet at the north
// pole instead of the south pole please." The pair keep the two feet the fourth ruling put on the near arc —
// (94,97) and (146,97) — and run UP the visible face to the pole. What the flip buys is room: the north pole sits
// 77 units from the near arc where the south pole sat 39.
// SIXTH RULING: THE CURVES ARE THE SPHERE'S OWN (operator, 2026-11-24). "the curves from the equator to the north
// pole are not perfectly curved as they would when on a sphere. Can you fix that?" The first answer to the fifth
// ruling drew each meridian as a straight vertical run and then one cubic into the pole, because the logo's claims
// compete and a point was picked off a measured trade-off table (25 units of straight run for rms 2.24 units off a
// true meridian). The operator rejected the compromise, so the compromise is gone: each route is now the
// orthographic projection of that meridian of this sphere, and the meeting point moved with it, because a tilted
// sphere's pole does not project onto the top of its silhouette. That table stays in this file's history and in
// `logo-meridian-fit.mjs` because it is still the measurement of what the true curve costs — it is no longer the
// thing that picks the curve.
// The projection is read out of the drawing rather than assumed (`node logo-meridian-fit.mjs --exact`):
// the equator's own semi-minor is 21 = 0.3621 r, so the axis stands 21.23° out of the screen plane; the projected
// meridian is a quarter of an ellipse centred on the sphere with conjugate semi-diameters (-26, 18.999) — the
// foot's offset — and (0, -54.06) — the projected axis — and one cubic with the standard 4(√2-1)/3 control offset
// draws it to 0.009 units of geometric error over a 79.7-unit arc. Three consequences, all measured:
//   - the pole is 54.06 units from the centre, at y 23.94, NOT on the ring at y 20. That is sqrt(r² - b²) for the
//     equator's own semi-minor b = 21: the same ellipse that draws the equator predicts where the pole must be.
//     The old figure put the dot on the ring (136 = cy + r in the south version), 3.94 units outside its own true
//     projection, and the gate that held it there (|d - r| <= 1) is replaced by one that holds the pair to the pole
//     the drawing itself implies;
//   - each meridian leaves the near arc with a VERTICAL tangent (the projection's own departure angle, 90.00° off
//     horizontal, against the arc's 9.35° — which is why the right-angle marks are drawn along the two tangents and
//     read an 80.65° wedge, not a false 90°), so the pair are parallel where they start, which is the logo's claim;
//   - what is given up is a long constant separation. The mirrored pair hold 98.4% of their 52-unit separation 10
//     units up, 93.8% at 20, 86.2% at 30: the surface curves them together from the first unit, which is the whole
//     point of the figure, and the straight run that used to carry "parallel" is gone. They cross at 72° (2 × the
//     36.16° arrival), a wider opening than the compromise's 43°.
// `logo-geometry.mjs` now measures all three on the built page: the departure tangents, the separation
// profile against the table's own, and the drawn path against the analytic meridian.
//
// WHY THE DASH SURVIVES AT PHONE SIZE (the earlier reason for solid was wrong): `dash: '5 4'` is in viewBox
// units, and the smallest shipped box is the hero on a 320px viewport — box 276px, scale 1.15 — where a dash is
// 5.75 device px long with a 4.6px gap: four times the 1.5px floor that D119 sets for a stroke to have a
// measurable colour identity at all. `check:render` now asserts the declared dash ARRIVES (computed
// strokeDasharray, per shape), and `logo-geometry.mjs` measures the cue in painted pixels: the near
// arc's widest run near its apex is 49 units of unbroken line, the far arc's is one dash.
//
// WHAT WAS WRONG IN THE OLD DRAWING (drawn in apply 4h, shipped until 2026-11-02). Three of its six shapes were
// inventions, and the one idea that carries the metaphor was missing:
//   - the two lines were mirror-symmetric curves starting at the top corners, so they were converging from their
//     first pixel. Nothing in the figure read as PARALLEL, which is the whole surprise;
//   - a THIRD line ran straight down the middle into the meeting point (`M120 20 L120 128`). The source has no
//     such line; it is what made the figure read as an arrow / Y;
//   - the two accent segments were mirrored arcs (`M62 118 C…`, `M178 118 C…`), also not in the source;
//   - the equator — the reference line the two lines leave at right angles, the thing that ESTABLISHES that they
//     are parallel — was absent. Without it "parallel lines meeting" cannot be seen at all.
// The lesson ships with the fix: a logo derived from a source image has to be checked against the source image.
// "The owner approved the specimen" does not substitute — the operator ratified a drawing, not a reading of
// their figure. Asking for the vector (D94) is still worth doing, and `LOGO` below is still the one place it lands.
//
// WHY THIS FILE EXISTS (apply 4h, 2026-11-01). The logo is drawn in two places — the landing page's hero column
// (`src/components/HeroSection.astro`) and the share card (`scripts/make-social-share.mjs`, D118) — and the share
// card's pixel gate (`scripts/check-social-card.mjs`), which measures the meeting point's position in the JPEG,
// needs the same coordinates. Before this file, the path data was typed twice and the coordinates a third time,
// which is exactly how the palette drifted before `@theme` owned it: two renderings of one idea, no single
// source. So composer and verifier read one table (D118's rule, applied to geometry instead of colour). One table
// is also why this correction moved the hero, the card and both gates together.
//
// SEVENTH RULING: A LINE'S COLOUR IS ITS NAME (operator, 2026-11-24; D483). "Make the favicon of the website be
// that svg we created, which I'd like to call the logo. Before that, be sure the coloring is similar to John
// Byrne's 1847 Euclid styling, where it uses colors to indicate matching angles, lines, curves, or whatever
// patterns/styles he was using." The ask was PRICED, not applied (D316: colour is operator-ratified): grill round 21
// (`npm run round21`, `design/grill/round21/report.json`, five colourings x two grounds x three hero widths plus the
// share card's own document) and the operator chose row C — "(3. C), but also show me options for coloring faces of
// the shape also in the Byrne style." Byrne's 1847 device is that colour replaces LETTERS: the prose says "the
// squares of the blue and red lines", so a line's colour is its name, and Byrne names the colours as a
// non-ornamental teaching instrument ("we do not introduce colours for the purpose of entertainment… but to assist
// the mind", Byrne 1847, preface).
//
// What row C does to this file, and what it costs, stated rather than hidden:
//   - `LOGO_COLOURS` stops being keyed by ROLE and is keyed by SLOT (the eight drawn shapes, in paint order).
//     A role-keyed map CANNOT express row C: both meridians are the role `route`, and row C names them two
//     different colours. Round 9 priced the same wall and left it unpunched (design/grill/round9-palette.mjs:
//     "`route` -> a per-shape pair (a new role, or an array)").
//   - It gives the notation two colours that are ONE HUE AT TWO WEIGHTS. Round 21 measured the tightest gap
//     between the colours row C spends on paper as 0.00 deg (`accent` hue 35.7 against `accent-strong` hue 35.35)
//     @measured 2026-11-24 by npm run round21, `hues` in design/grill/round21/report.json), so the right-angle
//     logos say "same line, heavier" — which is Byrne's own terms read back at this palette. The incumbent row A
//     spent 3 colours 5.0 deg apart, so colour carried almost no information either way.
//   - It costs the logo its "these are the same kind of line" claim: the left meridian is the club's red and the
//     right is the calendar blue, and "parallel" is a statement about a PAIR. Round 21 printed the tension
//     (row C's own `reading` line) and the operator chose the row anyway.
//   - Every pair still clears the 3.0 graphic bar (D101), on both grounds, @measured 2026-11-24 by npm run
//     round21: paper ink 17.15, accent 5.77, path-calendar 4.90, accent-strong 8.17, path-mobilizon 5.09; on ink
//     band-text 16.43, accent-on-ink 5.69, path-calendar-on-ink 5.78, path-mobilizon-on-ink 5.77.
//
// COLOUR IS HERE NOW. It used to not be: which token a shape took depended on the ground it sat on and the role
// it meant — `accent` on paper (5.77) vs `accent-on-ink` on the band (5.69), because `accent` on ink is 2.97 and
// banned (DESIGN.md "Colour", D316); those token pairs are @measured 2026-11-14 by node design/grill/palette-remap.mjs.
// `role` is still what a shape MEANS (a ground could supply its own map for it, and `logo-geometry.mjs`
// still splits the figure into line / route / accent by it); `slot` is WHICH shape it is, and colour is now keyed
// by slot because Byrne names lines, not kinds. Each surface turns a token into whatever its renderer understands
// (a literal Tailwind class on the page — Tailwind's scanner reads raw source text, so a computed class name
// generates nothing — or `var(--color-…)` in the card document, which has no Tailwind).
//
// Every drawn logo clears the **3.0 graphic bar** (D101). `check:render` measures that on painted bytes, per
// shape, on the built page (D116) — see the `logos` probe in `design/grill/render-measure.js`.

export const LOGO = {
  vbW: 240,
  vbH: 150,
  // Order is paint order: the surface and its reference line sit under the routes, the routes under the logos
  // that explain them. `role` is not a colour, it is what the shape means, so a ground can supply its own map.
  // `slot` is WHICH shape it is, in that same paint order, and it is what `LOGO_COLOURS` is keyed by since the
  // seventh ruling (D483): Byrne names a line, so a colour has to address one shape rather than a kind.
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
    { slot: 'ring', role: 'sphere', tag: 'circle', cx: 120, cy: 78, r: 58, sw: 1.3 },
    // The equator's REAR half — the far side of the tilted great circle, drawn in dashes because the sphere
    // hides it from the viewer (operator ruling, third on this logo). `face` is the author's claim; the probe
    // checks it against the pixels, which is what catches the dash landing on the wrong arc (that would draw a
    // sphere with its near side hidden — an inside-out globe).
    // Two arcs of one ellipse centred on the sphere: semi-major = r horizontally (its ends land exactly on the
    // ring at cx ± r, which is what makes it the sphere's own circle rather than a decoration inside it) and
    // semi-minor 21 = 0.36r vertically, so it bows 21 units above and below the centre. A half-ellipse as one
    // cubic: controls at ±(4/3)b off the endpoints' height put the apex at exactly cy ∓ b (at t = 0.5 the cubic
    // sits 0.75 of the way from the endpoint height to the control height, and 0.75 × 28 = 21).
    { slot: 'rear', role: 'sphere', tag: 'path', d: 'M62 78 C62 50, 178 50, 178 78', sw: 1.3, face: 'rear', dash: '5 4' },
    // The NEAR half of the same ellipse: solid, because it is the part of the great circle between the viewer
    // and the sphere's centre. Same token, same weight — the two halves differ in continuity, not in colour, so
    // both keep clearing the 3.0 graphic bar (D101) and neither can drift into a tint.
    { slot: 'front', role: 'sphere', tag: 'path', d: 'M62 78 C62 106, 178 106, 178 78', sw: 1.3, face: 'front' },
    // The two lines. FOURTH RULING ON THIS LOGO (operator, 2026-11-23): "the lines from the equator to the south
    // pole [must] start from the bottom/close side of the equator line." They used to start on the FAR arc — the
    // dashed one, at (94,59) and (146,59) — and ran toward the viewer, crossing the near arc on the way to the
    // pole. That drew the pair on the hemisphere the sphere hides from the reader. They now start ON THE NEAR ARC,
    // at (94,97) and (146,97), and run the visible face: the whole figure is on the side a reader can see.
    // FIFTH RULING (operator, 2026-11-24) sends them UP that face to the NORTH pole, so the feet stay and the
    // pole moves: the source's "S pole — meet here" caption is no longer where the meeting point is.
    // SIXTH RULING (operator, 2026-11-24): each one is the sphere's own projected meridian, not an approximation
    // with a straight bit in it. One cubic per route — the quarter-ellipse fit of the orthographic projection of
    // the meridian through that foot. It leaves the near arc vertically (the projection's own departure angle),
    // bends continuously as the surface curves away, and arrives at the projected pole 36.16° off horizontal,
    // mirrored, so the pair CROSS at 72° rather than kissing. Every figure in that sentence is the probe's, not the
    // author's: `node logo-meridian-fit.mjs --exact` solves the projection off this file's own ring and
    // equator (semi-minor 21 -> axis 21.23° out of the screen plane), reports 0.009 units of geometric error for
    // the path below against the analytic curve, and prints the separation profile (52.00u at the foot, 51.17u 10
    // units up, 48.76u at 20, 44.84u at 30) — the pair hold 98.4% of their separation over the first 10 units, which
    // is how much "parallel" survives here. `npm run check:logo` re-measures the departure, the separation and the
    // arrival in painted pixels, and now measures the drawn path against the analytic meridian too, so "it looks
    // curved" is not a passing condition.
    // Each foot sits exactly on the near arc's ink: at x 94 and 146 the drawn arc cubic paints y = 97.0 (solved off
    // the path, not off the ellipse it approximates — the cubic's apex is 0.75 of its control offset, so reading the
    // ellipse's 96.8 would have left the join 0.2 units off the ink). The arc there is 9.35° off horizontal, so the
    // junction reads as a right angle (the far arc gave 9.3° the same way); the square logos below are drawn along
    // the two tangents rather than axis-aligned, so the notation does not claim an angle the drawing does not have.
    // `left` and `right` are two slots on purpose: since the seventh ruling (D483) they are two different
    // colours, which is exactly what a role-keyed colour map could not express.
    { slot: 'left', role: 'route', tag: 'path', d: 'M94 97 C94 67.14, 105.64 34.43, 120 23.94', sw: 1.4 },
    { slot: 'right', role: 'route', tag: 'path', d: 'M146 97 C146 67.14, 134.36 34.43, 120 23.94', sw: 1.4 },
    // The right-angle marks: the notation for "each of these leaves the equator at a right angle", which is the
    // construction that makes them parallel. In the source this is text (measured as two small text blobs where
    // the lines meet the equator); a logo that renders at 24×15px cannot carry text, and inventing a word would
    // break D92 (state only sourceable facts), so the smallest faithful encoding is the square-corner glyph. It
    // sits in the quadrant between the two arms, 6 units to a side. Gold because it is the reason the figure
    // means anything, not because it is decoration.
    // Moved with the lines (2026-11-23), and drawn along the two tangents instead of axis-aligned: the near arc's
    // tangent at x 94 is (0.987, 0.163), so an axis-aligned square would have sat in a 80.6° wedge claiming a 90°
    // one. These two arms follow the arc and the route, so the glyph says "the angle marked is this one" and the
    // projection's foreshortening stays visible rather than being papered over. Mirrored about x 120. Flipped with
    // the fifth ruling (2026-11-24): the wedge the square sits in is now between the route going UP and the arc
    // going right, which is the supplement — 99.4° rather than 80.6° — of the angle the south figure marked. Both
    // are foreshortings of the same right angle, and the glyph still logos the one actually drawn.
    { slot: 'angleL', role: 'accent', tag: 'path', d: 'M99.9 98 L99.9 92 L94 91', sw: 1.4 },
    { slot: 'angleR', role: 'accent', tag: 'path', d: 'M140.1 98 L140.1 92 L146 91', sw: 1.4 },
  ],
  // The filled point the two lines cross at — the logo's whole point, so the gates put a measurement band here
  // rather than trusting that the paths still converge. Since the sixth ruling (2026-11-24) it sits at the
  // PROJECTED pole, (120, 23.94): 54.06 units above the sphere's centre, which is sqrt(r² - b²) for the drawn
  // equator's own semi-minor b = 21 — the tilted axis stands 21.23° out of the screen plane, so the pole projects
  // inside the ring's silhouette rather than on top of it. The south figure put it on the ring (cy + r = 136,
  // 3.94 units outside its own true projection of 132.06); that convention goes with the approximation it came
  // from, and `check:logo` now derives the expected pole from the ellipse the logo itself draws.
  dot: { slot: 'dot', role: 'accent', tag: 'circle', cx: 120, cy: 23.94, r: 4 },
  meet: { x: 120, y: 23.94 },
};

// The eight drawn things, in paint order, named for what they are — the ONE home for this vocabulary. Round 21
// declared it twice (`SLOTS` in design/grill/round21-options.mjs and `SLOT_OF` in design/round21.mjs), which is how
// a table gets a stale copy: the round that prices a colouring and the gate that measures one must be reading the
// same names. Both import this now.
//   ring   the silhouette circle          rear   the far, dashed half of the equator
//   front  the near half                  left / right   the two meridians
//   angleL / angleR  the right-angle marks        dot    the meeting point at the pole
export const LOGO_SLOTS = ['ring', 'rear', 'front', 'left', 'right', 'angleL', 'angleR', 'dot'];

// Shapes a correctly-rendered logo contains. `check:render` compares this against the DOM it measures:
// an <svg> can lose children silently — measured on the share card, firefox painted the rule and the
// first logo but dropped every logo wrapped in a <span>, because SVG treats an unknown element's
// subtree as foreign content (D118 lesson 1). A count is the cheapest check that catches it.
export const LOGO_SHAPE_COUNT = LOGO.shapes.length + 1;   // + the filled meeting point

// The slot table and the shape table are one fact in two shapes, and both probes zip them against the painted
// <svg> in paint order. If a shape is added, renamed or dropped without its slot, that zip silently pairs each
// painted shape with the wrong declaration — which reads as "the logo is fine, the probe is loud", and is the
// class of defect D480 was about. So the table asserts itself here, where the build fails rather than the gate.
{
  const declared = [...LOGO.shapes.map((s) => s.slot), LOGO.dot.slot];
  if (declared.length !== LOGO_SLOTS.length)
    throw new Error(`logo: LOGO declares ${declared.length} drawn shapes but LOGO_SLOTS names ${LOGO_SLOTS.length} — a slot with no shape (or a shape with no slot) mis-zips every painted-shape-to-declaration check in logo-geometry.mjs, scripts/check-social-card.mjs and design/render-gate.mjs`);
  for (const [i, slot] of declared.entries())
    if (slot !== LOGO_SLOTS[i])
      throw new Error(`logo: shape #${i} carries slot "${slot}" but LOGO_SLOTS[${i}] is "${LOGO_SLOTS[i]}" — slots are declared in PAINT ORDER, and a slot out of order paints every later shape in the previous shape's colour`);
}

// slot -> token name (the `--color-<name>` in @theme) per ground. This is the ONLY place the logo's colour is
// decided: the hero reads it into literal Tailwind classes, `scripts/make-social-share.mjs` into `var(--color-…)`,
// `design/ratify-check.mjs` asserts the two agree, and grill round 21 prices a candidate against it.
//
// Row C of round 21, the operator's pick (seventh ruling, D483). Byrne's ink is red, yellow, blue and black on
// white; there is no legal yellow in this palette (round 21 solved the window: at hue 60-105 the palest colour
// clearing 3.0 on paper is ochre-brown, and at hue 60 with C >= 0.14 it falls inside the 0.05 same-colour bar
// against Amazon orange), so the primaries here are the club's red `accent`, the calendar blue `path-calendar`
// and the mobilizon green `path-mobilizon` on black `ink`.
//   paper: ring/rear/front ink (17.15) · left accent (5.77) · right path-calendar (4.90)
//          angleL/angleR accent-strong (8.17) · dot path-mobilizon (5.09)
//   ink:   ring/rear/front band-text (16.43) · left accent-on-ink (5.69) · right path-calendar-on-ink (5.78)
//          angleL/angleR accent-on-ink (5.69) · dot path-mobilizon-on-ink (5.77)
//          — every pair @measured 2026-11-24 by npm run round21 (design/grill/round21/report.json, `pairs`).
// The `-on-ink` twins are not decoration: `accent` on ink is 2.97 and banned (DESIGN.md "Colour", D316), and no
// colour between the two grounds can serve both (paper x ink ~= 13.5 demanded against the ground pair), which is
// why the map is keyed per ground at all.
//
// What is NOT used here any more, and why that is a fact worth naming: the surface stopped painting `rule` (3.66
// on paper, the lightest line the system has). Row C draws what Byrne draws — the GIVEN figure in black — so the
// sphere is `ink`. `rule` still travels elsewhere in the artifact (`inset-shadow-rule`, `decoration-rule`), so it
// is not an orphan token; `check:token-usage` is what would say so if it were.
// Typed as `Record<string, string>` per ground rather than as eight literal keys: every reader that paints from
// it (`HeroSection.astro`, `scripts/make-social-share.mjs`) looks a slot up from `LOGO.shapes[].slot`, which is a
// `string` in a `.mjs`, and a concrete eight-key object refuses that lookup with ts(7053). The looseness is a
// typing convenience only - the assertion below is what actually holds the table to the eight slots, and it runs
// at import, so the build fails before any gate sees a slot with no token.
/** @type {Record<'paper' | 'ink', Record<string, string>>} */
export const LOGO_COLOURS = {
  paper: { ring: 'ink', rear: 'ink', front: 'ink', left: 'accent', right: 'path-calendar', angleL: 'accent-strong', angleR: 'accent-strong', dot: 'path-mobilizon' },
  ink: { ring: 'band-text', rear: 'band-text', front: 'band-text', left: 'accent-on-ink', right: 'path-calendar-on-ink', angleL: 'accent-on-ink', angleR: 'accent-on-ink', dot: 'path-mobilizon-on-ink' },
};

// The colour map and the slot table are the same eight names. A slot with no token paints nothing, and a token for
// a slot that does not exist is a colour waiting for a shape that never arrives — either one shows up as a logo
// with a hole in it, so it is refused here, at import, rather than in a browser run.
for (const [ground, map] of Object.entries(LOGO_COLOURS)) {
  const missing = LOGO_SLOTS.filter((s) => !map[s]);
  const extra = Object.keys(map).filter((s) => !LOGO_SLOTS.includes(s));
  if (missing.length || extra.length)
    throw new Error(`logo: LOGO_COLOURS.${ground} is not keyed by LOGO_SLOTS — missing ${missing.join(',') || '(none)'}, not a slot ${extra.join(',') || '(none)'}. Slots: ${LOGO_SLOTS.join(', ')}`);
}
