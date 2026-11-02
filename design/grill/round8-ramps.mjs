// round8-ramps.mjs — the candidate type ramps for the "make the type bigger" round, and the arithmetic
// each one implies. One source of truth: the specimen (round-8.html), the measure script's expectations
// and this file's numbers all come from here, so a candidate cannot mean one thing on screen and another
// in the table.
//
// WHY A CANDIDATE IS A SET AND NOT A NUMBER. DESIGN.md derives four things from the ramp, and a size
// change moves all four: (1) leading (the derived steps follow "next 4px multiple >= size x 1.2", display
// line boxes land on the 4px grid with a 1.05 floor), (2) control height (`height =
// ceil4(measured line box) + 2 x an S3 pad`, so a bigger label moves 48/40), (3) the notice's 48px
// one-line figure (D98), and (4) the display cap rule ("never text-display-4 below a 375 viewport without
// a cap", with the measured longest-word fits). A ramp that is not checked against those four is a size
// bump that quietly breaks a control.
//
// The shipped ramp is READ from src/styles/global.css by `shipped()`, never copied here — the same rule
// the render gate follows when it reads --breakpoint-nav-narrow instead of remembering it.
import { readFileSync } from 'node:fs';

export const STEPS = ['micro', 'label', 'body', 'lede', 'subhead', 'heading', 'display-1', 'display-2', 'display-3', 'display-4'];

// DESIGN.md's derivation, as code: the next 4px multiple >= size x 1.2.
export const derivedLead = (size) => 4 * Math.ceil((size * 1.2) / 4);
// the display line boxes are ratified onto the 4px grid with a 1.05 leading floor
export const displayLead = (size) => { const l = derivedLead(size); return l >= size * 1.05 ? l : 4 * Math.ceil((size * 1.05) / 4); };

// Control grammar (DESIGN.md "Controls - heights are derived, not chosen"), reproducing what the built
// page measures today: primary `text-label py-4` = label line box + 32 = 48; secondary
// `text-label py-3` = label line box + 24 = 40. The pads come only from the spacing scale.
export const controlHeights = (labelLeadPx) => ({ primary: labelLeadPx + 32, secondary: labelLeadPx + 24 });

export function shipped() {
  const css = readFileSync('src/styles/global.css', 'utf8');
  const out = {};
  for (const s of STEPS) {
    const size = new RegExp(`--text-${s}:\\s*([\\d.]+)px`).exec(css);
    const lh = new RegExp(`--text-${s}--line-height:\\s*([\\d.]+)px`).exec(css);
    if (!size) throw new Error(`no --text-${s} in the @theme block — this file cannot describe the shipped ramp`);
    out[s] = { size: Number(size[1]), lead: lh ? Number(lh[1]) : derivedLead(Number(size[1])), derived: !lh };
  }
  return out;
}

// The candidates. Each says what it changes and what it is FOR, because the operator is choosing an
// intent, not a number: B is "the reading got bigger, the chrome did not", C is "everything moved one
// notch on the same ladder", D is "labels and headings moved, body barely".
//
// Sizes are chosen from the same 1.200 ladder the system ratified (D95 T3) so the ratio is not re-opened
// by a size round; where a candidate changes ratio it says so (D: 1.250).
export function candidates() {
  const s = shipped();
  const ramp = (base, ratio, steps = ['body', 'lede', 'subhead', 'heading', 'display-1', 'display-2', 'display-3', 'display-4']) => {
    const out = {};
    steps.forEach((name, i) => { out[name] = +(base * ratio ** i).toFixed(1); });
    return out;
  };
  const set = (name, title, intent, sizes) => {
    const r = { name, title, intent, sizes: {} };
    for (const k of STEPS) {
      const size = sizes[k];
      const isDisplay = k.startsWith('display');
      r.sizes[k] = { size, lead: isDisplay ? displayLead(size) : derivedLead(size) };
    }
    r.controls = controlHeights(r.sizes.label.lead);
    return r;
  };

  const B = ramp(17.6, 1.2);                                   // reading +10%, chrome untouched
  const C = { ...ramp(18, 1.2), label: 15, micro: 12.5 };      // whole ladder +12.5%
  const D = { ...ramp(17, 1.25), label: 15, micro: 12.5 };     // labels +12.5%, steeper ladder (1.250)

  const A = { name: 'A', title: 'As shipped (1.200 ladder, body 16)', intent: 'the baseline every column is compared against', sizes: {} };
  for (const k of STEPS) A.sizes[k] = { size: s[k].size, lead: s[k].lead };
  A.controls = controlHeights(A.sizes.label.lead);

  return [
    A,
    set('B', 'Reading up 10%, chrome as shipped', 'only the content face gets bigger; nav, buttons and meta stay 13.3px', { ...s && Object.fromEntries(STEPS.map((k) => [k, s[k].size])), ...B }),
    set('C', 'The whole ladder up one notch (+12.5%)', 'everything the site says gets bigger together, ratio unchanged at 1.200', C),
    set('D', 'Chrome and headings up, body +6%', 'labels 15, body 17, and the ladder steepens to 1.250 so headings separate more', D),
  ];
}

// What the ramp costs, per candidate, in the two quantities that are already measured on the built page:
// characters per line in a given box, and the device stroke / longest-word fits. cpl scales as 1/size for
// the same box, and this is the predictor `round8-measure.js` checks against real wraps rather than
// trusting.
export const fitsPerLine = (boxPx, advanceAtSize, size) => +(boxPx / (advanceAtSize * size)).toFixed(0);
