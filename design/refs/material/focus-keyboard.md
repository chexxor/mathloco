# Material — focus & keyboard (domain 8)

Domain 8 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for the focus *state*, NOT evidenced
for a focus *ring*** — which is the finding, and it is the sharpest in this corpus. `m2.material.io/design/interaction/states.html`
owns the focus state; **nothing in any of the 22 digests names an outline, a ring, or a `:focus-visible`
mechanism**. The word "outline" appears in the digests only for icon outlines, container outlines in a
dark theme, and cards "outlined with a stroke" at 0dp elevation — never as a keyboard affordance.

Probe that establishes the absence (this session, all 22 digests):
`python3 .design/tmp-refs/nq.py 'material-*' 'focus ring|:focus|outline-|keyboard order|tab order|tabindex'` →
no focus-ring or keyboard-order mechanism; the only keyboard-adjacent sentence is
"Focus states appear in a read order specific to the composition." on `states.html`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M8-focus-01 | Focus is defined by **input method**, and voice is included with keyboard. | behavior | `https://m2.material.io/design/interaction/states.html#focus` | "A focused state communicates when a user has highlighted an element using a keyboard or voice." | none |
| M8-focus-02 | It applies to everything interactive, not to a chosen subset. | rule | `https://m2.material.io/design/interaction/states.html#focus` | "Focus states apply to all interactive components." | none |
| M8-focus-03 | The signal is the same overlay mechanism as every other state. | pattern | `https://m2.material.io/design/interaction/states.html#focus` | "An overlay signifies a focus state." | none |
| M8-focus-04 | Focus is the **highest-emphasis** state, and the reason is stated: nothing else signals it. Uniqueness is a composition-wide invariant, not a per-component one. | rule | `https://m2.material.io/design/interaction/states.html#focus` | "They should receive high emphasis, as they are not indicated by other visual cues. ... Only one focus state may exist at a time on a screen." | none |
| M8-focus-06 | **Keyboard order is asserted to exist and never specified.** A read order is claimed to be composition-specific; no rule makes it so. | behavior | `https://m2.material.io/design/interaction/states.html#focus` | "Focus states appear in a read order specific to the composition." | none — the sentence is the whole of their keyboard-order contract |
| M8-focus-07 | Entry and exit of the state are animated, so focus does not flicker. | behavior | `https://m2.material.io/design/interaction/states.html#focus` | "Focus states appear and disappear using a fade animation." | none |
| M8-focus-08 | Three component families are **exempt** from inheriting focus, and they are named as wholes. | rule | `https://m2.material.io/design/interaction/states.html#focus-state-inheritance` | "Components that can't inherit a focus state include: (1) whole sheets, (2) whole app bars or (3) whole dialogs." | none |
| M8-focus-09 | A state must be distinguishable from its neighbours and from the surrounding layout, and emphasis is a priority ranking. | rule | `https://m2.material.io/design/interaction/states.html#distinct` | "States must have clear affordances distinguishing them from one other and the surrounding UI, emphasized according to their priority levels." | none |
| M8-focus-10 | Two states at once means **two indicators**, not a merged one. | rule | `https://m2.material.io/design/interaction/states.html#additive` | "When multiple states occur at once, such as selection and hover, both state indicators should be displayed." | none |
| M8-focus-11 | A focus state must be applied consistently across components, or usability drops. | rule | `https://m2.material.io/design/interaction/states.html#consistent` | "States should be applied consistently across components in order to increase usability." | none |
| M8-focus-12 | **Absence: there is no focus indicator that is not a state layer.** This system's keyboard affordance is a translucent covering on the element, and the covering may only be one at a time. | absence | `https://m2.material.io/design/interaction/states.html#overlay` | "Only one state layer is applied at a time." | none — and no page in the 83-URL index names an outline, a ring, or an offset; the nearest published web status for the motion needed to animate the fade is Unavailable |
| M8-focus-13 | A help affordance is offered on hover, tap, or click — **not** on keyboard focus, which is the gap their own sentence exposes. | behavior | `https://material.io/design/communication/help-feedback.html#help-tooltips` | "Help icons provide helper text on hover, tap, or click." | none |

**Read against our system — this is the file where we are furthest ahead.** Ours is a *ring*, and it is
ruled and gated: DESIGN.md's *"Focus rings take one role per ground: `outline-accent` on paper (5.77) and
`outline-band-text` on the dark band (16.43), always with `outline-2 outline-offset-2`"*, with the failure
mode recorded — *"`accent` on the band is 2.97 = an invisible keyboard ring"* — and `check:focus` failing an
authored `outline:none`, a 1px ring, a ring with no offset, or a stylesheet with no global ring (14-case
selftest, S043/D328).

- Their model cannot express our rule: a state layer is exclusive (row 04), so a focus layer and a hover
  layer cannot both be on — and their own additive rule (row 10) says a focus + selection pair **must**
  both show. Those two sentences are the same system arguing with itself about whether a keyboard signal
  survives another state, which is exactly what our system settled by making the ring a different device
  from the fill.
- Row 06 is the pre-loading row for our keyboard grammar: they assert an order exists and specify nothing,
  so there is nothing to compare against. Ours specifies the order structurally (the DOM order the nav is
  emitted in) and gates the ring.
- Row 13 is the only keyboard-relevant refusal in the corpus that our system does *not* already hold, and
  it is a draft: we ship no help tooltip, so it is §2's pre-loading block, not a ratification.
