// contrast-probe.js - the colour oracle that runs in the renderer, not in a hand-rolled converter.
//
// Why: an oklch token has no sRGB channels until a browser renders it, and a hand-written
// oklab->XYZ conversion skips the gamut mapping. Two oracles disagreeing by ~0.5 ratio points is
// exactly the margin these decisions live on (the round-4 numbers came from an oklab calculation;
// this reproduces them to within ~0.1 and is the number to trust going forward). So every colour
// expression is handed to the renderer - `el.style.color = expr` then read back computed - and the
// WCAG arithmetic runs on the channels the renderer actually produced.
//
// What this oracle deliberately does NOT do: sample the *page's* pixels. Headless Firefox in
// --screenshot mode gives a probe no access to its own rendered surface (the screenshot goes to a
// file, written after the probe), and while the page holds its own load open (the harness trick that
// keeps Firefox alive) **timer callbacks never run at all** - measured: `await setTimeout(50)` never
// resolves, `await Promise.resolve()` does. So page-pixel sampling would need a separate two-pass
// screenshot pipeline; contrast for a flat-fill specimen needs only the pair's two colours, and
// translucent layers can be composited exactly as the renderer does them.
//
// Kinds (a *layer* and a *text pair* are different questions; conflating them once reported a
// fill-against-itself as "1.00 contrast" and a chip's text against its own glyph as a ratio):
//   text      {name, fg, bg, bar=4.5}            label colour vs the colour behind it
//   keyline   {name, fg, bg, bar=3.0}            a boundary vs the ground it sits on
//   layer     {name, fill, ground, bar=1.35}     can the eye see this as a separate surface?
//   over      {name, top, onto, label, bar=4.5}  translucent `top` composited on `onto`, label vs result
//   shadow    {name, top, onto, label, bar=1.35} like `over`, but the QUESTION is composite-vs-ground
//                                              (a shadow is a translucent fill, so the layer bar
//                                              applies to it; `over` answers legibility-on-it instead)
// Colour expressions: '@name' -> cfg.tokens[name]; anything else is passed to the renderer as written.
//
// cfg (window.__CFG, injected by artifact-measure.mjs --config):
//   tokens, pairs[], solves[{label,C,H,against,target,near,darker?}]
window.__measure = async () => {
  const cfg = window.__CFG || { tokens: {}, pairs: [], solves: [] };
  const tok = (v) => (typeof v === 'string' && v.startsWith('@') ? cfg.tokens[v.slice(1)] : v);
  const OUT = [];
  const pad = (s, n) => String(s).padEnd(n);

  // renderer-side canonicalisation. Computed `color` keeps oklch notation in Firefox (measured:
  // `oklch(98.5% 0.006 85)` comes back as `oklch(0.985 0.006 85)`), so the channel values have to
  // come from something that serialises to sRGB: a canvas fillStyle uses the same CSS parser and the
  // same gamut mapping a visitor's pixels get, and it is what makes an out-of-gamut oklch visible.
  const can = document.createElement('canvas').getContext('2d');
  const SENTINEL = '#123456';
  function rgba(expr) {
    can.fillStyle = SENTINEL;
    can.fillStyle = String(expr);
    const got = String(can.fillStyle);
    if (got === SENTINEL && !/^#123456$/i.test(String(expr).trim())) return { bad: String(expr) };
    const hex = got.match(/^#([0-9a-f]{6})$/i);
    if (hex) return { r: parseInt(hex[1].slice(0, 2), 16), g: parseInt(hex[1].slice(2, 4), 16), b: parseInt(hex[1].slice(4, 6), 16), a: 1 };
    const m = got.match(/^rgba?\(([^)]+)\)$/i);
    if (!m) return { bad: got };
    const q = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (q.some(Number.isNaN)) return { bad: got };
    return { r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 };
  }
  const hexOf = (c) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  const over = (top, onto) => {
    const a = top.a;
    return { r: top.r * a + onto.r * (1 - a), g: top.g * a + onto.g * (1 - a), b: top.b * a + onto.b * (1 - a), a: 1 };
  };
  const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); const hi = Math.max(x, y), lo = Math.min(x, y); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };

  // ---------- tokens, as the renderer paints them
  OUT.push('token (as written)                              rendered');
  const rendered = {};
  for (const [k, v] of Object.entries(cfg.tokens || {})) {
    const c = rgba(v);
    rendered[k] = c;
    OUT.push(`${pad(`${k} = ${v}`, 42)} ${c.bad ? 'UNPARSEABLE ' + c.bad : `${hexOf(c)} rgba(${c.r},${c.g},${c.b},${c.a})`}`);
  }

  // ---------- pairs
  const results = [];
  OUT.push('', 'pair                                       kind     fg          bg          ratio  bar  verdict');
  for (const p of cfg.pairs || []) {
    const kind = p.kind || 'text';
    const bar = p.bar || (kind === 'layer' ? 1.35 : kind === 'keyline' ? 3 : 4.5);
    let fg, bg, groundForVerdict = null;
    if (kind === 'over' || kind === 'shadow') {
      const onto = rgba(tok(p.onto));
      bg = over(rgba(tok(p.top)), onto);
      fg = rgba(tok(p.label));
      if (kind === 'shadow') groundForVerdict = onto;
    } else {
      const groundExpr = kind === 'layer' ? p.ground : p.bg;
      const fillExpr = kind === 'layer' ? p.fill : p.fg;
      const g = rgba(tok(groundExpr));
      const f = rgba(tok(fillExpr));
      if (g.a < 1) { OUT.push(`${pad(p.name, 42)} ${pad(kind, 8)} translucent ground - use kind "over"`); continue; }
      bg = g; fg = f;
    }
    if (fg.bad || bg.bad) { OUT.push(`${pad(p.name, 42)} ${pad(kind, 8)} BAD COLOUR  ${fg.bad || ''} ${bg.bad || ''}`); continue; }
    const cr = groundForVerdict ? ratio(bg, groundForVerdict) : ratio(fg, bg);
    const verdict = (kind === 'layer' || kind === 'shadow') ? (cr >= bar ? 'LAYERED' : 'FLAT (decoration)') : cr >= bar ? 'PASS' : 'FAIL';
    const labelOn = groundForVerdict ? `  [label on the composite: ${ratio(fg, bg)}]` : '';
    OUT.push(`${pad(p.name, 42)} ${pad(kind, 8)} ${pad(hexOf(fg) + (fg.a < 1 ? ` a${fg.a}` : ''), 11)}  ${pad(hexOf(bg), 11)} ${pad(cr, 6)} ${pad(bar, 4)}  ${verdict}${labelOn}`);
    results.push({ name: p.name, kind, fg: hexOf(fg), bg: hexOf(bg), ratio: cr, bar, verdict, labelOn: groundForVerdict ? ratio(fg, bg) : null });
  }

  // ---------- solves: which L of a fixed C,H clears a bar against a ground, in the renderer
  OUT.push('', 'solve (L of oklch(L C H) nearest `near` that still clears the bar)');
  const solves = [];
  for (const s of cfg.solves || []) {
    const ground = rgba(tok(s.against));
    if (ground.bad) { OUT.push(`${s.label}: no ground`); continue; }
    let best = null;
    for (let L = 12; L <= 99; L += 0.5) {
      const c = rgba(`oklch(${L}% ${s.C} ${s.H})`);
      if (c.bad) continue;
      const r = ratio(c, ground);
      const hit = s.darker ? r <= s.target : r >= s.target;
      if (hit && (!best || Math.abs(L - s.near) < Math.abs(best.L - s.near))) best = { L, expr: `oklch(${L}% ${s.C} ${s.H})`, r, c };
    }
    if (best) {
      OUT.push(`${pad(`${s.label} (bar ${s.target})`, 42)} ${pad(best.expr, 26)} renders ${pad(hexOf(best.c), 10)} ratio ${best.r}`);
      solves.push({ label: s.label, at: best.expr, ratio: best.r });
    } else OUT.push(`${pad(s.label, 42)} no L of oklch(L ${s.C} ${s.H}) reaches ${s.target}`);
  }

  // fonts: this oracle measures colours, not boxes, so it reports what loaded rather than waiting.
  // (Awaiting fonts here would need a timer, and timers do not run while the load is held - see header.)
  return {
    out: OUT.join('\n'),
    report: OUT.join('\n'),
    facesLoaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.weight} ${f.family}`),
    fontSet: document.fonts.size,
    pairs: results,
    solves,
  };
};
