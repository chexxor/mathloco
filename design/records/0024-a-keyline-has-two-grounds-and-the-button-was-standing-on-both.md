# 0024 — a keyline has TWO grounds, and the join button was standing on both of them

Record 0018 measured that `--color-rule` is not one number: **3.01 on `paper`, 4.00 on the `ink` band, 2.88 on
`panel`, 2.74 on `tint`** (token space, `okcolor.contrastTriple` over the `@theme` values as shipped). The operator
ruled on it as `3c` of the art/rhythm round (D149-3c, 2026-11-03): **a keyline may not straddle two grounds, and the
fix is the placement, not the number.** 0018 left the enforcement as a NOTE because nothing yet measured the second
side of a ring. This record is the measurement, the placement fixes, and the two findings that came with them.

## the measurement gap, in one line

The system's hairline is a 1px **inset box-shadow** (`--inset-shadow-rule`), not a border, so `render-measure.js`'s
`keylines` probe reported **0 keylines on the home page at every width** while the page shipped seven of them. A ring
is drawn ON A BOUNDARY, so it has two neighbours — the fill inside it and the ground it stands on — and a probe that
reads one of them cannot see the ruling at all.

## what the instruments do now

- `design/grill/render-measure.js` gains a `rings` probe: every element whose computed `box-shadow` carries an inset
  layer gets its colour parsed, its thickness taken, and its contrast measured **inside** (its own fill, or whatever
  shows through an unfilled box) and **outside** (its parent's ground). `isRule` names whether the ring carries
  `--color-rule`, because that is the token with the known ground dependence.
- `design/render-gate.mjs` rule **4a**: `|inside − outside| > 0.05` ⇒ *straddle* FAIL (D149-3c); otherwise
  `min(inside, outside) < BARS.graphic (3.0)` ⇒ *under bar on its own ground* FAIL.
- `design/pixel-ground.mjs` (byte space, where a `background-image` could move the pixels and not the stylesheet)
  already measured both neighbours; its `weakSides` category is now split into `weakSides` and `straddles`, and a
  straddling hairline whose weaker side is under the bar **fails** instead of being noted. The interim from
  D149-3c ("keeps naming the two-ground sides as notes and does not fail them") was explicitly *while unbuilt*; the
  placement is built, so the interim is over.
- The report now carries `pairs`: **every** painted hairline with both of its grounds named. `hairlineMax 4.99` is
  not an argument; "4.99 on `panel` / 4.99 on `panel` at y=2307 x=132 len=51" is.
- `design/render-gate-selftest.mjs` gains two plantings — a ring whose inside is a `panel` fill (2.88 / 3.01) and a
  ring on a tint fill (2.88 / 2.88) — so the new checks are proven to fail, not just to pass. Fourteen plantings, all
  caught.

## before and after, in the page's own bytes

`npm run check:ground`, home route, 1240 / 390 / 320. The `before` column is the report as it stands on `staging`
(`git show staging:design/ground/report.json`, siteFp `77d8dc87df`); the `after` column is this branch's build, siteFp
`5bc95d7ba7`. @measured 2026-11-03 by check:ground

| | before | after |
|---|---|---|
| painted `rule` hairlines | 8 runs detected (one of them, it turned out, is small print — see the instrument notes) | **7** |
| min / median / max | 3.01 / 3.01 / 4.99 | **3.01 / 3.01 / 3.01** |
| `weakSides` | **2** per width — "3.01 on paper / 2.88 against panel" at y=3677 x=829 len=136 and y=3724 | **0** |
| `straddles` | (not a category) | **0** |

The two were one button's top and bottom edge: the secondary "Join the chat", `bg-paper inset-shadow-rule`, standing
inside the `bg-panel` join card. `paper` fill on the inside of its own ring, `panel` behind it. The byte number (2.88)
landed exactly on the token-space prediction (2.88), which is the cross-instrument check this pair exists to provide.

After: **every** painted keyline is 3.01 against `paper` on both sides — at 1240 the seven sit at y=524 (len 52),
y=678 and y=725 (len 151), y=2712 and y=2992 (len 506), y=3888 and y=3935 (len 136). No ring in the page has a tint
on either side any more.

## what moved in the components

- **`JoinCommunity.astro`** — the two paths out now stand on the page's own ground, outside the tinted card. This is
  D141/D142's "one boundary" ruling applied to a button keyline, and it has a product consequence: a plate in PS-3
  can no longer displace the join path. The PS-3 column went from 532×128 (CTA) to **532×56** (one paragraph) at 1240
  inside a 326px row; at 390, **310×85**. @measured 2026-11-03 by check:space
- **`DiscordSummary.svelte`** — the channel cards carried **both** a `panel` fill and a `rule` ring: 2.88 inside, 3.01
  outside. The fill is the half that went. No browser gate can see this one: the cards only exist once the Discord
  fetch succeeds, so the gate's dist page never renders them. That is why the CSS-side check (rule 4a) exists beside
  the byte-side one.
- **`WhyJoinUs.astro`** — the empty-thread-list notice sits in a `bg-panel` section, so a `rule` edge there reads 2.88
  and no placement inside that section fixes it (see "falls out" below). It is now `inset-shadow-gold` with `text-gold`
  — the caution variant, measured **4.61 on `panel`**, and the state really is a caution: an empty thread list is a
  fact about the page's wiring, not about the club.

## the finding nobody asked for: the placeholder was the worst case

`PhotoSlot.astro`'s review state was `bg-tint inset-shadow-rule` — a `rule` ring with a **tint** on its inside. The
ring rule was written before that was checked, and it failed on real shipped code rather than on a planted mutation:

```
FAIL / @1240: ring (--color-rule) measures 2.74 inside / 3.01 outside against two different grounds
              ([224,245,229] vs [252,250,246]) — PS-1, on paper
FAIL / @1240: ring (--color-rule) measures 2.74 inside / 2.88 outside against two different grounds
              ([224,245,229] vs [248,245,239]) — PS-3, inside the join card
```

eight checks (2 × 4 widths) — @measured 2026-11-03 by check:render:dist on a review build

Reproduce: drop an overlay into the gitignored `src/content.local/` directory (the tracked
`src/content.local.example.json` shows the shape) containing `{"photos": {"placeholders": true}}`, `npm run build`,
`npm run check:render:dist`, then delete the overlay and rebuild. **A review build is the only way any browser gate
sees this state**: `check:content` fails a shipped build whose HTML contains `data-placeholder`, so on the real dist
the state does not exist to measure.

Fix: the fill goes (a tint is 1.04–1.10 against its neighbours, so it was never doing the separation the ring does)
and the edge becomes `inset-shadow-gold`, which gives the ring **one** ground on both sides: **4.82 / 4.82** at PS-1
(paper) and **4.61 / 4.61** at PS-3 (panel). @measured 2026-11-03 by check:render:dist, review build

Gold is this system's caution grammar, so the claim being made is "this page is missing content" — defensible for a
state that cannot reach a visitor. If the operator calls that colour-as-decoration instead, the alternative is *no
ring at all* (tint fill only), which loses the measured box the placeholder exists to show. Ruling asked in `NEXT.md`.

## and what falls out of the ruling, structurally

A `rule`-ringed box inside a `bg-panel` region is illegal at **any** placement: `rule` on `panel` is 2.88, under the
graphic bar, whether the box paints its own fill or borrows the card's. So inside a tinted region there are exactly
three legal moves — a fill with no ring, a gold ring on one ground, or no ring — and "move the button" is not one of
them. That is why the join actions left the card and the `WhyJoinUs` notice went gold: same ruling, two different
fixes, because one region could be left and the other could not.

## the second finding, which A2 owns

Filling PS-1 in a review build does not just add a plate: the hero mark shares that column and is the flexible one.
Its box falls from **372×232.5** (scale 1.55) to **148.9×93.1** (scale 0.621), and its 1.3 viewBox-unit strokes land
at **0.81px** (and one at 0.62px) — under the 1px floor D119, i.e. the mark stops being legible at exactly the width
where the layout has the most room. Eight mark failures, all at 1240 only. A2 must decide which of the two is the
hero's fixed size before a plate goes in. @measured 2026-11-03 by check:render:dist, review build

## instrument notes, so the next round does not re-learn them

- **A "1px run between two grounds" is not necessarily a keyline.** The old detector counted 8 runs at every width
  and one of them was never a ring: at 1240, y=2307 x=132 len=51 has a flat core of `93,110,97` — the bytes of
  `--color-ink-3` — i.e. a line of small print, with paper-ish ground two rows above and below (the paper→panel step
  is 4 levels, inside the detector's 12-level neighbour tolerance). It measured 4.99/4.99, so it never caused a wrong
  verdict here, but a new FAIL rule that can fire on text is a gate nobody will trust. The run is now accepted as a
  keyline only when its core is within 14 levels of the `--color-rule` bytes, and a rejected run is **counted and
  named** in the report (`runs`, `notKeyline`) rather than dropped. `GROUND_VERBOSE=1` prints each rejected run.
  That is also why `max` moved from 4.99 to 3.01: the old `max` was measuring typography.
- **A component comment is part of the page fingerprint.** An HTML comment inside an `.astro` template ships to the
  client, so rewriting the PS-3 comment moved `SITE_FP` from `95e176bd84` to `5bc95d7ba7` and invalidated every
  tracked report keyed to it (they carry `siteFp`, and the whitespace/rhythm caches key to it). Re-run
  `check:ground` and `check:area` after the last edit to a component comment, or the tracked artifact cites a page
  that no longer exists.
- `check:space` collects slot candidates by computed grid/flex parent and **drops anything under 60px** — which is
  how PS-3 (56px tall after the actions left) vanished from the output while a component comment was citing it. Named
  slots (`data-slot`) now pass the floor, print with `*`, and ride along whatever their area rank.
- `check:ground` had one attempt per cell. Three of its first six runs in this round died on the harness's known
  "firefox starts and never posts" flake (twice at 390, once at 320), while the same cell passed standalone on the
  next invocation. It now takes two attempts like `check:render`, and prints the attempt count so a pass-on-retry is
  still visible. Proven to fire: `node design/pixel-ground.mjs --routes /nope --widths 1240`.
- A measurement claim that no re-runnable command produces was written into `JoinCommunity.astro` mid-round and
  deleted when it could not be reproduced (the painted-share numbers for PS-3 came from a scratch probe, not from
  `check:area`). The replacement cites `check:space`, which prints them.
