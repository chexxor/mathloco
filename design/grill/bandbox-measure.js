// bandbox-measure.js — the exit band's BOX and the two legal sentences inside it, in px and line boxes.
// Injected into a BUILT page by design/communication-bandbox.mjs (same harness contract as the render
// gate: faces before numbers, one POST to window.__MEASURE_ENDPOINT).
//
// The band is standing chrome on EVERY emitted page (D307), so its cost is what a visitor pays on each
// page they open: bytes come from design/communication-price.mjs, this brings the box — how wide the band
// is, how tall, and how many line boxes the two legal sentences spend inside it.
(() => {
  const T0 = Date.now();
  const out = { done: false, errors: [], vw: innerWidth, elapsedMs: 0, facesLoaded: false, band: null, legal: null };
  let sent = false;
  const send = () => {
    if (sent) return Promise.resolve();
    sent = true;
    return fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(out) });
  };
  window.addEventListener('error', (e) => { out.errors.push('onerror: ' + e.message); out.done = true; send(); });

  const px = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y + (window.scrollY || 0)), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const lineBoxes = (el) => {
    const cs = getComputedStyle(el);
    let lh = parseFloat(cs.lineHeight);
    if (Number.isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.2;
    return { lineHeight: Math.round(lh * 100) / 100, boxes: Math.round(el.getBoundingClientRect().height / lh), fontSize: cs.fontSize };
  };

  (async () => {
    try {
      await document.fonts.ready;
      out.facesLoaded = true;
      const footer = document.querySelector('footer');
      const ps = footer ? [...footer.querySelectorAll('p')] : [];
      const legal = ps.filter((el) => /trademarks|not sponsored/i.test(el.textContent));
      out.band = footer ? { ...px(footer), links: footer.querySelectorAll('a').length, ...lineBoxes(footer) } : null;
      out.legal = legal.map((el) => ({ ...px(el), ...lineBoxes(el), text: el.textContent.trim() }));
      out.legalBoxes = legal.reduce((a, el) => a + Math.round(el.getBoundingClientRect().height / (parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2)), 0);
    } catch (e) {
      out.errors.push('measure threw ' + e.message);
    }
    out.elapsedMs = Date.now() - T0;
    out.done = true;
    return send();
  })();
})();
