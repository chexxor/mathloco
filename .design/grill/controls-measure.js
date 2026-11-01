// controls-measure.js - what geometry the SHIPPED site's controls actually have, measured in Firefox.
// Loads under artifact-measure.mjs (same origin) or page-measure.mjs (file://, no-cors).
// For every interactive element: box size (target size), padding, font size/weight, line height,
// radius, and the text-vs-effective-background contrast pair. Contrast is measured off the rendered
// computed colors, not off the class name - a *-* class that looks like a background may be painted
// by an ancestor.
const send = (obj) => {
  const ep = window.__MEASURE_ENDPOINT;
  if (!ep) { console.log(obj); return; }
  fetch(ep, { method: 'POST', body: JSON.stringify(obj), mode: ep.startsWith('/') ? 'same-origin' : 'no-cors' });
};

// Browsers keep author colors as written: getComputedStyle in Firefox 158 returns `oklch(54.6% ...)`
// for Tailwind v4 palette classes, so parsing only rgb() silently returns null for every painted
// surface and the contrast column lies. Canonicalise through a canvas: fillStyle parses any CSS
// <color> and reports it back as rgb()/rgba().
const CANVAS = document.createElement('canvas');
const CTX = CANVAS.getContext('2d');
const canon = (c) => { CTX.fillStyle = '#000000'; CTX.fillStyle = String(c); return CTX.fillStyle; };
const lumOf = (c) => {
  const s = canon(c);   // canvas hands back #rrggbb for opaque colours and rgba() for translucent ones
  const hex = s.match(/^#([0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    if (hex[1].length === 8 && hex[1].slice(6) === '00') return null;
    const v = [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16) / 255);
    const f = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]);
  }
  const m = s.match(/^rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,\/]+/).map(parseFloat);
  if (p.length < 3 || p.some(Number.isNaN)) return null;
  if (p.length > 3 && p[3] === 0) return null;            // fully transparent
  const f = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]);
};
const effBg = (el) => {
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const raw = getComputedStyle(n).backgroundColor;
    const l = lumOf(raw);
    if (l !== null) return { l, raw, from: n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(' ')[0] : '') };
  }
  return { l: lumOf('rgb(255,255,255)') ?? 1, from: 'page-default' };
};
const ratio = (a, b) => { const hi = Math.max(a, b), lo = Math.min(a, b); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };

async function main() {
  // fonts.ready can stay pending on a face that never finishes (measured: index.html at 375 reported
  // nothing and the harness's hold timed out). Race it, and let the face-identity probe below say
  // which faces are actually loaded rather than blocking forever on one that is not.
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]';
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 42);
    const bg = effBg(el);
    const fg = lumOf(cs.color);
    const classes = String(el.className).split(/\s+/).filter((c) => /^(px|py|p|text|leading|font|h|w|gap|rounded|bg|border)-/.test(c)).join(' ');
    out.push({
      tag: el.tagName.toLowerCase(),
      text: txt,
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      // WCAG 2.2 SC 2.5.8 (AA) floor is a 24x24 CSS-px target; 44 is the enhanced/AAA size
      target24: r.width >= 24 && r.height >= 24,
      target44: r.width >= 44 && r.height >= 44,
      fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
      pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join('/'),
      radius: cs.borderRadius, display: cs.display,
      color: cs.color, colorResolved: canon(cs.color), bg: bg.from, bgResolved: bg.raw, contrast: fg !== null && bg.l !== null ? ratio(fg, bg.l) : null,
      utilityClasses: classes,
    });
  }

  // a face-identity probe: if the webfont did not load, every measurement below is of the fallback
  const probe = (() => {
    const c = document.createElement('canvas').getContext('2d');
    const w = (f) => { c.font = `700 100px ${f}`; return +c.measureText('Minneapolis Math Book Club').width.toFixed(1); };
    return { serif: w('serif'), ptserif: w('"PT Serif", serif'), fallbackGeorgia: w('Georgia') };
  })();

  const heights = out.map((o) => o.h).sort((a, b) => a - b);
  send({
    done: true,
    page: location.pathname,
    viewport: [innerWidth, innerHeight],
    fonts: { loadedFaces: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`), probe },
    count: out.length,
    distinctHeights: [...new Set(heights)],
    shortest: heights.slice(0, 5), longest: heights.slice(-3),
    under24: out.filter((o) => !o.target24).length,
    under44: out.filter((o) => !o.target44).length,
    contrastFails: out.filter((o) => o.contrast !== null && o.contrast < 4.5 && parseFloat(o.fontSize) < 24).map((o) => `${o.text} ${o.fontSize} ${o.contrast} on ${o.bg}`),
    elements: out,
  });
}
main().catch((e) => send({ error: String(e && e.stack || e) }));
