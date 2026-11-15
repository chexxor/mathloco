// design/grill/plates-price.js — measure the horizon band's rungs, and price the alternative band rules.
// The band used to be `hidden lg:block` (three plates, desktop only); D329 (2026-11-15) ruled the rungs
// (3-up from 900, 2-up from 640, one per line below) and the park lifted. Rows are mutated in the DOM only,
// never on disk, and the first row is whatever the tree ships now.
(() => {
  const send = (p) => fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ ...p, done: true }) });
  const run = () => {
    const sec = document.querySelector('section[aria-label="Plates from public-domain mathematics books"]');
    if (!sec) { send({ error: 'no horizon band on this page' }); return; }
    const horizon = sec.querySelector('.horizon');
    const plates = [...horizon.querySelectorAll('.horizon__plate')];
    const page = () => document.documentElement.scrollHeight;
    const boxes = () => plates.map((p) => {
      const img = p.querySelector('img');
      const r = img ? img.getBoundingClientRect() : { width: 0, height: 0 };
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), painted: img && getComputedStyle(img).display !== 'none' && r.width > 0 };
    });
    const off = page();
    const states = [{ id: 'shipped (3-up >=900, 2-up >=640, 1-up below)', apply: () => { /* as shipped */ } }];
    states.push({
      id: 'hidden below lg (what round 14 shipped)',
      apply: () => { sec.classList.add('hidden'); },
    });
    states.push({
      id: 'two plates (third removed)',
      apply: () => { sec.classList.remove('hidden'); sec.classList.add('block'); plates[2].remove(); },
    });
    states.push({
      id: 'one plate (two removed)',
      apply: () => { sec.classList.remove('hidden'); sec.classList.add('block'); plates[1].remove(); plates[2].remove(); },
    });
    const rows = [];
    for (const s of states) {
      s.apply();
      const b = boxes();
      rows.push({
        id: s.id,
        page: page(),
        delta: page() - off,
        band: +sec.getBoundingClientRect().height.toFixed(1),
        plates: b,
        paintedArea: b.reduce((sum, x) => sum + x.w * x.h, 0),
      });
      plates.forEach((p) => { if (!p.parentNode) horizon.appendChild(p); });
      sec.classList.remove('hidden');
    }
    send({ vw: innerWidth, baseline: off, rows });
  };
  run();
})();
