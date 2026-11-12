// rsvp-card-geometry.mjs — where the sign-up cluster sits on a built page, in page-absolute pixels.
//
//   node design/grill/serve-measure.mjs dist/client / design/grill/rsvp-card-geometry.mjs 1240 2800
//
// Run through serve-measure.mjs, not over file://, because the cluster is an Astro island and Firefox
// will not hydrate an island from a file:// document (measured 2026-11-11 by design/grill/probe-import.mjs,
// D281). The boxes reported here are the boxes the browser paints, and `hydrated` says whether the island
// had actually run when they were read.
(() => {
  // `client:visible` hydrates on intersection, so in a short viewport the island below the fold is still
  // asleep when this script runs. Poll for the hydration handle before measuring, with a hard stop, so the
  // flag reported is the state the crop was taken in rather than the outcome of a race.
  // @measured 2026-11-12 by `node design/grill/rsvp-card-shot.mjs --routes / --widths 1240`.
  const deadline = Date.now() + 8000;
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const clustersNow = () => [...document.querySelectorAll('[data-rsvp-cluster]')];
  const hydratedNow = () => clustersNow().every((c) => c.getAttribute('data-rsvp-hydrated') === 'yes');

  const post = () => {
    const clusters = clustersNow();
    const surfaces = [...document.querySelectorAll('[data-surface]')];
    const labels = clusters.flatMap((c) => [...c.querySelectorAll('[data-rsvp-platform]')].map((a) => ({
      platform: a.getAttribute('data-rsvp-platform'),
      text: a.textContent.replace(/\s+/g, ' ').trim(),
      box: box(a),
    })));
    fetch(window.__MEASURE_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        probe: 'rsvp-card-geometry',
        done: true,
        hydrated: hydratedNow(),
        waitedMs: Math.min(8000, Math.max(0, 8000 - (deadline - Date.now()))),
        docHeight: document.documentElement.scrollHeight,
        clusters: clusters.map((c) => ({
          date: c.getAttribute('data-rsvp-date'),
          state: c.getAttribute('data-rsvp-state'),
          preferred: c.getAttribute('data-rsvp-preferred'),
          box: box(c),
          text: c.textContent.replace(/\s+/g, ' ').trim(),
        })),
        labels,
        surfaces: surfaces.map((s) => ({ surface: s.getAttribute('data-surface'), box: box(s) })),
      }),
    }).catch(() => {});
  };

  (async () => {
    while (Date.now() < deadline && !hydratedNow()) await new Promise((r) => setTimeout(r, 200));
    post();
  })();
})();
