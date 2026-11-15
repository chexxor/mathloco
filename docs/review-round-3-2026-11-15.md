# Matheapolis — remediation spec, round 3

> Provenance of this file: an external reviewer's round-3 spec, received 2026-11-15, preserved verbatim so
> the claims it makes can be checked against the artifact rather than remembered. Every claim is answered
> item by item in `docs/reply-to-the-design-read-2026-11-15.md`, with the command that produced each verdict.
> Two formatting slips in the received text are left exactly as they arrived: the `horizon-euler1910` row
> of the §3 table is missing its closing pipe, and the reference footnotes are the reviewer's own.

Reviewed: staging.matheapolis.com, 2026-11-15. Supersedes round-2 spec.
Pages: / , /schedule , /chat , /join , /events.ics , 404.

## 0. Why round 2 stalled — read this first

Round 2 asked for ~40 changes. What shipped were content edits inside page
templates (a "What we do" section on /join, per-event Meetup URLs on /schedule,
a new 404 page). What did not ship were changes that required touching shared
components or the layout wrapper: nav, footer, page naming, external-link
component, event row, alt text. That is the pattern this round must break.

Rules for this round:
1. Work in the layout component and the shared components first. A single
   component fix must not be re-done per page.
2. Nothing in this spec is a copy rewrite. Every string change is quoted.
3. Do not restructure the site, add pages, or add dependencies.
4. If a task cannot be done because the file it names does not exist, stop and
   report the actual structure rather than inventing a workaround.

## 1. P0 — restore the global shell (regression)

The header nav and footer are absent from the served HTML on /, /schedule,
/chat and /join. /schedule and /chat contain no link to "/" at all. Only the
404 page links home. Every page is now a dead end.

Restore one layout wrapper used by all pages, containing:

Header (sticky, paper background, 1px bottom rule):

    [ ∑ Matheapolis ]                    [ Sat 21 Nov ]   Chat   Join

  - Slot 1: wordmark, links to /.
  - Slot 2: date chip = earliest future CONFIRMED event from the event data,
    formatted "Sat 21 Nov", links to /schedule. aria-label:
    "Next meeting: Saturday 21 November, 12 pm at Angel Food Bakery — see all dates".
    Fallback label when no upcoming event: "Dates".
  - Slot 3: "Chat" → /chat. Slot 4: "Join" → /join.
  - ≤640px: wordmark + date chip visible without opening any menu; Chat and
    Join behind a disclosure toggle. The date must never be hidden behind it.

Footer, complete map, this order and nothing else:

    Dates · Chat · Join · Meetup · Discord · Add to calendar (.ics)

No "Where to next" heading. No second copy of the nav inside page bodies.

Verify: with JavaScript disabled, every page exposes the nav and footer in the
served HTML.

## 2. P0 — one bug, 20 call sites: doubled link text

Current output on /schedule: "Sign up on Meetup Meetup, opens in a new tab→"
and on /join: "Join the Meetup group Meetup, opens in a new tab". The 404 page
already renders correctly: "our Meetup group, opens in a new tab".

Root cause: a link-text prop and an external-link component both append the
destination name, and the arrow is concatenated with no space.

Fix in the ExternalLink component only:
- Accessible name = the visible label + " (opens in a new tab)" rendered in a
  visually-hidden span. Never append the destination name to the label.
- Arrow: inline SVG (`aria-hidden="true"`, 1em, `vertical-align: -0.05em`,
  0.35em left margin). Never a "→" character glued to text.
- `target="_blank" rel="noopener noreferrer"`.

Correct strings:

    /schedule row  : "Sign up on Meetup"          → per-event Meetup URL
    /join Meetup   : "Join the Meetup group"
    /join Facebook : "Join the Facebook group"
    /join Discord  : "Join the chat on Discord"
    /chat          : "Join the chat"
    /schedule foot : "Add the club calendar"

Add a build test: no anchor's text content may contain the same word twice in
a row, and "opens in a new tab" may appear only inside one visually-hidden span
in the ExternalLink component.

## 3. P0 — alt text (unchanged from round 2; cheapest task in the spec)

Hard rule: `alt` ≤ 12 words describing what is visible. Bibliography goes in a
visible `<figcaption>` at 14px, `--ink-muted`. Currently the hero alt is ~35
words and each triptych alt is 40–55 words.

| Image | alt | figcaption |
|---|---|---|
| hero.webp | A hexagon inscribed in a circle, from an 1847 coloured Euclid | After John Byrne, *The First Six Books of the Elements of Euclid* (1847), Book IV, prop. XV. |
| horizon-euclid1903 | Octahedron, dodecahedron and icosahedron drawn in line work | *The Elements of Euclid for the Use of Schools and Colleges* (1903), leaf 297. |
| horizon-euler1910 | Four arcs cut from two centres, with a tangent circle | *Plane Geometry, with Problems and Applications*, Slaught & Lennes (1910), leaf 122.
| horizon-radio1922 | A radio-frequency wave modulated by a spoken sound | The Principles Underlying Radio Communication, National Bureau of Standards (1922), leaf 514. |

Event art (bimonthly_social.png, parallel_studies.png): decorative, `alt=""`.
Delete every alt that describes provenance ("The club's own event image for
this social") — that is a caption at best, noise at worst.

## 4. P1 — page naming

Do not rename URLs this round. `/dates` currently 404s and nothing links to
it; keep `/schedule`. Change labels only, so each page has exactly one name.

| Route | Nav | H1 | \<title> | Eyebrow | Subtitle under H1 |
|---|---|---|---|---|---|
| / | wordmark | Matheapolis | Matheapolis — a Minneapolis math club | delete | — |
| /schedule | date chip | Dates | Dates — Matheapolis | delete | When we meet, where, and where to sign up |
| /chat | Chat | Chat | Chat — Matheapolis | delete | Summaries from the channel, written by our bot |
| /join | Join | Ways in | Ways in — Matheapolis | delete | — |

- Delete all four eyebrows: "Minneapolis math club", "The calendar",
  "Community Chat", "Join the club".
- Rename home H2 "When We Meet" to "The calendar" — it currently duplicates the
  /schedule H1, which becomes "Dates".
- Update body link text to the new names: home "View Schedule" → "See the
  dates"; "Join Our Group" → "Ways in"; "All 5 dates →" → "All dates →".
- `The calendar` eyebrow on home is today an orphan label with more space below
  it than to its heading. If the block keeps any label, it sits ≤8px above the
  H2.

## 5. P1 — the next date must be on the home page

Home currently tells the reader where the date is instead of telling them the
date: "The next date, where the club meets, and where to sign up for it are
all on the schedule."

Hero order: H1 → next-date sentence → 2 paragraphs → "Ways in" + "See the
dates" → hero plate.

    Next meeting: Saturday 21 Nov, 12–1 pm, Angel Food Bakery, St. Louis Park.

Also append the timezone "Central" once per page, at the first time shown.
/schedule currently prints "12:00 pm – 1:00 pm" with no zone.

## 6. P1 — event rows: one action each

Still three buttons per row, five times over, on /schedule. Two of them (Discord,
Facebook) are standing resources, not per-event actions.

Per row: one primary text link "Sign up on Meetup" (accent, 600). After the
first row only, one quiet secondary row: Chat · Facebook · Add to calendar.

Structure per row:

    desktop: [ 5.5rem date rail | 1fr content ]
      rail: month (12px, uppercase, muted) / day (28px, ink) / weekday (muted)
      content: h2 title (22px) → "Saturday, Nov 21 · 12:00 – 1:00 pm Central"
               (muted) → venue + street (muted)
               → primary link, right-aligned on the content baseline
    mobile: date rail becomes one horizontal chip above the title.

The date rail is currently five separate text nodes ("Nov", "21", "Sat") that a
screen reader reads as fragments. Wrap in one `<time datetime="2026-11-21">`
whose text is "Saturday, November 21".

Event titles are `###` directly under the H1: skip levels. Make them H2.

## 7. P1 — one source of truth for dates

The page and the calendar feed now disagree, because they come from different
places. /schedule links per-event Meetup URLs and prints "MPLS Math Club
Social"; /events.ics is built from Mobilizon and still prints "MPLS Math Club -
Bimonthly Social" with the old algorithms boilerplate in DESCRIPTION.

Decide: Meetup is the source of dates and titles. Mobilizon/ics is downstream.

Then:

a) **The feed still ships a cancelled duplicate of Nov 21** — `99df9996…`
   STATUS:CANCELLED 12:00–14:00, alongside `649bf59a…` CONFIRMED 12:00–13:00,
   same venue. /schedule dedupes correctly; /events.ics does not. Anyone who
   subscribes sees a struck-through event on a day they are also invited to.
   In the build step: group by (date, venue, type); if a CONFIRMED exists, drop
   CANCELLED rows in that group; otherwise keep highest SEQUENCE. Log dropped
   UIDs. Assert no two VEVENTs share a DTSTART date unless both CONFIRMED and
   genuinely distinct.
b) **Generate DESCRIPTION per event type**, ≤2 sentences, in the site's voice.
   The current text ("discussing algorithms of most any kind", "attendees would
   post a comment before the date") contradicts "no syllabus, no current focus".
c) **Normalise event names** to the site's own two-format vocabulary (see §8c).

## 8. P2 — content and structure defects

a) Hardcoded quantities: "All 5 dates →", "The club has used 15 of them", and
   "last read 11 days ago" are all typed. Compute all three or drop them.
b) Home, line 47, is a sentence fragment that now opens mid-block in lower
   case, with no number and a timestamp that qualifies nothing: "the club's
   list of members is its Meetup group page, last read 11 days ago — the list
   is not the room." Restore sentence case and a number, or delete the clause.
c) **A third event name exists.** The chat summary mentions "Cancellation of
   tonight's Joyful Math session"; /join tells readers there are exactly two
   formats, "A social" and "A study session". Either add a third format to
   /join or make the data stop using a name the site never defines. Pick one
   vocabulary and enforce it in the build.
d) Thread list: nine sentence-length bullets. Cap at six on home, two columns
   ≥900px, bold a 3–5 word name at the start of each and put the rest of the
   clause in `--ink-muted`.
e) Heading outline: /chat runs H1 → "#general" → H3 → H4 → H2. One H1, H2 for
   sections, H3 for items, no skips.
f) Provenance: "Copied from the club's own calendar on Nov 13, 2026" is
   absolute and already two days old. Render relative ("checked 2 days ago")
   below 30 days, absolute beyond. Same component on both pages.
g) Chat page timestamp is 6:01 AM UTC — fine, but say UTC once or switch to
   Central to match the events.

## 9. P2 — design tokens: audit, then enforce

The CSS is compiled and hashed, so this round does not guess at hex values.
Do this in two commits.

**Commit 1, audit (no visual change).** Write `scripts/audit-tokens.mjs` that
prints every hex, rgb() and oklch() literal in `src/` and `dist/_astro/*.css`,
grouped by selector, with count. Report:
  - how many distinct background colours exist
  - how many distinct text colours exist
  - every `margin`, `padding` and `gap` value not on the 4px scale
  - every `outline: none` or missing `:focus-visible`
  - contrast ratio of each text colour against its actual background
Report the file and line for each finding. Do not fix yet — produce the table
first, because the fix depends on how many unique values there already are.

**Commit 2, enforce.** Target system (map onto existing names; keep the ratios
even if the hexes stay):

| Token | Value | Use | Ratio on paper |
|---|---|---|---|
| --paper | #FAF6EC | page ground | — |
| --paper-raised | #FFFCF3 | inset blocks | — |
| --ink | #17130C | body, headings | 17.3:1 |
| --ink-muted | #5C5546 | captions, metadata, addresses | 6.8:1 |
| --rule | #DFD6C2 | hairlines, card borders | borders only |
| --accent | #A2432A | links, active nav | 5.5:1, body-safe |
| --accent-strong | #7E3320 | chip fill; white text on it | 8.8:1 |
| --accent-wash | #F0E2D0 | ::selection, date chip bg | text must be --ink |
| --amber | #E9A63F | fills and rules ONLY | ~1.7:1, never text |

Non-negotiables: one accent hue for links, `::selection` and `:focus-visible`;
`2px solid var(--accent-strong)` focus ring with 2px offset, never
`outline:none`; no pure #000; links underlined always, not only on hover; no
dark mode. Scale 4/8/12/16/24/32/48/72/96/128, prose measure 66ch, radii 2px max,
no shadows, grouping by 1px hairline.

## 10. P2 — images and graphics

- Every social row still shows the same bimonthly_social.png, and both study
  sessions the same parallel_studies.png. Keep them only if they are treated as
  standing illustrations per event *type* (then `alt=""`); otherwise drop images
  from event rows and let typography carry them.
- Triptych: 3-up ≥900px, 2-up 640–899px, 1-up below, with intrinsic
  width/height set. Three stacked full-width portrait plates on mobile is the
  failure mode to avoid.
- OG image: hand-composed 1200×630 — paper ground, one engraving cropped to the
  right third, wordmark left, next date beneath. Do not auto-crop a plate.
- Promote ∑ to a real mark: header lockup, favicon.svg, OG card, 404.
- Add one original line drawing in the plates' visual language (hairlines,
  currentColor, no fills) illustrating one thread; ~1200 bytes of SVG.

## 11. Do not change

The voice, specifically: "A book, a room, and whoever shows up"; "the list is
not the room"; "Whether the room is your kind of room is not something a page
can tell you"; "The invite is the button below." The hand-off model (Meetup
sign-up, Discord chat, .ics calendar). The engraving set as identity. The
absence of agendas, syllabi and member walls.

## 12. Acceptance criteria

1. JS disabled: nav + footer present in served HTML on all four pages; every
   page links to "/" at least once.
2. No occurrence of a word repeated consecutively in any anchor's text.
3. Every alt ≤ 12 words; every engraving has a figcaption; event art has `alt=""`.
4. One H1 per page; no skipped heading levels (script check); no two pages share
   a `<title>`; every eyebrow removed.
5. Nav date chip equals earliest future CONFIRMED event, visible at 390px.
6. Home states the next date, venue and time above the fold without a click.
7. /events.ics contains no date with both a CONFIRMED and a CANCELLED event;
   no two VEVENTs share a DTSTART date.
8. `rg -n 'All [0-9]+ dates|15 of them|[0-9]+ days ago' src/` returns nothing.
9. `outline: none` appears nowhere; every interactive element has a visible
   focus ring at 3:1.
10. axe-core: zero violations across all four pages at 390px and 1440px.

## 13. Verification

    npm run build && npx serve dist &
    node scripts/audit-tokens.mjs
    node scripts/check-feed.mjs        # duplicate/cancelled assertion
    npx @axe-core/cli http://localhost:3000/ http://localhost:3000/schedule \
      http://localhost:3000/chat http://localhost:3000/join
    curl -s localhost:3000/schedule | grep -c 'href="/"'   # expect ≥1

## 14. Sequencing (reviewer's own)

Do §1–§3 in one pass before anything else. They are three component edits, they
fix a regression that makes every page a dead end, and they clear the two defects
that have now survived two rounds. §4–§5 change what the site *says* it is;
§6–§7 change what the data does. If you only get through §1–§3 this week, the
site is materially better than it is today.

One offer, because I've now been unable to read your CSS for three rounds: paste
the contents of your global stylesheet and layout wrapper into a message, or drop
screenshots at 1440 and 390. With the stylesheet I can turn §9 from an instruction
into an exact diff, and with screenshots I can finally judge the triptych, the
date rail and the row rhythm as pixels rather than as markup.
