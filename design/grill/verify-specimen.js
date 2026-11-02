// verify-specimen.js - prove a preview rendered in the faces it claims to, before its verdict is trusted.
// A CLEAN layout probe means nothing if the woff2 files failed to load: the page still measures fine in the
// fallback face. So this reads back, per specimen, which family is in effect and how wide a probe string is in it.
//   node design/grill/page-measure.mjs design/grill/round-5.html design/grill/verify-specimen.js 1240 2000
const SEL = '.page';
const REF = { 'PT Serif': null, 'PT Sans': null, 'PSVar': null, 'IBM Plex Mono': null };

(async () => {
  for (const f of Object.keys(REF)) {
    try { await document.fonts.load(`400 16px "${f}"`); } catch (e) {}
    const c = document.createElement('canvas').getContext('2d');
    c.font = `400 16px "${f}"`;
    REF[f] = Math.round(c.measureText('Schedule Events').width * 10) / 10;
  }

  const specimens = [...document.querySelectorAll(SEL)].map((p) => {
    const link = p.querySelector('nav a');
    const h4 = p.querySelector('h4');
    const kick = p.querySelector('.kick');
    const date = p.querySelector('.row .d');
    const probe = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const s = document.createElement('span');
      s.style.cssText = `position:absolute;left:-9999px;white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight}`;
      s.textContent = 'Schedule Events';
      document.body.appendChild(s);
      const w = Math.round(s.getBoundingClientRect().width * 10) / 10;
      s.remove();
      return { declared: cs.fontFamily.split(',')[0].replace(/"/g, ''), px: cs.fontSize, weight: cs.fontWeight, probeWidth: w };
    };
    const nav = p.querySelector('nav');
    return {
      cls: [...p.classList].join(' '),
      navHeightPx: Math.round(nav.getBoundingClientRect().height),
      navOverflowPx: nav.scrollWidth - nav.clientWidth,
      nav: probe(link), heading: probe(h4), kicker: probe(kick), date: probe(date),
    };
  });

  const loaded = {};
  for (const f of Object.keys(REF)) loaded[f] = document.fonts.check(`400 16px "${f}"`) && document.fonts.check(`700 16px "${f}"`);

  fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ reference: REF, loaded, specimens, done: true }) });
})();
