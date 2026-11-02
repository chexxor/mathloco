#!/usr/bin/env node
// round9-build.mjs — generate the round-9 COLOUR specimen from the palette module, the token block and the
// site's own text. Run: node design/grill/round9-build.mjs   (or `node design/round9.mjs`, which builds,
// measures and rebuilds with the measured numbers embedded).
//
//   design/grill/round-9.html         the operator's preview — this is where the choice happens
//   design/grill/round-9-census.html  the same panels laid tight, for the painted-pixel census
//   design/grill/round-9-mark.html    the mark colourings on BOTH grounds, laid out for mark-pixels.mjs
//
// Why generated (the design-grill skill requires a no-build HTML preview the operator opens directly, and
// round 8 proved the rule): every colour in the specimen has to come from the same table the measure script
// asserts against and the same table `apply` would write into @theme. A hand-typed specimen drifts, and a
// drifting colour specimen is worse than a drifting type specimen — the whole point of the round is that the
// numbers under each swatch are the swatch's own.
//
// Sources it reads, so the specimen cannot invent the system:
//   src/styles/global.css                    the shipped roles (never re-typed)
//   design/grill/round9-palette.mjs          the candidates, their pairs, the hue-window scan
//   src/lib/brand-mark.mjs                   the mark geometry and MARK_COLOURS
//   .design/render/linelength-_-1240.json     the REAL sentences the landing page renders
//   .design/tmp-color/survey-*.json           the before-numbers (`npm run check:color`)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { MARK, MARK_COLOURS } from '../../src/lib/brand-mark.mjs';
import {
  ROLES, WARM, GROUNDS, MARK_OPTIONS, paletteOptions, surfaceOptions, rearrangements, markPairTable, accentExtras,
  accentCandidates, routeSeparation, shippedGaps, windowScan,
} from './round9-palette.mjs';
import { contrastTriple, dist, hueGap, BARS } from './okcolor.mjs';

const need = (p) => { try { return readFileSync(p, 'utf8'); } catch { throw new Error(`round9-build needs ${p}`); } };

// ---------- real text, off the built landing page (the grill rule: no lorem, placeholders hide problems) ----------
const runsFile = '.design/render/linelength-_-1240.json';
if (!existsSync(runsFile)) {
  console.error(`${runsFile} missing — run: npm run lines:measure:dist   (the specimen quotes the site's own sentences)`);
  process.exit(1);
}
const runs = JSON.parse(need(runsFile)).runs;
const pick = (tag, fsPx, minChars = 0, must = null) => {
  const r = runs.find((x) => x.tag === tag && x.fs === fsPx && x.chars >= minChars && !x.nested && (!must || x.t.includes(must)));
  if (!r) throw new Error(`no ${tag} run at ${fsPx}${must ? ` containing "${must}"` : ''} in ${runsFile}`);
  return r.t;
};
const TEXT = {
  kicker: pick('span', '13.3px', 10),
  h1: pick('h1', '43.7px', 10),
  h2: pick('h2', '30.4px', 10),
  lede: pick('p', '21.1px', 90),
  focus: pick('p', '21.1px', 20, 'Current Focus'),
  body: pick('p', '17.6px', 90),
  cta: pick('a', '13.3px', 10),
  secondary: pick('a', '13.3px', 10, 'Community chat'),
  bandKicker: pick('p', '11.1px', 5, 'Where to next'),
  place: pick('p', '11.1px', 10, 'Minneapolis'),
  feature: pick('p', '17.6px', 60, 'Sessions most months'),
  members: pick('p', '17.6px', 20, 'members'),
};

// ---------- tokens: the shipped roles, plus the candidate roles this round is choosing between ----------
const css = need('src/styles/global.css');
const colourLines = [...css.matchAll(/(--color-[a-z0-9-]+):\s*([^;/]+);/g)].map((m) => `  ${m[1]}: ${m[2].trim()};`);
const PALETTE = paletteOptions();
const EXTRA = accentExtras(PALETTE.scan.bestFar);
const asCss = (t) => `oklch(${t.L}% ${t.C} ${t.H})`;
// the candidate roles are written as `--c-<name>` so a reader can see they are NOT in @theme yet, and so an
// apply batch cannot mistake the specimen's provisional tokens for ratified ones.
const candidateLines = Object.entries(EXTRA).map(([n, t]) => `  --c-${n}: ${asCss(t)};`);
// R-4's re-arranged warm set (imported from the palette module, so the specimen and the cost model cannot
// drift apart), written as --w-* so it reads as provisional and cannot be confused with --color-gold.
const allColourLines = [...colourLines, ...candidateLines, ...Object.entries(WARM).map(([n, t]) => `  --${n}: ${asCss(t)};`)];

const FACES = `
@font-face { font-family: 'Public Sans Variable'; font-style: normal; font-display: block; font-weight: 100 900;
  src: url('../../node_modules/@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2') format('woff2-variations'); }
@font-face { font-family: 'PT Serif'; font-style: normal; font-display: block; font-weight: 400;
  src: url('../../node_modules/@fontsource/pt-serif/files/pt-serif-latin-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'PT Serif'; font-style: normal; font-display: block; font-weight: 700;
  src: url('../../node_modules/@fontsource/pt-serif/files/pt-serif-latin-700-normal.woff2') format('woff2'); }`;
const CHROME = "'Public Sans Variable', sans-serif";
const CONTENT = "'PT Serif', Georgia, serif";
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const V = (name) => `var(${name.startsWith('--') ? name : `--color-${name}`})`;

// ---------- the mark, coloured per option, on a chosen ground ----------
// `split` matters: MARK_COLOURS is keyed by ROLE, and both lines share the role `route`, so a candidate that
// paints the two lines differently carries a grammar change (see MARK_OPTIONS.needs).
function markSVG(opt, ground, boxW, id, extras) {
  const map = ground === 'paper' ? opt.colours : opt.onInk;
  const scale = boxW / MARK.vbW;
  const tokenFor = (name) => (extras[name] ? asCss(extras[name]) : V(name));
  let routeIx = 0;
  const shapes = MARK.shapes.map((s) => {
    let name = map[s.role];
    if (Array.isArray(name)) name = name[routeIx++ % name.length];
    const attrs = s.tag === 'circle' ? `cx="${s.cx}" cy="${s.cy}" r="${s.r}"` : `d="${s.d}"`;
    const dash = s.dash ? ` stroke-dasharray="${s.dash}"` : '';
    return `    <${s.tag} ${attrs} fill="none" stroke="${tokenFor(name)}" stroke-width="${s.sw}"${dash} data-role="${s.role}" data-token="${name}" data-sw="${s.sw}"/>`;
  }).join('\n');
  const dot = MARK.dot;
  const dotName = Array.isArray(map[dot.role]) ? map[dot.role][0] : map[dot.role];
  return `<svg data-mark="${id}" data-markset="${opt.id}" data-ground="${ground}" data-box="${boxW}" viewBox="0 0 ${MARK.vbW} ${MARK.vbH}" width="${boxW}" height="${(MARK.vbH * scale).toFixed(1)}" role="img" aria-label="the club's mark, colouring ${opt.id}">
${shapes}
    <circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${tokenFor(dotName)}" stroke="none" data-role="${dot.role}" data-token="${dotName}" data-sw="0"/>
  </svg>`;
}

// ---------- the three join paths, from the real join band ----------
const PATHS = [
  { label: 'Join on Meetup', hue: 'path-meetup', onInk: 'path-meetup-on-ink', tint: 'path-meetup-tint' },
  { label: 'Discord', hue: 'path-discord', onInk: 'path-discord-on-ink', tint: 'path-discord-tint' },
  { label: 'Add the .ics', hue: 'path-calendar', onInk: 'path-calendar-on-ink', tint: 'path-calendar-tint' },
];

// ---------- one surface policy, painted ----------
// The layout is IDENTICAL in every option; only the colour policy differs, so the census numbers compare like
// like. `data-pair="label|fg|bg"` marks the pairs the measure script resolves on computed bytes.
function surfacePanel(o) {
  const p = o.paint;
  const ring = p.noticeRing ? V(p.noticeRing) : V('rule');
  const ruleCol = V(p.rules);
  // The pair attribute has to name what is PAINTED, not what the policy slot is called: with no chip fill the
  // label inherits the band's text colour, and an attribute that still said `ink on ink` would be checked
  // against ink-on-ink (ratio 1) while the browser painted band-text on ink (10.19) — a DRIFT that is a bug in
  // the specimen, not in the palette.
  const chip = (path) => p.chip
    ? `background:${V(p.chip === 'path' ? path.tint : p.chip)};color:${V(p.chipText ?? 'ink')};`
    : `background:none;color:inherit;`;
  const rail = (path) => p.rail
    ? `border-left:4px solid ${V(p.rail === 'path' ? path.hue : p.rail)};`
    : 'border-left:4px solid transparent;';
  return `
<section class="panel" data-panel="${o.id}" data-policy="${o.id}">
  <div class="phead"><b>${o.id}</b> ${esc(o.title)}</div>
  <div class="hero" data-slot="hero" data-ground="${p.heroGround}" style="background:${V(p.heroGround)};box-shadow:inset 0 0 0 1px ${V(p.heroKeyline)}">
    <div class="kicker" data-slot="kicker" style="color:${V(p.kicker)}">${esc(TEXT.kicker)}</div>
    <h1 style="font-family:${CHROME};font-weight:800;font-size:36.4px;line-height:43.7px;color:${V('ink')}">${esc(TEXT.h1)}</h1>
    <p data-slot="lede" style="font-family:${CONTENT};font-size:21.1px;line-height:28px;color:${V(p.lede)}">${esc(TEXT.lede)}</p>
    <p class="focus" data-slot="focus" data-pair="focus line on hero|${p.focus}|${p.heroGround}" style="font-family:${CHROME};font-weight:600;font-size:17.6px;line-height:24px;color:${V(p.focus)}">${esc(TEXT.focus)}</p>
    <div class="ctarow">
      <div class="ctrl primary" data-slot="cta-primary" data-pair="cta label on ink|band-text|ink" style="font-family:${CHROME};font-size:13.3px;line-height:16px;font-weight:600">${esc(TEXT.cta)}</div>
      <div class="ctrl secondary" data-slot="cta-secondary" data-pair="secondary label on its own fill|ink|paper" style="font-family:${CHROME};font-size:13.3px;line-height:16px;font-weight:500">${esc(TEXT.secondary)}</div>
    </div>
    <div class="markrow">${markSVG({ id: `${o.id}-mark`, colours: p.mark, onInk: MARK_COLOURS.ink }, 'paper', 276, `${o.id}-mark`, EXTRA)}</div>
  </div>

  <div class="intro" data-slot="intro" style="border-top:1px solid ${ruleCol}">
    <h2 style="font-family:${CHROME};font-weight:800;font-size:30.4px;line-height:40px;color:${V('ink')}">${esc(TEXT.h2)}</h2>
    <p style="font-family:${CONTENT};font-size:21.1px;line-height:28px;color:${V('ink-2')}">${esc(TEXT.feature)}</p>
    <ul class="feats">
      ${['Meetup', 'Discord', 'Calendar'].map((k, i) => `<li data-slot="feat-${i}" data-pair="feature body on page|ink|paper" style="border-left:4px solid ${V(p.marker === 'path' ? PATHS[i].hue : (p.marker ?? 'transparent'))}"><span style="font-family:${CONTENT};font-size:17.6px;line-height:24px;color:${V('ink')}">${esc(TEXT.body.slice(0, 96))}</span></li>`).join('')}
    </ul>
  </div>

  <div class="band" data-slot="band" data-ground="ink" style="background:${V(p.bandGround)}">
    <div class="bkicker" style="color:${V(p.bandKicker)}">${esc(TEXT.bandKicker)}</div>
    <div class="paths">
      ${PATHS.map((path, i) => `
      <a class="path" data-slot="path-${i}" data-pair="path ${path.label} on band|${p.bandPathText === 'path' ? path.onInk : p.bandPathText}|${p.bandGround}" style="${rail(path)}color:${V(p.bandPathText === 'path' ? path.onInk : p.bandPathText)}">
        <span class="plabel" style="font-family:${CHROME};font-weight:600;font-size:13.3px;line-height:16px;color:${V(p.bandPathText === 'path' ? path.onInk : p.bandPathText)}">${esc(path.label)}</span>
        <span class="chip" data-pair="chip on chip-track|${p.chip ? (p.chipText ?? 'ink') : (p.bandPathText ?? 'band-text')}|${p.chip ? (p.chip === 'path' ? path.tint : (p.chip ?? p.bandGround)) : p.bandGround}" style="${chip(path)}font-family:${CHROME};font-size:13.3px;line-height:16px">${esc(TEXT.members.slice(0, 34))}</span>
      </a>`).join('')}
    </div>
    <div class="ident" style="color:${V('band-text')};font-family:${CHROME};font-size:11.1px;line-height:16px">${esc(TEXT.place)} · ${esc(TEXT.h1)}</div>
  </div>

  <div class="notice" data-slot="notice" style="box-shadow:inset 0 0 0 1px ${ring}">
    <div class="word" data-pair="notice word on page|${p.noticeWord ?? 'gold'}|paper" style="color:${V(p.noticeWord ?? 'gold')};font-family:${CHROME};font-weight:600;font-size:13.3px;line-height:16px">Not loading</div>
    <div class="body" style="font-family:${CONTENT};font-size:17.6px;line-height:24px;color:${V('ink')}">${esc(TEXT.body.slice(0, 120))}</div>
  </div>
</section>`;
}

// ---------- the palette options: the same UI furniture painted from a different set of hues ----------
// A row paints five things: a text role on paper, a chip label on its fill, a band word on ink, the notice
// word, and the mark. Same five things in every row, so the row-to-row difference IS the hue set.
function paletteRow(o, extras) {
  const col = (name) => (extras[name] ? asCss(extras[name]) : V(name));
  const sw = (name, label, fg, bg, bar) => `
    <span class="sw" data-slot="sw-${name}" data-pair="${esc(`${o.id} ${label}|${fg}|${bg}`)}|${bar}"
      style="background:${col(bg)};color:${col(fg)};font-family:${CHROME};font-size:13.3px;line-height:16px;font-weight:600">${esc(label)}</span>`;
  return `
<div class="palrow" data-panel="P-${o.id}" data-policy="${o.id}">
  <div class="phead"><b>${o.id}</b> ${esc(o.title)} <span class="adds">${esc(o.adds)}</span></div>
  <div class="swrow">${sw('text', 'Current Focus', o.textToken, 'paper', 4.5)}${sw('chip', '158+ members', o.chipFg, o.chipBg, 4.5)}${sw('notice', 'Not loading', o.noticeToken, 'paper', 4.5)}
    <span class="bandchip" data-slot="bandchip-${o.id}" data-pair="${esc(`${o.id} band word|${o.bandToken}|ink`)}|4.5" style="background:${V('ink')};color:${col(o.bandToken)};font-family:${CHROME};font-size:13.3px;line-height:16px;font-weight:600">${esc(TEXT.secondary)}</span>
    ${markSVG({ id: `pal-${o.id}`, colours: o.mark, onInk: o.markInk }, 'paper', 200, `pal-${o.id}`, extras)}
  </div>
  <p class="note">${esc(o.why)}</p>
</div>`;
}

// ---------- measured numbers, embedded so the operator chooses next to measurements ----------
function measuredSection() {
  let rep;
  try { rep = JSON.parse(need('design/grill/round9/report.json')); }
  catch { return `<h2 class="q">Measured</h2><p class="note">Not measured yet — run <code>node design/round9.mjs</code>, then <code>node design/grill/round9-build.mjs</code> to embed the numbers here.</p>`; }
  const panels = rep.panels ?? [];
  const rows = panels.map((p) => `<tr><td><b>${p.id}</b></td><td>${p.chromaticPct}%</td><td>${p.strongPct}%</td><td>${p.faintPct}%</td><td>${p.meanChroma}</td><td>${p.hueFamilies}</td><td>${(p.bands ?? []).map((b) => `${b.hueFrom}–${b.hueFrom + 30}° ${b.pct}%`).join('<br>') || '—'}</td></tr>`).join('');
  // One row per distinct (panel, pair), worst first. The same label recurs across grounds and panels on purpose
  // (S-A's path word is band-text, S-B's is the path colour) — collapsing by label alone would hide that.
  const seen = new Map();
  for (const p of rep.pairs ?? []) seen.set(`${p.panel}|${p.label}|${p.fgToken}|${p.bgToken}`, p);
  const pairs = [...seen.values()]
    .sort((a, b) => (a.pass === b.pass ? b.ratio - a.ratio : a.pass ? 1 : -1))
    .map((p) => `<tr><td>${esc(p.panel)}</td><td>${esc(p.label)}</td><td><code>${esc(p.fgToken)}</code> on <code>${esc(p.bgToken)}</code></td><td>${p.ratio}</td><td>${p.specRatio ?? '—'}</td><td>${p.bar}</td><td class="${p.pass ? '' : 'bad'}">${p.pass ? 'clears' : 'FAILS'}</td></tr>`).join('');
  // The findings are computed from the report rather than typed, so a re-measure cannot leave a stale sentence.
  const byId = Object.fromEntries(panels.map((p) => [p.id, p]));
  const fails = (rep.pairs ?? []).filter((p) => !p.pass);
  const marksBy = Object.fromEntries((rep.marks ?? []).map((m) => [`${m.set}/${m.ground}`, m]));
  const inkShare = (rep.marks ?? []).filter((m) => m.ground === 'paper').map((m) => `${m.set} ${m.at15}px at 1.5 / ${m.inkPixels} ink`).join(', ');
  const findings = [
    byId['S-A'] && byId['S-B'] ? `The shipped tints do not read as colour to the census: <b>S-C</b> paints ${byId['S-C'].faintPct}% of its pixels at chroma 0.01–0.04 (the <code>oklch(95% 0.03 …)</code> fills) but only <b>${byId['S-C'].strongPct}%</b> at chroma ≥ 0.08, the level a reader would call colour. A wash is not area; if area is the goal, the tint has to go above ~0.04 or a darker field has to be used.` : null,
    byId['S-A'] && byId['S-B'] ? `Spend it on meaning and the census sees it: hue families go <b>${byId['S-A'].hueFamilies} → ${byId['S-B'].hueFamilies}</b> and the share a reader would call colour goes <b>${byId['S-A'].strongPct}% → ${byId['S-B'].strongPct}%</b>, for a chromatic total that barely moves (${byId['S-A'].chromaticPct}% → ${byId['S-B'].chromaticPct}%) because the ink band dominates that count.` : null,
    fails.length ? `${fails.length} planted pair(s) fail on the painted bytes: ${fails.map((f) => `<code>${esc(f.fgToken)}</code> on <code>${esc(f.bgToken)}</code> at <b>${f.ratio}</b> (bar ${f.bar}, ${esc(f.panel)})`).join('; ')}. Put a colour on a tinted field and it loses contrast it has on paper — gold is 4.82 on paper and ${fails[0]?.ratio} on tint.` : null,
    marksBy['K-A/paper'] ? `Colouring the mark's two lines costs almost nothing in stroke survival — painted ink per box and the px at/over the 1.5 device-px floor are flat across the four options (on paper, px at 1.5 / ink pixels: ${inkShare}). The difference between them is in the look, not the legibility, so that part is a taste call the numbers cannot make for you.` : null,
    (rep.pairs ?? []).some((p) => p.fgToken === 'accent') ? `The open-window accent is legal but tight: <b>${(rep.pairs ?? []).find((p) => p.fgToken === 'accent' && p.bar === 4.5)?.ratio ?? '—'}</b> as text on paper (bar 4.5) and ${(rep.pairs ?? []).find((p) => p.fgToken === 'accent-on-ink')?.ratio ?? '—'} on the band — both clear by under 0.1, which is inside the noise of a font change. The warm candidate under R-4 sits higher (${(rep.pairs ?? []).find((p) => p.fgToken === 'w-olive')?.ratio ?? '—'} on paper) but costs a palette re-arrangement to exist.` : null,
    rep.tokenChecked ? `Every one of the <b>${rep.tokenChecked}</b> colour tokens in the specimen renders within the same-colour threshold of its spec${rep.tokenUnresolved?.length ? `, EXCEPT the unresolved: ${rep.tokenUnresolved.join(' ')}` : ''}, so the numbers above describe the values in <code>@theme</code>, not an accident of the specimen.` : null,
  ].filter(Boolean);
  return `
<h2 class="q">Measured off this specimen (report ${esc(rep.measuredAt ?? '')} — re-run the builder after a measurement round)</h2>
<ul class="note">${findings.map((f) => `<li>${f}</li>`).join('')}</ul>
<p class="note">The census counts the pixels the browser actually painted inside each panel. Two bars are reported, because one bar hides one trap: chroma ≥ 0.04 is what <code>npm run check:color</code> counts (so these numbers compare with the live page's <b>3.8%</b> at 1240), but <code>ink</code> itself is C 0.045, so that count includes every glyph and the whole dark band; chroma ≥ 0.08 sits above every neutral in <code>@theme</code> and measures the colour a reader would call colour. "Faint" is 0.01–0.04: colourless to an eye, and where a shipped tint lands.</p>
<table class="m"><tr><th>panel</th><th>chromatic ≥0.04</th><th>≥0.08</th><th>faint 0.01–0.04</th><th>mean chroma</th><th>hue families</th><th>where they sit</th></tr>${rows}</table>
<table class="m"><tr><th>mark</th><th>ground</th><th>ink in box</th><th>px at/over 1.5</th><th>px at/over 3.0</th><th>% of its ink at 3.0</th><th>strongest painted rgb</th></tr>${(rep.marks ?? []).map((m) => `<tr><td><b>${m.set}</b></td><td>${m.ground}</td><td>${m.inkPct}% (${m.inkPixels})</td><td>${m.at15}</td><td>${m.at30}</td><td>${m.at30Pct}%</td><td>rgb(${m.strongest?.c}) @${m.strongest?.contrast}</td></tr>`).join('')}</table>
<p class="note">Every pair below is measured on the bytes the browser would paint (the specimen's computed colours read back through a 1px canvas), and the second number is the same pair computed from the <code>@theme</code> token it names. The two agreeing is the check that the specimen is painting the palette rather than an accident of its own markup.</p>
<table class="m"><tr><th>panel</th><th>pair</th><th>tokens</th><th>painted</th><th>token math</th><th>bar</th><th></th></tr>${pairs}</table>`;
}

const shell = (title, body, extraCss = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root {
${allColourLines.join('\n')}
}
${FACES}
* { box-sizing: border-box; }
body { margin: 0; background: var(--color-paper); color: var(--color-ink); font-family: ${CONTENT}; }
h1, h2, p, ul { margin: 0 0 12px 0; }
ul { list-style: none; padding: 0; }
.wrap { max-width: 1240px; margin: 0 auto; padding: 24px 16px 96px; }
h1.q { font-family: ${CHROME}; font-weight: 800; font-size: 30.4px; line-height: 40px; }
h2.q { font-family: ${CHROME}; font-weight: 800; font-size: 25.3px; line-height: 32px; margin-top: 32px; }
.note { font-family: ${CHROME}; font-size: 13.3px; line-height: 20px; color: var(--color-ink-2); max-width: 80ch; }
ul.note { list-style: disc; padding-left: 22px; }
ul.note li { margin-bottom: 8px; }
code { font-family: ui-monospace, monospace; font-size: 12px; }
.panel { padding: 20px 0 28px; border-bottom: 1px solid var(--color-rule); }
.phead { font-family: ${CHROME}; font-size: 13.3px; line-height: 20px; margin-bottom: 10px; color: var(--color-ink-2); }
.phead .adds { display: block; color: var(--color-ink-3); }
.hero { padding: 20px; margin-bottom: 12px; }
.hero .kicker { text-transform: uppercase; letter-spacing: .06em; font-family:${CHROME}; font-size:13.3px; line-height:16px; margin-bottom:6px; }
.ctarow { display: flex; gap: 12px; margin: 14px 0; flex-wrap: wrap; }
.ctrl { display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; padding: 16px 32px; }
.ctrl.primary { background: var(--color-ink); color: var(--color-band-text); }
.ctrl.secondary { background: var(--color-paper); color: var(--color-ink); box-shadow: inset 0 0 0 1px var(--color-rule); }
.markrow { margin-top: 10px; }
.intro { padding: 16px 0; }
.feats li { padding-left: 12px; margin-bottom: 8px; }
.band { padding: 20px; margin: 12px 0; }
.band .bkicker { text-transform: uppercase; letter-spacing: .06em; font-family:${CHROME}; font-size:11.1px; line-height:16px; margin-bottom:10px; }
.band .paths { display: flex; gap: 16px; flex-wrap: wrap; }
.band .path { display: block; padding-left: 12px; }
.band .path .chip { display: inline-block; margin-top: 6px; padding: 4px 8px; border-radius: 4px; }
.band .ident { margin-top: 12px; }
.notice { box-shadow: inset 0 0 0 1px var(--color-rule); border-radius: 6px; padding: 12px 16px; min-height: 80px; max-width: 480px; }
.notice .word { text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
.palrow { padding: 14px 0; border-bottom: 1px solid var(--color-rule); }
.swrow { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.sw, .bandchip { display: inline-block; padding: 8px 12px; border-radius: 4px; }
table.m { border-collapse: collapse; font-family: ${CHROME}; font-size: 13.3px; line-height: 18px; margin: 12px 0; max-width: 100%; }
table.m th, table.m td { border: 1px solid var(--color-rule); padding: 6px 8px; text-align: left; vertical-align: top; }
table.m th { font-weight: 600; }
table.m td.bad { color: var(--color-gold); font-weight: 700; }
.marks { display: flex; gap: 28px; flex-wrap: wrap; align-items: flex-start; }
.markcell { font-family: ${CHROME}; font-size: 12px; color: var(--color-ink-2); margin-bottom: 28px; }
pre.scan { font-family: ui-monospace, monospace; font-size: 12px; line-height: 16px; background: var(--color-panel); padding: 12px; overflow-x: auto; }
${extraCss}
</style></head><body><div class="wrap">
${body}
</div></body></html>`;

// ---------- the scan tables, rendered from the same functions the CLI prints ----------
const w = windowScan();
const acc = accentCandidates();
const extras = { ...accentExtras(acc.bestFar), ...WARM };   // candidate tokens: the open-window accent + the warm set R-4 would open
const markTable = markPairTable(extras);
const sep = routeSeparation(markTable);

const scanSection = `
<h2 class="q">Before any option: what the palette can even hold</h2>
<p class="note">Six hue families are already reserved — <code>ink/rule/tint/band-text</code> at 152°,
<code>gold</code>/<code>gold-on-ink</code> at 62°/84°, and one hue per join path at 35°, 105°, 205°, 315°.
Round 3b ratified that a NEW hue keeps ≥ 40° from the primary and from every reserved path hue. That rule is
arithmetic on a wheel, so the room left is arithmetic too:</p>
<pre class="scan">${w.banned.map((b) => `banned ${String(b.from).padStart(3)}-${String(b.to).padEnd(3)}  from ${b.name} at ${Math.round(b.hue)} deg`).join('\n')}
FREE: ${w.freeDegrees} of 360 degrees -> ${w.windows.map((x) => `${x.from}-${x.to} (${x.width} wide)`).join(', ') || 'nothing'}</pre>
<p class="note">And the shipped palette measured against its own rule — two of these are per-ground twins of one
role (allowed, they never share a ground), but <b>gold vs path-discord is 27°</b>, under the bar a new hue is
asked to clear. Whether that is an exception to write down or a bug to fix is a question for this round:</p>
<pre class="scan">${shippedGaps().map((g) => `${g.a} <-> ${g.b}: ${g.gap} deg  (delta-OKLab ${g.oklab})`).join('\n')}</pre>
<p class="note">One more arithmetic result, because it decides what a new token has to look like: for any colour
whose luminance sits between paper and ink, its two contrasts multiply to the paper–ink pair (
<b>${contrastTriple(ROLES.paper, ROLES.ink)}</b>). Asking for 4.5 text on paper AND 3.0 graphics on ink asks for
${4.5 * 3} &gt; ${contrastTriple(ROLES.paper, ROLES.ink)} — impossible with one value. That is the proof behind
every <code>-on-ink</code> twin, and behind <code>MARK_COLOURS</code> being keyed per ground.</p>

<h2 class="q">The accent candidates inside the open window</h2>
<p class="note">For each hue and chroma: the lightest value that clears 4.5 as text on paper, the value that
clears the 3.0 graphic bar on paper, the darkest value that carries 4.5 text on the ink band, and how far the
recommendation sits from a commerce brand (delta-OKLab; this repo's own reading is that &lt; 0.05 is the same
colour, and D88 held gold to 0.135). Out-of-gamut is flagged, not clipped.</p>
<table class="m"><tr><th>hue</th><th>C</th><th>text on paper</th><th>graphic on paper</th><th>on-ink twin</th><th>recommended (L chosen for brand distance)</th><th>nearest brand</th></tr>
${acc.rows.map((r) => `<tr><td>${r.hue}°</td><td>${r.chroma.toFixed(2)}</td><td>${r.text ? `L${r.text.t.L} @${r.text.r}` : '—'}</td><td>${r.both ? `L${r.both.t.L} @${r.both.r}` : '—'}</td><td>${r.onInk ? `L${r.onInk.t.L} @${r.onInk.r}` : '—'}</td><td>${r.far ? `L${r.far.t.L} @${r.far.r}; nearest role ${r.far.role} ${r.far.roleGap}` : '—'}</td><td>${r.far ? `${r.far.brand.d} ${esc(r.far.brand.brand)}` : ''}</td></tr>`).join('')}
</table>

<h2 class="q">Could a WARM accent be made legal? What it costs</h2>
<pre class="scan">${rearrangements().map((r) => `${r.id} ${r.title}\n   free ${r.freeDegrees} deg; windows ${r.window.windows.map((x) => `${x.from}-${x.to}(${x.width})`).join(' ') || 'none'}; olive at 100 deg ${r.warmLegal ? 'LEGAL' : 'still banned'}; cost ${r.cost.pairs} pairs\n${r.cost.notes.map((n) => `     - ${n}`).join('\n')}`).join('\n\n')}</pre>`;

// ---------- Q4: the photograph question, rendered as the two surfaces that would hold for one ----------
const photoRow = `
<div class="palrow" data-panel="P-photo" data-policy="photo">
  <div class="phead"><b>PH-A</b> Design the surfaces photo-free (as the hero and the card already are)</div>
  <div class="swrow">
    <div class="venuecard" data-slot="venuecard-drawn" style="box-shadow:inset 0 0 0 1px var(--color-rule)">
      ${markSVG({ id: 'venue-drawn', colours: { sphere: 'rule', route: 'ink', accent: 'gold' }, onInk: MARK_COLOURS.ink }, 'paper', 160, 'venue-drawn', extras)}
      <div style="font-family:${CHROME};font-size:13.3px;line-height:16px;color:var(--color-ink-2)">drawn motif · zero bytes · no rights question</div>
    </div>
  </div>
  <p class="note">The hero and the share card already prove the pattern: the graphic that means something is
  drawn from <code>src/lib/brand-mark.mjs</code>, so it scales, it paints through <code>@theme</code>, and it is
  gated on painted bytes.</p>
</div>
<div class="palrow" data-panel="P-photo-hold" data-policy="photo-hold">
  <div class="phead"><b>PH-B</b> Hold real slots for real photographs (the accepted shot list)</div>
  <div class="swrow">
    <div class="venuecard" data-slot="venuecard-hold">
      <div class="photoslot" data-pair="photo-slot rule on paper|rule|paper" style="box-shadow:inset 0 0 0 1px var(--color-rule)">
        <span style="font-family:${CHROME};font-size:13.3px;line-height:16px;color:var(--color-ink-3)">one set per venue · hands and materials · the board after a meeting</span>
      </div>
      <div style="font-family:${CHROME};font-size:13.3px;line-height:16px;color:var(--color-ink-2)">a slot that is empty today is a promise; the shot list is blocked on a phone camera at a meetup, not on code</div>
    </div>
  </div>
  <p class="note">D94 forbids stock <i>people</i> photography: no photograph of this club exists, so strangers in
  a photo are a false statement about who attends. The accepted shot list is
  <code>.notes/asset-sources.md</code>; strip EXIF/GPS on commit.</p>
</div>`;

// ---------- Q0: whose colour is the loudest on the page ----------
const logoRow = `
<div class="palrow" data-panel="P-logo" data-policy="logo">
  <div class="phead"><b>L-A / L-B</b> The most saturated pixel on the landing page belongs to Meetup</div>
  <div class="swrow">
    <!-- The mark file is gone from the site (deleted 2026-11-02, round 10 ruling), so this panel shows the
         colour that was measured in it rather than the file itself: the evidence is the bytes and the pixel
         count, and a specimen that points at a deleted path is a broken image wearing evidence's clothes. -->
    <div class="sw" data-slot="logo-colour" style="background: rgb(237,28,64);"></div>
    <div class="sw" data-slot="logo-ink" style="background: oklch(32% 0.045 152);"></div>
  </div>
  <p class="note">Measured: <code>rgb(237,28,64)</code>, 14,820 px at chroma 0.226 (x 631–828, y 1956–2144) —
  <b>0.52% of the landing page at 1240, and the most chromatic thing on it</b>. Our own highest-chroma role is
  <code>gold</code> at C 0.12. So "the site is drab" and "the page is loud in one red spot" are both true at once.
  The options: leave the third-party logo as it is; draw our own join-path glyph so nothing third-party saturates
  the page; or out-colour it by raising our own area (Q1/Q2).
  <b>Decided 2026-11-02:</b> the mark is removed and the platforms are named in our own type, with one attribution
  line in the footer (round 10, D132/D133). Consequence measured with the corrected survey: the reader-named colour
  band (C >= 0.08) fell from 0.48% of desktop pixels to 0.02% — the red really was most of our saturation. See
  <code>design/records/0013-*</code> for the rule and its gaps.</p>
</div>`;

// ================= operator-facing specimen =================
const SURF = surfaceOptions();
writeFileSync('design/grill/round-9.html', shell(
  'Round 9 — colour: where it goes, how many hues, and the mark\u2019s two lines',
  `<h1 class="q">Round 9: colour — where it goes, how many hues, and the mark\u2019s two lines</h1>
<p class="note">Generated by <code>node design/grill/round9-build.mjs</code> from
<code>design/grill/round9-palette.mjs</code>, the <code>@theme</code> block,
<code>src/lib/brand-mark.mjs</code> and the sentences the built landing page actually renders. Candidate tokens
are written <code>--c-*</code> / <code>--w-*</code> so they cannot be mistaken for ratified roles. Numbers under
each option are measured by <code>design/grill/round9-measure.js</code> in the same browser the gates use.</p>
${scanSection}

<h2 class="q">Q1. WHERE colour goes — the same page, three colour policies</h2>
<p class="note">Identical layout and copy in all three; only the colour policy changes, so the census under each
one is a comparison rather than a coincidence. Recommendation: <b>S-B</b> — it spends colour on things that mean
something (a join path, the current focus) and buys most of its chromatic area from roles that already exist.</p>
${SURF.map(surfacePanel).join('\n')}

<h2 class="q">Q2. HOW MANY hues — the same furniture painted from three different sets</h2>
<p class="note">Each row paints the same five things: a chip label, a notice word, a band path word, a section
marker and the mark. H-A is the shipped set; H-B adds one accent from the open window; H-C is what the palette
looks like if the set is re-arranged (R-4) to open a warm one.</p>
${PALETTE.options.map((o) => paletteRow(o, extras)).join('\n')}

<h2 class="q">Q3. The mark\u2019s two lines — four colourings, on paper and on the dark band</h2>
<p class="note">Both grounds are shown because the hero paints the mark on paper and the footer band and the
share card paint it on ink. Under each pair of marks: the stroke pairs on both grounds, and whether the two
lines are still <i>two things</i> when hue is taken away (luminance) and by this repo\u2019s own
&ldquo;&lt; 0.05 delta-OKLab reads as the same colour&rdquo; bar.</p>
<div class="marks">
${markTable.map((p) => {
    const opt = MARK_OPTIONS.find((m) => m.id === p.id);
    return `<div class="markcell"><div><b>${p.id}</b> ${esc(p.title)}</div>
  <div style="padding:8px;background:var(--color-paper)">${markSVG(opt, 'paper', 240, `preview-${p.id}-paper`, extras)}</div>
  <div style="padding:8px;background:var(--color-ink)">${markSVG(opt, 'ink', 240, `preview-${p.id}-ink`, extras)}</div>
  <div>paper: ${Object.entries(p.paper).map(([r, v]) => `${r} ${v.map((x) => `${x.name} ${x.pair}`).join('/')}`).join(' · ')}</div>
  <div>ink: ${Object.entries(p.ink).map(([r, v]) => `${r} ${v.map((x) => `${x.name} ${x.pair}`).join('/')}`).join(' · ')}</div>
  ${(sep.find((s) => s.id === p.id)?.rows ?? []).map((r) => `<div>${r.ground}: ${r.split ? `delta-OKLab ${r.oklab}${r.same ? ' <<< ONE colour' : ''}, luminance ${r.lumRatioGap}x apart` : 'both lines one colour'}</div>`).join('')}
  ${opt.needs ? `<div><i>needs: ${esc(opt.needs)}</i></div>` : ''}
</div>`;
  }).join('\n')}
</div>

<h2 class="q">Q4. Whose colour is loudest — the Meetup logo</h2>
${logoRow}

<h2 class="q">Q5. Photographs — hold slots, or design photo-free</h2>
${photoRow}

${measuredSection()}`));

// ================= the census specimen (measurement only) =================
// Panels laid tight and stacked so one window contains every one of them: page-measure's screenshot IS the
// window, so a panel below the fold is a panel with no pixels.
writeFileSync('design/grill/round-9-census.html', shell(
  'Round 9 — colour policies, for the pixel census',
  `${SURF.map(surfacePanel).join('\n')}${PALETTE.options.map((o) => paletteRow(o, extras)).join('\n')}`,
  `.panel, .palrow { padding: 10px 0 14px; }
   .hero, .band { padding: 14px; margin-bottom: 8px; }
   .intro { padding: 10px 0; }
   .note { display: none; }`));

// ================= the mark specimen (pixel measurement, both grounds) =================
// ONE mark per row with clean ground beside it: mark-pixels.mjs samples the GROUND from a 10px strip
// immediately left of the box, so two marks side by side make the right-hand one's ground its neighbour's
// ink, and that box then reports "no ink" (round 8 learned this the hard way).
writeFileSync('design/grill/round-9-mark.html', shell(
  'Round 9 — mark colourings, measured on both grounds',
  `${markTable.map((p) => {
    const opt = MARK_OPTIONS.find((m) => m.id === p.id);
    return `<div class="markcell" data-markcell="${p.id}">
  <div>${p.id} on paper — ${esc(p.title)}</div>
  <div style="padding:0 0 0 28px">${markSVG(opt, 'paper', 276, `${p.id}-paper`, extras)}</div>
  <div style="padding:12px 28px;background:var(--color-ink)" data-markground="ink">${markSVG(opt, 'ink', 276, `${p.id}-ink`, extras)}</div>
</div>`;
  }).join('\n')}`,
  `.markcell { margin-bottom: 24px; }`));

console.log(`wrote round-9.html, round-9-census.html, round-9-mark.html`);
console.log(`surface policies: ${SURF.map((s) => s.id).join(' ')}   palette options: ${PALETTE.options.map((o) => o.id).join(' ')}   mark options: ${markTable.map((m) => m.id).join(' ')}`);
if (acc.bestFar) console.log(`recommended accent (predictor): hue ${acc.bestFar.hue} L${acc.bestFar.far.t.L} C${acc.bestFar.chroma} — text ${acc.bestFar.far.r} on paper, on-ink twin ${acc.bestFar.onInk.r}; nearest brand ${acc.bestFar.far.brand.d} ${acc.bestFar.far.brand.brand}`);
else console.log('no accent in the open window clears every bar — H-B has no candidate value to ship');
