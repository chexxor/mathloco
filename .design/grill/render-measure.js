// render-measure.js — the measure script dist-measure.mjs / page-measure.mjs inject into a BUILT page.
//
// This is the "did the token actually render as intended" half of the loop. The scanner (.design/
// check-classes.mjs) proves a class exists; this proves what it became in a real browser at a real
// width: heights, line boxes, the family that actually resolved, the colour that actually painted,
// and the measured contrast between them. Ratify asserted its pairs on hand-made specimen divs; this
// checks the same pairs on the page the visitor gets.
//
// Notes on what the numbers mean here:
//   - Firefox hands back computed colours in AUTHOR syntax — `oklch(0.32 0.045 152)` — so the parser
//     converts oklch through OKLab to LINEAR sRGB (what WCAG relative luminance wants) instead of
//     pretending everything is rgb().
//   - `stacked` is the class list actually on the element at render time, which is the only way to see
//     the Tailwind default `border: 1px solid currentColor` still applying when a colour write was
//     deleted and no token was written.
//   - fonts[] lists webfonts the page references and whether they were loaded; a serif line box
//     measured while PT Serif is still loading is a fallback metric, so this ships in the output.
(() => {
  const T0 = Date.now();
  const out = { done: false, errors: [], vw: innerWidth, vh: innerHeight, controls: [], bands: [], keylines: [], notices: [], nav: null, shadows: [], text: [], fonts: [] };
  const send = (payload) => {
    out.done = true;
    Object.assign(out, payload);
    fetch(window.__MEASURE_ENDPOINT, {
      method: 'POST', mode: 'no-cors', body: JSON.stringify(out),
    }).catch(() => {});
  };

  const oklchToLinear = (L, C, H) => {
    const hr = (H * Math.PI) / 180, a = C * Math.cos(hr), b = C * Math.sin(hr);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
    return {
      lr: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
      lg: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
      lb: -0.3686629590 * l3 - 0.7034586147 * m3 + 1.7073575029 * s3,
      lin: true,
    };
  };
  const parse = (s) => {
    s = (s || '').trim();
    let m = /^oklch\(([\d.]+)(?:e-?\d+)?\s+([\d.]+)(?:e-?\d+)?\s+([\d.]+)/.exec(s);
    if (m) return oklchToLinear(+m[1], +m[2], +m[3]);
    m = /^color\(srgb ([^)]+)\)/.exec(s);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { lr: p[0], lg: p[1], lb: p[2], a: p[3] === undefined ? 1 : p[3], lin: true };
    }
    m = /^rgba?\(([^)]+)\)/.exec(s);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3], lin: false };
    }
    return null;
  };
  const lum = (c) => c.lin
    ? 0.2126 * c.lr + 0.7152 * c.lg + 0.0722 * c.lb
    : (() => {
        const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
      })();
  const ratio = (a, b) => {
    const l1 = Math.max(lum(a), lum(b)), l2 = Math.min(lum(a), lum(b));
    return +((l1 + 0.05) / (l2 + 0.05)).toFixed(2);
  };
  const opaque = (c) => !!c && (c.a === undefined || c.a > 0);
  const painted = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (opaque(c)) return c;
      n = n.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1, lin: false };
  };

  const SEL = ['a[href]', 'button', 'input', 'select', 'textarea', 'summary', 'label',
    'nav[aria-label]', 'header', 'footer', 'section', 'h1', 'h2', 'h3', 'h4', 'p', 'li', 'td', 'th', 'article', 'aside',
    '[class*="bg-"]', '[class*="border"]', '[class*="ring"]', '[class*="divide"]', '[class*="outline"]',
    '[class*="shadow"]', '[class*="text-"]'];
  const all = [...document.querySelectorAll(SEL.join(','))];

  // controls: anything you can click or type in, measured where it sits
  const isControl = (el) => /^(a|button|input|select|textarea|summary)$/.test(el.tagName.toLowerCase()) &&
    (el.tagName.toLowerCase() !== 'a' || el.hasAttribute('href'));
  const controls = all.filter(isControl).map((el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), bg = painted(el);
    const fg = parse(cs.color) || { r: 0, g: 0, b: 0, a: 1, lin: false };
    return {
      t: (el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 60),
      tag: el.tagName.toLowerCase(),
      h: +r.height.toFixed(1), w: +r.width.toFixed(1),
      fs: cs.fontSize, lh: cs.lineHeight, fw: cs.fontWeight, ff: cs.fontFamily.split(',')[0],
      pad: cs.padding, radius: cs.borderRadius,
      bg: cs.backgroundColor, fg: cs.color, contrast: opaque(bg) ? ratio(fg, bg) : null,
      shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow.slice(0, 60),
      outline: cs.outlineStyle + ' ' + cs.outlineWidth,
      cls: (el.getAttribute('class') || '').slice(0, 120),
    };
  });

  // dark bands: a block dark enough to be a band AND wide enough to read as one across the page —
  // without the width test every primary CTA counts as a band and "one dark band per screen" is noise
  const inkDark = (c) => lum(c) < 0.25;
  const interactive = /^(a|button|summary|input|select|textarea)$/;
  const bands = all.filter((el) => {
    if (interactive.test(el.tagName.toLowerCase())) return false;
    const cs = getComputedStyle(el), c = parse(cs.backgroundColor), r = el.getBoundingClientRect();
    return opaque(c) && inkDark(c) && r.width >= 0.35 * innerWidth && r.height >= 12;
  }).map((el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), c = parse(cs.backgroundColor);
    const fg = parse(cs.color);
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class') || '').slice(0, 100),
      h: +r.height.toFixed(1), w: +r.width.toFixed(1),
      bg: cs.backgroundColor, fg: cs.color,
      contrast: fg && opaque(parse(cs.backgroundColor)) ? ratio(fg, c) : null,
      shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow.slice(0, 60),
    };
  });

  // keylines: border/outline/decoration widths that actually painted, with the colour and its measured
  // contrast against whatever it sits on. The 1.35 layer bar is enforced by the gate, not here.
  const keylines = all.map((el) => {
    const cs = getComputedStyle(el);
    const widths = [cs.borderTopWidth, cs.borderBottomWidth, cs.borderLeftWidth, cs.borderRightWidth,
      cs.outlineStyle !== 'none' ? cs.outlineWidth : '0px',
      cs.textDecorationLine !== 'none' ? cs.textDecorationThickness : '0px'];
    const w = Math.max(...widths.map((x) => parseFloat(x) || 0));
    if (w <= 0) return null;
    const raw = [cs.borderTopColor, cs.borderBottomColor, cs.borderLeftColor, cs.borderRightColor,
      cs.outlineColor, cs.textDecorationColor].find((s) => opaque(parse(s)));
    if (!raw) return null;
    const c = parse(raw), ground = painted(el.parentElement || el);
    return {
      cls: (el.getAttribute('class') || '').slice(0, 100), tag: el.tagName.toLowerCase(),
      w, raw, keylineContrast: opaque(ground) ? ratio(c, ground) : null,
      bg: cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? '' : cs.backgroundColor,
    };
  }).filter(Boolean);

  // Notices and states (DESIGN.md "Notices, status words, freshness" + "States"): a word plus an
  // INSET keyline on the page's own ground, no fill, heights by arithmetic (D98: one-line 48px,
  // two-line body 64px). Measured so a height reservation (min-h-*) is a number rather than a guess.
  const notices = all.map((el) => {
    const role = el.getAttribute('role');
    if (role !== 'status' && role !== 'alert') return null;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;                 // sr-only lines
    const cs = getComputedStyle(el);
    const ground = painted(el);
    const shadow = cs.boxShadow === 'none' ? '' : cs.boxShadow;
    // Computed box-shadow puts the colour FIRST and `inset` last, and a Tailwind inset-shadow utility
    // lands as a 0 0 0 1px spread ring: `oklch(0.655 0.03 152) 0px 0px 0px 1px inset`. Splitting on
    // top-level commas keeps the colour's own commas inside oklch()/rgba() out of the way.
    const layer = shadow.split(/,(?![^(]*\))/).find((s) => /\binset\b/.test(s)) ?? '';
    const thickness = layer ? Math.max(...(layer.match(/-?[\d.]+px/g) ?? []).map((x) => Math.abs(parseFloat(x)))) : 0;
    const sc = layer.match(/^\s*((?:oklch|oklab|lch|lab|rgb|rgba|hsl|hsla)\([^)]*\))/);
    return {
      role, h: +r.height.toFixed(1), w: +r.width.toFixed(1),
      cls: (el.getAttribute('class') || '').slice(0, 80),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      inset: thickness,
      keylineContrast: sc && opaque(ground) ? ratio(parse(sc[1]), ground) : null,
      fill: cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? '' : cs.backgroundColor,
      textContrast: opaque(ground) && parse(cs.color) ? ratio(parse(cs.color), ground) : null,
    };
  }).filter(Boolean);

  // nav (D100): one row at every width, `flex-wrap: nowrap`, and exactly one type tier per viewport.
  // The shipped nav was flex-col + flex-wrap, which clipped links; that defect is only visible if the
  // measurement looks at row tops rather than at whether the classes exist.
  const navEl = document.querySelector('nav');
  const nav = navEl ? {
    containers: [navEl, ...navEl.querySelectorAll('div')]
      .filter((d) => getComputedStyle(d).display === 'flex')
      .map((d) => ({ wrap: getComputedStyle(d).flexWrap, gap: getComputedStyle(d).columnGap })),
    links: [...navEl.querySelectorAll('a')].map((a) => {
      const r = a.getBoundingClientRect(), s = getComputedStyle(a);
      return {
        t: (a.getAttribute('aria-label') ?? a.textContent).trim().replace(/\s+/g, ' ').slice(0, 30),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1), cy: Math.round(r.top + r.height / 2),
        right: +r.right.toFixed(1), fs: s.fontSize, ff: s.fontFamily.split(',')[0].replace(/["']/g, ''),
      };
    }),
    row: (() => {
      // D100's arithmetic: `needed` = the row's width if nothing may wrap, `available` = the container's
      // content box. Summing each anchor's OWN scrollWidth (text extent, immune to flex shrink) plus
      // the row's column-gap is what makes this true when the row is already overflowing — row.scrollWidth
      // itself clamps to clientWidth, so it reads equal to available on every fitting width and lies
      // about the margin.
      const row = [navEl, ...navEl.querySelectorAll('div')]
        .find((d) => getComputedStyle(d).display === 'flex');
      if (!row) return null;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const leaves = [...navEl.querySelectorAll('a')];
      const needed = leaves.reduce((a, l) => a + l.scrollWidth, 0) + gap * Math.max(0, leaves.length - 1);
      return { needed: +needed.toFixed(1), available: row.clientWidth, gap };
    })(),
  } : null;

  // shadows: measured, because ratify said the shadow question could only be answered by measurement
  const shadows = all.map((el) => {
    const cs = getComputedStyle(el);
    return cs.boxShadow === 'none' ? null : {
      cls: (el.getAttribute('class') || '').slice(0, 80), tag: el.tagName.toLowerCase(),
      shadow: cs.boxShadow.slice(0, 120),
      elevation: +el.getBoundingClientRect().height.toFixed(1),
    };
  }).filter(Boolean);

  // text blocks: every element with its own text, at its rendered size — the only way to count how many
  // display steps a screen actually shows
  const text = all.map((el) => {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
    if (!own) return null;
    const cs = getComputedStyle(el);
    return {
      t: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 48),
      tag: el.tagName.toLowerCase(),
      fs: cs.fontSize, lh: cs.lineHeight, fw: cs.fontWeight,
      ff: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
      color: cs.color,
      contrast: ratio(parse(cs.color) || { r: 0, g: 0, b: 0, a: 1, lin: false }, painted(el)),
      measure: el.getBoundingClientRect().width > 0 ? Math.round(el.textContent.replace(/\s+/g, ' ').length / (el.getBoundingClientRect().width / (parseFloat(cs.fontSize) * 0.5))) : 0,
      cls: (el.getAttribute('class') || '').slice(0, 90),
    };
  }).filter(Boolean);

  // Snapshot the faces INSIDE report(). Taken at script-eval time it is always the pre-load state —
  // every face "unloaded" — and the gate then fails runs whose fonts loaded fine.

  const report = () => send({
    url: location.href, elapsedMs: Date.now() - T0,
    doc: {
      bg: getComputedStyle(document.body).backgroundColor,
      fg: getComputedStyle(document.body).color,
      ff: getComputedStyle(document.body).fontFamily.split(',')[0],
    },
    overflowX: document.documentElement.scrollWidth > innerWidth + 1
      ? document.documentElement.scrollWidth - innerWidth : 0,
    controls, bands, keylines, shadows, text,
    fonts: (() => { const a = []; document.fonts.forEach((f) => a.push(`${f.family} ${f.weight} ${f.style} ${f.status}`)); return a; })(),
    notices,
    nav,
  });

  // Measure AFTER the faces settle. A serif line box measured while PT Serif is still swapping in is
  // a fallback metric, and every height the gate reports would be a lie about the fallback stack.
  // document.fonts.ready alone is NOT enough: measured on this rig it resolves before the faces are
  // even requested (status still "loading"), so each ratified face is asked for by name first.
  // Bounded at 8s so a page that never finishes still posts instead of hanging the run; the gate then
  // fails the run with "never loaded" rather than reporting fallback heights as if they were real.
  const wantFaces = ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"'];
  const settle = () => document.fonts && document.fonts.load
    ? Promise.all(wantFaces.map((f) => document.fonts.load(f).then(() => {}, () => {})))
        .then(() => document.fonts.ready).then(() => {}, () => {})
    : Promise.resolve();
  Promise.race([settle(), new Promise((r) => setTimeout(r, 8000))]).then(report);
})();
