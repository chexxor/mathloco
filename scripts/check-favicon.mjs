#!/usr/bin/env node
// check-favicon.mjs — the tab glyph is the site's smallest rendered artifact, and it is the only one
// no browser gate ever looks at. DESIGN.md's rule for rendered artifacts (D118) is that each one gets
// its own pixel gate plus a selftest; public/favicon.svg had neither.
//
//   npm run check:favicon                # the shipped mark
//   node scripts/check-favicon.mjs --selftest
//   node scripts/check-favicon.mjs path/to/mark.svg
//
// Why this exists (2026-11-14, D310): the mark shipped Tailwind's default blue #3b82f6 with a `white`
// glyph — a colour in no token, a pair measuring 3.68, and it had sat in the repo since the Init commit
// through the whole design pass. Nothing in the gate set could have caught it: check:classes scans src/
// for utility writes, check:design audits design/ artifacts, and check:render measures pages in a
// browser that never renders a favicon.
//
// Four rules, all arithmetic from design/grill/okcolor.mjs (the one OKLab implementation this repo
// states its bars in, D101):
//   1. every colour literal in the SVG paints one of the @theme tokens, matching the bytes that token
//      renders as;
//   2. no more than two colours — a mark is one ground and one glyph;
//   3. those two contrast at least 4.5 (the text bar), so the glyph reads at 16px on a tab;
//   4. no reserved join-path hue (--color-path-*): the mark belongs to the club, not to a channel.
//
// Exit 0 = no finding. --selftest plants each defect in a temp file and requires a named failure, plus
// clean controls so a green run means the gate is not merely always green.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { contrastBytes, tripleToBytes, asTriple } from '../design/grill/okcolor.mjs';

const SVG = 'public/favicon.svg';
const THEME = 'src/styles/global.css';
const NAMED = {
  white: '#ffffff', black: '#000000', red: '#ff0000', blue: '#0000ff', green: '#008000',
  gray: '#808080', grey: '#808080', orange: '#ff7f00', yellow: '#ffff00', purple: '#800080',
  teal: '#008080', navy: '#000080', maroon: '#800000', olive: '#808000', lime: '#00ff00',
};

const themeTokens = () => {
  const block = (readFileSync(THEME, 'utf8').match(/@theme\s*\{([\s\S]*?)\}/) || [''])[1];
  const out = {};
  for (const m of block.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const raw = m[2].trim();
    try {
      out[m[1]] = { raw, bytes: tripleToBytes(asTriple(raw)) };
    } catch {
      // not a colour literal (e.g. a color-mix()); it cannot be matched, so it is not a candidate
    }
  }
  return out;
};

const paintLiterals = (svg) => {
  const out = [];
  for (const m of svg.matchAll(/\b(?:fill|stroke|stop-color)\s*=\s*"([^"]+)"/g)) {
    const v = m[1].trim().toLowerCase();
    if (v === 'none' || v === 'currentcolor') continue;
    out.push(NAMED[v] ?? v);
  }
  return out;
};

const faviconFindings = (svgPath) => {
  let svg;
  try {
    svg = readFileSync(svgPath, 'utf8');
  } catch {
    return [`${svgPath} does not exist — the tab has no mark`];
  }
  const tokens = themeTokens();
  if (!Object.keys(tokens).length) return [`${THEME} exposes no colour tokens, so the mark cannot be checked`];

  const findings = [];
  const literals = paintLiterals(svg);
  if (!literals.length) findings.push(`${svgPath} paints nothing — no fill, no stroke`);

  const distinct = [...new Set(literals)];
  if (distinct.length > 2) {
    findings.push(`${svgPath} uses ${distinct.length} colours (${distinct.join(', ')}); a mark is one ground and one glyph`);
  }
  const matched = [];
  for (const v of distinct) {
    if (!/^#[0-9a-f]{6}$/.test(v)) { findings.push(`${svgPath}: unparseable colour ${v}`); continue; }
    const bytes = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    const token = Object.entries(tokens).find(([, t]) => t.bytes.join(',') === bytes.join(','));
    if (!token) {
      const near = Object.entries(tokens)
        .map(([name, t]) => [name, t.bytes, Math.abs(t.bytes[0] - bytes[0]) + Math.abs(t.bytes[1] - bytes[1]) + Math.abs(t.bytes[2] - bytes[2])])
        .sort((a, b) => a[2] - b[2])[0];
      findings.push(`${svgPath}: ${v} is not a token (nearest: --color-${near[0]} renders #${near[1].map((x) => x.toString(16).padStart(2, '0')).join('')})`);
    } else {
      matched.push(token[0]);
      if (token[0].startsWith('path-')) {
        findings.push(`${svgPath}: ${v} is --color-${token[0]}, a hue reserved for a join path (round 3b) — the mark does not belong to a channel`);
      }
    }
  }
  if (distinct.length === 2) {
    const a = [1, 3, 5].map((i) => parseInt(distinct[0].slice(i, i + 2), 16));
    const b = [1, 3, 5].map((i) => parseInt(distinct[1].slice(i, i + 2), 16));
    const r = contrastBytes(a, b);
    if (r < 4.5) findings.push(`${svgPath}: the two colours ${distinct[0]} / ${distinct[1]} measure ${r}, under the 4.5 text bar (DESIGN.md contrast table)`);
  }
  return findings;
};

if (process.argv.includes('--selftest')) {
  const dir = path.join('.design', 'tmp-favicon-selftest');
  mkdirSync(dir, { recursive: true });
  const ink = '#203927', paper = '#fcfaf6', rule = '#849688', gold = '#a25f12', discord = '#a33e25';
  const mark = (a, b, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${a}"/><text x="16" y="16" fill="${b}">x</text>${extra}</svg>`;
  const put = (name, body) => { const p = path.join(dir, name); writeFileSync(p, body); return p; };

  const cases = [
    ['shipped mark passes', SVG, []],
    ['clean control: ink ground, paper glyph', put('clean.svg', mark(ink, paper)), []],
    ['clean control: paper ground, ink glyph', put('control2.svg', mark(paper, ink)), []],
    ['named colour instead of a token', put('named.svg', mark(ink, 'white')), ['not a token']],
    ['a Tailwind hex nobody ratified', put('tailwind.svg', mark(ink, '#3b82f6')), ['not a token']],
    ['ground and glyph too close', put('low.svg', mark(paper, rule)), ['4.5']],
    ['three colours in one mark', put('three.svg', mark(paper, ink, `<rect x="2" y="2" width="8" height="8" fill="${gold}"/>`)), ['3 colours']],
    ['a reserved join-path hue', put('channel.svg', mark(discord, paper)), ['reserved']],
    ['a mark that paints nothing', put('blank.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32"/></svg>'), ['paints nothing']],
    ['a missing mark', path.join(dir, 'nope.svg'), ['does not exist']],
  ];

  let wrong = 0;
  for (const [name, p, expected] of cases) {
    const got = faviconFindings(p);
    const ok = expected.length === 0 ? got.length === 0 : got.some((f) => expected.every((e) => f.includes(e)));
    console.log(`${ok ? 'ok   ' : 'WRONG'} ${name.padEnd(38)} ${got.join(' | ') || 'PASS'}`);
    if (!ok) wrong++;
  }
  rmSync(dir, { recursive: true, force: true });
  console.log(`\n${cases.length} planted favicon cases, ${wrong} wrong`);
  process.exit(wrong ? 1 : 0);
}

const target = process.argv[2] ?? SVG;
const findings = faviconFindings(target);
const svg = readFileSync(target, 'utf8');
console.log(`${target}: paints ${paintLiterals(svg).join(' / ') || 'nothing'}; ${Object.keys(themeTokens()).length} colour tokens in ${THEME}`);
if (!findings.length) { console.log('PASS: every fill is a token, at most two of them, none a reserved hue, and the pair clears 4.5'); process.exit(0); }
findings.forEach((f) => console.log(`FAIL: ${f}`));
process.exit(1);
