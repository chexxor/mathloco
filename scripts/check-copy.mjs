#!/usr/bin/env node
// check-copy.mjs — the copy slots that carry the club's descriptor stay the same phrase, in the same dash,
// in the slots a search result and a social card read.
//
//   npm run check:copy             # the three slots against each other, and against the descriptor rulings
//   npm run check:copy:selftest    # plant each defect this gate exists to catch; each must go red
//   node scripts/check-copy.mjs --list-rules
//
// Why a gate and not a comment. The descriptor is not one string, it is one phrase in three slots that live in
// three files: the hero's label lane (`src/components/HeroSection.astro`, the words a visitor reads), `seo.title`
// (`src/config.json`, which becomes `og:title` and `twitter:title`, i.e. the words a search result bolds and a
// link card prints), and the homepage's own `<Layout title=...>` (`src/pages/index.astro`, the `<title>` a crawler
// is given). They are coupled by ruling, not by code: `index.astro` deliberately duplicates `config.seo.title`
// rather than passing it, so that the copy in the page is readable at the page — and D247 records what happened
// when only two of the three carried the 2026-11-08 ruling (the lane said one thing, the metadata another, and
// the drift survived a whole green `verify` because nothing read the three together). This gate is the thing that
// reads them together: it fails on the class, not on this one instance of it.
//
// What it does NOT fix, and says so out loud: the ARTICLE. The lane drops the article because it is a label; a
// title keeps it because a title is read as a sentence fragment ("Matheapolis - a Minneapolis math club"). Both
// forms were measured in the lane's own face and case: 243.7px without the article and 257px with it, in a
// 288px lane at a 320 viewport, one line box either way @measured 2026-11-08 by `npm run round16`
// (design/grill/round16/report.json). The article stays a ruling in `design/decisions.json` and a comment at each
// slot, not a string this gate hard-codes.
//
// What it does NOT hold: one exact wording. Every descriptor this repo has ruled (Twin Cities -> Minneapolis–St.
// Paul -> Minneapolis) is superseded by a later ruling, so the gate asserts the INVARIANTS a ruling cannot change
// without editing this file — coupling, the pun's city, what the old forms are banned from, and the dash discipline
// that survives any rename. The wording itself lives in the slots, and the slots are what `npm run round16` prices.

import { readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv.find((a) => a.startsWith('--root='))?.slice('--root='.length) ?? join(HERE, '..');

const EN_DASH = '\u2013';     // Minneapolis–St. Paul, and every paired place name this site pairs
const HYPHEN = '-';

// The phrase's slots. `strip` takes the file text and returns the phrase, or null when the slot is gone.
const SLOTS = [
  {
    key: 'hero-lane',
    file: 'src/components/HeroSection.astro',
    marker: 'const locator',
    // The lane's phrase is a named const in the component's frontmatter, so the gate reads the value the markup
    // renders rather than grepping rendered markup: prettier reflows `.astro` on save, and a gate whose regex
    // carries an indentation or a quote style is a gate that fails on formatting rather than on copy.
    strip: (text) => {
      const m = text.match(/const locator = ('|")([^'"]*)\1/);
      return m ? m[2].trim() : null;
    },
  },
  {
    key: 'seo.title',
    file: 'src/config.json',
    marker: '"title":',
    strip: (text) => {
      const m = text.match(/"title":\s*"([^"]*)"/);
      return m ? m[1] : null;
    },
  },
  {
    key: 'page <title>',
    file: 'src/pages/index.astro',
    marker: '<Layout',
    strip: (text) => {
      const m = text.match(/<Layout\s*\n?\s*title=('|\")([^'\"]*)\1/);
      return m ? m[2] : null;
    },
  },
];

// The wordmark half of a title slot, read from the same file the title is read from, so the gate cannot be
// satisfied by a title that dropped the name it is supposed to be "Matheapolis - <descriptor>".
function wordmark(root) {
  const m = readFileSync(join(root, 'src/config.json'), 'utf8').match(/"name":\s*"([^"]*)"/);
  return m ? m[1] : null;
}

// A title slot is "<wordmark> - a <descriptor>". Returns the descriptor half, or null if the shape is not that.
function titleDescriptor(title, name) {
  if (!title || !name) return null;
  const prefixes = [`${name} - a `, `${name} - `, `${name}: `];
  for (const p of prefixes) if (title.startsWith(p)) return title.slice(p.length);
  return null;
}

// The rules. Each is (slots) -> a problem string, or null. Adding a rule means adding a planting below it.
const RULES = [
  {
    name: 'slot-coupling',
    why: 'the hero lane, seo.title and the page <title> are the same phrase (D247: two of three is this defect class)',
    check: ({ lane, titleConfig, titlePage, name }) => {
      if (!lane) return `hero lane not found in ${SLOTS[0].file} — the lane is the phrase's reader-facing half`;
      const dConfig = titleDescriptor(titleConfig, name);
      const dPage = titleDescriptor(titlePage, name);
      if (dConfig === null) return `seo.title is not "<name> - a <descriptor>": ${JSON.stringify(titleConfig)}`;
      if (dPage === null) return `<Layout title> is not "<name> - a <descriptor>": ${JSON.stringify(titlePage)}`;
      const problems = [];
      if (dConfig !== dPage) problems.push(`seo.title ${JSON.stringify(dConfig)} vs page <title> ${JSON.stringify(dPage)} — the page duplicates config on purpose, so a difference is a one-file edit`);
      if (dConfig !== lane) problems.push(`hero lane ${JSON.stringify(lane)} vs descriptor ${JSON.stringify(dConfig)} — the lane carries the phrase without its article`);
      return problems.length ? problems.join('; ') : null;
    },
  },
  {
    name: 'city-named',
    why: 'the descriptor prints the city the wordmark puns on (D241: the pun is `Math` inside `Minneapolis`)',
    check: ({ lane }) => (lane && !/\bMinneapolis\b/i.test(lane) ? `descriptor ${JSON.stringify(lane)} does not name Minneapolis` : null),
  },
  {
    name: 'region-word',
    why: 'a region word is not a club descriptor (D240, kept by D247). Venues may still say the metro — that is a claim about places, not the club name',
    check: ({ lane, titleConfig, titlePage }) => {
      const hits = [[ 'hero lane', lane ], [ 'seo.title', titleConfig ], [ 'page <title>', titlePage ]]
        .filter(([, v]) => v && /twin cities/i.test(v));
      return hits.length ? `${hits.map(([k]) => k).join(', ')} carry the region word "Twin Cities"` : null;
    },
  },
  {
    name: 'metro-pair',
    why: `the paired-metro descriptor (${JSON.stringify(`Minneapolis${EN_DASH}St. Paul`)}) was superseded by D247 on 2026-11-08: naming Minneapolis alone is sufficient`,
    check: ({ lane, titleConfig, titlePage }) => {
      const hits = [[ 'hero lane', lane ], [ 'seo.title', titleConfig ], [ 'page <title>', titlePage ]]
        .filter(([, v]) => v && v.includes('St. Paul'));
      return hits.length ? `${hits.map(([k]) => k).join(', ')} still carry the metro pair ${JSON.stringify(lane ?? titleConfig)}` : null;
    },
  },
  {
    name: 'lane-stays-undated',
    why: 'the lane is a locator about the club, never a next-date (D239)',
    check: ({ lane }) => {
      if (!lane) return null;
      const m = lane.match(/\b(\d{1,2}:\d{2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})\b/i);
      return m ? `hero lane carries a date-shaped string ${JSON.stringify(m[0])} — a lane with a date in it goes stale` : null;
    },
  },
  {
    name: 'meta-mirror-bound',
    why: 'og:title and twitter:title are bound to `seo.title`, so the phrase reaches a crawler without the body being read (D248)',
    check: (_view, root) => {
      const layout = readFileSync(join(root, 'src/layouts/Layout.astro'), 'utf8');
      const problems = [];
      if (!/property=["']og:title["']\s+content=\{seo\.title\}/.test(layout)) problems.push('Layout.astro no longer binds og:title to `seo.title`');
      if (!/name=["']twitter:title["']\s+content=\{seo\.title\}/.test(layout)) problems.push('Layout.astro no longer binds twitter:title to `seo.title`');
      return problems.length ? problems.join('; ') : null;
    },
  },
  {
    name: 'dash-discipline',
    why: `a paired place name joins with ${EN_DASH === '\u2013' ? 'an en dash' : 'a dash'}, never a hyphen (D241, inherited by D247)`,
    check: ({ lane, titleConfig, titlePage }) => {
      const slotTexts = [lane, titleConfig, titlePage].filter(Boolean);
      // A Capitalised place pair joined by a plain hyphen, tight ("Minneapolis-St") or spaced
      // ("Minneapolis - St"). The title's own joiner ("Matheapolis - a …") is followed by a lowercase word,
      // so it does not match, and a hyphenated common word ("real-time") starts lowercase, so it does not either.
      const bad = slotTexts.flatMap((t) => t.match(/\b[A-Z][a-z]+(?: - )?-[A-Z][A-Za-z.]+/g) ?? []);
      return bad.length ? `hyphen used where ${EN_DASH} is the rule for a paired place name: ${bad.map((b) => JSON.stringify(b)).join(', ')} (the title's own " - " joiner is not a pair, so this rule does not fire on it)` : null;
    },
  },
];

function readSlots(root) {
  const out = {};
  for (const s of SLOTS) {
    const path = join(root, s.file);
    if (!existsSync(path)) { out[s.key] = null; out[`${s.key}!missing`] = true; continue; }
    const raw = readFileSync(path, 'utf8');
    if (!raw.includes(s.marker)) out[`${s.key}!nomarker`] = `${s.file} no longer contains ${JSON.stringify(s.marker)}`;
    out[s.key] = s.strip(raw);
  }
  return out;
}

// Returns { problems: [{rule, detail}], slots }. Pure over the tree it is given, so the selftest can hand it a
// mutated fixture tree and audit the same rules.
export function audit(root = ROOT) {
  const slots = readSlots(root);
  const name = wordmark(root);
  const view = {
    lane: slots['hero-lane'],
    titleConfig: slots['seo.title'],
    titlePage: slots['page <title>'],
    name,
  };
  const problems = [];
  for (const flag of Object.keys(slots)) {
    if (flag.endsWith('!missing')) problems.push({ rule: 'slot-present', detail: `${SLOTS.find((s) => s.key === flag.replace('!missing', ''))?.file} is missing — a copy slot cannot drift by being deleted quietly` });
    if (flag.endsWith('!nomarker')) problems.push({ rule: 'slot-present', detail: slots[flag] });
  }
  for (const rule of RULES) {
    const detail = rule.check(view, root);
    if (detail) problems.push({ rule: rule.name, detail });
  }
  return { problems, slots: view, name };
}

if (process.argv.includes('--list-rules')) {
  console.log('check:copy rules');
  for (const r of RULES) console.log(`  ${r.name.padEnd(20)} ${r.why}`);
  process.exit(0);
}

// The fixture tree. The gate's rules read files by repo-relative path, so a planting is a copy of the real
// files into a gitignored tree, mutated, and audited with --root. Same rules, same readers, one file swapped.
const FIXTURE = join(ROOT, '.design', 'tmp-copy-fixtures');
const MUTATIONS = [
  {
    name: 'lane loses the phrase (the 2026-11-08 drift, planted)',
    file: 'src/components/HeroSection.astro',
    apply: (t) => t.replace("const locator = 'Minneapolis math club';", "const locator = 'math club';"),
    expect: ['slot-coupling', 'city-named'],
  },
  {
    name: 'a title keeps the superseded metro pair',
    file: 'src/config.json',
    apply: (t) => t.replace(`"title": "Matheapolis - a Minneapolis math club"`, `"title": "Matheapolis - a Minneapolis${EN_DASH}St. Paul math club"`),
    expect: ['slot-coupling', 'metro-pair'],
  },
  {
    name: 'a title goes back to the region word',
    file: 'src/pages/index.astro',
    apply: (t) => t.replace("title='Matheapolis - a Minneapolis math club'", "title='Matheapolis - a Twin Cities math club'"),
    expect: ['slot-coupling', 'region-word'],
  },
  {
    name: 'the descriptor stops naming the city the pun sits in',
    file: 'src/components/HeroSection.astro',
    apply: (t) => t.replace("const locator = 'Minneapolis math club';", "const locator = 'math club for the region';"),
    expect: ['slot-coupling', 'city-named'],
  },
  {
    name: 'the lane goes back to a next-date (D239)',
    file: 'src/components/HeroSection.astro',
    apply: (t) => t.replace("const locator = 'Minneapolis math club';", "const locator = 'Next: Sat Nov 7, 12:00 pm';"),
    expect: ['lane-stays-undated'],
  },
  {
    name: 'og:title stops mirroring seo.title',
    file: 'src/layouts/Layout.astro',
    apply: (t) => t.replace('property="og:title" content={seo.title}', 'property="og:title" content="Matheapolis"'),
    expect: ['meta-mirror-bound'],
  },
  {
    name: 'a metro pair reappears joined with a hyphen',
    file: 'src/config.json',
    apply: (t) => t.replace(`"title": "Matheapolis - a Minneapolis math club"`, `"title": "Matheapolis - a Minneapolis-St. Paul math club"`),
    expect: ['slot-coupling', 'metro-pair', 'dash-discipline'],
  },
  {
    name: 'the page stops duplicating the config title',
    file: 'src/pages/index.astro',
    apply: (t) => t.replace("title='Matheapolis - a Minneapolis math club'", "title='Matheapolis'"),
    expect: ['slot-coupling'],
  },
  {
    name: 'a slot is deleted rather than reworded',
    file: 'src/components/HeroSection.astro',
    apply: (t) => t.replace("const locator = 'Minneapolis math club';", "const locator = null;"),
    expect: ['slot-coupling'],
  },
];

function buildFixture(mutation) {
  const files = new Set(SLOTS.map((s) => s.file));
  files.add('src/layouts/Layout.astro');
  files.add('src/config.json');
  for (const f of files) {
    const to = join(FIXTURE, f);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(ROOT, f), to);
  }
  const path = join(FIXTURE, mutation.file);
  const before = readFileSync(path, 'utf8');
  const after = mutation.apply(before);
  if (after === before) return { error: `the mutation matched nothing in ${mutation.file} — the fixture drifted from the mutation, so this planting tests nothing` };
  // A mutation that also breaks JSON is a broken fixture, not a finding.
  if (mutation.file.endsWith('.json')) { try { JSON.parse(after); } catch { return { error: `the mutation produced invalid JSON in ${mutation.file}` }; } }
  writeText(path, after);
  return { path };
}

function writeText(path, text) {
  writeFileSync(path, text);
}

if (process.argv.includes('--selftest')) {
  const rows = [];
  rmSync(FIXTURE, { recursive: true, force: true });
  for (const m of MUTATIONS) {
    const built = buildFixture(m);
    if (built.error) { rows.push({ name: m.name, caught: [], wanted: [], error: built.error }); continue; }
    const { problems } = audit(FIXTURE);
    const rules = new Set(problems.map((p) => p.rule));
    const caught = m.expect.filter((r) => rules.has(r));
    rows.push({ name: m.name, caught, wanted: m.expect, error: null, extra: [...rules].filter((r) => !m.expect.includes(r)) });
  }
  rmSync(FIXTURE, { recursive: true, force: true });
  console.log('check:copy selftest — each planting must fail the rule it names\n');
  let bad = 0;
  for (const r of rows) {
    const ok = !r.error && r.caught.length === r.wanted.length;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.name}`);
    console.log(`        wants ${r.wanted.join(', ')}`);
    if (r.error) console.log(`        fixture problem: ${r.error}`);
    else {
      console.log(`        fired  ${[...r.caught, ...r.extra].join(', ') || '(nothing — the gate stayed green on a planted defect)'}`);
      const missed = r.wanted.filter((w) => !r.caught.includes(w));
      if (missed.length) console.log(`        MISSED ${missed.join(', ')}`);
    }
  }
  console.log(`\n${rows.length - bad}/${rows.length} plantings caught.`);
  process.exit(bad ? 1 : 0);
}

// Read-only run against the tree.
const { problems, slots, name } = audit();
console.log('check:copy — the descriptor, in every slot that says what the club is');
console.log(`  wordmark      ${name}`);
console.log(`  hero lane     ${JSON.stringify(slots.lane)}`);
console.log(`  seo.title     ${JSON.stringify(slots.titleConfig)}`);
console.log(`  page <title>  ${JSON.stringify(slots.titlePage)}`);
console.log('  (og:title and twitter:title read the page title, asserted by `meta-mirror-bound`)');

if (problems.length) {
  console.log('');
  for (const p of problems) console.log(`  FAIL ${p.rule}: ${p.detail}`);
  console.log(`\n${problems.length} copy failure(s). The three slots are one phrase by ruling (D247); a copy edit`);
  console.log('that reaches two of three is how the 2026-11-08 drift happened, and this gate is what catches the class.');
  process.exit(1);
}

const clean = RULES.length;
console.log(`\n${clean} rules, 0 failures: the descriptor is one phrase in all three slots, names Minneapolis, carries`);
console.log('no superseded form, no date, and the meta mirror is bound.');
