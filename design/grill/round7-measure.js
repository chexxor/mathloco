// round7-measure.js - the PATTERNS specimen probe.
//
// Run: node design/grill/artifact-measure.mjs --root design --pages grill/round-7.html --probe
//        design/grill/round7-measure.js --widths 1240,900,375,320 --out design/grill/round7/
//
// What it asserts, and why each one is falsifiable rather than descriptive:
//   * every option frame's WORST text/background pair, measured off what is painted (effective bg
//     walked up the tree) rather than off the token name - so a specimen that quietly loses a token
//     reports a number, not an intention;
//   * planted controls: a frequency claim in prose copy, gold-on-tint, a bordered box, and the shipped
//     shadow alpha. The probe prints CONTROLS n/4 and a hard FAIL line if any control is missed, which
//     is what makes the clean rows mean something;
//   * notices, status chips and buttons carry their keyline as an INSET SHADOW and have no border, and
//     every control target clears 24 (44 where the specimen claims it);
//   * prose slots contain no frequency claim (D92) - series names and event titles are exempt, because
//     "Bimonthly Social" is the club's own title, not a cadence assertion.
window.__measure = async function () {
  for (const spec of ['400 16px "PT Serif"', '700 16px "PT Serif"', '500 16px "PSVar"', '600 13.3px "PSVar"']) {
    try { await document.fonts.load(spec); } catch (e) {}
  }
  await Promise.race([document.fonts.ready, new Promise((r) => { void r; })]);
  const lines = [];
  const faces = ['PT Serif', 'PSVar'].map((f) => `${f} ${document.fonts.check(`400 16px "${f}"`) ? 'LOADED' : 'FALLBACK'}`);
  lines.push(`faces: ${faces.join(', ')}   viewport ${innerWidth}`);
  // page-level overflow: round 5 caught the nav defect this way, and this page puts wide tables and a
  // 320px frame next to each other, so it is the first thing that would break.
  const de = document.documentElement;
  const over = [];
  const scrolled = (n) => { for (let p = n.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
  document.querySelectorAll('main *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > innerWidth + 1 && !scrolled(el)) over.push(`${el.tagName.toLowerCase()}.${typeof el.className === 'string' ? el.className.split(' ')[0] : ''}x${Math.round(r.width)}`);
  });
  lines.push(`overflow: documentElement scrollW ${de.scrollWidth} vs clientW ${de.clientWidth}${de.scrollWidth > de.clientWidth + 1 ? '  <<< PAGE OVERFLOWS' : ' (clean)'}; ${over.length} element(s) wider than the viewport outside a scroller${over.length ? ' [' + over.slice(0, 6).join(', ') + ']' : ''}`);

  // ---- colour: canonicalise through canvas (getComputedStyle keeps oklch grammar in Firefox) ----
  const can = document.createElement('canvas').getContext('2d');
  const canon = (c) => { can.fillStyle = '#000000'; can.fillStyle = String(c); return can.fillStyle; };
  const parse = (s) => {
    const hex = s.match(/^#([0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hex) { if (hex[1].length === 8 && hex[1].slice(6) === '00') return null; const v = [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16) / 255); return { v, a: 1 }; }
    const m = s.match(/^rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[\s,\/]+/).map(parseFloat).filter((x) => !Number.isNaN(x));
    if (p.length < 3) return null; if (p.length > 3 && p[3] === 0) return null;
    return { v: [p[0] / 255, p[1] / 255, p[2] / 255], a: p.length > 3 ? p[3] : 1 };
  };
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (c) => 0.2126 * lin(c.v[0]) + 0.7152 * lin(c.v[1]) + 0.0722 * lin(c.v[2]);
  const tok = (name) => { const s = document.createElement('span'); s.style.color = `var(--${name})`; document.body.appendChild(s); const c = parse(canon(getComputedStyle(s).color)); s.remove(); return c; };
  const effBg = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = parse(canon(getComputedStyle(n).backgroundColor));
      if (c) return { c, from: n.tagName.toLowerCase() + (typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : '') };
    }
    return { c: { v: [1, 1, 1], a: 1 }, from: 'page-default' };
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); const hi = Math.max(x, y), lo = Math.min(x, y); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };

  // ---- self-check: this file's luminance math against the renderer oracle's numbers, so a clean ----
  // ---- report is not an artefact of a typo in here. Want: gold 4.82, ink-3 5.21, ink-2 7.02.       ----
  const self = [['gold-ink', 4.82], ['ink-3', 5.21], ['ink-2', 7.02]].map(([n, want]) => {
    const got = ratio(tok(n), tok('paper')); return `${n}/paper ${got} want ${want} ${Math.abs(got - want) <= 0.05 ? 'ok' : '<<< MISMATCH'}`;
  });
  lines.push(`oracle cross-check: ${self.join(' | ')}`);

  // ---- arithmetic claims: the page asserts these heights in prose, so the probe checks them ----
  const claims = [];
  const n1 = document.querySelector('[data-claim="notice1"]');
  if (n1) {
    const cs = getComputedStyle(n1);
    const box = Math.round(n1.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
    const total = Math.round(n1.getBoundingClientRect().height);
    claims.push(`one-line notice: content ${box}px want 24, pads ${cs.paddingTop}/${cs.paddingLeft}, total ${total}px want 48 ${box === 24 && total === 48 ? 'PASS' : 'FAIL'}`);
  }
  const ln = document.querySelector('[data-claim="line"]');
  if (ln) { const cs = getComputedStyle(ln); const h = Math.round(ln.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth)); claims.push(`loading line box ${h}px want 24 (separator border excluded) ${h === 24 ? 'PASS' : 'FAIL'}`); }
  for (const c of document.querySelectorAll('.status')) { const h = Math.round(c.getBoundingClientRect().height); claims.push(`status chip ${h}px want 24 ${h === 24 ? 'PASS' : 'FAIL'}`); }
  const h = (el) => (el ? Math.round(el.getBoundingClientRect().height) : null);
  const ra = document.querySelector('[data-claim="row-a"]'), rb = document.querySelector('[data-claim="row-b"]'), rc = document.querySelector('[data-claim="row-c"]');
  if (ra && rb && rc) {
    const [A, B, C] = [h(ra), h(rb), h(rc)];
    claims.push(`stacked row: no status ${A} / chip ${B} (+${B - A}) / word ${C} (+${C - A}) ${C === A ? 'PASS: the WORD reflows nothing, the chip costs a line' : 'FAIL: neither form is free'}`);
  }
  // the equality claim only applies where the status COLUMN exists (the 700px container query fired);
  // below that the same rows are stacked and their heights differ for text reasons, not status reasons
  const wr = ['row-w1', 'row-w2', 'row-w3'].map((c) => document.querySelector(`[data-claim="${c}"]`));
  if (wr.every(Boolean)) {
    const cols = (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length;
    if (cols(wr[0]) === 4) {
      const W = wr.map(h);
      claims.push(`wide rows (4 grid tracks, status column live): ${W.join('/')} ${W[0] === W[1] && W[1] === W[2] ? 'PASS (identical: scheduled, cancelled, no clock)' : 'FAIL'}`);
    } else claims.push(`wide specimen stacked at this width (${cols(wr[0])} tracks) - status column not in play, heights not comparable`);
  }
  lines.push(`arithmetic: ${claims.join(' | ')}`);
  const pair = (el) => { const fg = parse(canon(getComputedStyle(el).color)); if (!fg) return null; const bg = effBg(el); return { r: ratio(fg, bg.c), bg: bg.from }; };

  // ---- keyline arithmetic: inset shadow yes, border no ----
  const boxed = [...document.querySelectorAll('.notice, .status, .btn:not(.b-quiet), .chip, .skel, .sh1, .sh2, .shship, .shshipmd, .card-rule')];
  const bordered = boxed.filter((el) => parseFloat(getComputedStyle(el).borderTopWidth) > 0 && !el.hasAttribute('data-control'));
  // only these must carry a keyline; the primary button is a FILL (the band), so it has none by design
  const must = [...document.querySelectorAll('.notice, .status, .card-rule, .chip, .skel, .b-secondary')].filter((el) => !el.hasAttribute('data-control'));
  const missing = must.filter((el) => getComputedStyle(el).boxShadow === 'none');
  if (missing.length) lines.push('  MISSING keyline: ' + missing.map((el) => `${el.className}:${(el.textContent || '').trim().slice(0, 14)}`).join(' | '));
  lines.push(`\nkeyline: ${boxed.length} keylined specimens (quiet buttons excluded - they carry no keyline), ${bordered.length} with a real border (want 0 + 1 planted), ${missing.length} of ${must.length} that must carry one are missing it (want 0)`);

  // ---- target sizes ----
  const controls = [...document.querySelectorAll('.btn, .chip, .status')];
  const sizes = controls.map((el) => ({ el, r: el.getBoundingClientRect() }));
  const minH = Math.min(...sizes.map((s) => Math.round(s.r.height)));
  const under24 = sizes.filter((s) => Math.round(s.r.height) < 24).map((s) => `${(s.el.textContent || '').trim().slice(0, 18)}:${Math.round(s.r.height)}`);
  const hist = [24, 32, 40, 48].map((x) => `${x}:${sizes.filter((s) => Math.round(s.r.height) === x).length}`).join(' ');
  const empt = [...document.querySelectorAll('.empty')].map((el) => Math.round(el.getBoundingClientRect().height));
  lines.push(`targets: ${sizes.length} controls, min ${minH}px, ${under24.length} under 24 ${under24.length ? '[' + under24.join(', ') + ']' : ''}, ladder histogram ${hist} (48 = the AAA bar)`);
  lines.push(`empty states: ${empt.join(' / ')} (the sentence-only option is the short one)`);

  // ---- worst painted text pair per option frame ----
  lines.push('\nper-frame worst text pair (measured off what is painted, bar 4.5):');
  for (const frame of document.querySelectorAll('[data-opt]')) {
    let worst = null;
    for (const el of frame.querySelectorAll('.nb, .eb, .et, .nm, .asof, .nw, .st, .t, .m, .d, p, span, a')) {
      const txt = (el.textContent || '').trim();
      if (!txt || el.children.length) continue;
      const p = pair(el);
      if (!p) continue;
      if (!worst || p.r < worst.r) worst = { r: p.r, txt: txt.slice(0, 40), bg: p.bg };
    }
    lines.push(`  ${frame.dataset.opt.padEnd(3)} ${worst ? `${String(worst.r).padStart(6)}  "${worst.txt}"  on ${worst.bg}  ${worst.r >= 4.5 ? 'PASS' : 'FAIL'}` : 'no leaf text'}`);
  }

  // ---- the notice / status component shape ----
  const notices = [...document.querySelectorAll('.notice')];
  lines.push(`\nnotices: ${notices.length}; padding set(s): ${[...new Set(notices.map((n) => getComputedStyle(n).paddingTop + '/' + getComputedStyle(n).paddingLeft))].join(' ')}; heights ${notices.map((n) => Math.round(n.getBoundingClientRect().height)).join(', ')}`);
  const chips = [...document.querySelectorAll('.status')];
  lines.push(`status chips: ${chips.length}; heights ${chips.map((c) => Math.round(c.getBoundingClientRect().height)).join(', ') || 'none at this width'}; font-size ${chips.length ? getComputedStyle(chips[0]).fontSize : '-'} (11.1 = the T3 step below --s-1)`);
  const load = document.querySelector('[role="status"]');
  if (load) lines.push(`loading line: ${Math.round(load.getBoundingClientRect().height)}px tall, "${load.textContent.trim()}"`);
  const arc = document.querySelector('.spinner');
  if (arc) lines.push(`shipped arc reproduced: ${arc.offsetWidth}x${arc.offsetHeight} (offset box: a rotating element's getBoundingClientRect is its rotated AABB, up to 1.41x), animation ${getComputedStyle(arc).animationName} ${getComputedStyle(arc).animationDuration} (the specimen also carries a prefers-reduced-motion override: ${[...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /reduced-motion/.test(r.cssText || '')); } catch (e) { return false; } })})`);

  // ---- shadows: the alpha in the painted shadow vs the solved contact floor ----
  const shadows = [...document.querySelectorAll('.shship, .shshipmd, .sh1, .sh2')].map((el) => {
    const bs = getComputedStyle(el).boxShadow;
    const alphas = [...bs.matchAll(/rgba\([^)]*?,\s*([\d.]+)\)/g)].map((m) => parseFloat(m[1]));
    const max = Math.max(...alphas);
    return { cls: el.className, max, verdict: max >= 0.165 ? 'clears the solved ink-tinted floor (.165 -> 1.35)' : max >= 0.13 ? 'clears the black floor (.13 -> 1.35)' : 'UNDER the 1.35 layer bar (decoration)' };
  });
  lines.push('\nshadows (renderer solve: black .13 / ink .165 at the contact edge = 1.35):');
  for (const s of shadows) lines.push(`  ${String(s.cls).padEnd(22)} max alpha ${s.max.toFixed(3)}  ${s.verdict}`);

  // ---- planted controls: the probe is only trustworthy if these go red ----
  let found = 0, total = 0;
  const note = (s) => lines.push('  ' + s);
  total++; {
    const banned = /\b(weekly|every week|every other (week|month)|biweekly|fortnightly|monthly|twice a month|once a month)\b/i;
    const slots = [...document.querySelectorAll('.empty .eb, .empty .et, .notice .nb, .asof, .nm')].map((el) => (el.textContent || '').trim()).filter(banned.test.bind(banned));
    note(`control 1 (frequency claim, D92): ${slots.length ? 'FOUND -> ' + JSON.stringify(slots[0].slice(0, 60)) : 'MISSED'}`);
    if (slots.length) found++;
  }
  total++; {
    const el = document.querySelector('[data-control="banned-pair"]');
    const p = el && pair(el);
    note(`control 2 (gold on a tint fill): ${p && p.r < 4.5 ? `FOUND -> ${p.r}` : 'MISSED'}`);
    if (p && p.r < 4.5) found++;
  }
  total++; {
    const el = document.querySelector('[data-control="bordered"]');
    const has = el && parseFloat(getComputedStyle(el).borderTopWidth) > 0;
    note(`control 3 (a bordered box breaking the height arithmetic): ${has ? 'FOUND -> border ' + getComputedStyle(el).borderTopWidth : 'MISSED'}`);
    if (has) found++;
  }
  total++; {
    const s = shadows.find((x) => /shship/.test(x.cls));
    note(`control 4 (the shipped shadow under the layer bar): ${s && s.max < 0.13 ? `FOUND -> alpha ${s.max}` : 'MISSED'}`);
    if (s && s.max < 0.13) found++;
  }
  lines.push(`\nCONTROLS ${found}/${total}${found === total ? '' : '  <<< PROBE IS NOT WORKING: a control did not defect'}`);
  return { report: lines.join('\n'), controls: { found, total } };
};
