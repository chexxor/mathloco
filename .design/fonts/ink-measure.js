// ink-measure.js - how much black a rendered string actually lays down, per weight.
// Why: "only weight 400 ships, so the 30 weight writes are synthesised" needs a number. Advance width does
// NOT detect synthetic bold (faux bold keeps the metrics and thickens strokes), so measure ink coverage.
const SETS = [
  { label: 'PT Serif (only 400 is loaded today)', face: '"PT Serif"', weights: [400, 500, 600, 700, 800] },
  { label: 'PT Sans (400 + 700 loaded)', face: '"PT Sans"', weights: [400, 500, 600, 700, 800] },
  { label: 'Public Sans variable (100-900, one file)', face: '"PSVar"', weights: [400, 500, 600, 700, 800] },
];
const TEXT = 'Handgloves 0123456789';
function ink(weight, face) {
  const c = document.createElement('canvas'); c.width = 900; c.height = 140;
  const x = c.getContext('2d');
  x.textBaseline = 'top'; x.fillStyle = '#000';
  x.font = `${weight} 100px ${face}`;
  x.fillText(TEXT, 0, 10);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let on = 0, total = 0;
  for (let i = 3; i < d.length; i += 4) { total++; if (d[i] > 128) on++; }
  return { weight, ink: on / total, w: Math.round(x.measureText(TEXT).width) };
}
(async () => {
  for (const s of SETS) for (const w of s.weights) { try { await document.fonts.load(`${w} 100px ${s.face.replace(/"/g, '')}`); } catch (e) {} }
  const out = SETS.map((s) => ({ label: s.label, runs: s.weights.map((w) => ink(w, s.face)) }));
  fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ out, done: true }) });
})();
