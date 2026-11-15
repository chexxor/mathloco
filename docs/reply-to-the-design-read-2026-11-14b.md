# Reply to the second design read — `docs/design-critique-2026-11-14.md`

Read: an external critique of `staging.matheapolis.com` dated 2026-11-14, written against **text**, not
pixels (its own closing note says so: the compiled CSS and the head were not reachable as source, so the
hexes, the type scale, the existence of a token file and the nav markup are "proposals rather than
corrections").

Every item below is verdict + the command that printed the verdict. Four classes:

- **already shipped** — the thing the read asks for exists, with its gate;
- **false** — the artifact contradicts the claim;
- **contradicts a ruling** — real, but the repo has already decided the opposite, and the operator
  ruled that the critique wins here (each such item gets a new `D###`/`S###`, never a renumbering);
- **new and accepted** — real, in fence, being built this session.

Operator rulings for this session, recorded up front: adopt the read's hex values **as** the palette;
keep the `/schedule` URL (the rename is escalated, not performed); draw the one original SVG diagram
here and escalate the photograph and the OG engraving choice; where the read contradicts a ruling
already on the books, the read wins and a new ruling is written.

## §1 Page names

| Item | Verdict | Evidence |
|---|---|---|
| "Each page answers to 3–4 names" | **already shipped (partly)** | `node scripts/check-naming.mjs` @measured 2026-11-14: nav label == `<title>` == exit band == opening block for every emitted route; alias census `/` 3, `/chat` 4, `/join` 3, `/schedule` 6. Titles are `Dates - Matheapolis`, `Chat - Matheapolis`, `Ways in - Matheapolis`, `Page not found - Matheapolis`, and home is `Matheapolis - a Minneapolis math club`. Note the separator: the repo ships ` - ` (hyphen), the read's table writes ` — ` (em dash). Kept as-is; the em dash is a display glyph and `check:figures`/`check:copy` read these strings literally. |
| "Delete the eyebrow; where it carried meaning it becomes the subtitle" | **shipped this session** | `src/pages/join.astro:33` `<span class="text-ink-3">Join the club</span>`, `src/pages/chat.astro:21` `Community Chat`, `src/components/Schedule.astro` `const eyebrow = compact ? 'The calendar' : 'Dates'`, and `src/components/HeroSection.astro`'s `locator` above the h1. All four are gone: the eyebrows are deleted and the hero locator (`Minneapolis math club`) is now a subtitle **under** the h1 (`HeroSection.astro:140`). `check:naming` plants an eyebrow above the h1 and a section h2 that is another page's h1 (**19 cases, 0 wrong**) @measured 2026-11-14 by `node scripts/check-naming.mjs --selftest`; `check:outline` proves no level is skipped (S040, D309). |
| "Home H2 'When We Meet' duplicates /schedule's H1" | **already shipped** | `Schedule.astro` prints the section heading `When We Meet` on both surfaces, and `/schedule`'s `<h1>` is that same string — the homepage renders it as `<h2>` (`const Heading = compact ? 'h2' : 'h1'`), so no page has two headings of the same words. What the read is really seeing is the *name* collision the naming gate already tracks. |
| "home 'View Schedule' → 'See the dates'" | **shipped this session** | `src/components/HeroSection.astro`'s secondary control read `View Schedule`; it now reads `See the dates`. The compact band's link reads `Next ${win.shown.length} dates` / `All ${win.shown.length} dates`, the count derived from `scheduleWindow()` (see the D4 row below). `check:naming` is what keeps nav, title, band and heading using one word per page. |
| "All 5 dates → hardcodes the count (D4)" | **false** | `Schedule.astro`: `` `All ${win.shown.length} dates` `` and `` `Next ${win.shown.length} dates` `` — interpolated from `scheduleWindow()`, the same call `/schedule`'s rows use. `rg 'All [0-9]+ dates' src/` @measured 2026-11-14 returns only the comment at line 290 that warns against the hardcoded form. |
| `/schedule` → `/dates` | **escalated to the operator** | `check:dated-surfaces`' `RULED` set names `/schedule`; `src/lib/ics.mjs`, the sitemap, `check:site-host` and `.notes/runbooks/domain-cutover-matheapolis.md` all name the path. Renaming it is a `costly` change under the plan's rule and MS15 parked it with that trigger. |

## §2 Navigation

| Item | Verdict | Evidence |
|---|---|---|
| Nav carries the next date | **already shipped** | `src/components/Navigation.astro`: `scheduleWindow(upcoming(), todayIn())`, `nextDate = window.shown[0]?.date`, emitted as `<span data-nav-date=…>` inside the `Dates` anchor. `check:dated-surfaces` (15-case selftest) fails a nav date that is not the first date `/schedule` prints, one written as bare prose, one on a non-chip element, and one on an empty calendar (D311). |
| "Sat 21 Nov" with weekday | **contradicts a measurement → the sentence shipped, the weekday did not** | The full accessible name is built: `aria-label={item.date ? `${item.label}, next meeting ${formatDate(item.date, 'wide')}` : item.label}` @measured 2026-11-14 by reading `Navigation.astro:94`. The visible weekday is not: `node design/nav-fit.mjs --no-build` @measured 2026-11-14 measures `Dates` at 36px, the chip `21 Nov` at 41px, the pair inside one anchor 80px, and the whole row needing **257 of the 276px** the 320 floor offers; `Sat 21 Nov` needs 286 — 10 over, and `flex-nowrap` makes that a failed probe rather than a wrap. The chip is `hidden sm:inline` because of that measurement. Trigger to revisit: a nav change that frees more than 54px (MS17, MS25). |
| Mobile: date chip stays visible without the menu | **escalated** | There is no menu to open — the nav is one row of three links at every width; the 320 floor (D114) is what the chip is measured against. The item presupposes a mobile menu that does not exist. |
| Footer is the complete map, in that order | **already shipped (order differs)** | `Footer.astro` emits Dates · Community chat · Ways in · Add to a calendar · Join on Meetup · Discord. The read wants Meetup and Discord without "Join on" and the band's `Where to next` heading deleted. Heading kept: `aria-label="Where to next"` is what `check:page-exit` (D307, 7-case selftest) requires the band to have, and a band with no label is an unlabelled landmark. |

## §3 Colour

**new and accepted, mapped onto the existing roles.** There is a token file — `src/styles/global.css`,
`@theme`, ratified 2026-11-01 by design-ratify (phase 3), with every ratio read out of the Firefox
renderer (`design/grill/contrast-oracle.mjs`), not hand-computed (D101). The read's hexes land on the
existing names rather than a parallel system:

| Read's token | Repo role it becomes |
|---|---|
| `--paper` `#FAF6EC` | `--color-paper` |
| `--paper-raised` `#FFFCF3` | `--color-panel` |
| `--ink` `#17130C` | `--color-ink` |
| `--ink-muted` `#5C5546` | `--color-ink-2` / `--color-ink-3` |
| `--rule` `#DFD6C2` | `--color-rule` |
| `--accent` `#A2432A` | `--color-gold`'s role: links, accents |
| `--accent-strong` `#7E3320` | the fill step (`--color-ink-hover`'s role) |
| `--accent-wash` `#F0E2D0` | `--color-tint` (hover fill, chip ground) |
| `--amber` `#E9A63F` | fills/rules only, never text |

Consequences the read did not price: the four `--color-path-*` hues exist because a visitor needs to tell
Meetup from Discord from the calendar at a glance (round 2), each ≥ 4.5 on paper and ≥ 47° from the ink
hue. They are kept and re-measured against the new ground. `--color-gold` at 4.82 was chosen because it
is ≥ 0.135 OKLab distance from every commerce brand colour (D88); an accent that is `#A2432A` is 0.06
from Meetup's purple-adjacent red? No — the brand-distance probe (`node design/brand-distance.mjs`) is
re-run before any accent ships, and the amber is refused as text on the strength of the 4.5 bar, not
the read's ~1.7 estimate. **Every pair in the new palette is re-measured by the renderer in the same
commit**, and `npm run check:contrast` is the gate that keeps it true.

"No dark mode" — **already the ruling**: `DESIGN.md` has no dark ground and `--color-ink` is the one dark
region per screen (D89). Nothing to do.

## §4 Spacing, type, layout

| Item | Verdict | Evidence |
|---|---|---|
| "One scale, 4px base … no arbitrary values" | **already shipped, and now gated** | `--spacing: 0.25rem` and DESIGN.md's eight-step grid (4/8/12/16/24/32/48/64). The trap this repo records is that `check:classes` proves a class *resolves*, not that it is on the scale — `/join` shipped `gap-5` (20px) under a green gate. The detector is built: `npm run check:scale` reads every margin/padding/gap utility in `src/` against the eight and its selftest plants `gap-5`, `mt-23`, `py-10`, `mt-7`, `gap-3.5`, `p-[13px]` and a responsive-prefix case, with 6 clean controls (a comment quoting the defect must **not** fire; a sizing utility is not a spacing one) @measured 2026-11-14 by `node scripts/check-scale.mjs --selftest` (**12 cases, 0 wrong**) and `node scripts/check-scale.mjs` (**45 source files, 52 distinct spacing utilities, 0 off-ladder**). Both steps are in `verify` (D321, S042). |
| "Prose measure 66ch" | **already shipped** | `max-w-measure` is defined in `@theme` as a character cap (round 8 operator ruling); `check:row-geometry` fails the build if the emitted `--container-measure` leaves the 40–75 character band (D313). |
| "Type: keep the existing faces; sizes 14/15/18/22/28/35/44" | **contradicts a ruling → the faces stay, the sizes do not replace the ramp** | PT Serif + Public Sans are `@fontsource` imports, ratified. The nine-step 1.2 ramp (`--text-micro` 11.1 … `--text-display-4` 62.9) is derived: control height is `label line box + 2 × pad`, so moving `--text-label` moves every 48px control and the nav fit (round 8, measured: candidates C and D both moved controls to 52/44). The read's set has no chrome tier at all; 14px would be the *body* step. Accept the reading sizes, keep the ramp's derivation, and say so in DESIGN.md. |
| "Radii 2px max" | **contradicts a ruling → escalated** | `rounded-control` and `rounded-card` exist because D139 fixes control geometry, and `check:render` measures the notice ring and the 48px control. A 0-radius control changes every height measurement the browser set asserts. |
| "Remove the double space in the H1" | **false** | The H1 is a single word since the 2026-11-07 rename: `Matheapolis`. `rg 'Math  Book' src/` returns nothing. |

## §5 Components

| Item | Verdict | Evidence |
|---|---|---|
| 5.1 "Abandon the card, use an editorial row" | **already shipped (the row), partly accepted, partly refused** | `EventRow.astro` is three zones: `data-head`, `data-copy-prose` (`max-w-measure`), the cluster, then the plate — and `check:row-geometry` is the detector for it. What is genuinely new and shipped: the row's date is one `<time datetime="…">` element matching the row's `data-date` handle, and the zone is named once — ` Central` on the first row only, because the feed's rows carry `DTSTART;TZID=America/Chicago` (D188). `check:row-geometry`'s 17-case selftest plants a loose date, a `<time>` whose value disagrees with `data-date`, a page naming no zone, a zone on the second row and a zone repeated (**0 wrong**) @measured 2026-11-14 by `node scripts/check-row-geometry.mjs --selftest`; the price measured on the artifact is **+24px on the first row at 320** (570→594) and **0** at 1240/1024/640/390 @measured 2026-11-14 by `node design/schedule-geometry.mjs --routes /schedule --widths 1240 1024 640 390 320` (D327). What the read wants that the repo has already ruled against: the row is keylined, not hairline-separated (a hairline on `bg-panel` measures **2.88**, under the 3.0 graphic bar, design/records/0018), and the desktop rail the read draws (month over day over weekday) is the leaf, which was measured and rejected as a text rail — the copy lane it leaves is **291px at 1024**, narrower than the 323px plate beside it (D313). |
| "After the first row only, a second row of quiet links" | **refused — it contradicts a ruling** | MS12's whole point is "sign-up is one click from **every** date the site prints" (S021, D256, D259), and `check:rsvp-page` is the detector: it plants "a printed row with no cluster at all" and fails it @measured 2026-11-14 by `node scripts/check-rsvp-page.mjs --selftest` (**43 cases, 0 wrong**). Folding Chat · Facebook · Add to calendar into one line under the first row makes four printed dates unreachable from their own row, and the pixels it saves are the ones the row already pays: the cluster costs **+44px of copy-lane height** in every box, **0px of row height at 1240** where the plate is taller than the lane, and **88-116px on a phone** @measured 2026-11-13 by `node design/grill/strip-clusters.mjs` against a build with every `[data-rsvp-cluster]` removed. The site map the read wants is the exit band, which exists by ruling (D307) and is audited by `check:page-exit`. Reasoning in **D327**. |
| 5.3 Hero: H1 → next-date sentence → paragraphs → two links → plate | **contradicts D306 → escalated** | The homepage prints **no date at all** — D306 removed the card, the cluster and the deck, and `check:dated-surfaces` fails any built page that prints one (`RULED` = `/schedule` alone). The read's hero wants the date sentence *back on the homepage*. The operator's own reversal note is in D306; this is that decision, not a delegate call. |
| 5.4 Thread list: cap at six, two columns | **shipped this session** | `WhyJoinUs.astro` already does `grid-cols-1 md:grid-cols-2` with bold name + muted gloss. The cap and the remainder path are new and gated: `const VISIBLE = 6` in the component, and `npm run check:threads` reads that number rather than restating it (D238, one home per rule) — **cap 6, 9 thread(s) in `src/content.json`, 6 painted on `/`, 3 reachable through `/chat#threads`** @measured 2026-11-14 by `node scripts/check-threads.mjs`; its selftest is **9 cases, 0 wrong** (7 plantings: nine bullets under a cap of six, the rest link deleted, the rest aimed at Meetup, a dead `#threads` anchor, a list that quietly dropped two items, no cap declared, an offer with nothing to offer; 2 clean controls) @measured 2026-11-14 by `node scripts/check-threads.mjs --selftest`. The read's "two columns ≥900px" is refused, and the reason is measured rather than assumed: the split is already tight at the `md` (768) flip — the list measures **720x273** at 768 with each column **344px** wide, **852x273** at 900 with each column **410px**, while the same list in one column at 640 measures **592x434** @measured 2026-11-15 by `node design/whitespace-survey.mjs --routes / --widths 1024 900 768 640 390 320`. Moving the break to 900 would put the single-column shape back in the 768-899 band: the list measures **273px** tall in two columns at 768 against **434px** in one column below it — 161px of page height @measured 2026-11-15 by the same probe. There is also no 900 breakpoint in the repo: every browser gate measures 1240, 1024, 640, 390 and 320, so a `--breakpoint-900` is a layout no gate has ever seen (D320). |
| 5.5 External links: no "opens in a new tab" in the text | **shipped this session** | The shipped accessible name was `Sign up on Meetup Meetup, opens in a new tab` (`src/lib/rsvp.mjs:375` and the three `srOnly` call sites). The grammar now lives once, in `src/lib/links.mjs`: `rel="noopener noreferrer"`, an `aria-hidden` arrow, and `, opens in a new tab` only in an `sr-only` span — **derived from the label**, so a label that already names the platform does not name it twice (D317, S041). `npm run check:ext-links` holds **5 built pages, 33 outbound anchors, 33 carrying the qualifier, 33 held to the rules** @measured 2026-11-14 by `node scripts/check-ext-links.mjs`, and its selftest is **15 cases, 0 wrong** (9 plantings incl. the qualifier painted in the visible label, an internal route opened as a new tab, and "new window" wording) @measured 2026-11-14 by `node scripts/check-ext-links.mjs --selftest`. Both steps are in `verify`. |

## §6 Images and graphics

| Item | Verdict | Evidence |
|---|---|---|
| 6.1 alt ≤ 12 words, caption carries provenance | **shipped this session** | The cap was 18 (D312); it is **12** now, and an empty alt has to be *declared* (`data-decorative="true"`) rather than left silent (D324 supersedes D312). Artifact: **4 described alts + 5 declared-decorative plates across 5 built pages, longest 12 words** — counts `9x1 10x1 11x1 12x1`; the longest is the hero plate, "Arcs cut from two centres, with a circle tangent to all four" @measured 2026-11-14 by `node scripts/check-alt.mjs`. `check:alt:selftest` is **13 cases, 0 wrong** (8 plantings incl. a 22-word alt, a 13-word alt, an alt that names the file's role, an img with no intrinsic size, and a bare `alt` with no declaration; 5 clean controls incl. a 12-word alt exactly at the cap and a declared decorative plate) @measured 2026-11-14 by `node scripts/check-alt.mjs --selftest`. The seven event thumbs no longer carry a written description: they are declared decorative, because the plate repeats words the row already prints and this seat cannot see the pixels (D92). Before the fix the hero alt was **29** words and the plates **30/28/32** @measured 2026-11-14 by `git show HEAD:src/components/HorizonBand.astro`. |
| Hero plate caption "a real meeting: the table, the books, the room (376x307 crop)" | **defect the read did not name — fixed this session** | `HeroSection.astro` passes `caption="a real meeting: the table, the books, the room"` on `src/assets/photos/hero.png`, which is a Byrne 1847 Euclid engraving. The visible caption asserts a photograph of a meeting that does not exist — D92's defect class, in prose rather than in alt. |
| 6.2 Triptych 3/2/1-up | **refused — the premise is measured false** | The three horizon plates are emitted at **768×268, 698×351 and 768×358** — aspects **2.87, 1.99, 2.14** @measured 2026-11-14 by grepping the emitted `<img>` attributes in `dist/client/index.html`. None is portrait, and the band is `hidden lg:block`, so at 640 and 390 there is no band to stack: the widths the rule is about are widths the page does not paint. Intrinsic `width`/`height` are already on every emitted `<img>` (D324's gate fails one without them). Adding `object-fit: cover` and a fixed aspect to plates whose design ruling is that **each plate keeps its own aspect because cropping is how a diagram loses its labels** (D168) would put a rule a future session breaks while believing it is complying (D326). |
| 6.3 A real meeting photograph | **escalated to the operator** | `PhotoSlot` has the slot and its empty state; `design/records/0018` + D92/D94 rule that a raster needs a provenance record in `src/assets/photos/README.md` **before** it ships, and `design/ratify-check.mjs` now fails an import from outside that directory. Nothing to invent here. |
| 6.4 OG card 1200×630 | **already shipped; engraving choice escalated** | `check:social` + its selftest compare the committed share card against its painted report; `Layout.astro` emits `og:image` with `og:image:width/height`. Which plate may be cropped is the operator's call. |
| 6.5 The ∑ mark in four places | **already shipped (favicon), the rest escalated** | `public/favicon.svg` is ink `#17130c` on paper `#faf6ec` at **17.15** @measured 2026-11-14 by `node scripts/check-favicon.mjs` — the shipped mark was Tailwind's `#3b82f6` at 3.68 (D310, palette per D316), and `check:favicon:selftest` (**10 cases**) plants a named colour, a Tailwind hex, a 3.66 pair, three hues, a channel hue and an empty mark. `check:figures` reads the mark's ratios from the same probe, so the number in this line cannot rot without going red. The wordmark lockup and the 404 mark are the operator's call (MS25), priced before they are asked: at the 320 floor the nav row's content box is **276px** and the shipped set needs **257px** (fits by 19px); writing the lockup as `∑ Matheapolis` makes the mark **119px** instead of 97 and the row need **279px — 3px over**, and `check:render` fails an overflowing nav rather than letting it wrap (D100) @measured 2026-11-15 by `node design/nav-fit.mjs --no-build --widths 320`. The 404 page paints no mark at all today (`grep -c 'data-mark' dist/client/404.html` = **0** @measured 2026-11-15), and the render gate's mark rules run on `/` only, so a second mark is a new gate rather than a tweak. |
| 6.6 One original drawing | **new and accepted** | Drawn here: an SVG in the plates' language, `currentColor` hairlines, no fills. |

## §7 Data and content defects

| ID | Verdict | Evidence / action |
|---|---|---|
| D1 CANCELLED duplicate on Nov 21 | **true, and it contradicts D299** | `dist/client/events.ics` @measured 2026-11-14 carries `UID:649bf59a…` `DTSTART;TZID=America/Chicago:20261121T120000` `STATUS:CONFIRMED` **and** `UID:99df9996…` `20261121T120000` `STATUS:CANCELLED`, SEQUENCE 1. D299's letter says "Do **not** add an auto-un-cancel path" because Mobilizon 5.2.4 mints a fresh UID for a date edit (cause unestablished, parked with a second-reproduction trigger). The operator ruled the critique wins: a **grouped** de-duplication — same date, same venue, same series, one CONFIRMED → the CANCELLED row is dropped from the *published page*, never silently re-published, and every dropped UID is logged. The collision guard for a re-announced CANCELLED UID stays. |
| D2 obsolete feed boilerplate in `DESCRIPTION` | **true, fixed this session** | The shipped descriptions read "We are interested in discussing algorithms of most any kind. If attendees would post a comment before the date…" — the organizer's old text, published verbatim, contradicting the site's "no syllabus, no current focus". Each published row now carries a description authored per meeting type in `src/lib/event-description.mjs`: two sentences from copy this repo already sources, then the chat link (D319). Artifact: `grep -c "We are interested in discussing" dist/client/events.ics` = **0** @measured 2026-11-14, and `check:ics` compares every published DESCRIPTION against `feedDescription`, so the feed cannot drift back to upstream text while the gate is green. |
| D3 nav date computed at build | **already shipped** | See §2: same `scheduleWindow()` call as the page of record. "Fail the build if zero upcoming events" is **refused**: `DESIGN.md` "States" and record 0010 rule that an empty calendar is a designed state, not a build failure. |
| D4 hardcoded count | **false** | Interpolated; see §1. |
| D5 the membership clause | **partly true** | Shipped: `the club's list of members is its Meetup group page, last read 11 days ago — the list is not the room.` The age is derived (`ageSince(content.membership.asOf)`, `asOf` 2026-11-03); the *number* is deliberately absent (D265/D276: the site publishes dates, not attendance) and `check:rsvp-page` fails any tally that reaches the bytes. The lowercase start is a real defect — the sentence opens mid-phrase. Fix the casing; do not restore the headcount without the operator's letter. |
| D6 two provenance formats | **true, fixed this session** | `/` printed `last read 11 days ago` and `/schedule` printed `Copied from the club's own calendar on Nov 13, 2026`. One register now: `src/lib/provenance.mjs`'s `provenanceStamp()` prints relative inside **30 days** and the calendar date beyond it, and the threshold is an argument, not a per-page exception (D322). `npm run check:provenance` reads every provenance line in the artifact and fails any component that computes its own age outside that module — **43 source files, 5 built pages, threshold 30 days** @measured 2026-11-14 by `node scripts/check-provenance.mjs`; its selftest is **14 cases, 0 wrong** (4 artifact plantings incl. an age past the window, an absolute date inside it, both registers on one line, and a phrase with no register that must NOT fire; 5 source-side cases incl. the rule's own module being exempt and a comment quoting the defect not counting as a call) @measured 2026-11-14 by `node scripts/check-provenance.mjs --selftest`. |
| D7 divergent series names | **true, and it is the operator's open ask N1** | Feed carries `MPLS Math Club - Bimonthly Social`, `Matheapolis - Bimonthly Social`, `Parallel Learning for Mathematical Minds`, `Common Denominator - Study Session` @measured 2026-11-14 by `rg SUMMARY dist/client/events.ics`. D189 rules what the page prints. Normalise at build once the operator names the series. |
| D8 skipped heading levels | **true for `/schedule`, false for `/chat` — both now gated** | `/schedule`'s row title was an `<h3>` under the page `<h1>` — an h1→h3 jump. It is an `<h2>` now (`EventRow.astro:140`), the eyebrows are deleted (`join.astro:32`, `chat.astro:28`, `Schedule.astro:180`) and the hero locator sits under the h1 as a subtitle. `npm run check:outline` (**12 cases, 0 wrong**) fails a second h1, a page starting at h2, an h1→h3 jump, an empty heading and an image-only heading; the artifact reads **5 page(s), every ladder starting at h1 and never skipping a level** @measured 2026-11-14 by `node scripts/check-outline.mjs`. S040 is the ruling. |
| D9 `/join` repeats the nav, and "What we do" duplicates the home intro | **partly true** | The exit band is the site map by ruling (D307), not a duplicate nav; deleting it fails `check:page-exit`. `/join`'s "What we do" section is the only place the two series are described in prose — `check:content`'s near-duplicate rule already keeps it from copying the hero's sentences. |

## §9 / §10 acceptance and verification

The read's verification block is not runnable here as written: `npx @axe-core/cli` is not in
`package.json` and the repo's fence is no new dependencies. **axe is still not added** — that is an
operator decision (it is a new dependency, so it needs a letter, not effort). Until it exists the repo's
equivalents are `check:ground`, `check:space`, `check:render:dist`, `check:alt`, `check:naming`,
`check:page-exit`, `check:row-geometry`, `check:outline`, `check:ext-links`, `check:provenance`,
`check:line-art`, `check:threads`, `check:scale` and `check:contrast` — each with a selftest that plants
the defect it is supposed to catch.

## Not changing (the read is right about this)

The voice, the hand-off model (Meetup sign-up, Discord chat, `.ics` calendar), the engraving set as
identity, and the absence of an agenda, syllabus or member wall — all already ruled (D86, D92, D94,
D243, D265).

## §11 The read's three open questions, answered

1. **"Does the repo already have a token file, and are the faces in §4 already chosen?"** Yes to both, and
   §3 was mapped onto it rather than copied beside it. The token file is `src/styles/global.css`'s `@theme`
   block — **23 colour tokens, 39 asserted pairs** @measured 2026-11-15 by `node scripts/check-contrast.mjs` —
   and the type tiers are ratified in `design/decisions.json` and enforced by `check:scale` (45 source
   files, 52 spacing utilities, all on the eight-step ladder). Where the read's hex cleared a role's own bar
   it was adopted; where it disagreed with a bar this repo already enforces, the role was re-solved and the
   number recorded (D316). No second palette exists.
2. **"Is `/schedule` → `/dates` acceptable, or only the label?"** **Escalated, not decided here** (MS25).
   The label already reads `Dates` in the nav, the exit band and the page's own eyebrow — `check:naming`
   requires those three to agree @measured 2026-11-15. The URL is a different class of change: `check:dated-surfaces`'
   `RULED` set, `src/lib/ics.mjs`, the sitemap, `check:site-host` and the cutover runbook all name
   `/schedule`, so it is one change or none (D309), and the legacy apex redirects are not yet carrying
   `/events.ics` live. Recommendation: keep the URL, change the label (done), and fold any rename into the
   MS02 cutover.
3. **"Which single engraving may be cropped for the OG card?"** **Escalated** (MS25). The read's triptych
   crop premise was measured false in this tree — the card is 1200×630 built by `scripts/make-social-share.mjs`
   and verified byte-for-byte by `check:social` + its selftest — so the crop is a choice, not a correction
   (D326). Name the plate and the change is one line.

**On the four things the read could not verify.** They are all resolved against the shipped tree rather than
left as proposals: the compiled token file (§1 above), the type scale (`check:scale`, DESIGN.md's tier table),
the nav markup (priced at the 320 floor by `design/nav-fit.mjs`: the shipped set needs **257 of 276px**), and
the hex values (§3, adopted where they clear the repo's own bars). What this seat genuinely cannot do is see
pixels, which is why §6.1's claim about painted dates on the wrong rows is marked unverifiable and handed to
the operator (N4).
