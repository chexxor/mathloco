// fold-answers.js — where on the built home page does each of the four questions get answered, in
// document coordinates, measured in Firefox at a stated viewport.
//
// Loads under design/grill/dist-measure.mjs (same-origin copy of dist) or page-measure.mjs. The
// harness passes the viewport through `innerHeight`, which is the fold: an element whose top sits
// past it is not on the first screen a visitor gets without scrolling.
//
// The four questions are the round-4 brief's acceptance test (§5 D-A): a stranger on a phone asking
// "when / where / how do I sign up / what is this club called". Each answer is located by a handle the
// page already declares — `data-surface="next-meeting"`, `data-control="primary"`, the h1 — not by a
// class this probe invents, so the probe measures the shipped page rather than a page this file draws.
(() => {
  const send = (obj) => {
    const ep = window.__MEASURE_ENDPOINT;
    if (!ep) { console.log(obj); return; }
    fetch(ep, { method: 'POST', body: JSON.stringify(obj), mode: ep.startsWith('/') ? 'same-origin' : 'no-cors' });
  };

  const FOLD = window.innerHeight;
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
  };

  const ASKS = [
    { id: 'what', ask: 'what is this club called', sel: 'h1' },
    { id: 'when', ask: 'when is the next meeting', sel: '[data-surface="next-meeting"] p' },
    { id: 'where', ask: 'where is it', sel: '[data-surface="next-meeting"] p:last-of-type' },
    { id: 'signup', ask: 'how do I sign up', sel: '[data-control="primary"]' },
    { id: 'dates', ask: 'how do I see the other dates', sel: 'a[data-control="secondary"]' },
  ];

  const answers = ASKS.map((q) => {
    const el = document.querySelector(q.sel);
    if (!el) return { id: q.id, ask: q.ask, found: false };
    const b = box(el);
    return {
      ...q,
      found: true,
      ...b,
      topAboveFold: b.top < FOLD,
      fullyAboveFold: b.bottom <= FOLD,
      words: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    };
  });

  // `done: true` is the harness's report marker: design/grill/page-measure.mjs counts a POST as the report
  // only when the parsed body carries it (line 97, `if (obj && obj.done)`), and otherwise reports
  // "TIMEOUT: the page never posted" about a probe that posted perfectly.
  send({
    done: true,
    probe: 'fold-answers',
    viewport: { w: window.innerWidth, h: FOLD },
    docHeight: Math.round(document.documentElement.scrollHeight),
    answers,
    inFold: answers.filter((a) => a.fullyAboveFold).map((a) => a.id),
    pastFold: answers.filter((a) => !a.fullyAboveFold).map((a) => a.id),
  });
})();
