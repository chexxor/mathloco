// display-ink-measure.js - the real ink depth at each display size, checked against the 4px-grid line ladder.
const CASES = [[33.2, 36], [39.8, 44], [47.8, 52], [57.3, 60], [57.3, 57.3 * 1.05], [47.8, 47.8], [57.3, 57.3 * 0.98]];
(async () => {
  await document.fonts.load('700 60px "PT Serif"');
  const c = document.createElement('canvas').getContext('2d');
  const out = CASES.map(([size, lead]) => {
    c.font = `700 ${size}px "PT Serif"`;
    const m = c.measureText('Typographic');
    const ink = Math.round((m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) * 10) / 10;
    return { size, leadingPx: Math.round(lead * 10) / 10, ratio: Math.round((lead / size) * 1000) / 1000, inkPx: ink, clearsBy: Math.round((lead - ink) * 10) / 10 };
  });
  fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ out, done: true }) });
})();
