// palette-tokens.mjs — the ONE reading of the palette this tree declares.
//
// Two readers need exactly this fact and must not have two parses of it:
//   scripts/check-social-card.mjs  — is a committed artifact's recorded colour still a colour @theme declares
//                                    (the stale-card finding, D480 §d)?
//   design/round21.mjs             — what does a candidate colouring measure against each ground, before anyone
//                                    rules on it (the Byrne-1847 pricing)?
// A second inline regex over global.css is the "one home per rule" defect: the two readers would disagree about
// which colours exist, and the disagreement would surface as a gate that passes a specimen the other refuses.
//
// Comments are stripped BEFORE the scan, not on a slice: half of @theme's lines carry a hex or an oklch in prose
// (D478), and a comment quoting a retired token would otherwise read as a declared one.
import { readFileSync } from 'node:fs';
import { tripleToBytes } from './grill/okcolor.mjs';

export const GLOBAL_CSS = new URL('../src/styles/global.css', import.meta.url);

// L may be written as a percentage (every shipped token does) or as 0..1; hue may carry `deg`.
export const TOKEN_RE = /--color-([a-z0-9-]+)\s*:\s*oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)/g;

export const parseOklch = (s) => {
  const m = /oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)/.exec(String(s ?? ''));
  if (!m) return null;
  return { L: m[2] ? Number(m[1]) / 100 : Number(m[1]), C: Number(m[3]), H: Number(m[4]) };
};

// name -> { name, L, C, H, spec, bytes } in @theme order. `spec` is the string the browser is asked for;
// `bytes` are the sRGB bytes that spec resolves to, which is what a painted pixel is compared against.
export function paletteTokens(cssPath = GLOBAL_CSS) {
  const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = {};
  for (const m of css.matchAll(TOKEN_RE)) {
    const L = m[3] ? Number(m[2]) / 100 : Number(m[2]);
    const C = Number(m[4]);
    const H = Number(m[5]);
    out[m[1]] = {
      name: m[1], L, C, H,
      spec: `oklch(${m[2]}${m[3] ? '%' : ''} ${m[4]} ${m[5]})`,
      bytes: tripleToBytes({ L, C, H }),
    };
  }
  return out;
}
