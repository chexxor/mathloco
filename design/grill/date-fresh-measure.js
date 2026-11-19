// date-fresh-measure.js — the measure script `design/round19.mjs` injects into a BUILT page to answer one
// question about the home page's date block: what does the freshness register cost, where does it sit against
// the fold, and does making the nav's date visible still fit the nav row?
//
//   node design/grill/dist-measure.mjs dist/client / design/grill/date-fresh-measure.js 1240 900 [shot.png]
//
// Why a measure script and not the render gate: `render-measure.js` reports every run's font size, contrast
// and colour, and `nav-fit.js` predicts the nav row's cost from computed CSS. Neither reports the two boxes
// this round needs — the hero's date block as one box, and the stamp line as its own — next to the fold, in
// the same load that took the screenshot. One measurement per harness, so a failure here names one thing
// (D158's lineage).
//
// The faces settle before the scan, exactly as `line-length-measure.js` does: a probe that measures fallback
// metrics is worse than one that fails, and the stamp line's WRAP at 390 is what this round prices, so a
// fallback reading would price the wrong number of lines.

(() => {
  const T0 = Date.now();
  const out = { done: false, vw: innerWidth, vh: innerHeight, errors: [], faces: [] };
  const send = () => fetch(window.__MEASURE_ENDPOINT, {
    method: 'POST', mode: 'no-cors', body: JSON.stringify(out),
  }).catch(() => {});

  const faceStatus = () => [...document.fonts].map((f) => {
    const s = f.status;
    return { family: f.family, weight: f.weight, style: f.style, status: s };
  });
  // The families this page ships, matched by name rather than by the exact "weight size family" string:
  // the variable face reports weight "100 900", so a pinned weight never matches and the settle would spin
  // 8s and report fallback metrics on every page (measured here, 2026-11-19).
  const wantFaces = ['"PT Serif"', '"Public Sans Variable"'];
  const settled = (rows) => wantFaces.every((want) => rows.some((r) => String(r.family).replace(/"/g, '') === want.replace(/"/g, '') && r.status === 'loaded'));

  const scan = () => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), display: cs.display, visibility: cs.visibility };
    };
    const hero = document.querySelector('[data-surface="next-meeting"]');
    // The stamp line, found by the words it prints rather than by a class: the same line on `/dates` carries
    // the same words, and the question is about the sentence a reader reads, not about a class name.
    const stamp = [...document.querySelectorAll('p')].find((p) => /Copied from the club/.test(p.textContent || ''));
    out.hero = hero ? box(hero) : null;
    out.stamp = stamp ? box(stamp) : null;
    out.stampText = stamp ? (stamp.textContent || '').trim() : null;
    // The nav row, and the date chip inside it. `hidden` is what ships today, so a chip the operator has not
    // switched gets a 0-height box rather than a missing entry — an absent entry and an unshipped chip are
    // different facts, and the specimen prints both words.
    // `$=`, not `=`: the probe harness rewrites href="/dates" to href="./dates" (design/grill/dist-measure.mjs:101),
    // so an exact-match selector answers null on the probe page — which is how this field came back null for a
    // whole round while the chip inside the same link measured fine.
    const navA = document.querySelector('header a[href$="dates"]') ?? document.querySelector('a[href$="dates"]');
    const chip = document.querySelector('[data-nav-date]');
    out.nav = navA ? box(navA) : null;
    out.navAria = navA ? navA.getAttribute('aria-label') : null;
    out.chip = chip ? box(chip) : null;
    out.chipText = chip ? (chip.textContent || '').trim() : null;
    // The nav's rows, walked UP from the Dates link rather than searched for: the header carries two nested
    // flex rows and `querySelector('nav')` answers with the max-width wrapper instead of either of them, while
    // `querySelectorAll('a, span')` counts the sr-only spans INSIDE the links as if they were more lines. Both
    // instruments are wrong for this question, so the rows come from the link's own parents and only an element's
    // DIRECT children are counted. Both rows ship `flex-nowrap` on purpose — a comment in the built page says
    // nowrap is deliberate, so a label set that stops fitting shows up as a failed width probe rather than a
    // silent re-wrap — which is why the specimen prints the row's wrap and the ink's room, not a line count alone.
    const datesA = navA ?? (chip ? chip.closest('a') : null);
    const flexes = [];
    for (let el = datesA ? datesA.parentElement : null; el; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (cs.display === 'flex' || cs.display === 'inline-flex') {
        const kids = [...el.children].filter((k) => getComputedStyle(k).display !== 'none');
        const rects = kids.map((k) => k.getBoundingClientRect());
        flexes.push({
          wrap: cs.flexWrap,
          box: box(el),
          ink: rects.length ? Math.round(Math.max(...rects.map((r) => r.right))) : null,
          // Centres, not tops: the row is items-center, so a 16px chip and a 32px link share one line.
          lines: new Set(rects.map((r) => Math.round(r.top + r.height / 2))).size,
          items: rects.length,
        });
      }
      if (flexes.length >= 2) break;
    }
    out.navRows = flexes;                       // inner row first: the row the chip actually widens
    out.navRow = flexes.length ? flexes[0].box : null;
    out.navWrap = flexes.length ? flexes[0].wrap : null;
    out.navRight = flexes.length ? flexes[0].ink : null;
    out.navLines = flexes.length ? flexes[0].lines : null;
    out.doc = { height: Math.round(document.documentElement.getBoundingClientRect().height) };
    out.fold = { vh: innerHeight };
  };

  const report = () => {
    out.done = true;
    out.elapsedMs = Date.now() - T0;
    out.faces = faceStatus();
    send();
  };

  const kick = () => Promise.all(wantFaces.map((f) => document.fonts.load(`16px ${f}`).then(() => {}, () => {})));
  const deadline = Date.now() + 8000;
  (async () => {
    await kick();
    for (;;) {
      const rows = faceStatus();
      if (settled(rows) || Date.now() > deadline) { if (settled(rows)) scan(); else out.errors.push('faces never settled — the boxes would be fallback metrics'); return report(); }
      await new Promise((r) => setTimeout(r, 60));
    }
  })().then(() => {}, () => report());
})();
