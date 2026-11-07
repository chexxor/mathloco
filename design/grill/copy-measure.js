// copy-measure.js — the browser half of design/round16.mjs (the naming/voice round).
//
// One post, like every probe in design/grill/ (harness contract rule 2 in design/README.md):
//   fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(out) })
// Omitting `method:'POST'` sends a bodyless request and the run dies as TIMEOUT: the page never posted.
//
// What this measures, and why those numbers: a naming decision is a string decision, and a string's cost on a
// page is (a) how many line boxes it fills at each width and (b) how much document those line boxes add. Both
// come from the page's own settled layout, not from character counts — "Minneapolis Math Book Club" and
// "Minneapolis Math Club" are 5 characters apart and can be a whole line box apart at 320.
//
//   identity column  - the hero column that holds locator + h1 + lede: the block a name lives in
//   h1 lines         - line boxes the h1 actually lays out, at this width, in the shipped face
//   locator lines    - same for the eyebrow
//   band lede lines  - the compact schedule band's lede, which is the other place the club describes itself
//
// Line boxes are counted from Range client rects grouped by top, not by dividing width by a font size: an h1 with
// a forced <br> and an nbsp is exactly the case where arithmetic disagrees with what the browser laid out.
//
// Settle pattern copied from whitespace-measure.js (harness contract rule 1): `document.fonts.ready` resolves
// while faces are still mid-fetch, and a probe that measures fallback heights is worse than one that fails.
// The faces are what make a name wrap, so a fallback-stack wrap here would be a number about the wrong page.
(() => {
  const T0 = Date.now();
  const out = { done: false, errors: [], vw: innerWidth, elapsedMs: 0, facesLoaded: false, doc: {}, blocks: [] };
  let sent = false;
  const send = () => {
    if (sent) return Promise.resolve();
    sent = true;
    return fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(out) });
  };
  window.addEventListener('error', (e) => {
    out.errors.push('onerror: ' + e.message + ' @' + e.lineno);
    out.done = true;
    send();
  });

  const box = (el) => {
    const r = el.getBoundingClientRect();
    const s = window.scrollY || window.pageYOffset || 0;
    return { x: +r.x.toFixed(1), y: +(r.y + s).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };

  /** Line boxes an element's text actually lays out: client rects, merged by top within half a line height. */
  const lines = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const rows = [];
    for (const c of r.getClientRects()) {
      if (c.width < 1 || c.height < 1) continue; // <br>, &nbsp; and inline boundaries emit empty rects
      const hit = rows.find((t) => Math.abs(t.y - c.y) < Math.max(c.height, t.h) * 0.5);
      if (hit) { hit.h = Math.max(hit.h, c.height); hit.x = Math.min(hit.x, c.x); hit.right = Math.max(hit.right, c.x + c.width); }
      else rows.push({ y: c.y, h: c.height, x: c.x, right: c.x + c.width });
    }
    const ink = rows.length ? Math.max(...rows.map((t) => t.right - t.x)) : 0;
    return { count: rows.length, inkW: +ink.toFixed(1), lineHeight: rows.length ? +(rows.reduce((a, t) => a + t.h, 0) / rows.length).toFixed(1) : 0 };
  };

  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);

  // The ratified faces, by name, kicked individually - the same list as whitespace-measure.js and
  // render-measure.js, so this probe settles on the same page those gates measure.
  const wantFaces = ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"'];
  const wantFamilies = ['PT Serif', 'Public Sans Variable'];
  const faceStatus = () => [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`);
  const settled = (rows) => wantFamilies.every((fam) => rows.some((r) => r.startsWith(`${fam} `) && /loaded$/.test(r)));
  const kick = () => Promise.all(wantFaces.map((f) => document.fonts.load(f).then(() => {}, () => {})));
  const decodeImages = () => {
    for (const im of document.images) { try { if (im.loading === 'lazy') im.loading = 'eager'; } catch {} }
    return Promise.all([...document.images].map((im) => (im.decode ? im.decode() : Promise.resolve()).then(() => {}, () => {})));
  };

  const scan = () => {
    out.doc = { scrollHeight: document.documentElement.scrollHeight, bodyHeight: document.body.scrollHeight };
    const h1 = document.querySelector('main h1');
    if (!h1) { out.errors.push('no main h1 on the page — the probe is describing the wrong page'); return; }
    const eyebrow = h1.previousElementSibling ? h1.previousElementSibling.querySelector('span') : null;
    const column = h1.parentElement;
    const band = document.querySelector('section[aria-labelledby="when-we-meet"] p.max-w-measure');
    const footerName = [...document.querySelectorAll('footer a')].find((a) => /home$/.test(a.getAttribute('aria-label') || ''));
    const push = (where, el, extra = {}) => {
      if (!el) { out.errors.push(`no element for ${where}`); return; }
      const cs = getComputedStyle(el);
      // The width the text is laying out inside. For an inline element (`span`) computed width is `auto`, so the
      // measure falls back to the nearest block ancestor - the column the line actually wraps in.
      let availW = parseFloat(cs.width);
      if (!Number.isFinite(availW) || availW <= 0) availW = parseFloat(getComputedStyle(el.parentElement).width);
      out.blocks.push({
        where, box: box(el), text: text(el), lines: lines(el),
        fontSize: cs.fontSize, lineHeight: cs.lineHeight,
        availW: Number.isFinite(availW) ? +availW.toFixed(1) : null,
        ...extra,
      });
    };
    push('identity', column);
    push('locator', eyebrow);
    push('h1', h1);
    push('heroLede', h1.parentElement.querySelector('p'));
    push('bandLede', band);
    push('footerName', footerName);
  };

  const report = (rows) => {
    out.facesLoaded = settled(rows);
    out.elapsedMs = Date.now() - T0;
    out.done = true;
    return send();
  };

  // No polling loop. Measured on this page: a probe that waits on `setTimeout` ticks never posts at all -
  // firefox's `--screenshot` run ends the page once it has painted, and a timer scheduled after that is dead,
  // while font-load promises and `fonts.ready` resolve inside the loading pipeline and always make it. So this
  // is `render-measure.js`'s shape exactly: race the settle against a deadline, then measure in the same turn.
  const settle = () => kick().then(() => document.fonts.ready).then(() => {}, () => {}).then(decodeImages);
  Promise.race([settle(), new Promise((r) => setTimeout(r, 8000))]).then(
    () => {
      const rows = faceStatus();
      if (!settled(rows)) out.errors.push(`the ratified faces were not loaded at measure time: ${rows.join(', ')}`);
      scan();
      report(rows);
    },
    () => { out.errors.push('the settle promise rejected before the deadline'); report(faceStatus()); },
  );
})();
