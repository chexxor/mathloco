# 0003 — Spacing: a 4px grid with eight named steps, and 20px is illegal

**Situation.** 67 spacing writes across 10 distinct values. Candidate scales measured against the actual
writes: S3 (4, 8, 12, 16, 24, 32, 48, 64) fits 65 of 66 (98.5%); S2 fits 93.9%; powers-of-two 72.7%; a
1.5× rhythm 40.9%. Component heights are defined as `ceil4(line box) + 2 × a pad from this scale`, so the
scale is load-bearing for the height ladder, not just for margins.

**Decision (operator took S3, round 5 Q2).** `--spacing: 0.25rem` with allowed steps
1, 2, 3, 4, 6, 8, 12, 16. Rows take 12px padding / 8px gaps. The one off-scale write — 20px — maps **up to
24**, decided in ratify on the operator's blanket delegation: rounding up preserves the row's air, and the
alternative (down to 16) would put a section gap closer than its own padding. Counted correction: the
grill's "one orphan" is **five occurrences, four of them live** — `mt-5` ×1 and `sm:mt-5` ×3, plus one
inside a comment, all in `HeroSection.astro` (lines 27/34/41/47/68).

**What it means.** Control heights have no free parameter: a control is 24, 32, 40 or 48 because the
arithmetic says so. `design-enforce` flags any spacing step outside the set, so 20px cannot come back.

**Worth revisiting if** a real layout needs a step between 16 and 24 often enough that the mapping keeps
rounding the wrong way — then add the step to the scale rather than exempting the write.
