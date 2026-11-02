// The club's mark: several routes, different approaches, one meeting point.
//
// WHY THIS FILE EXISTS (apply 4h, 2026-11-01). The mark is drawn in two places — the landing
// page's hero column (`src/components/HeroSection.astro`) and the share card
// (`scripts/make-social-share.mjs`, D118) — and the share card's pixel gate
// (`scripts/check-social-card.mjs`), which measures the meeting point's position in the JPEG, needs
// the same coordinates. Before this file, the path data was typed twice and the coordinates a third
// time, which is exactly how the palette drifted before `@theme` owned it: two renderings of one
// idea, no single source. So composer and verifier read one table (D118's rule, applied to geometry
// instead of colour).
//
// WHERE THE GEOMETRY COMES FROM. It is derived from the operator's own spherical-geometry diagram —
// the club's "S pole — meet here" event image, measured in D86 (90% of its pixels below L 0.30, 93%
// cool-hue; two lines taking different routes and meeting at one labelled point) and attributed in
// D94 ("the sphere diagram is made by the operator"), so deriving from it is licensed by its owner.
// The ratification of this shape happened in the round-4 specimen (`design/grill/round-4.html`,
// lines 178-189), which is where these viewBox units were drawn and approved; the share card shipped
// from it in apply 4g. The operator's source artwork has still not been handed over — asking for the
// vector is still worth doing (D94), and when it arrives, this file is the one place to change.
//
// WHAT IS NOT HERE: colour. Which token a role takes depends on the ground it sits on — `gold` on
// paper (4.82) vs `gold-on-ink` on the band (5.80), because `gold` on ink is 2.50 and banned
// (DESIGN.md "Colour"). The role->token maps are `MARK_COLOURS` below; each surface turns a token
// into whatever its renderer understands (a Tailwind class on the page, `var(--color-…)` in the card
// document, which has no Tailwind).
//
// Every drawn mark clears the **3.0 graphic bar** (D101). `check:render` measures that on painted
// bytes, per shape, on the built page (D116) — see the `marks` probe in `design/grill/render-measure.js`.

export const MARK = {
  vbW: 240,
  vbH: 150,
  // Order is paint order: the sphere sits under the routes, the routes under the meeting point.
  // `role` is not a colour, it is what the shape means, so a ground can supply its own colour map.
  shapes: [
    // sw 1.3, not 0.9 (round 8, operator ruling M-B, 2026-11-02). Measured, not tuned by eye: at the
    // hero's phone box (276px, scale 1.15) a 0.9-unit stroke lands at 1.03 device px and its pixels never
    // clear the 3.0 graphic bar, so the ring reads as absent at exactly the width the club's flyer-sized
    // audience sees. Painted pixels at/over 3.0 inside the drawn box: 890 at 0.9u -> 1070 at 1.3u (276px
    // box), 1722 -> 2038 at the 372px desktop box; ink share of the box moves 4.09% -> 4.53%, so the mark
    // does not fill up. Every ratio check:render compares is untouched. Evidence:
    // design/grill/round8/report.json; the candidates are in design/grill/round8-ramps.mjs.
    { role: 'sphere', tag: 'circle', cx: 120, cy: 78, r: 58, sw: 1.3 },
    { role: 'route', tag: 'path', d: 'M62 34 C 96 62, 118 96, 120 128', sw: 1.4 },
    { role: 'route', tag: 'path', d: 'M178 34 C 146 62, 124 96, 120 128', sw: 1.4 },
    { role: 'route', tag: 'path', d: 'M120 20 L 120 128', sw: 1.4 },
    { role: 'accent', tag: 'path', d: 'M62 118 C 88 118, 104 126, 120 128', sw: 1.6 },
    { role: 'accent', tag: 'path', d: 'M178 118 C 152 118, 136 126, 120 128', sw: 1.6 },
  ],
  // the filled point every route arrives at — the mark's whole point, so the gates put a measurement
  // band here rather than trusting that the paths still converge
  dot: { role: 'accent', tag: 'circle', cx: 120, cy: 128, r: 4.5 },
  meet: { x: 120, y: 128 },
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
