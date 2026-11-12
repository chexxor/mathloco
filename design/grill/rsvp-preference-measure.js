// rsvp-preference-measure.js — the probe behind `npm run check:rsvp-preference` (S022, D281).
//
// It answers the one question no byte-level gate can: does the sign-up cluster ACTUALLY reorder in a
// real browser for a visitor whose browser remembers a platform, and does a click on one row reorder
// the other rows too?
//
//   node design/grill/serve-measure.mjs dist/client <route> design/grill/rsvp-preference-measure.js <w> <h>
//   ... [--prelude <file>]        # a classic inline <script> injected before this one; the gate uses it
//                                 # to put a value in localStorage BEFORE any island hydrates.
//
// Two facts this probe depends on, both measured here on 2026-11-11 (Linux, native, Firefox 159.0):
//   1. an Astro island cannot hydrate on a file:// page — Firefox refuses `import()` and `fetch()` from
//      a file:// document — so this probe runs through design/grill/serve-measure.mjs, not dist-measure.mjs;
//   2. `client:visible` hydrates on intersection, and the homepage cluster sits at y≈2280 while headless
//      Firefox's viewport is 682px tall at `--window-size 1240,1400`. An island below the fold therefore
//      never hydrates unless the probe scrolls it into view: measured 200ms from scroll to
//      `data-rsvp-hydrated="yes"`.
//
// Sequence, all reported in one POST:
//   1. scroll every cluster into view and wait for hydration (bounded);
//   2. snapshot the order as hydrated (`orderAfterSeed`);
//   3. dispatch the window event a click produces, to prove the rows on a page sync (`orderAfterEvent`);
//   4. dispatch a real click on a link with navigation prevented, to prove the click handler itself
//      writes localStorage and reorders (`orderAfterClick`, `storedAfterClick`).
//
// Nothing leaves the machine: the only network involved is the loopback harness.
(() => {
  const T0 = Date.now();
  const out = { done: false, probe: 'rsvp-preference', errors: [], warnings: [] };

  const send = (payload) => {
    out.done = true;
    Object.assign(out, payload);
    fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(out) }).catch(() => {});
  };

  const PREF = window.__RSVP_PREF_KEY;
  if (!PREF) { out.errors.push('the probe needs window.__RSVP_PREF_KEY — pass --prelude with the key the island reads'); send(out); return; }

  const readStored = () => { try { return localStorage.getItem(PREF); } catch (e) { return `localStorage threw: ${e.message}`; } };
  const clusterEls = () => [...document.querySelectorAll('[data-rsvp-cluster]')];
  const orderOf = (el) => [...el.querySelectorAll('a[data-rsvp-platform]')].map((a) => a.getAttribute('data-rsvp-platform'));
  const snapshot = () => clusterEls().map((el) => ({
    date: el.getAttribute('data-rsvp-date') || '',
    state: el.getAttribute('data-rsvp-state') || '',
    preferred: el.getAttribute('data-rsvp-preferred') || null,
    hydrated: el.getAttribute('data-rsvp-hydrated') || null,
    order: orderOf(el),
  }));

  const waitUntil = (test, ms) => new Promise((resolve) => {
    const t0 = Date.now();
    const poll = (n) => {
      if (test()) return resolve({ ok: true, ms: Date.now() - t0, polls: n });
      if (Date.now() - t0 > ms) return resolve({ ok: false, ms: Date.now() - t0, polls: n });
      setTimeout(() => poll(n + 1), 100);
    };
    poll(0);
  });

  const run = async () => {
    out.viewport = { innerWidth, innerHeight, docHeight: document.documentElement.scrollHeight };
    out.seed = readStored();

    const clusters = clusterEls();
    if (!clusters.length) { out.errors.push('no [data-rsvp-cluster] in the served page — did the build run?'); send(out); return; }

    // client:visible only hydrates what is in the viewport, so bring each cluster into view.
    const hydration = [];
    for (const el of clusters) {
      const top = el.getBoundingClientRect().top;
      window.scrollTo(0, Math.max(0, Math.round(top) - 300));
      const r = await waitUntil(() => el.getAttribute('data-rsvp-hydrated') === 'yes', 6000);
      hydration.push({ date: el.getAttribute('data-rsvp-date') || '', scrolledTo: Math.round(scrollY), ...r });
    }
    out.hydration = hydration;
    if (hydration.some((h) => !h.ok)) {
      out.errors.push('an island never hydrated: the reorder cannot be tested on a page whose islands do not run');
      send(out);
      return;
    }

    out.orderAfterSeed = snapshot();

    // Cross-row sync, exercised the way a click exercises it. The dispatched platform is reported so the
    // gate can assert against the platform the probe SENT rather than the platform the islands happen to
    // report: a broken listener name leaves `data-rsvp-preferred` at the seeded value, so reading it back
    // would make the island look self-consistent while the event never reached anyone
    // @measured 2026-11-12 by `npm run check:rsvp-preference:selftest`.
    const DISPATCH = 'Discord';
    out.dispatch = DISPATCH;
    window.dispatchEvent(new CustomEvent('rsvp-platform', { detail: DISPATCH }));
    await new Promise((r) => setTimeout(r, 200));
    out.orderAfterEvent = snapshot();

    // The click path itself: navigation is stopped in the capture phase so headless Firefox never
    // tries to open an external tab; the inline handler still runs, and that is the line being tested.
    document.addEventListener('click', (e) => e.preventDefault(), true);
    const links = clusterEls().flatMap((el) => [...el.querySelectorAll('a[data-rsvp-platform]')]);
    const clicked = links.find((a) => a.getAttribute('data-rsvp-platform') === 'Meetup') || links[0];
    if (!clicked) { out.errors.push('no sign-up link found to click'); send(out); return; }
    const ownCluster = clicked.closest('[data-rsvp-cluster]');
    out.clicked = {
      platform: clicked.getAttribute('data-rsvp-platform'),
      href: clicked.getAttribute('href'),
      date: ownCluster ? ownCluster.getAttribute('data-rsvp-date') : '',
    };
    clicked.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 200));
    out.orderAfterClick = snapshot();
    out.storedAfterClick = readStored();

    // Scroll back to the top so an optional screenshot shows the page from the top, the same convention
    // render-measure.js keeps for its pixel probes.
    window.scrollTo(0, 0);
    out.elapsedMs = Date.now() - T0;
    send(out);
  };

  run().catch((e) => { out.errors.push(e.message); send(out); });
})();
