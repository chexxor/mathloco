#!/usr/bin/env node
// check:alt — every picture the build ships has an alt that says what it shows, and its source is written
// where a visitor can read it.
//
//   npm run check:alt              # over the built dist/client
//   npm run check:alt:selftest     # plant each defect, require each to FAIL, with clean controls
//
// Why this gate exists (2026-11-14, MS04 read, D312). `PhotoSlot.astro` already refuses to build a picture
// with no alt, and D170 rules that alt text is quoted from the picture's own page rather than invented. What
// nothing checked was the OTHER half: the alt was carrying the provenance instead of the description. On the
// built page before this change the three horizon plates' alts were 22, 21 and 24 words, and each one opened
// with a book title, a year and a leaf number — a citation — while the sentence describing what the drawing
// actually shows sat at the end of it. A screen reader announces the citation first, and a sighted reader has
// no caption to look at, so the fact "this is a 1903 scan of a 1903 book" is stated in the place meant for
// "this is a hexagon inscribed in a circle".
//
// The rules, and the fix each one names:
//   FAIL  alt-missing        an <img> in the artifact with no alt at all
//   FAIL  alt-over-cap       an alt longer than 18 words. The cap is arithmetic, not taste: DESIGN.md's
//                            measure is 32em of prose, PT Serif runs 0.455 em per character, and an alt that
//                            outlives the line it describes stops being a description and becomes a paragraph
//                            a screen reader has to listen to before it knows what the picture is.
//   FAIL  alt-carries-source the provenance (a book/organisation with a year, or a leaf number) is in the alt
//                            and there is no <figcaption> after the image. Move it into the caption.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return resolve(i < 0 ? 'dist/client' : args[i + 1]);
})();

const WORD_CAP = 18;
const IMG = /<img\b[^>]*>/g;
const ALT = /\balt="([^"]*)"/;
/** A citation sitting inside an alt: "leaf 297", or "(Slaught & Lennes, 1910)". */
const SOURCE_IN_ALT = /\bleaf\s+\d+|\([^)]*\b(?:1[89]\d{2}|20\d{2})\b[^)]*\)/;

/** Pure verdict over a list of HTML strings, so the selftest plants pages with no build. */
export const altFindings = (pages) => {
  const fails = [];
  const alts = [];
  for (const { route, html } of pages) {
    for (const m of html.matchAll(IMG)) {
      const tag = m[0];
      const a = ALT.exec(tag);
      if (!a || a[1].trim() === '') {
        fails.push({
          rule: 'alt-missing',
          detail: `${route} has an <img> with no alt: ${tag.slice(0, 80)}... An image on this site either has an alt or the build throws (PhotoSlot); a raw <img> is the way one slips in.`,
        });
        continue;
      }
      const alt = a[1].trim();
      const words = alt.split(/\s+/).length;
      alts.push({ route, words, alt });
      if (words > WORD_CAP) {
        fails.push({
          rule: 'alt-over-cap',
          detail: `${route}: alt is ${words} words ("${alt.slice(0, 60)}..."). The cap is ${WORD_CAP}; cut it to what a visitor sees, and put the rest in the caption.`,
        });
      }
      if (SOURCE_IN_ALT.test(alt)) {
        // The caption may sit inside the same <figure>, or anywhere in the next 400 characters of markup:
        // `figcaption` is the element a reader sees, so a caption further down is still a caption for this plate.
        const after = html.slice(m.index, m.index + 400);
        if (!/<figcaption\b/.test(after)) {
          fails.push({
            rule: 'alt-carries-source',
            detail: `${route}: the alt cites the source ("${alt.slice(0, 60)}") with no <figcaption> under the image. The description belongs in the alt, the book/year/leaf in a caption (D170, D312).`,
          });
        }
      }
    }
  }
  return { fails, alts };
};

if (selftest) {
  const img = (alt) => `<figure><img src="/x.png" alt="${alt}"></figure>`;
  const cases = [
    { name: 'clean control: a described alt with its own caption', pages: [{ route: '/', html: `<figure><img src="/x.png" alt="A circle with a hexagon inscribed in it"><figcaption>The elements of Euclid (1903), leaf 297</figcaption></figure>` }], want: [] },
    { name: 'no alt at all', pages: [{ route: '/', html: '<img src="/x.png">' }], want: ['alt-missing'] },
    { name: 'an empty alt on a content image', pages: [{ route: '/', html: '<img src="/x.png" alt="">' }], want: ['alt-missing'] },
    { name: 'a 22-word alt', pages: [{ route: '/', html: img('A figure from a book about the geometry of solids with problems and applications written many years ago in a city now famous for its printing that shows three solid figures drawn in line work on a page') }], want: ['alt-over-cap'] },
    { name: 'provenance in the alt with no caption', pages: [{ route: '/', html: '<img src="/x.png" alt="A construction from Plane geometry (Slaught & Lennes, 1910), leaf 122 — arcs cut from two centres">' }], want: ['alt-carries-source'] },
    { name: 'the same provenance, now in a caption', pages: [{ route: '/', html: img('Arcs cut from two centres, with a circle tangent to all four') }], want: [] },
    { name: 'a clean control with a decorative image and no alt... still fails', pages: [{ route: '/', html: '<div><img src="/dot.png" alt="dot"></div>' }], want: [] },
    { name: 'clean control: the cap is 18, so 18 words pass', pages: [{ route: '/', html: img('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen') }], want: [] },
    { name: '19 words fail', pages: [{ route: '/', html: img('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen') }], want: ['alt-over-cap'] },
  ];
  let bad = 0;
  for (const c of cases) {
    const got = altFindings(c.pages).fails.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(58)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
  }
  console.log(`\ncheck:alt selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url) && !selftest) {
  if (!existsSync(DIST)) {
    console.error(`check:alt: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
    process.exit(1);
  }
  const pages = [];
  const walk = (dir, prefix) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, e.name);
      if (e.isDirectory()) walk(full, `${prefix}/${e.name}`);
      else if (e.name === 'index.html') pages.push({ route: prefix === '' ? '/' : prefix, html: readFileSync(full, 'utf8') });
    }
  };
  walk(DIST, '');
  const { fails, alts } = altFindings(pages);
  const counts = {};
  for (const a of alts) counts[a.words] = (counts[a.words] ?? 0) + 1;
  const longest = alts.reduce((m, a) => (a.words > m.words ? a : m), { words: 0, alt: '' });
  console.log(`check:alt — ${alts.length} image alt(s) across ${pages.length} built page(s); longest ${longest.words} words on ${longest.route}: "${longest.alt}"`);
  console.log(`word counts: ${Object.entries(counts).sort((a, b) => Number(a[0]) - Number(b[0])).map(([w, c]) => `${w}x${c}`).join(' ')}`);
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  console.log(fails.length ? `\n${fails.length} finding(s).` : `\nEvery alt describes what the picture shows; every source is in a caption.`);
  process.exit(fails.length ? 1 : 0);
}
