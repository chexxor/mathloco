// cluster-measure.js — the box the sign-up cluster paints, and what makes it wrap.
//
//   node design/grill/serve-measure.mjs dist/client <route> design/grill/cluster-measure.js <w> <h> [shot.png]
//   node design/grill/dist-measure.mjs dist/client <route> design/grill/cluster-measure.js <w>   (file://, islands do not hydrate)
//
// Why this exists separate from the render gate: DESIGN.md's cluster section quotes a box height per width
// ("32px at 1240, 640 and 390, 68px at 320 where the two labels wrap"). That sentence describes a two-label
// cluster; S022/D280 put a third platform on every date, so the sentence had to be re-measured or deleted
// (AGENTS.md: a doc line a measurement contradicts is corrected in the same commit). The render gate prints
// the cluster box but cannot say *why* it is taller at one width than another, and "it wraps" is a claim
// about line boxes, not about a rect. This probe answers both: the cluster rect, each label's rect, how many
// line boxes each label occupies (a.range is the number of line boxes the anchor paints), and the width of
// the lane the cluster is sitting in.
//
// It also prints the total height of the date surfaces, so a differential against a copy of dist with the
// clusters removed is two numbers rather than a hand edit.
(() => {
  const out = { done: false, probe: 'cluster-measure' };
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), x: +(r.x + scrollX).toFixed(1), y: +(r.y + scrollY).toFixed(1) };
  };
  const send = () => fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(out) }).catch(() => {});

  const clusters = [...document.querySelectorAll('[data-rsvp-cluster]')].map((el) => {
    const cs = getComputedStyle(el);
    const lane = el.closest('[data-copy], [data-surface]') || el.parentElement;
    return {
      date: el.getAttribute('data-rsvp-date') || '',
      state: el.getAttribute('data-rsvp-state') || '',
      box: rect(el),
      gapX: cs.columnGap, gapY: cs.rowGap,
      lane: lane ? rect(lane) : null,
      lines: [...el.querySelectorAll('a[data-rsvp-platform]')].map((a) => ({
        platform: a.getAttribute('data-rsvp-platform') || '',
        text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
        box: rect(a),
        lineBoxes: a.getClientRects().length,
        fontSize: cs.fontSize,
      })),
      note: (el.querySelector('p') || {}).textContent ? el.querySelector('p').textContent.replace(/\s+/g, ' ').trim() : null,
    };
  });

  out.pageHeight = document.documentElement.scrollHeight;
  out.viewport = { innerWidth, innerHeight };
  out.surfaces = [...document.querySelectorAll('[data-surface]')].map((el) => ({
    surface: el.getAttribute('data-surface'),
    box: rect(el),
  }));
  out.clusters = clusters;
  out.totalClusterHeight = +clusters.reduce((s, c) => s + c.box.h, 0).toFixed(1);
  out.done = true;
  send();
})();
