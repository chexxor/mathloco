# Material — motion (domain 6)

Domain 6 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for patterns, durations and easing —
NOT evidenced for a reduced-motion preference**, which is the finding. Two pages:
`m2.material.io/design/motion/the-motion-system.html`, `m2.material.io/design/motion/speed.html`. Their own Developer-documentation
table lists **Web as Unavailable** for the motion system, so this is the one system whose motion
contract was written for a native runtime and never carried to the web.

Probe establishing the absence of any reduced-motion guidance (this session, all 22 digests):
`python3 .design/tmp-refs/nq.py 'material-*' 'reduced motion|prefers-|dyslex|motion sickness|disable (the )?animation|without animation'` →
**0 lines**. The looser probe `'reduced|prefers-|media query|dyslex|motion sickness'` returns **5 lines**, and
all five are about opacity, elevation, or prominence — the word appears, the contract does not. Nothing here
may be read as endorsement of our guard; it is recorded as their silence (and §2's motion rows come from
systems that carry mechanisms, never from here).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M6-mot-01 | Motion is a **closed set of four named patterns**, and the set is a vocabulary, not a style. | pattern | `https://m2.material.io/design/motion/the-motion-system.html#transition-patterns` | "Material Design's motion system is comprised of four patterns for transitioning between components or full-screen views." | none |
| M6-mot-02 | Pattern selection is a **decision procedure on a property of the transition**, not a taste call. | rule | `https://m2.material.io/design/motion/the-motion-system.html#selecting-a-pattern` | "If there's a container that's a persistent element in the transition, choose the container transform pattern." | none |
| M6-mot-03 | The second branch reads a relationship, spatial or navigational. | rule | `https://m2.material.io/design/motion/the-motion-system.html#selecting-a-pattern` | "If a spatial or navigational relationship exists between elements, choose the shared axis pattern." | none |
| M6-mot-04 | The third branch is the negative case: no relationship means the weaker pattern. | rule | `https://m2.material.io/design/motion/the-motion-system.html#selecting-a-pattern` | "When a relationship between elements is insignificant or does not exist, the fade through pattern is better suited." | none |
| M6-mot-05 | Fade through is specified as a **sequence**, which is the part a web implementation can actually implement. | behavior | `https://m2.material.io/design/motion/the-motion-system.html#fade-through` | "With a fade through, outgoing elements completely fade out before incoming elements fade in." | none |
| M6-mot-06 | Duration is keyed to the **kind of motion**, and closing is shorter than opening. | rule | `https://m2.material.io/design/motion/speed.html#exits-and-closing` | "Transitions that close, dismiss, or collapse an element use shorter durations." | none |
| M6-mot-07 | The asymmetry is published as a number pair for one component. | token | `https://m2.material.io/design/motion/speed.html#exits-and-closing` | "A navigation drawer opens over 250ms but closes over 200ms." | none |
| M6-mot-08 | Duration is also keyed to travel area, and the reason is the reader's next task. | rule | `https://m2.material.io/design/motion/speed.html#transition-area` | "Transitions that cover small areas of the screen have shorter durations than those that traverse larger areas." | none |
| M6-mot-09 | The published duration ladder is four rungs: 100, 250, 300, and the same pair inverted for collapse. | token | `https://m2.material.io/design/motion/speed.html#transition-area` | "A switch animation has a duration of 100ms ... Expanding: 300ms ... Collapsing: 250ms" | none — the rungs sit in figure captions, not in a scale |
| M6-mot-10 | Easing is named, and the web form is published as a curve for three of the four kinds. | token | `https://m2.material.io/design/motion/speed.html#standard-easing` | "Elements that begin and end at rest use standard easing. ... cubic-bezier(0.4, 0.0, 0.2, 1);" | none — the curve is printed in a platform table; nothing resolves it |
| M6-mot-11 | Direction of motion decides easing, in both directions, as prose. | behavior | `https://m2.material.io/design/motion/speed.html#decelerated-easing` | "Incoming elements are animated using decelerated easing, in which transitions begin at peak velocity (the fastest point in an element's movement) and end at rest." | none |
| M6-mot-12 | **There is no reduced-motion contract in this system.** The nearest statement is a usability bound on speed, not a preference response. | absence | `https://m2.material.io/design/motion/speed.html#duration` | "Avoid transitions that are too fast for users to follow UI changes or transitions that are overly slow and prevent a user from advancing." | none — and no page in the 83-URL index is about a motion preference; their Web status for the motion system is itself Unavailable |

**Read against our system.** Ours is **two steps and one guard** (DESIGN.md's motion table: `duration-150`
linear for colour and shadow, `duration-250` ease-out for anything that moves, written explicitly because
Tailwind v4 has no `--duration-*` namespace) with the refusals *"**Never** use `duration-300` or a 400ms
tier"* and *"**No keyframe animation ships in `src/` at all*"*, and *"**Always** guard animation with
`prefers-reduced-motion: reduce` — and a guard inside a comment does not count."*

- **They are behind us on the access half and ahead of us on the vocabulary half.** They have four named
  patterns and a selection procedure; we have a duration/easing pair and no pattern vocabulary at all.
  Their selection procedure (rows 02–04) is the transferable grain: it decides *which* transition a
  change gets from a property of the change, and that is a rule a gate could test on the one moving thing
  we ship.
- **Their durations are a ladder of four rungs; ours is a pair, by ruling.** Their 300ms rung is the number
  our system refuses outright (DESIGN.md's own "never `duration-300`"), so the ladder is not a gap — it is
  §3 material.
- **Row 12 is the strongest evidence in this corpus for keeping our guard.** Nothing in 22 pages, out of
  an 83-URL index, mentions a motion preference — and their motion system is not implemented on the web at
  all. Ours states the guard, makes it mandatory, and fails an ungarded `animation:` write. Where §2 ranks
  a motion row, its sources are Atlassian and Carbon (which carry mechanisms), never this one.
