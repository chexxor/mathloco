// round12-measure.js — runs INSIDE the browser (design/grill/page-measure.mjs evaluates this file in the
// specimen), so import nothing and use plain DOM APIs. POST contract: { method:'POST', mode:'no-cors' }.
//
// What it proves: every crop in round-12-art.html is drawn at the slot size its card claims, the image
// inside it is delivered at that size, and nothing in the page overflows the document. A specimen the
// operator chooses artwork from is only useful if the box is the box on the site.
(() => {
  const boxes = [];
  for (const el of document.querySelectorAll('.box[data-slot]')) {
    const r = el.getBoundingClientRect();
    const img = el.querySelector('img');
    const ir = img && img.getBoundingClientRect();
    boxes.push({
      slot: el.dataset.slot,
      id: el.dataset.id,
      wantW: parseFloat(el.dataset.w),
      wantH: parseFloat(el.dataset.h),
      gotBoxW: +(r.width).toFixed(1),
      gotBoxH: +(r.height).toFixed(1),
      gotImgW: ir ? +ir.width.toFixed(1) : null,
      gotImgH: ir ? +ir.height.toFixed(1) : null,
      naturalW: img ? img.naturalWidth : 0,
      naturalH: img ? img.naturalHeight : 0,
      complete: img ? img.complete && img.naturalWidth > 0 : false,
    });
  }
  const doc = {
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    scrollH: document.documentElement.scrollHeight,
  };
  fetch(window.__MEASURE_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ done: true, boxes, doc }),
  });
})();
