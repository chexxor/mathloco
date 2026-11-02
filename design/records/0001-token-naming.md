# 0001 — Tokens are named for their job, not their look

**Situation.** The grill settled 20 colours across four rounds, and `src/styles/global.css` carried two
template leftovers (`--color-book-gray`, `--color-book-theme`) plus a phantom `"Inter var"`. The prose
in the rounds called the golds `gold-ink` / `gold-dark` and the path hues `cyan / plum / coral / olive`.
Roughly 106 colour class writes have to land on names in `design-apply`.

**Decision.** Every token names its purpose: `paper panel tint ink ink-2 ink-3 rule gold gold-on-ink
band-text path-<destination> path-<destination>-tint path-<destination>-on-ink`. `gold`, not `gold-ink`;
`path-meetup`, not `plum`. Two roles serve two grounds rather than duplicating per ground: `ink` is text
*and* the dark band's ground, and one `rule` clears 3.0 on paper (3.01) and 4.0 on the band (4.00), so
there is no `rule-dark`.

**What it means.** A rename in `design-apply` maps class writes onto destinations, so a hue can be
retuned without renaming anything; and a token whose name is a colour would go stale the first time the
value moves.

**Worth revisiting if** a second boundary ground appears (a dark card ground would force a `rule-on-ink`
decision) or if join paths multiply past four and the destination names stop being stable.
