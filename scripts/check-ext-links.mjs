#!/usr/bin/env node
// check:ext-links — every link that leaves the site says so, safely, and once.
//
//   npm run check:ext-links            # over the built dist/client
//   npm run check:ext-links:selftest   # plant each defect, require each to FAIL, with clean controls
//
// Why (2026-11-14, S041, D317). The commissioned read (§5.5) asked for "target=_blank rel=noopener plus an
// SVG arrow and <span class="sr-only">(opens in a new tab)</span>, consistent on every page". Checked against
// the artifact, two of those three were already true and one was false in a way the read did not name:
//   - every outbound anchor already carries rel="noopener noreferrer" and an arrow glyph (the cluster's
//     platform mark plus "→", the /chat button's inline SVG);
//   - the qualifier was already sr-only everywhere it existed;
//   - what was NOT true: four anchors leaving the site carried no qualifier at all (the exit band's
//     "Join on Meetup" and "Discord", the 404's "our Meetup group", the homepage's inline "Meetup"), and
//     where a qualifier did exist it repeated the platform the label had just named, so the accessible name
//     read "Sign up on Meetup Meetup, opens in a new tab" — the exact string the read quoted, and a defect a
//     reader who only sees the rendered page cannot see at all.
//
// So the gate enforces four rules, none of which is about aesthetics:
//   FAIL blank-no-rel        target="_blank" with no `noopener` in rel
//   FAIL internal-blank      one of the club's own routes painted with target="_blank"
//   FAIL external-no-blank   an outbound link that navigates the reader away in the same window
//   FAIL qualifier-visible   the words "opens in a new tab" painted where a sighted reader sees them
//   FAIL no-qualifier        an anchor that leaves the site with nothing in its accessible name saying so
//   FAIL name-repeats        the same platform word in the visible label AND in the sr-only suffix
//
// The wording itself lives in `src/lib/rsvp.mjs` (`NEW_TAB_QUALIFIER`); this gate only checks the artifact.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { PLATFORMS, NEW_TAB_QUALIFIER, newTabQualifier } from '../src/lib/rsvp.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const DIST = (() => {
  const i = args.indexOf('--dist');
  return resolve(i < 0 ? 'dist/client' : args[i + 1]);
})();

const ANCHOR = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
const SR_ONLY = /<span class="sr-only">([\s\S]*?)<\/span>/g;
const attr = (attrs, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1] ?? null;
/** Visible text: tags gone, aria-hidden spans gone, sr-only spans gone. `text()` keeps sr-only because the
 *  accessible name is the concatenation of both. */
const visibleText = (inner) =>
  inner
    .replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(SR_ONLY, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
const accessibleName = (inner, attrs) => {
  const label = attr(attrs, 'aria-label');
  if (label) return label.replace(/\s+/g, ' ').trim();
  return inner.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
};
const isExternal = (href) => /^https?:\/\//i.test(href);

/**
 * Pure verdict over one page's HTML, so the selftest can plant without a build.
 * Returns [{rule, detail}] — empty for a page that keeps the rules.
 */
export const extLinkFindings = (html, pageName = 'page') => {
  const fails = [];
  let checked = 0;
  for (const m of html.matchAll(ANCHOR)) {
    const attrs = m[1];
    const inner = m[2];
    const href = attr(attrs, 'href') ?? '';
    const target = attr(attrs, 'target');
    const rel = attr(attrs, 'rel') ?? '';
    const external = isExternal(href);
    if (!external && !target) continue; // an internal link is not this gate's business
    checked++;

    // 1. A new tab must not be reachable through the opener's window.
    if (target === '_blank' && !/noopener/i.test(rel)) {
      fails.push({ rule: 'blank-no-rel', detail: `${pageName} "${visibleText(inner)}" opens a new tab with rel="${rel}" (no noopener)` });
    }

    // 2. An internal route is not an exit; opening one in a new tab strands the reader in a second window.
    if (target === '_blank' && !external && !/^(mailto|tel):/i.test(href)) {
      fails.push({ rule: 'internal-blank', detail: `${pageName} paints the club's own route ${href} with target="_blank"` });
    }

    // 3. A club route is not an exit, so it never needs the qualifier.
    if (!external) continue;

    // 4. Every path that leaves the site opens in a new tab: the club's page is the thing the visitor came
    //    for, and an outbound link that navigates away in the same window throws it away (S041).
    if (target !== '_blank') {
      fails.push({ rule: 'external-no-blank', detail: `${pageName} takes the reader off-site in the same window: ${href}` });
      continue;
    }

    // 5. The mode of opening has to be in the accessible name, and only there.
    const said = accessibleName(inner, attrs);
    if (!/opens in a new tab/i.test(said)) {
      fails.push({ rule: 'no-qualifier', detail: `${pageName} "${said}" leaves the site and nothing in its accessible name says so` });
    }
    if (/opens in a new tab/i.test(visibleText(inner))) {
      fails.push({ rule: 'qualifier-visible', detail: `${pageName} paints "opens in a new tab" where a sighted reader sees it: "${visibleText(inner)}"` });
    }

    // 6. A platform named once is a platform named once.
    const srText = [...inner.matchAll(SR_ONLY)].map((s) => s[1]).join(' ');
    const seen = visibleText(inner);
    for (const platform of Object.values(PLATFORMS)) {
      const word = new RegExp(`\\b${platform}\\b`, 'i');
      if (word.test(seen) && word.test(srText)) {
        fails.push({ rule: 'name-repeats', detail: `${pageName} names ${platform} twice in one link: "${accessibleName(inner, attrs)}"` });
      }
    }
  }
  return { fails, checked };
};

// ------------------------------------------------------------------ selftest

if (selftest) {
  const ext = (label, sr) => `<a href="https://example.com/x" target="_blank" rel="noopener noreferrer">${label}${sr ? `<span class="sr-only">${sr}</span>` : ''}<span aria-hidden="true">→</span></a>`;
  const cases = [
    { name: 'clean control: a labelled link with its qualifier', html: ext('Sign up on Meetup', NEW_TAB_QUALIFIER), want: [] },
    { name: 'clean control: internal path, no target', html: '<a href="/schedule">Our schedule page</a>', want: [] },
    { name: 'clean control: aria-label carries the qualifier', html: '<a href="https://example.com/y" target="_blank" rel="noopener" aria-label="Discord, opens in a new tab">Chat</a>', want: [] },
    { name: 'clean control: the shipped cluster anchor, byte for byte', html: ext('Sign up on Meetup', newTabQualifier('Sign up on Meetup', PLATFORMS.meetup)), want: [] },
    { name: 'blank with no rel at all', html: '<a href="https://example.com/z" target="_blank">Meetup</a>', want: ['blank-no-rel', 'no-qualifier'] },
    { name: 'rel noreferrer without noopener', html: '<a href="https://example.com/z" target="_blank" rel="noreferrer">Meetup<span class="sr-only">, opens in a new tab</span></a>', want: ['blank-no-rel'] },
    { name: 'the qualifier painted in the visible label', html: '<a href="https://example.com/z" target="_blank" rel="noopener">Sign up on Meetup opens in a new tab</a>', want: ['qualifier-visible'] },
    { name: 'an external link with no qualifier', html: '<a href="https://example.com/z" target="_blank" rel="noopener noreferrer">Discord</a>', want: ['no-qualifier'] },
    { name: 'the platform repeated in the suffix', html: ext('Sign up on Meetup', 'Meetup, opens in a new tab'), want: ['name-repeats'] },
    { name: 'an internal route opening a new tab', html: '<a href="/join" target="_blank" rel="noopener">Ways in</a>', want: ['internal-blank'] },
    { name: 'an outbound link that keeps the reader in the same tab', html: '<a href="https://example.com/x" rel="noopener">Meetup</a>', want: ['external-no-blank'] },
    { name: 'a mailto link with no rel', html: '<a href="mailto:club@example.com">Write to us</a>', want: [] },
    { name: 'a link that says new window instead of new tab', html: ext('Join the chat on Discord', ', opens in a new window'), want: ['no-qualifier'] },
    { name: 'every defect at once on one page', html: `${ext('Join the Facebook group', 'Facebook, opens in a new tab')}<a href="https://example.com/q" target="_blank">Meetup</a>`, want: ['name-repeats', 'blank-no-rel', 'no-qualifier'] },
  ];
  let bad = 0;
  for (const c of cases) {
    const got = extLinkFindings(c.html, 'planted page').fails.map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = miss.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(48)} ${got.join(',') || 'nothing'}${miss.length ? ` — missing: ${miss.join(',')}` : ''}${extra.length ? ` — unexpected: ${extra.join(',')}` : ''}`);
  }
  // The derivation the components use, asserted here so the gate and the markup cannot disagree.
  const derivedOk = newTabQualifier('Sign up on Meetup', 'Meetup') === NEW_TAB_QUALIFIER
    && newTabQualifier('Common Denominator - Study Session', 'Meetup') === ' on Meetup, opens in a new tab'
    && newTabQualifier('Join the chat', 'Discord') === ' on Discord, opens in a new tab';
  console.log(`${derivedOk ? 'ok   derived' : 'FAIL derived'}  newTabQualifier names the platform only when the label does not`);
  if (!derivedOk) bad++;
  console.log(`\ncheck:ext-links selftest — ${cases.length + 1} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ the real run

const htmlFiles = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
};

if (!existsSync(DIST)) {
  console.error(`check:ext-links: ${DIST} missing — this gate reads the built artifact, so build first (npm run build).`);
  process.exit(1);
}

const pages = htmlFiles(DIST);
let total = 0, external = 0, qualified = 0;
const fails = [];
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  const route = p.slice(DIST.length + 1).replace(/\/index\.html$/, '/') || '/';
  const { fails: f, checked } = extLinkFindings(html, route);
  total += checked;
  external += [...html.matchAll(ANCHOR)].filter((m) => isExternal(attr(m[1], 'href') ?? '')).length;
  qualified += [...html.matchAll(ANCHOR)].filter((m) => isExternal(attr(m[1], 'href') ?? '') && /opens in a new tab/i.test(accessibleName(m[2], m[1]))).length;
  fails.push(...f);
}

console.log(`check:ext-links — ${pages.length} built page(s), ${external} outbound anchor(s), ${qualified} with the sr-only qualifier, ${total} link(s) held to the rules`);
if (fails.length) {
  for (const f of fails) console.log(`  FAIL ${f.rule}: ${f.detail}`);
  console.log(`\n${fails.length} finding(s). Every outbound link must carry rel=noopener, name its platform once, and put "opens in a new tab" in an sr-only span (S041, D317).`);
  process.exit(1);
}
console.log('  every outbound link: rel carries noopener, the qualifier is sr-only, no platform named twice.');
process.exit(0);
