/**
 * event-description.mjs — what the club says about a meeting in its own calendar file.
 *
 * Why the published DESCRIPTION is authored here instead of quoted from the organizer (D319, 2026-11-14).
 * Every social row in `data/events.json` carries the same upstream text @measured 2026-11-14 by
 * `node -e "const d=require('./data/events.json'); console.log(d.events.map(e=>e.blurb.slice(0,70)))"`:
 * "We are interested in discussing algorithms of most any kind… Ideally, attendees would post a comment
 * before the date of the event with a topic they can discuss… If no topics are posted, then we can generate
 * topics". Two of those claims are no longer true of the club: the focus was emptied on the operator's word
 * on 2026-11-03 (`src/content.json`, `focus._rule`: "We no longer have that focus. We have no current focus
 * at all right now"), and the site's own copy says there is no syllabus and nobody sets an agenda
 * (`src/components/HeroSection.astro`). Publishing the old text verbatim is D150's rule — "the publisher
 * normalizes; it does not proxy" — failing in the direction that costs a subscriber a wrong expectation of a
 * meeting they are about to walk into.
 *
 * The rule the copy obeys, from the 2026-11-14 read (§7 D2): **two sentences, then the window clause, then the
 * chat link.** The window clause (round-5 read B2, q18, D371) is not authored here at all — it is generated from
 * the file's own `DTSTART`s by `windowSentence` — because a date written into a sentence is a claim that expires
 * with the next harvest, which is the half of "the publisher normalizes" that no prose rule can enforce.
 *
 * Every
 * sentence is taken from copy this repo already carries a source for (the hero lede, `src/config.json`'s
 * `seo.description`, the organizer's own DESCRIPTION for the study series). No cadence word appears in any
 * template, because a cadence word needs a source that names it (D92, D301) and a calendar file is the
 * club's own claim rather than a quotation.
 *
 * `scripts/check-ics.mjs` compares every published DESCRIPTION against `feedDescription`, so the feed cannot
 * drift back to upstream boilerplate while the gate is green.
 *
 * Node/Vite only: no `node:` built-ins, so `scripts/check-ics.mjs` imports it the same way a page does. The
 * `with { type: 'json' }` attribute on the config import is what lets a plain `node script.mjs` read the same
 * file Astro reads — plain JSON ESM imports need the attribute, and `src/lib/events.mjs`'s header records the
 * same trap.
 */
import config from '../config.json' with { type: 'json' };
import { meetingKind } from './event-groups.mjs';
import { plainDate } from './event-window.mjs';

/** The one line every published description ends with: where the club actually talks. */
const CHAT_LINE = `The club’s chat is where the conversation happens: ${config.URLs.discordInvite}`;

/**
 * Two sentences per meeting type. `_source` is not decoration: D92's rule is that a claim needs a named
 * source, and a calendar file is read by people deciding whether to walk into a room.
 */
export const DESCRIPTIONS = {
  social: {
    sentences: [
      'Around a table in a coffee shop or a bakery in Minneapolis, working through something together — a paper, a proof, a proof assistant, a puzzle with a strange answer.',
      'There is no syllabus, no reading to keep up with and nobody sets an agenda: people bring what they are curious about.',
    ],
    _source: 'src/config.json seo.description (D273) and the hero lede in src/components/HeroSection.astro; the operator emptied the club’s focus on 2026-11-03 (src/content.json, focus._rule).',
  },
  study: {
    sentences: [
      'Work on your own mathematics while the table works on its own — a textbook, a problem set, a project you are carrying.',
      'Bring your books or notes and your curiosity; the point of the room is to help each other keep going.',
    ],
    _source: "the organizer’s own DESCRIPTION for the study series (‘study independently, side by side… We are each on our own path but let’s help each other to continue our studies and learning’), retold in the site’s voice rather than quoted verbatim.",
  },
  general: {
    sentences: [
      'A Minneapolis math club meeting around a table somewhere in the Twin Cities.',
      'The date and the place come from the club’s own calendar; the conversation runs in its chat.',
    ],
    _source: 'src/config.json seo.description and src/content.json venues (operator, 2026-11-03).',
  },
};

/**
 * Which template a row uses, decided from the kind `event-groups.mjs` already derives — one classifier, so the
 * grouping and the copy can never disagree about what a row is.
 * Deliberately coarse: a series the repo has not named falls to `general`, whose sentences are the ones true
 * of any meeting the club posts, so an unrecognised row never gets copy the site cannot back up.
 */
export const descriptionKind = (row) => {
  const kind = meetingKind(row);
  return DESCRIPTIONS[kind] ? kind : 'general';
};

/**
 * The one sentence that names the window the published file carries — `Nov 7, 2026` … `Dec 19, 2026`.
 *
 * Generated, never written: it is computed from the `DTSTART`s the same build puts in the file, so the sentence
 * and the rows cannot disagree after a harvest moves one of them, which is what makes the date in a sentence
 * gate-able instead of hopeful (round-5 read B2, q18: "How far ahead does the file reach?" — UNANSWERED on the
 * artifact, the answer living only as seven bare `DTSTART`s). The same call answers q17 ("Which of its dates
 * have already passed?") by naming the **first** date: a file that says it starts before today, and that marks
 * those rows cancelled, has told a subscriber which of its rows are past (D370's retirement pair).
 *
 * It is deliberately one sentence, used in the file and in `/schedule`'s lede, rather than two: the page and the
 * file would otherwise carry the same window twice in different words, and `check:content` would then need a
 * signature for a pair that is only deliberate because it is the same generated string.
 *
 * Round-6 communication review, `/dates`/Remove and feed/Remove (D399): what is deleted is the **framing and
 * the count**, not the fact. "The calendar file carries the club's 7 dates from…" is this site talking about
 * itself, delivered into a subscriber's calendar on every event, and a count there is wrong the month the club
 * adds a date — the reviewer's own words. What stays is the range, in the club's own voice ("The club's dates
 * run from…"), because q18's answer has to be inside the file: a subscriber holds bare `DTSTART`s and nothing
 * that says how far the file reaches. One call, two surfaces, so the page and the file cannot be edited apart
 * (D371); `check:ics`'s `calendar-window` rule still requires the sentence and its new `feed-meta-commentary`
 * rule fails the framing that was deleted.
 */
export const windowSentence = (window) => {
  if (!window || !window.first || !window.last || !window.count) return '';
  return `The club\u2019s dates run from ${plainDate(window.first)} through ${plainDate(window.last)}.`;
};

/**
 * The text a `VEVENT`'s DESCRIPTION carries: two sentences for the meeting's kind, then the window the file
 * carries, then the chat link. `window` is required, not defaulted — a DESCRIPTION that silently loses the
 * window clause is the defect `check:ics`'s `calendar-window` rule exists to catch, and a default would hide
 * exactly the drift that rule is written to fail on.
 */
export const feedDescription = (row, window) => {
  const template = DESCRIPTIONS[descriptionKind(row)] ?? DESCRIPTIONS.general;
  const clause = windowSentence(window);
  return [template.sentences.join(' '), clause, CHAT_LINE].filter((s) => s).join(' ');
};
