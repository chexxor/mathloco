// Runs inside the browser (see .design/grill/page-measure.mjs) on the share-card document. It reports what
// the card page KNOWS about itself, which is the other half of the check: the JPEG gives painted bytes, this
// gives layout and authoring intent, and the two have to agree.
//
//   faces      - the three ratified faces, each actually loaded before the screenshot is taken. If this says
//                false, the card is being composed in a fallback face and the whole artifact is wrong.
//   ground     - the computed colour of the painted ground element, in author syntax.
//   runs       - every [data-band] box: its rect, face, size, weight, and its own computed colour.
//   painted    - what the browser's own colour conversion produces for each run's colour and for the ground,
//                as 8-bit sRGB bytes. This is the number the pixel check compares against, because a card
//                whose oklch is right and whose bytes are wrong is still a wrong card (D116).
//   mark       - the drawn mark (src/lib/brand-mark.mjs): how many shapes the document actually contains,
//                each shape's stroke/fill in author syntax and the bytes the browser paints for them, and
//                the box it occupies. Counted per shape because an <svg> can lose children silently
//                (D118 lesson 1) and a box-level measure cannot see that.
//   canvas     - the size of the drawing surface firefox is about to screenshot.
//
// Not a gate on its own: the gate reads the JPEG (scripts/check-social-card.mjs). This half exists so a
// failure can say whether the page asked for the wrong thing or the pixels came out wrong.
const W = 1200, H = 630;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The colour canvas paints for an author-syntax colour, read back off the canvas. Canvas2D is the same
// colour engine as the page, so this is the browser's own answer to "what bytes does this token become".
function paintBytes(color) {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 1;
  const g2 = c.getContext('2d');
  g2.fillStyle = '#000000';
  g2.fillRect(0, 0, 1, 1);
  g2.fillStyle = color;
  g2.fillRect(0, 0, 1, 1);
  const d = g2.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

async function report() {
  const faces = {};
  for (const spec of ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"']) {
    try { faces[spec] = (await document.fonts.load(spec)).length > 0; } catch { faces[spec] = false; }
  }

  const groundEl = document.querySelector('[data-ground]');
  const groundColor = groundEl ? getComputedStyle(groundEl).backgroundColor : null;

  const runs = [...document.querySelectorAll('[data-band]')].map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      band: el.dataset.band,
      x0: Math.round(r.left), x1: Math.round(r.right),
      top: Math.round(r.top), height: Math.round(r.height),
      width: Math.round(r.width), sizeInt: parseFloat(cs.fontSize) || 0,
      face: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      size: cs.fontSize, weight: cs.fontWeight,
      color: cs.color,
    };
  });

  const painted = { ground: groundColor ? paintBytes(groundColor) : null };
  for (const el of document.querySelectorAll('[data-band]')) {
    const cs = getComputedStyle(el);
    painted[el.dataset.band] = paintBytes(cs.color);
  }

  // The drawn mark: is the WHOLE mark in the document, and what colours did its shapes ask for?
  // Counted because an <svg> can lose children silently - measured on this card, firefox painted the
  // rule and the first path but dropped every path wrapped in a <span>, because SVG treats an unknown
  // element's subtree as foreign content (D118 lesson 1). A box-level ink measure would still pass that:
  // one painted path is enough ink in the box. The gate compares `count` against MARK_SHAPE_COUNT, the
  // table src/components/HeroSection.astro draws from, so hero and card are checked against one shape.
  const markEl = document.querySelector('svg[data-mark]');
  const shapes = markEl
    ? [...markEl.querySelectorAll('circle,path,rect,line,polygon,polyline,ellipse')].map((el) => {
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          stroke: cs.stroke, fill: cs.fill,
          strokeWidth: parseFloat(cs.strokeWidth) || 0,
          paintedStroke: cs.stroke && cs.stroke !== 'none' ? paintBytes(cs.stroke) : null,
          paintedFill: cs.fill && cs.fill !== 'none' ? paintBytes(cs.fill) : null,
        };
      })
    : null;
  const mark = markEl ? {
    name: markEl.dataset.mark,
    viewBox: (markEl.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number),
    box: (() => { const r = markEl.getBoundingClientRect(); return { x0: Math.round(r.left), x1: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; })(),
    count: shapes.length,
    shapes,
  } : null;

  return {
    done: true,
    faces,
    ground: groundColor,
    canvas: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    runs,
    painted,
    mark,
  };
}

// Self-invoking, like .design/grill/render-measure.js: page-measure.mjs only sets the endpoint and loads
// this file, so a measure script that defines a function and never calls it produces a silent timeout.
(async () => {
  const post = (obj) => {
    const ep = window.__MEASURE_ENDPOINT;
    if (!ep) { console.log(JSON.stringify(obj)); return; }
    fetch(ep, { method: 'POST', mode: 'no-cors', body: JSON.stringify(obj) }).catch(() => {});
  };
  // document.fonts.ready alone is not enough (it resolves before the faces are even requested on this rig),
  // and the variable face's 800 instance registers a beat after the 600 one - hence the extra check + beat.
  const wantFaces = ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"'];
  const settle = () => Promise.all(wantFaces.map((f) => document.fonts.load(f).then(() => {}, () => {})))
    .then(() => document.fonts.ready).then(() => {}, () => {});
  await Promise.race([settle(), new Promise((r) => setTimeout(r, 8000))]);
  if (!document.fonts.check('800 16px "Public Sans Variable"')) await sleep(200);
  try { post(await report()); } catch (e) { post({ error: String(e && e.stack || e) }); }
})();
