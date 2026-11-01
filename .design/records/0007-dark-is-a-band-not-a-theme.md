# 0007 — There is no dark mode; there is one dark band per screen

**Situation.** Rounds 3/4 asked for a dark theme. Four candidate dark grounds were measured as text grounds
(A chalkboard `oklch(32% .045 152)` 11.92 / B warm sumi 14.01 / C UMN maroon 10.22 / D petrol 10.55). The
operator first liked several, then objected that a dark specimen "makes a 'dark' theme", and chose **A**
from the light specimen.

**Decision.** There are no dark-theme tokens. `ink` is used as **ink**, not as a surface: the site is light,
and the dark is a **composition rule — at most one dark band per screen**, whose ground is `ink`, whose text
is `band-text` (10.19), whose boundary is the same `rule` (4.00 there, no `rule-dark`), and whose path hues
take the `-on-ink` lightness (the paper set measures ~2.3 there). That band is where the quote cards and
interview cards (D83) live, and cards inside it are flat with the same hairline.

**What it means for a token file.** No `prefers-color-scheme` block, no duplicated role set, and the same
role names on both grounds — which is why `rule` and `gold` each have exactly one dark counterpart
(`-on-ink`) rather than a whole inverted palette. A visitor-facing dark mode would be a second set of
20 tokens plus a contrast run, not a media query.

**Worth revisiting if** the operator asks for a real dark theme (then: solve every pair in the renderer,
do not invert), or if a venue photograph arrives and reads against the chalkboard green — B warm sumi stays
recorded as the fallback ink for that case (D89).
