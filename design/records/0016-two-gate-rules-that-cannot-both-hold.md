# 0016 — Two gate rules that cannot both hold, and a truncated class string that hides which controls they apply to

**Date: 2026-11-03** (content-placeholder round). Describes the gates as they were that day. Every number and
every FAIL line below is from a run at this commit, not from reading the code: `npm run verify:browser`, and one
direct probe (`node design/grill/dist-measure.mjs dist/client / design/grill/render-measure.js 390 844 …`).

**Situation.** `src/components/UpcomingMeetups.astro` (invented events, pre-design CSS, a missing image) and
`PastEvents.astro` (an `<h2>` and a comment) were replaced by `src/components/Schedule.astro`, whose empty states
follow the round-7 grammar the operator chose: status word, title, two-line body, **a 48px primary and a 40px
secondary**, dated line. The new component shipped that grammar literally. The browser gate went red.

**Run 1 — the 40px secondary:**

```
FAIL  / @390: tap target "Ask in the chat" is 40px tall, under 44
```

**Run 2 — the same control at 48px:**

```
FAIL  / @1240: secondary control "Ask in the chat" is 48px tall, not 40
FAIL  / @390:  secondary control "Ask in the chat" is 48px tall, not 40
FAIL  / @320:  secondary control "Ask in the chat" is 48px tall, not 40
```

**What is actually wrong — the gate contradicts itself for this one control family.**
`design/render-gate.mjs`:

- line 184: `if (/inset-shadow-rule/.test(cls))` → the control must be **39–41px** ("a secondary 40px", per the
  header comment and DESIGN.md's derivation `ceil4(line box) + 2 × S3 pad` = 16 + 2×12 = **40**).
- line 187: `if (w === 390 && /bg-ink|inset-shadow-rule|menu/i.test(cls) && h < 44)` → the same control must be
  **≥44px**.

No height satisfies both. DESIGN.md already knows which side matters — it calls `s48` "the only step that clears
the 44px AAA bar; it belongs to the join path" — but it also sanctions a 40px secondary, and the hero's secondary
("View Schedule") is one.

**Why nobody saw this before: the probe truncates the class string, and the gate rules read the truncated value.**
`design/grill/render-measure.js` records `cls: (el.getAttribute('class') || '').slice(0, 120)`. Measured output for
the two controls at 390 (probed at the run-2 state, with the 48px secondary still in place):

```
"View Schedule"   h=40  cls="w-full flex items-center justify-center px-8 py-3 text-label font-semibold rounded-control text-ink bg-paper inset-shado"
"Ask in the chat" h=48  cls="inline-flex items-center justify-center h-12 px-8 rounded-control inset-shadow-rule bg-paper text-ink text-label font-me"
```

The hero's class ends mid-token — `inset-shado` — so **neither rule sees it**, and a shipped 40px phone tap target
passes the gate that exists to catch 40px phone tap targets. My control put `inset-shadow-rule` 20 characters
earlier, inside the window, so it became the first control in the repo this rule pair has ever both applied to,
and it failed no matter what height it had. Record 0015 already caught this same truncation breaking a *matcher*;
this is the truncation breaking a *gate*.

**What this round did (the legal path, not a weakened gate).** The block keeps exactly one control: the 48px
primary in the hero's own grammar (`px-8 py-4`, no hard-coded `h-12` — heights are derived). The second path out of
the empty state is an **inline link**, which DESIGN.md already prices ("a link inside a sentence keeps its 24px
line"), and the per-row Meetup action in the dates-exist state is an inline link too. No gate was edited to make
this component pass.

**Open for the operator (do not settle it in a component):** — **RULED 2026-11-03**, see
`design/records/0017-*`: the 44px bar wins, primary and secondary are both 48px and differ by fill, `s40` is
retired for buttons, and the height rules stop reading a class substring in favour of `data-control`.

1. Which is authoritative — the 44px tap bar or the 40px secondary? If the bar wins, the secondary step becomes 48px
   and the hero's "View Schedule" must move with it (one component family, one height). If 40px stays, line 187 must
   name what it actually means (nav/`bg-ink`/menu controls) instead of matching `inset-shadow-rule`.
2. The truncation. Send the whole class (or a `clsFull`) and let the gate test the whole string. Doing this will
   turn the browser gate **red on `/` today**, because the hero's 40px secondary becomes visible — which is why it
   is listed here rather than fixed inside a content round.

**The rule.**

- **A gate may not hold two expectations about the same attribute.** A rule pair with no satisfying value is not a
  strict gate, it is a coin flip about which failure you see, and the first person to hit it will assume their
  component is wrong.
- **A probe that truncates what a rule matches is a gate that is not looking.** Any slice applied to a measured
  value must be checked against the rules that consume it, not just the print. Prefer: full value for the rules,
  truncation for the log.
- **When a gate goes red twice in opposite directions, stop editing the component and read the gate.** Two runs,
  two contradictory messages, is the tell (same shape as 0015's "removing colour raised colour").
