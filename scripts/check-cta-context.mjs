#!/usr/bin/env node
// check:cta-context - every call to action on every built page sits inside a declared block that names where it
// leads and what the visitor does there.
//
//   npm run check:cta-context            # over the built dist/client
//   npm run check:cta-context:selftest   # plant each defect in a fixture page, require each to FAIL (D118)
//
// WHY THIS GATE EXISTS (MS41, S090, D467). The operator's letter of 2026-11-20 pointed at one control: "/chat has a
// 'Join the chat' button at the top as the first item under the heading. It doesn't make sense to have a user
// call-to-action without context around it like that." `docs/research/discord-invite-ux-2026-11-20.md` measured the
// artifact and found the defect was not one bad button: of **43 actions on 6 built pages** (@measured 2026-11-21 by
// `node design/cta-inventory.mjs`, Linux native, Node 24.22.1, no browser), **43 carried no declared context at
// all**, and the naive instrument - count the words near the link - fails **none** of them, because a page whose
// nav, lede and exit band all name Discord, Meetup and "dates" flatters every control standing on it. Proximity
// cannot be the rule. A **declared block** can: the page marks the element whose words make the action readable
// (`data-cta-block="id"`), the control names its destination (`data-cta="id"`), and this gate reads both off the
// built bytes and checks the words.
//
// WHAT IT FAILS. One finding per action, in the order of `contextVerdict` (an action that never declared itself
// gets one finding, not four):
//   FAIL action-undeclared        an action with no `data-cta`, so no element on the page claims to be its context
//   FAIL cta-unknown-id           `data-cta` names a destination `src/lib/links.mjs` has no row for
//   FAIL cta-href-mismatch        the printed href is not the destination the id claims (a "Discord" control that
//                                 points at a Meetup date is a defect no word check can see)
//   FAIL block-missing            nothing around the action declares `data-cta-block` for its id
//   FAIL block-id-mismatch        the action sits in a block declared for a different destination
//   FAIL block-thin               the block holds under `CTA_BLOCK_MIN_WORDS` words besides the label
//   FAIL block-too-wide           the block is most of the page: context that swallows the page is the proximity
//                                 window's laundering re-enacted on purpose
//   FAIL block-names-no-destination  neither the block nor the label says where the action leads
//   FAIL block-names-no-ask          neither says what the visitor does there
//   FAIL block-hides-what-it-asks    a standing exit whose block never names the thing it enrols you in (an invite
//                                 adds a user to a guild - Discord's own word for what the click does)
//   FAIL cta-platform-unmapped    a platform the resolver knows, or a `/join` row it returns, with no registry id:
//                                 the day the club adds a channel, the gate asks for a row instead of shipping a
//                                 control nothing can name
//   FAIL exemption-stale          an `EXEMPTIONS` entry that matched no anchor on the artifact (round 7's F6: a
//                                 vacuous exclusion reads as a green light for a whole round)
//
// WHAT IT DOES NOT DO. It does not write or grade copy - it does not say whether a sentence is good, only whether
// one exists that names the destination and the ask. It does not decide which anchors are actions: that vocabulary
// (`ACTION_LABEL`, `EXEMPTIONS`) lives in `design/cta-rules.mjs`, shared byte for byte with the probe that prices
// the rule (`design/cta-inventory.mjs`), so a review letter and a red gate cannot quote different numbers (D264).
// It does not touch the network, and it does not read `.notes/` (no clone mode needed).
//
// Cost @measured 2026-11-21 by this step (Linux native, Node 24.22.1, 6 built pages): see the `gate-run.mjs` entry.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { builtPageFiles } from '../design/dist-pages.mjs';
import { EXEMPTIONS, contextVerdict, pageActions } from '../design/cta-rules.mjs';
import { CALL_TO_ACTION, CTA_BLOCK_MAX_FRACTION, CTA_BLOCK_MIN_WORDS, ctaIdFor } from '../src/lib/links.mjs';
import { PLATFORMS, joinChannels } from '../src/lib/rsvp.mjs';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const argOne = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i < 0 ? dflt : args[i + 1];
};
const DIST = resolve(argOne('--dist', 'dist/client'));
const CONFIG = resolve(argOne('--config', 'src/config.json'));

/** `src/config.json`, read defensively: this gate's job is to name a finding, not to stack-trace on a malformed or
 *  missing config file (the guard every read of an input path owes - `.agents/skills/add-a-gate`). */
function readUrls() {
  try {
    return { urls: JSON.parse(readFileSync(CONFIG, 'utf8')).URLs ?? {}, ok: true };
  } catch (e) {
    return { urls: {}, ok: false, why: String(e?.message ?? e) };
  }
}

/** One page's anchors -> findings. Pure over the anchor records `pageActions` returns, so the selftest plants a
 *  fixture page instead of mutating the tree (D118: the gate must be seen to fail on the branch that adds the
 *  defect, and a planting that edits `src/` would be reverted by the next build and prove nothing). */
export function ctaFindings(anchors, route = 'page') {
  const fails = [];
  for (const a of anchors) {
    // An action, or a control that declared an id without the rule calling it an action: declaring an id is a claim
    // about the destination, so the claim gets held to the registry whether or not the label opens with a verb.
    if (!a.isAction && !a.declaredId) continue;
    const v = contextVerdict(a);
    if (!v.ok) fails.push({ rule: v.rule, detail: `${route} ${a.kind} "${a.label}" -> ${a.href}: ${v.detail}` });
  }
  return fails;
}

/** An exclusion that matches nothing on the artifact is not an exclusion, it is a blind spot with a comment on it.
 *  Takes the FLAT list of every anchor the run scanned (each already carries `exempt`), so there is one shape to
 *  pass and one way to get it wrong. Round 7's F6 was an exemption whose needle matched no defect, and it read as a
 *  green light for a whole round. */
export function staleExemptionFindings(anchors) {
  const seen = new Set();
  for (const a of anchors) if (a.exempt) seen.add(a.exempt);
  return EXEMPTIONS.filter((e) => !seen.has(e.id)).map((e) => ({
    rule: 'exemption-stale',
    detail: `EXEMPTIONS entry "${e.id}" - "${e.reason}" - matched no anchor on any page scanned. Either the thing it exempts has left the site (delete the entry, and the rule gets narrower and honest) or the test no longer finds it (fix the test) - a vacuous exemption is how a defect walks past a green gate.`,
  }));
}

/** The resolver's platform list and the registry must be the same set of destinations. Pure over the inputs, so the
 *  selftest can plant a platform nobody wrote a row for without editing `src/lib/rsvp.mjs`. */
export function mappingFindings({ platforms, rows, registry = CALL_TO_ACTION }) {
  const fails = [];
  for (const platform of platforms) {
    const id = ctaIdFor(platform);
    if (!id || !registry[id]) {
      fails.push({
        rule: 'cta-platform-unmapped',
        detail: `the resolver knows the platform "${platform}" but ctaIdFor() resolves it to ${JSON.stringify(id ?? null)}, which is not a row in CALL_TO_ACTION (src/lib/links.mjs): a control that leaves for it cannot be named, its href cannot be checked, and its off-site disclosure has nothing to come from. Add a sourced row (where, names, asks, and the noun if it enrols the visitor in a standing thing) before painting the link.`,
      });
    }
  }
  for (const row of rows) {
    if (!row.cta || !registry[row.cta]) {
      fails.push({
        rule: 'cta-platform-unmapped',
        detail: `joinChannels() returns a ${row.kind}/${row.platform} row whose \`cta\` is ${JSON.stringify(row.cta ?? null)} - a /join row with no registry id has no block vocabulary, so \`check:cta-context\` cannot say whether the page tells the reader what that way in is.`,
      });
    }
  }
  return fails;
}

// ------------------------------------------------------------------ selftest

if (selftest) {
  const FIX = resolve('.design', 'tmp-cta-context');
  rmSync(FIX, { recursive: true, force: true });
  mkdirSync(FIX, { recursive: true });

  // A fixture page, not a fragment: `pageActions` resolves zones (nav chrome, exit band) and the page's own word
  // count, both of which the rules read. The filler paragraph is what lets a legitimate block stay under
  // `CTA_BLOCK_MAX_FRACTION`; pass `filler: ''` to plant a block that swallows the page.
  const shell = (inner, filler = DEFAULT_FILLER) =>
    `<!doctype html><html lang="en"><head><title>Planted page</title></head><body>` +
    `<nav><a href="/">Matheapolis</a><a href="/dates">Dates</a><a href="/join">Join</a><a href="/chat">Chat</a></nav>` +
    `<main><h1>A page the build emits</h1>${filler}${inner}</main>` +
    `<footer><a href="/" aria-label="Matheapolis, home">Matheapolis</a><a href="/dates">Dates</a></footer>` +
    `</body></html>`;
  // The same page for the exemption cases: the band is a `<footer>`, and a band link pasted inside `<main>` sits in
  // the page's body, not in the band's zone - which is why the control that must clear `band-identity` carries a
  // real `<footer>` and the planting deletes it.
  const shellBand = (inner, { band = true } = {}) =>
    `<!doctype html><html lang="en"><head><title>Planted page</title></head><body>` +
    `<nav><a href="/">Matheapolis</a><a href="/dates">Dates</a></nav>` +
    `<main><h1>A page the build emits</h1>${DEFAULT_FILLER}${inner}</main>` +
    (band ? `<footer><a href="/" aria-label="Matheapolis, home">Matheapolis</a></footer>` : '') +
    `</body></html>`;
  const DEFAULT_FILLER =
    '<p>The club meets twice a month in Minneapolis at a table with coffee, and this paragraph exists so the page ' +
    'holds words of its own beside the block the fixture is testing: dates, study sessions, and a channel that ' +
    'runs between them.</p>';
  const DISCORD = 'https://discord.com/invite/wx5S7YJSkU';
  const GROUP = 'https://www.meetup.com/minneapolis-mathematics-book-club';
  const ext = (id, href, label) =>
    `<a href="${href}"${id ? ` data-cta="${id}"` : ''} target="_blank" rel="noopener noreferrer">${label}<span class="sr-only">, opens in a new tab</span><span aria-hidden="true">&#8594;</span></a>`;

  const cases = [
    {
      name: 'clean control: an action inside a block that names it',
      html: shell(`<p data-cta-block="discord-server">Before you come, ask us anything in the club\u2019s own Discord server. ${ext('discord-server', DISCORD, 'Join the server')}</p>`),
      want: [],
    },
    { name: 'an action that never declared itself', html: shell(ext(null, DISCORD, 'Join the Discord server')), want: ['action-undeclared'] },
    { name: 'an id the registry has no row for', html: shell(`<p data-cta-block="discord-server">The club keeps its own server, and the invite adds you to it. ${ext('telegram-channel', 'https://t.me/matheapolis', 'Join on Telegram')}</p>`), want: ['cta-unknown-id'] },
    { name: 'the id says Discord, the href says Meetup', html: shell(`<p data-cta-block="discord-server">The club keeps its own Discord server, and the invite adds you to it. ${ext('discord-server', GROUP, 'Join the server')}</p>`), want: ['cta-href-mismatch'] },
    { name: 'the right control with no block around it', html: shell(ext('discord-server', DISCORD, 'Join the Discord server')), want: ['block-missing'] },
    {
      name: 'a block declared for a different destination',
      html: shell(`<div data-cta-block="meetup-group">Where the club announces dates, and keeps the RSVP list, beside the invite that is not it. ${ext('discord-server', DISCORD, 'Join the Discord server')}</div>`),
      want: ['block-id-mismatch'],
    },
    {
      name: 'a block that is the label with air around it',
      html: shell(`<p data-cta-block="discord-server">Ask there. <a href="${DISCORD}" data-cta="discord-server">Join the Discord server</a></p>`),
      want: ['block-thin'],
    },
    {
      name: 'a block that swallows the page',
      html: shell(
        `<section data-cta-block="discord-server">The club keeps its own Discord server, and the invite adds you to it, and this section goes on describing the meeting format, the coffee, the study sessions, the dates, the chat archive, and everything else the page was ever going to say. ${ext('discord-server', DISCORD, 'Join the server')}</section>`,
        '',
      ),
      want: ['block-too-wide'],
    },
    {
      name: 'context that never says where the link leads',
      html: shell(`<p>Sign up and the club will tell you the next date, which is useful and true and never names the platform. ${ext('meetup-group', GROUP, 'Sign up')}</p>`.replace('<p>', '<p data-cta-block="meetup-group">')),
      want: ['block-names-no-destination'],
    },
    {
      name: 'context that names the place but never the ask',
      html: shell(`<p data-cta-block="discord-server">Our Discord server is busy on weeknights and quiet on Sundays. ${ext('discord-server', DISCORD, 'Discord')}</p>`),
      want: ['block-names-no-ask'],
    },
    {
      name: 'an invite that hides that it enrolls you in a server',
      html: shell(`<p data-cta-block="discord-server">Join the club on Discord and read what people said this week. ${ext('discord-server', DISCORD, 'Join the chat')}</p>`),
      want: ['block-hides-what-it-asks'],
    },
  ];

  let bad = 0;
  for (const c of cases) {
    const file = resolve(FIX, `${c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`);
    writeFileSync(file, c.html);
    const { anchors } = pageActions({ route: '/planted', file }, { keepAll: true });
    const got = ctaFindings(anchors, '/planted').map((f) => f.rule);
    const miss = c.want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => !c.want.includes(g));
    const ok = !miss.length && !extra.length;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   caught' : 'FAIL missed'}  ${c.name.padEnd(52)} ${got.join(',') || 'nothing'}${miss.length ? ` \u2014 missing: ${miss.join(',')}` : ''}${extra.length ? ` \u2014 unexpected: ${extra.join(',')}` : ''}`);
  }

  // Exemption staleness, both directions. Every fixture above carries a header nav AND a band identity link, so
  // neither exclusion is vacuous there; the planted page below deletes its `<footer>`, which makes `band-identity`
  // match nothing and must name it, and the control keeps both and must stay silent. (Round 7's F6: an exemption
  // whose needle matched no defect read as a green light for a whole round.)
  const noBand = (() => {
    const file = resolve(FIX, 'exemption-nav-only.html');
    writeFileSync(file, shellBand('<p>Nothing beside the header nav here, and a sentence of prose to keep the page honest about its own length.</p>', { band: false }));
    return pageActions({ route: '/planted', file }, { keepAll: true }).anchors;
  })();
  const withBand = (() => {
    const file = resolve(FIX, 'exemption-control.html');
    writeFileSync(file, shellBand(`<p>The band at the foot of the page carries the club name as its own link home. ${ext('discord-server', DISCORD, 'Join the server')}</p>`));
    return pageActions({ route: '/planted', file }, { keepAll: true }).anchors;
  })();
  const named = (f) => `${f.rule}(${f.detail.match(/EXEMPTIONS entry "([^"]+)"/)?.[1] ?? '?'})`;
  const stalePlanted = staleExemptionFindings(noBand).map(named);
  const staleClean = staleExemptionFindings(withBand).map((f) => f.rule);
  const staleOk = stalePlanted.length === 1 && stalePlanted[0].includes('band-identity') && staleClean.length === 0;
  if (!staleOk) bad++;
  console.log(`${staleOk ? 'ok   caught' : 'FAIL missed'}  ${'an exemption that matches nothing'.padEnd(52)} ${stalePlanted.join(',') || 'nothing'}${staleClean.length ? ` \u2014 unexpected on the control: ${staleClean.join(',')}` : ''}`);

  // The resolver/registry mapping: planted platform with no row, and a /join row with no id; then the clean control,
  // which is the real pair, so a green selftest also says the shipped set still maps.
  const { urls } = readUrls();
  const mapPlanted = mappingFindings({
    platforms: [...Object.values(PLATFORMS), 'Telegram'],
    rows: [{ kind: 'chat', platform: 'Telegram', href: 'https://t.me/matheapolis', cta: null }],
  }).map((f) => f.rule);
  const mapClean = mappingFindings({ platforms: Object.values(PLATFORMS), rows: joinChannels(urls) }).map((f) => f.rule);
  const mapOk = mapPlanted.length === 2 && mapPlanted.every((r) => r === 'cta-platform-unmapped') && mapClean.length === 0;
  if (!mapOk) bad++;
  console.log(`${mapOk ? 'ok   caught' : 'FAIL missed'}  ${'a platform or join row with no registry id'.padEnd(52)} ${mapPlanted.join(',') || 'nothing'}${mapClean.length ? ` \u2014 unexpected on the shipped set: ${mapClean.join(',')}` : ''}`);

  // The ceiling itself, asserted where it is defined: a block may not be most of the page, and the fraction in
  // `src/lib/links.mjs` is the one this gate and the probe both read.
  const fracOk = CTA_BLOCK_MAX_FRACTION > 0 && CTA_BLOCK_MAX_FRACTION < 1;
  if (!fracOk) bad++;
  console.log(`${fracOk ? 'ok   guard' : 'FAIL guard'}  CTA_BLOCK_MAX_FRACTION is a fraction (${CTA_BLOCK_MAX_FRACTION}) - a block over it is the page, not the context`);

  rmSync(FIX, { recursive: true, force: true });
  console.log(`\ncheck:cta-context selftest \u2014 ${cases.length + 3} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ the real run

if (!existsSync(DIST)) {
  console.error(`check:cta-context: ${DIST} missing \u2014 this gate reads the built artifact, so build first (npm run build).`);
  process.exit(1);
}
const pages = builtPageFiles(DIST);
if (!pages.length) {
  console.error(`check:cta-context: no built page under ${DIST} \u2014 a gate that reads nothing is not a green gate.`);
  process.exit(1);
}

const fails = [];
const scanned = [];
let marked = 0;
let acts = 0;
const kinds = {};
const blocks = new Set();
for (const p of pages) {
  const { anchors } = pageActions(p, { keepAll: true });
  scanned.push(...anchors);
  for (const a of anchors) {
    if (!a.isAction && !a.declaredId) continue;
    marked++;
    if (a.isAction) acts++;
    kinds[a.kind] = (kinds[a.kind] ?? 0) + 1;
    for (const b of a.blocks) blocks.add(`${p.route}\u0000${b.from}`);
  }
  fails.push(...ctaFindings(anchors, p.route));
}

fails.push(...staleExemptionFindings(scanned));

const read = readUrls();
if (read.ok) {
  fails.push(...mappingFindings({ platforms: Object.values(PLATFORMS), rows: joinChannels(read.urls) }));
} else {
  console.log(`NOTE  ${CONFIG} is unreadable (${read.why}), so the resolver/registry mapping check ran against no channel list.`);
}

// The census the reader of DESIGN.md quotes, printed in the same nouns the probe prints (D264): a "marked link" is
// an anchor the gate holds to the rule, and it is bigger than an "action" because a page may declare context for a
// plain descriptive link. `design/cta-inventory.mjs` collapsed those two nouns into "45 actions" on 2026-11-21 and
// a milestone row repeated it; the two instruments now say the same sentence.
console.log(
  `check:cta-context \u2014 ${pages.length} built page(s), ${marked} marked link(s) = ${acts} action(s) + ${marked - acts} declared link(s) the classifier does not call an action, ${JSON.stringify(kinds)}, ` +
    `${blocks.size} declared block(s); each block held to a ${CTA_BLOCK_MIN_WORDS}-word floor and a ${Math.round(CTA_BLOCK_MAX_FRACTION * 100)}%-of-page ceiling`,
);
if (fails.length) {
  for (const f of fails) console.log(`  FAIL ${f.rule}: ${f.detail}`);
  console.log(
    `\n${fails.length} finding(s). Every call to action names its destination (\`data-cta\`, a row in ` +
      'CALL_TO_ACTION in src/lib/links.mjs), sits in an element declaring `data-cta-block` for that id, and that ' +
      'element says in words where the action leads and what the visitor does there (S090, D467, MS41).',
  );
  process.exit(1);
}
console.log('  every action on every built page is in a block that names its destination, its ask, and what it enrols you in.');
process.exit(0);
