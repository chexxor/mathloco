# Reply to the round-3 design read — answering `docs/review-round-3-2026-11-15.md` item by item

Written 2026-11-15 by the delegate, on branch `design-critique-round-3`, to be sent back to the reviewer.

Two surfaces are quoted, and they are not the same thing:

- **what staging serves today** — `https://staging.matheapolis.com`, fetched this session. Staging is a
  *review environment*: it runs its own preview D1 and preview KV, and it is redeployed only by the operator.
  The fixes in this branch are **not on it yet**, because this branch is unmerged and undeployed.
- **what this tree builds** — `dist/client` after `npm run build`, probed at 1240/640/390/320 by
  `npm run check:render:dist` @measured 2026-11-15 (Linux native, Node 24.22.1, Firefox 159.0, 16 CPU).

Every verdict below is one of:

- **ships today** — the thing exists, with the gate that keeps it true;
- **not reproducible** — the artifact contradicts the claim, on both surfaces;
- **real, fixed this branch** — built this session, with its own gate and selftest;
- **refused, with a reason** — the ask contradicts a measurement, a ratified rule, or a decision already on
  the books (each named by its `D###`/`S###`);
- **the operator's call** — escalated with pros, cons and a recommendation, not started.

Nothing here was run on a machine other than the native Linux rig, and every number carries the probe that
printed it. Where a number was *not* measured, the sentence says so.

---

## §0 The pattern round 2 stalled

Round 2's diagnosis — page-template edits shipped, shared components did not — is accurate about round 2, and
this branch is deliberately the other way round. The shared files are the ones that were touched:

```
src/components/Navigation.astro   src/components/Footer.astro
src/components/HorizonBand.astro  src/components/WhyJoinUs.astro
src/components/Schedule.astro     src/styles/global.css
```

and the rule the read's criterion 1 asks for is now a detector, not a prose instruction:
`check:page-exit` gained `page-no-home-path`, `check:ext-links` gained `label-repeats-word`, and a new gate
`check:focus` landed with it. All three are in `scripts/gate-run.mjs`, each with a selftest that plants the
defect it exists to catch (§1, §2 and §9 below).

The read's rule "if a task cannot be done because the file it names does not exist, stop and report the actual
structure rather than inventing a workaround" is honoured where it applies: §3 names `hero.webp`, which is not
a file in this tree (§3 below), and §13 names a `check-feed.mjs`, which is not a script in this tree
(§13 below).

---

## §1 P0 — the global shell

**Verdict: not reproducible on either surface. One real item inside it, fixed this branch (the footer heading).**

The read says the header nav and footer are absent from the served HTML on /, /schedule, /chat and /join, that
/schedule and /chat contain no link to `/`, and that only the 404 page links home.

Command (the four pages plus 404, from the rig, one browser-less fetch each):

```
for p in "" schedule chat join; do
  curl -sSL -A 'Mozilla Firefox 149 linux-native rig' "https://staging.matheapolis.com/$p" \
    -o /tmp/srv-$( [ -z "$p" ] && echo root || echo $p ).html -w "%{http_code} %{size_download}\n"
done
for f in root schedule chat join; do
  grep -o 'href="/"' /tmp/srv-$f.html | wc -l
  grep -o '<header[^>]*>' /tmp/srv-$f.html | head -2
  grep -o '<footer[^>]*>' /tmp/srv-$f.html | head -2
done
```

Output @measured 2026-11-15:

```
200 23251   /
200 50378   /schedule
200 21514   /chat
200 15250   /join
=== root      2   <header class="inset-shadow-rule">   <footer class="bg-ink text-band-text">
=== schedule  2   <header class="inset-shadow-rule">   <footer class="bg-ink text-band-text">
=== chat      2   <header class="inset-shadow-rule">   <footer class="bg-ink text-band-text">
=== join      2   <header class="inset-shadow-rule">   <footer class="bg-ink text-band-text">
```

Two `href="/"` on every page, a `<header>` and a `<footer>` on every page. The nav is emitted by the layout
wrapper — `src/layouts/Layout.astro` calls `<Navigation />` before `<slot />` — so there is exactly one shell,
there is no second copy of the nav inside a page body, and no page is a dead end. `404.html` carries three
because its "back to the home page" link is its own.

The same is true of this tree's build (`dist/client/{index,schedule/index,chat/index,join/index}.html`: 2, 2,
2, 2, and 3 on `404.html`).

**The detector the read's criterion 1 asks for now exists.** `npm run check:page-exit` @measured 2026-11-15:

```
check:page-exit — 5 built page(s), 5 closing with the exit band (/, /404, /chat, /join, /schedule)
```

`npm run check:page-exit:selftest` — 11 cases, 0 wrong, and the plantings name the new rule:

```
ok   caught  a band with paths but no way home                    page-no-home-path
ok   caught  a page whose only internal link is to itself         page-no-home-path
ok   caught  clean control: the nav wordmark is the path home     nothing
```

### What is real in §1, and what it costs

**The "Where to next" heading** — the read is right that it was a visible caption; it is deleted (D335). The
`aria-label="Where to next"` stays on the band's `<nav>`, because an unlabelled `nav` inside the footer is a
second unnamed region and axe calls it (that is D331's finding on the other band). Staging still prints the
visible caption — staging is one deploy behind this branch, not a build that lost the nav.

```
staging today: "Where to next" x2   (visible caption + aria-label)
this build   : "Where to next" x1   (aria-label only)
```

### What §1 asks for that is refused, and why

| The read's ask | Verdict | Why |
|---|---|---|
| Date chip as its **own** slot, linking to /schedule | refused | The chip is subordinate to the `Dates` label on the deliberate D311: two slots for one page means two names for it, and `check:naming` (D309) fails that. One anchor carries the label, the chip and the name. |
| Visible chip reads `Sat 21 Nov` | refused, measured | `node design/nav-fit.mjs --no-build` @measured 2026-11-15: `Sat 21 Nov` is 65px, and the row carrying it needs **286 of the 276** the 320 floor offers — 10 over, and the row is `flex-nowrap`, so over is a failed probe, not a wrap (D311). The weekday is in the **accessible name** instead, which is why a screen reader still gets it. |
| aria-label `"Next meeting: Saturday 21 November, 12 pm at Angel Food Bakery — see all dates"` | refused (D330, D333) | SC 2.5.7 asks that an element's accessible name *contain its visible text*. axe-core's `label-content-name-mismatch` — serious impact — flagged the chip on all four pages @measured 2026-11-15 by `node design/axe-check.mjs`; the shipped name leads with the visible words: `Dates 21 Nov, next meeting Saturday, Nov 21`. Their string puts the visible words nowhere, and puts a time and a venue in chrome — `check:dated-surfaces` allows a date only where a ruling put it (D218/D306), and the venue belongs to the row, not the nav. |
| `≤640px`: Chat and Join behind a disclosure toggle | refused | There is no menu on this site to open, and adding one adds a state. The row is one line at every width and it fits: **306 of 346 at 390**, **257 of 276 at 320** @measured 2026-11-15 by `npm run check:render:dist` and `node design/nav-fit.mjs --no-build`. A toggle would buy nothing that the measurement says is out of room. |
| The wordmark slot links to `/` | ships today | `<a href="/" aria-label="Matheapolis, home">Matheapolis</a>`, in the wrapper. |
| Footer carries no second nav copy | ships today | one `<footer>`, one `<nav>` inside it, the whole map. |

Footer contents today — same six links, same order, on both surfaces, but not with the same words. `Footer.astro`
builds its band from the nav table in `src/components/Navigation.astro`, and that table says `Chat`, not
`Community chat`:

```
grep -o '>Chat<\|>Community chat<' dist/client/chat/index.html /tmp/srv-chat.html | sort | uniq -c
      2 dist/client/chat/index.html:>Chat<
      1 /tmp/srv-chat.html:>Chat<
      1 /tmp/srv-chat.html:>Community chat<
```

@measured 2026-11-15. So: this build prints `Dates · Chat · Ways in · Add to a calendar · Join on Meetup ·
Discord`; staging prints the same map with the older chat label, `Community chat`, because its deploy predates
the rename — it is a stale artifact on the label exactly as it is on the "Where to next" caption above.

What that leaves refused from the read's footer line is the **word for the join slot** — their `Join` against our
`Ways in`, refused by D309 (the nav label is the page's canonical name, and `/join`'s H1 is `Ways in`), and the
**order**, which is the operator's call: one line in `Footer.astro`, no gate asserts an order, and nothing in the
measurements prices one. Their `Chat` for the chat slot is already shipped, which is why it is not in the refusal.
Recommendation: adopt their order, keep our names, because the order is `reversible` and the names are not.

---

## §2 P0 — doubled link text

**Verdict: not reproducible. The bug class is real; the detector for it is now a gate.**

Command, over all five fetched pages:

```
grep -c "Meetup Meetup\|group Meetup\|new tab→" /tmp/srv-*.html
```

Output @measured 2026-11-15: `0` in every file — `/tmp/srv-chat.html:0 /tmp/srv-join.html:0 /tmp/srv-nope.html:0
/tmp/srv-root.html:0 /tmp/srv-schedule.html:0`. The strings that ship are the read's own corrected strings:

```
/schedule row : "Sign up on Meetup"        (aria-hidden arrow span separate, sr-only qualifier ", opens in a new tab")
/join Meetup  : "Join the Meetup group"
/join Facebook: "Join the Facebook group"
/join Discord : "Join the Discord chat"
```

`npm run check:ext-links` @measured 2026-11-15:

```
check:ext-links — 5 built page(s), 33 outbound anchor(s), 33 with the sr-only qualifier, 33 link(s) held to the rules
  every outbound link: rel carries noopener, the qualifier is sr-only, no platform named twice.
```

`npm run check:ext-links:selftest` — **18 cases, 0 wrong**, and the planting is the read's exact string:

```
ok   caught  the platform repeated in the suffix              name-repeats,label-repeats-word
ok   caught  the exact string the round-3 read quoted         qualifier-visible,label-repeats-word
ok   caught  a doubled word with no platform involved         label-repeats-word
ok   caught  clean control: a hyphenated name is not a repeat nothing
```

`label-repeats-word` is their build test ("no anchor's text content may contain the same word twice in a row"),
and `qualifier-visible` is the second half ("`opens in a new tab` may appear only inside one visually-hidden span").

### The arrow's form: refused, with the reason, and an admission

The read asks for an inline `<svg aria-hidden="true">` arrow with a 0.35em left margin, "never a `→` character
glued to text". Two things:

1. It is **not glued**. Each arrow is its own `<span aria-hidden="true">→</span>` after the label, and axe-core
   reports zero `label-content-name-mismatch` and zero text-order findings on it @measured 2026-11-15.
2. An inline SVG per arrow is refused against this repo's own mark grammar (S026, D294, D296, D297): the glyph
   data behind the marks is printed **once per page** by `src/components/SignUpLinks.astro` as a sprite, and
   `scripts/check-sprite-claim.mjs` is the gate that keeps that sprite out of the layout shell — measured at
   +2,201 gzip bytes (41.3% of /chat's 5,327) for pages that paint no mark, @measured 2026-11-13 by
   `node design/mark-cost.mjs`. Thirty-three outbound anchors would carry thirty-three copies of an arrow, and
   the site would pay that per page. **The byte delta of a 33-copy inline arrow is not measured here** — the
   refusal is reasoning from the sprite arithmetic, and if the reviewer wants that number, it is one probe
   (`node design/mark-cost.mjs` on a page rebuilt with SVG arrows) and it will be reported when run.

Recommendation if the reviewer still prefers the SVG: one shared `<svg><symbol>` in the shell plus 33
`<use href="#arrow">` is the form that costs the sprite's arithmetic without the 33 copies; that is a different
ask from theirs, and it is the operator's call because it touches the mark grammar.

---

## §3 P0 — alt text

**Verdict: ships today, with a gate. One of the read's rows cannot be applied as written.**

`npm run check:alt` @measured 2026-11-15:

```
check:alt — 4 described alt(s) + 5 declared-decorative plate(s) across 5 built page(s); longest 12 words on /:
"Arcs cut from two centres, with a circle tangent to all four"
word counts: 9x1 10x1 11x1 12x1
```

So: every `alt` is ≤12 words (longest is exactly 12), and five plates are declared decorative with `alt=""` —
that is the read's event-art rule, shipped.

**`hero.webp` does not exist in this tree.** The hero is an inline SVG sign (`data-mark="hero"`, `role="img"`,
`aria-label="Two parallel lines leaving a sphere's equator and crossing at its pole"`), which `check:mark`
measures as a 346x216.3 drawing at 390 (viewBox 240x150, 8/8 shapes) @measured 2026-11-15 by
`npm run check:render:dist`. There is no `<img>` there to put an alt on, and the engraving set the read's alt
would describe is not this site's mark. Its own caption sits under it.

The captions ship at the read's spec (14px, muted) — the built page prints, under each plate:

```
Detail of a coloured engraving after John Byrne's 1847 Eucli…
The elements of Euclid for the use of schools and colleges (…)
Plane geometry, with problems and applications (Slaught & …
The principles underlying radio communication (National Bure…
```

Same four sources the read's §3 table cites. What differs is the **alt wording**: ours describes what each of our
cropped plates actually shows (their `horizon-euler1910` alt and ours agree; the others are our own crops).
`check:alt`'s rule is the invariant the read is asking for — a description of the picture, source in the caption —
and its selftest plants a provenance-in-alt and a too-long alt.

Event art: kept, and declared decorative (`alt=""`), which is the read's first branch of "keep them only if they
are treated as standing illustrations per event *type*". They are per type, and the name the row carries is the
event's, not the image's.

---

## §4 P1 — page naming

**Verdict: the table is mostly already shipped; three of its label swaps are refused (D330).**

`npm run check:naming` @measured 2026-11-15:

```
check:naming — 5 built page(s); nav names: Matheapolis -> /, Dates -> /schedule, Chat -> /chat, Ways in -> /join
  /: 3 label(s) — "Matheapolis", "Matheapolis ∑", "Back to the home page"
  /chat: 3 label(s) — "Chat", "Recent Discord summaries", "the messages we post there"
  /join: 3 label(s) — "Ways in", "Join Our Group", "Join the club"
  /schedule: 5 label(s) — "Dates", "See the dates", "All 5 dates →", "Our schedule page", "schedule"
```

`npm run check:outline` @measured 2026-11-15:

```
/: h1 Matheapolis | h2 What we take up | h2 When we meet | h3 How it works
/chat: h1 Summaries from the chat | h2 What the club is pulling on | h2 The chat itself
/join: h1 Ways in | h2 Follow the club | h2 Come to a meeting | h2 Talk with us now | h2 What we do | h2 Your first one
/schedule: h1 Dates | h2 MPLS Math Club Social | h2 Common Denominator - Study Session | …
5 page(s), every ladder starts at h1 and never skips a level.
```

| Item | Verdict | Evidence / reason |
|---|---|---|
| Keep `/schedule`, do not rename routes | ships today | `src/lib/ics.mjs`, the sitemap, `check:site-host` and the domain runbook name the path; renaming is `costly` and MS15 parked it with that trigger. |
| H1s: `Matheapolis` / `Dates` / `Chat` (page name) / `Ways in` | ships today | the outline census above. `/chat`'s H1 is `Summaries from the chat`, which is the read's own subtitle text — the page already answers to it. |
| Delete all four eyebrows | ships today | `HeroSection.astro:78` keeps `Minneapolis math club` as a **subtitle under** the h1 (`<h1>Matheapolis</h1><p …>Minneapolis math club</p><p …>We meet around a table…`); the `/schedule` and `/join` and `/chat` eyebrows are gone. `check:naming`'s selftest plants an eyebrow above the h1 and fails it. |
| Home H2 → `The calendar` | refused (D330, reverses S035/D309) | The home H2 is `When we meet`; `/schedule`'s H1 is now `Dates`, and `When we meet` is the same words the section has always carried in prose. Renaming it to `The calendar` re-uses the deleted `/schedule` eyebrow for a different block — two blocks answering to one name, which is what D309 exists to prevent. Recommendation if the reviewer insists: `What we take up` is the home's other H2, so a distinct third name is available; it costs the same, and nothing measures it. |
| Subtitle lines under H1 | refused (D330) | `/schedule`'s proposed subtitle ("When we meet, where, and where to sign up") restates the row grammar the page prints; `/chat`'s proposed subtitle restates its H1. Two of the four rows would add a line that says what the line above it already says. |
| Body link text: `View Schedule` → `See the dates` | ships today | `/schedule`'s alias list above carries `See the dates`. |
| `Join Our Group` → `Ways in` | refused (D309) | the band's link is a **path into** the join page; the read's own rule 1 ("a single component fix must not be re-done per page") is why the name lives in one place. `check:naming` counts prose aliases like `Join Our Group` and reports them rather than failing them, because an alias in a sentence does a different job from a nav label. |
| `All 5 dates →` → `All dates →` | refused, measured | the printed form is `All ${win.shown.length} dates` — the 5 is the window, not a literal (see §8a). Deleting the count removes the one number the reader uses to know the page is current. |
| Eyebrow sits ≤8px above the H2 if it keeps a label | nothing to measure | the home band's H2 has no label above it: `<section aria-labelledby="when-we-meet"><div …><div class="text-center"><h2 id="when-we-meet" …>When we meet`. The section is named by its own heading (D331's form). |
| Separator: ` - ` in titles vs the read's ` — ` | recorded, not changed | `Matheapolis - a Minneapolis math club`, `Dates - Matheapolis`. The em dash is a display glyph; `check:figures` and `check:copy` read these strings literally, so the swap is a gate rewrite, not a fix. Flagged for the operator, not performed. |

---

## §5 P1 — the next date on the home page; the timezone

**The timezone ships. The home date reverses a decision the operator made.**

`Central` on `/schedule`, once, on the first row:

```
grep -o '[A-Za-z0-9: –-]*pm Central' dist/client/schedule/index.html
 12:00 pm – 1:00 pm Central
```

`npm run check:row-geometry` asserts the zone is named once and only on the page of record:

```
check:row-geometry — 5 row(s) across 1 page(s); measure 32em ≈ ~70 characters of serif prose at 0.455 em/char; zone named on 1 page(s), first row only (/schedule)
```

The home date is the operator's call. `npm run check:dated-surfaces` @measured 2026-11-15 prints *why*:

```
check:dated-surfaces — 4 built page(s), 1 printing a date
  /schedule    Nov 21   (D218 — the page of record … Since D306 it is the ONLY one: the homepage's one-date band
                was removed on the operator's `/join` objective, and its entry here was deleted in the same
                commit that stopped printing the date (2026-11-14).)
```

- **Option A — put the date back on home (the read's ask).** Pros: criterion 6 is met, the visitor stops
  needing a click for the only fact they came to check; the hero gets the read's order. Cons: it reverses
  D306 (the operator's own ruling, made on the `/join` objective); the home page becomes a dated surface, so
  every "no stale dates" rule now has a second page to police, and `check:dated-surfaces` has to grow a second
  allowed entry plus a rule that the home date equals the first row of `/schedule` (D311 already writes that
  rule for the nav chip, so the mechanism exists); the pitch line the band carried was the pointer the read
  says is now in the way. Access: none new — delegate can build it, the operator decides. **Recommendation:
  yes, take it**, on the reading that D306 was about a *band* that duplicated `/schedule`, not about the site
  never naming the next meeting.
- **Option B — the nav chip is the answer (already ships from 380px).** Pros: no second dated surface, no gate
  rewrite, the date is in chrome and therefore on every page; measured to fit (306 of 346 at 390). Cons: at
  320 the chip is hidden, so the smallest target the repo holds is the one page where the date is not stated.
- **Option C — a date in the hero lede as prose.** Refused on the measurement, not on the ruling: a bare date in
  prose is exactly what `check:dated-surfaces` fails today (its selftest plants "one written as bare prose"), and
  a prose date is a literal that goes stale between builds.

The one measurement that would change the ranking: `npm run check:render:dist` on a hero that carries the
sentence, at 320 — if the hero's primary control breaks its 48px grammar there (it is the site's binding
constraint at the floor, D114/D117), option A is not shippable and B wins.

---

## §6 P1 — event rows: one action each

**Verdict: three of the four asks already ship; the one-action-per-row restructure is the operator's call.**

| Ask | Verdict | Evidence |
|---|---|---|
| Wrap the date rail in one `<time datetime=…>` whose text is a sentence | ships today | `check:row-geometry` @measured 2026-11-15: `5 row(s) … its date a <time>` — and its selftest plants the five-fragment rail the read describes. This is D327, written against the round-2 read. |
| Row titles become H2 | ships today | the outline census above: `/schedule: h1 Dates | h2 MPLS Math Club Social | h2 Common Denominator - Study Session | …`, and `check:outline` prints `every ladder starts at h1 and never skips a level`. |
| Copy zone capped, rail sized | ships today | same gate: `measure 32em ≈ ~70 characters`; its selftest plants a row that exceeds the zone. |
| One primary link per row; Discord/Facebook demoted to a quiet secondary row | the operator's call | The read wants a `Chat · Facebook · Add to calendar` row after the first row only. That is D327's second half, already refused once: the standing resources are one cluster per page (`SignUpLinks.astro`), the RSVP promises the cluster's shape (`check:rsvp-page`, and `check:rsvp-promise` in the deploy set), and a page-level quiet cluster plus five row-level primaries means two competing "where do I click" devices on one page. Pros of taking it: the row answers one question, and the standing resources stop implying they are per-event. Cons: `check:rsvp-page` and `check:rsvp-promise` have to be rewritten for a new state, and the mobile row loses the cluster the visitor uses to get to the chat. Recommendation: keep one primary per row (the row is already one action — the cluster's *primary* is per-row and is the accent-filled control), and demote the standing resources once per page rather than once per row; that is what ships. The measurement that would change this ranking is `npm run check:space` at 390 with both devices present: if the page's rhythm report shows the second cluster inside the row's cap zone, the ask is not shippable. |

---

## §7 P1 — one source of truth for dates

**Verdict: the read's §7a claim is not reproducible on staging or on the built bytes; the per-type DESCRIPTION
ships; the name normalisation is a real ask and belongs to MS25.**

Feed bytes, fetched from staging today, and from this tree's build:

```
curl -sSL … https://staging.matheapolis.com/events.ics   -> 200, 7665 bytes
grep -c 'BEGIN:VEVENT'   7      grep -c 'STATUS:CANCELLED'   0      grep -c 'STATUS:CONFIRMED'   7
local  dist/client/events.ics   7 VEVENT, 0 CANCELLED
```

`npm run check:ics` @measured 2026-11-15, which is the gate that does the read's grouping assertion:

```
note  1 row(s) superseded by the grouping (D318): 99df9996-f213-498e-a661-8bffddfdf115 (a live row in the
        same group (649bf59a-1989-43c2-b336-46f79ce403b1) supersedes this CANCELLED row) — they stay in
        data/events.json and are never published
check:ics — 8 row(s), 184 content lines, 7665 octets, 0 finding(s) from 18 rules
```

That is their algorithm, shipped: group by (date, venue, type); drop CANCELLED when a CONFIRMED is in the group;
log the dropped UID (the `note` line is the log). Their assertion "no two VEVENTs share a DTSTART date" is
**not** what the site asserts, and should not be: the club has two confirmed dates on some months deliberately.
What the gate asserts is that no date carries a CONFIRMED and a CANCELLED of the same group.

Per-type DESCRIPTION, from the built file @measured 2026-11-15:

```
DESCRIPTION:Around a table in a coffee shop or a bakery in Minneapolis\, wo…
DESCRIPTION:Work on your own mathematics while the table works on its own …
```

No Mobilizon boilerplate survives; `src/lib/event-description.mjs` writes it in the site's voice, and the read's
"discussing algorithms of most any kind" / "attendees would post a comment before the date" strings return
nothing in the built bytes.

**The name normalisation is real** and is not done: the rows print the source's names (`MPLS Math Club Social`,
`Common Denominator - Study Session`), `/join` defines two formats, and the chat summary names a third
("Joyful Math"). This is the N1 open question on the events milestone (MS25): *who owns the vocabulary* — the
source, or the site. It needs a letter because it changes what the data says, not what the markup looks like.
Recommendation: the site owns the vocabulary; the build maps source names to the two formats and refuses a name
it cannot map (a rule with a detector, so it fails at build time instead of shipping a third format).

---

## §8 P2 — content and structure defects

**a) Hardcoded quantities — not reproducible.** Their own command, run against `src/`:

```
rg -n 'All [0-9]+ dates|15 of them|[0-9]+ days ago' src/     -> no matches (exit 1)
```

What ships is computed: `All ${win.shown.length} dates` and `The club has used ${venueCount} of them.`
(`Schedule.astro:309`/`:357`), and the provenance stamp goes through `provenanceStamp()` (§f). The build prints
`All 5 dates`, `used 15 of them`, `last read 12 days ago` — those are the computed values at build time, which
is why the read's grep against compiled HTML was misleading. Criterion 8 is met in the form they wrote it.

**b) Home line 47 — ships today.** What the page prints @measured 2026-11-15:

```
The club's list of members is its Meetup group page, last read 12 days ago — the list is not the room.
```

Sentence case, and the number is the measured age (the 11-days text the read quoted is one build older).
`check:provenance` keeps the form relative below 30 days and absolute beyond, in one component on both pages.

**c) A third event name — real, see §7's N1.** Same decision; not two answers.

**d) Thread list.** Cap six ships, with a gate; the two-column rung ships **one rung wider** than the read asks;
the bold-name split does **not** ship.

```
check:threads — cap 6, 9 thread(s) in content.json, 6 painted on / @measured 2026-11-15 by this gate
  3 thread(s) reachable through /chat#threads
```

The cap is `const VISIBLE = 6` in `WhyJoinUs.astro` and the gate reads it out of the component (no second `6`).
The list is `<ul class="mt-6 grid grid-cols-1 gap-x-8 md:grid-cols-2">` — two columns from `md` (768), not 900;
the read's 900 is the site's `lg`-adjacent width and the repo's own flip is measured by `check:space`, so this
is answered as "ships at 768", not as a change. The items are `<li class="py-2 text-body leading-prose font-body">`
— one prose sentence each. The bold 3–5-word name + `--ink-muted` remainder is **not shipped**: it would put a
second type tier inside a sentence in `content.json`, which is data a non-developer edits from a phone
(`content.json threads._rule` is the authority), so it needs a field, not markup. That is a real new ask;
recommendation: add `name` + `note` fields to the thread objects and let the component paint the pair — it is
`reversible`, it keeps the copy editable, and `check:threads` grows one rule. Not started this branch, because
it rewrites nine items' data shape and that is a milestone, not a fix.

**e) `/chat` heading ladder — ships today.** `check:outline` above: `/chat: h1 Summaries from the chat | h2 What the
club is pulling on | h2 The chat itself`. No H3→H4 skip survives.

**f) Provenance relative — ships today.**

```
check:provenance — 43 source file(s), 5 built page(s), threshold 30 days @measured 2026-11-15 by this gate
  /: age — last read 12 days ago
  /schedule: age — Copied from the club's own calendar 2 days ago
```

One register, one threshold, every line through `provenanceStamp()` — the read's "same component on both pages"
is the gate's claim, and `check:provenance:selftest` plants an absolute date below the threshold.

**g) The UTC word ships, twice.** `src/components/DiscordSummary.svelte:134` `Last summary written {lastUpdatedLabel}
UTC` and `:149` `… last updated {lastUpdatedLabel} UTC`. The read's "say UTC once" is therefore already satisfied;
switching the chat stamps to Central is refused on the arithmetic: the stamps are channel activity, not club
events, and D188 makes the event clock the one place the site resolves a zone.

---

## §9 P2 — design tokens: audit, then enforce

**The audit exists as a script, and it is deliberately not a gate. The enforce half is two rules that now have
detectors.**

Commit 1, exactly as asked — `node scripts/audit-tokens.mjs` @measured 2026-11-15. Its sections, with the
counts and the file:line for each finding:

```
=== 1. paint literals ===
26 literal paint value(s) in src/ after comments are stripped; 1 shipped stylesheet(s) carry 103 literal(s).
  src/styles/global.css:63  oklch  oklch(97.35% 0.0139 88.7)
  … 23 oklch writes, all in src/styles/global.css …
  src/styles/global.css:134 rgb rgba(23, 19, 12, 0.165)
  src/styles/global.css:135 rgb rgba(23, 19, 12, 0.22)
  src/styles/global.css:135 rgb rgba(23, 19, 12, 0.3)
  (check:contrast rule 7 is the detector for any of these outside src/styles/global.css)
=== 2. grounds and text colours in the shipped stylesheet ===
distinct background colours: 17
distinct text colours: 60
=== 3. spacing not on DESIGN.md's ladder (4 8 12 16 24 32 48 64) ===
  13px  x2   1px  x1   7px  x1
=== 4. outlines ===
outline-suppressing rules in src/: 0
focus-visible rules in the shipped CSS: 6
interactive elements in the artifact: 91; carrying their own ring utility: 67; covered by the global rule: 24
=== 5. every text colour against the ground its own markup gives it ===
  band-text on ink    16.43   5 element(s)   clears 4.5
  ink on paper        17.15   5 element(s)   clears 4.5
  2 distinct text/ground pairs in the artifact; 0 under 4.5
=== 6. the round-3 read's eight hex tokens, measured ===
  --paper         #FAF6EC  oklch(97.35% 0.0139 88.68)   on shipped paper 1     on shipped ink 17.15
  --paper-raised  #FFFCF3  oklch(99.09% 0.0123 91.51)   on shipped paper 1.05  on shipped ink 18.04
  --ink           #17130C  oklch(18.92% 0.0149 81.44)   on shipped paper 17.15 on shipped ink 1
  --ink-muted     #5C5546  oklch(45.17% 0.0252 85.94)   on shipped paper 6.84  on shipped ink 2.51
  --rule          #DFD6C2  oklch(87.79% 0.0287 86.65)   on shipped paper 1.34  on shipped ink 12.81
  --accent        #A2432A  oklch(50.57% 0.1321 35.74)   on shipped paper 5.77  on shipped ink 2.97
  --accent-strong #7E3320  oklch(42.22% 0.1090 35.35)   on shipped paper 8.17  on shipped ink 2.1
  --accent-wash   #F0E2D0  oklch(91.92% 0.0285 74.29)   on shipped paper 1.18  on shipped ink 14.53
  --amber         #E9A63F  oklch(77.18% 0.1395 74.17)   on shipped paper 1.95  on shipped ink 8.8
```

Two things the read should take from §6. **Its palette is already this palette** — D316/S039 adopted all nine hexes,
mapped onto the repo's role names, and re-solved where they did not clear the repo's own bars; the oklch values
above are the same colours in this repo's one OKLab implementation (`design/grill/okcolor.mjs`, D101), which is
why the compiled CSS the read could not read for three rounds carries no hexes. **And `--rule` measures 1.34 on
our paper** — which is why `--rule` is a borders-only token here and cannot be pasted as a text colour:
`check:contrast`'s boundary bar is 3.0, and `npm run check:contrast` @measured 2026-11-15 reports
`23 colour tokens, 39 asserted pairs … ok every pair clears its bar`. (The 1.34-vs-3.0 comparison is arithmetic
the audit printed; `check:contrast` was not re-run against their literal palette, so treat that as arithmetic,
not as a gate result.)

Commit 2, enforce — what the read's non-negotiables map onto:

| Non-negotiable | Status | Detector |
|---|---|---|
| one accent hue for links, `::selection`, `:focus-visible` | ships | `Layout.astro` pastes `::selection { background: var(--color-ink); color: var(--color-paper) }` (the pair measures 17.15); the ring is `var(--color-accent)`; `check:contrast` refuses a banned pair (`accent on tint` is named as a grammar rule, 4.89). |
| `2px solid var(--accent-strong)` ring, 2px offset, never `outline: none` | **changed, and the token differs** | `check:focus` @measured 2026-11-15: `global ring rule: a:focus-visible,button:focus-visible { outline:2px solid var(--color-accent);outline-offset:2px }` — 2px, offset 2px, **`--color-accent` not `--accent-strong`**, because the ring has to clear 3.0 against the ground it stands on and the gate's `ring-under-bar` rule refuses a token under that bar; the band's controls take `--color-band-text` and the path-coloured marks take `--color-blue-600`. `outline-suppressing rules in src/: 0`, `91 interactive element(s); 67 carry their own focus-visible outline utility, 24 rely on the global rule (before 2026-11-15 those 24 had no ring at all)` — that is the real gap the read's criterion 9 was pointing at, closed by D328. |
| no pure `#000` | ships | §1 above: every literal is an oklch token or an `rgba(23,19,12,…)` shadow. |
| links underlined always | ships | `check:css-utilities` (in the deploy set) and D103's no-border rule. |
| no dark mode | ships | no `prefers-dark`/`@media (color-scheme)` write; `check:ground` measures the painted grounds instead. |
| scale 4/8/12/16/24/32/48/**72/96/128** | refused, with numbers | this repo's ladder is 4/8/12/16/24/32/48/**64** (S3, `check:scale` fits "65 of 66 writes"). The read's upper steps do not appear anywhere in the tree; `72/96/128` would be new writes, and `check:scale`'s selftest fails an off-ladder step. What the audit did find off-ladder: `13px x2, 1px x1, 7px x1` — one of those is the hairline (1px is the grouping rule, not spacing) and the rest are reported for the operator, not silently re-rolled. |
| prose measure 66ch | refused, measured | the repo's cap is `32em ≈ ~70 characters` at the shipped serif (`check:row-geometry` @measured 2026-11-15, 0.455 em/char). `ch` is a per-glyph unit and this site's prose is a serif whose average char is not 1ch; the em form is the one the gates can measure. |
| radii ≤2px | ships | `check:classes`/`check:scale` read the radius tokens; controls are `rounded-control` (the ratified step). |
| no shadows | refused, named | the repo ships an **inset ring** (D103: an inset ring is not a border), measured at **3.66** against the paper it stands on @measured 2026-11-14 by `npm run check:contrast`; deleting it deletes the device that makes the header read as chrome (S027/D295 priced every painted ground and refused all of them: panel 1.04, tint 1.10, warm tint 1.11, warm band 1.20, accent fails outright). `check:render` reports `rings 4 … shadows 4` per page and its selftest fails an unratified shadow. |

`audit:tokens` exits 0 whatever it prints, and that is deliberate: its header says so, and the detectors are
`check:contrast`, `check:scale` and `check:focus`. A report in the deploy set would make a palette note look
like a ship blocker (D328).

---

## §10 P2 — images and graphics

**One real gap, fixed: the plates were vanishing below 1024px.** Three asks are parked, and one ships.

The horizon band was `hidden lg:block`, which did nothing at all — Astro compiles the component's styles to
`.horizon__plate[data-astro-cid…]` (specificity 0,2,0), which beats a utility, so the hiding and the showing were
both dead. The fix is real media-query rungs (D329, which lifts D168's park): default 100% wide, `≥640`
`calc((100%-1rem)/2)`, `≥900` `calc((100%-2rem)/3)`. That is exactly the read's `3-up ≥900 / 2-up 640–899 / 1-up
below`, and intrinsic width/height are set on every plate (`width="688" height="562"`, `768/268`, `698/351`,
`768/358` in the built markup).

`node design/plates-price.mjs` @measured 2026-11-15 (it rebuilds, then measures the built page at four widths):

```
@ 1240px viewport — page 2809px tall
  shipped (3-up >=900, 2-up >=640, 1-up below) +   0px  band   332px   painted 192964px²  [382.6x133.5 382.7x192.4 382.6x178.4]
  hidden below lg (what round 14 shipped)       +-332px band     0px   painted      0px² (nothing painted)
@ 640px — shipped band 472.3px, painted 104819px² [282x98.4 282x141.8 282x131.5]; hidden below lg: +472px, 0px²
@ 390px — shipped band 714.6px, painted 157776px² [346x120.7 346x174   346x161.3]; hidden below lg: +715px, 0px²
@ 320px — shipped band 622.3px, painted 100409px²; hidden below lg: +623px, 0px²
```

Read those first rows as the answer to "is the triptych worth its cost": at 390 the band is 714.6px of a
4740px page (**15%**) and paints 157,776px² of engraving; keeping the old classes would have deleted 715px of
page and every one of the plates. At 1240 it is 332px of 2809 (**12%**) — the same band, one third the share.

| Ask | Verdict |
|---|---|
| Event art: keep as standing illustrations per **type** with `alt=""`, or drop | ships (first branch): kept, declared decorative, `check:alt` counts 5 of them. |
| Triptych rungs with intrinsic sizes | ships this branch (above). `check:mark` keeps each plate's aspect (its selftest fails a squashed plate). |
| Add one original line drawing in the plates' language, ~1200 bytes of SVG | ships: `check:line-art — 5 page(s), 1 drawing(s), cap 1200 bytes / 12 words; /chat "undoable-steps": 622 bytes, 9 stroke(s), label "A wire running through three boxes, and the same path traced back"`. Hairlines, `currentColor`, no fills, under the cap, captioned. |
| Promote ∑ to a real mark: header lockup | parked, MS25 ask. `nav-fit` prices it: the row with `∑ Matheapolis` needs **328 of 346** at 390 and **279 of 276** at 320 — **3px over the floor**, so the lockup cannot ship at the repo's own minimum width without a label change. That is the measurement that decides it. |
| favicon.svg | ships: `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` in the wrapper; there is one favicon and it is the mark. |
| OG card 1200x630, hand-composed | parked, MS25. The tag exists (`og:image`, `og:image:width 1200`, `og:image:height 630`) and `check:social:live` verifies what the crawler fetches; choosing *which* engraving is cropped to the right third is the operator's call, and the auto-crop the read warns against is what the current artifact does. |
| ∑ on the 404 page | parked, MS25 ask; the 404 page ships its own mark today. |

---

## §11 "Do not change"

Honoured. The three strings the read names still ship, on the pages that carry them @measured 2026-11-15:

```
dist/client/index.html           Whether the room is your kind of room | the list is not the room
dist/client/chat/index.html      The invite is the button below
```

`A book, a room, and whoever shows up` is not in the tree and has not been since the operator rebranded the club
on 2026-11-07 (`HeroSection.astro:52` records it); the read is quoting a retired line from a round-1 note, and
there is nothing to preserve. The hand-off model (Meetup sign-up, Discord chat, `.ics`) is unchanged in shape;
the engraving set is still the identity; there are no agendas, syllabi or member walls.

---

## §12 The acceptance criteria, as results

| # | Verdict | Command | Output @measured 2026-11-15 |
|---|---|---|---|
| 1 | **met** | the curls above; and `npm run check:page-exit` + `:selftest` | 2 `href="/"` per page on all four, `<header>`/`<footer>` on each; `5 built page(s), 5 closing with the exit band`; 11 selftest cases, 0 wrong, `page-no-home-path` planted twice. |
| 2 | **met** | `npm run check:ext-links` / `:selftest`; `grep -c "Meetup Meetup" /tmp/srv-*.html` | `33 outbound anchor(s) … 33 held to the rules`; 18 cases, 0 wrong; 0 doubled strings on staging. |
| 3 | **met** | `npm run check:alt` | `4 described alt(s) + 5 declared-decorative … longest 12 words … counts 9x1 10x1 11x1 12x1`. |
| 4 | **met** | `npm run check:naming`, `npm run check:outline` | the censuses above; `every ladder starts at h1 and never skips a level`; five distinct `<title>`s (§4). |
| 5 | **met** | `npm run check:render:dist`, `node design/nav-fit.mjs --no-build`, `npm run check:dated-surfaces` | nav row needs `306 of 346` at 390 with the chip painting; the chip equals the first date `/schedule` prints; `4 built page(s), 1 printing a date — /schedule Nov 21`. |
| 6 | **not met, deliberately** — D306, escalated in §5 | `npm run check:dated-surfaces` | the home page states no date; the operator ruled the one-date band out on 2026-11-14; §5 gives the options and recommends taking the date back. |
| 7 | **met, with a correction to the assertion** | `curl … /events.ics`, `npm run check:ics` | 7 VEVENT, 0 CANCELLED, 7665 octets, `0 finding(s) from 18 rules`; the dropped UID is logged. "No two VEVENTs share a DTSTART date" is not the site's rule and is refused in §7. |
| 8 | **met** | `rg -n 'All [0-9]+ dates\|15 of them\|[0-9]+ days ago' src/` | no matches, exit 1. |
| 9 | **met** | `npm run check:focus`, `npm run check:focus:selftest`, `npm run check:contrast` | `outline-suppressing rules in src/: 0`; one global ring 2px/offset 2px/token colour; 91 interactive elements, 24 of them now covered by the global rule they had no ring under before; 14 selftest cases, 0 wrong; contrast `every pair clears its bar`. |
| 10 | **met** | `node design/axe-check.mjs` | `axe-check: 8 page x width cells, 0 violation(s) total` — axe 4.14.0, 390 and 1440, on `/`, `/schedule`, `/chat`, `/join`. Residuals are `color-contrast` **incomplete** nodes, not violations: `<span aria-hidden="true">→</span>` x4/x16, `<span aria-hidden="true" class="text-accent-on-ink">∑</span>` x1/x2, `<span class="text-ink-2"> — foundations, and why…</span>` x2 — axe cannot resolve this repo's cascade for those spans; the same pairs are asserted numerically by `check:contrast` (`band-text on ink 16.43`, `ink on paper 17.15`, 0 pairs under 4.5). Treat "axe could not decide" as unresolved, not as clean. |

Two of axe's findings were real and are closed in this branch: `label-content-name-mismatch` on the nav chip of
all four pages (D333 — the chip's visible words are now inside its accessible name), and one unnamed region
(D331 — a `section` that is a region by default got `aria-labelledby`). Both were planted as selftest cases
before the fix was written.

**On the dependency question (criterion 10 asked for axe-core):** the read's own rule 3 forbids adding
dependencies, and no dependency was added. axe-core 4.14.0 is fetched once into gitignored scratch (`.design/axe.min.js`)
and injected as a `--prelude` script into the Firefox harness this repo already has
(`design/grill/dist-measure.mjs`), so the probe is `node design/axe-check.mjs` and it prints, exits 0, and is
**not** in `verify` (D332). Cost of not putting it in the deploy set, stated: it needs network and eight Firefox
spawns, on top of a browser set that already costs 138.2s of work under load (frozen baseline 96.7s at load 9.80
free CPU, this run 0.00 free) @measured 2026-11-15 by `npm run verify:browser`. A rig-config-style audit that
needs a live network cannot be a deploy gate (D73's topology, same reason as `check:discord`), which is why it is
run by hand and its verdict quoted.

---

## §13 Their verification block, translated to what this repo actually runs

| Their line | Status | What to run instead |
|---|---|---|
| `npm run build && npx serve dist &` | works, and there is a better habit | `npm run build` (33.7s–56.4s @measured 2026-11-15, load-contended); `npx serve dist` then 404s on the paths this site builds with directory-less outputs — the gates probe the artifact directly. |
| `node scripts/audit-tokens.mjs` | ships, exactly as named | it exists; report-only (§9). |
their feed checker (`check-feed.mjs`) | **does not exist**, and the read's rule 4 says report that rather than invent one | the assertion lives inside `npm run check:ics` — 18 rules, including the grouping and the no-CANCELLED-alongside-CONFIRMED assertion, with its own `check:ics:selftest`. |
| the `axe-core/cli` invocation | replaced, on their own rule 3 | `node design/axe-check.mjs` (§12 row 10). |
| `curl -s localhost:3000/schedule \| grep -c 'href="/"'  # expect ≥1` | the real site needs an origin | `curl -sSL -A 'Mozilla Firefox 149 linux-native rig' https://staging.matheapolis.com/schedule \| grep -c 'href="/"'` → `2`. The rig's user-agent matters: Cloudflare's cache answers a default agent with a different document (the cf-cache-status HIT/HMISS flip that §1's curls depend on). |
| — | and the whole set in one line | `npm run verify` (deploy set), `npm run verify:browser` (9 browser steps), `npm run verify:rig` (the rig-config steps, kept out of the deploy set so a rig defect cannot look like a product defect). |

---

## §14 Sequencing, and the offer

Their sequencing (§1–§3 first) was the order I worked in: the nav, the footer and the link-text rule went in
before anything else, and all three now have detectors.

**The offer, answered in the one place it was asked for three rounds running.** Here are both files, verbatim, and
the reason the screenshots are not attached: the repo has a measurement gate that reports the same thing as
numbers, which is what the read's "as pixels rather than as markup" is for. `npm run check:render:dist` prints, per
page per width (1240/640/390/320), the nav row's needed-vs-available, the mark's box and aspect, the band heights,
the rings, and the text boxes — e.g. @390 `nav 17.6px/40px 13.3px/32px 13.3px/32px 13.3px/32px wrap nowrap/nowrap
gap 16px/16px needed 306 of 346`, and `mark hero 346x216.3 at 16,1328.1 (viewBox 240x150, scale 1.442, shapes 8/8,
ratio 0.625 vs 0.625)`. If pixels are wanted anyway, the probe writes `dist/client/rendered--<route>.<width>.html`
snapshots and `.design/render/` holds full-page PNGs at 1240 and 320 (`color-root-1240.png`, `color-root-320.png`);
say which pages and widths and they will be attached.

Appendix A — the global stylesheet, verbatim (`src/styles/global.css`, the file that was unreadable for three
rounds; it is 1 `@theme` block plus the site's few rules, and every colour decision in it carries its measured
rationale).

Appendix B — the layout wrapper, verbatim (`src/layouts/Layout.astro`).

## Appendix A — `src/styles/global.css`, verbatim

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

/* Design tokens — ratified 2026-11-01 by `design-ratify` (phase 3 of the design-system pipeline).
   Machine record: design/decisions.json (34 keys) + design/state.json. Measured numbers:
   design/grill/contrast/out/*.txt — every ratio below was read back out of the Firefox renderer,
   not computed from the oklch by hand (design/grill/contrast-oracle.mjs). Rules and "never" lines:
   DESIGN.md at the repo root. Expensive-to-reverse reasoning: design/records/.

   This branch changes TOKENS ONLY. No markup moved, so the shipped pages still render exactly as
   before except that the 18 transition writes which inherit a default now inherit `linear` for
   colour instead of Tailwind's ease-in-out (D-round5: linear for colour, ease-out for movement).
   The old palette entries below are marked RETIRED-IN-APPLY and stay until the markup stops using
   them — deleting a token before its class write goes away is what `check:classes` exists to catch. */

/* One focus ring, for every link and button on the site (round-3 read §12 criterion 9, S043, D328).
   Before this, the ring was written per component: the exit band and every control carry their own
   `focus-visible:outline-*`, but the nav's four links, the 404 page's two in-sentence links and the hero's
   plate captions had no ring at all and fell back to the browser's default — a colour the contrast oracle
   never measured, on a ground the palette record says nothing about. `npm run check:focus` (scripts/check-focus.mjs)
   is the detector: it fails any rule that suppresses an outline, fails this rule's absence, and fails a ring
   with no offset.
   Specificity is deliberate: a Tailwind utility such as `focus-visible:outline-band-text` is (0,2,0) and
   beats this (0,1,1), so the band's ring — `band-text`, because accent on ink measures 2.97 and the oracle
   bans it (DESIGN.md "The focus ring on the band") — still wins wherever it is written. */
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@theme {
  /* ---- 4px grid (round 2; D95). Already Tailwind's default; stated so the gate can assert it.
     Allowed steps: 1,2,3,4,6,8,12,16 (= 4,8,12,16,24,32,48,64px — scale S3, fits 65 of 66 writes).
     The 20px orphan (`mt-5` 1 write + `sm:mt-5` 4 writes) maps to 24 in design-apply, and
     design-enforce then flags any 20px write. ---- */
  --spacing: 0.25rem;

  /* A breakpoint the site actually needs, defined here so the gate that measures widths sees it too.
     `xs` = 380px. It exists for one thing: the nav's subordinate date chip. The row carrying the chip needs
     314px and the 320 floor offers 276 - 38px over - so it cannot paint there @measured 2026-11-15 by
     `node design/nav-fit.mjs --no-build`, while the shipped row without it needs 257 of 276; at 390 the row
     with the chip needs 306 of 346, so the chip CAN paint from there up @measured 2026-11-15 by `npm run check:render:dist`,
     and `sm` (640)
     was hiding it at a width where the measurement says it fits (round-3 read, §12 criterion 5).
     Nothing else in src/ uses `xs:`; adding a second use of this tier is a design decision, not a class. */
  --breakpoint-xs: 380px;

  /* RETIRED (D117, apply 4f): --breakpoint-nav-narrow is gone, and it stays gone. The nav needed a
     narrow type tier only because it carried four labels (mark + Schedule + Chat + Members), and two of
     those pointed at pages the build never emitted. With the dead paths dropped the wide tier needs 171px
     against a 320 container's 276 — and 256 even at 300 — so one tier fits everywhere and the second tier
     bought nothing. If a real page adds a label back, measure first (check:render prints
     needed-of-available per width): "Schedule" is 57.6px at this tier, so the row would need 245 — inside
     276 — and a third path would not fit. ONE more path, not two. */

  /* ---- colour ROLES, named for what they are for (D89). The 2026-11-14 round (D316): the commissioned
     read (docs/design-critique-2026-11-14.md §3) proposed nine hexes and the operator ruled they BECOME
     the palette, mapped onto these role names rather than a parallel system. Every number below is printed
     by `npm run check:contrast` (arithmetic from design/grill/okcolor.mjs, the repo's one OKLab
     implementation, D101) and re-checked on painted bytes by check:render and check:ground. The hex in
     each comment is the byte the token paints, so a reader can compare it with the read's table. ---- */
  --color-paper: oklch(97.35% 0.0139 88.7); /* #faf6ec — the page ground (the read's --paper) */
  --color-panel: oklch(99.09% 0.0123 91.5);  /* #fffcf3 — 1.05 vs paper = a tint, NOT a layer (layer bar is 1.35) */
  --color-tint: oklch(91.92% 0.0285 74.3);   /* #f0e2d0 — hover fill; carries ink (14.53), never the accent (the pair reads 4.89, which is why the ban is grammar, not legibility: D102) */
  --color-ink: oklch(18.92% 0.0149 81.4);    /* #17130c — 17.15 on paper; also the ONE dark band per screen (D89) */
  /* the primary button's hover fill. It used to be `ink-hover`, a lighter chalkboard green solved in the
     renderer (design/grill/contrast/cfg-hover-sweep.json; Firefox 158.0.1, Linux/x64, 2026-11-01). The
     read's --accent-strong is the same job, and D316 rules that the accent family is the only hue allowed
     to appear on a control. The two bars that bind are unchanged; the numbers are not: label `band-text` on
     the fill = 7.83 (bar 4.5) and fill vs resting `ink` = 2.10 (layer bar 1.35) @measured 2026-11-14 by
     `npm run check:contrast`. Round 6's lesson still decides the
     lightness: legibility is not the binding bar here — band-text clears 4.5 across L 42..79 at this hue —
     the layer bar is, because a hover fill sitting 1.29 from the resting fill simply does not read as a
     change. L 42.22 is the read's #7e3320: 2.10 over the resting ink, comfortably above the bar.
     Direction is a rule, not a coincidence: a hover always goes LIGHTER (the secondary hover fill `tint`
     is lighter too); two controls moving in opposite directions is two grammars. */
  --color-accent-strong: oklch(42.22% 0.109 35.35); /* #7e3320 — 7.83 under band-text; 2.10 over ink */
  --color-ink-2: oklch(45.17% 0.0252 85.9);  /* #5c5546 — 6.84; secondary text, chip label, cancelled title (the read's --ink-muted) */
  --color-ink-3: oklch(50.5% 0.03 86);       /* #6c6451 — 5.44 on paper, 5.72 on a panel, 4.61 on a tint; meta, the dated freshness line,
                                             "time not set". The read names only one muted step. Solved so the role clears 4.5 on every
                                             ground it is ever printed on, not just paper: the window ends at L 54.9 on paper but only
                                             L 51.3 on a tint, and a meta line that reads on the page and fails on a hover fill is the
                                             same class of defect the `rule` re-solve closed (D316). */
  --color-rule: oklch(60% 0.04 86.6);        /* #8b7f65 — the read's --rule #dfd6c2 measures 1.34 against paper: under the 3.0
                                             boundary bar AND under the 1.35 layer bar, so it is not a line at all. Same hue family,
                                             solved so one boundary role clears 3.0 on every ground it is ever drawn on: 3.66 paper,
                                             3.10 tint, 3.85 panel, 4.69 ink (D99). That retires round 4's finding that a keylined
                                             control may never sit on a panel (rule on panel was 2.88; it is 3.85 now). */
  --color-accent: oklch(50.57% 0.1321 35.7);   /* #a2432a — 5.77 as text and as keyline; the role `gold` held. D316 renames it,
                                             because a name a future agent can trust is worth the class churn: every `text-gold`
                                             write in src/ moved in this commit. */
  --color-accent-on-ink: oklch(66% 0.10 35.7); /* 5.69 on the ink band; the accent itself is 2.97 there — an invisible ring (D116) */
  --color-band-text: oklch(96% 0.012 88);     /* #f5f1e9 — 16.43 on the ink band; also the primary button label */

  /* ---- Join-path hues: one hue per real path, reserved, never reassigned (round 2). The rules are
     >= 4.5 as text on the ground it is printed on, and >= 40 degrees from every other reserved hue
     (round 3b). The new ink sits at hue 81.4 and the new accent at 35.7, so two paths had to move:
     mobilizon's olive (105) is now 24 degrees from the ink — a tint of the ink, not a channel — and
     discord's orange (35) is the accent's hue exactly. Discord takes its own brand's blue (262), which
     is 134 degrees from the accent and 57 from the calendar. `check:contrast` prints every gap. ---- */
  --color-path-calendar: oklch(51% 0.11 205);  /* #007784 — 4.90 — our own /events.ics */
  --color-path-meetup: oklch(49% 0.15 315);    /* #7f409a — 6.27 */
  --color-path-discord: oklch(52% 0.15 262);   /* #3664be — 5.23 */
  --color-path-mobilizon: oklch(51% 0.11 145); /* #38763c — 5.09 */
  /* chip tracks: 1.13 vs paper = flat on purpose. The hue keyline + the word carry the chip; a
     track is never the only cue (tints alone measure 1.02-1.13, all under the 1.35 layer bar). */
  --color-path-calendar-tint: oklch(93% 0.03 205);
  --color-path-meetup-tint: oklch(93% 0.03 315);
  --color-path-discord-tint: oklch(93% 0.03 262);
  --color-path-mobilizon-tint: oklch(93% 0.03 145);
  /* the same four hues on the ink band: the paper set measures ~2.1 there, so the band needs its own
     lightness. One lightness for all four (L 64), each clearing 4.5 with margin (D99). */
  --color-path-calendar-on-ink: oklch(64% 0.11 205); /* 5.78 */
  --color-path-meetup-on-ink: oklch(64% 0.15 315);   /* 5.15 */
  --color-path-discord-on-ink: oklch(64% 0.15 262);  /* 5.41 */
  --color-path-mobilizon-on-ink: oklch(64% 0.11 145); /* 5.77 */

  /* ---- Keylines are inset shadows, never borders: a border adds 2px and silently breaks the
     control-height arithmetic (D98). `rule` is the only boundary on paper and on the band; `accent`
     is the caution variant of a notice (D102) — the system has NO signal hue. ---- */
  --inset-shadow-rule: inset 0 0 0 1px var(--color-rule);
  --inset-shadow-accent: inset 0 0 0 1px var(--color-accent);
  --inset-shadow-path-calendar: inset 0 0 0 1px var(--color-path-calendar);
  --inset-shadow-path-meetup: inset 0 0 0 1px var(--color-path-meetup);
  --inset-shadow-path-discord: inset 0 0 0 1px var(--color-path-discord);
  --inset-shadow-path-mobilizon: inset 0 0 0 1px var(--color-path-mobilizon);

  /* ---- Elevation: hairline = part of the page, shadow = above the page (D105). Stops are
     ink-tinted and solved so the contact edge clears the 1.35 layer bar (.165 ink / .13 black);
     a black stop wide enough to read at a wide blur paints a 2.10 grey band. Cards never get a
     shadow. Nothing floats in src/ yet (no modal, no dropdown), so these two ship defined-but-
     unused until the first menu — the values are solved maths and re-deriving them is the work. ---- */
  --shadow-e1: 0 1px 2px 0 rgba(23, 19, 12, 0.165);
  --shadow-e2: 0 2px 5px -1px rgba(23, 19, 12, 0.22), 0 12px 28px -6px rgba(23, 19, 12, 0.3);

  /* ---- Type ramp: 1.200, nine steps (T3, D95), plus the 11.1px chrome step below the ladder
     (nav narrow tier D100, status chip and notice labels). Leading is carried by the size token
     (58 of 71 existing writes already do). The display line boxes land on the 4px grid and each
     clears its own measured ink box (`design/fonts/display-fit-chrome.json`, chrome face at the weight
     the title writes). The two DERIVED leadings (subhead, heading) follow "next 4px multiple >= size x
     1.2"; the rest are ratified numbers. Do NOT use these to override Tailwind's built-in text-sm/
     text-2xl ramp: apply maps each write across explicitly, and design-enforce forbids the built-ins.

     ROUND 8 (operator ruling 2026-11-02, candidate B): the READING ladder went up 10% and the CHROME
     tier did not move. Why a set and not a number, and why that set: characters per line are measured
     at 29-38 everywhere (`npm run lines:measure`), so the boxes, not the sizes, were the constraint;
     raising only content steps therefore buys legibility without moving anything derived from the
     chrome tier — control height is `label line box + 2 x pad`, so `text-label` staying 13.3/16 keeps
     48/40, the notice's 48px one-line figure, the nav fit (273 of 276 at 320) and the card's bands.
     Candidates C and D both raised the label step, which moves every control to 52/44 — measured, not
     reasoned, in `design/grill/round-8.html` and `design/grill/round8/report.json`. ---- */
  --text-micro: 11.1px;
  --text-micro--line-height: 16px;
  --text-label: 13.3px;
  --text-label--line-height: 16px;
  --text-body: 17.6px;
  --text-body--line-height: 24px;
  --text-lede: 21.1px;
  --text-lede--line-height: 28px;
  --text-subhead: 25.3px;          /* leading derived, not measured */
  --text-subhead--line-height: 32px;
  --text-heading: 30.4px;          /* leading derived, not measured */
  --text-heading--line-height: 40px;
  --text-display-1: 36.4px;
  --text-display-1--line-height: 40px;
  --text-display-2: 43.7px;
  --text-display-2--line-height: 48px;
  --text-display-3: 52.4px;
  --text-display-3--line-height: 56px;
  --text-display-4: 62.9px;
  --text-display-4--line-height: 68px;
  --leading-prose: 1.6;            /* serif body copy; a rule, not a size step */

  /* ---- Measure (round 8, operator ruling): a prose block never runs wider than 70 characters of its
     own size. It is `ch` not px on purpose — a px cap changes meaning when the ramp moves, which is what
     `max-w-2xl` (672px) had been doing silently: at the round-8 lede size 672px is exactly 70ch, but at
     the shipped size it was 77ch. Measured before the cap (`npm run lines:measure`): the widest prose on
     the site was two section-intro ledes in a 1164px box, at 76 and 69 characters — the 1164px box would
     have carried ~121 characters of that copy, so this is a guardrail on the box as much as a fix for the
     one line that sat over the 40-75 reading band. ---- */
  /* v4 reads `max-w-*` from the `--container-*` namespace, so the utility this produces is
     `max-w-measure` (measured with the resolver: a `--max-w-measure` key produces nothing).
     It is `em`, not `ch`, because `ch` is the advance of the "0" glyph, not an average character:
     measured on the built page, PT Serif prose averages 0.455 em per character, so a 70ch cap is
     ~93 real characters — no cap at all. 32em / 0.455 em = ~70 characters of serif prose, which is
     the number the round-8 ruling asked for. Same cap on chrome copy would be ~52 characters
     (Public Sans averages 0.612 em), so this belongs on prose blocks, not on every text block. */
  --container-measure: 32em;

  /* ---- Radius: 6px base (round 2 — fits 3/3 candidate radii; 8px risks the candy reading the
     operator ruled out). One base, two roles, so a future change is one line. No pill role: chips
     are carried by hue keyline + word (D-round2), and a second radius role with no measured need
     is a third thing to enforce. ---- */
  --radius-control: 6px;
  --radius-card: var(--radius-control);

  /* ---- Motion (round 5, D1): 150ms for colour and shadow, 250ms for anything that moves, no
     400ms tier (there is no modal or dropdown to animate). Tailwind v4 has no --duration-*
     namespace — `duration-color` resolves to nothing (measured) — so the two steps are written as
     `duration-150` / `duration-250` and the DEFAULT is what this block can set: 150ms + linear,
     because every transition in src/ animates a colour or a box-shadow. Movement writes
     `ease-out duration-250` explicitly. `prefers-reduced-motion: reduce` is mandatory and lands
     with the markup in design-apply (0 occurrences in src/ today). ---- */
  --default-transition-duration: 150ms;
  --default-transition-timing-function: linear;

  /* ---- RETIRED (D316): `--color-book-gray` and the four dormant social-icon files it existed for are
     gone in this commit. They were the only cool-grey left in the palette and the only remaining writes
     of a Tailwind palette colour (`hover:text-gray-500`), and no file in src/ imports them @measured
     2026-11-14 by `grep -rn "icons/" src/` (no matches). `--color-book-theme` is GONE as of apply batch
     3: its last two references were `::selection` and a global `.underline` class in Layout.astro that
     painted an amber highlighter instead of an underline (D82/D88). The read's `--amber #e9a63f` is not
     adopted for the same reason: it is 0.043 OKLab from Amazon orange #FF9900, inside this repo's own
     0.05 same-colour bar (D88), and it measures 1.95 against paper — a band, not a tint. `check:contrast`
     prints the number so nobody re-introduces it.
     `--font-sans` no longer names a phantom. It used to be "Inter var", a family no file in this repo
     provided — measured consequence: every chrome label on the ratified specimen rendered in this
     rig's system-ui (x-height 0.48). design-apply wired the ratified faces: PT Serif latin 400+700
     (static pair, imported in Layout.astro) and Public Sans Variable latin wght 100-900 (one 26,832 B
     file, @font-face in src/styles/fonts.css because the vendor package has no latin-only entry point).
     `--font-body` is live (PT Serif) and stays under the same name. ---- */
  --font-sans: "Public Sans Variable", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
    "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-body: "PT Serif", ui-serif, Georgia, serif;
}
```

## Appendix B — `src/layouts/Layout.astro`, verbatim

```astro
---
export interface Props {
  title?: string;
  noindex?: boolean;
  /**
   * This page's own path, e.g. `/schedule`. A page that does not name itself in `rel=canonical` is telling
   * every crawler it is a copy of the homepage, which is exactly how a new page fails to get indexed;
   * `chat.astro` and `schedule.astro` now pass theirs. Unset means the apex, which is the homepage.
   */
  path?: string;
}

const { title = seo.title, noindex = false, path = '' } = Astro.props;
const canonical = seo.canonical.replace(/\/$/, '') + path;
const robots = noindex ? 'noindex,nofollow' : 'index,follow';
// The ratified serif pair, latin subset only (design/decisions.json typeFamily: 33,116 B + 29,588 B).
// `import "@fontsource/pt-serif"` pulled every subset — the build was shipping cyrillic woff2 for a
// site whose copy is English.
import "@fontsource/pt-serif/latin-400.css";
import "@fontsource/pt-serif/latin-700.css";
import "../styles/fonts.css";
import "../styles/global.css";
import { seo } from "../config.json";
import Navigation from '../components/Navigation.astro';
---

<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="canonical" href={canonical} />
    <meta name="robots" content={robots} />
    <meta name="googlebot" content={robots} />
    <meta name="description" content={seo.description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:title" content={seo.title} />
    <meta property="og:description" content={seo.description} />
    <meta property="og:type" content="website" />
    <meta property="og:image" content={seo.canonical + seo.image} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content={seo.name} />
    <meta property="og:locale" content={seo.locale} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seo.title} />
    <meta name="twitter:description" content={seo.description} />

    <title>{title}</title>

  </head>
  <body class="bg-paper text-ink">
    <!-- No sprite here. The glyph data behind every sign-up mark (S026, D294) is printed by
         src/components/SignUpLinks.astro in front of the first cluster on the page, so a page that paints no
         mark ships no glyph bytes: inserting the sprite here would cost +2,201 gzip @measured 2026-11-13 by
         `node design/mark-cost.mjs` - 41.3% of /chat's 5,327 gzip bytes - for drawings that page never
         paints. src/components/PlatformMarks.astro holds the arithmetic that decides sprite vs inline, and
         scripts/check-sprite-claim.mjs is the gate that keeps the sprite out of this shell (D297). -->
    <Navigation />
    <slot />
    <style lang="scss" is:global>
      /* `::selection` is the one place this file paints, and the pair is measured: paper on ink =
         17.15 @measured 2026-11-14 by node design/grill/palette-remap.mjs (12.02 before D316 moved the ink
         and the paper). The retired amber pair measured
         2.06, under the 4.5 bar; the amber is delta-OKLab 0.019 from Amazon orange #FF9900 (D82/D88),
         which is why the token went, not just this rule. The amber also used to sit in
         src/config.json as `theme.color`, still declaring a colour nothing read — that key is gone
         too, so the retired hue has one home left in this repo (see the social-share note in
         .notes/NEXT.md). */
      ::selection {
        background: var(--color-ink);
        color: var(--color-paper);
      }

      /* No keyframes ship in src/. The one that used to sit here pulsed the footer's sum glyph at
         0.5s infinite linear alternate-reverse, which has no tier in the motion grammar (150ms colour,
         250ms movement) — guarded decoration is still decoration, so the operator ruled it out with the
         rest of the old footer band (2026-11-02). `ratify-check` now fails on any `@keyframes` in live
         src, and separately fails on an unguarded `animation:` write, so motion can come back only by
         taking a tier AND its reduced-motion guard. */

      /* The 404 page's link writes the `underline` utility. A GLOBAL class of the same name used to
         sit here: an amber highlighter bar with `text-decoration: none`, later in the cascade than the
         utility, so every "underline" on the site painted amber and was NOT underlined. It is why the
         class gate could not see the last amber write on the site — the appearance came from a <style>
         block, not a class. Keep it that way: no global element/class rules in this file. */
    </style>
  </body>
</html>
```
