#!/usr/bin/env node
// check:escapes — an escape sequence may not reach a reader.
//
//   npm run check:escapes              # the built artifact, then the source templates
//   npm run check:escapes:selftest     # plant each defect, require each to FAIL (D118)
//   node scripts/check-escapes.mjs --dist <dir> --src <dir>   # scan fixtures (the selftest uses this)
//
// Why a gate and not a guideline: it shipped. `src/components/Schedule.astro` carried
//
//     <span class="text-label text-ink-3">Copied from the club\u2019s own calendar on {copied}</span>
//
// — a backslash-u escape written into **template text**, where it is not an escape at all. HTML has no `\uXXXX`
// syntax, so the reader met the eight characters `club\u2019s` on `/schedule` at every width. Found by the
// operator looking at the page on 2026-11-07, not by a gate: `npm run verify` ran 18 ok with it live, because
// nothing compared what the page *paints* with what a person would type.
//
// The same accident in a **string literal** is correct (`'club\u2019s'` is a right single quote), and in a JSON
// file it is correct (`src/content.json` stores `\u2014` and `JSON.parse` turns it into an em dash). That is
// why this gate cannot be a grep: the identical bytes are a bug in one context and normal in another, so it
// reads the artifact (where the answer is "does a reader see it") and, for the source, the *rendered-text*
// context only.
//
// What FAILS:
//   literal-escape        an escape-shaped sequence (`\uXXXX`, `\xHH`, `\n`, `\t`, `\r`, `\'`, `\"`, `\\`,
//                         `\/`, `` \` ``) in text an emitted page paints, or in a `<meta content>` string
//   double-escaped-entity an entity-looking string (`&#39;`, `&#x2019;`, `&amp;`) still present in page text
//                         AFTER one decode pass — i.e. the source wrote `&amp;#39;` and the reader sees `&#39;`
//   template-literal-escape the same escape-shaped sequence in the rendered-text context of a `.astro` or
//                         `.svelte` source: the pre-build tripwire, which fires on a branch nobody has built
//
// What is REPORTED, not failed: a bare backslash in page text that is not escape-shaped. A math club may
// legitimately print `R \ {0}`; a backslash that means backslash is prose, while a backslash followed by `u`,
// `x`, `n` or a quote is source syntax that took a wrong turn.
//
// What is DELIBERATELY out of scope:
//   - `dist/client/events.ics` — RFC 5545 TEXT really does escape as `\n`, `\,`, `\;`, so a rule that failed
//     backslashes there would be wrong. `npm run check:ics` owns those bytes (and its own selftest plants them).
//   - `<script>` bodies and `*.js`/`*.mjs` — escapes there are correct by definition.
//   - `src/content.json`, `data/events.json` — JSON string escapes decode before anyone reads them.
//   - text rendered at request time (the chat summary island) — the prerendered artifact is what this gate can
//     read; that surface is governed by `npm run check:sanitize`, which holds it to text-only rendering.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const argOne = (flag, dflt) => { const i = args.indexOf(flag); return i < 0 ? dflt : args[i + 1]; };
const selftest = args.includes('--selftest');

// ------------------------------------------------------------------ the rules, as data

/** Source-syntax escapes. Each of these means "somebody wrote a literal and expected the toolchain to
 *  unescape it" — in HTML text it never does. */
const ESCAPE = /\\(?:u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[nrtbfv'"`\\/])/g;

/** An entity that survived one decode pass: the reader sees the ampersand form. */
const ENTITY_TEXT = /&(?:#\d{1,5}|#[xX][0-9a-fA-F]{1,4}|[a-zA-Z]{2,6});/g;

/** A backslash in page text that is NOT escape-shaped. Reported, not failed — see the header. */
const BARE_BACKSLASH = /\\(?!(?:u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[nrtbfv'"`\\/]))/g;

/** Exact strings allowed in page text despite matching ESCAPE, each with the reason that earned it.
 *  Empty today: the artifact has zero backslashes of any kind (measured 2026-11-07, Linux, over the four
 *  emitted pages: `/`, `/schedule`, `/chat`, `/404`). An allowlist entry without a reason in its comment is
 *  how a real defect gets papered over, so the reason is part of the entry. */
const ALLOW = new Map();

const SKIP = new Set(['node_modules', 'dist', '.git', '.pi', '.astro', '.wrangler', 'design', '.notes', '.agents', '.design']);
const walk = (dir, exts, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
};

/** Strip comments, script/style bodies and tags: the same "what a visitor reads" cut check:content uses, so
 *  the two gates cannot disagree about what counts as page text. Meta content is kept separately below,
 *  because a `<meta>` description is what a search result and a share card paint. */
const visibleText = (html) =>
  html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');

const metaText = (html) =>
  [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => /content="([^"]*)"/i.exec(m[0])?.[1] ?? '').filter(Boolean).join(' ');

/** Attribute values a reader (or a screen reader, or a tooltip) is shown. An escape written into `alt="…"` is as
 *  visible as one between tags, but the tag-stripping in `visibleText` deletes it, so pull them out separately.
 *  Deliberately a curated list, not "every attribute": `srcset`, `d`, `style` and friends are not read by
 *  anyone, and scanning them would make the gate noisy enough to get allowlisted away. */
const READ_ALOUD_ATTRS = ['alt', 'title', 'aria-label', 'placeholder', 'value', 'label', 'data-label'];
const attrText = (html) =>
  [...html.matchAll(/<[^>]+>/g)]
    .flatMap((m) => READ_ALOUD_ATTRS.map((a) => new RegExp(`\\b${a}="([^"]*)"`, 'i').exec(m[0])?.[1] ?? ''))
    .filter(Boolean)
    .join(' ');

/** Decode one pass, so a correct `&#39;` becomes `'` (clean) while a doubled `&amp;#39;` becomes the visible
 *  `&#39;` (a failure). Without the decode, every correct entity would read as a defect. */
const decodeOnce = (t) =>
  t
    .replace(/&#(\d{1,6});/g, (_, d) => (Number(d) > 0 && Number(d) < 0x110000 ? String.fromCodePoint(Number(d)) : `&#${d};`))
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|copy|reg|mdash|ndash|hellip|middot|times|deg);/gi, (_, n) =>
      ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '\u00a9', reg: '\u00ae', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', middot: '\u00b7', times: '\u00d7', deg: '\u00b0' })[n.toLowerCase()]);

const snippet = (text, at, len) => text.slice(Math.max(0, at - len), at + len).replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------ the artifact

function scanArtifact(html, file) {
  const fails = [];
  const warns = [];
  const text = `${visibleText(html)} ${metaText(html)} ${attrText(html)}`;
  for (const m of text.matchAll(ESCAPE)) {
    const seq = m[0];
    if (ALLOW.has(seq)) continue;
    fails.push({ rule: 'literal-escape', file, detail: `"${seq}" is painted as those characters — in HTML text a backslash escape is not an escape (found near: "${snippet(text, m.index, 34)}")` });
  }
  const decoded = decodeOnce(text);
  for (const m of decoded.matchAll(ENTITY_TEXT)) {
    fails.push({ rule: 'double-escaped-entity', file, detail: `"${m[0]}" is what a reader sees after the HTML is decoded once — the source wrote it doubled (near: "${snippet(decoded, m.index, 34)}")` });
  }
  for (const m of text.matchAll(BARE_BACKSLASH)) {
    warns.push({ rule: 'bare-backslash', file, detail: `a backslash in page text: "${snippet(text, m.index, 24)}" — fine if it means backslash (R \\ {0}), wrong if it was meant to escape something` });
  }
  return { fails, warns };
}

// ------------------------------------------------------------------ the source templates
//
// The hard half: the same bytes are correct inside `'...'` and wrong between tags. So this does not grep — it
// walks a `.astro`/`.svelte` file with a small context machine and looks only at regions the renderer paints:
//   text (between tags) and HTML attribute values  -> a reader sees it  -> check
//   { ... } expression interiors, quoted JS strings, comments, frontmatter, <script>/<style> bodies -> code -> skip
// Nested JSX inside an expression (`{copied && (<p>…</p>)}`) is the shape `Schedule.astro` actually uses, so
// entering an expression does not stop the scan: the frame stack decides when the expression ends, and text
// inside it is still page text.

const FRONTMATTER = /^---[ \t]*$/m;

/** Inside a `{ … }` expression, `<` is ambiguous: `{a < b ? 'x' : 'y'}` is a comparison, `{cond && <p>x</p>}` is
 *  markup, and getting that wrong would either scan JS strings as page text or miss real page text. A tag in
 *  Astro/Svelte markup always either closes (`</name>` ahead) or is self-closed (`/>` before the next `>`), so
 *  require that. Cheap, and it makes `{a < b}` stay code. */
function looksLikeJsxTag(src, i) {
  if (src[i] !== '<') return false;
  const m = /^<\/?([a-zA-Z][\w:.-]*)/.exec(src.slice(i, i + 40));
  if (!m) return false;
  const name = m[1];
  const isClose = src[i + 1] === '/';
  if (isClose) return true;
  const gt = src.indexOf('>', i);
  if (gt < 0) return false;
  if (src[gt - 1] === '/') return true;
  return src.indexOf(`</${name}`, gt) >= 0;
}

function templateRegions(src, kind) {
  const regions = [];          // [start, end) pairs of "a reader sees this"
  let i = 0;
  if (kind === 'astro') {
    // Astro's frontmatter is the block between the first two `---` lines at column 0. It is JS: escapes work.
    const open = src.startsWith('---') ? 0 : -1;
    if (open === 0) {
      const close = src.indexOf('\n---', 3);
      if (close > 0) { const nl = src.indexOf('\n', close + 1); i = nl < 0 ? src.length : nl + 1; }
    }
  }
  const frames = [];           // open { } expression frames, with their brace depth
  let textStart = i;
  let tagStart = -1;           // where the tag currently being read began (its `<`)
  const closeText = (to) => { if (to > textStart) regions.push([textStart, to]); };
  let state = 'text';
  while (i < src.length) {
    const c = src[i];
    if (state === 'text') {
      if (c === '<') {
        if (src.startsWith('<!--', i)) { closeText(i); const end = src.indexOf('-->', i + 3); i = end < 0 ? src.length : end + 3; textStart = i; continue; }
        if (/[a-zA-Z/]/.test(src[i + 1] ?? '')) { closeText(i); tagStart = i; state = 'tag'; i++; continue; }
      }
      if (c === '{') {
        if (src.startsWith('/*', i + 1)) { closeText(i); const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; textStart = i; continue; }
        closeText(i); frames.push(1); state = 'expr'; i++; continue;
      }
      if (c === '}' && frames.length) {
        closeText(i); frames[frames.length - 1]--; if (frames[frames.length - 1] === 0) frames.pop(); state = 'expr'; i++; continue;
      }
      i++;
      continue;
    }
    if (state === 'tag') {
      if (c === '>') {
        const open = src.slice(tagStart, i + 1);
        const tagName = /^<\s*([a-zA-Z][\w:-]*)/.exec(open)?.[1] ?? '';
        const isClose = /^<\s*\//.test(open);
        const selfClosing = src[i - 1] === '/';
        i++;
        if (!isClose && !selfClosing && /^(script|style)$/i.test(tagName)) {
          // a code body: escapes in it are correct by definition, so skip to its closing tag
          const end = src.toLowerCase().indexOf(`</${tagName.toLowerCase()}`, i);
          const gt = end < 0 ? -1 : src.indexOf('>', end);
          i = gt < 0 ? src.length : gt + 1;
        }
        textStart = i; state = 'text'; continue;
      }
      if (c === '"' || c === "'") {
        // an attribute value: `alt="…"` and `title="…"` are painted (to a screen reader, in a tooltip), so
        // an escape inside one is exactly as visible as one between tags.
        const end = src.indexOf(c, i + 1);
        const stop = end < 0 ? src.length : end;
        regions.push([i + 1, stop]);
        i = stop + 1; continue;
      }
      if (c === '{') { frames.push(1); state = 'expr'; i++; continue; }   // class={`…`} — JS, skip
      i++; continue;
    }
    if (state === 'expr') {
      const start = i;
      if (c === '{') { frames[frames.length - 1]++; i++; continue; }
      if (c === '}') { frames[frames.length - 1]--; if (frames[frames.length - 1] === 0) frames.pop(); i++; continue; }
      if (c === '"' || c === "'" || c === '`') {
        i++;
        while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; }
        i++; continue;
      }
      if (c === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
      if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; continue; }
      if (c === '<' && looksLikeJsxTag(src, i)) { textStart = i; tagStart = i; state = 'tag'; i++; continue; }  // JSX child: a tag first, then its text
      void start;
      i++; continue;
    }
  }
  closeText(src.length);
  return regions;
}

function scanTemplate(file, src) {
  const kind = file.endsWith('.astro') ? 'astro' : 'svelte';
  const fails = [];
  for (const [start, end] of templateRegions(src, kind)) {
    for (const m of src.slice(start, end).matchAll(ESCAPE)) {
      const at = start + m.index;
      const line = src.slice(0, at).split('\n').length;
      fails.push({
        rule: 'template-literal-escape',
        file,
        line,
        detail: `"${m[0]}" is in markup text, not in a string literal — HTML does not unescape it, so the reader sees "${m[0]}" (write the character: ${explain(m[0])})`,
      });
    }
  }
  return fails;
}

const CHAR_NAMES = {
  '\\u2019': '’', '\\u2018': '‘', '\\u201c': '“', '\\u201d': '”', '\\u2014': '—', '\\u2013': '–', '\\u2026': '…', '\\u00b7': '·',
};
const explain = (seq) => CHAR_NAMES[seq.toLowerCase()] ?? (seq === '\\n' ? 'a line break, or nothing at all' : 'the character itself');

function scanSources(files) {
  const fails = [];
  for (const f of files) fails.push(...scanTemplate(f, readFileSync(f, 'utf8')));
  return fails;
}

const lineOf = (src, at) => src.slice(0, at).split('\n').length;

// ------------------------------------------------------------------ selftest (D118)

if (selftest) {
  const FIX = '.design/tmp-escapes';
  const plants = [
    // the defect that shipped, reproduced byte for byte
    { name: 'literal-escape-u', rule: 'literal-escape', html: '<p>Copied from the club\\u2019s own calendar on Nov 6, 2026</p>' },
    { name: 'literal-escape-n', rule: 'literal-escape', html: '<p>Room 12\\nBring a pencil</p>' },
    { name: 'literal-escape-quote', rule: 'literal-escape', html: "<p>the club\\'s own calendar</p>" },
    { name: 'literal-escape-in-attr', rule: 'literal-escape', html: '<img alt="the club\\u2019s poster" src="/x.png">' },
    // the shape an unescaped ICS TEXT would take: RFC 5545 writes `\n`, and the site must not paste it through
    { name: 'literal-escape-attr-ics', rule: 'literal-escape', html: '<img alt="Joe\\nBar meetup photo" src="/x.png">' },
    { name: 'literal-escape-in-meta', rule: 'literal-escape', html: '<meta name="description" content="the club\\u2019s calendar">' },
    { name: 'double-escaped-entity-numeric', rule: 'double-escaped-entity', html: '<p>the club&amp;#39;s calendar</p>' },
    { name: 'double-escaped-entity-named', rule: 'double-escaped-entity', html: '<p>meetup&amp;amp;discord</p>' },
    { name: 'template-astro-text', rule: 'template-literal-escape', astro: '<p>Copied from the club\\u2019s own calendar</p>' },
    { name: 'template-astro-nested-jsx', rule: 'template-literal-escape', astro: '{copied && (\n  <p>the club\\u2019s calendar</p>\n)}' },
    { name: 'template-astro-attr', rule: 'template-literal-escape', astro: '<img alt="the club\\u2019s poster" src="/x.png">' },
    { name: 'template-svelte-text', rule: 'template-literal-escape', svelte: '<span>the club\\u2019s calendar</span>' },
    { name: 'template-svelte-in-block', rule: 'template-literal-escape', svelte: '{#if copied}<p>the club\\u2019s calendar</p>{/if}' },
  ];
  let bad = 0;
  for (const p of plants) {
    const dir = `${FIX}/plant-${p.name.replace(/[^a-z]/g, '')}`;
    mkdirSync(dir, { recursive: true });
    let found = [];
    if (p.html) {
      const file = `${dir}/index.html`;
      writeFileSync(file, `<html><body>${p.html}</body></html>`);
      found = scanArtifact(readFileSync(file, 'utf8'), file).fails;
    } else {
      const ext = p.astro !== undefined ? 'astro' : 'svelte';
      const body = p.astro ?? p.svelte;
      const file = `${dir}/T.${ext}`;
      const src = ext === 'astro' ? `---\nconst copied = true;\n---\n${body}\n` : `<script>let copied = true;</script>\n${body}\n`;
      writeFileSync(file, src);
      found = scanTemplate(file, readFileSync(file, 'utf8'));
    }
    const caught = found.some((f) => f.rule === p.rule);
    console.log(`${caught ? 'ok   caught' : 'FAIL missed'}  ${p.name.padEnd(30)} ${found.map((f) => f.rule).join(',') || 'nothing'}`);
    if (!caught) bad++;
  }

  // The clean fixtures. A gate that fires on correct code is a gate that gets allowlisted into nothing, so
  // these are as important as the plantings: every one of them is a form the repo already contains.
  const clean = [
    { name: 'clean-real-characters', html: '<p>Copied from the club’s own calendar on Nov 6, 2026 — a “quote”, 3·4, R &amp; Q</p>' },
    { name: 'clean-entity-correct', html: '<p>the club&#8217;s calendar, and an em dash &#x2014; here</p>' },
    { name: 'clean-escape-in-script', html: '<script>const t = "club\\u2019s calendar"; document.title = t;</script><p>fine</p>' },
    { name: 'clean-escape-in-style', html: '<style>.x::before{content:"\\2019"}</style><p>fine</p>' },
    { name: 'clean-attr-entity', html: '<img alt="R &amp; Q meetup, the club‘s bar" src="/x.png">' },
  ];
  for (const c of clean) {
    const dir = `${FIX}/clean-${c.name.replace(/[^a-z]/g, '')}`;
    mkdirSync(dir, { recursive: true });
    const file = `${dir}/index.html`;
    writeFileSync(file, `<html><body>${c.html}</body></html>`);
    const { fails } = scanArtifact(readFileSync(file, 'utf8'), file);
    const ok = fails.length === 0;
    console.log(`${ok ? 'ok   clean' : 'FAIL false-positive'}  ${c.name.padEnd(30)} ${fails.map((f) => f.rule).join(',') || 'no findings'}`);
    if (!ok) bad++;
  }
  const cleanSrc = [
    { name: 'clean-frontmatter-string', astro: '---\nconst lede = \'These dates are copied from the club\\u2019s own calendar\';\nconst dash = "a \\u2014 dash";\n---\n<p>{lede}</p>\n' },
    { name: 'clean-astro-comment', astro: '---\n---\n{/* the lede was a plural about a singular \\u2014 fixed in D228 */}\n<p>fine</p>\n' },
    { name: 'clean-html-comment', astro: '---\n---\n<!-- club\\u2019s in a comment is not painted -->\n<p>fine</p>\n' },
    { name: 'clean-expr-string', astro: '---\nconst a = 1;\n---\n<p>{a === 1 ? \'club\\u2019s\' : \'theirs\'}</p>\n' },
    { name: 'clean-script-body', astro: '---\n---\n<script>const s = "club\\u2019s";</script>\n<p>fine</p>\n' },
    { name: 'clean-svelte-expr', svelte: '<script>let x = true;</script>\n<p>{x ? \'club\\u2019s\' : \'theirs\'}</p>\n' },
  ];
  for (const c of cleanSrc) {
    const ext = c.astro !== undefined ? 'astro' : 'svelte';
    const dir = `${FIX}/clean-src-${c.name.replace(/[^a-z]/g, '')}`;
    mkdirSync(dir, { recursive: true });
    const file = `${dir}/T.${ext}`;
    writeFileSync(file, c.astro ?? c.svelte);
    const found = scanTemplate(file, readFileSync(file, 'utf8'));
    const ok = found.length === 0;
    console.log(`${ok ? 'ok   clean' : 'FAIL false-positive'}  ${c.name.padEnd(30)} ${found.map((f) => `${f.rule}@L${f.line}`).join(',') || 'no findings'}`);
    if (!ok) bad++;
  }

  // A bare backslash is reported and NOT failed: a math club is allowed to print `R \ {0}`.
  const mathDir = `${FIX}/math-prose`;
  mkdirSync(mathDir, { recursive: true });
  const mathFile = `${mathDir}/index.html`;
  writeFileSync(mathFile, '<html><body><p>the group R \\ {0}</p></body></html>');
  const math = scanArtifact(readFileSync(mathFile, 'utf8'), mathFile);
  const mathOk = math.fails.length === 0 && math.warns.some((w) => w.rule === 'bare-backslash');
  console.log(`${mathOk ? 'ok   warn-only' : 'FAIL wrong-severity'}  bare-backslash-in-math-prose  fails=${math.fails.length} warns=${math.warns.length}`);
  if (!mathOk) bad++;

  const total = plants.length + clean.length + cleanSrc.length + 1;
  console.log(`\ncheck:escapes selftest: ${total - bad}/${total} cases behaved (the total is printed by the runner; a count in a doc rots)`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ the real run

const distDir = argOne('--dist', 'dist/client');
const srcDir = argOne('--src', 'src');

if (!existsSync(distDir)) {
  console.error(`check:escapes: ${distDir} missing — it judges what a reader sees, so build first (npm run build).`);
  process.exit(1);
}

const htmlFiles = walk(distDir, ['.html']);
const pages = htmlFiles.map((f) => {
  const html = readFileSync(f, 'utf8');
  const text = visibleText(html);
  return { file: f.replace(`${distDir}/`, '/'), html, chars: text.replace(/\s+/g, ' ').trim().length };
});

const srcFiles = walk(srcDir, ['.astro', '.svelte']);
const srcResults = srcFiles.map((f) => ({ file: f, fails: scanTemplate(f, readFileSync(f, 'utf8')) }));

const fails = [];
const warns = [];
for (const p of pages) {
  const r = scanArtifact(p.html, p.file);
  fails.push(...r.fails);
  warns.push(...r.warns);
}
for (const s of srcResults) fails.push(...s.fails);

console.log(`check:escapes — ${pages.length} built page(s), ${srcFiles.length} template source file(s)`);
console.log(`  pages: ${pages.map((p) => `${p.file} (${p.chars}ch of text)`).join(', ')}`);
console.log(`  templates: ${srcResults.map((s) => `${s.file.replace('src/', 'src/')} ${s.fails.length ? `${s.fails.length} FINDING` : 'clean'}`).join(', ')}`);

if (warns.length) {
  console.log(`\n  backslashes in page text that are not escape-shaped (${warns.length}) — reported, not failed:`);
  for (const w of warns) console.log(`   ~ ${w.file}: ${w.detail}`);
}

if (fails.length) {
  console.log('');
  for (const f of fails) console.log(`  FAIL ${f.rule.padEnd(22)} ${f.file}${f.line ? `:${f.line}` : ''}\n       ${f.detail}`);
  console.log(`\n${fails.length} escape failure(s). A reader is being shown source syntax. In HTML text, write the`);
  console.log('character (’) not the escape (\\u2019); inside a string literal or a JSON file the escape is fine,');
  console.log('which is why this gate reads the rendered-text context rather than grepping for backslashes.');
  process.exit(1);
}
console.log(`\nNo backslash escape, no doubled entity in what a reader sees — built text or template text.`);
console.log(`Run \`npm run check:escapes:selftest\` to see that these checks can still fail.`);
