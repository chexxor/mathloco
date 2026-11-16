#!/usr/bin/env node
// visitor-questions.mjs — does the BUILT artifact answer the questions a visitor actually asks?
//
//   node design/visitor-questions.mjs            # every emitted route + /events.ics as a pseudo-route
//   node design/visitor-questions.mjs --json     # the machine record only
//   node design/visitor-questions.mjs --table    # the per-route status grid only
//
// Round 5 (communication). design/communication-census.mjs asks what a page SPENDS; this asks what it
// GIVES. A page can be word-efficient and still answer nothing, and a page can answer a question on the
// surface nobody asks it from — so the unit that makes that visible is a QUESTION, not a paragraph.
// The seven visitor classes the round-5 brief names (first-time, phone, share-link, calendar-subscriber,
// returning member, search visitor, assistive-tech reader) each ask a small set of things of the artifact,
// and "answered" is a property of the bytes in dist/client, not of the prose in src/.
//
// A fact can be carried in four forms, so the probe matches all four:
//   prose      — a sentence in the page body (design/dist-pages.mjs's zone-aware reading)
//   label/href — a link's words and where it goes: a date, a platform, a file to subscribe to
//   meta       — <title>, <meta name="description">, the og: pair: what a share card says
//  ics-line   — /events.ics read as a pseudo-route, because a calendar subscriber reads the FILE
// An answer only in nav chrome or the exit band is `chrome only`: right for wayfinding (the band IS the
// wayfinding), wrong for a fact — the band is standing cost on all five pages, so a fact parked there is
// stated on surfaces where it cannot be qualified. An answer only on routes outside `where` is
// ANSWERED-ELSEWHERE. Both are placement defects, priced apart from presence defects.
//
// `declinedBy` is the fourth honest state: the page says in its own words that it will not answer
// (D92's class — a promise about a third party is a claim, not a design). A gap the page names is not a
// gap; a gap the page does not know it has is the thing worth finding.
//
// The table is DATA, so a shape that stops matching is a change in what the page says — which is what
// this probe exists to notice. Every gap owes exactly one line in the action plan; this file is the list.
//
// Record lands in design/communication/questions.json (tracked: round 5's prose cites it).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { builtPageFiles, onePage, localDay } from './dist-pages.mjs';
import { distState } from './dist-fresh.mjs';

const ROOT = process.env.DIST || 'dist/client';
const OUT = process.env.OUT || 'design/communication/questions.json';
const argv = process.argv.slice(2);

// The zones that are standing chrome on every page, and the zones a page owns.
const CHROME = new Set(['nav-chrome', 'exit-band']);

// ---------------------------------------------------------------- the visitor classes
// who: the class the round-5 brief names. where: the routes a good answer belongs on — an answer only
// OUTSIDE that set is answered in the wrong place, and an answer only in chrome is answered in the wrong
// form. Shapes are written against strings this build really contains, so they are falsifiable.
const QUESTIONS = [
  { id: 'q01', who: 'first-time', ask: 'What is this, in one line?', where: ['/'], formsIn: ['prose', 'heading'],
    anyOf: [[/minneapolis math club/i], [/we meet around a table/i]] },

  { id: 'q02', who: 'first-time', ask: 'When do we meet?', where: ['/', '/dates'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2}\b/i],
            [/\b\d{1,2}:\d{2}\s*[ap]m\b/i], [/\b(19|20)\d\d-\d\d-\d\d\b/]] },

  { id: 'q03', who: 'first-time', ask: 'Where do we meet?', where: ['/', '/dates'], formsIn: ['prose', 'heading', 'label', 'ics-line'],
    anyOf: [[/\b(boulevard|avenue|street|road)\b/i], [/bakery|brewery|coffee shop/i]] },

  { id: 'q04', who: 'first-time', ask: 'Do I need to bring or prepare anything?', where: ['/', '/join'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/no syllabus|no reading list|nothing to prepare|nobody sets an agenda/i],
            [/bring a question|no background is required/i]] },

  { id: 'q05', who: 'first-time', ask: 'What does it cost — is there a cover charge or a fee?', where: ['/', '/join'],
    anyOf: [[/cover charge|no cover|\bcost\b|\bprice\b|\bticket\b|\bfee\b|free of charge|\$\s?\d/i]],
    // C1 (round-5 read) landed as a decline under D376, 2026-11-16: the operator ruled the gap open rather
    // than stating a price, so `src/content.json` `cost` carries the sentence "Nothing here says what a meeting
    // costs, and no price is printed." — which is an `anyOf` hit AND a refusal, exactly as q13's "phone number"
    // is. Both halves have to be in ONE alt, because the probe's rule is that a sentence which offers and refuses
    // at once is a refusal: counting "no price is printed" as an offer would hide the class this probe exists to
    // find, and would report the site's own refusal as an answer.
    declinedBy: [[/nothing here says what a meeting costs/i, /no (cover charge|price|fee) (is )?(printed|stated|kept|on this page)/i]] },

  { id: 'q06', who: 'first-time', ask: "What is the club's current focus?", where: ['/'], formsIn: ['prose', 'heading'],
    anyOf: [[/the focus is|focus is now|currently (on|about)/i]], declinedBy: [[/no current focus|no syllabus|nobody sets an agenda/i]] },

  { id: 'q07', who: 'first-time', ask: 'Is the room one I can be in — quiet, seated, reachable?', where: ['/', '/join'], formsIn: ['prose', 'heading'],
    anyOf: [[/\b(quiet|loud|noise level|wheelchair|step[- ]free|seating|hearing loop|all ages)\b/i]],
    declinedBy: [[/not something a page can tell you/i]] },

  { id: 'q08', who: 'first-time', ask: 'How do I get in?', where: ['/join', '/'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/sign up|join (the|our)|join on|join the chat/i]] },

  { id: 'q09', who: 'first-time', ask: 'What actually happens at a meeting?', where: ['/join', '/dates', '/'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/^social$/i], [/^study session$/i], [/a social:|study session:|around a table|side by side|work through/i]] },

  { id: 'q10', who: 'first-time', ask: 'Do I have to be a member to come?', where: ['/', '/join'],
    anyOf: [[/without being a member|need to be a member|membership is (free|not required)/i],
            [/anyone can (come|attend|bring)/i]],
    // C2 under D377, same shape as q05's refusal: `src/content.json` `membershipRule` ships "Nothing here says
    // whether you must be a member to come, and no rule is kept." The read's own recommendation was the operator's
    // word — a claim about the club's practice no seat may write — so what a probe can measure today is the refusal,
    // and the verdict that names it (DECLINED) is the one that tells the next session the gap is ruled open rather
    // than unfilled. Nothing here matches `anyOf` alone: the sentence says "must be a member", not "need to be".
    declinedBy: [[/nothing here says whether you must be a member/i, /no (membership )?rule is (kept|stated|printed)/i]] },

  { id: 'q11', who: 'phone', ask: 'Which tap gets me the calendar file?', where: ['/', '/dates'], formsIn: ['label', 'href', 'prose'],
    anyOf: [[/events\.ics/i]] },

  { id: 'q12', who: 'phone', ask: 'Can I ask the club something before a meeting?', where: ['/join'],
    anyOf: [[/ask something before|messages we post there|somebody from the club reads/i]] },

  { id: 'q13', who: 'phone', ask: 'Does the page hand me something to call or tap more than once?', where: ['/join', '/'],
    anyOf: [[/mailto:/i], [/[a-z0-9._+-]+@[a-z0-9-]+\.(com|org|net|io)\b/i], [/\bcall us\b|text us|phone number/i]],
    // The decline ships as A4 (D368) on `/join`. `phone number` is in `anyOf` and in `declinedBy` at once,
    // and that is the file's own rule: a sentence that both offers and refuses is a refusal, not an offer —
    // "no phone number" is the page naming the gap, and counting it as an offer would hide the class.
    declinedBy: [[/no front desk|no phone number|nothing to call|no phone line/i]] },

  { id: 'q14', who: 'share-link', ask: 'Does the page name itself in what a share card carries?', where: ['/', '/dates', '/chat', '/join', '/404'], formsIn: ['meta'],
    anyOf: [[/^matheapolis - a minneapolis math club$/i], [/^dates - matheapolis$/i], [/^chat - matheapolis$/i],
            [/^ways in - matheapolis$/i], [/^page not found - matheapolis$/i]] },

  { id: 'q15', who: 'calendar-subscriber', ask: 'Does the file know my timezone?', where: ['/events.ics'],
    anyOf: [[/x-wr-timezone|america\/chicago/i]] },

  { id: 'q16', who: 'calendar-subscriber', ask: 'Does each entry tell me where to go?', where: ['/events.ics'],
    anyOf: [[/description[^\n]*https?:\/\//i], [/^location/i], [/^geo:/i]] },

  // The shapes above were written before this repo had a mechanism for a finished date. The shipped one (D370,
  // D371): the file retires it with `STATUS:CANCELLED` — RFC 5545's own word — and names where the file starts in
  // every row's `DESCRIPTION`, which is what lets a subscriber tell which of its rows are past. A probe that
  // cannot match the mechanism the site ships reports the gap as open forever, which is the same defect as a gate
  // that cannot go red. Both halves have to match inside ONE carrier, and that carrier is an **unfolded VEVENT**:
  // the sentence lives in a folded `DESCRIPTION`, so no single wire line carries it (D371).
  { id: 'q17', who: 'calendar-subscriber', ask: 'Does the file say which of its dates have already passed?', where: ['/events.ics', '/dates'],
    anyOf: [[/status:(past|complete|expired)/i], [/already (passed|gone|ended|happened)/i], [/starts? in the past|past date/i], [/status:cancelled/i, /the calendar file carries/i]] },

  { id: 'q18', who: 'calendar-subscriber', ask: 'Does anything say how far ahead the file reaches?', where: ['/events.ics', '/dates', '/'],
    anyOf: [[/through (20\d\d|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i], [/window|horizon|unbounded|uncapped|no cap\b/i]] },

  { id: 'q19', who: 'returning', ask: 'What is the club arguing about now?', where: ['/chat', '/'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/threads|pulling on|argu|summar/i]] },

  { id: 'q20', who: 'returning', ask: 'What happened at a meeting I missed?', where: ['/chat', '/'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/summaries from the chat|what happened|recap|minutes of/i]] },

  { id: 'q21', who: 'returning', ask: 'Am I told when a date moves?', where: ['/dates', '/'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/it changes when the club changes a date|when a date changes|subscribe/i]] },

  { id: 'q22', who: 'search-visitor', ask: 'The link I followed is dead — what happened?', where: ['/404'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/could not find|page not found|no longer|moved|typo/i]] },

  { id: 'q23', who: 'search-visitor', ask: 'Is there anything here I am not being shown?', where: ['/404', '/'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/everything we have sits behind/i]] },

  // `where` gained `/past` in the same commit that emitted it (D374, round-5 read Batch D half 2): the
  // route a good answer belongs on moved because the site grew the page that holds it. A question whose
  // answer sits on a route `where` does not name is ANSWERED-ELSEWHERE, so leaving `/past` out would have
  // reported the shipped archive as an open gap forever — the same reason q17 and q18 were rewritten
  // against the mechanism the site ships (D371), rather than against a string the probe remembered.
  { id: 'q24', who: 'search-visitor', ask: 'Can I look for a specific past meetup?', where: ['/dates', '/404', '/chat', '/past'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/\bsearch\b|look up|past (meetings?|dates?|sessions?)/i], [/archive/i]] },

  { id: 'q25', who: 'any-visitor', ask: 'How do I get to the venue?', where: ['/', '/dates'],
    anyOf: [[/directions|transit|light rail|\bbus\b|parking|get there/i],
            [/maps\.google|google\.com\/maps|mapbox|openstreetmap|\/maps\?|map=/i]] },

  { id: 'q26', who: 'assistive-tech', ask: "Does the page's drawing carry a name for a reader?", where: ['/'], formsIn: ['mark-tag'],
    anyOf: [[/aria-label|alt="/i]] },

  { id: 'q27', who: 'assistive-tech', ask: 'Does the page explain its own section names?', where: ['/chat', '/join', '/dates', '/'], formsIn: ['prose', 'heading', 'label'],
    anyOf: [[/what we take up|what the club is pulling on|ways in\b|what we do\b/i],
            [/dropped mid-sentence|threads that are open/i]] },

  { id: 'q28', who: 'assistive-tech', ask: 'What does the mark the wordmark carries mean?', where: ['/', '/dates', '/chat', '/join', '/404'],
    anyOf: [[/∑ (is|means)|the mark means|wordmark means|sigma\b|an equator and a pole/i]] },

  { id: 'q29', who: 'assistive-tech', ask: 'Does a link that leaves the site say so?', where: ['/', '/dates', '/chat', '/join', '/404'], formsIn: ['label'],
    anyOf: [[/opens in a new tab/i]] },
];

// ---------------------------------------------------------------- the carriers
function decodeLite(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/gu, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ').trim();
}

function carriersOf(page) {
  const out = [];
  for (const s of page.sentences) {
    if (s.heading) continue;
    out.push({ form: 'prose', zone: s.zone, section: s.section, text: s.text });
  }
  for (const h of page.headings) out.push({ form: 'heading', zone: 'body', section: h.text, text: h.text });
  for (const a of page.anchors) {
    if (a.label) out.push({ form: 'label', zone: a.zone, section: a.section, text: a.label });
    if (a.href) out.push({ form: 'href', zone: a.zone, section: a.section, text: a.href });
  }
  const head = /<head[\s\S]*?<\/head>/i.exec(page.raw)?.[0] ?? '';
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  if (title) out.push({ form: 'meta', zone: 'head', section: 'title', text: decodeLite(title) });
  for (const m of head.matchAll(/<meta\b([^>]*)>/gi)) {
    const name = /(?:name|property)="([^"]*)"/.exec(m[1])?.[1] ?? '';
    const content = /content="([^"]*)"/.exec(m[1])?.[1] ?? '';
    if (name && content) out.push({ form: 'meta', zone: 'head', section: name, text: decodeLite(content) });
  }
  for (const m of page.raw.matchAll(/<[a-z][a-z0-9]*\b[^>]*data-mark[^>]*>/gi)) {
    out.push({ form: 'mark-tag', zone: 'body', section: '(mark)', text: m[0] });
  }
  for (const m of page.raw.matchAll(/<span[^>]*aria-hidden="true"[^>]*>([^<]*)<\/span>/gi)) {
    if (m[1] && m[1].trim()) out.push({ form: 'hidden-glyph', zone: 'body', section: '(hidden)', text: `${m[1].trim()} [aria-hidden]` });
  }
  return out;
}

/**
 * Carriers for the calendar file itself: every wire line (a label a subscriber reads, `LOCATION:…`), plus one
 * carrier per **unfolded** `VEVENT`. The block carrier exists because RFC 5545 folds long values onto continuation
 * lines, so a sentence inside a `DESCRIPTION` is split across three or four wire lines — a line-level scan cannot
 * see the sentence the file writes, and the questions that ask about the file (q03, q17, q18, q21) are exactly the
 * ones that need it (D371).
 */
const icsCarriers = (raw) => {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
    .map((l) => ({ form: 'ics-line', zone: 'feed', section: l.split(':')[0], text: l }));
  const events = raw.replace(/\r\n[ \t]/g, '').match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  return [...lines, ...events.map((b) => ({ form: 'ics-event', zone: 'feed', section: 'VEVENT', text: b }))];
};

const ST = distState();
const pages = builtPageFiles(ROOT).map((p) => onePage(p.file, p.route));
pages.push({ route: '/events.ics', raw: readFileSync(`${ROOT}/events.ics`, 'utf8'), text: '', headings: [], anchors: [], sentences: [], zones: [] });
for (const p of pages) {
  p.carriers = p.route === '/events.ics' ? icsCarriers(p.raw) : carriersOf(p);
}
if (pages.length < 2) throw new Error(`no built pages under ${ROOT} — run npm run build first`);

const ROUTES = pages.map((p) => p.route);

// ---------------------------------------------------------------- the verdicts
function match(carriers, alt) {
  const hits = [];
  for (const c of carriers) if (alt.every((re) => re.test(c.text))) hits.push(c);
  return hits;
}

// A question is answered IN a form, not merely near a string: `social` inside an og:image file name is not
// a page saying what a meeting is, and a venue named only in a share card is not a page naming a room. So a
// question may name the forms its answer is allowed to come from (`formsIn`), and the forms it answered from
// are printed either way.
function matchIn(carriers, alt, allowed) {
  if (!allowed.size) return match(carriers, alt);
  return match(carriers.filter((c) => allowed.has(c.form)), alt);
}

function judge(q) {
  const allowed = new Set(q.formsIn ?? []);
  const answers = [];
  for (const p of pages) for (const alt of q.anyOf) {
    for (const c of matchIn(p.carriers, alt, allowed)) answers.push({ route: p.route, form: c.form, zone: c.zone, section: c.section, text: c.text, shape: q.anyOf.indexOf(alt) });
  }
  const declined = [];
  for (const alt of q.declinedBy ?? []) for (const p of pages) for (const c of match(p.carriers, alt)) {
    declined.push({ route: p.route, form: c.form, zone: c.zone, section: c.section, text: c.text });
  }
  // A sentence that both answers and declines is a DECLINE, not an answer: "there is no current focus" is the
  // page naming the question it will not answer, and counting it as an answer would hide the class of gap this
  // probe exists to find.
  const declinedHere = new Set(declined.map((d) => `${d.route}|${d.text}`));
  const kept = answers.filter((a) => !declinedHere.has(`${a.route}|${a.text}`));
  const perRoute = {};
  for (const r of ROUTES) {
    const mine = kept.filter((a) => a.route === r);
    if (!mine.length) { perRoute[r] = { status: 'unanswered', forms: [], zones: [] }; continue; }
    const substantive = mine.filter((a) => !CHROME.has(a.zone));
    const use = substantive.length ? substantive : mine;
    perRoute[r] = {
      status: substantive.length ? 'answered' : 'chrome only',
      forms: [...new Set(use.map((a) => a.form))],
      zones: [...new Set(use.map((a) => a.zone))],
    };
  }
  const inPlace = q.where.filter((r) => perRoute[r].status === 'answered');
  const chromeOnly = q.where.filter((r) => perRoute[r].status === 'chrome only');
  const outside = kept.filter((a) => !q.where.includes(a.route));
  let verdict = 'UNANSWERED';
  if (inPlace.length) verdict = 'ANSWERED';
  else if (declined.length) verdict = 'DECLINED';
  else if (chromeOnly.length) verdict = 'ANSWERED-IN-CHROME';
  else if (outside.length) verdict = 'ANSWERED-ELSEWHERE';
  return {
    id: q.id, who: q.who, ask: q.ask, where: q.where, verdict, perRoute,
    answeredOn: [...new Set(kept.map((a) => a.route))],
    forms: [...new Set(kept.map((a) => `${a.form}/${a.zone}`))],
    outsideRoutes: [...new Set(outside.map((a) => a.route))],
    outsideCount: outside.length,
    evidence: kept.slice(0, 10),
    declinedEvidence: declined.slice(0, 4),
  };
}

const results = QUESTIONS.map(judge);
const gaps = results.filter((r) => r.verdict !== 'ANSWERED');

// The share card, counted rather than remembered: how many distinct descriptions do the built pages carry?
const cardPerRoute = {};
for (const p of pages) for (const c of p.carriers) if (c.form === 'meta' && c.section === 'og:description') cardPerRoute[p.route] = c.text;
const metaDistinct = new Set(Object.values(cardPerRoute)).size;

const report = {
  measuredAt: localDay(),
  instrument: 'design/visitor-questions.mjs',
  artifact: ROOT,
  artifactBuilt: ST.present ? new Date(ST.built.mtimeMs).toISOString() : null,
  artifactFresh: ST.fresh,
  routes: ROUTES,
  visitorClasses: [...new Set(QUESTIONS.map((q) => q.who))],
  shareCard: { distinct: metaDistinct, routes: Object.keys(cardPerRoute), text: cardPerRoute[Object.keys(cardPerRoute)[0]] ?? null },
  questions: results,
  gaps: gaps.map((g) => ({ id: g.id, who: g.who, ask: g.ask, verdict: g.verdict, where: g.where, answeredOn: g.answeredOn })),
  counts: {
    questions: results.length,
    ANSWERED: results.filter((r) => r.verdict === 'ANSWERED').length,
    DECLINED: results.filter((r) => r.verdict === 'DECLINED').length,
    'ANSWERED-IN-CHROME': results.filter((r) => r.verdict === 'ANSWERED-IN-CHROME').length,
    'ANSWERED-ELSEWHERE': results.filter((r) => r.verdict === 'ANSWERED-ELSEWHERE').length,
    UNANSWERED: results.filter((r) => r.verdict === 'UNANSWERED').length,
  },
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 1)}\n`);

// ---------------------------------------------------------------- printed
console.log(`visitor questions — ${ROOT} (built ${report.artifactBuilt}, ${report.artifactFresh ? 'fresh' : 'STALE'}), measured ${report.measuredAt}`);
console.log(`${report.counts.questions} questions across ${report.visitorClasses.length} visitor classes · ${report.routes.length} surfaces: ${report.counts.ANSWERED} answered where asked · ${report.counts['ANSWERED-IN-CHROME']} only in chrome · ${report.counts['ANSWERED-ELSEWHERE']} only off-page · ${report.counts.DECLINED} declined in the open · ${report.counts.UNANSWERED} unanswered`);
console.log(`share card: ${metaDistinct} distinct og:description across ${Object.keys(cardPerRoute).length} built routes\n`);

if (!argv.includes('--json')) {
  for (const r of results) {
    console.log(`${r.id} ${r.who}: ${r.ask}`);
    console.log(`  belongs on ${r.where.join(' ')} — verdict ${r.verdict}`);
    for (const route of ROUTES) {
      const s = r.perRoute[route];
      let label = 'not asked';
      if (s.status === 'answered') label = 'ANSWERED';
      else if (s.status === 'chrome only') label = 'chrome only';
      else if (r.where.includes(route)) label = 'NO';
      console.log(`    ${route.padEnd(12)} ${label}${s.forms.length ? ` (${s.forms.join(', ')}${s.zones.some((z) => z !== 'body') ? ` in ${s.zones.join(', ')}` : ''})` : ''}`);
    }
    if (r.evidence.length) console.log(`  first evidence   ${r.evidence[0].route} [${r.evidence[0].zone}/${r.evidence[0].form}] ${r.evidence[0].text.slice(0, 110)}`);
    if (r.declinedEvidence.length) console.log(`  declined by      ${r.declinedEvidence[0].route} [${r.declinedEvidence[0].zone}/${r.declinedEvidence[0].form}] ${r.declinedEvidence[0].text.slice(0, 110)}`);
    if (r.outsideRoutes.length) console.log(`  also stated on   ${r.outsideRoutes.join(' ')} (${r.outsideCount} carriers) — outside where it belongs`);
    console.log('');
  }
}

console.log(`gaps (${report.gaps.length}) — each owes exactly one line in the action plan:`);
for (const g of report.gaps) console.log(`  ${g.id} ${g.who}: ${g.ask} — ${g.verdict}; answered on ${g.answeredOn.join(' ') || 'nowhere'}; belongs on ${g.where.join(' ')}`);
console.log(`\nrecord written to ${OUT}`);

if (argv.includes('--json')) console.log(JSON.stringify(report, null, 1));
