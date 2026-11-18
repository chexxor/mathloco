# GOV.UK — overlay surfaces

Domain 14 of the fixed 18. Status: **PARTIAL, and the partiality is the point.** There is no modal,
dialog, popover, tooltip, toast or dropdown guidance in the fetched corpus. The word "modal" appears
exactly once, in a sentence about preventing double-clicks. What exists instead is one mechanism —
the **Interruption panel**, a panel that pauses a journey and contains the button the user must press —
plus a placement rule for a page-level notice. GOV.UK answers "how do I put something on top of
something" with "you mostly shouldn't; when you must, it is a named page".

Probe: `grep -inE 'z-index|overlay|toast|tooltip|popover|modal|dialog'` across the 26 body digests →
**one** hit, the sentence quoted as G14-overlay-03.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G14-overlay-01 | An interruption is a **page type with internal rules**: all important information lives inside one panel, so it cannot be missed. | rule | `https://design-system.service.gov.uk/patterns/interruption-pages/#how-it-works` | "All important information on the page is shown within an Interruption panel, to help ensure the user does not miss it." | none |
| G14-overlay-02 | The panel **owns a control**: it contains the button the user must interact with to continue. | pattern | `https://design-system.service.gov.uk/patterns/interruption-pages/#how-it-works` | "The panel includes a button that the user must interact with to continue their journey." | none |
| G14-overlay-03 | The panel's contents are bounded: short, and no other components or form elements inside. | rule | `https://design-system.service.gov.uk/patterns/interruption-pages/#how-it-works` | "Keep information within the panel short. Do not place any other components or form elements inside the panel." | none |
| G14-overlay-04 | Interruptions are scarce and *get worse* with repetition — the same failure mode as notices, stated separately. | rule | `https://design-system.service.gov.uk/patterns/interruption-pages/#when-to-use-it` | "Interruption pages pause the user journey to show important information. Use Interruption pages sparingly, as they get less effective the more often users see them." | none |
| G14-overlay-05 | The panel is an explicit alternative to a confirmation page, for outcomes that are neither success nor rejection. | pattern | `https://design-system.service.gov.uk/patterns/interruption-pages/#when-to-use-it` | "instead of Confirmation pages to show more varied journey outcomes (that are different to a straightforward success, rejection or completion)" | none |
| G14-overlay-06 | The one mention of a modal in the corpus is an **instruction about waiting**, not about building one. | behavior | `https://design-system.service.gov.uk/components/button/#preventing-double-clicks` | "In the case of slow connections, aim to give the user information about what's happening, for example, by showing a loading spinner or a modal, before using data-prevent-double-click." | none |
| G14-overlay-07 | A page-level notice is a **surface with a width contract**, and the contract is with the reading column. | pattern | `https://design-system.service.gov.uk/components/notification-banner/#placement` | "The notification banner should be the same width as the page's other content, such as components, headings and body text." | none |
| G14-overlay-08 | A panel that floats is a **contribution with provenance**: the pattern names the system it came from. | pattern | `https://design-system.service.gov.uk/patterns/interruption-pages/#history` | "This pattern was originally contributed by the NHS Design System." | none |
| G14-overlay-09 | **Absence:** no elevation vocabulary, no stacking context, no shadow-on-overlay rule, no z scale, no dismissal affordance anywhere in the corpus. | absence | `https://design-system.service.gov.uk/components/notification-banner/#placement` | "The notification banner should be the same width as the page's other content, such as components, headings and body text." | none |
| G14-overlay-10 | Where an overlay is used *instead of* an error, the substitution is named: a banner is not an error, a summary is. | rule | `https://design-system.service.gov.uk/components/notification-banner/#relationship-to-error-summary` | "use an Error message component and Error summary component instead" | none |

**Read against our system — measured this session.** Ours has the vocabulary theirs lacks, and ours is
the one that has been *measured*: DESIGN.md:1413 says `shadow-e1`/`shadow-e2` are "defined-but-unused
until the first floating surface exists", and DESIGN.md:238 says which of the two works — "Level 1 does
not make a surface read as a layer; level 2 does." — because level 1 measures 1.25 against the 1.35
layer bar (@measured 2026-11-08 by round 17's edge probe, DESIGN.md:239). So on "something above the
page" our system owns a **failed** primitive and theirs owns **no primitive** but a colour-role triple
(`surface-background`, `surface-text`, `surface-border`) that needs no shadow at all. That pair is the
§1 candidate this corpus produces: the contradiction is inside our house, and the alternative that
would resolve it is a triple of role names, not a ramp — which keeps D102 and `check:contrast` intact.

Three usable conclusions:

- **Rows 01–03 are stealable exactly, and they are the only overlay *internal* rules in this corpus**:
  a floating surface states all of its important content, owns exactly one action, and holds nothing
  else. That triple is checkable when we ship a menu: one root, one pressable inside it, a length cap
  inside it. Detector cost: grep-class against a fixture, because the fixture is the artifact.
- **Row 04 is a severity claim we can carry without their numbers**: repetition reduces effectiveness,
  so a per-visit counter is the right object, and a per-render cap is the enforceable one.
- **Row 06 is evidence that a modal is not required for feedback about slowness** — which is what our
  own contract already does: loading is one 24px `role="status"` line with no motion and no spinner
  (DESIGN.md:400-401). Their sentence allows a spinner; ours forbids one. That is a `CONTESTED` pair
  for §1, and ours wins on the layer bar (their spinner would be a fill pretending to be content).
