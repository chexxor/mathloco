// metrics-measure.js - in-browser font metrics for the faces the type-family ruling is choosing between.
// Nothing here is remembered from a font catalogue: x-height, cap height, whether the default figures are
// already tabular, whether tnum exists, and how many pixels each face costs in a nav row are all measured
// off the same woff2 files a self-hosted build would ship.
//
// Two traps, both measured:
//   - canvas measureText does NOT trigger a webfont load; it silently falls back to the default face, which
//     makes every family report identical metrics. document.fonts.load() first, and check() afterwards.
//   - document.fonts.check() is false for a face that no rendered text has requested yet.
const FACES = [
  ['PT Serif', 400], ['PT Serif', 700],
  ['PT Sans', 400], ['PT Sans', 700],
  ['Public Sans', 400], ['Public Sans', 700],
  ['Source Sans 3', 400], ['Source Sans 3', 700],
  ['IBM Plex Sans', 400], ['IBM Plex Sans', 700],
  ['Inter', 400], ['Inter', 700],
  ['PT Mono', 400], ['IBM Plex Mono', 400], ['JetBrains Mono', 400], ['Space Mono', 400],
  ['PT Sans Narrow', 400],
  ['system-ui', 400], ['ui-monospace', 400], ['Georgia', 400],
];

const NAV = 'Schedule · Events · Interests · About';
const BODY = 'We read one paper and take it apart until someone finds a second route to the result.';

function send(o) { return fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(o) }); }

function span(family, weight, extra) {
  const s = document.createElement('span');
  s.className = 'probe';
  s.style.fontFamily = '"' + family + '"';
  s.style.fontWeight = weight;
  s.style.fontSize = '100px';
  if (extra) s.style.cssText += extra;
  document.body.appendChild(s);
  return s;
}

function widthOf(family, weight, text, extra) {
  const s = span(family, weight, extra);
  s.textContent = text;
  const w = s.getBoundingClientRect().width / 100; // in ems of the 100px font
  s.remove();
  return Math.round(w * 1000) / 1000;
}

function heights(family, weight) {
  const c = document.createElement('canvas').getContext('2d');
  c.font = `${weight} 100px \"${family}\"`;
  const x = c.measureText('x');
  const H = c.measureText('H');
  return {
    xHeight: Math.round(x.actualBoundingBoxAscent + x.actualBoundingBoxDescent),
    capHeight: Math.round(H.actualBoundingBoxAscent + H.actualBoundingBoxDescent),
    digitAdv: Math.round(c.measureText('0').width),
    emAdv: Math.round(c.measureText('M').width),
    ascent: Math.round(x.fontBoundingBoxAscent ?? -1),
    descent: Math.round(x.fontBoundingBoxDescent ?? -1),
  };
}

(async () => {
  const loaded = {};
  for (const [family, weight] of FACES) {
    try {
      const faces = await document.fonts.load(`${weight} 100px "${family}"`, '0123456789MxH');
      loaded[family + ' ' + weight] = faces.length;
    } catch (e) { loaded[family + ' ' + weight] = 'err ' + e; }
  }

  const out = [];
  for (const [family, weight] of FACES) {
    const p1111 = widthOf(family, weight, '1111');
    const p8888 = widthOf(family, weight, '8888');
    const t1111 = widthOf(family, weight, '1111', 'font-variant-numeric: tabular-nums;');
    const t8888 = widthOf(family, weight, '8888', 'font-variant-numeric: tabular-nums;');
    out.push({
      family, weight,
      matchedFaces: loaded[family + ' ' + weight],
      checkNow: document.fonts.check(`${weight} 100px "${family}"`),
      ...heights(family, weight),
      digitsDefaultTabular: Math.abs(p1111 - p8888) < 0.002,
      tnumChanges: Math.abs(t1111 - p1111) > 0.002 || Math.abs(t8888 - p8888) > 0.002,
      navPxAt14: Math.round(widthOf(family, weight, NAV) * 14 * 10) / 10,
      bodyPxAt16: Math.round(widthOf(family, weight, BODY) * 16 * 10) / 10,
      chEm: widthOf(family, weight, '0'),
    });
  }
  send({ ua: navigator.userAgent, faces: out, done: true });
})().catch((e) => send({ error: String(e && e.stack || e), done: true }));
