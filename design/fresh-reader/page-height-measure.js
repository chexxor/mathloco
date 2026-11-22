// page-height-measure.js — the settled document height of a built page, nothing else.
//
// Injected into a BUILT page by design/fresh-reader/capture.mjs (same harness contract as the render
// gate: faces before numbers, one POST to window.__MEASURE_ENDPOINT, `done: true`).
//
// Why a payload of its own: capture.mjs has to ask the page how tall it is **before** it photographs
// it, because a screenshot whose frame is shorter than the document measures a different page
// (record 0015, and design/grill/shot-height.mjs is the rule that enforces it). The existing payloads
// report geometry they were written for and would not survive being read for a height; a payload that
// reports one number cannot be wrong about anything else.
(() => {
  const out = { done: false, errors: [], height: 0, width: 0, facesLoaded: false, title: "" };
  let sent = false;
  const send = () => {
    if (sent) return;
    sent = true;
    return fetch(window.__MEASURE_ENDPOINT, { method: "POST", mode: "no-cors", body: JSON.stringify(out) });
  };
  window.addEventListener("error", (e) => { out.errors.push("onerror: " + e.message); out.done = true; send(); });

  (async () => {
    try {
      await document.fonts.ready;
      out.facesLoaded = true;
      // One tick more, so an island that reorders on hydration has finished before the height is taken.
      await new Promise((r) => setTimeout(r, 250));
      const d = document.documentElement, b = document.body;
      out.height = Math.ceil(Math.max(d.scrollHeight, d.offsetHeight, b ? b.scrollHeight : 0));
      out.width = Math.max(d.clientWidth, d.scrollWidth);
      out.title = document.title;
    } catch (e) {
      out.errors.push("measure threw " + e.message);
    }
    out.done = true;
    send();
  })();
})();
