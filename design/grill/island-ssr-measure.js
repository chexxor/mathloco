// island-ssr-measure.js - what the SHIPPED /chat island shows before its fetch resolves.
// The island is server-rendered, so the loading state is in the static HTML in dist/client; this
// measures that box (reserved height, motion, and what surrounds it) rather than reasoning about it.
// Run: node design/grill/artifact-measure.mjs --root dist/client --pages chat/index.html \
//        --probe design/grill/island-ssr-measure.js --widths 1240,375,320 --out design/grill/island-ssr/
window.__measure = function () {
  const px = (v) => Math.round(parseFloat(v) * 100) / 100;
  const box = (el) => { const r = el.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; };
  const out = [];
  const status = document.querySelector('[role="status"]');
  const spin = document.querySelector('.animate-spin');
  const sr = document.querySelector('.sr-only');
  // the astro island wrapper: data-island-uid is on both the marker and the component root
  const island = document.querySelector('[data-island-content], astro-island');
  out.push('--- SHIPPED /chat loading state, as server-rendered (measured in the browser) ---');
  if (status) {
    const cs = getComputedStyle(status);
    out.push(`role=status wrapper      box ${box(status)}  padding ${cs.padding}  (min-height not set: ${cs.minHeight})`);
  } else out.push('role=status wrapper      NOT PRESENT in the static HTML');
  if (spin) {
    const cs = getComputedStyle(spin);
    out.push(`spinner (.animate-spin)    box ${box(spin)}  border ${cs.borderTopWidth}/${cs.borderRightWidth}/${cs.borderBottomWidth}/${cs.borderLeftWidth}  animation "${cs.animationName}" ${cs.animationDuration} ${cs.animationIterationCount}`);
  } else out.push('spinner                  NOT PRESENT');
  if (sr) out.push(`sr-only text               box ${box(sr)}  "${sr.textContent.trim()}"`);
  if (island) out.push(`island host                ${island.tagName.toLowerCase()} box ${box(island)}  (the whole region the fetch replaces)`);
  const content = document.querySelector('main') || document.body;
  out.push(`page content below the fold at this width: body scrollHeight ${document.body.scrollHeight}`);
  // the shipped error/empty branches are NOT in the static HTML (they are behind the fetch), so
  // record that fact rather than pretending to measure it: the specimen reproduces their shape and
  // the contrast oracle measures their colour pairs.
  out.push('error branch in static HTML:   ' + (/Failed to load Discord summary/.test(document.body.innerHTML) ? 'present' : 'absent - only reachable after the fetch fails'));
  out.push('empty branch in static HTML:   ' + (/No channels available/.test(document.body.innerHTML) ? 'present' : 'absent - only reachable after the fetch resolves'));
  out.push('prefers-reduced-motion anywhere in the artifact css: ' + [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /reduced-motion/.test(r.cssText || '')); } catch (e) { return false; } }));
  out.push(`content column width ${Math.round(content.getBoundingClientRect().width)} at viewport ${window.innerWidth}`);
  return { report: out.join('\n'), lines: out };
};
