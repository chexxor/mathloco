// line-length-measure.js — the measure script dist-measure.mjs injects into a BUILT page to answer one
// question no existing probe answers: how many CHARACTERS does a reader's eye travel per line, at the
// size and width the page actually ships?
//
//   node design/line-length.mjs                       # routes x widths, printed and summarised
//
// Why this exists (queue item "the type ramp — the operator asked for bigger type everywhere"). Line
// length in characters is the number that decides whether a size bump is readable or merely larger: a
// bigger size in the same box buys FEWER characters per line, and past roughly 75-80 ch the reader loses
// the return sweep into the next line. `render-measure.js` reports per-run `fs/lh/fw/ff/color/contrast`
// but no box width and no line count, so cpl was only guessable from a `chars / (box / 0.5em)`
// approximation — which is why this probe is a separate, honest measurement rather than a field on the
// old one.
//
// Method, and why these are measurements rather than estimates:
//   - a run is an element with non-empty text whose children are all inline. A <p> counts; an <li> that
//     wraps a <p> does not, because the <p> is the run. Runs nested inside another run are flagged so the
//     summary counts the OUTER box once.
//   - lines are found from the rect of a Range over each WORD. Words are the atoms CSS will not split
//     (absent hyphenation), so a word's rect top names its line and the count is exact. Per-CHARACTER
//     ranges were tried first and are wrong: the raw text nodes contain the newline+indent whitespace
//     between inline children, which CSS collapses to a single space, so a character census counts
//     characters that never painted. If a word's range yields more than one rect the word was broken
//     mid-word and the run reports `broken: true` rather than a quietly low count.
//   - per-line chars = the words on that line plus the single spaces between them (conventional cpl).
//   - the box is the run's own CONTENT box (clientWidth minus horizontal padding): layout is what a size
//     change leaves untouched, so `box / advance` is the predictor the round-8 specimen tests.
//   - `advance` = widest line's ink width / that line's chars = px per character at that size.
//
// ORDER MATTERS: the scan runs AFTER the ratified faces report `loaded`. Measuring word rects during the
// font swap measures the fallback stack's advance widths, which is the exact error this harness exists to
// avoid (see the settle at the bottom — `document.fonts.ready` alone resolves too early).
//
// Contrast is NOT measured here; render-measure.js owns that. One measurement per harness, so a failure
// names one thing.
(() => {
  const T0 = Date.now();
  const out = { done: false, vw: innerWidth, vh: innerHeight, runs: [], errors: [] };
  const send = () => fetch(window.__MEASURE_ENDPOINT, {
    method: 'POST', mode: 'no-cors', body: JSON.stringify(out),
  }).catch(() => {});

  const display = (el) => getComputedStyle(el).display;
  const hasBlockChild = (el) => [...el.children].some((c) =>
    /^(block|flex|grid|list-item|table|flow-root|table-cell|table-row)$/.test(display(c)));
  const tol = (a, b) => Math.abs(a - b) <= 2;                 // sub-pixel rect drift inside one line box

  function scan() {
    const cands = [...document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,p,li,dd,dt,a,span,button,summary,label,td,th,blockquote,figcaption,strong,em,small,time,legend')]
      .filter((el) => {
        const t = (el.textContent || '').trim();
        if (t.length < 2) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 4) return false;          // sr-only / clipped / unrendered
        if (display(el) === 'none' || getComputedStyle(el).visibility === 'hidden') return false;
        return !hasBlockChild(el);
      });
    const candSet = new Set(cands);
    const nestedIn = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) if (candSet.has(p)) return p.tagName.toLowerCase();
      return null;
    };

    for (const el of cands) {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (!Number.isFinite(fs) || fs <= 0) continue;
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const box = +(el.clientWidth - padX).toFixed(1);

      // ---- every word, with the top of the line it landed on, in document order
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const words = [];
      let node;
      while ((node = walker.nextNode())) {
        const data = node.data;
        const re = /\S+/g;
        let m;
        while ((m = re.exec(data))) {
          const range = document.createRange();
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5);
          if (!rects.length) continue;
          words.push({
            w: m[0],
            top: +rects[0].top.toFixed(2),
            left: Math.min(...rects.map((r) => r.left)),
            right: Math.max(...rects.map((r) => r.right)),
            broken: rects.length > 1,
          });
        }
      }
      if (!words.length) continue;

      // ---- group words into lines by top
      const lines = [];
      for (const wd of words) {
        const ln = lines.find((l) => tol(l.top, wd.top));
        if (ln) { ln.words.push(wd); ln.top = Math.min(ln.top, wd.top); }
        else lines.push({ top: wd.top, words: [wd] });
      }
      lines.sort((a, b) => a.top - b.top);
      for (const ln of lines) {
        ln.left = Math.min(...ln.words.map((w) => w.left));
        ln.right = Math.max(...ln.words.map((w) => w.right));
        ln.chars = ln.words.reduce((a, w) => a + w.w.length, 0) + (ln.words.length - 1);
        ln.px = +(ln.right - ln.left).toFixed(1);
      }

      const lineChars = lines.map((l) => l.chars);
      const linePx = lines.map((l) => l.px);
      const widestIx = linePx.indexOf(Math.max(...linePx));
      const chars = lineChars.reduce((a, b) => a + b, 0);
      const maxLine = Math.max(...lineChars);
      const maxWordPx = +Math.max(...words.map((w) => w.right - w.left)).toFixed(1);
      const wordsAll = (el.textContent || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);

      out.runs.push({
        tag: el.tagName.toLowerCase(),
        nested: nestedIn(el),                          // an ancestor is also a run: the box is that one
        cls: (el.getAttribute('class') || '').slice(0, 80),
        t: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
        fs: cs.fontSize, lh: cs.lineHeight, fw: cs.fontWeight,
        ff: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        box,
        lines: lines.length,
        lineChars, linePx,
        maxLineChars: maxLine,
        cpl: +(chars / lines.length).toFixed(1),        // average characters per line, as the browser broke it
        widestLinePx: linePx[widestIx],
        advance: maxLine ? +(linePx[widestIx] / maxLine).toFixed(2) : 0,   // px per char at this size
        chars, wordCount: wordsAll.length,
        longestWord: wordsAll.reduce((a, w) => (w.length > a.length ? w : a), ''),
        longestWordPx: maxWordPx,
        wordFits: maxWordPx <= box + 0.5,               // false = this word, not the run, forces the wrap
        broken: words.some((w) => w.broken),            // a word split mid-word: cpl is then optimistic
        lead: +(parseFloat(cs.lineHeight) / fs).toFixed(2),
      });
    }
  }

  const wantFamilies = ['PT Serif', 'Public Sans Variable'];
  const faceStatus = () => {
    const rows = [];
    document.fonts.forEach((f) => rows.push({ family: f.family, weight: f.weight, style: f.style, status: f.status }));
    return rows;
  };
  const settled = (rows) => wantFamilies.every((fam) => rows.some((r) => r.family === fam && r.status === 'loaded'));

  const report = (rows) => {
    out.done = true;
    out.elapsedMs = Date.now() - T0;
    out.facesLoaded = settled(rows);
    out.fonts = rows.map((r) => `${r.family} ${r.weight} ${r.style} ${r.status}`);
    out.doc = { bg: getComputedStyle(document.body).backgroundColor };
    send();
  };

  // Faces before numbers — and before the SCAN, not just before the report.
  //
  // `document.fonts.ready` is not sufficient, and this probe found the hole the render gate also steps
  // near: ready resolves when the document's font-loading set is idle, and a face that layout has only
  // just started fetching is still 'loading' after it resolves — measured here, the probe posted at 64 ms
  // with all three faces mid-fetch. So: ask for each ratified face by name, then POLL the FontFace
  // statuses (bounded at 8 s) instead of trusting a promise that can resolve early. A probe that measures
  // fallback metrics is worse than one that fails, which is why the scan is inside this chain.
  const wantFaces = ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"'];
  const kick = () => Promise.all(wantFaces.map((f) => document.fonts.load(f).then(() => {}, () => {})));
  const deadline = Date.now() + 8000;
  (async () => {
    await kick();
    for (;;) {
      const rows = faceStatus();
      if (settled(rows) || Date.now() > deadline) { if (settled(rows)) scan(); return report(rows); }
      await new Promise((r) => setTimeout(r, 60));
    }
  })().then(() => {}, () => report(faceStatus()));
})();
