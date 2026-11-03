// shot-height.mjs — one rule for how tall a page screenshot is allowed to be, and what happens when the page
// is taller than that.
//
// Why this is a module and not three copies of `Math.min(6000, doc.scrollHeight)`: the cap was written into
// `whitespace-survey.mjs`, `color-survey.mjs` and `pixel-ground.mjs` independently, and on 2026-11-03 the home
// page grew to **6978px at a 320 viewport** — over the cap — so every 320 measurement silently covered 6000px
// of a 6978px page. The missing 978px is the bottom of the last section plus the whole `bg-ink` footer, which is
// where the page's darkest surface lives. Nothing complained, because the number printed as a percentage of the
// frame it measured. This is record 0015's failure class (a fixed frame of a taller document puts the footer out
// of shot and reports a different page) re-created in a new place, which is the argument for the rule living here.
//
// The rule: take the page's own settled height (ask the page first — `render-measure.js` waits for the ratified
// faces, so the height is the settled one). If it exceeds the cap, **do not measure less and call it the page**:
// throw, naming the width, the real height and the cap, so the fix is to raise the cap or split the shot, not to
// accept a truncated denominator.

export const SHOT_CAP = 9000;

/** @param settledHeight the document height the page reported after settling
 *  @param where what to name in the error, e.g. `/ @ 320`
 *  @param cap override for a probe that genuinely cannot read a taller shot */
export function shotHeight(settledHeight, where, cap = SHOT_CAP) {
  const h = Number(settledHeight);
  if (!Number.isFinite(h) || h <= 0) throw new Error(`${where}: the page never reported a document height — refusing to guess a shot height`);
  if (h > cap) {
    throw new Error(
      `${where}: the page is ${h}px tall and this probe's shot cap is ${cap}px. ` +
      `Measuring ${cap}px and calling the result "the page" reports a different page (record 0015): the missing ` +
      `${h - cap}px would be dropped, along with its denominator. Raise SHOT_HEIGHT's cap here, or measure the page in bands.`,
    );
  }
  return h;
}
