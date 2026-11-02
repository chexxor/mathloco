// Rendered-surface oracle for design-extract: the real text/background pairs the built pages
// produce, derived from the DOM ancestor chain in dist/client/**/*.html — not from guessing which
// bg-* class "probably" sits behind a text-* class. Pairs are then measured with WCAG arithmetic.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { __unstable__loadDesignSystem } from '@tailwindcss/node';

const ds = await __unstable__loadDesignSystem(readFileSync('src/styles/global.css', 'utf8'), { base: process.cwd() });
const theme = new Map();
const resolveVar = (name) => {
  if (!theme.has(name)) {
    let v;
    for (const form of [name, name.replace(/^--/, '')]) {
      try { const r = ds.resolveThemeValue(form); if (r) { v = Array.isArray(r) ? r[0] : r; break; } } catch {}
    }
    theme.set(name, v);
  }
  return theme.get(name);
};
const subst = (s, d = 0) => (d > 6 || !String(s).includes('var(')) ? String(s) : subst(s.replace(/var\((--[\w-]+)(\s*,\s*(.+))?\)/g, (full, v, _c, fb) => String(resolveVar(v) ?? (fb ? subst(fb.trim(), d + 1) : 'NaN')), d + 1));

const cssFor = (tok) => {
  const css = ds.candidatesToCss([tok])[0];
  if (!css) return [];
  const decls = [];
  for (const block of css.replace(/@property[^}]*\}/g, '').match(/\{([\s\S]*?)\}/g) ?? [])
    for (const d of block.slice(1, -1).split(';')) {
      const m = d.match(/^\s*([a-z-]+)\s*:\s*([\s\S]+)$/);
      if (m && !m[1].startsWith('--')) decls.push([m[1], m[2].trim()]);
    }
  return decls;
};
const literal = (tok, prop) => {
  const d = cssFor(tok).find(([p]) => p === prop);
  return d ? subst(d[1]) : undefined;
};

// ---------------------------------------------------------------- colour math
function parseColor(raw) {
  const s = subst(String(raw)).trim();
  const oklch = s.match(/^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)(e-\d+)?\s+(-?[\d.]+)(deg)?\s*(?:\/\s*([\d.]+))?\s*\)$/);
  if (oklch) {
    let L = parseFloat(oklch[1]); if (oklch[2]) L /= 100;
    let C = parseFloat(oklch[3]); if (oklch[4]) C *= 10 ** parseFloat(oklch[4].slice(1));
    const H = parseFloat(oklch[5]) * Math.PI / 180;
    const a = C * Math.cos(H), b = C * Math.sin(H);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const sb = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.307718152 * m + 0.2309699292 * sb, -1.2684380046 * l + 2.6092572011 * m - 0.3413193965 * sb, -0.0041960863 * l - 0.7034118309 * m + 1.707614701 * sb];
  }
  const hex = s.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hex) {
    let h = hex[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  }
  const rgb = s.match(/^rgba?\(?\s*(\d+)\s+(\d+)\s+(\d+)/);
  if (rgb) return [1, 2, 3].map((i) => parseInt(rgb[i], 10) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  if (/^white$/i.test(s)) return [1, 1, 1];
  if (/^black$/i.test(s)) return [0, 0, 0];
  return undefined;
}
const lum = (c) => c && 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const ratio = (a, b) => {
  const la = lum(parseColor(a)), lb = lum(parseColor(b));
  if (la === undefined || lb === undefined) return undefined;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
};

// ---------------------------------------------------------------- built DOM walk
const VOID = new Set(['meta', 'link', 'br', 'img', 'hr', 'input', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
function htmlFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (e.endsWith('.html')) out.push(full);
  }
  return out.sort();
}
const pairs = new Map();
const tokenPairExamples = new Map();
for (const file of htmlFiles('dist/client')) {
  const html = readFileSync(file, 'utf8');
  const stack = [];
  let inOpaque = null;
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"])*)>/g;
  let m;
  while ((m = tag.exec(html))) {
    const [full, closing, nameRaw, attrs] = m;
    const name = nameRaw.toLowerCase();
    if (closing) {
      if (inOpaque === name) inOpaque = null;
      const i = stack.lastIndexOf(name);
      if (i >= 0) stack.splice(i);
      continue;
    }
    if (inOpaque) continue;
    if (name === 'script' || name === 'style') { inOpaque = name; continue; }
    const cls = (attrs.match(/class\s*=\s*("([^"]*)"|'([^']*)')/) ?? [])[2] ?? (attrs.match(/class\s*=\s*("([^"]*)"|'([^']*)')/) ?? [])[3] ?? '';
    const toks = cls.split(/\s+/).filter(Boolean);
    stack.push(name);
    if (VOID.has(name)) stack.pop();

    const fg = toks.filter((t) => /(?:^|:)text-[a-z0-9-]+$/.test(t) && cssFor(t).some(([p]) => p === 'color'));
    if (!fg.length) continue;
    // effective background: own class, then nearest ancestor's, then the page (no body background is
    // declared, so the page surface is white).
    let bgTok = toks.find((t) => /(?:^|:)bg-[a-z0-9-]+$/.test(t) && cssFor(t).some(([p]) => p === 'background-color'));
    let bgDepth = 0;
    if (!bgTok) {
      const back = html.slice(0, m.index);
      const ancestors = [...back.matchAll(/<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"])*)>/g)]
        .filter((a) => !VOID.has(a[1].toLowerCase()))
        .map((a) => ((a[2].match(/class\s*=\s*("([^"]*)"|'([^']*)')/) ?? [])[2] ?? '').split(/\s+/).filter(Boolean));
      for (let i = ancestors.length - 1; i >= 0 && !bgTok; i--) {
        const cand = ancestors[i].find((t) => /(?:^|:)bg-[a-z0-9-]+$/.test(t) && cssFor(t).some(([p]) => p === 'background-color'));
        if (cand) { bgTok = cand; bgDepth = ancestors.length - i; }
      }
    }
    const bg = bgTok ? literal(bgTok, 'background-color') : '#fff';
    const nonText = name === 'svg' || toks.includes('fill-current') || toks.includes('stroke-current') || /^(h-|w-)\d+$/.test(toks[0] ?? '');
    for (const f of fg) {
      const fgLit = literal(f, 'color');
      const r = ratio(fgLit, bg);
      const key = `${fgLit}|${bg}|${nonText ? 'non-text' : 'text'}`;
      const rec = pairs.get(key) ?? { count: 0, fgToken: new Set(), bgToken: new Set(), files: new Set(), examples: [] };
      rec.count++;
      rec.fgToken.add(f); rec.bgToken.add(bgTok ?? '(page)'); rec.files.add(file);
      if (rec.examples.length < 3) rec.examples.push(`${file} <${name}> ${f}${bgTok ? ` + ${bgTok}` : ''}`);
      pairs.set(key, rec);
    }
  }
}

const required = { text: 4.5, 'non-text': 3 };
const rendered = [...pairs.entries()].map(([key, rec]) => {
  const [fg, bg, kind] = key.split('|');
  const r = ratio(fg, bg);
  return {
    kind, foreground: fg, background: bg, contrast: r,
    required: required[kind],
    verdict: r === undefined ? 'unparsable' : r >= required[kind] ? 'pass' : 'fail',
    uses: rec.count,
    fgTokens: [...rec.fgToken], bgTokens: [...rec.bgToken],
    files: [...rec.files].map((f) => f.replace('dist/client/', '')),
    examples: rec.examples,
  };
}).sort((a, b) => (a.contrast ?? 99) - (b.contrast ?? 99));

console.log(`built pages walked: ${htmlFiles('dist/client').length} · rendered foreground/background pairs found: ${rendered.length}`);
console.log('worst rendered pairs (text needs 4.5, icons/fills 3.0):');
for (const p of rendered.slice(0, 12))
  console.log(`  ${String(p.contrast).padStart(6)}  ${p.verdict.padEnd(10)} ${p.kind.padEnd(8)} ${String(p.uses).padStart(3)}x  ${p.fgTokens.join(',')} on ${p.bgTokens.join(',')}  (${p.files[0]})`);
console.log(`fails: text ${rendered.filter((p) => p.kind === 'text' && p.verdict === 'fail').length} pairs · non-text ${rendered.filter((p) => p.kind === 'non-text' && p.verdict === 'fail').length} pairs`);
const bgPainted = new Set(rendered.map((p) => p.background));
console.log(`painted surfaces seen: ${[...bgPainted].join(' · ')}`);

const out = JSON.parse(readFileSync('design/drift.json', 'utf8'));
out.renderedPairs = rendered;
out.renderedPairsNote = 'Background resolved through the built DOM ancestor chain in dist/client/**/*.html; the page surface is white because no body background is declared. The Layout.astro `::selection` rule (amber token under white text) is not in this table because it is not a DOM pair: white on var(--color-book-theme) = ' + ratio('#fff', '#f59e0b') + '.';
import { writeFileSync } from 'node:fs';
writeFileSync('design/drift.json', JSON.stringify(out, null, 2));
console.log(`merged into design/drift.json (${(JSON.stringify(out).length / 1024).toFixed(1)} KB)`);
