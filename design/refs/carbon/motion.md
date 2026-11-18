# Carbon — motion

Domain 6 of the fixed 18. Status: **EVIDENCED** — richest domain in this system, and the one where
they come closest to a check.

Pages reached: `…/foundations/motion/overview`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| C6-mot-01 | Two registers of motion, and the second is rationed: expressive is for occasional, important moments. | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#style` | "Reserve expressive motion for occasional, important moments, to better capture the user's attention and offer a rhythmic break to the productive experience." | none — prose only |
| C6-mot-02 | Productive motion is for task moments and must stay out of the way. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#productive-motion` | "Productive motion creates a sense of efficiency and responsiveness, while remaining subtle and out of the way." | none |
| C6-mot-03 | Easing is stated as CSS: standard productive `cubic-bezier(0.2, 0, 0.38, 0.9)`; expressive `cubic-bezier(0.4, 0.14, 0.3, 1)`. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#standard-easing` | "Use standard-easing when an element is visible from the beginning to the end of a motion." | none — the curves ship in the motion package |
| C6-mot-04 | Exit easing exists only for permanent departure; something that stays nearby uses standard easing instead. | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#exit-easing` | "Use exit-easing when removing elements from view, such as closing a modal or toaster." | none |
| C6-mot-05 | The exception, stated: "An exception to exits: if an element leaves the view but stays nearby, ready to reappear upon user action, use standard easing instead." | pattern | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#exit-easing` | "An exception to exits: if an element leaves the view but stays nearby, ready to reappear upon user action, use standard easing instead." | none |
| C6-mot-06 | Decorative easing is refused outright. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#easing` | "Avoid easing curves that are unnatural, distracting, or purely decorative." | none |
| C6-mot-07 | Duration is a function of distance, not a constant: the bigger the change, the longer the animation. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#duration` | "Motion's duration should be dynamic based on the size of the animation; the larger the change in distance (traveled) or size (scaling) of the element, the longer the animation takes." | none — "dynamic duration is an upcoming built-in feature"; today six static tokens stand in |
| C6-mot-08 | Six static duration tokens: fast 70ms / 110ms, moderate 150ms / 240ms, slow 400ms / 700ms, each with a named use. | token | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#duration-tokens` | "duration-moderate-01 — Micro-interactions, small expansion, short distance movements — 150ms" | none |
| C6-mot-09 | Their own checklist demands micro-interactions sit in a **90–120ms** band and use ease-out on user input. | behavior | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#evaluation-checklist` | "Do micro-interactions fall within a static duration ranging from 90–120 ms?" | none — it is a human-passed checklist, not a check |
| C6-mot-10 | Motion must be re-checkable at every screen size, and may be missed on mobile. | behavior | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#evaluation-checklist` | "Is the motion effective across all screen sizes? Keep in mind that on mobile screens, subtle motions may be easily missed." | none |
| C6-mot-11 | Always provide an alternative for state transitions, and always keep a static way to carry the same message. | rule | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#adaptive-interface-motion-design` | "Always provide alternatives for interface state transitions." | none |
| C6-mot-12 | The motion of the page as a whole is explicitly **not** theirs: "the motion design of the overarching UI … is up to each product team to implement." | absence | `https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview#carbon-in-motion` | "the motion design of the overarching UI — that is, how the components interact with each other and enter and exit the page itself — is up to each product team to implement" | none — they name the gap in themselves |

**Read against our system:** we hold two steps (150ms linear for colour/shadow, 250ms ease-out for
movement) and refuse anything above them. Their C6-mot-08 puts 150ms at *micro-interactions* and
240ms at *toast/expansion*, which is within one step of our pair — but C6-mot-09 asks the question our
model never asks: **is the duration right for the distance**, which their dynamic-duration feature
automates and we have no notion of. C6-mot-11 is the sentence our `prefers-reduced-motion: reduce`
rule already implements, one level harder (they never name the media query — recorded in
`PRIOR.md` as unlocatable, not asserted).
