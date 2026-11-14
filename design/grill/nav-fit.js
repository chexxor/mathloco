// nav-fit.js — the measure script design/nav-fit.mjs injects into a built page.
//
// Question it answers: the nav row is one row at every width with `flex-wrap: nowrap` (D100), so a new
// label is not free — it has to fit the container's content box at the 320px floor (D114), and the gate
// fails the build when it does not. This reports what each candidate label set needs, per label, so a
// decision about the nav is made against the row the visitor gets rather than against a remembered number.
//
// It mutates the DOM only (never the file on disk), and it measures after the faces settle, because a
// serif measured while PT Serif is still loading is a fallback metric (design/README.md rule 1).
(() => {
  const CANDIDATES = [
    [['/schedule', 'Schedule'], ['/chat', 'Chat']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Join']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Ways in']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Attend']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Meet us']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Get here']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Come along']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Say hello']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Get involved']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Connect']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Visit']],
    [['/schedule', 'Schedule'], ['/chat', 'Chat'], ['/join', 'Meet']],
    [['/schedule', 'Dates'], ['/chat', 'Chat'], ['/join', 'Ways in']],
    [['/schedule', 'Dates'], ['/chat', 'Chat'], ['/join', 'Attend']],
    [['/schedule', 'Schedule'], ['/join', 'Ways in']],
    [['/schedule', 'Schedule'], ['/join', 'Join']],
    // 2026-11-14: the commissioned read's item 2a asks for the NEXT DATE in the nav instead of the page
    // name. A label like `Sat 21 Nov` is the widest thing the row could carry, so it is priced here rather
    // than argued about in prose; the day it names is irrelevant to the width.
    [['/schedule', 'Sat 21 Nov'], ['/chat', 'Chat'], ['/join', 'Ways in']],
    [['/schedule', 'Sat Nov 21'], ['/chat', 'Chat'], ['/join', 'Ways in']],
    [['/schedule', '21 Nov'], ['/chat', 'Chat'], ['/join', 'Ways in']],
    [['/schedule', 'Next date'], ['/chat', 'Chat'], ['/join', 'Ways in']],
    // The compound label is the one that keeps D309's rule (the nav label still carries the page's name)
    // while putting the date in the row, so it is priced against the bare date and against the shipped set.
    [['/schedule', 'Dates 21 Nov'], ['/chat', 'Chat'], ['/join', 'Ways in']],
    [['/schedule', 'Dates, 21 Nov'], ['/chat', 'Chat'], ['/join', 'Ways in']],
    [['/schedule', 'Next 21 Nov'], ['/chat', 'Chat'], ['/join', 'Ways in']],
    [['/schedule', 'Dates'], ['/chat', 'Chat'], ['/join', 'Ways in'], ['/events.ics', 'Feed']],
    [['/schedule', 'Sat 21 Nov'], ['/chat', 'Chat'], ['/join', 'Join']],
    [['/schedule', 'Dates'], ['/chat', 'Chat'], ['/join', 'Ways in'], ['/schedule', '21 Nov']],
  ];

  const LABEL_CLASS = 'whitespace-nowrap py-2 text-label text-ink font-medium hover:text-gold';

  const settle = () => (document.fonts && document.fonts.load
    ? Promise.all([...document.fonts].map((f) => document.fonts.load(`${f.family} ${f.weight}`).then(() => {}, () => {})))
        .then(() => document.fonts.ready).then(() => {}, () => {})
    : Promise.resolve());

  // design/README.md rule 2: the harness only counts a report when the payload says `done`.
  const send = (payload) => fetch(window.__MEASURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ ...payload, done: true }) });

  const measure = () => {
    const navEl = document.querySelector('nav');
    if (!navEl) { send({ error: 'no <nav> on the page' }); return; }
    const flexDivs = [navEl, ...navEl.querySelectorAll('div')].filter((d) => getComputedStyle(d).display === 'flex');
    const row = flexDivs[0];
    const mark = navEl.querySelector('a');
    if (!row || !mark) { send({ error: 'the nav has no flex row or no mark link' }); return; }

    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    // The shipped labels are kept as node references, not as a markup string: re-parsing HTML into the
    // artifact being measured is the class of thing check:sanitize exists for, and the nodes are what the
    // row had before the probe touched it.
    const shipped = [...navEl.querySelectorAll('a')].filter((a) => a !== mark);
    const labelBox = shipped[0] ? shipped[0].parentElement : row;
    shipped.forEach((n) => n.parentNode.removeChild(n));

    const rows = [];
    for (const labels of CANDIDATES) {
      const added = labels.map(([href, label]) => {
        const a = document.createElement('a');
        a.href = href;
        a.className = LABEL_CLASS;
        a.textContent = label;
        labelBox.appendChild(a);
        return a;
      });
      const leaves = [...navEl.querySelectorAll('a')];
      const needed = leaves.reduce((s, l) => s + l.scrollWidth, 0) + gap * Math.max(0, leaves.length - 1);
      rows.push({
        labels: labels.map((l) => l[1]),
        needed: +needed.toFixed(1),
        available: row.clientWidth,
        slack: +(row.clientWidth - needed).toFixed(1),
        perLabel: leaves.map((l) => `${l.textContent}:${l.scrollWidth}`),
        shortestTarget: Math.min(...leaves.map((l) => l.getBoundingClientRect().height)),
        tier: [...new Set(leaves.slice(1).map((l) => getComputedStyle(l).fontSize))],
        family: getComputedStyle(leaves[1] || mark).fontFamily.split(',')[0].replace(/["']/g, ''),
        documentOverflowX: document.documentElement.scrollWidth,
      });
      added.forEach((a) => a.parentNode.removeChild(a));
    }
    shipped.forEach((n) => labelBox.appendChild(n));
    send({ vw: innerWidth, gap, rows, fonts: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`) });
  };

  const run = () => { try { measure(); } catch (e) { send({ error: String(e && e.message ? e.message : e) }); } };
  Promise.race([settle(), new Promise((r) => setTimeout(r, 8000))]).then(run);
})();
