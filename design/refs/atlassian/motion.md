# Atlassian — motion

Domain 6 of the fixed 18. Status: **EVIDENCED**. This is the richest motion contract in the five
systems: the package index prints usage rules, a reduced-motion contract, and a performance contract.

Artifacts reached: `https://atlassian.design/llms-components.txt` (Motion, Resizing,
StaggeredEntrance, ExitingPersistence, MotionPresenceBoundary components),
`https://atlassian.design/llms-primitives.txt#Media-Queries`,
`https://atlassian.design/llms-a11y.txt#Manual-Testing-Checklist`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A06-motion-01 | Motion has an **owner**, and the first rule is don't re-implement it. | rule | `https://atlassian.design/llms-components.txt#Motion-component` | "Use motion already owned by an ADS component instead of wrapping or replacing it" | none (prose rule; the lint does not see intent) |
| A06-motion-02 | You may not build an animation out of the scale's parts; you take the finished semantic token. | rule | `https://atlassian.design/llms-components.txt#Motion-component` | "Do not invent a motion token or reconstruct an available semantic token from base duration, easing, and keyframe tokens" | lint (the token-value contract refuses an unlisted duration) |
| A06-motion-03 | The semantic namespace is searched, not guessed: paired entry, exit and **reposition** states exist. | pattern | `https://atlassian.design/llms-components.txt#Motion-component` | "Prefer the complete semantic motion token for the affected role and state; inspect the full motion.<role>.* namespace so paired entry, exit, and reposition states are not missed" | none |
| A06-motion-04 | Composition is allowed only where the semantic set falls short, and only from published parts. | rule | `https://atlassian.design/llms-components.txt#Motion-component` | "Use enteringAnimationXcss and exitingAnimationXcss only when no semantic motion token covers the required treatment, and compose only from published base motion tokens" | lint (values) |
| A06-motion-05 | The motion scale's **shape** is printed as a closed enum: eight durations (instant, xxshort, xshort, short, medium, long, xlong, xxlong) and five easings (in-practical, out-practical, inout-bold, out-bold, spring). | token | `https://atlassian.design/llms-components.txt#Resizing-component` | "Duration of the resize transition as a design token CSS variable." | lint (the prop is typed to that enum) |
| A06-motion-06 | A motion primitive's lifecycle is mounted, and exit is played **before** unmount. | behavior | `https://atlassian.design/llms-components.txt#Motion-component` | "keep Motion mounted and control it with action=\"enter\" or action=\"exit\" instead" | none |
| A06-motion-07 | Size animation is a last resort, chosen against a stated alternative. | rule | `https://atlassian.design/llms-components.txt#Resizing-component` | "Prefer a transform-based or non-animated treatment when it preserves the intended behavior" | none |
| A06-motion-08 | Layout work from animation is a **warning they make the product emit**, not a note in the doc. | rule | `https://atlassian.design/llms-components.txt#Resizing-component` | "Warn the user that width and height animation causes layout work, and suggest a safer treatment when the design permits one" | none |
| A06-motion-09 | The reduced-motion contract is observable, not aspirational: the end state must be reached without the transition. | rule | `https://atlassian.design/llms-components.txt#Resizing-component` | "Under reduced motion the content must reach its final dimensions immediately without waiting for the transition" | none automated (the browser-checklist row below is human-passed) |
| A06-motion-10 | Reduced motion has one owner, and consumer-side patches are refused — the duplicate workaround is the defect. | rule | `https://atlassian.design/llms-components.txt#Resizing-component` | "Reduced-motion behavior is owned by Resizing; do not add a duplicate consumer workaround" | none |
| A06-motion-11 | Decorative sequence is refused by name: stagger is for comprehension. | rule | `https://atlassian.design/llms-components.txt#StaggeredEntrance-component` | "Use staggered entry only when the sequence improves comprehension; do not add it as decoration to large or frequently changing collections" | none |
| A06-motion-12 | Motion is verified in the browser; a token reference is **not** evidence it happened. | rule | `https://atlassian.design/llms-components.txt#Motion-component` | "verify the result in the browser rather than treating an import or token reference as evidence that motion occurred" | none (their own checklist row: "Test with reduced motion preferences") |

**Read against our system:** our motion is two steps — 150ms linear for colour/shadow, 250ms ease-out
for movement — no tier above, no keyframes in live `src/`, and `prefers-reduced-motion: reduce` is
mandatory. Rows 09, 10, 12 are the three things our artifacts state weakly and theirs state sharply:
**what the end state must be** under reduced motion, **that one place owns it**, and **that a token
mention is not proof**. Row 12 is the sentence our own gate model already holds in another register
(a selftest that plants the defect, so "it exists" is never a passing claim) — which is why it is a
`DIVERGENT-KEEP` in §3, not a gap: we already have a stronger version, at a cost theirs pays in a
human checklist. Rows 02/04 are a real GAP: nothing in our artifacts refuses a hand-written duration
or easing literal outside the two steps, and the refusal is stated as a rule theirs can hand to a
type system. Rows 08 and the "Test rapid repeated changes… frame rate on representative low-powered
devices" line answer a domain our artifacts never mention — animation cost — and the one we cannot
adopt as-is, since we have no animation except our two transitions.
