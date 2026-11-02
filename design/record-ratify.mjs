// one-shot: record the ratify-phase answers in the machine record. Kept as a script (not a hand edit)
// so the JSON stays valid and the diff is reviewable as data.
import { readFile, writeFile } from 'node:fs/promises';

const P = new URL('./decisions.json', import.meta.url);
const d = JSON.parse(await readFile(P, 'utf8'));
const DELEGATE = 'delegate, 2026-11-01, on the operator\'s blanket ruling: "I\'ll accept whatever you decide."';

d.noticeAction = {
  value: "a notice's action is the `quiet` LABEL with no keyline of its own, at the 40px step, underlined at rest",
  source: DELEGATE,
  rule: 'a box has exactly ONE boundary: a notice is the only keylined thing in that box',
  reason_measured: 'secondary would put a second `rule` hairline 12px inside the notice keyline (3.01 on paper but 2.88 on a panel = illegal), and two identical hairlines at a 12px gap read as a double border; quiet is ground-agnostic (gold 4.82 paper / 4.61 panel, gold-on-ink 5.80 on the band) so the same notice works on all three grounds with zero new tokens',
  because_gold_is_also_caution: 'in a caution notice the action is separated from the status word by an underline at rest, its lane and its size - never by a second hue (D102 declines a signal hue)',
  ban_added: 'a keylined notice never sits on a panel (rule on panel = 2.88)',
  closes: 'noticeGrammar.open_synthesis',
  record: 'design/records/0008-component-grammar.md',
};

d.spacingOrphan = {
  value: '20px is illegal: `mt-5` -> `mt-6` (24) and `sm:mt-5` -> `sm:mt-6` in design-apply; design-enforce flags any 20px write',
  source: DELEGATE,
  correction: 'the grill called this "one orphan write" - counted in src/ it is 5 occurrences, 4 live: mt-5 x1 (HeroSection:47) and sm:mt-5 x3 (27/34/41) plus one inside a comment (68)',
  reason: 'rounding up keeps the row air the ruling was about; rounding to 16 would put a section gap closer than the section padding',
  closes: 'spacingSizes.open',
  record: 'design/records/0003-spacing-grid.md',
};

d.radiusRoles = {
  value: '--radius-control and --radius-card, both 6px from one base; no pill role; chips are not pills',
  source: DELEGATE,
  reason: 'round 2 ratified only the 6px base (fits 3/3 candidates; 8px risked the candy reading the operator ruled out). A pill would be a second radius role with no measured need - the chip is already carried by hue keyline + word - and every extra role is another thing design-enforce must police',
  record: 'design/records/0001-token-naming.md',
};

d.derivedLeadings = {
  value: 'text-subhead 23px -> 28px, text-heading 27.7px -> 36px, DERIVED by the rule "next 4px multiple >= size x 1.2" and marked derived in the token file',
  source: DELEGATE,
  reason: 'the grill ratified 16/24/28/36/44/52/60 and left these two steps unmeasured; inventing a number would dress a derived value as a measured one',
  revisit: 'if either reads wrong against a real page, measure it in the renderer and promote it to ratified',
  record: 'design/records/0004-type-scale.md',
};

d.elevationTokensShip = {
  value: 'shadow-e1 and shadow-e2 ship defined-but-unused until the first floating surface exists',
  source: 'delegate, 2026-11-01 (D105 already anticipated this); operator accepted the Q6 recommendation',
  reason: 'the stops are solved against the 1.35 layer bar - re-deriving them is the cost, and leaving them out of @theme invites an ad-hoc shadow the moment a menu is needed. design-enforce forbids box-shadow outside these two tokens, so an unused token cannot rot into use',
  today: 'nothing in src/ floats: no modal, no dropdown',
};

d.tokenContrastGate = {
  value: 'node design/ratify-check.mjs - the token block is asserted by Tailwind\'s own resolver plus the renderer contrast oracle, and the colour values are PARSED OUT of src/styles/global.css',
  source: 'delegate, 2026-11-01',
  asserts: '43 promised utilities resolve; no accidental override of a Tailwind default theme key (a tokens-only branch must not restyle existing pages); duration-color resolves to NOTHING (v4 has no --duration-* namespace); 39 colour pairs return their recorded ratio (0.15 tolerance) or the required verdict, including the rows that must FAIL',
  found: 'two record numbers were pre-renderer: path-calendar on paper 5.47 -> 5.28 and on the band 1.97 -> 2.28. The hand oklab math in design/light-roles.mjs agrees to 0.02 for plum/coral/olive and is 0.19 off for cyan, whose oklch sits on the sRGB gamut edge (#007481, red channel 0). No decision moved.',
  status: 'not in npm run verify yet - design-enforce (phase 5) decides the baseline and whether CI fails on it',
};

d.missingContentIsNotABuildFailure = {
  value: 'a gate may fail a build over a MALFORMED feed; it must never fail one because there is nothing to show. An empty section gets designed content instead.',
  source: 'operator, 2026-11-01',
  operator_verbatim: '"If we have no upcoming events, we should have different content for that entire page section, rather than fail the build. Failing a build to [have] missing content seems like an inelegant solution."',
  consequence_for_stage1: 'npm run check:events-feed asserts the CONTRACT (parses, required fields, real dates, ordering, byte-identical VEVENT blocks across builds) and EXITS 0 on an empty snapshot; staleness ("the newest listed date has already passed") becomes a maintainer-facing warning printed by events:pull, never a red build and never a visitor-facing alarm (Q3 A)',
  consequence_for_design: 'emptyState A is the sanctioned handling: the zero-upcoming empty state converts (305px, two paths out, the dated line) and the hero label changes to "Nothing scheduled" rather than disappearing',
  closes: 'the flagged half of D103 ("check:events-feed can still fail a BUILD whose newest row is past") - DECLINED by the operator',
};

d.pastEventPlacement = {
  value: 'UNRESOLVED on purpose, deferred past the design work. Constraint that binds now: past events never render inside the upcoming section, and if the site shows them at all it is a separate surface, never interleaved.',
  source: 'operator, 2026-11-01',
  operator_verbatim: '"I don\'t know whether it\'s beneficial to show events that are in the past. If we do, they should be in a different place in the website."',
  what_is_decided_anyway: 'a past permalink stays up with the status WORD `Past` (D104) instead of 404ing, so "past" is a state of a row and not a page that must exist; `src/config.json` already gates the brochure\'s stub sections (showUpcomingEvents/showPastEvents = false) and PastEvents.astro is an empty stub',
  revisit: 'the events/architecture review the operator scheduled for after the design pass ("When we finish our exercises and design work we will review that")',
};

// close the two synthesis flags in the entries that carried them
d.noticeGrammar.open_synthesis = 'RESOLVED in ratify 2026-11-01 -> decisions.noticeAction (quiet label, one boundary per box)';
d.spacingSizes.open = 'RESOLVED in ratify 2026-11-01 -> decisions.spacingOrphan (20px illegal: 5 occurrences, 4 live, all -> 24)';
d.freshnessClaim.still_true = 'SUPERSEDED by the operator 2026-11-01: the build-time staleness assertion is DECLINED. Staleness is a maintainer-facing warning in events:pull; a build never fails for missing/empty content. See decisions.missingContentIsNotABuildFailure.';
d.shadowSemantics.today += ' CONFIRMED in ratify: both tokens ship defined-but-unused.';

await writeFile(P, JSON.stringify(d, null, " ") + '\n');
console.log(`${Object.keys(d).length} keys`);
