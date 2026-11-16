// design/grill/plates-price.js — measure the horizon band's rungs, and price the alternative band rules.
// The band used to be `hidden lg:block` (three plates, desktop only); D329 (2026-11-15) ruled the rungs
// (3-up from 900, 2-up from 640, one per line below) and the park lifted; D347 (2026-11-15, round-4 §7.2)
// then cut the exhibition to ONE plate, which is why this probe re-anchors: it finds the band by the `data-slot`
// handle the page itself declares (`PS-5`, the same handle `check:space` ranks by) rather than by the section's
// `aria-label`, so a wording change to that label cannot silently turn every row into "no horizon band on this
// page" — measured 2026-11-15: with the singular label, the old selector printed that error at all four widths
// and priced nothing. Rows are mutated in the DOM only, never on disk, and the first row is whatever ships now.
(() => {
  const send = (p) => fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ ...p, done: true }) });
  const run = () => {
    const shelf = document.querySelector('[data-slot="PS-5"]');
    const sec = shelf && shelf.closest('section');
    if (!sec) { send({ error: 'no horizon band on this page' }); return; }
    const horizon = shelf;
    const plates = [...horizon.querySelectorAll('.horizon__plate')];
    // Each plate is put back where it was rather than appended, so a row that removes one cannot reorder the
    // shelf for the rows measured after it. A removed plate's next sibling is never another removed plate,
    // so the saved sibling is still in the tree when the undo runs.
    const snapshot = new Map(plates.map((p) => [p, p.nextSibling]));
    // Page height comes from the bottom of the body's own boxes, NOT from scrollHeight: the runner passes a
    // window taller than the page (see plates-price.mjs), and then scrollHeight is the WINDOW, not the page.
    // That window is deliberate: Firefox puts a vertical scrollbar on a page taller than its window, and that
    // scrollbar steals 12px of the column — measured 2026-11-15 on one dist, the leaf reads 346px inside a
    // 378px outer box at a 1400px-tall window but 358px inside a full 390px column at a window as tall as the
    // page, which is the width `check:space` reports. A probe whose column is 12px narrower than the gate's
    // cannot be read against the gate's ladder, so both now measure the same condition.
    const page = () => {
      let bottom = 0;
      const walk = (el) => {
        for (const child of el.children) {
          const r = child.getBoundingClientRect();
          if (r.height > 0) bottom = Math.max(bottom, r.bottom + window.scrollY);
          walk(child);
        }
      };
      walk(document.body);
      return Math.round(bottom);
    };
    const boxes = () => plates.map((p) => {
      const img = p.querySelector('img');
      const r = img ? img.getBoundingClientRect() : { width: 0, height: 0 };
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), painted: img && getComputedStyle(img).display !== 'none' && r.width > 0 };
    });
    const off = page();
    // The rows are what the operator is choosing between now, not what the old tree had: the operator's rulings letter
    // of 2026-11-16 (R2, D356) undid D351's cap deletion, so the shipped page carries ONE plate WITH D347's cap at
    // its own scan width. The variants priced against it are the band gone, the band without its leaf, D351's
    // full-bleed shape - the refused alternative, priced so the refusal is a number rather than a memory - and the
    // cap written inline again, which is the letter's third row "one plate, capped at intrinsic scan width" and is
    // the SAME page as row 1. The probe prints that pair deliberately: a differing pair would mean the cap the letter
    // asked for is not what binds, which is the defect this instrument exists to keep visible.
    // Every mutation is undone by name below, so a row cannot leak into the next one's baseline.
    // The cap's number lives here rather than being read off the shipped CSS on purpose: 698px is the 1910 Euler
    // leaf's own scan at the archive's widest rung (`/img/1024/`, probed 2026-11-03; `/img/1600/`, `/img/2048/` and
    // `/img/full/` answer 404). If the cap and the scan ever disagree, these two rows disagree, and the disagreement
    // is the finding.
    const states = [{ id: 'shipped (one plate, capped at its own scan)', apply: () => { /* as shipped */ } }];
    states.push({ id: 'band hidden', apply: () => { sec.classList.add('hidden'); } });
    states.push({ id: 'band empty (plate removed)', apply: () => { plates.forEach((p) => p.remove()); } });
    states.push({
      id: 'plate full-bleed on the column (D351, refused)',
      apply: () => { plates.forEach((p) => p.setAttribute('style', 'max-width: none')); },
    });
    states.push({
      id: 'one plate, capped at intrinsic scan width',
      apply: () => { plates.forEach((p) => p.setAttribute('style', 'max-width: 698px')); },
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
      plates.forEach((p) => { if (!p.parentNode) horizon.insertBefore(p, snapshot.get(p)); });
      sec.classList.remove('hidden');
      plates.forEach((p) => p.removeAttribute('style')); // the shipped figure declares no style attr, so removing one a row added is the undo
    }
    send({ vw: innerWidth, baseline: off, rows });
  };
  run();
})();
