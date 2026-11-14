#!/usr/bin/env node
// check:naming — one page, one name, in every surface a visitor navigates by.
//
//   npm run check:naming            # over the built dist/client
//   npm run check:naming:selftest   # plant each defect, require each to FAIL, with clean controls
//
// Why this gate exists (2026-11-14, D309): the commissioned UX read (MS04) found that `/schedule` answered to
// five names depending on where you stood — nav "Dates", <title> "Schedule - Matheapolis", H1 "When We Meet",
// the exit band "Schedule", the homepage button "View Schedule", the /join prose "schedule". Every one of those
// strings is individually fine; together they make the visitor hold a mental map of aliases. `check:render`
// measures the nav row's millimetres and `check:content` measures dead paths; nothing measured whether the same
// route is *called two things*. A name is a rule a page has to keep, so it needs a detector, not a note.
//
// What the gate enforces, and what it only reports:
//   FAIL  nav-target-missing   — a nav label whose route the build does not emit (D117: a nav item is a promise
//                                about a path; this is how "Schedule" and "Members" rendered the 404 page)
//   FAIL  nav-title-mismatch   — the page's <title> does not contain the nav name as a word
//   FAIL  band-name-drift      — the exit band names a nav route with a different word than the nav does
//   FAIL  name-not-on-page     — the page's own opening block (eyebrow + h1) never says the nav name
//   FAIL  title-tail-missing   — an emitted page whose title has no " - Matheapolis" tail
//   INFO  alias census         — every OTHER label in the artifact pointing at an internal route, printed so
//                                the operator can see the drift without the gate treating prose as a defect.
//                                "All 5 dates →" and "the next ones are on the schedule" are prose registers,
//                                which D309 allows; only the four name surfaces are held to one word.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emittedRoutes } from '../design/emitted-routes.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return resolve(i < 0 ? 'dist/client' : args[i + 1]);
})();

const SITE = 'Matheapolis';
const OPEN_TAG = /<header\b[^>]*>/;
const NAV_ANY = /<header\b[\s\S]*?<\/header>/;
const BAND_ANY = /<footer\b[\s\S]*?<\/footer>/;
const TITLE = /<title>([^<]*)<\/title>/;
const H1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/;
const ANCHOR = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g;
/** The nav's subordinate date chip (D311) is not part of the page's NAME. It is stripped before the label is
 *  read, so "Dates <span data-nav-date=...>21 Nov</span>" is still the label "Dates" — and an unmarked date
 *  glued to a label is not, which is the planting the selftest plants. */
const NAV_CHIP = /<span[^>]*data-nav-date="[^"]*"[^>]*>[\s\S]*?<\/span>/g;

const visible = (html) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

/** Is `name` present as a word in `text`, case-insensitively? "Dates" is in "Dates on the schedule";
 *  "Date" is not in "Validate". Word boundaries on both sides, so the check is a name, not a substring. */
const hasWord = (text, name) => {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${esc}\\b`, 'i').test(text);
};

/** Pure verdict over `[{route, html}]` so the selftest can plant pages with no build and no disk. */
export const namingFindings = (pages) => {
  const fails = [];
  const routes = pages.map((p) => p.route);
  const byRoute = new Map(pages.map((p) => [p.route, p.html]));

  // The nav is the only place a name is *chosen*; everything else has to agree with it.
  const nav = [];
  for (const p of pages) {
    const m = NAV_ANY.exec(p.html);
    if (!m) continue;
    for (const a of m[0].matchAll(ANCHOR)) {
      nav.push({ from: p.route, href: a[1].replace(/\/$/, '') || '/', label: visible(a[2].replace(NAV_CHIP, ' ')) });
    }
    void OPEN_TAG;
  }
  // The nav row is identical on every emitted page, so one page's nav is the nav. Dedupe on (href,label).
  const navSet = new Map();
  for (const n of nav) {
    if (!navSet.has(n.href)) navSet.set(n.href, n.label);
    else if (navSet.get(n.href) !== n.label) {
      fails.push({ rule: 'nav-label-inconsistent', detail: `the nav labels ${n.href} as "${navSet.get(n.href)}" on one page and "${n.label}" on another` });
    }
  }

  for (const [href, label] of navSet) {
    if (!routes.includes(href)) {
      fails.push({ rule: 'nav-target-missing', detail: `the nav carries "${label}" -> ${href}, but the build emits ${routes.join(', ')} — a nav item is a promise about a path (D117)` });
      continue;
    }
    const html = byRoute.get(href);

    const t = TITLE.exec(html);
    if (t === null) {
      fails.push({ rule: 'title-site-missing', detail: `${href} has no <title>` });
    } else {
      if (hasWord(t[1], SITE) === false) {
        fails.push({ rule: 'title-site-missing', detail: `${href}'s title "${t[1]}" never names the site; every page the build emits is titled "<name> - ${SITE}" or "${SITE} - <descriptor>"` });
      }
      if (hasWord(t[1], label) === false) {
        fails.push({ rule: 'nav-title-mismatch', detail: `${href} is labelled "${label}" in the nav but titled "${t[1]}" — the tab and the nav name the same page two things. Title it "${label} - ${SITE}", or change the nav label to match.` });
      }
    }

    const band = BAND_ANY.exec(html);
    if (band) {
      for (const a of band[0].matchAll(ANCHOR)) {
        const bHref = a[1].replace(/\/$/, '') || '/';
        if (bHref !== href) continue;
        const bandLabel = visible(a[2]);
        if (!hasWord(bandLabel, label)) {
          fails.push({ rule: 'band-name-drift', detail: `${href}: the nav says "${label}" and the exit band says "${bandLabel}". The band is the site's map (D115); two words for one page is the alias defect this gate exists for.` });
        }
      }
    }

    // The page must confirm its own name in the block that opens it — the eyebrow and the h1 — so a
    // visitor who clicked "Dates" is not looking for a page called something else. Two things the first
    // version of this got wrong, both caught by a selftest that claimed to pass:
    //   - the slice has to stop at `</main>`. Slicing from `<main>` with a length runs straight through the
    //     footer band, and the band repeats every nav label — so a page that never named itself was
    //     "naming itself" with its own exit band. The slice is cut at the main element first, then searched,
    //     because an h1 match index is relative to the slice, not to the page.
    //   - 240 chars after the h1 is a generous reading window, not the whole page.
    const mainStart = html.indexOf('<main');
    const mainEnd = mainStart < 0 ? -1 : html.indexOf('</main>', mainStart);
    const opening = mainStart < 0 ? '' : html.slice(mainStart, mainEnd < 0 ? mainStart + 600 : mainEnd);
    const h1 = H1.exec(opening);
    const openingText = visible(opening.slice(0, (h1 ? h1.index + h1[0].length : 400) + 240));
    if (hasWord(openingText, label) === false) {
      fails.push({ rule: 'name-not-on-page', detail: `${href} is called "${label}" in the nav, and its own opening block says "${openingText.slice(0, 90)}". Put the name in the eyebrow above the h1 — the h1 keeps its voice, the eyebrow carries the name.` });
    }
  }

  // Titles of pages the nav never mentions still have to be named like the rest of the site.
  for (const p of pages) {
    if (navSet.has(p.route)) continue;
    const t = TITLE.exec(p.html);
    if (t === null) { fails.push({ rule: 'title-site-missing', detail: `${p.route} has no <title>` }); continue; }
    if (hasWord(t[1], SITE) === false) {
      fails.push({ rule: 'title-site-missing', detail: `${p.route}'s title "${t[1]}" never names the site` });
    }
  }

  return fails;
};

/** Every label the artifact attaches to an internal route, grouped by route. Informational: the name
 *  surfaces (nav, title, band, page opening) are the ones held to one word; prose is allowed to describe. */
export const aliasCensus = (pages) => {
  const routes = pages.map((p) => p.route);
  const seen = new Map();
  for (const { route, html } of pages) {
    for (const a of html.matchAll(ANCHOR)) {
      const href = a[1].replace(/\/$/, '') || '/';
      if (!routes.includes(href)) continue;
      const label = visible(a[2].replace(NAV_CHIP, ' '));
      if (!label) continue;
      const key = `${href}\u0000${label}`;
      if (!seen.has(key)) seen.set(key, { href, label, where: route });
    }
  }
  const out = new Map();
  for (const v of seen.values()) {
    if (!out.has(v.href)) out.set(v.href, []);
    out.get(v.href).push(v);
  }
  return out;
};

const runSelftest = () => {
  const page = (title, nav, main, band) =>
    `<html><head><title>${title}</title></head><body><header><nav>${nav}</nav></header>${main}${band}</body></html>`;
  const navRow = `<a href="/">Matheapolis</a><a href="/schedule">Dates</a><a href="/chat">Chat</a>`;
  const bandRow = `<footer class="bg-ink text-band-text"><a href="/schedule" class="py-2">Dates</a><a href="/chat" class="py-2">Chat</a></footer>`;
  const good = page('Dates - Matheapolis', navRow, '<main><p class="eyebrow">Dates</p><h1>When We Meet</h1><p>text</p></main>', bandRow);
  const home = page('Matheapolis - a Minneapolis math club', navRow, '<main><h1>Matheapolis</h1><p>the club</p></main>', bandRow);
  const clean = [{ route: '/', html: home }, { route: '/schedule', html: good }, { route: '/chat', html: page('Chat - Matheapolis', navRow, '<main><h1>Summaries from the chat</h1></main>', bandRow) }];
  const mutate = (fn) => clean.map((p) => ({ route: p.route, html: p.route === '/schedule' ? fn(p.html) : p.html }));

  const cases = [
    { name: 'clean control: one name in every surface', pages: clean, want: [] },
    { name: 'nav says Dates, the title says Schedule', pages: mutate((h) => h.replace('Dates - Matheapolis', 'Schedule - Matheapolis')), want: ['nav-title-mismatch'] },
    { name: 'the band says Schedule while the nav says Dates', pages: mutate((h) => h.replace('class="py-2">Dates</a>', 'class="py-2">Schedule</a>')), want: ['band-name-drift'] },
    { name: 'the page never names itself', pages: mutate((h) => h.replace('<p class="eyebrow">Dates</p>', '')), want: ['name-not-on-page'] },
    { name: 'a title that never names the site', pages: mutate((h) => h.replace('Dates - Matheapolis', 'Dates and places')), want: ['title-site-missing'] },
    { name: 'a nav label pointing at a page the build does not emit', pages: mutate((h) => h.replace('<a href="/chat">Chat</a>', '<a href="/members">Members</a>')), want: ['nav-target-missing'] },
    { name: 'containment is enough: "Dates on the schedule" names the page', pages: mutate((h) => h.replace('Dates - Matheapolis', 'Dates on the schedule - Matheapolis')), want: [] },
    { name: 'prose elsewhere may describe, not name', pages: mutate((h) => h.replace('</main>', '<a href="/schedule">the whole calendar</a></main>')), want: [] },
    { name: 'case is not a different name', pages: mutate((h) => h.replace('When We Meet', 'WHEN WE MEET').replace('>Dates</p>', '>DATES</p>')), want: [] },
    { name: 'the name in an HTML comment is not a name', pages: mutate((h) => h.replace('<p class="eyebrow">Dates</p>', '<!--Dates-->')), want: ['name-not-on-page'] },
    { name: 'the h1 itself may carry the name, no eyebrow needed', pages: mutate((h) => h.replace('<p class="eyebrow">Dates</p>', '').replace('When We Meet', 'Dates')), want: [] },
    { name: 'two pages label the same nav route differently', pages: [{ route: '/', html: home.replace('<a href="/schedule">Dates</a>', '<a href="/schedule">Schedule</a>') }, { route: '/schedule', html: good }, { route: '/chat', html: clean[2].html }], want: ['nav-label-inconsistent', 'nav-title-mismatch', 'band-name-drift', 'name-not-on-page'] },
    { name: 'clean control: a 404 page is titled like the site', pages: [...clean, { route: '/404', html: page('Page not found - Matheapolis', navRow, '<main><h1>Page not found</h1></main>', bandRow) }], want: [] },
    // D311: the nav's subordinate date is chrome, not a name. It must not turn "Dates" into a two-word name.
    { name: 'clean control: a date chip inside the anchor is not part of the label', pages: mutate((h) => h.replace('<a href="/schedule">Dates</a>', '<a href="/schedule">Dates <span data-nav-date="2026-11-21">21 Nov</span></a>')), want: [] },
    { name: 'a date glued to the label with no chip fails every surface at once', pages: clean.map((p) => ({ route: p.route, html: p.html.replace('<a href="/schedule">Dates</a>', '<a href="/schedule">Dates 21 Nov</a>') })), want: ['nav-title-mismatch', 'band-name-drift', 'name-not-on-page'] },
  ];

  let bad = 0;
  for (const c of cases) {
    const found = namingFindings(c.pages);
    const got = found.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(56)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
    if (!ok) for (const f of found) console.log(`        ${f.rule}: ${f.detail}`);
  }
  console.log(`\ncheck:naming selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ the real run

const runReal = () => {
if (!existsSync(DIST)) {
  console.error(`check:naming: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
  process.exit(1);
}
const pageFile = (route) => {
  if (route === '/') return resolve(DIST, 'index.html');
  const bare = route.replace(/^\//, '');
  const asDir = resolve(DIST, `${bare}/index.html`);
  return existsSync(asDir) ? asDir : resolve(DIST, `${bare}.html`);
};
const pages = emittedRoutes(DIST).map((route) => {
  const file = pageFile(route);
  return { route, html: existsSync(file) ? readFileSync(file, 'utf8') : '' };
});

const fails = namingFindings(pages);
const navLabels = (() => {
  const m = NAV_ANY.exec(pages[0].html);
  if (!m) return [];
  return [...m[0].matchAll(ANCHOR)].map((a) => `${visible(a[2].replace(NAV_CHIP, ' '))} -> ${a[1].replace(/\/$/, '') || '/'}`);
})();
console.log(`check:naming — ${pages.length} built page(s); nav names: ${navLabels.join(', ')}`);
const census = aliasCensus(pages);
for (const [href, labels] of [...census.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const words = labels.map((l) => `"${l.label}"`).join(', ');
  console.log(`  ${href}: ${labels.length} label(s) in the artifact — ${words}`);
}
for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
console.log(fails.length ? `\n${fails.length} finding(s).` : '\nOne name per page in the nav, the title, the exit band and the page itself.');
process.exit(fails.length ? 1 : 0);
};

// The entry guard: the verdict functions are exported so a probe or a debug script can import them, and
// importing a script that runs its own gate on import (which is what this file did before 2026-11-14,
// and what made the selftest's one missed case impossible to trace) is a defect class of its own.
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) (selftest ? runSelftest : runReal)();
