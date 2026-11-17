// communication-measure.js — the measure script design/communication-survey.mjs injects into a BUILT
// page, to answer one question: WHAT IS INSIDE THE FIRST SCREEN, and how far down does each answer sit?
//
// The byte census (design/communication-census.mjs) counts what a page SAYS; this counts what a visitor
// SEES before they scroll. A page that answers "when do we meet" 2,400px down asks a visitor to scroll
// before they can act, and a first screen of wayfinding answers nothing.
//
// Fields:
//   fold        — words, text runs, anchors, headings, controls and named blocks whose top sits inside the
//                 viewport the harness set, and the same counts below it
//   firstAction — the topmost element carrying data-control (the first thing a visitor can press), or null
//   surfaces    — every element the page NAMES (data-surface / data-slot / data-date / data-line-art /
//                 data-mark), with its page-absolute y and box, so a claim about where an answer sits has
//                 a box behind it
//   band        — the exit band's y, so the journey splits into body and wayfinding
//
// ORDER MATTERS, and the rule is the render gate's: faces before numbers, and before the SCAN. A box read
// while PT Serif is still loading is the fallback stack's metrics, and POSITIONS move on the swap (108px
// of reflow at 320 in the gate's finding) where heights survive it. So the poll below gates the scan, not
// the post. A page that never references a ratified family is reported as such rather than failed: the
// ratified families are the two the site ships, and any other face listed by the browser may legitimately
// stay unloaded on a page that does not ask for it.

(() => {
  const T0 = Date.now();
  const out = { done: false, errors: [], vw: innerWidth, vh: innerHeight, fold: null, band: null, surfaces: [], controls: [] };

  const fontRows = () => {
    const r = [];
    document.fonts.forEach((f) => r.push(`${f.weight} ${f.style} ${f.family} ${f.status}`));
    return r;
  };
  const want = (fam, rows) => rows.some((x) => x.includes(fam) && x.includes('loaded'));
  const settled = (rows) => want('PT Serif', rows) && want('Public Sans Variable', rows);

  const scan = () => {
    const scroll = window.scrollY;
    const top = (el) => el.getBoundingClientRect().top + scroll;
    const hidden = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      const r = el.getBoundingClientRect();
      return r.width < 4 && r.height < 4;
    };

    const runs = [];
    const runEls = new Set();
    for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,figcaption,time')) {
      if (hidden(el)) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length < 2) continue;
      if (el.parentElement && runEls.has(el.parentElement)) continue;
      runEls.add(el);
      runs.push({ tag: el.tagName.toLowerCase(), y: Math.round(top(el)), words: text.split(/\s+/).length, text: text.slice(0, 90) });
    }

    const controls = [];
    for (const el of document.querySelectorAll('[data-control]')) {
      if (hidden(el)) continue;
      controls.push({ y: Math.round(top(el)), role: el.getAttribute('data-control'), label: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) });
    }

    const anchors = [];
    for (const el of document.querySelectorAll('a[href]')) {
      if (hidden(el)) continue;
      const href = el.getAttribute('href') || '';
      anchors.push({ y: Math.round(top(el)), href, internal: href.startsWith('/') });
    }

    const surfaces = [];
    for (const el of document.querySelectorAll('[data-surface],[data-slot],[data-date],[data-line-art],[data-mark],[data-rsvp-cluster]')) {
      if (hidden(el)) continue;
      const r = el.getBoundingClientRect();
      surfaces.push({
        name: el.getAttribute('data-surface') || el.getAttribute('data-slot') || el.getAttribute('data-line-art') || el.getAttribute('data-mark') || el.tagName.toLowerCase(),
        y: Math.round(top(el)), w: Math.round(r.width), h: Math.round(r.height),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
      });
    }

    const headings = [];
    for (const el of document.querySelectorAll('h1,h2,h3')) headings.push({ y: Math.round(top(el)), text: (el.textContent || '').replace(/\s+/g, ' ').trim() });

    const foot = document.querySelector('footer');
    out.band = foot && !hidden(foot) ? { y: Math.round(top(foot)), height: Math.round(foot.getBoundingClientRect().height) } : null;
    out.docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight || 0);

    const vh = innerHeight;
    const above = (list) => list.filter((r) => r.y < vh);
    const sum = (list) => list.reduce((n, r) => n + r.words, 0);
    out.fold = {
      vh,
      wordsAbove: sum(above(runs)),
      wordsBelow: sum(runs.filter((r) => r.y >= vh)),
      runsAbove: above(runs).length,
      runsBelow: runs.filter((r) => r.y >= vh).length,
      headingsAbove: above(headings),
      controlsAbove: above(controls),
      controlsBelow: controls.filter((c) => c.y >= vh).length,
      anchorsAbove: above(anchors).length,
      anchorsBelow: anchors.filter((a) => a.y >= vh).length,
      surfacesAbove: above(surfaces),
    };
    out.firstAction = controls.length ? controls.sort((a, b) => a.y - b.y)[0] : null;
    out.firstAnchor = anchors.length ? anchors.sort((a, b) => a.y - b.y)[0] : null;
    out.runs = runs;
    out.surfaces = surfaces;
    out.controls = controls;
    out.headings = headings;
    out.anchors = anchors;
    out.faces = fontRows();
    out.facesSettled = settled(out.faces);
  };

  const wantFaces = ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"'];
  const waitImages = () => {
    for (const im of document.images) { try { if (im.loading === 'lazy') im.loading = 'eager'; } catch {} }
    return Promise.all([...document.images].map((im) => (im.decode ? im.decode() : Promise.resolve()).catch(() => {})));
  };
  const settle = () => (document.fonts && document.fonts.load
    ? Promise.all(wantFaces.map((f) => document.fonts.load(f).then(() => {}, () => {})))
        .then(() => document.fonts.ready).then(() => {}, () => {})
    : Promise.resolve())
    .then(waitImages, waitImages);

  window.scrollTo(0, 0);
  const send = () => fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(out) }).catch(() => {});
  const finish = () => {
    out.faces = fontRows();
    out.facesSettled = settled(out.faces);
    out.done = true;
    out.elapsedMs = Date.now() - T0;
    send();
  };
  settle()
    .then(scan)
    .then(finish)
    .catch((e) => { out.errors.push(String(e && e.message || e)); finish(); });
})();
