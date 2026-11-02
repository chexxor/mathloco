// round8-measure.js — measures the round-8 specimen from inside the browser: characters per line per
// ramp, the control heights each ramp produces, the notice height, the display cap fits, and the mark's
// device strokes at candidate weights.
//
//   node design/grill/page-measure.mjs design/grill/round-8.html design/grill/round8-measure.js 1240 1400
//   node design/grill/page-measure.mjs design/grill/round-8-mark.html design/grill/round8-measure.js 1240 1400 .design/tmp-round8-mark.png
//   then: node design/mark-pixels.mjs .design/tmp-round8-mark.png <report.json> <markIndex> --crop .design/tmp-*.png
//
// The `marks[]` records are emitted in the SAME shape design/grill/render-measure.js produces, which is
// what lets the existing mark-pixels.mjs probe cluster the specimen's pixels without a second probe.
//
// The word-anchored line-box logic is duplicated from line-length-measure.js rather than imported:
// page-measure.mjs injects exactly one plain <script> into a file:// page, so there is no module path
// available to a second script. If the two ever disagree, line-length-measure.js is the authority.
(() => {
  const out = { done: false, kind: 'round8', vw: innerWidth, runs: [], controls: [], notices: [], caps: [], marks: [], errors: [] };
  const send = () => fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(out) }).catch(() => {});
  const tol = (a, b) => Math.abs(a - b) <= 2;

  // ---- line boxes from word rects (words are the atoms CSS will not split)
  function lines(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const words = [];
    let node;
    while ((node = walker.nextNode())) {
      const re = /\S+/g; let m;
      while ((m = re.exec(node.data))) {
        const r = document.createRange();
        r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
        const rects = Array.from(r.getClientRects()).filter((x) => x.width > 0.5);
        if (!rects.length) continue;
        words.push({ w: m[0], top: +rects[0].top.toFixed(2), left: Math.min(...rects.map((x) => x.left)), right: Math.max(...rects.map((x) => x.right)), broken: rects.length > 1 });
      }
    }
    if (!words.length) return null;
    const ls = [];
    for (const wd of words) {
      const ln = ls.find((l) => tol(l.top, wd.top));
      if (ln) { ln.words.push(wd); ln.top = Math.min(ln.top, wd.top); } else ls.push({ top: wd.top, words: [wd] });
    }
    ls.sort((a, b) => a.top - b.top);
    for (const l of ls) {
      l.left = Math.min(...l.words.map((w) => w.left));
      l.right = Math.max(...l.words.map((w) => w.right));
      l.chars = l.words.reduce((a, w) => a + w.w.length, 0) + (l.words.length - 1);
      l.px = +(l.right - l.left).toFixed(1);
    }
    const maxWordPx = +Math.max(...words.map((w) => w.right - w.left)).toFixed(1);
    const widestIx = ls.map((l) => l.px).indexOf(Math.max(...ls.map((l) => l.px)));
    return {
      lines: ls.length,
      lineChars: ls.map((l) => l.chars),
      maxLineChars: Math.max(...ls.map((l) => l.chars)),
      cpl: +(ls.reduce((a, l) => a + l.chars, 0) / ls.length).toFixed(1),
      widestLinePx: ls[widestIx].px,
      maxWordPx,
      broken: words.some((w) => w.broken),
    };
  }

  const box = (el) => {
    const cs = getComputedStyle(el);
    return +(el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)).toFixed(1);
  };

  function scan() {
    // ---- ramps: the specimen's real type blocks
    for (const cand of document.querySelectorAll('[data-cand]')) {
      const name = cand.getAttribute('data-cand');
      for (const el of cand.querySelectorAll('h1,h2,p')) {
        const cs = getComputedStyle(el);
        const L = lines(el); if (!L) continue;
        const fs = parseFloat(cs.fontSize);
        out.runs.push({
          name, tag: el.tagName.toLowerCase(), role: el.className || el.tagName.toLowerCase(),
          col: el.closest('[data-box]')?.getAttribute('data-box') || '',
          t: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40),
          fs: cs.fontSize, lh: cs.lineHeight, fw: cs.fontWeight,
          ff: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          box: box(el), advance: L.maxLineChars ? +(L.widestLinePx / L.maxLineChars).toFixed(2) : 0,
          fits: +(box(el) / (L.widestLinePx / L.maxLineChars)).toFixed(0),   // chars that FIT this box at this size
          ...L,
        });
      }
      for (const el of cand.querySelectorAll('[data-ctrl]')) {
        const cs = getComputedStyle(el);
        out.controls.push({
          cand: name, kind: el.getAttribute('data-ctrl'), h: +el.getBoundingClientRect().height.toFixed(1),
          fs: cs.fontSize, lh: cs.lineHeight, pad: cs.padding, radius: cs.borderRadius, shadow: cs.boxShadow.slice(0, 60),
        });
      }
    }

    // notices and cap boxes carry their own candidate name, so they are found document-wide
    for (const el of document.querySelectorAll('[data-notice]')) {
      const body = el.querySelector('.body');
      const L = body ? lines(body) : null;
      out.notices.push({
        cand: el.getAttribute('data-notice'), h: +el.getBoundingClientRect().height.toFixed(1),
        w: +el.getBoundingClientRect().width.toFixed(1),
        minH: getComputedStyle(el).minHeight, bodyLines: L ? L.lines : null,
        bodyMaxCh: L ? L.maxLineChars : null, bodyFs: body ? getComputedStyle(body).fontSize : '',
      });
    }
    for (const el of document.querySelectorAll('[data-capbox]')) {
      const inner = el.querySelector('span');
      const L = inner ? lines(inner) : null;
      const b = box(el);
      out.caps.push({
        cand: el.closest('[data-caps]')?.getAttribute('data-caps') || '', step: el.getAttribute('data-step'), boxW: el.getAttribute('data-capbox'),
        box: b, lines: L ? L.lines : null, maxWordPx: L ? L.maxWordPx : null,
        fits: L ? L.maxWordPx <= b + 0.5 : null, maxLineChars: L ? L.maxLineChars : null,
        clipped: el.scrollWidth > el.clientWidth + 1,
      });
    }

    // ---- the mark specimen: same record shape as render-measure.js so mark-pixels.mjs can read it
    for (const svg of document.querySelectorAll('svg[data-mark]')) {
      const r = svg.getBoundingClientRect();
      const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      const scale = vb[2] ? r.width / vb[2] : NaN;
      const shapes = [...svg.querySelectorAll('circle,path,rect,line,polygon,polyline,ellipse')].map((el) => {
        const cs = getComputedStyle(el);
        const sw = parseFloat(cs.strokeWidth) || 0;
        const device = cs.vectorEffect === 'non-scaling-stroke';
        return {
          tag: el.tagName.toLowerCase(), role: el.getAttribute('data-role') || '',
          stroke: cs.stroke, fill: cs.fill, sw,
          swDevice: +(sw * (device ? 1 : (scale || 0))).toFixed(2),
          nonScaling: device,
          strokeContrast: null, fillContrast: null, cls: '',
        };
      });
      out.marks.push({
        name: svg.getAttribute('data-mark'), set: svg.getAttribute('data-markset'),
        x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        vbW: vb[2] || null, vbH: vb[3] || null,
        scale: Number.isFinite(scale) ? +scale.toFixed(3) : null,
        ratio: r.width ? +(r.height / r.width).toFixed(4) : null,
        wantRatio: vb[2] ? +(vb[3] / vb[2]).toFixed(4) : null,
        role: svg.getAttribute('role') || '', label: svg.getAttribute('aria-label') || '', hidden: false, cls: '',
        count: shapes.length, shapes,
      });
    }
  }

  const wantFamilies = ['PT Serif', 'Public Sans Variable'];
  const faceStatus = () => { const a = []; document.fonts.forEach((f) => a.push({ family: f.family, weight: f.weight, style: f.style, status: f.status })); return a; };
  const settled = (rows) => wantFamilies.every((fam) => rows.some((r) => r.family === fam && r.status === 'loaded'));
  const report = (rows) => {
    out.done = true; out.facesLoaded = settled(rows);
    out.fonts = rows.map((r) => `${r.family} ${r.weight} ${r.style} ${r.status}`);
    send();
  };
  const wantFaces = ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"'];
  (async () => {
    await Promise.all(wantFaces.map((f) => document.fonts.load(f).then(() => {}, () => {})));
    const deadline = Date.now() + 8000;
    for (;;) {
      const rows = faceStatus();
      if (settled(rows) || Date.now() > deadline) { if (settled(rows)) scan(); return report(rows); }
      await new Promise((r) => setTimeout(r, 60));
    }
  })().then(() => {}, () => report(faceStatus()));
})();
