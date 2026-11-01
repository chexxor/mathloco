# 0004 — Type scale: 1.200, nine steps, leading carried by the size token

**Situation.** Seven distinct sizes and thirteen distinct leading values in 43/71 writes, four of them
written once or twice; four responsive ramps in `HeroSection` invert (smaller at `lg` than at `sm`). Three
candidate ramps: T1 six steps (top 2.99× body), T2 eight, T3 nine (top 3.58× body).

**Decision (operator took T3 with a condition: "as long as you agree the geometry matches the tone").**
Ratio 1.200: 11.1, 13.3, 16, 19.2, 23, 27.7, 33.2, 39.8, 47.8, 57.3px. Leading is carried by the size
token, and the display line boxes are pinned to the 4px grid: 36 / 44 / 52 / 60. The operator's condition
was tested rather than waved through: measured ink of PT Serif 700 at those sizes is 32.7 / 39.8 / 49.0 /
58.2px, so the grid leading clears by 3.3 / 4.2 / 3.0 / 1.8px, while Tailwind's own pairs collide at 47.8
(−1.2px) and 57.3 (−2.0px).

**Delegate calls made in ratify (operator: "accept whatever you decide").** The two leadings the grill
never measured — `text-subhead` 23px → 28px, `text-heading` 27.7px → 36px — follow the stated rule "next
4px multiple ≥ size × 1.2" and are marked *derived* in the token file and DESIGN.md. `--text-*` role names
are new keys; Tailwind's built-in `text-sm … text-9xl` ramp is deliberately **not** overridden, because
that would restyle every existing page from a tokens-only branch. The top step gets a narrow-viewport cap
before `design-apply` uses it.

**Worth revisiting if** the derived leadings read wrong against a real page (then measure them in the
renderer and promote them to ratified), or if a tenth step above 57.3px is ever wanted — the club's own
words ("Mathematical" 367.6px, "Cryptography" 365.1px) do not fit 343px of content width at 57.3.
