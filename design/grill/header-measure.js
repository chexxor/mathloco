// header-measure.js — the round-17 probe: what the header and the hero's name each ARE on the built page.
//
// Why a new probe instead of reusing render-measure.js's nav block: the gate's nav probe answers "does the row
// hold" (one row, one tier, fits, 32px targets). The round-17 question is a different one - the club's name is
// painted twice on the landing screen (nav mark + h1), and the header reads as the page rather than as chrome -
// and neither half of that is a class grep. So this probe measures:
//
//   header  its box, its padding, its PAINTED ground, and whether it is a band, a plate or nothing
//   items   each nav item at its rendered size: width, own text extent (scrollWidth, immune to flex shrink),
//           line box, family, and which one is the identity item (the only one carrying the club name)
//   row     D100's needed-of-available arithmetic, unchanged, so a priced option cannot beat the gate by
//           measuring a different quantity than the gate measures
//   name    every element whose OWN text contains the club name, at its size and position, and how many of
//           them are inside the first screen - the operator's "the name is duplicated" made countable
//   gaps    header bottom -> h1 top -> descriptor lane top: what the header is separated FROM
//
// Harness contract (design/README.md): measure after the faces settle, scrollTo(0,0) before measuring AND
// before posting, read computed styles not attributes, and post once with done: true.
(() => {
  const T0 = Date.now();
  const NAME = /matheapolis/i;
  const out = { done: false, errors: [], vw: innerWidth, vh: innerHeight };
  const send = (payload) => {
    out.done = true;
    Object.assign(out, payload);
    fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(out) }).catch(() => {});
  };

  // Painted bytes, not author syntax (the same 1px-canvas oracle render-measure.js uses): "is the header a
  // different ground from the page" is a pixel question, and computed colour strings cannot answer it when a
  // background-image or a gradient is involved (record 0020).
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const c2d = cvs.getContext('2d', { willReadFrequently: true });
  const paintBytes = (s) => {
    if (!s || s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return null;
    c2d.globalCompositeOperation = 'source-over';
    c2d.clearRect(0, 0, 1, 1);
    c2d.fillStyle = '#00e600';
    c2d.fillStyle = s;
    if (String(c2d.fillStyle) === '#00e600') return null;
    c2d.fillRect(0, 0, 1, 1);
    const d = c2d.getImageData(0, 0, 1, 1).data;
    return d[3] === 0 ? null : [d[0], d[1], d[2]];
  };
  // The ground an element stands on: its own painted background if it paints one, else the nearest ancestor
  // that does. A header with no background paints its parent's colour, and reporting `transparent` as a
  // ground would make "the header is on a different ground" unanswerable.
  const groundOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const b = paintBytes(getComputedStyle(n).backgroundColor);
      if (b) return { bytes: b, from: n.tagName.toLowerCase() + (n.getAttribute('class') ? '.' + n.getAttribute('class').split(' ')[0] : '') };
    }
    return { bytes: null, from: null };
  };
  const box = (el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    return {
      own: own.slice(0, 60),
      tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').slice(0, 110),
      x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      bottom: +r.bottom.toFixed(1),
      pad: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].join(' '),
      fs: s.fontSize, lh: s.lineHeight, ff: s.fontFamily.split(',')[0].replace(/["']/g, ''), fw: s.fontWeight,
      ls: s.letterSpacing, tt: s.textTransform, pos: s.position, z: s.zIndex,
      bg: s.backgroundColor, border: s.borderBottomWidth + ' ' + s.borderBottomStyle + ' ' + s.borderBottomColor,
      shadow: s.boxShadow === 'none' ? '' : s.boxShadow.slice(0, 60),
    };
  };
  // The faces the page is required to have loaded before any rect is read. The list is render-measure.js's
  // verbatim - it is the trio the render gate proves loaded, and asking for a family the page does not use is
  // how a settle chain goes wandering.
  const wantFaces = ['400 16px "PT Serif"', '700 16px "PT Serif"', '600 16px "Public Sans Variable"'];
  const decodeImages = () => {
    for (const im of document.images) { try { if (im.loading === 'lazy') im.loading = 'eager'; } catch {} }
    return Promise.all([...document.images].map((im) => (im.decode ? im.decode() : Promise.resolve()).then(() => {}, () => {})));
  };
  const settle = () => (document.fonts && document.fonts.load
    ? Promise.all(wantFaces.map((f) => document.fonts.load(f).then(() => {}, () => {}))).then(() => document.fonts.ready).then(() => {}, () => {})
    : Promise.resolve()).then(decodeImages, decodeImages);

  const measure = () => {
    try { window.scrollTo(0, 0); } catch {}
    const scrollAtMeasure = { x: Math.round(scrollX), y: Math.round(scrollY) };

    const headerEl = document.querySelector('header');
    const navEl = document.querySelector('nav');
    const rowEl = navEl ? [navEl, ...navEl.querySelectorAll('div')].find((d) => getComputedStyle(d).display === 'flex') : null;
    const links = navEl ? [...navEl.querySelectorAll('a')] : [];

    const header = headerEl ? box(headerEl) : null;
    if (header) header.ground = groundOf(headerEl);

    const items = links.map((a) => {
      const b = box(a);
      const svg = a.querySelector('svg');
      const own = [...a.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
      const textEl = [...a.querySelectorAll('*')].find((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) || a;
      const ts = getComputedStyle(textEl);
      return {
        ...b,
        t: (a.getAttribute('aria-label') ?? a.textContent).trim().replace(/\s+/g, ' ').slice(0, 34),
        scrollW: +a.scrollWidth.toFixed(1),
        hasMark: !!svg,
        markBox: svg ? (() => { const r = svg.getBoundingClientRect(); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; })() : null,
        namesClub: NAME.test(a.textContent || '') || NAME.test(a.getAttribute('aria-label') || ''),
        textFs: ts.fontSize, textLh: ts.lineHeight, textFf: ts.fontFamily.split(',')[0].replace(/["']/g, ''),
        textCls: (textEl.getAttribute('class') || '').slice(0, 90),
        textOnly: own.slice(0, 34),
        ground: groundOf(a),
        // The colour the nav text is actually painted, in bytes, so a ground swap can be checked against the ink
        // that ships rather than against a token string that a scoped override may have changed.
        color: ts.color, colorBytes: paintBytes(ts.color),
      };
    });

    let row = null;
    if (rowEl) {
      const gap = parseFloat(getComputedStyle(rowEl).columnGap) || 0;
      const needed = links.reduce((a, l) => a + l.scrollWidth, 0) + gap * Math.max(0, links.length - 1);
      row = { needed: +needed.toFixed(1), available: rowEl.clientWidth, gap, display: getComputedStyle(rowEl).display, align: getComputedStyle(rowEl).alignItems };
    }

    // Every element whose OWN text carries the club name, at its own size, with its position. `ownText`
    // matters: walking textContent would report every ancestor of the h1 as a second mention of the name.
    const SEL = ['header', 'nav', 'a', 'h1', 'h2', 'h3', 'p', 'span', 'div', 'footer', 'title', 'meta'];
    const namePicks = [...document.querySelectorAll(SEL.join(','))]
      .filter((el) => {
        if (el.tagName === 'META' || el.tagName === 'TITLE') return NAME.test(el.getAttribute('content') || el.textContent || '');
        return [...el.childNodes].some((n) => n.nodeType === 3 && NAME.test(n.textContent));
      })
      .map((el) => {
        const b = box(el);
        return { ...b, inFirstScreen: el.tagName === 'META' || el.tagName === 'TITLE' ? null : b.y < out.vh, painted: el.tagName !== 'META' && el.tagName !== 'TITLE' };
      });

    const h1 = document.querySelector('h1');
    const hero = h1 ? box(h1) : null;
    // The descriptor lane: the label lane the copy gate calls `locator` (scripts/check-copy.mjs reads the same
    // string out of the source). Matched on its own text plus the ratified label class, inside the hero's own
    // section, so a nav label or a footer label cannot be mistaken for it.
    const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
    const heroRoot = h1 ? (h1.closest('section') || h1.parentElement) : null;
    const lane = heroRoot ? [...heroRoot.querySelectorAll('div, span, p')]
      .find((el) => (el.getAttribute('class') || '').split(/\s+/).includes('text-label') && ownText(el)) : null;

    const main = document.querySelector('main');
    const firstMain = main ? main.firstElementChild : null;

    out.url = location.href;
    out.elapsedMs = Date.now() - T0;
    out.scroll = scrollAtMeasure;
    // The page's own painted ground, as bytes, so the header's ground can be differenced against it rather than
    // against the token string. "Is the bar a different ground from the page" is the round-17 question, and the
    // ratified layer bar (1.35, D101) is a contrast number — a contrast number needs two painted pairs (record 0020).
    out.doc = { bg: getComputedStyle(document.body).backgroundColor, bgBytes: paintBytes(getComputedStyle(document.body).backgroundColor), scrollHeight: document.documentElement.scrollHeight };
    out.header = header;
    out.nav = { cls: navEl ? (navEl.getAttribute('class') || '') : null, items, row };
    out.namePicks = namePicks;
    out.nameInFirstScreen = namePicks.filter((p) => p.painted && p.inFirstScreen).length;
    out.hero = hero;
    out.lane = lane ? box(lane) : null;
    out.gaps = {
      headerBottom: header ? header.bottom : null,
      mainTop: firstMain ? +firstMain.getBoundingClientRect().top.toFixed(1) : null,
      headerToHero: hero && header ? +(hero.y - header.bottom).toFixed(1) : null,
      navMarkToHero: hero && items[0] ? +(hero.y - items[0].bottom).toFixed(1) : null,
      heroToLane: hero && lane ? +(box(lane).y - hero.bottom).toFixed(1) : null,
      heroNameToLaneTop: hero && lane ? +(box(lane).y - hero.y).toFixed(1) : null,
    };
    // SURFACE COPY, added for the second half of this round's brief (operator, 2026-11-08: the hero's opening
    // paragraph and the "How it works" band "are duplicated"). A copy ruling needs to know what each surface
    // actually says, where it sits, and which sentences the page says twice - so the probe reports the copy on the
    // artifact rather than a paraphrase of it. `ownText` again: a <p> inside a <section> is one mention, and its
    // ancestors are not two more.
    // A surface is named by the heading a reader would call it by, plus the section id when it has one, plus the
    // y of the copy — because a copy ruling has to say WHICH surface keeps a sentence, and "main:Matheapolis" for
    // the hero and "page" for everything outside the single <main> says nothing about the join band.
    const ownFull = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').replace(/\s+/g, ' ').trim();
    const headingMarks = [...document.querySelectorAll('h1, h2, h3')].map((h) => ({ t: ownFull(h) || h.textContent.trim(), y: h.getBoundingClientRect().top }));
    const surfaceOf = (el) => {
      const sec = el.closest('section[id], section, main, header, footer');
      const head = sec ? [...sec.querySelectorAll('h1, h2, h3')].find((h) => [...h.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) : null;
      const y = el.getBoundingClientRect().top;
      let nearest = null;
      for (const c of headingMarks) { if (c.y <= y + 2) nearest = c; else break; }
      const id = sec && sec.id ? '#' + sec.id : sec ? sec.tagName.toLowerCase() : 'page';
      const named = head && head.getBoundingClientRect().top <= y + 2 ? head.textContent.trim() : nearest ? nearest.t : '';
      return id + (named ? ':' + named.slice(0, 30) : '');
    };
    const copyEls = [...document.querySelectorAll('main p, section p, header p, footer p, main h1, main h2, main h3, section h2, section h3, main a, section a')]
      .filter((el) => ownFull(el).length && !el.closest('nav'))
      .map((el) => {
        const b = box(el);
        return { tag: el.tagName.toLowerCase(), own: ownFull(el).slice(0, 400), short: b.own, y: b.y, h: b.h, fs: b.fs, surface: surfaceOf(el), inFirstScreen: b.y < out.vh };
      });
    out.fold = copyEls.filter((c) => c.inFirstScreen && c.tag !== 'a').map((c) => ({ tag: c.tag, own: c.own, y: c.y, fs: c.fs }));
    out.sections = {};
    for (const c of copyEls) {
      const k = c.surface;
      out.sections[k] = out.sections[k] || { y: c.y, copy: [] };
      out.sections[k].copy.push({ tag: c.tag, own: c.own, fs: c.fs });
    }
    const howItWorks = [...document.querySelectorAll('h3')].find((h) => /how it works/i.test(h.textContent));
    if (howItWorks) {
      const b = box(howItWorks);
      out.sections['how-it-works'] = { y: b.y, h: b.h, fs: b.fs, own: b.own, cls: b.cls };
    }

    // STICKY probe (added 2026-11-08 for the structural half of this round). A bar that stays is chrome in the
    // plainest sense - it is the furniture that is always there - but a sticky bar that paints the same ground as
    // the page hides whatever scrolls under it with no edge to show the hiding. So the probe scrolls, reads the
    // bar's rect at scroll 600, and lists every text element whose box the bar now covers, with the overlap in px.
    // Scroll position is restored before posting, so every number above is still measured at the top.
    const stickyPos = headerEl ? getComputedStyle(headerEl).position : null;
    const sticky = { position: stickyPos, top: headerEl ? getComputedStyle(headerEl).top : null };
    try {
      if (stickyPos === 'sticky' || stickyPos === 'fixed') {
      window.scrollTo(0, 600);
      const r = headerEl.getBoundingClientRect();
      const covered = [...document.querySelectorAll('main p, main h1, main h2, main h3, main a, section p, section h2, section h3, section a, article p')]
        .filter((el) => !el.closest('header'))
        .map((el) => { const b = el.getBoundingClientRect(); return { el, b }; })
        .filter(({ b }) => b.width > 0 && b.bottom > r.top + 1 && b.top < r.bottom - 1)
        .map(({ el, b }) => ({ tag: el.tagName.toLowerCase(), own: ownFull(el).slice(0, 60), overlapPx: +(Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top)).toFixed(1), y: +b.top.toFixed(1) }));
      sticky.atScroll600 = { y: +r.top.toFixed(1), h: +r.height.toFixed(1), covers: covered.length, first: covered.slice(0, 6) };
      window.scrollTo(0, 0);
      }
    } catch (e) { sticky.error = String(e && e.message ? e.message : e); }

    // A near-duplicate detector, on the artifact. Normalisation is deliberate and dumb - case, punctuation, the
    // site's hyphen-as-dash and `\u2014`, collapsed whitespace - because the defect this catches is "the same
    // sentence in two surfaces", not "two sentences that rhyme". Jaccard over word sets, reported with both
    // surfaces and both positions so a human can rule on it; a bare score is how a detector gets ignored.
    // A near-duplicate detector, on the artifact. Normalisation is deliberate and dumb - case, punctuation, the
    // site's hyphen-as-dash and em dash, collapsed whitespace - and the comparison is over CONTENT words only,
    // because the defect is "the same thing said in two surfaces", not "two sentences that rhyme". Two scores are
    // reported, not one: Jaccard (how much of the combined vocabulary is shared) and the overlap coefficient
    // (how much of the *shorter* sentence is shared), because a short sentence can be a paraphrase of a long one
    // and Jaccard alone would score it low. Both come with the two surfaces and the two y positions, so a human
    // rules on the pair rather than on a number. A bare score with no text is how a detector gets ignored.
    const STOP = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'your', 'with', 'that', 'this', 'from', 'their', 'they', 'them', 'its', 'it', 'a', 'an', 'of', 'in', 'to', 'on', 'at', 'is', 'was', 'be', 'been', 'do', 'does', 'has', 'have', 'had', 'we', 'our', 'us', 'he', 'she', 'as', 'by', 'or', 'if', 'so', 'than', 'then', 'there', 'here', 'what', 'which', 'who', 'would', 'will', 'can', 'some', 'any', 'no', 'most', 'most', 'most', 'into', 'about', 'before', 'between', 'up', 'down', 'out', 'off', 'over', 'under']);
    const norm = (t) => t.toLowerCase().replace(/[.,;:!?\u2013\u2014\u2019'"()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = (t) => new Set(norm(t).split(' ').filter((w) => w.length > 2 && !STOP.has(w)));
    const scores = (a, b) => {
      const shared = [...a].filter((w) => b.has(w));
      const union = new Set([...a, ...b]).size;
      return { shared: shared.length, sharedWords: shared, jaccard: +(shared.length / union).toFixed(3), overlap: +(shared.length / Math.min(a.size, b.size)).toFixed(3) };
    };
    const sentences = [];
    for (const c of copyEls) {
      if (c.tag === 'a') continue;
      // Split on terminal punctuation only. Semicolons stay inside the sentence: this page writes its two most
      // duplicated statements as semicolon-joined pairs, and splitting on ';' is how a detector misses them.
      for (const part of c.own.split(/(?<=[.!?])\s+/)) {
        const t = part.trim();
        if (words(t).size < 4) continue;
        sentences.push({ own: t.slice(0, 200), surface: c.surface, y: c.y, tag: c.tag, _w: words(t) });
      }
    }
    const pairs = [];
    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        const a = sentences[i], b = sentences[j];
        if (a.surface === b.surface) continue;
        const sc = scores(a._w, b._w);
        if (sc.shared >= 3 && (sc.jaccard >= 0.45 || sc.overlap >= 0.5)) pairs.push({ ...sc, a: { own: a.own, surface: a.surface, y: a.y }, b: { own: b.own, surface: b.surface, y: b.y } });
      }
    }
    pairs.sort((x, y) => (y.overlap - x.overlap) || (y.jaccard - x.jaccard));
    out.sentences = { count: sentences.length, minSharedContentWords: 3, threshold: 'jaccard >= 0.45 OR overlap >= 0.5', duplicatePairs: pairs.map(({ shared, sharedWords, jaccard, overlap, a, b }) => ({ shared, sharedWords, jaccard, overlap, a, b })) };
    out.copySurfaces = Object.keys(out.sections).length;
    out.sticky = sticky;

    out.sizes = {
      navIdentityFs: items[0] ? items[0].textFs : null,
      navLabelFs: items[1] ? items[1].textFs : null,
      heroFs: hero ? hero.fs : null,
      laneFs: lane ? box(lane).fs : null,
      heroOverNavIdentity: hero && items[0] ? +(parseFloat(hero.fs) / parseFloat(items[0].textFs)).toFixed(2) : null,
    };
    out.fonts = (() => { const a = []; document.fonts.forEach((f) => a.push(`${f.family} ${f.weight} ${f.status}`)); return a; })();
    try { window.scrollTo(0, 0); } catch {}
    send({});
  };

  // NO TIMER HERE, deliberately. Measured on this rig (Linux, Firefox 159, `firefox --headless --screenshot`
  // through page-measure.mjs, 2026-11-08): a probe whose only post is behind a setTimeout never posts - the
  // run dies as TIMEOUT while the same probe's eval-time post arrives. The screenshot run tears the JS context
  // down before a 2.5s timer fires, which also means render-measure.js's "bounded at 8s" Promise.race fallback
  // is decoration, not a safety net: a settle chain that stalls has no timer to save it. So the post has to sit
  // on promises that resolve in microtasks, and a probe that throws has to post the exception (see below).
  settle().then(() => {
    try { measure(); } catch (e) { send({ errors: ['probe threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e))] }); }
  }, () => send({ errors: ['settle rejected'] }));
})();
