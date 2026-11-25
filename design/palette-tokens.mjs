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
import { oklchToRgb, oklchFromRgb } from './grill/okcolor.mjs';

export const GLOBAL_CSS = new URL('../src/styles/global.css', import.meta.url);

// L may be written as a percentage (every shipped token does) or as 0..1; hue may carry `deg`.
export const TOKEN_RE = /--color-([a-z0-9-]+)\s*:\s*oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)/g;

export const parseOklch = (s) => {
  const m = /oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)/.exec(String(s ?? ''));
  if (!m) return null;
  return { L: m[2] ? Number(m[1]) / 100 : Number(m[1]), C: Number(m[3]), H: Number(m[4]) };
};

// THE UNIT TRAP (found @measured 2026-11-25 by .design/tmp-bytes-probe.mjs): this module's `L` is normalised to
// 0..1, because that is the unit its readers compare in (check:social's palette-currency rule matches a report's
// triple at +/-0.004 on L in 0..1). okcolor's `tripleToBytes` takes `L` as a PERCENTAGE and divides by 100. Hand a
// 0..1 L to it and every token paints #000000 - no error, no NaN, just black, and a reader that never looked at
// `bytes` before (rounds 21/22 compare `spec` and `contrastTriple`, not `bytes`) never sees it. So the conversion
// here calls `oklchToRgb(L, C, H)` directly, in the module's own unit, and `assertTokenBytes` re-derives the
// declared triple from the bytes it produced: a unit slip moves L by ~1.0, so the guard cannot be missed. A silent
// black is the worst failure a colour instrument can have - every contrast it prints comes out as 1.00 and reads
// as a measurement rather than as a crash.

// Re-derive the declared triple from the bytes it produced and refuse the pair if they disagree.
// Bars are generous on purpose: gamut-clipping already moves the round trip this much on the shipped palette
// (@measured 2026-11-25 by .design/tmp-roundtrip.mjs, Linux native, node 24.22.1, all 23 tokens): worst dL 0.0107
// and worst dC 0.0205, both on --color-path-calendar, which is out of gamut. A unit slip is two orders of
// magnitude bigger than that, so this catches the class without hunting the two clipped tokens.
export function assertTokenBytes(t, bytes) {
  const back = oklchFromRgb(...bytes);
  if (Math.abs(back.L - t.L) > 0.03 || Math.abs(back.C - t.C) > 0.05) {
    throw new Error(
      `palette-tokens: --color-${t.name} is declared oklch(${t.L} ${t.C} ${t.H}) but its bytes ${bytes.join(',')} read back as oklch(${back.L.toFixed(4)} ${back.C.toFixed(4)} ${back.h.toFixed(1)}) — the token→bytes conversion is in the wrong unit (L is 0..1 here; tripleToBytes wants a percentage).`,
    );
  }
  return bytes;
}

// name -> { name, L, C, H, spec, bytes } in @theme order. `spec` is the string the browser is asked for;
// `bytes` are the sRGB bytes that spec resolves to, which is what a painted pixel is compared against.
// L is 0..1; C is 0..~0.4; H is degrees. Re-derive with `oklchFromRgb(bytes)` to compare against a painted pixel.
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
      bytes: assertTokenBytes({ name: m[1], L, C, H }, oklchToRgb(L, C, H).bytes),
    };
  }
  return out;
}

// ---------- candidate colours: declared by a round, never by @theme ----------
// A grill round sometimes needs to price a colour the palette does NOT declare — round 23's gold steer is the case
// that put this here (D316: colour is operator-ratified, so a round may not invent a token, and check:favicon's
// literal rule only compares bytes that exist in @theme). A candidate is a colour the round MEASURES and PRINTS, with
// a name that can never be confused with a shipped one, and it is declared at run time by the round that solves it.
//
// WHY THE REGISTRY LIVES HERE rather than in each round: a candidate's bytes must come from the same token→bytes
// path a shipped token's do, or the round measures one colour while the gate reads another. The D485 unit trap (L
// 0..1 handed to a function wanting a percentage) is exactly the defect a second conversion would re-grow, so a
// candidate is resolved through `oklchToRgb` and put through the same `assertTokenBytes` a token is.
//
// WHY THE SHADOW GUARD: a candidate named `accent` would silently become the thing `check:social` and every mark
// probe read, and the round would look as if it had measured the shipped palette. Declaring a token is the operator's
// act, in @theme, in a commit that re-derives the gates (D316).
export const CANDIDATE_COLOURS = {};
export function declareCandidate(name, spec, declaredBy) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`palette-tokens: candidate name "${name}" must be a lower-case token-shaped name, without the leading --color-`);
  const decl = paletteTokens();
  if (decl[name]) throw new Error(`palette-tokens: candidate "${name}" shadows the declared token --color-${name} (${decl[name].spec}). A round may price a colour @theme does not declare; it may not rename one it does — that is the operator's act (D316).`);
  const p = parseOklch(spec);
  if (!p) throw new Error(`palette-tokens: candidate "${name}" is not an oklch triple: ${spec}`);
  const entry = {
    name, L: p.L, C: p.C, H: p.H,
    spec: `oklch(${(p.L * 100).toFixed(1)}% ${p.C} ${p.H})`,
    bytes: assertTokenBytes({ name, L: p.L, C: p.C, H: p.H }, oklchToRgb(p.L, p.C, p.H).bytes),
    declaredBy: declaredBy ?? 'unknown round',
    token: false,
  };
  CANDIDATE_COLOURS[name] = entry;
  return entry;
}
// Resolve a colour name that a token OR a candidate may own: token first, then candidate. A name in neither set
// throws naming both sets, because the answer a reader needs is "which set is this in", not `undefined`.
export function colourEntry(name, cssPath = GLOBAL_CSS) {
  const decl = paletteTokens(cssPath)[name];
  if (decl) return { ...decl, token: true };
  const c = CANDIDATE_COLOURS[name];
  if (c) return c;
  throw new Error(`palette-tokens: "${name}" is neither a declared --color-${name} nor a declared candidate. Tokens: ${Object.keys(paletteTokens(cssPath)).join(', ')}. Candidates: ${Object.keys(CANDIDATE_COLOURS).join(', ') || '(none declared yet)'}.`);
}

// `node design/palette-tokens.mjs --selftest` — the control is the shipped palette; the planting is the exact
// wrong-unit call that produced the #000000 defect, run through the same assertion the module uses, and it must
// throw and name the token. A guard nobody has seen fire is an assertion, not a detector.
if (process.argv[1] && process.argv[1].endsWith('palette-tokens.mjs') && process.argv.includes('--selftest')) {
  const { tripleToBytes, contrastBytes } = await import('./grill/okcolor.mjs');
  const T = paletteTokens();
  const names = Object.keys(T);
  const expect = { paper: [250, 246, 236], ink: [23, 19, 12] };
  let bad = 0;
  for (const [n, want] of Object.entries(expect)) {
    const got = T[n]?.bytes;
    if (!got || got.join() !== want.join()) { bad++; console.log(`FAIL control: --color-${n} bytes ${got ? got.join(',') : 'missing'}, expected ${want.join(',')}`); }
    else console.log(`ok control: --color-${n} -> ${got.join(',')}`);
  }
  for (const t of Object.values(T)) if (Math.min(...t.bytes) === 0 && Math.max(...t.bytes) === 0) { bad++; console.log(`FAIL control: --color-${t.name} resolves to black`); }
  let planted = 0;
  for (const t of Object.values(T)) {
    try { assertTokenBytes(t, tripleToBytes({ L: t.L, C: t.C, H: t.H })); }
    catch (e) { if (/wrong unit/.test(e.message) && e.message.includes(t.name)) planted++; }
  }
  // The defect's visible symptom, stated exactly: not literally #000000 for every token (a high-chroma token at
  // L 0.01 gamut-maps to 31 on one channel), but the two GROUNDS collapse onto the same pixel, so every contrast
  // printed from them comes out 1.00 and a whole round reads as a measurement instead of a crash.
  const plantedGrounds = ['paper', 'ink'].map((n) => tripleToBytes({ L: T[n].L, C: T[n].C, H: T[n].H }));
  const plantedContrast = contrastBytes(...plantedGrounds);
  const darkestPlanted = Math.max(...Object.values(T).map((t) => Math.max(...tripleToBytes({ L: t.L, C: t.C, H: t.H }))));
  console.log(`ok planting: the wrong-unit call threw for ${planted} of ${names.length} tokens; it collapses paper ${plantedGrounds[0].join(',')} and ink ${plantedGrounds[1].join(',')} to a contrast of ${plantedContrast} (the real card ground pair measures 17.15), brightest channel anywhere in it: ${darkestPlanted}.`);

  // The CANDIDATE path, planted and controlled, because rounds 21/22/23 and `mark-tab` now resolve colour through
  // it. (a) a candidate's bytes must clear the same assertion a shipped token's clear — planted the same wrong-unit
  // way, that assertion must throw and name it. (b) a candidate that takes a declared name must be refused, naming
  // the token it would have hidden. (c) `colourEntry` must resolve a candidate without calling it a token.
  const cSpec = 'oklch(88.5% 0.12 75)';
  const c1 = declareCandidate('selftest-candidate', cSpec, 'palette-tokens --selftest');
  if (c1.bytes.join() === '0,0,0') { bad++; console.log('FAIL candidate: a declared candidate resolved to black'); }
  try { assertTokenBytes(c1, tripleToBytes({ L: c1.L, C: c1.C, H: c1.H })); console.log('FAIL candidate: the wrong-unit bytes for a candidate did NOT throw'); bad++; }
  catch (e) { if (/wrong unit/.test(e.message) && e.message.includes('selftest-candidate')) console.log(`ok candidate: the wrong-unit bytes for a candidate threw and named it (${cSpec} -> ${c1.bytes.join(',')})`); else { bad++; console.log(`FAIL candidate: threw the wrong thing: ${e.message}`); bad++; } }
  const viaEntry = colourEntry('selftest-candidate');
  if (viaEntry.spec !== c1.spec || viaEntry.token !== false) { bad++; console.log(`FAIL candidate: colourEntry resolved it as ${viaEntry.spec} token=${viaEntry.token}, want ${c1.spec} token=false`); }
  else console.log(`ok candidate: colourEntry -> ${viaEntry.spec} bytes ${viaEntry.bytes.join(',')} token=false declaredBy ${viaEntry.declaredBy}`);
  let shadowed = 0;
  try { declareCandidate('accent', cSpec, 'palette-tokens --selftest'); }
  catch (e) { if (/shadows the declared token/.test(e.message) && e.message.includes('--color-accent')) shadowed = 1; else { bad++; console.log(`FAIL shadow: threw the wrong thing: ${e.message}`); } }
  if (!shadowed) { bad++; console.log('FAIL shadow: a candidate named `accent` was accepted — it would have hidden the shipped token from every reader'); }
  else console.log('ok shadow: declaring a candidate named `accent` was refused, naming --color-accent');
  try { colourEntry('no-such-colour'); bad++; console.log('FAIL resolve: an unknown colour name did not throw'); }
  catch (e) { if (/neither a declared/.test(e.message)) console.log('ok resolve: an unknown colour name threw and named both sets'); else { bad++; console.log(`FAIL resolve: threw the wrong thing: ${e.message}`); } }
  delete CANDIDATE_COLOURS['selftest-candidate'];

  if (planted !== names.length || plantedContrast > 1.05 || bad) { console.log(`SELFTEST FAILED (${bad} control failures, ${planted}/${names.length} plantings detected, planted ground contrast ${plantedContrast})`); process.exit(1); }
  console.log(`SELFTEST PASS: ${names.length} tokens, control clean, ${planted} plantings detected, candidate path: 3 controls + 2 plantings`);
}
