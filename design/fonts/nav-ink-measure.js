// nav-ink-measure.js - two measurements round 5 needs and cannot get from a font catalogue:
//  1. how wide the real nav row is per candidate chrome face at 375px (the live site's nav overflows today);
//  2. whether a display serif at Tailwind's paired line height makes adjacent lines' ink collide, using the
//     font's own ink box rather than an assumed one.
const CHROME = ['PT Serif', 'PT Sans', 'Public Sans', 'Public Sans Var', 'Source Sans 3', 'IBM Plex Sans', 'Inter', 'system-ui'];
const BRAND = 'Minneapolis Math Book Club';
const LINKS = ['Schedule', 'Events', 'Interests', 'About'];
const out = { nav: [], collision: [] };

(async () => {
  for (const f of CHROME) { try { await document.fonts.load(`400 14px "${f}"`); await document.fonts.load(`700 20px "${f}"`); } catch (e) {} }

  // a nav row at 375 with 16px side padding, 14px links, 6px radius chips-free links, 14px gap - as round 4 built it
  for (const f of CHROME) {
    const box = document.createElement('div');
    box.style.cssText = 'box-sizing:border-box;position:absolute;left:0;top:-9999px;width:375px;padding:0 16px;display:flex;gap:14px;align-items:center;white-space:nowrap;font-size:14px;font-family:"' + f + '"';
    box.innerHTML = '<span style="font-size:19px;font-weight:700">' + BRAND + '</span>' + LINKS.map((l) => '<span>' + l + '</span>').join('');
    document.body.appendChild(box);
    const need = box.scrollWidth, have = box.clientWidth; // border-box now: 375 total, 343 available
    // now with wrapping allowed
    box.style.flexWrap = 'wrap';
    const wrappedH = box.getBoundingClientRect().height;
    box.remove();
    out.nav.push({ face: f, neededPx: need, availablePx: have, overflows: need > have, wrappedHeightPx: Math.round(wrappedH) });
  }

  // ink collision: measure the real ink extents of the heaviest display string, then compare to the leading
  const c = document.createElement('canvas').getContext('2d');
  for (const [fam, wt] of [['PT Serif', 700], ['PT Serif', 400], ['PT Sans', 700], ['Public Sans Var', 700]]) {
    try { await document.fonts.load(`${wt} 60px "${fam}"`); } catch (e) {}
    c.font = `${wt} 60px "${fam}"`;
    const up = c.measureText('Typographic');   // ascenders + cap + descender
    const ink = { above: Math.round(up.actualBoundingBoxAscent * 10) / 10, below: Math.round(up.actualBoundingBoxDescent * 10) / 10 };
    for (const lead of [0.98, 1.0, 1.05, 1.1, 1.15, 1.2]) {
      out.collision.push({
        face: fam, weight: wt, leadingRatio: lead, leadingPx: Math.round(60 * lead * 10) / 10,
        inkAbove: ink.above, inkBelow: ink.below,
        // a descender collides with the next line's ascender when inkBelow + inkAbove(next baseline gap) exceeds the line box
        overlapPx: Math.round((ink.above + ink.below - 60 * lead) * 10) / 10,
      });
    }
  }
  fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ ...out, done: true }) });
})();
