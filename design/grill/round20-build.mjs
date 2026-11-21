#!/usr/bin/env node
/**
 * round20-build.mjs — the round-20 specimen: the same call to action rendered in each treatment, with the finding
 * the reading produced for it. Generated from `design/grill/round20/report.json`; edit
 * `design/grill/round20-options.mjs` or re-run `node design/round20.mjs`, NEVER this HTML — a generated page embeds
 * what it measured, and a hand-edit here is a claim about a run nobody did (D282).
 *
 * What makes it a specimen and not a screenshot: the samples are the built page's own bytes with one region
 * replaced, rendered here with the built stylesheet and the built faces inlined, so the type, the ink fill and the
 * inset hairline a reader sees are the ones `check:render` measures. That is also the rule that can hurt: a class
 * the built sheet does not ship paints NOTHING (D110, record 0018 — Tailwind generates CSS by scanning source), so
 * every class token in every sample is checked against `dist/client/_astro/*.css` and an unknown one THROWS here
 * rather than printing an unstyled row that reads like a design choice.
 *
 *   node design/grill/round20-build.mjs      # after `node design/round20.mjs`
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORT = resolve('design/grill/round20/report.json');
const OUT = resolve('design/grill/round-20-cta.html');
const ASSETS = resolve('dist/client/_astro');

if (!existsSync(REPORT)) {
  console.error('round20-build: no report — run `node design/round20.mjs` first');
  process.exit(1);
}
let R;
try {
  R = JSON.parse(readFileSync(REPORT, 'utf8'));
} catch (e) {
  console.error(`round20-build: the report is not readable JSON: ${(e.message || '').slice(0, 200)}`);
  process.exit(1);
}
const need = (v, what) => {
  if (v === undefined || v === null) throw new Error(`round20-build: ${what} is missing from the report — refusing to print a blank or a guess`);
  return v;
};
const OPTIONS = need(R.options, 'options');
if (!OPTIONS.length) throw new Error('round20-build: the report has no options');
const CENSUS = need(R.census, 'census');

// --- the built sheet, inlined, with the faces it references inlined behind it -----------------------------
const cssFiles = existsSync(ASSETS) ? readdirSync(ASSETS).filter((n) => n.endsWith('.css')) : [];
if (!cssFiles.length) throw new Error(`round20-build: no stylesheet in ${ASSETS} — build first (\`npm run build\`); a specimen with no sheet is a wall of default browser type pretending to be a design`);
let SHEET = cssFiles.map((n) => readFileSync(resolve(ASSETS, n), 'utf8')).join('\n');

const MIME = { woff2: 'font/woff2', woff: 'font/woff', css: 'text/css', js: 'text/javascript', png: 'image/png', webp: 'image/webp' };
SHEET = SHEET.replace(/url\(\/_astro\/([^)"']+)\)/g, (m, name) => {
  const p = resolve(ASSETS, name);
  if (!existsSync(p)) throw new Error(`round20-build: the sheet references /_astro/${name}, which is not in the build — the specimen would show fallback type while claiming the shipped faces`);
  const ext = name.split('.').pop();
  return `url(data:${MIME[ext] ?? 'application/octet-stream'};base64,${readFileSync(p).toString('base64')})`;
});

/** Does the built sheet actually define this class? A name the Tailwind scanner never saw in `src/` exists in no
 *  rule, and a specimen row that names it paints nothing while reading like a deliberate choice (D110). Two
 *  escapes are needed and skipping either is a bug this function had on its first run: a token with a variant
 *  (`hover:bg-tint`) is written in the sheet as a CSS-escaped selector (`.hover\:bg-tint:hover`), so the token
 *  becomes that selector first (every non-word character backslash-escaped) and only then has its backslashes
 *  doubled for the regex source. A checker that calls 32 real utilities missing is worse than no checker. */
const classInSheet = (cls) => {
  const selector = cls.replace(/[^\w-]/g, (c) => `\\${c}`);
  return new RegExp(`\\.${selector.replace(/\\/g, '\\\\')}(?![\\w-])\\s*[,{:]`).test(SHEET);
};

const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'use', 'path', 'circle', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr']);
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
/** Close whatever the sample left open, so a slice that stops inside a footer still lays out as the page lays it
 *  out. A stack over real page bytes, honest about being one (the same honesty design/cta-rules.mjs declares). */
function balance(html) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  for (;;) {
    const m = re.exec(html);
    if (!m) break;
    const [, closing, name, attrs] = m;
    const tag = name.toLowerCase();
    if (VOID.has(tag) || /\/\s*$/.test(attrs)) continue;
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.splice(i); break; }
      continue;
    }
    stack.push({ tag, attrs });
  }
  return stack.reduceRight((acc, e) => `${acc}</${e.tag}>`, html);
}

// check every class in every sample against the sheet BEFORE writing anything
const unknown = [];
for (const o of OPTIONS) {
  for (const m of stripComments(need(o.sample, `${o.id} sample`)).matchAll(/class="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/).filter(Boolean)) {
      if (!classInSheet(cls)) unknown.push(`${o.id}: .${cls}`);
    }
  }
}
if (unknown.length) {
  throw new Error(`round20-build: the built sheet does not ship these classes — ${[...new Set(unknown)].join(', ')}. A specimen that names them paints nothing (D110).`);
}

const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pct = (x) => (typeof x === 'number' ? `${Math.round(x * 100)}%` : '\u2014');

const shapeWord = { shipped: 'ships today', defect: 'a defect, priced', demotion: 'a demotion' };

const rows = OPTIONS.map((o) => {
  const verdicts = need(o.verdicts, `${o.id} verdicts`);
  if (!verdicts.length) throw new Error(`round20-build: ${o.id} has no verdicts`);
  const vcell = verdicts
    .map((v) => `<div class="v ${v.rule === 'ok' ? 'pass' : 'fail'}"><strong>${esc(v.rule)}</strong>${v.rule === 'ok' ? '' : `<div class="d">${esc(v.detail)}</div>`}</div>`)
    .join('');
  const figs = verdicts
    .map(
      (v) =>
        `<tr><td>${esc(v.label)}</td><td>${esc(v.accessible)}</td><td>${esc(v.declaredId ?? '\u2014')}</td><td>${esc(v.control ?? 'no control role')}</td><td class="n">${v.blockIds ? esc(v.blockIds.join(' ')) : '<em>none declared</em>'}</td><td class="n">${v.blockWords < 0 ? '<em>no block</em>' : v.blockWords}</td><td class="n">${pct(v.blockShare)}</td></tr>`,
    )
    .join('');
  return `<section id="${o.id}" class="opt">
  <h2>${esc(need(o.name, `${o.id} name`))} <span class="tag ${o.shape}">${esc(shapeWord[o.shape] ?? o.shape)}</span></h2>
  <div class="stage">
    <div class="frame">${balance(stripComments(need(o.sample, `${o.id} sample`)))}</div>
    <div class="verdicts">${vcell}</div>
  </div>
  <table class="figs"><thead><tr><th>painted label</th><th>what a screen reader reads</th><th>data-cta</th><th>control role</th><th>declared block for</th><th>words in block</th><th>share of page</th></tr></thead><tbody>${figs}</tbody></table>
  <p class="claim">${esc(need(o.claim, `${o.id} claim`))}</p>
  <p class="meta">page ${esc(o.page)} \u00b7 ${o.pageWords} words on the page \u00b7 findings on that page ${o.findingsBefore} \u2192 ${o.pageFindings.length} \u00b7 outbound-link findings ${o.extFindingsBefore} \u2192 ${o.extFindings} \u00b7 controls on the page ${o.controlsBefore} \u2192 ${o.controlsAfter} \u00b7 <span class="ruled">${esc(need(o.ruled, `${o.id} ruled`))}</span></p>
</section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Round 20 — what a call to action is made of</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${SHEET}
/* specimen chrome only: the frame, the table, the notes. Nothing here touches a class the site ships. */
body { margin: 0; }
.spec { max-width: 68rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
.opt { margin-top: 2.5rem; border-top: 1px solid var(--color-rule); padding-top: 1rem; }
h1.spec-h { font-size: 1.6rem; font-weight: 800; color: var(--color-ink); }
h2 { font-size: 1.05rem; font-weight: 700; color: var(--color-ink); margin: 0 0 .6rem; }
.tag { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--color-ink-3); border: 1px solid var(--color-rule); border-radius: 3px; padding: .1rem .35rem; vertical-align: middle; }
.tag.defect { color: #8a1c1c; }
.stage { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 1rem; align-items: start; }
.frame { border: 1px solid var(--color-rule); padding: 1rem; overflow: hidden; }
/* no rule here touches the sample's own elements: the band sample must paint its ink ground with the sheet's own
   utility class, and a specimen selector that out-specifies a utility would be re-designing the thing it shows. */
.verdicts { font-size: .82rem; color: var(--color-ink-2); }
.v { border-left: 3px solid var(--color-rule); padding: .35rem .6rem; margin-bottom: .5rem; }
.v.pass { border-color: #1c7a44; }
.v.fail { border-color: #8a1c1c; }
.v .d { color: var(--color-ink-3); margin-top: .25rem; }
table.figs { border-collapse: collapse; font-size: .8rem; width: 100%; margin-top: .8rem; }
table.figs th, table.figs td { border: 1px solid var(--color-rule); padding: .25rem .4rem; text-align: left; vertical-align: top; }
table.figs .n { text-align: right; font-variant-numeric: tabular-nums; }
.claim { font-size: .9rem; color: var(--color-ink-2); max-width: 70ch; }
.meta { font-size: .78rem; color: var(--color-ink-3); font-variant-numeric: tabular-nums; }
.notes li { font-size: .85rem; color: var(--color-ink-2); margin-bottom: .4rem; }
@media (max-width: 900px) { .stage { grid-template-columns: minmax(0,1fr); } }
</style></head>
<body>
<div class="spec">
<h1 class="spec-h">Round 20 — what a call to action is made of</h1>
<p class="claim">The operator's word, verbatim, on one control on one page: \u201c${esc('the /chat page has a \'Join the chat\' button at the top as the first item under the heading. It doesn\'t make sense to have a user call-to-action without context around it like that, don\'t you agree? Additionally, it feels incorrect for us to use a button there for something that takes you off the page. Shouldn\'t it be an anchor link with an external icon? Or something else?')}\u201d That is three questions in one sentence \u2014 <strong>context</strong>, <strong>weight</strong>, <strong>the mark</strong> \u2014 and this round separates them so each is answered with a reading of the built page rather than with a taste.</p>
<p class="claim">Every row below is the <strong>built page's own bytes with one region replaced</strong>, rendered here with the built stylesheet and the built faces inlined, and judged by the same reading \u2014cta-context gate enforces (\u201c${esc('design/cta-rules.mjs')}\u201d). The verdict column is not a description of the row; it is that reading's output for the row as rendered.</p>
<p class="meta">census at this run: ${CENSUS.pages} built pages, ${CENSUS.actions} actions (${Object.entries(need(CENSUS.byKind, 'byKind')).map(([k, v]) => `${k} ${v}`).join(', ')}), ${CENSUS.ok} in context \u00b7 the biggest declared block holds ${CENSUS.widest.words} words = ${pct(CENSUS.widest.share)} of ${esc(CENSUS.widest.route)} [${esc(CENSUS.widest.ids)}] \u00b7 one block carries as many as ${CENSUS.shared.actions} actions on ${esc(CENSUS.shared.route)} [${esc(CENSUS.shared.ids)}] \u00b7 measured ${esc(String(R.measuredAt))} on ${esc(String(R.host))}</p>
${rows}
<section id="notes" class="opt">
<h2>How to read this page</h2>
<ul class="notes">${(R.notes ?? []).map((n) => `<li>${esc(n)}</li>`).join('')}
<li>The quiet step in row F is not typed here: its class string is read out of the built \u201c/dates\u201d page by the runner, so the specimen cannot ship a step the site no longer has (${esc('design/round20.mjs')}).</li>
<li>Rows marked <em>a defect</em> are on the table to be refused, not adopted: they exist so the reading's finding for the incumbent shape is printed rather than remembered.</li>
</ul>
</section>
</div></body></html>`;

writeFileSync(OUT, html);
console.log(`round20-build: ${OPTIONS.length} treatments -> ${OUT} (${(html.length / 1024).toFixed(0)}k, sheet ${(SHEET.length / 1024).toFixed(0)}k inlined)`);
