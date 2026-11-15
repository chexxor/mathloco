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
// built page before this change the three horizon plates' alts were 30, 28 and 32 words @measured 2026-11-14 by
// `git show HEAD:src/components/HorizonBand.astro | grep -o "alt: '[^']*'" | awk '{print NF-2}'`, and each one opened
// with a book title, a year and a leaf number — a citation — while the sentence describing what the drawing
// actually shows sat at the end of it. A screen reader announces the citation first, and a sighted reader has
// no caption to look at, so the fact "this is a 1903 scan of a 1903 book" is stated in the place meant for
// "this is a hexagon inscribed in a circle".
//
// The cap moved from 18 to 12 on 2026-11-14 (the second commissioned read §6.1, D324, which supersedes
// D312's 18). The number is not taste: an alt is read out before the picture, and 12 words is the longest
// sentence this site's own prose runs without becoming a paragraph - DESIGN.md's measure is 32em and PT
// Serif averages 0.455 em per character, so 12 words is about half the measure the picture sits in.
//
// The rules, and the fix each one names:
//   FAIL  alt-missing             an <img> in the artifact with no alt attribute at all
//   FAIL  alt-empty-undeclared    alt="" with no `data-decorative="true"` on an ancestor: an image that is
//                                 decorative has to say so (D324). An empty alt is a decision, not a gap.
//   FAIL  alt-over-cap            an alt longer than 12 words
//   FAIL  alt-names-the-file      the alt describes the file's role ("the club's own event image for this
//                                 social") instead of what a visitor sees
//   FAIL  alt-carries-source      the provenance (a book/organisation with a year, or a leaf number) is in the
//                                 alt and there is no <figcaption> after the image. Move it into the caption.
//   FAIL  img-no-intrinsic-size   an <img> with no width and height attributes - the layout shift Astro's
//                                 asset pipeline prevents and a hand-written tag does not.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return resolve(i < 0 ? 'dist/client' : args[i + 1]);
})();

const WORD_CAP = 12;
const IMG = /<img\b[^>]*>/g;
const ALT = /\balt="([^"]*)"/;
/** Astro's <Image> renders `alt=""` as the bare attribute `alt` with no value; that is still an alt, and it
   still means "this plate is decorative". */
const BARE_ALT = /\balt(?=[\s>])/;
/** A citation sitting inside an alt: "leaf 297", or "(Slaught & Lennes, 1910)". */
const SOURCE_IN_ALT = /\bleaf\s+\d+|\([^)]*\b(?:1[89]\d{2}|20\d{2})\b[^)]*\)/;
/** An alt that talks about the file instead of the picture (D324, read §6.1). */
const ROLE_IN_ALT = /\bown (event )?image|\bimage for this|\bplaceholder|\bstock (image|photo)|\bno (image|photo)\b/;
/** A decorative plate declares itself: the wrapper carries data-decorative="true". */
const DECORATIVE_RE = /data-decorative="true"/;

/** Pure verdict over a list of HTML strings, so the selftest plants pages with no build. */
export const altFindings = (pages) => {
  const fails = [];
  const alts = [];
  const decorative = [];
  for (const { route, html } of pages) {
    for (const m of html.matchAll(IMG)) {
      const tag = m[0];
      const a = ALT.exec(tag);
      if (!/width=/.test(tag) || !/height=/.test(tag)) {
        fails.push({
          rule: 'img-no-intrinsic-size',
          detail: `${route}: <img> has no width/height attributes, so the document reflows when it decodes. Astro's <Image> emits them; a hand-written tag does not (D324).`,
        });
      }
      if (!a && !BARE_ALT.test(tag)) {
        fails.push({
          rule: 'alt-missing',
          detail: `${route} has an <img> with no alt at all: ${tag.slice(0, 80)}... An image on this site either describes what it shows or the build throws (PhotoSlot); a raw <img> is the way one slips in.`,
        });
        continue;
      }
      const alt = (a ? a[1] : '').trim();
      if (alt === '') {
        // Look back through the markup for the wrapper that declares this plate decorative.
        if (!DECORATIVE_RE.test(html.slice(Math.max(0, m.index - 240), m.index))) {
          fails.push({
            rule: 'alt-empty-undeclared',
            detail: `${route}: <img> with alt="" and nothing declaring it decorative. Either describe what the picture shows or write data-decorative="true" on its wrapper (D324).`,
          });
        }
        decorative.push({ route });
        continue;
      }
      const words = alt.split(/\s+/).length;
      alts.push({ route, words, alt });
      if (words > WORD_CAP) {
        fails.push({
          rule: 'alt-over-cap',
          detail: `${route}: alt is ${words} words ("${alt.slice(0, 60)}..."). The cap is ${WORD_CAP}; cut it to what a visitor sees, and put the rest in the caption.`,
        });
      }
      if (ROLE_IN_ALT.test(alt)) {
        fails.push({
          rule: 'alt-names-the-file',
          detail: `${route}: the alt describes the file, not the picture ("${alt}"). Say what a visitor sees, or declare the plate decorative (D324).`,
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
  return { fails, alts, decorative };
};

if (selftest) {
  const img = (alt) => `<figure><img src="/x.png" width="698" height="350" alt="${alt}"></figure>`;
  const cases = [
    { name: 'clean control: a described alt with its own caption', pages: [{ route: '/', html: `<figure><img src="/x.png" width="698" height="350" alt="A circle with a hexagon inscribed in it"><figcaption>The elements of Euclid (1903), leaf 297</figcaption></figure>` }], want: [] },
    { name: 'no alt at all', pages: [{ route: '/', html: '<img src="/x.png" width="10" height="10">' }], want: ['alt-missing'] },
    { name: 'an empty alt nobody declared', pages: [{ route: '/', html: '<div><img src="/x.png" width="10" height="10" alt=""></div>' }], want: ['alt-empty-undeclared'] },
    { name: 'a 22-word alt', pages: [{ route: '/', html: img('A figure from a book about the geometry of solids with problems and applications written many years ago in a city now famous for its printing that shows three solid figures drawn in line work on a page') }], want: ['alt-over-cap'] },
    { name: 'provenance in the alt with no caption', pages: [{ route: '/', html: '<img src="/x.png" width="698" height="350" alt="A construction from Plane geometry (Slaught & Lennes, 1910), leaf 122">' }], want: ['alt-carries-source'] },
    { name: 'the same provenance, now in a caption', pages: [{ route: '/', html: img('Arcs cut from two centres, with a circle tangent to all four') }], want: [] },
    { name: 'a decorative plate, declared', pages: [{ route: '/', html: '<div data-decorative="true"><img src="/poster.png" width="954" height="460" alt=""></div>' }], want: [] },
    { name: 'clean control: the cap is 12, so 12 words pass', pages: [{ route: '/', html: img('one two three four five six seven eight nine ten eleven twelve') }], want: [] },
    { name: '13 words fail', pages: [{ route: '/', html: img('one two three four five six seven eight nine ten eleven twelve thirteen') }], want: ['alt-over-cap'] },
    { name: 'the alt names the file instead of the picture', pages: [{ route: '/', html: img("The club's own event image for this social") }], want: ['alt-names-the-file'] },
    { name: 'an img with no intrinsic size', pages: [{ route: '/', html: '<figure><img src="/x.png" alt="A hexagon in a circle"></figure>' }], want: ['img-no-intrinsic-size'] },
    { name: 'Astro renders an empty alt as a bare `alt` — declared, so it passes', pages: [{ route: '/', html: '<figure data-decorative="true"><img src="/p.webp" width="954" height="460" alt loading="lazy"></figure>' }], want: [] },
    { name: 'the same bare alt with no declaration', pages: [{ route: '/', html: '<div><img src="/p.webp" width="954" height="460" alt loading="lazy"></div>' }], want: ['alt-empty-undeclared'] },
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
      else if (e.name.endsWith('.html')) pages.push({ route: e.name === 'index.html' ? (prefix === '' ? '/' : prefix) : `/${prefix}/${e.name}`, html: readFileSync(full, 'utf8') });
    }
  };
  walk(DIST, '');
  const { fails, alts, decorative } = altFindings(pages);
  const counts = {};
  for (const a of alts) counts[a.words] = (counts[a.words] ?? 0) + 1;
  const longest = alts.reduce((m, a) => (a.words > m.words ? a : m), { words: 0, alt: '' });
  console.log(`check:alt — ${alts.length} described alt(s) + ${decorative.length} declared-decorative plate(s) across ${pages.length} built page(s); longest ${longest.words} words on ${longest.route}: "${longest.alt}"`);
  console.log(`word counts: ${Object.entries(counts).sort((a, b) => Number(a[0]) - Number(b[0])).map(([w, c]) => `${w}x${c}`).join(' ')}`);
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  console.log(fails.length ? `\n${fails.length} finding(s).` : `\nEvery alt describes what the picture shows; every source is in a caption.`);
  process.exit(fails.length ? 1 : 0);
}
