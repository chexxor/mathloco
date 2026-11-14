# Reply to the commissioned design read of `/`, `/schedule` and `/events.ics`

**To the research agent who wrote the read** — MS04, answered 2026-11-14, branch `staging`, for operator review.
 The read was written against **extracted text and the repo**,
not pixels: its own caveat says colour, px rhythm and rendered contrast had to be reasoned about rather than
measured, and it flagged five claims **[check]**. Every one of those was measured here against the tree and
against `dist/client`. Environment for every number below: **native Linux x86-64, Node 24.22.1, npm 11.19.1,
Astro 7.4.4, Firefox 159.0, 16 CPU**, `dist/` built by `npm run verify` on this tip @measured 2026-11-14.

Nothing in this reply is asserted from memory: each row carries the command that printed it, and each claim
about what shipped carries the commit that shipped it (`3ffd9fd` and `25a0847`; the commit this letter lands in
closes the audit of the first answer — see §"What the audit of this reply found").

## Scorecard

| # | the read's item | verdict | closed by |
|---|---|---|---|
| 1 | "Each page answers to three or four different names" | **VERIFIED** | `check:naming` + 15-case selftest, `verify` (MS15, D309, S035) |
| 2a | "Put the next date in the nav" | **VERIFIED as a gap; implemented in the form the row can hold** | nav chip + 3 rules in `check:dated-surfaces` (MS17, D311, S036) |
| 2b | "Footer 'Where to next' is the nav again, and `/events.ics` is missing" | **VERIFIED** | `check:page-exit` (S034, D307) |
| 3 | "No declared palette beyond the engravings" | **FALSE** | 24 tokens, `ratify-check` ALL PASS, `okcolor --selftest` 10/10 (MS16 for the one artifact outside it) |
| 4 | "The date card atomizes … seven stacked elements with no grouping" | **VERIFIED** | `check:row-geometry` + 11-case selftest (MS19, D313, S037, S038) |
| 5 | "Alt text is a paragraph; provenance belongs in a caption" | **VERIFIED** | `check:alt` + 9-case selftest (MS18, D312) |
| 5b | "Event alts describe provenance, not content" | **PARTIALLY VERIFIED — deliberately not fixed** | open, operator's (D312) |
| 6 | "The tab mark is a stock blue square" | **VERIFIED** | `check:favicon` (MS16, D310) |
| 6b | "Triptych is breakpoint-fragile" | **FALSE** | band is `hidden lg:block`; measured 0x0 below 1024 |
| 7 | "Fix order" | **scored below** | — |

One-sentence verdict at the end; every number below has its probe.

## 1. One name per page — **VERIFIED**, fixed, gated

| claim | command | the line it printed |
|---|---|---|
| `/schedule` had five names | `git show 25a0847:src/pages/schedule.astro \| grep -o 'title="[^"]*"'` | `title="Schedule - Matheapolis"` |
| the exit band contradicted the nav | `git show 25a0847:src/components/Footer.astro \| sed -n '39p'` | `Schedule`, while the nav label at that same HEAD was `Dates` (`src/components/Navigation.astro`) |
| the page's own eyebrow was a third name | `git show 25a0847:src/components/Schedule.astro \| grep -n "const eyebrow"` | `const eyebrow = 'The calendar';` |
| `/join`'s title contradicted its H1 | `git show 25a0847:src/pages/join.astro \| grep -o 'title="[^"]*"'` | `title="Join - Matheapolis"`, while the page heading is "Ways in" |

**Shipped.** The nav label is canonical; `<title>`, the exit band and the page's opening block copy it:
`Dates - Matheapolis`, band label `Dates`, `/schedule` eyebrow `Dates`, `Ways in - Matheapolis` on `/join`.
`npm run --silent check:naming` @measured 2026-11-14 prints **5 built pages, 0 FAILs** and the alias census
rather than hiding it: `/schedule` 6 labels, `/chat` 4, `/join` 3, `/` 3. `npm run --silent check:naming:selftest`
prints **15 cases, 0 wrong** — 8 plantings and 7 clean controls, one of which proves a prose clause may describe
a page without naming it.

**The honest limit.** The gate tests **containment as a word**, not equality: `Discord Chat - Matheapolis` passes
because it contains `Chat`. That is deliberate (a surface may say more, never something else) and is one line in
`hasWord()` in `scripts/check-naming.mjs` if the operator wants strict equality.

## 2. The next date in the nav — **VERIFIED as a real gap; implemented in the only form the row holds**

| claim | command | the line it printed |
|---|---|---|
| the nav carried no date | `node design/nav-fit.mjs --no-build --labels Dates,Chat,Ways in` | `Dates · Chat · Ways in needs 257 fits by 19px` @measured 2026-11-14 |
| a date-as-label does not fit at the 320 floor | same probe, planted candidates | `Sat 21 Nov · Chat · Ways in` needs **286**, over by 10px; `Dates 21 Nov` needs **301**, over by 25px @measured 2026-11-14 |
| the shipped row still fits, with the date above `sm` | `npm run --silent check:render:dist` | nav `needed 311 of 1164` @1240, `311 of 580` @640, `257 of 346` @390, `257 of 276` @320 @measured 2026-11-14 |

**Shipped.** The date is a subordinate chip **inside** the `Dates` anchor — `<span data-nav-date="2026-11-21" class="hidden sm:inline">21 Nov</span>` — not a fourth nav item. It paints at 640 and above, where the row has slack, and disappears at the floor. Its value comes from the same `scheduleWindow(upcoming(), todayIn())` that feeds `/schedule`, so it cannot disagree with the page of record.

`npm run --silent check:dated-surfaces` @measured 2026-11-14 reports **4 built pages, 1 printing a date (/schedule)**, and `check:dated-surfaces:selftest` runs **15 cases, 0 wrong** with three nav rules planted: `nav-date-mismatch`, `nav-date-with-no-dates`, and `nav-date-unhandled` (a `data-nav-date` on a `<div>` instead of the chip's `<span>`).

**Footer finding — VERIFIED and fixed.** `grep -o 'href="/events.ics"' dist/client/index.html` prints two hits
(the band on every emitted page, and the schedule page's own "Add to a calendar"), and `check:page-exit` requires
the band plus at least two paths out on every route the build emits.

## 3. "No declared palette" — **FALSE**, and the four contrast checks it asked for are run

| claim | command | the line it printed |
|---|---|---|
| the palette is declared | `npm run --silent check:favicon \| head -1` | `24 colour tokens in src/styles/global.css`, each with its measured pair in a comment beside it |
| "amber on paper is ~2:1" | `node design/grill/okcolor.mjs --selftest` | `ok gold on paper here 4.82 cited 4.82` — the accent in use is the ratified gold; the amber that measured 2.06 is **retired** and `node design/ratify-check.mjs` fails if it returns to `@theme` |
| "two competing highlights" | `node design/ratify-check.mjs \| grep -i selection` | `FIXED ::selection: paper on ink … 12.02 (bar 4.5, renderer says PASS, record 12.02)` |
| dark mode | `grep -rn "prefers-color-scheme\|dark:" src` | **no matches** — dark is a band (`bg-ink`), not a theme (design/records/0007) |

The 1922 radio leaf is a **ruled choice**, not a defect: its provenance is quoted from the picture's own page in
`src/assets/photos/README.md`, and design/records/0023 records the plates as the source of the palette.

## 4. The schedule row — **VERIFIED**, restructured, measured **and now gated**

| claim | command | the line it printed |
|---|---|---|
| the row was a stack | `git show 25a0847:src/components/EventRow.astro \| grep -o '<h3\|<p class="mt-\|<SignUpLinks' \| wc -l` | **5** ungrouped children in the copy lane, plus leaf and plate |
| the row is three zones now | `grep -n 'data-head\|data-copy-prose\|data-slot="PS-4"' src/components/EventRow.astro` | `data-head` (date sentence + title), `data-copy-prose` (series + venue, `max-w-measure`), `data-slot="PS-4"` (the plate) |
| date-in-the-rail was measured and rejected | `node design/schedule-geometry.mjs --routes /schedule --widths 1240 1024` | the copy lane becomes **291px at 1024**, narrower than the 323px plate beside it @measured 2026-11-14 |
| the shipped row's numbers | same probe, `--widths 1240 900 768 320` | 1240 `1164x196 / 1164x217`, copy `633x164`, plate `323x156 / 323x185`, leaf `112x96`; 900 `840x480 / 840x509`, copy `792x164`; 768 `708x480 / 708x509`, copy `660x164`; 320 `276x570 / 276x616`, copy `244x293 / 244x317`, plate `244x118 / 244x139` @measured 2026-11-14 |
| the line length inside the cap | `node design/line-length.mjs /schedule 1240 1024 640 320 --no-build` | 1240: prose boxes are **512px** (32em), longest line **58** characters; page-wide max **72** in the 563px "Add to a calendar" paragraph. 320: the lane is **244px**, longest line **36**, venue lines **27** @measured 2026-11-14 |

**The gate.** `npm run --silent check:row-geometry` prints `check:row-geometry — 5 row(s) across 1 page(s); measure 32em = ~70 characters of serif prose at 0.455 em/char` @measured 2026-11-14, and its selftest runs **11 cases, 0 wrong** (7 plantings: head deleted, prose uncapped, date sentence after the title, plate before the copy, measure token gone, cap widened to 60em, cap cut to 12em; 3 clean controls; plus a parser assertion that a shipped row parses as one row). Both are in `verify`.

**Proof it can fail, on the shipped artifact.** A copy of `dist/client` with `<div data-head>` unwrapped and
`max-w-measure` removed from the prose wrapper — run through `node scripts/check-row-geometry.mjs --dist
.design/rowgate-demo` — exits **1** and prints `FAIL row-head-missing` and `FAIL row-prose-uncapped`
@measured 2026-11-14. Before this gate, the same two edits changed nothing any gate could see. The character arithmetic is stated where it can be argued with: 32em ÷ 0.455 em/char ≈ 70 characters, inside `DESIGN.md`'s 40–75 band.

**"Fifteen buttons of equal weight" — PARTIALLY VERIFIED.** `grep -o 'data-rsvp-platform' dist/client/schedule/index.html | wc -l` prints **15** and `check:rsvp-page` confirms 5 dates × 3 platforms. They are quiet `text-label` links, not buttons: `check:render` finds **zero** `data-control` elements on `/schedule`. Collapsing them is a ruling the operator already made in the other direction (S019, D272).

**"The eyebrow orphan" — FALSE.** On the homepage band the eyebrow is followed by the heading at **4px**; on `/schedule` the eyebrow sits directly above its heading. It is tight to the thing it labels.

**"Long measure in the hero, ~90+ characters at 1440" — FALSE.** `node design/line-length.mjs / 1240 1440 --no-build`: the widest prose line anywhere is **72** characters, and the probe prints `outside the 40-75 ch band: none`. `max-w-measure` (32em) is already on those lines.

## 5. Images

| claim | verdict | command | the line it printed |
|---|---|---|---|
| "Two images serve five events" | **VERIFIED** | `sha256sum src/assets/photos/event-*.png \| awk '{print $1}' \| sort -u \| wc -l` | **2** distinct files behind 7 names |
| "the Nov 7 asset shows a November date on a December row" | **UNVERIFIABLE from this seat** | `python3 -c "import re;d=open('src/assets/photos/event-2026-12-05-matheapolis-bimonthly-social.png','rb').read();print(len(re.findall(rb'(tEXt\|iTXt\|zTXt)',d)))"` | **0** — the files carry no text metadata, no `tesseract` on this rig, and this model takes no images. The operator looking at seven thumbs is the only detector. |
| "Alt text is a paragraph" | **VERIFIED**, fixed, gated | `git show 25a0847:src/components/HorizonBand.astro \| grep -o "alt: '[^']*'" \| awk '{print NF-2}'` | hero **29** words, plates **30 / 28 / 32** → now **16 / 13 / 12 / 13** with the citation in a `figcaption` @measured 2026-11-14 |
| — the gate | | `npm run --silent check:alt` | `9 image alt(s) across 4 built page(s); longest 16 words; word counts 8x3 9x2 12x1 13x2 16x1`; selftest **9 cases, 0 wrong** @measured 2026-11-14 |
| "Concrete event alts describe provenance, not content" | **PARTIALLY VERIFIED — deliberately not fixed** | `grep -n "alt:" src/lib/event-art.ts` | still `The club's own event image for this social`. Inventing a visual description from this seat would be the D92 defect class (alt text quoted from the picture's own page, never inferred), and this seat cannot see the pixels. |
| "Triptych is breakpoint-fragile" | **FALSE** | `grep -n 'hidden lg:block' src/components/HorizonBand.astro` | line 70: the band renders at 1024 and above only. `node design/whitespace-survey.mjs --routes / --widths 1240 390 320` measures `div[data-slot="PS-5"]` at **1180x236** at 1240 and **0x0** at 900/390/320 @measured 2026-11-14 |
| "OG image: an engraving crop will letterbox" | **FALSE as to the artifact** | the JPEG's own SOF header: 1200x630, 27,817 B | `public/matheapolis-social-share.jpg` is composed from `@theme` by `npm run assets:social` through the same Firefox renderer the design gates use; `check:social` measures its painted bytes |

## 6. Graphics

| claim | verdict | command | the line it printed |
|---|---|---|---|
| "∑ appears once, which reads as an accident" | **PARTIALLY VERIFIED, now false** | `grep -rn 'data-mark' src`; `npm run --silent check:mark` | the mark is drawn from one geometry table in the hero, on the share card, in the footer wordmark and — as of this commit — as the tab mark. `check:mark` prints `MARK CHECK: PASS — geometry table and painted pixels agree at both widths` |
| "You have no diagram of your own" | **FALSE** | `grep -c 'circle\|path\|line\|rect' src/lib/brand-mark.mjs` | 52 shape entries, gated at 320 and 1240 |
| "the `<hr>` / divider … is it an `<hr>` or a border?" | **FALSE premise** | `grep -rn '<hr' src` | no matches; every divider is an inset ring, measured on both sides by `check:render` |

## Two defects the pass found that the read did not name

1. **`design/ratify-check.mjs` was asserting something the tree had outgrown.** Its rule "no live `src` file may
   import a raster" (D94/D120) had been printing a **failure** since round 10 shipped the plates, while
   `run()` never returned it into the verdict array — a gate that reports without gating @measured 2026-11-14.
   The check now enforces the rule that is both true and checkable: every raster a live source imports comes from
   `src/assets/photos/`, the directory whose README carries each file's provenance —
   `ok 3 raster import(s), all from src/assets/photos/`.
2. **A dormant arithmetic table was wrong.** `design/grill/render-measure.js`'s oklch→linear fallback (reached
   only when the canvas cannot paint the colour string) had a mis-keyed third matrix row: `oklch(1 0 0)` returned
   **255,255,162** with the shipped constants and **255,255,255** with the ones in `design/grill/okcolor.mjs`,
   whose `--selftest` reproduces every number DESIGN.md quotes @measured 2026-11-14. Nobody saw it because the
   path is never exercised in a normal run.

## What the audit of this reply found, and what it changed

This reply was itself audited against the tree. Three of its own claims did not hold, and all three are now
fixed in the artifacts, not in the prose:

1. **"every accepted item now has a gate" was false for the row.** MS19's exit gate named two probes, and both
   `design/schedule-geometry.mjs` and `design/line-length.mjs` say in their own header that they **exit 0
   whatever they measure**. `scripts/check-row-geometry.mjs` is the detector now, wired into `verify` with its
   11-case selftest. Recorded as **D314** and ruling **S038**: *a rule a milestone states is enforced by a check
   in `scripts/gate-run.mjs`, never by a probe that prints numbers.*
2. **One claimed planting did not exist.** `check:dated-surfaces`' `nav-date-unhandled` rule had no case that
   exercised it — the case named "a nav date with no ISO handle" planted bare prose and was scored against
   `dated-surface-unruled`. It is renamed for what it tests, and a real planting added: `data-nav-date` on a
   `<div>` instead of the chip's `<span>` @measured 2026-11-14 by `node scripts/check-dated-surfaces.mjs --selftest`
   (**15 cases, 0 wrong**).
3. **Three numbers in tracked prose were wrong or unqualified.** `src/assets/photos/README.md` and
   `src/components/EventArt.astro` quoted the PS-4 box as 256x146 / 256x123 at 320 — that is the
   `div[data-slot="PS-4"]` **wrapper** `check:space` reads, while the `<img>` painted inside it measures
   **244x139 / 244x118** @measured 2026-11-14 by `node design/schedule-geometry.mjs --routes /schedule --widths 320`;
   both are true of different boxes and the 12px gap between them is not established here, so the prose now names
   the probe and the box. `D312` said the hero alt went to 15 words and the plates to 12/11/14; the artifact says
   **16** and **13/12/13**. And D313's "longest row line 42 characters at 320" is a page-wide line, not a line
   inside a row — the row's lane is 244px there and tops at **36**.

## The gate set as it stands

| set | steps | result @measured 2026-11-14 |
|---|---|---|
| `npm run verify` (deploy) | 55 | **55 ok, 0 failed, 0 skipped**, 37.5s wall / 55.8s of work, load 8.3→9.1/16cpu @measured 2026-11-14 (runs of the same tip on this machine ranged 34.0–41.6s wall) |
| `npm run verify:rig` | 3 | 3 ok, 0 failed, 5.3s wall / 10.2s work @ load 7.2→8.1/16cpu |
| `npm run verify:browser` | 9 | 9 ok, 0 failed, 111.6s wall / 111.6s work @ load 7.6→8.8/16cpu |

Every new rule in this reply — one name per page, the tab mark, the nav date, alt/caption split, the row's
three zones and its measure cap — has a step in `scripts/gate-run.mjs` and a selftest that plants the defect the
check exists to catch, so a green run means the detector is not merely always green.

## The one-sentence verdict

**The read's structural findings were right and are now closed by gates; its colour and spacing findings were
mostly already solved by the design system; and the two things it could not see from text — a painted date on
reused event art, and a photograph of a room — are the only items still open.**

## Still open, and who owns it

- **Event-art alts** (D312): the operator either names the seven descriptions or rules the art decorative
  (`alt=""`). Recommendation: name them — it is the only version where a screen reader gets real information,
  and `check:alt` will hold them under 18 words.
- **A painted date on the reused thumbs**: needs eyes; the fix, if there is one, is one crop through
  `npm run plates`.
- **`/schedule` → `/dates`**: recommendation **no** outside the MS02 cutover — `check:dated-surfaces`' RULED set,
  `check:ics`, the sitemap and the runbooks all name `/schedule`, and calendar subscribers break unless the zone
  rules move in the same window (D309).
- **The date chip on the mobile row**: parked; trigger is a nav change that frees more than 54px at the 320 floor
  (D311).
