#!/usr/bin/env node
// link-ceiling.mjs — how many absolute URLs a built page paints OUTSIDE its own <footer>.
//
//   node design/link-ceiling.mjs                 // per-page counts, the maximum, the verdict
//   node design/link-ceiling.mjs --json          // the same numbers as a machine record
//   node design/link-ceiling.mjs --limit 4       // price the ceiling as something other than 6
//   node design/link-ceiling.mjs /dates /past    // only the routes you name
//
// Why this is an instrument and not a line of prose. The operator's rulings letter of 2026-11-16 (R1,
// accepted as **(a)**) rules that "same-origin is not an exit" and that the ceiling is NOT bought back by
// adding a door to a page. Its acceptance names one number — 6 absolute URLs outside the `<footer>` —
// measured on `/schedule` (since renamed `/dates`, D373) at 390px, and rules that **no page on the site
// exceeds 6**. DESIGN.md quotes that number per page, so it needs the probe that prints it, exactly the
// way every other measured claim in DESIGN.md names the instrument that produced it (D282: a claim with
// no probe behind it is a claim the next session cannot re-measure).
//
// What it reads, and why each part of that matters:
//   - the BUILT artifact, never `src/`. The source has the components; the artifact has the anchors a
//     visitor's cursor can actually land on, including the ones an island hydrates and the ones a
//     conditional attribute suppresses. D307 makes the exit band standing chrome that every page ships,
//     so a page's own `<footer>` is not copy it spent — it is the same words every page already pays
//     for, and counting it would price the site's ceiling by the footer rather than by the page.
//   - `href` matched anywhere in the attribute list, not required to be `<a>`'s first attribute. The
//     run before D373 counted with `href="…"` glued to `<a ` and read `/chat` **2**; the same anchors
//     counted with attribute order free read `/chat` **3**. The ceiling (a maximum) never moved, but a
//     per-page count quoted in prose did, and that is the class of defect this line exists to keep
//     someone from repeating: a regex anchored to markup shape is a second memory of the markup.
//   - anchors, not distinct destinations. `check:rsvp-page` already enforces this ceiling per page it
//     owns, in the same unit ("outbound links outside the exit band, limit 6"), and R1's acceptance
//     counts the anchors a visitor sees. Distinct URLs is printed beside it because the two numbers
//     answer different questions — a page that paints one group root three times is at 3 anchors and
//     1 destination, and "how much does this page spend" is the anchor count.
//
// The route enumeration is `design/dist-pages.mjs` (which is `design/emitted-routes.mjs` under a
// "a route is a file that exists" filter) and the anchor reading is that module's `onePage`. This probe
// carries neither: a page read here and a page read by `check:rsvp-page` or the communication census
// must be one read, or a ceiling and a claims count describe two different pages (the rule D361 and
// the census both keep).
//
// NOT a gate. It reports and exits 0 like the other `design/` instruments whose verdict is a decision
// rather than a rule the site enforces: the ceiling itself is enforced where it belongs — `check:rsvp-page`
// fails a page whose own outbound set goes over 6 — and this exists so a claim in DESIGN.md names the
// probe that produced its per-page numbers. `--limit` is here so a reader can price a different ceiling
// without editing the probe.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { onePage, builtPageFiles } from './dist-pages.mjs';

const argv = process.argv.slice(2);
const json = argv.includes('--json');
const limitAt = argv.indexOf('--limit');
const LIMIT = limitAt >= 0 ? Number(argv[limitAt + 1]) : 6;
const only = argv.filter((a) => a.startsWith('/') ? true : false);

const dist = 'dist/client';
if (!existsSync(resolve(dist))) {
  console.error(`no ${dist} to read — run \`npm run build\` first (this probe measures the artifact, not the source)`);
  process.exit(1);
}

/** The homepage first, everything else alphabetical — the same order `emitted-routes.mjs` prints. */
function homeFirst(route) { return route === '/' ? 0 : 1; }

const pages = builtPageFiles(dist)
  .filter((p) => only.length === 0 || only.includes(p.route))
  .sort((a, b) => homeFirst(a.route) - homeFirst(b.route) || a.route.localeCompare(b.route));

if (only.length) {
  const named = pages.map((p) => p.route);
  for (const r of only) if (!named.includes(r)) console.log(`route ${r}: no carrying file in ${dist} — it is not a page the build emitted`);
}

const rows = pages.map((p) => {
  const page = onePage(p.file, p.route);
  const outside = page.anchors.filter((a) => /^https?:\/\//i.test(a.href) && a.zone !== 'exit-band');
  const inside = page.anchors.filter((a) => /^https?:\/\//i.test(a.href) && a.zone === 'exit-band');
  const seen = new Map();
  for (const a of outside) seen.set(a.href, (seen.get(a.href) ?? 0) + 1);
  return {
    route: p.route,
    anchors: outside.length,
    distinct: seen.size,
    inFooter: inside.length,
    sameOrigin: page.anchors.filter((a) => a.internal).length,
    byHref: [...seen].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])),
  };
});

const max = rows.reduce((m, r) => (r.anchors > m.anchors ? r : m), { anchors: -1, route: '(no pages)' });
const over = rows.filter((r) => r.anchors > LIMIT);

if (json) {
  console.log(JSON.stringify({
    measured: true,
    dist,
    pages: rows.length,
    limit: LIMIT,
    ceiling: max.anchors,
    definesIt: rows.filter((r) => r.anchors === max.anchors).map((r) => r.route),
    over,
    rows,
  }, null, 2));
  process.exit(0);
}

console.log(`link-ceiling — absolute URLs a built page paints outside its own <footer>, read off ${dist}`);
console.log(`counted with href anywhere in the attribute list (attribute order free); "outside" excludes the page's own <footer>, which ships standing (D307)`);
for (const r of rows) {
  console.log(`${r.route} — ${r.anchors} outbound anchor(s) outside the footer (${r.distinct} distinct URL(s)), ${r.inFooter} inside it, ${r.sameOrigin} same-origin anchor(s) on the page`);
  for (const [href, n] of r.byHref) console.log(`   ${n} × ${href}`);
}
console.log(`ceiling: ${max.anchors} on ${max.route} of ${rows.length} built page(s); the rule R1(a) accepts is ${LIMIT}`);
if (over.length) console.log(`OVER the limit: ${over.map((r) => `${r.route} ${r.anchors}`).join(', ')}`);
else console.log(`every page is at or under ${LIMIT}; ${max.route} is the page that defines it`);
