// design-extract (phase 1) — measure what the code actually computes, not what it spells.
// Oracle: the same __unstable__loadDesignSystem + candidatesToCss that scripts/check-classes.ts
// uses, so the numbers here are the numbers the build ships. Scratch script (lives in /tmp).
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { __unstable__loadDesignSystem } from '@tailwindcss/node';

const SRC = 'src';
const THEME_CSS = join('src', 'styles', 'global.css');
const MARKUP = new Set(['.astro', '.svelte', '.tsx', '.jsx', '.vue', '.html']);
const CSS = new Set(['.css']);

function walk(dir, exts) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.has(e.slice(e.lastIndexOf('.')))) out.push(full);
  }
  return out.sort();
}
const markupFiles = walk(SRC, MARKUP);
const cssFiles = walk(SRC, CSS);

// ---------------------------------------------------------------- token collection
// Same rule as check-classes: read the places classes are written, don't scan prose.
const NON_CLASS = /[{}()[\];,<>=?|&$`\\'"]/;
const located = [];
const blindSpots = new Set();
for (const file of markupFiles) {
  const text = readFileSync(file, 'utf8');
  const lineOf = (i) => text.slice(0, i).split('\n').length;
  for (const m of text.matchAll(/class\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const value = m[1] ?? m[2] ?? '';
    const start = (m.index ?? 0) + m[0].indexOf(value);
    for (const tok of value.split(/\s+/)) {
      if (!tok || NON_CLASS.test(tok) || tok.startsWith('group') || tok.startsWith('peer')) continue;
      located.push({ token: tok, file, line: lineOf(start) });
    }
  }
  for (const m of text.matchAll(/^\s*(?:class:)([\w-]+)/gm)) located.push({ token: m[1], file, line: lineOf(m.index ?? 0) });
  for (const m of text.matchAll(/class(?::\w+)?\s*=\s*\{/g)) blindSpots.add(`${file}:${lineOf(m.index ?? 0)}`);
}
const occurrences = new Map();
for (const l of located) {
  const rec = occurrences.get(l.token) ?? { count: 0, files: new Set(), lines: [] };
  rec.count++; rec.files.add(l.file); rec.lines.push(`${l.file}:${l.line}`);
  occurrences.set(l.token, rec);
}

// ---------------------------------------------------------------- design system oracle
const ds = await __unstable__loadDesignSystem(readFileSync(THEME_CSS, 'utf8'), { base: process.cwd() });
const allTokens = [...occurrences.keys()];
// `prose` is @tailwindcss/typography: a foreign design system (its own type ramp, spacing
// multipliers and colour vars) arriving through one class in one file. Counting its declarations as
// project values inflates every axis, so it is measured and reported separately.
const PRESET = /^prose(-blue|-gray|-sm|-lg|-invert)?$/;
const isPreset = (t) => PRESET.test(t.split(':').pop());
const presetBundles = [...new Set(allTokens.filter(isPreset))].map((t) => ({
  token: t,
  uses: occurrences.get(t)?.count ?? 0,
  where: (occurrences.get(t)?.lines ?? [])[0],
}));
for (const t of allTokens) if (isPreset(t)) occurrences.delete(t);
const tokens = allTokens.filter((t) => !isPreset(t));
const cssOf = ds.candidatesToCss(tokens);
const unresolved = [];

// theme var -> literal value, so calc(var(--spacing) * 12) becomes 48px
function themeValue(name) {
  for (const form of [`--${name}`, name]) {
    try {
      const v = ds.resolveThemeValue(form);
      if (v) return Array.isArray(v) ? v[0] : v;
    } catch {}
  }
  try {
    const v = ds.theme.get(name);
    if (v) return Array.isArray(v) ? v[0] : v;
  } catch {}
  return undefined;
}
const themeCache = new Map();
function resolveVar(name) {
  if (!themeCache.has(name)) themeCache.set(name, themeValue(name.slice(2)) ?? themeValue(name));
  return themeCache.get(name);
}

// var() with a fallback that is itself a var() (Tailwind's leading pattern), so resolve inner-first.
function substVars(s, depth = 0) {
  if (depth > 6 || !s.includes('var(')) return s;
  return substVars(
    s.replace(/var\((--[\w-]+)(\s*,\s*(.+))?\)/g, (full, v, _c, fb) => {
      const resolved = resolveVar(v);
      if (resolved) return String(resolved);
      if (fb) return substVars(fb.trim(), depth + 1);
      return 'NaN';
    }),
    depth + 1,
  );
}

function toPx(raw) {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  s = substVars(s);
  const calc = s.match(/^calc\(\s*([\d.]+)(rem|px|em)?\s*\*\s*([\d.]+)\s*\)$/) ?? s.match(/^calc\(\s*([\d.]+)\s*\*\s*([\d.]+)(rem|px|em)?\s*\)$/);
  if (calc) {
    const [, a, u1, b] = calc;
    const unit = u1 || 'px';
    const n = parseFloat(a) * parseFloat(b);
    return unit === 'rem' ? n * 16 : unit === 'em' ? n * 16 : n;
  }
  const one = s.match(/^(-?[\d.]+)(rem|px|em|%)$/);
  if (one) {
    const n = parseFloat(one[1]);
    return one[2] === 'rem' ? n * 16 : one[2] === 'em' ? n * 16 : one[2] === '%' ? s : n;
  }
  const bare = s.match(/^-?[\d.]+$/);
  return bare ? parseFloat(bare) : undefined;
}

const PROP_GROUPS = {
  'font-size': 'typeSize', 'line-height': 'leading', 'letter-spacing': 'tracking', 'font-weight': 'weight',
  'padding-top': 'spacing', 'padding-bottom': 'spacing', 'padding-left': 'spacing', 'padding-right': 'spacing',
  'margin-top': 'spacing', 'margin-bottom': 'spacing', 'margin-left': 'spacing', 'margin-right': 'spacing',
  'gap': 'spacing', 'row-gap': 'spacing', 'column-gap': 'spacing',
  'border-radius': 'radius', 'border-width': 'border',
  'color': 'color', 'background-color': 'color', 'border-color': 'color', 'text-decoration-color': 'color',
  'box-shadow': 'shadow', 'transition-duration': 'duration', 'transition-timing-function': 'easing',
  'transition-property': 'transition', 'max-width': 'width', 'width': 'width', 'height': 'height',
};

// per-token resolved declarations
const byToken = new Map();
tokens.forEach((tok, i) => {
  const css = cssOf[i];
  if (css === null) { unresolved.push(tok); return; }
  const body = css.replace(/@property[^}]*\}/g, '').match(/\{([\s\S]*?)\}/g) ?? [];
  const decls = [];
  for (const block of body) {
    for (const d of block.slice(1, -1).split(';')) {
      const m = d.match(/^\s*([a-z-]+)\s*:\s*([\s\S]+)$/);
      if (m && !m[1].startsWith('--')) decls.push([m[1], m[2].trim()]);
    }
  }
  byToken.set(tok, decls);
});

function axis(name, pick) {
  const values = new Map(); // value -> {count, tokens:Set, files:Set}
  for (const [tok, decls] of byToken) {
    const occ = occurrences.get(tok);
    for (const [prop, raw] of decls) {
      if (PROP_GROUPS[prop] !== name) continue;
      const key = pick(raw) ?? raw;
      const rec = values.get(key) ?? { count: 0, tokens: new Set(), files: new Set() };
      rec.count += occ.count; rec.tokens.add(tok);
      for (const f of occ.files) rec.files.add(f);
      values.set(key, rec);
    }
  }
  const sorted = [...values.entries()].sort((a, b) => b[1].count - a[1].count);
  const total = sorted.reduce((s, [, r]) => s + r.count, 0);
  let run = 0; const workingSet = [];
  for (const [v, r] of sorted) { run += r.count; workingSet.push(v); if (run / total >= 0.8) break; }
  const longTail = sorted.filter(([, r]) => r.count <= 2).map(([v]) => v);
  const nearDuplicates = [];
  const nums = sorted.map(([v]) => toPx(v)).filter((n) => typeof n === 'number');
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++) {
      const a = nums[i], b = nums[j];
      if (a === b) continue;
      const diff = Math.abs(a - b) / Math.max(a, b);
      if (diff > 0.001 && diff <= 0.15) nearDuplicates.push([a, b, +(diff * 100).toFixed(1)]);
    }
  return {
    total, distinct: sorted.length, workingSet, longTail,
    nearDuplicates: nearDuplicates.slice(0, 40),
    values: sorted.map(([v, r]) => ({ value: v, count: r.count, tokens: [...r.tokens].slice(0, 12), files: [...r.files].length })),
  };
}

const axes = {};
axes.spacing = axis('spacing', toPx);
axes.typeSize = axis('typeSize', toPx);
axes.leading = axis('leading', toPx);
axes.tracking = axis('tracking', toPx);
axes.weight = axis('weight', toPx);
axes.radius = axis('radius', toPx);
axes.border = axis('border', toPx);
axes.color = axis('color', (raw) => raw);
axes.shadow = axis('shadow', (raw) => (raw.match(/\b\d+px\b/g) ?? []).join(' '));
axes.duration = axis('duration', (raw) => raw);
axes.easing = axis('easing', (raw) => raw);
axes.width = axis('width', toPx);

// ---------------------------------------------------------------- hand-written CSS values
const handWritten = [];
for (const file of [...cssFiles, ...markupFiles]) {
  const text = file.endsWith('.css') ? text_of(file) : styleBlocks(file);
  for (const block of text) {
    for (const m of block.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)) {
      const prop = m[1];
      if (PROP_GROUPS[prop] && !prop.startsWith('--')) handWritten.push({ file, prop, value: m[2].trim() });
    }
    for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) handWritten.push({ file, prop: 'theme-var', value: `${m[1]}: ${m[2].trim()}` });
  }
}
function text_of(f) { return [readFileSync(f, 'utf8')]; }
function styleBlocks(f) {
  const out = [];
  for (const m of readFileSync(f, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) out.push(m[1] ?? '');
  return out;
}

// ---------------------------------------------------------------- arbitrary / one-off detection
// Tailwind v4 generates an integer spacing step for ANY integer (`mt-23` is legal), so the
// design-extract skill's bracket-only grep finds nothing here. Flag non-default steps instead.
const DEFAULT_TYPE = new Set(['xs','sm','base','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl','8xl','9xl']);
const oneOffs = [];
for (const tok of tokens) {
  const utility = tok.split(':').pop();
  const m = utility.match(/^((?:m|p|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|leading|tracking|indent|w|h|max-w|max-h|min-w|min-h|origin|inset|top|bottom|left|right|border|rounded|duration|z)-)(\d+(?:\.\d+)?)(\/\d+)?$/);
  if (m) {
    const step = parseFloat(m[2]);
    const kind = PROP_GROUPS[(byToken.get(tok)?.[0]?.[0]) ?? ''] ?? 'unknown';
    oneOffs.push({ token: tok, step, kind, count: occurrences.get(tok).count, where: occurrences.get(tok).lines[0] });
  } else if (/^text-[a-z0-9]+$/.test(utility) && !DEFAULT_TYPE.has(utility.slice(5)) && !/^text-(white|black|transparent|current|inherit)$/.test(utility) && !/^text-(left|center|right|justify|wrap|nowrap|balance|pretty|uppercase|lowercase|capitalize)$/.test(utility)) {
    oneOffs.push({ token: tok, step: utility.slice(5), kind: 'typeSize?', count: occurrences.get(tok).count, where: occurrences.get(tok).lines[0] });
  }
}

// ---------------------------------------------------------------- scale-fit counts
const px = (arr) => arr.map(toPx).filter((n) => typeof n === 'number');
const spacingNums = px(axes.spacing.values.map((v) => v.value));
const fits = (nums, steps) => {
  let n = 0; const miss = [];
  for (const v of new Set(nums)) {
    const nearest = steps.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
    if (Math.abs(nearest - v) < 2) n++; else miss.push(v);
  }
  return { of: new Set(nums).size, fit: n, off: miss.sort((a, b) => a - b) };
};
const grid4 = Array.from({ length: 25 }, (_, i) => i * 4);
const grid8 = Array.from({ length: 13 }, (_, i) => i * 8);
const typeNums = px(axes.typeSize.values.map((v) => v.value));
const typeFit = {};
for (const ratio of [1.125, 1.2, 1.25, 1.333]) {
  let best = { fit: -1 };
  for (const base of [12, 13, 14, 15, 16]) {
    const steps = Array.from({ length: 9 }, (_, k) => base * Math.pow(ratio, k - 2));
    const r = fits(typeNums, steps);
    if (r.fit > best.fit) best = { ...r, ratio, base };
  }
  typeFit[`ratio-${ratio}`] = best;
}
const radiusNums = px(axes.radius.values.map((v) => v.value));
const radiusFit = {};
for (const base of new Set(radiusNums)) radiusFit[`base-${base}`] = fits(radiusNums, [base - 2, base, base + 2, base * 2, 9999]);

// ---------------------------------------------------------------- responsive type ramps
const ramps = [];
for (const file of markupFiles) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/class\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const toks = (m[1] ?? m[2] ?? '').split(/\s+/).filter((t) => /(?:^|:)text-(?:xs|sm|base|lg|xl|[2-9]xl)$/.test(t));
    if (toks.length < 2) continue;
    const steps = toks.map((t) => {
      const parts = t.split(':');
      return { variant: parts.length > 1 ? parts.slice(0, -1).join(':') : 'base', px: toPx(themeValue(`text-${parts.at(-1).slice(5)}`)) };
    });
    let inverted = false;
    for (let i = 1; i < steps.length; i++) if (steps[i].px !== undefined && steps[i - 1].px !== undefined && steps[i].px < steps[i - 1].px) inverted = true;
    if (inverted) ramps.push({ file, tokens: toks, steps });
  }
}

// Which components are never imported: design-apply needs this as a fact, not a hunch, and it changes
// what a contrast failure even means (a colour in a dead component is deleted, not fixed).
const imports = new Set();
for (const f of markupFiles.concat(cssFiles)) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/(?:^|\s)(?:import|export)[^;]*?from\s+['"]([^'"]+)['"]/g)) imports.add(m[1]);
  for (const m of text.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g))
    for (const s of m[0].matchAll(/from\s+['"]([^'"]+)['"]/g)) imports.add(s[1]);
}
const bareOf = (f) => f.replace(/^src\//, '').replace(/\.(astro|svelte)$/, '');
const deadByImport = markupFiles
  .filter((f) => !f.includes('/pages/'))
  .filter((f) => !f.endsWith('/Layout.astro'))
  .filter((f) => {
    const bare = bareOf(f);
    const short = bare.split('/').pop();
    const noDir = bare.replace(/^(components|lib|layouts|styles|assets)\//, '');
    return ![...imports].some((s) => {
      const n = s.replace(/^(@|\.\/?|\.\.\/|~\/)/, '').replace(/^src\//, '').replace(/\.(astro|svelte|css)$/, '');
      return n === bare || n === noDir || n === short || n.endsWith(`/${short}`);
    });
  });

const SURFACES = { white: '#fff', bookGray: substVars('var(--color-book-gray)') };

// ---------------------------------------------------------------- shipped colour pairs -> contrast
// Phase 1 measures; it does not redesign. But the pairs the code *already writes* are measurable, and
// WCAG 1.4.3 is arithmetic, so the colour round in design-grill can quote real ratios instead of
// opinions. Ratio from relative luminance; oklch parsed through Oklab (the Oklab -> linear-sRGB matrix).
function parseColor(raw) {
  const s = substVars(String(raw)).trim();
  const oklch = s.match(/^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)(e-\d+)?\s+(-?[\d.]+)(deg)?\s*(?:\/\s*([\d.]+)(%)?\s*)?\)$/);
  if (oklch) {
    let L = parseFloat(oklch[1]);
    if (oklch[2]) L /= 100;
    let C = parseFloat(oklch[3]);
    if (oklch[4]) C *= 10 ** parseFloat(oklch[4].slice(1));
    const H = parseFloat(oklch[5]);
    const h = (H * Math.PI) / 180;
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const sb = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.307718152 * m + 0.2309699292 * sb, -1.2684380046 * l + 2.6092572011 * m - 0.3413193965 * sb, -0.0041960863 * l - 0.7034118309 * m + 1.707614701 * sb];
  }
  const hex = s.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const enc = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    return enc.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  }
  const rgb = s.match(/^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)/);
  if (rgb) {
    const enc = [1, 2, 3].map((i) => parseInt(rgb[i], 10) / 255);
    return enc.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  }
  if (/^white$/i.test(s)) return [1, 1, 1];
  if (/^black$/i.test(s)) return [0, 0, 0];
  return undefined;
}
const lum = (lin) => lin && 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
function contrast(a, b) {
  const la = lum(parseColor(a)), lb = lum(parseColor(b));
  if (la === undefined || lb === undefined) return undefined;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
}
const colorLiteral = (tok) => {
  const decls = byToken.get(tok) ?? [];
  const d = decls.find(([p]) => ['color', 'background-color'].includes(p));
  return d ? substVars(d[1]) : undefined;
};
const pairCounts = new Map();
for (const file of markupFiles) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/class\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const toks = (m[1] ?? m[2] ?? '').split(/\s+/).filter((t) => !NON_CLASS.test(t));
    const fg = toks.filter((t) => /(?:^|:)text-[a-z]/.test(t) && (byToken.get(t) ?? []).some(([p]) => p === 'color'));
    const bg = toks.filter((t) => /(?:^|:)bg-[a-z]/.test(t) && (byToken.get(t) ?? []).some(([p]) => p === 'background-color'));
    for (const f of fg)
      for (const b of bg) {
        const key = `${colorLiteral(f)} on ${colorLiteral(b)}`;
        const rec = pairCounts.get(key) ?? { count: 0, tokens: new Set(), files: new Set() };
        rec.count++; rec.tokens.add(`${f} + ${b}`); rec.files.add(file);
        pairCounts.set(key, rec);
      }
  }
}
const shippedPairs = [...pairCounts.entries()]
  .map(([pair, rec]) => {
    const [fg, bg] = pair.split(' on ');
    const ratio = contrast(fg, bg);
    return {
      pair, count: rec.count, ratio,
      aaNormalText: ratio === undefined ? 'unknown' : ratio >= 4.5 ? 'pass' : 'fail',
      aaLargeText: ratio === undefined ? 'unknown' : ratio >= 3 ? 'pass' : 'fail',
      tokens: [...rec.tokens].slice(0, 6), files: [...rec.files],
    };
  })
  .sort((a, b) => (a.ratio ?? 99) - (b.ratio ?? 99) || b.count - a.count);

// ---------------------------------------------------------------- type scale tie-break
// Two candidate ratios can both "fit" every size; what separates them is how far each size moves.
const typeFitMoved = {};
for (const [k, v] of Object.entries(typeFit)) {
  const steps = Array.from({ length: 9 }, (_, i) => v.base * Math.pow(v.ratio ?? Number(k.split('-')[1]), i - 2));
  let moved = 0, max = 0;
  for (const val of new Set(typeNums)) {
    const near = steps.reduce((a, b) => (Math.abs(b - val) < Math.abs(a - val) ? b : a));
    moved += Math.abs(near - val); max = Math.max(max, Math.abs(near - val));
  }
  typeFitMoved[k] = { ...v, totalPxMoved: +moved.toFixed(1), maxPxMoved: +max.toFixed(1) };
}

const surfaceOf = (file) => (/Footer\.astro$/.test(file) ? 'bookGray' : 'white');
const colourRecords = new Map();
for (const [tok, decls] of byToken) {
  if (!/(?:^|:)text-[a-z]/.test(tok)) continue;
  const d = decls.find(([p]) => p === 'color');
  if (!d) continue;
  const colour = substVars(d[1]);
  const occ = occurrences.get(tok);
  for (const f of occ.files) {
    const surface = surfaceOf(f);
    const nonText = /icons\//.test(f) || /(^|\s)(fill-current|stroke-current)/.test(f);
    const ratio = contrast(colour, SURFACES[surface]);
    const key = `${colour} @ ${surface} :: ${f}`;
    colourRecords.set(key, {
      colour, surface, surfaceValue: SURFACES[surface], ratio,
      token: tok, file: f,
      kind: /icons\//.test(f) ? 'icon/fill' : 'text',
      required: /icons\//.test(f) ? 3 : 4.5,
      verdict: ratio === undefined ? 'unknown' : ratio >= (/icons\//.test(f) ? 3 : 4.5) ? 'pass' : 'fail',
      deadFile: deadByImport.includes(f),
    });
  }
}
const colourVsSurfaces = [...colourRecords.values()].sort((a, b) => (a.ratio ?? 99) - (b.ratio ?? 99));

// Every colour in use against the two surfaces that actually sit behind text: the white page and the
// footer's book-gray. Class-attribute pairing alone misses these, because the background is page-level.
const textColors = [...new Set(
  [...byToken.entries()]
    .filter(([t]) => /(?:^|:)text-[a-z]/.test(t))
    .map(([, d]) => d.find(([p]) => p === 'color')?.[1])
    .filter(Boolean)
    .map((v) => substVars(v)),
)];
const vsSurfaces = textColors.map((c) => ({
  colour: c,
  onWhite: contrast(c, SURFACES.white),
  whiteOnIt: contrast(SURFACES.white, c),
  onBookGray: contrast(c, SURFACES.bookGray),
  aaNormalOnWhite: contrast(c, SURFACES.white) >= 4.5 ? 'pass' : 'fail',
}));

// ---------------------------------------------------------------- hotspots
const hot = new Map();
for (const l of located) hot.set(l.file, (hot.get(l.file) ?? 0) + 1);
for (const o of oneOffs) hot.set(o.where.split(':')[0], (hot.get(o.where.split(':')[0]) ?? 0) + 2);
const hotspots = [...hot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([file, issues]) => ({ file, issues }));

// ---------------------------------------------------------------- colour inventory (hex + named roles)
const colorStrings = new Map();
for (const file of [...cssFiles, ...markupFiles]) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) colorStrings.set(m[0], (colorStrings.get(m[0]) ?? 0) + 1);
}
const paletteTokens = tokens.filter((t) => /(?:^|:)(?:bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/.test(t));
const roleTokens = tokens.filter((t) => /(?:^|:)(?:bg|text|border|ring)-(?:book-gray|book-theme|background|foreground|primary|secondary|muted|accent|card|popover|destructive)\b/.test(t));

const out = {
  stack: {
    framework: 'astro 7 + @astrojs/cloudflare, Svelte 5 islands',
    tailwind: 4,
    tailwindMajorDetail: `@theme in ${THEME_CSS}; no tailwind.config.*; no components.json (no shadcn/ui)`,
    componentExtensions: [...new Set(markupFiles.map((f) => f.slice(f.lastIndexOf('.'))) )],
    files: { markup: markupFiles.length, css: cssFiles.length },
    oracle: 'scripts/check-classes.ts oracle: __unstable__loadDesignSystem(global.css) + candidatesToCss, resolved through resolveThemeValue',
  },
  tokens: {
    written: located.length,
    distinct: tokens.length,
    presetBundles,
    note: '`prose` is excluded from every axis: @tailwindcss/typography brings its own type ramp, spacing multipliers and colour vars. It is in play in exactly one place — `src/components/DiscordSummary.svelte:106`, `class="prose prose-blue max-w-none"` — and `prose-blue` is a blue accent choice.',
    unresolvedByOracle: unresolved,
    dynamicClassBlindSpots: [...blindSpots].sort(),
  },
  axes,
  scaleFit: {
    spacing: { grid4: fits(spacingNums, grid4), grid8: fits(spacingNums, grid8) },
    type: typeFitMoved,
    radius: radiusFit,
  },
  shippedColourPairs: shippedPairs,
  surfaces: SURFACES,
  colourAgainstItsOwnSurface: colourVsSurfaces,
  deadComponents: deadByImport,
  colourVsSurfaces: vsSurfaces.sort((a, b) => (b.onWhite ?? 0) - (a.onWhite ?? 0)),
  oneOffUtilities: oneOffs.sort((a, b) => b.count - a.count),
  responsiveTypeRamps: ramps,
  handWrittenCss: handWritten,
  color: { hexCodes: [...colorStrings.entries()].sort((a, b) => b[1] - a[1]), paletteTokensUsed: paletteTokens.length, distinctPaletteTokens: [...new Set(paletteTokens)].sort(), roleTokensUsed: roleTokens.length },
  hotspots,
};

mkdirSync('.design', { recursive: true });
writeFileSync('.design/drift.json', JSON.stringify(out, null, 2));

// ---------------------------------------------------------------- summary (<= 25 lines)
const pct = (a, b) => `${((a / b) * 100).toFixed(0)}%`;
console.log(`files: ${markupFiles.length} markup + ${cssFiles.length} css under ${SRC}/`);
console.log(`class tokens: ${located.length} written, ${tokens.length} distinct, ${unresolved.length} unresolved by the oracle, ${blindSpots.size} dynamic blind spot(s)`);
const AXES = Object.entries(axes).filter(([, a]) => a.distinct > 0);
for (let i = 0; i < AXES.length; i += 4) {
  console.log(AXES.slice(i, i + 4).map(([k, a]) => `${k}: ${a.distinct} distinct / ${a.total} uses, 80%-set ${a.workingSet.length}, tail ${a.longTail.length}`).join('  |  '));
}
console.log(`spacing grid fit: 4px ${out.scaleFit.spacing.grid4.fit}/${out.scaleFit.spacing.grid4.of} values · 8px ${out.scaleFit.spacing.grid8.fit}/${out.scaleFit.spacing.grid8.of} (off: ${out.scaleFit.spacing.grid8.off.join(', ')})`);
console.log(`type scale fit:   ${Object.entries(typeFitMoved).map(([k, v]) => `${k}→${v.fit}/${v.of}@base${v.base} moved ${v.totalPxMoved}px`).join(' · ')}`);
console.log(`radius fit:       ${Object.entries(radiusFit).map(([k, v]) => `${k}→${v.fit}/${v.of}`).join(' ')}`);
console.log(`shipped colour pairs (worst first; AA normal 4.5, large 3.0):`);
for (const p of shippedPairs.slice(0, 4))
  console.log(`  ${String(p.ratio).padStart(5)}  ${p.aaNormalText.padEnd(5)} ${String(p.count).padStart(2)}x  ${p.pair}`);
console.log(`text/icon colours failing against the surface they actually sit on (white page, book-gray footer; icons need 3.0, text 4.5):`);
for (const v of colourVsSurfaces.filter((v) => v.verdict === 'fail').slice(0, 6))
  console.log(`  ${String(v.ratio).padStart(5)}  ${v.kind.padEnd(8)} ${v.surface.padEnd(9)} ${v.token.padEnd(18)} ${v.file}${v.deadFile ? ' (component never imported)' : ''}`);
console.log(`one-off utilities (v4 integer steps, not brackets): ${oneOffs.length} distinct — e.g. ${oneOffs.slice(0, 6).map((o) => `${o.token}(${o.count}x)`).join(', ')}`);
console.log(`responsive type ramps that get SMALLER at a wider breakpoint: ${ramps.length} (all in HeroSection: ${[...new Set(ramps.map((r) => r.tokens.join(' ')))].join(' | ')})`);
console.log(`colour: ${[...new Set(paletteTokens)].length} palette tokens written directly · ${roleTokens.length} named-role uses · hand-written CSS declarations ${handWritten.length} (Layout.astro <style> block + @theme)`);
console.log(`prose: @tailwindcss/typography is a second, foreign design system, in play at ${presetBundles.map((b) => `${b.token} (${b.uses}x) ${b.where}`).join(', ')}`);
console.log(`components never imported by anything in src/: ${deadByImport.length ? deadByImport.join(', ') : 'none'}`);
console.log('hotspots (class writes + one-off penalties):');
for (const h of hotspots.slice(0, 4)) console.log(`  ${h.file}  ${h.issues}`);
console.log(`wrote .design/drift.json (${(JSON.stringify(out).length / 1024).toFixed(1)} KB)`);
