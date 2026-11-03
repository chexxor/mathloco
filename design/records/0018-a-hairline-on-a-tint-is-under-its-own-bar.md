# 0018 — A hairline on a tint is under its own bar; and the gate only recognises one kind of hairline

**Date: 2026-11-03.** Found while building the "What we take up" section (`src/components/WhyJoinUs.astro`),
which wanted row separators between nine list items. Measured at this commit, on the built artifact — not
remembered, and not from the token table.

**What I wrote, and what the gate said.** The obvious rows-and-lists treatment from `DESIGN.md` ("rows and
lists sit on 12px padding, 8px gaps") is a 1px top border per row:

```
<li class="border-t border-rule py-3 ...">
```

`npm run check:render` failed it repeatedly — once per row, at each of the three measured widths — with a
message that contains two separate claims:

```
FAIL  / @1240: painted keyline 1px (contrast 2.88 on its ground) is a border/outline,
      not the 1px inset ring — border-t border-rule py-3 text-body leading-prose text-ink-2
```

**Claim one: the token is fine and the ground is not.** `--color-rule` is
`oklch(65.5% 0.03 152)`, and `src/styles/global.css` says it is "solved to the 3.0 bar, not by eye: 3.01 on
paper". The threads section sits on `bg-panel` — `oklch(97% 0.008 85)` — and the same token painted on that
ground measures **2.88**, under the 3.0 graphic bar (D101). So the sentence in the token table is true about
paper and silently false about panel, and nothing in the repo said which grounds `rule` is solved for. The
share-card composer already knew the band case in the other direction: `--color-rule` on ink is 4.00
(`scripts/check-social-card.mjs`, paths band). Three grounds, three numbers, one token:

| ground | `rule` contrast | bar | verdict |
|---|---|---|---|
| `paper` `oklch(98.5% 0.006 85)` | 3.01 | 3.0 | the value it was solved for |
| `panel` `oklch(97% 0.008 85)` | **2.88** | 3.0 | **under** |
| ink band | 4.00 | 3.0 | over |

`panel` is 1.04 against paper, which `global.css` calls out as "a tint, NOT a layer (layer bar is 1.10)" — and
that is exactly the trap: a tint is allowed to be barely-there against paper, and a graphic token solved
against paper inherits that barely-there-ness when it is painted *on* the tint.

**Claim two: there is one hairline grammar, and `border-*` is not in it.** The gate's message is not only about
contrast. It rejects a painted 1px line that arrives as a `border`/`outline` at all, because the ratified hairline
in this system is the **inset ring** (`--inset-shadow-rule`, `inset 0 0 0 1px var(--color-rule)`), which draws
inside the box instead of adding to the layout box. A `border-t` moves content by 1px and a ring does not, so
two hairlines in one system disagree about where the edge of a box is. `check:render`'s `keylines` probe reads
computed `box-shadow` (see the `shdw` lines in its output) and treats anything else as a foreign hairline. That
is the same rule D116/D119 enforce for strokes: **a line has to arrive as the thing the system says it is, and
it has to arrive measurable.**

**What the section does instead, and why it is not a compromise.** No separators. Rows sit on the ratified 12px
padding (`py-3`, so 24px between rows) and the grouping is carried by weight: each thread is a
`font-semibold text-ink` label followed by an `text-ink-2` gloss, and the label/gloss contrast does what the
rule was going to do. Measured after the change (`npm run check:area`, `design/area/report.json`):

| | before (six cards) | after (threads) |
|---|---|---|
| painted, @1240 | 4.16% | **4.47%** |
| empty-run %, @1240 | 37.3% | **25.1%** |
| painted, @390 | 8.01% | **9.64%** |
| empty-run %, @390 | 34.4% | **21.8%** |
| reader-named colour (chroma ≥ .08), @1240 | 0.019% | 0.014% |

Emptiness is down ~12 points at both widths because there is more actual content per screen. The one column
that got **worse** is reader-named colour (chroma ≥ .08): 0.019% → 0.014% at 1240. Read that one carefully —
`strongPct` is a **share of page area**, and the page grew from 3,140px to 4,196px tall at 1240, so a share can
fall while the number of coloured pixels stands still. `design/area/report.json` stores shares, not counts, so
whether this round removed named colour or just stretched the denominator is an open measurement, not a finding
(`design/color-survey.mjs` has the counts; re-run it if the next round wants to claim either way). What is not
in doubt is that the section's old white cards and their `text-ink-2` checkmarks are gone: the cards were
surface, not colour, and no icon in the old grid was saturated at all — `src/components/icons/Checkmark.astro`
painted `text-ink-2`, chroma 0.035. So the colour this page needs has to come from photographs, the drawn mark,
and the path hues (`--color-path-*`), not from glyph icons standing in for content.

**Open, for the operator, with numbers attached.** Either `--color-rule` goes dark enough to clear 3.0 on panel
— the exact step is not measured here, and it is not a free change: any darkening moves every inset ring on
paper off the 3.01 it was solved to, and `check:render` asserts that keyline contrast per ground ("the ratified
rule (measured 3.01 on paper, 4.00 on the band)") — or `DESIGN.md` states the ground `rule` is solved for and
bans hairlines on tints. Recommendation: the second — one token solving to one ground is what kept the palette
honest, and a hairline on a tint is doing separation work that weight and space can do for free. This record
does not change the token; `npm run check:render` already fails anything that leans on it.
