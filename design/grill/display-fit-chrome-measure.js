// display-fit-chrome-measure.js — widths of the REAL strings in the chrome face at the display sizes.
// Run: node design/grill/page-measure.mjs design/grill/display-fit-chrome.html \
//        design/grill/display-fit-chrome-measure.js 1240 900 > design/fonts/display-fit-chrome.json
//
// The ratified display ramp has a measured cap rule ("Mathematical" measures 367.6px against 343px of
// content width at display-4) but that number came from a PT Serif specimen, and the strings that
// actually sit at display size on these pages are the club name and section labels, which render in
// Public Sans Variable at weight 700/800. Weight is not cosmetic here: the same string at 800 is
// measurably wider than at 400, so a cap decided in one face or one weight does not transfer.
(() => {
  // sizes are the @theme display steps as shipped (round 8 moved them: B raised the content ladder by 10%),
  // and `ratify-check` asserts this list equals `--text-display-*` in src/styles/global.css, because a
  // specimen that measures yesterday's sizes is how a cap rule quietly stops describing the site.
  const out = { done: false, sizes: [36.4, 43.7, 52.4, 62.9], weights: [700, 800], boxes: [343, 700], rows: [] };
  const probe = document.getElementById('probe');
  const strings = [
    'Minneapolis Math Book Club',
    'Minneapolis',
    'Why Join Our Math Book Club?',
    'Join Our Community',
    'We could not find that page',
  ];
  const face = "'Public Sans Variable', sans-serif";

  const fit = async (size, weight) => {
    await document.fonts.load(`${weight} ${size}px "Public Sans Variable"`, 'Minneapolis Math Book Club?');
    probe.style.fontFamily = face;
    probe.style.fontWeight = weight;
    probe.style.fontSize = `${size}px`;
    probe.style.lineHeight = 'normal';
  };

  // Ink depth, not em height: DESIGN.md's display rule is that each line box lands on the 4px grid AND
  // clears its own measured ink box, so the number that picks a leading is
  // ascent+descent of the real strings in the real face at the real weight (800 is what the title writes).
  const canvas = document.createElement('canvas').getContext('2d');
  const inkDepth = (size, weight) => {
    canvas.font = `${weight} ${size}px "Public Sans Variable"`;
    let ink = 0;
    for (const s of strings.concat(['Typographic', 'jqpyg'])) {
      const m = canvas.measureText(s);
      ink = Math.max(ink, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
    }
    return +ink.toFixed(1);
  };

  (async () => {
    for (const size of out.sizes) {
      for (const weight of out.weights) {
        await fit(size, weight);
        const row = { size, weight, ink: inkDepth(size, weight), strings: {} };
        for (const s of strings) {
          probe.textContent = s;
          probe.style.whiteSpace = 'nowrap';
          probe.style.display = 'inline-block';
          probe.style.width = 'auto';
          const nowrap = +probe.getBoundingClientRect().width.toFixed(1);
          const perWord = {};
          for (const word of s.split(' ')) {
            probe.textContent = word;
            perWord[word] = +probe.getBoundingClientRect().width.toFixed(1);
          }
          const wrapped = {};
          for (const box of out.boxes) {
            probe.textContent = s;
            probe.style.whiteSpace = 'normal';
            probe.style.display = 'block';
            probe.style.width = `${box}px`;
            const h = probe.getBoundingClientRect().height;
            const lh = parseFloat(getComputedStyle(probe).lineHeight) || size * 1.2;
            wrapped[box] = { lines: Math.max(1, Math.round(h / lh)) };
          }
          probe.style.whiteSpace = 'nowrap';
          row.strings[s] = { nowrap, longestWord: Math.max(...Object.values(perWord)), wrapped };
        }
        out.rows.push(row);
      }
    }
    out.fonts = [];
    document.fonts.forEach((f) => out.fonts.push(`${f.family} ${f.weight} ${f.status}`));
    // page-measure.mjs exits 0 only on a post with done: true; without this the runner prints TIMEOUT and
    // exits 1 even though every row arrived, which is how a green measurement looks like a broken probe.
    out.done = true;
    fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(out) }).catch(() => {});
  })();
})();
