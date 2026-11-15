/* global axe */
// axe-run.js — run axe-core's rule engine inside the Firefox the render gate already uses.
// The wrapper (design/axe-check.mjs) injects a --prelude that appends axe.min.js as a script; this
// probe waits for it, runs the rules, and posts the result to the harness endpoint.
//
// Scratch by design: axe is NOT a dependency of this repo. The round-3 read's criterion 10 asks for
// "axe-core: zero violations"; the verdict on adopting it is written in
// docs/reply-to-the-design-read-2026-11-15.md, and the numbers there came from this probe.
(async () => {
  const send = (p) => fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(Object.assign(p, { done: true })) });
  // `waited < 80` with a 100ms step waited ONE iteration, and the 652 KB axe.min.js copy takes longer
  // than that to parse (measured 2026-11-15: the run posted nothing after 3 firefox spawns, because the
  // probe had given up after 100 ms). The budget is 8 s, in ms.
  let waited = 0;
  while (typeof window.axe === 'undefined' && waited < 8000) {
    await new Promise((r) => setTimeout(r, 100));
    waited += 100;
  }
  if (typeof window.axe === 'undefined') { send({ error: `axe.min.js never loaded within ${waited}ms (prelude not injected, or file missing)` }); return; }
  const t0 = Date.now();
  try {
    const r = await axe.run(document);
    send({
      vw: innerWidth,
      axeVersion: axe.version,
      loadMs: waited,
      runMs: Date.now() - t0,
      violations: r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        why: v.failureSummary || v.help || '',
        first: v.nodes[0] ? ((v.nodes[0].target || []).join(' ') + ' :: ' + String(v.nodes[0].html || '').slice(0, 140)) : '',
      })),
      incomplete: r.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length, why: (v.failureSummary || (v.nodes[0] ? v.nodes[0].html || '' : '')).slice(0, 120) })),
      passes: r.passes.length,
      rulesRun: r.passes.length + r.violations.length + r.incomplete.length,
    });
  } catch (e) {
    send({ error: String(e && e.message ? e.message : e) });
  }
})();
