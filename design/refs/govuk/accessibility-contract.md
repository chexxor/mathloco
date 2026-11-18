# GOV.UK — accessibility contract

Domain 16 of the fixed 18. Status: **EVIDENCED with criterion numbers, and the strongest
anti-claim in the corpus.** GOV.UK states WCAG 2.2 success-criterion numbers where most of the five
systems only say "make it accessible" — and then states, in its own words, that using the system does
**not** make a service accessible. Both halves belong in the gap analysis: the numbers as thresholds
our bars should cite, and the admission as evidence that an accessibility *contract* is not an
accessibility *detector*.

Pages reached: `…/accessibility/`, `…/get-started/focus-states/`, `…/styles/colour/`,
`…/components/table/`, `…/components/notification-banner/`, `…/components/error-message/`,
`…/styles/layout/`, `…/components/language-navigation/`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G16-a11y-01 | **The system disclaims its own guarantee**, in writing, on its accessibility page. | rule | `https://design-system.service.gov.uk/accessibility/#accessibility` | "Using the GOV.UK Design System in a service does not immediately make that service accessible." | none |
| G16-a11y-02 | Text contrast is a named criterion, not an opinion. | rule | `https://design-system.service.gov.uk/styles/colour/#colour-contrast` | "You must make sure that the contrast ratio of text and interactive elements in your service meets Web Content Accessibility Guidelines (WCAG 2.2) success criterion 1.4.3 Contrast (minimum) level AA." | none |
| G16-a11y-03 | Non-text contrast is a named criterion, and it is scoped to **any background in use**. | rule | `https://design-system.service.gov.uk/get-started/focus-states/#understanding-focus-state-styles` | "Focus states in the GOV.UK Design System use a combination of yellow and black, along with a thick bottom border … success criterion 1.4.11 Non-text contrast, level AA on any background colour used on GOV.UK." | none |
| G16-a11y-04 | Interactive elements are inside the contrast requirement, not outside it. | rule | `https://design-system.service.gov.uk/styles/colour/#colour-contrast` | "the contrast ratio of text and interactive elements" | none |
| G16-a11y-05 | Image information must survive the reader who cannot see the image. | rule | `https://design-system.service.gov.uk/styles/images/#images` | "Make sure any information contained in an image can be understood by someone who cannot see it." | none |
| G16-a11y-06 | Structural markup is an assistive-technology affordance, named per element. | rule | `https://design-system.service.gov.uk/components/table/#table-headers` | "Use the scope attribute to help users of assistive technology distinguish between row and column headers." | none |
| G16-a11y-07 | A notice must be *navigable to*, so the affordance is a landmark plus a name. | rule | `https://design-system.service.gov.uk/components/notification-banner/#placement` | "so that screen reader users can navigate to the notification banner." | none |
| G16-a11y-08 | Error text is announced at load, by a hidden prefix plus a title change, and the prefix is a component feature. | behavior | `https://design-system.service.gov.uk/components/error-message/#hidden-error-prefix` | "To help screen reader users, the error message component includes a hidden 'Error:' before the error message." | none |
| G16-a11y-09 | Hiding content and keeping it available to screen readers is a **utility class**, with a focusable variant. | pattern | `https://design-system.service.gov.uk/styles/layout/#hide-elements-and-keep-them-accessible-to-screen-readers` | "You can stop elements from being displayed on the page and keep their contents available to screen readers using govuk-visually-hidden." | none |
| G16-a11y-10 | A change-log row is accessibility evidence with a defect name: a screen reader that did not read the summary. | behavior | `https://design-system.service.gov.uk/components/error-summary/#recent-changes` | "This resolved an issue in the JAWS screen reader where it would not read the entire Error summary." | test (a named screen-reader failure they fixed, and no harness to re-run) |
| G16-a11y-11 | A multilingual interface must not lose entered data — an accessibility-adjacent state rule stated in the component. | behavior | `https://design-system.service.gov.uk/components/language-navigation/#how-it-works` | "Make sure the user does not lose any data they've entered when they navigate to another language." | none |
| G16-a11y-12 | **Absence:** no touch-target size, no minimum hit area, no zoom/reflow requirement, no reduced-motion rule, and no keyboard-only requirement appear anywhere in the fetched set. | absence | `https://design-system.service.gov.uk/accessibility/#accessibility` | "Our work to make the GOV.UK Design System meet public sector accessibility regulations is a continuous and iterative process." | none |

**Read against our system.** Our bars are numbers with a *rationale attached to each pair against a
named ground* (DESIGN.md:66-67: "**4.5** text (3.0 for text at/below the `display-2` step), **3.0** for
a boundary or graphic, **1.35** for 'this is a separate layer', **24px** minimum target, **44px** for
every pressable block at phone widths"), and we have a detector for one of them: `check:focus` exists
with a 14-case selftest (`gate-run.mjs --list`: "the focus gate can still fail (6 plantings — an
authored `outline:none`, `outline:0`, outline-style:none, a stylesheet with no global ring, a ring
covering links but not buttons, a 1px ring, a ring with no offset, a hex ring, a token under the 3.0
bar…"). Rows 02 and 03 are therefore the **criterion citations our bars should carry and do not**: we
assert 4.5 and 3.0 as numbers, and they name which WCAG clause each one answers to.

Ranked consequences for §2:

- Our `check:focus` fails a ring under the 3.0 bar — but only a *ring*. Nothing in our set fails a
  non-text pair (a keyline, a chip edge, an icon) that is not 3.0. Row 04 is the gap: the criterion
  covers interactive elements as a class, our detector covers one member.
- Row 12 is where our system is **ahead** (24px/44px targets are ours, and their corpus states no
  number), so no target-size row may be imported from here.
- Row 01 is the row that makes our whole enforcement model defensible: their accessibility contract is
  a sentence, ours is 71 steps, and a corpus that concedes the gap is a corpus that cannot be flattered.
