#!/usr/bin/env node
// check:content — the site may not ship a thing it does not know.
//
//   npm run check:content            # over src/ and the built dist/client
//   npm run check:content:selftest   # plant each defect, require each to FAIL (D118)
//   node scripts/check-content.mjs --dist <dir> --src <dir>   # scan fixtures instead (the selftest uses this)
//
// Why a gate and not a guideline: every fabricated claim in this repo survived *because nothing could see
// one*. Measured history, all real:
//   - `Join our active community of ${Math.floor(Math.random()*100+150)}+ members.` — a different community
//     size on every request, from a static page, with no source (D136; deleted, not replaced).
//   - "Saturday, 2:00 PM", "Local Library - Study Room B", "Topic: Introduction to Group Theory", a
//     "Reserve Your Spot" button — the whole of `UpcomingMeetups.astro`, `.notes/roadmap-events.md`:
//     "**entirely invented placeholder content**".
//   - "weekly" in four places, one of them `grep -c "Weekly Meetups"` → 1 on the live site, for two years
//     (D92; the copy rule: publish series names and real dates, never a frequency).
//   - `Schedule` and `Members` in the nav pointing at pages the build does not emit — 404 links on prod
//     (D117: a path needs a page).
// DESIGN.md's Copy rule already says how to write the fix — "[YEAR], [CADENCE], [N], [verbatim] stay
// bracketed until a source exists" — and the operator ruled on 2026-11-03 that placeholders are what to
// use for everything we are missing. A bracket is only safe while it stays out of the visitor's page, so
// the bracket convention gets a machine: this gate reads the built HTML, not the source, because the
// artifact is what a visitor reads.
//
// What FAILS: a bracketed placeholder in built HTML; a placeholder photo fill (`data-placeholder`) in a
// build whose tracked `src/content.json` has placeholders off, or a tracked config that turns them on; a
// retired fabricated string; a cadence word with no `source` beside it; `Math.random()` in copy generation;
// an internal link to a route the build does not emit.
//
// What is REPORTED, not failed: the open placeholder slots in `src/content.json` — the operator's punch
// list (photographs, the venue line, the member count and its source, the calendar source from D132) — and
// slots holding a claim with no source yet. Those are known holes with names; failing a build for a hole
// the operator has not filled yet is the "make the build fail so someone notices" answer they rejected
// (record 0010).
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const argOne = (flag, dflt) => { const i = args.indexOf(flag); return i < 0 ? dflt : args[i + 1]; };
const selftest = args.includes('--selftest');

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

// ---- the rules, as data, so the selftest can plant each one ------------------------------

// A bracket is DESIGN.md's marker for "we do not know this yet". It may live in src/content.json and in a
// specimen; it may never reach a visitor.
const BRACKET = /\[([^\]\n<>]{1,48})\]/g;
const looksLikePlaceholder = (s) => /^[A-Z][A-Z0-9 '’\-]{1,}$/.test(s.trim()) || /^\{.*\}$/.test(s.trim());

// D92's frequency words. Allowed only with a named `cadence.source` in src/content.json.
const CADENCE = /\b(weeklyn?|weekly|monthly|daily|nightly|biweekly|bimonthly|fortnightly|every other week|every week|every month|each week|twice a month|most months)\b/gi;

// Strings this repo measured as fabricated. If one comes back, someone pasted a placeholder into copy.
const RETIRED = [
  'Local Library', 'Study Room B', 'Reserve Your Spot', 'Introduction to Group Theory',
  'Saturday, 2:00 PM', 'active community of', 'Math Study Group Session',
];

// D136's defect class: a number the page invents at request time.
const RANDOM_COPY = /Math\.random\s*\(/g;

// Which paths the build actually emits, read off the artifact rather than remembered here: a route is a
// file, so `/chat` is `chat/index.html` and `/404` is `404.html`. This is what makes the dead-path rule
// self-updating — add a page and the gate stops refusing to link to it, delete one and every link to it
// goes red (D117 killed two nav links that pointed at nothing; remembering the route list by hand is how
// that class survives).
const emittedRoutes = (htmlFiles, distDir) => htmlFiles.map((f) => {
  const rel = f.slice(distDir.length).replace(/\\/g, '/');
  return rel.replace(/^\//, '').replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
}).map((p) => (p === 'index' || p === '' ? '/' : `/${p}`));

/** Strip comments and tags: a comment is not something a visitor reads, and prod's HTML carried the
 *  fabricated "Next meetup: Saturday, 2:00 PM" inside one, which made whole-page content probes lie. */
const visibleText = (html) => html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');

function scanPage(html, file, emitted, distDir) {
  const fails = [];
  const text = visibleText(html);

  for (const m of text.matchAll(BRACKET)) {
    if (looksLikePlaceholder(m[1])) fails.push({ rule: 'bracket', file, detail: `[${m[1]}] is in what a visitor reads` });
  }
  for (const m of html.matchAll(/data-slot="([^"]+)"/g)) void m; // probe handles: informational only
  for (const m of html.matchAll(/data-placeholder="([^"]+)"/g)) {
    fails.push({ rule: 'placeholder-fill', file, detail: `photo place ${m[1]} is drawn as a placeholder in this build` });
  }
  for (const s of RETIRED) {
    if (text.includes(s)) fails.push({ rule: 'retired-fabrication', file, detail: `"${s}" is back — it was measured as invented (.notes/roadmap-events.md, D136)` });
  }
  // Links the build has nothing behind (D117: a path needs a page — this is how /schedule and /members
  // 404'd). "Nothing behind" is checked against the artifact, not a remembered route list: a href is fine
  // if it is an emitted route or a real file under dist/client (favicon.svg, /_astro/*.css, sitemap.xml are
  // assets, not pages, and a rule that called them dead paths would be noise that gets the whole gate
  // ignored). What survives is a link a visitor can click and the edge has nothing to answer with.
  for (const m of html.matchAll(/href="([^"]*)"/g)) {
    const raw = m[1].split('#')[0].split('?')[0];
    if (!raw.startsWith('/')) continue;
    const path = raw.replace(/\/$/, '') || '/';
    const onDisk = existsSync(resolve(distDir, '.' + raw));
    if (!onDisk && !emitted.includes(path) && !emitted.some((r) => r !== '/' && path.startsWith(`${r}/`))) {
      fails.push({ rule: 'dead-path', file, detail: `href="${m[1]}" — no emitted route and no file behind it (emits ${emitted.join(', ')})` });
    }
  }
  return fails;
}

function scanSource(files) {
  const fails = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if (RANDOM_COPY.test(src)) {
      fails.push({ rule: 'invented-number', file: f, detail: 'Math.random() in source — a number the page invents per request (D136)' });
    }
    RANDOM_COPY.lastIndex = 0;
  }
  return fails;
}

function checkConfig(trackedJson, builtHtml) {
  const fails = [];
  const warns = [];
  if (trackedJson.photos?.placeholders === true) {
    fails.push({ rule: 'tracked-placeholder-switch', file: 'src/content.json', detail: 'placeholders: true is in the TRACKED content file — only src/content.local.json (gitignored) may turn a placeholder on' });
  }
  const cadence = trackedJson.cadence;
  const cadenceHits = new Map();
  for (const [file, html] of builtHtml) {
    // Meta descriptions are a claim the site publishes even though no eye reads them on the page — the
    // `seo.description` sentence says "Monthly meetups", and `visibleText` strips tags, so it is picked up
    // here rather than silently escaping the D92 rule.
    const meta = [...html.matchAll(/<meta\b[^>]*>/gi)]
      .map((m) => /content="([^"]*)"/i.exec(m[0])?.[1] ?? '')
      .filter(Boolean)
      .join(' ');
    for (const m of (visibleText(html) + ' ' + meta).matchAll(CADENCE)) {
      const w = m[1].toLowerCase();
      cadenceHits.set(w, (cadenceHits.get(w) ?? 0) + 1);
    }
  }
  if (cadenceHits.size && !cadence?.source) {
    fails.push({
      rule: 'unsourced-cadence',
      file: 'src/content.json',
      detail: `cadence word in built HTML (${[...cadenceHits].map(([w, n]) => `${w} x${n}`).join(', ')}) with no cadence.source — D92: publish series names and real dates, or name where the ruling came from`,
    });
  }
  return { fails, warns, cadenceHits };
}

/** The operator's punch list: which facts are still holes, and what each hole is waiting for. */
function openSlots(c) {
  const out = [];
  const walk2 = (v, path) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('value' in v && (v.value === null || v.value === '')) {
        out.push({ path, placeholder: v.placeholder ?? null, requires: v.requires ?? null, source: v.source ?? null });
      }
      for (const [k, child] of Object.entries(v)) if (!k.startsWith('_')) walk2(child, path ? `${path}.${k}` : k);
    } else if (Array.isArray(v)) v.forEach((child, i) => walk2(child, `${path}[${i}]`));
  };
  walk2(c, '');
  return out;
}

function unsourced(c) {
  const out = [];
  const walk2 = (v, path) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (typeof v.value === 'string' && v.value !== '' && !v.source) out.push({ path, value: v.value });
      for (const [k, child] of Object.entries(v)) if (!k.startsWith('_')) walk2(child, path ? `${path}.${k}` : k);
    }
  };
  walk2(c, '');
  return out;
}

function run(distDir, srcDir, tracked) {
  const htmlFiles = walk(distDir, ['.html']);
  const built = htmlFiles.map((f) => [f, readFileSync(f, 'utf8')]);
  const emitted = emittedRoutes(htmlFiles, distDir);
  const srcFiles = walk(srcDir, ['.astro', '.svelte', '.ts', '.tsx', '.mjs', '.js']).filter((f) => !f.endsWith('content.ts'));
  const fails = [
    ...built.flatMap(([f, h]) => scanPage(h, f, emitted, distDir)),
    ...scanSource(srcFiles),
  ];
  const { cadenceHits } = checkConfig(tracked, built);
  return { fails, built, cadenceHits, emitted };
}

// ---- selftest: can this gate fail? (D118 — a gate whose failure mode is a green line is no gate) ----

if (selftest) {
  const FIX = '.design/tmp-content';
  mkdirSync(`${FIX}/clean`, { recursive: true });
  const clean = `<html><body><a href="/chat">chat</a><p>Dates are set in the club Discord and posted on Meetup.</p></body></html>`;
  const plants = [
    { name: 'bracket', html: clean.replace('</body>', '<p>at [VENUE NAME]</p></body>') },
    { name: 'placeholder-fill', html: clean.replace('</body>', '<div data-placeholder="PS-1"></div></body>') },
    { name: 'retired-fabrication', html: clean.replace('</body>', '<p>Local Library - Study Room B</p></body>') },
    { name: 'dead-path', html: clean.replace('</body>', '<a href="/schedule">Schedule</a></body>') },
    { name: 'unsourced-cadence', html: clean.replace('</body>', '<p>Monthly meetups</p></body>') },
    { name: 'invented-number', html: clean, src: 'Join our active community of ' + '${Math.random()}+ members.' },
  ];
  const trackedNoSource = { cadence: { value: 'Monthly', source: null }, photos: { placeholders: false } };
  let bad = 0;
  for (const p of plants) {
    const dir = `${FIX}/plant-${p.name.replace(/[^a-z]/g, '')}`;
    mkdirSync(`${dir}/src`, { recursive: true });
    writeFileSync(`${dir}/index.html`, p.html);
    if (p.src) writeFileSync(`${dir}/src/Fake.astro`, p.src);
    const html = [[`${dir}/index.html`, p.html]];
    let fails = [...scanPage(p.html, `${dir}/index.html`, ['/', '/chat'], dir), ...scanSource(p.src ? [`${dir}/src/Fake.astro`] : [])];
    if (p.name === 'unsourced-cadence') fails = [...fails, ...checkConfig(trackedNoSource, html).fails];
    const caught = fails.some((f) => f.rule === p.name);
    console.log(`${caught ? 'ok   caught' : 'FAIL missed'}  ${p.name.padEnd(24)} ${fails.map((f) => f.rule).join(',') || 'nothing'}`);
    if (!caught) bad++;
  }
  // and the clean fixture must pass, or the gate is just always red
  const cleanFails = scanPage(clean, `${FIX}/clean/index.html`, ['/', '/chat'], `${FIX}/clean`);
  const cleanOk = cleanFails.length === 0;
  console.log(`${cleanOk ? 'ok   clean' : 'FAIL clean'}  clean fixture          ${cleanFails.map((f) => f.rule).join(',') || 'no findings'}`);
  if (!cleanOk) bad++;
  // a tracked file that switches placeholders on must be caught
  const trackedOn = checkConfig({ cadence: { source: 'x' }, photos: { placeholders: true } }, []).fails;
  const trackedOnCaught = trackedOn.some((f) => f.rule === 'tracked-placeholder-switch');
  console.log(`${trackedOnCaught ? 'ok   caught' : 'FAIL missed'}  tracked-placeholder-switch`);
  if (!trackedOnCaught) bad++;
  console.log(`\ncheck:content selftest: ${plants.length + 2 - bad}/${plants.length + 2} planted defects caught`);
  process.exit(bad ? 1 : 0);
}

// ---- the real run -----------------------------------------------------------------------

const trackedPath = resolve('src/content.json');
if (!existsSync(trackedPath)) {
  console.error('check:content: src/content.json missing — the site has no single source for its own facts.');
  process.exit(1);
}
const tracked = JSON.parse(readFileSync(trackedPath, 'utf8'));

const distDir = argOne('--dist', 'dist/client');
const srcDir = argOne('--src', 'src');
if (!existsSync(distDir)) {
  console.error(`check:content: ${distDir} missing — it judges the artifact a visitor reads, so build first (npm run build).`);
  process.exit(1);
}

const { fails, built, cadenceHits } = run(distDir, srcDir, tracked);

console.log(`check:content — ${built.length} built page(s) over ${walk(srcDir, ['.astro', '.svelte', '.ts']).length} source file(s)`);
console.log(`  built HTML: ${built.map(([f]) => f.split('/').slice(-2).join('/')).join(', ')}`);
if (cadenceHits.size) {
  console.log(`  cadence words in what a visitor reads: ${[...cadenceHits].map(([w, n]) => `${w} x${n}`).join(', ')} — source: ${tracked.cadence?.source ? tracked.cadence.source.slice(0, 72) + '…' : 'NONE (that is a failure)'}`);
}

const holes = openSlots(tracked);
console.log(`\n  open placeholders in src/content.json (${holes.length}) — these are the operator's, not the build's:`);
for (const h of holes) {
  console.log(`   · ${h.path}${h.placeholder ? `  waiting for ${h.placeholder}` : ''}${h.requires ? `  [${h.requires}]` : ''}`);
}
const uns = unsourced(tracked);
if (uns.length) {
  console.log(`\n  claims with no source beside them (${uns.length}) — the site states these today:`);
  for (const u of uns) console.log(`   ~ ${u.path}: "${u.value}" — add source + asOf in src/content.json (D92)`);
}

if (fails.length) {
  console.log('');
  for (const f of fails) console.log(`  FAIL ${f.rule.padEnd(24)} ${f.file}\n       ${f.detail}`);
  console.log(`\n${fails.length} content failure(s). The page is asserting something it does not know, or a`);
  console.log('review-only state is in an artifact that carries the apex triggers.');
  process.exit(1);
}
console.log(`\nNo placeholder, no fabricated number, no dead path and no unsourced cadence in the built pages.`);
console.log(`Run \`npm run check:content:selftest\` to see that these checks can still fail.`);
