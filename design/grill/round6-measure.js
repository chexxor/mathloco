// Round-6 specimen probe: verify the control arithmetic, the target sizes, the nav fill, the row
// heights, and every text/background pair, in the browser rather than in the stylesheet.
window.__measure = async function () {
  const out = [];
  // Measure in the face the specimen claims, not the fallback. canvas measureText does not start a
  // webfont load, and DOMContentLoaded lands before the woff2 does - measured: an unawaited round-6
  // probe reported 0 of 3 faces loaded and identical metrics for every family, i.e. Georgia.
  for (const spec of ['400 16px "PT Serif"', '700 16px "PT Serif"', '500 16px "PSVar"', '600 12px "PSVar"']) {
    try { await document.fonts.load(spec); } catch (e) {}
  }
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 6000))]);
  const faces = [...document.fonts].filter((f) => f.status === 'loaded').length;
  out.push(`faces loaded: ${faces} of ${document.fonts.size}`);
  const px = (v) => Math.round(parseFloat(v) * 100) / 100;
  const can = document.createElement('canvas').getContext('2d');

  // Firefox resolves oklch() in getComputedStyle, but canvas only accepts sRGB grammar, so push the
  // colour through canvas to get the rendered bytes, then read them back. This is the same trick the
  // round-4 oracle uses, and it is what makes contrast claims about oklch tokens verifiable.
  function canon(c) {
    if (!c || c === 'transparent' || c === 'none') return null;
    can.clearRect(0, 0, 1, 1);
    can.fillStyle = '#000000';
    can.fillStyle = c;
    if (can.fillStyle === '#000000' && c.trim().toLowerCase() !== 'black' && c.trim().toLowerCase() !== '#000') return null;
    can.fillRect(0, 0, 1, 1);
    // hex (#rrggbb) for opaque, rgba() for translucent; a fully transparent surface must read as
    // "no background here, keep walking up" or the pair is measured against nothing (controls-measure.js
    // handles this with lumOf returning null; doing it here keeps the two oracles in agreement).
    const s = can.fillStyle;
    if (/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(s)) return null;
    return s;
  }
  function parse(c) {
    if (!c) return null;
    c = c.trim();
    if (c.startsWith('#')) {
      const h = c.slice(1);
      const f = (a, b) => parseInt(h.slice(a, b), 16) / 255;
      if (h.length === 3) return [f(0, 1), f(1, 2), f(2, 3), 1];
      if (h.length === 6) return [f(0, 2), f(2, 4), f(4, 6), 1];
      if (h.length === 8) return [f(0, 2), f(2, 4), f(4, 6), f(6, 8)];
      return null;
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1];
  }
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  function over(fg, bg) {
    const a = parse(canon(fg)), b = parse(canon(bg));
    if (!a || !b) return null;
    const c = [0, 1, 2].map((i) => a[i] * a[3] + b[i] * (1 - a[3]));
    const al = a[3] + b[3] * (1 - a[3]);
    const L = (v) => 0.2126 * lin(v[0]) + 0.7152 * lin(v[1]) + 0.0722 * lin(v[2]);
    const l1 = L(c), l2 = L(b);
    return px((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
  }
  function bgOf(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = canon(getComputedStyle(n).backgroundColor);
      if (c) return c;
    }
    return 'rgb(255, 255, 255)';
  }
  const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };

  // ---- 1. page-level overflow (round 5 caught the nav defect this way) -------------------------
  const de = document.documentElement;
  out.push(`viewport ${window.innerWidth}x${window.innerHeight} | documentElement scrollW ${de.scrollWidth} clientW ${de.clientWidth}` +
    (de.scrollWidth > de.clientWidth + 1 ? '  <-- PAGE OVERFLOWS' : ' | no page overflow'));
  const clipped = [];
  document.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el);
    if (!/hidden|clip/.test(cs.overflowX)) return;
    if (el.scrollWidth > el.clientWidth + 1) clipped.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} hides ${el.scrollWidth - el.clientWidth}px`);
  });
  out.push(clipped.length ? 'CLIPPED: ' + clipped.join('; ') : 'no element hides horizontal overflow');

  // ---- 2. control inventory -------------------------------------------------------------------
  const SEL = '.btn, .chip, .chipband, .tag, .nl, summary';
  const groups = new Map();
  document.querySelectorAll(SEL).forEach((el) => {
    const cs = getComputedStyle(el);
    const key = ((el.className || '').toString().trim().split(/\s+/).filter(Boolean).sort().join('+')) || el.tagName.toLowerCase();
    const [w, h] = box(el);
    const lh = px(cs.lineHeight);
    const pt = px(cs.paddingTop), pb = px(cs.paddingBottom);
    const bt = px(cs.borderTopWidth), bb = px(cs.borderBottomWidth);
    const arith = lh + pt + pb + bt + bb;
    const bg = bgOf(el);
    const pair = over(cs.color, bg);
    const rec = { w, h, lh, pt, pb, arith, fs: px(cs.fontSize), r: cs.borderTopLeftRadius, pair, n: 0 };
    if (!groups.has(key)) groups.set(key, rec);
    else groups.get(key).n++;
    rec.n++;
    if (Math.abs(arith - h) > 0.6) rec.mismatch = true;
  });
  out.push('', 'control            box      line+pad arithmetic  radius  contrast  24AA 44AAA');
  let nCtl = 0, exact = 0, ok24 = 0, ok44 = 0, minPair = 99;
  for (const [k, r] of groups) {
    nCtl += r.n; if (!r.mismatch) exact += r.n; if (r.h >= 24) ok24 += r.n; if (r.h >= 44) ok44 += r.n;
    if (r.pair !== null) minPair = Math.min(minPair, r.pair);
    out.push(`${k.padEnd(18)} ${String(r.w + 'x' + r.h).padEnd(9)} ${String(r.lh + ' + ' + r.pt + '/' + r.pb).padEnd(12)} = ${String(r.arith).padEnd(6)} ${String(r.r).padEnd(7)} ${String(r.pair ?? 'n/a').padEnd(9)} ${(r.h >= 24 ? 'y' : 'NO').padEnd(5)} ${r.h >= 44 ? 'y' : 'n'}` +
      (r.n > 1 ? ` (x${r.n})` : '') + (r.mismatch ? '  <-- ARITHMETIC MISMATCH' : ''));
  }

  out.push(`totals: ${nCtl} controls, arithmetic exact on ${exact}, >=24px on ${ok24}, >=44px on ${ok44}, lowest text contrast ${minPair}`);

  // ---- 3. nav fill inside each 375 frame ------------------------------------------------------
  out.push('', 'nav variant                          inner width  one-line needs  fits?  worst link target');
  document.querySelectorAll('.frame nav').forEach((nav) => {
    const label = nav.closest('.frame').dataset.opt || '?';
    const cs = getComputedStyle(nav);
    const inner = nav.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
    const kids = [...nav.children].filter((k) => k.textContent.trim().length > 0);
    const links = [...nav.querySelectorAll('a, summary')];
    let sum = 0, gaps = 0, worst = 999, names = [];
    kids.forEach((k) => {
      const r = k.getBoundingClientRect();
      sum += r.width;
      names.push(`${k.textContent.trim().slice(0, 12)}:${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    links.forEach((k) => { worst = Math.min(worst, k.getBoundingClientRect().height); });
    gaps = (kids.length - 1) * px(cs.columnGap);
    const need = sum + gaps;
    out.push(`nav ${label}                           ${String(inner).padEnd(12)} ${String(Math.round(need)).padEnd(15)} ${(need <= inner ? 'yes' : 'NO ').padEnd(6)} ${worst === 999 ? 'n/a' : worst + 'px'}   ${names.join(' ')}`);
  });

  // ---- 4. schedule rows ----------------------------------------------------------------------
  out.push('', 'row variant  height  date col  title size');
  document.querySelectorAll('.row').forEach((row) => {
    const v = ['compact', 'comfy', 'airy'].find((c) => row.classList.contains(c)) || 'base';
    const frame = row.closest('.frame');
    const t = row.querySelector('.t');
    out.push(`${(v + (frame.dataset.opt || '')).padEnd(12)} ${String(Math.round(row.getBoundingClientRect().height)).padEnd(7)} ${(row.querySelector('.d') ? Math.round(row.querySelector('.d').getBoundingClientRect().width) : '-')}     ${t ? px(getComputedStyle(t).fontSize) : '-'}`);
  });

  // ---- 5. every distinct text/background pair, incl. the band ---------------------------------
  const seen = new Map();
  document.querySelectorAll('main *').forEach((el) => {
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
    if (hasOwnText && el.offsetParent !== null) {
      const cs = getComputedStyle(el);
      const bg = bgOf(el);
      const key = `${cs.color}|${bg}`;
      if (seen.has(key)) return;
      const r = over(cs.color, bg);
      const box = el.getBoundingClientRect();
      seen.set(key, 1);
      const sz = px(cs.fontSize);
      out.push(`pair ${String(r).padEnd(7)} ${r >= 4.5 ? 'AA ' : (r >= 3 ? 'lg only' : 'FAIL')} ${sz >= 24 ? '(large)' : '      '} ${(box.width < 1 ? 'HIDDEN ' : '')}${(el.closest('[data-opt]') ? 'opt' + el.closest('[data-opt]').dataset.opt + ' ' : '')}${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 44)}`);
    }
  });

  // ---- 6. share card ratio -------------------------------------------------------------------
  const sh = document.querySelector('.share');
  if (sh) {
    const r = sh.getBoundingClientRect();
    out.push('', `share card box ${Math.round(r.width)}x${Math.round(r.height)} (source 1200x630, ratio ${Math.round((r.width / r.height) * 100) / 100} vs 1.90)`);
  }
  return { report: out.join('\n') };
};
