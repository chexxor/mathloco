// round9-measure.js — the browser side of the COLOUR round. Runs inside the same harness the render gate uses
// (design/grill/page-measure.mjs injects this as one plain <script> into a file:// page, so there is no module
// system here, no imports, and the only way out is the POST to window.__MEASURE_ENDPOINT).
//
//   node design/grill/page-measure.mjs design/grill/round-9-census.html design/grill/round9-measure.js 1240 2400 shot.png
//
// Reports, per panel: the box to crop for the pixel census, every slot's computed colours, and every planted
// [data-pair] resolved to real bytes — computed style, not the source text, because the browser's own bytes are
// the authority (D101: a hand computation says where to look, the renderer says what the site says).
//
// `ground` comes from the nearest [data-ground] ancestor AND from the first painted background walking up, so a
// ratio is always quoted against the surface it will actually be seen on — the mistake D116 was about.
//
// The `marks[]` records are emitted in the SAME shape design/grill/render-measure.js produces, which is what
// lets the existing design/mark-pixels.mjs probe cluster this specimen's pixels without a second probe.
(() => {
  const out = { done: false, kind: 'round9', vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, contentHeight: 0, panels: [], marks: [], tokens: {}, fonts: [], errors: [] };
  // ONE post per run: the harness closes the run on the post that carries `done:true`, and errors are
  // accumulated in `out.errors` and ride along on that post rather than posting themselves.
  //
  // A fetch here must say `method: 'POST'` AND `mode: 'no-cors'`. Writing `{ method: 'no-cors', body }` — which
  // is how this line read for half an hour — makes firefox issue a CORS PREFLIGHT instead: the harness then
  // receives an OPTIONS with no body and prints `RAW (not JSON):` followed by a timeout, which looks exactly
  // like a page that never reported. If a round ever reports that, diff this call against round8-measure.js
  // before believing the specimen is broken.
  let sent = false;
  const send = () => {
    if (sent) return;
    sent = true;
    let body;
    try { body = JSON.stringify(out); }
    catch (e) { body = JSON.stringify({ done: true, kind: 'round9', error: `report not serializable: ${e.message}` }); }
    fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body }).catch(() => {});
  };
  window.addEventListener('error', (e) => {
    out.errors.push(`${e.message} at ${(e.filename ?? '').split('/').pop()}:${e.lineno}`);
  });
  const cs = (el, p) => getComputedStyle(el)[p];
  const FONT = /Public Sans|PT Serif/;

  // Painted bytes, not author syntax — copied in spirit from render-measure.js, which is the authority on why:
  // firefox returns computed colours in AUTHOR syntax (`oklch(0.32 0.045 152)`), while the screen is 8-bit and
  // gets a gamut-mapped, quantised sRGB byte. Feeding WCAG luminance from un-quantised channels measures a
  // colour nobody sees. Canvas is the one oracle here that is not my own arithmetic: fill 1px, read the byte.
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const c2d = cvs.getContext('2d', { willReadFrequently: true });
  const paintCache = new Map();
  const paintBytes = (s) => {
    if (paintCache.has(s)) return paintCache.get(s);
    c2d.globalCompositeOperation = 'source-over';
    c2d.clearRect(0, 0, 1, 1);
    c2d.fillStyle = '#00e600';                       // sentinel: an unparseable assignment leaves this in place
    c2d.fillStyle = s;
    if (String(c2d.fillStyle) === '#00e600') { paintCache.set(s, null); return null; }
    c2d.fillRect(0, 0, 1, 1);
    const d = c2d.getImageData(0, 0, 1, 1).data;
    const v = d[3] === 0 ? null : { rgb: [d[0], d[1], d[2]], a: d[3] / 255 };
    paintCache.set(s, v);
    return v;
  };
  const transparent = (s) => !s || s === 'transparent' || /^rgba\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+[\s,]+0\s*\)$/.test(s);
  const lum = (c) => { const f = (v) => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratioOf = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };

  // the surface a colour is really seen on: walk up to the first ancestor with a painted background
  function paintedBg(el) {
    for (let n = el; n; n = n.parentElement) {
      const css = cs(n, 'backgroundColor');
      if (transparent(css)) continue;
      const p = paintBytes(css);
      if (p && p.a > 0.99) return { css, rgb: p.rgb, on: (n.dataset.slot ?? n.tagName.toLowerCase()), ground: n.dataset.ground ?? null };
    }
    return null;
  }
  const groundOf = (el) => { const g = el.closest('[data-ground]'); return g ? g.dataset.ground : 'paper'; };

  function scan() {
    out.contentHeight = Math.ceil(document.documentElement.getBoundingClientRect().height);

    for (const panel of document.querySelectorAll('[data-panel]')) {
      const r = panel.getBoundingClientRect();
      const entry = {
        id: panel.dataset.panel, policy: panel.dataset.policy,
        x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        slots: [], pairs: [],
      };
      for (const el of panel.querySelectorAll('[data-slot]')) {
        const b = el.getBoundingClientRect();
        const bg = paintedBg(el);
        entry.slots.push({
          slot: el.dataset.slot,
          x: +b.left.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1),
          color: cs(el, 'color'),
          colorBytes: (paintBytes(cs(el, 'color')) ?? {}).rgb ?? null,
          background: cs(el, 'backgroundColor'),
          paintedOn: bg ? bg.css : null, paintedOnBytes: bg ? bg.rgb : null,
          borderLeft: cs(el, 'borderLeftWidth') === '0px' ? null : cs(el, 'borderLeftColor'),
          shadow: cs(el, 'boxShadow') === 'none' ? null : cs(el, 'boxShadow').slice(0, 160),
          font: FONT.test(cs(el, 'fontFamily')) ? cs(el, 'fontFamily').split(',')[0].replace(/["']/g, '') : null,
          fontSize: cs(el, 'fontSize'),
          text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) || null,
        });
      }
      for (const el of panel.querySelectorAll('[data-pair]')) {
        // data-pair="label|fg token|bg token|bar" — the bar is optional; the driver defaults it to the text bar.
        const [label, fgTok, bgTok, bar] = (el.dataset.pair || '').split('|');
        const fgCss = cs(el, 'color'), bg = paintedBg(el);
        const fg = paintBytes(fgCss);
        entry.pairs.push({
          label: label ?? null, fgToken: fgTok ?? null, bgToken: bgTok ?? null, bar: bar ? Number(bar) : null,
          color: fgCss, bgCss: bg ? bg.css : null,
          fgBytes: fg ? fg.rgb : null, bgBytes: bg ? bg.rgb : null,
          contrast: fg && bg ? ratioOf(fg.rgb, bg.rgb) : null,
          ground: groundOf(el), slot: el.dataset.slot ?? (bg ? bg.on : null),
        });
      }
      out.panels.push(entry);
    }

    // marks: geometry + the token each shape says it was painted with. mark-pixels.mjs then reports what is
    // ACTUALLY in the box; the two agreeing is the finding, and the token names are what let a mismatch be named.
    for (const svg of document.querySelectorAll('svg[data-mark]')) {
      const r = svg.getBoundingClientRect();
      const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      const scale = vb[2] ? r.width / vb[2] : NaN;
      const shapes = [...svg.querySelectorAll('circle,path')].map((el) => {
        const s = getComputedStyle(el);
        const sw = parseFloat(s.strokeWidth) || 0;
        return {
          tag: el.tagName.toLowerCase(), role: el.getAttribute('data-role') || '', token: el.getAttribute('data-token') || '',
          stroke: s.stroke, fill: s.fill, sw, swDevice: +(sw * (scale || 0)).toFixed(2),
          dash: s.strokeDasharray && s.strokeDasharray !== 'none' ? s.strokeDasharray : null,
        };
      });
      out.marks.push({
        name: svg.getAttribute('data-mark'), set: svg.getAttribute('data-markset') || '',
        ground: svg.getAttribute('data-ground') || '', boxW: Number(svg.getAttribute('data-box')) || null,
        x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        vbW: vb[2] || null, vbH: vb[3] || null, scale: Number.isFinite(scale) ? +scale.toFixed(3) : null,
        count: shapes.length, shapes,
      });
    }

    // token values as the browser resolved them, so a spec value that falls out of sRGB shows up as measurable
    // drift instead of a silent assumption. Names come from the :root rule itself — the builder cannot forget one.
    const probe = document.createElement('div');
    probe.style.display = 'none';
    document.body.appendChild(probe);
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (rule.selectorText !== ':root') continue;
        for (let i = 0; i < rule.style.length; i += 1) {
          const p = rule.style.item(i);
          if (!p.startsWith('--')) continue;
          probe.style.color = `var(${p})`;
          const css = getComputedStyle(probe).color;
          const painted = paintBytes(css);
          out.tokens[p] = { css, bytes: painted ? painted.rgb : null };
        }
      }
    }
    probe.remove();
  }

  // Fonts are not cosmetic here: the panel heights the census crops by come from font metrics, so a shot taken
  // before the faces load crops the wrong rows and the chroma counts are off by a line.
  const wantFamilies = ['PT Serif', 'Public Sans Variable'];
  const faceStatus = () => { const a = []; document.fonts.forEach((f) => a.push({ family: f.family, weight: f.weight, style: f.style, status: f.status })); return a; };
  const settled = (rows) => wantFamilies.every((fam) => rows.some((r) => r.family === fam && r.status === 'loaded'));
  const report = (rows) => {
    out.done = true; out.facesLoaded = settled(rows);
    out.fonts = rows.map((r) => `${r.family} ${r.weight} ${r.style} ${r.status}`);
    if (out.errors.length) out.error = out.errors.join('; ');   // the harness prints "page threw:" from this
    send();
  };
  const wantFaces = ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"'];
  (async () => {
    await Promise.all(wantFaces.map((f) => document.fonts.load(f).then(() => {}, () => {})));
    const deadline = Date.now() + 8000;
    for (;;) {
      const rows = faceStatus();
      if (settled(rows) || Date.now() > deadline) {
        if (settled(rows)) {
          try { scan(); } catch (e) { out.errors.push(`scan threw: ${e.message} @${(e.stack ?? '').split('\n')[1] ?? ''}`); out.error = out.errors.join('; '); }
        } else out.errors.push('fonts did not load — nothing measured');
        return report(rows);
      }
      await new Promise((r) => setTimeout(r, 60));
    }
  })().then(() => {}, (e) => { out.errors.push(`measurement threw: ${e?.message ?? e}`); out.error = out.errors.join('; '); report(faceStatus()); });
})();
