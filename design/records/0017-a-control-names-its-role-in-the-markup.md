# 0017 — A control names its role in the markup; height stops being a variant

**Date: 2026-11-03** (operator ruled the finding written in `design/records/0016-*`). Describes the code as it
was that day; the control inventory below was measured at this commit, not remembered.

**The ruling.** The 44px tap bar wins over the 40px secondary. **Primary and secondary are the same height —
48px — and differ by fill.** `s40` stays in the derived set as a **box** height (a notice's own height, a row's
padding) and is retired as a button step.

**Why the pair could exist at all.** `check:render` asserted control heights by testing a **substring of the class
attribute**: line 184 demanded an `inset-shadow-rule` control be 40px, line 187 demanded an `inset-shadow-rule`
control be ≥44px at 390. Nothing satisfies both. It survived because the substring was unreliable in the
direction that hides failures — `design/grill/render-measure.js` records `cls` truncated to 120 characters, so
`inset-shadow-rule` frequently falls off the end of the recorded value and **neither rule fires**.

**The inventory, measured at 390 across all three routes** (one probe pass reporting the whole class string):

| | count | heights |
|---|---|---|
| controls the pair actually applied to | **7** (`/` 5, `/chat` 1, `/404` 1) | all 48px, all passing |
| controls it was blind to | **3** | all **40px**, all on the join path: `View Schedule` (/), `Join the chat` (/), `Recent Discord summaries` (/404) |

So the strict-looking gate had never once enforced its own tap bar on the controls that needed it, and the one
control it did see (in a component written that morning) failed twice in opposite directions. `Join the chat`
was already 48 — meaning the *same* secondary existed at both heights on the same page, which is the thing
DESIGN.md forbids for a component family.

**The second half of the ruling: the match key changes.** A pressable block declares **`data-control="primary"`**
or **`data-control="secondary"`** in the markup. The probe reports the declared name, and the gate asserts height
per **role** (48 ±1) and fails any control-shaped element (`bg-ink` or `inset-shadow-rule` paint) that declares
**no** role. Class strings are still printed, still truncated for the print; they are no longer a rule's input.

This is not a new idea in this repo, it is the same rule twice over:

- **D116** — a specimen and the built page must report the same thing, or a green number means nothing.
- **Record 0009 / 0015** — "a consumer of a measurement fetches it; it does not remember it… match on a name the
  source publishes, never on a styling class: a class is whatever the layout happens to be called this week."
  Record 0015 caught the truncation breaking a *matcher* (`lg:col-span-4` fell off the end); this is the
  truncation breaking a *gate*, which is worse, because a gate's silence looks like a pass.

**What moved.** Hero `View Schedule` and the 404 page's `Recent Discord summaries` went `py-3` → `py-4`
(+8px); the island's `Try again` / `Read Discord` went from a hard-coded `h-10` to derived padding at 48 (that
also removes a hard-coded height, which DESIGN.md forbids: "heights are derived, not chosen"); every pressable
block on the three routes declares its role. The join card's secondary was already 48 and did not move.

**The gate can still fail (D118).** `design/render-gate-selftest.mjs` gains two cases: a primary whose padding is
cut to 32px must go red on the role rule, and a control whose `data-control` attribute is stripped must go red on
the missing-role rule. A role table that nobody can violate is a comment, not a gate.

**Left open on purpose, not fixed here:**
- The two island buttons sit **inside a notice with their own keyline**, which DESIGN.md's one-boundary rule
  says a notice's action must not have (`quiet` label, no keyline). They are now 48 and correctly labelled, and
  still wrong about the boundary. That is a notice-grammar ruling, not a height one.
- The `/chat` island's controls are **not measured at all** — the render probe posted 4 clickable elements for
  `/chat` and neither island button was among them. A rule cannot protect what the harness never renders.
- A `quiet` control (32px) or a chip (24px) declares no role and stays outside this rule. If one ever becomes a
  phone tap target, that is its own ruling.
