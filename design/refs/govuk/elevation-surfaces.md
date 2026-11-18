# GOV.UK — elevation & surfaces

Domain 5 of the fixed 18. Status: **EVIDENCED only as a colour role group and a refusal of shadows.**
There is no elevation scale, no shadow ramp, no z vocabulary in 26 fetched pages. What exists is a
`surface-*` colour role triple (background/text/border) and one sentence that refuses depth
rendering except when it carries meaning. That pair is the finding: GOV.UK answers "what is above
what" with **a role group, not a ladder**.

Probe establishing the absence: `grep -inE 'layer|stack|shadow'` across all body digests → one hit,
quoted as G5-elev-02; `grep -inE 'z-index|overlay|toast|tooltip|popover|modal|dialog'` → one hit, an
incidental parenthetical, quoted in `overlay-surfaces.md`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G5-elev-01 | A surface is three roles bound together — ground, ink, edge — and that is the whole vocabulary for it. | token | `https://design-system.service.gov.uk/styles/colour/#surface` | "surface-border" | none |
| G5-elev-02 | Depth is refused **unless it carries meaning**: shadow is allowed only to show a feature, layering, or depth. | rule | `https://design-system.service.gov.uk/styles/images/#illustration` | "Use flat blocks of colour. Avoid using shadows or gradients, except when needed to show a distinctive feature of an object or to communicate layering or depth." | none |
| G5-elev-03 | A page has a **named ground** (`template-background`, `body-background`) rather than a background literal. | token | `https://design-system.service.gov.uk/styles/colour/#background` | "template-background" | none |
| G5-elev-04 | A banner is a surface you must *place*, not raise: its width must match the content's width. | behavior | `https://design-system.service.gov.uk/components/notification-banner/#placement` | "The notification banner should be the same width as the page's other content, such as components, headings and body text." | none |
| G5-elev-05 | Separation between stacked information is a **rule drawn on the page**, and it carries a navigation purpose. | behavior | `https://design-system.service.gov.uk/components/summary-list/#row-actions` | "When navigating visually, the borders above and below each row help to show which row action is tied to which piece of information." | none |
| G5-elev-06 | **Absence:** no elevation token, no shadow ramp, no stacking-context rule exists anywhere in the fetched corpus. | absence | `https://design-system.service.gov.uk/styles/colour/#functional-colours` | "The GOV.UK Design System has a set of functional colours for essential page elements." | none |

**Read against our system:** this is the domain where the comparison is *between two answers*, and the
weaker system is the one that still has the better-named primitive.

- Ours: `shadow-e1`/`e2` are defined-but-unused, and DESIGN.md says why — *"No modal or dropdown is
  in src/ today"*. Theirs: no shadow role at all, but a **`surface-*` triple that has no shadow to
  lean on**. Their primitive is the one we need and do not have named: the moment something floats,
  it needs its own ground, its own ink, and its own edge — three names, decided together, none of
  them a hue.
- Row 02 is a refusal worth mirroring in our register: gradient-as-depth is a decoration that survives
  a screenshot; ours already refuses gradients for the same reason (a decorative depth claim is
  indistinguishable from a real layer).
- Rows 04 and 05 are the transferable mechanism: **stacking by rules** (a keyline above and below a
  row, a banner as wide as the text it interrupts) is what makes content separable without depth.
  Our tables and summary lists can carry that rule today; they cannot carry a shadow, and nothing in
  our `@theme` gives them a third way. That is a real GAP row candidate, with a detector that counts
  keylines per repeated row.
