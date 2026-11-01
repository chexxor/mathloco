// probe.js - deterministic layout defects, measured in the browser and painted where a screenshot can see them.
//
// Why: both local vision models failed a positive control (a deliberately overlapping, clipped, faint text block was
// scored "none" by qwen3-vl-4b-instruct AND by ministral-3-14b-reasoning, even though both could *read* the text). So an
// LLM cannot judge layout. It CAN transcribe. So the browser does the measuring, and the model just reads the number.
//
// Usage: load it in a preview page (`<script src="probe.js"></script>`), screenshot, and read the banner.
// What counts as a defect:
//   1. the document scrolls sideways at this viewport;
//   2. an element's content is clipped: scrollWidth/Height exceeds its box while overflow is `hidden` or `clip`
//      (`auto`/`scroll` means the author put a scroller there on purpose - that is a design, not a defect);
//   3. text truncated by an ellipsis;
//   4. text painted below the legibility floor for its own colour contrast? - not measurable here, that is
//      `.design/light-roles.mjs`'s job; this file only catches geometry.

(() => {
  const vw = window.innerWidth;
  const offenders = [];

  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
    offenders.push(`DOCUMENT scrolls sideways: scrollWidth ${document.documentElement.scrollWidth} > viewport ${document.documentElement.clientWidth}`);
  }

  const inScroller = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const o = getComputedStyle(a).overflowX;
      if (o === 'auto' || o === 'scroll') return true;
    }
    return false;
  };

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
    const clipsY = cs.overflowY !== 'visible';
    const overX = el.scrollWidth - el.clientWidth;
    const overY = el.scrollHeight - el.clientHeight;

    if (clipsX && overX > 1) offenders.push(`CLIPPED sideways by ${overX}px: <${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? ' class="' + el.className.trim().split(/\s+/).join('.') + '"' : ''}>`);
    if (clipsY && overY > el.clientHeight * 0.15 && overY > 4) offenders.push(`CLIPPED vertically by ${overY}px: <${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? ' class="' + el.className.trim().split(/\s+/).join('.') + '"' : ''}>`);
    if (cs.textOverflow === 'ellipsis' && overX > 1) offenders.push(`ELLIPSIS truncation: <${el.tagName.toLowerCase()}> "${el.textContent.trim().slice(0, 40)}"`);
    if (box.right > vw + 1 && cs.position !== 'fixed' && !inScroller(el)) offenders.push(`PAST the right edge by ${Math.round(box.right - vw)}px: <${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? ' class="' + el.className.trim().split(/\s+/).join('.') + '"' : ''}>`);
  }

  const unique = [...new Set(offenders)];
  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
    'background:' + (unique.length ? '#b00020' : '#0a6b3d'), 'color:#fff',
    'font:16px/1.35 ui-monospace,monospace', 'padding:10px 14px',
    'max-height:46vh', 'overflow:auto', 'white-space:pre-wrap',
  ].join(';');
  banner.textContent = `LAYOUT PROBE  viewport ${vw}x${window.innerHeight}  defects ${unique.length}\n` +
    unique.slice(0, 25).map((o, i) => `${i + 1}. ${o}`).join('\n');
  document.documentElement.appendChild(banner);
  document.title = `PROBE defects=${unique.length} vw=${vw}`;
})();
