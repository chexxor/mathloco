#!/usr/bin/env node
// check-favicon.mjs — the tab glyph is the site's smallest rendered artifact, and it is the only one
// no browser gate ever looks at. DESIGN.md's rule for rendered artifacts (D118) is that each one gets
// its own pixel gate plus a selftest; public/favicon.svg had neither.
//
//   npm run check:favicon                # the shipped logo
//   node scripts/check-favicon.mjs --selftest
//   node scripts/check-favicon.mjs path/to/logo.svg
//
// Why this exists (2026-11-14, D310): the logo shipped Tailwind's default blue #3b82f6 with a `white`
// glyph — a colour in no token, a pair measuring 3.68, and it had sat in the repo since the Init commit
// through the whole design pass. Nothing in the gate set could have caught it: check:classes scans src/
// for utility writes, check:design audits design/ artifacts, and check:render measures pages in a browser
// that never renders a favicon.
//
// Seven rules. Rules 1, 2, 6 and 7 are arithmetic or a real renderer; rules 3, 4 and 5 were RE-DERIVED on
// 2026-11-25 (D494, S113) because the operator ratified a colouring the old rule 3 could not express.
// All arithmetic comes from design/grill/okcolor.mjs (the one OKLab implementation this repo states its
// bars in, D101) and the pixel rules come from design/logo-tab.mjs (the one home for the drawing at tab
// size, D491) — this gate does not re-implement either.
//   1. the document PARSES — it is rasterized by a renderer, so it is handed to one (sharp/librsvg, the same
//      loader the design probes measure with) and any refusal is a finding;
//   2. every colour literal in the SVG paints one of the @theme tokens, matching the bytes that token
//      renders as;
//   3. ONE PLATE, MANY LINES. Exactly one rect covering the whole frame declares the ground, every other
//      paint literal is a LINE, and every line is a colour the logo's own table names for that ground
//      (`LOGO_COLOURS[paper|ink]`) or one of the two surface tokens (`paper`, `ink`);
//   4. the bars, per line: every line clears the 3.0 GRAPHIC bar (D101) against its plate; a mark with
//      exactly ONE line still owes the 4.5 TEXT bar, because a single glyph is read as text;
//   5. a reserved join-path hue (--color-path-*) may NAME A LINE — row C does, and that is Byrne's device,
//      a colour is a line's name (D483) — but may never be the PLATE: the tab is the club, not a channel;
//   6. the line floor, delegated: `lineFloorFindings` (design/logo-tab.mjs, TAB_LINE_FLOOR_PX = 1.0 device
//      px at the 16px slot, the figure the render gate states, measured in S112);
//   7. byte identity, delegated: `byteIdentityFindings` rasterizes at the 16px slot and counts the pixels
//      that actually reach the declared ink byte (TAB_FULL_PIXEL_MIN = 1).
//
// WHY RULE 3 HAD TO CHANGE, in the gate's own words. Round 23 priced 120 framings and one of them (T9) is
// row C — the ratified hero colouring — dropped into a tab, for the sole purpose of printing this gate's
// verdict verbatim rather than arguing about it. @measured 2026-11-25 by `npm run round23`
// (design/grill/round23/report.json): `check:favicon` answered exit 1, "uses 6 colours (#faf6ec, #17130c,
// #a2432a, #007784, #7e3320, #38763c); a logo is one ground and one glyph", plus two refusals for
// `--color-path-calendar` and `--color-path-mobilizon`. A cap on the NUMBER of colours is not a rule about
// a mark; it is a rule about how many inks a printer used, and Byrne's device is precisely that a line's
// colour IS its name (Byrne 1847, quoted in src/lib/logo.mjs). Under a count cap the tab can never carry the
// logo the operator chose, so the cap was replaced by what the count was protecting: one ground (so the mark
// has a surface to sit on), every line drawn from the logo's own table (so a tab cannot invent a colour),
// and the bars that make each line readable (so "more colours" never means "invisible colours"). Rules 6 and
// 7 are the pixel half the literal regex could never reach (D485 is the class: four colour rules printed
// PASS on a document a parser refuses).
//
// Rule 1 is the one added on 2026-11-25 (D485), and it exists because of a finding, not for completeness: the
// file this gate has policed since 2026-11-14 carried `--radius-control` in its own explanatory comment, XML 1.0
// §7.4 forbids `--` inside a comment, and librsvg refuses the whole document. Every other rule here is a regex
// over colour literals, so four rules printed PASS on a tab a parser would not load — the D245 class (gates
// green, what is served broken). A gate that reads literals cannot see whether the document they sit in exists
// as a document; this rule asks a real renderer instead of asserting it.
//
// Exit 0 = no finding. --selftest plants each defect in a temp file and requires a named failure, plus
// clean controls so a green run means the gate is not merely always green. The clean controls are EMITTED
// by design/logo-tab.mjs, never typed (D481 §c: a control written by hand is a claim).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';   // the renderer this rule asks; scripts/check-social-card.mjs already imports it
import { contrastBytes, tripleToBytes, asTriple } from '../design/grill/okcolor.mjs';
import { LOGO_COLOURS } from '../src/lib/logo.mjs';
// Rules 6 and 7 live in the tab instrument. Importing them here is the "one home per rule" rule (AGENTS.md):
// the floor and the byte count are constants in design/logo-tab.mjs, and this gate calls them rather than
// restating 1.0 and 1 — a number quoted twice is a number that drifts.
import { lineFloorFindings, byteIdentityFindings, TAB_LINE_FLOOR_PX, TAB_FULL_PIXEL_MIN,
         tabRow, frameOf, weightFor, withSolvedGold, provenanceComment, artifactSvg } from '../design/logo-tab.mjs';

const SVG = 'public/favicon.svg';
const THEME = 'src/styles/global.css';
// The two grounds LOGO_COLOURS is keyed to. A plate that is neither has no line table to draw from, so rule 3
// refuses it and names the two it knows.
const GROUNDS = Object.keys(LOGO_COLOURS);
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

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Rule 1: does a renderer accept this document? Refusal text is quoted VERBATIM from the parser, because the
// parser's own words are the evidence (a paraphrase of "Comment must not contain '--'" is a claim; the string is
// a fact a reader can re-produce). Returns null when the renderer loads it.
// THE BYTES, NOT THE PATH: @measured 2026-11-25 by .design/tmp-sharp-path.mjs (Linux native, sharp/librsvg) —
// `sharp('public/favicon.svg')` answers "Input file contains unsupported image format" on a document that
// `sharp(Buffer.from(bytes))` loads as a 32x32 svg, and the same file with a 13-byte leading comment loads by
// path too. A path with a long leading comment is a loader quirk, not a defect in the tab, so a gate that handed
// sharp the path would fail a perfectly good logo. Every logo probe in this repo already rasterizes from a Buffer
// (logo-geometry, logo-pixels, round21/22/23); this rule does the same.
const parseFinding = async (svgPath, svg) => {
  try {
    await sharp(Buffer.from(svg)).metadata();
    return null;
  } catch (e) {
    return `${svgPath} is not a document a renderer will load: ${e.message} — a colour literal in a document that never parses paints nothing (rule 1, D485)`;
  }
};

// Rules 3 and 4: which literal is the PLATE, and which are LINES?
// The plate is the rect that covers the whole frame. A document with no such rect has no ground, and the bar
// rules below are measurements OF A LINE AGAINST A GROUND, so they have no input; refusing the mark is the
// honest verdict rather than silently skipping the bars. Every tab glyph this repo has shipped has a plate
// (the incumbent's is `fill="#17130c"`, public/favicon.svg).
function groundAndLineFindings(svg, svgPath, hexToToken) {
  const vb = (svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/) || []).slice(1).map(Number);
  const frame = vb.length === 4 && vb[2] && vb[3]
    ? { w: vb[2], h: vb[3] }
    : { w: +(svg.match(/\bwidth="([\d.]+)"/) || [0, 0])[1], h: +(svg.match(/\bheight="([\d.]+)"/) || [0, 0])[1] };
  if (!frame.w || !frame.h) return [{ plate: null, lines: [], findings: [`${svgPath} declares no frame (no viewBox, no width/height), so nothing in it can be measured against anything (rule 3, D494)`] }];

  const covering = [...svg.matchAll(/<rect\b[^>]*>/g)].filter((m) => {
    const w = +(m[0].match(/\bwidth="([\d.]+)"/) || [0, 0])[1];
    const h = +(m[0].match(/\bheight="([\d.]+)"/) || [0, 0])[1];
    return w >= frame.w - 0.01 && h >= frame.h - 0.01;
  }).map((m) => (m[0].match(/\bfill="(#[0-9a-f]{6})"/) || [])[1]).filter(Boolean);

  const distinctPlate = [...new Set(covering)];
  const findings = [];
  if (!distinctPlate.length) {
    findings.push(`${svgPath} has no plate: no rect covers its ${frame.w}x${frame.h} frame, so there is no ground for a line to be read against — a mark whose surface is not declared cannot be held to a bar (rule 3, D494)`);
    return { plate: null, lines: [], findings };
  }
  if (distinctPlate.length > 1) {
    findings.push(`${svgPath} paints ${distinctPlate.length} grounds (${distinctPlate.join(', ')}) over the same frame; a mark sits on ONE plate (rule 3, D494)`);
    return { plate: null, lines: [], findings };
  }
  const plate = distinctPlate[0];
  const lines = [...new Set(paintLiterals(svg).filter((v) => /^#[0-9a-f]{6}$/.test(v) && v !== plate))];
  const plateToken = hexToToken[plate];

  // Rule 5, the part of it that survives the re-derivation: a channel's hue may name a line, never a ground.
  if (plateToken && plateToken.startsWith('path-')) {
    findings.push(`${svgPath}: the plate is ${plate}, --color-${plateToken}, a hue reserved for a join path (round 3b) — the tab's ground belongs to the club, not to a channel the visitor is being sent to (rule 5, D494)`);
  }

  // Rule 3's membership test. Ground must be one of the two grounds the logo table is keyed to, otherwise the
  // lines have no table; then every line must be a colour that table names, or one of the two surface tokens.
  if (!plateToken || !(GROUNDS.includes(plateToken) || plateToken === 'paper' || plateToken === 'ink')) {
    findings.push(`${svgPath}: its plate is ${plate}${plateToken ? ` (--color-${plateToken})` : ''}, which is not one of the grounds ${'LOGO_COLOURS'} is keyed to (${GROUNDS.join(', ')}), so the logo has no line colours for it (rule 3, D494)`);
    return { plate, lines, findings, ground: null };
  }
  const ground = plateToken === 'paper' || plateToken === 'ink' ? plateToken : plateToken;
  const allowed = new Set([...Object.values(LOGO_COLOURS[ground]), 'paper', 'ink']);
  for (const v of lines) {
    const tok = hexToToken[v];
    if (!allowed.has(tok)) {
      findings.push(`${svgPath}: ${v}${tok ? ` (--color-${tok})` : ''} is not a line the logo names on a ${ground} plate — LOGO_COLOURS.${ground} paints ${[...new Set(Object.values(LOGO_COLOURS[ground]))].join(', ')} plus the surface tokens paper/ink (rule 3, D494)`);
    }
  }

  // Rule 4, the bars. One line = a glyph read as text, so the 4.5 TEXT bar (DESIGN.md contrast table).
  // More than one = every line is a graphic line, so the 3.0 GRAPHIC bar (D101) that every drawn logo in this
  // repo is held to. Marks with 3+ colours used to get NO contrast check at all: that is the hole this fills.
  for (const v of lines) {
    const r = contrastBytes(rgb(plate), rgb(v));
    const bar = lines.length === 1 ? 4.5 : 3.0;
    if (r < bar) {
      findings.push(`${svgPath}: ${v} against its plate ${plate} measures ${r}, under the ${bar.toFixed(1)} ${lines.length === 1 ? 'text' : 'graphic'} bar (DESIGN.md contrast table, D101) (rule 4, D494)`);
    }
  }
  return { plate, lines, findings, ground };
}

const faviconFindings = async (svgPath) => {
  let svg;
  try {
    svg = readFileSync(svgPath, 'utf8');
  } catch {
    return [`${svgPath} does not exist — the tab has no logo`];
  }
  const tokens = themeTokens();
  if (!Object.keys(tokens).length) return [`${THEME} exposes no colour tokens, so the logo cannot be checked`];

  // Every rule below is a regex over literals. A reader who fixes the parse fault next run learns the colour
  // verdict too, so the findings are collected rather than short-circuited — the parse finding leads the list.
  const findings = [];
  const pf = await parseFinding(svgPath, svg);
  if (pf) findings.push(pf);
  const literals = paintLiterals(svg);
  if (!literals.length) findings.push(`${svgPath} paints nothing — no fill, no stroke`);

  const distinct = [...new Set(literals)];
  const hexToToken = {};
  for (const v of distinct) {
    if (!/^#[0-9a-f]{6}$/.test(v)) { findings.push(`${svgPath}: unparseable colour ${v}`); continue; }
    const bytes = rgb(v);
    const token = Object.entries(tokens).find(([, t]) => t.bytes.join(',') === bytes.join(','));
    if (!token) {
      const near = Object.entries(tokens)
        .map(([name, t]) => [name, t.bytes, Math.abs(t.bytes[0] - bytes[0]) + Math.abs(t.bytes[1] - bytes[1]) + Math.abs(t.bytes[2] - bytes[2])])
        .sort((a, b) => a[2] - b[2])[0];
      findings.push(`${svgPath}: ${v} is not a token (nearest: --color-${near[0]} renders #${near[1].map((x) => x.toString(16).padStart(2, '0')).join('')})`);
    } else {
      hexToToken[v] = token[0];
    }
  }

  const { plate, findings: glf } = groundAndLineFindings(svg, svgPath, hexToToken);
  findings.push(...glf);

  // Rules 6 and 7, delegated to the instrument (one home per rule). Both are pure over the document's bytes,
  // so a planted defect in a temp file is caught exactly as the shipped file would be.
  if (plate) {
    findings.push(...lineFloorFindings(svg, svgPath));
    findings.push(...await byteIdentityFindings(svgPath, svg));
  }
  return findings;
};

// Emit an artifact from the instrument, so every clean control in the selftest is the drawing the table
// declares rather than a hand-typed approximation of it (D481 §c, D190).
const emit = (id, ground) => {
  const row = tabRow(id);
  const w = weightFor(row, frameOf(row), row.floorPx ?? null);
  return provenanceComment(withSolvedGold(row), ground, w, null, null) + '\n' + artifactSvg(withSolvedGold(row), ground, w.k);
};

if (process.argv.includes('--selftest')) {
  const dir = path.join('.design', 'tmp-favicon-selftest');
  mkdirSync(dir, { recursive: true });
  // the bytes the adopted tokens paint (D316): ink #17130c, paper #faf6ec, rule #8b7f65, accent #a2432a,
  // band-text #f5f1e9, path-calendar #007784, path-discord #3664be. A fixture that no longer matches a token
  // tests the wrong thing, so these are read from @theme, not typed: `token('accent')`.
  const tokens = themeTokens();
  const hexOfToken = (name) => `#${tokens[name].bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  const ink = hexOfToken('ink'), paper = hexOfToken('paper'), rule = hexOfToken('rule'),
        accent = hexOfToken('accent'), bandText = hexOfToken('band-text'),
        calendar = hexOfToken('path-calendar'), discord = hexOfToken('path-discord');
  // A two-paint mark: the plate rect plus one stroked line thick enough to clear the 1.0 device px floor at
  // the 16px slot (a 4-unit stroke on a 32-unit plate = 2 device px).
  const logo = (a, b, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${a}"/><circle cx="16" cy="16" r="10" fill="none" stroke="${b}" stroke-width="4"/><path d="M10 10 L22 22" fill="none" stroke="${b}" stroke-width="4"/>${extra}</svg>`;
  const put = (name, body) => { const p = path.join(dir, name); writeFileSync(p, body); return p; };

  const cases = [
    // CONTROLS. The shipped glyph, and artifacts the instrument itself generated: the pair framing (T1) and
    // the ratified row C (T9) on BOTH grounds. T9 is the control that proves the re-derived rule admits the
    // colouring the old count cap refused.
    ['shipped logo passes', SVG, []],
    ['control: generated T1/paper (the pair, 1.5 device px at 16)', put('t1-paper.svg', emit('T1', 'paper')), []],
    ['control: generated T1/ink', put('t1-ink.svg', emit('T1', 'ink')), []],
    ['control: generated T9/paper (row C, six paints — the re-derived rule admits it)', put('t9-paper.svg', emit('T9', 'paper')), []],
    ['control: generated T9/ink (row C on ink, five paints)', put('t9-ink.svg', emit('T9', 'ink')), []],
    ['control: generated T8/ink (every line ONE colour — the single-line 4.5 bar)', put('t8-ink.svg', emit('T8', 'ink')), []],
    ['control: a path hue as a LINE (rule 5 re-derived: lines may be channel hues)', put('line-hue.svg', logo(paper, calendar)), []],

    // PLANTINGS.
    ['named colour instead of a token', put('named.svg', logo(ink, 'white')), ['not a token']],
    ['a Tailwind hex nobody ratified (D310, the original defect)', put('tailwind.svg', logo(ink, '#3b82f6')), ['not a token']],
    ['a token the logo never paints as a line', put('ruleline.svg', logo(paper, rule)), ['not a line the logo names', 'under the 4.5 text bar']],
    ['a third colour under the graphic bar (accent on ink is 2.97)', put('three.svg', logo(ink, bandText, `<circle cx="8" cy="8" r="4" fill="none" stroke="${accent}" stroke-width="4"/>`)), ['under the 3.0 graphic bar']],
    ['a single line below the text bar (2.10, accent-strong on ink)', put('close.svg', logo(ink, hexOfToken('accent-strong'))), ['under the 4.5 text bar']],
    ['a reserved join-path hue as the PLATE', put('channel.svg', logo(discord, paper)), ['the plate is', 'reserved']],
    ['a mark painted in its own ground (no ink at all)', put('blank.svg', logo(paper, paper)), ['no ink at all']],
    ['two grounds painted over one frame', put('twoplates.svg', logo(ink, paper).replace('<rect width="32" height="32" rx="6" fill="#17130c"/>', '<rect width="32" height="32" fill="#17130c"/><rect width="32" height="32" fill="#faf6ec"/>')), ['paints 2 grounds']],
    ['no plate at all — nothing to measure a line against', put('no-plate.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#17130c" stroke-width="4"/></svg>'), ['no plate']],
    ['a line thinner than the 1.0 device px floor', put('hairline.svg', emit('T1', 'paper').replace(/stroke-width="[\d.]+"/g, 'stroke-width="1.0"')), ['thinnest line is', 'fully covered ink pixel']],
    // Rule 1's planting is the EXACT defect this gate missed for 11 days: a token name written with its `--` prefix
    // inside the artifact's own comment. Colour-for-colour identical to a clean mark, and unparseable.
    ['a comment a parser refuses (--radius-control)', put('badcomment.svg', `<!-- rx 6 is --radius-control -->\n${logo(ink, paper)}`), ['never parses']],
    ['a missing logo', path.join(dir, 'nope.svg'), ['does not exist']],
  ];

  // A case names the fragments its verdict must contain, and each fragment may land in a DIFFERENT finding:
  // the hairline planting is refused twice (rule 6 for the stroke, rule 7 for the measured bytes), and a colour
  // that is both off-token and off-bar is named by rule 2 and rule 4. Requiring one finding to carry every
  // fragment would make a gate that reports more honestly score as a broken detector.
  let wrong = 0;
  for (const [name, p, expected] of cases) {
    const got = await faviconFindings(p);
    const ok = expected.length === 0 ? got.length === 0 : expected.every((e) => got.some((f) => f.includes(e)));
    console.log(`${ok ? 'ok   ' : 'WRONG'} ${name.padEnd(58)} ${got.join(' | ') || 'PASS'}`);
    if (!ok) wrong++;
  }
  rmSync(dir, { recursive: true, force: true });
  console.log(`\n${cases.length} planted favicon cases, ${wrong} wrong (floor ${TAB_LINE_FLOOR_PX} device px, byte minimum ${TAB_FULL_PIXEL_MIN} pixel)`);
  process.exit(wrong ? 1 : 0);
}

const target = process.argv[2] ?? SVG;
const findings = await faviconFindings(target);
const svg = readFileSync(target, 'utf8');
const paints = paintLiterals(svg);
console.log(`${target}: paints ${paints.join(' / ') || 'nothing'}; ${Object.keys(themeTokens()).length} colour tokens in ${THEME}`);
if (!findings.length) {
  console.log('PASS: the document parses, every fill is a token, it sits on one plate, every line is a colour the logo names for that plate, each clears its bar, no channel hue is the ground, and the lines have bytes at the 16px slot (seven rules, D485 + D494)');
  process.exit(0);
}
findings.forEach((f) => console.log(`FAIL: ${f}`));
process.exit(1);
