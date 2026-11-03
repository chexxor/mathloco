// whitespace-measure.js — the browser half of design/whitespace-survey.mjs.
//
// One post, like every other probe in design/grill/: the harness (design/grill/page-measure.mjs) waits for
// a single JSON body posted to window.__MEASURE_ENDPOINT. It must be
//   fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(...) })
// — `{ method: 'no-cors' }` sends a bodyless request and the run dies as `RAW (not JSON):` + TIMEOUT.
//
// What it reports, and why those numbers and not others: "the landing page is mostly whitespace" is a claim
// about two different things with two different fixes, so both get measured:
//
//   how much of the page is PAINTED at all  -> the pixel half (node side) reads that off the shot;
//   what there is to paint with             -> this half: each top-level surface's box, ground colour, how
//                                             many characters of real copy it carries, and what media sits
//                                             in it. A 850px section holding 90 characters is a different
//                                             problem from an 850px section that is full of copy.
//
// Settle pattern copied from line-length-measure.js, deliberately: `document.fonts.ready` resolves while
// faces are still mid-fetch, and a probe that measures fallback heights is worse than one that fails (D127).
// Kick each ratified face by name, POLL the FontFace statuses, and report `facesLoaded` so the driver can
// refuse the numbers. Note this probe does NOT wait on requestAnimationFrame: in `--screenshot` mode those
// callbacks can be throttled away, and the first version of this file hung there and posted nothing at 390.
(() => {
  const T0 = Date.now();
  const out = { done: false, errors: [], vw: innerWidth, elapsedMs: 0, facesLoaded: false, doc: {}, fixed: [], surfaces: [], media: [], regions: [], slots: [], text: [], fonts: [] };
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

  const rgbOf = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(String(s || ''));
    if (!m) return null;
    const p = m[1].split(/[\s,\/]+/).map(Number);
    return [p[0], p[1], p[2]];
  };
  // Box keys are x/y/w/h and nothing in a pushed record may reuse them: an earlier version pushed a heading
  // count under `h` after spreading the box, and every section's height silently became 0, 1, 7, 2, 0.
  // position:fixed rects are VIEWPORT-relative, so one in a page-absolute walk invents an empty run (or hides
  // a real one). They are excluded here and the exclusion is reported, because a silent filter is how a
  // measurement starts lying. There are none on this page today; the count proves it rather than assuming it.
  const isFixed = (el) => getComputedStyle(el).position === 'fixed';

  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +(r.y + window.scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };

  const scan = () => {
    out.doc.scrollHeight = document.documentElement.scrollHeight;
    out.doc.bodyBg = getComputedStyle(document.body).backgroundColor;
    out.doc.bodyFg = getComputedStyle(document.body).color;

    out.fixed = [...document.querySelectorAll('body *')].filter(isFixed)
      .map((el) => (el.getAttribute('id') || el.tagName.toLowerCase()).slice(0, 24));

    for (const el of document.body.children) {
      const b = box(el);
      if (b.h < 1 || isFixed(el)) continue;
      const cs = getComputedStyle(el);
      out.surfaces.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 60),
        ...b,
        bg: cs.backgroundColor,
        bgBytes: rgbOf(cs.backgroundColor),
        padTop: cs.paddingTop,
        padBottom: cs.paddingBottom,
        // Rhythm needs the margin too: on this page the big gaps between surfaces are the HERO's own
        // margins (md:mt-32 / md:mb-24), not section padding, and a rhythm proposal that changes the wrong
        // one of the two is editing the wrong rule.
        padLeft: cs.paddingLeft, padRight: cs.paddingRight,
        marginTop: cs.marginTop, marginBottom: cs.marginBottom,
        chars: (el.textContent || '').replace(/\s+/g, ' ').trim().length,
        p: el.querySelectorAll('p').length,
        li: el.querySelectorAll('li').length,
        heads: el.querySelectorAll('h1,h2,h3,h4').length,
        a: el.querySelectorAll('a').length,
        svg: el.querySelectorAll('svg').length,
        img: el.querySelectorAll('img').length,
      });
    }

    // Every raster/drawing, with the box it occupies and whether it actually loaded: this is where "the
    // loudest colour on the page belongs to another company" becomes a footprint, where a lazy image that
    // shifts the layout shows up (a loaded-vs-attribute size mismatch is the shift), and where a future
    // photo slot gets its measured size.
    for (const el of document.querySelectorAll('img, svg')) {
      const b = box(el);
      if (b.h < 1 || b.w < 1) continue;
      const rec = { tag: el.tagName.toLowerCase(), ...b, area: +(b.w * b.h).toFixed(0) };
      if (el.tagName.toLowerCase() === 'img') {
        rec.alt = (el.getAttribute('alt') || '').slice(0, 60);
        rec.src = (el.getAttribute('src') || '').split('/').pop().slice(0, 40);
        rec.natW = el.naturalWidth; rec.natH = el.naturalHeight;
        rec.attrW = el.getAttribute('width'); rec.attrH = el.getAttribute('height');
        rec.complete = el.complete;
        rec.loading = el.getAttribute('loading');
      } else {
        rec.cls = (el.getAttribute('class') || '').slice(0, 50);
        rec.vb = el.getAttribute('viewBox');
        rec.role = el.getAttribute('role');
        const st = getComputedStyle(el);
        rec.stroke = st.stroke; rec.fill = st.fill;
      }
      out.media.push(rec);
    }

    // Slot geometry. A photo goes INTO a container, so the container is what has to be measured: a specimen
    // that infers a column width from the drawing inside it will size a shot list wrong.
    // Match by COMPUTED display, not by class: this page's hero grid is `lg:grid lg:grid-cols-12`, and a
    // `.grid` selector does not match a variant class, so a class-based scan silently misses the biggest slot.
    for (const el of [...document.querySelectorAll('main *, section *, header *, footer *')]
      .filter((e) => /^(inline-)?(grid|flex)$/.test(getComputedStyle(e).display))) {
      const b = box(el);
      if (b.w < 60 || b.h < 60) continue;
      const par = el.parentElement;
      out.regions.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute('class') || '').slice(0, 56),
        parent: (par.getAttribute('class') || '').slice(0, 56),
        parentTag: par.tagName.toLowerCase(),
        ...b,
        area: +(b.w * b.h).toFixed(0),
        media: el.querySelectorAll('img,svg').length,
        chars: (el.textContent || '').replace(/\s+/g, ' ').trim().length,
      });
    }

    // And the CHILDREN of those containers: a photo slot is a column, and the column's box is what a shot
    // list has to aim at (the hero's media column is 372x564 at 1240 while the drawing inside it is 372x233).
    for (const el of [...document.querySelectorAll('main *, section *, header *, footer *')]
      .filter((e) => /^(inline-)?(grid|flex)$/.test(getComputedStyle(e).display))) {
      const cs = getComputedStyle(el);
      for (const kid of el.children) {
        const b = box(kid);
        // The 60px floor keeps the list to boxes a photo could actually go into. A slot the page NAMED is a probe
        // handle at any height: `<div data-slot="PS-3">` is 56px tall at 1240 once the join actions moved out of
        // it, and a floor that hides the only box the site bothers to label makes every comment about that box
        // unfalsifiable. Named slots pass the floor and say they did.
        const named = kid.getAttribute('data-slot') || null;
        const underFloor = b.w < 60 || b.h < 60;
        if (underFloor && !named) continue;
        out.slots.push({
          tag: kid.tagName.toLowerCase(),
          underFloor: underFloor || null,
          // The name the page gives its own photo place (`<div data-slot="PS-1">`). A consumer that matches on a
          // Tailwind class is matching on styling: `cls` is truncated, and `lg:col-span-4` falls off the end, so
          // a specimen that looks its slots up by class silently stops finding them. The page labels the slot,
          // the probe reports the label, the specimen matches on it.
          dataSlot: named,
          cls: (kid.getAttribute('class') || '').slice(0, 120),
          parent: (el.getAttribute('class') || '').slice(0, 120),
          display: cs.display,
          gap: cs.gap,
          ...b,
          area: +(b.w * b.h).toFixed(0),
          media: kid.querySelectorAll('img,svg').length,
          chars: (kid.textContent || '').replace(/\s+/g, ' ').trim().length,
        });
      }
    }

    // Blocks of copy, so the gaps a READER crosses are separable from the padding a section declares.
    for (const el of document.querySelectorAll('p, li, h1, h2, h3')) {
      const b = box(el);
      if (b.h < 1) continue;
      const cs = getComputedStyle(el);
      out.text.push({
        tag: el.tagName.toLowerCase(),
        t: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        chars: (el.textContent || '').replace(/\s+/g, ' ').trim().length,
        lines: Math.max(1, Math.round(b.h / (parseFloat(cs.lineHeight) || 16))),
        ...b,
        fs: cs.fontSize, lh: cs.lineHeight,
      });
    }
  };

  const wantFaces = ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"'];
  const wantFamilies = ['PT Serif', 'Public Sans Variable'];
  const faceStatus = () => {
    const rows = [];
    document.fonts.forEach((f) => rows.push({ family: f.family, weight: f.weight, style: f.style, status: f.status }));
    return rows;
  };
  const settled = (rows) => wantFamilies.every((fam) => rows.some((r) => r.family === fam && r.status === 'loaded'));
  const report = (rows) => {
    out.done = true;
    out.elapsedMs = Date.now() - T0;
    out.facesLoaded = settled(rows);
    out.fonts = rows.map((r) => `${r.family} ${r.weight} ${r.style} ${r.status}`);
    return send();
  };

  if (!document.fonts || !document.fonts.load) {
    out.errors.push('document.fonts missing - heights may be fallback metrics');
    scan();
    report(faceStatus());
    return;
  }
  const kick = () => Promise.all(wantFaces.map((f) => document.fonts.load(f).then(() => {}, () => {})));
  // Faces are not the only thing that moves the document. A lazy <img> decodes after first paint and makes
  // the page taller: the landing page measured 2495px before the join-card png decoded and 2607px after.
  // `doc.scrollHeight` is what the driver chooses its pixel crop from, so measuring before the images settle
  // clips the bottom of the page out of the census. `decode()` alone is not enough for an image far below the
  // viewport, so `loading` is forced to eager first (it changes no geometry - it only stops the fetch being
  // deferred).
  const decodeImages = () => {
    for (const im of document.images) { try { if (im.loading === 'lazy') im.loading = 'eager'; } catch {} }
    return Promise.all([...document.images].map((im) =>
      (im.decode ? im.decode() : Promise.resolve()).then(() => {}, () => {})));
  };
  const deadline = Date.now() + 8000;
  (async () => {
    await kick();
    for (;;) {
      const rows = faceStatus();
      if (settled(rows) || Date.now() > deadline) {
        if (settled(rows)) { await decodeImages(); scan(); }
        return report(rows);
      }
      await new Promise((r) => setTimeout(r, 60));
    }
  })().then(() => {}, () => { out.errors.push('probe threw before posting'); report(faceStatus()); });
})();
