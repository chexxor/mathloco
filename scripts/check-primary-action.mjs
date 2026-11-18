#!/usr/bin/env node
// check:primary-action — one page gets one primary call to action.
//
//   npm run check:primary-action             # over the built dist/client
//   npm run check:primary-action:selftest    # plant a doubled primary, require each to FAIL
//
// The rule this detector enforces is DESIGN.md's paragraph "**One page, one primary** (MS35, S068)": a built
// page carries **at most one** `data-control="primary"`. The rule is written in DESIGN.md before this gate
// demands it, so this file cites it rather than restating it — including the half of it this gate refuses.
//
// Why this gate exists (2026-11-18, MS35): the fact was kept in prose and in a comment. `src/components/
// Schedule.astro:378` reads "Printing it in the notice too would put two `data-control=\"primary\"` controls
// in one…" — a reader finds it only by opening that file, and nothing fails when someone does it. `check:render`
// measures control heights and the pair of every inset ring; it never counts the roles. The page that painted
// two identical Discord buttons (D437) was fixed by hand; the next one would stay green.
//
// What it enforces:
//   FAIL  primary-doubled — a built page carries more than one `data-control="primary"`. Named with the words
//                          each primary paints and where it points, so the fix is the demotion.
//   INFO  the role census — per page: primaries, secondaries, and each primary's words. The secondary count
//                          is PRINTED, NOT BOUNDED: the corpus that proposes "at most two secondary" is
//                          contradicted by our own shipped tree (three secondary roles on `/` and three on
//                          `/join`), so that budget is refused as `DRAFT·secondary-budget` — the same class as
//                          §1's refusal of Carbon's carrier count. A gate that failed today's artifact for a
//                          foreign number would be a bar nobody owns.
//
// Deliberately NOT enforced: a cap on secondaries (above); that every page HAVE a primary — `/chat`, `/dates`
// and `/past` ship none, and a page with no shout is a page, not a defect; that a role match its paint
// (`check:render` reads the fill and the ring off the rendered box, which is where paint is knowable); and any
// claim across pages — the exit band is chrome, so one page's primary being another page's secondary is the
// grammar of a site, not a doubling. Only the region the visitor paints is read: compiled island code inside
// `<script>` carries control strings a page never paints (`check:route-targets` strips the same regions).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emittedRoutes } from '../design/emitted-routes.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return i < 0 ? resolve('dist/client') : args[i + 1];
})();

const markup = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
const visible = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

/** A control names its role (D140): `data-control="primary"` or `data-control="secondary"`. The tag, the
 *  href and the words are carried so a finding can name the control to demote; "config invalid" does not. */
const CONTROL = /<([a-z][a-z0-9-]*)\b([^>]*\bdata-control="(primary|secondary)")[^>]*>/g;

/** The words inside one control, walking forward with the same tag's nesting counted — a control wraps a
 *  label plus an sr-only qualifier, so the text is not the next chunk of markup. */
function controlText(html, from, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  re.lastIndex = from;
  let depth = 1;
  let end = html.length;
  for (;;) {
    const m = re.exec(html);
    if (!m) break;
    if (m[1] === '/') {
      if (--depth === 0) { end = m.index; break; }
    } else depth++;
  }
  return visible(html.slice(from, end));
}

const hrefOf = (attrs) => {
  const m = attrs.match(/\bhref=(["'])[^"']*\1/);
  return m ? m[0].replace(/^href=(["'])/, '').replace(/["']$/, '') : '';
};

/** Pure verdict over `[{route, html}]` so the selftest plants a promoted label in memory: no build, no disk,
 *  and the defect is caught on the branch that promoted it (D118). */
export const primaryFindings = (pages) => {
  const fails = [];
  for (const p of pages) {
    const html = markup(p.html);
    const roles = [...html.matchAll(CONTROL)].map((m) => ({
      role: m[3],
      tag: m[1],
      href: hrefOf(m[2]),
      label: controlText(html, m.index + m[0].length, m[1]),
    }));
    const primary = roles.filter((r) => r.role === 'primary');
    if (primary.length > 1) {
      const named = primary.map((r) => `"${r.label || `${r.tag} (paints no words)`}" points at ${r.href || 'no href'}`);
      fails.push({ rule: 'primary-doubled', detail: `${p.route} carries ${primary.length} primary controls: ${named.join(' and ')}. A second primary on one page is two answers to one question — the page already owns its shout, so the extra one is a secondary or a quiet label (DESIGN.md "One page, one primary"; inside a notice, no control role at all).` });
    }
  }
  return fails;
};

/** The census the report prints, secondaries included because no rule bounds them. */
export const roleCensus = (pages) => pages.map((p) => {
  const roles = [...markup(p.html).matchAll(CONTROL)].map((m) => m[3]);
  return {
    route: p.route,
    primary: roles.filter((r) => r === 'primary').length,
    secondary: roles.filter((r) => r === 'secondary').length,
  };
});

// ------------------------------------------------------------------ the selftest

/** Real controls lifted off the shipped artifact (`/` and `/join`), class lists elided — the paint is
 *  `check:render`'s job, the role is this gate's. */
const HOME_PRIMARY = `<a href="https://www.meetup.com/minneapolis-mathematics-book-club/events/317242488/" target="_blank" rel="noopener noreferrer" data-control="primary" class="…">Sign up for Sat, Nov 21</a>`;
const HOME_SECONDARIES = `<a href="/dates" data-control="secondary" class="…">All dates</a><a href="/join" data-control="secondary" class="…">Join the club</a><a href="https://discord.com/invite/wx5S7YJSkU" target="_blank" rel="noopener noreferrer" data-control="secondary" class="…">Join the chat</a>`;
const JOIN_PRIMARY = `<a href="/dates" data-control="primary" data-join-kind="rsvp" data-join-platform="Meetup" class="…">See the dates</a>`;
const JOIN_SECONDARIES = `<a href="https://discord.com/invite/wx5S7YJSkU" data-control="secondary" data-join-kind="chat" data-join-platform="Discord" class="…">Join the chat on Discord</a><a href="https://www.meetup.com/minneapolis-mathematics-book-club" data-control="secondary" data-join-kind="social" data-join-platform="Meetup" class="…">Join the Meetup group</a><a href="https://www.facebook.com/groups/matheapolis" data-control="secondary" data-join-kind="social" data-join-platform="Facebook" class="…">Join the Facebook group</a>`;
/** The `/past` empty-calendar notice as it ships, plus its quiet label: one boundary, no control role
 *  (D108's state grammar). */
const PAST_NOTICE = `<div role="status" class="inset-shadow-rule rounded-control px-4 py-6"><p class="text-label font-medium text-ink-3">Nothing listed yet</p><h2 class="text-lede">No finished date on our calendar</h2><button class="inline-flex min-h-8 text-label font-medium text-ink underline decoration-rule">Try again</button></div>`;

const runSelftest = () => {
  const cases = [
    {
      name: 'clean control: the shipped home page (one primary, three secondary)',
      pages: [{ route: '/', html: `${HOME_PRIMARY}${HOME_SECONDARIES}` }],
      want: [],
    },
    {
      name: 'clean control: the shipped /join (one computed primary, three secondary)',
      pages: [{ route: '/join', html: `${JOIN_PRIMARY}${JOIN_SECONDARIES}` }],
      want: [],
    },
    {
      name: 'clean control: a page with no primary at all (/dates ships none)',
      pages: [{ route: '/dates', html: HOME_SECONDARIES }],
      want: [],
    },
    {
      name: 'clean control: two secondary roles and no primary — the corpus would fail this, our refusal does not',
      pages: [{ route: '/past', html: `<a href="/dates" data-control="secondary" class="…">Upcoming dates</a><a href="/chat" data-control="secondary" class="…">Read the chat</a>` }],
      want: [],
    },
    {
      name: `the shipped Schedule fixture with its notice's quiet label promoted to primary`,
      pages: [{ route: '/dates', html: `${HOME_PRIMARY}${PAST_NOTICE.replace('<button class="inline-flex min-h-8', '<button data-control="primary" class="inline-flex min-h-8')}` }],
      want: ['primary-doubled'],
    },
    {
      name: 'the computed lead painted twice (both join channels read as lead)',
      pages: [{ route: '/join', html: `${JOIN_PRIMARY}<a href="https://discord.com/invite/wx5S7YJSkU" data-control="primary" data-join-kind="chat" data-join-platform="Discord" class="…">Join the chat on Discord</a>` }],
      want: ['primary-doubled'],
    },
    {
      name: 'clean control: a role inside compiled island code in <script> is not a painted control',
      pages: [{ route: '/chat', html: `<script>const a = '<a data-control="primary" href="/x">one</a>'; const b = '<a data-control="primary" href="/y">two</a>';</script>${HOME_PRIMARY}` }],
      want: [],
    },
    {
      name: "clean control: one page's primary is another page's exit band (no page doubles)",
      pages: [{ route: '/', html: HOME_PRIMARY }, { route: '/join', html: JOIN_PRIMARY }],
      want: [],
    },
  ];

  let bad = 0;
  for (const c of cases) {
    const found = primaryFindings(c.pages);
    const got = found.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(92)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
    if (!ok) for (const f of found) console.log(`        ${f.rule}: ${f.detail}`);
  }
  console.log(`\ncheck:primary-action selftest — ${cases.length} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
};

// ------------------------------------------------------------------ the run

const runReal = () => {
  if (!existsSync(DIST)) {
    console.error(`check:primary-action: ${DIST} missing — this gate reads the artifact, so build first (npm run build).`);
    process.exit(1);
  }
  const routes = emittedRoutes(DIST);
  const pages = routes.map((route) => {
    const asDir = resolve(DIST, `${route.replace(/^\//, '')}/index.html`);
    const file = route === '/' ? resolve(DIST, 'index.html')
      : existsSync(asDir) ? asDir : resolve(DIST, `${route.replace(/^\//, '')}.html`);
    return { route, html: readFileSync(file, 'utf8') };
  });
  const census = roleCensus(pages);
  console.log(`built pages(${census.length}): ${census.map((c) => `${c.route} primary ${c.primary} / secondary ${c.secondary}`).join('  |  ')}`);
  for (const p of pages) {
    const html = markup(p.html);
    const named = [...html.matchAll(CONTROL)].filter((m) => m[3] === 'primary')
      .map((m) => `"${controlText(html, m.index + m[0].length, m[1])}" -> ${hrefOf(m[2]) || 'no href'}`);
    if (named.length) console.log(`  ${p.route} primary: ${named.join('  ')}`);
  }
  console.log(`secondary roles: ${census.reduce((n, c) => n + c.secondary, 0)} across the artifact — printed, not bounded (DRAFT·secondary-budget).`);
  const fails = primaryFindings(pages);
  for (const f of fails) console.log(`  FAIL ${f.rule}  ${f.detail}`);
  console.log(fails.length
    ? `\n${fails.length} finding(s).`
    : `\n${pages.length} built page(s): at most one primary each (${census.filter((c) => c.primary).length} carry one, ${census.filter((c) => !c.primary).length} carry none); the secondary budget is refused, not enforced.`);
  process.exit(fails.length ? 1 : 0);
};

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) (selftest ? runSelftest : runReal)();
