// nav-fit-measure.js - does the chosen nav shape fit the viewports we ship?
//
// Run: node design/grill/artifact-measure.mjs --root design --pages grill/nav-fit.html \
//        --probe design/grill/nav-fit-measure.js --widths 1240,375,320
//
// The number that matters is `needed` - the nav's width if it were forbidden to wrap - against
// `available` (the container's content width at this viewport). `wraps: yes` with `needed >
// available` is the shipped production defect (Navigation.astro has no rule that prevents it, and the
// page clips, so links silently disappear).
//
// Timers do not run while the page holds its own load open, so font waiting is done with
// document.fonts.load()/ready only - see contrast-probe.js header for the measurement.
window.__measure = async () => {
  for (const spec of ['400 16px "PT Serif"', '400 11.1px "PT Serif"', '500 13.3px "PSVar"', '600 11.1px "PSVar"']) {
    try { document.fonts.load(spec); } catch (e) {}
  }
  await document.fonts.ready;

  const faces = ['PT Serif', 'PSVar'].map((f) => `${f} ${document.fonts.check(`400 16px "${f}"`) ? 'LOADED' : 'fallback'}`);
  const lines = [];
  lines.push(`viewport innerWidth=${innerWidth}  fonts: ${faces.join(', ')}`);
  lines.push('variant              available  needed  delta  wraps  navH   links (w x h)                      verdict');

  const measure = (nav) => {
    const available = nav.clientWidth;
    // clone forbidden-to-wrap, off-screen, same parent (so the same container width and styles apply)
    const ghost = nav.cloneNode(true);
    ghost.style.cssText += ';position:absolute;left:-99999px;top:0;width:max-content;flex-wrap:nowrap;white-space:nowrap;visibility:hidden';
    ghost.removeAttribute('data-variant');
    nav.parentElement.appendChild(ghost);
    const needed = Math.round(ghost.getBoundingClientRect().width);
    ghost.remove();
    // did the real one wrap? compare offsetTop across items that share a font-size (the links);
    // the mark deliberately differs in A, so it cannot be part of the test
    const links = [...nav.querySelectorAll('a.nl')];
    const tops = new Set(links.map((el) => el.offsetTop));
    const wrapped = tops.size > 1;
    const targets = [...nav.querySelectorAll('a.nl, summary')].map((el) => {
      const r = el.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)}`;
    });
    const minH = Math.min(...[...nav.querySelectorAll('a.nl, summary')].map((el) => Math.round(el.getBoundingClientRect().height)));
    return { available, needed, delta: available - needed, wrapped, navH: Math.round(nav.getBoundingClientRect().height), targets, minH };
  };

  let rows = 0;
  for (const nav of document.querySelectorAll('nav[data-variant]')) {
    const v = nav.dataset.variant;
    const m = measure(nav);
    const fits = m.needed <= m.available;
    const verdict = fits ? 'fits' : (m.wrapped ? 'WRAPS (two rows)' : 'OVERFLOWS (clipped)');
    rows++;
    lines.push(`${v.padEnd(20)} ${String(m.available).padStart(7)}  ${String(m.needed).padStart(6)}  ${String(m.delta).padStart(5)}  ${m.wrapped ? 'yes ' : 'no '}   ${String(m.navH).padStart(4)}  ${m.targets.join(' ').padEnd(36)} ${verdict}${m.minH < 24 ? `  target ${m.minH}px < 24 AA` : ''}`);
  }

  // planted control: the probe must call a genuinely over-wide nav a defect, or the fit numbers mean nothing
  const host = document.querySelector('nav[data-variant="B-chosen"]');
  const control = host.cloneNode(true);
  control.style.cssText += ';flex-wrap:nowrap';
  control.querySelectorAll('.nl').forEach((a) => { a.textContent = 'Interests & syllabi'; });
  const extra = document.createElement('a');
  extra.className = 'nl'; extra.href = '#'; extra.textContent = 'Reading group notes';
  control.appendChild(extra);
  host.parentElement.appendChild(control);
  const cm = measure(control);
  const controlCaught = cm.needed > cm.available;
  lines.push(`CONTROL (must defect)  ${String(cm.available).padStart(7)}  ${String(cm.needed).padStart(6)}  ${String(cm.delta).padStart(5)}  ${cm.wrapped ? 'yes ' : 'no '}   ${String(cm.navH).padStart(4)}  ${cm.targets.join(' ').padEnd(36)} ${controlCaught ? 'DEFECTS (control works)' : '*** PROBE BROKEN: control passed ***'}`);
  control.remove();

  const ok = rows >= 6 && controlCaught;
  lines.push(`rows measured: ${rows}; control defects: ${controlCaught}; ${ok ? 'probe trustworthy' : 'PROBE NOT TRUSTWORTHY'}`);
  return { report: lines.join('\n'), rows, controlCaught, faces };
};
