// row-measure.js — the browser-side script design/schedule-geometry.mjs injects into a built page.
//
// It answers one question the width surveys do not: is a schedule *row* still the same object as the
// homepage's next-date card? Both are leaf · copy · plate, so the comparison is the boxes those three parts
// land in, per row, at a given viewport. Everything here is a getBoundingClientRect in document
// coordinates; the judging happens in the runner, which is where a re-run can print a diff.
//
// [data-surface] is the handle the markup publishes for this: "preview" on the homepage card, "row" on a
// row of the list. It exists so this probe does not have to re-derive "is this a schedule row" from class
// names, which are exactly what a spacing ruling edits (D173 lesson, learned here from a space-y-6 to
// space-y-4 change that silently un-matched two selftest plantings).
(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const surfaces = [...document.querySelectorAll('[data-surface]')].map((el) => ({
    surface: el.getAttribute('data-surface'),
    card: box(el),
    leaf: box(el.querySelector('[data-leaf]')),
    copy: box(el.querySelector('[data-copy]')),
    plate: box(el.querySelector('[data-slot="PS-4"]')),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
  }));
  // `done: true` is the harness's stop flag: design/grill/page-measure.mjs prints whatever arrives and only
  // exits 0 when the posted object carries it. A probe that posts results without it prints its numbers and
  // then sits until the 30-second timer calls it a timeout (measured 2026-11-07, Linux, Firefox 158.0.1) -
  // which reads as a broken page and sends you looking for a bug that is not there.
  fetch(window.__MEASURE_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ done: true, surfaces, pageHeight: document.documentElement.scrollHeight, vw: innerWidth }),
  });
})();
