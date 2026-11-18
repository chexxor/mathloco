# Carbon — PRIOR.md (quarantine)

Anything we know about Carbon **without a locator on a page fetched this session** goes here.
Everything in this file is marked `UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS`: it may be a hint about
where to look, and it may not be quoted, counted, ranked, or cited in `GAP-ANALYSIS.md`.

| Item | Why it is here |
|---|---|
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — that Carbon's components support `prefers-reduced-motion`, or that they name a reduced-motion variant | The motion page says "Always provide alternatives for interface state transitions" and nothing about a media query. The media query itself was not found in any of the 28 pages fetched. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — Carbon's minimum touch-target size | No target size appears in the fetched pages; the domain file records the absence, and this line only marks that the *rule* may exist on an Accessibility tab that was not fetched. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the corner radius of button, modal, tile, or card | Only the popover's 2px is stated in a fetched page. The rest live in Specifications tabs deliberately not fetched (see COVERAGE reasons). |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — Carbon's exact color token names and their hex values | The palette tables in the fetched digest came through as name-and-hex pairs; we quote the *rule* about them, never a hue, and no hue from here may be proposed for our palette (the corpus has no colour authority over us). |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the `disclosures` and `read-only-states` pattern pages | Both are named as the owner of a rule by pages that were fetched; the owner pages themselves were not. The rules we carry cite the fetched page that states them. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — Carbon's grid breakpoint table (the px margin per breakpoint) | The breakpoint table exists on the 2x-grid page but rendered as a list of numbers we did not transcribe; the *rule* (margins are fixed within a breakpoint) is what is carried. |

**Rule for anyone extending this file:** if you promote a line from here into a domain file, it must
acquire a fetched locator and a ≤40-word verbatim quote in the same commit, or it stays.
