# Material — i18n & RTL (domain 17)

Domain 17 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for a mirroring contract with named
exceptions; NOT evidenced for a web mechanism.** Two pages carry it — `m2.material.io/design/usability/bidirectionality.html`
(the owner; digest 8,698 B) and `m2.material.io/design/typography/language-support.html` (the twin host, 7,816 B) — and
neither names a mechanism: the probe `python3 .design/tmp-refs/nq.py 'material-*' 'dir=|logical propert|:lang|inline-size|writing-mode'`
returns **0 lines** across all 22 digests, so the implementation is platform-owned in their words and absent
in their text. `bidirectionality.html`'s own status table calls Web **Available**, which is the system saying
it can be done without ever saying how.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M17-rtl-01 | RTL is a **language property**, and the contract is a whole-UI mirror, not a text alignment. | rule | `https://m2.material.io/design/usability/bidirectionality.html#bidirectionality` | "UIs for languages that are read from right-to-left (RTL), such as Arabic and Hebrew, should be mirrored to ensure content is easy to understand." | none |
| M17-rtl-02 | Mirroring is defined, and it is defined as a **set of three surfaces**, which is the grain a gate can read. | pattern | `https://m2.material.io/design/usability/bidirectionality.html#mirroring-layout` | "When a UI is changed from LTR to RTL (or vice-versa), it's often called mirroring. ... RTL content also affects the direction in which some icons and images are displayed, particularly those depicting a sequence of events." | none |
| M17-rtl-03 | The mirror changes four named things, and the list is enumerable. | rule | `https://m2.material.io/design/usability/bidirectionality.html#mirroring-layout` | "Text fields icons are displayed on the opposite side of a field ... Navigation buttons are displayed in reverse order ... Icons that communicate direction, like arrows, are mirrored" | none — the bullets are prose; nothing re-derives them |
| M17-rtl-04 | Text alignment follows the writing direction, and that is the alignment's own rule. | rule | `https://m2.material.io/design/usability/bidirectionality.html#mirroring-layout` | "Text (if it is translated to an RTL language) is aligned to the right" | none |
| M17-rtl-05 | Controls mirror **to the reading direction**, not to the screen edge. | rule | `https://m2.material.io/design/usability/bidirectionality.html#mirroring-elements` | "Primary and secondary buttons are mirrored to match reading direction" | none |
| M17-rtl-06 | A progress bar's fill is a reading-direction fact, not an animation fact. | rule | `https://m2.material.io/design/usability/bidirectionality.html#mirroring-elements` | "Progress bars fill in the same direction as content is read" | none |
| M17-rtl-07 | Time is mirrored **linearly and not circularly**, and the sentence names the split. | rule | `https://m2.material.io/design/usability/bidirectionality.html#the-passage-of-time` | "While the linear representation of time is mirrored in RTL, the circular direction of time is not. ... Anything depicting the passage of time should be mirrored." | none |
| M17-rtl-08 | The clock is the named exception, and the mechanism named is the direction of the arrow. | rule | `https://m2.material.io/design/usability/bidirectionality.html#when-not-to-mirror` | "A clock icon or a circular refresh or progress indicator with an arrow pointing clockwise should not be mirrored. ... Clocks still turn clockwise for RTL languages." | none |
| M17-rtl-09 | Media controls refuse the mirror because they name a **physical object**, not a direction of time. | rule | `https://m2.material.io/design/usability/bidirectionality.html#the-passage-of-time` | "Do not mirror media playback buttons and the media progress indicator as they refer to the direction of tape being played, not the direction of time." | none |
| M17-rtl-10 | Two refusals rest on **local convention and anatomy**, not on the UI: RTL countries do not mirror slashes, and RTL writers are mostly right-handed. | rule | `https://m2.material.io/design/usability/bidirectionality.html#when-not-to-mirror` | "Most RTL countries do not mirror slashes. ... The majority of users in RTL-writing countries are also right-handed, so such icons should not be mirrored." | none |
| M17-rtl-11 | Script height is a contract on the **container**, not on the type: the UI must provide the vertical space a script needs. | rule | `https://material.io/design/typography/language-support.html#height` | "Many writing systems require more vertical space than English, so your UI should provide sufficient vertical space for these different systems." | none |
| M17-rtl-12 | **Absence:** the mirroring contract names no web mechanism anywhere in the corpus; the only instruction written for the web in these pages is about line-height arithmetic, so their platform-status table is the whole of their web claim. | absence | `https://m2.material.io/design/typography/understanding-typography.html#measurement-from-the-baseline` | "For the web, automate the calculation using Sass or CSS." | none — and the platform table above it answers Web **Available**, so the claim is a status without a mechanism |

**Read against our system.** Ours is a single-language product: `src/layouts/Layout.astro:37` carries
`<html lang="en-US">`, and the census run for this file (this session, @measured 2026-11-18, un-piped so the
exit code is the grep's) — `grep -rnE 'dir=|rtl|:lang\(|writing-mode|Arabic|Hebrew|internationali' src` →
**no matches, exit 1**. So this whole domain is **SILENT** in our artifacts, and it is silent because the
product is English-only, not because the rule was forgotten.

- Rows 01–06 are the half of this domain that is **worth keeping as a rule statement even now**: a
  direction-flip is a named set of changes (field icons swap sides, buttons reverse order, directional icons
  mirror, text aligns right). If a second language ever ships, our artifact already contains the parts that
  would have to move — `Navigation.astro`'s one-row nav, the chip's `inset-shadow-*` keylines, the exit band's
  path words — and a mirror rule would name them before a translation did it ad hoc.
- Rows 07–10 are the **refusal half**, and it is the more valuable half in our register voice: a mirror that
  flips a clock, a media control, or a slash is a lie about a physical object. Our system states refusals the
  same way (DESIGN.md's *"**Never** let one component family render at three heights"*, AGENTS.md's
  *"Deferrals name their target"*), and our one directional glyph — the arrow on an outbound anchor
  (`src/lib/links.mjs`) — is exactly the class their rows 07–09 refuse to flip.
- Row 11 is the closest thing in this domain to a rule our artifacts already enforce in another form: our
  type tokens carry their own leading (`--text-body--line-height: 24px`), and DESIGN.md's rule is that
  leading is carried by the size token, not by a container. Theirs is the opposite assignment — the container
  grows to fit the script. That is a **divergence worth recording, not a gap**: ours is a number per role,
  theirs is a bound per script, and the two are only comparable once a second script exists.
- Row 12 is where they are **behind us**: they have a status table that says the web can do RTL and no page
  that says how, whereas our artifacts state a mechanism (`lang=` on the root element, in the file that also
  carries `og:title` and `twitter:title`) even though only one language is in use. Nothing here may be
  proposed as a change; see §2's pre-loading block for the draft.
- Two claims from `language-support.html` belong to the **type** domain and are deliberately not rows here,
  so this file cannot be read as the corpus's opinion on fonts: "Noto is the default typeface for all
  languages not covered by Roboto." and "The family has 93 scripts defined in Unicode version 6.0."
  (`https://material.io/design/typography/language-support.html#noto-guidance`). Ungrounded as to what
  ships today, and our system has a ruled face pair (PT Serif 400/700 and Public Sans Variable) — a
  substitution question belongs to a type round, not to an i18n round.
