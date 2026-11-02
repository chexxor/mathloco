// round10-measure.js — runs INSIDE the browser (design/grill/page-measure.mjs loads the specimen and
// evaluates this file), so do not import anything and use only standard DOM APIs.
//
// What it checks is not the live page but the SPECIMEN: every box in round-10-photos.html carries the number
// it claims (data-w/data-h) and the scale it is drawn at, so a diagram that lies about the page it is
// standing in for is detectable rather than decorative. The harness's POST contract matters:
// { method: 'POST', mode: 'no-cors' } — see .notes/runbooks/design-round-specimen-measurement.md.
(() => {
  const out = [];
  for (const el of document.querySelectorAll('[data-slot]')) {
    const r = el.getBoundingClientRect();
    out.push({
      id: el.dataset.slot,
      scale: parseFloat(el.dataset.scale),
      wantW: parseFloat(el.dataset.w),
      wantH: parseFloat(el.dataset.h),
      gotW: r.width,
      gotH: r.height,
    });
  }
  const pages = [];
  for (const el of document.querySelectorAll('[data-page]')) {
    const r = el.getBoundingClientRect();
    pages.push({ w: parseFloat(el.dataset.page), wantH: parseFloat(el.dataset.h), scale: parseFloat(el.dataset.scale), gotW: r.width, gotH: r.height });
  }
  const gaps = [];
  for (const el of document.querySelectorAll('[data-gap]')) {
    gaps.push({ want: parseFloat(el.dataset.gap), got: el.getBoundingClientRect().height });
  }
  fetch(window.__MEASURE_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ done: true, slots: out, pages, gaps }),
  });
})();
