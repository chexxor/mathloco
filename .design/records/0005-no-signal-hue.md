# 0005 — The system is forbidden a signal hue

**Situation.** Every error/empty state in the shipped site is made of a coloured fill plus a coloured word
(`red-600` on `red-50` = **4.36**, under AA; the fill is 1.09 against white, under the 1.35 layer bar). The
obvious fix — pick a proper error red — was measured before being picked.

**Decision (round 7 Q1, operator took A).** No new hue. Severity is a variant of a notice's **keyline and
word**, using the existing `gold` (4.82). The scan (`.design/grill/round7-math.txt`) tests every 5° of hue
against four bars: ≥4.5 as text on paper, in gamut, ≥40° from every hue in use (ink 152, gold 62, paths
205/315/35/105), and ≥0.05 delta-OKLab from every commerce brand colour catalogued in D88. The naive
choices fail: hue 25 is 10° from our coral join-path hue and 0.070 from Target red; a warning amber (70)
is out of gamut and 8° from our gold; Tailwind `red-600` is out of gamut, 0.030 from the generic web error
red. The only legal warm signal is `oklch(52% .15 355)` — legal, and declined.

**What it means.** A failure colour here would collide with a join-path colour, i.e. the colour of "this
broke" would compete with the colour of "click this". It also constrains status: no strikethrough, no red
for `Cancelled`. `ratify-check.mjs` keeps the retired shipped pairs in the table so the temptation stays
assertable after the markup is gone.

**Worth revisiting if** the site ever carries a real destructive action (delete, refund) rather than a
failure state — that is the case a 355 hue was solved for, and the arithmetic already exists.
