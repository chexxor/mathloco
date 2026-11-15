# Matheapolis — design remediation spec
Source: critique of staging.matheapolis.com, 2026-11-14.
Site: Astro static build. Pages: / , /schedule , /chat , /join , /events.ics , 404.

## 0. Design intent (read before changing anything)

The site should read like a well-set book page, not a product landing page:
- Paper ground, warm near-black ink, one accent from the hand-colouring in the
  engravings. No gradients, no drop shadows, no glossy cards.
- Structure comes from hairline rules and whitespace, not from containers.
- Engravings are full-bleed plates with captions, not decorative thumbnails.
- Voice is plain, dry, first-person-plural, self-deprecating. It is the site's
  main asset. Do not rewrite copy into marketing register; where this spec asks
  for a copy change, change only the string named.

Hard constraints: no backend, no accounts, no on-site RSVP, no new dependencies
beyond what is already in package.json. Meetup = sign-up, Discord = chat,
events.ics = calendar, Facebook = secondary. All four are standing resources.

## 1. Page names — one name per page

Each page currently answers to 3–4 names (nav label, H1, <title>, eyebrow,
on-page link text). Collapse to the table below. The eyebrow above each H1 is
deleted; where it carried meaning, it becomes the subtitle.

| Route | Nav label | H1 | <title> | Eyebrow | Subtitle under H1 |
|---|---|---|---|---|---|
| `/` | wordmark "Matheapolis" (not a nav item) | Matheapolis | Matheapolis — a Minneapolis math club | remove "Minneapolis math club" | — |
| `/dates` (301 from `/schedule`, keep `/schedule` as alias) | next date, e.g. "Sat 21 Nov" (D3) | Dates | Dates — Matheapolis | remove "The calendar" | When we meet, where, and where to sign up |
| `/chat` | Chat | Chat | Chat — Matheapolis | remove "Community Chat" | Summaries from the channel, written by our bot |
| `/join` | Join | Ways in | Ways in — Matheapolis | remove "Join the club" | — |

Rules:
- Nav label == the word a person would say out loud. "Ways in" stays as the H1
  (it is the site's best phrase) but the nav says "Join" because nav text must
  predict what happens on click.
- `<title>` = H1 + " — Matheapolis", except home.
- No page may reuse another page's H1 as its own H2. Today home has an H2
  "When We Meet" and /schedule has H1 "When We Meet": rename the home H2 to
  "The calendar" or delete the section heading entirely (see §5.4).
- Update internal link text to match: home "View Schedule" → "See the dates";
  "All 5 dates →" → "All dates →" (count must not be hardcoded, D4).

## 2. Navigation

Desktop, single row, sticky, paper background, 1px rule bottom:

    [ ∑ Matheapolis ]                      [ Sat 21 Nov ]   Chat   Join

- Slot 2 is the next confirmed event from the feed, formatted "Sat 21 Nov",
  linking to /dates. Its accessible name must be the full sentence:
  `aria-label="Next meeting: Saturday 21 November, 12 pm at Angel Food Bakery — see all dates"`.
  Fallback when no upcoming event: label "Dates".
- This is the site's heartbeat: a nav that names a date proves the site is
  maintained better than any provenance sentence.
- Do not add: Home as a nav item, About page, Contact page/email form.
- Mobile (<640px): wordmark + date chip only, plus a menu toggle revealing
  Chat and Join. The date chip must remain visible without opening the menu.
- Footer becomes the complete map, in this order, and nothing else:
  Dates · Chat · Ways in · Meetup · Discord · Add to calendar (.ics).
  Delete the "Where to next" heading that currently repeats the nav
  (/schedule footer) and delete the second link list inside /join.

## 3. Colour tokens

The site has no declared palette; colour currently comes from the engravings
only. Introduce one. Values below are proposals with computed WCAG ratios on
paper — if the repo already has a token file, map onto the existing names and
keep the ratios, do not introduce a parallel system.

| Token | Value | Use | Ratio |
|---|---|---|---|
| `--paper` | `#FAF6EC` | page ground | — |
| `--paper-raised` | `#FFFCF3` | inset blocks, table zebra | — |
| `--ink` | `#17130C` | body, headings | 17.3:1 |
| `--ink-muted` | `#5C5546` | captions, metadata, addresses | 6.8:1 |
| `--rule` | `#DFD6C2` | hairlines, borders, focus-adjacent | borders only |
| `--accent` | `#A2432A` | links, active nav, thread bullets | 5.5:1 — body-safe |
| `--accent-strong` | `#7E3320` | button fill; white text on it | 8.8:1 |
| `--accent-wash` | `#F0E2D0` | `::selection`, date-chip background | text must be `--ink` |
| `--amber` | `#E9A63F` | fills/rules ONLY | ~1.7:1 — never text |

Rules:
- One accent hue family. `::selection` and `:focus-visible` must use it, not the
  browser default blue. Focus ring: `2px solid var(--accent-strong)` with
  `outline-offset: 2px`, never `outline: none`.
- No pure `#000` anywhere; no cool-grey text over the warm plates.
- Links in body copy: `--accent`, underline always visible (not only on hover).
  Hover changes to `--accent-strong`; do not remove the underline on hover.
- Do not add a dark mode. Warm engravings on a dark ground lose their line work.
- `--ink-muted` is the floor for small text. Verify the address line, the
  "opens in a new tab" qualifier and any 12px text against this table.

## 4. Spacing, type, layout

- One scale, 4px base: `4 8 12 16 24 32 48 72 96 128`. No arbitrary values.
  If the repo has one-off `margin-top` values, replace them with the scale.
- Section rhythm: 72px between blocks in a section, 96px between sections,
  48px on mobile. Headings take more space above than below (roughly 2:1).
- Prose measure `max-width: 66ch`. Plates and the triptych may go full-bleed;
  body copy may not.
- Type: keep the existing faces. Sizes 14 / 15 / 18 / 22 / 28 / 35 / 44; body
  `1.6` line-height, headings `1.15`, headings `letter-spacing: -0.01em` at 35px+.
- Radii: 2px maximum, and only on the date chip. Cards have no radius and no
  shadow — grouping is done with a 1px `--rule` hairline.
- Remove the double space in the H1 "Minneapolis Math  Book Club" if it is still
  present in any template string.

## 5. Components

### 5.1 Event row (replaces the event card)
Abandon the card. An editorial row separated by hairlines, not a bordered box —
five repeated boxes with three buttons each read as a link farm.

    desktop grid: [ 5.5rem date rail | 1fr content ]
      rail:   month (uppercase, 12px, muted) over day (28px, ink), weekday beneath
      content: h3 title (22px)
               1 line: "Saturday, Nov 21 · 12:00–1:00 pm · Central"  (muted, 15px)
               1 line: venue name + street  (muted, 15px)
      actions: right-aligned on the content baseline, primary only:
               "Sign up on Meetup →"
    After the first (next) row only, a second row of quiet text links:
               Chat · Facebook · Add to calendar
    mobile (<640px): rail becomes a horizontal chip above the title;
                     everything stacks in the order title, when, where, primary.

- Primary action: text link with `--accent`, weight 600, no button fill.
  Reserve `--accent-strong` fill for at most one button on the whole site
  (the date chip is a fill; do not also fill the CTAs).
- Exactly one primary link per row. Do not repeat Chat/Facebook on every row.
- The month / day / weekday must not be separate list items or separate
  heading-level elements; each row's date is one `<time datetime="2026-11-21">`
  containing plain text. Screen readers must hear "Saturday, November 21".
- Timezone: append "Central" to the first time shown on each page, once.

### 5.2 Date chip (nav + hero)
One component, two placements. Text: "Sat 21 Nov". Background `--accent-wash`,
text `--ink`, 2px radius, 6px/10px padding. Linked to /dates. Its accessible
name is the full sentence (see §2).

### 5.3 Hero
Order: H1 → one-line next-date sentence → 2 paragraphs → two links
("Ways in" primary, "See the dates" secondary) → hero plate.

    Next meeting: Saturday 21 Nov, 12–1 pm, Angel Food Bakery, St. Louis Park.

Today the highest-intent fact on the site is three clicks away and the hero
carries two buttons whose labels are both variants of "join". Lead with the
date sentence; the plate follows it.

### 5.4 Thread list ("What we take up")
Nine sentence-length bullets with em-dash clauses form a wall. Keep the voice,
fix the rhythm:
- Cap at six visible bullets on the home page; the rest behind
  "the rest of the list →" linking to /chat or a `/threads` anchor.
- Two columns ≥900px, one below; 24px row gap, 12px within a row.
- Each bullet: bolded short name, then the clause in `--ink-muted`, e.g.
  **Arithmetic with the rules nudged** — what breaks, and what gets interesting…
  This gives the eye an entry point and makes the list scan like a table of
  contents rather than prose.
- Delete the "The calendar" eyebrow + empty line before the section heading
  (currently an orphan label with more space below it than to its heading).

### 5.5 External links
Stop putting "opens in a new tab" as words inside the link text — it currently
produces strings like "Sign up on Meetup Meetup, opens in a new tab→". Use
`target="_blank" rel="noopener"` plus a small inline SVG arrow and
`<span class="sr-only">(opens in a new tab)</span>`. Consistent on every page.

## 6. Images and graphics

### 6.1 Alt text
Hard rule: `alt` ≤ 12 words, describing what is *visible*. Bibliography goes in
a `<figcaption>`.
- Hero plate: `alt="A hexagon inscribed in a circle, from an 1847 coloured Euclid"`;
  caption: "After John Byrne, *The First Six Books of the Elements of Euclid* (1847), Book IV, prop. XV."
- Each triptych plate: one clause in alt; full citation (author, title, year, leaf)
  in a caption under the plate. Captions use `--ink-muted`, 14px.
- Event art: the same generi, image is reused for every social and every study
  session. Either give the row no image at all, or use one standing engraving per
  event type (social / study) with `alt=""` and treat it as decorative.
- Never write alt that describes provenance ("The club's own event image for this
  social") — that is a caption at best and noise at worst.

### 6.2 Triptych behaviour
Three portrait plates side by side: 3-up ≥900px, 2-up 640–899px, 1-up below.
Do not stack three full-width portrait plates on mobile; if a single plate at
390px is taller than ~60vh, crop with `object-fit: cover` and a fixed aspect
ratio. Preserve intrinsic `width`/`height` attributes to prevent layout shift.

### 6.3 The missing photograph
Every image on the site is a 100-year-old printed plate or a Meetup upload.
There is no picture of a room, a table, or people. Add one real photograph of a
meeting to `/join` (above "Your first one") or the home hero area. This is the
only asset type that answers "should I walk in", which the site currently
answers only in prose. Crop to 3:2, `--ink-muted` caption, no filter, no border.

### 6.4 OG image
Compose a 1200×630 card: `--paper` ground, one engraving cropped to the right
third, wordmark left, next date beneath it. Do not let the build crop an
engraving automatically — it letterboxes or eats the line work.

### 6.5 The ∑ mark
Promote it from a footer glyph to the site's mark: wordmark lockup, favicon.svg,
OG card, 404 page. One mark, four places.

### 6.6 One original drawing
The club's own thinking has no visual form. Add a single hand-drawn line diagram
in the plates' visual language (inks on paper, hairlines, no fills) illustrating
one thread — e.g. "steps you can undo" as wires and boxes. SVG, currentColor
strokes, ~1200 bytes. Place it inside the thread list.

## 7. Data and content defects (fix before any visual polish)

| ID | Sev | Defect | Fix |
|---|---|---|---|
| D1 | High | `events.ics` contains a CANCELLED duplicate on Nov 21 (`99df9996…`, 12:00–14:00) alongside the CONFIRMED one (`649bf59a…`, 12:00–13:00). Subscribers see a struck-through event on the same day. | In the build step that fetches the feed: group by (date, venue, event type); if any CONFIRMED exists, drop CANCELLED rows for that group; otherwise keep the highest `SEQUENCE`. Log dropped UIDs. Assert in a test that no two VEVENTs share a DTSTART date. |
| D2 | High | Feed descriptions still carry obsolete boilerplate ("algorithms of most any kind", "attendees would post a comment before the date") that contradicts the site's "no syllabus, no current focus". | Generate `DESCRIPTION` per event type from a template in the repo, in the site's voice, ≤ 2 sentences + the Discord link. |
| D3 | Med | Nav/next-date component needs the feed's next confirmed event, computed at build. | Derive from the parsed feed, not from a hand-written string. Fail the build if zero upcoming events (a scheduled-club page with no dates is a bug, not a state). |
| D4 | Med | "All 5 dates →" hardcodes the count. | Compute. Also: "the club has used 15 of them" and "last read 11 days ago" must likewise be derived, not typed. |
| D5 | Med | Home: "the club's list of members is its Meetup group page, last read 11 days ago — the list is not the room." Loses the number, opens lowercase mid-block. | Restore a number and a sentence case: "The club's 280-member Meetup list was last read yesterday — the list is not the room." If the count can't be fetched, drop the clause entirely rather than shipping a timestamp with no referent. |
| D6 | Med | Two provenance registers: relative ("11 days ago") on home, absolute ("on Nov 13, 2026") on /dates. | One component, one format: relative for <30 days, absolute beyond. Same source field (`DTSTAMP`). |
| D7 | Med | Event names diverge between page and feed and between the club's old and new names: "MPLS Math Club Social" (page), "MPLS Math Club - Bimonthly Social", "Matheapolis - Bimonthly Social" (same feed). | Normalise at build to the club's own vocabulary: "Social" and "Study session". Prefix with nothing — the site is already Matheapolis. |
| D8 | Low | Heading outline: /chat runs H1 → H3/`#general` region → H4; /schedule runs H1 → H3 event titles. | Strict monotonic outline: one H1 per page, H2 for sections, H3 for items. Add a lint/test that asserts no skipped levels. |
| D9 | Low | The "Ways in" page repeats the site's nav as a second link list, and its "What we do" section duplicates the home intro. | /join keeps only the three paths + "Your first one". Link out for "what we do". |

## 8. Do not change

- The voice, in particular: "A book, a room, and whoever shows up"; "the list is
  not the room"; "Whether the room is your kind of room is not something a page
  can tell you". These are the site. Do not smooth them into standard copy.
- The hand-off model: Meetup for sign-up, Discord for chat, .ics for calendars.
- The engraving set as site identity (fix the alt/caption split, keep the images).
- The absence of an agenda, a syllabus, or a member wall.

## 9. Acceptance criteria

1. `rg 'All [0-9]+ dates|15 of them|11 days ago' src/` returns no hardcoded
   quantity; all three are interpolated.
2. Neither `events.ics` nor /dates shows two events sharing a date unless both
   are CONFIRMED and genuinely distinct.
3. Every page: exactly one H1; no skipped heading levels; H1 == nav label or its
   declared alias per §1.
4. Every `<title>` matches §1's table; no two pages share a title.
5. Every `alt` ≤ 12 words; every engraving has a `<figcaption>` with full citation.
6. Contrast: every text token ≥ 4.5:1 on `--paper`, and every token in §3 is
   actually referenced by CSS (no orphan tokens, no ad-hoc hex outside the file).
7. Nav date chip equals the earliest future CONFIRMED event in the feed, at 390px
   and 1440px, without opening a menu.
8. `outline: none` appears nowhere; `:focus-visible` is visible on every
   interactive element at 3:1 against adjacent colours.
9. No link text reads like "Sign up on Meetup Meetup, opens in a new tab→".
10. An axe-core run reports zero violations on all four pages.

## 10. How to verify

```bash
npm run build && npx serve dist &
npx @axe-core/cli http://localhost:3000/ http://localhost:3000/dates \
  http://localhost:3000/chat http://localhost:3000/join
node scripts/check-feed.mjs        # asserts: no duplicate dates, no CONFIRMED+CANCELLED pairs
node scripts/check-contrast.mjs    # parses the token file, prints ratios, exits 1 below 4.5
rg -n 'opens in a new tab|All [0-9]+ dates' src/
```

## 11. Open questions for the human

- Does the repo already have a token file, and are the faces in §4 already chosen?
  If yes, map §3 onto it by role and keep the ratios; do not create a second
  palette.
- Is `/schedule` → `/dates` rename acceptable, or should the URL stay and only
  the label change?
- Which single engraving may be cropped for the OG card?


Notes on what I could not verify

The compiled CSS and HTML head aren't reachable as source, so four things in that spec are proposals rather than corrections: the hex values, the type scale, whether a token file already exists, and the current nav markup. The agent should reconcile §3–§4 against the repo and keep the ratios even if it keeps your hexes. If you paste the contents of your global stylesheet — or drop screenshots at 1440 and 390 — I'll convert §3 and §4 into exact diffs against what's actually shipping, and I'll also be able to judge the triptych crop and the card rhythm as pixels instead of as markup.
