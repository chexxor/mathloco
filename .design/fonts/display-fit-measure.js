// display-fit-measure.js - can the top of the ramp survive a narrow viewport with the club's real words?
// The largest display step is only usable if the longest word in a real title fits the content width.
const WORDS = ['Parallel', 'Mathematical', 'Quantum', 'Minneapolis', 'Bimonthly', 'Cryptography', 'four'];
const SIZES = [33.2, 39.8, 47.8, 57.3];
const WIDTHS = [288, 343, 700]; // content px at 320 (16px pad), 375 (16px pad), and a narrow desktop column
(async () => {
  await document.fonts.load('700 100px "PT Serif"');
  const c = document.createElement('canvas').getContext('2d');
  const out = [];
  for (const s of SIZES) {
    c.font = `700 ${s}px "PT Serif"`;
    const row = { size: s, leadingAt1_05: Math.round(s * 1.05 * 10) / 10, words: {} };
    for (const w of WORDS) {
      const wide = Math.round(c.measureText(w).width * 10) / 10;
      row.words[w] = { px: wide, fits: {} };
      for (const wd of WIDTHS) row.words[w].fits[wd] = wide <= wd;
    }
    out.push(row);
  }
  fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ out, done: true }) });
})();
