# GOV.UK — motion

Domain 6 of the fixed 18. Status: **NO EVIDENCE — the domain is not covered by this system, and the
non-coverage is the finding.** Nothing in the 26 fetched pages says anything about motion, timing,
easing, transitions, or reduced-motion preference. This is not a refusal; it is a design system that
publishes no motion guidance to consumers at all, which makes it the weakest of the five on this
domain and the one whose silence must not be read as endorsement of ours.

Probe that establishes the absence (run this session across every fetched body digest):
`grep -inE 'motion|animation|transition|easing|keyframe|reduced' govuk-*.txt` → **zero guidance
sentences**. The pattern family matches only unrelated prose (a sentence about photography, the word
"transitional" in a service description), none of which states a motion rule.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G6-motion-01 | **No motion rule of any kind exists here.** The site's own Styles section enumerates what it documents — layout, typography, colour, images — and motion is not in that list. | absence | `https://design-system.service.gov.uk/#styles` | "Make government services look like GOV.UK with guides for applying layout, typography, colour and images." | none |
| G6-motion-02 | The system's own accessibility page states that a service built from it needs *additional* testing work — the one sentence in this corpus that admits an entire domain is unverified by the system itself. | rule | `https://design-system.service.gov.uk/accessibility/#accessibility` | "Using the GOV.UK Design System in a service does not immediately make that service accessible." | none |
| G6-motion-03 | Interaction feedback they do specify is a **server-side and content** affordance, not a visual transition: tell the user what is happening. | behavior | `https://design-system.service.gov.uk/components/button/#preventing-double-clicks` | "In the case of slow connections, aim to give the user information about what's happening, for example, by showing a loading spinner or a modal, before using data-prevent-double-click." | none |

**Read against our system — the only honest reading of a NO EVIDENCE domain:**

1. **Nothing here may be cited as a motion recommendation, a duration, or a refusal.** A corpus row
   that says "GOV.UK says nothing about motion, therefore we are fine" is a claim without an artifact;
   row 01 is evidence about *their coverage*, not about our design.
2. What this domain contributes is the opposite of flattery: our motion contract is two steps
   (150ms linear for paint, 250ms ease-out for movement) with a mandatory
   `prefers-reduced-motion: reduce` path and a selftest behind it. Ours is the artifact; theirs is a
   sentence in an accessibility page saying the system does not make a service accessible. Where the
   gap analysis ranks a motion row, the sources that carry a **mechanism** are Material and Atlassian,
   not this one.
3. Row 03 is the transferable grain, and it survives the absence: their rule is about **telling the user
   what is happening during a slow operation** — an affordance we can carry without any motion at all
   (a spinner is content, not animation). That is a candidate for `loading-empty-error`, and it is the
   reason this row is in the motion file rather than invented there.
